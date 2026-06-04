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

  // 직업 선택 시 내가 매긴 기존 평가 불러오기 (Neon)
  useEffect(() => {
    if (!user || !selectedId) return;
    let cancelled = false;
    setSubmitted(false);
    setRatings({});
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/tier/my-votes?voterClass=${encodeURIComponent(selectedId)}`,
          { headers: { authorization: `Bearer ${token}` } }
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setRatings((data.votes as Ratings) ?? {});
      } catch {
        /* 빈 상태 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedId]);

  // 선호 서포터: 로그인 시 기존 선택 1회 로드 (매치업과 독립)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/tier/support', {
          headers: { authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok)
          setSupportPicks((data.supports as string[]) ?? []);
      } catch {
        /* 빈 상태 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  // 선호 서포터 체크 (사이드바, 제출 위). 4개 아이콘 토글 — 중복 선택 가능.
  const supportSidebar = (
    <div className={styles.supportPick}>
      <div className={styles.supportPickHead}>선호 서포터 · 중복 선택 가능</div>
      <div className={styles.supportPickGrid}>
        {SUPPORT_ENTRIES.map((e) => {
          const on = supportPicks.includes(e.id);
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
              <ClassIcon name={e.name} src={e.icon} size={44} />
              <span className={styles.supportPickName}>{e.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── 0. 인증 로딩 ──
  if (loading) {
    return (
      <Container>
        <div className={styles.wrap}>
          <div className={styles.gate}>
            <div className={styles.gateText}>불러오는 중…</div>
          </div>
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
      </div>
    </Container>
  );
}
