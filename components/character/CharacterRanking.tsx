'use client';

import { useEffect, useRef, useState } from 'react';
import { TIER_ENTRIES } from '@/lib/tier-entries.generated';
import styles from './CharacterRanking.module.css';
import TitleBadge from './TitleBadge';
import FilterSelect, { type FilterGroup } from './FilterSelect';
import FilterStats from './FilterStats';

// 스펙 필터 옵션: 58개 매핑을 직업군(group)별로 묶음 (TIER_ENTRIES는 group→name 정렬됨)
const SPEC_GROUP_ORDER = ['전사', '무도가', '헌터', '마법사', '암살자', '스페셜리스트', '기타'];
const SPEC_GROUPS = SPEC_GROUP_ORDER
  .map(group => ({ group, entries: TIER_ENTRIES.filter(e => e.group === group) }))
  .filter(g => g.entries.length > 0);

// 직업/스펙 필터: 아이콘 + 이름
const SPEC_FILTER_GROUPS: FilterGroup[] = SPEC_GROUPS.map(g => ({
  label: g.group,
  options: g.entries.map(s => ({
    value: s.id,
    label: s.name,
    node: (
      <span className={styles.specOpt}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.icon} alt="" className={styles.specOptIcon} />
        <span>{s.name}</span>
      </span>
    ),
  })),
}));

type Core = {
  name: string;
  icon: string | null;
  grade: string | null;
  point: number;
};

type RankingEntry = {
  characterName: string;
  className: string;
  combatPower: number;
  itemLevel: number;
  characterImage: string | null;
  serverName: string | null;
  cores: Core[];
  equippedTitle: string | null;
  fetchedAt: string;
  specId: string | null;
  specName: string | null;
  specIcon: string | null;
};

type SortKey = 'combat_power' | 'item_level';
// 정렬 상태: null = 기본(전투력 내림차순). 버튼 클릭마다 desc → asc → null(초기화) 순환
type SortState = { key: SortKey; dir: 'desc' | 'asc' } | null;

function formatNumber(n: number, fractionDigits = 2): string {
  return n.toLocaleString('ko-KR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

// CharacterDashboard와 동일한 등급 배경 (로아 등급 색, 같은 색조 dark→light)
function getCoreGradeGradient(grade: string | null): string {
  switch (grade) {
    case '고대':
      return 'linear-gradient(180deg, #f5e8c8 0%, #c19a5c 100%)'; // 베이지
    case '유물':
      return 'linear-gradient(180deg, #7c2d12 0%, #d97706 100%)'; // 어두운 주황
    case '전설':
      return 'linear-gradient(180deg, #713f12 0%, #ca8a04 100%)'; // 어두운 노랑
    case '영웅':
      return 'linear-gradient(180deg, #4c1d95 0%, #a855f7 100%)'; // 보라
    case '희귀':
      return 'linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%)'; // 파랑
    default:
      return 'var(--card-body-bg-stone, rgba(0,0,0,0.05))';
  }
}

function getFactionColor(coreName: string): string {
  if (coreName.includes('질서')) return '#ef4444';
  if (coreName.includes('혼돈')) return '#3b82f6';
  return 'var(--border-color)';
}


interface Props {
  onSelect: (name: string) => void;
  reloadKey?: number;
}

const PAGE_STEP = 30;

// 칭호 필터 옵션 (label = UI 표시, value = SQL ILIKE 매칭용)
const TITLE_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: '혹한의 군주',     value: '혹한의 군주' },
  { label: '홍염의 군주',     value: '홍염의 군주' },
  { label: '심연의 군주',     value: '심연의 군주' },
  { label: '돌로리스',       value: '돌로리스' },
  { label: '이클립스',       value: '이클립스' },
  { label: '에스더의 결속자', value: '에스더의 결속자' },
  { label: '에스더의 후계자', value: '에스더의 후계자' },
  { label: '카멘 시리즈',    value: '카멘' },
  { label: '카제로스 시리즈', value: '카제로스' },
];

// 칭호 필터: 칭호 디자인(아이콘+색상)을 그대로 렌더
const TITLE_FILTER_GROUPS: FilterGroup[] = [{
  options: TITLE_FILTER_OPTIONS.map(t => ({
    value: t.value,
    label: t.label,
    node: <TitleBadge title={t.label} />,
  })),
}];

export default function CharacterRanking({ onSelect, reloadKey = 0 }: Props) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<string>('');
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [selectedAncient, setSelectedAncient] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [sort, setSort] = useState<SortState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasActiveFilter = !!(selectedSpec || selectedTitle || selectedAncient || selectedRole || sort);

  const resetFilters = () => {
    setSelectedSpec('');
    setSelectedTitle('');
    setSelectedAncient('');
    setSelectedRole('');
    setSort(null);
  };

  // 정렬 버튼 클릭: 같은 키 기준 desc → asc → 초기화(null) 순환
  const cycleSort = (key: SortKey) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return null;
    });
  };

  // 랭킹 API 쿼리 파라미터 조립 (필터·정렬 공통)
  const buildParams = (extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (sort) { p.set('sort', sort.key); p.set('dir', sort.dir); }
    if (selectedSpec) p.set('spec', selectedSpec);
    if (selectedTitle) p.set('title', selectedTitle);
    if (selectedAncient) p.set('ancient', selectedAncient);
    if (selectedRole) p.set('role', selectedRole);
    if (extra) for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p;
  };

  // 필터/정렬 변경 → 첫 페이지부터 새로 로드 (리셋)
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setEntries([]);
    setHasMore(false);

    fetch(`/api/character/ranking?${buildParams({ limit: String(PAGE_STEP) }).toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('랭킹을 불러올 수 없습니다.');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list: RankingEntry[] = data.entries || [];
        setEntries(list);
        setHasMore(list.length >= PAGE_STEP);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || '오류');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpec, selectedTitle, selectedAncient, selectedRole, sort]);

  // reloadKey 변경(새 캐릭터 저장 등) → 데이터만 갱신하고 "더보기로 펼친 개수"는 유지.
  // 첫 10개로 리셋하지 않음 → 캐릭터 보고 뒤로가기해도 보던 목록 그대로.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }

    let cancelled = false;
    const count = Math.max(entries.length, PAGE_STEP);
    fetch(`/api/character/ranking?${buildParams({ limit: String(count) }).toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('랭킹을 불러올 수 없습니다.');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list: RankingEntry[] = data.entries || [];
        setEntries(list);
        setHasMore(list.length >= count);
      })
      .catch(() => { /* 갱신 실패 시 기존 목록 유지 */ });

    return () => { cancelled = true; };
    // entries.length·필터는 의도적으로 deps에서 제외 (reloadKey 변경 시에만 실행)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // 동시 호출 방지용 ref (IntersectionObserver가 연속 발사해도 1회만)
  const loadingMoreRef = useRef(false);
  const handleLoadMore = async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const params = buildParams({ limit: String(PAGE_STEP), offset: String(entries.length) });
      const r = await fetch(`/api/character/ranking?${params.toString()}`);
      if (!r.ok) throw new Error('랭킹을 불러올 수 없습니다.');
      const data = await r.json();
      const list: RankingEntry[] = data.entries || [];
      setEntries(prev => [...prev, ...list]);
      setHasMore(list.length >= PAGE_STEP);
    } catch (e: any) {
      setError(e.message || '오류');
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // 스크롤이 목록 끝(센티넬)에 닿으면 자동으로 다음 페이지 로드
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreFnRef = useRef(handleLoadMore);
  loadMoreFnRef.current = handleLoadMore; // 항상 최신 클로저 참조
  useEffect(() => {
    if (!hasMore || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (es[0]?.isIntersecting) loadMoreFnRef.current();
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, isLoading]);

  // 통계 사이드바 breakdown·칩용 라벨
  const specEntry = selectedSpec ? TIER_ENTRIES.find(e => e.id === selectedSpec) : undefined;
  const specLabel = selectedSpec ? (specEntry?.name ?? selectedSpec) : undefined;
  const specIcon = specEntry?.icon;
  const titleLabel = selectedTitle ? (TITLE_FILTER_OPTIONS.find(t => t.value === selectedTitle)?.label ?? selectedTitle) : undefined;
  const ancientLabel = selectedAncient ? `${selectedAncient}고대` : undefined;
  const roleLabel = selectedRole === 'support' ? '서포터' : selectedRole === 'dealer' ? '딜러' : undefined;

  return (
    <div className={styles.layout}>
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>캐릭터 랭킹</h2>
        <div className={styles.controls}>
          <FilterSelect
            value={selectedSpec}
            onChange={setSelectedSpec}
            groups={SPEC_FILTER_GROUPS}
            placeholder="전체 직업"
            ariaLabel="직업/스펙 필터"
          />

          <FilterSelect
            value={selectedTitle}
            onChange={setSelectedTitle}
            groups={TITLE_FILTER_GROUPS}
            placeholder="전체 칭호"
            ariaLabel="칭호 필터"
            minWidth={200}
          />

          <select
            className={styles.classSelect}
            value={selectedAncient}
            onChange={(e) => setSelectedAncient(e.target.value)}
            aria-label="고대 코어 개수 필터"
          >
            <option value="">전체 고대</option>
            {[6, 5, 4, 3, 2, 1, 0].map((n) => (
              <option key={n} value={String(n)}>{n}고대</option>
            ))}
          </select>

          <select
            className={styles.classSelect}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            aria-label="역할 필터"
          >
            <option value="">전체 역할</option>
            <option value="dealer">딜러</option>
            <option value="support">서포터</option>
          </select>

          <div className={styles.sortGroup} role="group" aria-label="정렬 기준">
            <button
              type="button"
              className={`${styles.sortButton} ${sort?.key === 'combat_power' ? styles.active : ''}`}
              onClick={() => cycleSort('combat_power')}
              title="클릭: 내림차순 → 오름차순 → 초기화"
            >
              전투력{sort?.key === 'combat_power' ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
            </button>
            <button
              type="button"
              className={`${styles.sortButton} ${sort?.key === 'item_level' ? styles.active : ''}`}
              onClick={() => cycleSort('item_level')}
              title="클릭: 내림차순 → 오름차순 → 초기화"
            >
              아이템레벨{sort?.key === 'item_level' ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
            </button>
          </div>

          <button
            type="button"
            className={styles.resetButton}
            onClick={resetFilters}
            disabled={!hasActiveFilter}
          >
            초기화
          </button>
        </div>
      </div>

      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.emptyState}>{error}</div>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <div className={styles.emptyState}>
          {selectedSpec
            ? `아직 ${selectedSpec} 캐릭터가 조회되지 않았습니다.`
            : '아직 조회된 캐릭터가 없습니다. 위 검색창에서 캐릭터를 검색하면 랭킹에 반영됩니다.'}
        </div>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <>
        <div className={styles.cardList}>
          {entries.map((e, idx) => {
            const rank = idx + 1;
            const rankCls = rank === 1 ? styles.rank1 : rank === 2 ? styles.rank2 : rank === 3 ? styles.rank3 : '';
            const orderCores = e.cores.filter(c => c.name.includes('질서'));
            const chaosCores = e.cores.filter(c => c.name.includes('혼돈'));
            return (
              <button
                key={e.characterName}
                type="button"
                className={styles.card}
                onClick={() => onSelect(e.characterName)}
              >
                <div className={`${styles.rank} ${rankCls}`}>#{rank}</div>
                <div className={styles.charImage}>
                  {e.characterImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.characterImage} alt={e.characterName} loading="lazy" decoding="async" />
                  ) : null}
                </div>
                <div className={styles.charInfo}>
                  <div className={styles.charName}>{e.characterName}</div>
                  {e.equippedTitle && <TitleBadge title={e.equippedTitle} />}
                </div>

                <div className={styles.stats}>
                  <div className={styles.statLine}>
                    <span className={styles.statLabel}>전투력:</span>
                    <span className={`${styles.statValue} ${styles.statValueCombat} ${sort?.key === 'combat_power' ? styles.statValueActive : ''}`}>
                      {formatNumber(e.combatPower, 2)}
                    </span>
                  </div>
                  <div className={styles.statLine}>
                    <span className={styles.statLabel}>아이템레벨:</span>
                    <span className={`${styles.statValue} ${styles.statValueItem} ${sort?.key === 'item_level' ? styles.statValueActive : ''}`}>
                      {formatNumber(e.itemLevel, 2)}
                    </span>
                  </div>
                </div>

                <div className={styles.meta}>
                  {e.specIcon ? (
                    <div className={styles.specIcon} title={e.specName || undefined}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.specIcon} alt={e.specName || ''} />
                    </div>
                  ) : null}
                  <div className={styles.metaText}>
                    <div className={styles.metaLine}>{e.serverName || '-'}</div>
                    <div className={styles.metaLine}>{e.specName || e.className}</div>
                  </div>
                </div>

                <div className={styles.coresRow}>
                  {orderCores.length > 0 && (
                    <div className={styles.coreGroup}>
                      {orderCores.map((c, i) => (
                        <CoreBadge key={`o${i}`} core={c} />
                      ))}
                    </div>
                  )}
                  {chaosCores.length > 0 && (
                    <div className={styles.coreGroup}>
                      {chaosCores.map((c, i) => (
                        <CoreBadge key={`c${i}`} core={c} />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {(hasMore || isLoadingMore) && (
          <div className={styles.loadMoreContainer}>
            {/* 스크롤이 닿으면 자동 로드되는 센티넬 */}
            <div ref={sentinelRef} aria-hidden="true" style={{ height: 1, width: '100%' }} />
            {isLoadingMore ? (
              <span className={styles.loadMoreText}>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                불러오는 중...
              </span>
            ) : (
              <button
                type="button"
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
              >
                더보기
              </button>
            )}
          </div>
        )}
        </>
      )}
    </section>

      <aside className={styles.statsAside}>
        <FilterStats
          spec={selectedSpec}
          title={selectedTitle}
          ancient={selectedAncient}
          role={selectedRole}
          labels={{ spec: specLabel, specIcon, title: titleLabel, ancient: ancientLabel, role: roleLabel }}
        />
      </aside>
    </div>
  );
}

function CoreBadge({ core }: { core: Core }) {
  const bg = getCoreGradeGradient(core.grade);
  const factionColor = getFactionColor(core.name);
  const shortName = (core.name || '').replace(/.*코어\s*[:\-]\s*/, '');
  return (
    <div
      className={styles.coreBadge}
      style={{
        background: bg,
        borderColor: factionColor,
        boxShadow: `0 0 6px ${factionColor}44`,
      }}
      title={`${core.name} (${core.grade || ''}) ${core.point || 0}P`}
    >
      {core.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={core.icon} alt={shortName} />
      ) : null}
    </div>
  );
}
