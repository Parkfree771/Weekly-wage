// ⚠️ 이 서비스는 글로벌 컴포넌트(AuthContext, ConsentModal)에서 import 된다.
//    그래서 firestore 를 정적 import 하면 모든 페이지 번들에 firestore 가 딸려온다.
//    → firestore 함수와 db 는 각 함수 안에서 동적 import 한다(로그인 동작 시점에만 로드).

const NICKNAME_REGEX = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]{1,12}$/;

// 닉네임 정규화 (Document ID용): 영어는 소문자로, 한글은 그대로
function normalizeNickname(nickname: string): string {
  return nickname.toLowerCase();
}

// 형식 검증
export function validateNickname(nickname: string): { valid: boolean; message: string } {
  if (!nickname || nickname.trim().length === 0) {
    return { valid: false, message: '닉네임을 입력해주세요.' };
  }

  if (nickname.length > 12) {
    return { valid: false, message: '12자 이하로 입력해주세요.' };
  }

  if (!NICKNAME_REGEX.test(nickname)) {
    return { valid: false, message: '한글, 영어, 숫자만 입력 가능합니다.' };
  }

  return { valid: true, message: '사용 가능한 닉네임입니다.' };
}

// Firestore에서 중복 확인
export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
  const { db } = await import('@/lib/firebase-firestore');
  const { doc, getDoc } = await import('firebase/firestore');
  const normalizedKey = normalizeNickname(nickname);
  const nicknameRef = doc(db, 'nicknames', normalizedKey);
  const snap = await getDoc(nicknameRef);
  return !snap.exists();
}

// 닉네임 등록 (nicknames 컬렉션 + users 프로필 업데이트)
export async function claimNickname(nickname: string, uid: string): Promise<void> {
  const { db } = await import('@/lib/firebase-firestore');
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const normalizedKey = normalizeNickname(nickname);
  const nicknameRef = doc(db, 'nicknames', normalizedKey);
  const userRef = doc(db, 'users', uid);

  // nicknames 컬렉션에 doc 생성 (보안 규칙에서 중복 방지)
  await setDoc(nicknameRef, {
    uid,
    nickname, // 원본 대소문자 보존
    createdAt: serverTimestamp(),
  });

  // users 프로필에 닉네임 저장
  await setDoc(userRef, { nickname }, { merge: true });
}

// 기존 닉네임 해제 (변경 시)
export async function releaseNickname(oldNickname: string): Promise<void> {
  const { db } = await import('@/lib/firebase-firestore');
  const { doc, deleteDoc } = await import('firebase/firestore');
  const normalizedKey = normalizeNickname(oldNickname);
  const nicknameRef = doc(db, 'nicknames', normalizedKey);
  await deleteDoc(nicknameRef);
}
