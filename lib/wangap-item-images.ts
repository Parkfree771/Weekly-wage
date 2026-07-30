// 등급별 완갑 아이콘 경로만 담은 경량 모듈.
// 캐릭터 조회(CharacterDashboard)처럼 이미지 경로 4개만 필요한 클라이언트 컴포넌트가
// wangapData(25단계 재료 비용 테이블 등 ~25KB)를 통째로 번들에 끌고 오지 않도록 분리했다.
// grade-color.ts 를 characterData 에서 뺀 것과 같은 이유.

export type WangapGrade = '영웅' | '전설' | '유물' | '고대';

// 2026-07-29 신규 이미지 — 원본 png 제공분을 512px webp로 압축
export const WANGAP_ITEM_IMAGES: Record<WangapGrade, string> = {
  영웅: '/wangap-hero6.webp',
  전설: '/wangap-legendary6.webp',
  유물: '/wangap-relic6.webp',
  고대: '/wangap-ancient6.webp',
};
