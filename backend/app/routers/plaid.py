from fastapi import APIRouter, Depends
from app.dependencies import get_current_user

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.post("/link-token")
async def create_link_token(user=Depends(get_current_user)):
    """Create a Plaid Link token for the frontend."""
    # TODO: implement with Plaid SDK once keys are provided
    return {"link_token": "link-sandbox-placeholder", "expiration": "2026-03-08T00:00:00Z"}


@router.post("/exchange")
async def exchange_token(public_token: str, user=Depends(get_current_user)):
    """Exchange a public_token for an access_token."""
    # TODO: implement with Plaid SDK
    return {"status": "success", "accounts_linked": 1}


@router.post("/sync")
async def sync_transactions(user=Depends(get_current_user)):
    """Trigger transaction sync from Plaid."""
    # TODO: implement transaction sync
    return {"status": "synced", "new_transactions": 0, "modified": 0}


@router.get("/accounts")
async def list_accounts(user=Depends(get_current_user)):
    """List linked bank accounts."""
    return {
        "accounts": [
            {
                "id": "acc_1",
                "name": "Plaid Checking",
                "type": "depository",
                "subtype": "checking",
                "balance": 2847.32,
                "institution": "First Platypus Bank",
            }
        ]
    }
