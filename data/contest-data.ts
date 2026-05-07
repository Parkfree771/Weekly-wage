// 아바타 디자인 콘테스트 - 후보/매치업 메타데이터 (하드코딩)

import type { ContestIllustration, ContestMatchup } from '@/types/contest';

/** 공식 이벤트 페이지 (로스트아크) */
export const OFFICIAL_EVENT_URL =
  'https://lostark.game.onstove.com/News/Notice/Views/13428';

/** 12개 후보 일러스트 — 매치업 확정 */
export const CONTEST_ILLUSTRATIONS: ContestIllustration[] = [
  // ── A 구간 ──
  {
    slug: 'matcha1',
    name: '주작 호선',
    concept: '여우 가면과 화염, 주작이 깃든 동방 의장',
    imageSrc: '/contest/matcha1.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'male',
    section: 'A',
  },
  {
    slug: 'matcha2',
    name: '심홍의 야행자',
    concept: '진홍 후드와 검은 와이드 팬츠의 도시형 라이더',
    imageSrc: '/contest/matcha2.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'male',
    section: 'A',
  },
  {
    slug: 'matcha3',
    name: '은빛 성광의 검사',
    concept: '백금 갑옷과 성검, 화이트 드레스의 신성한 전사',
    imageSrc: '/contest/matcha3.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'female',
    section: 'A',
  },
  {
    slug: 'matcha4',
    name: '흑요 드래곤 라이더',
    concept: '드래곤 가면과 화이트 후드, 새끼 드래곤 동반의 다크 판타지',
    imageSrc: '/contest/matcha4.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'female',
    section: 'A',
  },

  // ── B 구간 ──
  {
    slug: 'matchb1',
    name: '문라이트 캣슈트',
    concept: '고양이 모자와 페일 점프수트, 동물 패치의 도시 스트리트',
    imageSrc: '/contest/matchb1.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'male',
    section: 'B',
  },
  {
    slug: 'matchb2',
    name: '달토끼 라이더',
    concept: '버니 후드와 청바지의 스트리트 라이더',
    imageSrc: '/contest/matchb2.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'male',
    section: 'B',
  },
  {
    slug: 'matchb3',
    name: '벚꽃의 학생',
    concept: '핑크빛 봄날의 마법학원 룩, 체크 미니 + 니삭스',
    imageSrc: '/contest/matchb3.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'female',
    section: 'B',
  },
  {
    slug: 'matchb4',
    name: '푸른 토끼 메이드',
    concept: '청량한 블루 트랙 메이드, 스트리트 ⨯ 메이드의 의외성',
    imageSrc: '/contest/matchb4.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'female',
    section: 'B',
  },

  // ── C 구간 ──
  {
    slug: 'matchc1',
    name: '스펙트럴 킹',
    concept: '검은 흑갑주와 푸른 영혼의 화염, 망령의 왕',
    imageSrc: '/contest/matchc1.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'male',
    section: 'C',
  },
  {
    slug: 'matchc2',
    name: '기억의 사진사',
    concept: '카메라 두상의 미스터리 정장, 프레임 너머의 신사',
    imageSrc: '/contest/matchc2.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'male',
    section: 'C',
  },
  {
    slug: 'matchc3',
    name: '흑룡의 학자',
    concept: '단정한 셔츠와 흑룡 자수 롱스커트, 절제된 위엄',
    imageSrc: '/contest/matchc3.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'female',
    section: 'C',
  },
  {
    slug: 'matchc4',
    name: '보랏빛 군주',
    concept: '제독 캡과 망토, 야경에 어울리는 권위 스타일',
    imageSrc: '/contest/matchc4.webp',
    imageWidth: 1632,
    imageHeight: 928,
    gender: 'female',
    section: 'C',
  },
];

/** 6개 매치업 (1 vs 1) — 확정 */
export const CONTEST_MATCHUPS: ContestMatchup[] = [
  {
    slug: 'A1',
    label: 'A 구간 1번 매치업',
    section: 'A',
    leftSlug: 'matcha1',
    rightSlug: 'matcha2',
    tagline: '',
  },
  {
    slug: 'A2',
    label: 'A 구간 2번 매치업',
    section: 'A',
    leftSlug: 'matcha3',
    rightSlug: 'matcha4',
    tagline: '',
  },
  {
    slug: 'B1',
    label: 'B 구간 1번 매치업',
    section: 'B',
    leftSlug: 'matchb1',
    rightSlug: 'matchb2',
    tagline: '',
  },
  {
    slug: 'B2',
    label: 'B 구간 2번 매치업',
    section: 'B',
    leftSlug: 'matchb3',
    rightSlug: 'matchb4',
    tagline: '',
  },
  {
    slug: 'C1',
    label: 'C 구간 1번 매치업',
    section: 'C',
    leftSlug: 'matchc1',
    rightSlug: 'matchc2',
    tagline: '',
  },
  {
    slug: 'C2',
    label: 'C 구간 2번 매치업',
    section: 'C',
    leftSlug: 'matchc3',
    rightSlug: 'matchc4',
    tagline: '',
  },
];

export const SECTION_TITLES: Record<'A' | 'B' | 'C', string> = {
  A: 'SECTION A',
  B: 'SECTION B',
  C: 'SECTION C',
};

/** slug → Illustration 빠른 조회용 맵 */
export const ILLUSTRATION_BY_SLUG: Record<string, ContestIllustration> =
  CONTEST_ILLUSTRATIONS.reduce(
    (acc, item) => {
      acc[item.slug] = item;
      return acc;
    },
    {} as Record<string, ContestIllustration>,
  );
