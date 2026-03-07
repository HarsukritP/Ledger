"""Supabase client singleton. Uses service role key for backend operations."""
from supabase import create_client, Client
from app.config import settings

_client: Client | None = None


def get_supabase() -> Client | None:
    global _client
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


async def get_or_create_user(auth0_id: str, email: str = "", name: str = "") -> dict | None:
    """Find user by auth0_id or create if not exists."""
    sb = get_supabase()
    if not sb:
        return None

    result = sb.table("users").select("*").eq("auth0_id", auth0_id).execute()
    if result.data:
        return result.data[0]

    new_user = sb.table("users").insert({
        "auth0_id": auth0_id,
        "email": email,
        "name": name,
    }).execute()
    return new_user.data[0] if new_user.data else None


async def get_user_by_auth0_id(auth0_id: str) -> dict | None:
    sb = get_supabase()
    if not sb:
        return None
    result = sb.table("users").select("*").eq("auth0_id", auth0_id).execute()
    return result.data[0] if result.data else None
