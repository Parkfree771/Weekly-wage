// 골드 획득 캐릭터(원정대당 최대 6명) 판정 — 웹·앱 동일 규칙 (앱 src/data/goldChars.ts 와 짝).
//
// 원정대에는 6명 넘게 등록할 수 있고, 그중 골드를 받는 캐릭터를 직접 6명까지 지정한다.
// 지정되지 않은 캐릭터는 어떤 레이드를 돌든 클리어 골드가 전부 귀속 골드로 잡힌다.
//
// 저장: characters[].gold (boolean). 이 필드가 하나도 없는 예전 원정대(6명 제한 시절)는
// 순서상 앞 6명을 골드 캐릭터로 본다 — 예전 데이터는 그대로 두고도 결과가 같다.

export const GOLD_CHAR_MAX = 6;

export function getGoldCharNames(chars: { name: string; gold?: boolean }[]): Set<string> {
  const hasFlag = chars.some(c => typeof c.gold === 'boolean');
  if (hasFlag) return new Set(chars.filter(c => c.gold === true).map(c => c.name).slice(0, GOLD_CHAR_MAX));
  return new Set(chars.slice(0, GOLD_CHAR_MAX).map(c => c.name));
}
