// 관리자 판별 (firestore 비의존 순수 모듈)
// LoginButton 처럼 글로벌(모든 페이지)에 렌더되는 컴포넌트가 isAdmin 만 쓰려고
// inquiry-service(firestore 포함)를 끌어오면 firestore 가 글로벌 번들에 새어든다.
// 그래서 순수 판별 로직만 여기로 분리한다.

export const ADMIN_EMAIL = 'dbfh1498@gmail.com';

export function isAdmin(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
