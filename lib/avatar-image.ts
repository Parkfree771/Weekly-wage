// 아바타 캡쳐 업로드 (브라우저 전용).
//
// 올리기 전에 브라우저에서 WebP 로 줄인다 — 원본 캡쳐(PNG 수 MB)를 그대로 올리면 저장·전송량이 금방 찬다.
//   원본: 긴 변 1920px · 품질 0.88 (상세·크게 보기 — 캡쳐가 잘 보이는 게 핵심이라 FHD 그대로)
//   썸네일: 긴 변 800px · 품질 0.8 (갤러리 카드·착장 목록 — 레티나에서도 흐리지 않게)
// 착장 사진(keepOriginal)은 긴 변이 1920px 이하면 파일을 다시 굽지 않고 그대로 올린다 — 착장 캡쳐는 보통
// 캐릭터만 잘라 300×500 안팎이라 용량이 작고, 다시 구우면 크게 보기에서 뭉개진다. 1920 을 넘는 것만 줄인다.
// 업로드는 브라우저가 Firebase Storage 에 바로 한다 — 네트리파이 함수를 거치지 않는다.
// firebase/storage 는 올릴 때만 필요하므로 지연 import 한다(보기만 하는 방문자는 받지 않는다).

import type { StoredImage } from '@/types/package';

const FULL_MAX = 1920;
const FULL_QUALITY = 0.88;
const THUMB_MAX = 800;
const THUMB_QUALITY = 0.8;

/** 올릴 수 있는 원본 파일 상한 — 줄이기 전 크기. 캡쳐 PNG 는 보통 2~8MB */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // 일부 브라우저가 특정 형식을 못 읽으면 img 로 다시 시도
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 원본 안의 잘라낼 영역 — 0~1 비율 (x·y 는 왼쪽 위, w·h 는 폭·높이) */
export type CropRect = { x: number; y: number; w: number; h: number };

function encode(
  src: ImageBitmap | HTMLImageElement,
  max: number,
  quality: number,
  crop?: CropRect,
): Promise<{ blob: Blob; w: number; h: number }> {
  const iw = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const ih = 'naturalHeight' in src ? src.naturalHeight : src.height;
  // 자를 영역(원본 px). 없으면 전체
  const sx = crop ? Math.round(crop.x * iw) : 0;
  const sy = crop ? Math.round(crop.y * ih) : 0;
  const sw = crop ? Math.max(1, Math.round(crop.w * iw)) : iw;
  const sh = crop ? Math.max(1, Math.round(crop.h * ih)) : ih;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas 를 쓸 수 없습니다.'));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, w, h }) : reject(new Error('이미지 변환에 실패했습니다.'))),
      'image/webp',
      quality,
    );
  });
}

/**
 * 파일 → 원본·썸네일 두 장 (썸네일은 항상 WebP).
 * thumbCrop 을 주면 썸네일만 그 영역으로 자른다(대표 사진의 9:16 틀). 원본은 항상 전체 그대로.
 * keepOriginal 이면 긴 변 1920px 이하인 원본은 파일 그대로 둔다.
 */
export async function compressImage(file: File, thumbCrop?: CropRect, keepOriginal = false) {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 올릴 수 있습니다.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('이미지가 너무 큽니다 (20MB 이하).');
  const src = await loadBitmap(file);
  try {
    const iw = 'naturalWidth' in src ? src.naturalWidth : src.width;
    const ih = 'naturalHeight' in src ? src.naturalHeight : src.height;
    const asIs = keepOriginal && Math.max(iw, ih) <= FULL_MAX;
    const [full, thumb] = await Promise.all([
      asIs ? Promise.resolve({ blob: file as Blob, w: iw, h: ih }) : encode(src, FULL_MAX, FULL_QUALITY),
      encode(src, THUMB_MAX, THUMB_QUALITY, thumbCrop),
    ]);
    return { full, thumb };
  } finally {
    if ('close' in src) src.close();
  }
}

/**
 * 압축 후 Storage 에 올린다.
 * @param dir 저장 폴더 — 'avatarPackages/{uid}' 또는 'avatarLooks/{postId}/{uid}' (storage.rules 와 맞춘다)
 */
export async function uploadAvatarImage(
  file: File, dir: string, thumbCrop?: CropRect, keepOriginal = false,
): Promise<StoredImage> {
  const { full, thumb } = await compressImage(file, thumbCrop, keepOriginal);
  const [{ getStorage, ref, uploadBytes, getDownloadURL }, { app }] = await Promise.all([
    import('firebase/storage'),
    import('@/lib/firebase-client'),
  ]);
  const storage = getStorage(app);
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // 원본을 그대로 둔 경우 형식(png·jpeg 등)이 파일 따라 간다
  const fullType = full.blob.type;
  const path = `${dir}/${stamp}.${fullType.split('/')[1]}`;
  const thumbPath = `${dir}/${stamp}_t.webp`;
  // 한 번 올린 파일은 바뀌지 않는다 — 브라우저가 길게 캐시해도 된다
  const cacheControl = 'public, max-age=31536000, immutable';
  const [fullRef, thumbRef] = [ref(storage, path), ref(storage, thumbPath)];
  await Promise.all([
    uploadBytes(fullRef, full.blob, { contentType: fullType, cacheControl }),
    uploadBytes(thumbRef, thumb.blob, { contentType: 'image/webp', cacheControl }),
  ]);
  const [url, thumbUrl] = await Promise.all([getDownloadURL(fullRef), getDownloadURL(thumbRef)]);
  return { url, path, thumbUrl, thumbPath, w: full.w, h: full.h };
}

/** 이미지 두 장 삭제 — 실패해도 글 삭제를 막지 않는다(고아 파일은 용량만 차지한다) */
export async function deleteAvatarImage(img: StoredImage | null | undefined): Promise<void> {
  if (!img) return;
  try {
    const [{ getStorage, ref, deleteObject }, { app }] = await Promise.all([
      import('firebase/storage'),
      import('@/lib/firebase-client'),
    ]);
    const storage = getStorage(app);
    await Promise.allSettled([
      deleteObject(ref(storage, img.path)),
      deleteObject(ref(storage, img.thumbPath)),
    ]);
  } catch {
    // 무시
  }
}
