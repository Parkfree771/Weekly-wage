// Firebase Admin SDK 설정 (서버 사이드 전용)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminDb: Firestore;

/**
 * Firebase Admin SDK 초기화
 * 서버 사이드에서만 사용 (API 라우트, 서버 컴포넌트)
 */
export function getAdminApp(): App {
  if (!adminApp) {
    // 이미 초기화된 앱이 있는지 확인
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
    } else {
      // 개별 환경 변수에서 서비스 계정 정보 읽기
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase Admin 환경 변수가 설정되지 않았습니다. FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY를 확인하세요.');
      }

      try {
        adminApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'), // \n 문자열을 실제 줄바꿈으로 변환
          }),
          projectId,
        });
      } catch (error) {
        console.error('Firebase Admin 초기화 오류:', error);
        throw error;
      }
    }
  }

  return adminApp;
}

/**
 * Admin Firestore 인스턴스 가져오기
 */
export function getAdminFirestore(): Firestore {
  if (!adminDb) {
    const app = getAdminApp();
    adminDb = getFirestore(app);
  }
  return adminDb;
}

// 편의를 위한 export
export { Timestamp, FieldValue } from 'firebase-admin/firestore';
