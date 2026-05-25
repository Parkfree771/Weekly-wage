'use client';

import { useCallback } from 'react';
import type { CharacterData, EngravingInfo, GemInfo } from '@/lib/characterData';
import { getGradeColor } from '@/lib/characterData';
import styles from '@/app/character/character.module.css';

type Props = { data: CharacterData };

function getQualityColor(q: number): string {
  if (q >= 100) return '#ff9800';
  if (q >= 90) return '#9c27b0';
  if (q >= 70) return '#2196f3';
  if (q >= 30) return '#4caf50';
  return '#9e9e9e';
}

// 아크그리드 코어 등급별 배경 그라데이션 (이미지 참고: 고대=베이지, 유물=어두운→오렌지)
function getCoreGradeGradient(grade: string): string {
  switch (grade) {
    case '고대':
      return 'linear-gradient(180deg, #f4e6c1 0%, #c19a5c 100%)';
    case '유물':
      return 'linear-gradient(180deg, #1a0c03 0%, #d97706 100%)';
    case '전설':
      return 'linear-gradient(180deg, #2a2102 0%, #facc15 100%)';
    case '영웅':
      return 'linear-gradient(180deg, #2a0f3a 0%, #a855f7 100%)';
    case '희귀':
      return 'linear-gradient(180deg, #0f1f3a 0%, #3b82f6 100%)';
    default:
      return 'var(--card-body-bg-stone)';
  }
}

// 코어 진영(질서/혼돈) 색상 추출 — 이름에 포함된 키워드로 판단
// (질서=빨강, 혼돈=파랑 — 사용자 요청)
function getFactionColor(coreName: string): { color: string; label: string } {
  if (coreName.includes('질서')) return { color: '#ef4444', label: '질서' };
  if (coreName.includes('혼돈')) return { color: '#3b82f6', label: '혼돈' };
  return { color: 'var(--text-muted)', label: '' };
}

function gradeColor(grade: string): string {
  if (grade === '상') return 'var(--grade-high, #f59e0b)';
  if (grade === '중') return 'var(--grade-mid, #7c3aed)';
  if (grade === '하') return 'var(--grade-low, #2563eb)';
  return 'var(--text-secondary)';
}

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
export default function CharacterDashboard({ data }: Props) {
  const { profile, combatStats } = data;

  // 힘/민/지 중 해당 캐릭의 주 스탯만 표시하도록 필터
  const filterStatsByMain = useCallback((stats: string[]) => {
    return stats.filter(s => {
      const m = s.match(/^(힘|민첩|지능)/);
      return !m || m[1] === profile.mainStatType;
    });
  }, [profile.mainStatType]);

  const braceletKeywords = data.braceletItem?.keywords || [];

  const gems = data.gems;
  const gemSlots: (GemInfo | null)[] = Array.from({ length: 11 }, (_, i) => gems[i] || null);

  const engSlots: (EngravingInfo | null)[] = [];
  for (let i = 0; i < 5; i++) engSlots.push(data.engravings[i] || null);

  const renderGemCell = (gem: GemInfo | null, idx: number) => {
    if (!gem) return <div key={`empty-${idx}`} className={styles.gemCellEmpty} style={{ width: 120 }} />;
    const isAtk = gem.type === '멸화' || gem.type === '겁화';
    const gc = isAtk ? '#ef4444' : '#3b82f6';
    return (
      <div key={idx} className={styles.gemCell} style={{ width: 120, gap: '0.35rem' }}>
        <div className={styles.gemCellIconWrap} style={{ boxShadow: `0 2px 8px ${gc}30` }}>
          {gem.icon && <img src={gem.icon} alt={gem.type} className={styles.gemCellImg} style={{ borderColor: gc }} />}
          <span className={styles.gemCellLv} style={{ background: gc }}>{gem.level}</span>
        </div>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: gc, lineHeight: 1.2 }}>{gem.type}</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: '100%',
            minWidth: 0,
          }}
          title={gem.skillName}
        >
          {gem.skillIcon && (
            <img
              src={gem.skillIcon}
              alt={gem.skillName || '스킬'}
              style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {gem.skillName || '-'}
          </span>
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
              {profile.characterImage ? (
                <img
                  src={profile.characterImage}
                  alt={profile.characterName}
                  className={styles.profileImg}
                />
              ) : (
                <div className={styles.profileImgEmpty}>?</div>
              )}
              {profile.title?.includes('심연의 군주') && (
                <img
                  src="/cldgh/tladus.webp"
                  alt="심연의 군주"
                  style={{
                    position: 'absolute',
                    bottom: '2%',
                    left: '2%',
                    width: 56,
                    height: 'auto',
                    pointerEvents: 'none',
                    zIndex: 2,
                    filter: 'drop-shadow(0 1px 4px rgba(232, 114, 42, 0.6))',
                  }}
                />
              )}
              {profile.title?.includes('혹한의 군주') && (
                <img
                  src="/cldgh/ghrgks.webp"
                  alt="혹한의 군주"
                  style={{
                    position: 'absolute',
                    bottom: '2%',
                    left: '2%',
                    width: 56,
                    height: 'auto',
                    pointerEvents: 'none',
                    zIndex: 2,
                    filter: 'drop-shadow(0 1px 4px rgba(59, 130, 246, 0.6))',
                  }}
                />
              )}
              {profile.title?.includes('홍염의 군주') && (
                <img
                  src="/cldgh/ghddua.webp"
                  alt="홍염의 군주"
                  style={{
                    position: 'absolute',
                    bottom: '2%',
                    left: '2%',
                    width: 56,
                    height: 'auto',
                    pointerEvents: 'none',
                    zIndex: 2,
                    filter: 'drop-shadow(0 1px 4px rgba(239, 68, 68, 0.6))',
                  }}
                />
              )}
              {profile.title?.includes('돌로리스') && (
                <img
                  src="/cldgh/ehffh.webp"
                  alt="돌로리스"
                  style={{
                    position: 'absolute',
                    bottom: '2%',
                    left: '2%',
                    width: 56,
                    height: 'auto',
                    pointerEvents: 'none',
                    zIndex: 2,
                    filter: 'brightness(1.5) saturate(1.4) drop-shadow(0 0 6px rgba(192, 132, 252, 0.9)) drop-shadow(0 0 12px rgba(168, 85, 247, 0.5))',
                  }}
                />
              )}
              {profile.title?.includes('에스더의 후계자') && (
                <img
                  src="/cldgh/dptmej.webp"
                  alt="에스더의 후계자"
                  style={{
                    position: 'absolute',
                    bottom: '2%',
                    left: '2%',
                    width: 56,
                    height: 'auto',
                    pointerEvents: 'none',
                    zIndex: 2,
                    filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.8)) drop-shadow(0 0 12px rgba(34, 211, 238, 0.5))',
                  }}
                />
              )}
            </div>
            <div className={styles.profileBody}>
              {profile.title && (
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-accent)',
                    fontWeight: 700,
                    marginBottom: 2,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {profile.title}
                </div>
              )}
              <h2 className={styles.profileName} style={{ marginBottom: 4 }}>
                {profile.characterName}
              </h2>
              {/* 부속 정보 inline: 직업 · 서버 · 길드 */}
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  marginBottom: '0.9rem',
                  lineHeight: 1.4,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.35rem',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{profile.className}</span>
                {profile.serverName && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{profile.serverName}</span>
                  </>
                )}
                {profile.guildName && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                      {profile.guildName}
                    </span>
                  </>
                )}
              </div>

              {/* 메인 스탯: 아이템 레벨 + 전투력 (메인 페이지 입체 그림자 스타일) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.6rem',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    padding: '0.55rem 0.7rem 0.65rem',
                    background: 'linear-gradient(135deg, rgba(59, 80, 181, 0.14) 0%, rgba(90, 111, 214, 0.04) 60%, transparent 100%)',
                    border: '2px solid rgba(59, 80, 181, 0.35)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow:
                      '2px 2px 0 0 rgba(59, 80, 181, 0.3), 4px 4px 0 0 rgba(59, 80, 181, 0.18), 6px 6px 0 0 rgba(59, 80, 181, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.62rem',
                      color: 'var(--text-muted)',
                      fontWeight: 800,
                      marginBottom: 3,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    아이템 레벨
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      fontVariantNumeric: 'tabular-nums',
                      background: 'linear-gradient(135deg, #3b50b5 0%, #5a6fd6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {profile.itemLevel.toLocaleString()}
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    padding: '0.55rem 0.7rem 0.65rem',
                    background: 'linear-gradient(135deg, rgba(232, 114, 42, 0.16) 0%, rgba(245, 158, 11, 0.04) 60%, transparent 100%)',
                    border: '2px solid rgba(232, 114, 42, 0.4)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow:
                      '2px 2px 0 0 rgba(232, 114, 42, 0.32), 4px 4px 0 0 rgba(232, 114, 42, 0.18), 6px 6px 0 0 rgba(232, 114, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.62rem',
                      color: 'var(--text-muted)',
                      fontWeight: 800,
                      marginBottom: 3,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    전투력
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      fontVariantNumeric: 'tabular-nums',
                      background: 'linear-gradient(135deg, #e8722a 0%, #f59e0b 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {profile.combatPower > 0 ? profile.combatPower.toLocaleString() : '-'}
                  </div>
                </div>
              </div>

              {/* 보조 스탯: 원정대 + 전투 특성 6종 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>원정대</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Lv. {profile.expeditionLevel || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>치명</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.crit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>특화</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.specialization}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>신속</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.swiftness}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>제압</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.domination}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>인내</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.endurance}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>숙련</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{combatStats.expertise}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ 아크 그리드 (사이드바 폭) ══ */}
          {data.arkGrid && data.arkGrid.cores.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>아크 그리드</h3>
                <span className={styles.badge}>{data.arkGrid.cores.length}코어</span>
              </div>
              <div className={styles.cardBody} style={{ padding: '0.85rem' }}>
                {/* 질서 1줄 / 혼돈 1줄 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {(['질서', '혼돈'] as const).map(factionKey => {
                    const factionCores = data.arkGrid!.cores.filter(c => c.name.includes(factionKey));
                    if (factionCores.length === 0) return null;
                    return (
                      <div
                        key={factionKey}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${factionCores.length}, 1fr)`,
                          gap: '0.4rem',
                        }}
                      >
                        {factionCores.map((core, i) => {
                          const gradeColor = getGradeColor(core.grade);
                          const faction = getFactionColor(core.name);
                          const bgGradient = getCoreGradeGradient(core.grade);
                          const isLightBg = core.grade === '고대';
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  width: 60,
                                  height: 60,
                                  borderRadius: '50%',
                                  background: bgGradient,
                                  border: `2.5px solid ${faction.color}`,
                                  boxShadow: `0 0 12px ${faction.color}55`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <img
                                  src={core.icon}
                                  alt={core.name}
                                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'contain' }}
                                />
                                {faction.label && (
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: -6,
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      fontSize: '0.55rem',
                                      fontWeight: 800,
                                      color: '#fff',
                                      background: faction.color,
                                      padding: '0.05rem 0.4rem',
                                      borderRadius: 5,
                                      letterSpacing: '0.02em',
                                      whiteSpace: 'nowrap',
                                      boxShadow: `0 1px 4px ${faction.color}66`,
                                    }}
                                  >
                                    {faction.label}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  marginTop: 4,
                                }}
                                title={core.name.replace(/.*코어\s*:\s*/, '')}
                              >
                                {core.name.replace(/.*코어\s*:\s*/, '')}
                              </div>
                              {core.grade && (
                                <div
                                  style={{
                                    fontSize: '0.55rem',
                                    fontWeight: 800,
                                    color: isLightBg ? '#1a0c03' : '#fff',
                                    background: bgGradient,
                                    padding: '0.05rem 0.4rem',
                                    borderRadius: 4,
                                    letterSpacing: '0.02em',
                                    border: `1px solid ${gradeColor}55`,
                                    textShadow: isLightBg ? 'none' : '0 1px 2px rgba(0,0,0,0.4)',
                                  }}
                                >
                                  {core.grade}
                                </div>
                              )}
                              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981' }}>{core.point}P</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* 효과 요약 — 아피강 / 추피 / 낙인력 / 공격력 / 보스 피해 */}
                {data.arkGrid.effects.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      marginTop: '0.9rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    {data.arkGrid.effects.map((eff, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          padding: '0.35rem 0.6rem',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{eff.name}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--color-primary)' }}>Lv.{eff.level}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
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
                    const enhLv = eq.enhanceLevel;
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

                          {/* 각인 이름 + 다이아몬드(고정) + 스톤Lv(고정) */}
                          {engSlots.map((eng, i) => {
                            if (!eng) return null;
                            const currentLv = eng.level;
                            const angle = (i / 5) * 360 - 90;
                            const rad = (angle * Math.PI) / 180;
                            const stoneEng = data.abilityStone?.engravings.find(se => se.name === eng.name);
                            const stoneLv = eng.abilityStoneLevel ?? 0;
                            return (
                              <div key={i} className={styles.engCircleControls} style={{ '--eng-x': `${50 + 39 * Math.cos(rad)}%`, '--eng-y': `${50 + 39 * Math.sin(rad)}%` } as React.CSSProperties}>
                                <span className={styles.engCircleName}>{eng.name}</span>
                                <div className={styles.engCircleDiamonds}>
                                  {[1, 2, 3, 4].map(lv => (
                                    <span key={lv} className={styles.engDiamond}
                                      style={{ color: lv <= currentLv ? '#f43c06' : '#4b5563', cursor: 'default' }}
                                    >◆</span>
                                  ))}
                                </div>
                                {stoneEng && (
                                  <div className={styles.engStoneLvStepper}>
                                    <span className={styles.engStoneLvVal}>Lv.{stoneLv}</span>
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
                  {data.accessoryItems.map((acc, i) => (
                    <div key={i} className={styles.itemRow}>
                      {acc.icon && <img src={acc.icon} alt={acc.type} className={styles.itemIcon} style={{ borderColor: getGradeColor(acc.grade) }} />}
                      <div className={styles.itemBody}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName} style={{ color: getGradeColor(acc.grade) }}>{acc.type}</span>
                          {acc.quality > 0 && <span className={styles.qualBadge} style={{ color: getQualityColor(acc.quality) }}>{acc.quality}</span>}
                        </div>
                        <div className={styles.effectsCol}>
                          {filterStatsByMain(acc.stats).map((s, j) => <div key={`s${j}`} className={styles.statLine}>{s}</div>)}
                          {acc.grindingEffects.map((eff, j) => (
                            <div key={`g${j}`} className={styles.statLine}>
                              <GrindingEffect text={eff.text} grade={eff.grade} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

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
                        </div>
                        <div className={styles.effectsCol}>
                          {filterStatsByMain(data.braceletItem.stats).map((s, j) => <div key={`s${j}`} className={styles.statLine}>{s}</div>)}
                          {data.bracelet.map((eff, i) => (
                            <div key={`b${i}`} className={styles.statLine}><BraceletEffectLine text={eff.name} grade={eff.grade} /></div>
                          ))}
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
                          { type: 'evolution' as const, label: '진화', cls: styles.arkEvo, catColor: '#f59e0b' },
                          { type: 'enlightenment' as const, label: '깨달음', cls: styles.arkEnl, catColor: '#83e9ff' },
                          { type: 'leap' as const, label: '도약', cls: styles.arkLeap, catColor: '#c2ea55' },
                        ]).map(({ type, label, cls, catColor }) => {
                          const val = data.arkPassive![type];
                          const pointInfo = data.arkPassive!.points.find(p => p.name.includes(label));
                          const catEffects = data.arkPassive!.effects.filter(e => e.category === label);
                          return (
                            <div key={type} className={styles.arkCol}>
                              <div className={styles.arkColHeader} style={{ borderBottomColor: catColor }}>
                                <span className={`${styles.arkColLabel} ${cls}`}>{label}</span>
                                <span className={`${styles.arkColVal} ${cls}`}>{val}</span>
                                {pointInfo?.description && (
                                  <span className={styles.arkColDesc}>{pointInfo.description}</span>
                                )}
                              </div>
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
                  <div className={styles.gemDmRow} style={{ gap: '3rem' }}>
                    <div className={styles.gemPair}>{[0, 1].map(i => renderGemCell(gemSlots[i], i))}</div>
                    <div className={styles.gemPair}>{[2, 3].map(i => renderGemCell(gemSlots[i], i))}</div>
                  </div>
                  <div className={styles.gemDmCenter}>{[4, 5, 6].map(i => renderGemCell(gemSlots[i], i))}</div>
                  <div className={styles.gemDmRow} style={{ gap: '3rem' }}>
                    <div className={styles.gemPair}>{[7, 8].map(i => renderGemCell(gemSlots[i], i))}</div>
                    <div className={styles.gemPair}>{[9, 10].map(i => renderGemCell(gemSlots[i], i))}</div>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
