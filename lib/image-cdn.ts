// Netlify 이미지 CDN 헬퍼 — 외부 원본 이미지를 표시 크기에 맞게 리사이즈해 전송량 절감.
// 랭킹 카드 아바타: 원본 55~133KB JPEG를 56px로 표시 → w=112(레티나 2x) WebP.
// q=65 — 원형 56px 아바타에선 75와 육안 차이 없이 ~10% 더 작음.
// 허용 도메인은 netlify.toml [images] remote_images에 등록되어 있어야 한다.

const RESIZABLE_PREFIX = 'https://img.lostark.co.kr/';

/**
 * 정사각 썸네일 URL. 프로덕션에서만 /.netlify/images로 재작성 —
 * 로컬 dev(next dev)에는 해당 엔드포인트가 없어 원본을 그대로 쓴다.
 * 허용 도메인이 아닌 URL(로컬 에셋 등)도 원본 그대로 반환.
 */
export function squareThumb(src: string | null, size: number): string | null {
  if (!src || !src.startsWith(RESIZABLE_PREFIX)) return src;
  if (process.env.NODE_ENV !== 'production') return src;
  return `/.netlify/images?url=${encodeURIComponent(src)}&w=${size}&h=${size}&fit=cover&q=65`;
}
