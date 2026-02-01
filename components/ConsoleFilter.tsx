'use client';

import { useEffect } from 'react';

export default function ConsoleFilter() {
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const message = String(args[0] || '');
      // Next.js Image 경고 필터링
      if (message.includes('has either width or height modified')) return;
      // Recharts 차트 크기 경고 필터링
      if (message.includes('width') && message.includes('height') && message.includes('chart')) return;
      originalWarn.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
    };
  }, []);

  return null;
}
