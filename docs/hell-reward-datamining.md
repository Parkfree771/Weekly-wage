# 지옥·나락 보상표 데이터마이닝 원본 읽는 법

`/hell-reward` 페이지의 보상표(`lib/hell-reward-calc.ts`)를 인게임 원본과 대조하거나, 새 시즌이 나왔을 때
빠르게 갈아끼우기 위한 문서다. 2026-07-30 기준 시즌3(1750) 전 항목 대조 완료.

## 1. 어디서 보나

| 용도 | 주소 |
|---|---|
| 브라우저에서 표로 보기 (한섭) | https://sekwahar.github.io/loa_datamining/pages/kr_hell_drops.html |
| 원본 JSON (raw, 약 1.7MB) | https://raw.githubusercontent.com/sekwahar/loa_datamining/main/data/kr_TrinityInfernoRewards.json |
| 저장소 | https://github.com/sekwahar/loa_datamining |

- **한섭 페이지는 README에 링크가 없다.** README에 걸린 `hell_drops.html` / `TrinityInfernoRewards.json` 은
  **북미 데이터**다. 한섭은 파일명에 `kr_` 가 붙은 쪽만 쓴다.
- 깃허브 웹 뷰어는 1.7MB라 잘릴 수 있으니 파싱은 raw 로 받는다.
- 페이지 상단에 Key(지옥/나락) · iLevel(1640/1700/1730/1750) 선택기가 있고 표는 가로 스크롤이다.
- **시즌이 끝나면 관리자가 과거 시즌을 지운다** (7/5 커밋 "removed old seasons"). 한섭 시즌3은 9/2 종료 →
  시즌4 데이터로 갈아끼우면서 시즌3이 날아갈 수 있으므로 1750 구간만 잘라 저장해 두었다:
  `docs/hell-reward/kr_inferno_1750_season3.json` (Category 1026·1027 전체, 약 200KB)

## 2. JSON 구조

최상위는 카테고리 배열이다. 카테고리 하나 = (모드 × 아이템 레벨) 한 벌.

```
[
  {
    "Category": 1026,          // 카테고리 번호 (아래 표)
    "Season": ["Season 3"],
    "Mode": "Destiny",         // Destiny = 지옥, Netherworld = 나락
    "CategoryName": "1750",
    "ItemLevel": 1750,
    "Main":   [ ... ],         // 단계별 선택 상자 (= 우리 보상표 본체)
    "Sub":    [ ... ],         // 항상 지급되는 기본 보상 (지옥만 있음, 나락은 빈 배열)
    "Plenty": [ ... ]          // 풍요 — Sub 의 정확히 10배
  },
  ...
]
```

### 카테고리 번호

| 구간 | 지옥(Destiny) | 나락(Netherworld) |
|---|---|---|
| 1640 | 1011 (1012는 중복) | 1017 |
| 1700 | 1013 (1014는 중복) | 1018 |
| 1730 | 1015 (1016은 중복) | 1019 |
| **1750** | **1026** | **1027** |

우리는 1750만 쓴다. 하위 구간은 보지 않는다.

### Main 안쪽

```
{
  "ChestID": 65812101,
  "ChestName": "Base MainDropId1",   // "<단계> MainDropId<보상종류>"
  "LevelTier": "Base",
  "Contents": [
    {
      "ActualItemName": "기본 단계 파괴석/수호석 선택 상자",
      "AmountMin": 1, "AmountMax": 1,          // ← 상자 자체가 몇 개 나오는지
      "ContainerType": "아래의 아이템 중 1종류를 선택하여...",
      "ContainerContents": [                    // ← 택1 옵션
        { "ActualItemName": "운명의 파괴석 결정 (귀속)", "AmountMin": 600 },
        { "ActualItemName": "운명의 수호석 결정 (귀속)", "AmountMin": 1800 }
      ]
    }
  ]
}
```

## 3. 우리 표와의 매핑

### 열 = LevelTier

`lib/hell-reward-calc.ts` 의 배열 인덱스 0~10 이 그대로 `Base, Level 1 … Level 9, Max` 다.
화면 라벨(`TIER_LABELS`)로는 `0~9층, 10~19층, … 100층`.

| 인덱스 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LevelTier | Base | Level 1 | … | … | … | Level 5 | … | … | Level 8 | Level 9 | Max |
| 화면 층수 | 0~9 | 10~19 | 20~29 | 30~39 | 40~49 | 50~59 | 60~69 | 70~79 | 80~89 | 90~99 | 100 |

### 행 = MainDropId

**ChestName 의 `MainDropId` 뒤 숫자는 층이 아니라 보상 종류다.** 이 번호만 알면 표가 바로 읽힌다.

지옥 (1026)

| MainDropId | 우리 표 행 | 값 읽는 법 |
|---|---|---|
| 1 | 파괴석/수호석 | 택1 옵션 두 개의 수량 → `600/1,800` |
| 2 | 돌파석 | 수량 그대로 |
| 3 | 상급아비도스 | 수량 그대로 |
| 5 | 용숨/빙숨 | Contents 두 줄(용암·빙하) → `12/36` |
| 7 | 귀속골드 | **아이템명에 액수가 있다** (`"5,500 골드 금괴" × 개수`) |
| 8 | 어빌리티스톤 | "비상의 돌 각인 지정 키트" 수량 |
| 10 | 팔찌 | "고대 팔찌 상자" **바깥 수량** (안쪽 팔찌는 항상 1) |
| 12 | 특수재련 | "특수 재련 : 전이 돌파석" 수량 |
| 13 | 천상 도전권 | **Level 5 부터만 존재** (없으면 `-`) |
| 18 | 젬 선택 상자 | 바깥 수량 + 아이템명의 `희귀/영웅` → `3(희귀)` |
| 20 | 정련된 운명/혼돈의 돌 | 바깥 수량 × 옵션의 운명의 돌 수량 |

나락 (1027)

| MainDropId | 우리 표 행 | 비고 |
|---|---|---|
| 5 | 용숨/빙숨 | |
| 7 | 귀속골드 | 금괴 액수 × 개수(5) |
| 8 | 어빌리티스톤 | |
| 10 | 팔찌 | |
| 15 | 귀속 각인서 랜덤 상자 | "유물 각인서 랜덤 주머니" 바깥 수량 |
| 16 | 귀속 보석 | **Level 8 부터만 존재** (8레벨 광휘의 보석) |
| 17 | 전설카드팩 | **Level 5 부터만 존재** |
| 18 | 젬 선택 상자 | |
| 20 | 정련된 운명/혼돈의 돌 | |

지옥에 있고 나락에 없는 행: 파괴석/수호석, 돌파석, 상급아비도스, 특수재련, 천상 도전권.
나락에만 있는 행: 각인서 상자, 귀속 보석, 전설카드팩.

### 층 기본 보상 (Sub)

`Sub` 는 상자와 별개로 **층을 깰 때마다 항상 지급되는 몫**이다. 지옥에만 있고 나락은 빈 배열이다.
`lib/hell-reward-calc.ts` 의 `HELL_BASE_REWARDS_DATA` 가 이 값이고, 화면에서는 "층 기본 보상" 카드로
보여주면서 `총 기댓값 = 기본 보상 + 상자 평균` 으로 합산한다. 구성은 4종(운명의 파편 · 파괴석 결정 ·
수호석 결정 · 위대한 돌파석)이며 전부 거래소 실시간 시세로 환산한다.

`Plenty`(풍요)는 `Sub` 의 정확히 10배다. 아직 사이트에 넣지 않았다 — 필요하면 배수만 곱하면 된다.

### 값을 읽을 때 주의할 것 셋

1. **바깥 수량 × 안쪽 수량.** 선택 상자는 `Contents[].AmountMin` 이 상자 개수고, 실제 아이템 수량은
   `ContainerContents[].AmountMin` 이다. 나락은 상자가 5개씩 나온다 → 나락 값 = 지옥 값 × 5
   (실제로 전 항목이 정확히 5배다. 검산에 쓰면 좋다).
2. **골드는 아이템명에 들어 있다.** `"156,000 골드 금괴" × 1` 처럼 이름에서 숫자를 뽑아야 한다.
3. **정련된 혼돈의 돌은 상자 안의 상자다.** 택1 옵션이 `기본 단계 정련된 혼돈의 돌 상자 × 1` 이라는
   또 다른 상자인데, **한섭 파일·한섭 페이지는 이 상자를 더 안 풀어준다.** 북미 파일은 끝까지 풀려
   있으므로 상자 ItemID 로 북미에서 찾아보면 된다 (아래 4-2).

### 영어 화면을 봐야 할 때 (이름 대응)

**한섭 `kr_` 파일은 아이템명이 한글이라 사실 번역이 필요 없다.** 영어인 것은 구조 라벨뿐이고,
그건 위에서 이미 다 대응해 뒀다: `Destiny`=지옥, `Netherworld`=나락, `LevelTier`=단계, `Base`=기본,
`Max`=최고, `Main`=선택 상자, `Sub`=기본 지급, `Plenty`=풍요, `Show/Hide`=상자 내용 펼치기.

혹시 영어 페이지를 봐야 하면 아래 대응만 알면 우리 표 행을 다 짚을 수 있다 (아이템 ID는 지역 공통이라
헷갈리면 ID로 맞추면 된다).

| 우리 표 행 | 한글 아이템명 | English |
|---|---|---|
| 파괴석/수호석 | 운명의 파괴석 결정 / 수호석 결정 | Destiny Crystallized Destruction / Guardian Stone |
| 돌파석 | 위대한 운명의 돌파석 | Great Destiny Leapstone |
| 상급아비도스 | 상급 아비도스 융화 재료 | Superior Abidos Fusion Material |
| 용숨/빙숨 | 용암의 숨결 / 빙하의 숨결 | Lava's Breath / Glacier's Breath |
| 귀속골드 | N 골드 금괴 | N Gold Bars |
| 어빌리티스톤 | 비상의 돌 각인 지정 키트 | Soaring Stone Engraving Setting Kit |
| 팔찌 | 고대 팔찌 상자 (찬란한 구원자의 팔찌) | Ancient Bracelet Chest (Radiant Savior Bracelet) |
| 특수재련 | 특수 재련 : 전이 돌파석 | Special Honing: Transferred Leapstone |
| 천상 도전권 | 천상 도전 횟수 +1 | Elysian Attempt +1 |
| 젬 선택 상자 | 희귀/영웅 젬 선택 상자 | Rare / Epic Astrogem Selection Chest |
| 정련된 운명의 돌 | 정련된 운명의 돌 | Processed Destiny Stone |
| 정련된 혼돈의 돌 | N단계 정련된 혼돈의 돌 상자 | Level N Processed Chaos Stone Chest |
| 귀속 각인서 랜덤 상자 | 유물 각인서 랜덤 주머니 | Relic Engraving Recipe Random Pouch |
| 귀속 보석 | 8레벨 광휘의 보석 | Lv. 8 Brilliant Gem |
| 전설카드팩 | 열망의 전설 카드 팩 | Joyful Legendary Card Pack |

주의: **MainDropId 번호는 지역마다 의미가 다르다** (북미 Id2 = 천상, 한섭 Id2 = 돌파석). 위 3장의 번호표는
한섭 파일 전용이고, 지역을 넘나들 때는 번호가 아니라 아이템명·ItemID 로 맞춰야 한다.

## 4. 대조하기

### 4-1. 대조 스크립트

```
node scripts/hell-reward/verify-1750.js                # 저장해 둔 아카이브로 대조
node scripts/hell-reward/verify-1750.js <새로받은.json>  # 새 원본으로 대조
```

`lib/hell-reward-calc.ts` 의 두 테이블을 그대로 읽어 원본과 한 칸씩 비교하고, 틀린 칸만 찍는다.
(`/scripts/` 는 gitignore 대상이라 로컬 도구다.)

**2026-07-30 대조 결과: 1750 지옥 11행 × 11단계, 나락 9행 × 11단계 전부 일치.** 혼돈의 돌 포함 전 항목 확인.

### 4-2. 상자 안의 상자 (혼돈의 돌) 뚫는 법

한섭 파일에 안 담긴 중첩 상자는 **북미 파일에서 ItemID 로 찾는다.** 아이템 ID는 지역이 같으므로 그대로 통한다.

```
curl -sL -o na.json https://raw.githubusercontent.com/sekwahar/loa_datamining/main/data/TrinityInfernoRewards.json
node --max-old-space-size=4096 -e "
const j=require('./na.json'); const want=new Set([65800420]);   // 찾을 상자 ItemID
(function w(n){ if(Array.isArray(n))return n.forEach(w); if(!n||typeof n!=='object')return;
  if(want.has(n.ActualItemID)&&n.ContainerContents) console.log(n.ActualItemName, n.ContainerContents.map(o=>o.ActualItemName+' x'+o.AmountMin));
  Object.values(n).forEach(w); })(j)"
```

혼돈의 돌 상자 ItemID 는 단계 순서대로 `65800420`(Base) ~ `65800430`(Max) 이고, 확인 결과는 아래와 같다
(무기·방어구를 **같은 개수로 둘 다** 준다 — `calcBoxRewardGold` 가 무기가 + 방어구가를 더하는 근거).

| 단계 | Base | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Max |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 혼돈의 돌(무기=방어구) | 7 | 10 | 15 | 20 | 27 | 36 | 54 | 72 | 100 | 144 | 250 |

나락은 이 선택 상자가 5개씩 나오므로 5배(35 ~ 1,250). 사이트 표와 전부 일치한다.

### 4-3. 북미 파일은 수치 출처가 아니다

위 4-2 는 **중첩 상자 안의 개수 하나를 꺼내오는 용도로만** 북미 파일을 쓴다. 표에 들어가는 수치는
언제나 한섭 `kr_` 파일이 기준이다. 두 지역은 실제로 구성이 다르다 (예: 북미 1750 지옥에는 돌파석·
어빌리티스톤 상자가 없고, 팔찌는 아이템 자체가 다르며 개수도 다르다). 북미 수치를 표에 넣지 말 것.

## 5. 낙원 시즌4 나오면 하는 일

한섭 시즌4가 열리면 **같은 `kr_TrinityInfernoRewards.json` 에 시즌4 카테고리가 새로 붙는다**
(`Season: ["Season 4"]`). 그 번호를 찾아 아래 순서대로 읽고 표를 갈아끼운다.

1. raw JSON 을 받아 **먼저 아카이브**한다 (시즌3처럼 나중에 지워진다).
   ```
   curl -sL -o kr_TrinityInfernoRewards.json \
     https://raw.githubusercontent.com/sekwahar/loa_datamining/main/data/kr_TrinityInfernoRewards.json
   ```
2. 카테고리 목록을 찍어 **새 번호를 확인**한다. 시즌마다 번호가 새로 붙는다(시즌3 1750 = 1026/1027).
   ```
   node -e "require('./kr_TrinityInfernoRewards.json').forEach(c=>console.log(c.Category,c.Season,c.Mode,c.CategoryName))"
   ```
3. **표를 통째로 뽑는다.** 이게 본 작업이다.
   ```
   node scripts/hell-reward/build-table.js kr_TrinityInfernoRewards.json <지옥cat> <나락cat>
   ```
   `lib/hell-reward-calc.ts` 에 그대로 붙여넣을 수 있는 TS 리터럴 두 벌이 나온다.
   상자를 MainDropId 번호가 아니라 **한글 아이템명 패턴**으로 찾기 때문에 번호가 재배치돼도 돌아간다.
   - 새 보상이 생겼으면 `// !! 행 매칭 안 된 상자` 로 끝에 찍힌다 → 그 행을 추가해야 한다는 뜻
   - 없어진 보상은 해당 행이 출력에서 빠진다
4. **혼돈의 돌 개수만 따로 확인한다** (한섭 파일에 없는 유일한 값 — 4-2 참고).
   확인한 값을 `--chaos 7,10,15,...` 로 넘겨 3번을 다시 돌린다. 안 넘기면 시즌3 값이 들어가고 경고가 뜬다.
5. 붙여넣은 뒤 대조로 검산한다.
   ```
   node scripts/hell-reward/verify-1750.js kr_TrinityInfernoRewards.json   # 카테고리 번호는 스크립트 상단에서 수정
   ```
6. 새 시즌 1750 구간을 `docs/hell-reward/` 에 다시 잘라 저장하고 이 문서의 번호표를 갱신한다.

행이 추가/삭제되면 `lib/hell-reward-calc.ts` 의 `calcBoxRewardGold`(가치 환산 분기)와
`components/hell-reward/HellRewardCalculator.tsx` 의 `REWARD_IMAGES` · `DISPLAY_NAMES` 도 같이 손봐야 한다.

> 검산: 시즌3 아카이브로 `build-table.js` 를 돌리면 지금 사이트 표(지옥 11행·나락 9행)가 **한 글자도 안 틀리고**
> 그대로 재생성된다. 2026-07-30 확인.
