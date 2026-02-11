import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId || typeof postId !== 'string') {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    await db.collection('packagePosts').doc(postId).update({
      viewCount: FieldValue.increment(1),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('조회수 증가 실패:', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
