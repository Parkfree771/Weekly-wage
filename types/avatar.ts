// 아바타 갤러리 타입 정의

import type React from 'react';
import { Timestamp } from 'firebase/firestore';

// ─── 염색 관련 ───

/** 패턴 HSV 값 */
export type PatternHSV = {
  h: number; // Hue 색조 (0.0 ~ 1.0)
  s: number; // Saturation 채도 (0.0 ~ 1.0)
  v: number; // Value 명도 (0.0 ~ 1.0)
};

/** 염색 부위 하나 (부위1, 부위2, 부위3...) */
export type DyePart = {
  title: string;            // "부위1", "부위2", "부위3"
  baseColor: string;        // 기본 색상 HEX (예: "#FF5500")
  glossValue: string;       // 광택 퍼센트 (예: "50%")
  patternColor: string;     // 패턴 색상 HEX (예: "#FFFFFF")
  patternHSV: PatternHSV;
  patternIcon: string | null;
};

/** 아바타 아이템 하나의 전체 염색 정보 */
export type DyeInfo = {
  parts: DyePart[];
};

// ─── 아바타 아이템 ───

/** 아바타 부위 하나 (머리, 상의, 하의, 무기 등) */
export type AvatarItem = {
  type: string;         // "무기 아바타", "머리 아바타" 등
  name: string;         // "지배의 영원 대검 (귀속)"
  icon: string;         // 아이콘 CDN URL
  grade: string;        // "전설", "영웅", "희귀" 등
  isSet: boolean;       // 세트 아바타 여부
  isInner: boolean;     // 안쪽(Inner) 아바타 여부 (덧입기)
  dyeInfo: DyeInfo | null; // 염색 안 된 아바타는 null
};

// ─── 게시물 ───

/** 아바타 갤러리 게시물 */
export type AvatarPost = {
  id: string;                    // Firestore 자동 생성 ID
  authorUid: string;             // Firebase Auth UID
  authorName: string;            // 구글 표시 이름
  authorPhotoURL: string | null; // 구글 프로필 사진

  // 캐릭터 정보
  characterName: string;         // "구아바밤바아"
  characterClass: string;        // "슬레이어"
  characterLevel: number;        // 아이템 레벨
  serverName: string;            // 서버명
  characterImageUrl: string;     // 캐릭터 이미지 URL (로아 CDN)
  backgroundId?: string;          // 배경 프리셋 ID ('default', 'black', 'white', 'bg-01' 등)
  transparentImageUrl?: string;   // AI 배경제거된 투명 이미지 URL (Firebase Storage)

  // 게시물 정보
  title: string;
  description: string;

  // 아바타 데이터
  avatarItems: AvatarItem[];

  // 통계
  viewCount: number;
  likeCount: number;

  // 시간
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
};

/** 게시물 생성 시 전달 데이터 (id, 통계, 시간 제외) */
export type AvatarPostCreateData = Omit<AvatarPost, 'id' | 'viewCount' | 'likeCount' | 'createdAt' | 'updatedAt'>;

/** 좋아요 문서 */
export type AvatarLike = {
  uid: string;
  createdAt: Timestamp | any;
};

// ─── API 응답 ───

/** 아바타 API 응답 (캐릭터 검색 결과) */
export type AvatarSearchResult = {
  characterName: string;
  characterClass: string;
  characterLevel: number;
  serverName: string;
  characterImageUrl: string;
  avatarItems: AvatarItem[];
};

// ─── 갤러리 조회 옵션 ───

export type AvatarSortBy = 'createdAt' | 'likeCount';

export type AvatarListOptions = {
  sortBy: AvatarSortBy;
  filterClass?: string;
  limit: number;
  startAfterDoc?: any; // DocumentSnapshot for pagination
};

// ─── 로아 API 원본 타입 (파싱용) ───

/** 로아 API 아바타 응답 아이템 */
export type LostArkAvatarRaw = {
  Type: string;
  Name: string;
  Icon: string;
  Grade: string;
  IsSet: boolean;
  IsInner: boolean;
  Tooltip: string; // JSON 문자열
};

// ─── 클래스 분류 (필터링용) ───

export const CLASS_GROUPS: Record<string, string[]> = {
  '워리어': ['버서커', '디스트로이어', '워로드', '홀리나이트', '슬레이어'],
  '마법사': ['아르카나', '서머너', '바드', '소서리스'],
  '무도가': ['배틀마스터', '인파이터', '기공사', '창술사', '브레이커'],
  '헌터': ['데빌헌터', '블래스터', '호크아이', '스카우터', '건슬링어'],
  '암살자': ['블레이드', '데모닉', '리퍼', '소울이터'],
  '스페셜리스트': ['도화가', '기상술사', '워크래프터'],
};

/** 클래스명으로 그룹명 찾기 */
export function getClassGroup(className: string): string | null {
  for (const [group, classes] of Object.entries(CLASS_GROUPS)) {
    if (classes.includes(className)) return group;
  }
  return null;
}

/** 전체 클래스 목록 (플랫) */
export function getAllClasses(): string[] {
  return Object.values(CLASS_GROUPS).flat();
}

// ─── 배경 프리셋 ───

export type BackgroundPreset = {
  id: string;
  label: string;
  style: React.CSSProperties;
  /** 선택 UI에 표시할 미니 프리뷰 스타일 */
  previewStyle: React.CSSProperties;
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'default',
    label: '기본',
    style: { backgroundColor: '#2a2035' },
    previewStyle: { backgroundColor: '#2a2035' },
  },
  {
    id: 'black',
    label: '블랙',
    style: { backgroundColor: '#000000' },
    previewStyle: { backgroundColor: '#000000' },
  },
  {
    id: 'white',
    label: '화이트',
    style: { backgroundColor: '#ffffff' },
    previewStyle: { backgroundColor: '#ffffff', border: '1px solid #ddd' },
  },
  {
    id: '#1a1a2e',
    label: '네이비',
    style: { backgroundColor: '#1a1a2e' },
    previewStyle: { backgroundColor: '#1a1a2e' },
  },
  {
    id: '#2d1b1b',
    label: '와인',
    style: { backgroundColor: '#2d1b1b' },
    previewStyle: { backgroundColor: '#2d1b1b' },
  },
  {
    id: '#1b2d1b',
    label: '포레스트',
    style: { backgroundColor: '#1b2d1b' },
    previewStyle: { backgroundColor: '#1b2d1b' },
  },
  {
    id: '#3b1d5e',
    label: '퍼플',
    style: { backgroundColor: '#3b1d5e' },
    previewStyle: { backgroundColor: '#3b1d5e' },
  },
  {
    id: '#1c2833',
    label: '차콜',
    style: { backgroundColor: '#1c2833' },
    previewStyle: { backgroundColor: '#1c2833' },
  },
  {
    id: 'bg-01',
    label: '배경 1',
    style: {
      backgroundImage: 'url(/bg-01.webp)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
    previewStyle: {
      backgroundImage: 'url(/bg-01.webp)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
  },
];

/** backgroundId로 스타일 가져오기 (프리셋 또는 커스텀 hex) */
export function getBackgroundStyle(backgroundId?: string): React.CSSProperties {
  if (!backgroundId) return BACKGROUND_PRESETS[0].style;
  const preset = BACKGROUND_PRESETS.find((p) => p.id === backgroundId);
  if (preset) return preset.style;
  // 커스텀 hex 색상 (예: '#ff5500')
  if (backgroundId.startsWith('#')) return { backgroundColor: backgroundId };
  return BACKGROUND_PRESETS[0].style;
}

// ─── 등급 색상 매핑 ───

export const GRADE_COLORS: Record<string, string> = {
  '에스더': '#3cf2e6',
  '고대': '#dcc999',
  '유물': '#fa5d00',
  '전설': '#f9ae00',
  '영웅': '#8045dd',
  '희귀': '#2ab1f6',
  '고급': '#91fe02',
  '일반': '#d0d0d0',
};

export function getGradeColor(grade: string): string {
  return GRADE_COLORS[grade] || '#d0d0d0';
}
