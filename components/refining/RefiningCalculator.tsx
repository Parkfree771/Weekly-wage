'use client';

import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Form, Row, Col, Card, Badge } from 'react-bootstrap';
import Image from 'next/image';
import { useTheme } from '../ThemeProvider';
import { getTries, getSuccessionTries, type CalcMode } from '../../lib/refiningSimulationData';
import { optimalBreathWithBook, triesForFixedBookPolicy, breathUsageCurve, usageAtPrice, type BreathCurvePoint, type OptimalPolicy, type PreSuccessionPolicy } from '../../lib/optimalBreath';
import {
  addDelta,
  calcCombatPowerGain,
  EMPTY_DELTA,
  getWangapStat,
  mainStatDelta,
  shiftCombatPowerBase,
  SUCCESSION_MAIN_STAT,
  wangapGradeAt,
  type CombatPowerBase,
  type StatDelta,
} from '../../lib/combatPower';

// 계승 전 최적 정책: rec(책 종류·여부도 자유 최적화 — 토글 자동 세팅용),
// on/off(책 토글 상태를 조건으로 한 숨결 최적화 — 실제 계산·표시용),
// onEnhanced(강화 책 고정, 목표 19~20 전용)
type PreOptVariants = { rec: PreSuccessionPolicy; on: PreSuccessionPolicy; off: PreSuccessionPolicy; onEnhanced?: PreSuccessionPolicy };
import { computeOptimalAdvancedPlan, advComboLabel, ADV_STAGE_KEYS, type AdvStageNum } from '../../lib/optimalAdvancedRefining';
import { WANGAP_BASE_PROBABILITY } from '../../lib/wangapData';
import {
  AVERAGE_TRIES_1_20,
  AVERAGE_TRIES_21_40,
  TURN_RATIO_1_20,
  TURN_RATIO_21_40,
  T4_ARMOR_MATERIALS,
  T4_WEAPON_MATERIALS,
} from '../../lib/advancedRefiningData';
import styles from './RefiningCalculator.module.css';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import { ADFIT_UNITS } from '@/components/ads/adConfig';
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
  getSuccessionBookBonus,
  getGrowthCost,
  getBookBonusLines
} from '../../lib/refiningData';
import { MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';
import { WANGAP_ITEM_IMAGES, type WangapGrade } from '../../lib/wangap-item-images';
import { computeWangapAverage, type WangapBreathMode, type WangapAvgEnhanceRow } from '../../lib/wangapAverage';
import {
  buildSpecialPlan,
  buildSpecialPlanFromKeys,
  getSpecialRefineInfo,
  getSpecialTries,
  type SpecialCandidate,
  type SpecialPlan,
} from '../../lib/specialRefining';
import {
  calculateAdvancedRefiningMaterials,
  type AdvancedRefiningOptions as NewAdvancedRefiningOptions
} from '../../lib/advancedRefiningData';
import {
  type Equipment as EquipmentType,
} from '../../lib/equipmentParser';
import AdBanner from '../ads/AdBanner';

// 장비 정보는 이제 equipmentParser에서 import
type Equipment = EquipmentType;

// ── 보유 개수 ──
// 보유 키 → 시세 아이템 id. 유효 단가(보유 커버리지 할인)를 만들 때 쓴다.
// 빙하/용암은 일반·상급·완갑이 같은 풀을 공유하므로 보유 키도 하나다.
const OWNED_PRICE_IDS: Record<string, string> = {
  수호석: '66102106', 파괴석: '66102006', 돌파석: '66110225', 아비도스: '6861012', 운명파편: '66130143',
  수호석결정: '66102107', 파괴석결정: '66102007', 위대한돌파석: '66110226', 상급아비도스: '6861013',
  빙하: '66111132', 용암: '66111131',
  방어구책1114: '66112546', 방어구책1518: '66112552', 방어구책1920: '66112554', 방어구책1920강: '66112556',
  무기책1114: '66112543', 무기책1518: '66112551', 무기책1920: '66112553', 무기책1920강: '66112555',
  방어구책1215: '66112564', 방어구책1619: '66112565', 무기책1215: '66112561', 무기책1619: '66112562',
  재봉술1단: '66112712', 재봉술2단: '66112714', 재봉술3단: '66112716', 재봉술4단: '66112718',
  야금술1단: '66112711', 야금술2단: '66112713', 야금술3단: '66112715', 야금술4단: '66112717',
};

// 자동 올귀속 대상 매핑 (계승 후 전용 기능이라 계승 재료·숨결·전율책만) —
// boundMaterials 키와, 보유 키 하나가 대표하는 사용처별 isBound 플래그들
const OWNED_BM_KEYS = ['수호석결정', '파괴석결정', '위대한돌파석', '상급아비도스', '운명파편'] as const;
const OWNED_FLAG_MAP: Record<string, { mo: string[]; adv: string[] }> = {
  빙하: { mo: ['glacierBreath', 'wangapGlacier'], adv: ['armorNormalBreath', 'armorBonusBreath'] },
  용암: { mo: ['lavaBreath', 'wangapLava'], adv: ['weaponNormalBreath', 'weaponBonusBreath'] },
  방어구책1215: { mo: ['tailoring1215'], adv: [] },
  방어구책1619: { mo: ['tailoring1619'], adv: [] },
  무기책1215: { mo: ['metallurgy1215'], adv: [] },
  무기책1619: { mo: ['metallurgy1619'], adv: [] },
};

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
  빙하_완갑?: number; // 빙하의 숨결 (완갑용 — 완갑은 용/빙 둘 다 쓴다)
  용암_완갑?: number; // 용암의 숨결 (완갑용)
  성장파편?: number;  // 장비 성장(재련 경험치) 파편 — 표시·토글용으로 따로 보관
  성장실링?: number;  // 장비 성장 실링
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
  방어구책1215?: number; // 재봉술 : 전율 [12-15] (계승 후)
  방어구책1619?: number; // 재봉술 : 전율 [16-19] (계승 후)
  무기책1215?: number;   // 야금술 : 전율 [12-15] (계승 후)
  무기책1619?: number;   // 야금술 : 전율 [16-19] (계승 후)
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
  특재돌?: number; // 특수 재련 돌 (귀속, 특재 배분 단계에서만 소모)
  /** 특재로 아낀 재료량 — 키는 위 필드명과 동일. 카드에 "원래 N개 → −절약" 을 보여주기 위한 값이며 합계에는 포함되지 않는다 */
  특재절약?: Record<string, number>;
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

// ─── 배지 필 드롭다운 ───
// 네이티브 셀렉트 크롬 대신 배지(pill) 디자인에서 그대로 이어지는 커스텀 메뉴.
// equipmentCard가 overflow hidden이라 메뉴는 포털(fixed)로 띄우고, 바깥 클릭·스크롤 시 닫는다.
type PillOption = { value: string; label: string };

function PillDropdown({
  value,
  options,
  onSelect,
  display,
  pillClass,
  menuClass,
  mobile,
  disabled,
  ariaLabel,
}: {
  value: string;
  options: PillOption[];
  onSelect: (v: string) => void;
  display: string;
  pillClass: string;
  menuClass: string;
  mobile: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null);

  const openMenu = () => {
    if (disabled) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // 사이트 보기 배율(html zoom)·body zoom(0.85)이 걸려 있으면 fixed 좌표도 그 배율로
    // 다시 스케일되므로, 포털이 붙는 body까지의 누적 zoom으로 나눠 시각 좌표에 맞춘다.
    // (rect는 배율이 반영된 시각 px, fixed 요소의 left/top은 zoom배로 다시 늘어나는 CSS px)
    let zoom = 1;
    let node: Element | null = document.body;
    while (node) {
      const z = parseFloat(getComputedStyle(node).zoom || '1');
      if (!isNaN(z) && z > 0) zoom *= z;
      node = node.parentElement;
    }
    const spaceBelow = window.innerHeight - r.bottom;
    // 아래 공간이 부족하면 위로 펼친다 (메뉴 최대 높이 240px + 여유 — 시각 크기는 배율만큼 스케일)
    if (spaceBelow < 260 * zoom && r.top > spaceBelow) {
      setPos({ left: r.left / zoom, bottom: (window.innerHeight - r.top) / zoom + 4, width: Math.max(r.width / zoom, 76) });
    } else {
      setPos({ left: r.left / zoom, top: r.bottom / zoom + 4, width: Math.max(r.width / zoom, 76) });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // 열리면 현재 값이 보이도록 스크롤
    menuRef.current?.querySelector(`.${styles.pillMenuItemActive}`)?.scrollIntoView({ block: 'center' });
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    // 스크롤로 닫는 건 "페이지가 움직여 메뉴가 버튼에서 떨어질 때"가 목적이다.
    // capture 로 받으면 메뉴 자신의 스크롤(목록이 240px 를 넘으면 생긴다)까지 잡혀서,
    // 목표 단계처럼 항목이 많은 메뉴는 손가락으로 굴리는 순간 닫혀 고를 수가 없었다.
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && menuRef.current && (t === menuRef.current || menuRef.current.contains(t))) return;
      setOpen(false);
    };
    // 모바일은 스크롤할 때 주소창이 접혔다 펴지며 resize 가 뜬다(높이만 바뀜) — 그때는 닫지 않는다
    const startW = window.innerWidth;
    const onResize = () => { if (window.innerWidth !== startW) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={`${styles.pillSelect} ${mobile ? styles.pillSelectMobile : ''} ${pillClass}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        {display}
        <span className={styles.pillCaret}>▾</span>
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          className={`${styles.pillMenu} ${menuClass}`}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width }}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`${styles.pillMenuItem} ${o.value === value ? styles.pillMenuItemActive : ''}`}
              onClick={() => { onSelect(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}


type RefiningCalculatorProps = {
  onSearchComplete?: (searched: boolean) => void;
  equipments?: Equipment[];
  searched?: boolean;
  characterInfo?: { name: string; itemLevel: string; image?: string } | null;
  /** 전투력 상승량 계산 기준값. 실제 캐릭터를 검색했을 때만 들어온다 */
  combatPowerBase?: CombatPowerBase | null;
};

// 숨결 적용 대상: 방어구(빙하) / 무기(용암) / 완갑(용암·빙하 각각)
type BreathKind = 'armor' | 'weapon' | 'wangapLava' | 'wangapGlacier';

export default function RefiningCalculator({
  onSearchComplete,
  equipments: externalEquipments,
  searched: externalSearched,
  characterInfo: externalCharacterInfo,
  combatPowerBase,
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
    // 완갑은 0강부터 시작, 계승(전율) 11, 계승 전 10
    const normalMin = eq.isWangap ? 0 : eq.isSuccession ? 11 : 10;
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

  // 시작 단계 직접 선택 (장비 카드 현재 드롭다운) — adjustStart와 동일한 규칙 + 목표 초기화
  const setStart = (eq: (typeof equipments)[number], kind: 'normal' | 'advanced', value: number) => {
    setStartOverrides(prev => ({
      ...prev,
      [eq.name]: {
        normal: kind === 'normal' ? value : eq.currentLevel,
        advanced: kind === 'advanced' ? value : eq.currentAdvancedLevel,
      },
    }));
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

  // 장비 성장(재련 경험치) 비용을 합계에 포함할지 — 단계마다 1회 고정 비용
  const [includeGrowth, setIncludeGrowth] = useState(true);

  // 추가 재료 옵션 (일반 강화용)
  const [materialOptions, setMaterialOptions] = useState({
    glacierBreath: { enabled: false, isBound: false, optimal: false },
    lavaBreath: { enabled: false, isBound: false, optimal: false },
    // 완갑은 용암·빙하를 함께 써서 무기(용암)·방어구(빙하) 토글과 분리한다
    wangapLava: { enabled: false, isBound: false, optimal: false },
    wangapGlacier: { enabled: false, isBound: false, optimal: false },
    tailoring: { enabled: false, isBound: false },        // 재봉술 11~14
    tailoring1518: { enabled: false, isBound: false },    // 재봉술 15~18
    tailoring1920: { enabled: false, isBound: false },    // 재봉술 19~20
    tailoring1920Enhanced: { enabled: false, isBound: false }, // 강화 재봉술 19~20
    metallurgy: { enabled: false, isBound: false },       // 야금술 11~14
    metallurgy1518: { enabled: false, isBound: false },   // 야금술 15~18
    metallurgy1920: { enabled: false, isBound: false },   // 야금술 19~20
    metallurgy1920Enhanced: { enabled: false, isBound: false }, // 강화 야금술 19~20
    // 전율 — 계승 후(세르카 장비) 전용 책. 도전 단계 12~19
    tailoring1215: { enabled: false, isBound: false },    // 재봉술 : 전율 12~15
    tailoring1619: { enabled: false, isBound: false },    // 재봉술 : 전율 16~19
    metallurgy1215: { enabled: false, isBound: false },   // 야금술 : 전율 12~15
    metallurgy1619: { enabled: false, isBound: false },   // 야금술 : 전율 16~19
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

  // ── 보유 개수 (재료·숨결·책) ──
  // 최적화 반영 방식: 정책과 무관한 "풀사용 기준 필요량"(ownedFullNeeds) 대비 커버리지만큼
  // 유효 단가를 깎는다(ownedEffPrices). 선택된 정책의 필요량(materials)은 절대 입력으로
  // 쓰지 않는다 — 그걸 되먹이면 필요량↔가격 순환(2026-07-20 삭제된 owned 기능의 사고
  // 원인)이 재발한다. 비용 합산은 부족분(필요량−보유) 기준 실지출.
  //
  // 반영 방식은 "명시적 적용": ownedMaterials 는 입력 버퍼일 뿐이고, 계산(유효단가·자동
  // 귀속·부족분 차감)은 전부 스냅샷(appliedOwned)만 읽는다. 스냅샷은 각 줄의
  // "보조재료 비용 최적화" 버튼을 누를 때 찍힌다 — 별도 적용 버튼 없음, 자동 갱신 없음.
  // 입력을 고친 뒤에는 줄 최적화 버튼을 다시 눌러야 반영된다.
  const [ownedMaterials, setOwnedMaterials] = useState<Record<string, number>>({});
  const [appliedOwned, setAppliedOwned] = useState<Record<string, number>>({});
  // 보유 입력이 바뀌면 적용돼 있던 최적화를 해제하고(다시 누르게), 귀속 자동 체크는 즉시 판정한다.
  // 두 함수 모두 훨씬 아래에서 정의되므로(TDZ) ref 로 연결한다. 렌더마다 최신 함수가 대입된다.
  const deactivateOptRef = useRef<() => void>(() => {});
  const judgeAutoBoundsRef = useRef<(ownMap: Record<string, number>) => void>(() => {});

  // 보유 기능 활성 조건: 모든 장비가 계승 완료(또는 완갑 — 1750+ 전용이라 계승 후로 취급).
  // 계승 전 장비가 하나라도 있으면 상급재련이 섞여 커버리지·차감이 얽히므로 기능 전체를 끈다
  // (입력 UI 숨김 + 유효단가 미적용 + 부족분 차감 미적용 + 자동 귀속 미작동).
  // 입력값 자체는 상태·localStorage 에 남아 있어, 계승 캐릭터로 돌아오면 그대로 되살아난다.
  const ownedFeatureActive = useMemo(
    () => equipments.length > 0 && equipments.every(eq => eq.isWangap || eq.isSuccession),
    [equipments],
  );

  // 보유 입력은 세션 한정(상태만) — 계산 모드 전환·재계산에는 유지되고 새로고침하면 비워진다.
  // 과거 버전이 localStorage 에 남긴 값만 1회 청소한다 (더는 읽지도 쓰지도 않는다).
  useEffect(() => {
    try { localStorage.removeItem('refining-owned-materials'); } catch { /* 무시 */ }
  }, []);

  const handleOwnedChange = useCallback((key: string, value: number) => {
    const next = { ...ownedMaterials };
    if (value > 0) next[key] = value;
    else delete next[key];
    setOwnedMaterials(next);
    // 보유가 바뀌면 적용돼 있던 최적화 해제 → 줄 버튼이 "적용" 상태로 돌아와 다시 누르게 된다
    deactivateOptRef.current();
    // 귀속 자동 체크는 즉시 — 지금 화면에 보이는 예상 개수와 비교해 바로 켜고/끈다
    judgeAutoBoundsRef.current(next);
  }, [ownedMaterials]);

  /** MaterialCard 보유 입력 공용 props — 기능 비활성(계승 전 장비 존재) 시 입력칸 자체를 숨긴다 */
  const ownedProps = (key: string) =>
    ownedFeatureActive
      ? {
          owned: ownedMaterials[key] || 0,
          onOwnedChange: (v: number) => handleOwnedChange(key, v),
        }
      : {};


  // 계산 모드 (중앙값/평균값/장기백)
  const [calcMode, setCalcMode] = useState<CalcMode>('median');

  // 특수 재련 (특재) — 계승 후·완갑 전용. 보유 특재돌을 효율 순으로 자동 배분한다.
  const [useSpecial, setUseSpecial] = useState(false);
  const [specialStones, setSpecialStones] = useState(0);
  // 우선순위 표에서 사용자가 직접 고른 단계. null = 자동 배분 그대로 사용
  const [specialManualKeys, setSpecialManualKeys] = useState<Set<string> | null>(null);

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
        wangapLava: { enabled: false, isBound: false, optimal: false },
        wangapGlacier: { enabled: false, isBound: false, optimal: false },
        tailoring: { enabled: false, isBound: false },
        tailoring1518: { enabled: false, isBound: false },
        tailoring1920: { enabled: false, isBound: false },
        tailoring1920Enhanced: { enabled: false, isBound: false },
        metallurgy: { enabled: false, isBound: false },
        metallurgy1518: { enabled: false, isBound: false },
        metallurgy1920: { enabled: false, isBound: false },
        metallurgy1920Enhanced: { enabled: false, isBound: false },
        tailoring1215: { enabled: false, isBound: false },
        tailoring1619: { enabled: false, isBound: false },
        metallurgy1215: { enabled: false, isBound: false },
        metallurgy1619: { enabled: false, isBound: false },
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
    // appliedOwned 의존 필수: "보유 최적 적용" 클릭 → ownedEffPrices → 정책 변화 시 수량도 갱신 (ownedEffPrices 는
    // 이 지점보다 뒤에 선언되어 직접 못 넣지만, 그 입력(appliedOwned + 이미 포함된 목표·시세·모드)을 전부 포함하므로 동일 효과)
    // (optimalBreathTable·specialPlan은 이 effect보다 뒤에 선언되어 직접 못 넣지만, 그 입력을 전부 포함하므로 동일 효과)
  }, [searched, targetLevels, materialOptions, advancedMaterialOptions, equipments, calcMode, marketPrices, boundMaterials, includeGrowth, useSpecial, specialStones, specialManualKeys, appliedOwned]);

  // 비용 계산 로직 (useEffect로 분리)
  useEffect(() => {
    if (!materials) {
      setResults({ totalGold: 0, materialCosts: {} });
      return;
    }

    const costs: Record<string, number> = {};
    let totalMaterialCost = 0;

    // 필요 개수 = 소모량 − 보유량(부족분). 귀속 재료는 아래 합산에서 통째로 제외된다.
    // 보유 풀은 호출 순서대로 차감된다 — 빙하/용암처럼 여러 카테고리(일반→상급→완갑)가
    // 같은 키를 쓰는 경우 앞 카테고리부터 보유분을 소진한다.
    // 기능 비활성(계승 전 장비 존재) 시에는 차감하지 않는다 — 입력값만 잠들어 있는 상태.
    const ownedLeft: Record<string, number> = {};
    if (ownedFeatureActive) {
      Object.keys(appliedOwned).forEach(k => { ownedLeft[k] = Math.max(0, Math.floor(appliedOwned[k] || 0)); });
    }
    const need = (amount: number, key?: string) => {
      if (!key) return amount;
      const take = Math.min(ownedLeft[key] || 0, amount);
      if (take > 0) ownedLeft[key] -= take;
      return amount - take;
    };

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
    // 숨결은 일반→상급→완갑 순으로 같은 보유 풀('빙하'/'용암')을 차감한다.
    // 귀속(무료) 처리된 카테고리는 키를 넘기지 않아 풀을 낭비하지 않는다.
    const ownedAdvGlacierBound =
      (!advancedMaterialOptions.armorNormalBreath.enabled || advancedMaterialOptions.armorNormalBreath.isBound) &&
      (!advancedMaterialOptions.armorBonusBreath.enabled || advancedMaterialOptions.armorBonusBreath.isBound);
    const ownedAdvLavaBound =
      (!advancedMaterialOptions.weaponNormalBreath.enabled || advancedMaterialOptions.weaponNormalBreath.isBound) &&
      (!advancedMaterialOptions.weaponBonusBreath.enabled || advancedMaterialOptions.weaponBonusBreath.isBound);
    costs['빙하_일반'] = need(materials.빙하_일반, materialOptions.glacierBreath.isBound ? undefined : '빙하') * (marketPrices['66111132'] || 0);
    costs['용암_일반'] = need(materials.용암_일반, materialOptions.lavaBreath.isBound ? undefined : '용암') * (marketPrices['66111131'] || 0);
    costs['빙하_상급'] = need(materials.빙하_상급, ownedAdvGlacierBound ? undefined : '빙하') * (marketPrices['66111132'] || 0);
    costs['용암_상급'] = need(materials.용암_상급, ownedAdvLavaBound ? undefined : '용암') * (marketPrices['66111131'] || 0);
    costs['빙하_완갑'] = need(materials.빙하_완갑 || 0, materialOptions.wangapGlacier.isBound ? undefined : '빙하') * (marketPrices['66111132'] || 0);
    costs['용암_완갑'] = need(materials.용암_완갑 || 0, materialOptions.wangapLava.isBound ? undefined : '용암') * (marketPrices['66111131'] || 0);

    // 일반 재련 책 비용 (단계별)
    costs['방어구책1114'] = need(materials.방어구책1114 || 0, '방어구책1114') * (marketPrices['66112546'] || 0);  // 재봉술 [11-14]
    costs['방어구책1518'] = need(materials.방어구책1518 || 0, '방어구책1518') * (marketPrices['66112552'] || 0);  // 재봉술 [15-18]
    costs['방어구책1920'] = need(materials.방어구책1920 || 0, '방어구책1920') * (marketPrices['66112554'] || 0);  // 재봉술 [19-20]
    costs['방어구책1920강'] = need(materials.방어구책1920강 || 0, '방어구책1920강') * (marketPrices['66112556'] || 0);  // 강화 재봉술 [19-20]
    costs['무기책1114'] = need(materials.무기책1114 || 0, '무기책1114') * (marketPrices['66112543'] || 0);  // 야금술 [11-14]
    costs['무기책1518'] = need(materials.무기책1518 || 0, '무기책1518') * (marketPrices['66112551'] || 0);  // 야금술 [15-18]
    costs['무기책1920'] = need(materials.무기책1920 || 0, '무기책1920') * (marketPrices['66112553'] || 0);  // 야금술 [19-20]
    costs['무기책1920강'] = need(materials.무기책1920강 || 0, '무기책1920강') * (marketPrices['66112555'] || 0);  // 강화 야금술 [19-20]
    costs['방어구책1215'] = need(materials.방어구책1215 || 0, '방어구책1215') * (marketPrices['66112564'] || 0);  // 재봉술 전율 [12-15]
    costs['방어구책1619'] = need(materials.방어구책1619 || 0, '방어구책1619') * (marketPrices['66112565'] || 0);  // 재봉술 전율 [16-19]
    costs['무기책1215'] = need(materials.무기책1215 || 0, '무기책1215') * (marketPrices['66112561'] || 0);  // 야금술 전율 [12-15]
    costs['무기책1619'] = need(materials.무기책1619 || 0, '무기책1619') * (marketPrices['66112562'] || 0);  // 야금술 전율 [16-19]

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

    // 완갑 숨결 (용암·빙하 각각 별도 토글)
    if (materialOptions.wangapLava.enabled && !materialOptions.wangapLava.isBound) {
      totalMaterialCost += costs['용암_완갑'] || 0;
    }
    if (materialOptions.wangapGlacier.enabled && !materialOptions.wangapGlacier.isBound) {
      totalMaterialCost += costs['빙하_완갑'] || 0;
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
    if ((materialOptions.tailoring1215.enabled || armorPreOptimal) && !materialOptions.tailoring1215.isBound) {
      totalMaterialCost += costs['방어구책1215'] || 0;
    }
    if ((materialOptions.tailoring1619.enabled || armorPreOptimal) && !materialOptions.tailoring1619.isBound) {
      totalMaterialCost += costs['방어구책1619'] || 0;
    }
    if ((materialOptions.metallurgy1215.enabled || weaponPreOptimal) && !materialOptions.metallurgy1215.isBound) {
      totalMaterialCost += costs['무기책1215'] || 0;
    }
    if ((materialOptions.metallurgy1619.enabled || weaponPreOptimal) && !materialOptions.metallurgy1619.isBound) {
      totalMaterialCost += costs['무기책1619'] || 0;
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

  }, [materials, marketPrices, boundMaterials, materialOptions, advancedMaterialOptions, appliedOwned, ownedFeatureActive]);

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

  // ── 보유 커버리지용 "풀사용 기준 필요량" ──
  // 목표·계산모드·정적 테이블에서만 계산하는 상한값이다. 선택된 최적 정책(최적화의 출력)과
  // 무관하므로 보유→가격→정책→필요량 어디에도 순환이 생기지 않는다.
  // 기본 재료 = 노숨·노책 최대 시도수 기준, 숨결 = 풀숨 기준, 책 = 노숨+책 사용 시도수 기준.
  // 상한(보수적)일수록 커버리지·할인이 작아져 "보유분 과대평가로 과소비 추천" 쪽 오차가 없다.
  const ownedFullNeeds = useMemo(() => {
    const needs: Record<string, number> = {};
    const add = (k: string, v: number) => { if (v > 0) needs[k] = (needs[k] || 0) + v; };

    equipments.forEach(eq => {
      if (eq.isEsther) {
        // 에스더: 상급재련만 — 아래 상급 블록에서 처리
      } else if (eq.isWangap) {
        // 완갑: 계승 크리스탈 재료·운명파편·숨결을 일반 재련과 "공유 소모"하므로 상한에 포함해야
        // 커버리지가 과대(할인 과다·자동귀속 조기 발동)해지지 않는다.
        // 재료 상한 = 노숨 실행(시도 최대), 숨결 상한 = 풀숨 실행(개수 최대). 성장 파편은 양쪽 동일.
        const t = targetLevels[eq.name];
        if (!t?.normal || t.normal <= eq.currentLevel) return;
        const zeroBound = { 파괴석결정: false, 수호석결정: false, 위대한돌파석: false, 상급아비도스: false, 운명파편: false, 용암: false, 빙하: false };
        const zeroPrice = { 파괴석결정: 0, 수호석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 운명파편: 0, 용암: 0, 빙하: 0 };
        const grade = (eq.grade as WangapGrade) || '영웅';
        for (let L = eq.currentLevel; L < t.normal; L++) {
          if (!(WANGAP_BASE_PROBABILITY[L] ?? 0)) continue;
          const run = (breath: WangapBreathMode) => computeWangapAverage({
            startLevel: L, targetLevel: L + 1, startGrade: grade, mode: calcMode,
            lavaMode: breath, glacierMode: breath, boundFlags: zeroBound, unitPrices: zeroPrice,
          });
          const noBreath = run('off');   // 시도 최대 → 재료 상한
          const fullBreath = run('full'); // 숨결 개수 최대 → 숨결 상한
          add('파괴석결정', noBreath.totals.파괴석결정);
          add('수호석결정', noBreath.totals.수호석결정);
          add('위대한돌파석', noBreath.totals.위대한돌파석);
          add('상급아비도스', noBreath.totals.상급아비도스);
          add('운명파편', noBreath.totals.운명파편 + (includeGrowth ? noBreath.growth.운명파편 : 0));
          add('용암', fullBreath.totals.용암);
          add('빙하', fullBreath.totals.빙하);
        }
        return;
      }
      const t = targetLevels[eq.name];
      const isArmor = eq.type === 'armor';
      // 일반 재련 (계승 전/후)
      if (!eq.isEsther && t?.normal && t.normal > eq.currentLevel) {
        for (let L = eq.currentLevel; L < t.normal; L++) {
          const succ = eq.isSuccession;
          const baseProb = succ ? SUCCESSION_BASE_PROBABILITY[L] : BASE_PROBABILITY[L];
          if (!baseProb) continue;
          const be = succ ? getSuccessionBreathEffect(baseProb) : getBreathEffect(baseProb);
          const target = L + 1;
          const cost = (succ
            ? (isArmor ? SUCCESSION_ARMOR_MATERIAL_COSTS[target] : SUCCESSION_WEAPON_MATERIAL_COSTS[target])
            : (isArmor ? ARMOR_MATERIAL_COSTS[target] : WEAPON_MATERIAL_COSTS[target])) as Record<string, number> | undefined;
          if (!cost) continue;
          const triesMax = triesForFixedBookPolicy(baseProb, be, false, 0, calcMode).tries;
          add(isArmor ? '빙하' : '용암', triesForFixedBookPolicy(baseProb, be, true, 0, calcMode).breaths);
          (['수호석', '파괴석', '돌파석', '아비도스', '운명파편', '수호석결정', '파괴석결정', '위대한돌파석', '상급아비도스'] as const)
            .forEach(k => { if (cost[k]) add(k, cost[k] * triesMax); });
          // 장비 성장(재련 경험치) 파편 — 단계마다 1회 고정 소모.
          // 화면 계산·자동 귀속 문턱과 같은 규칙으로 "성장 포함" 토글을 따른다
          if (includeGrowth) add('운명파편', getGrowthCost(L, eq.type, succ).운명파편);
          // 책 상한: 매 시도 1권 → 노숨+책 사용 시의 시도수
          if (succ) {
            const p = getSuccessionBookBonus(L);
            if (p > 0 && target >= 12 && target <= 19) {
              add(`${isArmor ? '방어구책' : '무기책'}${target <= 15 ? '1215' : '1619'}`,
                triesForFixedBookPolicy(baseProb, be, false, p, calcMode).tries);
            }
          } else if (target >= 11 && target <= 20) {
            const pre = isArmor ? '방어구책' : '무기책';
            const range = target <= 14 ? '1114' : target <= 18 ? '1518' : '1920';
            add(`${pre}${range}`, triesForFixedBookPolicy(baseProb, be, false, baseProb, calcMode).tries);
            if (range === '1920') {
              add(`${pre}1920강`, triesForFixedBookPolicy(baseProb, be, false, baseProb * 2, calcMode).tries);
            }
          }
        }
      }
      // 상급재련 — 구간 완주(10단계) 기준 상한 (부분 구간은 과대 = 보수적)
      if (!eq.isSuccession && t?.advanced && t.advanced > eq.currentAdvancedLevel) {
        const table = (isArmor ? T4_ARMOR_MATERIALS : T4_WEAPON_MATERIALS) as Record<string, Record<string, number>>;
        for (let st = 1; st <= 4; st++) {
          if (!(eq.currentAdvancedLevel < st * 10 && t.advanced > (st - 1) * 10)) continue;
          const m = table[ADV_STAGE_KEYS[st as AdvStageNum]];
          if (!m) continue;
          const triesTable = (st <= 2 ? AVERAGE_TRIES_1_20 : AVERAGE_TRIES_21_40) as Record<string, number>;
          const ratio = st <= 2 ? TURN_RATIO_1_20 : TURN_RATIO_21_40;
          const triesMax = triesTable['none_none'] || 0;
          (['수호석', '파괴석', '돌파석', '아비도스', '운명파편'] as const)
            .forEach(k => { if (m[k]) add(k, m[k] * triesMax); });
          add(isArmor ? '빙하' : '용암',
            ((m.빙하 || m.용암) || 0) * (triesTable['both_both'] || triesMax) * (ratio.normal + ratio.bonus));
          add(`${isArmor ? '재봉술' : '야금술'}${st}단`, triesMax * (ratio.normal + ratio.bonus));
        }
      }
    });
    return needs;
  }, [equipments, targetLevels, calcMode, includeGrowth]);

  // ── 공유 숨결 풀 시장청산가(λ) ──
  // 빙하·용암은 방어구 부위들(일반 재련)과 완갑이 같은 보유 풀을 나눠 쓴다.
  // "전 소비처의 최적 사용량 합 = 보유량"이 되는 내부 가격 λ를 이분 탐색으로 찾아
  // 모든 소비처가 같은 λ로 최적화하게 하면, 가치(한계 절약)가 높은 단계부터 자동 배분되고
  // 한쪽을 미사용으로 끄면 풀이 남은 소비처(다음 최선)로 흘러간다.
  //   λ=0      : 전부 풀숨해도 보유가 남는다 → 공짜(귀속과 동일)
  //   λ=시세   : 시세대로 사도 부족하다 → 한계 개당 비용 = 시세 (기존과 동일)
  //   그 사이  : 보유가 애매하게 걸치는 구간 — λ가 배분을 결정한다
  // 입력은 보유 스냅샷·시세·목표·토글뿐(최적화 출력 아님) → 순환 없음. 적용 클릭 시에만 재계산.
  const breathPoolPrices = useMemo(() => {
    if (!ownedFeatureActive) return null;
    const owned빙하 = appliedOwned['빙하'] || 0;
    const owned용암 = appliedOwned['용암'] || 0;
    if (owned빙하 <= 0 && owned용암 <= 0) return null;
    const mp = (id: string) => marketPrices[id] || 0;
    const mkt빙하 = mp('66111132');
    const mkt용암 = mp('66111131');
    if (!(mkt빙하 > 0) && !(mkt용암 > 0)) return null;
    // 실제 정책 테이블(optimalBreathTable)과 같은 입력을 쓰도록, 재료·책 가격은
    // 이진(공짜/시세)이 아니라 ownedEffPrices 와 동일한 커버리지 비례 유효단가로 계산한다.
    // 입력이 다르면 λ가 청산한 사용량과 테이블의 실제 소모가 어긋난다.
    const covPrice = (id: string, key: string) => {
      const raw = mp(id);
      if (!(raw > 0)) return 0;
      const own = appliedOwned[key] || 0;
      if (own <= 0) return raw;
      const full = ownedFullNeeds[key] || 0;
      const coverage = full > 0 ? Math.min(1, own / full) : 1;
      return raw * (1 - coverage);
    };
    const matPrice = (id: string, key: string) => (boundMaterials[key] ? 0 : covPrice(id, key));

    // 일반 재련(계승 후) 소비처 곡선 — 같은 레벨은 곡선을 공유하고 부위 수만 곱한다
    const buildCurves = (type: 'armor' | 'weapon'): { pts: BreathCurvePoint[]; mult: number }[] => {
      const enabled = type === 'armor' ? materialOptions.glacierBreath.enabled : materialOptions.lavaBreath.enabled;
      if (!enabled) return []; // 미사용 줄은 소비처에서 제외 → 풀이 다른 곳으로 흐른다
      const isArmor = type === 'armor';
      const multByLevel = new Map<number, number>();
      equipments.forEach(eq => {
        if (eq.isWangap || !eq.isSuccession || eq.type !== type) return;
        const t = targetLevels[eq.name];
        if (!t?.normal || t.normal <= eq.currentLevel) return;
        for (let L = eq.currentLevel; L < t.normal; L++) {
          multByLevel.set(L, (multByLevel.get(L) || 0) + 1);
        }
      });
      const out: { pts: BreathCurvePoint[]; mult: number }[] = [];
      multByLevel.forEach((mult, L) => {
        const baseProb = SUCCESSION_BASE_PROBABILITY[L];
        if (!baseProb) return;
        const be = getSuccessionBreathEffect(baseProb);
        const target = L + 1;
        const cost = (isArmor ? SUCCESSION_ARMOR_MATERIAL_COSTS[target] : SUCCESSION_WEAPON_MATERIAL_COSTS[target]) as Record<string, number> | undefined;
        if (!cost) return;
        const stoneKey = isArmor ? '수호석결정' : '파괴석결정';
        const mat =
          (cost[stoneKey] || 0) * matPrice(isArmor ? '66102107' : '66102007', stoneKey) +
          (cost.위대한돌파석 || 0) * matPrice('66110226', '위대한돌파석') +
          (cost.상급아비도스 || 0) * matPrice('6861013', '상급아비도스') +
          (cost.운명파편 || 0) * matPrice('66130143', '운명파편') +
          (cost.골드 || 0);
        if (!(mat > 0)) return;
        const thrillProb = getSuccessionBookBonus(L);
        const bookKey = `${isArmor ? '방어구책' : '무기책'}${target <= 15 ? '1215' : '1619'}`;
        const bookBound = isArmor
          ? (target <= 15 ? materialOptions.tailoring1215.isBound : materialOptions.tailoring1619.isBound)
          : (target <= 15 ? materialOptions.metallurgy1215.isBound : materialOptions.metallurgy1619.isBound);
        const bookGate = target >= 12 && target <= 19 ? mp(OWNED_PRICE_IDS[bookKey]) : 0;
        const books = thrillProb > 0 && target >= 12 && target <= 19 && bookGate > 0
          ? [{ id: 'thrill', prob: thrillProb, price: bookBound ? 0 : covPrice(OWNED_PRICE_IDS[bookKey], bookKey) }]
          : [];
        out.push({ pts: breathUsageCurve(baseProb, be, books, mat, calcMode), mult });
      });
      return out;
    };
    const armorCurves = buildCurves('armor');
    const weaponCurves = buildCurves('weapon');

    // 완갑 소비처 — 용암·빙하를 동시에 쓰므로 두 λ를 함께 넘겨 평가한다
    const wangapTargets: { L: number; grade: WangapGrade }[] = [];
    equipments.forEach(eq => {
      if (!eq.isWangap) return;
      const t = targetLevels[eq.name];
      if (!t?.normal || t.normal <= eq.currentLevel) return;
      for (let L = eq.currentLevel; L < t.normal; L++) {
        if (WANGAP_BASE_PROBABILITY[L] ?? 0) wangapTargets.push({ L, grade: (eq.grade as WangapGrade) || '영웅' });
      }
    });
    const wangapOn = materialOptions.wangapLava.enabled || materialOptions.wangapGlacier.enabled;
    const wangapBound = {
      파괴석결정: !!boundMaterials['파괴석결정'],
      수호석결정: !!boundMaterials['수호석결정'],
      위대한돌파석: !!boundMaterials['위대한돌파석'],
      상급아비도스: !!boundMaterials['상급아비도스'],
      운명파편: !!boundMaterials['운명파편'],
      용암: false, 빙하: false,
    };
    const wangapUsage = (lavaP: number, glacierP: number): { lava: number; glacier: number } => {
      if (!wangapOn || wangapTargets.length === 0) return { lava: 0, glacier: 0 };
      let lava = 0, glacier = 0;
      for (const w of wangapTargets) {
        const wr = computeWangapAverage({
          startLevel: w.L, targetLevel: w.L + 1, startGrade: w.grade, mode: calcMode,
          lavaMode: materialOptions.wangapLava.enabled ? 'optimal' : 'off',
          glacierMode: materialOptions.wangapGlacier.enabled ? 'optimal' : 'off',
          boundFlags: wangapBound,
          // 결정 재료도 커버리지 유효단가 — 일반 재련(정책 테이블)·실계산과 같은 경제로 평가해야
          // λ가 청산한 사용량과 실제 소모가 일치한다
          unitPrices: {
            파괴석결정: covPrice('66102007', '파괴석결정'),
            수호석결정: covPrice('66102107', '수호석결정'),
            위대한돌파석: covPrice('66110226', '위대한돌파석'),
            상급아비도스: covPrice('6861013', '상급아비도스'),
            운명파편: covPrice('66130143', '운명파편'),
            용암: lavaP, 빙하: glacierP,
          },
        });
        lava += wr.totals.용암;
        glacier += wr.totals.빙하;
      }
      return { lava, glacier };
    };

    // 한 풀의 청산가 — 사용량은 λ에 단조 감소이므로 이분 탐색
    const clearPool = (
      curves: { pts: BreathCurvePoint[]; mult: number }[],
      owned: number, market: number, otherPrice: number, pool: 'lava' | 'glacier',
    ): number => {
      if (owned <= 0 || !(market > 0)) return market;
      const usage = (price: number) =>
        curves.reduce((s, c) => s + usageAtPrice(c.pts, price) * c.mult, 0) +
        (pool === 'lava' ? wangapUsage(price, otherPrice).lava : wangapUsage(otherPrice, price).glacier);
      if (usage(0) <= owned) return 0;
      if (usage(market) >= owned) return market;
      let lo = 0, hi = market;
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        if (usage(mid) > owned) lo = mid; else hi = mid;
      }
      return hi;
    };
    let priceGlacier = mkt빙하;
    let priceLava = mkt용암;
    // 완갑이 두 풀을 함께 쓰므로 서로의 λ를 고정해 두 번 왕복하면 충분히 수렴한다
    for (let iter = 0; iter < 2; iter++) {
      priceGlacier = clearPool(armorCurves, owned빙하, mkt빙하, priceLava, 'glacier');
      priceLava = clearPool(weaponCurves, owned용암, mkt용암, priceGlacier, 'lava');
    }
    return { 빙하: priceGlacier, 용암: priceLava };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedFeatureActive, appliedOwned, marketPrices, equipments, targetLevels, calcMode, boundMaterials, ownedFullNeeds,
    materialOptions.glacierBreath.enabled, materialOptions.lavaBreath.enabled,
    materialOptions.wangapLava.enabled, materialOptions.wangapGlacier.enabled,
    materialOptions.tailoring1215.isBound, materialOptions.tailoring1619.isBound,
    materialOptions.metallurgy1215.isBound, materialOptions.metallurgy1619.isBound]);

  // 보유 커버리지 반영 유효 단가 — 최적화(정책 테이블·상급 최적 조합) 전용.
  // 유효 단가 = 시세 × (1 − min(1, 보유/풀사용필요량)). 보유가 풀사용을 덮으면 0(귀속과 동일).
  // 숨결(빙하·용암)만은 비례 할인 대신 공유 풀 시장청산가(breathPoolPrices)를 쓴다 — 배분까지 최적.
  // 비용 합산·카드 표시는 이걸 쓰지 않고 부족분 × 원시 시세로 계산한다.
  const ownedEffPrices = useMemo(() => {
    // 계승 전 장비가 섞여 있으면 보유 기능 전체 비활성 — 원시 시세 그대로
    if (!ownedFeatureActive) return marketPrices;
    const keys = Object.keys(appliedOwned).filter(k => (appliedOwned[k] || 0) > 0 && OWNED_PRICE_IDS[k]);
    if (keys.length === 0) return marketPrices;
    const out = { ...marketPrices };
    keys.forEach(k => {
      const id = OWNED_PRICE_IDS[k];
      if (!(out[id] > 0)) return;
      const full = ownedFullNeeds[k] || 0;
      // full=0 = 이번 목표에 아예 안 쓰이는 재료 — 단가가 어디에도 곱해지지 않으므로 0이어도 무해
      const coverage = full > 0 ? Math.min(1, (appliedOwned[k] || 0) / full) : 1;
      out[id] = out[id] * (1 - coverage);
    });
    // 숨결은 공유 풀 시장청산가로 덮어쓴다 — 방어구·완갑 배분이 λ 하나로 정해진다
    if (breathPoolPrices) {
      if ((appliedOwned['빙하'] || 0) > 0 && marketPrices['66111132'] > 0) out['66111132'] = breathPoolPrices.빙하;
      if ((appliedOwned['용암'] || 0) > 0 && marketPrices['66111131'] > 0) out['66111131'] = breathPoolPrices.용암;
    }
    return out;
  }, [marketPrices, ownedFullNeeds, appliedOwned, ownedFeatureActive, breathPoolPrices]);

  // ── 자동 올귀속 판정 ──
  // "보유 ≥ 화면 예상 소모량"이면 귀속을 켜고, 자동으로 켠 키(autoBoundOnRef)가 부족해지면 끈다.
  // 사용자가 직접 만진 귀속은 건드리지 않는다. 두 경로에서 호출된다:
  //   ① 보유 입력 즉시(handleOwnedChange) — 지금 화면에 보이는 숫자 기준으로 바로 체크
  //   ② 줄 최적화 클릭 → materials 재계산 도착 시 1회 — 적용 후 숫자 기준으로 재판정
  //     (숨결·책 예상량은 최적 적용 후에야 생기므로 ②가 그걸 마저 잡는다)
  // 이벤트 시점 1회 판정이라 "체크 → 정책 변화 → 소모 증가 → 재해제" 진동이 없다.
  const autoBoundOnRef = useRef<Set<string>>(new Set());
  const judgeAutoBounds = useCallback((ownMap: Record<string, number>) => {
    if (!ownedFeatureActive || !materials) return;
    const auto = autoBoundOnRef.current;
    const ownOf = (k: string) => ownMap[k] || 0;
    // 화면 표시와 같은 기준: materials 의 예상 소모량 (성장 포함 토글·특재 절약이 반영된 값 그대로)
    const needOf: Record<string, number> = {
      수호석결정: materials.수호석결정 || 0,
      파괴석결정: materials.파괴석결정 || 0,
      위대한돌파석: materials.위대한돌파석 || 0,
      상급아비도스: materials.상급아비도스 || 0,
      운명파편: materials.운명파편 || 0,
      빙하: materials.빙하 || 0, // 일반+상급+완갑 총합 (카드 합계와 동일)
      용암: materials.용암 || 0,
      방어구책1215: materials.방어구책1215 || 0,
      방어구책1619: materials.방어구책1619 || 0,
      무기책1215: materials.무기책1215 || 0,
      무기책1619: materials.무기책1619 || 0,
    };
    // desired true = 보유 ≥ 예상(켠다), false = 자동으로 켰는데 부족해짐(끈다), null = 불개입
    const decide = (key: string, cur: boolean): boolean | null => {
      const need = needOf[key] || 0;
      const own = ownOf(key);
      if (need > 0 && own >= need) {
        if (!cur) { auto.add(key); return true; }
        return null;
      }
      if (auto.has(key)) {
        auto.delete(key);
        return cur ? false : null; // 사용자가 이미 껐다면 추적만 해제
      }
      return null;
    };

    // 계승 재료 (boundMaterials)
    const bmUpdates: Record<string, boolean> = {};
    OWNED_BM_KEYS.forEach(k => {
      const d = decide(k, !!boundMaterials[k]);
      if (d !== null) bmUpdates[k] = d;
    });
    if (Object.keys(bmUpdates).length > 0) setBoundMaterials(prev => ({ ...prev, ...bmUpdates }));

    // 숨결·전율책 — 보유 키 하나가 여러 isBound 플래그를 대표한다 (빙하 = 일반+완갑+상급 양턴)
    const moUpd: Record<string, boolean> = {};
    const advUpd: Record<string, boolean> = {};
    Object.entries(OWNED_FLAG_MAP).forEach(([key, m]) => {
      const cur =
        m.mo.every(k => (materialOptions as Record<string, { isBound: boolean }>)[k].isBound) &&
        m.adv.every(k => (advancedMaterialOptions as Record<string, { isBound: boolean }>)[k].isBound);
      const d = decide(key, cur);
      if (d === null) return;
      m.mo.forEach(k => { moUpd[k] = d; });
      m.adv.forEach(k => { advUpd[k] = d; });
    });
    if (Object.keys(moUpd).length > 0) {
      setMaterialOptions(prev => {
        const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean; optimal?: boolean }>;
        Object.entries(moUpd).forEach(([k, v]) => { next[k] = { ...next[k], isBound: v }; });
        return next as typeof prev;
      });
    }
    if (Object.keys(advUpd).length > 0) {
      setAdvancedMaterialOptions(prev => {
        const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean }>;
        Object.entries(advUpd).forEach(([k, v]) => { next[k] = { ...next[k], isBound: v }; });
        return next as typeof prev;
      });
    }
  }, [ownedFeatureActive, materials, boundMaterials, materialOptions, advancedMaterialOptions]);
  // 입력 핸들러(위쪽 선언)가 즉시 판정을 부를 수 있게 ref 로 연결 — 렌더마다 최신 함수 대입
  judgeAutoBoundsRef.current = judgeAutoBounds;

  // 원샷 플래그: 줄 최적화 클릭 → 스냅샷 반영 → materials 재계산 완료 → 1회 재판정.
  // 클릭 "순간"의 materials 는 적용 전 정책 기준이라(예: 숨결 미사용이면 숨결 예상 0)
  // 판정을 재계산 후로 미뤄야 "화면에 뜨는 바로 그 숫자"와 비교하게 된다.
  const pendingAutoBoundRef = useRef(false);
  const applyOwnedSnapshot = useCallback(() => {
    setAppliedOwned({ ...ownedMaterials });
    pendingAutoBoundRef.current = true;
  }, [ownedMaterials]);
  useEffect(() => {
    if (!pendingAutoBoundRef.current) return;
    pendingAutoBoundRef.current = false; // 1회 소모 — 판정이 낳는 재계산에는 다시 반응하지 않는다(진동 불가)
    judgeAutoBounds({ ...ownedMaterials });
    // 의존성은 materials 하나만 — 클릭 커밋(재계산 전, materials 가 아직 옛값)에 발화해
    // 플래그를 미리 소모하지 않도록, "재계산된 materials 가 도착한" 커밋에서만 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials]);

  // 자동으로 켰던 귀속만 해제 (사용자가 직접 켠 귀속은 유지) — 초기화·자동 해제 공용
  const releaseAutoBounds = useCallback(() => {
    const auto = autoBoundOnRef.current;
    if (auto.size === 0) return;
    const bmOff: Record<string, boolean> = {};
    const moOff: Record<string, boolean> = {};
    const advOff: Record<string, boolean> = {};
    auto.forEach(k => {
      if ((OWNED_BM_KEYS as readonly string[]).includes(k)) bmOff[k] = false;
      const m = OWNED_FLAG_MAP[k];
      if (m) {
        m.mo.forEach(f => { moOff[f] = false; });
        m.adv.forEach(f => { advOff[f] = false; });
      }
    });
    auto.clear();
    if (Object.keys(bmOff).length > 0) setBoundMaterials(prev => ({ ...prev, ...bmOff }));
    if (Object.keys(moOff).length > 0) {
      setMaterialOptions(prev => {
        const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean; optimal?: boolean }>;
        Object.entries(moOff).forEach(([k, v]) => { next[k] = { ...next[k], isBound: v }; });
        return next as typeof prev;
      });
    }
    if (Object.keys(advOff).length > 0) {
      setAdvancedMaterialOptions(prev => {
        const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean }>;
        Object.entries(advOff).forEach(([k, v]) => { next[k] = { ...next[k], isBound: v }; });
        return next as typeof prev;
      });
    }
  }, []);

  // 초기화 — 보유 입력·적용 스냅샷과 최적 적용(일반 숨결·책 / 상급 / 완갑),
  // 그리고 자동으로 켰던 귀속을 한 번에 해제한다 (사용자가 직접 켠 귀속은 유지).
  const handleOwnedReset = useCallback(() => {
    setOwnedMaterials({});
    setAppliedOwned({});
    releaseAutoBounds();
    // 보조재료 사용 토글·최적 모드 전부 초기 상태(미사용)로 — 귀속 체크는 건드리지 않는다
    setMaterialOptions(prev => {
      const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean; optimal?: boolean }>;
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], enabled: false, ...('optimal' in next[k] ? { optimal: false } : {}) };
      });
      return next as typeof prev;
    });
    setAdvancedMaterialOptions(prev => {
      const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean }>;
      Object.keys(next).forEach(k => { next[k] = { ...next[k], enabled: false }; });
      return next as typeof prev;
    });
    setAdvOptApplied({ armor: false, weapon: false });
  }, [releaseAutoBounds]);

  // "최적 숨결/책" 단계별 정책 테이블 (모드 + 시세 + 귀속 + 보유 커버리지 기준)
  // level 키 = 현재 레벨(L→L+1). armor/weapon 각각.
  // 귀속 체크된 재료·숨결·책은 실지출 0으로 취급해 사용 쪽으로 최적화된다 (골드(누골)는 항상 실지출).
  // 보유 개수는 ownedEffPrices(풀사용 기준 커버리지 할인)로만 반영한다 — 선택된 정책의
  // 필요량을 되먹이지 않으므로 순환이 없다.
  const optimalBreathTable = useMemo(() => {
    const armor: Record<number, PreOptVariants> = {};
    const weapon: Record<number, PreOptVariants> = {};
    const mp = (id: string) => ownedEffPrices[id] || 0; // 보유 커버리지 반영 유효 단가
    const rawMp = (id: string) => marketPrices[id] || 0; // 시세 로딩 여부 판정용 원시 시세
    const bnd = (key: string) => !!boundMaterials[key]; // 귀속 재료 → 실지출 0
    // 로딩 게이트는 원시 시세로 — 유효 단가는 보유가 다 덮으면 0이 되는데,
    // 그걸 게이트로 쓰면 "보유로 공짜"가 "시세 미로딩"으로 오인돼 후보에서 빠진다
    const glacierMkt = rawMp('66111132');
    const lavaMkt = rawMp('66111131');
    const glacierP = materialOptions.glacierBreath.isBound ? 0 : mp('66111132');
    const lavaP = materialOptions.lavaBreath.isBound ? 0 : mp('66111131');
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
      // 전율 책(계승 후 전용, 도전 12~19) — 효과는 기본 확률만큼 가산(2배)
      const thrillProb = getSuccessionBookBonus(L);
      const aThrillGate = target <= 15 ? rawMp('66112564') : target <= 19 ? rawMp('66112565') : 0;
      const wThrillGate = target <= 15 ? rawMp('66112561') : target <= 19 ? rawMp('66112562') : 0;
      const aThrillMkt = target <= 15 ? mp('66112564') : target <= 19 ? mp('66112565') : 0;
      const wThrillMkt = target <= 15 ? mp('66112561') : target <= 19 ? mp('66112562') : 0;
      const aThrillBound = target <= 15 ? materialOptions.tailoring1215.isBound : materialOptions.tailoring1619.isBound;
      const wThrillBound = target <= 15 ? materialOptions.metallurgy1215.isBound : materialOptions.metallurgy1619.isBound;
      const mkSuccVariants = (mat: number, breathP: number, bookGate: number, bookMkt: number, bookBound: boolean): PreOptVariants | null => {
        const books = thrillProb > 0 && bookGate > 0 ? [{ id: 'thrill', prob: thrillProb, price: bookBound ? 0 : bookMkt }] : [];
        const rec = optimalBreathWithBook(baseProb, be, books, mat, breathP, calcMode, 'auto');
        const on = optimalBreathWithBook(baseProb, be, books, mat, breathP, calcMode, 'on');
        const off = optimalBreathWithBook(baseProb, be, [], mat, breathP, calcMode, 'off');
        if (!rec || !on || !off) return null;
        return { rec, on, off };
      };
      // 숨결 시세 미로딩 시엔 정책을 만들지 않는다 → 호출부가 CASE 테이블 경로로 폴백
      const sa = glacierMkt > 0 ? mkSuccVariants(aMat, glacierP, aThrillGate, aThrillMkt, aThrillBound) : null;
      const sw = lavaMkt > 0 ? mkSuccVariants(wMat, lavaP, wThrillGate, wThrillMkt, wThrillBound) : null;
      if (sa) armor[L] = sa;
      if (sw) weapon[L] = sw;
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
      const aBookGate = target <= 14 ? rawMp('66112546') : target <= 18 ? rawMp('66112552') : rawMp('66112554');
      const wBookGate = target <= 14 ? rawMp('66112543') : target <= 18 ? rawMp('66112551') : rawMp('66112553');
      const aBookMkt = target <= 14 ? mp('66112546') : target <= 18 ? mp('66112552') : mp('66112554');
      const wBookMkt = target <= 14 ? mp('66112543') : target <= 18 ? mp('66112551') : mp('66112553');
      const aBookBound = target <= 14 ? materialOptions.tailoring.isBound : target <= 18 ? materialOptions.tailoring1518.isBound : materialOptions.tailoring1920.isBound;
      const wBookBound = target <= 14 ? materialOptions.metallurgy.isBound : target <= 18 ? materialOptions.metallurgy1518.isBound : materialOptions.metallurgy1920.isBound;
      const aEnhGate = hasEnhancedBook ? rawMp('66112556') : 0;
      const wEnhGate = hasEnhancedBook ? rawMp('66112555') : 0;
      const aEnhMkt = hasEnhancedBook ? mp('66112556') : 0;
      const wEnhMkt = hasEnhancedBook ? mp('66112555') : 0;
      const aEnhBound = materialOptions.tailoring1920Enhanced.isBound;
      const wEnhBound = materialOptions.metallurgy1920Enhanced.isBound;
      const mkVariants = (mat: number, breathP: number, bookGate: number, bookMkt: number, bookBound: boolean, enhGate: number, enhMkt: number, enhBound: boolean): PreOptVariants | null => {
        // 원시 시세가 있는 책만 후보에 올리고(로딩 게이트), 귀속 책은 가격 0(공짜)으로 반영
        const normalBooks = bookProb > 0 && bookGate > 0 ? [{ id: 'normal', prob: bookProb, price: bookBound ? 0 : bookMkt }] : [];
        const enhancedBooks = hasEnhancedBook && enhGate > 0 ? [{ id: 'enhanced', prob: bookProb * 2, price: enhBound ? 0 : enhMkt }] : [];
        const rec = optimalBreathWithBook(baseProb, be, [...normalBooks, ...enhancedBooks], mat, breathP, calcMode, 'auto');
        const on = optimalBreathWithBook(baseProb, be, normalBooks, mat, breathP, calcMode, 'on');
        const off = optimalBreathWithBook(baseProb, be, [], mat, breathP, calcMode, 'off');
        const onEnhanced = enhancedBooks.length > 0 ? optimalBreathWithBook(baseProb, be, enhancedBooks, mat, breathP, calcMode, 'on') : null;
        if (!rec || !on || !off) return null;
        return { rec, on, off, ...(onEnhanced ? { onEnhanced } : {}) };
      };
      // 숨결 시세 미로딩 상태에서는 최적 정책 생략 (수동 CASE 테이블 경로 폴백)
      const pa = glacierMkt > 0 ? mkVariants(aMat, glacierP, aBookGate, aBookMkt, aBookBound, aEnhGate, aEnhMkt, aEnhBound) : null;
      const pw = lavaMkt > 0 ? mkVariants(wMat, lavaP, wBookGate, wBookMkt, wBookBound, wEnhGate, wEnhMkt, wEnhBound) : null;
      if (pa) preArmor[L] = pa;
      if (pw) preWeapon[L] = pw;
    }

    return { armor, weapon, preArmor, preWeapon };
    // 성능: materialOptions 객체 전체가 아니라 실제 사용하는 .isBound 값만 의존한다.
    // (사용 토글 .enabled 변경 시 ~수백만 연산의 테이블을 재계산하지 않도록)
    // ownedEffPrices: 보유 커버리지 반영 유효 단가 — 적용 스냅샷(appliedOwned) 기반이라 타이핑 중엔 안 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcMode, marketPrices, ownedEffPrices, boundMaterials,
    materialOptions.glacierBreath.isBound, materialOptions.lavaBreath.isBound,
    materialOptions.tailoring.isBound, materialOptions.tailoring1518.isBound,
    materialOptions.tailoring1920.isBound, materialOptions.tailoring1920Enhanced.isBound,
    materialOptions.metallurgy.isBound, materialOptions.metallurgy1518.isBound,
    materialOptions.metallurgy1920.isBound, materialOptions.metallurgy1920Enhanced.isBound,
    materialOptions.tailoring1215.isBound, materialOptions.tailoring1619.isBound,
    materialOptions.metallurgy1215.isBound, materialOptions.metallurgy1619.isBound]);

  // 실제 강화 대상 단계 (타입별, 계승 전/후 구분) — 최적 숨결 표시는 이 구간만
  const refinedLevelsByType = useMemo(() => {
    const armor = new Set<number>();
    const weapon = new Set<number>();
    const preArmor = new Set<number>();
    const preWeapon = new Set<number>();
    equipments.forEach(eq => {
      if (eq.isEsther) return; // 에스더는 일반 재련 없음
      if (eq.isWangap) return; // 완갑은 전용 계산 — 재련 최적 숨결 그룹에 섞지 않는다
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

  // === 특수 재련 (특재) 배분 계획 ===
  // 목표 구간의 모든 단계(계승 후 무기/방어구 부위별 + 완갑)를 "돌 1개당 절약 골드" 내림차순으로
  // 정렬해 보유 특재돌 범위에서 그리디 배분한다. 단계별 일반 재련 기대 비용은
  // calculateMaterials와 동일한 경로(최적 숨결 정책/책 토글/귀속/계산 모드)로 산출해 일관성을 지킨다.
  // 계승 전 장비는 특재 불가라 후보에서 제외.
  const specialPlan = useMemo<SpecialPlan | null>(() => {
    // 수동 선택 중이면 보유 개수 없이도 계산한다 (자동 배분만 보유량을 필요로 함)
    if (!useSpecial || !searched) return null;
    if (!specialManualKeys && specialStones <= 0) return null;
    const mp = (id: string) => marketPrices[id] || 0;
    const bnd = (key: string) => !!boundMaterials[key];
    const cands: SpecialCandidate[] = [];
    equipments.forEach(eq => {
      const t = targetLevels[eq.name];
      if (!t?.normal || t.normal <= eq.currentLevel) return;
      if (eq.isEsther) return;
      if (eq.isWangap) {
        const modeOf = (o: { enabled: boolean; optimal: boolean }): WangapBreathMode =>
          !o.enabled ? 'off' : o.optimal ? 'optimal' : 'full';
        for (let L = eq.currentLevel; L < t.normal; L++) {
          const wr = computeWangapAverage({
            startLevel: L,
            targetLevel: L + 1,
            startGrade: (eq.grade as WangapGrade) || '영웅',
            mode: calcMode,
            lavaMode: modeOf(materialOptions.wangapLava),
            glacierMode: modeOf(materialOptions.wangapGlacier),
            boundFlags: {
              파괴석결정: bnd('파괴석결정'), 수호석결정: bnd('수호석결정'),
              위대한돌파석: bnd('위대한돌파석'), 상급아비도스: bnd('상급아비도스'),
              운명파편: bnd('운명파편'),
              용암: materialOptions.wangapLava.isBound,
              빙하: materialOptions.wangapGlacier.isBound,
            },
            unitPrices: {
              파괴석결정: mp('66102007'), 수호석결정: mp('66102107'),
              위대한돌파석: mp('66110226'), 상급아비도스: mp('6861013'),
              운명파편: mp('66130143'), 용암: mp('66111131'), 빙하: mp('66111132'),
            },
          });
          // 성장 비용은 재련 방식과 무관하게 지불하므로 절약 비교에서 제외 (totals에는 미포함)
          const cost =
            (bnd('파괴석결정') ? 0 : wr.totals.파괴석결정 * mp('66102007'))
            + (bnd('수호석결정') ? 0 : wr.totals.수호석결정 * mp('66102107'))
            + (bnd('위대한돌파석') ? 0 : wr.totals.위대한돌파석 * mp('66110226'))
            + (bnd('상급아비도스') ? 0 : wr.totals.상급아비도스 * mp('6861013'))
            + (bnd('운명파편') ? 0 : wr.totals.운명파편 * mp('66130143'))
            + wr.totals.골드
            + (materialOptions.wangapLava.isBound ? 0 : wr.totals.용암 * mp('66111131'))
            + (materialOptions.wangapGlacier.isBound ? 0 : wr.totals.빙하 * mp('66111132'));
          cands.push({ key: `${eq.name}:${L}`, equipName: eq.name, kind: 'wangap', level: L, normalCostGold: cost });
        }
        return;
      }
      if (!eq.isSuccession) return; // 계승 전은 특재 불가
      const isArmor = eq.type === 'armor';
      for (let L = eq.currentLevel; L < t.normal; L++) {
        const baseProb = SUCCESSION_BASE_PROBABILITY[L];
        if (!baseProb) continue;
        const nextLevel = L + 1;
        const mc = isArmor ? SUCCESSION_ARMOR_MATERIAL_COSTS[nextLevel] : SUCCESSION_WEAPON_MATERIAL_COSTS[nextLevel];
        if (!mc) continue;
        const breathOpt = isArmor ? materialOptions.glacierBreath : materialOptions.lavaBreath;
        const useBreath = breathOpt.enabled;
        const useOptimal = useBreath && breathOpt.optimal;
        // 전율 책 토글·시세 (calculateMaterials와 동일 규칙)
        let useThrill = false; let thrillBound = false; let thrillPrice = 0;
        if (nextLevel >= 12 && nextLevel <= 15) {
          const o = isArmor ? materialOptions.tailoring1215 : materialOptions.metallurgy1215;
          useThrill = o.enabled; thrillBound = o.isBound;
          thrillPrice = mp(isArmor ? '66112564' : '66112561');
        } else if (nextLevel >= 16 && nextLevel <= 19) {
          const o = isArmor ? materialOptions.tailoring1619 : materialOptions.metallurgy1619;
          useThrill = o.enabled; thrillBound = o.isBound;
          thrillPrice = mp(isArmor ? '66112565' : '66112562');
        }
        const succVariants = useOptimal
          ? (isArmor ? optimalBreathTable.armor : optimalBreathTable.weapon)[L]
          : undefined;
        let tries: number; let breaths: number; let bookUsed: boolean;
        if (succVariants) {
          const pol = useThrill ? succVariants.on : succVariants.off;
          tries = pol.tries; breaths = pol.breaths; bookUsed = pol.useBook;
        } else {
          tries = getSuccessionTries(L, useBreath, useThrill, calcMode);
          breaths = useBreath ? getSuccessionBreathEffect(baseProb).max * tries : 0;
          bookUsed = useThrill && L >= 11 && L <= 18; // getSuccessionTries의 effectiveBook 조건과 동일
        }
        if (tries <= 0) continue;
        const stonePart = isArmor
          ? (bnd('수호석결정') ? 0 : (mc as any).수호석결정 * mp('66102107'))
          : (bnd('파괴석결정') ? 0 : (mc as any).파괴석결정 * mp('66102007'));
        const perTry = stonePart
          + (bnd('위대한돌파석') ? 0 : (mc as any).위대한돌파석 * mp('66110226'))
          + (bnd('상급아비도스') ? 0 : (mc as any).상급아비도스 * mp('6861013'))
          + (bnd('운명파편') ? 0 : mc.운명파편 * mp('66130143'))
          + mc.골드
          + (bookUsed ? (thrillBound ? 0 : thrillPrice) : 0);
        const breathPrice = breathOpt.isBound ? 0 : mp(isArmor ? '66111132' : '66111131');
        const cost = tries * perTry + breaths * breathPrice;
        cands.push({ key: `${eq.name}:${L}`, equipName: eq.name, kind: isArmor ? 'armor' : 'weapon', level: L, normalCostGold: cost });
      }
    });
    // 체크박스를 한 번이라도 만졌으면 그 선택을 그대로 쓰고, 아니면 보유 돌 기준 자동 배분
    return specialManualKeys
      ? buildSpecialPlanFromKeys(cands, specialManualKeys, calcMode)
      : buildSpecialPlan(cands, specialStones, calcMode);
  }, [useSpecial, specialStones, specialManualKeys, searched, equipments, targetLevels, calcMode, marketPrices, boundMaterials, materialOptions, optimalBreathTable]);

  // 우선순위 표 체크박스 토글 — 첫 토글 때 현재(자동) 선택을 그대로 복사해 수동 모드로 넘어간다
  const toggleSpecialStage = (key: string) => {
    setSpecialManualKeys(prev => {
      const next = new Set(prev ?? specialPlan?.chosenKeys ?? []);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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
    materialOptions.tailoring1215.isBound, materialOptions.tailoring1619.isBound,
    materialOptions.metallurgy1215.isBound, materialOptions.metallurgy1619.isBound,
    // 보유 커버리지 반영 유효 단가 — 보유 개수 변경도 시세 변경과 동급으로 책 동기화를 재무장한다
    refinedLevelsByType, calcMode, marketPrices, ownedEffPrices,
  ]), [boundMaterials, materialOptions, refinedLevelsByType, calcMode, marketPrices, ownedEffPrices]);

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

      // 계승 후(전율) 책도 같은 규칙으로 권장 여부를 반영한다
      const succTbl = type === 'armor' ? optimalBreathTable.armor : optimalBreathTable.weapon;
      const succLevels = type === 'armor' ? refinedLevelsByType.armor : refinedLevelsByType.weapon;
      const succKeys = type === 'armor'
        ? { '1215': 'tailoring1215', '1619': 'tailoring1619' }
        : { '1215': 'metallurgy1215', '1619': 'metallurgy1619' };
      succLevels.forEach(L => {
        const v = succTbl[L];
        if (!v) return;
        const t = L + 1;
        const range = t >= 12 && t <= 15 ? '1215' : t >= 16 && t <= 19 ? '1619' : '';
        if (!range) return;
        const key = succKeys[range as keyof typeof succKeys];
        desired[key] = (desired[key] || false) || v.rec.useBook;
      });

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
    // 보유 커버리지 반영 유효 단가 — 보유분이 풀사용 필요량을 덮으면 0(귀속과 동일 취급)
    const mp = (id: string) => ownedEffPrices[id] || 0;
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
  }, [advStagesByType, marketPrices, ownedEffPrices, boundMaterials, advancedMaterialOptions]);

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

  // 완갑 최적 숨결 내역 팝업 (단계별 용암·빙하 투입 계획)
  const [openWangapPopup, setOpenWangapPopup] = useState(false);
  useEffect(() => {
    if (!openWangapPopup) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-wangap-opt-popup]') || t.closest('[data-wangap-opt-btn]')) return;
      setOpenWangapPopup(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openWangapPopup]);

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
  // 숨결 종류: 방어구=빙하 / 무기=용암 / 완갑=용암·빙하 둘 다(전용 토글)
  const breathOptionKey = (type: BreathKind) =>
    type === 'armor' ? 'glacierBreath' : type === 'weapon' ? 'lavaBreath' : type;
  const breathModeOf = (type: BreathKind): 'off' | 'full' | 'optimal' => {
    const o = (materialOptions as any)[breathOptionKey(type)];
    return !o.enabled ? 'off' : (o.optimal ? 'optimal' : 'full');
  };
  const setBreathMode = (type: BreathKind, mode: 'off' | 'full' | 'optimal') => {
    // 권장 책 토글 1회 자동 세팅 (완갑은 책이 없어 대상 아님)
    if (mode === 'optimal' && (type === 'armor' || type === 'weapon')) pendingBookSync.current[type] = true;
    const key = breathOptionKey(type);
    setMaterialOptions(p => ({ ...p, [key]: { ...(p as any)[key], enabled: mode !== 'off', optimal: mode === 'optimal' } }));
  };
  const calcModeLabel = calcMode === 'median' ? '중앙값' : calcMode === 'average' ? '평균값' : '장기백';

  // ── 적용된 최적화 전체 해제 ──
  // 목표·시작 단계·보유 입력이 바뀌면 호출된다 — 적용돼 있던 최적화(일반 숨결·상급·완갑)가
  // 풀려 줄 버튼이 "보조재료 비용 최적화" 상태로 돌아오고, 다시 눌러야 새 조건으로 계산된다.
  // 각 setState 는 바뀔 게 없으면 prev 를 그대로 돌려줘 불필요한 리렌더가 없다.
  const deactivateOptimizations = useCallback(() => {
    setMaterialOptions(prev => {
      const keys = ['glacierBreath', 'lavaBreath', 'wangapLava', 'wangapGlacier'] as const;
      if (!keys.some(k => prev[k].enabled && prev[k].optimal)) return prev;
      const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean; optimal?: boolean }>;
      keys.forEach(k => {
        if (next[k].optimal) next[k] = { ...next[k], enabled: false, optimal: false };
      });
      return next as typeof prev;
    });
    if (advOptApplied.armor || advOptApplied.weapon) {
      setAdvancedMaterialOptions(prev => {
        const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean }>;
        (['armor', 'weapon'] as const).forEach(type => {
          if (!advOptApplied[type]) return;
          Object.keys(next).forEach(k => {
            if (k.startsWith(type)) next[k] = { ...next[k], enabled: false };
          });
        });
        return next as typeof prev;
      });
      setAdvOptApplied({ armor: false, weapon: false });
    }
    // 자동 귀속(autoBoundOnRef)은 여기서 풀지 않는다 — 보유 입력 중에도 호출되는데,
    // 그때 다른 재료의 자동 체크까지 풀리면 안 된다. 귀속 재판정은 judgeAutoBounds 몫.
    setAppliedOwned(prev => (Object.keys(prev).length > 0 ? {} : prev));
  }, [advOptApplied]);
  deactivateOptRef.current = deactivateOptimizations;

  // 목표·시작 단계 변경 감시 — 마운트와 동일 참조는 건너뛴다.
  // 목표가 바뀌면 예상 소모의 근거가 무너지므로 자동 귀속까지 함께 해제한다.
  // 해제가 바꾸는 상태는 이 effect 의 의존성이 아니므로 루프가 없다.
  const prevPlanRef = useRef<{ t: typeof targetLevels; e: typeof equipments } | null>(null);
  useEffect(() => {
    const prev = prevPlanRef.current;
    prevPlanRef.current = { t: targetLevels, e: equipments };
    if (!prev) return;
    if (prev.t === targetLevels && prev.e === equipments) return;
    deactivateOptimizations();
    releaseAutoBounds();
  }, [targetLevels, equipments, deactivateOptimizations, releaseAutoBounds]);

  // 숨결 컨트롤 (미사용/풀숨/최적) — 카드 내부 하단. 귀속은 카드 우상단 라벨(다른 재료와 동일)
  // 팝업은 "최적" 버튼을 감싼 래퍼에 붙어 바로 위로 뜬다.
  // 장비 성장(재련 경험치) 포함/제외 토글 — 파편·실링 카드 하단.
  // 성장 비용은 단계마다 1회 고정이라 재련 시도분과 성격이 달라 따로 끌 수 있게 둔다.
  const renderGrowthToggle = (growthAmount: number) => (
    <div className={styles.growthToggleWrap} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className={`${styles.growthToggleBtn} ${includeGrowth ? styles.growthToggleOn : styles.growthToggleOff}`}
        onClick={() => setIncludeGrowth(v => !v)}
        title={`장비 성장(재련 경험치) ${growthAmount.toLocaleString()} — 단계마다 1회 고정 비용`}
      >
        성장 {includeGrowth ? '포함' : '제외'}
        <span className={styles.growthToggleAmt}>{growthAmount.toLocaleString()}</span>
      </button>
    </div>
  );

  const renderBreathControls = (type: BreathKind) => {
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
        </div>
      </div>
    );
  };

  // 일반 재련 책 카드 하단 컨트롤 — 숨결 카드와 같은 2버튼(미사용|풀책) 구조로 일관성 유지.
  // 책은 매 시도 1권이라 "풀책" = 사용. exclusiveWithKey를 주면 켜는 순간 반대쪽(일반/강화 등)을 자동으로 끈다.
  const renderSimpleToggle = (
    key: keyof typeof materialOptions,
    exclusiveWithKey?: keyof typeof materialOptions
  ) => {
    const enabled = (materialOptions as any)[key].enabled as boolean;
    const setEnabled = (next: boolean) => setMaterialOptions(p => ({
      ...p,
      [key]: { ...(p as any)[key], enabled: next },
      ...(exclusiveWithKey && next ? { [exclusiveWithKey]: { ...(p as any)[exclusiveWithKey], enabled: false } } : {}),
    }));
    return (
      <div className={styles.breathControls} onClick={e => e.stopPropagation()}>
        <div className={styles.advTurnRow}>
          <div className={styles.advTurnItem}>
            <button
              type="button"
              onClick={() => setEnabled(false)}
              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${!enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
            >
              미사용
            </button>
          </div>
          <div className={styles.advTurnItem}>
            <button
              type="button"
              onClick={() => setEnabled(true)}
              className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${enabled ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
            >
              풀책
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 최적 숨결 단계별 팝업 — 최적 버튼 바로 위(카드 안에서 나옴), 실제 강화 구간만·한 줄
  // 계승 전 장비가 있으면 "계승 전" 그룹도 함께 표시 (책 사용 여부 포함)
  const renderBreathPopup = (type: 'armor' | 'weapon') => {
    if (openBreathPopup !== type) return null;
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
    const breathIcon = isArmor ? '/breath-glacier.webp' : '/breath-lava.webp';
    const breathIconName = isArmor ? '빙하의 숨결' : '용암의 숨결';
    const breathKindCls = (kind: OptimalPolicy['kind']) =>
      kind === 'none' ? styles.breathRowNone : kind === 'full' ? styles.breathRowFull : styles.breathRowPartial;
    // "1~N회차 풀숨" = 이 단계에서 처음 N번 시도까지만 풀숨, 그 뒤 시도는 노숨
    const breathLabel = (p: OptimalPolicy) =>
      p.kind === 'none' ? '노숨' : p.kind === 'full' ? '풀숨' : `1~${p.optimalN}회차 풀숨`;
    const renderBreathCell = (p: OptimalPolicy) => (
      <span className={`${styles.breathRowCell} ${breathKindCls(p.kind)}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async" src={breathIcon} alt={breathIconName}
          className={`${styles.breathRowIcon} ${p.kind === 'none' ? styles.breathRowIconOff : ''}`} />
        {breathLabel(p)}
      </span>
    );
    // 책은 매 시도 1권 소모 → 권수(=시도 수)를 그대로 보여줘 재료 카드 합계와 이어지게 한다
    const renderBookCell = (p: PreSuccessionPolicy, thrill: boolean) => {
      if (!p.useBook) return <span className={`${styles.breathRowCell} ${styles.breathRowMuted}`}>책 안 씀</span>;
      const icon = thrill
        ? (isArmor ? '/tailoring-thrill.webp' : '/metallurgy-thrill.webp')
        : (isArmor ? '/tailoring-karma.webp' : '/metallurgy-karma.webp');
      const name = thrill ? `${bookName} 전율` : p.bookId === 'enhanced' ? `강화 ${bookName}` : bookName;
      return (
        <span className={`${styles.breathRowCell} ${styles.breathChipBookName}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src={icon} alt={name} className={styles.breathRowIcon} />
          {name} {Math.round(p.tries)}권
        </span>
      );
    };
    // 계승 후 전율 책 토글 (도전 단계 기준)
    const succThrillToggleOn = (target: number) => {
      if (target < 12 || target > 19) return false;
      if (isArmor) return target <= 15 ? materialOptions.tailoring1215.enabled : materialOptions.tailoring1619.enabled;
      return target <= 15 ? materialOptions.metallurgy1215.enabled : materialOptions.metallurgy1619.enabled;
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
                <div className={styles.breathRows}>
                  {preLevels.map(L => {
                    const v = preTbl[L];
                    if (!v) return null;
                    const p = pickPrePolicy(v, L + 1);
                    return (
                      <div key={L} className={styles.breathRow}>
                        <span className={styles.breathRowLv}>+{L}→{L + 1}</span>
                        {renderBreathCell(p)}
                        {renderBookCell(p, false)}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {levels.length > 0 && (
              <>
                {bothShown && <div className={styles.breathPopupGroupLabel}>계승 후</div>}
                <div className={styles.breathRows}>
                  {levels.map(L => {
                    const v = tbl[L];
                    if (!v) return null;
                    const p = succThrillToggleOn(L + 1) ? v.on : v.off;
                    return (
                      <div key={L} className={styles.breathRow}>
                        <span className={styles.breathRowLv}>+{L}→{L + 1}</span>
                        {renderBreathCell(p)}
                        {renderBookCell(p, true)}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {/* 적용은 줄 제목의 "보조재료 비용 최적화" 버튼이 담당 — 팝업은 내역 표시 전용 */}
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
    const isArmor = type === 'armor';
    // 턴별 숨결·책 조합 — 실제 아이템 아이콘으로 뭘 쓰는지 바로 보이게 한다
    const renderCombo = (breath: boolean, book: boolean, stage: AdvStageNum) => {
      if (!breath && !book) return <span className={`${styles.breathRowCell} ${styles.breathRowMuted}`}>미사용</span>;
      return (
        <span className={`${styles.breathRowCell} ${styles.breathRowFull}`}>
          {breath && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img loading="lazy" decoding="async" src={isArmor ? '/breath-glacier.webp' : '/breath-lava.webp'}
              alt={isArmor ? '빙하의 숨결' : '용암의 숨결'} className={styles.breathRowIcon} />
          )}
          {book && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img loading="lazy" decoding="async" src={`/master-${isArmor ? 'tailoring' : 'metallurgy'}-${stage}.webp`}
              alt={`장인의 ${isArmor ? '재봉술' : '야금술'} ${stage}단계`} className={styles.breathRowIcon} />
          )}
          {advComboLabel(breath, book)}
        </span>
      );
    };
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
                <div className={styles.breathRows}>
                  {plan.stages.map(s => (
                    <div key={s.stage} className={styles.breathRow}>
                      <span className={styles.breathRowLv}>{(s.stage - 1) * 10}~{s.stage * 10}단계</span>
                      <span className={styles.breathRowCell}>
                        <span className={styles.advOptChipTurn}>일반턴</span>
                        {renderCombo(plan.normalBreath, s.normalBook, s.stage)}
                      </span>
                      <span className={styles.breathRowCell}>
                        <span className={styles.advOptChipTurn}>선조턴</span>
                        {renderCombo(plan.bonusBreath, s.bonusBook, s.stage)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* 적용은 줄 제목의 "보조재료 비용 최적화" 버튼이 담당 — 팝업은 내역·비용 요약 전용 */}
                <div className={styles.advOptFooter}>
                  <span className={styles.advOptSummary}>
                    <b className={styles.advOptGold}>{Math.round(plan.totalCost / 10000).toLocaleString()}만G</b>
                    {savePct > 0 && <em className={styles.advOptSave}> · 미사용 대비 -{savePct}%</em>}
                  </span>
                </div>
              </>
            )}
          </div>
    );
    // 모바일: 상위 transform에 fixed가 갇히지 않도록 body 포털로 렌더
    return isMobile ? createPortal(popup, document.body) : popup;
  };

  // 상급재련 재료 카드 하단 컨트롤 — 일반턴/선조턴 사용 여부를 라벨+토글 버튼 쌍(이전 디자인 느낌)으로 각각 표시.
  // "최적화" 버튼(+팝업)은 카드에서 빼서 줄 제목(방어구/무기) 옆으로 옮겼다 — renderAdvOptButton.
  const renderAdvTurnToggle = (
    normalKey: keyof typeof advancedMaterialOptions,
    bonusKey: keyof typeof advancedMaterialOptions,
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
      </div>
    </div>
    );
  };

  // 알약 hover 로 내역 팝업 열기(데스크톱) — 적용중 상태에서 클릭은 해제라, 내역은 hover 로 본다.
  // 버튼→팝업 사이 10px 틈을 지나는 동안 닫히지 않게 닫기는 200ms 유예 후 실행.
  const hoverCloseTimers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const hoverPopupOpen = (key: string, open: () => void) => {
    if (isMobile) return;
    const t = hoverCloseTimers.current[key];
    if (t) clearTimeout(t);
    hoverCloseTimers.current[key] = undefined;
    open();
  };
  const hoverPopupClose = (key: string, close: () => void) => {
    if (isMobile) return;
    const t = hoverCloseTimers.current[key];
    if (t) clearTimeout(t);
    hoverCloseTimers.current[key] = setTimeout(close, 200);
  };

  // ── 줄 제목(방어구/무기/완갑) 옆 최적 적용 버튼 ──
  // 액션형: 미적용 상태에서 누르면 바로 계산·적용하고 내역 팝업으로 결과를 보여준다.
  // 수동으로 미사용/풀숨·일반턴/선조턴을 바꾸면 적용이 풀려 버튼이 "적용" 상태로 돌아온다.
  // 적용중에 다시 누르면 내역 팝업만 토글. 줄 색 = 방어구 블루 / 무기 오렌지 / 완갑 퍼플.
  const renderBreathOptButton = (type: 'armor' | 'weapon') => {
    const applied = breathModeOf(type) === 'optimal';
    const colorCls = type === 'armor' ? styles.groupOptArmor : styles.groupOptWeapon;
    return (
      <span
        className={styles.groupOptWrap}
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => hoverPopupOpen(type, () => setOpenBreathPopup(type))}
        onMouseLeave={() => hoverPopupClose(type, () => setOpenBreathPopup(o => (o === type ? null : o)))}
      >
        <button
          type="button"
          data-breath-opt-btn
          className={`${styles.groupOptBtn} ${colorCls} ${applied ? styles.groupOptBtnOn : ''}`}
          onClick={() => {
            if (!applied) {
              applyOwnedSnapshot(); // 보유 입력 반영 + 화면 예상량 기준 자동 귀속
              setBreathMode(type, 'optimal');
              setOpenBreathPopup(type); // 적용 결과(단계별 조합)를 바로 보여준다
            } else {
              // 적용중 클릭 = 해제 → 미사용(숨결 0). 재적용하면 다시 계산·내역 표시
              setBreathMode(type, 'off');
              setOpenBreathPopup(o => (o === type ? null : o));
            }
          }}
          title={applied ? '누르면 최적 적용을 해제합니다 (미사용으로)' : '시세·보유 기준 최적 숨결·책 조합을 계산해 적용합니다'}
        >
          {applied ? '✓ 최적화 적용중' : '보조재료 비용 최적화'}
        </button>
        {renderBreathPopup(type)}
      </span>
    );
  };

  const renderAdvOptButton = (type: 'armor' | 'weapon') => {
    const applied = advOptApplied[type];
    const colorCls = type === 'armor' ? styles.groupOptArmor : styles.groupOptWeapon;
    return (
      <span
        className={styles.groupOptWrap}
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => hoverPopupOpen(`adv-${type}`, () => setOpenAdvOptPopup(type))}
        onMouseLeave={() => hoverPopupClose(`adv-${type}`, () => setOpenAdvOptPopup(o => (o === type ? null : o)))}
      >
        <button
          type="button"
          data-advopt-btn
          className={`${styles.groupOptBtn} ${colorCls} ${applied ? styles.groupOptBtnOn : ''}`}
          onClick={() => {
            if (!applied) {
              applyOwnedSnapshot();     // 보유 입력 반영 + 화면 예상량 기준 자동 귀속
              applyAdvOptimal(type);    // 내부에서 팝업을 닫지만 아래가 같은 배치에서 다시 연다
              setOpenAdvOptPopup(type); // 적용 결과(구간별 조합)를 바로 보여준다
            } else {
              // 적용중 클릭 = 해제 → 그 타입의 일반턴/선조턴 숨결·책 전부 미사용(0)
              setAdvOptApplied(p => ({ ...p, [type]: false }));
              setAdvancedMaterialOptions(prev => {
                const next = { ...prev } as Record<string, { enabled: boolean; isBound: boolean }>;
                Object.keys(next).forEach(k => {
                  if (k.startsWith(type)) next[k] = { ...next[k], enabled: false };
                });
                return next as typeof prev;
              });
              setOpenAdvOptPopup(o => (o === type ? null : o));
            }
          }}
          title={applied ? '누르면 최적화 적용을 해제합니다 (전부 미사용으로)' : '시세·보유 기준 최적 숨결·책 조합을 계산해 적용합니다'}
        >
          {applied ? '✓ 최적화 적용중' : '보조재료 비용 최적화'}
        </button>
        {renderAdvOptPopup(type)}
      </span>
    );
  };

  // 완갑 최적 숨결 내역 팝업 — 단계별로 용암·빙하를 몇 개 넣는지 (최적 정책 기준)
  const renderWangapOptPopup = () => {
    if (!openWangapPopup) return null;
    const boundFlags = {
      파괴석결정: !!boundMaterials['파괴석결정'],
      수호석결정: !!boundMaterials['수호석결정'],
      위대한돌파석: !!boundMaterials['위대한돌파석'],
      상급아비도스: !!boundMaterials['상급아비도스'],
      운명파편: !!boundMaterials['운명파편'],
      용암: materialOptions.wangapLava.isBound,
      빙하: materialOptions.wangapGlacier.isBound,
    };
    // 전 재료 유효단가 — 표시되는 계획이 실제 계산·배분(λ)과 일치해야 한다
    const unitPrices = {
      파괴석결정: (ownedEffPrices['66102007'] || 0),
      수호석결정: (ownedEffPrices['66102107'] || 0),
      위대한돌파석: (ownedEffPrices['66110226'] || 0),
      상급아비도스: (ownedEffPrices['6861013'] || 0),
      운명파편: (ownedEffPrices['66130143'] || 0),
      용암: (ownedEffPrices['66111131'] || 0),
      빙하: (ownedEffPrices['66111132'] || 0),
    };
    const rows: WangapAvgEnhanceRow[] = [];
    equipments.forEach(eq => {
      if (!eq.isWangap) return;
      const t = targetLevels[eq.name];
      if (!t?.normal || t.normal <= eq.currentLevel) return;
      for (let L = eq.currentLevel; L < t.normal; L++) {
        const wr = computeWangapAverage({
          startLevel: L, targetLevel: L + 1, startGrade: (eq.grade as WangapGrade) || '영웅',
          mode: calcMode, lavaMode: 'optimal', glacierMode: 'optimal', boundFlags, unitPrices,
        });
        const er = wr.rows.find(r => r.type === 'enhance') as WangapAvgEnhanceRow | undefined;
        if (er) rows.push(er);
      }
    });
    const kindCls = (kind: WangapAvgEnhanceRow['planKind']) =>
      kind === 'none' ? styles.breathRowNone : kind === 'full' ? styles.breathRowFull : styles.breathRowPartial;
    /* eslint-disable @next/next/no-img-element */
    const segIcon = (kind: 'lava' | 'glacier') => (
      <img loading="lazy" decoding="async"
        src={kind === 'lava' ? '/breath-lava.webp' : '/breath-glacier.webp'}
        alt={kind === 'lava' ? '용암의 숨결' : '빙하의 숨결'}
        className={styles.breathRowIconSm} />
    );
    // 회차별 투입 계획 — 숨결을 실제로 넣는 구간만 아이콘으로, 안 넣는 꼬리 구간은 "이후 노숨" 한마디로
    const renderPlan = (r: WangapAvgEnhanceRow) => {
      if (r.planKind === 'none') return <span className={styles.breathRowMuted}>노숨</span>;
      if (r.planKind === 'full') return <span className={styles.breathRowFull}>전 회차 풀숨</span>;
      const active = r.plan.filter(s => s.lava > 0 || s.glacier > 0);
      const hasTail = r.plan.some(s => s.lava === 0 && s.glacier === 0);
      return (
        <>
          {active.map((s, i) => (
            <span key={i} className={styles.wangapSeg}>
              <b>{s.from}{s.to !== s.from ? `~${s.to}` : ''}회</b>
              {s.lava > 0 && <>{segIcon('lava')}{s.lava}</>}
              {s.glacier > 0 && <>{segIcon('glacier')}{s.glacier}</>}
            </span>
          ))}
          {hasTail && <span className={styles.breathRowMuted}>이후 노숨</span>}
        </>
      );
    };
    const popup = (
      <div className={styles.breathPopup} data-wangap-opt-popup onClick={e => e.stopPropagation()}>
        <div className={styles.breathPopupHeader}>
          <span className={styles.breathPopupTitle}>완갑 최적 숨결 <span className={styles.breathPopupSub}>{calcModeLabel}·시세연동</span></span>
          <button type="button" className={styles.breathPopupClose} onClick={() => setOpenWangapPopup(false)}>✕</button>
        </div>
        {rows.length === 0 ? (
          <div className={styles.breathPopupEmpty}>목표 단계를 먼저 설정하세요</div>
        ) : (
          <div className={styles.breathRows}>
            {rows.map(r => (
              <div key={r.level} className={styles.breathRow}>
                <span className={styles.breathRowLv}>+{r.level}→{r.level + 1}</span>
                <span className={`${styles.breathRowCell} ${kindCls(r.planKind)}`}>
                  <img loading="lazy" decoding="async" src="/breath-lava.webp" alt="용암의 숨결" className={styles.breathRowIcon} />
                  {Math.round(r.lava)}
                  <span className={styles.wangapDot}>·</span>
                  <img loading="lazy" decoding="async" src="/breath-glacier.webp" alt="빙하의 숨결" className={styles.breathRowIcon} />
                  {Math.round(r.glacier)}
                </span>
                <span className={`${styles.breathRowCell} ${styles.wangapPlanCell}`}>
                  {renderPlan(r)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
    /* eslint-enable @next/next/no-img-element */
    return isMobile ? createPortal(popup, document.body) : popup;
  };

  // 완갑 — 용암·빙하를 한 번에 최적 모드로 적용하고 단계별 투입 내역을 보여준다.
  // 적용중 클릭 = 해제 → 미사용(숨결 0)
  const renderWangapOptButton = () => {
    const applied =
      materialOptions.wangapLava.enabled && materialOptions.wangapLava.optimal &&
      materialOptions.wangapGlacier.enabled && materialOptions.wangapGlacier.optimal;
    return (
      <span
        className={styles.groupOptWrap}
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => hoverPopupOpen('wangap', () => setOpenWangapPopup(true))}
        onMouseLeave={() => hoverPopupClose('wangap', () => setOpenWangapPopup(false))}
      >
        <button
          type="button"
          data-wangap-opt-btn
          className={`${styles.groupOptBtn} ${styles.groupOptWangap} ${applied ? styles.groupOptBtnOn : ''}`}
          onClick={() => {
            if (!applied) {
              applyOwnedSnapshot(); // 보유 입력 반영 + 화면 예상량 기준 자동 귀속
              setBreathMode('wangapLava', 'optimal');
              setBreathMode('wangapGlacier', 'optimal');
              setOpenWangapPopup(true); // 어디에 몇 개 넣는지 바로 보여준다
            } else {
              setBreathMode('wangapLava', 'off');
              setBreathMode('wangapGlacier', 'off');
              setOpenWangapPopup(false);
            }
          }}
          title={applied ? '누르면 최적 적용을 해제합니다 (미사용으로)' : '용암·빙하 숨결을 시세 기준 최적 개수로 계산해 적용합니다'}
        >
          {applied ? '✓ 최적화 적용중' : '보조재료 비용 최적화'}
        </button>
        {renderWangapOptPopup()}
      </span>
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
      needsWangapBreath: false,
      needsArmorThrill1215: false,
      needsArmorThrill1619: false,
      needsWeaponThrill1215: false,
      needsWeaponThrill1619: false,
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
    let needsWangapBreath = false;
    let needsArmorThrill1215 = false;
    let needsArmorThrill1619 = false;
    let needsWeaponThrill1215 = false;
    let needsWeaponThrill1619 = false;
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

        // 완갑은 용암·빙하를 함께 쓰고 재련 책(업화/전율)은 쓰지 않는다.
        // needsArmor/needsWeapon 은 상급 재련 UI 노출에도 쓰이므로 완갑은 건드리지 않는다.
        if (eq.isWangap) {
          needsWangapBreath = true;
        } else if (eq.type === 'armor') {
          needsArmor = true;
          needsGlacierNormal = true;

          // 레벨별 책 필요 여부 확인 (계승 전=업화, 계승 후=전율)
          for (let level = eq.currentLevel; level < targets.normal; level++) {
            const nextLevel = level + 1;
            if (eq.isSuccession) {
              if (nextLevel >= 12 && nextLevel <= 15) needsArmorThrill1215 = true;
              if (nextLevel >= 16 && nextLevel <= 19) needsArmorThrill1619 = true;
            } else {
              if (nextLevel >= 11 && nextLevel <= 14) needsArmorBook1014 = true;
              if (nextLevel >= 15 && nextLevel <= 18) needsArmorBook1518 = true;
              if (nextLevel >= 19 && nextLevel <= 20) needsArmorBook1920 = true;
            }
          }
        } else {
          needsWeapon = true;
          needsLavaNormal = true;

          // 레벨별 책 필요 여부 확인 (계승 전=업화, 계승 후=전율)
          for (let level = eq.currentLevel; level < targets.normal; level++) {
            const nextLevel = level + 1;
            if (eq.isSuccession) {
              if (nextLevel >= 12 && nextLevel <= 15) needsWeaponThrill1215 = true;
              if (nextLevel >= 16 && nextLevel <= 19) needsWeaponThrill1619 = true;
            } else {
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
      needsWangapBreath,
      needsArmorThrill1215,
      needsArmorThrill1619,
      needsWeaponThrill1215,
      needsWeaponThrill1619,
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
      빙하_완갑: 0, 용암_완갑: 0, 성장파편: 0, 성장실링: 0,
      방어구책1114: 0, 방어구책1518: 0, 방어구책1920: 0, 방어구책1920강: 0,
      무기책1114: 0, 무기책1518: 0, 무기책1920: 0, 무기책1920강: 0,
      방어구책1215: 0, 방어구책1619: 0, 무기책1215: 0, 무기책1619: 0,
      재봉술1단: 0, 재봉술2단: 0, 재봉술3단: 0, 재봉술4단: 0,
      야금술1단: 0, 야금술2단: 0, 야금술3단: 0, 야금술4단: 0,
      // 계승 재료
      수호석결정: 0, 파괴석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 실링: 0,
      특재돌: 0,
    };

    // 특재로 아낀 재료 — 특재 배분 단계의 재료 계산 결과를 합계 대신 여기에 쌓는다.
    // (카드에 "원래 N개 → −절약" 을 보여주기 위한 값. 실제 소모는 특재돌뿐)
    const savedMaterials: Record<string, number> = {};
    const counts = totalMaterials as unknown as Record<string, number>; // 수량 필드 전용 뷰 (특재절약 제외)
    const addTotal = (key: string, v: number) => {
      counts[key] = (counts[key] || 0) + v;
    };
    const addSaved = (key: string, v: number) => {
      savedMaterials[key] = (savedMaterials[key] || 0) + v;
    };

    toRefine.forEach(eq => {
      const targets = targetLevels[eq.name];
      if (!targets) return;

      // 0. 완갑 — 무기/방어구와 재료 체계가 완전히 달라 전용 계산(lib/wangapAverage)을 그대로 쓴다.
      //    숨결 토글은 용암/빙하 카드를 공유하고, 승급(해방) 재료는 택1이라 합계에 넣지 않는다.
      if (eq.isWangap) {
        if (!targets.normal || targets.normal <= eq.currentLevel) return;
        const modeOf = (o: { enabled: boolean; optimal: boolean }): WangapBreathMode =>
          !o.enabled ? 'off' : o.optimal ? 'optimal' : 'full';
        const runWangap = (from: number, to: number) => computeWangapAverage({
          startLevel: from,
          targetLevel: to,
          startGrade: (eq.grade as WangapGrade) || '영웅',
          mode: calcMode,
          lavaMode: modeOf(materialOptions.wangapLava),
          glacierMode: modeOf(materialOptions.wangapGlacier),
          boundFlags: {
            파괴석결정: !!boundMaterials['파괴석결정'],
            수호석결정: !!boundMaterials['수호석결정'],
            위대한돌파석: !!boundMaterials['위대한돌파석'],
            상급아비도스: !!boundMaterials['상급아비도스'],
            운명파편: !!boundMaterials['운명파편'],
            용암: materialOptions.wangapLava.isBound,
            빙하: materialOptions.wangapGlacier.isBound,
          },
          // 전 재료 유효단가 — 일반 재련과 같은 경제(λ·커버리지 할인)로 최적화해야 배분이 성립한다
          unitPrices: {
            파괴석결정: (ownedEffPrices['66102007'] || 0),
            수호석결정: (ownedEffPrices['66102107'] || 0),
            위대한돌파석: (ownedEffPrices['66110226'] || 0),
            상급아비도스: (ownedEffPrices['6861013'] || 0),
            운명파편: (ownedEffPrices['66130143'] || 0),
            용암: (ownedEffPrices['66111131'] || 0),
            빙하: (ownedEffPrices['66111132'] || 0),
          },
        });
        // 특재 배분 단계는 강화 재료 대신 특재돌만 소모한다 (성장 비용은 방식과 무관하게 지불).
        // computeWangapAverage는 단계 가산적이라 단계별로 쪼개 합산해도 구간 호출과 결과가 같다.
        for (let L = eq.currentLevel; L < targets.normal; L++) {
          const wr = runWangap(L, L + 1);
          let isSpecialStage = false;
          if (specialPlan?.chosenKeys.has(`${eq.name}:${L}`)) {
            const spInfo = getSpecialRefineInfo('wangap', L);
            if (spInfo) {
              isSpecialStage = true;
              totalMaterials.특재돌 = (totalMaterials.특재돌 || 0)
                + spInfo.stonesPerTry * getSpecialTries(spInfo.prob, calcMode);
            }
          }
          // 특재 단계도 재료 계산은 그대로 돌리되, 합계 대신 savedMaterials(절약분)로 보낸다
          const add = isSpecialStage ? addSaved : addTotal;
          {
            const wt = wr.totals;
            add('파괴석결정', wt.파괴석결정);
            add('수호석결정', wt.수호석결정);
            add('위대한돌파석', wt.위대한돌파석);
            add('상급아비도스', wt.상급아비도스);
            add('운명파편', wt.운명파편);
            add('실링', wt.실링);
            add('누골', wt.골드);
            if (wt.용암 > 0) {
              add('용암', wt.용암);
              add('용암_완갑', wt.용암);
            }
            if (wt.빙하 > 0) {
              add('빙하', wt.빙하);
              add('빙하_완갑', wt.빙하);
            }
          }
          // 장비 성장(단계마다 1회 고정)은 따로 모아두고 토글 상태에 따라 합계에 넣는다
          totalMaterials.성장파편 = (totalMaterials.성장파편 || 0) + wr.growth.운명파편;
          totalMaterials.성장실링 = (totalMaterials.성장실링 || 0) + wr.growth.실링;
          if (includeGrowth) {
            totalMaterials.운명파편 += wr.growth.운명파편;
            totalMaterials.실링 = (totalMaterials.실링 || 0) + wr.growth.실링;
          }
        }
        return;
      }

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

            // 특재 배분 단계 — 강화 재료 대신 특재돌만 소모. 성장 비용은 방식과 무관하게 지불.
            // 재료 계산은 아래에서 그대로 돌리되, 합계 대신 savedMaterials(절약분)로 보낸다.
            let isSpecialStage = false;
            if (specialPlan?.chosenKeys.has(`${eq.name}:${level}`)) {
              const spInfo = getSpecialRefineInfo(eq.type === 'armor' ? 'armor' : 'weapon', level);
              if (spInfo) {
                isSpecialStage = true;
                totalMaterials.특재돌 = (totalMaterials.특재돌 || 0)
                  + spInfo.stonesPerTry * getSpecialTries(spInfo.prob, calcMode);
              }
            }
            const add = isSpecialStage ? addSaved : addTotal;

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

            // 전율 책(계승 후 전용) — 도전 단계 12~15 / 16~19
            let useThrill = false;
            let thrillType = '';
            if (nextLevel >= 12 && nextLevel <= 15) {
              useThrill = isArmor ? materialOptions.tailoring1215.enabled : materialOptions.metallurgy1215.enabled;
              thrillType = '1215';
            } else if (nextLevel >= 16 && nextLevel <= 19) {
              useThrill = isArmor ? materialOptions.tailoring1619.enabled : materialOptions.metallurgy1619.enabled;
              thrillType = '1619';
            }

            // 시도 횟수 / 숨결 개수 결정
            let avgTries: number;
            let breathCount: number;
            // 최적 숨결: 앞 N회만 풀숨 (현재 모드+시세 기준 DP). 책은 토글을 조건으로 둔다.
            // 시세 미로딩이면 정책이 없으므로 표(CASE) 경로로 폴백한다 (계승 전과 동일).
            const succVariants = useOptimal
              ? (isArmor ? optimalBreathTable.armor : optimalBreathTable.weapon)[level]
              : undefined;
            if (succVariants) {
              const pol = thrillType && useThrill ? succVariants.on : succVariants.off;
              avgTries = pol.tries;
              breathCount = pol.breaths;
              useThrill = pol.useBook; // 책 미지원 레벨이면 정책상 false
            } else {
              avgTries = getSuccessionTries(level, useBreath, useThrill, calcMode);
              breathCount = useBreath ? breathEffect.max * avgTries : 0;
            }
            if (avgTries === 0) continue;

            if (isArmor) {
              add('수호석결정', (materialCostPerTry as any).수호석결정 * avgTries);
              if (breathCount > 0) {
                add('빙하', breathCount);
                add('빙하_일반', breathCount);
              }
              if (useThrill && thrillType === '1215') add('방어구책1215', avgTries);
              if (useThrill && thrillType === '1619') add('방어구책1619', avgTries);
            } else {
              add('파괴석결정', (materialCostPerTry as any).파괴석결정 * avgTries);
              if (breathCount > 0) {
                add('용암', breathCount);
                add('용암_일반', breathCount);
              }
              if (useThrill && thrillType === '1215') add('무기책1215', avgTries);
              if (useThrill && thrillType === '1619') add('무기책1619', avgTries);
            }
            add('위대한돌파석', (materialCostPerTry as any).위대한돌파석 * avgTries);
            add('상급아비도스', (materialCostPerTry as any).상급아비도스 * avgTries);
            add('운명파편', materialCostPerTry.운명파편 * avgTries);
            add('실링', (materialCostPerTry as any).실링 * avgTries);
            add('누골', materialCostPerTry.골드 * avgTries);
            // 장비 성장(재련 경험치) — 단계마다 1회 고정, 시도 횟수와 무관
            const growSucc = getGrowthCost(level, eq.type, true);
            totalMaterials.성장파편 = (totalMaterials.성장파편 || 0) + growSucc.운명파편;
            totalMaterials.성장실링 = (totalMaterials.성장실링 || 0) + growSucc.실링;
            if (includeGrowth) {
              totalMaterials.운명파편 += growSucc.운명파편;
              totalMaterials.실링 = (totalMaterials.실링 || 0) + growSucc.실링;
            }
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
            // 장비 성장(재련 경험치) — 단계마다 1회 고정, 시도 횟수와 무관
            const growPre = getGrowthCost(level, eq.type, false);
            totalMaterials.성장파편 = (totalMaterials.성장파편 || 0) + growPre.운명파편;
            totalMaterials.성장실링 = (totalMaterials.성장실링 || 0) + growPre.실링;
            if (includeGrowth) {
              totalMaterials.운명파편 += growPre.운명파편;
              totalMaterials.실링 = (totalMaterials.실링 || 0) + growPre.실링;
            }
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
    Object.keys(counts).forEach(key => {
      counts[key] = Math.round(counts[key] || 0);
    });

    // 절약분은 위 반올림 루프(숫자 전용)가 끝난 뒤에 붙인다
    const savedRounded: Record<string, number> = {};
    Object.keys(savedMaterials).forEach(key => {
      const v = Math.round(savedMaterials[key]);
      if (v > 0) savedRounded[key] = v;
    });
    if (Object.keys(savedRounded).length > 0) totalMaterials.특재절약 = savedRounded;

    return totalMaterials;
  };



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
      if (eq.isWangap) return; // 완갑 강화는 아이템 레벨에 반영되지 않는다
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

  // 목표 단계까지 갔을 때의 전투력 상승량
  // 재련이 바꾸는 건 힘민지(방어구)와 무기 공격력(무기)뿐이고, 나머지 곱연산 요소는
  // 증감 비율에서 약분되므로 계산에 필요 없다. 자세한 근거는 lib/combatPower 주석 참고.
  const combatPowerSummary = useMemo(() => {
    if (!combatPowerBase) return null;

    // 시작 단계를 직접 조정한 만큼 기준을 옮긴다 (아이템 레벨의 baselineOffset과 같은 개념)
    let baseline = EMPTY_DELTA;
    // 목표까지의 증가분
    let target = EMPTY_DELTA;
    // 계산에 넣지 못한 목표가 있는지 (상급 재련 · 계승 전 장비 · 표가 없는 완갑 구간)
    let hasExcluded = false;

    // 완갑은 한 단계에 주스탯·무기공격력·기본공격력(고정값/%)이 같이 움직인다
    const wangapDelta = (grade: string, from: number, to: number): StatDelta | null => {
      const a = getWangapStat(grade, from);
      const b = getWangapStat(wangapGradeAt(grade, to), to);
      if (!a || !b) return null;
      return {
        stat: b.stat - a.stat,
        weaponAtk: b.atk - a.atk,
        baseAtkFlat: b.baFlat - a.baFlat,
        baseAtkPct: b.baPct - a.baPct,
      };
    };

    equipments.forEach(eq => {
      const targets = targetLevels[eq.name];
      const wantsNormal = !!targets?.normal && targets.normal > eq.currentLevel;
      const wantsAdvanced = !!targets?.advanced && targets.advanced > eq.currentAdvancedLevel;

      if (eq.isWangap) {
        const rewind = wangapDelta(eq.grade, eq.origNormal, eq.currentLevel);
        const gain = wantsNormal ? wangapDelta(eq.grade, eq.currentLevel, targets!.normal!) : EMPTY_DELTA;
        // 표에 없는 (등급, 단계) 조합이면 계산에서 뺀다
        if (!rewind || !gain) {
          hasExcluded = true;
          return;
        }
        baseline = addDelta(baseline, rewind);
        target = addDelta(target, gain);
        return;
      }

      // 계승 후(운명의 전율) 일반 재련만 스탯 표가 있다
      if (!SUCCESSION_MAIN_STAT[eq.name] || !eq.isSuccession) {
        if (wantsNormal || wantsAdvanced) hasExcluded = true;
        return;
      }
      if (wantsAdvanced) hasExcluded = true;

      const key = eq.name === '무기' ? 'weaponAtk' : 'stat';
      const rewind = mainStatDelta(eq.name, eq.origNormal, eq.currentLevel);
      const gain = wantsNormal ? mainStatDelta(eq.name, eq.currentLevel, targets!.normal!) : 0;

      baseline = addDelta(baseline, { ...EMPTY_DELTA, [key]: rewind });
      target = addDelta(target, { ...EMPTY_DELTA, [key]: gain });
    });

    const base = shiftCombatPowerBase(combatPowerBase, baseline);
    const increase = calcCombatPowerGain(base, target);

    return {
      current: base.combatPower,
      expected: base.combatPower + increase,
      increase,
      hasExcluded,
    };
  }, [combatPowerBase, equipments, targetLevels]);

  // 아이템 레벨 표시용 포맷 (쉼표 + 소수점 2자리)
  const formatItemLevel = (n: number): string =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={styles.container}>
      {/* 장비 정보 및 목표 레벨 설정 */}
      {/* marginTop 없음 — 탭 아래 간격은 tabContainer 의 margin-bottom 하나로만 잡는다 */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(0.25rem, 2vw, 1rem)' }}>
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

                        {/* 전투력 — 계승 후 장비의 일반 재련만 반영된다 */}
                        {combatPowerSummary && (
                          <>
                            <div className={styles.characterLevelGrid}>
                              <div className={styles.levelBox}>
                                <div className={styles.levelLabel}>Combat Power</div>
                                <div className={styles.characterLevel}>
                                  {formatItemLevel(combatPowerSummary.current)}
                                </div>
                              </div>

                              {combatPowerSummary.increase > 0 && (
                                <div className={styles.levelArrow}>→</div>
                              )}

                              {combatPowerSummary.increase > 0 && (
                                <div className={styles.levelBox}>
                                  <div className={styles.levelLabel}>Expected Power</div>
                                  <div className={styles.expectedLevel}>
                                    {formatItemLevel(combatPowerSummary.expected)}
                                    <span className={styles.levelBadge}>
                                      +{combatPowerSummary.increase.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {combatPowerSummary.hasExcluded && (
                              <div className={styles.combatPowerNote}>
                                전투력은 계승 후 장비와 완갑의 일반 재련만 반영됩니다 (상급 재련 제외)
                              </div>
                            )}
                          </>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {searched && equipments.length > 0 && (
              <>
              <Row className="g-3">
                {/* 완갑도 데스크톱·모바일 모두 다른 장비와 같은 그리드 카드 (배지색만 보라) */}
                {equipments.map((eq, index) => {
                  const targets = targetLevels[eq.name] || { normal: null, advanced: null };
                  const isNormalChanged = targets.normal !== null && targets.normal > eq.currentLevel;
                  const isAdvancedChanged = targets.advanced !== null && targets.advanced > eq.currentAdvancedLevel;
                  const isChanged = isNormalChanged || isAdvancedChanged;

                  // 모든 장비 활성화 (업화/전율 구분 없이)
                  // 에스더 장비도 상급 재련 가능
                  const isEquipmentDisabled = false;

                  // 에스더/계승 장비 특별 클래스
                  const specialCardClass = eq.isEsther
                    ? styles.equipmentCardEsther
                    : (eq.isSuccession ? styles.equipmentCardSuccession : '');

                  return (
                    <Fragment key={index}>
                    <Col xs={4} sm={6} md={4} lg={2}>
                      <div
                        className={`${styles.equipmentCard} ${isMobile ? styles.equipmentCardMobile : ''} ${isChanged && !eq.isEsther ? styles.equipmentCardChanged : ''} ${isChanged && isMobile && !eq.isEsther ? styles.equipmentCardMobileChanged : ''} ${isEquipmentDisabled ? styles.equipmentCardDisabled : ''} ${specialCardClass}`}
                        style={{
                          background: theme === 'dark' ? '#1f2937' : '#ffffff',
                          border: 'none',
                        }}
                      >
                        <div className="d-flex align-items-center" style={{ marginBottom: isMobile ? '0.3rem' : '0.5rem', gap: isMobile ? '0.4rem' : '0.6rem' }}>
                          {/* 장비 아이콘 — 완갑은 전용 패널과 동일한 구조(이미지 inset -4% + 프레임 비대칭 오버행)로
                              배경과 테두리 사이 공간 없이 렌더링. 프레임 두께가 전율 프레임 사용법과 달라 재사용 금지 */}
                          {eq.isWangap ? (
                            <span className={`${styles.wangapIcon} ${styles.wangapIconCard}`} data-grade={eq.grade}>
                              <span className={styles.wangapIconImg}>
                                <Image
                                  src={WANGAP_ITEM_IMAGES[eq.grade as WangapGrade] || WANGAP_ITEM_IMAGES['영웅']}
                                  alt={`완갑 ${eq.grade}`}
                                  fill
                                  sizes="66px"
                                  style={{ objectFit: 'cover' }}
                                />
                              </span>
                              <span className={styles.wangapIconFrame}>
                                <Image src="/wjsdbf3.webp" alt="" fill sizes="92px" style={{ objectFit: 'fill' }} unoptimized />
                              </span>
                            </span>
                          ) : eq.isSuccession ? (
                            /* 전율 장비 — API 아이콘이 투명 배경이라 완갑과 같은 구조로:
                               임의 배경(방어구 파랑·무기 빨강 → 검정 그라데이션)을 깔고
                               세르카 프레임을 완갑과 동일한 오버행 수치로 맞춘다.
                               아이콘이 없는 기본 장비(검색 전)는 배경·프레임만 그대로 두고 이미지만 비운다 */
                            <span className={`${styles.wangapIcon} ${styles.wangapIconCard}`}>
                              <span className={eq.type === 'weapon' ? styles.succIconBgWeapon : styles.succIconBgArmor}>
                                {eq.icon && (
                                  <Image
                                    src={eq.icon}
                                    alt={eq.name}
                                    fill
                                    sizes="66px"
                                    className={styles.succIconImg}
                                    style={{ objectFit: 'contain' }}
                                    unoptimized
                                  />
                                )}
                              </span>
                              {/* 방어구(투구·견갑·상의·하의·장갑)만 데스크톱에서 프레임을 살짝 오른쪽으로 */}
                              <span className={`${styles.wangapIconFrame} ${eq.type === 'armor' ? styles.succIconFrameArmor : ''}`}>
                                <Image src="/wjsdbf3.webp" alt="" fill sizes="92px" style={{ objectFit: 'fill' }} unoptimized />
                              </span>
                            </span>
                          ) : eq.icon && (
                            <div style={{
                              width: isMobile ? '36px' : '48px',
                              height: isMobile ? '36px' : '48px',
                              flexShrink: 0,
                              position: 'relative',
                            }}>
                              <Image
                                src={eq.icon}
                                alt={eq.name}
                                width={isMobile ? 36 : 48}
                                height={isMobile ? 36 : 48}
                                style={{ objectFit: 'contain' }}
                                unoptimized
                              />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                              <span className={`${styles.equipmentName} ${isMobile ? styles.equipmentNameMobile : ''}`}>
                                {eq.name}
                              </span>
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
                            </div>
                          </div>
                        </div>
                        {/* 현재 → 목표 (스테퍼 대신 배지 필 드롭다운 — 좁은 카드·모바일에서 조작이 편하다) */}
                        <div style={{
                          display: 'flex',
                          gap: isMobile ? '0.2rem' : '0.3rem',
                          flexDirection: 'column',
                          minHeight: (eq.isSuccession || eq.isWangap)
                            ? (isMobile ? '22px' : '26px')
                            : (isMobile ? '46px' : '56px'),
                          justifyContent: 'flex-start'
                        }}>
                          {eq.isEsther && (
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
                          )}
                          {/* 일반 재련: [현재 배지 필] → [목표 배지 필] (에스더는 일반 재련 없음) */}
                          {!eq.isEsther && (() => {
                            const normalMin = eq.isWangap ? 0 : eq.isSuccession ? 11 : 10;
                            return (
                              <div className={styles.levelRow}>
                                <PillDropdown
                                  value={String(eq.currentLevel)}
                                  display={`+${eq.currentLevel}`}
                                  options={Array.from({ length: 25 - normalMin + 1 }, (_, i) => normalMin + i)
                                    .map(level => ({ value: String(level), label: `+${level}` }))}
                                  onSelect={(v) => setStart(eq, 'normal', Number(v))}
                                  pillClass={eq.isWangap ? styles.pillSelectWangap : eq.type === 'weapon' ? styles.pillSelectWeapon : styles.pillSelectArmor}
                                  menuClass={eq.isWangap ? styles.pillMenuWangap : eq.type === 'weapon' ? styles.pillMenuWeapon : styles.pillMenuArmor}
                                  mobile={isMobile}
                                  ariaLabel={`${eq.name} 현재 단계`}
                                />
                                <span className={styles.levelRowArrow}>→</span>
                                <PillDropdown
                                  value={targets.normal === null ? '' : String(targets.normal)}
                                  display={targets.normal === null ? '목표' : `+${targets.normal}`}
                                  options={[
                                    { value: '', label: '해제' },
                                    /* 일반 재련은 계승 전·후·완갑 모두 +25가 최대 */
                                    ...Array.from({ length: 25 - eq.currentLevel }, (_, i) => eq.currentLevel + i + 1)
                                      .map(level => ({ value: String(level), label: `+${level}` })),
                                  ]}
                                  onSelect={(v) => {
                                    setTargetLevels(prev => ({
                                      ...prev,
                                      [eq.name]: { ...(prev[eq.name] ?? { normal: null, advanced: null }), normal: v === '' ? null : Number(v) }
                                    }));
                                  }}
                                  pillClass={targets.normal === null ? styles.pillSelectEmpty : styles.pillSelectTarget}
                                  menuClass={styles.pillMenuTarget}
                                  mobile={isMobile}
                                  disabled={isEquipmentDisabled}
                                  ariaLabel={`${eq.name} 목표 단계`}
                                />
                              </div>
                            );
                          })()}
                          {/* 상급 재련: [상+N 필] → [목표 필] (에스더·업화 전용, 전율·완갑은 상급 재련 없음) */}
                          {(eq.isEsther || (!eq.isSuccession && !eq.isWangap)) && (
                            <div className={styles.levelRow}>
                              <PillDropdown
                                value={String(eq.currentAdvancedLevel)}
                                display={`상+${eq.currentAdvancedLevel}`}
                                options={Array.from({ length: 41 }, (_, i) => i)
                                  .map(level => ({ value: String(level), label: `상+${level}` }))}
                                onSelect={(v) => setStart(eq, 'advanced', Number(v))}
                                pillClass={styles.pillSelectAdvanced}
                                menuClass={styles.pillMenuAdvanced}
                                mobile={isMobile}
                                ariaLabel={`${eq.name} 상급 현재 단계`}
                              />
                              <span className={styles.levelRowArrow}>→</span>
                              <PillDropdown
                                value={targets.advanced === null ? '' : String(targets.advanced)}
                                display={targets.advanced === null ? '목표' : `상+${targets.advanced}`}
                                options={[
                                  { value: '', label: '해제' },
                                  ...[10, 20, 30, 40]
                                    .filter(level => level > eq.currentAdvancedLevel)
                                    .map(level => ({ value: String(level), label: `상+${level}` })),
                                ]}
                                onSelect={(v) => {
                                  setTargetLevels(prev => ({
                                    ...prev,
                                    [eq.name]: { ...(prev[eq.name] ?? { normal: null, advanced: null }), advanced: v === '' ? null : Number(v) }
                                  }));
                                }}
                                pillClass={targets.advanced === null ? styles.pillSelectEmpty : styles.pillSelectTarget}
                                menuClass={styles.pillMenuTarget}
                                mobile={isMobile}
                                disabled={eq.currentAdvancedLevel >= 40}
                                ariaLabel={`${eq.name} 상급 목표 단계`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Col>
                    </Fragment>
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
                          // 모든 무기 필터링 (에스더·완갑 제외)
                          const weaponEquipments = equipments.filter(eq =>
                            eq.type === 'weapon' &&
                            !eq.isEsther && !eq.isWangap
                          );
                          const minWeaponLevel = weaponEquipments.length > 0
                            ? Math.min(...weaponEquipments.map(eq => eq.currentLevel))
                            : 10;
                          const startLevel = Math.max(minWeaponLevel, 11);
                          const maxLevel = 25;
                          return Array.from({ length: maxLevel - startLevel + 1 }, (_, i) => i + startLevel);
                        })().map(level => {
                          // 모든 무기 체크 (에스더·완갑 제외)
                          const hasWeapon = equipments.some(eq =>
                            eq.type === 'weapon' &&
                            !eq.isEsther && !eq.isWangap &&
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
                                    // 모든 무기 대상 (에스더·완갑 제외)
                                    if (eq.type === 'weapon' && !eq.isEsther && !eq.isWangap) {
                                      newTargets[eq.name] = { ...newTargets[eq.name], normal: null };
                                    }
                                  });
                                  setTargetLevels(newTargets);
                                  setSelectedWeaponBulkLevel(prev => ({ ...prev, normal: null }));
                                } else {
                                  // 새로운 목표 설정
                                  const newTargets = { ...targetLevels };
                                  equipments.forEach(eq => {
                                    // 모든 무기 대상 (에스더·완갑 제외)
                                    if (eq.type === 'weapon' && !eq.isEsther && !eq.isWangap && eq.currentLevel < level) {
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

                    {/* 완갑 일괄 설정 — 완갑을 보유한 캐릭터만 표시 (0강부터 시작) */}
                    {equipments.some(eq => eq.isWangap) && (
                    <div style={{ marginBottom: isMobile ? '0.6rem' : '1rem' }}>
                      <div className={`${styles.bulkSettingLabel} ${isMobile ? styles.bulkSettingLabelMobile : ''}`}>
                        완갑
                      </div>
                      <div className={`${styles.bulkButtonGroup} ${isMobile ? styles.bulkButtonGroupMobile : ''}`}>
                        {/* 등급 경계만 빠른 선택 — 세부 단계는 완갑 패널의 드롭다운에서 고른다 */}
                        {(() => {
                          const wg = equipments.find(eq => eq.isWangap);
                          return [10, 15, 20, 25].filter(level => level > (wg?.currentLevel ?? 0));
                        })().map(level => {
                          const isSelected = (targetLevels['완갑']?.normal ?? null) === level;
                          return (
                            <button
                              key={level}
                              onClick={() => {
                                const next = isSelected ? null : level;
                                setTargetLevels(prev => ({
                                  ...prev,
                                  ['완갑']: { ...(prev['완갑'] ?? { normal: null, advanced: null }), normal: next },
                                }));
                              }}
                              className={`${styles.bulkButton} ${isMobile ? styles.bulkButtonMobile : ''} ${isSelected ? styles.bulkButtonWangapSelected : ''}`}
                            >
                              +{level}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    )}

                    {/* 상급재련 섹션 - 업화 장비에만 적용 (전율·완갑은 상급 재련 없음) */}
                    {equipments.some(eq => !eq.isSuccession && !eq.isEsther && !eq.isWangap) && (
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
                            const weaponEquipments = equipments.filter(eq => eq.type === 'weapon' && !eq.isSuccession && !eq.isEsther && !eq.isWangap);
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
                                      if (eq.type === 'weapon' && !eq.isSuccession && !eq.isEsther && !eq.isWangap) {
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
                                      if (eq.type === 'weapon' && !eq.isSuccession && !eq.isEsther && !eq.isWangap && level > eq.currentAdvancedLevel) {
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

          {/* 모바일 띠배너 — 목표 설정 바로 아래. 같은 페이지의 다른 자리와 단위가 겹치면
              애드핏이 첫 자리만 채우므로 인-콘텐츠 단위 순번을 따로 쓴다. */}
          <div className="d-block d-lg-none my-2">
            <AdBanner slot="8616653628" index={0} />
          </div>

          {/* 데스크톱 728×90 — 목표 카드 아래 (갤러리 하단과 공용 단위, 페이지가 달라 중복 아님) */}
          <DesktopBannerAd adfit={ADFIT_UNITS.galleryBottomDesktop} />

          {/* 재료 소모량 표시 */}
          {searched && equipments.length > 0 && materials && (
            <>
            <Card className={styles.mainCard}>
              <Card.Header className={styles.cardHeaderAlt}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h5 className={`mb-0 ${styles.cardTitle}`}>
                    예상 소모 재료
                  </h5>
                  {/* 모바일에서 버튼 묶음이 한 줄에 안 들어가면 줄바꿈되도록 wrap */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* 보유 반영·자동 귀속은 각 줄의 "보조재료 비용 최적화" 버튼이 담당 — 여기엔 초기화만 둔다 */}
                  {/* 초기화 — 보유 입력·적용과 최적 적용(일반·상급·완갑)을 한 번에 해제.
                      해제할 것이 하나라도 있으면 보인다 */}
                  {(Object.keys(ownedMaterials).length > 0 || Object.keys(appliedOwned).length > 0 ||
                    breathModeOf('armor') === 'optimal' || breathModeOf('weapon') === 'optimal' ||
                    breathModeOf('wangapLava') === 'optimal' || breathModeOf('wangapGlacier') === 'optimal' ||
                    advOptApplied.armor || advOptApplied.weapon) && (
                    <button
                      type="button"
                      className={styles.ownedResetBtn}
                      onClick={handleOwnedReset}
                      title="보유 입력과 최적 적용을 전부 해제합니다 (자동으로 켜진 귀속도 함께 풀립니다)"
                    >
                      초기화
                    </button>
                  )}
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
                </div>
              </Card.Header>
              <Card.Body className={styles.cardBody} style={{
                padding: isMobile ? '0.75rem 0.5rem' : undefined
              }}>
                {(() => {
                  const requiredMats = analyzeRequiredMaterials();
                  // 특재로 아낀 수량 — 해당 재료 카드에 "원래값 −절약" 줄로 표시
                  const savedOf = (key: string) => materials.특재절약?.[key];

                  return (
                    <>
                      {/* 1줄: 기본 재료 - 업화/전율 장비 재료 모두 표시 (해당하는 것만) */}
                      <div className={styles.materialsSection}>
                        <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                          {/* 업화 장비 재료 (일반 재련) — 파괴석 먼저, 수호석 다음 */}
                          {materials.파괴석 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-destruction-stone.webp" name="파괴석" amount={materials.파괴석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['파괴석']} onBoundChange={handleBoundChange} cost={results.materialCosts['파괴석']} {...ownedProps('파괴석')} />
                            </Col>
                          )}
                          {materials.수호석 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-guardian-stone.webp" name="수호석" amount={materials.수호석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['수호석']} onBoundChange={handleBoundChange} cost={results.materialCosts['수호석']} {...ownedProps('수호석')} />
                            </Col>
                          )}
                          {materials.돌파석 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-breakthrough-stone.webp" name="돌파석" amount={materials.돌파석} color="#818cf8" showCheckbox={true} isBound={boundMaterials['돌파석']} onBoundChange={handleBoundChange} cost={results.materialCosts['돌파석']} {...ownedProps('돌파석')} />
                            </Col>
                          )}
                          {materials.아비도스 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/abidos-fusion.webp?v=4" name="아비도스" amount={materials.아비도스} color="#818cf8" showCheckbox={true} isBound={boundMaterials['아비도스']} onBoundChange={handleBoundChange} cost={results.materialCosts['아비도스']} {...ownedProps('아비도스')} />
                            </Col>
                          )}
                          {/* 전율 장비 재료 (계승 재련) — 파괴석 결정 먼저, 수호석 결정 다음 */}
                          {/* 특재가 구간 전체를 덮으면 수량이 0이 된다 — 절약분이 있으면 카드를 남겨 "원래 N개" 를 보여준다 */}
                          {((materials.파괴석결정 || 0) > 0 || (savedOf('파괴석결정') || 0) > 0) && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-destruction-stone2.webp?v=3" name="파괴석결정" amount={materials.파괴석결정 || 0} color="#a855f7" showCheckbox={true} isBound={boundMaterials['파괴석결정']} onBoundChange={handleBoundChange} cost={results.materialCosts['파괴석결정']} saved={savedOf('파괴석결정')} {...ownedProps('파괴석결정')} />
                            </Col>
                          )}
                          {((materials.수호석결정 || 0) > 0 || (savedOf('수호석결정') || 0) > 0) && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-guardian-stone2.webp?v=3" name="수호석결정" amount={materials.수호석결정 || 0} color="#a855f7" showCheckbox={true} isBound={boundMaterials['수호석결정']} onBoundChange={handleBoundChange} cost={results.materialCosts['수호석결정']} saved={savedOf('수호석결정')} {...ownedProps('수호석결정')} />
                            </Col>
                          )}
                          {((materials.위대한돌파석 || 0) > 0 || (savedOf('위대한돌파석') || 0) > 0) && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-breakthrough-stone2.webp?v=3" name="위대한돌파석" amount={materials.위대한돌파석 || 0} color="#a855f7" showCheckbox={true} isBound={boundMaterials['위대한돌파석']} onBoundChange={handleBoundChange} cost={results.materialCosts['위대한돌파석']} saved={savedOf('위대한돌파석')} {...ownedProps('위대한돌파석')} />
                            </Col>
                          )}
                          {((materials.상급아비도스 || 0) > 0 || (savedOf('상급아비도스') || 0) > 0) && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/abidos-fusion2.webp?v=3" name="상급아비도스" amount={materials.상급아비도스 || 0} color="#a855f7" showCheckbox={true} isBound={boundMaterials['상급아비도스']} onBoundChange={handleBoundChange} cost={results.materialCosts['상급아비도스']} saved={savedOf('상급아비도스')} {...ownedProps('상급아비도스')} />
                            </Col>
                          )}
                          {/* 공통 재료(파편·실링) — 스톤과 같은 크기·같은 줄.
                              카드는 height:100% 라 같은 줄 안에서는 성장 토글이 붙어도 높이가 맞는다 */}
                          {materials.운명파편 > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/destiny-shard-bag-large.webp" name="파편" amount={materials.운명파편} color="#818cf8" showCheckbox={true} isBound={boundMaterials['운명파편']} onBoundChange={handleBoundChange} cost={results.materialCosts['운명파편']} saved={savedOf('운명파편')} {...ownedProps('운명파편')}
                                footer={(materials.성장파편 || 0) > 0 ? renderGrowthToggle(materials.성장파편 || 0) : undefined} />
                            </Col>
                          )}
                          {(materials.실링 || 0) > 0 && (
                            <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                              <MaterialCard icon="/shilling.webp" name="실링" amount={materials.실링 || 0} color="#9ca3af" showCheckbox={false} reserveCostSpace saved={savedOf('실링')}
                                footer={(materials.성장실링 || 0) > 0 ? renderGrowthToggle(materials.성장실링 || 0) : undefined} />
                            </Col>
                          )}
                        </Row>
                      </div>

                      {/* 일반 재련 추가 재료 (업화 장비) */}
                      {requiredMats.hasNormalRefining && (requiredMats.needsGlacierNormal || requiredMats.needsLavaNormal || requiredMats.needsWangapBreath) && (
                        <div className={styles.materialsSection}>
                          {/* 2줄: 방어구 — 빙하의 숨결 + 책 3종 */}
                          {requiredMats.needsGlacierNormal && (
                            <>
                            <div className={`${styles.materialsGroupLabel} ${styles.groupLabelArmor}`}>방어구{renderBreathOptButton('armor')}</div>
                            <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                              <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-glacier.webp"
                                  name="빙하의 숨결"
                                  amount={materials.빙하_일반}
                                  color="#34d399"
                                  cost={results.materialCosts['빙하_일반']}
                                  saved={savedOf('빙하_일반')}
                                  {...ownedProps('빙하')}
                                  showCheckbox={true}
                                  isBound={materialOptions.glacierBreath.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, glacierBreath: {...p.glacierBreath, isBound: !p.glacierBreath.isBound}}))}
                                  footer={renderBreathControls('armor')}
                                />
                              </Col>
                              {requiredMats.needsArmorThrill1215 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-thrill.webp"
                                    name="재봉술 전율 12-15"
                                    amount={materials.방어구책1215 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책1215'] || 0}
                                    saved={savedOf('방어구책1215')}
                                    {...ownedProps('방어구책1215')}
                                    tooltip={bookBonusTooltip('66112564')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.tailoring1215.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring1215.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring1215: {...p.tailoring1215, isBound: !p.tailoring1215.isBound}}))}
                                    footer={renderSimpleToggle('tailoring1215')}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsArmorThrill1619 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-thrill.webp"
                                    name="재봉술 전율 16-19"
                                    amount={materials.방어구책1619 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책1619'] || 0}
                                    saved={savedOf('방어구책1619')}
                                    {...ownedProps('방어구책1619')}
                                    tooltip={bookBonusTooltip('66112565')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.tailoring1619.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.tailoring1619.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, tailoring1619: {...p.tailoring1619, isBound: !p.tailoring1619.isBound}}))}
                                    footer={renderSimpleToggle('tailoring1619')}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsArmorBook1014 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/tailoring-karma.webp"
                                    name="재봉술: 업화(11~14) 방어구"
                                    amount={materials.방어구책1114 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['방어구책1114'] || 0}
                                    tooltip={bookBonusTooltip('66112546')}
                                    {...ownedProps('방어구책1114')}
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
                                    {...ownedProps('방어구책1518')}
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
                                    {...ownedProps('방어구책1920')}
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
                                    {...ownedProps('방어구책1920강')}
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
                            </>
                          )}
                          {/* 3줄: 무기 — 용암의 숨결 + 책 3종 */}
                          {requiredMats.needsLavaNormal && (
                            <>
                            <div className={`${styles.materialsGroupLabel} ${styles.groupLabelWeapon}`}>무기{renderBreathOptButton('weapon')}</div>
                            <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                              <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-lava.webp"
                                  name="용암의 숨결"
                                  amount={materials.용암_일반}
                                  color="#34d399"
                                  cost={results.materialCosts['용암_일반']}
                                  saved={savedOf('용암_일반')}
                                  {...ownedProps('용암')}
                                  showCheckbox={true}
                                  isBound={materialOptions.lavaBreath.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, lavaBreath: {...p.lavaBreath, isBound: !p.lavaBreath.isBound}}))}
                                  footer={renderBreathControls('weapon')}
                                />
                              </Col>
                              {requiredMats.needsWeaponThrill1215 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-thrill.webp"
                                    name="야금술 전율 12-15"
                                    amount={materials.무기책1215 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책1215'] || 0}
                                    saved={savedOf('무기책1215')}
                                    {...ownedProps('무기책1215')}
                                    tooltip={bookBonusTooltip('66112561')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.metallurgy1215.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy1215.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy1215: {...p.metallurgy1215, isBound: !p.metallurgy1215.isBound}}))}
                                    footer={renderSimpleToggle('metallurgy1215')}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsWeaponThrill1619 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-thrill.webp"
                                    name="야금술 전율 16-19"
                                    amount={materials.무기책1619 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책1619'] || 0}
                                    saved={savedOf('무기책1619')}
                                    {...ownedProps('무기책1619')}
                                    tooltip={bookBonusTooltip('66112562')}
                                    showEnableToggle={false}
                                    isEnabled={materialOptions.metallurgy1619.enabled}
                                    onToggleEnabled={() => {}}
                                    showCheckbox={true}
                                    isBound={materialOptions.metallurgy1619.isBound}
                                    onBoundChange={() => setMaterialOptions(p => ({...p, metallurgy1619: {...p.metallurgy1619, isBound: !p.metallurgy1619.isBound}}))}
                                    footer={renderSimpleToggle('metallurgy1619')}
                                  />
                                </Col>
                              )}
                              {requiredMats.needsWeaponBook1014 && (
                                <Col xs={4} sm={4} md={3} style={{ minWidth: '0' }}>
                                  <MaterialCard
                                    icon="/metallurgy-karma.webp"
                                    name="야금술: 업화(11~14) 무기"
                                    amount={materials.무기책1114 || 0}
                                    color="#34d399"
                                    cost={results.materialCosts['무기책1114'] || 0}
                                    tooltip={bookBonusTooltip('66112543')}
                                    {...ownedProps('무기책1114')}
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
                                    {...ownedProps('무기책1518')}
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
                                    {...ownedProps('무기책1920')}
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
                                    {...ownedProps('무기책1920강')}
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
                            </>
                          )}
                          {/* 완갑 줄: 완갑은 용암·빙하를 함께 써서 무기/방어구 숨결과 분리한다 */}
                          {requiredMats.needsWangapBreath && (
                            <>
                            <div className={`${styles.materialsGroupLabel} ${styles.groupLabelWangap}`}>완갑{renderWangapOptButton()}</div>
                            <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                              <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-lava.webp"
                                  name="용암의 숨결 (완갑)"
                                  amount={materials.용암_완갑 || 0}
                                  color="#34d399"
                                  cost={results.materialCosts['용암_완갑'] || 0}
                                  saved={savedOf('용암_완갑')}
                                  {...ownedProps('용암')}
                                  showCheckbox={true}
                                  isBound={materialOptions.wangapLava.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, wangapLava: {...p.wangapLava, isBound: !p.wangapLava.isBound}}))}
                                  footer={renderBreathControls('wangapLava')}
                                />
                              </Col>
                              <Col xs={6} sm={4} md={3} style={{ minWidth: '0' }}>
                                <MaterialCard
                                  icon="/breath-glacier.webp"
                                  name="빙하의 숨결 (완갑)"
                                  amount={materials.빙하_완갑 || 0}
                                  color="#34d399"
                                  cost={results.materialCosts['빙하_완갑'] || 0}
                                  saved={savedOf('빙하_완갑')}
                                  {...ownedProps('빙하')}
                                  showCheckbox={true}
                                  isBound={materialOptions.wangapGlacier.isBound}
                                  onBoundChange={() => setMaterialOptions(p => ({...p, wangapGlacier: {...p.wangapGlacier, isBound: !p.wangapGlacier.isBound}}))}
                                  footer={renderBreathControls('wangapGlacier')}
                                />
                              </Col>
                            </Row>
                            </>
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
                            <div className={styles.materialsGroupLabel}>
                              방어구{renderAdvOptButton('armor')}
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
                                  {...ownedProps('빙하')}
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
                                  footer={renderAdvTurnToggle('armorNormalBreath', 'armorBonusBreath')}
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
                                    {...ownedProps('재봉술1단')}
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
                                    {...ownedProps('재봉술2단')}
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
                                    {...ownedProps('재봉술3단')}
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
                                    {...ownedProps('재봉술4단')}
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
                            <div className={styles.materialsGroupLabel}>
                              무기{renderAdvOptButton('weapon')}
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
                                  {...ownedProps('용암')}
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
                                  footer={renderAdvTurnToggle('weaponNormalBreath', 'weaponBonusBreath')}
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
                                    {...ownedProps('야금술1단')}
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
                                    {...ownedProps('야금술2단')}
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
                                    {...ownedProps('야금술3단')}
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
                                    {...ownedProps('야금술4단')}
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

                      {/* 6줄: 특수 재련 + 누르는 골드 + 총 소모 골드 - 3칸 */}
                      <div className="mb-4">
                        <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                          {/* 특수 재련 — 사용 토글 + 보유 특재돌 입력, 수량은 배분된 기대 소모 */}
                          <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                            <MaterialCard
                              icon="/special-refine-stone.webp"
                              name="특재돌"
                              amount={materials.특재돌 || 0}
                              color="#d946ef"
                              footer={(
                                <div className={styles.specialCardControls}>
                                  <Form.Check
                                    type="switch"
                                    id="special-refine-toggle"
                                    label="특수 재련"
                                    checked={useSpecial}
                                    onChange={(e) => setUseSpecial(e.target.checked)}
                                    className={styles.specialCardSwitch}
                                  />
                                  {useSpecial && (
                                    <input
                                      type="number"
                                      min={0}
                                      className={styles.specialInput}
                                      value={specialStones || ''}
                                      placeholder="보유 개수"
                                      onChange={(e) => setSpecialStones(Math.max(0, parseInt(e.target.value) || 0))}
                                    />
                                  )}
                                </div>
                              )}
                            />
                          </Col>
                          <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
                            <MaterialCard icon="/gold.webp" name="누르는 골드" amount={materials.누골} color="#f59e0b" saved={savedOf('누골')} />
                          </Col>
                          <Col xs={4} sm={4} md={4} style={{ minWidth: '0' }}>
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

                      {/* 특수 재련 배분 분석 — 팝업 없이 상시 표시 */}
                      {useSpecial && (
                        <div className={`${styles.specialBar} mb-4`}>
                          {!specialPlan && (
                            <div className={styles.specialHint}>
                              보유 특재돌 개수를 입력하면 절약 골드가 큰 단계부터 자동 배분합니다. (대상: 계승 후 무기·방어구, 완갑)
                            </div>
                          )}
                          {specialPlan && specialPlan.ranked.length === 0 && (
                            <div className={styles.specialHint}>
                              특재를 쓸 수 있는 단계가 없습니다. (대상: 계승 후 무기·방어구, 완갑)
                            </div>
                          )}
                          {specialPlan && specialPlan.ranked.length > 0 && (
                            <>
                              <div className={styles.specialSummary}>
                                <span>
                                  {specialManualKeys ? '직접 선택' : '자동 배분'} {specialPlan.chosen.length}단계 ·
                                  {' '}기대 돌 <span className={specialPlan.usedStones > specialStones ? styles.specialOver : undefined}>
                                    {Math.round(specialPlan.usedStones).toLocaleString()}개
                                  </span>
                                  {specialStones > 0 && ` / 보유 ${specialStones.toLocaleString()}개`} ·
                                  {' '}일반 재련 대비 절약 약 {Math.round(specialPlan.savedGold).toLocaleString()}G
                                </span>
                                {specialManualKeys && (
                                  <button
                                    type="button"
                                    className={styles.specialPlanBtn}
                                    onClick={() => setSpecialManualKeys(null)}
                                  >
                                    자동 배분으로 되돌리기
                                  </button>
                                )}
                              </div>
                              {specialPlan.usedStones > specialStones && (
                                <div className={styles.specialPlanNext}>
                                  선택한 단계의 기대 소모가 보유 개수를 {Math.round(specialPlan.usedStones - specialStones).toLocaleString()}개 초과합니다.
                                </div>
                              )}
                              {/* 우선순위 표 — 돌 1개당 절약 골드 내림차순. 체크로 직접 넣고 뺄 수 있다 */}
                              <div className={styles.specialPlanTable}>
                                <div className={styles.specialPlanHead}>
                                  <span>사용</span><span>순위</span><span>단계</span><span>확률</span><span>회당 돌</span><span>기대 돌</span><span>절약 골드</span>
                                </div>
                                {specialPlan.ranked.map((s, i) => {
                                  const on = specialPlan.chosenKeys.has(s.key);
                                  return (
                                    <div
                                      key={s.key}
                                      className={`${styles.specialPlanTr} ${on ? '' : styles.specialPlanTrOff}`}
                                      onClick={() => toggleSpecialStage(s.key)}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSpecialStage(s.key); }
                                      }}
                                    >
                                      <span>
                                        <input
                                          type="checkbox"
                                          className={styles.specialPlanCheck}
                                          checked={on}
                                          onChange={() => toggleSpecialStage(s.key)}
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label={`${s.equipName} +${s.level}→${s.level + 1} 특수 재련 사용`}
                                        />
                                      </span>
                                      <span><span className={styles.specialPlanRank}>{i + 1}</span></span>
                                      <span className={styles.specialPlanName}>{s.equipName} +{s.level}→{s.level + 1}</span>
                                      <span>{parseFloat((s.prob * 100).toFixed(2))}%</span>
                                      <span>{s.stonesPerTry}개</span>
                                      <span>{Math.round(s.expectedStones).toLocaleString()}개</span>
                                      <span className={styles.specialPlanGold}>{Math.round(s.normalCostGold).toLocaleString()}G</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className={styles.specialPlanNext}>
                                체크한 단계만 특재로 진행합니다. 순위는 돌 1개당 절약 골드 기준이며, 계산 모드를 바꾸면 순위도 다시 매겨집니다.
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* 안내 메시지 */}
                      <div className={styles.infoMessage}>
                        <span className={styles.infoMessageIcon}></span>
                        <small className={styles.infoMessageText}>
                          {calcMode === 'median' && '중앙값 기준: 단계마다 절반이 이 횟수 안에 성공하는 값을 더한 수치입니다. 묶는 단계가 많을수록 전체 기준으로는 낮게 잡히니, 구간이 길면 평균값을 함께 보세요.'}
                          {calcMode === 'average' && '평균값 기준: 장인의 기운과 실패 시 확률 증가가 반영된 예상 수치입니다. 실제 소모량은 확률에 따라 다를 수 있습니다.'}
                          {calcMode === 'pity' && '장기백 기준: 매번 장인의 기운 100%에서 성공하는 최악의 경우입니다. 실제로는 이보다 적게 소모됩니다.'}
                        </small>
                      </div>
                    </>
                  );
                })()}
              </Card.Body>
            </Card>

            {/* 데스크톱 728×90 — 결과 카드 아래. 목표 아래 자리와 같은 페이지라 별도 단위 필수
                (refiningResultDesktop — 미발급 동안은 자리째 렌더 안 됨) */}
            <DesktopBannerAd adfit={ADFIT_UNITS.refiningResultDesktop} />
            </>
          )}
        </>
      </div>
    </div>
  );
}
