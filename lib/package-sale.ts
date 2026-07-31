// 패키지 판매 기간 / 판매 종료 판정 (앱 src/data/packageBoard.ts 의 같은 로직과 1:1 미러)
//
// 판매 종료는 "표시"만 바꾸는 상태다. 글을 지우거나 계산을 멈추지 않으며,
// 시세 연동·상세 조회는 그대로 동작한다 (과거 패키지와 현재 패키지 비교용).
// firestore 의존이 없는 순수 모듈 — 전역 번들에 firestore 가 새지 않도록 여기서 SDK 를 import 하지 않는다.

type SaleFields = {
  saleStartAt?: any;
  saleEndAt?: any;
  saleClosed?: boolean;
};

/** Firestore Timestamp / ISO 문자열 / Date 무엇이 와도 Date 로 (없거나 깨진 값은 null) */
export function toSaleDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    return null;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** 판매 종료 여부 — 직접 종료 처리했거나, 판매 종료 일시가 지났으면 종료 */
export function isSaleEnded(post: SaleFields | null | undefined): boolean {
  if (!post) return false;
  if (post.saleClosed === true) return true;
  const end = toSaleDate(post.saleEndAt);
  return !!end && end.getTime() <= Date.now();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateTime(d: Date): string {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 판매 기간 문구.
 * 시작·종료 둘 다 있으면 "2026.01.01 00:00 ~ 2026.02.01 23:59",
 * 한쪽만 있으면 그쪽만, 둘 다 없으면 빈 문자열 (= 기간 없이 판매 종료된 글)
 */
export function formatSalePeriod(post: SaleFields | null | undefined): string {
  const start = toSaleDate(post?.saleStartAt);
  const end = toSaleDate(post?.saleEndAt);
  if (!start && !end) return '';
  if (start && end) return `${formatDateTime(start)} ~ ${formatDateTime(end)}`;
  if (start) return `${formatDateTime(start)} ~`;
  return `~ ${formatDateTime(end!)}`;
}

// ─── 등록/수정 폼용 (input type="datetime-local") ───

/** 저장값 → datetime-local 입력값 ("2026-01-01T00:00", 로컬 시간 기준) */
export function toDatetimeLocalValue(value: any): string {
  const d = toSaleDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local 입력값 → Date (빈 값이면 null — Firestore 에 null 로 저장해 기간을 비운다) */
export function fromDatetimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
