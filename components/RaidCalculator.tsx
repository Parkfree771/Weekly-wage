'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, Table, Form, Badge, Accordion, Row, Col, Button, Collapse } from 'react-bootstrap';
import Image from 'next/image';
import { raids } from '@/data/raids';

type Character = {
  characterName: string;
  itemLevel: number;
};

type RaidCalculatorProps = {
  selectedCharacters: Character[];
  onGateSelectionChange?: (gateSelection: GateSelection, characterGold: { [char: string]: number }) => void;
  onSaveReady?: (saveFn: () => boolean) => void;
  searchName?: string;
};

type GateSelection = {
  [key: string]: {
    [key: string]: {
      [key: string]: 'none' | 'withMore' | 'withoutMore';
    };
  };
};

type OptimizationMode = 'default' | 'goldOptimize' | 'coreOptimize';

const STORAGE_KEY = 'weekly-gold-settings';

type SavedSettings = {
  searchName: string;
  characters: Character[];
  gateSelection: GateSelection;
  optimizationMode: { [key: string]: OptimizationMode };
};

// 코어를 주는 레이드 그룹
const CORE_RAID_GROUPS = ['성당', '세르카', '종막', '4막'];

// 설정 저장 버튼 (저장 완료 피드백 포함)
function SaveButton({ isMobile, onSave }: { isMobile?: boolean; onSave: () => boolean }) {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = () => {
    const success = onSave();
    if (success) {
      setSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaved(false), 2000);
    }
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <button
      onClick={handleSave}
      title="다음에 접속해도 현재 설정이 유지됩니다"
      style={{
        fontSize: isMobile ? '0.6rem' : '0.72rem',
        padding: isMobile ? '0.3rem 0.6rem' : '0.4rem 0.8rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        border: saved ? '1px solid #16a34a' : '1px solid var(--border-color)',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor: saved ? '#16a34a' : 'transparent',
        color: saved ? '#fff' : 'var(--text-primary)',
        lineHeight: 1.3,
      }}
    >
      {saved ? '저장 완료' : '설정 저장'}
    </button>
  );
}

// 레이드 이름에서 그룹명 추출 (마지막 단어 = 난이도 제외)
const getRaidGroupName = (raidName: string): string => {
  const parts = raidName.split(' ');
  return parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
};

// Deep clone 대체 유틸리티: 필요한 부분만 얕은 복사
const updateGateSelection = (
  prev: GateSelection,
  characterName: string,
  raidName: string,
  gate: string | number,
  value: 'none' | 'withMore' | 'withoutMore'
): GateSelection => {
  return {
    ...prev,
    [characterName]: {
      ...prev[characterName],
      [raidName]: {
        ...prev[characterName]?.[raidName],
        [gate]: value
      }
    }
  };
};


export default function RaidCalculator({ selectedCharacters, onGateSelectionChange, onSaveReady, searchName }: RaidCalculatorProps) {
  const [gateSelection, setGateSelection] = useState<GateSelection>({});
  const [showAllRaids, setShowAllRaids] = useState<{ [key: string]: boolean }>({});
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  const [optimizationMode, setOptimizationMode] = useState<{ [key: string]: OptimizationMode }>({});

  // 레이드 그룹명과 이미지 파일명 매핑
  const raidImages: { [key: string]: string } = {
    '성당': '/wlvuddmltjdekd1.webp',
    '세르카': '/cerka2.webp',
    '종막': '/abrelshud.webp',
    '4막': '/illiakan.webp',
    '3막': '/ivory-tower.webp',
    '2막': '/kazeros.webp',
    '1막': '/aegir.webp',
    '서막': '/echidna.webp',
    '베히모스': '/behemoth.webp'
  };

  // 레이드별 관문당 코어 획득량 (더보기 안 할 때 기준)
  const corePerGate: { [key: string]: number } = {
    '성당 3단계': 3,
    '성당 2단계': 2,
    '성당 1단계': 2,
    '세르카 나메': 3,
    '세르카 하드': 2,
    '세르카 노말': 2,
    '종막 하드': 2,
    '종막 노말': 2,
    '4막 하드': 1,
    '4막 노말': 1,
  };

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // groupRaids를 useMemo로 메모이제이션
  const groupedRaids = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    raids.forEach(raid => {
      const groupName = getRaidGroupName(raid.name);
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(raid);
    });
    return grouped;
  }, []);

  // 캐릭터별 최적 레이드 선택 계산
  const computeOptimizedSelection = useCallback((character: Character, mode: OptimizationMode): { [raidName: string]: { [gate: string]: 'none' | 'withMore' | 'withoutMore' } } => {
    const result: { [raidName: string]: { [gate: string]: 'none' | 'withMore' | 'withoutMore' } } = {};

    // 모든 레이드 초기화
    raids.forEach(raid => {
      result[raid.name] = {};
      raid.gates.forEach(gate => {
        result[raid.name][gate.gate] = 'none';
      });
    });

    // 캐릭터 레벨에 맞는 레이드 (레벨 내림차순)
    const availableRaids = raids
      .filter(raid => character.itemLevel >= raid.level)
      .sort((a, b) => b.level - a.level);

    if (mode === 'goldOptimize') {
      // 골드 최적화: 골드 높은 3개 + 코어 레이드 4번째
      // 1) 그룹별 최고 난이도 레이드의 총 골드 계산
      const groupBestRaid: { [group: string]: { raid: any; totalGold: number } } = {};
      for (const raid of availableRaids) {
        const groupName = getRaidGroupName(raid.name);
        if (!groupBestRaid[groupName]) {
          const totalGold = raid.gates.reduce((sum: number, g: any) => sum + g.gold, 0);
          groupBestRaid[groupName] = { raid, totalGold };
        }
      }

      // 2) 골드 순 정렬
      const sortedGroups = Object.entries(groupBestRaid)
        .sort((a, b) => b[1].totalGold - a[1].totalGold);

      // 3) 상위 3개 withMore (클골)
      const selectedGroupNames: string[] = [];
      for (const [groupName, { raid }] of sortedGroups) {
        if (selectedGroupNames.length >= 3) break;
        selectedGroupNames.push(groupName);
        for (const gate of raid.gates) {
          result[raid.name][gate.gate] = 'withMore';
        }
      }

      // 4) 코어 레이드 중 아직 선택 안 된 것 1개 추가 (withMore = 골드 0이지만 코어 획득, 더보기 비용 없음)
      for (const [groupName, { raid }] of sortedGroups) {
        if (selectedGroupNames.includes(groupName)) continue;
        if (CORE_RAID_GROUPS.includes(groupName)) {
          selectedGroupNames.push(groupName);
          for (const gate of raid.gates) {
            result[raid.name][gate.gate] = 'withMore';
          }
          break;
        }
      }
    } else if (mode === 'coreOptimize') {
      // 코어 최적화: 코어 레이드 4개 전부 더보기
      const selectedGroupNames: string[] = [];

      // 1) 코어 레이드 우선 선택 (더보기)
      for (const raid of availableRaids) {
        const groupName = getRaidGroupName(raid.name);
        if (selectedGroupNames.includes(groupName)) continue;
        if (!CORE_RAID_GROUPS.includes(groupName)) continue;
        selectedGroupNames.push(groupName);
        for (const gate of raid.gates) {
          result[raid.name][gate.gate] = 'withoutMore';
        }
      }

      // 2) 코어 레이드가 3개 미만이면 골드 높은 순으로 채우기
      if (selectedGroupNames.length < 3) {
        const remaining = availableRaids.filter(r => !selectedGroupNames.includes(getRaidGroupName(r.name)));
        const groupBest: { [g: string]: any } = {};
        for (const raid of remaining) {
          const g = getRaidGroupName(raid.name);
          if (!groupBest[g]) groupBest[g] = raid;
        }
        const sorted = Object.entries(groupBest).sort((a, b) => {
          const goldA = (a[1] as any).gates.reduce((s: number, g: any) => s + g.gold, 0);
          const goldB = (b[1] as any).gates.reduce((s: number, g: any) => s + g.gold, 0);
          return goldB - goldA;
        });
        for (const [groupName, raid] of sorted) {
          if (selectedGroupNames.length >= 3) break;
          selectedGroupNames.push(groupName);
          for (const gate of (raid as any).gates) {
            result[(raid as any).name][gate.gate] = 'withMore';
          }
        }
      }
    }

    return result;
  }, []);

  // 기본 모드 선택 계산 (상위 레이드 3개, 코어 레이드면 더보기 체크)
  const computeDefaultSelection = useCallback((character: Character): { [raidName: string]: { [gate: string]: 'none' | 'withMore' | 'withoutMore' } } => {
    const result: { [raidName: string]: { [gate: string]: 'none' | 'withMore' | 'withoutMore' } } = {};

    // 모든 레이드 초기화
    raids.forEach(raid => {
      result[raid.name] = {};
      raid.gates.forEach(gate => {
        result[raid.name][gate.gate] = 'none';
      });
    });

    // 캐릭터 레벨에 맞는 레이드 (레벨 내림차순 → 그룹별 최고 난이도)
    const availableRaids = raids
      .filter(raid => character.itemLevel >= raid.level)
      .sort((a, b) => b.level - a.level);

    // 상위 3개 그룹 선택
    const selectedGroupNames: string[] = [];
    for (const raid of availableRaids) {
      const groupName = getRaidGroupName(raid.name);
      if (selectedGroupNames.includes(groupName)) continue;
      if (selectedGroupNames.length >= 3) break;

      selectedGroupNames.push(groupName);
      const selection = CORE_RAID_GROUPS.includes(groupName) ? 'withoutMore' : 'withMore';
      for (const gate of raid.gates) {
        result[raid.name][gate.gate] = selection;
      }
    }

    return result;
  }, []);

  // 초기 선택 (저장된 설정 있으면 복원, 없으면 기본 모드)
  useEffect(() => {
    let restored = false;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: SavedSettings = JSON.parse(raw);
        // 저장된 캐릭터 목록과 현재 캐릭터 목록이 동일한지 확인
        const savedNames = saved.characters.map(c => c.characterName).sort().join(',');
        const currentNames = selectedCharacters.map(c => c.characterName).sort().join(',');

        if (savedNames === currentNames && saved.gateSelection && saved.optimizationMode) {
          setGateSelection(saved.gateSelection);
          setOptimizationMode(saved.optimizationMode);
          restored = true;
        }
      }
    } catch {}

    if (!restored) {
      const initialSelection: GateSelection = {};
      selectedCharacters.forEach(character => {
        initialSelection[character.characterName] = computeDefaultSelection(character);
      });
      setGateSelection(initialSelection);

      const initialMode: { [key: string]: OptimizationMode } = {};
      selectedCharacters.forEach(character => {
        initialMode[character.characterName] = 'default';
      });
      setOptimizationMode(initialMode);
    }
  }, [selectedCharacters]);

  // 설정 저장 함수
  const saveSettings = useCallback(() => {
    try {
      const settings: SavedSettings = {
        searchName: searchName || selectedCharacters[0]?.characterName || '',
        characters: selectedCharacters,
        gateSelection,
        optimizationMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }, [selectedCharacters, gateSelection, optimizationMode, searchName]);

  // 부모에게 save 함수 전달
  useEffect(() => {
    onSaveReady?.(saveSettings);
  }, [saveSettings, onSaveReady]);

  const getHeaderCheckState = (characterName: string, raidName: string, selection: 'withMore' | 'withoutMore') => {
    const raid = raids.find(r => r.name === raidName);
    if (!raid || !gateSelection[characterName]?.[raidName]) return false;

    return raid.gates.every(gate =>
      gateSelection[characterName][raidName][gate.gate] === selection
    );
  };

  const hasAnyGateSelected = (characterName: string, raidName: string) => {
    const raid = raids.find(r => r.name === raidName);
    if (!raid || !gateSelection[characterName]?.[raidName]) return false;

    return raid.gates.some(gate =>
      gateSelection[characterName][raidName][gate.gate] !== 'none'
    );
  };

  const handleHeaderChange = useCallback((characterName: string, raidName: string, selection: 'withMore' | 'withoutMore') => {
    // 최적화 모드에서 수동 변경 시 기본 모드로 전환
    setOptimizationMode(prev => ({ ...prev, [characterName]: 'default' }));

    setGateSelection(prev => {
      const raid = raids.find(r => r.name === raidName)!;
      const allSelected = raid.gates.every(gate =>
        prev[characterName]?.[raidName]?.[gate.gate] === selection
      );

      const newSelection = allSelected ? 'none' : selection;
      const groupName = getRaidGroupName(raidName);

      let result = { ...prev };
      result[characterName] = { ...result[characterName] };

      if (newSelection !== 'none') {
        for (const r of groupedRaids[groupName]) {
          if (r.name !== raidName && result[characterName]?.[r.name]) {
            result[characterName][r.name] = { ...result[characterName][r.name] };
            for (const gate of raid.gates) {
              const sameGate = r.gates.find((g: any) => g.gate === gate.gate);
              if (sameGate) {
                result[characterName][r.name][gate.gate] = 'none';
              }
            }
          }
        }
      }

      result[characterName][raidName] = { ...result[characterName][raidName] };
      for (const gate of raid.gates) {
        result[characterName][raidName][gate.gate] = newSelection;
      }

      return result;
    });
  }, [groupedRaids]);

  const handleGateChange = useCallback((characterName: string, raidName: string, gate: number, selection: 'none' | 'withMore' | 'withoutMore') => {
    // 최적화 모드에서 수동 변경 시 기본 모드로 전환
    setOptimizationMode(prev => ({ ...prev, [characterName]: 'default' }));

    setGateSelection(prev => {
      const currentSelection = prev[characterName]?.[raidName]?.[gate];
      const newSelection = currentSelection === selection ? 'none' : selection;
      const groupName = getRaidGroupName(raidName);

      let result = { ...prev };
      result[characterName] = { ...result[characterName] };

      if (newSelection !== 'none') {
        for (const r of groupedRaids[groupName]) {
          if (r.name !== raidName) {
            const sameGate = r.gates.find((g: any) => g.gate === gate);
            if (sameGate && result[characterName]?.[r.name]) {
              result[characterName][r.name] = { ...result[characterName][r.name] };
              result[characterName][r.name][gate] = 'none';
            }
          }
        }
      }

      result[characterName][raidName] = { ...result[characterName][raidName] };
      result[characterName][raidName][gate] = newSelection;

      return result;
    });
  }, [groupedRaids]);

  // 최적화 모드 변경 핸들러
  const handleModeChange = useCallback((characterName: string, mode: OptimizationMode) => {
    setOptimizationMode(prev => ({ ...prev, [characterName]: mode }));

    if (mode === 'default') {
      // 기본 모드: computeDefaultSelection으로 복원
      const character = selectedCharacters.find(c => c.characterName === characterName);
      if (!character) return;

      const defaultSel = computeDefaultSelection(character);
      setGateSelection(prev => ({
        ...prev,
        [characterName]: defaultSel
      }));
    } else {
      // 골드/코어 최적화
      const character = selectedCharacters.find(c => c.characterName === characterName);
      if (!character) return;

      const optimized = computeOptimizedSelection(character, mode);
      setGateSelection(prev => ({
        ...prev,
        [characterName]: optimized
      }));
    }
  }, [selectedCharacters, computeDefaultSelection, computeOptimizedSelection]);

  // 골드 계산 (최적화 모드에서는 상위 3개만 골드 지급)
  const calculatedData = useMemo(() => {
    const raidGroupGold: { [char: string]: { [group: string]: number } } = {};
    const characterGold: { [char: string]: number } = {};
    const raidGroupCores: { [char: string]: { [group: string]: number } } = {};
    const characterCores: { [char: string]: number } = {};
    const raidGroupFree: { [char: string]: { [group: string]: number } } = {};
    const raidGroupBound: { [char: string]: { [group: string]: number } } = {};
    const characterFree: { [char: string]: number } = {};
    const characterBound: { [char: string]: number } = {};
    const moreSelected: { [char: string]: { [group: string]: boolean } } = {};
    const checkedGroups: { [char: string]: string[] } = {};
    const goldExcludedGroups: { [char: string]: string[] } = {}; // 골드 미수령 그룹
    let totalGold = 0;
    let totalFree = 0;
    let totalBound = 0;
    let hasAnyMore = false;

    for (const characterName in gateSelection) {
      raidGroupGold[characterName] = {};
      raidGroupFree[characterName] = {};
      raidGroupBound[characterName] = {};
      raidGroupCores[characterName] = {};
      moreSelected[characterName] = {};
      checkedGroups[characterName] = [];
      goldExcludedGroups[characterName] = [];
      let charCores = 0;

      // 1단계: 그룹별 baseGold(총), baseBound(귀속), moreCost, cores 계산
      const groupCalc: { [group: string]: { baseGold: number; baseBound: number; moreCost: number; cores: number; hasMore: boolean; hasChecked: boolean } } = {};

      for (const groupName in groupedRaids) {
        let baseGold = 0;
        let baseBound = 0;
        let moreCost = 0;
        let groupCores = 0;
        let groupHasMore = false;
        let groupHasChecked = false;

        for (const raidName in gateSelection[characterName]) {
          if (raidName.startsWith(groupName)) {
            for (const gate in gateSelection[characterName][raidName]) {
              const selection = gateSelection[characterName][raidName][gate];
              if (selection !== 'none') {
                groupHasChecked = true;
                const raid = raids.find(r => r.name === raidName);
                if (raid) {
                  const gateInfo = raid.gates.find(g => g.gate === parseInt(gate));
                  if (gateInfo) {
                    baseGold += gateInfo.gold;
                    baseBound += gateInfo.boundGold;
                    if (selection === 'withoutMore') {
                      moreCost += gateInfo.moreGold;
                      groupHasMore = true;
                      hasAnyMore = true;
                    }
                  }
                }

                // 코어 계산
                if (CORE_RAID_GROUPS.includes(groupName)) {
                  const baseCores = corePerGate[raidName] || 0;
                  if (baseCores > 0) {
                    const multiplier = selection === 'withoutMore' ? 2 : 1;
                    groupCores += baseCores * multiplier;
                  }
                }
              }
            }
          }
        }

        groupCalc[groupName] = { baseGold, baseBound, moreCost, cores: groupCores, hasMore: groupHasMore, hasChecked: groupHasChecked };

        if (groupHasChecked) {
          checkedGroups[characterName].push(groupName);
        }

        raidGroupCores[characterName][groupName] = groupCores;
        moreSelected[characterName][groupName] = groupHasMore;
        charCores += groupCores;
      }

      characterCores[characterName] = charCores;

      // 2단계: 체크된 그룹 중 상위 3개만 골드 지급 (4개 이상일 때).
      // 더보기 비용은 귀속 골드에서 우선 차감하고 부족하면 일반 골드에서 차감.
      const checked = checkedGroups[characterName];
      const sorted = [...checked].sort((a, b) => groupCalc[b].baseGold - groupCalc[a].baseGold);

      let charGold = 0;
      let charFree = 0;
      let charBound = 0;
      for (let i = 0; i < sorted.length; i++) {
        const g = sorted[i];
        const calc = groupCalc[g];
        if (i < 3) {
          // 상위 3개: 골드 수령. 귀속 우선 차감.
          const baseFreeGold = calc.baseGold - calc.baseBound;
          const boundDeduct = Math.min(calc.baseBound, calc.moreCost);
          const groupBound = calc.baseBound - boundDeduct;
          const groupFree = baseFreeGold - (calc.moreCost - boundDeduct);
          const groupTotal = groupFree + groupBound; // = calc.baseGold - calc.moreCost

          raidGroupGold[characterName][g] = groupTotal;
          raidGroupFree[characterName][g] = groupFree;
          raidGroupBound[characterName][g] = groupBound;
          charGold += groupTotal;
          charFree += groupFree;
          charBound += groupBound;
        } else {
          // 4번째+: 골드 미수령. 더보기 비용만 차감 (귀속 우선; 미수령이라 base 가 0 이라 결국 일반에서).
          const groupFree = -calc.moreCost;
          const groupBound = 0;
          const groupTotal = groupFree + groupBound;

          raidGroupGold[characterName][g] = groupTotal;
          raidGroupFree[characterName][g] = groupFree;
          raidGroupBound[characterName][g] = groupBound;
          charGold += groupTotal;
          charFree += groupFree;
          charBound += groupBound;
          goldExcludedGroups[characterName].push(g);
        }
      }

      // 체크 안 된 그룹 0
      for (const g in groupCalc) {
        if (!checked.includes(g)) {
          raidGroupGold[characterName][g] = 0;
          raidGroupFree[characterName][g] = 0;
          raidGroupBound[characterName][g] = 0;
        }
      }

      characterGold[characterName] = charGold;
      characterFree[characterName] = charFree;
      characterBound[characterName] = charBound;
      totalGold += charGold;
      totalFree += charFree;
      totalBound += charBound;
    }

    return {
      raidGroupGold,
      raidGroupFree,
      raidGroupBound,
      characterGold,
      characterFree,
      characterBound,
      raidGroupCores,
      characterCores,
      moreSelected,
      checkedGroups,
      goldExcludedGroups,
      totalGold,
      totalFree,
      totalBound,
      hasAnyMore
    };
  }, [gateSelection, groupedRaids, corePerGate]);

  // 부모에게 gateSelection/characterGold 전달
  const prevGoldRef = useRef('');
  useEffect(() => {
    const serialized = JSON.stringify(calculatedData.characterGold);
    if (serialized !== prevGoldRef.current) {
      prevGoldRef.current = serialized;
      onGateSelectionChange?.(gateSelection, calculatedData.characterGold);
    }
  }, [gateSelection, calculatedData.characterGold, onGateSelectionChange]);

  const calculateRaidGroupGold = useCallback((characterName: string, groupName: string) => {
    return calculatedData.raidGroupGold[characterName]?.[groupName] || 0;
  }, [calculatedData]);

  const calculateRaidGroupFree = useCallback((characterName: string, groupName: string) => {
    return calculatedData.raidGroupFree[characterName]?.[groupName] || 0;
  }, [calculatedData]);

  const calculateRaidGroupBound = useCallback((characterName: string, groupName: string) => {
    return calculatedData.raidGroupBound[characterName]?.[groupName] || 0;
  }, [calculatedData]);

  const calculateCharacterGold = useCallback((characterName: string) => {
    return calculatedData.characterGold[characterName] || 0;
  }, [calculatedData]);

  const calculateCharacterFree = useCallback((characterName: string) => {
    return calculatedData.characterFree[characterName] || 0;
  }, [calculatedData]);

  const calculateCharacterBound = useCallback((characterName: string) => {
    return calculatedData.characterBound[characterName] || 0;
  }, [calculatedData]);

  const calculateTotalGold = useCallback(() => {
    return calculatedData.totalGold;
  }, [calculatedData]);

  const calculateTotalFree = useCallback(() => {
    return calculatedData.totalFree;
  }, [calculatedData]);

  const calculateTotalBound = useCallback(() => {
    return calculatedData.totalBound;
  }, [calculatedData]);

  const hasMoreSelected = useCallback((characterName: string, groupName: string) => {
    return calculatedData.moreSelected[characterName]?.[groupName] || false;
  }, [calculatedData]);

  const calculateRaidGroupCores = useCallback((characterName: string, groupName: string) => {
    return calculatedData.raidGroupCores[characterName]?.[groupName] || 0;
  }, [calculatedData]);

  const calculateCharacterCores = useCallback((characterName: string) => {
    return calculatedData.characterCores[characterName] || 0;
  }, [calculatedData]);

  const hasAnyMoreReward = useCallback(() => {
    return calculatedData.hasAnyMore;
  }, [calculatedData]);

  const getCheckedRaidGroups = useCallback((characterName: string) => {
    return calculatedData.checkedGroups[characterName] || [];
  }, [calculatedData]);

  const isGoldExcluded = useCallback((characterName: string, groupName: string) => {
    return calculatedData.goldExcludedGroups[characterName]?.includes(groupName) || false;
  }, [calculatedData]);

  if (selectedCharacters.length === 0) {
    return (
      <div className="text-center p-5">
      </div>
    );
  }

  // 모드 버튼 렌더링
  const renderModeButtons = (characterName: string, hasBackground: boolean) => {
    const currentMode = optimizationMode[characterName] || 'default';
    const modes: { key: OptimizationMode; label: string; shortLabel: string; activeColor: string }[] = [
      { key: 'default', label: '기본', shortLabel: '기본', activeColor: '#16a34a' },
      { key: 'goldOptimize', label: '골드 최적화', shortLabel: '골드', activeColor: '#d97706' },
      { key: 'coreOptimize', label: '코어 최적화', shortLabel: '코어', activeColor: '#7c3aed' },
    ];

    return (
      <div className="d-flex" style={{
        gap: '0px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: hasBackground ? '1px solid rgba(255,255,255,0.4)' : '1px solid var(--border-color)',
        backdropFilter: hasBackground ? 'blur(6px)' : 'none',
      }}>
        {modes.map(m => {
          const isActive = currentMode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => handleModeChange(characterName, m.key)}
              style={{
                fontSize: isMobile ? '0.6rem' : '0.72rem',
                padding: isMobile ? '0.3rem 0.5rem' : '0.3rem 0.7rem',
                fontWeight: isActive ? 700 : 600,
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isActive
                  ? m.activeColor
                  : hasBackground ? 'rgba(255,255,255,0.15)' : 'rgba(128,128,128,0.1)',
                color: isActive
                  ? '#fff'
                  : hasBackground ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)',
                lineHeight: 1.3,
                textShadow: hasBackground ? '0 1px 3px rgba(0,0,0,0.8)' : 'none',
                boxShadow: isActive ? '0 0 8px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {isMobile ? m.shortLabel : m.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="raid-calculator-page">
      <Row className="align-items-stretch">
        {selectedCharacters.map(character => {
          const checkedGroups = getCheckedRaidGroups(character.characterName);
          const uncheckedGroups = Object.keys(groupedRaids).filter(g => !checkedGroups.includes(g));
          const showAll = showAllRaids[character.characterName] || false;
          const hasBackground = character.itemLevel >= 1700;
          const bgImage = character.itemLevel >= 1750 ? '/wlvuddmltjdekd2.webp' : character.itemLevel >= 1700 ? '/wlvuddmltjdekd1.webp' : null;

          return (
            <Col lg={4} md={6} sm={12} key={character.characterName} className="mb-3 mb-md-4">
              <Card className={`character-raid-card ${hasBackground ? 'cerka-character' : ''}`} style={{ borderColor: 'var(--border-color)', height: '100%', position: 'relative', overflow: 'hidden' }}>

                {bgImage && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                    <Image
                      src={bgImage}
                      alt="레이드 배경"
                      fill
                      style={{ objectFit: 'cover', opacity: 1 }}
                      priority={true}
                    />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)' }} />
                  </div>
                )}
                <Card.Header
                  className="character-raid-header"
                  style={{
                    padding: isMobile ? '0.5rem 0.75rem' : '0.9rem 1.2rem',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  {/* 1줄: 캐릭터명 + 레벨 + 모드 버튼 */}
                  <div className="d-flex align-items-center justify-content-between" style={{ gap: isMobile ? '0.4rem' : '0.5rem', flexWrap: 'nowrap' }}>
                    <div className="d-flex align-items-center gap-1" style={{ minWidth: 0, flex: '1 1 auto' }}>
                      <span style={{
                        fontSize: isMobile ? '0.85rem' : '1.1rem',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {character.characterName}
                      </span>
                      <Badge
                        className="character-level-badge"
                        style={{
                          fontSize: isMobile ? '0.6rem' : '0.78rem',
                          padding: '0.25em 0.5em',
                          fontWeight: 500,
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Lv.{character.itemLevel}
                      </Badge>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      {renderModeButtons(character.characterName, hasBackground)}
                    </div>
                  </div>

                  {/* 2줄: 코어 + 골드 오른쪽 정렬 */}
                  <div className="d-flex align-items-center justify-content-end gap-2" style={{ marginTop: '0.35rem' }}>
                    {calculateCharacterCores(character.characterName) > 0 && (
                      <div className="d-flex align-items-center gap-1" style={{ whiteSpace: 'nowrap' }}>
                        <img src="/cerka-core2.webp" alt="코어" width={isMobile ? 20 : 26} height={isMobile ? 20 : 26} style={{ borderRadius: '3px' }} />
                        <span style={{
                          fontSize: isMobile ? '0.8rem' : '1rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)'
                        }}>
                          x{calculateCharacterCores(character.characterName)}
                        </span>
                      </div>
                    )}

                    <div className="character-gold-display d-flex align-items-center gap-1" style={{
                      padding: '0.35em 0.6em',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap'
                    }}>
                      <Image src="/gold.webp" alt="일반 골드" title="일반 골드" width={isMobile ? 14 : 18} height={isMobile ? 14 : 18} style={{ borderRadius: '3px' }} />
                      <span style={{
                        fontSize: isMobile ? '0.65rem' : '0.85rem',
                        fontWeight: 700
                      }}>
                        {calculateCharacterFree(character.characterName).toLocaleString()}
                      </span>
                      <Image src="/gold.webp" alt="귀속 골드" title="귀속 골드" width={isMobile ? 14 : 18} height={isMobile ? 14 : 18} style={{ borderRadius: '3px', filter: 'hue-rotate(220deg) saturate(0.85)', marginLeft: '4px' }} />
                      <span style={{
                        fontSize: isMobile ? '0.65rem' : '0.85rem',
                        fontWeight: 700,
                        color: '#a78bfa'
                      }}>
                        {calculateCharacterBound(character.characterName).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body style={{ padding: isMobile ? '0.3rem' : '0.75rem 0.75rem 0.5rem', position: 'relative', zIndex: 1 }}>
                  <Accordion flush className="theme-accordion">
                    {/* 체크된 레이드 그룹들 */}
                    {checkedGroups.map(groupName => {
                      const excluded = isGoldExcluded(character.characterName, groupName);
                      return (
                      <Accordion.Item eventKey={groupName} key={groupName} className="raid-group-accordion">
                        <Accordion.Header style={{ fontSize: isMobile ? '0.9rem' : '1.12rem', padding: isMobile ? '0.35rem' : '0.5rem' }}>
                          <div className="d-flex align-items-center w-100">
                            {raidImages[groupName] && (
                              <Image
                                src={raidImages[groupName]}
                                alt={groupName}
                                width={100}
                                height={100}
                                quality={100}
                                style={{
                                  marginLeft: isMobile ? '-1rem' : '-1.25rem',
                                  marginRight: '0.5rem',
                                  borderRadius: '4px',
                                  width: isMobile ? '38px' : '48px',
                                  height: isMobile ? '38px' : '48px',
                                  objectFit: 'cover',
                                  flexShrink: 0
                                }}
                              />
                            )}
                            <span style={{ fontWeight: 600 }}>{groupName}</span>
                            {excluded ? (
                              <>
                                <Badge className="ms-1 badge-gold-excluded" style={{
                                  fontSize: isMobile ? '0.55rem' : '0.68rem',
                                  backgroundColor: '#3b82f6',
                                  color: '#fff',
                                  fontWeight: 600,
                                  textShadow: hasBackground ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                                }}>
                                  골드 미수령
                                </Badge>
                                {hasMoreSelected(character.characterName, groupName) && (
                                  <>
                                    <Badge bg="danger" className="ms-1" style={{ fontSize: isMobile ? '0.55rem' : '0.68rem' }}>더보기</Badge>
                                    <Badge className="ms-1 badge-more-cost d-inline-flex align-items-center gap-1" style={{
                                      fontSize: isMobile ? '0.55rem' : '0.68rem',
                                      backgroundColor: '#3b82f6',
                                      color: '#fff',
                                      fontWeight: 700,
                                      textShadow: hasBackground ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                                    }}>
                                      <Image src="/gold.webp" alt="일반" title="일반 골드" width={isMobile ? 9 : 11} height={isMobile ? 9 : 11} style={{ borderRadius: '2px' }} />
                                      {calculateRaidGroupFree(character.characterName, groupName).toLocaleString()}
                                      <Image src="/gold.webp" alt="귀속" title="귀속 골드" width={isMobile ? 9 : 11} height={isMobile ? 9 : 11} style={{ borderRadius: '2px', filter: 'hue-rotate(220deg) saturate(0.85)', marginLeft: '2px' }} />
                                      {calculateRaidGroupBound(character.characterName, groupName).toLocaleString()}
                                    </Badge>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <Badge bg="success" className="ms-1 d-inline-flex align-items-center gap-1" style={{ fontSize: isMobile ? '0.55rem' : '0.73rem' }}>
                                  <Image src="/gold.webp" alt="일반" title="일반 골드" width={isMobile ? 10 : 12} height={isMobile ? 10 : 12} style={{ borderRadius: '2px' }} />
                                  {calculateRaidGroupFree(character.characterName, groupName).toLocaleString()}
                                  <Image src="/gold.webp" alt="귀속" title="귀속 골드" width={isMobile ? 10 : 12} height={isMobile ? 10 : 12} style={{ borderRadius: '2px', filter: 'hue-rotate(220deg) saturate(0.85)', marginLeft: '2px' }} />
                                  {calculateRaidGroupBound(character.characterName, groupName).toLocaleString()}
                                </Badge>
                                {hasMoreSelected(character.characterName, groupName) && (
                                  <Badge bg="danger" className="ms-1" style={{ fontSize: isMobile ? '0.55rem' : '0.68rem' }}>더보기</Badge>
                                )}
                              </>
                            )}
                            {(CORE_RAID_GROUPS.includes(groupName)) && (
                              <span className="ms-1 d-inline-flex align-items-center">
                                <img src="/cerka-core2.webp" alt="코어" width={isMobile ? 20 : 26} height={isMobile ? 20 : 26} style={{ borderRadius: '3px' }} />
                                <span style={{ marginLeft: '3px', fontWeight: 700, color: 'var(--text-primary)', fontSize: isMobile ? '0.75rem' : '0.88rem' }}>
                                  x{calculateRaidGroupCores(character.characterName, groupName)}
                                </span>
                              </span>
                            )}
                          </div>
                        </Accordion.Header>
                        <Accordion.Body style={{ padding: isMobile ? '0.5rem' : '1.2rem' }}>
                          <Accordion flush>
                            {groupedRaids[groupName].map(raid => {
                              const isSelected = hasAnyGateSelected(character.characterName, raid.name);
                              return (
                              <Accordion.Item eventKey={raid.name} key={raid.name} className="raid-difficulty-accordion">
                                <Accordion.Header style={{ fontSize: isMobile ? '0.8rem' : '1rem', padding: isMobile ? '0.4rem' : '0.6rem' }}>
                                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>{raid.name}</span>
                                  <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.68rem' }}>
                                    {raid.level}
                                  </Badge>
                                  {isSelected && (
                                    <Badge bg="success" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.65rem' }}>✓</Badge>
                                  )}
                                </Accordion.Header>
                                <Accordion.Body style={{ padding: isMobile ? '0.25rem' : '0.9rem' }}>
                                  <Table bordered responsive className="raid-table mb-0" style={{ fontSize: isMobile ? '0.65rem' : '0.9rem', tableLayout: 'fixed' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '18%' : '20%', whiteSpace: 'nowrap' }}>관문</th>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                          <Form.Check
                                            type="checkbox"
                                            label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>클골</span>}
                                            checked={getHeaderCheckState(character.characterName, raid.name, 'withMore')}
                                            onChange={() => handleHeaderChange(character.characterName, raid.name, 'withMore')}
                                            style={{ marginBottom: 0 }}
                                          />
                                        </th>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                          <Form.Check
                                            type="checkbox"
                                            label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>더보기</span>}
                                            checked={getHeaderCheckState(character.characterName, raid.name, 'withoutMore')}
                                            onChange={() => handleHeaderChange(character.characterName, raid.name, 'withoutMore')}
                                            style={{ marginBottom: 0 }}
                                          />
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {raid.gates.map((gate: any) => (
                                        <tr key={`${raid.name}-${gate.gate}`}>
                                          <td style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', whiteSpace: 'nowrap' }}>{gate.gate}관</td>
                                          <td
                                            onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withMore')}
                                            style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', cursor: 'pointer' }}
                                          >
                                            <Form.Check
                                              type="radio"
                                              name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                              id={`${character.characterName}-${raid.name}-${gate.gate}-with-more`}
                                              label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>{gate.gold.toLocaleString()}</span>}
                                              checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withMore'}
                                              onChange={() => {}}
                                              style={{ marginBottom: 0 }}
                                            />
                                          </td>
                                          <td
                                            onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withoutMore')}
                                            style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', cursor: 'pointer' }}
                                          >
                                            <Form.Check
                                              type="radio"
                                              name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                              id={`${character.characterName}-${raid.name}-${gate.gate}-without-more`}
                                              label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>{(gate.gold - gate.moreGold).toLocaleString()}</span>}
                                              checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withoutMore'}
                                              onChange={() => {}}
                                              style={{ marginBottom: 0 }}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </Accordion.Body>
                              </Accordion.Item>
                              );
                            })}
                          </Accordion>
                        </Accordion.Body>
                      </Accordion.Item>
                      );
                    })}

                    {/* 체크되지 않은 레이드 그룹들 (접기/펼치기) */}
                    {uncheckedGroups.length > 0 && (
                      <>
                        <div className="text-center mt-4 mb-2">
                          <Button
                            variant="link"
                            onClick={() => setShowAllRaids(prev => ({
                              ...prev,
                              [character.characterName]: !prev[character.characterName]
                            }))}
                            style={{
                              fontSize: isMobile ? '0.7rem' : '0.85rem',
                              padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                              fontWeight: '600',
                              backgroundColor: showAll ? 'var(--card-header-bg)' : 'transparent',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease',
                              boxShadow: showAll ? 'var(--shadow-sm)' : 'none',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--card-header-bg)';
                              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = showAll ? 'var(--card-header-bg)' : 'transparent';
                              e.currentTarget.style.boxShadow = showAll ? 'var(--shadow-sm)' : 'none';
                            }}
                          >
                            {showAll ? (
                              <>
                                다른 레이드 접기
                              </>
                            ) : (
                              <>
                                다른 레이드 보기
                                <span style={{ marginLeft: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                                  ({uncheckedGroups.length}개)
                                </span>
                              </>
                            )}
                          </Button>
                        </div>
                        <Collapse in={showAll}>
                          <div>
                            {uncheckedGroups.map(groupName => (
                              <Accordion.Item eventKey={groupName} key={groupName} className="raid-group-accordion">
                                <Accordion.Header style={{ fontSize: isMobile ? '0.9rem' : '1.12rem', padding: isMobile ? '0.35rem' : '0.5rem' }}>
                                  <div className="d-flex align-items-center w-100">
                                    {raidImages[groupName] && (
                                      <Image
                                        src={raidImages[groupName]}
                                        alt={groupName}
                                        width={100}
                                        height={100}
                                        quality={100}
                                        style={{
                                          marginLeft: isMobile ? '-1rem' : '-1.25rem',
                                          marginRight: '0.5rem',
                                          borderRadius: '4px',
                                          opacity: 0.7,
                                          width: isMobile ? '38px' : '48px',
                                          height: isMobile ? '38px' : '48px',
                                          objectFit: 'cover',
                                          flexShrink: 0
                                        }}
                                      />
                                    )}
                                    <span style={{ fontWeight: 600, opacity: 0.7 }}>{groupName}</span>
                                    <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.55rem' : '0.73rem' }}>
                                      0 G
                                    </Badge>
                                    {(CORE_RAID_GROUPS.includes(groupName)) && (
                                      <span className="ms-1 d-inline-flex align-items-center" style={{ opacity: 0.7 }}>
                                        <img src="/cerka-core2.webp" alt="코어" width={isMobile ? 20 : 26} height={isMobile ? 20 : 26} style={{ borderRadius: '3px' }} />
                                        <span style={{ marginLeft: '3px', fontWeight: 700, color: 'var(--text-primary)', fontSize: isMobile ? '0.75rem' : '0.88rem' }}>
                                          x{calculateRaidGroupCores(character.characterName, groupName)}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </Accordion.Header>
                                <Accordion.Body style={{ padding: isMobile ? '0.5rem' : '1.2rem' }}>
                                  <Accordion flush>
                                    {groupedRaids[groupName].map(raid => {
                                      const isSelected = hasAnyGateSelected(character.characterName, raid.name);
                                      return (
                                      <Accordion.Item eventKey={raid.name} key={raid.name} className="raid-difficulty-accordion">
                                        <Accordion.Header style={{ fontSize: isMobile ? '0.8rem' : '1rem', padding: isMobile ? '0.4rem' : '0.6rem' }}>
                                          <span style={{ fontWeight: isSelected ? 600 : 400 }}>{raid.name}</span>
                                          <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.68rem' }}>
                                            {raid.level}
                                          </Badge>
                                          {isSelected && (
                                            <Badge bg="success" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.65rem' }}>✓</Badge>
                                          )}
                                        </Accordion.Header>
                                        <Accordion.Body style={{ padding: isMobile ? '0.25rem' : '0.9rem' }}>
                                          <Table striped bordered hover responsive className="raid-table mb-0" style={{ fontSize: isMobile ? '0.65rem' : '0.9rem', tableLayout: 'fixed' }}>
                                            <thead>
                                              <tr>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '18%' : '20%', whiteSpace: 'nowrap' }}>관문</th>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                                  <Form.Check
                                                    type="checkbox"
                                                    label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>클골</span>}
                                                    checked={getHeaderCheckState(character.characterName, raid.name, 'withMore')}
                                                    onChange={() => handleHeaderChange(character.characterName, raid.name, 'withMore')}
                                                    style={{ marginBottom: 0 }}
                                                  />
                                                </th>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                                  <Form.Check
                                                    type="checkbox"
                                                    label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>더보기</span>}
                                                    checked={getHeaderCheckState(character.characterName, raid.name, 'withoutMore')}
                                                    onChange={() => handleHeaderChange(character.characterName, raid.name, 'withoutMore')}
                                                    style={{ marginBottom: 0 }}
                                                  />
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {raid.gates.map((gate: any) => (
                                                <tr key={`${raid.name}-${gate.gate}`}>
                                                  <td style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', whiteSpace: 'nowrap' }}>{gate.gate}관</td>
                                                  <td
                                                    onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withMore')}
                                                    style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', cursor: 'pointer' }}
                                                  >
                                                    <Form.Check
                                                      type="radio"
                                                      name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                                      id={`${character.characterName}-${raid.name}-${gate.gate}-with-more-hidden`}
                                                      label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>{gate.gold.toLocaleString()}</span>}
                                                      checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withMore'}
                                                      onChange={() => {}}
                                                      style={{ marginBottom: 0 }}
                                                    />
                                                  </td>
                                                  <td
                                                    onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withoutMore')}
                                                    style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', cursor: 'pointer' }}
                                                  >
                                                    <Form.Check
                                                      type="radio"
                                                      name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                                      id={`${character.characterName}-${raid.name}-${gate.gate}-without-more-hidden`}
                                                      label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>{(gate.gold - gate.moreGold).toLocaleString()}</span>}
                                                      checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withoutMore'}
                                                      onChange={() => {}}
                                                      style={{ marginBottom: 0 }}
                                                    />
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </Table>
                                        </Accordion.Body>
                                      </Accordion.Item>
                                      );
                                    })}
                                  </Accordion>
                                </Accordion.Body>
                              </Accordion.Item>
                            ))}
                          </div>
                        </Collapse>
                      </>
                    )}
                  </Accordion>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Card className="mt-2 total-gold-card">
        <Card.Body style={{ padding: isMobile ? '0.75rem' : '1.3rem' }}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div style={{ flex: 1, minWidth: 0 }} />
            <div className="d-flex align-items-center justify-content-center flex-wrap gap-2 gap-md-3" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: isMobile ? '0.95rem' : '1.25rem' }}>
              <span className="d-inline-flex align-items-center gap-1">
                <Image src="/gold.webp" alt="일반 골드" title="일반 골드" width={isMobile ? 22 : 30} height={isMobile ? 22 : 30} style={{ borderRadius: '5px' }} />
                <span>일반 {calculateTotalFree().toLocaleString()}</span>
              </span>
              <span className="d-inline-flex align-items-center gap-1" style={{ color: '#a78bfa' }}>
                <Image src="/gold.webp" alt="귀속 골드" title="귀속 골드" width={isMobile ? 22 : 30} height={isMobile ? 22 : 30} style={{ borderRadius: '5px', filter: 'hue-rotate(220deg) saturate(0.85)' }} />
                <span>귀속 {calculateTotalBound().toLocaleString()}</span>
              </span>
              <span style={{ opacity: 0.8, fontSize: isMobile ? '0.85rem' : '1rem' }}>
                = 총 {calculateTotalGold().toLocaleString()} G
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
              <SaveButton isMobile={isMobile} onSave={saveSettings} />
            </div>
          </div>
        </Card.Body>
      </Card>

    </div>
  );
}
