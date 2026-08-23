import { NextResponse } from 'next/server';

// 실시간 최저가 — 패키지 효율 페이지의 "시세 갱신" 버튼 전용.
//
// 기존 수집 파이프라인(cron collect-prices → latest_prices.json, 거래 평균가·1시간)과
// 완전히 독립이다: 아무것도 저장하지 않고, 로아 검색 API 의 CurrentMinPrice 를
// 그대로 응답한다. 공유 지점은 CDN durable 캐시 하나 —
// TTL(300초) 안에는 몇 명이 누르든 함수 실행이 1회를 넘지 않는다.
//
// 단위 규약: 검색 API 의 CurrentMinPrice 는 인게임 거래소 표시가와 같은 "묶음 가격"이다
// (실측: 파괴석 결정 Bundle=100 → 100개 묶음 가격, 주머니·책·각인서 Bundle=1 → 개당).
// latest_prices.json 도 같은 규약이라 환산 없이 그대로 덮어쓸 수 있다 —
// getItemUnitPrice() 의 PRICE_BUNDLE_SIZE 나눗셈이 양쪽에 동일하게 적용된다.
//
// API 키: 이 라우트 전용 키(LOSTARK_LIVE_API_KEY)를 쓴다.
// 분당 100회 리밋이 키 단위라, 정시에 수십 건을 버스트하는 cron 수집(LOSTARK_API_KEY)과
// 쿼터가 안 겹친다. 전용 키가 없는 환경에서는 수집용 키로 폴백한다.

const API_BASE = 'https://developer-lostark.game.onstove.com';

// 검색 카테고리 코드 (GET /markets/options 실측)
const CAT = { refine: 50010, refineAdd: 50020, engraving: 40000, gem: 230000 } as const;

// 패키지 효율 계산 그래프(package-shared + hell-reward-calc)가 읽는 시세 키 전부.
// searchName 은 인게임 정식 명칭 — 부분 일치 검색 후 응답의 Id 로 정확히 매칭하므로
// 책의 "(무기)/(방어구)" 같은 사이트 표기 접미사는 붙이지 않는다.
// grade 는 각인서만 — 이름이 "유물 원한 각인서"처럼 등급 접두라서 필터 없이는 하위 등급도 걸린다.
const MARKET_ITEMS: { id: string; searchName: string; cat: number; grade?: string }[] = [
  // 재련 재료
  { id: '66102006', searchName: '운명의 파괴석', cat: CAT.refine },
  { id: '66102106', searchName: '운명의 수호석', cat: CAT.refine },
  { id: '66102007', searchName: '운명의 파괴석 결정', cat: CAT.refine },
  { id: '66102107', searchName: '운명의 수호석 결정', cat: CAT.refine },
  { id: '66110225', searchName: '운명의 돌파석', cat: CAT.refine },
  { id: '66110226', searchName: '위대한 운명의 돌파석', cat: CAT.refine },
  { id: '66130143', searchName: '운명의 파편 주머니(대)', cat: CAT.refine },
  { id: '6861012', searchName: '아비도스 융화 재료', cat: CAT.refine },
  { id: '6861013', searchName: '상급 아비도스 융화 재료', cat: CAT.refine },
  // 숨결
  { id: '66111131', searchName: '용암의 숨결', cat: CAT.refineAdd },
  { id: '66111132', searchName: '빙하의 숨결', cat: CAT.refineAdd },
  // 재련 책 (시세연동 패키지·특수재련 계산에 쓰임)
  { id: '66112553', searchName: '야금술 : 업화 [19-20]', cat: CAT.refineAdd },
  { id: '66112554', searchName: '재봉술 : 업화 [19-20]', cat: CAT.refineAdd },
  { id: '66112555', searchName: '강화 야금술 : 업화 [19-20]', cat: CAT.refineAdd },
  { id: '66112556', searchName: '강화 재봉술 : 업화 [19-20]', cat: CAT.refineAdd },
  { id: '66112561', searchName: '야금술 : 전율 [12-15]', cat: CAT.refineAdd },
  { id: '66112562', searchName: '야금술 : 전율 [16-19]', cat: CAT.refineAdd },
  { id: '66112564', searchName: '재봉술 : 전율 [12-15]', cat: CAT.refineAdd },
  { id: '66112565', searchName: '재봉술 : 전율 [16-19]', cat: CAT.refineAdd },
  { id: '66112715', searchName: '장인의 야금술 : 3단계', cat: CAT.refineAdd },
  { id: '66112716', searchName: '장인의 재봉술 : 3단계', cat: CAT.refineAdd },
  { id: '66112717', searchName: '장인의 야금술 : 4단계', cat: CAT.refineAdd },
  { id: '66112718', searchName: '장인의 재봉술 : 4단계', cat: CAT.refineAdd },
  // 유물 각인서 (지옥 티켓 → 귀속 각인서 상자 기댓값)
  { id: '65200505', searchName: '원한', cat: CAT.engraving, grade: '유물' },
  { id: '65200605', searchName: '슈퍼 차지', cat: CAT.engraving, grade: '유물' }, // 인게임 명칭은 띄어 쓴다 (사이트 표기는 "슈퍼차지")
  { id: '65201005', searchName: '예리한 둔기', cat: CAT.engraving, grade: '유물' },
  { id: '65201505', searchName: '결투의 대가', cat: CAT.engraving, grade: '유물' },
  { id: '65202805', searchName: '저주받은 인형', cat: CAT.engraving, grade: '유물' },
  { id: '65203005', searchName: '기습의 대가', cat: CAT.engraving, grade: '유물' },
  { id: '65203305', searchName: '돌격대장', cat: CAT.engraving, grade: '유물' },
  { id: '65203405', searchName: '각성', cat: CAT.engraving, grade: '유물' },
  { id: '65203505', searchName: '질량 증가', cat: CAT.engraving, grade: '유물' },
  { id: '65203705', searchName: '타격의 대가', cat: CAT.engraving, grade: '유물' },
  { id: '65203905', searchName: '아드레날린', cat: CAT.engraving, grade: '유물' },
  { id: '65204105', searchName: '전문의', cat: CAT.engraving, grade: '유물' },
  // 영웅 젬 (가공 젬 상자·지옥 젬 선택 상자)
  { id: '67400003', searchName: '질서의 젬 : 안정', cat: CAT.gem },
  { id: '67400103', searchName: '질서의 젬 : 견고', cat: CAT.gem },
  { id: '67400203', searchName: '질서의 젬 : 불변', cat: CAT.gem },
  { id: '67410303', searchName: '혼돈의 젬 : 침식', cat: CAT.gem },
  { id: '67410403', searchName: '혼돈의 젬 : 왜곡', cat: CAT.gem },
  { id: '67410503', searchName: '혼돈의 젬 : 붕괴', cat: CAT.gem },
];

// 경매장 — 지옥 "귀속 보석" 보상 계산이 읽는 키. cron 과 같은 검색 조건.
const AUCTION_ITEMS: { id: string; searchName: string }[] = [
  { id: 'auction_gem_fear_8', searchName: '8레벨 겁화의 보석' },
];

// 함수 전체 예산. Netlify 함수 기본 실행 제한이 10초라, 그 안에서 확실히 끝내야 한다.
// 이 시각을 넘기면 남은 배치를 시작하지 않고 가진 것만 응답한다 —
// 마지막 배치가 최대 REQ_TIMEOUT_MS 를 더 쓰므로 둘의 합이 10초 아래여야 한다.
const BUDGET_MS = 6000;
// 개별 요청 상한. 길게 잡으면 느린 한 건이 예산을 통째로 먹는다.
const REQ_TIMEOUT_MS = 3000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQ_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function searchMarketMin(
  item: (typeof MARKET_ITEMS)[number],
  apiKey: string,
): Promise<number | null> {
  const res = await fetchWithTimeout(`${API_BASE}/markets/items`, {
    method: 'POST',
    headers: { accept: 'application/json', authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ItemName: item.searchName,
      CategoryCode: item.cat,
      ...(item.grade ? { ItemGrade: item.grade } : {}),
      PageNo: 1,
      SortCondition: 'ASC',
      Sort: 'CURRENT_MIN_PRICE',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  // 부분 일치 검색이라 여러 개가 올 수 있다 — Id 로 정확히 하나를 집는다
  const hit = (data?.Items || []).find((x: { Id: number }) => String(x.Id) === item.id);
  const min = hit?.CurrentMinPrice;
  return typeof min === 'number' && min > 0 ? min : null;
}

async function searchAuctionMin(
  item: (typeof AUCTION_ITEMS)[number],
  apiKey: string,
): Promise<number | null> {
  const res = await fetchWithTimeout(`${API_BASE}/auctions/items`, {
    method: 'POST',
    headers: { accept: 'application/json', authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ItemName: item.searchName,
      CategoryCode: 210000, // 보석
      ItemTier: 4,
      PageNo: 0,
      SortCondition: 'ASC',
      Sort: 'BUY_PRICE',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const info = data?.Items?.[0]?.AuctionInfo;
  const price = info?.BuyPrice || info?.BidStartPrice || 0;
  return price > 0 ? price : null;
}

// N개씩 끊어 병렬 실행 — 전 건 동시 발사는 로아 API 가 429 를 줄 수 있다.
// deadline 을 넘기면 남은 배치는 요청하지 않고 skipped 로 채운다.
// 건너뛴 것도 결과 배열에 남겨야 missed 집계와 "절반 미만" 판정이 정확해진다.
async function inBatches<T, R>(
  items: T[],
  size: number,
  fn: (t: T) => Promise<R>,
  deadline: number,
  skipped: (t: T) => R,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    if (Date.now() >= deadline) {
      out.push(...slice.map(skipped));
      continue;
    }
    out.push(...(await Promise.all(slice.map(fn))));
  }
  return out;
}

export async function GET() {
  const apiKey = process.env.LOSTARK_LIVE_API_KEY || process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API 키가 없습니다' }, { status: 500 });
  }

  const prices: Record<string, number> = {};
  const missed: string[] = [];
  const deadline = Date.now() + BUDGET_MS;
  const skipped = (item: { id: string }) => ({ id: item.id, price: null });

  // 거래소와 경매장을 동시에 돌린다. 순차로 두면 거래소가 예산을 다 쓴 뒤
  // 경매장 1건이 통째로 굶는다. 동시 요청은 12+1 건이라 429 걱정도 없다.
  const [marketResults, auctionResults] = await Promise.all([
    inBatches(MARKET_ITEMS, 12, async (item) => {
      try {
        return { id: item.id, price: await searchMarketMin(item, apiKey) };
      } catch {
        return { id: item.id, price: null };
      }
    }, deadline, skipped),
    inBatches(AUCTION_ITEMS, 2, async (item) => {
      try {
        return { id: item.id, price: await searchAuctionMin(item, apiKey) };
      } catch {
        return { id: item.id, price: null };
      }
    }, deadline, skipped),
  ]);

  for (const r of [...marketResults, ...auctionResults]) {
    if (r.price !== null) prices[r.id] = r.price;
    else missed.push(r.id);
  }

  // 한 건도 못 가져왔을 때만 실패로 본다(키 만료·API 장애 등 계통 문제).
  // 일부 결손은 실패가 아니다 — 가져온 것만 덮이고 나머지는 클라이언트에서
  // latest_prices.json 의 거래 평균가가 그대로 남는다(effectivePrices 의 스프레드 병합).
  // 이 응답은 캐시에 싣지 않아 다음 클릭이 곧바로 다시 시도한다.
  if (Object.keys(prices).length === 0) {
    return NextResponse.json(
      { error: '시세 조회 실패', missed },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { fetchedAt: new Date().toISOString(), prices, ...(missed.length ? { missed } : {}) },
    {
      headers: {
        // durable: 전 세계 공유 캐시 — TTL 안에는 몇 명이 누르든 함수 실행 1회.
        // 300초는 기본값인 거래 평균가(1시간 주기)보다 12배 신선하면서 함수 호출을 60% 줄인다.
        // 클라이언트 쿨다운(LIVE_COOLDOWN_MS)과 같은 값이어야 한다 — 쿨다운이 더 짧으면
        // 아직 신선한 캐시를 다시 받아 "눌렀는데 아무 변화 없음" 으로 보인다.
        // 브라우저 캐시는 0 — 버튼이 항상 CDN 까지는 가야 한다.
        'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=600',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  );
}
