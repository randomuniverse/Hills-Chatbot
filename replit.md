# Pet Life Planner (Hills Pet Nutrition)

## Overview
A chatbot-style web application that recommends Hills Pet Nutrition products based on pet information. Users answer questions about their pet (type, breed, age, weight, body condition, health concerns) and receive AI-powered personalized food recommendations.

## Architecture
- **Frontend**: React 18 + Vite, served on port 5000
- **Backend**: FastAPI (Python), served on port 8000
- **API Proxy**: Vite proxies `/api/*` requests to the backend
- **External Services**: Supabase (product database), Anthropic Claude (AI recommendations)
- **Design**: Navy + Gold luxury theme with Cormorant Garamond + Noto Sans KR fonts

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
- `SUPABASE_URL` - Supabase Project URL (https://fxcejrgrzihqbswpwpar.supabase.co)
- `SUPABASE_ANON_KEY` - Supabase anon public key (eyJ... format)
- `ANTHROPIC_API_KEY` - Anthropic API key

## API Endpoints
- `POST /api/recommend` - Get product recommendations based on pet info
- `POST /api/classify-concerns` - Classify free-text health concerns into categories using Claude
- `GET /health` - Health check endpoint

## How It Works
1. Frontend presents a step-by-step chat interface with progress bar
2. User selects pet type, enters name, breed, age, weight, body condition, health concerns
3. Health concerns can be selected via buttons or typed in free text (classified by Claude)
4. On confirmation, frontend POSTs to `/api/recommend`
5. Backend queries Supabase `products` table, scores candidates by health concern match
6. Top candidates sent to Claude for final selection and reasoning
7. Results displayed as premium product cards with recommendation reasons, tags, and product links

## Key Dependencies
- Python: supabase>=2.28.0, anthropic>=0.83.0, fastapi, uvicorn
- Node: react 18, vite 5, @vitejs/plugin-react

## Recent Changes
- Initial setup (Feb 2026)
- Design upgrade: Navy+Gold luxury theme with progress bar, product cards, free-text health concern input (Feb 2026)
- Added /api/classify-concerns endpoint for AI-powered free-text health concern classification
- Updated supabase (2.28.0) and anthropic (0.83.0) to resolve httpx compatibility issues
