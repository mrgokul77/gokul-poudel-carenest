"""URLs for admin-only user management"""
from django.urls import path
from announcements.views import AdminAnnouncementListCreateView

from .admin_views import (
    AdminUserListView,
    AdminUserDetailView,
    AdminDashboardSummaryView,
)

urlpatterns = [
    path("announcements/", AdminAnnouncementListCreateView.as_view(), name="admin-announcements"),
    path("dashboard-summary/", AdminDashboardSummaryView.as_view(), name="admin-dashboard-summary"),
    path("users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]
