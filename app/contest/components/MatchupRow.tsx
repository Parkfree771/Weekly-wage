'use client';

import styles from '../contest.module.css';
import type { ContestIllustration, ContestMatchup } from '@/types/contest';
import IllustrationCard from './IllustrationCard';
import { OFFICIAL_EVENT_URL } from '@/data/contest-data';

type Props = {
  matchup: ContestMatchup;
  left: ContestIllustration;
  right: ContestIllustration;
  likeCounts: Record<string, number>;
  likedSet: Set<string>;
  onLikeChange: (slug: string, liked: boolean, newCount: number) => void;
};

export default function MatchupRow({
  matchup,
  left,
  right,
  likeCounts,
  likedSet,
  onLikeChange,
}: Props) {
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
            onLikeChange={onLikeChange}
          />
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
            onLikeChange={onLikeChange}
          />
        </div>
      </div>
    </article>
  );
}
