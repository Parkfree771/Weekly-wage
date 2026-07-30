'use client';

import { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import styles from './belgardin.module.css';
import {
  CONQUEST_SECTIONS,
  NIGHTMARE_HONOR_REWARD,
  ALL_MISSIONS,
  CONQUEST_STORAGE_KEY,
  CONQUEST_WEEKS,
  type ConquestMission,
  type ConquestReward,
} from './conquest-data';

const rewardLabel = (rewards: ConquestReward[] | null) => {
  if (!rewards || rewards.length === 0) return null;
  return rewards.map((r) => `${r.name}${r.amount > 1 ? ` x${r.amount}` : ''}`).join(' · ');
};

export default function ConquestPanel() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONQUEST_STORAGE_KEY);
      if (raw) setChecks(JSON.parse(raw));
    } catch {
      /* 저장값이 깨졌으면 빈 상태로 시작 */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CONQUEST_STORAGE_KEY, JSON.stringify(checks));
    } catch {
      /* 용량 초과 등은 무시 */
    }
  }, [checks, hydrated]);

  const toggle = (id: string) => setChecks((prev) => ({ ...prev, [id]: !prev[id] }));

  const doneCount = ALL_MISSIONS.filter((m) => checks[m.id]).length;
  const totalCount = ALL_MISSIONS.length;
  const donePercent = Math.round((doneCount / totalCount) * 100);

  const renderMission = (mission: ConquestMission) => {
    const done = !!checks[mission.id];
    const reward = rewardLabel(mission.rewards);
    return (
      <div key={mission.id} className={`${styles.cqMission} ${done ? styles.cqMissionDone : ''}`}>
        <div className={styles.cqRow} onClick={() => toggle(mission.id)}>
          <div className={`${styles.cqCheckbox} ${done ? styles.cqCheckboxOn : ''}`}>✓</div>
          <span className={styles.cqName}>{mission.name}</span>
          {mission.tag && <span className={styles.cqTag}>{mission.tag}</span>}
          <span className={reward ? styles.cqReward : styles.cqRewardPending}>
            {reward || '보상 미정'}
          </span>
        </div>
        {/* 상세는 호버로만 뜨는 팝오버. 호버가 없는 기기에서는 상자 안에 그대로 펼쳐진다(CSS) */}
        {mission.detail && (
          <div className={styles.cqDetail}>
            {mission.detail.map((line, i) => (
              <div key={i} className={line.startsWith('※') ? styles.cqDetailNote : undefined}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
      <Card className={styles.shopCard}>
        <Card.Header className={styles.shopCardHeader}>
          <h3 className={styles.shopCardTitle}>
            정복전
            <span className={styles.cqPeriodBadge}>{CONQUEST_WEEKS}주 이벤트</span>
          </h3>
        </Card.Header>
        <Card.Body className={styles.cqBody}>
          {/* 전체 진행도 */}
          <div className={styles.cqProgressBar}>
            <div className={styles.cqProgressFill} style={{ width: `${donePercent}%` }} />
            <span className={styles.cqProgressText}>
              <strong>{doneCount}</strong> / {totalCount} 미션 달성
            </span>
          </div>

          {CONQUEST_SECTIONS.map((section) => {
            const sectionDone = section.missions.filter((m) => checks[m.id]).length;
            return (
              <div
                key={section.key}
                className={`${styles.cqSection} ${
                  section.key === 'nightmare' ? styles.cqSectionNightmare : ''
                }`}
              >
                <div className={styles.cqSectionHead}>
                  <span className={styles.cqSectionTitle}>{section.title}</span>
                  <span className={styles.cqSectionCount}>
                    {sectionDone}/{section.missions.length}
                  </span>
                  {section.key === 'nightmare' && (
                    <span className={styles.cqHonorBadge}>
                      명예 보상 · {NIGHTMARE_HONOR_REWARD.grades.join(' · ')} 칭호
                      {NIGHTMARE_HONOR_REWARD.titleName
                        ? ` ${NIGHTMARE_HONOR_REWARD.titleName}`
                        : ''}
                    </span>
                  )}
                  {section.note && <span className={styles.cqSectionNote}>{section.note}</span>}
                </div>
                <div
                  className={`${styles.cqGrid} ${section.missions.length === 1 ? styles.cqGridSingle : ''}`}
                >
                  {section.missions.map(renderMission)}
                </div>
              </div>
            );
          })}

          <div className={styles.cqFootNote}>
            보상은 캐릭터 성장 관련 재료로 예고되었으나 종류·수량은 미공개입니다. 정복전 이벤트
            페이지가 공개되는 대로 반영됩니다.
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
