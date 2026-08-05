'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Row, Col, Card } from 'react-bootstrap';
import Image from 'next/image';
import { useTheme } from '../ThemeProvider';
// 장비 선택 패널은 실제 시뮬과 동일한 스타일, 계산기 본문은 재련 평균 시뮬과 동일한 스타일 사용
import wg from './WangapSimulator.module.css';
import styles from '../refining/RefiningCalculator.module.css';
import MaterialCard from '../refining/MaterialCard';
import {
  WANGAP_MAX_LEVEL,
  WANGAP_BASE_PROBABILITY,
  getWangapBreathEffect,
  WANGAP_MATERIAL_IDS,
  WANGAP_PROMOTION_COSTS,
  WANGAP_PROMO_MATERIALS,
  WANGAP_ITEM_IMAGES,
  WANGAP_GRADE_ORDER,
  WANGAP_GRADE_RANGES,
  type WangapGrade,
  type WangapPromotedGrade,
} from '../../lib/wangapData';
import {
  computeWangapAverage,
  type WangapCalcMode,
  type WangapBreathMode,
  type WangapAvgPromotionRow,
  type WangapAvgEnhanceRow,
  type WangapBreathPlanSegment,
} from '../../lib/wangapAverage';
import { MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';
import { OPT_MATERIAL_LIST, type OptMatKey } from './wangapShared';
import AdBanner from '../ads/AdBanner';

// 기본 재료 5종 (숨결 제외 — 숨결은 보조 재료 섹션에서 별도 표시)
const BASE_MATERIAL_KEYS: OptMatKey[] = ['파괴석결정', '수호석결정', '위대한돌파석', '상급아비도스', '운명파편'];

const MATERIAL_META = Object.fromEntries(
  OPT_MATERIAL_LIST.map(m => [m.key, m])
) as Record<OptMatKey, { key: OptMatKey; label: string; icon: string }>;

const createBoundFlags = (): Record<OptMatKey, boolean> =>
  Object.fromEntries(OPT_MATERIAL_LIST.map(m => [m.key, false])) as Record<OptMatKey, boolean>;

// 강화 여정 표시용 (등급 노드 + 승급 커넥터)
type JourneyItem =
  | { kind: 'node'; grade: WangapGrade; level: number }
  | { kind: 'promo'; to: WangapPromotedGrade; level: number };

export default function WangapAverageCalculator() {
  const { theme } = useTheme();

  // === 강화 구간 ===
  // 장비 선택 패널 없이 현재 단계에서 등급을 자동 유도 (0~9 영웅 / 10~14 전설 / 15~19 유물 / 20~ 고대)
  const [startLevel, setStartLevel] = useState(0);
  const [targetLevel, setTargetLevel] = useState(WANGAP_MAX_LEVEL);
  const startGrade: WangapGrade =
    startLevel >= 20 ? '고대' : startLevel >= 15 ? '유물' : startLevel >= 10 ? '전설' : '영웅';

  // === 계산 기준 (재련 평균 시뮬과 동일) ===
  const [calcMode, setCalcMode] = useState<WangapCalcMode>('median');

  // === 숨결 사용 정책: 미사용 / 풀숨 / 최적 (재련 숨결 컨트롤과 동일한 3버튼) ===
  const [lavaMode, setLavaMode] = useState<WangapBreathMode>('off');
  const [glacierMode, setGlacierMode] = useState<WangapBreathMode>('off');

  // === 귀속 (재련 재료 카드와 동일: 귀속 = 0골드) ===
  const [boundMaterials, setBoundMaterials] = useState<Record<OptMatKey, boolean>>(createBoundFlags);

  // 등급 카드 사이 승급 재료 상세 패널
  const [openPromoInfo, setOpenPromoInfo] = useState<WangapPromotedGrade | null>(null);

  // 단계별 숨결 투입 계획 팝업 (재련 평균 시뮬의 최적 숨결 팝업과 동일 구조)
  const [openBreathPopup, setOpenBreathPopup] = useState<'lava' | 'glacier' | null>(null);
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

  // === 거래소 시세 ===
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

  // 모바일 감지 (재련 계산기와 동일)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 거래소 가격 로드 — latest.json만 조회 (개당 가격으로 환산)
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const { fetchLatestPrices } = await import('@/lib/price-history-client');
        const latest = await fetchLatestPrices();
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

  const getUnitPrice = (key: OptMatKey): number => {
    const itemId = WANGAP_MATERIAL_IDS[key];
    return itemId ? (marketPrices[String(itemId)] || 0) : 0;
  };

  // === 강화 구간 조정 === (시작 단계는 0~24 자유 — 등급은 위에서 자동 유도)
  const startMin = 0;
  const startMax = WANGAP_MAX_LEVEL - 1;

  const adjustStart = (delta: number) => {
    const nv = Math.min(Math.max(startLevel + delta, startMin), startMax);
    setStartLevel(nv);
    if (targetLevel <= nv) setTargetLevel(Math.min(nv + 1, WANGAP_MAX_LEVEL));
  };

  const adjustTarget = (delta: number) => {
    setTargetLevel(Math.min(Math.max(targetLevel + delta, startLevel + 1), WANGAP_MAX_LEVEL));
  };

  // 직접 입력 초안 (스테퍼 가운데 칸 — ± 버튼·등급 변경 시 자동 동기화)
  const [startDraft, setStartDraft] = useState('0');
  const [targetDraft, setTargetDraft] = useState(String(WANGAP_MAX_LEVEL));
  useEffect(() => setStartDraft(String(startLevel)), [startLevel]);
  useEffect(() => setTargetDraft(String(targetLevel)), [targetLevel]);

  const commitStartDraft = () => {
    const v = parseInt(startDraft);
    if (isNaN(v)) {
      setStartDraft(String(startLevel));
      return;
    }
    const nv = Math.min(Math.max(v, startMin), startMax);
    setStartDraft(String(nv));
    setStartLevel(nv);
    if (targetLevel <= nv) setTargetLevel(Math.min(nv + 1, WANGAP_MAX_LEVEL));
  };

  const commitTargetDraft = () => {
    const v = parseInt(targetDraft);
    if (isNaN(v)) {
      setTargetDraft(String(targetLevel));
      return;
    }
    const nv = Math.min(Math.max(v, startLevel + 1), WANGAP_MAX_LEVEL);
    setTargetDraft(String(nv));
    setTargetLevel(nv);
  };

  // === 기대값 계산 (조건이 바뀌면 즉시 재계산) ===
  const result = useMemo(() => {
    const unitPrices = Object.fromEntries(
      OPT_MATERIAL_LIST.map(m => {
        const itemId = WANGAP_MATERIAL_IDS[m.key];
        return [m.key, itemId ? (marketPrices[String(itemId)] || 0) : 0];
      })
    ) as Record<OptMatKey, number>;
    return computeWangapAverage({
      startLevel,
      targetLevel,
      startGrade,
      mode: calcMode,
      lavaMode,
      glacierMode,
      boundFlags: boundMaterials,
      unitPrices,
    });
  }, [startLevel, targetLevel, startGrade, calcMode, lavaMode, glacierMode, boundMaterials, marketPrices]);

  const { totals, growth } = result;

  // 구간에 포함되는 승급(해방) 목록 — 여정 표시와 승급 재료 섹션이 함께 사용
  const promoRows = useMemo(
    () => result.rows.filter((r): r is WangapAvgPromotionRow => r.type === 'promotion'),
    [result.rows],
  );

  // 단계별 숨결 계획 표시용 강화 행
  const enhanceRows = useMemo(
    () => result.rows.filter((r): r is WangapAvgEnhanceRow => r.type === 'enhance'),
    [result.rows],
  );

  // 강화 여정: [시작 등급 +S] → (승급) → [중간 등급 +10/+15] → (승급) → [최종 등급 +T]
  const journey = useMemo<JourneyItem[]>(() => {
    const items: JourneyItem[] = [{ kind: 'node', grade: startGrade, level: startLevel }];
    promoRows.forEach((p, i) => {
      items.push({ kind: 'promo', to: p.to, level: p.level });
      if (i < promoRows.length - 1) items.push({ kind: 'node', grade: p.to, level: p.level });
    });
    const endGrade = promoRows.length > 0 ? promoRows[promoRows.length - 1].to : startGrade;
    items.push({ kind: 'node', grade: endGrade, level: targetLevel });
    return items;
  }, [promoRows, startGrade, startLevel, targetLevel]);

  // === 골드 환산 (귀속 = 0골드) ===
  const amountOf = (key: OptMatKey): number => Math.round(totals[key]);
  const costOf = (key: OptMatKey): number => amountOf(key) * getUnitPrice(key);

  const pressGold = Math.round(totals.골드);
  // 장비 성장 파편 골드 환산 — 강화 파편과 같은 시세·귀속 설정을 따름 (실링은 시세 없음)
  const growthShardGold = boundMaterials.운명파편 ? 0 : Math.round(growth.운명파편 * getUnitPrice('운명파편'));
  const totalGold = Math.round(
    pressGold +
    OPT_MATERIAL_LIST.reduce((sum, m) => (boundMaterials[m.key] ? sum : sum + costOf(m.key)), 0) +
    growthShardGold
  );

  const showPromotion = promoRows.length > 0;

  const calcModeLabel = calcMode === 'median' ? '중앙값' : calcMode === 'average' ? '평균값' : '장기백';

  // 한 구간 표기: "1~4회 용10·빙10" (마지막 구간은 열린 구간 "12회~")
  const segLabel = (s: WangapBreathPlanSegment, isLast: boolean) => {
    const range = s.from === s.to ? `${s.from}회`
      : isLast ? `${s.from}회~`
      : `${s.from}~${s.to}회`;
    const mats = [
      s.lava > 0 ? `용${s.lava}` : null,
      s.glacier > 0 ? `빙${s.glacier}` : null,
    ].filter(Boolean).join('·');
    return `${range} ${mats || '노숨'}`;
  };

  const planLabel = (row: WangapAvgEnhanceRow) => {
    if (row.plan.length === 0) return '노숨';
    if (row.planKind === 'none') return '노숨';
    // 풀숨도 실제 개수를 병기 — 구간마다 최대치가 다르다 (영웅~유물 20·20, 고대 25·25)
    if (row.planKind === 'full') return `풀숨 용${row.plan[0].lava}·빙${row.plan[0].glacier}`;
    return row.plan.map((s, i) => segLabel(s, i === row.plan.length - 1)).join(' / ');
  };

  // 1회차 기준 성공 확률 표기 — 숨결을 넣으면 "기본%→적용%"로 효과를 바로 보여준다
  const fmtPct = (p: number) => `${parseFloat((p * 100).toFixed(2))}%`;
  const probLabel = (row: WangapAvgEnhanceRow) => {
    const base = WANGAP_BASE_PROBABILITY[row.level] ?? 0;
    const first = row.plan[0];
    const n = first ? first.lava + first.glacier : 0;
    if (n === 0) return fmtPct(base);
    return `${fmtPct(base)}→${fmtPct(Math.min(base + n * getWangapBreathEffect(base).per, 1))}`;
  };

  // 같은 계획이 이어지는 단계는 한 칩으로 묶는다 (+0~+9 풀숨 ×10줄 반복 방지)
  const planGroups = useMemo(() => {
    const groups: Array<{ from: number; to: number; sig: string; row: WangapAvgEnhanceRow }> = [];
    enhanceRows.forEach(row => {
      const sig = JSON.stringify([
        WANGAP_BASE_PROBABILITY[row.level] ?? 0,
        row.planKind,
        row.plan.map(s => [s.from, s.to, s.lava, s.glacier]),
      ]);
      const last = groups[groups.length - 1];
      if (last && last.sig === sig && last.to === row.level - 1) last.to = row.level;
      else groups.push({ from: row.level, to: row.level, sig, row });
    });
    return groups;
  }, [enhanceRows]);

  const planChipCls = (kind: WangapAvgEnhanceRow['planKind']) =>
    kind === 'none' ? styles.breathChipNone : kind === 'full' ? styles.breathChipFull : styles.breathChipPartial;

  // 단계별 숨결 계획 팝업 — "최적" 버튼 바로 위. 어느 단계의 몇 회차에 몇 개를 넣는지 나열한다.
  const renderBreathPopup = (which: 'lava' | 'glacier') => {
    if (openBreathPopup !== which) return null;
    const popup = (
      <div className={styles.breathPopup} data-breath-popup onClick={e => e.stopPropagation()}>
        <div className={styles.breathPopupHeader}>
          <span className={styles.breathPopupTitle}>
            단계별 숨결 <span className={styles.breathPopupSub}>{calcModeLabel}·시세연동</span>
          </span>
          <button type="button" className={styles.breathPopupClose} onClick={() => setOpenBreathPopup(null)}>✕</button>
        </div>
        {enhanceRows.length === 0 ? (
          <div className={styles.breathPopupEmpty}>목표 단계를 먼저 설정하세요</div>
        ) : (
          <>
            {/* 구간 전체 예상 소모 요약 — 계산 모드 기준, 재료 카드 수치와 동일 */}
            <div className={wg.breathPopupSummary}>
              예상 소모 — 용암 <b>{amountOf('용암').toLocaleString()}</b>개 · 빙하 <b>{amountOf('빙하').toLocaleString()}</b>개
            </div>
            <div className={styles.breathPopupLine}>
              {planGroups.map(g => (
                <span key={g.from} className={`${styles.breathChip} ${planChipCls(g.row.planKind)}`}>
                  <span className={styles.breathChipLv}>
                    {g.from === g.to ? `+${g.from}→${g.from + 1}` : `+${g.from}~+${g.to}`}
                  </span>
                  <span className={styles.breathChipVal}>{planLabel(g.row)}</span>
                  <span className={wg.breathChipProb}>{probLabel(g.row)}</span>
                </span>
              ))}
            </div>
            <div className={wg.breathPopupNote}>
              묶인 구간(+a~+b)은 각 단계에 같은 계획 적용 · 회차는 그 단계의 시도 순서 · 확률은 1회차
              기준(실패 누적 시 상승) · 장인의 기운 100% 회차는 확정 성공이라 숨결을 넣지 않습니다
            </div>
          </>
        )}
      </div>
    );
    // 모바일: 카드 transform에 fixed가 갇히지 않도록 body 포털 (재련 팝업과 동일)
    return isMobile ? createPortal(popup, document.body) : popup;
  };

  // 숨결 카드 하단 컨트롤 — 미사용/풀숨/최적 (재련 숨결 컨트롤과 동일한 버튼 스타일)
  const renderBreathModeControl = (which: 'lava' | 'glacier') => {
    const mode = which === 'lava' ? lavaMode : glacierMode;
    const setMode = which === 'lava' ? setLavaMode : setGlacierMode;
    const options: Array<{ value: WangapBreathMode; label: string }> = [
      { value: 'off', label: '미사용' },
      { value: 'full', label: '풀숨' },
      { value: 'optimal', label: '최적' },
    ];
    return (
      <div className={styles.breathControls} onClick={e => e.stopPropagation()}>
        <div className={styles.advTurnRow}>
          {options.map(opt => (
            <div key={opt.value} className={styles.advTurnItem}>
              <button
                type="button"
                {...(opt.value === 'optimal' ? { 'data-breath-opt-btn': true } : {})}
                className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${mode === opt.value ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                onClick={() => {
                  setMode(opt.value);
                  // 최적: 적용과 동시에 단계별 계획 팝업을 열어 어디에 몇 개인지 바로 보여준다
                  setOpenBreathPopup(prev => (opt.value === 'optimal' ? (prev === which ? null : which) : null));
                }}
                title={opt.value === 'optimal' ? '시세·확률 기준 단계별 최적 개수 자동 적용' : undefined}
              >
                {opt.label}{opt.value === 'optimal' && mode === 'optimal' ? ' ▾' : ''}
              </button>
              {opt.value === 'optimal' && renderBreathPopup(which)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 재료 카드 공통 props (귀속 토글)
  const matCardProps = (key: OptMatKey) => ({
    showCheckbox: true,
    isBound: boundMaterials[key],
    onBoundChange: (_: string, isBound: boolean) =>
      setBoundMaterials(prev => ({ ...prev, [key]: isBound })),
    cost: costOf(key),
  });

  return (
    <div className={wg.container} data-grade={startGrade}>
      <div className={wg.mainLayout}>
        {/* ===== 강화 구간 설정 (재련 평균 시뮬 카드 스타일) ===== */}
        {/* mainCard의 min-height(400px)는 결과 카드용 — 설정 카드는 내용만큼만 */}
        <Card className={styles.mainCard} style={{ minHeight: 'auto' }}>
          <Card.Body className={styles.cardBody} style={{ padding: isMobile ? '0.85rem 0.6rem' : '1.1rem 1.5rem' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: isMobile ? '0.6rem 0.75rem' : '0.85rem 1.25rem',
            }}>
              {/* 현재 단계 (± 스테퍼 + 직접 입력) */}
              <div style={{ textAlign: 'center' }}>
                <div className={`${styles.bulkSettingLabel} ${isMobile ? styles.bulkSettingLabelMobile : ''}`}>
                  현재 단계
                </div>
                <div className={wg.avgStepper}>
                  <button
                    type="button"
                    className={wg.avgStepBtn}
                    onClick={() => adjustStart(-1)}
                    disabled={startLevel <= startMin}
                    aria-label="현재 단계 감소"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={wg.avgLevelInput}
                    value={startDraft}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d+$/.test(v)) setStartDraft(v);
                    }}
                    onBlur={commitStartDraft}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    aria-label="현재 단계"
                  />
                  <button
                    type="button"
                    className={wg.avgStepBtn}
                    onClick={() => adjustStart(1)}
                    disabled={startLevel >= startMax}
                    aria-label="현재 단계 증가"
                  >
                    +
                  </button>
                </div>
              </div>

              <span className={wg.listArrow} aria-hidden="true" style={{ marginBottom: '0.4rem' }}>→</span>

              {/* 목표 단계 (현재와 동일한 디자인) */}
              <div style={{ textAlign: 'center' }}>
                <div className={`${styles.bulkSettingLabel} ${isMobile ? styles.bulkSettingLabelMobile : ''}`}>
                  목표 단계
                </div>
                <div className={wg.avgStepper}>
                  <button
                    type="button"
                    className={wg.avgStepBtn}
                    onClick={() => adjustTarget(-1)}
                    disabled={targetLevel <= startLevel + 1}
                    aria-label="목표 단계 감소"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={wg.avgLevelInput}
                    value={targetDraft}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d+$/.test(v)) setTargetDraft(v);
                    }}
                    onBlur={commitTargetDraft}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    aria-label="목표 단계"
                  />
                  <button
                    type="button"
                    className={wg.avgStepBtn}
                    onClick={() => adjustTarget(1)}
                    disabled={targetLevel >= WANGAP_MAX_LEVEL}
                    aria-label="목표 단계 증가"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 목표 빠른 선택 (승급 경계 단위) — 모바일에서는 스테퍼 아래 별도 줄로 */}
              <div style={{ textAlign: 'center', flexBasis: isMobile ? '100%' : undefined }}>
                <div className={`${styles.bulkSettingLabel} ${isMobile ? styles.bulkSettingLabelMobile : ''}`}>
                  빠른 선택
                </div>
                {/* 버튼이 3개뿐이라 모바일에서도 축소판 대신 기본 크기 유지 (터치 타깃 확보) */}
                <div
                  className={styles.bulkButtonGroup}
                  style={{ justifyContent: 'center' }}
                >
                  {[10, 15, 20, 25].filter(level => level > startLevel).map(level => (
                    <button
                      key={level}
                      onClick={() => setTargetLevel(level)}
                      className={`${styles.bulkButton} ${targetLevel === level ? styles.bulkButtonSelected : ''}`}
                    >
                      +{level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 강화 여정: 어디에서 어디로 가는지 등급 이미지 + 승급으로 표현 */}
            <div className={wg.journeyRow}>
              {journey.map((item, i) => (
                <Fragment key={i}>
                  {/* 모바일: 장비 선택과 동일하게 유물 승급부터 둘째 줄로 (데스크톱에선 숨김) */}
                  {item.kind === 'promo' && item.to === '유물' && <span className={wg.equipmentRowBreak} aria-hidden="true" />}
                  {i > 0 && <span className={wg.listArrow} aria-hidden="true">→</span>}
                  {item.kind === 'node' ? (
                    <div className={wg.journeyNode}>
                      <span className={wg.equipmentIcon} data-grade={item.grade}>
                        {/* 이미지가 배경 포함 — 개구부+블리드 박스를 cover로 꽉 채우고 위에 프레임을 덮음 */}
                        <span className={wg.equipmentIconImg}>
                          <Image src={WANGAP_ITEM_IMAGES[item.grade]} alt={`완갑 ${item.grade}`} fill sizes="60px" style={{ objectFit: 'cover' }} />
                        </span>
                        <span className={wg.equipmentFrame}>
                          <Image src="/wjsdbf3.webp" alt="" fill sizes="84px" style={{ objectFit: 'fill' }} unoptimized />
                        </span>
                      </span>
                      {/* 장비 선택 카드와 동일한 등급 구간 배지로 통일 */}
                      <span className={wg.levelBadge} data-grade={item.grade}>
                        +{WANGAP_GRADE_RANGES[item.grade].min}~{WANGAP_GRADE_RANGES[item.grade].max}
                      </span>
                    </div>
                  ) : (
                    /* 승급 상자 — 클릭 시 재료 상세 패널 토글 (장비 선택 패널 제거로 진입점이 여기로 이동) */
                    <button
                      type="button"
                      className={`${wg.journeyPromo} ${openPromoInfo === item.to ? wg.promoConnectorActive : ''}`}
                      onClick={() => setOpenPromoInfo(prev => (prev === item.to ? null : item.to))}
                      aria-label={`${item.to} 승급 재료 정보`}
                    >
                      <span className={wg.journeyPromoIcon}>
                        <Image
                          src={WANGAP_PROMO_MATERIALS[WANGAP_PROMOTION_COSTS[item.to][0].material].icon}
                          alt={WANGAP_PROMO_MATERIALS[WANGAP_PROMOTION_COSTS[item.to][0].material].name}
                          fill
                          sizes="38px"
                          style={{ objectFit: 'cover' }}
                        />
                      </span>
                      <span className={wg.journeyPromoText}>+{item.level} 승급</span>
                    </button>
                  )}
                </Fragment>
              ))}
            </div>

          </Card.Body>
        </Card>

        {/* 승급 재료 상세 — 여정의 승급 상자 클릭으로 구간 설정 카드 "아래"에 펼쳐진다 */}
        {openPromoInfo && (
          <div className={wg.promoInfoPanel} data-grade={openPromoInfo}>
            <div className={wg.promoInfoTitle}>
              {WANGAP_GRADE_ORDER[WANGAP_GRADE_ORDER.indexOf(openPromoInfo) - 1]} → {openPromoInfo} 승급
            </div>
            <div className={wg.promoOptionRow}>
              {WANGAP_PROMOTION_COSTS[openPromoInfo].map((opt, i) => (
                <Fragment key={opt.material}>
                  {i > 0 && <div className={wg.promoOptionOr}>or</div>}
                  <div className={`${wg.promoOptionCard} ${wg.promoOptionCardStatic}`}>
                    <span className={wg.promoOptionIcon}>
                      <Image
                        src={WANGAP_PROMO_MATERIALS[opt.material].icon}
                        alt={WANGAP_PROMO_MATERIALS[opt.material].name}
                        fill
                        sizes="72px"
                        style={{ objectFit: 'cover' }}
                      />
                    </span>
                    <span className={wg.promoOptionName}>{WANGAP_PROMO_MATERIALS[opt.material].name}</span>
                    <span className={wg.promoOptionAmount}>×{opt.amount}</span>
                    <span className={wg.promoOptionAcquire}>{WANGAP_PROMO_MATERIALS[opt.material].source}</span>
                    <span className={wg.promoOptionAcquire}>{WANGAP_PROMO_MATERIALS[opt.material].weekly}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {/* 모바일 띠배너 — 카드 사이(강화 여정 ↔ 예상 소모 재료). 같은 페이지의 다른 자리와
            단위가 겹치면 애드핏이 첫 자리만 채우므로 인-콘텐츠 단위 순번을 따로 쓴다. */}
        <div className="d-block d-lg-none my-2">
          <AdBanner slot="8616653628" index={0} />
        </div>

        {/* ===== 예상 소모 재료 (재련 평균 시뮬과 동일한 카드) ===== */}
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
          <Card.Body className={styles.cardBody} style={{ padding: isMobile ? '0.75rem 0.5rem' : undefined }}>
            {/* 1줄: 기본 재료 5종 + 실링 */}
            <div className={styles.materialsSection}>
              <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                {BASE_MATERIAL_KEYS.map(key => (
                  <Col key={key} xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                    <MaterialCard
                      icon={MATERIAL_META[key].icon}
                      name={MATERIAL_META[key].label}
                      amount={amountOf(key)}
                      color="#a855f7"
                      {...matCardProps(key)}
                    />
                  </Col>
                ))}
                <Col xs={4} sm={4} md={4} lg={2} style={{ minWidth: '0' }}>
                  <MaterialCard icon="/shilling.webp" name="실링" amount={Math.round(totals.실링)} color="#9ca3af" showCheckbox={false} />
                </Col>
              </Row>
            </div>

            {/* 2줄: 보조 재료 (숨결) — 미사용/풀숨/최적 */}
            <div className={styles.materialsSection}>
              <div className={styles.materialsSectionTitle}>
                보조 재료 (숨결)
              </div>
              <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                <Col xs={6} sm={5} md={3} style={{ minWidth: '0' }}>
                  <MaterialCard
                    icon={MATERIAL_META.용암.icon}
                    name="용암의 숨결"
                    amount={amountOf('용암')}
                    color="#34d399"
                    {...matCardProps('용암')}
                    footer={renderBreathModeControl('lava')}
                  />
                </Col>
                <Col xs={6} sm={5} md={3} style={{ minWidth: '0' }}>
                  <MaterialCard
                    icon={MATERIAL_META.빙하.icon}
                    name="빙하의 숨결"
                    amount={amountOf('빙하')}
                    color="#34d399"
                    {...matCardProps('빙하')}
                    footer={renderBreathModeControl('glacier')}
                  />
                </Col>
              </Row>
            </div>

            {/* 3줄: 승급(해방) 재료 (구간에 승급이 포함될 때만) — 해방마다 재료 옵션 중 택1 */}
            {showPromotion && (
              <div className={styles.materialsSection}>
                <div className={styles.materialsSectionTitle}>
                  승급 재료
                </div>
                {/* 승급마다 한 줄 컴팩트 표기: "+10 전설 승급  [아이콘] 사령의 잔영 ×200 or [아이콘] 죽음의 손 ×100" */}
                {promoRows.map(p => (
                  <div
                    key={p.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      gap: '0.3rem 0.6rem',
                      marginBottom: '0.35rem',
                      fontSize: isMobile ? '0.72rem' : '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span className={wg.promoGradeText} data-grade={p.to}>+{p.level} {p.to} 승급</span>
                    {WANGAP_PROMOTION_COSTS[p.to].map((opt, i) => (
                      <Fragment key={opt.material}>
                        {i > 0 && <span style={{ fontWeight: 800, color: '#9333ea' }}>or</span>}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Image
                            src={WANGAP_PROMO_MATERIALS[opt.material].icon}
                            alt={WANGAP_PROMO_MATERIALS[opt.material].name}
                            width={20}
                            height={20}
                            style={{ borderRadius: '4px' }}
                          />
                          {WANGAP_PROMO_MATERIALS[opt.material].name} ×{opt.amount}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                ))}
                <div style={{
                  marginTop: '0.5rem',
                  textAlign: 'center',
                  fontSize: isMobile ? '0.7rem' : '0.78rem',
                  color: 'var(--text-muted)',
                }}>
                  벨가르딘 레이드 특수 재료 (거래 불가) · 승급에 골드는 소모되지 않습니다
                </div>
              </div>
            )}

            {/* 4줄: 장비 성장 비용 — 단계마다 1회 고정 지불, 강화 재료와 별도 표기 */}
            <div className={styles.materialsSection}>
              <div className={styles.materialsSectionTitle}>
                장비 성장 비용 (+{startLevel} → +{targetLevel})
              </div>
              <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                <Col xs={6} sm={5} md={3} style={{ minWidth: '0' }}>
                  <MaterialCard
                    icon={MATERIAL_META.운명파편.icon}
                    name="운명의 파편"
                    amount={growth.운명파편}
                    color="#38bdf8"
                    cost={growthShardGold}
                  />
                </Col>
                <Col xs={6} sm={5} md={3} style={{ minWidth: '0' }}>
                  <MaterialCard icon="/shilling.webp" name="실링" amount={growth.실링} color="#9ca3af" showCheckbox={false} />
                </Col>
              </Row>
              <div style={{
                marginTop: '0.5rem',
                textAlign: 'center',
                fontSize: isMobile ? '0.7rem' : '0.78rem',
                color: 'var(--text-muted)',
              }}>
                강화를 시작하려면 단계마다 1회 지불하는 고정 비용입니다 — 시도 횟수와 무관 · 파편 골드 환산은 총 소모 골드에 포함
              </div>
            </div>

            {/* 5줄: 누르는 골드 + 총 소모 골드 */}
            <div className="mb-4">
              <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                <Col xs={6} sm={6} md={6} style={{ minWidth: '0' }}>
                  <MaterialCard icon="/gold.webp" name="누르는 골드" amount={pressGold} color="#f59e0b" />
                </Col>
                <Col xs={6} sm={6} md={6} style={{ minWidth: '0' }}>
                  <MaterialCard
                    icon="/gold.webp"
                    name="총 소모 골드"
                    amount={totalGold}
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
                {calcMode === 'median' && '중앙값 기준: 단계마다 절반이 이 횟수 안에 성공하는 값을 더한 수치입니다. 묶는 단계가 많을수록 전체 기준으로는 낮게 잡히니, 구간이 길면 평균값을 함께 보세요.'}
                {calcMode === 'average' && '평균값 기준: 장인의 기운과 실패 시 확률 증가가 반영된 예상 수치입니다. 실제 소모량은 확률에 따라 다를 수 있습니다.'}
                {calcMode === 'pity' && '장기백 기준: 매번 장인의 기운 100%에서 성공하는 최악의 경우입니다. 실제로는 이보다 적게 소모됩니다.'}
              </small>
            </div>
          </Card.Body>
        </Card>
      </div>

    </div>
  );
}
