export interface Guide {
  slug: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  href: string;
}

export const guides: Guide[] = [
  {
    slug: 'weekly-gold',
    title: '로스트아크 주간 골드 수익 완벽 가이드',
    summary: '캐릭터별 주간 골드 획득 제한, 레이드별 보상, 골드 수익 극대화 전략까지 한눈에 정리했습니다.',
    category: '골드',
    date: '2026-02-06',
    href: '/guide/weekly-gold',
  },
  {
    slug: 'raid-rewards',
    title: '로스트아크 레이드 보상 총정리 (2026)',
    summary: '세르카, 종막, 4막부터 서막까지 모든 레이드의 관문별 클리어 골드와 더보기 보상을 한눈에 비교합니다.',
    category: '레이드',
    date: '2026-02-06',
    href: '/guide/raid-rewards',
  },
  {
    slug: 'refining',
    title: 'T4 재련 비용 완벽 가이드 - 일반 vs 상급 비교',
    summary: 'T4 재련 시스템, 장인의 기운, 일반 재련과 상급 재련의 차이, 재련 비용 절약 팁을 상세히 설명합니다.',
    category: '재련',
    date: '2026-02-06',
    href: '/guide/refining',
  },
  {
    slug: 'life-content',
    title: '생활 콘텐츠 수익 가이드 - 융화재료 제작과 효율 분석',
    summary: '벌목, 채광, 고고학 등 생활 콘텐츠의 수익 구조와 아비도스 융화재료 제작 손익을 분석합니다.',
    category: '생활',
    date: '2026-02-06',
    href: '/guide/life-content',
  },
  {
    slug: 'beginner-gold',
    title: '초보자를 위한 골드 수급 가이드',
    summary: '로스트아크를 시작한 초보자가 알아야 할 골드 획득 방법, 우선순위, 효율적인 캐릭터 육성법을 소개합니다.',
    category: '초보자',
    date: '2026-02-06',
    href: '/guide/beginner-gold',
  },
  {
    slug: 'market-price',
    title: '거래소 시세 활용 가이드 - 시세 차트 보는 법',
    summary: '로스트아크 거래소 시세 변동 패턴, 매매 타이밍, 로골로골 시세 차트 활용법을 알려드립니다.',
    category: '거래소',
    date: '2026-02-06',
    href: '/guide/market-price',
  },
];
