'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { formatNumber } from '@/lib/package-shared';
import {
  AZENA_POST_ID,
  AZENA_TITLE,
  AZENA_PRICE_WON,
  AZENA_DAYS,
  AZENA_DEFAULT_OPTIONS,
  AZENA_DEFAULT_WON_PER_100_GOLD,
  getAzenaDailyBoxOptions,
  AZENA_RAID_BOX_TABLE,
  AZENA_RAID_BOX_GOLD,
  FRAGMENT_DROP_RATE,
  FRAGMENT_GOLD_TABLE,
  FRAGMENT_ENGRAVING_RANDOM_P,
  FRAGMENT_ENGRAVING_SELECT_P,
  FRAGMENT_LEGENDARY_PACK_P,
  FRAGMENT_SELECT_PACK_P,
  LEGENDARY_PACK_GOLD,
  LEGENDARY_SELECT_PACK_GOLD,
  calcAzenaBreakdown,
  getAzenaDailyBoxOptionGold,
  type AzenaOptions,
} from '@/lib/azena-blessing';
import styles from './PackageGalleryCard.module.css';
import az from './AzenaBlessingGalleryCard.module.css';

type Props = {
  latestPrices: Record<string, number>;
  /** 갤러리 상단에서 지정한 공통 환율(100골드당 원). 0 이면 미적용. */
  commonWonPer100Gold?: number;
};

/** 상자 셀 하단 열림/닫힘 표시 — 텍스트 화살표 대신 SVG 셰브런 칩 */
function Chevron({ up }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 10 6" className={az.boxChevronIcon} aria-hidden="true">
      <polyline points={up ? '1,5 5,1.2 9,5' : '1,1 5,4.8 9,1'} />
    </svg>
  );
}

/** 커스텀 스트립용 소형 수량 입력 — ± 버튼 + 직접 입력 (기본 스피너는 CSS로 제거) */
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
 * 큰 틀(프레임·수치 배치·환율 입력)은 일반 카드와 동일하지만, 이 카드만 특별하게
 * 카드 안에서 바로 커스텀한다: 상자·편린 셀 클릭 → 팝업(내용물 선택·기댓값 분해),
 * 헤더의 1730 티어 토글, 하단 스트립의 공명·휴게·PC방 입력. 레이드는 주 3회 고정.
 */
export default function AzenaBlessingGalleryCard({ latestPrices, commonWonPer100Gold = 0 }: Props) {
  const router = useRouter();
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(
    commonWonPer100Gold || AZENA_DEFAULT_WON_PER_100_GOLD,
  );
  const [options, setOptions] = useState<AzenaOptions>(AZENA_DEFAULT_OPTIONS);
  // 상자 팝업 — 선택 상자(일일)·랜덤 상자(레이드 보너스)·편린이 같은 오버레이 방식을 쓴다
  const [openBox, setOpenBox] = useState<'select' | 'random' | 'fragment' | null>(null);
  const selectBoxRef = useRef<HTMLDivElement>(null);
  const randomBoxRef = useRef<HTMLDivElement>(null);
  const fragmentRef = useRef<HTMLDivElement>(null);
  // 팝업을 상자 바로 아래에 세로로 띄우기 위한 화면 좌표
  const [popupPos, setPopupPos] = useState<{ left: number; top: number } | null>(null);

  const toggleBox = (kind: 'select' | 'random' | 'fragment') => {
    if (openBox === kind) {
      setOpenBox(null);
      return;
    }
    const ref = kind === 'select' ? selectBoxRef : kind === 'random' ? randomBoxRef : fragmentRef;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    // 사이트 보기 배율(html zoom)·body zoom(0.85)이 걸려 있으면 fixed 좌표도 그 배율로
    // 다시 스케일되므로, 팝업이 붙는 body까지의 누적 zoom으로 나눠 시각 좌표에 맞춘다.
    let zoomFactor = 1;
    let node: Element | null = document.body;
    while (node) {
      const z = parseFloat(getComputedStyle(node).zoom || '1');
      if (!isNaN(z) && z > 0) zoomFactor *= z;
      node = node.parentElement;
    }
    setPopupPos({
      left: rect.left / zoomFactor,
      top: rect.bottom / zoomFactor + 6,
    });
    setOpenBox(kind);
  };

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

  // 일일 선택 상자 구성은 티어에 따라 다르다 (1730↑ 상비도스×10 / 1730↓ 아비도스×20)
  const dailyOptions = getAzenaDailyBoxOptions(options.tier);

  return (
    <article
      className={styles.galleryCard}
      onClick={() => router.push(`/package/${AZENA_POST_ID}`)}
      style={{ cursor: 'pointer' }}
    >
      {/* 왼쪽: 아이템 목록 — 일일 상자 선택지·천상 도전권은 셀 클릭으로 직접 고른다 */}
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
              style={{ width: 65, height: 65 }}
            />
          </div>

          {/* 아제나의 축복이 깃든 선택 상자 (매일 1개, ×28) — 클릭하면 상자 위로 내용물이 떠오른다 */}
          <div
            ref={selectBoxRef}
            className={`${styles.itemCell} ${openBox === 'select' ? az.boxCellOpen : ''}`}
            title={`아제나의 축복이 깃든 선택 상자 ×${AZENA_DAYS} — 클릭해서 내용물 선택 (현재: ${
              dailyOptions.find((o) => o.key === breakdown.daily.boxChoice)?.name
            })`}
            onClick={(e) => {
              e.stopPropagation();
              toggleBox('select');
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/azena-select-box.png"
              alt="아제나의 축복이 깃든 선택 상자"
              className={`${styles.itemCellIcon} ${az.boxImg}`}
            />
            <span className={az.boxQtyBadge}>×{AZENA_DAYS}</span>
            <span className={az.boxChevron}><Chevron up={openBox === 'select'} /></span>
          </div>

          {/* 아제나의 축복이 깃든 상자 (레이드 보너스, 주 3회 ×4주 = 12개) — 랜덤, 클릭하면 기댓값 분해 */}
          <div
            ref={randomBoxRef}
            className={`${styles.itemCell} ${openBox === 'random' ? az.boxCellOpen : ''}`}
            title={`아제나의 축복이 깃든 상자 ×${breakdown.raidBoxes.count} — 레이드 클리어 보너스 (클릭해서 기댓값 보기)`}
            onClick={(e) => {
              e.stopPropagation();
              toggleBox('random');
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/azena-select-box.png"
              alt="아제나의 축복이 깃든 상자"
              className={`${styles.itemCellIcon} ${az.boxImg}`}
            />
            <span className={az.boxQtyBadge}>×{breakdown.raidBoxes.count}</span>
            <span className={az.boxChevron}><Chevron up={openBox === 'random'} /></span>
          </div>

          {/* 축복의 편린 — 전용 아트 이미지 (클릭하면 기댓값 분해) */}
          <div
            ref={fragmentRef}
            className={`${styles.itemCell} ${openBox === 'fragment' ? az.boxCellOpen : ''}`}
            title={`축복의 편린 — 균열·가디언 토벌 1판당 ${(FRAGMENT_DROP_RATE * 100).toFixed(1)}% 등장, 기대 ${breakdown.fragments.expectedCount.toFixed(1)}개 (클릭해서 기댓값 보기)`}
            onClick={(e) => {
              e.stopPropagation();
              toggleBox('fragment');
            }}
          >
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
            <span className={az.boxQtyBadge}>×{breakdown.fragments.expectedCount.toFixed(1)}</span>
            <span className={az.boxChevron}><Chevron up={openBox === 'fragment'} /></span>
          </div>

          {/* 도약의 정수 — 매일 1개 (블크 환산) */}
          <div
            className={styles.itemCell}
            title={`도약의 정수 ×${AZENA_DAYS} — 개당 10블루 크리스탈 환산`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/leap-essence.webp"
              alt="도약의 정수"
              className={styles.itemCellIcon}
              style={{ width: 46, height: 46 }}
            />
            <span className={az.boxQtyBadge}>×{AZENA_DAYS}</span>
          </div>

          {/* 천상 도전 횟수 +1 — 매주 1개 (낙원 시즌 중 지급) */}
          <div
            className={styles.itemCell}
            title="천상 도전 횟수 +1 ×4 — 낙원 시즌 중 매주 지급 (개당 3,000G)"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/cjstkd.webp"
              alt="천상 도전권"
              className={styles.itemCellIcon}
              style={{ width: 46, height: 46 }}
            />
            <span className={az.boxQtyBadge}>×4</span>
          </div>

          {/* 전용 버프 — 명인의 허브 스테이크 대체 가치 (주 3개 × 4주, 고정 환산) */}
          <div
            className={styles.itemCell}
            title={`전용 버프 (스탯·생명력·자원 회복) — 명인의 허브 스테이크 대체, 1,500G × 주 3개 × 4주 = ${formatNumber(breakdown.buff.total)}G`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src="/herb-steak.png"
              alt="명인의 허브 스테이크"
              className={styles.itemCellIcon}
              style={{ width: 44, height: 44 }}
            />
            <span className={az.boxQtyBadge}>×{breakdown.buff.count}</span>
          </div>
        </div>

        {/* 상자 오버레이 — 상자 바로 위에 세로 스택으로 떠오른다.
            카드가 overflow:hidden 이라 body 포털로 렌더해 잘리지 않게 한다. */}
        {openBox === 'select' && popupPos && createPortal(
          <>
            <div
              className={az.boxBackdrop}
              onClick={(e) => { e.stopPropagation(); setOpenBox(null); }}
            />
            <div className={az.boxPopup} style={{ left: popupPos.left, top: popupPos.top }}>
              <span className={az.boxPopupTitle}>아제나의 축복이 깃든 선택 상자 ×{AZENA_DAYS}</span>
              {dailyOptions.map((opt) => {
                const isChecked = breakdown.daily.boxChoice === opt.key;
                const optGold = getAzenaDailyBoxOptionGold(opt.key, latestPrices, options.tier);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`${az.boxOption} ${isChecked ? az.boxOptionActive : ''}`}
                    title={`${opt.name} ×${opt.quantity} — 1개 ${formatNumber(optGold)}G`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOption('dailyChoice', opt.key);
                      setOpenBox(null);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={opt.icon} alt="" className={az.boxOptionIcon} />
                    <span>{opt.shortName} ×{opt.quantity}</span>
                    <span className={az.boxOptionGold}>{formatNumber(optGold * AZENA_DAYS)}G</span>
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}

        {openBox === 'random' && popupPos && createPortal(
          <>
            <div
              className={az.boxBackdrop}
              onClick={(e) => { e.stopPropagation(); setOpenBox(null); }}
            />
            <div className={az.boxPopup} style={{ left: popupPos.left, top: popupPos.top }}>
              <span className={az.boxPopupTitle}>아제나의 축복이 깃든 상자 ×{breakdown.raidBoxes.count} (랜덤)</span>
              {AZENA_RAID_BOX_TABLE.map((row) => (
                <div key={row.key} className={az.boxInfoRow} title={row.label}>
                  <span>재련 재료 상자 ({row.key === 'small' ? '소' : row.key === 'medium' ? '중' : '대'})</span>
                  <span className={az.boxInfoProb}>{row.p}%</span>
                  <span className={az.boxOptionGold}>{formatNumber(breakdown.raidBoxes.boxValues[row.key])}G</span>
                </div>
              ))}
              {AZENA_RAID_BOX_GOLD.map((row) => (
                <div key={row.gold} className={az.boxInfoRow}>
                  <span>{formatNumber(row.gold)} 골드 금괴</span>
                  <span className={az.boxInfoProb}>{row.p}%</span>
                  <span className={az.boxOptionGold}>{formatNumber(row.gold)}G</span>
                </div>
              ))}
              <div className={az.boxPopupFooter}>
                <span>상자 1개 기댓값 {formatNumber(breakdown.raidBoxes.perBoxEV)}G</span>
                <span>×{breakdown.raidBoxes.count} = {formatNumber(breakdown.raidBoxes.total)}G</span>
              </div>
            </div>
          </>,
          document.body,
        )}

        {openBox === 'fragment' && popupPos && createPortal(
          <>
            <div
              className={az.boxBackdrop}
              onClick={(e) => { e.stopPropagation(); setOpenBox(null); }}
            />
            <div className={az.boxPopup} style={{ left: popupPos.left, top: popupPos.top }}>
              <span className={az.boxPopupTitle}>
                축복의 편린 — 균열·가토 {breakdown.fragments.totalRuns}판 × {(FRAGMENT_DROP_RATE * 100).toFixed(1)}% ≈ {breakdown.fragments.expectedCount.toFixed(1)}개
              </span>
              {FRAGMENT_GOLD_TABLE.map((row) => (
                <div key={row.gold} className={az.boxInfoRow}>
                  <span>{formatNumber(row.gold)} 골드</span>
                  <span className={az.boxInfoProb}>{row.p}%</span>
                  <span className={az.boxOptionGold}>{formatNumber(row.gold)}G</span>
                </div>
              ))}
              <div className={az.boxInfoRow}>
                <span>유물 각인서 (랜덤)</span>
                <span className={az.boxInfoProb}>{FRAGMENT_ENGRAVING_RANDOM_P}%</span>
                <span className={az.boxOptionGold}>{formatNumber(breakdown.fragments.perFragment.engravingAvg)}G</span>
              </div>
              <div className={az.boxInfoRow}>
                <span>유물 각인서 (선택)</span>
                <span className={az.boxInfoProb}>{FRAGMENT_ENGRAVING_SELECT_P}%</span>
                <span className={az.boxOptionGold}>{formatNumber(breakdown.fragments.perFragment.engravingMax)}G</span>
              </div>
              <div className={az.boxInfoRow}>
                <span>전설 카드 팩</span>
                <span className={az.boxInfoProb}>{FRAGMENT_LEGENDARY_PACK_P}%</span>
                <span className={az.boxOptionGold}>{formatNumber(LEGENDARY_PACK_GOLD)}G</span>
              </div>
              <div className={az.boxInfoRow}>
                <span>전설 카드 선택 팩</span>
                <span className={az.boxInfoProb}>{FRAGMENT_SELECT_PACK_P}%</span>
                <span className={az.boxOptionGold}>{formatNumber(LEGENDARY_SELECT_PACK_GOLD)}G</span>
              </div>
              <div className={az.boxPopupFooter}>
                <span>편린 1개 기댓값 {formatNumber(breakdown.fragments.perFragment.total)}G</span>
                <span>×{breakdown.fragments.expectedCount.toFixed(1)} = {formatNumber(breakdown.fragments.total)}G</span>
              </div>
            </div>
          </>,
          document.body,
        )}

        {/* 작성자·날짜 자리 대신 — 내 플레이 커스텀 스트립 (레이드는 무조건 주 3회 클리어 가정) */}
        <div className={az.customStrip} onClick={(e) => e.stopPropagation()}>
          <span className={az.customItem} title="공명의 기운 사용 개수 — 1개당 균열 +1판">
            <span className={az.miniTop}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/resonance-energy.webp" alt="공명의 기운" className={az.miniIcon} />
            </span>
            <MiniCount
              value={options.resonanceCount}
              onChange={(v) => setOption('resonanceCount', v)}
              ariaLabel="공명의 기운 사용 개수"
            />
          </span>
          <span className={az.customItem} title="휴게 물약 사용 개수 — 1개당 균열 +1판">
            <span className={az.miniTop}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/rest-potion.webp" alt="휴게 물약" className={az.miniIcon} />
            </span>
            <MiniCount
              value={options.restPotionCount}
              onChange={(v) => setOption('restPotionCount', v)}
              ariaLabel="휴게 물약 사용 개수"
            />
          </span>
          <span className={az.customItem} title="PC방 방문 횟수 — 방문일마다 균열 +2판">
            <span className={az.miniTop}>
              <span className={az.miniLabelStrong}>PC방</span>
            </span>
            <MiniCount
              value={options.pcRoomVisits}
              onChange={(v) => setOption('pcRoomVisits', v)}
              max={AZENA_DAYS}
              ariaLabel="PC방 방문 횟수 (방문일마다 균열 +2판)"
            />
          </span>
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
