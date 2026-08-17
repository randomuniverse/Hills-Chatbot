---
name: Claude model name for this project
description: Correct Anthropic model ID to use in backend API calls
---

Correct model: `claude-sonnet-4-5-20250929`
Wrong model (returns 404): `claude-sonnet-4-20250514`

**Why:** Model names follow the pattern `claude-<name>-<date>`. The date must match an actual release.
**How to apply:** Verify with `GET /v1/models` against the Anthropic API if unsure. All 4 `model=` lines in backend/main.py use this value.
