# 아바타 콘테스트 페이지 — 핸드오프 문서

> **작성일**: 2026-05-07  
> **브랜치**: `feature/avatar-contest`  
> **상태**: 코드 작업 1차 완료, **사용자 콘솔 작업 + 추가 기능 미완**  
> **다음 환경에서 이어 받기 위한 가이드**

---

## 0. 현재 어디까지 와 있나 (TL;DR)

- 콘테스트 페이지 `/contest` UI 100% 구현 완료
- 좋아요 / 조회수는 **Supabase 로 이전 코드 작성 완료** (실제 동작은 콘솔 작업 후)
- 무기 댓글 / 무기 메타 / 이미지 업로드는 Firestore + Firebase Storage 그대로
- 12장 일러스트에 워터마크 + 클릭 시 풀스크린 라이트박스 적용
- 빌드 통과 ✅
- **다른 페이지 영향 0** (콘테스트 외 코드 안 건드림)

**남은 일은 두 종류**:
1. 사용자(콘솔에서 해야 함) — Supabase + Firebase 규칙 적용
2. 추가 개발 (시간 나면) — 아래 [§5 후속 작업] 참고

---

## 1. 완료된 작업 목록

### 1-1. 페이지 구조
- `app/contest/page.tsx` — 메인 페이지 (히어로 + 3섹션 매치업)
- `app/contest/layout.tsx` — 메타데이터 + JSON-LD
- `app/contest/contest.module.css` — 시네마틱 다크 디자인 (오로라/별/보케/노이즈/비네트)
- 풀와이드 레이아웃 (`AdLayout`에서 `/contest`만 max-width 해제)

### 1-2. 컴포넌트
- `HeroSection.tsx` — 미니멀 타이틀 + CTA
- `AuroraBackground.tsx` — 6단 레이어 시네마틱 배경 (fixed 풀스크린)
- `ParticleField.tsx` — 보케 + 별 트윙클 + 슈팅스타 캔버스
- `MatchupRow.tsx` — 매치업 카드 (좌 일러스트 + VS 박스 + 투표 버튼 + 우 일러스트)
- `IllustrationCard.tsx` — 일러스트 카드 (좋아요 + 무기 모달 버튼 + 워터마크 + 라이트박스 트리거)
- `IllustrationLightbox.tsx` — 풀스크린 크게보기 모달 (워터마크 유지)
- `WeaponGalleryModal.tsx` — 무기 갤러리 모달 (마손리 갤러리 + 업로드 폼 + 정렬)
- `WeaponDetailModal.tsx` — 무기 상세 모달 (좌 이미지 + 우 메타·좋아요·댓글)
- `WeaponCommentSection.tsx` — 무기별 댓글 (대댓글 1단계, 300자)

### 1-3. 데이터 / 서비스
- `data/contest-data.ts` — 12장 일러스트 + 6 매치업 메타데이터 (하드코딩, 매치업 확정)
- `types/contest.ts` — `ContestIllustration`, `ContestMatchup`, `ContestWeapon`, `ContestWeaponComment`
- `lib/contest-service.ts` — Firestore 무기 메타·댓글·Storage 업로드만 담당 (좋아요는 제거됨)
- `lib/contest-supabase.ts` — 좋아요/조회수 Supabase 클라이언트 + sessionStorage 캐시
- `hooks/usePageVisibility.ts` — 다른 탭 복귀 감지 → 캐시 강제 갱신

### 1-4. 이미지 / 자산
- `public/contest/matcha1.webp ~ matchc4.webp` — 12장 (모두 WebP, 평균 200~700KB)
- 워터마크 `© SMILEGATE RPG` (CSS 오버레이, 카드 + 라이트박스 양쪽)
- `scripts/convert-contest-to-webp.js` — PNG → WebP 변환 스크립트 (재실행 가능)

### 1-5. 통합
- `components/Navbar.tsx` — "이벤트" 그룹 + 콘테스트 항목 (NEW 배지)
- `app/sitemap.ts` — `/contest` 추가
- `components/ads/AdLayout.tsx` — `/contest`만 풀와이드(`maxWidth: 'none'`)

### 1-6. 문서
- `docs/contest-supabase-setup.md` — Supabase 콘솔 작업 가이드 + SQL 전체
- `docs/contest-firebase-rules.md` — Firestore + Storage 규칙
- `docs/contest-flow-security-audit.md` — 전체 데이터 흐름 + 보안 위협 검토 보고서

---

## 2. 사용자가 콘솔에서 해야 할 일 ⚠ 필수

### 2-1. Supabase 콘솔
> 이 작업이 끝나야 좋아요·조회수가 실제로 동작합니다.

1. **Authentication → Sign In Providers → Third-Party Auth → Add → Firebase**
   - Firebase Project ID 입력 → Save
2. **SQL Editor → New query**
   - `docs/contest-supabase-setup.md` 의 SQL 블록 전체 복붙 → Run
   - 6개 테이블 + 3개 트리거 + RLS 정책 자동 생성
3. **검증**
   - Table Editor 에서 `contest_illust_likes`, `contest_illust_like_counts`, `contest_weapon_likes`, `contest_weapon_like_counts`, `contest_weapon_views`, `contest_weapon_view_counts` 6개 보이는지
   - 각 테이블 우측 RLS enabled 표시 확인

### 2-2. Firebase 콘솔
1. **Firestore → 규칙**
   - `docs/contest-firebase-rules.md` 의 새 규칙으로 교체
   - 좋아요 관련 블록 제거됨, 무기 메타·댓글만 남김
2. **Storage → 규칙**
   - 같은 문서의 Storage 규칙 적용
   - `request.resource.size < 1 * 1024 * 1024` (1MB 한도) 확인

### 2-3. 환경 변수 확인
`.env.local` 에 이미 다 있어야 함:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_FIREBASE_*=...  (기존)
```

추가 변수 필요 없음.

---

## 3. 알려진 동작 / 트레이드오프

| 항목 | 동작 | 비고 |
|---|---|---|
| 좋아요 | 로그인 필수 (Firebase Auth) | RLS 이중 차단 |
| 조회수 | **비로그인도 카운트** (의도) | 1시간 dedup, anon UUID localStorage |
| 무기 업로드 | 로그인 필수, 자동 WebP 변환 | 입력 3MB / 결과 1MB 한도 |
| 무기 댓글 | 로그인 필수, 본인만 수정·삭제 | 300자, 대댓글 1단계 |
| 캐시 | sessionStorage 5분 + visibilitychange 갱신 | 본인 액션은 옵티미스틱 즉시 |

### 잔여 리스크 (수용된 것)
- 비로그인 조회수 어뷰징 가능 (정확도 핵심 아님)
- Firestore `getWeaponCount` 12회 read는 캐시 미적용 (한도 빠듯, 후속 개선 권장)

---

## 4. 코드 진입점 (다른 환경에서 어디부터 보면 됨)

```
app/contest/
  page.tsx              ← 메인 페이지 (좋아요 카운트 로딩, visibility hook)
  components/
    IllustrationCard    ← 좋아요 토글, 무기 모달 트리거, 라이트박스 트리거
    WeaponGalleryModal  ← 무기 목록·업로드·정렬 (좋아요/조회수 Supabase 통합)
    WeaponDetailModal   ← 무기 상세 (좌 이미지·우 댓글)
lib/
  contest-supabase.ts   ← 좋아요/조회수 + 캐시 매니저 (핵심)
  contest-service.ts    ← Firestore 무기 메타·댓글·Storage
data/contest-data.ts    ← 12 일러스트 + 6 매치업 (이름/컨셉 수정 시 여기)
docs/                   ← 모든 운영 문서
```

---

## 5. 후속 작업 (TODO — 다음 환경에서 이어서)

### 우선순위 높음
- [ ] **사용자 콘솔 작업 후 실제 좋아요·조회수 동작 검증** (브라우저에서 토글 + Supabase Table Editor 에서 데이터 확인)
- [ ] **Firebase JWT → Supabase 연결 후 RLS 정책 실제 작동 검증** (비로그인이 좋아요 시도 → 거부 받는지)

### 우선순위 중간 (성능)
- [ ] `getWeaponCount` 12회 read 를 sessionStorage 캐시화 (또는 `contestStats/summary` 단일 도큐로 통합)
- [ ] Firebase 콘솔 사용량 알림 80% 활성화
- [ ] Supabase egress 80% 알림 활성화

### 우선순위 낮음 (개선)
- [ ] 무기 업로드 사용자당 갯수 제한 (어뷰저 방지) — Firebase Functions
- [ ] CDN 앞단 rate limit (Cloudflare 등)
- [ ] 무기 갤러리 페이지네이션 (현재 전체 fetch — 무기 100개 넘으면 느려질 수 있음)
- [ ] 댓글 페이지네이션 (현재 전체 fetch)
- [ ] 빈 슬롯 placeholder 4개 (a3·b3 등) 실제 일러스트로 채우기 — `data/contest-data.ts` 의 `placeholder()` 부분 교체

### 추가 기능 아이디어 (사용자 결정 필요)
- [ ] 무기 좋아요 정렬 옵션 (현재 최신순 / 좋아요순만, 댓글많은순도?)
- [ ] 무기 검색 / 필터
- [ ] 일러스트별 좋아요 랭킹 표시
- [ ] 매치업 우승자 결정 + 결과 페이지

### 알려진 이슈
- Next.js 16 Turbopack + Google Fonts 일시 캐시 손상 시 빌드 실패 → `rm -rf .next node_modules/.cache && npm run build` 로 해결
- 가끔 Supabase 첫 호출이 cold start (~500ms) — 사용자 첫 진입에는 옵티미스틱이 보호

---

## 6. Git 작업 흐름

```bash
# 다른 환경에서 작업 이어 받기
git checkout feature/avatar-contest
git pull origin feature/avatar-contest

# 작업 후
git add <파일>
git commit -m "..."
git push origin feature/avatar-contest

# 메인 머지는 사용자 결정 후 PR
```

`main` 으로 직접 머지하지 마세요. 콘솔 작업 + 검증 끝난 후 PR 로 합치는 게 안전합니다.

---

## 7. 빌드 / 실행

```bash
npm run dev    # http://localhost:3000/contest
npm run build  # 운영 빌드 (Turbopack 캐시 이슈 시 .next/node_modules/.cache 삭제)
```

마지막 빌드 통과 일시: 2026-05-07

---

## 8. 참고 문서 (이 폴더 안)

| 문서 | 내용 |
|---|---|
| `contest-handoff.md` | (이 파일) 진행 상황 핸드오프 |
| `contest-supabase-setup.md` | Supabase 셋업 + SQL 전체 |
| `contest-firebase-rules.md` | Firestore + Storage 규칙 |
| `contest-flow-security-audit.md` | 데이터 흐름 + 보안 검토 보고서 |
