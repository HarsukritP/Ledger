"""ElevenLabs TTS service. Requires ELEVENLABS_API_KEY."""
from app.config import settings


class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.elevenlabs_api_key
        self._configured = bool(self.api_key)

    @property
    def is_configured(self) -> bool:
        return self._configured

    async def generate_briefing_audio(self, text: str, voice_id: str = "JBFqnCBsd6RMkjVDRZzb") -> bytes | None:
        """Generate TTS audio from briefing text."""
        if not self._configured:
            return None
        # TODO: implement with elevenlabs SDK
        # from elevenlabs import ElevenLabs
        # client = ElevenLabs(api_key=self.api_key)
        # audio = client.text_to_speech.convert(
        #     text=text, voice_id=voice_id, model_id="eleven_flash_v2_5"
        # )
        return None


elevenlabs_service = ElevenLabsService()
