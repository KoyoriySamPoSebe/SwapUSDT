import random
from datetime import timedelta
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Order, OrderMessage, UserAccounts, UserRoles


TRADER_PHONE = '+77076056060'
DEFAULT_CLIENT_PHONE = '+77070000001'
KIM_CLIENT_PHONE = '+77077800000'
OSPANOVA_CLIENT_PHONE = '+77058387573'

# Уникальный диалог на каждую сделку: (дата ISO, сумма KZT)
# sender: 'client' | 'trader', '__QR__' — фото QR от клиента
CONVERSATIONS = [
    {
        'date': '2025-09-09', 'amount_kzt': 204000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [11, 2, 1, 3, 1, 2, 1],
        'messages': [
            ('client', 'Добрый день, нужен usdt'),
            ('trader', 'Добрый! Через банкомат Kaspi сможете?'),
            ('client', 'Да, рядом стою уже'),
            ('client', 'Щас скину код'),
            ('client', '__QR__'),
            ('trader', 'Вижу, жду поступление'),
            ('client', 'Пополнил'),
            ('trader', 'Дошло, usdt отправила ✓'),
        ],
    },
    {
        'date': '2025-09-09', 'amount_kzt': 530000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [14, 3, 2, 1, 4, 2, 1],
        'messages': [
            ('client', 'Здравствуйте, актуально ещё?'),
            ('trader', 'Да, добрый день. Kaspi банкомат подойдёт?'),
            ('client', 'Подойдёт, через 5 мин буду'),
            ('trader', 'Хорошо, жду QR'),
            ('client', '__QR__'),
            ('trader', 'QR получила, пополняйте'),
            ('client', 'Готово, проверьте'),
            ('trader', 'Пришло 530к, usdt ушли'),
        ],
    },
    {
        'date': '2025-09-09', 'amount_kzt': 970000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [10, 4, 1, 2, 3, 2, 1, 1],
        'messages': [
            ('client', 'Салем, обмен нужен'),
            ('trader', 'Салем! Сумма какая?'),
            ('client', '970 тысяч тенге'),
            ('trader', 'Ок, Kaspi ATM знаете как?'),
            ('client', 'Да, делал уже. QR сейчас'),
            ('client', '__QR__'),
            ('trader', 'Есть, пополняйте'),
            ('client', 'Отправил'),
            ('trader', 'Зашло, спасибо!'),
        ],
    },
    {
        'date': '2025-09-09', 'amount_kzt': 985000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [13, 2, 3, 1, 2, 3, 1],
        'messages': [
            ('client', 'Привет, можно купить usdt?'),
            ('trader', 'Можно. Банкомат Kaspi удобно?'),
            ('client', 'Да норм'),
            ('client', 'Вот qr для пополнения'),
            ('client', '__QR__'),
            ('trader', 'Сканирую... да, ваш'),
            ('client', 'Перевёл'),
            ('trader', '985к на месте, usdt отправлены'),
        ],
    },
    {
        'date': '2025-09-09', 'amount_kzt': 980000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [9, 5, 2, 1, 3, 2, 1, 2],
        'messages': [
            ('client', 'Сәлеметсіз бе'),
            ('trader', 'Сәлеметсіз бе! USDT керек пе?'),
            ('client', 'Иә, 980 мың'),
            ('trader', 'Kaspi банкомат арқылы болады'),
            ('client', 'Жақсы, QR жіберемін'),
            ('client', '__QR__'),
            ('trader', 'Келді, толықтырыңыз'),
            ('client', 'Жібердім'),
            ('trader', 'Түсті, рахмет!'),
        ],
    },
    {
        'date': '2025-09-09', 'amount_kzt': 1096000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [15, 2, 4, 1, 2, 4, 2, 1],
        'messages': [
            ('client', 'Добрый вечер'),
            ('trader', 'Добрый! Чем помочь?'),
            ('client', 'Хочу обменять ~1.1 млн на usdt'),
            ('trader', 'Без проблем. Kaspi банкомат, QR пришлёте?'),
            ('client', 'Да, минуту'),
            ('client', '__QR__'),
            ('trader', 'QR ок, жду перевод'),
            ('client', 'Пополнил банкомат'),
            ('trader', '1 096 000 поступило, usdt ушли на кошелёк'),
        ],
    },
    {
        'date': '2025-09-10', 'amount_kzt': 1500000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [12, 3, 2, 2, 1, 5, 2, 1],
        'messages': [
            ('client', 'Здравствуйте, крупная сумма — 1.5 млн, возьмёте?'),
            ('trader', 'Здравствуйте, да. Только через Kaspi ATM, согласны?'),
            ('client', 'Согласен'),
            ('trader', 'Тогда жду QR, как будете у банкомата'),
            ('client', 'Подошёл, отправляю'),
            ('client', '__QR__'),
            ('trader', 'Получила. Пополняйте, буду на связи'),
            ('client', 'Готово, 1 500 000'),
            ('trader', 'Подтверждаю, usdt отправлены. Хорошего дня!'),
        ],
    },
    {
        'date': '2025-10-14', 'amount_kzt': 1091000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [11, 4, 1, 2, 3, 2, 1],
        'messages': [
            ('client', 'Можно usdt купить?'),
            ('trader', 'Можно. Kaspi банкомат знаком?'),
            ('client', 'Да, часто пользуюсь'),
            ('client', 'QR ловите'),
            ('client', '__QR__'),
            ('trader', 'Есть, пополняйте 1 091 000'),
            ('client', 'Сделал'),
            ('trader', 'Зашло, usdt отправила'),
        ],
    },
    {
        'date': '2025-10-15', 'amount_kzt': 500000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [8, 3, 2, 1, 2, 3, 1],
        'messages': [
            ('client', 'Привет! 500к на usdt'),
            ('trader', 'Привет! Kaspi ATM ок?'),
            ('client', 'Ок'),
            ('client', '__QR__'),
            ('trader', 'QR пришёл'),
            ('client', 'Пополнил'),
            ('trader', '500к вижу, usdt ушли'),
        ],
    },
    {
        'date': '2025-10-15', 'amount_kzt': 1000000,
        'client_phone': OSPANOVA_CLIENT_PHONE,
        'delays_min': [14, 2, 3, 1, 4, 2, 1, 1],
        'messages': [
            ('client', 'Добрый день, нужен usdt на миллион'),
            ('trader', 'Добрый! Через Kaspi банкомат?'),
            ('client', 'Да, так удобнее'),
            ('trader', 'Жду QR, как будете у банкомата'),
            ('client', 'Готова, отправила'),
            ('client', '__QR__'),
            ('trader', 'Получила, пополняйте'),
            ('client', 'Перевела миллион'),
            ('trader', 'Пришло, usdt отправлены 👍'),
        ],
    },
    {
        'date': '2025-10-15', 'amount_kzt': 980000,
        'client_phone': OSPANOVA_CLIENT_PHONE,
        'delays_min': [10, 2, 4, 1, 2, 3, 1],
        'messages': [
            ('client', 'Салем, обмен 980к'),
            ('trader', 'Салем! Kaspi ATM?'),
            ('client', 'Ия'),
            ('client', 'Міне QR'),
            ('client', '__QR__'),
            ('trader', 'Келді'),
            ('client', 'Жібердім'),
            ('trader', 'Түсті, usdt жіберілді'),
        ],
    },
    {
        'date': '2025-10-24', 'amount_kzt': 780000,
        'client_phone': KIM_CLIENT_PHONE,
        'delays_min': [12, 3, 2, 1, 3, 2, 1, 1],
        'messages': [
            ('client', 'Здравствуйте, Аружан? Обмен нужен'),
            ('trader', 'Здравствуйте! Да, это я. Kaspi банкомат подходит?'),
            ('client', 'Да, 780 тысяч буду класть'),
            ('trader', 'Хорошо, пришлите QR'),
            ('client', 'Секунду...'),
            ('client', '__QR__'),
            ('trader', 'QR получила, жду'),
            ('client', 'Пополнил банкомат'),
            ('trader', '780к на счёте, usdt отправила. Спасибо!'),
        ],
    },
    {
        'date': '2025-11-04', 'amount_kzt': 1000000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [13, 2, 3, 2, 1, 4, 2, 1],
        'messages': [
            ('client', 'Добрый, usdt актуально?'),
            ('trader', 'Актуально. Сумма?'),
            ('client', '1 000 000 тенге'),
            ('trader', 'Kaspi ATM, пришлёте QR?'),
            ('client', 'Да, вот'),
            ('client', '__QR__'),
            ('trader', 'Вижу QR, пополняйте'),
            ('client', 'Готово'),
            ('trader', 'Миллион зашёл, usdt ушли'),
        ],
    },
    {
        'date': '2025-12-28', 'amount_kzt': 3000,
        'client_phone': DEFAULT_CLIENT_PHONE,
        'delays_min': [7, 2, 1, 2, 1],
        'messages': [
            ('client', 'Привет, тестово 3к можно?'),
            ('trader', 'Можно 😄 Kaspi ATM, QR кидай'),
            ('client', '__QR__'),
            ('trader', 'Есть, пополняй'),
            ('client', 'Готово'),
            ('trader', '3к дошло, usdt отправила'),
        ],
    },
]


class Command(BaseCommand):
    help = 'Генерация чатов по сделкам Kaspi Банкомат с QR-кодами'

    def add_arguments(self, parser):
        parser.add_argument(
            '--qr-dir',
            type=str,
            default='/app/qr_images',
            help='Папка с QR-изображениями',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Пересоздать чаты (удалить старые сообщения)',
        )

        parser.add_argument(
            '--only',
            nargs='+',
            help='Только указанные сделки: 2025-10-15:980000',
        )

    def _parse_only(self, items):
        result = set()
        for item in items:
            date_str, amount = item.rsplit(':', 1)
            result.add((date_str, int(amount)))
        return result

    def _get_client(self, phone: str) -> UserAccounts:
        defaults = {
            'first_name': 'Клиент',
            'last_name': 'Kaspi',
            'patronymic_name': '',
            'role': UserRoles.CLIENT,
            'is_active': True,
            'is_confirmed': True,
            'in_consideration': False,
        }
        if phone == KIM_CLIENT_PHONE:
            defaults.update({
                'first_name': 'Андрей',
                'last_name': 'Ким',
                'patronymic_name': 'Вадимович',
            })
        elif phone == OSPANOVA_CLIENT_PHONE:
            defaults.update({
                'first_name': 'Джамиля',
                'last_name': 'Оспанова',
                'patronymic_name': 'Каиржановна',
            })
        client, created = UserAccounts.objects.get_or_create(phone=phone, defaults=defaults)
        if created:
            client.set_unusable_password()
            client.save()
            self.stdout.write(f'Создан клиент {phone}')
        return client

    def _find_order(self, trader, date_str: str, amount_kzt: int):
        return Order.objects.filter(
            assigned_trader=trader,
            created_at__date=date_str,
            amount_kzt=amount_kzt,
        ).first()

    def handle(self, *args, **options):
        qr_dir = Path(options['qr_dir'])
        if not qr_dir.exists():
            self.stderr.write(f'Папка не найдена: {qr_dir}')
            return

        qr_files = sorted(qr_dir.glob('*.jpg')) + sorted(qr_dir.glob('*.png'))
        if len(qr_files) < len(CONVERSATIONS):
            self.stderr.write(
                f'QR файлов ({len(qr_files)}) меньше сделок ({len(CONVERSATIONS)})'
            )
            return

        try:
            trader = UserAccounts.objects.get(phone=TRADER_PHONE, role=UserRoles.TRADER)
        except UserAccounts.DoesNotExist:
            self.stderr.write(f'Трейдер {TRADER_PHONE} не найден')
            return

        # Крупные QR-файлы — основная серия
        qr_files = sorted(qr_files, key=lambda p: p.stat().st_size, reverse=True)
        qr_files = sorted(qr_files[:len(CONVERSATIONS)], key=lambda p: p.name)

        clients_cache: dict[str, UserAccounts] = {}
        total_messages = 0
        only_set = self._parse_only(options['only']) if options.get('only') else None

        for idx, conv in enumerate(CONVERSATIONS):
            conv_key = (conv['date'], conv['amount_kzt'])
            if only_set is not None and conv_key not in only_set:
                continue

            order = self._find_order(trader, conv['date'], conv['amount_kzt'])
            if not order:
                self.stderr.write(
                    f'Сделка не найдена: {conv["date"]} {conv["amount_kzt"]} ₸'
                )
                continue

            if options['force'] or only_set is not None:
                order.messages.all().delete()
            elif order.messages.exists():
                self.stdout.write(
                    f'  пропуск (чат есть): {conv["date"]} {conv["amount_kzt"]} ₸'
                )
                continue

            phone = conv.get('client_phone', DEFAULT_CLIENT_PHONE)
            if phone not in clients_cache:
                clients_cache[phone] = self._get_client(phone)
            client = clients_cache[phone]

            deal_time = order.completed_at or order.created_at
            messages = conv['messages']
            needed_delays = max(len(messages) - 1, 0)
            delays = list(conv.get('delays_min', []))
            if len(delays) < needed_delays:
                delays.extend([2] * (needed_delays - len(delays)))
            delays = delays[:needed_delays]
            qr_file = qr_files[idx]

            # Время первого сообщения — сумма всех задержек минут назад от сделки
            total_delay = sum(delays)
            cursor = deal_time - timedelta(minutes=total_delay)

            for msg_idx, (role, text) in enumerate(messages):
                sender = client if role == 'client' else trader
                if msg_idx > 0:
                    cursor += timedelta(minutes=delays[msg_idx - 1])
                    # ±30 сек для естественности
                    cursor += timedelta(seconds=random.randint(-30, 45))

                if text == '__QR__':
                    msg = OrderMessage(order=order, sender=sender, text='')
                    msg.save()
                    with qr_file.open('rb') as f:
                        msg.image.save(qr_file.name, File(f), save=True)
                else:
                    msg = OrderMessage.objects.create(
                        order=order,
                        sender=sender,
                        text=text,
                    )

                OrderMessage.objects.filter(pk=msg.pk).update(created_at=cursor)
                total_messages += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ {conv["date"]} {conv["amount_kzt"]:,} ₸ — '
                    f'{len(messages)} сообщений'.replace(',', ' ')
                )
            )

        self.stdout.write(self.style.SUCCESS(
            f'\nГотово: {total_messages} сообщений'
        ))
