'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  SKILLS,
  ELEMENT_LIST,
  TIER_ORDER,
  TIER_COLORS,
  getElementColor,
  type Element,
  type Tier,
  type SkillDef,
} from './skillData';
import styles from './skills.module.css';

const SkillEffectCanvas = dynamic(() => import('./SkillEffectCanvas'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingPlaceholder}>로딩 중...</div>
  ),
});

const PAGE_SIZE = 6;

// effectType을 원소 조합에서 자동 판별
function resolveEffectType(elements: Element[]): SkillDef['effectType'] {
  // 정확히 매칭되는 스킬 찾기
  const match = SKILLS.find(s => {
    if (s.elements.length !== elements.length) return false;
    const sorted1 = [...s.elements].sort().join(',');
    const sorted2 = [...elements].sort().join(',');
    return sorted1 === sorted2;
  });
  if (match) return match.effectType;

  // 매칭 안 되면 원소 기반 기본 타입
  const counts = new Map<Element, number>();
  for (const el of elements) counts.set(el, (counts.get(el) || 0) + 1);
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  if (dominant === '암흑') return 'blackhole';
  if (dominant === '전기') return 'lightning';
  if (dominant === '물') return 'wave';
  if (dominant === '불') return 'vortex';
  if (dominant === '흙') return 'summon';
  if (dominant === '빛') return 'beam';
  return 'projectile';
}

function resolveTier(elements: Element[]): Tier {
  const match = SKILLS.find(s => {
    if (s.elements.length !== elements.length) return false;
    const sorted1 = [...s.elements].sort().join(',');
    const sorted2 = [...elements].sort().join(',');
    return sorted1 === sorted2;
  });
  if (match) return match.tier;
  return 'C';
}

export default function SkillsPage() {
  const [activeElements, setActiveElements] = useState<Set<Element>>(new Set());
  const [activeTiers, setActiveTiers] = useState<Set<Tier>>(new Set());
  const [tierPages, setTierPages] = useState<Record<string, number>>({});

  // ── 개발 모드 ──
  const [devMode, setDevMode] = useState(false);
  const [devSlots, setDevSlots] = useState<Element[]>([]);
  const [devKey, setDevKey] = useState(0); // 리렌더 강제용

  const addDevSlot = (el: Element) => {
    if (devSlots.length >= 3) return;
    setDevSlots(prev => [...prev, el]);
  };

  const removeDevSlot = (idx: number) => {
    setDevSlots(prev => prev.filter((_, i) => i !== idx));
  };

  const clearDevSlots = () => {
    setDevSlots([]);
  };

  const playDev = () => {
    setDevKey(prev => prev + 1);
  };

  const devMatchedSkill = useMemo(() => {
    if (devSlots.length < 2) return null;
    const sorted = [...devSlots].sort().join(',');
    return SKILLS.find(s => {
      const sorted2 = [...s.elements].sort().join(',');
      return sorted2 === sorted;
    }) || null;
  }, [devSlots]);

  // ── 필터 ──
  const toggleElement = (el: Element) => {
    setActiveElements(prev => {
      const next = new Set(prev);
      if (next.has(el)) next.delete(el);
      else next.add(el);
      return next;
    });
    setTierPages({});
  };

  const toggleTier = (t: Tier) => {
    setActiveTiers(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
    setTierPages({});
  };

  const filtered = useMemo(() => {
    return SKILLS.filter(s => {
      if (activeTiers.size > 0 && !activeTiers.has(s.tier)) return false;
      if (activeElements.size > 0) {
        const match = s.elements.some(e => activeElements.has(e));
        if (!match) return false;
      }
      return true;
    });
  }, [activeElements, activeTiers]);

  const grouped = useMemo(() => {
    const map = new Map<Tier, SkillDef[]>();
    for (const t of TIER_ORDER) map.set(t, []);
    for (const s of filtered) map.get(s.tier)!.push(s);
    return map;
  }, [filtered]);

  const setPage = (tier: string, page: number) => {
    setTierPages(prev => ({ ...prev, [tier]: page }));
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>Signal Survivors - 스킬 도감</h1>
        <p className={styles.subtitle}>
          6원소 · 56가지 조합 · 클릭하면 이펙트 재생
        </p>
        <button
          className={styles.devToggle}
          onClick={() => setDevMode(v => !v)}
        >
          {devMode ? '도감 모드' : '개발 모드'}
        </button>
      </div>

      {/* ══ 개발 모드 ══ */}
      {devMode && (
        <div className={styles.devPanel}>
          <div className={styles.devTitle}>원소 조합 테스트</div>
          <p className={styles.devDesc}>원소를 2~3개 선택하고 재생 버튼을 누르세요</p>

          {/* 원소 선택 버튼 */}
          <div className={styles.devElements}>
            {ELEMENT_LIST.map(el => (
              <button
                key={el}
                className={styles.devElBtn}
                style={{ background: getElementColor(el) }}
                onClick={() => addDevSlot(el)}
                disabled={devSlots.length >= 3}
              >
                {el}
              </button>
            ))}
          </div>

          {/* 선택된 슬롯 */}
          <div className={styles.devSlots}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`${styles.devSlot} ${devSlots[i] ? styles.devSlotFilled : ''}`}
                style={devSlots[i] ? { borderColor: getElementColor(devSlots[i]) } : undefined}
                onClick={() => devSlots[i] && removeDevSlot(i)}
              >
                {devSlots[i] ? (
                  <>
                    <span className={styles.devSlotDot} style={{ background: getElementColor(devSlots[i]) }} />
                    {devSlots[i]}
                    <span className={styles.devSlotX}>×</span>
                  </>
                ) : (
                  <span className={styles.devSlotEmpty}>슬롯 {i + 1}</span>
                )}
              </div>
            ))}
          </div>

          {/* 매칭 결과 */}
          {devSlots.length >= 2 && (
            <div className={styles.devMatch}>
              {devMatchedSkill ? (
                <>
                  <span className={styles.devMatchTier} style={{ background: TIER_COLORS[devMatchedSkill.tier] }}>
                    {devMatchedSkill.tier}
                  </span>
                  <span className={styles.devMatchName}>{devMatchedSkill.name}</span>
                  <span className={styles.devMatchDesc}>{devMatchedSkill.description}</span>
                </>
              ) : (
                <span className={styles.devMatchDesc}>등록되지 않은 조합</span>
              )}
            </div>
          )}

          {/* 버튼 */}
          <div className={styles.devActions}>
            <button className={styles.devClearBtn} onClick={clearDevSlots}>초기화</button>
            <button
              className={styles.devPlayBtn}
              onClick={playDev}
              disabled={devSlots.length < 2}
            >
              ▶ 재생
            </button>
          </div>

          {/* 큰 캔버스 */}
          {devSlots.length >= 2 && (
            <div className={styles.devCanvas}>
              <SkillEffectCanvas
                key={devKey}
                elements={devSlots as [Element, Element] | [Element, Element, Element]}
                effectType={resolveEffectType(devSlots)}
                tier={resolveTier(devSlots)}
                size={400}
                autoPlay
              />
            </div>
          )}
        </div>
      )}

      {/* ══ 도감 모드 ══ */}
      {!devMode && (
        <>
          <div className={styles.filters}>
            <span className={styles.filterLabel}>원소</span>
            <div className={styles.filterGroup}>
              {ELEMENT_LIST.map(el => (
                <button
                  key={el}
                  className={`${styles.filterBtn} ${activeElements.has(el) ? styles.filterBtnActive : ''}`}
                  onClick={() => toggleElement(el)}
                  style={
                    activeElements.has(el)
                      ? { background: getElementColor(el), borderColor: getElementColor(el) }
                      : undefined
                  }
                >
                  <span className={styles.elementDot} style={{ background: getElementColor(el) }} />
                  {el}
                </button>
              ))}
            </div>

            <div className={styles.divider} />

            <span className={styles.filterLabel}>등급</span>
            <div className={styles.filterGroup}>
              {TIER_ORDER.map(t => (
                <button
                  key={t}
                  className={`${styles.filterBtn} ${activeTiers.has(t) ? styles.filterBtnActive : ''}`}
                  onClick={() => toggleTier(t)}
                  style={
                    activeTiers.has(t)
                      ? { background: TIER_COLORS[t], borderColor: TIER_COLORS[t] }
                      : undefined
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className={styles.noResults}>필터 조건에 맞는 스킬이 없습니다.</div>
          )}

          {TIER_ORDER.map(tier => {
            const skills = grouped.get(tier)!;
            if (skills.length === 0) return null;

            const currentPage = tierPages[tier] || 0;
            const totalPages = Math.ceil(skills.length / PAGE_SIZE);
            const pageSkills = skills.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

            return (
              <section key={tier} className={styles.tierSection}>
                <div className={styles.tierHeader}>
                  <span className={styles.tierBadge} style={{ background: TIER_COLORS[tier] }}>
                    {tier}
                  </span>
                  <span className={styles.tierCount}>{skills.length}개</span>
                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        disabled={currentPage === 0}
                        onClick={() => setPage(tier, currentPage - 1)}
                      >◀</button>
                      <span className={styles.pageInfo}>{currentPage + 1} / {totalPages}</span>
                      <button
                        className={styles.pageBtn}
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => setPage(tier, currentPage + 1)}
                      >▶</button>
                    </div>
                  )}
                </div>

                <div className={styles.grid}>
                  {pageSkills.map(skill => (
                    <SkillCard key={skill.id} skill={skill} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

function SkillCard({ skill }: { skill: SkillDef }) {
  return (
    <div className={styles.card}>
      <div className={styles.canvasWrap}>
        <SkillEffectCanvas elements={skill.elements} effectType={skill.effectType} tier={skill.tier} size={200} />
        <span className={styles.playHint}>▶ 클릭하여 재생</span>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.skillTierBadge} style={{ background: TIER_COLORS[skill.tier] }}>
          {skill.tier}
        </span>
        <p className={styles.skillName}>{skill.name}</p>
        {skill.description && (
          <p className={styles.skillDesc}>{skill.description}</p>
        )}
        <div className={styles.tagRow}>
          {skill.elements.map((el, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.plus}>+</span>}
              <span className={styles.elementTag} style={{ background: getElementColor(el) }}>
                {el}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
