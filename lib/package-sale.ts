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

// ─── 한국 시간(KST) 고정 ───
// 판매 기간은 로아 캐시샵 기준이라 "보는 사람의 시간대"가 아니라 항상 한국 시간이어야 한다.
// getHours() 류 로컬 게터를 쓰면 상세 페이지 ISR(서버=UTC)이 그린 HTML 과 브라우저(KST)가
// 서로 다른 날짜를 내놓는다 — KST 00:00~08:59 마감이 서버에서 하루 전으로 찍혔다.
// 한국은 서머타임이 없어 오프셋이 항상 +09:00 이다.
const KST_OFFSET = '+09:00';

const kstFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23', // hour12:false 는 자정을 24 로 내놓는 구현이 있다
});

type KstParts = { y: string; mo: string; d: string; h: string; mi: string };

function kstParts(date: Date): KstParts {
  const p: Record<string, string> = {};
  for (const { type, value } of kstFormatter.formatToParts(date)) p[type] = value;
  return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute };
}

function formatDateTime(d: Date): string {
  const { y, mo, d: day, h, mi } = kstParts(d);
  return `${y}.${mo}.${day} ${h}:${mi}`;
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

/** 배지용 짧은 마감일 — "08.15". 연도·시각을 빼서 배지 한 칸에 들어간다 */
export function formatSaleEndShort(post: SaleFields | null | undefined): string {
  const d = toSaleDate(post?.saleEndAt);
  if (!d) return '';
  const { mo, d: day } = kstParts(d);
  return `${mo}.${day}`;
}

/**
 * 날짜만 남긴 판매 기간 — "2026.06.01 ~ 2026.08.15".
 * 배지에서 밀려난 전체 기간을 메타 줄에 작게 보여주는 용도라 시:분을 뺐다.
 */
export function formatSalePeriodDateOnly(post: SaleFields | null | undefined): string {
  const start = toSaleDate(post?.saleStartAt);
  const end = toSaleDate(post?.saleEndAt);
  const fmt = (d: Date) => {
    const { y, mo, d: day } = kstParts(d);
    return `${y}.${mo}.${day}`;
  };
  if (!start && !end) return '';
  if (start && end) return `${fmt(start)} ~ ${fmt(end)}`;
  if (start) return `${fmt(start)} ~`;
  return `~ ${fmt(end!)}`;
}

// ─── 등록/수정 폼용 (input type="datetime-local") ───

/** 저장값 → datetime-local 입력값 ("2026-01-01T00:00", 한국 시간 기준) */
export function toDatetimeLocalValue(value: any): string {
  const d = toSaleDate(value);
  if (!d) return '';
  const { y, mo, d: day, h, mi } = kstParts(d);
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

/**
 * datetime-local 입력값 → Date (빈 값이면 null — Firestore 에 null 로 저장해 기간을 비운다).
 * 입력칸에 적은 값은 항상 한국 시간으로 읽는다 — 오프셋을 안 붙이면 new Date 가
 * "실행한 기기의 로컬 시간"으로 해석해서, 해외/서버 시간대 기기로 등록하면 9시간 밀린다.
 */
export function fromDatetimeLocalValue(value: string): Date | null {
  if (!value) return null;
  // 브라우저는 보통 "YYYY-MM-DDTHH:mm" 을 주지만 초까지 주는 경우도 있다
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  const d = new Date(`${normalized}${KST_OFFSET}`);
  return isNaN(d.getTime()) ? null : d;
}
