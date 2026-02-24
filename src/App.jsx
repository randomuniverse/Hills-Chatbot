import { useState, useEffect, useRef } from "react";

const DOG_BREEDS = ["믹스견","말티즈","푸들","시츄","포메라니안","치와와","비숑프리제","요크셔테리어","닥스훈트","웰시코기","비글","골든리트리버","래브라도","보더콜리","허스키","진돗개","삽살개","기타"];
const CAT_BREEDS = ["믹스묘","코리안숏헤어","페르시안","메인쿤","브리티시숏헤어","스코티시폴드","러시안블루","시암","랙돌","아비시니안","기타"];
const DOG_CONCERNS = ["소화기계","체중 관리","관절 관리","피부 관리","신장 관리","구강 관리","없음"];
const CAT_CONCERNS = ["소화기계","체중 관리","비뇨기계","피부 관리","신장 관리","헤어볼","없음"];

const STEP_PROGRESS = {
  IDLE:0, START:5, PARSING:10, CONFIRM_PARSE:15,
  AUTH_PROMPT:20, PET_TYPE:25, BREED:38, AGE:50,
  WEIGHT:62, BODY:72, CONCERNS:82, CONFIRM:92,
  LOADING:97, DONE:100
};

function buildSummary(d) {
  const age = {puppy:"1살 미만",adult:"1~7살",senior7:"7~11살",senior11:"11살 이상"}[d.ageCategory]||"";
  const body = {underweight:"마름",normal:"정상",overweight:"과체중"}[d.bodyCondition]||"";
  const weightText = d.weight ? `${d.weight}kg` : "모름";
  return `${d.petType==="dog"?"🐶":"🐱"} ${d.breed||""} · ${age}\n체중 ${weightText} · 체형 ${body}\n건강 고민: ${d.healthConcerns?.filter(c=>c!=="없음").join(", ")||"없음"}`;
}

export default function App() {
  const [messages, setMessages]   = useState([]);
  const [step, setStep]           = useState("IDLE");
  const [data, setData]           = useState({});
  const [selected, setSelected]   = useState([]);
  const [freeText, setFreeText]   = useState("");
  const [mainInput, setMainInput] = useState("");
  const [inputVal, setInputVal]   = useState("");
  const [isTyping, setIsTyping]   = useState(false);
  const [results, setResults]     = useState(null);
  const [showSave, setShowSave]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, isTyping, results, showSave]);

  useEffect(() => {
    setTimeout(() => {
      addBot("안녕하세요! 👋\n\n<strong>Hills Pet Nutrition</strong> 맞춤 사료 추천 서비스입니다.\n반려동물에 대해 고민이 있으시면 편하게 말씀해 주세요.", "START");
    }, 600);
  }, []);

  function addBot(text, nextStep, delay=900) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(p=>[...p,{role:"bot",text}]);
      if (nextStep) setStep(nextStep);
    }, delay);
  }
  function addUser(text) { setMessages(p=>[...p,{role:"user",text}]); }

  async function handleMainInput() {
    const txt = mainInput.trim();
    if (!txt) return;
    addUser(txt);
    setMainInput("");
    setStep("PARSING");

    try {
      const res = await fetch("/api/parse-intent", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ text: txt })
      });
      const parsed = await res.json();

      setData(p=>({...p, petType: parsed.pet_type, healthConcerns: parsed.concerns||[] }));

      addBot(parsed.sympathy_msg || "말씀해주신 내용을 확인했어요.", "CONFIRM_PARSE", 600);

      setTimeout(() => {
        const chips = [];
        if (parsed.pet_type) chips.push(parsed.pet_type==="dog"?"🐶 강아지":"🐱 고양이");
        if (parsed.concerns?.length) chips.push(...parsed.concerns);
        const chipHtml = chips.length
          ? `<div class="context-chip-wrap">${chips.map(c=>`<span class="context-chip">✓ ${c}</span>`).join("")}</div>`
          : "";
        addBot(`파악한 내용이에요.${chipHtml}\n\n맞춤 추천을 시작할까요?`, "CONFIRM_PARSE");
      }, 1900);

    } catch {
      addBot("말씀 잘 들었어요! 몇 가지 정보를 더 알려주시면 정확하게 추천해드릴게요.", "PET_TYPE", 600);
    }
  }

  function startRecommend() {
    addUser("네, 추천받을게요!");
    addBot("좋아요! 조금 더 정확한 추천을 위해 몇 가지만 여쭤볼게요.", "AUTH_PROMPT", 500);
  }

  function handleAuth(choice) {
    if (choice === "member") {
      addUser("회원으로 계속");
      addBot("반갑습니다! 🙌\n기존 반려동물 정보로 바로 추천해드릴게요.\n\n*(데모 버전에서는 일반 진행과 동일하게 진행됩니다)*", "PET_TYPE");
    } else if (choice === "join") {
      addUser("회원 가입 후 진행");
      addBot("회원가입 후에는 추천 결과가 저장되고 언제든 다시 확인할 수 있어요! 😊\n\n*(데모 버전에서는 바로 진행합니다)*", "PET_TYPE");
    } else {
      addUser("그냥 진행할게요");
      addBot("알겠어요! 시작해볼까요.", "PET_TYPE", 400);
    }
  }

  function handlePetType(type) {
    addUser(type==="dog"?"🐶 강아지":"🐱 고양이");
    setData(p=>({...p, petType:type}));
    addBot(`${type==="dog"?"강아지":"고양이"} 품종을 선택해주세요.`, "BREED");
  }

  function handleBreed(breed) {
    addUser(breed);
    setData(p=>({...p, breed}));
    addBot("나이대를 알려주세요.", "AGE");
  }

  function handleAge(cat, label) {
    addUser(label);
    setData(p=>({...p, ageCategory:cat}));
    addBot("체중을 입력해주세요. (kg)", "WEIGHT");
  }

  function handleWeight() {
    const w = parseFloat(inputVal);
    if (!w||w<=0||w>150) return;
    addUser(`${w} kg`);
    setInputVal("");
    setData(p=>({...p, weight:w}));
    addBot("체형 상태는 어떤가요?", "BODY");
  }

  function handleWeightUnknown() {
    addUser("모름");
    setInputVal("");
    setData(p=>({...p, weight:null}));
    addBot("괜찮아요! 대신 체형을 보고 판단해볼게요.\n아래에서 가장 가까운 체형을 선택해주세요.", "BODY");
  }

  function handleBody(val, label) {
    addUser(label);
    setData(p=>({...p, bodyCondition:val}));
    if (data.healthConcerns?.length) {
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
        const res = await fetch("/api/classify-concerns",{
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

    const summary = buildSummary(newData);
    addBot(`입력하신 내용을 정리했어요. ✅\n\n${summary}\n\n이대로 맞춤 추천을 받으시겠어요?`, "CONFIRM");
  }

  async function handleConfirm() {
    addUser("네, 추천받을게요 ✨");
    setStep("LOADING");
    addBot("분석 중이에요... 잠시만 기다려주세요 🔍", "LOADING", 400);

    try {
      const res = await fetch("/api/recommend",{
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
        })
      });
      const result = await res.json();
      setResults(result);
      setStep("DONE");
      addBot(`분석 완료! 🎉\n아래에서 ${data.petName||"반려동물"}에게 딱 맞는 Hill's 제품을 확인해보세요.`, "DONE", 600);
      setTimeout(() => setShowSave(true), 2000);
    } catch {
      setStep("DONE");
      addBot("일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.", "DONE", 400);
    }
  }

  function handleRestart() {
    setMessages([]); setStep("IDLE"); setData({}); setSelected([]);
    setFreeText(""); setInputVal(""); setMainInput("");
    setResults(null); setShowSave(false);
    setTimeout(()=>addBot("안녕하세요! 👋\n\n<strong>Hills Pet Nutrition</strong> 맞춤 사료 추천 서비스입니다.\n반려동물에 대해 고민이 있으시면 편하게 말씀해 주세요.","START"),400);
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
            onKeyDown={e=>e.key==="Enter"&&handleWeight()} autoFocus />
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
      const list = data.petType==="dog"?DOG_CONCERNS:CAT_CONCERNS;
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
            {product.image_url
              ? <img className="card-img" src={product.image_url} alt={product.product_name_kr}/>
              : <div className="card-img-box">{data.petType==="dog"?"🐶":"🐱"}</div>
            }
            <div className="card-info">
              <div className="card-name">{product.product_name_kr}</div>
              <div className="card-brand">{product.brand}</div>
            </div>
          </div>
          {(product.health_benefits||[]).length>0 && (
            <div className="card-tags">
              {product.health_benefits.slice(0,4).map(t=><span key={t} className="tag">{t}</span>)}
            </div>
          )}
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
          <button className="header-badge" onClick={()=>alert("로그인 기능은 준비 중이에요!")}>로그인</button>
        </div>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{width:`${STEP_PROGRESS[step]||0}%`}}/>
      </div>

      <main className="chat-area">
        <div className="divider"><span className="divider-text">상담 시작</span></div>

        {messages.map((m,i)=>(
          <div key={i} className={`bubble-wrap ${m.role}`}>
            {m.role==="bot"&&<img className="avatar" src="/bot-logo.png" alt="bot" />}
            <div className={`bubble ${m.role}`}>
              <BubbleText text={m.text}/>
            </div>
          </div>
        ))}

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

        {isTyping&&(
          <div className="bubble-wrap bot">
            <img className="avatar" src="/bot-logo.png" alt="bot" />
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
        {step!=="LOADING"&&step!=="DONE"&&(
          <div className="input-row" style={{marginTop: step==="START"?0:8}}>
            <input className="text-input" type="text"
              placeholder="힐스와 상담하기"
              value={mainInput}
              onChange={e=>setMainInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleMainInput();}}}
            />
            <button className="send-btn" onClick={handleMainInput}>→</button>
          </div>
        )}
      </footer>
    </div>
  );
}
