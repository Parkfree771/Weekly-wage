'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Form } from 'react-bootstrap';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Line, ComposedChart, ReferenceLine,
} from 'recharts';
import styles from '../title-stats.module.css';
import frost from './frost.module.css';
import {
  registerExtremeParty, registerFrostIndividual,
  getChartData, getSummary, getClassStats, getHallOfFame, getAllClears, getRosterLocks,
  getRole, isHybridClass,
  type DailyChartData, type ExtremeSummary, type ClassStat, type HallOfFameEntry,
  type PartyMemberInput,
} from '@/lib/extreme-service';

const EvilEye = dynamic(() => import('@/components/EvilEye'), {
  ssr: false,
  loading: () => <div className={styles.eyeFallback} />,
});

// ─── 레이드 정의 (혹한의 군주 고정) ───
const RAID = {
  titleName: '혹한의 군주',
  subtitle: 'Lord of Frozen Tundra',
  image: '/extreme-ice.webp',
  openAt: new Date(2026, 4, 20, 10, 0, 0),
  eyeColor: '#4AA8D8',
};

const PARTY_SIZE = 8;
const TOTAL_PARTIES = 5;

// ⚠️ 테스트 전용: true 면 칭호 불일치도 등록 통과
// 운영 직전 반드시 false 로 되돌릴 것
const TEST_BYPASS_TITLE = false;

type CharProfile = {
  name: string;
  className: string;
  itemLevel: string;
  combatPower: string;
  image: string;
  title: string;
  role: 'dealer' | 'supporter' | null;   // 하이브리드(발키리) 신규 검색 시 null. 버튼 선택 후 확정.
  siblingNames: string[];  // 원정대 전체 닉네임 (본인 포함)
};

// 로아 Siblings API 응답 → 닉네임 배열 추출 (본인 포함 보장)
function extractSiblingNames(raw: unknown, selfName: string): string[] {
  const arr = Array.isArray(raw) ? (raw as Array<{ CharacterName?: string }>) : [];
  const names = new Set<string>();
  for (const s of arr) {
    if (s && typeof s.CharacterName === 'string' && s.CharacterName.trim()) {
      names.add(s.CharacterName.trim());
    }
  }
  if (selfName.trim()) names.add(selfName.trim());
  return Array.from(names);
}

function parseTitleText(raw: string): string {
  if (!raw) return '';
  return raw.replace(/<img[^>]*>(.*?)<\/img>/gi, '').replace(/<[^>]+>/g, '').trim();
}

// DB 의 clear_date 는 'YYYY-MM-DD' 문자열.
// new Date('YYYY-MM-DD') 는 UTC 자정으로 해석되어 로컬 TZ 에 따라 하루 밀릴 수 있으므로 직접 파싱.
function parseDateParts(dateStr: string): { month: number; day: number } {
  const [, m, d] = dateStr.split('-');
  return { month: Number(m), day: Number(d) };
}

function formatChartDate(dateStr: string) {
  const { month, day } = parseDateParts(dateStr);
  return `${month}/${day}`;
}

export default function FrostTitleStatsPage() {
  // 모바일 감지 (차트 margin/YAxis 조정용)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 차트
  const [chartMode, setChartMode] = useState<'power' | 'level'>('power');
  const [chartData, setChartData] = useState<DailyChartData[]>([]);
  const [summary, setSummary] = useState<ExtremeSummary | null>(null);
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  // 명예의 전당
  const [hof, setHof] = useState<HallOfFameEntry[]>([]);
  const [partyIndex, setPartyIndex] = useState(0);

  // 혹한의 군주 칭호 보유자 명단 (공대/개인 구분 없이 전체)
  const [allHunters, setAllHunters] = useState<HallOfFameEntry[]>([]);
  type SortMode = 'created' | 'power' | 'level';
  type RoleFilter = 'all' | 'dealer' | 'supporter';
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const filteredHunters = useMemo(() => {
    const base = roleFilter === 'all' ? allHunters : allHunters.filter(h => h.role === roleFilter);
    const sorted = [...base];
    if (sortMode === 'power') {
      sorted.sort((a, b) => b.combatPower - a.combatPower);
    } else if (sortMode === 'level') {
      sorted.sort((a, b) => b.itemLevel - a.itemLevel);
    } else {
      // 등록순 — createdAt 오름차순
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return sorted;
  }, [allHunters, sortMode, roleFilter]);


  // 원정대 잠금: character_name → party_name (개인 등록이면 null)
  const [rosterLocks, setRosterLocks] = useState<Map<string, string | null>>(new Map());

  // 개인 등록 (명예의 전당 40명 완료 후에만 활성화)
  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState<CharProfile | null>(null);
  const [searchError, setSearchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 공대 등록 (명예의 전당이 40명 미만일 때만 활성화)
  const [partyName, setPartyName] = useState('');
  const [partySlots, setPartySlots] = useState<(CharProfile | null)[]>(() => Array(PARTY_SIZE).fill(null));
  const [slotSearchNames, setSlotSearchNames] = useState<string[]>(() => Array(PARTY_SIZE).fill(''));
  const [slotSearchingIndex, setSlotSearchingIndex] = useState<number | null>(null);
  const [slotErrors, setSlotErrors] = useState<(string | null)[]>(() => Array(PARTY_SIZE).fill(null));
  const [partyRegistering, setPartyRegistering] = useState(false);
  const [partyMessage, setPartyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedRaid = RAID;
  const isReleased = true; // 페이지 자체는 항상 공개. 칭호 자체가 없어 등록은 자연스럽게 차단됨.
  const isIce = true;
  const hofFull = hof.length >= PARTY_SIZE * TOTAL_PARTIES; // 40명 채워짐 → 개인 등록 해금
  const registrationMode: 'party' | 'individual' = hofFull ? 'individual' : 'party';

  // 본문 텍스트에 인라인으로 [로고][이름] 한 덩어리로 들어가는 태그
  const RaidTag = () => (
    <span className={styles.raidTag}>
      <Image
        src={selectedRaid.image}
        alt=""
        width={18}
        height={18}
        className={styles.raidTagLogo}
      />
      <span className={`${styles.raidTagName} ${isIce ? styles.raidTagNameIce : ''}`}>
        {selectedRaid.titleName}
      </span>
    </span>
  );

  const loadAll = useCallback(async () => {
    setChartLoading(true);
    const [chartRes, summaryRes, classesRes, hofRes, allRes, locksRes] = await Promise.all([
      getChartData(selectedRaid.titleName),
      getSummary(selectedRaid.titleName),
      getClassStats(selectedRaid.titleName),
      getHallOfFame(selectedRaid.titleName),
      getAllClears(selectedRaid.titleName),
      getRosterLocks(selectedRaid.titleName),
    ]);
    setChartData(chartRes);
    setSummary(summaryRes);
    setClassStats(classesRes);
    setHof(hofRes);
    setAllHunters(allRes);
    setRosterLocks(locksRes);
    setChartLoading(false);
  }, [selectedRaid.titleName]);

  useEffect(() => {
    loadAll();
    setPartyIndex(0);
  }, [loadAll]);

  const hasMatchingTitle = profile && (TEST_BYPASS_TITLE || profile.title === selectedRaid.titleName);

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

      const siblingNames = extractSiblingNames(data.siblings, p.CharacterName || searchName);
      const lockedName = siblingNames.find(n => rosterLocks.has(n));
      if (lockedName) {
        const pname = rosterLocks.get(lockedName);
        const where = pname ? `"${pname}" 공대` : '개인 등록';
        setSearchError(`이미 ${where}에 등록된 원정대입니다.`);
        return;
      }

      const cls = p.CharacterClassName || '';
      setProfile({
        name: p.CharacterName || searchName,
        className: cls,
        itemLevel: p.ItemAvgLevel || '0',
        combatPower: p.CombatPower || '',
        image: p.CharacterImage || '',
        title: parseTitleText(p.Title || ''),
        role: isHybridClass(cls) ? null : getRole(cls),
        siblingNames,
      });
    } catch {
      setSearchError('검색 중 오류가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !hasMatchingTitle) return;
    if (profile.role === null) {
      setSaveMessage({ type: 'error', text: '딜러 / 서포터 중 하나를 선택해주세요.' });
      return;
    }
    const power = parseFloat(profile.combatPower.replace(/,/g, ''));
    if (isNaN(power) || power <= 0) {
      setSaveMessage({ type: 'error', text: '전투력 정보를 가져올 수 없습니다.' });
      return;
    }
    if (power < 4000) {
      setSaveMessage({ type: 'error', text: '전투력 4000 미만은 등록할 수 없습니다. 전투력을 확인해주세요.' });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    const result = await registerFrostIndividual({
      character_name: profile.name,
      character_class: profile.className,
      role: profile.role,
      item_level: parseFloat(profile.itemLevel.replace(/,/g, '')),
      combat_power: power,
      title: selectedRaid.titleName,
      sibling_names: profile.siblingNames,
      character_image: profile.image || null,
    });

    if (result.success) {
      setSaveMessage({ type: 'success', text: '등록 완료! 통계에 반영됩니다.' });
      setProfile(null);
      setSearchName('');
      loadAll();
    } else {
      setSaveMessage({ type: 'error', text: result.error || '저장에 실패했습니다.' });
    }
    setSaving(false);
  };

  // ─── 공대 슬롯 검색 ───
  const handleSlotSearch = async (index: number) => {
    const raw = slotSearchNames[index]?.trim();
    if (!raw) return;

    // 다른 슬롯과 중복된 캐릭터명인지 확인
    const dup = partySlots.some((s, i) => s && i !== index && s.name === raw);
    if (dup) {
      const newErrors = [...slotErrors];
      newErrors[index] = '이미 다른 슬롯에 등록된 캐릭터입니다.';
      setSlotErrors(newErrors);
      return;
    }

    setSlotSearchingIndex(index);
    setSlotErrors(prev => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });

    try {
      const res = await fetch(`/api/lostark?characterName=${encodeURIComponent(raw)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSlotErrors(prev => {
          const copy = [...prev];
          copy[index] = err.message || '캐릭터를 찾을 수 없습니다.';
          return copy;
        });
        return;
      }
      const data = await res.json();
      const p = data.profile;
      if (!p) {
        setSlotErrors(prev => {
          const copy = [...prev];
          copy[index] = '프로필 정보를 찾을 수 없습니다.';
          return copy;
        });
        return;
      }

      const title = parseTitleText(p.Title || '');
      const siblingNames = extractSiblingNames(data.siblings, p.CharacterName || raw);

      // 이미 등록된 원정대인지 검증 (roster_locks 검사)
      const lockedName = siblingNames.find(n => rosterLocks.has(n));
      if (lockedName) {
        const pname = rosterLocks.get(lockedName);
        const where = pname ? `"${pname}" 공대` : '개인 등록';
        setSlotErrors(prev => {
          const copy = [...prev];
          copy[index] = `이미 ${where}에 등록된 원정대입니다.`;
          return copy;
        });
        setSlotSearchingIndex(null);
        return;
      }

      // 다른 슬롯과 원정대 겹침 검사
      const rosterOverlap = partySlots.some((other, i) => {
        if (!other || i === index) return false;
        return other.siblingNames.some(n => siblingNames.includes(n));
      });
      if (rosterOverlap) {
        setSlotErrors(prev => {
          const copy = [...prev];
          copy[index] = '이미 다른 슬롯에 같은 원정대의 캐릭터가 있습니다.';
          return copy;
        });
        return;
      }

      const cls = p.CharacterClassName || '';
      const newProfile: CharProfile = {
        name: p.CharacterName || raw,
        className: cls,
        itemLevel: p.ItemAvgLevel || '0',
        combatPower: p.CombatPower || '',
        image: p.CharacterImage || '',
        title,
        role: isHybridClass(cls) ? null : getRole(cls),
        siblingNames,
      };

      setPartySlots(prev => {
        const copy = [...prev];
        copy[index] = newProfile;
        return copy;
      });

      if (!TEST_BYPASS_TITLE && title !== selectedRaid.titleName) {
        setSlotErrors(prev => {
          const copy = [...prev];
          copy[index] = `${selectedRaid.titleName} 칭호 미착용`;
          return copy;
        });
      }
    } catch {
      setSlotErrors(prev => {
        const copy = [...prev];
        copy[index] = '검색 중 오류가 발생했습니다.';
        return copy;
      });
    } finally {
      setSlotSearchingIndex(null);
    }
  };

  const handleSlotClear = (index: number) => {
    setPartySlots(prev => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
    setSlotSearchNames(prev => {
      const copy = [...prev];
      copy[index] = '';
      return copy;
    });
    setSlotErrors(prev => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
  };

  const handleSlotRoleChange = (index: number, role: 'dealer' | 'supporter') => {
    setPartySlots(prev => {
      const copy = [...prev];
      const s = copy[index];
      if (s) copy[index] = { ...s, role };
      return copy;
    });
  };

  const handleSlotNameChange = (index: number, value: string) => {
    setSlotSearchNames(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // 공대 등록 가능 여부
  const allSlotsValid = partySlots.every(s => s && s.role !== null && (TEST_BYPASS_TITLE || s.title === selectedRaid.titleName));
  const noDuplicateNames = (() => {
    const names = partySlots.filter(Boolean).map(s => s!.name);
    return names.length === new Set(names).size;
  })();
  const canRegisterParty = (
    isReleased &&
    partyName.trim().length > 0 &&
    allSlotsValid &&
    noDuplicateNames &&
    !partyRegistering
  );

  const handlePartyRegister = async () => {
    if (!canRegisterParty) return;

    setPartyRegistering(true);
    setPartyMessage(null);

    // 8명 입력 검증 + 페이로드 빌드
    const members: PartyMemberInput[] = [];
    for (let i = 0; i < PARTY_SIZE; i++) {
      const p = partySlots[i];
      if (!p) {
        setPartyMessage({ type: 'error', text: `${i + 1}번 슬롯이 비어있습니다.` });
        setPartyRegistering(false);
        return;
      }
      if (p.role === null) {
        setPartyMessage({ type: 'error', text: `${p.name} — 딜러/서포터를 선택해주세요.` });
        setPartyRegistering(false);
        return;
      }
      const power = parseFloat(p.combatPower.replace(/,/g, ''));
      const level = parseFloat(p.itemLevel.replace(/,/g, ''));
      if (isNaN(power) || power <= 0 || isNaN(level) || level <= 0) {
        setPartyMessage({ type: 'error', text: `${p.name} 전투력/레벨 정보를 가져올 수 없습니다.` });
        setPartyRegistering(false);
        return;
      }
      if (power < 4000) {
        setPartyMessage({ type: 'error', text: `${p.name} — 전투력 4000 미만은 등록할 수 없습니다. 전투력을 확인해주세요.` });
        setPartyRegistering(false);
        return;
      }
      members.push({
        character_name: p.name,
        character_class: p.className,
        role: p.role,
        item_level: level,
        combat_power: power,
        character_image: p.image || null,
        sibling_names: p.siblingNames,
      });
    }

    // 단일 원자적 RPC 호출 - 1 공대 + 8 멤버가 트랜잭션으로 INSERT
    const result = await registerExtremeParty(selectedRaid.titleName, partyName.trim(), members);

    if (result.success) {
      setPartyMessage({ type: 'success', text: `"${partyName.trim()}" 공대 등록 완료!` });
      setPartyName('');
      setPartySlots(Array(PARTY_SIZE).fill(null));
      setSlotSearchNames(Array(PARTY_SIZE).fill(''));
      setSlotErrors(Array(PARTY_SIZE).fill(null));
      await loadAll();
    } else {
      setPartyMessage({ type: 'error', text: result.error || '등록 실패' });
    }
    setPartyRegistering(false);
  };

  // 차트 평균선 계산
  const dealerKey = chartMode === 'power' ? 'dealerPower' : 'dealerLevel';
  const supporterKey = chartMode === 'power' ? 'supporterPower' : 'supporterLevel';
  const suffix = chartMode === 'power' ? '점' : '';
  const dealerVals = chartData.map(d => d[dealerKey]).filter((v): v is number => v != null);
  const supporterVals = chartData.map(d => d[supporterKey]).filter((v): v is number => v != null);
  const dealerLineAvg = dealerVals.length > 0 ? dealerVals.reduce((a, b) => a + b, 0) / dealerVals.length : null;
  const supporterLineAvg = supporterVals.length > 0 ? supporterVals.reduce((a, b) => a + b, 0) / supporterVals.length : null;
  const hasChartData = !chartLoading && chartData.length > 0;

  // 현재 공대(페이지) 슬라이스
  const partyStart = partyIndex * PARTY_SIZE;
  const partyEntries = hof.slice(partyStart, partyStart + PARTY_SIZE);
  const maxPartyIndex = TOTAL_PARTIES - 1;

  // 등록 섹션 (시상대 바로 아래에 배치하기 위해 분리 렌더)
  const registrationSection = registrationMode === 'party' ? (
    <section className={`${styles.cardBlock} shadow-hard`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionLabel}>
          <span className={styles.sectionOrnament} />
          <div>
            <div className={styles.sectionKicker}>Register · Party</div>
            <h2 className={styles.sectionTitle}>공대 등록</h2>
            <div className={styles.sectionSub}>
              명예의 전당 {PARTY_SIZE * TOTAL_PARTIES}석이 채워질 때까지는 <strong>8인 공대 단위</strong>로만 등록됩니다. (남은 자리 {PARTY_SIZE * TOTAL_PARTIES - hof.length}명)
            </div>
          </div>
        </div>
      </div>

      {!isReleased ? (
        <div className={styles.partyLocked}>
          <div className={styles.lockedTitle}>아직 등록 기간이 아닙니다</div>
          <div className={styles.lockedDesc}>
            <RaidTag /> 레이드 오픈 이후부터 공대 등록이 가능합니다.
          </div>
        </div>
      ) : (
        <>
          <div className={styles.partyNameField}>
            <label className={styles.partyNameLabel}>공대 이름</label>
            <Form.Control
              type="text"
              placeholder="우리 공대 이름을 입력하세요"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className={styles.partyNameInput}
              disabled={partyRegistering}
            />
          </div>

          <div className={styles.slotGrid}>
            {Array.from({ length: PARTY_SIZE }).map((_, i) => {
              const slot = partySlots[i];
              const err = slotErrors[i];
              const searching = slotSearchingIndex === i;
              const matchTitle = slot && (TEST_BYPASS_TITLE || slot.title === selectedRaid.titleName);
              const isSup = slot?.role === 'supporter';
              const needsRolePick = !!slot && isHybridClass(slot.className) && slot.role === null;

              return (
                <div key={i} className={`${styles.slot} ${matchTitle ? styles.slotOk : ''} ${slot && !matchTitle ? styles.slotBad : ''}`}>
                  <div className={styles.slotHead}>
                    <span className={styles.slotNumber}>{i + 1}</span>
                    <Form.Control
                      type="text"
                      placeholder={`${i + 1}번째 공대원 닉네임`}
                      value={slotSearchNames[i]}
                      onChange={(e) => handleSlotNameChange(i, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSlotSearch(i)}
                      className={styles.slotInput}
                      disabled={searching || partyRegistering || !!slot}
                    />
                    {slot ? (
                      <button
                        type="button"
                        className={styles.slotClearBtn}
                        onClick={() => handleSlotClear(i)}
                        disabled={partyRegistering}
                        aria-label="비우기"
                      >
                        ×
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.slotSearchBtn}
                        onClick={() => handleSlotSearch(i)}
                        disabled={searching || !slotSearchNames[i]?.trim() || partyRegistering}
                      >
                        {searching ? '…' : '검색'}
                      </button>
                    )}
                  </div>

                  {err && <div className={styles.slotErrorText}>{err}</div>}

                  {slot && (
                    <div className={styles.slotPreview}>
                      <div className={styles.slotImageWrap}>
                        {slot.image ? (
                          <Image src={slot.image} alt={slot.name} width={100} height={125} className={styles.slotImage} unoptimized referrerPolicy="no-referrer" />
                        ) : (
                          <div className={styles.slotImageFallback}>{slot.className}</div>
                        )}
                      </div>
                      <div className={styles.slotInfo}>
                        <div className={styles.slotInfoTop}>
                          <span className={styles.slotCharName}>{slot.name}</span>
                          {isHybridClass(slot.className) ? (
                            <div className={styles.roleToggle}>
                              <button
                                type="button"
                                className={`${styles.roleToggleBtn} ${slot.role === 'dealer' ? styles.roleToggleDealerActive : ''}`}
                                onClick={() => handleSlotRoleChange(i, 'dealer')}
                                disabled={partyRegistering}
                              >
                                딜러
                              </button>
                              <button
                                type="button"
                                className={`${styles.roleToggleBtn} ${slot.role === 'supporter' ? styles.roleToggleSupporterActive : ''}`}
                                onClick={() => handleSlotRoleChange(i, 'supporter')}
                                disabled={partyRegistering}
                              >
                                서포터
                              </button>
                            </div>
                          ) : (
                            <span className={`${styles.slotRoleTag} ${isSup ? styles.roleSupporterBg : styles.roleDealerBg}`}>
                              {isSup ? '서포터' : '딜러'}
                            </span>
                          )}
                        </div>
                        <div className={styles.slotClass}>{slot.className}</div>
                        <div className={styles.slotStats}>
                          <span className={styles.slotStatPower}>{slot.combatPower || '-'}<span className={styles.slotStatUnit}>점</span></span>
                          <span className={styles.slotStatLevel}>Lv.{slot.itemLevel}</span>
                        </div>
                        <div className={styles.slotTitleCheck}>
                          {matchTitle ? (
                            <span className={styles.slotTitleOk}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3 7.5L6 10L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <RaidTag /> 확인
                            </span>
                          ) : (
                            <span className={styles.slotTitleBad}>
                              착용 칭호: {slot.title || '미착용'}
                            </span>
                          )}
                        </div>
                        {needsRolePick && (
                          <div className={styles.slotRoleHint}>딜러 / 서포터 선택 필요</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.partyFooter}>
            <div className={styles.partyFooterInfo}>
              {!partyName.trim() && <span>공대 이름을 입력해 주세요.</span>}
              {partyName.trim() && !allSlotsValid && (
                <span>
                  {partySlots.filter(s => s && s.title === selectedRaid.titleName).length}/{PARTY_SIZE}명 확인 완료 · 8명 모두 <RaidTag /> 칭호를 착용해야 등록됩니다.
                </span>
              )}
              {partyName.trim() && allSlotsValid && noDuplicateNames && (
                <span className={styles.partyFooterReady}>등록 준비 완료.</span>
              )}
              {!noDuplicateNames && (
                <span className={styles.partyFooterError}>중복된 캐릭터가 있습니다.</span>
              )}
            </div>
            <button
              type="button"
              className={styles.partySubmitBtn}
              onClick={handlePartyRegister}
              disabled={!canRegisterParty}
            >
              {partyRegistering ? '공대 등록 중...' : '공대 등록하기'}
            </button>
          </div>

          {partyMessage && (
            <div className={`${styles.saveMessage} ${partyMessage.type === 'success' ? styles.saveSuccess : styles.saveError}`}>
              {partyMessage.text}
            </div>
          )}
        </>
      )}
    </section>
  ) : (
    <section className={`${styles.cardBlock} ${styles.indSection} shadow-hard`}>
      <div className={`${styles.sectionHeader} ${styles.indHeader}`}>
        <div className={styles.sectionKicker}>Register · Individual</div>
        <h2 className={styles.sectionTitle}>내 전투력 등록</h2>
        <div className={styles.sectionSub}>
          <RaidTag /> 칭호 착용 후 검색
        </div>
      </div>

      <div className={styles.indSearchRow}>
        <Form.Control
          type="text"
          placeholder="캐릭터명을 입력하세요"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className={styles.searchInput}
          disabled={searching || !isReleased}
        />
        <button
          className={styles.searchButton}
          onClick={handleSearch}
          disabled={searching || !searchName.trim() || !isReleased}
        >
          {searching ? '검색 중…' : '검색'}
        </button>
      </div>
      <div className={styles.indHint}>칭호 미반영 시 영지 이동 후 재검색</div>
      {searchError && <div className={styles.searchError}>{searchError}</div>}

      {profile && (
        <div className={styles.indProfile}>
          {profile.image ? (
            <div className={styles.indProfileImage}>
              <Image src={profile.image} alt={profile.name} width={200} height={300} className={styles.profileImage} unoptimized referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className={`${styles.indProfileImage} ${styles.indProfileImageEmpty}`}>{profile.className}</div>
          )}
          <div className={styles.indProfileInfo}>
            <div className={styles.indProfileHead}>
              <span className={styles.indProfileName}>{profile.name}</span>
              {isHybridClass(profile.className) ? (
                <div className={styles.roleToggle}>
                  <button
                    type="button"
                    className={`${styles.roleToggleBtn} ${profile.role === 'dealer' ? styles.roleToggleDealerActive : ''}`}
                    onClick={() => setProfile({ ...profile, role: 'dealer' })}
                  >
                    딜러
                  </button>
                  <button
                    type="button"
                    className={`${styles.roleToggleBtn} ${profile.role === 'supporter' ? styles.roleToggleSupporterActive : ''}`}
                    onClick={() => setProfile({ ...profile, role: 'supporter' })}
                  >
                    서포터
                  </button>
                </div>
              ) : (
                <span className={`${styles.profileRole} ${profile.role === 'supporter' ? styles.roleSupporterBg : styles.roleDealerBg}`}>
                  {profile.role === 'supporter' ? '서포터' : '딜러'}
                </span>
              )}
            </div>
            <div className={styles.indProfileRow}>
              <span className={styles.indProfileLabel}>직업</span>
              <span className={styles.indProfileValue}>{profile.className}</span>
            </div>
            <div className={styles.indProfileRow}>
              <span className={styles.indProfileLabel}>레벨</span>
              <span className={styles.indProfileValue}>Lv. {profile.itemLevel}</span>
            </div>
            <div className={styles.indProfileRow}>
              <span className={styles.indProfileLabel}>전투력</span>
              <span className={`${styles.indProfileValue} ${styles.indProfileValuePower}`}>{profile.combatPower || '-'}</span>
            </div>
            <div className={styles.indProfileRow}>
              <span className={styles.indProfileLabel}>칭호</span>
              <span className={
                hasMatchingTitle
                  ? (isIce ? styles.titleMatchIce : styles.titleMatchFire)
                  : styles.titleNoMatch
              }>
                {profile.title || '미착용'}
              </span>
            </div>
            {hasMatchingTitle ? (
              <>
                {isHybridClass(profile.className) && profile.role === null && (
                  <div className={styles.roleHint}>
                    {profile.className}은(는) 딜러 / 서포터 모두 가능합니다. 위에서 본인 역할을 선택해주세요.
                  </div>
                )}
                <button className={styles.saveButton} onClick={handleSave} disabled={saving || profile.role === null}>
                  {saving ? '저장 중...' : profile.role === null ? '역할 선택 필요' : '통계에 등록하기'}
                </button>
                {saveMessage && (
                  <div className={`${styles.saveMessage} ${saveMessage.type === 'success' ? styles.saveSuccess : styles.saveError}`}>
                    {saveMessage.text}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noTitleMessage}>
                <RaidTag /> 칭호 미착용
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className={`${styles.page} ${frost.frostPage}`}>
      {/* ═══════════════════════ 시상대 섹션: 히어로 + 탭 + HOF (한몸) ═══════════════════════ */}
      <div className={styles.stageSection}>
        {/* 히어로: EvilEye */}
        <div className={styles.eyeHero} aria-label={selectedRaid.titleName}>
          <div className={styles.eyeCanvas}>
            <EvilEye
              eyeColor={selectedRaid.eyeColor}
              intensity={1.55}
              pupilSize={0.6}
              irisWidth={0.25}
              glowIntensity={0.38}
              scale={0.75}
              noiseScale={1.0}
              pupilFollow={1.0}
              flameSpeed={isIce ? 0.6 : 1.0}
              backgroundColor="#000000"
            />
          </div>
          <div className={styles.eyeTextOverlay}>
            <h1 className={styles.eyeTitle}>{selectedRaid.titleName}</h1>
            <div className={styles.eyeSubtitle}>{selectedRaid.subtitle}</div>
          </div>
        </div>

        {/* ═══════════════════════ 명예의 전당 ═══════════════════════ */}
        <section className={styles.hofSection}>
          <div className={styles.hofHeader}>
            <div className={styles.hofKicker}>Hall of Flame</div>
            <h2 className={styles.hofTitle}>명예의 전당</h2>
            <div className={styles.hofSubtitle}>
              <RaidTag /> 칭호를 각인한 {PARTY_SIZE * TOTAL_PARTIES}명
            </div>
          </div>

          {!isReleased ? (
            <div className={styles.hofEmpty}>
              <div className={styles.hofEmptyTitle}>아직 명예의 전당이 열리지 않았습니다</div>
              <div className={styles.hofEmptyDesc}>
                <RaidTag /> 레이드가 공개되는 순간 가장 빠른 8명이 1공대에 이름을 올립니다.
              </div>
            </div>
          ) : (
            <>
              <div className={styles.hofNav}>
                <button
                  type="button"
                  className={styles.hofNavBtn}
                  onClick={() => setPartyIndex(i => Math.max(0, i - 1))}
                  disabled={partyIndex === 0}
                  aria-label="이전 공대"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className={styles.hofNavLabel}>
                  <span className={styles.hofPartyTag}>PARTY {partyIndex + 1}</span>
                  <span className={styles.hofPartyName}>{partyIndex + 1}공대</span>
                  <div className={styles.hofDots}>
                    {Array.from({ length: TOTAL_PARTIES }).map((_, i) => (
                      <span
                        key={i}
                        className={`${styles.hofDot} ${i === partyIndex ? styles.hofDotActive : ''}`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.hofNavBtn}
                  onClick={() => setPartyIndex(i => Math.min(maxPartyIndex, i + 1))}
                  disabled={partyIndex >= maxPartyIndex}
                  aria-label="다음 공대"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className={`${styles.partyRow} ${partyIndex === 0 ? styles.partyRowGold : ''}`}>
                {/* 공대 이름 — 이름만 */}
                <div className={`${styles.partyNameBanner} ${partyIndex === 0 ? styles.partyNameBannerGold : ''}`}>
                  <h3 className={styles.partyNameText}>
                    {partyEntries[0]?.partyName || `${partyIndex + 1}공대`}
                  </h3>
                </div>
                <div className={styles.partyGrid}>
                  {Array.from({ length: PARTY_SIZE }).map((_, slot) => {
                    const entry = partyEntries[slot];
                    if (!entry) {
                      return (
                        <div key={slot} className={`${styles.fameCard} ${styles.fameCardEmpty}`}>
                          <div className={styles.fameEmptyText}>공석</div>
                        </div>
                      );
                    }
                    return (
                      <div key={entry.id} className={styles.fameCard}>
                        <div className={styles.fameImageWrap}>
                          {entry.characterImage ? (
                            <Image
                              src={entry.characterImage}
                              alt={entry.characterName}
                              width={300}
                              height={450}
                              className={styles.fameImage}
                              unoptimized
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={styles.fameImagePlaceholder}>
                              <span className={styles.fameImageClassName}>{entry.characterClass}</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.fameInfoOverlay}>
                          <div className={styles.fameTitleBar}>
                            <Image src={selectedRaid.image} alt="" width={14} height={14} className={styles.fameTitleBarLogo} />
                            <span className={styles.fameTitleBarName}>{selectedRaid.titleName}</span>
                            <span className={styles.fameTitleBarDivider} />
                            <span className={styles.fameTitleBarClass}>{entry.characterClass}</span>
                          </div>
                          <div className={styles.fameName}>{entry.characterName}</div>
                          <div className={styles.fameLevel}>
                            Lv.{entry.itemLevel.toFixed(2)}
                          </div>
                          <div className={styles.famePower}>
                            <span className={styles.famePowerLabel}>전투력:</span>
                            <span className={styles.famePowerValue}>{entry.combatPower.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ═══════════════════════ 하단 섹션 ═══════════════════════ */}
      <div className={styles.container}>
        <div className={styles.lowerSections}>

          {/* 등록 섹션 — 시상대 바로 아래 */}
          {registrationSection}

          {/* 차트 */}
          <section className={`${styles.cardBlock} shadow-hard`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>
                <span className={styles.sectionOrnament} />
                <div>
                  <div className={styles.sectionKicker}>Chart</div>
                  <h2 className={styles.sectionTitle}>칭호 전투력 추이</h2>
                  <div className={styles.sectionSub}>딜러/서포터 누적 평균 {chartMode === 'power' ? '전투력' : '레벨'} · 점에 커서를 올리면 당일 평균 표시</div>
                </div>
              </div>
              <div className={styles.chartToolbar}>
                <button
                  className={`${styles.chartToolbarBtn} ${chartMode === 'power' ? styles.chartToolbarActive : ''}`}
                  onClick={() => setChartMode('power')}
                >
                  전투력
                </button>
                <button
                  className={`${styles.chartToolbarBtn} ${chartMode === 'level' ? styles.chartToolbarActive : ''}`}
                  onClick={() => setChartMode('level')}
                >
                  레벨
                </button>
              </div>
            </div>

            {!isReleased ? (
              <div className={styles.lockedChart}>
                <div className={styles.lockedTitle}>아직 데이터가 없습니다</div>
                <div className={styles.lockedDesc}>
                  <RaidTag /> 레이드 오픈 이후 클리어 전투력이 집계됩니다.
                </div>
              </div>
            ) : (
              <>
                <div className={styles.legendRow}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: '#dc3545' }} /> 딜러
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: '#3b82f6' }} /> 서포터
                  </div>
                  <div className={styles.legendItem}>
                    <svg width="26" height="4"><line x1="0" y1="2" x2="26" y2="2" stroke="#dc3545" strokeWidth="2" strokeDasharray="5 3" /></svg>
                    딜러 평균
                  </div>
                  <div className={styles.legendItem}>
                    <svg width="26" height="4"><line x1="0" y1="2" x2="26" y2="2" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 3" /></svg>
                    서포터 평균
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  {chartLoading ? (
                    <div className={styles.chartPlaceholder}>데이터 로딩 중...</div>
                  ) : !hasChartData ? (
                    <div className={styles.chartPlaceholder}>아직 등록된 데이터가 없습니다</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={420}>
                      <ComposedChart data={chartData} margin={{ top: 20, right: isMobile ? 8 : 30, left: isMobile ? -8 : 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="5 5" stroke="var(--border-color)" vertical horizontal />
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
                          tick={{ fontSize: isMobile ? 11 : 13, fill: 'var(--text-primary)', fontWeight: 700 }}
                          tickFormatter={(v: number) => v.toLocaleString()}
                          domain={chartMode === 'level' ? ['dataMin - 3', 'dataMax + 3'] : ['dataMin - 300', 'dataMax + 300']}
                          allowDecimals={false}
                          tickCount={6}
                          width={isMobile ? 54 : (chartMode === 'power' ? 64 : 54)}
                          stroke="var(--text-secondary)"
                          strokeWidth={2}
                          axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                          tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                        />
                        <RechartsTooltip
                          cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '3 3' }}
                          content={(props) => {
                            type TooltipPayload = { dataKey?: string | number; value?: number | string; payload?: DailyChartData };
                            const { active, payload, label } = props as unknown as {
                              active?: boolean;
                              payload?: TooltipPayload[];
                              label?: string | number;
                            };
                            if (!active || !payload || payload.length === 0) return null;
                            const { month, day } = parseDateParts(String(label));
                            const datum = payload[0]?.payload;
                            const dailyDealerKey = chartMode === 'power' ? 'dealerPowerDaily' : 'dealerLevelDaily';
                            const dailySupporterKey = chartMode === 'power' ? 'supporterPowerDaily' : 'supporterLevelDaily';
                            const dealer = payload.find((p) => String(p.dataKey).includes('dealer'));
                            const supporter = payload.find((p) => String(p.dataKey).includes('supporter'));
                            const dealerDaily = datum?.[dailyDealerKey];
                            const supporterDaily = datum?.[dailySupporterKey];
                            const dealerDailyCount = datum?.dealerCountDaily ?? 0;
                            const supporterDailyCount = datum?.supporterCountDaily ?? 0;
                            const fmt = (v: number | null | undefined) =>
                              v != null ? `${Number(v).toLocaleString()}${suffix}` : '-';
                            return (
                              <div className={styles.tooltip}>
                                <div className={styles.tooltipDate}>{month}월 {day}일</div>
                                {dealer && (
                                  <div className={styles.tooltipRow}>
                                    <span className={styles.tooltipDot} style={{ background: '#dc3545' }} />
                                    <span className={styles.tooltipLabel}>딜러 누적</span>
                                    <span className={styles.tooltipValue}>{fmt(dealer.value as number | null | undefined)}</span>
                                  </div>
                                )}
                                {dealer && dealerDailyCount > 0 && (
                                  <div className={styles.tooltipRow}>
                                    <span className={styles.tooltipDot} style={{ background: '#dc3545', opacity: 0.35 }} />
                                    <span className={styles.tooltipLabel}>당일 ({dealerDailyCount}명)</span>
                                    <span className={styles.tooltipValue}>{fmt(dealerDaily)}</span>
                                  </div>
                                )}
                                {supporter && (
                                  <div className={styles.tooltipRow}>
                                    <span className={styles.tooltipDot} style={{ background: '#3b82f6' }} />
                                    <span className={styles.tooltipLabel}>서포터 누적</span>
                                    <span className={styles.tooltipValue}>{fmt(supporter.value as number | null | undefined)}</span>
                                  </div>
                                )}
                                {supporter && supporterDailyCount > 0 && (
                                  <div className={styles.tooltipRow}>
                                    <span className={styles.tooltipDot} style={{ background: '#3b82f6', opacity: 0.35 }} />
                                    <span className={styles.tooltipLabel}>당일 ({supporterDailyCount}명)</span>
                                    <span className={styles.tooltipValue}>{fmt(supporterDaily)}</span>
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
                          isAnimationActive
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
                          isAnimationActive
                        />
                        {dealerLineAvg != null && (
                          <ReferenceLine y={dealerLineAvg} stroke="#dc3545" strokeOpacity={0.45} strokeDasharray="6 5" strokeWidth={1.5} />
                        )}
                        {supporterLineAvg != null && (
                          <ReferenceLine y={supporterLineAvg} stroke="#3b82f6" strokeOpacity={0.45} strokeDasharray="6 5" strokeWidth={1.5} />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            )}
          </section>

          {/* 요약 리본 */}
          <section className={`${styles.summaryRibbon}`}>
            <div className={`${styles.summaryItem} ${styles.summaryTotal}`}>
              <span className={styles.summaryLabel}>
                <span className={styles.summaryDot} style={{ background: '#c16420' }} />
                총 등록 인원
              </span>
              <span className={styles.summaryValue}>
                {summary ? summary.totalClears.toLocaleString() : '-'}
                <span className={styles.summaryUnit}>명</span>
              </span>
              <span className={styles.summaryNote}>
                딜러 {summary?.dealerCount ?? 0}명 · 서포터 {summary?.supporterCount ?? 0}명
              </span>
            </div>
            <span className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>
                <span className={styles.summaryDot} style={{ background: '#dc3545' }} />
                딜러 평균 전투력
              </span>
              <span className={styles.summaryValue}>
                {summary?.dealerAvgPower ? summary.dealerAvgPower.toLocaleString() : '-'}
                <span className={styles.summaryUnit}>점</span>
              </span>
              <span className={styles.summaryNote}>전체 {summary?.dealerCount ?? 0}명 기준</span>
            </div>
            <span className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>
                <span className={styles.summaryDot} style={{ background: '#3b82f6' }} />
                서포터 평균 전투력
              </span>
              <span className={styles.summaryValue}>
                {summary?.supporterAvgPower ? summary.supporterAvgPower.toLocaleString() : '-'}
                <span className={styles.summaryUnit}>점</span>
              </span>
              <span className={styles.summaryNote}>전체 {summary?.supporterCount ?? 0}명 기준</span>
            </div>
          </section>

          {/* === 혹한의 군주 칭호 보유자 (직업별 통계 위) === */}
          <section className={`${styles.cardBlock} shadow-hard`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>
                <span className={styles.sectionOrnament} />
                <div>
                  <div className={styles.sectionKicker}>Title Holders</div>
                  <h2 className={styles.sectionTitle}>혹한의 군주 칭호 보유자</h2>
                  <div className={styles.sectionSub}>
                    <RaidTag /> 칭호를 등록한 전체 명단
                    {filteredHunters.length > 0 && (
                      <> · <span className={frost.huntersCount}>{filteredHunters.length}명</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* 정렬/역할 필터 — 헤더 우측 inline */}
              <div className={frost.huntersToolbar}>
                <div className={frost.huntersToolbarGroup}>
                  <span className={frost.huntersToolbarLabel}>정렬</span>
                  <button
                    type="button"
                    className={`${frost.huntersToolbarBtn} ${sortMode === 'created' ? frost.huntersToolbarBtnActive : ''}`}
                    onClick={() => setSortMode('created')}
                  >
                    등록순
                  </button>
                  <button
                    type="button"
                    className={`${frost.huntersToolbarBtn} ${sortMode === 'power' ? frost.huntersToolbarBtnActive : ''}`}
                    onClick={() => setSortMode('power')}
                  >
                    전투력순
                  </button>
                  <button
                    type="button"
                    className={`${frost.huntersToolbarBtn} ${sortMode === 'level' ? frost.huntersToolbarBtnActive : ''}`}
                    onClick={() => setSortMode('level')}
                  >
                    레벨순
                  </button>
                </div>
                <span className={frost.huntersToolbarDivider} />
                <div className={frost.huntersToolbarGroup}>
                  <span className={frost.huntersToolbarLabel}>역할</span>
                  <button
                    type="button"
                    className={`${frost.huntersToolbarBtn} ${roleFilter === 'all' ? frost.huntersToolbarBtnActive : ''}`}
                    onClick={() => setRoleFilter('all')}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    className={`${frost.huntersToolbarBtn} ${roleFilter === 'dealer' ? frost.huntersToolbarBtnActive : ''}`}
                    onClick={() => setRoleFilter('dealer')}
                  >
                    딜러
                  </button>
                  <button
                    type="button"
                    className={`${frost.huntersToolbarBtn} ${roleFilter === 'supporter' ? frost.huntersToolbarBtnActive : ''}`}
                    onClick={() => setRoleFilter('supporter')}
                  >
                    서포터
                  </button>
                </div>
              </div>
            </div>

            <div className={frost.huntersGrid}>
              {filteredHunters.length === 0 ? (
                <div className={frost.huntersEmpty}>
                  {allHunters.length === 0
                    ? '아직 등록자가 없습니다 — 혹한의 군주 칭호를 가장 먼저 획득해주세요.'
                    : '조건에 맞는 등록자가 없습니다.'}
                </div>
              ) : (
                filteredHunters.map((entry, idx) => {
                  const isSup = entry.role === 'supporter';
                  return (
                    <div key={entry.id} className={`${frost.huntersCard} shadow-hard`}>
                      <div className={frost.huntersImageWrap}>
                        {entry.characterImage ? (
                          <Image
                            src={entry.characterImage}
                            alt={entry.characterName}
                            width={200}
                            height={300}
                            className={frost.huntersImage}
                            unoptimized
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={frost.huntersImagePlaceholder}>
                            {entry.characterClass}
                          </div>
                        )}
                        <span
                          className={`${frost.huntersRankTag} ${
                            idx === 0 ? frost.huntersRankTop1
                              : idx === 1 ? frost.huntersRankTop2
                              : idx === 2 ? frost.huntersRankTop3
                              : ''
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </div>
                      <div className={frost.huntersInfo}>
                        <div className={frost.huntersName}>{entry.characterName}</div>
                        <div className={frost.huntersClass}>{entry.characterClass}</div>
                        <div className={frost.huntersPower}>
                          {entry.combatPower.toLocaleString()}점
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 직업별 통계 */}
          <section className={`${styles.cardBlock} shadow-hard`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionLabel}>
                <span className={styles.sectionOrnament} />
                <div>
                  <div className={styles.sectionKicker}>Classes</div>
                  <h2 className={styles.sectionTitle}>직업별 통계</h2>
                  <div className={styles.sectionSub}>등록 인원이 많은 순</div>
                </div>
              </div>
            </div>
            {classStats.length === 0 ? (
              <div className={styles.classEmpty}>
                {isReleased ? '데이터가 쌓이면 직업별 평균이 표시됩니다' : '오픈 이후 등록된 데이터가 집계됩니다'}
              </div>
            ) : (
              <div className={styles.classList}>
                {(() => {
                  const maxCount = Math.max(...classStats.map(s => s.count), 1);
                  return classStats.map((c, i) => {
                    const widthPct = (c.count / maxCount) * 100;
                    const isSup = c.role === 'supporter';
                    return (
                      <div key={`${c.className}-${c.role}`} className={`${styles.classCard} ${i < 3 ? styles.classCardTop : ''}`}>
                        <div className={styles.classCardBody}>
                          <div className={styles.classCardTopRow}>
                            <span className={styles.classCardName}>{c.className}</span>
                            <span className={`${styles.classCardRoleTag} ${isSup ? styles.roleSupporterBg : styles.roleDealerBg}`}>
                              {isSup ? '서포터' : '딜러'}
                            </span>
                          </div>
                          <div className={styles.classCardStatRow}>
                            <span className={styles.classCardStat}>
                              <span className={styles.classCardStatNum}>{c.count}</span>명
                            </span>
                            <span className={styles.classCardStat}>
                              전투력 <span className={styles.classCardStatNum}>{c.avgPower.toLocaleString()}</span>
                            </span>
                          </div>
                          <div className={styles.classBar}>
                            <span
                              className={`${styles.classBarFill} ${isSup ? styles.supporterBg : styles.dealerBg}`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
