import { useState, useEffect, useRef } from "react";

const DOG_BREEDS = ["믹스견","말티즈","푸들","시츄","포메라니안","치와와","비숑프리제","요크셔테리어","닥스훈트","웰시코기","비글","골든리트리버","래브라도","보더콜리","허스키","진돗개","삽살개","기타"];
const CAT_BREEDS = ["믹스묘","코리안숏헤어","페르시안","메인쿤","브리티시숏헤어","스코티시폴드","러시안블루","시암","랙돌","아비시니안","기타"];
const FALLBACK_DOG = ["소화기 관리","체중 관리","관절 관리","피부 건강","신장 관리","치아 관리","요로계 관리","식이 민감성","심장 관리","간 관리","혈당","노령 관리"];
const FALLBACK_CAT = ["소화기 관리","체중 관리","요로계 관리","피부 건강","신장 관리","헤어볼","치아 관리","식이 민감성","갑상선 관리","실내 생활","혈당","노령 관리"];

const STEP_PROGRESS = {
  IDLE:0, START:5, PARSING:10, CONFIRM_PARSE:15,
  AUTH_PROMPT:20, PET_TYPE:25, BREED:38, AGE:50,
  WEIGHT:62, BODY:72, CONCERNS:82, SPECIAL:90, CONFIRM:95,
  LOADING:98, DONE:100
};

function buildSummary(d) {
  const age = {puppy:"1살 미만",adult:"1~7살",senior7:"7~11살",senior11:"11살 이상"}[d.ageCategory]||"";
  const body = {underweight:"마름",normal:"정상",overweight:"과체중"}[d.bodyCondition]||"";
  const weightText = d.weight ? `${d.weight}kg` : "모름";
  return `${d.petType==="dog"?"🐶":"🐱"} ${d.breed||""} · ${age}\n체중 ${weightText} · 체형 ${body}\n건강 고민: ${d.healthConcerns?.filter(c=>c!=="없음").join(", ")||"없음"}`;
}

export default function App() {
  const [messages, setMessages]   = useState([{role:"bot", text:"안녕하세요! 👋\n힐스 맞춤 사료 추천 서비스입니다.\n\n궁금한 점이 있으시면 편하게 말씀해 주세요."}]);
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
  const [dbConcerns, setDbConcerns] = useState({dog: FALLBACK_DOG, cat: FALLBACK_CAT});
  const bottomRef = useRef(null);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    fetch("/api/categories").then(r=>r.json()).then(d=>{
      if(d.dog?.length) setDbConcerns({dog: d.dog, cat: d.cat});
    }).catch(()=>{});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, isTyping, results, showSave]);

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

    const fallbackSteps = ["PARSING","CONFIRM_PARSE","AUTH_PROMPT","PET_TYPE","BREED","AGE","WEIGHT","BODY","CONCERNS","SPECIAL","LOADING","DONE","CONFIRM"];
    if (step !== "START" && fallbackSteps.includes(step)) {
      try {
        const res = await fetchWithTimeout("/api/chat-fallback", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ text: txt, current_step: step })
        });
        const d = await res.json();
        addBot(d.reply || "힐스 펫 플래너는 맞춤 사료 추천에 특화되어 있어요! 추천을 계속 진행해볼까요?");
      } catch {
        addBot("죄송해요, 잠시 오류가 있었어요. 추천을 계속 진행해볼까요?");
      }
      return;
    }

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

      const newData = { petType: parsed.pet_type, healthConcerns: parsed.concerns||[] };
      if (parsed.age_category) newData.ageCategory = parsed.age_category;
      setData(p=>({...p, ...newData}));

      const sympathyMsg = parsed.sympathy_msg || "말씀해주신 내용을 확인했어요.";
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(p=>[...p,{role:"bot",text:sympathyMsg}]);

        setTimeout(() => {
          const chips = [];
          if (parsed.pet_type) chips.push(parsed.pet_type==="dog"?"🐶 강아지":"🐱 고양이");
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
    if (d.weight === undefined) return { step: "WEIGHT", msg: "체중을 입력해주세요. (kg)" };
    if (!d.bodyCondition) return { step: "BODY", msg: "체형 상태는 어떤가요?" };
    if (!d.healthConcerns || d.healthConcerns.length === 0) return { step: "CONCERNS", msg: "건강 관련 고민이 있으신가요?\n버튼으로 선택하시거나 직접 입력해도 돼요." };
    return { step: "CONCERNS", msg: "건강 고민을 추가하거나 수정할 수 있어요.\n버튼 선택 또는 직접 입력해주세요." };
  }

  function goToNextStep(currentData) {
    const d = currentData || dataRef.current;
    const { step: nextStep, msg } = getNextStep(d);
    const known = [];
    if (d.petType) known.push(d.petType==="dog"?"🐶 강아지":"🐱 고양이");
    if (d.ageCategory) {
      const ageLabel = {puppy:"1살 미만",adult:"1~7살",senior7:"7~11살",senior11:"11살 이상"}[d.ageCategory];
      if (ageLabel) known.push(ageLabel);
    }
    if (d.healthConcerns?.length) known.push(...d.healthConcerns);

    if (known.length > 0 && nextStep !== "CONCERNS") {
      const skipMsg = `이미 알고 있는 정보는 넘어갈게요! 😊\n${msg}`;
      addBot(skipMsg, nextStep, 500);
    } else {
      addBot(msg, nextStep, 500);
    }
  }

  function startRecommend() {
    addUser("네, 추천받을게요!");
    addBot("좋아요! 조금 더 정확한 추천을 위해 몇 가지만 여쭤볼게요.", "AUTH_PROMPT", 500);
  }

  function handleAuth(choice) {
    if (choice === "member") {
      addUser("회원으로 계속");
      addBot("반갑습니다! 🙌", null, 400);
      setTimeout(() => goToNextStep(), 1400);
    } else if (choice === "join") {
      addUser("회원 가입 후 진행");
      addBot("회원가입 후에는 추천 결과가 저장돼요! 😊", null, 400);
      setTimeout(() => goToNextStep(), 1400);
    } else {
      addUser("그냥 진행할게요");
      addBot("알겠어요!", null, 300);
      setTimeout(() => goToNextStep(), 1200);
    }
  }

  function handlePetType(type) {
    addUser(type==="dog"?"🐶 강아지":"🐱 고양이");
    const updated = {...dataRef.current, petType:type};
    setData(p=>({...p, petType:type}));
    dataRef.current = updated;
    setTimeout(() => goToNextStep(updated), 400);
  }

  function handleBreed(breed) {
    addUser(breed);
    const updated = {...dataRef.current, breed};
    setData(p=>({...p, breed}));
    dataRef.current = updated;
    setTimeout(() => goToNextStep(updated), 400);
  }

  function handleAge(cat, label) {
    addUser(label);
    const updated = {...dataRef.current, ageCategory:cat};
    setData(p=>({...p, ageCategory:cat}));
    dataRef.current = updated;
    setTimeout(() => goToNextStep(updated), 400);
  }

  function handleWeight() {
    const w = parseFloat(inputVal);
    if (!w||w<=0||w>150) return;
    addUser(`${w} kg`);
    setInputVal("");
    const updated = {...dataRef.current, weight:w};
    setData(p=>({...p, weight:w}));
    dataRef.current = updated;
    setTimeout(() => goToNextStep(updated), 400);
  }

  function handleWeightUnknown() {
    addUser("모름");
    setInputVal("");
    const updated = {...dataRef.current, weight:null};
    setData(p=>({...p, weight:null}));
    dataRef.current = updated;
    setTimeout(() => goToNextStep(updated), 400);
  }

  function handleBody(val, label) {
    addUser(label);
    const updated = {...dataRef.current, bodyCondition:val};
    setData(p=>({...p, bodyCondition:val}));
    dataRef.current = updated;
    if (updated.healthConcerns?.length) {
      addBot("건강 고민을 추가하거나 수정할 수 있어요.\n버튼 선택 또는 직접 입력해주세요.", "CONCERNS");
    } else {
      addBot("건강 관련 고민이 있으신가요?\n버튼으로 선택하시거나 직접 입력해도 돼요.", "CONCERNS");
    }
  }

  function toggleConcern(c) {
    if (c==="없음") { setSelected(["없음"]); return; }
    setSelected(p => {
      const f = p.filter(x=>x!=="없음");
      return f.includes(c)?f.filter(x=>x!==c):[...f,c];
    });
  }

  async function handleConcernsDone() {
    let finalConcerns = selected.filter(c=>c!=="없음");

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
    setSelected([]); setFreeText("");

    addBot("거의 다 왔어요! 마지막으로 한 가지만요.\n\n혹시 특이사항이 있으신가요?\n예: 임신 중, 약 복용 중, 수술 후 회복 중 등", "SPECIAL");
  }

  function handleSpecial(notes) {
    const hasNotes = notes && notes.trim();
    addUser(hasNotes ? notes.trim() : "특이사항 없음");
    setData(p => ({ ...p, specialNotes: hasNotes ? notes.trim() : "" }));
    setSpecial("");

    const newData = { ...data, specialNotes: hasNotes ? notes.trim() : "",
      healthConcerns: data.healthConcerns };
    const summary = buildSummary(newData);
    addBot(`입력하신 내용을 정리했어요. ✅\n\n${summary}${hasNotes ? `\n특이사항: ${notes.trim()}` : ""}\n\n이대로 맞춤 추천을 받으시겠어요?`, "CONFIRM");
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
          size: data.weight==null?"all":(data.weight<10?"small":"large"),
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
      addBot(`분석 완료! 🎉\n아래에서 ${data.petName||"반려동물"}에게 딱 맞는 Hill's 제품을 확인해보세요.`, "DONE", 600);
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
    setMessages([{role:"bot", text:"안녕하세요! 👋\n힐스 맞춤 사료 추천 서비스입니다.\n\n궁금한 점이 있으시면 편하게 말씀해 주세요."}]);
    setStep("START"); setData({}); setSelected([]);
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
        <button className="choice-btn" onClick={()=>handleAuth("member")}>기존 회원</button>
        <button className="choice-btn" onClick={()=>handleAuth("join")}>회원 가입</button>
        <button className="choice-btn ghost" onClick={()=>handleAuth("skip")}>그냥 진행</button>
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

    if (step==="WEIGHT") return (
      <div className="concerns-wrap">
        <div className="input-row">
          <input className="text-input" type="number" placeholder="예: 5.2"
            value={inputVal} onChange={e=>setInputVal(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing)handleWeight();}} autoFocus />
          <span className="unit-label">kg</span>
          <button className="send-btn" onClick={handleWeight}>→</button>
        </div>
        <button className="choice-btn ghost" onClick={handleWeightUnknown}>잘 모르겠어요</button>
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
      const list = [...(data.petType==="dog"?dbConcerns.dog:dbConcerns.cat), "없음"];
      return (
        <div className="concerns-wrap">
          <div className="btn-grid-3">
            {list.map(c=>(
              <button key={c}
                className={`choice-btn small${selected.includes(c)?" selected":""}`}
                onClick={()=>toggleConcern(c)}>{c}</button>
            ))}
          </div>
          <div className="free-input-wrap">
            <div className="free-input-label">직접 입력 (선택 사항)</div>
            <textarea className="free-input"
              placeholder="예: 요즘 털이 많이 빠지고 자꾸 발을 핥아요..."
              value={freeText} onChange={e=>setFreeText(e.target.value)} />
          </div>
          <button className="next-btn" onClick={handleConcernsDone}>다음 →</button>
        </div>
      );
    }

    if (step==="SPECIAL") return (
      <div className="concerns-wrap">
        <textarea className="free-input"
          placeholder="예: 임신 중이에요, 약을 먹고 있어요, 수술 후 회복 중..."
          value={specialNotes} onChange={e=>setSpecial(e.target.value)} />
        <div className="btn-row">
          <button className="next-btn" style={{flex:1}} onClick={()=>handleSpecial(specialNotes)}>다음 →</button>
          <button className="choice-btn ghost" onClick={()=>handleSpecial("")}>없어요</button>
        </div>
      </div>
    );

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

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <img className="logo-icon" src="/bot-logo.png" alt="Pet Life Planner" />
          <div>
            <div className="header-title">Hill's Pet Planner</div>
            <div className="header-sub">맞춤 사료 추천</div>
          </div>
          <button className="header-badge" onClick={()=>alert("로그인 기능은 준비 중이에요!")}>회원 로그인</button>
        </div>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{width:`${STEP_PROGRESS[step]||0}%`}}/>
      </div>

      <main className="chat-area">
        <div className="divider"><span className="divider-text">상담 시작</span></div>

        {messages.map((m,i)=>(
          <div key={i} className={`bubble-wrap ${m.role}`}>
            {m.role==="bot"&&<img className="avatar" src="/bot-avatar.png" alt="bot" />}
            <div className={`bubble ${m.role}`}>
              <BubbleText text={m.text}/>
            </div>
          </div>
        ))}

        {isTyping&&(
          <div className="bubble-wrap bot">
            <img className="avatar" src="/bot-avatar.png" alt="bot" />
            <div className="bubble bot typing"><span/><span/><span/></div>
          </div>
        )}

        {results&&step==="DONE"&&(
          <div className="results-wrap">
            {results.products?.map((p,i)=><ProductCard key={i} product={p} index={i}/>)}
            {results.overall_reasoning&&(
              <div className="overall-box">
                <div className="overall-label">종합 추천 이유</div>
                <div className="overall-text">{results.overall_reasoning}</div>
              </div>
            )}
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
        {step==="START"&&!isTyping&&messages.length>0&&(
          <div className="quick-options">
            <a href="https://brand.naver.com/hillspet/best?cp=1" target="_blank" rel="noreferrer" className="quick-option-bar">
              <span>베스트</span><span className="quick-arrow">→</span>
            </a>
            <a href="https://brand.naver.com/hillspet/category/5526579881be42af8bce22e4c17b9d92?cp=1" target="_blank" rel="noreferrer" className="quick-option-bar">
              <span>신제품</span><span className="quick-arrow">→</span>
            </a>
            <a href="https://brand.naver.com/hillspet" target="_blank" rel="noreferrer" className="quick-option-bar">
              <span>브랜드 스토어</span><span className="quick-arrow">→</span>
            </a>
            <button className="quick-option-bar highlight" onClick={handleStartRecommendBtn}>
              <span>제품 추천 받기</span><span className="quick-arrow">→</span>
            </button>
          </div>
        )}
        {step!=="LOADING"&&step!=="DONE"&&(
          <div className="input-row">
            <input className="text-input" type="text"
              placeholder="힐스와 상담하기"
              value={mainInput}
              onChange={e=>setMainInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing){e.preventDefault();handleMainInput();}}}
              onCompositionEnd={e=>{}}
            />
            <button className="send-btn" onClick={handleMainInput}>→</button>
          </div>
        )}
      </footer>
    </div>
  );
}
