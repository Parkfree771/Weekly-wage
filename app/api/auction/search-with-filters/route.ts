import { NextResponse } from 'next/server';

/**
 * 경매장 아이템 고급 검색 (필터 옵션 지원)
 *
 * 지원하는 필터:
 * - ItemName: 아이템 이름
 * - CategoryCode: 카테고리 코드
 * - ItemTier: 아이템 티어
 * - ItemGrade: 아이템 등급 (전설, 유물, 고대 등)
 * - ItemLevelMin, ItemLevelMax: 아이템 레벨 범위
 * - ItemGradeQuality: 품질 (0~100)
 * - ItemUpgradeLevel: 강화 레벨
 * - ItemTradeAllowCount: 거래 가능 횟수
 * - SkillOptions: 스킬 옵션 배열
 * - EtcOptions: 기타 옵션 배열 (각인, 특성 등)
 * - Sort: 정렬 기준 (BUY_PRICE, BIDSTART_PRICE, EXPIREDATE 등)
 * - SortCondition: 정렬 방향 (ASC, DESC)
 */
export async function POST(request: Request) {
  try {
    const filters = await request.json();

    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 기본값 설정
    const requestBody = {
      ItemName: filters.ItemName || null,
      CategoryCode: filters.CategoryCode || null,
      CharacterClass: filters.CharacterClass || null,
      ItemTier: filters.ItemTier || null,
      ItemGrade: filters.ItemGrade || null,
      ItemLevelMin: filters.ItemLevelMin || 0,
      ItemLevelMax: filters.ItemLevelMax || 0,
      ItemGradeQuality: filters.ItemGradeQuality || null,
      ItemUpgradeLevel: filters.ItemUpgradeLevel || null,
      ItemTradeAllowCount: filters.ItemTradeAllowCount || null,
      SkillOptions: filters.SkillOptions || null,
      EtcOptions: filters.EtcOptions || null,
      PageNo: filters.PageNo || 0,
      SortCondition: filters.SortCondition || 'ASC',
      Sort: filters.Sort || 'BUY_PRICE'
    };

    console.log('[Auction Search] Request:', JSON.stringify(requestBody, null, 2));

    // 경매장 검색
    const response = await fetch(
      'https://developer-lostark.game.onstove.com/auctions/items',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Auction Search] API Error:', response.status, errorText);
      return NextResponse.json(
        { message: '경매장 검색에 실패했습니다.', error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const items = data?.Items || [];

    console.log(`[Auction Search] Found ${items.length} items`);

    if (items.length === 0) {
      return NextResponse.json({
        success: false,
        message: '검색 결과가 없습니다.',
        totalCount: 0,
        items: []
      });
    }

    // 결과 포맷팅
    const formattedItems = items.map((item: any) => ({
      name: item.Name,
      grade: item.Grade,
      tier: item.Tier,
      level: item.Level,
      icon: item.Icon,
      gradeQuality: item.GradeQuality,
      auctionInfo: {
        buyPrice: item.AuctionInfo.BuyPrice,
        bidStartPrice: item.AuctionInfo.BidStartPrice,
        bidPrice: item.AuctionInfo.BidPrice,
        endDate: item.AuctionInfo.EndDate,
        bidCount: item.AuctionInfo.BidCount,
        tradeAllowCount: item.AuctionInfo.TradeAllowCount
      },
      options: item.Options || []
    }));

    return NextResponse.json({
      success: true,
      totalCount: data.TotalCount,
      pageNo: data.PageNo,
      pageSize: data.PageSize,
      items: formattedItems,
      // 최저가 정보
      lowestPrice: items[0]?.AuctionInfo?.BuyPrice || items[0]?.AuctionInfo?.BidStartPrice
    });
  } catch (error: any) {
    console.error('[Auction Search] Error:', error.message);
    return NextResponse.json(
      { message: '경매장 검색 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
