#!/bin/bash

echo "🐾 펫 라이프 플래너 시작 중..."

echo "📦 백엔드 설치 중..."
pip install -r backend/requirements.txt -q

echo "🚀 백엔드 서버 시작..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "📦 프론트엔드 설치 중..."
npm install -q

echo "🎨 프론트엔드 시작..."
npm run dev

# 프론트엔드 종료 시 백엔드도 같이 종료
kill $BACKEND_PID 2>/dev/null
