// 문의 처리 내역 — 문의하기 모달 하단 "최근 반영된 요청"에 보여주는 공개 목록.
//
// 익명 문의라 보낸 사람이 결과를 알 방법이 없어서, 처리한 건을 요약해 알린다.
// 원문은 그대로 옮기지 않는다 — request 는 무엇을 원했는지 한 줄, reply 는 무엇을 했는지.
// 데이터는 Firestore inquiryLog 컬렉션, 관리자 의견함(/admin/feedback)에서 쓴다.
// 읽기는 GET /api/inquiry-log (durable 30일 + 쓰기 시 태그 퍼지).
// firestore 의존이 없는 순수 모듈 — 글로벌 컴포넌트(InquiryButton)가 import 한다.

export type InquiryLogEntry = {
  id: string;
  /** 문의가 들어온 페이지 이름 */
  page: string;
  /** 문의일 YYYY-MM-DD */
  requestedAt: string;
  /** 처리일 YYYY-MM-DD */
  resolvedAt: string;
  request: string;
  reply: string;
  /** 연결된 의견함 문의 id — 직접 추가한 항목은 없다 */
  feedbackId?: string;
};

export type InquiryLogInput = Omit<InquiryLogEntry, 'id'>;

export const INQUIRY_LOG_CACHE_TAG = 'inquiry-log';

/** 로스트아크 하루 기준(오전 6시 경계) 날짜 키 — 새벽 1시 문의는 전날로 친다 */
export function gameDateKey(ms: number): string {
  const d = new Date(ms + 9 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 문의 경로 → 공개 목록에 적을 페이지 이름 (없으면 경로 그대로 — 의견함에서 고친다) */
const PAGE_LABELS: Record<string, string> = {
  '/': '사이트 전체',
  '/cathedral': '지평의 성당',
  '/package': '패키지 효율',
  '/package/register': '패키지 등록',
  '/mypage': '숙제 체크',
  '/life-master': '생활 제작',
  '/hell-reward': '지옥 보상',
  '/weekly-gold': '주간 골드',
  '/expedition-gold': '원정대 수급 골드',
  '/engraving': '각인',
};

export function pageLabelOf(path: string): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  if (path.startsWith('/package/')) return '패키지 효율';
  return path;
}

// ─── 클라이언트 읽기 (모달이 열릴 때만, 세션 동안 한 번) ───
let cached: InquiryLogEntry[] | null = null;
let pending: Promise<InquiryLogEntry[]> | null = null;

export function fetchInquiryLog(): Promise<InquiryLogEntry[]> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = fetch('/api/inquiry-log')
    .then((r) => (r.ok ? r.json() : { items: [] }))
    .then((d) => {
      cached = (d.items as InquiryLogEntry[]) || [];
      return cached;
    })
    .catch(() => [] as InquiryLogEntry[])
    .finally(() => {
      pending = null;
    });
  return pending;
}
