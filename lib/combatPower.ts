// 재련 단계에 따른 전투력 상승량 계산
//
// 전투력은 기본 공격력에 비례하고, 기본 공격력은 아래 공식으로 정해진다.
//   기본 공격력 = sqrt(힘민지 × 무기 공격력 / 6)
// 재련이 건드리는 건 힘민지와 무기 공격력 딱 둘뿐이라, 보석·아크패시브·연마·각인·
// 아크그리드 같은 나머지 곱연산 요소는 증감 비율을 낼 때 전부 약분돼 사라진다.
// 즉 그 요소들을 하나도 몰라도 상승량은 정확히 나온다.
//
// 실측 검증 (로펙 / 실제 게임 재련, 최대 오차 0.02%)
//   외계인파이터 장갑 11→12 (실게임)  10.30  → 10.30
//   구아바밤바아 투구 22→25          43.71  → 43.71
//   구아바밤바아 견갑 21→25          61.20  → 61.20
//   처어단자아  장갑 15→25          110.90 → 110.90
//   응미호     장갑 15→25          119.75 → 119.73
//   처어단자아  무기 15→25          498.69 → 498.69   (무기 공격력 경로)

/**
 * 계승 후(운명의 전율) 고대 장비의 단계별 주스탯.
 * 방어구는 힘/민첩/지능, 무기는 무기 공격력이며 인덱스가 강화 단계다.
 *
 * 출처: 캐릭터 16,288개 실측 표본. (부위, 단계) 조합마다 값이 단 하나뿐이고
 * 품질(70~100)·초월과 무관하게 동일했다. 계승 후 장비는 재련 단계만으로 스탯이 결정된다.
 */
export const SUCCESSION_MAIN_STAT: Record<string, (number | undefined)[]> = {
  무기: [, , , , , , , , , , , 167706, 172473, 177406, 182514, 187799, 193270, 198101, 203054, 208130, 213333, 218667, 224133, 229737, 235480, 241367],
  투구: [, , , , , , , , , , , 96801, 99554, 102404, 105353, 108406, 111565, 114358, 117218, 120150, 123155, 126236, 129393, 132629, 135946, 139346],
  견갑: [, , , , , , , , , , , 103023, 105954, 108987, 112126, 115375, 118738, 121709, 124754, 127874, 131072, 134351, 137711, 141155, 144686, 148304],
  상의: [, , , , , , , , , , , 77441, 79644, 81924, 84283, 86725, 89253, 91486, 93775, 96120, 98524, 100989, 103514, 106103, 108757, 111477],
  하의: [, , , , , , , , , , , 83664, 86043, 88506, 91056, 93693, 96424, 98838, 101310, 103844, 106441, 109104, 111833, 114630, 117497, 120435],
  장갑: [, , , , , , , , , , , 116161, 119465, 122885, 126425, 130087, 133879, 137229, 140662, 144180, 147786, 151483, 155271, 159155, 163136, 167216],
};

export const MIN_REFINE_LEVEL = 11;
export const MAX_REFINE_LEVEL = 25;

/**
 * 완갑 (등급, 단계)별 능력치. 완갑은 한 항목에서 네 가지를 동시에 준다.
 *   stat     주스탯 (sqrt 안)
 *   atk      무기 공격력 (sqrt 안)
 *   baFlat   기본 공격력 고정값 (sqrt 밖에 덧셈)
 *   baPct    기본 공격력 % (곱셈) — 등급으로만 정해진다
 *
 * 세 값이 서로 다른 단계에서 오르기 때문에 단계별로 전부 적어야 한다.
 * 출처: 라이브 API 툴팁 실측 (약 400캐릭터, 조합별 충돌 0건).
 *
 * 유물(15~20)·고대(20~25)는 표가 없다. 해방 재료 병목으로 2026-08-21 기준 서버에
 * 도달한 캐릭터가 없어서 실측이 불가능했다. 등장하면 여기에 채우면 된다.
 */
export type WangapStat = { stat: number; atk: number; baFlat: number; baPct: number };

export const WANGAP_STAT: Record<string, WangapStat> = {
  '영웅:0': { stat: 10500, atk: 3500, baFlat: 0, baPct: 0 },
  // 영웅 1은 머무는 유저가 없어 실측을 못 했다. 무기 공격력 구간이 주스탯 구간을 정확히
  // 한 단계 당긴 형태(경계 3·6·8·11·13 = 주스탯 경계 4·7·9·12·14 − 1)라 5350으로 추정.
  '영웅:1': { stat: 10500, atk: 5350, baFlat: 0, baPct: 0 },
  '영웅:2': { stat: 16500, atk: 5350, baFlat: 0, baPct: 0 },
  '영웅:3': { stat: 16500, atk: 7210, baFlat: 0, baPct: 0 },
  '영웅:4': { stat: 22530, atk: 7210, baFlat: 0, baPct: 0 },
  '영웅:5': { stat: 22530, atk: 7210, baFlat: 850, baPct: 0 },
  '영웅:6': { stat: 22530, atk: 9077, baFlat: 850, baPct: 0 },
  '영웅:7': { stat: 28608, atk: 9077, baFlat: 850, baPct: 0 },
  '영웅:8': { stat: 28608, atk: 10969, baFlat: 850, baPct: 0 },
  '영웅:9': { stat: 34746, atk: 10969, baFlat: 850, baPct: 0 },
  '영웅:10': { stat: 34746, atk: 10969, baFlat: 2030, baPct: 0 },
  // 해방으로 전설이 되면 단계가 그대로여도 기본 공격력 %가 붙는다 (영웅 10 → 전설 10)
  '전설:10': { stat: 34746, atk: 10969, baFlat: 2030, baPct: 1 },
  '전설:11': { stat: 34746, atk: 12873, baFlat: 2030, baPct: 1 },
  '전설:12': { stat: 40962, atk: 12873, baFlat: 2030, baPct: 1 },
  '전설:13': { stat: 40962, atk: 14817, baFlat: 2030, baPct: 1 },
  '전설:14': { stat: 47268, atk: 14817, baFlat: 2030, baPct: 1 },
  '전설:15': { stat: 47268, atk: 14817, baFlat: 3690, baPct: 1 },
};

/** 등급별 강화 구간 상한 (lib/wangapData 의 WANGAP_GRADE_RANGES 와 같은 값) */
const WANGAP_GRADE_MAX: [string, number][] = [['영웅', 10], ['전설', 15], ['유물', 20], ['고대', 25]];

/** 현재 등급에서 목표 단계까지 갔을 때의 등급 (상한을 넘으면 해방으로 승급한다) */
export function wangapGradeAt(currentGrade: string, targetLevel: number): string {
  let index = WANGAP_GRADE_MAX.findIndex(([g]) => g === currentGrade);
  if (index < 0) return currentGrade;
  while (index < WANGAP_GRADE_MAX.length - 1 && targetLevel > WANGAP_GRADE_MAX[index][1]) index += 1;
  return WANGAP_GRADE_MAX[index][0];
}

export function getWangapStat(grade: string, level: number): WangapStat | null {
  return WANGAP_STAT[`${grade}:${level}`] ?? null;
}

/**
 * 장비·아바타 어디에도 안 잡히는 고정 힘.
 * 클래스·스펙·아바타%가 전부 다른 캐릭터 4명에서 동일하게 성립해 상수로 확정했다.
 * 실측 5건 최소제곱 피팅값.
 */
const HIDDEN_STAT = 2067;

export type CombatPowerBase = {
  /** 현재 전투력 (ArmoryProfile.CombatPower) */
  combatPower: number;
  /** 장비 전체(방어구·완갑·악세·팔찌)의 주스탯 합 */
  equipStat: number;
  /** 무기 공격력 고정값 합 (무기 + 완갑 + 팔찌 등) */
  weaponAtk: number;
  /** 연마 등에서 오는 무기 공격력 % 합 */
  weaponAtkPct: number;
  /** 기본 공격력에 직접 더해지는 고정값 (완갑). sqrt 바깥이라 약분되지 않는다 */
  baseAtkFlat: number;
  /** 기본 공격력 % 합 (장비 + 보석). 완갑 등급이 바뀔 때만 필요하다 */
  baseAtkPct: number;
  /** 아바타 주스탯 % 합. baseAtkFlat이 0이면 결과에 영향 없음 */
  avatarStatPct: number;
};

/** 재련으로 늘어나는 값들. 완갑이 아니면 stat 또는 weaponAtk 하나만 채워진다 */
export type StatDelta = {
  stat: number;
  weaponAtk: number;
  baseAtkFlat: number;
  baseAtkPct: number;
};

export const EMPTY_DELTA: StatDelta = { stat: 0, weaponAtk: 0, baseAtkFlat: 0, baseAtkPct: 0 };

export function addDelta(a: StatDelta, b: StatDelta): StatDelta {
  return {
    stat: a.stat + b.stat,
    weaponAtk: a.weaponAtk + b.weaponAtk,
    baseAtkFlat: a.baseAtkFlat + b.baseAtkFlat,
    baseAtkPct: a.baseAtkPct + b.baseAtkPct,
  };
}

type TooltipItem = { Type?: string; Name?: string; Tooltip?: string };

/** 툴팁 JSON을 문자열 하나로 눌러 편다 (HTML 태그 제거) */
function flattenTooltip(raw: string | undefined): string {
  if (!raw) return '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw.replace(/<[^>]*>/g, '');
  }
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (node == null) return;
    if (typeof node === 'string') {
      out.push(node.replace(/<[^>]*>/g, ''));
      return;
    }
    if (typeof node === 'object') {
      for (const key of Object.keys(node as Record<string, unknown>)) {
        walk((node as Record<string, unknown>)[key]);
      }
    }
  };
  walk(parsed);
  return out.join(' ');
}

const toNumber = (s: string) => parseInt(s.replace(/,/g, ''), 10);

/** "옵션 +12.34%" 형태를 모두 합산 */
function sumPercent(blob: string, label: string): number {
  let total = 0;
  for (const m of blob.matchAll(new RegExp(`${label} \\+([\\d.]+)%`, 'g'))) {
    total += parseFloat(m[1]);
  }
  return total;
}

/** "옵션 +1234" 형태의 첫 고정값. %옵션을 먼저 지워서 "+1.80%"의 1을 집지 않게 한다 */
function firstFlat(blob: string, label: string): number {
  const stripped = blob.replace(/\+[\d.]+%/g, ' ');
  const m = stripped.match(new RegExp(`${label} \\+(\\d[\\d,]*)`));
  return m ? toNumber(m[1]) : 0;
}

/**
 * 장비/프로필/아바타 응답에서 전투력 계산에 필요한 값만 추출한다.
 * 전투력이나 장비를 못 읽으면 null.
 */
export function parseCombatPowerBase(
  equipment: TooltipItem[] | undefined,
  profile: { CombatPower?: string } | undefined,
  avatars?: TooltipItem[],
  gems?: unknown,
): CombatPowerBase | null {
  const cpRaw = profile?.CombatPower;
  if (!cpRaw || !Array.isArray(equipment)) return null;
  const combatPower = parseFloat(String(cpRaw).replace(/,/g, ''));
  if (!isFinite(combatPower) || combatPower <= 0) return null;

  let equipStat = 0;
  let weaponAtk = 0;
  let weaponAtkPct = 0;
  let baseAtkFlat = 0;
  let baseAtkPct = 0;

  for (const item of equipment) {
    const blob = flattenTooltip(item.Tooltip);
    if (!blob) continue;
    // 악세는 힘/민첩/지능을 셋 다 같은 값으로 적어두므로 먼저 잡히는 하나만 쓰면 된다
    equipStat += firstFlat(blob, '힘') || firstFlat(blob, '민첩') || firstFlat(blob, '지능');
    weaponAtk += firstFlat(blob, '무기 공격력');
    weaponAtkPct += sumPercent(blob, '무기 공격력');
    baseAtkFlat += firstFlat(blob, '기본 공격력');
    baseAtkPct += sumPercent(blob, '기본 공격력');
  }

  // 보석은 "기본 공격력 총합 : 10.40%" 한 줄로 합계를 알려준다
  if (gems) {
    const gemMatch = JSON.stringify(gems).replace(/<[^>]*>/g, '').match(/기본 공격력 총합\s*:\s*([\d.]+)%/);
    if (gemMatch) baseAtkPct += parseFloat(gemMatch[1]);
  }

  let avatarStatPct = 0;
  for (const item of avatars ?? []) {
    const blob = flattenTooltip(item.Tooltip);
    const m = blob.match(/(?:힘|민첩|지능) \+([\d.]+)%/);
    if (m) avatarStatPct += parseFloat(m[1]);
  }

  if (equipStat <= 0 || weaponAtk <= 0) return null;
  return { combatPower, equipStat, weaponAtk, weaponAtkPct, baseAtkFlat, baseAtkPct, avatarStatPct };
}

/** 기본 공격력의 sqrt 부분 */
function baseAtkCore(base: CombatPowerBase, delta: StatDelta): number {
  const stat = (base.equipStat + delta.stat + HIDDEN_STAT) * (1 + base.avatarStatPct / 100);
  const atk = (base.weaponAtk + delta.weaponAtk) * (1 + base.weaponAtkPct / 100);
  return Math.sqrt((stat * atk) / 6);
}

/** 기본 공격력 전체 = (sqrt 부분 + 고정값) × (1 + 기본공격력%) */
function baseAtkTotal(base: CombatPowerBase, delta: StatDelta): number {
  return (baseAtkCore(base, delta) + base.baseAtkFlat + delta.baseAtkFlat)
    * (1 + (base.baseAtkPct + delta.baseAtkPct) / 100);
}

/**
 * delta 만큼 늘었을 때의 전투력 상승량.
 * 전투력은 기본 공격력에 비례하므로 그 비율이 곧 전투력 비율이다.
 * 주스탯·무기 공격력만 움직이면 기본공격력%는 약분되지만, 완갑은 등급이 바뀌면서
 * 기본공격력 고정값과 %까지 같이 움직여서 약분되지 않는다.
 */
export function calcCombatPowerGain(base: CombatPowerBase, delta: StatDelta): number {
  if (!delta.stat && !delta.weaponAtk && !delta.baseAtkFlat && !delta.baseAtkPct) return 0;
  const before = baseAtkTotal(base, EMPTY_DELTA);
  const after = baseAtkTotal(base, delta);
  return (base.combatPower * (after - before)) / before;
}

/** 기준 상태를 delta 만큼 옮긴 새 기준 (시작 단계를 직접 조정했을 때 쓴다) */
export function shiftCombatPowerBase(base: CombatPowerBase, delta: StatDelta): CombatPowerBase {
  if (!delta.stat && !delta.weaponAtk && !delta.baseAtkFlat && !delta.baseAtkPct) return base;
  return {
    ...base,
    combatPower: base.combatPower + calcCombatPowerGain(base, delta),
    equipStat: base.equipStat + delta.stat,
    weaponAtk: base.weaponAtk + delta.weaponAtk,
    baseAtkFlat: base.baseAtkFlat + delta.baseAtkFlat,
    baseAtkPct: base.baseAtkPct + delta.baseAtkPct,
  };
}

/** 해당 부위·단계가 전투력 계산 대상인지 (계승 후 장비, 11~25단계) */
export function isCombatPowerSupported(name: string, level: number): boolean {
  const table = SUCCESSION_MAIN_STAT[name];
  return !!table && level >= MIN_REFINE_LEVEL && level <= MAX_REFINE_LEVEL && table[level] != null;
}

/** from → to 단계로 갈 때의 주스탯(무기는 무기 공격력) 증가량 */
export function mainStatDelta(name: string, from: number, to: number): number {
  const table = SUCCESSION_MAIN_STAT[name];
  if (!table) return 0;
  const a = table[from];
  const b = table[to];
  if (a == null || b == null) return 0;
  return b - a;
}
