"""ElevenLabs TTS service — generates voice briefings via the REST API."""
import logging
import httpx
from app.config import settings

logger = logging.getLogger("ledger.elevenlabs")

ELEVENLABS_API = "https://api.elevenlabs.io/v1"
DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
DEFAULT_MODEL = "eleven_flash_v2_5"


class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.elevenlabs_api_key
        self._configured = bool(self.api_key)

    @property
    def is_configured(self) -> bool:
        return self._configured

    async def generate_briefing_audio(
        self,
        text: str,
        voice_id: str = DEFAULT_VOICE_ID,
        model_id: str = DEFAULT_MODEL,
    ) -> bytes | None:
        """Generate TTS audio from briefing text. Returns MP3 bytes or None."""
        if not self._configured:
            logger.warning("[TTS] ELEVENLABS_API_KEY not set, skipping audio generation")
            return None

        if not text or len(text.strip()) < 10:
            logger.warning("[TTS] Text too short for TTS")
            return None

        try:
            async with httpx.AsyncClient(timeout=30) as http:
                resp = await http.post(
                    f"{ELEVENLABS_API}/text-to-speech/{voice_id}",
                    headers={
                        "xi-api-key": self.api_key,
                        "Content-Type": "application/json",
                        "Accept": "audio/mpeg",
                    },
                    json={
                        "text": text[:5000],
                        "model_id": model_id,
                        "voice_settings": {
                            "stability": 0.5,
                            "similarity_boost": 0.75,
                            "style": 0.0,
                            "use_speaker_boost": True,
                        },
                    },
                )

                if resp.status_code != 200:
                    logger.error(f"[TTS] ElevenLabs API error {resp.status_code}: {resp.text[:200]}")
                    return None

                audio_bytes = resp.content
                logger.info(f"[TTS] Generated {len(audio_bytes)} bytes of audio")
                return audio_bytes

        except Exception as e:
            logger.error(f"[TTS] Failed to generate audio: {e}")
            return None


elevenlabs_service = ElevenLabsService()
