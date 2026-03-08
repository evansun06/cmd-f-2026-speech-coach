from __future__ import annotations

import uuid

from django.db import models


class ChatMessageRole(models.TextChoices):
    USER = "user", "User"
    ASSISTANT = "assistant", "Assistant"


class ChatResponseStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    STREAMING = "streaming", "Streaming"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class ChatResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    response_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    session = models.ForeignKey(
        "coach_sessions.CoachingSession",
        on_delete=models.CASCADE,
        related_name="chat_responses",
    )
    user_message = models.ForeignKey(
        "chatbot.ChatMessage",
        on_delete=models.SET_NULL,
        related_name="initiated_responses",
        null=True,
        blank=True,
    )
    assistant_message = models.ForeignKey(
        "chatbot.ChatMessage",
        on_delete=models.SET_NULL,
        related_name="completed_responses",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=16,
        choices=ChatResponseStatus.choices,
        default=ChatResponseStatus.QUEUED,
        db_index=True,
    )
    answer_text = models.TextField(blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["session", "created_at"], name="chat_resp_sess_created_idx"),
            models.Index(fields=["session", "status"], name="chat_resp_sess_status_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.session_id} resp={self.response_id} ({self.status})"


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        "coach_sessions.CoachingSession",
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    role = models.CharField(max_length=16, choices=ChatMessageRole.choices)
    content = models.TextField()
    response = models.ForeignKey(
        ChatResponse,
        on_delete=models.SET_NULL,
        related_name="messages",
        null=True,
        blank=True,
    )
    metadata = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [
            models.Index(fields=["session", "created_at"], name="chat_msg_sess_created_idx"),
            models.Index(fields=["session", "role"], name="chat_msg_sess_role_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.session_id} {self.role} msg={self.id}"
