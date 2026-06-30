import uuid
from decimal import Decimal

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone


class UserRoles(models.TextChoices):
    ADMIN = 'admin', 'Администратор'
    TRADER = 'trader', 'Трейдер'
    CLIENT = 'client', 'Клиент'


class UserManager(BaseUserManager):

    def create_user(self, phone, password):
        if not phone:
            raise ValueError('User must have a phone')

        user = self.model(phone=phone)
        user.set_password(password)
        user.save()

        return user

    def create_superuser(self, phone, password, is_superuser=True):
        if not phone:
            raise ValueError('User must have a phone')

        user = self.model(phone=phone, is_superuser=is_superuser,
                          is_staff=True, is_active=True, is_confirmed=True, role=UserRoles.ADMIN)
        user.first_name = 'admin'
        user.last_name = 'admin'
        user.set_password(password)
        user.save()

        return user


class UserAccounts(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    patronymic_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=30, unique=True)
    email = models.CharField(max_length=255, blank=True, null=True)
    avatar = models.CharField(max_length=255, blank=True, null=True)
    birthday = models.DateField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=UserRoles.choices, default=UserRoles.TRADER)

    objects = UserManager()

    is_active = models.BooleanField(blank=True, default=False)
    is_confirmed = models.BooleanField(default=False)
    in_consideration = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)  # для блокировки трейдеров
    is_online = models.BooleanField(default=False)

    USERNAME_FIELD = 'phone'

    REQUIRED_FIELDS = []


class TraderProfile(models.Model):
    """Профиль трейдера с основной информацией и депозитом"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(UserAccounts, on_delete=models.CASCADE, related_name='trader_profile')
    deposit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'), verbose_name='Размер депозита в KZT')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Профиль трейдера'
        verbose_name_plural = 'Профили трейдеров'

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} - Депозит: {self.deposit_amount} KZT"


class PaymentMethodType(models.TextChoices):
    CARD = 'card', 'Банковская карта'
    CRYPTO_WALLET = 'crypto_wallet', 'Криптокошелек'


class TraderPaymentMethod(models.Model):
    """Реквизиты трейдера для оплаты"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trader = models.ForeignKey(UserAccounts, on_delete=models.CASCADE, related_name='payment_methods')
    method_type = models.CharField(max_length=20, choices=PaymentMethodType.choices, verbose_name='Тип реквизитов')
    
    # Для банковских карт
    bank_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Название банка')
    card_number = models.CharField(max_length=20, blank=True, null=True, verbose_name='Номер карты')
    card_holder_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Держатель карты')
    
    # Для криптокошельков
    wallet_address = models.CharField(max_length=255, blank=True, null=True, verbose_name='Адрес кошелька')
    crypto_network = models.CharField(max_length=50, blank=True, null=True, verbose_name='Сеть (TRC20, ERC20 и т.д.)')
    
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Платежные реквизиты'
        verbose_name_plural = 'Платежные реквизиты'

    def __str__(self):
        if self.method_type == PaymentMethodType.CARD:
            return f"{self.trader.first_name} {self.trader.last_name} - {self.bank_name} ****{self.card_number[-4:] if self.card_number else ''}"
        else:
            return f"{self.trader.first_name} {self.trader.last_name} - Crypto {self.crypto_network}"

    @property
    def display_info(self):
        """Отображаемая информация о реквизитах"""
        if self.method_type == PaymentMethodType.CARD:
            return f"{self.bank_name} - {self.card_holder_name}"
        else:
            return f"Crypto {self.crypto_network} - {self.wallet_address[:10]}..."


class OrderType(models.TextChoices):
    BUY = 'buy', 'Покупка'
    SELL = 'sell', 'Продажа'


class OrderStatus(models.TextChoices):
    NEW = 'new', 'Новая'
    IN_PROGRESS = 'in_progress', 'В обработке'
    COMPLETED = 'completed', 'Завершена'
    CANCELLED = 'cancelled', 'Отменена'


class Order(models.Model):
    """Заявка на покупку/продажу USDT"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_type = models.CharField(max_length=10, choices=OrderType.choices, verbose_name='Тип заявки')
    amount_usdt = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Количество USDT')
    rate = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Курс обмена')
    amount_kzt = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Сумма в тенге')
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.NEW, verbose_name='Статус')
    
    # Связи
    created_by = models.ForeignKey(UserAccounts, on_delete=models.CASCADE, related_name='created_orders', verbose_name='Создал')
    assigned_trader = models.ForeignKey(UserAccounts, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_orders', verbose_name='Назначенный трейдер')
    used_payment_method = models.ForeignKey(TraderPaymentMethod, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders', verbose_name='Использованные реквизиты трейдера')
    
    # Информация о клиенте
    client_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Имя клиента')
    
    # Платежные данные трейдера (копируются из used_payment_method для истории)
    trader_payment_type = models.CharField(max_length=20, choices=PaymentMethodType.choices, blank=True, null=True, verbose_name='Тип оплаты трейдера')
    trader_bank_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Банк трейдера')
    trader_card_number = models.CharField(max_length=20, blank=True, null=True, verbose_name='Номер карты трейдера')
    trader_card_holder = models.CharField(max_length=255, blank=True, null=True, verbose_name='Держатель карты трейдера')
    trader_wallet_address = models.CharField(max_length=255, blank=True, null=True, verbose_name='Адрес кошелька трейдера')
    trader_crypto_network = models.CharField(max_length=50, blank=True, null=True, verbose_name='Сеть трейдера')
    
    # Платежные данные клиента
    client_payment_type = models.CharField(max_length=20, choices=PaymentMethodType.choices, blank=True, null=True, verbose_name='Тип оплаты клиента')
    
    # Для банковской карты клиента
    client_bank_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Банк клиента')
    client_card_number = models.CharField(max_length=20, blank=True, null=True, verbose_name='Номер карты клиента')
    client_card_holder = models.CharField(max_length=255, blank=True, null=True, verbose_name='Держатель карты клиента')
    
    # Для криптокошелька клиента
    client_wallet_address = models.CharField(max_length=255, blank=True, null=True, verbose_name='Адрес кошелька клиента')
    client_crypto_network = models.CharField(max_length=50, blank=True, null=True, verbose_name='Сеть клиента')
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлена')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Завершена')
    
    # Дополнительная информация
    notes = models.TextField(blank=True, null=True, verbose_name='Примечания')
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'), verbose_name='Комиссия трейдера')

    class Meta:
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Автоматический расчет суммы в тенге
        if self.amount_usdt and self.rate:
            self.amount_kzt = self.amount_usdt * self.rate
        
        # Установка времени завершения
        if self.status == OrderStatus.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        
        # Копирование данных из используемых реквизитов трейдера
        if self.used_payment_method and not self.trader_payment_type:
            payment_method = self.used_payment_method
            self.trader_payment_type = payment_method.method_type
            
            if payment_method.method_type == PaymentMethodType.CARD:
                self.trader_bank_name = payment_method.bank_name
                self.trader_card_number = payment_method.card_number
                self.trader_card_holder = payment_method.card_holder_name
            else:
                self.trader_wallet_address = payment_method.wallet_address
                self.trader_crypto_network = payment_method.crypto_network
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_order_type_display()} {self.amount_usdt} USDT по курсу {self.rate}"

    @property
    def trader_payment_info(self):
        """Информация о платежных данных трейдера для сделки"""
        if self.trader_payment_type == PaymentMethodType.CARD:
            return f"{self.trader_bank_name} - {self.trader_card_holder} - ****{self.trader_card_number[-4:] if self.trader_card_number else ''}"
        elif self.trader_payment_type == PaymentMethodType.CRYPTO_WALLET:
            return f"Crypto {self.trader_crypto_network} - {self.trader_wallet_address}"
        return "Реквизиты трейдера не указаны"

    @property
    def client_payment_info(self):
        """Информация о платежных данных клиента для сделки"""
        if self.client_payment_type == PaymentMethodType.CARD:
            parts = []
            if self.client_bank_name:
                parts.append(self.client_bank_name)
            if self.client_card_holder:
                parts.append(self.client_card_holder)
            if self.client_card_number:
                parts.append(self.client_card_number)
            return ' - '.join(parts) if parts else 'Реквизиты клиента не указаны'
        elif self.client_payment_type == PaymentMethodType.CRYPTO_WALLET:
            return f"Crypto {self.client_crypto_network} - {self.client_wallet_address}"
        return "Реквизиты клиента не указаны"

    @property
    def payment_info(self):
        """Общая информация о платежах в сделке"""
        trader_info = self.trader_payment_info
        client_info = self.client_payment_info
        return f"Трейдер: {trader_info} | Клиент: {client_info}"


class TraderStatistics(models.Model):
    """Модель для отслеживания статистики трейдера"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trader = models.ForeignKey(UserAccounts, on_delete=models.CASCADE, related_name='statistics')
    date = models.DateField(verbose_name='Дата')
    orders_count = models.IntegerField(default=0, verbose_name='Количество заявок')
    total_earned = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'), verbose_name='Заработано')
    total_volume_usdt = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'), verbose_name='Объем USDT')

    class Meta:
        verbose_name = 'Статистика трейдера'
        verbose_name_plural = 'Статистика трейдеров'
        unique_together = ['trader', 'date']

    def __str__(self):
        return f"{self.trader.first_name} {self.trader.last_name} - {self.date}"


class OrderMessage(models.Model):
    """Сообщение в чате заявки"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='messages', verbose_name='Заявка')
    sender = models.ForeignKey(UserAccounts, on_delete=models.CASCADE, related_name='order_messages', verbose_name='Отправитель')
    text = models.TextField(blank=True, verbose_name='Текст сообщения')
    image = models.ImageField(upload_to='chat_images/%Y/%m/', blank=True, null=True, verbose_name='Изображение')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')

    class Meta:
        verbose_name = 'Сообщение заявки'
        verbose_name_plural = 'Сообщения заявок'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.phone}: {self.text[:50]}"


class SupportMessage(models.Model):
    """Сообщение в чате поддержки"""
    class Channel(models.TextChoices):
        SITE = 'site', 'Сайт'
        TELEGRAM = 'telegram', 'Telegram'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        UserAccounts, on_delete=models.CASCADE, related_name='support_thread',
        verbose_name='Пользователь (тред)'
    )
    sender = models.ForeignKey(
        UserAccounts, on_delete=models.CASCADE, related_name='sent_support_messages',
        verbose_name='Отправитель'
    )
    text = models.TextField(verbose_name='Текст')
    channel = models.CharField(
        max_length=10, choices=Channel.choices, default=Channel.SITE, verbose_name='Канал'
    )
    is_read = models.BooleanField(default=False, verbose_name='Прочитано')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    telegram_message_id = models.BigIntegerField(null=True, blank=True, verbose_name='ID сообщения в Telegram')

    class Meta:
        verbose_name = 'Сообщение поддержки'
        verbose_name_plural = 'Сообщения поддержки'
        ordering = ['created_at']

    def __str__(self):
        return f"Support {self.user.phone}: {self.text[:50]}"


class OrderReview(models.Model):
    """Отзыв клиента о сделке"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='review')
    client = models.ForeignKey(UserAccounts, on_delete=models.CASCADE, related_name='reviews_given')
    trader = models.ForeignKey(UserAccounts, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.IntegerField(verbose_name='Оценка (1-5)')
    text = models.TextField(blank=True, verbose_name='Текст отзыва')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Отзыв'
        verbose_name_plural = 'Отзывы'
        ordering = ['-created_at']

    def __str__(self):
        return f"Review {self.client.phone} -> {self.trader.phone}: {self.rating}/5"


class ExchangeRate(models.Model):
    """Кэш курса обмена"""
    pair = models.CharField(max_length=20, unique=True, verbose_name='Пара')
    rate = models.DecimalField(max_digits=12, decimal_places=4, verbose_name='Курс')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Курс обмена'
        verbose_name_plural = 'Курсы обмена'

    def __str__(self):
        return f"{self.pair}: {self.rate}"
