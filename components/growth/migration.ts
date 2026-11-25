// 내 캐릭 이관 미리보기 — 지금 착용 장비(로아 API)를 2부 규칙으로 옮긴다.
// 출처: 2026-11-25 공식 공지 "로스트아크 2부 업데이트에 따른 주요 개편 사항 사전 안내"
//       (docs/season3-notice-2026-11-25/README.md 에 표 전부 옮겨 둠. 11-20 방송 정리는 임시였다)

import { itemLevelOf } from './growthData';

// ---------- API 응답 ----------
export interface ApiEquip { Type: string; Name: string; Icon: string; Grade: string; Tooltip: string; }
export interface ApiProfile { CharacterName: string; CharacterClassName: string; ItemAvgLevel: string; }

// ---------- 툴팁 읽기 ----------
type Tip = Record<string, { type?: string; value?: unknown } | null>;
const parseTip = (s: string): Tip => { try { return JSON.parse(s) as Tip; } catch { return {}; } };
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function titleOf(tip: Tip): { leftStr2?: string; qualityValue?: number } {
  return (tip.Element_001?.value ?? {}) as { leftStr2?: string; qualityValue?: number };
}
// "아이템 레벨 1785 (티어 4)" → 1785
function itemLevel(tip: Tip): number | null {
  const m = titleOf(tip).leftStr2?.match(/아이템 레벨 (\d+)/);
  return m ? Number(m[1]) : null;
}
// "아이템 티어 4" → 4
function tierOfItem(tip: Tip): number | null {
  const m = stripHtml(titleOf(tip).leftStr2 ?? '').match(/티어 (\d)/);
  return m ? Number(m[1]) : null;
}
// ItemPartBox 중 제목(Element_000)이 title 을 포함하는 칸의 본문(HTML)
function partBox(tip: Tip, title: string): string | null {
  for (const el of Object.values(tip)) {
    const v = el?.value as { Element_000?: unknown; Element_001?: unknown } | undefined;
    if (el?.type === 'ItemPartBox' && v && String(v.Element_000).includes(title)) return String(v.Element_001 ?? '');
  }
  return null;
}
// 거래 가능 횟수 — "거래 2회 가능" → 2, "거래 불가" → 0
function tradeOf(tip: Tip): number | null {
  const text = Object.values(tip)
    .filter(el => el?.type === 'SingleTextBox' || el?.type === 'MultiTextBox')
    .map(el => stripHtml(String(el?.value ?? '')))
    .join(' ');
  const m = text.match(/거래 (\d+)회 가능/);
  if (m) return Number(m[1]);
  return text.includes('거래 불가') ? 0 : null;
}
const plusN = (name: string) => Number(name.match(/^\+(\d+)/)?.[1] ?? 0);

// 연마 효과·팔찌 수치 글자색 → 상/중/하
export type Rank = '상' | '중' | '하';
function rankOfColor(html: string): Rank {
  const c = html.match(/COLOR='#?([0-9A-F]{6})'/i)?.[1]?.toUpperCase();
  return c === 'FE9600' ? '상' : c === 'CE43FC' ? '중' : '하';
}

// ---------- 장비 레벨 → 등급 · 연마 (공지 표 1) ----------
// 티어 4: 기존 레벨 "초과" 경계 → 이관 등급(GRADES 인덱스) · 연마. 장비 각각의 레벨 기준
export const LEVEL_TABLE: [number, number, number][] = [
  [1600, 0, 0], [1675, 0, 1], [1680, 0, 2], [1685, 0, 3], [1690, 0, 4],
  [1695, 1, 0], [1700, 1, 1], [1705, 1, 2], [1710, 1, 3], [1715, 1, 4],
  [1720, 2, 0], [1725, 2, 1], [1730, 2, 2], [1735, 2, 3], [1740, 2, 4],
  [1745, 3, 0], [1750, 3, 1], [1755, 3, 2], [1760, 3, 3], [1765, 3, 4],
  // 1770 초과부터 +15 보정
  [1770, 4, 2], [1775, 4, 3], [1780, 4, 4],
  [1785, 5, 0], [1790, 5, 2], [1795, 5, 3],
];
// 티어 1~3: 기존 레벨 "초과" 경계 → 이관 장비 이름 · 레벨 (연마는 전부 0)
export const LOW_LEVEL_TABLE: [number, string, number][] = [
  [50, '티어 1 고급', 100], [100, '티어 1 희귀', 150], [150, '티어 1 영웅', 200], [200, '티어 1 전설', 250],
  [250, '티어 2 일반', 600], [600, '티어 2 고급', 700], [700, '티어 2 희귀', 800], [800, '티어 2 영웅', 900], [900, '티어 2 전설', 1000],
  [1000, '티어 3 일반', 1200], [1200, '티어 3 고급', 1300], [1300, '티어 3 희귀', 1400], [1400, '티어 3 영웅', 1500], [1500, '티어 3 전설', 1600],
];
// low 가 있으면 티어 1~3 장비 (grade -2). 에스더 무기는 grade -1
export interface NewGear { grade: number; polish: number; level: number; low?: string; }
// 레벨이 걸리는 티어 4 표의 줄 번호 (1600 이하는 -1). 1800 넘는 레벨(에스더)은 맨 끝 줄 = 25강 무기 기준
export function levelRow(level: number | null): number {
  if (level == null || level <= 1600) return -1;
  let row = 0;
  LEVEL_TABLE.forEach((r, i) => { if (level > r[0]) row = i; });
  return row;
}
// 티어 1~3 표의 줄 번호 (해당 없으면 -1)
export function lowLevelRow(level: number | null): number {
  if (level == null || level <= LOW_LEVEL_TABLE[0][0] || level > 1600) return -1;
  let row = 0;
  LOW_LEVEL_TABLE.forEach((r, i) => { if (level > r[0]) row = i; });
  return row;
}
function gearOf(level: number | null): NewGear | null {
  const i = levelRow(level);
  if (i >= 0) {
    const [, grade, polish] = LEVEL_TABLE[i];
    return { grade, polish, level: itemLevelOf(grade, polish) };
  }
  const j = lowLevelRow(level);
  if (j < 0) return null;
  const [, low, lv] = LOW_LEVEL_TABLE[j];
  return { grade: -2, polish: 0, level: lv, low };
}

// ---------- 에스더 무기 (공지 표 2 · 3 · 4) ----------
// [진화, 엘라] → 기존 레벨 · 받는 엘라 단계 · 연마 · 레벨 · 무기 슬롯 재련 · 환급(에스더의 기운 · 로맨틱 재료 키트)
export interface EstherRow { from: number; ella: number; polish: number; level: number; refine: number; essence: number; kit: number; }
const er = (from: number, ella: number, polish: number, level: number, refine: number, essence: number, kit: number): EstherRow =>
  ({ from, ella, polish, level, refine, essence, kit });
// 줄 순서는 공지 표 그대로
export const ESTHER_TABLE: Record<string, EstherRow> = {
  '0-0': er(1100, 1, 0, 1100, 0, 0, 0),
  '1-0': er(1200, 1, 0, 1100, 0, 1, 10),
  '2-0': er(1300, 1, 0, 1100, 0, 3, 310),
  '3-0': er(1400, 1, 0, 1100, 0, 8, 810),
  '4-0': er(1500, 1, 0, 1100, 0, 18, 1810),
  '5-0': er(1600, 1, 0, 1100, 0, 28, 3310),
  '6-0': er(1625, 2, 0, 1625, 0, 20, 3000),
  '7-0': er(1635, 2, 0, 1625, 0, 40, 7000),
  '6-1': er(1650, 2, 0, 1625, 9, 40, 11500),
  '7-1': er(1665, 2, 0, 1625, 9, 60, 15500),
  '6-2': er(1675, 2, 0, 1625, 9, 60, 20000),
  '8-0': er(1645, 2, 0, 1625, 11, 70, 12000),
  '7-2': er(1695, 3, 0, 1735, 12, 20, 12000),
  '7-3': er(1785, 3, 0, 1735, 14, 20, 14500),
  '8-1': er(1680, 3, 0, 1735, 14, 30, 8500),
  '8-2': er(1715, 3, 0, 1735, 18, 50, 17000),
  '8-3': er(1775, 3, 0, 1735, 20, 50, 19500),
  '9-2': er(1745, 3, 0, 1735, 22, 80, 24000),
  '9-3': er(1800, 4, 0, 1840, 25, 20, 10500),
  '10-3': er(1830, 4, 5, 1865, 25, 0, 0),
};
export interface EstherResult { evo: number; ella: number; key: string; next: EstherRow | null; }
function estherOf(e: ApiEquip, tip: Tip): EstherResult {
  const evo = plusN(e.Name);
  const ella = Number(stripHtml(JSON.stringify(tip)).match(/엘라 부여 (\d) 단계/)?.[1] ?? 0);
  const key = `${evo}-${ella}`;
  return { evo, ella, key, next: ESTHER_TABLE[key] ?? null };
}

// ---------- 장신구 → 마력 주입 주문서 (공지 표 5 · 6) ----------
export interface AccRule { main: string[]; third: string[]; }
// 1,2옵션 / 3옵션 유효 옵션. '%' 가 붙은 이름은 퍼센트 옵션, 없으면 고정 수치 옵션
export const DEALER_RULE: Record<string, AccRule> = {
  목걸이: { main: ['추가 피해%', '적에게 주는 피해%'], third: ['공격력', '무기 공격력'] },
  귀걸이: { main: ['공격력%', '무기 공격력%'], third: ['공격력', '무기 공격력'] },
  반지: { main: ['치명타 적중률%', '치명타 피해%'], third: ['공격력', '무기 공격력'] },
};
export const SUPPORT_RULE: Record<string, AccRule> = {
  목걸이: { main: ['낙인력%', '게이지 획득량%'], third: ['무기 공격력', '최대 생명력'] },
  귀걸이: { main: ['무기 공격력%', '무기 공격력'], third: ['최대 생명력', '파티원 보호막 효과%', '파티원 회복 효과%'] },
  반지: { main: ['아군 공격력 강화 효과%', '아군 피해량 강화 효과%'], third: ['무기 공격력', '최대 생명력'] },
};
export interface PolishLine { name: string; value: string; rank: Rank; }
export interface AccResult {
  quality: number | null;
  grade: string;
  lines: PolishLine[];
  trade: number | null;       // 거래 가능 횟수 (0 = 거래 불가). 주문서가 그대로 이어받는다
  scroll: number | null;      // 주문서 등급 (1이 최고)
  pattern: string;            // 상상중 같은 판정
  role: '딜러' | '서폿' | null;
  reason?: string;            // 주문서가 아닌 이유
  reward?: string;            // 주문서 대신 받는 것
}
const RANK_ORDER: Rank[] = ['상', '중', '하'];
const rankIdx = (r?: Rank) => (r ? RANK_ORDER.indexOf(r) : 3);

function polishLines(tip: Tip): PolishLine[] {
  const html = partBox(tip, '연마 효과');
  if (!html) return [];
  return html.split(/<br>/i).map(seg => {
    const text = stripHtml(seg);
    const m = text.match(/^(.+?) \+([\d.,]+%?)$/);
    if (!m) return null;
    return { name: m[1], value: m[2], rank: rankOfColor(seg) };
  }).filter((l): l is PolishLine => l !== null);
}
const keyOf = (l: PolishLine) => (l.value.endsWith('%') ? `${l.name}%` : l.name);
// 서폿 목걸이 게이지 옵션은 클래스마다 이름 앞부분(세레나데·신앙·조화)이 달라 뒷부분으로 맞춘다
const hits = (l: PolishLine, names: string[]) =>
  names.some(n => keyOf(l) === n || (n === '게이지 획득량%' && keyOf(l).endsWith(n)));

// 1,2옵션 두 줄과 3옵션 한 줄의 상중하 → 패턴
function judge(lines: PolishLine[], rule: AccRule) {
  const main = lines.filter(l => hits(l, rule.main)).map(l => l.rank).sort((a, b) => rankIdx(a) - rankIdx(b));
  const third = lines.filter(l => hits(l, rule.third)).map(l => l.rank).sort((a, b) => rankIdx(a) - rankIdx(b))[0];
  return { a: main[0], b: main[1], third };
}
interface Pick { scroll: number; pattern: string; }
// 6등급은 실제 1,2옵션 상중하를 그대로 보여준다 (상 하나뿐이면 '상'). 3옵션만 있으면 '3옵션만'
const lowPattern = (a?: Rank, b?: Rank) => `${a ?? ''}${b ?? ''}` || '3옵션만';
// 유효 옵션이 하나도 없으면 null (= 주문서 대신 영롱한 보석 파편)
function dealerScroll(lines: PolishLine[], rule: AccRule): Pick | null {
  const { a, b, third } = judge(lines, rule);
  if (!a && !third) return null;
  if (a === '상' && b === '상') {
    if (third === '상') return { scroll: 1, pattern: '상상상' };
    if (third === '중') return { scroll: 2, pattern: '상상중' };
    return { scroll: 3, pattern: '상상' };
  }
  if (a === '상' && b === '중') return { scroll: 4, pattern: '상중' };
  if (a === '상' && b === '하') return { scroll: 5, pattern: '상하' };
  return { scroll: 6, pattern: lowPattern(a, b) };
}
// 서폿 귀걸이는 따로
function supportEarringScroll(lines: PolishLine[], rule: AccRule): Pick | null {
  const { a, b, third } = judge(lines, rule);
  if (!a && !third) return null;
  if (a === '상' && b === '상') {
    if (third === '상') {
      const hp = lines.some(l => keyOf(l) === '최대 생명력' && l.rank === '상');
      return hp ? { scroll: 2, pattern: '상상상(최대 생명력)' } : { scroll: 3, pattern: '상상상(보호막·회복)' };
    }
    if (third === '중') return { scroll: 4, pattern: '상상중' };
    return { scroll: 5, pattern: '상상' };
  }
  return { scroll: 6, pattern: lowPattern(a, b) };
}

export const SHARD = '영롱한 보석 파편';
function accOf(e: ApiEquip, tip: Tip): AccResult {
  const lines = polishLines(tip);
  const quality = titleOf(tip).qualityValue ?? null;
  const base: AccResult = { quality, grade: e.Grade, lines, trade: tradeOf(tip), scroll: null, pattern: '', role: null };
  if ((tierOfItem(tip) ?? 0) < 4) return { ...base, reason: '티어 3 이하', reward: '제거 (교체 없음)' };
  if (e.Grade !== '고대' && e.Grade !== '유물') return { ...base, reason: '고대 · 유물만 기준 있음' };
  if (quality == null || quality < 67) return { ...base, reason: '품질 67 미만', reward: SHARD };

  const part = e.Type;
  if (e.Grade === '고대') {
    const d = dealerScroll(lines, DEALER_RULE[part]);
    const s = part === '귀걸이' ? supportEarringScroll(lines, SUPPORT_RULE[part]) : dealerScroll(lines, SUPPORT_RULE[part]);
    // 딜러·서폿 둘 다 따져서 더 좋은 쪽
    if (s && (!d || s.scroll < d.scroll)) return { ...base, ...s, role: '서폿' };
    if (d) return { ...base, ...d, role: '딜러' };
    return { ...base, reason: '유효 옵션 없음', reward: SHARD };
  }
  // 유물은 서폿 목걸이 · 반지 상상만 5등급
  if (part !== '귀걸이') {
    const { a, b } = judge(lines, SUPPORT_RULE[part]);
    if (a === '상' && b === '상') return { ...base, scroll: 5, pattern: '상상', role: '서폿' };
  }
  return { ...base, reason: '유물은 서폿 목걸이 · 반지 상상만', reward: SHARD };
}

// ---------- 팔찌 → 인장 주문서 (공지 표 7 · 8) ----------
// 줄마다 티어만 매긴다. 1~21등급 점수표는 미공개.
export interface BraceletLine { text: string; rank: Rank; dealer: string | null; support: string | null; }
// 기준 말풍선에 보여줄 티어별 옵션 (공지 표 그대로, 문구만 짧게)
export const DEALER_TIER_OPTIONS: [string, string[]][] = [
  ['1티어', ['치명타 적중률 & 치명타 시 피해량', '치명타 피해 & 치명타 시 피해량', '추가 피해 & 악마 및 대악마 피해', '재사용 대기 시간 증가 & 적에게 주는 피해', '적에게 주는 피해 & 무력화 대상 피해']],
  ['2티어+', ['치명 / 특화 / 신속']],
  ['2티어', ['방향성 공격이 아닌 스킬 피해', '백어택 스킬 피해', '헤드어택 스킬 피해', '추가 피해', '적에게 주는 피해', '치명타 피해', '치명타 적중률']],
  ['3티어+', ['무기 공격력 & 생명력 50% 이상 무기 공격력', '무기 공격력 & 30초마다 120초 동안 무기 공격력']],
  ['3티어', ['무기 공격력', '공격 적중 시 매 초 무기 공격력 & 공격 및 이동 속도']],
  ['4티어', ['대상 방어력 감소 & 아군 공격력 강화', '대상 치명타 저항 감소 & 아군 공격력 강화', '대상 치명타 피해 저항 감소 & 아군 공격력 강화', '파티 보호 효과 대상 피해 증가 & 아군 공격력 강화']],
  ['5티어', ['힘 / 민첩 / 지능']],
];
export const SUPPORT_TIER_OPTIONS: [string, string[]][] = [
  ['1티어', ['대상 방어력 감소 & 아군 공격력 강화', '대상 치명타 저항 감소 & 아군 공격력 강화', '대상 치명타 피해 저항 감소 & 아군 공격력 강화', '파티 보호 효과 대상 피해 증가 & 아군 공격력 강화']],
  ['2티어', ['특화 / 신속', '아군 피해량 강화', '아군 공격력 강화']],
  ['3티어+', ['무기 공격력 & 생명력 50% 이상 무기 공격력', '무기 공격력 & 30초마다 120초 동안 무기 공격력']],
  ['3티어', ['무기 공격력', '공격 적중 시 매 초 무기 공격력 & 공격 및 이동 속도']],
  ['4티어', ['힘 / 민첩 / 지능']],
];

function tierOf(t: string): { dealer: string | null; support: string | null } {
  if (t.includes('아군 공격력 강화 효과') && /방어력을|치명타 저항을|치명타 피해 저항을|보호 효과/.test(t)) return { dealer: '4티어', support: '1티어' };
  if (/치명타로 적중 시 적에게 주는 피해|대악마|무력화 상태의 적에게 주는 피해/.test(t)) return { dealer: '1티어', support: null };
  if (t.includes('재사용 대기 시간') && t.includes('적에게 주는 피해')) return { dealer: '1티어', support: null };
  if (t.includes('무기 공격력')) {
    if (/생명력이 50% 이상|30초 마다/.test(t)) return { dealer: '3티어+', support: '3티어+' };
    return { dealer: '3티어', support: '3티어' };
  }
  if (/방향성 공격이 아닌|백어택|헤드어택|추가 피해|적에게 주는 피해|치명타 피해|치명타 적중률/.test(t)) return { dealer: '2티어', support: null };
  if (/아군 공격력 강화 효과|아군 피해량 강화 효과/.test(t)) return { dealer: null, support: '2티어' };
  const stat = t.match(/^(\S+) \+\d+$/)?.[1];
  if (stat === '치명') return { dealer: '2티어+', support: null };
  if (stat === '특화' || stat === '신속') return { dealer: '2티어+', support: '2티어' };
  if (stat === '힘' || stat === '민첩' || stat === '지능') return { dealer: '5티어', support: '4티어' };
  return { dealer: null, support: null };
}
function braceletLines(tip: Tip): BraceletLine[] {
  const html = partBox(tip, '팔찌 효과');
  if (!html) return [];
  // 줄마다 앞에 잠금/변경 아이콘이 붙는다. 이중 옵션은 아이콘 없이 <BR> 로 이어진다.
  return html.split(/<img[^>]*>/i).map(seg => {
    const text = stripHtml(seg.replace(/<BR>/gi, ' '));
    if (!text) return null;
    return { text, rank: rankOfColor(seg), ...tierOf(text) };
  }).filter((l): l is BraceletLine => l !== null);
}
// seal = 인장 주문서 / excluded = 딜러 클래스의 서폿 옵션 팔찌 / decompose = 효과 미부여 / removed = 티어 3
export type BraceletStatus = 'seal' | 'excluded' | 'decompose' | 'removed';
export interface BraceletResult { name: string; icon: string; grade: string; lines: BraceletLine[]; status: BraceletStatus; }
function braceletOf(e: ApiEquip, tip: Tip, className: string): BraceletResult {
  const lines = braceletLines(tip);
  const base = { name: e.Name, icon: e.Icon, grade: e.Grade, lines };
  if ((tierOfItem(tip) ?? 0) < 4) return { ...base, status: 'removed' };
  if (lines.length === 0) return { ...base, status: 'decompose' };
  // 딜러(서폿 가능 4클래스 외)는 서폿 쪽 점수만 있는 팔찌가 이관 대상에서 빠진다
  const supportOnly = lines.some(l => l.support) && !lines.some(l => l.dealer);
  if (!SUPPORT_CLASSES.includes(className) && supportOnly) return { ...base, status: 'excluded' };
  return { ...base, status: 'seal' };
}

// ---------- 어빌리티 스톤 → 각인 슬롯 (공지 표 9) ----------
export const DEALER_ENGRAVINGS = ['각성', '결투의 대가', '기습의 대가', '달인의 저력', '돌격대장', '마나 효율 증가', '바리케이드', '부러진 뼈', '속전속결', '슈퍼 차지', '시선 집중', '아드레날린', '안정된 상태', '약자 무시', '에테르 포식자', '예리한 둔기', '원한', '저주받은 인형', '정밀 단도', '질량 증가', '추진력', '타격의 대가'];
export const SUPPORT_ENGRAVINGS = ['각성', '구슬동자', '급소 타격', '마나의 흐름', '분쇄의 주먹', '위기 모면', '전문의', '정기 흡수', '중갑 착용', '최대 마나 증가', '폭발물 전문가'];
// 서포터가 될 수 있는 클래스 — 서폿 각인 조합 · 서폿 옵션 팔찌가 인정된다
export const SUPPORT_CLASSES = ['바드', '홀리나이트', '도화가', '발키리'];

// slots 개 칸이 level 단계, bonus = 8포인트의 추가 아이템
// reward = 각인 슬롯에 안 들어갈 때 받는 것 (유효하지 않은 조합 → 초월의 가루)
export interface StoneResult { engravings: { name: string; level: number }[]; points: number; valid: boolean; slots: number; level: number; bonus: boolean; reward?: string; }
function stoneOf(tip: Tip, className: string): StoneResult {
  const found: { name: string; level: number }[] = [];
  const group = Object.values(tip).find(el => el?.type === 'IndentStringGroup');
  for (const m of JSON.stringify(group?.value ?? '').matchAll(/\[(?:<[^>]+>)*([^<\]]+)(?:<[^>]+>)*\][^"]*?Lv\.(\d)/g)) {
    found.push({ name: m[1], level: Number(m[2]) });
  }
  // 세 줄 중 앞 두 줄이 증가 각인, 마지막이 감소 각인
  const engravings = found.slice(0, 2);
  const points = engravings.reduce((s, e) => s + e.level, 0);
  const names = engravings.map(e => e.name);
  const valid = engravings.length === 2 && (
    names.every(n => DEALER_ENGRAVINGS.includes(n)) ||
    (SUPPORT_CLASSES.includes(className) && names.every(n => SUPPORT_ENGRAVINGS.includes(n)))
  );
  const hi = Math.max(...engravings.map(e => e.level), 0);
  let slots = 0;
  let level = 0;
  if (valid) {
    if (points >= 7) [slots, level] = [5, 7];
    else if (points === 6) [slots, level] = [hi === 3 ? 4 : 3, 7];
    else if (points === 5) [slots, level] = [2, 7];
    else if (points === 4 && hi === 3) [slots, level] = [1, 5];
    else if (points === 4 && hi === 2) [slots, level] = [1, 3];
  }
  return { engravings, points, valid, slots, level, bonus: valid && points >= 8, reward: valid ? undefined : '초월의 가루' };
}

// ---------- 아래 시뮬 시작값 ----------
// 연마 탭: 칸마다 받는 장비 등급 · 연마 (에스더 무기는 따로) / 재련 탭: 칸마다 슬롯 재련 단계
export interface SimStart {
  name: string;
  polish: Record<string, { grade: number; polish: number }>;
  esther?: { ella: number; polish: number; level: number };
  refine: Record<string, number>;
}

// ---------- 전체 ----------
export type LeftKey = 'weapon' | 'wangap' | 'belt' | 'helmet' | 'shoulder' | 'chest' | 'pants' | 'gloves';
export type RightKey = 'necklace' | 'earring1' | 'earring2' | 'ring1' | 'ring2' | 'bracelet' | 'relic' | 'seal';

export interface LeftSlot {
  key: LeftKey;
  label: string;
  icon: string;
  now: { name: string; icon: string; grade: string; level: number | null; refine: number } | null;   // 지금 착용 장비
  gear: NewGear | null;          // 받는 장비
  gearFrom?: string;             // 받는 장비 기준이 다른 부위일 때 (무기 +25 · 1800)
  esther?: EstherResult;
  refine: number;                // 슬롯 재련 단계
}
export interface RightSlot {
  key: RightKey;
  label: string;
  icon: string;
  gear: NewGear | null;
  gearFrom: string;              // 어느 부위 레벨 기준으로 받는지 (투구 +22 · 1785)
  acc?: AccResult & { name: string; icon: string };
  bracelet?: BraceletResult;
  infuse: 'scroll' | 'seal' | 'fresh';
}
export interface Migration {
  name: string;
  className: string;
  nowLevel: number;
  newLevel: number | null;
  left: LeftSlot[];
  right: RightSlot[];
  stone: (StoneResult & { name: string; icon: string }) | null;
}

const ARMOR: { key: LeftKey; type: string; label: string; icon: string }[] = [
  { key: 'helmet', type: '투구', label: '투구', icon: 'helmet' },
  { key: 'shoulder', type: '어깨', label: '견갑', icon: 'shoulder' },
  { key: 'chest', type: '상의', label: '상의', icon: 'chest' },
  { key: 'pants', type: '하의', label: '하의', icon: 'pants' },
  { key: 'gloves', type: '장갑', label: '장갑', icon: 'gloves' },
];
// 방어구 5부위와 짝이 되는 장신구
const PAIR: Record<string, { key: RightKey; label: string; icon: string; nth: number; type: string }> = {
  helmet: { key: 'necklace', label: '목걸이', icon: 'necklace', nth: 0, type: '목걸이' },
  shoulder: { key: 'earring1', label: '귀걸이', icon: 'earring', nth: 0, type: '귀걸이' },
  chest: { key: 'earring2', label: '귀걸이', icon: 'earring', nth: 1, type: '귀걸이' },
  pants: { key: 'ring1', label: '반지', icon: 'ring', nth: 0, type: '반지' },
  gloves: { key: 'ring2', label: '반지', icon: 'ring', nth: 1, type: '반지' },
};

// 에스더 무기와 티어 1~3 장비는 시뮬 등급표(고급~고대)에 없어서 연마 시작값에서 뺀다. 에스더는 esther 로 따로 넘긴다
export function toSimStart(m: Migration): SimStart {
  const polish: SimStart['polish'] = {};
  for (const s of [...m.left, ...m.right]) {
    if (s.gear && s.gear.grade >= 0) polish[s.key] = { grade: s.gear.grade, polish: s.gear.polish };
  }
  const e = m.left[0].esther?.next;
  return {
    name: m.name,
    polish,
    esther: e ? { ella: e.ella, polish: e.polish, level: e.level } : undefined,
    refine: Object.fromEntries(m.left.map(s => [s.key, s.refine])),
  };
}

export function migrate(profile: ApiProfile, equipment: ApiEquip[]): Migration {
  const byType = (t: string) => equipment.filter(e => e.Type === t);
  const className = profile.CharacterClassName;

  // 무기
  const w = byType('무기')[0];
  const wTip = w ? parseTip(w.Tooltip) : {};
  const wLevel = w ? itemLevel(wTip) : null;
  const isEsther = w?.Grade === '에스더';
  const esther = w && isEsther ? estherOf(w, wTip) : undefined;
  // 완갑 · 허리띠 · 성물 · 인장 · 팔찌는 무기 레벨 기준 (1800 이상 에스더는 25강 무기 기준 = 표 맨 끝 줄)
  const byWeapon = gearOf(wLevel);
  // 무기 기준 칸에 보여줄 기준값
  const weaponBasis = !w ? '무기 없음'
    : isEsther ? `에스더 ${wLevel}${(wLevel ?? 0) >= 1800 ? ' (25강 무기로 계산)' : ''}`
    : `무기 +${plusN(w.Name)} · ${wLevel}`;
  const weaponGear: NewGear | null = esther
    ? (esther.next ? { grade: -1, polish: esther.next.polish, level: esther.next.level } : null)
    : byWeapon;

  const left: LeftSlot[] = [];
  left.push({
    key: 'weapon', label: '무기', icon: 'weapon',
    now: w ? { name: w.Name, icon: w.Icon, grade: w.Grade, level: wLevel, refine: isEsther ? 0 : plusN(w.Name) } : null,
    gear: weaponGear, esther,
    refine: esther ? esther.next?.refine ?? 0 : w ? plusN(w.Name) : 0,
  });
  const wg = byType('완갑')[0];
  left.push({
    key: 'wangap', label: '완갑', icon: 'wangap',
    now: wg ? { name: wg.Name, icon: wg.Icon, grade: wg.Grade, level: null, refine: plusN(wg.Name) } : null,
    gear: byWeapon, gearFrom: weaponBasis,
    refine: wg ? plusN(wg.Name) : 0,
  });
  left.push({ key: 'belt', label: '허리띠', icon: 'belt', now: null, gear: byWeapon, gearFrom: weaponBasis, refine: 0 });

  const right: RightSlot[] = [];
  for (const a of ARMOR) {
    const e = byType(a.type)[0];
    const tip = e ? parseTip(e.Tooltip) : {};
    const lv = e ? itemLevel(tip) : null;
    const gear = gearOf(lv);
    left.push({ key: a.key, label: a.label, icon: a.icon, now: e ? { name: e.Name, icon: e.Icon, grade: e.Grade, level: lv, refine: plusN(e.Name) } : null, gear, refine: e ? plusN(e.Name) : 0 });

    const p = PAIR[a.key];
    const accItem = byType(p.type)[p.nth];
    right.push({
      key: p.key, label: p.label, icon: p.icon, gear, gearFrom: e ? `${a.label} +${plusN(e.Name)} · ${lv}` : `${a.label} 없음`,
      acc: accItem ? { ...accOf(accItem, parseTip(accItem.Tooltip)), name: accItem.Name, icon: accItem.Icon } : undefined,
      infuse: 'scroll',
    });
  }

  const br = byType('팔찌')[0];
  right.push({ key: 'bracelet', label: '팔찌', icon: 'bracelet', gear: byWeapon, gearFrom: weaponBasis, infuse: 'fresh' });
  right.push({ key: 'relic', label: '성물', icon: 'relic', gear: byWeapon, gearFrom: weaponBasis, infuse: 'fresh' });
  right.push({
    key: 'seal', label: '인장', icon: 'seal', gear: byWeapon, gearFrom: weaponBasis, infuse: 'seal',
    bracelet: br ? braceletOf(br, parseTip(br.Tooltip), className) : undefined,
  });

  // 16칸 평균 (한 칸이라도 표 범위 밖이면 계산 안 함)
  const levels = [...left.map(s => s.gear?.level), ...right.map(s => s.gear?.level)];
  const newLevel = levels.every((l): l is number => l != null) ? levels.reduce((s, l) => s + l, 0) / levels.length : null;

  const st = byType('어빌리티 스톤')[0];
  return {
    name: profile.CharacterName,
    className,
    nowLevel: Number(String(profile.ItemAvgLevel).replace(/,/g, '')),
    newLevel,
    left,
    right,
    stone: st ? { ...stoneOf(parseTip(st.Tooltip), className), name: st.Name, icon: st.Icon } : null,
  };
}
