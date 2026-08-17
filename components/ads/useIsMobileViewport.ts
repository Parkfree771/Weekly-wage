'use client';

import { useEffect, useState } from 'react';

// 뷰포트가 기준 폭 이하(모바일 쪽)인지.
// d-md-none 같은 CSS 숨김은 "보이지만 않을 뿐" DOM 마운트는 그대로라, 반대 뷰포트의
// 광고 스크립트 실행·광고 요청이 전부 나간다. 렌더 자체를 뷰포트로 갈라야 낭비가 없다.
// 기준 폭은 그 광고 자리를 숨기는 CSS 브레이크포인트와 반드시 맞춰야 한다 —
// 더 좁게 잡으면 실제로 보이는 뷰포트에서 광고가 안 나가 노출이 손실된다.
// 첫 렌더(하이드레이션 전)는 null — 광고는 어차피 마운트 후에 채워지므로 한 틱 늦어도 손해가 없다.
export default function useIsMobileViewport(maxWidth: number = 991.98): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [maxWidth]);

  return isMobile;
}
