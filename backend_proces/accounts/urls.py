from django.urls import path
from .views import (
    UserBaseViewSet, RefreshViewSet, AdminViewSet, OrderViewSet, TraderViewSet
)

urlpatterns = [
    # Аутентификация
    path('register/', UserBaseViewSet.as_view({'post': 'create'})),
    path('login/', UserBaseViewSet.as_view({'post': 'login'})),
    path('refresh/', RefreshViewSet.as_view({'post': 'post'}), name='token_refresh'),
    
    # Профиль пользователя
    path('me/', UserBaseViewSet.as_view({'get': 'me'})),
    path('me/<str:id>/', UserBaseViewSet.as_view({'put': 'update'})),
    
    # Admin endpoints
    path('admin/create-trader/', AdminViewSet.as_view({'post': 'create_trader'})),
    path('admin/traders/', AdminViewSet.as_view({'get': 'list_traders'})),
    path('admin/search-traders/', AdminViewSet.as_view({'get': 'search_traders'})),
    path('admin/block-trader/', AdminViewSet.as_view({'patch': 'block_trader'})),
    path('admin/add-payment-method/', AdminViewSet.as_view({'post': 'add_payment_method_to_trader'})),
    path('admin/payment-methods/<str:pk>/delete/', AdminViewSet.as_view({'delete': 'delete_payment_method'})),
    path('admin/payment-methods/<str:pk>/toggle/', AdminViewSet.as_view({'patch': 'toggle_payment_method'})),
    path('admin/analytics/', AdminViewSet.as_view({'get': 'get_analytics'})),
    path('admin/traders-analytics/', AdminViewSet.as_view({'get': 'get_traders_analytics'})),
    
    # API для управления заявками
    path('orders/create/', OrderViewSet.as_view({'post': 'create'})),
    path('orders/create-for-trader/', OrderViewSet.as_view({'post': 'create_order_for_trader'})),
    path('orders/', OrderViewSet.as_view({'get': 'list_all'})),
    path('orders/<str:pk>/admin-update/', OrderViewSet.as_view({'patch': 'admin_update'})),
    path('orders/<str:pk>/update-status/', OrderViewSet.as_view({'patch': 'update_status'})),
    path('orders/<str:pk>/update-trader-status/', OrderViewSet.as_view({'patch': 'update_trader_order_status'})),
    path('orders/<str:pk>/assign-payment-method/', OrderViewSet.as_view({'patch': 'assign_payment_method'})),
    path('orders/<str:pk>/messages/', OrderViewSet.as_view({'get': 'list_messages'})),
    path('orders/<str:pk>/messages/send/', OrderViewSet.as_view({'post': 'send_message'})),
    path('orders/trader-orders/', OrderViewSet.as_view({'get': 'list_trader_orders'})),
    
    # API для трейдеров
    path('trader/dashboard/', TraderViewSet.as_view({'get': 'dashboard'})),
    path('trader/profile/', TraderViewSet.as_view({'get': 'profile'})),
    path('trader/payment-methods/', TraderViewSet.as_view({'get': 'payment_methods'})),
    path('trader/add-payment-method/', TraderViewSet.as_view({'post': 'add_payment_method'})),
    path('trader/payment-methods/<str:pk>/update/', TraderViewSet.as_view({'patch': 'update_payment_method'})),
    path('trader/update-online-status/', TraderViewSet.as_view({'patch': 'update_online_status'})),
    path('trader/detailed-stats/', TraderViewSet.as_view({'get': 'get_detailed_stats'})),
]