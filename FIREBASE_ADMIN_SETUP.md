# Firebase Admin SDK 설정 가이드

## 1. Firebase 서비스 계정 키 생성

1. **Firebase Console** 접속: https://console.firebase.google.com/
2. 프로젝트 선택 (`lostark-weekly-gold`)
3. 왼쪽 상단 **톱니바퀴 아이콘** → **프로젝트 설정** 클릭
4. **서비스 계정** 탭 클릭
5. 하단의 **새 비공개 키 생성** 버튼 클릭
6. JSON 파일 다운로드 (예: `lostark-weekly-gold-firebase-adminsdk-xxxxx.json`)

## 2. 환경 변수 설정

### 로컬 개발 환경 (.env.local)

다운로드한 JSON 파일의 내용을 **한 줄로** 변환하여 `.env.local`에 추가:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"lostark-weekly-gold","private_key_id":"...전체 JSON 내용..."}
```

**주의**: JSON 파일 내용을 따옴표 없이 그대로 붙여넣으세요.

### Vercel 배포 환경

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 클릭
4. 새 환경 변수 추가:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value**: JSON 파일 내용 전체 (한 줄로)
   - **Environment**: Production, Preview, Development 모두 체크
5. **Save** 클릭

## 3. Firestore 보안 규칙 업데이트

Firebase Console → Firestore Database → 규칙 탭에서 다음 규칙 적용:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // 가격 히스토리 - 모두 읽기 가능, 쓰기는 Admin SDK에서만
    match /priceHistory/{docId} {
      allow read: if true;
      allow write: if false;  // Admin SDK만 쓰기 가능
    }

    // 일별 평균 가격 - 모두 읽기 가능, 쓰기는 Admin SDK에서만
    match /dailyPrices/{docId} {
      allow read: if true;
      allow write: if false;  // Admin SDK만 쓰기 가능
    }

    // 오늘 임시 데이터 - 모두 읽기 가능, 쓰기는 Admin SDK에서만
    match /todayTemp/{docId} {
      allow read: if true;
      allow write: if false;  // Admin SDK만 쓰기 가능
    }
  }
}
```

**게시(Publish)** 버튼을 클릭하여 규칙 적용

## 4. 테스트

```bash
npm run build
npm run dev
```

브라우저에서 차트를 열어 데이터가 정상적으로 로드되는지 확인

## 5. 보안 주의사항

⚠️ **절대로 Git에 커밋하지 마세요**:
- `.env.local` 파일
- Firebase 서비스 계정 키 JSON 파일
- 이미 `.gitignore`에 추가되어 있어야 합니다

✅ **이미 커밋된 경우**:
1. 해당 키를 즉시 폐기
2. Firebase Console에서 새 키 생성
3. Git 히스토리에서 키 제거 필요
