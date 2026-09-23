'use client';

import { useSyncExternalStore } from 'react';
import { isAzenaEventActive } from '@/lib/azena-blessing';

const subscribe = () => () => {};

/**
 * 한가위 1+1 행사 중인지 — 서버 HTML 은 늘 평소 표기로 내고(ISR 캐시가 행사 전후로 어긋나 하이드레이션이
 * 깨지지 않게), 클라이언트가 오늘 날짜로 판단해 곧바로 바꿔 그린다.
 */
export function useAzenaEventActive(): boolean {
  return useSyncExternalStore(subscribe, () => isAzenaEventActive(), () => false);
}
