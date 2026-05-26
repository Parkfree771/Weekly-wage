import { sql } from './neon';

export type CoreData = {
  name: string;
  icon: string | null;
  grade: string | null;
  point: number;
};

// 인덱스 컬럼 추출용 헬퍼
function extractIndexFields(apiData: any) {
  const profile = apiData?.profile;
  const combatPower = parseFloat((profile?.CombatPower || '0').toString().replace(/,/g, ''));
  const itemLevel = parseFloat((profile?.ItemAvgLevel || '0').toString().replace(/,/g, ''));

  // 코어 6개 (질서 3 + 혼돈 3)
  const slots = Array.isArray(apiData?.arkgrid?.Slots) ? apiData.arkgrid.Slots : [];
  const cores: CoreData[] = slots.map((s: any) => ({
    name: s?.Name || '',
    icon: s?.Icon || null,
    grade: s?.Grade || null,
    point: typeof s?.Point === 'number' ? s.Point : 0,
  }));

  // 호환용 단일 코어 컬럼은 그대로 유지 (기존 컬럼)
  const mainCoreIcon: string | null = cores[0]?.icon || null;
  const mainCoreGrade: string | null = cores[0]?.grade || null;

  return {
    className: profile?.CharacterClassName || '',
    combatPower: isFinite(combatPower) ? combatPower : 0,
    itemLevel: isFinite(itemLevel) ? itemLevel : 0,
    characterImage: profile?.CharacterImage || null,
    serverName: profile?.ServerName || null,
    guildName: profile?.GuildName || null,
    mainCoreIcon,
    mainCoreGrade,
    cores,
  };
}

export interface CachedCharacter {
  data: any;
  fetchedAt: string;
  updatedAt: string;
}

export async function getCharacterFromDb(characterName: string): Promise<CachedCharacter | null> {
  const rows = await sql`
    SELECT data, fetched_at, updated_at
    FROM characters
    WHERE character_name = ${characterName}
    LIMIT 1
  ` as any[];
  if (rows.length === 0) return null;
  return {
    data: rows[0].data,
    fetchedAt: rows[0].fetched_at,
    updatedAt: rows[0].updated_at,
  };
}

export async function upsertCharacter(characterName: string, apiData: any): Promise<void> {
  const f = extractIndexFields(apiData);
  await sql`
    INSERT INTO characters (
      character_name, class_name, combat_power, item_level,
      character_image, server_name, guild_name,
      main_core_icon, main_core_grade, cores,
      data, fetched_at, updated_at
    )
    VALUES (
      ${characterName}, ${f.className}, ${f.combatPower}, ${f.itemLevel},
      ${f.characterImage}, ${f.serverName}, ${f.guildName},
      ${f.mainCoreIcon}, ${f.mainCoreGrade}, ${JSON.stringify(f.cores)}::jsonb,
      ${JSON.stringify(apiData)}::jsonb, NOW(), NOW()
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
      data            = EXCLUDED.data,
      fetched_at      = NOW(),
      updated_at      = NOW()
  `;
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
  fetchedAt: string;
}

export interface ListRankingOptions {
  className?: string;
  sortBy?: RankingSortBy;
  limit?: number;
  offset?: number;
}

export async function listRanking(opts: ListRankingOptions = {}): Promise<RankingEntry[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sortBy: RankingSortBy = opts.sortBy === 'item_level' ? 'item_level' : 'combat_power';
  const className = opts.className?.trim() || null;

  let rows: any[];
  if (className) {
    if (sortBy === 'item_level') {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, fetched_at
        FROM characters
        WHERE class_name = ${className}
        ORDER BY item_level DESC, combat_power DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    } else {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, fetched_at
        FROM characters
        WHERE class_name = ${className}
        ORDER BY combat_power DESC, item_level DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    }
  } else {
    if (sortBy === 'item_level') {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, fetched_at
        FROM characters
        ORDER BY item_level DESC, combat_power DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    } else {
      rows = await sql`
        SELECT character_name, class_name, combat_power, item_level,
               character_image, server_name, cores, fetched_at
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
    fetchedAt: r.fetched_at,
  }));
}
