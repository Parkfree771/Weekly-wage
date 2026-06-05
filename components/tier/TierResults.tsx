'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import ClassIcon from '@/components/tier/ClassIcon';
import {
  TIER_COLORS,
  score100Color,
  MATCHUP_SCALE,
  matchupColor,
  SEASONS,
  CURRENT_SEASON,
} from '@/lib/tier-data';
import type { TierStats, StatsClass } from '@/lib/tier-server';
import styles from '@/app/tier/page.module.css';

// 받은 평가 모달: 다른 직업(평가자)이 '이 직업'을 상대로 찍은 값 그대로의 의미
const RECV_LABEL: Record<number, string> = {
  1: '이 직업을 무조건 이김',
  2: '이 직업을 대부분 이김',
  3: '이 직업과 비슷',
  4: '이 직업에게 대부분 짐',
  5: '이 직업에게 못 이김',
};

export default function TierResults({ stats }: { stats: TierStats | null }) {
  const [detail, setDetail] = useState<StatsClass | null>(null);
  const [openLevel, setOpenLevel] = useState<number | null>(null);

  // 시즌 토글: 초기엔 서버가 준 현재 시즌. 바꾸면 클라이언트에서 재조회.
  const [season, setSeason] = useState(stats?.season ?? CURRENT_SEASON.id);
  const [data, setData] = useState<TierStats | null>(stats);
  const [loadingSeason, setLoadingSeason] = useState(false);

  useEffect(() => {
    if (data && data.season === season) return; // 이미 보유한 시즌
    let cancelled = false;
    setLoadingSeason(true);
    fetch(`/api/tier/stats?season=${encodeURIComponent(season)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSeason(false);
      });
    return () => {
      cancelled = true;
    };
  }, [season, data]);

  const openDetail = (cls: StatsClass) => {
    setDetail(cls);
    setOpenLevel(null);
  };

  const classes = data?.classes ?? [];
  const tiers = [1, 2, 3, 4, 5];

  // 딜러 먼저, 서포터 나중 — 한 밴드 안에서 정렬
  const tierRows = (tier: number) =>
    classes
      .filter((r) => r.tier === tier)
      .sort((a, b) => (a.role === b.role ? 0 : a.role === 'dealer' ? -1 : 1));

  const renderTile = (r: StatsClass, withScore = true) => (
    <button key={r.id} className={styles.tile} onClick={() => openDetail(r)}>
      {r.role === 'support' && <span className={styles.roleBadge}>폿</span>}
      <ClassIcon name={r.name} src={r.icon} size={72} />
      <span className={styles.tileName}>{r.name}</span>
      {withScore && (
        <span
          className={styles.tileScore}
          style={{ backgroundColor: score100Color(r.score100) }}
        >
          {r.score100}
        </span>
      )}
    </button>
  );

  // 모달: 딜러는 매치업 분포, 서포터는 선호 순위 분포
  const isSupport = detail?.role === 'support';
  const distMap =
    detail && !isSupport ? data?.received?.[detail.id] ?? {} : {};
  const levelTotals = [0, 0, 0, 0, 0];
  Object.values(distMap).forEach((arr) =>
    arr.forEach((n, i) => (levelTotals[i] += n))
  );
  const maxTotal = Math.max(1, ...levelTotals);

  const supportVoterTotal = data?.supportVoterTotal ?? 0;

  const insufRows = classes.filter((r) => r.tier === 0);

  return (
    <Container fluid style={{ maxWidth: 1140 }}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>로아 직업 티어표</h1>
            <div className={styles.season}>
              <select
                className={styles.seasonSelect}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                aria-label="시즌 선택"
              >
                {SEASONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className={styles.legend}>
                <span className={styles.legendDot}>폿</span> 서포터(선호 순위)
              </span>
              {loadingSeason && <span>불러오는 중…</span>}
            </div>
          </div>
          <Link href="/tier/vote" className={styles.voteCta}>
            내 직업으로 투표하기
          </Link>
        </div>

        {tiers.map((tier) => {
          const rows = tierRows(tier);
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
                {rows.map((r) => renderTile(r))}
              </div>
            </div>
          );
        })}

        {insufRows.length > 0 && (
          <div className={`${styles.tierRow} ${styles.insufRow}`}>
            <div className={`${styles.tierLabelCell} ${styles.insufLabelCell}`}>
              <span className={styles.insufLabel}>표본 부족</span>
            </div>
            <div className={styles.tierTiles}>
              {insufRows
                .sort((a, b) =>
                  a.role === b.role ? 0 : a.role === 'dealer' ? -1 : 1
                )
                .map((r) => renderTile(r, false))}
            </div>
          </div>
        )}
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
                  {isSupport ? '서포터' : detail.group} · 투표 {detail.votes}표
                </div>
              </div>
            </div>

            {isSupport ? (
              <>
                <div className={styles.modalSectionLabel}>
                  선호 서포터 선택 결과
                </div>
                <div className={styles.barBlock}>
                  <div className={styles.barRow}>
                    <span className={styles.barName}>선호 지수</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${detail.score100}%`,
                          background: score100Color(detail.score100),
                        }}
                      />
                    </div>
                    <span className={styles.barVal}>{detail.score100}</span>
                  </div>
                </div>
                <p className={styles.modalSub} style={{ marginTop: '0.7rem' }}>
                  전체 {supportVoterTotal}표 중 {detail.votes}표가 이 서포터를
                  선호 순위에 넣었어요
                  {supportVoterTotal > 0 &&
                    ` (${Math.round((detail.votes / supportVoterTotal) * 100)}%)`}
                  . 한 표는 (계정 × 평가 직업) 기준이라, 한 사람도 직업별로 각각
                  한 표예요. 선호 지수는 순위 가중(1위일수록 높음) 점수를 최고값
                  100 기준으로 환산한 값이에요.
                </p>

                {(() => {
                  const pickers = data?.supportPickers?.[detail.id] ?? {};
                  const list = Object.entries(pickers)
                    .map(([id, count]) => ({ id, count }))
                    .sort((a, b) => b.count - a.count);
                  if (list.length === 0) return null;
                  return (
                    <>
                      <div
                        className={styles.modalSectionLabel}
                        style={{ marginTop: '1.1rem' }}
                      >
                        이 서포터를 선호한 직업
                      </div>
                      <div className={styles.expandGrid}>
                        {list.map(({ id, count }) => {
                          const c = classes.find((x) => x.id === id);
                          return (
                            <span
                              key={id}
                              className={styles.iconWrap}
                              title={c?.name ?? id}
                            >
                              <ClassIcon
                                name={c?.name ?? id}
                                src={c?.icon}
                                size={46}
                              />
                              <span
                                className={styles.countBadge}
                                style={{ background: '#8b5cf6' }}
                              >
                                {count}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <div className={styles.modalSectionLabel}>
                  다른 직업들이 이 직업을 상대로 매긴 평가 (받은 평가)
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
                        <span className={styles.barName}>
                          {RECV_LABEL[s.value]}
                        </span>
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
              </>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
