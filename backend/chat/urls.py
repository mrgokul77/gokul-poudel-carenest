from django.urls import path
from .views import ChatStartView, ConversationListView, MessageListView

urlpatterns = [
    path("start/", ChatStartView.as_view(), name="chat-start"),
    path("conversations/", ConversationListView.as_view(), name="chat-conversations"),
    path("messages/<int:conversation_id>/", MessageListView.as_view(), name="chat-messages"),
]
