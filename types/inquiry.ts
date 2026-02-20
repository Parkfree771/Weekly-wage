import { Timestamp } from 'firebase/firestore';

/** 문의 게시물 */
export type InquiryPost = {
  id: string;
  authorUid: string;
  authorNickname: string;
  authorEmail: string;
  title: string;
  content: string;
  isPrivate: boolean;
  commentCount: number;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
};

/** 게시물 생성 시 전달 데이터 */
export type InquiryPostCreateData = Omit<
  InquiryPost,
  'id' | 'commentCount' | 'createdAt' | 'updatedAt'
>;

/** 문의 댓글 */
export type InquiryComment = {
  id: string;
  postId: string;
  authorUid: string;
  authorNickname: string;
  authorEmail: string;
  content: string;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
};

/** 목록 조회 결과 */
export type InquiryListResult = {
  posts: InquiryPost[];
  totalCount: number;
};
