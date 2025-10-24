import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRICE_HISTORY_FILE = path.join(process.cwd(), 'data', 'price-history.json');

// 가격 히스토리 타입
type PriceEntry = {
  price: number;
  timestamp: string;
};

type PriceHistory = {
  [itemId: string]: PriceEntry[];
};

export async function POST(request: Request) {
  try {
    const { itemId, price } = await request.json();

    if (!itemId || price === undefined) {
      return NextResponse.json(
        { message: 'itemId와 price가 필요합니다.' },
        { status: 400 }
      );
    }

    // 기존 히스토리 읽기
    let history: PriceHistory = {};
    if (fs.existsSync(PRICE_HISTORY_FILE)) {
      const fileContent = fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8');
      history = JSON.parse(fileContent);
    }

    // 새 가격 추가
    if (!history[itemId]) {
      history[itemId] = [];
    }

    const newEntry: PriceEntry = {
      price: Number(price),
      timestamp: new Date().toISOString(),
    };

    history[itemId].push(newEntry);

    // 최근 100개 데이터만 유지
    if (history[itemId].length > 100) {
      history[itemId] = history[itemId].slice(-100);
    }

    // 파일에 저장
    fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(history, null, 2));

    return NextResponse.json({
      success: true,
      message: '가격 데이터가 저장되었습니다.',
      data: newEntry,
    });
  } catch (error: any) {
    console.error('가격 저장 오류:', error);
    return NextResponse.json(
      { message: '가격 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
