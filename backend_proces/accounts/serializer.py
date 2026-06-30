from rest_framework.serializers import (
    ModelSerializer, Serializer, CharField, IntegerField, SerializerMethodField,
    DecimalField, ChoiceField, BooleanField, DateField, ValidationError, ListField, DictField, DateTimeField
)
from django.utils import timezone
from datetime import date, timedelta
from django.db.models import Sum, Count
from decimal import Decimal

from .models import (
    UserAccounts, TraderProfile, Order, TraderStatistics, TraderPaymentMethod,
    UserRoles, OrderType, OrderStatus, PaymentMethodType, OrderMessage
)


class RefreshTokenSerialzierPost(Serializer):
    refresh = CharField()


class UserSerialzier(ModelSerializer):
    class Meta:
        model = UserAccounts
        fields = ['id', 'first_name', 'last_name', 'patronymic_name',
                  'phone', 'avatar', 'birthday', 'role', 'is_blocked', 'is_online']


class UserUpdateSerializer(ModelSerializer):
    class Meta:
        model = UserAccounts
        fields = UserSerialzier.Meta.fields
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'patronymic_name': {'required': False},
            'birthday': {'required': False},
            'avatar': {'required': False},
            'phone': {'required': False},
            'role': {'required': False},
            'is_blocked': {'required': False}
        }


class LoginSerializer(Serializer):
    phone = CharField()
    password = CharField()


class RegisterSeialzier(Serializer):
    first_name = CharField()
    last_name = CharField()
    patronymic_name = CharField()
    birthday = CharField()
    phone = CharField()
    password = CharField()


# Новые сериализаторы для криптообмена

class TraderPaymentMethodSerializer(ModelSerializer):
    """Сериализатор для платежных реквизитов трейдера"""
    method_type_display = SerializerMethodField()
    display_info = SerializerMethodField()

    class Meta:
        model = TraderPaymentMethod
        fields = ['id', 'method_type', 'method_type_display', 'bank_name', 
                 'card_number', 'card_holder_name', 'wallet_address', 'crypto_network',
                 'is_active', 'display_info', 'created_at', 'updated_at']

    def get_method_type_display(self, obj):
        return obj.get_method_type_display()
    
    def get_display_info(self, obj):
        return obj.display_info


class CreatePaymentMethodSerializer(ModelSerializer):
    """Сериализатор для создания платежных реквизитов"""
    class Meta:
        model = TraderPaymentMethod
        fields = ['method_type', 'bank_name', 'card_number', 'card_holder_name',
                 'wallet_address', 'crypto_network']

    def validate(self, data):
        method_type = data.get('method_type')
        
        if method_type == PaymentMethodType.CARD:
            required_fields = ['bank_name', 'card_number', 'card_holder_name']
            for field in required_fields:
                if not data.get(field):
                    raise ValidationError(f"Поле {field} обязательно для банковской карты")
        
        elif method_type == PaymentMethodType.CRYPTO_WALLET:
            required_fields = ['wallet_address', 'crypto_network']
            for field in required_fields:
                if not data.get(field):
                    raise ValidationError(f"Поле {field} обязательно для криптокошелька")
        
        return data

    def create(self, validated_data):
        validated_data['trader'] = self.context['trader']
        return super().create(validated_data)


class TraderProfileSerializer(ModelSerializer):
    user_info = UserSerialzier(source='user', read_only=True)
    payment_methods = TraderPaymentMethodSerializer(source='user.payment_methods', many=True, read_only=True)
    total_commission = SerializerMethodField()
    
    class Meta:
        model = TraderProfile
        fields = ['id', 'user', 'user_info', 'deposit_amount', 'payment_methods',
                 'total_commission', 'created_at', 'updated_at']
        extra_kwargs = {
            'user': {'write_only': True}
        }

    def get_total_commission(self, obj):
        """Получить общую заработанную комиссию трейдера"""
        from .models import Order, OrderStatus
        total = Order.objects.filter(
            assigned_trader=obj.user,
            status=OrderStatus.COMPLETED
        ).aggregate(total=Sum('commission'))['total']
        return total or Decimal('0')


class CreateTraderSerializer(Serializer):
    """Сериализатор для создания трейдера администратором"""
    first_name = CharField()
    last_name = CharField()
    patronymic_name = CharField(required=False, allow_blank=True)
    phone = CharField()
    password = CharField()
    deposit_amount = DecimalField(max_digits=15, decimal_places=2)

    def validate_phone(self, value):
        if UserAccounts.objects.filter(phone=value).exists():
            raise ValidationError("Пользователь с таким номером телефона уже существует")
        return value

    def create(self, validated_data):
        # Извлекаем депозит
        deposit_amount = validated_data.pop('deposit_amount')
        
        # Создаем пользователя с ролью трейдера
        validated_data['role'] = UserRoles.TRADER
        validated_data['is_active'] = True
        validated_data['is_confirmed'] = True
        validated_data['in_consideration'] = False
        
        # Создаем пользователя
        password = validated_data.pop('password')
        phone = validated_data.pop('phone')
        
        user = UserAccounts.objects.create_user(phone=phone, password=password)
        
        # Устанавливаем дополнительные поля
        for field, value in validated_data.items():
            setattr(user, field, value)
        user.save()
        
        # Создаем профиль трейдера с депозитом
        TraderProfile.objects.create(user=user, deposit_amount=deposit_amount)
        
        return user


class OrderSerializer(ModelSerializer):
    assigned_trader_info = UserSerialzier(source='assigned_trader', read_only=True)
    used_payment_method_info = TraderPaymentMethodSerializer(source='used_payment_method', read_only=True)
    order_type_display = SerializerMethodField()
    status_display = SerializerMethodField()
    trader_payment_info = SerializerMethodField()
    client_payment_info = SerializerMethodField()
    payment_info = SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'order_type', 'order_type_display', 'amount_usdt', 'rate', 
                 'amount_kzt', 'status', 'status_display', 'created_by',
                 'assigned_trader', 'assigned_trader_info', 'used_payment_method', 
                 'used_payment_method_info', 'client_name',
                 'trader_payment_type', 'trader_bank_name', 'trader_card_number', 
                 'trader_card_holder', 'trader_wallet_address', 'trader_crypto_network',
                 'client_payment_type', 'client_bank_name', 'client_card_number',
                 'client_card_holder', 'client_wallet_address', 'client_crypto_network',
                 'trader_payment_info', 'client_payment_info', 'payment_info',
                 'created_at', 'updated_at', 'completed_at', 'notes', 'commission']
        read_only_fields = ['id', 'amount_kzt', 'created_at', 'updated_at', 'completed_at', 
                           'trader_payment_info', 'client_payment_info', 'payment_info']

    def get_order_type_display(self, obj):
        return obj.get_order_type_display()
    
    def get_status_display(self, obj):
        return obj.get_status_display()
    
    def get_trader_payment_info(self, obj):
        return obj.trader_payment_info

    def get_client_payment_info(self, obj):
        return obj.client_payment_info
    
    def get_payment_info(self, obj):
        return obj.payment_info


class CreateOrderSerializer(ModelSerializer):
    """Сериализатор для создания заявки администратором"""
    class Meta:
        model = Order
        fields = ['order_type', 'amount_usdt', 'rate', 'client_name', 'notes']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CreateOrderForTraderSerializer(Serializer):
    """Сериализатор для создания заявки админом с назначением трейдера и всех платежных данных"""
    order_type = ChoiceField(choices=OrderType.choices)
    amount_usdt = DecimalField(max_digits=12, decimal_places=2)
    rate = DecimalField(max_digits=10, decimal_places=2)
    trader_id = CharField()
    trader_payment_method_id = CharField()
    client_name = CharField(required=False, allow_blank=True)
    notes = CharField(required=False, allow_blank=True)
    
    # Платежные данные клиента (для покупки крипты трейдером - карта продавца, для продажи - кошелек покупателя)
    client_payment_type = ChoiceField(choices=PaymentMethodType.choices)
    
    # Для банковской карты клиента
    client_bank_name = CharField(required=False, allow_blank=True)
    client_card_number = CharField(required=False, allow_blank=True)
    client_card_holder = CharField(required=False, allow_blank=True)
    
    # Для криптокошелька клиента
    client_wallet_address = CharField(required=False, allow_blank=True)
    client_crypto_network = CharField(required=False, allow_blank=True)

    def validate_trader_id(self, value):
        try:
            trader = UserAccounts.objects.get(id=value, role=UserRoles.TRADER)
            if trader.is_blocked:
                raise ValidationError("Трейдер заблокирован")
            return trader
        except UserAccounts.DoesNotExist:
            raise ValidationError("Трейдер не найден")

    def validate_trader_payment_method_id(self, value):
        try:
            payment_method = TraderPaymentMethod.objects.get(id=value, is_active=True)
            return payment_method
        except TraderPaymentMethod.DoesNotExist:
            raise ValidationError("Реквизиты трейдера не найдены или неактивны")

    def validate(self, data):
        # Проверяем, что реквизиты трейдера принадлежат выбранному трейдеру
        trader = data.get('trader_id')
        payment_method = data.get('trader_payment_method_id')
        
        if trader and payment_method and payment_method.trader != trader:
            raise ValidationError("Выбранные реквизиты не принадлежат указанному трейдеру")
        
        # Проверяем платежные данные клиента в зависимости от типа
        client_payment_type = data.get('client_payment_type')
        
        if client_payment_type == PaymentMethodType.CARD:
            required_fields = ['client_bank_name', 'client_card_number', 'client_card_holder']
            for field in required_fields:
                if not data.get(field):
                    raise ValidationError(f"Поле {field} обязательно для банковской карты клиента")
        
        elif client_payment_type == PaymentMethodType.CRYPTO_WALLET:
            required_fields = ['client_wallet_address', 'client_crypto_network']
            for field in required_fields:
                if not data.get(field):
                    raise ValidationError(f"Поле {field} обязательно для криптокошелька клиента")
        
        # Логическая проверка: при покупке крипты трейдером клиент должен платить картой,
        # при продаже крипты трейдером клиент должен указать кошелек
        order_type = data.get('order_type')
        if order_type == OrderType.BUY and client_payment_type != PaymentMethodType.CARD:
            raise ValidationError("При покупке крипты трейдером клиент должен платить банковской картой")
        
        if order_type == OrderType.SELL and client_payment_type != PaymentMethodType.CRYPTO_WALLET:
            raise ValidationError("При продаже крипты трейдером клиент должен указать криптокошелек")
        
        return data

    def create(self, validated_data):
        # Извлекаем данные
        trader = validated_data.pop('trader_id')
        trader_payment_method = validated_data.pop('trader_payment_method_id')
        
        # Создаем заявку
        order = Order.objects.create(
            created_by=self.context['request'].user,
            assigned_trader=trader,
            used_payment_method=trader_payment_method,
            status=OrderStatus.IN_PROGRESS,  # Сразу назначаем в работу
            **validated_data
        )
        
        return order


class UpdateOrderStatusSerializer(Serializer):
    """Сериализатор для обновления статуса заявки"""
    status = ChoiceField(choices=OrderStatus.choices)
    assigned_trader = CharField(required=False, allow_null=True)
    used_payment_method = CharField(required=False, allow_null=True)
    notes = CharField(required=False, allow_blank=True)
    commission = DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate_assigned_trader(self, value):
        if value:
            try:
                trader = UserAccounts.objects.get(id=value, role=UserRoles.TRADER)
                if trader.is_blocked:
                    raise ValidationError("Трейдер заблокирован")
                return trader
            except UserAccounts.DoesNotExist:
                raise ValidationError("Трейдер не найден")
        return None

    def validate_used_payment_method(self, value):
        if value:
            try:
                payment_method = TraderPaymentMethod.objects.get(id=value)
                if not payment_method.is_active:
                    raise ValidationError("Реквизиты неактивны")
                return payment_method
            except TraderPaymentMethod.DoesNotExist:
                raise ValidationError("Реквизиты не найдены")
        return None


class TraderStatisticsSerializer(ModelSerializer):
    class Meta:
        model = TraderStatistics
        fields = ['date', 'orders_count', 'total_earned', 'total_volume_usdt']


class TraderDashboardSerializer(Serializer):
    """Сериализатор для дашборда трейдера со статистикой"""
    today_stats = TraderStatisticsSerializer(read_only=True)
    week_stats = SerializerMethodField()
    month_stats = SerializerMethodField()
    trader_profile = TraderProfileSerializer(read_only=True)

    def get_week_stats(self, obj):
        """Статистика за неделю"""
        week_start = date.today() - timedelta(days=7)
        stats = TraderStatistics.objects.filter(
            trader=obj, 
            date__gte=week_start
        ).aggregate(
            orders_count=Sum('orders_count'),
            total_earned=Sum('total_earned'),
            total_volume_usdt=Sum('total_volume_usdt')
        )
        return {
            'orders_count': stats['orders_count'] or 0,
            'total_earned': stats['total_earned'] or 0,
            'total_volume_usdt': stats['total_volume_usdt'] or 0
        }

    def get_month_stats(self, obj):
        """Статистика за месяц"""
        month_start = date.today() - timedelta(days=30)
        stats = TraderStatistics.objects.filter(
            trader=obj,
            date__gte=month_start
        ).aggregate(
            orders_count=Sum('orders_count'),
            total_earned=Sum('total_earned'),
            total_volume_usdt=Sum('total_volume_usdt')
        )
        return {
            'orders_count': stats['orders_count'] or 0,
            'total_earned': stats['total_earned'] or 0,
            'total_volume_usdt': stats['total_volume_usdt'] or 0
        }


class BlockTraderSerializer(Serializer):
    """Сериализатор для блокировки/разблокировки трейдера"""
    is_blocked = BooleanField()


class TraderOrdersListSerializer(ModelSerializer):
    """Сериализатор для списка заявок трейдера"""
    used_payment_method_info = TraderPaymentMethodSerializer(source='used_payment_method', read_only=True)
    order_type_display = SerializerMethodField()
    status_display = SerializerMethodField()
    trader_payment_info = SerializerMethodField()
    client_payment_info = SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'order_type', 'order_type_display', 'amount_usdt', 'rate',
                 'amount_kzt', 'status', 'status_display', 'client_name',
                 'used_payment_method_info', 'trader_payment_info', 'client_payment_info', 
                 'created_at', 'completed_at', 'notes']

    def get_order_type_display(self, obj):
        return obj.get_order_type_display()
    
    def get_status_display(self, obj):
        return obj.get_status_display()
    
    def get_trader_payment_info(self, obj):
        return obj.trader_payment_info

    def get_client_payment_info(self, obj):
        return obj.client_payment_info


class AssignPaymentMethodToOrderSerializer(Serializer):
    """Сериализатор для назначения реквизитов к заявке трейдером"""
    payment_method_id = CharField()

    def validate_payment_method_id(self, value):
        try:
            payment_method = TraderPaymentMethod.objects.get(
                id=value,
                trader=self.context['request'].user,
                is_active=True
            )
            return payment_method
        except TraderPaymentMethod.DoesNotExist:
            raise ValidationError("Реквизиты не найдены или недоступны")


class AddPaymentMethodToTraderSerializer(Serializer):
    """Сериализатор для добавления реквизитов к существующему трейдеру"""
    trader_id = CharField()
    method_type = ChoiceField(choices=PaymentMethodType.choices)
    
    # Поля для банковской карты
    bank_name = CharField(required=False, allow_blank=True)
    card_number = CharField(required=False, allow_blank=True)
    card_holder_name = CharField(required=False, allow_blank=True)
    
    # Поля для криптокошелька
    wallet_address = CharField(required=False, allow_blank=True)
    crypto_network = CharField(required=False, allow_blank=True)

    def validate_trader_id(self, value):
        try:
            trader = UserAccounts.objects.get(id=value, role=UserRoles.TRADER)
            return trader
        except UserAccounts.DoesNotExist:
            raise ValidationError("Трейдер не найден")

    def validate(self, data):
        method_type = data.get('method_type')
        
        if method_type == PaymentMethodType.CARD:
            required_fields = ['bank_name', 'card_number', 'card_holder_name']
            for field in required_fields:
                if not data.get(field):
                    raise ValidationError(f"Поле {field} обязательно для банковской карты")
        
        elif method_type == PaymentMethodType.CRYPTO_WALLET:
            required_fields = ['wallet_address', 'crypto_network']
            for field in required_fields:
                if not data.get(field):
                    raise ValidationError(f"Поле {field} обязательно для криптокошелька")
        
        return data

    def create(self, validated_data):
        trader = validated_data.pop('trader_id')
        return TraderPaymentMethod.objects.create(trader=trader, **validated_data)


class AdminAnalyticsSerializer(Serializer):
    """Сериализатор для аналитики админа"""
    
    # Общая статистика по сделкам
    total_orders = IntegerField(read_only=True)
    completed_orders = IntegerField(read_only=True)
    cancelled_orders = IntegerField(read_only=True)
    in_progress_orders = IntegerField(read_only=True)
    new_orders = IntegerField(read_only=True)
    success_rate = DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    # Объемы
    total_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_volume_kzt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    completed_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    completed_volume_kzt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    # Статистика по типам сделок
    buy_orders_count = IntegerField(read_only=True)
    sell_orders_count = IntegerField(read_only=True)
    buy_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    sell_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    # Статистика по трейдерам
    total_traders = IntegerField(read_only=True)
    active_traders = IntegerField(read_only=True)
    blocked_traders = IntegerField(read_only=True)
    online_traders = IntegerField(read_only=True)
    
    # Топ трейдеры
    top_traders = ListField(child=DictField(), read_only=True)
    
    # Статистика по периодам
    today_orders = IntegerField(read_only=True)
    month_orders = IntegerField(read_only=True)
    today_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    week_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    month_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)


class TraderAnalyticsSerializer(Serializer):
    """Сериализатор для детальной аналитики по трейдеру"""
    trader_info = UserSerialzier(read_only=True)
    
    # Статистика по сделкам
    total_orders = IntegerField(read_only=True)
    completed_orders = IntegerField(read_only=True)
    cancelled_orders = IntegerField(read_only=True)
    in_progress_orders = IntegerField(read_only=True)
    success_rate = DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    # Объемы
    total_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_volume_kzt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    completed_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    completed_volume_kzt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_commission = DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Статистика по типам сделок
    buy_orders_count = IntegerField(read_only=True)
    sell_orders_count = IntegerField(read_only=True)
    buy_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    sell_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    # Статистика по периодам
    today_stats = DictField(read_only=True)
    week_stats = DictField(read_only=True)
    month_stats = DictField(read_only=True)
    
    # Депозит трейдера
    deposit_amount = DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Активность
    last_order_date = DateTimeField(read_only=True)
    avg_orders_per_day = DecimalField(max_digits=5, decimal_places=2, read_only=True)


class AdminUpdateOrderSerializer(Serializer):
    """Сериализатор для полного обновления заявки администратором"""
    order_type = ChoiceField(choices=OrderType.choices, required=False)
    amount_usdt = DecimalField(max_digits=12, decimal_places=2, required=False)
    rate = DecimalField(max_digits=10, decimal_places=2, required=False)
    status = ChoiceField(choices=OrderStatus.choices, required=False)
    trader_id = CharField(required=False, allow_null=True)
    trader_payment_method_id = CharField(required=False, allow_null=True)
    client_name = CharField(required=False, allow_blank=True)
    notes = CharField(required=False, allow_blank=True)
    commission = DecimalField(max_digits=10, decimal_places=2, required=False)
    
    # Даты
    created_at = DateTimeField(required=False, allow_null=True)
    completed_at = DateTimeField(required=False, allow_null=True)
    
    # Платежные данные клиента
    client_payment_type = ChoiceField(choices=PaymentMethodType.choices, required=False, allow_null=True)
    
    # Для банковской карты клиента
    client_bank_name = CharField(required=False, allow_blank=True, allow_null=True)
    client_card_number = CharField(required=False, allow_blank=True, allow_null=True)
    client_card_holder = CharField(required=False, allow_blank=True, allow_null=True)
    
    # Для криптокошелька клиента
    client_wallet_address = CharField(required=False, allow_blank=True, allow_null=True)
    client_crypto_network = CharField(required=False, allow_blank=True, allow_null=True)

    def validate_trader_id(self, value):
        if value is None:
            return None
        try:
            trader = UserAccounts.objects.get(id=value, role=UserRoles.TRADER)
            if trader.is_blocked:
                raise ValidationError("Трейдер заблокирован")
            return trader
        except UserAccounts.DoesNotExist:
            raise ValidationError("Трейдер не найден")

    def validate_trader_payment_method_id(self, value):
        if value is None:
            return None
        try:
            payment_method = TraderPaymentMethod.objects.get(id=value, is_active=True)
            return payment_method
        except TraderPaymentMethod.DoesNotExist:
            raise ValidationError("Реквизиты трейдера не найдены или неактивны")

    def validate(self, data):
        # Проверяем, что реквизиты трейдера принадлежат выбранному трейдеру
        trader = data.get('trader_id')
        payment_method = data.get('trader_payment_method_id')
        
        if trader and payment_method and payment_method.trader != trader:
            raise ValidationError("Выбранные реквизиты не принадлежат указанному трейдеру")
        
        # Проверяем платежные данные клиента в зависимости от типа
        client_payment_type = data.get('client_payment_type')
        
        if client_payment_type == PaymentMethodType.CARD:
            required_fields = ['client_bank_name', 'client_card_number', 'client_card_holder']
            for field in required_fields:
                if field in data and not data.get(field):
                    raise ValidationError(f"Поле {field} обязательно для банковской карты клиента")
        
        elif client_payment_type == PaymentMethodType.CRYPTO_WALLET:
            required_fields = ['client_wallet_address', 'client_crypto_network']
            for field in required_fields:
                if field in data and not data.get(field):
                    raise ValidationError(f"Поле {field} обязательно для криптокошелька клиента")
        
        # Логическая проверка: при покупке крипты трейдером клиент должен платить картой,
        # при продаже крипты трейдером клиент должен указать кошелек
        order_type = data.get('order_type')
        if order_type and client_payment_type:
            if order_type == OrderType.BUY and client_payment_type != PaymentMethodType.CARD:
                raise ValidationError("При покупке крипты трейдером клиент должен платить банковской картой")
            
            if order_type == OrderType.SELL and client_payment_type != PaymentMethodType.CRYPTO_WALLET:
                raise ValidationError("При продаже крипты трейдером клиент должен указать криптокошелек")
        
        # Проверяем логику дат
        created_at = data.get('created_at')
        completed_at = data.get('completed_at')
        
        if created_at and completed_at and completed_at < created_at:
            raise ValidationError("Дата завершения не может быть раньше даты создания")
        
        return data

    def update(self, instance, validated_data):
        # Извлекаем данные
        trader = validated_data.pop('trader_id', None)
        trader_payment_method = validated_data.pop('trader_payment_method_id', None)
        
        # Обновляем основные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Обновляем трейдера и его реквизиты
        if trader is not None:
            instance.assigned_trader = trader
        
        if trader_payment_method is not None:
            instance.used_payment_method = trader_payment_method
        
        # НЕ устанавливаем completed_at автоматически если оно передано явно
        if 'status' in validated_data and validated_data['status'] == OrderStatus.COMPLETED:
            if 'completed_at' not in validated_data and not instance.completed_at:
                instance.completed_at = timezone.now()
        
        instance.save()
        return instance


class UpdateOnlineStatusSerializer(Serializer):
    """Сериализатор для изменения статуса онлайн трейдера"""
    is_online = BooleanField()

    def update(self, instance, validated_data):
        instance.is_online = validated_data['is_online']
        instance.save()
        return instance


class TraderDetailedStatsSerializer(Serializer):
    """Детальная статистика трейдера по заявкам, комиссии и заработку"""
    
    # Общая статистика по заявкам
    total_orders = IntegerField(read_only=True)
    completed_orders = IntegerField(read_only=True)
    cancelled_orders = IntegerField(read_only=True)
    in_progress_orders = IntegerField(read_only=True)
    new_orders = IntegerField(read_only=True)
    success_rate = DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    # Объемы и заработок
    total_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_volume_kzt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    completed_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    completed_volume_kzt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_commission = DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Статистика по типам заявок
    buy_orders_count = IntegerField(read_only=True)
    sell_orders_count = IntegerField(read_only=True)
    buy_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    sell_volume_usdt = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    buy_commission = DecimalField(max_digits=12, decimal_places=2, read_only=True)
    sell_commission = DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Статистика по периодам
    today_stats = DictField(read_only=True)
    week_stats = DictField(read_only=True)
    month_stats = DictField(read_only=True)
    all_time_stats = DictField(read_only=True)
    
    # Средние показатели
    avg_order_amount = DecimalField(max_digits=12, decimal_places=2, read_only=True)
    avg_commission_per_order = DecimalField(max_digits=10, decimal_places=2, read_only=True)
    avg_orders_per_day = DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    # Информация о трейдере
    trader_info = UserSerialzier(read_only=True)
    deposit_amount = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    registration_date = DateTimeField(read_only=True)
    last_activity = DateTimeField(read_only=True)
    
    # Рейтинг среди трейдеров (по объему)
    volume_rank = IntegerField(read_only=True)
    commission_rank = IntegerField(read_only=True)


class TraderUpdateOrderStatusSerializer(Serializer):
    """Сериализатор для обновления статуса заявки трейдером"""
    status = ChoiceField(choices=[
        (OrderStatus.NEW, 'Новая'),
        (OrderStatus.IN_PROGRESS, 'В обработке'),
        (OrderStatus.COMPLETED, 'Завершена'),
        (OrderStatus.CANCELLED, 'Отменена')
    ])
    notes = CharField(required=False, allow_blank=True)
    commission = DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate_status(self, value):
        """Проверяем, что трейдер может установить только допустимые статусы"""
        allowed_statuses = [OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED, OrderStatus.CANCELLED]
        if value not in allowed_statuses:
            raise ValidationError("Трейдер может устанавливать только статусы: 'в обработке', 'завершена', 'отменена'")
        return value

    def validate(self, data):
        # Если заявка завершается, комиссия должна быть указана
        if data.get('status') == OrderStatus.COMPLETED:
            if not data.get('commission'):
                raise ValidationError("При завершении заявки необходимо указать комиссию")
        return data

    def update(self, instance, validated_data):
        # Проверяем, что заявка назначена текущему трейдеру
        if instance.assigned_trader != self.context['request'].user:
            raise ValidationError("Вы можете обновлять только свои заявки")
        
        # Проверяем текущий статус заявки
        if instance.status == OrderStatus.COMPLETED:
            raise ValidationError("Нельзя изменить статус уже завершенной заявки")
        
        if instance.status == OrderStatus.CANCELLED:
            raise ValidationError("Нельзя изменить статус отмененной заявки")
        
        # Обновляем поля
        instance.status = validated_data['status']
        
        if 'notes' in validated_data:
            instance.notes = validated_data['notes']
            
        if 'commission' in validated_data:
            instance.commission = validated_data['commission']
        
        # Устанавливаем время завершения при завершении заявки
        if instance.status == OrderStatus.COMPLETED:
            instance.completed_at = timezone.now()
        
        instance.save()
        return instance


class OrderMessageSerializer(ModelSerializer):
    sender_info = UserSerialzier(source='sender', read_only=True)

    class Meta:
        model = OrderMessage
        fields = ['id', 'order', 'sender', 'sender_info', 'text', 'created_at']
        read_only_fields = ['id', 'order', 'sender', 'sender_info', 'created_at']


class CreateOrderMessageSerializer(Serializer):
    text = CharField(max_length=2000)

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise ValidationError('Сообщение не может быть пустым')
        return value


class OrderMessageSerializer(ModelSerializer):
    sender_info = UserSerialzier(source='sender', read_only=True)

    class Meta:
        model = OrderMessage
        fields = ['id', 'order', 'sender', 'sender_info', 'text', 'created_at']
        read_only_fields = ['id', 'order', 'sender', 'sender_info', 'created_at']


class CreateOrderMessageSerializer(Serializer):
    text = CharField(max_length=2000)

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise ValidationError('Сообщение не может быть пустым')
        return value