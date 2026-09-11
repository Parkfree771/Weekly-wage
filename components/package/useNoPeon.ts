'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * 페온 가치 제거 — 뷰어 설정.
 * 페온을 0골드로 쳐서 젬의 페온 몫, 티켓(지옥/나락) 안의 팔찌·젬 페온, 그리고 값 전체가 페온인
 * 구성품(페온·어빌리티스톤 키트)을 한꺼번에 0으로 만든다.
 * "이 글의 설정"이 아니라 "내 설정"이라 localStorage 에 두고, 갤러리 카드·상세·수정 폼이 같은 값을 본다.
 * 어느 한 곳에서 바꾸면 같은 화면의 다른 카드도 즉시 따라간다 (window 이벤트).
 * 상세는 SSR 이라 초기값에서 읽으면 서버/클라 첫 화면이 어긋난다 — 마운트 뒤에 읽는다 (ReactionBar 와 같은 이유).
 */
const LS_KEY = 'pkgNoPeon';
const EVT = 'pkg-no-peon-change';

export function useNoPeon(): [boolean, (v: boolean) => void] {
  const [noPeon, setNoPeon] = useState(false);

  useEffect(() => {
    try { setNoPeon(localStorage.getItem(LS_KEY) === '1'); } catch { /* 사생활 모드 */ }
    const onChange = (e: Event) => setNoPeon(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, []);

  const set = useCallback((v: boolean) => {
    try { localStorage.setItem(LS_KEY, v ? '1' : '0'); } catch { /* 사생활 모드 */ }
    window.dispatchEvent(new CustomEvent<boolean>(EVT, { detail: v }));
  }, []);

  return [noPeon, set];
}
