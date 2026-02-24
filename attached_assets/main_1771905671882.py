import os, json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import anthropic
from supabase import create_client

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])
claude   = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# ── 스키마 ─────────────────────────────────────────────
class IntentRequest(BaseModel):
    text: str

class ClassifyRequest(BaseModel):
    text: str
    pet_type: str

class RecommendRequest(BaseModel):
    pet_type: str
    life_stage: str
    size: str
    body_condition: str
    health_concerns: list[str]
    breed: Optional[str] = None
    pet_name: Optional[str] = None

# ── 1. 자유 입력 의도 파악 ──────────────────────────────
@app.post("/api/parse-intent")
async def parse_intent(req: IntentRequest):
    """사용자의 자유 입력에서 반려동물 종류, 건강 고민, 공감 메시지를 추출"""
    resp = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        system=(
            "당신은 반려동물 영양 전문 상담사입니다. "
            "보호자의 메시지에서 정보를 파악하고 공감하는 한국어로 응답합니다. "
            "JSON 형식으로만 응답하고 다른 텍스트는 포함하지 마세요."
        ),
        messages=[{"role":"user","content":(
            f"보호자 메시지: \"{req.text}\"\n\n"
            "아래 JSON 형식으로만 응답:\n"
            "{\n"
            '  "pet_type": "dog" 또는 "cat" 또는 null,\n'
            '  "concerns": ["소화기계","피부 관리" 등 해당 항목들],\n'
            '  "sympathy_msg": "보호자 감정에 공감하는 따뜻한 한국어 메시지 1~2문장. 문제를 간단히 요약 포함.",\n'
            '  "missing": ["pet_type","age","weight" 등 파악 못한 정보 목록]\n'
            "}\n\n"
            "concerns 가능 값: 소화기계, 체중 관리, 관절 관리, 피부 관리, 신장 관리, 구강 관리, 비뇨기계, 헤어볼\n"
            "sympathy_msg 예시: '눈물 자국 때문에 많이 속상하셨겠어요 😢 피부/모질 관리가 필요한 상황으로 보여요.'"
        )}]
    )
    raw = resp.content[0].text.strip()
    if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
    return json.loads(raw)

# ── 2. 건강 고민 분류 ──────────────────────────────────
@app.post("/api/classify-concerns")
async def classify_concerns(req: ClassifyRequest):
    dog_cats = ["소화기계","체중 관리","관절 관리","피부 관리","신장 관리","구강 관리"]
    cat_cats = ["소화기계","체중 관리","비뇨기계","피부 관리","신장 관리","헤어볼"]
    categories = dog_cats if req.pet_type=="dog" else cat_cats

    resp = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        system="반려동물 영양 전문가. JSON으로만 응답.",
        messages=[{"role":"user","content":(
            f"설명: \"{req.text}\"\n"
            f"카테고리: {', '.join(categories)}\n"
            f"해당 카테고리를 JSON으로: {{\"concerns\": [...]}}"
        )}]
    )
    raw = resp.content[0].text.strip()
    if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
    data = json.loads(raw)
    return {"concerns": [c for c in data.get("concerns",[]) if c in categories]}

# ── 3. 추천 ────────────────────────────────────────────
def normalize_stage(stage):
    if stage=="puppy":  return ["puppy"]
    if stage=="adult":  return ["adult"]
    return ["senior7","senior11","adult"]

@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    stages = normalize_stage(req.life_stage)
    query = supabase.table("products").select("*") \
        .eq("pet_type", req.pet_type).in_("life_stage", stages)
    if req.size != "all":
        query = query.in_("size_category", [req.size, "all"])

    rows = query.execute().data or []
    if not rows:
        raise HTTPException(404, "추천 가능한 제품이 없습니다.")

    def score(p):
        return len(set(req.health_concerns) & set(p.get("health_benefits") or []))
    rows.sort(key=score, reverse=True)

    general = [p for p in rows if not p.get("is_prescription")]
    rx      = [p for p in rows if p.get("is_prescription")]
    top     = (general[:5] + rx[:2])[:7]

    summary = "\n".join([
        f"[{i+1}] {p['product_name_kr']} ({p.get('brand','')}) "
        f"| 효능: {', '.join(p.get('health_benefits') or [])} "
        f"| 처방식: {'예' if p.get('is_prescription') else '아니오'} "
        f"| {(p.get('description') or '')[:80]}"
        for i,p in enumerate(top)
    ])

    body_label = {"underweight":"마름","normal":"정상","overweight":"과체중"}.get(req.body_condition,"정상")
    concerns   = ", ".join(req.health_concerns) if req.health_concerns else "없음"
    pet_name   = req.pet_name or "반려동물"

    prompt = f"""
반려동물 정보:
- 이름: {pet_name} / 종류: {"강아지" if req.pet_type=="dog" else "고양이"} ({req.breed or "품종 미입력"})
- 생애단계: {req.life_stage} / 체형: {body_label} / 건강고민: {concerns}

Hills 제품 후보:
{summary}

최적 1~3개 선택 후 JSON으로만 응답:
{{
  "selected_indices": [1, 2],
  "overall_reasoning": "전체 추천 이유 150자 이내 한국어",
  "individual_reasons": ["제품1 이유", "제품2 이유"],
  "prescription_note": "처방식 포함 시 수의사 상담 안내, 없으면 null"
}}"""

    resp = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system="Hills Pet Nutrition 공식 영양 상담사. 처방식은 수의사 상담 필수 안내. JSON으로만 응답.",
        messages=[{"role":"user","content":prompt}]
    )
    raw = resp.content[0].text.strip()
    if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
    ai = json.loads(raw)

    selected = [top[i-1] for i in ai.get("selected_indices",[1]) if 1<=i<=len(top)]
    reasons  = ai.get("individual_reasons",[])

    return {
        "products": [{
            "id": str(p["id"]),
            "product_name_kr": p["product_name_kr"],
            "brand": p.get("brand",""),
            "health_benefits": p.get("health_benefits") or [],
            "is_prescription": p.get("is_prescription",False),
            "product_url": p.get("product_url",""),
            "image_url": p.get("image_url",""),
            "reasoning": reasons[i] if i<len(reasons) else "",
        } for i,p in enumerate(selected)],
        "overall_reasoning": ai.get("overall_reasoning",""),
        "prescription_note": ai.get("prescription_note"),
    }

@app.get("/health")
def health(): return {"status":"ok"}
