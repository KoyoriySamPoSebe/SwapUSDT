from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import UserAccounts, TraderProfile, Order, TraderStatistics, TraderPaymentMethod


class TraderPaymentMethodInline(admin.TabularInline):
    model = TraderPaymentMethod
    extra = 1
    fields = ('method_type', 'bank_name', 'card_number', 'card_holder_name', 'wallet_address', 'crypto_network', 'is_active')
    fk_name = 'trader'


@admin.register(UserAccounts)
class UserAccountsAdmin(UserAdmin):
    list_display = ('phone', 'first_name', 'last_name', 'role', 'is_active', 'is_blocked', 'created_date')
    list_filter = ('role', 'is_active', 'is_blocked', 'is_confirmed', 'is_online')
    search_fields = ('phone', 'first_name', 'last_name', 'email')
    ordering = ('-id',)
    inlines = [TraderPaymentMethodInline]
    
    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        ('Персональная информация', {'fields': ('first_name', 'last_name', 'patronymic_name', 'email', 'birthday', 'avatar')}),
        ('Права доступа', {'fields': ('role', 'is_active', 'is_confirmed', 'is_blocked', 'is_staff', 'is_superuser', 'is_online')}),
        ('Дополнительно', {'fields': ('in_consideration',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone', 'password1', 'password2', 'role'),
        }),
    )
    
    def created_date(self, obj):
        return obj.date_joined if hasattr(obj, 'date_joined') else None
    created_date.short_description = 'Дата создания'

    def get_inlines(self, request, obj):
        """Показывать inline только для трейдеров"""
        if obj and obj.role == 'trader':
            return [TraderPaymentMethodInline]
        return []


@admin.register(TraderProfile)
class TraderProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'deposit_amount', 'payment_methods_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__first_name', 'user__last_name', 'user__phone')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Трейдер', {'fields': ('user',)}),
        ('Депозит (KZT)', {'fields': ('deposit_amount',)}),
    )

    def payment_methods_count(self, obj):
        return obj.user.payment_methods.count()
    payment_methods_count.short_description = 'Количество реквизитов'


@admin.register(TraderPaymentMethod)
class TraderPaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('trader', 'method_type', 'display_summary', 'is_active', 'created_at')
    list_filter = ('method_type', 'is_active', 'created_at')
    search_fields = ('trader__first_name', 'trader__last_name', 'trader__phone', 'card_number', 'card_holder_name', 'bank_name', 'wallet_address')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Трейдер', {'fields': ('trader',)}),
        ('Тип реквизитов', {'fields': ('method_type',)}),
        ('Банковская карта', {
            'fields': ('bank_name', 'card_number', 'card_holder_name'),
            'classes': ('collapse',)
        }),
        ('Криптокошелек', {
            'fields': ('wallet_address', 'crypto_network'),
            'classes': ('collapse',)
        }),
        ('Статус', {'fields': ('is_active',)}),
    )

    def display_summary(self, obj):
        return obj.display_info
    display_summary.short_description = 'Реквизиты'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_type', 'amount_usdt', 'rate', 'amount_kzt', 'status', 'client_name', 'created_by', 'assigned_trader', 'trader_payment_type', 'client_payment_type', 'created_at')
    list_filter = ('order_type', 'status', 'trader_payment_type', 'client_payment_type', 'created_at')
    search_fields = ('id', 'client_name', 'created_by__first_name', 'created_by__last_name', 'assigned_trader__first_name', 'assigned_trader__last_name')
    ordering = ('-created_at',)
    readonly_fields = ('amount_kzt', 'created_at', 'updated_at', 'completed_at', 'trader_payment_info_display', 'client_payment_info_display', 'payment_info_display')
    
    fieldsets = (
        ('Основная информация', {'fields': ('order_type', 'amount_usdt', 'rate', 'amount_kzt')}),
        ('Клиент', {'fields': ('client_name',)}),
        ('Статус и участники', {'fields': ('status', 'created_by', 'assigned_trader')}),
        ('Используемые реквизиты трейдера', {'fields': ('used_payment_method',)}),
        ('Платежные данные трейдера в сделке', {
            'fields': ('trader_payment_type', 'trader_bank_name', 'trader_card_number', 
                      'trader_card_holder', 'trader_wallet_address', 'trader_crypto_network'),
            'classes': ('collapse',)
        }),
        ('Платежные данные клиента', {
            'fields': ('client_payment_type', 'client_bank_name', 'client_card_number', 
                      'client_card_holder', 'client_wallet_address', 'client_crypto_network'),
            'classes': ('collapse',)
        }),
        ('Информация о платежах', {'fields': ('trader_payment_info_display', 'client_payment_info_display', 'payment_info_display')}),
        ('Дополнительная информация', {'fields': ('commission', 'notes')}),
        ('Временные метки', {'fields': ('created_at', 'updated_at', 'completed_at')}),
    )
    
    def trader_payment_info_display(self, obj):
        return obj.trader_payment_info
    trader_payment_info_display.short_description = 'Реквизиты трейдера'

    def client_payment_info_display(self, obj):
        return obj.client_payment_info
    client_payment_info_display.short_description = 'Реквизиты клиента'
    
    def payment_info_display(self, obj):
        return obj.payment_info
    payment_info_display.short_description = 'Общая информация о платежах'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by', 'assigned_trader', 'used_payment_method')


@admin.register(TraderStatistics)
class TraderStatisticsAdmin(admin.ModelAdmin):
    list_display = ('trader', 'date', 'orders_count', 'total_earned', 'total_volume_usdt')
    list_filter = ('date', 'trader')
    search_fields = ('trader__first_name', 'trader__last_name', 'trader__phone')
    ordering = ('-date', 'trader')
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Трейдер и дата', {'fields': ('trader', 'date')}),
        ('Статистика', {'fields': ('orders_count', 'total_earned', 'total_volume_usdt')}),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('trader')
