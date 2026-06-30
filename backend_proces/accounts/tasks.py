from celery import shared_task
from django.utils import timezone
from datetime import date, timedelta
from django.db.models import Sum, Count, Q
from .models import UserAccounts, Order, TraderStatistics, OrderStatus, UserRoles


@shared_task
def start_up():
    print('hello world!')


@shared_task
def update_daily_trader_statistics():
    """Обновление ежедневной статистики трейдеров"""
    yesterday = date.today() - timedelta(days=1)
    
    # Получаем всех трейдеров
    traders = UserAccounts.objects.filter(role=UserRoles.TRADER)
    
    for trader in traders:
        # Получаем завершенные заявки за вчера
        completed_orders = Order.objects.filter(
            assigned_trader=trader,
            status=OrderStatus.COMPLETED,
            completed_at__date=yesterday
        )
        
        if completed_orders.exists():
            stats = completed_orders.aggregate(
                total_orders=Count('id'),
                total_earned=Sum('commission'),
                total_volume=Sum('amount_usdt')
            )
            
            # Обновляем или создаем статистику
            TraderStatistics.objects.update_or_create(
                trader=trader,
                date=yesterday,
                defaults={
                    'orders_count': stats['total_orders'] or 0,
                    'total_earned': stats['total_earned'] or 0,
                    'total_volume_usdt': stats['total_volume'] or 0
                }
            )
    
    return f"Updated statistics for {traders.count()} traders for {yesterday}"


@shared_task
def cleanup_old_statistics(days_to_keep=90):
    """Удаление старой статистики (старше указанного количества дней)"""
    cutoff_date = date.today() - timedelta(days=days_to_keep)
    
    deleted_count = TraderStatistics.objects.filter(date__lt=cutoff_date).delete()[0]
    
    return f"Deleted {deleted_count} old statistics records before {cutoff_date}"


@shared_task
def send_daily_summary_to_admin():
    """Отправка ежедневной сводки администратору"""
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    # Статистика за вчера
    yesterday_orders = Order.objects.filter(created_at__date=yesterday)
    completed_yesterday = yesterday_orders.filter(status=OrderStatus.COMPLETED)
    
    total_volume = completed_yesterday.aggregate(total=Sum('amount_usdt'))['total'] or 0
    total_commission = completed_yesterday.aggregate(total=Sum('commission'))['total'] or 0
    
    # Активные трейдеры
    active_traders = UserAccounts.objects.filter(
        role=UserRoles.TRADER,
        is_blocked=False,
        assigned_orders__created_at__date=yesterday
    ).distinct().count()
    
    summary = {
        'date': yesterday,
        'total_orders_created': yesterday_orders.count(),
        'completed_orders': completed_yesterday.count(),
        'total_volume_usdt': float(total_volume),
        'total_commission': float(total_commission),
        'active_traders': active_traders
    }
    
    # Здесь можно добавить отправку email или другие уведомления
    print(f"Daily summary: {summary}")
    
    return summary


@shared_task
def auto_assign_orders_to_traders():
    """Автоматическое назначение новых заявок доступным трейдерам"""
    # Получаем новые заявки без назначенного трейдера
    new_orders = Order.objects.filter(
        status=OrderStatus.NEW,
        assigned_trader__isnull=True
    ).order_by('created_at')
    
    # Получаем доступных трейдеров (не заблокированных)
    available_traders = UserAccounts.objects.filter(
        role=UserRoles.TRADER,
        is_blocked=False,
        is_active=True
    )
    
    if not available_traders.exists():
        return "No available traders found"
    
    assigned_count = 0
    
    for order in new_orders:
        # Простой алгоритм: назначаем трейдера с наименьшим количеством активных заявок
        trader = available_traders.annotate(
            active_orders_count=Count(
                'assigned_orders',
                filter=Q(assigned_orders__status__in=[OrderStatus.NEW, OrderStatus.IN_PROGRESS])
            )
        ).order_by('active_orders_count').first()
        
        if trader:
            order.assigned_trader = trader
            order.status = OrderStatus.IN_PROGRESS
            order.save()
            assigned_count += 1
    
    return f"Assigned {assigned_count} orders to traders"


@shared_task
def notify_traders_about_new_orders():
    """Уведомление трейдеров о новых заявках"""
    new_orders = Order.objects.filter(status=OrderStatus.NEW).count()
    
    if new_orders > 0:
        # Получаем активных трейдеров
        active_traders = UserAccounts.objects.filter(
            role=UserRoles.TRADER,
            is_blocked=False,
            is_active=True
        )
        
        # Здесь можно добавить логику отправки push-уведомлений или email
        for trader in active_traders:
            print(f"Notification sent to trader {trader.phone}: {new_orders} new orders available")
        
        return f"Notified {active_traders.count()} traders about {new_orders} new orders"
    
    return "No new orders to notify about"