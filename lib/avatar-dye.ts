// 아바타 착장 정보 — 로아 API /armories/characters/{name}/avatars 응답을 저장용 형태로 정리한다.
// 원본 툴팁(JSON 문자열)은 크고 HTML 이 섞여 있어서, 갤러리에 필요한 것만 뽑는다:
//   부위(상의 아바타 …) · 아바타 이름 · 등급 · 덧입기 여부 · 염색(영역별 기본색/무늬색/광택)

/** 염색 영역 하나 (게임 툴팁의 "부위1", "부위2" …) */
export type AvatarDyeArea = {
  area: string;      // '부위1'
  base: string;      // 기본색 '#B5868A' (대문자 6자리 헥스)
  pattern: string;   // 무늬색 '#FFFFFF'
  gloss: string;     // 광택 '0%' · '기본값' (게임 표기 그대로)
};

/** 착용 아바타 하나 */
export type AvatarPiece = {
  part: string;      // '상의 아바타' · '무기 아바타' · '이동 효과' …
  name: string;      // '비바 풋볼 응원복 상의'
  grade: string;     // '영웅' · '전설'
  isInner: boolean;  // true = 안에 입은 것(겉모습 아님). 겉에 보이는 건 false
  dyes: AvatarDyeArea[]; // 염색 불가·미염색 아바타는 빈 배열
  icon?: string;     // 로아 CDN 아이콘 URL (API 로 불러온 것만. 파일은 저장하지 않고 주소만)
};

type RawAvatar = {
  Type?: string;
  Icon?: string;
  Name?: string;
  Grade?: string;
  IsInner?: boolean;
  Tooltip?: string;
};

type RawTintArea = {
  title?: string;
  baseColor?: string;
  patternColor?: string;
  glossValue?: string;
};

/** '#ce43fc' · 'ce43fc' → '#CE43FC'. 6자리 헥스가 아니면 null */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toUpperCase()}` : null;
}

/** 툴팁 JSON 에서 ItemTintGroup(염색 정보) 블록을 찾아 영역별로 정리 */
function parseDyes(tooltip: string | undefined): AvatarDyeArea[] {
  if (!tooltip) return [];
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(tooltip);
  } catch {
    return [];
  }
  for (const el of Object.values(parsed)) {
    const block = el as { type?: string; value?: { itemData?: Record<string, RawTintArea> } } | null;
    if (block?.type !== 'ItemTintGroup') continue;
    const areas = Object.values(block.value?.itemData ?? {});
    const out: AvatarDyeArea[] = [];
    areas.forEach((a, i) => {
      const base = normalizeHex(a?.baseColor);
      const pattern = normalizeHex(a?.patternColor);
      if (!base && !pattern) return;
      out.push({
        area: a?.title?.trim() || `부위${i + 1}`,
        base: base ?? '',
        pattern: pattern ?? '',
        gloss: (a?.glossValue ?? '').trim(),
      });
    });
    return out;
  }
  return [];
}

/**
 * 직업 분류 — 게임 캐릭터 생성 화면의 상위 분류(성별 포함) 순서. 아바타는 이 분류(체형) 단위로 공유된다.
 * 착장 필터의 1단 버튼과 등록 폼의 직업 선택 묶음이 이것을 따른다.
 */
export const CLASS_GROUPS: { label: string; classes: string[] }[] = [
  { label: '전사(남)', classes: ['버서커', '디스트로이어', '워로드', '홀리나이트'] },
  { label: '전사(여)', classes: ['슬레이어', '발키리'] },
  { label: '무도가(남)', classes: ['스트라이커', '브레이커'] },
  { label: '무도가(여)', classes: ['배틀마스터', '인파이터', '기공사', '창술사'] },
  { label: '헌터(남)', classes: ['데빌헌터', '블래스터', '호크아이', '스카우터'] },
  { label: '헌터(여)', classes: ['건슬링어'] },
  { label: '마법사', classes: ['바드', '서머너', '아르카나', '소서리스'] },
  { label: '암살자', classes: ['블레이드', '데모닉', '리퍼', '소울이터'] },
  { label: '스페셜리스트(여)', classes: ['도화가', '기상술사', '환수사'] },
  { label: '스페셜리스트(남)', classes: ['차원술사'] },
  { label: '가디언나이트', classes: ['가디언나이트'] },
];

/** 직업 전체 — 분류 순서대로 */
export const LOSTARK_CLASSES: readonly string[] = CLASS_GROUPS.flatMap((g) => g.classes);

/** 직업 → 분류 이름 */
export function classGroupOf(className: string): string | null {
  return CLASS_GROUPS.find((g) => g.classes.includes(className))?.label ?? null;
}

/** 직접 입력할 때 고르는 부위 — API 의 Type 표기와 같다 */
export const AVATAR_PARTS = [
  '머리 아바타', '상의 아바타', '하의 아바타', '무기 아바타',
  '얼굴1 아바타', '얼굴2 아바타', '악기 아바타', '이동 효과', '기타',
] as const;

/** 착장(겉모습)에 해당하는 부위 — 이동 효과 같은 건 착용샷과 상관없어서 불러올 때 뺀다 */
export const WEAR_PARTS = [
  '무기 아바타', '머리 아바타', '상의 아바타', '하의 아바타',
  '얼굴1 아바타', '얼굴2 아바타', '악기 아바타',
] as const;

/**
 * 불러온 아바타 중 착용샷에 보여 줄 것 — 옷 부위만, 부위 순서대로.
 * 부위마다 실제로 보이는 것 하나: 덧입기(isInner=false)가 있으면 그것, 없으면 안쪽 아바타가 그대로 보인다
 * (예: 무기에 덧입기가 없으면 전설 무기 아바타가 겉모습이다).
 */
export function wearablePieces(all: AvatarPiece[]): AvatarPiece[] {
  const order = WEAR_PARTS as readonly string[];
  const byPart = new Map<string, AvatarPiece>();
  for (const p of all) {
    if (!order.includes(p.part)) continue;
    const cur = byPart.get(p.part);
    if (!cur || (cur.isInner && !p.isInner)) byPart.set(p.part, p);
  }
  return [...byPart.values()].sort((a, b) => order.indexOf(a.part) - order.indexOf(b.part));
}

/** 게임 염색 창에 붙여넣는 형태 — '#B5868A' → 'B5868A' */
export function hexForGame(hex: string): string {
  return hex.replace(/^#/, '');
}

/** 저장 전 정리 — 이름 없는 줄은 버리고, 색은 헥스로 맞추고, 색이 하나도 없는 염색 줄은 버린다 */
export function cleanPieces(pieces: AvatarPiece[]): AvatarPiece[] {
  return pieces
    .map((p) => ({
      part: p.part.trim(),
      name: p.name.trim(),
      grade: (p.grade || '').trim(),
      isInner: !!p.isInner,
      ...(p.icon ? { icon: p.icon } : {}),
      dyes: p.dyes
        .map((d, i) => ({
          area: d.area?.trim() || `부위${i + 1}`,
          base: normalizeHex(d.base) ?? '',
          pattern: normalizeHex(d.pattern) ?? '',
          gloss: (d.gloss || '').trim(),
        }))
        .filter((d) => d.base || d.pattern),
    }))
    .filter((p) => p.name);
}

/** API 응답 배열 → 저장용 아바타 목록. 응답이 배열이 아니면(없는 캐릭터 등) 빈 배열 */
export function parseAvatars(raw: unknown): AvatarPiece[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawAvatar[])
    .filter((a) => a && typeof a.Name === 'string')
    .map((a) => ({
      part: (a.Type ?? '').trim(),
      name: (a.Name ?? '').trim(),
      grade: (a.Grade ?? '').trim(),
      isInner: a.IsInner === true,
      dyes: parseDyes(a.Tooltip),
      ...(typeof a.Icon === 'string' && a.Icon.startsWith('https://') ? { icon: a.Icon } : {}),
    }));
}
