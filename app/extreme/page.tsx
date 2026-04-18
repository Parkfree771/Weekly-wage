'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Form, Table } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Line, ComposedChart, ReferenceLine,
} from 'recharts';
import styles from './extreme.module.css';
import {
  saveExtremeClear, getChartData, getSummary, getClassStats, getRole,
  type DailyChartData, type ExtremeSummary, type ClassStat,
} from '@/lib/extreme-service';

// ���── 일정 데이터 ───
const EVENT_START = new Date(2026, 3, 22, 10, 0, 0); // 2026-04-22 수요일 오전 10시 (KST)
const TOTAL_WEEKS = 8;
const ACT1_WEEKS = 4;

// ─── 칭호 ───
const TITLES = [
  { act: 1, name: '홍염의 군주', image: '/extreme-fire.webp' },
  { act: 2, name: '혹한의 군주', image: '/extreme-ice.webp' },
];

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

// ─── 예시 차트 데이터 (실제 데이터 없을 때 표시) ───
const EXAMPLE_CHART_DATA: DailyChartData[] = (() => {
  const days = 28;
  const out: DailyChartData[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(EVENT_START);
    date.setDate(date.getDate() + i);
    const t = days > 1 ? i / (days - 1) : 0;
    const decay = Math.exp(-2.8 * t); // 1 → ~0.06
    const noisePower = Math.sin(i * 1.7) * 130 + Math.sin(i * 0.55) * 80;
    const noiseLv = Math.sin(i * 1.3) * 0.45 + Math.sin(i * 0.4) * 0.25;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    out.push({
      date: dateStr,
      dealerPower: Math.round(5500 + (7500 - 5500) * decay + noisePower),
      supporterPower: Math.round(4300 + (6000 - 4300) * decay + noisePower * 0.7),
      dealerLevel: Math.round((1770 + (1800 - 1770) * decay + noiseLv) * 100) / 100,
      supporterLevel: Math.round((1770 + (1800 - 1770) * decay + noiseLv * 0.85) * 100) / 100,
      dealerCount: 0,
      supporterCount: 0,
    });
  }
  return out;
})();

const EXAMPLE_SUMMARY: ExtremeSummary = {
  totalClears: 127,
  dealerCount: 85,
  supporterCount: 42,
  dealerAvgPower: Math.round(EXAMPLE_CHART_DATA.reduce((s, d) => s + (d.dealerPower || 0), 0) / EXAMPLE_CHART_DATA.length),
  supporterAvgPower: Math.round(EXAMPLE_CHART_DATA.reduce((s, d) => s + (d.supporterPower || 0), 0) / EXAMPLE_CHART_DATA.length),
};

// ─── 예시 직업별 통계 ───
const EXAMPLE_CLASS_STATS: ClassStat[] = [
  { className: '바드', role: 'supporter', count: 18, avgPower: 4920, avgLevel: 1784.5 },
  { className: '버서커', role: 'dealer', count: 15, avgPower: 6480, avgLevel: 1783.2 },
  { className: '도화가', role: 'supporter', count: 14, avgPower: 4780, avgLevel: 1782.8 },
  { className: '소서리스', role: 'dealer', count: 13, avgPower: 6210, avgLevel: 1781.6 },
  { className: '데빌헌터', role: 'dealer', count: 11, avgPower: 6050, avgLevel: 1779.3 },
  { className: '홀리나이트', role: 'supporter', count: 10, avgPower: 4560, avgLevel: 1778.9 },
  { className: '리퍼', role: 'dealer', count: 10, avgPower: 5940, avgLevel: 1777.5 },
  { className: '아르카나', role: 'dealer', count: 9, avgPower: 5820, avgLevel: 1776.4 },
  { className: '블레이드', role: 'dealer', count: 8, avgPower: 5750, avgLevel: 1775.2 },
  { className: '건슬링어', role: 'dealer', count: 7, avgPower: 5640, avgLevel: 1774.8 },
  { className: '워로드', role: 'dealer', count: 6, avgPower: 5520, avgLevel: 1773.5 },
  { className: '기공사', role: 'dealer', count: 3, avgPower: 5410, avgLevel: 1772.1 },
  { className: '창술사', role: 'dealer', count: 3, avgPower: 5380, avgLevel: 1771.4 },
];

// ─── 주간 일정 ─���─
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

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatFullDate(d: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ─── 칭호 텍스트 파싱 (API에서 <img> 태그 포함해서 옴) ───
function parseTitleText(raw: string): string {
  if (!raw) return '';
  return raw.replace(/<img[^>]*>(.*?)<\/img>/gi, '').replace(/<[^>]+>/g, '').trim();
}

// ─── 현재 진행 중인 막 판별 ───
function getCurrentAct(kstNow: Date): 1 | 2 {
  const act2Start = new Date(EVENT_START);
  act2Start.setDate(act2Start.getDate() + ACT1_WEEKS * 7);
  return kstNow >= act2Start ? 2 : 1;
}

// ─── 캐릭터 프로필 타입 ───
type CharProfile = {
  name: string;
  className: string;
  itemLevel: string;
  combatPower: string;
  image: string;
  title: string;
  role: 'dealer' | 'supporter';
};

export default function ExtremePage() {
  const [now, setNow] = useState<Date>(new Date());

  // 캐릭터 검색
  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState<CharProfile | null>(null);
  const [searchError, setSearchError] = useState('');

  // 저장
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 현재 막
  const currentAct = getCurrentAct(new Date(Date.now() + 9 * 60 * 60 * 1000));
  const currentTitle = TITLES.find(t => t.act === currentAct)!;

  // 차트 데이터
  const [chartTitle, setChartTitle] = useState<string>(currentTitle.name);
  const [chartData, setChartData] = useState<DailyChartData[]>([]);
  const [summary, setSummary] = useState<ExtremeSummary | null>(null);
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  // 차트 모드 (전투력 / 레벨)
  const [chartMode, setChartMode] = useState<'power' | 'level'>('power');

  // 난이도
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  // 타이머
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 차트 데이터 로드
  const loadChartData = useCallback(async () => {
    setChartLoading(true);
    const [data, sum, classes] = await Promise.all([
      getChartData(chartTitle),
      getSummary(chartTitle),
      getClassStats(chartTitle),
    ]);
    setChartData(data);
    setSummary(sum);
    setClassStats(classes);
    setChartLoading(false);
  }, [chartTitle]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const kstNow = now; // EVENT_START가 로컬 시간 기준이므로 보정 불필요
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
  const act1Weeks = schedule.filter(w => w.act === 1);
  const act2Weeks = schedule.filter(w => w.act === 2);
  const elapsedWeeks = schedule.filter(w => w.isPast).length + (currentWeek ? 1 : 0);
  const progressPercent = isAfterEvent ? 100 : isBeforeEvent ? 0 : Math.round((elapsedWeeks / TOTAL_WEEKS) * 100);

  const selectedDiff = DIFFICULTIES.find(d => d.name === selectedDifficulty);

  // 현재 진행 중인 칭호 확인
  const hasMatchingTitle = profile && TITLES.some(t => t.name === profile.title);
  const matchedTitle = profile ? TITLES.find(t => t.name === profile.title) : null;

  // ─── 캐릭터 검색 ───
  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    setSearchError('');
    setProfile(null);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/lostark?characterName=${encodeURIComponent(searchName.trim())}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSearchError(err.message || '캐릭터를 찾을 수 없습니다.');
        return;
      }
      const data = await res.json();
      const p = data.profile;
      if (!p) {
        setSearchError('프로필 정보를 찾을 수 없습니다.');
        return;
      }

      setProfile({
        name: p.CharacterName || searchName,
        className: p.CharacterClassName || '',
        itemLevel: p.ItemAvgLevel || '0',
        combatPower: p.CombatPower || '',
        image: p.CharacterImage || '',
        title: parseTitleText(p.Title || ''),
        role: getRole(p.CharacterClassName || ''),
      });
    } catch {
      setSearchError('검색 중 오류가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  };

  // ─── 저장 ───
  const handleSave = async () => {
    if (!profile || !matchedTitle) return;
    const power = parseFloat(profile.combatPower.replace(/,/g, ''));
    if (isNaN(power) || power <= 0) {
      setSaveMessage({ type: 'error', text: '전투력 정보를 가져올 수 없습니다.' });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    const today = new Date();
    const kstToday = new Date(today.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = `${kstToday.getFullYear()}-${String(kstToday.getMonth() + 1).padStart(2, '0')}-${String(kstToday.getDate()).padStart(2, '0')}`;

    const result = await saveExtremeClear({
      character_name: profile.name,
      character_class: profile.className,
      role: profile.role,
      item_level: parseFloat(profile.itemLevel.replace(/,/g, '')),
      combat_power: power,
      title: matchedTitle.name,
      cleared_at: dateStr,
    });

    if (result.success) {
      setSaveMessage({ type: 'success', text: '등록 완료! 통계에 반영됩니다.' });
      loadChartData();
    } else {
      setSaveMessage({ type: 'error', text: result.error || '저장에 실패했습니다.' });
    }
    setSaving(false);
  };

  // 차트 날짜 포맷
  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

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

            <div className={styles.contentOrder}>

            {/* ═══════════════════════════════════════════
                섹션 1: 난이도별 보상
                ═══════════════════════════════════════════ */}
            <div className={`${styles.diffSection} ${styles.orderReward}`}>
              <h2 className={styles.sectionTitle}>난이도별 보상</h2>
              <div className={styles.diffGrid}>
                {DIFFICULTIES.map((diff) => {
                  const colorClass = diff.name === '나이트메어' ? styles.diffNightmare
                    : diff.name === '하드' ? styles.diffHard
                    : styles.diffNormal;
                  const isActive = selectedDifficulty === diff.name;
                  return (
                    <button
                      type="button"
                      key={diff.name}
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
                  );
                })}
              </div>

              {/* 난이도 카드 클릭 시 보상 표 2종 (최초 / 기본) 표시 */}
              {selectedDiff && (
                <>
                  {/* 최초 클리어 보상 — 1회성 (카드팩/젬/주화/칭호) */}
                  <div className={styles.fcTableWrap}>
                    <Table className={styles.fcTable}>
                      <thead>
                        <tr>
                          <th colSpan={selectedDiff.name === '나이트메어' ? 6 : 4}>
                            최초 클리어 보상 · {selectedDiff.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <div className={styles.fcCell}>
                              <span className={styles.fcCellLabel}>도약의 전설 카드 선택 팩 Ⅲ</span>
                              <div className={styles.fcCellRow}>
                                <Image src="/legendary-cardpack.webp" alt="전설 카드팩" width={40} height={40} />
                                <span className={styles.fcCellValue}>x1</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.fcCell}>
                              <span className={styles.fcCellLabel}>영웅 젬 선택 상자</span>
                              <div className={styles.fcCellRow}>
                                <Image src="/gem-hero.webp" alt="영웅 젬 선택 상자" width={40} height={40} />
                                <span className={styles.fcCellValue}>x1</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.fcCell}>
                              <span className={styles.fcCellLabel}>젬 가공 초기화권</span>
                              <div className={styles.fcCellRow}>
                                <Image src="/gem-reset-ticket.webp" alt="젬 가공 초기화권" width={40} height={40} />
                                <span className={styles.fcCellValue}>x1</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.fcCell}>
                              <span className={styles.fcCellLabel}>불과 얼음의 주화</span>
                              <div className={styles.fcCellRow}>
                                <Image src="/xhzms.webp" alt="불과 얼음의 주화" width={40} height={40} />
                                <span className={styles.fcCellValue}>x100</span>
                              </div>
                            </div>
                          </td>
                          {selectedDiff.name === '나이트메어' && (
                            <>
                              <td>
                                <div className={styles.fcCell}>
                                  <span className={styles.fcCellLabel}>전설 칭호</span>
                                  <div className={styles.fcCellRow}>
                                    <Image src="/extreme-fire.webp" alt="홍염의 군주" width={40} height={40} className={styles.titleIconFire} />
                                    <span className={`${styles.fcCellValue} ${styles.titleMatchFire}`}>홍염의 군주</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className={styles.fcCell}>
                                  <span className={styles.fcCellLabel}>전설 칭호</span>
                                  <div className={styles.fcCellRow}>
                                    <Image src="/extreme-ice.webp" alt="혹한의 군주" width={40} height={40} />
                                    <span className={`${styles.fcCellValue} ${styles.titleMatchIce}`}>혹한의 군주</span>
                                  </div>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      </tbody>
                    </Table>
                  </div>

                  {/* 기본 클리어 보상 — 매주 반복 (골드/토큰) */}
                  <div className={styles.fcTableWrap}>
                    <Table className={styles.fcTable}>
                      <thead>
                        <tr>
                          <th colSpan={2}>기본 클리어 보상 · {selectedDiff.name}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <div className={styles.fcCell}>
                              <span className={styles.fcCellLabel}>클리어 골드</span>
                              <div className={styles.fcCellRow}>
                                <Image src="/gold.webp" alt="골드" width={36} height={36} />
                                <span className={styles.fcCellValue}>{selectedDiff.gold.toLocaleString()}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.fcCell}>
                              <span className={styles.fcCellLabel}>불과 얼음의 주화</span>
                              <div className={styles.fcCellRow}>
                                <Image src="/xhzms.webp" alt="불과 얼음의 주화" width={36} height={36} />
                                <span className={styles.fcCellValue}>x{selectedDiff.token}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </div>

            {/* ═══════════════════════════════════════════
                섹션 2: 칭호 전투력 측정
                ═══════════════════════════════════════════ */}
            <div className={`${styles.titleSection} ${styles.orderSearch}`}>
              <div className={styles.searchHeader}>
                <Image src={currentTitle.image} alt={currentTitle.name} width={46} height={46} className={`${styles.titleIconInline} ${currentAct === 1 ? styles.titleIconFire : ''}`} />
                <span className={`${styles.searchTitleName} ${currentAct === 1 ? styles.titleNameFire : styles.titleNameIce}`}>
                  {currentTitle.name}
                </span>
              </div>
              <div className={styles.searchInputGroup}>
                <Form.Control
                  type="text"
                  placeholder="캐릭터명"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className={styles.searchInput}
                  disabled={searching}
                />
                <button className={styles.searchButton} onClick={handleSearch} disabled={searching || !searchName.trim()}>
                  {searching ? '...' : '검색'}
                </button>
              </div>
              {searchError && <div className={styles.errorText}>{searchError}</div>}

              <div className={styles.saveHint}>
                칭호 갱신 안될 시 영지 → 영지 밖 이동 후 재검색
              </div>

              {profile && (
                <div className={styles.profileCard}>
                  <div className={styles.profileTop}>
                    {profile.image && (
                      <div className={styles.profileImageWrap}>
                        <Image src={profile.image} alt={profile.name} width={200} height={300} className={styles.profileImage} />
                      </div>
                    )}
                    <div className={styles.profileInfo}>
                      <div className={styles.profileName}>{profile.name}</div>
                      <div className={styles.profileRow}>
                        <span className={styles.profileLabel}>레벨</span>
                        <span className={styles.profileValue}>Lv. {profile.itemLevel}</span>
                      </div>
                      <div className={styles.profileRow}>
                        <span className={styles.profileLabel}>전투력</span>
                        <span className={styles.profileValue}>{profile.combatPower || '-'}</span>
                      </div>
                      <div className={styles.profileRow}>
                        <span className={styles.profileLabel}>직업</span>
                        <span className={styles.profileValue}>{profile.className}</span>
                        <span className={`${styles.profileRole} ${profile.role === 'supporter' ? styles.roleSupporter : styles.roleDealer}`}>
                          {profile.role === 'supporter' ? '서포터' : '딜러'}
                        </span>
                      </div>
                      <div className={styles.profileRow}>
                        <span className={styles.profileLabel}>착용 칭호</span>
                        {hasMatchingTitle && matchedTitle && (
                          <Image src={matchedTitle.image} alt={matchedTitle.name} width={24} height={24} className={`${styles.titleIconInline} ${matchedTitle.act === 1 ? styles.titleIconFire : ''}`} />
                        )}
                        <span className={`${hasMatchingTitle ? (matchedTitle?.act === 1 ? styles.titleMatchFire : styles.titleMatchIce) : styles.titleNoMatch}`}>
                          {profile.title || '미착용'}
                        </span>
                      </div>
                      {hasMatchingTitle ? (
                        <>
                          <button className={styles.saveButtonFull} onClick={handleSave} disabled={saving}>
                            {saving ? '저장 중...' : '통계에 등록하기'}
                          </button>
                          {saveMessage && (
                            <div className={`${styles.saveMessage} ${saveMessage.type === 'success' ? styles.saveSuccess : styles.saveError}`}>
                              {saveMessage.text}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={styles.noTitleMessage}>
                          {currentTitle.name} 칭호를 착용한 상태에서 검색해주세요.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════
                섹션 3: 클리어 통계 차트
                ═══════════════════════════════════════════ */}
            <div className={`${styles.chartSection} ${styles.orderChart}`}>
              <div className={styles.demoBanner}>
                <span className={styles.demoBannerBadge}>예시용</span>
                <span>현재 표시되는 통계는 예시 데이터입니다</span>
              </div>
              <div className={styles.chartHeader}>
                <h2 className={styles.sectionTitle}>
                  클리어 통계
                  <span className={styles.demoInlineBadge}>예시용</span>
                </h2>
                <div className={styles.chartToggles}>
                  <div className={styles.chartModeToggle}>
                    <button className={`${styles.chartModeBtn} ${chartMode === 'power' ? styles.chartModeActive : ''}`} onClick={() => setChartMode('power')}>전투력</button>
                    <button className={`${styles.chartModeBtn} ${chartMode === 'level' ? styles.chartModeActive : ''}`} onClick={() => setChartMode('level')}>레벨</button>
                  </div>
                  <div className={styles.chartTitleToggle}>
                    {TITLES.map((t) => (
                      <button key={t.name} className={`${styles.chartTitleBtn} ${chartTitle === t.name ? styles.chartTitleActive : ''}`} onClick={() => setChartTitle(t.name)}>{t.name}</button>
                    ))}
                  </div>
                </div>
              </div>
              {(() => {
                const isExample = !chartLoading && chartData.length === 0;
                const displaySummary = isExample ? EXAMPLE_SUMMARY : summary;
                const displayData = isExample ? EXAMPLE_CHART_DATA : chartData;
                const displayClassStats = isExample ? EXAMPLE_CLASS_STATS : classStats;
                const dealerKey = chartMode === 'power' ? 'dealerPower' : 'dealerLevel';
                const supporterKey = chartMode === 'power' ? 'supporterPower' : 'supporterLevel';
                const suffix = chartMode === 'power' ? '점' : '';
                const dealerAvg = displaySummary?.dealerAvgPower ?? null;
                const supporterAvg = displaySummary?.supporterAvgPower ?? null;

                // 차트 내 평균선용 값 (chartMode 기준으로 displayData에서 직접 계산)
                const dealerVals = displayData.map(d => d[dealerKey]).filter((v): v is number => v != null);
                const supporterVals = displayData.map(d => d[supporterKey]).filter((v): v is number => v != null);
                const dealerLineAvg = dealerVals.length > 0 ? dealerVals.reduce((a, b) => a + b, 0) / dealerVals.length : null;
                const supporterLineAvg = supporterVals.length > 0 ? supporterVals.reduce((a, b) => a + b, 0) / supporterVals.length : null;

                return (
                  <>
                    {displaySummary && displaySummary.totalClears > 0 && (
                      <div className={`${styles.summaryRow} ${isExample ? styles.summaryExample : ''}`}>
                        <div className={`${styles.summaryItem} ${styles.summaryTotal}`}>
                          <span className={styles.summaryLabel}>총 클리어</span>
                          <span className={styles.summaryValue}>{displaySummary.totalClears.toLocaleString()}<span className={styles.summaryUnit}>명</span></span>
                        </div>
                        <div className={`${styles.summaryItem} ${styles.summaryDealer}`}>
                          <span className={`${styles.summaryLabel} ${styles.dealerColor}`}>
                            <span className={styles.summaryDot} style={{ background: '#dc3545' }} />
                            딜러 평균 전투력
                          </span>
                          <span className={styles.summaryValue}>{dealerAvg ? dealerAvg.toLocaleString() : '-'}<span className={styles.summaryUnit}>점</span></span>
                        </div>
                        <div className={`${styles.summaryItem} ${styles.summarySupporter}`}>
                          <span className={`${styles.summaryLabel} ${styles.supporterColor}`}>
                            <span className={styles.summaryDot} style={{ background: '#3b82f6' }} />
                            서포터 평균 전투력
                          </span>
                          <span className={styles.summaryValue}>{supporterAvg ? supporterAvg.toLocaleString() : '-'}<span className={styles.summaryUnit}>점</span></span>
                        </div>
                      </div>
                    )}

                    <div className={styles.chartContainer}>
                      {chartLoading ? (
                        <div className={styles.chartPlaceholder}>데이터 로딩 중...</div>
                      ) : (
                        <>
                          {isExample && (
                            <div className={styles.chartExampleNote}>
                              <span className={styles.chartExampleBadge}>예시</span>
                              <span>아직 등록된 데이터가 없습니다 · 데이터가 쌓이면 이렇게 표시돼요</span>
                            </div>
                          )}
                          <div className={styles.chartLegendRow}>
                            <div className={styles.legendItem}>
                              <span className={styles.legendSwatch} style={{ background: '#dc3545' }} />
                              <span className={styles.legendLabel}>딜러</span>
                            </div>
                            <div className={styles.legendItem}>
                              <span className={styles.legendSwatch} style={{ background: '#3b82f6' }} />
                              <span className={styles.legendLabel}>서포터</span>
                            </div>
                            <div className={styles.legendItem}>
                              <svg width="22" height="4"><line x1="0" y1="2" x2="22" y2="2" stroke="#dc3545" strokeWidth="2" strokeDasharray="4 3" /></svg>
                              <span className={styles.legendLabel}>딜러 평균</span>
                            </div>
                            <div className={styles.legendItem}>
                              <svg width="22" height="4"><line x1="0" y1="2" x2="22" y2="2" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 3" /></svg>
                              <span className={styles.legendLabel}>서포터 평균</span>
                            </div>
                          </div>
                          <ResponsiveContainer width="100%" height={340}>
                            <ComposedChart data={displayData} margin={{ top: 20, right: 18, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="5 5" stroke="var(--border-color)" strokeWidth={1} vertical horizontal />
                              <XAxis
                                dataKey="date"
                                tickFormatter={formatChartDate}
                                tick={{ fontSize: 13, fill: 'var(--text-primary)', fontWeight: 700 }}
                                minTickGap={28}
                                tickMargin={8}
                                stroke="var(--text-secondary)"
                                strokeWidth={2}
                                axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                                tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                              />
                              <YAxis
                                tick={{ fontSize: 13, fill: 'var(--text-primary)', fontWeight: 700 }}
                                tickFormatter={(v: number) => chartMode === 'power' ? `${v.toLocaleString()}${suffix}` : v.toLocaleString()}
                                domain={chartMode === 'level' ? ['dataMin - 3', 'dataMax + 3'] : ['dataMin - 300', 'dataMax + 300']}
                                allowDecimals={false}
                                tickCount={6}
                                width={chartMode === 'power' ? 72 : 56}
                                stroke="var(--text-secondary)"
                                strokeWidth={2}
                                axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                                tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                              />
                              <RechartsTooltip
                                cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                content={({ active, payload, label }: any) => {
                                  if (!active || !payload || payload.length === 0) return null;
                                  const d = new Date(String(label));
                                  const dealer = payload.find((p: any) => String(p.dataKey).includes('dealer'));
                                  const supporter = payload.find((p: any) => String(p.dataKey).includes('supporter'));
                                  return (
                                    <div className={styles.customTooltip}>
                                      <div className={styles.tooltipDate}>{d.getMonth() + 1}월 {d.getDate()}일</div>
                                      {dealer && (
                                        <div className={styles.tooltipRow}>
                                          <span className={styles.tooltipDot} style={{ background: '#dc3545' }} />
                                          <span className={styles.tooltipLabel}>딜러</span>
                                          <span className={styles.tooltipValue}>{dealer.value != null ? `${Number(dealer.value).toLocaleString()}${suffix}` : '-'}</span>
                                        </div>
                                      )}
                                      {supporter && (
                                        <div className={styles.tooltipRow}>
                                          <span className={styles.tooltipDot} style={{ background: '#3b82f6' }} />
                                          <span className={styles.tooltipLabel}>서포터</span>
                                          <span className={styles.tooltipValue}>{supporter.value != null ? `${Number(supporter.value).toLocaleString()}${suffix}` : '-'}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey={dealerKey}
                                stroke="#dc3545"
                                strokeWidth={3.5}
                                dot={{ r: 4, fill: '#dc3545', stroke: 'var(--card-bg)', strokeWidth: 3 }}
                                activeDot={{ r: 8, fill: '#dc3545', stroke: 'var(--card-bg)', strokeWidth: 3 }}
                                name="dealer"
                                connectNulls
                                isAnimationActive={!isExample}
                              />
                              <Line
                                type="monotone"
                                dataKey={supporterKey}
                                stroke="#3b82f6"
                                strokeWidth={3.5}
                                dot={{ r: 4, fill: '#3b82f6', stroke: 'var(--card-bg)', strokeWidth: 3 }}
                                activeDot={{ r: 8, fill: '#3b82f6', stroke: 'var(--card-bg)', strokeWidth: 3 }}
                                name="supporter"
                                connectNulls
                                isAnimationActive={!isExample}
                              />
                              {dealerLineAvg != null && (
                                <ReferenceLine
                                  y={dealerLineAvg}
                                  stroke="#dc3545"
                                  strokeOpacity={0.35}
                                  strokeDasharray="6 5"
                                  strokeWidth={1.5}
                                  label={({ viewBox }: any) => {
                                    const text = `딜러 평균 ${Math.round(dealerLineAvg).toLocaleString()}${suffix}`;
                                    const x = viewBox.x + viewBox.width - 8;
                                    const y = viewBox.y - 5;
                                    return (
                                      <text x={x} y={y} textAnchor="end" fill="#dc3545" fontSize={11} fontWeight={800}>{text}</text>
                                    );
                                  }}
                                />
                              )}
                              {supporterLineAvg != null && (
                                <ReferenceLine
                                  y={supporterLineAvg}
                                  stroke="#3b82f6"
                                  strokeOpacity={0.35}
                                  strokeDasharray="6 5"
                                  strokeWidth={1.5}
                                  label={({ viewBox }: any) => {
                                    const text = `서포터 평균 ${Math.round(supporterLineAvg).toLocaleString()}${suffix}`;
                                    const x = viewBox.x + viewBox.width - 8;
                                    const y = viewBox.y - 5;
                                    return (
                                      <text x={x} y={y} textAnchor="end" fill="#3b82f6" fontSize={11} fontWeight={800}>{text}</text>
                                    );
                                  }}
                                />
                              )}
                            </ComposedChart>
                          </ResponsiveContainer>
                        </>
                      )}
                    </div>

                    {/* 직업별 통계 */}
                    {!chartLoading && (
                      <div className={styles.classStatsBlock}>
                        <div className={styles.classStatsHeader}>
                          <h3 className={styles.classStatsTitle}>
                            직업별 통계
                            <span className={styles.demoInlineBadge}>예시용</span>
                          </h3>
                        </div>
                        <div className={styles.classTable}>
                          <div className={styles.classTableHeader}>
                            <span className={styles.colRank}>#</span>
                            <span className={styles.colClass}>직업</span>
                            <span className={styles.colRole}>구분</span>
                            <span className={styles.colCount}>인원</span>
                            <span className={styles.colPower}>평균 전투력</span>
                            <span className={styles.colLevel}>평균 레벨</span>
                          </div>
                          <div className={styles.classTableBody}>
                            {displayClassStats.map((c, i) => {
                              const maxCount = Math.max(...displayClassStats.map(s => s.count), 1);
                              const widthPct = (c.count / maxCount) * 100;
                              const isSup = c.role === 'supporter';
                              return (
                                <div key={c.className} className={`${styles.classRow} ${i < 3 ? styles.classRowTop : ''}`}>
                                  <span className={`${styles.colRank} ${i < 3 ? styles.rankTop : ''}`}>{i + 1}</span>
                                  <span className={styles.colClass}>
                                    <span className={`${styles.classDot} ${isSup ? styles.supporterBg : styles.dealerBg}`} />
                                    {c.className}
                                  </span>
                                  <span className={styles.colRole}>
                                    <span className={`${styles.roleTag} ${isSup ? styles.roleSupporter : styles.roleDealer}`}>
                                      {isSup ? '서포터' : '딜러'}
                                    </span>
                                  </span>
                                  <span className={styles.colCount}>
                                    <span className={styles.countNumber}>{c.count}</span>
                                    <span className={styles.countBar}>
                                      <span
                                        className={`${styles.countBarFill} ${isSup ? styles.supporterBg : styles.dealerBg}`}
                                        style={{ width: `${widthPct}%` }}
                                      />
                                    </span>
                                  </span>
                                  <span className={styles.colPower}>{c.avgPower.toLocaleString()}<span className={styles.colUnit}>점</span></span>
                                  <span className={styles.colLevel}>{c.avgLevel.toFixed(2)}</span>
                                </div>
                              );
                            })}
                            {!isExample && displayClassStats.length === 0 && (
                              <div className={styles.classEmpty}>데이터가 쌓이면 직업별 평균이 표시됩니다</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            </div>{/* contentOrder 닫기 */}

          </Col>
        </Row>
      </Container>
    </div>
  );
}
