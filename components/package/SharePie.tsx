'use client';

// 구성품 가치 비중 원(파이) — 패키지 상세 페이지 댓글 위 섹션.
// 라이브러리 없이 SVG 로 그린다(부채꼴 몇 개뿐이라 recharts 를 여기까지 끌어올 이유가 없다).
//
// 조각 색은 그 아이템 그림의 색(lib/package-icon-tints.ts) — 젬은 보라, 파괴석은 빨강.
// 조각 안에 그 아이템 그림과 % 를 넣는다(자리가 되는 조각만 — 좁으면 % → 그림 순으로 뺀다).
// 색이 비슷한 이웃(티켓·각인서·야금술은 다 주황 계열)은 조각 사이 틈과 안의 그림이 가른다.
//
// 원엔 큰 순으로 여섯 조각까지만 두고 나머지는 "기타" 한 조각으로 접는다.
// 조각이 많아지면 가는 조각끼리 구분이 안 되고, 어차피 범례가 전부 들고 있다.

import { useState } from 'react';
import PeonBadge from '@/components/package/PeonBadge';
import { formatNumber } from '@/lib/package-shared';
import styles from './SharePie.module.css';

export type ShareRow = {
  key: string;
  name: string;
  icon: string | null;
  /** 기준값 안에서의 골드 (3+보너스는 구성품 3회분) */
  sub: number;
  pct: number;
  tint?: string;
  peon: boolean;
};

type Props = {
  /** 큰 순으로 정렬된 행 — 비중 합이 100 */
  rows: ShareRow[];
  /** 기준 총액 (골드) */
  basis: number;
  /** 기준 이름 — "구성품 가치" / "묶음 가치 (구성품 3회 + 보너스)" 등 */
  basisLabel: string;
  noPeon: boolean;
};

const MAX_SLICES = 6;
const OTHER_KEY = '__other';

const C = 100;   // 중심 (viewBox 200)
const R = 96;    // 반지름

/** 시계 12시부터 시계방향 부채꼴 — pct 는 0~100 */
function wedgePath(startPct: number, endPct: number): string {
  const a0 = (startPct / 100) * Math.PI * 2 - Math.PI / 2;
  const a1 = (endPct / 100) * Math.PI * 2 - Math.PI / 2;
  const x0 = C + R * Math.cos(a0);
  const y0 = C + R * Math.sin(a0);
  const x1 = C + R * Math.cos(a1);
  const y1 = C + R * Math.sin(a1);
  const large = endPct - startPct > 50 ? 1 : 0;
  return `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

function fmtPct(pct: number): string {
  if (pct < 1) return '<1%';
  return pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
}

/** 조각 안 그림 크기(viewBox 단위 — 원이 320px 로 그려지니 1.6배가 실제 px) — 몫이 클수록 크게. 2.5% 미만은 안 넣는다 */
function iconSize(pct: number): number {
  if (pct >= 40) return 44;
  if (pct >= 25) return 38;
  if (pct >= 12) return 29;
  if (pct >= 8) return 21;   // 10% 안팎이 여기 — 24 는 % 글자까지 넣으면 조각에 딱 맞아 답답했다
  if (pct >= 5) return 17;   // 7% 안팎 — 21 이면 테두리 쪽에서 이웃 작은 조각 그림과 살짝 겹쳤다
  if (pct >= 2.5) return 13;
  return 0;
}

/**
 * 그림을 놓을 반지름 — 부채꼴은 중심으로 갈수록 좁아지므로, 그림이 조각 폭에 들어가는 지점까지 밀어낸다.
 * 반지름 r 에서 조각의 호 폭은 2πr·pct/100 — 그 폭이 그림 변(여유 10%)보다 커야 안 잘린다.
 * 큰 조각은 살 중간(0.55R)에 앉고, 작은 조각일수록 바깥으로 나가 테두리 안쪽까지 간다.
 * 테두리 안쪽에서도 안 들어가면 그림을 거기 맞게 줄인다(안 보이는 것보단 작게라도 보이게).
 */
function iconPlace(pct: number, size: number): { r: number; size: number } {
  const k = (2 * Math.PI * pct) / 100;   // 반지름 1 당 호 폭
  const rMax = R - size / 2 - 3;           // 이보다 나가면 테두리를 넘는다
  const rFit = (size * 1.1) / k;
  // 작은 조각일수록 바깥으로 — 작은 조각들은 중심 근처에 몰려 서로 겹치므로 아예 테두리 쪽에 세운다.
  // (폭이 들어가는 지점(rFit)과 별개로, 몫에 따른 최소 반지름을 둔다)
  const rBase = pct >= 25 ? 0.55 * R : pct >= 12 ? 0.64 * R : pct >= 6 ? 0.76 * R : rMax;
  if (rFit <= rMax) return { r: Math.min(rMax, Math.max(rBase, rFit)), size };
  // 테두리 안쪽(r = R - s/2 - 3)에서 딱 들어가는 크기: s·1.1/k = R - s/2 - 3
  const s = Math.max(12, Math.floor((R - 3) / (1.1 / k + 0.5)));
  return { r: R - s / 2 - 3, size: s };
}

export default function SharePie({ rows, basis, basisLabel, noPeon }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  // 조각: 상위 MAX_SLICES 개 + 나머지를 접은 "기타"
  const head = rows.slice(0, MAX_SLICES);
  const rest = rows.slice(MAX_SLICES);
  const restPct = rest.reduce((a, r) => a + r.pct, 0);
  const slices = restPct > 0
    ? [...head, { key: OTHER_KEY, name: `기타 ${rest.length}개`, icon: null, sub: rest.reduce((a, r) => a + r.sub, 0), pct: restPct, tint: undefined, peon: false }]
    : head;

  const hovered = hover ? slices.find((s) => s.key === hover) ?? rows.find((r) => r.key === hover) : undefined;
  const isRestHover = hover !== null && rest.some((r) => r.key === hover);
  // 범례 줄 막대 — 1위를 100% 로 두고 그에 대한 비율. 몫 그대로 그리면(45% 면 트랙의 45%) 줄이 절반 넘게 비어
  // "채운다"는 뜻이 안 산다. 몫 숫자는 옆에 그대로 있으니 막대는 크기 비교만 맡는다
  const maxPct = rows[0]?.pct || 1;

  let acc = 0;
  return (
    <div className={styles.wrap}>
      <div className={styles.chartCol}>
        <svg viewBox="0 0 200 200" className={styles.svg} role="img" aria-label={`구성품 가치 비중 — ${basisLabel} ${formatNumber(basis)}골드`}>
          {slices.map((s) => {
            const start = acc;
            acc += s.pct;
            const end = Math.min(100, acc);
            // 한 조각뿐이면 부채꼴이 닫혀 안 그려진다 — 0.001 만 열어 둔다
            const d = wedgePath(start, end - start >= 100 ? end - 0.001 : end);
            const dim = hover !== null && hover !== s.key && !(s.key === OTHER_KEY && isRestHover);
            return (
              <path
                key={s.key}
                d={d}
                className={`${styles.slice} ${dim ? styles.sliceDim : ''} ${s.key === OTHER_KEY ? styles.sliceOther : ''}`}
                style={s.tint ? { fill: s.tint } : undefined}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${s.name} · ${formatNumber(s.sub)}G (${fmtPct(s.pct)})`}</title>
              </path>
            );
          })}
          {/* 조각 안 그림·% — 부채꼴 살 중간에. 조각 위에 따로 그려야 틈 선에 안 가려진다 */}
          {(() => {
            let a = 0;
            return slices.map((s) => {
              const mid = a + s.pct / 2;
              a += s.pct;
              const want = iconSize(s.pct);
              const { r: labelR, size } = want ? iconPlace(s.pct, want) : { r: 0.6 * R, size: 0 };
              // % 글자는 그림 밑에 한 줄 더 필요하다 — 조각이 좁으면 그림만
              const showPct = s.pct >= 8;
              if (!size && !showPct) return null;
              const ang = (mid / 100) * Math.PI * 2 - Math.PI / 2;
              const x = C + labelR * Math.cos(ang);
              const y = C + labelR * Math.sin(ang);
              const dim = hover !== null && hover !== s.key && !(s.key === OTHER_KEY && isRestHover);
              // 그림이 있으면 그림 위·% 아래로 세로 배열, 없으면 % 만 가운데
              const iconY = showPct ? y - size / 2 - 4 : y - size / 2;
              const pctY = size ? y + size / 2 + 6 : y + 4;
              return (
                <g key={`l-${s.key}`} className={`${styles.label} ${dim ? styles.labelDim : ''}`} pointerEvents="none">
                  {size > 0 && s.icon && (
                    <>
                      {/* 그림 밑 판 — 조각 색이 그림에서 뽑은 색이라 그림이 조각에 묻힌다. 카드 배경색 판으로 띄운다
                          (라이트는 흰색, 다크는 어두운 카드색 — 둘 다 중간 명도의 조각과 대비가 난다) */}
                      <rect
                        x={x - size / 2 - 3} y={iconY - 3} width={size + 6} height={size + 6}
                        rx={Math.round(size * 0.24)} className={styles.iconPlate}
                      />
                      <image href={s.icon} x={x - size / 2} y={iconY} width={size} height={size} />
                    </>
                  )}
                  {showPct && (
                    <text x={x} y={pctY} textAnchor="middle" className={styles.pctText}>{fmtPct(s.pct)}</text>
                  )}
                </g>
              );
            });
          })()}
        </svg>
        {/* 원 밑 한 줄 — 평소엔 기준 총액, 조각에 올리면 그 조각 */}
        <div className={styles.caption} aria-live="polite">
          {hovered ? (
            <>
              <span className={styles.captionName}>{hovered.name}</span>
              <span className={styles.captionPct}>{fmtPct(hovered.pct)}</span>
              <span className={styles.captionGold}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIcon} />
                {formatNumber(hovered.sub)}
              </span>
            </>
          ) : (
            <>
              <span className={styles.captionName}>{basisLabel}</span>
              <span className={styles.captionGold}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIcon} />
                {formatNumber(basis)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 범례 — 전부, 큰 순. 그림·이름이 색을 대신해 아이템을 가른다 */}
      <ul className={styles.legend}>
        {rows.map((r, i) => {
          const folded = i >= MAX_SLICES;
          const active = hover === r.key || (folded && hover === OTHER_KEY);
          const dim = hover !== null && !active;
          return (
            <li
              key={r.key}
              className={`${styles.row} ${active ? styles.rowActive : ''} ${dim ? styles.rowDim : ''}`}
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
            >
              <span className={styles.swatch} style={{ background: folded ? undefined : r.tint }} />
              <span className={styles.iconBox}>
                {r.icon && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img loading="lazy" decoding="async" src={r.icon} alt="" className={styles.icon} />
                )}
              </span>
              <span className={styles.nameCell}>
                <span className={styles.name} title={r.name}>{r.name}</span>
                <span className={styles.bar} aria-hidden="true">
                  <span className={styles.barFill} style={{ width: `${(r.pct / maxPct) * 100}%`, background: folded ? undefined : r.tint }} />
                </span>
              </span>
              <span className={styles.pct}>{fmtPct(r.pct)}</span>
              <span className={styles.gold}>
                {r.peon && <PeonBadge off={noPeon} large inline />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIcon} />
                {formatNumber(r.sub)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
