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

# Korean → English breed name mapping (mirrors frontend BREED_EN)
BREED_EN = {
    "믹스견":"Mixed","말티즈":"Maltese","푸들":"Poodle","시츄":"Shih Tzu",
    "포메라니안":"Pomeranian","치와와":"Chihuahua","비숑프리제":"Bichon Frise",
    "요크셔테리어":"Yorkie","닥스훈트":"Dachshund","웰시코기":"Corgi",
    "비글":"Beagle","골든리트리버":"Golden Retriever","래브라도":"Labrador",
    "보더콜리":"Border Collie","허스키":"Husky","진돗개":"Jindo","진도개":"Jindo","삽살개":"Sapsali","기타":"Other",
    "믹스묘":"Mixed","코리안숏헤어":"Korean Shorthair","페르시안":"Persian",
    "메인쿤":"Maine Coon","브리티시숏헤어":"British Shorthair","스코티시폴드":"Scottish Fold",
    "러시안블루":"Russian Blue","시암":"Siamese","랙돌":"Ragdoll","아비시니안":"Abyssinian",
}

# Korean → English concern name mapping
CONCERN_EN = {
    "소화기 관리":"Digestive Care","체중 관리":"Weight Management","관절 관리":"Joint Care",
    "피부 건강":"Skin Health","신장 관리":"Kidney Care","치아 관리":"Dental Care",
    "요로계 관리":"Urinary Care","식이 민감성":"Food Sensitivity","심장 관리":"Heart Care",
    "간 관리":"Liver Care","혈당":"Blood Sugar","노령 관리":"Senior Care",
    "헤어볼":"Hairball","갑상선 관리":"Thyroid Care","실내 생활":"Indoor",
    "암 환자 지원":"Cancer Support","응급 관리":"Critical Care",
}

# Korean → English food form mapping
FOOD_FORM_EN = {
    "건식":"Dry","습식":"Wet","캔":"Canned","파우치":"Pouch",
    "트레이":"Tray","스튜":"Stew","간식":"Treat",
}

# Korean → English flavor mapping
FLAVOR_EN = {
    "치킨":"Chicken","닭고기":"Chicken","연어":"Salmon","참치":"Tuna",
    "소고기":"Beef","양고기":"Lamb","오리":"Duck","칠면조":"Turkey",
    "돼지고기":"Pork","생선":"Fish","바다생선":"Ocean Fish",
    "치킨&야채":"Chicken & Vegetables","연어&야채":"Salmon & Vegetables",
    "치킨&보리":"Chicken & Barley","오리&감자":"Duck & Potato",
}

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])
claude   = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"], timeout=30.0)

def _translate_food_form(val: str) -> str:
    """Translate food_form like '습식(스튜)' → 'Wet (Stew)' using partial matching."""
    if not val:
        return val
    if val in FOOD_FORM_EN:
        return FOOD_FORM_EN[val]
    # Partial match: translate each Korean token found in the value
    result = val
    for ko, en in FOOD_FORM_EN.items():
        if ko in result:
            result = result.replace(ko, en)
    return result

def _slug_to_product_name(url: str) -> str:
    """Extract English product name from Hills URL slug.
    e.g. '.../science-diet-puppy-large-breed-dry' → 'Science Diet Puppy Large Breed Dry'
    """
    if not url:
        return ""
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    return slug.replace("-", " ").title()

def _url_to_en(url: str) -> str:
    """Convert hillspet.co.kr URL to hillspet.com for English mode."""
    if not url:
        return url
    return url.replace("www.hillspet.co.kr", "www.hillspet.com")

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
    lang: Optional[str] = "ko"

class ClassifyRequest(BaseModel):
    text: str
    pet_type: str
    lang: Optional[str] = "ko"

class RecommendRequest(BaseModel):
    pet_type: str
    life_stage: str
    size: str
    body_condition: str
    health_concerns: list[str]
    breed: Optional[str] = None
    pet_name: Optional[str] = None
    special_notes: Optional[str] = None
    food_form_preference: Optional[str] = None  # "dry", "wet", or None (no preference)
    lang: Optional[str] = "ko"

class BreedCommentRequest(BaseModel):
    breed: str
    pet_type: str
    lang: Optional[str] = "ko"

class ParseSpecialRequest(BaseModel):
    text: str
    pet_type: str
    life_stage: str
    lang: Optional[str] = "ko"

def _build_intent_prompt(text, is_en):
    dog_concerns = ', '.join(get_concerns('dog'))
    cat_concerns = ', '.join(get_concerns('cat'))
    if is_en:
        return (
            f'Pet owner message: "{text}"\n\n'
            "First, determine if this message is about pets, pet food, health, or pet-related topics.\n"
            "If completely irrelevant (spam, nonsense, unrelated), set is_relevant to false.\n\n"
            "Respond ONLY in this JSON format:\n"
            "{\n"
            '  "is_relevant": true or false,\n'
            '  "pet_type": "dog" or "cat" or null,\n'
            '  "breed": "breed name in KOREAN" or null (e.g., "진돗개", "말티즈", "페르시안"),\n'
            '  "age_category": "puppy"(<1yr) or "adult"(1-7yr) or "senior7"(7-11yr) or "senior11"(11+yr) or null,\n'
            '  "body_condition": "underweight" or "normal" or "overweight" or null (detect from words like fat/chubby/skinny/thin/overweight/slim),\n'
            f'  "concerns": [use ONLY these exact Korean strings: {dog_concerns}, {cat_concerns}],\n'
            '  "conflict": null or {"type":"pet_breed_mismatch","detected_pet":"dog/cat","detected_breed":"breed","message":"Friendly clarification question in English"},\n'
            '  "sympathy_msg": "A warm, conversational English response, 1-2 sentences. Sound like a knowledgeable friend, not a robot. Reference specific details they mentioned. Example: Instead of generic \'I understand your concern\', say something like \'Oh no, a 3-year-old Golden with tummy troubles — that must be worrying!\'",\n'
            '  "missing": ["pet_type","age","weight" etc.]\n'
            "}\n\n"
            "IMPORTANT: concerns must use the EXACT Korean strings from the list above. Do not translate them.\n"
            "IMPORTANT: breed must be in KOREAN.\n"
            "sympathy_msg must be in English.\n"
            "If is_relevant is false: pet_type=null, age_category=null, concerns=[], sympathy_msg empty string\n\n"
            "CONFLICT DETECTION (critical):\n"
            "Dog breeds: 믹스견,말티즈,푸들,시츄,포메라니안,치와와,비숑프리제,요크셔테리어,닥스훈트,웰시코기,비글,골든리트리버,래브라도,보더콜리,허스키,진돗개,삽살개\n"
            "Cat breeds: 믹스묘,코리안숏헤어,페르시안,메인쿤,브리티시숏헤어,스코티시폴드,러시안블루,시암,랙돌,아비시니안\n"
            'If user says a DOG breed but mentions "cat" (or vice versa), set conflict with a friendly question.\n'
            'Example: "my jindo cat" → conflict: {"type":"pet_breed_mismatch","detected_pet":"cat","detected_breed":"진돗개","message":"Just to make sure — Jindo is a dog breed. Do you have a Jindo dog, or a cat named Jindo?"}\n'
            "When conflict is set, still fill pet_type and breed with your best guess, but the frontend will ask for clarification."
        )
    return (
        f"보호자 메시지: \"{text}\"\n\n"
        "먼저 이 메시지가 반려동물, 사료, 건강, 펫 관련 주제인지 판단하세요.\n"
        "전혀 관련 없는 메시지(욕설, 장난, 스팸, 무관한 주제)라면 is_relevant를 false로 설정하세요.\n\n"
        "아래 JSON 형식으로만 응답:\n"
        "{\n"
        '  "is_relevant": true 또는 false (반려동물/사료/건강 관련 여부),\n'
        '  "pet_type": "dog" 또는 "cat" 또는 null,\n'
        '  "breed": "품종명(한글)" 또는 null (예: "진돗개", "말티즈", "페르시안" 등),\n'
        '  "age_category": "puppy"(1살미만) 또는 "adult"(1~7살) 또는 "senior7"(7~11살) 또는 "senior11"(11살이상) 또는 null,\n'
        '  "body_condition": "underweight" 또는 "normal" 또는 "overweight" 또는 null (뚱뚱/살찐/마른/비만/과체중/야윈 등 체형 관련 단어 감지),\n'
        '  "concerns": ["소화기 관리","피부 건강" 등 해당 항목들],\n'
        '  "conflict": null 또는 {"type":"pet_breed_mismatch","detected_pet":"dog/cat","detected_breed":"품종명","message":"친근한 확인 질문 한국어"},\n'
        '  "sympathy_msg": "친구처럼 자연스럽고 따뜻한 한국어 메시지 1~2문장. 보호자가 언급한 구체적 상황을 반영하세요. 예: \'아이고, 3살 골든이가 소화가 안 좋군요 😢 걱정이 많으셨겠어요.\' 같이 딱딱한 상담사가 아닌 펫 전문 친구처럼.",\n'
        '  "missing": ["pet_type","age","weight" 등 파악 못한 정보 목록]\n'
        "}\n\n"
        "나이 판단 기준: 1살 미만=puppy, 1~7살=adult, 7~11살=senior7, 11살 이상=senior11\n"
        f"concerns 가능 값(강아지): {dog_concerns}\n"
        f"concerns 가능 값(고양이): {cat_concerns}\n"
        "\n★ 중요 규칙:\n"
        "1. concerns에는 반드시 위 '가능 값' 목록에 있는 정확한 문자열만 사용하세요. 목록에 없는 값을 절대 만들지 마세요.\n"
        "   - 암/종양 진단 → concerns는 빈 배열[]로 두고, sympathy_msg에서 수의사 상담을 강력히 권고하세요.\n"
        "   - 사료를 안 먹음/기호성 문제/입맛 → concerns를 빈 배열로 두고, sympathy_msg에서 기호성 문제에 공감하세요.\n"
        "   - 고양이 털 빠짐 → '헤어볼'과 '피부 건강' 둘 다 concerns에 포함하세요.\n"
        "   - 강아지 털 빠짐 → '피부 건강'을 concerns에 포함하세요.\n"
        "   - 한 가지 증상이 여러 건강고민에 해당될 수 있습니다. 관련된 모든 카테고리를 포함하세요.\n"
        "2. 당뇨, 신장질환, 암, 방광결석 등 진단받은 질환이 언급되면 sympathy_msg에 '수의사와 상담 후 처방식을 선택하시는 것이 중요합니다'를 반드시 포함하세요.\n"
        "3. 보호자의 요청과 실제 상황이 모순될 때 sympathy_msg에서 부드럽게 교정해주세요.\n"
        "4. 생후 4주 미만 동물은 사료를 먹을 수 없습니다. concerns=[]로 하고 sympathy_msg에 모유/분유 안내하세요.\n"
        "\nsympathy_msg 예시: '눈물 자국 때문에 많이 속상하셨겠어요 😢 피부/모질 관리가 필요한 상황으로 보여요.'\n"
        "is_relevant가 false인 경우: pet_type=null, age_category=null, concerns=[], sympathy_msg는 빈 문자열로 설정\n\n"
        "모순 감지 (중요):\n"
        "강아지 품종: 믹스견,말티즈,푸들,시츄,포메라니안,치와와,비숑프리제,요크셔테리어,닥스훈트,웰시코기,비글,골든리트리버,래브라도,보더콜리,허스키,진돗개,삽살개\n"
        "고양이 품종: 믹스묘,코리안숏헤어,페르시안,메인쿤,브리티시숏헤어,스코티시폴드,러시안블루,시암,랙돌,아비시니안\n"
        '강아지 품종인데 "고양이"라고 했거나, 고양이 품종인데 "강아지"라고 했을 때 conflict를 설정하세요.\n'
        '예: "우리 진돗개 고양이가" → conflict: {"type":"pet_breed_mismatch","detected_pet":"cat","detected_breed":"진돗개","message":"혹시 확인 부탁드려요 — 진돗개는 강아지 품종인데, 진돗개를 키우시나요, 아니면 고양이 이름이 진돗개인가요?"}\n'
        "conflict가 있을 때도 pet_type과 breed는 추측값으로 채워주세요."
    )

@app.post("/api/parse-intent")
async def parse_intent(req: IntentRequest):
    is_en = req.lang == "en"
    try:
        resp = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=512,
            system=(
                "You are a friendly, knowledgeable AI pet nutrition specialist — like a helpful friend who knows a lot about pets. "
                "Extract information and respond naturally. Your sympathy_msg should sound like a real conversation, not a form. "
                "Show you understand the specific situation. Reference details they mentioned. Be warm but concise. "
                "Respond ONLY in JSON format with no other text."
            ) if is_en else (
                "당신은 친근하고 전문적인 AI 반려동물 영양 상담사입니다 — 펫에 대해 잘 아는 친한 친구 같은 존재입니다. "
                "보호자의 메시지에서 정보를 파악하고, 실제 대화하듯 자연스럽게 공감합니다. "
                "구체적인 상황에 맞게 반응하세요. 보호자가 언급한 디테일을 참조하세요. 따뜻하되 간결하게. "
                "JSON 형식으로만 응답하고 다른 텍스트는 포함하지 마세요."
            ),
            messages=[{"role":"user","content":_build_intent_prompt(req.text, is_en)}]
        )
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        data = json.loads(raw)
        valid = set(get_concerns("dog")) | set(get_concerns("cat"))
        data["concerns"] = [c for c in data.get("concerns", []) if c in valid]
        return data
    except json.JSONDecodeError:
        logger.warning(f"parse-intent: JSON parse failed for input: {req.text[:50]}")
        fallback_msg = "I've noted your message." if is_en else "말씀해주신 내용을 확인했어요."
        return {"is_relevant": True, "pet_type": None, "concerns": [], "sympathy_msg": fallback_msg, "missing": []}
    except anthropic.APITimeoutError:
        logger.error("parse-intent: Claude API timeout")
        raise HTTPException(504, "AI response timed out." if is_en else "AI 응답 시간이 초과되었습니다. 다시 시도해주세요.")
    except Exception as e:
        logger.error(f"parse-intent error: {e}")
        fallback_msg = "I've noted your message." if is_en else "말씀해주신 내용을 확인했어요."
        return {"is_relevant": True, "pet_type": None, "concerns": [], "sympathy_msg": fallback_msg, "missing": []}

@app.post("/api/classify-concerns")
async def classify_concerns(req: ClassifyRequest):
    categories = get_concerns(req.pet_type)
    is_en = getattr(req, 'lang', 'ko') == "en"
    try:
        resp = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=256,
            system="Pet nutrition specialist. Respond ONLY in JSON." if is_en else "반려동물 영양 전문가. JSON으로만 응답.",
            messages=[{"role":"user","content":(
                f'Description: "{req.text}"\n'
                f"Categories (use EXACT Korean strings): {', '.join(categories)}\n"
                f'Match the description to categories. Respond in JSON: {{"concerns": [...]}}\n'
                "IMPORTANT: concerns values must be the EXACT Korean strings from the categories list above."
            ) if is_en else (
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
        raise HTTPException(504, "AI response timed out." if is_en else "AI 응답 시간이 초과되었습니다. 다시 시도해주세요.")
    except Exception as e:
        logger.error(f"classify-concerns error: {e}")
        return {"concerns": []}

@app.post("/api/breed-comment")
async def breed_comment(req: BreedCommentRequest):
    import random
    try:
        result = supabase.table("breed_comments").select("comment, comment_en").eq("pet_type", req.pet_type).eq("breed", req.breed).execute()
        if result.data:
            chosen = random.choice(result.data)
            if req.lang == "en":
                comment_en = chosen.get("comment_en")
                if comment_en:
                    return {"comment": comment_en}
            return {"comment": chosen["comment"]}
        return {"comment": ""}
    except Exception as e:
        logger.error(f"breed-comment error: {e}")
        return {"comment": ""}

@app.post("/api/parse-special")
async def parse_special(req: ParseSpecialRequest):
    is_en = getattr(req, 'lang', 'ko') == "en"
    try:
        if is_en:
            user_prompt = (
                f'Pet owner special notes: "{req.text}"\n'
                f"Pet: {'Dog' if req.pet_type=='dog' else 'Cat'}, Life stage: {req.life_stage}\n\n"
                "Respond ONLY in JSON:\n"
                "{\n"
                '  "is_pregnant": true/false,\n'
                '  "is_nursing": true/false,\n'
                '  "has_medication": true/false,\n'
                '  "force_rx": true/false,\n'
                '  "add_concerns": ["use EXACT Korean health concern strings from DB"],\n'
                '  "override_stage": "puppy/adult/senior7/senior11 or null",\n'
                '  "vet_consult_required": true/false,\n'
                '  "summary": "One-line English summary of special notes"\n'
                "}\n\n"
                "If pregnant/nursing, set override_stage to 'puppy' (puppy food is suitable for pregnant/nursing pets).\n"
                "If on medication or post-surgery, set vet_consult_required to true.\n"
                "IMPORTANT: add_concerns must use the exact Korean category strings (e.g., '소화기 관리', '체중 관리')."
            )
        else:
            user_prompt = (
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
            )
        resp = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=400,
            system="Pet nutrition specialist. Respond ONLY in JSON." if is_en else "반려동물 영양 전문 상담사. JSON으로만 응답.",
            messages=[{"role":"user","content":user_prompt}]
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
                life_stage=req.life_stage,
                lang=req.lang or "ko"
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
    INVALID_URLS = {
        "https://www.hillspet.co.kr/dog-food",
        "https://www.hillspet.co.kr/cat-food",
        "",
    }
    rows = [p for p in rows if p.get("product_url", "") not in INVALID_URLS]
    is_en = req.lang == "en"
    if not rows:
        raise HTTPException(404, "No products available for recommendation." if is_en else "추천 가능한 제품이 없습니다.")

    rows = filter_by_stage(rows, effective_stage, special, req.pet_type)

    all_concerns = list(req.health_concerns)
    if special and special.get("add_concerns"):
        all_concerns = list(set(all_concerns + special["add_concerns"]))

    def score(p):
        s = 0.0
        benefits = set(p.get("health_benefits") or [])
        concern_set = set(all_concerns)
        matched = concern_set & benefits
        total_concerns = len(concern_set) if concern_set else 1
        s += len(matched) * 3.0
        if total_concerns > 1:
            s += (len(matched) / total_concerns) * 2.0
        if req.body_condition == "overweight" and "체중 관리" in benefits:
            s += 1.0
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
        # 건식/습식 선호 보너스
        if req.food_form_preference:
            pf = p.get("food_form", "")
            pref_map = {"dry": "건식", "wet": {"습식","캔","파우치","트레이","스튜"}}
            if req.food_form_preference == "dry" and pf == "건식":
                s += 2.0
            elif req.food_form_preference == "wet" and pf in {"습식","캔","파우치","트레이","스튜"}:
                s += 2.0
            elif req.food_form_preference == "dry" and pf != "건식":
                s -= 1.0
            elif req.food_form_preference == "wet" and pf not in {"습식","캔","파우치","트레이","스튜"}:
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
        raise HTTPException(404, "No products match the given criteria." if is_en else "조건에 맞는 제품이 없습니다.")

    if is_en:
        summary = "\n".join([
            f"[{i+1}] {_slug_to_product_name(p.get('product_url',''))} ({p.get('brand','')}) "
            f"| Benefits: {', '.join(CONCERN_EN.get(b, b) for b in (p.get('health_benefits') or []))} "
            f"| Form: {p.get('food_form','')}"
            f"{' | Flavor: '+p['flavor'] if p.get('flavor') else ''}"
            f"{'  | ActivBiome+' if p.get('is_activbiome') else ''}"
            f"{' | Line: '+p['product_line'] if p.get('product_line') else ''}"
            f" | Prescription: {'Yes' if p.get('is_prescription') else 'No'} "
            f"| {(p.get('description') or '')[:120]}"
            for i,p in enumerate(top)
        ])
    else:
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

    body_label = {"underweight":"Thin","normal":"Normal","overweight":"Overweight"}.get(req.body_condition,"Normal") if is_en else {"underweight":"마름","normal":"정상","overweight":"과체중"}.get(req.body_condition,"정상")
    if is_en:
        concerns = ", ".join(CONCERN_EN.get(c, c) for c in all_concerns) if all_concerns else "None"
        breed_display = BREED_EN.get(req.breed, req.breed) if req.breed else "breed not specified"
    else:
        concerns = ", ".join(all_concerns) if all_concerns else "없음"
        breed_display = req.breed or "품종 미입력"
    pet_name   = req.pet_name or ("your pet" if is_en else "반려동물")
    special_summary = special.get("summary","") if special else ""
    vet_required = special.get("vet_consult_required", False) if special else False

    if is_en:
        prompt = f"""
Pet information:
- Name: {pet_name} / Type: {"Dog" if req.pet_type=="dog" else "Cat"} ({breed_display})
- Life stage: {effective_stage} / Body: {body_label} / Health concerns: {concerns}
- Special notes: {special_summary or "None"}
- Vet consultation needed: {"Yes" if vet_required else "No"}

Hills product candidates:
{summary}

**Important**: If multiple health concerns exist, include products covering different concerns. Don't focus on just one.
**Personalization**: Always mention the pet's breed name ({breed_display}) in overall_reasoning and individual_reasons. Write as if speaking directly to the owner about THEIR specific pet.
**Select exactly 2-3 products** and respond ONLY in JSON (never select just 1):
{{
  "selected_indices": [1, 2],
  "overall_reasoning": "Overall recommendation reason in English, under 150 chars. Mention breed name. Reflect special notes.",
  "individual_reasons": ["Reason for product 1 mentioning breed name", "Reason for product 2 mentioning breed name"],
  "prescription_note": "Note if prescription diet included or vet consultation needed, or null",
  "special_warning": "Warning about pregnancy/nursing/medication special notes, or null"
}}"""
    else:
        prompt = f"""
반려동물 정보:
- 이름: {pet_name} / 종류: {"강아지" if req.pet_type=="dog" else "고양이"} ({breed_display})
- 생애단계: {effective_stage} / 체형: {body_label} / 건강고민: {concerns}
- 특이사항: {special_summary or "없음"}
- 수의사 상담 필요: {"예" if vet_required else "아니오"}

Hills 제품 후보:
{summary}

**중요 - 맛/재료 선호**: 특이사항에 맛/재료 선호나 기피가 있으면 반영하세요.
기피 맛 제품만 있고 대안이 없으면, 기피 맛이라도 포함하되 individual_reasons에 맛 관련 안내를 추가하세요.

**중요**: 건강고민이 여러 개일 경우, 각 고민을 커버하는 제품을 골고루 포함하세요. 특정 고민만 집중하지 마세요.
**개인화**: overall_reasoning과 individual_reasons에 반드시 품종명({breed_display})을 언급하세요. 보호자에게 직접 이야기하듯, 해당 반려동물만을 위한 맞춤 설명으로 작성하세요.
**반드시 2~3개** 선택 후 JSON으로만 응답 (1개만 선택하지 마세요):
{{
  "selected_indices": [1, 2],
  "overall_reasoning": "전체 추천 이유 150자 이내 한국어. 품종명 언급. 특이사항·맛선호 반영.",
  "individual_reasons": ["품종명 언급한 제품1 이유", "품종명 언급한 제품2 이유"],
  "prescription_note": "처방식 포함 또는 수의사 상담 필요 시 안내 문구, 없으면 null",
  "special_warning": "임신/수유/약복용 등 특이사항 관련 주의사항, 없으면 null"
}}"""

    sys_msg = "Hills Pet Nutrition official nutrition advisor. Prescription diets require vet consultation. Respond ONLY in JSON." if is_en else "Hills Pet Nutrition 공식 영양 상담사. 처방식은 수의사 상담 필수 안내. JSON으로만 응답."
    try:
        resp = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=sys_msg,
            messages=[{"role":"user","content":prompt}]
        )
        raw = resp.content[0].text.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        ai = json.loads(raw)
    except anthropic.APITimeoutError:
        logger.error("recommend: Claude API timeout")
        raise HTTPException(504, "AI response timed out. Please try again." if is_en else "AI 응답 시간이 초과되었습니다. 다시 시도해주세요.")
    except Exception as e:
        logger.error(f"recommend AI scoring error: {e}")
        ai = {"selected_indices": [1], "overall_reasoning": "", "individual_reasons": [], "prescription_note": None, "special_warning": None}

    selected = [top[i-1] for i in ai.get("selected_indices",[1]) if 1<=i<=len(top)]
    reasons  = ai.get("individual_reasons",[])

    return {
        "products": [{
            "id": str(p["id"]),
            "product_name_kr": p["product_name_kr"],
            "product_name_en": _slug_to_product_name(p.get("product_url","")) if is_en else "",
            "brand": p.get("brand",""),
            "health_benefits": p.get("health_benefits") or [],
            "is_prescription": p.get("is_prescription",False),
            "product_url": _url_to_en(p.get("product_url","")) if is_en else p.get("product_url",""),
            "image_url": _product_images.get(p.get("product_url",""), ""),
            "food_form": _translate_food_form(p.get("food_form","")) if is_en else p.get("food_form",""),
            "flavor": FLAVOR_EN.get(p.get("flavor",""), p.get("flavor","")) if is_en else p.get("flavor",""),
            "is_activbiome": p.get("is_activbiome",False),
            "product_line": p.get("product_line",""),
            "description": "" if is_en else p.get("description",""),
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
