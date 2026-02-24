import os, json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import anthropic
from supabase import create_client

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
claude = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

# ── 스키마 ─────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    pet_type: str
    life_stage: str
    size: str
    body_condition: str
    health_concerns: list[str]
    breed: Optional[str] = None
    pet_name: Optional[str] = None

class ClassifyRequest(BaseModel):
    text: str
    pet_type: str   # dog / cat

# ── 자유 입력 → 건강 고민 분류 ───────────────────────────
@app.post("/api/classify-concerns")
async def classify_concerns(req: ClassifyRequest):
    dog_cats = ["소화", "체중 관리", "관절", "피부/모질", "신장", "치아"]
    cat_cats = ["소화", "체중 관리", "헤어볼", "피부/모질", "요로계", "신장", "치아"]
    categories = dog_cats if req.pet_type == "dog" else cat_cats

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        system=(
            "당신은 반려동물 영양 상담사입니다. "
            "보호자의 설명을 읽고 해당하는 건강 카테고리를 JSON으로만 반환합니다. "
            "다른 텍스트는 절대 포함하지 마세요."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"보호자 설명: \"{req.text}\"\n\n"
                f"가능한 카테고리: {', '.join(categories)}\n\n"
                f"해당하는 카테고리만 골라서 JSON으로 반환해주세요:\n"
                f'{{ "concerns": ["카테고리1", "카테고리2"] }}'
            )
        }]
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
    data = json.loads(raw)
    # 유효한 카테고리만 필터
    valid = [c for c in data.get("concerns", []) if c in categories]
    return { "concerns": valid }

# ── 추천 ───────────────────────────────────────────────────
def normalize_stage(stage: str) -> list[str]:
    if stage == "puppy": return ["puppy"]
    if stage == "adult": return ["adult"]
    if stage in ("senior7", "senior11"): return ["senior7", "senior11", "adult"]
    return ["adult"]

@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    stages = normalize_stage(req.life_stage)

    query = supabase.table("products").select("*") \
        .eq("pet_type", req.pet_type).in_("life_stage", stages)
    if req.size != "all":
        query = query.in_("size_category", [req.size, "all"])

    result = query.execute()
    candidates = result.data or []
    if not candidates:
        raise HTTPException(status_code=404, detail="추천 가능한 제품이 없습니다.")

    def score(p):
        return len(set(req.health_concerns) & set(p.get("health_benefits") or []))

    candidates.sort(key=score, reverse=True)
    general = [p for p in candidates if not p.get("is_prescription")]
    rx      = [p for p in candidates if p.get("is_prescription")]
    top     = (general[:5] + rx[:2])[:7]

    product_summary = "\n".join([
        f"[{i+1}] {p['product_name_kr']} ({p.get('brand','')}) "
        f"| 효능: {', '.join(p.get('health_benefits') or [])} "
        f"| 처방식: {'예' if p.get('is_prescription') else '아니오'} "
        f"| {(p.get('description') or '')[:80]}"
        for i, p in enumerate(top)
    ])

    pet_name   = req.pet_name or "반려동물"
    body_label = {"underweight":"마름","normal":"정상","overweight":"과체중"}.get(req.body_condition,"정상")
    concerns   = ", ".join(req.health_concerns) if req.health_concerns else "없음"

    user_prompt = f"""
보호자의 반려동물 정보:
- 이름: {pet_name}
- 종류: {"강아지" if req.pet_type == "dog" else "고양이"} ({req.breed or "품종 미입력"})
- 생애 단계: {req.life_stage} / 체형: {body_label}
- 건강 고민: {concerns}

Hills 제품 후보:
{product_summary}

위 제품 중 이 반려동물에게 가장 적합한 1~3개를 선택하고 아래 JSON으로만 응답:
{{
  "selected_indices": [1, 2],
  "overall_reasoning": "전체 추천 이유 (150자 이내, 따뜻한 한국어)",
  "individual_reasons": ["제품1 이유", "제품2 이유"],
  "prescription_note": "처방식 포함 시 수의사 상담 안내 문구, 없으면 null"
}}"""

    resp = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=(
            "당신은 Hills Pet Nutrition 공식 영양 상담사입니다. "
            "수의사 검증 데이터를 바탕으로 추천하며, 처방식은 반드시 수의사 상담을 안내합니다. "
            "JSON 형식으로만 응답하고 다른 텍스트는 포함하지 마세요."
        ),
        messages=[{"role": "user", "content": user_prompt}]
    )

    raw = resp.content[0].text.strip()
    if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
    ai = json.loads(raw)

    selected = [top[i-1] for i in ai.get("selected_indices",[1]) if 1<=i<=len(top)]
    reasons  = ai.get("individual_reasons", [])

    return {
        "products": [
            {
                "id": str(p["id"]),
                "product_name_kr": p["product_name_kr"],
                "brand": p.get("brand",""),
                "health_benefits": p.get("health_benefits") or [],
                "is_prescription": p.get("is_prescription", False),
                "product_url": p.get("product_url",""),
                "image_url": p.get("image_url",""),
                "reasoning": reasons[i] if i < len(reasons) else "",
            }
            for i, p in enumerate(selected)
        ],
        "overall_reasoning": ai.get("overall_reasoning",""),
        "prescription_note": ai.get("prescription_note"),
    }

@app.get("/health")
def health():
    return {"status": "ok"}
