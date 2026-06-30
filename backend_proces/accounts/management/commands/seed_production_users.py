import json
import os
import secrets
import string
from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.models import TraderProfile, UserAccounts, UserRoles


def _strong_password(length=20):
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    while True:
        pwd = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in pwd) and any(c.isupper() for c in pwd)
                and any(c.isdigit() for c in pwd) and any(c in '!@#$%^&*' for c in pwd)):
            return pwd


class Command(BaseCommand):
    help = 'Создаёт или обновляет admin, trader, client с надёжными паролями'

    USERS = [
        {
            'phone': '+77001000001',
            'role': UserRoles.ADMIN,
            'first_name': 'Admin',
            'last_name': 'SwapUSDT',
            'is_staff': True,
            'profile': False,
        },
        {
            'phone': '+77001000002',
            'role': UserRoles.TRADER,
            'first_name': 'Trader',
            'last_name': 'SwapUSDT',
            'is_staff': False,
            'profile': True,
        },
        {
            'phone': '+77001000003',
            'role': UserRoles.CLIENT,
            'first_name': 'Client',
            'last_name': 'SwapUSDT',
            'is_staff': False,
            'profile': False,
        },
    ]

    def handle(self, *args, **options):
        creds_path = '/app/PRODUCTION_CREDENTIALS.json'
        credentials = {}

        if os.path.exists(creds_path):
            with open(creds_path, encoding='utf-8') as f:
                credentials = json.load(f)
            self.stdout.write('Credentials file exists, skipping user recreation.')
            return

        for spec in self.USERS:
            password = _strong_password()
            user, created = UserAccounts.objects.get_or_create(
                phone=spec['phone'],
                defaults={
                    'first_name': spec['first_name'],
                    'last_name': spec['last_name'],
                    'role': spec['role'],
                    'is_active': True,
                    'is_confirmed': True,
                    'in_consideration': False,
                    'is_staff': spec['is_staff'],
                },
            )
            if not created:
                user.first_name = spec['first_name']
                user.last_name = spec['last_name']
                user.role = spec['role']
                user.is_active = True
                user.is_confirmed = True
                user.in_consideration = False
                user.is_staff = spec['is_staff']
            user.set_password(password)
            user.save()

            if spec['profile']:
                TraderProfile.objects.get_or_create(
                    user=user,
                    defaults={'deposit_amount': Decimal('1000000')},
                )

            credentials[spec['role']] = {
                'phone': spec['phone'],
                'password': password,
                'name': f"{spec['first_name']} {spec['last_name']}",
            }
            self.stdout.write(self.style.SUCCESS(f"{spec['role']}: {spec['phone']}"))

        with open(creds_path, 'w', encoding='utf-8') as f:
            json.dump(credentials, f, ensure_ascii=False, indent=2)

        self.stdout.write(self.style.SUCCESS(f'Credentials saved to {creds_path}'))
