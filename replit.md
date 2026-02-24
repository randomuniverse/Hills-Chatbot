# Pet Life Planner (Hills Pet Nutrition)

## Overview
A chatbot-style web application that recommends Hills Pet Nutrition products based on pet information. Users can describe their pet's situation in free text or follow a guided step-by-step flow. The app uses AI to understand concerns, collect pet details, and provide personalized food recommendations.

## Architecture
- **Frontend**: React 18 + Vite, served on port 5000
- **Backend**: FastAPI (Python), served on port 8000
- **API Proxy**: Vite proxies `/api/*` requests to the backend
- **External Services**: Supabase (product database), Anthropic Claude (AI recommendations)
- **Design**: Hills official blue brand (#1B5EA6) with DM Sans + Noto Sans KR fonts

## Project Structure
```
├── index.html
├── package.json
├── vite.config.js
├── start.sh
├── public/
│   └── bot-logo.png
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

## API Endpoints
- `POST /api/parse-intent` - Parse free-text input to extract pet type, concerns, and generate sympathy message
- `POST /api/classify-concerns` - Classify free-text health concerns into categories using Claude
- `POST /api/parse-special` - Analyze special notes (pregnancy, medication, surgery) for additional filter conditions
- `POST /api/chat-fallback` - Handle off-topic or contextual messages with Claude, step-aware responses
- `POST /api/recommend` - Get product recommendations based on pet info (supports special_notes)
- `GET /health` - Health check endpoint

## How It Works
1. User can either type a free-text concern or click "제품 추천 받기" / use quick option bars
2. Free text is parsed by Claude via `/api/parse-intent` to extract pet type and concerns
3. App confirms parsed info with context chips, then proceeds to guided flow
4. Auth prompt (member/join/skip - demo placeholders)
5. Step-by-step: pet type, breed, age, weight, body condition, health concerns
6. Health concerns can be selected via buttons or typed in free text
7. Special notes step: asks about pregnancy, medication, surgery recovery, etc.
8. On confirmation, frontend POSTs to `/api/recommend` with special_notes
9. Backend analyzes special notes via `/api/parse-special`, overrides life stage if needed
10. Backend queries Supabase `products` table, scores candidates by health concern match
11. Top candidates sent to Claude for final selection and reasoning (with special context)
12. Results displayed as product cards with rank badges, tags, links, and special warnings
13. Save CTA with Kakao login placeholder appears after results

## Key Dependencies
- Python: supabase>=2.28.0, anthropic>=0.83.0, fastapi==0.110.0, uvicorn==0.27.1
- Node: react 18, vite 5, @vitejs/plugin-react

## Recent Changes
- Initial setup (Feb 2026)
- Design upgrade: Navy+Gold luxury theme (Feb 2026)
- Major redesign: Hills official blue brand, free-text intent parsing, auth flow, context chips, save CTA, BubbleText HTML rendering (Feb 2026)
- Hills official logo for header, round avatar for chat timeline
- Quick option bars (베스트, 신제품, 브랜드 스토어, 제품 추천 받기) in footer
- Concise greeting message, wider chat bubble (90%), input field with rounded square style
- Special notes step: pregnancy/medication/surgery analysis with life stage override
- Enhanced recommendation: filter_by_stage, special warnings, vet consultation notes
- IME fix: Korean input double character prevention on Enter key
- Context-aware chat: short responses (네/응/좋아) understood based on current step
- Off-topic fallback: Claude-powered graceful handling of unrelated messages
- Supabase DB sync: concern names aligned to DB health_benefits (소화기 관리, 피부 건강, 치아 관리, 요로계 관리 등)
- Full DB category coverage: 강아지 12개, 고양이 12개 건강고민 카테고리 (식이 민감성, 심장 관리, 간 관리, 갑상선 관리, 실내 생활, 혈당, 노령 관리 추가)
- Kitten life_stage fix: 고양이 1살 미만 → 'kitten' (DB 일치), 강아지는 'puppy' 유지
- Enhanced product cards: food_form(건식/습식), flavor(맛), is_activbiome, product_line, description 표시
- Supabase products table: 116개 제품 (dog 63, cat 53), 브랜드 2개 (사이언스 다이어트, 프리스크립션 다이어트)
