"""Backboard.io agent orchestration service. Requires BACKBOARD_API_KEY."""
from app.config import settings


class BackboardService:
    def __init__(self):
        self.api_key = settings.backboard_api_key
        self._configured = bool(self.api_key)
        self._client = None

    @property
    def is_configured(self) -> bool:
        return self._configured

    def _get_client(self):
        if not self._configured:
            return None
        if self._client is None:
            # TODO: from backboard_sdk import BackboardClient
            # self._client = BackboardClient(api_key=self.api_key)
            pass
        return self._client

    async def get_or_create_assistant(self, user_id: str) -> str:
        """Get or create a per-user Backboard assistant."""
        if not self._configured:
            return f"mock_assistant_{user_id}"
        # TODO: implement with Backboard SDK
        return ""

    async def send_message(self, assistant_id: str, thread_id: str, message: str,
                           llm_provider: str = None, model_name: str = None) -> str:
        """Send a message to a Backboard thread and get a response."""
        if not self._configured:
            return "Mock response: Backboard not configured yet."
        # TODO: implement with Backboard SDK
        return ""

    async def add_memory(self, assistant_id: str, content: str) -> None:
        """Explicitly add a memory to the assistant."""
        if not self._configured:
            return
        # TODO: implement


backboard_service = BackboardService()
