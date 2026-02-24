import { useState, useEffect, useRef } from "react";

const DOG_BREEDS = [
  "믹스견","말티즈","푸들","시츄","포메라니안","치와와",
  "비숑프리제","요크셔테리어","닥스훈트","웰시코기",
  "비글","골든리트리버","래브라도","보더콜리","허스키",
  "진돗개","삽살개","기타"
];
const CAT_BREEDS = [
  "믹스묘","코리안숏헤어","페르시안","메인쿤",
  "브리티시숏헤어","스코티시폴드","러시안블루",
  "시암","랙돌","아비시니안","기타"
];
const DOG_CONCERNS  = ["소화","체중 관리","관절","피부/모질","신장","치아","없음"];
const CAT_CONCERNS  = ["소화","체중 관리","헤어볼","피부/모질","요로계","신장","치아","없음"];

const STEPS = ["PET_TYPE","PET_NAME","BREED","AGE","WEIGHT","BODY_CONDITION","HEALTH_CONCERNS","CONFIRM"];
const STEP_PROGRESS = { PET_TYPE:0, PET_NAME:14, BREED:28, AGE:42, WEIGHT:56, BODY_CONDITION:70, HEALTH_CONCERNS:84, CONFIRM:95, LOADING:98, DONE:100 };

function buildConfirm(d) {
  const age = { puppy:"1살 미만", adult:"1~7살", senior7:"7~11살", senior11:"11살 이상" }[d.ageCategory] || "";
  const body = { underweight:"마름", normal:"정상", overweight:"과체중" }[d.bodyCondition] || "";
  return `${d.petType === "dog" ? "🐶" : "🐱"} ${d.breed}  ·  ${age}\n체중 ${d.weight}kg  ·  체형 ${body}\n건강 고민: ${d.healthConcerns?.length ? d.healthConcerns.join(", ") : "없음"}`;
}

export default function App() {
  const [messages, setMessages]         = useState([]);
  const [state, setState]               = useState({ currentStep: "IDLE" });
  const [selectedConcerns, setSelected] = useState([]);
  const [freeText, setFreeText]         = useState("");
  const [inputVal, setInputVal]         = useState("");
  const [isTyping, setIsTyping]         = useState(false);
  const [results, setResults]           = useState(null);
  const [progress, setProgress]         = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping, results]);
  useEffect(() => { setProgress(STEP_PROGRESS[state.currentStep] || 0); }, [state.currentStep]);

  useEffect(() => {
    setTimeout(() => botSay(
      "안녕하세요 🐾\n\nHills Pet Nutrition 맞춤 영양 상담 서비스입니다.\n반려동물의 정보를 알려주시면 최적의 사료를 추천해드릴게요.",
      "PET_TYPE"
    ), 700);
  }, []);

  function botSay(text, nextStep, delay = 900) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(p => [...p, { role: "bot", text }]);
      if (nextStep) setState(p => ({ ...p, currentStep: nextStep }));
    }, delay);
  }

  function userSay(text) {
    setMessages(p => [...p, { role: "user", text }]);
  }

  function onPetType(type) {
    userSay(type === "dog" ? "🐶 강아지" : "🐱 고양이");
    setState(p => ({ ...p, petType: type, currentStep: "WAITING" }));
    botSay("소중한 반려동물의 이름을 알려주세요.\n(없으면 건너뛰셔도 됩니다)", "PET_NAME");
  }

  function onPetName() {
    const name = inputVal.trim();
    userSay(name || "이름 없음");
    setInputVal("");
    setState(p => ({ ...p, petName: name, currentStep: "WAITING" }));
    const label = state.petType === "dog" ? "품종" : "묘종";
    botSay(`${label}을 선택해주세요.`, "BREED");
  }

  function onBreed(breed) {
    userSay(breed);
    setState(p => ({ ...p, breed, currentStep: "WAITING" }));
    botSay("나이대를 선택해주세요.", "AGE");
  }

  function onAge(cat, label) {
    userSay(label);
    setState(p => ({ ...p, ageCategory: cat, currentStep: "WAITING" }));
    botSay("체중을 입력해주세요. (kg 단위)", "WEIGHT");
  }

  function onWeight() {
    const w = parseFloat(inputVal);
    if (!w || w <= 0 || w > 150) return;
    userSay(`${w} kg`);
    setInputVal("");
    setState(p => ({ ...p, weight: w, currentStep: "WAITING" }));
    botSay("현재 체형 상태는 어떤가요?", "BODY_CONDITION");
  }

  function onBodyCondition(val, label) {
    userSay(label);
    setState(p => ({ ...p, bodyCondition: val, currentStep: "WAITING" }));
    botSay(
      "건강 고민이 있으신가요?\n버튼으로 선택하시거나, 아래에 직접 입력하셔도 됩니다.",
      "HEALTH_CONCERNS"
    );
  }

  function toggleConcern(c) {
    if (c === "없음") { setSelected(["없음"]); return; }
    setSelected(p => {
      const f = p.filter(x => x !== "없음");
      return f.includes(c) ? f.filter(x => x !== c) : [...f, c];
    });
  }

  async function onConcernsDone() {
    let finalConcerns = selectedConcerns.length ? selectedConcerns : [];

    if (freeText.trim()) {
      try {
        const res = await fetch("/api/classify-concerns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: freeText.trim(), pet_type: state.petType }),
        });
        const data = await res.json();
        const merged = [...new Set([...finalConcerns, ...(data.concerns || [])])].filter(c => c !== "없음");
        finalConcerns = merged.length ? merged : ["없음"];
      } catch {
        if (!finalConcerns.length) finalConcerns = ["없음"];
      }
    } else if (!finalConcerns.length) {
      finalConcerns = ["없음"];
    }

    const displayText = freeText.trim()
      ? `${freeText.trim()}${selectedConcerns.length ? `\n+ ${selectedConcerns.join(", ")}` : ""}`
      : finalConcerns.join(", ");

    userSay(displayText);
    const newState = { ...state, healthConcerns: finalConcerns, currentStep: "WAITING" };
    setState(newState);
    setSelected([]);
    setFreeText("");

    const summary = buildConfirm(newState);
    botSay(`입력하신 내용을 확인해드릴게요.\n\n${summary}\n\n이대로 맞춤 추천을 받으시겠어요?`, "CONFIRM");
  }

  async function onConfirm() {
    userSay("네, 추천받을게요 ✨");
    setState(p => ({ ...p, currentStep: "LOADING" }));
    const petName = state.petName || "반려동물";
    botSay(`${petName}에게 딱 맞는 Hills 제품을 찾고 있어요...`, "LOADING", 400);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_type: state.petType,
          life_stage: state.ageCategory,
          size: state.weight < 10 ? "small" : "large",
          body_condition: state.bodyCondition,
          health_concerns: state.healthConcerns.filter(c => c !== "없음"),
          breed: state.breed,
          pet_name: state.petName,
        }),
      });
      const data = await res.json();
      setResults(data);
      setState(p => ({ ...p, currentStep: "DONE" }));
      const name = state.petName || "반려동물";
      botSay(`${name}에게 딱 맞는 Hills 제품을 찾았어요! 🎉\n아래에서 확인해보세요.`, "DONE", 600);
    } catch {
      setState(p => ({ ...p, currentStep: "DONE" }));
      botSay("일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.", "DONE", 400);
    }
  }

  function onRestart() {
    setMessages([]); setState({ currentStep: "IDLE" });
    setSelected([]); setFreeText(""); setInputVal(""); setResults(null);
    setTimeout(() => botSay(
      "안녕하세요 🐾\n\nHills Pet Nutrition 맞춤 영양 상담 서비스입니다.\n반려동물의 정보를 알려주시면 최적의 사료를 추천해드릴게요.",
      "PET_TYPE"
    ), 400);
  }

  function renderButtons() {
    const s = state.currentStep;

    if (s === "PET_TYPE") return (
      <div className="btn-row">
        <button className="choice-btn big" onClick={() => onPetType("dog")}>🐶 강아지</button>
        <button className="choice-btn big" onClick={() => onPetType("cat")}>🐱 고양이</button>
      </div>
    );

    if (s === "PET_NAME") return (
      <div className="input-row">
        <input className="text-input" placeholder="예: 초코, 루시..." value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onPetName()} autoFocus />
        <button className="send-btn" onClick={onPetName}>→</button>
        <button className="skip-btn" onClick={() => { setInputVal(""); onPetName(); }}>건너뛰기</button>
      </div>
    );

    if (s === "BREED") {
      const breeds = state.petType === "dog" ? DOG_BREEDS : CAT_BREEDS;
      return (
        <div className="btn-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {breeds.map(b => (
            <button key={b} className="choice-btn small" onClick={() => onBreed(b)}>{b}</button>
          ))}
        </div>
      );
    }

    if (s === "AGE") return (
      <div className="btn-row" style={{ flexWrap: "wrap" }}>
        {[["puppy","1살 미만"],["adult","1~7살"],["senior7","7~11살"],["senior11","11살 이상"]].map(([v,l]) => (
          <button key={v} className="choice-btn" onClick={() => onAge(v, l)}>{l}</button>
        ))}
      </div>
    );

    if (s === "WEIGHT") return (
      <div className="input-row">
        <input className="text-input" type="number" placeholder="예: 5.2" value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onWeight()} autoFocus />
        <span className="unit-label">kg</span>
        <button className="send-btn" onClick={onWeight}>→</button>
      </div>
    );

    if (s === "BODY_CONDITION") return (
      <div className="btn-row">
        {[["underweight","🔻 마름"],["normal","✅ 정상"],["overweight","🔺 과체중"]].map(([v,l]) => (
          <button key={v} className="choice-btn" onClick={() => onBodyCondition(v, l)}>{l}</button>
        ))}
      </div>
    );

    if (s === "HEALTH_CONCERNS") {
      const list = state.petType === "dog" ? DOG_CONCERNS : CAT_CONCERNS;
      return (
        <div className="concerns-wrap">
          <div className="btn-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            {list.map(c => (
              <button key={c}
                className={`choice-btn small ${selectedConcerns.includes(c) ? "selected" : ""}`}
                onClick={() => toggleConcern(c)}>{c}</button>
            ))}
          </div>
          <div className="free-input-wrap">
            <div className="free-input-label">또는 직접 입력해주세요</div>
            <textarea className="free-input"
              placeholder="예: 요즘 털이 많이 빠지고 자꾸 발을 핥아요..."
              value={freeText}
              onChange={e => setFreeText(e.target.value)} />
          </div>
          <button className="next-btn" onClick={onConcernsDone}>다음 →</button>
        </div>
      );
    }

    if (s === "CONFIRM") return (
      <div className="btn-row">
        <button className="choice-btn accent" onClick={onConfirm}>✨ 맞춤 추천받기</button>
        <button className="choice-btn" onClick={onRestart}>처음부터</button>
      </div>
    );

    if (s === "DONE") return (
      <div className="btn-row">
        <button className="choice-btn" onClick={onRestart}>🔄 다시 추천받기</button>
      </div>
    );

    return null;
  }

  function ProductCard({ product, index }) {
    const ranks = ["BEST MATCH","RECOMMENDED","ALSO GREAT"];
    return (
      <div className="product-card">
        <div className="card-header">
          {product.image_url
            ? <img className="card-img" src={product.image_url} alt={product.product_name_kr} />
            : <div className="card-img-placeholder">🐾</div>
          }
          <div className="card-meta">
            <div className="card-rank">{ranks[index] || `추천 ${index+1}`}</div>
            <div className="card-name">{product.product_name_kr}</div>
            <div className="card-brand">{product.brand}</div>
          </div>
        </div>
        <div className="card-body">
          {product.reasoning && (
            <div className="card-reason">{product.reasoning}</div>
          )}
          <div className="card-tags">
            {(product.health_benefits || []).slice(0,3).map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
            {product.is_prescription && <span className="tag rx">처방식</span>}
          </div>
          {product.product_url && (
            <a href={product.product_url} target="_blank" rel="noreferrer" className="card-link">
              제품 자세히 보기
              <span className="card-link-arrow">→</span>
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
          <img className="logo-mark" src="/bot-logo.png" alt="Pet Life Planner" />
          <div className="header-text">
            <div className="header-title">Pet Life Planner</div>
            <div className="header-sub">Hills Pet Nutrition</div>
          </div>
        </div>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <main className="chat-area">
        {messages.length === 0 && (
          <div className="divider">
            <span className="divider-text">상담 시작</span>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`bubble-wrap ${m.role}`}>
            {m.role === "bot" && <img className="avatar" src="/bot-logo.png" alt="bot" />}
            <div className={`bubble ${m.role}`}>
              {m.text.split("\n").map((line, j, arr) => (
                <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="bubble-wrap bot">
            <img className="avatar" src="/bot-logo.png" alt="bot" />
            <div className="bubble bot typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {results && state.currentStep === "DONE" && (
          <div className="results-wrap">
            {results.products?.map((p, i) => <ProductCard key={i} product={p} index={i} />)}
            {results.overall_reasoning && (
              <div className="overall-box">
                <div className="overall-label">종합 추천 이유</div>
                <div className="overall-text">{results.overall_reasoning}</div>
              </div>
            )}
            {results.prescription_note && (
              <div className="rx-note">⚠️ {results.prescription_note}</div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <footer className="footer">
        {state.currentStep !== "LOADING" && renderButtons()}
      </footer>
    </div>
  );
}
