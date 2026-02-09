/**
 * AI 배경 제거 후 색상 기반 후처리 (하이브리드)
 *
 * AI가 실수로 지운 무기 이펙트/오오라를 배경색과 비교하여 복원한다.
 * - AI가 투명 처리한 픽셀 중, 원본 색상이 배경색(#15181d)과 다르면 복원
 * - 배경색과 비슷한 픽셀은 투명 유지
 */

const BG_COLOR = { r: 0x15, g: 0x18, b: 0x1d }; // #15181d

/** 두 색상 간 유클리드 거리 */
function colorDistance(r: number, g: number, b: number): number {
  return Math.sqrt(
    (r - BG_COLOR.r) ** 2 +
    (g - BG_COLOR.g) ** 2 +
    (b - BG_COLOR.b) ** 2,
  );
}

/** Blob → HTMLImageElement */
function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패'));
    };
    img.src = url;
  });
}

/**
 * AI 결과를 원본과 비교하여 이펙트를 복원한다.
 *
 * @param originalBlob - 원본 이미지 (배경 포함)
 * @param aiResultBlob - AI 배경 제거 결과
 * @param threshold - 배경색 판별 임계값 (낮을수록 엄격, 기본 55)
 */
export async function refineBackgroundRemoval(
  originalBlob: Blob,
  aiResultBlob: Blob,
  threshold = 55,
): Promise<Blob> {
  const [origImg, aiImg] = await Promise.all([
    loadImageFromBlob(originalBlob),
    loadImageFromBlob(aiResultBlob),
  ]);

  const w = aiImg.width;
  const h = aiImg.height;

  // AI 결과 캔버스
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(aiImg, 0, 0);
  const aiData = ctx.getImageData(0, 0, w, h);

  // 원본 캔버스
  const origCanvas = document.createElement('canvas');
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext('2d')!;
  origCtx.drawImage(origImg, 0, 0, w, h);
  const origData = origCtx.getImageData(0, 0, w, h);

  const px = aiData.data;
  const origPx = origData.data;

  for (let i = 0; i < px.length; i += 4) {
    const aiAlpha = px[i + 3];

    // AI가 투명 처리한 픽셀만 검사
    if (aiAlpha < 128) {
      const r = origPx[i];
      const g = origPx[i + 1];
      const b = origPx[i + 2];
      const dist = colorDistance(r, g, b);

      if (dist > threshold) {
        // 배경색이 아닌 픽셀 → 복원 (무기 이펙트, 오오라 등)
        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
        // 배경색과 멀수록 불투명하게 (부드러운 전환)
        px[i + 3] = Math.min(255, Math.round(((dist - threshold) / threshold) * 255));
      }
      // dist <= threshold → 배경색이므로 투명 유지
    }
  }

  ctx.putImageData(aiData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob 실패'))),
      'image/png',
    );
  });
}
