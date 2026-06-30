from django.conf import settings
from django.core.management.base import BaseCommand

from accounts import telegram_service


class Command(BaseCommand):
    help = 'Показать информацию о Telegram-боте и chat_id для настройки'

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            self.stderr.write('Задайте TELEGRAM_BOT_TOKEN в backend_proces/.env')
            return

        username = telegram_service.get_bot_username()
        self.stdout.write(self.style.SUCCESS(f'Бот: @{username}'))

        if settings.TELEGRAM_ADMIN_CHAT_ID:
            self.stdout.write(f'ADMIN_CHAT_ID: {settings.TELEGRAM_ADMIN_CHAT_ID}')
        else:
            self.stdout.write(self.style.WARNING('TELEGRAM_ADMIN_CHAT_ID не задан'))

        self.stdout.write('\nНапишите боту /start в Telegram, затем снова запустите эту команду.\n')

        result = telegram_service._api('getUpdates', {'limit': 20})
        if not result:
            self.stdout.write('Нет входящих сообщений (getUpdates пуст).')
            return

        seen = set()
        for update in result:
            message = update.get('message') or update.get('edited_message')
            if not message:
                continue
            chat = message['chat']
            chat_id = chat['id']
            if chat_id in seen:
                continue
            seen.add(chat_id)
            name = chat.get('first_name') or chat.get('title') or '?'
            self.stdout.write(f'  chat_id={chat_id}  ({name})')

        if seen and not settings.TELEGRAM_ADMIN_CHAT_ID:
            first = next(iter(seen))
            self.stdout.write(self.style.SUCCESS(
                f'\nДобавьте в backend_proces/.env:\nTELEGRAM_ADMIN_CHAT_ID={first}'
            ))
