import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    return NextResponse.json({ message: '아이템 ID를 입력해주세요.' }, { status: 400 });
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: '서버에 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    console.log(`Fetching price for item ID: ${itemId}`);
    
    // First, try direct item API to get detailed price info
    const directResponse = await fetch(`https://developer-lostark.game.onstove.com/markets/items/${itemId}`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
    });

    if (directResponse.ok) {
      const data = await directResponse.json();

      if (data && Array.isArray(data) && data.length > 0) {
        const itemData = data[0];
      let averagePrice = 0;
      
      // 전날 거래 평균가 우선 사용
      if (itemData.YDayAvgPrice && itemData.YDayAvgPrice > 0) {
        averagePrice = itemData.YDayAvgPrice;
        console.log(`Direct API - Using yesterday average: ${averagePrice}`);
      } 
      // 전날 평균가가 없으면 통계 평균가 사용
      else if (itemData.Stats && itemData.Stats.length > 0 && itemData.Stats[0].AvgPrice > 0) {
        averagePrice = itemData.Stats[0].AvgPrice;
        console.log(`Direct API - Using stats average: ${averagePrice}`);
      }
      // 마지막 대안으로 현재 최저가 사용
      else if (itemData.CurrentMinPrice && itemData.CurrentMinPrice > 0) {
        averagePrice = itemData.CurrentMinPrice;
        console.log(`Direct API - Using current min: ${averagePrice}`);
      }
      
      console.log(`Direct API - Final price for ${itemId}: ${averagePrice}`);
      
        return NextResponse.json({
          itemId,
          averagePrice,
          debug: {
            itemName: itemData.Name,
            currentMinPrice: itemData.CurrentMinPrice,
            yDayAvgPrice: itemData.YDayAvgPrice,
            statsAvgPrice: itemData.Stats?.[0]?.AvgPrice || null,
            statsDate: itemData.Stats?.[0]?.Date || null
          }
        });
      }
    }

    // If direct API fails, fallback to search method
    console.log(`Direct API returned no data for ${itemId}, trying search method`);

    const searchResponse = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Sort: 'GRADE',
        CategoryCode: 50010, // 재련 재료
        ItemName: '',
        PageNo: 1,
        SortCondition: 'ASC',
      })
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();

      if (searchData && searchData.Items && searchData.Items.length > 0) {
        const targetItem = searchData.Items.find((item: any) => item.Id === parseInt(itemId));
      
        if (targetItem) {
          // Try to get detailed info for this item
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
            let price = detail.YDayAvgPrice || detail.CurrentMinPrice || 0;
            if (detail.Stats && detail.Stats[0] && price === 0) {
              price = detail.Stats[0].AvgPrice || 0;
            }

                console.log(`Search method - Found price for ${itemId}: ${price}`);

                return NextResponse.json({
                  itemId,
                  averagePrice: price,
                  debug: {
                    itemName: detail.Name,
                    yDayAvgPrice: detail.YDayAvgPrice,
                    currentMinPrice: detail.CurrentMinPrice,
                    statsAvgPrice: detail.Stats?.[0]?.AvgPrice || null,
                    bundleCount: targetItem.BundleCount
                  }
                });
              }
            }
          } catch (detailError) {
            console.log('Detail API failed, using auction info');
          }

          // Fallback to auction info
          let auctionPrice = 0;
          if (targetItem.AuctionInfo) {
            auctionPrice = targetItem.AuctionInfo.BuyPrice || targetItem.AuctionInfo.StartPrice || 0;
          }

          return NextResponse.json({
            itemId,
            averagePrice: auctionPrice,
            debug: {
              itemName: targetItem.Name,
              auctionInfo: targetItem.AuctionInfo,
              bundleCount: targetItem.BundleCount,
              method: 'auction'
            }
          });
        }
      }
    }
    
    console.log(`No data found for item ${itemId}`);
    return NextResponse.json({ itemId, averagePrice: 0 });

  } catch (error: any) {
    console.error(`Error fetching price for item ${itemId}:`, error);
    return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
}
