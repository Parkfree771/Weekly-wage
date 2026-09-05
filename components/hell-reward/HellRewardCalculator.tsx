'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import styles from '@/app/hell-reward/hell-reward.module.css';
import { fetchLatestPrices } from '@/lib/price-history-client';
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
  getHeroGemMax,
  calcBoxRewardGold,
  getRewardData,
  getBaseRewardRows,
  TICKET_TIER_LABELS as TIER_LABELS,
} from '@/lib/hell-reward-calc';

type ModeType = 'hell' | 'narak';

// 층 기본 보상 아이콘 (재련 재료 — 사이트 공통 파일)
const BASE_REWARD_IMAGES: Record<string, string> = {
  '운명의 파편': '/destiny-shard-bag-large5.webp',
  '파괴석 결정': '/top-destiny-destruction-stone5.webp',
  '수호석 결정': '/top-destiny-guardian-stone5.webp',
  '위대한 돌파석': '/top-destiny-breakthrough-stone5.webp',
};

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

// 자체 배경(사각 타일)이 그려진 아이콘 — 투명 배경 아이콘과 달리 칸을 꽉 채워
// 칸의 둥근 모서리로 잘라내야 사각 테두리가 튀어나오지 않는다.
const FILLED_BG_IMAGES = new Set([
  '/xmrwo.webp',          // 특수재련
  '/djqlfflxltmxhs.webp',  // 어빌리티스톤
  '/vkfwl.webp',           // 팔찌
  '/engraving.webp',       // 귀속 각인서 랜덤 상자
  '/gem-fear-8.webp',      // 귀속 보석
]);

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

// 현재 보상 테이블(lib/hell-reward-calc)이 기준으로 삼는 시즌 — 레벨 트랙의 빨간 배지로 표시.
// 시즌4 데이터가 확정되면 여기와 ITEM_LEVELS.available 만 갱신하면 된다.
const CURRENT_SEASON = '시즌3';
const ITEM_LEVELS = [
  { level: 1730, available: false },
  { level: 1750, available: true },
  { level: 1770, available: false },
];

export default function HellRewardCalculator() {
  const [mode, setMode] = useState<ModeType>('hell');
  const [selectedLevel, setSelectedLevel] = useState<number>(1750);
  const [selectedTier, setSelectedTier] = useState<number>(6);
  const [expandedReward, setExpandedReward] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  // 환율 — /package 갤러리 카드와 같은 두 줄 입력 (골드100:로얄N원 ↔ 블크100=골드N 양방향 동기화)
  // 문자열로 드는 이유: number state 면 "16." 같은 타이핑 중간 상태가 지워져 소수 입력이 안 된다
  const [rateText, setRateText] = useState<string>('15');
  const [bcText, setBcText] = useState<string>('18333');
  const [excludeAbilityStone, setExcludeAbilityStone] = useState<boolean>(true);

  useEffect(() => {
    fetchLatestPrices()
      .then((latest) => setPrices(latest))
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, []);

  const exchangeRate = parseFloat(bcText) || 0; // 블크 100당 골드
  const peonGoldValue = 8.5 * (exchangeRate / 100);
  const specialRefiningCost = calcSpecialRefiningUnitCost(prices);

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

  const rewardData = getRewardData(mode);
  const rewards = Object.keys(rewardData);
  const hasPrices = Object.keys(prices).length > 0;
  const hasAbilityStone = rewards.includes('어빌리티스톤');

  // 층 기본 보상 — 상자 안에 같이 들어 있는 몫이라 각 항목 가치에 더한다 (지옥만)
  const baseRows = hasPrices ? getBaseRewardRows(mode, selectedTier, prices) : [];
  const baseGold = baseRows.reduce((s, r) => s + r.gold, 0);

  const sortedRewards = rewards
    .map((name) => {
      const raw = rewardData[name]?.[selectedTier];
      const available = !!raw && raw !== '-';
      const boxGold = available && hasPrices
        ? calcBoxRewardGold(name, selectedTier, prices, mode, peonGoldValue, specialRefiningCost)
        : null;
      const box = boxGold ?? 0;
      return {
        name,
        rawVal: raw || '-',
        available,
        boxGold: box,
        baseGold,
        goldValue: available ? box + baseGold : 0,
      };
    })
    .sort((a, b) => {
      if (!a.available && !b.available) return 0;
      if (!a.available) return 1;
      if (!b.available) return -1;
      return b.goldValue - a.goldValue;
    });

  // 상자 평균
  const avgTargets = (() => {
    let available = sortedRewards.filter((r) => r.available);
    if (excludeAbilityStone) available = available.filter((r) => r.name !== '어빌리티스톤');
    return available;
  })();
  const avgGold = avgTargets.length > 0
    ? Math.floor(avgTargets.reduce((s, r) => s + r.boxGold, 0) / avgTargets.length)
    : 0;

  const totalGold = baseGold + avgGold;

  // 상대 가치 바 기준 — 지금 목록에서 가장 비싼 항목
  const maxGoldValue = Math.max(0, ...sortedRewards.filter((r) => r.available).map((r) => r.goldValue));

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
      if (gem.rarity !== 'hero') return `희귀 ${gem.count}개 × ${RARE_GEM_PRICE.toLocaleString()}G (고정가)`;
      const pick = getHeroGemMax(prices);
      return pick
        ? `영웅 ${gem.count}개 × ${pick.price.toLocaleString()}G — 지금 최고가는 ${pick.name} (영웅 젬 6종 중 자동 선택, 시세가 뒤집히면 바뀝니다)`
        : `영웅 ${gem.count}개 × ${getHeroGemMaxPrice(prices).toLocaleString()}G (영웅 젬 최고가 시세)`;
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
    <div className={styles.wrap}>
      {/* 아이템 레벨 + 콘텐츠 */}
      <div className={styles.controlsRow}>
        <div className={`${styles.segTrack} ${styles.segTrackLevel}`}>
          <span className={styles.seasonBadge}>{CURRENT_SEASON}</span>
          {ITEM_LEVELS.map(({ level, available }) => (
            <button
              key={level}
              className={`${styles.segBtn} ${selectedLevel === level ? styles.segBtnActive : ''} ${!available ? styles.segBtnDisabled : ''}`}
              disabled={!available}
              onClick={() => { setSelectedLevel(level); setExpandedReward(null); }}
            >
              {level}
            </button>
          ))}
        </div>
        <div className={`${styles.segTrack} ${styles.segTrackMode}`}>
          <button
            className={`${styles.segBtn} ${mode === 'hell' ? styles.segBtnActive : ''}`}
            onClick={() => { setMode('hell'); setExpandedReward(null); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/celtic_key_5.webp" alt="" className={styles.segIcon} />
            <span>지옥</span>
          </button>
          <button
            className={`${styles.segBtn} ${mode === 'narak' ? styles.segBtnActive : ''}`}
            onClick={() => { setMode('narak'); setExpandedReward(null); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/key_5.webp" alt="" className={styles.segIcon} />
            <span>나락</span>
          </button>
        </div>
      </div>

      {/* 단계 */}
      <div className={`${styles.segTrack} ${styles.segTrackScroll}`}>
        {TIER_LABELS.map((label, idx) => (
          <button
            key={idx}
            title={`${label}층`}
            className={`${styles.segBtn} ${styles.tierBtn} ${selectedTier === idx ? styles.segBtnActive : ''}`}
            onClick={() => { setSelectedTier(idx); setExpandedReward(null); }}
          >
            {idx}
          </button>
        ))}
      </div>

      {/* 총 기댓값 + 환율 */}
      <div className={styles.infoRow}>
        {hasPrices && !priceLoading && (
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <span className={styles.heroLabel}>
                {selectedLevel} {mode === 'hell' ? '지옥' : '나락'} {selectedTier}단계 총 기댓값
              </span>
              {hasAbilityStone && (
                <label className={styles.stoneExcludeLabel}>
                  <input
                    type="checkbox"
                    checked={excludeAbilityStone}
                    onChange={(e) => setExcludeAbilityStone(e.target.checked)}
                    className={styles.stoneExcludeCheck}
                  />
                  <span>어빌리티스톤 제외</span>
                </label>
              )}
            </div>
            <span className={styles.heroValue}>
              <NextImage src="/gold.webp" alt="골드" width={24} height={24} />
              {totalGold.toLocaleString()} G
            </span>
            <span className={styles.heroBreak}>
              {baseGold > 0 ? (
                <>기본 <b>{baseGold.toLocaleString()}</b> + 상자 평균 <b>{avgGold.toLocaleString()}</b> ({avgTargets.length}종)</>
              ) : (
                <>상자 보상 {avgTargets.length}종 평균</>
              )}
            </span>
          </div>
        )}

        {/* 환율 — /package 갤러리 카드 하단과 똑같은 두 줄 입력 */}
        <div className={styles.exchangeCard}>
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
                placeholder="18333"
                min={1}
                step="any"
                aria-label="블루 크리스탈 100개당 골드"
              />
            </div>
            <div className={styles.rateHint}>페온 1개 = {Math.floor(peonGoldValue).toLocaleString()}G</div>
          </div>
        </div>
      </div>

      {/* 보상 카드 목록 — 층 기본 보상은 각 카드를 펼치면 합산 내역으로 보인다 */}
      {priceLoading ? (
        <div className={styles.loading}>시세 불러오는 중...</div>
      ) : !hasPrices ? (
        <div className={styles.loading}>시세 데이터를 불러올 수 없습니다</div>
      ) : (
        <div className={styles.rewardList}>
          {sortedRewards.map((reward) => {
            const isExpanded = expandedReward === reward.name;
            const rewardImg = getRewardImage(reward.name, reward.rawVal);
            return (
              <div
                key={reward.name}
                className={`${styles.rewardCard} ${!reward.available ? styles.rewardCardDisabled : ''} ${isExpanded ? styles.rewardCardExpanded : ''}`}
              >
                <div
                  className={styles.rewardCardMain}
                  onClick={() => reward.available && setExpandedReward(isExpanded ? null : reward.name)}
                >
                  <div className={`${styles.rewardImgWrap} ${reward.name === '귀속골드' ? styles.rewardImgSmall : ''} ${reward.name === '정련된 운명/혼돈의 돌' ? styles.rewardImgLarge : ''} ${FILLED_BG_IMAGES.has(rewardImg) ? styles.rewardImgFilled : ''}`}>
                    {rewardImg ? (
                      <NextImage src={rewardImg} alt={reward.name} width={60} height={60} className={styles.rewardImg} />
                    ) : (
                      <div style={{ width: 48, height: 48 }} />
                    )}
                  </div>
                  <div className={styles.rewardInfo}>
                    <span className={styles.rewardName}>{getDisplayName(reward.name)}</span>
                    <span className={styles.rewardQty}>{reward.rawVal}</span>
                  </div>
                  <div className={styles.rewardGold}>
                    {reward.available ? (
                      <>
                        <NextImage src="/gold.webp" alt="" width={20} height={20} />
                        <span>{reward.goldValue.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className={styles.rewardUnavailable}>-</span>
                    )}
                  </div>
                  {reward.available && (
                    <span className={styles.expandIcon}>
                      {isExpanded ? '▴' : '▾'}
                    </span>
                  )}
                </div>
                {/* 상대 가치 바 — 1위 항목 대비 이 항목의 가치 비율. 펼치면 상세 패널이 바닥이라 숨긴다 */}
                {reward.available && !isExpanded && maxGoldValue > 0 && (
                  <div
                    className={styles.valueBar}
                    style={{ width: `${Math.max(2, Math.round((reward.goldValue / maxGoldValue) * 100))}%` }}
                  />
                )}
                {isExpanded && (
                  <div className={styles.detail}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>가격 기준</span>
                      <span className={styles.detailValue}>
                        <span className={`${styles.priceBadge} ${styles[`priceBadge_${getPriceTag(reward.name, reward.rawVal)}`]}`}>
                          {getPriceTagLabel(getPriceTag(reward.name, reward.rawVal))}
                        </span>
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>수량</span>
                      <span className={styles.detailValue}>{reward.rawVal}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>산출</span>
                      <span className={styles.detailValue}>{getRewardDetail(reward.name, reward.rawVal)}</span>
                    </div>

                    {/* 이 카드의 숫자가 어떻게 나왔는지 — 층마다 확정으로 받는 기본 보상 + 이 상자의 고유 보상 */}
                    <div className={styles.sumBox}>
                      {baseRows.map((row, i) => (
                        <div key={row.name} className={`${styles.sumLine} ${styles.sumLineBase}`}>
                          <span className={styles.sumName}>
                            <span className={styles.sumOp}>{i === 0 ? '' : '+'}</span>
                            <NextImage src={BASE_REWARD_IMAGES[row.name]} alt="" width={17} height={17} />
                            <span className={styles.sumLabel}>{row.name}</span>
                            <span className={styles.sumCalc}>
                              {row.qty.toLocaleString()}개 × {fmtPrice(Math.round(row.unitPrice * 10) / 10)}G
                            </span>
                          </span>
                          <span className={styles.sumVal}>{row.gold.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className={styles.sumLine}>
                        <span className={styles.sumName}>
                          <span className={styles.sumOp}>{baseRows.length > 0 ? '+' : ''}</span>
                          {rewardImg && (
                            <NextImage
                              src={rewardImg}
                              alt=""
                              width={17}
                              height={17}
                              className={FILLED_BG_IMAGES.has(rewardImg) ? styles.sumImgFilled : ''}
                            />
                          )}
                          <span className={styles.sumLabel}>{getDisplayName(reward.name)}</span>
                          <span className={styles.sumTag}>고유</span>
                          <span className={styles.sumCalc}>{reward.rawVal}</span>
                        </span>
                        <span className={styles.sumVal}>{reward.boxGold.toLocaleString()}</span>
                      </div>
                      <div className={`${styles.sumLine} ${styles.sumLineTotal}`}>
                        <span className={styles.sumName}>
                          <span className={styles.sumOp}>=</span>
                          합계
                        </span>
                        <span className={styles.sumVal}>
                          <NextImage src="/gold.webp" alt="" width={17} height={17} />
                          {reward.goldValue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
