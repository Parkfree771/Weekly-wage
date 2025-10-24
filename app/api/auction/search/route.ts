import { NextResponse } from 'next/server';
import axios from 'axios';

// 경매장 아이템 검색 및 최저가 조회
export async function POST(request: Request) {
  try {
    const { itemName, categoryCode } = await request.json();

    if (!itemName) {
      return NextResponse.json(
        { message: 'itemName이 필요합니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 경매장 검색
    const response = await axios.post(
      'https://developer-lostark.game.onstove.com/auctions/items',
      {
        ItemName: itemName,
        CategoryCode: categoryCode || null,
        PageNo: 0,
        SortCondition: 'ASC',
        Sort: 'BUY_PRICE'
      },
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const items = response.data?.Items || [];

    if (items.length === 0) {
      return NextResponse.json(
        { message: '검색 결과가 없습니다.' },
        { status: 404 }
      );
    }

    // 최저 즉시 구매가 찾기
    const lowestPriceItem = items[0];
    const auctionInfo = lowestPriceItem.AuctionInfo;

    return NextResponse.json({
      success: true,
      itemName: lowestPriceItem.Name,
      grade: lowestPriceItem.Grade,
      lowestPrice: auctionInfo.BuyPrice || auctionInfo.BidStartPrice,
      totalCount: response.data.TotalCount,
      item: {
        name: lowestPriceItem.Name,
        grade: lowestPriceItem.Grade,
        tier: lowestPriceItem.Tier,
        buyPrice: auctionInfo.BuyPrice,
        bidStartPrice: auctionInfo.BidStartPrice,
        bidPrice: auctionInfo.BidPrice,
        endDate: auctionInfo.EndDate,
        bidCount: auctionInfo.BidCount
      }
    });
  } catch (error: any) {
    console.error('경매장 검색 오류:', error.response?.data || error.message);
    return NextResponse.json(
      { message: '경매장 검색 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
