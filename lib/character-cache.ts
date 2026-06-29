import { sql } from './neon';
import type { CharacterData } from './characterData';
import { resolveSpecIcon, specFilterFor, SUPPORT_SPEC_RULES } from './class-spec-icon';

// 칭호 필터 최소 아이템레벨. 칭호는 한 번 획득하면 저렙 부캐도 달 수 있어
// 통계가 오염되므로, 아래 칭호로 필터할 때만 이 레벨 이상으로 집계한다.
const TITLE_MIN_ITEM_LEVEL = 1770;
const TITLES_REQUIRE_MIN_LEVEL = new Set<string>(['혹한의 군주', '홍염의 군주']);

// arkPassive 깨달음 효과 배열 (없거나 비배열이면 빈 배열) — 스펙/역할 판별 공용
const ENL_ARR = `jsonb_array_elements(
  CASE WHEN jsonb_typeof(data->'arkPassive'->'effects') = 'array'
       THEN data->'arkPassive'->'effects' ELSE '[]'::jsonb END)`;

// 서포터(역할) 판별 SQL. params에 className/sig 패턴을 push하고 boolean 표현식을 반환.
// 서포터 = 4직업 각각의 시그니처 깨달음 노드를 가진 캐릭터. 딜러 = NOT 서포터.
function supportRoleExpr(params: any[]): string {
  const parts = SUPPORT_SPEC_RULES.map(r => {
    params.push(r.className);
    const ci = params.length;
    params.push(`%${r.sig}%`);
    const si = params.length;
    return `(class_name = $${ci} AND EXISTS (SELECT 1 FROM ${ENL_ARR} AS ee
       WHERE ee->>'category' = '깨달음' AND ee->>'name' LIKE $${si}))`;
  });
  return `(${parts.join(' OR ')})`;
}

export type CoreData = {
  name: string;
  icon: string | null;
  grade: string | null;
  point: number;
};

export type TitleHistoryEntry = {
  title: string;
  firstSeenAt: string;
};

// 누적 대상 칭호 (정확 매칭)
const ACCUMULATED_TITLES_EXACT = new Set<string>([
  '혹한의 군주',
  '홍염의 군주',
  '심연의 군주',
  '돌로리스',
  '이클립스',
  '에스더의 결속자',
  '에스더의 후계자',
]);

// 누적 대상 칭호 (포함 매칭) - "카멘 the 1st", "카제로스 the 2nd" 등 시리즈
const ACCUMULATED_TITLES_CONTAINS = ['카멘', '카제로스'];

// API 응답의 Title은 <img ...> 접두어가 붙는 경우가 있음 → 순수 텍스트만 추출
export function normalizeTitle(rawTitle: string | null | undefined): string {
  if (!rawTitle) return '';
  return rawTitle.replace(/<[^>]*>/g, '').trim();
}

export function isAccumulatedTitle(cleanTitle: string): boolean {
  if (!cleanTitle) return false;
  if (ACCUMULATED_TITLES_EXACT.has(cleanTitle)) return true;
  return ACCUMULATED_TITLES_CONTAINS.some(k => cleanTitle.includes(k));
}

// 인덱스 컬럼 추출 (파싱 결과 CharacterData 기반)
function extractIndexFields(parsed: CharacterData) {
  const p = parsed.profile;
  const cores: CoreData[] = (parsed.arkGrid?.cores || []).map(c => ({
    name: c.name || '',
    icon: c.icon || null,
    grade: c.grade || null,
    point: typeof c.point === 'number' ? c.point : 0,
  }));

  // 호환용 단일 코어 컬럼은 그대로 유지 (기존 컬럼)
  const mainCoreIcon: string | null = cores[0]?.icon || null;
  const mainCoreGrade: string | null = cores[0]?.grade || null;

  return {
    className: p.className || '',
    combatPower: isFinite(p.combatPower) ? p.combatPower : 0,
    itemLevel: isFinite(p.itemLevel) ? p.itemLevel : 0,
    characterImage: p.characterImage || null,
    serverName: p.serverName || null,
    guildName: p.guildName || null,
    mainCoreIcon,
    mainCoreGrade,
    cores,
    equippedTitle: p.title || null,
  };
}

export interface CachedCharacter {
  data: any;
  fetchedAt: string;
  updatedAt: string;
  titlesHistory: TitleHistoryEntry[];
}

export async function getCharacterFromDb(characterName: string): Promise<CachedCharacter | null> {
  const rows = await sql`
    SELECT data, fetched_at, updated_at, titles_history
    FROM characters
    WHERE character_name = ${characterName}
    LIMIT 1
  ` as any[];
  if (rows.length === 0) return null;
  return {
    data: rows[0].data,
    fetchedAt: rows[0].fetched_at,
    updatedAt: rows[0].updated_at,
    titlesHistory: Array.isArray(rows[0].titles_history) ? rows[0].titles_history : [],
  };
}

export async function getTitlesHistory(characterName: string): Promise<TitleHistoryEntry[]> {
  const rows = await sql`
    SELECT titles_history FROM characters WHERE character_name = ${characterName} LIMIT 1
  ` as any[];
  if (rows.length === 0) return [];
  return Array.isArray(rows[0].titles_history) ? rows[0].titles_history : [];
}

/**
 * 파싱된 CharacterData를 그대로 data 컬럼에 저장.
 * 기존: 로아 API 원본 raw → 클라가 매번 parseCharacterData
 * 변경: 서버에서 한 번 parse → 결과만 저장 (스토리지 70~80% 절약)
 */
export async function upsertCharacter(characterName: string, parsed: CharacterData): Promise<void> {
  const f = extractIndexFields(parsed);

  // 기존 history 읽어서 매칭 칭호일 때만 누적 (중복 제거)
  let nextHistory: TitleHistoryEntry[] = [];
  const existing = await sql`
    SELECT titles_history FROM characters WHERE character_name = ${characterName} LIMIT 1
  ` as any[];
  if (existing.length > 0 && Array.isArray(existing[0].titles_history)) {
    nextHistory = existing[0].titles_history as TitleHistoryEntry[];
  }
  if (f.equippedTitle && isAccumulatedTitle(f.equippedTitle)) {
    if (!nextHistory.some(h => h.title === f.equippedTitle)) {
      nextHistory = [...nextHistory, { title: f.equippedTitle, firstSeenAt: new Date().toISOString() }];
    }
  }

  // titlesHistory 필드는 다른 컬럼으로 별도 관리되므로 data에서 제외
  const { titlesHistory: _t, ...dataToStore } = parsed;

  await sql`
    INSERT INTO characters (
      character_name, class_name, combat_power, item_level,
      character_image, server_name, guild_name,
      main_core_icon, main_core_grade, cores,
      equipped_title, titles_history,
      data, fetched_at, updated_at
    )
    VALUES (
      ${characterName}, ${f.className}, ${f.combatPower}, ${f.itemLevel},
      ${f.characterImage}, ${f.serverName}, ${f.guildName},
      ${f.mainCoreIcon}, ${f.mainCoreGrade}, ${JSON.stringify(f.cores)}::jsonb,
      ${f.equippedTitle}, ${JSON.stringify(nextHistory)}::jsonb,
      ${JSON.stringify(dataToStore)}::jsonb, NOW(), NOW()
    )
    ON CONFLICT (character_name) DO UPDATE SET
      class_name      = EXCLUDED.class_name,
      combat_power    = EXCLUDED.combat_power,
      item_level      = EXCLUDED.item_level,
      character_image = EXCLUDED.character_image,
      server_name     = EXCLUDED.server_name,
      guild_name      = EXCLUDED.guild_name,
      main_core_icon  = EXCLUDED.main_core_icon,
      main_core_grade = EXCLUDED.main_core_grade,
      cores           = EXCLUDED.cores,
      equipped_title  = EXCLUDED.equipped_title,
      titles_history  = EXCLUDED.titles_history,
      data            = EXCLUDED.data,
      fetched_at      = NOW(),
      updated_at      = NOW()
  `;
}

/** 저장된 data가 파싱 결과 형식인지 검사 (구 raw 캐시 자동 무효화용) */
export function isParsedCacheShape(data: any): boolean {
  // 파싱 결과: profile.characterName (camelCase) 존재
  // 구 raw:   profile.CharacterName (PascalCase)
  return !!(data && data.profile && typeof data.profile.characterName === 'string');
}

export type RankingSortBy = 'combat_power' | 'item_level';

export interface RankingEntry {
  characterName: string;
  className: string;
  combatPower: number;
  itemLevel: number;
  characterImage: string | null;
  serverName: string | null;
  cores: CoreData[];
  equippedTitle: string | null;
  fetchedAt: string;
  /** 깨달음 기반 스펙 아이콘 (판별 불가 시 null) */
  specId: string | null;
  specName: string | null;
  specIcon: string | null;
}

export interface ListRankingOptions {
  className?: string;
  /** 칭호 필터 — 누적 칭호(titles_history)에 이 문자열이 포함된 적 있는 캐릭터만 (정확/시리즈 둘 다 매칭) */
  titleQuery?: string;
  /** 고대 코어 필터 — cores 중 grade='고대'인 개수가 정확히 이 값(0~6)인 캐릭터만 */
  ancientCount?: number;
  /** 스펙 필터 — 스펙 id(예: "디트 분망"). 해당 직업 + 깨달음 시그니처로 판별된 캐릭터만 */
  specId?: string;
  /** 역할 필터 — 'support'(바드/발키리/홀나/도화가 서포터 스펙) | 'dealer'(그 외 전부) */
  role?: 'dealer' | 'support';
  sortBy?: RankingSortBy;
  /** 정렬 방향. 기본 desc(내림차순) */
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// 누적 칭호 매칭식: titles_history(jsonb 배열, 원소 { title, firstSeenAt }) 안에
// 패턴($paramIdx)과 ILIKE로 일치하는 칭호가 하나라도 있으면 true.
// → "지금 착용" 아니라 "한 번이라도 단 적 있는" 누적 기준. null/비배열은 빈 배열로 안전 처리.
function titlesHistoryMatchExpr(paramIdx: number): string {
  return `EXISTS (SELECT 1 FROM jsonb_array_elements(`
    + `CASE WHEN jsonb_typeof(titles_history) = 'array' THEN titles_history ELSE '[]'::jsonb END`
    + `) AS th WHERE th->>'title' ILIKE $${paramIdx})`;
}

export async function listRanking(opts: ListRankingOptions = {}): Promise<RankingEntry[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sortBy: RankingSortBy = opts.sortBy === 'item_level' ? 'item_level' : 'combat_power';
  const sortDir = opts.sortDir === 'asc' ? 'ASC' : 'DESC';
  const className = opts.className?.trim() || null;
  const titleQuery = opts.titleQuery?.trim() || null;
  const titlePattern = titleQuery ? `%${titleQuery}%` : null;
  const ancientCount =
    typeof opts.ancientCount === 'number' && opts.ancientCount >= 0 && opts.ancientCount <= 6
      ? Math.floor(opts.ancientCount)
      : null;

  // 동적 WHERE 조립 — $1, $2… placeholder + 파라미터 배열로 sql.query 호출
  const conditions: string[] = [];
  const params: any[] = [];
  if (className) {
    params.push(className);
    conditions.push(`class_name = $${params.length}`);
  }
  if (titlePattern) {
    params.push(titlePattern);
    // 누적 칭호(titles_history) 기준 매칭. 혹한/홍염의 군주만 부캐 오염 방지를 위해
    // 아이템레벨 floor 유지 (1770은 상수 → 인터폴레이션 안전).
    const titleFloor = titleQuery && TITLES_REQUIRE_MIN_LEVEL.has(titleQuery)
      ? ` AND item_level >= ${TITLE_MIN_ITEM_LEVEL}` : '';
    conditions.push(`${titlesHistoryMatchExpr(params.length)}${titleFloor}`);
  }
  if (ancientCount !== null) {
    params.push(ancientCount);
    conditions.push(
      `(SELECT count(*) FROM jsonb_array_elements(cores) AS e WHERE e->>'grade' = '고대') = $${params.length}`
    );
  }
  // 스펙 필터: 직업 + 깨달음 시그니처 노드 유무. resolveSpecIcon과 동일 의미로 매칭.
  const specFilter = specFilterFor(opts.specId);
  if (specFilter) {
    params.push(specFilter.className);
    conditions.push(`class_name = $${params.length}`);
    params.push(`%${specFilter.sig}%`);
    const sigIdx = params.length;
    const enlArr = `jsonb_array_elements(
         CASE WHEN jsonb_typeof(data->'arkPassive'->'effects') = 'array'
              THEN data->'arkPassive'->'effects' ELSE '[]'::jsonb END)`;
    const sigExists = `EXISTS (SELECT 1 FROM ${enlArr} AS ee
       WHERE ee->>'category' = '깨달음' AND ee->>'name' LIKE $${sigIdx})`;
    if (specFilter.requireSig) {
      conditions.push(sigExists);
    } else {
      // else 스펙: 깨달음 데이터는 존재하나 시그니처 노드는 없음
      const enlExists = `EXISTS (SELECT 1 FROM ${enlArr} AS ee WHERE ee->>'category' = '깨달음')`;
      conditions.push(`${enlExists} AND NOT ${sigExists}`);
    }
  }
  // 역할 필터 (딜러/서포터)
  if (opts.role === 'support') {
    conditions.push(supportRoleExpr(params));
  } else if (opts.role === 'dealer') {
    conditions.push(`NOT ${supportRoleExpr(params)}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  // sortDir은 'ASC'|'DESC' 리터럴만 (사용자 문자열 아님 → 인터폴레이션 안전)
  // character_name(고유 PK)을 마지막 정렬키로 → 동점에서도 페이지 경계가 결정적(중복·누락 방지)
  const orderClause =
    sortBy === 'item_level'
      ? `ORDER BY item_level ${sortDir}, combat_power ${sortDir}, character_name ASC`
      : `ORDER BY combat_power ${sortDir}, item_level ${sortDir}, character_name ASC`;
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  // 깨달음 노드 이름 배열만 추출 (스펙 아이콘 판별용). arkPassive 없거나 비배열이면 안전하게 빈 배열
  const enlExpr = `
    (SELECT array_agg(e->>'name')
       FROM jsonb_array_elements(
         CASE WHEN jsonb_typeof(data->'arkPassive'->'effects') = 'array'
              THEN data->'arkPassive'->'effects' ELSE '[]'::jsonb END
       ) AS e
      WHERE e->>'category' = '깨달음') AS enl_nodes`;

  const queryText = `
    SELECT character_name, class_name, combat_power, item_level,
           character_image, server_name, cores, equipped_title, fetched_at,
           ${enlExpr}
    FROM characters
    ${whereClause}
    ${orderClause}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const rows = (await sql.query(queryText, params)) as any[];

  return rows.map(r => {
    const enlNodes: string[] = Array.isArray(r.enl_nodes) ? r.enl_nodes.filter(Boolean) : [];
    const spec = resolveSpecIcon(r.class_name, enlNodes);
    return {
      characterName: r.character_name,
      className: r.class_name,
      combatPower: Number(r.combat_power),
      itemLevel: Number(r.item_level),
      characterImage: r.character_image,
      serverName: r.server_name,
      cores: Array.isArray(r.cores) ? r.cores : [],
      equippedTitle: r.equipped_title || null,
      fetchedAt: r.fetched_at,
      specId: spec?.id ?? null,
      specName: spec?.name ?? null,
      specIcon: spec?.icon ?? null,
    };
  });
}

export interface RankingStats {
  /** 전체 등록 캐릭터 수 */
  total: number;
  /** 현재 필터 조합에 모두 매칭되는 수 */
  matched: number;
  /** 매칭 집합의 평균 전투력 */
  avgCombatPower: number;
  /** 매칭 집합의 평균 아이템레벨 */
  avgItemLevel: number;
  /** 활성 필터 각각을 단독 적용했을 때의 수 (활성 필터만 키 존재) */
  breakdown: { spec?: number; title?: number; ancient?: number; role?: number };
}

/**
 * 필터 조합의 비율 통계.
 * listRanking과 동일한 조건식을 FILTER 절로 재사용해 단일 쿼리로 계산한다.
 * → DB 1회 읽기 + 정수 몇 개만 반환(egress ~0). API에서 5분 CDN 캐시로 반복 호출도 차단.
 */
export async function getRankingStats(opts: ListRankingOptions = {}): Promise<RankingStats> {
  const className = opts.className?.trim() || null;
  const titleQuery = opts.titleQuery?.trim() || null;
  const titlePattern = titleQuery ? `%${titleQuery}%` : null;
  const ancientCount =
    typeof opts.ancientCount === 'number' && opts.ancientCount >= 0 && opts.ancientCount <= 6
      ? Math.floor(opts.ancientCount)
      : null;

  // 각 필터를 독립 boolean 표현식으로 만들어 matched(AND 결합)와 단독 FILTER에 모두 재사용
  const params: any[] = [];
  const frags: { key: 'spec' | 'title' | 'ancient' | 'class' | 'role'; expr: string }[] = [];

  if (className) {
    params.push(className);
    frags.push({ key: 'class', expr: `class_name = $${params.length}` });
  }
  if (titlePattern) {
    params.push(titlePattern);
    const titleFloor = titleQuery && TITLES_REQUIRE_MIN_LEVEL.has(titleQuery)
      ? ` AND item_level >= ${TITLE_MIN_ITEM_LEVEL}` : '';
    frags.push({ key: 'title', expr: `${titlesHistoryMatchExpr(params.length)}${titleFloor}` });
  }
  if (ancientCount !== null) {
    params.push(ancientCount);
    frags.push({
      key: 'ancient',
      expr: `(SELECT count(*) FROM jsonb_array_elements(cores) AS e WHERE e->>'grade' = '고대') = $${params.length}`,
    });
  }
  const specFilter = specFilterFor(opts.specId);
  if (specFilter) {
    params.push(specFilter.className);
    const ci = params.length;
    params.push(`%${specFilter.sig}%`);
    const si = params.length;
    const enlArr = `jsonb_array_elements(
         CASE WHEN jsonb_typeof(data->'arkPassive'->'effects') = 'array'
              THEN data->'arkPassive'->'effects' ELSE '[]'::jsonb END)`;
    const sigExists = `EXISTS (SELECT 1 FROM ${enlArr} AS ee
       WHERE ee->>'category' = '깨달음' AND ee->>'name' LIKE $${si})`;
    let expr: string;
    if (specFilter.requireSig) {
      expr = `class_name = $${ci} AND ${sigExists}`;
    } else {
      const enlExists = `EXISTS (SELECT 1 FROM ${enlArr} AS ee WHERE ee->>'category' = '깨달음')`;
      expr = `class_name = $${ci} AND ${enlExists} AND NOT ${sigExists}`;
    }
    frags.push({ key: 'spec', expr });
  }
  if (opts.role === 'support' || opts.role === 'dealer') {
    const expr = opts.role === 'support' ? supportRoleExpr(params) : `NOT ${supportRoleExpr(params)}`;
    frags.push({ key: 'role', expr });
  }

  const matchedExpr = frags.length ? frags.map(f => `(${f.expr})`).join(' AND ') : 'TRUE';

  const selects: string[] = [
    `count(*) AS total`,
    `count(*) FILTER (WHERE ${matchedExpr}) AS matched`,
    `COALESCE(round(avg(combat_power) FILTER (WHERE ${matchedExpr}), 2), 0) AS avg_cp`,
    `COALESCE(round(avg(item_level) FILTER (WHERE ${matchedExpr}), 2), 0) AS avg_il`,
  ];
  // 단독 비율(breakdown) — class는 spec에 포함되므로 별도 노출 안 함
  for (const f of frags) {
    if (f.key === 'class') continue;
    selects.push(`count(*) FILTER (WHERE ${f.expr}) AS ${f.key}_only`);
  }

  const rows = (await sql.query(`SELECT ${selects.join(', ')} FROM characters`, params)) as any[];
  const r = rows[0] || {};
  const num = (v: any) => (v == null ? 0 : Number(v));

  const breakdown: RankingStats['breakdown'] = {};
  if (frags.some(f => f.key === 'spec')) breakdown.spec = num(r.spec_only);
  if (frags.some(f => f.key === 'title')) breakdown.title = num(r.title_only);
  if (frags.some(f => f.key === 'ancient')) breakdown.ancient = num(r.ancient_only);
  if (frags.some(f => f.key === 'role')) breakdown.role = num(r.role_only);

  return {
    total: num(r.total),
    matched: num(r.matched),
    avgCombatPower: num(r.avg_cp),
    avgItemLevel: num(r.avg_il),
    breakdown,
  };
}
