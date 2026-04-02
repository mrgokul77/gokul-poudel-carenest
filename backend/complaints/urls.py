from django.urls import path
from .views import FileComplaintView, UserComplaintListView, AdminComplaintListView, AdminComplaintDetailView

urlpatterns = [
    path("file/", FileComplaintView.as_view(), name="file_complaint"),
    path("my-complaints/", UserComplaintListView.as_view(), name="user_complaint_list"),
    path("admin/", AdminComplaintListView.as_view(), name="admin_complaint_list"),
    path("admin/<int:pk>/", AdminComplaintDetailView.as_view(), name="admin_complaint_detail"),
]
