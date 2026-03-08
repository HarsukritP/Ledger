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
    """Find user by auth0_id or create if not exists. Updates stale email/name."""
    sb = get_supabase()
    if not sb:
        return None

    result = sb.table("users").select("*").eq("auth0_id", auth0_id).execute()
    if result.data:
        existing = result.data[0]
        updates = {}
        stored_email = existing.get("email") or ""
        stored_name = existing.get("name") or ""
        email_is_stale = (
            not stored_email
            or stored_email == auth0_id
            or "|" in stored_email
        )
        if email and "@" in email and email_is_stale:
            updates["email"] = email
        if name and name != stored_name:
            updates["name"] = name
        if updates:
            sb.table("users").update(updates).eq("id", existing["id"]).execute()
            existing.update(updates)
        return existing

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


async def mark_onboarding_complete(user_db_id: str, preferences: dict | None = None) -> dict | None:
    """Set onboarding_completed=true and optionally update preferences."""
    sb = get_supabase()
    if not sb:
        return None
    update_data: dict = {"onboarding_completed": True}
    if preferences:
        update_data["preferences"] = preferences
    result = sb.table("users").update(update_data).eq("id", user_db_id).execute()
    return result.data[0] if result.data else None
