import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase-client';

/**
 * 투명 처리된 아바타 이미지를 Firebase Storage에 업로드하고 URL 반환.
 * 경로: avatars/{uid}_{timestamp}.png
 */
export async function uploadTransparentAvatar(
  blob: Blob,
  uid: string,
): Promise<string> {
  const filename = `avatars/${uid}_${Date.now()}.png`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob, { contentType: 'image/png' });
  return getDownloadURL(storageRef);
}
