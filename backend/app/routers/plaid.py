"""Plaid API endpoints — link token, token exchange, transaction sync, accounts."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.services.plaid_service import plaid_service, PlaidError

logger = logging.getLogger("ledger.plaid")

router = APIRouter(prefix="/plaid", tags=["plaid"])


class ExchangeRequest(BaseModel):
    public_token: str
    institution_name: str | None = None


class SandboxRequest(BaseModel):
    institution_id: str = "ins_109508"


@router.post("/link-token")
async def create_link_token(user=Depends(get_current_user)):
    """Create a Plaid Link token for the frontend."""
    user_sub = user.get("sub", "unknown")
    try:
        result = await plaid_service.create_link_token(user_id=user_sub)
        return result
    except PlaidError as e:
        logger.error(f"[PLAID] /link-token failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange")
async def exchange_token(body: ExchangeRequest, user=Depends(get_current_user)):
    """Exchange a public_token from Plaid Link for a permanent access_token."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        result = await plaid_service.exchange_public_token(
            public_token=body.public_token,
            user_db_id=user_db_id,
        )
        return {
            "status": "success",
            "accounts_linked": result["accounts_linked"],
            "accounts": result["accounts"],
        }
    except PlaidError as e:
        logger.error(f"[PLAID] /exchange failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def sync_transactions(user=Depends(get_current_user)):
    """Trigger a transaction sync from Plaid for all linked accounts."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        result = await plaid_service.sync_transactions(user_db_id=user_db_id)
        return result
    except PlaidError as e:
        logger.error(f"[PLAID] /sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/accounts")
async def list_accounts(user=Depends(get_current_user)):
    """List linked bank accounts with live balances."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        accounts = await plaid_service.get_accounts_for_user(user_db_id=user_db_id)
        return {"accounts": accounts}
    except PlaidError as e:
        logger.error(f"[PLAID] /accounts failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions")
async def get_transactions(days: int = 30, user=Depends(get_current_user)):
    """Retrieve synced transactions from the database."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        transactions = await plaid_service.get_transactions(
            user_db_id=user_db_id, days=days
        )
        return {"transactions": transactions}
    except PlaidError as e:
        logger.error(f"[PLAID] /transactions failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sandbox/create-token")
async def create_sandbox_token(body: SandboxRequest, user=Depends(get_current_user)):
    """(Sandbox only) Create a test public token without using Link UI."""
    try:
        public_token = await plaid_service.create_sandbox_token(
            institution_id=body.institution_id
        )
        return {"public_token": public_token}
    except PlaidError as e:
        logger.error(f"[PLAID] /sandbox/create-token failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
