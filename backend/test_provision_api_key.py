from __future__ import annotations

import hashlib

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from backend.database import Base
from backend.models import ApiKey, User
from backend.provision_api_key import provision_api_key


def test_provision_creates_user_and_stores_only_hash() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        raw_key = provision_api_key(db, "User@example.com")
        user = db.scalar(select(User).where(User.email == "user@example.com"))
        key = db.scalar(select(ApiKey).where(ApiKey.user_id == user.id))

    assert len(raw_key) > 20
    assert key.api_key_hash == hashlib.sha256(raw_key.encode()).hexdigest()
    assert raw_key != key.api_key_hash


def test_provision_reuses_existing_user() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        first_key = provision_api_key(db, "user@example.com")
        second_key = provision_api_key(db, "USER@example.com")
        users = db.scalars(select(User)).all()

    assert len(users) == 1
    assert first_key != second_key
