'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Container, Card, Button, Form, Spinner, Alert, Modal, Row, Col } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { memo } from 'react';

// 작은 정적 아이콘용 (재화 아이콘 등 - 최적화 API 호출 생략)
const StaticIcon = memo(function StaticIcon({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) {
  return <NextImage src={src} alt={alt} width={width} height={height} className={className} unoptimized loading="lazy" />;
});

// fill 모드 카드 이미지용 (레이드/가토/균열 카드 배경)
const CardBgImage = memo(function CardBgImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <NextImage src={src} alt={alt} fill className={className} sizes="180px" loading="lazy" unoptimized />;
});

// 하위 호환용 alias
const Image = NextImage;
import { useAuth } from '@/contexts/AuthContext';
import { registerCharacter, saveWeeklyChecklist, refreshCharacter, updateCharacterImages } from '@/lib/user-service';
import { validateNickname, checkNicknameAvailable } from '@/lib/nickname-service';
import NicknameModal from '@/components/auth/NicknameModal';
import { raids } from '@/data/raids';
import { raidClearRewards } from '@/data/raidClearRewards';
import { DEMO_CHARACTERS, DEMO_WEEKLY_CHECKLIST, DEMO_GOLD_HISTORY, DEMO_COMMON_CONTENT, DEMO_MAIN_CHARACTER } from '@/data/demoMypage';

// raids 배열을 Map으로 변환 (O(1) 조회용)
const raidMap = new Map(raids.map(r => [r.name, r]));
import { raidRewards, MATERIAL_IDS } from '@/data/raidRewards';
import {
  Character,
  WeeklyChecklist,
  WeeklyGoldRecord,
  CommonContentState,
  DailyContentState,
  ExpeditionData,
  getTop3RaidGroups,
  getRaidGroupName,
  raidGroupImages,
  raidGroupShortNames,
  createEmptyWeeklyState,
  getRaidsForLevel,
  needsWeeklyReset,
  resetWeeklyChecklist,
  getWeekLabel,
  getCurrentWeekStart,
  calculateTotalGoldFromChecklist,
} from '@/types/user';
import dynamic from 'next/dynamic';
const WeeklyGoldChart = dynamic(() => import('@/components/WeeklyGoldChart'), { ssr: false });
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

// 원정대 공통 컨텐츠 레벨별 정의
type CommonContentDef = { name: string; shortName: string; image: string; color: string; days: number[]; gold: number; level: number };
const COMMON_CONTENT_BY_LEVEL: Record<string, Record<string, CommonContentDef>> = {
  '필드보스': {
    '1730': { name: '필드보스', shortName: '필보', image: '/field-boss.webp', color: '#b91c1c', days: [2, 5, 0], gold: 0, level: 1730 },
    '1750': { name: '필드보스', shortName: '필보', image: '/field-boss.webp', color: '#b91c1c', days: [2, 5, 0], gold: 0, level: 1750 },
  },
  '카오스 게이트': {
    '1730': { name: '카오스 게이트', shortName: '카게', image: '/chaos-gate.webp', color: '#6b21a8', days: [1, 4, 6, 0], gold: 3500, level: 1730 },
    '1750': { name: '카오스 게이트', shortName: '카게', image: '/chaos-gate.webp', color: '#6b21a8', days: [1, 4, 6, 0], gold: 5000, level: 1750 },
  },
};

function getCommonContents(maxLevel: number) {
  const tier = maxLevel >= 1750 ? '1750' : '1730';
  return Object.values(COMMON_CONTENT_BY_LEVEL).map(byLevel => byLevel[tier]);
}

// 할의 모래시계 보상 (보상강화 레벨별)
const SAND_OF_TIME_REWARDS_1750: { gems: number; stones: number; lavaBreath: number; glacierBreath: number }[] = [
  { gems: 6, stones: 12, lavaBreath: 12, glacierBreath: 12 }, // 0 (기본)
  { gems: 12, stones: 24, lavaBreath: 24, glacierBreath: 24 }, // 보상강화 1
  { gems: 18, stones: 36, lavaBreath: 36, glacierBreath: 36 }, // 보상강화 2
  { gems: 24, stones: 48, lavaBreath: 48, glacierBreath: 48 }, // 보상강화 3
  { gems: 30, stones: 60, lavaBreath: 60, glacierBreath: 60 }, // 보상강화 4
  { gems: 36, stones: 72, lavaBreath: 72, glacierBreath: 72 }, // 보상강화 5
];

const SAND_OF_TIME_REWARDS_1730: { gems: number; stones: number; lavaBreath: number; glacierBreath: number }[] = [
  { gems: 15, stones: 30, lavaBreath: 10, glacierBreath: 10 }, // 0 (기본)
  { gems: 30, stones: 36, lavaBreath: 20, glacierBreath: 20 }, // 보상강화 1
  { gems: 45, stones: 42, lavaBreath: 30, glacierBreath: 30 }, // 보상강화 2
  { gems: 60, stones: 48, lavaBreath: 40, glacierBreath: 40 }, // 보상강화 3
  { gems: 75, stones: 54, lavaBreath: 50, glacierBreath: 50 }, // 보상강화 4
  { gems: 90, stones: 60, lavaBreath: 60, glacierBreath: 60 }, // 보상강화 5
];

function getSandOfTimeRewards(itemLevel: number) {
  return itemLevel >= 1750 ? SAND_OF_TIME_REWARDS_1750 : SAND_OF_TIME_REWARDS_1730;
}

// 공통 컨텐츠 재화 보상 (1회 기준)
type CommonMaterialReward = { image?: string; label: string; amount: number };
const COMMON_CONTENT_MATERIALS_BY_LEVEL: Record<string, Record<string, CommonMaterialReward[]>> = {
  '카오스 게이트': {
    '1730': [
      { image: '/breath-lava5.webp', label: '용숨', amount: 6 },
      { image: '/breath-glacier5.webp', label: '빙숨', amount: 6 },
      { image: '/gold.webp', label: '귀속골드', amount: 3500 },
      { image: '/destiny-shard-bag-large5.webp', label: '운파', amount: 12000 },
      { image: '/1fpqrjqghk.webp', label: '보석', amount: 6 },
    ],
    '1750': [
      { image: '/breath-lava5.webp', label: '용숨', amount: 7 },
      { image: '/breath-glacier5.webp', label: '빙숨', amount: 7 },
      { image: '/gold.webp', label: '귀속골드', amount: 5000 },
      { image: '/destiny-shard-bag-large5.webp', label: '운파', amount: 13200 },
      { image: '/1fpqrjqghk.webp', label: '보석', amount: 7 },
    ],
  },
  '필드보스': {
    '1730': [
      { image: '/top-destiny-destruction-stone5.webp', label: '파결', amount: 486.3 },
      { image: '/top-destiny-guardian-stone5.webp', label: '수결', amount: 1484.4 },
      { image: '/top-destiny-breakthrough-stone5.webp', label: '위돌', amount: 41.1 },
      { image: '/breath-lava5.webp', label: '용숨', amount: 3 },
      { image: '/breath-glacier5.webp', label: '빙숨', amount: 3 },
      { image: '/1fpqrjqghk.webp', label: '보석', amount: 21 },
      { image: '/cjstkd.webp', label: '천상', amount: 0.6 },
    ],
    '1750': [
      { image: '/top-destiny-destruction-stone5.webp', label: '파결', amount: 699.3 },
      { image: '/top-destiny-guardian-stone5.webp', label: '수결', amount: 2077.3 },
      { image: '/top-destiny-breakthrough-stone5.webp', label: '위돌', amount: 51 },
      { image: '/breath-lava5.webp', label: '용숨', amount: 3 },
      { image: '/breath-glacier5.webp', label: '빙숨', amount: 3 },
      { image: '/1fpqrjqghk.webp', label: '보석', amount: 21 },
      { image: '/cjstkd.webp', label: '천상', amount: 0.5 },
    ],
  },
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKLY_DAY_LABELS = ['수', '목', '금', '토', '일', '월', '화'];

// 가디언 토벌 로테이션 (1730+ 주간 순환)
const GUARDIAN_ROTATION = [
  { name: '베스칼', element: '화구', image: '/qptm.webp' },
  { name: '루멘칼리고', element: '암구', image: '/fnaps.webp' },
  { name: '가르가디스', element: '토구', image: '/rkfm.webp' },
  { name: '스콜라키아', element: '토구', image: '/tmzhf.webp' },
  { name: '크라티오스', element: '뇌구', image: '/zmfk.webp' },
  { name: '아게오로스', element: '세구', image: '/dkrp.webp' },
  { name: '드렉탈라스', element: '화구', image: '/emfpr.webp' },
  { name: '소나벨', element: '암구', image: '/thsk.webp' },
];

// 1730 미만 고정 가디언
const GUARDIAN_FIXED = [
  { minLevel: 1720, name: '크라티오스', element: '뇌구', image: '/zmfk.webp' },
  { minLevel: 1700, name: '드렉탈라스', element: '화구', image: '/emfpr.webp' },
  { minLevel: 1680, name: '스콜라키아', element: '토구', image: '/tmzhf.webp' },
  { minLevel: 1640, name: '아게오로스', element: '세구', image: '/dkrp.webp' },
];

// 기준주: 2026-02-25 (수) = 베스칼 (인덱스 0)
const GUARDIAN_REF_WEEK = '2026-02-25';

function getCurrentGuardian(itemLevel: number): { name: string; element: string; image: string } {
  if (itemLevel >= 1730) {
    const refDate = new Date(GUARDIAN_REF_WEEK + 'T00:00:00+09:00');
    const currentWeek = new Date(getCurrentWeekStart() + 'T00:00:00+09:00');
    const diffWeeks = Math.round((currentWeek.getTime() - refDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const index = ((diffWeeks % GUARDIAN_ROTATION.length) + GUARDIAN_ROTATION.length) % GUARDIAN_ROTATION.length;
    return GUARDIAN_ROTATION[index];
  }
  for (const g of GUARDIAN_FIXED) {
    if (itemLevel >= g.minLevel) return g;
  }
  return { name: '가디언 토벌', element: '', image: '' };
}

// 카던 레벨별 라벨 (1730+ 균열, 1640+ 전선, 미만 카던)
function getChaosDungeonLabel(itemLevel: number): string {
  if (itemLevel >= 1750) return '1750 균열';
  if (itemLevel >= 1730) return '1730 균열';
  if (itemLevel >= 1720) return '1720 전선';
  if (itemLevel >= 1700) return '1700 전선';
  if (itemLevel >= 1680) return '1680 전선';
  return '';
}

// 가토 레벨별 라벨
function getGuardianRaidLabel(itemLevel: number): string {
  if (itemLevel >= 1750) return '1750 가토';
  if (itemLevel >= 1730) return '1730 가토';
  if (itemLevel >= 1720) return '1720 가토';
  if (itemLevel >= 1700) return '1700 가토';
  if (itemLevel >= 1680) return '1680 가토';
  return '';
}
// 카던(균열/전선) 1일 1회 노휴게 기준 재화 획득량 (레벨별 이미지 분리)
const CHAOS_DAILY_REWARDS: { minLevel: number; materials: { image: string; alt: string; daily: number }[] }[] = [
  {
    minLevel: 1750,
    materials: [
      { image: '/top-destiny-destruction-stone5.webp', alt: '파괴석 결정', daily: 435.8 },
      { image: '/top-destiny-guardian-stone5.webp', alt: '수호석 결정', daily: 1110.9 },
      { image: '/top-destiny-breakthrough-stone5.webp', alt: '위대한 돌파석', daily: 20 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 56853.8 },
    ],
  },
  {
    minLevel: 1730,
    materials: [
      { image: '/top-destiny-destruction-stone5.webp', alt: '파괴석 결정', daily: 361.5 },
      { image: '/top-destiny-guardian-stone5.webp', alt: '수호석 결정', daily: 1092.2 },
      { image: '/top-destiny-breakthrough-stone5.webp', alt: '위대한 돌파석', daily: 17.7 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 43801.2 },
    ],
  },
  {
    minLevel: 1720,
    materials: [
      { image: '/destiny-destruction-stone5-v2.webp', alt: '파괴석', daily: 745.8 },
      { image: '/destiny-guardian-stone5-v2.webp', alt: '수호석', daily: 2058.2 },
      { image: '/destiny-breakthrough-stone5.webp', alt: '돌파석', daily: 47 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 40311.9 },
    ],
  },
  {
    minLevel: 1700,
    materials: [
      { image: '/destiny-destruction-stone5-v2.webp', alt: '파괴석', daily: 593.9 },
      { image: '/destiny-guardian-stone5-v2.webp', alt: '수호석', daily: 1733.4 },
      { image: '/destiny-breakthrough-stone5.webp', alt: '돌파석', daily: 41.3 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 33557 },
    ],
  },
  {
    minLevel: 1680,
    materials: [
      { image: '/destiny-destruction-stone5-v2.webp', alt: '파괴석', daily: 416.7 },
      { image: '/destiny-guardian-stone5-v2.webp', alt: '수호석', daily: 1190.3 },
      { image: '/destiny-breakthrough-stone5.webp', alt: '돌파석', daily: 36.2 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 32445.4 },
    ],
  },
];

function getChaosDailyReward(itemLevel: number) {
  return CHAOS_DAILY_REWARDS.find(r => itemLevel >= r.minLevel) || null;
}

// 가디언 토벌 1일 1회 노휴게 기준 재화 획득량 (데이터 추후 업데이트)
const GUARDIAN_DAILY_REWARDS: { minLevel: number; materials: { image: string; alt: string; daily: number }[] }[] = [
  {
    minLevel: 1750,
    materials: [
      { image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 11.9 },
    ],
  },
  {
    minLevel: 1730,
    materials: [
      { image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 10.5 },
    ],
  },
  {
    minLevel: 1720,
    materials: [
      { image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 6.4 },
    ],
  },
  {
    minLevel: 1700,
    materials: [
      { image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 5.3 },
    ],
  },
  {
    minLevel: 1680,
    materials: [
      { image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 5.2 },
    ],
  },
];

function getGuardianDailyReward(itemLevel: number) {
  return GUARDIAN_DAILY_REWARDS.find(r => itemLevel >= r.minLevel) || null;
}

// JS dayOfWeek → 주간 인덱스 (수=0 ~ 화=6)
const WEEKLY_DAY_MAP: Record<number, number> = { 3: 0, 4: 1, 5: 2, 6: 3, 0: 4, 1: 5, 2: 6 };

const EMPTY_DAILY: DailyContentState = { checks: new Array(7).fill(0) };

// KST 06:00 기준 현재 게임 요일의 주간 인덱스 (0=수 ~ 6=화)
function getCurrentGameDayIdx(): number {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  let gameDay = kst.getUTCDay(); // 0=일 ~ 6=토
  // 06시 이전이면 전날로 취급
  if (kst.getUTCHours() < 6) {
    gameDay = (gameDay + 6) % 7;
  }
  return WEEKLY_DAY_MAP[gameDay];
}

// 현재 휴식게이지 계산 (지나간 미체크 날 +10 자동 누적)

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

  // 데모 모드 (비로그인 시)
  const isDemo = !user && !loading;

  // 원정대 탭 (1, 2, 3)
  const [activeExpedition, setActiveExpedition] = useState<1 | 2 | 3>(1);

  // 상태
  const [characters, setCharacters] = useState<Character[]>([]);
  const [weeklyChecklist, setWeeklyChecklist] = useState<WeeklyChecklist>({});
  const [weeklyGoldHistory, setWeeklyGoldHistory] = useState<WeeklyGoldRecord[]>([]);
  const [commonContent, setCommonContent] = useState<CommonContentState>({ date: '', checks: {} });

  // 데모 로그인 유도 모달
  const [demoLoginPrompt, setDemoLoginPrompt] = useState(false);
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
  const [selectedCharOrder, setSelectedCharOrder] = useState<string[]>([]); // 선택 순서
  const [selectedRepChar, setSelectedRepChar] = useState<string>(''); // 대표 캐릭터
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
  // 데스크톱 여부 (레이드 표시 개수 분기)
  // 대표 캐릭터 이름
  const representativeChar = useMemo(() => {
    if (isDemo) return DEMO_MAIN_CHARACTER;
    if (activeExpedition === 1) return userProfile?.mainCharacter || characters[0]?.name || '';
    const expKey = activeExpedition === 2 ? 'expedition2' : 'expedition3';
    return (userProfile as any)?.[expKey]?.mainCharacter || characters[0]?.name || '';
  }, [isDemo, userProfile, activeExpedition, characters]);

  const [isDesktop, setIsDesktop] = useState(true);
  const [row2ScrollIndex, setRow2ScrollIndex] = useState<Record<string, number>>({});
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth > 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);


  // 닉네임 변경
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [nicknameMessage, setNicknameMessage] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const nicknameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 원정대별 데이터 추출 헬퍼
  const getExpeditionData = useCallback((profile: typeof userProfile, expIdx: 1 | 2 | 3) => {
    if (!profile) return { chars: [], checklist: {}, goldHistory: [], saved: undefined, allChars: [], lastReset: undefined };
    if (expIdx === 1) {
      return {
        chars: profile.characters || [],
        checklist: profile.weeklyChecklist || {},
        goldHistory: profile.weeklyGoldHistory || [],
        saved: profile.commonContent,
        allChars: profile.allCharacters || [],
        lastReset: profile.lastWeeklyReset,
      };
    }
    const expKey = expIdx === 2 ? 'expedition2' : 'expedition3';
    const exp = profile[expKey];
    if (!exp) return { chars: [], checklist: {}, goldHistory: [], saved: undefined, allChars: [], lastReset: undefined };
    return {
      chars: exp.characters || [],
      checklist: exp.weeklyChecklist || {},
      goldHistory: exp.weeklyGoldHistory || [],
      saved: exp.commonContent,
      allChars: exp.allCharacters || [],
      lastReset: exp.lastWeeklyReset,
    };
  }, []);

  // 원정대 데이터 로드 함수
  const loadExpeditionData = useCallback((profile: typeof userProfile, expIdx: 1 | 2 | 3) => {
    const { chars, checklist, goldHistory, saved, allChars } = getExpeditionData(profile, expIdx);

    // characters 중복 제거 (이름 기준, 높은 레벨 유지)
    const charMap = new Map<string, typeof chars[0]>();
    chars.forEach(c => {
      const ex = charMap.get(c.name);
      if (!ex || c.itemLevel > ex.itemLevel) charMap.set(c.name, c);
    });
    const cleanChars = Array.from(charMap.values());
    setCharacters(cleanChars);
    setWeeklyChecklist(checklist);
    setWeeklyGoldHistory(goldHistory);

    // DB에 중복이 있었으면 자동 정리 저장
    if (cleanChars.length < chars.length && profile) {
      (async () => {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase-client');
          const uid = (profile as any).uid;
          if (!uid) return;
          const userRef = doc(db, 'users', uid);
          const prefix = expIdx === 1 ? '' : expIdx === 2 ? 'expedition2.' : 'expedition3.';
          await updateDoc(userRef, { [`${prefix}characters`]: cleanChars });
        } catch (e) { /* 실패해도 무시 - 다음 저장 시 정리됨 */ }
      })();
    }

    // 공통 컨텐츠 로드 (주간 초기화 - 수요일 06시 기준)
    const { weekStart } = getKSTWeekInfo();
    if (saved && saved.date === weekStart) {
      setCommonContent(saved);
    } else {
      setCommonContent({ date: weekStart, checks: {} });
    }

    // 전체 원정대 목록도 로드 (이름 기준 중복 제거 + DB 자동 정리)
    if (allChars.length > 0) {
      const bestByName = new Map<string, typeof allChars[0]>();
      allChars.forEach(c => {
        const existing = bestByName.get(c.name);
        if (!existing || c.itemLevel > existing.itemLevel) bestByName.set(c.name, c);
      });
      const cleanAll = Array.from(bestByName.values());
      setAllSiblings(cleanAll);
      if (cleanAll.length < allChars.length && userProfile) {
        (async () => {
          try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase-client');
            const uid = userProfile.uid;
            if (!uid) return;
            const userRef = doc(db, 'users', uid);
            const prefix = activeExpedition === 1 ? '' : activeExpedition === 2 ? 'expedition2.' : 'expedition3.';
            await updateDoc(userRef, { [`${prefix}allCharacters`]: cleanAll });
          } catch (e) { /* 다음 저장 시 정리됨 */ }
        })();
      }
    } else {
      setAllSiblings([]);
    }
  }, [getExpeditionData]);

  // 원정대 탭 전환
  const switchExpedition = useCallback((expIdx: 1 | 2 | 3) => {
    if (expIdx === activeExpedition) return;
    if (hasChanges) {
      const confirmed = window.confirm('저장하지 않은 변경사항이 있습니다. 탭을 전환하시겠습니까?');
      if (!confirmed) return;
    }
    setActiveExpedition(expIdx);
    setHasChanges(false);
    setExpandedRaidChar(null);
    setDifficultyOpenKey(null);
    setShowAllCharacters(false);
    imageLoadAttempted.current = false;
    loadExpeditionData(userProfile, expIdx);
  }, [activeExpedition, hasChanges, userProfile, loadExpeditionData]);

  // Firestore 필드 prefix (원정대별)
  const getFirestorePrefix = useCallback((expIdx: 1 | 2 | 3) => {
    if (expIdx === 1) return '';
    return expIdx === 2 ? 'expedition2.' : 'expedition3.';
  }, []);

  // 프로필 데이터 로드 + 주간 초기화 체크
  useEffect(() => {
    if (!userProfile || !user) return;

    const { chars, checklist, goldHistory, saved, allChars, lastReset } = getExpeditionData(userProfile, activeExpedition);

    setCharacters(chars);
    setWeeklyChecklist(checklist);
    setWeeklyGoldHistory(goldHistory);

    // 공통 컨텐츠 로드 (주간 초기화 - 수요일 06시 기준)
    const { weekStart } = getKSTWeekInfo();
    if (saved && saved.date === weekStart) {
      setCommonContent(saved);
    } else {
      setCommonContent({ date: weekStart, checks: {} });
    }

    // 전체 원정대 목록도 로드 (이름 기준 중복 제거 + DB 자동 정리)
    if (allChars.length > 0) {
      const bestByName = new Map<string, typeof allChars[0]>();
      allChars.forEach(c => {
        const existing = bestByName.get(c.name);
        if (!existing || c.itemLevel > existing.itemLevel) bestByName.set(c.name, c);
      });
      const cleanAll = Array.from(bestByName.values());
      setAllSiblings(cleanAll);
      if (cleanAll.length < allChars.length && userProfile) {
        (async () => {
          try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase-client');
            const uid = userProfile.uid;
            if (!uid) return;
            const userRef = doc(db, 'users', uid);
            const prefix = activeExpedition === 1 ? '' : activeExpedition === 2 ? 'expedition2.' : 'expedition3.';
            await updateDoc(userRef, { [`${prefix}allCharacters`]: cleanAll });
          } catch (e) { /* 다음 저장 시 정리됨 */ }
        })();
      }
    } else {
      setAllSiblings([]);
    }

    // 주간 초기화 체크 (수요일 06:00 KST) - 현재 활성 원정대만
    if (chars.length > 0 && needsWeeklyReset(lastReset)) {
      console.log(`[주간 초기화] 원정대${activeExpedition} 수요일 06시 지남, 체크리스트 초기화 시작`);

      // 1. 먼저 현재 골드를 기록에 저장
      const { totalGold, raidGold, additionalGold, commonGold } = calculateTotalGoldFromChecklist(chars, checklist, saved || undefined);

      // 지난 주 시작일 계산 (현재 주 시작일 - 7일)
      const lastWeekStart = lastReset
        ? lastReset.split('T')[0]
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
        commonGold,
        characterCount: chars.length,
      };

      // 2. 초기화
      const resetChecklist = resetWeeklyChecklist(checklist, chars);
      const resetCommon: CommonContentState = { date: getCurrentWeekStart(), checks: {} };
      const now = new Date().toISOString();

      // Firestore 업데이트
      const prefix = getFirestorePrefix(activeExpedition);
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
            [`${prefix}weeklyChecklist`]: resetChecklist,
            [`${prefix}weeklyGoldHistory`]: updatedHistory,
            [`${prefix}commonContent`]: resetCommon,
            [`${prefix}lastWeeklyReset`]: now,
          });

          setWeeklyChecklist(resetChecklist);
          setWeeklyGoldHistory(updatedHistory);
          setCommonContent(resetCommon);
          console.log(`[주간 초기화] 원정대${activeExpedition} 완료`);
        } catch (error) {
          console.error('[주간 초기화] 실패:', error);
        }
      })();
    }
  }, [userProfile, user, activeExpedition, getExpeditionData, getFirestorePrefix]);

  // 데모 모드 데이터 초기화
  const demoInitialized = useRef(false);
  useEffect(() => {
    if (isDemo && !demoInitialized.current) {
      demoInitialized.current = true;
      setCharacters(DEMO_CHARACTERS);
      setWeeklyChecklist(DEMO_WEEKLY_CHECKLIST);
      setWeeklyGoldHistory(DEMO_GOLD_HISTORY);
      setCommonContent(DEMO_COMMON_CONTENT);
    }
    if (!isDemo) {
      demoInitialized.current = false;
    }
  }, [isDemo]);

  // 이미지 없는 캐릭터들의 이미지 로드
  useEffect(() => {
    if (!user || !userProfile || imageLoadAttempted.current) return;

    const { chars } = getExpeditionData(userProfile, activeExpedition);
    const charsWithoutImage = chars
      .slice(0, 6)
      .filter(c => !c.imageUrl);

    if (charsWithoutImage.length === 0) return;

    imageLoadAttempted.current = true;
    setLoadingImages(true);

    updateCharacterImages(user.uid, charsWithoutImage.map(c => c.name), activeExpedition)
      .then(result => {
        if (result.success) {
          refreshUserProfile();
        }
      })
      .finally(() => {
        setLoadingImages(false);
      });
  }, [user, userProfile, refreshUserProfile, activeExpedition, getExpeditionData]);

  // 펼침 상태 localStorage 저장
  useEffect(() => {
    try { localStorage.setItem('mypage-expandedCards', JSON.stringify(expandedCards)); } catch {}
  }, [expandedCards]);

  // 로그인 체크 - 로그인 프롬프트를 표시하므로 리다이렉트 불필요

  // 창 닫을 때 변경사항 경고 (데모 모드 제외)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && !isDemo) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, isDemo]);

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

      // 이름 기준 중복 제거 (높은 레벨 유지)
      const bestMap = new Map<string, Character>();
      chars.forEach(c => { const ex = bestMap.get(c.name); if (!ex || c.itemLevel > ex.itemLevel) bestMap.set(c.name, c); });
      const dedupedChars = Array.from(bestMap.values());

      setAllSiblings(dedupedChars);
      // 상위 6개 자동 선택 (1640 이상만)
      const top6Names = dedupedChars.filter(c => c.itemLevel >= 1640).slice(0, 6).map(c => c.name);
      setSelectedCharNames(new Set(top6Names));
      setSelectedCharOrder(top6Names);
      setSelectedRepChar(top6Names[0] || '');
      setRegisterStep(2);
    } catch (error) {
      setRegisterError('검색 중 오류가 발생했습니다.');
    }

    setIsSearching(false);
  };

  // 캐릭터 선택 토글
  const toggleCharacterSelection = (charName: string) => {
    if (selectedCharNames.has(charName)) {
      setSelectedCharNames(prev => { const s = new Set(prev); s.delete(charName); return s; });
      setSelectedCharOrder(prev => prev.filter(n => n !== charName));
      if (selectedRepChar === charName) setSelectedRepChar('');
    } else if (selectedCharNames.size < 6) {
      setSelectedCharNames(prev => new Set([...prev, charName]));
      setSelectedCharOrder(prev => {
        if (prev.includes(charName)) return prev;
        return [...prev, charName];
      });
    }
  };

  // 순서 변경 (위/아래)
  const moveCharOrder = (name: string, direction: -1 | 1) => {
    setSelectedCharOrder(prev => {
      const filtered = prev.filter(n => selectedCharNames.has(n));
      const idx = filtered.indexOf(name);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= filtered.length) return prev;
      [filtered[idx], filtered[newIdx]] = [filtered[newIdx], filtered[idx]];
      return filtered;
    });
  };


  // 캐릭터 등록 (2단계)
  const handleRegister = async () => {
    if (!user || selectedCharNames.size === 0) return;

    setIsRegistering(true);
    setRegisterError(null);

    try {
      // 사용자 순서대로 정렬
      const orderedNames = selectedCharOrder.filter(n => selectedCharNames.has(n));
      const selectedChars = orderedNames
        .map(name => allSiblings.find(c => c.name === name)!)
        .filter(Boolean);

      const repChar = selectedRepChar || selectedChars[0]?.name || '';

      const newChecklist: WeeklyChecklist = {};
      selectedChars.forEach(char => {
        newChecklist[char.name] = weeklyChecklist[char.name] || createEmptyWeeklyState(char.itemLevel);
      });

      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase-client');
      const userRef = doc(db, 'users', user.uid);

      const prefix = getFirestorePrefix(activeExpedition);
      await updateDoc(userRef, {
        [`${prefix}characters`]: selectedChars,
        [`${prefix}allCharacters`]: allSiblings,
        [`${prefix}mainCharacter`]: repChar,
        [`${prefix}weeklyChecklist`]: newChecklist,
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
    const uniqueNames = [...new Set(characters.map(c => c.name))];
    setSelectedCharNames(new Set(uniqueNames));
    setSelectedCharOrder(uniqueNames);
    // 기존 대표 캐릭터 또는 첫 번째
    const expData = getExpeditionData(userProfile, activeExpedition);
    const currentMain = activeExpedition === 1 ? userProfile?.mainCharacter : expData.chars[0]?.name;
    setSelectedRepChar(currentMain || characters[0]?.name || '');
    setShowEditModal(true);
  };

  // 원정대 편집 저장
  const handleEditSave = async () => {
    if (!user) return;

    setIsRegistering(true);

    try {
      const orderedNames = selectedCharOrder.filter(n => selectedCharNames.has(n));
      const selectedChars = orderedNames
        .map(name => allSiblings.find(c => c.name === name)!)
        .filter(Boolean);

      const repChar = selectedRepChar || selectedChars[0]?.name || '';

      const newChecklist: WeeklyChecklist = {};
      selectedChars.forEach(char => {
        newChecklist[char.name] = weeklyChecklist[char.name] || createEmptyWeeklyState(char.itemLevel);
      });

      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase-client');
      const userRef = doc(db, 'users', user.uid);

      const prefix = getFirestorePrefix(activeExpedition);
      await updateDoc(userRef, {
        [`${prefix}characters`]: selectedChars,
        [`${prefix}mainCharacter`]: repChar,
        [`${prefix}weeklyChecklist`]: newChecklist,
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

  // 원정대 삭제
  const handleDeleteExpedition = async () => {
    if (!user) return;

    const confirmMsg = activeExpedition === 1
      ? '원정대 1의 모든 캐릭터와 체크리스트가 삭제됩니다. 계속하시겠습니까?'
      : `원정대 ${activeExpedition}의 모든 데이터가 삭제됩니다. 계속하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    setIsRegistering(true);

    try {
      const { doc, updateDoc, deleteField } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase-client');
      const userRef = doc(db, 'users', user.uid);

      if (activeExpedition === 1) {
        // 원정대 1은 필드를 빈 값으로 초기화
        await updateDoc(userRef, {
          characters: [],
          allCharacters: [],
          mainCharacter: '',
          weeklyChecklist: {},
          commonContent: deleteField(),
          weeklyGoldHistory: [],
          lastWeeklyReset: deleteField(),
        });
      } else {
        // 원정대 2/3은 필드 자체를 삭제
        const expKey = activeExpedition === 2 ? 'expedition2' : 'expedition3';
        await updateDoc(userRef, {
          [expKey]: deleteField(),
        });
      }

      setCharacters([]);
      setAllSiblings([]);
      setWeeklyChecklist({});
      setWeeklyGoldHistory([]);
      setCommonContent({ date: '', checks: {} });
      setShowEditModal(false);
      setHasChanges(false);
      await refreshUserProfile();
    } catch (error) {
      console.error('원정대 삭제 실패:', error);
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

      // 로컬 상태 업데이트 (순서 유지)
      setCharacters(prev => prev.map(c => {
        if (c.name === characterName) {
          if (c.imageUrl && !updatedChar.imageUrl) {
            return { ...updatedChar, imageUrl: c.imageUrl };
          }
          return updatedChar;
        }
        return c;
      }));

      // allSiblings도 갱신 (편집 모달에 반영)
      setAllSiblings(prev => prev.map(c =>
        c.name === characterName ? { ...updatedChar, imageUrl: c.imageUrl || updatedChar.imageUrl } : c
      ));

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
      let currentRaidState = charState.raids[raidName] || [];
      if (currentRaidState.length === 0) {
        const raidData = raidMap.get(raidName);
        if (raidData) {
          currentRaidState = new Array(raidData.gates.length).fill(false);
        }
      }
      const allChecked = currentRaidState.length > 0 && currentRaidState.every(v => v);
      const willCheck = !allChecked;
      const newRaidState = currentRaidState.map(() => willCheck);

      // 골드 수령 + 더보기 자동 관리
      const currentReceive = { ...(charState.raidGoldReceive || {}) };
      const currentMore = { ...(charState.raidMoreGoldExclude || {}) };
      if (willCheck) {
        // 현재 체크된 다른 레이드 중 골드 수령 중인 개수 (undefined = 골드 수령)
        const checkedGoldCount = Object.entries(charState.raids).filter(([name, gates]) => {
          if (name === raidName) return false;
          if (!gates.some(v => v)) return false;
          return currentReceive[name] !== false;
        }).length;
        // 3개 이하까지 골드+더보기 활성화, 4개부터 비활성화
        const withinLimit = checkedGoldCount < 3;
        currentReceive[raidName] = withinLimit;
        currentMore[raidName] = withinLimit;
      } else {
        delete currentReceive[raidName];
        delete currentMore[raidName];
      }

      return {
        ...prev,
        [charName]: {
          ...charState,
          raids: {
            ...charState.raids,
            [raidName]: newRaidState,
          },
          raidGoldReceive: currentReceive,
          raidMoreGoldExclude: currentMore,
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

  // 일일 컨텐츠 (카던/가토) 요일별 사이클 (0→1→2→3→4→0)
  const toggleDailyCheck = (charName: string, field: 'chaosDungeon' | 'guardianRaid', dayIdx: number) => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      const current: DailyContentState = charState[field] && typeof charState[field] === 'object'
        ? charState[field] as DailyContentState
        : { checks: new Array(7).fill(0) };
      const newChecks = [...current.checks];
      const maxVal = field === 'guardianRaid' ? 2 : 4;
      const cur = typeof newChecks[dayIdx] === 'number' ? newChecks[dayIdx] : (newChecks[dayIdx] ? 1 : 0);
      newChecks[dayIdx] = cur >= maxVal ? 0 : cur + 1;
      return {
        ...prev,
        [charName]: {
          ...charState,
          [field]: { checks: newChecks },
        },
      };
    });
    setHasChanges(true);
  };

  // 휴게 수동 설정
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

      return { ...prev, checks: { ...prev.checks, [key]: true } };
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

    const newRaid = raidMap.get(newRaidName);
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

  // 골드 수령 토글
  const toggleRaidGoldReceive = (charName: string, raidName: string) => {
    setWeeklyChecklist(prev => {
      const charState = prev[charName] || createEmptyWeeklyState(
        characters.find(c => c.name === charName)?.itemLevel || 0
      );
      const currentReceive = charState.raidGoldReceive || {};
      const currentValue = currentReceive[raidName] !== false; // 기본 true

      return {
        ...prev,
        [charName]: {
          ...charState,
          raidGoldReceive: {
            ...currentReceive,
            [raidName]: !currentValue,
          },
        },
      };
    });
    setHasChanges(true);
  };

  // 체크된 레이드 중 골드 수령 개수 계산
  const getGoldReceiveCount = (charName: string): number => {
    const charState = weeklyChecklist[charName];
    if (!charState) return 0;
    return Object.entries(charState.raids).filter(([raidName, gates]) => {
      const isChecked = gates.some(v => v);
      const receiveGold = charState.raidGoldReceive?.[raidName] !== false;
      return isChecked && receiveGold;
    }).length;
  };

  // 체크된 레이드 목록 가져오기
  const getCheckedRaids = (charName: string) => {
    const charState = weeklyChecklist[charName];
    if (!charState) return [];

    return Object.entries(charState.raids)
      .filter(([_, gates]) => gates.some(v => v))
      .map(([raidName]) => {
        const raid = raidMap.get(raidName);
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

      // allSiblings에 갱신된 캐릭터 레벨 반영 + 중복 제거
      const sibMap = new Map<string, typeof allSiblings[0]>();
      allSiblings.forEach(s => {
        const updated = characters.find(c => c.name === s.name);
        const merged = updated ? { ...s, itemLevel: updated.itemLevel, imageUrl: updated.imageUrl || s.imageUrl } : s;
        const ex = sibMap.get(merged.name);
        if (!ex || merged.itemLevel > ex.itemLevel) sibMap.set(merged.name, merged);
      });
      const updatedSiblings = Array.from(sibMap.values());
      setAllSiblings(updatedSiblings);

      // characters 중복 제거
      const charMap = new Map<string, typeof characters[0]>();
      characters.forEach(c => { const ex = charMap.get(c.name); if (!ex || c.itemLevel > ex.itemLevel) charMap.set(c.name, c); });
      const cleanChars = Array.from(charMap.values());

      const prefix = getFirestorePrefix(activeExpedition);
      await updateDoc(userRef, {
        [`${prefix}characters`]: cleanChars,
        [`${prefix}allCharacters`]: updatedSiblings,
        [`${prefix}weeklyChecklist`]: weeklyChecklist,
        [`${prefix}commonContent`]: commonContent,
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

  // 원정대 최고 레벨
  const maxCharLevel = useMemo(() => {
    if (characters.length === 0) return 0;
    return Math.max(...characters.map(c => c.itemLevel));
  }, [characters]);

  // 레벨 기반 공통 컨텐츠
  const COMMON_CONTENTS = useMemo(() => getCommonContents(maxCharLevel), [maxCharLevel]);

  // 카오스게이트 레벨 티어
  const chaosGateLevelTier = maxCharLevel >= 1750 ? '1750' : '1730';

  // 총 골드 계산 (useMemo로 값 캐싱 — 매 렌더마다 재계산 방지)
  const totalGold = useMemo(() => {
    let total = 0;

    characters.forEach(char => {
      const state = weeklyChecklist[char.name];
      if (!state) return;

      Object.entries(state.raids).forEach(([raidName, gates]) => {
        const raid = raidMap.get(raidName);
        if (raid) {
          const receiveGold = state.raidGoldReceive?.[raidName] !== false;
          const buyMore = state.raidMoreGoldExclude?.[raidName] === true;

          gates.forEach((checked, i) => {
            if (checked && raid.gates[i]) {
              if (receiveGold) {
                total += raid.gates[i].gold;
              }
              if (buyMore) {
                total -= raid.gates[i].moreGold;
              }
            }
          });
        }
      });

      total += state.additionalGold || 0;
    });

    // 공통 컨텐츠 골드 (복주머니, 카오스게이트 등)
    Object.entries(commonContent.checks).forEach(([key, checked]) => {
      if (!checked) return;
      const contentName = key.split('-').slice(1).join('-');
      const content = COMMON_CONTENTS.find(c => c.name === contentName);
      if (content?.gold) total += content.gold;
    });

    return total;
  }, [characters, weeklyChecklist, commonContent, COMMON_CONTENTS]);

  // 주간 재화 합산 데이터 (레이드 + 카던 + 가토)
  // itemId → 이미지/이름 직접 매핑 (카던 짧은 이름 문제 방지)
  const itemIdInfoRef: Record<number, { name: string; image: string }> = {
    [MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL]: { name: '운명의 파괴석 결정', image: '/top-destiny-destruction-stone5.webp' },
    [MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL]: { name: '운명의 수호석 결정', image: '/top-destiny-guardian-stone5.webp' },
    [MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE]: { name: '위대한 운명의 돌파석', image: '/top-destiny-breakthrough-stone5.webp' },
    [MATERIAL_IDS.FATE_DESTRUCTION_STONE]: { name: '운명의 파괴석', image: '/destiny-destruction-stone5.webp' },
    [MATERIAL_IDS.FATE_GUARDIAN_STONE]: { name: '운명의 수호석', image: '/destiny-guardian-stone5.webp' },
    [MATERIAL_IDS.FATE_BREAKTHROUGH_STONE]: { name: '운명의 돌파석', image: '/destiny-breakthrough-stone5.webp' },
    [MATERIAL_IDS.FATE_FRAGMENT]: { name: '운명의 파편', image: '/destiny-shard-bag-large5.webp' },
  };


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

  const displayCharacters = showAllCharacters ? characters : characters.slice(0, 6);

  // 캐릭터별 일일 컨텐츠 펼침/닫힘
  const toggleDailyExpand = (charName: string) => {
    setExpandedCards(prev => ({ ...prev, [charName]: !prev[charName] }));
  };

  return (
    <div className={styles.pageWrapper}>
      <Container fluid className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>마이페이지</h1>
        </div>

        {/* 데모 안내 */}
        {isDemo && (
          <div className={styles.demoCta}>
            <div className={styles.demoCtaInner}>
              <h3 className={styles.demoCtaTitle}>일간 / 주간 숙제 체크리스트</h3>
              <p className={styles.demoCtaDesc}>아래는 예시 화면입니다.</p>
              <button onClick={signInWithGoogle} className={styles.demoCtaBtn}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google 로그인
              </button>
            </div>
          </div>
        )}

        {/* 데모 로그인 유도 모달 */}
        <Modal show={demoLoginPrompt} onHide={() => setDemoLoginPrompt(false)} centered size="sm">
          <Modal.Body className="text-center py-4">
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <h5 style={{ fontWeight: 700, marginBottom: '8px' }}>저장은 로그인 후 가능합니다</h5>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Google 계정으로 로그인하고<br />원정대를 등록하면 데이터가 저장됩니다.
            </p>
            <button onClick={() => { setDemoLoginPrompt(false); signInWithGoogle(); }} className={styles.googleLoginBtn} style={{ margin: '0 auto 12px' }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Google 로그인</span>
            </button>
            <button onClick={() => setDemoLoginPrompt(false)} className={styles.backHomeBtn} style={{ padding: '8px 16px', fontSize: '13px' }}>
              계속 체험하기
            </button>
          </Modal.Body>
        </Modal>

        {/* 원정대 탭 + 버튼 */}
        <div className={styles.expeditionRow}>
          <div className={styles.expeditionTabs}>
          {isDemo ? (
            <button className={`${styles.expeditionTab} ${styles.activeTab}`}>
              원정대 1
              <span className={styles.tabBadge}>({characters.length})</span>
            </button>
          ) : ([1, 2, 3] as const).map(idx => {
            const expData = getExpeditionData(userProfile, idx);
            const hasData = expData.chars.length > 0;
            return (
              <button
                key={idx}
                className={`${styles.expeditionTab} ${activeExpedition === idx ? styles.activeTab : ''}`}
                onClick={() => switchExpedition(idx)}
              >
                원정대 {idx}
                {hasData && <span className={styles.tabBadge}>({expData.chars.length})</span>}
              </button>
            );
          })}
          </div>
          <div className={styles.expeditionBtns}>
            {isDemo ? (
              <>
                <button className={styles.registerBtn} onClick={() => setDemoLoginPrompt(true)}>
                  + 캐릭터 등록
                </button>
                <button
                  className={`${styles.saveButton} ${hasChanges ? styles.hasChanges : ''}`}
                  onClick={() => setDemoLoginPrompt(true)}
                >
                  저장
                </button>
              </>
            ) : (
              <>
                <button className={styles.registerBtn} onClick={() => setShowRegisterModal(true)}>
                  + 캐릭터 등록
                </button>
                {characters.length > 0 && (
                  <button className={styles.editBtn} onClick={openEditModal}>편집</button>
                )}
                <button
                  className={`${styles.saveButton} ${hasChanges ? styles.hasChanges : ''}`}
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving ? <Spinner animation="border" size="sm" /> : '저장'}
                </button>
              </>
            )}
            <div className={styles.totalGoldBadge}>
              <span className={styles.goldLabel}>이번 주 예상</span>
              <span className={styles.goldAmount}>{totalGold.toLocaleString()}G</span>
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
        {!isDemo && characters.length === 0 && (
          activeExpedition === 1 ? (
            <Card className={styles.emptyCard}>
              <Card.Body className="text-center py-4">
                <p className="mb-3">등록된 캐릭터가 없습니다.</p>
                <Button variant="primary" size="sm" onClick={() => setShowRegisterModal(true)}>
                  캐릭터 등록하기
                </Button>
              </Card.Body>
            </Card>
          ) : (
            <div className={styles.emptyExpedition}>
              <div className={styles.emptyIcon}>⚔️</div>
              <div className={styles.emptyTitle}>원정대 {activeExpedition}</div>
              <div className={styles.emptyDesc}>
                등록된 캐릭터가 없습니다.<br />
                다른 서버의 원정대를 등록해보세요.
              </div>
              <button
                className={styles.emptyRegisterBtn}
                onClick={() => setShowRegisterModal(true)}
              >
                + 원정대 등록
              </button>
            </div>
          )
        )}

        {/* 캐릭터 카드 그리드 (1열) */}
        <div className={styles.cardGrid}>
          {displayCharacters
            .map((char, charIdx) => {
            const charState = weeklyChecklist[char.name] || createEmptyWeeklyState(char.itemLevel);
            const top3Raids = getTop3RaidGroups(char.itemLevel);

            // 캐릭터별 골드 계산
            let charGold = 0;
            Object.entries(charState.raids).forEach(([raidName, gates]) => {
              const raid = raidMap.get(raidName);
              if (raid) {
                const receiveGold = charState.raidGoldReceive?.[raidName] !== false;
                const buyMore = charState.raidMoreGoldExclude?.[raidName] === true;
                gates.forEach((checked, i) => {
                  if (checked && raid.gates[i]) {
                    if (receiveGold) charGold += raid.gates[i].gold;
                    if (buyMore) charGold -= raid.gates[i].moreGold;
                  }
                });
              }
            });
            charGold += charState.additionalGold || 0;
            // 대표 캐릭터: 공통 컨텐츠 골드 포함
            if (char.name === representativeChar) {
              Object.entries(commonContent.checks).forEach(([key, checked]) => {
                if (!checked) return;
                const contentName = key.split('-').slice(1).join('-');
                const content = COMMON_CONTENTS.find(c => c.name === contentName);
                if (content?.gold) charGold += content.gold;
              });
            }

            // 체크된 레이드 목록
            const checkedRaids = getCheckedRaids(char.name);
            const allRaidGroups = getAllRaidGroups(char.itemLevel);

            // 재화 데이터
            const chaosReward = getChaosDailyReward(char.itemLevel);
            const chaosChecks = charState.chaosDungeon?.checks.reduce((s, v) => s + (typeof v === 'number' ? v : (v ? 1 : 0)), 0) || 0;
            const guardianReward = getGuardianDailyReward(char.itemLevel);
            const guardianChecks = charState.guardianRaid?.checks.reduce((s, v) => s + (typeof v === 'number' ? v : (v ? 1 : 0)), 0) || 0;
            const hasChaos = chaosReward && chaosChecks > 0;
            const hasGuardian = guardianReward && guardianChecks > 0;

            // 일일 컨텐츠 렌더 함수 (데스크톱: 오른쪽 상자, 모바일: 카드 내부)
            const MULTI_COLORS = ['', styles.dailyX1, styles.dailyX2, styles.dailyX3, styles.dailyX4];
            const MULTI_CARD_COLORS = ['', styles.dailyCardX1, styles.dailyCardX2, styles.dailyCardX3, styles.dailyCardX4];
            const MULTI_LABELS = ['', '일반', '휴게', 'PC방', 'PC방+휴게'];
            const renderDailySide = (
              label: string,
              field: 'chaosDungeon' | 'guardianRaid',
              blockClass: string = styles.sideDaily,
            ) => {
              const state: DailyContentState =
                charState[field] && typeof charState[field] === 'object'
                  ? charState[field] as DailyContentState
                  : EMPTY_DAILY;
              const maxVal = Math.max(...state.checks.map(v => typeof v === 'number' ? v : (v ? 1 : 0)), 0);

              return (
                <div className={`${blockClass} ${MULTI_CARD_COLORS[maxVal] || ''}`}>
                  <div className={styles.dailyHeader}>
                    <span className={styles.dailyLabel}>{label}</span>
                  </div>
                  <div className={styles.dailyChecks}>
                    {WEEKLY_DAY_LABELS.map((day, idx) => {
                      const val = typeof state.checks[idx] === 'number' ? state.checks[idx] : (state.checks[idx] ? 1 : 0);
                      return (
                        <button
                          key={idx}
                          className={`${styles.dailyDayBtn} ${val > 0 ? MULTI_COLORS[val] : ''}`}
                          onClick={() => toggleDailyCheck(char.name, field, idx)}
                        >
                          {val > 0
                            ? <span className={styles.dailyCheckMark}>×{val}</span>
                            : <span className={styles.dailyDayText}>{day}</span>
                          }
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            };

            return (
              <div key={char.name} className={styles.cardWrapper}>
              <div className={styles.characterCard}>
                {/* 카드 헤더: 닉네임 + 갱신버튼 + 레벨 */}
                <div className={styles.cardHeader}>
                  <span className={styles.characterName}>{char.name}{char.name === representativeChar && <span className={styles.repBadge}>대표</span>}</span>
                  <div className={styles.headerRight}>
                    <button
                      className={`${styles.refreshBtn} ${!isDemo && !canRefresh(char.name) ? styles.refreshDisabled : ''}`}
                      onClick={() => isDemo ? setDemoLoginPrompt(true) : handleRefresh(char.name)}
                      disabled={!isDemo && (refreshingChar === char.name || !canRefresh(char.name))}
                      title={isDemo ? '레벨 갱신 (로그인 필요)' : canRefresh(char.name) ? '레벨 갱신' : `${Math.floor(getRemainingCooldown(char.name) / 60)}분 ${getRemainingCooldown(char.name) % 60}초 후 가능`}
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
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.characterPlaceholder}>
                        <Spinner animation="border" size="sm" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 2줄 */}
                  <div className={styles.cardRight}>
                    {/* 1줄: 레이드 4개 + 넘기기 버튼 */}
                    {(() => {
                      const startIdx = raidScrollIndex[char.name] || 0;
                      const raidCount = isDesktop ? 4 : 3;
                      const visibleRaids: { raid: typeof raids[0] | null; groupName: string }[] = [];

                      // 현재 보여줄 레이드 계산
                      for (let i = 0; i < raidCount; i++) {
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
                      const canScrollRight = startIdx + raidCount < allRaidGroups.length;

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
                              const difficulty = raid.name.startsWith(groupName) ? raid.name.slice(groupName.length).trim() : '';
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
                                  <CardBgImage src={groupImage} alt={groupName} className={styles.raidImage} />
                                  <div className={styles.raidOverlay} />
                                  <div className={styles.raidInfo}>
                                    <span className={styles.raidName}>{groupName}</span>
                                    {difficulty && <span className={styles.raidDifficulty}>{difficulty}</span>}
                                    <span className={styles.raidLevel}>Lv.{raid.level}</span>
                                  </div>
                                  {checked && (
                                    <div
                                      className={`${styles.raidMoreBadge} ${charState.raidMoreGoldExclude?.[raid.name] ? styles.raidMoreBadgeActive : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRaidMoreGoldExclude(char.name, raid.name);
                                      }}
                                      title={charState.raidMoreGoldExclude?.[raid.name] ? '더보기 구매 중' : '더보기 미구매'}
                                    >
                                      더보기
                                    </div>
                                  )}
                                  {checked && (
                                    <div
                                      className={`${styles.raidGoldIcon} ${charState.raidGoldReceive?.[raid.name] !== false ? styles.raidGoldActive : styles.raidGoldInactive}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRaidGoldReceive(char.name, raid.name);
                                      }}
                                      title={charState.raidGoldReceive?.[raid.name] !== false ? '골드 수령 중' : '골드 미수령'}
                                    >
                                      <Image src="/gold.webp" alt="골드" width={18} height={18} />
                                    </div>
                                  )}
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
                                        const diffName = diff.name.startsWith(groupName) ? (diff.name.slice(groupName.length).trim() || '기본') : (diff.name.split(' ').slice(1).join(' ') || '기본');
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
                                [char.name]: Math.min(allRaidGroups.length - raidCount, (prev[char.name] || 0) + 1)
                              }))}
                            >
                              ›
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* 2줄: 일일+공통 (1줄과 동일 스크롤 구조) */}
                    {(() => {
                      // 모든 2줄 카드를 배열로 구성
                      type Row2Card = { id: string; render: () => React.ReactNode };
                      const row2Cards: Row2Card[] = [];

                      // 균열/전선
                      row2Cards.push({ id: 'chaos', render: () => {
                        const chaosState: DailyContentState = charState.chaosDungeon && typeof charState.chaosDungeon === 'object' ? charState.chaosDungeon as DailyContentState : EMPTY_DAILY;
                        const gameDayIdx = getCurrentGameDayIdx();
                        const chaosVal = typeof chaosState.checks[gameDayIdx] === 'number' ? chaosState.checks[gameDayIdx] : (chaosState.checks[gameDayIdx] ? 1 : 0);
                        return (
                          <div className={`${styles.raidCard} ${chaosVal > 0 ? MULTI_CARD_COLORS[chaosVal] : ''}`} onClick={() => toggleDailyCheck(char.name, 'chaosDungeon', gameDayIdx)}>
                            <CardBgImage src={char.itemLevel >= 1730 ? '/zkejs.webp' : '/wjstjs.webp'} alt="" className={styles.raidImage} />
                            <div className={styles.raidOverlay} />
                            <div className={styles.raidInfo}>
                              <span className={styles.raidName}>{char.itemLevel >= 1730 ? '균열' : '전선'}</span>
                              <span className={styles.raidLevel}>Lv.{char.itemLevel >= 1750 ? '1750' : char.itemLevel >= 1730 ? '1730' : char.itemLevel >= 1720 ? '1720' : char.itemLevel >= 1700 ? '1700' : char.itemLevel >= 1680 ? '1680' : '1640'}</span>
                            </div>
                            <div className={styles.dailyCardLegend}>
                              <div className={styles.dailyLegendGrid}>
                                <span className={styles.dailyLegendRow}><span className={`${styles.legendDotLg} ${styles.dailyX1}`}>1</span>일반</span>
                                <span className={styles.dailyLegendRow}><span className={`${styles.legendDotLg} ${styles.dailyX2}`}>2</span>휴게</span>
                                <span className={styles.dailyLegendRow}><span className={`${styles.legendDotLg} ${styles.dailyX3}`}>3</span>PC방</span>
                                <span className={styles.dailyLegendRow}><span className={`${styles.legendDotLg} ${styles.dailyX4}`}>4</span>PC방+휴게</span>
                              </div>
                            </div>
                            {chaosVal > 0 && <div className={`${styles.raidCheck} ${MULTI_COLORS[chaosVal]}`}>×{chaosVal}</div>}
                          </div>
                        );
                      }});

                      // 가토
                      row2Cards.push({ id: 'guardian', render: () => {
                        const guardianState: DailyContentState = charState.guardianRaid && typeof charState.guardianRaid === 'object' ? charState.guardianRaid as DailyContentState : EMPTY_DAILY;
                        const gameDayIdx = getCurrentGameDayIdx();
                        const guardVal = typeof guardianState.checks[gameDayIdx] === 'number' ? guardianState.checks[gameDayIdx] : (guardianState.checks[gameDayIdx] ? 1 : 0);
                        const guardian = getCurrentGuardian(char.itemLevel);
                        return (
                          <div className={`${styles.raidCard} ${guardVal > 0 ? MULTI_CARD_COLORS[guardVal] : ''}`} onClick={() => toggleDailyCheck(char.name, 'guardianRaid', gameDayIdx)}>
                            {guardian.image ? <CardBgImage src={guardian.image} alt={guardian.name} className={styles.raidImage} /> : <div className={styles.guardianCardPlaceholder} />}
                            <div className={styles.raidOverlay} />
                            <div className={styles.raidInfo}>
                              <span className={styles.raidName}>{guardian.name}</span>
                              {guardian.element && <span className={styles.raidDifficulty}>{guardian.element}</span>}
                            </div>
                            <div className={styles.dailyCardLegend}>
                              <div className={styles.dailyLegendGrid}>
                                <span className={styles.dailyLegendRow}><span className={`${styles.legendDotLg} ${styles.dailyX1}`}>1</span>일반</span>
                                <span className={styles.dailyLegendRow}><span className={`${styles.legendDotLg} ${styles.dailyX2}`}>2</span>휴게</span>
                              </div>
                            </div>
                            {guardVal > 0 && <div className={`${styles.raidCheck} ${MULTI_COLORS[guardVal]}`}>×{guardVal}</div>}
                          </div>
                        );
                      }});

                      // 모래시계 (1730+) / 낙원 (<1730)
                      if (char.itemLevel >= 1730) {
                        row2Cards.push({ id: 'sand', render: () => (
                          <div className={`${styles.raidCard} ${charState.sandOfTime ? styles.raidChecked : ''}`} onClick={() => toggleExtra(char.name, 'sandOfTime')}>
                            <CardBgImage src="/gkf.webp" alt="할의 모래시계" className={styles.raidImage} />
                            <div className={styles.raidOverlay} />
                            <div className={styles.sandTimeLevels} onClick={(e) => e.stopPropagation()}>
                              <span className={styles.sandTimeLevelLabel}>보상강화</span>
                              <div className={styles.sandTimeBtns}>
                                {[1,2,3,4,5].map(lv => {
                                  const currentLv = charState.sandOfTimeLevel || 0;
                                  return <button key={lv} className={`${styles.sandTimeLvBtn} ${lv <= currentLv ? styles.sandTimeLvActive : ''}`} onClick={() => { setWeeklyChecklist(prev => ({ ...prev, [char.name]: { ...prev[char.name], sandOfTimeLevel: currentLv === lv ? lv - 1 : lv }})); setHasChanges(true); }} />;
                                })}
                              </div>
                            </div>
                            <div className={styles.raidInfo}>
                              <span className={styles.raidName}>모래시계</span>
                              <span className={styles.raidLevel}>Lv.{char.itemLevel >= 1750 ? '1750' : '1730'}</span>
                            </div>
                            {charState.sandOfTime && <div className={styles.raidCheck}>✓</div>}
                          </div>
                        )});
                        // 대표: 공통 컨텐츠 (낙원보다 먼저)
                        if (char.name === representativeChar) {
                          const { dayOfWeek } = getKSTWeekInfo();
                          const todayContents = COMMON_CONTENTS.filter(c => c.days.includes(dayOfWeek));
                          todayContents.forEach(content => {
                            row2Cards.push({ id: `common-${content.name}`, render: () => {
                              const key = `${dayOfWeek}-${content.name}`;
                              const checked = commonContent.checks[key] === true;
                              return (
                                <div className={`${styles.raidCard} ${checked ? styles.raidChecked : ''}`} onClick={() => toggleCommonContent(dayOfWeek, content.name)}>
                                  <div className={styles.commonCardBg} style={{ background: content.color }}><CardBgImage src={content.image} alt={content.name} className={styles.raidImage} /></div>
                                  <div className={styles.raidOverlay} />
                                  <div className={styles.raidInfo}>
                                    <span className={styles.raidName}>{content.shortName}</span>
                                    {content.gold > 0 && <span className={styles.raidLevel}>{content.gold.toLocaleString()}G</span>}
                                  </div>
                                  {checked && <div className={styles.raidCheck}>✓</div>}
                                </div>
                              );
                            }});
                          });
                        }
                        // 낙원 (1730+)
                        row2Cards.push({ id: 'paradise', render: () => (
                          <div className={`${styles.raidCard} ${charState.paradise ? styles.raidChecked : ''}`} onClick={() => toggleExtra(char.name, 'paradise')}>
                            <CardBgImage src="/skrdnjs.webp" alt="낙원" className={styles.raidImage} />
                            <div className={styles.raidOverlay} />
                            <div className={styles.raidInfo}><span className={styles.raidName}>낙원</span></div>
                            {charState.paradise && <div className={styles.raidCheck}>✓</div>}
                          </div>
                        )});
                      } else {
                        row2Cards.push({ id: 'paradise', render: () => (
                          <div className={`${styles.raidCard} ${charState.paradise ? styles.raidChecked : ''}`} onClick={() => toggleExtra(char.name, 'paradise')}>
                            <CardBgImage src="/skrdnjs.webp" alt="낙원" className={styles.raidImage} />
                            <div className={styles.raidOverlay} />
                            <div className={styles.raidInfo}><span className={styles.raidName}>낙원</span></div>
                            {charState.paradise && <div className={styles.raidCheck}>✓</div>}
                          </div>
                        )});
                      }

                      const r2Start = row2ScrollIndex[char.name] || 0;
                      const r2Count = isDesktop ? 4 : 3;
                      const visibleR2 = row2Cards.slice(r2Start, r2Start + r2Count);
                      // 빈 슬롯 채우기
                      while (visibleR2.length < r2Count) visibleR2.push({ id: `empty-${visibleR2.length}`, render: () => <div className={`${styles.raidCard} ${styles.raidEmpty}`}><div className={styles.emptySlot}>-</div></div> });
                      const canR2Left = r2Start > 0;
                      const canR2Right = r2Start + r2Count < row2Cards.length;

                      return (
                        <div className={styles.raidRowWrapper}>
                          {canR2Left && <button className={`${styles.raidNavBtn} ${styles.raidNavLeft}`} onClick={() => setRow2ScrollIndex(prev => ({ ...prev, [char.name]: Math.max(0, (prev[char.name] || 0) - 1) }))}>‹</button>}
                          <div className={styles.itemRow}>
                            {visibleR2.map(card => <div key={card.id} style={{flex:1}}>{card.render()}</div>)}
                          </div>
                          {canR2Right && <button className={`${styles.raidNavBtn} ${styles.raidNavRight}`} onClick={() => setRow2ScrollIndex(prev => ({ ...prev, [char.name]: (prev[char.name] || 0) + 1 }))}>›</button>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {/* 카드 푸터: 균열 + 가토 */}
                {char.itemLevel >= 1680 && (
                  <div className={styles.cardFooter}>
                    {renderDailySide(getChaosDungeonLabel(char.itemLevel), 'chaosDungeon', styles.footerDaily)}
                    {renderDailySide(getGuardianRaidLabel(char.itemLevel), 'guardianRaid', styles.footerDaily)}
                  </div>
                )}
              </div>

              {/* 오른쪽 수급량 + 골드 상자 (데스크톱) */}
              {isDesktop && char.itemLevel >= 1680 && (
                <div className={styles.dailySideBox}>
                  {/* 수급량 */}
                  {(() => {
                    // 카던/가토 수급량
                    const hasDailyMats = hasChaos || hasGuardian;

                    // 레이드별 재료 계산
                    const raidMats: { raidName: string; groupName: string; gold: number; materials: { itemId: number; name: string; image: string; amount: number }[] }[] = [];
                    Object.entries(charState.raids).forEach(([raidName, gates]) => {
                      if (!gates.some(v => v)) return;
                      const amountMap: Record<number, number> = {};
                      const buyMore = charState.raidMoreGoldExclude?.[raidName] === true;
                      const receiveGold = charState.raidGoldReceive?.[raidName] !== false;
                      let raidGoldAmount = 0;

                      gates.forEach((checked, i) => {
                        if (!checked) return;
                        const gateNum = i + 1;
                        const raid = raidMap.get(raidName);
                        if (raid?.gates[i]) {
                          if (receiveGold) {
                            raidGoldAmount += raid.gates[i].gold;
                          }
                          if (buyMore) {
                            raidGoldAmount -= raid.gates[i].moreGold;
                          }
                        }
                        const clearReward = raidClearRewards.find(r => r.raidName === raidName && r.gate === gateNum);
                        if (clearReward) {
                          for (const mat of clearReward.materials) {
                            if (mat.itemId === 0 || mat.amount === 0) continue;
                            amountMap[mat.itemId] = (amountMap[mat.itemId] || 0) + mat.amount;
                          }
                        }
                        if (buyMore) {
                          const moreReward = raidRewards.find(r => r.raidName === raidName && r.gate === gateNum);
                          if (moreReward) {
                            for (const mat of moreReward.materials) {
                              if (mat.itemId === 0 || mat.amount === 0) continue;
                              amountMap[mat.itemId] = (amountMap[mat.itemId] || 0) + mat.amount;
                            }
                          }
                        }
                      });

                      const mats = Object.entries(amountMap)
                        .filter(([, amt]) => amt > 0)
                        .map(([id, amt]) => {
                          const numId = Number(id);
                          const info = itemIdInfoRef[numId];
                          return {
                            itemId: numId,
                            name: info?.name || `재료#${id}`,
                            image: info?.image || '/default-material.webp',
                            amount: amt,
                          };
                        });

                      if (mats.length > 0 || raidGoldAmount > 0) {
                        raidMats.push({
                          raidName,
                          groupName: getRaidGroupName(raidName),
                          gold: raidGoldAmount,
                          materials: mats,
                        });
                      }
                    });

                    const hasCommonChecked = charIdx === 0 && Object.values(commonContent.checks).some(v => v);
                    const hasSandReward = charState.sandOfTime;
                    const hasAny = hasDailyMats || raidMats.length > 0 || hasCommonChecked || hasSandReward;

                    return (
                      <div className={styles.sideMaterialSection}>
                        <div className={styles.sideMaterialTitle}>주간 수급량</div>
                        {!hasAny && <div className={styles.sideMaterialEmpty}>레이드를 체크하면 수급량이 표시됩니다</div>}
                        {hasChaos && (
                          <div className={styles.sideMaterialRow}>
                            <span className={styles.sideMaterialLabel}>{char.itemLevel >= 1730 ? '균열' : '전선'}</span>
                            <div className={styles.sideMaterialItems}>
                              {chaosReward.materials.map((mat, mi) => (
                                <div key={mi} className={styles.sideMaterialItem}>
                                  <StaticIcon src={mat.image} alt={mat.alt} width={20} height={20} className={styles.matIcon2} />
                                  <span className={styles.sideMatOp}>×</span>
                                  <span className={styles.sideMatAmount}>
                                    {(() => { const v = mat.daily * chaosChecks; return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 }); })()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {hasGuardian && (
                          <div className={styles.sideMaterialRow}>
                            <span className={styles.sideMaterialLabel}>가토</span>
                            <div className={styles.sideMaterialItems}>
                              {guardianReward.materials.map((mat, mi) => (
                                <div key={mi} className={styles.sideMaterialItem}>
                                  <StaticIcon src={mat.image} alt={mat.alt} width={20} height={20} className={styles.matIcon2} />
                                  <span className={styles.sideMatOp}>×</span>
                                  <span className={styles.sideMatAmount}>
                                    {(() => { const v = mat.daily * guardianChecks; return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 }); })()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {charState.sandOfTime && (() => {
                          const stLv = charState.sandOfTimeLevel || 0;
                          const rewards = getSandOfTimeRewards(char.itemLevel);
                          const stReward = rewards[stLv];
                          if (!stReward || (stReward.gems === 0 && stReward.stones === 0)) return null;
                          const gem1Equiv = char.itemLevel >= 1750 ? stReward.gems * 9 : stReward.gems * 6; // 3레벨×9, 2레벨×6
                          return (
                            <div className={styles.sideMaterialRow}>
                              <span className={styles.sideMaterialLabel}>모래</span>
                              <div className={styles.sideMaterialItems}>
                                <div className={styles.sideMaterialItem}>
                                  <StaticIcon src="/1fpqrjqghk.webp" alt="보석" width={20} height={20} className={styles.matIcon2} />
                                  <span className={styles.sideMatOp}>×</span>
                                  <span className={styles.sideMatAmount}>{gem1Equiv}</span>
                                </div>
                                <div className={styles.sideMaterialItem}>
                                  <StaticIcon src="/top-destiny-breakthrough-stone5.webp" alt="위돌" width={20} height={20} className={styles.matIcon2} />
                                  <span className={styles.sideMatOp}>×</span>
                                  <span className={styles.sideMatAmount}>{stReward.stones}</span>
                                </div>
                                <div className={styles.sideMaterialItem}>
                                  <StaticIcon src="/breath-lava5.webp" alt="용숨" width={20} height={20} className={styles.matIcon2} />
                                  <span className={styles.sideMatOp}>×</span>
                                  <span className={styles.sideMatAmount}>{stReward.lavaBreath}</span>
                                </div>
                                <div className={styles.sideMaterialItem}>
                                  <StaticIcon src="/breath-glacier5.webp" alt="빙숨" width={20} height={20} className={styles.matIcon2} />
                                  <span className={styles.sideMatOp}>×</span>
                                  <span className={styles.sideMatAmount}>{stReward.glacierBreath}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        {raidMats.map(({ raidName: rn, groupName: gn, gold: rGold, materials: mats }) => (
                          <div key={rn} className={styles.sideMaterialRow}>
                            <span className={styles.sideMaterialLabel}>{raidGroupShortNames[gn] || gn}</span>
                            <div className={styles.sideMaterialItems}>
                              {mats.map((mat) => (
                                <div key={mat.itemId} className={styles.sideMaterialItem}>
                                  <StaticIcon src={mat.image} alt={mat.name} width={20} height={20} className={styles.matIcon2} />
                                  <span className={styles.sideMatOp}>×</span>
                                  <span className={styles.sideMatAmount}>{mat.amount.toLocaleString()}</span>
                                </div>
                              ))}
                              {rGold !== 0 && (
                                <div className={styles.sideMaterialItem}>
                                  <StaticIcon src="/gold.webp" alt="골드" width={16} height={16} className={styles.matIcon2} />
                                  <span className={rGold > 0 ? styles.sideMatGold : styles.sideMatGoldNeg}>{rGold.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* 공통 컨텐츠 재화 (원정대 최고 캐릭터만) */}
                        {charIdx === 0 && COMMON_CONTENTS.map(content => {
                          const checkedCount = Object.entries(commonContent.checks)
                            .filter(([k, v]) => k.endsWith(`-${content.name}`) && v === true).length;
                          if (checkedCount === 0) return null;
                          const levelRewards = COMMON_CONTENT_MATERIALS_BY_LEVEL[content.name];
                          const rewards = levelRewards?.[chaosGateLevelTier];
                          if (!rewards || rewards.length === 0) return null;
                          const goldReward = rewards.find(r => r.image === '/gold.webp');
                          const nonGoldRewards = rewards.filter(r => r.image !== '/gold.webp');
                          return (
                            <div key={content.name} className={styles.sideMaterialRow}>
                              <span className={styles.sideMaterialLabel}>{content.shortName}</span>
                              <div className={styles.sideMaterialItems}>
                                {nonGoldRewards.map((r, ri) => (
                                  <div key={ri} className={styles.sideMaterialItem}>
                                    {r.image ? (
                                      <StaticIcon src={r.image} alt={r.label} width={20} height={20} className={styles.matIcon2} />
                                    ) : (
                                      <span className={styles.sideMatTextIcon}>{r.label}</span>
                                    )}
                                    <span className={styles.sideMatOp}>×</span>
                                    <span className={styles.sideMatAmount}>
                                      {(() => { const v = r.amount * checkedCount; return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 }); })()}
                                    </span>
                                  </div>
                                ))}
                                {goldReward && (
                                  <div className={styles.sideMaterialItem}>
                                    <StaticIcon src="/gold.webp" alt="골드" width={16} height={16} className={styles.matIcon2} />
                                    <span className={styles.sideMatGold}>{(goldReward.amount * checkedCount).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* 추가골드 + 총획득 */}
                  <div className={styles.sideGoldSection}>
                    <div className={styles.sideGoldRow}>
                      <span className={styles.sideGoldLabel}>추가획득</span>
                      <span className={styles.sideGoldValue}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={(charState.additionalGold ?? 0).toLocaleString()}
                          onChange={(e) => {
                            const num = parseInt(e.target.value.replace(/,/g, '')) || 0;
                            updateAdditionalGold(char.name, num);
                          }}
                          className={styles.sideGoldInput}
                          onClick={(e) => { e.stopPropagation(); (e.target as HTMLInputElement).select(); }}
                        />G
                      </span>
                    </div>
                    <div className={styles.sideGoldRow}>
                      <span className={styles.sideGoldLabel}>총 획득</span>
                      <span className={styles.sideGoldTotal}>{charGold.toLocaleString()}G</span>
                    </div>
                  </div>
                </div>
              )}
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
            currentWeekGold={totalGold}
            currentWeekLabel={getWeekLabel(new Date())}
          />
        )}

        {/* 안내 문구 */}
        {characters.length > 0 && !isDemo && (
          <div className={styles.notice}>
            <p>매주 수요일 06:00 이후 첫 접속 시 이전 주 골드가 자동 저장됩니다.</p>
            <p>레이드 체크 후 상단의 '저장하기' 버튼을 눌러야 변경사항이 반영됩니다.</p>
            <p>카오스게이트, 필드보스, 복주머니 등은 재료의 가치는 제외하고 획득하는 골드만 설정했습니다.</p>
            <p>아바타 변경이 안될 시 인게임에서 아바타 해제 → 영지 이동 → 아바타 재장착 → 영지 밖 이동 후 다시 시도해주세요.</p>
          </div>
        )}

        {/* 캐릭터 등록 모달 (2단계) */}
        {!isDemo && <Modal show={showRegisterModal} onHide={closeRegisterModal} centered size={registerStep === 2 ? 'lg' : undefined}>
          <Modal.Header closeButton>
            <Modal.Title>
              {registerStep === 1
                ? `캐릭터 검색${activeExpedition > 1 ? ` (원정대 ${activeExpedition})` : ''}`
                : `원정대${activeExpedition > 1 ? ` ${activeExpedition}` : ''} 선택 (${selectedCharNames.size}/6)`}
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
              <>
                {/* 선택된 캐릭터 (드래그로 순서 변경) */}
                {selectedCharOrder.filter(n => selectedCharNames.has(n)).length > 0 && (
                  <div className={styles.selectedList}>
                    <div className={styles.selectedListTitle}>선택된 캐릭터</div>
                    {selectedCharOrder.filter(n => selectedCharNames.has(n)).map((name, idx) => {
                      const char = allSiblings.find(c => c.name === name);
                      if (!char) return null;
                      const isRep = selectedRepChar === name;
                      return (
                        <div
                          key={`${idx}-${name}`}
                          className={`${styles.selectedItem} ${isRep ? styles.selectedRep : ''}`}
                        >
                          <button className={styles.orderArrowBtn} onClick={() => moveCharOrder(name, -1)} disabled={idx === 0}>▲</button>
                          <button className={styles.orderArrowBtn} onClick={() => moveCharOrder(name, 1)} disabled={idx === selectedCharOrder.filter(n => selectedCharNames.has(n)).length - 1}>▼</button>
                          <span className={styles.selectedNum}>{idx + 1}</span>
                          <div className={styles.selectInfo}>
                            <span className={styles.selectName}>{char.name}</span>
                            <span className={styles.selectDetails}>{char.class} · Lv.{char.itemLevel.toFixed(0)}</span>
                          </div>
                          <button
                            className={`${styles.orderRepBtn} ${isRep ? styles.orderRepActive : ''}`}
                            onClick={() => setSelectedRepChar(isRep ? '' : name)}
                          >대표</button>
                          <button className={styles.removeCharBtn} onClick={() => toggleCharacterSelection(name)}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* 추가 가능한 캐릭터 */}
                <div className={styles.characterSelectGrid}>
                  {allSiblings.filter(c => !selectedCharNames.has(c.name)).map((char) => {
                    const tooLow = char.itemLevel < 1640;
                    const canSelect = !tooLow && selectedCharNames.size < 6;
                    return (
                      <div
                        key={char.name}
                        className={`${styles.characterSelectItem} ${!canSelect ? styles.disabled : ''}`}
                        onClick={() => canSelect && toggleCharacterSelection(char.name)}
                      >
                        <div className={styles.selectCheckbox}>+</div>
                        <div className={styles.selectInfo}>
                          <span className={styles.selectName}>{char.name}</span>
                          <span className={styles.selectDetails}>{char.class} · Lv.{char.itemLevel.toFixed(0)}{tooLow && ' (1640 미만)'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
        </Modal>}

        {/* 원정대 편집 모달 */}
        {!isDemo && <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>원정대{activeExpedition > 1 ? ` ${activeExpedition}` : ''} 편집 ({selectedCharNames.size}/6)</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {allSiblings.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted mb-0">
                  원정대 정보가 없습니다. 캐릭터를 다시 등록해주세요.
                </p>
              </div>
            ) : (
              <>
                {selectedCharOrder.filter(n => selectedCharNames.has(n)).length > 0 && (
                  <div className={styles.selectedList}>
                    <div className={styles.selectedListTitle}>선택된 캐릭터</div>
                    {selectedCharOrder.filter(n => selectedCharNames.has(n)).map((name, idx) => {
                      const char = allSiblings.find(c => c.name === name);
                      if (!char) return null;
                      const isRep = selectedRepChar === name;
                      return (
                        <div
                          key={`${idx}-${name}`}
                          className={`${styles.selectedItem} ${isRep ? styles.selectedRep : ''}`}
                        >
                          <button className={styles.orderArrowBtn} onClick={() => moveCharOrder(name, -1)} disabled={idx === 0}>▲</button>
                          <button className={styles.orderArrowBtn} onClick={() => moveCharOrder(name, 1)} disabled={idx === selectedCharOrder.filter(n => selectedCharNames.has(n)).length - 1}>▼</button>
                          <span className={styles.selectedNum}>{idx + 1}</span>
                          <div className={styles.selectInfo}>
                            <span className={styles.selectName}>{char.name}</span>
                            <span className={styles.selectDetails}>{char.class} · Lv.{char.itemLevel.toFixed(0)}</span>
                          </div>
                          <button
                            className={`${styles.orderRepBtn} ${isRep ? styles.orderRepActive : ''}`}
                            onClick={() => setSelectedRepChar(isRep ? '' : name)}
                          >대표</button>
                          <button className={styles.removeCharBtn} onClick={() => toggleCharacterSelection(name)}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className={styles.characterSelectGrid}>
                  {allSiblings.filter(c => !selectedCharNames.has(c.name)).map((char) => {
                    const tooLow = char.itemLevel < 1640;
                    const canSelect = !tooLow && selectedCharNames.size < 6;
                    return (
                      <div
                        key={char.name}
                        className={`${styles.characterSelectItem} ${!canSelect ? styles.disabled : ''}`}
                        onClick={() => canSelect && toggleCharacterSelection(char.name)}
                      >
                        <div className={styles.selectCheckbox}>+</div>
                        <div className={styles.selectInfo}>
                          <span className={styles.selectName}>{char.name}</span>
                          <span className={styles.selectDetails}>{char.class} · Lv.{char.itemLevel.toFixed(0)}{tooLow && ' (1640 미만)'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleDeleteExpedition}
              disabled={isRegistering}
            >
              원정대 삭제
            </Button>
            <div className="d-flex gap-2">
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
            </div>
          </Modal.Footer>
        </Modal>}

        {/* 닉네임 미설정 시 모달 */}
        {!isDemo && userProfile && !userProfile.nickname && <NicknameModal />}

      </Container>
    </div>
  );
}
