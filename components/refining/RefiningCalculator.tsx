'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Form, Row, Col, Card, Badge } from 'react-bootstrap';
import Image from 'next/image';
import { useTheme } from '../ThemeProvider';
import { getTries, getSuccessionTries, type CalcMode } from '../../lib/refiningSimulationData';
import { optimalBreath, optimalBreathWithBook, triesForFixedBookPolicy, type OptimalPolicy, type PreSuccessionPolicy } from '../../lib/optimalBreath';

// 계승 전 최적 정책: rec(책 종류·여부도 자유 최적화 — 토글 자동 세팅용),
// on/off(책 토글 상태를 조건으로 한 숨결 최적화 — 실제 계산·표시용),
// onEnhanced(강화 책 고정, 목표 19~20 전용)
type PreOptVariants = { rec: PreSuccessionPolicy; on: PreSuccessionPolicy; off: PreSuccessionPolicy; onEnhanced?: PreSuccessionPolicy };
import { computeOptimalAdvancedPlan, advComboLabel, type AdvStageNum } from '../../lib/optimalAdvancedRefining';
import styles from './RefiningCalculator.module.css';
// 재료 카드 컴포넌트 — MaterialCard.tsx로 분리 (완갑 평균 시뮬과 공용)
import MaterialCard from './MaterialCard';
import {
  BASE_PROBABILITY,
  SUCCESSION_BASE_PROBABILITY,
  ARMOR_MATERIAL_COSTS,
  WEAPON_MATERIAL_COSTS,
  SUCCESSION_ARMOR_MATERIAL_COSTS,
  SUCCESSION_WEAPON_MATERIAL_COSTS,
  getBreathEffect,
  getSuccessionBreathEffect,
  JANGIN_ACCUMULATE_DIVIDER,
  getBookBonusLines
} from '../../lib/refiningData';
import { MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';
import {
  calculateAdvancedRefiningMaterials,
  type AdvancedRefiningOptions as NewAdvancedRefiningOptions
} from '../../lib/advancedRefiningData';
import {
  getGradeColor,
  type Equipment as EquipmentType,
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
  방어구책1920강?: number; // 강화 재봉술 : 업화 [19-20]
  무기책1114?: number; // 야금술 : 업화 [11-14]
  무기책1518?: number; // 야금술 : 업화 [15-18]
  무기책1920?: number; // 야금술 : 업화 [19-20]
  무기책1920강?: number; // 강화 야금술 : 업화 [19-20]
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


// 책 카드 호버 툴팁: 목표 단계별 성공 확률 증가량
const bookBonusTooltip = (itemId: string): React.ReactNode => {
  const lines = getBookBonusLines(itemId);
  if (!lines) return undefined;
  return (
    <>
      <div className={styles.materialTooltipTitle}>재련 확률 증가</div>
      {lines.map(line => <div key={line}>{line}</div>)}
    </>
  );
};

type RefiningMode = 'normal' | 'succession';

type RefiningCalculatorProps = {
  onSearchComplete?: (searched: boolean) => void;
  equipments?: Equipment[];
  searched?: boolean;
  characterInfo?: { name: string; itemLevel: string; image?: string } | null;
};

export default function RefiningCalculator({
  onSearchComplete,
  equipments: externalEquipments,
  searched: externalSearched,
  characterInfo: externalCharacterInfo,
}: RefiningCalculatorProps) {
  const { theme } = useTheme();

  // Props에서 전달받은 검색 결과
  const baseEquipments = externalEquipments || [];
  const searched = externalSearched || false;
  const characterInfo = externalCharacterInfo || null;

  // 장비별 시작 강화 단계 override (사용자가 현재 상태를 직접 조정)
  // 키 = 장비명, 값 = { normal: 일반 재련 시작단계, advanced: 상급 재련 시작단계 }
  const [startOverrides, setStartOverrides] = useState<Record<string, { normal: number; advanced: number }>>({});

  // override를 적용한 실질 장비 목록 (currentLevel/currentAdvancedLevel 치환)
  // 원본 단계는 origNormal/origAdvanced로 보존
  const equipments = useMemo(() => baseEquipments.map(eq => {
    const ov = startOverrides[eq.name];
    return {
      ...eq,
      currentLevel: ov ? ov.normal : eq.currentLevel,
      currentAdvancedLevel: ov ? ov.advanced : eq.currentAdvancedLevel,
      origNormal: eq.currentLevel,
      origAdvanced: eq.currentAdvancedLevel,
    };
  }), [baseEquipments, startOverrides]);

  // 시작 단계 조정 (표 데이터 범위 내: 일반=계승전 10 / 계승후 11 ~ 25, 상급=0~40)
  const adjustStart = (eq: (typeof equipments)[number], kind: 'normal' | 'advanced', delta: number) => {
    const normalMin = eq.isSuccession ? 11 : 10;
    const nextNormal = kind === 'normal'
      ? Math.min(Math.max(eq.currentLevel + delta, normalMin), 25)
      : eq.currentLevel;
    const nextAdvanced = kind === 'advanced'
      ? Math.min(Math.max(eq.currentAdvancedLevel + delta, 0), 40)
      : eq.currentAdvancedLevel;
    setStartOverrides(prev => ({
      ...prev,
      [eq.name]: { normal: nextNormal, advanced: nextAdvanced },
    }));
    // 시작 단계가 바뀌면 해당 종류의 목표는 초기화 (목표 <= 시작 방지)
    setTargetLevels(prev => ({
      ...prev,
      [eq.name]: { ...(prev[eq.name] ?? { normal: null, advanced: null }), [kind]: null },
    }));
  };

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
    glacierBreath: { enabled: false, isBound: false, optimal: false },
    lavaBreath: { enabled: false, isBound: false, optimal: false },
    tailoring: { enabled: false, isBound: false },        // 재봉술 11~14
    tailoring1518: { enabled: false, isBound: false },    // 재봉술 15~18
    tailoring1920: { enabled: false, isBound: false },    // 재봉술 19~20
    tailoring1920Enhanced: { enabled: false, isBound: false }, // 강화 재봉술 19~20
    metallurgy: { enabled: false, isBound: false },       // 야금술 11~14
    metallurgy1518: { enabled: false, isBound: false },   // 야금술 15~18
    metallurgy1920: { enabled: false, isBound: false },   // 야금술 19~20
    metallurgy1920Enhanced: { enabled: false, isBound: false }, // 강화 야금술 19~20
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

  // 귀속 재료 상태 (기본 전부 비귀속 — 귀속 체크 시 최적 정책 계산에도 반영됨)
  const [boundMaterials, setBoundMaterials] = useState<Record<string, boolean>>({
    '수호석': false,
    '파괴석': false,
    '돌파석': false,
    '운명파편': false,
    '아비도스': false,
  });


  // 계산 모드 (중앙값/평균값/장기백)
  const [calcMode, setCalcMode] = useState<CalcMode>('median');

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
    '66112556': 0, // 강화 재봉술 책 19-20
    '66112555': 0, // 강화 야금술 책 19-20
    '66112552': 0, // 재봉술 책 15-18
    '66112551': 0, // 야금술 책 15-18
    '66112546': 0, // 재봉술 책 11-14
    '66112543': 0, // 야금술 책 11-14
    '66112712': 0, // 재봉술 1단계 (상급 1~10)
    '66112714': 0, // 재봉술 2단계 (상급 11~20)
    '66112711': 0, // 야금술 1단계 (상급 1~10)
    '66112713': 0, // 야금술 2단계 (상급 11~20)
  });

  const [materials, setMaterials] = useState<Materials | null>(null);

  // 장비 데이터가 변경되면 (새 검색) 상태 초기화
  useEffect(() => {
    if (baseEquipments.length > 0) {
      // 시작 단계 override 초기화 (새 검색 시)
      setStartOverrides({});
      // 목표 레벨 초기화 (사용자가 선택하기 전까지 null)
      const initialTargets: Record<string, { normal: number | null, advanced: number | null }> = {};
      baseEquipments.forEach(eq => {
        initialTargets[eq.name] = { normal: null, advanced: null };
      });
      setTargetLevels(initialTargets);

      // 재료 옵션 및 귀속 상태 초기화
      setMaterialOptions({
        glacierBreath: { enabled: false, isBound: false, optimal: false },
        lavaBreath: { enabled: false, isBound: false, optimal: false },
        tailoring: { enabled: false, isBound: false },
        tailoring1518: { enabled: false, isBound: false },
        tailoring1920: { enabled: false, isBound: false },
        tailoring1920Enhanced: { enabled: false, isBound: false },
        metallurgy: { enabled: false, isBound: false },
        metallurgy1518: { enabled: false, isBound: false },
        metallurgy1920: { enabled: false, isBound: false },
        metallurgy1920Enhanced: { enabled: false, isBound: false },
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
        '수호석': false,
        '파괴석': false,
        '돌파석': false,
        '운명파편': false,
        '아비도스': false,
      });
      setSelectedArmorBulkLevel({ normal: null, advanced: null });
      setSelectedWeaponBulkLevel({ normal: null, advanced: null });
    }
  }, [baseEquipments]);

  // 재료량 계산 로직 (useEffect로 분리)
  useEffect(() => {
    if (searched) {
      const newMaterials = calculateMaterials();
      setMaterials(newMaterials);
    } else {
      setMaterials(null);
    }
    // boundMaterials 의존 필수: 귀속 토글로 optimalBreathTable(최적 정책)이 바뀌면 수량도 다시 계산돼야 정확.
    // (optimalBreathTable은 이 effect보다 뒤에 선언되어 직접 못 넣지만, 그 입력을 전부 포함하므로 동일 효과)
  }, [searched, targetLevels, materialOptions, advancedMaterialOptions, equipments, calcMode, marketPrices, boundMaterials]);

  // 비용 계산 로직 (useEffect로 분리)
  useEffect(() => {
    if (!materials) {
      setResults({ totalGold: 0, materialCosts: {} });
      return;
    }

    const costs: Record<string, number> = {};
    let totalMaterialCost = 0;

    // 필요 개수 = 계산된 소모량 그대로. 귀속 재료는 아래 합산에서 통째로 제외된다.
    const need = (amount: number, _key?: string) => amount;

    // 개별 재료 비용 계산 (marketPrices는 이미 개당 가격으로 변환됨)
    costs['수호석'] = need(materials.수호석, '수호석') * (marketPrices['66102106'] || 0);
    costs['파괴석'] = need(materials.파괴석, '파괴석') * (marketPrices['66102006'] || 0);
    costs['돌파석'] = need(materials.돌파석, '돌파석') * (marketPrices['66110225'] || 0);
    costs['아비도스'] = need(materials.아비도스, '아비도스') * (marketPrices['6861012'] || 0);
    costs['운명파편'] = need(materials.운명파편, '운명파편') * (marketPrices['66130143'] || 0);

    // 계승 재료 비용 계산
    costs['수호석결정'] = need(materials.수호석결정 || 0, '수호석결정') * (marketPrices['66102107'] || 0);
    costs['파괴석결정'] = need(materials.파괴석결정 || 0, '파괴석결정') * (marketPrices['66102007'] || 0);
    costs['위대한돌파석'] = need(materials.위대한돌파석 || 0, '위대한돌파석') * (marketPrices['66110226'] || 0);
    costs['상급아비도스'] = need(materials.상급아비도스 || 0, '상급아비도스') * (marketPrices['6861013'] || 0);
    costs['빙하'] = materials.빙하 * (marketPrices['66111132'] || 0);
    costs['용암'] = materials.용암 * (marketPrices['66111131'] || 0);
    costs['빙하_일반'] = need(materials.빙하_일반, '빙하_일반') * (marketPrices['66111132'] || 0);
    costs['용암_일반'] = need(materials.용암_일반, '용암_일반') * (marketPrices['66111131'] || 0);
    costs['빙하_상급'] = need(materials.빙하_상급, '빙하_상급') * (marketPrices['66111132'] || 0);
    costs['용암_상급'] = need(materials.용암_상급, '용암_상급') * (marketPrices['66111131'] || 0);

    // 일반 재련 책 비용 (단계별)
    costs['방어구책1114'] = need(materials.방어구책1114 || 0, '방어구책1114') * (marketPrices['66112546'] || 0);  // 재봉술 [11-14]
    costs['방어구책1518'] = need(materials.방어구책1518 || 0, '방어구책1518') * (marketPrices['66112552'] || 0);  // 재봉술 [15-18]
    costs['방어구책1920'] = need(materials.방어구책1920 || 0, '방어구책1920') * (marketPrices['66112554'] || 0);  // 재봉술 [19-20]
    costs['방어구책1920강'] = need(materials.방어구책1920강 || 0, '방어구책1920강') * (marketPrices['66112556'] || 0);  // 강화 재봉술 [19-20]
    costs['무기책1114'] = need(materials.무기책1114 || 0, '무기책1114') * (marketPrices['66112543'] || 0);  // 야금술 [11-14]
    costs['무기책1518'] = need(materials.무기책1518 || 0, '무기책1518') * (marketPrices['66112551'] || 0);  // 야금술 [15-18]
    costs['무기책1920'] = need(materials.무기책1920 || 0, '무기책1920') * (marketPrices['66112553'] || 0);  // 야금술 [19-20]
    costs['무기책1920강'] = need(materials.무기책1920강 || 0, '무기책1920강') * (marketPrices['66112555'] || 0);  // 강화 야금술 [19-20]

    // 상급 재련 책 비용 (1단, 2단, 3단, 4단)
    costs['재봉술1단'] = need(materials.재봉술1단 || 0, '재봉술1단') * (marketPrices['66112712'] || 0);
    costs['재봉술2단'] = need(materials.재봉술2단 || 0, '재봉술2단') * (marketPrices['66112714'] || 0);
    costs['재봉술3단'] = need(materials.재봉술3단 || 0, '재봉술3단') * (marketPrices['66112716'] || 0);
    costs['재봉술4단'] = need(materials.재봉술4단 || 0, '재봉술4단') * (marketPrices['66112718'] || 0);
    costs['야금술1단'] = need(materials.야금술1단 || 0, '야금술1단') * (marketPrices['66112711'] || 0);
    costs['야금술2단'] = need(materials.야금술2단 || 0, '야금술2단') * (marketPrices['66112713'] || 0);
    costs['야금술3단'] = need(materials.야금술3단 || 0, '야금술3단') * (marketPrices['66112715'] || 0);
    costs['야금술4단'] = need(materials.야금술4단 || 0, '야금술4단') * (marketPrices['66112717'] || 0);

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

    // 추가 재료 비용 계산 (일반 강화 + 상급재련 + 계승) - 분리된 비용 적용
    // 계승 후 숨결도 빙하_일반/용암_일반에 포함되므로 별도 계산 불필요

    // 일반 재련 빙하 숨결 (계승 전 + 계승 후 모두 포함)
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
    // 숨결 "최적" 모드는 계승 전 책 사용을 정책이 결정하므로, 토글이 꺼져 있어도 합산 대상.
    // (정책이 책을 안 쓰면 재료량이 0이라 비용도 0)
    const armorPreOptimal = materialOptions.glacierBreath.enabled && materialOptions.glacierBreath.optimal;
    const weaponPreOptimal = materialOptions.lavaBreath.enabled && materialOptions.lavaBreath.optimal;
    if ((materialOptions.tailoring.enabled || armorPreOptimal) && !materialOptions.tailoring.isBound) {
      totalMaterialCost += costs['방어구책1114'] || 0;
    }
    if ((materialOptions.tailoring1518.enabled || armorPreOptimal) && !materialOptions.tailoring1518.isBound) {
      totalMaterialCost += costs['방어구책1518'] || 0;
    }
    if ((materialOptions.tailoring1920.enabled || armorPreOptimal) && !materialOptions.tailoring1920.isBound) {
      totalMaterialCost += costs['방어구책1920'] || 0;
    }
    if ((materialOptions.tailoring1920Enhanced.enabled || armorPreOptimal) && !materialOptions.tailoring1920Enhanced.isBound) {
      totalMaterialCost += costs['방어구책1920강'] || 0;
    }
    if ((materialOptions.metallurgy.enabled || weaponPreOptimal) && !materialOptions.metallurgy.isBound) {
      totalMaterialCost += costs['무기책1114'] || 0;
    }
    if ((materialOptions.metallurgy1518.enabled || weaponPreOptimal) && !materialOptions.metallurgy1518.isBound) {
      totalMaterialCost += costs['무기책1518'] || 0;
    }
    if ((materialOptions.metallurgy1920.enabled || weaponPreOptimal) && !materialOptions.metallurgy1920.isBound) {
      totalMaterialCost += costs['무기책1920'] || 0;
    }
    if ((materialOptions.metallurgy1920Enhanced.enabled || weaponPreOptimal) && !materialOptions.metallurgy1920Enhanced.isBound) {
      totalMaterialCost += costs['무기책1920강'] || 0;
    }

    // 상급 재련 책 비용 추가 — 재료량(costs)에 일반턴+선조턴 소모가 이미 합산되어 있으므로
    // 책 종류당 1번만 더한다 (양쪽 턴을 켜도 이중합산 금지). 켜진 쪽이 전부 귀속이면 제외.
    const addAdvBookCost = (
      normalOpt: { enabled: boolean; isBound: boolean },
      bonusOpt: { enabled: boolean; isBound: boolean },
      costKey: string
    ) => {
      const using = normalOpt.enabled || bonusOpt.enabled;
      const allBound =
        (!normalOpt.enabled || normalOpt.isBound) &&
        (!bonusOpt.enabled || bonusOpt.isBound);
      if (using && !allBound) totalMaterialCost += costs[costKey] || 0;
    };
    addAdvBookCost(advancedMaterialOptions.armorNormalBook1, advancedMaterialOptions.armorBonusBook1, '재봉술1단');
    addAdvBookCost(advancedMaterialOptions.armorNormalBook2, advancedMaterialOptions.armorBonusBook2, '재봉술2단');
    addAdvBookCost(advancedMaterialOptions.armorNormalBook3, advancedMaterialOptions.armorBonusBook3, '재봉술3단');
    addAdvBookCost(advancedMaterialOptions.armorNormalBook4, advancedMaterialOptions.armorBonusBook4, '재봉술4단');
    addAdvBookCost(advancedMaterialOptions.weaponNormalBook1, advancedMaterialOptions.weaponBonusBook1, '야금술1단');
    addAdvBookCost(advancedMaterialOptions.weaponNormalBook2, advancedMaterialOptions.weaponBonusBook2, '야금술2단');
    addAdvBookCost(advancedMaterialOptions.weaponNormalBook3, advancedMaterialOptions.weaponBonusBook3, '야금술3단');
    addAdvBookCost(advancedMaterialOptions.weaponNormalBook4, advancedMaterialOptions.weaponBonusBook4, '야금술4단');

    const totalGold = Math.round(materials.누골 + totalMaterialCost);

    setResults({ totalGold, materialCosts: costs });

  }, [materials, marketPrices, boundMaterials, materialOptions, advancedMaterialOptions]);

  // 거래소 가격 불러오기 (latest_prices.json 사용)
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const { fetchLatestPrices } = await import('@/lib/price-history-client');
        const latest = await fetchLatestPrices();

        // latest_prices.json의 가격을 marketPrices 형식으로 변환 (묶음 가격 → 개당 가격)
        const prices: Record<string, number> = {};
        Object.entries(latest).forEach(([itemId, bundlePrice]) => {
          const bundleSize = MATERIAL_BUNDLE_SIZES[Number(itemId)] || 1;
          const unitPrice = bundlePrice / bundleSize;
          prices[itemId] = unitPrice;
        });

        setMarketPrices(prices);
      } catch (error) {
        console.error('Failed to fetch latest prices:', error);
      }
    };

    fetchMarketPrices();
  }, []);

  // "최적 숨결/책" 단계별 정책 테이블 (모드 + 시세 + 귀속 기준)
  // level 키 = 현재 레벨(L→L+1). armor/weapon 각각.
  // 귀속 체크된 재료·숨결·책은 실지출 0으로 취급해 사용 쪽으로 최적화된다 (골드(누골)는 항상 실지출).
  // 보유 개수는 최적화에 반영하지 않는다(귀속 체크만) — 필요량 의존 순환/공유상태 오작동 방지.
  const optimalBreathTable = useMemo(() => {
    const armor: Record<number, OptimalPolicy> = {};
    const weapon: Record<number, OptimalPolicy> = {};
    const mp = (id: string) => marketPrices[id] || 0;
    const bnd = (key: string) => !!boundMaterials[key]; // 귀속 재료 → 실지출 0
    const glacierMkt = mp('66111132'); // 빙하 시세
    const lavaMkt = mp('66111131');    // 용암 시세
    const glacierP = materialOptions.glacierBreath.isBound ? 0 : glacierMkt;
    const lavaP = materialOptions.lavaBreath.isBound ? 0 : lavaMkt;
    for (let L = 11; L <= 24; L++) {
      const baseProb = SUCCESSION_BASE_PROBABILITY[L];
      if (!baseProb) continue;
      const be = getSuccessionBreathEffect(baseProb);
      const target = L + 1;
      const aCost = SUCCESSION_ARMOR_MATERIAL_COSTS[target];
      const wCost = SUCCESSION_WEAPON_MATERIAL_COSTS[target];
      // 1회당 재료 골드값 (시세 합 + 누골, 실링·귀속 재료 제외)
      const aMat = aCost
        ? (bnd('수호석결정') ? 0 : (aCost as any).수호석결정 * mp('66102107'))
          + (bnd('위대한돌파석') ? 0 : (aCost as any).위대한돌파석 * mp('66110226'))
          + (bnd('상급아비도스') ? 0 : (aCost as any).상급아비도스 * mp('6861013'))
          + (bnd('운명파편') ? 0 : aCost.운명파편 * mp('66130143'))
          + aCost.골드
        : 0;
      const wMat = wCost
        ? (bnd('파괴석결정') ? 0 : (wCost as any).파괴석결정 * mp('66102007'))
          + (bnd('위대한돌파석') ? 0 : (wCost as any).위대한돌파석 * mp('66110226'))
          + (bnd('상급아비도스') ? 0 : (wCost as any).상급아비도스 * mp('6861013'))
          + (bnd('운명파편') ? 0 : wCost.운명파편 * mp('66130143'))
          + wCost.골드
        : 0;
      armor[L] = optimalBreath(baseProb, be, aMat, glacierP, calcMode);
      weapon[L] = optimalBreath(baseProb, be, wMat, lavaP, calcMode);
    }

    // 계승 전(업화): 숨결 N회 + 책 사용 여부까지 최적화. 키 = 현재 레벨 (10→11 ~ 24→25)
    const preArmor: Record<number, PreOptVariants> = {};
    const preWeapon: Record<number, PreOptVariants> = {};
    for (let L = 10; L <= 24; L++) {
      const baseProb = BASE_PROBABILITY[L];
      if (!baseProb) continue;
      const be = getBreathEffect(baseProb);
      const target = L + 1;
      const aCost = ARMOR_MATERIAL_COSTS[target];
      const wCost = WEAPON_MATERIAL_COSTS[target];
      const aMat = aCost
        ? (bnd('수호석') ? 0 : aCost.수호석 * mp('66102106'))
          + (bnd('돌파석') ? 0 : aCost.돌파석 * mp('66110225'))
          + (bnd('아비도스') ? 0 : aCost.아비도스 * mp('6861012'))
          + (bnd('운명파편') ? 0 : aCost.운명파편 * mp('66130143'))
          + aCost.골드
        : 0;
      const wMat = wCost
        ? (bnd('파괴석') ? 0 : wCost.파괴석 * mp('66102006'))
          + (bnd('돌파석') ? 0 : wCost.돌파석 * mp('66110225'))
          + (bnd('아비도스') ? 0 : wCost.아비도스 * mp('6861012'))
          + (bnd('운명파편') ? 0 : wCost.운명파편 * mp('66130143'))
          + wCost.골드
        : 0;
      // 책: 목표 11~20만, 효과 = 기본확률 +100% 가산 (CASE 테이블 검증됨)
      // 강화 책: 목표 19~20 전용, 효과 = 기본확률 +200% 가산 (19단계 +6%, 20단계 +3%)
      const bookProb = target >= 11 && target <= 20 ? baseProb : 0;
      const hasEnhancedBook = target >= 19 && target <= 20;
      const aBookMkt = target <= 14 ? mp('66112546') : target <= 18 ? mp('66112552') : mp('66112554');
      const wBookMkt = target <= 14 ? mp('66112543') : target <= 18 ? mp('66112551') : mp('66112553');
      const aBookBound = target <= 14 ? materialOptions.tailoring.isBound : target <= 18 ? materialOptions.tailoring1518.isBound : materialOptions.tailoring1920.isBound;
      const wBookBound = target <= 14 ? materialOptions.metallurgy.isBound : target <= 18 ? materialOptions.metallurgy1518.isBound : materialOptions.metallurgy1920.isBound;
      const aEnhMkt = hasEnhancedBook ? mp('66112556') : 0;
      const wEnhMkt = hasEnhancedBook ? mp('66112555') : 0;
      const aEnhBound = materialOptions.tailoring1920Enhanced.isBound;
      const wEnhBound = materialOptions.metallurgy1920Enhanced.isBound;
      const mkVariants = (mat: number, breathP: number, bookMkt: number, bookBound: boolean, enhMkt: number, enhBound: boolean): PreOptVariants | null => {
        // 시세가 있는 책만 후보에 올리고, 귀속 책은 가격 0(공짜)으로 반영
        const normalBooks = bookProb > 0 && bookMkt > 0 ? [{ id: 'normal', prob: bookProb, price: bookBound ? 0 : bookMkt }] : [];
        const enhancedBooks = hasEnhancedBook && enhMkt > 0 ? [{ id: 'enhanced', prob: bookProb * 2, price: enhBound ? 0 : enhMkt }] : [];
        const rec = optimalBreathWithBook(baseProb, be, [...normalBooks, ...enhancedBooks], mat, breathP, calcMode, 'auto');
        const on = optimalBreathWithBook(baseProb, be, normalBooks, mat, breathP, calcMode, 'on');
        const off = optimalBreathWithBook(baseProb, be, [], mat, breathP, calcMode, 'off');
        const onEnhanced = enhancedBooks.length > 0 ? optimalBreathWithBook(baseProb, be, enhancedBooks, mat, breathP, calcMode, 'on') : null;
        if (!rec || !on || !off) return null;
        return { rec, on, off, ...(onEnhanced ? { onEnhanced } : {}) };
      };
      // 숨결 시세 미로딩 상태에서는 최적 정책 생략 (수동 CASE 테이블 경로 폴백)
      const pa = glacierMkt > 0 ? mkVariants(aMat, glacierP, aBookMkt, aBookBound, aEnhMkt, aEnhBound) : null;
      const pw = lavaMkt > 0 ? mkVariants(wMat, lavaP, wBookMkt, wBookBound, wEnhMkt, wEnhBound) : null;
      if (pa) preArmor[L] = pa;
      if (pw) preWeapon[L] = pw;
    }

    return { armor, weapon, preArmor, preWeapon };
    // 성능: materialOptions 객체 전체가 아니라 실제 사용하는 .isBound 값만 의존한다.
    // (사용 토글 .enabled 변경 시 ~수백만 연산의 테이블을 재계산하지 않도록)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcMode, marketPrices, boundMaterials,
    materialOptions.glacierBreath.isBound, materialOptions.lavaBreath.isBound,
    materialOptions.tailoring.isBound, materialOptions.tailoring1518.isBound,
    materialOptions.tailoring1920.isBound, materialOptions.tailoring1920Enhanced.isBound,
    materialOptions.metallurgy.isBound, materialOptions.metallurgy1518.isBound,
    materialOptions.metallurgy1920.isBound, materialOptions.metallurgy1920Enhanced.isBound]);

  // 실제 강화 대상 단계 (타입별, 계승 전/후 구분) — 최적 숨결 표시는 이 구간만
  const refinedLevelsByType = useMemo(() => {
    const armor = new Set<number>();
    const weapon = new Set<number>();
    const preArmor = new Set<number>();
    const preWeapon = new Set<number>();
    equipments.forEach(eq => {
      if (eq.isEsther) return; // 에스더는 일반 재련 없음
      const t = targetLevels[eq.name];
      if (!t?.normal || t.normal <= eq.currentLevel) return;
      const set = eq.isSuccession
        ? (eq.type === 'armor' ? armor : weapon)
        : (eq.type === 'armor' ? preArmor : preWeapon);
      for (let L = eq.currentLevel; L < t.normal; L++) set.add(L);
    });
    const sorted = (s: Set<number>) => Array.from(s).sort((a, b) => a - b);
    return {
      armor: sorted(armor),
      weapon: sorted(weapon),
      preArmor: sorted(preArmor),
      preWeapon: sorted(preWeapon),
    };
  }, [equipments, targetLevels]);

  // "최적" 클릭 시 1회: 정책이 권장하는 책 토글을 자동으로 켜준다 (권장 안 하면 끔).
  // 이후에는 사용자가 자유롭게 켜고 끌 수 있고, 계산은 토글 상태를 조건으로 숨결만 다시 최적화한다.
  // 시세 미로딩 상태에서 클릭하면 테이블이 준비된 시점에 1회 적용된다.
  const pendingBookSync = useRef<{ armor: boolean; weapon: boolean }>({ armor: false, weapon: false });

  // 최적화 입력(귀속·목표·시세·계산모드)이 바뀌면, 최적 모드가 켜진 타입은 권장 책 토글을 다시 동기화한다.
  // (아래 동기화 effect보다 먼저 선언되어야 같은 렌더 사이클에서 플래그가 소비된다)
  // 주의: 시그니처엔 `.isBound`(귀속)만 넣고 `.enabled`(사용 토글)는 넣지 않는다 —
  //       동기화가 enabled를 바꿔도 시그니처 문자열은 동일 → 재발화 없음(무한루프 차단).
  const optimalInputSignature = useMemo(() => JSON.stringify([
    boundMaterials,
    materialOptions.glacierBreath.isBound, materialOptions.lavaBreath.isBound,
    materialOptions.tailoring.isBound, materialOptions.tailoring1518.isBound,
    materialOptions.tailoring1920.isBound, materialOptions.tailoring1920Enhanced.isBound,
    materialOptions.metallurgy.isBound, materialOptions.metallurgy1518.isBound,
    materialOptions.metallurgy1920.isBound, materialOptions.metallurgy1920Enhanced.isBound,
    refinedLevelsByType, calcMode, marketPrices,
  ]), [boundMaterials, materialOptions, refinedLevelsByType, calcMode, marketPrices]);

  useEffect(() => {
    if (materialOptions.glacierBreath.enabled && materialOptions.glacierBreath.optimal) pendingBookSync.current.armor = true;
    if (materialOptions.lavaBreath.enabled && materialOptions.lavaBreath.optimal) pendingBookSync.current.weapon = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimalInputSignature]);

  useEffect(() => {
    const collect = (type: 'armor' | 'weapon'): Record<string, boolean> | null => {
      if (!pendingBookSync.current[type]) return null;
      const o = type === 'armor' ? materialOptions.glacierBreath : materialOptions.lavaBreath;
      if (!o.enabled || !o.optimal) { pendingBookSync.current[type] = false; return null; }
      const tbl = type === 'armor' ? optimalBreathTable.preArmor : optimalBreathTable.preWeapon;
      if (Object.keys(tbl).length === 0) return null; // 시세 미로딩 — 준비되면 재시도
      const levels = type === 'armor' ? refinedLevelsByType.preArmor : refinedLevelsByType.preWeapon;
      const keys = type === 'armor'
        ? { '1114': 'tailoring', '1518': 'tailoring1518', '1920': 'tailoring1920' }
        : { '1114': 'metallurgy', '1518': 'metallurgy1518', '1920': 'metallurgy1920' };
      const desired: Record<string, boolean> = {};
      levels.forEach(L => {
        const v = tbl[L];
        if (!v) return;
        const t = L + 1;
        const range = t <= 14 ? '1114' : t <= 18 ? '1518' : t <= 20 ? '1920' : '';
        if (!range) return;
        const key = keys[range as keyof typeof keys];
        if (range === '1920') {
          // 19~20은 일반/강화 책 중 정책이 고른 쪽 토글만 켠다
          desired[key] = (desired[key] || false) || (v.rec.useBook && v.rec.bookId !== 'enhanced');
          const enhKey = `${key}Enhanced`;
          desired[enhKey] = (desired[enhKey] || false) || (v.rec.useBook && v.rec.bookId === 'enhanced');
        } else {
          desired[key] = (desired[key] || false) || v.rec.useBook;
        }
      });
      // 일반/강화 책은 동시 사용 불가 — 19·20 레벨별 권장이 갈리면 강화 쪽만 켠다
      const k1920 = keys['1920'];
      if (desired[`${k1920}Enhanced`]) desired[k1920] = false;
      pendingBookSync.current[type] = false;
      return desired;
    };
    const merged = { ...(collect('armor') || {}), ...(collect('weapon') || {}) };
    const entries = Object.entries(merged);
    if (entries.length === 0) return;
    setMaterialOptions(prev => {
      let changed = false;
      const next: Record<string, { enabled: boolean; isBound: boolean; optimal?: boolean }> = { ...prev };
      for (const [key, enabled] of entries) {
        if (next[key].enabled !== enabled) {
          next[key] = { ...next[key], enabled };
          changed = true;
        }
      }
      return changed ? (next as typeof prev) : prev;
    });
  }, [materialOptions, optimalBreathTable, refinedLevelsByType]);

  // 최적 숨결 단계별 팝업 (열려있는 타입)
  const [openBreathPopup, setOpenBreathPopup] = useState<'armor' | 'weapon' | null>(null);

  // 팝업 바깥 클릭 시 닫기
  useEffect(() => {
    if (!openBreathPopup) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-breath-popup]') || t.closest('[data-breath-opt-btn]')) return;
      setOpenBreathPopup(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openBreathPopup]);

  // ── 상급재련 최적 조합 (일반턴/선조턴 숨결·책, 시세연동) ──
  // 실제 강화 대상 구간 (타입별, 1~4)
  const advStagesByType = useMemo(() => {
    const collect = (t: 'armor' | 'weapon'): AdvStageNum[] => {
      const set = new Set<AdvStageNum>();
      equipments.forEach(eq => {
        if (eq.isSuccession || eq.type !== t) return;
        const target = targetLevels[eq.name]?.advanced;
        if (!target || target <= eq.currentAdvancedLevel) return;
        for (let st = 1; st <= 4; st++) {
          if (eq.currentAdvancedLevel < st * 10 && target > (st - 1) * 10) set.add(st as AdvStageNum);
        }
      });
      return Array.from(set).sort((a, b) => a - b);
    };
    return { armor: collect('armor'), weapon: collect('weapon') };
  }, [equipments, targetLevels]);

  // 상급 최적 조합 — 시세 + 귀속(체크) 기준. 귀속 재료·숨결·책은 실지출 0으로 취급해 사용 쪽으로 최적화된다.
  // 보유 개수는 반영하지 않는다(귀속 체크만) — 필요량↔가격 피드백 루프/타입 간 공유상태 오작동 방지.
  // buildPrices('armor')는 방어구 귀속만 참조하므로 무기 귀속 토글이 방어구 최적 조합을 바꾸지 않는다.
  const advOptimalPlan = useMemo(() => {
    const mp = (id: string) => marketPrices[id] || 0;
    const basePrice = (id: string, key: string) => (boundMaterials[key] ? 0 : mp(id));

    const bookIdMap: Record<'armor' | 'weapon', Record<AdvStageNum, string>> = {
      armor: { 1: '66112712', 2: '66112714', 3: '66112716', 4: '66112718' },
      weapon: { 1: '66112711', 2: '66112713', 3: '66112715', 4: '66112717' },
    };

    const buildPrices = (type: 'armor' | 'weapon'): Record<string, number> => {
      const isArmor = type === 'armor';
      const breathBound = isArmor
        ? (advancedMaterialOptions.armorNormalBreath.isBound && advancedMaterialOptions.armorBonusBreath.isBound)
        : (advancedMaterialOptions.weaponNormalBreath.isBound && advancedMaterialOptions.weaponBonusBreath.isBound);
      const breathId = isArmor ? '66111132' : '66111131';

      const prices: Record<string, number> = {
        '66102106': basePrice('66102106', '수호석'),
        '66102006': basePrice('66102006', '파괴석'),
        '66110225': basePrice('66110225', '돌파석'),
        '6861012': basePrice('6861012', '아비도스'),
        '66130143': basePrice('66130143', '운명파편'),
        [breathId]: breathBound ? 0 : mp(breathId),
      };
      ([1, 2, 3, 4] as AdvStageNum[]).forEach(stage => {
        const id = bookIdMap[type][stage];
        const normalBound = (advancedMaterialOptions as any)[`${type}NormalBook${stage}`].isBound;
        const bonusBound = (advancedMaterialOptions as any)[`${type}BonusBook${stage}`].isBound;
        prices[id] = (normalBound && bonusBound) ? 0 : mp(id);
      });
      return prices;
    };

    const pricesLoaded = Object.values(marketPrices).some(v => v > 0);
    return {
      armor: pricesLoaded ? computeOptimalAdvancedPlan('armor', advStagesByType.armor, buildPrices('armor')) : null,
      weapon: pricesLoaded ? computeOptimalAdvancedPlan('weapon', advStagesByType.weapon, buildPrices('weapon')) : null,
    };
  }, [advStagesByType, marketPrices, boundMaterials, advancedMaterialOptions]);

  const [openAdvOptPopup, setOpenAdvOptPopup] = useState<'armor' | 'weapon' | null>(null);
  // 최적화 적용 상태 — 적용 후에는 시세 변경으로 최적 조합이 바뀔 때마다 자동 재적용(일반 재련 최적화와 동일).
  // 사용자가 일반턴/선조턴을 수동 토글하면 그 타입의 자동 재적용은 해제된다.
  const [advOptApplied, setAdvOptApplied] = useState<{ armor: boolean; weapon: boolean }>({ armor: false, weapon: false });

  useEffect(() => {
    (['armor', 'weapon'] as const).forEach(type => {
      if (!advOptApplied[type]) return;
      const plan = advOptimalPlan[type];
      if (!plan) return;
      setAdvancedMaterialOptions(prev => {
        const next = { ...prev };
        let changed = false;
        const patch = (key: string, enabled: boolean) => {
          const cur = (next as Record<string, { enabled: boolean; isBound: boolean }>)[key];
          if (cur && cur.enabled !== enabled) {
            (next as Record<string, { enabled: boolean; isBound: boolean }>)[key] = { ...cur, enabled };
            changed = true;
          }
        };
        patch(`${type}NormalBreath`, plan.normalBreath);
        patch(`${type}BonusBreath`, plan.bonusBreath);
        plan.stages.forEach(s => {
          patch(`${type}NormalBook${s.stage}`, s.normalBook);
          patch(`${type}BonusBook${s.stage}`, s.bonusBook);
        });
        return changed ? next : prev;
      });
    });
  }, [advOptimalPlan, advOptApplied]);

  useEffect(() => {
    if (!openAdvOptPopup) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-advopt-popup]') || t.closest('[data-advopt-btn]')) return;
      setOpenAdvOptPopup(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openAdvOptPopup]);

  // 최적 조합을 기존 일반턴/선조턴 옵션에 적용 + 자동 재적용 모드 진입 (수동 토글 시 해제)
  const applyAdvOptimal = (type: 'armor' | 'weapon') => {
    const plan = advOptimalPlan[type];
    if (!plan) return;
    setAdvOptApplied(p => ({ ...p, [type]: true }));
    const pre = type === 'armor' ? 'armor' : 'weapon';
    setAdvancedMaterialOptions(prev => {
      const next: Record<string, { enabled: boolean; isBound: boolean }> = { ...prev };
      const patch = (key: string, enabled: boolean) => { next[key] = { ...next[key], enabled }; };
      patch(`${pre}NormalBreath`, plan.normalBreath);
      patch(`${pre}BonusBreath`, plan.bonusBreath);
      plan.stages.forEach(s => {
        patch(`${pre}NormalBook${s.stage}`, s.normalBook);
        patch(`${pre}BonusBook${s.stage}`, s.bonusBook);
      });
      return next as typeof prev;
    });
    setOpenAdvOptPopup(null);
  };

  // 숨결 3단 모드 (미사용/풀숨/최적)
  const breathModeOf = (type: 'armor' | 'weapon'): 'off' | 'full' | 'optimal' => {
    const o = type === 'armor' ? materialOptions.glacierBreath : materialOptions.lavaBreath;
    return !o.enabled ? 'off' : (o.optimal ? 'optimal' : 'full');
  };
  const setBreathMode = (type: 'armor' | 'weapon', mode: 'off' | 'full' | 'optimal') => {
    if (mode === 'optimal') pendingBookSync.current[type] = true; // 권장 책 토글 1회 자동 세팅
    const key = type === 'armor' ? 'glacierBreath' : 'lavaBreath';
    setMaterialOptions(p => ({ ...p, [key]: { ...(p as any)[key], enabled: mode !== 'off', optimal: mode === 'optimal' } }));
  };
  const calcModeLabel = calcMode === 'median' ? '중앙값' : calcMode === 'average' ? '평균값' : '장기백';

  // 숨결 컨트롤 (미사용/풀숨/최적) — 카드 내부 하단. 귀속은 카드 우상단 라벨(다른 재료와 동일)
  // 팝업은 "최적" 버튼을 감싼 래퍼에 붙어 바로 위로 뜬다.
  const renderBreathControls = (type: 'armor' | 'weapon') => {
    const mode = breathModeOf(type);
    return (
      <div className={styles.breathControls} onClick={e => e.stopPropagation()}>
        <div className={styles.advTurnRow}>
          <div className={styles.advTurnItem}>
            <button
              type="button"
              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${mode === 'off' ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
              onClick={() => setBreathMode(type, 'off')}
            >
              미사용
            </button>
          </div>
          <div className={styles.advTurnItem}>
            <button
              type="button"
              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${mode === 'full' ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
              onClick={() => setBreathMode(type, 'full')}
            >
              풀숨
            </button>
          </div>
          <div className={styles.advTurnItem}>
            <button
              type="button"
              data-breath-opt-btn
              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${mode === 'optimal' ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
              onClick={() => setOpenBreathPopup(o => (o === type ? null : type))}
              title="시세 기준 최적 숨결 조합 (팝업에서 적용)"
            >
              최적{mode === 'optimal' ? ' ▾' : ''}
            </button>
            {renderBreathPopup(type)}
          </div>
        </div>
      </div>
    );
  };

  // 일반 재련 책 카드 하단 컨트롤 — 사용/미사용 버튼 (상급재련 카드와 동일한 느낌).
  // exclusiveWithKey를 주면 켜는 순간 반대쪽(일반/강화 등)을 자동으로 끈다.
  const renderSimpleToggle = (
    key: keyof typeof materialOptions,
    exclusiveWithKey?: keyof typeof materialOptions
  ) => (
    <div className={styles.breathControls} onClick={e => e.stopPropagation()}>
      <div className={styles.advTurnRow}>
        <div className={styles.advTurnItem}>
          <button
            type="button"
            onClick={() => setMaterialOptions(p => {
              const nextEnabled = !(p as any)[key].enabled;
              return {
                ...p,
                [key]: { ...(p as any)[key], enabled: nextEnabled },
                ...(exclusiveWithKey && nextEnabled ? { [exclusiveWithKey]: { ...(p as any)[exclusiveWithKey], enabled: false } } : {}),
              };
            })}
            className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${(materialOptions as any)[key].enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
          >
            {(materialOptions as any)[key].enabled ? '사용' : '미사용'}
          </button>
        </div>
      </div>
    </div>
  );

  // 최적 숨결 단계별 팝업 — 최적 버튼 바로 위(카드 안에서 나옴), 실제 강화 구간만·한 줄
  // 계승 전 장비가 있으면 "계승 전" 그룹도 함께 표시 (책 사용 여부 포함)
  const renderBreathPopup = (type: 'armor' | 'weapon') => {
    if (openBreathPopup !== type) return null;
    const mode = breathModeOf(type);
    const isArmor = type === 'armor';
    const tbl = isArmor ? optimalBreathTable.armor : optimalBreathTable.weapon;
    const preTbl = isArmor ? optimalBreathTable.preArmor : optimalBreathTable.preWeapon;
    const levels = isArmor ? refinedLevelsByType.armor : refinedLevelsByType.weapon;
    const preLevels = isArmor ? refinedLevelsByType.preArmor : refinedLevelsByType.preWeapon;
    const bookName = isArmor ? '재봉술' : '야금술';
    // 표시도 실제 계산과 동일하게: 책 토글 상태를 조건으로 한 정책(on/off/onEnhanced 변형)
    const preBookToggleOn = (target: number) => {
      if (target > 20) return false;
      if (isArmor) {
        return target <= 14 ? materialOptions.tailoring.enabled
          : target <= 18 ? materialOptions.tailoring1518.enabled
          : materialOptions.tailoring1920.enabled;
      }
      return target <= 14 ? materialOptions.metallurgy.enabled
        : target <= 18 ? materialOptions.metallurgy1518.enabled
        : materialOptions.metallurgy1920.enabled;
    };
    const preEnhancedToggleOn = (target: number) =>
      target >= 19 && target <= 20 &&
      (isArmor ? materialOptions.tailoring1920Enhanced.enabled : materialOptions.metallurgy1920Enhanced.enabled);
    // 계산 루프와 동일한 규칙으로 변형 선택 (일반+강화 둘 다 켜지면 비용 싼 쪽)
    const pickPrePolicy = (v: PreOptVariants, target: number): PreSuccessionPolicy => {
      if (preEnhancedToggleOn(target) && v.onEnhanced) {
        return preBookToggleOn(target) && v.on.cost <= v.onEnhanced.cost ? v.on : v.onEnhanced;
      }
      return preBookToggleOn(target) ? v.on : v.off;
    };
    const breathKindCls = (kind: OptimalPolicy['kind']) =>
      kind === 'none' ? styles.breathChipNone : kind === 'full' ? styles.breathChipFull : styles.breathChipPartial;
    const breathLabel = (p: OptimalPolicy) =>
      p.kind === 'none' ? '노숨' : p.kind === 'full' ? '풀숨' : `숨결 첫${p.optimalN}회`;
    // 책은 매 시도 1권 소모 → 권수(=시도 수)를 그대로 보여줘 재료 카드 합계와 이어지게 한다
    const preLabel = (p: PreSuccessionPolicy) => {
      if (!p.useBook) return breathLabel(p);
      const name = p.bookId === 'enhanced' ? `강화 ${bookName}` : bookName;
      return (
        <>
          <span className={styles.breathChipBookName}>{name} {Math.round(p.tries)}권</span>
          {' · '}
          {breathLabel(p)}
        </>
      );
    };
    const bothShown = levels.length > 0 && preLevels.length > 0;
    const popup = (
      <div className={styles.breathPopup} data-breath-popup onClick={e => e.stopPropagation()}>
        <div className={styles.breathPopupHeader}>
          <span className={styles.breathPopupTitle}>최적 숨결 <span className={styles.breathPopupSub}>{calcModeLabel}·시세연동</span></span>
          <button type="button" className={styles.breathPopupClose} onClick={() => setOpenBreathPopup(null)}>✕</button>
        </div>
        {levels.length === 0 && preLevels.length === 0 ? (
          <div className={styles.breathPopupEmpty}>목표 단계를 먼저 설정하세요</div>
        ) : (
          <>
            {preLevels.length > 0 && (
              <>
                {bothShown && <div className={styles.breathPopupGroupLabel}>계승 전</div>}
                <div className={styles.breathPopupLine}>
                  {preLevels.map(L => {
                    const v = preTbl[L];
                    if (!v) return null;
                    const p = pickPrePolicy(v, L + 1);
                    return (
                      <span key={L} className={`${styles.breathChip} ${breathKindCls(p.kind)}`}>
                        <span className={styles.breathChipLv}>+{L}→{L + 1}</span>
                        <span className={styles.breathChipVal}>{preLabel(p)}</span>
                      </span>
                    );
                  })}
                </div>
              </>
            )}
            {levels.length > 0 && (
              <>
                {bothShown && <div className={styles.breathPopupGroupLabel}>계승 후</div>}
                <div className={styles.breathPopupLine}>
                  {levels.map(L => {
                    const p = tbl[L];
                    if (!p) return null;
                    return (
                      <span key={L} className={`${styles.breathChip} ${breathKindCls(p.kind)}`}>
                        <span className={styles.breathChipLv}>+{L}→{L + 1}</span>
                        <span className={styles.breathChipVal}>{breathLabel(p)}</span>
                      </span>
                    );
                  })}
                </div>
              </>
            )}
            <div className={styles.advOptFooter}>
              <span className={styles.advOptSummary} />
              <button
                type="button"
                className={styles.advOptApply}
                onClick={() => setBreathMode(type, 'optimal')}
                disabled={mode === 'optimal'}
              >
                {mode === 'optimal' ? '적용됨 · 자동 갱신' : '적용'}
              </button>
            </div>
          </>
        )}
      </div>
    );
    // 모바일: 상위 transform(카드 hover, 배율 등)에 fixed가 갇히지 않도록 body 포털로 렌더
    return isMobile ? createPortal(popup, document.body) : popup;
  };

  // 상급재련 최적 조합 팝업 (단계별 일반턴/선조턴 조합 + 예상 비용) — "최적" 버튼 바로 위로 뜬다
  const renderAdvOptPopup = (type: 'armor' | 'weapon') => {
    if (openAdvOptPopup !== type) return null;
    const plan = advOptimalPlan[type];
    const hasTarget = advStagesByType[type].length > 0;
    const savePct = plan && plan.noneCost > 0
      ? Math.round((1 - plan.totalCost / plan.noneCost) * 100)
      : 0;
    const popup = (
          <div className={styles.advOptPopup} data-advopt-popup onClick={e => e.stopPropagation()}>
            <div className={styles.advOptPopupHeader}>
              <span className={styles.advOptPopupTitle}>
                숨결·{type === 'armor' ? '재봉술' : '야금술'} 최적화
                <span className={styles.advOptPopupSub}>평균·시세연동</span>
              </span>
              <button type="button" className={styles.breathPopupClose} onClick={() => setOpenAdvOptPopup(null)}>✕</button>
            </div>
            {!hasTarget ? (
              <div className={styles.breathPopupEmpty}>목표 단계를 먼저 설정하세요</div>
            ) : !plan ? (
              <div className={styles.breathPopupEmpty}>시세 불러오는 중...</div>
            ) : (
              <>
                <div className={styles.advOptChipLine}>
                  {plan.stages.map(s => (
                    <span key={s.stage} className={styles.advOptChip}>
                      <span className={styles.advOptChipLv}>{(s.stage - 1) * 10}~{s.stage * 10}단계</span>
                      <span className={styles.advOptChipTurn}>일반턴 <b className={styles.advOptChipVal}>{advComboLabel(plan.normalBreath, s.normalBook)}</b></span>
                      <span className={styles.advOptChipDot}>·</span>
                      <span className={styles.advOptChipTurn}>선조턴 <b className={styles.advOptChipVal}>{advComboLabel(plan.bonusBreath, s.bonusBook)}</b></span>
                    </span>
                  ))}
                </div>
                <div className={styles.advOptFooter}>
                  <span className={styles.advOptSummary}>
                    <b className={styles.advOptGold}>{Math.round(plan.totalCost / 10000).toLocaleString()}만G</b>
                    {savePct > 0 && <em className={styles.advOptSave}> · 미사용 대비 -{savePct}%</em>}
                  </span>
                  <button type="button" className={styles.advOptApply} onClick={() => applyAdvOptimal(type)} disabled={advOptApplied[type]}>
                    {advOptApplied[type] ? '적용됨 · 자동 갱신' : '적용'}
                  </button>
                </div>
              </>
            )}
          </div>
    );
    // 모바일: 상위 transform에 fixed가 갇히지 않도록 body 포털로 렌더
    return isMobile ? createPortal(popup, document.body) : popup;
  };

  // 상급재련 재료 카드 하단 컨트롤 — 일반턴/선조턴 사용 여부를 라벨+토글 버튼 쌍(이전 디자인 느낌)으로 각각 표시.
  // 숨결 카드에는 optType을 넘겨 "최적화" 버튼(+팝업)도 같은 자리에 함께 배치한다.
  const renderAdvTurnToggle = (
    normalKey: keyof typeof advancedMaterialOptions,
    bonusKey: keyof typeof advancedMaterialOptions,
    optType?: 'armor' | 'weapon'
  ) => {
    // 수동 토글 = 사용자가 직접 제어 → 해당 타입의 최적화 자동 재적용 해제
    const advType: 'armor' | 'weapon' = String(normalKey).startsWith('armor') ? 'armor' : 'weapon';
    const manualToggle = (key: keyof typeof advancedMaterialOptions) => {
      setAdvOptApplied(p => ({ ...p, [advType]: false }));
      setAdvancedMaterialOptions(p => ({ ...p, [key]: { ...p[key], enabled: !p[key].enabled } }));
    };
    return (
    <div className={styles.breathControls} onClick={e => e.stopPropagation()}>
      <div className={styles.advTurnRow}>
        <div className={styles.advTurnItem}>
          <span className={`${styles.advTurnItemLabel} ${isMobile ? styles.advTurnItemLabelMobile : ''}`}>일반턴</span>
          <button
            type="button"
            onClick={() => manualToggle(normalKey)}
            className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions[normalKey].enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
          >
            {advancedMaterialOptions[normalKey].enabled ? '사용' : '미사용'}
          </button>
        </div>
        <div className={styles.advTurnItem}>
          <span className={`${styles.advTurnItemLabel} ${isMobile ? styles.advTurnItemLabelMobile : ''}`}>선조턴</span>
          <button
            type="button"
            onClick={() => manualToggle(bonusKey)}
            className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${advancedMaterialOptions[bonusKey].enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
          >
            {advancedMaterialOptions[bonusKey].enabled ? '사용' : '미사용'}
          </button>
        </div>
        {optType && (
          <div className={`${styles.advTurnItem} ${styles.advTurnOptItem} ${isMobile ? styles.advTurnOptItemMobile : ''}`}>
            <span className={`${styles.advTurnItemLabel} ${isMobile ? styles.advTurnItemLabelMobile : ''}`}>최적화</span>
            <button
              type="button"
              data-advopt-btn
              onClick={() => setOpenAdvOptPopup(o => (o === optType ? null : optType))}
              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${openAdvOptPopup === optType ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
              title="시세 기준 최적 숨결·책 조합"
            >
              {openAdvOptPopup === optType ? '보는 중' : '확인'}
            </button>
            {renderAdvOptPopup(optType)}
          </div>
        )}
      </div>
    </div>
    );
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

      // 모든 장비 포함 (업화/전율 상관없이) - 각 장비의 isSuccession 속성으로 계산 방식 결정
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

          // 레벨별 책 필요 여부 확인 (계승 후 장비는 책 사용 불가)
          if (!eq.isSuccession) {
            for (let level = eq.currentLevel; level < targets.normal; level++) {
              const nextLevel = level + 1;
              if (nextLevel >= 11 && nextLevel <= 14) needsArmorBook1014 = true;
              if (nextLevel >= 15 && nextLevel <= 18) needsArmorBook1518 = true;
              if (nextLevel >= 19 && nextLevel <= 20) needsArmorBook1920 = true;
            }
          }
        } else {
          needsWeapon = true;
          needsLavaNormal = true;

          // 레벨별 책 필요 여부 확인 (계승 후 장비는 책 사용 불가)
          if (!eq.isSuccession) {
            for (let level = eq.currentLevel; level < targets.normal; level++) {
              const nextLevel = level + 1;
              if (nextLevel >= 11 && nextLevel <= 14) needsWeaponBook1014 = true;
              if (nextLevel >= 15 && nextLevel <= 18) needsWeaponBook1518 = true;
              if (nextLevel >= 19 && nextLevel <= 20) needsWeaponBook1920 = true;
            }
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
      방어구책1114: 0, 방어구책1518: 0, 방어구책1920: 0, 방어구책1920강: 0,
      무기책1114: 0, 무기책1518: 0, 무기책1920: 0, 무기책1920강: 0,
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

          // 장비별 계승 여부에 따라 다른 확률과 재료 테이블 사용
          // 계승 데이터에서 키는 "현재 레벨" (예: 키 11 = 11→12 재련 재료)
          if (eq.isSuccession) {
            // 계승은 11~24 레벨 데이터 있음 (11→12 ~ 24→25)
            const baseProb = SUCCESSION_BASE_PROBABILITY[level];
            if (!baseProb) continue;

            // 숨결 옵션 (미사용/풀숨/최적)
            const isArmor = eq.type === 'armor';
            const breathOpt = isArmor ? materialOptions.glacierBreath : materialOptions.lavaBreath;
            const useBreath = breathOpt.enabled;
            const useOptimal = breathOpt.enabled && breathOpt.optimal;

            // 숨결 효과 (비용 계산용) - 계승 후용 테이블 사용
            const breathEffect = getSuccessionBreathEffect(baseProb);

            const materialCostPerTry = isArmor
              ? SUCCESSION_ARMOR_MATERIAL_COSTS[nextLevel]
              : SUCCESSION_WEAPON_MATERIAL_COSTS[nextLevel];

            if (!materialCostPerTry) continue;

            // 시도 횟수 / 숨결 개수 결정
            let avgTries: number;
            let breathCount: number;
            if (useOptimal) {
              // 최적 숨결: 앞 N회만 풀숨 (현재 모드+시세 기준 DP)
              const pol = (isArmor ? optimalBreathTable.armor : optimalBreathTable.weapon)[level];
              if (!pol) continue;
              avgTries = pol.tries;
              breathCount = pol.breaths;
            } else {
              avgTries = getSuccessionTries(level, useBreath, calcMode);
              breathCount = useBreath ? breathEffect.max * avgTries : 0;
            }
            if (avgTries === 0) continue;

            if (isArmor) {
              totalMaterials.수호석결정 = (totalMaterials.수호석결정 || 0) + (materialCostPerTry as any).수호석결정 * avgTries;
              if (breathCount > 0) {
                totalMaterials.빙하 += breathCount;
                totalMaterials.빙하_일반 += breathCount;
              }
            } else {
              totalMaterials.파괴석결정 = (totalMaterials.파괴석결정 || 0) + (materialCostPerTry as any).파괴석결정 * avgTries;
              if (breathCount > 0) {
                totalMaterials.용암 += breathCount;
                totalMaterials.용암_일반 += breathCount;
              }
            }
            totalMaterials.위대한돌파석 = (totalMaterials.위대한돌파석 || 0) + (materialCostPerTry as any).위대한돌파석 * avgTries;
            totalMaterials.상급아비도스 = (totalMaterials.상급아비도스 || 0) + (materialCostPerTry as any).상급아비도스 * avgTries;
            totalMaterials.운명파편 += materialCostPerTry.운명파편 * avgTries;
            totalMaterials.실링 = (totalMaterials.실링 || 0) + (materialCostPerTry as any).실링 * avgTries;
            totalMaterials.누골 += materialCostPerTry.골드 * avgTries;
          } else {
            // 계승 전 로직 (숨결 "최적" 모드 시 숨결 N회 + 책 여부를 시세 기준 정책으로 결정)
            const isArmorPre = eq.type === 'armor';
            const breathOptPre = isArmorPre ? materialOptions.glacierBreath : materialOptions.lavaBreath;

            // 레벨에 따라 적절한 책 옵션 확인
            let useBook = false;
            let useEnhancedBook = false; // 강화 책 (목표 19~20 전용)
            let bookType = '';
            if (nextLevel >= 11 && nextLevel <= 14) {
              useBook = isArmorPre ? materialOptions.tailoring.enabled : materialOptions.metallurgy.enabled;
              bookType = '1114';
            } else if (nextLevel >= 15 && nextLevel <= 18) {
              useBook = isArmorPre ? materialOptions.tailoring1518.enabled : materialOptions.metallurgy1518.enabled;
              bookType = '1518';
            } else if (nextLevel >= 19 && nextLevel <= 20) {
              useBook = isArmorPre ? materialOptions.tailoring1920.enabled : materialOptions.metallurgy1920.enabled;
              useEnhancedBook = isArmorPre ? materialOptions.tailoring1920Enhanced.enabled : materialOptions.metallurgy1920Enhanced.enabled;
              bookType = '1920';
            }

            // 최적 모드: 책은 사용자 토글을 조건으로 두고(끄면 계산에서도 빠짐),
            // 그 조건에서의 최적 숨결 정책(on/off/onEnhanced 변형)을 적용
            // 일반+강화 둘 다 켜져 있으면 기대 비용이 싼 쪽을 레벨별로 선택
            const polSet = breathOptPre.enabled && breathOptPre.optimal
              ? (isArmorPre ? optimalBreathTable.preArmor : optimalBreathTable.preWeapon)[level]
              : undefined;
            let polPre: PreSuccessionPolicy | undefined;
            if (polSet) {
              if (bookType === '1920' && useEnhancedBook && polSet.onEnhanced) {
                polPre = useBook && polSet.on.cost <= polSet.onEnhanced.cost ? polSet.on : polSet.onEnhanced;
              } else {
                polPre = bookType && useBook ? polSet.on : polSet.off;
              }
            }

            let usedEnhanced = false; // 이번 레벨에서 실제로 강화 책을 소모하는가
            let avgTries: number;
            let breathTotal: number;
            if (polPre) {
              avgTries = polPre.tries;
              breathTotal = polPre.breaths;
              useBook = polPre.useBook; // 책 미지원 레벨이면 정책상 false
              usedEnhanced = polPre.bookId === 'enhanced';
            } else {
              const useBreath = breathOptPre.enabled;
              if (bookType === '1920' && useEnhancedBook) {
                // 강화 책은 CASE 테이블에 없어 DP로 직접 계산 (가산 확률 = 기본확률 x2)
                const m = triesForFixedBookPolicy(BASE_PROBABILITY[level], getBreathEffect(BASE_PROBABILITY[level]), useBreath, BASE_PROBABILITY[level] * 2, calcMode);
                avgTries = m.tries;
                breathTotal = m.breaths;
                useBook = true;
                usedEnhanced = true;
              } else {
                avgTries = getTries(nextLevel, useBreath, useBook, calcMode);
                breathTotal = useBreath ? getBreathEffect(BASE_PROBABILITY[level]).max * avgTries : 0;
              }
            }
            if (avgTries === 0) continue;

            const materialCostPerTry = isArmorPre
              ? ARMOR_MATERIAL_COSTS[nextLevel]
              : WEAPON_MATERIAL_COSTS[nextLevel];

            if (isArmorPre) {
              totalMaterials.수호석 += (materialCostPerTry as any).수호석 * avgTries;
              if (breathTotal > 0) {
                totalMaterials.빙하 += breathTotal;
                totalMaterials.빙하_일반 += breathTotal;
              }
              if (useBook && bookType) {
                if (bookType === '1114') totalMaterials.방어구책1114 = (totalMaterials.방어구책1114 || 0) + avgTries;
                if (bookType === '1518') totalMaterials.방어구책1518 = (totalMaterials.방어구책1518 || 0) + avgTries;
                if (bookType === '1920') {
                  if (usedEnhanced) totalMaterials.방어구책1920강 = (totalMaterials.방어구책1920강 || 0) + avgTries;
                  else totalMaterials.방어구책1920 = (totalMaterials.방어구책1920 || 0) + avgTries;
                }
              }
            } else { // weapon
              totalMaterials.파괴석 += (materialCostPerTry as any).파괴석 * avgTries;
              if (breathTotal > 0) {
                totalMaterials.용암 += breathTotal;
                totalMaterials.용암_일반 += breathTotal;
              }
              if (useBook && bookType) {
                if (bookType === '1114') totalMaterials.무기책1114 = (totalMaterials.무기책1114 || 0) + avgTries;
                if (bookType === '1518') totalMaterials.무기책1518 = (totalMaterials.무기책1518 || 0) + avgTries;
                if (bookType === '1920') {
                  if (usedEnhanced) totalMaterials.무기책1920강 = (totalMaterials.무기책1920강 || 0) + avgTries;
                  else totalMaterials.무기책1920 = (totalMaterials.무기책1920 || 0) + avgTries;
                }
              }
            }
            totalMaterials.돌파석 += materialCostPerTry.돌파석 * avgTries;
            totalMaterials.아비도스 += materialCostPerTry.아비도스 * avgTries;
            totalMaterials.운명파편 += materialCostPerTry.운명파편 * avgTries;
            totalMaterials.실링 = (totalMaterials.실링 || 0) + (materialCostPerTry as any).실링 * avgTries;
            totalMaterials.누골 += materialCostPerTry.골드 * avgTries;
          }
        }
      }

      // 2. 상급 재련 재료 계산 (전율 장비는 상급 재련 없음)
      if (!eq.isSuccession && targets.advanced && targets.advanced > eq.currentAdvancedLevel) {
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
        totalMaterials.실링 = (totalMaterials.실링 || 0) + (advancedMaterials['실링'] || 0);
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

  // 시작 단계 override + 목표를 반영한 현재/예상 아이템 레벨 계산
  // - baselineOffset: 시작 단계를 원본과 다르게 조정한 만큼 현재 아이템레벨 보정
  // - targetIncrease: 목표 단계까지의 아이템레벨 증가량
  const itemLevelSummary = useMemo(() => {
    if (!characterInfo) return null;
    const real = parseFloat(characterInfo.itemLevel.replace(/,/g, ''));
    if (isNaN(real)) return null;

    let baselineOffset = 0;
    let targetIncrease = 0;
    equipments.forEach(eq => {
      // 일반 강화: 1단계당 0.8333 / 상급 재련: 1단계당 0.16666
      baselineOffset += (eq.currentLevel - eq.origNormal) * 0.8333;
      baselineOffset += (eq.currentAdvancedLevel - eq.origAdvanced) * (0.8333 / 5);

      const targets = targetLevels[eq.name];
      if (!targets) return;
      if (targets.normal && targets.normal > eq.currentLevel) {
        targetIncrease += (targets.normal - eq.currentLevel) * 0.8333;
      }
      if (targets.advanced && targets.advanced > eq.currentAdvancedLevel) {
        targetIncrease += (targets.advanced - eq.currentAdvancedLevel) * (0.8333 / 5);
      }
    });

    const current = real + baselineOffset;
    return {
      current,
      expected: current + targetIncrease,
      increase: targetIncrease,
    };
  }, [characterInfo, equipments, targetLevels]);

  // 아이템 레벨 표시용 포맷 (쉼표 + 소수점 2자리)
  const formatItemLevel = (n: number): string =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={styles.container}>
      {/* 장비 정보 및 목표 레벨 설정 */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(0.25rem, 2vw, 1rem)', marginTop: 'clamp(1rem, 3vw, 1.5rem)' }}>
        <>
          {/* 캐릭터 정보 헤더 */}
          {/* 부위별 목표 레벨 설정 */}
          <div style={{ position: 'relative' }}>
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
                          <Image
                            src={characterInfo.image}
                            alt={characterInfo.name}
                            fill
                            sizes="(max-width: 576px) 80px, 120px"
                            style={{ objectFit: 'cover' }}
                            priority
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
                          {/* 현재 레벨 (시작 단계 조정 반영) */}
                          <div className={styles.levelBox}>
                            <div className={styles.levelLabel}>Current Level</div>
                            <div className={styles.characterLevel}>
                              {itemLevelSummary ? formatItemLevel(itemLevelSummary.current) : characterInfo.itemLevel}
                            </div>
                          </div>

                          {/* 화살표 (예상 증가가 있을 때만) */}
                          {itemLevelSummary && itemLevelSummary.increase > 0 && (
                            <div className={styles.levelArrow}>→</div>
                          )}

                          {/* 예상 레벨 */}
                          {itemLevelSummary && itemLevelSummary.increase > 0 && (
                            <div className={styles.levelBox}>
                              <div className={styles.levelLabel}>Expected Level</div>
                              <div className={styles.expectedLevel}>
                                {formatItemLevel(itemLevelSummary.expected)}
                                <span className={styles.levelBadge}>
                                  +{itemLevelSummary.increase.toFixed(2)}
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

                  // 모든 장비 활성화 (업화/전율 구분 없이)
                  // 에스더 장비도 상급 재련 가능
                  const isEquipmentDisabled = false;

                  // 에스더/계승 장비 특별 클래스
                  const specialCardClass = eq.isEsther
                    ? styles.equipmentCardEsther
                    : (eq.isSuccession ? styles.equipmentCardSuccession : '');

                  return (
                    <Col key={index} xs={4} sm={6} md={4} lg={2}>
                      <div
                        className={`${styles.equipmentCard} ${isMobile ? styles.equipmentCardMobile : ''} ${isChanged && !eq.isEsther ? styles.equipmentCardChanged : ''} ${isChanged && isMobile && !eq.isEsther ? styles.equipmentCardMobileChanged : ''} ${isEquipmentDisabled ? styles.equipmentCardDisabled : ''} ${specialCardClass}`}
                        style={{
                          background: theme === 'dark' ? '#1f2937' : '#ffffff',
                          border: 'none',
                        }}
                      >
                        <div className="d-flex align-items-center" style={{ marginBottom: isMobile ? '0.3rem' : '0.5rem', gap: isMobile ? '0.4rem' : '0.6rem' }}>
                          {/* 장비 아이콘 */}
                          {eq.icon && (
                            <div style={{
                              width: eq.isSuccession ? (isMobile ? '52px' : '68px') : (isMobile ? '36px' : '48px'),
                              height: eq.isSuccession ? (isMobile ? '52px' : '68px') : (isMobile ? '36px' : '48px'),
                              flexShrink: 0,
                              position: 'relative',
                              marginLeft: eq.isSuccession ? (isMobile ? '-4px' : '-6px') : 0,
                              marginRight: eq.isSuccession ? (isMobile ? '-4px' : '-6px') : 0,
                            }}>
                              <Image
                                src={eq.icon}
                                alt={eq.name}
                                width={isMobile ? 36 : 48}
                                height={isMobile ? 36 : 48}
                                style={{
                                  objectFit: 'contain',
                                  position: eq.isSuccession ? 'absolute' : 'relative',
                                  top: eq.isSuccession ? '50%' : undefined,
                                  left: eq.isSuccession ? '50%' : undefined,
                                  transform: eq.isSuccession ? 'translate(-50%, -50%)' : undefined,
                                }}
                                unoptimized
                              />
                              {/* 전율 장비 테두리 이미지 */}
                              {eq.isSuccession && (
                                <Image
                                  src="/wjsdbf3.webp"
                                  alt=""
                                  width={isMobile ? 52 : 68}
                                  height={isMobile ? 52 : 68}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    pointerEvents: 'none',
                                  }}
                                  unoptimized
                                />
                              )}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                              <span className={`${styles.equipmentName} ${isMobile ? styles.equipmentNameMobile : ''}`}>
                                {eq.name}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              {/* 에스더는 일반 재련이 없어 조정 불가 - 정보용 배지만 표시 */}
                              {eq.isEsther && (
                                <Badge
                                  pill
                                  bg=""
                                  className={`${styles.levelBadgeEsther} ${isMobile ? styles.levelBadgeMobile : ''}`}
                                >
                                  +{eq.currentLevel}
                                </Badge>
                              )}
                              {/* 일반 재련 시작 단계 스템퍼 (에스더는 일반 재련 없음) */}
                              {!eq.isEsther && (
                                <div className={`${styles.startStepper} ${isMobile ? styles.startStepperMobile : ''}`}>
                                  <button
                                    type="button"
                                    className={`${styles.startStepperBtn} ${isMobile ? styles.startStepperBtnMobile : ''}`}
                                    onClick={() => adjustStart(eq, 'normal', -1)}
                                    disabled={eq.currentLevel <= (eq.isSuccession ? 11 : 10)}
                                    aria-label="일반 시작 단계 감소"
                                  >
                                    −
                                  </button>
                                  <Badge
                                    pill
                                    bg=""
                                    className={`${eq.type === 'weapon' ? styles.levelBadgeWeapon : styles.levelBadgeArmor} ${isMobile ? styles.levelBadgeMobile : ''}`}
                                  >
                                    +{eq.currentLevel}
                                  </Badge>
                                  <button
                                    type="button"
                                    className={`${styles.startStepperBtn} ${isMobile ? styles.startStepperBtnMobile : ''}`}
                                    onClick={() => adjustStart(eq, 'normal', 1)}
                                    disabled={eq.currentLevel >= 25}
                                    aria-label="일반 시작 단계 증가"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                              {/* 상급 재련 시작 단계 스템퍼 (에스더 또는 상급 보유 업화 장비) */}
                              {(eq.isEsther || (!eq.isSuccession && eq.origAdvanced > 0)) && (
                                <div className={`${styles.startStepper} ${isMobile ? styles.startStepperMobile : ''}`}>
                                  <button
                                    type="button"
                                    className={`${styles.startStepperBtn} ${isMobile ? styles.startStepperBtnMobile : ''}`}
                                    onClick={() => adjustStart(eq, 'advanced', -1)}
                                    disabled={eq.currentAdvancedLevel <= 0}
                                    aria-label="상급 시작 단계 감소"
                                  >
                                    −
                                  </button>
                                  <Badge
                                    pill
                                    bg=""
                                    className={`${styles.advancedLevelBadge} ${isMobile ? styles.advancedLevelBadgeMobile : ''}`}
                                  >
                                    상+{eq.currentAdvancedLevel}
                                  </Badge>
                                  <button
                                    type="button"
                                    className={`${styles.startStepperBtn} ${isMobile ? styles.startStepperBtnMobile : ''}`}
                                    onClick={() => adjustStart(eq, 'advanced', 1)}
                                    disabled={eq.currentAdvancedLevel >= 40}
                                    aria-label="상급 시작 단계 증가"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: isMobile ? '0.15rem' : '0.3rem',
                          flexDirection: 'column',
                          minHeight: eq.isSuccession
                            ? (isMobile ? '24px' : '32px')
                            : (isMobile ? '50px' : '68px'),
                          justifyContent: 'flex-start'
                        }}>
                          {eq.isEsther ? (
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
                              {/* 에스더 장비는 상급 재련만 가능 */}
                              <Form.Select
                                value={targets.advanced ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTargetLevels(prev => ({
                                    ...prev,
                                    [eq.name]: { ...(prev[eq.name] ?? { normal: null, advanced: null }), advanced: value === '' ? null : Number(value) }
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
                            </>
                          ) : (
                            <>
                              <Form.Select
                                value={targets.normal ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTargetLevels(prev => ({
                                    ...prev,
                                    [eq.name]: { ...(prev[eq.name] ?? { normal: null, advanced: null }), normal: value === '' ? null : Number(value) }
                                  }));
                                }}
                                disabled={isEquipmentDisabled}
                                className={`${styles.equipmentSelect} ${isMobile ? styles.equipmentSelectMobile : ''} ${targets.normal === null ? styles.equipmentSelectEmpty : styles.equipmentSelectSelected}`}
                              >
                                <option value="">+{eq.currentLevel}</option>
                                {Array.from({ length: (eq.isSuccession ? 25 : 26) - eq.currentLevel }, (_, i) => eq.currentLevel + i + 1).map(level => (
                                  <option key={level} value={level}>+{level}</option>
                                ))}
                              </Form.Select>
                              {/* 업화 장비만 상급 재련 가능 */}
                              {!eq.isSuccession && (
                                <Form.Select
                                  value={targets.advanced ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setTargetLevels(prev => ({
                                      ...prev,
                                      [eq.name]: { ...(prev[eq.name] ?? { normal: null, advanced: null }), advanced: value === '' ? null : Number(value) }
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
                        방어구
                      </div>
                      <div className={`${styles.bulkButtonGroup} ${isMobile ? styles.bulkButtonGroupMobile : ''}`}>
                        {(() => {
                          // 모든 방어구 필터링 (에스더 제외)
                          const armorEquipments = equipments.filter(eq =>
                            eq.type === 'armor' &&
                            !eq.isEsther
                          );
                          const minArmorLevel = armorEquipments.length > 0
                            ? Math.min(...armorEquipments.map(eq => eq.currentLevel))
                            : 10;
                          const startLevel = Math.max(minArmorLevel, 11);
                          const maxLevel = 25;
                          return Array.from({ length: maxLevel - startLevel + 1 }, (_, i) => i + startLevel);
                        })().map(level => {
                          // 모든 방어구 체크 (에스더 제외)
                          const hasArmor = equipments.some(eq =>
                            eq.type === 'armor' &&
                            !eq.isEsther &&
                            eq.currentLevel < level
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
                                    // 모든 방어구 대상 (에스더 제외)
                                    if (eq.type === 'armor' && !eq.isEsther) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: null };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedArmorBulkLevel(prev => ({ ...prev, normal: null }));
                                } else {
                                  // 새로운 목표 설정
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    // 모든 방어구 대상 (에스더 제외)
                                    if (eq.type === 'armor' && !eq.isEsther && eq.currentLevel < level) {
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
                        무기
                      </div>
                      <div className={`${styles.bulkButtonGroup} ${isMobile ? styles.bulkButtonGroupMobile : ''}`}>
                        {(() => {
                          // 모든 무기 필터링 (에스더 제외)
                          const weaponEquipments = equipments.filter(eq =>
                            eq.type === 'weapon' &&
                            !eq.isEsther
                          );
                          const minWeaponLevel = weaponEquipments.length > 0
                            ? Math.min(...weaponEquipments.map(eq => eq.currentLevel))
                            : 10;
                          const startLevel = Math.max(minWeaponLevel, 11);
                          const maxLevel = 25;
                          return Array.from({ length: maxLevel - startLevel + 1 }, (_, i) => i + startLevel);
                        })().map(level => {
                          // 모든 무기 체크 (에스더 제외)
                          const hasWeapon = equipments.some(eq =>
                            eq.type === 'weapon' &&
                            !eq.isEsther &&
                            eq.currentLevel < level
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
                                    // 모든 무기 대상 (에스더 제외)
                                    if (eq.type === 'weapon' && !eq.isEsther) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: null };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedWeaponBulkLevel(prev => ({ ...prev, normal: null }));
                                } else {
                                  // 새로운 목표 설정
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    // 모든 무기 대상 (에스더 제외)
                                    if (eq.type === 'weapon' && !eq.isEsther && eq.currentLevel < level) {
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

                    {/* 상급재련 섹션 - 업화 장비에만 적용 (전율 장비는 상급 재련 없음) */}
                    {equipments.some(eq => !eq.isSuccession && !eq.isEsther) && (
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

                    {/* 방어구 상급 일괄 설정 (숨결·책 사용 여부는 "상급 재련 추가 재료" 카드에서 직접 설정) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'auto' : '1fr',
                      gap: isMobile ? '0.4rem' : '2rem',
                      alignItems: 'center',
                      marginBottom: isMobile ? '0.6rem' : '1rem'
                    }}>
                      {/* 모바일: 라벨+버튼은 전체 폭 첫 줄, 목표 2x2는 좌측 열 (display:contents로 그리드에 직접 배치) */}
                      <div style={{ display: isMobile ? 'contents' : undefined }}>
                        <div style={{
                          gridColumn: isMobile ? '1 / -1' : undefined,
                          fontSize: isMobile ? '0.85rem' : 'clamp(0.8rem, 1.7vw, 0.9rem)',
                          color: 'var(--text-secondary)',
                          marginBottom: isMobile ? 0 : '0.5rem',
                          fontWeight: '600'
                        }}>
                          방어구 (상급)
                        </div>
                        <div style={{
                          display: isMobile ? 'grid' : 'flex',
                          gridTemplateColumns: isMobile ? 'repeat(2, max-content)' : undefined,
                          gap: isMobile ? '0.3rem' : '0.5rem',
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
                    </div>

                    {/* 무기 상급 일괄 설정 (숨결·책 사용 여부는 "상급 재련 추가 재료" 카드에서 직접 설정) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'auto' : '1fr',
                      gap: isMobile ? '0.4rem' : '2rem',
                      alignItems: 'center'
                    }}>
                      {/* 모바일: 라벨+버튼은 전체 폭 첫 줄, 목표 2x2는 좌측 열 (display:contents로 그리드에 직접 배치) */}
                      <div style={{ display: isMobile ? 'contents' : undefined }}>
                        <div style={{
                          gridColumn: isMobile ? '1 / -1' : undefined,
                          fontSize: isMobile ? '0.85rem' : 'clamp(0.8rem, 1.7vw, 0.9rem)',
                          color: 'var(--text-secondary)',
                          marginBottom: isMobile ? 0 : '0.5rem',
                          fontWeight: '600'
                        }}>
                          무기 (상급)
                        </div>
                        <div style={{
                          display: isMobile ? 'grid' : 'flex',
                          gridTemplateColumns: isMobile ? 'repeat(2, max-content)' : undefined,
                          gap: isMobile ? '0.3rem' : '0.5rem',
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h5 className={`mb-0 ${styles.cardTitle}`}>
                    예상 소모 재료
                  </h5>
                  <div className={styles.calcModeSelector}>
                    <button
                      className={`${styles.calcModeBtn} ${calcMode === 'median' ? styles.calcModeBtnActive : ''}`}
                      onClick={() => setCalcMode('median')}
                    >
                      중앙값
                    </button>
                    <button
                      className={`${styles.calcModeBtn} ${calcMode === 'average' ? styles.calcModeBtnActive : ''}`}
                      onClick={() => setCalcMode('average')}
                    >
                      평균값
                    </button>
                    <button
                      className={`${styles.calcModeBtn} ${calcMode === 'pity' ? styles.calcModeBtnActive : ''}`}
                      onClick={() => setCalcMode('pity')}
                    >
                      장기백
                    </button>
                  </div>
                </div>
              </Card.Header>
              <Card.Body className={styles.cardBody} style={{
                padding: isMobile ? '0.75rem 0.5rem' : undefined
              }}>
                {(() => {
                  const requiredMats = analyzeRequiredMaterials();

                  return (
                    <>
                      {/* 1줄: 기본 재료 - 업화/전율 장비 재료 모두 표시 (해당하는 것만) */}
                      <div className={styles.materialsSection}>
                        <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                          {/* 업화 장비 재료 (일반 재련) */}
                          {materials.수호석 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-guardian-stone.webp" name="수호석" amount={materials.수호석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['수호석']} onBoundChange={handleBoundChange} cost={results.materialCosts['수호석']} />
                            </Col>
                          )}
                          {materials.파괴석 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-destruction-stone.webp" name="파괴석" amount={materials.파괴석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['파괴석']} onBoundChange={handleBoundChange} cost={results.materialCosts['파괴석']} />
                            </Col>
                          )}
                          {materials.돌파석 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-breakthrough-stone.webp" name="돌파석" amount={materials.돌파석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['돌파석']} onBoundChange={handleBoundChange} cost={results.materialCosts['돌파석']} />
                            </Col>
                          )}
                          {materials.아비도스 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/abidos-fusion.webp?v=4" name="아비도스" amount={materials.아비도스} color="#818cf8" showCheckbox={true} isBound={boundMaterials['아비도스']} onBoundChange={handleBoundChange} cost={results.materialCosts['아비도스']} />
                            </Col>
                          )}
                          {/* 전율 장비 재료 (계승 재련) */}
                          {(materials.수호석결정 || 0) > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-guardian-stone2.webp?v=3" name="수호석결정" amount={materials.수호석결정 || 0} color="#a855f7" showCheckbox={true} isBound={boundMaterials['수호석결정']} onBoundChange={handleBoundChange} cost={results.materialCosts['수호석결정']} />
                            </Col>
                          )}
                          {(materials.파괴석결정 || 0) > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-destruction-stone2.webp?v=3" name="파괴석결정" amount={materials.파괴석결정 || 0} color="#a855f7" showCheckbox={true} isBound={boundMaterials['파괴석결정']} onBoundChange={handleBoundChange} cost={results.materialCosts['파괴석결정']} />
                            </Col>
                          )}
                          {(materials.위대한돌파석 || 0) > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-breakthrough-stone2.webp?v=3" name="위대한돌파석" amount={materials.위대한돌파석 || 0} color="#a855f7" showCheckbox={true} isBound={boundMaterials['위대한돌파석']} onBoundChange={handleBoundChange} cost={results.materialCosts['위대한돌파석']} />
                            </Col>
                          )}
                          {(materials.상급아비도스 || 0) > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/abidos-fusion2.webp?v=3" name="상급아비도스" amount={materials.상급아비도스 || 0} color="#a855f7" showCheckbox={true} isBound={boundMaterials['상급아비도스']} onBoundChange={handleBoundChange} cost={results.materialCosts['상급아비도스']} />
                            </Col>
                          )}
                          {/* 공통 재료 */}
                          {materials.운명파편 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-shard-bag-large.webp" name="파편" amount={materials.운명파편} color="#818cf8" showCheckbox={true} isBound={boundMaterials['운명파편']} onBoundChange={handleBoundChange} cost={results.materialCosts['운명파편']} />
                            </Col>
                          )}
                          {(materials.실링 || 0) > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/shilling.webp" name="실링" amount={materials.실링 || 0} color="#9ca3af" showCheckbox={false} />
                            </Col>
                          )}
                        </Row>
                      </div>

                      {/* 일반 재련 추가 재료 (업화 장비) */}
                      {requiredMats.hasNormalRefining && (requiredMats.needsGlacierNormal || requiredMats.needsLavaNormal) && (
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
                                  showCheckbox={true}
                                  isBound={materialOptions.glacierBreath.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, glacierBreath: {...p.glacierBreath, isBound: !p.glacierBreath.isBound}}))}
                                  footer={renderBreathControls('armor')}
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
                                    tooltip={bookBonusTooltip('66112546')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.tailoring.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring: {...p.tailoring, isBound: !p.tailoring.isBound}}))}
                                    footer={renderSimpleToggle('tailoring')}
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
                                    tooltip={bookBonusTooltip('66112552')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.tailoring1518.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring1518.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring1518: {...p.tailoring1518, isBound: !p.tailoring1518.isBound}}))}
                                    footer={renderSimpleToggle('tailoring1518')}
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
                                    tooltip={bookBonusTooltip('66112554')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.tailoring1920.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring1920.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring1920: {...p.tailoring1920, isBound: !p.tailoring1920.isBound}}))}
                                    footer={renderSimpleToggle('tailoring1920', 'tailoring1920Enhanced')}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsArmorBook1920 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-karma.webp"
                                    name="강화 재봉술: 업화(19~20) 방어구"
                                    amount={materials.방어구책1920강 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책1920강'] || 0}
                                    tooltip={bookBonusTooltip('66112556')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.tailoring1920Enhanced.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring1920Enhanced.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring1920Enhanced: {...p.tailoring1920Enhanced, isBound: !p.tailoring1920Enhanced.isBound}}))}
                                    footer={renderSimpleToggle('tailoring1920Enhanced', 'tailoring1920')}
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
                                  showCheckbox={true}
                                  isBound={materialOptions.lavaBreath.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, lavaBreath: {...p.lavaBreath, isBound: !p.lavaBreath.isBound}}))}
                                  footer={renderBreathControls('weapon')}
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
                                    tooltip={bookBonusTooltip('66112543')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.metallurgy.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy: {...p.metallurgy, isBound: !p.metallurgy.isBound}}))}
                                    footer={renderSimpleToggle('metallurgy')}
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
                                    tooltip={bookBonusTooltip('66112551')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.metallurgy1518.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy1518.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy1518: {...p.metallurgy1518, isBound: !p.metallurgy1518.isBound}}))}
                                    footer={renderSimpleToggle('metallurgy1518')}
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
                                    tooltip={bookBonusTooltip('66112553')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.metallurgy1920.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy1920.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy1920: {...p.metallurgy1920, isBound: !p.metallurgy1920.isBound}}))}
                                    footer={renderSimpleToggle('metallurgy1920', 'metallurgy1920Enhanced')}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsWeaponBook1920 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-karma.webp"
                                    name="강화 야금술: 업화(19~20) 무기"
                                    amount={materials.무기책1920강 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책1920강'] || 0}
                                    tooltip={bookBonusTooltip('66112555')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.metallurgy1920Enhanced.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy1920Enhanced.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy1920Enhanced: {...p.metallurgy1920Enhanced, isBound: !p.metallurgy1920Enhanced.isBound}}))}
                                    footer={renderSimpleToggle('metallurgy1920Enhanced', 'metallurgy1920')}
                                  />
                                </Col>
                              )}
                            </Row>
                          )}
                        </div>
                      )}

                      {/* 상급 재련 추가 재료 - 업화 장비에만 적용 */}
                      {requiredMats.hasAdvancedRefining && (requiredMats.needsAdvancedArmorBook1 || requiredMats.needsAdvancedArmorBook2 || requiredMats.needsAdvancedArmorBook3 || requiredMats.needsAdvancedArmorBook4 || requiredMats.needsAdvancedWeaponBook1 || requiredMats.needsAdvancedWeaponBook2 || requiredMats.needsAdvancedWeaponBook3 || requiredMats.needsAdvancedWeaponBook4) && (
                        <div className={styles.materialsSection}>
                          <div className={styles.materialsSectionTitle}>
                            상급 재련 추가 재료
                          </div>
                          {(requiredMats.needsAdvancedArmorBook1 || requiredMats.needsAdvancedArmorBook2 || requiredMats.needsAdvancedArmorBook3 || requiredMats.needsAdvancedArmorBook4) && (
                            <div className="mb-2" style={{ fontSize: isMobile ? '0.85rem' : 'clamp(0.8rem, 1.7vw, 0.9rem)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              방어구
                            </div>
                          )}
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
                                  footer={renderAdvTurnToggle('armorNormalBreath', 'armorBonusBreath', 'armor')}
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
                                    footer={renderAdvTurnToggle('armorNormalBook1', 'armorBonusBook1')}
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
                                    footer={renderAdvTurnToggle('armorNormalBook2', 'armorBonusBook2')}
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
                                    footer={renderAdvTurnToggle('armorNormalBook3', 'armorBonusBook3')}
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
                                    footer={renderAdvTurnToggle('armorNormalBook4', 'armorBonusBook4')}
                                  />
                                </Col>
                              )}
                            </Row>
                          )}
                          {(requiredMats.needsAdvancedWeaponBook1 || requiredMats.needsAdvancedWeaponBook2 || requiredMats.needsAdvancedWeaponBook3 || requiredMats.needsAdvancedWeaponBook4) && (
                            <div className="mb-2" style={{ fontSize: isMobile ? '0.85rem' : 'clamp(0.8rem, 1.7vw, 0.9rem)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              무기
                            </div>
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
                                  footer={renderAdvTurnToggle('weaponNormalBreath', 'weaponBonusBreath', 'weapon')}
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
                                    footer={renderAdvTurnToggle('weaponNormalBook1', 'weaponBonusBook1')}
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
                                    footer={renderAdvTurnToggle('weaponNormalBook2', 'weaponBonusBook2')}
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
                                    footer={renderAdvTurnToggle('weaponNormalBook3', 'weaponBonusBook3')}
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
                                    footer={renderAdvTurnToggle('weaponNormalBook4', 'weaponBonusBook4')}
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
                          {calcMode === 'median' && '중앙값 기준: 50%의 유저가 이 비용 이하로 성공합니다. 장인의 기운과 실패 시 확률 증가가 반영된 수치입니다.'}
                          {calcMode === 'average' && '평균값 기준: 장인의 기운과 실패 시 확률 증가가 반영된 예상 수치입니다. 실제 소모량은 확률에 따라 다를 수 있습니다.'}
                          {calcMode === 'pity' && '장기백 기준: 매번 장인의 기운 100%에서 성공하는 최악의 경우입니다. 실제로는 이보다 적게 소모됩니다.'}
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
