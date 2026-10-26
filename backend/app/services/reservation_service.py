import secrets
import html
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models.reservation import TableReservation, DiningTable, TableZone
from app.models.restaurant import Restaurant

class ReservationService:
    @staticmethod
    def generate_booking_code() -> str:
        return f"BK-{secrets.randbelow(8999) + 1000}"

    @staticmethod
    def get_turnover_duration(guests_count: int) -> int:
        """
        Operational Turnover Times (Minutes):
        1-2 persons: 90 mins (1.5 hours)
        3-5 persons: 120 mins (2.0 hours)
        6+ persons:  180 mins (3.0 hours)
        """
        if guests_count <= 2:
            return 90
        elif guests_count <= 5:
            return 120
        else:
            return 180

    @classmethod
    async def get_available_slots(
        cls,
        db: AsyncSession,
        restaurant_id: int,
        date_str: str,
        guests_count: int,
        zone_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Проверяет расписание всех столов заведения на выбранную дату
        и возвращает список свободных слотов с шагом 30 минут,
        учитывая оборачиваемость (Turnover Time), вместимость и Pacing.
        """
        # 1. Находим подходящие по вместимости столы (с сортировкой от меньшего к большему)
        table_query = select(DiningTable).where(
            DiningTable.restaurant_id == restaurant_id,
            DiningTable.is_active == True,
            DiningTable.min_capacity <= guests_count,
            DiningTable.max_capacity >= guests_count
        ).order_by(DiningTable.max_capacity.asc(), DiningTable.id.asc())

        if zone_id:
            table_query = table_query.where(DiningTable.zone_id == zone_id)

        t_res = await db.execute(table_query)
        suitable_tables = t_res.scalars().all()
        if not suitable_tables:
            return []

        # 2. Получаем все активные брони на эту дату
        b_query = select(TableReservation).where(
            TableReservation.restaurant_id == restaurant_id,
            TableReservation.reservation_date == date_str,
            TableReservation.status.in_(["PENDING", "CONFIRMED", "SEATED"])
        )
        b_res = await db.execute(b_query)
        active_bookings = b_res.scalars().all()

        turnover_minutes = cls.get_turnover_duration(guests_count)

        # 3. Генерируем слоты с 11:00 до 22:30 с шагом 30 мин
        slots = []
        current = datetime.strptime("11:00", "%H:%M")
        end_limit = datetime.strptime("22:30", "%H:%M")

        # Pacing: максимум 3 новых стола на один временной слот, чтобы не перегружать кухню
        MAX_PACING_TABLES = 3

        while current <= end_limit:
            slot_str = current.strftime("%H:%M")
            slot_end = (current + timedelta(minutes=turnover_minutes)).strftime("%H:%M")

            # Проверка pacing
            bookings_at_slot = [b for b in active_bookings if b.start_time == slot_str]
            is_pacing_full = len(bookings_at_slot) >= MAX_PACING_TABLES

            # Проверяем наличие свободного подходящего стола
            free_table = None
            if not is_pacing_full:
                for tbl in suitable_tables:
                    # Пересечение интервалов: max(A, C) < min(B, D)
                    has_collision = False
                    for b in active_bookings:
                        if b.table_id == tbl.id:
                            if max(slot_str, b.start_time) < min(slot_end, b.end_time):
                                has_collision = True
                                break
                    if not has_collision:
                        free_table = tbl
                        break

            slots.append({
                "time": slot_str,
                "end_time": slot_end,
                "duration_minutes": turnover_minutes,
                "is_available": free_table is not None,
                "suggested_table_id": free_table.id if free_table else None,
                "suggested_table_number": free_table.table_number if free_table else None
            })
            current += timedelta(minutes=30)

        return slots

    @classmethod
    async def assign_table_for_booking(
        cls,
        db: AsyncSession,
        restaurant_id: int,
        date_str: str,
        start_time: str,
        end_time: str,
        guests_count: int,
        zone_id: Optional[int] = None,
        preferred_table_id: Optional[int] = None
    ) -> Optional[DiningTable]:
        """
        Находит оптимальный стол без коллизий для нового бронирования.
        """
        b_query = select(TableReservation).where(
            TableReservation.restaurant_id == restaurant_id,
            TableReservation.reservation_date == date_str,
            TableReservation.status.in_(["PENDING", "CONFIRMED", "SEATED"])
        )
        b_res = await db.execute(b_query)
        active_bookings = b_res.scalars().all()

        # Если передан предпочитаемый стол, проверяем его доступность
        if preferred_table_id:
            pt_res = await db.get(DiningTable, preferred_table_id)
            if pt_res and pt_res.restaurant_id == restaurant_id and pt_res.is_active:
                if pt_res.min_capacity <= guests_count <= pt_res.max_capacity:
                    if not zone_id or pt_res.zone_id == zone_id:
                        has_collision = any(
                            b.table_id == pt_res.id and max(start_time, b.start_time) < min(end_time, b.end_time)
                            for b in active_bookings
                        )
                        if not has_collision:
                            return pt_res

        # Иначе выбираем наиболее подходящий стол по вместимости
        query = select(DiningTable).where(
            DiningTable.restaurant_id == restaurant_id,
            DiningTable.is_active == True,
            DiningTable.min_capacity <= guests_count,
            DiningTable.max_capacity >= guests_count
        ).order_by(DiningTable.max_capacity.asc(), DiningTable.id.asc())

        if zone_id:
            query = query.where(DiningTable.zone_id == zone_id)

        tables_res = await db.execute(query)
        candidates = tables_res.scalars().all()

        for tbl in candidates:
            has_collision = any(
                b.table_id == tbl.id and max(start_time, b.start_time) < min(end_time, b.end_time)
                for b in active_bookings
            )
            if not has_collision:
                return tbl

        return None
