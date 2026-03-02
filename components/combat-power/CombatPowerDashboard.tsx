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

// 악세 연마 텍스트 → 파싱된 효과 이름 매칭 (인덱스가 아닌 키워드 기반)
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
    for (const [idx, ov] of Object.entries(braceletOverrides)) d += getBraceletDelta(Number(idx), ov);
    for (const [key, ov] of Object.entries(accOverrides)) d += getAccDelta(key, ov);
    for (const [idx, aw] of Object.entries(cardOverrides)) d += getCardDelta(Number(idx), aw);
    d += arkTotalDelta;
    return d;
  }, [gemOverrides, engOverrides, braceletOverrides, accOverrides, cardOverrides, arkTotalDelta, getGemDelta, getEngDelta, getBraceletDelta, getAccDelta, getCardDelta]);

  const engSlots: (EngravingInfo | null)[] = [];
  for (let i = 0; i < 5; i++) engSlots.push(data.engravings[i] || null);

  const resetAll = () => {
    setGemOverrides({}); setEngOverrides({}); setEnhanceOverrides({});
    setBraceletOverrides({}); setAccOverrides({});
    setCardOverrides({}); setArkOverrides({});
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
      {totalDelta !== 0 && (
        <div className={styles.deltaBanner}>
          <div className={styles.deltaBannerInner}>
            <span className={styles.deltaBannerLabel}>예상 전투력 변화</span>
            <span className={`${styles.deltaBannerValue} ${totalDelta > 0 ? styles.deltaPos : styles.deltaNeg}`}>
              {totalDelta > 0 ? '+' : ''}{totalDelta.toLocaleString()}
            </span>
            <button className={styles.resetBtn} onClick={resetAll}>초기화</button>
          </div>
        </div>
      )}

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
                    const baseName = shortenEquipName(eq.name, eq.type);
                    const displayName = ov !== undefined ? baseName.replace(/^\+\d+/, `+${ov}`) : baseName;
                    return (
                      <div key={i} className={styles.itemRow}>
                        {eq.icon && <img src={eq.icon} alt={eq.type} className={styles.itemIcon} style={{ borderColor: getGradeColor(eq.grade) }} />}
                        <div className={styles.itemBody}>
                          <div className={styles.itemNameRow}>
                            <span className={styles.itemName} style={{ color: getGradeColor(eq.grade) }}>{displayName}</span>
                            {eq.transcendence > 0 && <span className={styles.tag}>초월 {eq.transcendence}</span>}
                          </div>
                          <div className={styles.qualRow}>
                            <div className={styles.qualTrack}><div className={styles.qualFill} style={{ width: `${eq.quality}%`, background: getQualityColor(eq.quality) }} /></div>
                            <span className={styles.qualNum} style={{ color: getQualityColor(eq.quality) }}>{eq.quality}</span>
                          </div>
                        </div>
                        <div className={styles.enhStepper}>
                          <button className={styles.enhBtn} onClick={() => handleEnhance(i, -1)} disabled={(ov ?? eq.enhanceLevel) <= 0}>
                            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                          </button>
                          <span className={styles.enhVal} style={ov !== undefined ? { color: '#8b5cf6' } : {}}>+{ov ?? eq.enhanceLevel}</span>
                          <button className={styles.enhBtn} onClick={() => handleEnhance(i, 1)} disabled={(ov ?? eq.enhanceLevel) >= 25}>
                            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* 카드 */}
                  {data.cardSets.length > 0 && (
                    <>
                      <div className={styles.subDivider}><span>카드</span></div>
                      {data.cardSets.map((card, i) => {
                        const cardPower = CARD_SET_POWER[card.name];
                        const thresholds = cardPower ? Object.keys(cardPower).map(Number).sort((a, b) => a - b) : [];
                        const effectiveThreshold = thresholds.filter(t => card.awakening >= t).pop() ?? 0;
                        const ov = cardOverrides[i];
                        const selectedThreshold = ov ?? effectiveThreshold;
                        const changed = ov !== undefined && ov !== effectiveThreshold;
                        return (
                          <div key={i} className={styles.cardSimRow}>
                            <div className={styles.cardSimInfo}>
                              <span className={styles.cardSetName}>{card.name}</span>
                              <span className={styles.cardSetCount}>{card.activeCount}세트</span>
                              {card.awakening > 0 && <span className={styles.cardSetAwaken}>각성 {card.awakening}</span>}
                            </div>
                            {card.cards.length > 0 && (
                              <div className={styles.cardImageRow}>
                                {card.cards.map((c, j) => (
                                  <div key={j} className={styles.cardImageCell}>
                                    {c.icon && <img src={c.icon} alt={c.name} className={styles.cardImage} style={{ borderColor: getGradeColor(c.grade) }} />}
                                    <span className={styles.cardAwakeCount}>{c.awakeCount}/{c.awakeTotal}</span>
                                  </div>
                                ))}
                              </div>
                            )}
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
                                          if (t === effectiveThreshold) delete next[i]; else next[i] = t;
                                          return next;
                                        });
                                      }}
                                    >{t === 0 ? '없음' : `${t}각`}</button>
                                  ))}
                                </div>
                                {changed && <PowerDelta value={getCardDelta(i, ov!)} />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 아크 패시브 */}
                  {data.arkPassive && (
                    <>
                      <div className={styles.subDivider} style={{ marginTop: '2rem' }}><span>아크 패시브</span></div>
                      <div className={styles.arkRow}>
                        {([
                          { type: 'evolution' as const, label: '진화' },
                          { type: 'enlightenment' as const, label: '깨달음' },
                          { type: 'leap' as const, label: '도약' },
                        ]).map(({ type, label }) => {
                          const val = arkOverrides[type] ?? data.arkPassive![type];
                          const changed = arkOverrides[type] !== undefined;
                          return (
                            <div key={type} className={styles.arkItem}>
                              <span className={styles.arkLabel}>{label}</span>
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
                          );
                        })}
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
                              // 이름 기반 매칭 (우선), 실패 시 인덱스 폴백
                              let parsedEff = parsedAcc ? findParsedEffect(eff.text, parsedAcc.effects) : null;
                              let parsedEffIdx = parsedEff ? parsedAcc!.effects.indexOf(parsedEff) : -1;
                              if (!parsedEff && parsedAcc && parsedAcc.effects[j]) {
                                parsedEff = parsedAcc.effects[j];
                                parsedEffIdx = j;
                              }
                              const accKey = `${i}-${parsedEffIdx}`;
                              const ov = parsedEffIdx >= 0 ? accOverrides[accKey] : undefined;
                              const accOptions = ACCESSORY_GRINDING_OPTIONS[acc.type] || [];
                              const resolvedOrigName = parsedEff ? (ACCESSORY_GRINDING_ALIASES[parsedEff.name] || parsedEff.name) : '';
                              const currentName = ov?.name ?? resolvedOrigName;
                              const currentGrade = ov?.grade ?? (parsedEff?.grade as '하' | '중' | '상') ?? (eff.grade as '하' | '중' | '상');
                              const changed = ov !== undefined && parsedEff && (ov.name !== resolvedOrigName || ov.grade !== parsedEff.grade);

                              if (parsedEff && accOptions.length > 0) {
                                return (
                                  <div key={`g${j}`} className={styles.braceletSimRow}>
                                    <select className={styles.braceletSelect}
                                      value={currentName}
                                      style={changed ? { borderColor: '#8b5cf6' } : {}}
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
                                        <option key={o.id} value={o.id}>{o.label}</option>
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

          {/* ══ 각인 / 스톤 ══ */}
          <section className={styles.card}>
            <div className={styles.cardHead}><h3 className={styles.cardTitle}>각인 / 스톤</h3></div>
            <div className={styles.cardBody}>
              <div className={styles.engStoneRow}>
                {engSlots.map((eng, i) => {
                  if (!eng) return null;
                  const ov = engOverrides[i];
                  const changed = ov !== undefined && ov !== eng.level;
                  return (
                    <div key={i} className={styles.engItem}>
                      <div className={styles.engItemHead}>
                        {eng.icon && <img src={eng.icon} alt={eng.name} className={styles.engIcon} />}
                        <span className={styles.engName}>{eng.name}</span>
                        <span className={styles.engLvBadge} style={{ backgroundColor: getEngLevelColor(eng.level), boxShadow: `0 0 6px ${getEngLevelColor(eng.level)}40` }}>
                          Lv.{eng.level}
                        </span>
                      </div>
                      <div className={styles.engItemControls}>
                        <div className={styles.engLvToggle}>
                          {[0, 1, 2, 3, 4].map(lv => (
                            <button key={lv}
                              className={`${styles.engLvBtn} ${(ov ?? eng.level) === lv ? styles.engLvBtnActive : ''}`}
                              style={(ov ?? eng.level) === lv ? { background: getEngLevelColor(lv), color: '#fff' } : {}}
                              onClick={() => setEngOverrides(prev => {
                                const next = { ...prev };
                                if (lv === eng.level) delete next[i]; else next[i] = lv;
                                return next;
                              })}
                            >{lv}</button>
                          ))}
                        </div>
                        {changed && <PowerDelta value={getEngDelta(i, ov!)} />}
                      </div>
                    </div>
                  );
                })}
                {data.abilityStone && (
                  <div className={styles.engItem}>
                    <div className={styles.engItemHead}>
                      {data.abilityStone.icon && <img src={data.abilityStone.icon} alt="스톤" className={styles.engIcon} style={{ borderColor: getGradeColor(data.abilityStone.grade) }} />}
                      <span className={styles.engName} style={{ color: getGradeColor(data.abilityStone.grade) }}>어빌리티 스톤</span>
                    </div>
                    <div className={styles.engItemControls} style={{ gap: '0.2rem' }}>
                      {data.abilityStone.engravings.map((e, j) => (
                        <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{e.name}</span>
                          <span className={styles.engLvBadge} style={{ backgroundColor: '#3b82f6' }}>+{e.level}</span>
                        </span>
                      ))}
                      {data.abilityStone.reduction && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{data.abilityStone.reduction.name}</span>
                          <span className={styles.engLvBadge} style={{ backgroundColor: '#ef4444' }}>-{data.abilityStone.reduction.level}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

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
