"""Persistent Academic Vault Router for Server-Side State Persistence."""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger("smartedu.vault")

router = APIRouter(prefix="/vault", tags=["Academic Vault Persistence"])

VAULT_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
VAULT_FILE = VAULT_DIR / "academic_vault.json"


def ensure_vault_dir():
    try:
        VAULT_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        logger.warning("Failed to create vault directory: %s", exc)


class VaultPayload(BaseModel):
    data: Dict[str, Any]


@router.get(
    "",
    response_model=dict,
    summary="Retrieve Persistent Academic Vault State",
)
async def get_vault_state():
    """Returns the persistent university academic state stored on server disk."""
    ensure_vault_dir()
    if not VAULT_FILE.exists():
        return {"success": True, "data": None, "message": "No vault file exists yet."}

    try:
        with open(VAULT_FILE, "r", encoding="utf-8") as f:
            content = json.load(f)
        return {"success": True, "data": content, "message": "Persistent vault state loaded."}
    except Exception as exc:
        logger.error("Error reading academic vault file: %s", exc)
        return {"success": False, "data": None, "error": str(exc)}


@router.post(
    "",
    response_model=dict,
    summary="Save / Synchronize Academic State to Server Disk",
)
async def save_vault_state(payload: Dict[str, Any]):
    """Saves the entire university academic state directly to server disk to ensure zero data loss on browser cache clear."""
    ensure_vault_dir()
    try:
        temp_file = VAULT_DIR / "academic_vault.tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        # Atomic replace
        temp_file.replace(VAULT_FILE)
        return {"success": True, "message": "Academic vault state saved to server disk successfully."}
    except Exception as exc:
        logger.error("Error writing academic vault file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist state: {str(exc)}",
        )
