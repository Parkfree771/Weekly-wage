'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { useSearchHistory } from '@/lib/useSearchHistory';
import { saveExpeditionData, saveExpeditionTitle, getTitleSampleCount, getCachedTitleStats, TitleStats } from '@/lib/supabase';
import styles from './title.module.css';

// 칭호에서 HTML 태그 제거 (API가 <img>태그와 함께 반환)
function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

// 칭호별 아이콘 이미지 매핑
const TITLE_ICONS: Record<string, string> = {
  '심연의 군주': '/tlarns.webp?v=2',
  '돌로리스': '/ehfeh.webp',
  '어비스 던전': '/djqltm1.webp',
};

// 추적 대상 칭호 목록
const TARGET_TITLES = [
  { key: 'abyss_lord' as const, label: '심연의 군주', icon: '/tlarns.webp?v=2' as string | null, disabled: false },
  { key: 'doldoris' as const, label: '돌로리스', icon: '/ehfeh.webp' as string | null, disabled: false },
  { key: 'abyss_dungeon' as const, label: '어비스 던전', icon: '/djqltm1.webp' as string | null, disabled: true },
];

type TitleKey = 'abyss_lord' | 'doldoris' | 'abyss_dungeon';

// API 응답 타입
interface ProfileData {
  CharacterImage: string | null;
  CharacterName: string;
  ServerName: string;
  CharacterClassName: string;
  ItemAvgLevel: string;
  ItemMaxLevel: string;
  Title: string | null;
  CombatPower: string | null;
  Stats: Array<{ Type: string; Value: string }> | null;
}

interface SiblingData {
  CharacterName: string;
  ItemAvgLevel: string;
  ServerName: string;
  CharacterClassName: string;
}

// 대표 캐릭터 정보
interface RepresentativeInfo {
  name: string;
  server: string;
  className: string;
  itemLevel: number;
  combatPower: number | null;
  title: string | null;
  image: string | null;
}

export default function TitlePage() {
  const [activeTab, setActiveTab] = useState<TitleKey>('abyss_lord');
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [representative, setRepresentative] = useState<RepresentativeInfo | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [sampleCount, setSampleCount] = useState<number>(0);
  const [titleStats, setTitleStats] = useState<TitleStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 검색 히스토리
  const { addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 현재 탭의 칭호명
  const activeTitle = TARGET_TITLES.find(t => t.key === activeTab)!.label;

  // 칭호 매칭 여부
  const isTitleMatch = representative?.title === activeTitle;

  // 데이터 유효성 검증 (비정상 데이터 방지)
  const MIN_ITEM_LEVEL = 1740;
  const MIN_COMBAT_POWER = 3000;
  const isValidData = representative
    ? representative.itemLevel >= MIN_ITEM_LEVEL &&
      representative.combatPower !== null &&
      representative.combatPower >= MIN_COMBAT_POWER
    : false;

  // 탭 변경 시 샘플 수 + 통계 로드
  useEffect(() => {
    loadSampleCount(activeTitle);
    loadTitleStats(activeTitle);
  }, [activeTitle]);

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadSampleCount(title: string) {
    const count = await getTitleSampleCount(title);
    setSampleCount(count);
  }

  async function loadTitleStats(title: string) {
    setStatsLoading(true);
    try {
      const stats = await getCachedTitleStats(title);
      setTitleStats(stats);
    } catch {
      setTitleStats(null);
    } finally {
      setStatsLoading(false);
    }
  }

  // API 호출
  async function fetchCharacterData(name: string): Promise<{
    profile: ProfileData;
    siblings: SiblingData[];
  } | null> {
    try {
      const res = await fetch(`/api/lostark?characterName=${encodeURIComponent(name)}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || '캐릭터 정보를 가져올 수 없습니다.');
      }
      const data = await res.json();
      return { profile: data.profile, siblings: data.siblings };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
      }
      throw err;
    }
  }

  // 검색 처리
  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = characterName.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setRepresentative(null);
    setSaveStatus('idle');
    setShowSuggestions(false);

    try {
      // 1단계: 입력한 캐릭터 정보 조회
      const data = await fetchCharacterData(trimmed);
      if (!data) throw new Error('데이터를 가져올 수 없습니다.');

      addToHistory(trimmed);

      // 2단계: siblings에서 최고 레벨 캐릭터 찾기
      const sortedSiblings = [...data.siblings]
        .map(s => ({
          ...s,
          numericLevel: parseFloat(s.ItemAvgLevel.replace(/,/g, '')),
        }))
        .sort((a, b) => b.numericLevel - a.numericLevel);

      if (sortedSiblings.length === 0) {
        throw new Error('원정대 캐릭터 정보를 찾을 수 없습니다.');
      }

      const topChar = sortedSiblings[0];

      // 3단계: 최고 레벨 캐릭터가 검색한 캐릭터와 다르면 추가 API 호출
      let profileData: ProfileData;
      if (topChar.CharacterName === data.profile.CharacterName) {
        profileData = data.profile;
      } else {
        const topData = await fetchCharacterData(topChar.CharacterName);
        if (!topData) throw new Error('대표 캐릭터 정보를 가져올 수 없습니다.');
        profileData = topData.profile;
      }

      // 4단계: 대표 캐릭터 정보 설정
      const itemLevel = parseFloat(profileData.ItemAvgLevel.replace(/,/g, ''));

      setRepresentative({
        name: profileData.CharacterName,
        server: profileData.ServerName,
        className: profileData.CharacterClassName,
        itemLevel,
        combatPower: profileData.CombatPower ? parseFloat(profileData.CombatPower.replace(/,/g, '')) : null,
        title: profileData.Title ? stripHtmlTags(profileData.Title) : null,
        image: profileData.CharacterImage || null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  // 저장 처리
  async function handleSave() {
    if (!representative || !isTitleMatch || !isValidData) return;

    setSaveStatus('saving');

    try {
      // 원정대 데이터 UPSERT
      const expeditionSuccess = await saveExpeditionData({
        expedition_key: representative.name,
        server: representative.server,
        representative_char: representative.name,
        max_item_level: representative.itemLevel,
        max_combat_power: representative.combatPower,
      });

      if (!expeditionSuccess) {
        throw new Error('저장에 실패했습니다.');
      }

      // 칭호 기록 추가
      await saveExpeditionTitle(representative.name, activeTitle);

      setSaveStatus('success');
      // 샘플 수 갱신 (캐시 통계는 수동 refresh 시에만 갱신)
      loadSampleCount(activeTitle);

      // 3초 후 상태 초기화
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  // 자동완성 입력 핸들러
  function handleInputChange(value: string) {
    setCharacterName(value);
    if (value.trim()) {
      const results = getSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }

  // 자동완성 선택
  function handleSelectSuggestion(name: string) {
    setCharacterName(name);
    setShowSuggestions(false);
  }

  // 키보드 네비게이션
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  // 저장 버튼 텍스트
  function getSaveButtonText() {
    if (saveStatus === 'saving') return '저장 중...';
    if (saveStatus === 'success') return '저장 완료';
    if (saveStatus === 'error') return '저장 실패 - 다시 시도해주세요';
    if (!representative) return '저장하기';
    if (!representative.title) return '칭호를 착용하지 않았습니다';
    if (!isTitleMatch) return `현재 탭(${activeTitle})과 착용 칭호가 다릅니다`;
    if (!isValidData) return '비정상적인 전투력 또는 아이템 레벨입니다';
    return '저장하기';
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 페이지 제목 */}
            <div className="text-center mb-3" style={{ marginTop: 0 }}>
              <h1
                style={{
                  fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: 0,
                  marginBottom: '0.5rem',
                }}
              >
                칭호 통계
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                칭호 보유자의 전투력을 수집하여 통계를 제공합니다
              </p>
              <noscript>
                <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0' }}>
                  <h2>로스트아크 칭호 통계</h2>
                  <p>칭호별 보유자 전투력 평균 통계를 확인하세요.</p>
                </div>
              </noscript>
            </div>

            {/* 탭 */}
            <div className={styles.tabContainer}>
              {TARGET_TITLES.map((t) => (
                <button
                  key={t.key}
                  className={`${styles.tabButton} ${activeTab === t.key ? styles.tabButtonActive : ''} ${t.disabled ? styles.tabButtonDisabled : ''}`}
                  onClick={() => {
                    if (t.disabled) return;
                    setActiveTab(t.key);
                    setSaveStatus('idle');
                  }}
                  disabled={t.disabled}
                >
                  {t.icon && (
                    <img
                      src={t.icon}
                      alt=""
                      className={styles.tabIcon}
                      style={t.key === 'abyss_dungeon' ? { height: '27px' } : undefined}
                    />
                  )}
                  {t.label}
                  {t.disabled && <span className={styles.tabSoon}>준비중</span>}
                </button>
              ))}
            </div>

            {/* 검색창 */}
            <div className={styles.searchWrapper}>
              <div className={styles.searchInner}>
                <Form onSubmit={handleSearch}>
                  <div className={styles.searchInputGroup}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        ref={inputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder="캐릭터명을 입력하세요"
                        value={characterName}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onFocus={() => {
                          if (characterName.trim()) {
                            const results = getSuggestions(characterName);
                            setSuggestions(results);
                            setShowSuggestions(results.length > 0);
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <div ref={suggestionsRef} className={styles.suggestions}>
                          {suggestions.map((name, index) => (
                            <div
                              key={name}
                              className={`${styles.suggestionItem} ${selectedIndex === index ? styles.suggestionItemSelected : ''}`}
                              onClick={() => handleSelectSuggestion(name)}
                              style={{
                                borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                              }}
                            >
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      className={styles.searchButton}
                      disabled={isLoading || !characterName.trim()}
                    >
                      {isLoading ? '검색 중...' : '검색'}
                    </button>
                  </div>
                </Form>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className={styles.errorWrapper}>
                <div className={styles.errorMessage}>{error}</div>
              </div>
            )}

            {/* 검색 결과 - 캐릭터 카드 */}
            {representative ? (
              <div className={styles.characterCard}>
                {/* 왼쪽: 캐릭터 이미지 */}
                <div className={styles.characterImageWrapper}>
                  {representative.image ? (
                    <img
                      src={representative.image}
                      alt={representative.name}
                      className={styles.characterImage}
                    />
                  ) : (
                    <div className={styles.noImage}>이미지 없음</div>
                  )}
                </div>

                {/* 오른쪽: 캐릭터 정보 */}
                <div className={styles.characterInfo}>
                  <div>
                    <span className={styles.characterName}>{representative.name}</span>
                    <span className={styles.characterServer}> @{representative.server}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>착용 칭호</span>
                    <span className={`${styles.infoValue} ${
                      isTitleMatch ? styles.titleMatch : styles.titleMismatch
                    }`}>
                      {representative.title && TITLE_ICONS[representative.title] && (
                        <img src={TITLE_ICONS[representative.title]} alt="" className={styles.titleIcon} />
                      )}
                      {representative.title || '칭호 없음'}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>아이템 레벨</span>
                    <span className={styles.infoValue}>
                      {representative.itemLevel.toLocaleString()}
                    </span>
                  </div>

                  {representative.combatPower !== null && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>전투력</span>
                      <span className={styles.infoValue}>
                        {representative.combatPower.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* 저장 버튼 */}
                  <button
                    className={`${styles.saveButton} ${saveStatus === 'success' ? styles.saveButtonSuccess : ''}`}
                    onClick={handleSave}
                    disabled={!isTitleMatch || !isValidData || saveStatus === 'saving' || saveStatus === 'success'}
                  >
                    {getSaveButtonText()}
                  </button>
                </div>
              </div>
            ) : !isLoading && !error ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateTitle}>
                  캐릭터를 검색하여 칭호 데이터를 등록해주세요
                </div>
                <div className={styles.emptyStateDesc}>
                  원정대 내 가장 높은 레벨의 캐릭터가 대표로 표시됩니다
                </div>
              </div>
            ) : null}

            {/* 주의사항 */}
            <div className={styles.saveNotice}>
              캐릭터 검색 시 원정대 최고 레벨 캐릭터를 불러옵니다.<br />
              통계 오염 방지를 위해 전투력 3,000 이하는 등록 불가능하도록 설정되어 있습니다(카던 세팅 통계 오염 방지).<br />
              통계 오염 방지를 위해 최고 전투력으로 세팅 후 저장해주시면 감사하겠습니다.<br />
              원정대당 1회 등록 가능하며, 전투력 변경 시 다시 검색하고 저장하기를 누르시면 수정된 전투력이 통계에 반영됩니다.<br />
              (기존 전투력 + 수정된 전투력이 아닌, 수정된 전투력만 통계에 반영됩니다)<br />
              돌로리스와 심연의 군주가 모두 있으시다면 인게임에서 교체 후 한번씩 검색하셔서 등록해야 합니다 (API 한계 ㅠㅠ)
            </div>

            {/* 통계 영역 */}
            <div className={styles.statsCard}>
              <div className={styles.statsHeader}>
                <div className={styles.statsTitle}>
                  {TARGET_TITLES.find(t => t.key === activeTab)?.icon && (
                    <img
                      src={TARGET_TITLES.find(t => t.key === activeTab)!.icon!}
                      alt=""
                      className={styles.statsIcon}
                      style={activeTab === 'abyss_dungeon' ? { height: '30px' } : undefined}
                    />
                  )}
                  {activeTitle} 통계
                </div>
                <div className={styles.statsSampleCount}>
                  수집된 데이터: {sampleCount.toLocaleString()}건
                </div>
              </div>

              {statsLoading ? (
                <div className={styles.statsEmpty}>통계를 불러오는 중...</div>
              ) : titleStats ? (
                <>
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <div className={styles.statLabel}>평균 전투력</div>
                      <div className={styles.statValue}>
                        {titleStats.avg_combat_power.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statLabel}>평균 아이템 레벨</div>
                      <div className={styles.statValue}>
                        {titleStats.avg_item_level.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {/* 전투력 분포 히스토그램 */}
                  {titleStats.distribution.length > 0 && (
                    <div className={styles.chartSection}>
                      <div className={styles.chartTitle}>전투력 분포</div>
                      <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart
                            data={titleStats.distribution}
                            margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
                          >
                            <XAxis
                              dataKey="range"
                              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                              tickFormatter={(v: number) => v.toLocaleString()}
                              interval={Math.max(0, Math.floor(titleStats.distribution.length / 8) - 1)}
                              axisLine={{ stroke: 'var(--border-color)' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                              }}
                              formatter={(value: number | undefined) => [`${value ?? 0}명`, '인원']}
                              labelFormatter={(label: any) => `전투력 ${Number(label).toLocaleString()} ~ ${(Number(label) + 99).toLocaleString()}`}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                              <LabelList
                                dataKey="count"
                                position="top"
                                style={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }}
                              />
                              {titleStats.distribution.map((entry, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    entry.range <= titleStats.avg_combat_power &&
                                    titleStats.avg_combat_power < entry.range + 100
                                      ? '#b91c1c'
                                      : 'rgba(185, 28, 28, 0.35)'
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className={styles.chartLegend}>
                        <span className={styles.legendAvg}>평균 구간</span>
                      </div>
                    </div>
                  )}

                  <div className={styles.statsUpdatedAt}>
                    마지막 갱신: {new Date(titleStats.updated_at).toLocaleString('ko-KR')}
                  </div>
                </>
              ) : (
                <div className={styles.statsEmpty}>
                  아직 통계가 갱신되지 않았습니다
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
