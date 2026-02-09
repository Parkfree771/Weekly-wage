// 패키지 효율 게시판 타입 정의

import { Timestamp } from 'firebase/firestore';

// ─── 패키지 아이템 ───

/** 패키지에 포함된 아이템 하나 */
export type PackageItem = {
  itemId: string;        // TRACKED_ITEMS의 id 또는 특수 식별자
  name: string;          // 아이템 이름
  quantity: number;      // 수량
  icon?: string;         // 아이콘 경로
  goldOverride?: number; // 골드/고정가 아이템용 (시세 대신 이 값 사용)
};

// ─── 게시물 ───

/** 패키지 타입 */
export type PackageType = '3+1' | '2+1' | '일반';

/** 패키지 효율 게시물 */
export type PackagePost = {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhotoURL: string | null;

  // 패키지 정보
  title: string;
  description: string;
  packageType: PackageType;
  royalCrystalPrice: number;
  items: PackageItem[];

  // 통계
  viewCount: number;
  likeCount: number;

  // 시간
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
};

/** 게시물 생성 시 전달 데이터 */
export type PackagePostCreateData = Omit<PackagePost, 'id' | 'viewCount' | 'likeCount' | 'createdAt' | 'updatedAt'>;

/** 좋아요 문서 */
export type PackageLike = {
  uid: string;
  createdAt: Timestamp | any;
};

// ─── 갤러리 조회 옵션 ───

export type PackageSortBy = 'createdAt' | 'likeCount';

export type PackageListOptions = {
  sortBy: PackageSortBy;
  limit: number;
  startAfterDoc?: any;
};
