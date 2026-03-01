'use client';

import { useState, useMemo } from 'react';
import type { CombatPowerData } from '@/lib/combatPowerData';
import type { SimulationResult, UpgradeRecommendation } from '@/lib/combatPowerSimulator';
import {
  simulateWeaponQuality,
  simulateGemUpgrade,
  simulateEngravingChange,
  getUpgradeRecommendations,
} from '@/lib/combatPowerSimulator';
import styles from '@/app/combat-power/combat-power.module.css';

type Props = {
  data: CombatPowerData;
};

type SimTab = 'simulator' | 'recommendations';

export default function CombatPowerSimulator({ data }: Props) {
  const [activeTab, setActiveTab] = useState<SimTab>('simulator');

  // 시뮬레이터 상태
  const [weaponQuality, setWeaponQuality] = useState(data.weapon?.quality || 0);
  const [selectedGemType, setSelectedGemType] = useState('');
  const [gemLevel, setGemLevel] = useState(10);
  const [selectedEngraving, setSelectedEngraving] = useState('');
  const [engravingLevel, setEngravingLevel] = useState(4);

  // 보석 타입 목록
  const gemTypes = useMemo(() =>
    [...new Set(data.gems.map(g => g.type))],
    [data.gems]
  );

  // 시뮬레이션 결과들
  const results = useMemo(() => {
    const res: SimulationResult[] = [];

    // 무기 품질
    if (data.weapon && weaponQuality !== data.weapon.quality) {
      const r = simulateWeaponQuality(data, weaponQuality);
      if (r) res.push(r);
    }

    // 보석
    if (selectedGemType) {
      const r = simulateGemUpgrade(data, selectedGemType, gemLevel);
      if (r) res.push(r);
    }

    // 각인
    if (selectedEngraving) {
      const r = simulateEngravingChange(data, selectedEngraving, engravingLevel);
      if (r) res.push(r);
    }

    return res;
  }, [data, weaponQuality, selectedGemType, gemLevel, selectedEngraving, engravingLevel]);

  // 총 변화량
  const totalChange = results.reduce((s, r) => s + r.powerChange, 0);
  const totalChangePercent = data.profile.combatPower > 0
    ? (totalChange / data.profile.combatPower) * 100
    : 0;

  // 추천
  const recommendations = useMemo(() => getUpgradeRecommendations(data), [data]);

  return (
    <>
      {/* 탭 */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'simulator' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          업그레이드 시뮬레이터
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'recommendations' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          업그레이드 추천
        </button>
      </div>

      {activeTab === 'simulator' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>업그레이드 시뮬레이터</h3>
            {totalChange !== 0 && (
              <div
                className={`${styles.simulatorResult} ${
                  totalChange > 0 ? styles.resultPositive : styles.resultNegative
                }`}
              >
                합계: {totalChange > 0 ? '+' : ''}{totalChange.toLocaleString()}
                ({totalChangePercent > 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%)
              </div>
            )}
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.simulatorGrid}>
              {/* 무기 품질 */}
              {data.weapon && (
                <div className={styles.simulatorItem}>
                  <div className={styles.simulatorItemTitle}>무기 품질</div>
                  <div className={styles.simulatorCurrentValue}>
                    현재: 품질 {data.weapon.quality}
                  </div>
                  <div className={styles.simulatorControl}>
                    <div className={styles.simulatorLabel}>
                      변경할 품질: {weaponQuality}
                    </div>
                    <input
                      type="range"
                      className={styles.simulatorSlider}
                      min={0}
                      max={100}
                      value={weaponQuality}
                      onChange={(e) => setWeaponQuality(Number(e.target.value))}
                    />
                  </div>
                  {data.weapon && weaponQuality !== data.weapon.quality && (
                    <ResultDisplay result={results.find(r => r.category === '무기 품질')} />
                  )}
                </div>
              )}

              {/* 보석 */}
              {data.gems.length > 0 && (
                <div className={styles.simulatorItem}>
                  <div className={styles.simulatorItemTitle}>보석 업그레이드</div>
                  <div className={styles.simulatorCurrentValue}>
                    보석 {data.gems.length}개 장착 중
                  </div>
                  <div className={styles.simulatorControl}>
                    <div className={styles.simulatorLabel}>보석 종류</div>
                    <select
                      className={styles.simulatorSelect}
                      value={selectedGemType}
                      onChange={(e) => setSelectedGemType(e.target.value)}
                    >
                      <option value="">선택하세요</option>
                      {gemTypes.map(type => (
                        <option key={type} value={type}>
                          {type} ({data.gems.filter(g => g.type === type).length}개)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedGemType && (
                    <div className={styles.simulatorControl}>
                      <div className={styles.simulatorLabel}>
                        목표 레벨: {gemLevel}
                      </div>
                      <input
                        type="range"
                        className={styles.simulatorSlider}
                        min={1}
                        max={10}
                        value={gemLevel}
                        onChange={(e) => setGemLevel(Number(e.target.value))}
                      />
                    </div>
                  )}
                  {selectedGemType && (
                    <ResultDisplay result={results.find(r => r.category === '보석')} />
                  )}
                </div>
              )}

              {/* 각인 */}
              {data.engravings.length > 0 && (
                <div className={styles.simulatorItem}>
                  <div className={styles.simulatorItemTitle}>각인 변경</div>
                  <div className={styles.simulatorCurrentValue}>
                    각인 {data.engravings.length}개 활성화 중
                  </div>
                  <div className={styles.simulatorControl}>
                    <div className={styles.simulatorLabel}>각인 선택</div>
                    <select
                      className={styles.simulatorSelect}
                      value={selectedEngraving}
                      onChange={(e) => setSelectedEngraving(e.target.value)}
                    >
                      <option value="">선택하세요</option>
                      {data.engravings.map(eng => (
                        <option key={eng.name} value={eng.name}>
                          {eng.name} (현재 Lv.{eng.level})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedEngraving && (
                    <div className={styles.simulatorControl}>
                      <div className={styles.simulatorLabel}>
                        목표 레벨: {engravingLevel}
                      </div>
                      <input
                        type="range"
                        className={styles.simulatorSlider}
                        min={1}
                        max={4}
                        value={engravingLevel}
                        onChange={(e) => setEngravingLevel(Number(e.target.value))}
                      />
                    </div>
                  )}
                  {selectedEngraving && (
                    <ResultDisplay result={results.find(r => r.category === '각인')} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>업그레이드 추천 (전투력 증가량 순)</h3>
          </div>
          <div className={styles.sectionBody}>
            {recommendations.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>
                  업그레이드 가능한 항목이 없습니다
                </div>
              </div>
            ) : (
              <div className={styles.recommendationList}>
                {recommendations.map((rec, idx) => (
                  <div key={idx} className={styles.recommendationItem}>
                    <div
                      className={`${styles.recommendationRank} ${
                        idx === 0 ? styles.rank1 :
                        idx === 1 ? styles.rank2 :
                        idx === 2 ? styles.rank3 :
                        styles.rankDefault
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className={styles.recommendationInfo}>
                      <div className={styles.recommendationLabel}>
                        [{rec.category}] {rec.label}
                      </div>
                      <div className={styles.recommendationChange}>
                        {rec.currentValue} → {rec.recommendedValue}
                      </div>
                    </div>
                    <div className={styles.recommendationGain}>
                      <div className={styles.recommendationGainValue}>
                        +{rec.expectedGain.toLocaleString()}
                      </div>
                      <div className={styles.recommendationGainPercent}>
                        +{rec.expectedGainPercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ResultDisplay({ result }: { result?: SimulationResult }) {
  if (!result) return null;

  const isPositive = result.powerChange > 0;
  const isNeutral = result.powerChange === 0;

  return (
    <div
      className={`${styles.simulatorResult} ${
        isNeutral ? styles.resultNeutral :
        isPositive ? styles.resultPositive : styles.resultNegative
      }`}
    >
      {isPositive ? '+' : ''}{result.powerChange.toLocaleString()}
      &nbsp;({isPositive ? '+' : ''}{result.powerChangePercent.toFixed(2)}%)
    </div>
  );
}
