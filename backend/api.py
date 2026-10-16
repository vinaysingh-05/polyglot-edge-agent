"""
FastAPI gateway for Polyglot Proxy.

The local PolyglotCore performs the safety and routing decision before this
module sends an allowed prompt to Gemini. The former Bedrock implementation is
retained as commented legacy reference code and is not used.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from functools import lru_cache
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse
from dotenv import load_dotenv

try:
    from .context_manager import ContextItem, ContextManager
    from .database import get_optional_db
    from .decider_core import PolyglotCore
    from .models import ApiKey

class LoginRequest(BaseModel):
    api_key: str = Field(..., min_length=1)
except ImportError:  # Supports running from the backend directory.
    from context_manager import ContextItem, ContextManager
    from database import get_optional_db
    from decider_core import PolyglotCore
    from models import ApiKey

from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
load_dotenv()


class InferenceConfigurationError(RuntimeError):
    """Raised when the active inference provider lacks required configuration."""


APP_ENV = os.getenv("POLYGLOT_ENV", "development").strip().lower()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"
MAX_PROMPT_CHARS = int(os.getenv("POLYGLOT_MAX_PROMPT_CHARS", "12000"))
MAX_REQUEST_BYTES = int(os.getenv("POLYGLOT_MAX_REQUEST_BYTES", "128000"))
CONTEXT_TOKEN_LIMIT = int(os.getenv("POLYGLOT_CONTEXT_TOKEN_LIMIT", "4096"))
INFERENCE_TIMEOUT_SECONDS = float(
    os.getenv("POLYGLOT_INFERENCE_TIMEOUT_SECONDS", "120")
)
READINESS_CACHE_SECONDS = float(
    os.getenv("POLYGLOT_READINESS_CACHE_SECONDS", "300")
)
RATE_LIMIT_REQUESTS = int(os.getenv("POLYGLOT_RATE_LIMIT_REQUESTS", "30"))
RATE_LIMIT_WINDOW_SECONDS = int(
    os.getenv("POLYGLOT_RATE_LIMIT_WINDOW_SECONDS", "60")
)
API_KEY = os.getenv("POLYGLOT_API_KEY", "").strip()
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "POLYGLOT_ALLOWED_ORIGINS",
        "http://127.0.0.1:8000,http://localhost:8000",
    ).split(",")
    if origin.strip()
]

if MAX_PROMPT_CHARS < 1 or CONTEXT_TOKEN_LIMIT < 1 or MAX_REQUEST_BYTES < 1:
    raise RuntimeError("Request, prompt, and context limits must be positive.")
if INFERENCE_TIMEOUT_SECONDS <= 0:
    raise RuntimeError("Inference timeout must be positive.")
if READINESS_CACHE_SECONDS < 0:
    raise RuntimeError("Readiness cache duration must not be negative.")
if RATE_LIMIT_REQUESTS < 1 or RATE_LIMIT_WINDOW_SECONDS < 1:
    raise RuntimeError("Rate-limit settings must be positive.")

app = FastAPI(title="Polyglot Proxy Gateway")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)
core_engine: PolyglotCore | None = None
_request_times: dict[str, deque[float]] = defaultdict(deque)
_provider_verification: dict[str, Any] = {
    "verified": False,
    "message": "Inference has not been verified.",
    "checked_at": 0.0,
}


class ChatRequest(BaseModel):
    """Client payload accepted by the proxy endpoint."""

    prompt: str = Field(..., min_length=1, max_length=MAX_PROMPT_CHARS)
    user_id: str | None = Field(default="demo_user", max_length=128)


@lru_cache(maxsize=1)
def _get_core_engine() -> PolyglotCore:
    """Load the local decision model only when inference is requested."""
    return PolyglotCore()


def _auth_required() -> bool:
    return APP_ENV == "production" or bool(API_KEY)


def _authenticate_static(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> None:
    """Require an API key when configured, and always in production."""
    if not _auth_required():
        return
    provided = x_api_key
    if not provided and authorization and authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()
    if not API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API authentication is not configured.",
        )
    if not provided or not hmac.compare_digest(provided, API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _key_hash(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def get_current_user_id(
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
    db: Session | None = Depends(get_optional_db),
) -> str | None:
    """Verify X-API-Key against Supabase, with static-key fallback locally."""
    provided = x_api_key
    if not provided and authorization and authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()
    if not provided:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database authentication is not configured.",
        )
    try:
        api_key = db.scalar(
            select(ApiKey).where(
                ApiKey.api_key_hash == _key_hash(provided),
                ApiKey.is_active.is_(True),
            )
        )
    except OperationalError as error:
        logger.exception("Database authentication query failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database authentication is temporarily unavailable.",
        ) from error
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return api_key.user_id


def _auth_dependency(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
    db: Session | None = Depends(get_optional_db),
) -> str | None:
    """Use database API keys when DATABASE_URL is set, otherwise legacy auth."""
    if DATABASE_URL:
        return get_current_user_id(x_api_key, authorization, db)
    _authenticate_static(authorization, x_api_key)
    return None


def _rate_limit(request: Request) -> None:
    """Apply a process-local limit; use a shared limiter for multi-worker deploys."""
    client_host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    timestamps = _request_times[client_host]
    while timestamps and now - timestamps[0] >= RATE_LIMIT_WINDOW_SECONDS:
        timestamps.popleft()
    if len(timestamps) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Retry later.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
        )
    timestamps.append(now)


def _request_size_limit(request: Request) -> None:
    """Reject oversized JSON requests before local inference starts."""
    content_length = request.headers.get("content-length")
    if (
        content_length
        and content_length.isdigit()
        and int(content_length) > MAX_REQUEST_BYTES
    ):
        raise HTTPException(
            status_code=413,
            detail="Request body is too large.",
        )


def _provider_readiness() -> dict[str, Any]:
    """Return the cached result of the most recent Gemini verification."""
    configured = bool(GEMINI_API_KEY and GEMINI_MODEL)
    verified = bool(
        configured
        and _provider_verification["verified"]
        and time.monotonic() - _provider_verification["checked_at"]
        <= READINESS_CACHE_SECONDS
    )
    return {
        "configured": configured,
        "verified": verified,
        "message": (
            _provider_verification["message"]
            if configured and _provider_verification["checked_at"]
            else (
                "Inference configuration is present; invocation has not been verified."
                if configured
                else "Inference credentials or model configuration is missing."
            )
        ),
    }


@app.get("/health")
async def health() -> dict[str, str]:
    """Report API process availability without claiming inference readiness."""
    return {"status": "ok", "service": "polyglot-proxy", "inference": "not_verified"}


@app.get("/ready")
async def readiness() -> JSONResponse:
    # existing implementation unchanged (will be kept below)
    ...


@app.post("/login")
async def login(request: LoginRequest) -> dict:
    """Simple API-key based login for the dashboard.
    Returns 200 if the provided key matches the server's configured API key.
    """
    # Prefer the explicit API_KEY env var if set; otherwise fall back to Gemini key.
    expected = API_KEY or GEMINI_API_KEY
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on the server.",
        )
    if request.api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
        )
    return {"status": "ok", "message": "Authenticated"}

@app.get("/ready")
async def readiness() -> JSONResponse:
    """Report readiness after a bounded, cached Gemini verification call."""
    if (
        GEMINI_API_KEY
        and GEMINI_MODEL
        and (
            not _provider_verification["verified"]
            or time.monotonic() - _provider_verification["checked_at"]
            > READINESS_CACHE_SECONDS
        )
    ):
        _provider_verification["verified"] = False
        verification_body = json.dumps(
            {
                "contents": [
                    {"parts": [{"text": "Reply with exactly: POLYGLOT_READINESS_OK"}]}
                ],
                "generationConfig": {"maxOutputTokens": 8},
            }
        ).encode("utf-8")
        try:
            await asyncio.wait_for(
                _invoke_gemini(GEMINI_MODEL, verification_body),
                timeout=INFERENCE_TIMEOUT_SECONDS,
            )
        except InferenceConfigurationError:
            _provider_verification["message"] = (
                "Inference credentials or model configuration is missing."
            )
        except asyncio.TimeoutError:
            _provider_verification["message"] = "Inference provider verification timed out."
        except urllib.error.HTTPError as error:
            _provider_verification["message"] = (
                "Inference provider authentication failed."
                if error.code in {401, 403}
                else "Inference provider verification failed."
            )
        except urllib.error.URLError:
            _provider_verification["message"] = "Inference provider could not be reached."
        except Exception:
            logger.exception("Inference readiness verification failed")
            _provider_verification["message"] = "Inference provider verification failed."
        else:
            _provider_verification["verified"] = True
            _provider_verification["message"] = "Gemini invocation verified."
        _provider_verification["checked_at"] = time.monotonic()

    provider = _provider_readiness()
    payload = {
        "status": "ready" if provider["configured"] and provider["verified"] else "not_ready",
        "api": "ok",
        "local_model_loaded": core_engine is not None
        or _get_core_engine.cache_info().currsize > 0,
        "inference": provider,
    }
    return JSONResponse(
        status_code=status.HTTP_200_OK
        if payload["status"] == "ready"
        else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=payload,
    )


def _extract_gemini_text(payload: dict[str, Any]) -> str:
    """Extract generated text from the Gemini generateContent response."""
    candidates = payload.get("candidates")
    if not isinstance(candidates, list):
        raise ValueError("Gemini response did not contain candidates.")
    for candidate in candidates:
        content = candidate.get("content") if isinstance(candidate, dict) else None
        parts = content.get("parts") if isinstance(content, dict) else None
        if isinstance(parts, list):
            text = "".join(
                part["text"]
                for part in parts
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            )
            if text:
                return text
    raise ValueError("Gemini response did not contain generated text.")


async def _evaluate_prompt(prompt: str) -> dict[str, Any]:
    """Run CPU/model-bound local inference without blocking the event loop."""
    engine = core_engine or _get_core_engine()
    return await asyncio.to_thread(engine.route_and_guard, prompt)


async def _invoke_gemini(model_id: str, body: bytes) -> dict[str, Any]:
    """Call Gemini's REST endpoint without storing the API key in the URL."""
    if not GEMINI_API_KEY:
        raise InferenceConfigurationError("Inference credentials are not configured.")
    request = urllib.request.Request(
        f"{GEMINI_API_URL}/{model_id}:generateContent",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        },
        method="POST",
    )

    def send() -> dict[str, Any]:
        with urllib.request.urlopen(
            request, timeout=INFERENCE_TIMEOUT_SECONDS
        ) as response:
            return json.loads(response.read())

    return await asyncio.to_thread(send)


# Legacy AWS Bedrock reference (intentionally disabled):
#
# import boto3
# from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError, NoRegionError
# bedrock_client = None
# def _get_bedrock_client():
#     global bedrock_client
#     if bedrock_client is None:
#         bedrock_client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
#     return bedrock_client
# async def _invoke_bedrock(model_id: str, body: bytes) -> dict[str, Any]:
#     response = await asyncio.to_thread(
#         _get_bedrock_client().invoke_model,
#         modelId=model_id, body=body,
#         contentType="application/json", accept="application/json",
#     )
#     return json.loads(await asyncio.to_thread(response["body"].read))


@app.post("/v1/proxy/chat")
async def proxy_chat(
    request: ChatRequest,
    _user_id: str | None = Depends(_auth_dependency),
    _rate_limit_result: None = Depends(_rate_limit),
    _request_size_result: None = Depends(_request_size_limit),
) -> dict[str, Any]:
    """
    Guard, route, and generate a response through Gemini.

    Local inference and boto3 are synchronous APIs, so each is run in a worker
    thread to keep this asynchronous FastAPI handler responsive.
    """
    try:
        decision = await asyncio.wait_for(
            _evaluate_prompt(request.prompt),
            timeout=INFERENCE_TIMEOUT_SECONDS,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except asyncio.TimeoutError as exc:
        logger.error("Local decision engine timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The local decision engine timed out.",
        ) from exc
    except Exception as exc:
        logger.exception("Local decision engine failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The local decision engine is unavailable.",
        ) from exc

    metrics = {
        "decision": decision.get("action"),
        "confidence": decision.get("confidence"),
        "model": decision.get("selected_model"),
        "tier": decision.get("tier"),
        "latency_ms": decision.get("latency_ms"),
    }

    if decision.get("action") == "BLOCK":
        return {
            "status": "blocked",
            "metrics": metrics,
            "response": "Request blocked by safety guardrails.",
        }

    model_id = GEMINI_MODEL

    context = ContextManager(token_limit=CONTEXT_TOKEN_LIMIT).prune(
        [ContextItem(role="user", content=request.prompt)],
        latest_user_query=request.prompt,
    )
    request_body = json.dumps(
        {
            "contents": [
                {
                    "parts": [{"text": context.messages[0]["content"]}],
                }
            ],
            "generationConfig": {"maxOutputTokens": 1024},
        }
    ).encode("utf-8")

    try:
        gemini_payload = await asyncio.wait_for(
            _invoke_gemini(model_id, request_body),
            timeout=INFERENCE_TIMEOUT_SECONDS,
        )
        generated_text = _extract_gemini_text(gemini_payload)
    except InferenceConfigurationError as exc:
        logger.error("Inference configuration is missing")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inference provider is not configured.",
        ) from exc
    except asyncio.TimeoutError as exc:
        logger.error("Inference provider invocation timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The inference provider timed out.",
        ) from exc
    except urllib.error.HTTPError as exc:
        logger.error("Inference provider returned HTTP %s", exc.code)
        detail = (
            "Inference provider authentication failed."
            if exc.code in {401, 403}
            else "Inference provider could not generate a response."
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        ) from exc
    except urllib.error.URLError as exc:
        logger.error("Inference provider network request failed: %s", exc.reason)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Inference provider could not be reached.",
        ) from exc
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        logger.exception("Invalid inference provider response")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Inference provider returned an invalid response.",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected inference generation failure")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The upstream model request failed.",
        ) from exc

    return {
        "status": "success",
        "metrics": metrics,
        "response": generated_text,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
