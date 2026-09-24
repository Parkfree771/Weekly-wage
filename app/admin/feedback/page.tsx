'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import styles from './page.module.css';
import InquiryLogForm from './InquiryLogForm';
import { gameDateKey, pageLabelOf, type InquiryLogEntry, type InquiryLogInput } from '@/lib/inquiry-log';

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
  // 공개 처리 내역 — 문의하기 모달 "최근 반영된 요청"
  const [logs, setLogs] = useState<InquiryLogEntry[]>([]);
  // 열린 폼: 'new'(직접 추가) · 'log:<id>'(내역 수정) · 'fb:<id>'(문의에서 작성·수정)
  const [editing, setEditing] = useState<string | null>(null);

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
      setLogs((data.logs as InquiryLogEntry[]) || []);
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

  // 공개 처리 내역 쓰기 — 응답에 최신 목록이 온다
  const logRequest = async (
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: Record<string, unknown>,
    id?: string,
  ): Promise<string | null> => {
    if (!user) return '로그인이 필요합니다.';
    const token = await user.getIdToken();
    const res = await fetch(`/api/inquiry-log${id ? `?id=${encodeURIComponent(id)}` : ''}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.message || '저장에 실패했습니다.';
    setLogs((data.items as InquiryLogEntry[]) || []);
    setEditing(null);
    return null;
  };

  const saveLog = (entry: InquiryLogEntry | undefined) => (v: InquiryLogInput) =>
    entry ? logRequest('PATCH', { ...v, id: entry.id }) : logRequest('POST', { ...v });

  const deleteLog = (id: string) => async () => {
    await logRequest('DELETE', undefined, id);
  };

  // 문의에서 공개 답변을 쓰면 처리됨도 같이 켠다
  const saveFromFeedback =
    (item: FeedbackItem, entry: InquiryLogEntry | undefined) => async (v: InquiryLogInput) => {
      const err = await saveLog(entry)({ ...v, feedbackId: item.id });
      if (!err && !item.processed) await toggleProcessed(item);
      return err;
    };

  const newDraft = (item?: FeedbackItem): InquiryLogInput => ({
    page: item ? pageLabelOf(item.page) : '',
    requestedAt: gameDateKey(item ? item.createdAt : Date.now()),
    resolvedAt: gameDateKey(Date.now()),
    request: '',
    reply: '',
  });

  const toInput = (e: InquiryLogEntry): InquiryLogInput => ({
    page: e.page,
    requestedAt: e.requestedAt,
    resolvedAt: e.resolvedAt,
    request: e.request,
    reply: e.reply,
    ...(e.feedbackId ? { feedbackId: e.feedbackId } : {}),
  });

  const smallBtn: React.CSSProperties = {
    padding: '3px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'transparent',
    color: 'inherit',
    fontSize: '0.78rem',
    cursor: 'pointer',
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

      {/* 공개 처리 내역 */}
      <section
        style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>공개 처리 내역 ({logs.length})</h2>
          <button
            className={styles.btn}
            style={{ marginLeft: 'auto' }}
            onClick={() => setEditing(editing === 'new' ? null : 'new')}
          >
            직접 추가
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          문의하기 창 &quot;최근 반영된 요청&quot;에 그대로 나갑니다. 저장하면 바로 반영됩니다.
        </p>
        {editing === 'new' && (
          <InquiryLogForm initial={newDraft()} onSave={saveLog(undefined)} onCancel={() => setEditing(null)} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {logs.map((e) => (
            <div
              key={e.id}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'var(--card-header-bg)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 14px', fontSize: '0.78rem' }}>
                <b>{e.page}</b>
                <span>
                  요청 <b style={{ color: '#3b82f6' }}>{e.requestedAt}</b>
                </span>
                <span>
                  처리 <b style={{ color: '#10b981' }}>{e.resolvedAt}</b>
                </span>
                {!e.feedbackId && <span style={{ color: 'var(--text-muted)' }}>직접 추가</span>}
                <button
                  style={{ ...smallBtn, marginLeft: 'auto' }}
                  onClick={() => setEditing(editing === `log:${e.id}` ? null : `log:${e.id}`)}
                >
                  수정
                </button>
              </div>
              {editing === `log:${e.id}` ? (
                <InquiryLogForm
                  initial={toInput(e)}
                  onSave={saveLog(e)}
                  onCancel={() => setEditing(null)}
                  onDelete={deleteLog(e.id)}
                />
              ) : (
                <>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '8px' }}>
                    <span style={{ color: '#3b82f6', marginRight: '6px' }}>Q</span>
                    {e.request}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span style={{ color: '#10b981', fontWeight: 700, marginRight: '6px' }}>관리자</span>
                    {e.reply}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

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
                  onClick={() => setEditing(editing === `fb:${item.id}` ? null : `fb:${item.id}`)}
                  style={{ ...smallBtn, padding: '5px 14px', borderColor: '#10b981', color: '#10b981', fontWeight: 600 }}
                >
                  {logs.some((l) => l.feedbackId === item.id) ? '공개됨 · 수정' : '공개 답변 쓰기'}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => remove(item.id)}
                  style={{ marginLeft: 'auto' }}
                >
                  삭제
                </button>
              </div>
              {editing === `fb:${item.id}` && (() => {
                const entry = logs.find((l) => l.feedbackId === item.id);
                return (
                  <InquiryLogForm
                    initial={entry ? toInput(entry) : { ...newDraft(item), feedbackId: item.id }}
                    onSave={saveFromFeedback(item, entry)}
                    onCancel={() => setEditing(null)}
                    onDelete={entry ? deleteLog(entry.id) : undefined}
                  />
                );
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
