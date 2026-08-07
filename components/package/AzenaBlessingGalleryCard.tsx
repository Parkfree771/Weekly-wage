'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatNumber } from '@/lib/package-shared';
import {
  AZENA_POST_ID,
  AZENA_TITLE,
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
        value={value}
        min={0}
        max={max}
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
 * 아제나의 축복 고정 카드 — 갤러리 최상단에 항상 표시되는 공식 패키지.
 * 큰 틀(프레임·아이템 셀·수치 배치·환율 입력)은 일반 카드와 동일하고, 이 카드에만
 * 헤더의 1730 티어 토글과 결과 아래 공명·휴게·PC방 입력이 붙는다. 레이드는 주 3회 고정.
 * 수량·확률·상자 내용물 같은 상세 정보는 카드에 두지 않고 /package/azena-blessing 에서 본다.
 */
export default function AzenaBlessingGalleryCard({ latestPrices, commonWonPer100Gold = 0 }: Props) {
  const router = useRouter();
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(
    commonWonPer100Gold || AZENA_DEFAULT_WON_PER_100_GOLD,
  );
  const [options, setOptions] = useState<AzenaOptions>(AZENA_DEFAULT_OPTIONS);

  useEffect(() => {
    setWonPer100Gold(commonWonPer100Gold > 0 ? commonWonPer100Gold : AZENA_DEFAULT_WON_PER_100_GOLD);
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

  return (
    <article
      className={styles.galleryCard}
      onClick={() => router.push(`/package/${AZENA_POST_ID}`)}
      style={{ cursor: 'pointer' }}
    >
      {/* 왼쪽: 아이템 목록 — 아이콘만. 수량·확률·상자 내용물은 상세에서 본다 */}
      <div className={styles.leftBox}>
        <div className={styles.leftHeader}>
          <h3 className={styles.cardTitle}>{AZENA_TITLE}</h3>
          {/* 아이템 레벨 토글 — 1730 이상(기본)/이하에 따라 융화 재료·재련 상자 구성이 바뀐다 */}
          <span className={az.tierToggle} onClick={(e) => e.stopPropagation()}>
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

        <div className={styles.itemGrid}>
          {/* 아제나의 축복 본체 (전용 버프·기간제) */}
          <div className={styles.itemCell} title={AZENA_TITLE}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/azena-blessing.png"
              alt={AZENA_TITLE}
              className={styles.itemCellIcon}
              style={{ width: 46, height: 46 }}
            />
          </div>

          {/* 아제나의 축복이 깃든 선택 상자 (매일 1개) — 내용물 선택은 상세에서 */}
          <div className={styles.itemCell} title="아제나의 축복이 깃든 선택 상자">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/azena-select-box.png"
              alt="아제나의 축복이 깃든 선택 상자"
              className={`${styles.itemCellIcon} ${az.boxImg}`}
            />
          </div>

          {/* 아제나의 축복이 깃든 상자 (레이드 클리어 보너스, 랜덤) */}
          <div className={styles.itemCell} title="아제나의 축복이 깃든 상자">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/azena-select-box.png"
              alt="아제나의 축복이 깃든 상자"
              className={`${styles.itemCellIcon} ${az.boxImg}`}
            />
          </div>

          {/* 축복의 편린 — 전용 아트 이미지 */}
          <div className={styles.itemCell} title="축복의 편린">
            <span className={az.fragWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                decoding="async"
                src="/azena-fragment.png"
                alt="축복의 편린"
                className={az.fragImg}
              />
            </span>
          </div>

          {/* 도약의 정수 — 매일 1개 (블크 환산) */}
          <div className={styles.itemCell} title="도약의 정수">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/leap-essence.webp"
              alt="도약의 정수"
              className={styles.itemCellIcon}
              style={{ width: 46, height: 46 }}
            />
          </div>

          {/* 천상 도전 횟수 +1 — 매주 1개 (낙원 시즌 중 지급) */}
          <div className={styles.itemCell} title="천상 도전 횟수 +1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/cjstkd.webp"
              alt="천상 도전권"
              className={styles.itemCellIcon}
              style={{ width: 46, height: 46 }}
            />
          </div>

          {/* 전용 버프 — 명인의 허브 스테이크 대체 가치 */}
          <div className={styles.itemCell} title="전용 버프 (스탯·생명력·자원 회복)">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/herb-steak.png"
              alt="명인의 허브 스테이크"
              className={styles.itemCellIcon}
              style={{ width: 44, height: 44 }}
            />
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
          <div className={az.customRows} onClick={(e) => e.stopPropagation()}>
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

        <div className={styles.bottomRow}>
          <div className={styles.bottomRate} onClick={(e) => e.stopPropagation()}>
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
                value={wonPer100Gold || ''}
                onChange={(e) => setWonPer100Gold(parseInt(e.target.value) || 0)}
                placeholder="15"
                min={1}
                aria-label="100골드당 원화 환율"
              />
            </div>
          </div>
          <div className={styles.detailLink}>
            상세보기 &#8594;
          </div>
        </div>
      </div>
    </article>
  );
}
