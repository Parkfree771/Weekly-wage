'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { CombatPowerData, EngravingInfo, GemInfo } from '@/lib/combatPowerData';
import {
  getGradeColor,
  BRACELET_ALL_OPTIONS,
} from '@/lib/combatPowerData';
import {
  ARMOR_MATERIAL_COSTS,
  WEAPON_MATERIAL_COSTS,
  SUCCESSION_ARMOR_MATERIAL_COSTS,
  SUCCESSION_WEAPON_MATERIAL_COSTS,
  BASE_PROBABILITY,
  SUCCESSION_BASE_PROBABILITY,
  getBreathEffect,
  getSuccessionBreathEffect,
} from '@/lib/refiningData';
import { getAverageTries, getSuccessionAverageTries } from '@/lib/refiningSimulationData';
import { MATERIAL_BUNDLE_SIZES } from '@/data/raidRewards';
import styles from '@/app/spec/spec.module.css';

const MATERIAL_ITEM_ID: Record<string, string> = {
  '수호석': '66102106',
  '파괴석': '66102006',
  '돌파석': '66110225',
  '아비도스': '6861012',
  '운명파편': '66130143',
  '수호석결정': '66102107',
  '파괴석결정': '66102007',
  '위대한돌파석': '66110226',
  '상급아비도스': '6861013',
  '용암의 숨결': '66111131',
  '빙하의 숨결': '66111132',
};

const MATERIAL_ICON: Record<string, string> = {
  '수호석': '/destiny-guardian-stone5.webp',
  '파괴석': '/destiny-destruction-stone5.webp',
  '돌파석': '/destiny-breakthrough-stone5.webp',
  '아비도스': '/abidos-fusion5.webp?v=3',
  '운명파편': '/destiny-shard-bag-large5.webp',
  '수호석결정': '/top-destiny-guardian-stone5.webp',
  '파괴석결정': '/top-destiny-destruction-stone5.webp',
  '위대한돌파석': '/top-destiny-breakthrough-stone5.webp',
  '상급아비도스': '/top-abidos-fusion5.webp',
  '용암의 숨결': '/breath-lava5.webp',
  '빙하의 숨결': '/breath-glacier5.webp',
};

/* ─── 카르마 업그레이드 기대 골드 (900G / 확률) ─── */
const KARMA_UPGRADE_GOLD: Record<number, number> = {
  // Rank 1~5: 각 4단계 (20%, 15%, 10%, 7%)
  1: 4500, 2: 6000, 3: 9000, 4: 12857,
  5: 4500, 6: 6000, 7: 9000, 8: 12857,
  9: 4500, 10: 6000, 11: 9000, 12: 12857,
  13: 4500, 14: 6000, 15: 9000, 16: 12857,
  17: 4500, 18: 6000, 19: 9000, 20: 12857,
  // Rank 6: 4+5 = 9단계
  21: 4500, 22: 6000, 23: 9000, 24: 12857,
  25: 22500, 26: 45000, 27: 90000, 28: 180000, 29: 450000,
};

/* ─── 악세 교체 프리셋 ─── */
type AccPreset = {
  label: string;
  priceId: string;
  effects: Array<{ name: string; value: string; grade: '상' | '중' }>;
};
const ACC_SWAP_PRESETS: Record<string, AccPreset[]> = {
  '목걸이': [
    {
      label: '적주피 2.0% / 추피 1.6%',
      priceId: 'auction_necklace_ancient_refine3',
      effects: [
        { name: '적에게 주는 피해 증가', value: '2.0%', grade: '상' },
        { name: '추가 피해', value: '1.6%', grade: '중' },
      ],
    },
    {
      label: '적주피 2.0% / 추피 2.6%',
      priceId: 'auction_necklace_ancient_refine3_high',
      effects: [
        { name: '적에게 주는 피해 증가', value: '2.0%', grade: '상' },
        { name: '추가 피해', value: '2.6%', grade: '상' },
      ],
    },
  ],
  '귀걸이': [
    {
      label: '공격력 1.55% / 무공 1.80%',
      priceId: 'auction_earring_ancient_refine3',
      effects: [
        { name: '공격력 %', value: '1.55%', grade: '상' },
        { name: '무기 공격력 %', value: '1.80%', grade: '중' },
      ],
    },
    {
      label: '공격력 1.55% / 무공 3.0%',
      priceId: 'auction_earring_ancient_refine3_high',
      effects: [
        { name: '공격력 %', value: '1.55%', grade: '상' },
        { name: '무기 공격력 %', value: '3.0%', grade: '상' },
      ],
    },
  ],
  '반지': [
    {
      label: '치피 4.0% / 치적 0.95%',
      priceId: 'auction_ring_ancient_refine3',
      effects: [
        { name: '치명타 피해', value: '4.0%', grade: '상' },
        { name: '치명타 적중률', value: '0.95%', grade: '중' },
      ],
    },
    {
      label: '치피 4.0% / 치적 1.55%',
      priceId: 'auction_ring_ancient_refine3_high',
      effects: [
        { name: '치명타 피해', value: '4.0%', grade: '상' },
        { name: '치명타 적중률', value: '1.55%', grade: '상' },
      ],
    },
  ],
};

const ACC_SWAP_SUPPORT: Record<string, AccPreset[]> = {
  '목걸이': [
    {
      label: '',
      priceId: 'auction_necklace_support_refine3',
      effects: [
        { name: '낙인력', value: '8.0%', grade: '상' },
        { name: '아덴 획득량 증가', value: '3.6%', grade: '중' },
      ],
    },
    {
      label: '',
      priceId: 'auction_necklace_support_refine3_high',
      effects: [
        { name: '낙인력', value: '8.0%', grade: '상' },
        { name: '아덴 획득량 증가', value: '6.0%', grade: '상' },
      ],
    },
  ],
  '귀걸이': [
    {
      label: '',
      priceId: 'auction_earring_ancient_refine3',
      effects: [
        { name: '공격력 %', value: '1.55%', grade: '상' },
        { name: '무기 공격력 %', value: '1.80%', grade: '중' },
      ],
    },
    {
      label: '',
      priceId: 'auction_earring_ancient_refine3_high',
      effects: [
        { name: '공격력 %', value: '1.55%', grade: '상' },
        { name: '무기 공격력 %', value: '3.0%', grade: '상' },
      ],
    },
  ],
  '반지': [
    {
      label: '',
      priceId: 'auction_ring_support_refine3',
      effects: [
        { name: '아군 피해량 강화 효과', value: '7.5%', grade: '상' },
        { name: '아군 공격력 강화 효과', value: '3.0%', grade: '중' },
      ],
    },
    {
      label: '',
      priceId: 'auction_ring_support_refine3_high',
      effects: [
        { name: '아군 공격력 강화 효과', value: '5.0%', grade: '상' },
        { name: '아군 피해량 강화 효과', value: '7.5%', grade: '상' },
      ],
    },
  ],
};

/* ─── 유물 각인서 아이템 ID ─── */
const ENGRAVING_ITEM_ID: Record<string, string> = {
  '아드레날린': '65203905',
  '원한': '65200505',
  '돌격대장': '65203305',
  '예리한 둔기': '65201005',
  '질량 증가': '65203505',
  '저주받은 인형': '65202805',
  '기습의 대가': '65203005',
  '타격의 대가': '65203705',
  '각성': '65203405',
  '전문의': '65204105',
  '슈퍼차지': '65200605',
  '결투의 대가': '65201505',
};
const ENGRAVING_DEFAULT_PRICE = 3000;

/* ─── 보석 가격 ID ─── */
const GEM_PRICE_ID: Record<number, string> = {
  8: 'auction_gem_fear_8',
  9: 'auction_gem_fear_9',
  10: 'auction_gem_flame_10',
};

function getRankFromKarmaLevel(level: number): number {
  if (level <= 4) return 1;
  if (level <= 8) return 2;
  if (level <= 12) return 3;
  if (level <= 16) return 4;
  if (level <= 20) return 5;
  return 6;
}

type BraceletEditEffect = { id: string; grade: '하' | '중' | '상' };
type BraceletEditStat = { type: string; value: number };
type BraceletEditState = {
  stats: BraceletEditStat[];
  effects: BraceletEditEffect[];
};
type Props = { data: CombatPowerData };

function getQualityColor(q: number): string {
  if (q >= 100) return '#ff9800';
  if (q >= 90) return '#9c27b0';
  if (q >= 70) return '#2196f3';
  if (q >= 30) return '#4caf50';
  return '#9e9e9e';
}

function getEngLevelColor(level: number): string {
  if (level >= 4) return '#b45309';
  if (level >= 3) return '#ca8a04';
  if (level >= 2) return '#2563eb';
  if (level >= 1) return '#059669';
  return '#6b7280';
}

function gradeColor(grade: string): string {
  if (grade === '상') return 'var(--grade-high, #f59e0b)';
  if (grade === '중') return 'var(--grade-mid, #7c3aed)';
  if (grade === '하') return 'var(--grade-low, #2563eb)';
  return 'var(--text-secondary)';
}

function gradeColorRaw(grade: string): string {
  if (grade === '상') return '#f59e0b';
  if (grade === '중') return '#7c3aed';
  if (grade === '하') return '#2563eb';
  return '#6b7280';
}

function gradeColorBg(grade: string): string {
  if (grade === '상') return 'rgba(245,158,11,0.12)';
  if (grade === '중') return 'rgba(124,58,237,0.12)';
  if (grade === '하') return 'rgba(37,99,235,0.12)';
  return 'transparent';
}

function shortenEquipName(name: string, type: string): string {
  return name.replace(new RegExp(`\\s*${type}\\s*$`), '').trim() || name;
}

const braceletAllOptions = BRACELET_ALL_OPTIONS;

/* ─── 등급 세그먼트 토글 ─── */
function GradeToggle({ value, onChange }: { value: string; onChange: (g: '하' | '중' | '상') => void }) {
  const grades: ('하' | '중' | '상')[] = ['하', '중', '상'];
  return (
    <div className={styles.gradeToggle}>
      {grades.map(g => (
        <button key={g}
          className={`${styles.gradeBtn} ${value === g ? styles.gradeBtnActive : ''}`}
          style={value === g ? { color: gradeColorRaw(g), background: gradeColorBg(g) } : {}}
          onClick={() => onChange(g)}
        >{g}</button>
      ))}
    </div>
  );
}

/* ─── 서브 컴포넌트 ─── */
function GrindingEffect({ text, grade }: { text: string; grade: string }) {
  const m = text.match(/^(.+?)\s*([\+\-]?\s*[\d,]+\.?\d*\s*%?)$/);
  if (m) {
    return (
      <span className={styles.effectLine}>
        <span className={styles.effectLabel}>{m[1]} </span>
        <span className={styles.effectVal} style={{ color: gradeColor(grade) }}>{m[2]}</span>
      </span>
    );
  }
  return <span className={styles.effectLine}>{text}</span>;
}

function BraceletEffectLine({ text, grade }: { text: string; grade?: string }) {
  if (!grade) return <span className={styles.braceletEffText}>{text}</span>;
  const sentences = text.split(/(?<=다\.)\s+/);
  return (
    <span className={styles.braceletEffText}>
      {sentences.map((sentence, si) => (
        <span key={si}>
          {si > 0 && <br />}
          {sentence.split(/([\d,]+\.?\d*\s*%?)/g).map((part, i) =>
            /^[\d,]+\.?\d*\s*%?$/.test(part)
              ? <span key={i} style={{ color: gradeColor(grade), fontWeight: 800 }}>{part}</span>
              : part
          )}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════ */
export default function SpecUpDashboard({ data }: Props) {
  const { profile, combatStats } = data;

  // 힘/민/지 중 해당 캐릭의 주 스탯만 표시하도록 필터
  const filterStatsByMain = useCallback((stats: string[]) => {
    return stats.filter(s => {
      const m = s.match(/^(힘|민첩|지능)/);
      return !m || m[1] === profile.mainStatType;
    });
  }, [profile.mainStatType]);

  const [gemOverrides, setGemOverrides] = useState<Record<number, number>>({});
  const [engOverrides, setEngOverrides] = useState<Record<number, number>>({});
  const [enhanceOverrides, setEnhanceOverrides] = useState<Record<number, number>>({});
  const [stoneOverrides, setStoneOverrides] = useState<Record<number, number>>({});
  const [braceletEdit, setBraceletEdit] = useState<BraceletEditState | null>(null);
  const [accSwaps, setAccSwaps] = useState<Record<number, number>>({}); // idx → preset index
  const [accSupportMode, setAccSupportMode] = useState<Record<number, boolean>>({}); // idx → is support
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [boundMaterials, setBoundMaterials] = useState<Record<string, boolean>>({});
  const [useBreath, setUseBreath] = useState(false);
  const [karmaOverrides, setKarmaOverrides] = useState<Record<string, number>>({});

  // 카르마 골드 계산
  const karmaGoldTotal = useMemo(() => {
    let total = 0;
    if (!data.arkPassive?.karma) return 0;
    for (const [type, targetLevel] of Object.entries(karmaOverrides)) {
      const karmaInfo = data.arkPassive.karma[type as keyof typeof data.arkPassive.karma];
      if (!karmaInfo || targetLevel <= karmaInfo.level) continue;
      for (let lv = karmaInfo.level; lv < targetLevel; lv++) {
        total += KARMA_UPGRADE_GOLD[lv] || 0;
      }
    }
    return Math.round(total);
  }, [karmaOverrides, data.arkPassive]);

  // 각인서 골드 계산 (개별)
  const engGoldItems = useMemo(() => {
    const items: Array<{ name: string; icon?: string; books: number; unitPrice: number; totalGold: number }> = [];
    for (const [idxStr, targetLv] of Object.entries(engOverrides)) {
      const eng = data.engravings[Number(idxStr)];
      if (!eng || targetLv <= eng.level) continue;
      const books = (targetLv - eng.level) * 5;
      const itemId = ENGRAVING_ITEM_ID[eng.name];
      const bundleSize = itemId ? (MATERIAL_BUNDLE_SIZES[Number(itemId)] || 1) : 1;
      const rawPrice = itemId ? ((marketPrices[itemId] || 0) / bundleSize) : 0;
      const unitPrice = rawPrice > 0 ? rawPrice : ENGRAVING_DEFAULT_PRICE;
      items.push({ name: eng.name, icon: eng.icon, books, unitPrice, totalGold: Math.round(books * unitPrice) });
    }
    return items;
  }, [engOverrides, data.engravings, marketPrices]);
  const engGoldTotal = useMemo(() => engGoldItems.reduce((s, e) => s + e.totalGold, 0), [engGoldItems]);

  // 보석 골드 계산 (개별)
  const gemGoldItems = useMemo(() => {
    const items: Array<{ name: string; icon?: string; level: number; price: number }> = [];
    for (const [idxStr, targetLv] of Object.entries(gemOverrides)) {
      const gem = data.gems[Number(idxStr)];
      if (!gem || targetLv <= gem.level) continue;
      const priceId = GEM_PRICE_ID[targetLv];
      if (!priceId) continue;
      const price = Math.round(marketPrices[priceId] || 0);
      items.push({ name: gem.skillName || `${gem.type}`, icon: gem.icon, level: targetLv, price });
    }
    return items;
  }, [gemOverrides, data.gems, marketPrices]);
  const gemGoldTotal = useMemo(() => gemGoldItems.reduce((s, g) => s + g.price, 0), [gemGoldItems]);

  // 악세 교체 골드 계산
  const accGoldTotal = useMemo(() => {
    let total = 0;
    for (const [idxStr, presetIdx] of Object.entries(accSwaps)) {
      const idx = Number(idxStr);
      const acc = data.accessoryItems[idx];
      if (!acc) continue;
      const isSup = accSupportMode[idx] || false;
      const presets = isSup ? ACC_SWAP_SUPPORT[acc.type] : ACC_SWAP_PRESETS[acc.type];
      if (!presets?.[presetIdx]) continue;
      const price = marketPrices[presets[presetIdx].priceId] || 0;
      total += price;
    }
    return Math.round(total);
  }, [accSwaps, accSupportMode, data.accessoryItems, marketPrices]);

  // 시세 fetch
  useEffect(() => {
    (async () => {
      try {
        const { fetchPriceData } = await import('@/lib/price-history-client');
        const { latest } = await fetchPriceData();
        const prices: Record<string, number> = {};
        Object.entries(latest).forEach(([itemId, bundlePrice]) => {
          const bundleSize = MATERIAL_BUNDLE_SIZES[Number(itemId)] || 1;
          prices[itemId] = (bundlePrice as number) / bundleSize;
        });
        setMarketPrices(prices);
      } catch (e) {
        console.error('Failed to fetch prices:', e);
      }
    })();
  }, []);

  // 강화 재료 합산
  const materialSummary = useMemo(() => {
    const totals: Record<string, number> = {};
    let directGold = 0;

    for (const [idxStr, targetLevel] of Object.entries(enhanceOverrides)) {
      const idx = Number(idxStr);
      const eq = data.equipmentItems[idx];
      if (!eq || targetLevel <= eq.enhanceLevel) continue;

      const isWeapon = eq.type === '무기';
      const isSuccession = eq.name.includes('전율');

      for (let level = eq.enhanceLevel + 1; level <= targetLevel; level++) {
        const avgTries = isSuccession
          ? getSuccessionAverageTries(level - 1, useBreath)
          : getAverageTries(level - 1, useBreath, false);
        if (avgTries <= 0) continue;

        let costEntry: Record<string, number> | undefined;
        if (isSuccession) {
          costEntry = isWeapon
            ? SUCCESSION_WEAPON_MATERIAL_COSTS[level]
            : SUCCESSION_ARMOR_MATERIAL_COSTS[level];
        } else {
          costEntry = isWeapon
            ? WEAPON_MATERIAL_COSTS[level]
            : ARMOR_MATERIAL_COSTS[level];
        }
        if (!costEntry) continue;

        for (const [matName, perTry] of Object.entries(costEntry)) {
          if (matName === '실링') continue;
          if (matName === '골드') {
            directGold += perTry * avgTries;
          } else {
            totals[matName] = (totals[matName] || 0) + perTry * avgTries;
          }
        }

        // 숨결 사용 시 숨결 재료 추가
        if (useBreath) {
          const baseProb = isSuccession
            ? SUCCESSION_BASE_PROBABILITY[level - 1]
            : BASE_PROBABILITY[level - 1];
          if (baseProb) {
            const breathEffect = isSuccession
              ? getSuccessionBreathEffect(baseProb)
              : getBreathEffect(baseProb);
            if (breathEffect.max > 0) {
              const breathName = isWeapon ? '용암의 숨결' : '빙하의 숨결';
              totals[breathName] = (totals[breathName] || 0) + breathEffect.max * avgTries;
            }
          }
        }
      }
    }
    return { totals, directGold };
  }, [enhanceOverrides, data.equipmentItems, useBreath]);

  // 골드 계산
  const costBreakdown = useMemo(() => {
    const items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      totalGold: number;
    }> = [];

    for (const [matName, quantity] of Object.entries(materialSummary.totals)) {
      const itemId = MATERIAL_ITEM_ID[matName];
      if (!itemId) continue;
      const unitPrice = marketPrices[itemId] || 0;
      const qty = Math.ceil(quantity);
      items.push({
        name: matName,
        quantity: qty,
        unitPrice,
        totalGold: Math.round(qty * unitPrice),
      });
    }

    let materialGold = 0;
    for (const item of items) {
      if (!boundMaterials[item.name]) {
        materialGold += item.totalGold;
      }
    }

    const dGold = Math.round(materialSummary.directGold);
    const enhanceGold = materialGold + dGold;
    return { items, enhanceGold, totalGold: enhanceGold + karmaGoldTotal + accGoldTotal + engGoldTotal + gemGoldTotal, directGold: dGold };
  }, [materialSummary, marketPrices, boundMaterials, karmaGoldTotal, accGoldTotal, engGoldTotal, gemGoldTotal]);

  const initBraceletEdit = useCallback(() => {
    const stats: BraceletEditStat[] = [];
    if (data.braceletItem?.stats) {
      for (const s of data.braceletItem.stats) {
        const m = s.match(/^(특화|치명|신속|제압|인내|숙련|힘|민첩|지능)\s*\+\s*([\d,]+)/);
        if (!m) continue;
        if (['힘', '민첩', '지능'].includes(m[1]) && m[1] !== profile.mainStatType) continue;
        stats.push({ type: m[1], value: parseInt(m[2].replace(/,/g, '')) });
      }
    }
    const effects: BraceletEditEffect[] = data.bracelet.map(e => ({
      id: e.id, grade: (e.grade as '하' | '중' | '상') || '하',
    }));
    setBraceletEdit({ stats, effects });
  }, [data]);


  const handleEnhance = (i: number, delta: number) => {
    const eq = data.equipmentItems[i];
    if (!eq) return;
    const current = enhanceOverrides[i] ?? eq.enhanceLevel;
    const next = Math.max(0, Math.min(25, current + delta));
    setEnhanceOverrides(prev => {
      const n = { ...prev };
      if (next === eq.enhanceLevel) delete n[i]; else n[i] = next;
      return n;
    });
  };

  const braceletKeywords = data.braceletItem?.keywords || [];

  const gems = data.gems;
  const gemSlots: (GemInfo | null)[] = Array.from({ length: 11 }, (_, i) => gems[i] || null);

  const engSlots: (EngravingInfo | null)[] = [];
  for (let i = 0; i < 5; i++) engSlots.push(data.engravings[i] || null);

  const renderGemCell = (gem: GemInfo | null, idx: number) => {
    if (!gem) return <div key={`empty-${idx}`} className={styles.gemCellEmpty} />;
    const isAtk = gem.type === '멸화' || gem.type === '겁화';
    const gc = isAtk ? '#ef4444' : '#3b82f6';
    const ov = gemOverrides[idx];
    const changed = ov !== undefined && ov !== gem.level;
    return (
      <div key={idx} className={styles.gemCell}>
        <div className={styles.gemCellIconWrap} style={{ boxShadow: `0 2px 8px ${gc}30` }}>
          {gem.icon && <img src={gem.icon} alt={gem.type} className={styles.gemCellImg} style={{ borderColor: gc }} />}
          <span className={styles.gemCellLv} style={{ background: gc }}>{gem.level}</span>
        </div>
        <div className={styles.gemCellSkill}>{gem.skillName}</div>
        <div className={styles.gemCellFoot}>
          <select className={styles.gemCellSel} value={ov ?? gem.level}
            style={changed ? { borderColor: '#8b5cf6', boxShadow: '0 0 0 2px rgba(139,92,246,0.12)' } : {}}
            onChange={(e) => {
              const v = Number(e.target.value);
              setGemOverrides(prev => {
                const next = { ...prev };
                if (v === gem.level) delete next[idx]; else next[idx] = v;
                return next;
              });
            }}>
            {[8, 9, 10].filter(lv => lv >= gem.level).map(lv => (
              <option key={lv} value={lv}>Lv.{lv}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={styles.mainLayout}>
        <aside className={styles.profileCol}>
          <div className={styles.profileCard}>
            <div className={styles.profileImgWrap}>
              {profile.characterImage
                ? <img src={profile.characterImage} alt={profile.characterName} className={styles.profileImg} />
                : <div className={styles.profileImgEmpty}>?</div>}
            </div>
            <div className={styles.profileBody}>
              <h2 className={styles.profileName}>{profile.characterName}</h2>
              {profile.title && <div className={styles.profileTitle}>{profile.title}</div>}
              <div className={styles.profileTags}>
                <span className={styles.profileTag}>{profile.className}</span>
                {profile.serverName && <span className={styles.profileTag}>{profile.serverName}</span>}
                {profile.guildName && <span className={styles.profileTag}>{profile.guildName}</span>}
              </div>
              <div className={styles.profileStats}>
                <div className={styles.pStat}><span className={styles.pStatLabel}>아이템</span><span className={styles.pStatHL}>{profile.itemLevel.toLocaleString()}</span></div>
                <div className={styles.pStat}><span className={styles.pStatLabel}>원정대</span><span className={styles.pStatVal}>{profile.expeditionLevel || '-'}</span></div>
                <div className={styles.pStat}><span className={styles.pStatLabel}>치명</span><span className={styles.pStatVal}>{combatStats.crit}</span></div>
                <div className={styles.pStat}><span className={styles.pStatLabel}>특화</span><span className={styles.pStatVal}>{combatStats.specialization}</span></div>
                <div className={styles.pStat}><span className={styles.pStatLabel}>신속</span><span className={styles.pStatVal}>{combatStats.swiftness}</span></div>
                <div className={styles.pStat}><span className={styles.pStatLabel}>공격력</span><span className={styles.pStatVal}>{profile.attackPower > 0 ? profile.attackPower.toLocaleString() : '-'}</span></div>
                <div className={styles.pStat}><span className={styles.pStatLabel}>전투력</span><span className={styles.pStatHL}>{profile.combatPower > 0 ? profile.combatPower.toLocaleString() : '-'}</span></div>
              </div>
            </div>
          </div>

          {/* ══ 강화 비용 ══ */}
          {costBreakdown.items.length > 0 && (
            <div className={styles.costSummary}>
              <div className={styles.costSummaryHead}>
                <h4 className={styles.costSummaryTitle}>강화</h4>
                <div className={styles.breathToggle}>
                  <button
                    className={`${styles.breathBtn} ${!useBreath ? styles.breathBtnActive : ''}`}
                    onClick={() => setUseBreath(false)}
                  >숨결 미사용</button>
                  <button
                    className={`${styles.breathBtn} ${useBreath ? styles.breathBtnActive : ''}`}
                    onClick={() => setUseBreath(true)}
                  >숨결 사용</button>
                </div>
              </div>
              <div className={styles.costSummaryBody}>
                {costBreakdown.items.map((item) => (
                  <div key={item.name} className={styles.costRow}>
                    <label className={styles.costCheckLabel}>
                      <input
                        type="checkbox"
                        checked={!boundMaterials[item.name]}
                        onChange={() => setBoundMaterials(prev => ({
                          ...prev, [item.name]: !prev[item.name]
                        }))}
                      />
                      {MATERIAL_ICON[item.name] && (
                        <img src={MATERIAL_ICON[item.name]} alt={item.name} title={item.name} className={styles.costMatIcon} />
                      )}
                    </label>
                    <span className={styles.costQty}>{item.quantity.toLocaleString()}</span>
                    <span className={styles.costMul}>×</span>
                    <span className={styles.costUnit}>{item.unitPrice > 0 ? item.unitPrice.toFixed(1) : '-'}</span>
                    <span className={styles.costEq}>=</span>
                    <span className={styles.costGold} style={boundMaterials[item.name] ? { opacity: 0.3, textDecoration: 'line-through' } : {}}>
                      {item.totalGold.toLocaleString()}G
                    </span>
                  </div>
                ))}
                {costBreakdown.directGold > 0 && (
                  <div className={styles.costRow}>
                    <span className={styles.costCheckLabel}>
                      <span style={{ width: 13 }} />
                      <img src="/gold.webp" alt="골드" className={styles.costMatIcon} />
                    </span>
                    <span className={styles.costGold} style={{ marginLeft: 'auto' }}>
                      {costBreakdown.directGold.toLocaleString()}G
                    </span>
                  </div>
                )}
                <div className={styles.costSubtotalRow}>
                  <span>강화 소계</span>
                  <span className={styles.costSubtotalVal}>{costBreakdown.enhanceGold.toLocaleString()}G</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ 각인서 비용 ══ */}
          {engGoldItems.length > 0 && (
            <div className={styles.costSummary}>
              <div className={styles.costSummaryHead}>
                <h4 className={styles.costSummaryTitle}>각인서</h4>
              </div>
              <div className={styles.costSummaryBody}>
                {engGoldItems.map((ei) => (
                  <div key={ei.name} className={styles.costRowCompact}>
                    <img src="/engraving.webp" alt={ei.name} className={styles.costMatIcon} />
                    <span className={styles.costEngName}>{ei.name}</span>
                    <span className={styles.costQty}>{ei.books}</span>
                    <span className={styles.costMul}>×</span>
                    <span className={styles.costUnit}>{ei.unitPrice.toLocaleString()}</span>
                    <span className={styles.costEq}>=</span>
                    <span className={styles.costGold}>{ei.totalGold.toLocaleString()}G</span>
                  </div>
                ))}
                <div className={styles.costSubtotalRow}>
                  <span>각인서 소계</span>
                  <span className={styles.costSubtotalVal}>{engGoldTotal.toLocaleString()}G</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ 보석 비용 ══ */}
          {gemGoldItems.length > 0 && (
            <div className={styles.costSummary}>
              <div className={styles.costSummaryHead}>
                <h4 className={styles.costSummaryTitle}>보석</h4>
              </div>
              <div className={styles.costSummaryBody}>
                {gemGoldItems.map((gi, idx) => (
                  <div key={idx} className={styles.costRowCompact}>
                    {gi.icon && <img src={gi.icon} alt={gi.name} className={styles.costMatIcon} />}
                    <span className={styles.costEngName}>{gi.level === 10 ? '작열' : '겁화'}{gi.level}</span>
                    <span className={styles.costGold} style={{ marginLeft: 'auto' }}>
                      {gi.price.toLocaleString()}G
                    </span>
                  </div>
                ))}
                <div className={styles.costSubtotalRow}>
                  <span>보석 소계</span>
                  <span className={styles.costSubtotalVal}>{gemGoldTotal.toLocaleString()}G</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ 카르마 비용 ══ */}
          {karmaGoldTotal > 0 && (
            <div className={styles.costSummary}>
              <div className={styles.costSummaryHead}>
                <h4 className={styles.costSummaryTitle}>카르마</h4>
              </div>
              <div className={styles.costSummaryBody}>
                <div className={styles.costRowCompact}>
                  <img src="/dnsauddmlehf.webp" alt="카르마" className={styles.costMatIcon} />
                  <span className={styles.costEngName}>카르마 강화</span>
                  <span className={styles.costGold} style={{ marginLeft: 'auto' }}>
                    {karmaGoldTotal.toLocaleString()}G
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══ 악세서리 비용 ══ */}
          {accGoldTotal > 0 && (
            <div className={styles.costSummary}>
              <div className={styles.costSummaryHead}>
                <h4 className={styles.costSummaryTitle}>악세서리</h4>
              </div>
              <div className={styles.costSummaryBody}>
                {Object.entries(accSwaps).map(([idxStr, presetIdx]) => {
                  const idx = Number(idxStr);
                  const acc = data.accessoryItems[idx];
                  if (!acc) return null;
                  const isSup = accSupportMode[idx] || false;
                  const preset = (isSup ? ACC_SWAP_SUPPORT : ACC_SWAP_PRESETS)[acc.type]?.[presetIdx];
                  if (!preset) return null;
                  const price = Math.round(marketPrices[preset.priceId] || 0);
                  return (
                    <div key={idxStr} className={styles.costRowCompact}>
                      {acc.icon && <img src={acc.icon} alt={acc.type} className={styles.costMatIcon} />}
                      <span className={styles.costEngName}>
                        {acc.type}{' '}
                        {preset.effects.map((eff, ei) => (
                          <span key={ei} style={{ color: gradeColorRaw(eff.grade) }}>({eff.grade})</span>
                        ))}
                      </span>
                      <span className={styles.costGold} style={{ marginLeft: 'auto' }}>
                        {price.toLocaleString()}G
                      </span>
                    </div>
                  );
                })}
                <div className={styles.costSubtotalRow}>
                  <span>악세 소계</span>
                  <span className={styles.costSubtotalVal}>{accGoldTotal.toLocaleString()}G</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ 총 합계 ══ */}
          {(costBreakdown.items.length > 0 || engGoldTotal > 0 || gemGoldTotal > 0 || karmaGoldTotal > 0 || accGoldTotal > 0) && (
            <div className={styles.costGrandTotal}>
              <span>총 골드</span>
              <span className={styles.costGrandTotalVal}>
                {costBreakdown.totalGold.toLocaleString()}G
              </span>
            </div>
          )}
        </aside>

        <div className={styles.specCol}>
          {/* ══ 장비 + 악세 ══ */}
          <section className={styles.card}>
            <div className={styles.cardHead}><h3 className={styles.cardTitle}>장비 / 악세서리</h3></div>
            <div className={styles.cardBody}>
              <div className={styles.equipAccGrid}>
                <div className={styles.leftCol}>
                  <div className={styles.colLabel}>장비</div>
                  {data.equipmentItems.map((eq, i) => {
                    const ov = enhanceOverrides[i];
                    const enhLv = ov ?? eq.enhanceLevel;
                    const nameOnly = eq.name.replace(/^\+\d+\s*/, '');
                    const isWeapon = eq.type === '무기';
                    return (
                      <div key={i} className={styles.itemRow}>
                        {eq.icon && (
                          eq.name.includes('전율') ? (
                            <div style={{ position: 'relative', flexShrink: 0, width: 56, height: 56 }}>
                              <img src={eq.icon} alt={eq.type} style={{ width: 46, height: 46, borderRadius: 6, objectFit: 'cover', position: 'absolute', top: 5, left: 5 }} />
                              <img src="/wjsdbf3.webp" alt="" style={{ position: 'absolute', top: -2, left: 1, width: 60, height: 60, pointerEvents: 'none' }} />
                            </div>
                          ) : (
                            <img src={eq.icon} alt={eq.type} className={styles.itemIcon} style={{ borderColor: getGradeColor(eq.grade) }} />
                          )
                        )}
                        <div className={styles.itemBody}>
                          <div className={styles.itemNameRow}>
                            <span className={`${styles.enhBadge} ${isWeapon ? styles.enhBadgeWeapon : styles.enhBadgeArmor}`}>+{enhLv}</span>
                            <span className={styles.itemName} style={{ color: getGradeColor(eq.grade) }}>{nameOnly}</span>
                            {eq.transcendence > 0 && <span className={styles.tag}>초월 {eq.transcendence}</span>}
                          </div>
                          <div className={styles.qualRow}>
                            <div className={styles.qualTrack}><div className={styles.qualFill} style={{ width: `${eq.quality}%`, background: getQualityColor(eq.quality) }} /></div>
                            <span className={styles.qualNum} style={{ color: getQualityColor(eq.quality) }}>{eq.quality}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <div className={styles.enhStepper}>
                            <button className={styles.enhBtn} onClick={() => handleEnhance(i, -1)} disabled={enhLv <= 0}>
                              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            </button>
                            <span className={styles.enhVal} style={ov !== undefined ? { color: '#8b5cf6' } : {}}>+{enhLv}</span>
                            <button className={styles.enhBtn} onClick={() => handleEnhance(i, 1)} disabled={enhLv >= 25}>
                              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 각인 + 어빌리티 스톤 원형 */}
                  {(engSlots.some(e => e) || data.abilityStone) && (
                    <>
                      <div className={styles.subDivider}><span>각인 / 스톤</span></div>
                      <div className={styles.engCircleWrap}>
                        <div className={styles.engCircleBg}>
                          <svg viewBox="0 0 280 280" className={styles.engCircleSvg}>
                            {(() => {
                              const c = 140;
                              const pent = (r: number) => Array.from({ length: 5 }, (_, i) => {
                                const rad = ((i / 5) * 360 - 90) * Math.PI / 180;
                                return `${c + r * Math.cos(rad)},${c + r * Math.sin(rad)}`;
                              }).join(' ');
                              return (
                                <>
                                  <polygon points={pent(58)} fill="var(--card-body-bg-stone)" stroke="var(--border-color)" strokeWidth="1" strokeLinejoin="round" />
                                  <polygon points={pent(90)} fill="none" stroke="var(--border-color)" strokeWidth="1" strokeLinejoin="round" opacity="0.5" />
                                </>
                              );
                            })()}

                            {engSlots.map((eng, i) => {
                              if (!eng) return null;
                              const angle = (i / 5) * 360 - 90;
                              const rad = (angle * Math.PI) / 180;
                              const stoneEng = data.abilityStone?.engravings.find(se => se.name === eng.name);
                              return (
                                <line key={`line-${i}`}
                                  x1={140 + 18 * Math.cos(rad)} y1={140 + 18 * Math.sin(rad)}
                                  x2={140 + 90 * Math.cos(rad)} y2={140 + 90 * Math.sin(rad)}
                                  stroke={stoneEng ? '#38bdf8' : 'var(--border-color)'}
                                  strokeWidth={stoneEng ? '1.5' : '1'}
                                  opacity={stoneEng ? '0.7' : '0.25'}
                                />
                              );
                            })}

                            {data.abilityStone && (
                              <circle cx="140" cy="140" r="18" fill="var(--card-bg)" stroke={getGradeColor(data.abilityStone.grade)} strokeWidth="2" />
                            )}
                          </svg>

                          {data.abilityStone?.icon && (
                            <div className={styles.engCircleCenter}>
                              <img src={data.abilityStone.icon} alt="스톤" className={styles.engStoneIcon} style={{ borderColor: getGradeColor(data.abilityStone.grade) }} />
                            </div>
                          )}

                          {engSlots.map((eng, i) => {
                            if (!eng) return null;
                            const ov = engOverrides[i];
                            const currentLv = ov ?? eng.level;
                            const angle = (i / 5) * 360 - 90;
                            const rad = (angle * Math.PI) / 180;
                            const stoneEng = data.abilityStone?.engravings.find(se => se.name === eng.name);
                            const stoneEngIdx = stoneEng ? data.abilityStone!.engravings.indexOf(stoneEng) : -1;
                            const stoneLv = stoneEngIdx >= 0 ? (stoneOverrides[stoneEngIdx] ?? eng.abilityStoneLevel) : 0;
                            return (
                              <div key={i} className={styles.engCircleControls} style={{ '--eng-x': `${50 + 39 * Math.cos(rad)}%`, '--eng-y': `${50 + 39 * Math.sin(rad)}%` } as React.CSSProperties}>
                                <span className={styles.engCircleName}>{eng.name}</span>
                                <div className={styles.engCircleDiamonds}>
                                  {[1, 2, 3, 4].map(lv => (
                                    <button key={lv} className={styles.engDiamond}
                                      style={{ color: lv <= currentLv ? '#f43c06' : '#4b5563' }}
                                      onClick={() => setEngOverrides(prev => {
                                        const next = { ...prev };
                                        const newLv = lv === currentLv ? lv - 1 : lv;
                                        if (newLv === eng.level) delete next[i]; else next[i] = newLv;
                                        return next;
                                      })}
                                    >◆</button>
                                  ))}
                                </div>
                                {stoneEng && (
                                  <div className={styles.engStoneLvStepper}>
                                    <button className={styles.engStoneLvBtn} disabled={stoneLv <= 0}
                                      onClick={() => setStoneOverrides(prev => {
                                        const next = { ...prev };
                                        const nv = stoneLv - 1;
                                        if (nv === eng.abilityStoneLevel) delete next[stoneEngIdx]; else next[stoneEngIdx] = nv;
                                        return next;
                                      })}>−</button>
                                    <span className={styles.engStoneLvVal}>Lv.{stoneLv}</span>
                                    <button className={styles.engStoneLvBtn} disabled={stoneLv >= 4}
                                      onClick={() => setStoneOverrides(prev => {
                                        const next = { ...prev };
                                        const nv = stoneLv + 1;
                                        if (nv === eng.abilityStoneLevel) delete next[stoneEngIdx]; else next[stoneEngIdx] = nv;
                                        return next;
                                      })}>+</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    </>
                  )}
                </div>

                <div className={styles.colDivider} />

                {/* ── 오른쪽: 악세 + 팔찌 ── */}
                <div className={styles.rightCol}>
                  <div className={styles.colLabel}>악세서리</div>
                  {data.accessoryItems.map((acc, i) => {
                    const isSupportMode = accSupportMode[i] || false;
                    const presets = isSupportMode ? ACC_SWAP_SUPPORT[acc.type] : ACC_SWAP_PRESETS[acc.type];
                    const swapIdx = accSwaps[i];
                    const isSwapped = swapIdx !== undefined;
                    const selectedPreset = isSwapped ? presets?.[swapIdx] : null;
                    const swapPrice = selectedPreset ? (marketPrices[selectedPreset.priceId] || 0) : 0;
                    return (
                      <div key={i} className={styles.itemRow}>
                        {acc.icon && <img src={acc.icon} alt={acc.type} className={styles.itemIcon} style={{ borderColor: getGradeColor(acc.grade) }} />}
                        <div className={styles.itemBody}>
                          <div className={styles.itemNameRow}>
                            <span className={styles.itemName} style={{ color: getGradeColor(acc.grade) }}>{acc.type}</span>
                            {acc.quality > 0 && <span className={styles.qualBadge} style={{ color: getQualityColor(acc.quality) }}>{acc.quality}</span>}
                            {presets && (
                              <button className={styles.braceletSwapBtn}
                                onClick={() => isSwapped
                                  ? (setAccSwaps(prev => { const n = { ...prev }; delete n[i]; return n; }), setAccSupportMode(prev => { const n = { ...prev }; delete n[i]; return n; }))
                                  : setAccSwaps(prev => ({ ...prev, [i]: 0 }))
                                }>
                                {isSwapped ? '원래대로' : '악세 교체'}
                              </button>
                            )}
                          </div>

                          <div className={isSwapped ? styles.accCompareLayout : undefined}>
                            <div className={styles.effectsCol} style={isSwapped ? { opacity: 0.4 } : {}}>
                              {filterStatsByMain(acc.stats).map((s, j) => <div key={`s${j}`} className={styles.statLine}>{s}</div>)}
                              {acc.grindingEffects.map((eff, j) => (
                                <div key={`g${j}`} className={styles.statLine} style={isSwapped ? { textDecoration: 'line-through' } : {}}>
                                  <GrindingEffect text={eff.text} grade={eff.grade} />
                                </div>
                              ))}
                            </div>
                            {isSwapped && (
                              <div className={styles.accSwapRight}>
                                <div className={styles.accModeToggle}>
                                  <button className={`${styles.accModeBtn} ${!isSupportMode ? styles.accModeBtnActive : ''}`}
                                    onClick={() => { setAccSupportMode(prev => ({ ...prev, [i]: false })); setAccSwaps(prev => ({ ...prev, [i]: 0 })); }}>
                                    딜러
                                  </button>
                                  <button className={`${styles.accModeBtn} ${isSupportMode ? styles.accModeBtnActive : ''}`}
                                    style={isSupportMode ? { borderColor: '#3b82f6', color: '#3b82f6' } : {}}
                                    onClick={() => { setAccSupportMode(prev => ({ ...prev, [i]: true })); setAccSwaps(prev => ({ ...prev, [i]: 0 })); }}>
                                    서포터
                                  </button>
                                </div>
                                <div className={styles.accPresetBtns}>
                                  {presets!.map((preset, pi) => (
                                    <button key={pi}
                                      className={`${styles.accPresetBtn} ${swapIdx === pi ? styles.accPresetBtnActive : ''}`}
                                      onClick={() => setAccSwaps(prev => ({ ...prev, [i]: pi }))}
                                    >
                                      {preset.effects.map((eff, ei) => {
                                        const short: Record<string, string> = {
                                          '적에게 주는 피해 증가': '적주피',
                                          '추가 피해': '추피',
                                          '공격력 %': '공격력',
                                          '무기 공격력 %': '무공',
                                          '치명타 피해': '치피',
                                          '치명타 적중률': '치적',
                                          '낙인력': '낙인력',
                                          '아덴 획득량 증가': '아덴',
                                          '아군 피해량 강화 효과': '아피강',
                                          '아군 공격력 강화 효과': '아공강',
                                        };
                                        return (
                                          <div key={ei} style={{ color: gradeColorRaw(eff.grade) }}>
                                            {short[eff.name] || eff.name} {eff.value}<span style={{ fontSize: '0.55rem' }}>({eff.grade})</span>
                                          </div>
                                        );
                                      })}
                                    </button>
                                  ))}
                                </div>
                                {selectedPreset && (
                                  <>
                                    <div className={styles.accSwapEffects}>
                                      {selectedPreset.effects.map((eff, j) => (
                                        <div key={j} className={styles.statLine}>
                                          <span className={styles.effectLine}>
                                            <span className={styles.effectLabel}>{eff.name} </span>
                                            <span className={styles.effectVal} style={{ color: gradeColor(eff.grade) }}>{eff.value}</span>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className={styles.accPresetMeta}>
                                      <span className={styles.accPresetQual}>품질 70↑ · 3단계</span>
                                      {swapPrice > 0 && (
                                        <span className={styles.accPresetPrice}>
                                          <img src="/gold.webp" alt="골드" style={{ width: 13, height: 13 }} />
                                          {Math.round(swapPrice).toLocaleString()}G
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 팔찌 */}
                  {data.braceletItem && <div className={styles.subDivider}><span>팔찌</span></div>}
                  {data.braceletItem && (
                    <div className={styles.braceletBlock}>
                      {data.braceletItem.icon && <img src={data.braceletItem.icon} alt="팔찌" className={styles.itemIcon} style={{ borderColor: getGradeColor(data.braceletItem.grade) }} />}
                      <div className={styles.itemBody}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName} style={{ color: getGradeColor(data.braceletItem.grade) }}>팔찌</span>
                          {braceletKeywords.length > 0 && (
                            <div className={styles.braceletKeywords}>
                              {braceletKeywords.map((kw, j) => <span key={j} className={styles.braceletKw}>{kw}</span>)}
                            </div>
                          )}
                          <button
                            className={styles.braceletSwapBtn}
                            onClick={() => braceletEdit ? setBraceletEdit(null) : initBraceletEdit()}
                          >
                            {braceletEdit ? '원래대로' : '팔찌 교체'}
                          </button>
                        </div>

                        {!braceletEdit ? (
                          <div className={styles.effectsCol}>
                            {filterStatsByMain(data.braceletItem.stats).map((s, j) => <div key={`s${j}`} className={styles.statLine}>{s}</div>)}
                            {data.bracelet.map((eff, i) => (
                              <div key={`b${i}`} className={styles.statLine}><BraceletEffectLine text={eff.name} grade={eff.grade} /></div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.effectsCol}>
                            {braceletEdit.stats.map((stat, i) => {
                              const isMainStat = ['힘', '민첩', '지능'].includes(stat.type);
                              return (
                                <div key={`bs${i}`} className={styles.braceletSimRow}>
                                  <select className={styles.braceletSelect}
                                    value={stat.type}
                                    onChange={(e) => {
                                      setBraceletEdit(prev => {
                                        if (!prev) return prev;
                                        const stats = [...prev.stats];
                                        stats[i] = { ...stats[i], type: e.target.value };
                                        return { ...prev, stats };
                                      });
                                    }}>
                                    {isMainStat ? (
                                      <>
                                        <option value="힘">힘</option>
                                        <option value="민첩">민첩</option>
                                        <option value="지능">지능</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value="특화">특화</option>
                                        <option value="치명">치명</option>
                                        <option value="신속">신속</option>
                                      </>
                                    )}
                                  </select>
                                  <input type="number"
                                    className={styles.braceletStatInput}
                                    value={stat.value}
                                    onChange={(e) => {
                                      const v = Math.max(0, parseInt(e.target.value) || 0);
                                      setBraceletEdit(prev => {
                                        if (!prev) return prev;
                                        const stats = [...prev.stats];
                                        stats[i] = { ...stats[i], value: v };
                                        return { ...prev, stats };
                                      });
                                    }}
                                  />
                                </div>
                              );
                            })}
                            {braceletEdit.effects.map((eff, i) => (
                              <div key={`be${i}`} className={styles.braceletSimRow}>
                                <select className={styles.braceletSelect}
                                  value={eff.id}
                                  style={{ color: gradeColorRaw(eff.grade) }}
                                  onChange={(e) => {
                                    const newId = e.target.value;
                                    setBraceletEdit(prev => {
                                      if (!prev) return prev;
                                      const effects = [...prev.effects] as BraceletEditEffect[];
                                      effects[i] = { ...effects[i], id: newId };
                                      return { ...prev, effects };
                                    });
                                  }}>
                                  {braceletAllOptions.map(o => (
                                    <option key={o.id} value={o.id}>{o.description}</option>
                                  ))}
                                </select>
                                <GradeToggle
                                  value={eff.grade}
                                  onChange={(newGrade) => {
                                    setBraceletEdit(prev => {
                                      if (!prev) return prev;
                                      const effects = [...prev.effects] as BraceletEditEffect[];
                                      effects[i] = { ...effects[i], grade: newGrade };
                                      return { ...prev, effects };
                                    });
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ══ 카드 / 아크 패시브 ══ */}
          {(data.cardSets.length > 0 || data.arkPassive) && (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>카드 / 아크 패시브</h3>
                {data.arkPassive?.title && <span className={styles.badge}>{data.arkPassive.title}</span>}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardArkLayout}>
                  {/* 왼쪽: 카드 이미지 */}
                  {data.cardSets.length > 0 && (
                    <div className={styles.cardArkLeft}>
                      <div className={styles.cardArkSubtitle}>카드</div>
                      {data.cardSets.map((cardSet, si) => (
                        <div key={si}>
                          <div className={styles.cardSetHeader}>
                            <span className={styles.cardSetName}>{cardSet.name}</span>
                            <span className={styles.cardSetCount}>{cardSet.activeCount}세트</span>
                            {cardSet.awakening > 0 && <span className={styles.cardSetAwaken}>각성 {cardSet.awakening}</span>}
                          </div>
                          <div className={styles.cardImgGrid}>
                            {cardSet.cards.map((c, j) => (
                              <div key={j} className={styles.cardImgCell}>
                                {c.icon && <img src={c.icon} alt={c.name} className={styles.cardImgThumb} style={{ borderColor: getGradeColor(c.grade) }} />}
                                <span className={styles.cardAwakeCount}>{c.awakeCount}/{c.awakeTotal}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 오른쪽: 아크 패시브 */}
                  {data.arkPassive && (
                    <div className={styles.cardArkRight}>
                      <div className={styles.cardArkSubtitle}>아크 패시브</div>
                      <div className={styles.arkColGrid}>
                        {([
                          { type: 'evolution' as const, label: '진화', cls: styles.arkEvo, catColor: '#f59e0b', pointPerRank: 0 },
                          { type: 'enlightenment' as const, label: '깨달음', cls: styles.arkEnl, catColor: '#83e9ff', pointPerRank: 1 },
                          { type: 'leap' as const, label: '도약', cls: styles.arkLeap, catColor: '#c2ea55', pointPerRank: 2 },
                        ]).map(({ type, label, cls, catColor, pointPerRank }) => {
                          const baseVal = data.arkPassive![type];
                          const pointInfo = data.arkPassive!.points.find(p => p.name.includes(label));
                          const catEffects = data.arkPassive!.effects.filter(e => e.category === label);
                          const karmaData = data.arkPassive!.karma;
                          const karmaInfo = karmaData?.[type];

                          // 카르마 레벨 → 랭크 변환 & 포인트 보정
                          const currentLv = karmaInfo?.level ?? 0;
                          const targetLv = karmaOverrides[type] ?? currentLv;
                          const currentRank = currentLv > 0 ? getRankFromKarmaLevel(currentLv) : 0;
                          const targetRank = targetLv > 0 ? getRankFromKarmaLevel(targetLv) : 0;
                          const rankGrowth = targetRank - currentRank;
                          const pointBonus = rankGrowth * pointPerRank;
                          const adjustedVal = baseVal + pointBonus;
                          const karmaChanged = targetLv !== currentLv;

                          return (
                            <div key={type} className={styles.arkCol}>
                              <div className={styles.arkColHeader} style={{ borderBottomColor: catColor }}>
                                <span className={`${styles.arkColLabel} ${cls}`}>{label}</span>
                                <span className={`${styles.arkColVal} ${cls}`} style={pointBonus > 0 ? { color: '#8b5cf6' } : {}}>
                                  {pointBonus > 0 ? `${baseVal} → ${adjustedVal}` : baseVal}
                                </span>
                                {pointInfo?.description && (
                                  <span className={styles.arkColDesc}>{pointInfo.description}</span>
                                )}
                              </div>
                              {karmaInfo && karmaInfo.rank > 0 && (
                                <div className={styles.karmaInfo}>
                                  <span className={styles.karmaLabel}>{karmaChanged ? `${targetRank}랭크` : `${currentRank}랭크`}</span>
                                  <span className={styles.karmaVal} style={karmaChanged ? { color: '#8b5cf6' } : {}}>
                                    {karmaChanged ? `${currentLv} → ${targetLv}Lv` : `${currentLv}Lv`}
                                  </span>
                                  <div className={styles.karmaStepper}>
                                    <button className={styles.karmaBtn}
                                      disabled={targetLv <= currentLv}
                                      onClick={() => setKarmaOverrides(prev => {
                                        const n = { ...prev };
                                        const nv = targetLv - 1;
                                        if (nv <= currentLv) delete n[type]; else n[type] = nv;
                                        return n;
                                      })}>
                                      <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                    </button>
                                    <button className={styles.karmaBtn}
                                      disabled={targetLv >= 30}
                                      onClick={() => setKarmaOverrides(prev => {
                                        const n = { ...prev };
                                        const nv = targetLv + 1;
                                        n[type] = nv;
                                        return n;
                                      })}>
                                      <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                              {catEffects.length > 0 && (
                                <div className={styles.arkColEffects}>
                                  {catEffects.map((eff, i) => (
                                    <div key={i} className={styles.arkEffectChip}>
                                      {eff.icon && <img src={eff.icon} alt={eff.name} className={styles.arkEffectChipIcon} />}
                                      <span className={styles.arkEffectChipName}>{eff.name}</span>
                                      <span className={styles.arkEffectChipLv}>Lv.{eff.level}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ══ 보석 ══ */}
          {gems.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}><h3 className={styles.cardTitle}>보석</h3><span className={styles.badge}>{gems.length}개</span></div>
              <div className={styles.cardBody}>
                <div className={styles.gemDiamond}>
                  <div className={styles.gemDmRow}>
                    <div className={styles.gemPair}>{[0, 1].map(i => renderGemCell(gemSlots[i], i))}</div>
                    <div className={styles.gemPair}>{[2, 3].map(i => renderGemCell(gemSlots[i], i))}</div>
                  </div>
                  <div className={styles.gemDmCenter}>{[4, 5, 6].map(i => renderGemCell(gemSlots[i], i))}</div>
                  <div className={styles.gemDmRow}>
                    <div className={styles.gemPair}>{[7, 8].map(i => renderGemCell(gemSlots[i], i))}</div>
                    <div className={styles.gemPair}>{[9, 10].map(i => renderGemCell(gemSlots[i], i))}</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══ 아크 그리드 ══ */}
          {data.arkGrid && data.arkGrid.cores.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}><h3 className={styles.cardTitle}>아크 그리드</h3><span className={styles.badge}>{data.arkGrid.cores.length}코어</span></div>
              <div className={styles.cardBody}>
                {data.arkGrid.effects.length > 0 && (
                  <div className={styles.agEffectsSummary}>
                    {data.arkGrid.effects.map((eff, i) => (
                      <div key={i} className={styles.agEffectTag}>
                        <span className={styles.agEffectName}>{eff.name}</span>
                        <span className={styles.agEffectVal}>Lv.{eff.level}</span>
                        <span className={styles.agEffectTip}>{eff.tooltip}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.agRing}>
                  {data.arkGrid.cores.map((core, i) => {
                    const angle = (i / data.arkGrid!.cores.length) * 360 - 90;
                    const rad = (angle * Math.PI) / 180;
                    return (
                      <div key={i} className={styles.agRingNode} style={{ '--ag-x': `${50 + 38 * Math.cos(rad)}%`, '--ag-y': `${50 + 38 * Math.sin(rad)}%` } as React.CSSProperties}>
                        <img src={core.icon} alt={core.name} className={styles.agRingIcon} style={{ borderColor: getGradeColor(core.grade), boxShadow: `0 0 14px ${getGradeColor(core.grade)}40` }} />
                        <div className={styles.agRingName} style={{ color: getGradeColor(core.grade) }}>{core.name.replace(/.*코어\s*:\s*/, '')}</div>
                        <div className={styles.agRingPoint}>{core.point}P</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
