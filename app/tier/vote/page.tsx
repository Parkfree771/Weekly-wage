'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import ClassIcon from '@/components/tier/ClassIcon';
import {
  MATCHUP_SCALE,
  TIER_CLASSES,
  SUPPORT_ENTRIES,
  tierGroupsForRole,
  type MatchupValue,
} from '@/lib/tier-data';
import styles from './page.module.css';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';

type Ratings = Record<string, MatchupValue>;

// 매치업(이김/짐)은 딜러끼리만. 서포터는 사이드바에서 선호 체크(중복 가능).
const DEALER_GROUPS = tierGroupsForRole('dealer');

// 1~2 이김(초록) / 3 비슷(회색) / 4~5 짐(빨강)
function segColor(value: number) {
  if (value <= 2) return 'var(--profit-color)';
  if (value === 3) return 'var(--neutral-color)';
  return 'var(--loss-color)';
}
function segSelClass(value: number) {
  if (value <= 2) return styles.segWin;
  if (value === 3) return styles.segNeutral;
  return styles.segLose;
}

export default function TierVotePage() {
  const { user, loading, signInWithGoogle } = useAuth();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Ratings>({});
  const [submitted, setSubmitted] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [saving, setSaving] = useState(false);

  // 선호 서포터 체크 (중복 가능). 매치업과 함께 제출 — 누구나 선택.
  const [supportPicks, setSupportPicks] = useState<string[]>([]);

  const byId = useMemo(
    () => Object.fromEntries(TIER_CLASSES.map((e) => [e.id, e])),
    []
  );
  const selected = selectedId ? byId[selectedId] : null;

  // 직업 선택 시: 그 직업으로 매긴 매치업 + 그 직업의 선호 서포터를 함께 불러온다.
  // 직업마다 선호가 다르므로 직업을 바꾸면 서포터 선택도 초기화 후 해당 직업 것으로 갱신.
  useEffect(() => {
    if (!user || !selectedId) return;
    let cancelled = false;
    setSubmitted(false);
    setRatings({});
    setSupportPicks([]);
    (async () => {
      try {
        const token = await user.getIdToken();
        const headers = { authorization: `Bearer ${token}` };
        const [voteRes, supRes] = await Promise.all([
          fetch(
            `/api/tier/my-votes?voterClass=${encodeURIComponent(selectedId)}`,
            { headers }
          ),
          fetch(
            `/api/tier/support?voterClass=${encodeURIComponent(selectedId)}`,
            { headers }
          ),
        ]);
        const voteData = await voteRes.json().catch(() => ({}));
        const supData = await supRes.json().catch(() => ({}));
        if (cancelled) return;
        if (voteRes.ok) setRatings((voteData.votes as Ratings) ?? {});
        if (supRes.ok) setSupportPicks((supData.supports as string[]) ?? []);
      } catch {
        /* 빈 상태 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedId]);

  const toggleSupport = (id: string) => {
    setSupportPicks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setRating = (id: string, value: MatchupValue) => {
    setRatings((prev) => {
      if (prev[id] === value) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: value };
    });
  };

  const handleSubmit = async () => {
    if (!user || !selectedId || saving) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const headers = {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      };
      // 딜러 매치업 + 선호 서포터 체크를 함께 저장
      const [voteRes, supRes] = await Promise.all([
        fetch('/api/tier/vote', {
          method: 'POST',
          headers,
          body: JSON.stringify({ voterClass: selectedId, ratings }),
        }),
        fetch('/api/tier/support', {
          method: 'POST',
          headers,
          body: JSON.stringify({ supports: supportPicks, voterClass: selectedId }),
        }),
      ]);
      if (!voteRes.ok || !supRes.ok) throw new Error();
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      alert('제출에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      /* AuthContext에서 처리 */
    } finally {
      setSigningIn(false);
    }
  };

  const ratedCount = Object.keys(ratings).length;

  // 선호 서포터 (사이드바, 제출 위). 좋은 순서대로 눌러 선호 순위를 매긴다.
  const supportSidebar = (
    <div className={styles.supportPick}>
      <div className={styles.supportPickHead}>선호 서포터 · 좋은 순서대로 선택</div>
      <div className={styles.supportPickGrid}>
        {SUPPORT_ENTRIES.map((e) => {
          const rank = supportPicks.indexOf(e.id); // -1 = 미선택
          const on = rank >= 0;
          return (
            <button
              key={e.id}
              type="button"
              className={`${styles.supportPickItem} ${
                on ? styles.supportPickOn : ''
              }`}
              onClick={() => toggleSupport(e.id)}
              title={e.name}
            >
              {on && (
                <span className={styles.supportRankBadge}>{rank + 1}</span>
              )}
              <ClassIcon name={e.name} src={e.icon} size={44} />
              <span className={styles.supportPickName}>{e.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // 가이드 + FAQ: 로그인 여부와 무관하게 동일한 내용을 노출한다(비로그인 방문자도 볼 수 있도록).
  const voteGuideFaq = (
    <GuideFaq
      guideTitle="투표 이용 가이드"
      intro={[
        '이 페이지에서는 내가 체감한 직업 간 강함 차이를 직접 투표로 남길 수 있습니다. 투표는 로아로골 직업 티어표 통계에 그대로 반영되며, 한 번 제출한 뒤에도 언제든 다시 들어와 값을 바꿀 수 있습니다.',
      ]}
      sections={[
        {
          heading: '투표 진행 순서',
          paragraphs: [
            '가장 먼저 매치업 평가의 기준이 될 내 주력 딜러 직업(각인)을 고릅니다. 화면에는 같은 역할군인 딜러 직업들만 그룹별로 나열되며, 서포터는 여기서 직접 고르지 않습니다.',
            '주력 직업을 고르면 나머지 딜러 직업들이 카드 형태로 나열되고, 카드마다 1(무조건 이김)부터 5(때려죽여도 못 이김)까지 5단계 버튼이 붙어 있습니다. 체감에 맞는 값을 하나 누르면 선택되고, 같은 값을 다시 누르면 선택이 취소됩니다. 모든 상대를 다 평가할 필요는 없고, 확신이 없는 상대는 비워둬도 됩니다.',
            '시즌은 클래스 밸런스 패치 시점을 기준으로 구분되며, 새 패치로 시즌이 바뀌어도 이전 시즌 투표 기록은 그대로 보존되고 새 시즌 투표는 별도로 다시 쌓입니다.',
          ],
        },
        {
          heading: '서포터 선호 투표는 사이드바에서',
          paragraphs: [
            '서포터 4종(바드, 도화가, 홀리나이트, 발키리)은 딜량을 직접 비교할 수 없어 매치업 평가 대신, 주력 딜러를 고른 뒤 화면 오른쪽 사이드바에서 선호하는 서포터를 좋은 순서대로 체크하는 방식으로 참여합니다. 먼저 선택할수록 더 높은 순위로 기록되고, 이 순위는 집계 시 가중치로 환산됩니다.',
            '서포터 선호는 주력 딜러 단위로 따로 저장되기 때문에, 여러 딜러로 투표하는 이용자는 딜러마다 다른 서포터 선호를 남길 수 있습니다.',
          ],
        },
        {
          heading: '수정, 로그인, 집계 반영',
          paragraphs: [
            '투표는 1인 1표 집계를 위해 구글 로그인이 필요하며, 제출된 평가는 로그인 계정과 선택한 주력 직업 단위로 저장됩니다. 같은 직업으로 다시 들어오면 이전에 남긴 평가가 그대로 불러와지고, 값을 바꿔 다시 제출하면 기존 기록이 새 값으로 교체됩니다.',
            '역할이 다른 직업 간의 평가(예: 딜러 기준으로 서포터를 매기는 값)는 비교 의미가 없다고 보아 통계 집계에서 제외되며, 딜러 매치업 점수와 서포터 선호 점수는 항상 따로 계산됩니다.',
            '제출을 마치면 서버의 집계 캐시가 즉시 무효화되어, 티어표 페이지를 새로고침하면 반영된 결과를 바로 확인할 수 있습니다.',
          ],
        },
      ]}
      faqs={faqData}
    />
  );

  // ── 0. 인증 로딩 ──
  // 로그인 여부 확인 중에도 h1/가이드/FAQ는 항상 렌더링(크롤러·리뷰어가 빈 화면을 보지 않도록).
  if (loading) {
    return (
      <Container>
        <div className={styles.wrap}>
          <h1 className={styles.title}>직업 티어 투표</h1>
          <div className={styles.gate}>
            <div className={styles.gateText}>불러오는 중…</div>
          </div>
          {voteGuideFaq}
        </div>
      </Container>
    );
  }

  // ── 1. 로그인 게이트 ──
  if (!user) {
    return (
      <Container>
        <div className={styles.wrap}>
          <h1 className={styles.title}>직업 티어 투표</h1>
          <div className={styles.gate}>
            <div className={styles.gateTitle}>로그인하고 한 표 반영하기</div>
            <p className={styles.gateText}>
              티어표는 누구나 볼 수 있지만, 투표는 1인 1표 집계를 위해
              로그인이 필요해요. 구글 계정으로 1초면 됩니다.
            </p>
            <button
              className={styles.primaryBtn}
              onClick={handleSignIn}
              disabled={signingIn}
            >
              {signingIn ? '로그인 중…' : '구글로 로그인'}
            </button>
            <div style={{ marginTop: '1rem' }}>
              <Link href="/tier" className={styles.linkBtn}>
                티어표 먼저 보기
              </Link>
            </div>
          </div>
          {voteGuideFaq}
        </div>
      </Container>
    );
  }

  // ── 완료 상태 ──
  if (submitted && selected) {
    return (
      <Container>
        <div className={styles.wrap}>
          <div className={styles.gate}>
            <div className={styles.doneIcon}>제출 완료</div>
            <div className={styles.gateTitle}>
              {selected.name} 기준 {ratedCount}개 평가가 반영됐어요
            </div>
            <p className={styles.gateText}>
              시즌 중 언제든 다시 들어와 수정할 수 있고, 다른 직업으로도
              투표할 수 있어요.
            </p>
            <div className={styles.doneActions}>
              <Link href="/tier" className={styles.primaryBtn}>
                티어표 보기
              </Link>
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setSelectedId(null);
                  setRatings({});
                  setSubmitted(false);
                }}
              >
                다른 직업으로 투표
              </button>
            </div>
          </div>
          {voteGuideFaq}
        </div>
      </Container>
    );
  }

  // ── 2. 직업 선택 + 서포터 선호 순위 ──
  if (!selected) {
    return (
      <Container fluid style={{ maxWidth: 1200 }}>
        <div className={styles.wrap} style={{ maxWidth: 1100 }}>
          <h1 className={styles.title}>직업 티어 투표</h1>
          <p className={styles.subtitle}>
            매치업 평가할 내 주력 딜러(각인)를 골라주세요. 딜러당 한 번 평가할
            수 있어요. 직업을 고르면 다음 화면에서 선호 서포터도 함께 체크할 수
            있어요.
          </p>
          <p className={styles.subtitle}>
            평가 결과는 로아로골 직업 티어표에 그대로 반영되는 크라우드소싱
            통계입니다. 점수는 내가 매긴 값이 아니라 다른 이용자들에게 받은
            평가만으로 계산되니, 부담 없이 체감 그대로 골라주세요.
          </p>
          <div className={styles.picker}>
            {DEALER_GROUPS.map((g) => (
              <div key={g.group} className={styles.pickerGroup}>
                <div className={styles.pickerGroupLabel}>{g.group}</div>
                <div className={styles.pickerGrid}>
                  {g.entries.map((e) => (
                    <button
                      key={e.id}
                      className={styles.pickTile}
                      onClick={() => setSelectedId(e.id)}
                    >
                      <ClassIcon name={e.name} src={e.icon} size={56} />
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {voteGuideFaq}
        </div>
      </Container>
    );
  }

  // ── 3. 평가 (가로 그리드 + 사이드바) ──
  return (
    <Container fluid style={{ maxWidth: 1320 }}>
      <div className={styles.wrap}>
        <div className={styles.boardHead}>
          <h1 className={styles.title}>{selected.name}</h1>
          <button className={styles.linkBtn} onClick={() => setSelectedId(null)}>
            직업 변경
          </button>
        </div>

        <div className={styles.layout}>
          {/* 왼쪽: 직업 카드 그리드 (딜러 매치업) */}
          <div>
            {DEALER_GROUPS.map((g) => {
              const entries = g.entries.filter((e) => e.id !== selectedId);
              if (entries.length === 0) return null;
              return (
                <div key={g.group} className={styles.matrixGroup}>
                  <div className={styles.matrixGroupLabel}>{g.group}</div>
                  <div className={styles.matrixGrid}>
                    {entries.map((e) => (
                      <div key={e.id} className={styles.classCard}>
                        <ClassIcon name={e.name} src={e.icon} size={96} />
                        <span className={styles.cardName}>{e.name}</span>
                        <div className={styles.segmented}>
                          {MATCHUP_SCALE.map((s) => {
                            const isSel = ratings[e.id] === s.value;
                            return (
                              <button
                                key={s.value}
                                className={`${styles.seg} ${
                                  isSel ? segSelClass(s.value) : ''
                                }`}
                                onClick={() => setRating(e.id, s.value)}
                                title={s.label}
                              >
                                {s.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 오른쪽: 사이드바 (요약 + 제출) */}
          <aside className={styles.sidebar}>
            <div className={styles.sideAnchor}>
              <ClassIcon name={selected.name} src={selected.icon} size={56} />
              <div className={styles.sideAnchorText}>
                <span className={styles.sideAnchorKicker}>기준</span>
                <span className={styles.sideAnchorName}>{selected.name}</span>
              </div>
            </div>

            <div className={styles.sideSummary}>
              {MATCHUP_SCALE.map((s) => {
                const ids = Object.entries(ratings)
                  .filter(([, v]) => v === s.value)
                  .map(([id]) => id);
                return (
                  <div key={s.value} className={styles.sideCat}>
                    <div className={styles.sideCatHead}>
                      <span
                        className={styles.sideCatNum}
                        style={{ background: segColor(s.value) }}
                      >
                        {s.value}
                      </span>
                      <span className={styles.sideCatLabel}>{s.label}</span>
                      <span className={styles.sideCatCount}>{ids.length}</span>
                    </div>
                    {ids.length > 0 && (
                      <div className={styles.sideChips}>
                        {ids.map((id) => {
                          const e = byId[id];
                          return (
                            <span
                              key={id}
                              className={styles.sideChip}
                              onClick={() => setRating(id, s.value)}
                              title="클릭 시 해제"
                            >
                              <ClassIcon name={e.name} src={e.icon} size={24} />
                              {e.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 선호 서포터 체크 (제출 위) */}
            {supportSidebar}

            <div className={styles.sideSubmit}>
              <span className={styles.sideProgress}>
                <strong>{ratedCount}</strong>개 평가 · 서포터{' '}
                <strong>{supportPicks.length}</strong>
              </span>
              <button
                className={styles.primaryBtn}
                onClick={handleSubmit}
                disabled={(ratedCount === 0 && supportPicks.length === 0) || saving}
              >
                {saving ? '제출 중…' : '제출'}
              </button>
            </div>
          </aside>
        </div>
        {voteGuideFaq}
      </div>
    </Container>
  );
}
