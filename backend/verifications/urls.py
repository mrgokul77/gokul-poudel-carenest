from django.urls import path
from .views import (
    CaregiverDocumentUploadView,
    AdminCaregiverListView,
    AdminVerifyCaregiverView,
)

urlpatterns = [
    path('upload-document/', CaregiverDocumentUploadView.as_view(), name='upload-documents'),
    path('status/', CaregiverDocumentUploadView.as_view(), name='verification-status'),


    path('admin/list/', AdminCaregiverListView.as_view(), name='admin-list'),
    path('admin/<int:pk>/verify/', AdminVerifyCaregiverView.as_view(), name='admin-verify'),
]
