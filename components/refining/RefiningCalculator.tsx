'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, Button, InputGroup, Row, Col, Card, Badge, ButtonGroup } from 'react-bootstrap';
import { useSearchHistory } from '@/lib/useSearchHistory';
import Image from 'next/image';
import { useTheme } from '../ThemeProvider';
import { getAverageTries, getSuccessionAverageTries } from '../../lib/refiningSimulationData';
import styles from './RefiningCalculator.module.css';
import {
  BASE_PROBABILITY,
  SUCCESSION_BASE_PROBABILITY,
  ARMOR_MATERIAL_COSTS,
  WEAPON_MATERIAL_COSTS,
  SUCCESSION_ARMOR_MATERIAL_COSTS,
  SUCCESSION_WEAPON_MATERIAL_COSTS,
  getBreathEffect,
  JANGIN_ACCUMULATE_DIVIDER
} from '../../lib/refiningData';
import { MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';
import {
  calculateAdvancedRefiningMaterials,
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
  빙하: number; // 빙하의 숨결 (방어구) - 전체
  용암: number; // 용암의 숨결 (무기) - 전체
  빙하_일반: number; // 빙하의 숨결 (일반 재련용)
  용암_일반: number; // 용암의 숨결 (일반 재련용)
  빙하_상급: number; // 빙하의 숨결 (상급 재련용)
  용암_상급: number; // 용암의 숨결 (상급 재련용)
  방어구책1114?: number; // 재봉술 : 업화 [11-14]
  방어구책1518?: number; // 재봉술 : 업화 [15-18]
  방어구책1920?: number; // 재봉술 : 업화 [19-20]
  무기책1114?: number; // 야금술 : 업화 [11-14]
  무기책1518?: number; // 야금술 : 업화 [15-18]
  무기책1920?: number; // 야금술 : 업화 [19-20]
  재봉술1단?: number; // 장인의 재봉술 1단계 (상급 1~10)
  재봉술2단?: number; // 장인의 재봉술 2단계 (상급 11~20)
  재봉술3단?: number; // 장인의 재봉술 3단계 (상급 21~30)
  재봉술4단?: number; // 장인의 재봉술 4단계 (상급 31~40)
  야금술1단?: number; // 장인의 야금술 1단계 (상급 1~10)
  야금술2단?: number; // 장인의 야금술 2단계 (상급 11~20)
  야금술3단?: number; // 장인의 야금술 3단계 (상급 21~30)
  야금술4단?: number; // 장인의 야금술 4단계 (상급 31~40)
  // 계승 재료
  수호석결정?: number; // 운명의 수호석 결정 (계승 방어구)
  파괴석결정?: number; // 운명의 파괴석 결정 (계승 무기)
  위대한돌파석?: number; // 위대한 명예의 돌파석 (계승)
  상급아비도스?: number; // 상급 아비도스 융화 재료 (계승)
  실링?: number; // 실링 (계승 귀속 재화)
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
    className={`${styles.materialCard} ${isBound ? styles.materialCardBound : ''} ${showCheckbox ? styles.materialCardClickable : ''} ${showEnableToggle && !isEnabled ? styles.materialCardDisabled : ''} ${showEnableToggle && isEnabled ? styles.materialCardEnabled : ''}`}
    onClick={() => {
      if (showCheckbox && !(showEnableToggle && !isEnabled)) {
        onBoundChange?.(name, !isBound);
      }
    }}
    style={{
      '--hover-color': color,
      ...customStyle,
    } as React.CSSProperties}
  >
    {showEnableToggle && (
       <Form.Check
        type="switch"
        id={`enable-switch-${name}`}
        checked={isEnabled}
        onChange={onToggleEnabled}
        className={`${styles.materialCardEnableSwitch} refining-checkbox`}
        onClick={(e) => e.stopPropagation()}
      />
    )}
    {showCheckbox && (
      <div className={`${styles.materialCardBoundLabel} ${!isBound ? styles.materialCardBoundLabelUnbound : ''}`}>
        귀속
      </div>
    )}
    <div className={styles.materialIcon}>
      {icon.startsWith('/') ? (
        <Image
          src={icon}
          alt={name}
          fill
          style={{ objectFit: 'contain' }}
        />
      ) : (
        <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{icon}</span>
      )}
    </div>
    <div className={styles.materialName}>
      {name}
    </div>
    <div className={`${styles.materialAmount} ${amount === 0 ? styles.materialAmountZero : ''}`} style={{ color: amount === 0 ? undefined : color }}>
      {amount.toLocaleString()}
    </div>
    {cost !== undefined && (
      <div className={styles.materialCost}>
        <Image src="/gold.webp" alt="gold" width={10} height={10} style={{ marginRight: '2px' }} />
        {Math.round(isBound ? 0 : cost).toLocaleString()}
      </div>
    )}
  </div>
);

type RefiningMode = 'normal' | 'succession';

type RefiningCalculatorProps = {
  mode?: RefiningMode;
};

export default function RefiningCalculator({ mode = 'normal' }: RefiningCalculatorProps) {
  const { theme } = useTheme();
  const isSuccessionMode = mode === 'succession';
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searched, setSearched] = useState(false);
  const [characterInfo, setCharacterInfo] = useState<{ name: string; itemLevel: string; image?: string } | null>(null);

  // 자동완성 관련 상태
  const { history, addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 부위별 목표 레벨 설정 (일반 강화 + 상급 재련 분리)
  const [targetLevels, setTargetLevels] = useState<Record<string, { normal: number | null, advanced: number | null }>>({});

  // 추가 재료 옵션 (일반 강화용)
  const [materialOptions, setMaterialOptions] = useState({
    glacierBreath: { enabled: false, isBound: false },
    lavaBreath: { enabled: false, isBound: false },
    tailoring: { enabled: false, isBound: false },        // 재봉술 11~14
    tailoring1518: { enabled: false, isBound: false },    // 재봉술 15~18
    tailoring1920: { enabled: false, isBound: false },    // 재봉술 19~20
    metallurgy: { enabled: false, isBound: false },       // 야금술 11~14
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
    armorNormalBook3: { enabled: false, isBound: false },   // 방어구 일반턴 책 3단계
    armorBonusBook3: { enabled: false, isBound: false },    // 방어구 선조턴 책 3단계
    armorNormalBook4: { enabled: false, isBound: false },   // 방어구 일반턴 책 4단계
    armorBonusBook4: { enabled: false, isBound: false },    // 방어구 선조턴 책 4단계
    // 무기 (용암)
    weaponNormalBreath: { enabled: false, isBound: false }, // 무기 일반턴 용암
    weaponBonusBreath: { enabled: false, isBound: false },  // 무기 선조턴 용암
    weaponNormalBook1: { enabled: false, isBound: false },  // 무기 일반턴 책 1단계
    weaponBonusBook1: { enabled: false, isBound: false },   // 무기 선조턴 책 1단계
    weaponNormalBook2: { enabled: false, isBound: false },  // 무기 일반턴 책 2단계
    weaponBonusBook2: { enabled: false, isBound: false },   // 무기 선조턴 책 2단계
    weaponNormalBook3: { enabled: false, isBound: false },  // 무기 일반턴 책 3단계
    weaponBonusBook3: { enabled: false, isBound: false },   // 무기 선조턴 책 3단계
    weaponNormalBook4: { enabled: false, isBound: false },  // 무기 일반턴 책 4단계
    weaponBonusBook4: { enabled: false, isBound: false },   // 무기 선조턴 책 4단계
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
    '66112552': 0, // 재봉술 책 15-18
    '66112551': 0, // 야금술 책 15-18
    '66112546': 0, // 재봉술 책 11-14
    '66112543': 0, // 야금술 책 11-14
    '66112712': 0, // 재봉술 1단계 (상급 1~10)
    '66112714': 0, // 재봉술 2단계 (상급 11~20)
    '66112711': 0, // 야금술 1단계 (상급 1~10)
    '66112713': 0, // 야금술 2단계 (상급 11~20)
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

    // 개별 재료 비용 계산 (marketPrices는 이미 개당 가격으로 변환됨)
    costs['수호석'] = materials.수호석 * (marketPrices['66102106'] || 0);
    costs['파괴석'] = materials.파괴석 * (marketPrices['66102006'] || 0);
    costs['돌파석'] = materials.돌파석 * (marketPrices['66110225'] || 0);
    costs['아비도스'] = materials.아비도스 * (marketPrices['6861012'] || 0);
    costs['운명파편'] = materials.운명파편 * (marketPrices['66130143'] || 0);

    // 계승 재료 비용 계산
    costs['수호석결정'] = (materials.수호석결정 || 0) * (marketPrices['66102107'] || 0);
    costs['파괴석결정'] = (materials.파괴석결정 || 0) * (marketPrices['66102007'] || 0);
    costs['위대한돌파석'] = (materials.위대한돌파석 || 0) * (marketPrices['66110226'] || 0);
    costs['상급아비도스'] = (materials.상급아비도스 || 0) * (marketPrices['6861013'] || 0);
    costs['빙하'] = materials.빙하 * (marketPrices['66111132'] || 0);
    costs['용암'] = materials.용암 * (marketPrices['66111131'] || 0);
    costs['빙하_일반'] = materials.빙하_일반 * (marketPrices['66111132'] || 0);
    costs['용암_일반'] = materials.용암_일반 * (marketPrices['66111131'] || 0);
    costs['빙하_상급'] = materials.빙하_상급 * (marketPrices['66111132'] || 0);
    costs['용암_상급'] = materials.용암_상급 * (marketPrices['66111131'] || 0);

    // 일반 재련 책 비용 (단계별)
    costs['방어구책1114'] = (materials.방어구책1114 || 0) * (marketPrices['66112546'] || 0);  // 재봉술 [11-14]
    costs['방어구책1518'] = (materials.방어구책1518 || 0) * (marketPrices['66112552'] || 0);  // 재봉술 [15-18]
    costs['방어구책1920'] = (materials.방어구책1920 || 0) * (marketPrices['66112554'] || 0);  // 재봉술 [19-20]
    costs['무기책1114'] = (materials.무기책1114 || 0) * (marketPrices['66112543'] || 0);  // 야금술 [11-14]
    costs['무기책1518'] = (materials.무기책1518 || 0) * (marketPrices['66112551'] || 0);  // 야금술 [15-18]
    costs['무기책1920'] = (materials.무기책1920 || 0) * (marketPrices['66112553'] || 0);  // 야금술 [19-20]

    // 상급 재련 책 비용 (1단, 2단, 3단, 4단)
    costs['재봉술1단'] = (materials.재봉술1단 || 0) * (marketPrices['66112712'] || 0);
    costs['재봉술2단'] = (materials.재봉술2단 || 0) * (marketPrices['66112714'] || 0);
    costs['재봉술3단'] = (materials.재봉술3단 || 0) * (marketPrices['66112716'] || 0);
    costs['재봉술4단'] = (materials.재봉술4단 || 0) * (marketPrices['66112718'] || 0);
    costs['야금술1단'] = (materials.야금술1단 || 0) * (marketPrices['66112711'] || 0);
    costs['야금술2단'] = (materials.야금술2단 || 0) * (marketPrices['66112713'] || 0);
    costs['야금술3단'] = (materials.야금술3단 || 0) * (marketPrices['66112715'] || 0);
    costs['야금술4단'] = (materials.야금술4단 || 0) * (marketPrices['66112717'] || 0);

    // 귀속 재료를 제외한 총 재료비 계산
    if (!boundMaterials['수호석']) totalMaterialCost += costs['수호석'];
    if (!boundMaterials['파괴석']) totalMaterialCost += costs['파괴석'];
    if (!boundMaterials['돌파석']) totalMaterialCost += costs['돌파석'];
    if (!boundMaterials['아비도스']) totalMaterialCost += costs['아비도스'];
    if (!boundMaterials['운명파편']) totalMaterialCost += costs['운명파편'];

    // 계승 재료 비용 추가
    if (!boundMaterials['수호석결정']) totalMaterialCost += costs['수호석결정'] || 0;
    if (!boundMaterials['파괴석결정']) totalMaterialCost += costs['파괴석결정'] || 0;
    if (!boundMaterials['위대한돌파석']) totalMaterialCost += costs['위대한돌파석'] || 0;
    if (!boundMaterials['상급아비도스']) totalMaterialCost += costs['상급아비도스'] || 0;

    // 추가 재료 비용 계산 (일반 강화 + 상급재련) - 분리된 비용 적용
    // 일반 재련 빙하 숨결
    if (materialOptions.glacierBreath.enabled && !materialOptions.glacierBreath.isBound) {
      totalMaterialCost += costs['빙하_일반'];
    }

    // 상급 재련 빙하 숨결 (일반턴/보너스턴)
    const usingAdvancedGlacier = advancedMaterialOptions.armorNormalBreath.enabled ||
                                  advancedMaterialOptions.armorBonusBreath.enabled;
    const allAdvancedGlacierBound =
      (!advancedMaterialOptions.armorNormalBreath.enabled || advancedMaterialOptions.armorNormalBreath.isBound) &&
      (!advancedMaterialOptions.armorBonusBreath.enabled || advancedMaterialOptions.armorBonusBreath.isBound);

    if (usingAdvancedGlacier && !allAdvancedGlacierBound) {
      totalMaterialCost += costs['빙하_상급'];
    }

    // 일반 재련 용암 숨결
    if (materialOptions.lavaBreath.enabled && !materialOptions.lavaBreath.isBound) {
      totalMaterialCost += costs['용암_일반'];
    }

    // 상급 재련 용암 숨결 (일반턴/보너스턴)
    const usingAdvancedLava = advancedMaterialOptions.weaponNormalBreath.enabled ||
                              advancedMaterialOptions.weaponBonusBreath.enabled;
    const allAdvancedLavaBound =
      (!advancedMaterialOptions.weaponNormalBreath.enabled || advancedMaterialOptions.weaponNormalBreath.isBound) &&
      (!advancedMaterialOptions.weaponBonusBreath.enabled || advancedMaterialOptions.weaponBonusBreath.isBound);

    if (usingAdvancedLava && !allAdvancedLavaBound) {
      totalMaterialCost += costs['용암_상급'];
    }

    // 일반 재련 책 비용 추가 (단계별)
    if (materialOptions.tailoring.enabled && !materialOptions.tailoring.isBound) {
      totalMaterialCost += costs['방어구책1114'] || 0;
    }
    if (materialOptions.tailoring1518.enabled && !materialOptions.tailoring1518.isBound) {
      totalMaterialCost += costs['방어구책1518'] || 0;
    }
    if (materialOptions.tailoring1920.enabled && !materialOptions.tailoring1920.isBound) {
      totalMaterialCost += costs['방어구책1920'] || 0;
    }
    if (materialOptions.metallurgy.enabled && !materialOptions.metallurgy.isBound) {
      totalMaterialCost += costs['무기책1114'] || 0;
    }
    if (materialOptions.metallurgy1518.enabled && !materialOptions.metallurgy1518.isBound) {
      totalMaterialCost += costs['무기책1518'] || 0;
    }
    if (materialOptions.metallurgy1920.enabled && !materialOptions.metallurgy1920.isBound) {
      totalMaterialCost += costs['무기책1920'] || 0;
    }

    // 상급 재련 책 비용 추가 (방어구)
    if (advancedMaterialOptions.armorNormalBook1.enabled && !advancedMaterialOptions.armorNormalBook1.isBound) {
      totalMaterialCost += costs['재봉술1단'] || 0;
    }
    if (advancedMaterialOptions.armorNormalBook2.enabled && !advancedMaterialOptions.armorNormalBook2.isBound) {
      totalMaterialCost += costs['재봉술2단'] || 0;
    }
    if (advancedMaterialOptions.armorNormalBook3.enabled && !advancedMaterialOptions.armorNormalBook3.isBound) {
      totalMaterialCost += costs['재봉술3단'] || 0;
    }
    if (advancedMaterialOptions.armorNormalBook4.enabled && !advancedMaterialOptions.armorNormalBook4.isBound) {
      totalMaterialCost += costs['재봉술4단'] || 0;
    }
    if (advancedMaterialOptions.armorBonusBook1.enabled && !advancedMaterialOptions.armorBonusBook1.isBound) {
      totalMaterialCost += costs['재봉술1단'] || 0;
    }
    if (advancedMaterialOptions.armorBonusBook2.enabled && !advancedMaterialOptions.armorBonusBook2.isBound) {
      totalMaterialCost += costs['재봉술2단'] || 0;
    }
    if (advancedMaterialOptions.armorBonusBook3.enabled && !advancedMaterialOptions.armorBonusBook3.isBound) {
      totalMaterialCost += costs['재봉술3단'] || 0;
    }
    if (advancedMaterialOptions.armorBonusBook4.enabled && !advancedMaterialOptions.armorBonusBook4.isBound) {
      totalMaterialCost += costs['재봉술4단'] || 0;
    }

    // 상급 재련 책 비용 추가 (무기)
    if (advancedMaterialOptions.weaponNormalBook1.enabled && !advancedMaterialOptions.weaponNormalBook1.isBound) {
      totalMaterialCost += costs['야금술1단'] || 0;
    }
    if (advancedMaterialOptions.weaponNormalBook2.enabled && !advancedMaterialOptions.weaponNormalBook2.isBound) {
      totalMaterialCost += costs['야금술2단'] || 0;
    }
    if (advancedMaterialOptions.weaponNormalBook3.enabled && !advancedMaterialOptions.weaponNormalBook3.isBound) {
      totalMaterialCost += costs['야금술3단'] || 0;
    }
    if (advancedMaterialOptions.weaponNormalBook4.enabled && !advancedMaterialOptions.weaponNormalBook4.isBound) {
      totalMaterialCost += costs['야금술4단'] || 0;
    }
    if (advancedMaterialOptions.weaponBonusBook1.enabled && !advancedMaterialOptions.weaponBonusBook1.isBound) {
      totalMaterialCost += costs['야금술1단'] || 0;
    }
    if (advancedMaterialOptions.weaponBonusBook2.enabled && !advancedMaterialOptions.weaponBonusBook2.isBound) {
      totalMaterialCost += costs['야금술2단'] || 0;
    }
    if (advancedMaterialOptions.weaponBonusBook3.enabled && !advancedMaterialOptions.weaponBonusBook3.isBound) {
      totalMaterialCost += costs['야금술3단'] || 0;
    }
    if (advancedMaterialOptions.weaponBonusBook4.enabled && !advancedMaterialOptions.weaponBonusBook4.isBound) {
      totalMaterialCost += costs['야금술4단'] || 0;
    }

    const totalGold = Math.round(materials.누골 + totalMaterialCost);

    setResults({ totalGold, materialCosts: costs });

  }, [materials, marketPrices, boundMaterials, materialOptions, advancedMaterialOptions]);

  // 거래소 가격 불러오기 (latest_prices.json 사용)
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const { fetchPriceData } = await import('@/lib/price-history-client');
        const { latest } = await fetchPriceData();

        // latest_prices.json의 가격을 marketPrices 형식으로 변환 (묶음 가격 → 개당 가격)
        const prices: Record<string, number> = {};
        Object.entries(latest).forEach(([itemId, bundlePrice]) => {
          const bundleSize = MATERIAL_BUNDLE_SIZES[Number(itemId)] || 1;
          const unitPrice = bundlePrice / bundleSize;
          prices[itemId] = unitPrice;
        });

        setMarketPrices(prices);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch latest prices:', error);
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
          itemLevel: data.profile.ItemAvgLevel || '알 수 없음',
          image: data.profile.CharacterImage || undefined
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
        armorNormalBook3: { enabled: false, isBound: false },
        armorBonusBook3: { enabled: false, isBound: false },
        armorNormalBook4: { enabled: false, isBound: false },
        armorBonusBook4: { enabled: false, isBound: false },
        weaponNormalBreath: { enabled: false, isBound: false },
        weaponBonusBreath: { enabled: false, isBound: false },
        weaponNormalBook1: { enabled: false, isBound: false },
        weaponBonusBook1: { enabled: false, isBound: false },
        weaponNormalBook2: { enabled: false, isBound: false },
        weaponBonusBook2: { enabled: false, isBound: false },
        weaponNormalBook3: { enabled: false, isBound: false },
        weaponBonusBook3: { enabled: false, isBound: false },
        weaponNormalBook4: { enabled: false, isBound: false },
        weaponBonusBook4: { enabled: false, isBound: false },
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

      addToHistory(characterName.trim()); // 검색 성공 시 히스토리에 추가
      setShowSuggestions(false);
      setSearched(true);
    } catch (error: any) {
      setError(error.message || '예상치 못한 오류가 발생했습니다.');
      // 에러 발생 시 기존 데이터 유지
    } finally {
      setIsLoading(false);
    }
  };

  // 입력값 변경 시 자동완성 목록 업데이트
  const handleInputChange = (value: string) => {
    setCharacterName(value);
    if (error) setError(null);

    // 입력이 없으면 전체 히스토리 표시, 입력이 있으면 필터링된 결과 표시
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

  // 자동완성 항목 선택
  const handleSelectSuggestion = (name: string) => {
    setCharacterName(name);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // 키보드 네비게이션
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

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      armorNormalBook3: { enabled: false, isBound: false },
      armorBonusBook3: { enabled: false, isBound: false },
      armorNormalBook4: { enabled: false, isBound: false },
      armorBonusBook4: { enabled: false, isBound: false },
      weaponNormalBreath: { enabled: false, isBound: false },
      weaponBonusBreath: { enabled: false, isBound: false },
      weaponNormalBook1: { enabled: false, isBound: false },
      weaponBonusBook1: { enabled: false, isBound: false },
      weaponNormalBook2: { enabled: false, isBound: false },
      weaponBonusBook2: { enabled: false, isBound: false },
      weaponNormalBook3: { enabled: false, isBound: false },
      weaponBonusBook3: { enabled: false, isBound: false },
      weaponNormalBook4: { enabled: false, isBound: false },
      weaponBonusBook4: { enabled: false, isBound: false },
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

      // 에스더 장비는 상급재련만 가능 (일반 재련 제외)
      if (eq.isEsther) {
        const hasAdvancedTarget = targets.advanced !== null && targets.advanced > eq.currentAdvancedLevel;
        return hasAdvancedTarget;
      }

      // 계승 모드에 따른 장비 필터링
      // 계승 후 탭: 계승 장비만, 계승 전 탭: 비계승 장비만
      const isEquipmentDisabled = isSuccessionMode ? !eq.isSuccession : eq.isSuccession;
      if (isEquipmentDisabled) return false;

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
      needsAdvancedArmorBook3: false,
      needsAdvancedArmorBook4: false,
      needsAdvancedWeaponBook1: false,
      needsAdvancedWeaponBook2: false,
      needsAdvancedWeaponBook3: false,
      needsAdvancedWeaponBook4: false,
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
    let needsAdvancedArmorBook3 = false;
    let needsAdvancedArmorBook4 = false;
    let needsAdvancedWeaponBook1 = false;
    let needsAdvancedWeaponBook2 = false;
    let needsAdvancedWeaponBook3 = false;
    let needsAdvancedWeaponBook4 = false;

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
            if (nextLevel >= 11 && nextLevel <= 14) needsArmorBook1014 = true;
            if (nextLevel >= 15 && nextLevel <= 18) needsArmorBook1518 = true;
            if (nextLevel >= 19 && nextLevel <= 20) needsArmorBook1920 = true;
          }
        } else {
          needsWeapon = true;
          needsLavaNormal = true;

          // 레벨별 책 필요 여부 확인
          for (let level = eq.currentLevel; level < targets.normal; level++) {
            const nextLevel = level + 1;
            if (nextLevel >= 11 && nextLevel <= 14) needsWeaponBook1014 = true;
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
          if (currentLevel < 20 && targetLevel > 10) {
            needsAdvancedArmorBook2 = true;
          }

          // 21~30단계 구간을 지나가면 3단계 책 필요
          if (currentLevel < 30 && targetLevel > 20) {
            needsAdvancedArmorBook3 = true;
          }

          // 31~40단계 구간을 지나가면 4단계 책 필요
          if (currentLevel < 40 && targetLevel > 30) {
            needsAdvancedArmorBook4 = true;
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
          if (currentLevel < 20 && targetLevel > 10) {
            needsAdvancedWeaponBook2 = true;
          }

          // 21~30단계 구간을 지나가면 3단계 책 필요
          if (currentLevel < 30 && targetLevel > 20) {
            needsAdvancedWeaponBook3 = true;
          }

          // 31~40단계 구간을 지나가면 4단계 책 필요
          if (currentLevel < 40 && targetLevel > 30) {
            needsAdvancedWeaponBook4 = true;
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
      needsAdvancedArmorBook3,
      needsAdvancedArmorBook4,
      needsAdvancedWeaponBook1,
      needsAdvancedWeaponBook2,
      needsAdvancedWeaponBook3,
      needsAdvancedWeaponBook4,
    };
  };

// ... (컴포넌트의 다른 부분들은 동일)

  const calculateMaterials = (): Materials | null => {
    const toRefine = getEquipmentsToRefine();
    if (toRefine.length === 0) return null;

    let totalMaterials: Materials = {
      수호석: 0, 파괴석: 0, 돌파석: 0, 아비도스: 0, 운명파편: 0,
      누골: 0, 빙하: 0, 용암: 0, 빙하_일반: 0, 용암_일반: 0, 빙하_상급: 0, 용암_상급: 0,
      방어구책1114: 0, 방어구책1518: 0, 방어구책1920: 0,
      무기책1114: 0, 무기책1518: 0, 무기책1920: 0,
      재봉술1단: 0, 재봉술2단: 0, 재봉술3단: 0, 재봉술4단: 0,
      야금술1단: 0, 야금술2단: 0, 야금술3단: 0, 야금술4단: 0,
      // 계승 재료
      수호석결정: 0, 파괴석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 실링: 0,
    };

    toRefine.forEach(eq => {
      const targets = targetLevels[eq.name];
      if (!targets) return;

      // 1. 일반 강화 재료 계산
      if (targets.normal && targets.normal > eq.currentLevel) {
        for (let level = eq.currentLevel; level < targets.normal; level++) {
          const nextLevel = level + 1;

          // 계승 모드: 다른 확률과 재료 테이블 사용
          // 계승 데이터에서 키는 "현재 레벨" (예: 키 11 = 11→12 재련 재료)
          if (isSuccessionMode) {
            // 계승은 11~24 레벨 데이터 있음 (11→12 ~ 24→25)
            const baseProb = SUCCESSION_BASE_PROBABILITY[level];
            if (!baseProb) continue;

            // 숨결 사용 여부 확인
            const useBreath = (eq.type === 'armor' && materialOptions.glacierBreath.enabled) || (eq.type === 'weapon' && materialOptions.lavaBreath.enabled);

            // 시뮬레이션 데이터에서 평균 시도 횟수 조회
            // (장인의 기운, 실패 시 확률 증가 규칙이 모두 반영됨)
            const avgTries = getSuccessionAverageTries(level, useBreath);
            if (avgTries === 0) continue;

            // 숨결 효과 (비용 계산용)
            const breathEffect = getBreathEffect(baseProb);

            const materialCostPerTry = eq.type === 'armor'
              ? SUCCESSION_ARMOR_MATERIAL_COSTS[nextLevel]
              : SUCCESSION_WEAPON_MATERIAL_COSTS[nextLevel];

            if (!materialCostPerTry) continue;

            if (eq.type === 'armor') {
              totalMaterials.수호석결정 = (totalMaterials.수호석결정 || 0) + (materialCostPerTry as any).수호석결정 * avgTries;
              // 숨결 비용 (방어구: 빙하의 숨결)
              if (useBreath) {
                totalMaterials.빙하 += breathEffect.max * avgTries;
              }
            } else {
              totalMaterials.파괴석결정 = (totalMaterials.파괴석결정 || 0) + (materialCostPerTry as any).파괴석결정 * avgTries;
              // 숨결 비용 (무기: 용암의 숨결)
              if (useBreath) {
                totalMaterials.용암 += breathEffect.max * avgTries;
              }
            }
            totalMaterials.위대한돌파석 = (totalMaterials.위대한돌파석 || 0) + (materialCostPerTry as any).위대한돌파석 * avgTries;
            totalMaterials.상급아비도스 = (totalMaterials.상급아비도스 || 0) + (materialCostPerTry as any).상급아비도스 * avgTries;
            totalMaterials.운명파편 += materialCostPerTry.운명파편 * avgTries;
            totalMaterials.실링 = (totalMaterials.실링 || 0) + (materialCostPerTry as any).실링 * avgTries;
            totalMaterials.누골 += materialCostPerTry.골드 * avgTries;
          } else {
            // 기존 계승 전 로직
            const useBreath = (eq.type === 'armor' && materialOptions.glacierBreath.enabled) || (eq.type === 'weapon' && materialOptions.lavaBreath.enabled);

            // 레벨에 따라 적절한 책 옵션 확인
            let useBook = false;
            let bookType = '';
            if (nextLevel >= 11 && nextLevel <= 14) {
              useBook = (eq.type === 'armor' && materialOptions.tailoring.enabled) || (eq.type === 'weapon' && materialOptions.metallurgy.enabled);
              bookType = '1114';
            } else if (nextLevel >= 15 && nextLevel <= 18) {
              useBook = (eq.type === 'armor' && materialOptions.tailoring1518.enabled) || (eq.type === 'weapon' && materialOptions.metallurgy1518.enabled);
              bookType = '1518';
            } else if (nextLevel >= 19 && nextLevel <= 20) {
              useBook = (eq.type === 'armor' && materialOptions.tailoring1920.enabled) || (eq.type === 'weapon' && materialOptions.metallurgy1920.enabled);
              bookType = '1920';
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
                totalMaterials.빙하_일반 += breathCountPerTry * avgTries;
              }
              if (useBook && bookType) {
                if (bookType === '1114') totalMaterials.방어구책1114 = (totalMaterials.방어구책1114 || 0) + avgTries;
                if (bookType === '1518') totalMaterials.방어구책1518 = (totalMaterials.방어구책1518 || 0) + avgTries;
                if (bookType === '1920') totalMaterials.방어구책1920 = (totalMaterials.방어구책1920 || 0) + avgTries;
              }
            } else { // weapon
              totalMaterials.파괴석 += (materialCostPerTry as any).파괴석 * avgTries;
              if (useBreath) {
                totalMaterials.용암 += breathCountPerTry * avgTries;
                totalMaterials.용암_일반 += breathCountPerTry * avgTries;
              }
              if (useBook && bookType) {
                if (bookType === '1114') totalMaterials.무기책1114 = (totalMaterials.무기책1114 || 0) + avgTries;
                if (bookType === '1518') totalMaterials.무기책1518 = (totalMaterials.무기책1518 || 0) + avgTries;
                if (bookType === '1920') totalMaterials.무기책1920 = (totalMaterials.무기책1920 || 0) + avgTries;
              }
            }
            totalMaterials.돌파석 += materialCostPerTry.돌파석 * avgTries;
            totalMaterials.아비도스 += materialCostPerTry.아비도스 * avgTries;
            totalMaterials.운명파편 += materialCostPerTry.운명파편 * avgTries;
            totalMaterials.누골 += materialCostPerTry.골드 * avgTries;
          }
        }
      }

      // 2. 상급 재련 재료 계산 (계승 모드에서는 상급 재련 없음)
      if (!isSuccessionMode && targets.advanced && targets.advanced > eq.currentAdvancedLevel) {
        // 새 상급재련 옵션 설정 (방어구/무기 구분)
        const advancedOptions: NewAdvancedRefiningOptions = eq.type === 'armor' ? {
          useNormalBreath: advancedMaterialOptions.armorNormalBreath.enabled,
          useNormalBook1: advancedMaterialOptions.armorNormalBook1.enabled,
          useNormalBook2: advancedMaterialOptions.armorNormalBook2.enabled,
          useNormalBook3: advancedMaterialOptions.armorNormalBook3.enabled,
          useNormalBook4: advancedMaterialOptions.armorNormalBook4.enabled,
          useBonusBreath: advancedMaterialOptions.armorBonusBreath.enabled,
          useBonusBook1: advancedMaterialOptions.armorBonusBook1.enabled,
          useBonusBook2: advancedMaterialOptions.armorBonusBook2.enabled,
          useBonusBook3: advancedMaterialOptions.armorBonusBook3.enabled,
          useBonusBook4: advancedMaterialOptions.armorBonusBook4.enabled,
        } : {
          useNormalBreath: advancedMaterialOptions.weaponNormalBreath.enabled,
          useNormalBook1: advancedMaterialOptions.weaponNormalBook1.enabled,
          useNormalBook2: advancedMaterialOptions.weaponNormalBook2.enabled,
          useNormalBook3: advancedMaterialOptions.weaponNormalBook3.enabled,
          useNormalBook4: advancedMaterialOptions.weaponNormalBook4.enabled,
          useBonusBreath: advancedMaterialOptions.weaponBonusBreath.enabled,
          useBonusBook1: advancedMaterialOptions.weaponBonusBook1.enabled,
          useBonusBook2: advancedMaterialOptions.weaponBonusBook2.enabled,
          useBonusBook3: advancedMaterialOptions.weaponBonusBook3.enabled,
          useBonusBook4: advancedMaterialOptions.weaponBonusBook4.enabled,
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
        totalMaterials.빙하_상급 += advancedMaterials['빙하'] || 0;
        totalMaterials.용암_상급 += advancedMaterials['용암'] || 0;
        totalMaterials.재봉술1단 = (totalMaterials.재봉술1단 || 0) + (advancedMaterials['재봉술1단'] || 0);
        totalMaterials.재봉술2단 = (totalMaterials.재봉술2단 || 0) + (advancedMaterials['재봉술2단'] || 0);
        totalMaterials.재봉술3단 = (totalMaterials.재봉술3단 || 0) + (advancedMaterials['재봉술3단'] || 0);
        totalMaterials.재봉술4단 = (totalMaterials.재봉술4단 || 0) + (advancedMaterials['재봉술4단'] || 0);
        totalMaterials.야금술1단 = (totalMaterials.야금술1단 || 0) + (advancedMaterials['야금술1단'] || 0);
        totalMaterials.야금술2단 = (totalMaterials.야금술2단 || 0) + (advancedMaterials['야금술2단'] || 0);
        totalMaterials.야금술3단 = (totalMaterials.야금술3단 || 0) + (advancedMaterials['야금술3단'] || 0);
        totalMaterials.야금술4단 = (totalMaterials.야금술4단 || 0) + (advancedMaterials['야금술4단'] || 0);
      }
    });

    // 반올림 처리
    Object.keys(totalMaterials).forEach(keyStr => {
      const key = keyStr as keyof Materials;
      totalMaterials[key] = Math.round(totalMaterials[key] || 0);
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
                  onFocus={() => {
                    // 입력이 없으면 전체 히스토리 표시, 입력이 있으면 필터링된 결과 표시
                    if (characterName.trim()) {
                      const matches = getSuggestions(characterName);
                      if (matches.length > 0) {
                        setSuggestions(matches);
                        setShowSuggestions(true);
                      }
                    } else if (history.length > 0) {
                      setSuggestions(history);
                      setShowSuggestions(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className={styles.searchInput}
                  autoComplete="off"
                />
                {/* 자동완성 드롭다운 */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      marginTop: '4px',
                      boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15))',
                      zIndex: 1000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {suggestions.map((name, index) => (
                      <div
                        key={name}
                        onClick={() => handleSelectSuggestion(name)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          backgroundColor: selectedIndex === index ? 'var(--hover-bg, rgba(0,0,0,0.05))' : 'transparent',
                          color: 'var(--text-primary)',
                          fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                          borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          setSelectedIndex(index);
                          e.currentTarget.style.backgroundColor = 'var(--hover-bg, rgba(0,0,0,0.05))';
                        }}
                        onMouseLeave={(e) => {
                          if (selectedIndex !== index) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading || !characterName.trim()}
                className={styles.searchButton}
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
          <div className={styles.errorWrapper}>
            <div className={`${styles.errorMessage} ${theme === 'dark' ? styles.errorMessageDark : styles.errorMessageLight}`}>
              {error}
            </div>
          </div>
        )}
        {lastUpdated && (
          <div className={styles.lastUpdated}>
            <small className={styles.lastUpdatedText}>
              {lastUpdated.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })} 기준 가격 | 실시간 시세와 차이가 있을 수 있습니다
            </small>
          </div>
        )}
      </Form>


      {/* 장비 정보 및 목표 레벨 설정 */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(0.25rem, 2vw, 1.5rem)', marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
        <>
          {/* 캐릭터 정보 헤더 */}
          {/* 부위별 목표 레벨 설정 */}
          <div style={{ position: 'relative' }}>
            <div className={styles.updateBadge}>
              🎃 26년 1월 7일 세르카 업데이트 완료!
            </div>
            <Card className={`mb-4 ${styles.mainCard}`}>
              <Card.Header className={styles.cardHeaderAlt}>
                <h5 className={`mb-0 ${styles.cardTitle}`}>장비 강화 단계 및 목표 설정</h5>
              </Card.Header>
            <Card.Body className={styles.cardBody}>
              {/* 검색 전 빈 상태 */}
              {!searched && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    ⚒️
                  </div>
                  <p className={styles.emptyStateTitle}>
                    캐릭터를 검색하면 장비 정보가 표시됩니다
                  </p>
                  <p className={styles.emptyStateDesc}>
                    각 장비별 목표 레벨을 설정하고 필요한 재료와 비용을 확인하세요
                  </p>
                </div>
              )}

              {/* 캐릭터 정보 */}
              {searched && equipments.length > 0 && characterInfo && (
                <div className="mb-3">
                  <div className={styles.characterInfo}>
                    <div className={styles.characterInfoInner}>
                      {/* 캐릭터 이미지 */}
                      {characterInfo.image && (
                        <div className={styles.characterImageWrapper}>
                          <img
                            src={characterInfo.image}
                            alt={characterInfo.name}
                            className={styles.characterImage}
                          />
                        </div>
                      )}

                      {/* 캐릭터 상세 정보 */}
                      <div className={styles.characterDetails}>
                        {/* 캐릭터 이름 */}
                        <div className={styles.characterNameRow}>
                          <span className={styles.characterName}>
                            {characterInfo.name}
                          </span>
                        </div>

                        {/* 레벨 정보 그리드 */}
                        <div className={styles.characterLevelGrid}>
                          {/* 현재 레벨 */}
                          <div className={styles.levelBox}>
                            <div className={styles.levelLabel}>Current Level</div>
                            <div className={styles.characterLevel}>
                              {characterInfo.itemLevel}
                            </div>
                          </div>

                          {/* 화살표 (예상 레벨이 있을 때만) */}
                          {expectedItemLevel && (
                            <div className={styles.levelArrow}>→</div>
                          )}

                          {/* 예상 레벨 */}
                          {expectedItemLevel && (
                            <div className={styles.levelBox}>
                              <div className={styles.levelLabel}>Expected Level</div>
                              <div className={styles.expectedLevel}>
                                {expectedItemLevel}
                                <span className={styles.levelBadge}>
                                  +{(parseFloat(expectedItemLevel) - parseFloat(characterInfo.itemLevel.replace(/,/g, ''))).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {searched && equipments.length > 0 && (
              <>
              <Row className="g-3">
                {equipments.map((eq, index) => {
                  const targets = targetLevels[eq.name] || { normal: null, advanced: null };
                  const isNormalChanged = targets.normal !== null && targets.normal > eq.currentLevel;
                  const isAdvancedChanged = targets.advanced !== null && targets.advanced > eq.currentAdvancedLevel;
                  const isChanged = isNormalChanged || isAdvancedChanged;
                  const gradeColor = getGradeColor(eq.grade);

                  // 계승 모드에 따른 장비 활성화/비활성화 판별
                  // 계승 후 탭: 계승 장비(전율)만 활성화
                  // 계승 전 탭: 비계승 장비(업화)만 활성화
                  // 에스더 장비는 항상 표시하되 재련 비활성화
                  const isEquipmentDisabled = eq.isEsther ? false : (isSuccessionMode ? !eq.isSuccession : eq.isSuccession);

                  // 에스더/계승 장비 특별 클래스
                  const specialCardClass = eq.isEsther
                    ? styles.equipmentCardEsther
                    : (eq.isSuccession ? styles.equipmentCardSuccession : '');

                  return (
                    <Col key={index} xs={4} sm={6} md={4} lg={2}>
                      <div
                        className={`${styles.equipmentCard} ${isMobile ? styles.equipmentCardMobile : ''} ${isChanged && !eq.isEsther ? styles.equipmentCardChanged : ''} ${isChanged && isMobile && !eq.isEsther ? styles.equipmentCardMobileChanged : ''} ${!eq.isEsther && !eq.isSuccession ? (eq.type === 'weapon' ? styles.equipmentCardWeapon : styles.equipmentCardArmor) : ''} ${isEquipmentDisabled ? styles.equipmentCardDisabled : ''} ${specialCardClass}`}
                        style={eq.isSuccession && !eq.isEsther ? {
                          background: theme === 'dark' ? '#1f2937' : '#ffffff',
                          border: 'none',
                          overflow: 'visible',
                        } : undefined}
                      >
                        <div className="d-flex justify-content-between align-items-start" style={{ marginBottom: isMobile ? '0.2rem' : '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className={`${styles.equipmentName} ${isMobile ? styles.equipmentNameMobile : ''}`}>
                              {eq.name}
                            </span>
                            <span className={`${styles.equipmentGrade} ${isMobile ? styles.equipmentGradeMobile : ''}`}>
                              {eq.grade}
                            </span>
                          </div>
                          <div className="d-flex flex-column" style={{
                            gap: isMobile ? '0.1rem' : '0.25rem',
                            alignItems: 'flex-end',
                            marginLeft: '0.2rem',
                            // 뱃지 2개 (레벨 + 상급) 공간 고정 - 모든 탭에서 동일
                            minHeight: isMobile ? '38px' : '56px',
                            justifyContent: 'flex-start'
                          }}>
                            <Badge
                              pill
                              bg=""
                              className={`${eq.isEsther ? styles.levelBadgeEsther : (eq.type === 'weapon' ? styles.levelBadgeWeapon : styles.levelBadgeArmor)} ${isMobile ? styles.levelBadgeMobile : ''}`}
                            >
                              +{eq.currentLevel}
                            </Badge>
                            {eq.currentAdvancedLevel > 0 && (
                              <Badge
                                pill
                                bg=""
                                className={`${styles.advancedLevelBadge} ${isMobile ? styles.advancedLevelBadgeMobile : ''}`}
                              >
                                상+{eq.currentAdvancedLevel}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: isMobile ? '0.15rem' : '0.3rem',
                          flexDirection: 'column',
                          minHeight: isSuccessionMode
                            ? (isMobile ? '24px' : '32px')  // 계승 후 탭: 1개 셀렉트 높이
                            : (isMobile ? '50px' : '68px'), // 계승 전 탭: 2개 셀렉트 높이
                          justifyContent: 'flex-start'
                        }}>
                          {eq.isEsther ? (
                            // 에스더 장비: 일반 재련 대신 메시지 + 상급재련은 표시
                            <>
                              <div style={{
                                textAlign: 'center',
                                padding: isMobile ? '0.25rem' : '0.35rem',
                                background: 'linear-gradient(135deg, rgba(61, 210, 204, 0.1), rgba(20, 184, 166, 0.1))',
                                borderRadius: '6px',
                                fontSize: isMobile ? '0.5rem' : '0.65rem',
                                color: '#14b8a6',
                                fontWeight: 600,
                              }}>
                                최상위 장비
                              </div>
                              {!isSuccessionMode && (
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
                                  className={`${styles.equipmentSelect} ${isMobile ? styles.equipmentSelectMobile : ''} ${targets.advanced === null ? styles.equipmentSelectEmpty : styles.equipmentSelectSelected}`}
                                >
                                  <option value="">상급</option>
                                  {[10, 20, 30, 40]
                                    .filter(level => level > eq.currentAdvancedLevel)
                                    .map(level => (
                                      <option key={level} value={level}>+{level}</option>
                                    ))}
                                </Form.Select>
                              )}
                            </>
                          ) : (
                            <>
                              <Form.Select
                                value={targets.normal ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTargetLevels(prev => ({
                                    ...prev,
                                    [eq.name]: { ...prev[eq.name], normal: value === '' ? null : Number(value) }
                                  }));
                                }}
                                disabled={isEquipmentDisabled}
                                className={`${styles.equipmentSelect} ${isMobile ? styles.equipmentSelectMobile : ''} ${targets.normal === null ? styles.equipmentSelectEmpty : styles.equipmentSelectSelected}`}
                              >
                                <option value="">+{eq.currentLevel}</option>
                                {Array.from({ length: (isSuccessionMode ? 25 : 26) - eq.currentLevel }, (_, i) => eq.currentLevel + i + 1).map(level => (
                                  <option key={level} value={level}>+{level}</option>
                                ))}
                              </Form.Select>
                              {!isSuccessionMode && (
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
                                  className={`${styles.equipmentSelect} ${isMobile ? styles.equipmentSelectMobile : ''} ${targets.advanced === null ? styles.equipmentSelectEmpty : styles.equipmentSelectSelected}`}
                                >
                                  <option value="">상급</option>
                                  {[10, 20, 30, 40]
                                    .filter(level => level > eq.currentAdvancedLevel)
                                    .map(level => (
                                      <option key={level} value={level}>+{level}</option>
                                    ))}
                                </Form.Select>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>

              {/* 목표 설정 */}
              <div className={`mt-4 ${styles.bulkSettingContainer} ${isMobile ? styles.bulkSettingContainerMobile : ''}`}>
                <Row className="align-items-start">
                  <Col md={12}>
                    {/* 방어구 일괄 설정 */}
                    <div style={{ marginBottom: isMobile ? '0.6rem' : '1rem' }}>
                      <div className={`${styles.bulkSettingLabel} ${isMobile ? styles.bulkSettingLabelMobile : ''}`}>
                        방어구 ({isSuccessionMode ? '계승' : '일반'})
                      </div>
                      <div className={`${styles.bulkButtonGroup} ${isMobile ? styles.bulkButtonGroupMobile : ''}`}>
                        {(() => {
                          // 현재 모드에 맞는 방어구만 필터링 (에스더 제외)
                          const armorEquipments = equipments.filter(eq =>
                            eq.type === 'armor' &&
                            !eq.isEsther &&
                            (isSuccessionMode ? eq.isSuccession : !eq.isSuccession)
                          );
                          const minArmorLevel = armorEquipments.length > 0
                            ? Math.min(...armorEquipments.map(eq => eq.currentLevel))
                            : 10;
                          const startLevel = Math.max(minArmorLevel, 11);
                          const maxLevel = isSuccessionMode ? 25 : 25;
                          return Array.from({ length: maxLevel - startLevel + 1 }, (_, i) => i + startLevel);
                        })().map(level => {
                          // 현재 모드에 맞는 방어구만 체크 (에스더 제외)
                          const hasArmor = equipments.some(eq =>
                            eq.type === 'armor' &&
                            !eq.isEsther &&
                            eq.currentLevel < level &&
                            (isSuccessionMode ? eq.isSuccession : !eq.isSuccession)
                          );
                          const isSelected = selectedArmorBulkLevel.normal === level;

                          return (
                            <button
                              key={level}
                              onClick={() => {
                                // 이미 선택된 레벨을 다시 클릭하면 해제
                                if (isSelected) {
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    // 현재 모드에 맞는 방어구만 대상 (에스더 제외)
                                    const isActiveEquipment = !eq.isEsther && (isSuccessionMode ? eq.isSuccession : !eq.isSuccession);
                                    if (eq.type === 'armor' && isActiveEquipment) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: null };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedArmorBulkLevel(prev => ({ ...prev, normal: null }));
                                } else {
                                  // 새로운 목표 설정
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    // 현재 모드에 맞는 방어구만 대상 (에스더 제외)
                                    const isActiveEquipment = !eq.isEsther && (isSuccessionMode ? eq.isSuccession : !eq.isSuccession);
                                    if (eq.type === 'armor' && eq.currentLevel < level && isActiveEquipment) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: level };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedArmorBulkLevel(prev => ({ ...prev, normal: level }));
                                }
                              }}
                              disabled={!hasArmor}
                              className={`${styles.bulkButton} ${isMobile ? styles.bulkButtonMobile : ''} ${isSelected ? styles.bulkButtonSelected : ''}`}
                            >
                              +{level}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 무기 일괄 설정 */}
                    <div style={{ marginBottom: isMobile ? '0.6rem' : '1rem' }}>
                      <div className={`${styles.bulkSettingLabel} ${isMobile ? styles.bulkSettingLabelMobile : ''}`}>
                        무기 ({isSuccessionMode ? '계승' : '일반'})
                      </div>
                      <div className={`${styles.bulkButtonGroup} ${isMobile ? styles.bulkButtonGroupMobile : ''}`}>
                        {(() => {
                          // 현재 모드에 맞는 무기만 필터링 (에스더 제외)
                          const weaponEquipments = equipments.filter(eq =>
                            eq.type === 'weapon' &&
                            !eq.isEsther &&
                            (isSuccessionMode ? eq.isSuccession : !eq.isSuccession)
                          );
                          const minWeaponLevel = weaponEquipments.length > 0
                            ? Math.min(...weaponEquipments.map(eq => eq.currentLevel))
                            : 10;
                          const startLevel = Math.max(minWeaponLevel, 11);
                          const maxLevel = isSuccessionMode ? 25 : 25;
                          return Array.from({ length: maxLevel - startLevel + 1 }, (_, i) => i + startLevel);
                        })().map(level => {
                          // 현재 모드에 맞는 무기만 체크 (에스더 제외)
                          const hasWeapon = equipments.some(eq =>
                            eq.type === 'weapon' &&
                            !eq.isEsther &&
                            eq.currentLevel < level &&
                            (isSuccessionMode ? eq.isSuccession : !eq.isSuccession)
                          );
                          const isSelected = selectedWeaponBulkLevel.normal === level;

                          return (
                            <button
                              key={level}
                              onClick={() => {
                                // 이미 선택된 레벨을 다시 클릭하면 해제
                                if (isSelected) {
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    // 현재 모드에 맞는 무기만 대상 (에스더 제외)
                                    const isActiveEquipment = !eq.isEsther && (isSuccessionMode ? eq.isSuccession : !eq.isSuccession);
                                    if (eq.type === 'weapon' && isActiveEquipment) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: null };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedWeaponBulkLevel(prev => ({ ...prev, normal: null }));
                                } else {
                                  // 새로운 목표 설정
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    // 현재 모드에 맞는 무기만 대상 (에스더 제외)
                                    const isActiveEquipment = !eq.isEsther && (isSuccessionMode ? eq.isSuccession : !eq.isSuccession);
                                    if (eq.type === 'weapon' && eq.currentLevel < level && isActiveEquipment) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: level };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedWeaponBulkLevel(prev => ({ ...prev, normal: level }));
                                }
                              }}
                              disabled={!hasWeapon}
                              className={`${styles.bulkButton} ${isMobile ? styles.bulkButtonMobile : ''} ${isSelected ? styles.bulkButtonWeaponSelected : ''}`}
                            >
                              +{level}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 상급재련 섹션 - 계승 전 모드에서만 표시 */}
                    {!isSuccessionMode && (
                    <>
                    {/* 상급재련 헤더 */}
                    {!isMobile && (
                      <div className="mb-2" style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 220px 220px',
                        gap: '2rem',
                        alignItems: 'center'
                      }}>
                        <div></div>

                      </div>
                    )}

                    {/* 방어구 상급 일괄 설정 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 75px 75px' : '1fr 220px 220px',
                      gap: isMobile ? '0.4rem' : '2rem',
                      alignItems: 'center',
                      marginBottom: isMobile ? '0.6rem' : '1rem'
                    }}>
                      <div>
                        <div style={{
                          fontSize: isMobile ? '0.85rem' : 'clamp(0.8rem, 1.7vw, 0.9rem)',
                          color: 'var(--text-secondary)',
                          marginBottom: isMobile ? '0.4rem' : '0.5rem',
                          fontWeight: '600'
                        }}>
                          방어구 (상급)
                        </div>
                        <div style={{
                          display: isMobile ? 'grid' : 'flex',
                          gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
                          gap: isMobile ? '0.35rem' : '0.5rem',
                          flexWrap: isMobile ? undefined : 'wrap'
                        }}>
                          {[10, 20, 30, 40].map(level => {
                            // 계승 전 장비(업화)만 필터링 (에스더 제외)
                            const armorEquipments = equipments.filter(eq => eq.type === 'armor' && !eq.isSuccession && !eq.isEsther);
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
                                      // 계승 전 장비(업화)만 대상 (에스더 제외)
                                      if (eq.type === 'armor' && !eq.isSuccession && !eq.isEsther) {
                                        newTargets[eq.name] = { ...newTargets[eq.name], advanced: null };
                                      }
                                    });
                                    setTargetLevels(newTargets);
                                    setSelectedArmorBulkLevel(prev => ({ ...prev, advanced: null }));
                                  } else {
                                    // 새로운 목표 설정
                                    const newTargets = { ...targetLevels };
                                    equipments.forEach(eq => {
                                      // 계승 전 장비(업화)만 대상 (에스더 제외)
                                      if (eq.type === 'armor' && !eq.isSuccession && !eq.isEsther && level > eq.currentAdvancedLevel) {
                                        newTargets[eq.name] = { ...newTargets[eq.name], advanced: level };
                                      }
                                    });
                                    setTargetLevels(newTargets);
                                    setSelectedArmorBulkLevel(prev => ({ ...prev, advanced: level }));
                                  }
                                }}
                                disabled={!canSelect}
                                className={`${styles.bulkButton} ${isMobile ? styles.bulkButtonMobile : ''} ${isSelected ? styles.bulkButtonSelected : ''}`}
                              >
                                +{level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 일반턴 재료 - 방어구 */}
                      <div className="d-flex flex-column gap-1 align-items-center">
                        <div className={`${styles.advancedMaterialLabel} ${isMobile ? styles.advancedMaterialLabelMobile : ''}`}>일반턴</div>
                        <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.5rem', flexDirection: 'row' }}>
                          {/* 빙하의 숨결 - 항상 표시 */}
                          <div className="d-flex flex-column align-items-center">
                            <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                              <Image src="/breath-glacier.webp" alt="빙하의 숨결" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                            </div>
                            <button
                              onClick={() => setAdvancedMaterialOptions(prev => ({
                                ...prev,
                                armorNormalBreath: { ...prev.armorNormalBreath, enabled: !prev.armorNormalBreath.enabled }
                              }))}
                              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorNormalBreath.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
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

                            // 2단계 책: 현재 레벨이 20 미만이고, 목표가 10 초과일 때 (11~20단계 구간을 지나감)
                            const showBook2 = minCurrentLevel < 20 && maxTargetLevel > 10;

                            // 3단계 책: 현재 레벨이 30 미만이고, 목표가 20 초과일 때 (21~30단계 구간을 지나감)
                            const showBook3 = minCurrentLevel < 30 && maxTargetLevel > 20;

                            // 4단계 책: 현재 레벨이 40 미만이고, 목표가 30 초과일 때 (31~40단계 구간을 지나감)
                            const showBook4 = minCurrentLevel < 40 && maxTargetLevel > 30;

                            return (
                              <>
                                {/* 장인의 재봉술 1단계 */}
                                {showBook1 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                      <Image src="/master-tailoring-1.webp" alt="장인의 재봉술 1단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        armorNormalBook1: { ...prev.armorNormalBook1, enabled: !prev.armorNormalBook1.enabled }
                                      }))}
                                      className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorNormalBook1.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                    >
                                      {advancedMaterialOptions.armorNormalBook1.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 재봉술 2단계 */}
                                {showBook2 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-tailoring-2.webp" alt="장인의 재봉술 2단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      armorNormalBook2: { ...prev.armorNormalBook2, enabled: !prev.armorNormalBook2.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorNormalBook2.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.armorNormalBook2.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}

                                {/* 장인의 재봉술 3단계 */}
                                {showBook3 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-tailoring-3.webp" alt="장인의 재봉술 3단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      armorNormalBook3: { ...prev.armorNormalBook3, enabled: !prev.armorNormalBook3.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorNormalBook3.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.armorNormalBook3.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}

                                {/* 장인의 재봉술 4단계 */}
                                {showBook4 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-tailoring-4.webp" alt="장인의 재봉술 4단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      armorNormalBook4: { ...prev.armorNormalBook4, enabled: !prev.armorNormalBook4.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorNormalBook4.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.armorNormalBook4.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 선조턴 재료 - 방어구 */}
                      <div className="d-flex flex-column gap-1 align-items-center">
                        <div className={`${styles.advancedMaterialLabel} ${isMobile ? styles.advancedMaterialLabelMobile : ''}`}>선조턴</div>
                        <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.5rem', flexDirection: 'row' }}>
                          {/* 빙하의 숨결 - 항상 표시 */}
                          <div className="d-flex flex-column align-items-center">
                            <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                              <Image src="/breath-glacier.webp" alt="빙하의 숨결" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                            </div>
                            <button
                              onClick={() => setAdvancedMaterialOptions(prev => ({
                                ...prev,
                                armorBonusBreath: { ...prev.armorBonusBreath, enabled: !prev.armorBonusBreath.enabled }
                              }))}
                              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorBonusBreath.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
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

                            // 2단계 책: 현재 레벨이 20 미만이고, 목표가 10 초과일 때 (11~20단계 구간을 지나감)
                            const showBook2 = minCurrentLevel < 20 && maxTargetLevel > 10;

                            // 3단계 책: 현재 레벨이 30 미만이고, 목표가 20 초과일 때 (21~30단계 구간을 지나감)
                            const showBook3 = minCurrentLevel < 30 && maxTargetLevel > 20;

                            // 4단계 책: 현재 레벨이 40 미만이고, 목표가 30 초과일 때 (31~40단계 구간을 지나감)
                            const showBook4 = minCurrentLevel < 40 && maxTargetLevel > 30;

                            return (
                              <>
                                {/* 장인의 재봉술 1단계 */}
                                {showBook1 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                      <Image src="/master-tailoring-1.webp" alt="장인의 재봉술 1단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        armorBonusBook1: { ...prev.armorBonusBook1, enabled: !prev.armorBonusBook1.enabled }
                                      }))}
                                      className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorBonusBook1.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                    >
                                      {advancedMaterialOptions.armorBonusBook1.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 재봉술 2단계 */}
                                {showBook2 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-tailoring-2.webp" alt="장인의 재봉술 2단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      armorBonusBook2: { ...prev.armorBonusBook2, enabled: !prev.armorBonusBook2.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorBonusBook2.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.armorBonusBook2.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}

                                {/* 장인의 재봉술 3단계 */}
                                {showBook3 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-tailoring-3.webp" alt="장인의 재봉술 3단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      armorBonusBook3: { ...prev.armorBonusBook3, enabled: !prev.armorBonusBook3.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorBonusBook3.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.armorBonusBook3.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}

                                {/* 장인의 재봉술 4단계 */}
                                {showBook4 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-tailoring-4.webp" alt="장인의 재봉술 4단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      armorBonusBook4: { ...prev.armorBonusBook4, enabled: !prev.armorBonusBook4.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.armorBonusBook4.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.armorBonusBook4.enabled ? '사용' : '미사용'}
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
                      gridTemplateColumns: isMobile ? '1fr 75px 75px' : '1fr 220px 220px',
                      gap: isMobile ? '0.4rem' : '2rem',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{
                          fontSize: isMobile ? '0.85rem' : 'clamp(0.8rem, 1.7vw, 0.9rem)',
                          color: 'var(--text-secondary)',
                          marginBottom: isMobile ? '0.4rem' : '0.5rem',
                          fontWeight: '600'
                        }}>
                          무기 (상급)
                        </div>
                        <div style={{
                          display: isMobile ? 'grid' : 'flex',
                          gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
                          gap: isMobile ? '0.35rem' : '0.5rem',
                          flexWrap: isMobile ? undefined : 'wrap'
                        }}>
                          {[10, 20, 30, 40].map(level => {
                            // 계승 전 무기(업화)만 필터링 (에스더 제외)
                            const weaponEquipments = equipments.filter(eq => eq.type === 'weapon' && !eq.isSuccession && !eq.isEsther);
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
                                      // 계승 전 무기(업화)만 대상 (에스더 제외)
                                      if (eq.type === 'weapon' && !eq.isSuccession && !eq.isEsther) {
                                        newTargets[eq.name] = { ...newTargets[eq.name], advanced: null };
                                      }
                                    });
                                    setTargetLevels(newTargets);
                                    setSelectedWeaponBulkLevel(prev => ({ ...prev, advanced: null }));
                                  } else {
                                    // 새로운 목표 설정
                                    const newTargets = { ...targetLevels };
                                    equipments.forEach(eq => {
                                      // 계승 전 무기(업화)만 대상 (에스더 제외)
                                      if (eq.type === 'weapon' && !eq.isSuccession && !eq.isEsther && level > eq.currentAdvancedLevel) {
                                        newTargets[eq.name] = { ...newTargets[eq.name], advanced: level };
                                      }
                                    });
                                    setTargetLevels(newTargets);
                                    setSelectedWeaponBulkLevel(prev => ({ ...prev, advanced: level }));
                                  }
                                }}
                                disabled={!canSelect}
                                className={`${styles.bulkButton} ${isMobile ? styles.bulkButtonMobile : ''} ${isSelected ? styles.bulkButtonWeaponSelected : ''}`}
                              >
                                +{level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 일반턴 재료 - 무기 */}
                      <div className="d-flex flex-column gap-1 align-items-center">
                        <div className={`${styles.advancedMaterialLabel} ${isMobile ? styles.advancedMaterialLabelMobile : ''}`}>일반턴</div>
                        <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.5rem', flexDirection: 'row' }}>
                          {/* 용암의 숨결 - 항상 표시 */}
                          <div className="d-flex flex-column align-items-center">
                            <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                              <Image src="/breath-lava.webp" alt="용암의 숨결" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                            </div>
                            <button
                              onClick={() => setAdvancedMaterialOptions(prev => ({
                                ...prev,
                                weaponNormalBreath: { ...prev.weaponNormalBreath, enabled: !prev.weaponNormalBreath.enabled }
                              }))}
                              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponNormalBreath.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
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

                            // 1단계 책: 현재 레벨이 10 미만이고, 목표가 1 이상일 때 (1~10단계 구간을 지나감)
                            const showBook1 = minCurrentLevel < 10 && maxTargetLevel >= 1;

                            // 2단계 책: 현재 레벨이 20 미만이고, 목표가 10 초과일 때 (11~20단계 구간을 지나감)
                            const showBook2 = minCurrentLevel < 20 && maxTargetLevel > 10;

                            // 3단계 책: 현재 레벨이 30 미만이고, 목표가 20 초과일 때 (21~30단계 구간을 지나감)
                            const showBook3 = minCurrentLevel < 30 && maxTargetLevel > 20;

                            // 4단계 책: 현재 레벨이 40 미만이고, 목표가 30 초과일 때 (31~40단계 구간을 지나감)
                            const showBook4 = minCurrentLevel < 40 && maxTargetLevel > 30;

                            return (
                              <>
                                {/* 장인의 야금술 1단계 */}
                                {showBook1 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                      <Image src="/master-metallurgy-1.webp" alt="장인의 야금술 1단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        weaponNormalBook1: { ...prev.weaponNormalBook1, enabled: !prev.weaponNormalBook1.enabled }
                                      }))}
                                      className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponNormalBook1.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                    >
                                      {advancedMaterialOptions.weaponNormalBook1.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 야금술 2단계 */}
                                {showBook2 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-metallurgy-2.webp" alt="장인의 야금술 2단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      weaponNormalBook2: { ...prev.weaponNormalBook2, enabled: !prev.weaponNormalBook2.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponNormalBook2.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.weaponNormalBook2.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}

                                {/* 장인의 야금술 3단계 */}
                                {showBook3 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-metallurgy-3.webp" alt="장인의 야금술 3단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      weaponNormalBook3: { ...prev.weaponNormalBook3, enabled: !prev.weaponNormalBook3.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponNormalBook3.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.weaponNormalBook3.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}

                                {/* 장인의 야금술 4단계 */}
                                {showBook4 && (
                                  <div className="d-flex flex-column align-items-center">
                                  <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                    <Image src="/master-metallurgy-4.webp" alt="장인의 야금술 4단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                  </div>
                                  <button
                                    onClick={() => setAdvancedMaterialOptions(prev => ({
                                      ...prev,
                                      weaponNormalBook4: { ...prev.weaponNormalBook4, enabled: !prev.weaponNormalBook4.enabled }
                                    }))}
                                    className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponNormalBook4.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                  >
                                    {advancedMaterialOptions.weaponNormalBook4.enabled ? '사용' : '미사용'}
                                  </button>
                                </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 선조턴 재료 - 무기 */}
                      <div className="d-flex flex-column gap-1 align-items-center">
                        <div className={`${styles.advancedMaterialLabel} ${isMobile ? styles.advancedMaterialLabelMobile : ''}`}>선조턴</div>
                        <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.5rem', flexDirection: 'row' }}>
                          {/* 용암의 숨결 - 항상 표시 */}
                          <div className="d-flex flex-column align-items-center">
                            <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                              <Image src="/breath-lava.webp" alt="용암의 숨결" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                            </div>
                            <button
                              onClick={() => setAdvancedMaterialOptions(prev => ({
                                ...prev,
                                weaponBonusBreath: { ...prev.weaponBonusBreath, enabled: !prev.weaponBonusBreath.enabled }
                              }))}
                              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponBonusBreath.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
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

                            // 1단계 책: 현재 레벨이 10 미만이고, 목표가 1 이상일 때 (1~10단계 구간을 지나감)
                            const showBook1 = minCurrentLevel < 10 && maxTargetLevel >= 1;

                            // 2단계 책: 현재 레벨이 20 미만이고, 목표가 10 초과일 때 (11~20단계 구간을 지나감)
                            const showBook2 = minCurrentLevel < 20 && maxTargetLevel > 10;

                            // 3단계 책: 현재 레벨이 30 미만이고, 목표가 20 초과일 때 (21~30단계 구간을 지나감)
                            const showBook3 = minCurrentLevel < 30 && maxTargetLevel > 20;

                            // 4단계 책: 현재 레벨이 40 미만이고, 목표가 30 초과일 때 (31~40단계 구간을 지나감)
                            const showBook4 = minCurrentLevel < 40 && maxTargetLevel > 30;

                            return (
                              <>
                                {/* 장인의 야금술 1단계 */}
                                {showBook1 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                      <Image src="/master-metallurgy-1.webp" alt="장인의 야금술 1단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        weaponBonusBook1: { ...prev.weaponBonusBook1, enabled: !prev.weaponBonusBook1.enabled }
                                      }))}
                                      className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponBonusBook1.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                    >
                                      {advancedMaterialOptions.weaponBonusBook1.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 야금술 2단계 */}
                                {showBook2 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                      <Image src="/master-metallurgy-2.webp" alt="장인의 야금술 2단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        weaponBonusBook2: { ...prev.weaponBonusBook2, enabled: !prev.weaponBonusBook2.enabled }
                                      }))}
                                      className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponBonusBook2.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                    >
                                      {advancedMaterialOptions.weaponBonusBook2.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 야금술 3단계 */}
                                {showBook3 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                      <Image src="/master-metallurgy-3.webp" alt="장인의 야금술 3단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        weaponBonusBook3: { ...prev.weaponBonusBook3, enabled: !prev.weaponBonusBook3.enabled }
                                      }))}
                                      className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponBonusBook3.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                    >
                                      {advancedMaterialOptions.weaponBonusBook3.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}

                                {/* 장인의 야금술 4단계 */}
                                {showBook4 && (
                                  <div className="d-flex flex-column align-items-center">
                                    <div className={`${styles.advancedItemImageContainer} ${isMobile ? styles.advancedItemImageContainerMobile : ''}`}>
                                      <Image src="/master-metallurgy-4.webp" alt="장인의 야금술 4단계" width={isMobile ? 18 : 32} height={isMobile ? 18 : 32} style={{ objectFit: 'contain' }} />
                                    </div>
                                    <button
                                      onClick={() => setAdvancedMaterialOptions(prev => ({
                                        ...prev,
                                        weaponBonusBook4: { ...prev.weaponBonusBook4, enabled: !prev.weaponBonusBook4.enabled }
                                      }))}
                                      className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions.weaponBonusBook4.enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                                    >
                                      {advancedMaterialOptions.weaponBonusBook4.enabled ? '사용' : '미사용'}
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    </>
                    )}
                  </Col>

                </Row>
              </div>
              </>
              )}
            </Card.Body>
          </Card>
          </div>

          {/* 재료 소모량 표시 */}
          {searched && equipments.length > 0 && materials && (
            <Card className={styles.mainCard}>
              <Card.Header className={styles.cardHeaderAlt}>
                <h5 className={`mb-0 ${styles.cardTitle}`}>
                  예상 소모 재료
                </h5>
              </Card.Header>
              <Card.Body className={styles.cardBody} style={{
                padding: isMobile ? '0.75rem 0.5rem' : undefined
              }}>
                {(() => {
                  const requiredMats = analyzeRequiredMaterials();

                  return (
                    <>
                      {/* 1줄: 기본 재료 - 5개 */}
                      <div className={styles.materialsSection}>
                        <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                          {isSuccessionMode ? (
                            <>
                              {/* 계승 모드 재료 */}
                              {requiredMats.needsArmor && (
                                <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                  <MaterialCard icon="/destiny-guardian-stone2.webp" name="수호석결정" amount={materials.수호석결정 || 0} color="#818cf8" showCheckbox={true} isBound={boundMaterials['수호석결정']} onBoundChange={handleBoundChange} cost={results.materialCosts['수호석결정']} />
                                </Col>
                              )}
                              {requiredMats.needsWeapon && (
                                <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                  <MaterialCard icon="/destiny-destruction-stone2.webp" name="파괴석결정" amount={materials.파괴석결정 || 0} color="#818cf8" showCheckbox={true} isBound={boundMaterials['파괴석결정']} onBoundChange={handleBoundChange} cost={results.materialCosts['파괴석결정']} />
                                </Col>
                              )}
                              <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                <MaterialCard icon="/destiny-breakthrough-stone2.webp" name="위대한돌파석" amount={materials.위대한돌파석 || 0} color="#818cf8" showCheckbox={true} isBound={boundMaterials['위대한돌파석']} onBoundChange={handleBoundChange} cost={results.materialCosts['위대한돌파석']} />
                              </Col>
                              <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                <MaterialCard icon="/destiny-shard-bag-large.webp" name="파편" amount={materials.운명파편} color="#818cf8" showCheckbox={true} isBound={boundMaterials['운명파편']} onBoundChange={handleBoundChange} cost={results.materialCosts['운명파편']} />
                              </Col>
                              <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                <MaterialCard icon="/abidos-fusion2.webp" name="상급아비도스" amount={materials.상급아비도스 || 0} color="#818cf8" showCheckbox={true} isBound={boundMaterials['상급아비도스']} onBoundChange={handleBoundChange} cost={results.materialCosts['상급아비도스']} />
                              </Col>
                              <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                <MaterialCard icon="/shilling.png" name="실링" amount={materials.실링 || 0} color="#9ca3af" showCheckbox={false} />
                              </Col>
                            </>
                          ) : (
                            <>
                              {/* 계승 전 모드 재료 */}
                              {requiredMats.needsArmor && (
                                <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                  <MaterialCard icon="/destiny-guardian-stone.webp" name="수호석" amount={materials.수호석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['수호석']} onBoundChange={handleBoundChange} cost={results.materialCosts['수호석']} />
                                </Col>
                              )}
                              {requiredMats.needsWeapon && (
                                <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                  <MaterialCard icon="/destiny-destruction-stone.webp" name="파괴석" amount={materials.파괴석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['파괴석']} onBoundChange={handleBoundChange} cost={results.materialCosts['파괴석']} />
                                </Col>
                              )}
                              <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                <MaterialCard icon="/destiny-breakthrough-stone.webp" name="돌파석" amount={materials.돌파석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['돌파석']} onBoundChange={handleBoundChange} cost={results.materialCosts['돌파석']} />
                              </Col>
                              <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                <MaterialCard icon="/destiny-shard-bag-large.webp" name="파편" amount={materials.운명파편} color="#818cf8" showCheckbox={true} isBound={boundMaterials['운명파편']} onBoundChange={handleBoundChange} cost={results.materialCosts['운명파편']} />
                              </Col>
                              <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                                <MaterialCard icon="/abidos-fusion.webp" name="아비도스" amount={materials.아비도스} color="#818cf8" showCheckbox={true} isBound={boundMaterials['아비도스']} onBoundChange={handleBoundChange} cost={results.materialCosts['아비도스']} />
                              </Col>
                            </>
                          )}
                        </Row>
                      </div>

                      {/* 계승 모드 숨결 재료 (책은 미사용) */}
                      {isSuccessionMode && (requiredMats.needsGlacierNormal || requiredMats.needsLavaNormal) && (
                        <div className={styles.materialsSection}>
                          <div className={styles.materialsSectionTitle}>
                            추가 재료
                          </div>
                          <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                            {requiredMats.needsGlacierNormal && (
                              <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-glacier.webp"
                                  name="빙하의 숨결"
                                  amount={materials.빙하}
                                  color="#34d399"
                                  showCheckbox={true}
                                  isBound={boundMaterials['빙하']}
                                  onBoundChange={handleBoundChange}
                                  cost={results.materialCosts['빙하']}
                                  showEnableToggle={true}
                                  isEnabled={materialOptions.glacierBreath.enabled}
                                  onToggleEnabled={() => setMaterialOptions(prev => ({
                                    ...prev,
                                    glacierBreath: { ...prev.glacierBreath, enabled: !prev.glacierBreath.enabled }
                                  }))}
                                />
                              </Col>
                            )}
                            {requiredMats.needsLavaNormal && (
                              <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-lava.webp"
                                  name="용암의 숨결"
                                  amount={materials.용암}
                                  color="#f87171"
                                  showCheckbox={true}
                                  isBound={boundMaterials['용암']}
                                  onBoundChange={handleBoundChange}
                                  cost={results.materialCosts['용암']}
                                  showEnableToggle={true}
                                  isEnabled={materialOptions.lavaBreath.enabled}
                                  onToggleEnabled={() => setMaterialOptions(prev => ({
                                    ...prev,
                                    lavaBreath: { ...prev.lavaBreath, enabled: !prev.lavaBreath.enabled }
                                  }))}
                                />
                              </Col>
                            )}
                          </Row>
                        </div>
                      )}

                      {/* 일반 재련 추가 재료 (계승 모드에서는 숨김) */}
                      {!isSuccessionMode && requiredMats.hasNormalRefining && (requiredMats.needsGlacierNormal || requiredMats.needsLavaNormal) && (
                        <div className={styles.materialsSection}>
                          <div className={styles.materialsSectionTitle}>
                            일반 재련 추가 재료
                          </div>
                          {/* 2줄: 빙하의 숨결 + 책 3종 - 4개 */}
                          {requiredMats.needsGlacierNormal && (
                            <Row className={isMobile ? 'g-2 justify-content-center mb-3' : 'g-3 justify-content-center mb-3'}>
                              <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-glacier.webp"
                                  name="빙하의 숨결"
                                  amount={materials.빙하_일반}
                                  color="#34d399"
                                  cost={results.materialCosts['빙하_일반']}
                                  showEnableToggle={true}
                                  isEnabled={materialOptions.glacierBreath.enabled}
                                  onToggleEnabled={() => setMaterialOptions(p => ({...p, glacierBreath: {...p.glacierBreath, enabled: !p.glacierBreath.enabled}}))}
                                  showCheckbox={true}
                                  isBound={materialOptions.glacierBreath.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, glacierBreath: {...p.glacierBreath, isBound: !p.glacierBreath.isBound}}))}
                                />
                              </Col>
                              {requiredMats.needsArmorBook1014 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-karma.webp"
                                    name="재봉술: 업화(11~14) 방어구"
                                    amount={materials.방어구책1114 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책1114'] || 0}
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
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-karma.webp"
                                    name="재봉술: 업화(15~18) 방어구"
                                    amount={materials.방어구책1518 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책1518'] || 0}
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
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-karma.webp"
                                    name="재봉술: 업화(19~20) 방어구"
                                    amount={materials.방어구책1920 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책1920'] || 0}
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
                            <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                              <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-lava.webp"
                                  name="용암의 숨결"
                                  amount={materials.용암_일반}
                                  color="#34d399"
                                  cost={results.materialCosts['용암_일반']}
                                  showEnableToggle={true}
                                  isEnabled={materialOptions.lavaBreath.enabled}
                                  onToggleEnabled={() => setMaterialOptions(p => ({...p, lavaBreath: {...p.lavaBreath, enabled: !p.lavaBreath.enabled}}))}
                                  showCheckbox={true}
                                  isBound={materialOptions.lavaBreath.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, lavaBreath: {...p.lavaBreath, isBound: !p.lavaBreath.isBound}}))}
                                />
                              </Col>
                              {requiredMats.needsWeaponBook1014 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-karma.webp"
                                    name="야금술: 업화(11~14) 무기"
                                    amount={materials.무기책1114 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책1114'] || 0}
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
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-karma.webp"
                                    name="야금술: 업화(15~18) 무기"
                                    amount={materials.무기책1518 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책1518'] || 0}
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
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-karma.webp"
                                    name="야금술: 업화(19~20) 무기"
                                    amount={materials.무기책1920 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책1920'] || 0}
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

                      {/* 상급 재련 추가 재료 - 계승 전 모드에서만 표시 */}
                      {!isSuccessionMode && (requiredMats.needsAdvancedArmorBook1 || requiredMats.needsAdvancedArmorBook2 || requiredMats.needsAdvancedArmorBook3 || requiredMats.needsAdvancedArmorBook4 || requiredMats.needsAdvancedWeaponBook1 || requiredMats.needsAdvancedWeaponBook2 || requiredMats.needsAdvancedWeaponBook3 || requiredMats.needsAdvancedWeaponBook4) && (
                        <div className={styles.materialsSection}>
                          <div className={styles.materialsSectionTitle}>
                            상급 재련 추가 재료
                          </div>
                          {/* 4줄: 빙하의 숨결 + 장인의 재봉술 1,2,3,4단계 */}
                          {(requiredMats.needsAdvancedArmorBook1 || requiredMats.needsAdvancedArmorBook2 || requiredMats.needsAdvancedArmorBook3 || requiredMats.needsAdvancedArmorBook4) && (
                            <Row className={isMobile ? 'g-2 justify-content-center mb-3' : 'g-3 justify-content-center mb-3'}>
                              <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-glacier.webp"
                                  name="빙하의 숨결"
                                  amount={materials.빙하_상급}
                                  color="#a855f7"
                                  cost={results.materialCosts['빙하_상급']}
                                  showEnableToggle={false}
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
                                <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-tailoring-1.webp"
                                    name="장인의 재봉술 1단계"
                                    amount={materials.재봉술1단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['재봉술1단'] || 0}
                                    showEnableToggle={false}
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
                                <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-tailoring-2.webp"
                                    name="장인의 재봉술 2단계"
                                    amount={materials.재봉술2단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['재봉술2단'] || 0}
                                    showEnableToggle={false}
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
                              {requiredMats.needsAdvancedArmorBook3 && (
                                <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-tailoring-3.webp"
                                    name="장인의 재봉술 3단계"
                                    amount={materials.재봉술3단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['재봉술3단'] || 0}
                                    showEnableToggle={false}
                                    isEnabled={advancedMaterialOptions.armorNormalBook3.enabled || advancedMaterialOptions.armorBonusBook3.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={advancedMaterialOptions.armorNormalBook3.isBound && advancedMaterialOptions.armorBonusBook3.isBound}
                                    onBoundChange={() => {
                                      const newBound = !(advancedMaterialOptions.armorNormalBook3.isBound && advancedMaterialOptions.armorBonusBook3.isBound);
                                      setAdvancedMaterialOptions(p => ({
                                        ...p,
                                        armorNormalBook3: {...p.armorNormalBook3, isBound: newBound},
                                        armorBonusBook3: {...p.armorBonusBook3, isBound: newBound}
                                      }));
                                    }}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsAdvancedArmorBook4 && (
                                <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-tailoring-4.webp"
                                    name="장인의 재봉술 4단계"
                                    amount={materials.재봉술4단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['재봉술4단'] || 0}
                                    showEnableToggle={false}
                                    isEnabled={advancedMaterialOptions.armorNormalBook4.enabled || advancedMaterialOptions.armorBonusBook4.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={advancedMaterialOptions.armorNormalBook4.isBound && advancedMaterialOptions.armorBonusBook4.isBound}
                                    onBoundChange={() => {
                                      const newBound = !(advancedMaterialOptions.armorNormalBook4.isBound && advancedMaterialOptions.armorBonusBook4.isBound);
                                      setAdvancedMaterialOptions(p => ({
                                        ...p,
                                        armorNormalBook4: {...p.armorNormalBook4, isBound: newBound},
                                        armorBonusBook4: {...p.armorBonusBook4, isBound: newBound}
                                      }));
                                    }}
                                  />
                                </Col>
                              )}
                            </Row>
                          )}
                          {/* 5줄: 용암의 숨결 + 장인의 야금술 1,2,3,4단계 */}
                          {(requiredMats.needsAdvancedWeaponBook1 || requiredMats.needsAdvancedWeaponBook2 || requiredMats.needsAdvancedWeaponBook3 || requiredMats.needsAdvancedWeaponBook4) && (
                            <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                              <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-lava.webp"
                                  name="용암의 숨결"
                                  amount={materials.용암_상급}
                                  color="#a855f7"
                                  cost={results.materialCosts['용암_상급']}
                                  showEnableToggle={false}
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
                                <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-metallurgy-1.webp"
                                    name="장인의 야금술 1단계"
                                    amount={materials.야금술1단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['야금술1단'] || 0}
                                    showEnableToggle={false}
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
                                <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-metallurgy-2.webp"
                                    name="장인의 야금술 2단계"
                                    amount={materials.야금술2단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['야금술2단'] || 0}
                                    showEnableToggle={false}
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
                              {requiredMats.needsAdvancedWeaponBook3 && (
                                <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-metallurgy-3.webp"
                                    name="장인의 야금술 3단계"
                                    amount={materials.야금술3단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['야금술3단'] || 0}
                                    showEnableToggle={false}
                                    isEnabled={advancedMaterialOptions.weaponNormalBook3.enabled || advancedMaterialOptions.weaponBonusBook3.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={advancedMaterialOptions.weaponNormalBook3.isBound && advancedMaterialOptions.weaponBonusBook3.isBound}
                                    onBoundChange={() => {
                                      const newBound = !(advancedMaterialOptions.weaponNormalBook3.isBound && advancedMaterialOptions.weaponBonusBook3.isBound);
                                      setAdvancedMaterialOptions(p => ({
                                        ...p,
                                        weaponNormalBook3: {...p.weaponNormalBook3, isBound: newBound},
                                        weaponBonusBook3: {...p.weaponBonusBook3, isBound: newBound}
                                      }));
                                    }}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsAdvancedWeaponBook4 && (
                                <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/master-metallurgy-4.webp"
                                    name="장인의 야금술 4단계"
                                    amount={materials.야금술4단 || 0}
                                    color="#a855f7"
                                    cost={results.materialCosts['야금술4단'] || 0}
                                    showEnableToggle={false}
                                    isEnabled={advancedMaterialOptions.weaponNormalBook4.enabled || advancedMaterialOptions.weaponBonusBook4.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={advancedMaterialOptions.weaponNormalBook4.isBound && advancedMaterialOptions.weaponBonusBook4.isBound}
                                    onBoundChange={() => {
                                      const newBound = !(advancedMaterialOptions.weaponNormalBook4.isBound && advancedMaterialOptions.weaponBonusBook4.isBound);
                                      setAdvancedMaterialOptions(p => ({
                                        ...p,
                                        weaponNormalBook4: {...p.weaponNormalBook4, isBound: newBound},
                                        weaponBonusBook4: {...p.weaponBonusBook4, isBound: newBound}
                                      }));
                                    }}
                                  />
                                </Col>
                              )}
                            </Row>
                          )}
                        </div>
                      )}

                      {/* 6줄: 누르는 골드 + 총 소모 골드 - 2개 */}
                      <div className="mb-4">
                        <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                          <Col xs={6} sm={6} md={6} style={{ minWidth: '0' }}>
                            <MaterialCard icon="/gold.webp" name="누르는 골드" amount={materials.누골} color="#f59e0b" />
                          </Col>
                          <Col xs={6} sm={6} md={6} style={{ minWidth: '0' }}>
                            <MaterialCard
                              icon="/gold.webp"
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
                      <div className={styles.infoMessage}>
                        <span className={styles.infoMessageIcon}></span>
                        <small className={styles.infoMessageText}>
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
      </div>
    </div>
  );
}
