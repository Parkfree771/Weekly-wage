'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import { formatNumber } from '@/lib/package-shared';
import {
  AZENA_TITLE,
  AZENA_PRICE_WON,
  AZENA_ROYAL_CRYSTAL,
  AZENA_DAYS,
  AZENA_WEEKS,
  AZENA_MAX_WEEKLY_RAID_CLEARS,
  AZENA_DEFAULT_OPTIONS,
  AZENA_DEFAULT_WON_PER_100_GOLD,
  AZENA_RAID_BOX_TABLE,
  AZENA_RAID_BOX_GOLD,
  AZENA_BUFF_STEAK_GOLD,
  AZENA_BUFF_STEAK_PER_WEEK,
  FRAGMENT_DROP_RATE,
  FRAGMENT_GOLD_TABLE,
  FRAGMENT_ENGRAVING_RANDOM_P,
  FRAGMENT_ENGRAVING_SELECT_P,
  FRAGMENT_LEGENDARY_PACK_P,
  FRAGMENT_SELECT_PACK_P,
  LEGENDARY_PACK_GOLD,
  LEGENDARY_SELECT_PACK_GOLD,
  calcAzenaBreakdown,
  getAzenaDailyBoxOptions,
  getAzenaDailyBoxOptionGold,
  getAzenaRefineBoxContents,
  type AzenaOptions,
} from '@/lib/azena-blessing';
import styles from '@/app/package/package.module.css';
import az from './AzenaBlessingDetail.module.css';

/** 골드 값 — 상세 계산 결과 카드와 같은 형식 */
function GoldValue({ v }: { v: number }) {
  return (
    <span className={styles.resultRowValueGold}>
      ={' '}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIconInline} />
      {formatNumber(v)}
    </span>
  );
}

function BenefitBadge({ v }: { v: number }) {
  return (
    <span className={`${styles.resultBenefitBadge} ${v >= 0 ? styles.resultBenefitUp : styles.resultBenefitDown}`}>
      {v >= 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

/** 아코디언 헤더 셰브런 */
function AccChevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 12 8" className={az.accChev} aria-hidden="true">
      <polyline points={open ? '1.5,6.5 6,1.5 10.5,6.5' : '1.5,1.5 6,6.5 10.5,1.5'} />
    </svg>
  );
}

/** 수량 입력 (− 입력 + 형태) — 공명·휴게·PC방 공용 */
function CountControl({
  value,
  onChange,
  max = 999,
  unit = '개',
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  unit?: string;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(max, v));
  return (
    <div className={az.countRow}>
      <button type="button" className={az.countBtn} onClick={() => onChange(clamp(value - 1))} aria-label="1 줄이기">
        −
      </button>
      <input
        type="number"
        className={az.countInput}
        value={value}
        min={0}
        max={max}
        onChange={(e) => onChange(clamp(parseInt(e.target.value) || 0))}
      />
      <button type="button" className={az.countBtn} onClick={() => onChange(clamp(value + 1))} aria-label="1 늘리기">
        +
      </button>
      <span className={az.countUnit}>{unit}</span>
    </div>
  );
}

type AccKey = 'essence' | 'dailyBox' | 'celestial' | 'fragment' | 'raidBox' | 'buff';

export default function AzenaBlessingDetail() {
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(AZENA_DEFAULT_WON_PER_100_GOLD);
  const [options, setOptions] = useState<AzenaOptions>(AZENA_DEFAULT_OPTIONS);
  // 구성 아코디언 — 한 번에 하나만 펼친다 (모바일에서 스크롤이 길어지지 않게)
  const [openAcc, setOpenAcc] = useState<AccKey | null>(null);

  useEffect(() => {
    fetch('/api/price-data/latest')
      .then((res) => res.json())
      .then((data) => setLatestPrices(data))
      .catch((err) => console.error('가격 데이터 로딩 실패:', err));
  }, []);

  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;

  const breakdown = useMemo(
    () => calcAzenaBreakdown(latestPrices, goldPerWon, options),
    [latestPrices, goldPerWon, options],
  );

  const cashGold = AZENA_PRICE_WON * goldPerWon;
  const benefit = cashGold > 0 ? ((breakdown.totalGold - cashGold) / cashGold) * 100 : 0;

  const setOption = <K extends keyof AzenaOptions>(key: K, value: AzenaOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const toggleAcc = (key: AccKey) => setOpenAcc((prev) => (prev === key ? null : key));

  // 일일 선택 상자 구성은 티어에 따라 다르다 (1730↑ 상비도스×10 / 1730↓ 아비도스×20)
  const dailyOptions = getAzenaDailyBoxOptions(options.tier);
  const selectedDaily = dailyOptions.find((o) => o.key === breakdown.daily.boxChoice);

  const fr = breakdown.fragments;
  const rb = breakdown.raidBoxes;

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <div className={styles.detailWrapper}>
        <Link href="/package" className={styles.backLink}>
          &#8592; 목록으로 돌아가기
        </Link>

        {/* 헤더 — 제목 + 메타 */}
        <div className={styles.detailHeader}>
          <h1 className={styles.detailTitle}>{AZENA_TITLE}</h1>
          <div className={styles.detailMetaRow}>
            <span>판매 2025.10.01 ~ 별도 안내 시</span>
            <span>{formatNumber(AZENA_ROYAL_CRYSTAL)} 로열 크리스탈 = {formatNumber(AZENA_PRICE_WON)}원</span>
            <span>캐릭터당 적용</span>
          </div>
        </div>

        <div className={styles.detailSplitRow}>
          {/* 왼쪽: 계산 결과 */}
          <div className={styles.resultPanel}>
            <div className={styles.detailCard}>
              <h2 className={styles.detailCardHeader}>계산 결과</h2>
              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>패키지 가격</span>
                <span className={styles.resultRowValue}>{formatNumber(AZENA_PRICE_WON)}원</span>
              </div>

              {goldPerWon > 0 && (
                <div className={styles.resultRow}>
                  <span className={styles.resultCashNum}>{formatNumber(AZENA_PRICE_WON)}원</span>
                  <GoldValue v={cashGold} />
                </div>
              )}

              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>{AZENA_DAYS}일 기대값</span>
                <GoldValue v={breakdown.totalGold} />
              </div>

              {goldPerWon > 0 && (
                <div className={styles.resultRow}>
                  <span className={styles.resultRowLabel}>기대 효율</span>
                  <BenefitBadge v={benefit} />
                </div>
              )}

              {/* 환율 — 일반 상세와 동일한 상자 */}
              <div className={styles.resultRateBox}>
                <span className={styles.resultRateBoxLabel}>환율</span>
                <div className={styles.resultRateInput}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.resultRateIcon} />
                  <span className={styles.resultRateFixed}>100</span>
                  <span className={styles.resultRateSep}>:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/royal.webp" alt="로얄 크리스탈" className={styles.resultRateIcon} />
                  <input
                    type="number"
                    className={styles.resultRateNumber}
                    value={wonPer100Gold || ''}
                    onChange={(e) => setWonPer100Gold(parseInt(e.target.value) || 0)}
                    placeholder="15"
                    min={1}
                    aria-label="100골드당 원화 환율"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 내 플레이 설정 */}
          <section className={`${styles.itemCardsSection} ${styles.detailCard}`}>
            <h2 className={styles.detailCardHeader}>내 플레이 설정</h2>

            <div className={az.controlGroup}>
              <div className={az.controlLabelRow}>
                <span className={az.controlLabel}>아이템 레벨</span>
                <span className={az.controlHint}>융화 재료·재련 재료 상자 구성이 달라집니다</span>
              </div>
              <div className={az.segRow}>
                <button
                  type="button"
                  className={`${az.segBtn} ${options.tier === 'high' ? az.segBtnActive : ''}`}
                  onClick={() => setOption('tier', 'high')}
                >
                  1730 이상 ↑
                </button>
                <button
                  type="button"
                  className={`${az.segBtn} ${options.tier === 'low' ? az.segBtnActive : ''}`}
                  onClick={() => setOption('tier', 'low')}
                >
                  1730 이하 ↓
                </button>
              </div>
            </div>

            <div className={az.controlGroup}>
              <div className={az.controlLabelRow}>
                <span className={az.controlLabel}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/resonance-energy.webp" alt="" className={az.segBtnIcon} />
                  공명의 기운 사용 ({AZENA_DAYS}일 총)
                </span>
                <span className={az.controlHint}>1개당 균열 +1판 → 편린 기회 증가</span>
              </div>
              <CountControl value={options.resonanceCount} onChange={(v) => setOption('resonanceCount', v)} />
            </div>

            <div className={az.controlGroup}>
              <div className={az.controlLabelRow}>
                <span className={az.controlLabel}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/rest-potion.webp" alt="" className={az.segBtnIcon} />
                  휴게 물약 사용 ({AZENA_DAYS}일 총)
                </span>
                <span className={az.controlHint}>1개당 균열 +1판</span>
              </div>
              <CountControl value={options.restPotionCount} onChange={(v) => setOption('restPotionCount', v)} />
            </div>

            <div className={az.controlGroup}>
              <div className={az.controlLabelRow}>
                <span className={az.controlLabel}>PC방 방문 ({AZENA_DAYS}일 중)</span>
                <span className={az.controlHint}>방문일마다 균열 +2판</span>
              </div>
              <CountControl value={options.pcRoomVisits} onChange={(v) => setOption('pcRoomVisits', v)} max={AZENA_DAYS} unit="회" />
            </div>
          </section>
        </div>

        {/* 구성 가치 상세 — 갤러리 카드처럼 항목별로 접었다 펴는 아코디언 */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailCardHeader}>구성 가치 상세 ({AZENA_DAYS}일 기대값)</h2>
          <div className={az.accList}>

            {/* 1. 도약의 정수 */}
            <div className={`${az.accItem} ${openAcc === 'essence' ? az.accItemOpen : ''}`}>
              <button type="button" className={az.accHead} onClick={() => toggleAcc('essence')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/leap-essence.webp" alt="" className={az.accIcon} />
                <span className={az.accTitleWrap}>
                  <span className={az.accTitle}>도약의 정수 ×{AZENA_DAYS}</span>
                  <span className={az.accSub}>매일 1개 — 블루 크리스탈 환산</span>
                </span>
                <span className={az.accGold}>{formatNumber(breakdown.daily.essenceGold)}G</span>
                <AccChevron open={openAcc === 'essence'} />
              </button>
              {openAcc === 'essence' && (
                <div className={az.accBody}>
                  <div className={az.probRow}>
                    <span>1개 = 10 블루 크리스탈</span>
                    <span className={az.probGold}>{formatNumber(breakdown.daily.essenceUnitGold)}G</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. 일일 선택 상자 — 내용물 선택도 여기서 한다 */}
            <div className={`${az.accItem} ${openAcc === 'dailyBox' ? az.accItemOpen : ''}`}>
              <button type="button" className={az.accHead} onClick={() => toggleAcc('dailyBox')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/azena-select-box.png" alt="" className={az.accIcon} />
                <span className={az.accTitleWrap}>
                  <span className={az.accTitle}>아제나의 축복이 깃든 선택 상자 ×{AZENA_DAYS}</span>
                  <span className={az.accSub}>
                    매일 1개 — 현재 선택: {selectedDaily?.shortName} ×{selectedDaily?.quantity}
                    {options.dailyChoice === 'auto' ? ' (자동 최고가)' : ''}
                  </span>
                </span>
                <span className={az.accGold}>{formatNumber(breakdown.daily.boxGold)}G</span>
                <AccChevron open={openAcc === 'dailyBox'} />
              </button>
              {openAcc === 'dailyBox' && (
                <div className={az.accBody}>
                  <button
                    type="button"
                    className={`${az.optRow} ${options.dailyChoice === 'auto' ? az.optRowActive : ''}`}
                    onClick={() => setOption('dailyChoice', 'auto')}
                  >
                    <span>자동 — 시세 최고가 옵션으로 계산</span>
                    <span className={az.probGold}>현재 {selectedDaily?.shortName}</span>
                  </button>
                  {dailyOptions.map((opt) => {
                    const unit = getAzenaDailyBoxOptionGold(opt.key, latestPrices, options.tier);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        className={`${az.optRow} ${options.dailyChoice === opt.key ? az.optRowActive : ''}`}
                        onClick={() => setOption('dailyChoice', opt.key)}
                        title={`${opt.name} ×${opt.quantity} — 상자 1개 ${formatNumber(unit)}G`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img loading="lazy" decoding="async" src={opt.icon} alt="" className={az.optIcon} />
                        <span>{opt.name} ×{opt.quantity}</span>
                        <span className={az.probGold}>{formatNumber(unit * AZENA_DAYS)}G</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. 천상 도전권 — 낙원 시즌 토글 포함 */}
            <div className={`${az.accItem} ${openAcc === 'celestial' ? az.accItemOpen : ''}`}>
              <button type="button" className={az.accHead} onClick={() => toggleAcc('celestial')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/cjstkd.webp" alt="" className={az.accIcon} />
                <span className={az.accTitleWrap}>
                  <span className={az.accTitle}>천상 도전 횟수 +1 ×{AZENA_WEEKS}</span>
                  <span className={az.accSub}>매주 1개</span>
                </span>
                <span className={az.accGold}>{formatNumber(breakdown.weekly.total)}G</span>
                <AccChevron open={openAcc === 'celestial'} />
              </button>
              {openAcc === 'celestial' && (
                <div className={az.accBody}>
                  <div className={az.probRow}>
                    <span>천상 도전권 1회 × {AZENA_WEEKS}주</span>
                    <span className={az.probGold}>{formatNumber(breakdown.weekly.ticketUnitGold)}G × {AZENA_WEEKS}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. 축복의 편린 */}
            <div className={`${az.accItem} ${openAcc === 'fragment' ? az.accItemOpen : ''}`}>
              <button type="button" className={az.accHead} onClick={() => toggleAcc('fragment')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/azena-fragment.png" alt="" className={az.accIconArt} />
                <span className={az.accTitleWrap}>
                  <span className={az.accTitle}>축복의 편린 — 기대 {fr.expectedCount.toFixed(1)}개</span>
                  <span className={az.accSub}>균열·가디언 토벌 1판당 {(FRAGMENT_DROP_RATE * 100).toFixed(1)}% 등장</span>
                </span>
                <span className={az.accGold}>{formatNumber(fr.total)}G</span>
                <AccChevron open={openAcc === 'fragment'} />
              </button>
              {openAcc === 'fragment' && (
                <div className={az.accBody}>
                  <div className={az.accNote}>
                    균열 {fr.baseRuns / 2}판 + 가디언 토벌 {fr.baseRuns / 2}판
                    {fr.extraRuns > 0 && (
                      <> + 추가 {fr.extraRuns}판 (공명 {options.resonanceCount} · 휴게 {options.restPotionCount} · PC방 {options.pcRoomVisits}×2)</>
                    )}
                    {' '}= 총 {fr.totalRuns}판 × {(FRAGMENT_DROP_RATE * 100).toFixed(1)}% ≈ 편린 {fr.expectedCount.toFixed(1)}개
                  </div>
                  {FRAGMENT_GOLD_TABLE.map((row) => (
                    <div key={row.gold} className={az.probRow}>
                      <span>{formatNumber(row.gold)} 골드</span>
                      <span className={az.probPct}>{row.p}%</span>
                      <span className={az.probGold}>{formatNumber(row.gold)}G</span>
                    </div>
                  ))}
                  <div className={az.probRow}>
                    <span>유물 각인서 주머니 (랜덤)</span>
                    <span className={az.probPct}>{FRAGMENT_ENGRAVING_RANDOM_P}%</span>
                    <span className={az.probGold}>{formatNumber(fr.perFragment.engravingAvg)}G</span>
                  </div>
                  <div className={az.probRow}>
                    <span>유물 각인서 주머니 (선택)</span>
                    <span className={az.probPct}>{FRAGMENT_ENGRAVING_SELECT_P}%</span>
                    <span className={az.probGold}>{formatNumber(fr.perFragment.engravingMax)}G</span>
                  </div>
                  <div className={az.probRow}>
                    <span>전설 카드 팩 (진격·기백·염원)</span>
                    <span className={az.probPct}>{FRAGMENT_LEGENDARY_PACK_P}%</span>
                    <span className={az.probGold}>{formatNumber(LEGENDARY_PACK_GOLD)}G</span>
                  </div>
                  <div className={az.probRow}>
                    <span>도약의 전설 카드 선택 팩 II</span>
                    <span className={az.probPct}>{FRAGMENT_SELECT_PACK_P}%</span>
                    <span className={az.probGold}>{formatNumber(LEGENDARY_SELECT_PACK_GOLD)}G</span>
                  </div>
                  <div className={az.accFoot}>
                    <span>편린 1개 기댓값 {formatNumber(fr.perFragment.total)}G</span>
                    <span>×{fr.expectedCount.toFixed(1)} = {formatNumber(fr.total)}G</span>
                  </div>
                </div>
              )}
            </div>

            {/* 5. 레이드 보너스 상자 */}
            <div className={`${az.accItem} ${openAcc === 'raidBox' ? az.accItemOpen : ''}`}>
              <button type="button" className={az.accHead} onClick={() => toggleAcc('raidBox')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/azena-select-box.png" alt="" className={az.accIcon} />
                <span className={az.accTitleWrap}>
                  <span className={az.accTitle}>아제나의 축복이 깃든 상자 ×{rb.count}</span>
                  <span className={az.accSub}>레이드 1관문 클리어 — 주 {AZENA_MAX_WEEKLY_RAID_CLEARS}회 × {AZENA_WEEKS}주 (랜덤)</span>
                </span>
                <span className={az.accGold}>{formatNumber(rb.total)}G</span>
                <AccChevron open={openAcc === 'raidBox'} />
              </button>
              {openAcc === 'raidBox' && (
                <div className={az.accBody}>
                  {/* 소/중/대 — 내용물을 아이템 아이콘으로 표시. 티어(1730↑/↓)에 따라 결정/일반 재료 이미지가 바뀐다 */}
                  {AZENA_RAID_BOX_TABLE.map((row) => (
                    <div key={row.key} className={az.boxBlock} title={row.label}>
                      <div className={az.boxBlockHead}>
                        <span>재련 재료 상자 ({row.key === 'small' ? '소' : row.key === 'medium' ? '중' : '대'})</span>
                        <span className={az.probPct}>{row.p}%</span>
                        <span className={az.probGold}>{formatNumber(rb.boxValues[row.key])}G</span>
                      </div>
                      <div className={az.matRow}>
                        {getAzenaRefineBoxContents(row.key, options.tier).map((mat) => (
                          <span key={mat.itemId} className={az.matChip} title={`${mat.label} ×${formatNumber(mat.amount)}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img loading="lazy" decoding="async" src={mat.icon} alt={mat.label} className={az.matIcon} />
                            <span className={az.matQty}>{formatNumber(mat.amount)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {AZENA_RAID_BOX_GOLD.map((row) => (
                    <div key={row.gold} className={az.probRow}>
                      <span>{formatNumber(row.gold)} 골드 금괴</span>
                      <span className={az.probPct}>{row.p}%</span>
                      <span className={az.probGold}>{formatNumber(row.gold)}G</span>
                    </div>
                  ))}
                  <div className={az.accFoot}>
                    <span>상자 1개 기댓값 {formatNumber(rb.perBoxEV)}G</span>
                    <span>×{rb.count} = {formatNumber(rb.total)}G</span>
                  </div>
                </div>
              )}
            </div>

            {/* 6. 전용 버프 */}
            <div className={`${az.accItem} ${openAcc === 'buff' ? az.accItemOpen : ''}`}>
              <button type="button" className={az.accHead} onClick={() => toggleAcc('buff')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/herb-steak.png" alt="" className={az.accIcon} />
                <span className={az.accTitleWrap}>
                  <span className={az.accTitle}>전용 버프</span>
                  <span className={az.accSub}>힘·민·지 6,000 · 생명력 12,000 · 자원 회복 24%</span>
                </span>
                <span className={az.accGold}>{formatNumber(breakdown.buff.total)}G</span>
                <AccChevron open={openAcc === 'buff'} />
              </button>
              {openAcc === 'buff' && (
                <div className={az.accBody}>
                  <div className={az.probRow}>
                    <span>허브 스테이크 {formatNumber(AZENA_BUFF_STEAK_GOLD)}G × 주 {AZENA_BUFF_STEAK_PER_WEEK}개 × {AZENA_WEEKS}주</span>
                    <span className={az.probGold}>{formatNumber(breakdown.buff.total)}G</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={az.grandTotalRow}>
            <span className={az.grandTotalLabel}>{AZENA_DAYS}일 총 기대값</span>
            <span className={az.grandTotalValue}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={az.goldIcon} />
              {formatNumber(breakdown.totalGold)}
            </span>
          </div>
        </div>

      </div>
    </Container>
  );
}
