'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useSearchHistory } from '@/lib/useSearchHistory';
import Image from 'next/image';
import { useTheme } from '../ThemeProvider';
import styles from './RefiningSimulator.module.css';
import {
  BASE_PROBABILITY,
  SUCCESSION_BASE_PROBABILITY,
  ARMOR_MATERIAL_COSTS,
  WEAPON_MATERIAL_COSTS,
  SUCCESSION_ARMOR_MATERIAL_COSTS,
  SUCCESSION_WEAPON_MATERIAL_COSTS,
  getBreathEffect,
  getBookEffect,
  getBookType,
  JANGIN_ACCUMULATE_DIVIDER
} from '../../lib/refiningData';
import { MATERIAL_BUNDLE_SIZES, MATERIAL_IDS } from '../../data/raidRewards';
import {
  parseEquipmentData,
  type Equipment as EquipmentType,
  type EquipmentAPIResponse
} from '../../lib/equipmentParser';
import { saveRefiningResult, RefiningResult } from '../../lib/supabase';
import RefiningStats from './RefiningStats';

type Equipment = EquipmentType;

// 재료별 아이템 ID 매핑
const REFINING_MATERIAL_IDS: Record<string, number> = {
  수호석: MATERIAL_IDS.FATE_GUARDIAN_STONE,
  파괴석: MATERIAL_IDS.FATE_DESTRUCTION_STONE,
  돌파석: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE,
  아비도스: MATERIAL_IDS.ABIDOS_FUSION,
  운명파편: MATERIAL_IDS.FATE_FRAGMENT,
  빙하: 66111132,
  용암: 66111131,
  수호석결정: MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL,
  파괴석결정: MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL,
  위대한돌파석: MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE,
  상급아비도스: MATERIAL_IDS.ADVANCED_ABIDOS_FUSION,
  // 책 아이템 ID
  야금술1114: 66112543,
  야금술1518: 66112551,
  야금술1920: 66112553,
  재봉술1114: 66112546,
  재봉술1518: 66112552,
  재봉술1920: 66112554,
};
type RefiningType = 'normal' | 'advanced'; // 일반재련 / 상급재련

interface RefiningSimulatorProps {
  onSearchComplete?: (searched: boolean) => void;
  refiningType?: RefiningType;
  showStats?: boolean;
}

interface RefiningAttempt {
  attemptNumber: number;
  success: boolean;
  janginBefore: number;
  janginAfter: number;
  janginIncrease: number;
  probabilityBefore: number;
  probabilityAfter: number;
  level: number;
}

interface AccumulatedCost {
  수호석: number;
  파괴석: number;
  돌파석: number;
  아비도스: number;
  운명파편: number;
  골드: number;
  빙하: number;
  용암: number;
  수호석결정: number;
  파괴석결정: number;
  위대한돌파석: number;
  상급아비도스: number;
  실링: number;
  // 책
  야금술1114: number;
  야금술1518: number;
  야금술1920: number;
  재봉술1114: number;
  재봉술1518: number;
  재봉술1920: number;
}

export default function RefiningSimulator({ onSearchComplete, refiningType = 'normal', showStats = true }: RefiningSimulatorProps) {
  const { theme } = useTheme();

  // 선택된 장비에 따라 계승 모드 자동 판별 (isSuccession: true면 계승 후)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const isSuccessionMode = selectedEquipment?.isSuccession ?? false;

  // 검색 관련 상태
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searched, setSearched] = useState(false);

  // 자동완성
  const { history, addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // 시뮬레이션 상태
  const [currentLevel, setCurrentLevel] = useState<number>(11);
  const [jangin, setJangin] = useState<number>(0);
  const [currentProbBonus, setCurrentProbBonus] = useState<number>(0);
  const [useBreath, setUseBreath] = useState<boolean>(false);
  const [useBook, setUseBook] = useState<boolean>(false);
  const [attemptHistory, setAttemptHistory] = useState<RefiningAttempt[]>([]);
  const [baseItemLevel, setBaseItemLevel] = useState<number>(0);
  const [itemLevelIncrease, setItemLevelIncrease] = useState<number>(0);
  // 장비별 강화 진행 상태 추적 (장비이름 -> 강화된 레벨)
  const [enhancedLevels, setEnhancedLevels] = useState<Record<string, number>>({});
  const [accumulatedCost, setAccumulatedCost] = useState<AccumulatedCost>({
    수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0, 빙하: 0, 용암: 0,
    수호석결정: 0, 파괴석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 실링: 0,
    야금술1114: 0, 야금술1518: 0, 야금술1920: 0, 재봉술1114: 0, 재봉술1518: 0, 재봉술1920: 0
  });
  const [isAnimating, setIsAnimating] = useState(false);

  // 현재 레벨 강화를 위한 시도 횟수 및 비용 (성공 시 저장 후 초기화)
  const [levelAttempts, setLevelAttempts] = useState(0);
  const [levelCost, setLevelCost] = useState<AccumulatedCost>({
    수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0, 빙하: 0, 용암: 0,
    수호석결정: 0, 파괴석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 실링: 0,
    야금술1114: 0, 야금술1518: 0, 야금술1920: 0, 재봉술1114: 0, 재봉술1518: 0, 재봉술1920: 0
  });
  const [usedBreathThisLevel, setUsedBreathThisLevel] = useState(false);
  const [breathCountThisLevel, setBreathCountThisLevel] = useState(0);  // 숨결 사용 횟수
  const [usedBookThisLevel, setUsedBookThisLevel] = useState(false);
  const [bookCountThisLevel, setBookCountThisLevel] = useState(0);  // 책 사용 횟수

  // 거래소 가격
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

  // 거래소 가격 로드
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const { fetchPriceData } = await import('@/lib/price-history-client');
        const { latest } = await fetchPriceData();
        const prices: Record<string, number> = {};
        Object.entries(latest).forEach(([itemId, bundlePrice]) => {
          const bundleSize = MATERIAL_BUNDLE_SIZES[Number(itemId)] || 1;
          prices[itemId] = bundlePrice / bundleSize;
        });
        setMarketPrices(prices);
      } catch (error) {
        console.error('Failed to fetch latest prices:', error);
      }
    };
    fetchMarketPrices();
  }, []);

  // 기록 스크롤 (히스토리 리스트 내에서만)
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [attemptHistory]);

  // 캐릭터 검색
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim()) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lostark?characterName=${encodeURIComponent(characterName.trim())}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('캐릭터를 찾을 수 없습니다.');
        }
        throw new Error('캐릭터 정보를 가져오는데 실패했습니다.');
      }

      const data = await response.json();

      if (!data.equipment || !Array.isArray(data.equipment)) {
        throw new Error('장비 정보를 찾을 수 없습니다.');
      }

      const parsedEquipments = parseEquipmentData(data.equipment as EquipmentAPIResponse[]);

      if (parsedEquipments.length === 0) {
        throw new Error('1640 레벨(+11) 이상의 장비가 없습니다.');
      }

      // 캐릭터 아이템 레벨 가져오기
      const itemLevel = data.profile?.ItemMaxLevel || data.profile?.ItemAvgLevel || '0';
      const parsedItemLevel = parseFloat(itemLevel.replace(/,/g, ''));
      setBaseItemLevel(parsedItemLevel);

      setEquipments(parsedEquipments);
      addToHistory(characterName.trim());
      setShowSuggestions(false);
      setSearched(true);
      onSearchComplete?.(true);
      setSelectedEquipment(null);
      resetSimulation();
    } catch (error: any) {
      setError(error.message || '예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setCharacterName(value);
    if (error) setError(null);
    if (value.trim()) {
      const matches = getSuggestions(value);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions(history);
      setShowSuggestions(history.length > 0);
    }
    setSelectedIndex(-1);
  };

  const handleSelectSuggestion = (name: string) => {
    setCharacterName(name);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    // 이미 강화한 적 있는 장비면 그 레벨 불러오기, 아니면 원래 레벨
    const savedLevel = enhancedLevels[equipment.name];
    setCurrentLevel(savedLevel !== undefined ? savedLevel : equipment.currentLevel);
    // 장비 변경 시 장인의 기운과 확률 보너스 초기화 (누적 비용은 유지)
    setJangin(0);
    setCurrentProbBonus(0);
    // 레벨별 추적 초기화 (장비 변경 시 이전 장비 비용이 섞이지 않도록)
    setLevelAttempts(0);
    setLevelCost({
      수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0, 빙하: 0, 용암: 0,
      수호석결정: 0, 파괴석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 실링: 0,
      야금술1114: 0, 야금술1518: 0, 야금술1920: 0, 재봉술1114: 0, 재봉술1518: 0, 재봉술1920: 0
    });
    setUsedBreathThisLevel(false);
    setBreathCountThisLevel(0);
    setUsedBookThisLevel(false);
    setBookCountThisLevel(0);
  };

  const resetSimulation = () => {
    if (selectedEquipment) {
      setCurrentLevel(selectedEquipment.currentLevel);
    }
    setJangin(0);
    setCurrentProbBonus(0);
    setUseBreath(false);
    setUseBook(false);
    setAttemptHistory([]);
    setItemLevelIncrease(0);
    setEnhancedLevels({}); // 모든 장비의 강화 진행 상태 초기화
    setAccumulatedCost({
      수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0, 빙하: 0, 용암: 0,
      수호석결정: 0, 파괴석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 실링: 0,
      야금술1114: 0, 야금술1518: 0, 야금술1920: 0, 재봉술1114: 0, 재봉술1518: 0, 재봉술1920: 0
    });
    // 레벨별 추적 초기화
    setLevelAttempts(0);
    setLevelCost({
      수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0, 빙하: 0, 용암: 0,
      수호석결정: 0, 파괴석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 실링: 0,
      야금술1114: 0, 야금술1518: 0, 야금술1920: 0, 재봉술1114: 0, 재봉술1518: 0, 재봉술1920: 0
    });
    setUsedBreathThisLevel(false);
    setBreathCountThisLevel(0);
    setUsedBookThisLevel(false);
    setBookCountThisLevel(0);
  };

  const getBaseProb = (level: number): number => {
    if (isSuccessionMode) {
      return SUCCESSION_BASE_PROBABILITY[level] || 0;
    }
    return BASE_PROBABILITY[level] || 0;
  };

  const calculateFinalProb = (): number => {
    const baseProb = getBaseProb(currentLevel);
    if (baseProb === 0) return 0;

    // 책 효과 적용 (계승 전 11-20 구간만, 기본 확률 2배)
    const bookMultiplier = (!isSuccessionMode && useBook) ? getBookEffect(currentLevel) : 1;
    const effectiveBaseProb = baseProb * bookMultiplier;

    let currentProb = effectiveBaseProb + currentProbBonus;
    currentProb = Math.min(currentProb, effectiveBaseProb * 2);

    const breathEffect = getBreathEffect(baseProb);
    const breathProb = useBreath ? breathEffect.max * breathEffect.per : 0;

    if (jangin >= 1) return 1;

    return Math.min(currentProb + breathProb, 1);
  };

  // 책 사용 가능 여부 (계승 전 11-20 구간만)
  const canUseBook = !isSuccessionMode && currentLevel >= 11 && currentLevel <= 20;

  const getMaterialCost = () => {
    if (!selectedEquipment) return null;
    const nextLevel = currentLevel + 1;
    const isWeapon = selectedEquipment.type === 'weapon';

    if (isSuccessionMode) {
      if (isWeapon) return SUCCESSION_WEAPON_MATERIAL_COSTS[nextLevel] || null;
      return SUCCESSION_ARMOR_MATERIAL_COSTS[nextLevel] || null;
    } else {
      if (isWeapon) return WEAPON_MATERIAL_COSTS[nextLevel] || null;
      return ARMOR_MATERIAL_COSTS[nextLevel] || null;
    }
  };

  const attemptRefining = async () => {
    if (!selectedEquipment) return;

    const baseProb = getBaseProb(currentLevel);
    if (baseProb === 0) return;

    const finalProb = calculateFinalProb();
    const janginBefore = jangin;
    const probBefore = finalProb;

    // 현재 레벨 시도 횟수 증가
    const newLevelAttempts = levelAttempts + 1;
    setLevelAttempts(newLevelAttempts);

    // 숨결 사용 여부 및 횟수 추적
    let newBreathCount = breathCountThisLevel;
    if (useBreath) {
      setUsedBreathThisLevel(true);
      newBreathCount = breathCountThisLevel + 1;
      setBreathCountThisLevel(newBreathCount);
    }

    // 책 사용 여부 및 횟수 추적 (계승 전만)
    let newBookCount = bookCountThisLevel;
    if (useBook && canUseBook) {
      setUsedBookThisLevel(true);
      newBookCount = bookCountThisLevel + 1;
      setBookCountThisLevel(newBookCount);
    }

    // 재료 비용 누적 (전체 누적 + 레벨별 누적)
    const materialCost = getMaterialCost();
    let newLevelCost = { ...levelCost };
    if (materialCost) {
      // 전체 누적 비용
      setAccumulatedCost(prev => {
        const newCost = { ...prev };
        if (isSuccessionMode) {
          if ('수호석결정' in materialCost) newCost.수호석결정 += (materialCost as any).수호석결정 || 0;
          if ('파괴석결정' in materialCost) newCost.파괴석결정 += (materialCost as any).파괴석결정 || 0;
          newCost.위대한돌파석 += (materialCost as any).위대한돌파석 || 0;
          newCost.상급아비도스 += (materialCost as any).상급아비도스 || 0;
          newCost.운명파편 += (materialCost as any).운명파편 || 0;
          newCost.실링 += (materialCost as any).실링 || 0;
          newCost.골드 += (materialCost as any).골드 || 0;
        } else {
          if ('수호석' in materialCost) newCost.수호석 += (materialCost as any).수호석 || 0;
          if ('파괴석' in materialCost) newCost.파괴석 += (materialCost as any).파괴석 || 0;
          newCost.돌파석 += (materialCost as any).돌파석 || 0;
          newCost.아비도스 += (materialCost as any).아비도스 || 0;
          newCost.운명파편 += (materialCost as any).운명파편 || 0;
          newCost.골드 += (materialCost as any).골드 || 0;
        }
        if (useBreath) {
          const breathEffect = getBreathEffect(baseProb);
          if (selectedEquipment.type === 'weapon') newCost.용암 += breathEffect.max;
          else newCost.빙하 += breathEffect.max;
        }
        // 책 비용 누적 (계승 전만)
        if (useBook && canUseBook) {
          const bookType = getBookType(currentLevel);
          if (bookType) {
            if (selectedEquipment.type === 'weapon') {
              newCost[`야금술${bookType}` as keyof AccumulatedCost] += 1;
            } else {
              newCost[`재봉술${bookType}` as keyof AccumulatedCost] += 1;
            }
          }
        }
        return newCost;
      });

      // 레벨별 비용 누적
      if (isSuccessionMode) {
        if ('수호석결정' in materialCost) newLevelCost.수호석결정 += (materialCost as any).수호석결정 || 0;
        if ('파괴석결정' in materialCost) newLevelCost.파괴석결정 += (materialCost as any).파괴석결정 || 0;
        newLevelCost.위대한돌파석 += (materialCost as any).위대한돌파석 || 0;
        newLevelCost.상급아비도스 += (materialCost as any).상급아비도스 || 0;
        newLevelCost.운명파편 += (materialCost as any).운명파편 || 0;
        newLevelCost.실링 += (materialCost as any).실링 || 0;
        newLevelCost.골드 += (materialCost as any).골드 || 0;
      } else {
        if ('수호석' in materialCost) newLevelCost.수호석 += (materialCost as any).수호석 || 0;
        if ('파괴석' in materialCost) newLevelCost.파괴석 += (materialCost as any).파괴석 || 0;
        newLevelCost.돌파석 += (materialCost as any).돌파석 || 0;
        newLevelCost.아비도스 += (materialCost as any).아비도스 || 0;
        newLevelCost.운명파편 += (materialCost as any).운명파편 || 0;
        newLevelCost.골드 += (materialCost as any).골드 || 0;
      }
      if (useBreath) {
        const breathEffect = getBreathEffect(baseProb);
        if (selectedEquipment.type === 'weapon') newLevelCost.용암 += breathEffect.max;
        else newLevelCost.빙하 += breathEffect.max;
      }
      // 레벨별 책 비용 누적 (계승 전만)
      if (useBook && canUseBook) {
        const bookType = getBookType(currentLevel);
        if (bookType) {
          if (selectedEquipment.type === 'weapon') {
            newLevelCost[`야금술${bookType}` as keyof AccumulatedCost] += 1;
          } else {
            newLevelCost[`재봉술${bookType}` as keyof AccumulatedCost] += 1;
          }
        }
      }
      setLevelCost(newLevelCost);
    }

    const roll = Math.random();
    const success = jangin >= 1 || roll < finalProb;

    let janginAfter = jangin;
    let janginIncrease = 0;
    let probAfter = finalProb;

    if (success) {
      const newLevel = currentLevel + 1;

      // Supabase에 결과 저장
      // 장비 이름은 통계를 위해 통일 (계승 전: 업화, 계승 후: 전율)
      const equipmentName = isSuccessionMode
        ? (selectedEquipment.type === 'weapon' ? '전율 무기' : '전율 방어구')
        : (selectedEquipment.type === 'weapon' ? '업화 무기' : '업화 방어구');

      const refiningResult: RefiningResult = {
        equipment_type: selectedEquipment.type === 'weapon' ? 'weapon' : 'armor',
        equipment_name: equipmentName,
        is_succession: isSuccessionMode,
        from_level: currentLevel,
        to_level: newLevel,
        attempts: newLevelAttempts,
        use_breath: usedBreathThisLevel || useBreath,
        fate_fragment: newLevelCost.운명파편 || undefined,
        gold: newLevelCost.골드 || undefined,
      };

      // 계승 여부에 따라 재료 추가
      if (isSuccessionMode) {
        refiningResult.destruction_crystal = newLevelCost.파괴석결정 || undefined;
        refiningResult.guardian_crystal = newLevelCost.수호석결정 || undefined;
        refiningResult.great_breakthrough = newLevelCost.위대한돌파석 || undefined;
        refiningResult.advanced_abidos = newLevelCost.상급아비도스 || undefined;
        refiningResult.shilling = newLevelCost.실링 || undefined;
      } else {
        refiningResult.destruction_stone = newLevelCost.파괴석 || undefined;
        refiningResult.guardian_stone = newLevelCost.수호석 || undefined;
        refiningResult.breakthrough_stone = newLevelCost.돌파석 || undefined;
        refiningResult.abidos = newLevelCost.아비도스 || undefined;
      }

      // 숨결 사용량 및 횟수 추가
      if (newLevelCost.용암 > 0) refiningResult.lava_breath = newLevelCost.용암;
      if (newLevelCost.빙하 > 0) refiningResult.glacier_breath = newLevelCost.빙하;
      if (newBreathCount > 0) refiningResult.breath_count = newBreathCount;

      // 성공 시점 장인의 기운 저장 (%) - 소수점 셋째자리에서 버림
      refiningResult.final_jangin = Math.floor(jangin * 10000) / 100;

      // 비동기로 저장 (실패해도 시뮬레이션은 계속)
      saveRefiningResult(refiningResult).catch(err => {
        console.error('Failed to save refining result:', err);
      });

      // 레벨별 추적 초기화
      setLevelAttempts(0);
      setLevelCost({
        수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0, 빙하: 0, 용암: 0,
        수호석결정: 0, 파괴석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 실링: 0,
        야금술1114: 0, 야금술1518: 0, 야금술1920: 0, 재봉술1114: 0, 재봉술1518: 0, 재봉술1920: 0
      });
      setUsedBreathThisLevel(false);
      setBreathCountThisLevel(0);
      setUsedBookThisLevel(false);
      setBookCountThisLevel(0);

      setCurrentLevel(newLevel);
      setJangin(0);
      setCurrentProbBonus(0);
      setItemLevelIncrease(prev => prev + (5 / 6)); // 1강당 0.83333 레벨 증가
      // 장비별 강화 레벨 저장
      setEnhancedLevels(prev => ({
        ...prev,
        [selectedEquipment.name]: newLevel
      }));
      janginAfter = 0;
      probAfter = getBaseProb(newLevel);
    } else {
      janginIncrease = finalProb / JANGIN_ACCUMULATE_DIVIDER;
      janginAfter = Math.min(jangin + janginIncrease, 1);
      setJangin(janginAfter);

      const newBonus = Math.min(currentProbBonus + baseProb * 0.1, baseProb);
      setCurrentProbBonus(newBonus);

      // 새 확률 계산
      let newProb = baseProb + newBonus;
      newProb = Math.min(newProb, baseProb * 2);
      const breathEffect = getBreathEffect(baseProb);
      const breathProb = useBreath ? breathEffect.max * breathEffect.per : 0;
      probAfter = Math.min(newProb + breathProb, 1);

      // 애니메이션 트리거
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }

    const attempt: RefiningAttempt = {
      attemptNumber: attemptHistory.length + 1,
      success,
      janginBefore,
      janginAfter,
      janginIncrease,
      probabilityBefore: probBefore,
      probabilityAfter: probAfter,
      level: currentLevel
    };
    setAttemptHistory(prev => [...prev, attempt]);
  };

  const calculateTotalGoldCost = (): number => {
    let total = accumulatedCost.골드;
    total += accumulatedCost.수호석 * (marketPrices['66102106'] || 0);
    total += accumulatedCost.파괴석 * (marketPrices['66102006'] || 0);
    total += accumulatedCost.돌파석 * (marketPrices['66110225'] || 0);
    total += accumulatedCost.아비도스 * (marketPrices['6861012'] || 0);
    total += accumulatedCost.운명파편 * (marketPrices['66130143'] || 0);
    total += accumulatedCost.빙하 * (marketPrices['66111132'] || 0);
    total += accumulatedCost.용암 * (marketPrices['66111131'] || 0);
    total += accumulatedCost.수호석결정 * (marketPrices['66102107'] || 0);
    total += accumulatedCost.파괴석결정 * (marketPrices['66102007'] || 0);
    total += accumulatedCost.위대한돌파석 * (marketPrices['66110226'] || 0);
    total += accumulatedCost.상급아비도스 * (marketPrices['6861013'] || 0);
    // 책 비용 추가
    total += accumulatedCost.야금술1114 * (marketPrices['66112543'] || 0);
    total += accumulatedCost.야금술1518 * (marketPrices['66112551'] || 0);
    total += accumulatedCost.야금술1920 * (marketPrices['66112553'] || 0);
    total += accumulatedCost.재봉술1114 * (marketPrices['66112546'] || 0);
    total += accumulatedCost.재봉술1518 * (marketPrices['66112552'] || 0);
    total += accumulatedCost.재봉술1920 * (marketPrices['66112554'] || 0);
    return Math.round(total);
  };

  // 재료별 골드 가격 계산
  const getMaterialGoldCost = (materialKey: keyof typeof REFINING_MATERIAL_IDS, amount: number): number => {
    const itemId = REFINING_MATERIAL_IDS[materialKey];
    const unitPrice = marketPrices[String(itemId)] || 0;
    return Math.round(amount * unitPrice);
  };

  // 에스더 장비 제외, 업화/전율 모두 표시 (업화 먼저, 전율 나중)
  const filteredEquipments = equipments
    .filter(eq => !eq.isEsther)
    .sort((a, b) => {
      // 업화(계승 전)를 먼저, 전율(계승 후)를 나중에
      if (a.isSuccession !== b.isSuccession) return a.isSuccession ? 1 : -1;
      return 0;
    });

  const maxLevel = 25; // 계승 전/후 모두 25가 최대
  const canRefine = selectedEquipment && currentLevel < maxLevel && getBaseProb(currentLevel) > 0;
  const materialCost = getMaterialCost();

  return (
    <div className={styles.container}>
      {/* 검색창 */}
      <div className={styles.searchWrapper}>
        <div className={styles.searchInner}>
          <Form onSubmit={handleSearch}>
            <div className={styles.searchInputGroup}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Form.Control
                  ref={inputRef}
                  type="text"
                  placeholder="캐릭터명을 입력하세요"
                  value={characterName}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (history.length > 0) {
                      setSuggestions(characterName.trim() ? getSuggestions(characterName) : history);
                      setShowSuggestions(true);
                    }
                  }}
                  className={styles.searchInput}
                  disabled={isLoading}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', marginTop: '4px', zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    {suggestions.map((name, index) => (
                      <div
                        key={name}
                        onClick={() => handleSelectSuggestion(name)}
                        style={{
                          padding: '0.75rem 1rem', cursor: 'pointer',
                          backgroundColor: index === selectedIndex ? 'var(--card-body-bg-blue)' : 'transparent',
                          borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none'
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" className={styles.searchButton} disabled={isLoading}>
                {isLoading ? '검색 중...' : '검색'}
              </Button>
            </div>
          </Form>
        </div>
      </div>

      {error && (
        <div className={styles.errorWrapper}>
          <div className={styles.errorMessage}>{error}</div>
        </div>
      )}

      <div className={styles.mainLayout}>
        {/* 장비 목록 패널 */}
        <div className={styles.equipmentPanel}>
          <div className={styles.equipmentPanelTitle}>
            장비 선택
          </div>
          <div className={styles.equipmentList}>
            {!searched ? (
              <div className={styles.equipmentListPlaceholder}>
                <div className={styles.placeholderIcon}>🔍</div>
                <div className={styles.placeholderText}>캐릭터를 검색해주세요</div>
              </div>
            ) : filteredEquipments.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                장비가 없습니다.
              </div>
            ) : (
              filteredEquipments.map((equipment) => (
                  <div
                    key={equipment.name}
                    className={`${styles.equipmentItem} ${selectedEquipment?.name === equipment.name ? styles.equipmentItemSelected : ''} ${equipment.isSuccession ? styles.equipmentItemSuccession : styles.equipmentItemNormal}`}
                    onClick={() => handleSelectEquipment(equipment)}
                  >
                    <div className={styles.equipmentIcon}>
                      {equipment.icon && (
                        <Image
                          src={equipment.icon}
                          alt={equipment.name}
                          width={36}
                          height={36}
                          style={{ objectFit: 'contain' }}
                        />
                      )}
                      {equipment.isSuccession && (
                        <Image
                          src="/wjsdbf2.webp"
                          alt=""
                          width={56}
                          height={56}
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                          }}
                          unoptimized
                        />
                      )}
                    </div>
                    <div className={styles.equipmentInfo}>
                      <div className={styles.equipmentName}>{equipment.name}</div>
                      <div className={styles.equipmentLevel}>
                        {enhancedLevels[equipment.name] !== undefined && enhancedLevels[equipment.name] !== equipment.currentLevel ? (
                          <span className={styles.levelProgress}>
                            <span className={`${styles.levelBadge} ${equipment.type === 'weapon' ? styles.levelBadgeWeapon : styles.levelBadgeArmor}`}>
                              +{equipment.currentLevel}
                            </span>
                            <span className={styles.levelArrow}>→</span>
                            <span className={`${styles.levelBadge} ${equipment.type === 'weapon' ? styles.levelBadgeWeapon : styles.levelBadgeArmor}`}>
                              +{enhancedLevels[equipment.name]}
                            </span>
                          </span>
                        ) : (
                          <span className={`${styles.levelBadge} ${equipment.type === 'weapon' ? styles.levelBadgeWeapon : styles.levelBadgeArmor}`}>
                            +{equipment.currentLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 시뮬레이터 - 3개의 상자 */}
          <div className={styles.simulatorPanel}>
            {!selectedEquipment ? (
              <div className={styles.simulatorEmpty}>
                <div className={styles.simulatorEmptyIcon}>🔨</div>
                <div className={styles.simulatorEmptyTitle}>장비를 선택해주세요</div>
                <div className={styles.simulatorEmptyDesc}>
                  왼쪽 목록에서 강화할 장비를 선택하면<br />
                  실제 강화 시뮬레이션을 시작할 수 있습니다.
                </div>
              </div>
            ) : (
              <div className={styles.threeBoxLayout}>
                {/* 첫 번째 상자: 강화 정보 및 버튼 */}
                <div className={styles.box}>
                  <div className={styles.boxTitle}>강화 정보</div>

                  {currentLevel >= maxLevel ? (
                    /* 25강 완료 화면 */
                    <>
                      <div className={`${styles.maxLevelComplete} ${selectedEquipment.type === 'weapon' ? styles.maxLevelWeapon : styles.maxLevelArmor}`}>
                        <div className={styles.maxLevelIcon}>
                          {selectedEquipment.icon && (
                            <Image src={selectedEquipment.icon} alt={selectedEquipment.name} fill sizes="80px" style={{ objectFit: 'contain' }} />
                          )}
                        </div>
                        <div className={`${styles.maxLevelBadge} ${selectedEquipment.type === 'weapon' ? styles.maxLevelBadgeWeapon : styles.maxLevelBadgeArmor}`}>
                          <span className={styles.maxLevelText}>+25 MAX</span>
                        </div>
                        <div className={styles.maxLevelTitle}>강화 완료!</div>
                        <div className={styles.maxLevelSubtitle}>최고 단계에 도달했습니다</div>
                        <div className={styles.maxLevelEquipName}>{selectedEquipment.name}</div>
                      </div>
                      <div className={styles.maxLevelButtons}>
                        <button className={styles.resetButton} onClick={resetSimulation}>
                          초기화
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 장비 현황 및 목표 */}
                      <div className={styles.equipmentStatus}>
                        <div className={styles.equipmentStatusIcon}>
                          {selectedEquipment.icon && (
                            <Image src={selectedEquipment.icon} alt={selectedEquipment.name} fill sizes="56px" style={{ objectFit: 'contain' }} />
                          )}
                        </div>
                        <div className={styles.equipmentStatusInfo}>
                          <div className={styles.equipmentStatusName}>{selectedEquipment.name}</div>
                          <div className={styles.equipmentStatusLevel}>
                            <span className={styles.currentLevelBig}>+{currentLevel}</span>
                            <span className={styles.levelArrowBig}>→</span>
                            <span className={styles.targetLevelBig}>+{currentLevel + 1}</span>
                          </div>
                        </div>
                      </div>

                      {/* 강화 확률 */}
                      <div className={styles.probabilitySection}>
                        <div className={styles.probabilityLabel}>강화 확률</div>
                        <div className={styles.probabilityValue}>
                          {jangin >= 1 ? (
                            <span className={styles.probabilityGuaranteed}>100% (장인의 기운)</span>
                          ) : (
                            <>
                              <span className={styles.probabilityNumber}>{(calculateFinalProb() * 100).toFixed(2)}%</span>
                              <span className={styles.probabilityBase}>(기본 {(getBaseProb(currentLevel) * 100).toFixed(1)}%)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 장인의 기운 */}
                      <div className={styles.janginSection}>
                        <div className={styles.janginHeader}>
                          <span className={styles.janginLabel}>장인의 기운</span>
                          <span className={styles.janginValue}>{(Math.floor(jangin * 10000) / 100).toFixed(2)}%</span>
                        </div>
                        <div className={styles.janginBarOuter}>
                          <div
                            className={`${styles.janginBarInner} ${isAnimating ? styles.janginBarAnimating : ''}`}
                            style={{ width: `${Math.min(jangin * 100, 100)}%` }}
                          >
                            <div className={styles.janginBarGlow}></div>
                          </div>
                        </div>
                      </div>

                      {/* 숨결 및 책 옵션 */}
                      <div className={styles.optionsRow}>
                        <button
                          className={`${styles.breathButton} ${useBreath ? styles.breathButtonActive : ''}`}
                          onClick={() => setUseBreath(!useBreath)}
                        >
                          <div className={styles.breathIcon}>
                            <Image
                              src={selectedEquipment.type === 'weapon' ? '/breath-lava5.webp' : '/breath-glacier5.webp'}
                              alt="숨결" fill style={{ objectFit: 'contain' }}
                            />
                          </div>
                          <span>{selectedEquipment.type === 'weapon' ? '용암의 숨결' : '빙하의 숨결'}</span>
                          {useBreath && <span className={styles.breathCount}>({getBreathEffect(getBaseProb(currentLevel)).max}개)</span>}
                        </button>

                        {/* 책 옵션 (계승 전 11-20단계만) */}
                        {canUseBook && (
                          <button
                            className={`${styles.breathButton} ${useBook ? styles.breathButtonActive : ''}`}
                            onClick={() => setUseBook(!useBook)}
                          >
                            <div className={styles.breathIcon}>
                              <Image
                                src={selectedEquipment.type === 'weapon' ? '/metallurgy-karma.webp' : '/tailoring-karma.webp'}
                                alt="책" fill style={{ objectFit: 'contain' }}
                              />
                            </div>
                            <span>{selectedEquipment.type === 'weapon' ? '야금술' : '재봉술'} [{getBookType(currentLevel)}]</span>
                          </button>
                        )}
                      </div>

                      {/* 1회 비용 */}
                      <div className={styles.singleCostSection}>
                        <div className={styles.singleCostTitle}>1회 강화 비용</div>
                        <div className={styles.singleCostGrid}>
                          {materialCost && (
                            <>
                              {isSuccessionMode ? (
                                <>
                                  {'수호석결정' in materialCost && (
                                    <div className={styles.singleCostItem}>
                                      <Image src="/top-destiny-guardian-stone5.webp" alt="수호석결정" width={32} height={32} />
                                      <span>{(materialCost as any).수호석결정?.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {'파괴석결정' in materialCost && (
                                    <div className={styles.singleCostItem}>
                                      <Image src="/top-destiny-destruction-stone5.webp" alt="파괴석결정" width={32} height={32} />
                                      <span>{(materialCost as any).파괴석결정?.toLocaleString()}</span>
                                    </div>
                                  )}
                                  <div className={styles.singleCostItem}>
                                    <Image src="/top-destiny-breakthrough-stone5.webp" alt="위대한돌파석" width={32} height={32} />
                                    <span>{(materialCost as any).위대한돌파석?.toLocaleString()}</span>
                                  </div>
                                  <div className={styles.singleCostItem}>
                                    <Image src="/top-abidos-fusion5.webp" alt="상급아비도스" width={32} height={32} />
                                    <span>{(materialCost as any).상급아비도스?.toLocaleString()}</span>
                                  </div>
                                  <div className={styles.singleCostItem}>
                                    <Image src="/shilling.webp" alt="실링" width={32} height={32} />
                                    <span>{(materialCost as any).실링?.toLocaleString()}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {'수호석' in materialCost && (
                                    <div className={styles.singleCostItem}>
                                      <Image src="/destiny-guardian-stone5.webp" alt="수호석" width={32} height={32} />
                                      <span>{(materialCost as any).수호석?.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {'파괴석' in materialCost && (
                                    <div className={styles.singleCostItem}>
                                      <Image src="/destiny-destruction-stone5.webp" alt="파괴석" width={32} height={32} />
                                      <span>{(materialCost as any).파괴석?.toLocaleString()}</span>
                                    </div>
                                  )}
                                  <div className={styles.singleCostItem}>
                                    <Image src="/destiny-breakthrough-stone5.webp" alt="돌파석" width={32} height={32} />
                                    <span>{(materialCost as any).돌파석?.toLocaleString()}</span>
                                  </div>
                                  <div className={styles.singleCostItem}>
                                    <Image src="/abidos-fusion5.webp" alt="아비도스" width={32} height={32} />
                                    <span>{(materialCost as any).아비도스?.toLocaleString()}</span>
                                  </div>
                                </>
                              )}
                              <div className={styles.singleCostItem}>
                                <Image src="/destiny-shard-bag-large5.webp" alt="운명파편" width={32} height={32} />
                                <span>{(materialCost as any).운명파편?.toLocaleString()}</span>
                              </div>
                              <div className={styles.singleCostItem}>
                                <Image src="/gold.webp" alt="골드" width={32} height={32} />
                                <span>{(materialCost as any).골드?.toLocaleString()}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 강화 버튼 */}
                      <button
                        className={styles.refiningButton}
                        onClick={attemptRefining}
                        disabled={!canRefine}
                      >
                        강화하기
                      </button>

                      <button className={styles.resetButton} onClick={resetSimulation}>
                        초기화
                      </button>
                    </>
                  )}
                </div>

                {/* 두 번째 상자: 강화 기록 */}
                <div className={styles.box}>
                  <div className={styles.boxTitle}>강화 기록</div>
                  <div className={styles.historyContainer}>
                    {attemptHistory.length === 0 ? (
                      <div className={styles.historyEmpty}>
                        강화 버튼을 눌러 시뮬레이션을 시작하세요
                      </div>
                    ) : (
                      <div className={styles.historyList}>
                        {attemptHistory.map((attempt, index) => (
                          <div
                            key={index}
                            className={`${styles.historyItem} ${attempt.success ? styles.historyItemSuccess : styles.historyItemFail}`}
                          >
                            <div className={styles.historyItemHeader}>
                              <span className={styles.historyItemNumber}>#{attempt.attemptNumber}</span>
                              <span className={styles.historyItemLevel}>+{attempt.level} 강화</span>
                              <span className={`${styles.historyItemResult} ${attempt.success ? styles.resultSuccess : styles.resultFail}`}>
                                {attempt.success ? '성공' : '실패'}
                              </span>
                            </div>
                            {!attempt.success && (
                              <div className={styles.historyItemDetails}>
                                <span>확률: {(attempt.probabilityBefore * 100).toFixed(2)}% → {(attempt.probabilityAfter * 100).toFixed(2)}%</span>
                                <span>장인: {(Math.floor(attempt.janginBefore * 10000) / 100).toFixed(2)}% → {(Math.floor(attempt.janginAfter * 10000) / 100).toFixed(2)}% (+{(Math.floor(attempt.janginIncrease * 10000) / 100).toFixed(2)}%)</span>
                              </div>
                            )}
                            {attempt.success && (
                              <div className={styles.historyItemDetails}>
                                <span>+{attempt.level} → +{attempt.level + 1} 강화 성공!</span>
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={historyEndRef} />
                      </div>
                    )}
                  </div>
                  <div className={styles.historyStats}>
                    <div className={styles.historyStatItem}>
                      <span>총 시도</span>
                      <span>{attemptHistory.length}회</span>
                    </div>
                    <div className={styles.historyStatItem}>
                      <span>성공</span>
                      <span className={styles.statSuccess}>{attemptHistory.filter(a => a.success).length}회</span>
                    </div>
                    <div className={styles.historyStatItem}>
                      <span>실패</span>
                      <span className={styles.statFail}>{attemptHistory.filter(a => !a.success).length}회</span>
                    </div>
                  </div>
                </div>

                {/* 세 번째 상자: 누적 비용 */}
                <div className={styles.box}>
                  <div className={styles.boxTitle}>누적 비용</div>
                  <div className={styles.totalCostContainer}>
                    <div className={styles.totalMaterialsList}>
                      {isSuccessionMode ? (
                        <>
                          {accumulatedCost.수호석결정 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/top-destiny-guardian-stone5.webp" alt="수호석결정" width={28} height={28} />
                              <span className={styles.materialName}>수호석 결정</span>
                              <span className={styles.materialAmount}>{accumulatedCost.수호석결정.toLocaleString()}</span>
                              <span className={styles.materialGold}>{getMaterialGoldCost('수호석결정', accumulatedCost.수호석결정).toLocaleString()}G</span>
                            </div>
                          )}
                          {accumulatedCost.파괴석결정 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/top-destiny-destruction-stone5.webp" alt="파괴석결정" width={28} height={28} />
                              <span className={styles.materialName}>파괴석 결정</span>
                              <span className={styles.materialAmount}>{accumulatedCost.파괴석결정.toLocaleString()}</span>
                              <span className={styles.materialGold}>{getMaterialGoldCost('파괴석결정', accumulatedCost.파괴석결정).toLocaleString()}G</span>
                            </div>
                          )}
                          {accumulatedCost.위대한돌파석 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/top-destiny-breakthrough-stone5.webp" alt="위대한돌파석" width={28} height={28} />
                              <span className={styles.materialName}>위대한 돌파석</span>
                              <span className={styles.materialAmount}>{accumulatedCost.위대한돌파석.toLocaleString()}</span>
                              <span className={styles.materialGold}>{getMaterialGoldCost('위대한돌파석', accumulatedCost.위대한돌파석).toLocaleString()}G</span>
                            </div>
                          )}
                          {accumulatedCost.상급아비도스 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/top-abidos-fusion5.webp" alt="상급아비도스" width={28} height={28} />
                              <span className={styles.materialName}>상급 아비도스</span>
                              <span className={styles.materialAmount}>{accumulatedCost.상급아비도스.toLocaleString()}</span>
                              <span className={styles.materialGold}>{getMaterialGoldCost('상급아비도스', accumulatedCost.상급아비도스).toLocaleString()}G</span>
                            </div>
                          )}
                          {accumulatedCost.실링 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/shilling.webp" alt="실링" width={28} height={28} />
                              <span className={styles.materialName}>실링</span>
                              <span className={styles.materialAmount}>{accumulatedCost.실링.toLocaleString()}</span>
                              <span></span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {accumulatedCost.수호석 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/destiny-guardian-stone5.webp" alt="수호석" width={28} height={28} />
                              <span className={styles.materialName}>수호석</span>
                              <span className={styles.materialAmount}>{accumulatedCost.수호석.toLocaleString()}</span>
                              <span className={styles.materialGold}>{getMaterialGoldCost('수호석', accumulatedCost.수호석).toLocaleString()}G</span>
                            </div>
                          )}
                          {accumulatedCost.파괴석 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/destiny-destruction-stone5.webp" alt="파괴석" width={28} height={28} />
                              <span className={styles.materialName}>파괴석</span>
                              <span className={styles.materialAmount}>{accumulatedCost.파괴석.toLocaleString()}</span>
                              <span className={styles.materialGold}>{getMaterialGoldCost('파괴석', accumulatedCost.파괴석).toLocaleString()}G</span>
                            </div>
                          )}
                          {accumulatedCost.돌파석 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/destiny-breakthrough-stone5.webp" alt="돌파석" width={28} height={28} />
                              <span className={styles.materialName}>돌파석</span>
                              <span className={styles.materialAmount}>{accumulatedCost.돌파석.toLocaleString()}</span>
                              <span className={styles.materialGold}>{getMaterialGoldCost('돌파석', accumulatedCost.돌파석).toLocaleString()}G</span>
                            </div>
                          )}
                          {accumulatedCost.아비도스 > 0 && (
                            <div className={styles.totalMaterialItem}>
                              <Image src="/abidos-fusion5.webp" alt="아비도스" width={28} height={28} />
                              <span className={styles.materialName}>아비도스</span>
                              <span className={styles.materialAmount}>{accumulatedCost.아비도스.toLocaleString()}</span>
                              <span className={styles.materialGold}>{getMaterialGoldCost('아비도스', accumulatedCost.아비도스).toLocaleString()}G</span>
                            </div>
                          )}
                        </>
                      )}
                      {accumulatedCost.운명파편 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/destiny-shard-bag-large5.webp" alt="운명파편" width={28} height={28} />
                          <span className={styles.materialName}>운명파편</span>
                          <span className={styles.materialAmount}>{accumulatedCost.운명파편.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('운명파편', accumulatedCost.운명파편).toLocaleString()}G</span>
                        </div>
                      )}
                      {accumulatedCost.빙하 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/breath-glacier5.webp" alt="빙하의숨결" width={28} height={28} />
                          <span className={styles.materialName}>빙하의 숨결</span>
                          <span className={styles.materialAmount}>{accumulatedCost.빙하.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('빙하', accumulatedCost.빙하).toLocaleString()}G</span>
                        </div>
                      )}
                      {accumulatedCost.용암 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/breath-lava5.webp" alt="용암의숨결" width={28} height={28} />
                          <span className={styles.materialName}>용암의 숨결</span>
                          <span className={styles.materialAmount}>{accumulatedCost.용암.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('용암', accumulatedCost.용암).toLocaleString()}G</span>
                        </div>
                      )}
                      {/* 책 비용 표시 (계승 전만) */}
                      {accumulatedCost.야금술1114 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/metallurgy-karma.webp" alt="야금술1114" width={28} height={28} />
                          <span className={styles.materialName}>야금술 [11-14]</span>
                          <span className={styles.materialAmount}>{accumulatedCost.야금술1114.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('야금술1114', accumulatedCost.야금술1114).toLocaleString()}G</span>
                        </div>
                      )}
                      {accumulatedCost.야금술1518 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/metallurgy-karma.webp" alt="야금술1518" width={28} height={28} />
                          <span className={styles.materialName}>야금술 [15-18]</span>
                          <span className={styles.materialAmount}>{accumulatedCost.야금술1518.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('야금술1518', accumulatedCost.야금술1518).toLocaleString()}G</span>
                        </div>
                      )}
                      {accumulatedCost.야금술1920 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/metallurgy-karma.webp" alt="야금술1920" width={28} height={28} />
                          <span className={styles.materialName}>야금술 [19-20]</span>
                          <span className={styles.materialAmount}>{accumulatedCost.야금술1920.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('야금술1920', accumulatedCost.야금술1920).toLocaleString()}G</span>
                        </div>
                      )}
                      {accumulatedCost.재봉술1114 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/tailoring-karma.webp" alt="재봉술1114" width={28} height={28} />
                          <span className={styles.materialName}>재봉술 [11-14]</span>
                          <span className={styles.materialAmount}>{accumulatedCost.재봉술1114.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('재봉술1114', accumulatedCost.재봉술1114).toLocaleString()}G</span>
                        </div>
                      )}
                      {accumulatedCost.재봉술1518 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/tailoring-karma.webp" alt="재봉술1518" width={28} height={28} />
                          <span className={styles.materialName}>재봉술 [15-18]</span>
                          <span className={styles.materialAmount}>{accumulatedCost.재봉술1518.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('재봉술1518', accumulatedCost.재봉술1518).toLocaleString()}G</span>
                        </div>
                      )}
                      {accumulatedCost.재봉술1920 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/tailoring-karma.webp" alt="재봉술1920" width={28} height={28} />
                          <span className={styles.materialName}>재봉술 [19-20]</span>
                          <span className={styles.materialAmount}>{accumulatedCost.재봉술1920.toLocaleString()}</span>
                          <span className={styles.materialGold}>{getMaterialGoldCost('재봉술1920', accumulatedCost.재봉술1920).toLocaleString()}G</span>
                        </div>
                      )}
                      {accumulatedCost.골드 > 0 && (
                        <div className={styles.totalMaterialItem}>
                          <Image src="/gold.webp" alt="골드" width={28} height={28} />
                          <span className={styles.materialName}>강화 골드</span>
                          <span></span>
                          <span className={styles.materialGold}>{accumulatedCost.골드.toLocaleString()}G</span>
                        </div>
                      )}
                    </div>
                    {/* 아이템 레벨 증가 */}
                    {itemLevelIncrease > 0 && baseItemLevel > 0 && (
                      <div className={styles.itemLevelProgress}>
                        <span className={styles.levelProgressLabel}>아이템 레벨</span>
                        <div className={styles.levelProgressValue}>
                          <span>{baseItemLevel.toFixed(2)}</span>
                          <span className={styles.levelArrow}>→</span>
                          <span className={styles.levelCurrent}>{(baseItemLevel + itemLevelIncrease).toFixed(2)}</span>
                          <span className={styles.levelIncrease}>(+{itemLevelIncrease.toFixed(2)})</span>
                        </div>
                      </div>
                    )}
                    {/* 강화 레벨 증가 */}
                    {currentLevel > selectedEquipment.currentLevel && (
                      <div className={styles.levelProgress}>
                        <span className={styles.levelProgressLabel}>강화 단계</span>
                        <div className={styles.levelProgressValue}>
                          <span>+{selectedEquipment.currentLevel}</span>
                          <span className={styles.levelArrow}>→</span>
                          <span className={styles.levelCurrent}>+{currentLevel}</span>
                          <span className={styles.levelIncrease}>(+{currentLevel - selectedEquipment.currentLevel})</span>
                        </div>
                      </div>
                    )}
                    <div className={styles.totalGoldCost}>
                      <Image src="/gold.webp" alt="gold" width={32} height={32} />
                      <span>{calculateTotalGoldCost().toLocaleString()} G</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 데이터 수집 고지 */}
        <div className={styles.dataNotice}>
          ℹ️ 시도 횟수, 강화 단계, 소모 재료, 숨결 사용 횟수만 익명 통계로 수집됩니다.
        </div>

        {/* 통계 테이블 */}
        {showStats && <RefiningStats defaultSuccession={isSuccessionMode} />}
    </div>
  );
}
