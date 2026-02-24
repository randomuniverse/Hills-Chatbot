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
    special_notes: Optional[str] = None

class ParseSpecialRequest(BaseModel):
    text: str
    pet_type: str
    life_stage: str

@app.post("/api/parse-intent")
async def parse_intent(req: IntentRequest):
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
    try:
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except (json.JSONDecodeError, IndexError, KeyError):
        return {"pet_type": None, "concerns": [], "sympathy_msg": "말씀해주신 내용을 확인했어요.", "missing": []}

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
    try:
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        data = json.loads(raw)
        return {"concerns": [c for c in data.get("concerns",[]) if c in categories]}
    except (json.JSONDecodeError, IndexError, KeyError):
        return {"concerns": []}

class ChatFallbackRequest(BaseModel):
    text: str
    current_step: str

@app.post("/api/chat-fallback")
async def chat_fallback(req: ChatFallbackRequest):
    step_context = {
        "CONFIRM_PARSE": "보호자의 고민을 파악한 후 맞춤 추천을 시작할지 확인 중",
        "AUTH_PROMPT": "회원 여부 확인 단계",
        "PET_TYPE": "반려동물 종류(강아지/고양이) 선택 단계",
        "BREED": "품종 선택 단계",
        "AGE": "나이 선택 단계",
        "WEIGHT": "체중 입력 단계",
        "BODY": "체형 선택 단계",
        "CONCERNS": "건강 고민 선택 단계",
        "SPECIAL": "특이사항(임신/약물/수술) 입력 단계",
        "CONFIRM": "입력 내용 최종 확인 단계",
    }
    ctx = step_context.get(req.current_step, "맞춤 사료 추천 진행 중")

    resp = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        system=(
            "당신은 Hills Pet Nutrition 맞춤 사료 추천 챗봇입니다. "
            "보호자와 대화 중이며, 현재 추천 절차를 진행하고 있습니다. "
            "반려동물 사료/건강 관련이 아닌 질문에는 부드럽게 안내하고 추천으로 돌아오도록 유도하세요. "
            "반말이나 존댓말 모두 자연스럽게 대응하며, 항상 친절하고 짧게(1~2문장) 한국어로 답하세요."
        ),
        messages=[{"role":"user","content":(
            f"[현재 단계: {ctx}]\n"
            f"보호자 메시지: \"{req.text}\"\n\n"
            "이 메시지에 적절하게 응답하세요. "
            "반려동물 사료/건강과 관련 없는 이야기라면, "
            "'힐스 펫 플래너는 맞춤 사료 추천에 특화되어 있어요!'라고 안내하고 현재 단계로 돌아가도록 유도하세요. "
            "JSON 아님, 자연스러운 한국어 문장으로만 답하세요."
        )}]
    )
    try:
        reply = resp.content[0].text.strip()
        return {"reply": reply}
    except:
        return {"reply": "힐스 펫 플래너는 맞춤 사료 추천에 특화되어 있어요! 추천을 계속 진행해볼까요?"}

@app.post("/api/parse-special")
async def parse_special(req: ParseSpecialRequest):
    resp = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        system="반려동물 영양 전문 상담사. JSON으로만 응답.",
        messages=[{"role":"user","content":(
            f"보호자 특이사항: \"{req.text}\"\n"
            f"반려동물: {'강아지' if req.pet_type=='dog' else '고양이'}, 생애단계: {req.life_stage}\n\n"
            "아래 JSON으로만 응답:\n"
            "{\n"
            '  "is_pregnant": true/false,\n'
            '  "is_nursing": true/false,\n'
            '  "has_medication": true/false,\n'
            '  "force_rx": true/false,\n'
            '  "add_concerns": ["추가 건강 고민 목록"],\n'
            '  "override_stage": "puppy/adult/senior7/senior11 중 하나 또는 null",\n'
            '  "vet_consult_required": true/false,\n'
            '  "summary": "특이사항 한 줄 요약"\n'
            "}\n\n"
            "임신/수유 중이면 override_stage를 'puppy'로 설정하세요 (임신/수유견에는 퍼피용이 적합).\n"
            "약 복용 중이거나 수술 후면 vet_consult_required를 true로 설정하세요."
        )}]
    )
    try:
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except (json.JSONDecodeError, IndexError, KeyError):
        return {"is_pregnant": False, "is_nursing": False, "has_medication": False, "force_rx": False, "add_concerns": [], "override_stage": None, "vet_consult_required": False, "summary": ""}

def normalize_stage(stage):
    if stage=="puppy":  return ["puppy"]
    if stage=="adult":  return ["adult"]
    return ["senior7","senior11","adult"]

def filter_by_stage(rows, life_stage, special):
    if not rows:
        return rows
    if special and (special.get("is_pregnant") or special.get("is_nursing")):
        puppy_products = [p for p in rows if p.get("life_stage") == "puppy"]
        if puppy_products:
            return puppy_products
    if life_stage in ("senior7", "senior11"):
        rows = [p for p in rows if p.get("life_stage") != "puppy"]
    if life_stage == "puppy":
        rows = [p for p in rows if p.get("life_stage") == "puppy"]
    return rows

@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    special = None
    if req.special_notes and req.special_notes.strip():
        try:
            special_resp = await parse_special(ParseSpecialRequest(
                text=req.special_notes,
                pet_type=req.pet_type,
                life_stage=req.life_stage
            ))
            special = special_resp
        except:
            pass

    effective_stage = req.life_stage
    if special and special.get("override_stage"):
        effective_stage = special["override_stage"]

    stages = normalize_stage(effective_stage)
    query = supabase.table("products").select("*") \
        .eq("pet_type", req.pet_type).in_("life_stage", stages)
    if req.size != "all":
        query = query.in_("size_category", [req.size, "all"])

    rows = query.execute().data or []
    if not rows:
        raise HTTPException(404, "추천 가능한 제품이 없습니다.")

    rows = filter_by_stage(rows, effective_stage, special)

    all_concerns = list(req.health_concerns)
    if special and special.get("add_concerns"):
        all_concerns = list(set(all_concerns + special["add_concerns"]))

    def score(p):
        return len(set(all_concerns) & set(p.get("health_benefits") or []))
    rows.sort(key=score, reverse=True)

    general = [p for p in rows if not p.get("is_prescription")]
    rx      = [p for p in rows if p.get("is_prescription")]

    if special and (special.get("vet_consult_required") or special.get("force_rx")):
        top = (general[:4] + rx[:3])[:7]
    else:
        top = (general[:5] + rx[:2])[:7]

    if not top:
        raise HTTPException(404, "조건에 맞는 제품이 없습니다.")

    summary = "\n".join([
        f"[{i+1}] {p['product_name_kr']} ({p.get('brand','')}) "
        f"| 효능: {', '.join(p.get('health_benefits') or [])} "
        f"| 처방식: {'예' if p.get('is_prescription') else '아니오'} "
        f"| {(p.get('description') or '')[:80]}"
        for i,p in enumerate(top)
    ])

    body_label = {"underweight":"마름","normal":"정상","overweight":"과체중"}.get(req.body_condition,"정상")
    concerns   = ", ".join(all_concerns) if all_concerns else "없음"
    pet_name   = req.pet_name or "반려동물"
    special_summary = special.get("summary","") if special else ""
    vet_required = special.get("vet_consult_required", False) if special else False

    prompt = f"""
반려동물 정보:
- 이름: {pet_name} / 종류: {"강아지" if req.pet_type=="dog" else "고양이"} ({req.breed or "품종 미입력"})
- 생애단계: {effective_stage} / 체형: {body_label} / 건강고민: {concerns}
- 특이사항: {special_summary or "없음"}
- 수의사 상담 필요: {"예" if vet_required else "아니오"}

Hills 제품 후보:
{summary}

최적 1~3개 선택 후 JSON으로만 응답:
{{
  "selected_indices": [1, 2],
  "overall_reasoning": "전체 추천 이유 150자 이내 한국어. 특이사항 반영.",
  "individual_reasons": ["제품1 이유", "제품2 이유"],
  "prescription_note": "처방식 포함 또는 수의사 상담 필요 시 안내 문구, 없으면 null",
  "special_warning": "임신/수유/약복용 등 특이사항 관련 주의사항, 없으면 null"
}}"""

    resp = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system="Hills Pet Nutrition 공식 영양 상담사. 처방식은 수의사 상담 필수 안내. JSON으로만 응답.",
        messages=[{"role":"user","content":prompt}]
    )
    try:
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        ai = json.loads(raw)
    except (json.JSONDecodeError, IndexError, KeyError):
        ai = {"selected_indices": [1], "overall_reasoning": "", "individual_reasons": [], "prescription_note": None, "special_warning": None}

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
        "special_warning": ai.get("special_warning"),
    }

@app.get("/health")
def health(): return {"status":"ok"}
