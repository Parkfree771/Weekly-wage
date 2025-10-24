// Firebase 클라이언트 설정
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAbdxo37cflPa3fIwebIZzssJKal4qroXg",
  authDomain: "lostark-weekly-gold.firebaseapp.com",
  projectId: "lostark-weekly-gold",
  storageBucket: "lostark-weekly-gold.firebasestorage.app",
  messagingSenderId: "218166417711",
  appId: "1:218166417711:web:910bb169c3cac50bf769da",
  measurementId: "G-3VS67FWG8M"
};

// Firebase 앱 초기화 (이미 초기화되어 있으면 재사용)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore 인스턴스
const db = getFirestore(app);

export { app, db };
