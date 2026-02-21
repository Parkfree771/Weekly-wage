'use client';

import { useState, useCallback } from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';
import Image from 'next/image';
import {
  rollInitialEffects,
  rerollEffects,
  calculateComboProbability,
  formatProbPercent,
  getTierVaryingPositions,
  type BraceletEffect,
  type FixedStat,
  type FixedStatType,
  type SimPhase,
} from '@/lib/braceletData';
import styles from './bracelet.module.css';

export default function BraceletPage() {
  const [phase, setPhase] = useState<SimPhase>('input');

  // 입력
  const [stat1Type, setStat1Type] = useState<FixedStatType>('특화');
  const [stat1Value, setStat1Value] = useState<number>(90);
  const [stat2Type, setStat2Type] = useState<FixedStatType>('치명');
  const [stat2Value, setStat2Value] = useState<number>(90);

  // 결과
  const [fixedStats, setFixedStats] = useState<[FixedStat, FixedStat]>([
    { type: '특화', value: 90 },
    { type: '치명', value: 90 },
  ]);
  const [currentEffects, setCurrentEffects] = useState<BraceletEffect[]>([]);
  const [newEffects, setNewEffects] = useState<BraceletEffect[] | null>(null);

  // 기회 시스템: 기본 생성(무료) + 기회 3회 + 재변환권(기회 소진 후)
  const [chancesUsed, setChancesUsed] = useState(0); // 0~3 기회
  const MAX_CHANCES = 3;
  const [ticketsUsed, setTicketsUsed] = useState(0); // 재변환권 사용 횟수
  const MAX_TICKETS = 3;

  // 비교 화면에서 카드 선택 상태
  const [selectedSide, setSelectedSide] = useState<'current' | 'new' | null>(null);

  const chancesRemaining = MAX_CHANCES - chancesUsed;
  const ticketsRemaining = MAX_TICKETS - ticketsUsed;
  const isChancePhase = chancesUsed < MAX_CHANCES; // 기회 단계인지
  // 재변환 가능 여부: 기회 남았거나, 기회 소진 후 재변환권 남았거나
  const canReroll = isChancePhase ? chancesRemaining > 0 : ticketsRemaining > 0;

  // === 핸들러 ===
  const handleGenerate = () => {
    const stats: [FixedStat, FixedStat] = [
      { type: stat1Type, value: Math.min(120, Math.max(61, stat1Value)) },
      { type: stat2Type, value: Math.min(120, Math.max(61, stat2Value)) },
    ];
    setFixedStats(stats);
    setCurrentEffects(rollInitialEffects());
    setNewEffects(null);
    setChancesUsed(0);
    setTicketsUsed(0);
    setSelectedSide(null);
    setPhase('result');
  };

  const handleToggleLock = useCallback((index: number) => {
    setCurrentEffects(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], locked: !updated[index].locked };
      return updated;
    });
  }, []);

  // 재변환 (result 화면에서 → comparing으로)
  const handleReroll = () => {
    if (!canReroll) return;
    setNewEffects(rerollEffects(currentEffects));
    if (isChancePhase) {
      setChancesUsed(prev => prev + 1);
    } else {
      setTicketsUsed(prev => prev + 1);
    }
    setSelectedSide(null);
    setPhase('comparing');
  };

  // 비교 화면에서 우측 재변환 (신규 효과만 다시 롤)
  const handleRerollNew = () => {
    if (!canReroll) return;
    setNewEffects(rerollEffects(currentEffects));
    if (isChancePhase) {
      setChancesUsed(prev => prev + 1);
    } else {
      setTicketsUsed(prev => prev + 1);
    }
    setSelectedSide(null);
  };

  // 비교 화면에서 "선택" 버튼 (카드 선택 후 누름)
  const handleConfirmSelection = () => {
    if (!selectedSide) return;

    if (selectedSide === 'new' && newEffects) {
      setCurrentEffects([...newEffects]);
    }
    setNewEffects(null);
    setSelectedSide(null);

    // 기회도 다 쓰고 재변환권도 다 썼으면 최종
    const nextCanReroll = isChancePhase
      ? (MAX_CHANCES - chancesUsed) > 0
      : (MAX_TICKETS - ticketsUsed) > 0;

    if (!nextCanReroll) {
      setPhase('final');
    } else {
      setPhase('result');
    }
  };

  const handleConfirm = () => {
    setPhase('final');
  };

  const handleReset = () => {
    setPhase('input');
    setCurrentEffects([]);
    setNewEffects(null);
    setChancesUsed(0);
    setTicketsUsed(0);
    setSelectedSide(null);
  };

  const clampValue = (val: string): number => {
    const num = parseInt(val) || 61;
    return Math.min(120, Math.max(61, num));
  };

  const getTierClass = (tier: string) => {
    if (tier === 'high') return styles.effectHigh;
    if (tier === 'mid') return styles.effectMid;
    return styles.effectLow;
  };

  const getFixedTierClass = (value: number) => {
    if (value >= 103) return styles.effectHigh;
    if (value >= 85) return styles.effectMid;
    return styles.effectLow;
  };

  const renderColoredLabel = (label: string, tierClass: string, effectId: string) => {
    const varying = getTierVaryingPositions(effectId);
    const parts = label.split(/(\d+\.?\d*%?)/g);
    let numIdx = 0;
    return parts.map((part, i) => {
      if (/^\d+\.?\d*%?$/.test(part)) {
        const isVarying = varying.has(numIdx);
        numIdx++;
        return isVarying ? <span key={i} className={tierClass}>{part}</span> : part;
      }
      return part;
    });
  };

  // === 팔찌 카드 렌더링 ===
  const renderBraceletCard = (
    effects: BraceletEffect[],
    title: string,
    variant: 'current' | 'new' | 'final' | 'single',
    showLock: boolean,
    selectable?: boolean,
    isSelected?: boolean,
    onSelect?: () => void,
  ) => {
    const comboProb = effects.length > 0
      ? formatProbPercent(calculateComboProbability(effects.map(e => e.def)))
      : null;

    return (
      <div
        className={`${styles.braceletCard} ${styles[`braceletCard_${variant}`]} ${isSelected ? styles.braceletCardSelected : ''} ${selectable ? styles.braceletCardSelectable : ''}`}
        onClick={selectable ? onSelect : undefined}
        role={selectable ? 'button' : undefined}
        tabIndex={selectable ? 0 : undefined}
        onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(); } : undefined}
      >
        <div className={`${styles.cardHeader} ${styles[`cardHeader_${variant}`]}`}>
          <span className={`${styles.cardTitle} ${styles[`cardTitle_${variant}`]}`}>{title}</span>
        </div>
        <div className={styles.cardBody}>
          {/* 고정 특성 */}
          <div className={styles.effectItem}>
            <span className={styles.effectIcon}>◈</span>
            <span className={styles.effectFixed}>{fixedStats[0].type} +<span className={`${styles.effectFixedValue} ${getFixedTierClass(fixedStats[0].value)}`}>{fixedStats[0].value}</span></span>
          </div>
          <div className={styles.effectItem}>
            <span className={styles.effectIcon}>◈</span>
            <span className={styles.effectFixed}>{fixedStats[1].type} +<span className={`${styles.effectFixedValue} ${getFixedTierClass(fixedStats[1].value)}`}>{fixedStats[1].value}</span></span>
          </div>

          <div className={styles.effectDivider} />

          {/* 부여 효과 */}
          {effects.map((effect, idx) => (
            <div
              key={`${effect.def.id}-${idx}`}
              className={`${styles.effectItem} ${effect.locked ? styles.effectItemLocked : ''}`}
            >
              <span className={styles.effectIcon}>◈</span>
              <span className={styles.effectLabel}>
                {renderColoredLabel(effect.def.label, getTierClass(effect.def.tier), effect.def.id)}
              </span>
              {showLock && (
                <button
                  className={`${styles.lockButton} ${effect.locked ? styles.lockButtonActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleToggleLock(idx); }}
                  title={effect.locked ? '잠금 해제' : '잠금'}
                >
                  <span className={styles.lockIcon} />
                </button>
              )}
            </div>
          ))}

          {/* 조합 확률 */}
          {comboProb && (
            <div className={styles.comboProbSection}>
              <span className={styles.comboProbLabel}>조합 확률</span>
              <span className={styles.comboProbValue}>{comboProb}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // === 입력 화면 ===
  const renderInput = () => (
    <div className={styles.inputCard}>
      <div className={styles.braceletIconWrapper}>
        <Image src="/vkfwl.webp" alt="팔찌" width={96} height={96} />
      </div>
      <h2 className={styles.braceletTitle}>찬란한 구원자의 팔찌</h2>
      <p className={styles.inputDesc}>전투 특성 2개를 선택하고 수치를 입력하세요</p>

      <div className={styles.statInputGrid}>
        <div className={styles.statInputRow}>
          <Form.Select
            value={stat1Type}
            onChange={(e) => setStat1Type(e.target.value as FixedStatType)}
            className={styles.statSelect}
          >
            <option value="특화">특화</option>
            <option value="신속">신속</option>
            <option value="치명">치명</option>
          </Form.Select>
          <Form.Control
            type="number"
            min={61}
            max={120}
            value={stat1Value}
            onChange={(e) => setStat1Value(clampValue(e.target.value))}
            className={styles.statValueInput}
          />
        </div>
        <div className={styles.statInputRow}>
          <Form.Select
            value={stat2Type}
            onChange={(e) => setStat2Type(e.target.value as FixedStatType)}
            className={styles.statSelect}
          >
            <option value="특화">특화</option>
            <option value="신속">신속</option>
            <option value="치명">치명</option>
          </Form.Select>
          <Form.Control
            type="number"
            min={61}
            max={120}
            value={stat2Value}
            onChange={(e) => setStat2Value(clampValue(e.target.value))}
            className={styles.statValueInput}
          />
        </div>
      </div>

      <button className={styles.generateButton} onClick={handleGenerate}>
        생성
      </button>
    </div>
  );

  // === 결과 화면 (생성/선택 후 돌아온 상태) ===
  const renderResult = () => (
    <div className={styles.resultContainer}>
      <div className={styles.braceletIconWrapper}>
        <Image src="/vkfwl.webp" alt="팔찌" width={80} height={80} />
      </div>
      <h2 className={styles.braceletTitle}>찬란한 구원자의 팔찌</h2>

      {/* 상태 표시 */}
      <div className={styles.statusBar}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>기회</span>
          <span className={styles.statusValue}>{chancesRemaining}/{MAX_CHANCES}</span>
        </div>
        {!isChancePhase && (
          <div className={styles.statusItem}>
            <Image src="/vkfwlwoqusghksrnjs.webp" alt="재변환권" width={20} height={20} />
            <span className={styles.statusValue}>{ticketsRemaining}/{MAX_TICKETS}</span>
          </div>
        )}
      </div>

      {renderBraceletCard(currentEffects, '부여 효과', 'single', true)}

      <div className={styles.actionRow}>
        <button
          className={isChancePhase ? styles.rerollButton : styles.rerollTicketButton}
          onClick={handleReroll}
          disabled={isChancePhase ? chancesRemaining <= 0 : ticketsRemaining <= 0}
        >
          {!isChancePhase && <Image src="/vkfwlwoqusghksrnjs.webp" alt="재변환권" width={20} height={20} />}
          재변환 ({isChancePhase ? chancesRemaining : ticketsRemaining}회 남음)
        </button>
        <button className={styles.confirmButton} onClick={handleConfirm}>
          확정
        </button>
      </div>

      <p className={styles.lockHint}>
        잠긴 효과와 고정 효과는 변환 시에도 유지됩니다.
      </p>
    </div>
  );

  // === 비교 화면 (게임 UI 참고) ===
  const renderComparing = () => {
    // 재변환 가능 여부: 기회 단계면 기회 남은 것, 재변환권 단계면 이미 사용한 적 있어야 함
    const nowCanReroll = isChancePhase
      ? (MAX_CHANCES - chancesUsed) > 0
      : (ticketsUsed > 0 && (MAX_TICKETS - ticketsUsed) > 0);

    return (
      <div className={styles.comparingContainer}>
        <div className={styles.braceletIconWrapper}>
          <Image src="/vkfwl.webp" alt="팔찌" width={80} height={80} />
        </div>
        <h2 className={styles.comparingTitle}>효과 선택</h2>
        <p className={styles.comparingDesc}>효과를 변환하거나 유지할 수 있습니다.</p>

        <Row className="g-3 mb-3">
          <Col md={6}>
            {renderBraceletCard(
              currentEffects, '기존 효과', 'current', false,
              true, selectedSide === 'current', () => setSelectedSide('current')
            )}
          </Col>
          <Col md={6}>
            {newEffects && renderBraceletCard(
              newEffects, '신규 효과', 'new', false,
              true, selectedSide === 'new', () => setSelectedSide('new')
            )}
          </Col>
        </Row>

        {/* 하단 정보 바 (게임 UI) */}
        <div className={styles.bottomBar}>
          <p className={styles.lockHintInline}>
            잠긴 효과와 고정 효과는 변환 시에도 유지됩니다.
          </p>
          {nowCanReroll && (
            <div className={styles.bottomActions}>
              <div className={styles.rerollArea}>
                <button
                  className={styles.rerollInlineButton}
                  onClick={handleRerollNew}
                >
                  {!isChancePhase && <Image src="/vkfwlwoqusghksrnjs.webp" alt="재변환권" width={18} height={18} />}
                  {isChancePhase && '↻ '}
                  재변환 ({isChancePhase ? chancesRemaining : ticketsRemaining}회 남음)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 선택 버튼 (골드색, 게임 UI) */}
        <button
          className={`${styles.selectConfirmButton} ${!selectedSide ? styles.selectConfirmButtonDisabled : ''}`}
          onClick={handleConfirmSelection}
          disabled={!selectedSide}
        >
          선택
        </button>
      </div>
    );
  };

  // === 최종 결과 ===
  const renderFinal = () => (
    <div className={styles.finalContainer}>
      <div className={styles.braceletIconWrapper}>
        <Image src="/vkfwl.webp" alt="팔찌" width={96} height={96} />
      </div>
      <h2 className={styles.braceletTitle}>완성된 팔찌</h2>

      {renderBraceletCard(currentEffects, '최종 효과', 'final', false)}

      <button className={styles.resetButton} onClick={handleReset}>
        다시하기
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
        <div className="text-center mb-3" style={{ marginTop: 0 }}>
          <h1 style={{
            fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginTop: 0,
            marginBottom: '0.5rem',
          }}>
            팔찌 시뮬레이터
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            전투 특성을 선택하고 부여 효과를 시뮬레이션하세요
          </p>
        </div>

        {phase === 'input' && renderInput()}
        {phase === 'result' && renderResult()}
        {phase === 'comparing' && renderComparing()}
        {phase === 'final' && renderFinal()}
      </Container>
    </div>
  );
}
