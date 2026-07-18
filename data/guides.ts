export interface Guide {
  slug: string;
  title: string;
  summary: string;
  category: string;
  /** 최초 작성일 (JSON-LD datePublished) */
  date: string;
  /** 마지막 수정일 (JSON-LD dateModified) */
  updated?: string;
  href: string;
}

export const guides: Guide[] = [
  {
    slug: 'weekly-gold',
    title: '로스트아크 주간 골드 수익 완벽 가이드',
    summary: '캐릭터별 주간 골드 획득 제한, 귀속 골드 구조, 레이드별 보상, 골드 수익 극대화 전략까지 한눈에 정리했습니다.',
    category: '골드',
    date: '2026-02-06',
    updated: '2026-07-18',
    href: '/guide/weekly-gold',
  },
  {
    slug: 'raid-rewards',
    title: '로스트아크 레이드 보상 총정리 (2026)',
    summary: '벨가르딘, 성당, 세르카, 종막부터 서막까지 모든 레이드의 관문별 클리어 골드와 더보기 보상을 한눈에 비교합니다.',
    category: '레이드',
    date: '2026-02-06',
    updated: '2026-07-18',
    href: '/guide/raid-rewards',
  },
  {
    slug: 'more-reward',
    title: '더보기 보상 손익 판단 가이드 - 언제 사야 이득일까',
    summary: '더보기 보상의 구조, 귀속 골드 우선 차감 원리, 시세 기반 손익 계산법과 레이드별 우선순위 판단 기준을 설명합니다.',
    category: '골드',
    date: '2026-07-18',
    href: '/guide/more-reward',
  },
  {
    slug: 'refining',
    title: 'T4 재련 완벽 가이드 - 확률 구조와 비용 절약 전략',
    summary: 'T4 일반 재련의 확률 구조, 장인의 기운 계산식, 재련 책과 숨결 활용법, 상급 재련과의 차이를 상세히 설명합니다.',
    category: '재련',
    date: '2026-02-06',
    updated: '2026-07-18',
    href: '/guide/refining',
  },
  {
    slug: 'life-content',
    title: '생활 콘텐츠 수익 가이드 - 융화재료 제작과 효율 분석',
    summary: '생활 콘텐츠의 수익 구조와 아비도스 융화재료 제작 손익, 생활의 가루 교환 비율까지 분석합니다.',
    category: '생활',
    date: '2026-02-06',
    updated: '2026-07-18',
    href: '/guide/life-content',
  },
  {
    slug: 'package-efficiency',
    title: '패키지 효율 계산 가이드 - 현질 전에 확인할 것들',
    summary: '패키지 이득률 계산 원리, 3+1·2+1 묶음 계산법, 가챠 기대값, 크리스탈 환율 적용까지 패키지 구매 판단 기준을 정리했습니다.',
    category: '패키지',
    date: '2026-07-18',
    href: '/guide/package-efficiency',
  },
  {
    slug: 'hell-reward',
    title: '지옥·나락 보상 가이드 - 골드 가치 환산 원리',
    summary: '지옥과 나락의 보상 차이, 단계별 보상 구조, 거래 불가 재화의 골드 가치 환산 방식을 설명합니다.',
    category: '지옥',
    date: '2026-07-18',
    href: '/guide/hell-reward',
  },
  {
    slug: 'beginner-gold',
    title: '초보자를 위한 골드 수급 가이드',
    summary: '로스트아크를 시작한 초보자가 알아야 할 골드 획득 방법, 우선순위, 효율적인 캐릭터 육성법을 소개합니다.',
    category: '초보자',
    date: '2026-02-06',
    updated: '2026-07-18',
    href: '/guide/beginner-gold',
  },
  {
    slug: 'market-price',
    title: '거래소 시세 활용 가이드 - 시세 차트 보는 법',
    summary: '로스트아크 거래소 시세 변동 패턴, 매매 타이밍, 로아로골 시세 차트 활용법을 알려드립니다.',
    category: '거래소',
    date: '2026-02-06',
    updated: '2026-07-18',
    href: '/guide/market-price',
  },
];
