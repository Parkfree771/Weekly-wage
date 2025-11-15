'use client';

import { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Row, Col, Card, Badge, ButtonGroup } from 'react-bootstrap';
import Image from 'next/image';
import { useTheme } from '../ThemeProvider';
import { getAverageTries } from '../../lib/refiningSimulationData';
import {
  BASE_PROBABILITY,
  ARMOR_MATERIAL_COSTS,
  WEAPON_MATERIAL_COSTS,
  getBreathEffect,
  JANGIN_ACCUMULATE_DIVIDER
} from '../../lib/refiningData';
import {
  calculateAdvancedRefiningMaterials,
  T4_MATERIAL_PRICES,
  type AdvancedRefiningOptions as NewAdvancedRefiningOptions
} from '../../lib/advancedRefiningData';
import {
  parseEquipmentData,
  getGradeColor,
  type Equipment as EquipmentType,
  type EquipmentAPIResponse
} from '../../lib/equipmentParser';

// 장비 정보는 이제 equipmentParser에서 import
type Equipment = EquipmentType;

// 재료 정보
type Materials = {
  수호석: number; // 운명의 수호석
  파괴석: number; // 운명의 파괴석
  돌파석: number; // 운명의 돌파석
  아비도스: number; // 아비도스 융화 재료
  운명파편: number; // 운명의 파편
  누골: number; // 누적 골드 (강화 시도 시 드는 골드)
  빙하: number; // 빙하의 숨결 (방어구)
  용암: number; // 용암의 숨결 (무기)
  방어구책: number; // 재봉술 책 (일반 강화용)
  무기책: number; // 야금술 책 (일반 강화용)
  재봉술1단?: number; // 장인의 재봉술 1단계 (상급 1~10)
  재봉술2단?: number; // 장인의 재봉술 2단계 (상급 11~20)
  야금술1단?: number; // 장인의 야금술 1단계 (상급 1~10)
  야금술2단?: number; // 장인의 야금술 2단계 (상급 11~20)
};

// 재료 카드 컴포넌트
const MaterialCard = ({
  icon,
  name,
  amount,
  color = 'var(--brand-primary)',
  cost,
  isBound,
  onBoundChange,
  showCheckbox,
  style: customStyle,
  // New props for additional materials
  showEnableToggle,
  isEnabled,
  onToggleEnabled,
}: {
  icon: string;
  name: string;
  amount: number;
  color?: string;
  cost?: number;
  isBound?: boolean;
  onBoundChange?: (name: string, isBound: boolean) => void;
  showCheckbox?: boolean;
  style?: React.CSSProperties;
  showEnableToggle?: boolean;
  isEnabled?: boolean;
  onToggleEnabled?: () => void;
}) => (
  <div
    className="h-100 d-flex flex-column align-items-center justify-content-center"
    style={{
      position: 'relative',
      backgroundColor: 'var(--card-body-bg-blue)',
      borderRadius: '14px',
      border: '1px solid var(--border-color)',
      transition: 'all 0.25s ease',
      cursor: 'default',
      padding: 'clamp(0.5rem, 2vw, 1rem)',
      '--hover-color': color,
      opacity: showEnableToggle && !isEnabled ? 0.6 : 1,
      ...customStyle,
    }}
  >
    {showEnableToggle && (
       <Form.Check
        type="switch"
        id={`enable-switch-${name}`}
        checked={isEnabled}
        onChange={onToggleEnabled}
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
        }}
        className="refining-checkbox"
      />
    )}
    {showCheckbox && (
      <Form.Check
        type="checkbox"
        id={`bound-check-${name}`}
        label="귀속"
        checked={isBound}
        onChange={(e) => onBoundChange?.(name, e.target.checked)}
        disabled={showEnableToggle && !isEnabled}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontWeight: '600',
        }}
        className="refining-checkbox"
      />
    )}
    <div style={{
      position: 'relative',
      width: 'clamp(36px, 10vw, 52px)',
      height: 'clamp(36px, 10vw, 52px)',
      marginBottom: 'clamp(4px, 1vw, 8px)',
    }}>
      <Image
        src={icon}
        alt={name}
        fill
        style={{ objectFit: 'contain' }}
      />
    </div>
    <div style={{
      fontSize: 'clamp(0.65rem, 2vw, 0.8rem)',
      color: 'var(--text-secondary)',
      marginBottom: 'clamp(3px, 0.8vw, 6px)',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      fontWeight: '500',
    }}>
      {name}
    </div>
    <div style={{
      fontSize: 'clamp(0.8rem, 2.5vw, 1.1rem)',
      fontWeight: '700',
      color: amount === 0 ? 'var(--text-secondary)' : color,
      transition: 'color 0.25s ease',
    }}>
      {amount.toLocaleString()}
    </div>
    {cost !== undefined && (
      <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px', fontWeight: '600' }}>
        <Image src="/gold.jpg" alt="gold" width={12} height={12} style={{ marginRight: '4px' }} />
        {Math.round(isBound ? 0 : cost).toLocaleString()}
      </div>
    )}
  </div>
);

export default function RefiningCalculator() {
  const { theme } = useTheme();
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searched, setSearched] = useState(false);
  const [characterInfo, setCharacterInfo] = useState<{ name: string; itemLevel: string } | null>(null);

  // 부위별 목표 레벨 설정 (일반 강화 + 상급 재련 분리)
  const [targetLevels, setTargetLevels] = useState<Record<string, { normal: number | null, advanced: number | null }>>({});

  // 추가 재료 옵션 (일반 강화용)
  const [materialOptions, setMaterialOptions] = useState({
    glacierBreath: { enabled: false, isBound: false },
    lavaBreath: { enabled: false, isBound: false },
    tailoring: { enabled: false, isBound: false },        // 재봉술 10~14
    tailoring1518: { enabled: false, isBound: false },    // 재봉술 15~18
    tailoring1920: { enabled: false, isBound: false },    // 재봉술 19~20
    metallurgy: { enabled: false, isBound: false },       // 야금술 10~14
    metallurgy1518: { enabled: false, isBound: false },   // 야금술 15~18
    metallurgy1920: { enabled: false, isBound: false },   // 야금술 19~20
  });

  // 상급재련 추가 재료 옵션
  const [advancedMaterialOptions, setAdvancedMaterialOptions] = useState({
    // 방어구 (빙하)
    armorNormalBreath: { enabled: false, isBound: false },  // 방어구 일반턴 빙하
    armorBonusBreath: { enabled: false, isBound: false },   // 방어구 선조턴 빙하
    armorNormalBook1: { enabled: false, isBound: false },   // 방어구 일반턴 책 1단계
    armorBonusBook1: { enabled: false, isBound: false },    // 방어구 선조턴 책 1단계
    armorNormalBook2: { enabled: false, isBound: false },   // 방어구 일반턴 책 2단계
    armorBonusBook2: { enabled: false, isBound: false },    // 방어구 선조턴 책 2단계
    // 무기 (용암)
    weaponNormalBreath: { enabled: false, isBound: false }, // 무기 일반턴 용암
    weaponBonusBreath: { enabled: false, isBound: false },  // 무기 선조턴 용암
    weaponNormalBook1: { enabled: false, isBound: false },  // 무기 일반턴 책 1단계
    weaponBonusBook1: { enabled: false, isBound: false },   // 무기 선조턴 책 1단계
    weaponNormalBook2: { enabled: false, isBound: false },  // 무기 일반턴 책 2단계
    weaponBonusBook2: { enabled: false, isBound: false },   // 무기 선조턴 책 2단계
  });

  // 일괄 목표 설정 UI 상태
  const [selectedArmorBulkLevel, setSelectedArmorBulkLevel] = useState<{ normal: number | null, advanced: number | null }>({ normal: null, advanced: null });
  const [selectedWeaponBulkLevel, setSelectedWeaponBulkLevel] = useState<{ normal: number | null, advanced: number | null }>({ normal: null, advanced: null });

  // 귀속 재료 상태
  const [boundMaterials, setBoundMaterials] = useState<Record<string, boolean>>({
    '수호석': true,
    '파괴석': true,
    '돌파석': true,
    '운명파편': true,
    '아비도스': false,
  });

  // 계산 결과 상태 (비용 포함)
  const [results, setResults] = useState<{ totalGold: number; materialCosts: Record<string, number> }>({
    totalGold: 0,
    materialCosts: {},
  });

  // 거래소 가격 정보
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({
    '66102106': 0, // 수호석
    '66102006': 0, // 파괴석
    '66110225': 0, // 돌파석
    '6861012': 0,  // 아비도스
    '66130143': 0, // 운명파편
    '66111131': 0, // 용암의 숨결
    '66111132': 0, // 빙하의 숨결
    '66112554': 0, // 재봉술 책 19-20
    '66112553': 0, // 야금술 책 19-20
  });


  const [materials, setMaterials] = useState<Materials | null>(null);

  // 재료량 계산 로직 (useEffect로 분리)
  useEffect(() => {
    if (searched) {
      const newMaterials = calculateMaterials();
      setMaterials(newMaterials);
    } else {
      setMaterials(null);
    }
  }, [searched, targetLevels, materialOptions, advancedMaterialOptions, equipments]);

  // 비용 계산 로직 (useEffect로 분리)
  useEffect(() => {
    if (!materials) {
      setResults({ totalGold: 0, materialCosts: {} });
      return;
    }

    const costs: Record<string, number> = {};
    let totalMaterialCost = 0;

    // 개별 재료 비용 계산 (단위 변환 적용)
    costs['수호석'] = materials.수호석 * ((marketPrices['66102106'] || 0) / 100);  // 100개 단위
    costs['파괴석'] = materials.파괴석 * ((marketPrices['66102006'] || 0) / 100);  // 100개 단위
    costs['돌파석'] = materials.돌파석 * (marketPrices['66110225'] || 0);
    costs['아비도스'] = materials.아비도스 * (marketPrices['6861012'] || 0);
    costs['운명파편'] = materials.운명파편 * ((marketPrices['66130143'] || 0) / 3000);  // 3000개 단위
    costs['빙하'] = materials.빙하 * (marketPrices['66111132'] || 0);
    costs['용암'] = materials.용암 * (marketPrices['66111131'] || 0);
    costs['방어구책'] = materials.방어구책 * (marketPrices['66112554'] || 0);  // 재봉술2단 (19-20)
    costs['무기책'] = materials.무기책 * (marketPrices['66112553'] || 0);  // 야금술2단 (19-20)

    // 상급 재련 책 비용 (1단, 2단)
    costs['재봉술1단'] = (materials.재봉술1단 || 0) * (marketPrices['66112552'] || 0);
    costs['재봉술2단'] = (materials.재봉술2단 || 0) * (marketPrices['66112554'] || 0);
    costs['야금술1단'] = (materials.야금술1단 || 0) * (marketPrices['66112551'] || 0);
    costs['야금술2단'] = (materials.야금술2단 || 0) * (marketPrices['66112553'] || 0);

    // 귀속 재료를 제외한 총 재료비 계산
    if (!boundMaterials['수호석']) totalMaterialCost += costs['수호석'];
    if (!boundMaterials['파괴석']) totalMaterialCost += costs['파괴석'];
    if (!boundMaterials['돌파석']) totalMaterialCost += costs['돌파석'];
    if (!boundMaterials['아비도스']) totalMaterialCost += costs['아비도스'];
    if (!boundMaterials['운명파편']) totalMaterialCost += costs['운명파편'];

    // 추가 재료 비용 계산 (일반 강화 + 상급재련)
    // 빙하 숨결: 일반 강화 또는 상급재련(방어구 일반턴/보너스턴)에서 사용
    const usingGlacier = materialOptions.glacierBreath.enabled ||
                         advancedMaterialOptions.armorNormalBreath.enabled ||
                         advancedMaterialOptions.armorBonusBreath.enabled;
    const allGlacierBound =
      (!materialOptions.glacierBreath.enabled || materialOptions.glacierBreath.isBound) &&
      (!advancedMaterialOptions.armorNormalBreath.enabled || advancedMaterialOptions.armorNormalBreath.isBound) &&
      (!advancedMaterialOptions.armorBonusBreath.enabled || advancedMaterialOptions.armorBonusBreath.isBound);

    if (usingGlacier && !allGlacierBound) {
      totalMaterialCost += costs['빙하'];
    }

    // 용암 숨결: 일반 강화 또는 상급재련(무기 일반턴/보너스턴)에서 사용
    const usingLava = materialOptions.lavaBreath.enabled ||
                      advancedMaterialOptions.weaponNormalBreath.enabled ||
                      advancedMaterialOptions.weaponBonusBreath.enabled;
    const allLavaBound =
      (!materialOptions.lavaBreath.enabled || materialOptions.lavaBreath.isBound) &&
      (!advancedMaterialOptions.weaponNormalBreath.enabled || advancedMaterialOptions.weaponNormalBreath.isBound) &&
      (!advancedMaterialOptions.weaponBonusBreath.enabled || advancedMaterialOptions.weaponBonusBreath.isBound);

    if (usingLava && !allLavaBound) {
      totalMaterialCost += costs['용암'];
    }

    if (materialOptions.tailoring.enabled && !materialOptions.tailoring.isBound) {
      totalMaterialCost += costs['방어구책'];
    }
    if (materialOptions.tailoring1518.enabled && !materialOptions.tailoring1518.isBound) {
      totalMaterialCost += costs['방어구책'];
    }
    if (materialOptions.tailoring1920.enabled && !materialOptions.tailoring1920.isBound) {
      totalMaterialCost += costs['방어구책'];
    }
    if (materialOptions.metallurgy.enabled && !materialOptions.metallurgy.isBound) {
      totalMaterialCost += costs['무기책'];
    }
    if (materialOptions.metallurgy1518.enabled && !materialOptions.metallurgy1518.isBound) {
      totalMaterialCost += costs['무기책'];
    }
    if (materialOptions.metallurgy1920.enabled && !materialOptions.metallurgy1920.isBound) {
      totalMaterialCost += costs['무기책'];
    }

    // 상급 재련 책 비용 추가 (방어구)
    if (advancedMaterialOptions.armorNormalBook1.enabled && !advancedMaterialOptions.armorNormalBook1.isBound) {
      totalMaterialCost += costs['재봉술1단'] || 0;
    }
    if (advancedMaterialOptions.armorNormalBook2.enabled && !advancedMaterialOptions.armorNormalBook2.isBound) {
      totalMaterialCost += costs['재봉술2단'] || 0;
    }
    if (advancedMaterialOptions.armorBonusBook1.enabled && !advancedMaterialOptions.armorBonusBook1.isBound) {
      totalMaterialCost += costs['재봉술1단'] || 0;
    }
    if (advancedMaterialOptions.armorBonusBook2.enabled && !advancedMaterialOptions.armorBonusBook2.isBound) {
      totalMaterialCost += costs['재봉술2단'] || 0;
    }

    // 상급 재련 책 비용 추가 (무기)
    if (advancedMaterialOptions.weaponNormalBook1.enabled && !advancedMaterialOptions.weaponNormalBook1.isBound) {
      totalMaterialCost += costs['야금술1단'] || 0;
    }
    if (advancedMaterialOptions.weaponNormalBook2.enabled && !advancedMaterialOptions.weaponNormalBook2.isBound) {
      totalMaterialCost += costs['야금술2단'] || 0;
    }
    if (advancedMaterialOptions.weaponBonusBook1.enabled && !advancedMaterialOptions.weaponBonusBook1.isBound) {
      totalMaterialCost += costs['야금술1단'] || 0;
    }
    if (advancedMaterialOptions.weaponBonusBook2.enabled && !advancedMaterialOptions.weaponBonusBook2.isBound) {
      totalMaterialCost += costs['야금술2단'] || 0;
    }

    const totalGold = Math.round(materials.누골 + totalMaterialCost);

    setResults({ totalGold, materialCosts: costs });

  }, [materials, marketPrices, boundMaterials, materialOptions, advancedMaterialOptions]);

  // 거래소 가격 불러오기 (전전날 데이터, 하루에 한 번만)
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        // 로컬스토리지에서 캐시된 가격과 날짜 확인
        const cachedPrices = localStorage.getItem('refining_material_prices');
        const cachedDate = localStorage.getItem('refining_material_prices_date');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // 캐시가 있고 오늘 날짜와 같으면 캐시 사용
        if (cachedPrices && cachedDate === today) {
          setMarketPrices(JSON.parse(cachedPrices));
          return;
        }

        // 캐시가 없거나 오래되었으면 새로 가져오기
        const response = await fetch('/api/market/refining-prices');

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.prices) {
            setMarketPrices(data.prices);

            // 로컬스토리지에 캐시 저장
            localStorage.setItem('refining_material_prices', JSON.stringify(data.prices));
            localStorage.setItem('refining_material_prices_date', today);

            console.log(`재련 재료 가격 로드 완료 (${data.targetDate} 데이터 사용)`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch market prices:', error);
      }
    };

    fetchMarketPrices();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim()) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 로스트아크 API 호출
      const response = await fetch(`/api/lostark?characterName=${encodeURIComponent(characterName.trim())}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('캐릭터를 찾을 수 없습니다. 캐릭터명을 정확히 입력해주세요.');
        }
        throw new Error('캐릭터 정보를 가져오는데 실패했습니다.');
      }

      const data = await response.json();

      // 장비 정보 파싱
      if (!data.equipment || !Array.isArray(data.equipment)) {
        throw new Error('장비 정보를 찾을 수 없습니다.');
      }

      const parsedEquipments = parseEquipmentData(data.equipment as EquipmentAPIResponse[]);

      if (parsedEquipments.length === 0) {
        throw new Error('1640 레벨(+11) 이상의 장비가 없습니다.');
      }

      setEquipments(parsedEquipments);

      // 목표 레벨 초기화 (사용자가 선택하기 전까지 null)
      const initialTargets: Record<string, { normal: number | null, advanced: number | null }> = {};
      parsedEquipments.forEach(eq => {
        initialTargets[eq.name] = { normal: null, advanced: null };
      });
      setTargetLevels(initialTargets);

      // 캐릭터 정보 저장 (프로필에서 가져옴)
      if (data.profile) {
        setCharacterInfo({
          name: data.profile.CharacterName || characterName,
          itemLevel: data.profile.ItemAvgLevel || '알 수 없음'
        });
      }

      // 재료 옵션 및 귀속 상태 초기화
      setMaterialOptions({
        glacierBreath: { enabled: false, isBound: false },
        lavaBreath: { enabled: false, isBound: false },
        tailoring: { enabled: false, isBound: false },
        tailoring1518: { enabled: false, isBound: false },
        tailoring1920: { enabled: false, isBound: false },
        metallurgy: { enabled: false, isBound: false },
        metallurgy1518: { enabled: false, isBound: false },
        metallurgy1920: { enabled: false, isBound: false },
      });
      setAdvancedMaterialOptions({
        armorNormalBreath: { enabled: false, isBound: false },
        armorBonusBreath: { enabled: false, isBound: false },
        armorNormalBook1: { enabled: false, isBound: false },
        armorBonusBook1: { enabled: false, isBound: false },
        armorNormalBook2: { enabled: false, isBound: false },
        armorBonusBook2: { enabled: false, isBound: false },
        weaponNormalBreath: { enabled: false, isBound: false },
        weaponBonusBreath: { enabled: false, isBound: false },
        weaponNormalBook1: { enabled: false, isBound: false },
        weaponBonusBook1: { enabled: false, isBound: false },
        weaponNormalBook2: { enabled: false, isBound: false },
        weaponBonusBook2: { enabled: false, isBound: false },
      });
      setBoundMaterials({
        '수호석': true,
        '파괴석': true,
        '돌파석': true,
        '운명파편': true,
        '아비도스': false,
      });
      setSelectedArmorBulkLevel({ normal: null, advanced: null });
      setSelectedWeaponBulkLevel({ normal: null, advanced: null });

      setSearched(true);
    } catch (error: any) {
      setError(error.message || '예상치 못한 오류가 발생했습니다.');
      // 에러 발생 시 기존 데이터 유지
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCharacterName('');
    setEquipments([]);
    setSearched(false);
    setError(null);
    setCharacterInfo(null);
    setTargetLevels({});
    setMaterialOptions({
      glacierBreath: { enabled: false, isBound: false },
      lavaBreath: { enabled: false, isBound: false },
      tailoring: { enabled: false, isBound: false },
      metallurgy: { enabled: false, isBound: false },
    });
    setAdvancedMaterialOptions({
      normalBreath: { enabled: false, isBound: false },
      bonusBreath: { enabled: false, isBound: false },
    });
    setBoundMaterials({
      '수호석': true,
      '파괴석': true,
      '돌파석': true,
      '운명파편': true,
      '아비도스': false,
    });
    setSelectedArmorBulkLevel({ normal: null, advanced: null });
    setSelectedWeaponBulkLevel({ normal: null, advanced: null });
  };

  // 계산이 필요한 장비 필터링
  const getEquipmentsToRefine = () => {
    return equipments.filter(eq => {
      const targets = targetLevels[eq.name];
      if (!targets) return false;

      // 일반 강화 또는 상급 재련 목표가 하나라도 설정되어 있으면 계산 대상
      const hasNormalTarget = targets.normal !== null && targets.normal > eq.currentLevel;
      const hasAdvancedTarget = targets.advanced !== null && targets.advanced > eq.currentAdvancedLevel;

      return hasNormalTarget || hasAdvancedTarget;
    });
  };

  const handleBoundChange = (name: string, isBound: boolean) => {
    const key = name === '파편' ? '운명파편' : name;
    setBoundMaterials(prev => ({
      ...prev,
      [key]: isBound,
    }));
  };



  // 필요한 재료를 분석하는 함수
  const analyzeRequiredMaterials = () => {
    const toRefine = getEquipmentsToRefine();
    if (toRefine.length === 0) return {
      needsArmor: false,
      needsWeapon: false,
      hasNormalRefining: false, // 일반 강화 목표가 있는지
      hasAdvancedRefining: false, // 상급 재련 목표가 있는지
      needsGlacierNormal: false, // 일반 강화용 빙하
      needsLavaNormal: false, // 일반 강화용 용암
      needsGlacierAdvanced: false, // 상급 재련용 빙하
      needsLavaAdvanced: false, // 상급 재련용 용암
      needsArmorBook1014: false,
      needsArmorBook1518: false,
      needsArmorBook1920: false,
      needsWeaponBook1014: false,
      needsWeaponBook1518: false,
      needsWeaponBook1920: false,
      needsAdvancedArmorBook1: false,
      needsAdvancedArmorBook2: false,
      needsAdvancedWeaponBook1: false,
      needsAdvancedWeaponBook2: false,
    };

    let needsArmor = false;
    let needsWeapon = false;
    let hasNormalRefining = false;
    let hasAdvancedRefining = false;
    let needsGlacierNormal = false;
    let needsLavaNormal = false;
    let needsGlacierAdvanced = false;
    let needsLavaAdvanced = false;
    let needsArmorBook1014 = false;
    let needsArmorBook1518 = false;
    let needsArmorBook1920 = false;
    let needsWeaponBook1014 = false;
    let needsWeaponBook1518 = false;
    let needsWeaponBook1920 = false;
    let needsAdvancedArmorBook1 = false;
    let needsAdvancedArmorBook2 = false;
    let needsAdvancedWeaponBook1 = false;
    let needsAdvancedWeaponBook2 = false;

    toRefine.forEach(eq => {
      const targets = targetLevels[eq.name];
      if (!targets) return;

      // 일반 강화 목표가 있는 경우
      if (targets.normal && targets.normal > eq.currentLevel) {
        hasNormalRefining = true;

        if (eq.type === 'armor') {
          needsArmor = true;
          needsGlacierNormal = true;

          // 레벨별 책 필요 여부 확인
          for (let level = eq.currentLevel; level < targets.normal; level++) {
            const nextLevel = level + 1;
            if (nextLevel >= 10 && nextLevel <= 14) needsArmorBook1014 = true;
            if (nextLevel >= 15 && nextLevel <= 18) needsArmorBook1518 = true;
            if (nextLevel >= 19 && nextLevel <= 20) needsArmorBook1920 = true;
          }
        } else {
          needsWeapon = true;
          needsLavaNormal = true;

          // 레벨별 책 필요 여부 확인
          for (let level = eq.currentLevel; level < targets.normal; level++) {
            const nextLevel = level + 1;
            if (nextLevel >= 10 && nextLevel <= 14) needsWeaponBook1014 = true;
            if (nextLevel >= 15 && nextLevel <= 18) needsWeaponBook1518 = true;
            if (nextLevel >= 19 && nextLevel <= 20) needsWeaponBook1920 = true;
          }
        }
      }

      // 상급 재련 목표가 있는 경우
      if (targets.advanced && targets.advanced > eq.currentAdvancedLevel) {
        hasAdvancedRefining = true;

        if (eq.type === 'armor') {
          needsArmor = true;
          needsGlacierAdvanced = true;

          // 현재 레벨부터 목표 레벨까지의 범위에 따라 필요한 책 결정
          const currentLevel = eq.currentAdvancedLevel;
          const targetLevel = targets.advanced;

          // 1~10단계 구간을 지나가면 1단계 책 필요
          if (currentLevel < 10 && targetLevel >= 1) {
            needsAdvancedArmorBook1 = true;
          }

          // 11~20단계 구간을 지나가면 2단계 책 필요
          if (targetLevel > 10) {
            needsAdvancedArmorBook2 = true;
          }
        } else {
          needsWeapon = true;
          needsLavaAdvanced = true;

          // 현재 레벨부터 목표 레벨까지의 범위에 따라 필요한 책 결정
          const currentLevel = eq.currentAdvancedLevel;
          const targetLevel = targets.advanced;

          // 1~10단계 구간을 지나가면 1단계 책 필요
          if (currentLevel < 10 && targetLevel >= 1) {
            needsAdvancedWeaponBook1 = true;
          }

          // 11~20단계 구간을 지나가면 2단계 책 필요
          if (targetLevel > 10) {
            needsAdvancedWeaponBook2 = true;
          }
        }
      }
    });

    return {
      needsArmor,
      needsWeapon,
      hasNormalRefining,
      hasAdvancedRefining,
      needsGlacierNormal,
      needsLavaNormal,
      needsGlacierAdvanced,
      needsLavaAdvanced,
      needsArmorBook1014,
      needsArmorBook1518,
      needsArmorBook1920,
      needsWeaponBook1014,
      needsWeaponBook1518,
      needsWeaponBook1920,
      needsAdvancedArmorBook1,
      needsAdvancedArmorBook2,
      needsAdvancedWeaponBook1,
      needsAdvancedWeaponBook2,
    };
  };

// ... (컴포넌트의 다른 부분들은 동일)

  const calculateMaterials = (): Materials | null => {
    const toRefine = getEquipmentsToRefine();
    if (toRefine.length === 0) return null;

    let totalMaterials: Materials = {
      수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0,
      누골: 0, 빙하: 0, 용암: 0, 방어구책: 0, 무기책: 0,
      재봉술1단: 0, 재봉술2단: 0, 야금술1단: 0, 야금술2단: 0,
    };

    toRefine.forEach(eq => {
      const targets = targetLevels[eq.name];
      if (!targets) return;

      // 1. 일반 강화 재료 계산
      if (targets.normal && targets.normal > eq.currentLevel) {
        for (let level = eq.currentLevel; level < targets.normal; level++) {
          const nextLevel = level + 1;

          const useBreath = (eq.type === 'armor' && materialOptions.glacierBreath.enabled) || (eq.type === 'weapon' && materialOptions.lavaBreath.enabled);

          // 레벨에 따라 적절한 책 옵션 확인
          let useBook = false;
          if (nextLevel >= 10 && nextLevel <= 14) {
            useBook = (eq.type === 'armor' && materialOptions.tailoring.enabled) || (eq.type === 'weapon' && materialOptions.metallurgy.enabled);
          } else if (nextLevel >= 15 && nextLevel <= 18) {
            useBook = (eq.type === 'armor' && materialOptions.tailoring1518.enabled) || (eq.type === 'weapon' && materialOptions.metallurgy1518.enabled);
          } else if (nextLevel >= 19 && nextLevel <= 20) {
            useBook = (eq.type === 'armor' && materialOptions.tailoring1920.enabled) || (eq.type === 'weapon' && materialOptions.metallurgy1920.enabled);
          }

          const avgTries = getAverageTries(nextLevel, useBreath, useBook);
          if (avgTries === 0) continue;

          const materialCostPerTry = eq.type === 'armor'
            ? ARMOR_MATERIAL_COSTS[nextLevel]
            : WEAPON_MATERIAL_COSTS[nextLevel];

          const breathEffect = getBreathEffect(BASE_PROBABILITY[nextLevel]);
          const breathCountPerTry = useBreath ? breathEffect.max : 0;

          if (eq.type === 'armor') {
            totalMaterials.수호석 += (materialCostPerTry as any).수호석 * avgTries;
            if (useBreath) {
              totalMaterials.빙하 += breathCountPerTry * avgTries;
            }
            if (useBook) {
              totalMaterials.방어구책 += avgTries;
            }
          } else { // weapon
            totalMaterials.파괴석 += (materialCostPerTry as any).파괴석 * avgTries;
            if (useBreath) {
              totalMaterials.용암 += breathCountPerTry * avgTries;
            }
            if (useBook) {
              totalMaterials.무기책 += avgTries;
            }
          }
          totalMaterials.돌파석 += materialCostPerTry.돌파석 * avgTries;
          totalMaterials.아비도스 += materialCostPerTry.아비도스 * avgTries;
          totalMaterials.운명파편 += materialCostPerTry.운명파편 * avgTries;
          totalMaterials.누골 += materialCostPerTry.골드 * avgTries;
        }
      }

      // 2. 상급 재련 재료 계산
      if (targets.advanced && targets.advanced > eq.currentAdvancedLevel) {
        // 새 상급재련 옵션 설정 (방어구/무기 구분)
        const advancedOptions: NewAdvancedRefiningOptions = eq.type === 'armor' ? {
          useNormalBreath: advancedMaterialOptions.armorNormalBreath.enabled,
          useNormalBook1: advancedMaterialOptions.armorNormalBook1.enabled,
          useNormalBook2: advancedMaterialOptions.armorNormalBook2.enabled,
          useBonusBreath: advancedMaterialOptions.armorBonusBreath.enabled,
          useBonusBook1: advancedMaterialOptions.armorBonusBook1.enabled,
          useBonusBook2: advancedMaterialOptions.armorBonusBook2.enabled,
        } : {
          useNormalBreath: advancedMaterialOptions.weaponNormalBreath.enabled,
          useNormalBook1: advancedMaterialOptions.weaponNormalBook1.enabled,
          useNormalBook2: advancedMaterialOptions.weaponNormalBook2.enabled,
          useBonusBreath: advancedMaterialOptions.weaponBonusBreath.enabled,
          useBonusBook1: advancedMaterialOptions.weaponBonusBook1.enabled,
          useBonusBook2: advancedMaterialOptions.weaponBonusBook2.enabled,
        };

        // 새로운 계산 함수 사용
        const advancedMaterials = calculateAdvancedRefiningMaterials(
          eq.type,
          eq.currentAdvancedLevel,
          targets.advanced,
          advancedOptions
        );

        // 재료 누적
        totalMaterials.수호석 += advancedMaterials['수호석'] || 0;
        totalMaterials.파괴석 += advancedMaterials['파괴석'] || 0;
        totalMaterials.돌파석 += advancedMaterials['돌파석'] || 0;
        totalMaterials.아비도스 += advancedMaterials['아비도스'] || 0;
        totalMaterials.운명파편 += advancedMaterials['운명파편'] || 0;
        totalMaterials.누골 += advancedMaterials['누골'] || 0;
        totalMaterials.빙하 += advancedMaterials['빙하'] || 0;
        totalMaterials.용암 += advancedMaterials['용암'] || 0;
        totalMaterials.재봉술1단 = (totalMaterials.재봉술1단 || 0) + (advancedMaterials['재봉술1단'] || 0);
        totalMaterials.재봉술2단 = (totalMaterials.재봉술2단 || 0) + (advancedMaterials['재봉술2단'] || 0);
        totalMaterials.야금술1단 = (totalMaterials.야금술1단 || 0) + (advancedMaterials['야금술1단'] || 0);
        totalMaterials.야금술2단 = (totalMaterials.야금술2단 || 0) + (advancedMaterials['야금술2단'] || 0);
      }
    });

    // 반올림 처리
    Object.keys(totalMaterials).forEach(keyStr => {
      const key = keyStr as keyof Materials;
      totalMaterials[key] = Math.round(totalMaterials[key]);
    });

    return totalMaterials;
  };


  const equipmentsToRefine = searched ? getEquipmentsToRefine() : [];

  // 예상 도달 아이템 레벨 계산
  const calculateExpectedItemLevel = (): string | null => {
    if (!characterInfo) return null;

    // 현재 아이템 레벨 파싱
    const currentItemLevel = parseFloat(characterInfo.itemLevel.replace(/,/g, ''));
    if (isNaN(currentItemLevel)) return null;

    // 각 장비의 강화 단계 증가량 계산
    let totalIncrease = 0;
    equipments.forEach(eq => {
      const targets = targetLevels[eq.name];
      if (!targets) return;

      // 일반 강화: 1단계당 0.8333 증가
      if (targets.normal && targets.normal > eq.currentLevel) {
        const normalIncrease = targets.normal - eq.currentLevel;
        totalIncrease += normalIncrease * 0.8333;
      }

      // 상급 재련: 1단계당 0.16666 증가
      if (targets.advanced && targets.advanced > eq.currentAdvancedLevel) {
        const stepsToRefine = targets.advanced - eq.currentAdvancedLevel;
        totalIncrease += stepsToRefine * (0.8333 / 5);
      }
    });

    if (totalIncrease === 0) return null;

    const expectedLevel = currentItemLevel + totalIncrease;
    return expectedLevel.toFixed(2);
  };

  const expectedItemLevel = calculateExpectedItemLevel();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(0.5rem, 3vw, 2rem)' }}>
      {/* 검색창 */}
      <Form onSubmit={handleSearch} className="mb-4">
        <div className="d-flex justify-content-center">
          <div className="mb-3" style={{maxWidth: '700px', width: '100%'}}>
            <div className="d-flex gap-2">
              <Form.Control
                placeholder="캐릭터명을 입력하세요"
                value={characterName}
                onChange={(e) => {
                  setCharacterName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  padding: 'clamp(0.7rem, 2vw, 0.85rem) clamp(1rem, 2.5vw, 1.25rem)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  fontWeight: '500',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                }}
              />
              <Button
                type="submit"
                disabled={isLoading || !characterName.trim()}
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  padding: 'clamp(0.7rem, 2vw, 0.85rem) clamp(1.5rem, 3vw, 2rem)',
                  borderRadius: '12px',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  fontWeight: '700',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-md)',
                  whiteSpace: 'nowrap'
                }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    검색 중...
                  </>
                ) : (
                  '검색'
                )}
              </Button>
            </div>
          </div>
        </div>
        {error && (
          <div className="d-flex justify-content-center mb-3">
            <div style={{
              maxWidth: '700px',
              width: '100%',
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
              border: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.5)' : '#fca5a5'}`,
              borderRadius: '12px',
              color: theme === 'dark' ? '#fca5a5' : '#b91c1c',
              fontSize: 'clamp(0.85rem, 1.9vw, 0.95rem)',
              fontWeight: '600'
            }}>
              {error}
            </div>
          </div>
        )}
      </Form>


      {/* 장비 정보 및 목표 레벨 설정 */}
      {searched && equipments.length > 0 && (
        <>
          {/* 캐릭터 정보 헤더 */}
          {/* 부위별 목표 레벨 설정 */}
          <Card className="mb-4" style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <Card.Header style={{
              background: 'var(--card-body-bg-blue)',
              borderBottom: '1px solid var(--border-color)',
              padding: 'clamp(1rem, 2vw, 1.25rem)'
            }}>
              <h5 className="mb-0" style={{
                color: 'var(--text-primary)',
                fontWeight: '700',
                fontSize: 'clamp(1.1rem, 2.2vw, 1.25rem)',
                letterSpacing: '-0.02em'
              }}>장비 강화 단계 및 목표 설정</h5>
            </Card.Header>
            <Card.Body style={{
              backgroundColor: 'var(--card-bg)',
              padding: 'clamp(1rem, 2.5vw, 1.5rem)'
            }}>
              {/* 캐릭터 정보 */}
              {characterInfo && (
                <div className="mb-3">
                  <div style={{
                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                    backgroundColor: 'var(--card-body-bg-blue)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{
                        fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginRight: '1rem'
                      }}>
                        {characterInfo.name}
                      </span>
                      <span style={{
                        fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                        fontWeight: '600',
                        color: 'var(--text-secondary)'
                      }}>
                        현재 아이템 레벨: {characterInfo.itemLevel}
                      </span>
                    </div>
                    {expectedItemLevel && (
                      <div style={{
                        fontSize: 'clamp(0.85rem, 1.9vw, 1rem)',
                        fontWeight: '600',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>→</span>
                        <span>예상 도달 레벨: {expectedItemLevel}</span>
                        <Badge bg="" style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)',
                          fontWeight: '700',
                          padding: '0.25rem 0.5rem'
                        }}>
                          +{(parseFloat(expectedItemLevel) - parseFloat(characterInfo.itemLevel.replace(/,/g, ''))).toFixed(2)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Row className="g-3">
                {equipments.map((eq, index) => {
                  const targets = targetLevels[eq.name] || { normal: null, advanced: null };
                  const isNormalChanged = targets.normal !== null && targets.normal > eq.currentLevel;
                  const isAdvancedChanged = targets.advanced !== null && targets.advanced > eq.currentAdvancedLevel;
                  const isChanged = isNormalChanged || isAdvancedChanged;
                  const gradeColor = getGradeColor(eq.grade);

                  return (
                    <Col key={index} xs={12} sm={6} md={4} lg={2}>
                      <div style={{
                        padding: 'clamp(0.75rem, 2vw, 1rem)',
                        backgroundColor: 'var(--card-body-bg-blue)',
                        borderRadius: '12px',
                        border: `2px solid ${isChanged ? 'var(--brand-primary)' : gradeColor}`,
                        transition: 'all 0.25s ease',
                        boxShadow: isChanged ? `0 0 0 3px hsla(var(--brand-hue), var(--brand-saturation), var(--brand-lightness), 0.3)` : `0 0 0 1px ${gradeColor}33`
                      }}>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <span style={{
                              fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)',
                              fontWeight: '700',
                              color: 'var(--text-primary)',
                              display: 'block'
                            }}>
                              {eq.name}
                            </span>
                            <span style={{
                              fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                              fontWeight: '600',
                              color: gradeColor,
                              display: 'block',
                              marginTop: '2px'
                            }}>
                              {eq.grade}
                            </span>
                          </div>
                          <div className="d-flex flex-column gap-1 align-items-end">
                            <Badge
                              pill
                              bg=""
                              style={{
                                fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)',
                                padding: '0.3rem 0.6rem',
                                backgroundColor: eq.type === 'weapon' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: eq.type === 'weapon' ? '#ef4444' : '#3b82f6',
                                fontWeight: '700'
                              }}
                            >
                              +{eq.currentLevel}
                            </Badge>
                            {eq.currentAdvancedLevel > 0 && (
                              <Badge
                                pill
                                bg=""
                                style={{
                                  fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                  color: '#a855f7',
                                  fontWeight: '700'
                                }}
                              >
                                상급 +{eq.currentAdvancedLevel}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <InputGroup size="sm" className="mb-2">
                          <InputGroup.Text style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>일반</InputGroup.Text>
                          <Form.Select
                            value={targets.normal ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTargetLevels(prev => ({
                                ...prev,
                                [eq.name]: { ...prev[eq.name], normal: value === '' ? null : Number(value) }
                              }));
                            }}
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border-color)',
                              color: targets.normal === null ? 'var(--text-muted)' : 'var(--text-primary)',
                              fontSize: 'clamp(0.75rem, 1.7vw, 0.85rem)',
                              fontWeight: '600',
                              borderRadius: '8px',
                              padding: '0.4rem 0.6rem'
                            }}
                          >
                            <option value="">목표 선택</option>
                            {Array.from({ length: 26 - eq.currentLevel }, (_, i) => eq.currentLevel + i + 1).map(level => (
                              <option key={level} value={level}>목표 +{level}</option>
                            ))}
                          </Form.Select>
                        </InputGroup>
                        <InputGroup size="sm">
                          <InputGroup.Text style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>상급</InputGroup.Text>
                          <Form.Select
                            value={targets.advanced ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTargetLevels(prev => ({
                                ...prev,
                                [eq.name]: { ...prev[eq.name], advanced: value === '' ? null : Number(value) }
                              }));
                            }}
                            disabled={eq.currentAdvancedLevel >= 40}
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border-color)',
                              color: targets.advanced === null ? 'var(--text-muted)' : 'var(--text-primary)',
                              fontSize: 'clamp(0.75rem, 1.7vw, 0.85rem)',
                              fontWeight: '600',
                              borderRadius: '8px',
                              padding: '0.4rem 0.6rem'
                            }}
                          >
                            <option value="">목표 선택</option>
                            {[10, 20, 30, 40]
                              .filter(level => level > eq.currentAdvancedLevel)
                              .map(level => (
                                <option key={level} value={level}>목표 +{level}</option>
                              ))}
                          </Form.Select>
                        </InputGroup>
                      </div>
                    </Col>
                  );
                })}
              </Row>

              {/* 목표 설정 */}
              <div className="mt-4" style={{
                padding: 'clamp(1rem, 2.5vw, 1.25rem)',
                backgroundColor: 'var(--card-body-bg-blue)',
                borderRadius: '14px',
                border: '1px solid var(--border-color)'
              }}>
                <Row className="align-items-start">
                  <Col md={12}>
                    {/* 방어구 일괄 설정 */}
                    <div className="mb-3">
                      <div style={{
                        fontSize: 'clamp(0.8rem, 1.7vw, 0.9rem)',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.5rem',
                        fontWeight: '600'
                      }}>
                        방어구 (일반)
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {Array.from({ length: 15 }, (_, i) => i + 11).map(level => {
                          const hasArmor = equipments.some(eq => eq.type === 'armor' && eq.currentLevel < level);
                          const isSelected = selectedArmorBulkLevel.normal === level;

                          return (
                            <button
                              key={level}
                              onClick={() => {
                                // 이미 선택된 레벨을 다시 클릭하면 해제
                                if (isSelected) {
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    if (eq.type === 'armor') {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: null };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedArmorBulkLevel(prev => ({ ...prev, normal: null }));
                                } else {
                                  // 새로운 목표 설정
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    if (eq.type === 'armor' && eq.currentLevel < level) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: level };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedArmorBulkLevel(prev => ({ ...prev, normal: level }));
                                }
                              }}
                              disabled={!hasArmor}
                              style={{
                                fontSize: 'clamp(0.75rem, 1.7vw, 0.85rem)',
                                padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.8rem, 2vw, 1rem)',
                                backgroundColor: isSelected ? 'var(--brand-primary-light)' : 'var(--card-bg)',
                                border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                                borderRadius: '10px',
                                color: isSelected ? 'var(--brand-primary-dark)' : hasArmor ? 'var(--text-secondary)' : 'var(--text-disabled)',
                                fontWeight: isSelected ? '700' : '600',
                                cursor: hasArmor ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s ease',
                                opacity: hasArmor ? 1 : 0.5
                              }}
                            >
                              +{level}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* 무기 일괄 설정 */}
                    <div className="mb-3">
                      <div style={{
                        fontSize: 'clamp(0.8rem, 1.7vw, 0.9rem)',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.5rem',
                        fontWeight: '600'
                      }}>
                        무기 (일반)
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {Array.from({ length: 15 }, (_, i) => i + 11).map(level => {
                          const hasWeapon = equipments.some(eq => eq.type === 'weapon' && eq.currentLevel < level);
                          const isSelected = selectedWeaponBulkLevel.normal === level;

                          return (
                            <button
                              key={level}
                              onClick={() => {
                                // 이미 선택된 레벨을 다시 클릭하면 해제
                                if (isSelected) {
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    if (eq.type === 'weapon') {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: null };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedWeaponBulkLevel(prev => ({ ...prev, normal: null }));
                                } else {
                                  // 새로운 목표 설정
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    if (eq.type === 'weapon' && eq.currentLevel < level) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: level };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedWeaponBulkLevel(prev => ({ ...prev, normal: level }));
                                }
                              }}
                              disabled={!hasWeapon}
                              style={{
                                fontSize: 'clamp(0.75rem, 1.7vw, 0.85rem)',
                                padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.8rem, 2vw, 1rem)',
                                backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'var(--card-bg)',
                                border: `1px solid ${isSelected ? '#ef4444' : 'var(--border-color)'}`,
                                borderRadius: '10px',
                                color: isSelected ? '#ef4444' : hasWeapon ? 'var(--text-secondary)' : 'var(--text-disabled)',
                                fontWeight: isSelected ? '700' : '600',
                                cursor: hasWeapon ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s ease',
                                opacity: hasWeapon ? 1 : 0.5
                              }}
                            >
                              +{level}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 상급재련 헤더 */}
                    <div className="mb-2" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 220px 220px',
                      gap: '2rem',
                      alignItems: 'center'
                    }}>
                      <div></div>
                      <div style={{
                        fontSize: 'clamp(0.85rem, 1.8vw, 1rem)',
                        color: 'var(--text-secondary)',
                        fontWeight: '700',
                        textAlign: 'center',
                        minWidth: '100px'
                      }}>
                        일반턴
                      </div>
                      <div style={{
                        fontSize: 'clamp(0.85rem, 1.8vw, 1rem)',
                        color: 'var(--text-secondary)',
                        fontWeight: '700',
                        textAlign: 'center',
                        minWidth: '100px'
                      }}>
                        선조턴
                      </div>
                    </div>

                    {/* 방어구 상급 일괄 설정 */}
                    <div className="mb-3" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 220px 220px',
                      gap: '2rem',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{
                          fontSize: 'clamp(0.8rem, 1.7vw, 0.9rem)',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.5rem',
                          fontWeight: '600'
                        }}>
                          방어구 (상급)
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {[10, 20, 30, 40].map(level => {
                            // 모든 방어구의 최소 상급재련 단계 확인
                            const armorEquipments = equipments.filter(eq => eq.type === 'armor');
                            const hasArmor = armorEquipments.length > 0;
                            const minAdvancedLevel = hasArmor ? Math.min(...armorEquipments.map(eq => eq.currentAdvancedLevel)) : 0;
                            const canSelect = hasArmor && level > minAdvancedLevel;
                            const isSelected = selectedArmorBulkLevel.advanced === level;

                            return (
                              <button
                                key={level}
                                onClick={() => {
                                  if (!canSelect) return;

                                  // 이미 선택된 레벨을 다시 클릭하면 해제
                                  if (isSelected) {
                                    const newTargets = { ...targetLevels };
                                    equipments.forEach(eq => {
                                      if (eq.type === 'armor') {
                                        newTargets[eq.name] = { ...newTargets[eq.name], advanced: null };
                                      }
                                    });
                                    setTargetLevels(newTargets);
                                    setSelectedArmorBulkLevel(prev => ({ ...prev, advanced: null }));
                                  } else {
                                    // 새로운 목표 설정
                                    const newTargets = { ...targetLevels };
                                    equipments.forEach(eq => {
                                      if (eq.type === 'armor' && level > eq.currentAdvancedLevel) {
                                        newTargets[eq.name] = { ...newTargets[eq.name], advanced: level };
                                      }
                                    });
                                    setTargetLevels(newTargets);
                                    setSelectedArmorBulkLevel(prev => ({ ...prev, advanced: level }));
                                  }
                                }}
                                disabled={!canSelect}
                                style={{
                                  fontSize: 'clamp(0.75rem, 1.7vw, 0.85rem)',
                                  padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.8rem, 2vw, 1rem)',
                                  backgroundColor: isSelected ? 'var(--brand-primary-light)' : 'var(--card-bg)',
                                  border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                                  borderRadius: '10px',
                                  color: isSelected ? 'var(--brand-primary-dark)' : canSelect ? 'var(--text-secondary)' : 'var(--text-disabled)',
                                  fontWeight: isSelected ? '700' : '600',
                                  cursor: canSelect ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s ease',
                                  opacity: canSelect ? 1 : 0.5
                                }}
                              >
                                +{level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 일반턴 재료 - 방어구 */}
                      <div className="d-flex flex-column gap-2 align-items-center">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {/* 빙하의 숨결 - 항상 표시 */}
                          <div className="d-flex flex-column align-items-center">
                            <div style={{
                              width: '48px',
                              height: '48px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: '0.5rem',
                              backgroundColor: 'var(--card-bg)'
                            }}>
                              <Image src="/breath-glacier.png" alt="빙하의 숨결" width={40} height={40} style={{ objectFit: 'contain' }} />
                            </div>
                            <button
                              onClick={() => setAdvancedMaterialOptions(prev => ({
                                ...prev,
                                armorNormalBreath: { ...prev.armorNormalBreath, enabled: !prev.armorNormalBreath.enabled }
                              }))}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: advancedMaterialOptions.armorNormalBreath.enabled ? '#3b82f6' : '#6b7280',
                                color: advancedMaterialOptions.armorNormalBreath.enabled ? '#ffffff' : '#9ca3af',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {advancedMaterialOptions.armorNormalBreath.enabled ? '사용' : '미사용'}
                            </button>
                          </div>

                          {/* 장인의 책 표시 조건 확인 - 일반턴 */}
                          {(() => {
                            const armorEquipments = equipments.filter(eq => eq.type === 'armor');
                            if (armorEquipments.length === 0) return null;

                            const minCurrentLevel = Math.min(...armorEquipments.map(eq => eq.currentAdvancedLevel));
                            const maxTargetLevel = Math.max(...armorEquipments.map(eq => {
                              const target = targetLevels[eq.name];
                              return target?.advanced || 0;
                            }));

                            // 목표가 없으면 아무것도 표시 안 함
                            if (maxTargetLevel === 0) return null;

                            // 1단계 책: 현재 레벨이 10 미만이고, 목표가 1 이상일 때 (1~10단계 구간을 지나감)
                            const showBook1 = minCurrentLevel < 10 && maxTargetLevel >= 1;

                            // 2단계 책: 목표가 10 초과일 때 (11~20단계 구간을 지나감)
                            const showBook2 = maxTargetLevel > 10;

                            return (
                              <>
                                {/* 장인의 재봉술 1단계 */}
                                {showBook1 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div style={{
                                      width: '48px',
                                      height: '48px',
                                      border: '2px solid var(--border-color)',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginBottom: '0.5rem',
                                      backgroundColor: 'var(--card-bg)'
                                    }}>
                                      <Image src="/master-tailoring-1.png" alt="장인의 재봉술 1단계" width={40} height={40} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        armorNormalBook1: { ...prev.armorNormalBook1, enabled: !prev.armorNormalBook1.enabled }
                                      }))}
                                      style={{
                                        padding: '0.3rem 0.6rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: advancedMaterialOptions.armorNormalBook1.enabled ? '#3b82f6' : '#6b7280',
                                        color: advancedMaterialOptions.armorNormalBook1.enabled ? '#ffffff' : '#9ca3af',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {advancedMaterialOptions.armorNormalBook1.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 재봉술 2단계 */}
                                {showBook2 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '0.5rem',
                                    backgroundColor: 'var(--card-bg)'
                                  }}>
                                    <Image src="/master-tailoring-2.png" alt="장인의 재봉술 2단계" width={40} height={40} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      armorNormalBook2: { ...prev.armorNormalBook2, enabled: !prev.armorNormalBook2.enabled }
                                    }))}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      backgroundColor: advancedMaterialOptions.armorNormalBook2.enabled ? '#3b82f6' : '#6b7280',
                                      color: advancedMaterialOptions.armorNormalBook2.enabled ? '#ffffff' : '#9ca3af',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    {advancedMaterialOptions.armorNormalBook2.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 선조턴 재료 - 방어구 */}
                      <div className="d-flex flex-column gap-2 align-items-center">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {/* 빙하의 숨결 - 항상 표시 */}
                          <div className="d-flex flex-column align-items-center">
                            <div style={{
                              width: '48px',
                              height: '48px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: '0.5rem',
                              backgroundColor: 'var(--card-bg)'
                            }}>
                              <Image src="/breath-glacier.png" alt="빙하의 숨결" width={40} height={40} style={{ objectFit: 'contain' }} />
                            </div>
                            <button
                              onClick={() => setAdvancedMaterialOptions(prev => ({
                                ...prev,
                                armorBonusBreath: { ...prev.armorBonusBreath, enabled: !prev.armorBonusBreath.enabled }
                              }))}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: advancedMaterialOptions.armorBonusBreath.enabled ? '#3b82f6' : '#6b7280',
                                color: advancedMaterialOptions.armorBonusBreath.enabled ? '#ffffff' : '#9ca3af',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {advancedMaterialOptions.armorBonusBreath.enabled ? '사용' : '미사용'}
                            </button>
                          </div>

                          {/* 장인의 책 표시 조건 확인 - 선조턴 */}
                          {(() => {
                            const armorEquipments = equipments.filter(eq => eq.type === 'armor');
                            if (armorEquipments.length === 0) return null;

                            const minCurrentLevel = Math.min(...armorEquipments.map(eq => eq.currentAdvancedLevel));
                            const maxTargetLevel = Math.max(...armorEquipments.map(eq => {
                              const target = targetLevels[eq.name];
                              return target?.advanced || 0;
                            }));

                            // 목표가 없으면 아무것도 표시 안 함
                            if (maxTargetLevel === 0) return null;

                            // 1단계 책: 현재 레벨이 10 미만이고, 목표가 1 이상일 때 (1~10단계 구간을 지나감)
                            const showBook1 = minCurrentLevel < 10 && maxTargetLevel >= 1;

                            // 2단계 책: 목표가 10 초과일 때 (11~20단계 구간을 지나감)
                            const showBook2 = maxTargetLevel > 10;

                            return (
                              <>
                                {/* 장인의 재봉술 1단계 */}
                                {showBook1 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div style={{
                                      width: '48px',
                                      height: '48px',
                                      border: '2px solid var(--border-color)',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginBottom: '0.5rem',
                                      backgroundColor: 'var(--card-bg)'
                                    }}>
                                      <Image src="/master-tailoring-1.png" alt="장인의 재봉술 1단계" width={40} height={40} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        armorBonusBook1: { ...prev.armorBonusBook1, enabled: !prev.armorBonusBook1.enabled }
                                      }))}
                                      style={{
                                        padding: '0.3rem 0.6rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: advancedMaterialOptions.armorBonusBook1.enabled ? '#3b82f6' : '#6b7280',
                                        color: advancedMaterialOptions.armorBonusBook1.enabled ? '#ffffff' : '#9ca3af',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {advancedMaterialOptions.armorBonusBook1.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 재봉술 2단계 */}
                                {showBook2 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '0.5rem',
                                    backgroundColor: 'var(--card-bg)'
                                  }}>
                                    <Image src="/master-tailoring-2.png" alt="장인의 재봉술 2단계" width={40} height={40} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      armorBonusBook2: { ...prev.armorBonusBook2, enabled: !prev.armorBonusBook2.enabled }
                                    }))}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      backgroundColor: advancedMaterialOptions.armorBonusBook2.enabled ? '#3b82f6' : '#6b7280',
                                      color: advancedMaterialOptions.armorBonusBook2.enabled ? '#ffffff' : '#9ca3af',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    {advancedMaterialOptions.armorBonusBook2.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* 무기 상급 일괄 설정 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 220px 220px',
                      gap: '2rem',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{
                          fontSize: 'clamp(0.8rem, 1.7vw, 0.9rem)',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.5rem',
                          fontWeight: '600'
                        }}>
                          무기 (상급)
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {[10, 20, 30, 40].map(level => {
                            // 모든 무기의 최소 상급재련 단계 확인
                            const weaponEquipments = equipments.filter(eq => eq.type === 'weapon');
                            const hasWeapon = weaponEquipments.length > 0;
                            const minAdvancedLevel = hasWeapon ? Math.min(...weaponEquipments.map(eq => eq.currentAdvancedLevel)) : 0;
                            const canSelect = hasWeapon && level > minAdvancedLevel;
                            const isSelected = selectedWeaponBulkLevel.advanced === level;

                            return (
                              <button
                                key={level}
                                onClick={() => {
                                  if (!canSelect) return;

                                  // 이미 선택된 레벨을 다시 클릭하면 해제
                                  if (isSelected) {
                                    const newTargets = { ...targetLevels };
                                    equipments.forEach(eq => {
                                      if (eq.type === 'weapon') {
                                        newTargets[eq.name] = { ...newTargets[eq.name], advanced: null };
                                      }
                                    });
                                    setTargetLevels(newTargets);
                                    setSelectedWeaponBulkLevel(prev => ({ ...prev, advanced: null }));
                                  } else {
                                    // 새로운 목표 설정
                                    const newTargets = { ...targetLevels };
                                    equipments.forEach(eq => {
                                      if (eq.type === 'weapon' && level > eq.currentAdvancedLevel) {
                                        newTargets[eq.name] = { ...newTargets[eq.name], advanced: level };
                                      }
                                    });
                                    setTargetLevels(newTargets);
                                    setSelectedWeaponBulkLevel(prev => ({ ...prev, advanced: level }));
                                  }
                                }}
                                disabled={!canSelect}
                                style={{
                                  fontSize: 'clamp(0.75rem, 1.7vw, 0.85rem)',
                                  padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.8rem, 2vw, 1rem)',
                                  backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'var(--card-bg)',
                                  border: `1px solid ${isSelected ? '#ef4444' : 'var(--border-color)'}`,
                                  borderRadius: '10px',
                                  color: isSelected ? '#ef4444' : canSelect ? 'var(--text-secondary)' : 'var(--text-disabled)',
                                  fontWeight: isSelected ? '700' : '600',
                                  cursor: canSelect ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s ease',
                                  opacity: canSelect ? 1 : 0.5
                                }}
                              >
                                +{level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 일반턴 재료 - 무기 */}
                      <div className="d-flex flex-column gap-2 align-items-center">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {/* 용암의 숨결 - 항상 표시 */}
                          <div className="d-flex flex-column align-items-center">
                            <div style={{
                              width: '48px',
                              height: '48px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: '0.5rem',
                              backgroundColor: 'var(--card-bg)'
                            }}>
                              <Image src="/breath-lava.png" alt="용암의 숨결" width={40} height={40} style={{ objectFit: 'contain' }} />
                            </div>
                            <button
                              onClick={() => setAdvancedMaterialOptions(prev => ({
                                ...prev,
                                weaponNormalBreath: { ...prev.weaponNormalBreath, enabled: !prev.weaponNormalBreath.enabled }
                              }))}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: advancedMaterialOptions.weaponNormalBreath.enabled ? '#3b82f6' : '#6b7280',
                                color: advancedMaterialOptions.weaponNormalBreath.enabled ? '#ffffff' : '#9ca3af',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {advancedMaterialOptions.weaponNormalBreath.enabled ? '사용' : '미사용'}
                            </button>
                          </div>

                          {/* 장인의 책 표시 조건 확인 - 일반턴 무기 */}
                          {(() => {
                            const weaponEquipments = equipments.filter(eq => eq.type === 'weapon');
                            if (weaponEquipments.length === 0) return null;

                            const minCurrentLevel = Math.min(...weaponEquipments.map(eq => eq.currentAdvancedLevel));
                            const maxTargetLevel = Math.max(...weaponEquipments.map(eq => {
                              const target = targetLevels[eq.name];
                              return target?.advanced || 0;
                            }));

                            // 목표가 없으면 아무것도 표시 안 함
                            if (maxTargetLevel === 0) return null;

                            // 1단계 책: 현재 레벨이 10 미만이고, 목표가 1 이상일 때
                            const showBook1 = minCurrentLevel < 10 && maxTargetLevel >= 1;

                            // 2단계 책: 목표가 10 초과일 때
                            const showBook2 = maxTargetLevel > 10;

                            return (
                              <>
                                {/* 장인의 야금술 1단계 */}
                                {showBook1 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div style={{
                                      width: '48px',
                                      height: '48px',
                                      border: '2px solid var(--border-color)',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginBottom: '0.5rem',
                                      backgroundColor: 'var(--card-bg)'
                                    }}>
                                      <Image src="/master-metallurgy-1.png" alt="장인의 야금술 1단계" width={40} height={40} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        weaponNormalBook1: { ...prev.weaponNormalBook1, enabled: !prev.weaponNormalBook1.enabled }
                                      }))}
                                      style={{
                                        padding: '0.3rem 0.6rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: advancedMaterialOptions.weaponNormalBook1.enabled ? '#3b82f6' : '#6b7280',
                                        color: advancedMaterialOptions.weaponNormalBook1.enabled ? '#ffffff' : '#9ca3af',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {advancedMaterialOptions.weaponNormalBook1.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 야금술 2단계 */}
                                {showBook2 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '0.5rem',
                                    backgroundColor: 'var(--card-bg)'
                                  }}>
                                    <Image src="/master-metallurgy-2.png" alt="장인의 야금술 2단계" width={40} height={40} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      weaponNormalBook2: { ...prev.weaponNormalBook2, enabled: !prev.weaponNormalBook2.enabled }
                                    }))}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      backgroundColor: advancedMaterialOptions.weaponNormalBook2.enabled ? '#3b82f6' : '#6b7280',
                                      color: advancedMaterialOptions.weaponNormalBook2.enabled ? '#ffffff' : '#9ca3af',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    {advancedMaterialOptions.weaponNormalBook2.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 선조턴 재료 - 무기 */}
                      <div className="d-flex flex-column gap-2 align-items-center">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {/* 용암의 숨결 - 항상 표시 */}
                          <div className="d-flex flex-column align-items-center">
                            <div style={{
                              width: '48px',
                              height: '48px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: '0.5rem',
                              backgroundColor: 'var(--card-bg)'
                            }}>
                              <Image src="/breath-lava.png" alt="용암의 숨결" width={40} height={40} style={{ objectFit: 'contain' }} />
                            </div>
                            <button
                              onClick={() => setAdvancedMaterialOptions(prev => ({
                                ...prev,
                                weaponBonusBreath: { ...prev.weaponBonusBreath, enabled: !prev.weaponBonusBreath.enabled }
                              }))}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: advancedMaterialOptions.weaponBonusBreath.enabled ? '#3b82f6' : '#6b7280',
                                color: advancedMaterialOptions.weaponBonusBreath.enabled ? '#ffffff' : '#9ca3af',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {advancedMaterialOptions.weaponBonusBreath.enabled ? '사용' : '미사용'}
                            </button>
                          </div>

                          {/* 장인의 책 표시 조건 확인 - 선조턴 무기 */}
                          {(() => {
                            const weaponEquipments = equipments.filter(eq => eq.type === 'weapon');
                            if (weaponEquipments.length === 0) return null;

                            const minCurrentLevel = Math.min(...weaponEquipments.map(eq => eq.currentAdvancedLevel));
                            const maxTargetLevel = Math.max(...weaponEquipments.map(eq => {
                              const target = targetLevels[eq.name];
                              return target?.advanced || 0;
                            }));

                            // 목표가 없으면 아무것도 표시 안 함
                            if (maxTargetLevel === 0) return null;

                            // 1단계 책: 현재 레벨이 10 미만이고, 목표가 1 이상일 때
                            const showBook1 = minCurrentLevel < 10 && maxTargetLevel >= 1;

                            // 2단계 책: 목표가 10 초과일 때
                            const showBook2 = maxTargetLevel > 10;

                            return (
                              <>
                                {/* 장인의 야금술 1단계 */}
                                {showBook1 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div style={{
                                      width: '48px',
                                      height: '48px',
                                      border: '2px solid var(--border-color)',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginBottom: '0.5rem',
                                      backgroundColor: 'var(--card-bg)'
                                    }}>
                                      <Image src="/master-metallurgy-1.png" alt="장인의 야금술 1단계" width={40} height={40} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        weaponBonusBook1: { ...prev.weaponBonusBook1, enabled: !prev.weaponBonusBook1.enabled }
                                      }))}
                                      style={{
                                        padding: '0.3rem 0.6rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: advancedMaterialOptions.weaponBonusBook1.enabled ? '#3b82f6' : '#6b7280',
                                        color: advancedMaterialOptions.weaponBonusBook1.enabled ? '#ffffff' : '#9ca3af',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {advancedMaterialOptions.weaponBonusBook1.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 야금술 2단계 */}
                                {showBook2 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div style={{
                                      width: '48px',
                                      height: '48px',
                                      border: '2px solid var(--border-color)',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginBottom: '0.5rem',
                                      backgroundColor: 'var(--card-bg)'
                                    }}>
                                      <Image src="/master-metallurgy-2.png" alt="장인의 야금술 2단계" width={40} height={40} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        weaponBonusBook2: { ...prev.weaponBonusBook2, enabled: !prev.weaponBonusBook2.enabled }
                                      }))}
                                      style={{
                                        padding: '0.3rem 0.6rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: advancedMaterialOptions.weaponBonusBook2.enabled ? '#3b82f6' : '#6b7280',
                                        color: advancedMaterialOptions.weaponBonusBook2.enabled ? '#ffffff' : '#9ca3af',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {advancedMaterialOptions.weaponBonusBook2.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </Col>

                </Row>
              </div>
            </Card.Body>
          </Card>

          {/* 재료 소모량 표시 */}
          {materials && (
            <Card style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <Card.Header style={{
                background: 'var(--card-body-bg-blue)',
                borderBottom: '1px solid var(--border-color)',
                padding: 'clamp(1rem, 2vw, 1.25rem)'
              }}>
                <h5 className="mb-0" style={{
                  color: 'var(--text-primary)',
                  fontWeight: '700',
                  fontSize: 'clamp(1.1rem, 2.2vw, 1.25rem)',
                  letterSpacing: '-0.02em'
                }}>
                  예상 소모 재료
                </h5>
              </Card.Header>
              <Card.Body style={{
                backgroundColor: 'var(--card-bg)',
                padding: 'clamp(1rem, 2.5vw, 1.5rem)'
              }}>
                {(() => {
                  const requiredMats = analyzeRequiredMaterials();

                  return (
                    <>
                      {/* 1줄: 기본 재료 - 5개 */}
                      <div className="mb-4">
                        <Row className="g-3 justify-content-center">
                          {requiredMats.needsArmor && (
                            <Col xs={6} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-guardian-stone.png" name="수호석" amount={materials.수호석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['수호석']} onBoundChange={handleBoundChange} cost={results.materialCosts['수호석']} />
                            </Col>
                          )}
                          {requiredMats.needsWeapon && (
                            <Col xs={6} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-destruction-stone.png" name="파괴석" amount={materials.파괴석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['파괴석']} onBoundChange={handleBoundChange} cost={results.materialCosts['파괴석']} />
                            </Col>
                          )}
                          <Col xs={6} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                            <MaterialCard icon="/destiny-breakthrough-stone.png" name="돌파석" amount={materials.돌파석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['돌파석']} onBoundChange={handleBoundChange} cost={results.materialCosts['돌파석']} />
                          </Col>
                          <Col xs={6} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                            <MaterialCard icon="/destiny-shard-bag-large.png" name="파편" amount={materials.운명파편} color="#818cf8" showCheckbox={true} isBound={boundMaterials['운명파편']} onBoundChange={handleBoundChange} cost={results.materialCosts['운명파편']} />
                          </Col>
                          <Col xs={6} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                            <MaterialCard icon="/abidos-fusion.png" name="아비도스" amount={materials.아비도스} color="#818cf8" showCheckbox={true} isBound={boundMaterials['아비도스']} onBoundChange={handleBoundChange} cost={results.materialCosts['아비도스']} />
                          </Col>
                        </Row>
                      </div>

                      {/* 일반 재련 추가 재료 */}
                      {requiredMats.hasNormalRefining && (requiredMats.needsGlacierNormal || requiredMats.needsLavaNormal) && (
                        <div className="mb-4">
                  <div style={{
                    fontSize: 'clamp(0.9rem, 1.8vw, 1rem)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                    fontWeight: '700',
                    letterSpacing: '-0.01em'
                  }}>
                    일반 재련 추가 재료
                  </div>
                          {/* 2줄: 빙하의 숨결 + 책 3종 - 4개 */}
                          {requiredMats.needsGlacierNormal && (
                            <Row className="g-3 justify-content-center mb-3">
                              <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-glacier.png"
                                  name="빙하의 숨결"
                                  amount={materials.빙하}
                                  color="#34d399"
                                  cost={results.materialCosts['빙하']}
                                  showEnableToggle={true}
                                  isEnabled={materialOptions.glacierBreath.enabled}
                                  onToggleEnabled={() => setMaterialOptions(p => ({...p, glacierBreath: {...p.glacierBreath, enabled: !p.glacierBreath.enabled}}))}
                                  showCheckbox={true}
                                  isBound={materialOptions.glacierBreath.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, glacierBreath: {...p.glacierBreath, isBound: !p.glacierBreath.isBound}}))}
                                />
                              </Col>
                              {requiredMats.needsArmorBook1014 && (
                                <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-karma.png"
                                    name="재봉술: 업화(10~14) 방어구"
                                    amount={materials.방어구책}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책']}
                                    showEnableToggle={true}
                                    isEnabled={materialOptions.tailoring.enabled}
                                    onToggleEnabled={() => setMaterialOptions(p => ({...p, tailoring: {...p.tailoring, enabled: !p.tailoring.enabled}}))}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring: {...p.tailoring, isBound: !p.tailoring.isBound}}))}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsArmorBook1518 && (
                                <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-karma.png"
                                    name="재봉술: 업화(15~18) 방어구"
                                    amount={materials.방어구책}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책']}
                                    showEnableToggle={true}
                                    isEnabled={materialOptions.tailoring1518.enabled}
                                    onToggleEnabled={() => setMaterialOptions(p => ({...p, tailoring1518: {...p.tailoring1518, enabled: !p.tailoring1518.enabled}}))}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring1518.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring1518: {...p.tailoring1518, isBound: !p.tailoring1518.isBound}}))}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsArmorBook1920 && (
                                <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-karma.png"
                                    name="재봉술: 업화(19~20) 방어구"
                                    amount={materials.방어구책}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책']}
                                    showEnableToggle={true}
                                    isEnabled={materialOptions.tailoring1920.enabled}
                                    onToggleEnabled={() => setMaterialOptions(p => ({...p, tailoring1920: {...p.tailoring1920, enabled: !p.tailoring1920.enabled}}))}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring1920.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring1920: {...p.tailoring1920, isBound: !p.tailoring1920.isBound}}))}
                                  />
                                </Col>
                              )}
                            </Row>
                          )}
                          {/* 3줄: 용암의 숨결 + 책 3종 - 4개 */}
                          {requiredMats.needsLavaNormal && (
                            <Row className="g-3 justify-content-center">
                              <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-lava.png"
                                  name="용암의 숨결"
                                  amount={materials.용암}
                                  color="#34d399"
                                  cost={results.materialCosts['용암']}
                                  showEnableToggle={true}
                                  isEnabled={materialOptions.lavaBreath.enabled}
                                  onToggleEnabled={() => setMaterialOptions(p => ({...p, lavaBreath: {...p.lavaBreath, enabled: !p.lavaBreath.enabled}}))}
                                  showCheckbox={true}
                                  isBound={materialOptions.lavaBreath.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, lavaBreath: {...p.lavaBreath, isBound: !p.lavaBreath.isBound}}))}
                                />
                              </Col>
                              {requiredMats.needsWeaponBook1014 && (
                                <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-karma.png"
                                    name="야금술: 업화(10~14) 무기"
                                    amount={materials.무기책}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책']}
                                    showEnableToggle={true}
                                    isEnabled={materialOptions.metallurgy.enabled}
                                    onToggleEnabled={() => setMaterialOptions(p => ({...p, metallurgy: {...p.metallurgy, enabled: !p.metallurgy.enabled}}))}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy: {...p.metallurgy, isBound: !p.metallurgy.isBound}}))}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsWeaponBook1518 && (
                                <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-karma.png"
                                    name="야금술: 업화(15~18) 무기"
                                    amount={materials.무기책}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책']}
                                    showEnableToggle={true}
                                    isEnabled={materialOptions.metallurgy1518.enabled}
                                    onToggleEnabled={() => setMaterialOptions(p => ({...p, metallurgy1518: {...p.metallurgy1518, enabled: !p.metallurgy1518.enabled}}))}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy1518.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy1518: {...p.metallurgy1518, isBound: !p.metallurgy1518.isBound}}))}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsWeaponBook1920 && (
                                <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-karma.png"
                                    name="야금술: 업화(19~20) 무기"
                                    amount={materials.무기책}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책']}
                                    showEnableToggle={true}
                                    isEnabled={materialOptions.metallurgy1920.enabled}
                                    onToggleEnabled={() => setMaterialOptions(p => ({...p, metallurgy1920: {...p.metallurgy1920, enabled: !p.metallurgy1920.enabled}}))}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy1920.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy1920: {...p.metallurgy1920, isBound: !p.metallurgy1920.isBound}}))}
                                  />
                                </Col>
                              )}
                            </Row>
                          )}
                        </div>
                      )}

                      {/* 상급 재련 추가 재료 */}
                      {(requiredMats.needsAdvancedArmorBook1 || requiredMats.needsAdvancedArmorBook2 || requiredMats.needsAdvancedWeaponBook1 || requiredMats.needsAdvancedWeaponBook2) && (
                        <div className="mb-4">
                          <div style={{
                            fontSize: 'clamp(0.9rem, 1.8vw, 1rem)',
                            color: 'var(--text-secondary)',
                            marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                            fontWeight: '700',
                            letterSpacing: '-0.01em'
                          }}>
                            상급 재련 추가 재료
                          </div>
                          {/* 4줄: 빙하의 숨결 + 장인의 재봉술 1,2단계 - 3개 */}
                          {(requiredMats.needsAdvancedArmorBook1 || requiredMats.needsAdvancedArmorBook2) && (
                            <Row className="g-3 justify-content-center mb-3">
                              <Col xs={6} sm={4} md={4} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-glacier.png"
                                  name="빙하의 숨결"
                                  amount={materials.빙하}
                                  color="#a855f7"
                                  cost={results.materialCosts['빙하']}
                                  showEnableToggle={true}
                                  isEnabled={advancedMaterialOptions.armorNormalBreath.enabled || advancedMaterialOptions.armorBonusBreath.enabled}
                                  onToggleEnabled={() => {}}
                                  showCheckbox={true}
                                  isBound={advancedMaterialOptions.armorNormalBreath.isBound && advancedMaterialOptions.armorBonusBreath.isBound}
                                  onBoundChange={() => {
                                    const newBound = !(advancedMaterialOptions.armorNormalBreath.isBound && advancedMaterialOptions.armorBonusBreath.isBound);
                                    setAdvancedMaterialOptions(p => ({
                                      ...p,
                                      armorNormalBreath: {...p.armorNormalBreath, isBound: newBound},
                                      armorBonusBreath: {...p.armorBonusBreath, isBound: newBound}
                                    }));
                                  }}
                                />
                              </Col>
                              {requiredMats.needsAdvancedArmorBook1 && (
                                <Col xs={6} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-tailoring-1.png"
                                    name="장인의 재봉술 1단계"
                                    amount={materials.재봉술1단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['재봉술1단'] || 0}
                                    showEnableToggle={true}
                                    isEnabled={advancedMaterialOptions.armorNormalBook1.enabled || advancedMaterialOptions.armorBonusBook1.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={advancedMaterialOptions.armorNormalBook1.isBound && advancedMaterialOptions.armorBonusBook1.isBound}
                                    onBoundChange={() => {
                                      const newBound = !(advancedMaterialOptions.armorNormalBook1.isBound && advancedMaterialOptions.armorBonusBook1.isBound);
                                      setAdvancedMaterialOptions(p => ({
                                        ...p,
                                        armorNormalBook1: {...p.armorNormalBook1, isBound: newBound},
                                        armorBonusBook1: {...p.armorBonusBook1, isBound: newBound}
                                      }));
                                    }}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsAdvancedArmorBook2 && (
                                <Col xs={6} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-tailoring-2.png"
                                    name="장인의 재봉술 2단계"
                                    amount={materials.재봉술2단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['재봉술2단'] || 0}
                                    showEnableToggle={true}
                                    isEnabled={advancedMaterialOptions.armorNormalBook2.enabled || advancedMaterialOptions.armorBonusBook2.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={advancedMaterialOptions.armorNormalBook2.isBound && advancedMaterialOptions.armorBonusBook2.isBound}
                                    onBoundChange={() => {
                                      const newBound = !(advancedMaterialOptions.armorNormalBook2.isBound && advancedMaterialOptions.armorBonusBook2.isBound);
                                      setAdvancedMaterialOptions(p => ({
                                        ...p,
                                        armorNormalBook2: {...p.armorNormalBook2, isBound: newBound},
                                        armorBonusBook2: {...p.armorBonusBook2, isBound: newBound}
                                      }));
                                    }}
                                  />
                                </Col>
                              )}
                            </Row>
                          )}
                          {/* 5줄: 용암의 숨결 + 장인의 야금술 1,2단계 - 3개 */}
                          {(requiredMats.needsAdvancedWeaponBook1 || requiredMats.needsAdvancedWeaponBook2) && (
                            <Row className="g-3 justify-content-center">
                              <Col xs={6} sm={4} md={4} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-lava.png"
                                  name="용암의 숨결"
                                  amount={materials.용암}
                                  color="#a855f7"
                                  cost={results.materialCosts['용암']}
                                  showEnableToggle={true}
                                  isEnabled={advancedMaterialOptions.weaponNormalBreath.enabled || advancedMaterialOptions.weaponBonusBreath.enabled}
                                  onToggleEnabled={() => {}}
                                  showCheckbox={true}
                                  isBound={advancedMaterialOptions.weaponNormalBreath.isBound && advancedMaterialOptions.weaponBonusBreath.isBound}
                                  onBoundChange={() => {
                                    const newBound = !(advancedMaterialOptions.weaponNormalBreath.isBound && advancedMaterialOptions.weaponBonusBreath.isBound);
                                    setAdvancedMaterialOptions(p => ({
                                      ...p,
                                      weaponNormalBreath: {...p.weaponNormalBreath, isBound: newBound},
                                      weaponBonusBreath: {...p.weaponBonusBreath, isBound: newBound}
                                    }));
                                  }}
                                />
                              </Col>
                              {requiredMats.needsAdvancedWeaponBook1 && (
                                <Col xs={6} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-metallurgy-1.png"
                                    name="장인의 야금술 1단계"
                                    amount={materials.야금술1단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['야금술1단'] || 0}
                                    showEnableToggle={true}
                                    isEnabled={advancedMaterialOptions.weaponNormalBook1.enabled || advancedMaterialOptions.weaponBonusBook1.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={advancedMaterialOptions.weaponNormalBook1.isBound && advancedMaterialOptions.weaponBonusBook1.isBound}
                                    onBoundChange={() => {
                                      const newBound = !(advancedMaterialOptions.weaponNormalBook1.isBound && advancedMaterialOptions.weaponBonusBook1.isBound);
                                      setAdvancedMaterialOptions(p => ({
                                        ...p,
                                        weaponNormalBook1: {...p.weaponNormalBook1, isBound: newBound},
                                        weaponBonusBook1: {...p.weaponBonusBook1, isBound: newBound}
                                      }));
                                    }}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsAdvancedWeaponBook2 && (
                                <Col xs={6} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-metallurgy-2.png"
                                    name="장인의 야금술 2단계"
                                    amount={materials.야금술2단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['야금술2단'] || 0}
                                    showEnableToggle={true}
                                    isEnabled={advancedMaterialOptions.weaponNormalBook2.enabled || advancedMaterialOptions.weaponBonusBook2.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={advancedMaterialOptions.weaponNormalBook2.isBound && advancedMaterialOptions.weaponBonusBook2.isBound}
                                    onBoundChange={() => {
                                      const newBound = !(advancedMaterialOptions.weaponNormalBook2.isBound && advancedMaterialOptions.weaponBonusBook2.isBound);
                                      setAdvancedMaterialOptions(p => ({
                                        ...p,
                                        weaponNormalBook2: {...p.weaponNormalBook2, isBound: newBound},
                                        weaponBonusBook2: {...p.weaponBonusBook2, isBound: newBound}
                                      }));
                                    }}
                                  />
                                </Col>
                              )}
                            </Row>
                          )}
                        </div>
                      )}

                      {/* 6줄: 누적 골드 + 총 소모 골드 - 2개 */}
                      <div className="mb-4">
                        <Row className="g-3 justify-content-center">
                          <Col xs={6} sm={6} md={6} style={{ minWidth: '0' }}>
                            <MaterialCard icon="/gold.jpg" name="누적 골드" amount={materials.누골} color="#f59e0b" />
                          </Col>
                          <Col xs={6} sm={6} md={6} style={{ minWidth: '0' }}>
                            <MaterialCard
                              icon="/gold.jpg"
                              name="총 소모 골드"
                              amount={results.totalGold}
                              color="#f59e0b"
                              style={{
                                backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                                borderColor: theme === 'dark' ? '#f59e0b' : '#fde68a',
                                boxShadow: theme === 'dark' ? '0 0 20px rgba(245, 158, 11, 0.2)' : '0 4px 15px rgba(251, 191, 36, 0.2)',
                                padding: 'clamp(1rem, 2vw, 1.5rem)'
                              }}
                            />
                          </Col>
                        </Row>
                      </div>

                      {/* 안내 메시지 */}
                      <div style={{
                        padding: 'clamp(0.75rem, 2vw, 1rem)',
                        backgroundColor: 'var(--card-body-bg-blue)',
                        borderRadius: '12px',
                        borderLeft: `4px solid var(--brand-primary)`,
                        display: 'flex',
                        alignItems: 'start',
                        gap: 'clamp(0.5rem, 1.5vw, 0.75rem)'
                      }}>
                        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', flexShrink: 0 }}></span>
                        <small style={{
                          color: 'var(--text-secondary)',
                          fontSize: 'clamp(0.75rem, 1.7vw, 0.85rem)',
                          lineHeight: '1.5',
                          fontWeight: '500'
                        }}>
                          이 계산은 평균 확률과 장인의 기운 시스템을 반영한 예상 수치입니다. 실제 소모량은 확률에 따라 다를 수 있습니다.
                        </small>
                      </div>
                    </>
                  );
                })()}
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
