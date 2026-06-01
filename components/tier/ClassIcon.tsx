'use client';

import { useState } from 'react';

type Props = {
  name: string;
  src?: string;
  size?: number;
};

// 직업(각인) 아이콘. src(public/class-icons/…)가 있으면 사용,
// 없거나 로드 실패 시 직업명 약자 박스로 폴백.
export default function ClassIcon({ name, src, size = 40 }: Props) {
  const [errored, setErrored] = useState(false);

  const box: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 10,
    flexShrink: 0,
    objectFit: 'cover',
  };

  if (errored || !src) {
    return (
      <span
        aria-hidden
        style={{
          ...box,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-primary-light)',
          border: '1px solid var(--border-color)',
          color: 'var(--color-primary)',
          fontSize: Math.max(11, Math.round(size * 0.32)),
          fontWeight: 800,
          letterSpacing: '-0.03em',
        }}
      >
        {name.slice(0, 2)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErrored(true)}
      style={{ ...box, border: '1px solid var(--border-color)' }}
    />
  );
}
