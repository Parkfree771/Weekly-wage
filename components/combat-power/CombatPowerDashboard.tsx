'use client';

import { useState, useMemo, useCallback } from 'react';
import type { CombatPowerData, EngravingInfo, GemInfo } from '@/lib/combatPowerData';
import { getGradeColor } from '@/lib/combatPowerData';
import {
  simulateEngravingChange,
  simulateChange,
} from '@/lib/combatPowerSimulator';
import {
  getGemPower,
  BRACELET_ALL_OPTIONS,
  BRACELET_EFFECT_POWER,
  ACCESSORY_GRINDING_POWER,
  ACCESSORY_GRINDING_ALIASES,
  ACCESSORY_GRINDING_OPTIONS,
  getCardSetPower,
  getArkPassivePower,
  CARD_SET_POWER,
  getBaseItemLevelPower,
} from '@/lib/combatPowerTables';
import styles from '@/app/combat-power/combat-power.module.css';

type BraceletOverride = { id: string; grade: '하' | '중' | '상' };
type AccOverride = { name: string; grade: '하' | '중' | '상' };
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

const braceletCombatOptions = BRACELET_ALL_OPTIONS.filter(o => o.combatPower);

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
  const numMatch = text.match(/([\d,]+\.?\d*\s*%?)/);
  if (numMatch && grade) {
    const idx = text.indexOf(numMatch[1]);
    const before = text.slice(0, idx);
    const num = numMatch[1];
    const after = text.slice(idx + num.length);
    return (
      <span className={styles.effectLine}>
        <span className={styles.effectLabel}>{before}</span>
        <span className={styles.effectVal} style={{ color: gradeColor(grade) }}>{num}</span>
        <span className={styles.effectLabel}>{after}</span>
      </span>
    );
  }
  return <span className={styles.effectLine}>{text}</span>;
}

function PowerDelta({ value }: { value: number }) {
  if (value === 0) return null;
  const pos = value > 0;
  return (
    <span className={pos ? styles.deltaPos : styles.deltaNeg}>
      {pos ? '+' : ''}{value.toLocaleString()}
    </span>
  );
}

// 전투력 무관 연마 효과 키워드 (이 키워드 포함 시 시뮬 매칭 스킵)
const GRIND_SKIP_KEYWORDS = ['아군 공격력 강화', '아군 피해강화', '최대 마나', '최대 생명력', '상태이상 공격 지속', '파티원 회복'];

// 악세 연마 텍스트 → 파싱된 효과 이름 매칭 (키워드 기반)
const GRIND_MATCH_KEYWORDS = [
  { keyword: '적에게 주는 피해', names: ['적에게 주는 피해%'] },
  { keyword: '치명타 적중률', names: ['치명타 적중률%'] },
  { keyword: '무기 공격력', names: ['무기 공격력+', '무기 공격력%'] },
  { keyword: '치명타 피해', names: ['치명타 피해%'] },
  { keyword: '추가 피해', names: ['추가 피해%'] },
  { keyword: '공격력', names: ['공격력+', '공격력%'] },
];

function findParsedEffect(
  grindText: string,
  parsedEffects: { name: string; grade: string }[],
): { name: string; grade: string } | null {
  // 전투력 무관 효과는 즉시 null (예: "아군 공격력 강화"가 "공격력"에 오매칭 방지)
  if (GRIND_SKIP_KEYWORDS.some(kw => grindText.includes(kw))) return null;

  for (const { keyword, names } of GRIND_MATCH_KEYWORDS) {
    if (!grindText.includes(keyword)) continue;
    for (const pe of parsedEffects) {
      if (names.includes(pe.name)) return pe;
    }
  }
  return null;
}

/* ═══════════════════════════════════════ */
export default function CombatPowerDashboard({ data }: Props) {
  const { profile, combatStats } = data;

  const [gemOverrides, setGemOverrides] = useState<Record<number, number>>({});
  const [engOverrides, setEngOverrides] = useState<Record<number, number>>({});
  const [enhanceOverrides, setEnhanceOverrides] = useState<Record<number, number>>({});
  const [braceletOverrides, setBraceletOverrides] = useState<Record<number, BraceletOverride>>({});
  const [accOverrides, setAccOverrides] = useState<Record<string, AccOverride>>({});
  const [cardOverrides, setCardOverrides] = useState<Record<number, number>>({});
  const [arkOverrides, setArkOverrides] = useState<{ evolution?: number; enlightenment?: number; leap?: number }>({});
  const [stoneOverrides, setStoneOverrides] = useState<Record<number, number>>({}); // key: stone engraving idx, value: new abilityStoneLevel (0-4)

  /* ── delta 콜백 ── */
  const getGemDelta = useCallback((idx: number, newLevel: number) => {
    const gem = data.gems[idx];
    if (!gem) return 0;
    return simulateChange(data.profile.combatPower,
      getGemPower(gem.tier, gem.level), getGemPower(gem.tier, newLevel)
    ).powerChange;
  }, [data]);

  const getEngDelta = useCallback((idx: number, newLevel: number) => {
    const eng = data.engravings[idx];
    if (!eng) return 0;
    return simulateEngravingChange(data, eng.name, newLevel)?.powerChange || 0;
  }, [data]);

  const getStoneDelta = useCallback((stoneEngIdx: number, newStoneLv: number) => {
    const se = data.abilityStone?.engravings[stoneEngIdx];
    if (!se) return 0;
    const eng = data.engravings.find(e => e.name === se.name);
    if (!eng) return 0;
    return simulateEngravingChange(data, eng.name, eng.level, newStoneLv)?.powerChange || 0;
  }, [data]);

  const getBraceletDelta = useCallback((idx: number, override: BraceletOverride) => {
    const eff = data.bracelet[idx];
    if (!eff) return 0;
    const currentPower = BRACELET_EFFECT_POWER[eff.id]?.[eff.grade as '상' | '중' | '하'] ?? 0;
    const newPower = BRACELET_EFFECT_POWER[override.id]?.[override.grade] ?? 0;
    return simulateChange(data.profile.combatPower, currentPower, newPower).powerChange;
  }, [data]);

  const getAccDelta = useCallback((key: string, override: AccOverride) => {
    const [accIdx, effIdx] = key.split('-').map(Number);
    const acc = data.accessories[accIdx];
    if (!acc) return 0;
    const eff = acc.effects[effIdx];
    if (!eff) return 0;
    const resolvedOld = ACCESSORY_GRINDING_ALIASES[eff.name] || eff.name;
    const resolvedNew = ACCESSORY_GRINDING_ALIASES[override.name] || override.name;
    const currentPower = ACCESSORY_GRINDING_POWER[resolvedOld]?.[eff.grade] ?? 0;
    const newPower = ACCESSORY_GRINDING_POWER[resolvedNew]?.[override.grade] ?? 0;
    return simulateChange(data.profile.combatPower, currentPower, newPower).powerChange;
  }, [data]);

  const getCardDelta = useCallback((idx: number, newThreshold: number) => {
    const card = data.cardSets[idx];
    if (!card) return 0;
    const currentPower = getCardSetPower(card.name, card.activeCount, card.awakening);
    const newPower = getCardSetPower(card.name, card.activeCount, newThreshold);
    return simulateChange(data.profile.combatPower, currentPower, newPower).powerChange;
  }, [data]);

  const getArkTypeDelta = useCallback((type: 'evolution' | 'enlightenment' | 'leap') => {
    if (!data.arkPassive || arkOverrides[type] === undefined) return 0;
    const ark = data.arkPassive;
    const currentPower = getArkPassivePower(ark.evolution, ark.enlightenment, ark.leap);
    const newArk = {
      evolution: arkOverrides.evolution ?? ark.evolution,
      enlightenment: arkOverrides.enlightenment ?? ark.enlightenment,
      leap: arkOverrides.leap ?? ark.leap,
    };
    // 이 타입만 변경했을 때의 delta (다른 타입은 원본 유지)
    const singleNew = { ...ark, [type]: arkOverrides[type]! };
    const singlePower = getArkPassivePower(singleNew.evolution, singleNew.enlightenment, singleNew.leap);
    return simulateChange(data.profile.combatPower, currentPower, singlePower).powerChange;
  }, [data, arkOverrides]);

  // 강화 단계 변경 → 전투력 변화 (아이템 레벨 기반)
  const getEnhDelta = useCallback((eqIdx: number, newEnhLv: number) => {
    const eq = data.equipmentItems[eqIdx];
    if (!eq || newEnhLv === eq.enhanceLevel) return 0;
    // T4 기준 강화 1단계당 개별 장비 아이템 레벨 ~2.5 변동
    const ITEM_LV_PER_STEP = 2.5;
    const pieceDelta = (newEnhLv - eq.enhanceLevel) * ITEM_LV_PER_STEP;
    const avgDelta = pieceDelta / data.equipmentItems.length;
    const currentBase = getBaseItemLevelPower(data.profile.itemLevel);
    const newBase = getBaseItemLevelPower(data.profile.itemLevel + avgDelta);
    if (currentBase <= 0) return 0;
    return Math.round(data.profile.combatPower * (newBase / currentBase - 1));
  }, [data]);

  const arkTotalDelta = useMemo(() => {
    if (!data.arkPassive) return 0;
    const ark = data.arkPassive;
    if (arkOverrides.evolution === undefined && arkOverrides.enlightenment === undefined && arkOverrides.leap === undefined) return 0;
    const currentPower = getArkPassivePower(ark.evolution, ark.enlightenment, ark.leap);
    const newPower = getArkPassivePower(
      arkOverrides.evolution ?? ark.evolution,
      arkOverrides.enlightenment ?? ark.enlightenment,
      arkOverrides.leap ?? ark.leap,
    );
    return simulateChange(data.profile.combatPower, currentPower, newPower).powerChange;
  }, [data, arkOverrides]);

  const totalDelta = useMemo(() => {
    let d = 0;
    for (const [idx, lv] of Object.entries(gemOverrides)) d += getGemDelta(Number(idx), lv);
    for (const [idx, lv] of Object.entries(engOverrides)) d += getEngDelta(Number(idx), lv);
    for (const [idx, lv] of Object.entries(enhanceOverrides)) d += getEnhDelta(Number(idx), lv);
    for (const [idx, ov] of Object.entries(braceletOverrides)) d += getBraceletDelta(Number(idx), ov);
    for (const [key, ov] of Object.entries(accOverrides)) d += getAccDelta(key, ov);
    for (const [idx, aw] of Object.entries(cardOverrides)) d += getCardDelta(Number(idx), aw);
    for (const [idx, lv] of Object.entries(stoneOverrides)) d += getStoneDelta(Number(idx), lv);
    d += arkTotalDelta;
    return d;
  }, [gemOverrides, engOverrides, enhanceOverrides, braceletOverrides, accOverrides, cardOverrides, stoneOverrides, arkTotalDelta, getGemDelta, getEngDelta, getEnhDelta, getBraceletDelta, getAccDelta, getCardDelta, getStoneDelta]);

  const engSlots: (EngravingInfo | null)[] = [];
  for (let i = 0; i < 5; i++) engSlots.push(data.engravings[i] || null);

  const resetAll = () => {
    setGemOverrides({}); setEngOverrides({}); setEnhanceOverrides({});
    setBraceletOverrides({}); setAccOverrides({});
    setCardOverrides({}); setArkOverrides({}); setStoneOverrides({});
  };

  const handleArkPassive = (type: 'evolution' | 'enlightenment' | 'leap', delta: number) => {
    if (!data.arkPassive) return;
    const current = arkOverrides[type] ?? data.arkPassive[type];
    const next = Math.max(0, current + delta);
    setArkOverrides(prev => {
      const n = { ...prev };
      if (next === data.arkPassive![type]) delete n[type]; else n[type] = next;
      return n;
    });
  };

  const braceletKeywords = data.braceletItem?.keywords || [];
  const braceletEffects = data.braceletItem?.effects || [];

  // 팔찌 표시 텍스트 → data.bracelet 인덱스 매칭
  const findBraceletSimIdx = useCallback((effectText: string): number | null => {
    for (let i = 0; i < data.bracelet.length; i++) {
      const eff = data.bracelet[i];
      if (!BRACELET_EFFECT_POWER[eff.id]) continue;
      const opt = BRACELET_ALL_OPTIONS.find(o => o.id === eff.id);
      if (!opt) continue;
      if (opt.matchKeywords.some(kw => effectText.includes(kw)) ||
          opt.comboKeywords?.some(kw => effectText.includes(kw))) {
        return i;
      }
    }
    return null;
  }, [data.bracelet]);

  // 악세 연마 텍스트 → parsedAcc.effects 에서 이름 기반 매칭 후 인덱스 리턴
  const findAccEffIdx = useCallback((grindText: string, parsedEffects: { name: string; grade: string }[]): number | null => {
    const found = findParsedEffect(grindText, parsedEffects);
    if (!found) return null;
    return parsedEffects.indexOf(found);
  }, []);

  const gems = data.gems;
  const gemSlots: (GemInfo | null)[] = Array.from({ length: 11 }, (_, i) => gems[i] || null);

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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lv => (
              <option key={lv} value={lv}>Lv.{lv}</option>
            ))}
          </select>
        </div>
        {changed && <div className={styles.gemCellDelta}><PowerDelta value={getGemDelta(idx, ov!)} /></div>}
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

          {/* 전투력 변화 (사이드바) */}
          {totalDelta !== 0 && (
            <div className={styles.deltaCard}>
              <div className={styles.deltaCardHeader}>전투력 변화</div>
              <div className={styles.deltaCardBody}>
                <span className={`${styles.deltaCardValue} ${totalDelta > 0 ? styles.deltaPos : styles.deltaNeg}`}>
                  {totalDelta > 0 ? '+' : ''}{totalDelta.toLocaleString()}
                </span>
                <button className={styles.resetBtn} onClick={resetAll}>초기화</button>
              </div>
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
                          {ov !== undefined && <PowerDelta value={getEnhDelta(i, ov)} />}
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
                                  {/* 안쪽 오각형 (채움) */}
                                  <polygon points={pent(58)} fill="var(--card-body-bg-stone)" stroke="var(--border-color)" strokeWidth="1" strokeLinejoin="round" />
                                  {/* 바깥 오각형 (효과 잇는 선) */}
                                  <polygon points={pent(90)} fill="none" stroke="var(--border-color)" strokeWidth="1" strokeLinejoin="round" opacity="0.5" />
                                </>
                              );
                            })()}

                            {/* 연결선: 스톤 → 각 꼭짓점 */}
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

                            {/* 중앙 스톤 원 */}
                            {data.abilityStone && (
                              <circle cx="140" cy="140" r="18" fill="var(--card-bg)" stroke={getGradeColor(data.abilityStone.grade)} strokeWidth="2" />
                            )}
                          </svg>

                          {/* 중앙: 스톤 아이콘 */}
                          {data.abilityStone?.icon && (
                            <div className={styles.engCircleCenter}>
                              <img src={data.abilityStone.icon} alt="스톤" className={styles.engStoneIcon} style={{ borderColor: getGradeColor(data.abilityStone.grade) }} />
                            </div>
                          )}

                          {/* 각인 이름 + 다이아몬드 + 스톤Lv */}
                          {engSlots.map((eng, i) => {
                            if (!eng) return null;
                            const ov = engOverrides[i];
                            const currentLv = ov ?? eng.level;
                            const angle = (i / 5) * 360 - 90;
                            const rad = (angle * Math.PI) / 180;
                            const stoneEng = data.abilityStone?.engravings.find(se => se.name === eng.name);
                            const stoneEngIdx = stoneEng ? data.abilityStone!.engravings.indexOf(stoneEng) : -1;
                            const stoneLv = stoneEngIdx >= 0 ? (stoneOverrides[stoneEngIdx] ?? eng.abilityStoneLevel) : 0;
                            const stoneChanged = stoneEngIdx >= 0 && stoneOverrides[stoneEngIdx] !== undefined && stoneOverrides[stoneEngIdx] !== eng.abilityStoneLevel;
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
                                    {stoneChanged && <span className={styles.engStoneLvDelta}><PowerDelta value={getStoneDelta(stoneEngIdx, stoneLv)} /></span>}
                                  </div>
                                )}
                                {ov !== undefined && ov !== eng.level && <PowerDelta value={getEngDelta(i, ov)} />}
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
                    const parsedAcc = data.accessories[i];
                    return (
                      <div key={i} className={styles.itemRow}>
                        {acc.icon && <img src={acc.icon} alt={acc.type} className={styles.itemIcon} style={{ borderColor: getGradeColor(acc.grade) }} />}
                        <div className={styles.itemBody}>
                          <div className={styles.itemNameRow}>
                            <span className={styles.itemName} style={{ color: getGradeColor(acc.grade) }}>{acc.type}</span>
                            {acc.quality > 0 && <span className={styles.qualBadge} style={{ color: getQualityColor(acc.quality) }}>{acc.quality}</span>}
                          </div>
                          <div className={styles.effectsCol}>
                            {acc.stats.map((s, j) => <div key={`s${j}`} className={styles.statLine}>{s}</div>)}
                            {acc.grindingEffects.map((eff, j) => {
                              // 이름 기반 매칭 (전투력 무관 효과는 null → 텍스트만 표시)
                              const parsedEff = parsedAcc ? findParsedEffect(eff.text, parsedAcc.effects) : null;
                              const parsedEffIdx = parsedEff ? parsedAcc!.effects.indexOf(parsedEff) : -1;
                              const accKey = `${i}-${parsedEffIdx}`;
                              const ov = parsedEffIdx >= 0 ? accOverrides[accKey] : undefined;
                              const accOptions = ACCESSORY_GRINDING_OPTIONS[acc.type] || [];
                              const resolvedOrigName = parsedEff ? (ACCESSORY_GRINDING_ALIASES[parsedEff.name] || parsedEff.name) : '';
                              const currentName = ov?.name ?? resolvedOrigName;
                              const currentGrade = ov?.grade ?? (parsedEff?.grade as '하' | '중' | '상') ?? (eff.grade as '하' | '중' | '상');
                              const changed = ov !== undefined && parsedEff && (ov.name !== resolvedOrigName || ov.grade !== parsedEff.grade);

                              if (parsedEff && accOptions.length > 0) {
                                const fmtPow = (v: number | undefined) => {
                                  if (v == null) return '';
                                  return v < 0.1 ? v.toFixed(3) + '%' : v.toFixed(2) + '%';
                                };
                                return (
                                  <div key={`g${j}`} className={styles.braceletSimRow}>
                                    <select className={styles.braceletSelect}
                                      value={currentName}
                                      style={changed ? { borderColor: '#8b5cf6', color: gradeColorRaw(currentGrade) } : { color: gradeColorRaw(currentGrade) }}
                                      onChange={(e) => {
                                        const newName = e.target.value;
                                        setAccOverrides(prev => {
                                          const next = { ...prev };
                                          if (newName === resolvedOrigName && currentGrade === parsedEff!.grade) delete next[accKey];
                                          else next[accKey] = { name: newName, grade: currentGrade };
                                          return next;
                                        });
                                      }}>
                                      {accOptions.map(o => (
                                        <option key={o.id} value={o.id}>{o.label} {fmtPow(ACCESSORY_GRINDING_POWER[o.id]?.[currentGrade])}</option>
                                      ))}
                                    </select>
                                    <GradeToggle
                                      value={currentGrade}
                                      onChange={(newGrade) => {
                                        setAccOverrides(prev => {
                                          const next = { ...prev };
                                          if (currentName === resolvedOrigName && newGrade === parsedEff!.grade) delete next[accKey];
                                          else next[accKey] = { name: currentName, grade: newGrade };
                                          return next;
                                        });
                                      }}
                                    />
                                    {changed && <PowerDelta value={getAccDelta(accKey, ov!)} />}
                                  </div>
                                );
                              }
                              return (
                                <div key={`g${j}`} className={styles.simRow}>
                                  <GrindingEffect text={eff.text} grade={eff.grade} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 팔찌 */}
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
                        </div>
                        <div className={styles.effectsCol}>
                          {data.braceletItem.stats.map((s, j) => <div key={`s${j}`} className={styles.statLine}>{s}</div>)}
                          {braceletEffects.map((eff, j) => {
                            const simIdx = findBraceletSimIdx(eff.text);
                            if (simIdx !== null) {
                              const simEff = data.bracelet[simIdx];
                              const ov = braceletOverrides[simIdx];
                              const currentId = ov?.id ?? simEff.id;
                              const currentGrade = ov?.grade ?? (simEff.grade as '하' | '중' | '상');
                              const changed = ov !== undefined && (ov.id !== simEff.id || ov.grade !== simEff.grade);
                              return (
                                <div key={`e${j}`} className={styles.braceletSimRow}>
                                  <select className={styles.braceletSelect}
                                    value={currentId}
                                    style={changed ? { borderColor: '#8b5cf6' } : {}}
                                    onChange={(e) => {
                                      const newId = e.target.value;
                                      setBraceletOverrides(prev => {
                                        const next = { ...prev };
                                        if (newId === simEff.id && currentGrade === simEff.grade) delete next[simIdx];
                                        else next[simIdx] = { id: newId, grade: currentGrade };
                                        return next;
                                      });
                                    }}>
                                    {braceletCombatOptions.map(o => (
                                      <option key={o.id} value={o.id}>{o.description}</option>
                                    ))}
                                  </select>
                                  <GradeToggle
                                    value={currentGrade}
                                    onChange={(newGrade) => {
                                      setBraceletOverrides(prev => {
                                        const next = { ...prev };
                                        if (currentId === simEff.id && newGrade === simEff.grade) delete next[simIdx];
                                        else next[simIdx] = { id: currentId, grade: newGrade };
                                        return next;
                                      });
                                    }}
                                  />
                                  {changed && <PowerDelta value={getBraceletDelta(simIdx, ov!)} />}
                                </div>
                              );
                            }
                            return <div key={`e${j}`} className={styles.statLine}><BraceletEffectLine text={eff.text} grade={eff.grade} /></div>;
                          })}
                        </div>
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
                      {data.cardSets.map((cardSet, si) => {
                        const cardPower = CARD_SET_POWER[cardSet.name];
                        const thresholds = cardPower ? Object.keys(cardPower).map(Number).sort((a, b) => a - b) : [];
                        const effectiveThreshold = thresholds.filter(t => cardSet.awakening >= t).pop() ?? 0;
                        const ov = cardOverrides[si];
                        const selectedThreshold = ov ?? effectiveThreshold;
                        const changed = ov !== undefined && ov !== effectiveThreshold;
                        return (
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
                            {thresholds.length > 0 && (
                              <div className={styles.cardSimControls}>
                                <div className={styles.engLvToggle}>
                                  {[0, ...thresholds].map(t => (
                                    <button key={t}
                                      className={`${styles.engLvBtn} ${selectedThreshold === t ? styles.engLvBtnActive : ''}`}
                                      style={selectedThreshold === t ? { background: t === 0 ? '#6b7280' : '#8b5cf6', color: '#fff' } : {}}
                                      onClick={() => {
                                        setCardOverrides(prev => {
                                          const next = { ...prev };
                                          if (t === effectiveThreshold) delete next[si]; else next[si] = t;
                                          return next;
                                        });
                                      }}
                                    >{t === 0 ? '없음' : `${t}각`}</button>
                                  ))}
                                </div>
                                {changed && <PowerDelta value={getCardDelta(si, ov!)} />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 오른쪽: 아크 패시브 */}
                  {data.arkPassive && (
                    <div className={styles.cardArkRight}>
                      <div className={styles.cardArkSubtitle}>아크 패시브</div>
                      <div className={styles.arkColGrid}>
                        {([
                          { type: 'evolution' as const, label: '진화', cls: styles.arkEvo, catColor: '#f59e0b' },
                          { type: 'enlightenment' as const, label: '깨달음', cls: styles.arkEnl, catColor: '#83e9ff' },
                          { type: 'leap' as const, label: '도약', cls: styles.arkLeap, catColor: '#c2ea55' },
                        ]).map(({ type, label, cls, catColor }) => {
                          const val = arkOverrides[type] ?? data.arkPassive![type];
                          const changed = arkOverrides[type] !== undefined;
                          const pointInfo = data.arkPassive!.points.find(p => p.name.includes(label));
                          const catEffects = data.arkPassive!.effects.filter(e => e.category === label);
                          return (
                            <div key={type} className={styles.arkCol}>
                              {/* 포인트 헤더 */}
                              <div className={styles.arkColHeader} style={{ borderBottomColor: catColor }}>
                                <span className={`${styles.arkColLabel} ${cls}`}>{label}</span>
                                <span className={`${styles.arkColVal} ${cls}`}>{val}</span>
                                {pointInfo?.description && (
                                  <span className={styles.arkColDesc}>{pointInfo.description}</span>
                                )}
                              </div>
                              {/* 스텝퍼 */}
                              <div className={styles.arkColControls}>
                                <div className={styles.enhStepper}>
                                  <button className={styles.enhBtn} onClick={() => handleArkPassive(type, -1)} disabled={val <= 0}>
                                    <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                  </button>
                                  <span className={styles.enhVal} style={changed ? { color: '#8b5cf6' } : {}}>{val}</span>
                                  <button className={styles.enhBtn} onClick={() => handleArkPassive(type, 1)}>
                                    <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                  </button>
                                </div>
                                {changed && <PowerDelta value={getArkTypeDelta(type)} />}
                              </div>
                              {/* 해당 카테고리 효과 세로 나열 */}
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
                <div className={styles.agCoreList}>
                  {data.arkGrid.cores.map((core, i) => (
                    <div key={i} className={styles.agCoreCard}>
                      <div className={styles.agCoreCardHead}>
                        <img src={core.icon} alt={core.name} className={styles.agCoreCardIcon} style={{ borderColor: getGradeColor(core.grade) }} />
                        <div>
                          <div className={styles.agCoreCardName} style={{ color: getGradeColor(core.grade) }}>{core.name.replace(/.*코어\s*:\s*/, '')}</div>
                          <div className={styles.agCoreCardMeta}><span>{core.coreType}</span><span className={styles.agCoreCardPt}>{core.point}P / 20P</span><span>의지력 {core.willpower}</span></div>
                        </div>
                      </div>
                      {core.gems.length > 0 && (
                        <div className={styles.agGemList}>
                          {core.gems.map((gem, j) => (
                            <div key={j} className={styles.agGemItem}>
                              <img src={gem.icon} alt="" className={styles.agGemItemIcon} style={{ borderColor: getGradeColor(gem.grade) }} />
                              <div className={styles.agGemItemBody}>
                                <div className={styles.agGemItemNameRow}><span className={styles.agGemItemName} style={{ color: getGradeColor(gem.grade) }}>{gem.name}</span></div>
                                <div className={styles.agGemPointRow}>
                                  {gem.point > 0 && <span className={styles.agGemPtTotal}>{gem.point}pt</span>}
                                  {gem.orderPoint > 0 && <span className={styles.agGemPtOrder}>질서 {gem.orderPoint}</span>}
                                  {gem.chaosPoint > 0 && <span className={styles.agGemPtChaos}>혼돈 {gem.chaosPoint}</span>}
                                </div>
                                {gem.effects.length > 0 ? (
                                  <div className={styles.agGemEffList}>
                                    {gem.effects.map((eff, k) => {
                                      const m = eff.match(/^(.+?)\s*(\+[\d.]+%?)$/);
                                      const numOnly = eff.match(/^(.+?)\s+(\d+)$/);
                                      if (m) return <div key={k} className={styles.agGemEffRow}><span className={styles.agGemEffLabel}>{m[1]}</span><span className={styles.agGemEffVal}>{m[2]}</span></div>;
                                      if (numOnly) return <div key={k} className={styles.agGemEffRow}><span className={styles.agGemEffLabel}>{numOnly[1]}</span><span className={styles.agGemEffVal} style={eff.includes('질서') ? { color: '#3b82f6' } : eff.includes('혼돈') ? { color: '#ef4444' } : {}}>{numOnly[2]}</span></div>;
                                      return <div key={k} className={styles.agGemEffRow}>{eff}</div>;
                                    })}
                                  </div>
                                ) : <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>효과 정보 없음</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
