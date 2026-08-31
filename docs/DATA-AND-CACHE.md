# 데이터·캐시 지도 (단일 기준 문서)

DB를 어디에 두는지, 네트리파이 함수 호출을 어떻게 줄이는지에 대한 **확정 결정 모음**.
새 기능·수정 전에 이 문서를 먼저 본다. 여기 있는 결정을 바꿀 때는 이 문서도 같이 고친다.

## 0. 대원칙

- 네트리파이 함수 호출 1회 = **함수까지 도달한 HTTP 요청 1건**. 뒤에 있는 DB가 뭐든 무관하다.
  줄이는 방법은 두 가지뿐: **(a) 요청 자체를 없앤다, (b) CDN durable 캐시로 함수 앞에서 끊는다.**
- CDN 캐시는 "같은 URL을 TTL 안에 또 요청하는 사람"이 있을 때만 효과가 있다.
  TTL이 트래픽 간격보다 짧으면(예: 20초) 사실상 전원 캐시 미스 = 페이지뷰당 함수 호출이다.
- `Cache-Control: s-maxage`만 쓰면 엣지 노드별 개별 캐시다. 반드시
  `Netlify-CDN-Cache-Control: public, durable, s-maxage=...`를 쓴다 — durable이 전 세계 공유 캐시.

## 1. DB 분리 (2026-08-26 확정 — 통합하지 않는다)

| 데이터 | DB | 접근 경로 | 이유 |
|---|---|---|---|
| 개인 상태 (마이페이지 숙제·즐겨찾기·매수가·달력 기록) | **Firestore** | 브라우저 ↔ Firestore 직결 | **함수 호출 0회.** 인증도 Firebase라 한 몸 |
| 집계·커뮤니티 (패키지 조회·따봉·흠, 댓글, 투표) | **Neon** | API 라우트 경유 | 카운트 무결성(서버만 씀), SQL 집계 |
| 가격 데이터 원본 (latest/history JSON) | Firebase Storage | API 라우트 + durable 캐시 + 태그 퍼지 | 크론이 쓰고 CDN이 서빙 |

**"전부 한 DB로 통합"은 어느 쪽이든 손해다:**
- 전부 Neon → 개인 상태까지 API 라우트를 타야 해서 함수 호출이 **늘어난다**.
- 전부 Firestore → 집계 카운터를 클라이언트가 쓰게 되어 무결성이 깨진다 (2026-08-26 Neon 이관의 이유).

## 2. 캐시 표준

| 등급 | TTL | 대상 | 갱신 방식 |
|---|---|---|---|
| 정적 데이터 | **durable 3600 + 태그 퍼지** | price-data/latest·history | 크론이 쓸 때 태그 퍼지 (이벤트 구동) |
| 준실시간 | **durable 300** (사이트 표준) | live-prices, package/stats, ISR 페이지 | TTL 만료 |
| 캐릭터 조회 | durable 120 + 캐릭터 태그 | /api/lostark | refresh=1이 태그 퍼지 (**TTL 연장 금지 — 확정**) |
| POST | 캐시 불가 | view·react·feedback·revalidate | **요청 자체를 줄인다** (아래 3) |

- 브라우저 쪽은 항상 `Cache-Control: public, max-age=0, must-revalidate` — 신선도 제어권은 CDN에만 둔다.
- **TTL을 300 미만으로 줄이는 것 금지.** 신선도가 더 필요하면 TTL 단축이 아니라
  "쓰기 응답에 최신값 동봉 + 세션 캐시(package-stats-client)" 패턴을 쓴다 — 내 행동은 즉시 보이고,
  남의 행동은 최대 5분 늦게 보이는 게 이 사이트의 표준 신선도다.

## 3. 함수 호출 경로 전수표 (2026-08-31 기준)

| 라우트 | 호출자·시점 | 호출량 통제 |
|---|---|---|
| GET /api/price-data/latest | 전 페이지 (루트 레이아웃 preload) | durable 3600 + `price-latest` 태그 퍼지 → 사실상 시간당 1회 |
| GET /api/price-data/history | 홈 시세 차트 | durable 3600 + `price-history` 태그 퍼지 |
| GET /api/market/live-prices | 시세 갱신 버튼 | durable 300 + 클라 쿨다운 300초 (같은 값 유지 필수) |
| POST /api/market/batch-prices | 생활 계산기 수동 갱신 버튼 | unstable_cache 300초, 마운트 시 자동 호출 없음 |
| GET /api/lostark | 캐릭터 검색·시뮬 불러오기 | durable 120 + 캐릭터 태그, refresh=1은 퍼지 후 no-store |
| GET /api/package/stats | 갤러리 마운트·탭 복귀 | durable 300, ids 정렬로 URL 통일, 복귀 재조회도 300초 간격 |
| POST /api/package/view | 상세 첫 방문 | **24h 내 재방문은 localStorage/AsyncStorage로 POST 생략** (서버 쿠키 pv와 병행). pv 쿠키는 항목별 타임스탬프 — 통째 TTL 갱신으로 단골의 재조회가 영원히 안 세지던 버그 수정(2026-08-31) |
| POST /api/package/react | 따봉·흠 클릭 | 사용자 행동당 1회 — 응답에 최신 stats 동봉 |
| POST /api/package/revalidate | 글·댓글 쓰기 직후 | 쓰기 행동당 1회 |
| POST /api/feedback | 문의·제보 제출 | 사용자 행동당 1회 |
| /api/cron/* | GitHub Actions 시간당 3회 + heal 일 1회 | 월 ~2,300회, 무시 가능 |
| /api/admin/* | 수동 운영 | 무시 가능 |
| 페이지 HTML·RSC | 모든 방문·봇 | 정적 페이지는 durable, /package·상세는 ISR 300 |

이 표에 없는 "페이지뷰마다 자동으로 나가는 요청"을 새로 만들지 않는다.
만들어야 하면 durable 300 이상 + 이 표에 한 줄 추가가 조건이다.

## 4. 새 API 라우트 체크리스트

1. GET인가? → `Netlify-CDN-Cache-Control: public, durable, s-maxage=300+` 필수. 갱신이 이벤트성이면 태그 퍼지.
2. POST인가? → 사용자 행동당 1회인지 확인. 페이지뷰당 자동 POST면 생략 조건(localStorage 등)을 먼저 설계.
3. 같은 데이터를 보는 사람끼리 URL이 같은가? (파라미터 정렬 — package/stats의 ids 정렬 참고)
4. 위 3번 표에 한 줄 추가했는가?
