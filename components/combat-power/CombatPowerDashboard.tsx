'use client';

import { useState, useMemo, useCallback } from 'react';
import type { CombatPowerData, EngravingInfo, GemInfo, ArkGridCore } from '@/lib/combatPowerData';
import { getGradeColor, classifyBraceletGrade } from '@/lib/combatPowerData';
import {
  simulateEngravingChange,
  simulateChange,
} from '@/lib/combatPowerSimulator';
import { getGemPower } from '@/lib/combatPowerTables';
import styles from '@/app/combat-power/combat-power.module.css';

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

function shortenEquipName(name: string, type: string): string {
  return name.replace(new RegExp(`\\s*${type}\\s*$`), '').trim() || name;
}

const BRACELET_KW = ['정밀', '습격', '급소', '강타', '열정', '신념', '축복'];

function GrindingEffect({ text, grade }: { text: string; grade: string }) {
  const m = text.match(/^(.+?)\s*([\+\-]?\s*[\d,]+\.?\d*\s*%?)$/);
  if (m) {
    return (
      <div className={styles.effectLine}>
        <span className={styles.effectLabel}>{m[1]} </span>
        <span className={styles.effectVal} style={{ color: gradeColor(grade) }}>
          {m[2]}{grade && ` (${grade})`}
        </span>
      </div>
    );
  }
  return (
    <div className={styles.effectLine} style={{ color: grade ? gradeColor(grade) : undefined }}>
      {text}{grade && <span className={styles.gradeBadge}> ({grade})</span>}
    </div>
  );
}

function BraceletEffectLine({ text }: { text: string }) {
  const grade = classifyBraceletGrade(text);
  // 숫자(+% 포함) 찾아서 등급 색상 적용
  const numMatch = text.match(/([\d,]+\.?\d*\s*%?)/);
  if (numMatch && grade) {
    const idx = text.indexOf(numMatch[1]);
    const before = text.slice(0, idx);
    const num = numMatch[1];
    const after = text.slice(idx + num.length);
    return (
      <div className={styles.effectLine}>
        <span className={styles.effectLabel}>{before}</span>
        <span className={styles.effectVal} style={{ color: gradeColor(grade) }}>{num}</span>
        <span className={styles.effectLabel}>{after}</span>
        <span className={styles.gradeBadge} style={{ color: gradeColor(grade) }}> ({grade})</span>
      </div>
    );
  }
  return <div className={styles.effectLine}>{text}</div>;
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

export default function CombatPowerDashboard({ data }: Props) {
  const { profile, combatStats } = data;

  const [gemOverrides, setGemOverrides] = useState<Record<number, number>>({});
  const [engOverrides, setEngOverrides] = useState<Record<number, number>>({});
  const [enhanceOverrides, setEnhanceOverrides] = useState<Record<number, number>>({});

  const getGemDelta = useCallback((idx: number, newLevel: number) => {
    const gem = data.gems[idx];
    if (!gem) return 0;
    return simulateChange(data.profile.combatPower,
      getGemPower(gem.tier, gem.level, gem.type),
      getGemPower(gem.tier, newLevel, gem.type)
    ).powerChange;
  }, [data]);

  const getEngDelta = useCallback((idx: number, newLevel: number) => {
    const eng = data.engravings[idx];
    if (!eng) return 0;
    return simulateEngravingChange(data, eng.name, newLevel)?.powerChange || 0;
  }, [data]);

  const totalDelta = useMemo(() => {
    let d = 0;
    for (const [idx, lv] of Object.entries(gemOverrides)) d += getGemDelta(Number(idx), lv);
    for (const [idx, lv] of Object.entries(engOverrides)) d += getEngDelta(Number(idx), lv);
    return d;
  }, [gemOverrides, engOverrides, getGemDelta, getEngDelta]);

  const engSlots: (EngravingInfo | null)[] = [];
  for (let i = 0; i < 5; i++) engSlots.push(data.engravings[i] || null);

  const resetAll = () => { setGemOverrides({}); setEngOverrides({}); setEnhanceOverrides({}); };

  const bkwEffects = data.braceletItem?.effects.filter(e => BRACELET_KW.some(kw => e.includes(kw))) || [];
  const bOtherEffects = data.braceletItem?.effects.filter(e => !BRACELET_KW.some(kw => e.includes(kw))) || [];

  // 보석 다이아몬드 배치 (11슬롯)
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
          <div className={styles.gemSelWrap} style={changed ? { borderColor: '#8b5cf6' } : {}}>
            <select className={styles.gemCellSel} value={ov ?? gem.level}
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
            <span className={styles.gemSelArrow}>▾</span>
          </div>
        </div>
        {changed && (
          <div className={styles.gemCellDelta}>
            <PowerDelta value={getGemDelta(idx, ov!)} />
          </div>
        )}
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
        {/* ======= 프로필 ======= */}
        <aside className={styles.profileCol}>
          <div className={styles.profileCard}>
            <div className={styles.profileImgWrap}>
              {profile.characterImage ? (
                <img src={profile.characterImage} alt={profile.characterName} className={styles.profileImg} />
              ) : (
                <div className={styles.profileImgEmpty}>?</div>
              )}
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
                <div className={styles.pStat}><span className={styles.pStatLabel}>전투력</span><span className={styles.pStatVal}>{profile.combatPower > 0 ? profile.combatPower.toLocaleString() : '-'}</span></div>
              </div>
            </div>
          </div>
        </aside>

        {/* ======= 스펙 ======= */}
        <div className={styles.specCol}>

          {/* ══ 장비 + 악세 + 각인 + 스톤 통합 카드 ══ */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>장비 / 악세서리</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.equipAccGrid}>
                {/* ── 왼쪽: 장비 6개 + 각인 ── */}
                <div className={styles.leftCol}>
                  <div className={styles.colLabel}>장비</div>
                  {data.equipmentItems.map((eq, i) => {
                    const ov = enhanceOverrides[i];
                    const baseName = shortenEquipName(eq.name, eq.type);
                    const displayName = ov !== undefined
                      ? baseName.replace(/^\+\d+/, `+${ov}`)
                      : baseName;
                    return (
                      <div key={i} className={styles.itemRow}>
                        {eq.icon && (
                          <img src={eq.icon} alt={eq.type} className={styles.itemIcon}
                            style={{ borderColor: getGradeColor(eq.grade) }} />
                        )}
                        <div className={styles.itemBody}>
                          <div className={styles.itemNameRow}>
                            <span className={styles.itemName} style={{ color: getGradeColor(eq.grade) }}>
                              {displayName}
                            </span>
                            {eq.transcendence > 0 && <span className={styles.tag}>초월 {eq.transcendence}</span>}
                          </div>
                          <div className={styles.qualRow}>
                            <div className={styles.qualTrack}>
                              <div className={styles.qualFill} style={{
                                width: `${eq.quality}%`, background: getQualityColor(eq.quality),
                              }} />
                            </div>
                            <span className={styles.qualNum} style={{ color: getQualityColor(eq.quality) }}>{eq.quality}</span>
                          </div>
                        </div>
                        <div className={styles.enhStepper}>
                          <button className={styles.enhBtn}
                            onClick={() => handleEnhance(i, -1)}
                            disabled={(ov ?? eq.enhanceLevel) <= 0}>
                            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                          </button>
                          <span className={styles.enhVal} style={ov !== undefined ? { color: '#8b5cf6' } : {}}>
                            +{ov ?? eq.enhanceLevel}
                          </span>
                          <button className={styles.enhBtn}
                            onClick={() => handleEnhance(i, 1)}
                            disabled={(ov ?? eq.enhanceLevel) >= 25}>
                            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* 각인 + 어빌리티 스톤 (가로 배치) */}
                  <div className={styles.engStoneRow}>
                    <div className={styles.engSection}>
                      <div className={styles.subDivider}><span>각인</span></div>
                      {engSlots.map((eng, i) => (
                        <div key={i} className={styles.engRow}>
                          {eng ? (
                            <>
                              {eng.icon && <img src={eng.icon} alt={eng.name} className={styles.engIcon} />}
                              <span className={styles.engName}>{eng.name}</span>
                              <span className={styles.engLvBadge} style={{
                                backgroundColor: getEngLevelColor(eng.level),
                                boxShadow: `0 0 6px ${getEngLevelColor(eng.level)}40`,
                              }}>
                                Lv.{eng.level}
                              </span>
                              <select className={styles.swapSm}
                                value={engOverrides[i] ?? eng.level}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setEngOverrides(prev => {
                                    const next = { ...prev };
                                    if (v === eng.level) delete next[i]; else next[i] = v;
                                    return next;
                                  });
                                }}>
                                {[0, 1, 2, 3, 4].map(lv => (
                                  <option key={lv} value={lv}>Lv.{lv}</option>
                                ))}
                              </select>
                              {engOverrides[i] !== undefined && <PowerDelta value={getEngDelta(i, engOverrides[i])} />}
                            </>
                          ) : (
                            <span className={styles.emptySlot}>빈 슬롯</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 어빌리티 스톤 (각인 오른쪽, 같은 디자인) */}
                    {data.abilityStone && (
                      <div className={styles.stoneSection}>
                        <div className={styles.subDivider}><span>스톤</span></div>
                        {data.abilityStone.engravings.map((e, j) => (
                          <div key={j} className={styles.engRow}>
                            {j === 0 && data.abilityStone!.icon && (
                              <img src={data.abilityStone!.icon} alt="스톤" className={styles.engIcon}
                                style={{ borderColor: getGradeColor(data.abilityStone!.grade) }} />
                            )}
                            {j !== 0 && <div style={{ width: 26, flexShrink: 0 }} />}
                            <span className={styles.engName}>{e.name}</span>
                            <span className={styles.engLvBadge} style={{
                              backgroundColor: '#3b82f6',
                              boxShadow: '0 0 6px rgba(59,130,246,0.25)',
                            }}>
                              +{e.level}
                            </span>
                          </div>
                        ))}
                        {data.abilityStone.reduction && (
                          <div className={styles.engRow}>
                            <div style={{ width: 26, flexShrink: 0 }} />
                            <span className={styles.engName} style={{ color: 'var(--text-muted)' }}>
                              {data.abilityStone.reduction.name}
                            </span>
                            <span className={styles.engLvBadge} style={{
                              backgroundColor: '#ef4444',
                              boxShadow: '0 0 6px rgba(239,68,68,0.25)',
                            }}>
                              -{data.abilityStone.reduction.level}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 세로 구분선 */}
                <div className={styles.colDivider} />

                {/* ── 오른쪽: 악세 5개 + 팔찌 + 스톤 ── */}
                <div className={styles.rightCol}>
                  <div className={styles.colLabel}>악세서리</div>
                  {data.accessoryItems.map((acc, i) => (
                    <div key={i} className={styles.itemRow}>
                      {acc.icon && (
                        <img src={acc.icon} alt={acc.type} className={styles.itemIcon}
                          style={{ borderColor: getGradeColor(acc.grade) }} />
                      )}
                      <div className={styles.itemBody}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName} style={{ color: getGradeColor(acc.grade) }}>
                            {acc.type}
                          </span>
                          {acc.quality > 0 && (
                            <span className={styles.qualBadge} style={{ color: getQualityColor(acc.quality) }}>{acc.quality}</span>
                          )}
                        </div>
                        <div className={styles.effectsCol}>
                          {acc.stats.map((s, j) => (
                            <div key={`s${j}`} className={styles.effectLine}>{s}</div>
                          ))}
                          {acc.grindingEffects.map((eff, j) => (
                            <GrindingEffect key={`g${j}`} text={eff.text} grade={eff.grade} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 팔찌 (6번째 아이템) */}
                  {data.braceletItem && (
                    <div className={styles.itemRow}>
                      {data.braceletItem.icon && (
                        <img src={data.braceletItem.icon} alt="팔찌" className={styles.itemIcon}
                          style={{ borderColor: getGradeColor(data.braceletItem.grade) }} />
                      )}
                      <div className={styles.itemBody}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName} style={{ color: getGradeColor(data.braceletItem.grade) }}>
                            팔찌
                          </span>
                        </div>
                        {bkwEffects.length > 0 && (
                          <div className={styles.braceletKeywords}>
                            {bkwEffects.map((e, j) => (
                              <span key={j} className={styles.braceletKw}>{e}</span>
                            ))}
                          </div>
                        )}
                        <div className={styles.effectsCol}>
                          {data.braceletItem.stats.map((s, j) => (
                            <div key={`s${j}`} className={styles.effectLine}>{s}</div>
                          ))}
                          {bOtherEffects.map((e, j) => (
                            <BraceletEffectLine key={`e${j}`} text={e} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </section>

          {/* ══ 보석 다이아몬드 ══ */}
          {gems.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>보석</h3>
                <span className={styles.badge}>{gems.length}개</span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.gemDiamond}>
                  {/* 상단: 왼쪽 2 + 오른쪽 2 */}
                  <div className={styles.gemDmRow}>
                    <div className={styles.gemPair}>
                      {[0, 1].map(i => renderGemCell(gemSlots[i], i))}
                    </div>
                    <div className={styles.gemPair}>
                      {[2, 3].map(i => renderGemCell(gemSlots[i], i))}
                    </div>
                  </div>
                  {/* 중앙: 3칸 */}
                  <div className={styles.gemDmCenter}>
                    {[4, 5, 6].map(i => renderGemCell(gemSlots[i], i))}
                  </div>
                  {/* 하단: 왼쪽 2 + 오른쪽 2 */}
                  <div className={styles.gemDmRow}>
                    <div className={styles.gemPair}>
                      {[7, 8].map(i => renderGemCell(gemSlots[i], i))}
                    </div>
                    <div className={styles.gemPair}>
                      {[9, 10].map(i => renderGemCell(gemSlots[i], i))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ══ 카드 + 아크패시브 ══ */}
          <div className={styles.bottomRow}>
            {data.cardSets.length > 0 && (
              <section className={`${styles.card} ${styles.cardFlex1}`}>
                <div className={styles.cardHead}><h3 className={styles.cardTitle}>카드</h3></div>
                <div className={styles.cardBody}>
                  {data.cardSets.map((card, i) => (
                    <div key={i} className={styles.cardSetRow}>
                      <span className={styles.cardSetName}>{card.name}</span>
                      <span className={styles.cardSetCount}>{card.activeCount}세트</span>
                      {card.awakening > 0 && <span className={styles.cardSetAwaken}>각성 {card.awakening}</span>}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {data.arkPassive && (
              <section className={`${styles.card} ${styles.cardFlex1}`}>
                <div className={styles.cardHead}><h3 className={styles.cardTitle}>아크 패시브</h3></div>
                <div className={styles.cardBody}>
                  <div className={styles.arkGrid}>
                    <div className={styles.arkItem}><div className={styles.arkLabel}>진화</div><div className={`${styles.arkVal} ${styles.arkEvo}`}>{data.arkPassive.evolution}</div></div>
                    <div className={styles.arkItem}><div className={styles.arkLabel}>깨달음</div><div className={`${styles.arkVal} ${styles.arkEnl}`}>{data.arkPassive.enlightenment}</div></div>
                    <div className={styles.arkItem}><div className={styles.arkLabel}>도약</div><div className={`${styles.arkVal} ${styles.arkLeap}`}>{data.arkPassive.leap}</div></div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ══ 아크 그리드 ══ */}
          {data.arkGrid && data.arkGrid.cores.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>아크 그리드</h3>
                <span className={styles.badge}>{data.arkGrid.cores.length}코어</span>
              </div>
              <div className={styles.cardBody}>
                {/* 효과 합산 */}
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
                {/* 코어 원형 배치 */}
                <div className={styles.agRing}>
                  {data.arkGrid.cores.map((core, i) => {
                    const angle = (i / data.arkGrid!.cores.length) * 360 - 90;
                    const rad = (angle * Math.PI) / 180;
                    return (
                      <div key={i} className={styles.agRingNode}
                        style={{
                          '--ag-x': `${50 + 38 * Math.cos(rad)}%`,
                          '--ag-y': `${50 + 38 * Math.sin(rad)}%`,
                        } as React.CSSProperties}>
                        <img src={core.icon} alt={core.name} className={styles.agRingIcon}
                          style={{ borderColor: getGradeColor(core.grade), boxShadow: `0 0 14px ${getGradeColor(core.grade)}40` }} />
                        <div className={styles.agRingName} style={{ color: getGradeColor(core.grade) }}>
                          {core.name.replace(/.*코어\s*:\s*/, '')}
                        </div>
                        <div className={styles.agRingPoint}>{core.point}P</div>
                      </div>
                    );
                  })}
                </div>
                {/* 디버그: 첫 번째 코어의 첫 번째 젬 raw tooltip */}
                {data.arkGrid.cores[0]?.gems[0]?._debug && (
                  <details style={{ marginBottom: '0.5rem', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                      [DEBUG] 젬 tooltip raw ({data.arkGrid.cores[0].gems[0].effects.length}개 효과 파싱됨)
                    </summary>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflow: 'auto', padding: '0.5rem', background: 'var(--card-body-bg-stone)', borderRadius: '6px', marginTop: '0.3rem' }}>
                      {data.arkGrid.cores[0].gems[0]._debug}
                    </pre>
                  </details>
                )}
                {/* 코어별 상세 (젬 포함) */}
                <div className={styles.agCoreList}>
                  {data.arkGrid.cores.map((core, i) => (
                    <div key={i} className={styles.agCoreCard}>
                      <div className={styles.agCoreCardHead}>
                        <img src={core.icon} alt={core.name} className={styles.agCoreCardIcon}
                          style={{ borderColor: getGradeColor(core.grade) }} />
                        <div>
                          <div className={styles.agCoreCardName} style={{ color: getGradeColor(core.grade) }}>
                            {core.name.replace(/.*코어\s*:\s*/, '')}
                          </div>
                          <div className={styles.agCoreCardMeta}>
                            <span>{core.coreType}</span>
                            <span className={styles.agCoreCardPt}>{core.point}P / 20P</span>
                            <span>의지력 {core.willpower}</span>
                          </div>
                        </div>
                      </div>
                      {/* 젬 리스트 */}
                      {core.gems.length > 0 && (
                        <div className={styles.agGemList}>
                          {core.gems.map((gem, j) => (
                            <div key={j} className={styles.agGemItem}>
                              <img src={gem.icon} alt="" className={styles.agGemItemIcon}
                                style={{ borderColor: getGradeColor(gem.grade) }} />
                              <div className={styles.agGemItemBody}>
                                <div className={styles.agGemItemNameRow}>
                                  <span className={styles.agGemItemName} style={{ color: getGradeColor(gem.grade) }}>
                                    {gem.name}
                                  </span>
                                </div>
                                <div className={styles.agGemPointRow}>
                                  {gem.point > 0 && (
                                    <span className={styles.agGemPtTotal}>{gem.point}pt</span>
                                  )}
                                  {gem.orderPoint > 0 && (
                                    <span className={styles.agGemPtOrder}>질서 {gem.orderPoint}</span>
                                  )}
                                  {gem.chaosPoint > 0 && (
                                    <span className={styles.agGemPtChaos}>혼돈 {gem.chaosPoint}</span>
                                  )}
                                </div>
                                {gem.effects.length > 0 ? (
                                  <div className={styles.agGemEffList}>
                                    {gem.effects.map((eff, k) => {
                                      const m = eff.match(/^(.+?)\s*(\+[\d.]+%?)$/);
                                      // "질서 3" / "혼돈 2" 형태
                                      const numOnly = eff.match(/^(.+?)\s+(\d+)$/);
                                      if (m) {
                                        return (
                                          <div key={k} className={styles.agGemEffRow}>
                                            <span className={styles.agGemEffLabel}>{m[1]}</span>
                                            <span className={styles.agGemEffVal}>{m[2]}</span>
                                          </div>
                                        );
                                      } else if (numOnly) {
                                        const isOrder = eff.includes('질서');
                                        const isChaos = eff.includes('혼돈');
                                        return (
                                          <div key={k} className={styles.agGemEffRow}>
                                            <span className={styles.agGemEffLabel}>{numOnly[1]}</span>
                                            <span className={styles.agGemEffVal} style={
                                              isOrder ? { color: '#3b82f6' } :
                                              isChaos ? { color: '#ef4444' } : {}
                                            }>{numOnly[2]}</span>
                                          </div>
                                        );
                                      }
                                      return <div key={k} className={styles.agGemEffRow}>{eff}</div>;
                                    })}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    효과 정보 없음
                                  </div>
                                )}
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
