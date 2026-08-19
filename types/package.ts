// 패키지 효율 게시판 타입 정의

import { Timestamp } from 'firebase/firestore';

// ─── 패키지 아이템 ───

/** 패키지에 포함된 아이템 하나 */
export type PackageItem = {
  itemId: string;        // TRACKED_ITEMS의 id 또는 특수 식별자
  name: string;          // 아이템 이름
  shortName?: string;    // 기타(직접 입력) 항목의 갤러리 표시용 축약 이름. 62px 셀에 들어가야 해서 따로 받는다. 상세는 항상 name 을 쓴다
  quantity: number;      // 수량
  icon?: string;         // 아이콘 경로
  goldOverride?: number; // 골드/고정가 아이템용 (시세 대신 이 값 사용)
  crystalPerUnit?: number; // 블크 기반 아이템용 (환율 변경 시 재계산에 사용)
  choiceOptions?: { itemId: string; name: string; icon?: string; quantity?: number }[]; // 선택지 목록 (선택 아이템용). quantity: 선택지별 개수(다르면 개별 지정, 없으면 상위 quantity 사용)
  probability?: number; // 가챠 아이템 확률 (0~100, 예: 10.0 = 10%)
  bundleItems?: { itemId: string; name: string; icon: string; quantity: number }[]; // 묶음 주머니 내부 아이템들
  // 선택 상자 (사용자가 직접 담은 아이템 중 N개를 택하는 상자)
  choiceBoxCandidates?: { id: string; name: string; icon?: string; itemId?: string; goldPerUnit?: number; quantity: number }[]; // goldPerUnit: itemId 없는 커스텀 후보용
  choiceBoxPickCount?: number; // 택N
  choiceBoxSelectedIds?: string[]; // 실제 가치 계산에 포함되는 후보 id들 (길이 = pickCount)
  // 확률 상자 (등록자가 담은 아이템·확률로 기댓값 = Σ(시세 × 수량 × 확률/100) 을 계산하는 상자)
  probBoxCandidates?: { id: string; name: string; icon?: string; itemId?: string; goldPerUnit?: number; quantity: number; probability: number }[];
};

// ─── 게시물 ───

/** 패키지 타입 */
export type PackageType = '3+1' | '2+1' | '3+보너스' | '일반' | '가챠';

/** 가격 통화 타입 */
export type PriceCurrency = 'cash' | 'blueCrystal';

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
  royalCrystalPrice: number; // 원 환산 가격 (기존 호환)
  priceCurrency?: PriceCurrency; // 가격 통화 ('cash' | 'blueCrystal')
  blueCrystalPrice?: number; // 블루크리스탈 가격 (블크 결제 시)
  items: PackageItem[];
  selectableCount?: number; // 0 또는 미설정 = 전체, N = N개 선택
  isNewRelease?: boolean; // 신규 출시 패키지 — 갤러리 카드 NEW 배지 (등록일로부터 30일 지나면 자동 소멸)
  bonusItems?: PackageItem[]; // '3+보너스' 전용: 3개 구매 시 1회만 지급되는 특별 보상
  bonusSelectableCount?: number; // '3+보너스' 전용: 보너스 구성품 중 N개 선택 (0 또는 미설정 = 전체 지급)

  // 환율 (등록 시 입력값)
  goldPerWon?: number;

  // 판매 기간 (선택 — 상시 판매 패키지는 비워둔다)
  saleStartAt?: Timestamp | Date | string | null; // 판매 시작 일시
  saleEndAt?: Timestamp | Date | string | null;   // 판매 종료 일시 — 이 시각이 지나면 자동으로 판매 종료 표시
  saleClosed?: boolean;                    // 작성자/관리자가 직접 처리한 판매 종료 (기간과 무관)

  // 통계
  viewCount: number;
  likeCount: number;
  commentCount: number;

  // 시간
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
};

/** 게시물 생성 시 전달 데이터 */
export type PackagePostCreateData = Omit<PackagePost, 'id' | 'viewCount' | 'likeCount' | 'commentCount' | 'createdAt' | 'updatedAt'>;

/** 좋아요 문서 */
export type PackageLike = {
  uid: string;
  createdAt: Timestamp | any;
};

/** 댓글 문서 */
export type PackageComment = {
  id: string;
  postId: string;
  authorUid: string;
  authorNickname: string;
  authorPhotoURL: string | null;
  content: string;
  parentId: string | null; // null = 일반 댓글, 있으면 해당 댓글에 대한 답글
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
};

// ─── 갤러리 조회 옵션 ───

export type PackageSortBy = 'createdAt' | 'likeCount';

export type PackageListOptions = {
  sortBy: PackageSortBy;
  limit: number;
  startAfterDoc?: any;
};
