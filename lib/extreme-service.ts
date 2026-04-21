import { supabase } from './supabase';

// ─── 서포터 직업 목록 ───
const SUPPORT_CLASSES = ['바드', '홀리나이트', '도화가'];
// ─── 딜/서폿 선택 가능한 하이브리드 직업 ───
const HYBRID_CLASSES = ['발키리'];

export function getRole(characterClass: string): 'dealer' | 'supporter' {
  return SUPPORT_CLASSES.includes(characterClass) ? 'supporter' : 'dealer';
}

export function isHybridClass(characterClass: string): boolean {
  return HYBRID_CLASSES.includes(characterClass);
}

// ─── 타입 ───
export interface ExtremeClear {
  character_name: string;
  character_class: string;
  role: 'dealer' | 'supporter';
  item_level: number;
  combat_power: number;
  title: string;
  cleared_at: string; // YYYY-MM-DD
}

export interface ExtremeClearRecord extends ExtremeClear {
  id: number;
  created_at: string;
}

export interface DailyChartData {
  date: string;
  dealerPower: number | null;
  supporterPower: number | null;
  dealerLevel: number | null;
  supporterLevel: number | null;
  dealerCount: number;
  supporterCount: number;
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

// ─── 캐시 (3분 TTL) ───
const CACHE_TTL = 3 * 60 * 1000;
const chartCache = new Map<string, { data: DailyChartData[]; ts: number }>();
const summaryCache = new Map<string, { data: ExtremeSummary; ts: number }>();
const classStatsCache = new Map<string, { data: ClassStat[]; ts: number }>();

function invalidateCache(title?: string) {
  if (title) {
    chartCache.delete(title);
    summaryCache.delete(title);
    classStatsCache.delete(title);
  } else {
    chartCache.clear();
    summaryCache.clear();
    classStatsCache.clear();
  }
}

// ─── 저장 (원시 테이블 extreme_clears에 INSERT) ───
export async function saveExtremeClear(data: ExtremeClear): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('extreme_clears')
      .insert([data]);

    if (error) {
      // 23505 = unique_violation (character_name + title 중복)
      if ((error as { code?: string }).code === '23505') {
        return { success: false, error: '이미 등록된 캐릭터입니다.' };
      }
      console.error('Supabase insert error:', error);
      return { success: false, error: '저장에 실패했습니다.' };
    }

    invalidateCache(data.title);
    return { success: true };
  } catch (err) {
    console.error('Error saving extreme clear:', err);
    return { success: false, error: '저장 중 오류가 발생했습니다.' };
  }
}

// ─── 차트 데이터 (extreme_daily_stats에서 직접 SELECT) ───
export async function getChartData(title: string): Promise<DailyChartData[]> {
  const cached = chartCache.get(title);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
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

    // 날짜별로 dealer/supporter 두 행을 하나로 합침
    const map = new Map<string, DailyChartData>();
    for (const row of data) {
      const d = row.clear_date as string;
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          dealerPower: null,
          supporterPower: null,
          dealerLevel: null,
          supporterLevel: null,
          dealerCount: 0,
          supporterCount: 0,
        });
      }
      const e = map.get(d)!;
      const power = Math.round(Number(row.avg_power));
      const level = Math.round(Number(row.avg_level) * 100) / 100;
      if (row.role === 'dealer') {
        e.dealerPower = power;
        e.dealerLevel = level;
        e.dealerCount = row.clear_count;
      } else {
        e.supporterPower = power;
        e.supporterLevel = level;
        e.supporterCount = row.clear_count;
      }
    }

    const result = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
    chartCache.set(title, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error('Error fetching chart data:', err);
    return [];
  }
}

// ─── 요약 (extreme_class_stats 전체 합산) ───
export async function getSummary(title: string): Promise<ExtremeSummary> {
  const cached = summaryCache.get(title);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
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

// ─── 직업별 통계 (extreme_class_stats 그대로 가져오기) ───
export async function getClassStats(title: string): Promise<ClassStat[]> {
  const cached = classStatsCache.get(title);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
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
