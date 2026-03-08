from django.contrib.auth import get_user_model
from django.test import TestCase

from sessions.models import CoachingSession, SessionStatus

from .models import ChatMessage, ChatMessageRole, ChatResponse, ChatResponseStatus


class ChatPersistenceModelTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="chat-owner@example.com",
            email="chat-owner@example.com",
            password="password123",
        )
        self.session = CoachingSession.objects.create(
            user=self.user,
            status=SessionStatus.READY,
            video_file="sessions/videos/2026/03/08/demo.mp4",
        )

    def test_chat_message_defaults(self):
        message = ChatMessage.objects.create(
            session=self.session,
            role=ChatMessageRole.USER,
            content="What should I improve?",
        )

        self.assertEqual(message.role, ChatMessageRole.USER)
        self.assertEqual(message.content, "What should I improve?")
        self.assertEqual(message.metadata, {})
        self.assertIsNone(message.response)

    def test_chat_response_can_link_user_and_assistant_messages(self):
        user_message = ChatMessage.objects.create(
            session=self.session,
            role=ChatMessageRole.USER,
            content="How was my pacing?",
        )
        response = ChatResponse.objects.create(
            session=self.session,
            user_message=user_message,
            status=ChatResponseStatus.STREAMING,
        )

        assistant_message = ChatMessage.objects.create(
            session=self.session,
            role=ChatMessageRole.ASSISTANT,
            content="Your pace improved after the first minute.",
            response=response,
        )
        response.assistant_message = assistant_message
        response.status = ChatResponseStatus.COMPLETED
        response.answer_text = assistant_message.content
        response.save()

        self.assertEqual(response.user_message_id, user_message.id)
        self.assertEqual(response.assistant_message_id, assistant_message.id)
        self.assertEqual(response.answer_text, assistant_message.content)
        self.assertEqual(response.status, ChatResponseStatus.COMPLETED)
