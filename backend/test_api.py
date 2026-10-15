"""Focused API tests using mocked local and provider inference."""

from __future__ import annotations

import asyncio
import pytest
from fastapi.testclient import TestClient

from backend import api


class FakeCore:
    def __init__(self, decision: dict[str, object] | None = None) -> None:
        self.decision = decision or {
            "action": "ROUTE",
            "tier": "SMALL",
            "selected_model": "test-model",
            "confidence": 0.8,
            "latency_ms": 1.0,
        }

    def route_and_guard(self, prompt: str) -> dict[str, object]:
        return self.decision


class FakeGemini:
    async def __call__(self, *args: object, **kwargs: object) -> dict[str, object]:
        return {"candidates": [{"content": {"parts": [{"text": "mocked response"}]}}]}


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(api, "core_engine", FakeCore())
    monkeypatch.setattr(api, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(api, "_invoke_gemini", FakeGemini())
    monkeypatch.setattr(api, "DATABASE_URL", "")
    monkeypatch.setattr(api, "APP_ENV", "development")
    monkeypatch.setattr(api, "API_KEY", "")
    api._provider_verification.update(
        verified=False, message="Inference has not been verified.", checked_at=0.0
    )
    api._request_times.clear()
    return TestClient(api.app)


def test_health_does_not_claim_inference(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "polyglot-proxy",
        "inference": "not_verified",
    }


def test_readiness_reports_missing_provider_configuration(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api, "GEMINI_API_KEY", "")
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["inference"]["configured"] is False
    assert response.json()["inference"]["verified"] is False


def test_readiness_verifies_mocked_gemini(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["inference"]["verified"] is True


def test_readiness_reports_provider_authentication_failure(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api, "READINESS_CACHE_SECONDS", 0)
    def auth_failure(*args: object, **kwargs: object) -> object:
        raise __import__("urllib.error", fromlist=["HTTPError"]).HTTPError(
            url="https://example.test",
            code=403,
            msg="forbidden",
            hdrs=None,
            fp=None,
        )

    monkeypatch.setattr(api, "_invoke_gemini", auth_failure)
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["inference"]["verified"] is False
    assert "authentication failed" in response.json()["inference"]["message"]


def test_invalid_and_oversized_prompts_are_rejected(client: TestClient) -> None:
    assert client.post("/v1/proxy/chat", json={"prompt": ""}).status_code == 422
    assert (
        client.post(
            "/v1/proxy/chat",
            json={"prompt": "x" * (api.MAX_PROMPT_CHARS + 1)},
        ).status_code
        == 422
    )


def test_oversized_request_body_is_rejected(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api, "MAX_REQUEST_BYTES", 1)
    response = client.post("/v1/proxy/chat", json={"prompt": "hello"})
    assert response.status_code == 413


def test_unauthorized_request_is_rejected(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api, "API_KEY", "test-secret")
    response = client.post("/v1/proxy/chat", json={"prompt": "hello"})
    assert response.status_code == 401


def test_database_api_key_is_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeDb:
        def scalar(self, query: object) -> object:
            return type("Key", (), {"user_id": "user-1"})()

    monkeypatch.setattr(api, "DATABASE_URL", "postgresql://configured")
    assert api._auth_dependency(
        authorization=None,
        x_api_key="valid-key",
        db=FakeDb(),
    ) == "user-1"


def test_database_invalid_api_key_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeDb:
        def scalar(self, query: object) -> None:
            return None

    monkeypatch.setattr(api, "DATABASE_URL", "postgresql://configured")
    with pytest.raises(Exception) as error:
        api._auth_dependency(
            authorization=None,
            x_api_key="invalid-key",
            db=FakeDb(),
        )
    assert getattr(error.value, "status_code", None) == 401


def test_rate_limit_is_enforced(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(api, "RATE_LIMIT_REQUESTS", 1)
    first = client.post("/v1/proxy/chat", json={"prompt": "hello"})
    second = client.post("/v1/proxy/chat", json={"prompt": "hello"})
    assert first.status_code == 200
    assert second.status_code == 429


def test_blocked_prompt_never_invokes_provider(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        api,
        "core_engine",
        FakeCore(
            {
                "action": "BLOCK",
                "tier": None,
                "selected_model": None,
                "confidence": 0.9,
                "latency_ms": 1.0,
            }
        ),
    )
    async def provider_must_not_run(*args: object, **kwargs: object) -> dict[str, object]:
        pytest.fail("Gemini must not be called for blocked prompts")

    monkeypatch.setattr(api, "_invoke_gemini", provider_must_not_run)
    response = client.post("/v1/proxy/chat", json={"prompt": "blocked"})
    assert response.status_code == 200
    assert response.json()["status"] == "blocked"


def test_successful_response_uses_mocked_inference(client: TestClient) -> None:
    response = client.post("/v1/proxy/chat", json={"prompt": "hello"})
    assert response.status_code == 200
    assert response.json()["response"] == "mocked response"


def test_provider_timeout_returns_gateway_timeout(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def timeout(*args: object, **kwargs: object) -> dict[str, object]:
        raise asyncio.TimeoutError

    monkeypatch.setattr(api, "_invoke_gemini", timeout)
    response = client.post("/v1/proxy/chat", json={"prompt": "hello"})
    assert response.status_code == 504
    assert response.json()["detail"] == "The inference provider timed out."


def test_provider_error_is_sanitized(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def failure(*args: object, **kwargs: object) -> dict[str, object]:
        raise RuntimeError("secret internal provider details")

    monkeypatch.setattr(api, "_invoke_gemini", failure)
    response = client.post("/v1/proxy/chat", json={"prompt": "hello"})
    assert response.status_code == 502
    assert "secret internal" not in response.text
