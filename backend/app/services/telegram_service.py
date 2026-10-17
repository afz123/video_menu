import logging
from typing import Optional, List, Dict, Any
import httpx

logger = logging.getLogger("video_menu.telegram")

class TelegramService:
    @staticmethod
    async def send_message(
        bot_token: str,
        chat_id: str,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Sends an HTML-formatted notification to the restaurant staff Telegram chat/channel.
        """
        if not bot_token or not chat_id:
            logger.warning("Telegram notification skipped: bot_token or chat_id not configured")
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
                    logger.info(f"Telegram notification sent successfully to chat {chat_id}")
                    return True
                else:
                    logger.error(f"Telegram API error ({res.status_code}): {res.text}")
                    return False
        except Exception as e:
            logger.error(f"Failed to deliver Telegram notification: {e}")
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
        service_charge_percent: float = 10.0
    ) -> bool:
        """
        Formats a restaurant-grade dispatch alert for waitstaff and hosts.
        """
        time_str = "Сейчас"
        type_titles = {
            "call_waiter": "🛎️ ВЫЗОВ ОФИЦИАНТА",
            "request_bill_cash": "💵 ЗАПРОС СЧЁТА (НАЛИЧНЫЕ)",
            "request_bill_card": "💳 ЗАПРОС СЧЁТА (КАРТА)",
            "order": "🍽️ НОВЫЙ ЗАКАЗ ИЗ МЕНЮ"
        }
        header = type_titles.get(request_type, "🛎️ ВЫЗОВ В ЗАЛЕ")

        lines = [
            f"<b>{header}</b>",
            f"📍 <b>Стол:</b> <code>№ {table_number}</code>",
            f"🏛️ <b>Ресторан:</b> {restaurant_name}"
        ]

        if guest_comment:
            lines.append(f"💬 <b>Пожелание гостя:</b> <i>«{guest_comment}»</i>")

        if cart_items and len(cart_items) > 0:
            lines.append("\n📋 <b>Состав заказа:</b>")
            subtotal = 0.0
            currency = "TJS"
            for idx, item in enumerate(cart_items, 1):
                name = item.get("name") or "Блюдо"
                qty = item.get("quantity", 1)
                item_price = float(item.get("total_price") or item.get("price") or 0.0)
                subtotal += item_price * qty
                currency = item.get("currency", currency)

                # Format modifiers
                mods = item.get("selected_modifiers") or []
                mod_texts = []
                for m in mods:
                    opt = m.get("option_name")
                    extra = m.get("extra_price", 0)
                    if extra > 0:
                        mod_texts.append(f"{opt} (+{extra})")
                    else:
                        mod_texts.append(str(opt))

                mod_str = f" <i>({', '.join(mod_texts)})</i>" if mod_texts else ""
                lines.append(f"  {idx}. {name} x{qty} — {item_price * qty:.1f} {currency}{mod_str}")

            service_charge = subtotal * (service_charge_percent / 100.0)
            total = subtotal + service_charge

            lines.append(f"\n💵 <b>Блюда:</b> {subtotal:.1f} {currency}")
            lines.append(f"🏷️ <b>Обслуживание ({service_charge_percent:.0f}%):</b> {service_charge:.1f} {currency}")
            lines.append(f"💰 <b>ИТОГО К ОПЛАТЕ:</b> <b>{total:.1f} {currency}</b>")

        text = "\n".join(lines)
        return await cls.send_message(bot_token, chat_id, text)
