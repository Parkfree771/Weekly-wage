'use client';

import { useEffect, useState } from 'react';

// 사이트 전용 보기 배율 — 루트 요소에 CSS zoom을 적용.
// 우리 도메인의 localStorage에만 저장되므로 브라우저 설정·다른 사이트에는 영향 없음.
// 첫 로드 시 번쩍임 방지는 app/layout.tsx <head>의 인라인 스크립트가 담당 (키·범위 동일해야 함).
const ZOOM_KEY = 'site-zoom';
// 하한 60 = body zoom(0.85)과 중첩 시 체감 51%까지 축소 허용 — 사용자가 직접 선택하는 값이라 넓게 열어둠.
// 범위 변경 시 app/layout.tsx head 인라인 스크립트의 범위도 반드시 같이 갱신할 것.
const ZOOM_MIN = 60;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;

// 배율 변경 알림 — ZoomControl 인스턴스 간 동기화 + 레이아웃 재계산(AdLayout 등)이 구독
export const SITE_ZOOM_EVENT = 'site-zoom-change';

// 현재 적용 중인 사이트 배율 (1 = 100%). 레이아웃 계산에서 뷰포트 보정용으로 사용.
export const getSiteZoom = (): number => {
  if (typeof document === 'undefined') return 1;
  const z = parseFloat(document.documentElement.style.zoom || '1');
  return isNaN(z) || z <= 0 ? 1 : z;
};

const applyZoom = (value: number) => {
  const root = document.documentElement;
  if (value === 100) root.style.removeProperty('zoom');
  else root.style.setProperty('zoom', String(value / 100));
};

export default function ZoomControl({ withLabel = false }: { withLabel?: boolean }) {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem(ZOOM_KEY) || '', 10);
    if (!isNaN(saved) && saved >= ZOOM_MIN && saved <= ZOOM_MAX) setZoom(saved);

    const onChange = (e: Event) => setZoom((e as CustomEvent<number>).detail);
    window.addEventListener(SITE_ZOOM_EVENT, onChange);
    return () => window.removeEventListener(SITE_ZOOM_EVENT, onChange);
  }, []);

  const change = (delta: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
    if (next === zoom) return;
    setZoom(next);
    applyZoom(next);
    try {
      localStorage.setItem(ZOOM_KEY, String(next));
    } catch {
      // 저장 불가 환경(시크릿 모드 등)은 세션 내 적용만 유지
    }
    window.dispatchEvent(new CustomEvent(SITE_ZOOM_EVENT, { detail: next }));
  };

  return (
    <div className="zoom-control" title="사이트 보기 배율 (이 사이트에만 적용됩니다)">
      {withLabel && <span className="zoom-control-label">보기 배율</span>}
      <button
        type="button"
        className="zoom-control-btn"
        onClick={() => change(-ZOOM_STEP)}
        disabled={zoom <= ZOOM_MIN}
        aria-label="보기 배율 축소"
      >
        −
      </button>
      <span className="zoom-control-value">{zoom}%</span>
      <button
        type="button"
        className="zoom-control-btn"
        onClick={() => change(ZOOM_STEP)}
        disabled={zoom >= ZOOM_MAX}
        aria-label="보기 배율 확대"
      >
        +
      </button>
    </div>
  );
}
