'use client';

import { Fragment, useEffect, useState } from 'react';
import { LOAON_EVENT, getLoaOnStatus, getTimeLeft } from '@/lib/loaon-event';
import styles from './LoaOnBanner.module.css';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 로아온 섬머 2026 세로 사이드 배너 (AdSidebar 레일 안에서 렌더).
 * - 배너 전체가 링크 (별도 버튼 없음)
 * - 이미지 위에는 날짜만 오버레이(어두운 오버레이 없음), 타이머는 이미지 아래 푸터
 * - 방송 시작 전: 일/시/분/초 카운트다운 / 방송 중: LIVE / 종료 후: 숨김(자동)
 * - 시간 기반이라 hydration 불일치 방지를 위해 마운트 후에만 렌더
 */
export default function LoaOnBanner() {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === 0) return null;

  const status = getLoaOnStatus(now);
  if (status === 'ended') return null;

  const t = getTimeLeft(now);
  // 일을 시간으로 환산 → 시간/분/초만 표시
  const segs: [number, string][] = [
    [t.days * 24 + t.hours, '시간'],
    [t.minutes, '분'],
    [t.seconds, '초'],
  ];

  return (
    <a
      className={styles.card}
      href={LOAON_EVENT.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        className={styles.img}
        src={LOAON_EVENT.image}
        alt="2026 로아온 썸머"
        loading="lazy"
        decoding="async"
      />

      <div className={styles.footer}>
        <div className={styles.date}>{LOAON_EVENT.dateLabel}</div>
        {status === 'live' ? (
          <div className={styles.live}>
            <span className={styles.liveDot} aria-hidden />
            LIVE 방송중
          </div>
        ) : (
          <div className={styles.timer}>
            {segs.map(([n, label], i) => (
              <Fragment key={label}>
                {i > 0 && <span className={styles.colon}>:</span>}
                <div className={styles.seg}>
                  <span className={styles.segNum}>{pad(n)}</span>
                  <span className={styles.segLabel}>{label}</span>
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
