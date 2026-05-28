'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterData, EngravingInfo, GemInfo, SiblingCharacter } from '@/lib/characterData';
import { getGradeColor } from '@/lib/characterData';
import styles from '@/app/character/character.module.css';
import TitleBadge from './TitleBadge';

type Props = {
  data: CharacterData;
  onCharacterSelect?: (name: string) => void;
};

function getQualityColor(q: number): string {
  if (q >= 100) return '#ff9800';
  if (q >= 90) return '#9c27b0';
  if (q >= 70) return '#2196f3';
  if (q >= 30) return '#4caf50';
  return '#9e9e9e';
}

// 아크그리드 코어 등급별 배경 (로아 등급 색 기준, 같은 색조 안에서 dark→light)
function getCoreGradeGradient(grade: string): string {
  switch (grade) {
    case '고대':
      return 'linear-gradient(180deg, #f5e8c8 0%, #c19a5c 100%)'; // 베이지
    case '유물':
      return 'linear-gradient(180deg, #7c2d12 0%, #d97706 100%)'; // 어두운 주황
    case '전설':
      return 'linear-gradient(180deg, #713f12 0%, #ca8a04 100%)'; // 어두운 노랑
    case '영웅':
      return 'linear-gradient(180deg, #4c1d95 0%, #a855f7 100%)'; // 보라
    case '희귀':
      return 'linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%)'; // 파랑
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
export default function CharacterDashboard({ data, onCharacterSelect }: Props) {
  const { profile, combatStats } = data;

  // 보석 hover 툴팁
  const [hoveredGem, setHoveredGem] = useState<{ gem: GemInfo; x: number; y: number } | null>(null);

  // 원정대 펼치기
  const [siblingsExpanded, setSiblingsExpanded] = useState(false);

  // 모바일 여부 (원정대 기본 접힘 등에 사용)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleGemEnter = (e: React.MouseEvent<HTMLDivElement>, gem: GemInfo) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHoveredGem({ gem, x: r.left + r.width / 2, y: r.top });
  };
  const handleGemLeave = () => setHoveredGem(null);

  // 힘/민/지 중 해당 캐릭의 주 스탯만 표시하도록 필터
  const filterStatsByMain = useCallback((stats: string[]) => {
    return stats.filter(s => {
      const m = s.match(/^(힘|민첩|지능)/);
      return !m || m[1] === profile.mainStatType;
    });
  }, [profile.mainStatType]);

  const braceletKeywords = data.braceletItem?.keywords || [];

  const gems = data.gems;

  // 같은 스킬 보석이 시각적으로 인접한 슬롯에 들어가도록 배치
  // 다이아몬드 슬롯: 상단 4(0~3, 페어 [0,1]/[2,3]) + 중앙 3(4~6) + 하단 4(7~10, 페어 [7,8]/[9,10])
  const gemSlots: (GemInfo | null)[] = (() => {
    const typeOrder: Record<string, number> = { '겁화': 0, '멸화': 0, '작열': 1, '홍염': 1 };

    // 스킬별 그룹핑
    const groupsMap = new Map<string, GemInfo[]>();
    gems.forEach((g, i) => {
      const key = g.skillName || `__lone_${i}__`;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(g);
    });
    // 각 그룹 내부: 공격형(겁화/멸화) → 쿨감형(작열/홍염)
    groupsMap.forEach((list) =>
      list.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99)),
    );

    const groups = Array.from(groupsMap.values());
    const pairs = groups.filter((g) => g.length === 2);
    const others = groups.filter((g) => g.length !== 2);
    // 페어는 총 레벨 내림차순 (높은 레벨 페어가 위쪽으로)
    pairs.sort((a, b) => b[0].level + b[1].level - (a[0].level + a[1].level));

    const result: (GemInfo | null)[] = Array(11).fill(null);
    const pairSlotPairs: [number, number][] = [[0, 1], [2, 3], [7, 8], [9, 10]];
    let pairIdx = 0;

    // 페어 우선: 4개 페어 슬롯에 채움
    while (pairIdx < pairSlotPairs.length && pairs.length > 0) {
      const pair = pairs.shift()!;
      const [s1, s2] = pairSlotPairs[pairIdx++];
      result[s1] = pair[0];
      result[s2] = pair[1];
    }

    // 남은 보석 (페어 오버플로우 + 단일/3+): 중앙 3슬롯 우선 충전 (스킬 단위로 인접 유지)
    const remaining: GemInfo[] = [];
    pairs.forEach((p) => remaining.push(...p));
    others.forEach((o) => remaining.push(...o));

    const midSlots = [4, 5, 6];
    let midIdx = 0;
    while (midIdx < midSlots.length && remaining.length > 0) {
      result[midSlots[midIdx++]] = remaining.shift()!;
    }
    // 그래도 남으면 비어있는 페어 슬롯에 채움
    while (remaining.length > 0 && pairIdx < pairSlotPairs.length) {
      const [s1, s2] = pairSlotPairs[pairIdx++];
      if (remaining.length > 0) result[s1] = remaining.shift()!;
      if (remaining.length > 0) result[s2] = remaining.shift()!;
    }

    return result;
  })();

  const engSlots: (EngravingInfo | null)[] = [];
  for (let i = 0; i < 5; i++) engSlots.push(data.engravings[i] || null);

  const renderGemCell = (gem: GemInfo | null, idx: number) => {
    if (!gem) return <div key={`empty-${idx}`} className={styles.gemCellEmpty} style={{ width: 120 }} />;
    const isAtk = gem.type === '멸화' || gem.type === '겁화';
    const gc = isAtk ? '#ef4444' : '#3b82f6';
    return (
      <div
        key={idx}
        className={styles.gemCell}
        style={{ width: 120, gap: '0.35rem' }}
        onMouseEnter={(e) => handleGemEnter(e, gem)}
        onMouseLeave={handleGemLeave}
      >
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
              {profile.emblems && profile.emblems.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2%',
                    left: '2%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    zIndex: 2,
                    pointerEvents: 'none',
                  }}
                >
                  {profile.emblems.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="휘장"
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.5))',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className={styles.profileBody}>
              <div className={styles.profileTopRow}>
                <div className={styles.profileTopInfo}>
              {profile.title && (
                <div style={{ marginBottom: 4 }}>
                  <TitleBadge title={profile.title} />
                </div>
              )}
              <h2 className={styles.profileName} style={{ marginBottom: 4 }}>
                {profile.characterName}
              </h2>
              {/* 부속 정보: 데스크탑은 직업·서버·길드 inline, 모바일은 각 줄 */}
              <div className={styles.profileMetaInline}>
                <span className={styles.profileMetaClass}>{profile.className}</span>
                {profile.serverName && (
                  <>
                    <span className={styles.profileMetaDot}>·</span>
                    <span>{profile.serverName}</span>
                  </>
                )}
                {profile.guildName && (
                  <>
                    <span className={styles.profileMetaDot}>·</span>
                    <span className={styles.profileMetaGuild}>{profile.guildName}</span>
                  </>
                )}
              </div>
              {/* 원정대 레벨 (직업 라인 바로 아래) */}
              <div
                className={styles.profileExpeditionLine}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  marginBottom: '0.9rem',
                  lineHeight: 1.3,
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>원정대</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Lv. {profile.expeditionLevel || '-'}</span>
              </div>
                </div>

              {/* 메인 스탯: 아이템 레벨 + 전투력 (메인 페이지 입체 그림자 스타일) */}
              <div className={styles.profileMainStats}>
                <div
                  className={styles.profileMainStatCard}
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 80, 181, 0.14) 0%, rgba(90, 111, 214, 0.04) 60%, transparent 100%)',
                    border: '2px solid rgba(59, 80, 181, 0.35)',
                    boxShadow:
                      '2px 2px 0 0 rgba(59, 80, 181, 0.3), 4px 4px 0 0 rgba(59, 80, 181, 0.18), 6px 6px 0 0 rgba(59, 80, 181, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <div className={styles.profileMainStatLabel}>아이템 레벨</div>
                  <div
                    className={styles.profileMainStatValue}
                    style={{
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
                  className={styles.profileMainStatCard}
                  style={{
                    background: 'linear-gradient(135deg, rgba(232, 114, 42, 0.16) 0%, rgba(245, 158, 11, 0.04) 60%, transparent 100%)',
                    border: '2px solid rgba(232, 114, 42, 0.4)',
                    boxShadow:
                      '2px 2px 0 0 rgba(232, 114, 42, 0.32), 4px 4px 0 0 rgba(232, 114, 42, 0.18), 6px 6px 0 0 rgba(232, 114, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <div className={styles.profileMainStatLabel}>전투력</div>
                  <div
                    className={styles.profileMainStatValue}
                    style={{
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
              </div>

              {/* 보조 스탯: 전투 특성 6종 (원정대는 위 직업 라인 아래로 이동) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                }}
              >
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

          {/* ══ 누적 칭호 (사이드바 폭) ══ */}
          {data.titlesHistory && data.titlesHistory.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>획득 칭호</h3>
                <span className={styles.badge}>{data.titlesHistory.length}</span>
              </div>
              <div
                className={styles.cardBody}
                style={{
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                {data.titlesHistory.map((t, i) => (
                  <div
                    key={`${t.title}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '2.1em',
                    }}
                  >
                    <TitleBadge title={t.title} fontSize="0.95rem" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ══ 아크 그리드 (사이드바 폭) ══ */}
          {data.arkGrid && data.arkGrid.cores.length > 0 && (
            <section className={styles.card} style={{ overflow: 'visible' }}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>아크 그리드</h3>
                <span className={styles.badge}>{data.arkGrid.cores.length}코어</span>
              </div>
              <div className={styles.cardBody} style={{ padding: '0.85rem', overflow: 'visible' }}>
                {/* 질서 1줄 / 혼돈 1줄 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {(['질서', '혼돈'] as const).map(factionKey => {
                    const factionCores = data.arkGrid!.cores.filter(c => c.name.includes(factionKey));
                    if (factionCores.length === 0) return null;
                    return (
                      <div
                        key={factionKey}
                        className={styles.coreFactionRow}
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
                          const cleanCoreName = core.name.replace(/.*코어\s*:\s*/, '');
                          return (
                            <div
                              key={i}
                              className={styles.coreWrapper}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 3,
                                minWidth: 0,
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
                                  width: '100%',
                                  marginTop: 4,
                                }}
                                title={cleanCoreName}
                              >
                                {cleanCoreName}
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

                              {/* Hover 툴팁 — 코어 풀네임 + 등급 + 포인트 */}
                              <div className={styles.coreTooltip}>
                                <div className={styles.coreTooltipHead} style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                                  <img
                                    src={core.icon}
                                    alt={core.name}
                                    className={styles.coreTooltipIcon}
                                    style={{ background: bgGradient }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div className={styles.coreTooltipName}>{cleanCoreName}</div>
                                    <div className={styles.coreTooltipSub}>
                                      {core.grade && <span>{core.grade} · </span>}
                                      <span style={{ color: '#10b981', fontWeight: 800 }}>{core.point}P</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
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

          {/* ══ 원정대 형제 캐릭터 ══ */}
          {data.siblings && data.siblings.length > 0 && (() => {
            const sorted = [...data.siblings].sort((a, b) => b.itemLevel - a.itemLevel);
            const collapsedCount = isMobile ? 0 : 10;
            const visible = siblingsExpanded ? sorted : sorted.slice(0, collapsedCount);
            const hidden = sorted.length - visible.length;
            const byServer = new Map<string, SiblingCharacter[]>();
            for (const s of visible) {
              if (!byServer.has(s.serverName)) byServer.set(s.serverName, []);
              byServer.get(s.serverName)!.push(s);
            }
            return (
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>원정대</h3>
                  <span className={styles.badge}>{sorted.length}캐릭</span>
                </div>
                <div className={styles.cardBody} style={{ padding: '0.6rem 0.7rem 0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {Array.from(byServer.entries()).map(([server, list]) => (
                      <div key={server}>
                        <div
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            color: 'var(--text-muted)',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '0 2px 5px',
                            borderBottom: '1px solid var(--border-color)',
                            marginBottom: 5,
                          }}
                        >
                          {server}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {list.map((s) => {
                            const isCurrent = s.characterName === profile.characterName;
                            return (
                              <div
                                key={s.characterName}
                                role={isCurrent ? undefined : 'button'}
                                tabIndex={isCurrent ? undefined : 0}
                                className={`${styles.siblingRow} ${isCurrent ? styles.siblingRowCurrent : ''}`}
                                onClick={isCurrent ? undefined : () => onCharacterSelect?.(s.characterName)}
                                onKeyDown={isCurrent ? undefined : (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onCharacterSelect?.(s.characterName);
                                  }
                                }}
                              >
                                <div className={styles.siblingBody}>
                                  <span className={`${styles.siblingName} ${isCurrent ? styles.siblingNameCurrent : ''}`}>
                                    {s.characterName}
                                  </span>
                                  <span className={styles.siblingClass}>{s.className}</span>
                                </div>
                                <span className={`${styles.siblingItemLv} ${isCurrent ? styles.siblingItemLvCurrent : ''}`}>
                                  {s.itemLevel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(hidden > 0 || siblingsExpanded) && (
                    <button
                      type="button"
                      onClick={() => setSiblingsExpanded((x) => !x)}
                      style={{
                        width: '100%',
                        marginTop: '0.7rem',
                        padding: '0.45rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      {siblingsExpanded ? '접기 ▲' : `더 보기 ${hidden}개 ▼`}
                    </button>
                  )}
                </div>
              </section>
            );
          })()}
        </aside>

        <div className={styles.specCol}>
          {/* ══ 장비 + 악세 ══ */}
          <section className={styles.card}>
            <div className={styles.cardHead}><h3 className={styles.cardTitle}>장비 / 악세서리</h3></div>
            <div className={styles.cardBody}>
              <div className={styles.equipAccGrid}>
                <div className={styles.equipBlock}>
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

                </div>

                <div className={styles.colDivider} />

                <div className={styles.accBlock}>
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
                </div>

                {/* ══ 팔찌 (모바일: 풀폭 단독 칸 / 데스크탑: 악세 아래) ══ */}
                {data.braceletItem && (
                  <div className={styles.braceletSection}>
                    <div className={styles.subDivider}><span>팔찌</span></div>
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
                  </div>
                )}

                {/* ══ 각인 + 어빌리티 스톤 원형 (모바일: 팔찌 아래 풀폭 / 데스크탑: 장비 아래) ══ */}
                {(engSlots.some(e => e) || data.abilityStone) && (
                  <div className={styles.engSection}>
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
                  </div>
                )}
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

        </div>
      </div>

      {hoveredGem && typeof document !== 'undefined' && createPortal(
        (() => {
          const { gem, x, y } = hoveredGem;
          const isAtk = gem.type === '멸화' || gem.type === '겁화';
          const gc = isAtk ? '#ef4444' : '#3b82f6';
          return (
            <div
              style={{
                position: 'fixed',
                left: x,
                top: y - 14,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999,
                pointerEvents: 'none',
                width: 400,
                maxWidth: 'calc(100vw - 24px)',
                background: 'var(--card-bg, #1a1a1f)',
                border: `1.5px solid ${gc}`,
                borderRadius: 12,
                boxShadow: '0 10px 32px rgba(0,0,0,0.5)',
                padding: '1rem 1.1rem 1.05rem',
                color: 'var(--text-primary)',
              }}
            >
              {/* 헤더: 보석 + 스킬 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                {gem.icon && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={gem.icon} alt={gem.type} style={{ width: 56, height: 56, borderRadius: 8, border: `2px solid ${gc}`, objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', bottom: -5, right: -5, fontSize: '0.7rem', fontWeight: 800, color: '#fff', background: gc, padding: '1px 6px', borderRadius: 5, lineHeight: '14px' }}>{gem.level}</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {gem.skillIcon && <img src={gem.skillIcon} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gem.skillName || '-'}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: gc }}>{gem.type} {gem.level}레벨</span>
                </div>
              </div>

              {/* 트라이포드 — 선택한 이름만 표시 */}
              {gem.tripods && gem.tripods.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {gem.tripods.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', background: '#6b7280', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: t.lock ? 'var(--text-muted)' : '#fbbf24' }}>{t.name}</span>
                      {t.lock && <span style={{ fontSize: '0.6rem', background: '#374151', color: '#fff', padding: '0 4px', borderRadius: 4 }}>🔒</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>트라이포드 정보 없음</div>
              )}
            </div>
          );
        })(),
        document.body,
      )}
    </div>
  );
}
