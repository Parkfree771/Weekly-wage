import { sql } from './neon';
import type { CharacterData } from './characterData';

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
}

export interface ListRankingOptions {
  className?: string;
  /** 칭호 필터 — equipped_title에 이 문자열이 포함된 캐릭터만 (정확/시리즈 둘 다 매칭) */
  titleQuery?: string;
  sortBy?: RankingSortBy;
  limit?: number;
  offset?: number;
}

export async function listRanking(opts: ListRankingOptions = {}): Promise<RankingEntry[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sortBy: RankingSortBy = opts.sortBy === 'item_level' ? 'item_level' : 'combat_power';
  const className = opts.className?.trim() || null;
  const titleQuery = opts.titleQuery?.trim() || null;
  const titlePattern = titleQuery ? `%${titleQuery}%` : null;

  // 4가지 조합(className × titleQuery × sortBy) — Neon sql tagged template는 dynamic WHERE 조립이 까다로워 분기로 처리
  let rows: any[];
  if (className && titlePattern) {
    if (sortBy === 'item_level') {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, equipped_title, fetched_at
        FROM characters
        WHERE class_name = ${className} AND equipped_title ILIKE ${titlePattern}
        ORDER BY item_level DESC, combat_power DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    } else {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, equipped_title, fetched_at
        FROM characters
        WHERE class_name = ${className} AND equipped_title ILIKE ${titlePattern}
        ORDER BY combat_power DESC, item_level DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    }
  } else if (className) {
    if (sortBy === 'item_level') {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, equipped_title, fetched_at
        FROM characters
        WHERE class_name = ${className}
        ORDER BY item_level DESC, combat_power DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    } else {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, equipped_title, fetched_at
        FROM characters
        WHERE class_name = ${className}
        ORDER BY combat_power DESC, item_level DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    }
  } else if (titlePattern) {
    if (sortBy === 'item_level') {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, equipped_title, fetched_at
        FROM characters
        WHERE equipped_title ILIKE ${titlePattern}
        ORDER BY item_level DESC, combat_power DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    } else {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, equipped_title, fetched_at
        FROM characters
        WHERE equipped_title ILIKE ${titlePattern}
        ORDER BY combat_power DESC, item_level DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    }
  } else {
    if (sortBy === 'item_level') {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, equipped_title, fetched_at
        FROM characters
        ORDER BY item_level DESC, combat_power DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    } else {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, equipped_title, fetched_at
        FROM characters
        ORDER BY combat_power DESC, item_level DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    }
  }

  return rows.map(r => ({
    characterName: r.character_name,
    className: r.class_name,
    combatPower: Number(r.combat_power),
    itemLevel: Number(r.item_level),
    characterImage: r.character_image,
    serverName: r.server_name,
    cores: Array.isArray(r.cores) ? r.cores : [],
    equippedTitle: r.equipped_title || null,
    fetchedAt: r.fetched_at,
  }));
}
