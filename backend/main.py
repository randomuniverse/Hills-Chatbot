import os, json, time, logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import anthropic
from supabase import create_client
from pathlib import Path
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hills-chatbot")

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])
claude   = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"], timeout=30.0)

_db_categories = {"dog": [], "cat": [], "last_refresh": 0}
CATEGORY_REFRESH_INTERVAL = 300

# Load product image mapping (product_url -> image_url)
_images_path = Path(__file__).resolve().parent / "product_images.json"
_product_images = {}
if _images_path.exists():
    with open(_images_path) as f:
        _product_images = json.load(f)
    logger.info(f"Loaded {len(_product_images)} product images")

def refresh_categories():
    try:
        rows = supabase.table("products").select("pet_type, health_benefits").execute().data or []
        dog_set, cat_set = set(), set()
        for r in rows:
            for b in (r.get("health_benefits") or []):
                if b == "일반":
                    continue
                if r["pet_type"] == "dog":
                    dog_set.add(b)
                else:
                    cat_set.add(b)
        _db_categories["dog"] = sorted(dog_set)
        _db_categories["cat"] = sorted(cat_set)
        _db_categories["last_refresh"] = time.time()
    except Exception as e:
        logger.warning(f"Failed to refresh categories from DB: {e}")

def get_concerns(pet_type):
    if time.time() - _db_categories["last_refresh"] > CATEGORY_REFRESH_INTERVAL:
        refresh_categories()
    return _db_categories.get(pet_type, _db_categories.get("dog", []))

@app.on_event("startup")
def on_startup():
    refresh_categories()
    logger.info(f"Loaded categories - dog: {len(_db_categories['dog'])}, cat: {len(_db_categories['cat'])}")

@app.get("/api/categories")
def get_categories():
    if time.time() - _db_categories["last_refresh"] > CATEGORY_REFRESH_INTERVAL:
        refresh_categories()
    return {"dog": _db_categories["dog"], "cat": _db_categories["cat"]}

@app.post("/api/refresh-categories")
def force_refresh():
    refresh_categories()
    return {"dog": _db_categories["dog"], "cat": _db_categories["cat"], "refreshed_at": _db_categories["last_refresh"]}

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
    try:
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
                "먼저 이 메시지가 반려동물, 사료, 건강, 펫 관련 주제인지 판단하세요.\n"
                "전혀 관련 없는 메시지(욕설, 장난, 스팸, 무관한 주제)라면 is_relevant를 false로 설정하세요.\n\n"
                "아래 JSON 형식으로만 응답:\n"
                "{\n"
                '  "is_relevant": true 또는 false (반려동물/사료/건강 관련 여부),\n'
                '  "pet_type": "dog" 또는 "cat" 또는 null,\n'
                '  "age_category": "puppy"(1살미만) 또는 "adult"(1~7살) 또는 "senior7"(7~11살) 또는 "senior11"(11살이상) 또는 null,\n'
                '  "concerns": ["소화기 관리","피부 건강" 등 해당 항목들],\n'
                '  "sympathy_msg": "보호자 감정에 공감하는 따뜻한 한국어 메시지 1~2문장. 문제를 간단히 요약 포함.",\n'
                '  "missing": ["pet_type","age","weight" 등 파악 못한 정보 목록]\n'
                "}\n\n"
                "나이 판단 기준: 1살 미만=puppy, 1~7살=adult, 7~11살=senior7, 11살 이상=senior11\n"
                f"concerns 가능 값(강아지): {', '.join(get_concerns('dog'))}\n"
                f"concerns 가능 값(고양이): {', '.join(get_concerns('cat'))}\n"
                "\n★ 중요 규칙:\n"
                "1. concerns에는 반드시 위 '가능 값' 목록에 있는 정확한 문자열만 사용하세요. '암 환자 지원', '응급 관리' 등 목록에 없는 값을 절대 만들지 마세요.\n"
                "   - 암/종양 진단 → concerns는 빈 배열[]로 두고, sympathy_msg에서 수의사 상담을 강력히 권고하세요.\n"
                "   - 사료를 안 먹음/기호성 문제/입맛 → concerns를 빈 배열로 두고, sympathy_msg에서 기호성 문제에 공감하세요.\n"
                "2. 당뇨, 신장질환, 암, 방광결석 등 진단받은 질환이 언급되면 sympathy_msg에 '수의사와 상담 후 처방식을 선택하시는 것이 중요합니다'를 반드시 포함하세요.\n"
                "3. 보호자의 요청과 실제 상황이 모순될 때 (예: 2살인데 노령견 사료 요청) sympathy_msg에서 나이에 맞는 사료가 더 적합하다고 부드럽게 교정해주세요.\n"
                "4. '갓 태어난', '신생아', '생후 며칠' 등 생후 4주 미만 동물은 사료를 먹을 수 없습니다. is_relevant=true로 두되, concerns=[]로 하고 sympathy_msg에 '아직 사료를 먹기 어려운 시기예요. 어미의 모유 수유가 가장 중요하며, 어려운 경우 전용 분유를 사용해주세요. 수의사와 상담을 권장드립니다.'라고 안내하세요.\n"
                "\nsympathy_msg 예시: '눈물 자국 때문에 많이 속상하셨겠어요 😢 피부/모질 관리가 필요한 상황으로 보여요.'\n"
                "is_relevant가 false인 경우: pet_type=null, age_category=null, concerns=[], sympathy_msg는 빈 문자열로 설정"
            )}]
        )
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        data = json.loads(raw)
        valid = set(get_concerns("dog")) | set(get_concerns("cat"))
        data["concerns"] = [c for c in data.get("concerns", []) if c in valid]
        return data
    except json.JSONDecodeError:
        logger.warning(f"parse-intent: JSON parse failed for input: {req.text[:50]}")
        return {"is_relevant": True, "pet_type": None, "concerns": [], "sympathy_msg": "말씀해주신 내용을 확인했어요.", "missing": []}
    except anthropic.APITimeoutError:
        logger.error("parse-intent: Claude API timeout")
        raise HTTPException(504, "AI 응답 시간이 초과되었습니다. 다시 시도해주세요.")
    except Exception as e:
        logger.error(f"parse-intent error: {e}")
        return {"is_relevant": True, "pet_type": None, "concerns": [], "sympathy_msg": "말씀해주신 내용을 확인했어요.", "missing": []}

@app.post("/api/classify-concerns")
async def classify_concerns(req: ClassifyRequest):
    categories = get_concerns(req.pet_type)
    try:
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
    except anthropic.APITimeoutError:
        logger.error("classify-concerns: Claude API timeout")
        raise HTTPException(504, "AI 응답 시간이 초과되었습니다. 다시 시도해주세요.")
    except Exception as e:
        logger.error(f"classify-concerns error: {e}")
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

    try:
        resp = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            system=(
                "당신은 Hills Pet Nutrition 맞춤 사료 추천 챗봇입니다. "
                "보호자와 대화 중이며, 현재 추천 절차를 진행하고 있습니다. "
                "보호자의 메시지를 맥락에 맞게 이해하세요. 예를 들어:\n"
                "- '이미 힐스 사료를 먹이고 있는데 더 잘 맞는 걸 찾고 싶다' → 공감하고 추천 진행을 안내\n"
                "- '네', '응', '좋아' 같은 긍정 → 현재 단계에 맞는 진행 안내\n"
                "- 사진/이미지 전송 요청 → '죄송합니다, 현재 이미지 분석 기능은 지원하지 않아요 📷 대신 텍스트로 반려동물의 상태나 증상을 설명해주시면 맞춤 추천을 도와드릴게요!'\n"
                "- 반려동물/사료와 전혀 관련 없는 이야기 → '힐스 펫 플래너는 맞춤 사료 추천에 특화되어 있어요! 다른 궁금한 점이 있으신가요?'\n"
                "반말이나 존댓말 모두 자연스럽게 대응하며, 항상 친절하고 짧게(1~3문장) 한국어로 답하세요. "
                "가능하면 현재 진행 단계로 돌아갈 수 있도록 자연스럽게 유도하세요."
            ),
            messages=[{"role":"user","content":(
                f"[현재 단계: {ctx}]\n"
                f"보호자 메시지: \"{req.text}\"\n\n"
                "이 메시지에 맥락을 파악하여 적절하게 응답하세요. "
                "보호자가 사료나 반려동물에 대해 이야기하면 공감하고 추천 절차를 계속 진행하도록 안내하세요. "
                "반려동물 사료/건강과 완전히 관련 없는 이야기에만 부드럽게 안내하세요. "
                "JSON 아님, 자연스러운 한국어 문장으로만 답하세요."
            )}]
        )
        reply = resp.content[0].text.strip()
        return {"reply": reply}
    except anthropic.APITimeoutError:
        logger.error("chat-fallback: Claude API timeout")
        return {"reply": "잠시 응답이 지연되고 있어요. 추천을 계속 진행해볼까요?"}
    except Exception as e:
        logger.error(f"chat-fallback error: {e}")
        return {"reply": "힐스 펫 플래너는 맞춤 사료 추천에 특화되어 있어요! 추천을 계속 진행해볼까요?"}

@app.post("/api/parse-special")
async def parse_special(req: ParseSpecialRequest):
    try:
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
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except anthropic.APITimeoutError:
        logger.error("parse-special: Claude API timeout")
        return {"is_pregnant": False, "is_nursing": False, "has_medication": False, "force_rx": False, "add_concerns": [], "override_stage": None, "vet_consult_required": False, "summary": ""}
    except Exception as e:
        logger.error(f"parse-special error: {e}")
        return {"is_pregnant": False, "is_nursing": False, "has_medication": False, "force_rx": False, "add_concerns": [], "override_stage": None, "vet_consult_required": False, "summary": ""}

def normalize_stage(stage, pet_type="dog"):
    young_stages = ["puppy", "kitten"]
    if stage in ("puppy", "kitten"):
        return ["kitten"] if pet_type == "cat" else ["puppy"]
    if stage=="adult":  return ["adult"]
    return ["senior7","senior11","adult"]

def filter_by_stage(rows, life_stage, special, pet_type="dog"):
    if not rows:
        return rows
    young_stages = ["puppy", "kitten"]
    if special and (special.get("is_pregnant") or special.get("is_nursing")):
        young_products = [p for p in rows if p.get("life_stage") in young_stages]
        if young_products:
            return young_products
    if life_stage in ("senior7", "senior11"):
        rows = [p for p in rows if p.get("life_stage") not in young_stages]
    if life_stage in young_stages:
        target = "kitten" if pet_type == "cat" else "puppy"
        rows = [p for p in rows if p.get("life_stage") == target]
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
        except Exception as e:
            logger.warning(f"parse-special failed during recommend, continuing without: {e}")

    effective_stage = req.life_stage
    if special and special.get("override_stage"):
        effective_stage = special["override_stage"]

    stages = normalize_stage(effective_stage, req.pet_type)
    query = supabase.table("products").select("*") \
        .eq("pet_type", req.pet_type).in_("life_stage", stages)
    if req.size != "all":
        query = query.in_("size_category", [req.size, "all"])

    rows = query.execute().data or []
    if not rows:
        raise HTTPException(404, "추천 가능한 제품이 없습니다.")

    rows = filter_by_stage(rows, effective_stage, special, req.pet_type)

    all_concerns = list(req.health_concerns)
    if special and special.get("add_concerns"):
        all_concerns = list(set(all_concerns + special["add_concerns"]))

    def score(p):
        s = 0.0
        benefits = set(p.get("health_benefits") or [])
        concern_set = set(all_concerns)
        # 건강고민 매칭 (핵심 점수)
        s += len(concern_set & benefits) * 3.0
        # 체형 보너스
        if req.body_condition == "overweight" and "체중 관리" in benefits:
            s += 2.0
        elif req.body_condition == "underweight" and "체중 관리" not in benefits:
            s += 0.5
        # 액티브바이옴+ 보너스 (소화기 관련)
        if p.get("is_activbiome") and concern_set & {"소화기 관리", "식이 민감성"}:
            s += 1.5
        # 사이즈 정확 매칭 보너스
        if req.size != "all" and p.get("size_category") == req.size:
            s += 1.0
        # 처방식 페널티 (수의사 상담 없을 때)
        if p.get("is_prescription") and not (special and (special.get("vet_consult_required") or special.get("force_rx"))):
            s -= 1.0
        return s
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
        f"| 형태: {p.get('food_form','')}"
        f"{' | 맛: '+p['flavor'] if p.get('flavor') else ''}"
        f"{'  | 액티브바이옴+' if p.get('is_activbiome') else ''}"
        f"{' | 라인: '+p['product_line'] if p.get('product_line') else ''}"
        f" | 처방식: {'예' if p.get('is_prescription') else '아니오'} "
        f"| {(p.get('description') or '')[:120]}"
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

**중요 - 맛/재료 선호**: 특이사항에 맛/재료 선호나 기피가 있으면 반영하세요.
예: "치킨 싫어함" → 치킨/닭 맛 제품을 피하고, 연어·참치·오리 등 대안 맛 제품을 우선 추천.
단, 맛이 명시되지 않은 처방식도 대안이 될 수 있습니다.
기피 맛 제품만 있고 대안이 없으면, 기피 맛이라도 포함하되 individual_reasons에 맛 관련 안내를 추가하세요.

**반드시 2~3개** 선택 후 JSON으로만 응답 (1개만 선택하지 마세요):
{{
  "selected_indices": [1, 2],
  "overall_reasoning": "전체 추천 이유 150자 이내 한국어. 특이사항·맛선호 반영.",
  "individual_reasons": ["제품1 이유", "제품2 이유"],
  "prescription_note": "처방식 포함 또는 수의사 상담 필요 시 안내 문구, 없으면 null",
  "special_warning": "임신/수유/약복용 등 특이사항 관련 주의사항, 없으면 null"
}}"""

    try:
        resp = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system="Hills Pet Nutrition 공식 영양 상담사. 처방식은 수의사 상담 필수 안내. JSON으로만 응답.",
            messages=[{"role":"user","content":prompt}]
        )
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        ai = json.loads(raw)
    except anthropic.APITimeoutError:
        logger.error("recommend: Claude API timeout")
        raise HTTPException(504, "AI 응답 시간이 초과되었습니다. 다시 시도해주세요.")
    except Exception as e:
        logger.error(f"recommend AI scoring error: {e}")
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
            "image_url": _product_images.get(p.get("product_url",""), ""),
            "food_form": p.get("food_form",""),
            "flavor": p.get("flavor",""),
            "is_activbiome": p.get("is_activbiome",False),
            "product_line": p.get("product_line",""),
            "description": p.get("description",""),
            "reasoning": reasons[i] if i<len(reasons) else "",
        } for i,p in enumerate(selected)],
        "overall_reasoning": ai.get("overall_reasoning",""),
        "prescription_note": ai.get("prescription_note"),
        "special_warning": ai.get("special_warning"),
    }

@app.get("/health")
def health(): return {"status":"ok"}

DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = DIST_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(DIST_DIR / "index.html"))
