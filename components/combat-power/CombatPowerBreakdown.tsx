'use client';

import type { PowerBreakdown, PowerBreakdownItem } from '@/lib/combatPowerSimulator';
import styles from '@/app/combat-power/combat-power.module.css';

type Props = {
  breakdown: PowerBreakdown;
};

const CATEGORY_BAR_CLASS: Record<string, string> = {
  '무기 품질': styles.barWeapon,
  '각인': styles.barEngraving,
  '보석': styles.barGem,
  '카드': styles.barCard,
  '아크 패시브': styles.barArkPassive,
  '전투 스탯': styles.barStat,
  '팔찌': styles.barBracelet,
  '장신구 연마': styles.barAccessory,
};

export default function CombatPowerBreakdown({ breakdown }: Props) {
  const maxContribution = Math.max(...breakdown.items.map(i => i.contribution), 1);

  // 카테고리별 그룹핑
  const categories = new Map<string, PowerBreakdownItem[]>();
  for (const item of breakdown.items) {
    if (!categories.has(item.category)) {
      categories.set(item.category, []);
    }
    categories.get(item.category)!.push(item);
  }

  // 카테고리별 합산
  const categorySummary = Array.from(categories.entries()).map(([category, items]) => ({
    category,
    totalContribution: items.reduce((s, i) => s + i.contribution, 0),
    totalPower: items.reduce((s, i) => s + i.estimatedPower, 0),
    items,
  })).sort((a, b) => b.totalContribution - a.totalContribution);

  const maxCategoryContrib = Math.max(...categorySummary.map(c => c.totalContribution), 1);

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>전투력 요소별 기여도</h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          총 전투력: {breakdown.totalPower.toLocaleString()}
        </span>
      </div>
      <div className={styles.sectionBody}>
        {/* 카테고리별 요약 */}
        <div className={styles.breakdownList}>
          {categorySummary.map((cat) => (
            <div key={cat.category}>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>{cat.category}</div>
                <div className={styles.breakdownBarContainer}>
                  <div
                    className={`${styles.breakdownBar} ${CATEGORY_BAR_CLASS[cat.category] || styles.barStat}`}
                    style={{
                      width: `${Math.max(2, (cat.totalContribution / maxCategoryContrib) * 100)}%`,
                    }}
                  >
                    <span className={styles.breakdownBarText}>
                      {cat.totalContribution.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className={styles.breakdownValue}>
                  +{cat.totalPower.toLocaleString()}
                </div>
              </div>
              {/* 개별 항목 (접기 가능) */}
              {cat.items.length > 1 && (
                <div style={{ paddingLeft: '130px', marginTop: '0.25rem' }}>
                  {cat.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        padding: '0.15rem 0',
                      }}
                    >
                      <span style={{ minWidth: '80px', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.currentValue}</span>
                      <span style={{ marginLeft: 'auto' }}>
                        {item.contribution.toFixed(2)}% (+{item.estimatedPower.toLocaleString()})
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {cat.items.length === 1 && (
                <div style={{ paddingLeft: '130px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {cat.items[0].currentValue}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
