from django.contrib.auth.models import update_last_login
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import date, timedelta

from rest_framework.viewsets import GenericViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from utils import BaseCRUD, CustomPagination
from .models import (
    UserAccounts, TraderProfile, Order, TraderStatistics, TraderPaymentMethod,
    UserRoles, OrderStatus, OrderType, OrderMessage, SupportMessage,
    ExchangeRate, PaymentMethodType
)
from .serializer import (
    LoginSerializer, RegisterSeialzier, UserSerialzier, RefreshTokenSerialzierPost, UserUpdateSerializer,
    CreateTraderSerializer, TraderProfileSerializer, OrderSerializer, CreateOrderSerializer,
    UpdateOrderStatusSerializer, TraderDashboardSerializer, BlockTraderSerializer,
    TraderOrdersListSerializer, TraderStatisticsSerializer, TraderPaymentMethodSerializer,
    CreatePaymentMethodSerializer, AssignPaymentMethodToOrderSerializer, AddPaymentMethodToTraderSerializer,
    CreateOrderForTraderSerializer, AdminAnalyticsSerializer, TraderAnalyticsSerializer,
    AdminUpdateOrderSerializer, UpdateOnlineStatusSerializer, TraderDetailedStatsSerializer,
    TraderUpdateOrderStatusSerializer, OrderMessageSerializer, CreateOrderMessageSerializer,
    SupportMessageSerializer, CreateSupportMessageSerializer, SupportReplySerializer,
    SupportThreadSerializer, TraderRegisterSerializer
)


# Permissions
class IsAdminUser(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == UserRoles.ADMIN


class IsTraderUser(IsAuthenticated):
    def has_permission(self, request, view):
        return (super().has_permission(request, view) and 
                request.user.role == UserRoles.TRADER and 
                not request.user.is_blocked)


class UserBaseViewSet(BaseCRUD):
    permission_classes = [AllowAny]
    serializer_class = UserSerialzier
    pagination_class = CustomPagination

    _model = UserAccounts
    _serializer = serializer_class
    _serializer_update = UserUpdateSerializer

    @swagger_auto_schema(
        request_body=RegisterSeialzier,
        responses={200: UserSerialzier, 400: 'Bad Request'},
        operation_summary="Create New User Account",
        operation_description="This endpoint created new user account.",
        tags=["AUTH"]
    )
    def create(self, request):
        serializer = RegisterSeialzier(data=request.data)
        if serializer.is_valid():
            user = UserAccounts.objects.create_user(
                phone=serializer.data['phone'],
                password=serializer.data['password']
            )

            user.first_name = serializer.data['first_name']
            user.last_name = serializer.data['last_name']
            user.patronymic_name = serializer.data['patronymic_name']
            user.birthday = serializer.data['birthday']
            user.email = serializer.data['email']
            user.is_active = True
            user.is_confirmed = True
            user.in_consideration = True
            user.save()

            serialzier = self._serializer(user)
            return Response(serialzier.data, 200)
        else:
            return Response(serializer.errors, 400)

    @swagger_auto_schema(
        request_body=LoginSerializer,
        responses={200: UserSerialzier, 400: 'Bad Request'},
        operation_summary="Login User",
        operation_description="This endpoint login user account.",
        tags=["AUTH"]
    )
    def login(self, request):
        serialzier = LoginSerializer(data=request.data)
        if serialzier.is_valid():
            from .phone_utils import normalize_phone
            phone_normalized = normalize_phone(serialzier.data['phone'])
            try:
                user = UserAccounts.objects.get(phone=phone_normalized)
                if not user.check_password(serialzier.data['password']):
                    return Response({"message": 'Invalid credentials'}, 400)
                if user.is_blocked:
                    return Response({"message": 'Account is blocked'}, 403)
            except UserAccounts.DoesNotExist:
                return Response({"message": 'This user not found in system'}, 400)

            refresh = RefreshToken.for_user(user)
            data = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'in_moderation': user.in_consideration,
                'id_user': user.id,
                'role': user.role,
            }
            update_last_login(None, user)
            return Response(data, 200)
        else:
            return Response(serialzier.errors, 400)

    @swagger_auto_schema(
        responses={200: UserSerialzier, 400: 'Bad Request'},
        operation_summary="Get info User Account",
        operation_description="This endpoint geting info user account.",
        tags=["User"]
    )
    def me(self, request):
        try:
            user = UserAccounts.objects.get(id=request.user.id)
        except:
            return Response({"message": "This user not found system"}, 404)

        serialzier = UserSerialzier(user)
        return Response(serialzier.data)

    @swagger_auto_schema(
        request_body=UserUpdateSerializer,
        responses={200: UserSerialzier, 400: 'Bad Request'},
        operation_summary="Update data User Account",
        operation_description="This endpoint updated user account.",
        tags=["User"]
    )
    def update(self, request, id):
        if request.user.id == id:
            return super().update(request, id)
        else:
            return Response({"message": 'User is not authorized'}, 403)
        

class RefreshViewSet(GenericViewSet):
    serializer_class = TokenRefreshSerializer

    @swagger_auto_schema(
        request_body=RefreshTokenSerialzierPost,
        responses={200: TokenRefreshSerializer, 400: 'Bad Request'},
        operation_summary="Refresh JWT Token",
        operation_description="This endpoint refresh JWT token.",
        tags=["AUTH"]
    )
    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)

        if serializer.is_valid():
            return Response(serializer.validated_data, 200)
        else:
            return Response(serializer.errors, 400)


# Новые ViewSets для криптообмена

class AdminViewSet(GenericViewSet):
    """ViewSet для функций администратора"""
    permission_classes = [IsAdminUser]
    
    @swagger_auto_schema(
        request_body=CreateTraderSerializer,
        responses={201: UserSerialzier},
        operation_summary="Создать трейдера",
        operation_description="Создание нового аккаунта трейдера администратором с депозитом",
        tags=["Admin"]
    )
    @action(methods=['post'], detail=False, url_path='create-trader')
    def create_trader(self, request):
        serializer = CreateTraderSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerialzier(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        request_body=AddPaymentMethodToTraderSerializer,
        responses={201: TraderPaymentMethodSerializer},
        operation_summary="Добавить способ оплаты трейдеру",
        operation_description="Добавление способа оплаты к существующему трейдеру",
        tags=["Admin"]
    )
    @action(methods=['post'], detail=False, url_path='add-payment-method')
    def add_payment_method_to_trader(self, request):
        serializer = AddPaymentMethodToTraderSerializer(data=request.data)
        if serializer.is_valid():
            payment_method = serializer.save()
            return Response(
                TraderPaymentMethodSerializer(payment_method).data, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        responses={200: TraderProfileSerializer(many=True)},
        operation_summary="Список всех трейдеров",
        operation_description="Получить список всех трейдеров с их профилями и реквизитами",
        tags=["Admin"]
    )
    @action(methods=['get'], detail=False, url_path='traders')
    def list_traders(self, request):
        traders = TraderProfile.objects.select_related('user').prefetch_related('user__payment_methods').all()
        serializer = TraderProfileSerializer(traders, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'query', 
                openapi.IN_QUERY, 
                description="Поисковый запрос по ФИО (имя, фамилия или отчество)", 
                type=openapi.TYPE_STRING,
                required=True
            ),
        ],
        responses={200: TraderProfileSerializer(many=True)},
        operation_summary="Поиск трейдеров по ФИО",
        operation_description="Поиск трейдеров по частичному совпадению имени, фамилии или отчества",
        tags=["Admin"]
    )
    @action(methods=['get'], detail=False, url_path='search-traders')
    def search_traders(self, request):
        query = request.query_params.get('query', '').strip()
        
        if not query:
            return Response({"message": "Параметр 'query' обязателен"}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(query) < 2:
            return Response({"message": "Минимальная длина поискового запроса 2 символа"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Поиск по вхождению в имя, фамилию или отчество (регистронезависимый)
        traders = TraderProfile.objects.select_related('user').prefetch_related('user__payment_methods').filter(
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query) |
            Q(user__patronymic_name__icontains=query)
        )[:20]  # Ограничиваем результат 20 записями
        
        serializer = TraderProfileSerializer(traders, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        responses={204: 'No Content'},
        operation_summary="Удалить способ оплаты",
        operation_description="Полное удаление способа оплаты из системы",
        tags=["Admin"]
    )
    @action(methods=['delete'], detail=True, url_path='delete-payment-method')
    def delete_payment_method(self, request, pk=None):
        try:
            payment_method = TraderPaymentMethod.objects.get(id=pk)
        except TraderPaymentMethod.DoesNotExist:
            return Response({"message": "Способ оплаты не найден"}, status=status.HTTP_404_NOT_FOUND)
        
        # Проверяем, не используется ли этот способ оплаты в активных заявках
        active_orders = Order.objects.filter(
            used_payment_method=payment_method,
            status__in=[OrderStatus.NEW, OrderStatus.IN_PROGRESS]
        ).exists()
        
        if active_orders:
            return Response(
                {"message": "Нельзя удалить способ оплаты, который используется в активных заявках"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payment_method.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'is_active': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Статус активности способа оплаты')
            },
            required=['is_active']
        ),
        responses={200: TraderPaymentMethodSerializer},
        operation_summary="Активировать/деактивировать способ оплаты",
        operation_description="Изменение статуса активности способа оплаты (не удаляет, но делает недоступным для использования)",
        tags=["Admin"]
    )
    @action(methods=['patch'], detail=True, url_path='toggle-payment-method')
    def toggle_payment_method(self, request, pk=None):
        try:
            payment_method = TraderPaymentMethod.objects.get(id=pk)
        except TraderPaymentMethod.DoesNotExist:
            return Response({"message": "Способ оплаты не найден"}, status=status.HTTP_404_NOT_FOUND)
        
        is_active = request.data.get('is_active')
        if is_active is None:
            return Response({"message": "Поле 'is_active' обязательно"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Если деактивируем способ оплаты, проверяем активные заявки
        if not is_active:
            active_orders = Order.objects.filter(
                used_payment_method=payment_method,
                status__in=[OrderStatus.NEW, OrderStatus.IN_PROGRESS]
            ).exists()
            
            if active_orders:
                return Response(
                    {"message": "Нельзя деактивировать способ оплаты, который используется в активных заявках"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        payment_method.is_active = is_active
        payment_method.save()
        
        return Response(TraderPaymentMethodSerializer(payment_method).data)

    @swagger_auto_schema(
        request_body=BlockTraderSerializer,
        responses={200: UserSerialzier},
        operation_summary="Заблокировать/разблокировать трейдера",
        operation_description="Блокировка или разблокировка аккаунта трейдера",
        tags=["Admin"]
    )
    @action(methods=['patch'], detail=True, url_path='block-trader')
    def block_trader(self, request, pk=None):
        try:
            trader = UserAccounts.objects.get(id=pk, role=UserRoles.TRADER)
        except UserAccounts.DoesNotExist:
            return Response({"message": "Трейдер не найден"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = BlockTraderSerializer(data=request.data)
        if serializer.is_valid():
            trader.is_blocked = serializer.validated_data['is_blocked']
            trader.save()
            return Response(UserSerialzier(trader).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        responses={200: AdminAnalyticsSerializer},
        operation_summary="Получить аналитику администратора",
        operation_description="Получить общую статистику по всем трейдерам и сделкам",
        tags=["Admin"]
    )
    @action(methods=['get'], detail=False, url_path='analytics')
    def get_analytics(self, request):
        from django.db.models import Sum, Count, Q, Avg
        from django.utils import timezone
        from datetime import timedelta, date
        from decimal import Decimal
        
        # Текущая дата и периоды
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Общая статистика по заявкам
        total_orders = Order.objects.count()
        completed_orders = Order.objects.filter(status=OrderStatus.COMPLETED).count()
        cancelled_orders = Order.objects.filter(status=OrderStatus.CANCELLED).count()
        in_progress_orders = Order.objects.filter(status=OrderStatus.IN_PROGRESS).count()
        new_orders = Order.objects.filter(status=OrderStatus.NEW).count()
        
        # Процент успешных сделок
        success_rate = Decimal('0')
        if total_orders > 0:
            success_rate = (Decimal(completed_orders) / Decimal(total_orders)) * Decimal('100')
        
        # Общие объемы
        volume_stats = Order.objects.aggregate(
            total_volume_usdt=Sum('amount_usdt'),
            total_volume_kzt=Sum('amount_kzt')
        )
        total_volume_usdt = volume_stats['total_volume_usdt'] or Decimal('0')
        total_volume_kzt = volume_stats['total_volume_kzt'] or Decimal('0')
        
        # Объемы завершенных сделок
        completed_volume_stats = Order.objects.filter(status=OrderStatus.COMPLETED).aggregate(
            completed_volume_usdt=Sum('amount_usdt'),
            completed_volume_kzt=Sum('amount_kzt')
        )
        completed_volume_usdt = completed_volume_stats['completed_volume_usdt'] or Decimal('0')
        completed_volume_kzt = completed_volume_stats['completed_volume_kzt'] or Decimal('0')
        
        # Статистика по типам сделок
        buy_stats = Order.objects.filter(order_type=OrderType.BUY).aggregate(
            count=Count('id'),
            volume=Sum('amount_usdt')
        )
        sell_stats = Order.objects.filter(order_type=OrderType.SELL).aggregate(
            count=Count('id'),
            volume=Sum('amount_usdt')
        )
        
        buy_orders_count = buy_stats['count'] or 0
        sell_orders_count = sell_stats['count'] or 0
        buy_volume_usdt = buy_stats['volume'] or Decimal('0')
        sell_volume_usdt = sell_stats['volume'] or Decimal('0')
        
        # Статистика по трейдерам
        total_traders = UserAccounts.objects.filter(role=UserRoles.TRADER).count()
        active_traders = UserAccounts.objects.filter(role=UserRoles.TRADER, is_blocked=False).count()
        blocked_traders = UserAccounts.objects.filter(role=UserRoles.TRADER, is_blocked=True).count()
        online_traders = UserAccounts.objects.filter(role=UserRoles.TRADER, is_online=True).count()
        
        # Топ трейдеры по объему за месяц
        top_traders_data = []
        traders_stats = Order.objects.filter(
            assigned_trader__role=UserRoles.TRADER,
            status=OrderStatus.COMPLETED,
            created_at__date__gte=month_ago
        ).values(
            'assigned_trader__id',
            'assigned_trader__first_name',
            'assigned_trader__last_name',
            'assigned_trader__phone'
        ).annotate(
            orders_count=Count('id'),
            total_volume=Sum('amount_usdt'),
            total_commission=Sum('commission')
        ).order_by('-total_volume')[:10]
        
        for trader_stat in traders_stats:
            trader_info = {
                'trader_id': trader_stat['assigned_trader__id'],
                'name': f"{trader_stat['assigned_trader__first_name']} {trader_stat['assigned_trader__last_name']}",
                'phone': trader_stat['assigned_trader__phone'],
                'orders_count': trader_stat['orders_count'],
                'total_volume_usdt': trader_stat['total_volume'] or Decimal('0'),
                'total_commission': trader_stat['total_commission'] or Decimal('0')
            }
            top_traders_data.append(trader_info)
        
        # Статистика по периодам
        today_stats = Order.objects.filter(created_at__date=today).aggregate(
            count=Count('id'),
            volume=Sum('amount_usdt')
        )
        week_stats = Order.objects.filter(created_at__date__gte=week_ago).aggregate(
            count=Count('id'),
            volume=Sum('amount_usdt')
        )
        month_stats = Order.objects.filter(created_at__date__gte=month_ago).aggregate(
            count=Count('id'),
            volume=Sum('amount_usdt')
        )
        
        today_orders = today_stats['count'] or 0
        month_orders = month_stats['count'] or 0
        today_volume_usdt = today_stats['volume'] or Decimal('0')
        week_volume_usdt = week_stats['volume'] or Decimal('0')
        month_volume_usdt = month_stats['volume'] or Decimal('0')
        
        analytics_data = {
            # Общая статистика по сделкам
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            'in_progress_orders': in_progress_orders,
            'new_orders': new_orders,
            'success_rate': success_rate,
            
            # Объемы
            'total_volume_usdt': total_volume_usdt,
            'total_volume_kzt': total_volume_kzt,
            'completed_volume_usdt': completed_volume_usdt,
            'completed_volume_kzt': completed_volume_kzt,
            
            # Статистика по типам сделок
            'buy_orders_count': buy_orders_count,
            'sell_orders_count': sell_orders_count,
            'buy_volume_usdt': buy_volume_usdt,
            'sell_volume_usdt': sell_volume_usdt,
            
            # Статистика по трейдерам
            'total_traders': total_traders,
            'active_traders': active_traders,
            'blocked_traders': blocked_traders,
            'online_traders': online_traders,
            'top_traders': top_traders_data,
            
            # Статистика по периодам
            'today_orders': today_orders,
            'month_orders': month_orders,
            'today_volume_usdt': today_volume_usdt,
            'week_volume_usdt': week_volume_usdt,
            'month_volume_usdt': month_volume_usdt,
        }
        
        return Response(AdminAnalyticsSerializer(analytics_data).data)

    @swagger_auto_schema(
        responses={200: TraderAnalyticsSerializer(many=True)},
        operation_summary="Получить детальную аналитику по трейдерам",
        operation_description="Получить подробную статистику по каждому трейдеру",
        tags=["Admin"]
    )
    @action(methods=['get'], detail=False, url_path='traders-analytics')
    def get_traders_analytics(self, request):
        from django.db.models import Sum, Count, Q, Avg
        from django.utils import timezone
        from datetime import timedelta, date
        from decimal import Decimal
        
        # Текущая дата и периоды
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        traders = UserAccounts.objects.filter(role=UserRoles.TRADER).prefetch_related('trader_profile')
        traders_analytics = []
        
        for trader in traders:
            # Общая статистика по заявкам трейдера
            trader_orders = Order.objects.filter(assigned_trader=trader)
            
            total_orders = trader_orders.count()
            completed_orders = trader_orders.filter(status=OrderStatus.COMPLETED).count()
            cancelled_orders = trader_orders.filter(status=OrderStatus.CANCELLED).count()
            in_progress_orders = trader_orders.filter(status=OrderStatus.IN_PROGRESS).count()
            
            # Процент успешных сделок
            success_rate = Decimal('0')
            if total_orders > 0:
                success_rate = (Decimal(completed_orders) / Decimal(total_orders)) * Decimal('100')
            
            # Объемы
            volume_stats = trader_orders.aggregate(
                total_volume_usdt=Sum('amount_usdt'),
                total_volume_kzt=Sum('amount_kzt'),
                total_commission=Sum('commission')
            )
            
            completed_volume_stats = trader_orders.filter(status=OrderStatus.COMPLETED).aggregate(
                completed_volume_usdt=Sum('amount_usdt'),
                completed_volume_kzt=Sum('amount_kzt')
            )
            
            # Статистика по типам сделок
            buy_stats = trader_orders.filter(order_type=OrderType.BUY).aggregate(
                count=Count('id'),
                volume=Sum('amount_usdt')
            )
            sell_stats = trader_orders.filter(order_type=OrderType.SELL).aggregate(
                count=Count('id'),
                volume=Sum('amount_usdt')
            )
            
            # Статистика по периодам
            today_stats = trader_orders.filter(created_at__date=today).aggregate(
                count=Count('id'),
                volume=Sum('amount_usdt'),
                commission=Sum('commission')
            )
            week_stats = trader_orders.filter(created_at__date__gte=week_ago).aggregate(
                count=Count('id'),
                volume=Sum('amount_usdt'),
                commission=Sum('commission')
            )
            month_stats = trader_orders.filter(created_at__date__gte=month_ago).aggregate(
                count=Count('id'),
                volume=Sum('amount_usdt'),
                commission=Sum('commission')
            )
            
            # Депозит трейдера
            deposit_amount = Decimal('0')
            if hasattr(trader, 'trader_profile'):
                deposit_amount = trader.trader_profile.deposit_amount or Decimal('0')
            
            # Последняя активность
            last_order = trader_orders.order_by('-created_at').first()
            last_order_date = last_order.created_at if last_order else None
            
            # Среднее количество заявок в день
            avg_orders_per_day = Decimal('0')
            if last_order_date:
                days_active = (timezone.now().date() - last_order_date.date()).days + 1
                if days_active > 0:
                    avg_orders_per_day = Decimal(total_orders) / Decimal(days_active)
            
            trader_analytics = {
                'trader_info': trader,
                'total_orders': total_orders,
                'completed_orders': completed_orders,
                'cancelled_orders': cancelled_orders,
                'in_progress_orders': in_progress_orders,
                'success_rate': success_rate,
                'total_volume_usdt': volume_stats['total_volume_usdt'] or Decimal('0'),
                'total_volume_kzt': volume_stats['total_volume_kzt'] or Decimal('0'),
                'completed_volume_usdt': completed_volume_stats['completed_volume_usdt'] or Decimal('0'),
                'completed_volume_kzt': completed_volume_stats['completed_volume_kzt'] or Decimal('0'),
                'total_commission': volume_stats['total_commission'] or Decimal('0'),
                'buy_orders_count': buy_stats['count'] or 0,
                'sell_orders_count': sell_stats['count'] or 0,
                'buy_volume_usdt': buy_stats['volume'] or Decimal('0'),
                'sell_volume_usdt': sell_stats['volume'] or Decimal('0'),
                'today_stats': {
                    'orders_count': today_stats['count'] or 0,
                    'volume_usdt': today_stats['volume'] or Decimal('0'),
                    'commission': today_stats['commission'] or Decimal('0')
                },
                'week_stats': {
                    'orders_count': week_stats['count'] or 0,
                    'volume_usdt': week_stats['volume'] or Decimal('0'),
                    'commission': week_stats['commission'] or Decimal('0')
                },
                'month_stats': {
                    'orders_count': month_stats['count'] or 0,
                    'volume_usdt': month_stats['volume'] or Decimal('0'),
                    'commission': month_stats['commission'] or Decimal('0')
                },
                'deposit_amount': deposit_amount,
                'last_order_date': last_order_date,
                'avg_orders_per_day': avg_orders_per_day
            }
            
            traders_analytics.append(trader_analytics)
        
        return Response(TraderAnalyticsSerializer(traders_analytics, many=True).data)

    @action(methods=['get'], detail=False, url_path='export-orders')
    def export_orders(self, request):
        """Выгрузка заявок в CSV"""
        import csv
        from django.http import HttpResponse

        fmt = request.query_params.get('format', 'csv')
        orders = Order.objects.select_related('created_by', 'assigned_trader').order_by('-created_at')

        if fmt == 'csv':
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="orders_export.csv"'
            response.write('\ufeff')

            writer = csv.writer(response, delimiter=';')
            writer.writerow([
                'ID', 'Тип', 'Сумма USDT', 'Курс', 'Сумма KZT', 'Статус',
                'Клиент', 'Трейдер', 'Комиссия', 'Создана', 'Завершена', 'Примечания'
            ])

            for order in orders:
                client_name = ''
                if order.created_by:
                    client_name = f"{order.created_by.first_name} {order.created_by.last_name}"
                elif order.client_name:
                    client_name = order.client_name

                trader_name = ''
                if order.assigned_trader:
                    trader_name = f"{order.assigned_trader.first_name} {order.assigned_trader.last_name}"

                writer.writerow([
                    str(order.id)[:8],
                    order.get_order_type_display(),
                    str(order.amount_usdt),
                    str(order.rate),
                    str(order.amount_kzt),
                    order.get_status_display(),
                    client_name,
                    trader_name,
                    str(order.commission),
                    order.created_at.strftime('%d.%m.%Y %H:%M') if order.created_at else '',
                    order.completed_at.strftime('%d.%m.%Y %H:%M') if order.completed_at else '',
                    order.notes or '',
                ])

            return response

        return Response({'message': 'Формат не поддерживается'}, status=status.HTTP_400_BAD_REQUEST)


class OrderViewSet(GenericViewSet):
    """ViewSet для управления заявками"""
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Права доступа для разных операций
        """
        if self.action in ['create', 'list_all', 'create_order_for_trader', 'admin_update']:
            permission_classes = [IsAdminUser]
        elif self.action in ['update_status', 'assign_payment_method', 'list_trader_orders', 'update_trader_order_status']:
            permission_classes = [IsTraderUser]
        elif self.action in ['create_self_order']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['list_messages', 'send_message']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    @swagger_auto_schema(
        request_body=CreateOrderSerializer,
        responses={201: OrderSerializer},
        operation_summary="Создать заявку (простая)",
        operation_description="Создание новой заявки на покупку/продажу USDT без назначения трейдера (только админ)",
        tags=["Orders"]
    )
    def create(self, request):
        serializer = CreateOrderSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            order = serializer.save()
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        request_body=CreateOrderForTraderSerializer,
        responses={201: OrderSerializer},
        operation_summary="Создать заявку для трейдера",
        operation_description="Создание заявки с назначением трейдера, его реквизитов и платежных данных клиента (только админ)",
        tags=["Orders"]
    )
    @action(methods=['post'], detail=False, url_path='create-for-trader')
    def create_order_for_trader(self, request):
        serializer = CreateOrderForTraderSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            order = serializer.save()
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['post'], detail=False, url_path='create-self')
    def create_self_order(self, request):
        """Создание заявки трейдером/клиентом"""
        from decimal import Decimal
        data = request.data
        order_type = data.get('order_type')
        amount_usdt = data.get('amount_usdt')
        rate = data.get('rate')

        if not order_type or not amount_usdt or not rate:
            return Response({'message': 'Укажите тип, сумму и курс'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_usdt = Decimal(str(amount_usdt))
            rate = Decimal(str(rate))
        except Exception:
            return Response({'message': 'Некорректная сумма или курс'}, status=status.HTTP_400_BAD_REQUEST)

        if amount_usdt <= 0:
            return Response({'message': 'Сумма должна быть больше 0'}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = None
        payment_method_id = data.get('payment_method_id')
        if payment_method_id:
            try:
                payment_method = TraderPaymentMethod.objects.get(id=payment_method_id, trader=request.user)
            except TraderPaymentMethod.DoesNotExist:
                pass

        order = Order.objects.create(
            order_type=order_type,
            amount_usdt=amount_usdt,
            rate=rate,
            amount_kzt=amount_usdt * rate,
            created_by=request.user,
            client_name=f"{request.user.first_name} {request.user.last_name}",
            notes=data.get('notes', ''),
        )

        if payment_method:
            if payment_method.method_type == PaymentMethodType.CARD:
                order.client_payment_type = PaymentMethodType.CARD
                order.client_bank_name = payment_method.bank_name
                order.client_card_number = payment_method.card_number
                order.client_card_holder = payment_method.card_holder_name
            else:
                order.client_payment_type = PaymentMethodType.CRYPTO_WALLET
                order.client_wallet_address = payment_method.wallet_address
                order.client_crypto_network = payment_method.crypto_network
            order.save()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        responses={200: OrderSerializer(many=True)},
        operation_summary="Список всех заявок",
        operation_description="Получить список всех заявок (только админ)",
        tags=["Orders"]
    )
    @action(methods=['get'], detail=False, url_path='all')
    def list_all(self, request):
        orders = Order.objects.select_related('created_by', 'assigned_trader', 'used_payment_method').all()
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        request_body=UpdateOrderStatusSerializer,
        responses={200: OrderSerializer},
        operation_summary="Обновить статус заявки",
        operation_description="Обновление статуса заявки и назначение трейдера (только админ)",
        tags=["Orders"]
    )
    @action(methods=['patch'], detail=True, url_path='update-status')
    def update_status(self, request, pk=None):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response({"message": "Заявка не найдена"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UpdateOrderStatusSerializer(data=request.data)
        if serializer.is_valid():
            order.status = serializer.validated_data['status']
            
            if 'assigned_trader' in serializer.validated_data:
                order.assigned_trader = serializer.validated_data['assigned_trader']
                
            if 'used_payment_method' in serializer.validated_data:
                order.used_payment_method = serializer.validated_data['used_payment_method']
                
            if 'notes' in serializer.validated_data:
                order.notes = serializer.validated_data['notes']
                
            if 'commission' in serializer.validated_data:
                order.commission = serializer.validated_data['commission']
                
            order.save()
            
            # Обновляем статистику трейдера при завершении заявки
            if order.status == OrderStatus.COMPLETED and order.assigned_trader:
                self._update_trader_statistics(order)
                
            return Response(OrderSerializer(order).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        request_body=AdminUpdateOrderSerializer,
        responses={200: OrderSerializer},
        operation_summary="Обновить заявку (админ)",
        operation_description="Полное обновление заявки администратором по всем параметрам",
        tags=["Orders"]
    )
    @action(methods=['patch'], detail=True, url_path='admin-update')
    def admin_update(self, request, pk=None):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response({"message": "Заявка не найдена"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = AdminUpdateOrderSerializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            updated_order = serializer.save()
            
            # Обновляем статистику трейдера при завершении заявки
            if updated_order.status == OrderStatus.COMPLETED and updated_order.assigned_trader:
                self._update_trader_statistics(updated_order)
                
            return Response(OrderSerializer(updated_order).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        request_body=TraderUpdateOrderStatusSerializer,
        responses={200: OrderSerializer},
        operation_summary="Обновить статус заявки трейдером",
        operation_description="Трейдер обновляет статус своей заявки",
        tags=["Orders"]
    )
    @action(methods=['patch'], detail=True, url_path='update-trader-status')
    def update_trader_order_status(self, request, pk=None):
        try:
            order = Order.objects.get(
                Q(assigned_trader=request.user) | Q(assigned_trader__isnull=True, status=OrderStatus.NEW),
                id=pk
            )
        except Order.DoesNotExist:
            return Response({"message": "Заявка не найдена или не назначена вам"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        if not order.assigned_trader:
            order.assigned_trader = request.user

        serializer = TraderUpdateOrderStatusSerializer(order, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated_order = serializer.save()
            
            if updated_order.status == OrderStatus.COMPLETED and updated_order.assigned_trader:
                self._update_trader_statistics(updated_order)
                
            return Response(OrderSerializer(updated_order).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('status', openapi.IN_QUERY, description="Фильтр по статусу заявки", type=openapi.TYPE_STRING),
        ],
        responses={200: TraderOrdersListSerializer(many=True)},
        operation_summary="Заявки для трейдера",
        operation_description="Получить список заявок доступных трейдеру",
        tags=["Trader"]
    )
    @action(methods=['get'], detail=False, url_path='trader-orders')
    def list_trader_orders(self, request):
        status_filter = request.query_params.get('status', None)
        
        # Трейдер видит новые заявки и свои назначенные заявки
        orders = Order.objects.filter(
            Q(status=OrderStatus.NEW) | Q(assigned_trader=request.user)
        ).select_related('created_by', 'used_payment_method').order_by('-created_at')
        
        if status_filter:
            orders = orders.filter(status=status_filter)
            
        serializer = TraderOrdersListSerializer(orders, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        request_body=AssignPaymentMethodToOrderSerializer,
        responses={200: OrderSerializer},
        operation_summary="Назначить реквизиты к заявке",
        operation_description="Трейдер назначает свои реквизиты к заявке",
        tags=["Trader"]
    )
    @action(methods=['patch'], detail=True, url_path='assign-payment-method')
    def assign_payment_method(self, request, pk=None):
        try:
            order = Order.objects.get(id=pk, assigned_trader=request.user)
        except Order.DoesNotExist:
            return Response({"message": "Заявка не найдена или не назначена вам"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        serializer = AssignPaymentMethodToOrderSerializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            payment_method = serializer.validated_data['payment_method_id']
            order.used_payment_method = payment_method
            order.save()
            
            return Response(OrderSerializer(order).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _can_access_order_chat(self, user, order):
        if user.role == UserRoles.ADMIN:
            return True
        if user.role == UserRoles.TRADER and not user.is_blocked:
            if order.assigned_trader_id == user.id:
                return True
            if order.status == OrderStatus.NEW:
                return True
        return False

    @swagger_auto_schema(
        responses={200: OrderMessageSerializer(many=True)},
        operation_summary="Сообщения чата заявки",
        tags=["Orders"]
    )
    @action(methods=['get'], detail=True, url_path='messages')
    def list_messages(self, request, pk=None):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response({"message": "Заявка не найдена"}, status=status.HTTP_404_NOT_FOUND)

        if not self._can_access_order_chat(request.user, order):
            return Response({"message": "Нет доступа к чату этой заявки"}, status=status.HTTP_403_FORBIDDEN)

        messages = OrderMessage.objects.filter(order=order).select_related('sender')
        serializer = OrderMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    @swagger_auto_schema(
        request_body=CreateOrderMessageSerializer,
        responses={201: OrderMessageSerializer},
        operation_summary="Отправить сообщение в чат заявки",
        tags=["Orders"]
    )
    @action(methods=['post'], detail=True, url_path='messages/send')
    def send_message(self, request, pk=None):
        from django.conf import settings as django_settings
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response({"message": "Заявка не найдена"}, status=status.HTTP_404_NOT_FOUND)

        if not self._can_access_order_chat(request.user, order):
            return Response({"message": "Нет доступа к чату этой заявки"}, status=status.HTTP_403_FORBIDDEN)

        text = request.data.get('text', '').strip()
        image = request.FILES.get('image')

        if not text and not image:
            return Response({"message": "Сообщение должно содержать текст или изображение"}, status=status.HTTP_400_BAD_REQUEST)

        if image:
            allowed_types = ['image/jpeg', 'image/png', 'image/webp']
            if image.content_type not in allowed_types:
                return Response({"message": "Допустимые форматы: JPEG, PNG, WebP"}, status=status.HTTP_400_BAD_REQUEST)
            if image.size > 5 * 1024 * 1024:
                return Response({"message": "Максимальный размер файла 5 МБ"}, status=status.HTTP_400_BAD_REQUEST)

        sender = order.created_by if request.user.role == UserRoles.ADMIN else request.user
        message = OrderMessage.objects.create(
            order=order,
            sender=sender,
            text=text,
            image=image,
        )
        return Response(OrderMessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def _update_trader_statistics(self, order):
        """Обновление статистики трейдера"""
        today = date.today()
        stats, created = TraderStatistics.objects.get_or_create(
            trader=order.assigned_trader,
            date=today,
            defaults={
                'orders_count': 0,
                'total_earned': 0,
                'total_volume_usdt': 0
            }
        )
        
        stats.orders_count += 1
        stats.total_earned += order.commission
        stats.total_volume_usdt += order.amount_usdt
        stats.save()


class TraderViewSet(GenericViewSet):
    """ViewSet для функций трейдера"""
    permission_classes = [IsTraderUser]
    
    @swagger_auto_schema(
        responses={200: TraderDashboardSerializer},
        operation_summary="Дашборд трейдера",
        operation_description="Получить статистику трейдера (день/неделя/месяц)",
        tags=["Trader"]
    )
    @action(methods=['get'], detail=False, url_path='dashboard')
    def dashboard(self, request):
        trader = request.user
        today = date.today()
        
        # Получаем статистику за сегодня
        today_stats, created = TraderStatistics.objects.get_or_create(
            trader=trader,
            date=today,
            defaults={
                'orders_count': 0,
                'total_earned': 0,
                'total_volume_usdt': 0
            }
        )
        
        # Формируем данные для дашборда
        dashboard_data = {
            'today_stats': today_stats,
            'trader_profile': getattr(trader, 'trader_profile', None)
        }
        
        serializer = TraderDashboardSerializer(trader, context={'dashboard_data': dashboard_data})
        return Response(serializer.data)

    @swagger_auto_schema(
        responses={200: TraderProfileSerializer},
        operation_summary="Профиль трейдера",
        operation_description="Получить профиль текущего трейдера с реквизитами",
        tags=["Trader"]
    )
    @action(methods=['get'], detail=False, url_path='profile')
    def profile(self, request):
        try:
            profile = TraderProfile.objects.prefetch_related('user__payment_methods').get(user=request.user)
            serializer = TraderProfileSerializer(profile)
            return Response(serializer.data)
        except TraderProfile.DoesNotExist:
            return Response({"message": "Профиль трейдера не найден"}, 
                          status=status.HTTP_404_NOT_FOUND)

    @swagger_auto_schema(
        responses={200: TraderPaymentMethodSerializer(many=True)},
        operation_summary="Реквизиты трейдера",
        operation_description="Получить все реквизиты текущего трейдера",
        tags=["Trader"]
    )
    @action(methods=['get'], detail=False, url_path='payment-methods')
    def payment_methods(self, request):
        payment_methods = TraderPaymentMethod.objects.filter(trader=request.user)
        serializer = TraderPaymentMethodSerializer(payment_methods, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        request_body=CreatePaymentMethodSerializer,
        responses={201: TraderPaymentMethodSerializer},
        operation_summary="Добавить реквизиты",
        operation_description="Добавить новые платежные реквизиты трейдера",
        tags=["Trader"]
    )
    @action(methods=['post'], detail=False, url_path='add-payment-method')
    def add_payment_method(self, request):
        serializer = CreatePaymentMethodSerializer(
            data=request.data, 
            context={'trader': request.user}
        )
        if serializer.is_valid():
            payment_method = serializer.save()
            return Response(
                TraderPaymentMethodSerializer(payment_method).data, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        responses={200: TraderPaymentMethodSerializer},
        operation_summary="Обновить способ оплаты трейдера",
        operation_description="Обновление информации о способе оплаты трейдера",
        tags=["Trader"]
    )
    @action(methods=['patch'], detail=True, url_path='update-payment-method')
    def update_payment_method(self, request, pk=None):
        try:
            payment_method = TraderPaymentMethod.objects.get(id=pk, trader=request.user)
        except TraderPaymentMethod.DoesNotExist:
            return Response({"message": "Способ оплаты не найден"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CreatePaymentMethodSerializer(payment_method, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TraderPaymentMethodSerializer(payment_method).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['delete'], detail=True, url_path='delete-payment-method')
    def delete_payment_method(self, request, pk=None):
        """Удалить реквизиты трейдера"""
        try:
            payment_method = TraderPaymentMethod.objects.get(id=pk, trader=request.user)
            payment_method.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TraderPaymentMethod.DoesNotExist:
            return Response({"message": "Способ оплаты не найден"}, status=status.HTTP_404_NOT_FOUND)

    @swagger_auto_schema(
        request_body=UpdateOnlineStatusSerializer,
        responses={200: UserSerialzier},
        operation_summary="Изменить статус онлайн",
        operation_description="Установить или снять статус 'онлайн' для трейдера",
        tags=["Trader"]
    )
    @action(methods=['patch'], detail=False, url_path='update-online-status')
    def update_online_status(self, request):
        serializer = UpdateOnlineStatusSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            updated_user = serializer.save()
            return Response(UserSerialzier(updated_user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        responses={200: TraderDetailedStatsSerializer},
        operation_summary="Получить детальную статистику",
        operation_description="Получить подробную статистику трейдера по заявкам, комиссии и заработку",
        tags=["Trader"]
    )
    @action(methods=['get'], detail=False, url_path='detailed-stats')
    def get_detailed_stats(self, request):
        from django.db.models import Sum, Count, Avg
        from django.utils import timezone
        from datetime import timedelta, date
        from decimal import Decimal
        
        trader = request.user
        
        # Текущая дата и периоды
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Заявки трейдера
        trader_orders = Order.objects.filter(assigned_trader=trader)
        
        # Общая статистика по заявкам
        total_orders = trader_orders.count()
        completed_orders = trader_orders.filter(status=OrderStatus.COMPLETED).count()
        cancelled_orders = trader_orders.filter(status=OrderStatus.CANCELLED).count()
        in_progress_orders = trader_orders.filter(status=OrderStatus.IN_PROGRESS).count()
        new_orders = trader_orders.filter(status=OrderStatus.NEW).count()
        
        # Процент успешных сделок
        success_rate = Decimal('0')
        if total_orders > 0:
            success_rate = (Decimal(completed_orders) / Decimal(total_orders)) * Decimal('100')
        
        # Объемы и комиссия
        volume_stats = trader_orders.aggregate(
            total_volume_usdt=Sum('amount_usdt'),
            total_volume_kzt=Sum('amount_kzt'),
            total_commission=Sum('commission')
        )
        
        completed_volume_stats = trader_orders.filter(status=OrderStatus.COMPLETED).aggregate(
            completed_volume_usdt=Sum('amount_usdt'),
            completed_volume_kzt=Sum('amount_kzt')
        )
        
        # Статистика по типам заявок
        buy_stats = trader_orders.filter(order_type=OrderType.BUY).aggregate(
            count=Count('id'),
            volume=Sum('amount_usdt'),
            commission=Sum('commission')
        )
        sell_stats = trader_orders.filter(order_type=OrderType.SELL).aggregate(
            count=Count('id'),
            volume=Sum('amount_usdt'),
            commission=Sum('commission')
        )
        
        # Статистика по периодам
        def get_period_stats(orders_queryset):
            return {
                'orders_count': orders_queryset.count(),
                'volume_usdt': orders_queryset.aggregate(volume=Sum('amount_usdt'))['volume'] or Decimal('0'),
                'volume_kzt': orders_queryset.aggregate(volume=Sum('amount_kzt'))['volume'] or Decimal('0'),
                'commission': orders_queryset.aggregate(commission=Sum('commission'))['commission'] or Decimal('0'),
                'completed_count': orders_queryset.filter(status=OrderStatus.COMPLETED).count()
            }
        
        today_stats = get_period_stats(trader_orders.filter(created_at__date=today))
        week_stats = get_period_stats(trader_orders.filter(created_at__date__gte=week_ago))
        month_stats = get_period_stats(trader_orders.filter(created_at__date__gte=month_ago))
        all_time_stats = get_period_stats(trader_orders)
        
        # Средние показатели
        avg_stats = trader_orders.filter(status=OrderStatus.COMPLETED).aggregate(
            avg_amount=Avg('amount_usdt'),
            avg_commission=Avg('commission')
        )
        
        avg_order_amount = avg_stats['avg_amount'] or Decimal('0')
        avg_commission_per_order = avg_stats['avg_commission'] or Decimal('0')
        
        # Среднее количество заявок в день
        avg_orders_per_day = Decimal('0')
        if trader_orders.exists():
            first_order = trader_orders.order_by('created_at').first()
            if first_order:
                days_active = (timezone.now().date() - first_order.created_at.date()).days + 1
                if days_active > 0:
                    avg_orders_per_day = Decimal(total_orders) / Decimal(days_active)
        
        # Депозит трейдера
        deposit_amount = Decimal('0')
        if hasattr(trader, 'trader_profile'):
            deposit_amount = trader.trader_profile.deposit_amount or Decimal('0')
        
        # Последняя активность
        last_order = trader_orders.order_by('-created_at').first()
        last_activity = last_order.created_at if last_order else trader.created_at
        
        # Рейтинг среди трейдеров
        # Получаем позицию трейдера по объему
        traders_by_volume = Order.objects.filter(
            assigned_trader__role=UserRoles.TRADER,
            status=OrderStatus.COMPLETED
        ).values('assigned_trader').annotate(
            total_volume=Sum('amount_usdt')
        ).order_by('-total_volume')
        
        volume_rank = 1
        for i, trader_data in enumerate(traders_by_volume, 1):
            if trader_data['assigned_trader'] == trader.id:
                volume_rank = i
                break
        
        # Получаем позицию трейдера по комиссии
        traders_by_commission = Order.objects.filter(
            assigned_trader__role=UserRoles.TRADER,
            status=OrderStatus.COMPLETED
        ).values('assigned_trader').annotate(
            total_commission=Sum('commission')
        ).order_by('-total_commission')
        
        commission_rank = 1
        for i, trader_data in enumerate(traders_by_commission, 1):
            if trader_data['assigned_trader'] == trader.id:
                commission_rank = i
                break
        
        stats_data = {
            # Общая статистика
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            'in_progress_orders': in_progress_orders,
            'new_orders': new_orders,
            'success_rate': success_rate,
            
            # Объемы и заработок
            'total_volume_usdt': volume_stats['total_volume_usdt'] or Decimal('0'),
            'total_volume_kzt': volume_stats['total_volume_kzt'] or Decimal('0'),
            'completed_volume_usdt': completed_volume_stats['completed_volume_usdt'] or Decimal('0'),
            'completed_volume_kzt': completed_volume_stats['completed_volume_kzt'] or Decimal('0'),
            'total_commission': volume_stats['total_commission'] or Decimal('0'),
            
            # Статистика по типам заявок
            'buy_orders_count': buy_stats['count'] or 0,
            'sell_orders_count': sell_stats['count'] or 0,
            'buy_volume_usdt': buy_stats['volume'] or Decimal('0'),
            'sell_volume_usdt': sell_stats['volume'] or Decimal('0'),
            'buy_commission': buy_stats['commission'] or Decimal('0'),
            'sell_commission': sell_stats['commission'] or Decimal('0'),
            
            # Статистика по периодам
            'today_stats': today_stats,
            'week_stats': week_stats,
            'month_stats': month_stats,
            'all_time_stats': all_time_stats,
            
            # Средние показатели
            'avg_order_amount': avg_order_amount,
            'avg_commission_per_order': avg_commission_per_order,
            'avg_orders_per_day': avg_orders_per_day,
            
            # Информация о трейдере
            'trader_info': trader,
            'deposit_amount': deposit_amount,
            'registration_date': trader.created_at,
            'last_activity': last_activity,
            
            # Рейтинг
            'volume_rank': volume_rank,
            'commission_rank': commission_rank,
        }
        
        return Response(TraderDetailedStatsSerializer(stats_data).data)


class SupportViewSet(GenericViewSet):
    """Чат поддержки"""
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['threads', 'thread_messages', 'reply']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(methods=['get'], detail=False, url_path='telegram-info')
    def telegram_info(self, request):
        from . import telegram_service
        bot_url = telegram_service.get_bot_url(str(request.user.id))
        return Response({
            'bot_url': bot_url,
            'is_configured': telegram_service.is_configured(),
            'is_linked': telegram_service.get_linked_chat_id(str(request.user.id)) is not None,
        })

    @action(methods=['get'], detail=False, url_path='messages')
    def list_messages(self, request):
        messages = SupportMessage.objects.filter(
            user=request.user,
            channel=SupportMessage.Channel.SITE,
        ).select_related('sender')
        SupportMessage.objects.filter(
            user=request.user,
            channel=SupportMessage.Channel.SITE,
            is_read=False,
        ).exclude(sender=request.user).update(is_read=True)
        return Response(SupportMessageSerializer(messages, many=True).data)

    @action(methods=['post'], detail=False, url_path='messages/send')
    def send_message(self, request):
        from . import telegram_service

        serializer = CreateSupportMessageSerializer(data=request.data)
        if serializer.is_valid():
            message = SupportMessage.objects.create(
                user=request.user,
                sender=request.user,
                text=serializer.validated_data['text'],
                channel=SupportMessage.Channel.SITE,
            )
            tg_msg_id = telegram_service.notify_admin_about_site_message(
                request.user, message.text
            )
            if tg_msg_id:
                message.telegram_message_id = tg_msg_id
                message.save(update_fields=['telegram_message_id'])
            return Response(SupportMessageSerializer(message).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['get'], detail=False, url_path='unread-count')
    def unread_count(self, request):
        if request.user.role == UserRoles.ADMIN:
            count = SupportMessage.objects.filter(
                channel=SupportMessage.Channel.SITE,
                is_read=False,
            ).exclude(sender__role=UserRoles.ADMIN).count()
        else:
            count = SupportMessage.objects.filter(
                user=request.user,
                channel=SupportMessage.Channel.SITE,
                is_read=False,
            ).exclude(sender=request.user).count()
        return Response({'unread_count': count})

    @action(methods=['get'], detail=False, url_path='threads')
    def threads(self, request):
        from django.db.models import Max, Count, Q

        thread_rows = (
            SupportMessage.objects.filter(channel=SupportMessage.Channel.SITE)
            .values('user_id')
            .annotate(
                last_message_at=Max('created_at'),
                unread_count=Count(
                    'id',
                    filter=Q(is_read=False) & ~Q(sender__role=UserRoles.ADMIN),
                ),
                total_messages=Count('id'),
            )
        )

        threads = []
        for row in thread_rows:
            try:
                thread_user = UserAccounts.objects.get(id=row['user_id'])
            except UserAccounts.DoesNotExist:
                continue

            last = (
                SupportMessage.objects.filter(
                    user_id=row['user_id'],
                    channel=SupportMessage.Channel.SITE,
                )
                .order_by('-created_at')
                .first()
            )
            if not last:
                continue

            threads.append({
                'user_info': thread_user,
                'last_message': last.text[:120],
                'last_message_at': row['last_message_at'],
                'unread_count': row['unread_count'],
                'total_messages': row['total_messages'],
            })

        threads.sort(
            key=lambda t: (0 if t['unread_count'] > 0 else 1, -t['last_message_at'].timestamp())
        )
        return Response(SupportThreadSerializer(threads, many=True).data)

    @action(methods=['get'], detail=False, url_path='thread')
    def thread_messages(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'message': 'user_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            thread_user = UserAccounts.objects.get(id=user_id)
        except UserAccounts.DoesNotExist:
            return Response({'message': 'Пользователь не найден'}, status=status.HTTP_404_NOT_FOUND)

        messages = SupportMessage.objects.filter(
            user=thread_user,
            channel=SupportMessage.Channel.SITE,
        ).select_related('sender')
        SupportMessage.objects.filter(
            user=thread_user,
            channel=SupportMessage.Channel.SITE,
            is_read=False,
        ).exclude(sender__role=UserRoles.ADMIN).update(is_read=True)

        return Response(SupportMessageSerializer(messages, many=True).data)

    @action(methods=['post'], detail=False, url_path='reply')
    def reply(self, request):
        from . import telegram_service

        serializer = SupportReplySerializer(data=request.data)
        if serializer.is_valid():
            try:
                thread_user = UserAccounts.objects.get(id=serializer.validated_data['user_id'])
            except UserAccounts.DoesNotExist:
                return Response({'message': 'Пользователь не найден'}, status=status.HTTP_404_NOT_FOUND)

            text = serializer.validated_data['text']
            message = SupportMessage.objects.create(
                user=thread_user,
                sender=request.user,
                text=text,
                channel=SupportMessage.Channel.SITE,
            )
            telegram_service.send_to_user_telegram(str(thread_user.id), text)
            return Response(SupportMessageSerializer(message).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# === Public ViewSet (регистрация) ===

class PublicViewSet(GenericViewSet):
    """Публичные API (без авторизации)"""
    permission_classes = [AllowAny]

    @action(methods=['post'], detail=False, url_path='register')
    def register(self, request):
        """Регистрация клиента"""
        serializer = TraderRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = UserAccounts.objects.create_user(
                phone=serializer.validated_data['phone'],
                password=serializer.validated_data['password']
            )
            user.first_name = serializer.validated_data['first_name']
            user.last_name = serializer.validated_data['last_name']
            user.email = serializer.validated_data.get('email', '')
            user.role = UserRoles.CLIENT
            user.is_active = True
            user.is_confirmed = True
            user.in_consideration = False
            user.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerialzier(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IsClientUser(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == UserRoles.CLIENT


class ClientViewSet(GenericViewSet):
    """ЛК клиента — заявки и реквизиты"""
    permission_classes = [IsClientUser]

    @action(methods=['get'], detail=False, url_path='orders')
    def my_orders(self, request):
        """Заявки клиента"""
        orders = Order.objects.filter(created_by=request.user).order_by('-created_at')
        return Response(OrderSerializer(orders, many=True).data)

    @action(methods=['get'], detail=False, url_path='payment-methods')
    def payment_methods(self, request):
        """Реквизиты клиента"""
        methods = TraderPaymentMethod.objects.filter(trader=request.user)
        return Response(TraderPaymentMethodSerializer(methods, many=True).data)

    @action(methods=['post'], detail=False, url_path='add-payment-method')
    def add_payment_method(self, request):
        """Добавить реквизиты"""
        data = request.data
        method = TraderPaymentMethod.objects.create(
            trader=request.user,
            method_type=data.get('method_type', 'card'),
            bank_name=data.get('bank_name', ''),
            card_number=data.get('card_number', ''),
            card_holder_name=data.get('card_holder_name', ''),
            wallet_address=data.get('wallet_address', ''),
            crypto_network=data.get('crypto_network', ''),
        )
        return Response(TraderPaymentMethodSerializer(method).data, status=status.HTTP_201_CREATED)

    @action(methods=['delete'], detail=True, url_path='delete-payment-method')
    def delete_payment_method(self, request, pk=None):
        """Удалить реквизиты"""
        try:
            method = TraderPaymentMethod.objects.get(id=pk, trader=request.user)
            method.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TraderPaymentMethod.DoesNotExist:
            return Response({'message': 'Не найдено'}, status=status.HTTP_404_NOT_FOUND)

    @action(methods=['get'], detail=False, url_path='profile')
    def profile(self, request):
        """Профиль клиента"""
        return Response(UserSerialzier(request.user).data)

    @action(methods=['get'], detail=True, url_path='order-detail')
    def order_detail(self, request, pk=None):
        """Детали заявки с информацией о трейдере и отзыве"""
        from .models import OrderReview
        from django.db.models import Avg
        try:
            order = Order.objects.select_related('assigned_trader', 'created_by').get(id=pk, created_by=request.user)
        except Order.DoesNotExist:
            return Response({'message': 'Заявка не найдена'}, status=status.HTTP_404_NOT_FOUND)

        data = OrderSerializer(order).data

        if order.assigned_trader:
            trader = order.assigned_trader
            avg_rating = OrderReview.objects.filter(trader=trader).aggregate(avg=Avg('rating'))['avg']
            reviews_count = OrderReview.objects.filter(trader=trader).count()
            data['trader_info'] = {
                'first_name': trader.first_name,
                'last_name': trader.last_name,
                'avg_rating': round(avg_rating, 1) if avg_rating else None,
                'reviews_count': reviews_count,
            }

        try:
            review = OrderReview.objects.get(order=order)
            data['review'] = {
                'rating': review.rating,
                'text': review.text,
                'created_at': review.created_at.isoformat(),
            }
        except OrderReview.DoesNotExist:
            data['review'] = None

        return Response(data)

    @action(methods=['post'], detail=True, url_path='review')
    def leave_review(self, request, pk=None):
        """Оставить отзыв о сделке"""
        from .models import OrderReview
        try:
            order = Order.objects.get(id=pk, created_by=request.user, status=OrderStatus.COMPLETED)
        except Order.DoesNotExist:
            return Response({'message': 'Заявка не найдена или не завершена'}, status=status.HTTP_404_NOT_FOUND)

        if not order.assigned_trader:
            return Response({'message': 'Трейдер не назначен'}, status=status.HTTP_400_BAD_REQUEST)

        if OrderReview.objects.filter(order=order).exists():
            return Response({'message': 'Отзыв уже оставлен'}, status=status.HTTP_400_BAD_REQUEST)

        rating = request.data.get('rating')
        if not rating or int(rating) < 1 or int(rating) > 5:
            return Response({'message': 'Оценка от 1 до 5'}, status=status.HTTP_400_BAD_REQUEST)

        review = OrderReview.objects.create(
            order=order,
            client=request.user,
            trader=order.assigned_trader,
            rating=int(rating),
            text=request.data.get('text', ''),
        )
        return Response({
            'rating': review.rating,
            'text': review.text,
            'created_at': review.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)

    @action(methods=['get'], detail=True, url_path='messages')
    def order_messages(self, request, pk=None):
        """Сообщения чата заявки"""
        try:
            order = Order.objects.get(id=pk, created_by=request.user)
        except Order.DoesNotExist:
            return Response({'message': 'Заявка не найдена'}, status=status.HTTP_404_NOT_FOUND)

        messages = OrderMessage.objects.filter(order=order).select_related('sender')
        return Response(OrderMessageSerializer(messages, many=True, context={'request': request}).data)

    @action(methods=['post'], detail=True, url_path='messages/send')
    def send_order_message(self, request, pk=None):
        """Отправить сообщение в чат заявки (с поддержкой фото)"""
        try:
            order = Order.objects.get(id=pk, created_by=request.user)
        except Order.DoesNotExist:
            return Response({'message': 'Заявка не найдена'}, status=status.HTTP_404_NOT_FOUND)

        text = request.data.get('text', '').strip()
        image = request.FILES.get('image')

        if not text and not image:
            return Response({'message': 'Сообщение должно содержать текст или изображение'}, status=status.HTTP_400_BAD_REQUEST)

        if image:
            allowed_types = ['image/jpeg', 'image/png', 'image/webp']
            if image.content_type not in allowed_types:
                return Response({'message': 'Допустимые форматы: JPEG, PNG, WebP'}, status=status.HTTP_400_BAD_REQUEST)
            if image.size > 5 * 1024 * 1024:
                return Response({'message': 'Максимальный размер файла 5 МБ'}, status=status.HTTP_400_BAD_REQUEST)

        message = OrderMessage.objects.create(
            order=order,
            sender=request.user,
            text=text,
            image=image,
        )
        return Response(OrderMessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ExchangeRateViewSet(GenericViewSet):
    """API курса обмена"""
    permission_classes = [AllowAny]

    @action(methods=['get'], detail=False, url_path='current')
    def current_rate(self, request):
        """Текущий курс USDT/KZT"""
        import requests
        from decimal import Decimal
        from django.core.cache import cache

        cache_key = 'exchange_rate_usdt_kzt'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            resp = requests.get(
                'https://api.binance.com/api/v3/ticker/price',
                params={'symbol': 'USDTKZT'},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                rate = Decimal(data['price'])
            else:
                resp = requests.get(
                    'https://api.coingecko.com/api/v3/simple/price',
                    params={'ids': 'tether', 'vs_currencies': 'kzt'},
                    timeout=5
                )
                if resp.status_code == 200:
                    data = resp.json()
                    rate = Decimal(str(data['tether']['kzt']))
                else:
                    rate = Decimal('475.00')
        except Exception:
            rate = Decimal('475.00')

        ExchangeRate.objects.update_or_create(
            pair='USDT/KZT',
            defaults={'rate': rate}
        )

        spread_percent = Decimal('0.03')
        result = {
            'pair': 'USDT/KZT',
            'buy_rate': str((rate * (1 + spread_percent)).quantize(Decimal('0.01'))),
            'sell_rate': str((rate * (1 - spread_percent)).quantize(Decimal('0.01'))),
            'mid_rate': str(rate),
            'updated_at': timezone.now().isoformat(),
        }
        cache.set(cache_key, result, 60)
        return Response(result)
