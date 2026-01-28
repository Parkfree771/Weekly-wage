'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useSearchHistory } from '@/lib/useSearchHistory';
import Image from 'next/image';
import { useTheme } from '../ThemeProvider';
import styles from './RefiningSimulator.module.css';
import {
  EXP_PER_LEVEL,
  TURNS_FOR_BONUS,
  SUCCESS_RATES,
  ANCESTOR_CARDS_1_20,
  ANCESTOR_CARDS_21_40,
  ENHANCED_ANCESTOR_CARDS,
  ARMOR_MATERIALS,
  WEAPON_MATERIALS,
  getStageKey,
  rollSuccessGrade,
  rollAncestorCard1_20,
  rollAncestorCard21_40,
  rollEnhancedAncestorCard,
  calculateNormalTurnExp,
  calculateBonusTurnExp1_20,
  calculateBonusTurnExp21_40,
  calculateEnhancedBonusTurnExp,
  type SuccessGrade,
  type MaterialCombo,
} from '../../lib/advancedRefiningData';
import { MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';
import {
  parseEquipmentData,
  type Equipment as EquipmentType,
  type EquipmentAPIResponse
} from '../../lib/equipmentParser';
import { saveAdvancedRefiningResult, AdvancedRefiningResult } from '../../lib/supabase';

type Equipment = EquipmentType;

// 10단계별 통계 추적용 인터페이스
interface StageStats {
  startLevel: number;
  totalTurns: number;
  successCount: number;
  greatCount: number;
  superCount: number;
  bonusTurns: number;
  ancestorCards: Record<string, number>;
  materials: AccumulatedCost;
  auxiliaryPattern: {
    none: number;
    breath: number;
    book: number;
    both: number;
  };
}

interface AdvancedRefiningSimulatorProps {
  onSearchComplete?: (searched: boolean) => void;
  modeSelector?: React.ReactNode;
}

interface AttemptResult {
  attemptNumber: number;
  isBonusTurn: boolean;
  isEnhanced: boolean;
  grade: SuccessGrade;
  card?: string;
  exp: number;
  level: number;
  isFree: boolean;
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
  실링: number;
  야금술1단: number;
  야금술2단: number;
  야금술3단: number;
  야금술4단: number;
  재봉술1단: number;
  재봉술2단: number;
  재봉술3단: number;
  재봉술4단: number;
}

const gradeLabels: Record<SuccessGrade, string> = {
  success: '성공',
  great: '대성',
  super: '대대',
};

// 오늘 날짜를 "YYYY년 M월 D일 평균 거래가" 형식으로 반환
const getTodayPriceDate = () => {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 평균 거래가`;
};

const gradeColors: Record<SuccessGrade, string> = {
  success: '#10b981',
  great: '#3b82f6',
  super: '#f59e0b',
};

export default function AdvancedRefiningSimulator({ onSearchComplete, modeSelector }: AdvancedRefiningSimulatorProps) {
  const { theme } = useTheme();

  // 검색 관련 상태
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searched, setSearched] = useState(false);
  const [characterInfo, setCharacterInfo] = useState<{ name: string; itemLevel: string; image?: string } | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  // 자동완성
  const { history, addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // 상급재련 상태
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentExp, setCurrentExp] = useState(0);
  const [gahoCount, setGahoCount] = useState(0);
  const [isBonusTurn, setIsBonusTurn] = useState(false);
  const [isEnhancedBonus, setIsEnhancedBonus] = useState(false);
  const [nextTurnFree, setNextTurnFree] = useState(false);

  // 재료 옵션 (단순화)
  const [useBreath, setUseBreath] = useState(false);
  const [useBook, setUseBook] = useState(false);

  // 결과
  const [attemptHistory, setAttemptHistory] = useState<AttemptResult[]>([]);
  const [accumulatedCost, setAccumulatedCost] = useState<AccumulatedCost>({
    수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0,
    빙하: 0, 용암: 0, 실링: 0,
    야금술1단: 0, 야금술2단: 0, 야금술3단: 0, 야금술4단: 0,
    재봉술1단: 0, 재봉술2단: 0, 재봉술3단: 0, 재봉술4단: 0,
  });
  const [totalAttempts, setTotalAttempts] = useState(0);

  // 장비별 강화 진행 상태 추적
  const [enhancedLevels, setEnhancedLevels] = useState<Record<string, number>>({});
  // 아이템 레벨 증가 추적
  const [baseItemLevel, setBaseItemLevel] = useState<number>(0);
  const [itemLevelIncrease, setItemLevelIncrease] = useState<number>(0);
  // 시작 레벨 저장 (강화 단계 표시용)
  const [startLevel, setStartLevel] = useState<number>(0);

  // 10단계별 통계 추적 (ref로 변경하여 React Strict Mode 중복 방지)
  const stageStatsRef = useRef<StageStats>({
    startLevel: 0,
    totalTurns: 0,
    successCount: 0,
    greatCount: 0,
    superCount: 0,
    bonusTurns: 0,
    ancestorCards: {},
    materials: {
      수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0,
      빙하: 0, 용암: 0, 실링: 0,
      야금술1단: 0, 야금술2단: 0, 야금술3단: 0, 야금술4단: 0,
      재봉술1단: 0, 재봉술2단: 0, 재봉술3단: 0, 재봉술4단: 0,
    },
    auxiliaryPattern: { none: 0, breath: 0, book: 0, both: 0 },
  });
  // 저장 중복 방지용 Set (장비명-시작레벨-도착레벨 조합으로 추적)
  const savedMilestonesRef = useRef<Set<string>>(new Set());
  // 재련 처리 중복 방지 (React Strict Mode 대응)
  const processingRef = useRef(false);

  // 거래소 가격
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

  // 애니메이션
  const [isAnimating, setIsAnimating] = useState(false);

  // 자동강화 관련 상태
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoTargetLevel, setAutoTargetLevel] = useState(0); // 시작 시 고정되는 목표 레벨
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSettings, setAutoSettings] = useState({
    normalTurn: { useBreath: false, useBook: false },
    ancestorTurn: { useBreath: false, useBook: false },
    enhancedAncestorTurn: { useBreath: false, useBook: false },
  });
  // 최신 상태 참조용 ref (stale closure 방지)
  const latestStateRef = useRef({
    currentLevel: 0,
    isBonusTurn: false,
    isEnhancedBonus: false,
    autoSettings: autoSettings,
    selectedEquipment: null as Equipment | null,
    autoTargetLevel: 0,
  });
  const attemptRefiningRef = useRef<() => void>(() => {});

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

  // 히스토리 스크롤
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
      // 업화 장비만 필터링 (상급 재련은 업화 장비에서만 가능)
      const filteredEquipments = parsedEquipments.filter(eq => !eq.isSuccession && !eq.isEsther);

      if (filteredEquipments.length === 0) {
        throw new Error('상급 재련 가능한 장비가 없습니다. (업화 장비만 가능)');
      }

      // 캐릭터 정보 저장
      if (data.profile) {
        setCharacterInfo({
          name: data.profile.CharacterName || characterName,
          itemLevel: data.profile.ItemAvgLevel || '알 수 없음',
          image: data.profile.CharacterImage || undefined
        });
      }

      setEquipments(filteredEquipments);
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
    const equipStartLevel = savedLevel !== undefined ? savedLevel : (equipment.currentAdvancedLevel || 0);
    setCurrentLevel(equipStartLevel);
    // 장비 변경 시 시작 레벨은 원래 레벨로 (진행 표시용)
    setStartLevel(equipment.currentAdvancedLevel || 0);
    // 장비 변경 시 경험치, 가호, 선조 상태 초기화 (누적 비용은 유지)
    setCurrentExp(0);
    setGahoCount(0);
    setIsBonusTurn(false);
    setIsEnhancedBonus(false);
    setNextTurnFree(false);
    setAttemptHistory([]);
    // 아이템 레벨 설정 (장비의 현재 아이템 레벨)
    setBaseItemLevel(equipment.itemLevel || 0);
    // 10단계 통계 초기화 (현재 레벨의 10단계 시작점으로)
    const milestoneStart = Math.floor(equipStartLevel / 10) * 10;
    resetStageStats(milestoneStart);
  };

  const resetSimulation = () => {
    let equipStartLevel = 0;
    if (selectedEquipment) {
      equipStartLevel = selectedEquipment.currentAdvancedLevel || 0;
      setCurrentLevel(equipStartLevel);
      setStartLevel(equipStartLevel);
      setBaseItemLevel(selectedEquipment.itemLevel || 0);
    }
    setCurrentExp(0);
    setGahoCount(0);
    setIsBonusTurn(false);
    setIsEnhancedBonus(false);
    setNextTurnFree(false);
    setUseBreath(false);
    setUseBook(false);
    setAttemptHistory([]);
    // 초기화 버튼을 누르면 모든 누적 비용과 진행 상태 초기화
    setAccumulatedCost({
      수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0,
      빙하: 0, 용암: 0, 실링: 0,
      야금술1단: 0, 야금술2단: 0, 야금술3단: 0, 야금술4단: 0,
      재봉술1단: 0, 재봉술2단: 0, 재봉술3단: 0, 재봉술4단: 0,
    });
    setTotalAttempts(0);
    setItemLevelIncrease(0);
    setEnhancedLevels({}); // 모든 장비의 강화 진행 상태 초기화
    // 10단계 통계도 초기화
    const milestoneStart = Math.floor(equipStartLevel / 10) * 10;
    resetStageStats(milestoneStart);
    // 저장 기록 초기화 (새 시뮬레이션이므로)
    savedMilestonesRef.current.clear();
  };

  // 10단계 통계 초기화
  const resetStageStats = (startLv: number) => {
    stageStatsRef.current = {
      startLevel: startLv,
      totalTurns: 0,
      successCount: 0,
      greatCount: 0,
      superCount: 0,
      bonusTurns: 0,
      ancestorCards: {},
      materials: {
        수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0,
        빙하: 0, 용암: 0, 실링: 0,
        야금술1단: 0, 야금술2단: 0, 야금술3단: 0, 야금술4단: 0,
        재봉술1단: 0, 재봉술2단: 0, 재봉술3단: 0, 재봉술4단: 0,
      },
      auxiliaryPattern: { none: 0, breath: 0, book: 0, both: 0 },
    };
  };

  // 10단계 완료 시 저장
  const saveStageCompletion = (toLevel: number, stats: StageStats) => {
    if (!selectedEquipment) {
      console.error('[상급재련 통계] selectedEquipment가 없습니다!');
      return;
    }

    console.log('[상급재련 통계] saveStageCompletion 호출:', { toLevel, stats });

    const isWeapon = selectedEquipment.type === 'weapon';
    const equipmentName = isWeapon ? '업화 무기' : '업화 방어구';

    const result: AdvancedRefiningResult = {
      equipment_type: isWeapon ? 'weapon' : 'armor',
      equipment_name: equipmentName,
      from_level: stats.startLevel,
      to_level: toLevel,
      total_turns: stats.totalTurns,
      success_count: stats.successCount,
      great_success_count: stats.greatCount,
      super_success_count: stats.superCount,
      bonus_turns: stats.bonusTurns,
      ancestor_cards: stats.ancestorCards,
      gold: stats.materials.골드,
      fate_fragment: stats.materials.운명파편,
      breakthrough_stone: stats.materials.돌파석,
      abidos: stats.materials.아비도스,
      auxiliary_pattern: stats.auxiliaryPattern,
    };

    // 무기/방어구에 따라 재료 다르게 저장
    if (isWeapon) {
      result.destruction_stone = stats.materials.파괴석;
      result.lava_breath = stats.materials.용암;
      // 책은 단계에 따라 다름 (from_level 기준)
      if (stats.startLevel < 10) result.book_1 = stats.materials.야금술1단;
      else if (stats.startLevel < 20) result.book_2 = stats.materials.야금술2단;
      else if (stats.startLevel < 30) result.book_3 = stats.materials.야금술3단;
      else result.book_4 = stats.materials.야금술4단;
    } else {
      result.guardian_stone = stats.materials.수호석;
      result.glacier_breath = stats.materials.빙하;
      // 책은 단계에 따라 다름
      if (stats.startLevel < 10) result.book_1 = stats.materials.재봉술1단;
      else if (stats.startLevel < 20) result.book_2 = stats.materials.재봉술2단;
      else if (stats.startLevel < 30) result.book_3 = stats.materials.재봉술3단;
      else result.book_4 = stats.materials.재봉술4단;
    }

    // 비동기로 저장
    saveAdvancedRefiningResult(result).catch(err => {
      console.error('Failed to save advanced refining result:', err);
    });
  };

  // 현재 재료 조합
  const getMaterialCombo = (): MaterialCombo => {
    if (useBreath && useBook) return 'both';
    if (useBreath) return 'breath';
    if (useBook) return 'book';
    return 'none';
  };

  // 현재 확률 가져오기
  const getCurrentRates = () => {
    const combo = getMaterialCombo();
    return SUCCESS_RATES[combo];
  };

  // 단계별 책 이미지 가져오기
  const getBookIcon = (isWeapon: boolean, level: number): string => {
    const stageNum = level < 10 ? 1 : level < 20 ? 2 : level < 30 ? 3 : 4;
    if (isWeapon) {
      return `/master-metallurgy-${stageNum}-5.webp`;
    } else {
      return `/master-tailoring-${stageNum}-5.webp`;
    }
  };

  // 1회당 비용 계산
  const getPerAttemptCost = () => {
    if (!selectedEquipment) return null;
    const stageKey = getStageKey(currentLevel);
    const isWeapon = selectedEquipment.type === 'weapon';

    if (isWeapon) {
      const materials = WEAPON_MATERIALS[stageKey];
      return {
        stone: materials.파괴석,
        stoneName: '파괴석',
        stoneIcon: '/destiny-destruction-stone5.webp',
        돌파석: materials.돌파석,
        아비도스: materials.아비도스,
        운명파편: materials.운명파편,
        실링: materials.실링,
        골드: materials.골드,
        breath: materials.용암,
        breathName: '용암의 숨결',
        breathIcon: '/breath-lava5.webp',
        bookName: materials.책,
        bookIcon: getBookIcon(true, currentLevel),
      };
    } else {
      const materials = ARMOR_MATERIALS[stageKey];
      return {
        stone: materials.수호석,
        stoneName: '수호석',
        stoneIcon: '/destiny-guardian-stone5.webp',
        돌파석: materials.돌파석,
        아비도스: materials.아비도스,
        운명파편: materials.운명파편,
        실링: materials.실링,
        골드: materials.골드,
        breath: materials.빙하,
        breathName: '빙하의 숨결',
        breathIcon: '/breath-glacier5.webp',
        bookName: materials.책,
        bookIcon: getBookIcon(false, currentLevel),
      };
    }
  };

  // 재료 비용 계산
  const calculateMaterialCost = (isFree: boolean) => {
    if (isFree || !selectedEquipment) return;

    const stageKey = getStageKey(currentLevel);
    const isWeapon = selectedEquipment.type === 'weapon';

    setAccumulatedCost(prev => {
      const newCost = { ...prev };

      if (isWeapon) {
        const materials = WEAPON_MATERIALS[stageKey];
        newCost.파괴석 += materials.파괴석;
        newCost.돌파석 += materials.돌파석;
        newCost.아비도스 += materials.아비도스;
        newCost.운명파편 += materials.운명파편;
        newCost.골드 += materials.골드;
        newCost.실링 += materials.실링;

        if (useBreath) {
          newCost.용암 += materials.용암;
        }

        if (useBook && materials.책) {
          const bookKey = materials.책 as keyof AccumulatedCost;
          newCost[bookKey] += 1;
        }
      } else {
        const materials = ARMOR_MATERIALS[stageKey];
        newCost.수호석 += materials.수호석;
        newCost.돌파석 += materials.돌파석;
        newCost.아비도스 += materials.아비도스;
        newCost.운명파편 += materials.운명파편;
        newCost.골드 += materials.골드;
        newCost.실링 += materials.실링;

        if (useBreath) {
          newCost.빙하 += materials.빙하;
        }

        if (useBook && materials.책) {
          const bookKey = materials.책 as keyof AccumulatedCost;
          newCost[bookKey] += 1;
        }
      }

      return newCost;
    });
  };

  // 재련 시도
  const attemptRefining = () => {
    if (!selectedEquipment || isAnimating) return;
    if (currentLevel >= 40) return;
    // 중복 실행 방지 (React Strict Mode 등)
    if (processingRef.current) return;
    processingRef.current = true;

    setIsAnimating(true);
    const attemptNumber = totalAttempts + 1;
    setTotalAttempts(attemptNumber);

    const isFree = nextTurnFree;
    setNextTurnFree(false);

    // 재료 비용 계산 전에 현재 보조재료 상태 저장
    const currentMaterialCombo = getMaterialCombo();

    calculateMaterialCost(isFree);

    let earnedExp = 0;
    let resultGrade: SuccessGrade = 'success';
    let resultCard: string | undefined;
    let shouldRechargeGaho = false;
    let shouldEnhanceNext = false;
    let thisTurnIsBonusTurn = isBonusTurn;

    if (isBonusTurn) {
      const combo = getMaterialCombo();
      resultGrade = rollSuccessGrade(combo);
      const baseExp = calculateNormalTurnExp(resultGrade);

      if (isEnhancedBonus) {
        const card = rollEnhancedAncestorCard();
        const cardData = ENHANCED_ANCESTOR_CARDS[card];
        resultCard = cardData.name;
        const result = calculateEnhancedBonusTurnExp(card, baseExp);
        earnedExp = result.exp;
        if (result.nextFree) setNextTurnFree(true);
        shouldRechargeGaho = result.rechargeGaho;
        setIsEnhancedBonus(false);
      } else if (currentLevel >= 20) {
        const card = rollAncestorCard21_40();
        const cardData = ANCESTOR_CARDS_21_40[card];
        resultCard = cardData.name;
        const result = calculateBonusTurnExp21_40(card, baseExp);
        earnedExp = result.exp;
        if (result.nextFree) setNextTurnFree(true);
        shouldRechargeGaho = result.rechargeGaho;
        shouldEnhanceNext = result.enhanceNext;
      } else {
        const card = rollAncestorCard1_20();
        const cardData = ANCESTOR_CARDS_1_20[card];
        resultCard = cardData.name;
        const result = calculateBonusTurnExp1_20(card, baseExp);
        earnedExp = result.exp;
        if (result.nextFree) setNextTurnFree(true);
        shouldRechargeGaho = result.rechargeGaho;
      }

      if (shouldRechargeGaho) {
        setGahoCount(TURNS_FOR_BONUS);
        setIsBonusTurn(true);
      } else {
        setGahoCount(0);
        setIsBonusTurn(false);
      }

      if (shouldEnhanceNext) {
        setIsEnhancedBonus(true);
      }
    } else {
      const combo = getMaterialCombo();
      resultGrade = rollSuccessGrade(combo);
      earnedExp = calculateNormalTurnExp(resultGrade);

      const newGahoCount = gahoCount + 1;
      if (newGahoCount >= TURNS_FOR_BONUS) {
        setGahoCount(TURNS_FOR_BONUS);
        setIsBonusTurn(true);
      } else {
        setGahoCount(newGahoCount);
      }
    }

    // 10단계별 통계 업데이트 (ref 사용으로 React Strict Mode 중복 방지)
    const prevLevel = currentLevel;
    const stageKey = getStageKey(currentLevel);
    const isWeapon = selectedEquipment.type === 'weapon';

    const stats = stageStatsRef.current;
    stats.totalTurns++;

    // 성공 등급 카운트
    if (resultGrade === 'success') stats.successCount++;
    else if (resultGrade === 'great') stats.greatCount++;
    else if (resultGrade === 'super') stats.superCount++;

    // 선조턴 카운트
    if (thisTurnIsBonusTurn) {
      stats.bonusTurns++;
      // 선조 카드 등장 기록
      if (resultCard) {
        stats.ancestorCards[resultCard] = (stats.ancestorCards[resultCard] || 0) + 1;
      }
    }

    // 보조재료 사용 패턴 (무료턴 아닐 때만)
    if (!isFree) {
      stats.auxiliaryPattern[currentMaterialCombo]++;

      // 재료 사용량 누적
      if (isWeapon) {
        const materials = WEAPON_MATERIALS[stageKey];
        stats.materials.파괴석 += materials.파괴석;
        stats.materials.돌파석 += materials.돌파석;
        stats.materials.아비도스 += materials.아비도스;
        stats.materials.운명파편 += materials.운명파편;
        stats.materials.골드 += materials.골드;
        stats.materials.실링 += materials.실링;
        if (useBreath) stats.materials.용암 += materials.용암;
        if (useBook && materials.책) {
          const bookKey = materials.책 as keyof AccumulatedCost;
          stats.materials[bookKey] += 1;
        }
      } else {
        const materials = ARMOR_MATERIALS[stageKey];
        stats.materials.수호석 += materials.수호석;
        stats.materials.돌파석 += materials.돌파석;
        stats.materials.아비도스 += materials.아비도스;
        stats.materials.운명파편 += materials.운명파편;
        stats.materials.골드 += materials.골드;
        stats.materials.실링 += materials.실링;
        if (useBreath) stats.materials.빙하 += materials.빙하;
        if (useBook && materials.책) {
          const bookKey = materials.책 as keyof AccumulatedCost;
          stats.materials[bookKey] += 1;
        }
      }
    }

    // 경험치 적용 및 레벨업
    let newExp = currentExp + earnedExp;
    let newLevel = currentLevel;
    let levelsGained = 0;

    while (newExp >= EXP_PER_LEVEL && newLevel < 40) {
      newExp -= EXP_PER_LEVEL;
      newLevel++;
      levelsGained++;

      if (newLevel % 10 === 0 && newLevel < 40) {
        newExp = 0;
        break;
      }
    }

    if (newLevel >= 40) {
      newLevel = 40;
      newExp = 0;
    }

    // 10단계 완료 체크 및 저장
    const prevMilestone = Math.floor(prevLevel / 10) * 10;
    const newMilestone = Math.floor(newLevel / 10) * 10;

    // 10단계 경계를 넘었을 때 (0→10, 10→20, 20→30, 30→40)
    if (newMilestone > prevMilestone) {
      // 중복 저장 방지: 장비명-시작레벨-도착레벨 조합으로 체크
      const saveKey = `${selectedEquipment.name}-${stats.startLevel}-${newMilestone}`;

      console.log('[상급재련 통계] 마일스톤 도달:', { saveKey, alreadySaved: savedMilestonesRef.current.has(saveKey) });

      if (!savedMilestonesRef.current.has(saveKey)) {
        // 저장 전에 키 등록 (중복 방지)
        savedMilestonesRef.current.add(saveKey);

        console.log('[상급재련 통계] 저장 실행:', stats.startLevel, '→', newMilestone, stats);

        // 현재 stats를 복사하여 저장
        const statsToSave: StageStats = {
          startLevel: stats.startLevel,
          totalTurns: stats.totalTurns,
          successCount: stats.successCount,
          greatCount: stats.greatCount,
          superCount: stats.superCount,
          bonusTurns: stats.bonusTurns,
          ancestorCards: { ...stats.ancestorCards },
          materials: { ...stats.materials },
          auxiliaryPattern: { ...stats.auxiliaryPattern },
        };
        saveStageCompletion(newMilestone, statsToSave);

        // 40 미만이면 다음 구간 시작을 위해 초기화
        if (newMilestone < 40) {
          stageStatsRef.current = {
            startLevel: newMilestone,
            totalTurns: 0,
            successCount: 0,
            greatCount: 0,
            superCount: 0,
            bonusTurns: 0,
            ancestorCards: {},
            materials: {
              수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0, 골드: 0,
              빙하: 0, 용암: 0, 실링: 0,
              야금술1단: 0, 야금술2단: 0, 야금술3단: 0, 야금술4단: 0,
              재봉술1단: 0, 재봉술2단: 0, 재봉술3단: 0, 재봉술4단: 0,
            },
            auxiliaryPattern: { none: 0, breath: 0, book: 0, both: 0 },
          };
          // 선조의 가호도 초기화
          setGahoCount(0);
          setIsBonusTurn(false);
          setIsEnhancedBonus(false);
        }
      }
    }

    // 레벨업 시 아이템 레벨 증가 (상급재련 1단계당 0.3125)
    if (levelsGained > 0) {
      setItemLevelIncrease(prev => prev + (levelsGained * 0.3125));
      // 장비별 강화 레벨 저장
      if (selectedEquipment) {
        setEnhancedLevels(prev => ({
          ...prev,
          [selectedEquipment.name]: newLevel
        }));
      }
    }

    setCurrentExp(newExp);
    setCurrentLevel(newLevel);

    const result: AttemptResult = {
      attemptNumber,
      isBonusTurn: thisTurnIsBonusTurn,
      isEnhanced: thisTurnIsBonusTurn && isEnhancedBonus,
      grade: resultGrade,
      card: resultCard,
      exp: earnedExp,
      level: newLevel,
      isFree,
    };

    setAttemptHistory(prev => [...prev.slice(-49), result]);

    setTimeout(() => {
      setIsAnimating(false);
      processingRef.current = false;
    }, 300);
  };

  // 목표 레벨 자동 계산 (현재 레벨 기준으로 다음 10단위)
  const getAutoTargetLevel = (level: number): number => {
    if (level < 10) return 10;
    if (level < 20) return 20;
    if (level < 30) return 30;
    return 40;
  };

  // 최신 상태를 ref에 저장 (매 렌더링마다 업데이트)
  latestStateRef.current = {
    currentLevel,
    isBonusTurn,
    isEnhancedBonus,
    autoSettings,
    selectedEquipment,
    autoTargetLevel,
  };
  attemptRefiningRef.current = attemptRefining;

  // 자동강화 시작/중지
  const toggleAutoMode = () => {
    if (isAutoMode) {
      // 중지
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
      // 보조재료 상태 해제
      setUseBreath(false);
      setUseBook(false);
      setIsAutoMode(false);
    } else {
      // 시작 - 현재 레벨 기준으로 목표 레벨 고정
      const target = getAutoTargetLevel(currentLevel);
      setAutoTargetLevel(target);
      setIsAutoMode(true);
      setShowAutoSettings(false);
    }
  };

  // 자동강화 모드 Effect
  useEffect(() => {
    if (isAutoMode && selectedEquipment && autoTargetLevel > 0) {
      // 초기 보조재료 설정
      const { isBonusTurn: ib, isEnhancedBonus: ie, autoSettings: as } = latestStateRef.current;
      if (ib && ie) {
        setUseBreath(as.enhancedAncestorTurn.useBreath);
        setUseBook(as.enhancedAncestorTurn.useBook);
      } else if (ib) {
        setUseBreath(as.ancestorTurn.useBreath);
        setUseBook(as.ancestorTurn.useBook);
      } else {
        setUseBreath(as.normalTurn.useBreath);
        setUseBook(as.normalTurn.useBook);
      }

      // 0.5초마다 재련 시도
      autoIntervalRef.current = setInterval(() => {
        const state = latestStateRef.current;

        // 목표 도달 시 자동 중지
        if (state.currentLevel >= state.autoTargetLevel) {
          if (autoIntervalRef.current) {
            clearInterval(autoIntervalRef.current);
            autoIntervalRef.current = null;
          }
          // 보조재료 상태 해제
          setUseBreath(false);
          setUseBook(false);
          setIsAutoMode(false);
          return;
        }

        // 현재 턴 타입에 따라 보조재료 설정
        if (state.isBonusTurn && state.isEnhancedBonus) {
          setUseBreath(state.autoSettings.enhancedAncestorTurn.useBreath);
          setUseBook(state.autoSettings.enhancedAncestorTurn.useBook);
        } else if (state.isBonusTurn) {
          setUseBreath(state.autoSettings.ancestorTurn.useBreath);
          setUseBook(state.autoSettings.ancestorTurn.useBook);
        } else {
          setUseBreath(state.autoSettings.normalTurn.useBreath);
          setUseBook(state.autoSettings.normalTurn.useBook);
        }

        // 재련 버튼 클릭 (처리 중이 아닐 때만)
        if (!processingRef.current) {
          // 보조재료 설정 후 약간의 딜레이 후 재련 시도
          setTimeout(() => {
            attemptRefiningRef.current();
          }, 50);
        }
      }, 700);

      return () => {
        if (autoIntervalRef.current) {
          clearInterval(autoIntervalRef.current);
          autoIntervalRef.current = null;
        }
      };
    }
  }, [isAutoMode, selectedEquipment, autoTargetLevel]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
      }
    };
  }, []);

  const rates = getCurrentRates();
  const perAttemptCost = getPerAttemptCost();
  const stageKey = getStageKey(currentLevel);

  // 골드 비용 계산
  const getMaterialGoldCost = (materialKey: string, amount: number): number => {
    const materialIdMap: Record<string, number> = {
      수호석: 66102106,
      파괴석: 66102006,
      돌파석: 66110225,
      아비도스: 6861012,
      운명파편: 66130143,
      빙하: 66111132,
      용암: 66111131,
      // 장인의 야금술/재봉술
      야금술1단: 66112711,
      야금술2단: 66112713,
      야금술3단: 66112715,
      야금술4단: 66112717,
      재봉술1단: 66112712,
      재봉술2단: 66112714,
      재봉술3단: 66112716,
      재봉술4단: 66112718,
    };
    const itemId = materialIdMap[materialKey];
    if (!itemId) return 0;
    const pricePerUnit = marketPrices[String(itemId)] || 0;
    return Math.round(pricePerUnit * amount);
  };

  const getTotalGoldCost = () => {
    let total = accumulatedCost.골드;
    total += getMaterialGoldCost('수호석', accumulatedCost.수호석);
    total += getMaterialGoldCost('파괴석', accumulatedCost.파괴석);
    total += getMaterialGoldCost('돌파석', accumulatedCost.돌파석);
    total += getMaterialGoldCost('아비도스', accumulatedCost.아비도스);
    total += getMaterialGoldCost('운명파편', accumulatedCost.운명파편);
    total += getMaterialGoldCost('빙하', accumulatedCost.빙하);
    total += getMaterialGoldCost('용암', accumulatedCost.용암);
    // 장인의 야금술/재봉술 비용 추가
    total += getMaterialGoldCost('야금술1단', accumulatedCost.야금술1단);
    total += getMaterialGoldCost('야금술2단', accumulatedCost.야금술2단);
    total += getMaterialGoldCost('야금술3단', accumulatedCost.야금술3단);
    total += getMaterialGoldCost('야금술4단', accumulatedCost.야금술4단);
    total += getMaterialGoldCost('재봉술1단', accumulatedCost.재봉술1단);
    total += getMaterialGoldCost('재봉술2단', accumulatedCost.재봉술2단);
    total += getMaterialGoldCost('재봉술3단', accumulatedCost.재봉술3단);
    total += getMaterialGoldCost('재봉술4단', accumulatedCost.재봉술4단);
    return total;
  };

  return (
    <div className={styles.container}>
      {/* 검색창 */}
      <Form onSubmit={handleSearch} className="mb-2">
        <div className={styles.searchWrapper}>
          <div className={styles.searchInner}>
            <div className={styles.searchInputGroup}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Form.Control
                  ref={inputRef}
                  placeholder="캐릭터명을 입력하세요"
                  value={characterName}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (history.length > 0 && !characterName.trim()) {
                      setSuggestions(history);
                      setShowSuggestions(true);
                    }
                  }}
                  className={styles.searchInput}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestionsRef} className={styles.suggestions}>
                    {suggestions.map((name, idx) => (
                      <div
                        key={name}
                        className={`${styles.suggestionItem} ${idx === selectedIndex ? styles.suggestionItemSelected : ''}`}
                        onClick={() => handleSelectSuggestion(name)}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" className={styles.searchButton} disabled={isLoading} style={{ backgroundColor: '#6366f1', borderColor: '#6366f1', color: 'white' }}>
                {isLoading ? '검색중...' : '검색'}
              </Button>
            </div>
          </div>
        </div>
        {error && (
          <div className={styles.errorWrapper}>
            <div className={styles.errorMessage}>{error}</div>
          </div>
        )}
        <div className={styles.lastUpdated}>
          <small className={styles.lastUpdatedText}>
            {getTodayPriceDate()} | 실시간 시세와 차이가 있을 수 있습니다
          </small>
        </div>
      </Form>

      {/* 모드 선택 탭 */}
      {modeSelector}

      {/* 검색 전 빈 상태 */}
      {!searched && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>⚒️</div>
          <p className={styles.emptyStateTitle}>캐릭터를 검색하면 장비 정보가 표시됩니다</p>
          <p className={styles.emptyStateDesc}>각 장비별 목표 레벨을 설정하고 필요한 재료와 비용을 확인하세요</p>
        </div>
      )}

      {searched && <div className={styles.mainLayout}>
        {/* 장비 목록 패널 */}
        <div className={styles.equipmentPanel}>
          <div className={styles.equipmentPanelTitle}>
            <span>장비 목록</span>
          </div>
          <div className={styles.equipmentList}>
            {equipments.map((equipment, idx) => (
                  <div
                    key={idx}
                    className={`${styles.equipmentItem} ${selectedEquipment?.name === equipment.name ? styles.equipmentItemSelected : ''} ${styles.equipmentItemNormal}`}
                    onClick={() => handleSelectEquipment(equipment)}
                  >
                    <div className={styles.equipmentIcon}>
                      {equipment.icon && (
                        <Image src={equipment.icon} alt={equipment.name} fill sizes="40px" style={{ objectFit: 'contain' }} />
                      )}
                    </div>
                    <div className={styles.equipmentInfo}>
                      <div className={styles.equipmentName}>{equipment.name}</div>
                      <div className={styles.equipmentLevel}>
                        <span className={`${styles.levelBadge} ${equipment.type === 'weapon' ? styles.levelBadgeWeapon : styles.levelBadgeArmor}`}>
                          +{equipment.currentLevel}
                        </span>
                        {/* 상급재련 진행 표시 */}
                        {enhancedLevels[equipment.name] !== undefined && enhancedLevels[equipment.name] !== (equipment.currentAdvancedLevel || 0) ? (
                          <span style={{ marginLeft: '4px', fontSize: '0.7rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            상+{equipment.currentAdvancedLevel || 0}
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                            상+{enhancedLevels[equipment.name]}
                          </span>
                        ) : (equipment.currentAdvancedLevel || 0) > 0 ? (
                          <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: '#b45309' }}>
                            상+{equipment.currentAdvancedLevel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
        </div>

        {/* 시뮬레이터 패널 */}
        <div className={styles.simulatorPanel}>
          {!selectedEquipment ? (
            <div className={styles.simulatorEmpty}>
              <div className={styles.simulatorEmptyIcon}>⚔️</div>
              <div className={styles.simulatorEmptyTitle}>장비를 선택해주세요</div>
              <div className={styles.simulatorEmptyDesc}>
                왼쪽 목록에서 상급 재련할 장비를 선택하면<br />
                실제 상급 재련 시뮬레이션을 시작할 수 있습니다.
              </div>
            </div>
          ) : (
            <div className={styles.threeBoxLayout}>
              {/* 첫 번째 상자: 강화 정보 */}
              <div className={styles.box}>
                <div className={styles.boxTitle}>상급 재련 정보</div>

                {currentLevel >= 40 ? (
                  <div className={`${styles.maxLevelComplete} ${selectedEquipment.type === 'weapon' ? styles.maxLevelWeapon : styles.maxLevelArmor}`}>
                    <div className={styles.maxLevelIcon}>
                      {selectedEquipment.icon && (
                        <Image src={selectedEquipment.icon} alt={selectedEquipment.name} fill sizes="80px" style={{ objectFit: 'contain' }} />
                      )}
                    </div>
                    <div className={`${styles.maxLevelBadge} ${selectedEquipment.type === 'weapon' ? styles.maxLevelBadgeWeapon : styles.maxLevelBadgeArmor}`}>
                      <span className={styles.maxLevelText}>+40 MAX</span>
                    </div>
                    <div className={styles.maxLevelTitle}>상급 재련 완료!</div>
                    <div className={styles.maxLevelSubtitle}>최고 단계에 도달했습니다</div>
                    <div className={styles.maxLevelEquipName}>{selectedEquipment.name}</div>
                    <div className={styles.maxLevelButtons}>
                      <button className={styles.resetButton} onClick={resetSimulation}>초기화</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 장비 현황 */}
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
                          <span className={styles.targetLevelBig}>+{Math.min(currentLevel + 1, 40)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 선조의 가호 */}
                    <div className={styles.janginSection}>
                      <div className={styles.janginHeader}>
                        <span className={styles.janginLabel}>
                          {isEnhancedBonus ? '나베르의 송곳' : '선조의 가호'}
                        </span>
                        <span className={styles.janginValue}>{gahoCount} / {TURNS_FOR_BONUS}</span>
                      </div>
                      <div className={styles.janginBarOuter}>
                        <div
                          className={styles.janginBarInner}
                          style={{
                            width: `${(gahoCount / TURNS_FOR_BONUS) * 100}%`,
                            background: isEnhancedBonus
                              ? 'linear-gradient(90deg, #a8d8ff, #e8f4ff, #a8d8ff)'
                              : isBonusTurn
                                ? '#f59e0b'
                                : undefined,
                          }}
                        />
                      </div>
                    </div>

                    {/* 경험치 게이지 */}
                    <div className={styles.janginSection}>
                      <div className={styles.janginHeader}>
                        <span className={styles.janginLabel}>경험치</span>
                        <span className={styles.janginValue}>{currentExp} / {EXP_PER_LEVEL}</span>
                      </div>
                      <div className={styles.janginBarOuter}>
                        <div
                          className={styles.janginBarInner}
                          style={{
                            width: `${(currentExp / EXP_PER_LEVEL) * 100}%`,
                            background: 'linear-gradient(90deg, #10b981, #059669)'
                          }}
                        >
                          <div className={styles.janginBarGlow}></div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', textAlign: 'right' }}>
                        {stageKey} 구간
                      </div>
                    </div>

                    {/* 확률 표시 */}
                    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0', background: 'var(--card-bg)', borderRadius: '8px', marginBottom: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>성공</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: gradeColors.success }}>{(rates.success * 100).toFixed(0)}%</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>대성</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: gradeColors.great }}>{(rates.great * 100).toFixed(0)}%</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>대대</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: gradeColors.super }}>{(rates.super * 100).toFixed(0)}%</div>
                      </div>
                    </div>

                    {/* 보조재료 옵션 */}
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
                      </button>

                      <button
                        className={`${styles.breathButton} ${useBook ? styles.breathButtonActive : ''}`}
                        onClick={() => setUseBook(!useBook)}
                      >
                        <div className={styles.breathIcon}>
                          <Image
                            src={getBookIcon(selectedEquipment.type === 'weapon', currentLevel)}
                            alt="책" fill style={{ objectFit: 'contain' }}
                          />
                        </div>
                        <span>{selectedEquipment.type === 'weapon' ? '장인의 야금술' : '장인의 재봉술'}</span>
                      </button>
                    </div>

                    {/* 일괄 선택 버튼 */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <button
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: useBreath && useBook ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--card-bg)',
                          color: useBreath && useBook ? 'white' : 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setUseBreath(true);
                          setUseBook(true);
                        }}
                      >
                        모두 사용
                      </button>
                      <button
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: !useBreath && !useBook ? 'var(--border-color)' : 'var(--card-bg)',
                          color: !useBreath && !useBook ? 'var(--text-primary)' : 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setUseBreath(false);
                          setUseBook(false);
                        }}
                      >
                        모두 미사용
                      </button>
                    </div>

                    {/* 1회 비용 (기본 재료만) */}
                    <div className={styles.singleCostSection}>
                      <div className={styles.singleCostTitle}>1회 재련 비용</div>
                      <div className={styles.singleCostGrid}>
                        {perAttemptCost && (
                          <>
                            <div className={styles.singleCostItem}>
                              <Image src={perAttemptCost.stoneIcon} alt={perAttemptCost.stoneName} width={32} height={32} />
                              <span>{perAttemptCost.stone.toLocaleString()}</span>
                            </div>
                            <div className={styles.singleCostItem}>
                              <Image src="/destiny-breakthrough-stone5.webp" alt="돌파석" width={32} height={32} />
                              <span>{perAttemptCost.돌파석.toLocaleString()}</span>
                            </div>
                            <div className={styles.singleCostItem}>
                              <Image src="/abidos-fusion5.webp" alt="아비도스" width={32} height={32} />
                              <span>{perAttemptCost.아비도스.toLocaleString()}</span>
                            </div>
                            <div className={styles.singleCostItem}>
                              <Image src="/destiny-shard-bag-large5.webp" alt="운명파편" width={32} height={32} />
                              <span>{perAttemptCost.운명파편.toLocaleString()}</span>
                            </div>
                            <div className={styles.singleCostItem}>
                              <Image src="/shilling.webp" alt="실링" width={32} height={32} />
                              <span>{perAttemptCost.실링.toLocaleString()}</span>
                            </div>
                            <div className={styles.singleCostItem}>
                              <Image src="/gold.webp" alt="골드" width={32} height={32} />
                              <span>{perAttemptCost.골드.toLocaleString()}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 재련 버튼 영역 */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <button
                        className={styles.refiningButton}
                        onClick={attemptRefining}
                        disabled={isAnimating || isAutoMode}
                        style={{
                          flex: 1,
                          ...(isBonusTurn ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}),
                          ...(isAutoMode ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                        }}
                      >
                        {isBonusTurn ? '선조 재련' : '상급 재련'}
                        {nextTurnFree && <span style={{ marginLeft: '8px', fontSize: '0.8rem' }}>(무료)</span>}
                      </button>

                      <div style={{ position: 'relative', flex: 1 }}>
                        <button
                          className={styles.refiningButton}
                          onClick={() => {
                            if (isAutoMode) {
                              toggleAutoMode();
                            } else {
                              if (!showAutoSettings) {
                                // 드롭다운 열 때 기본 목표 설정 (10단위 끝)
                                setAutoTargetLevel(getAutoTargetLevel(currentLevel));
                              }
                              setShowAutoSettings(!showAutoSettings);
                            }
                          }}
                          style={{
                            width: '100%',
                            background: isAutoMode
                              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                              : 'linear-gradient(135deg, #10b981, #059669)',
                          }}
                        >
                          {isAutoMode ? '중지' : '자동강화'}
                        </button>

                        {/* 자동강화 설정 드롭다운 */}
                        {showAutoSettings && !isAutoMode && (
                          <div className={styles.autoDropdown}>
                            <div className={styles.autoDropdownTitle}>자동강화 설정</div>

                            {/* 목표 레벨 */}
                            <div className={styles.autoDropdownSection}>
                              <div className={styles.autoDropdownLabel}>목표 레벨</div>
                              <div className={styles.autoDropdownLevelText}>
                                +{currentLevel} → +{isAutoMode ? autoTargetLevel : getAutoTargetLevel(currentLevel)}
                              </div>
                            </div>

                            {/* 일반턴 설정 */}
                            <div className={styles.autoDropdownTurnSection}>
                              <div className={`${styles.autoDropdownTurnTitle} ${styles.autoDropdownTurnNormal}`}>일반턴</div>
                              <div className={styles.autoDropdownCheckboxRow}>
                                <label className={styles.autoDropdownCheckbox}>
                                  <input
                                    type="checkbox"
                                    checked={autoSettings.normalTurn.useBreath}
                                    onChange={(e) => setAutoSettings(prev => ({
                                      ...prev,
                                      normalTurn: { ...prev.normalTurn, useBreath: e.target.checked }
                                    }))}
                                  />
                                  숨결
                                </label>
                                <label className={styles.autoDropdownCheckbox}>
                                  <input
                                    type="checkbox"
                                    checked={autoSettings.normalTurn.useBook}
                                    onChange={(e) => setAutoSettings(prev => ({
                                      ...prev,
                                      normalTurn: { ...prev.normalTurn, useBook: e.target.checked }
                                    }))}
                                  />
                                  {selectedEquipment?.type === 'weapon' ? '야금술' : '재봉술'}
                                </label>
                              </div>
                            </div>

                            {/* 선조턴 설정 */}
                            <div className={styles.autoDropdownTurnSection}>
                              <div className={`${styles.autoDropdownTurnTitle} ${styles.autoDropdownTurnAncestor}`}>선조턴</div>
                              <div className={styles.autoDropdownCheckboxRow}>
                                <label className={styles.autoDropdownCheckbox}>
                                  <input
                                    type="checkbox"
                                    checked={autoSettings.ancestorTurn.useBreath}
                                    onChange={(e) => setAutoSettings(prev => ({
                                      ...prev,
                                      ancestorTurn: { ...prev.ancestorTurn, useBreath: e.target.checked }
                                    }))}
                                  />
                                  숨결
                                </label>
                                <label className={styles.autoDropdownCheckbox}>
                                  <input
                                    type="checkbox"
                                    checked={autoSettings.ancestorTurn.useBook}
                                    onChange={(e) => setAutoSettings(prev => ({
                                      ...prev,
                                      ancestorTurn: { ...prev.ancestorTurn, useBook: e.target.checked }
                                    }))}
                                  />
                                  {selectedEquipment?.type === 'weapon' ? '야금술' : '재봉술'}
                                </label>
                              </div>
                            </div>

                            {/* 강화 선조턴 설정 */}
                            <div className={styles.autoDropdownTurnSection}>
                              <div className={`${styles.autoDropdownTurnTitle} ${styles.autoDropdownTurnEnhanced}`}>강화 선조턴</div>
                              <div className={styles.autoDropdownCheckboxRow}>
                                <label className={styles.autoDropdownCheckbox}>
                                  <input
                                    type="checkbox"
                                    checked={autoSettings.enhancedAncestorTurn.useBreath}
                                    onChange={(e) => setAutoSettings(prev => ({
                                      ...prev,
                                      enhancedAncestorTurn: { ...prev.enhancedAncestorTurn, useBreath: e.target.checked }
                                    }))}
                                  />
                                  숨결
                                </label>
                                <label className={styles.autoDropdownCheckbox}>
                                  <input
                                    type="checkbox"
                                    checked={autoSettings.enhancedAncestorTurn.useBook}
                                    onChange={(e) => setAutoSettings(prev => ({
                                      ...prev,
                                      enhancedAncestorTurn: { ...prev.enhancedAncestorTurn, useBook: e.target.checked }
                                    }))}
                                  />
                                  {selectedEquipment?.type === 'weapon' ? '야금술' : '재봉술'}
                                </label>
                              </div>
                            </div>

                            {/* 시작 버튼 */}
                            <button className={styles.autoDropdownStartBtn} onClick={toggleAutoMode}>
                              자동강화 시작
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button className={styles.resetButton} onClick={resetSimulation} disabled={isAutoMode}>
                      초기화
                    </button>
                  </>
                )}
              </div>

              {/* 두 번째 상자: 기록 */}
              <div className={styles.box}>
                <div className={styles.boxTitle}>재련 기록</div>
                <div className={styles.historyContainer}>
                  {attemptHistory.length === 0 ? (
                    <div className={styles.historyEmpty}>
                      재련 버튼을 눌러 시뮬레이션을 시작하세요
                    </div>
                  ) : (
                    <div className={styles.historyList}>
                      {attemptHistory.map((attempt, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: '5px',
                            borderLeft: `3px solid ${gradeColors[attempt.grade]}`,
                            background: 'var(--card-bg)',
                            marginBottom: '0.2rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)' }}>#{attempt.attemptNumber}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {attempt.isBonusTurn ? '선조' : '일반'}
                            </span>
                            <span style={{
                              marginLeft: 'auto',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.3rem',
                              borderRadius: '3px',
                              background: gradeColors[attempt.grade],
                              color: 'white',
                            }}>
                              {gradeLabels[attempt.grade]}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>+{attempt.exp} EXP → Lv.{attempt.level}</span>
                            {attempt.card && <span style={{ color: '#fbbf24', fontWeight: 600 }}>{attempt.card}</span>}
                            {attempt.isFree && <span style={{ color: '#10b981', fontWeight: 600 }}>무료</span>}
                          </div>
                        </div>
                      ))}
                      <div ref={historyEndRef} />
                    </div>
                  )}
                </div>
                <div className={styles.historyStats}>
                  <div className={styles.historyStatItem}>
                    <span className={styles.statLabel}>총시도</span>
                    <span>{attemptHistory.length}</span>
                  </div>
                  <div className={styles.historyStatItem}>
                    <span className={styles.statLabel}>성공</span>
                    <span className={styles.statSuccess}>{attemptHistory.filter(a => a.grade === 'success').length}</span>
                  </div>
                  <div className={styles.historyStatItem}>
                    <span className={styles.statLabel}>대성</span>
                    <span style={{ color: gradeColors.great }}>{attemptHistory.filter(a => a.grade === 'great').length}</span>
                  </div>
                  <div className={styles.historyStatItem}>
                    <span className={styles.statLabel}>대대</span>
                    <span style={{ color: gradeColors.super }}>{attemptHistory.filter(a => a.grade === 'super').length}</span>
                  </div>
                </div>
              </div>

              {/* 세 번째 상자: 누적 비용 */}
              <div className={styles.box}>
                <div className={styles.boxTitle}>누적 비용</div>
                <div className={styles.totalCostContainer}>
                  <div className={styles.totalMaterialsList}>
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
                    {accumulatedCost.운명파편 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/destiny-shard-bag-large5.webp" alt="운명파편" width={28} height={28} />
                        <span className={styles.materialName}>운명파편</span>
                        <span className={styles.materialAmount}>{accumulatedCost.운명파편.toLocaleString()}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('운명파편', accumulatedCost.운명파편).toLocaleString()}G</span>
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
                    {accumulatedCost.빙하 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/breath-glacier5.webp" alt="빙하" width={28} height={28} />
                        <span className={styles.materialName}>빙하의 숨결</span>
                        <span className={styles.materialAmount}>{accumulatedCost.빙하.toLocaleString()}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('빙하', accumulatedCost.빙하).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.용암 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/breath-lava5.webp" alt="용암" width={28} height={28} />
                        <span className={styles.materialName}>용암의 숨결</span>
                        <span className={styles.materialAmount}>{accumulatedCost.용암.toLocaleString()}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('용암', accumulatedCost.용암).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.야금술1단 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/master-metallurgy-1-5.webp" alt="장인의 야금술 1단계" width={28} height={28} />
                        <span className={styles.materialName}>장인의 야금술 1단계</span>
                        <span className={styles.materialAmount}>{accumulatedCost.야금술1단}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('야금술1단', accumulatedCost.야금술1단).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.야금술2단 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/master-metallurgy-2-5.webp" alt="장인의 야금술 2단계" width={28} height={28} />
                        <span className={styles.materialName}>장인의 야금술 2단계</span>
                        <span className={styles.materialAmount}>{accumulatedCost.야금술2단}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('야금술2단', accumulatedCost.야금술2단).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.야금술3단 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/master-metallurgy-3-5.webp" alt="장인의 야금술 3단계" width={28} height={28} />
                        <span className={styles.materialName}>장인의 야금술 3단계</span>
                        <span className={styles.materialAmount}>{accumulatedCost.야금술3단}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('야금술3단', accumulatedCost.야금술3단).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.야금술4단 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/master-metallurgy-4-5.webp" alt="장인의 야금술 4단계" width={28} height={28} />
                        <span className={styles.materialName}>장인의 야금술 4단계</span>
                        <span className={styles.materialAmount}>{accumulatedCost.야금술4단}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('야금술4단', accumulatedCost.야금술4단).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.재봉술1단 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/master-tailoring-1-5.webp" alt="장인의 재봉술 1단계" width={28} height={28} />
                        <span className={styles.materialName}>장인의 재봉술 1단계</span>
                        <span className={styles.materialAmount}>{accumulatedCost.재봉술1단}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('재봉술1단', accumulatedCost.재봉술1단).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.재봉술2단 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/master-tailoring-2-5.webp" alt="장인의 재봉술 2단계" width={28} height={28} />
                        <span className={styles.materialName}>장인의 재봉술 2단계</span>
                        <span className={styles.materialAmount}>{accumulatedCost.재봉술2단}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('재봉술2단', accumulatedCost.재봉술2단).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.재봉술3단 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/master-tailoring-3-5.webp" alt="장인의 재봉술 3단계" width={28} height={28} />
                        <span className={styles.materialName}>장인의 재봉술 3단계</span>
                        <span className={styles.materialAmount}>{accumulatedCost.재봉술3단}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('재봉술3단', accumulatedCost.재봉술3단).toLocaleString()}G</span>
                      </div>
                    )}
                    {accumulatedCost.재봉술4단 > 0 && (
                      <div className={styles.totalMaterialItem}>
                        <Image src="/master-tailoring-4-5.webp" alt="장인의 재봉술 4단계" width={28} height={28} />
                        <span className={styles.materialName}>장인의 재봉술 4단계</span>
                        <span className={styles.materialAmount}>{accumulatedCost.재봉술4단}</span>
                        <span className={styles.materialGold}>{getMaterialGoldCost('재봉술4단', accumulatedCost.재봉술4단).toLocaleString()}G</span>
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
                  {/* 상급재련 단계 증가 */}
                  {currentLevel > startLevel && (
                    <div className={styles.levelProgress}>
                      <span className={styles.levelProgressLabel}>상급 재련</span>
                      <div className={styles.levelProgressValue}>
                        <span>+{startLevel}</span>
                        <span className={styles.levelArrow}>→</span>
                        <span className={styles.levelCurrent}>+{currentLevel}</span>
                        <span className={styles.levelIncrease}>(+{currentLevel - startLevel})</span>
                      </div>
                    </div>
                  )}
                  <div className={styles.totalGoldCost}>
                    <Image src="/gold.webp" alt="골드" width={32} height={32} />
                    <span>{getTotalGoldCost().toLocaleString()} G</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 데이터 수집 고지 */}
        <div className={styles.dataNotice}>
          ℹ️ 시도 횟수, 강화 단계, 소모 재료, 숨결 사용 횟수만 익명 통계로 수집됩니다.
        </div>
      </div>}
    </div>
  );
}
