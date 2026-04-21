# 홍염의 군주 · 칭호 통계 페이지 (`/title-stats`)

> 다음 작업 시작 전에 이 문서를 읽고 현재 상태/의사결정 맥락을 파악할 것.
> 마지막 업데이트: 2026-04-21 (홍염의 군주 레이드 오픈 전일).

---

## 0. 한 줄 요약

로스트아크 "홍염의 군주 / 혹한의 군주" 칭호 전투력 집계 + 80명 명예의 전당. 80명은 **8인 공대 단위 원자적 등록**으로 채우고, 다 차면 **개인 등록**으로 자동 전환.

---

## 1. 관련 파일 (전부 이 경로들이 진실)

### 프론트
| 경로 | 역할 |
|---|---|
| `app/title-stats/page.tsx` | 페이지 본체 (히어로·탭·HOF·차트·통계·등록) |
| `app/title-stats/title-stats.module.css` | 페이지 전용 스타일 |
| `components/EvilEye.tsx` | 상단 화염 눈동자 (WebGL, `ogl` 의존) |
| `components/Navbar.tsx` | `NAV_STANDALONE` 안에 `{ href: '/title-stats', label: '홍염의 군주', badge: 'NEW' }` |
| `components/ads/AdLayout.tsx` | `/title-stats` 는 `hideSidebar` 목록에 포함되어 양옆 광고 제거 |
| `app/sitemap.ts` | `/title-stats` 엔트리 포함 |

### 서비스 / API
| 경로 | 역할 |
|---|---|
| `lib/extreme-service.ts` | Supabase RPC 래퍼 + 읽기 쿼리 + 에러 한국어 매핑 + 캐시 |
| `app/api/lostark/route.ts` | 로아 API 프록시 (`profile` + `siblings` + `equipment` 동시 fetch). 이미 존재. |

### DB (Supabase)
| 경로 | 역할 |
|---|---|
| `docs/supabase-extreme-v2.sql` | **유일한 진실**. 테이블 5 + RPC 3 + 통계 함수 + RLS + GRANT 전부 포함. 실행 시 기존 extreme_* 전부 DROP 후 재생성. |

### 메모리
| 이름 | 내용 |
|---|---|
| `feedback_raid_title_logo_pair.md` | 레이드 칭호 이름 쓸 때 로고와 붙여 한 덩어리로. 절대 분리 금지. |

---

## 2. 페이지 구조 (위→아래)

```
┌──────────────────────────────────────┐
│  EvilEye 히어로 (풀폭, 320~480px)    │  ← 검은 배경 + 화염 눈동자 + 하단에 "홍염의 군주"
├──────────────────────────────────────┤
│  중앙 컴팩트 탭 pill                  │  ← [홍염의 군주] [혹한의 군주]  (줄 안 채움)
├──────────────────────────────────────┤
│  명예의 전당                          │  ← 공대 페이지네이션 ◀ PARTY N ▶
│    ┌─ 공대명 배너 ─┐                 │
│    │ 8장 캐릭터 카드 (2×4 or 4×2)    │
├──────────────────────────────────────┤
│  [하단 섹션 - 1280px 중앙정렬]       │
│   차트 · 요약 리본 · 직업별 통계      │
│   등록 섹션 (공대 or 개인 조건부)     │
└──────────────────────────────────────┘
```

### HOF 카드 내용 순서 (사용자 명시)
이미지 → 칭호 뱃지(로고+이름) → 닉네임(세리프체) → 전투력 + `Lv.아이템레벨`

### 1공대 특별 취급
`.partyRowGold` 적용. 리본 `FIRST PARTY · 선봉` (금빛 그라데이션). 2공대부터는 오렌지 톤 + `PARTY N` 키커.

---

## 3. 2단계 등록 로직 (핵심)

```
mode = hof.length >= 80 ? 'individual' : 'party'
```

`hof` 는 `party_id IS NOT NULL` 필터링된 쿼리 결과. 즉 **공대 등록된 멤버만 카운트**.
10공대 × 8명 = 80 채워지는 순간 자동으로 개인 모드로 전환.

### 공대 모드 (0~79명)
- 공대 이름 입력 + 8슬롯 전부 검색 → 전원 칭호 확인됨 → `공대 등록하기` 활성화
- 내부적으로 `registerExtremeParty` RPC 한 방 (원자적 1 공대 + 8 멤버 INSERT)
- 성공 시 폼 리셋 + `loadAll()` 로 HOF/차트/통계 전부 재조회

### 개인 모드 (80명 완성 후)
- 단일 검색 → `registerExtremeIndividual` RPC
- **이미지 저장 안 함** (파라미터 자체에 없음)
- 서버에서 파티수 < 10 이면 `EXT_PARTY_PHASE_ONLY` 로 거절

---

## 4. DB 설계 (v2)

### 테이블 다섯

| 테이블 | PK / UNIQUE | 용도 |
|---|---|---|
| `extreme_parties` | `id UUID`, `UNIQUE(title, party_name)` | 1~10공대 레코드 |
| `extreme_clears` | `id BIGINT`, `UNIQUE(character_name, title)` | 모든 등록 멤버 (공대+개인). `party_id` NULL 이면 개인. |
| `extreme_roster_locks` | `PK(title, character_name)` | **원정대 잠금** — 공대/개인 등록 시 siblings 전체 닉네임 삽입 |
| `extreme_daily_stats` | `PK(title, clear_date, role)` | 일별 집계 캐시 |
| `extreme_class_stats` | `PK(title, character_class, role)` | 직업별 집계 캐시. **v1 버그 수정: role PK 포함** (기존은 발키리 딜/서폿 충돌) |

### RPC 셋

- **`register_extreme_party(title, party_name, members JSONB)` → UUID**
  - `pg_advisory_xact_lock(hashtext('extreme_parties:' || title))` 로 같은 칭호의 공대 등록을 직렬화
  - 10공대 초과 거절
  - 8멤버 각자 `extreme_clears` INSERT + `extreme_roster_locks` 일괄 INSERT + 통계 증분
  - 중간 어디서든 실패하면 전체 롤백
  - 멤버 JSONB 스키마:
    ```json
    {
      "character_name": "...",
      "character_class": "...",
      "role": "dealer|supporter",
      "item_level": 1770.00,
      "combat_power": 1800,
      "character_image": "https://...",
      "sibling_names": ["본캐", "부캐1", "부캐2", ...]
    }
    ```

- **`register_extreme_individual(name, class, role, level, power, title, sibling_names[])` → BIGINT**
  - 10공대 완성 안 됐으면 거절
  - 이미지 저장 X, `party_id = NULL`
  - roster_locks + 통계 증분은 동일

- **`rebuild_extreme_stats()` → (daily_rows, class_rows)**
  - 비상용 전체 재집계. 일반 상황에선 쓸 일 없음.

### 증분 통계

`_increment_extreme_stats()` 헬퍼를 RPC 안에서 매건 호출:
```sql
INSERT ... ON CONFLICT (title, date, role) DO UPDATE
SET clear_count = d.clear_count + 1,
    avg_power   = ROUND((d.avg_power * d.clear_count + new_power) / (d.clear_count + 1)),
    avg_level   = ROUND((d.avg_level * d.clear_count + new_level) / (d.clear_count + 1), 2);
```
누적 평균 공식. O(1), 즉시 반영. 수동 rebuild 불필요.

### RLS

- 모든 테이블 SELECT 는 anon 허용.
- INSERT/UPDATE/DELETE 정책 **없음** → 클라이언트 직접 수정 불가.
- RPC 세 개 모두 `SECURITY DEFINER` → RLS 우회, 함수 소유자 권한으로 실행.
- `GRANT EXECUTE ON FUNCTION ... TO anon, authenticated;`

---

## 5. 중복 방어 4중

| 층 | 수단 | 막는 케이스 |
|---|---|---|
| 1 | `extreme_parties.UNIQUE(title, party_name)` | 동명 공대 |
| 2 | `extreme_clears.UNIQUE(character_name, title)` | 같은 캐릭터 재등록 |
| 3 | `extreme_roster_locks.PK(title, character_name)` | **같은 원정대 내 alt 로 재등록** (본캐 등록 후 부캐로 또) |
| 4 | 클라이언트 슬롯간 siblings 겹침 체크 | 같은 공대 폼 안에 본캐/부캐 동시 입력 (UX) |

### 원정대 잠금 예시 (사용자가 설명한 상황)
1. 유저 A가 `Alpha` 로 홍염 공대 등록
2. `extreme_clears` 에 Alpha 한 줄
3. `extreme_roster_locks` 에 Alpha, Beta, Gamma, Delta ... 전원 (사이즈 = 원정대 크기)
4. 유저 A가 `Beta` 로 칭호 갈아끼고 다른 공대/개인 등록 시도
5. roster_locks 에 `(홍염, Beta)` INSERT → 이미 존재 → 23505 → **전체 트랜잭션 롤백**
6. 프론트에 "해당 원정대의 캐릭터가 이미 등록되어 있습니다" 표시

---

## 6. 동시성

- **공대 등록 레이스**: 두 공대가 동시에 1등/2등 노릴 때. advisory lock 으로 serialize → 먼저 tx 획득한 쪽이 1등, 다음이 2등.
- **다른 칭호간 병렬**: 홍염/혹한은 각각 다른 해시키로 락 → 동시 진행 OK.
- **순서 기준**: `extreme_parties.created_at` 오름차순. Postgres `NOW()` 마이크로초 단위라 실질적 동률 없음.

---

## 7. 캐시 전략

| 데이터 | 캐시 |
|---|---|
| HOF | **없음** (항상 fresh, 80행짜리 작은 JOIN) |
| 차트 (daily_stats) | 3분 TTL `Map` |
| 요약 (class_stats 합산) | 3분 TTL `Map` |
| 직업별 통계 (class_stats) | 3분 TTL `Map` |

쓰기 RPC 성공 시 `invalidateCache(title)` 호출 → 같은 브라우저/서버 인스턴스의 캐시 즉시 무효화.
다른 사용자 화면은 최대 3분 스태일 (요구사항 허용 범위).

---

## 8. 이미지 정책

- 공대 등록 시 본인 `CharacterImage` URL 을 `extreme_clears.character_image` 에 저장 → HOF 80장 카드 렌더용
- 공대 멤버의 **siblings 는 닉네임만** 락에 저장, 이미지 미저장
- 개인 등록(80명 이후)은 이미지 저장 안 함 — 통계 반영만
- Next.js `<Image unoptimized>` 로 로아 CDN URL 직접 렌더 (저작권/스토리지 회피)
- 이미지 없음 케이스: `<div className={styles.fameImagePlaceholder}>` 에 직업명만 표시

---

## 9. EvilEye

- `ogl` 패키지 의존 (`package.json` 에 이미 포함)
- `app/title-stats/page.tsx` 에서 `dynamic(() => import('@/components/EvilEye'), { ssr: false })` 로 로드 (WebGL이라 SSR 불가)
- `prefers-reduced-motion: reduce` 감지 시 렌더 스킵
- 탭별 색:
  - 홍염: `eyeColor="#FF6F37"`, `flameSpeed=1.0`
  - 혹한: `eyeColor="#4AA8D8"`, `flameSpeed=0.6`
- 마우스 따라 동공 이동 (`pupilFollow`)
- 클린업: unmount 시 rAF 취소 + canvas 제거 + `WEBGL_lose_context` 호출

---

## 10. 디자인 토큰

### 색
- 홍염 메인: `#c16420`, 그라데이션 `#f0a060 → #a84d1a → #6e3308`
- 혹한 메인: `#3a73a6` (살짝 차가운 블루)
- 딜러 `#dc3545` / 서포터 `#3b82f6`
- 메달: 금 `#f4c040~#c28a10` / 은 `#d0d5dc~#8a9099` / 동 `#e08050~#8f4018`

### 글꼴
- 일반: Noto Sans KR (레이아웃 기본)
- 강조 (히어로 타이틀, HOF 공대명, HOF 헤더, HOF 카드 닉네임): Noto Serif KR

### 공통 패턴
- 히어로만 다크 (검은 배경 + 오렌지 글로우) — 페이지 본문과 단절시켜 드라마틱
- 본문 카드 `.cardBlock`: `var(--card-bg)` + 좌측 3px 세로 오렌지 포인트 바 + 오렌지 오프셋 그림자
- 인라인 레이드 태그 `.raidTag`: 로고 + 이름 한 덩어리 (`feedback_raid_title_logo_pair.md` 원칙). 부주의로 분리 시 사용자 분노함. 주의.

---

## 11. 주요 의사결정 · 왜 이렇게 했나

| 결정 | 이유 |
|---|---|
| HOF 80명 = 공대 단위 | 유저 요구. 레이드는 8인팟 단위로 도전하므로 자연스러운 집계 단위 |
| 공대 모드 우선, 개인 모드 후행 | HOF 시상대 의미 보존 (랜덤 개인이 먼저 자리 꿰차는 거 방지) |
| 원자적 RPC | 두 공대 1등 레이스에서 중간 실패로 유령 공대 생성 방지 |
| advisory lock | 전체 테이블 락 없이 같은 칭호 내에서만 직렬화 → 혹한/홍염 병렬 허용 |
| roster_locks PK 구조 | 유저가 본캐/부캐 스왑해서 재등록 시도 차단. siblings 를 미리 다 잠궈버림 |
| 증분 통계 | 수동 rebuild 불필요, 실시간 반영 |
| HOF 캐시 X | 80행 쿼리 가벼움 + HOF 가득 차는 과정은 실시간성 중요 |
| EvilEye | 기존 다른 페이지와 시각적 차별화. 드라마틱 히어로. 모바일 배터리 주의. |
| 이미지 스토리지 X, URL 만 저장 | 저작권/용량/stale 모두 회피. 로아 CDN이 실제로 호스팅 |
| 81번째부터 이미지 미저장 | HOF 바깥은 시상대 노출 안 되니까 이미지 불필요. 저장 비용 최소화. |

---

## 12. 확장 포인트 / 다음 할 일

### 사용자 즉시 해야 할 것
- [ ] `docs/supabase-extreme-v2.sql` 를 Supabase SQL Editor 에서 실행. **이거 안 하면 아무것도 안 됨.**
- [ ] 환경변수 확인: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `LOSTARK_API_KEY`
- [ ] 혹한 오픈 일정 정해지면 `app/title-stats/page.tsx` 의 `RAIDS.ice.openAt` 실제 값으로 업데이트

### 앞으로 논의/추가할 수 있는 것들
- Supabase Realtime 구독으로 다른 사용자 화면 즉시 반영 (현재 최대 3분 스태일)
- 80석 가득 찼을 때 "명예의 전당 완성" 이벤트 배너
- 공대 등록 후 공유 링크 / OG 이미지 생성
- 개인 등록 단계에서 "내 공대 찾기" 식의 개인 화면
- 등록 후 수정/삭제 기능 (현재 불가. 관리자 개입만 가능)
- 공대 멤버 역할별 시각화 (딜 6 + 서폿 2 유효 조합 체크)

### 기존 구조 제약 (알고 있어야 할 것)
- 로아 API siblings 는 같은 서버 원정대만 반환 → 크로스서버 alt 는 방어 안 됨 (현실적으로 무시 가능)
- RPC 에러 메시지는 Postgres 원문 → `translateRpcError()` 에서 한국어 매핑. 새 에러 추가 시 여기 분기 추가.
- 한 번 등록되면 UI로 수정/삭제 불가. RLS가 UPDATE/DELETE 차단. 관리자가 Supabase 콘솔에서 직접 손대야 함.

---

## 13. 반복 교정 받은 코딩 원칙 (메모리에 저장됨)

- **레이드 칭호 이름**: 화면 어디든 `"홍염의 군주"` 텍스트 쓸 때 **반드시** 로고 이미지와 붙여서 한 덩어리. `RaidTag` 컴포넌트 or `.raidTag` 패턴 사용. 분리 배치 X.
- **사용자가 "X 수정해" 요청**: X만 수정. 주변부 구조/베이스/장판/필드 자의 추가 X.
- **추측 코딩 금지**: 모르면 Read/Grep 으로 확인 먼저. 토큰 낭비 = 돈.

---

## 14. 트러블슈팅 체크리스트

| 증상 | 원인 후보 |
|---|---|
| 등록 시 "이미 등록된 공대 이름" | `uq_parties_title_name` — 공대명 중복 |
| 등록 시 "이미 등록된 캐릭터" | `uq_clears_char_title` — 그 캐릭터 이미 있음 |
| 등록 시 "원정대의 캐릭터가 이미 등록" | `extreme_roster_locks` PK 충돌 — 본캐/부캐 어느 하나가 이미 잠김 |
| 등록 시 "명예의 전당 가득 찼습니다" | `EXT_HOF_FULL` — 이미 10공대 |
| 개인 등록 안 됨 | `EXT_PARTY_PHASE_ONLY` — 아직 80명 안 찼음 |
| HOF 비어있음 | 공대 하나도 등록 안 됐거나, 칭호별 탭 잘못 선택 |
| 차트/통계 스태일 | 3분 TTL 캐시 — 쓰기 후에만 즉시 무효화됨 |
| RPC 호출 자체가 안 됨 | `GRANT EXECUTE` 누락 or RLS 정책 미적용 → `docs/supabase-extreme-v2.sql` 재실행 |
| 이미지 안 보임 | `CharacterImage` 가 null / `<Image unoptimized>` 누락 / 로아 CDN URL 만료 |
| EvilEye 안 보임 | SSR로 렌더됨(dynamic 실패) or `prefers-reduced-motion: reduce` 설정됨 or WebGL 미지원 브라우저 |
