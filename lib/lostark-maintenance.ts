// 로아 서버 정기 점검(수요일 06:00~10:00 KST) 판정.
// 점검 중엔 로아 API 가 응답하지 않으니 외부 호출을 아예 하지 않는다 —
// 매시 시세 수집(app/api/cron/collect-prices)과 같은 창이다.
export function isLostArkMaintenance(now: Date = new Date()): boolean {
  // 기기·서버 시간대와 무관하게 UTC+9 로 계산한다 (getUTC* 는 로컬 시간대를 타지 않는다)
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  // 수요일 06:00 ~ 09:59 (10:00 부터 다시 요청)
  return kst.getUTCDay() === 3 && minutes >= 6 * 60 && minutes < 10 * 60;
}
