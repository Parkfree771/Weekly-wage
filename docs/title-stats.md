# 홍염의 군주 · 칭호 통계 페이지 (`/title-stats`)

> 마지막 업데이트: 2026-04-21 (홍염의 군주 레이드 오픈 전야, 페이지 사전 공개 완료)
> 문제 생기면 이 문서부터 읽을 것.

---

## 0. 한 줄 요약

로스트아크 "홍염의 군주 / 혹한의 군주" 칭호 전투력 집계 + 10공대 80명 명예의 전당.
80명은 **8인 공대 단위 원자적 등록**으로 채우고, 다 차면 **개인 등록**으로 자동 전환.

---

## 1. 핵심 파일 (여기가 진실)

### 프론트
| 경로 | 역할 |
|---|---|
| `app/title-stats/page.tsx` | 페이지 본체 — 히어로·HOF·차트·통계·등록 (탭은 제거됨, 홍염 단일) |
| `app/title-stats/layout.tsx` | 메타데이터(SEO) + JSON-LD 구조화 데이터 |
| `app/title-stats/title-stats.module.css` | 페이지 전용 스타일 |
| `components/EvilEye.tsx` | 상단 WebGL 눈동자 (`ogl` 의존). 마우스 추적 lerp 0.18, shader offset 0.22 |
| `components/Navbar.tsx` | `{ href: '/title-stats', label: '홍염의 군주', badge: 'NEW' }` |
| `components/ads/AdLayout.tsx` | 사이드바 완전 제거, maxWidth만 담당 |
| `app/sitemap.ts` | `/title-stats` 포함 |

### 서비스 / API
| 경로 | 역할 |
|---|---|
| `lib/extreme-service.ts` | Supabase RPC 래퍼 + 읽기 쿼리 + 에러 한국어 매핑 + **phase-aware 캐시** |
| `app/api/lostark/route.ts` | 로아 API 프록시 (`profile + siblings + equipment` 동시 fetch) |

### DB
| 경로 | 역할 |
|---|---|
| `docs/supabase-extreme-v2.sql` | **유일한 스키마 진실**. 테이블 5 + RPC 3 + 통계 헬퍼 + RLS + GRANT |

### 홍보 요소 (현재 전부 비활성)
- `components/UpdatePopup.tsx` — 홈 진입 팝업. 2026-04-21 제거됨. 파일은 보존
- `components/ads/AdSidebar.tsx` — 데스크톱 좌우 사이드바. 제거됨. 파일 보존
- `components/ads/ExtremePromoBanner.tsx` — 모바일 상단 배너. 8개 페이지에서 제거. 파일 보존

### 메타데이터 분리
- `/title-stats` — 칭호 전투력 통계 + 명예의 전당 중심
- `/extreme` — 보상 정리 중심 (칭호 통계 언급 제거)

---

## 2. 페이지 구조 (위→아래)

```
[stageSection — 풀와이드 다크 플랫폼, 한몸]
  ├─ eyeHero (WebGL 눈동자, 클램프 320~480px 높이)
  └─ hofSection
     ├─ hofHeader (Hall of Flame · 명예의 전당 · 서브)
     ├─ hofNav (◀ 공대 페이지네이션 ▶ + 10개 도트)
     └─ partyRow (공대명 배너 + 8장 카드)

[container — max-width 1600]
  └─ lowerSections
     ├─ registrationSection (공대 또는 개인)
     ├─ chart (칭호 전투력 추이)
     ├─ summaryRibbon (총 등록/딜평균/서폿평균)
     └─ classStats (직업별 통계, 1열 세로)
```

### 카드 정보 오버레이 (3줄 + 모바일 2줄)
- 1줄: 🔥 홍염의 군주 · 직업 (모바일 숨김)
- 2줄: 닉네임(세리프) — 길면 ...으로 truncate
- 3줄: Lv.아이템레벨
- 4줄: 전투력: 12,345 (주황)

### 공대명 배너 (순수 타이포그래피)
- 거대 세리프 공대명 (clamp 2.4~4.4rem)
- 적동색 크림 (#f4dcb8) + 하드 드롭 섀도우 + 화염 후광
- 1공대는 #ffe4be + 더 진한 화염 글로우

---

## 3. 등록 2단계 로직

```
mode = hof.length >= 80 ? 'individual' : 'party'
```

`hof` = `party_id IS NOT NULL` 필터링 결과 (공대 등록 멤버 수).
10공대 × 8 = 80 채워지는 순간 자동 전환.

### 공대 모드
- 공대 이름 입력 + 8슬롯 검색 → 전원 칭호 확인됨 → 등록 버튼 활성화
- 단일 RPC `registerExtremeParty` (1 공대 + 8 멤버 원자적 INSERT)
- 성공 시 폼 리셋 + `loadAll()` 재조회

### 개인 모드 (80명 완성 후)
- 단일 검색 → `registerExtremeIndividual` RPC
- **이미지 저장 X** (파라미터 없음, HOF 바깥은 불필요)
- 서버에서 `공대수 < 10` 이면 `EXT_PARTY_PHASE_ONLY` 거절

---

## 4. DB 설계 (v2 + 2026-04-21 마이그레이션)

### 테이블 다섯
| 테이블 | PK / UNIQUE | 용도 |
|---|---|---|
| `extreme_parties` | `id UUID`, `UNIQUE(title, party_name)` | 1~10공대 |
| `extreme_clears` | `id BIGINT`, `UNIQUE(character_name, title)` | 모든 등록 (공대+개인) |
| `extreme_roster_locks` | `PK(title, character_name)` | **원정대 잠금** — 본캐/부캐 전부 lock |
| `extreme_daily_stats` | `PK(title, clear_date, role)` | 일별 집계 캐시 |
| `extreme_class_stats` | `PK(title, character_class, role)` | 직업별 집계 캐시 |

### RPC 셋
- `register_extreme_party(title, party_name, members JSONB) → UUID`
  - advisory lock (동일 칭호 직렬화)
  - 10공대 초과 / 멤버수 != 8 / 빈 공대명 거절
  - `v_today := kst_today()` 로 모든 시간값 KST
- `register_extreme_individual(name, class, role, lvl, pw, title, siblings[]) → BIGINT`
  - 10공대 완성 전 거절 (`EXT_PARTY_PHASE_ONLY`)
  - `party_id = NULL`, 이미지 저장 안 함
- `rebuild_extreme_stats() → (daily_rows, class_rows)`
  - 수동 삭제 후 집계 재계산용

### 헬퍼
- `kst_today() → DATE` — `(NOW() AT TIME ZONE 'Asia/Seoul')::DATE`. 모든 시간 표기 KST 기준. 자정 전환이 한국 시각에 정확

### 증분 집계
`_increment_extreme_stats()` UPSERT — 등록 시마다 O(1) 누적 평균 계산. 별도 rebuild 불필요.

### RLS
- SELECT: anon 허용
- INSERT/UPDATE/DELETE 정책 없음 → 클라이언트 직접 수정 불가
- RPC 3개 `SECURITY DEFINER` + `GRANT EXECUTE TO anon, authenticated`

---

## 5. 중복 방어 4중 + α

| 층 | 수단 | 대상 |
|---|---|---|
| 1 | 프론트 슬롯간 `siblingNames` 겹침 | 같은 폼 8칸 안에 본캐+부캐 |
| 2 | 프론트 `rosterLocks.has(n)` | **이미 등록된 원정대** (검색 시점 차단) |
| 3 | `extreme_parties UNIQUE(title, party_name)` | 공대명 중복 |
| 4 | `extreme_clears UNIQUE(character_name, title)` | 같은 캐릭 재등록 |
| 5 | `extreme_roster_locks PK(title, character_name)` | 본캐/부캐 스왑 (최후 방어) |
| 6 | advisory lock | 두 공대 1등 경쟁 |

에러 메시지: 공대명 표시 (`"불사조" 공대에 등록된 원정대입니다`) 또는 개인 등록이면 `"개인 등록에 등록된 원정대입니다"`.

---

## 6. Phase-aware 캐시

### 임계값
```ts
HOF_FULL_THRESHOLD = 80
isIndividualPhase = _lastHofCount >= 80
```

### TTL 매트릭스
| 데이터 | 공대 페이즈 (<80) | 개인 페이즈 (≥80) |
|---|---|---|
| HOF | 캐시 X (실시간) | 15분 |
| rosterLocks | 캐시 X | 10분 |
| 차트 | 1분 | 15분 |
| 요약 | 1분 | 15분 |
| 직업별 통계 | 1분 | 15분 |

### invalidateCache
등록 성공 시 호출 → 본인 브라우저 전부 즉시 비움 → `loadAll()` 재호출로 fresh 반영.

### 중복 방지 유지
- 공대 페이즈는 locks 실시간 → UX 완벽
- 개인 페이즈는 최대 10분 스테일 가능하지만 **RPC PK 충돌로 서버 최종 방어** → 중복 등록 물리적으로 불가능

---

## 7. 이미지 정책

- 공대 등록 멤버: `CharacterImage` URL 로아 CDN 직접 참조 (`<Image unoptimized referrerPolicy="no-referrer">`)
- siblings는 닉네임만 lock, 이미지 미저장
- 개인 등록(80 이후): 이미지 저장 X
- 이미지 NULL이면 `fameImagePlaceholder` 에 직업명 표시

---

## 8. EvilEye (WebGL)

- `ogl` 패키지 의존
- `dynamic({ ssr: false })` 로 클라이언트 전용 로드
- `prefers-reduced-motion: reduce` 감지 시 렌더 스킵
- 현재 세팅 (홍염):
  - `eyeColor="#FF6F37"`, `flameSpeed=1.0`
  - 마우스 lerp 0.18 (shader 내부 offset 0.22)
  - 클린업: rAF cancel + canvas 제거 + `WEBGL_lose_context`

---

## 9. 디자인 토큰

### 색
- 홍염 주조: `#c16420`, 텍스트 `#ffe4be`
- 혹한 주조: `#3a73a6`
- 딜러 `#dc3545` / 서포터 `#3b82f6`
- 공대명 적동 크림: `#f4dcb8`, 1공대 `#ffe4be`

### 글꼴
- 본문: Noto Sans KR
- 강조(히어로/공대명/닉네임/hof제목): Noto Serif KR

### 공통 패턴
- 히어로와 HOF 한몸 (다크 플랫폼이 이어짐)
- 카드는 포스터형 (aspect 3/5), 이미지가 카드 배경 전체, 정보는 하단 오버레이
- `transition`/`transform`/hover translateY 전부 제거 (사용자 피드백 원칙)

---

## 10. 검증 완료된 것 (오픈 전 QA)

- [x] 80명 자동 개인 모드 전환
- [x] 공대 삭제 시 공대 모드 복귀
- [x] 개인 등록 서버 게이트 `EXT_PARTY_PHASE_ONLY`
- [x] 공대명 중복 `uq_parties_title_name`
- [x] 캐릭 재등록 `uq_clears_char_title`
- [x] 8명 고정 `EXT_MUST_BE_8`
- [x] 빈 공대명 `EXT_EMPTY_PARTY_NAME`
- [x] 통계 정확도 (실 카운트 = 집계 캐시)
- [x] KST 타임존 적용 (kst_today)
- [x] Phase-aware 캐시 동작
- [x] 원정대 잠금 프론트 검색 시점 차단 + 공대명 표시
- [x] 카드 이미지 no-referrer (로아 CDN hotlink 우회)

---

## 11. 홍보 설정

### Navbar
`{ href: '/title-stats', label: '홍염의 군주', badge: 'NEW' }` — NEW 뱃지 포함

### 사이트맵
`app/sitemap.ts` 에 `/title-stats` 포함 → Google 크롤링 대상

### 커뮤니티 노출
- 모바일 배너/사이드바/팝업 전부 제거 상태 (사용자 요청)
- 외부 커뮤니티(인벤/아카라이브/디시) 게시물로 홍보
- 추천 제목: "홍염 퍼클런 10공대 명예의 전당"

---

## 12. 운영 시 주의사항

### 관리자가 Supabase 콘솔에서 공대 삭제 시
1. CASCADE로 clears/roster_locks 자동 삭제 O
2. **통계 캐시(daily_stats, class_stats)는 그대로 남음** — 증분 함수가 INSERT 시점만 +1, 삭제 시 -1 안 함
3. 반드시 `SELECT rebuild_extreme_stats();` 실행해서 재집계 필요

### 테스트 데이터 초기화
```sql
TRUNCATE extreme_roster_locks, extreme_clears, extreme_parties,
         extreme_daily_stats, extreme_class_stats CASCADE;
```

### RLS 확인
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'extreme_%';
-- 5개 전부 true 이어야 함
```

### Netlify 환경변수 필수
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LOSTARK_API_KEY`

---

## 13. 트러블슈팅

| 증상 | 원인 후보 |
|---|---|
| 공대 이미지 안 뜸 | 로아 CDN hotlink 차단 → `referrerPolicy="no-referrer"` 누락 or URL에 공백 섞임 |
| 등록 성공해도 화면에 반영 안 됨 | `invalidateCache` 호출 X 또는 `loadAll` 트리거 실패 |
| "이미 등록된 공대 이름" | 같은 칭호에 동일 `party_name` 존재 |
| "해당 원정대의 캐릭터가 이미 등록" | `extreme_roster_locks` PK 충돌 — 본캐/부캐 어느 하나가 lock |
| "공대는 반드시 8명이어야" | `EXT_MUST_BE_8` — 8개 슬롯 미충족 |
| "아직 공대 등록 단계" | `EXT_PARTY_PHASE_ONLY` — 공대 10개 미만인데 개인 RPC 호출 |
| 통계 값 불일치 (실카운트 ≠ 캐시) | 관리자 수동 DELETE 후 rebuild 누락 → `SELECT rebuild_extreme_stats();` |
| 날짜가 밀려서 집계됨 | `kst_today()` 적용 안 됐을 때. RPC 재정의 확인 |
| EvilEye 안 보임 | SSR 실패 or `prefers-reduced-motion` 설정 or WebGL 미지원 |
| 히어로 클릭 시 반응 없음 | 마우스 추적은 렌더링만, 클릭 이벤트 없음. 정상 |

---

## 14. 반복된 코딩 원칙 (메모리)

- 레이드 칭호 이름은 **반드시 로고와 붙여서 한 덩어리** (`RaidTag` 컴포넌트)
- `transition` / `transform` / hover 레이아웃 변경 **금지**
- globals.css 에 페이지 전용 스타일 금지, module.css 로만
- 사용자가 "X 수정해" 하면 X만 수정, 주변 임의 개선 X

---

## 15. 오늘(2026-04-21) 한 일 요약

### 시상대 리디자인
- 메달리온/엠블럼/장식선 전부 제거, 순수 타이포그래피로 회귀
- 공대명 배너: 거대 세리프 + 적동 크림 + 하드 드롭 섀도우
- 카드 오버레이 4줄 구조 (칭호+직업 / 닉네임 / Lv. / 전투력:)
- 모바일에서 칭호바 숨김 + 닉네임 ... truncate
- 순위 숫자·역할 도트 전부 제거 (사용자 요청)

### 페이지 전체 구조 재편
- 히어로 + HOF를 하나의 풀와이드 다크 섹션(`stageSection`)으로 통합
- 탭바 제거 (홍염 단일)
- 공대 등록 섹션을 시상대 바로 아래로 이동
- 10공대 전부 네비게이션 (공석 카드로 렌더)
- 개인 등록 섹션 중앙 정렬 + 컴팩트 프로필 카드

### DB/로직
- KST 타임존 마이그레이션 (`kst_today()` 헬퍼 + RPC 재정의)
- Phase-aware 캐시 (공대<80 실시간, 개인≥80 10~15분)
- `getRosterLocks()` 신규 — 검색 시점 중복 차단 + 공대명 표시

### 검증
- 5+ 서버 제약 전부 실제 RPC 호출로 검증 완료
- 통계 정확도 확인 (rebuild_extreme_stats)
- Netlify egress 예상치 산출

### 홍보/UX
- 팝업·사이드바·모바일 배너 전부 제거 (사용자 요청)
- SEO 메타데이터 /extreme 과 /title-stats 로 분리
- EvilEye 마우스 추적 반응성 향상 (lerp 0.05→0.18, shader offset 0.12→0.22)

### 배포
- `feature/title-stats` 브랜치 → main 머지 → Netlify 자동 배포
- 커밋: `0d8b05b`, `9d7ad1d`, `c75b84f`, `62d68c2`, `de2edcc`

---

## 16. 내일(2026-04-22) 오전 10시 오픈 후 체크

1. 10시 정각 이후 첫 등록자 나타나는지 모니터링
2. 로아 API 호출 레이트(5회/초) 초과 여부 확인
3. Supabase 대시보드에서 egress·RPC 사용량 추이
4. 1공대 완성되는 순간 UI 반영 즉시성 확인
5. 첫 등록 후 `extreme_parties`, `extreme_clears`, `extreme_roster_locks`, `extreme_daily_stats`, `extreme_class_stats` 모두 정상 증가했는지 SQL 한 번 돌려보기
