from datetime import datetime
from decimal import Decimal
import secrets
import string

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import (
    Order, OrderStatus, OrderType, PaymentMethodType,
    TraderProfile, UserAccounts, UserRoles,
)


KASPI_ATM_DEALS = [
    ('28.12.25', 3000),
    ('04.11.25', 1000000),
    ('24.10.25', 780000),
    ('15.10.25', 980000),
    ('15.10.25', 500000),
    ('15.10.25', 1000000),
    ('14.10.25', 1091000),
    ('10.09.25', 1500000),
    ('09.09.25', 980000),
    ('09.09.25', 530000),
    ('09.09.25', 970000),
    ('09.09.25', 985000),
    ('09.09.25', 204000),
    ('09.09.25', 1096000),
]

TRADER_PHONE = '+77076056060'
TRADER_FIRST_NAME = 'Аружан'
TRADER_LAST_NAME = 'Асанбай'
TRADER_PATRONYMIC = 'Асанқызы'
CLIENT_NAME = 'Клиент Kaspi'
SPREAD = Decimal('0.03')

# USD/KZT spot (exchangerates.org.uk), buy = mid × 1.03
HISTORICAL_USD_KZT = {
    '09.09.25': Decimal('536.6242'),
    '10.09.25': Decimal('538.5572'),
    '14.10.25': Decimal('540.1981'),
    '15.10.25': Decimal('538.8420'),
    '24.10.25': Decimal('538.4486'),
    '04.11.25': Decimal('523.9954'),
    '28.12.25': Decimal('507.9408'),
}


def buy_rate_for_date(date_str: str) -> Decimal:
    mid = HISTORICAL_USD_KZT.get(date_str)
    if mid is None:
        raise ValueError(f'Нет курса USD/KZT для {date_str}')
    return (mid * (1 + SPREAD)).quantize(Decimal('0.01'))


def parse_date(value: str) -> datetime:
    day, month, year = value.split('.')
    return datetime(int('20' + year), int(month), int(day), 12, 0, 0)


class Command(BaseCommand):
    help = 'Импорт завершённых сделок Kaspi Банкомат для трейдера'

    def handle(self, *args, **options):
        admin = UserAccounts.objects.filter(role=UserRoles.ADMIN).first()

        trader, created = UserAccounts.objects.get_or_create(
            phone=TRADER_PHONE,
            defaults={
                'first_name': TRADER_FIRST_NAME,
                'last_name': TRADER_LAST_NAME,
                'patronymic_name': TRADER_PATRONYMIC,
                'role': UserRoles.TRADER,
                'is_active': True,
                'is_confirmed': True,
                'in_consideration': False,
            },
        )
        if created:
            alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
            pwd = ''.join(secrets.choice(alphabet) for _ in range(20))
            trader.set_password(pwd)
            trader.save()
            TraderProfile.objects.create(user=trader, deposit_amount=Decimal('0'))
            self.stdout.write(self.style.SUCCESS(f'Создан трейдер {TRADER_PHONE}, пароль: {pwd}'))
        else:
            trader.first_name = TRADER_FIRST_NAME
            trader.last_name = TRADER_LAST_NAME
            trader.patronymic_name = TRADER_PATRONYMIC
            trader.role = UserRoles.TRADER
            trader.save()
            TraderProfile.objects.get_or_create(user=trader, defaults={'deposit_amount': Decimal('0')})
            self.stdout.write(f'Трейдер найден: {TRADER_PHONE}')

        created_count = 0
        skipped = 0

        for date_str, amount_kzt in KASPI_ATM_DEALS:
            amount_kzt_dec = Decimal(amount_kzt)
            deal_dt = timezone.make_aware(parse_date(date_str))
            if Order.objects.filter(
                assigned_trader=trader,
                amount_kzt=amount_kzt_dec,
                created_at__date=deal_dt.date(),
            ).exists():
                skipped += 1
                continue

            rate = buy_rate_for_date(date_str)
            amount_usdt = (amount_kzt_dec / rate).quantize(Decimal('0.01'))

            order = Order(
                order_type=OrderType.BUY,
                amount_usdt=amount_usdt,
                rate=rate,
                amount_kzt=amount_kzt_dec,
                status=OrderStatus.COMPLETED,
                created_by=admin or trader,
                assigned_trader=trader,
                client_name=CLIENT_NAME,
                client_payment_type=PaymentMethodType.CARD,
                client_bank_name='Kaspi Bank',
                notes='',
                completed_at=deal_dt,
            )
            order.save()
            Order.objects.filter(pk=order.pk).update(
                amount_kzt=amount_kzt_dec,
                created_at=deal_dt,
                updated_at=deal_dt,
                completed_at=deal_dt,
            )
            created_count += 1
            self.stdout.write(f'  + {date_str}  {amount_kzt:,} ₸  ({amount_usdt} USDT)'.replace(',', ' '))

        total = sum(a for _, a in KASPI_ATM_DEALS)
        self.stdout.write(self.style.SUCCESS(
            f'\nГотово: создано {created_count}, пропущено {skipped}, '
            f'всего {total:,} ₸'.replace(',', ' ')
        ))
