'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatNumber } from '@/lib/package-shared';
import {
  AZENA_POST_ID,
  AZENA_TITLE,
  AZENA_SHORT_TITLE,
  AZENA_PRICE_WON,
  AZENA_DAYS,
  AZENA_DEFAULT_OPTIONS,
  AZENA_DEFAULT_WON_PER_100_GOLD,
  calcAzenaBreakdown,
  type AzenaOptions,
} from '@/lib/azena-blessing';
import styles from './PackageGalleryCard.module.css';
import az from './AzenaBlessingGalleryCard.module.css';

type Props = {
  latestPrices: Record<string, number>;
  /** 갤러리 상단에서 지정한 공통 환율(100골드당 원). 0 이면 미적용. */
  commonWonPer100Gold?: number;
};

/** 커스텀 줄의 소형 수량 입력 — ± 버튼 + 직접 입력 (기본 스피너는 CSS로 제거) */
function MiniCount({
  value,
  onChange,
  max = 999,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  ariaLabel: string;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(max, v));
  return (
    <span className={az.miniRow}>
      <button
        type="button"
        className={az.miniBtn}
        onClick={() => onChange(clamp(value - 1))}
        aria-label={`${ariaLabel} 1 줄이기`}
      >
        −
      </button>
      <input
        type="number"
        className={az.miniInput}
        // 0 은 실제 값 대신 placeholder 로 보여준다 — 탭하고 바로 숫자를 치면
        // 0 을 지울 필요 없이 그대로 입력된다 (0이 아닌 값은 포커스 시 전체 선택으로 대체)
        value={value === 0 ? '' : value}
        placeholder="0"
        min={0}
        max={max}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(clamp(parseInt(e.target.value) || 0))}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className={az.miniBtn}
        onClick={() => onChange(clamp(value + 1))}
        aria-label={`${ariaLabel} 1 늘리기`}
      >
        +
      </button>
    </span>
  );
}

/**
 * 아제나의 축복 카드 — 갤러리 드롭다운 옆 칩을 누르면 팝업으로 뜨는 공식 패키지.
 * 큰 틀(프레임·수치 배치·환율 입력)은 일반 카드와 동일하고, 이 카드에만 헤더의 1730 티어
 * 토글과 결과 아래 공명·휴게·PC방 입력이 붙는다. 레이드는 주 3회 고정.
 * 왼쪽은 아이템 셀 목록 대신 축복 본체 이미지 하나만 두고, 구성품·수량·확률·상자 내용물은
 * /package/azena-blessing 에서 본다.
 */
// memo: 갤러리 페이지 최상위 state(공통 환율 타이핑 등)가 바뀔 때 prop 이 그대로면 리렌더를 막는다
function AzenaBlessingGalleryCard({ latestPrices, commonWonPer100Gold = 0 }: Props) {
  const router = useRouter();
  // 환율 입력은 문자열로 든다 — number state 면 "16." 같은 타이핑 중간 상태가 지워져 소수(16.5) 입력이 안 된다
  const [rateText, setRateText] = useState<string>(
    String(commonWonPer100Gold || AZENA_DEFAULT_WON_PER_100_GOLD),
  );
  // 블크 시세(100블크당 골드) — 환율과 양방향 동기화 (100블크 = 2750원 고정)
  const [bcText, setBcText] = useState<string>(
    String(Math.round(275000 / (commonWonPer100Gold || AZENA_DEFAULT_WON_PER_100_GOLD))),
  );
  const wonPer100Gold = parseFloat(rateText) || 0;
  const [options, setOptions] = useState<AzenaOptions>(AZENA_DEFAULT_OPTIONS);

  const handleRateInput = (v: string) => {
    setRateText(v);
    const w = parseFloat(v) || 0;
    setBcText(w > 0 ? String(Math.round(275000 / w)) : '');
  };
  const handleBcInput = (v: string) => {
    setBcText(v);
    const b = parseFloat(v) || 0;
    setRateText(b > 0 ? String(Math.round(2750000 / b) / 10) : '');
  };

  useEffect(() => {
    const v = commonWonPer100Gold > 0 ? commonWonPer100Gold : AZENA_DEFAULT_WON_PER_100_GOLD;
    setRateText(String(v));
    setBcText(String(Math.round(275000 / v)));
  }, [commonWonPer100Gold]);

  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;

  const breakdown = useMemo(
    () => calcAzenaBreakdown(latestPrices, goldPerWon, options),
    [latestPrices, goldPerWon, options],
  );

  const cashGold = AZENA_PRICE_WON * goldPerWon;
  const benefit = cashGold > 0 ? ((breakdown.totalGold - cashGold) / cashGold) * 100 : 0;

  const setOption = <K extends keyof AzenaOptions>(key: K, value: AzenaOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  /**
   * 카드 아무 데나 누르면 상세로 가되, 조작 영역은 예외로 둔다.
   * 버튼·입력 자체뿐 아니라 그 둘레(± 사이 여백, 1730 토글 사이 등)도 data-nonav 로 묶어
   * 살짝 빗나간 터치가 상세 이동으로 새지 않게 한다.
   */
  const handleCardClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-nonav], button, input, select, textarea, label, a')) return;
    // 카드 안 입력칸에 포커스가 살아 있는 동안의 탭은 이동이 아니라 입력 종료(키보드 닫기)로
    // 본다 — 모바일에서 키보드가 화면을 밀어 지연 클릭이 카드 본체에 떨어지는 경우 포함
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && e.currentTarget.contains(active)) return;
    router.push(`/package/${AZENA_POST_ID}`);
  };

  return (
    <article
      className={styles.galleryCard}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      {/* 왼쪽: 축복 아트가 칸 전체(헤더 포함)를 채우고, 제목·티어 토글이 그 위에 얹힌다.
          아이템 셀 목록은 두지 않는다 — 구성품·수량·확률은 상세에서 본다 */}
      <div className={`${styles.leftBox} ${az.leftBoxArt}`}>
        <div className={az.hero}>
          {/* 팝업이 열릴 때 마운트되므로 바로 요청한다 — lazy 로 두면 레이아웃 확정 뒤로 밀린다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            loading="eager"
            fetchPriority="high"
            decoding="async"
            src="/azena-blessing-art.webp"
            alt={AZENA_TITLE}
            className={az.heroImg}
          />
          {/* 아트 위쪽이 이미 어두워 별도 그림자막은 두지 않는다 (글자 그림자로 충분) */}
          <div className={az.heroHeader}>
            {/* 제목을 진짜 링크로 둔다 — 카드 클릭은 JS 이동이라 크롤러가 따라갈 수 없다.
                (상시 유지되는 상세 페이지라 검색 유입 경로를 링크로 남겨야 한다) */}
            <h3 className={az.heroTitle}>
              <Link href={`/package/${AZENA_POST_ID}`} className={az.heroTitleLink}>
                {AZENA_SHORT_TITLE}
              </Link>
            </h3>
            {/* 아이템 레벨 토글 — 1730 이상(기본)/이하에 따라 융화 재료·재련 상자 구성이 바뀐다 */}
            <span className={az.tierToggle} data-nonav>
              <button
                type="button"
                className={`${az.tierBtn} ${options.tier === 'high' ? az.tierBtnActive : ''}`}
                onClick={() => setOption('tier', 'high')}
                title="1730 이상 — 상급 아비도스 ×10 · 계승 재련 재료 상자"
              >
                1730<span className={az.tierArrow}>↑</span>
              </button>
              <button
                type="button"
                className={`${az.tierBtn} ${options.tier === 'low' ? az.tierBtnActive : ''}`}
                onClick={() => setOption('tier', 'low')}
                title="1730 이하 — 아비도스 ×20 · 일반 재련 재료 상자"
              >
                1730<span className={az.tierArrow}>↓</span>
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* 오른쪽: 계산 결과 + 이 카드 전용 소형 커스텀 (일반 카드와 같은 줄 형식) */}
      <div className={styles.rightBox}>
        <div className={styles.rightTop}>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>패키지 가격</span>
            <span className={styles.resultValue}>{formatNumber(AZENA_PRICE_WON)}원</span>
          </div>

          {goldPerWon > 0 && (
            <div className={styles.resultRow}>
              <span className={styles.cashNum}>{formatNumber(AZENA_PRICE_WON)}원</span>
              <span className={styles.resultValueGold}>
                ={' '}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIconInline} />
                {formatNumber(cashGold)}
              </span>
            </div>
          )}

          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>28일 기대값</span>
            <span className={styles.resultValueGold}>
              ={' '}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIconInline} />
              {formatNumber(breakdown.totalGold)}
            </span>
          </div>

          {goldPerWon > 0 && (
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>기대 효율</span>
              <span className={`${styles.benefitBadge} ${benefit >= 0 ? styles.benefitBadgeUp : styles.benefitBadgeDown}`}>
                {benefit >= 0 ? '+' : ''}{benefit.toFixed(1)}%
              </span>
            </div>
          )}

          {/* 내 플레이 커스텀 3줄 — 계산 결과 바로 아래에서 값이 즉시 반영된다
              (레이드는 무조건 주 3회 클리어 가정) */}
          <div className={az.customRows} data-nonav>
            <div className={az.customRow} title="공명의 기운 사용 개수 — 1개당 균열 +1판">
              <span className={az.customRowLabel}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/resonance-energy.webp" alt="공명의 기운" className={az.miniIcon} />
                <span className={az.customRowText}>공명의 기운</span>
              </span>
              <MiniCount
                value={options.resonanceCount}
                onChange={(v) => setOption('resonanceCount', v)}
                ariaLabel="공명의 기운 사용 개수"
              />
            </div>
            <div className={az.customRow} title="휴게 물약 사용 개수 — 1개당 균열 +1판">
              <span className={az.customRowLabel}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/rest-potion.webp" alt="휴게 물약" className={az.miniIcon} />
                <span className={az.customRowText}>휴게 물약</span>
              </span>
              <MiniCount
                value={options.restPotionCount}
                onChange={(v) => setOption('restPotionCount', v)}
                ariaLabel="휴게 물약 사용 개수"
              />
            </div>
            <div className={az.customRow} title="PC방 방문 횟수 — 방문일마다 균열 +2판">
              <span className={az.customRowLabel}>
                {/* 공명·휴게는 아이템 아이콘이 있는데 PC방만 없어 자리를 이모지로 맞춘다 */}
                <span className={az.pcEmoji} aria-hidden="true">🖥️</span>
                <span className={az.customRowText}>PC방</span>
              </span>
              <MiniCount
                value={options.pcRoomVisits}
                onChange={(v) => setOption('pcRoomVisits', v)}
                max={AZENA_DAYS}
                ariaLabel="PC방 방문 횟수 (방문일마다 균열 +2판)"
              />
            </div>
          </div>
        </div>

        <div className={styles.bottomRow} data-nonav>
          <div className={styles.bottomRate}>
            <div className={styles.rateRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.rateIconGold} />
              <span className={styles.rateFixed}>100</span>
              <span className={styles.rateSep}>:</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/royal.webp" alt="로얄" className={styles.rateIconRoyal} />
              <input
                type="number"
                className={styles.rateInput}
                value={rateText}
                onChange={(e) => handleRateInput(e.target.value)}
                placeholder="15"
                min={1}
                step="any"
                aria-label="100골드당 원화 환율"
              />
            </div>
            <div className={styles.rateRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/blue.webp" alt="블루 크리스탈" className={styles.rateIconBlue} />
              <span className={styles.rateFixed}>100</span>
              <span className={styles.rateSep}>=</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.rateIconPad} />
              <input
                type="number"
                className={styles.rateInput}
                value={bcText}
                onChange={(e) => handleBcInput(e.target.value)}
                placeholder="16500"
                min={1}
                step="any"
                aria-label="블루 크리스탈 100개당 골드"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(AzenaBlessingGalleryCard);
