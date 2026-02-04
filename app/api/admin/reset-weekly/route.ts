import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

// 모든 유저의 주간 체크리스트 초기화 (관리자용)
export async function POST(request: Request) {
  // 인증 확인 (프로덕션에서만)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: '인증되지 않은 요청입니다.' },
      { status: 401 }
    );
  }

  try {
    const db = getAdminFirestore();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    const now = new Date().toISOString();
    let resetCount = 0;
    let errorCount = 0;

    console.log(`[주간 초기화] 총 ${snapshot.size}명의 유저 처리 시작`);

    for (const doc of snapshot.docs) {
      try {
        const userData = doc.data();
        const characters = userData.characters || [];
        const weeklyChecklist = userData.weeklyChecklist || {};

        if (characters.length === 0) {
          continue; // 캐릭터 없는 유저는 건너뛰기
        }

        // 레이드 체크리스트 초기화 (캐릭터 정보는 유지)
        const resetChecklist: Record<string, any> = {};

        characters.forEach((char: any) => {
          const existingState = weeklyChecklist[char.name];
          const raidState: Record<string, boolean[]> = {};

          // 기존 레이드 설정 유지하면서 체크만 false로
          if (existingState?.raids) {
            Object.keys(existingState.raids).forEach((raidName: string) => {
              const gateCount = existingState.raids[raidName]?.length || 4;
              raidState[raidName] = new Array(gateCount).fill(false);
            });
          }

          resetChecklist[char.name] = {
            raids: raidState,
            additionalGold: 0,  // 추가 골드 초기화
            paradise: false,    // 낙원 초기화
            sandOfTime: false,  // 모래시계 초기화
            // 더보기 비용 설정은 유지
            raidMoreGoldExclude: existingState?.raidMoreGoldExclude || {},
          };
        });

        // Firestore 업데이트
        await doc.ref.update({
          weeklyChecklist: resetChecklist,
          lastWeeklyReset: now,
        });

        resetCount++;
        console.log(`  [${resetCount}] ${doc.id} 초기화 완료`);
      } catch (error) {
        console.error(`  [오류] ${doc.id}:`, error);
        errorCount++;
      }
    }

    console.log(`[주간 초기화] 완료: ${resetCount}명 성공, ${errorCount}명 실패`);

    return NextResponse.json({
      success: true,
      message: `주간 초기화 완료: ${resetCount}명 성공, ${errorCount}명 실패`,
      resetCount,
      errorCount,
      timestamp: now,
    });
  } catch (error: any) {
    console.error('[주간 초기화] 실패:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
