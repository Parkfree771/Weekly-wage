import { NextResponse } from 'next/server';
import { isLostArkMaintenance } from '@/lib/lostark-maintenance';
import { parseAvatars } from '@/lib/avatar-dye';

// 아바타 착장 불러오기 전용 — 로아 API 는 딱 1회만 부른다.
// /armories/characters/{name}?filters=profiles+avatars 한 번으로 프로필(직업·캐릭터 이미지)과 아바타가 같이 온다.
// (/api/lostark 는 프로필·장비 등 여러 번 부르므로 여기선 쓰지 않는다)
// 응답은 원본 툴팁이 아니라 lib/avatar-dye 로 정리한 형태(부위·이름·등급·덧입기·염색 헥스·아이콘 주소).
export async function GET(request: Request) {
  const characterName = new URL(request.url).searchParams.get('characterName')?.trim();

  if (!characterName) {
    return NextResponse.json({ message: '캐릭터명을 입력해주세요.' }, { status: 400 });
  }
  if (isLostArkMaintenance()) {
    return NextResponse.json(
      { message: '로아 서버 점검 중(수요일 06:00~10:00)이라 아바타 정보를 가져올 수 없습니다.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: '서버에 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://developer-lostark.game.onstove.com/armories/characters/${encodeURIComponent(characterName)}?filters=profiles%2Bavatars`,
      { headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: err?.Message || '아바타 정보를 가져오는 데 실패했습니다.' },
        { status: res.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // 없는 캐릭터는 로아 API 가 200 + null 을 준다
    const raw = await res.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || !raw.ArmoryProfile) {
      return NextResponse.json(
        { message: '캐릭터를 찾을 수 없습니다.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const profile = raw.ArmoryProfile as { CharacterClassName?: string; CharacterImage?: string };
    const image = typeof profile.CharacterImage === 'string' && profile.CharacterImage.startsWith('https://')
      ? profile.CharacterImage
      : null;

    // 방금 염색을 바꾸고 다시 불러오는 경우가 있어 캐시하지 않는다
    return NextResponse.json(
      {
        className: profile.CharacterClassName ?? null,
        characterImage: image,
        avatars: parseAvatars(raw.ArmoryAvatars),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
