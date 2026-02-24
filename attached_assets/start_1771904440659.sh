#!/bin/bash

echo "🐾 펫 라이프 플래너 시작 중..."

# 백엔드 의존성 설치 및 실행
echo "📦 백엔드 설치 중..."
pip install -r backend/requirements.txt -q

echo "🚀 백엔드 서버 시작..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

# 프론트엔드
echo "📦 프론트엔드 설치 중..."
npm install -q

echo "🎨 프론트엔드 시작..."
npm run dev -- --host 0.0.0.0 --port 3000
