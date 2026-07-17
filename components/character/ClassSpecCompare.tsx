'use client';

import { useEffect, useState } from 'react';
import { TIER_ENTRIES } from '@/lib/tier-entries.generated';
import { ENGRAVING_ICONS } from '@/lib/engraving-icons.generated';
import { cachedGetJson } from '@/lib/client-fetch-cache';
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
  num?: number | null; // 질서 코어 번호(1·2·3)
};

type ComboStat = { code: string; count: number; pct: number };

type EngravingComboStat = {
  label: string;                 // 축약 라벨 (예: "원한 질증 돌대 기습 저받") — 툴팁용
  names: string[];               // 관용 순서대로 정렬된 각인 이름 5개 (아이콘 매핑용)
  count: number;
  pct: number;
};

type SpecStat = {
  specId: string;
  count: number;
  avgCombatPower: number;
  avgItemLevel: number;
  cores: CoreStat[];
  combos?: ComboStat[];
  engravingCombos?: EngravingComboStat[];
  orderIcons?: { 해: string | null; 달: string | null; 별: string | null };
};

// 코어 아이콘 배경 — 고대 등급 배경(베이지 그라데이션)으로 통일해 가독성 향상
const ANCIENT_BG = 'linear-gradient(180deg, #f5e8c8 0%, #c19a5c 100%)';

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
    // 직업 재선택·모바일/데스크톱 remount 시 5분 메모리 캐시로 재요청 방지
    cachedGetJson(`/api/character/class-compare?class=${encodeURIComponent(klass)}`)
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
  const etcCores = spec.cores.filter(c => !c.name.includes('질서') && !c.name.includes('혼돈'));

  const renderCores = (label: string, list: CoreStat[], colorCls: string) => {
    if (list.length === 0) return null;
    return (
      <div className={styles.coreGroup}>
        <div className={`${styles.coreGroupLabel} ${colorCls}`}>{label}</div>
        {list.map(c => (
          <div key={c.name} className={styles.coreRow} title={`${c.name} — ${c.count}명 (${c.pct}%)`}>
            <span className={styles.iconTipWrap} data-tip={c.name} title="">
              <span className={styles.coreIconWrap} style={{ borderColor: gradeColor(c.grade), background: ANCIENT_BG }}>
                {c.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.icon} alt="" />
                ) : null}
              </span>
            </span>
            <span className={styles.coreName}>
              {c.num != null && <b className={styles.coreNumInline}>{c.num}.</b>} {coreShortName(c.name)}
            </span>
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

      {/* 코어 사용 통계 — 질서는 조합코드(해·달·별) 분포, 혼돈·기타는 개별 */}
      {spec.cores.length === 0 ? (
        <div className={styles.loading}>코어 데이터가 없습니다</div>
      ) : (
        <div className={styles.coreList}>
          {spec.combos && spec.combos.length > 0 ? (
            <div className={styles.coreGroup}>
              <div className={`${styles.coreGroupLabel} ${styles.coreOrder}`}>
                질서 코어 <span className={styles.comboHint}>해·달·별 조합</span>
              </div>
              {spec.combos.map(cb => (
                <div key={cb.code} className={styles.comboRow} title={`${cb.code} — ${cb.count}명 (${cb.pct}%)`}>
                  <span className={styles.comboIcons}>
                    {(['해', '달', '별'] as const).map(cel => (
                      <span key={cel} className={styles.iconTipWrap} data-tip={`질서 ${cel} 코어`} title="">
                        <span className={styles.comboIcon} style={{ background: ANCIENT_BG }}>
                          {spec.orderIcons?.[cel] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={spec.orderIcons[cel]!} alt={cel} />
                          ) : null}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className={styles.comboCode}>{cb.code}</span>
                  <span className={styles.comboBar}>
                    <span className={styles.comboBarFill} style={{ width: `${cb.pct}%` }} />
                  </span>
                  <span className={styles.comboPct}>{cb.pct}%</span>
                  <span className={styles.comboCount}>{cb.count}명</span>
                </div>
              ))}
            </div>
          ) : (
            renderCores('질서 코어', orderCores, styles.coreOrder)
          )}
          {/* 각인 조합 채용률 (기존 혼돈 코어 자리) — 아이콘 5개 + 앞글자 코드 (질서 조합 행과 동일 형식) */}
          {spec.engravingCombos && spec.engravingCombos.length > 0 && (
            <div className={styles.coreGroup}>
              <div className={`${styles.coreGroupLabel} ${styles.coreChaos}`}>
                각인 <span className={styles.comboHint}>5개 조합 채용률</span>
              </div>
              {spec.engravingCombos.map(ec => (
                <div key={ec.label} className={styles.comboRow} title={`${ec.label} — ${ec.count}명 (${ec.pct}%)`}>
                  <span className={styles.engrIcons}>
                    {ec.names.map(name => (
                      <span key={name} className={styles.iconTipWrap} data-tip={name} title="">
                        <span className={styles.engrIcon}>
                          {ENGRAVING_ICONS[name] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ENGRAVING_ICONS[name]} alt={name} />
                          ) : (
                            // 아이콘 에셋이 없는 각인은 첫 글자로 표시 (호버 시 전체 이름)
                            <i className={styles.engrIconFallback}>{name.charAt(0)}</i>
                          )}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className={styles.comboBar}>
                    <span className={styles.engrBarFill} style={{ width: `${ec.pct}%` }} />
                  </span>
                  <span className={styles.comboPct}>{ec.pct}%</span>
                  <span className={styles.comboCount}>{ec.count}명</span>
                </div>
              ))}
            </div>
          )}
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
