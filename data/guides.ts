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
    slug: 'advanced-refining-ancestor',
    title: '상급 재련 선조의 가호 구조와 숨결·책 투입 순서',
    summary:
      '상급 재련이 성공·실패가 아니라 경험치 누적으로 돌아가는 구조를 정리하고, 숨결과 책을 넣었을 때 시도 1회의 기대 경험치가 얼마나 오르는지 계산했습니다. 보조 재료를 일반턴과 선조턴 중 어디에 넣어야 시도 횟수가 줄어드는지 조합 16가지 평균 시도 횟수로 비교했습니다.',
    category: '재련',
    date: '2026-09-21',
    href: '/guide/advanced-refining-ancestor',
  },
  {
    slug: 'weekly-content-materials',
    title: '균열·전선과 가디언 토벌 티어별 주간 재료 수급량',
    summary:
      '카오스 던전과 가디언 토벌을 매일 돌았을 때 티어별로 한 주에 들어오는 재료를 실측 표본 평균으로 정리했습니다. 수급이 가장 크게 뛰는 레벨 구간과, 골드 계단과 재료 계단의 위치가 어긋나는 지점을 계산했습니다.',
    category: '골드',
    date: '2026-09-21',
    href: '/guide/weekly-content-materials',
  },
  {
    slug: 'sandglass-rewards',
    title: '할의 모래시계 보상 강화 단계별 수급량 정리',
    summary:
      '보상 강화 1~6단계에서 티어별로 받는 보석·석·숨결 수량을 정리했습니다. 티어마다 보석 등급이 달라 개수만 비교하면 순서가 뒤집히는 지점을 1레벨 환산으로 다시 계산했습니다.',
    category: '골드',
    date: '2026-09-21',
    href: '/guide/sandglass-rewards',
  },
  {
    slug: 'extreme-rewards',
    title: '익스트림 3막·종막 난이도별 보상 총정리',
    summary:
      '9월 23일 시작하는 카제로스 레이드 3막·종막 익스트림의 난이도별 클리어 골드와 전용 주화, 최초 클리어 보상, 나이트메어 전설 칭호와 20만 골드를 표로 정리했습니다. 8주 총 수급량과 하드·나이트메어의 실제 차이까지 계산했습니다.',
    category: '레이드',
    date: '2026-09-18',
    href: '/guide/extreme-rewards',
  },
  {
    slug: 'extreme-coin-craft',
    title: '익스트림 주화 3종과 카제로스 익스트림 제작소 정리',
    summary:
      '뇌전의 주화·빛과 어둠의 주화·혼돈의 주화를 어디서 몇 개 받는지와 고대 코어 랜덤 상자·선택 상자의 제작 비용, 난이도별 8주 주화 수급량과 제작 후 남는 양, 11월 25일 만료까지 정리했습니다.',
    category: '레이드',
    date: '2026-09-18',
    href: '/guide/extreme-coin-craft',
  },
  {
    slug: 'wangap-20-25-cases',
    title: '완갑 +20에서 +25까지, 숨결·귀속 재료 상황별 강화 비용 정리',
    summary:
      '9월 15일 열리는 완갑 +21~+25 강화를 숨결 없음·풀숨·최적 숨결, 귀속 숨결, 파괴석·수호석 결정 귀속으로 나눠 평균·중앙값·장인의 기운 100% 기준 골드를 계산했습니다. 숨결을 몇 번째 시도까지 넣는 게 이득인지도 정리했습니다.',
    category: '완갑',
    date: '2026-09-14',
    href: '/guide/wangap-20-25-cases',
  },
  {
    slug: 'wangap-special-refine-shilling',
    title: '완갑 +20~+25 특재돌 배분과 실링 준비량 정리',
    summary:
      '+20에서 +25까지 성장 비용 2,715만 실링과 숨결별 강화 실링 총량, 특수 재련 한 단계에 드는 특재돌과 보유량별로 어느 단계에 쓰는 게 가장 이득인지 정리했습니다.',
    category: '완갑',
    date: '2026-09-14',
    href: '/guide/wangap-special-refine-shilling',
  },
  {
    slug: 'gacha-ticket-package',
    title: '가챠 상자와 티켓 패키지, 효율 계산이 어떻게 다른가',
    summary:
      '2026년 9월 9일에 올라온 가을 맞이 행운 상자와 낙원 스페셜 패키지를 예로, 확률 상자의 기댓값 계산과 거래 불가 티켓의 층 기댓값 역산을 비교했습니다. 층별 티켓 1장 기댓값 표와 서로 다른 환율로 등록된 패키지를 같은 잣대로 놓는 방법까지 정리했습니다.',
    category: '패키지',
    date: '2026-09-09',
    href: '/guide/gacha-ticket-package',
  },
  {
    slug: 'package-value-formula',
    title: '패키지 구성품 골드 환산 공식 정리: 이득률은 어떻게 계산되나',
    summary: '환율과 블루 크리스탈 27.5원 계수, 묶음 시세 나누기, 상자별 기댓값, 시세가 없는 젬 상자·유물 코어·지옥 티켓을 대체 비용으로 역산하는 규칙까지 항목별로 정리했습니다.',
    category: '패키지',
    date: '2026-09-07',
    href: '/guide/package-value-formula',
  },
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
  {
    slug: 'extreme-tool',
    title: '익스트림 3막·종막 보상',
    summary: '난이도를 눌러 3막·종막 클리어 보상과 최초 클리어 보상, 나이트메어 칭호를 비교하고 주화 제작소 비용까지 확인합니다.',
    category: '레이드',
    date: '2026-09-18',
    href: '/extreme',
  },
];
