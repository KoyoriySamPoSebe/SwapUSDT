import logging
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

TG_LINK_PREFIX = 'tg_link:'
TG_USER_PREFIX = 'tg_user:'
TG_OFFSET_KEY = 'telegram:updates_offset'
TG_BOT_USERNAME_KEY = 'telegram:bot_username'
TG_ADMIN_THREAD_PREFIX = 'tg_admin_thread:'


def is_configured() -> bool:
    return bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_ADMIN_CHAT_ID)


def _api(method: str, payload: dict | None = None) -> dict | None:
    if not settings.TELEGRAM_BOT_TOKEN:
        return None
    url = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}'
    try:
        response = requests.post(url, json=payload or {}, timeout=15)
        data = response.json()
        if not data.get('ok'):
            logger.warning('Telegram API error %s: %s', method, data)
            return None
        return data.get('result')
    except requests.RequestException as exc:
        logger.exception('Telegram request failed: %s', exc)
        return None


def get_bot_username() -> str | None:
    cached = cache.get(TG_BOT_USERNAME_KEY)
    if cached:
        return cached
    result = _api('getMe')
    if result and result.get('username'):
        cache.set(TG_BOT_USERNAME_KEY, result['username'], 86400)
        return result['username']
    return None


def get_bot_url(user_id: str | None = None) -> str | None:
    username = get_bot_username()
    if not username:
        return settings.TELEGRAM_BOT_USERNAME and f'https://t.me/{settings.TELEGRAM_BOT_USERNAME.lstrip("@")}'
    base = f'https://t.me/{username}'
    if user_id:
        return f'{base}?start=link_{user_id}'
    return base


def link_telegram_chat(chat_id: int, user_id: str) -> None:
    cache.set(f'{TG_LINK_PREFIX}{chat_id}', user_id, None)
    cache.set(f'{TG_USER_PREFIX}{user_id}', chat_id, None)


def get_linked_user_id(chat_id: int) -> str | None:
    return cache.get(f'{TG_LINK_PREFIX}{chat_id}')


def get_linked_chat_id(user_id: str) -> int | None:
    return cache.get(f'{TG_USER_PREFIX}{user_id}')


def _store_tg_thread(admin_message_id: int, user_tg_chat_id: int, user_id: str) -> None:
    cache.set(
        f'{TG_ADMIN_THREAD_PREFIX}{admin_message_id}',
        {'chat_id': user_tg_chat_id, 'user_id': user_id},
        None,
    )


def _resolve_tg_thread(admin_message_id: int) -> dict | None:
    return cache.get(f'{TG_ADMIN_THREAD_PREFIX}{admin_message_id}')


def send_message(chat_id: int | str, text: str, reply_to_message_id: int | None = None) -> dict | None:
    payload: dict[str, Any] = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML',
    }
    if reply_to_message_id:
        payload['reply_parameters'] = {'message_id': reply_to_message_id}
    return _api('sendMessage', payload)


def notify_admin_about_site_message(user, text: str) -> int | None:
    """Уведомление админу о сообщении с сайта (канал сайта, не дублируем TG-ответы обратно)."""
    if not is_configured():
        return None

    admin_text = (
        f'💬 <b>Сайт</b> · {user.first_name or ""} {user.last_name or ""}\n'
        f'📞 <code>{user.phone}</code>\n'
        f'🆔 <code>{user.id}</code>\n\n'
        f'{text}'
    )
    result = send_message(settings.TELEGRAM_ADMIN_CHAT_ID, admin_text)
    if result:
        return result.get('message_id')
    return None


def notify_admin_about_telegram_user(user, text: str, tg_username: str | None, user_tg_chat_id: int) -> int | None:
    """Уведомление админу о сообщении из Telegram (канал TG, не пишем в БД сайта)."""
    if not is_configured():
        return None
    username_part = f'@{tg_username}' if tg_username else 'без username'
    admin_text = (
        f'📱 <b>Telegram</b> · {username_part}\n'
        f'👤 {user.first_name} {user.last_name}\n'
        f'📞 <code>{user.phone}</code>\n\n'
        f'{text}'
    )
    result = send_message(settings.TELEGRAM_ADMIN_CHAT_ID, admin_text)
    if result and result.get('message_id'):
        _store_tg_thread(result['message_id'], user_tg_chat_id, str(user.id))
        return result.get('message_id')
    return None


def send_to_user_telegram(user_id: str, text: str) -> None:
    chat_id = get_linked_chat_id(user_id)
    if chat_id:
        send_message(chat_id, f'💬 <b>Поддержка SwapUSDT</b>\n\n{text}')


def poll_updates() -> int:
    """Опрос Telegram getUpdates."""
    if not is_configured():
        return 0

    from .models import UserAccounts, SupportMessage

    offset = cache.get(TG_OFFSET_KEY, 0)
    result = _api('getUpdates', {'offset': offset, 'timeout': 0, 'allowed_updates': ['message']})
    if result is None:
        return 0

    processed = 0
    admin_chat_id = int(settings.TELEGRAM_ADMIN_CHAT_ID)

    for update in result:
        processed += 1
        update_id = update.get('update_id', 0)
        cache.set(TG_OFFSET_KEY, update_id + 1, None)

        message = update.get('message')
        if not message or 'text' not in message:
            continue

        chat_id = message['chat']['id']
        text = message['text'].strip()
        reply_to = message.get('reply_to_message')

        # --- Ответ админа в TG ---
        if chat_id == admin_chat_id and reply_to:
            reply_msg_id = reply_to.get('message_id')

            # Ответ на чисто-TG переписку — только Telegram, не на сайт
            tg_thread = _resolve_tg_thread(reply_msg_id)
            if tg_thread and text:
                send_message(tg_thread['chat_id'], f'💬 <b>Поддержка SwapUSDT</b>\n\n{text}')
                continue

            # Ответ на сообщение с сайта — сохраняем на сайт (клиент видит в виджете)
            site_msg = SupportMessage.objects.filter(
                telegram_message_id=reply_msg_id,
                channel=SupportMessage.Channel.SITE,
            ).first()
            if site_msg and text:
                from .models import UserRoles
                admin_user = UserAccounts.objects.filter(
                    role=UserRoles.ADMIN, is_active=True
                ).first()
                if admin_user:
                    SupportMessage.objects.create(
                        user=site_msg.user,
                        sender=admin_user,
                        text=text,
                        channel=SupportMessage.Channel.SITE,
                        is_read=False,
                    )
            continue

        # --- Личные сообщения боту ---
        if chat_id != admin_chat_id:
            if text.startswith('/start'):
                parts = text.split(maxsplit=1)
                if len(parts) > 1 and parts[1].startswith('link_'):
                    user_id = parts[1][5:]
                    if UserAccounts.objects.filter(id=user_id).exists():
                        link_telegram_chat(chat_id, user_id)
                        user = UserAccounts.objects.get(id=user_id)
                        send_message(
                            chat_id,
                            f'✅ Telegram привязан!\n\n'
                            f'Здравствуйте, {user.first_name}! Пишите здесь — '
                            f'это отдельный чат с поддержкой. История на сайте — только переписка с сайта.',
                        )
                    else:
                        send_message(chat_id, '❌ Не удалось привязать аккаунт. Войдите на сайт и нажмите кнопку Telegram ещё раз.')
                else:
                    send_message(
                        chat_id,
                        '👋 SwapUSDT Support\n\n'
                        'Войдите на сайт и нажмите «Написать в Telegram» — '
                        'аккаунт привяжется для личного чата с поддержкой.',
                    )
                continue

            linked_user_id = get_linked_user_id(chat_id)
            if linked_user_id:
                try:
                    user = UserAccounts.objects.get(id=linked_user_id)
                except UserAccounts.DoesNotExist:
                    continue

                tg_username = message['from'].get('username')
                notify_admin_about_telegram_user(user, text, tg_username, chat_id)
            else:
                send_message(
                    chat_id,
                    '🔗 Сначала привяжите аккаунт через кнопку «Telegram» в чате поддержки на сайте.',
                )

    return processed
