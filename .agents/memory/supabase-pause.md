---
name: Supabase free-tier auto-pause
description: Supabase free plan pauses project after 7 days of inactivity, removing DNS entry
---

Supabase free tier removes the project's DNS entry after ~7 days of no API calls.
Symptom: `[Errno -2] Name or service not known` on any DB query.
Fix applied: asyncio background task in backend/main.py pings Supabase every 4 days.

**Why:** Keepalive must run inside the deployed app process — external cron not available.
**How to apply:** If the app is redeployed fresh, confirm the keepalive task starts on startup (`Supabase keepalive task started` in logs).
If paused again, user must manually restore via supabase.com dashboard before the app works.
