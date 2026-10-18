"""
OpenAI-compatible HTTP Target — sends real requests to any OpenAI-compatible API.

Supports:
- OpenAI API (api.openai.com)
- Azure OpenAI
- Local models via LM Studio, Ollama, llama.cpp server, etc.
- Any endpoint that accepts the /v1/chat/completions format

Required config keys:
    api_key    : Bearer token (use "none" or "ollama" for local servers that don't need one)
    model      : Model name, e.g. "gpt-4o", "gpt-3.5-turbo", "llama3", etc.

Optional config keys:
    base_url   : API base URL (default: https://api.openai.com/v1)
    system_prompt : System prompt to send as the first message (default: none)
    max_tokens : Max tokens in response (default: 512)
    temperature: Sampling temperature (default: 0.0 for deterministic results)
    timeout    : Request timeout in seconds (default: 30)
"""
from __future__ import annotations
import time
import json
from typing import Optional, List, Dict, Any

import urllib.request
import urllib.error

from app.security.targets.base import BaseTarget
from app.security.scenarios.base import TargetResponse


class OpenAITarget(BaseTarget):
    """
    Target adapter for any OpenAI-compatible chat completions endpoint.
    Uses only the stdlib urllib so no extra dependencies are required.
    """

    name = "openai"
    description = "OpenAI-compatible HTTP target (real API calls)"

    DEFAULT_BASE_URL = "https://api.openai.com/v1"

    def __init__(self, hardened: bool = False, config: Optional[Dict[str, Any]] = None):
        self.hardened = hardened
        cfg = config or {}

        self.api_key: str = str(cfg.get("api_key", ""))
        self.model: str = str(cfg.get("model", "gpt-4o-mini"))
        self.base_url: str = str(cfg.get("base_url", self.DEFAULT_BASE_URL)).rstrip("/")
        self.system_prompt: Optional[str] = cfg.get("system_prompt") or None
        self.max_tokens: int = int(cfg.get("max_tokens", 512))
        self.temperature: float = float(cfg.get("temperature", 0.0))
        self.timeout: int = int(cfg.get("timeout", 30))

    # ──────────────────────────────────────────────────────────────────────────

    def send(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> TargetResponse:
        start = time.time()
        try:
            messages: List[Dict[str, str]] = []

            # Prefer caller-supplied system_prompt, then instance default
            effective_system = system_prompt or self.system_prompt
            if effective_system:
                messages.append({"role": "system", "content": effective_system})

            # Replay prior conversation turns
            if conversation_history:
                messages.extend(conversation_history)

            messages.append({"role": "user", "content": message})

            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
            }

            body = json.dumps(payload).encode("utf-8")
            url = f"{self.base_url}/chat/completions"

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            }

            req = urllib.request.Request(url, data=body, headers=headers, method="POST")

            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8")

            data = json.loads(raw)
            # content can be null when the model only returns tool_calls
            text = data["choices"][0]["message"].get("content") or ""

            # Surface any tool calls the model made (OpenAI format)
            tool_calls_raw = data["choices"][0]["message"].get("tool_calls") or []
            tool_calls = []
            for tc in tool_calls_raw:
                fn = tc.get("function", {})
                try:
                    args = json.loads(fn.get("arguments", "{}"))
                except (json.JSONDecodeError, TypeError):
                    args = {}
                tool_calls.append({"name": fn.get("name", ""), "arguments": args})

            duration_ms = int((time.time() - start) * 1000)
            return TargetResponse(
                text=text,
                tool_calls=tool_calls,
                duration_ms=duration_ms,
                raw=data,
            )

        except urllib.error.HTTPError as e:
            body_text = ""
            try:
                body_text = e.read().decode("utf-8")
            except Exception:
                pass
            return TargetResponse(
                text="",
                error=f"HTTP {e.code}: {body_text or e.reason}",
                duration_ms=int((time.time() - start) * 1000),
            )
        except Exception as e:
            return TargetResponse(
                text="",
                error=f"OpenAI target error: {str(e)}",
                duration_ms=int((time.time() - start) * 1000),
            )

    def get_config_snapshot(self) -> Dict[str, Any]:
        # Never include the real api_key in persisted snapshots
        masked_key = ""
        if self.api_key:
            n = len(self.api_key)
            visible = self.api_key[:6] if n > 6 else self.api_key
            masked_key = visible + "*" * max(0, n - len(visible))

        return {
            "name": self.name,
            "type": "OpenAITarget",
            "model": self.model,
            "base_url": self.base_url,
            "api_key": masked_key,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "hardened": self.hardened,
        }
