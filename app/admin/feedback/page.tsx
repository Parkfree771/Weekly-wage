'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import styles from './page.module.css';

type FeedbackItem = {
  id: string;
  message: string;
  page: string;
  createdAt: number;
  read?: boolean;
  processed?: boolean;  // 내가 처리했는지 여부 (관리자 전용)
  memo?: string;        // 관리자 메모 (나만 봄)
};

export default function AdminFeedbackPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const admin = isAdmin(user?.email);

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const load = useCallback(async () => {
    if (!user) return;
    setState('loading');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/feedback', {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setState('error');
        return;
      }
      const data = await res.json();
      setItems((data.items as FeedbackItem[]) || []);
      setState('idle');
    } catch {
      setState('error');
    }
  }, [user]);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  const remove = async (id: string) => {
    if (!user) return;
    if (!window.confirm('이 의견을 삭제할까요?')) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/feedback?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // 처리상태/메모 수정 (관리자 전용 PATCH)
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const patch = async (
    id: string,
    payload: { processed?: boolean; memo?: string },
  ): Promise<boolean> => {
    if (!user) return false;
    const token = await user.getIdToken();
    const res = await fetch('/api/feedback', {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id, ...payload }),
    });
    return res.ok;
  };

  // 처리됨 토글 (즉시 저장, 실패 시 롤백)
  const toggleProcessed = async (item: FeedbackItem) => {
    const next = !item.processed;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, processed: next } : i)),
    );
    const ok = await patch(item.id, { processed: next });
    if (!ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, processed: !next } : i)),
      );
    }
  };

  // 메모 입력값(로컬) 갱신
  const setMemoLocal = (id: string, memo: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, memo } : i)));
    if (savedId === id) setSavedId(null);
  };

  // 메모 저장
  const saveMemo = async (item: FeedbackItem) => {
    setSavingId(item.id);
    const ok = await patch(item.id, { memo: item.memo ?? '' });
    setSavingId(null);
    if (ok) setSavedId(item.id);
  };

  if (loading) {
    return <div className={styles.center}>불러오는 중…</div>;
  }

  if (!user) {
    return (
      <div className={styles.center}>
        <p className={styles.notice}>관리자 로그인이 필요합니다.</p>
        <button className={styles.btn} onClick={signInWithGoogle}>
          구글 로그인
        </button>
      </div>
    );
  }

  if (!admin) {
    return <div className={styles.center}>접근 권한이 없습니다.</div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>받은 의견 ({items.length})</h1>
        <button className={styles.btn} onClick={load} disabled={state === 'loading'}>
          {state === 'loading' ? '새로고침 중…' : '새로고침'}
        </button>
      </div>

      {state === 'error' && (
        <p className={styles.error}>불러오기에 실패했습니다.</p>
      )}

      {items.length === 0 && state !== 'loading' ? (
        <p className={styles.empty}>아직 받은 의견이 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li
              key={item.id}
              className={styles.item}
              style={item.processed ? { opacity: 0.6 } : undefined}
            >
              <div className={styles.itemHead}>
                <span className={styles.page}>{item.page}</span>
                <span className={styles.date}>
                  {new Date(item.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>

              {/* 처리 여부 (나만 봄) */}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: item.processed ? '#10b981' : 'var(--text-muted)',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!item.processed}
                  onChange={() => toggleProcessed(item)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                {item.processed ? '처리됨' : '미처리'}
              </label>

              <p className={styles.message}>{item.message}</p>

              {/* 관리자 메모 (나만 봄) */}
              <textarea
                value={item.memo ?? ''}
                onChange={(e) => setMemoLocal(item.id, e.target.value)}
                placeholder="메모 (나만 봄)"
                rows={2}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'inherit',
                  padding: '8px 10px',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '6px',
                }}
              >
                <button
                  onClick={() => saveMemo(item)}
                  disabled={savingId === item.id}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '7px',
                    border: 'none',
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: savingId === item.id ? 0.6 : 1,
                  }}
                >
                  {savingId === item.id ? '저장 중…' : '메모 저장'}
                </button>
                {savedId === item.id && (
                  <span style={{ fontSize: '0.78rem', color: '#10b981' }}>
                    저장됨
                  </span>
                )}
                <button
                  className={styles.deleteBtn}
                  onClick={() => remove(item.id)}
                  style={{ marginLeft: 'auto' }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
