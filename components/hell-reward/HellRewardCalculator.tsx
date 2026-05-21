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
  FATE_STONE_PRICE,
  CHAOS_STONE_WEAPON_PRICE,
  CHAOS_STONE_ARMOR_PRICE,
  LEGENDARY_CARD_PACK_PRICE,
  CELESTIAL_TICKET_PRICE,
  BRACELET_USEFUL_PROB,
  BRACELET_USEFUL_PRICE,
  BRACELET_PEON,
  PRICE_ITEM_MAP,
  parseRewardValue,
  parseDualValue,
  parseGemSelectBox,
  getUnitPrice as getRewardUnitPrice,
  calcSpecialRefiningUnitCost,
  calcEngravingExpectedValue,
  getHeroGemMaxPrice,
  calcBoxRewardGold,
  getRewardData,
} from '@/lib/hell-reward-calc';

type ModeType = 'hell' | 'narak';

// 보상 이미지 매핑
const REWARD_IMAGES: Record<string, string> = {
  '젬 선택 상자': '/duddndgmlrnl.webp',
  '용숨/빙숨': '/material-select-box.webp',
  '특수재련': '/xmrwo.webp',
  '상급아비도스': '/top-abidos-fusion5.webp',
  '파괴석/수호석': '/vkrhltngh.webp',
  '정련된 운명/혼돈의 돌': '/dnsaudghsehf.webp',
  '귀속골드': '/gold.webp',
  '돌파석': '/top-destiny-breakthrough-stone5.webp',
  '천상 도전권': '/cjstkd.webp',
  '어빌리티스톤': '/djqlfflxltmxhs.webp',
  '팔찌': '/vkfwl.webp',
  '귀속 각인서 랜덤 상자': '/engraving.webp',
  '귀속 보석': '/gem-fear-8.webp',
  '전설카드팩': '/legendary-cardpack.webp',
};

function getRewardImage(rewardName: string, rawVal: string): string {
  if (rewardName === '젬 선택 상자') {
    return rawVal.includes('영웅') ? '/gem-hero.webp' : '/gem.webp';
  }
  return REWARD_IMAGES[rewardName] || '';
}

// 표시 이름 (키와 다른 경우만)
const DISPLAY_NAMES: Record<string, string> = {
  '파괴석/수호석': '파괴석 결정 / 수호석 결정 선택상자',
  '정련된 운명/혼돈의 돌': '정련된 운명 / 정련된 혼돈의 돌',
  '상급아비도스': '상급 아비도스 융화 재료',
  '용숨/빙숨': '용암의 숨결 / 빙하의 숨결',
  '돌파석': '위대한 운명의 돌파석',
};

const TIER_LABELS = ['0~9', '10~19', '20~29', '30~39', '40~49', '50~59', '60~69', '70~79', '80~89', '90~99', '100'];

export default function HellRewardCalculator() {
  const [mode, setMode] = useState<ModeType>('hell');
  const [selectedTier, setSelectedTier] = useState<number>(6);
  const [expandedReward, setExpandedReward] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(15278); // 100골드 = 18원 (100:18)
  const [excludeAbilityStone, setExcludeAbilityStone] = useState<boolean>(true);

  useEffect(() => {
    fetchPriceData()
      .then(({ latest }) => setPrices(latest))
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, []);

  const peonGoldValue = 8.5 * (exchangeRate / 100);
  const specialRefiningCost = calcSpecialRefiningUnitCost(prices);
  const wonPer100Gold = exchangeRate > 0 ? Math.round(275000 / exchangeRate) : 0;

  const rewardData = getRewardData(mode);
  const rewards = Object.keys(rewardData);
  const hasPrices = Object.keys(prices).length > 0;
  const hasAbilityStone = rewards.includes('어빌리티스톤');

  const sortedRewards = rewards
    .map((name) => {
      const rawVal = rewardData[name]?.[selectedTier];
      const available = !!rawVal && rawVal !== '-';
      const goldValue = available && hasPrices
        ? calcBoxRewardGold(name, selectedTier, prices, mode, peonGoldValue, specialRefiningCost)
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
    let available = sortedRewards.filter(r => r.available && r.goldValue !== null);
    if (excludeAbilityStone) {
      available = available.filter(r => r.name !== '어빌리티스톤');
    }
    if (available.length === 0) return 0;
    return Math.floor(available.reduce((s, r) => s + r.goldValue, 0) / available.length);
  })();

  function fmtPrice(v: number): string {
    return v % 1 === 0 ? v.toLocaleString() : v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  const peonDetail = `1페온 = 블크 8.5개, 블크100 = ${exchangeRate.toLocaleString()}G → ${fmtPrice(peonGoldValue)}G/페온`;

  function getDisplayName(key: string): string {
    return DISPLAY_NAMES[key] || key;
  }

  type PriceTag = 'live' | 'fixed' | 'peon' | 'mixed';
  function getPriceTag(name: string, rawVal: string): PriceTag {
    if (name === '젬 선택 상자') return rawVal.includes('영웅') ? 'live' : 'fixed';
    const liveItems = ['파괴석/수호석', '돌파석', '상급아비도스', '용숨/빙숨', '특수재련', '귀속 각인서 랜덤 상자', '귀속 보석'];
    if (liveItems.includes(name)) return 'live';
    if (name === '어빌리티스톤') return 'peon';
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
  function getPriceSummary(name: string, rawVal: string): string {
    if (name === '귀속골드') return '직접 지급';
    if (name === '천상 도전권') return `${CELESTIAL_TICKET_PRICE.toLocaleString()}G/개`;
    if (name === '전설카드팩') return `${LEGENDARY_CARD_PACK_PRICE.toLocaleString()}G/개`;
    if (name === '정련된 운명/혼돈의 돌') return `운명 ${FATE_STONE_PRICE.toLocaleString()}G · 혼돈 ${(CHAOS_STONE_WEAPON_PRICE + CHAOS_STONE_ARMOR_PRICE).toLocaleString()}G`;
    if (name === '어빌리티스톤') return `100:${wonPer100Gold}\n페온 ${Math.floor(peonGoldValue).toLocaleString()}G`;
    if (name === '특수재련') return `${specialRefiningCost.toLocaleString()}G/개`;
    if (name === '팔찌') return `100:${wonPer100Gold}\n페온 ${Math.floor(peonGoldValue).toLocaleString()}G`;
    if (name === '젬 선택 상자') {
      return rawVal.includes('영웅')
        ? `영웅 ${getHeroGemMaxPrice(prices).toLocaleString()}G`
        : `희귀 ${RARE_GEM_PRICE.toLocaleString()}G`;
    }
    if (name === '귀속 각인서 랜덤 상자') return `평균 ${calcEngravingExpectedValue(prices).toLocaleString()}G/개`;
    if (name === '귀속 보석') {
      const gemPrice = Math.round(prices['auction_gem_fear_8'] || 0);
      return `${gemPrice.toLocaleString()}G/개`;
    }
    if (name === '파괴석/수호석' || name === '용숨/빙숨') {
      const mapping = PRICE_ITEM_MAP[name];
      const u1 = getRewardUnitPrice(mapping.id, mapping.bundle, prices);
      const u2 = mapping.id2 && mapping.bundle2 ? getRewardUnitPrice(mapping.id2, mapping.bundle2, prices) : 0;
      return `${fmtPrice(u1)}G / ${fmtPrice(u2)}G`;
    }
    if (name === '돌파석' || name === '상급아비도스') {
      const mapping = PRICE_ITEM_MAP[name];
      return `${fmtPrice(getRewardUnitPrice(mapping.id, mapping.bundle, prices))}G/개`;
    }
    return '';
  }

  function getRewardDetail(name: string, rawVal: string): string {
    if (name === '귀속골드') return '귀속 골드 직접 지급';
    if (name === '천상 도전권') return `${rawVal}개 × ${CELESTIAL_TICKET_PRICE.toLocaleString()}G/개 (고정가)`;
    if (name === '전설카드팩') return `${rawVal}개 × ${LEGENDARY_CARD_PACK_PRICE.toLocaleString()}G/개 (고정가)`;
    if (name === '정련된 운명/혼돈의 돌') {
      const [fate, chaos] = parseDualValue(rawVal);
      const fateVal = Math.floor(fate * FATE_STONE_PRICE);
      const chaosUnit = CHAOS_STONE_WEAPON_PRICE + CHAOS_STONE_ARMOR_PRICE;
      const chaosVal = Math.floor(chaos * chaosUnit);
      return `선택상자(택1) — 운명의 돌 ${fate.toLocaleString()}개 × ${FATE_STONE_PRICE.toLocaleString()}G = ${fateVal.toLocaleString()}G / 혼돈의 돌 ${chaos.toLocaleString()}개 (무기 ${CHAOS_STONE_WEAPON_PRICE.toLocaleString()}G + 방어구 ${CHAOS_STONE_ARMOR_PRICE.toLocaleString()}G 동시 지급 = ${chaosUnit.toLocaleString()}G) = ${chaosVal.toLocaleString()}G → 더 비싼 쪽 적용`;
    }
    if (name === '어빌리티스톤') {
      const perItem = Math.floor(9 * peonGoldValue);
      return `${rawVal}개 × 9페온 × ${fmtPrice(peonGoldValue)}G/페온 = ${rawVal}개 × ${perItem.toLocaleString()}G | ${peonDetail}`;
    }
    if (name === '특수재련') {
      const medianAttempts = Math.ceil(Math.log(0.5) / Math.log(1 - SPECIAL_REFINING_RATE));
      const totalItems = medianAttempts * SPECIAL_REFINING_PER_ATTEMPT;
      return `${rawVal}개 × ${specialRefiningCost.toLocaleString()}G/개 | 산출: 일반재련(계승 무기 20→21) ÷ ${totalItems.toLocaleString()}개(중앙값 ${medianAttempts}회 × ${SPECIAL_REFINING_PER_ATTEMPT}개, 확률 ${(SPECIAL_REFINING_RATE * 100).toFixed(1)}%)`;
    }
    if (name === '팔찌') {
      const qty = parseRewardValue(rawVal);
      const peonGold = BRACELET_PEON * peonGoldValue;
      const perBracelet = BRACELET_USEFUL_PRICE + peonGold;
      const total = Math.floor(qty * BRACELET_USEFUL_PROB * perBracelet);
      return `고대 ${qty}개 × 유효확률 ${(BRACELET_USEFUL_PROB * 100).toFixed(2)}% × (${BRACELET_USEFUL_PRICE.toLocaleString()}G + ${BRACELET_PEON}페온 × ${fmtPrice(peonGoldValue)}G = ${fmtPrice(perBracelet)}G) = ${total.toLocaleString()}G | ${peonDetail}`;
    }
    if (name === '젬 선택 상자') {
      const gem = parseGemSelectBox(rawVal);
      if (!gem) return rawVal;
      return gem.rarity === 'hero'
        ? `영웅 ${gem.count}개 × ${getHeroGemMaxPrice(prices).toLocaleString()}G (영웅 젬 최고가 시세)`
        : `희귀 ${gem.count}개 × ${RARE_GEM_PRICE.toLocaleString()}G (고정가)`;
    }
    if (name === '귀속 각인서 랜덤 상자') return `${rawVal}개 × ${calcEngravingExpectedValue(prices).toLocaleString()}G/개 (추적 ${ENGRAVING_IDS.length}종 + 비추적 ${TOTAL_ENGRAVINGS - ENGRAVING_IDS.length}종, 총 ${TOTAL_ENGRAVINGS}종 평균)`;
    if (name === '귀속 보석') {
      const gemPrice = Math.round(prices['auction_gem_fear_8'] || 0);
      return `${rawVal}개 × ${gemPrice.toLocaleString()}G/개 (8레벨 겁화 보석 시세)`;
    }
    if (name === '파괴석/수호석') {
      const [v1, v2] = parseDualValue(rawVal);
      const mapping = PRICE_ITEM_MAP[name];
      const unit1 = getRewardUnitPrice(mapping.id, mapping.bundle, prices);
      const unit2 = mapping.id2 && mapping.bundle2 ? getRewardUnitPrice(mapping.id2, mapping.bundle2, prices) : 0;
      const val1 = Math.floor(v1 * unit1);
      const val2 = Math.floor(v2 * unit2);
      return `선택상자(택1) — 파괴석 결정 ${v1.toLocaleString()}개 × ${fmtPrice(unit1)}G = ${val1.toLocaleString()}G / 수호석 결정 ${v2.toLocaleString()}개 × ${fmtPrice(unit2)}G = ${val2.toLocaleString()}G → 더 비싼 쪽 적용`;
    }
    if (name === '용숨/빙숨') {
      const [v1, v2] = parseDualValue(rawVal);
      const mapping = PRICE_ITEM_MAP[name];
      const unit1 = getRewardUnitPrice(mapping.id, mapping.bundle, prices);
      const unit2 = mapping.id2 && mapping.bundle2 ? getRewardUnitPrice(mapping.id2, mapping.bundle2, prices) : 0;
      return `용암의 숨결 ${v1.toLocaleString()}개 × ${fmtPrice(unit1)}G + 빙하의 숨결 ${v2.toLocaleString()}개 × ${fmtPrice(unit2)}G (둘 다 지급)`;
    }
    if (name === '돌파석' || name === '상급아비도스') {
      const mapping = PRICE_ITEM_MAP[name];
      const unitPrice = getRewardUnitPrice(mapping.id, mapping.bundle, prices);
      return `${rawVal}개 × ${fmtPrice(unitPrice)}G/개 (시세)`;
    }
    return rawVal;
  }

  return (
    <>
      {/* 시즌3 / 1750 표기 */}
      <div className={styles.versionBadge}>
        <span className={styles.versionBadgePill}>
          <span className={styles.versionBadgeNum}>1750</span>
          <span className={styles.versionBadgeLabel}>시즌3 지옥·나락 보상 계산</span>
        </span>
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
              placeholder="15278"
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
              placeholder="18"
              min={0}
            />
          </div>
          <div className={styles.exchangeResult}>
            페온 1개 = {Math.floor(peonGoldValue).toLocaleString()}골드
          </div>
        </div>

        {hasPrices && !priceLoading && (
          <div className={styles.avgBannerWrap}>
            <div className={styles.avgBanner}>
              <NextImage src="/gold.webp" alt="골드" width={36} height={36} className={styles.avgBannerIcon} />
              <div className={styles.avgBannerText}>
                <span className={styles.avgBannerLabel}>단계 {selectedTier} 평균 기댓값</span>
                <span className={styles.avgBannerValue}>{avgGold.toLocaleString()} G</span>
              </div>
              <div className={styles.avgBannerCount}>
                {(() => {
                  let available = sortedRewards.filter(r => r.available);
                  if (excludeAbilityStone) available = available.filter(r => r.name !== '어빌리티스톤');
                  return available.length;
                })()}종
              </div>
            </div>
            {hasAbilityStone && (
              <label className={styles.stoneExcludeLabel}>
                <input
                  type="checkbox"
                  checked={excludeAbilityStone}
                  onChange={(e) => setExcludeAbilityStone(e.target.checked)}
                  className={styles.stoneExcludeCheck}
                />
                <span>어빌리티스톤 제외</span>
                <span className={styles.stoneExcludeHint}>페온 가치로 인해 기댓값이 과도하게 높아 기본 제외됩니다. 포함하려면 체크 해제하세요.</span>
              </label>
            )}
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
            const rewardImg = getRewardImage(reward.name, reward.rawVal);
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
                  <div className={`${styles.rewardImgWrap} ${reward.name === '귀속골드' ? styles.rewardImgSmall : ''} ${reward.name === '정련된 운명/혼돈의 돌' ? styles.rewardImgLarge : ''}`}>
                    {rewardImg ? (
                      <NextImage src={rewardImg} alt={reward.name} width={72} height={72} className={styles.rewardImg} />
                    ) : (
                      <div style={{ width: 60, height: 60 }} />
                    )}
                  </div>
                  <div className={styles.rewardInfo}>
                    <div className={styles.rewardInfoRow}>
                      <span className={styles.rewardName}>{getDisplayName(reward.name)}</span>
                      {reward.available && (
                        <span className={`${styles.priceBadge} ${styles[`priceBadge_${getPriceTag(reward.name, reward.rawVal)}`]}`}>
                          {getPriceTagLabel(getPriceTag(reward.name, reward.rawVal))}
                        </span>
                      )}
                    </div>
                    <div className={styles.rewardInfoRow}>
                      <span className={styles.rewardQty}>{reward.rawVal}</span>
                      {reward.available && (
                        <span className={styles.rewardPriceSummary}>{getPriceSummary(reward.name, reward.rawVal)}</span>
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
