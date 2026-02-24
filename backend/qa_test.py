import requests, json, time, sys

BASE = "http://localhost:8000"

TESTS = [
    {
        "cat": "A. 동물 종류 명시 없음",
        "cases": [
            {"id":"1-1","q":"다리가 아파서 잘 못 걸어요. 10살이에요.","expect":{"pet_type":None,"concerns":["관절"],"age":"senior7"}},
            {"id":"1-2","q":"살이 너무 쪄서 걱정이에요. 밥을 줄여야 할까요?","expect":{"pet_type":None,"concerns":["체중"]}},
            {"id":"1-3","q":"구토를 자꾸 해요. 어떤 사료가 좋을까요?","expect":{"pet_type":None,"concerns":["소화기"]}},
            {"id":"1-4","q":"요즘 물을 너무 많이 마셔요.","expect":{"pet_type":None,"concerns":["신장","혈당"]}},
            {"id":"1-5","q":"毛가 많이 빠져요. 사료 때문인가요?","expect":{"pet_type":None,"concerns":["피부"]}},
        ]
    },
    {
        "cat": "B. 나이 경계선 테스트",
        "cases": [
            {"id":"2-1","q":"우리 강아지 딱 7살 됐어요. 어떤 사료 먹여야 해요?","expect":{"pet_type":"dog","age":"senior7"}},
            {"id":"2-2","q":"고양이가 이제 막 1살 됐어요.","expect":{"pet_type":"cat","age":"adult"}},
            {"id":"2-3","q":"11살 넘은 소형 강아지예요.","expect":{"pet_type":"dog","age":"senior11"}},
            {"id":"2-4","q":"6살 대형견인데 관절이 안 좋아요.","expect":{"pet_type":"dog","age":"adult","concerns":["관절"]}},
            {"id":"2-5","q":"생후 3개월 강아지예요.","expect":{"pet_type":"dog","age":"puppy"}},
        ]
    },
    {
        "cat": "C. 복합 건강 문제",
        "cases": [
            {"id":"3-1","q":"신장도 안 좋고 살도 쪄있는 10살 고양이예요.","expect":{"pet_type":"cat","concerns":["신장","체중"],"age":"senior7"}},
            {"id":"3-2","q":"소화도 안 되고 피부도 가렵고 관절도 아픈 8살 강아지예요.","expect":{"pet_type":"dog","concerns":["소화기","피부","관절"],"age":"senior7"}},
            {"id":"3-3","q":"비만인데 심장도 안 좋은 12살 강아지예요.","expect":{"pet_type":"dog","concerns":["체중","심장"],"age":"senior11"}},
            {"id":"3-4","q":"헤어볼도 심하고 비뇨기도 약한 9살 실내 고양이예요.","expect":{"pet_type":"cat","concerns":["헤어볼","요로계"],"age":"senior7"}},
            {"id":"3-5","q":"소화가 약하고 털도 많이 빠지는 임신 중인 강아지예요.","expect":{"pet_type":"dog","concerns":["소화기","피부"]}},
        ]
    },
    {
        "cat": "D. 처방식 경계 (수의사 안내)",
        "cases": [
            {"id":"4-1","q":"강아지가 신장이 안 좋다고 진단받았어요. 뭐 먹이면 좋아요?","expect":{"pet_type":"dog","concerns":["신장"]}},
            {"id":"4-2","q":"고양이가 방광결석 수술했어요. 사료 추천해줘요.","expect":{"pet_type":"cat","concerns":["요로계"]}},
            {"id":"4-3","q":"강아지가 암 진단받았어요.","expect":{"pet_type":"dog","concerns":["암"]}},
            {"id":"4-4","q":"관절염 진단받은 7살 강아지인데 일반식 추천해줘요.","expect":{"pet_type":"dog","concerns":["관절"],"age":"senior7"}},
            {"id":"4-5","q":"당뇨가 있는 고양이예요.","expect":{"pet_type":"cat","concerns":["혈당"]}},
        ]
    },
    {
        "cat": "E. 감성/자연어 표현 매핑",
        "cases": [
            {"id":"5-1","q":"눈물 자국이 너무 심해서 하얀 털이 갈색이 됐어요.","expect":{"concerns":["피부"]}},
            {"id":"5-2","q":"방구를 너무 자주 뀌어요. 냄새가 너무 심해요.","expect":{"concerns":["소화기"]}},
            {"id":"5-3","q":"스케일링을 자주 받아야 한다고 수의사가 말했어요.","expect":{"concerns":["치아"]}},
            {"id":"5-4","q":"소파에 안 올라오던 애가 요즘 못 올라와요.","expect":{"concerns":["관절"]}},
            {"id":"5-5","q":"화장실을 자주 가는데 조금밖에 못 봐요. (고양이)","expect":{"pet_type":"cat","concerns":["요로계"]}},
        ]
    },
    {
        "cat": "F. 모순/불완전 정보",
        "cases": [
            {"id":"6-1","q":"2살 강아지인데 노령견 사료 먹여도 되나요?","expect":{"pet_type":"dog","age":"adult","is_relevant":True}},
            {"id":"6-2","q":"치킨 알러지가 있는 강아지인데 사료 추천해줘요.","expect":{"pet_type":"dog","concerns":["식이"],"is_relevant":True}},
            {"id":"6-3","q":"강아지가 너무 말랐어요. 체중을 늘려야 해요. 10살이에요.","expect":{"pet_type":"dog","concerns":["체중"],"age":"senior7"}},
            {"id":"6-4","q":"이제 막 낳은 새끼 고양이예요. 사료 추천해줘요.","expect":{"pet_type":"cat","is_relevant":True}},
            {"id":"6-5","q":"암컷 강아지인데 중성화 수술 직후예요. 뭐 먹여요?","expect":{"pet_type":"dog","concerns":["체중"],"is_relevant":True}},
        ]
    },
    {
        "cat": "G. Hills 제품 한계",
        "cases": [
            {"id":"7-1","q":"생식 사료(raw food)랑 Hills 섞어 먹여도 돼요?","expect":{"is_relevant":True}},
            {"id":"7-2","q":"사료 없이 자연식만 먹여도 되나요?","expect":{"is_relevant":True}},
            {"id":"7-3","q":"다른 브랜드 사료가 더 저렴한데 Hills랑 뭐가 달라요?","expect":{"is_relevant":True}},
            {"id":"7-4","q":"간식으로만 먹여도 건강할 수 있어요?","expect":{"is_relevant":True}},
            {"id":"7-5","q":"강아지가 Hills를 안 먹으려고 해요. 어떻게 해요?","expect":{"pet_type":"dog","is_relevant":True}},
        ]
    },
    {
        "cat": "H. 보호자 감정/특이 상황",
        "cases": [
            {"id":"8-1","q":"강아지가 암 판정받았어요. 얼마나 살 수 있을까요? 그리고 사료는 뭘 먹여야 하나요?","expect":{"pet_type":"dog","is_relevant":True}},
            {"id":"8-2","q":"입양한 지 사흘 됐는데 아무것도 안 먹어요. 어떤 사료 줘야 해요?","expect":{"is_relevant":True}},
            {"id":"8-3","q":"이번 달 너무 힘들어서 비싼 사료 못 사줄 것 같아요.","expect":{"is_relevant":True}},
            {"id":"8-4","q":"반려견이 곧 무지개 다리를 건널 것 같아요. 마지막으로 뭐 먹여야 할까요?","expect":{"pet_type":"dog","is_relevant":True}},
            {"id":"8-5","q":"사료 성분에 방부제가 들어있는지 알고 싶어요. Hills는 안전한가요?","expect":{"is_relevant":True}},
        ]
    },
    {
        "cat": "I. 시스템 함정",
        "cases": [
            {"id":"9-1","q":"사료 말고 그냥 수의사 전화번호 알려줘요.","expect":{"is_relevant":True}},
            {"id":"9-2","q":"너 진짜 사람이야? AI야?","expect":{"is_relevant":False}},
            {"id":"9-3","q":"ㅋㅋㅋㅋㅋㅋ","expect":{"is_relevant":False}},
            {"id":"9-4","q":"asdfghjkl","expect":{"is_relevant":False}},
            {"id":"9-5","q":"사료 추천해줘. 근데 내 개인정보도 좀 알려줄래?","expect":{"is_relevant":True}},
        ]
    },
]

def check_concern_match(actual_concerns, expected_keywords):
    actual_str = " ".join(actual_concerns).lower()
    matched = []
    missed = []
    for kw in expected_keywords:
        if kw in actual_str:
            matched.append(kw)
        else:
            missed.append(kw)
    return matched, missed

def run_tests():
    results = {"pass":0,"fail":0,"warn":0,"details":[]}
    
    for cat_group in TESTS:
        cat_name = cat_group["cat"]
        print(f"\n{'='*60}")
        print(f"  {cat_name}")
        print(f"{'='*60}")
        
        for tc in cat_group["cases"]:
            time.sleep(0.5)
            try:
                resp = requests.post(f"{BASE}/api/parse-intent", json={"text": tc["q"]}, timeout=30)
                r = resp.json()
            except Exception as e:
                print(f"  [{tc['id']}] ERROR: {e}")
                results["fail"] += 1
                results["details"].append({"id":tc["id"],"status":"ERROR","error":str(e)})
                continue
            
            issues = []
            exp = tc["expect"]
            
            if "pet_type" in exp:
                if exp["pet_type"] is None:
                    if r.get("pet_type") is not None:
                        issues.append(f"pet_type should be null but got '{r.get('pet_type')}'")
                elif r.get("pet_type") != exp["pet_type"]:
                    issues.append(f"pet_type: expected '{exp['pet_type']}' got '{r.get('pet_type')}'")
            
            if "age" in exp:
                actual_age = r.get("age_category")
                if actual_age != exp["age"]:
                    issues.append(f"age: expected '{exp['age']}' got '{actual_age}'")
            
            if "concerns" in exp:
                actual_concerns = r.get("concerns", [])
                _, missed = check_concern_match(actual_concerns, exp["concerns"])
                if missed:
                    issues.append(f"concerns missed: {missed} (got: {actual_concerns})")
            
            if "is_relevant" in exp:
                actual_rel = r.get("is_relevant", True)
                if actual_rel != exp["is_relevant"]:
                    issues.append(f"is_relevant: expected {exp['is_relevant']} got {actual_rel}")
            
            sympathy = r.get("sympathy_msg", "")
            
            status = "PASS" if not issues else "FAIL"
            icon = "✅" if status == "PASS" else "❌"
            
            if status == "PASS":
                results["pass"] += 1
            else:
                results["fail"] += 1
            
            print(f"  {icon} [{tc['id']}] {tc['q'][:40]}...")
            if issues:
                for iss in issues:
                    print(f"      ⚠ {iss}")
            print(f"      → pet={r.get('pet_type')} age={r.get('age_category')} concerns={r.get('concerns',[])} relevant={r.get('is_relevant')}")
            if sympathy:
                print(f"      → sympathy: {sympathy[:60]}...")
            
            results["details"].append({
                "id": tc["id"],
                "question": tc["q"],
                "status": status,
                "issues": issues,
                "response": {
                    "pet_type": r.get("pet_type"),
                    "age_category": r.get("age_category"),
                    "concerns": r.get("concerns", []),
                    "is_relevant": r.get("is_relevant"),
                    "sympathy_msg": sympathy[:80]
                }
            })
    
    print(f"\n{'='*60}")
    print(f"  RESULTS: {results['pass']} passed, {results['fail']} failed out of {results['pass']+results['fail']}")
    print(f"{'='*60}")
    
    with open("backend/qa_results.json", "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nDetailed results saved to backend/qa_results.json")
    
    return results

if __name__ == "__main__":
    run_tests()
