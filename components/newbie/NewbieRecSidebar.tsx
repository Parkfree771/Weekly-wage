'use client';

import ClassIcon from '@/components/tier/ClassIcon';
import { TIER_CLASSES } from '@/lib/tier-data';
import EngravingCorrectionBox from '@/components/engraving/EngravingCorrectionBox';
import type { NewbieRecState } from './useNewbieRec';
import styles from './NewbieRecSidebar.module.css';

// 선택한 직업 id → 이름/아이콘 조회용
const META = new Map(TIER_CLASSES.map((c) => [c.id, c]));

export default function NewbieRecSidebar({ nr }: { nr: NewbieRecState }) {
  const {
    ranking,
    total,
    rankLoading,
    votingMode,
    selected,
    loginNeeded,
    submitting,
    done,
    hasVoted,
    start,
    submit,
    cancel,
    login,
  } = nr;

  // 투표 모드: 내가 선택한 직업 목록 (이름/아이콘 조회)
  const selectedList = [...selected]
    .map((id) => META.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <aside className={styles.sidebar} aria-label="뉴비 추천 직업">
      <div className={styles.box}>
        <div className={styles.head}>
          <span className={styles.title}>
            {votingMode ? '내가 선택한 직업' : '뉴비 추천 직업'}
          </span>
          {votingMode ? (
            selected.size > 0 && (
              <span className={styles.badge}>{selected.size}</span>
            )
          ) : (
            <span className={styles.badge}>TOP 10</span>
          )}
        </div>
        {!votingMode && total > 0 && (
          <div className={styles.sub}>{total}명 참여</div>
        )}

        {votingMode ? (
          selectedList.length === 0 ? (
            <div className={styles.pickHint}>
              <svg
                className={styles.pickArrow}
                viewBox="0 0 24 24"
                width="22"
                height="22"
                aria-hidden
              >
                <path
                  d="M11 5l-7 7 7 7M4 12h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>추천할 직업을 선택하세요</span>
            </div>
          ) : (
            <ul className={styles.list}>
              {selectedList.map((c) => (
                <li key={c.id} className={styles.item}>
                  <ClassIcon name={c.name} src={c.icon} size={26} />
                  <span className={styles.name}>{c.name}</span>
                </li>
              ))}
            </ul>
          )
        ) : rankLoading ? (
          <div className={styles.empty}>불러오는 중…</div>
        ) : ranking.length === 0 ? (
          <div className={styles.empty}>아직 추천이 없어요</div>
        ) : (
          <ol className={styles.list}>
            {ranking.map((r, i) => (
              <li key={r.id} className={styles.item}>
                <span className={`${styles.rank} ${i < 3 ? styles.rankTop : ''}`}>
                  {i + 1}
                </span>
                <ClassIcon name={r.name} src={r.icon} size={26} />
                <span className={styles.name}>{r.name}</span>
                <span className={styles.count}>{r.count}</span>
              </li>
            ))}
          </ol>
        )}

        <div className={styles.footer}>
          {done && <div className={styles.done}>추천 완료. 감사합니다.</div>}

          {loginNeeded ? (
            <div className={styles.loginBox}>
              <div className={styles.loginMsg}>로그인이 필요합니다.</div>
              <button className={styles.primaryBtn} onClick={login}>
                구글로 로그인
              </button>
              <button className={styles.cancelBtn} onClick={cancel}>
                닫기
              </button>
            </div>
          ) : votingMode ? (
            <>
              <button
                className={styles.primaryBtn}
                onClick={submit}
                disabled={selected.size === 0 || submitting}
              >
                {submitting
                  ? '제출 중…'
                  : selected.size > 0
                  ? `제출하기 (${selected.size})`
                  : '추천할 직업을 선택하세요'}
              </button>
              <button className={styles.cancelBtn} onClick={cancel}>
                취소
              </button>
            </>
          ) : (
            <button className={styles.primaryBtn} onClick={start}>
              {hasVoted ? '추천 수정하기' : '추천 참여하기'}
            </button>
          )}
        </div>
      </div>

      {/* 각인 정정 요청 — 익명, 관리자 의견함(/api/feedback)으로 전송 */}
      <EngravingCorrectionBox />
    </aside>
  );
}
