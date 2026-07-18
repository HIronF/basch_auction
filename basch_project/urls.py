"""
URL configuration for basch_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from auction.views import index_view, admin_view, teams_view, players_view, analytics_view, projector_view

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('admin/', admin_view, name='admin_console'),
    path('setup/', admin_view, name='setup_console'),
    path('teams/', teams_view, name='teams_console'),
    path('players/', players_view, name='players_console'),
    path('analytics/', analytics_view, name='analytics_console'),
    path('projector/', projector_view, name='projector_console'),
    path('api/', include('auction.urls')),
    path('', index_view, name='index'),
]
