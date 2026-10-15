"""Tests for the Phase 1 context manager."""

from __future__ import annotations

import pytest

from backend.context_manager import ContextItem, ContextManager


def test_context_stays_within_configured_limit() -> None:
    manager = ContextManager(token_limit=12)
    result = manager.prune(
        [
            ContextItem("system", "Follow the safety policy.", is_important=True),
            ContextItem("user", "An old request " * 10),
            ContextItem("assistant", "An old answer " * 10),
            ContextItem("user", "What is the latest result?"),
        ]
    )
    assert result.token_count <= result.token_limit
    assert result.pruned_count > 0


def test_latest_user_query_is_preserved() -> None:
    manager = ContextManager(token_limit=8)
    query = "Summarize the final report."
    result = manager.prune(
        [
            ContextItem("user", "Earlier question " * 8),
            ContextItem("assistant", "Earlier answer " * 8),
        ],
        latest_user_query=query,
    )
    assert result.items[-1].content == query
    assert result.items[-1].role == "user"


def test_important_instructions_are_selected_before_optional_history() -> None:
    manager = ContextManager(token_limit=15)
    instruction = ContextItem(
        "developer",
        "Always answer using the approved format.",
        is_important=True,
    )
    result = manager.prune(
        [
            ContextItem("user", "low value history " * 10),
            instruction,
            ContextItem("user", "What should I do next?"),
        ]
    )
    assert any(
        item.role == "developer"
        and item.content.startswith("Always answer using")
        for item in result.items
    )


def test_relevant_tool_result_beats_low_priority_history() -> None:
    manager = ContextManager(token_limit=16)
    tool_result = ContextItem(
        "tool",
        "The deployment health check is green.",
        priority=5,
        relevance=1.0,
        tool_name="health_check",
    )
    result = manager.prune(
        [
            ContextItem("user", "old context " * 10, priority=0),
            tool_result,
            ContextItem("user", "Is the deployment ready?"),
        ]
    )
    assert any(
        item.role == "tool" and item.tool_name == "health_check"
        for item in result.items
    )


def test_required_context_is_compacted_when_budget_is_tiny() -> None:
    manager = ContextManager(token_limit=2)
    result = manager.prune(
        [
            ContextItem(
                "system",
                "This is a long safety instruction that must be retained.",
                is_important=True,
            ),
            ContextItem("user", "Latest query"),
        ]
    )
    assert result.items
    assert result.token_count <= 2


def test_messages_are_provider_neutral() -> None:
    result = ContextManager(token_limit=20).prune(
        [ContextItem("user", "Hello")]
    )
    assert result.messages == [{"role": "user", "content": "Hello"}]


@pytest.mark.parametrize("limit", [0, -1])
def test_invalid_token_limit_is_rejected(limit: int) -> None:
    with pytest.raises(ValueError, match="token_limit"):
        ContextManager(token_limit=limit)


def test_blank_latest_query_is_rejected() -> None:
    with pytest.raises(ValueError, match="latest_user_query"):
        ContextManager().prune([], latest_user_query=" ")
