'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import styles from '@/app/hell-reward/hell-reward.module.css';
import { fetchPriceData } from '@/lib/price-history-client';
import {
  ENGRAVING_IDS,
  TOTAL_ENGRAVINGS,
  SPECIAL_REFINING_RATE,
  SPECIAL_REFINING_PER_ATTEMPT,
  RARE_GEM_PRICE,
  BRACELET_USEFUL_PROB,
  BRACELET_USEFUL_PRICE,
  BRACELET_PEON,
  parseRewardValue,
  parseDualValue,
  parseGemCount,
  parseRandomGemCount,
  getUnitPrice as getRewardUnitPrice,
  calcSpecialRefiningUnitCost,
  calcEngravingExpectedValue,
  getHeroGemMaxPrice,
  calcBoxRewardGold,
  getRewardDataByLevel,
  calcRandomGemExpectedValue,
  getPriceItemMap,
} from '@/lib/hell-reward-calc';

type LevelType = '1700' | '1730';
type ModeType = 'hell' | 'narak';

// 보상 이미지 매핑
const REWARD_IMAGES: Record<string, string> = {
  '파괴석/수호석': '/vkrhltngh.webp',
  '돌파석': '/top-destiny-breakthrough-stone5.webp',
  '융화재료': '/top-abidos-fusion5.webp',
  '재련 보조': '/material-select-box.webp',
  '귀속골드': '/gold.webp',
  '어빌리티스톤 키트': '/djqlfflxltmxhs.webp',
  '팔찌': '/vkfwl.webp',
  '특수재련': '/xmrwo.webp',
  '천상 도전권': '/cjstkd.webp',
  '젬선택': '/duddndgmlrnl.webp',
  '운명의 돌': '/dnsauddmlehf.webp',
  '재련보조': '/material-select-box.webp',
  '귀속 각인서 랜덤': '/engraving.webp',
  '귀속 보석': '/gem-fear-8.webp',

  '젬랜덤': '/duddndgmlrnl.webp',
};

function getGemImageByTier(tier: number): string {
  const heroOnlyTiers = [3, 6, 8, 9, 10];
  const mixedTiers = [4, 5, 7];
  if (heroOnlyTiers.includes(tier)) return '/gem-hero.webp';
  if (mixedTiers.includes(tier)) return '/duddndgmlrnl.webp';
  return '/gem.webp';
}

function getRewardImage(rewardName: string, tier: number, level: LevelType = '1730'): string {
  if (rewardName === '귀속 보석') return '/8fpqpfqhtjr.webp';
  if (rewardName === '젬선택') return getGemImageByTier(tier);
  if (rewardName === '젬랜덤') return '/duddndgmlrnl.webp';
  if (level === '1700' && REWARD_IMAGES_1700[rewardName]) return REWARD_IMAGES_1700[rewardName];
  return REWARD_IMAGES[rewardName] || '';
}

const DISPLAY_NAMES_1730: Record<string, string> = {
  '융화재료': '상비도스',
  '재련 보조': '용숨/빙숨',
  '재련보조': '용숨/빙숨',
  '파괴석/수호석': '파괴석 결정/수호석 결정',
  '돌파석': '위대한 운명의 돌파석',
};

const DISPLAY_NAMES_1700: Record<string, string> = {
  '융화재료': '아비도스 융화 재료',
  '재련 보조': '용숨/빙숨',
  '재련보조': '용숨/빙숨',
  '파괴석/수호석': '운명의 파괴석/수호석',
  '돌파석': '운명의 돌파석',
  '젬랜덤': '보석 랜덤 (희귀~영웅)',
};

// 1700 전용 이미지 (계승이 아닌 일반 재료)
const REWARD_IMAGES_1700: Record<string, string> = {
  '파괴석/수호석': '/vkrhltjrtnghtjr.webp',
  '돌파석': '/destiny-breakthrough-stone5.webp',
  '융화재료': '/abidos-fusion5.webp',
};

const TIER_LABELS = ['0~9', '10~19', '20~29', '30~39', '40~49', '50~59', '60~69', '70~79', '80~89', '90~99', '100'];

const HELL_REWARDS_1730 = [
  '파괴석/수호석', '돌파석', '융화재료', '재련 보조', '귀속골드',
  '어빌리티스톤 키트', '팔찌', '특수재련', '천상 도전권', '젬선택', '운명의 돌'
];
const NARAK_REWARDS_1730 = [
  '재련보조', '귀속골드', '어빌리티스톤 키트', '팔찌',
  '귀속 각인서 랜덤', '귀속 보석', '젬선택', '운명의 돌'
];
const HELL_REWARDS_1700 = [
  '파괴석/수호석', '돌파석', '융화재료', '재련 보조', '귀속골드',
  '어빌리티스톤 키트', '팔찌', '특수재련', '천상 도전권', '젬랜덤', '운명의 돌'
];
const NARAK_REWARDS_1700 = [
  '재련보조', '귀속골드', '어빌리티스톤 키트', '팔찌',
  '귀속 각인서 랜덤', '귀속 보석', '젬랜덤', '운명의 돌'
];

export default function HellRewardCalculator() {
  const [level, setLevel] = useState<LevelType>('1730');
  const [mode, setMode] = useState<ModeType>('hell');
  const [selectedTier, setSelectedTier] = useState<number>(6);
  const [expandedReward, setExpandedReward] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(8500);

  useEffect(() => {
    fetchPriceData()
      .then(({ latest }) => setPrices(latest))
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, []);

  const peonGoldValue = 8.5 * (exchangeRate / 100);
  const specialRefiningCost = calcSpecialRefiningUnitCost(prices, level);
  const wonPer100Gold = exchangeRate > 0 ? Math.round(275000 / exchangeRate) : 0;

  const rewards = level === '1700'
    ? (mode === 'hell' ? HELL_REWARDS_1700 : NARAK_REWARDS_1700)
    : (mode === 'hell' ? HELL_REWARDS_1730 : NARAK_REWARDS_1730);
  const rewardData = getRewardDataByLevel(mode, level);
  const hasPrices = Object.keys(prices).length > 0;

  const sortedRewards = rewards
    .map((name) => {
      const rawVal = rewardData[name]?.[selectedTier];
      const available = !!rawVal && rawVal !== '-';
      const goldValue = available && hasPrices
        ? calcBoxRewardGold(name, selectedTier, prices, mode, peonGoldValue, specialRefiningCost, level)
        : null;
      return { name, rawVal: rawVal || '-', available, goldValue: goldValue ?? 0 };
    })
    .sort((a, b) => {
      if (!a.available && !b.available) return 0;
      if (!a.available) return 1;
      if (!b.available) return -1;
      return b.goldValue - a.goldValue;
    });

  const avgGold = (() => {
    const available = sortedRewards.filter(r => r.available && r.goldValue !== null);
    if (available.length === 0) return 0;
    return Math.floor(available.reduce((s, r) => s + r.goldValue, 0) / available.length);
  })();

  function fmtPrice(v: number): string {
    return v % 1 === 0 ? v.toLocaleString() : v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  const peonDetail = `1페온 = 블크 8.5개, 블크100 = ${exchangeRate.toLocaleString()}G → ${fmtPrice(peonGoldValue)}G/페온`;

  const priceMap = getPriceItemMap(level);

  function getDisplayName(key: string): string {
    const names = level === '1700' ? DISPLAY_NAMES_1700 : DISPLAY_NAMES_1730;
    return names[key] || key;
  }

  type PriceTag = 'live' | 'fixed' | 'peon' | 'mixed';
  function getPriceTag(name: string): PriceTag {
    const liveItems = ['파괴석/수호석', '돌파석', '융화재료', '재련 보조', '재련보조', '귀속 각인서 랜덤', '귀속 보석'];
    if (liveItems.includes(name)) return 'live';
    if (name === '젬선택' || name === '젬랜덤') return 'live';
    if (name === '특수재련') return 'live';
    if (name === '어빌리티스톤 키트') return 'peon';
    if (name === '팔찌') return 'mixed';
    return 'fixed';
  }

  function getPriceTagLabel(tag: PriceTag): string {
    switch (tag) {
      case 'live': return '실시간 시세';
      case 'fixed': return '고정가';
      case 'peon': return '환율';
      case 'mixed': return '환율';
    }
  }

  /** 기준 가격 한줄 요약 (골드 영역 하단 표시용) */
  function getPriceSummary(name: string): string {
    if (name === '귀속골드') return '직접 지급';
    if (name === '운명의 돌') return '900G/개';
    if (name === '천상 도전권') return '3,000G/개';
    if (name === '어빌리티스톤 키트') return `100:${wonPer100Gold}\n페온 ${Math.floor(peonGoldValue).toLocaleString()}G`;
    if (name === '특수재련') return `${specialRefiningCost.toLocaleString()}G/개`;
    if (name === '팔찌') return `100:${wonPer100Gold}\n페온 ${Math.floor(peonGoldValue).toLocaleString()}G`;
    if (name === '젬선택') return `영웅 ${getHeroGemMaxPrice(prices).toLocaleString()}G`;
    if (name === '젬랜덤') return `기댓값 ${calcRandomGemExpectedValue(prices).toLocaleString()}G/개`;
    if (name === '귀속 각인서 랜덤') return `평균 ${calcEngravingExpectedValue(prices).toLocaleString()}G/개`;
    if (name === '귀속 보석') {
      const gemPrice = Math.round(prices['auction_gem_fear_8'] || 0);
      return `${gemPrice.toLocaleString()}G/개`;
    }
    if (name === '파괴석/수호석') {
      const mapping = priceMap[name];
      const u1 = getRewardUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle);
      const u2 = mapping.id2 && mapping.bundle2 ? getRewardUnitPrice(mapping.id2, mapping.bundle2, prices, mapping.fallbackId2, mapping.fallbackBundle2) : 0;
      return `${fmtPrice(u1)}G / ${fmtPrice(u2)}G`;
    }
    if (name === '재련 보조' || name === '재련보조') {
      const mapping = priceMap[name];
      const u1 = (prices[mapping.id] || 0) / mapping.bundle;
      const u2 = mapping.id2 && mapping.bundle2 ? (prices[mapping.id2] || 0) / mapping.bundle2 : 0;
      return `${fmtPrice(u1)}G / ${fmtPrice(u2)}G`;
    }
    if (name === '돌파석') {
      const mapping = priceMap[name];
      return `${fmtPrice(getRewardUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle))}G/개`;
    }
    if (name === '융화재료') {
      const mapping = priceMap[name];
      return `${fmtPrice(getRewardUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle))}G/개`;
    }
    return '';
  }

  function getRewardDetail(name: string, rawVal: string): string {
    if (name === '귀속골드') return '귀속 골드 직접 지급';
    if (name === '운명의 돌') return `${rawVal}개 × 900G/개 (고정가)`;
    if (name === '천상 도전권') return `${rawVal}개 × 3,000G/개 (고정가)`;
    if (name === '어빌리티스톤 키트') {
      const perItem = Math.floor(9 * peonGoldValue);
      return `${rawVal}개 × 9페온 × ${fmtPrice(peonGoldValue)}G/페온 = ${rawVal}개 × ${perItem.toLocaleString()}G | ${peonDetail}`;
    }
    if (name === '특수재련') {
      const medianAttempts = Math.ceil(Math.log(0.5) / Math.log(1 - SPECIAL_REFINING_RATE));
      const totalItems = medianAttempts * SPECIAL_REFINING_PER_ATTEMPT;
      const refLabel = level === '1700' ? '업화 무기 20→21' : '세르카 무기 20→21';
      return `${rawVal}개 × ${specialRefiningCost.toLocaleString()}G/개 | 산출: 일반재련(${refLabel}) ÷ ${totalItems.toLocaleString()}개(중앙값 ${medianAttempts}회 × ${SPECIAL_REFINING_PER_ATTEMPT}개, 확률 ${(SPECIAL_REFINING_RATE * 100).toFixed(1)}%)`;
    }
    if (name === '팔찌') {
      const match = rawVal.match(/x\s*(\d+)/);
      if (!match) return rawVal;
      const qty = parseInt(match[1]);
      const peonGold = BRACELET_PEON * peonGoldValue;
      const perBracelet = BRACELET_USEFUL_PRICE + peonGold;
      const total = Math.floor(qty * BRACELET_USEFUL_PROB * perBracelet);
      return `${qty}개 × 유효확률 ${(BRACELET_USEFUL_PROB * 100).toFixed(2)}% × (${BRACELET_USEFUL_PRICE.toLocaleString()}G + ${BRACELET_PEON}페온 × ${fmtPrice(peonGoldValue)}G = ${fmtPrice(perBracelet)}G) = ${total.toLocaleString()}G | ${peonDetail}`;
    }
    if (name === '젬선택') {
      const { hero, rare } = parseGemCount(rawVal);
      const parts: string[] = [];
      if (hero > 0) parts.push(`영웅 ${hero}개 × ${getHeroGemMaxPrice(prices).toLocaleString()}G(시세)`);
      if (rare > 0) parts.push(`희귀 ${rare}개 × ${RARE_GEM_PRICE.toLocaleString()}G(고정가)`);
      return parts.join(' + ') || rawVal;
    }
    if (name === '젬랜덤') {
      const count = parseRandomGemCount(rawVal);
      const expectedVal = calcRandomGemExpectedValue(prices);
      return `${count}개 × ${expectedVal.toLocaleString()}G/개 (영웅 10% 확률 기댓값 + 희귀 90% × ${RARE_GEM_PRICE.toLocaleString()}G)`;
    }
    if (name === '귀속 각인서 랜덤') return `${rawVal}개 × ${calcEngravingExpectedValue(prices).toLocaleString()}G/개 (추적 ${ENGRAVING_IDS.length}종 + 비추적 ${TOTAL_ENGRAVINGS - ENGRAVING_IDS.length}종, 총 ${TOTAL_ENGRAVINGS}종 평균)`;
    if (name === '귀속 보석') {
      const gemPrice = Math.round(prices['auction_gem_fear_8'] || 0);
      return `${rawVal}개 × ${gemPrice.toLocaleString()}G/개 (8레벨 겁화 보석 시세)`;
    }
    if (name === '파괴석/수호석') {
      const [v1, v2] = parseDualValue(rawVal);
      const mapping = priceMap[name];
      const unit1 = getRewardUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle);
      const unit2 = mapping.id2 && mapping.bundle2 ? getRewardUnitPrice(mapping.id2, mapping.bundle2, prices, mapping.fallbackId2, mapping.fallbackBundle2) : 0;
      const label1 = level === '1700' ? '파괴석' : '파괴석 결정';
      const label2 = level === '1700' ? '수호석' : '수호석 결정';
      return `${label1} ${v1.toLocaleString()}개 × ${fmtPrice(unit1)}G + ${label2} ${v2.toLocaleString()}개 × ${fmtPrice(unit2)}G`;
    }
    if (name === '재련 보조' || name === '재련보조') {
      const [v1, v2] = parseDualValue(rawVal);
      const mapping = priceMap[name];
      const unit1 = (prices[mapping.id] || 0) / mapping.bundle;
      const unit2 = mapping.id2 && mapping.bundle2 ? (prices[mapping.id2] || 0) / mapping.bundle2 : 0;
      return `용암의 숨결 ${v1.toLocaleString()}개 × ${fmtPrice(unit1)}G + 빙하의 숨결 ${v2.toLocaleString()}개 × ${fmtPrice(unit2)}G`;
    }
    if (name === '돌파석') {
      const mapping = priceMap[name];
      const unitPrice = getRewardUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle);
      return `${rawVal}개 × ${fmtPrice(unitPrice)}G/개 (시세)`;
    }
    if (name === '융화재료') {
      const mapping = priceMap[name];
      const unitPrice = getRewardUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle);
      return `${rawVal}개 × ${fmtPrice(unitPrice)}G/개 (시세)`;
    }
    return rawVal;
  }

  return (
    <>
      {/* 레벨 선택 */}
      <div className={styles.levelTabs}>
        <button
          className={`${styles.levelTab} ${level === '1700' ? styles.levelTabActive : ''}`}
          onClick={() => { setLevel('1700'); setExpandedReward(null); }}
        >
          1700
        </button>
        <button
          className={`${styles.levelTab} ${level === '1730' ? styles.levelTabActive : ''}`}
          onClick={() => { setLevel('1730'); setExpandedReward(null); }}
        >
          1730
        </button>
      </div>

      {/* 모드 선택 */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${mode === 'hell' ? styles.modeBtnActive : ''}`}
          onClick={() => { setMode('hell'); setExpandedReward(null); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/celtic_key_5.webp" alt="" className={styles.modeBtnIcon} />
          <span>지옥</span>
        </button>
        <button
          className={`${styles.modeBtn} ${mode === 'narak' ? styles.modeBtnActive : ''}`}
          onClick={() => { setMode('narak'); setExpandedReward(null); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/key_5.webp" alt="" className={styles.modeBtnIcon} />
          <span>나락</span>
        </button>
      </div>

      {/* 단계 선택 */}
      <div className={styles.tierSelector}>
        <div className={styles.tierTrack}>
          {TIER_LABELS.map((label, idx) => (
            <button
              key={idx}
              className={`${styles.tierChip} ${selectedTier === idx ? styles.tierChipActive : ''}`}
              onClick={() => { setSelectedTier(idx); setExpandedReward(null); }}
            >
              <span className={styles.tierChipNum}>{idx}</span>
              <span className={styles.tierChipRange}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 환율 + 평균 골드 */}
      <div className={styles.infoRow}>
        <div className={styles.exchangeCard}>
          <div className={styles.exchangeRatioRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/royal.webp" alt="" className={styles.exchangeIcon} />
            <span className={styles.exchangeFixed}>2750</span>
            <span className={styles.exchangeSep}>=</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/blue.webp" alt="" className={styles.exchangeIcon} />
            <span className={styles.exchangeFixed}>100</span>
            <span className={styles.exchangeSep}>=</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gold.webp" alt="" className={styles.exchangeIcon} />
            <input
              type="number"
              className={styles.exchangeInput}
              value={exchangeRate || ''}
              onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
              placeholder="8500"
              min={0}
            />
          </div>
          <div className={styles.exchangeRatioRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gold.webp" alt="" className={styles.exchangeIcon} />
            <span className={styles.exchangeFixed}>100</span>
            <span className={styles.exchangeSep}>=</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/royal.webp" alt="" className={styles.exchangeIcon} />
            <input
              type="number"
              className={styles.exchangeInput}
              value={wonPer100Gold || ''}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                setExchangeRate(v > 0 ? Math.round(275000 / v) : 0);
              }}
              placeholder="32"
              min={0}
            />
          </div>
          <div className={styles.exchangeResult}>
            페온 1개 = {Math.floor(peonGoldValue).toLocaleString()}골드
          </div>
        </div>

        {hasPrices && !priceLoading && (
          <div className={styles.avgBanner}>
            <NextImage src="/gold.webp" alt="골드" width={36} height={36} className={styles.avgBannerIcon} />
            <div className={styles.avgBannerText}>
              <span className={styles.avgBannerLabel}>단계 {selectedTier} 평균 기댓값</span>
              <span className={styles.avgBannerValue}>{avgGold.toLocaleString()} G</span>
            </div>
            <div className={styles.avgBannerCount}>
              {sortedRewards.filter(r => r.available).length}종
            </div>
          </div>
        )}
      </div>

      {/* 보상 카드 목록 */}
      {priceLoading ? (
        <div className={styles.loading}>시세 불러오는 중...</div>
      ) : !hasPrices ? (
        <div className={styles.loading}>시세 데이터를 불러올 수 없습니다</div>
      ) : (
        <div className={styles.rewardList}>
          {sortedRewards.map((reward, idx) => {
            const isExpanded = expandedReward === reward.name;
            const rewardImg = getRewardImage(reward.name, selectedTier, level);
            const rank = reward.available ? idx + 1 : null;
            return (
              <div
                key={reward.name}
                className={`${styles.rewardCard} ${!reward.available ? styles.rewardCardDisabled : ''} ${isExpanded ? styles.rewardCardExpanded : ''}`}
              >
                <div
                  className={styles.rewardCardMain}
                  onClick={() => reward.available && setExpandedReward(isExpanded ? null : reward.name)}
                >
                  {rank && rank <= 3 && (
                    <span className={`${styles.rankBadge} ${rank === 1 ? styles.rank1 : rank === 2 ? styles.rank2 : styles.rank3}`}>
                      {rank}
                    </span>
                  )}
                  <div className={`${styles.rewardImgWrap} ${reward.name === '귀속골드' ? styles.rewardImgSmall : ''}`}>
                    {rewardImg ? (
                      <NextImage src={rewardImg} alt={reward.name} width={60} height={60} className={styles.rewardImg} />
                    ) : (
                      <div style={{ width: 60, height: 60 }} />
                    )}
                  </div>
                  <div className={styles.rewardInfo}>
                    <div className={styles.rewardInfoRow}>
                      <span className={styles.rewardName}>{getDisplayName(reward.name)}</span>
                      {reward.available && (
                        <span className={`${styles.priceBadge} ${styles[`priceBadge_${getPriceTag(reward.name)}`]}`}>
                          {getPriceTagLabel(getPriceTag(reward.name))}
                        </span>
                      )}
                    </div>
                    <div className={styles.rewardInfoRow}>
                      <span className={styles.rewardQty}>{reward.rawVal}</span>
                      {reward.available && (
                        <span className={styles.rewardPriceSummary}>{getPriceSummary(reward.name)}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.rewardGold}>
                    {reward.available ? (
                      <>
                        <NextImage src="/gold.webp" alt="" width={22} height={22} />
                        <span>{reward.goldValue.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className={styles.rewardUnavailable}>-</span>
                    )}
                  </div>
                  {reward.available && (
                    <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
                      &#9662;
                    </span>
                  )}
                </div>
                {isExpanded && (
                  <div className={styles.detail}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>수량</span>
                      <span className={styles.detailValue}>{reward.rawVal}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>산출</span>
                      <span className={styles.detailValue}>{getRewardDetail(reward.name, reward.rawVal)}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>골드 가치</span>
                      <span className={styles.detailGold}>{reward.goldValue.toLocaleString()} G</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
