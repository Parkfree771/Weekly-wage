'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col } from 'react-bootstrap';
import styles from './extreme.module.css';

// ─── 일정 데이터 ───
const EVENT_START = new Date(2026, 3, 22, 10, 0, 0); // 2026-04-22 수요일 오전 10시 (KST)
const TOTAL_WEEKS = 8;
const ACT1_WEEKS = 4;

// ─── 난이도별 보상 ───
type Difficulty = {
  name: string;
  level: number;
  gold: number;
  token: number;
  gates: number;
};

const DIFFICULTIES: Difficulty[] = [
  { name: '나이트메어', level: 1770, gold: 45000, token: 200, gates: 1 },
  { name: '하드', level: 1750, gold: 45000, token: 200, gates: 1 },
  { name: '노말', level: 1720, gold: 20000, token: 150, gates: 1 },
];

// ─── 주간 일정 ───
type WeekInfo = {
  week: number;
  act: 1 | 2;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isPast: boolean;
};

function buildSchedule(kstNow: Date): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const startDate = new Date(EVENT_START);
    startDate.setDate(startDate.getDate() + w * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59);
    weeks.push({
      week: w + 1,
      act: w < ACT1_WEEKS ? 1 : 2,
      startDate,
      endDate,
      isCurrent: kstNow >= startDate && kstNow <= endDate,
      isPast: kstNow > endDate,
    });
  }
  return weeks;
}

function formatFullDate(d: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function ExtremePage() {
  const [now, setNow] = useState<Date>(new Date());

  // 난이도
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  // 타이머
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const kstNow = now;
  const schedule = useMemo(() => buildSchedule(kstNow), [now]);

  const eventEnd = new Date(EVENT_START);
  eventEnd.setDate(eventEnd.getDate() + TOTAL_WEEKS * 7 - 1);
  eventEnd.setHours(23, 59, 59);

  const isBeforeEvent = kstNow < EVENT_START;
  const isAfterEvent = kstNow > eventEnd;
  const isOngoing = !isBeforeEvent && !isAfterEvent;

  const diffMs = isBeforeEvent
    ? EVENT_START.getTime() - kstNow.getTime()
    : isOngoing
      ? eventEnd.getTime() - kstNow.getTime()
      : 0;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const currentWeek = schedule.find(w => w.isCurrent);
  const elapsedWeeks = schedule.filter(w => w.isPast).length + (currentWeek ? 1 : 0);
  const progressPercent = isAfterEvent ? 100 : isBeforeEvent ? 0 : Math.round((elapsedWeeks / TOTAL_WEEKS) * 100);

  const selectedDiff = DIFFICULTIES.find(d => d.name === selectedDifficulty);

  // 보상 표 렌더링 (데스크톱 하단 + 모바일 카드별 인라인 양쪽에서 공통 사용)
  const renderRewardTables = (diff: Difficulty) => (
    <>
      <div className={styles.fcTableWrap}>
        <div className={styles.fcTableHeader}>최초 클리어 보상 · {diff.name}</div>
        <div className={`${styles.fcGrid} ${diff.name === '나이트메어' ? styles.fcGrid6 : styles.fcGrid4}`}>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>도약의 전설 카드 선택 팩 Ⅲ</span>
              <div className={styles.fcCellRow}>
                <Image src="/legendary-cardpack.webp" alt="전설 카드팩" width={40} height={40} />
                <span className={styles.fcCellValue}>x1</span>
              </div>
            </div>
          </div>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>영웅 젬 선택 상자</span>
              <div className={styles.fcCellRow}>
                <Image src="/gem-hero.webp" alt="영웅 젬 선택 상자" width={40} height={40} />
                <span className={styles.fcCellValue}>x1</span>
              </div>
            </div>
          </div>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>젬 가공 초기화권</span>
              <div className={styles.fcCellRow}>
                <Image src="/gem-reset-ticket.webp" alt="젬 가공 초기화권" width={40} height={40} />
                <span className={styles.fcCellValue}>x1</span>
              </div>
            </div>
          </div>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>불과 얼음의 주화</span>
              <div className={styles.fcCellRow}>
                <Image src="/xhzms.webp" alt="불과 얼음의 주화" width={40} height={40} />
                <span className={styles.fcCellValue}>x100</span>
              </div>
            </div>
          </div>
          {diff.name === '나이트메어' && (
            <>
              <div className={styles.fcGridCell}>
                <div className={styles.fcCell}>
                  <span className={styles.fcCellLabel}>전설 칭호</span>
                  <div className={styles.fcCellRow}>
                    <Image src="/extreme-fire.webp" alt="홍염의 군주" width={40} height={40} className={styles.titleIconFire} />
                    <span className={`${styles.fcCellValue} ${styles.titleMatchFire}`}>홍염의 군주</span>
                  </div>
                </div>
              </div>
              <div className={styles.fcGridCell}>
                <div className={styles.fcCell}>
                  <span className={styles.fcCellLabel}>전설 칭호</span>
                  <div className={styles.fcCellRow}>
                    <Image src="/extreme-ice.webp" alt="혹한의 군주" width={40} height={40} />
                    <span className={`${styles.fcCellValue} ${styles.titleMatchIce}`}>혹한의 군주</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.fcTableWrap}>
        <div className={styles.fcTableHeader}>기본 클리어 보상 · {diff.name}</div>
        <div className={`${styles.fcGrid} ${styles.fcGrid2}`}>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>클리어 골드</span>
              <div className={styles.fcCellRow}>
                <Image src="/gold.webp" alt="골드" width={28} height={28} />
                <span className={styles.fcCellValue}>{diff.gold.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>불과 얼음의 주화</span>
              <div className={styles.fcCellRow}>
                <Image src="/xhzms.webp" alt="불과 얼음의 주화" width={36} height={36} />
                <span className={styles.fcCellValue}>x{diff.token}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>

            {/* 타이틀 */}
            <div className="text-center mb-3">
              <h1 className={styles.pageTitle}>익스트림 <span className={styles.newBadge}>NEW</span></h1>
              <p className={styles.pageSubtitle}>
                {formatFullDate(EVENT_START)} ~ {formatFullDate(eventEnd)} | 총 {TOTAL_WEEKS}주
              </p>
            </div>

            {/* D-Day 카운트다운 */}
            <div className={styles.countdownCard}>
              <div className={styles.countdownLabel}>
                {isBeforeEvent ? '오픈까지' : isOngoing ? '종료까지' : '이벤트 종료'}
              </div>
              {!isAfterEvent ? (
                <div className={styles.countdownTimer}>
                  <div className={styles.timerUnit}>
                    <span className={styles.timerNumber}>{diffDays}</span>
                    <span className={styles.timerLabel}>일</span>
                  </div>
                  <span className={styles.timerSeparator}>:</span>
                  <div className={styles.timerUnit}>
                    <span className={styles.timerNumber}>{String(diffHours).padStart(2, '0')}</span>
                    <span className={styles.timerLabel}>시간</span>
                  </div>
                  <span className={styles.timerSeparator}>:</span>
                  <div className={styles.timerUnit}>
                    <span className={styles.timerNumber}>{String(diffMinutes).padStart(2, '0')}</span>
                    <span className={styles.timerLabel}>분</span>
                  </div>
                  <span className={styles.timerSeparator}>:</span>
                  <div className={styles.timerUnit}>
                    <span className={styles.timerNumber}>{String(diffSeconds).padStart(2, '0')}</span>
                    <span className={styles.timerLabel}>초</span>
                  </div>
                </div>
              ) : (
                <div className={styles.countdownEnded}>모든 일정이 종료되었습니다</div>
              )}
              {isOngoing && (
                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className={styles.progressText}>
                    {currentWeek && <span>{currentWeek.act}막 {currentWeek.week <= ACT1_WEEKS ? currentWeek.week : currentWeek.week - ACT1_WEEKS}주차 진행 중</span>}
                    <span>{progressPercent}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* 칭호 통계 페이지 안내 */}
            <Link href="/title-stats" className={styles.titleStatsLink}>
              <div className={styles.titleStatsLinkInner}>
                <Image src="/extreme-fire.webp" alt="홍염의 군주" width={40} height={40} className={styles.titleIconFire} />
                <div className={styles.titleStatsLinkText}>
                  <strong>홍염의 군주 · 칭호 전투력 통계</strong>
                  <span>클리어 전투력 · 직업별 평균 · 히스토리 차트</span>
                </div>
                <span className={styles.titleStatsLinkArrow}>→</span>
              </div>
            </Link>

            {/* ═══════════════════════════════════════════
                섹션: 난이도별 보상
                ═══════════════════════════════════════════ */}
            <div className={styles.diffSection}>
              <h2 className={styles.sectionTitle}>난이도별 보상</h2>
              <div className={styles.diffGrid}>
                {DIFFICULTIES.map((diff) => {
                  const colorClass = diff.name === '나이트메어' ? styles.diffNightmare
                    : diff.name === '하드' ? styles.diffHard
                    : styles.diffNormal;
                  const isActive = selectedDifficulty === diff.name;
                  return (
                    <div key={diff.name} className={styles.diffGroup}>
                      <button
                        type="button"
                        className={`${styles.diffCard} ${isActive ? styles.diffCardActive : ''}`}
                        onClick={() => setSelectedDifficulty(isActive ? null : diff.name)}
                        aria-pressed={isActive}
                      >
                        <Image
                          src="/dlrtmxmfla.webp"
                          alt={diff.name}
                          width={300}
                          height={225}
                          className={styles.diffImage}
                        />
                        <div className={styles.diffOverlay} />
                        <div className={`${styles.diffContent} ${colorClass}`}>
                          <div className={styles.diffNameRow}>
                            <span className={styles.diffName}>{diff.name}</span>
                            <span className={styles.diffLevel}>Lv. {diff.level}</span>
                          </div>
                          <div className={styles.diffGold}>{diff.gold.toLocaleString()}G</div>
                          <div className={styles.diffToken}>토큰 {diff.token}개</div>
                        </div>
                      </button>
                      {/* 모바일: 각 카드 바로 밑에 표 인라인 표시 */}
                      {isActive && (
                        <div className={styles.diffTablesInline}>
                          {renderRewardTables(diff)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 데스크톱: 카드 그리드 아래에 통합 표 1회 표시 */}
              {selectedDiff && (
                <div className={styles.diffTablesBottom}>
                  {renderRewardTables(selectedDiff)}
                </div>
              )}
            </div>

          </Col>
        </Row>
      </Container>
    </div>
  );
}
