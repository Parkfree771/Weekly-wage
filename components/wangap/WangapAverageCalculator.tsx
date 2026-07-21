'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import Image from 'next/image';
import { useTheme } from '../ThemeProvider';
// 장비 선택 패널은 실제 시뮬과 동일한 스타일, 계산기 본문은 재련 평균 시뮬과 동일한 스타일 사용
import wg from './WangapSimulator.module.css';
import styles from '../refining/RefiningCalculator.module.css';
import MaterialCard from '../refining/MaterialCard';
import {
  WANGAP_MAX_LEVEL,
  WANGAP_MATERIAL_IDS,
  WANGAP_PROMOTION_COSTS,
  WANGAP_PROMOTION_MATERIALS,
  WANGAP_ITEM_IMAGES,
  WANGAP_GRADE_ORDER,
  WANGAP_GRADE_RANGES,
  type WangapGrade,
} from '../../lib/wangapData';
import {
  computeWangapAverage,
  type WangapCalcMode,
  type WangapBreathMode,
  type WangapAvgPromotionRow,
} from '../../lib/wangapAverage';
import { MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';
import { OPT_MATERIAL_LIST, type OptMatKey } from './wangapShared';

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
  | { kind: 'promo'; to: '유물' | '고대'; level: number };

export default function WangapAverageCalculator() {
  const { theme } = useTheme();

  // === 강화 구간 ===
  const [startGrade, setStartGrade] = useState<WangapGrade>('전설');
  const [startLevel, setStartLevel] = useState(0);
  const [targetLevel, setTargetLevel] = useState(WANGAP_MAX_LEVEL);

  // === 계산 기준 (재련 평균 시뮬과 동일) ===
  const [calcMode, setCalcMode] = useState<WangapCalcMode>('median');

  // === 숨결 사용 정책: 미사용 / 풀숨 / 최적 (재련 숨결 컨트롤과 동일한 3버튼) ===
  const [lavaMode, setLavaMode] = useState<WangapBreathMode>('off');
  const [glacierMode, setGlacierMode] = useState<WangapBreathMode>('off');

  // === 귀속 (재련 재료 카드와 동일: 귀속 = 0골드) ===
  const [boundMaterials, setBoundMaterials] = useState<Record<OptMatKey, boolean>>(createBoundFlags);

  // 등급 카드 사이 승급 재료 상세 패널
  const [openPromoInfo, setOpenPromoInfo] = useState<'유물' | '고대' | null>(null);

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

  // === 강화 구간 조정 ===
  // 시작 단계는 선택한 등급 구간 내에서만 (전설 0~15 / 유물 15~20 / 고대 20~24)
  // 등급 상한(+15, +20)에서 시작하면 승급부터 계산에 포함된다
  const gradeRange = WANGAP_GRADE_RANGES[startGrade];
  const startMin = gradeRange.min;
  const startMax = Math.min(gradeRange.max, WANGAP_MAX_LEVEL - 1);

  const adjustStart = (delta: number) => {
    const nv = Math.min(Math.max(startLevel + delta, startMin), startMax);
    setStartLevel(nv);
    if (targetLevel <= nv) setTargetLevel(Math.min(nv + 1, WANGAP_MAX_LEVEL));
  };

  const adjustTarget = (delta: number) => {
    setTargetLevel(Math.min(Math.max(targetLevel + delta, startLevel + 1), WANGAP_MAX_LEVEL));
  };

  const selectGrade = (g: WangapGrade) => {
    if (g === startGrade) return;
    const ns = WANGAP_GRADE_RANGES[g].min;
    setStartGrade(g);
    setStartLevel(ns);
    if (targetLevel <= ns) setTargetLevel(Math.min(ns + 1, WANGAP_MAX_LEVEL));
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

  const { totals, promotionGold } = result;

  // 강화 여정: [시작 등급 +S] → (승급) → [중간 등급 +15] → (승급) → [최종 등급 +T]
  const journey = useMemo<JourneyItem[]>(() => {
    const promos = result.rows.filter((r): r is WangapAvgPromotionRow => r.type === 'promotion');
    const items: JourneyItem[] = [{ kind: 'node', grade: startGrade, level: startLevel }];
    promos.forEach((p, i) => {
      items.push({ kind: 'promo', to: p.to, level: p.level });
      if (i < promos.length - 1) items.push({ kind: 'node', grade: p.to, level: p.level });
    });
    const endGrade = promos.length > 0 ? promos[promos.length - 1].to : startGrade;
    items.push({ kind: 'node', grade: endGrade, level: targetLevel });
    return items;
  }, [result.rows, startGrade, startLevel, targetLevel]);

  // === 골드 환산 (귀속 = 0골드) ===
  const amountOf = (key: OptMatKey): number => Math.round(totals[key]);
  const costOf = (key: OptMatKey): number => amountOf(key) * getUnitPrice(key);

  const pressGold = Math.round(totals.골드);
  const totalGold = Math.round(
    pressGold +
    OPT_MATERIAL_LIST.reduce((sum, m) => (boundMaterials[m.key] ? sum : sum + costOf(m.key)), 0)
  );

  const showPromotion = totals.승급재료유물 > 0 || totals.승급재료고대 > 0;

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
                className={`${styles.advancedToggleButton} ${isMobile ? styles.advancedToggleButtonMobile : ''} ${mode === opt.value ? styles.advancedToggleButtonEnabled : styles.advancedToggleButtonDisabled}`}
                onClick={() => setMode(opt.value)}
                title={opt.value === 'optimal' ? '시세·확률 기준 단계별 최적 개수 자동 적용' : undefined}
              >
                {opt.label}
              </button>
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
        {/* ===== 장비 선택 패널 (실제 시뮬과 동일 — 시작 등급 선택) ===== */}
        <div className={wg.equipmentPanel}>
          <div className={wg.equipmentPanelTitle}>장비 선택</div>
          <div className={wg.equipmentList}>
            {WANGAP_GRADE_ORDER.map((g, i) => {
              const promoTarget = i > 0 ? (g as '유물' | '고대') : null;
              return (
                <Fragment key={g}>
                  {promoTarget && (
                    <>
                      <span className={wg.listArrow} aria-hidden="true">→</span>
                      <button
                        className={`${wg.promoConnector} ${openPromoInfo === promoTarget ? wg.promoConnectorActive : ''}`}
                        onClick={() => setOpenPromoInfo(prev => (prev === promoTarget ? null : promoTarget))}
                        aria-label={`${promoTarget} 승급 재료 정보`}
                      >
                        <span className={wg.promoConnectorIcon}>
                          <Image
                            src={WANGAP_PROMOTION_MATERIALS[promoTarget].icon}
                            alt={WANGAP_PROMOTION_MATERIALS[promoTarget].name}
                            fill
                            sizes="56px"
                            style={{ objectFit: 'contain' }}
                          />
                        </span>
                        <span className={wg.promoConnectorArrow}>승급</span>
                      </button>
                      <span className={wg.listArrow} aria-hidden="true">→</span>
                    </>
                  )}
                  <button
                    className={`${wg.equipmentItem} ${startGrade === g ? wg.equipmentItemSelected : ''}`}
                    data-grade={g}
                    onClick={() => selectGrade(g)}
                  >
                    <div className={wg.equipmentName} data-grade={g}>{g} 완갑</div>
                    <span className={wg.equipmentIcon} data-grade={g}>
                      {/* padding: 이미지가 개구부에 꽉 차 링을 침범해 보이지 않게 여백 */}
                      <Image src={WANGAP_ITEM_IMAGES[g]} alt={`완갑 ${g}`} fill sizes="54px" style={{ objectFit: 'contain', padding: '8%' }} />
                      <span className={wg.equipmentFrame}>
                        <Image src="/wjsdbf3.webp" alt="" fill sizes="84px" style={{ objectFit: 'fill' }} unoptimized />
                      </span>
                    </span>
                    <div className={wg.equipmentLevel}>
                      <span className={wg.levelBadge} data-grade={g}>
                        +{WANGAP_GRADE_RANGES[g].min}~{WANGAP_GRADE_RANGES[g].max}
                      </span>
                    </div>
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* 승급 재료 상세 */}
        {openPromoInfo && (
          <div className={wg.promoInfoPanel} data-grade={openPromoInfo}>
            <div className={wg.promoInfoTitle}>
              {openPromoInfo === '유물' ? '전설 → 유물 승급' : '유물 → 고대 승급'}
            </div>
            <div className={wg.promoInfoRow}>
              <span className={wg.promoInfoIcon}>
                <Image
                  src={WANGAP_PROMOTION_MATERIALS[openPromoInfo].icon}
                  alt={WANGAP_PROMOTION_MATERIALS[openPromoInfo].name}
                  fill
                  sizes="26px"
                  style={{ objectFit: 'contain' }}
                />
              </span>
              <span>{WANGAP_PROMOTION_MATERIALS[openPromoInfo].name}</span>
              <strong>{WANGAP_PROMOTION_COSTS[openPromoInfo].벨가르딘재료}개</strong>
            </div>
            <div className={wg.promoInfoRow}>
              <span className={wg.promoInfoIcon}>
                <Image src="/gold.webp" alt="골드" fill sizes="26px" style={{ objectFit: 'contain' }} />
              </span>
              <span>골드</span>
              <strong>{WANGAP_PROMOTION_COSTS[openPromoInfo].골드.toLocaleString()}G</strong>
            </div>
            <div className={wg.promoInfoDesc}>
              벨가르딘 레이드에서 획득하는 특수 재료로, 등급 상한(+{openPromoInfo === '유물' ? 15 : 20}) 도달 후 승급 시 소모됩니다
            </div>
          </div>
        )}

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
                  {[15, 20, 25].filter(level => level > startLevel).map(level => (
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
                  {i > 0 && <span className={wg.listArrow} aria-hidden="true">→</span>}
                  {item.kind === 'node' ? (
                    <div className={wg.journeyNode}>
                      <span className={wg.equipmentIcon} data-grade={item.grade}>
                        {/* padding: 이미지가 개구부에 꽉 차 링을 침범해 보이지 않게 여백 */}
                        <Image src={WANGAP_ITEM_IMAGES[item.grade]} alt={`완갑 ${item.grade}`} fill sizes="54px" style={{ objectFit: 'contain', padding: '8%' }} />
                        <span className={wg.equipmentFrame}>
                          <Image src="/wjsdbf3.webp" alt="" fill sizes="84px" style={{ objectFit: 'fill' }} unoptimized />
                        </span>
                      </span>
                      <span className={wg.levelBadge} data-grade={item.grade}>{item.grade} +{item.level}</span>
                    </div>
                  ) : (
                    <div className={wg.journeyPromo}>
                      <span className={wg.journeyPromoIcon}>
                        <Image
                          src={WANGAP_PROMOTION_MATERIALS[item.to].icon}
                          alt={WANGAP_PROMOTION_MATERIALS[item.to].name}
                          fill
                          sizes="38px"
                          style={{ objectFit: 'contain' }}
                        />
                      </span>
                      <span className={wg.journeyPromoText}>+{item.level} 승급</span>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>

          </Card.Body>
        </Card>

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

            {/* 3줄: 승급 재료 (구간에 승급이 포함될 때만) */}
            {showPromotion && (
              <div className={styles.materialsSection}>
                <div className={styles.materialsSectionTitle}>
                  승급 재료
                </div>
                <Row className={isMobile ? 'g-2 justify-content-center' : 'g-3 justify-content-center'}>
                  {totals.승급재료유물 > 0 && (
                    <Col xs={6} sm={5} md={3} style={{ minWidth: '0' }}>
                      <MaterialCard
                        icon={WANGAP_PROMOTION_MATERIALS.유물.icon}
                        name={WANGAP_PROMOTION_MATERIALS.유물.name}
                        amount={totals.승급재료유물}
                        color="#d97706"
                      />
                    </Col>
                  )}
                  {totals.승급재료고대 > 0 && (
                    <Col xs={6} sm={5} md={3} style={{ minWidth: '0' }}>
                      <MaterialCard
                        icon={WANGAP_PROMOTION_MATERIALS.고대.icon}
                        name={WANGAP_PROMOTION_MATERIALS.고대.name}
                        amount={totals.승급재료고대}
                        color="#c19a5c"
                      />
                    </Col>
                  )}
                </Row>
                <div style={{
                  marginTop: '0.5rem',
                  textAlign: 'center',
                  fontSize: isMobile ? '0.7rem' : '0.78rem',
                  color: 'var(--text-muted)',
                }}>
                  벨가르딘 레이드 특수 재료 (거래 불가) · 승급 골드 {promotionGold.toLocaleString()}G는 누르는 골드에 포함되어 있습니다
                </div>
              </div>
            )}

            {/* 4줄: 누르는 골드 + 총 소모 골드 */}
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
                {calcMode === 'median' && '중앙값 기준: 50%의 유저가 이 비용 이하로 성공합니다. 장인의 기운과 실패 시 확률 증가가 반영된 수치입니다.'}
                {calcMode === 'average' && '평균값 기준: 장인의 기운과 실패 시 확률 증가가 반영된 예상 수치입니다. 실제 소모량은 확률에 따라 다를 수 있습니다.'}
                {calcMode === 'pity' && '장기백 기준: 매번 장인의 기운 100%에서 성공하는 최악의 경우입니다. 실제로는 이보다 적게 소모됩니다.'}
              </small>
            </div>
          </Card.Body>
        </Card>
      </div>

      <div className={wg.tempNotice}>
        완갑은 아직 인게임 스펙이 공개되지 않아 확률·재료 소모량·승급 비용이 전부 임시값입니다. 공개 후 실제 수치로 교체됩니다.
      </div>
    </div>
  );
}
