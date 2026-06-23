'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/inquiry-service';
import styles from './page.module.css';

type FeedbackItem = {
  id: string;
  message: string;
  page: string;
  createdAt: number;
  read?: boolean;
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
            <li key={item.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.page}>{item.page}</span>
                <span className={styles.date}>
                  {new Date(item.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
              <p className={styles.message}>{item.message}</p>
              <button
                className={styles.deleteBtn}
                onClick={() => remove(item.id)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
