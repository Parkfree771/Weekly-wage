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
    slug: 'belgardin-rewards',
    title: '벨가르딘 관문별 클리어 보상과 더보기 정리',
    summary: '노말·하드·나이트메어 난이도별 관문 클리어 골드와 재료, 더보기 비용·보상, 승급 재료 주간 수급량을 표로 정리했습니다.',
    category: '레이드',
    date: '2026-08-05',
    href: '/guide/belgardin-rewards',
  },
  {
    slug: 'wangap-upgrade-schedule',
    title: '완갑 주차별 승급 정리: 몇 주차에 전설·유물·고대가 되나',
    summary: '죽음의 손 주 60개 수급 기준으로 첫 클리어 보상 유무에 따라 완갑이 몇 주차에 승급되는지 계산했습니다.',
    category: '완갑',
    date: '2026-07-29',
    href: '/guide/wangap-upgrade-schedule',
  },
  {
    slug: 'wangap-cost',
    title: '벨가르딘 완갑 +0에서 +25까지 강화 비용 정리',
    summary: '3단계 승급 구조와 +25까지 드는 재료·골드를 평균 시뮬과 실제 시뮬 결과로 항목별로 정리했습니다.',
    category: '완갑',
    date: '2026-07-29',
    href: '/guide/wangap-cost',
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
    slug: 'beginner-gold',
    title: '초보자를 위한 골드 수급 가이드',
    summary: '로스트아크를 시작한 초보자가 알아야 할 골드 획득 방법, 우선순위, 효율적인 캐릭터 육성법을 소개합니다.',
    category: '초보자',
    date: '2026-02-06',
    updated: '2026-08-20',
    href: '/guide/beginner-gold',
  },
  {
    slug: 'market-price',
    title: '거래소 시세 활용 가이드 - 시세 차트 보는 법',
    summary: '로스트아크 거래소 시세 변동 패턴, 매매 타이밍, 로아로골 시세 차트 활용법을 알려드립니다.',
    category: '거래소',
    date: '2026-02-06',
    updated: '2026-08-20',
    href: '/guide/market-price',
  },
];

/**
 * 관련 링크로 걸 수 있는 "도구 페이지" 목록.
 *
 * 2026-08-21 에 가이드 글 6편을 각각 대응하는 도구 페이지 본문으로 통합했다.
 * (예: /guide/refining -> /refining 하단 가이드 영역). 통합 뒤에도 다른 페이지에서
 * "관련: 재련 시뮬레이터" 처럼 걸 수 있어야 해서, 가이드와 같은 모양의 항목으로 등록해 둔다.
 * GuideFaq 의 relatedGuides 는 guides 에서 먼저 찾고, 없으면 여기서 찾는다.
 */
export const relatedPages: Guide[] = [
  {
    slug: 'refining-tool',
    title: 'T4 재련 시뮬레이터',
    summary: '재련 확률·장인의 기운 구조와 예상 비용을 직접 돌려보고, 단계별 확률표와 재료 소모표를 확인할 수 있습니다.',
    category: '재련',
    date: '2026-02-06',
    href: '/refining',
  },
  {
    slug: 'weekly-gold-tool',
    title: '주간 골드 계산기',
    summary: '캐릭터별 주간 골드 획득 제한과 귀속 골드 구조, 레이드별 보상까지 한 번에 계산합니다.',
    category: '골드',
    date: '2026-02-06',
    href: '/weekly-gold',
  },
  {
    slug: 'wangap-tool',
    title: '상급 재련(완갑) 시뮬레이터',
    summary: '상급 재련의 선조의 가호·축복 누적 구조를 그대로 반영해 목표 단계까지의 예상 재료와 골드를 계산합니다.',
    category: '재련',
    date: '2026-02-06',
    href: '/wangap',
  },
  {
    slug: 'more-reward-tool',
    title: '더보기 손익 계산기',
    summary: '더보기 보상의 구조와 귀속 골드 우선 차감 원리, 시세 기반 손익을 레이드별로 비교합니다.',
    category: '골드',
    date: '2026-07-18',
    href: '/more-reward',
  },
];
