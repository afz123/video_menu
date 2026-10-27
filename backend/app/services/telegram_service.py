import asyncio
import html
import logging
from typing import Optional, List, Dict, Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger("video_menu.telegram")

class TelegramService:
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
        if not bot_token or not chat_id:
            logger.warning("Telegram dispatch skipped: bot_token or chat_id not configured")
            return False

        url = f"https://api.telegram.org/bot{bot_token.strip()}/sendMessage"
        payload = {
            "chat_id": chat_id.strip(),
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

        safe_rest_name = html.escape(str(restaurant_name or "Ресторан"))
        safe_table = html.escape(str(table_number or ""))

        lines = [
            f"<b>{header}</b>",
            f"📍 <b>Стол:</b> <code>№ {safe_table}</code>",
            f"🏛️ <b>Заведение:</b> {safe_rest_name}"
        ]

        if guest_comment:
            lines.append(f"💬 <b>Пожелание гостя:</b> <i>«{html.escape(guest_comment.strip())}»</i>")

        if cart_items and len(cart_items) > 0:
            lines.append("\n📋 <b>Позиции к подаче:</b>")
            subtotal = 0.0
            curr = html.escape(restaurant_currency or "TJS")

            for idx, item in enumerate(cart_items, 1):
                raw_name = item.get("name") or "Блюдо"
                safe_name = html.escape(str(raw_name))
                qty = int(item.get("quantity", 1))
                price = float(item.get("total_price") or item.get("price") or 0.0)
                course = item.get("course") or item.get("selected_course") or "Основной курс"
                safe_course = html.escape(str(course))
                subtotal += price * qty

                mods = item.get("chosen_options") or item.get("selected_modifiers") or item.get("modifiers") or []
                mod_texts = []
                for m in mods:
                    if isinstance(m, dict):
                        raw_grp = m.get("group") or m.get("modifier_name") or ""
                        raw_opt = m.get("name") or m.get("option_name") or ""
                        extra = m.get("price") or m.get("extra_price") or 0
                        extra_str = f" (+{extra})" if extra and float(extra) > 0 else ""
                        safe_grp = html.escape(str(raw_grp))
                        safe_opt = html.escape(str(raw_opt))
                        if safe_grp:
                            mod_texts.append(f"<b>{safe_grp}:</b> {safe_opt}{extra_str}")
                        elif safe_opt:
                            mod_texts.append(f"{safe_opt}{extra_str}")
                    elif isinstance(m, str):
                        mod_texts.append(html.escape(m))

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
        safe_rest_name = html.escape(str(restaurant_name or "Ресторан"))
        safe_table = html.escape(str(table_number or ""))
        stars = "⭐" * max(1, min(5, int(nps_score)))

        lines = [
            "🚨 <b>ВНИМАНИЕ УПРАВЛЯЮЩЕМУ: НИЗКАЯ ОЦЕНКА ГОСТЯ!</b>",
            f"📍 <b>Стол:</b> <code>№ {safe_table}</code>",
            f"🏛️ <b>Заведение:</b> {safe_rest_name}",
            f"⭐️ <b>Оценка:</b> {stars} ({nps_score}/5)",
            "⚠️ <i>Гость еще находится в зале! Пожалуйста, подойдите к столу немедленно для решения вопроса.</i>"
        ]
        if guest_comment:
            lines.append(f"💬 <b>Отзыв:</b> «{html.escape(guest_comment.strip())}»")

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
        safe_rest_name = html.escape(str(restaurant_name or "Ресторан"))
        safe_code = html.escape(str(booking_code or ""))
        safe_guest = html.escape(str(guest_name or "Гость"))
        safe_phone = html.escape(str(guest_phone or ""))
        safe_wishes = html.escape(str(guest_wishes.strip())) if guest_wishes else None

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

        safe_tbl = html.escape(str(table_number)) if table_number else "Будет назначен хостес"
        safe_zone = html.escape(str(zone_name)) if zone_name else ""
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

