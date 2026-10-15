"""Context budgeting and pruning for Polyglot Proxy requests.

The manager is intentionally independent of FastAPI and any model provider.
Callers provide ordered context items, and the manager returns the highest-value
items that fit the configured token budget while preserving required context.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Literal

ContextRole = Literal["system", "developer", "user", "assistant", "tool"]


@dataclass(frozen=True)
class ContextItem:
    """A unit of conversation, instruction, or tool output."""

    role: ContextRole
    content: str
    priority: int = 0
    relevance: float = 0.0
    is_important: bool = False
    tool_name: str | None = None

    @property
    def required(self) -> bool:
        """Whether this item should be retained before optional context."""
        return self.is_important or self.role in {"system", "developer"}


@dataclass(frozen=True)
class PrunedContext:
    """The result of applying a context budget."""

    items: tuple[ContextItem, ...]
    token_count: int
    token_limit: int
    pruned_count: int

    @property
    def messages(self) -> list[dict[str, str]]:
        """Return provider-neutral message dictionaries."""
        return [{"role": item.role, "content": item.content} for item in self.items]


class ContextManager:
    """Keep important context and the latest user query within a token budget."""

    def __init__(self, token_limit: int = 4096) -> None:
        if token_limit < 1:
            raise ValueError("token_limit must be at least 1.")
        self.token_limit = token_limit

    @staticmethod
    def estimate_tokens(content: str) -> int:
        """Estimate tokens without requiring a provider tokenizer.

        A conservative approximation is used for budgeting: whitespace-delimited
        words plus punctuation/subword overhead. Provider-specific tokenizers can
        still apply a stricter limit later.
        """
        if not content.strip():
            return 1
        words = content.split()
        return max(1, sum(max(1, (len(word) + 3) // 4) for word in words))

    def prune(
        self,
        items: Iterable[ContextItem],
        *,
        latest_user_query: str | None = None,
    ) -> PrunedContext:
        """Select context that fits the budget.

        Required instructions are retained first. The latest query is always
        retained; if the required set exceeds the budget, required content is
        compacted rather than silently dropped. Optional items are then selected
        by priority, relevance, and recency. Returned items preserve their
        original conversation order.
        """
        source = list(items)
        if latest_user_query is not None:
            if not latest_user_query.strip():
                raise ValueError("latest_user_query must not be blank.")
            if not any(
                item.role == "user" and item.content == latest_user_query
                for item in source
            ):
                source.append(ContextItem(role="user", content=latest_user_query))

        if not source:
            raise ValueError("At least one context item is required.")

        latest_index = max(
            (index for index, item in enumerate(source) if item.role == "user"),
            default=len(source) - 1,
        )
        required_indices = {
            index for index, item in enumerate(source) if item.required
        }
        required_indices.add(latest_index)

        selected: set[int] = set()
        remaining = self.token_limit

        # Reserve required items first. Required text is compacted only when
        # their combined estimate cannot fit the configured budget.
        # The latest query is the non-negotiable anchor. Other required items
        # are retained next, and may be compacted if the budget is too small.
        required_order = [latest_index] + [
            index for index in sorted(required_indices) if index != latest_index
        ]
        required_total = sum(
            self.estimate_tokens(source[index].content) for index in required_order
        )
        if required_total > self.token_limit:
            for index in required_order:
                if remaining <= 0:
                    break
                item = source[index]
                kept_content = self._truncate_to_budget(item.content, remaining)
                selected.add(index)
                source[index] = ContextItem(
                    role=item.role,
                    content=kept_content,
                    priority=item.priority,
                    relevance=item.relevance,
                    is_important=item.is_important,
                    tool_name=item.tool_name,
                )
                remaining -= min(
                    remaining, self.estimate_tokens(kept_content)
                )
        else:
            for index in required_order:
                selected.add(index)
                remaining -= self.estimate_tokens(source[index].content)

        optional_indices = [
            index for index in range(len(source)) if index not in selected
        ]
        optional_indices.sort(
            key=lambda index: (
                source[index].priority,
                source[index].relevance,
                index,
            ),
            reverse=True,
        )
        for index in optional_indices:
            cost = self.estimate_tokens(source[index].content)
            if cost <= remaining:
                selected.add(index)
                remaining -= cost
            elif source[index].role == "tool" and remaining > 0:
                item = source[index]
                kept_content = self._truncate_to_budget(item.content, remaining)
                source[index] = ContextItem(
                    role=item.role,
                    content=kept_content,
                    priority=item.priority,
                    relevance=item.relevance,
                    is_important=item.is_important,
                    tool_name=item.tool_name,
                )
                selected.add(index)
                remaining = 0

        ordered_indices = sorted(selected)
        selected_items = tuple(source[index] for index in ordered_indices)
        token_count = sum(self.estimate_tokens(item.content) for item in selected_items)
        return PrunedContext(
            items=selected_items,
            token_count=token_count,
            token_limit=self.token_limit,
            pruned_count=len(source) - len(selected_items),
        )

    def _truncate_to_budget(self, content: str, budget: int) -> str:
        """Keep a required item's beginning within the remaining token budget."""
        if budget <= 0:
            return ""
        words: list[str] = []
        used = 0
        for word in content.split():
            cost = self.estimate_tokens(word)
            if used + cost > budget:
                break
            words.append(word)
            used += cost
        if words:
            return " ".join(words)
        # A one-character prefix is the smallest non-empty representation and
        # has a one-token estimate under this provider-neutral heuristic.
        return content.strip()[:1] or "?"
