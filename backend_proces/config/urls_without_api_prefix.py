from django.urls import path, include
from accounts.urls import urlpatterns as accounts_app_urls

urlpatterns = [
    path('', include(accounts_app_urls)),
]