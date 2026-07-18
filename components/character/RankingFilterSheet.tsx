'use client';

// 랭킹 필터 · 통계 바텀시트 — 모바일 웹 전용 (앱 RankingFilterSheet 미러)
// 통계 + 정렬/역할/고대/칭호/레벨 + 스펙(직업 각인) 선택을 아래에서 올라오는 시트 하나에 담음
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { TIER_ENTRIES } from '@/lib/tier-entries.generated';
import { specSearchText } from '@/lib/spec-search';
import TitleBadge from './TitleBadge';
import styles from './RankingFilterSheet.module.css';

const SPEC_GROUP_ORDER = ['기타', '전사', '무도가', '헌터', '마법사', '암살자', '스페셜리스트'];
const NEW_GROUP = '기타';

// 상위 직업 단계 없이 스펙(직업 각인)을 그룹별로 바로 나열
const SPEC_GROUPS = SPEC_GROUP_ORDER
  .map(group => ({ group, entries: TIER_ENTRIES.filter(e => e.group === group) }))
  .filter(g => g.entries.length > 0);

// 검색 별칭: "디트"·"디스트로이어"·스펙 풀네임 모두 매칭 (공백 무시)
const SPEC_SEARCH: Record<string, string> = {};
TIER_ENTRIES.forEach(e => { SPEC_SEARCH[e.id] = specSearchText(e.id).toLowerCase().replace(/\s+/g, ''); });

export type SheetSortKey = 'combat_power' | 'item_level';
export type SheetSort = { key: SheetSortKey; dir: 'desc' | 'asc' } | null;

interface Props {
  open: boolean;
  onClose: () => void;
  /** '' | 스펙 id — CharacterRanking의 selectedSpec 그대로 */
  selectedSpec: string;
  onSelectSpec: (v: string) => void;
  selectedTitle: string;
  onTitle: (v: string) => void;
  selectedAncient: string;
  onAncient: (v: string) => void;
  selectedRole: string;
  onRole: (v: string) => void;
  levelMin: string;
  levelMax: string;
  onLevelMin: (v: string) => void;
  onLevelMax: (v: string) => void;
  sort: SheetSort;
  onCycleSort: (key: SheetSortKey) => void;
  hasActiveFilter: boolean;
  onReset: () => void;
  titleOptions: { label: string; value: string }[];
  /** 상단 통계 카드 — 부모가 FilterStats(mobile)를 주입 (요청 캐시 공유) */
  statsNode?: ReactNode;
}

export default function RankingFilterSheet({
  open, onClose, selectedSpec, onSelectSpec, selectedTitle, onTitle,
  selectedAncient, onAncient, selectedRole, onRole,
  levelMin, levelMax, onLevelMin, onLevelMax,
  sort, onCycleSort, hasActiveFilter, onReset, titleOptions, statsNode,
}: Props) {
  const [specQuery, setSpecQuery] = useState('');

  // 시트가 열려 있는 동안 뒤쪽 페이지 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const nq = specQuery.trim().toLowerCase().replace(/\s+/g, '');
  const filteredGroups = useMemo(() =>
    SPEC_GROUPS.map(g => ({
      group: g.group,
      entries: g.entries.filter(e => !nq || (SPEC_SEARCH[e.id] || '').includes(nq)),
    })).filter(g => g.entries.length > 0),
  [nq]);

  if (!open) return null;

  const chip = (label: ReactNode, active: boolean, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );

  const filterRow = (label: string, children: ReactNode) => (
    <div className={styles.filterRow}>
      <span className={styles.filterRowLabel}>{label}</span>
      <div className={styles.filterRowChips}>{children}</div>
    </div>
  );

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="필터 · 통계"
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.grabber} aria-hidden />
          <div className={styles.headRow}>
            <span className={styles.headTitle}>필터 · 통계</span>
            <div className={styles.headActions}>
              <button type="button" className={styles.resetBtn} onClick={onReset} disabled={!hasActiveFilter}>
                초기화
              </button>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {statsNode && <div className={styles.statsCard}>{statsNode}</div>}

          {filterRow('정렬', ([['combat_power', '전투력'], ['item_level', '아이템레벨']] as [SheetSortKey, string][]).map(([key, label]) => {
            const active = sort?.key === key;
            const arrow = active ? (sort!.dir === 'desc' ? ' ↓' : ' ↑') : '';
            return chip(`${label}${arrow}`, active, () => onCycleSort(key), key);
          }))}

          {filterRow('역할', ([['', '전체'], ['dealer', '딜러'], ['support', '서포터']] as [string, string][]).map(([v, label]) =>
            chip(label, selectedRole === v, () => onRole(v), `role-${v}`)))}

          {filterRow('고대', (
            <>
              {chip('전체', selectedAncient === '', () => onAncient(''), 'anc-all')}
              {['6', '5', '4', '3', '2', '1', '0'].map(n =>
                chip(`${n}고대`, selectedAncient === n, () => onAncient(n), `anc-${n}`))}
            </>
          ))}

          {filterRow('칭호', (
            <>
              {chip('전체', selectedTitle === '', () => onTitle(''), 'title-all')}
              {titleOptions.map(t =>
                chip(
                  <TitleBadge title={t.label} fontSize="0.76rem" />,
                  selectedTitle === t.value,
                  () => onTitle(selectedTitle === t.value ? '' : t.value),
                  `title-${t.value}`,
                ))}
            </>
          ))}

          <div className={styles.filterRow}>
            <span className={styles.filterRowLabel}>레벨</span>
            <div className={styles.levelWrap}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className={styles.lvInput}
                value={levelMin}
                onChange={e => onLevelMin(e.target.value)}
                placeholder="최소"
                aria-label="아이템레벨 최소"
              />
              <span className={styles.lvTilde}>~</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className={styles.lvInput}
                value={levelMax}
                onChange={e => onLevelMax(e.target.value)}
                placeholder="최대"
                aria-label="아이템레벨 최대"
              />
            </div>
          </div>

          {/* ── 직업 각인(스펙) 선택 — 그룹별 전체 나열 ── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>직업 각인 선택</div>
            <input
              className={styles.specSearch}
              value={specQuery}
              onChange={e => setSpecQuery(e.target.value)}
              placeholder="직업 검색 (예: 디트, 가나)"
              aria-label="직업 검색"
            />

            <button
              type="button"
              className={`${styles.chip} ${styles.allChip} ${!selectedSpec ? styles.chipActive : ''}`}
              onClick={() => onSelectSpec('')}
            >
              전체 직업
            </button>

            {filteredGroups.map(g => (
              <div key={g.group} className={styles.classGroup}>
                <div className={styles.classGroupLabel}>
                  {g.group === NEW_GROUP ? <span className={styles.newBadge}>NEW</span> : g.group}
                </div>
                <div className={styles.specGrid}>
                  {g.entries.map(e => {
                    const active = selectedSpec === e.id;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        className={`${styles.specChip} ${active ? styles.chipActive : ''}`}
                        onClick={() => onSelectSpec(active ? '' : e.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.icon} alt="" className={styles.specChipIcon} loading="lazy" decoding="async" />
                        <span className={styles.specChipName}>{e.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.applyBtn} onClick={onClose}>
            결과 보기
          </button>
        </div>
      </div>
    </div>
  );
}
