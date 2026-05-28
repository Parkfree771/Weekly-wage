'use client';

import { useEffect, useState } from 'react';
import { LOSTARK_CLASS_GROUPS } from '@/lib/lostark-classes';
import styles from './CharacterRanking.module.css';
import TitleBadge from './TitleBadge';

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
};

type SortBy = 'combat_power' | 'item_level';

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

const PAGE_STEP = 10;

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

export default function CharacterRanking({ onSelect, reloadKey = 0 }: Props) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('combat_power');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setEntries([]);
    setHasMore(false);

    const params = new URLSearchParams();
    params.set('limit', String(PAGE_STEP));
    params.set('sort', sortBy);
    if (selectedClass) params.set('class', selectedClass);
    if (selectedTitle) params.set('title', selectedTitle);

    fetch(`/api/character/ranking?${params.toString()}`)
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
  }, [selectedClass, selectedTitle, sortBy, reloadKey]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_STEP));
      params.set('offset', String(entries.length));
      params.set('sort', sortBy);
      if (selectedClass) params.set('class', selectedClass);
      if (selectedTitle) params.set('title', selectedTitle);

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
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>캐릭터 랭킹</h2>
        <div className={styles.controls}>
          <select
            className={styles.classSelect}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            aria-label="직업 필터"
          >
            <option value="">전체 직업</option>
            {LOSTARK_CLASS_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <select
            className={styles.classSelect}
            value={selectedTitle}
            onChange={(e) => setSelectedTitle(e.target.value)}
            aria-label="칭호 필터"
          >
            <option value="">전체 칭호</option>
            {TITLE_FILTER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className={styles.sortGroup} role="group" aria-label="정렬 기준">
            <button
              type="button"
              className={`${styles.sortButton} ${sortBy === 'combat_power' ? styles.active : ''}`}
              onClick={() => setSortBy('combat_power')}
            >
              전투력
            </button>
            <button
              type="button"
              className={`${styles.sortButton} ${sortBy === 'item_level' ? styles.active : ''}`}
              onClick={() => setSortBy('item_level')}
            >
              아이템레벨
            </button>
          </div>
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
          {selectedClass
            ? `아직 ${selectedClass} 캐릭터가 조회되지 않았습니다.`
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
                    <img src={e.characterImage} alt={e.characterName} />
                  ) : null}
                </div>
                <div className={styles.charInfo}>
                  <div className={styles.charName}>{e.characterName}</div>
                  {e.equippedTitle && <TitleBadge title={e.equippedTitle} />}
                </div>

                <div className={styles.stats}>
                  <div className={styles.statLine}>
                    <span className={styles.statLabel}>전투력:</span>
                    <span className={`${styles.statValue} ${styles.statValueCombat} ${sortBy === 'combat_power' ? styles.statValueActive : ''}`}>
                      {formatNumber(e.combatPower, 2)}
                    </span>
                  </div>
                  <div className={styles.statLine}>
                    <span className={styles.statLabel}>아이템레벨:</span>
                    <span className={`${styles.statValue} ${styles.statValueItem} ${sortBy === 'item_level' ? styles.statValueActive : ''}`}>
                      {formatNumber(e.itemLevel, 2)}
                    </span>
                  </div>
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaLine}>{e.serverName || '-'}</div>
                  <div className={styles.metaLine}>{e.className}</div>
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
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  불러오는 중...
                </>
              ) : (
                '더보기'
              )}
            </button>
          </div>
        )}
        </>
      )}
    </section>
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
