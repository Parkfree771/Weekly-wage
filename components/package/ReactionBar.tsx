'use client';

// 반응(따봉·흠) — 비로그인 포함 1글 1표, 둘 중 하나만. 갤러리 카드와 상세(댓글 위)가 같이 쓴다.
//
// 저장 구조:
// 카운트는 Neon package_stats(/api/package/stats, react 응답의 stats). 부모가 넘기는 likeCount/sosoCount 는
// ISR 스냅샷 → 최신 집계 순으로 바뀔 수 있고, 여기서는 "가장 최근에 받은 서버 값(base)" 위에
// "아직 서버에 안 보낸 내 표의 증감" 만 더해 그린다. 서버 값에는 이미 보낸 내 표가 들어 있으므로
// 이 둘을 섞어도 이중 계산이 안 난다.
// "내가 뭘 눌렀는지"는 서버에 묻지 않는다 — 화면용은 localStorage, 중복 방지용 진실은 서버의
// httpOnly 쿠키(/api/package/react).
// 클릭은 즉시 화면에 반영하고, 연타가 멎은 뒤(REACT_FLUSH_MS) 최종 상태 한 번만 보낸다 —
// "따봉→취소→따봉" 이 요청 1회·쓰기 0회가 된다.

import { useEffect, useRef, useState } from 'react';
import ReactionLottie, { type ReactionLottieHandle } from '@/components/package/ReactionLottie';
import styles from './ReactionBar.module.css';

// 순서 고정: 따봉 → 흠. title 은 마우스 올렸을 때 뜨는 말풍선
const REACTIONS = [
  { key: 'like', label: '따봉', tip: '살 만하다', path: '/lottie/react-like.json' },
  { key: 'soso', label: '흠', tip: '글쎄', path: '/lottie/react-soso.json' },
] as const;
export type ReactionKey = (typeof REACTIONS)[number]['key'];

// 로티 색 통일 — "노란 이모지" 한 가지 톤. 선은 글자색(라이트 남색 / 다크 밝은색), 채움은 전부 이모지 노랑.
// 따봉(wired 267)·흠(wired 2340) 두 파일의 원본색을 같은 두 값으로 모은다.
export const EMOJI_YELLOW = '#ffc738';
// 24px 로 줄이면 원본 선이 실처럼 얇아져 표정이 안 읽힌다 — 선만 1.6배 굵힌다
const REACTION_STROKE = 1.6;
const REACTION_RECOLOR: Record<string, string> = {
  // 선 — 카드 안에서는 --gc-text, 밖(상세)에서는 --text-primary
  'rgb(18,19,49)': 'var(--gc-text, var(--text-primary))',
  // 채움
  'rgb(255,199,56)': EMOJI_YELLOW,          // 흠 얼굴
  'rgb(44,165,141)': EMOJI_YELLOW,          // 따봉 엄지
  'rgb(249,201,192)': EMOJI_YELLOW,         // 따봉 손
};

const LS_KEY = 'pkgRx';
const REACT_FLUSH_MS = 250;
type ReactionDelta = { like: number; soso: number };
type Counts = { like: number; soso: number };

function readMyReactions(): Record<string, ReactionKey> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeMyReaction(postId: string, r: ReactionKey | null) {
  try {
    const all = readMyReactions();
    if (r) all[postId] = r;
    else delete all[postId];
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* 사생활 모드 등 — 화면 상태만으로 동작 */
  }
}
// a 표에서 b 표로 바뀔 때 카운트 증감
const reactionDiff = (a: ReactionKey | null, b: ReactionKey | null): ReactionDelta => ({
  like: Number(b === 'like') - Number(a === 'like'),
  soso: Number(b === 'soso') - Number(a === 'soso'),
});

type Props = {
  postId: string;
  likeCount: number;
  sosoCount: number;
  /** 로티 한 변(px). 기본 24 — 갤러리 카드 알약 크기 */
  size?: number;
  /** 알약 안에 "따봉"/"흠" 글자를 같이 쓴다 (상세처럼 여유가 있는 곳) */
  showLabels?: boolean;
  className?: string;
};

export default function ReactionBar({ postId, likeCount, sosoCount, size = 24, showLabels = false, className }: Props) {
  // 상세는 SSR 이라 localStorage 를 초기값에서 읽으면 서버/클라 첫 화면이 어긋난다 — 마운트 뒤에 읽는다
  const [mine, setMine] = useState<ReactionKey | null>(null);
  // 서버가 react 응답으로 준 최신 카운트 — 부모 prop 보다 새 값이라 그쪽을 우선한다.
  // prop 이 바뀌면(갤러리가 /api/package/stats 로 덮어쓴 경우) 다시 prop 을 따른다.
  const [serverCounts, setServerCounts] = useState<{ forProps: string; counts: Counts } | null>(null);
  // 아직 서버에 반영 안 된 내 표의 증감 = diff(보낸 표, 지금 표). 서버 값 위에 이것만 더한다.
  const [pending, setPending] = useState<ReactionDelta>({ like: 0, soso: 0 });
  const mineRef = useRef<ReactionKey | null>(null);
  const syncedRef = useRef<ReactionKey | null>(null); // 서버에 보냈다고 믿는 표
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const lottieRefs = useRef<Partial<Record<ReactionKey, ReactionLottieHandle | null>>>({});

  const flush = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const from = syncedRef.current;
    const target = mineRef.current;
    if (from === target) return;
    syncedRef.current = target;
    setPending(reactionDiff(target, mineRef.current));
    // keepalive — 페이지를 떠나는 중이어도 요청은 살아남는다
    fetch('/api/package/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, reaction: target }),
      keepalive: true,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.ok || !mountedRef.current) return;
        // 서버 최신값으로 되맞춘다 — 내 표(target)까지 이미 들어 있는 숫자다
        const st = json.stats;
        if (st && typeof st.likeCount === 'number' && typeof st.sosoCount === 'number') {
          setServerCounts({ forProps: `${likeCount}:${sosoCount}`, counts: { like: st.likeCount, soso: st.sosoCount } });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    mountedRef.current = true;
    // 내 표 복원 — 글이 바뀌면(클라이언트 내비게이션) 그 글의 표로
    const saved = readMyReactions()[postId] ?? null;
    mineRef.current = saved;
    syncedRef.current = saved;
    setMine(saved);
    setPending({ like: 0, soso: 0 });
    setServerCounts(null);
    return () => {
      mountedRef.current = false;
      // 보내지 못한 표가 남아 있으면(페이지 이동·언마운트) 바로 보낸다
      if (timerRef.current) flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleClick = (key: ReactionKey) => {
    const prev = mineRef.current;
    const next = prev === key ? null : key;
    if (next) lottieRefs.current[key]?.play();
    mineRef.current = next;
    setMine(next);
    setPending(reactionDiff(syncedRef.current, next));
    writeMyReaction(postId, next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, REACT_FLUSH_MS);
  };

  // 부모 prop 이 바뀌었으면 서버 응답값은 낡은 것 — prop 을 base 로 쓴다
  const base: Counts =
    serverCounts && serverCounts.forProps === `${likeCount}:${sosoCount}`
      ? serverCounts.counts
      : { like: likeCount, soso: sosoCount };
  const counts: Record<ReactionKey, number> = {
    like: Math.max(0, base.like + pending.like),
    soso: Math.max(0, base.soso + pending.soso),
  };

  return (
    <div className={`${styles.reactions} ${className ?? ''}`} data-nonav>
      {REACTIONS.map((r) => {
        const on = mine === r.key;
        const count = counts[r.key];
        return (
          <button
            key={r.key}
            type="button"
            className={`${styles.reactionBtn} ${on ? styles.reactionBtnOn : ''}`}
            onClick={() => handleClick(r.key)}
            aria-pressed={on}
            aria-label={`${r.label} ${count}`}
            title={r.tip}
          >
            {/* 평소엔 첫 프레임에 멈춰 있고 누를 때만 한 번 재생 — 카드 여럿이 동시에 움직이지 않게 */}
            <ReactionLottie
              ref={(h) => { lottieRefs.current[r.key] = h; }}
              path={r.path}
              size={size}
              recolor={REACTION_RECOLOR}
              strokeScale={REACTION_STROKE}
            />
            {showLabels && <span className={styles.reactionLabel}>{r.label}</span>}
            <span className={styles.reactionCount}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
