# 도메인 마이그레이션 런북: lostarkweeklygold.kr → loalogol.kr

## Phase 0 — 코드 정리 (✅ 완료)

도메인 하드코딩을 환경변수 1개로 통일. D-day 때 코드 변경 없이 Netlify env 만 바꾸면 사이트 전체가 새 도메인 반영됨.

- `lib/site-config.ts` 신설 — `SITE_URL`, `LEGACY_SITE_HOST`, `NEW_SITE_HOST` export
- 환경변수 `NEXT_PUBLIC_SITE_URL` 미설정 시 `https://lostarkweeklygold.kr` 기본값
- 19개 파일의 `lostarkweeklygold.kr` 하드코딩 제거 (sitemap, robots, layout, 14개 페이지 layout, proxy.ts, privacy/page.tsx, package/[postId]/page.tsx)
- `metadataBase: new URL(SITE_URL)` 으로 변경, 페이지별 layout은 상대 경로(`canonical: '/extreme'`) 사용 → metadataBase가 자동 절대화
- JSON-LD 의 `url` 필드는 절대 URL 필요해서 `${SITE_URL}/path` 템플릿 사용
- 메인 페이지(`app/page.tsx`)에 `DomainChangeNotice` 배너 — 차트/통계 아래, 호스트네임 자동 감지

## Phase 1 — 도메인 등록 (사용자 작업)

### 1-1. 호스팅kr 또는 가비아 등에서 `loalogol.kr` 등록
- `.kr` 은 KISA 인증 한국 등록업체에서만 가능
- 가격: ~22,000원/년
- 네임서버는 등록 시점엔 등록업체 기본 NS 로 두고 진행

### 1-2. (선택) Cloudflare 영역 추가
**선택 이유: 마이그레이션 완료 후 Cloudflare 빼는 안도 검토 중. 일단 그대로 가려면**
- Cloudflare 가입(이미 있음) → Add a Site → `loalogol.kr` 입력
- Cloudflare 가 안내하는 NS 2개 메모
- 호스팅kr 에서 NS 변경 (전파 1~24시간)
- SSL/TLS 모드 → **Full (strict)**
- Speed → Optimization → **Auto Minify (JS) 끄기**, **Rocket Loader 끄기**

### 1-3. Netlify에 새 도메인 추가
1. Netlify 대시보드 → 사이트 → Domain settings → Add a domain → `loalogol.kr`
2. (Cloudflare 사용 시) Cloudflare DNS 에 Netlify 가 안내하는 CNAME/ALIAS 레코드 추가
3. SSL 자동 발급 대기 (Let's Encrypt, 보통 5~10분)
4. **양쪽 도메인 모두 정상 접속되는지 확인** (구·새 도메인 둘 다 같은 사이트가 보이는 단계)

## Phase 2 — D-day 컷오버 순서

### 2-1. Netlify 환경변수 변경 (가장 먼저)
- Netlify → Site settings → Environment variables
- `NEXT_PUBLIC_SITE_URL` = `https://loalogol.kr` 추가
- **Trigger deploy** (Clear cache and deploy site)
- 배포 끝나면: sitemap.xml, robots.txt, 모든 메타데이터, JSON-LD가 새 도메인으로 송출됨

### 2-2. Netlify Primary domain 전환
- Domain settings → `loalogol.kr` 옆 "Set as primary domain"
- 구도메인은 아직 사이트에 붙은 상태로 둠 (다음 스텝에서 리다이렉트로 전환)

### 2-3. 301 리다이렉트 설정 (둘 중 택1)

**옵션 A — Netlify `_redirects` (추천, Cloudflare 의존도 ↓):**
프로젝트 루트에 `_redirects` 파일 신설 또는 `netlify.toml` 에 추가:
```toml
[[redirects]]
  from = "https://lostarkweeklygold.kr/*"
  to = "https://loalogol.kr/:splat"
  status = 301
  force = true

[[redirects]]
  from = "https://www.lostarkweeklygold.kr/*"
  to = "https://loalogol.kr/:splat"
  status = 301
  force = true
```
배포하면 즉시 적용. `:splat` 이 경로 보존.

**옵션 B — Cloudflare Bulk Redirects:**
- 구도메인 Cloudflare 영역 → Rules → Bulk Redirects
- Source: `lostarkweeklygold.kr/*`
- Target: `loalogol.kr/$1`
- Status: 301 Permanent
- Preserve query string: ✓

### 2-4. Google Search Console
1. **새 속성 추가**: `https://loalogol.kr` (도메인 속성 권장)
2. **DNS TXT 인증**: 호스팅kr/Cloudflare 에서 TXT 레코드 추가, 인증 완료 대기
3. **사이트맵 제출**: `https://loalogol.kr/sitemap.xml`
4. **★ "주소 변경(Change of Address)" 도구**:
   - 구속성(`lostarkweeklygold.kr`) → 좌상단 메뉴 → "주소 변경"
   - 새 속성(`loalogol.kr`) 선택 → 검증 (301 동작 확인)
   - 제출 (이게 SEO 인계의 핵심 — 빠뜨리면 Google이 매핑을 학습하는 데 수개월 걸림)

### 2-5. 네이버 웹마스터도구
1. 새 도메인 등록
2. `app/layout.tsx:96` 의 `naver-site-verification` 갱신 필요 시 새 인증 코드 받아서 교체 후 배포
3. 사이트맵 제출: `https://loalogol.kr/sitemap.xml`

### 2-6. Google AdSense
1. AdSense → 사이트 → 사이트 추가 → `loalogol.kr`
2. ads.txt 검증 대기 (Netlify 가 자동 처리하므로 보통 OK)
3. 구도메인은 리다이렉트 살아있는 동안 그대로 둠

### 2-7. Google Analytics
- gtag 코드(`G-QBV4JHCBJF`)는 그대로 작동
- (선택) Property settings → Data streams → 기본 URL을 `loalogol.kr` 로 갱신

## Phase 3 — 컷오버 후 모니터링

### 첫 24시간
- [ ] 새 도메인 정상 접속 확인 (메인, 차트 데이터 로딩, 마이페이지 로그인)
- [ ] 구도메인 → 새 도메인 301 리다이렉트 동작 (curl -I 로 확인)
- [ ] `/sitemap.xml`, `/robots.txt` 가 새 도메인 참조하는지 확인
- [ ] `/api/price-data/latest`, `/api/price-data/history` 응답 정상 (Netlify Edge 캐시 워밍업)
- [ ] AdSense 광고 정상 노출
- [ ] Google Analytics 새 도메인 트래픽 들어옴

### 첫 1주
- [ ] Search Console 구속성 Coverage 리포트에서 "redirect" 상태 페이지 증가 확인
- [ ] Search Console 새속성 색인 등록 페이지 수 증가 확인
- [ ] 네이버 웹마스터도구 색인 갱신 모니터링

### 첫 1~3개월
- [ ] 기존 검색 트래픽이 새 도메인으로 점진적 이전 (Search Console 데이터 비교)
- [ ] 외부 백링크 사이트에 새 도메인 알림 (선택)

## Phase 4 — 영구 유지 (1년 이상)

- **구도메인 절대 만료시키지 말 것** — 만료되면 모든 외부 링크/북마크/검색 인덱스가 죽음. 매년 자동 갱신 설정
- 구도메인 Search Console 속성도 유지 (리다이렉트 상태 모니터링용)
- 안정화되면 (3개월 후) 메인 페이지의 `DomainChangeNotice` 배너 제거 검토

## ⚠️ 절대 하지 말 것

- 302(임시) 리다이렉트 → SEO 순위 안 넘어감. 반드시 **301 영구**
- 구도메인 즉시 폐기/만료 → 외부 링크 다 깨짐
- "Change of Address" 도구 건너뛰기 → Google 매핑 학습 수개월 걸림
- 경로 미보존 리다이렉트 (`oldsite.com/foo` → `newsite.com/`) → 깊은 페이지 SEO 다 날아감
- Netlify primary 변경 전에 환경변수만 바꾸고 끝내기 → metadata는 새 도메인이지만 사이트는 구 도메인이 primary 로 응답하는 어색한 상태

## 롤백 시나리오

### 컷오버 후 큰 문제 발생 시
1. Netlify env `NEXT_PUBLIC_SITE_URL` 을 `https://lostarkweeklygold.kr` 로 되돌림 + 재배포
2. Netlify primary domain 을 구도메인으로 되돌림
3. 301 리다이렉트 룰 비활성/삭제
4. Search Console "주소 변경" 은 자동 취소 안 되니, 새속성 → 도구에서 "이동 중지" 검토

## 참고: 변경된 파일 목록

코드 정리 대상이 되었던 파일들 — 변경 이력 추적용:

- `lib/site-config.ts` (신규)
- `app/sitemap.ts`, `app/robots.ts`, `app/layout.tsx`
- 14개 페이지 layout: `app/{about,bracelet,cathedral,extreme,hell-reward,life-master,mypage,package,privacy,refining,terms,title-stats,title-stats/frost,weekly-gold}/layout.tsx`
- `app/package/[postId]/page.tsx`, `app/privacy/page.tsx`
- `proxy.ts` (CORS ALLOWED_ORIGINS)
- `components/DomainChangeNotice.tsx` (신규), `components/DomainChangeNotice.module.css` (신규)
- `app/page.tsx` (배너 마운트)
