// Firestore 초기화 (로그인 기능 전용)
// ⚠️ 이 파일을 import 하면 firestore(~250KB) 모듈이 그 청크에 포함된다.
//    따라서 "모든 페이지"에 렌더되는 글로벌 컴포넌트(AuthContext, ConsentModal,
//    Navbar→LoginButton 등)에서는 절대 정적 import 하지 말 것.
//    글로벌 쪽은 await import('@/lib/firebase-firestore') 로 지연 로딩하고,
//    마이페이지/패키지/문의처럼 로그인 전용 라우트에서만 정적 import 한다.
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { app } from './firebase-client';

let db: Firestore;

if (typeof window !== 'undefined' && app) {
  // IndexedDB 로컬 캐시 + 멀티탭 지원 (기존 동작 유지)
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
}

export { db };
