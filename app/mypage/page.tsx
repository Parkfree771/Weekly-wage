'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Card, Button, Form, Spinner, Alert, Modal } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { registerCharacter, saveWeeklyChecklist, refreshCharacter, updateCharacterImages } from '@/lib/user-service';
import { raids } from '@/data/raids';
import {
  Character,
  WeeklyChecklist,
  WeeklyGoldRecord,
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

export default function MyPage() {
  const router = useRouter();
  const { user, userProfile, loading, refreshUserProfile, signInWithGoogle } = useAuth();

  // 상태
  const [characters, setCharacters] = useState<Character[]>([]);
  const [weeklyChecklist, setWeeklyChecklist] = useState<WeeklyChecklist>({});
  const [weeklyGoldHistory, setWeeklyGoldHistory] = useState<WeeklyGoldRecord[]>([]);
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

  // 프로필 데이터 로드 + 주간 초기화 체크
  useEffect(() => {
    if (!userProfile || !user) return;

    const chars = userProfile.characters || [];
    const checklist = userProfile.weeklyChecklist || {};
    const goldHistory = userProfile.weeklyGoldHistory || [];

    setCharacters(chars);
    setWeeklyChecklist(checklist);
    setWeeklyGoldHistory(goldHistory);

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
            lastWeeklyReset: now,
          });

          setWeeklyChecklist(resetChecklist);
          setWeeklyGoldHistory(updatedHistory);
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
      // 상위 6개 자동 선택
      const top6 = new Set(chars.slice(0, 6).map(c => c.name));
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

  // 낙원/할의 모래시계 토글
  const toggleExtra = (charName: string, field: 'paradise' | 'sandOfTime') => {
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

          {/* 마이페이지 소개 - 봇이 읽을 수 있는 정적 텍스트 */}
          <section className="faq-section" style={{ marginTop: '2rem' }}>
            <h2 className="faq-section-title">로골로골 마이페이지란?</h2>
            <div className="faq-item">
              <p className="faq-answer">
                로골로골 마이페이지는 로스트아크 플레이어가 자신의 원정대를 등록하고,
                매주 레이드 클리어 현황을 체크하며, 주간 골드 수입을 체계적으로 관리할 수 있는 개인화 서비스입니다.
                Google 계정으로 로그인하면 모든 데이터가 Firebase에 안전하게 저장되어,
                어디서든 접속하여 내 원정대의 골드 현황을 확인할 수 있습니다.
                캐릭터명 하나만 입력하면 로스트아크 공식 API를 통해 원정대 전체가 자동으로 조회되며,
                최대 6캐릭터를 골드 획득 캐릭터로 선택하여 관리할 수 있습니다.
              </p>
            </div>

            <h3 className="faq-question" style={{marginTop: '1rem'}}>원정대 등록 및 관리</h3>
            <div className="faq-item">
              <p className="faq-answer">
                캐릭터 이름을 검색하면 같은 원정대의 모든 캐릭터가 자동으로 조회됩니다.
                아이템 레벨이 높은 순서대로 정렬되며, 골드를 획득할 캐릭터 6개를 직접 선택할 수 있습니다.
                등록된 캐릭터의 직업, 아이템 레벨, 캐릭터 이미지가 표시되며,
                갱신 버튼으로 최신 레벨 정보를 불러올 수 있습니다(5분 간격 제한).
                원정대 편집 기능으로 언제든 골드 획득 캐릭터를 변경할 수 있으며,
                캐릭터를 추가 등록하면 기존 체크리스트 데이터가 유지됩니다.
              </p>
            </div>

            <h3 className="faq-question" style={{marginTop: '1rem'}}>주간 레이드 체크리스트</h3>
            <div className="faq-item">
              <p className="faq-answer">
                등록된 캐릭터마다 참여 가능한 레이드가 아이템 레벨 기준으로 자동 표시됩니다.
                레이드 이미지를 클릭하면 클리어 여부를 체크할 수 있고,
                체크된 레이드의 골드가 자동으로 합산되어 캐릭터별, 원정대 전체의 주간 예상 골드를 보여줍니다.
                세르카, 종막, 에기르, 아에르, 아브렐슈드, 카멘, 상아탑, 베히모스 등 모든 레이드를 지원하며,
                각 레이드의 난이도(노말/하드)를 톱니바퀴 버튼으로 변경할 수 있습니다.
                레이드 카드를 좌우로 넘겨 추가 레이드를 확인하고 체크할 수 있습니다.
              </p>
            </div>

            <h3 className="faq-question" style={{marginTop: '1rem'}}>더보기 비용 관리</h3>
            <div className="faq-item">
              <p className="faq-answer">
                각 캐릭터의 레이드별로 더보기 보상 구매 여부를 개별 설정할 수 있습니다.
                더보기를 구매한 레이드는 클리어 골드에서 더보기 비용이 차감되어 실제 순수익이 표시됩니다.
                예를 들어, 세르카 하드에서 더보기를 구매하면 클리어 골드에서 더보기 비용이 자동 차감됩니다.
                더보기 구매 여부는 레이드마다 독립적으로 설정 가능하며,
                카드 하단의 &quot;더보기 비용 설정&quot; 드롭다운에서 관리합니다.
                추가 골드 입력란에 모래시계, 낙원 등 기타 골드 수입을 직접 입력할 수도 있습니다.
              </p>
            </div>

            <h3 className="faq-question" style={{marginTop: '1rem'}}>주간 골드 기록 차트</h3>
            <div className="faq-item">
              <p className="faq-answer">
                매주 수요일 오전 6시(레이드 초기화 시점)에 이전 주의 골드 기록이 자동으로 저장됩니다.
                저장된 데이터는 주간 골드 차트로 시각화되어, 시간에 따른 골드 수입 추이를 한눈에 파악할 수 있습니다.
                차트에는 레이드 골드와 추가 골드가 구분 표시되며, 현재 주의 예상 골드도 함께 표시됩니다.
                이를 통해 캐릭터 육성이나 레이드 전략 변경이 실제 골드 수입에 어떤 영향을 미치는지 추적할 수 있습니다.
                주간 골드 기록은 Firebase에 안전하게 보관되어, 로그인만 하면 언제든 과거 데이터를 조회할 수 있습니다.
              </p>
            </div>

            <h3 className="faq-question" style={{marginTop: '1rem'}}>자동 주간 초기화</h3>
            <div className="faq-item">
              <p className="faq-answer">
                로스트아크의 주간 초기화 시점인 매주 수요일 오전 6시(KST)에 맞춰
                마이페이지의 레이드 체크리스트가 자동으로 초기화됩니다.
                초기화 전에 현재 주의 골드 기록이 자동으로 저장되므로 데이터 손실 걱정이 없습니다.
                수요일 이후 첫 접속 시 자동으로 초기화가 진행되며,
                새로운 주차에 맞게 깨끗한 체크리스트로 시작할 수 있습니다.
              </p>
            </div>

            <h3 className="faq-question" style={{marginTop: '1rem'}}>데이터 보안</h3>
            <div className="faq-item">
              <p className="faq-answer">
                마이페이지의 모든 데이터는 Google Firebase Firestore에 저장됩니다.
                Google OAuth 2.0 인증을 사용하여 안전하게 로그인하며,
                다른 사용자의 데이터에는 접근할 수 없도록 보안 규칙이 설정되어 있습니다.
                별도의 회원가입 과정 없이 기존 Google 계정으로 간편하게 이용할 수 있으며,
                로그아웃 후에도 데이터는 안전하게 보관되어 다시 로그인하면 그대로 복원됩니다.
              </p>
            </div>
          </section>

          <section className="faq-section" style={{ marginTop: '1.5rem' }}>
            <h2 className="faq-section-title">마이페이지 자주 묻는 질문</h2>

            <div className="faq-item">
              <h3 className="faq-question">Q. 캐릭터는 어떻게 등록하나요?</h3>
              <p className="faq-answer">
                로그인 후 &quot;캐릭터 등록&quot; 버튼을 클릭하고, 캐릭터 이름을 검색하면 됩니다.
                로스트아크 공식 API를 통해 같은 원정대의 모든 캐릭터가 자동으로 조회되며,
                아이템 레벨 순으로 정렬됩니다. 최대 6개의 골드 획득 캐릭터를 선택한 후 등록하면
                바로 주간 체크리스트를 사용할 수 있습니다.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Q. 캐릭터 레벨이 변경되면 어떻게 하나요?</h3>
              <p className="faq-answer">
                캐릭터 카드의 갱신 버튼(↻)을 클릭하면 로스트아크 API에서 최신 아이템 레벨을 불러옵니다.
                레벨이 올라가면 참여 가능한 레이드가 자동으로 업데이트됩니다.
                갱신은 캐릭터당 5분에 1회로 제한되며, 원정대 편집에서 캐릭터를 재등록하면 전체가 갱신됩니다.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Q. 주간 골드 기록은 자동으로 저장되나요?</h3>
              <p className="faq-answer">
                네, 매주 수요일 오전 6시 이후 첫 접속 시 이전 주의 골드 기록이 자동으로 저장됩니다.
                저장된 기록은 주간 골드 차트에 누적되어 시간에 따른 수입 변화를 확인할 수 있습니다.
                다만 레이드 체크나 더보기 설정 변경 후에는 반드시 &quot;저장하기&quot; 버튼을 눌러야
                변경사항이 서버에 반영됩니다.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Q. 다른 기기에서도 사용할 수 있나요?</h3>
              <p className="faq-answer">
                네, 같은 Google 계정으로 로그인하면 PC, 모바일 등 어떤 기기에서든
                동일한 데이터를 확인하고 관리할 수 있습니다.
                데이터는 클라우드(Firebase)에 저장되므로 기기 변경 시에도 데이터가 유지됩니다.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Q. 레이드 난이도는 어떻게 변경하나요?</h3>
              <p className="faq-answer">
                레이드 카드 우측 상단의 톱니바퀴(⚙) 버튼을 클릭하면 난이도 선택 메뉴가 나타납니다.
                노말, 하드 등 캐릭터의 아이템 레벨에 맞는 난이도를 선택할 수 있으며,
                난이도에 따라 클리어 골드와 더보기 비용이 자동으로 변경됩니다.
              </p>
            </div>
          </section>
        </Container>
      </div>
    );
  }

  const displayCharacters = showAllCharacters ? characters : characters.slice(0, 6);

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
                      {/* 할의 모래시계 */}
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

                {/* 카드 푸터 */}
                <div className={styles.cardFooter}>
                  <div className={styles.excludeMoreGold}>
                    <button
                      className={styles.moreGoldDropdownBtn}
                      onClick={() => setMoreGoldDropdownChar(moreGoldDropdownChar === char.name ? null : char.name)}
                    >
                      더보기 비용 설정 {moreGoldDropdownChar === char.name ? '−' : '+'}
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
          </div>
        )}

        {/* 마이페이지 설명 섹션 */}
        <section className="faq-section" style={{ marginTop: '1.5rem' }}>
          <h2 className="faq-section-title">마이페이지 사용 가이드</h2>
          <div className="faq-item">
            <p className="faq-answer">
              마이페이지에서는 원정대 캐릭터의 주간 레이드 진행 상황을 체크하고,
              주간 골드 수입을 추적할 수 있습니다. 레이드 이미지를 클릭하면 클리어 체크가 되며,
              톱니바퀴 버튼으로 레이드 난이도를 변경할 수 있습니다.
              더보기 비용 설정에서 레이드별 더보기 구매 여부를 체크하면
              클리어 골드에서 더보기 비용이 자동 차감되어 실수익을 확인할 수 있습니다.
              모든 변경사항은 &quot;저장하기&quot; 버튼을 눌러야 서버에 반영됩니다.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">주간 골드 차트 활용법</h3>
            <p className="faq-answer">
              매주 수요일 레이드 초기화 시 이전 주 골드가 자동 저장되어 차트에 누적됩니다.
              차트에서 주별 골드 추이를 확인하여 캐릭터 육성 효과를 파악하거나,
              골드 수입 목표를 설정하는 데 활용하세요.
              레이드 골드와 추가 골드가 구분 표시되어 수입 구성을 한눈에 볼 수 있습니다.
            </p>
          </div>
        </section>

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
                  const canSelect = isSelected || selectedCharNames.size < 6;

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
                  const canSelect = isSelected || selectedCharNames.size < 6;

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

      </Container>
    </div>
  );
}
