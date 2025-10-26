import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const itemName = body.itemName;

  if (!itemName) {
    return NextResponse.json({ message: '아이템 이름을 입력해주세요.' }, { status: 400 });
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: '서버에 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  const apiUrl = 'https://developer-lostark.game.onstove.com/markets/items';

  const options = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  const requestBody = {
    Sort: 'GRADE',
    CategoryCode: 50010, // 재련 재료
    ItemName: itemName,
    PageNo: 1,
    SortCondition: 'ASC',
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData?.Message || '아이템 검색에 실패했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log(`Search API Response for ${itemName}: Found ${data?.Items?.length || 0} items`);

    if (data && data.Items && data.Items.length > 0) {
      // Find exact match or first item that contains the name
      const targetItem = data.Items.find((item: any) => item.Name === itemName) ||
                      data.Items.find((item: any) => item.Name.includes(itemName)) ||
                      data.Items[0];
      
      console.log(`Target item: ${targetItem.Name} (ID: ${targetItem.Id})`);
      
      // Try to get detailed price information
      let price = 0;
      try {
        const detailResponse = await fetch(`https://developer-lostark.game.onstove.com/markets/items/${targetItem.Id}`, {
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${apiKey}`,
          },
        });

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();

          if (detailData && Array.isArray(detailData) && detailData.length > 0) {
            const detail = detailData[0];
          
          // 전날 거래 평균가 우선 사용
          if (detail.YDayAvgPrice && detail.YDayAvgPrice > 0) {
            price = detail.YDayAvgPrice;
            console.log(`Using yesterday average price: ${price}`);
          } 
          // 전날 평균가가 없으면 통계 평균가 사용
          else if (detail.Stats && detail.Stats.length > 0 && detail.Stats[0].AvgPrice > 0) {
            price = detail.Stats[0].AvgPrice;
            console.log(`Using stats average price: ${price}`);
          }
          // 마지막 대안으로 현재 최저가 사용
          else if (detail.CurrentMinPrice && detail.CurrentMinPrice > 0) {
            price = detail.CurrentMinPrice;
            console.log(`Using current min price: ${price}`);
          }

            console.log(`Detail API - Final price: ${price}`);
          }
        }
      } catch (detailError) {
        console.log('Detail API failed, trying auction info');
        
        // Fallback to auction info if available
        if (targetItem.AuctionInfo) {
          if (targetItem.AuctionInfo.BuyPrice && targetItem.AuctionInfo.BuyPrice > 0) {
            price = targetItem.AuctionInfo.BuyPrice;
          } else if (targetItem.AuctionInfo.StartPrice && targetItem.AuctionInfo.StartPrice > 0) {
            price = targetItem.AuctionInfo.StartPrice;
          } else if (targetItem.AuctionInfo.BidPrice && targetItem.AuctionInfo.BidPrice > 0) {
            price = targetItem.AuctionInfo.BidPrice;
          }
        }
      }
      
      // Calculate unit price based on item type
      let unitPrice = price;
      if (price > 0) {
        if (targetItem.BundleCount && targetItem.BundleCount > 1) {
          // 100개 묶음 (수호석, 파괴석)
          unitPrice = Math.round(price / targetItem.BundleCount * 100) / 100;
        } else if (targetItem.Name === '운명의 파편 주머니(소)') {
          // 파편 주머니는 1000개 파편이 들어있음
          unitPrice = Math.round(price / 1000 * 100000) / 100000;
        }
      }
      
      console.log(`Found price for ${itemName}: ${price} (bundle: ${targetItem.BundleCount || 1}, unit: ${unitPrice})`);
      
      return NextResponse.json({ 
        itemName, 
        price: unitPrice,
        itemId: targetItem.Id,
        debug: {
          itemName: targetItem.Name,
          grade: targetItem.Grade,
          bundleCount: targetItem.BundleCount,
          bundlePrice: price,
          unitPrice: unitPrice,
          auctionInfo: targetItem.AuctionInfo
        }
      });
    } else {
      console.log(`No items found for: ${itemName}`);
      return NextResponse.json({ itemName, price: 0 });
    }

  } catch (error: any) {
    console.error(`Error searching for ${itemName}:`, error);
    return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
}