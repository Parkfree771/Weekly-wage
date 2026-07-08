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
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from '@/app/tier/faq-data';

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

  // 직전 시즌(05.17) 티어맵: 표시 시즌 대비 '상승' 판정용. { 직업id: 티어 }
  const compareTo = SEASONS.find((s) => s.id === season)?.compareTo;
  const [prevTiers, setPrevTiers] = useState<Record<string, number>>({});

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

  // 직전 시즌 스냅샷 로드 (비교 대상 시즌이 있을 때만)
  useEffect(() => {
    if (!compareTo) {
      setPrevTiers({});
      return;
    }
    let cancelled = false;
    fetch(`/api/tier/stats?season=${encodeURIComponent(compareTo)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TierStats | null) => {
        if (cancelled || !d) return;
        const map: Record<string, number> = {};
        d.classes.forEach((c) => {
          map[c.id] = c.tier;
        });
        setPrevTiers(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [compareTo]);

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

  // 직전 시즌 대비 티어 상승 여부 (티어 숫자가 작아지면 상승). 둘 다 배정된 경우만.
  const isRisen = (r: StatsClass) => {
    if (!compareTo) return false;
    const prev = prevTiers[r.id];
    return !!prev && r.tier > 0 && r.tier < prev;
  };

  const renderTile = (r: StatsClass, withScore = true) => (
    <button key={r.id} className={styles.tile} onClick={() => openDetail(r)}>
      {r.role === 'support' && <span className={styles.roleBadge}>폿</span>}
      {isRisen(r) && (
        <span className={styles.riseBadge} title="직전 시즌 대비 티어 상승">
          ▲ 상승
        </span>
      )}
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

        <p className="small text-muted" style={{ marginTop: '-0.5rem', marginBottom: '1.1rem' }}>
          이 티어표는 시뮬레이터 계산값이 아니라, 로그인한 이용자들이 실제 레이드에서 느낀 체감을 바탕으로 같은 역할의 다른 직업과 비교해 매긴 투표를 모아 만든 결과입니다. 딜러는 딜러끼리, 서포터는 서포터끼리만 비교하며, 점수는 스스로 매긴 값이 아니라 남에게 받은 평가만으로 계산됩니다.
        </p>

        {tiers.map((tier) => {
          const rows = tierRows(tier);
          // 1~5 티어 칸은 항상 노출(투표 유도). 표본 없으면 빈 칸으로 둔다.
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
                {rows.length > 0 ? (
                  rows.map((r) => renderTile(r))
                ) : (
                  <span className={styles.emptyTier}>아직 투표가 없어요</span>
                )}
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

        <GuideFaq
          guideTitle="티어 산정 방법 자세히 보기"
          intro={[
            '이 페이지의 티어와 점수는 아래와 같은 절차로 계산됩니다. 계산 로직을 알아두면 내 직업이 왜 특정 티어에 있는지, 점수가 어떻게 오르내리는지 이해하는 데 도움이 됩니다.',
          ]}
          sections={[
            {
              heading: '딜러 티어 산정 — 받은 평가만 반영',
              paragraphs: [
                '딜러는 이용자가 자신의 주력 직업을 고른 뒤, 같은 역할(딜러)의 다른 직업들을 상대로 1(무조건 이김)부터 5(때려죽여도 못 이김)까지 5단계로 체감 평가를 매기는 방식으로 투표가 쌓입니다.',
                '중요한 점은 어떤 직업의 점수가 "그 직업을 고른 사람이 스스로 매긴 값"이 아니라 "다른 직업 이용자들이 그 직업을 상대로 매긴 값"만 모아서 계산된다는 것입니다. 예를 들어 소서 유저가 인파이터를 상대로 "못 이긴다(5)"를 선택하면, 그 평가는 소서가 아니라 인파이터 쪽 점수에 긍정적으로 반영됩니다. 이런 구조 덕분에 자기 직업을 스스로 후하게 평가해도 자기 점수에는 영향을 주지 못합니다.',
                '표본이 적은 직업의 점수가 소수 극단값에 흔들리지 않도록, 투표 수가 적을수록 점수를 중립값(0점)에 가깝게 당기는 통계적 보정을 함께 적용합니다. 투표가 많이 쌓인 직업일수록 이 보정의 영향은 작아지고 실제 평균에 가까워집니다.',
              ],
            },
            {
              heading: '서포터는 선호 순위 방식으로 별도 집계',
              paragraphs: [
                '바드, 도화가, 홀리나이트, 발키리 네 서포터 직업은 딜러처럼 1:1 딜량 우열을 매길 수 없기 때문에 다른 방식을 씁니다. 딜러 직업을 고른 이용자가 선호하는 서포터를 좋은 순서대로 체크하면, 1순위에 가장 큰 가중치가, 순위가 낮아질수록 점차 작은 가중치가 부여되어 합산됩니다.',
                '서포터의 점수는 이렇게 합산된 값을 가장 높은 서포터 기준 100점으로 환산한 상대 점수이며, 여러 서포터가 같은 점수를 받으면 같은 티어로 묶입니다.',
              ],
            },
            {
              heading: '티어 구간은 절대 점수가 아닌 상대 순위로 결정',
              paragraphs: [
                '1~5티어는 정해진 점수 구간이 아니라, 그 시즌에 표본이 충분한 직업들을 점수 순으로 나열했을 때의 순위 비율로 나뉩니다. 상위 15%는 1티어, 다음 20%는 2티어, 중간 30%는 3티어, 다음 20%는 4티어, 하위 15%는 5티어로 배치됩니다.',
                '이 방식 덕분에 투표 초반이라 표본이 적은 시기에도 직업들이 1~5티어에 고르게 나뉘어 표시됩니다. 아직 한 표도 받지 못한(0표) 직업은 티어에 배정되지 않고 "표본 부족" 칸에 별도로 모아 표시합니다.',
              ],
            },
            {
              heading: '시즌 구분과 티어 변동 표시',
              paragraphs: [
                '시즌은 클래스 밸런스 패치 시점을 기준으로 나뉩니다. 새로운 밸런스 패치가 적용되면 새 시즌이 열리고, 이전 시즌의 투표 기록은 그대로 남아 시즌별로 비교해볼 수 있습니다. 화면 상단의 시즌 선택 메뉴에서 과거 시즌의 티어표도 확인할 수 있습니다.',
                '직전 시즌 대비 티어가 오른 직업에는 "▲ 상승" 표식이 붙어, 패치로 인한 체감 변화를 한눈에 볼 수 있습니다.',
              ],
            },
          ]}
          faqs={faqData}
        />
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
