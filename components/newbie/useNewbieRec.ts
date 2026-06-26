'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type RankItem = {
  id: string;
  name: string;
  icon: string;
  group: string;
  count: number;
};

export function useNewbieRec() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [rankLoading, setRankLoading] = useState(true);

  const [votingMode, setVotingMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loginNeeded, setLoginNeeded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // 내가 이미 저장해 둔 추천 (있으면 "수정하기"로 표시)
  const [myPicks, setMyPicks] = useState<string[]>([]);

  const refreshRanking = useCallback(async () => {
    try {
      const res = await fetch('/api/newbie-rec', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRanking(data.ranking || []);
        setTotal(data.total || 0);
      }
    } catch {
      /* 무시 — 다음 새로고침에 재시도 */
    } finally {
      setRankLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRanking();
  }, [refreshRanking]);

  // 내 기존 추천 불러오기 (있으면 "수정하기" 표시 + 진입 시 프리필)
  const loadMyPicks = useCallback(async (): Promise<string[]> => {
    if (!user) {
      setMyPicks([]);
      return [];
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/newbie-rec/mine', {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const picks: string[] = data.picks || [];
        setMyPicks(picks);
        return picks;
      }
    } catch {
      /* 무시 */
    }
    return [];
  }, [user]);

  // 로그인 상태가 확정되면 내 추천 여부를 미리 파악 (버튼 라벨용)
  useEffect(() => {
    if (!authLoading) loadMyPicks();
  }, [authLoading, loadMyPicks]);

  // 투표 모드 진입 + 내 기존 추천 프리필
  const enterVoting = useCallback(async () => {
    setLoginNeeded(false);
    setDone(false);
    setVotingMode(true);
    const picks = await loadMyPicks();
    setSelected(new Set<string>(picks));
  }, [loadMyPicks]);

  // "추천 참여하기": 로그인 안 됐으면 안내, 됐으면 바로 진입
  const start = useCallback(() => {
    if (authLoading) return;
    if (!user) {
      setLoginNeeded(true);
      return;
    }
    enterVoting();
  }, [authLoading, user, enterVoting]);

  // 로그인 안내 노출 중 로그인이 완료되면 자동 진입
  useEffect(() => {
    if (loginNeeded && user) enterVoting();
  }, [loginNeeded, user, enterVoting]);

  const login = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch {
      /* 팝업 취소 등 — 무시 */
    }
  }, [signInWithGoogle]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const cancel = useCallback(() => {
    setVotingMode(false);
    setLoginNeeded(false);
    setSelected(new Set());
  }, []);

  const submit = useCallback(async () => {
    if (!user || selected.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/newbie-rec', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ classIds: [...selected] }),
      });
      if (res.ok) {
        setVotingMode(false);
        setDone(true);
        setMyPicks([...selected]); // 다음부터 "수정하기"로 표시
        await refreshRanking();
      }
    } catch {
      /* 무시 — 버튼 다시 누르면 재시도 */
    } finally {
      setSubmitting(false);
    }
  }, [user, selected, submitting, refreshRanking]);

  return {
    ranking,
    total,
    rankLoading,
    votingMode,
    selected,
    loginNeeded,
    submitting,
    done,
    hasVoted: myPicks.length > 0,
    start,
    toggle,
    submit,
    cancel,
    login,
  };
}

export type NewbieRecState = ReturnType<typeof useNewbieRec>;
