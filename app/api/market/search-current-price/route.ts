import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  const body = await request.json();
  const itemName = body.itemName;
  const itemId = body.itemId;

  if (!itemName && !itemId) {
    return NextResponse.json({ message: '아이템 이름 또는 ID를 입력해주세요.' }, { status: 400 });
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: '서버에 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    let targetItem: any = null;
    let searchMethod = '';
    
    // If itemId is provided, use direct API call
    if (itemId) {
      console.log(`Getting current price by itemId: ${itemId}`);
      searchMethod = 'direct';
      const detailResponse = await axios.get(`https://developer-lostark.game.onstove.com/markets/items/${itemId}`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (detailResponse.data && Array.isArray(detailResponse.data) && detailResponse.data.length > 0) {
        const detail = detailResponse.data[0];
        
        let price = 0;
        // 1순위: Stats 최신 평균가, 2순위: CurrentMinPrice, 3순위: YDayAvgPrice
        if (detail.Stats && detail.Stats.length > 0 && detail.Stats[0].AvgPrice > 0) {
          price = detail.Stats[0].AvgPrice;
          console.log(`Using latest stats average price: ${price}`);
        } else if (detail.CurrentMinPrice && detail.CurrentMinPrice > 0) {
          price = detail.CurrentMinPrice;
          console.log(`Using current min price: ${price}`);
        } else if (detail.YDayAvgPrice && detail.YDayAvgPrice > 0) {
          price = detail.YDayAvgPrice;
          console.log(`Using yesterday average price: ${price}`);
        } else {
          console.log(`No price data available for item ${itemId}`);
        }
        
        return NextResponse.json({ 
          itemName: detail.Name, 
          price: price,
          itemId: itemId,
          debug: {
            itemName: detail.Name,
            grade: detail.Grade,
            currentMinPrice: detail.CurrentMinPrice,
            yDayAvgPrice: detail.YDayAvgPrice,
            statsAvgPrice: detail.Stats?.[0]?.AvgPrice || null,
            priceType: 'current',
            method: searchMethod
          }
        });
      }
    }
    
    // If itemName is provided or itemId failed, use search API
    if (itemName) {
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

      const response = await axios.post(apiUrl, requestBody, options);
      searchMethod = 'search';
      
      console.log(`Current price search for ${itemName}: Found ${response.data?.Items?.length || 0} items`);
      
      if (response.data && response.data.Items && response.data.Items.length > 0) {
        // Find exact match or first item that contains the name
        targetItem = response.data.Items.find((item: any) => item.Name === itemName) || 
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
            
            // 1순위: Stats 최신 평균가, 2순위: CurrentMinPrice, 3순위: YDayAvgPrice
            if (detail.Stats && detail.Stats.length > 0 && detail.Stats[0].AvgPrice > 0) {
              price = detail.Stats[0].AvgPrice;
              console.log(`Using latest stats average price: ${price}`);
            } else if (detail.CurrentMinPrice && detail.CurrentMinPrice > 0) {
              price = detail.CurrentMinPrice;
              console.log(`Using current min price: ${price}`);
            } else if (detail.YDayAvgPrice && detail.YDayAvgPrice > 0) {
              price = detail.YDayAvgPrice;
              console.log(`Using yesterday average price: ${price}`);
            } else {
              console.log(`No price data available for search result`);
            }
            
            console.log(`Current price API - Final price: ${price}`);
          }
        } catch (detailError) {
          console.log('Detail API failed for current price, no fallback - only using current min price');
          // 현재 최저가만 사용하므로 fallback 없음
          price = 0;
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
          itemName: itemName || targetItem.Name, 
          price: unitPrice,
          itemId: targetItem.Id,
          debug: {
            itemName: targetItem.Name,
            grade: targetItem.Grade,
            bundleCount: targetItem.BundleCount,
            bundlePrice: price,
            unitPrice: unitPrice,
            priceType: 'current',
            method: searchMethod
          }
        });
      } else {
        console.log(`No items found for current price: ${itemName || itemId}`);
        return NextResponse.json({ itemName: itemName || `itemId:${itemId}`, price: 0 });
      }
    }
    
    // If no method worked
    console.log(`No price data found for ${itemName || itemId}`);
    return NextResponse.json({ itemName: itemName || `itemId:${itemId}`, price: 0 });

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