'use client';

import { useEffect, useState } from 'react';
import TitleBadge from './TitleBadge';
import styles from './FilterStats.module.css';

interface Stats {
  total: number;
  matched: number;
  avgCombatPower: number;
  avgItemLevel: number;
  breakdown: { spec?: number; title?: number; ancient?: number; role?: number; level?: number };
}

interface Props {
  spec: string;
  /** 직업 단위 필터 (정식 직업명, 예: '창술사') — 스펙 구분 없이 직업 전체 */
  klass?: string;
  title: string;
  ancient: string;
  role: string;
  /** 아이템레벨 범위 (빈 문자열 = 미적용) */
  minLevel?: string;
  maxLevel?: string;
  /** 활성 필터의 사람이 읽는 라벨 */
  labels: { spec?: string; specIcon?: string; title?: string; ancient?: string; role?: string; level?: string };
  /** 'sidebar'(기본, 세로 패널) | 'mobile'(가로 압축 — 상단 고정용) */
  variant?: 'sidebar' | 'mobile';
}

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

function fmtPct(matched: number, total: number): string {
  if (total <= 0) return '0';
  const v = (matched / total) * 100;
  if (v === 0) return '0';
  if (v < 1) return v.toFixed(2);
  if (v < 10) return v.toFixed(1);
  return Math.round(v).toString();
}

function fmtNum(n: number, frac = 2): string {
  return n.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

export default function FilterStats({ spec, klass = '', title, ancient, role, minLevel = '', maxLevel = '', labels, variant = 'sidebar' }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (spec) p.set('spec', spec);
    if (klass) p.set('class', klass);
    if (title) p.set('title', title);
    if (ancient) p.set('ancient', ancient);
    if (role) p.set('role', role);
    if (minLevel) p.set('minLevel', minLevel);
    if (maxLevel) p.set('maxLevel', maxLevel);

    let cancelled = false;
    setLoading(true);
    fetch(`/api/character/stats?${p.toString()}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (!cancelled) setStats(d); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [spec, klass, title, ancient, role, minLevel, maxLevel]);

  const hasLevel = !!(minLevel || maxLevel);
  const hasFilter = !!(spec || klass || title || ancient || role || hasLevel);
  const total = stats?.total ?? 0;
  const matched = hasFilter ? (stats?.matched ?? 0) : total;
  const pctNum = total > 0 ? Math.min(100, (matched / total) * 100) : 0;
  const dashOffset = CIRC * (1 - pctNum / 100);
  const ready = !!stats && !loading;

  // 활성 필터별 단독 비율 행
  const rows: { key: string; label: string; count: number }[] = [];
  if (stats) {
    if (role && stats.breakdown.role != null) rows.push({ key: 'role', label: labels.role || '역할', count: stats.breakdown.role });
    if (spec && stats.breakdown.spec != null) rows.push({ key: 'spec', label: labels.spec || '직업', count: stats.breakdown.spec });
    if (title && stats.breakdown.title != null) rows.push({ key: 'title', label: labels.title || '칭호', count: stats.breakdown.title });
    if (ancient && stats.breakdown.ancient != null) rows.push({ key: 'ancient', label: labels.ancient || '고대', count: stats.breakdown.ancient });
    if (hasLevel && stats.breakdown.level != null) rows.push({ key: 'level', label: labels.level || '레벨', count: stats.breakdown.level });
  }

  const tagText: Record<string, string> = { role: '역할', spec: '직업', title: '칭호', ancient: '고대', level: '레벨' };

  // 활성 필터 칩 (sidebar·mobile 공용)
  const chipNodes = hasFilter ? (
    <>
      {role && <span className={`${styles.chip} ${styles.chipRole}`}>{labels.role || (role === 'support' ? '서포터' : '딜러')}</span>}
      {(spec || klass) && (
        <span className={`${styles.chip} ${styles.chipSpec}`}>
          {labels.specIcon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={labels.specIcon} alt="" className={styles.chipSpecIcon} />
          )}
          {labels.spec}
        </span>
      )}
      {title && <TitleBadge title={labels.title} fontSize="0.74rem" />}
      {ancient && <span className={`${styles.chip} ${styles.chipAncient}`}>{labels.ancient}</span>}
      {hasLevel && <span className={`${styles.chip} ${styles.chipLevel}`}>{labels.level || '레벨'}</span>}
    </>
  ) : (
    <span className={`${styles.chip} ${styles.chipAll}`}>전체 캐릭터</span>
  );

  // ── 모바일 가로형 (필터 버튼 밑 상단 고정용) ──
  if (variant === 'mobile') {
    return (
      <div className={styles.mPanel}>
        <div className={styles.mRow}>
          <div className={styles.mPctBlock}>
            <span className={styles.mPct}>
              {ready ? fmtPct(matched, total) : '–'}
              <i className={styles.mPctUnit}>%</i>
            </span>
            <span className={styles.mPctLabel}>{hasFilter ? '선택 조합' : '전체'}</span>
          </div>
          <div className={styles.mInfo}>
            <div className={styles.mChips}>{chipNodes}</div>
            <div className={styles.mNums}>
              <span className={styles.mCount}>
                <strong>{matched.toLocaleString('ko-KR')}</strong>
                <span className={styles.countSlash}>/</span>
                {total.toLocaleString('ko-KR')}명
              </span>
              <span className={styles.mAvg}>
                <i>전투력</i>
                {ready ? fmtNum(stats!.avgCombatPower) : '–'}
              </span>
              <span className={styles.mAvg}>
                <i>아이템</i>
                {ready ? fmtNum(stats!.avgItemLevel) : '–'}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.mBarTrack}>
          <div className={styles.mBarFill} style={{ width: `${pctNum}%` }} />
        </div>
        {(title === '혹한의 군주' || title === '홍염의 군주') && (
          <div className={styles.note}>이 칭호는 아이템레벨 1770+ 기준 집계</div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.headDot} aria-hidden />
        <span className={styles.headTitle}>필터 비율</span>
        <span className={styles.headSub}>전체 {total.toLocaleString('ko-KR')}명</span>
      </div>

      {/* 현재 적용된 필터 목록 (도넛 위) */}
      <div className={styles.chips}>
        {hasFilter ? (
          <>
            {role && <span className={`${styles.chip} ${styles.chipRole}`}>{labels.role || (role === 'support' ? '서포터' : '딜러')}</span>}
            {(spec || klass) && (
              <span className={`${styles.chip} ${styles.chipSpec}`}>
                {labels.specIcon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={labels.specIcon} alt="" className={styles.chipSpecIcon} />
                )}
                {labels.spec}
              </span>
            )}
            {title && <TitleBadge title={labels.title} fontSize="0.78rem" />}
            {ancient && <span className={`${styles.chip} ${styles.chipAncient}`}>{labels.ancient}</span>}
            {hasLevel && <span className={`${styles.chip} ${styles.chipLevel}`}>{labels.level || '레벨'}</span>}
          </>
        ) : (
          <span className={`${styles.chip} ${styles.chipAll}`}>전체 캐릭터</span>
        )}
      </div>

      <div className={styles.gaugeWrap}>
        <svg className={styles.gauge} viewBox="0 0 120 120" role="img" aria-label={`${fmtPct(matched, total)}퍼센트`}>
          <defs>
            <linearGradient id="fsGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <circle className={styles.gTrack} cx="60" cy="60" r={RADIUS} />
          <circle
            className={styles.gArc}
            cx="60"
            cy="60"
            r={RADIUS}
            stroke="url(#fsGrad)"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className={styles.gaugeCenter}>
          <div className={styles.gaugePct}>
            {ready ? fmtPct(matched, total) : '–'}
            <span className={styles.gaugeUnit}>%</span>
          </div>
          <div className={styles.gaugeLabel}>{hasFilter ? '선택 조합' : '전체'}</div>
        </div>
      </div>

      <div className={styles.countPill}>
        <strong>{matched.toLocaleString('ko-KR')}</strong>
        <span className={styles.countSlash}>/</span>
        {total.toLocaleString('ko-KR')}명
      </div>

      {(title === '혹한의 군주' || title === '홍염의 군주') && (
        <div className={styles.note}>이 칭호는 아이템레벨 1770+ 기준 집계</div>
      )}

      {/* 평균 전투력 · 평균 아이템레벨 */}
      <div className={styles.avgRow}>
        <div className={`${styles.avgBox} ${styles.avgCp}`}>
          <div className={styles.avgLabel}>평균 전투력</div>
          <div className={styles.avgValue}>{ready ? fmtNum(stats!.avgCombatPower) : '–'}</div>
        </div>
        <div className={`${styles.avgBox} ${styles.avgIl}`}>
          <div className={styles.avgLabel}>평균 아이템레벨</div>
          <div className={styles.avgValue}>{ready ? fmtNum(stats!.avgItemLevel) : '–'}</div>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className={styles.filters}>
          <div className={styles.filtersLabel}>필터별 단독 비율</div>
          {rows.map(r => {
            const p = total > 0 ? (r.count / total) * 100 : 0;
            return (
              <div key={r.key} className={styles.fRow}>
                <div className={styles.fTop}>
                  <span className={`${styles.fTag} ${styles[`tag_${r.key}`]}`}>{tagText[r.key]}</span>
                  <span className={styles.fName} title={r.label}>{r.label}</span>
                  <span className={styles.fPct}>{fmtPct(r.count, total)}%</span>
                </div>
                <div className={styles.fBar}>
                  <div
                    className={`${styles.fBarFill} ${styles[`fill_${r.key}`]}`}
                    style={{ width: `${Math.max(p, r.count > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <div className={styles.fCount}>{r.count.toLocaleString('ko-KR')}명</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.hint}>
          직업 · 칭호 · 고대 · 역할 필터를 선택하면<br />
          전체 대비 비율을 보여드려요.
        </div>
      )}
    </div>
  );
}
