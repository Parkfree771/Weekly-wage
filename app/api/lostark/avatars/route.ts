import { NextResponse } from 'next/server';
import type { AvatarItem, DyeInfo, DyePart, LostArkAvatarRaw } from '@/types/avatar';

/**
 * GET /api/lostark/avatars?characterName={캐릭터명}
 *
 * 로스트아크 공식 API에서 아바타 데이터를 가져와 파싱한 뒤 반환.
 * - Tooltip JSON 내부의 ItemTintGroup 에서 염색 정보 추출
 * - 프로필 API 도 동시 호출하여 캐릭터 이미지/클래스/서버/레벨 포함
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const characterName = searchParams.get('characterName');

  if (!characterName) {
    return NextResponse.json(
      { message: '캐릭터명을 입력해주세요.' },
      { status: 400 },
    );
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: '서버에 API 키가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  const encoded = encodeURIComponent(characterName);
  const baseUrl = 'https://developer-lostark.game.onstove.com';

  const options: RequestInit = {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
  };

  try {
    // 프로필 + 아바타 동시 요청
    const [profileRes, avatarRes] = await Promise.all([
      fetch(`${baseUrl}/armories/characters/${encoded}/profiles`, options),
      fetch(`${baseUrl}/armories/characters/${encoded}/avatars`, options),
    ]);

    if (!profileRes.ok) {
      const status = profileRes.status;
      const errData = await profileRes.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData?.Message || '캐릭터를 찾을 수 없습니다.' },
        { status },
      );
    }

    if (!avatarRes.ok) {
      const status = avatarRes.status;
      const errData = await avatarRes.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData?.Message || '아바타 정보를 가져올 수 없습니다.' },
        { status },
      );
    }

    const [profileData, avatarRawList] = await Promise.all([
      profileRes.json(),
      avatarRes.json(),
    ]);

    // 프로필 정보 추출
    const characterClass = profileData?.CharacterClassName || '';
    const characterLevel = parseFloat(
      (profileData?.ItemAvgLevel || '0').replace(/,/g, ''),
    );
    const serverName = profileData?.ServerName || '';
    const characterImageUrl = profileData?.CharacterImage || '';

    // 아바타 목록 파싱
    const avatarItems: AvatarItem[] = [];

    if (Array.isArray(avatarRawList)) {
      for (const raw of avatarRawList as LostArkAvatarRaw[]) {
        const dyeInfo = parseAvatarTooltip(raw.Tooltip);

        avatarItems.push({
          type: raw.Type || '',
          name: raw.Name || '',
          icon: raw.Icon || '',
          grade: raw.Grade || '',
          isSet: raw.IsSet ?? false,
          isInner: raw.IsInner ?? false,
          dyeInfo,
        });
      }
    }

    const responseData = {
      characterName: profileData?.CharacterName || characterName,
      characterClass,
      characterLevel,
      serverName,
      characterImageUrl,
      avatarItems,
    };

    return NextResponse.json(responseData, {
      headers: {
        // Netlify CDN 캐시: 2시간 유효, 만료 후 1시간은 stale 반환 + 백그라운드 갱신
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('아바타 API 오류:', error);
    return NextResponse.json(
      { message: 'API 요청 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

// ─── Tooltip 파싱 유틸 ───

/**
 * 로스트아크 API Tooltip JSON 문자열에서 염색 정보를 추출한다.
 *
 * Tooltip 구조 예시:
 * {
 *   "Element_000": { "type": "NameTagBox", ... },
 *   "Element_001": { "type": "ItemTitle", ... },
 *   ...
 *   "Element_00N": {
 *     "type": "ItemTintGroup",
 *     "value": {
 *       "groupName": "염색",
 *       "itemData": {
 *         "Element_000": { "title": "부위1", "baseColor": "#000", ... },
 *         "Element_001": { "title": "부위2", ... }
 *       }
 *     }
 *   }
 * }
 */
function parseAvatarTooltip(tooltipStr: string): DyeInfo | null {
  if (!tooltipStr) return null;

  try {
    const tooltip = JSON.parse(tooltipStr);

    for (const key of Object.keys(tooltip)) {
      const element = tooltip[key];
      if (element?.type === 'ItemTintGroup') {
        const itemData = element.value?.itemData;
        if (!itemData) continue;

        const parts: DyePart[] = [];

        for (const partKey of Object.keys(itemData)) {
          const part = itemData[partKey];
          if (!part) continue;

          // patternHSV 는 Element_000 / Element_001 / Element_002 형태
          const hsvRaw = part.patternHSV;
          const h = parseFloat(hsvRaw?.Element_000 ?? hsvRaw?.h ?? 0);
          const s = parseFloat(hsvRaw?.Element_001 ?? hsvRaw?.s ?? 0);
          const v = parseFloat(hsvRaw?.Element_002 ?? hsvRaw?.v ?? 0);

          parts.push({
            title: part.title || `부위${parts.length + 1}`,
            baseColor: normalizeHex(part.baseColor),
            glossValue: part.glossValue || '0%',
            patternColor: normalizeHex(part.patternColor),
            patternHSV: { h, s, v },
            patternIcon: part.patternIcon?.iconPath || null,
          });
        }

        if (parts.length > 0) {
          return { parts };
        }
      }
    }
  } catch (err) {
    console.error('Tooltip 파싱 실패:', err);
  }

  return null;
}

/** HEX 색상 정규화 (# 접두사 보장, 빈 값이면 기본값) */
function normalizeHex(hex: string | undefined | null): string {
  if (!hex) return '#000000';
  const trimmed = hex.trim();
  if (trimmed.startsWith('#')) return trimmed;
  return `#${trimmed}`;
}
