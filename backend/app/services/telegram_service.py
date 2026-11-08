import asyncio
import html
import logging
from typing import Optional, List, Dict, Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger("video_menu.telegram")

def sanitize_tg(text: Any) -> str:
    """Безопасное экранирование спецсимволов HTML для Telegram Bot API"""
    if text is None:
        return ""
    return html.escape(str(text), quote=True)

class TelegramService:
    @staticmethod
    def sanitize(text: Any) -> str:
        return sanitize_tg(text)
    @staticmethod
    @retry(
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.NetworkError, httpx.TimeoutException)),
        reraise=False
    )
    async def send_message(
        bot_token: str,
        chat_id: str,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Sends an HTML-formatted notification to staff Telegram group with retry, 429 backoff and network recovery.
        """
        if not bot_token or not chat_id or bot_token.startswith("broken_") or bot_token.startswith("test_"):
            logger.warning("Telegram dispatch skipped: bot_token or chat_id not configured or test dummy")
            return False

        clean_token = bot_token.strip()
        clean_chat_id = str(chat_id).strip()
        if clean_chat_id.startswith("-") and not clean_chat_id.startswith("-100"):
            clean_chat_id = "-100" + clean_chat_id[1:]
        elif clean_chat_id.isdigit():
            clean_chat_id = "-100" + clean_chat_id

        url = f"https://api.telegram.org/bot{clean_token}/sendMessage"
        payload = {
            "chat_id": clean_chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    logger.info(f"Telegram notification delivered to chat {chat_id}")
                    return True
                elif res.status_code == 429:
                    retry_after = int(res.headers.get("Retry-After", 2))
                    logger.warning(f"Telegram Rate Limit (429). Backing off for {retry_after}s")
                    await asyncio.sleep(retry_after)
                    retry_res = await client.post(url, json=payload)
                    return retry_res.status_code == 200

                logger.error(f"Telegram dispatch failed [{res.status_code}]: {res.text}")
                return False
        except (httpx.NetworkError, httpx.TimeoutException) as e:
            logger.error(f"Telegram network exception (retrying): {e}")
            raise e
        except Exception as e:
            logger.error(f"Telegram unexpected error: {e}")
            return False

    @classmethod
    async def notify_service_request(
        cls,
        bot_token: str,
        chat_id: str,
        restaurant_name: str,
        table_number: str,
        request_type: str,
        guest_comment: Optional[str] = None,
        cart_items: Optional[List[Dict[str, Any]]] = None,
        service_charge_percent: float = 10.0,
        restaurant_currency: str = "TJS",
        tip_amount: float = 0.0
    ) -> bool:
        """
        Dispatches luxury-formatted dining alert with courses, modifiers, amounts and staff inline buttons.
        """
        type_headers = {
            "call_waiter": "🛎️ ВЫЗОВ ОФИЦИАНТА К СТОЛУ",
            "call_sommelier": "🍷 ЗАПРОС СОМЕЛЬЕ (ВИННЫЙ ПЕЙРИНГ)",
            "call_hookah": "💨 ВЫЗОВ МАСТЕРА ПАРОВЫХ КОКТЕЙЛЕЙ",
            "call_admin": "👔 СРОЧНЫЙ ВЫЗОВ УПРАВЛЯЮЩЕГО В ЗАЛ",
            "request_bill_cash": "💵 ЗАПРОС СЧЁТА (НАЛИЧНЫЙ РАСЧЕТ)",
            "request_bill_card": "💳 ЗАПРОС СЧЁТА (БАНКОВСКИЙ ТЕРМИНАЛ)",
            "order": "🍽️ НОВЫЙ ЗАКАЗ В ЦЕХ",
            "repeat_order": "🔁 ДОЗАКАЗ К СТОЛУ"
        }

        header = type_headers.get(request_type, "🛎️ ВЫЗОВ В ЗАЛЕ")
        if guest_comment and "ДОЗАКАЗ" in guest_comment:
            header = "🔁 ДОЗАКАЗ К СТОЛУ"

        safe_rest_name = sanitize_tg(restaurant_name or "Ресторан")
        safe_table = sanitize_tg(table_number or "")

        lines = [
            f"<b>{header}</b>",
            f"📍 <b>Стол:</b> <code>№ {safe_table}</code>",
            f"🏛️ <b>Заведение:</b> {safe_rest_name}"
        ]

        if guest_comment:
            lines.append(f"💬 <b>Пожелание гостя:</b> <i>«{sanitize_tg(guest_comment.strip())}»</i>")

        if cart_items and len(cart_items) > 0:
            lines.append("\n📋 <b>Позиции к подаче:</b>")
            subtotal = 0.0
            curr = sanitize_tg(restaurant_currency or "TJS")

            for idx, item in enumerate(cart_items, 1):
                safe_name = sanitize_tg(item.get("name") or "Блюдо")
                qty = int(item.get("quantity", 1))
                price = float(item.get("total_price") or item.get("price") or 0.0)
                course = item.get("course") or item.get("selected_course") or "Основной курс"
                safe_course = sanitize_tg(course)
                subtotal += price * qty

                mods = item.get("chosen_options") or item.get("selected_modifiers") or item.get("modifiers") or []
                mod_texts = []
                for m in mods:
                    if isinstance(m, dict):
                        raw_grp = m.get("group") or m.get("modifier_name") or ""
                        raw_opt = m.get("name") or m.get("option_name") or ""
                        extra = m.get("price") or m.get("extra_price") or 0
                        extra_str = f" (+{extra})" if extra and float(extra) > 0 else ""
                        safe_grp = sanitize_tg(raw_grp)
                        safe_opt = sanitize_tg(raw_opt)
                        if safe_grp:
                            mod_texts.append(f"<b>{safe_grp}:</b> {safe_opt}{extra_str}")
                        elif safe_opt:
                            mod_texts.append(f"{safe_opt}{extra_str}")
                    elif isinstance(m, str):
                        mod_texts.append(sanitize_tg(m))

                mod_str = f"\n     └ <i>Параметры: {', '.join(mod_texts)}</i>" if mod_texts else ""
                lines.append(f"  {idx}. <b>{safe_name}</b> x{qty} [<code>{safe_course}</code>] — {price * qty:.1f} {curr}{mod_str}")

            svc = subtotal * (service_charge_percent / 100.0)
            total = subtotal + svc + float(tip_amount or 0.0)

            lines.append(f"\n💵 Позиции: {subtotal:.1f} {curr}")
            lines.append(f"🏷️ Обслуживание ({service_charge_percent:.0f}%): +{svc:.1f} {curr}")
            if tip_amount and float(tip_amount) > 0:
                lines.append(f"❤️ Чаевые команде: +{float(tip_amount):.1f} {curr}")
            lines.append(f"💰 <b>ИТОГО К ОПЛАТЕ: {total:.1f} {curr}</b>")

        inline_keyboard = {
            "inline_keyboard": [
                [
                    {"text": "🏃 Принял (Спешу к столу)", "callback_data": f"take_{safe_table}"},
                    {"text": "✅ Выполнено", "callback_data": f"done_{safe_table}"}
                ]
            ]
        }

        return await cls.send_message(bot_token, chat_id, "\n".join(lines), reply_markup=inline_keyboard)

    @classmethod
    async def notify_low_nps_alert(
        cls,
        bot_token: str,
        chat_id: str,
        restaurant_name: str,
        table_number: str,
        nps_score: int,
        guest_comment: Optional[str] = None
    ) -> bool:
        """
        Instant High-Priority Alert directly to General Manager when a guest leaves 1-3 stars.
        """
        safe_rest_name = sanitize_tg(restaurant_name or "Ресторан")
        safe_table = sanitize_tg(table_number or "")
        stars = "⭐" * max(1, min(5, int(nps_score)))

        lines = [
            "🚨 <b>ВНИМАНИЕ УПРАВЛЯЮЩЕМУ: НИЗКАЯ ОЦЕНКА ГОСТЯ!</b>",
            f"📍 <b>Стол:</b> <code>№ {safe_table}</code>",
            f"🏛️ <b>Заведение:</b> {safe_rest_name}",
            f"⭐️ <b>Оценка:</b> {stars} ({nps_score}/5)",
            "⚠️ <i>Гость еще находится в зале! Пожалуйста, подойдите к столу немедленно для решения вопроса.</i>"
        ]
        if guest_comment:
            lines.append(f"💬 <b>Отзыв:</b> «{sanitize_tg(guest_comment.strip())}»")

        inline_keyboard = {
            "inline_keyboard": [
                [{"text": "🏃 Спешу к столу для беседы", "callback_data": f"escalate_{safe_table}"}]
            ]
        }
        return await cls.send_message(bot_token, chat_id, "\n".join(lines), reply_markup=inline_keyboard)

    @classmethod
    async def notify_reservation(
        cls,
        bot_token: str,
        chat_id: str,
        restaurant_name: str,
        booking_code: str,
        guest_name: str,
        guest_phone: str,
        guests_count: int,
        reservation_date: str,
        start_time: str,
        end_time: str,
        table_number: Optional[str] = None,
        zone_name: Optional[str] = None,
        guest_wishes: Optional[str] = None,
        source: str = "MOBILE_QR",
        reservation_id: Optional[int] = None
    ) -> bool:
        """
        Instant Push Notification to hostess / manager Telegram with interactive action buttons.
        """
        safe_rest_name = sanitize_tg(restaurant_name or "Ресторан")
        safe_code = sanitize_tg(booking_code or "")
        safe_guest = sanitize_tg(guest_name or "Гость")
        safe_phone = sanitize_tg(guest_phone or "")
        safe_wishes = sanitize_tg(guest_wishes.strip()) if guest_wishes else None

        source_labels = {
            "KIOSK_STREET": "🖥️ Уличный сенсорный киоск",
            "MOBILE_QR": "📱 Мобильное видеоменю",
            "PHONE_CALL": "📞 Телефонный звонок",
            "WALK_IN": "🚶 Посадка с улицы"
        }
        source_label = source_labels.get(source, "📱 Онлайн-бронирование")

        lines = [
            f"📅 <b>НОВАЯ БРОНЬ СТОЛА ({safe_code})</b>",
            f"🏛️ <b>Ресторан:</b> {safe_rest_name}",
            f"👤 <b>Гость:</b> {safe_guest}",
            f"📞 <b>Телефон:</b> <code>{safe_phone}</code>",
            f"👥 <b>Персон:</b> {guests_count} чел.",
            f"⏰ <b>Дата & Время:</b> {reservation_date} с {start_time} до {end_time}",
        ]

        safe_tbl = sanitize_tg(table_number) if table_number else "Будет назначен хостес"
        safe_zone = sanitize_tg(zone_name) if zone_name else ""
        table_info = f"№ {safe_tbl}" if table_number else "Будет назначен хостес"
        if safe_zone:
            table_info += f" ({safe_zone})"
        lines.append(f"🪑 <b>Стол:</b> {table_info}")

        if safe_wishes:
            lines.append(f"💬 <b>Пожелание:</b> <i>«{safe_wishes}»</i>")

        lines.append(f"📍 <b>Источник:</b> {source_label}")

        bk_id = reservation_id or 0
        inline_keyboard = {
            "inline_keyboard": [
                [
                    {"text": "✅ Подтвердить", "callback_data": f"confirm_bk_{bk_id}"},
                    {"text": "❌ Отклонить", "callback_data": f"cancel_bk_{bk_id}"}
                ]
            ]
        }

        return await cls.send_message(bot_token, chat_id, "\n".join(lines), reply_markup=inline_keyboard)

    @classmethod
    async def notify_order_ready(
        cls,
        bot_token: str,
        chat_id: str,
        restaurant_name: str,
        table_number: str,
        item_name: Optional[str] = None,
        department: Optional[str] = None,
        cooking_minutes: Optional[int] = None,
        items_count: int = 1,
        order_id: Optional[int] = None
    ) -> bool:
        """
        Instant Push Notification to staff Telegram when kitchen KDS marks order or item READY.
        «🛎️ СТОЛ №4: Блюдо готово на раздаче! Заберите!»
        """
        safe_rest_name = sanitize_tg(restaurant_name or "Ресторан")
        safe_table = sanitize_tg(table_number or "")
        safe_item = sanitize_tg(item_name) if item_name else None
        safe_dept = sanitize_tg(department) if department else "Кухня / Раздача"

        lines = [
            f"🛎️ <b>РАЗДАЧА КУХНИ: СТОЛ №{safe_table}</b>",
            f"🏛️ <b>Заведение:</b> {safe_rest_name}",
        ]
        if safe_item:
            lines.append(f"🍽️ <b>Блюдо:</b> {safe_item}")
        else:
            lines.append(f"🍽️ <b>Заказ:</b> Все блюда ({items_count} поз.) готовы к отдаче!")

        lines.append(f"👨‍🍳 <b>Цех:</b> {safe_dept}")
        if cooking_minutes is not None:
            lines.append(f"⏱️ <b>Время готовки:</b> {cooking_minutes} мин.")

        lines.append("⚡ <i>Заберите заказ с раздачи и отнесите к столу гостя!</i>")

        oid = order_id or 0
        inline_keyboard = {
            "inline_keyboard": [
                [
                    {"text": "🏃 Забрал и несу гостю", "callback_data": f"served_{oid}_{safe_table}"}
                ]
            ]
        }
        return await cls.send_message(bot_token, chat_id, "\n".join(lines), reply_markup=inline_keyboard)

    @staticmethod
    async def answer_callback_query(
        bot_token: str,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> bool:
        """
        Answers a Telegram callback query to dismiss the loading spinner on buttons.
        """
        if not bot_token or not callback_query_id:
            return False
        clean_token = bot_token.strip()
        url = f"https://api.telegram.org/bot{clean_token}/answerCallbackQuery"
        payload = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text
        if show_alert:
            payload["show_alert"] = True

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(url, json=payload)
                return res.status_code == 200
        except Exception as e:
            logger.error(f"Error answering callback query: {e}")
            return False

    @staticmethod
    async def edit_message_reply_markup(
        bot_token: str,
        chat_id: Any,
        message_id: int,
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Updates the inline keyboard buttons on an existing Telegram message.
        """
        if not bot_token or not chat_id or not message_id:
            return False
        clean_token = bot_token.strip()
        url = f"https://api.telegram.org/bot{clean_token}/editMessageReplyMarkup"
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "message_id": message_id
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(url, json=payload)
                return res.status_code == 200
        except Exception as e:
            logger.error(f"Error editing message reply markup: {e}")
            return False

    @classmethod
    async def handle_callback_query(
        cls,
        bot_token: str,
        callback_query: Dict[str, Any],
        db_session
    ):
        """
        Processes staff button clicks in Telegram:
        - take_{table}: Staff took the request/call
        - done_{table}: Staff fulfilled the request
        - escalate_{table}: Manager is attending low NPS table
        - confirm_bk_{id} / cancel_bk_{id}: Reservation approval
        - served_{id}_{table}: Order served to table
        """
        from app.models.service_request import ServiceRequest
        from app.models.reservation import TableReservation
        from sqlalchemy import select

        cq_id = callback_query.get("id")
        data = callback_query.get("data", "")
        message = callback_query.get("message", {})
        message_id = message.get("message_id")
        chat = message.get("chat", {})
        chat_id = chat.get("id")

        from_user = callback_query.get("from", {})
        first_name = from_user.get("first_name", "")
        username = from_user.get("username")
        staff_name = f"@{username}" if username else (first_name or "Официант")

        logger.info(f"Telegram callback received: {data} by {staff_name} (msg: {message_id}, chat: {chat_id})")

        if data.startswith("take_"):
            table_number = data.replace("take_", "").strip()
            # Update DB service request for this table
            try:
                res = await db_session.execute(
                    select(ServiceRequest)
                    .where(
                        ServiceRequest.table_number == table_number,
                        ServiceRequest.status.in_(["PENDING", "COOKING", "READY"])
                    )
                    .order_by(ServiceRequest.id.desc())
                    .limit(1)
                )
                srv = res.scalar_one_or_none()
                if srv:
                    srv.status = "ACKNOWLEDGED"
                    srv.acknowledged_by = staff_name
                    await db_session.commit()
            except Exception as e:
                logger.error(f"DB update failed on take: {e}")

            # Answer callback
            await cls.answer_callback_query(
                bot_token,
                cq_id,
                text=f"🏃 {staff_name} принял вызов к столу {table_number}!",
                show_alert=False
            )

            # Update inline buttons: show who took it and offer complete button
            new_markup = {
                "inline_keyboard": [
                    [
                        {"text": f"🏃 Принял: {staff_name}", "callback_data": f"noop_{table_number}"},
                        {"text": "✅ Выполнено", "callback_data": f"done_{table_number}"}
                    ]
                ]
            }
            await cls.edit_message_reply_markup(bot_token, chat_id, message_id, new_markup)

        elif data.startswith("done_"):
            table_number = data.replace("done_", "").strip()
            try:
                res = await db_session.execute(
                    select(ServiceRequest)
                    .where(
                        ServiceRequest.table_number == table_number,
                        ServiceRequest.status.in_(["PENDING", "ACKNOWLEDGED", "COOKING", "READY"])
                    )
                    .order_by(ServiceRequest.id.desc())
                    .limit(1)
                )
                srv = res.scalar_one_or_none()
                if srv:
                    srv.status = "COMPLETED"
                    if not srv.acknowledged_by:
                        srv.acknowledged_by = staff_name
                    await db_session.commit()
            except Exception as e:
                logger.error(f"DB update failed on done: {e}")

            await cls.answer_callback_query(
                bot_token,
                cq_id,
                text=f"✅ Запрос стола {table_number} выполнен ({staff_name})",
                show_alert=False
            )

            new_markup = {
                "inline_keyboard": [
                    [
                        {"text": f"✅ Выполнил: {staff_name}", "callback_data": f"noop_{table_number}"}
                    ]
                ]
            }
            await cls.edit_message_reply_markup(bot_token, chat_id, message_id, new_markup)

        elif data.startswith("escalate_"):
            table_number = data.replace("escalate_", "").strip()
            await cls.answer_callback_query(
                bot_token,
                cq_id,
                text=f"🏃 {staff_name} направляется к столу {table_number}!",
                show_alert=True
            )
            new_markup = {
                "inline_keyboard": [
                    [
                        {"text": f"🏃 Решает вопрос: {staff_name}", "callback_data": f"noop_{table_number}"}
                    ]
                ]
            }
            await cls.edit_message_reply_markup(bot_token, chat_id, message_id, new_markup)

        elif data.startswith("confirm_bk_") or data.startswith("cancel_bk_"):
            is_confirm = data.startswith("confirm_bk_")
            bk_id_str = data.replace("confirm_bk_", "").replace("cancel_bk_", "").strip()
            new_status = "CONFIRMED" if is_confirm else "CANCELLED"
            status_text = "подтверждена" if is_confirm else "отклонена"

            try:
                if bk_id_str.isdigit():
                    bk = await db_session.get(TableReservation, int(bk_id_str))
                    if bk:
                        bk.status = new_status
                        await db_session.commit()
            except Exception as e:
                logger.error(f"DB update failed on reservation: {e}")

            await cls.answer_callback_query(
                bot_token,
                cq_id,
                text=f"Бронь #{bk_id_str} {status_text} ({staff_name})",
                show_alert=False
            )

            btn_label = f"✅ Подтвердил: {staff_name}" if is_confirm else f"❌ Отклонил: {staff_name}"
            new_markup = {
                "inline_keyboard": [
                    [{"text": btn_label, "callback_data": "noop_bk"}]
                ]
            }
            await cls.edit_message_reply_markup(bot_token, chat_id, message_id, new_markup)

        elif data.startswith("served_"):
            parts = data.split("_")
            table_num = parts[2] if len(parts) > 2 else ""
            await cls.answer_callback_query(
                bot_token,
                cq_id,
                text=f"🏃 {staff_name} забрал заказ и несет к столу {table_num}!",
                show_alert=False
            )
            new_markup = {
                "inline_keyboard": [
                    [{"text": f"🏃 Несет к столу: {staff_name}", "callback_data": f"noop_served"}]
                ]
            }
            await cls.edit_message_reply_markup(bot_token, chat_id, message_id, new_markup)

        elif data.startswith("noop_"):
            await cls.answer_callback_query(
                bot_token,
                cq_id,
                text="Статус уже зафиксирован",
                show_alert=False
            )
        else:
            await cls.answer_callback_query(bot_token, cq_id)

