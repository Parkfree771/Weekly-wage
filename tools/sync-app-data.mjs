// 웹 단일 원본 테이블(data/rewardTable.ts) → RN 앱 데이터 파일 생성기.
//
//   node tools/sync-app-data.mjs          생성
//   node tools/sync-app-data.mjs --check  생성 결과가 현재 앱 파일과 같은지만 검사 (CI용)
//
// 앱은 별도 폴더/레포라 번들에 값을 들고 있어야 한다. 손으로 두 번 고치면 달력 정산이
// 웹·앱에서 어긋나므로, 앱 쪽 수치 파일은 항상 이 스크립트로 만든다.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 앱 레포 위치. 레포마다 체크아웃 경로가 달라서 후보를 순서대로 찾고,
// 없으면 LOALOGOL_APP_DIR 환경변수로 지정한다.
// (기존 '../loalogol-app' 만 보던 탓에 실제 폴더(Desktop/loalogolapp)를 못 찾아 동기화가 조용히 어긋났다)
const APP_DIR_CANDIDATES = [
  process.env.LOALOGOL_APP_DIR,
  path.resolve(ROOT, '..', '..', 'loalogolapp'),
  path.resolve(ROOT, '..', 'loalogolapp'),
  path.resolve(ROOT, '..', 'loalogol-app'),
].filter(Boolean);

const appDir = APP_DIR_CANDIDATES.find((d) => existsSync(path.join(d, 'src', 'data')));
if (!appDir) {
  throw new Error(
    `앱 레포를 찾지 못했습니다. LOALOGOL_APP_DIR 로 경로를 지정하세요.\n찾아본 곳:\n  ${APP_DIR_CANDIDATES.join('\n  ')}`,
  );
}
const APP_OUT = path.resolve(appDir, 'src', 'data', 'rewardTable.generated.ts');

// rewardTable.ts 는 import 가 없어 단독 컴파일이 된다
const tmp = mkdtempSync(path.join(tmpdir(), 'reward-sync-'));
try {
  // tsc 를 node 로 직접 돌린다 — npx/셸을 거치면 경로 공백·.cmd 문제로 깨진다
  const require = createRequire(import.meta.url);
  execFileSync(process.execPath, [
    require.resolve('typescript/bin/tsc'),
    path.join(ROOT, 'data', 'rewardTable.ts'),
    '--outDir', tmp, '--module', 'commonjs', '--target', 'es2019', '--skipLibCheck',
  ], { stdio: 'inherit' });

  const T = require(path.join(tmp, 'rewardTable.js'));

  const j = (v, _null, indent = 2) => JSON.stringify(v, null, indent);

  // ── 레이드: 앱 형식(평면 행 + 재료 키 객체, gold 는 유통 골드) ──
  const MAT_KEY = {
    '운명의 파괴석 결정': 'destructionStoneCrystal',
    '운명의 수호석 결정': 'guardianStoneCrystal',
    '위대한 운명의 돌파석': 'greatBreakthroughStone',
    '운명의 파괴석': 'destructionStone',
    '운명의 수호석': 'guardianStone',
    '운명의 돌파석': 'breakthroughStone',
    '운명의 파편': 'fragment',
    '고통의 가시': 'pulsatingThorn',
    '코어': 'core',
    '은총의 파편': 'graceFragment',
    // 완갑 승급(해방) 재료 2종 — 노말과 하드·나메가 서로 다른 재료라 키를 나눠 이름을 살린다.
    '사령의 잔영': 'wraithEcho',
    '죽음의 손': 'handOfDeath',
  };

  const toAppMats = (mats) => {
    const out = {};
    for (const m of mats) {
      const key = MAT_KEY[m.itemName];
      if (!key) throw new Error(`앱 재료 키 미정: ${m.itemName}`);
      out[key] = (out[key] ?? 0) + m.amount;
    }
    return out;
  };

  const raidRows = T.RAID_TABLE.flatMap((e) =>
    e.gates.map((g) => ({
      raidName: e.name,
      excelName: e.excelName,
      difficulty: e.difficulty,
      level: e.level,
      image: e.image,
      gate: g.gate,
      gold: g.gold - g.boundGold, // 앱 gold 는 유통 골드
      boundGold: g.boundGold,
      moreGold: g.moreGold,
      clear: toAppMats(g.clear),
      more: toAppMats(g.more),
    })),
  );

  // ── 콘텐츠 ──
  const tiers = ['1730', '1750'];
  const commonDefs = {};
  const commonMats = {};
  for (const c of T.EVENT_CONTENTS) {
    commonDefs[c.name] = Object.fromEntries(tiers.map((t) => [t, {
      name: c.name, shortName: c.shortName, image: c.image, color: c.color,
      days: c.days, gold: c.gold[t], level: Number(t),
    }]));
    commonMats[c.name] = Object.fromEntries(tiers.map((t) => [t,
      c.byTier[t].map((m) => ({ image: m.image, label: m.short, amount: m.amount })),
    ]));
  }

  const toDaily = (tierList) => tierList.map((t) => ({
    minLevel: t.minLevel,
    materials: t.materials.map((m) => ({ image: m.image, alt: m.short, daily: m.amount })),
  }));

  const body = `// 이 파일은 자동 생성됩니다. 직접 고치지 마세요.
// 원본: project4/data/rewardTable.ts — 값을 바꾸려면 거기서 고치고
// \`node tools/sync-app-data.mjs\` 를 다시 실행하세요.

export type RaidTableMaterials = {
  destructionStoneCrystal?: number;
  guardianStoneCrystal?: number;
  greatBreakthroughStone?: number;
  destructionStone?: number;
  guardianStone?: number;
  breakthroughStone?: number;
  fragment?: number;
  pulsatingThorn?: number;
  core?: number;
  graceFragment?: number;
  wraithEcho?: number;
  handOfDeath?: number;
};

export type RaidTableRow = {
  raidName: string;
  excelName: string;
  difficulty: string;
  level: number;
  image: string;       // 레이드 카드 이미지 (앱 weeklyData 의 Raid.image 로 그대로 쓴다)
  gate: number;
  gold: number;        // 유통 골드
  boundGold: number;   // 귀속 골드
  moreGold: number;    // 더보기 비용
  clear: RaidTableMaterials;
  more: RaidTableMaterials;
};

export const RAID_TABLE_MATERIAL_LABELS: Record<keyof RaidTableMaterials, string> = ${j({
    destructionStoneCrystal: '운명의 파괴석 결정',
    guardianStoneCrystal: '운명의 수호석 결정',
    greatBreakthroughStone: '위대한 운명의 돌파석',
    destructionStone: '운명의 파괴석',
    guardianStone: '운명의 수호석',
    breakthroughStone: '운명의 돌파석',
    fragment: '운명의 파편',
    pulsatingThorn: '고통의 가시',
    core: '코어',
    graceFragment: '은총의 파편',
    wraithEcho: '사령의 잔영',
    handOfDeath: '죽음의 손',
  }, null, 2)};

export const raidRewardTable: RaidTableRow[] = ${j(raidRows, null, 2)};

export function getRaidTableRow(raidName: string, gate: number): RaidTableRow | undefined {
  return raidRewardTable.find((r) => r.raidName === raidName && r.gate === gate);
}

// ─── 레이드 외 콘텐츠 ───

export type CommonContentDef = {
  name: string; shortName: string; image: string; color: string;
  days: number[]; gold: number; level: number;
};

export const COMMON_CONTENT_BY_LEVEL: Record<string, Record<string, CommonContentDef>> = ${j(commonDefs, null, 2)};

export type CommonMaterialReward = { image?: string; label: string; amount: number };

export const COMMON_CONTENT_MATERIALS_BY_LEVEL: Record<string, Record<string, CommonMaterialReward[]>> = ${j(commonMats, null, 2)};

export type SandReward = { gems: number; stones: number; lavaBreath: number; glacierBreath: number };

export const SAND_OF_TIME_REWARDS_1770: SandReward[] = ${j(T.SAND_TABLE['1770'], null, 2)};

export const SAND_OF_TIME_REWARDS_1750: SandReward[] = ${j(T.SAND_TABLE['1750'], null, 2)};

export const SAND_OF_TIME_REWARDS_1730: SandReward[] = ${j(T.SAND_TABLE['1730'], null, 2)};

export type DailyRewardDef = { minLevel: number; materials: { image: string; alt: string; daily: number }[] };

export const CHAOS_DAILY_REWARDS: DailyRewardDef[] = ${j(toDaily(T.RIFT_TIERS), null, 2)};

export const GUARDIAN_DAILY_REWARDS: DailyRewardDef[] = ${j(toDaily(T.GUARDIAN_TIERS), null, 2)};

export const CHAOS_TIER_LABELS: { minLevel: number; label: string }[] = ${j(
    T.RIFT_TIERS.map((t) => ({ minLevel: t.minLevel, label: t.label })), null, 2)};

export const GUARDIAN_TIER_LABELS: { minLevel: number; label: string }[] = ${j(
    T.GUARDIAN_TIERS.map((t) => ({ minLevel: t.minLevel, label: t.label })), null, 2)};

export const GUARDIAN_ROTATION = ${j(T.GUARDIAN_ROTATION, null, 2)};

export const GUARDIAN_FIXED = ${j(T.GUARDIAN_FIXED, null, 2)};

export const GUARDIAN_REF_WEEK = ${j(T.GUARDIAN_REF_WEEK)};

export const RAID_CARD_IMAGES: Record<string, string> = ${j(T.RAID_CARD_IMAGES, null, 2)};
`;

  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(APP_OUT, 'utf8'); } catch {}
    if (current.replace(/\r\n/g, '\n') !== body) {
      console.error('앱 데이터가 웹 원본과 다릅니다. `node tools/sync-app-data.mjs` 를 실행하세요.');
      process.exit(1);
    }
    console.log(`앱 데이터 최신 (레이드 ${raidRows.length}행)`);
  } else {
    writeFileSync(APP_OUT, body, 'utf8');
    console.log(`생성 완료: ${APP_OUT} (레이드 ${raidRows.length}행)`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
