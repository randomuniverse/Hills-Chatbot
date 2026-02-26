import os, json, time
import anthropic
from supabase import create_client
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"], timeout=60.0)

DOG_BREEDS = ["믹스견","말티즈","푸들","시츄","포메라니안","치와와","비숑프리제","요크셔테리어","닥스훈트","웰시코기","비글","골든리트리버","래브라도","보더콜리","허스키","진돗개","삽살개","기타"]
CAT_BREEDS = ["믹스묘","코리안숏헤어","페르시안","메인쿤","브리티시숏헤어","스코티시폴드","러시안블루","시암","랙돌","아비시니안","기타"]

def generate_batch(pet_type, breeds_batch):
    pet_label = "강아지" if pet_type == "dog" else "고양이"
    breed_list = ", ".join(breeds_batch)
    
    resp = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system="반려동물 전문가. 친근하고 따뜻한 말투. JSON으로만 응답. 코드블록 없이 순수 JSON만.",
        messages=[{"role":"user","content":(
            f"{pet_label} 품종별 짧은 코멘트. 품종: {breed_list}\n"
            f"각 품종마다 variant 1, 2 (말투 다르게). 각 2문장: 장점 + 성격특징/보호자 공감포인트.\n"
            f"이모지 1-2개. 존댓말.\n"
            f'{{"comments":[{{"breed":"이름","variant":1,"comment":"텍스트"}},...]}}'
        )}]
    )
    
    raw = resp.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1].lstrip("json").strip()
    return json.loads(raw)

all_rows = []

dog_batches = [DOG_BREEDS[:6], DOG_BREEDS[6:12], DOG_BREEDS[12:]]
for i, batch in enumerate(dog_batches):
    print(f"Dog batch {i+1}/3: {batch}")
    data = generate_batch("dog", batch)
    for item in data["comments"]:
        all_rows.append({"pet_type":"dog","breed":item["breed"],"variant":item["variant"],"comment":item["comment"]})
    print(f"  Got {len(data['comments'])} comments")
    time.sleep(1)

cat_batches = [CAT_BREEDS[:6], CAT_BREEDS[6:]]
for i, batch in enumerate(cat_batches):
    print(f"Cat batch {i+1}/2: {batch}")
    data = generate_batch("cat", batch)
    for item in data["comments"]:
        all_rows.append({"pet_type":"cat","breed":item["breed"],"variant":item["variant"],"comment":item["comment"]})
    print(f"  Got {len(data['comments'])} comments")
    time.sleep(1)

print(f"\nTotal: {len(all_rows)} rows")

out_path = Path(__file__).resolve().parent / "breed_comments_data.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(all_rows, f, ensure_ascii=False, indent=2)
print(f"Saved to {out_path}")
