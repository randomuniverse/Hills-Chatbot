import { useState, useEffect, useRef } from "react";

// ── 품종 데이터 ──────────────────────────────────────────
const DOG_BREEDS = [
  "믹스견", "말티즈", "푸들", "시츄", "포메라니안", "치와와", "비숑프리제",
  "요크셔테리어", "닥스훈트", "웰시코기", "비글", "골든리트리버", "래브라도리트리버",
  "보더콜리", "허스키", "진돗개", "삽살개", "풍산개", "기타"
];
const CAT_BREEDS = [
  "믹스묘", "코리안숏헤어", "페르시안", "메인쿤", "브리티시숏헤어",
  "스코티시폴드", "러시안블루", "시암", "랙돌", "아비시니안", "기타"
];

const DOG_CONCERNS = ["소화", "체중 관리", "관절", "피부/모질", "신장", "치아", "없음"];
const CAT_CONCERNS = ["소화", "체중 관리", "헤어볼", "피부/모질", "요로계", "신장", "치아", "없음"];

// ── 대화 흐름 정의 ────────────────────────────────────────
function getNextStep(state) {
  const steps = [
    "PET_TYPE", "PET_NAME", "BREED", "AGE", "WEIGHT", "BODY_CONDITION", "HEALTH_CONCERNS", "CONFIRM"
  ];
  const idx = steps.indexOf(state.currentStep);
  return steps[idx + 1] || "DONE";
}

function buildConfirmText(d) {
  const petLabel = d.petType === "dog" ? "🐶 강아지" : "🐱 고양이";
  const ageLabel = d.ageCategory === "puppy" ? "1살 미만"
    : d.ageCategory === "adult" ? "1~7살"
    : d.ageCategory === "senior7" ? "7~11살" : "11살 이상";
  const bodyLabel = d.bodyCondition === "underweight" ? "마름"
    : d.bodyCondition === "normal" ? "정상" : "과체중";
  return [
    `${petLabel} · ${d.breed}`,
    `이름: ${d.petName || "미입력"}`,
    `나이: ${ageLabel} · 체중: ${d.weight}kg`,
    `체형: ${bodyLabel}`,
    `건강 고민: ${d.healthConcerns.length ? d.healthConcerns.join(", ") : "없음"}`,
  ].join("\n");
}

// ── 메인 앱 ──────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState({ currentStep: "IDLE" });
  const [selectedConcerns, setSelectedConcerns] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // 시작
  useEffect(() => {
    setTimeout(() => addBotMessage("안녕하세요! 🐾\nHills Pet Nutrition의 맞춤 사료 추천 서비스입니다.\n어떤 반려동물을 키우고 계신가요?", "PET_TYPE"), 600);
  }, []);

  function addBotMessage(text, nextStep, delay = 800) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: "bot", text }]);
      if (nextStep) setState(prev => ({ ...prev, currentStep: nextStep }));
    }, delay);
  }

  function addUserMessage(text) {
    setMessages(prev => [...prev, { role: "user", text }]);
  }

  // ── 단계별 선택 처리 ──────────────────────────────────
  function handlePetType(type) {
    const label = type === "dog" ? "🐶 강아지" : "🐱 고양이";
    addUserMessage(label);
    setState(prev => ({ ...prev, petType: type, currentStep: "WAITING" }));
    addBotMessage("이름이 있나요? (없으면 '없음'을 눌러주세요)", "PET_NAME");
  }

  function handlePetName(name) {
    const display = name || "없음";
    addUserMessage(display);
    setState(prev => ({ ...prev, petName: name, currentStep: "WAITING" }));
    const breeds = state.petType === "dog" ? DOG_BREEDS : CAT_BREEDS;
    const label = state.petType === "dog" ? "품종" : "묘종";
    addBotMessage(`${label}을 선택해주세요.`, "BREED");
  }

  function handleBreed(breed) {
    addUserMessage(breed);
    setState(prev => ({ ...prev, breed, currentStep: "WAITING" }));
    addBotMessage("나이가 어떻게 되나요?", "AGE");
  }

  function handleAge(ageCategory, label) {
    addUserMessage(label);
    setState(prev => ({ ...prev, ageCategory, currentStep: "WAITING" }));
    addBotMessage("체중이 어떻게 되나요? (kg 단위로 입력해주세요)", "WEIGHT");
  }

  function handleWeight() {
    const w = parseFloat(inputValue);
    if (!w || w <= 0 || w > 100) return;
    addUserMessage(`${w}kg`);
    setInputValue("");
    setState(prev => ({ ...prev, weight: w, currentStep: "WAITING" }));
    addBotMessage("체형 상태는 어떤가요?", "BODY_CONDITION");
  }

  function handleBodyCondition(condition, label) {
    addUserMessage(label);
    setState(prev => ({ ...prev, bodyCondition: condition, currentStep: "WAITING" }));
    const concerns = state.petType === "dog" ? DOG_CONCERNS : CAT_CONCERNS;
    addBotMessage(`건강 고민이 있으신가요?\n해당되는 것을 모두 선택 후 '다음'을 눌러주세요.`, "HEALTH_CONCERNS");
  }

  function toggleConcern(concern) {
    if (concern === "없음") {
      setSelectedConcerns(["없음"]);
      return;
    }
    setSelectedConcerns(prev => {
      const filtered = prev.filter(c => c !== "없음");
      return filtered.includes(concern)
        ? filtered.filter(c => c !== concern)
        : [...filtered, concern];
    });
  }

  function handleConcernsDone() {
    const concerns = selectedConcerns.length === 0 ? ["없음"] : selectedConcerns;
    const label = concerns.join(", ");
    addUserMessage(label);
    const newState = { ...state, healthConcerns: concerns, currentStep: "WAITING" };
    setState(newState);
    setSelectedConcerns([]);
    const summary = buildConfirmText(newState);
    addBotMessage(`입력하신 내용을 확인해주세요 ✅\n\n${summary}\n\n이대로 추천받으시겠어요?`, "CONFIRM");
  }

  async function handleConfirm() {
    addUserMessage("✅ 네, 추천받을게요!");
    setState(prev => ({ ...prev, currentStep: "LOADING" }));
    setIsLoading(true);
    addBotMessage(`${state.petName ? state.petName + "에게" : "딱 맞는"} 최적의 사료를 찾고 있어요... ✨`, "LOADING", 400);

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
      setIsLoading(false);
      setResults(data);
      setState(prev => ({ ...prev, currentStep: "DONE" }));
      const petName = state.petName || "반려동물";
      addBotMessage(`${petName}에게 딱 맞는 사료를 찾았어요! 🎉`, "DONE", 600);
    } catch (err) {
      setIsLoading(false);
      setState(prev => ({ ...prev, currentStep: "DONE" }));
      addBotMessage("죄송해요, 일시적인 오류가 발생했어요. 다시 시도해주세요.", "DONE", 400);
    }
  }

  function handleRestart() {
    setMessages([]);
    setState({ currentStep: "IDLE" });
    setSelectedConcerns([]);
    setInputValue("");
    setResults(null);
    setIsLoading(false);
    setTimeout(() => addBotMessage("안녕하세요! 🐾\nHills Pet Nutrition의 맞춤 사료 추천 서비스입니다.\n어떤 반려동물을 키우고 계신가요?", "PET_TYPE"), 400);
  }

  // ── 버튼 렌더링 ──────────────────────────────────────
  function renderButtons() {
    const step = state.currentStep;

    if (step === "PET_TYPE") return (
      <div className="btn-row">
        <button className="choice-btn big" onClick={() => handlePetType("dog")}>🐶 강아지</button>
        <button className="choice-btn big" onClick={() => handlePetType("cat")}>🐱 고양이</button>
      </div>
    );

    if (step === "PET_NAME") return (
      <div className="input-row">
        <input
          className="text-input"
          placeholder="이름 입력 (예: 초코)"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handlePetName(inputValue.trim())}
          autoFocus
        />
        <button className="send-btn" onClick={() => handlePetName(inputValue.trim())}>→</button>
        <button className="skip-btn" onClick={() => handlePetName("")}>없음</button>
      </div>
    );

    if (step === "BREED") {
      const breeds = state.petType === "dog" ? DOG_BREEDS : CAT_BREEDS;
      return (
        <div className="btn-grid">
          {breeds.map(b => (
            <button key={b} className="choice-btn small" onClick={() => handleBreed(b)}>{b}</button>
          ))}
        </div>
      );
    }

    if (step === "AGE") return (
      <div className="btn-row wrap">
        <button className="choice-btn" onClick={() => handleAge("puppy", "1살 미만")}>1살 미만</button>
        <button className="choice-btn" onClick={() => handleAge("adult", "1~7살")}>1~7살</button>
        <button className="choice-btn" onClick={() => handleAge("senior7", "7~11살")}>7~11살</button>
        <button className="choice-btn" onClick={() => handleAge("senior11", "11살 이상")}>11살 이상</button>
      </div>
    );

    if (step === "WEIGHT") return (
      <div className="input-row">
        <input
          className="text-input"
          type="number"
          placeholder="예: 5.2"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleWeight()}
          autoFocus
        />
        <span className="unit-label">kg</span>
        <button className="send-btn" onClick={handleWeight}>→</button>
      </div>
    );

    if (step === "BODY_CONDITION") return (
      <div className="btn-row">
        <button className="choice-btn" onClick={() => handleBodyCondition("underweight", "🔻 마름")}>🔻 마름</button>
        <button className="choice-btn" onClick={() => handleBodyCondition("normal", "✅ 정상")}>✅ 정상</button>
        <button className="choice-btn" onClick={() => handleBodyCondition("overweight", "🔺 과체중")}>🔺 과체중</button>
      </div>
    );

    if (step === "HEALTH_CONCERNS") {
      const concerns = state.petType === "dog" ? DOG_CONCERNS : CAT_CONCERNS;
      return (
        <div className="concerns-wrap">
          <div className="btn-grid">
            {concerns.map(c => (
              <button
                key={c}
                className={`choice-btn small ${selectedConcerns.includes(c) ? "selected" : ""}`}
                onClick={() => toggleConcern(c)}
              >{c}</button>
            ))}
          </div>
          <button className="next-btn" onClick={handleConcernsDone}>
            다음 →
          </button>
        </div>
      );
    }

    if (step === "CONFIRM") return (
      <div className="btn-row">
        <button className="choice-btn accent" onClick={handleConfirm}>✅ 추천받기</button>
        <button className="choice-btn" onClick={handleRestart}>🔄 처음부터</button>
      </div>
    );

    if (step === "DONE") return (
      <div className="btn-row">
        <button className="choice-btn" onClick={handleRestart}>🔄 다시 추천받기</button>
      </div>
    );

    return null;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <span className="logo">🐾</span>
          <div>
            <div className="header-title">펫 라이프 플래너</div>
            <div className="header-sub">Hills Pet Nutrition</div>
          </div>
        </div>
      </header>

      <main className="chat-area">
        {messages.map((m, i) => (
          <div key={i} className={`bubble-wrap ${m.role}`}>
            {m.role === "bot" && <div className="avatar">🐾</div>}
            <div className={`bubble ${m.role}`}>
              {m.text.split("\n").map((line, j) => (
                <span key={j}>{line}{j < m.text.split("\n").length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="bubble-wrap bot">
            <div className="avatar">🐾</div>
            <div className="bubble bot typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {results && state.currentStep === "DONE" && (
          <div className="results-wrap">
            {results.products?.map((p, i) => (
              <div key={i} className="product-card">
                <div className="product-rank">추천 {i + 1}</div>
                <div className="product-name">{p.product_name_kr}</div>
                <div className="product-brand">{p.brand}</div>
                {p.reasoning && <div className="product-reason">💬 {p.reasoning}</div>}
                {p.product_url && (
                  <a href={p.product_url} target="_blank" rel="noreferrer" className="product-link">
                    제품 자세히 보기 →
                  </a>
                )}
              </div>
            ))}
            {results.overall_reasoning && (
              <div className="overall-reason">
                <strong>종합 추천 이유</strong><br />{results.overall_reasoning}
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
        {!isLoading && renderButtons()}
      </footer>
    </div>
  );
}
