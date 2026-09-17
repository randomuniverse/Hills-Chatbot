---
name: Supabase free-tier auto-pause
description: Supabase free plan pauses project after 7 days of inactivity, removing DNS entry
---

Supabase free tier can pause after sustained inactivity.
Symptoms observed: `[Errno -2] Name or service not known` or HTTP 521 on DB queries.

**Rule:** Do not use an in-process sleep loop for keepalive on an Autoscale deployment. Use an external scheduler that calls the public keepalive endpoint.

**Why:** Autoscale suspends the app process when there is no traffic, so an asyncio task waiting several days is destroyed before it can run.

**How to apply:** The GitHub Actions workflow calls the production keepalive endpoint daily. The endpoint wakes Replit and performs a real Supabase query, returning an error if the database is unavailable. Both the app change and workflow must be published/pushed. A project already paused must still be restored manually once.
