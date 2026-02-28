# Hills Pet Nutrition Chatbot - Project Guide

## Architecture
- **Frontend**: React SPA (Vite) - `src/App.jsx`, `src/App.css`
- **Backend**: FastAPI + Claude AI (Anthropic) - `backend/main.py`
- **Database**: Supabase (PostgreSQL) - product catalog, breed comments
- **Bilingual**: Korean (default) + English (`lang` param, `T.ko`/`T.en` strings)
- **Hosting**: Replit (deploy) + GitHub (source)

## Key Files
- `src/App.jsx` - Main frontend, all UI logic, step flow, bilingual strings
- `src/App.css` - All styles
- `backend/main.py` - FastAPI endpoints: parse-intent, recommend, breed-comment, classify-concerns
- `sql/` - Supabase SQL scripts (breed_comments_en, etc.)

## Git Workflow
- Worktree branch: `claude/[name]` -> push to `main` via `git push origin claude/[name]:main`
- Replit auto-commits "Published your App" (empty commits, can cause rebase conflicts)
- After push: Replit needs `git fetch origin && git reset --hard origin/main`

## Current Flow
```
User input -> parse-intent (Claude) -> Fixed steps: PET_TYPE -> BREED -> AGE -> BODY -> FOOD_FORM -> CONCERNS -> RECOMMEND
```

## ROADMAP: Smart Hybrid Refactoring (Post-Demo)

### Problem
Current chatbot is a "smart survey form" - Claude is used only as a parser, not a conversation partner. Fixed step sequence feels robotic regardless of user input.

### Goal
Make the chatbot feel like talking to Claude/ChatGPT while maintaining structured product recommendations.

### Architecture Change
```
CURRENT: User input -> Claude parses -> fixed next step -> template response
TARGET:  User input -> Claude decides what to ask + generates natural response -> only asks what's missing
```

### Key Changes
1. **AI-driven flow**: Replace `getNextStep()` with Claude deciding what info is still needed
2. **AI-generated responses**: Replace template strings with contextual, natural responses
3. **Conversation history**: Pass full chat history to Claude each turn for context
4. **Smart handling**: Contradictions, off-topic, follow-up questions all handled naturally
5. **Post-recommendation chat**: User can ask "why this product?" and get real answers

### Constraints
- Cost: ~$0.01/turn with Sonnet, 5-6 turns per session = ~$0.05/session
- Latency: 1-2s per turn acceptable
- Quality: Must still recommend correct Hill's products (structured data backbone)
- Bilingual: Must work in both KO and EN

### Priority
This refactoring starts AFTER the demo milestone is complete.
