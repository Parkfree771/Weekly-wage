'use client';

import { useEffect } from 'react';

/**
 * 페이지가 visible 상태로 전환될 때 (다른 탭 갔다가 돌아오기 등) 콜백 실행.
 * 콘테스트 좋아요 카운트 등 캐시 무효화 + 갱신에 사용.
 */
export function usePageVisibility(onVisible: () => void): void {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        onVisible();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [onVisible]);
}
