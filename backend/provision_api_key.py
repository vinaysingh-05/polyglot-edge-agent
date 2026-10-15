"""Provision a database-backed Polyglot API key for local administration."""

from __future__ import annotations

import os
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

try:
    from .database import SessionLocal, engine
    from .models import ApiKey, User
except ImportError:
    from database import SessionLocal, engine
    from models import ApiKey, User


def provision_api_key(db: Session, email: str) -> str:
    """Create or reuse a user and return a new one-time API key."""
    normalized_email = email.strip().lower()
    if not normalized_email or "@" not in normalized_email:
        raise ValueError("A valid email address is required.")

    user = db.scalar(select(User).where(User.email == normalized_email))
    raw_key = secrets.token_urlsafe(32)
    try:
        if user is None:
            user = User(id=str(uuid.uuid4()), email=normalized_email)
            db.add(user)
            db.flush()
        db.add(
            ApiKey(
                id=str(uuid.uuid4()),
                user_id=user.id,
                api_key_hash=_key_hash(raw_key),
                is_active=True,
            )
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise RuntimeError("API key provisioning failed; no changes were committed.")
    return raw_key


def _key_hash(api_key: str) -> str:
    import hashlib

    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def main() -> None:
    """Prompt for an email or use POLYGLOT_PROVISION_EMAIL."""
    if engine is None:
        raise RuntimeError("DATABASE_URL must be configured before provisioning.")
    email = os.getenv("POLYGLOT_PROVISION_EMAIL") or input("User email: ")
    with SessionLocal() as db:
        raw_key = provision_api_key(db, email)
    print("API key created. Store it securely; it will not be shown again:")
    print(raw_key)


if __name__ == "__main__":
    main()
