'use client';

import { useEffect } from 'react';

// 사이트 전체에서 자주 사용되는 이미지들
const PRELOAD_IMAGES = [
  // UI 아이콘
  '/icon.png',
  '/home.webp',
  '/icon-moon.svg',
  '/icon-sun.svg',
  '/up.png',
  '/down.png',
  '/gold.webp',

  // 지옥 시뮬레이터 키 이미지
  '/celtic_key_1.webp',
  '/celtic_key_2.webp',
  '/celtic_key_3.webp',
  '/blue_key_1.webp',
  '/blue_key_2.webp',
  '/blue_key_3.webp',
  '/key_1.webp',
  '/key_2.webp',
  '/key_3.webp',

  // 보상 이미지
  '/top-destiny-destruction-stone5.webp',
  '/top-destiny-breakthrough-stone5.webp',
  '/top-abidos-fusion5.webp',
  '/breath-lava5.webp',
  '/djqlfflxltmxhs.webp',
  '/vkfwl.webp',
  '/xmrwo.webp',
  '/cjstkd.webp',
  '/gem-hero.webp',
  '/gem.webp',
  '/duddndgmlrnl.webp',
  '/vkrhltngh.webp',
  '/dnsauddmlehf.webp',
  '/engraving.webp',
  '/destiny-shard-bag-large5.webp',
  '/top-destiny-guardian-stone5.webp',
  '/mococo.webp',

  // 레이드 보스 이미지
  '/cerka.webp',
  '/abrelshud.webp',
  '/illiakan.webp',
  '/ivory-tower.webp',
  '/kazeros.webp',
  '/aegir.webp',
  '/echidna.webp',
  '/behemoth.webp',

  // 재련 재료 이미지
  '/destiny-destruction-stone2.webp',
  '/destiny-guardian-stone2.webp',
  '/destiny-breakthrough-stone2.webp',
  '/destiny-shard-bag-large.webp',
  '/abidos-fusion5.webp',
  '/breath-glacier5.webp',

  // 생명의 거장 재료
  '/wood1.webp',
  '/wood2.webp',
  '/wood3.webp',
  '/rkfn.webp',

  // 세르카 코어
  '/cerka-core.webp',
  '/pulsating-thorn.webp',
];

export default function ImagePreloader() {
  useEffect(() => {
    // 이미지를 순차적으로 로드하되, 메인 스레드 블로킹을 피하기 위해 requestIdleCallback 사용
    const preloadImages = () => {
      PRELOAD_IMAGES.forEach((src, index) => {
        // 이미지 로드를 약간 분산시켜 네트워크 부하 감소
        setTimeout(() => {
          const img = new window.Image();
          img.src = src;
        }, index * 50); // 50ms 간격으로 로드
      });
    };

    // requestIdleCallback이 지원되면 브라우저 idle 시간에 로드
    if ('requestIdleCallback' in window) {
      (window as typeof window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(preloadImages);
    } else {
      // 지원되지 않으면 약간의 지연 후 로드
      setTimeout(preloadImages, 100);
    }
  }, []);

  return null; // 렌더링할 UI 없음
}
