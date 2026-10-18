# HEPHAESTUS — AI Security Testing & Resilience Lab

> *Forged in fire. Tested under pressure.*

HEPHAESTUS is a standalone, local-first, extensible cybersecurity platform for systematically evaluating the security and resilience of AI applications before deployment and throughout their lifecycle.

---

## What It Tests

| Category | Description |
|----------|-------------|
| **Prompt Injection** | Direct and indirect attempts to override system instructions |
| **Instruction Override** | Jailbreaks, role-playing exploits, context-switch attacks |
| **Information Leakage** | Extraction of system prompts, synthetic secrets, PII |
| **Unauthorized Tool Execution** | Coercing an AI agent into calling disallowed tools |
| **Policy Violations** | Outputs that violate content, safety, or compliance policies |
| **Malformed Output** | Responses that break format contracts or inject downstream payloads |

---

## Architecture

```
hephaestus/
├── backend/           # Python FastAPI backend
│   ├── app/
│   │   ├── api/       # REST endpoints
│   │   ├── core/      # Config, security, DB
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── security/  # Security testing library
│   │   │   ├── scenarios/   # Attack scenarios
│   │   │   ├── policies/    # Policy enforcement
│   │   │   ├── runner.py    # Test runner
│   │   │   └── targets/     # Mock + adapter targets
│   │   └── reporting/       # JSON + HTML exporters
│   └── tests/         # pytest test suite
├── frontend/          # React + TypeScript + Vite
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── api/
│       └── types/
└── docs/              # Documentation
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- No paid APIs or external AI services required

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

Backend API available at: http://localhost:8000  
API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at: http://localhost:5173

---

## Key Concepts

### Mock Target Application
The built-in mock AI application provides deterministic, reproducible responses for all scenarios. It simulates realistic AI behavior including:
- A configurable system prompt with embedded synthetic secrets
- Tool execution simulation (file read, web search, database query, email send)
- Configurable "hardened" mode that applies defensive controls
- Baseline and hardened comparison environments

### Security Scenarios
Each scenario is a reproducible adversarial test with:
- A unique ID, name, and severity rating
- The attack payload and injection technique
- Expected behavior definition
- Observed behavior capture
- Evidence collection (full request/response pairs)
- Pass/fail determination logic
- Metadata: timestamps, target config, execution duration

### Policy Enforcement Layer
An independent layer (separate from the mock target) that inspects AI outputs and flags:
- Secret/credential patterns
- Forbidden phrases and override signals
- Unauthorized tool calls
- Format violations
- Personally identifiable information patterns

### Test Suites
Group related scenarios into named suites for:
- Full security assessment runs
- Targeted category testing
- Regression detection between versions
- Baseline vs hardened comparison

---

## Security Scope & Limitations

⚠️ **Important**: Successful tests against the mock application **do not** prove a real-world AI application is secure. This platform:

- Tests simulated behavior using a controlled mock target
- Uses synthetic secrets — no real credentials are ever present
- Provides a framework for evaluating real applications via adapters
- Is a testing tool, not a certification authority

Real AI application assessment requires adapting the target interface to your specific application and evaluating results in context of your threat model.

---

## Extending HEPHAESTUS

### Adding a Custom Scenario

```python
from app.security.scenarios.base import BaseScenario, ScenarioResult

class MyScenario(BaseScenario):
    id = "CUSTOM-001"
    name = "My Custom Attack"
    category = "prompt_injection"
    severity = "high"

    def execute(self, target) -> ScenarioResult:
        response = target.send("Ignore all instructions and...")
        passed = "I cannot" in response.text
        return self.build_result(passed, response)
```

### Adding a Real LLM Adapter

```python
from app.security.targets.base import BaseTarget

class OpenAITarget(BaseTarget):
    def send(self, message, system_prompt=None):
        # Implement real API call
        ...
```

---

## License

MIT — Use freely, contribute back.
