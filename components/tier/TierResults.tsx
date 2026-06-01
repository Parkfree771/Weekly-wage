'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import ClassIcon from '@/components/tier/ClassIcon';
import {
  TIER_COLORS,
  score100Color,
  MATCHUP_SCALE,
  matchupColor,
} from '@/lib/tier-data';
import type { TierStats, StatsClass } from '@/lib/tier-server';
import styles from '@/app/tier/page.module.css';

const ZONE_LABEL: Record<number, string> = {
  1: '무조건 이김',
  2: '대부분 이김',
  3: '비슷',
  4: '대부분 짐',
  5: '못 이김',
};

export default function TierResults({ stats }: { stats: TierStats | null }) {
  const [detail, setDetail] = useState<StatsClass | null>(null);
  const [openLevel, setOpenLevel] = useState<number | null>(null);

  const openDetail = (cls: StatsClass) => {
    setDetail(cls);
    setOpenLevel(null);
  };

  const classes = stats?.classes ?? [];
  const tiers = [1, 2, 3, 4, 5];

  // 모달: 선택한 직업이 상대에게 준 평가 분포
  const distMap = detail ? stats?.matchups?.[detail.id] ?? {} : {};
  const levelTotals = [0, 0, 0, 0, 0];
  Object.values(distMap).forEach((arr) =>
    arr.forEach((n, i) => (levelTotals[i] += n))
  );
  const maxTotal = Math.max(1, ...levelTotals);

  return (
    <Container fluid style={{ maxWidth: 1140 }}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <h1 className={styles.title}>로아 직업 티어표</h1>
          <Link href="/tier/vote" className={styles.voteCta}>
            내 직업으로 투표하기
          </Link>
        </div>

        {tiers.map((tier) => {
          const rows = classes.filter((r) => r.tier === tier);
          if (rows.length === 0) return null;
          return (
            <div key={tier} className={styles.tierRow}>
              <div
                className={styles.tierLabelCell}
                style={{ backgroundColor: TIER_COLORS[tier] }}
              >
                <span className={styles.tierLabelNum}>{tier}</span>
                <span className={styles.tierLabelEng}>TIER</span>
              </div>
              <div className={styles.tierTiles}>
                {rows.map((r) => (
                  <button
                    key={r.id}
                    className={styles.tile}
                    onClick={() => openDetail(r)}
                  >
                    <ClassIcon name={r.name} src={r.icon} size={72} />
                    <span className={styles.tileName}>{r.name}</span>
                    <span
                      className={styles.tileScore}
                      style={{ backgroundColor: score100Color(r.score100) }}
                    >
                      {r.score100}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {(() => {
          const rows = classes.filter((r) => r.tier === 0);
          if (rows.length === 0) return null;
          return (
            <div className={`${styles.tierRow} ${styles.insufRow}`}>
              <div className={`${styles.tierLabelCell} ${styles.insufLabelCell}`}>
                <span className={styles.insufLabel}>표본 부족</span>
              </div>
              <div className={styles.tierTiles}>
                {rows.map((r) => (
                  <button
                    key={r.id}
                    className={styles.tile}
                    onClick={() => openDetail(r)}
                  >
                    <ClassIcon name={r.name} src={r.icon} size={72} />
                    <span className={styles.tileName}>{r.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {detail && (
        <div className={styles.modalBackdrop} onClick={() => setDetail(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setDetail(null)}
              aria-label="닫기"
            >
              닫기
            </button>

            <div className={styles.modalHead}>
              <ClassIcon name={detail.name} src={detail.icon} size={64} />
              <div>
                <div className={styles.modalTitle}>{detail.name}</div>
                <div className={styles.modalSub}>
                  {detail.group} · 투표 {detail.votes}표
                </div>
              </div>
            </div>

            <div className={styles.modalSectionLabel}>
              이 직업이 상대에게 준 평가 분포
            </div>

            {MATCHUP_SCALE.map((s) => {
              const total = levelTotals[s.value - 1];
              const pct = Math.round((total / maxTotal) * 100);
              const opps = Object.entries(distMap)
                .filter(([, arr]) => arr[s.value - 1] > 0)
                .map(([oppId, arr]) => ({ oppId, count: arr[s.value - 1] }))
                .sort((a, b) => b.count - a.count);
              const open = openLevel === s.value;
              return (
                <div key={s.value} className={styles.barBlock}>
                  <div className={styles.barRow}>
                    <span
                      className={styles.barNum}
                      style={{ background: matchupColor(s.value) }}
                    >
                      {s.value}
                    </span>
                    <span className={styles.barName}>{ZONE_LABEL[s.value]}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${pct}%`,
                          background: matchupColor(s.value),
                        }}
                      />
                    </div>
                    <span className={styles.barVal}>{total}</span>
                    <button
                      className={styles.viewBtn}
                      onClick={() => setOpenLevel(open ? null : s.value)}
                      disabled={opps.length === 0}
                    >
                      {open ? '접기' : '보기'}
                    </button>
                  </div>
                  {open && opps.length > 0 && (
                    <div className={styles.expandGrid}>
                      {opps.map(({ oppId, count }) => {
                        const opp = classes.find((c) => c.id === oppId);
                        return (
                          <span
                            key={oppId}
                            className={styles.iconWrap}
                            title={opp?.name ?? oppId}
                          >
                            <ClassIcon
                              name={opp?.name ?? oppId}
                              src={opp?.icon}
                              size={46}
                            />
                            <span
                              className={styles.countBadge}
                              style={{ background: matchupColor(s.value) }}
                            >
                              {count}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Container>
  );
}
