'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Form } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Line, ComposedChart,
} from 'recharts';
import styles from './extreme.module.css';
import {
  saveExtremeClear, getChartData, getSummary, getRole,
  type DailyChartData, type ExtremeSummary,
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

  // ���트 데이터 로드
  const loadChartData = useCallback(async () => {
    setChartLoading(true);
    const [data, sum] = await Promise.all([
      getChartData(chartTitle),
      getSummary(chartTitle),
    ]);
    setChartData(data);
    setSummary(sum);
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
                  return (
                    <div key={diff.name} className={styles.diffCard}>
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
                    </div>
                  );
                })}
              </div>

              {/* 최초 클리어 보상 */}
              <h2 className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>최초 클리어 보상</h2>
              <div className={styles.fcTable}>
                {/* 헤더 */}
                <div className={styles.fcHeaderRow}>
                  <div className={styles.fcColLabel}>구분</div>
                  <div className={styles.fcColReward}>기본 최초 클리어 보상</div>
                  <div className={styles.fcColNm}>나이트메어 전용 보상</div>
                </div>
                {/* 바디 */}
                <div className={styles.fcBody}>
                  {/* 왼쪽: 구분 */}
                  <div className={styles.fcLabels}>
                    <div className={`${styles.fcLabelItem} ${styles.fcLabelNm}`}>EX 나이트메어</div>
                    <div className={`${styles.fcLabelItem} ${styles.fcLabelHd}`}>EX 하드</div>
                    <div className={styles.fcLabelItem}>EX 노말</div>
                  </div>
                  {/* 가운데: 보상 (3줄 합침) */}
                  <div className={styles.fcRewardsMerged}>
                    <div className={styles.fcItem}>
                      <Image src="/legendary-cardpack.webp" alt="전설 카드팩" width={52} height={52} />
                      <span className={styles.fcItemName}>도약의 전설 카드 선택 팩 Ⅲ</span>
                      <span className={styles.fcItemQty}>x1</span>
                    </div>
                    <div className={styles.fcItem}>
                      <Image src="/gem-hero.webp" alt="영웅 젬 선택" width={52} height={52} />
                      <span className={styles.fcItemName}>영웅 젬 선택 상자</span>
                      <span className={styles.fcItemQty}>x1</span>
                    </div>
                    <div className={styles.fcItem}>
                      <Image src="/gem-reset-ticket.webp" alt="젬 가공 초기화권" width={52} height={52} />
                      <span className={styles.fcItemName}>젬 가공 초기화권</span>
                      <span className={styles.fcItemQty}>x1</span>
                    </div>
                    <div className={styles.fcItem}>
                      <Image src="/xhzms.webp" alt="불과 얼음의 주화" width={52} height={52} />
                      <span className={styles.fcItemName}>불과 얼음의 주화</span>
                      <span className={styles.fcItemQty}>x100</span>
                    </div>
                  </div>
                  {/* 오른쪽: 나메 전용 (3줄 중 나메만) */}
                  <div className={styles.fcNmCol}>
                    <div className={styles.fcTitleItem}>
                      <Image src="/extreme-fire.webp" alt="홍염의 군주" width={28} height={28} className={styles.titleIconInline} />
                      <span className={styles.titleMatchFire}>홍염의 군주</span>
                    </div>
                    <div className={styles.fcTitleItem}>
                      <Image src="/extreme-ice.webp" alt="혹한의 군주" width={28} height={28} className={styles.titleIconInline} />
                      <span className={styles.titleMatchIce}>혹한의 군주</span>
                    </div>
                    <span className={styles.fcTitleText}>전설 칭호</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════
                섹션 2: 칭호 전투력 측정
                ═══════════════════════════════════════════ */}
            <div className={`${styles.titleSection} ${styles.orderSearch}`}>
              <div className={styles.searchHeader}>
                <Image src={currentTitle.image} alt={currentTitle.name} width={38} height={38} className={styles.titleIconInline} />
                <span className={`${styles.searchTitleName} ${currentAct === 1 ? styles.titleNameFire : styles.titleNameIce}`}>
                  {currentTitle.name}
                </span>
              </div>
              <div className={styles.searchSub}>{currentAct}막 클리어 칭호</div>
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
                          <Image src={matchedTitle.image} alt={matchedTitle.name} width={24} height={24} className={styles.titleIconInline} />
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
              <div className={styles.chartHeader}>
                <h2 className={styles.sectionTitle}>클리어 통계</h2>
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
              {summary && summary.totalClears > 0 && (
                <div className={styles.summaryRow}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>총 클리어</span>
                    <span className={styles.summaryValue}>{summary.totalClears}명</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={`${styles.summaryLabel} ${styles.dealerColor}`}>딜러 평균</span>
                    <span className={styles.summaryValue}>{summary.dealerAvgPower ? summary.dealerAvgPower.toLocaleString() : '-'}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={`${styles.summaryLabel} ${styles.supporterColor}`}>서포터 평균</span>
                    <span className={styles.summaryValue}>{summary.supporterAvgPower ? summary.supporterAvgPower.toLocaleString() : '-'}</span>
                  </div>
                </div>
              )}
              <div className={styles.chartContainer}>
                {chartLoading ? (
                  <div className={styles.chartPlaceholder}>데이터 로딩 중...</div>
                ) : chartData.length === 0 ? (
                  <div className={styles.chartPlaceholder}>아직 등록된 데이터가 없습니다</div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => chartMode === 'power' ? `${(v / 10000).toFixed(0)}만` : v.toLocaleString()} />
                      <RechartsTooltip
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}
                        formatter={(value: any, name: any) => [value != null ? Number(value).toLocaleString() : '-', name.includes('dealer') ? '딜러' : '서포터']}
                        labelFormatter={(label: any) => { const d = new Date(String(label)); return `${d.getMonth() + 1}월 ${d.getDate()}일`; }}
                      />
                      <Legend formatter={(value: string) => value.includes('dealer') ? '딜러' : '서포터'} />
                      {chartMode === 'power' ? (
                        <>
                          <Line type="monotone" dataKey="dealerPower" stroke="#dc3545" strokeWidth={2.5} dot={{ r: 4 }} name="dealerPower" connectNulls />
                          <Line type="monotone" dataKey="supporterPower" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="supporterPower" connectNulls />
                        </>
                      ) : (
                        <>
                          <Line type="monotone" dataKey="dealerLevel" stroke="#dc3545" strokeWidth={2.5} dot={{ r: 4 }} name="dealerLevel" connectNulls />
                          <Line type="monotone" dataKey="supporterLevel" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="supporterLevel" connectNulls />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            </div>{/* contentOrder 닫기 */}

          </Col>
        </Row>
      </Container>
    </div>
  );
}
