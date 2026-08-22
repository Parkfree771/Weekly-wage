'use client';

// 보석 진화 게이지 — 숙제 체크로 쌓인 원정대 보석(1레벨 환산)을 경험치처럼 채워 진화시킨다.
// 앱(loalogolapp GemEvolutionCard) 이식본. 박스 없이 매트한 게이지 바 + 보석 이미지(아래 Lv.N)만.
//   채워진 끝(둥근 쪽) = 얻은 보석 수 / 빈 쪽 오른끝 = 다음 진화까지 필요한 수
// 임계값은 게임 합성 규칙(3개→상위 1개) 그대로: 레벨 n 달성 = 누적 3^(n-1)개.
// 10레벨(19,683개)을 완성할 때마다 오른쪽에 박제되고 새 보석이 1레벨부터 다시 자란다.
//
// 앱과 다른 점: 진화 순간의 튀는 연출(scale burst)은 넣지 않는다 — 웹은 transform 애니메이션을 쓰지 않는다.
import NextImage from 'next/image';
import styles from './LevelBar.module.css';

const LV10_CUM = Math.pow(3, 9); // 19,683 — 10레벨 1개의 1레벨 환산량

// 단계별 보석 이미지 (index = 레벨-1) — 3레벨 이하는 3레벨 이미지로 통일
const GEM_LEVEL_IMAGES = [
  '/gem-evo-3.png', '/gem-evo-3.png', '/gem-evo-3.png',
  '/gem-evo-4.png', '/gem-evo-5.png', '/gem-evo-6.png',
  '/gem-evo-7.png', '/gem-evo-8.png', '/gem-evo-9.png', '/gem-evo-10.png',
];

// 레벨별 표시 크기 (index = 레벨-1). 8·9·10 은 원본 PNG 가 캔버스를 더 꽉 채워서
// 같은 44px 로 두면 혼자 튀어 보인다 — 그 세 단계만 살짝 줄인다.
const GEM_LEVEL_SIZES = [44, 44, 44, 44, 44, 44, 44, 40, 38, 36];

// 박제된 10레벨 보석 표시 상한 — 그 이상은 마지막 한 개에 ×N으로 접어 바를 지킨다
const MAX_PARKED = 4;

/** 누적 1레벨 환산 개수 → 표시 상태 */
function gemProgress(total: number) {
  const t = Math.max(0, Math.floor(total));
  const count10 = Math.floor(t / LV10_CUM);
  const rem = t - count10 * LV10_CUM;
  let level = 1;
  while (level < 10 && rem >= Math.pow(3, level)) level++;
  const lower = level === 1 ? 0 : Math.pow(3, level - 1);
  return { level, count10, rem, lower, upper: Math.pow(3, level) };
}

export default function GemEvolutionCard({ total, className, compact }: { total: number; className?: string; compact?: boolean }) {
  const { level, count10, rem, lower, upper } = gemProgress(total);
  const pct = Math.min(1, Math.max(0, (rem - lower) / (upper - lower)));
  const earned = rem;                        // 지금 키우는 보석에 들어간 개수
  const needed = Math.max(0, upper - rem);   // 다음 진화까지 남은 개수

  // 채움이 좁으면 글자가 안 들어가므로 채움 끝 바깥에 놓는다(앱은 실측 폭, 웹은 비율로 판정).
  // 필요 수는 채움이 오른쪽 끝까지 차오르면 채움 위에 얹히므로 글자색을 흰색으로 바꾼다.
  const earnedInside = pct > 0.22;
  const neededOnFill = pct > 0.88;
  const parked = Math.min(count10, MAX_PARKED);

  return (
    <div className={`${styles.row} ${compact ? styles.compact : ''} ${className || ''}`}>
      {/* 매트한 게이지 바 — 채움색은 사이트 주색 */}
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct * 100}%` }} />
        {/* 얻은 수 — 채워진 부분의 끝(둥근 쪽)에 붙여 표시 */}
        <div
          className={earnedInside ? styles.earnedInside : styles.earnedOutside}
          style={earnedInside ? { width: `${pct * 100}%` } : { left: `calc(${pct * 100}% + 8px)` }}
        >
          <span className={styles.barTxt}>{earned.toLocaleString()}</span>
        </div>
        {/* 필요 수 — 빈 부분 오른쪽 끝 */}
        <div className={styles.neededBox}>
          <span className={`${styles.barTxt} ${neededOnFill ? styles.onFill : styles.muted}`}>
            {needed.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 지금 키우는 보석 — 이미지 + 아래 레벨 */}
      <div className={styles.gemBox}>
        <NextImage
          src={GEM_LEVEL_IMAGES[level - 1]}
          alt={`${level}레벨 보석`}
          width={GEM_LEVEL_SIZES[level - 1]}
          height={GEM_LEVEL_SIZES[level - 1]}
          unoptimized
        />
        <span className={styles.lvTxt}>Lv.{level}</span>
      </div>

      {/* 완성한 10레벨 보석 박제 — 하나 완성될 때마다 오른쪽에 쌓이고 바는 그만큼 짧아진다 */}
      {Array.from({ length: parked }).map((_, i) => (
        <div key={i} className={styles.parkedBox}>
          <NextImage src="/gem-evo-10.png" alt="10레벨 보석" width={33} height={33} unoptimized />
          <span className={`${styles.lvTxt} ${styles.muted}`}>Lv.10</span>
          {i === parked - 1 && count10 > MAX_PARKED && (
            <span className={styles.parkedBadge}>×{count10}</span>
          )}
        </div>
      ))}
    </div>
  );
}
