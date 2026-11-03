'use client';

// 대표 사진 틀 맞추기 — 사진 위에 9:16 틀을 띄우고, 끌어서 옮기고 슬라이더로 크기를 바꾼다.
// 결과(0~1 비율 영역)는 목록 썸네일을 자를 때만 쓴다. 원본은 잘리지 않는다.
// 어떻게 캡쳐했든 유저가 머리부터 발까지 틀에 넣으면 목록 칸이 전부 같은 비율로 맞는다.

import { useEffect, useRef, useState } from 'react';
import type { CropRect } from '@/lib/avatar-image';
import av from './Avatar.module.css';

/** 목록 칸 비율 (가로:세로 = 9:16) */
export const COVER_RATIO = 9 / 16;

/** 처음 틀 — 가능한 가장 큰 9:16, 가로 가운데 · 위쪽 붙임(머리가 잘리지 않게) */
export function defaultCrop(iw: number, ih: number): CropRect {
  const fwPx = Math.min(iw, ih * COVER_RATIO);
  const fhPx = fwPx / COVER_RATIO;
  return { x: (iw - fwPx) / 2 / iw, y: 0, w: fwPx / iw, h: fhPx / ih };
}

type Props = {
  url: string;
  value: CropRect | null;
  onChange: (crop: CropRect) => void;
};

export default function CoverCropper({ url, value, onChange }: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // 사진이 바뀌면 크기를 다시 잰다
  useEffect(() => { setSize(null); }, [url]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const next = { w: img.naturalWidth, h: img.naturalHeight };
    setSize(next);
    if (!value) onChange(defaultCrop(next.w, next.h));
  };

  // 틀 폭(원본 px) 한도 — 사진 밖으로 못 나간다
  const maxWpx = size ? Math.min(size.w, size.h * COVER_RATIO) : 0;
  const minWpx = maxWpx * 0.3;
  const crop = value;
  const wPx = crop && size ? crop.w * size.w : 0;

  const clamp = (c: CropRect): CropRect => ({
    ...c,
    x: Math.min(Math.max(0, c.x), 1 - c.w),
    y: Math.min(Math.max(0, c.y), 1 - c.h),
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!crop) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !crop || !box) return;
    const r = box.getBoundingClientRect();
    onChange(clamp({ ...crop, x: d.x + (e.clientX - d.px) / r.width, y: d.y + (e.clientY - d.py) / r.height }));
  };
  const onPointerUp = () => { drag.current = null; };

  // 크기 — 가운데를 지키며 키우고 줄인다
  const onResize = (nextWpx: number) => {
    if (!crop || !size) return;
    const w = nextWpx / size.w;
    const h = nextWpx / COVER_RATIO / size.h;
    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;
    onChange(clamp({ x: cx - w / 2, y: cy - h / 2, w, h }));
  };

  return (
    <div className={av.cropper}>
      <div ref={boxRef} className={av.cropBox}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="대표 사진" className={av.cropImg} onLoad={onImgLoad} draggable={false} />
        {crop && size && (
          <div
            className={av.cropFrame}
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="presentation"
          />
        )}
      </div>
      {crop && size && (
        <div className={av.cropControls}>
          <span className={av.cropLabel}>틀 크기</span>
          <input
            type="range"
            min={Math.round(minWpx)}
            max={Math.round(maxWpx)}
            value={Math.round(wPx)}
            onChange={(e) => onResize(Number(e.target.value))}
            aria-label="틀 크기"
          />
          <button type="button" className={av.textBtn} onClick={() => onChange(defaultCrop(size.w, size.h))}>처음대로</button>
        </div>
      )}
    </div>
  );
}
