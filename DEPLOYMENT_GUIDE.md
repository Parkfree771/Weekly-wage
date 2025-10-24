# 자동 가격 수집 배포 가이드

## 1. Netlify에 배포 (현재 선택)

### 1.1 Netlify 사이트 생성
1. [Netlify](https://netlify.com)에 로그인
2. "Add new site" → "Import an existing project" 클릭
3. GitHub 리포지토리 연결
4. Build settings는 자동으로 감지됨 (netlify.toml 사용)
5. "Deploy" 클릭

### 1.2 환경 변수 설정
Netlify 사이트 설정 → Environment variables에서 다음 변수들을 추가:

```
LOSTARK_API_KEY=your_lostark_api_key_here
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
CRON_SECRET=your_random_secret_string
```

**중요**: `FIREBASE_ADMIN_PRIVATE_KEY`는 따옴표를 포함한 전체 값을 입력해야 합니다:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkq...
-----END PRIVATE KEY-----
```

## 2. GitHub Secrets 설정

GitHub 리포지토리 → Settings → Secrets and variables → Actions에서 다음 시크릿 추가:

```
SITE_URL=https://your-site.netlify.app
CRON_SECRET=your_random_secret_string (Netlify와 동일한 값)
```

**주의**: `SITE_URL`은 Netlify에서 제공하는 실제 사이트 URL로 변경하세요.

## 3. 자동 수집 작동 방식

### 3.1 GitHub Actions
- `.github/workflows/collect-prices.yml` 파일이 **30분마다** 실행됩니다
- 매시 정각(00분)과 30분에 자동 실행
- Netlify에 배포된 API를 호출합니다: `/api/cron/collect-prices`

### 3.2 수집 로직

**핵심 개념**: 둘 다 30분마다 오늘 가격을 수집하지만, 전날 평균가를 얻는 방법이 다릅니다!

#### 거래소 아이템 (market)
- **30분마다**: API의 `Stats[0].AvgPrice` (오늘 평균가)를 `todayTemp` 컬렉션에 저장
- **매일 오전 6시**: API의 `Stats[1].AvgPrice` (전날 평균가)를 `dailyPrices` 컬렉션에 저장
  - 굳이 직접 계산하지 않음 (API가 전날 평균가를 제공하니까!)

#### 경매장 아이템 (auction)
- **30분마다**: 현재 최저가를 `todayTemp` 컬렉션에 임시 저장
- **매일 오전 6시**: 전날의 임시 데이터들을 평균 계산하여 `dailyPrices` 컬렉션에 확정 저장
  - 직접 계산해야 함 (API가 전날 평균가를 제공하지 않으니까!)

### 3.3 데이터 구조

**Firestore 컬렉션:**
1. `todayTemp`: 오늘 수집 중인 임시 가격 데이터 (경매장)
   - 문서 ID: `{itemId}_{YYYY-MM-DD}`
   - 필드: `prices[]`, `count`, `lastUpdated`

2. `dailyPrices`: 확정된 일별 평균가
   - 문서 ID: `{itemId}_{YYYY-MM-DD}`
   - 필드: `price`, `date`, `timestamp`

## 4. 수동 실행 방법

### 4.1 GitHub Actions에서 수동 실행
1. GitHub 리포지토리 → Actions 탭
2. "Collect Prices" 워크플로우 선택
3. "Run workflow" 클릭

### 4.2 로컬에서 테스트
```bash
# 개발 서버 실행
npm run dev

# 가격 수집 테스트
node test-cron.js

# 가격 히스토리 조회 테스트
node test-price-history-api.js
```

## 5. 모니터링

### 5.1 로그 확인
- **Netlify**: Netlify 대시보드 → Functions 탭 → Function logs
- **GitHub Actions**: GitHub 리포지토리 → Actions 탭 → 워크플로우 실행 내역

### 5.2 Firestore 데이터 확인
Firebase Console → Firestore Database에서 다음 컬렉션 확인:
- `todayTemp`: 오늘 수집 중인 데이터
- `dailyPrices`: 확정된 일별 데이터

## 6. 트러블슈팅

### 가격이 수집되지 않을 때
1. Netlify 환경 변수가 모두 설정되었는지 확인
2. `LOSTARK_API_KEY`가 유효한지 확인
3. Firebase Admin 인증 정보가 올바른지 확인
4. Netlify Functions 로그에서 에러 메시지 확인
5. `netlify.toml` 파일이 리포지토리에 포함되어 있는지 확인

### GitHub Actions가 실행되지 않을 때
1. GitHub Secrets (`SITE_URL`, `CRON_SECRET`)이 설정되었는지 확인
2. Actions 탭에서 워크플로우가 활성화되었는지 확인
3. 워크플로우 실행 내역에서 에러 로그 확인

### 차트에 데이터가 표시되지 않을 때
1. Firestore에 실제 데이터가 있는지 확인
2. 브라우저 콘솔에서 API 응답 확인
3. 최소 1개 이상의 데이터 포인트가 필요합니다

## 7. 비용 최적화

### GitHub Actions
- 현재 설정: 30분마다 실행 (하루 48회)
- 무료 티어: 월 2,000분까지 무료
- 예상 사용량: 월 약 50분 (충분히 무료 범위 내)

### Firebase
- Firestore 읽기/쓰기 작업 수에 따라 과금
- 현재 설정으로 월 무료 티어 내에서 충분히 사용 가능
- 추적 아이템이 많아지면 비용 증가 가능성 있음

### Netlify
- Free 플랜: 무료
- 서버리스 함수 실행 시간: 최대 10초 (무료 플랜)
- 월 125,000 함수 호출까지 무료
- 많은 아이템을 추적하면 타임아웃 가능성 있음

## 8. 배포 후 확인 사항

### 8.1 첫 배포 후
1. Netlify 사이트 URL 확인 (예: `https://your-app.netlify.app`)
2. GitHub Secrets의 `SITE_URL`을 실제 URL로 업데이트
3. 브라우저에서 사이트 접속하여 정상 작동 확인

### 8.2 GitHub Actions 수동 실행
첫 데이터를 수집하기 위해:
1. GitHub → Actions 탭
2. "Collect Prices" 워크플로우 선택
3. "Run workflow" 클릭
4. 1-2분 후 Netlify Functions 로그에서 결과 확인

### 8.3 차트 확인
- 첫 데이터 수집 후 홈페이지에서 차트 확인
- 데이터가 없으면 브라우저 콘솔 확인
- 최소 1개의 데이터 포인트가 있어야 차트 표시됨

## 9. Netlify와 Next.js 주의사항

### 9.1 지원되는 기능
- ✅ Next.js App Router
- ✅ API Routes (서버리스 함수로 변환)
- ✅ 환경 변수
- ✅ 자동 빌드 및 배포

### 9.2 제한사항
- ⚠️ 함수 실행 시간: 10초 (무료 플랜)
- ⚠️ 함수 크기 제한: 50MB
- ⚠️ Cold start 시간이 있을 수 있음

### 9.3 최적화 팁
- API 호출 시 timeout 설정
- 많은 아이템을 추적할 경우 배치 처리 고려
- Firebase Admin SDK는 캐싱됨 (cold start 시간 단축)
