# Pet Life Planner (Hills Pet Nutrition)

## Overview
A chatbot-style web application that recommends Hills Pet Nutrition products based on pet information. Users answer questions about their pet (type, breed, age, weight, body condition, health concerns) and receive AI-powered personalized food recommendations.

## Architecture
- **Frontend**: React 18 + Vite, served on port 5000
- **Backend**: FastAPI (Python), served on port 8000
- **API Proxy**: Vite proxies `/api/*` requests to the backend
- **External Services**: Supabase (product database), Anthropic Claude (AI recommendations)

## Project Structure
```
├── index.html
├── package.json
├── vite.config.js
├── start.sh
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── App.css
└── backend/
    ├── __init__.py
    ├── main.py
    └── requirements.txt
```

## Required Secrets
- `SUPABASE_URL` - Supabase Project URL
- `SUPABASE_ANON_KEY` - Supabase anon public key
- `ANTHROPIC_API_KEY` - Anthropic API key

## How It Works
1. Frontend presents a step-by-step chat interface
2. User selects pet type, enters name, breed, age, weight, body condition, health concerns
3. On confirmation, frontend POSTs to `/api/recommend`
4. Backend queries Supabase `products` table, scores candidates by health concern match
5. Top candidates sent to Claude for final selection and reasoning
6. Results displayed as product cards with recommendation reasons

## Recent Changes
- Initial setup (Feb 2026)
