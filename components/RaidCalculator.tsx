'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { raids, upcomingRaids } from '@/data/raids';
import {
  getRaidGroupName,
  getRaidsForLevel,
  getRaidsInGroup,
} from '@/types/user';
import styles from './RaidCalculator.module.css';

type Character = {
  characterName: string;
  itemLevel: number;
};

export type CharacterGoldCalc = {
  total: number;
  free: number;
  bound: number;
};

type RaidWeeklyState = {
  raids: Record<string, boolean[]>;                 // raidName -> 관문별 체크
  raidGoldReceive?: Record<string, boolean>;        // 골드 수령 여부 (기본 true)
  raidMoreGoldExclude?: Record<string, boolean>;    // 더보기 구매 여부 (기본 false)
  raidDifficultyOverride?: Record<string, string>;  // 그룹명 -> 선택 난이도 raidName
};

type AllState = Record<string, RaidWeeklyState>;

type RaidCalculatorProps = {
  selectedCharacters: Character[];
  onGateSelectionChange?: (state: any, characterCalc: { [char: string]: CharacterGoldCalc }) => void;
  onSaveReady?: (saveFn: () => boolean) => void;
  searchName?: string;
  showSave?: boolean;
};

const STORAGE_KEY = 'weekly-gold-settings';

type SavedSettings = {
  searchName: string;
  characters: Character[];
  state: AllState;
  optMode?: Record<string, OptimizationMode>;
};

// 코어를 주는 레이드 그룹
const CORE_RAID_GROUPS = ['벨가르딘', '성당', '세르카', '종막', '4막'];

// 레이드별 관문당 코어 획득량 (더보기 안 할 때 기준)
const CORE_PER_GATE: Record<string, number> = {
  '벨가르딘 나메': 4, '벨가르딘 하드': 3, '벨가르딘 노말': 3,
  '성당 3단계': 3, '성당 2단계': 2, '성당 1단계': 2,
  '세르카 나메': 3, '세르카 하드': 2, '세르카 노말': 2,
  '종막 하드': 2, '종막 노말': 2,
  '4막 하드': 1, '4막 노말': 1,
};

export const BOUND_GOLD_FILTER = 'hue-rotate(280deg) saturate(1.0)';
export const BOUND_GOLD_TEXT = '#e879f9';

const raidMap = new Map(raids.map(r => [r.name, r]));

// 출시 예정(비활성) 레이드 그룹 — 타일로만 노출, 계산 제외
const UPCOMING_GROUPS = Array.from(
  upcomingRaids.reduce((m, r) => {
    const g = getRaidGroupName(r.name);
    if (!m.has(g)) m.set(g, { label: r.releaseLabel, image: r.image });
    return m;
  }, new Map<string, { label: string; image: string }>())
).map(([group, info]) => ({ group, label: info.label, image: info.image }));

// 레벨에 맞는 모든 레이드 그룹 (최고 난이도 레벨 내림차순) + 출시 예정
function getAllRaidGroups(itemLevel: number): string[] {
  const best: Record<string, number> = {};
  getRaidsForLevel(itemLevel).forEach(r => {
    const g = getRaidGroupName(r.name);
    if (best[g] === undefined || r.level > best[g]) best[g] = r.level;
  });
  const groups = Object.keys(best).sort((a, b) => best[b] - best[a]);
  return [...groups, ...UPCOMING_GROUPS.map(u => u.group)];
}

// 한 레이드의 보상(골드/코어) 계산.
// 유통(일반)골드는 그대로 두고, 더보기 비용은 귀속골드에서만 차감(귀속 음수 가능) — 레이드 밑 표시용.
// 귀속 풀 정산(다른 레이드 귀속으로 흡수, 부족분 유통 차감)은 calcCharSplit 에서 캐릭터 단위로 처리.
function calcRaidReward(raidName: string, gates: boolean[], receive: boolean, more: boolean) {
  const raid = raidMap.get(raidName);
  if (!raid) return { free: 0, bound: 0, cores: 0 };
  const group = getRaidGroupName(raidName);
  const baseCore = CORE_PER_GATE[raidName] || 0;
  let gold = 0, bound = 0, moreCost = 0, cores = 0;
  gates.forEach((checked, i) => {
    if (!checked || !raid.gates[i]) return;
    if (receive) {
      gold += raid.gates[i].gold;
      bound += raid.gates[i].boundGold;
    }
    if (more) moreCost += raid.gates[i].moreGold;
    if (CORE_RAID_GROUPS.includes(group) && baseCore > 0) {
      cores += baseCore * (more ? 2 : 1);
    }
  });
  return { free: gold - bound, bound: bound - moreCost, cores };
}

// 캐릭터 전체 골드 split (체크된 레이드 합산).
// 귀속은 캐릭터에 쌓이는 풀 — 합산 귀속이 음수면(선택 레이드가 전부 유통만 주는 경우) 유통에서 차감.
function calcCharSplit(st: RaidWeeklyState): { total: number; free: number; bound: number; cores: number } {
  let free = 0, bound = 0, cores = 0;
  Object.entries(st.raids).forEach(([raidName, gates]) => {
    if (!gates.some(Boolean)) return;
    const receive = st.raidGoldReceive?.[raidName] !== false;
    const more = st.raidMoreGoldExclude?.[raidName] === true;
    const r = calcRaidReward(raidName, gates, receive, more);
    free += r.free;
    bound += r.bound;
    cores += r.cores;
  });
  // 귀속 풀이 음수로 떨어지면 부족분을 유통에서 차감
  if (bound < 0) { free += bound; bound = 0; }
  return { total: free + bound, free, bound, cores };
}

type OptimizationMode = 'default' | 'goldOptimize' | 'coreOptimize';

// 그룹별 최고 난이도 레이드를 총 클리어골드 내림차순으로
function groupBestByGold(itemLevel: number): any[] {
  const best: Record<string, any> = {};
  for (const raid of getRaidsForLevel(itemLevel)) {
    const g = getRaidGroupName(raid.name);
    if (!best[g] || raid.level > best[g].level) best[g] = raid;
  }
  const totalGold = (r: any) => r.gates.reduce((s: number, x: any) => s + x.gold, 0);
  return Object.values(best).sort((a, b) => totalGold(b) - totalGold(a));
}

// 모드별 선택 상태 구성
//  기본: 골드 상위 3그룹, 코어 레이드만 더보기 ON
//  골드 최적화: 골드 상위 3그룹, 더보기 전부 OFF (클골만 — 골드 최대)
//  코어 최적화: 코어 레이드 전부 더보기 ON(4번째+는 골드 미수령/코어만) + 골드 상위 3개 비코어 채움
function buildModeState(char: Character, mode: OptimizationMode): RaidWeeklyState {
  const raidsState: Record<string, boolean[]> = {};
  const receive: Record<string, boolean> = {};
  const more: Record<string, boolean> = {};
  const byGold = groupBestByGold(char.itemLevel);
  const top3 = byGold.slice(0, 3);
  const top3Names = new Set(top3.map(r => r.name));

  if (mode === 'coreOptimize') {
    for (const raid of byGold) {
      if (CORE_RAID_GROUPS.includes(getRaidGroupName(raid.name))) {
        raidsState[raid.name] = raid.gates.map(() => true);
        more[raid.name] = true;
      }
    }
    for (const raid of top3) {
      if (!CORE_RAID_GROUPS.includes(getRaidGroupName(raid.name))) {
        raidsState[raid.name] = raid.gates.map(() => true);
        more[raid.name] = false;
      }
    }
    for (const raidName of Object.keys(raidsState)) {
      receive[raidName] = top3Names.has(raidName);
    }
  } else {
    for (const raid of top3) {
      raidsState[raid.name] = raid.gates.map(() => true);
      receive[raid.name] = true;
      const isCore = CORE_RAID_GROUPS.includes(getRaidGroupName(raid.name));
      more[raid.name] = mode === 'default' ? isCore : false;
    }
  }
  return { raids: raidsState, raidGoldReceive: receive, raidMoreGoldExclude: more, raidDifficultyOverride: {} };
}

export default function RaidCalculator({ selectedCharacters, onGateSelectionChange, onSaveReady, searchName, showSave }: RaidCalculatorProps) {
  const [allState, setAllState] = useState<AllState>({});
  const [optMode, setOptMode] = useState<Record<string, OptimizationMode>>({});
  const [raidScrollIndex, setRaidScrollIndex] = useState<Record<string, number>>({});
  const [diffOpenKey, setDiffOpenKey] = useState<string | null>(null);
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 초기화: 저장된 설정 복원 or 기본 선택
  useEffect(() => {
    let restored = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: SavedSettings = JSON.parse(raw);
        const savedNames = (saved.characters || []).map(c => c.characterName).sort().join(',');
        const currentNames = selectedCharacters.map(c => c.characterName).sort().join(',');
        if (savedNames === currentNames && saved.state) {
          setAllState(saved.state);
          setOptMode(saved.optMode || {});
          restored = true;
        }
      }
    } catch {}

    if (!restored) {
      const init: AllState = {};
      const modes: Record<string, OptimizationMode> = {};
      selectedCharacters.forEach(c => {
        init[c.characterName] = buildModeState(c, 'default');
        modes[c.characterName] = 'default';
      });
      setAllState(init);
      setOptMode(modes);
    }
    setRaidScrollIndex({});
    setDiffOpenKey(null);
  }, [selectedCharacters]);

  // 설정 저장
  const saveSettings = useCallback(() => {
    try {
      const settings: SavedSettings = {
        searchName: searchName || selectedCharacters[0]?.characterName || '',
        characters: selectedCharacters,
        state: allState,
        optMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }, [selectedCharacters, allState, optMode, searchName]);

  useEffect(() => { onSaveReady?.(saveSettings); }, [saveSettings, onSaveReady]);

  // 결과 줄 설정 저장 버튼 (저장 완료 피드백)
  const handleSaveClick = useCallback(() => {
    if (saveSettings()) {
      setSavedFlash(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedFlash(false), 2000);
    }
  }, [saveSettings]);
  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  // 캐릭터별 계산값 메모
  const perChar = useMemo(() => {
    const out: Record<string, { total: number; free: number; bound: number; cores: number }> = {};
    selectedCharacters.forEach(c => {
      out[c.characterName] = calcCharSplit(allState[c.characterName] || { raids: {} });
    });
    return out;
  }, [allState, selectedCharacters]);

  const grand = useMemo(() => {
    let total = 0, free = 0, bound = 0, cores = 0;
    Object.values(perChar).forEach(p => { total += p.total; free += p.free; bound += p.bound; cores += p.cores; });
    return { total, free, bound, cores };
  }, [perChar]);

  // 부모에게 계산값 전달
  const prevRef = useRef('');
  useEffect(() => {
    const cc: Record<string, CharacterGoldCalc> = {};
    Object.entries(perChar).forEach(([name, p]) => { cc[name] = { total: p.total, free: p.free, bound: p.bound }; });
    const s = JSON.stringify(cc);
    if (s !== prevRef.current) {
      prevRef.current = s;
      onGateSelectionChange?.(allState, cc);
    }
  }, [perChar, allState, onGateSelectionChange]);

  // ── 핸들러 ───────────────────────────────────────────────
  const toggleRaid = useCallback((charName: string, raidName: string) => {
    setOptMode(prev => ({ ...prev, [charName]: 'default' }));
    setAllState(prev => {
      const st = prev[charName] || { raids: {} };
      const raid = raidMap.get(raidName);
      if (!raid) return prev;
      const gates = st.raids[raidName]?.length ? st.raids[raidName] : raid.gates.map(() => false);
      const allChecked = gates.length > 0 && gates.every(Boolean);
      const willCheck = !allChecked;
      const newGates = gates.map(() => willCheck);
      const receive = { ...(st.raidGoldReceive || {}) };
      const more = { ...(st.raidMoreGoldExclude || {}) };
      if (willCheck) {
        // 현재 골드 수령 중인 다른 레이드 수 (주간 3개 제한)
        const goldCount = Object.entries(st.raids).filter(([n, g]) =>
          n !== raidName && g.some(Boolean) && receive[n] !== false
        ).length;
        const within = goldCount < 3;
        receive[raidName] = within;
        more[raidName] = within && CORE_RAID_GROUPS.includes(getRaidGroupName(raidName));
      } else {
        delete receive[raidName];
        delete more[raidName];
      }
      return { ...prev, [charName]: { ...st, raids: { ...st.raids, [raidName]: newGates }, raidGoldReceive: receive, raidMoreGoldExclude: more } };
    });
  }, []);

  const toggleMore = useCallback((charName: string, raidName: string) => {
    setOptMode(prev => ({ ...prev, [charName]: 'default' }));
    setAllState(prev => {
      const st = prev[charName] || { raids: {} };
      const more = { ...(st.raidMoreGoldExclude || {}) };
      more[raidName] = !more[raidName];
      return { ...prev, [charName]: { ...st, raidMoreGoldExclude: more } };
    });
  }, []);

  const toggleGold = useCallback((charName: string, raidName: string) => {
    setOptMode(prev => ({ ...prev, [charName]: 'default' }));
    setAllState(prev => {
      const st = prev[charName] || { raids: {} };
      const receive = { ...(st.raidGoldReceive || {}) };
      receive[raidName] = receive[raidName] === false ? true : false;
      return { ...prev, [charName]: { ...st, raidGoldReceive: receive } };
    });
  }, []);

  const changeDifficulty = useCallback((charName: string, group: string, oldRaidName: string, newRaidName: string) => {
    setOptMode(prev => ({ ...prev, [charName]: 'default' }));
    setAllState(prev => {
      const st = prev[charName] || { raids: {} };
      const newRaid = raidMap.get(newRaidName);
      if (!newRaid) return prev;
      const oldGates = st.raids[oldRaidName] || [];
      const wasChecked = oldGates.some(Boolean);
      const raidsState = { ...st.raids };
      const receive = { ...(st.raidGoldReceive || {}) };
      const more = { ...(st.raidMoreGoldExclude || {}) };

      if (oldRaidName !== newRaidName) {
        raidsState[oldRaidName] = oldGates.map(() => false);
        const prevReceive = receive[oldRaidName];
        const prevMore = more[oldRaidName];
        delete receive[oldRaidName];
        delete more[oldRaidName];
        if (wasChecked) {
          receive[newRaidName] = prevReceive !== false;
          more[newRaidName] = prevMore === true;
        }
      }
      raidsState[newRaidName] = newRaid.gates.map(() => wasChecked);
      const override = { ...(st.raidDifficultyOverride || {}), [group]: newRaidName };
      return { ...prev, [charName]: { ...st, raids: raidsState, raidGoldReceive: receive, raidMoreGoldExclude: more, raidDifficultyOverride: override } };
    });
  }, []);

  // 관문 단위 체크 토글 (톱니 메뉴 관문별 설정)
  const toggleGate = useCallback((charName: string, raidName: string, gateIdx: number) => {
    setOptMode(prev => ({ ...prev, [charName]: 'default' }));
    setAllState(prev => {
      const st = prev[charName] || { raids: {} };
      const raid = raidMap.get(raidName);
      if (!raid) return prev;
      const gates = st.raids[raidName]?.length ? [...st.raids[raidName]] : raid.gates.map(() => false);
      const wasAny = gates.some(Boolean);
      gates[gateIdx] = !gates[gateIdx];
      const nowAny = gates.some(Boolean);
      const receive = { ...(st.raidGoldReceive || {}) };
      const more = { ...(st.raidMoreGoldExclude || {}) };
      if (nowAny && !wasAny) {
        // 새로 선택됨 → 골드 수령 3개 제한, 코어 레이드는 더보기 ON
        const goldCount = Object.entries(st.raids).filter(([n, g]) =>
          n !== raidName && g.some(Boolean) && receive[n] !== false
        ).length;
        const within = goldCount < 3;
        receive[raidName] = within;
        more[raidName] = within && CORE_RAID_GROUPS.includes(getRaidGroupName(raidName));
      } else if (!nowAny) {
        delete receive[raidName];
        delete more[raidName];
      }
      return { ...prev, [charName]: { ...st, raids: { ...st.raids, [raidName]: gates }, raidGoldReceive: receive, raidMoreGoldExclude: more } };
    });
  }, []);

  const handleModeChange = useCallback((charName: string, mode: OptimizationMode) => {
    const char = selectedCharacters.find(c => c.characterName === charName);
    if (!char) return;
    setOptMode(prev => ({ ...prev, [charName]: mode }));
    setAllState(prev => ({ ...prev, [charName]: buildModeState(char, mode) }));
  }, [selectedCharacters]);

  const MODE_BTNS: { key: OptimizationMode; label: string; title: string; cls: string }[] = [
    { key: 'default', label: '기본', title: '기본 (골드 상위 3개)', cls: styles.modeDefault },
    { key: 'goldOptimize', label: '골드', title: '골드 최적화 (더보기 전부 OFF)', cls: styles.modeGold },
    { key: 'coreOptimize', label: '코어', title: '코어 최적화 (코어 레이드 더보기 ON)', cls: styles.modeCore },
  ];

  const renderModeButtons = (charName: string) => {
    const cur = optMode[charName] || 'default';
    return (
      <div className={styles.modeGroup}>
        {MODE_BTNS.map(m => (
          <button
            key={m.key}
            className={`${styles.modeBtn} ${m.cls} ${cur === m.key ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeChange(charName, m.key)}
            title={m.title}
          >
            {m.label}
          </button>
        ))}
      </div>
    );
  };

  if (selectedCharacters.length === 0) return null;

  const raidCount = isMobile ? 3 : 4;

  return (
    <div className={styles.cardGrid}>
      {selectedCharacters.map(char => {
        const st = allState[char.characterName] || { raids: {} };
        const p = perChar[char.characterName] || { total: 0, free: 0, bound: 0, cores: 0 };
        const allGroups = getAllRaidGroups(char.itemLevel);
        const startIdx = raidScrollIndex[char.characterName] || 0;
        const canLeft = startIdx > 0;
        const canRight = startIdx + raidCount < allGroups.length;

        return (
          <div key={char.characterName} className={styles.characterCard}>
            {/* 헤더: 이름 + 레벨 (좌) / 최적화 모드 (우) */}
            <div className={styles.cardHeader}>
              <div className={styles.headerLeft}>
                <span className={styles.charName}>{char.characterName}</span>
                <span className={styles.charLevel}>Lv.{char.itemLevel.toFixed(0)}</span>
              </div>
              {renderModeButtons(char.characterName)}
            </div>

            {/* 본문: 레이드 + 보상 / 우측 합산 */}
            <div className={styles.cardBody}>
              <div className={styles.cardMain}>
                <div className={styles.raidRowWrapper}>
                  {canLeft && (
                    <button
                      className={`${styles.navBtn} ${styles.navLeft}`}
                      onClick={() => setRaidScrollIndex(prev => ({ ...prev, [char.characterName]: Math.max(0, (prev[char.characterName] || 0) - 1) }))}
                      aria-label="이전 레이드"
                    >‹</button>
                  )}

                  <div className={styles.itemRow}>
                    {Array.from({ length: raidCount }).map((_, i) => {
                      const group = allGroups[startIdx + i];

                      // 빈 슬롯
                      if (!group) {
                        return (
                          <div key={`empty-${i}`} className={styles.raidCell}>
                            <div className={`${styles.raidCard} ${styles.raidEmpty}`}><div className={styles.emptySlot}>-</div></div>
                            <div className={styles.rewardUnder} />
                          </div>
                        );
                      }

                      // 출시 예정
                      const upcoming = UPCOMING_GROUPS.find(u => u.group === group);
                      if (upcoming) {
                        return (
                          <div key={`upcoming-${group}`} className={styles.raidCell}>
                            <div className={styles.raidCard} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                              <Image src={upcoming.image} alt={group} fill sizes="220px" className={styles.raidImg} style={{ filter: 'grayscale(0.5)' }} unoptimized />
                              <div className={styles.raidOverlay} />
                              <div className={styles.raidInfo}>
                                <span className={styles.raidName}>{group}</span>
                                <span className={styles.raidDiff}>{upcoming.label}</span>
                              </div>
                            </div>
                            <div className={styles.rewardUnder} />
                          </div>
                        );
                      }

                      const difficulties = getRaidsInGroup(group, char.itemLevel);
                      if (difficulties.length === 0) {
                        return (
                          <div key={`none-${group}`} className={styles.raidCell}>
                            <div className={`${styles.raidCard} ${styles.raidEmpty}`}><div className={styles.emptySlot}>-</div></div>
                            <div className={styles.rewardUnder} />
                          </div>
                        );
                      }

                      const checkedRaid = difficulties.find(d => st.raids[d.name]?.some(Boolean));
                      const overrideName = st.raidDifficultyOverride?.[group];
                      const overrideRaid = overrideName ? difficulties.find(d => d.name === overrideName) : null;
                      const raid = checkedRaid || overrideRaid || difficulties[0];
                      const checked = !!st.raids[raid.name]?.some(Boolean);
                      const receive = st.raidGoldReceive?.[raid.name] !== false;
                      const more = st.raidMoreGoldExclude?.[raid.name] === true;
                      const diffLabel = raid.name.startsWith(group) ? raid.name.slice(group.length).trim() : '';
                      const diffKey = `${char.characterName}-${group}`;
                      const reward = checked ? calcRaidReward(raid.name, st.raids[raid.name], receive, more) : null;

                      return (
                        <div key={group} className={styles.raidCell}>
                          <div
                            className={`${styles.raidCard} ${checked ? styles.raidChecked : ''}`}
                            onClick={() => toggleRaid(char.characterName, raid.name)}
                          >
                            <Image src={raid.image} alt={group} fill sizes="220px" className={styles.raidImg} quality={90} unoptimized />
                            <div className={styles.raidOverlay} />
                            <div className={styles.raidInfo}>
                              <span className={styles.raidName}>{group}</span>
                              {diffLabel && <span className={styles.raidDiff}>{diffLabel}</span>}
                              <span className={styles.raidLevel}>Lv.{raid.level}</span>
                            </div>

                            {checked && (
                              <div
                                className={`${styles.moreBadge} ${more ? styles.moreBadgeActive : ''}`}
                                onClick={(e) => { e.stopPropagation(); toggleMore(char.characterName, raid.name); }}
                                title={more ? '더보기 구매 중' : '더보기 미구매'}
                              >더보기</div>
                            )}
                            {checked && (
                              <div
                                className={`${styles.goldToggle} ${receive ? styles.goldActive : styles.goldInactive}`}
                                onClick={(e) => { e.stopPropagation(); toggleGold(char.characterName, raid.name); }}
                                title={receive ? '골드 수령 중' : '골드 미수령'}
                              >
                                <Image src="/gold.webp" alt="골드" width={21} height={21} />
                              </div>
                            )}

                            <button
                              className={styles.gearBtn}
                              onClick={(e) => { e.stopPropagation(); setExpandedDiff(null); setDiffOpenKey(diffOpenKey === diffKey ? null : diffKey); }}
                              aria-label="난이도/관문 설정"
                            >⚙</button>

                            {checked && <div className={styles.raidCheck}>✓</div>}
                          </div>

                          {/* 톱니 메뉴: 난이도 + 관문별 설정/데이터 (타일 밖에 두어 잘림 방지) */}
                          {diffOpenKey === diffKey && (
                            <div className={styles.diffMenu} onClick={(e) => e.stopPropagation()}>
                              {difficulties.map(d => {
                                const dl = d.name.startsWith(group) ? (d.name.slice(group.length).trim() || '기본') : '기본';
                                const isSel = d.name === raid.name;
                                const isExpanded = expandedDiff === d.name;
                                return (
                                  <div key={d.name}>
                                    <button
                                      className={`${styles.diffOption} ${isSel ? styles.diffSelected : ''}`}
                                      onClick={() => {
                                        changeDifficulty(char.characterName, group, raid.name, d.name);
                                        setExpandedDiff(isExpanded ? null : d.name);
                                      }}
                                    >
                                      <span>{dl} (Lv.{d.level}){isSel ? ' · 선택됨' : ''}</span>
                                      <span className={styles.diffSelMark}>{isExpanded ? '▾' : '▸'}</span>
                                    </button>
                                    {isExpanded && (
                                      <div className={styles.gateSubList}>
                                        {d.gates.map((g: any, gi: number) => {
                                          const gChecked = !!st.raids[d.name]?.[gi];
                                          return (
                                            <button
                                              key={g.gate}
                                              className={`${styles.gateRow} ${gChecked ? styles.gateRowOn : ''}`}
                                              onClick={() => toggleGate(char.characterName, d.name, gi)}
                                            >
                                              <span>{gChecked ? '✓' : '○'} {g.gate}관문</span>
                                              <span className={styles.gateRowGold}>
                                                {g.gold.toLocaleString()}
                                                <span className={styles.gateRowMore}>더보기 -{g.moreGold.toLocaleString()}</span>
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 타일 아래 보상 — 유통(일반)은 그대로, 더보기 비용은 귀속에서 차감(음수 가능) */}
                          <div className={styles.rewardUnder}>
                            {reward && (
                              <>
                                {!receive && <span className={styles.rewardExcluded}>골드 미수령</span>}
                                {reward.free !== 0 && (
                                  <span className={styles.rewardItem} title="유통(일반) 골드">
                                    <Image src="/gold.webp" alt="유통 골드" width={17} height={17} style={{ borderRadius: '3px' }} />
                                    <span className={reward.free < 0 ? styles.rewardGoldNeg : ''}>{reward.free.toLocaleString()}</span>
                                  </span>
                                )}
                                {reward.bound !== 0 && (
                                  <span className={styles.rewardItem} title="귀속 골드">
                                    <Image src="/gold.webp" alt="귀속 골드" width={17} height={17} style={{ borderRadius: '3px', filter: BOUND_GOLD_FILTER }} />
                                    <span className={reward.bound < 0 ? styles.rewardGoldNeg : ''} style={reward.bound < 0 ? undefined : { color: BOUND_GOLD_TEXT }}>{reward.bound.toLocaleString()}</span>
                                  </span>
                                )}
                                {reward.cores > 0 && (
                                  <span className={styles.rewardItem}>
                                    <img src="/cerka-core2.webp" alt="코어" width={16} height={16} style={{ borderRadius: '2px' }} />
                                    x{reward.cores}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {canRight && (
                    <button
                      className={`${styles.navBtn} ${styles.navRight}`}
                      onClick={() => setRaidScrollIndex(prev => ({ ...prev, [char.characterName]: Math.min(allGroups.length - raidCount, (prev[char.characterName] || 0) + 1) }))}
                      aria-label="다음 레이드"
                    >›</button>
                  )}
                </div>
              </div>

              {/* 우측 합산 — 코어/유통/귀속 나열 후 마지막에 총 획득 */}
              <div className={styles.charTotalBox}>
                <div className={styles.totalSplit}>
                  {p.cores > 0 && (
                    <span className={styles.coreRow}>
                      <img src="/cerka-core2.webp" alt="코어" width={16} height={16} style={{ borderRadius: '2px' }} />
                      코어 x{p.cores}
                    </span>
                  )}
                  <span className={styles.totalSplitRow}>
                    <Image src="/gold.webp" alt="유통" width={15} height={15} style={{ borderRadius: '2px' }} />
                    유통 {p.free.toLocaleString()}
                  </span>
                  <span className={styles.totalSplitRow} style={{ color: BOUND_GOLD_TEXT }}>
                    <Image src="/gold.webp" alt="귀속" width={15} height={15} style={{ borderRadius: '2px', filter: BOUND_GOLD_FILTER }} />
                    귀속 {p.bound.toLocaleString()}
                  </span>
                </div>
                <div className={styles.totalDivider} />
                <div className={styles.totalResultRow}>
                  <span className={styles.totalLabel}>총 획득</span>
                  <span className={`${styles.totalValue} ${p.total < 0 ? styles.totalValueNeg : ''}`}>{p.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 전체 합산 */}
      <div className={styles.grandTotalCard}>
        <span className={styles.grandItem}>
          <Image src="/gold.webp" alt="유통 골드" width={26} height={26} style={{ borderRadius: '4px' }} />
          유통 {grand.free.toLocaleString()}
        </span>
        <span className={styles.grandItem} style={{ color: BOUND_GOLD_TEXT }}>
          <Image src="/gold.webp" alt="귀속 골드" width={26} height={26} style={{ borderRadius: '4px', filter: BOUND_GOLD_FILTER }} />
          귀속 {grand.bound.toLocaleString()}
        </span>
        <span className={styles.grandTotal}>= 총 {grand.total.toLocaleString()} G</span>
        {grand.cores > 0 && (
          <span className={styles.grandItem}>
            <img src="/cerka-core2.webp" alt="코어" width={26} height={26} style={{ borderRadius: '4px' }} />
            x{grand.cores}
          </span>
        )}
        {showSave && (
          <button
            onClick={handleSaveClick}
            title="기본·골드·코어 최적화 등 현재 설정을 저장합니다 (다음 접속에도 유지)"
            style={{
              marginLeft: 'auto',
              fontSize: isMobile ? '0.72rem' : '0.82rem',
              padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              border: savedFlash ? '1px solid var(--color-success)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              cursor: 'pointer',
              backgroundColor: savedFlash ? 'var(--color-success)' : 'transparent',
              color: savedFlash ? '#fff' : 'var(--text-primary)',
              lineHeight: 1.3,
            }}
          >
            {savedFlash ? '저장 완료' : '설정 저장'}
          </button>
        )}
      </div>
    </div>
  );
}
