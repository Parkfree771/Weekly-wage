// 아크그리드 코어 아이콘은 슬롯(질서·혼돈 × 해·달·별)당 1개, 전체 6종뿐이다.
// use_13_96~98 = 질서 해·달·별, use_13_99~101 = 혼돈 해·달·별.
// 코어마다 90자짜리 CDN URL을 저장·전송하는 대신 이름에서 유도한다 (서버·클라 공용).

const CORE_NAME_RE = /^(질서|혼돈)의 (해|달|별) 코어/;
const CELESTIAL_OFFSET: Record<string, number> = { 해: 0, 달: 1, 별: 2 };

export function coreIconFor(name: string | null | undefined): string | null {
  if (!name) return null;
  const m = CORE_NAME_RE.exec(name);
  if (!m) return null;
  const idx = 96 + (m[1] === '혼돈' ? 3 : 0) + CELESTIAL_OFFSET[m[2]];
  return `https://cdn-lostark.game.onstove.com/efui_iconatlas/use/use_13_${idx}.png`;
}
