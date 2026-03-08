from django.contrib import admin

from .models import ChatMessage, ChatResponse


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "role", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("id", "session__id", "content")


@admin.register(ChatResponse)
class ChatResponseAdmin(admin.ModelAdmin):
    list_display = ("id", "response_id", "session", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("id", "response_id", "session__id")
