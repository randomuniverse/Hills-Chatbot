import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import anthropic
from supabase import create_client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 환경변수 ──────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
claude = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

# ── 요청 스키마 ───────────────────────────────────────────
class RecommendRequest(BaseModel):
    pet_type: str           # dog / cat
    life_stage: str         # puppy / adult / senior7 / senior11
    size: str               # small / large / all
    body_condition: str     # underweight / normal / overweight
    health_concerns: list[str]  # ["소화", "체중 관리"] or []
    breed: Optional[str] = None
    pet_name: Optional[str] = None

# ── 나이 → 시니어 매핑 ───────────────────────────────────
def normalize_stage(stage: str) -> list[str]:
    """Supabase 필터용 stage 목록 반환"""
    if stage == "puppy":
        return ["puppy"]
    elif stage == "adult":
        return ["adult"]
    elif stage in ("senior7", "senior11"):
        return ["senior7", "senior11", "adult"]
    return ["adult"]

# ── 추천 엔드포인트 ───────────────────────────────────────
@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    # 1. Supabase에서 후보 제품 필터링
    stages = normalize_stage(req.life_stage)
    
    query = supabase.table("products") \
        .select("*") \
        .eq("pet_type", req.pet_type) \
        .in_("life_stage", stages)

    if req.size != "all":
        query = query.in_("size_category", [req.size, "all"])

    result = query.execute()
    candidates = result.data or []

    if not candidates:
        raise HTTPException(status_code=404, detail="추천 가능한 제품이 없습니다.")

    # 2. 건강 고민 기반 점수 정렬 (교집합 클수록 앞으로)
    def score(p):
        benefits = p.get("health_benefits") or []
        return len(set(req.health_concerns) & set(benefits))

    candidates.sort(key=score, reverse=True)

    # 3. 처방식 / 일반 분리
    general = [p for p in candidates if not p.get("is_prescription")]
    rx = [p for p in candidates if p.get("is_prescription")]
    top_candidates = (general[:5] + rx[:2])[:7]

    # 4. Claude에 전달할 제품 요약
    product_summary = "\n".join([
        f"[{i+1}] {p['product_name_kr']} ({p['brand']}) "
        f"| 건강효능: {', '.join(p.get('health_benefits') or [])} "
        f"| 처방식: {'예' if p.get('is_prescription') else '아니오'} "
        f"| 설명: {(p.get('description') or '')[:100]}"
        for i, p in enumerate(top_candidates)
    ])

    pet_name = req.pet_name or "반려동물"
    concerns_text = ", ".join(req.health_concerns) if req.health_concerns else "없음"
    body_map = {"underweight": "마름", "normal": "정상", "overweight": "과체중"}

    user_prompt = f"""
보호자의 반려동물 정보:
- 이름: {pet_name}
- 종류: {"강아지" if req.pet_type == "dog" else "고양이"}
- 품종: {req.breed or "미입력"}
- 생애 단계: {req.life_stage}
- 체형: {body_map.get(req.body_condition, "정상")}
- 건강 고민: {concerns_text}

추천 가능한 Hills 제품 목록:
{product_summary}

위 제품 중 이 반려동물에게 가장 적합한 1~3개를 선택하고,
다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{{
  "selected_indices": [1, 2],
  "overall_reasoning": "전체 추천 이유 (150자 이내, 따뜻한 한국어)",
  "individual_reasons": ["제품1 추천 이유", "제품2 추천 이유"],
  "prescription_note": "처방식이 포함된 경우 수의사 상담 안내 문구, 없으면 null"
}}
"""

    # 5. Claude API 호출
    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=(
            "당신은 Hills Pet Nutrition 공식 영양 상담사입니다. "
            "수의사 검증 데이터를 바탕으로 과학적으로 추천합니다. "
            "처방식이 포함된 경우 반드시 수의사 상담을 안내합니다. "
            "JSON 형식으로만 응답하고 다른 텍스트는 포함하지 마세요."
        ),
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = response.content[0].text.strip()
    # JSON 파싱
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    ai = json.loads(raw.strip())

    # 6. 결과 조합
    selected = [top_candidates[i - 1] for i in ai.get("selected_indices", [1]) if 1 <= i <= len(top_candidates)]
    reasons = ai.get("individual_reasons", [])

    products_out = []
    for idx, p in enumerate(selected):
        products_out.append({
            "id": str(p["id"]),
            "product_name_kr": p["product_name_kr"],
            "brand": p.get("brand", ""),
            "health_benefits": p.get("health_benefits") or [],
            "product_url": p.get("product_url", ""),
            "is_prescription": p.get("is_prescription", False),
            "reasoning": reasons[idx] if idx < len(reasons) else "",
        })

    return {
        "products": products_out,
        "overall_reasoning": ai.get("overall_reasoning", ""),
        "prescription_note": ai.get("prescription_note"),
    }

@app.get("/health")
def health():
    return {"status": "ok"}
