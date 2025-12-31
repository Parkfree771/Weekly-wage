# 🔒 Firebase API 키 보안 문제 해결

## ✅ 완료된 작업

1. `.env.local`에 Firebase 클라이언트 설정 추가
2. `lib/firebase.ts`를 환경 변수로 수정

## 📋 다음 단계 (필수)

### 1. Netlify 환경 변수 추가

Netlify에 환경 변수를 추가해야 프로덕션에서 작동합니다:

1. **Netlify 대시보드** 접속: https://app.netlify.com
2. 프로젝트 선택
3. **Site settings** → **Environment variables**
4. 다음 변수들 추가 (모두 `NEXT_PUBLIC_` 접두사 필요):

```
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyAbdxo37cflPa3fIwebIZzssJKal4qroXg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = lostark-weekly-gold.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = lostark-weekly-gold
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = lostark-weekly-gold.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 218166417711
NEXT_PUBLIC_FIREBASE_APP_ID = 1:218166417711:web:910bb169c3cac50bf769da
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = G-3VS67FWG8M
```

5. **Save** 클릭

### 2. 변경사항 커밋 & 푸시

```bash
git add lib/firebase.ts
git commit -m "Security: Move Firebase config to environment variables"
git push
```

⚠️ **주의**: `.env.local`은 커밋하지 마세요! (이미 `.gitignore`에 있음)

### 3. Netlify 재배포 트리거

환경 변수 추가 후:
- Netlify에서 자동으로 재배포되거나
- **Deploys** 탭에서 **Trigger deploy** 클릭

---

## 🔐 추가 보안 조치 (권장)

### Option 1: Firebase API 키 재생성 (가장 안전)

1. **Firebase Console** 접속: https://console.firebase.google.com
2. 프로젝트 선택: `lostark-weekly-gold`
3. **프로젝트 설정** → **일반**
4. **내 앱** 섹션에서 웹 앱 찾기
5. 톱니바퀴 아이콘 클릭 → **앱 삭제** 후 새로 생성
   - 또는 **웹 API 키** 재생성

새 API 키로 변경:
1. `.env.local` 업데이트
2. Netlify 환경 변수 업데이트
3. 재배포

### Option 2: Git 히스토리에서 민감 정보 제거

⚠️ **주의**: 공동 작업자가 있으면 협의 필요 (force push 필요)

```bash
# BFG Repo-Cleaner 사용 (권장)
# 다운로드: https://rtyley.github.io/bfg-repo-cleaner/

# 1. 최신 커밋 제외한 모든 커밋에서 API 키 제거
bfg --replace-text passwords.txt

# passwords.txt 내용:
# AIzaSyAbdxo37cflPa3fIwebIZzssJKal4qroXg

# 2. Git 히스토리 정리
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 3. Force push
git push --force
```

---

## ✨ Firebase API 키 보안 참고사항

**중요**: Firebase 클라이언트 API 키는 사실 공개되어도 괜찮습니다!

- Firebase는 **Security Rules**로 데이터를 보호
- API 키는 프로젝트 식별용일 뿐
- 실제 보안은 Firestore/Storage Rules에서 처리

하지만 **베스트 프랙티스**는:
✅ 환경 변수로 관리
✅ Git에 커밋하지 않기
✅ Security Rules 확실하게 설정

---

## 🛡️ Firebase Security Rules 확인

Firestore Security Rules가 제대로 설정되어 있는지 확인:

```javascript
// Firestore Rules 예시
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 읽기: 모두 허용 (공개 데이터)
    match /{document=**} {
      allow read: if true;
    }

    // 쓰기: 서버(Admin SDK)만 허용
    match /{document=**} {
      allow write: if false;
    }
  }
}
```

Firebase Console → **Firestore Database** → **Rules** 탭에서 확인
