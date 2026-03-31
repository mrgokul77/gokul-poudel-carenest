from django.urls import path
from .views import CareseekerDashboardSummaryView

urlpatterns = [
    path("dashboard-summary/", CareseekerDashboardSummaryView.as_view(), name="careseeker-dashboard-summary"),
]
