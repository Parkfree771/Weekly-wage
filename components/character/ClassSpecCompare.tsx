'use client';

import { useEffect, useState } from 'react';
import { TIER_ENTRIES } from '@/lib/tier-entries.generated';
import styles from './ClassSpecCompare.module.css';

// 직업/스펙 통계 패널 — 랭킹 사이드바용. 두 가지 모드:
//  - 직업 모드 (직업 전체 선택): 스펙(직업 각인) 분포 비율 — 업화 vs 드드
//  - 스펙 모드 (특정 스펙 선택): 그 스펙 안에서 코어별 사용 통계

type CoreStat = {
  name: string;
  icon: string | null;
  grade: string | null;
  count: number;
  pct: number;
};

type SpecStat = {
  specId: string;
  count: number;
  avgCombatPower: number;
  avgItemLevel: number;
  cores: CoreStat[];
};

type CompareData = {
  className: string;
  specs: SpecStat[];
};

interface Props {
  /** 정식 직업명 (예: '창술사'). null이면 렌더 안 함 */
  klass: string | null;
  /** 현재 선택된 스펙 id — 있으면 코어 통계 모드 */
  selectedSpecId?: string;
  onSelectSpec?: (specId: string) => void;
}

const ENTRY_BY_ID = new Map(TIER_ENTRIES.map(e => [e.id, e]));

function fmtNum(n: number, frac = 2): string {
  return n.toLocaleString('ko-KR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

// CharacterRanking의 CoreBadge와 동일한 축약 규칙
function coreShortName(name: string): string {
  return (name || '').replace(/.*코어\s*[:\-]\s*/, '');
}

function gradeColor(grade: string | null): string {
  switch (grade) {
    case '고대': return '#c19a5c';
    case '유물': return '#d97706';
    case '전설': return '#ca8a04';
    case '영웅': return '#a855f7';
    case '희귀': return '#3b82f6';
    default: return 'var(--border-color)';
  }
}

export default function ClassSpecCompare({ klass, selectedSpecId, onSelectSpec }: Props) {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!klass) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/character/class-compare?class=${encodeURIComponent(klass)}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [klass]);

  if (!klass) return null;

  const total = data ? data.specs.reduce((s, x) => s + x.count, 0) : 0;
  const selSpec = data && selectedSpecId ? data.specs.find(s => s.specId === selectedSpecId) : undefined;
  const mode: 'spec' | 'class' = selSpec ? 'spec' : 'class';

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.headDot} aria-hidden />
        <span className={styles.headTitle}>
          {mode === 'spec' ? `${ENTRY_BY_ID.get(selSpec!.specId)?.name ?? selSpec!.specId} 코어 통계` : `${klass} 스펙 분포`}
        </span>
        {total > 0 && <span className={styles.headSub}>{klass} {total.toLocaleString('ko-KR')}명</span>}
      </div>

      {loading && !data && <div className={styles.loading}>불러오는 중...</div>}
      {!loading && !data && <div className={styles.loading}>통계를 불러올 수 없습니다</div>}

      {data && mode === 'class' && <ClassMode data={data} total={total} onSelectSpec={onSelectSpec} />}
      {data && mode === 'spec' && (
        <SpecMode data={data} spec={selSpec!} total={total} onSelectSpec={onSelectSpec} />
      )}
    </div>
  );
}

// ── 직업 모드: 스펙(직업 각인) 분포 — 아이콘 크게, VS 분할 바
function ClassMode({ data, total, onSelectSpec }: {
  data: CompareData;
  total: number;
  onSelectSpec?: (id: string) => void;
}) {
  return (
    <>
      {total > 0 && (
        <div className={styles.vsBar}>
          {data.specs.map((s, i) => {
            const pct = (s.count / total) * 100;
            return (
              <div
                key={s.specId}
                className={`${styles.vsFill} ${i === 0 ? styles.colorA : styles.colorB}`}
                style={{ width: `${pct}%` }}
              >
                {pct >= 18 && <span className={styles.vsPct}>{Math.round(pct)}%</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.specGrid}>
        {data.specs.map((s, i) => {
          const entry = ENTRY_BY_ID.get(s.specId);
          const sharePct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          return (
            <button
              key={s.specId}
              type="button"
              className={`${styles.specBigCard} ${i === 0 ? styles.cardA : styles.cardB}`}
              onClick={() => onSelectSpec?.(s.specId)}
              title="클릭하면 이 스펙으로 필터 + 코어 통계"
            >
              {entry?.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.icon} alt="" className={styles.specBigIcon} />
              )}
              <span className={styles.specBigName}>{entry?.name ?? s.specId}</span>
              <span className={`${styles.specBigPct} ${i === 0 ? styles.textA : styles.textB}`}>
                {sharePct}<i>%</i>
              </span>
              <span className={styles.specBigCount}>{s.count.toLocaleString('ko-KR')}명</span>
              <span className={styles.specBigAvg}>
                <i>전투력</i>{fmtNum(s.avgCombatPower)}
              </span>
              <span className={styles.specBigAvg}>
                <i>아이템</i>{fmtNum(s.avgItemLevel)}
              </span>
            </button>
          );
        })}
      </div>
      <div className={styles.hint}>스펙 카드를 클릭하면 해당 스펙의 코어 통계를 보여드려요</div>
    </>
  );
}

// ── 스펙 모드: 선택 스펙의 코어별 사용 비율 (질서/혼돈 그룹)
function SpecMode({ data, spec, total, onSelectSpec }: {
  data: CompareData;
  spec: SpecStat;
  total: number;
  onSelectSpec?: (id: string) => void;
}) {
  const entry = ENTRY_BY_ID.get(spec.specId);
  const other = data.specs.find(s => s.specId !== spec.specId);
  const otherEntry = other ? ENTRY_BY_ID.get(other.specId) : undefined;
  const sharePct = total > 0 ? Math.round((spec.count / total) * 100) : 0;

  const orderCores = spec.cores.filter(c => c.name.includes('질서'));
  const chaosCores = spec.cores.filter(c => c.name.includes('혼돈'));
  const etcCores = spec.cores.filter(c => !c.name.includes('질서') && !c.name.includes('혼돈'));

  const renderCores = (label: string, list: CoreStat[], colorCls: string) => {
    if (list.length === 0) return null;
    return (
      <div className={styles.coreGroup}>
        <div className={`${styles.coreGroupLabel} ${colorCls}`}>{label}</div>
        {list.map(c => (
          <div key={c.name} className={styles.coreRow} title={`${c.name} — ${c.count}명 (${c.pct}%)`}>
            <span className={styles.coreIconWrap} style={{ borderColor: gradeColor(c.grade) }}>
              {c.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.icon} alt="" />
              ) : null}
            </span>
            <span className={styles.coreName}>{coreShortName(c.name)}</span>
            <span className={styles.corePct}>{c.pct}%</span>
            <span className={styles.coreBar}>
              <span className={`${styles.coreBarFill} ${colorCls}`} style={{ width: `${c.pct}%` }} />
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* 스펙 헤더: 큰 아이콘 + 점유율 + 평균 */}
      <div className={styles.specHero}>
        {entry?.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.icon} alt="" className={styles.heroIcon} />
        )}
        <div className={styles.heroInfo}>
          <div className={styles.heroName}>{entry?.name ?? spec.specId}</div>
          <div className={styles.heroMeta}>
            {spec.count.toLocaleString('ko-KR')}명 · 직업 내 {sharePct}%
          </div>
        </div>
        <div className={styles.heroAvgs}>
          <span><i>전투력</i>{fmtNum(spec.avgCombatPower)}</span>
          <span><i>아이템</i>{fmtNum(spec.avgItemLevel)}</span>
        </div>
      </div>

      {/* 코어 사용 통계 */}
      {spec.cores.length === 0 ? (
        <div className={styles.loading}>코어 데이터가 없습니다</div>
      ) : (
        <div className={styles.coreList}>
          {renderCores('질서 코어', orderCores, styles.coreOrder)}
          {renderCores('혼돈 코어', chaosCores, styles.coreChaos)}
          {renderCores('기타', etcCores, styles.coreEtc)}
        </div>
      )}

      {/* 반대 스펙 전환 */}
      {other && (
        <button
          type="button"
          className={styles.otherSpec}
          onClick={() => onSelectSpec?.(other.specId)}
        >
          {otherEntry?.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherEntry.icon} alt="" className={styles.otherIcon} />
          )}
          <span className={styles.otherName}>{otherEntry?.name ?? other.specId}</span>
          <span className={styles.otherMeta}>
            {total > 0 ? Math.round((other.count / total) * 100) : 0}% · {other.count.toLocaleString('ko-KR')}명 보기
          </span>
          <span className={styles.otherArrow} aria-hidden>→</span>
        </button>
      )}
    </>
  );
}
