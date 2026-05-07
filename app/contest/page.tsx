'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './contest.module.css';
import {
  CONTEST_ILLUSTRATIONS,
  CONTEST_MATCHUPS,
  ILLUSTRATION_BY_SLUG,
  OFFICIAL_EVENT_URL,
  SECTION_TITLES,
} from '@/data/contest-data';
import {
  fetchIllustLikeCounts,
  fetchUserLikedIllusts,
} from '@/lib/contest-service';
import { useAuth } from '@/contexts/AuthContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import HeroSection from './components/HeroSection';
import MatchupRow from './components/MatchupRow';
import ParticleField from './components/ParticleField';
import AuroraBackground from './components/AuroraBackground';

const SECTIONS: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

export default function ContestPage() {
  const { user } = useAuth();

  const realIllustrations = useMemo(
    () => CONTEST_ILLUSTRATIONS.filter((i) => !i.comingSoon),
    [],
  );

  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const handleToggleExpand = useCallback((slug: string) => {
    setExpandedSlug((prev) => (prev === slug ? null : slug));
  }, []);

  const loadCounts = useCallback(
    async (force = false) => {
      try {
        const counts = await fetchIllustLikeCounts(force);
        setLikeCounts(counts);
      } catch (err) {
        console.error('일러스트 좋아요 카운트 로딩 실패:', err);
      }
    },
    [],
  );

  const loadUserLikes = useCallback(
    async (force = false) => {
      if (!user) {
        setLikedSet(new Set());
        return;
      }
      try {
        const slugs = realIllustrations.map((i) => i.slug);
        const liked = await fetchUserLikedIllusts(user.uid, slugs, force);
        setLikedSet(liked);
      } catch (err) {
        console.error('사용자 좋아요 상태 로딩 실패:', err);
      }
    },
    [user, realIllustrations],
  );

  // 초기 로딩 + user 변경 시
  useEffect(() => {
    loadCounts(false);
  }, [loadCounts]);
  useEffect(() => {
    loadUserLikes(false);
  }, [loadUserLikes]);

  // 다른 탭 갔다 돌아오면 강제 갱신
  usePageVisibility(
    useCallback(() => {
      loadCounts(true);
      loadUserLikes(true);
    }, [loadCounts, loadUserLikes]),
  );

  const handleLikeChange = (
    slug: string,
    liked: boolean,
    newCount: number,
  ) => {
    setLikeCounts((prev) => ({ ...prev, [slug]: newCount }));
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (liked) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const matchupsBySection = useMemo(() => {
    const map: Record<'A' | 'B' | 'C', typeof CONTEST_MATCHUPS> = {
      A: [],
      B: [],
      C: [],
    };
    for (const m of CONTEST_MATCHUPS) map[m.section].push(m);
    return map;
  }, []);

  return (
    <div className={styles.shell}>
      <AuroraBackground />
      <ParticleField className={styles.particleCanvas} density={75} />

      <div className={styles.content}>
        <HeroSection />

        {SECTIONS.map((section) => {
          const titleClass =
            section === 'A'
              ? styles.sectionTitleA
              : section === 'B'
                ? styles.sectionTitleB
                : styles.sectionTitleC;

          return (
            <section
              key={section}
              id={`section-${section}`}
              className={styles.sectionWrap}
            >
              <header className={styles.sectionHeader}>
                <div className={styles.sectionLabel}>SECTION {section}</div>
                <h2 className={`${styles.sectionTitle} ${titleClass}`}>
                  {SECTION_TITLES[section]}
                </h2>
              </header>

              {matchupsBySection[section].map((matchup) => {
                const left = ILLUSTRATION_BY_SLUG[matchup.leftSlug];
                const right = ILLUSTRATION_BY_SLUG[matchup.rightSlug];
                if (!left || !right) return null;
                return (
                  <MatchupRow
                    key={matchup.slug}
                    matchup={matchup}
                    left={left}
                    right={right}
                    likeCounts={likeCounts}
                    likedSet={likedSet}
                    expandedSlug={expandedSlug}
                    onToggleExpand={handleToggleExpand}
                    onLikeChange={handleLikeChange}
                  />
                );
              })}
            </section>
          );
        })}

        <div className={styles.officialCard}>
          <a
            href={OFFICIAL_EVENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaPrimary}
          >
            로스트아크 공식 이벤트 페이지로 이동 →
          </a>
        </div>

        <p className={styles.copyrightDisclaimer}>
          ※ 본 페이지의 일러스트는 <strong>SMILEGATE · 로스트아크</strong> 공식 이미지를 AI로 재가공한 비공식 팬 메이드입니다.
          모든 원본 권리는 스마일게이트(주)에 있습니다.
        </p>
      </div>
    </div>
  );
}
