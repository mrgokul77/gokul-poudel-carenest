from django.urls import path
from .views import CaregiverDashboardSummaryView

urlpatterns = [
    path("dashboard-summary/", CaregiverDashboardSummaryView.as_view(), name="caregiver-dashboard-summary"),
]
