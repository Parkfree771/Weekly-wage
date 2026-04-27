import { supabase } from './supabase';

// ─── 서포터 직업 목록 ───
const SUPPORT_CLASSES = ['바드', '홀리나이트', '도화가'];
// ─── 딜/서폿 선택 가능한 하이브리드 직업 (자동 판정 없이 유저가 직접 선택) ───
const HYBRID_CLASSES = ['발키리', '바드', '홀리나이트', '도화가'];

export function getRole(characterClass: string): 'dealer' | 'supporter' {
  return SUPPORT_CLASSES.includes(characterClass) ? 'supporter' : 'dealer';
}

export function isHybridClass(characterClass: string): boolean {
  return HYBRID_CLASSES.includes(characterClass);
}

// ============================================================
// 타입
// ============================================================
export interface PartyMemberInput {
  character_name: string;
  character_class: string;
  role: 'dealer' | 'supporter';
  item_level: number;
  combat_power: number;
  character_image: string | null;
  sibling_names: string[];   // 원정대 전체 닉네임 (본인 포함). 중복 방지용.
}

export interface IndividualInput {
  character_name: string;
  character_class: string;
  role: 'dealer' | 'supporter';
  item_level: number;
  combat_power: number;
  title: string;
  sibling_names: string[];   // 원정대 전체 닉네임 (본인 포함).
}

export interface HallOfFameEntry {
  id: number;
  characterName: string;
  characterClass: string;
  role: 'dealer' | 'supporter';
  itemLevel: number;
  combatPower: number;
  characterImage: string | null;
  createdAt: string;
  partyId: string | null;
  partyName: string | null;
  partyCreatedAt: string | null;
}

export interface DailyChartData {
  date: string;
  // 누적 평균(처음부터 이 날짜까지) — 차트 라인용
  dealerPower: number | null;
  supporterPower: number | null;
  dealerLevel: number | null;
  supporterLevel: number | null;
  dealerCount: number;
  supporterCount: number;
  // 해당 날짜의 일별 평균 — 툴팁용
  dealerPowerDaily: number | null;
  supporterPowerDaily: number | null;
  dealerLevelDaily: number | null;
  supporterLevelDaily: number | null;
  dealerCountDaily: number;
  supporterCountDaily: number;
}

export interface ExtremeSummary {
  totalClears: number;
  dealerCount: number;
  supporterCount: number;
  dealerAvgPower: number | null;
  supporterAvgPower: number | null;
}

export interface ClassStat {
  className: string;
  role: 'dealer' | 'supporter';
  count: number;
  avgPower: number;
  avgLevel: number;
}

// ============================================================
// Phase-aware 캐시
// - 공대 페이즈 (HOF < 80): 실시간 중요, 짧은 TTL 또는 캐시 X
// - 개인 페이즈 (HOF >= 80): 변동 적음, 긴 TTL로 egress 절약
// ============================================================
const HOF_FULL_THRESHOLD = 80;

// 공대 페이즈 TTL
const TTL_PARTY_STATS = 60 * 1000;       // 차트/요약/직업별 1분
const TTL_PARTY_HOF = 0;                 // HOF 캐시 X (실시간)
const TTL_PARTY_LOCKS = 0;               // rosterLocks 캐시 X

// 개인 페이즈 TTL (공대 등록 끝난 후 — 변동 적음, 길게 가져가도 OK)
const TTL_INDIVIDUAL_STATS = 15 * 60 * 1000;  // 15분
const TTL_INDIVIDUAL_HOF = 15 * 60 * 1000;    // 15분 (HOF 고정)
const TTL_INDIVIDUAL_LOCKS = 10 * 60 * 1000;  // 10분

// 페이즈 판정용: 마지막 HOF 조회 길이
let _lastHofCount = 0;
function isIndividualPhase(): boolean {
  return _lastHofCount >= HOF_FULL_THRESHOLD;
}

const chartCache = new Map<string, { data: DailyChartData[]; ts: number }>();
const summaryCache = new Map<string, { data: ExtremeSummary; ts: number }>();
const classStatsCache = new Map<string, { data: ClassStat[]; ts: number }>();
const hofCache = new Map<string, { data: HallOfFameEntry[]; ts: number }>();
const locksCache = new Map<string, { data: Map<string, string | null>; ts: number }>();

function invalidateCache(title?: string) {
  if (title) {
    chartCache.delete(title);
    summaryCache.delete(title);
    classStatsCache.delete(title);
    hofCache.delete(title);
    allClearsCache.delete(title);
    locksCache.delete(title);
  } else {
    chartCache.clear();
    summaryCache.clear();
    classStatsCache.clear();
    hofCache.clear();
    allClearsCache.clear();
    locksCache.clear();
  }
}

// ============================================================
// RPC 에러 메시지 매핑 (Postgres RAISE / UNIQUE 위반 → 한국어)
// ============================================================
function translateRpcError(err: { code?: string; message?: string; details?: string } | null): string {
  if (!err) return '등록에 실패했습니다.';

  // 커스텀 RAISE EXCEPTION 식별자
  if (err.message?.includes('EXT_EMPTY_PARTY_NAME')) return '공대 이름을 입력해주세요.';
  if (err.message?.includes('EXT_HOF_FULL')) return '명예의 전당이 이미 10공대로 가득 찼습니다.';
  if (err.message?.includes('EXT_MUST_BE_8')) return '공대는 반드시 8명이어야 합니다.';
  if (err.message?.includes('EXT_PARTY_PHASE_ONLY')) return '아직 공대 등록 단계입니다. 시상대가 모두 채워진 후 개인 등록이 열립니다.';

  // UNIQUE 위반
  if (err.code === '23505') {
    if (err.message?.includes('uq_parties_title_name') || err.details?.includes('uq_parties_title_name')) {
      return '이미 등록된 공대 이름입니다.';
    }
    if (err.message?.includes('extreme_roster_locks') || err.details?.includes('extreme_roster_locks')) {
      return '해당 원정대의 캐릭터가 이미 등록되어 있습니다. (본캐/부캐 한 명만 등록 가능)';
    }
    if (err.message?.includes('uq_clears_char_title') || err.details?.includes('uq_clears_char_title')) {
      return '이미 등록된 캐릭터가 포함되어 있습니다.';
    }
    return '중복된 데이터입니다.';
  }

  // CHECK 위반 등
  if (err.code === '23514') return '입력 값이 올바르지 않습니다.';

  return err.message || '등록에 실패했습니다.';
}

// ============================================================
// 공대 등록 RPC
// ============================================================
export async function registerExtremeParty(
  title: string,
  partyName: string,
  members: PartyMemberInput[]
): Promise<{ success: boolean; error?: string; partyId?: string }> {
  try {
    const { data, error } = await supabase.rpc('register_extreme_party', {
      p_title: title,
      p_party_name: partyName,
      p_members: members,
    });

    if (error) {
      console.error('register_extreme_party error:', error);
      return { success: false, error: translateRpcError(error) };
    }

    invalidateCache(title);
    return { success: true, partyId: data as string };
  } catch (err) {
    console.error('register_extreme_party exception:', err);
    return { success: false, error: '등록 중 오류가 발생했습니다.' };
  }
}

// ============================================================
// 개인 등록 RPC (HOF 80석 완료 후에만 서버에서 허용)
// ============================================================
export async function registerExtremeIndividual(
  input: IndividualInput
): Promise<{ success: boolean; error?: string; id?: number }> {
  try {
    const { data, error } = await supabase.rpc('register_extreme_individual', {
      p_character_name: input.character_name,
      p_character_class: input.character_class,
      p_role: input.role,
      p_item_level: input.item_level,
      p_combat_power: input.combat_power,
      p_title: input.title,
      p_sibling_names: input.sibling_names,
    });

    if (error) {
      console.error('register_extreme_individual error:', error);
      return { success: false, error: translateRpcError(error) };
    }

    invalidateCache(input.title);
    return { success: true, id: data as number };
  } catch (err) {
    console.error('register_extreme_individual exception:', err);
    return { success: false, error: '등록 중 오류가 발생했습니다.' };
  }
}

// ============================================================
// 혹한의 군주 — 개인 등록 RPC (character_image 저장 버전)
//
// 홍염은 명전 80명에만 이미지 노출 → register_extreme_individual 은 image=NULL.
// 혹한은 모든 등록자가 카드 명단에 노출 → 신규 RPC 호출하여 image 저장.
// 홍염용 registerExtremeIndividual 은 변경 0 (격리).
// ============================================================
export async function registerFrostIndividual(
  input: IndividualInput & { character_image: string | null }
): Promise<{ success: boolean; error?: string; id?: number }> {
  try {
    const { data, error } = await supabase.rpc('register_extreme_individual_with_image', {
      p_character_name: input.character_name,
      p_character_class: input.character_class,
      p_role: input.role,
      p_item_level: input.item_level,
      p_combat_power: input.combat_power,
      p_title: input.title,
      p_sibling_names: input.sibling_names,
      p_character_image: input.character_image,
    });

    if (error) {
      console.error('register_extreme_individual_with_image error:', error);
      return { success: false, error: translateRpcError(error) };
    }

    invalidateCache(input.title);
    return { success: true, id: data as number };
  } catch (err) {
    console.error('register_extreme_individual_with_image exception:', err);
    return { success: false, error: '등록 중 오류가 발생했습니다.' };
  }
}

// ============================================================
// 차트 데이터 (일별 × 역할)
// ============================================================
export async function getChartData(title: string): Promise<DailyChartData[]> {
  const ttl = isIndividualPhase() ? TTL_INDIVIDUAL_STATS : TTL_PARTY_STATS;
  const cached = chartCache.get(title);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('extreme_daily_stats')
      .select('clear_date, role, clear_count, avg_power, avg_level')
      .eq('title', title)
      .order('clear_date', { ascending: true });

    if (error || !data || data.length === 0) {
      chartCache.set(title, { data: [], ts: Date.now() });
      return [];
    }

    // 일별 원본 집계 (툴팁에서 "그날 평균"으로 노출)
    type DailyRaw = {
      date: string;
      dealerPowerDaily: number | null;
      supporterPowerDaily: number | null;
      dealerLevelDaily: number | null;
      supporterLevelDaily: number | null;
      dealerCountDaily: number;
      supporterCountDaily: number;
    };
    const map = new Map<string, DailyRaw>();
    for (const row of data) {
      const d = row.clear_date as string;
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          dealerPowerDaily: null,
          supporterPowerDaily: null,
          dealerLevelDaily: null,
          supporterLevelDaily: null,
          dealerCountDaily: 0,
          supporterCountDaily: 0,
        });
      }
      const e = map.get(d)!;
      const power = Math.round(Number(row.avg_power));
      const level = Math.round(Number(row.avg_level) * 100) / 100;
      if (row.role === 'dealer') {
        e.dealerPowerDaily = power;
        e.dealerLevelDaily = level;
        e.dealerCountDaily = row.clear_count;
      } else {
        e.supporterPowerDaily = power;
        e.supporterLevelDaily = level;
        e.supporterCountDaily = row.clear_count;
      }
    }

    const sorted = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));

    // 누적 평균(running average) 변환:
    // 차트 라인은 "처음부터 이 날짜까지 등록된 모든 인원"의 평균.
    // 일별 값은 툴팁에서 "그날 등록분만" 따로 노출한다.
    let dPowSum = 0, dLvlSum = 0, dCnt = 0;
    let sPowSum = 0, sLvlSum = 0, sCnt = 0;
    const result: DailyChartData[] = sorted.map(e => {
      if (e.dealerCountDaily > 0 && e.dealerPowerDaily != null && e.dealerLevelDaily != null) {
        dPowSum += e.dealerPowerDaily * e.dealerCountDaily;
        dLvlSum += e.dealerLevelDaily * e.dealerCountDaily;
        dCnt   += e.dealerCountDaily;
      }
      if (e.supporterCountDaily > 0 && e.supporterPowerDaily != null && e.supporterLevelDaily != null) {
        sPowSum += e.supporterPowerDaily * e.supporterCountDaily;
        sLvlSum += e.supporterLevelDaily * e.supporterCountDaily;
        sCnt   += e.supporterCountDaily;
      }
      return {
        date: e.date,
        dealerPower:    dCnt > 0 ? Math.round(dPowSum / dCnt) : null,
        dealerLevel:    dCnt > 0 ? Math.round((dLvlSum / dCnt) * 100) / 100 : null,
        supporterPower: sCnt > 0 ? Math.round(sPowSum / sCnt) : null,
        supporterLevel: sCnt > 0 ? Math.round((sLvlSum / sCnt) * 100) / 100 : null,
        dealerCount:    dCnt,
        supporterCount: sCnt,
        dealerPowerDaily:    e.dealerPowerDaily,
        supporterPowerDaily: e.supporterPowerDaily,
        dealerLevelDaily:    e.dealerLevelDaily,
        supporterLevelDaily: e.supporterLevelDaily,
        dealerCountDaily:    e.dealerCountDaily,
        supporterCountDaily: e.supporterCountDaily,
      };
    });

    chartCache.set(title, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error('Error fetching chart data:', err);
    return [];
  }
}

// ============================================================
// 요약 통계 (class_stats 합산)
// ============================================================
export async function getSummary(title: string): Promise<ExtremeSummary> {
  const ttl = isIndividualPhase() ? TTL_INDIVIDUAL_STATS : TTL_PARTY_STATS;
  const cached = summaryCache.get(title);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.data;
  }

  const empty: ExtremeSummary = {
    totalClears: 0, dealerCount: 0, supporterCount: 0,
    dealerAvgPower: null, supporterAvgPower: null,
  };

  try {
    const { data, error } = await supabase
      .from('extreme_class_stats')
      .select('role, clear_count, avg_power')
      .eq('title', title);

    if (error || !data || data.length === 0) {
      summaryCache.set(title, { data: empty, ts: Date.now() });
      return empty;
    }

    let total = 0, dealerCount = 0, supporterCount = 0;
    let dealerPowerSum = 0, supporterPowerSum = 0;
    for (const row of data) {
      const n = row.clear_count as number;
      const p = Number(row.avg_power);
      total += n;
      if (row.role === 'dealer') {
        dealerCount += n;
        dealerPowerSum += p * n;
      } else {
        supporterCount += n;
        supporterPowerSum += p * n;
      }
    }

    const summary: ExtremeSummary = {
      totalClears: total,
      dealerCount,
      supporterCount,
      dealerAvgPower: dealerCount > 0 ? Math.round(dealerPowerSum / dealerCount) : null,
      supporterAvgPower: supporterCount > 0 ? Math.round(supporterPowerSum / supporterCount) : null,
    };
    summaryCache.set(title, { data: summary, ts: Date.now() });
    return summary;
  } catch (err) {
    console.error('Error fetching summary:', err);
    return empty;
  }
}

// ============================================================
// 직업별 통계
// ============================================================
export async function getClassStats(title: string): Promise<ClassStat[]> {
  const ttl = isIndividualPhase() ? TTL_INDIVIDUAL_STATS : TTL_PARTY_STATS;
  const cached = classStatsCache.get(title);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('extreme_class_stats')
      .select('character_class, role, clear_count, avg_power, avg_level')
      .eq('title', title)
      .order('clear_count', { ascending: false });

    if (error || !data || data.length === 0) {
      classStatsCache.set(title, { data: [], ts: Date.now() });
      return [];
    }

    const result: ClassStat[] = data.map(row => ({
      className: row.character_class as string,
      role: row.role as 'dealer' | 'supporter',
      count: row.clear_count as number,
      avgPower: Math.round(Number(row.avg_power)),
      avgLevel: Math.round(Number(row.avg_level) * 100) / 100,
    }));

    classStatsCache.set(title, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error('Error fetching class stats:', err);
    return [];
  }
}

// ============================================================
// 명예의 전당 (공대 정렬, 항상 fresh)
// parties JOIN clears · party_created_at ASC, member created_at ASC
// ============================================================
export async function getHallOfFame(title: string): Promise<HallOfFameEntry[]> {
  // 페이즈별 TTL: 공대 페이즈는 캐시 X (실시간), 개인 페이즈는 5분
  const ttl = isIndividualPhase() ? TTL_INDIVIDUAL_HOF : TTL_PARTY_HOF;
  if (ttl > 0) {
    const cached = hofCache.get(title);
    if (cached && Date.now() - cached.ts < ttl) {
      return cached.data;
    }
  }

  try {
    const { data, error } = await supabase
      .from('extreme_clears')
      .select(`
        id, character_name, character_class, role, item_level, combat_power,
        character_image, created_at, party_id,
        extreme_parties:party_id ( party_name, created_at )
      `)
      .eq('title', title)
      .not('party_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(80);

    if (error || !data) {
      console.error('Error fetching hall of fame:', error);
      return [];
    }

    type Row = {
      id: number;
      character_name: string;
      character_class: string;
      role: 'dealer' | 'supporter';
      item_level: number | string;
      combat_power: number | string;
      character_image: string | null;
      created_at: string;
      party_id: string | null;
      extreme_parties: { party_name: string; created_at: string } | { party_name: string; created_at: string }[] | null;
    };

    const rows = (data as Row[]).map(row => {
      const p = Array.isArray(row.extreme_parties)
        ? (row.extreme_parties[0] ?? null)
        : row.extreme_parties;
      return {
        id: row.id,
        characterName: row.character_name,
        characterClass: row.character_class,
        role: row.role,
        itemLevel: Number(row.item_level),
        combatPower: Number(row.combat_power),
        characterImage: row.character_image ?? null,
        createdAt: row.created_at,
        partyId: row.party_id,
        partyName: p?.party_name ?? null,
        partyCreatedAt: p?.created_at ?? null,
      } as HallOfFameEntry;
    });

    // 공대 생성순 → 공대 내 멤버 생성순
    rows.sort((a, b) => {
      const pa = a.partyCreatedAt ?? '';
      const pb = b.partyCreatedAt ?? '';
      if (pa !== pb) return pa.localeCompare(pb);
      return a.createdAt.localeCompare(b.createdAt);
    });

    // 페이즈 판정용 카운트 + 캐시
    _lastHofCount = rows.length;
    hofCache.set(title, { data: rows, ts: Date.now() });
    return rows;
  } catch (err) {
    console.error('Error fetching hall of fame:', err);
    return [];
  }
}

// ============================================================
// 전체 토벌자 목록 (혹한 페이지 전용 — 공대/개인 구분 없이 등록된 모든 인원)
// 전투력 내림차순 + 캐시는 stats 와 동일 TTL
// ============================================================
const allClearsCache = new Map<string, { data: HallOfFameEntry[]; ts: number }>();

export async function getAllClears(title: string): Promise<HallOfFameEntry[]> {
  const ttl = isIndividualPhase() ? TTL_INDIVIDUAL_STATS : TTL_PARTY_STATS;
  const cached = allClearsCache.get(title);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('extreme_clears')
      .select(`
        id, character_name, character_class, role, item_level, combat_power,
        character_image, created_at, party_id,
        extreme_parties:party_id ( party_name, created_at )
      `)
      .eq('title', title)
      .order('combat_power', { ascending: false });

    if (error || !data) {
      console.error('Error fetching all clears:', error);
      return [];
    }

    type Row = {
      id: number;
      character_name: string;
      character_class: string;
      role: 'dealer' | 'supporter';
      item_level: number | string;
      combat_power: number | string;
      character_image: string | null;
      created_at: string;
      party_id: string | null;
      extreme_parties: { party_name: string; created_at: string } | { party_name: string; created_at: string }[] | null;
    };

    const rows = (data as Row[]).map(row => {
      const p = Array.isArray(row.extreme_parties)
        ? (row.extreme_parties[0] ?? null)
        : row.extreme_parties;
      return {
        id: row.id,
        characterName: row.character_name,
        characterClass: row.character_class,
        role: row.role,
        itemLevel: Number(row.item_level),
        combatPower: Number(row.combat_power),
        characterImage: row.character_image ?? null,
        createdAt: row.created_at,
        partyId: row.party_id,
        partyName: p?.party_name ?? null,
        partyCreatedAt: p?.created_at ?? null,
      } as HallOfFameEntry;
    });

    allClearsCache.set(title, { data: rows, ts: Date.now() });
    return rows;
  } catch (err) {
    console.error('Error fetching all clears:', err);
    return [];
  }
}

// ============================================================
// 원정대 잠금 목록 (검색 시점 중복 검증용, 항상 fresh)
// character_name → party_name (null이면 개인 등록)
// ============================================================
export async function getRosterLocks(title: string): Promise<Map<string, string | null>> {
  // 페이즈별 TTL: 공대 페이즈는 캐시 X, 개인 페이즈는 2분
  const ttl = isIndividualPhase() ? TTL_INDIVIDUAL_LOCKS : TTL_PARTY_LOCKS;
  if (ttl > 0) {
    const cached = locksCache.get(title);
    if (cached && Date.now() - cached.ts < ttl) {
      return cached.data;
    }
  }

  try {
    const { data, error } = await supabase
      .from('extreme_roster_locks')
      .select('character_name, party_id, extreme_parties:party_id ( party_name )')
      .eq('title', title);

    if (error || !data) {
      console.error('Error fetching roster locks:', error);
      return new Map();
    }

    type Row = {
      character_name: string;
      party_id: string | null;
      extreme_parties: { party_name: string } | { party_name: string }[] | null;
    };

    const map = new Map<string, string | null>();
    for (const row of data as Row[]) {
      const joined = Array.isArray(row.extreme_parties)
        ? (row.extreme_parties[0] ?? null)
        : row.extreme_parties;
      map.set(row.character_name, joined?.party_name ?? null);
    }
    locksCache.set(title, { data: map, ts: Date.now() });
    return map;
  } catch (err) {
    console.error('Error fetching roster locks:', err);
    return new Map();
  }
}
