import httpx
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from app.config import settings

_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    url = f"https://{settings.auth0_domain}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache


async def get_current_user(authorization: str = Header(default="")):
    """Validate Auth0 JWT and return user claims."""
    if not settings.auth0_domain or not settings.auth0_client_id:
        return {
            "sub": "auth0|demo_user",
            "email": "harsukrit@ledger.dev",
            "name": "Harsukrit",
        }

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ", 1)[1]

    try:
        jwks = await _get_jwks()
        unverified_header = jwt.get_unverified_header(token)

        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            raise HTTPException(status_code=401, detail="Unable to find appropriate key")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.auth0_client_id,
            issuer=f"https://{settings.auth0_domain}/",
        )

        user_info = {
            "sub": payload.get("sub", ""),
            "email": payload.get("email", payload.get("sub", "")),
            "name": payload.get("name", payload.get("nickname", "")),
        }

        from app.services.supabase_client import get_or_create_user
        db_user = await get_or_create_user(
            auth0_id=user_info["sub"],
            email=user_info["email"],
            name=user_info["name"],
        )
        if db_user:
            user_info["db_id"] = db_user["id"]

        return user_info

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")


async def get_optional_user(authorization: str = Header(default="")):
    """Same as get_current_user but returns None instead of raising."""
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
