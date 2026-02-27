import { useState, useEffect, useRef } from "react";

const DOG_BREEDS = ["믹스견","말티즈","푸들","시츄","포메라니안","치와와","비숑프리제","요크셔테리어","닥스훈트","웰시코기","비글","골든리트리버","래브라도","보더콜리","허스키","진돗개","삽살개","기타"];
const CAT_BREEDS = ["믹스묘","코리안숏헤어","페르시안","메인쿤","브리티시숏헤어","스코티시폴드","러시안블루","시암","랙돌","아비시니안","기타"];
const BREED_SIZE = {
  "말티즈":"small","시츄":"small","포메라니안":"small","치와와":"small",
  "비숑프리제":"small","요크셔테리어":"small","닥스훈트":"small",
  "푸들":"all","웰시코기":"all","비글":"all","믹스견":"all","기타":"all",
  "골든리트리버":"large","래브라도":"large","보더콜리":"large",
  "허스키":"large","진돗개":"large","삽살개":"large",
};
const FALLBACK_DOG = ["소화기 관리","체중 관리","관절 관리","피부 건강","신장 관리","치아 관리","요로계 관리","식이 민감성","심장 관리","간 관리","혈당","노령 관리"];
const FALLBACK_CAT = ["소화기 관리","체중 관리","요로계 관리","피부 건강","신장 관리","헤어볼","치아 관리","식이 민감성","갑상선 관리","실내 생활","혈당","노령 관리"];

const BREED_EN = {
  "믹스견":"Mixed","말티즈":"Maltese","푸들":"Poodle","시츄":"Shih Tzu",
  "포메라니안":"Pomeranian","치와와":"Chihuahua","비숑프리제":"Bichon Frise",
  "요크셔테리어":"Yorkie","닥스훈트":"Dachshund","웰시코기":"Corgi",
  "비글":"Beagle","골든리트리버":"Golden Retriever","래브라도":"Labrador",
  "보더콜리":"Border Collie","허스키":"Husky","진돗개":"Jindo","진도개":"Jindo","삽살개":"Sapsali","기타":"Other",
  "믹스묘":"Mixed","코리안숏헤어":"Korean Shorthair","페르시안":"Persian",
  "메인쿤":"Maine Coon","브리티시숏헤어":"British Shorthair","스코티시폴드":"Scottish Fold",
  "러시안블루":"Russian Blue","시암":"Siamese","랙돌":"Ragdoll","아비시니안":"Abyssinian",
};
const CONCERN_EN = {
  "소화기 관리":"Digestive","체중 관리":"Weight","관절 관리":"Joint",
  "피부 건강":"Skin","신장 관리":"Kidney","치아 관리":"Dental",
  "요로계 관리":"Urinary","식이 민감성":"Sensitivity","심장 관리":"Heart",
  "간 관리":"Liver","혈당":"Blood Sugar","노령 관리":"Senior Care",
  "헤어볼":"Hairball","갑상선 관리":"Thyroid","실내 생활":"Indoor",
  "암 환자 지원":"Cancer Support","응급 관리":"Critical Care",
};

const T = {
  ko: {
    headerSub:"힐스 펫 플래너",
    greeting:'안녕하세요! <span class="wave">👋</span>\n반려동물 맞춤 영양사 **힐스 펫 플래너**예요.\n꼭 맞는 제품을 추천해드릴게요!',
    cta:"힐스 맞춤 제품 추천 받기", placeholder:"힐스와 상담하기",
    dog:"🐶 강아지", cat:"🐱 고양이",
    ages:{puppy:"1살 미만",adult:"1~7살",senior7:"7~11살",senior11:"11살 이상"},
    body:{underweight:"마름",normal:"정상",overweight:"과체중"},
    bodyLabel:{underweight:"마름",normal:"정상",overweight:"과체중"},
    size:{small:"소형",all:"중형",large:"대형"}, sizeWord:"체급", bodyWord:"체형",
    foodForm:{dry:"🥣 건식",wet:"🍲 습식",skip:"상관없어요 →"},
    foodFormLabel:{dry:"건식",wet:"습식",skip:""},
    pickFood:"사료 형태 선호가 있으신가요?",
    concernsWord:"건강 고민", none:"없음",
    startUser:"맞춤 사료 추천받기", startBot:"시작해볼게요! 먼저 회원 여부를 확인할게요.",
    yesStart:"네, 시작할게요 →", startOver:"처음부터",
    restartConfirm:"알겠어요! 처음부터 차근차근 진행할게요.",
    authPrompt:"보다 정확한 추천을 위해 회원 여부를 확인합니다.",
    authMember:"기존 회원", authJoin:"회원 가입", authSkip:"그냥 진행 →",
    authMemberU:"회원으로 계속", authMemberB:"반갑습니다! 🙌",
    authJoinU:"회원 가입 후 진행", authJoinB:"회원가입 후에는 추천 결과가 저장돼요! 😊",
    authSkipU:"그냥 진행할게요", authSkipB:"알겠어요!",
    pickPet:"반려동물 종류를 선택해주세요.",
    pickBreed:(pt)=>`${pt==="dog"?"강아지":"고양이"} 품종을 선택해주세요.`,
    pickAge:"나이대를 알려주세요.", pickBody:"체형 상태는 어떤가요?",
    pickConcerns:"건강 관련 고민이 있으신가요?\n해당하는 항목을 선택해주세요.",
    editConcerns:"건강 고민을 추가하거나 수정할 수 있어요.\n해당하는 항목을 선택해주세요.",
    fast:(m)=>`이미 파악한 정보가 있어서 빠르게 진행할게요! 😊\n${m}`,
    next:"다음 →", noConcern:"건강고민 없어요 →",
    specialQ:"거의 다 왔어요! 마지막으로 한 가지만요.\n\n다음 중 해당 사항이 있으신가요?",
    spPreg:"임신/수유 중", spSurg:"수술 후 회복 중 / 약 복용 중",
    spAllergy:"알레르기 있음", spRx:"처방식 먹는 중", spDirect:"직접 입력 ✏️",
    spLabel:"특이사항을 자유롭게 입력해주세요",
    spPlaceholder:"예: 치킨 맛 싫어해요, 연어 맛 선호해요, 알레르기가 있어요...",
    spDone:"입력 완료 →", spNone:"특별사항 없어요 →", spBack:"← 버튼으로 선택하기",
    spNoneUser:"특이사항 없음", spNoteWord:"특이사항",
    summaryPre:"입력하신 내용을 정리했어요. ✅", confirmQ:"이대로 맞춤 추천을 받으시겠어요?",
    confirmBtn:"✨ 맞춤 추천받기", confirmU:"네, 추천받을게요 ✨", recommendU:"네, 추천받을게요!",
    analyzing:"분석 중이에요... 잠시만 기다려주세요 🔍",
    analyzingLabel:"맞춤 제품을 분석하고 있어요",
    done:(n,r)=>`<div class="done-banner">분석 완료! 🎉</div>${r?`<div class="done-reason">${r}</div>`:""}아래에서 ${n}에게 딱 맞는 Hill's 제품을 확인해보세요.`,
    timeout:"응답 시간이 초과되었어요. 🔄 다시 추천받기를 눌러주세요.",
    error:"일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
    retry:"다시 추천받기", petName:"반려동물",
    rxBadge:"처방식", flavorSfx:"맛", viewHills:"Hill's 공식 사이트에서 보기 →",
    browseMore:"다른 힐스 제품도 둘러보세요",
    bestP:"베스트 제품", newP:"신제품", storeP:"힐스 공식 브랜드 스토어",
    bestUrl:"https://brand.naver.com/hillspet/best?cp=1",
    newUrl:"https://brand.naver.com/hillspet/category/5526579881be42af8bce22e4c17b9d92?cp=1",
    storeUrl:"https://brand.naver.com/hillspet",
    saveQ:"결과를 저장해두시겠어요?",
    saveSub:"회원가입 시 추천 결과를 언제든 다시 확인할 수 있어요.",
    kakao:"💬 카카오로 1초 가입", kakaoAlert:"카카오 로그인은 준비 중이에요!", skipSave:"다음에 할게요",
    restartLink:"↩ 처음부터 다시 하기",
    notRelevant:"안녕하세요! 저는 **Hill's Pet Planner** 맞춤 사료 추천 봇이에요. 🐾\n\n아래와 같은 도움을 드릴 수 있어요:\n• 반려동물 건강 고민에 맞는 **맞춤 사료 추천**\n• 강아지/고양이 **영양 상담**\n• Hill's 제품 정보 안내\n\n반려동물에 대해 궁금한 점이 있으시면 편하게 말씀해 주세요!",
    noInfoSfx:"\n\n궁금한 점이 있으시면 편하게 말씀해 주세요!\n아래 **제품 추천 받기** 버튼을 눌러 시작하실 수도 있어요.",
    parsed:"파악한 내용이에요.", parsedSfx:"\n\n맞춤 추천을 시작할까요?",
    parseErr:"말씀 잘 들었어요! 몇 가지 정보를 더 알려주시면 정확하게 추천해드릴게요.",
    defSympathy:"말씀해주신 내용을 확인했어요.",
    defGreeting:"안녕하세요! 반려동물 영양 상담을 위해 찾아주셔서 감사합니다 😊",
    emergency:"🚨 **응급 상황이 의심됩니다!**\n\n말씀하신 증상은 즉시 수의사의 진료가 필요할 수 있어요.\n\n🏥 **가까운 동물병원에 바로 연락해주세요.**\n📞 야간/응급: 해당 지역 24시간 동물병원 검색\n\n증상이 안정된 후에 맞춤 영양 상담을 도와드릴게요.",
    emergencyContinue:"증상이 급하지 않아요 → 사료 추천 계속하기",
  },
  en: {
    headerSub:"AI Pet Nutrition Advisor",
    greeting:'Hello! <span class="wave">👋</span>\nI\'m the **Hill\'s Pet Planner**, your AI nutrition advisor.\nI\'ll help you find the **perfect nutrition match**!',
    cta:"Get Personalized Recommendation", placeholder:"Chat with Hill's",
    dog:"🐶 Dog", cat:"🐱 Cat",
    ages:{puppy:"Under 1 yr",adult:"1–7 yrs",senior7:"7–11 yrs",senior11:"11+ yrs"},
    body:{underweight:"Thin",normal:"Normal",overweight:"Overweight"},
    bodyLabel:{underweight:"Thin",normal:"Normal",overweight:"Overweight"},
    size:{small:"Small",all:"Medium",large:"Large"}, sizeWord:"Size", bodyWord:"Body",
    foodForm:{dry:"🥣 Dry Food",wet:"🍲 Wet Food",skip:"No preference →"},
    foodFormLabel:{dry:"Dry",wet:"Wet",skip:""},
    pickFood:"Any preference on food type?",
    concernsWord:"Health concerns", none:"None",
    startUser:"Get a recommendation", startBot:"Great, let's find the best food for your pet! First, a quick membership check.",
    yesStart:"Yes, let's go →", startOver:"Start over",
    restartConfirm:"No problem! Let's start fresh.",
    authPrompt:"Quick membership check for a better experience.",
    authMember:"Existing member", authJoin:"Sign up", authSkip:"Skip for now →",
    authMemberU:"Continue as member", authMemberB:"Welcome back! 🙌",
    authJoinU:"Sign up first", authJoinB:"Your results will be saved after signing up! 😊",
    authSkipU:"Skip for now", authSkipB:"No worries, let's dive in!",
    pickPet:"Who are we shopping for?",
    pickBreed:(pt)=>`What breed is your ${pt==="dog"?"dog":"cat"}?`,
    pickAge:"How old is your pet? 🎂", pickBody:"How would you describe their build?",
    pickConcerns:"Any health goals or concerns?\nSelect all that apply.",
    editConcerns:"You can add or update health concerns.\nSelect all that apply.",
    fast:(m)=>`I already have some info — let's move quickly! 😊\n${m}`,
    next:"Next →", noConcern:"All healthy! →",
    specialQ:"Almost there! Just one more thing.\n\nDo any of these apply?",
    spPreg:"Pregnant / Nursing", spSurg:"Post-surgery / On medication",
    spAllergy:"Has allergies", spRx:"On prescription diet", spDirect:"Type it in ✏️",
    spLabel:"Anything else we should know?",
    spPlaceholder:"e.g., Doesn't like chicken, prefers salmon, has allergies...",
    spDone:"Done →", spNone:"Nope, all good! →", spBack:"← Back to buttons",
    spNoneUser:"No special notes", spNoteWord:"Special notes",
    summaryPre:"Here's what we have so far. ✅", confirmQ:"Ready to see your personalized picks?",
    confirmBtn:"✨ Get My Recommendations", confirmU:"Yes, show me! ✨", recommendU:"Yes, let's go!",
    analyzing:"Crunching the numbers... 🔍",
    analyzingLabel:"Finding the best products for your pet",
    done:(n,r)=>`<div class="done-banner">Your Results Are In! 🎉</div>${r?`<div class="done-reason">${r}</div>`:""}Here are the top Hill's picks tailored for ${n}.`,
    timeout:"That took too long. 🔄 Let's try again!",
    error:"Oops, something went wrong. Let's try that again!",
    retry:"Start Over", petName:"your pet",
    rxBadge:"Rx", flavorSfx:"", viewHills:"View on Hill's Official Site →",
    browseMore:"Explore more Hill's products",
    bestP:"Best Sellers", newP:"New Products", storeP:"Hill's on Amazon",
    bestUrl:"https://www.amazon.com/Best-Sellers-Pet-Supplies-Hills-Nutrition/zgbs/pet-supplies/7729138011",
    newUrl:"https://www.amazon.com/stores/HillsPetNutrition/page/CF55F4BC-1F1E-41DC-956D-936E559ACB87",
    storeUrl:"https://www.amazon.com/stores/HillsPetNutrition/page/2C03FA0A-DC2B-45C3-AC76-C025ED48AE0D",
    saveQ:"Want to save your results?",
    saveSub:"Create an account to revisit your recommendations anytime.",
    kakao:"Sign in with Google", kakaoAlert:"Google sign-in is coming soon!", skipSave:"Maybe later",
    restartLink:"↩ Start over",
    notRelevant:"Hey there! I'm the **Hill's Pet Planner**, your personalized food recommendation bot. 🐾\n\nI can help with:\n• **Personalized food picks** based on health needs\n• **Nutrition advice** for dogs and cats\n• Hill's product info\n\nTell me about your pet and I'll find the best match!",
    noInfoSfx:"\n\nFeel free to ask anything!\nOr tap the **Get Recommendation** button below to get started.",
    parsed:"Here's what I know so far:", parsedSfx:"\n\nReady to find the best match?",
    parseErr:"Got it! A few more details and I'll nail the recommendation.",
    defSympathy:"Thanks for sharing that.",
    defGreeting:"Hey there! Thanks for stopping by for pet nutrition advice 😊",
    emergency:"🚨 **This sounds like an emergency!**\n\nThe symptoms you've described may need immediate vet attention.\n\n🏥 **Please contact your nearest animal hospital right away.**\n📞 For after-hours emergencies, search for a 24-hour vet clinic in your area.\n\nOnce your pet is stable, I'm here to help with nutrition advice.",
    emergencyContinue:"It's not urgent → Continue with food recommendation",
  },
};

const URL_LANG = new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "ko";

/* ── Age-based filtering rules ── */
const PUPPY_HIDDEN_CONCERNS_DOG = new Set(["노령 관리","신장 관리","심장 관리","간 관리","혈당","치아 관리"]);
const PUPPY_HIDDEN_CONCERNS_CAT = new Set(["노령 관리","신장 관리","갑상선 관리","혈당","치아 관리","심장 관리","간 관리"]);
const PUPPY_HIDDEN_SPECIAL = new Set(["임신/수유 중","Pregnant / Nursing"]);

function getFilteredConcerns(list, petType, ageCategory) {
  if (ageCategory !== "puppy") return list;
  const hidden = petType === "dog" ? PUPPY_HIDDEN_CONCERNS_DOG : PUPPY_HIDDEN_CONCERNS_CAT;
  return list.filter(c => !hidden.has(c));
}

function getFilteredSpecialOpts(opts, ageCategory) {
  if (ageCategory !== "puppy") return opts;
  return opts.filter(o => !PUPPY_HIDDEN_SPECIAL.has(o));
}

/* ── D: Smart hints for concern combinations ── */
function getConcernHint(sel, data, lang) {
  if (!sel.length) return null;
  const s = new Set(sel);
  const isEn = lang === "en";

  /* combination hints */
  if (s.has("관절 관리") && s.has("체중 관리"))
    return isEn ? "Joint and weight issues are closely related — great combo to address together!"
                : "관절과 체중은 서로 밀접한 관계예요. 함께 관리하면 효과적이에요!";
  if (s.has("소화기 관리") && s.has("식이 민감성"))
    return isEn ? "Digestive issues and food sensitivity often go hand in hand. We'll find the gentlest option."
                : "소화기 문제와 식이 민감성은 함께 나타나는 경우가 많아요. 가장 순한 제품을 찾아볼게요.";
  if (s.has("피부 건강") && s.has("식이 민감성"))
    return isEn ? "Skin problems are often linked to food sensitivity — nutrition can make a big difference!"
                : "피부 문제는 식이 민감성과 연관이 깊어요. 사료 변경으로 크게 개선될 수 있어요!";
  if (s.has("체중 관리") && s.has("소화기 관리"))
    return isEn ? "We'll look for a formula that supports digestion while managing calories."
                : "소화 건강을 지키면서 칼로리도 관리할 수 있는 제품을 찾아볼게요.";

  /* single-concern hints */
  if (s.size === 1) {
    if (s.has("소화기 관리"))
      return isEn ? "Digestive issues often improve significantly with the right diet."
                  : "소화기 문제는 사료 변경만으로도 크게 좋아지는 경우가 많아요.";
    if (s.has("체중 관리"))
      return isEn ? "Proper nutrition is the most effective way to manage weight."
                  : "적절한 영양 관리가 체중 조절의 가장 효과적인 방법이에요.";
    if (s.has("관절 관리") && data.sizeClass === "large")
      return isEn ? "Joint care is especially important for large breeds — good call!"
                  : "대형견에게 관절 관리는 특히 중요해요. 좋은 선택이에요!";
    if (s.has("피부 건강"))
      return isEn ? "Many skin issues can be improved through targeted nutrition."
                  : "많은 피부 문제가 맞춤 영양으로 개선될 수 있어요.";
    if (s.has("요로계 관리"))
      return isEn ? "Urinary health is heavily influenced by diet — we have great options for this."
                  : "요로계 건강은 식이에 큰 영향을 받아요. 좋은 제품이 많답니다.";
  }

  /* 3+ concerns */
  if (sel.length >= 3)
    return isEn ? "Multiple concerns noted — I'll find products that cover as many as possible."
                : "여러 고민을 함께 고려해서 최적의 조합을 찾아볼게요.";

  return null;
}

/* ── Emergency detection ── */
const EMERGENCY_KO = /피를?\s*토|피토|혈변|혈뇨|경련|발작|의식.{0,3}(잃|없)|쓰러|호흡.{0,3}(곤란|멈|안\s*해)|중독|독극물|농약|초콜릿.{0,3}먹|자일리톨|포도.{0,3}먹|양파.{0,3}먹|골절|뼈.{0,3}부러|교통사고|차에\s*치|열사병|체온.{0,4}(40|41|42)|심폐소생|응급|죽을|죽어가/i;
const EMERGENCY_EN = /vomit(?:ing)?\s*blood|blood\s*in\s*(?:stool|urine|vomit)|seizur|convuls|unconscious|collaps|can'?t\s*breathe|not\s*breathing|difficulty\s*breathing|poison|toxic|chocolate\s*(?:ate|eat|ingest)|xylitol|grape\s*(?:ate|eat)|onion\s*(?:ate|eat)|fracture|broken\s*bone|hit\s*by\s*(?:a\s*)?car|heatstroke|heat\s*stroke|CPR|emergency|dying|choking/i;

function detectEmergency(text, lang) {
  const pattern = lang === "en" ? EMERGENCY_EN : EMERGENCY_KO;
  return pattern.test(text);
}

/* ── HTML sanitization helper ── */
function escapeHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function buildSummary(d, lang) {
  const t = T[lang];
  const age = t.ages[d.ageCategory]||"";
  const body = t.bodyLabel[d.bodyCondition]||"";
  const sizeText = t.size[d.sizeClass]||"";
  const breed = lang==="en" ? (BREED_EN[d.breed]||d.breed) : d.breed;
  const concerns = d.healthConcerns?.filter(c=>c!=="없음").map(c=>lang==="en"?(CONCERN_EN[c]||c):c);
  const foodPref = d.foodFormPref ? (t.foodFormLabel[d.foodFormPref]||"") : "";
  let line2 = `${t.sizeWord} ${sizeText} · ${t.bodyWord} ${body}`;
  if (foodPref) line2 += ` · ${foodPref}`;
  return `${d.petType==="dog"?"🐶":"🐱"} ${breed||""} · ${age}\n${line2}\n${t.concernsWord}: ${concerns?.join(", ")||t.none}`;
}

export default function App() {
  const lang = URL_LANG;
  const t = T[lang];
  const bd = (b) => lang==="en" ? (BREED_EN[b]||b) : b;
  const cd = (c) => lang==="en" ? (CONCERN_EN[c]||c) : c;
  const [messages, setMessages]   = useState([{role:"bot", text:t.greeting}]);
  const [step, setStep]           = useState("START");
  const [data, setData]           = useState({});
  const [selected, setSelected]   = useState([]);
  const [freeText, setFreeText]   = useState("");
  const [specialNotes, setSpecial] = useState("");
  const [mainInput, setMainInput] = useState("");
  const [inputVal, setInputVal]   = useState("");
  const [isTyping, setIsTyping]   = useState(false);
  const [results, setResults]     = useState(null);
  const [showSave, setShowSave]   = useState(false);
  const [selectedSpecial, setSelectedSpecial] = useState([]);
  const [showSpecialInput, setShowSpecialInput] = useState(false);
  const [dbConcerns, setDbConcerns] = useState({dog: FALLBACK_DOG, cat: FALLBACK_CAT});
  const [loadingLabel, setLoadingLabel] = useState("");
  const loadingTimer = useRef(null);
  const bottomRef = useRef(null);
  const dataRef = useRef(data);
  const audioCtxRef = useRef(null);

  function getAudioCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtxRef.current;
  }

  function playOpen() {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      [784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.25);
      });
    } catch {}
  }

  function playTick() {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  function playClose() {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  function playChime() {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const notes = [880, 1108.73, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.5);
      });
    } catch(e) { console.log("audio skip:", e); }
  }
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    fetch("/api/categories").then(r=>r.json()).then(d=>{
      if(d.dog?.length) setDbConcerns({dog: d.dog, cat: d.cat});
    }).catch(()=>{});
  }, []);

  const doneRef = useRef(null);
  useEffect(() => {
    if (step === "DONE" && results) {
      setTimeout(() => doneRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 300);
    } else {
      bottomRef.current?.scrollIntoView({ behavior:"smooth" });
    }
  }, [messages, isTyping, results, showSave, step, selected]);

  function fetchWithTimeout(url, options = {}, timeoutMs = 35000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  function addBot(text, nextStep, delay=900) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(p=>[...p,{role:"bot",text}]);
      if (nextStep) setStep(nextStep);
    }, delay);
  }
  function addUser(text) { setMessages(p=>[...p,{role:"user",text}]); }

  const AFFIRM = /^(네|넵|넹|응|어|ㅇㅇ|좋아|좋아요|그래|그래요|할게|할래|할래요|시작|시작할게|ok|yes|예|맞아|맞아요|해줘|해주세요|부탁|부탁해)$/i;
  const DENY   = /^(아니|아니요|아뇨|싫어|안할래|괜찮아|됐어|패스|no|nope)$/i;

  function handleContextInput(txt) {
    if (step==="CONFIRM_PARSE") {
      if (AFFIRM.test(txt)) { startRecommend(); return true; }
      if (DENY.test(txt)) {
        addBot(t.restartConfirm, "AUTH_PROMPT");
        return true;
      }
    }
    if (step==="CONFIRM") {
      if (AFFIRM.test(txt)) { handleConfirm(); return true; }
      if (DENY.test(txt)) { handleRestart(); return true; }
    }
    return false;
  }

  async function handleMainInput() {
    const txt = mainInput.trim();
    if (!txt) return;
    addUser(txt);
    setMainInput("");

    if (handleContextInput(txt)) return;

    if (step !== "START" && step !== "EMERGENCY") return;

    /* ── Emergency detection ── */
    if (step === "START" && detectEmergency(txt, lang)) {
      setStep("EMERGENCY");
      addBot(t.emergency, "EMERGENCY");
      return;
    }
    /* If user says "continue" from EMERGENCY, proceed to START flow */
    if (step === "EMERGENCY") {
      setStep("START");
      /* fall through to normal START parsing */
    }

    setStep("PARSING");

    try {
      const res = await fetchWithTimeout("/api/parse-intent", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ text: txt, lang })
      });
      const parsed = await res.json();

      if (parsed.is_relevant === false) {
        setStep("START");
        addBot(t.notRelevant, "START", 600);
        return;
      }

      const hasInfo = parsed.pet_type || parsed.age_category || (parsed.concerns && parsed.concerns.length > 0);
      if (!hasInfo) {
        setStep("START");
        const greeting = parsed.sympathy_msg || t.defGreeting;
        addBot(greeting + t.noInfoSfx, "START", 600);
        return;
      }

      const newData = { petType: parsed.pet_type, healthConcerns: parsed.concerns||[] };
      if (parsed.age_category) newData.ageCategory = parsed.age_category;
      if (parsed.breed) newData.breed = parsed.breed;
      if (parsed.body_condition && ["underweight","normal","overweight"].includes(parsed.body_condition)) {
        newData.bodyCondition = parsed.body_condition;
        if (parsed.body_condition === "overweight" && !newData.healthConcerns.includes("체중 관리")) {
          newData.healthConcerns = [...newData.healthConcerns, "체중 관리"];
        }
      }
      setData(p=>({...p, ...newData}));
      dataRef.current = {...dataRef.current, ...newData};

      const sympathyMsg = parsed.sympathy_msg || t.defSympathy;
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(p=>[...p,{role:"bot",text:sympathyMsg}]);

        setTimeout(() => {
          const chips = [];
          if (parsed.pet_type) chips.push(parsed.pet_type==="dog"?t.dog:t.cat);
          if (parsed.breed) chips.push(`🐾 ${bd(parsed.breed)}`);
          if (parsed.age_category) {
            if (t.ages[parsed.age_category]) chips.push(`📅 ${t.ages[parsed.age_category]}`);
          }
          if (parsed.body_condition && t.bodyLabel[parsed.body_condition]) chips.push(`⚖️ ${t.bodyLabel[parsed.body_condition]}`);
          if (parsed.concerns?.length) chips.push(...parsed.concerns.map(c=>cd(c)));
          const chipHtml = chips.length
            ? `<div class="context-chip-wrap">${chips.map(c=>`<span class="context-chip">✓ ${c}</span>`).join("")}</div>`
            : "";
          addBot(`${t.parsed}${chipHtml}${t.parsedSfx}`, "CONFIRM_PARSE");
        }, 800);
      }, 900);

    } catch {
      addBot(t.parseErr, "PET_TYPE", 600);
    }
  }

  function getNextStep(currentData) {
    const d = currentData || data;
    if (!d.petType) return { step: "PET_TYPE", msg: t.pickPet };
    if (!d.breed) return { step: "BREED", msg: t.pickBreed(d.petType) };
    if (!d.ageCategory) return { step: "AGE", msg: t.pickAge };
    if (!d.bodyCondition) return { step: "BODY", msg: t.pickBody };
    if (d.foodFormPref === undefined) return { step: "FOOD_FORM", msg: t.pickFood };
    if (!d.healthConcerns || d.healthConcerns.length === 0) return { step: "CONCERNS", msg: t.pickConcerns };
    return { step: "CONCERNS", msg: t.editConcerns };
  }

  function goToNextStep(currentData, showSkip=false) {
    const d = currentData || dataRef.current;
    const { step: nextStep, msg } = getNextStep(d);

    if (nextStep === "CONCERNS" && d.healthConcerns?.length) {
      setSelected(d.healthConcerns.filter(c => c !== "없음"));
    }

    if (showSkip) {
      const known = [];
      if (d.petType) known.push(d.petType==="dog"?t.dog:t.cat);
      if (d.ageCategory) {
        const ageLabel = t.ages[d.ageCategory];
        if (ageLabel) known.push(ageLabel);
      }
      if (d.healthConcerns?.length) known.push(...d.healthConcerns.map(c=>cd(c)));
      if (known.length > 1) {
        addBot(t.fast(msg), nextStep, 500);
        return;
      }
    }
    addBot(msg, nextStep, 500);
  }

  function startRecommend() {
    addUser(t.recommendU);
    addBot(t.authPrompt, "AUTH_PROMPT", 500);
  }

  function handleAuth(choice) {
    if (step !== "AUTH_PROMPT") return;
    playTick();
    setStep("_PROCESSING");
    if (choice === "member") {
      addUser(t.authMemberU);
      addBot(t.authMemberB, null, 400);
      setTimeout(() => goToNextStep(null, true), 1400);
    } else if (choice === "join") {
      addUser(t.authJoinU);
      addBot(t.authJoinB, null, 400);
      setTimeout(() => goToNextStep(null, true), 1400);
    } else {
      addUser(t.authSkipU);
      addBot(t.authSkipB, null, 300);
      setTimeout(() => goToNextStep(null, true), 1200);
    }
  }

  function handlePetType(type) {
    if (step !== "PET_TYPE") return;
    playTick();
    setStep("_PROCESSING");
    addUser(type==="dog"?t.dog:t.cat);
    const updated = {...dataRef.current, petType:type};
    setData(p=>({...p, petType:type}));
    dataRef.current = updated;
    setTimeout(() => goToNextStep(updated), 400);
  }

  async function handleBreed(breed) {
    if (step !== "BREED") return;
    playTick();
    addUser(bd(breed));
    setStep("_WAIT");
    const autoSize = BREED_SIZE[breed] || "all";
    const updated = {...dataRef.current, breed, sizeClass: autoSize};
    setData(p=>({...p, breed, sizeClass: autoSize}));
    dataRef.current = updated;

    setIsTyping(true);
    try {
      const res = await fetchWithTimeout("/api/breed-comment", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ breed, pet_type: updated.petType, lang })
      }, 10000);
      const d = await res.json();
      setIsTyping(false);
      if (d.comment) {
        setMessages(p=>[...p,{role:"bot",text:d.comment}]);
        setTimeout(() => goToNextStep(updated), 1600);
        return;
      }
    } catch(e) {
      setIsTyping(false);
      console.log("breed-comment skip:", e);
    }

    setTimeout(() => goToNextStep(updated), 400);
  }

  /* ── A: Context-aware transition messages ── */
  function ageContextMsg(cat, d) {
    const breed = lang==="en" ? (BREED_EN[d.breed]||d.breed) : d.breed;
    const size = d.sizeClass;
    if (lang === "en") {
      if (cat==="puppy") return size==="large"
        ? `A ${breed} puppy! 🐾 This is the golden growth period — nutrition is key right now.\n\n${t.pickBody}`
        : `A ${breed} puppy! 🐾 Let's make sure they get the right start.\n\n${t.pickBody}`;
      if (cat==="adult") return `${breed} in their prime years! 💪 Let's find the best nutrition to keep them thriving.\n\n${t.pickBody}`;
      if (cat==="senior7") return `${breed} is entering their senior years. 🤍 Nutrition plays a bigger role now.\n\n${t.pickBody}`;
      return `A senior ${breed} — they deserve extra special care. 🤍 Let's find the right support.\n\n${t.pickBody}`;
    }
    if (cat==="puppy") return size==="large"
      ? `${breed} 퍼피군요! 🐾 대형견은 지금이 성장의 골든타임이에요. 영양이 정말 중요한 시기예요.\n\n${t.pickBody}`
      : `${breed} 퍼피군요! 🐾 건강한 시작을 위해 딱 맞는 영양을 찾아볼게요.\n\n${t.pickBody}`;
    if (cat==="adult") return `한창 활발한 ${breed}이군요! 💪 최적의 컨디션을 유지할 수 있도록 도와드릴게요.\n\n${t.pickBody}`;
    if (cat==="senior7") return `${breed}가 시니어 시기에 접어들었군요. 🤍 이 시기엔 영양 관리가 더 중요해져요.\n\n${t.pickBody}`;
    return `고령의 ${breed}이군요. 🤍 더 세심한 케어가 필요한 시기예요. 함께 찾아볼게요.\n\n${t.pickBody}`;
  }

  function bodyContextMsg(val, d) {
    const breed = lang==="en" ? (BREED_EN[d.breed]||d.breed) : d.breed;
    if (lang === "en") {
      if (val==="normal") return `Great, ${breed} is at a healthy weight! 👍\n\n${t.pickFood}`;
      if (val==="overweight") return `Got it — I'll keep weight management in mind for ${breed}. 📋\n\n${t.pickFood}`;
      return `Understood — we'll look for nutrition that helps ${breed} gain healthy weight. 📋\n\n${t.pickFood}`;
    }
    if (val==="normal") return `${breed}, 정상 체형이군요! 👍\n\n${t.pickFood}`;
    if (val==="overweight") return `알겠어요! ${breed}의 체중 관리를 우선적으로 고려할게요. 📋\n\n${t.pickFood}`;
    return `${breed}가 조금 마른 편이군요. 건강한 체중 증가를 위한 영양을 찾아볼게요. 📋\n\n${t.pickFood}`;
  }

  function handleAge(cat, label) {
    if (step !== "AGE") return;
    playTick();
    setStep("_PROCESSING");
    addUser(label);
    const updated = {...dataRef.current, ageCategory:cat};
    if (cat === "senior7" || cat === "senior11") {
      const existing = updated.healthConcerns || [];
      if (!existing.includes("노령 관리")) {
        updated.healthConcerns = [...existing, "노령 관리"];
      }
    }
    setData(p=>({...p, ageCategory:cat, healthConcerns: updated.healthConcerns || p.healthConcerns}));
    dataRef.current = updated;

    /* A: contextual age message if breed is known */
    if (updated.breed) {
      addBot(ageContextMsg(cat, updated), "BODY");
    } else {
      setTimeout(() => goToNextStep(updated), 400);
    }
  }


  function handleBody(val, label) {
    if (step !== "BODY") return;
    playTick();
    setStep("_PROCESSING");
    addUser(label);
    const updated = {...dataRef.current, bodyCondition:val};
    if (val === "overweight") {
      const existing = updated.healthConcerns || [];
      if (!existing.includes("체중 관리")) {
        updated.healthConcerns = [...existing, "체중 관리"];
      }
    }
    setData(p=>({...p, bodyCondition: val, healthConcerns: updated.healthConcerns || p.healthConcerns}));
    dataRef.current = updated;
    const autoConcerns = updated.healthConcerns || [];
    if (autoConcerns.length) {
      setSelected(autoConcerns.filter(c => c !== "없음"));
    }

    /* A: contextual body message if breed is known */
    if (updated.breed) {
      addBot(bodyContextMsg(val, updated), "FOOD_FORM");
    } else {
      addBot(t.pickFood, "FOOD_FORM");
    }
  }

  function handleFoodForm(val) {
    if (step !== "FOOD_FORM") return;
    playTick();
    setStep("_PROCESSING");
    const label = t.foodForm[val];
    addUser(label);
    const pref = val === "skip" ? null : val;
    const updated = {...dataRef.current, foodFormPref: pref};
    setData(p=>({...p, foodFormPref: pref}));
    dataRef.current = updated;

    const autoConcerns = updated.healthConcerns || [];
    if (autoConcerns.length) {
      setSelected(autoConcerns.filter(c => c !== "없음"));
      addBot(t.editConcerns, "CONCERNS");
    } else {
      addBot(t.pickConcerns, "CONCERNS");
    }
  }

  function toggleConcern(c) {
    if (c==="없음") return;
    playTick();
    setSelected(p => {
      return p.includes(c)?p.filter(x=>x!==c):[...p,c];
    });
  }

  async function handleConcernsDone() {
    if (step !== "CONCERNS") return;
    setStep("_PROCESSING");

    let finalConcerns = [...selected];
    let classifiedFromText = [];

    if (freeText.trim()) {
      try {
        const res = await fetchWithTimeout("/api/classify-concerns",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({text:freeText.trim(), pet_type:data.petType, lang})
        });
        const d2 = await res.json();
        classifiedFromText = (d2.concerns||[]).filter(c => !finalConcerns.includes(c));
        finalConcerns = [...new Set([...finalConcerns,...(d2.concerns||[])])];
      } catch {}
    }

    if (!finalConcerns.length) finalConcerns = [];

    const displayText = freeText.trim()
      ? `${freeText.trim()}${selected.filter(c=>c!=="없음").length ? `\n+ ${selected.filter(c=>c!=="없음").map(c=>cd(c)).join(", ")}` : ""}`
      : (finalConcerns.length ? finalConcerns.map(c=>cd(c)).join(", ") : t.none);

    addUser(displayText);
    const newData = {...data, healthConcerns:finalConcerns};
    setData(newData);
    dataRef.current = {...dataRef.current, healthConcerns:finalConcerns};
    setSelected([]); setFreeText("");

    /* ── E: Show AI understanding of free text ── */
    if (freeText.trim() && classifiedFromText.length > 0) {
      const classified = classifiedFromText.map(c=>cd(c)).join(", ");
      const ackMsg = lang === "en"
        ? `Got it! ✅ I've identified: **${classified}** from your description. I'll factor this into the recommendation.`
        : `이해했어요! ✅ 말씀하신 내용에서 **${classified}**을(를) 파악했어요. 추천에 반영할게요.`;
      addBot(ackMsg + "\n\n" + t.specialQ, "SPECIAL");
    } else {
      addBot(t.specialQ, "SPECIAL");
    }
  }

  function toggleSpecialOption(opt) {
    playTick();
    setSelectedSpecial(p => p.includes(opt) ? p.filter(x=>x!==opt) : [...p, opt]);
  }

  function handleSpecial(notes) {
    if (step !== "SPECIAL") return;
    setStep("_PROCESSING");

    const combined = [...selectedSpecial, ...(notes&&notes.trim()?[notes.trim()]:[])];
    const finalNotes = combined.join(", ");
    const hasNotes = finalNotes.length > 0;
    addUser(hasNotes ? finalNotes : t.spNoneUser);

    /* ── Emergency check in special notes ── */
    if (hasNotes && detectEmergency(finalNotes, lang)) {
      const safeFinalNotes = escapeHtml(finalNotes);
      const emergencyNote = lang === "en"
        ? `🚨 **Emergency symptoms detected** in your notes: "${safeFinalNotes}"\n\nPlease consult a veterinarian first. I'll still proceed with the recommendation, but **please prioritize a vet visit.**`
        : `🚨 **응급 증상이 감지되었어요**: "${safeFinalNotes}"\n\n수의사 상담을 먼저 받으시길 권합니다. 추천은 계속 진행하지만, **병원 방문을 우선해주세요.**`;
      setMessages(p=>[...p,{role:"bot",text:emergencyNote}]);
    }

    const updatedData = { ...dataRef.current, specialNotes: hasNotes ? finalNotes : "" };
    setData(p => ({ ...p, specialNotes: hasNotes ? finalNotes : "" }));
    dataRef.current = updatedData;
    setSpecial(""); setSelectedSpecial([]); setShowSpecialInput(false);

    /* ── Contradiction validation ── */
    const warnings = validateInputs(updatedData, lang);
    if (warnings.length > 0) {
      /* Auto-fix: remove contradictory concerns */
      const cleaned = autoFixConcerns(updatedData);
      setData(p => ({ ...p, healthConcerns: cleaned.healthConcerns, specialNotes: cleaned.specialNotes }));
      dataRef.current = { ...dataRef.current, healthConcerns: cleaned.healthConcerns, specialNotes: cleaned.specialNotes };

      const summary = buildSummary(cleaned, lang);
      const warningText = warnings.join("\n");
      const safeNotes = cleaned.specialNotes ? escapeHtml(cleaned.specialNotes) : "";
      addBot(`⚠️ ${warningText}\n\n${t.summaryPre}\n\n${summary}${safeNotes ? `\n${t.spNoteWord}: ${safeNotes}` : ""}\n\n${t.confirmQ}`, "CONFIRM");
    } else {
      const summary = buildSummary(updatedData, lang);
      const safeNotes = hasNotes ? escapeHtml(finalNotes) : "";
      addBot(`${t.summaryPre}\n\n${summary}${safeNotes ? `\n${t.spNoteWord}: ${safeNotes}` : ""}\n\n${t.confirmQ}`, "CONFIRM");
    }
  }

  function validateInputs(d, lang) {
    const warnings = [];
    const age = d.ageCategory;
    const concerns = d.healthConcerns || [];
    const notes = d.specialNotes || "";

    if (age === "puppy") {
      const puppyBad = d.petType === "dog" ? PUPPY_HIDDEN_CONCERNS_DOG : PUPPY_HIDDEN_CONCERNS_CAT;
      const found = concerns.filter(c => puppyBad.has(c));
      if (found.length) {
        const names = found.map(c => lang === "en" ? (CONCERN_EN[c]||c) : c).join(", ");
        warnings.push(lang === "en"
          ? `"${names}" is not typical for pets under 1 year. It has been automatically removed.`
          : `"${names}"은(는) 1살 미만에게 해당하지 않는 항목이라 자동으로 제외했어요.`);
      }
      if (notes.includes("임신") || notes.includes("수유") || notes.includes("pregnant") || notes.includes("nursing")) {
        warnings.push(lang === "en"
          ? `Pregnancy/nursing is unusual for pets under 1 year. It has been removed. Please consult a vet.`
          : `1살 미만 반려동물의 임신/수유는 매우 드문 경우예요. 자동으로 제외했으며, 수의사 상담을 권장합니다.`);
      }
    }
    return warnings;
  }

  function autoFixConcerns(d) {
    const age = d.ageCategory;
    let concerns = [...(d.healthConcerns || [])];
    let notes = d.specialNotes || "";

    if (age === "puppy") {
      const puppyBad = d.petType === "dog" ? PUPPY_HIDDEN_CONCERNS_DOG : PUPPY_HIDDEN_CONCERNS_CAT;
      concerns = concerns.filter(c => !puppyBad.has(c));
      /* Remove pregnancy-related special notes for puppies */
      const pregTerms = ["임신/수유 중","임신","수유","Pregnant / Nursing","pregnant","nursing"];
      const parts = notes.split(", ").filter(p => !pregTerms.some(term => p.includes(term)));
      notes = parts.join(", ");
    }
    return { ...d, healthConcerns: concerns, specialNotes: notes };
  }

  function buildLoadingSteps(d, lang) {
    const breed = lang === "en" ? (BREED_EN[d.breed]||d.breed) : d.breed;
    const size = lang === "en" ? (T.en.size[d.sizeClass]||"") : (T.ko.size[d.sizeClass]||"");
    const age = lang === "en" ? (T.en.ages[d.ageCategory]||"") : (T.ko.ages[d.ageCategory]||"");
    const concerns = (d.healthConcerns||[]).filter(c=>c!=="없음").map(c=> lang==="en"?(CONCERN_EN[c]||c):c);

    if (lang === "en") {
      const steps = [`📦 Scanning 120+ Hill's formulas for ${size} ${age} pets...`];
      if (concerns.length) steps.push(`🔬 Evaluating ${concerns.join(" + ")} nutrition profiles...`);
      if (breed) steps.push(`🧬 Optimizing for ${breed}-specific needs...`);
      steps.push("🏆 Ranking top matches by fit score...");
      return steps;
    }
    const steps = [`📦 ${size ? size+" " : ""}${age} Hill's 제품 120여 종 검색 중...`];
    if (concerns.length) steps.push(`🔬 ${concerns.join(" + ")} 영양 프로필 분석 중...`);
    if (breed) steps.push(`🧬 ${breed} 맞춤 영양 밸런스 최적화 중...`);
    steps.push("🏆 적합도 기준으로 최적 제품 선별 중...");
    return steps;
  }

  function startLoadingSteps(d) {
    const steps = buildLoadingSteps(d, lang);
    let i = 0;
    setLoadingLabel(steps[0]);
    loadingTimer.current = setInterval(() => {
      i++;
      if (i < steps.length) {
        setLoadingLabel(steps[i]);
      } else {
        clearInterval(loadingTimer.current);
      }
    }, 1800);
  }

  function stopLoadingSteps() {
    if (loadingTimer.current) clearInterval(loadingTimer.current);
    setLoadingLabel("");
  }

  async function handleConfirm() {
    addUser(t.confirmU);
    setStep("LOADING");
    startLoadingSteps(data);
    addBot(t.analyzing, "LOADING", 400);

    try {
      const res = await fetchWithTimeout("/api/recommend",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          pet_type: data.petType,
          life_stage: data.ageCategory,
          size: data.sizeClass || "all",
          body_condition: data.bodyCondition||"normal",
          health_concerns: data.healthConcerns||[],
          breed: data.breed,
          pet_name: data.petName,
          special_notes: data.specialNotes || "",
          food_form_preference: data.foodFormPref || null,
          lang,
        })
      });
      stopLoadingSteps();
      const result = await res.json();
      setResults(result);
      setStep("DONE");
      playChime();
      const reasoning = result.overall_reasoning || "";
      addBot(t.done(data.petName||t.petName, reasoning), "DONE", 600);
      setTimeout(() => setShowSave(true), 2000);
    } catch (err) {
      stopLoadingSteps();
      setStep("DONE");
      const msg = err.name === "AbortError" ? t.timeout : t.error;
      addBot(msg, "DONE", 400);
    }
  }

  function handleRestart() {
    playOpen();
    setMessages([{role:"bot", text:t.greeting}]);
    setStep("START"); setData({}); setSelected([]); setSelectedSpecial([]); setShowSpecialInput(false);
    setFreeText(""); setInputVal(""); setMainInput(""); setSpecial("");
    setResults(null); setShowSave(false);
  }

  function handleStartRecommendBtn() {
    addUser(t.startUser);
    addBot(t.startBot, "AUTH_PROMPT", 400);
  }

  function renderButtons() {
    if (step==="START") return null;

    if (step==="EMERGENCY") return (
      <div className="btn-row">
        <button className="choice-btn ghost" onClick={()=>{
          addUser(t.emergencyContinue);
          setStep("START");
          addBot(t.startBot, "AUTH_PROMPT", 400);
        }}>{t.emergencyContinue}</button>
      </div>
    );

    if (step==="CONFIRM_PARSE") return (
      <div className="btn-row">
        <button className="choice-btn primary" onClick={startRecommend}>{t.yesStart}</button>
        <button className="choice-btn ghost" onClick={()=>{
          addUser(t.startOver);
          addBot(t.restartConfirm, "AUTH_PROMPT");
        }}>{t.startOver}</button>
      </div>
    );

    if (step==="AUTH_PROMPT") return (
      <div className="btn-row">
        <button className="choice-btn ghost" disabled style={{opacity:0.4,cursor:"not-allowed"}} onClick={()=>handleAuth("member")}>{t.authMember}</button>
        <button className="choice-btn ghost" disabled style={{opacity:0.4,cursor:"not-allowed"}} onClick={()=>handleAuth("join")}>{t.authJoin}</button>
        <button className="choice-btn primary" onClick={()=>handleAuth("skip")}>{t.authSkip}</button>
      </div>
    );

    if (step==="PET_TYPE") return (
      <div className="btn-grid-2">
        <button className="choice-btn big" onClick={()=>handlePetType("dog")}>{t.dog}</button>
        <button className="choice-btn big" onClick={()=>handlePetType("cat")}>{t.cat}</button>
      </div>
    );

    if (step==="BREED") {
      const breeds = data.petType==="dog"?DOG_BREEDS:CAT_BREEDS;
      return (
        <div className="btn-grid-3">
          {breeds.map(b=><button key={b} className="choice-btn small" onClick={()=>handleBreed(b)}>{bd(b)}</button>)}
        </div>
      );
    }

    if (step==="AGE") return (
      <div className="btn-row" style={{flexWrap:"wrap"}}>
        {["puppy","adult","senior7","senior11"].map(v=>(
          <button key={v} className="choice-btn" onClick={()=>handleAge(v,t.ages[v])}>{t.ages[v]}</button>
        ))}
      </div>
    );

    if (step==="BODY") return (
      <div className="btn-row">
        {["underweight","normal","overweight"].map(v=>(
          <button key={v} className={`choice-btn body-${v}`} onClick={()=>handleBody(v,t.body[v])}>{t.body[v]}</button>
        ))}
      </div>
    );

    if (step==="FOOD_FORM") return (
      <div className="btn-row" style={{flexWrap:"wrap"}}>
        {["dry","wet","skip"].map(v=>(
          <button key={v} className={`choice-btn${v==="skip"?" ghost":""}`} onClick={()=>handleFoodForm(v)}>{t.foodForm[v]}</button>
        ))}
      </div>
    );

    if (step==="CONCERNS") {
      const rawList = data.petType==="dog"?dbConcerns.dog:dbConcerns.cat;
      const list = getFilteredConcerns(rawList, data.petType, data.ageCategory);
      const hint = getConcernHint(selected, data, lang);
      return (
        <div className="concerns-wrap">
          <div className="btn-grid-3">
            {list.map(c=>(
              <button key={c}
                className={`choice-btn small${selected.includes(c)?" selected":""}`}
                onClick={()=>toggleConcern(c)}>{cd(c)}</button>
            ))}
          </div>
          {hint && <div className="concern-hint">💡 {hint}</div>}
          <button className="next-btn" onClick={handleConcernsDone}>
            {selected.length>0 ? t.next : t.noConcern}
          </button>
        </div>
      );
    }

    if (step==="SPECIAL") {
      const allSpecialOpts = [t.spPreg, t.spSurg, t.spAllergy, t.spRx];
      const specialOpts = getFilteredSpecialOpts(allSpecialOpts, data.ageCategory);
      if (showSpecialInput) {
        return (
          <div className="concerns-wrap">
            <div className="free-input-wrap">
              <div className="free-input-label">{t.spLabel}</div>
              <textarea className="free-input"
                placeholder={t.spPlaceholder}
                value={specialNotes} onChange={e=>setSpecial(e.target.value)} />
            </div>
            <button className="next-btn" onClick={()=>handleSpecial(specialNotes)}>
              {specialNotes.trim() ? t.spDone : t.spNone}
            </button>
            <button className="back-to-btns" onClick={()=>{setShowSpecialInput(false);}}>{t.spBack}</button>
          </div>
        );
      }
      return (
        <div className="concerns-wrap special-bottom">
          <div className="btn-grid-2">
            {specialOpts.map(opt=>(
              <button key={opt}
                className={`choice-btn small${selectedSpecial.includes(opt)?" selected":""}`}
                onClick={()=>toggleSpecialOption(opt)}>{opt}</button>
            ))}
            <button className="choice-btn small special-direct-input"
              onClick={()=>setShowSpecialInput(true)}>{t.spDirect}</button>
          </div>
          <button className="next-btn" onClick={()=>handleSpecial(specialNotes)}>
            {selectedSpecial.length>0 || specialNotes.trim() ? t.next : t.spNone}
          </button>
        </div>
      );
    }

    if (step==="CONFIRM") return (
      <div className="btn-row" style={{justifyContent:"center"}}>
        <button className="choice-btn primary" style={{width:"80%",maxWidth:"300px"}} onClick={handleConfirm}>{t.confirmBtn}</button>
      </div>
    );

    if (step==="DONE") return (
      <div className="btn-row" style={{justifyContent:"center",flex:1,alignItems:"center"}}>
        <button className="choice-btn" style={{minWidth:"160px",textAlign:"center"}} onClick={handleRestart}>{t.retry}</button>
      </div>
    );

    return null;
  }

  function BubbleText({text, role}) {
    let html;
    if (role === "user") {
      /* User messages: escape ALL HTML first to prevent XSS, then apply markdown */
      html = escapeHtml(text)
        .replace(/\n/g,"<br/>")
        .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
        .replace(/\*(.*?)\*/g,"<em>$1</em>");
    } else {
      /* Bot messages: trust internal HTML (generated by app code), apply markdown */
      html = text
        .replace(/\n/g,"<br/>")
        .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
        .replace(/\*(.*?)\*/g,"<em>$1</em>");
    }
    return <span dangerouslySetInnerHTML={{__html:html}}/>;
  }

  function ProductCard({product, index}) {
    const ranks = lang==="en"
      ? ["🏆 TOP PICK","⭐ GREAT FIT","✅ SOLID CHOICE"]
      : ["🏆 최적 추천","⭐ 추천","✅ 추천"];
    return (
      <div className="product-card">
        <div className="card-top">
          <span className="card-rank-badge">{ranks[index]||`#${index+1}`}</span>
          {product.is_prescription && <span className="card-rx-badge">{t.rxBadge}</span>}
        </div>
        <div className="card-body">
          <div className="card-img-row">
            <div className="card-img-box">
              {product.image_url ? (
                <img src={product.image_url} alt={(lang==="en" && product.product_name_en) ? product.product_name_en : product.product_name_kr} className="card-product-img"
                  onError={e=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex';}} />
              ) : null}
              <span className="card-img-fallback" style={product.image_url?{display:'none'}:undefined}>
                {data.petType==="dog"?"🐶":"🐱"}
              </span>
            </div>
            <div className="card-info">
              <div className="card-name">{(lang==="en" && product.product_name_en) ? product.product_name_en : product.product_name_kr}</div>
              {product.brand === "사이언스 다이어트"
                ? <span className="brand-badge brand-sd">{lang==="en"?"SCIENCE DIET":"사이언스 다이어트"}</span>
                : product.brand === "프리스크립션 다이어트"
                ? <span className="brand-badge brand-pd">{lang==="en"?"PRESCRIPTION DIET":"프리스크립션 다이어트"}</span>
                : <div className="card-brand">{product.brand}</div>}
            </div>
          </div>
          <div className="card-meta">
            {product.food_form && <span className="meta-item">{product.food_form}</span>}
            {product.flavor && <span className="meta-item">{product.flavor}{t.flavorSfx}</span>}
            {product.is_activbiome && <span className="meta-item activbiome">{lang==="en"?"ActivBiome+":"액티브바이옴+"}</span>}
            {product.product_line && <span className="meta-item">{product.product_line}</span>}
          </div>
          {(product.health_benefits||[]).length>0 && (
            <div className="card-tags">
              {product.health_benefits.slice(0,4).map(b=><span key={b} className="tag">{lang==="en"?(CONCERN_EN[b]||b):b}</span>)}
            </div>
          )}
          {product.description && <div className="card-desc">{product.description}</div>}
          {product.reasoning && <div className="card-reason">{product.reasoning}</div>}
          {product.product_url && (
            <a href={product.product_url} target="_blank" rel="noreferrer" className="card-link">
              {t.viewHills}
            </a>
          )}
        </div>
      </div>
    );
  }

  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="demo-wrapper">
      <div className="demo-bg">
        <img src={lang==="en"?"/hills-site-bg-en.png":"/hills-site-bg.png"} alt="Hills Pet Nutrition" className="demo-bg-img" />
      </div>

      {!chatOpen && (
        <button className="chat-fab" onClick={() => {setChatOpen(true); playOpen();}}>
          <img src="/bot-avatar.png" alt="chat" className="chat-fab-icon" />
        </button>
      )}

      <div className={`app ${chatOpen ? "chat-open" : "chat-closed"}`}>
      <header className="header">
        <div className="header-inner">
          <img className="logo-icon" src="/bot-logo.png" alt="Pet Life Planner" />
          <div>
            <div className="header-title">Hill's Pet Planner</div>
            <div className="header-sub">{t.headerSub}</div>
          </div>
          <button className="header-close-btn" onClick={() => {playClose(); setTimeout(()=>setChatOpen(false), 150);}}>✕</button>
        </div>
      </header>

      <main className="chat-area">

        {messages.map((m,i)=>{
          const isDone = m.role==="bot" && m.text.includes("done-banner");
          return (
          <div key={i} className={`bubble-wrap ${m.role}${isDone?" done-wrap":""}`} ref={isDone?doneRef:null}>
            {m.role==="bot"&&<img className="avatar" src="/bot-avatar.png" alt="bot" />}
            <div className={`bubble ${m.role}${isDone?" done-bubble":""}`}>
              <BubbleText text={m.text} role={m.role}/>
            </div>
          </div>
          );
        })}

        {isTyping&&(
          <div className="bubble-wrap bot">
            <img className="avatar" src="/bot-avatar.png" alt="bot" />
            <div className="bubble bot typing"><span/><span/><span/></div>
          </div>
        )}

        {step==="LOADING"&&!isTyping&&(
          <div className="loading-animation">
            <div className="loading-icon-wrap">
              <span className="loading-magnifier">🔍</span>
            </div>
            <div className="loading-label">{loadingLabel || t.analyzingLabel}</div>
            <div className="loading-dots-bar"><span/><span/><span/></div>
          </div>
        )}

        {results&&step==="DONE"&&(
          <div className="results-wrap">
            {results.products?.map((p,i)=><ProductCard key={i} product={p} index={i}/>)}
            {results.special_warning&&(
              <div className="rx-note">🔔 {results.special_warning}</div>
            )}
            {results.prescription_note&&(
              <div className="rx-note">⚠️ {results.prescription_note}</div>
            )}
          </div>
        )}

        {showSave&&step==="DONE"&&(
          <div className="save-cta">
            <div className="quick-options" style={{marginBottom:"12px"}}>
              <div style={{fontSize:"13px",color:"var(--gray-500)",marginBottom:"6px"}}>{t.browseMore}</div>
              <a href={t.bestUrl} target="_blank" rel="noreferrer" className="quick-option-bar">
                <span>{t.bestP}</span><span className="quick-arrow">→</span>
              </a>
              <a href={t.newUrl} target="_blank" rel="noreferrer" className="quick-option-bar">
                <span>{t.newP}</span><span className="quick-arrow">→</span>
              </a>
              <a href={t.storeUrl} target="_blank" rel="noreferrer" className="quick-option-bar">
                <span>{t.storeP}</span><span className="quick-arrow">→</span>
              </a>
            </div>
            <div className="save-cta-title">{t.saveQ}</div>
            <div className="save-cta-sub">{t.saveSub}</div>
            <div className="save-cta-btns">
              <button className={`save-btn-kakao${lang==="en"?" google":""}`} onClick={()=>alert(t.kakaoAlert)}>
                {lang==="en" && <svg className="google-g" viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                {t.kakao}
              </button>
              <button className="save-btn-skip" onClick={()=>setShowSave(false)}>
                {t.skipSave}
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </main>

      <footer className="footer">
        {step!=="LOADING"&&step!=="START"&&renderButtons()}
        {["PET_TYPE","BREED","AGE","BODY","FOOD_FORM","CONCERNS","SPECIAL","CONFIRM"].includes(step)&&(
          <button className="restart-link" onClick={handleRestart}>{t.restartLink}</button>
        )}
        {step==="START"&&!isTyping&&messages.length>0&&(
          <div className="quick-options">
            <button className="cta-recommend" onClick={handleStartRecommendBtn}>
              {t.cta}
            </button>
          </div>
        )}
        <div className={`input-row-wrapper ${step === "START" ? "visible" : ""}`}>
          <div className="input-row">
            <input className="text-input" type="text"
              placeholder={t.placeholder}
              value={mainInput}
              onChange={e=>setMainInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&(e.shiftKey||!e.nativeEvent.isComposing)){e.preventDefault();handleMainInput();}}}
            />
            <button className="send-btn" onClick={handleMainInput}>→</button>
          </div>
        </div>
      </footer>
      </div>

      {chatOpen && (
        <button className="chat-bottom-close" onClick={() => {playClose(); setTimeout(()=>setChatOpen(false), 150);}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      )}
    </div>
  );
}
