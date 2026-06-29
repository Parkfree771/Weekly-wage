// Firebase 클라이언트 SDK 설정 (브라우저 전용)
// ⚠️ 여기서는 app + auth 만 초기화한다.
//    firestore 는 로그인 기능에서만 필요하므로 lib/firebase-firestore.ts 로 분리해
//    글로벌 번들(모든 페이지)에 firestore(~250KB)가 딸려오지 않게 한다.
//    storage(클라이언트 SDK)는 사용처가 없어 제거함. 가격 데이터(latest.json)는
//    /api/price-data/* (서버 firebase-admin)로 받으므로 클라이언트 storage 와 무관하다.
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Firebase 앱 초기화 (중복 방지)
let app: FirebaseApp;
let auth: Auth;

if (typeof window !== 'undefined') {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
}

export { app, auth };
