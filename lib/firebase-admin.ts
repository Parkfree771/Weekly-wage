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
      // 환경 변수에서 서비스 계정 키 읽기
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (!serviceAccount) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않았습니다.');
      }

      try {
        const serviceAccountJson = JSON.parse(serviceAccount);

        adminApp = initializeApp({
          credential: cert(serviceAccountJson),
          projectId: serviceAccountJson.project_id,
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
