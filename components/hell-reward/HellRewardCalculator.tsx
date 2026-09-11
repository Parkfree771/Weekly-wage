'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import styles from '@/app/hell-reward/hell-reward.module.css';
import { fetchLatestPrices } from '@/lib/price-history-client';
import { useNoPeon } from '@/components/package/useNoPeon';
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
  GEM_PEON,
  BOX_PICK_COUNT,
  calcPickBestExpected,
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
  isHellItemLevel,
  type HellItemLevel,
} from '@/lib/hell-reward-calc';

type ModeType = 'hell' | 'narak';

// 층 기본 보상 아이콘 (재련 재료 — 사이트 공통 파일)
const BASE_REWARD_IMAGES: Record<string, string> = {
  '운명의 파편': '/destiny-shard-bag-large5.webp',
  '파괴석 결정': '/top-destiny-destruction-stone5.webp',
  '수호석 결정': '/top-destiny-guardian-stone5.webp',
  '위대한 돌파석': '/top-destiny-breakthrough-stone5.webp',
};

// 보상 그림 — 한 장이 아니라 "실제로 받는 것" 단위로 그린다.
// 선택 상자(택1)는 그림 두 장을 같은 크기로 놓고 사이에 or, 둘 다 주는 건 + 로 잇는다.
// 정련된 돌은 [운명] or [혼돈 무기] + [혼돈 방어구] — 혼돈을 고르면 무기·방어구를 둘 다 받는다.
type RewardOp = 'or' | '+';
type RewardVisual = { parts: string[]; ops: RewardOp[] };
const REWARD_VISUALS: Record<string, RewardVisual> = {
  '파괴석/수호석': { parts: ['/destruction-stone-crystal.webp', '/guardian-stone-crystal.webp'], ops: ['or'] },
  '용숨/빙숨': { parts: ['/breath-lava5.webp', '/breath-glacier5.webp'], ops: ['+'] },
  '정련된 운명/혼돈의 돌': { parts: ['/dnsauddmlehf.webp', '/weapon-quality.webp', '/armor-quality.webp'], ops: ['or', '+'] },
  '특수재련': { parts: ['/special-refine-stone.webp'], ops: [] },
  '상급아비도스': { parts: ['/top-abidos-fusion5.webp'], ops: [] },
  '귀속골드': { parts: ['/gold-bound.webp'], ops: [] },
  '돌파석': { parts: ['/breakthrough-stone-crystal.webp'], ops: [] },
  '천상 도전권': { parts: ['/cjstkd.webp'], ops: [] },
  '어빌리티스톤': { parts: ['/djqlfflxltmxhs.webp'], ops: [] },
  '팔찌': { parts: ['/vkfwl.webp'], ops: [] },
  '귀속 각인서 랜덤 상자': { parts: ['/engraving.webp'], ops: [] },
  '귀속 보석': { parts: ['/gem-fear-8.webp'], ops: [] },
  '전설카드팩': { parts: ['/legendary-cardpack.webp'], ops: [] },
};

// 자체 배경(사각 타일)이 그려진 아이콘 — 투명 배경 아이콘과 달리 칸을 꽉 채워
// 칸의 둥근 모서리로 잘라내야 사각 테두리가 튀어나오지 않는다.
const FILLED_BG_IMAGES = new Set([
  '/djqlfflxltmxhs.webp',  // 어빌리티스톤
  '/vkfwl.webp',           // 팔찌
  '/engraving.webp',       // 귀속 각인서 랜덤 상자
  '/gem-fear-8.webp',      // 귀속 보석
]);

// 칸 안에서만 그림 보정 (칸이 overflow hidden 으로 잘라준다) — scale 은 크기, y 는 세로 위치(%, 음수 = 위로)
const IMG_TWEAK: Record<string, { scale?: number; y?: number }> = {
  '/dnsauddmlehf.webp': { scale: 1.45 },          // 정련된 운명의 돌 (256x213, 돌이 가운데 절반)
  '/weapon-quality.webp': { scale: 1.3, y: -7 },  // 정련된 혼돈의 돌 (무기) — 원본에서 돌이 방어구보다 아래에 있어 올려 맞춘다
  '/armor-quality.webp': { scale: 1.3 },          // 정련된 혼돈의 돌 (방어구)
  '/gem-hero.webp': { scale: 1.25 },              // 젬 선택 상자 (영웅) — 상자 + 젬 5개라 하나하나가 작다
  '/gem.webp': { scale: 1.25 },                   // 젬 선택 상자 (희귀)
  '/gold-bound.webp': { scale: 0.86 },            // 귀속골드 — 코인이 칸을 꽉 채워 옆 그림보다 커 보인다
};

function imgTweakStyle(src: string): React.CSSProperties | undefined {
  const t = IMG_TWEAK[src];
  if (!t) return undefined;
  return { transform: `translateY(${t.y ?? 0}%) scale(${t.scale ?? 1})` };
}

function getRewardVisual(rewardName: string, rawVal: string): RewardVisual | null {
  if (rewardName === '젬 선택 상자') {
    return { parts: [rawVal.includes('영웅') ? '/gem-hero.webp' : '/gem.webp'], ops: [] };
  }
  return REWARD_VISUALS[rewardName] || null;
}

/** 제외 토글 — 그림 + 라벨 알약. 켜지면 그림에 사선, 알약은 포인트색으로 찬다 (어빌 제외 · 페온 제거) */
function ExcludeToggle({ icon, label, activeLabel, active, onChange, title }: {
  icon: string; label: string; activeLabel: string; active: boolean; onChange: (v: boolean) => void; title: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.exToggle} ${active ? styles.exToggleActive : ''}`}
      onClick={() => onChange(!active)}
      aria-pressed={active}
      title={title}
    >
      <span className={styles.exToggleIconWrap}>
        <NextImage src={icon} alt="" width={28} height={28} className={styles.exToggleIcon} />
      </span>
      <span>{active ? activeLabel : label}</span>
    </button>
  );
}

/** 보상 그림 — 칸(tile) 또는 합산 내역의 작은 줄(sum). 여러 장이면 or / + 로 이어 붙인다 */
function RewardImages({ visual, alt, size }: { visual: RewardVisual | null; alt: string; size: 'tile' | 'sum' }) {
  if (!visual) return <div className={size === 'tile' ? styles.rewardImgWrap : undefined} />;
  const px = size === 'tile' ? 72 : 20;
  return (
    <div className={size === 'tile' ? styles.rewardVisual : styles.sumVisual}>
      {visual.parts.map((src, i) => (
        <span key={src} className={styles.rewardVisualPart}>
          {i > 0 && (
            <span className={`${size === 'tile' ? styles.rewardOp : styles.sumOpGlyph} ${visual.ops[i - 1] === 'or' ? styles.rewardOpOr : styles.rewardOpPlus}`}>
              {visual.ops[i - 1]}
            </span>
          )}
          <span className={`${size === 'tile' ? styles.rewardImgWrap : styles.sumImgWrap} ${FILLED_BG_IMAGES.has(src) ? styles.rewardImgFilled : ''}`}>
            <NextImage
              src={src}
              alt={i === 0 ? alt : ''}
              width={px}
              height={px}
              className={size === 'tile' ? styles.rewardImg : styles.sumImg}
              style={imgTweakStyle(src)}
            />
          </span>
        </span>
      ))}
    </div>
  );
}

// 표시 이름 (키와 다른 경우만)
const DISPLAY_NAMES: Record<string, string> = {
  '파괴석/수호석': '파결 or 수결',
  '정련된 운명/혼돈의 돌': '운명의 돌 or 혼돈의 돌',
  '상급아비도스': '상비도스',
  '용숨/빙숨': '용숨 + 빙숨',
  '돌파석': '위대한 운명의 돌파석',
};

// 아이템 레벨 — 표가 있는 구간만 둔다(lib/hell-reward-calc 의 HELL_ITEM_LEVELS 와 같아야 한다).
// 새 구간은 lib 에 표를 넣은 뒤 여기에 한 줄 추가한다. 데이터가 아직 없는 구간은
// available: false 로 두면 눌리지 않는 회색 버튼이 된다.
const ITEM_LEVELS = [
  { level: 1730, available: true },
  { level: 1750, available: true },
];

export default function HellRewardCalculator() {
  const [mode, setMode] = useState<ModeType>('hell');
  const [selectedLevel, setSelectedLevel] = useState<HellItemLevel>(1750);
  const [selectedTier, setSelectedTier] = useState<number>(6);
  const [expandedReward, setExpandedReward] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  // 환율 — /package 갤러리 카드와 같은 두 줄 입력 (골드100:로얄N원 ↔ 블크100=골드N 양방향 동기화)
  // 문자열로 드는 이유: number state 면 "16." 같은 타이핑 중간 상태가 지워져 소수 입력이 안 된다
  const [rateText, setRateText] = useState<string>('15');
  const [bcText, setBcText] = useState<string>('18333');
  const [excludeAbilityStone, setExcludeAbilityStone] = useState<boolean>(true);
  // 끝났을 때 뜨는 상자 수 — 기본 3개. 히든층 '상자 +1'은 무작위라 여기서 고르게 하지 않는다
  const boxCount = BOX_PICK_COUNT;

  useEffect(() => {
    fetchLatestPrices()
      .then((latest) => setPrices(latest))
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, []);

  // 페온 가치 제거 — 패키지 갤러리·상세와 같은 뷰어 설정. 켜면 어빌리티스톤·팔찌·젬의 페온 몫이 0골드가 된다
  const [noPeon, setNoPeon] = useNoPeon();
  const exchangeRate = parseFloat(bcText) || 0; // 블크 100당 골드
  const peonGoldValue = noPeon ? 0 : 8.5 * (exchangeRate / 100);
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

  // 표가 있는 레벨만 받는다 — 비활성 버튼은 disabled 지만 타입도 같이 좁혀 둔다
  const handleLevel = (level: number) => {
    if (!isHellItemLevel(level)) return;
    setSelectedLevel(level);
    setExpandedReward(null);
  };

  const rewardData = getRewardData(mode, selectedLevel);
  const rewards = Object.keys(rewardData);
  const hasPrices = Object.keys(prices).length > 0;
  const hasAbilityStone = rewards.includes('어빌리티스톤');

  // 층 기본 보상 — 상자 안에 같이 들어 있는 몫이라 각 항목 가치에 더한다 (지옥만)
  const baseRows = hasPrices ? getBaseRewardRows(mode, selectedTier, prices) : [];
  const baseGold = baseRows.reduce((s, r) => s + r.gold, 0);

  // 순서 기준값 — 페온 포함 · 제외 없음. 어빌 제외·페온 제거를 켜도 줄이 움직이지 않고 골드만 바뀐다
  // (예전엔 값이 줄어든 줄이 맨 아래로 내려가 "목록에서 사라진" 것처럼 보였다)
  const fullPeonGold = 8.5 * (exchangeRate / 100);
  const sortedRewards = rewards
    .map((name) => {
      const raw = rewardData[name]?.[selectedTier];
      const available = !!raw && raw !== '-';
      const calc = (peon: number) => (available && hasPrices
        ? calcBoxRewardGold(name, selectedTier, prices, mode, peon, specialRefiningCost, selectedLevel) ?? 0
        : 0);
      // 제외 = 어빌 제외가 켜진 어빌리티스톤. 페온 제거로 값이 통째로 0이 된 줄(어빌리티스톤)도 같은 취급
      const excluded = excludeAbilityStone && name === '어빌리티스톤';
      const box = excluded ? 0 : calc(peonGoldValue);
      const zeroed = available && box === 0;
      return {
        name,
        rawVal: raw || '-',
        available,
        zeroed,
        boxGold: box,
        baseGold,
        // 0골드가 된 줄은 기본 보상도 붙이지 않고 0으로 보인다 — 이 상자를 고를 이유가 없다는 뜻
        goldValue: available && !zeroed ? box + baseGold : 0,
        orderValue: available ? calc(fullPeonGold) : -1,
      };
    })
    .sort((a, b) => {
      if (!a.available && !b.available) return 0;
      if (!a.available) return 1;
      if (!b.available) return -1;
      return b.orderValue - a.orderValue;
    });

  // 상자 기댓값 — 후보 목록에서 boxCount개가 뜨고 그중 최고를 고른다.
  // 제외·0골드 줄도 후보 자리는 그대로 두고 값만 0골드로 친다 (뜨는 확률은 안 바뀐다)
  const pickTargets = sortedRewards.filter((r) => r.available);
  const pickValues = pickTargets.map((r) => r.boxGold);
  const boxExpectedGold = Math.floor(calcPickBestExpected(pickValues, boxCount));

  const totalGold = baseGold + boxExpectedGold;

  function fmtPrice(v: number): string {
    return v % 1 === 0 ? v.toLocaleString() : v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  const peonDetail = `1페온 = 블크 8.5개, 블크100 = ${exchangeRate.toLocaleString()}G → ${fmtPrice(peonGoldValue)}G/페온`;

  function getDisplayName(key: string): string {
    return DISPLAY_NAMES[key] || key;
  }

  type PriceTag = 'live' | 'fixed' | 'peon' | 'mixed';
  function getPriceTag(name: string): PriceTag {
    // 젬은 (시세 또는 고정가) + 등급별 페온이라 팔찌와 같은 혼합
    if (name === '젬 선택 상자') return 'mixed';
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
      const peon = GEM_PEON[gem.rarity];
      const peonGold = peon * peonGoldValue;
      if (gem.rarity !== 'hero') {
        const unit = RARE_GEM_PRICE + peonGold;
        return `희귀 ${gem.count}개 × (${RARE_GEM_PRICE.toLocaleString()}G 고정가 + ${peon}페온 × ${fmtPrice(peonGoldValue)}G = ${fmtPrice(unit)}G) = ${Math.floor(gem.count * unit).toLocaleString()}G | ${peonDetail}`;
      }
      const pick = getHeroGemMax(prices);
      const price = pick ? pick.price : getHeroGemMaxPrice(prices);
      const unit = price + peonGold;
      const head = `영웅 ${gem.count}개 × (${price.toLocaleString()}G 시세 + ${peon}페온 × ${fmtPrice(peonGoldValue)}G = ${fmtPrice(unit)}G) = ${Math.floor(gem.count * unit).toLocaleString()}G`;
      return pick
        ? `${head} — 지금 최고가는 ${pick.name} (영웅 젬 6종 중 자동 선택, 시세가 뒤집히면 바뀝니다) | ${peonDetail}`
        : `${head} (영웅 젬 최고가 시세) | ${peonDetail}`;
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
      {/* 설정 패널 — 레벨·콘텐츠·단계·기댓값·환율을 상자 하나에 모은다 */}
      <div className={styles.panel}>
        {/* 아이템 레벨 + 콘텐츠 */}
        <div className={styles.controlsRow}>
          <div className={`${styles.segTrack} ${styles.segTrackLevel}`}>
            {ITEM_LEVELS.map(({ level, available }) => (
              <button
                key={level}
                className={`${styles.segBtn} ${selectedLevel === level ? styles.segBtnActive : ''} ${!available ? styles.segBtnDisabled : ''}`}
                disabled={!available}
                onClick={() => handleLevel(level)}
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
              {/* 라벨은 "총 기댓값" 하나 — 레벨·지옥/나락·단계는 바로 위 버튼이 이미 보여준다 */}
              <span className={styles.heroLabel}>총 기댓값</span>
              <span className={styles.heroValue}>
                <NextImage src="/gold.webp" alt="골드" width={24} height={24} />
                {totalGold.toLocaleString()} G
              </span>
              {baseGold > 0 && (
                <span className={styles.heroBreak}>
                  기본 <b>{baseGold.toLocaleString()}</b> + 상자 <b>{boxExpectedGold.toLocaleString()}</b>
                </span>
              )}
              {/* 제외 토글 두 개 — 그림이 곧 라벨이다. 켜지면 그림에 사선이 그어지고 알약이 차오른다 */}
              <div className={styles.heroOpts}>
                {hasAbilityStone && (
                  <ExcludeToggle
                    icon="/djqlfflxltmxhs.webp"
                    label="어빌 제외"
                    activeLabel="어빌 제외 중"
                    active={excludeAbilityStone}
                    onChange={setExcludeAbilityStone}
                    title="어빌리티스톤을 0골드로 계산 (뜨는 확률은 그대로)"
                  />
                )}
                <ExcludeToggle
                  icon="/pheon.webp"
                  label="페온 제거"
                  activeLabel="페온 제거 중"
                  active={noPeon}
                  onChange={setNoPeon}
                  title="페온을 0골드로 계산 — 어빌리티스톤·팔찌·젬의 페온 몫이 빠진다"
                />
              </div>
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
      </div>

      {/* 보상 카드 목록 — 층 기본 보상은 각 카드를 펼치면 합산 내역으로 보인다 */}
      {priceLoading ? (
        <div className={styles.loading}>시세 불러오는 중...</div>
      ) : !hasPrices ? (
        <div className={styles.loading}>시세 데이터를 불러올 수 없습니다</div>
      ) : (
        <div className={styles.rewardList}>
          {sortedRewards.map((reward, idx) => {
            const isExpanded = expandedReward === reward.name;
            const visual = getRewardVisual(reward.name, reward.rawVal);
            // 등수 — 목록이 이미 골드 가치 내림차순이라 순번이 곧 등수다. 미지급 항목은 등수를 매기지 않는다.
            const rank = reward.available ? idx + 1 : null;
            return (
              <div
                key={reward.name}
                className={`${styles.rewardCard} ${!reward.available ? styles.rewardCardDisabled : ''} ${isExpanded ? styles.rewardCardExpanded : ''}`}
              >
                {/* 머리줄(등수·이름·골드·화살표) + 아랫줄(그림) — 그림이 한 장이든 세 장이든 모든 줄이 같은 배열 */}
                <div
                  className={styles.rewardCardMain}
                  onClick={() => reward.available && setExpandedReward(isExpanded ? null : reward.name)}
                >
                  {/* 머리줄: 등수를 이름 앞에 붙인다 (따로 세운 칸이면 그림이 그 폭만큼 안으로 밀렸다).
                      접힌 줄엔 이름만 — 수량은 펼쳤을 때 '수량' 줄에 있다 */}
                  <div className={styles.rewardInfo}>
                    <span className={`${styles.rank} ${rank && rank <= 3 ? styles[`rank${rank}`] : ''}`}>
                      {rank ?? '-'}
                    </span>
                    <span className={styles.rewardName}>{getDisplayName(reward.name)}</span>
                  </div>
                  <RewardImages visual={visual} alt={reward.name} size="tile" />
                  <div className={`${styles.rewardGold} ${reward.zeroed ? styles.rewardGoldZero : ''}`}>
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
                {isExpanded && (
                  <div className={styles.detail}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>가격 기준</span>
                      <span className={styles.detailValue}>
                        <span className={`${styles.priceBadge} ${styles[`priceBadge_${getPriceTag(reward.name)}`]}`}>
                          {getPriceTagLabel(getPriceTag(reward.name))}
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

                    {/* 이 카드의 숫자가 어떻게 나왔는지 — 층마다 확정으로 받는 기본 보상 + 이 상자의 고유 보상.
                        0골드로 친 줄(어빌 제외·페온 제거)은 기본 보상 줄 없이 "0골드로 계산" 한 줄만 */}
                    {reward.zeroed ? (
                      <div className={styles.sumBox}>
                        <div className={`${styles.sumLine} ${styles.sumLineTotal}`}>
                          <span className={styles.sumName}>
                            {reward.name === '어빌리티스톤' && excludeAbilityStone ? '어빌 제외' : '페온 제거'} — 0골드로 계산 (뜨는 확률은 그대로)
                          </span>
                          <span className={styles.sumVal}>
                            <NextImage src="/gold.webp" alt="" width={17} height={17} />
                            0
                          </span>
                        </div>
                      </div>
                    ) : (
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
                          <RewardImages visual={visual} alt="" size="sum" />
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
                    )}
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
