from fastapi import Depends, HTTPException, Header
from app.config import settings


async def get_current_user(authorization: str = Header(default="")):
    """Validate Auth0 JWT and return user info.
    Placeholder until Auth0 keys are configured."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    # TODO: validate JWT with Auth0 once keys are provided
    # For now, return a mock user for development
    return {
        "sub": "auth0|demo_user",
        "email": "harsukrit@ledger.dev",
        "name": "Harsukrit",
    }


async def get_optional_user(authorization: str = Header(default="")):
    """Same as get_current_user but returns None instead of raising."""
    if not authorization:
        return None
    return await get_current_user(authorization)
