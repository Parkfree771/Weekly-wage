'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Card, Button, Form, Spinner, Alert, Modal } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { registerCharacter, saveWeeklyChecklist, refreshCharacter, updateCharacterImages } from '@/lib/user-service';
import { validateNickname, checkNicknameAvailable } from '@/lib/nickname-service';
import NicknameModal from '@/components/auth/NicknameModal';
import { raids } from '@/data/raids';
import {
  Character,
  WeeklyChecklist,
  WeeklyGoldRecord,
  CommonContentState,
  DailyContentState,
  getTop3RaidGroups,
  getRaidGroupName,
  raidGroupImages,
  createEmptyWeeklyState,
  getRaidsForLevel,
  needsWeeklyReset,
  resetWeeklyChecklist,
  getWeekLabel,
  getCurrentWeekStart,
  calculateTotalGoldFromChecklist,
} from '@/types/user';
import WeeklyGoldChart from '@/components/WeeklyGoldChart';
import styles from './mypage.module.css';

// 레이드 그룹별 가능한 난이도 가져오기
function getAvailableDifficulties(groupName: string, itemLevel: number) {
  const availableRaids = getRaidsForLevel(itemLevel);
  return availableRaids
    .filter(raid => getRaidGroupName(raid.name) === groupName)
    .sort((a, b) => b.level - a.level); // 높은 난이도 순
}

// 모든 레이드 그룹 가져오기 (레벨에 맞는)
function getAllRaidGroups(itemLevel: number) {
  const availableRaids = getRaidsForLevel(itemLevel);
  const groups: string[] = [];

  availableRaids.forEach(raid => {
    const groupName = getRaidGroupName(raid.name);
    if (!groups.includes(groupName)) {
      groups.push(groupName);
    }
  });

  return groups;
}

// 원정대 공통 컨텐츠 정의
const COMMON_CONTENTS = [
  { name: '운수대통 복 주머니', shortName: '복', image: '/lucky-pouch.webp', color: '#e6a817', days: [1, 4, 6, 0], maxChecks: 3 },
  { name: '카오스 게이트', shortName: '카게', image: '/chaos-gate.webp', color: '#6b21a8', days: [1, 4, 6, 0] },
  { name: '필드보스', shortName: '필보', image: '/field-boss.webp', color: '#b91c1c', days: [2, 5, 0] },
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKLY_DAY_LABELS = ['수', '목', '금', '토', '일', '월', '화'];

// 카던 레벨별 라벨 (1730+ 균열, 1640+ 전선, 미만 카던)
function getChaosDungeonLabel(itemLevel: number): string {
  if (itemLevel >= 1730) return '1730 균열';
  if (itemLevel >= 1720) return '1720 전선';
  if (itemLevel >= 1700) return '1700 전선';
  if (itemLevel >= 1680) return '1680 전선';
  if (itemLevel >= 1660) return '1660 전선';
  if (itemLevel >= 1640) return '1640 전선';
  return '카던';
}

// 가토 레벨별 라벨
function getGuardianRaidLabel(itemLevel: number): string {
  if (itemLevel >= 1730) return '1730 가토';
  if (itemLevel >= 1720) return '1720 가토';
  if (itemLevel >= 1700) return '1700 가토';
  if (itemLevel >= 1680) return '1680 가토';
  if (itemLevel >= 1640) return '1640 가토';
  return '가토';
}
// JS dayOfWeek → 주간 인덱스 (수=0 ~ 화=6)
const WEEKLY_DAY_MAP: Record<number, number> = { 3: 0, 4: 1, 5: 2, 6: 3, 0: 4, 1: 5, 2: 6 };

const EMPTY_DAILY: DailyContentState = { checks: new Array(7).fill(false), restGauge: 0 };

// 현재 휴식게이지 계산 (체크한 날 소모분만 반영, 미완료 누적은 주간 초기화 시)
function computeCurrentRest(state: DailyContentState): number {
  let rest = state.restGauge;
  for (let i = 0; i < 7; i++) {
    if (state.checks[i]) {
      if (rest >= 20) rest -= 20;
    }
  }
  return rest;
}

// KST 기준 현재 주 시작일(수요일 06시 기준) 및 요일 구하기
function getKSTWeekInfo() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  const dayOfWeek = kst.getUTCDay();
  return { weekStart: getCurrentWeekStart(), dayOfWeek };
}

export default function MyPage() {
  const router = useRouter();
  const { user, userProfile, loading, refreshUserProfile, signInWithGoogle, setNickname: updateNickname } = useAuth();

  // 상태
  const [characters, setCharacters] = useState<Character[]>([]);
  const [weeklyChecklist, setWeeklyChecklist] = useState<WeeklyChecklist>({});
  const [weeklyGoldHistory, setWeeklyGoldHistory] = useState<WeeklyGoldRecord[]>([]);
  const [commonContent, setCommonContent] = useState<CommonContentState>({ date: '', checks: {} });
  const [showAllCharacters, setShowAllCharacters] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const imageLoadAttempted = useRef(false);

  // 캐릭터 등록 모달 (2단계)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [registerName, setRegisterName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [allSiblings, setAllSiblings] = useState<Character[]>([]);
  const [selectedCharNames, setSelectedCharNames] = useState<Set<string>>(new Set());
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // 원정대 편집 모달
  const [showEditModal, setShowEditModal] = useState(false);

  // 갱신 중인 캐릭터
  const [refreshingChar, setRefreshingChar] = useState<string | null>(null);

  // 캐릭터별 마지막 갱신 시간 (5분 제한용)
  const [lastRefreshTime, setLastRefreshTime] = useState<Record<string, number>>({});

  // 레이드 확장 패널 열린 캐릭터
  const [expandedRaidChar, setExpandedRaidChar] = useState<string | null>(null);

  // 더보기 비용 드롭다운 열린 캐릭터
  const [moreGoldDropdownChar, setMoreGoldDropdownChar] = useState<string | null>(null);

  // 레이드 스크롤 인덱스 (캐릭터별)
  const [raidScrollIndex, setRaidScrollIndex] = useState<Record<string, number>>({});

  // 난이도 설정 열린 레이드 (캐릭터명-그룹명)
  const [difficultyOpenKey, setDifficultyOpenKey] = useState<string | null>(null);

  // 일일 컨텐츠 펼치기 상태 (localStorage 유지)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('mypage-expandedCards');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // 일일 컨텐츠 휴게 설정 열림 (charName-field)
  const [dailySettingsOpen, setDailySettingsOpen] = useState<string | null>(null);


  // 닉네임 변경
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [nicknameMessage, setNicknameMessage] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const nicknameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 프로필 데이터 로드 + 주간 초기화 체크
  useEffect(() => {
    if (!userProfile || !user) return;

    const chars = userProfile.characters || [];
    const checklist = userProfile.weeklyChecklist || {};
    const goldHistory = userProfile.weeklyGoldHistory || [];

    setCharacters(chars);
    setWeeklyChecklist(checklist);
    setWeeklyGoldHistory(goldHistory);

    // 공통 컨텐츠 로드 (주간 초기화 - 수요일 06시 기준)
    const { weekStart } = getKSTWeekInfo();
    const saved = userProfile.commonContent;
    if (saved && saved.date === weekStart) {
      setCommonContent(saved);
    } else {
      setCommonContent({ date: weekStart, checks: {} });
    }

    // 전체 원정대 목록도 로드
    if (userProfile.allCharacters && userProfile.allCharacters.length > 0) {
      setAllSiblings(userProfile.allCharacters);
    }

    // 주간 초기화 체크 (수요일 06:00 KST)
    if (chars.length > 0 && needsWeeklyReset(userProfile.lastWeeklyReset)) {
      console.log('[주간 초기화] 수요일 06시 지남, 체크리스트 초기화 시작');

      // 1. 먼저 현재 골드를 기록에 저장
      const { totalGold, raidGold, additionalGold } = calculateTotalGoldFromChecklist(chars, checklist);

      // 지난 주 시작일 계산 (현재 주 시작일 - 7일)
      const lastWeekStart = userProfile.lastWeeklyReset
        ? userProfile.lastWeeklyReset.split('T')[0]
        : getCurrentWeekStart();
      const lastWeekLabel = getWeekLabel(new Date(lastWeekStart));

      // 이미 저장된 주인지 체크
      const alreadySaved = goldHistory.some(h => h.weekStart === lastWeekStart);

      const newGoldRecord: WeeklyGoldRecord = {
        weekStart: lastWeekStart,
        weekLabel: lastWeekLabel,
        totalGold,
        raidGold,
        additionalGold,
        characterCount: chars.length,
      };

      // 2. 초기화
      const resetChecklist = resetWeeklyChecklist(checklist, chars);
      const resetCommon: CommonContentState = { date: getCurrentWeekStart(), checks: {} };
      const now = new Date().toISOString();

      // Firestore 업데이트
      (async () => {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase-client');
          const userRef = doc(db, 'users', user.uid);

          // 골드 기록 업데이트 (중복 방지)
          let updatedHistory = [...goldHistory];
          if (!alreadySaved && totalGold > 0) {
            updatedHistory.push(newGoldRecord);
            console.log('[주간 골드 저장]', newGoldRecord);
          }

          await updateDoc(userRef, {
            weeklyChecklist: resetChecklist,
            weeklyGoldHistory: updatedHistory,
            commonContent: resetCommon,
            lastWeeklyReset: now,
          });

          setWeeklyChecklist(resetChecklist);
          setWeeklyGoldHistory(updatedHistory);
          setCommonContent(resetCommon);
          console.log('[주간 초기화] 완료');
        } catch (error) {
          console.error('[주간 초기화] 실패:', error);
        }
      })();
    }
  }, [userProfile, user]);

  // 이미지 없는 캐릭터들의 이미지 로드
  useEffect(() => {
    if (!user || !userProfile || imageLoadAttempted.current) return;

    const charsWithoutImage = (userProfile.characters || [])
      .slice(0, 6)
      .filter(c => !c.imageUrl);

    if (charsWithoutImage.length === 0) return;

    imageLoadAttempted.current = true;
    setLoadingImages(true);

    updateCharacterImages(user.uid, charsWithoutImage.map(c => c.name))
      .then(result => {
        if (result.success) {
          refreshUserProfile();
        }
      })
      .finally(() => {
        setLoadingImages(false);
      });
  }, [user, userProfile, refreshUserProfile]);

  // 펼침 상태 localStorage 저장
  useEffect(() => {
    try { localStorage.setItem('mypage-expandedCards', JSON.stringify(expandedCards)); } catch {}
  }, [expandedCards]);

  // 로그인 체크 - 로그인 프롬프트를 표시하므로 리다이렉트 불필요

  // 창 닫을 때 변경사항 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // 닉네임 실시간 검증
  useEffect(() => {
    if (!newNickname) {
      setNicknameStatus('idle');
      setNicknameMessage('');
      return;
    }
    // 현재 닉네임과 동일하면 스킵
    if (userProfile?.nickname && newNickname === userProfile.nickname) {
      setNicknameStatus('idle');
      setNicknameMessage('현재 사용 중인 닉네임입니다.');
      return;
    }
    const validation = validateNickname(newNickname);
    if (!validation.valid) {
      setNicknameStatus('invalid');
      setNicknameMessage(validation.message);
      return;
    }
    setNicknameStatus('checking');
    setNicknameMessage('확인 중...');
    if (nicknameDebounceRef.current) clearTimeout(nicknameDebounceRef.current);
    nicknameDebounceRef.current = setTimeout(async () => {
      try {
        const available = await checkNicknameAvailable(newNickname);
        if (available) {
          setNicknameStatus('available');
          setNicknameMessage('사용 가능한 닉네임입니다.');
        } else {
          setNicknameStatus('taken');
          setNicknameMessage('이미 사용 중인 닉네임입니다.');
        }
      } catch {
        setNicknameStatus('invalid');
        setNicknameMessage('중복 확인에 실패했습니다.');
      }
    }, 500);
    return () => {
      if (nicknameDebounceRef.current) clearTimeout(nicknameDebounceRef.current);
    };
  }, [newNickname, userProfile?.nickname]);

  // 닉네임 변경 저장
  const handleSaveNickname = async () => {
    if (nicknameStatus !== 'available') return;
    setIsSavingNickname(true);
    try {
      await updateNickname(newNickname);
      setEditingNickname(false);
      setNewNickname('');
      setNicknameStatus('idle');
      setNicknameMessage('');
    } catch (err: any) {
      setNicknameMessage(err.message || '닉네임 변경에 실패했습니다.');
      setNicknameStatus('invalid');
    }
    setIsSavingNickname(false);
  };

  // 원정대 검색 (1단계)
  const handleSearchSiblings = async () => {
    if (!registerName.trim()) return;

    setIsSearching(true);
    setRegisterError(null);

    try {
      const response = await fetch(`/api/lostark?characterName=${encodeURIComponent(registerName.trim())}`);

      if (!response.ok) {
        if (response.status === 404) {
          setRegisterError('캐릭터를 찾을 수 없습니다.');
        } else {
          setRegisterError('캐릭터 정보를 가져오는데 실패했습니다.');
        }
        setIsSearching(false);
        return;
      }

      const data = await response.json();
      const siblings = data.siblings;

      if (!siblings || !Array.isArray(siblings) || siblings.length === 0) {
        setRegisterError('캐릭터 정보를 찾을 수 없습니다.');
        setIsSearching(false);
        return;
      }

      // 캐릭터 목록 생성
      const chars: Character[] = siblings.map((char: any) => ({
        name: char.CharacterName || '',
        server: char.ServerName || '',
        class: char.CharacterClassName || '',
        itemLevel: parseFloat(char.ItemAvgLevel?.replace(/,/g, '') || '0'),
        combatLevel: char.CharacterLevel || 0,
        imageUrl: '',
        lastUpdated: new Date().toISOString(),
      })).sort((a: Character, b: Character) => b.itemLevel - a.itemLevel);

      setAllSiblings(chars);
      // 상위 6개 자동 선택 (1640 이상만)
      const top6 = new Set(chars.filter(c => c.itemLevel >= 1640).slice(0, 6).map(c => c.name));
      setSelectedCharNames(top6);
      setRegisterStep(2);
    } catch (error) {
      setRegisterError('검색 중 오류가 발생했습니다.');
    }

    setIsSearching(false);
  };

  // 캐릭터 선택 토글
  const toggleCharacterSelection = (charName: string) => {
    setSelectedCharNames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(charName)) {
        newSet.delete(charName);
      } else if (newSet.size < 6) {
        newSet.add(charName);
      }
      return newSet;
    });
  };

  // 캐릭터 등록 (2단계)
  const handleRegister = async () => {
    if (!user || selectedCharNames.size === 0) return;

    setIsRegistering(true);
    setRegisterError(null);

    try {
      const selectedChars = allSiblings
        .filter(c => selectedCharNames.has(c.name))
        .sort((a, b) => b.itemLevel - a.itemLevel);

      // 주간 체크리스트 초기화
      const newChecklist: WeeklyChecklist = {};
      selectedChars.forEach(char => {
        newChecklist[char.name] = weeklyChecklist[char.name] || createEmptyWeeklyState(char.itemLevel);
      });

      // DB 저장 (전체 원정대 목록도 함께 저장)
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase-client');
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        characters: selectedChars,
        allCharacters: allSiblings,  // 전체 원정대 저장
        mainCharacter: selectedChars[0]?.name || '',
        weeklyChecklist: newChecklist,
        lastUpdated: new Date().toISOString(),
      });

      setCharacters(selectedChars);
      setWeeklyChecklist(newChecklist);
      closeRegisterModal();
      imageLoadAttempted.current = false;
      await refreshUserProfile();
    } catch (error) {
      setRegisterError('등록에 실패했습니다.');
    }

    setIsRegistering(false);
  };

  // 모달 닫기
  const closeRegisterModal = () => {
    setShowRegisterModal(false);
    setRegisterStep(1);
    setRegisterName('');
    setAllSiblings([]);
    setSelectedCharNames(new Set());
    setRegisterError(null);
  };

  // 원정대 편집 열기
  const openEditModal = () => {
    // 현재 선택된 캐릭터들 체크
    setSelectedCharNames(new Set(characters.map(c => c.name)));
    setShowEditModal(true);
  };

  // 원정대 편집 저장
  const handleEditSave = async () => {
    if (!user) return;

    setIsRegistering(true);

    try {
      const selectedChars = allSiblings.filter(c => selectedCharNames.has(c.name))
        .sort((a, b) => b.itemLevel - a.itemLevel);

      // 주간 체크리스트 유지하면서 업데이트
      const newChecklist: WeeklyChecklist = {};
      selectedChars.forEach(char => {
        newChecklist[char.name] = weeklyChecklist[char.name] || createEmptyWeeklyState(char.itemLevel);
      });

      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase-client');
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        characters: selectedChars,
        mainCharacter: selectedChars[0]?.name || '',
        weeklyChecklist: newChecklist,
      });

      setCharacters(selectedChars);
      setWeeklyChecklist(newChecklist);
      setShowEditModal(false);
      await refreshUserProfile();
    } catch (error) {
      console.error('편집 저장 실패:', error);
    }

    setIsRegistering(false);
  };

  // 캐릭터 갱신 (5분 제한)
  const canRefresh = (characterName: string) => {
    const lastTime = lastRefreshTime[characterName];
    if (!lastTime) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastTime >= fiveMinutes;
  };

  const getRemainingCooldown = (characterName: string) => {
    const lastTime = lastRefreshTime[characterName];
    if (!lastTime) return 0;
    const fiveMinutes = 5 * 60 * 1000;
    const remaining = fiveMinutes - (Date.now() - lastTime);
    return Math.max(0, Math.ceil(remaining / 1000));
  };

  const handleRefresh = async (characterName: string) => {
    if (!user || !canRefresh(characterName)) return;

    setRefreshingChar(characterName);
    const result = await refreshCharacter(characterName);

    if (result.success && result.character) {
      const updatedChar = result.character;

      // 로컬 상태 업데이트
      setCharacters(prev => {
        const newChars = prev.map(c => {
          if (c.name === characterName) {
            // 기존 이미지가 있고 새 이미지가 없으면 기존 이미지 유지
            if (c.imageUrl && !updatedChar.imageUrl) {
              return { ...updatedChar, imageUrl: c.imageUrl };
            }
            return updatedChar;
          }
          return c;
        });
        // 레벨 높은 순 재정렬
        return newChars.sort((a, b) => b.itemLevel - a.itemLevel);
      });

      setLastRefreshTime(prev => ({ ...prev, [characterName]: Date.now() }));
      setHasChanges(true);
    }

    setRefreshingChar(null);
  };

  // 레이드 전체 토글 (레이드 클릭 시)
  const toggleRaid = (charName: string, raidName: string) => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      const currentRaidState = charState.raids[raidName] || [];
      const allChecked = currentRaidState.length > 0 && currentRaidState.every(v => v);
      const newRaidState = currentRaidState.map(() => !allChecked);

      return {
        ...prev,
        [charName]: {
          ...charState,
          raids: {
            ...charState.raids,
            [raidName]: newRaidState,
          },
        },
      };
    });
    setHasChanges(true);
  };

  // 낙원/할의 모래시계/카던/가토 토글
  const toggleExtra = (charName: string, field: 'paradise' | 'sandOfTime' | 'chaosDungeon' | 'guardianRaid') => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      return {
        ...prev,
        [charName]: {
          ...charState,
          [field]: !charState[field],
        },
      };
    });
    setHasChanges(true);
  };

  // 일일 컨텐츠 (카던/가토) 요일별 토글
  const toggleDailyCheck = (charName: string, field: 'chaosDungeon' | 'guardianRaid', dayIdx: number) => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      const current: DailyContentState = charState[field] && typeof charState[field] === 'object'
        ? charState[field] as DailyContentState
        : { checks: new Array(7).fill(false), restGauge: 0 };
      const newChecks = [...current.checks];
      newChecks[dayIdx] = !newChecks[dayIdx];
      return {
        ...prev,
        [charName]: {
          ...charState,
          [field]: { ...current, checks: newChecks },
        },
      };
    });
    setHasChanges(true);
  };

  // 휴게 수동 설정
  const setRestGauge = (charName: string, field: 'chaosDungeon' | 'guardianRaid', value: number) => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      const current: DailyContentState = charState[field] && typeof charState[field] === 'object'
        ? charState[field] as DailyContentState
        : { checks: new Array(7).fill(false), restGauge: 0 };
      return {
        ...prev,
        [charName]: {
          ...charState,
          [field]: { ...current, restGauge: value },
        },
      };
    });
    setHasChanges(true);
  };

  // 공통 컨텐츠 토글 (key: "요일번호-컨텐츠명")
  const toggleCommonContent = (day: number, contentName: string) => {
    const key = `${day}-${contentName}`;
    const content = COMMON_CONTENTS.find(c => c.name === contentName);

    setCommonContent(prev => {
      const currentChecked = prev.checks[key] === true;

      // 체크 해제는 항상 가능
      if (currentChecked) {
        return { ...prev, checks: { ...prev.checks, [key]: false } };
      }

      // maxChecks 제한 체크
      if (content?.maxChecks) {
        const checkedCount = Object.entries(prev.checks)
          .filter(([k, v]) => k.endsWith(`-${contentName}`) && v === true)
          .length;
        if (checkedCount >= content.maxChecks) return prev;
      }

      return { ...prev, checks: { ...prev.checks, [key]: true } };
    });
    setHasChanges(true);
  };

  // 특정 컨텐츠의 현재 체크 수
  const getContentCheckCount = (contentName: string) => {
    return Object.entries(commonContent.checks)
      .filter(([k, v]) => k.endsWith(`-${contentName}`) && v === true)
      .length;
  };

  // 추가 골드 변경
  const updateAdditionalGold = (charName: string, value: number) => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      return {
        ...prev,
        [charName]: {
          ...charState,
          additionalGold: value,
        },
      };
    });
    setHasChanges(true);
  };

  // 레이드 난이도 변경 (그룹 내에서 다른 난이도로 교체)
  const changeRaidDifficulty = (charName: string, oldRaidName: string, newRaidName: string) => {
    if (oldRaidName === newRaidName) return;

    const newRaid = raids.find(r => r.name === newRaidName);
    if (!newRaid) return;

    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );

      // 기존 레이드 체크 상태 가져오기
      const wasChecked = charState.raids[oldRaidName]?.every(v => v) || false;

      // 기존 레이드 제거하고 새 레이드 추가
      const newRaids = { ...charState.raids };
      delete newRaids[oldRaidName];

      // 새 레이드 추가 (체크 상태 유지)
      newRaids[newRaidName] = new Array(newRaid.gates.length).fill(wasChecked);

      // 더보기 설정도 이전
      const newMoreGoldExclude = { ...(charState.raidMoreGoldExclude || {}) };
      if (oldRaidName in newMoreGoldExclude) {
        newMoreGoldExclude[newRaidName] = newMoreGoldExclude[oldRaidName];
        delete newMoreGoldExclude[oldRaidName];
      }

      return {
        ...prev,
        [charName]: {
          ...charState,
          raids: newRaids,
          raidMoreGoldExclude: newMoreGoldExclude,
        },
      };
    });
    setHasChanges(true);
  };

  // 레이드별 더보기 구매 토글 (체크 = 더보기 구매 = 골드 차감)
  const toggleRaidMoreGoldExclude = (charName: string, raidName: string) => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      const currentExclude = charState.raidMoreGoldExclude || {};
      // 기본값은 false (체크 안됨 = 더보기 안 함 = 풀 골드)
      const currentValue = currentExclude[raidName] === true;

      return {
        ...prev,
        [charName]: {
          ...charState,
          raidMoreGoldExclude: {
            ...currentExclude,
            [raidName]: !currentValue,
          },
        },
      };
    });
    setHasChanges(true);
  };

  // 더보기 비용 골드 제외 토글 (전체) - deprecated but kept for compatibility
  const toggleExcludeMoreGold = (charName: string) => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      // 기본값은 true (체크됨)
      const currentValue = charState.excludeMoreGold !== false;
      return {
        ...prev,
        [charName]: {
          ...charState,
          excludeMoreGold: !currentValue,
        },
      };
    });
    setHasChanges(true);
  };

  // 체크된 레이드 목록 가져오기
  const getCheckedRaids = (charName: string) => {
    const charState = weeklyChecklist[charName];
    if (!charState) return [];

    return Object.entries(charState.raids)
      .filter(([_, gates]) => gates.some(v => v))
      .map(([raidName]) => {
        const raid = raids.find(r => r.name === raidName);
        return raid ? { name: raidName, raid } : null;
      })
      .filter(Boolean) as { name: string; raid: typeof raids[0] }[];
  };

  // 저장 (캐릭터 정보 + 주간 체크리스트)
  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase-client');
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        characters,
        weeklyChecklist,
        commonContent,
      });

      setHasChanges(false);
      setSaveMessage({ type: 'success', text: '저장되었습니다.' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('저장 오류:', error);
      setSaveMessage({ type: 'error', text: '저장에 실패했습니다.' });
    }

    setIsSaving(false);
  };

  // 총 골드 계산
  const calculateTotalGold = useCallback(() => {
    let total = 0;

    characters.forEach(char => {
      const state = weeklyChecklist[char.name];
      if (!state) return;

      Object.entries(state.raids).forEach(([raidName, gates]) => {
        const raid = raids.find(r => r.name === raidName);
        if (raid) {
          // 레이드별 더보기 설정 확인 (체크 = 더보기 구매 = 비용 차감)
          const buyMore = state.raidMoreGoldExclude?.[raidName] === true;

          gates.forEach((checked, i) => {
            if (checked && raid.gates[i]) {
              if (buyMore) {
                // 더보기 구매: 골드 - 더보기 비용
                total += raid.gates[i].gold - raid.gates[i].moreGold;
              } else {
                // 더보기 안 함: 풀 골드
                total += raid.gates[i].gold;
              }
            }
          });
        }
      });

      total += state.additionalGold || 0;
    });

    return total;
  }, [characters, weeklyChecklist]);

  // 레이드 체크 여부 확인
  const isRaidChecked = (charName: string, raidName: string) => {
    const charState = weeklyChecklist[charName];
    if (!charState?.raids[raidName]) return false;
    const gates = charState.raids[raidName];
    return gates.length > 0 && gates.every(v => v);
  };

  // 로딩 중
  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <Container className="py-5 text-center">
          <Spinner animation="border" />
        </Container>
      </div>
    );
  }

  // 비로그인 - 로그인 안내 화면 표시
  if (!user) {
    return (
      <div className={styles.pageWrapper}>
        <Container className="py-5">
          <div className={styles.loginPrompt}>
            <h2 className={styles.loginTitle}>로그인이 필요합니다</h2>
            <p className={styles.loginDesc}>
              마이페이지를 이용하려면 로그인이 필요합니다.<br />
              Google 계정으로 간편하게 로그인하세요.
            </p>
            <button
              onClick={signInWithGoogle}
              className={styles.googleLoginBtn}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Google 로그인</span>
            </button>
            <button
              onClick={() => router.push('/')}
              className={styles.backHomeBtn}
            >
              홈으로 돌아가기
            </button>
          </div>

        </Container>
      </div>
    );
  }

  const displayCharacters = showAllCharacters ? characters : characters.slice(0, 6);

  // 데스크톱: 같은 줄 2캐릭 동시 펼침/닫힘
  const sortedChars = [...displayCharacters].sort((a, b) => b.itemLevel - a.itemLevel);
  const toggleDailyExpand = (charName: string) => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth > 900;
    setExpandedCards(prev => {
      const newState = !prev[charName];
      const next = { ...prev, [charName]: newState };
      if (isDesktop) {
        const idx = sortedChars.findIndex(c => c.name === charName);
        const partnerIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
        const partner = sortedChars[partnerIdx];
        if (partner) next[partner.name] = newState;
      }
      return next;
    });
  };

  return (
    <div className={styles.pageWrapper}>
      <Container fluid className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>마이페이지</h1>
          <div className={styles.headerRight}>
            <button
              className={styles.registerBtn}
              onClick={() => setShowRegisterModal(true)}
            >
              + 캐릭터 등록
            </button>
            {characters.length > 0 && (
              <button
                className={styles.editBtn}
                onClick={openEditModal}
              >
                원정대 편집
              </button>
            )}
            <button
              className={`${styles.saveButton} ${hasChanges ? styles.hasChanges : ''}`}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? <Spinner animation="border" size="sm" /> : '저장하기'}
            </button>
            <div className={styles.totalGoldBadge}>
              <span className={styles.goldLabel}>이번 주 예상</span>
              <span className={styles.goldAmount}>{calculateTotalGold().toLocaleString()}G</span>
            </div>
          </div>
        </div>

        {/* 닉네임 섹션 */}
        <div className={styles.nicknameSection}>
          {!editingNickname ? (
            <div className={styles.nicknameDisplay}>
              <span className={styles.nicknameLabel}>닉네임:</span>
              <span className={styles.nicknameValue}>
                {userProfile?.nickname || '미설정'}
              </span>
              <button
                className={styles.nicknameEditBtn}
                onClick={() => {
                  setEditingNickname(true);
                  setNewNickname(userProfile?.nickname || '');
                }}
              >
                변경
              </button>
            </div>
          ) : (
            <div className={styles.nicknameEdit}>
              <input
                type="text"
                className={styles.nicknameInput}
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="새 닉네임"
                maxLength={12}
                disabled={isSavingNickname}
              />
              <button
                className={styles.nicknameSaveBtn}
                onClick={handleSaveNickname}
                disabled={nicknameStatus !== 'available' || isSavingNickname}
              >
                {isSavingNickname ? <Spinner animation="border" size="sm" /> : '저장'}
              </button>
              <button
                className={styles.nicknameCancelBtn}
                onClick={() => {
                  setEditingNickname(false);
                  setNewNickname('');
                  setNicknameStatus('idle');
                  setNicknameMessage('');
                }}
                disabled={isSavingNickname}
              >
                취소
              </button>
              {nicknameMessage && (
                <span className={`${styles.nicknameFeedback} ${
                  nicknameStatus === 'available' ? styles.feedbackSuccess :
                  nicknameStatus === 'taken' || nicknameStatus === 'invalid' ? styles.feedbackError :
                  ''
                }`}>
                  {nicknameMessage}
                </span>
              )}
            </div>
          )}
        </div>

        {saveMessage && (
          <Alert variant={saveMessage.type === 'success' ? 'success' : 'danger'} className="mb-3">
            {saveMessage.text}
          </Alert>
        )}

        {loadingImages && (
          <div className={styles.loadingImages}>
            <Spinner animation="border" size="sm" /> 캐릭터 이미지 로딩 중...
          </div>
        )}

        {/* 원정대 공통 컨텐츠 */}
        {characters.length > 0 && (() => {
          const { dayOfWeek } = getKSTWeekInfo();
          // 요일 순서: 월(1) 화(2) 목(4) 금(5) 토(6) 일(0) — 수요일은 컨텐츠 없으므로 제외
          const dayOrder = [1, 2, 4, 5, 6, 0];
          const renderDayGroup = (day: number) => {
            const dayContents = COMMON_CONTENTS.filter(c => c.days.includes(day));
            const isToday = day === dayOfWeek;

            return (
              <div key={day} className={`${styles.commonDayGroup} ${isToday ? styles.commonDayToday : ''}`} style={{ flex: dayContents.length }}>
                <div className={styles.commonDayLabel}>{DAY_LABELS[day]}</div>
                <div className={styles.commonDayCards}>
                  {dayContents.map(content => {
                    const key = `${day}-${content.name}`;
                    const checked = commonContent.checks[key] === true;
                    const maxReached = !checked && content.maxChecks != null && getContentCheckCount(content.name) >= content.maxChecks;
                    return (
                      <div
                        key={key}
                        className={`${styles.commonCard} ${checked ? styles.commonChecked : ''} ${maxReached ? styles.commonDisabled : ''}`}
                        onClick={() => !maxReached && toggleCommonContent(day, content.name)}
                      >
                        <div className={styles.commonCardBg} style={{ background: content.color }}>
                          <Image
                            src={content.image}
                            alt={content.name}
                            fill
                            className={styles.raidImage}
                            unoptimized
                          />
                        </div>
                        <div className={styles.commonCardOverlay} />
                        <div className={styles.commonCardInfo}>
                          <span className={styles.commonCardName}>{content.name}</span>
                          <span className={styles.commonCardShortName}>{content.shortName}</span>
                        </div>
                        {checked && <div className={styles.commonCardCheck}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          };

          return (
            <div className={styles.commonSection}>
              <div className={styles.commonHeader}>원정대 공통 컨텐츠</div>
              <div className={styles.commonRow}>
                {dayOrder.map(renderDayGroup)}
              </div>
            </div>
          );
        })()}

        {/* 캐릭터 없음 */}
        {characters.length === 0 && (
          <Card className={styles.emptyCard}>
            <Card.Body className="text-center py-4">
              <p className="mb-3">등록된 캐릭터가 없습니다.</p>
              <Button variant="primary" size="sm" onClick={() => setShowRegisterModal(true)}>
                캐릭터 등록하기
              </Button>
            </Card.Body>
          </Card>
        )}

        {/* 캐릭터 카드 그리드 (2열) */}
        <div className={styles.cardGrid}>
          {displayCharacters
            .slice()
            .sort((a, b) => b.itemLevel - a.itemLevel)
            .map((char) => {
            const charState = weeklyChecklist[char.name] || createEmptyWeeklyState(char.itemLevel);
            const top3Raids = getTop3RaidGroups(char.itemLevel);

            // 캐릭터별 골드 계산
            let charGold = 0;
            Object.entries(charState.raids).forEach(([raidName, gates]) => {
              const raid = raids.find(r => r.name === raidName);
              if (raid) {
                // 레이드별 더보기 설정 확인 (체크 = 더보기 구매 = 비용 차감)
                const buyMore = charState.raidMoreGoldExclude?.[raidName] === true;

                gates.forEach((checked, i) => {
                  if (checked && raid.gates[i]) {
                    if (buyMore) {
                      // 더보기 구매: 골드 - 더보기 비용
                      charGold += raid.gates[i].gold - raid.gates[i].moreGold;
                    } else {
                      // 더보기 안 함: 풀 골드
                      charGold += raid.gates[i].gold;
                    }
                  }
                });
              }
            });
            charGold += charState.additionalGold || 0;

            // 체크된 레이드 목록
            const checkedRaids = getCheckedRaids(char.name);
            const allRaidGroups = getAllRaidGroups(char.itemLevel);

            return (
              <div key={char.name} className={styles.characterCard}>
                {/* 카드 헤더: 닉네임 + 갱신버튼 + 레벨 */}
                <div className={styles.cardHeader}>
                  <span className={styles.characterName}>{char.name}</span>
                  <div className={styles.headerRight}>
                    <button
                      className={`${styles.refreshBtn} ${!canRefresh(char.name) ? styles.refreshDisabled : ''}`}
                      onClick={() => handleRefresh(char.name)}
                      disabled={refreshingChar === char.name || !canRefresh(char.name)}
                      title={canRefresh(char.name) ? '레벨 갱신' : `${Math.floor(getRemainingCooldown(char.name) / 60)}분 ${getRemainingCooldown(char.name) % 60}초 후 가능`}
                    >
                      {refreshingChar === char.name ? (
                        <Spinner animation="border" size="sm" style={{ width: '12px', height: '12px' }} />
                      ) : (
                        '↻'
                      )}
                    </button>
                    <span className={styles.characterLevel}>Lv.{char.itemLevel.toFixed(0)}</span>
                  </div>
                </div>

                {/* 카드 본문 */}
                <div className={styles.cardBody}>
                  {/* 왼쪽: 캐릭터 이미지 (2줄 높이) */}
                  <div className={styles.characterImageArea}>
                    {char.imageUrl ? (
                      <Image
                        src={char.imageUrl}
                        alt={char.name}
                        width={160}
                        height={150}
                        className={styles.characterImage}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.characterPlaceholder}>
                        <Spinner animation="border" size="sm" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 2줄 */}
                  <div className={styles.cardRight}>
                    {/* 1줄: 레이드 3개 + 넘기기 버튼 */}
                    {(() => {
                      const startIdx = raidScrollIndex[char.name] || 0;
                      const visibleRaids: { raid: typeof raids[0] | null; groupName: string }[] = [];

                      // 현재 보여줄 3개 레이드 계산
                      for (let i = 0; i < 3; i++) {
                        const groupIdx = startIdx + i;
                        if (groupIdx < allRaidGroups.length) {
                          const groupName = allRaidGroups[groupIdx];
                          const difficulties = getAvailableDifficulties(groupName, char.itemLevel);
                          // 체크된 난이도 또는 가장 높은 난이도
                          const selectedRaid = difficulties.find(d =>
                            charState.raids[d.name] && charState.raids[d.name].length > 0
                          ) || difficulties[0];
                          visibleRaids.push({ raid: selectedRaid || null, groupName });
                        } else {
                          visibleRaids.push({ raid: null, groupName: '' });
                        }
                      }

                      const canScrollLeft = startIdx > 0;
                      const canScrollRight = startIdx + 3 < allRaidGroups.length;

                      return (
                        <div className={styles.raidRowWrapper}>
                          {/* 왼쪽 버튼 */}
                          {canScrollLeft && (
                            <button
                              className={`${styles.raidNavBtn} ${styles.raidNavLeft}`}
                              onClick={() => setRaidScrollIndex(prev => ({
                                ...prev,
                                [char.name]: Math.max(0, (prev[char.name] || 0) - 1)
                              }))}
                            >
                              ‹
                            </button>
                          )}

                          <div className={styles.itemRow}>
                            {visibleRaids.map(({ raid, groupName }, idx) => {
                              if (!raid) {
                                return (
                                  <div key={`empty-${idx}`} className={`${styles.raidCard} ${styles.raidEmpty}`}>
                                    <div className={styles.emptySlot}>-</div>
                                  </div>
                                );
                              }

                              const difficulties = getAvailableDifficulties(groupName, char.itemLevel);
                              const difficulty = raid.name.split(' ').slice(1).join(' ') || '';
                              const groupImage = raidGroupImages[groupName] || raid.image;
                              const checked = isRaidChecked(char.name, raid.name);
                              const difficultyKey = `${char.name}-${groupName}`;
                              const isDifficultyOpen = difficultyOpenKey === difficultyKey;

                              return (
                                <div
                                  key={raid.name}
                                  className={`${styles.raidCard} ${checked ? styles.raidChecked : ''}`}
                                  onClick={() => toggleRaid(char.name, raid.name)}
                                >
                                  <Image
                                    src={groupImage}
                                    alt={groupName}
                                    fill
                                    className={styles.raidImage}
                                  />
                                  <div className={styles.raidOverlay} />
                                  <div className={styles.raidInfo}>
                                    <span className={styles.raidName}>{groupName}</span>
                                    {difficulty && <span className={styles.raidDifficulty}>{difficulty}</span>}
                                    <span className={styles.raidLevel}>Lv.{raid.level}</span>
                                  </div>
                                  {checked && <div className={styles.raidCheck}>✓</div>}

                                  {/* 톱니바퀴 버튼 */}
                                  <button
                                    className={styles.gearBtn}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDifficultyOpenKey(isDifficultyOpen ? null : difficultyKey);
                                    }}
                                  >
                                    ⚙
                                  </button>

                                  {/* 난이도 선택 메뉴 */}
                                  {isDifficultyOpen && (
                                    <div className={styles.difficultyMenu} onClick={(e) => e.stopPropagation()}>
                                      {difficulties.map((diff) => {
                                        const diffName = diff.name.split(' ').slice(1).join(' ') || '기본';
                                        const isSelected = diff.name === raid.name;
                                        return (
                                          <button
                                            key={diff.name}
                                            className={`${styles.difficultyOption} ${isSelected ? styles.selected : ''}`}
                                            onClick={() => {
                                              changeRaidDifficulty(char.name, raid.name, diff.name);
                                              setDifficultyOpenKey(null);
                                            }}
                                          >
                                            {diffName} (Lv.{diff.level})
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* 오른쪽 버튼 */}
                          {canScrollRight && (
                            <button
                              className={`${styles.raidNavBtn} ${styles.raidNavRight}`}
                              onClick={() => setRaidScrollIndex(prev => ({
                                ...prev,
                                [char.name]: Math.min(allRaidGroups.length - 3, (prev[char.name] || 0) + 1)
                              }))}
                            >
                              ›
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* 2줄: 모래시계 + 낙원 + 추가골드 */}
                    <div className={styles.itemRow}>
                      {/* 할의 모래시계 (1730 이상) / 빈 슬롯 (미만) */}
                      {char.itemLevel >= 1730 ? (
                        <div
                          className={`${styles.raidCard} ${charState.sandOfTime ? styles.raidChecked : ''}`}
                          onClick={() => toggleExtra(char.name, 'sandOfTime')}
                        >
                          <Image
                            src="/gkf.webp"
                            alt="할의 모래시계"
                            fill
                            className={styles.raidImage}
                          />
                          <div className={styles.raidOverlay} />
                          <div className={styles.raidInfo}>
                            <span className={styles.raidName}>모래시계</span>
                          </div>
                          {charState.sandOfTime && <div className={styles.raidCheck}>✓</div>}
                        </div>
                      ) : (
                        <div className={`${styles.raidCard} ${styles.raidEmpty}`}>
                          <div className={styles.emptySlot}>-</div>
                        </div>
                      )}

                      {/* 낙원 */}
                      <div
                        className={`${styles.raidCard} ${charState.paradise ? styles.raidChecked : ''}`}
                        onClick={() => toggleExtra(char.name, 'paradise')}
                      >
                        <Image
                          src="/skrdnjs.webp"
                          alt="낙원"
                          fill
                          className={styles.raidImage}
                        />
                        <div className={styles.raidOverlay} />
                        <div className={styles.raidInfo}>
                          <span className={styles.raidName}>낙원</span>
                        </div>
                        {charState.paradise && <div className={styles.raidCheck}>✓</div>}
                      </div>

                      {/* 추가 골드 */}
                      <div className={styles.goldCard}>
                        <div className={styles.goldCardContent}>
                          <span className={styles.goldCardLabel}>추가 골드</span>
                          <Form.Control
                            type="number"
                            value={charState.additionalGold || ''}
                            onChange={(e) => updateAdditionalGold(char.name, parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className={styles.goldCardInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 일일 컨텐츠 (카던/가토) */}
                {expandedCards[char.name] && (() => {
                  const renderDaily = (
                    label: string,
                    field: 'chaosDungeon' | 'guardianRaid',
                  ) => {
                    const state: DailyContentState =
                      charState[field] && typeof charState[field] === 'object'
                        ? charState[field] as DailyContentState
                        : EMPTY_DAILY;
                    const rest = computeCurrentRest(state);
                    const fullBars = Math.floor(rest / 20);
                    const hasHalf = (rest % 20) >= 10;

                    const bonusFlags: boolean[] = [];
                    let r = state.restGauge;
                    for (let i = 0; i < 7; i++) {
                      if (state.checks[i]) {
                        if (r >= 20) {
                          bonusFlags.push(true);
                          r -= 20;
                        } else {
                          bonusFlags.push(false);
                        }
                      } else {
                        bonusFlags.push(false);
                      }
                    }

                    const settingsKey = `${char.name}-${field}`;
                    const isSettingsOpen = dailySettingsOpen === settingsKey;

                    return (
                      <div className={styles.dailyBlock}>
                        <div className={styles.dailyHeader}>
                          <span className={styles.dailyLabel}>{label}</span>
                          <div className={styles.restGauge}>
                            {[0, 1, 2, 3, 4].map(i => (
                              <div
                                key={i}
                                className={`${styles.restBar} ${i < fullBars ? styles.restFull : ''} ${i === fullBars && hasHalf ? styles.restHalf : ''}`}
                              />
                            ))}
                            <span className={styles.restText}>{rest / 20}</span>
                          </div>
                          <button
                            className={styles.dailyGearBtn}
                            onClick={() => setDailySettingsOpen(isSettingsOpen ? null : settingsKey)}
                          >
                            ⚙
                          </button>
                        </div>
                        {isSettingsOpen && (
                          <div className={styles.restSetter}>
                            <span className={styles.restSetterLabel}>휴게 설정</span>
                            <div className={styles.restSetterBars}>
                              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                                <button
                                  key={v}
                                  className={`${styles.restSetterBtn} ${state.restGauge === v ? styles.restSetterActive : ''}`}
                                  onClick={() => {
                                    setRestGauge(char.name, field, v);
                                    setDailySettingsOpen(null);
                                  }}
                                >
                                  {v / 20}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className={styles.dailyChecks}>
                          {WEEKLY_DAY_LABELS.map((day, idx) => {
                            const checked = state.checks[idx];
                            return (
                              <button
                                key={idx}
                                className={`${styles.dailyDayBtn} ${checked ? (bonusFlags[idx] ? styles.dailyBonusChecked : styles.dailyChecked) : ''}`}
                                onClick={() => toggleDailyCheck(char.name, field, idx)}
                              >
                                {checked
                                  ? <span className={styles.dailyCheckMark}>✓</span>
                                  : <span className={styles.dailyDayText}>{day}</span>
                                }
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  if (char.itemLevel < 1640) return null;
                  return (
                    <div className={styles.dailyRow}>
                      {renderDaily(getChaosDungeonLabel(char.itemLevel), 'chaosDungeon')}
                      {renderDaily(getGuardianRaidLabel(char.itemLevel), 'guardianRaid')}
                    </div>
                  );
                })()}

                {/* 카드 푸터 */}
                <div className={styles.cardFooter}>
                  <div className={styles.excludeMoreGold}>
                    <button
                      className={styles.moreGoldDropdownBtn}
                      onClick={() => setMoreGoldDropdownChar(moreGoldDropdownChar === char.name ? null : char.name)}
                    >
                      더보기 비용 {moreGoldDropdownChar === char.name ? '−' : '+'}
                    </button>

                    {/* 더보기 비용 드롭다운 */}
                    {moreGoldDropdownChar === char.name && (
                      <div className={styles.moreGoldDropdown}>
                        {checkedRaids.length === 0 ? (
                          <div className={styles.moreGoldEmpty}>체크된 레이드 없음</div>
                        ) : (
                          checkedRaids.map(({ name, raid }) => {
                            const buyMore = charState.raidMoreGoldExclude?.[name] === true;
                            const totalMoreGold = raid.gates.reduce((sum, g) => sum + g.moreGold, 0);

                            return (
                              <div key={name} className={styles.moreGoldItem}>
                                <Form.Check
                                  type="checkbox"
                                  id={`more-gold-${char.name}-${name}`}
                                  label={
                                    <span className={styles.moreGoldLabel}>
                                      {name}
                                      <small>(-{totalMoreGold.toLocaleString()}G)</small>
                                    </span>
                                  }
                                  checked={buyMore}
                                  onChange={() => toggleRaidMoreGoldExclude(char.name, name)}
                                  className={styles.moreGoldCheck}
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  {char.itemLevel >= 1640 && (
                    <button
                      className={styles.dailyToggle}
                      onClick={() => toggleDailyExpand(char.name)}
                      title="일일 컨텐츠"
                    >
                      {expandedCards[char.name] ? '▲' : '▼'}
                    </button>
                  )}
                  <div className={styles.charTotalGold}>
                    <span className={styles.goldLabel}>총 획득</span>
                    <span className={styles.goldValue}>{charGold.toLocaleString()}<small>G</small></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 더보기 버튼 */}
        {characters.length > 6 && (
          <div className="text-center mt-3">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowAllCharacters(!showAllCharacters)}
            >
              {showAllCharacters ? '접기' : `더보기 (+${characters.length - 6})`}
            </Button>
          </div>
        )}

        {/* 주간 골드 차트 (맨 아래) */}
        {characters.length > 0 && (
          <WeeklyGoldChart
            history={weeklyGoldHistory}
            currentWeekGold={calculateTotalGold()}
            currentWeekLabel={getWeekLabel(new Date())}
          />
        )}

        {/* 안내 문구 */}
        {characters.length > 0 && (
          <div className={styles.notice}>
            <p>매주 수요일 06:00 이후 첫 접속 시 이전 주 골드가 자동 저장됩니다.</p>
            <p>레이드 체크 후 상단의 '저장하기' 버튼을 눌러야 변경사항이 반영됩니다.</p>
            <p>아바타 변경이 안될 시 인게임에서 아바타 해제 → 영지 이동 → 아바타 재장착 → 영지 밖 이동 후 다시 시도해주세요.</p>
          </div>
        )}

        {/* 캐릭터 등록 모달 (2단계) */}
        <Modal show={showRegisterModal} onHide={closeRegisterModal} centered size={registerStep === 2 ? 'lg' : undefined}>
          <Modal.Header closeButton>
            <Modal.Title>
              {registerStep === 1 ? '캐릭터 검색' : `원정대 선택 (${selectedCharNames.size}/6)`}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {registerStep === 1 ? (
              <>
                <Form.Group>
                  <Form.Label>캐릭터 이름</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="캐릭터 이름을 입력하세요"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSiblings()}
                  />
                  <Form.Text className="text-muted">
                    입력한 캐릭터의 원정대 전체가 검색됩니다.
                  </Form.Text>
                </Form.Group>
              </>
            ) : (
              <div className={styles.characterSelectGrid}>
                {allSiblings.map((char) => {
                  const isSelected = selectedCharNames.has(char.name);
                  const tooLow = char.itemLevel < 1640;
                  const canSelect = !tooLow && (isSelected || selectedCharNames.size < 6);

                  return (
                    <div
                      key={char.name}
                      className={`${styles.characterSelectItem} ${isSelected ? styles.selected : ''} ${!canSelect ? styles.disabled : ''}`}
                      onClick={() => canSelect && toggleCharacterSelection(char.name)}
                    >
                      <div className={styles.selectCheckbox}>
                        {isSelected && '✓'}
                      </div>
                      <div className={styles.selectInfo}>
                        <span className={styles.selectName}>{char.name}</span>
                        <span className={styles.selectDetails}>
                          {char.class} · Lv.{char.itemLevel.toFixed(0)}
                          {tooLow && ' (1640 미만)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {registerError && (
              <Alert variant="danger" className="mt-3 mb-0">
                {registerError}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            {registerStep === 1 ? (
              <>
                <Button variant="secondary" size="sm" onClick={closeRegisterModal}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSearchSiblings}
                  disabled={isSearching || !registerName.trim()}
                >
                  {isSearching ? <Spinner animation="border" size="sm" /> : '검색'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setRegisterStep(1)}>
                  뒤로
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRegister}
                  disabled={isRegistering || selectedCharNames.size === 0}
                >
                  {isRegistering ? <Spinner animation="border" size="sm" /> : `${selectedCharNames.size}개 캐릭터 등록`}
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal>

        {/* 원정대 편집 모달 */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>원정대 편집 ({selectedCharNames.size}/6)</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {allSiblings.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted mb-0">
                  원정대 정보가 없습니다. 캐릭터를 다시 등록해주세요.
                </p>
              </div>
            ) : (
              <div className={styles.characterSelectGrid}>
                {allSiblings.map((char) => {
                  const isSelected = selectedCharNames.has(char.name);
                  const tooLow = char.itemLevel < 1640;
                  const canSelect = !tooLow && (isSelected || selectedCharNames.size < 6);

                  return (
                    <div
                      key={char.name}
                      className={`${styles.characterSelectItem} ${isSelected ? styles.selected : ''} ${!canSelect ? styles.disabled : ''}`}
                      onClick={() => canSelect && toggleCharacterSelection(char.name)}
                    >
                      <div className={styles.selectCheckbox}>
                        {isSelected && '✓'}
                      </div>
                      <div className={styles.selectInfo}>
                        <span className={styles.selectName}>{char.name}</span>
                        <span className={styles.selectDetails}>
                          {char.class} · Lv.{char.itemLevel.toFixed(0)}
                          {tooLow && ' (1640 미만)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleEditSave}
              disabled={isRegistering || selectedCharNames.size === 0 || allSiblings.length === 0}
            >
              {isRegistering ? <Spinner animation="border" size="sm" /> : '저장'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* 닉네임 미설정 시 모달 */}
        {userProfile && !userProfile.nickname && <NicknameModal />}

      </Container>
    </div>
  );
}
