// 아크그리드 코어 번호(1·2·3) 계산 로직
// ────────────────────────────────────────────────────────────
// data/arkgrid-core-order.ts 의 순서 데이터를 이용해
// "질서의 해 코어 : 피니셔" 같은 API 코어명을 번호로 변환한다.
//   - 스펙 id는 resolveSpecIcon()이 돌려주는 id(= class-spec-icon SPEC_RULES의 withId/elseId)와 동일.
//   - 질서 코어만 번호가 있다. 혼돈(공용)·미매칭은 null.

import { ORDER_CORE_OPTIONS, type CelestialCores } from '@/data/arkgrid-core-order';

export type Celestial = '해' | '달' | '별';

export type ParsedCoreName = {
  faction: '질서' | '혼돈' | null;
  celestial: Celestial | null;
  option: string; // " : " 뒤 옵션명 (없으면 전체)
};

/** "질서의 해 코어 : 피니셔" → { faction:'질서', celestial:'해', option:'피니셔' } */
export function parseCoreName(fullName: string | null | undefined): ParsedCoreName {
  const s = (fullName || '').trim();
  const faction: ParsedCoreName['faction'] =
    s.includes('질서') ? '질서' : s.includes('혼돈') ? '혼돈' : null;
  const celestial: Celestial | null =
    s.includes('해 코어') ? '해' : s.includes('달 코어') ? '달' : s.includes('별 코어') ? '별' : null;
  const idx = s.indexOf(' : ');
  const option = (idx >= 0 ? s.slice(idx + 3) : s).trim();
  return { faction, celestial, option };
}

/**
 * (직업, 스펙 id, 코어 전체 이름) → 코어 번호(1·2·3). 질서·매칭 성공 시에만 숫자, 그 외 null.
 * 표기 변형(끝 공백 등)을 흡수하도록 trim 비교.
 */
export function coreNumberFor(
  className: string | null | undefined,
  specId: string | null | undefined,
  fullCoreName: string | null | undefined
): number | null {
  if (!className || !specId) return null;
  const { faction, celestial, option } = parseCoreName(fullCoreName);
  if (faction !== '질서' || !celestial || !option) return null;
  const specData: CelestialCores | undefined = ORDER_CORE_OPTIONS[className]?.[specId];
  if (!specData) return null;
  const arr = specData[celestial];
  const i = arr.findIndex(o => o.trim() === option);
  return i >= 0 ? i + 1 : null;
}

/**
 * 질서 해·달·별 조합 코드(예: "121"). 세 코어 모두 매칭돼야 반환, 하나라도 없으면 null.
 * cores: 코어 배열(각 { name }). 스펙 id는 판별 결과.
 */
export function orderCoreCode(
  className: string | null | undefined,
  specId: string | null | undefined,
  cores: { name: string }[] | null | undefined
): string | null {
  if (!className || !specId || !Array.isArray(cores)) return null;
  const digit: Record<Celestial, number | null> = { 해: null, 달: null, 별: null };
  for (const c of cores) {
    const { faction, celestial } = parseCoreName(c?.name);
    if (faction !== '질서' || !celestial) continue;
    if (digit[celestial] == null) digit[celestial] = coreNumberFor(className, specId, c?.name);
  }
  if (digit.해 == null || digit.달 == null || digit.별 == null) return null;
  return `${digit.해}${digit.달}${digit.별}`;
}
