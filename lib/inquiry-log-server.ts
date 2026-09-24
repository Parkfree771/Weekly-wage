// 문의 처리 내역 서버 읽기 — /api/inquiry-log(공개) 와 /api/feedback(관리자 GET)이 같이 쓴다.
import { getAdminFirestore } from './firebase-admin';
import type { InquiryLogEntry } from './inquiry-log';

export const INQUIRY_LOG_COLLECTION = 'inquiryLog';

export async function readInquiryLog(): Promise<InquiryLogEntry[]> {
  const snap = await getAdminFirestore().collection(INQUIRY_LOG_COLLECTION).get();
  const items = snap.docs.map((d) => {
    const v = d.data();
    return {
      id: d.id,
      page: v.page,
      requestedAt: v.requestedAt,
      resolvedAt: v.resolvedAt,
      request: v.request,
      reply: v.reply,
      ...(v.feedbackId ? { feedbackId: v.feedbackId } : {}),
    } as InquiryLogEntry;
  });
  // 최신 문의가 위 — 같은 날이면 늦게 처리한 것이 위
  return items.sort(
    (a, b) => b.requestedAt.localeCompare(a.requestedAt) || b.resolvedAt.localeCompare(a.resolvedAt),
  );
}
