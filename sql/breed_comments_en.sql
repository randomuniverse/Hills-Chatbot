-- Step 1: Add comment_en column
ALTER TABLE breed_comments ADD COLUMN IF NOT EXISTS comment_en TEXT;

-- Step 2: Update English comments for each breed (2 per breed)
-- We'll match by pet_type + breed, updating the first and second rows

-- ===== DOGS =====

-- 믹스견 (Mixed)
UPDATE breed_comments SET comment_en = 'Mixed breeds are known for their strong immune systems and unique personalities! Every mix is one-of-a-kind 🐾'
WHERE pet_type = 'dog' AND breed = '믹스견' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='믹스견' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Fun fact: mixed breed dogs often live longer than purebreds thanks to genetic diversity! 🧬'
WHERE pet_type = 'dog' AND breed = '믹스견' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='믹스견' AND comment_en IS NULL LIMIT 1);

-- 말티즈 (Maltese)
UPDATE breed_comments SET comment_en = 'Maltese have been companion dogs for over 2,000 years — true royalty! 👑'
WHERE pet_type = 'dog' AND breed = '말티즈' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='말티즈' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Despite their tiny size, Maltese are surprisingly brave and full of energy! 💪'
WHERE pet_type = 'dog' AND breed = '말티즈' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='말티즈' AND comment_en IS NULL LIMIT 1);

-- 푸들 (Poodle)
UPDATE breed_comments SET comment_en = 'Poodles rank as one of the smartest dog breeds in the world! Big brains in a fluffy package 🧠'
WHERE pet_type = 'dog' AND breed = '푸들' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='푸들' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Poodles are hypoallergenic and barely shed — great for allergy-prone families! ✨'
WHERE pet_type = 'dog' AND breed = '푸들' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='푸들' AND comment_en IS NULL LIMIT 1);

-- 시츄 (Shih Tzu)
UPDATE breed_comments SET comment_en = 'Shih Tzus were originally bred for Chinese royalty — they are natural lap warmers! 🏯'
WHERE pet_type = 'dog' AND breed = '시츄' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='시츄' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Shih Tzu means "little lion," but they are all about cuddles, not roaring! 🦁💕'
WHERE pet_type = 'dog' AND breed = '시츄' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='시츄' AND comment_en IS NULL LIMIT 1);

-- 포메라니안 (Pomeranian)
UPDATE breed_comments SET comment_en = 'Pomeranians descended from large sled dogs — tiny body, big dog attitude! 🐻'
WHERE pet_type = 'dog' AND breed = '포메라니안' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='포메라니안' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Queen Victoria owned a Pomeranian, making them a worldwide sensation! 👸'
WHERE pet_type = 'dog' AND breed = '포메라니안' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='포메라니안' AND comment_en IS NULL LIMIT 1);

-- 치와와 (Chihuahua)
UPDATE breed_comments SET comment_en = 'Chihuahuas are the smallest breed but have the biggest personalities! Fearless little warriors 🔥'
WHERE pet_type = 'dog' AND breed = '치와와' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='치와와' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Chihuahuas love to burrow under blankets — tiny heat-seekers! 🛏️'
WHERE pet_type = 'dog' AND breed = '치와와' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='치와와' AND comment_en IS NULL LIMIT 1);

-- 비숑프리제 (Bichon Frise)
UPDATE breed_comments SET comment_en = 'Bichon Frises are natural entertainers — they were literally circus performers! 🎪'
WHERE pet_type = 'dog' AND breed = '비숑프리제' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='비숑프리제' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'That cloud-like coat is hypoallergenic! Bichons are great for sensitive owners ☁️'
WHERE pet_type = 'dog' AND breed = '비숑프리제' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='비숑프리제' AND comment_en IS NULL LIMIT 1);

-- 요크셔테리어 (Yorkie)
UPDATE breed_comments SET comment_en = 'Yorkies were originally bred to catch rats in textile mills — tiny but mighty hunters! 🏭'
WHERE pet_type = 'dog' AND breed = '요크셔테리어' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='요크셔테리어' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'A Yorkie''s silky coat is more like human hair than fur — it just keeps growing! 💇'
WHERE pet_type = 'dog' AND breed = '요크셔테리어' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='요크셔테리어' AND comment_en IS NULL LIMIT 1);

-- 닥스훈트 (Dachshund)
UPDATE breed_comments SET comment_en = 'Dachshunds were bred to hunt badgers — that long body was made for tunneling! 🦡'
WHERE pet_type = 'dog' AND breed = '닥스훈트' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='닥스훈트' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'The famous "hot dog" name actually came from Dachshunds, not the other way around! 🌭'
WHERE pet_type = 'dog' AND breed = '닥스훈트' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='닥스훈트' AND comment_en IS NULL LIMIT 1);

-- 웰시코기 (Corgi)
UPDATE breed_comments SET comment_en = 'Corgis are the Queen of England''s favorite breed — true royal pups! 👑🐕'
WHERE pet_type = 'dog' AND breed = '웰시코기' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='웰시코기' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Despite those short legs, Corgis are herding dogs — fast, agile, and full of stamina! ⚡'
WHERE pet_type = 'dog' AND breed = '웰시코기' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='웰시코기' AND comment_en IS NULL LIMIT 1);

-- 비글 (Beagle)
UPDATE breed_comments SET comment_en = 'Beagles have about 220 million scent receptors — their nose knows everything! 👃'
WHERE pet_type = 'dog' AND breed = '비글' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='비글' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Snoopy is a Beagle! One of the most beloved cartoon dogs of all time 🎨'
WHERE pet_type = 'dog' AND breed = '비글' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='비글' AND comment_en IS NULL LIMIT 1);

-- 골든리트리버 (Golden Retriever)
UPDATE breed_comments SET comment_en = 'Golden Retrievers are the ultimate family dogs — gentle, loyal, and always smiling! 😊'
WHERE pet_type = 'dog' AND breed = '골든리트리버' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='골든리트리버' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Goldens are top picks for therapy and guide dogs thanks to their incredible empathy 🤝'
WHERE pet_type = 'dog' AND breed = '골든리트리버' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='골든리트리버' AND comment_en IS NULL LIMIT 1);

-- 래브라도 (Labrador)
UPDATE breed_comments SET comment_en = 'Labradors have been the #1 most popular dog breed in America for over 30 years! 🏆'
WHERE pet_type = 'dog' AND breed = '래브라도' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='래브라도' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Labs have webbed toes — they are natural-born swimmers! 🏊'
WHERE pet_type = 'dog' AND breed = '래브라도' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='래브라도' AND comment_en IS NULL LIMIT 1);

-- 보더콜리 (Border Collie)
UPDATE breed_comments SET comment_en = 'Border Collies are considered THE smartest dog breed — they can learn a new command in under 5 seconds! 🧠⚡'
WHERE pet_type = 'dog' AND breed = '보더콜리' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='보더콜리' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'A Border Collie named Chaser learned over 1,000 words — the most of any dog ever recorded! 📚'
WHERE pet_type = 'dog' AND breed = '보더콜리' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='보더콜리' AND comment_en IS NULL LIMIT 1);

-- 허스키 (Husky)
UPDATE breed_comments SET comment_en = 'Huskies can run over 100 miles a day in sub-zero temperatures — ultimate endurance athletes! 🏔️'
WHERE pet_type = 'dog' AND breed = '허스키' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='허스키' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Huskies are famous for their dramatic "talking" — they howl, whine, and argue like no other breed! 🗣️'
WHERE pet_type = 'dog' AND breed = '허스키' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='허스키' AND comment_en IS NULL LIMIT 1);

-- 진돗개 (Jindo)
UPDATE breed_comments SET comment_en = 'Jindos are legendary for their loyalty — one Jindo walked 180 miles to return to its owner! 🏃'
WHERE pet_type = 'dog' AND breed = '진돗개' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='진돗개' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'The Jindo is a Korean national treasure — officially designated Natural Monument #53! 🇰🇷'
WHERE pet_type = 'dog' AND breed = '진돗개' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='진돗개' AND comment_en IS NULL LIMIT 1);

-- 삽살개 (Sapsali)
UPDATE breed_comments SET comment_en = 'Sapsalis were believed to ward off evil spirits in Korean folklore — fluffy guardian angels! 👻✨'
WHERE pet_type = 'dog' AND breed = '삽살개' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='삽살개' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'The Sapsali nearly went extinct but was saved by dedicated Korean breeders in the 1980s! 🛡️'
WHERE pet_type = 'dog' AND breed = '삽살개' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='삽살개' AND comment_en IS NULL LIMIT 1);

-- 기타 (Other - dog)
UPDATE breed_comments SET comment_en = 'Every dog is special! Let''s find the perfect nutrition for your unique pup 🐕'
WHERE pet_type = 'dog' AND breed = '기타' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='기타' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'No matter the breed, proper nutrition is the foundation of a happy, healthy life! 💛'
WHERE pet_type = 'dog' AND breed = '기타' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='dog' AND breed='기타' AND comment_en IS NULL LIMIT 1);

-- ===== CATS =====

-- 믹스묘 (Mixed cat)
UPDATE breed_comments SET comment_en = 'Mixed breed cats are wonderfully unique — no two are ever the same! 🎨'
WHERE pet_type = 'cat' AND breed = '믹스묘' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='믹스묘' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Mixed cats tend to be healthier thanks to genetic diversity — nature''s best design! 🧬'
WHERE pet_type = 'cat' AND breed = '믹스묘' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='믹스묘' AND comment_en IS NULL LIMIT 1);

-- 코리안숏헤어 (Korean Shorthair)
UPDATE breed_comments SET comment_en = 'Korean Shorthairs are the most popular cats in Korea — adaptable, smart, and low-maintenance! 🇰🇷'
WHERE pet_type = 'cat' AND breed = '코리안숏헤어' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='코리안숏헤어' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Korean Shorthairs are excellent hunters with strong, athletic builds! 🏋️'
WHERE pet_type = 'cat' AND breed = '코리안숏헤어' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='코리안숏헤어' AND comment_en IS NULL LIMIT 1);

-- 페르시안 (Persian)
UPDATE breed_comments SET comment_en = 'Persians are one of the oldest cat breeds — they''ve been adored for thousands of years! 🏛️'
WHERE pet_type = 'cat' AND breed = '페르시안' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='페르시안' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Persians are the ultimate couch companions — calm, gentle, and endlessly fluffy! ☁️'
WHERE pet_type = 'cat' AND breed = '페르시안' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='페르시안' AND comment_en IS NULL LIMIT 1);

-- 메인쿤 (Maine Coon)
UPDATE breed_comments SET comment_en = 'Maine Coons are the largest domestic cat breed — some weigh over 25 pounds! They are gentle giants 🦁'
WHERE pet_type = 'cat' AND breed = '메인쿤' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='메인쿤' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Maine Coons love water and are known to play in their water bowls — unusual for cats! 💧'
WHERE pet_type = 'cat' AND breed = '메인쿤' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='메인쿤' AND comment_en IS NULL LIMIT 1);

-- 브리티시숏헤어 (British Shorthair)
UPDATE breed_comments SET comment_en = 'British Shorthairs are the teddy bears of the cat world — round face, chunky body, pure charm! 🧸'
WHERE pet_type = 'cat' AND breed = '브리티시숏헤어' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='브리티시숏헤어' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'The Cheshire Cat from Alice in Wonderland was inspired by a British Shorthair! 😸'
WHERE pet_type = 'cat' AND breed = '브리티시숏헤어' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='브리티시숏헤어' AND comment_en IS NULL LIMIT 1);

-- 스코티시폴드 (Scottish Fold)
UPDATE breed_comments SET comment_en = 'Scottish Folds get their unique folded ears from a natural genetic mutation — adorably owl-like! 🦉'
WHERE pet_type = 'cat' AND breed = '스코티시폴드' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='스코티시폴드' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Scottish Folds are famous for sitting in quirky "Buddha" poses — they are natural comedians! 🧘'
WHERE pet_type = 'cat' AND breed = '스코티시폴드' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='스코티시폴드' AND comment_en IS NULL LIMIT 1);

-- 러시안블루 (Russian Blue)
UPDATE breed_comments SET comment_en = 'Russian Blues have a unique double coat that shimmers silver in the light — living velvet! ✨'
WHERE pet_type = 'cat' AND breed = '러시안블루' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='러시안블루' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Russian Blues are known for their "smile" — the shape of their mouth makes them look permanently happy! 😊'
WHERE pet_type = 'cat' AND breed = '러시안블루' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='러시안블루' AND comment_en IS NULL LIMIT 1);

-- 시암 (Siamese)
UPDATE breed_comments SET comment_en = 'Siamese cats are one of the most vocal breeds — they will literally have conversations with you! 🗣️'
WHERE pet_type = 'cat' AND breed = '시암' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='시암' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Siamese kittens are born completely white — their color points develop as they grow! 🎨'
WHERE pet_type = 'cat' AND breed = '시암' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='시암' AND comment_en IS NULL LIMIT 1);

-- 랙돌 (Ragdoll)
UPDATE breed_comments SET comment_en = 'Ragdolls go completely limp when you pick them up — that is literally how they got their name! 🧸'
WHERE pet_type = 'cat' AND breed = '랙돌' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='랙돌' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Ragdolls are often called "puppy cats" because they follow their owners around the house! 🐕'
WHERE pet_type = 'cat' AND breed = '랙돌' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='랙돌' AND comment_en IS NULL LIMIT 1);

-- 아비시니안 (Abyssinian)
UPDATE breed_comments SET comment_en = 'Abyssinians are one of the oldest known cat breeds — they look like miniature mountain lions! 🦁'
WHERE pet_type = 'cat' AND breed = '아비시니안' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='아비시니안' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'Abyssinians are incredibly active and curious — they love climbing to the highest spot in the room! 🧗'
WHERE pet_type = 'cat' AND breed = '아비시니안' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='아비시니안' AND comment_en IS NULL LIMIT 1);

-- 기타 (Other - cat)
UPDATE breed_comments SET comment_en = 'Every cat is unique! Let''s find the purr-fect nutrition for your feline friend 🐱'
WHERE pet_type = 'cat' AND breed = '기타' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='기타' AND comment_en IS NULL LIMIT 1);
UPDATE breed_comments SET comment_en = 'No matter the breed, the right nutrition makes all the difference for a happy cat! 💛'
WHERE pet_type = 'cat' AND breed = '기타' AND comment_en IS NULL AND ctid = (SELECT ctid FROM breed_comments WHERE pet_type='cat' AND breed='기타' AND comment_en IS NULL LIMIT 1);
