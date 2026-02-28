-- Breed comments English translation v2
-- Uses temp mapping table + ROW_NUMBER for reliable Supabase execution

-- 1. Create temp mapping table
CREATE TEMP TABLE _en_map (pet_type text, breed text, rn int, comment_en text);

INSERT INTO _en_map VALUES
-- DOGS
('dog','믹스견',1,'Mixed breeds are known for their strong immune systems and unique personalities! Every mix is one-of-a-kind 🐾'),
('dog','믹스견',2,'Fun fact: mixed breed dogs often live longer than purebreds thanks to genetic diversity! 🧬'),
('dog','말티즈',1,'Maltese have been companion dogs for over 2,000 years — true royalty! 👑'),
('dog','말티즈',2,'Despite their tiny size, Maltese are surprisingly brave and full of energy! 💪'),
('dog','푸들',1,'Poodles rank as one of the smartest dog breeds in the world! Big brains in a fluffy package 🧠'),
('dog','푸들',2,'Poodles are hypoallergenic and barely shed — great for allergy-prone families! ✨'),
('dog','시츄',1,'Shih Tzus were originally bred for Chinese royalty — they are natural lap warmers! 🏯'),
('dog','시츄',2,'Shih Tzu means "little lion," but they are all about cuddles, not roaring! 🦁💕'),
('dog','포메라니안',1,'Pomeranians descended from large sled dogs — tiny body, big dog attitude! 🐻'),
('dog','포메라니안',2,'Queen Victoria owned a Pomeranian, making them a worldwide sensation! 👸'),
('dog','치와와',1,'Chihuahuas are the smallest breed but have the biggest personalities! Fearless little warriors 🔥'),
('dog','치와와',2,'Chihuahuas love to burrow under blankets — tiny heat-seekers! 🛏️'),
('dog','비숑프리제',1,'Bichon Frises are natural entertainers — they were literally circus performers! 🎪'),
('dog','비숑프리제',2,'That cloud-like coat is hypoallergenic! Bichons are great for sensitive owners ☁️'),
('dog','요크셔테리어',1,'Yorkies were originally bred to catch rats in textile mills — tiny but mighty hunters! 🏭'),
('dog','요크셔테리어',2,'A Yorkie''s silky coat is more like human hair than fur — it just keeps growing! 💇'),
('dog','닥스훈트',1,'Dachshunds were bred to hunt badgers — that long body was made for tunneling! 🦡'),
('dog','닥스훈트',2,'The famous "hot dog" name actually came from Dachshunds, not the other way around! 🌭'),
('dog','웰시코기',1,'Corgis are the Queen of England''s favorite breed — true royal pups! 👑🐕'),
('dog','웰시코기',2,'Despite those short legs, Corgis are herding dogs — fast, agile, and full of stamina! ⚡'),
('dog','비글',1,'Beagles have about 220 million scent receptors — their nose knows everything! 👃'),
('dog','비글',2,'Snoopy is a Beagle! One of the most beloved cartoon dogs of all time 🎨'),
('dog','골든리트리버',1,'Golden Retrievers are the ultimate family dogs — gentle, loyal, and always smiling! 😊'),
('dog','골든리트리버',2,'Goldens are top picks for therapy and guide dogs thanks to their incredible empathy 🤝'),
('dog','래브라도',1,'Labradors have been the #1 most popular dog breed in America for over 30 years! 🏆'),
('dog','래브라도',2,'Labs have webbed toes — they are natural-born swimmers! 🏊'),
('dog','보더콜리',1,'Border Collies are considered THE smartest dog breed — they can learn a new command in under 5 seconds! 🧠⚡'),
('dog','보더콜리',2,'A Border Collie named Chaser learned over 1,000 words — the most of any dog ever recorded! 📚'),
('dog','허스키',1,'Huskies can run over 100 miles a day in sub-zero temperatures — ultimate endurance athletes! 🏔️'),
('dog','허스키',2,'Huskies are famous for their dramatic "talking" — they howl, whine, and argue like no other breed! 🗣️'),
('dog','진돗개',1,'Jindos are legendary for their loyalty — one Jindo walked 180 miles to return to its owner! 🏃'),
('dog','진돗개',2,'The Jindo is a Korean national treasure — officially designated Natural Monument #53! 🇰🇷'),
('dog','삽살개',1,'Sapsalis were believed to ward off evil spirits in Korean folklore — fluffy guardian angels! 👻✨'),
('dog','삽살개',2,'The Sapsali nearly went extinct but was saved by dedicated Korean breeders in the 1980s! 🛡️'),
('dog','기타',1,'Every dog is special! Let''s find the perfect nutrition for your unique pup 🐕'),
('dog','기타',2,'No matter the breed, proper nutrition is the foundation of a happy, healthy life! 💛'),
-- CATS
('cat','믹스묘',1,'Mixed breed cats are wonderfully unique — no two are ever the same! 🎨'),
('cat','믹스묘',2,'Mixed cats tend to be healthier thanks to genetic diversity — nature''s best design! 🧬'),
('cat','코리안숏헤어',1,'Korean Shorthairs are the most popular cats in Korea — adaptable, smart, and low-maintenance! 🇰🇷'),
('cat','코리안숏헤어',2,'Korean Shorthairs are excellent hunters with strong, athletic builds! 🏋️'),
('cat','페르시안',1,'Persians are one of the oldest cat breeds — they''ve been adored for thousands of years! 🏛️'),
('cat','페르시안',2,'Persians are the ultimate couch companions — calm, gentle, and endlessly fluffy! ☁️'),
('cat','메인쿤',1,'Maine Coons are the largest domestic cat breed — some weigh over 25 pounds! They are gentle giants 🦁'),
('cat','메인쿤',2,'Maine Coons love water and are known to play in their water bowls — unusual for cats! 💧'),
('cat','브리티시숏헤어',1,'British Shorthairs are the teddy bears of the cat world — round face, chunky body, pure charm! 🧸'),
('cat','브리티시숏헤어',2,'The Cheshire Cat from Alice in Wonderland was inspired by a British Shorthair! 😸'),
('cat','스코티시폴드',1,'Scottish Folds get their unique folded ears from a natural genetic mutation — adorably owl-like! 🦉'),
('cat','스코티시폴드',2,'Scottish Folds are famous for sitting in quirky "Buddha" poses — they are natural comedians! 🧘'),
('cat','러시안블루',1,'Russian Blues have a unique double coat that shimmers silver in the light — living velvet! ✨'),
('cat','러시안블루',2,'Russian Blues are known for their "smile" — the shape of their mouth makes them look permanently happy! 😊'),
('cat','시암',1,'Siamese cats are one of the most vocal breeds — they will literally have conversations with you! 🗣️'),
('cat','시암',2,'Siamese kittens are born completely white — their color points develop as they grow! 🎨'),
('cat','랙돌',1,'Ragdolls go completely limp when you pick them up — that is literally how they got their name! 🧸'),
('cat','랙돌',2,'Ragdolls are often called "puppy cats" because they follow their owners around the house! 🐕'),
('cat','아비시니안',1,'Abyssinians are one of the oldest known cat breeds — they look like miniature mountain lions! 🦁'),
('cat','아비시니안',2,'Abyssinians are incredibly active and curious — they love climbing to the highest spot in the room! 🧗'),
('cat','기타',1,'Every cat is unique! Let''s find the purr-fect nutrition for your feline friend 🐱'),
('cat','기타',2,'No matter the breed, the right nutrition makes all the difference for a happy cat! 💛');

-- 2. Number existing rows and update
WITH ranked AS (
  SELECT id, pet_type, breed,
         ROW_NUMBER() OVER (PARTITION BY pet_type, breed ORDER BY id) as rn
  FROM breed_comments
)
UPDATE breed_comments bc
SET comment_en = m.comment_en
FROM ranked r
JOIN _en_map m ON r.pet_type = m.pet_type AND r.breed = m.breed AND r.rn = m.rn
WHERE bc.id = r.id;

-- 3. Cleanup
DROP TABLE _en_map;

-- 4. Verify
SELECT breed, comment_en FROM breed_comments WHERE comment_en IS NOT NULL LIMIT 5;
