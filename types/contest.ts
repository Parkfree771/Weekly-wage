// 아바타 디자인 콘테스트 타입 정의

import type { Timestamp } from 'firebase/firestore';

export type ContestSection = 'A' | 'B' | 'C';
export type ContestGender = 'female' | 'male';

/** 후보 일러스트 (하드코딩 메타) */
export type ContestIllustration = {
  /** Firestore doc id (예: 'a1', 'a2', ...) */
  slug: string;
  /** 화면 표시 이름 (예: '푸른 토끼 메이드') */
  name: string;
  /** 컨셉 한 줄 설명 */
  concept: string;
  /** 이미지 경로 (public 기준, 비어 있으면 placeholder) */
  imageSrc: string;
  /** 이미지 가로/세로 비율 (Next/Image 최적화용) */
  imageWidth: number;
  imageHeight: number;
  /** 성별 */
  gender: ContestGender;
  /** 소속 구간 */
  section: ContestSection;
  /** 빈 슬롯 표시 (이미지 미공개) */
  comingSoon?: boolean;
};

/** 매치업 (1 vs 1) */
export type ContestMatchup = {
  /** Firestore doc id (예: 'A1', 'A2', ...) */
  slug: string;
  /** 표시용 라벨 (예: 'A 매치업 1') */
  label: string;
  section: ContestSection;
  /** 좌/우 일러스트 slug */
  leftSlug: string;
  rightSlug: string;
  /** 매치업 부제 */
  tagline: string;
};

/** 사용자가 올린 무기 아바타 */
export type ContestWeapon = {
  id: string;
  illustrationSlug: string;
  uid: string;
  authorName: string;
  /** 사용자 입력 제목 */
  title: string;
  imageUrl: string;
  storagePath: string;
  /** 원본 비율 보존을 위한 자연 사이즈 */
  width: number;
  height: number;
  likeCount: number;
  commentCount: number;
  createdAt: Timestamp;
};

/** 무기 아바타 댓글 (대댓글 1단계 지원) */
export type ContestWeaponComment = {
  id: string;
  weaponId: string;
  illustrationSlug: string;
  uid: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  parentId: string | null;
};

export type ContestWeaponCommentCreateData = Omit<
  ContestWeaponComment,
  'id' | 'createdAt' | 'updatedAt'
>;
