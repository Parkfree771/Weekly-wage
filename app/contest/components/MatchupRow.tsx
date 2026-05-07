'use client';

import { useEffect, useState } from 'react';
import styles from '../contest.module.css';
import type { ContestIllustration, ContestMatchup } from '@/types/contest';
import IllustrationCard from './IllustrationCard';
import InlineWeaponPanel from './InlineWeaponPanel';
import { OFFICIAL_EVENT_URL } from '@/data/contest-data';

type Props = {
  matchup: ContestMatchup;
  left: ContestIllustration;
  right: ContestIllustration;
  likeCounts: Record<string, number>;
  likedSet: Set<string>;
  expandedSlug: string | null;
  onToggleExpand: (slug: string) => void;
  onLikeChange: (slug: string, liked: boolean, newCount: number) => void;
};

const MOBILE_BREAKPOINT = 720;

function useIsMobile(breakpoint: number) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

export default function MatchupRow({
  matchup,
  left,
  right,
  likeCounts,
  likedSet,
  expandedSlug,
  onToggleExpand,
  onLikeChange,
}: Props) {
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const expandedSide: 'left' | 'right' | null =
    expandedSlug === left.slug ? 'left' : expandedSlug === right.slug ? 'right' : null;

  const expandedIllustration = expandedSide === 'left' ? left : expandedSide === 'right' ? right : null;

  const panel = expandedIllustration ? (
    <InlineWeaponPanel
      key={expandedIllustration.slug}
      illustrationSlug={expandedIllustration.slug}
      onClose={() => onToggleExpand(expandedIllustration.slug)}
    />
  ) : null;

  return (
    <article className={styles.matchupRow} id={`matchup-${matchup.slug}`}>
      <div className={styles.matchupInner}>
        <header className={styles.matchupHeader}>
          <span className={styles.matchupLabel}>{matchup.label}</span>
        </header>

        <div className={styles.matchupBody}>
          <IllustrationCard
            illustration={left}
            initialLikeCount={likeCounts[left.slug] ?? 0}
            initialLiked={likedSet.has(left.slug)}
            isExpanded={expandedSlug === left.slug}
            onToggleExpand={onToggleExpand}
            onLikeChange={onLikeChange}
          />
          {isMobile && expandedSide === 'left' && panel}

          <div className={styles.versusBadge}>
            <div className={styles.versusBox}>
              <span className={styles.versusText}>VS</span>
            </div>
            <a
              href={OFFICIAL_EVENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.voteBtn}
            >
              투표하러 가기
            </a>
          </div>

          <IllustrationCard
            illustration={right}
            initialLikeCount={likeCounts[right.slug] ?? 0}
            initialLiked={likedSet.has(right.slug)}
            isExpanded={expandedSlug === right.slug}
            onToggleExpand={onToggleExpand}
            onLikeChange={onLikeChange}
          />
          {isMobile && expandedSide === 'right' && panel}
        </div>

        {/* 데스크톱: row 통째 아래에 패널 */}
        {!isMobile && panel}
      </div>
    </article>
  );
}
