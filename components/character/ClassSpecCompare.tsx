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
  /** 코어 번호(1·2·3) → 옵션명. 조합 코드 각 자리의 실제 코어 이름 */
  orderNames?: { 해: string[]; 달: string[]; 별: string[] } | null;
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
  /** 'sidebar'(기본, 세로 스택) | 'wide'(랭킹 상단 가로 — 좌 코어 · 우 각인 2컬럼) */
  variant?: 'sidebar' | 'wide';
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

export default function ClassSpecCompare({ klass, selectedSpecId, onSelectSpec, variant = 'sidebar' }: Props) {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);

  // 직업 전환 시 이전 직업 데이터가 한 프레임도 렌더되지 않도록 렌더 중에 즉시 비움
  // (effect는 페인트 후 실행이라 effect에서만 비우면 이전 직업 통계가 한 번 깜빡임)
  const [prevKlass, setPrevKlass] = useState(klass);
  if (klass !== prevKlass) {
    setPrevKlass(klass);
    setData(null);
    setLoading(true);
  }

  useEffect(() => {
    if (!klass) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    // 직업 재선택·모바일/데스크톱 remount 시 메모리 캐시로 재요청 방지
    // 집계 통계라 CDN(s-maxage=1800)과 맞춰 30분 — 세션 내 직업 전환은 사실상 항상 즉시
    cachedGetJson(`/api/character/class-compare?class=${encodeURIComponent(klass)}`, 30 * 60 * 1000)
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
        {mode === 'spec' ? (
          // 선택된 스펙을 아이콘 + 이름으로 명확하게 (예: [아이콘] 가나 업화)
          <span className={styles.headSpec}>
            {ENTRY_BY_ID.get(selSpec!.specId)?.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ENTRY_BY_ID.get(selSpec!.specId)!.icon} alt="" className={styles.headSpecIcon} loading="lazy" decoding="async" />
            )}
            <span className={styles.headTitle}>{ENTRY_BY_ID.get(selSpec!.specId)?.name ?? selSpec!.specId}</span>
          </span>
        ) : (
          <span className={styles.headTitle}>{klass} 스펙 분포</span>
        )}
        {total > 0 && <span className={styles.headSub}>{klass} {total.toLocaleString('ko-KR')}명</span>}
      </div>

      {loading && !data && (
        <div className={styles.loadingBox}>
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          <span>통계 불러오는 중...</span>
        </div>
      )}
      {!loading && !data && <div className={styles.loading}>통계를 불러올 수 없습니다</div>}

      {data && mode === 'class' && <ClassMode data={data} total={total} onSelectSpec={onSelectSpec} />}
      {data && mode === 'spec' && (
        <SpecMode data={data} spec={selSpec!} total={total} onSelectSpec={onSelectSpec} wide={variant === 'wide'} />
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
            const en = ENTRY_BY_ID.get(s.specId);
            return (
              <button
                key={s.specId}
                type="button"
                className={`${styles.vsFill} ${styles.vsFillBtn} ${i === 0 ? styles.colorA : styles.colorB}`}
                style={{ width: `${pct}%` }}
                onClick={() => onSelectSpec?.(s.specId)}
                title={`${en?.name ?? s.specId} 선택`}
              >
                {en?.icon && pct >= 10 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={en.icon} alt="" className={styles.vsIcon} loading="lazy" decoding="async" />
                )}
                {pct >= 24 && <span className={styles.vsPct}>{Math.round(pct)}%</span>}
              </button>
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
function SpecMode({ data, spec, total, onSelectSpec, wide = false }: {
  data: CompareData;
  spec: SpecStat;
  total: number;
  onSelectSpec?: (id: string) => void;
  /** 가로 배치 — 질서 코어(좌) · 각인(우) 2컬럼 */
  wide?: boolean;
}) {
  // 모바일엔 호버 툴팁이 없어 각인 조합 행을 탭하면 이름·인원을 펼쳐 보여줌
  const [openEngr, setOpenEngr] = useState<string | null>(null);
  // 조합이 많은 스펙(각인 8조합 등)은 상위 5개만 기본 노출 — 코어·각인 한 버튼으로 같이 펼침
  const [showAll, setShowAll] = useState(false);
  const hiddenCount =
    Math.max(0, (spec.combos?.length ?? 0) - 5) + Math.max(0, (spec.engravingCombos?.length ?? 0) - 5);

  // 조합 코드("121")의 각 자리(해·달·별 번호)를 실제 코어 옵션명으로 — 행마다 다른 코어가 정확히 표시됨
  const CELS = ['해', '달', '별'] as const;
  const comboCoreTip = (code: string, cel: '해' | '달' | '별') => {
    const n = Number(code[CELS.indexOf(cel)]);
    const nm = spec.orderNames?.[cel]?.[n - 1];
    return nm ? `${cel} ${n}번 · ${nm}` : `질서 ${cel} 코어`;
  };

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
      {/* 스펙 분포: 어떤 스펙을 골라도 직업 전체 내 비율 바를 먼저 표시.
          바 안에 스펙 아이콘을 넣어 어느 쪽이 어느 스펙인지 바로 보이게 (탭하면 전환) */}
      {total > 0 && (
        <div className={styles.vsBar}>
          {data.specs.map((s, i) => {
            const pct = (s.count / total) * 100;
            const active = s.specId === spec.specId;
            const en = ENTRY_BY_ID.get(s.specId);
            return (
              <button
                key={s.specId}
                type="button"
                className={`${styles.vsFill} ${styles.vsFillBtn} ${i === 0 ? styles.colorA : styles.colorB} ${active ? '' : styles.vsDim}`}
                style={{ width: `${pct}%` }}
                onClick={() => onSelectSpec?.(s.specId)}
                title={`${en?.name ?? s.specId}로 전환`}
              >
                {en?.icon && pct >= 10 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={en.icon} alt="" className={styles.vsIcon} loading="lazy" decoding="async" />
                )}
                {pct >= 24 && <span className={styles.vsPct}>{Math.round(pct)}%</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* 두 스펙 요약 카드: 인원·점유율 + 평균 전투력·아이템레벨 (선택 스펙 강조) */}
      <div className={styles.duoGrid}>
        {data.specs.map((s, i) => {
          const en = ENTRY_BY_ID.get(s.specId);
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          const active = s.specId === spec.specId;
          return (
            <button
              key={s.specId}
              type="button"
              className={`${styles.duoCard} ${i === 0 ? styles.duoCardA : styles.duoCardB} ${active ? styles.duoActive : ''}`}
              onClick={() => onSelectSpec?.(s.specId)}
              title={active ? undefined : `${en?.name ?? s.specId}로 전환`}
            >
              <div className={styles.duoHead}>
                {en?.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={en.icon} alt="" className={styles.duoIcon} loading="lazy" decoding="async" />
                )}
                <div className={styles.duoNameCol}>
                  <span className={styles.duoName}>{en?.name ?? s.specId}</span>
                  <span className={styles.duoMeta}>
                    {s.count.toLocaleString('ko-KR')}명 · <b className={i === 0 ? styles.textA : styles.textB}>{pct}%</b>
                  </span>
                </div>
              </div>
              <div className={styles.duoAvgRow}>
                <span className={styles.duoAvgLabel}>전투력</span>
                <span className={styles.duoAvgVal}>{fmtNum(s.avgCombatPower)}</span>
              </div>
              <div className={styles.duoAvgRow}>
                <span className={styles.duoAvgLabel}>아이템</span>
                <span className={styles.duoAvgVal}>{fmtNum(s.avgItemLevel)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 코어 사용 통계 — 질서는 조합코드(해·달·별) 분포, 혼돈·기타는 개별 */}
      {spec.cores.length === 0 ? (
        <div className={styles.loading}>코어 데이터가 없습니다</div>
      ) : (
        <div className={`${styles.coreList} ${wide ? styles.coreListWide : ''}`}>
          {spec.combos && spec.combos.length > 0 ? (
            <div className={styles.coreGroup}>
              <div className={`${styles.coreGroupLabel} ${styles.coreOrder}`}>
                질서 코어 <span className={styles.comboHint}>해·달·별 조합</span>
              </div>
              {(showAll ? spec.combos : spec.combos.slice(0, 5)).map(cb => (
                <div key={cb.code} className={styles.comboRow} title={`${cb.code} — ${cb.count}명 (${cb.pct}%)`}>
                  <span className={styles.comboIcons}>
                    {(['해', '달', '별'] as const).map(cel => (
                      <span key={cel} className={styles.iconTipWrap} data-tip={comboCoreTip(cb.code, cel)} title="">
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
              {(showAll ? spec.engravingCombos : spec.engravingCombos.slice(0, 5)).map(ec => (
                <div key={ec.label}>
                {/* 행을 탭/클릭하면 조합 이름·인원 펼침 — 호버 툴팁이 없는 모바일 대응 */}
                <button
                  type="button"
                  className={`${styles.comboRow} ${styles.comboRowTap}`}
                  title={`${ec.label} — ${ec.count}명 (${ec.pct}%)`}
                  onClick={() => setOpenEngr(prev => (prev === ec.label ? null : ec.label))}
                >
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
                </button>
                {openEngr === ec.label && (
                  <div className={styles.engrOpenLabel}>{ec.label} · {ec.count.toLocaleString('ko-KR')}명</div>
                )}
                </div>
              ))}
            </div>
          )}
          {renderCores('기타', etcCores, styles.coreEtc)}
        </div>
      )}

      {/* 코어·각인 5개 초과분을 한 버튼으로 같이 펼침/접힘 */}
      {hiddenCount > 0 && (
        <button type="button" className={styles.moreBtn} onClick={() => setShowAll(v => !v)}>
          {showAll ? '접기' : `조합 ${hiddenCount}개 더보기`}
        </button>
      )}

    </>
  );
}
