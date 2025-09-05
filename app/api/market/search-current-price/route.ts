import { NextResponse } from 'next/server';
import axios from 'axios';

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
    const response = await axios.post(apiUrl, requestBody, options);
    
    console.log(`Current price search for ${itemName}: Found ${response.data?.Items?.length || 0} items`);
    
    if (response.data && response.data.Items && response.data.Items.length > 0) {
      // Find exact match or first item that contains the name
      const targetItem = response.data.Items.find((item: any) => item.Name === itemName) || 
                      response.data.Items.find((item: any) => item.Name.includes(itemName)) ||
                      response.data.Items[0];
      
      console.log(`Current price target item: ${targetItem.Name} (ID: ${targetItem.Id})`);
      
      // Try to get detailed price information
      let price = 0;
      try {
        const detailResponse = await axios.get(`https://developer-lostark.game.onstove.com/markets/items/${targetItem.Id}`, {
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${apiKey}`,
          },
        });
        
        if (detailResponse.data && Array.isArray(detailResponse.data) && detailResponse.data.length > 0) {
          const detail = detailResponse.data[0];
          
          // 현재 최저가 우선 사용
          if (detail.CurrentMinPrice && detail.CurrentMinPrice > 0) {
            price = detail.CurrentMinPrice;
            console.log(`Using current min price: ${price}`);
          }
          // 현재 최저가가 없으면 전날 평균가 사용
          else if (detail.YDayAvgPrice && detail.YDayAvgPrice > 0) {
            price = detail.YDayAvgPrice;
            console.log(`Using yesterday average price: ${price}`);
          } 
          // 마지막 대안으로 통계 평균가 사용
          else if (detail.Stats && detail.Stats.length > 0 && detail.Stats[0].AvgPrice > 0) {
            price = detail.Stats[0].AvgPrice;
            console.log(`Using stats average price: ${price}`);
          }
          
          console.log(`Current price API - Final price: ${price}`);
        }
      } catch (detailError) {
        console.log('Detail API failed for current price, trying auction info');
        
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
      
      console.log(`Current price for ${itemName}: ${price} (bundle: ${targetItem.BundleCount || 1}, unit: ${unitPrice})`);
      
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
          priceType: 'current'
        }
      });
    } else {
      console.log(`No items found for current price: ${itemName}`);
      return NextResponse.json({ itemName, price: 0 });
    }

  } catch (error: any) {
    console.error(`Error searching current price for ${itemName}:`, error);
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data?.Message || '현재 가격 검색에 실패했습니다.' },
        { status: error.response.status }
      );
    } else {
      return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
    }
  }
}