# 콘테스트 페이지 — 전체 흐름 + 보안 감사 보고서

대상: `/contest` 페이지 (아바타 콘테스트). 점검 일시: 2026-05-07.

---

## 1. 전체 데이터 흐름

### 1-1. 페이지 진입 (비로그인 / 로그인 공통)

```
사용자 → /contest 진입
  ↓
HTML/JS/CSS  (Netlify CDN 캐시, 첫 방문만 다운로드)
  ↓
ParticleField 초기화 (브라우저 캔버스, 외부 호출 없음)
AuroraBackground 렌더 (CSS 만, 외부 호출 없음)
  ↓
일러스트 12장 메타  (data/contest-data.ts 하드코딩, 외부 호출 없음)
일러스트 webp 12장 (Netlify CDN 에서 가져옴, /public/contest/*)
  ↓
Supabase 호출 1:  fetchIllustLikeCounts()
  → contest_illust_like_counts SELECT all (12 행)
  → sessionStorage 캐시 5분
  ↓
[로그인 시] Supabase 호출 2:  fetchUserLikedIllusts(uid)
  → contest_illust_likes WHERE uid=본인 (RLS)
  → sessionStorage 캐시 5분
```

### 1-2. 일러스트 좋아요 토글 (로그인 필수)

```
사용자 클릭
  ↓
옵티미스틱 UI  (likeCount ±1, 하트 토글, 0ms)
  ↓
Supabase: toggleIllustLike(slug, uid, wasLiked)
  → wasLiked=true:  DELETE FROM contest_illust_likes WHERE slug, uid
  → wasLiked=false: INSERT INTO contest_illust_likes (slug, uid)
  ↓
Postgres 트리거:  _update_illust_like_count()
  → contest_illust_like_counts.like_count += 1 (또는 -1)
  ↓
sessionStorage 캐시 무효화 (다음 5분 사이클에 새 카운트 fetch)
  ↓
실패 시: 옵티미스틱 롤백 + alert
```

### 1-3. 무기 갤러리 모달 진입

```
사용자 [어울리는 무기 아바타] 클릭
  ↓
Firestore: getWeapons(slug)  → contestWeapons/{slug}/items 전체 read (메타)
  ↓
Supabase: fetchWeaponLikeCounts(slug, weaponIds)  → 무기들 좋아요 카운트
  ↓
[로그인 시] fetchUserLikedWeapons(uid, slug) → 본인이 좋아요한 무기 id
  ↓
머지 후 갤러리 표시 (카드: 이미지 + 좋아요 + 댓글수)
```

### 1-4. 무기 업로드

```
사용자 [+ 무기 아바타 올리기] → 파일 선택 + 제목 입력 → 등록
  ↓
브라우저 검증:
  - 이미지 type
  - 입력 size ≤ 3MB
  ↓
클라이언트 압축:  compressForUpload()
  - WebP 변환 (canvas.toBlob)
  - 긴 변 1920px 리사이즈 (비율 유지)
  - quality 0.9 → 0.8 → 0.7 → 0.6 단계 시도, 1MB 이하 첫 결과 사용
  - 모두 1MB 초과 시 실패 → Squoosh 링크 안내
  ↓
Firebase Auth 인증 확인 (비로그인이면 차단)
  ↓
Firebase Storage:  uploadBytes()
  → contest-weapons/{slug}/{uid}_{timestamp}.webp
  → Storage 규칙: 인증 + size < 1MB + image/* + 파일명 본인 uid 시작
  ↓
getDownloadURL → public URL 발급
  ↓
Firestore:  addDoc(contestWeapons/{slug}/items)
  → 메타: { uid, authorName, title, imageUrl, storagePath, width, height, commentCount: 0, createdAt }
  ↓
클라이언트 갤러리 state 즉시 갱신 + 모달 폼 닫음
```

### 1-5. 무기 좋아요 토글

```
사용자 좋아요 클릭 (로그인 필수)
  ↓
옵티미스틱 UI 즉시 (likedSet 변경 + likeCount ±1)
  ↓
Supabase: toggleWeaponLikeSupa(weaponId, slug, uid, wasLiked)
  → INSERT 또는 DELETE  (트리거가 카운트 갱신)
  ↓
실패 시 롤백
```

### 1-6. 무기 댓글

```
모달 우측에 WeaponCommentSection
  ↓
조회: Firestore getWeaponComments(slug, weaponId) → comments 서브컬렉션
작성: Firestore createWeaponComment + commentCount increment
수정/삭제: 본인만 (Firestore 규칙)
```

### 1-7. 다른 탭 → 콘테스트 탭 복귀

```
visibilitychange 이벤트 → page.tsx usePageVisibility 콜백
  ↓
loadCounts(force=true), loadUserLikes(force=true)
  → sessionStorage 캐시 우회하고 Supabase 다시 호출 → 최신 상태 반영
```

---

## 2. 보안 위협 검토

### 2-1. 인증 / 인가

| 시나리오 | 차단 메커니즘 | 결과 |
|---|---|---|
| 비로그인 좋아요 | 클라이언트 alert + Supabase RLS (`uid = auth.jwt()->>'sub'`) | ✅ 이중 차단 |
| 비로그인 댓글 | 클라이언트 차단 + Firestore 규칙 (`isSignedIn()`) | ✅ 이중 차단 |
| 비로그인 무기 업로드 | 클라이언트 차단 + Storage 규칙 (`auth != null`) + Firestore 규칙 | ✅ 삼중 차단 |
| 다른 사용자 좋아요 위조 | RLS `uid = auth.jwt()->>'sub'` | ✅ 차단 |
| 다른 사용자 댓글 수정/삭제 | Firestore `resource.data.uid == request.auth.uid` | ✅ 차단 |
| 다른 사용자 무기 삭제 | Firestore + Storage 둘 다 본인 uid 검증 | ✅ 차단 |
| 좋아요 카운트 임의 조작 | Supabase Postgres 트리거가 자동 갱신, 클라이언트는 SELECT만 | ✅ 불가 |

### 2-2. 입력 검증

| 항목 | 검증 위치 | 한도 |
|---|---|---|
| 무기 이미지 type | 클라이언트 + Storage 규칙 (`contentType.matches('image/.*')`) | image/* 만 |
| 무기 입력 사이즈 | 클라이언트 (3MB) | 3MB |
| 무기 변환 후 사이즈 | 클라이언트 + Storage 규칙 (1MB) | 1MB |
| 무기 파일명 | Storage 규칙 (`{uid}_*` 강제) | 본인 uid 시작 |
| 무기 제목 | 클라이언트 (1~30자, trim) | 30자 |
| 댓글 길이 | 클라이언트 + Firestore 규칙 (1~300자) | 300자 |

### 2-3. 알려진 위협 / 잔여 리스크

#### A. 좋아요 어뷰징 (시크릿 모드 / 멀티 계정)
- Firebase Auth 로그인이 필요해서 SDK 콘솔 호출은 차단됨
- 다만 한 사용자가 여러 Firebase 계정으로 로그인하면 좋아요 추가 가능 (계정당 1표)
- **영향**: 미미함. Firebase Auth 가입은 이메일 검증 등 마찰이 있어서 봇 어뷰징 어려움
- **대응**: 별도 조치 필요 없음

#### B. Firestore 무료 한도 소진 공격 (DoS)
- 누가 봇으로 콘테스트 페이지 무한 새로고침 → Firestore read 폭주
- **영향**: 일일 한도 5만 read 초과 → 사이트 read 차단
- **대응**:
  - sessionStorage 캐시 5분 → 같은 봇은 5분 1번만 read
  - 새로고침 후 sessionStorage 비울 수 있어 우회 가능 (브라우저 자동화)
  - **현실적 대응**: Cloudflare 등 CDN 앞단 rate limit, Firebase 콘솔 알림 (80% 도달 시 메일)

#### C. Storage 비용 폭주 공격
- 누가 무기 1MB 무한 업로드 → Storage 5GB 한도 빠르게 초과
- **차단**:
  - Storage 규칙: 본인 uid 파일명 강제 → 가입+로그인 필요
  - 한 계정으로 무한 업로드 → 가능. 다만 가입 마찰 + 식별
  - 추가 대응: Firebase Functions 로 사용자당 업로드 갯수 제한 (현재 안 함)
- **현재 상태**: 정상 사용자 수십~수백 명 업로드 가정 시 5GB 한도 안전 (1MB × 5,000 = 5GB)
- **대응**: 사용량 모니터링 + 어뷰저 식별 시 Firebase 콘솔에서 uid 차단

#### D. 정보 유출 위협

| 데이터 | 노출 범위 | 위험도 |
|---|---|---|
| 닉네임 | 댓글/무기 작성자에 표시 (의도) | 낮음 |
| Firebase uid | 댓글/무기 도큐 read 시 노출 (자체로는 다른 정보 추적 불가) | 낮음 |
| 이메일 | 노출 X (UserProfile 의 email 은 클라이언트에서만 사용, 다른 사용자에게 read 안 됨) | ✅ |
| Storage 파일 경로 | imageUrl 은 public download URL (의도) | 낮음 |
| 다른 사용자의 좋아요 한 slug | RLS `uid = 본인` 제한으로 select 차단 | ✅ 차단 |

#### E. XSS / SQL Injection
- React 자동 escape → XSS 안전
- Supabase 쿼리는 Parameterized → SQL Injection 안전
- 댓글 content 는 `white-space: pre-wrap` + 자동 escape → 안전
- 외부 링크 (officialEvent, Squoosh) `rel="noopener noreferrer"` 적용됨

#### F. CSRF
- Firebase / Supabase 모두 토큰 기반 인증 (쿠키 X) → CSRF 무관

#### G. 클라이언트 시크릿 노출
- `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` 는 공개 의도 (RLS 가 진짜 보호)
- Firebase 설정도 `NEXT_PUBLIC_*` (공개 의도, 보안은 Auth + 규칙으로)
- Service account / admin SDK 키는 서버 코드에서만 사용 (`lib/firebase-admin.ts`) ✅

---

## 3. 의존 인프라 점검

### Firestore 쿼리 빈도 (평균 3천명/일 가정)

| 호출 | 횟수 |
|---|---|
| 무기 모달 진입 — 메타 1 read × 3 모달 × 3000 | 9,000 |
| 무기 댓글 조회 — 모달 댓글 토글 시 | ~3,000 |
| **합계** | **약 12,000/일** ✅ 한도 5만 read 여유 |

### Supabase 쿼리 빈도

| 호출 | 횟수 |
|---|---|
| 페이지 진입 좋아요 카운트 (캐시 5분) | 3000 × 0.5 = 1,500 |
| 본인 좋아요 (캐시 5분) | 1,500 |
| 무기 모달 좋아요 카운트 (캐시 5분) | 3000 × 3 = 9,000 |
| 무기 모달 본인 좋아요 | 9,000 |
| 좋아요 토글 (활성 30%) | 900 × 1 = 900 |
| **합계** | **약 22,000/일** ✅ Supabase 무제한 한도 |

### Storage Egress

| 항목 | 사이즈 |
|---|---|
| 일러스트 12장 (Netlify CDN) | 3000 × 3.8MB = 11.4GB/일 |
| → Netlify CDN 캐시 적중 시 실제는 < 1GB | 안전 |
| 무기 이미지 (Firebase Storage) | 사용자가 무기 1000장 등록 가정 + 다운로드 30%/일 = 평균 100KB × 3000 × 5 = 1.5GB/일 |
| → Firebase Storage CDN 캐시 적중률 높음 | 한도 1GB/일 빠듯, 모니터링 필요 |

---

## 4. 결론 및 권장 후속 작업

### 결론
- **로그인이 필요한 액션은 모두 이중 차단** (클라이언트 + 서버 규칙)
- **좋아요 카운트 위조 불가** (Supabase 트리거가 단일 진실 원천)
- **데이터 유출 위협 없음** (RLS + Firestore 규칙으로 다른 사용자 데이터 read 차단)

### 권장 후속 작업 (이번 범위 밖)
1. **Firebase 콘솔 사용량 알림 활성화** (read/write/storage 80% 도달 시 메일)
2. **Supabase 사용량 알림** (egress 80% 도달 시)
3. **무기 업로드 사용자당 갯수 제한** (Firebase Functions, 어뷰저 방지)
4. **CDN 앞단 rate limit** (Cloudflare 등) — 트래픽 폭주 대비

### 즉시 확인 필요 (사용자)
- [ ] Supabase 콘솔에서 SQL 실행 (`docs/contest-supabase-setup.md`)
- [ ] Supabase Auth → Third-Party Auth → Firebase 등록
- [ ] Firestore 규칙 업데이트 (좋아요 부분 제거된 새 규칙)
- [ ] Storage 규칙 1MB 한도 확인
