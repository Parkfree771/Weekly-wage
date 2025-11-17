import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const itemId = body.itemId;

  if (!itemId) {
    return NextResponse.json({ message: '아이템 ID를 입력해주세요.' }, { status: 400 });
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: '서버에 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    console.log(`Getting yesterday average price for itemId: ${itemId}`);

    const detailResponse = await fetch(`https://developer-lostark.game.onstove.com/markets/items/${itemId}`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
    });

    if (!detailResponse.ok) {
      console.error(`API failed for item ${itemId}:`, detailResponse.status);
      return NextResponse.json({ itemId, price: 0, error: 'API 요청 실패' });
    }

    const data = await detailResponse.json();

    if (data && Array.isArray(data) && data.length > 0) {
      const detail = data[0];

      // 어제 평균가만 사용
      let bundlePrice = detail.YDayAvgPrice || 0;
      console.log(`Yesterday average price for ${detail.Name}: ${bundlePrice}`);

      // 단위 가격 계산
      let unitPrice = bundlePrice;
      if (bundlePrice > 0) {
        if (detail.BundleCount && detail.BundleCount > 1) {
          // 100개 묶음 (수호석, 파괴석)
          unitPrice = Math.round(bundlePrice / detail.BundleCount * 100) / 100;
        } else if (detail.Name === '운명의 파편 주머니(대)') {
          // 파편 주머니(대)는 3000개 파편이 들어있음
          unitPrice = Math.round(bundlePrice / 3000 * 100000) / 100000;
        }
      }

      console.log(`Unit price for ${detail.Name}: ${unitPrice} (bundle: ${detail.BundleCount || 1})`);

      return NextResponse.json({
        itemId,
        itemName: detail.Name,
        price: unitPrice,
        bundlePrice: bundlePrice,
        bundleCount: detail.BundleCount || 1,
        timestamp: Date.now()
      });
    }

    console.log(`No data found for item ${itemId}`);
    return NextResponse.json({ itemId, price: 0 });

  } catch (error: any) {
    console.error(`Error getting yesterday average price for ${itemId}:`, error);
    return NextResponse.json({
      itemId,
      price: 0,
      error: 'API 요청 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
