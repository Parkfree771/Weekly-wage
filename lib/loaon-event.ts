// 로아온 섬머 2026 이벤트 배너 설정
// 일정/URL/이미지가 바뀌면 이 파일만 수정하면 됨.

export const LOAON_EVENT = {
  // 방송 시작: 2026-06-20(토) 16:00 KST (타이머 카운트다운 목표)
  startsAt: new Date('2026-06-20T16:00:00+09:00').getTime(),
  // 노출 종료: 2026-06-21(일) 00:00 KST — 방송 당일이 지나면 배너 자동 숨김
  hidesAt: new Date('2026-06-21T00:00:00+09:00').getTime(),
  // 클릭 시 이동할 공식 이벤트 페이지
  url: 'https://lostark.game.onstove.com/Event/Promotion/LOAON/260603',
  // public 정적 webp (next.config.js의 /:path*.webp 규칙으로 1년 immutable 캐시)
  image: '/loaon-summer-2026.webp',
  // 사람이 읽는 일시 라벨 (축약)
  dateLabel: '6/20(토) 16:00',
} as const;

export type LoaOnStatus = 'countdown' | 'live' | 'ended';

/** 현재 시각(ms) 기준 배너 상태. ended면 렌더하지 않음. */
export function getLoaOnStatus(now: number): LoaOnStatus {
  if (now >= LOAON_EVENT.hidesAt) return 'ended';
  if (now >= LOAON_EVENT.startsAt) return 'live';
  return 'countdown';
}

/** 방송 시작까지 남은 시간을 일/시/분/초로 분해 (이미 시작했으면 전부 0). */
export function getTimeLeft(now: number) {
  const diff = Math.max(0, LOAON_EVENT.startsAt - now);
  const sec = Math.floor(diff / 1000);
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
  };
}
