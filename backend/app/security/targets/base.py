"""
Base target interface — all target adapters must implement this.
"""
from abc import ABC, abstractmethod
from app.security.scenarios.base import TargetResponse
from typing import Optional, List, Dict, Any


class BaseTarget(ABC):
    """Abstract base class for AI application targets under test."""

    name: str = "base"
    description: str = ""

    @abstractmethod
    def send(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> TargetResponse:
        """
        Send a message to the target and return its response.

        Args:
            message: The user message / attack payload
            system_prompt: Override the default system prompt (if allowed)
            conversation_history: Prior turns for multi-turn tests

        Returns:
            TargetResponse with text, tool_calls, duration, and raw data
        """
        ...

    def get_config_snapshot(self) -> Dict[str, Any]:
        """Return a serializable snapshot of this target's configuration."""
        return {"name": self.name, "type": self.__class__.__name__}
