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

function buildSummary(d) {
  const age = {puppy:"1살 미만",adult:"1~7살",senior7:"7~11살",senior11:"11살 이상"}[d.ageCategory]||"";
  const body = {underweight:"마름",normal:"정상",overweight:"과체중"}[d.bodyCondition]||"";
  const sizeText = {small:"소형",all:"중형",large:"대형"}[d.sizeClass]||"";
  return `${d.petType==="dog"?"🐶":"🐱"} ${d.breed||""} · ${age}\n체급 ${sizeText} · 체형 ${body}\n건강 고민: ${d.healthConcerns?.filter(c=>c!=="없음").join(", ")||"없음"}`;
}

export default function App() {
  const [messages, setMessages]   = useState([{role:"bot", text:"안녕하세요! <span class=\"wave\">👋</span>\n반려동물 맞춤 영양사 **힐스 펫 플래너**예요.\n꼭 맞는 제품을 추천해드릴게요!"}]);
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
        addBot("알겠어요! 처음부터 차근차근 진행할게요.", "AUTH_PROMPT");
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

    if (step !== "START") return;

    setStep("PARSING");

    try {
      const res = await fetchWithTimeout("/api/parse-intent", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ text: txt })
      });
      const parsed = await res.json();

      if (parsed.is_relevant === false) {
        setStep("START");
        addBot(
          "안녕하세요! 저는 **Hill's Pet Planner** 맞춤 사료 추천 봇이에요. 🐾\n\n" +
          "아래와 같은 도움을 드릴 수 있어요:\n" +
          "• 반려동물 건강 고민에 맞는 **맞춤 사료 추천**\n" +
          "• 강아지/고양이 **영양 상담**\n" +
          "• Hill's 제품 정보 안내\n\n" +
          "반려동물에 대해 궁금한 점이 있으시면 편하게 말씀해 주세요!",
          "START", 600
        );
        return;
      }

      const hasInfo = parsed.pet_type || parsed.age_category || (parsed.concerns && parsed.concerns.length > 0);
      if (!hasInfo) {
        setStep("START");
        const greeting = parsed.sympathy_msg || "안녕하세요! 반려동물 영양 상담을 위해 찾아주셔서 감사합니다 😊";
        addBot(greeting + "\n\n궁금한 점이 있으시면 편하게 말씀해 주세요!\n아래 **제품 추천 받기** 버튼을 눌러 시작하실 수도 있어요.", "START", 600);
        return;
      }

      const newData = { petType: parsed.pet_type, healthConcerns: parsed.concerns||[] };
      if (parsed.age_category) newData.ageCategory = parsed.age_category;
      if (parsed.breed) newData.breed = parsed.breed;
      setData(p=>({...p, ...newData}));
      dataRef.current = {...dataRef.current, ...newData};

      const sympathyMsg = parsed.sympathy_msg || "말씀해주신 내용을 확인했어요.";
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(p=>[...p,{role:"bot",text:sympathyMsg}]);

        setTimeout(() => {
          const chips = [];
          if (parsed.pet_type) chips.push(parsed.pet_type==="dog"?"🐶 강아지":"🐱 고양이");
          if (parsed.breed) chips.push(`🐾 ${parsed.breed}`);
          if (parsed.age_category) {
            const ageLabels = {puppy:"1살 미만",adult:"1~7살",senior7:"7~11살",senior11:"11살 이상"};
            if (ageLabels[parsed.age_category]) chips.push(`📅 ${ageLabels[parsed.age_category]}`);
          }
          if (parsed.concerns?.length) chips.push(...parsed.concerns);
          const chipHtml = chips.length
            ? `<div class="context-chip-wrap">${chips.map(c=>`<span class="context-chip">✓ ${c}</span>`).join("")}</div>`
            : "";
          addBot(`파악한 내용이에요.${chipHtml}\n\n맞춤 추천을 시작할까요?`, "CONFIRM_PARSE");
        }, 800);
      }, 900);

    } catch {
      addBot("말씀 잘 들었어요! 몇 가지 정보를 더 알려주시면 정확하게 추천해드릴게요.", "PET_TYPE", 600);
    }
  }

  function getNextStep(currentData) {
    const d = currentData || data;
    if (!d.petType) return { step: "PET_TYPE", msg: "반려동물 종류를 선택해주세요." };
    if (!d.breed) return { step: "BREED", msg: `${d.petType==="dog"?"강아지":"고양이"} 품종을 선택해주세요.` };
    if (!d.ageCategory) return { step: "AGE", msg: "나이대를 알려주세요." };
    
    if (!d.bodyCondition) return { step: "BODY", msg: "체형 상태는 어떤가요?" };
    if (!d.healthConcerns || d.healthConcerns.length === 0) return { step: "CONCERNS", msg: "건강 관련 고민이 있으신가요?\n해당하는 항목을 선택해주세요." };
    return { step: "CONCERNS", msg: "건강 고민을 추가하거나 수정할 수 있어요.\n해당하는 항목을 선택해주세요." };
  }

  function goToNextStep(currentData, showSkip=false) {
    const d = currentData || dataRef.current;
    const { step: nextStep, msg } = getNextStep(d);

    if (nextStep === "CONCERNS" && d.healthConcerns?.length) {
      setSelected(d.healthConcerns.filter(c => c !== "없음"));
    }

    if (showSkip) {
      const known = [];
      if (d.petType) known.push(d.petType==="dog"?"🐶 강아지":"🐱 고양이");
      if (d.ageCategory) {
        const ageLabel = {puppy:"1살 미만",adult:"1~7살",senior7:"7~11살",senior11:"11살 이상"}[d.ageCategory];
        if (ageLabel) known.push(ageLabel);
      }
      if (d.healthConcerns?.length) known.push(...d.healthConcerns);
      if (known.length > 1) {
        addBot(`이미 파악한 정보가 있어서 빠르게 진행할게요! 😊\n${msg}`, nextStep, 500);
        return;
      }
    }
    addBot(msg, nextStep, 500);
  }

  function startRecommend() {
    addUser("네, 추천받을게요!");
    addBot("보다 정확한 추천을 위해 회원 여부를 확인합니다.", "AUTH_PROMPT", 500);
  }

  function handleAuth(choice) {
    if (choice === "member") {
      addUser("회원으로 계속");
      addBot("반갑습니다! 🙌", null, 400);
      setTimeout(() => goToNextStep(null, true), 1400);
    } else if (choice === "join") {
      addUser("회원 가입 후 진행");
      addBot("회원가입 후에는 추천 결과가 저장돼요! 😊", null, 400);
      setTimeout(() => goToNextStep(null, true), 1400);
    } else {
      addUser("그냥 진행할게요");
      addBot("알겠어요!", null, 300);
      setTimeout(() => goToNextStep(null, true), 1200);
    }
  }

  function handlePetType(type) {
    addUser(type==="dog"?"🐶 강아지":"🐱 고양이");
    const updated = {...dataRef.current, petType:type};
    setData(p=>({...p, petType:type}));
    dataRef.current = updated;
    setTimeout(() => goToNextStep(updated), 400);
  }

  async function handleBreed(breed) {
    addUser(breed);
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
        body: JSON.stringify({ breed, pet_type: updated.petType })
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

  function handleAge(cat, label) {
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
    setTimeout(() => goToNextStep(updated), 400);
  }


  function handleBody(val, label) {
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
      addBot("건강 고민을 추가하거나 수정할 수 있어요.\n해당하는 항목을 선택해주세요.", "CONCERNS");
    } else {
      addBot("건강 관련 고민이 있으신가요?\n해당하는 항목을 선택해주세요.", "CONCERNS");
    }
  }

  function toggleConcern(c) {
    if (c==="없음") return;
    setSelected(p => {
      return p.includes(c)?p.filter(x=>x!==c):[...p,c];
    });
  }

  async function handleConcernsDone() {
    if (step !== "CONCERNS") return;
    setStep("_PROCESSING");

    let finalConcerns = [...selected];

    if (freeText.trim()) {
      try {
        const res = await fetchWithTimeout("/api/classify-concerns",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({text:freeText.trim(), pet_type:data.petType})
        });
        const d2 = await res.json();
        finalConcerns = [...new Set([...finalConcerns,...(d2.concerns||[])])];
      } catch {}
    }

    if (!finalConcerns.length) finalConcerns = [];

    const displayText = freeText.trim()
      ? `${freeText.trim()}${selected.filter(c=>c!=="없음").length ? `\n+ ${selected.filter(c=>c!=="없음").join(", ")}` : ""}`
      : (finalConcerns.length ? finalConcerns.join(", ") : "없음");

    addUser(displayText);
    const newData = {...data, healthConcerns:finalConcerns};
    setData(newData);
    dataRef.current = {...dataRef.current, healthConcerns:finalConcerns};
    setSelected([]); setFreeText("");

    addBot("거의 다 왔어요! 마지막으로 한 가지만요.\n\n다음 중 해당 사항이 있으신가요?", "SPECIAL");
  }

  function toggleSpecialOption(opt) {
    setSelectedSpecial(p => p.includes(opt) ? p.filter(x=>x!==opt) : [...p, opt]);
  }

  function handleSpecial(notes) {
    if (step !== "SPECIAL") return;
    setStep("_PROCESSING");

    const combined = [...selectedSpecial, ...(notes&&notes.trim()?[notes.trim()]:[])];
    const finalNotes = combined.join(", ");
    const hasNotes = finalNotes.length > 0;
    addUser(hasNotes ? finalNotes : "특이사항 없음");

    const updatedData = { ...dataRef.current, specialNotes: hasNotes ? finalNotes : "" };
    setData(p => ({ ...p, specialNotes: hasNotes ? finalNotes : "" }));
    dataRef.current = updatedData;
    setSpecial(""); setSelectedSpecial([]); setShowSpecialInput(false);

    const summary = buildSummary(updatedData);
    addBot(`입력하신 내용을 정리했어요. ✅\n\n${summary}${hasNotes ? `\n특이사항: ${finalNotes}` : ""}\n\n이대로 맞춤 추천을 받으시겠어요?`, "CONFIRM");
  }

  async function handleConfirm() {
    addUser("네, 추천받을게요 ✨");
    setStep("LOADING");
    addBot("분석 중이에요... 잠시만 기다려주세요 🔍", "LOADING", 400);

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
        })
      });
      const result = await res.json();
      setResults(result);
      setStep("DONE");
      playChime();
      const reasoning = result.overall_reasoning || "";
      addBot(`<div class="done-banner">분석 완료! 🎉</div>${reasoning ? `<div class="done-reason">${reasoning}</div>` : ""}아래에서 ${data.petName||"반려동물"}에게 딱 맞는 Hill's 제품을 확인해보세요.`, "DONE", 600);
      setTimeout(() => setShowSave(true), 2000);
    } catch (err) {
      setStep("DONE");
      const msg = err.name === "AbortError"
        ? "응답 시간이 초과되었어요. 🔄 다시 추천받기를 눌러주세요."
        : "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
      addBot(msg, "DONE", 400);
    }
  }

  function handleRestart() {
    setMessages([{role:"bot", text:"안녕하세요! <span class=\"wave\">👋</span>\n반려동물 맞춤 영양사 **힐스 펫 플래너**예요.\n꼭 맞는 제품을 추천해드릴게요!"}]);
    setStep("START"); setData({}); setSelected([]); setSelectedSpecial([]); setShowSpecialInput(false);
    setFreeText(""); setInputVal(""); setMainInput(""); setSpecial("");
    setResults(null); setShowSave(false);
  }

  function handleStartRecommendBtn() {
    addUser("맞춤 사료 추천받기");
    addBot("시작해볼게요! 먼저 회원 여부를 확인할게요.", "AUTH_PROMPT", 400);
  }

  function renderButtons() {
    if (step==="START") return null;

    if (step==="CONFIRM_PARSE") return (
      <div className="btn-row">
        <button className="choice-btn primary" onClick={startRecommend}>네, 시작할게요 →</button>
        <button className="choice-btn ghost" onClick={()=>{
          addUser("처음부터 할게요");
          addBot("알겠어요! 처음부터 차근차근 진행할게요.", "AUTH_PROMPT");
        }}>처음부터</button>
      </div>
    );

    if (step==="AUTH_PROMPT") return (
      <div className="btn-row">
        <button className="choice-btn ghost" disabled style={{opacity:0.4,cursor:"not-allowed"}} onClick={()=>handleAuth("member")}>기존 회원</button>
        <button className="choice-btn ghost" disabled style={{opacity:0.4,cursor:"not-allowed"}} onClick={()=>handleAuth("join")}>회원 가입</button>
        <button className="choice-btn primary" onClick={()=>handleAuth("skip")}>그냥 진행 →</button>
      </div>
    );

    if (step==="PET_TYPE") return (
      <div className="btn-grid-2">
        <button className="choice-btn big" onClick={()=>handlePetType("dog")}>🐶 강아지</button>
        <button className="choice-btn big" onClick={()=>handlePetType("cat")}>🐱 고양이</button>
      </div>
    );

    if (step==="BREED") {
      const breeds = data.petType==="dog"?DOG_BREEDS:CAT_BREEDS;
      return (
        <div className="btn-grid-3">
          {breeds.map(b=><button key={b} className="choice-btn small" onClick={()=>handleBreed(b)}>{b}</button>)}
        </div>
      );
    }

    if (step==="AGE") return (
      <div className="btn-row" style={{flexWrap:"wrap"}}>
        {[["puppy","1살 미만"],["adult","1~7살"],["senior7","7~11살"],["senior11","11살 이상"]].map(([v,l])=>(
          <button key={v} className="choice-btn" onClick={()=>handleAge(v,l)}>{l}</button>
        ))}
      </div>
    );

    if (step==="BODY") return (
      <div className="btn-row">
        {[["underweight","🔻 마름"],["normal","✅ 정상"],["overweight","🔺 과체중"]].map(([v,l])=>(
          <button key={v} className="choice-btn" onClick={()=>handleBody(v,l)}>{l}</button>
        ))}
      </div>
    );

    if (step==="CONCERNS") {
      const list = data.petType==="dog"?dbConcerns.dog:dbConcerns.cat;
      return (
        <div className="concerns-wrap">
          <div className="btn-grid-3">
            {list.map(c=>(
              <button key={c}
                className={`choice-btn small${selected.includes(c)?" selected":""}`}
                onClick={()=>toggleConcern(c)}>{c}</button>
            ))}
          </div>
          <button className="next-btn" onClick={handleConcernsDone}>
            {selected.length>0 ? "다음 →" : "건강고민 없어요 →"}
          </button>
        </div>
      );
    }

    if (step==="SPECIAL") {
      const specialOpts = ["임신/수유 중","수술 후 회복 중 / 약 복용 중","알레르기 있음","처방식 먹는 중"];
      if (showSpecialInput) {
        return (
          <div className="concerns-wrap">
            <div className="free-input-wrap">
              <div className="free-input-label">특이사항을 자유롭게 입력해주세요</div>
              <textarea className="free-input"
                placeholder="예: 치킨 맛 싫어해요, 연어 맛 선호해요, 알레르기가 있어요..."
                value={specialNotes} onChange={e=>setSpecial(e.target.value)} />
            </div>
            <button className="next-btn" onClick={()=>handleSpecial(specialNotes)}>
              {specialNotes.trim() ? "입력 완료 →" : "특별사항 없어요 →"}
            </button>
            <button className="back-to-btns" onClick={()=>{setShowSpecialInput(false);}}>← 버튼으로 선택하기</button>
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
              onClick={()=>setShowSpecialInput(true)}>직접 입력 ✏️</button>
          </div>
          <button className="next-btn" onClick={()=>handleSpecial(specialNotes)}>
            {selectedSpecial.length>0 || specialNotes.trim() ? "다음 →" : "특별사항 없어요 →"}
          </button>
        </div>
      );
    }

    if (step==="CONFIRM") return (
      <div className="btn-row">
        <button className="choice-btn primary" onClick={handleConfirm}>✨ 맞춤 추천받기</button>
        <button className="choice-btn ghost" onClick={handleRestart}>처음부터</button>
      </div>
    );

    if (step==="DONE") return (
      <div className="btn-row">
        <button className="choice-btn" onClick={handleRestart}>🔄 다시 추천받기</button>
      </div>
    );

    return null;
  }

  function BubbleText({text}) {
    const html = text
      .replace(/\n/g,"<br/>")
      .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
      .replace(/\*(.*?)\*/g,"<em>$1</em>");
    return <span dangerouslySetInnerHTML={{__html:html}}/>;
  }

  function ProductCard({product, index}) {
    const ranks=["BEST MATCH","RECOMMENDED","ALSO GREAT"];
    return (
      <div className="product-card">
        <div className="card-top">
          <span className="card-rank-badge">{ranks[index]||`#${index+1}`}</span>
          {product.is_prescription && <span className="card-rx-badge">처방식</span>}
        </div>
        <div className="card-body">
          <div className="card-img-row">
            <div className="card-img-box">
              {product.image_url ? (
                <img src={product.image_url} alt={product.product_name_kr} className="card-product-img"
                  onError={e=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex';}} />
              ) : null}
              <span className="card-img-fallback" style={product.image_url?{display:'none'}:undefined}>
                {data.petType==="dog"?"🐶":"🐱"}
              </span>
            </div>
            <div className="card-info">
              <div className="card-name">{product.product_name_kr}</div>
              <div className="card-brand">{product.brand}</div>
            </div>
          </div>
          <div className="card-meta">
            {product.food_form && <span className="meta-item">{product.food_form}</span>}
            {product.flavor && <span className="meta-item">{product.flavor}맛</span>}
            {product.is_activbiome && <span className="meta-item activbiome">액티브바이옴+</span>}
            {product.product_line && <span className="meta-item">{product.product_line}</span>}
          </div>
          {(product.health_benefits||[]).length>0 && (
            <div className="card-tags">
              {product.health_benefits.slice(0,4).map(t=><span key={t} className="tag">{t}</span>)}
            </div>
          )}
          {product.description && <div className="card-desc">{product.description}</div>}
          {product.reasoning && <div className="card-reason">{product.reasoning}</div>}
          {product.product_url && (
            <a href={product.product_url} target="_blank" rel="noreferrer" className="card-link">
              Hill's 공식 사이트에서 보기 →
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
        <img src="/hills-site-bg.png" alt="Hills Pet Nutrition" className="demo-bg-img" />
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
            <div className="header-sub">힐스 펫 플래너</div>
          </div>
          <button className="header-close-btn" onClick={() => {playClose(); setTimeout(()=>setChatOpen(false), 150);}}>✕</button>
        </div>
      </header>

      <main className="chat-area">

        {messages.map((m,i)=>{
          const isDone = m.role==="bot" && m.text.includes("done-banner");
          return (
          <div key={i} className={`bubble-wrap ${m.role}`} ref={isDone?doneRef:null}>
            {m.role==="bot"&&<img className="avatar" src="/bot-avatar.png" alt="bot" />}
            <div className={`bubble ${m.role}${isDone?" done-bubble":""}`}>
              <BubbleText text={m.text}/>
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
            <div className="loading-label">맞춤 제품을 분석하고 있어요</div>
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
              <div style={{fontSize:"13px",color:"var(--gray-500)",marginBottom:"6px"}}>다른 힐스 제품도 둘러보세요</div>
              <a href="https://brand.naver.com/hillspet/best?cp=1" target="_blank" rel="noreferrer" className="quick-option-bar">
                <span>베스트 제품</span><span className="quick-arrow">→</span>
              </a>
              <a href="https://brand.naver.com/hillspet/category/5526579881be42af8bce22e4c17b9d92?cp=1" target="_blank" rel="noreferrer" className="quick-option-bar">
                <span>신제품</span><span className="quick-arrow">→</span>
              </a>
              <a href="https://brand.naver.com/hillspet" target="_blank" rel="noreferrer" className="quick-option-bar">
                <span>힐스 공식 브랜드 스토어</span><span className="quick-arrow">→</span>
              </a>
            </div>
            <div className="save-cta-title">결과를 저장해두시겠어요?</div>
            <div className="save-cta-sub">회원가입 시 추천 결과를 언제든 다시 확인할 수 있어요.</div>
            <div className="save-cta-btns">
              <button className="save-btn-kakao" onClick={()=>alert("카카오 로그인은 준비 중이에요!")}>
                💬 카카오로 1초 가입
              </button>
              <button className="save-btn-skip" onClick={()=>setShowSave(false)}>
                다음에 할게요
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </main>

      <footer className="footer">
        {step!=="LOADING"&&step!=="START"&&renderButtons()}
        {["PET_TYPE","BREED","AGE","BODY","CONCERNS","SPECIAL","CONFIRM"].includes(step)&&(
          <button className="restart-link" onClick={handleRestart}>↩ 처음부터 다시 하기</button>
        )}
        {step==="START"&&!isTyping&&messages.length>0&&(
          <div className="quick-options">
            <button className="quick-option-bar highlight" onClick={handleStartRecommendBtn}>
              <span>힐스 맞춤 제품 추천 받기</span><span className="quick-arrow">→</span>
            </button>
          </div>
        )}
        <div className={`input-row-wrapper ${step === "START" ? "visible" : ""}`}>
          <div className="input-row">
            <input className="text-input" type="text"
              placeholder="힐스와 상담하기"
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
        <button className="chat-bottom-close" onClick={() => setChatOpen(false)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      )}
    </div>
  );
}
