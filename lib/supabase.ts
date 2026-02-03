import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 재련 결과 저장 타입
export interface RefiningResult {
  equipment_type: 'weapon' | 'armor';
  equipment_name: string;
  is_succession: boolean;
  from_level: number;
  to_level: number;
  attempts: number;
  use_breath: boolean;

  // 계승 전 재료
  destruction_stone?: number;
  guardian_stone?: number;
  breakthrough_stone?: number;
  abidos?: number;

  // 계승 후 재료
  destruction_crystal?: number;
  guardian_crystal?: number;
  great_breakthrough?: number;
  advanced_abidos?: number;
  shilling?: number;

  // 공통
  fate_fragment?: number;
  gold?: number;
  lava_breath?: number;
  glacier_breath?: number;
  breath_count?: number;  // 숨결 사용 횟수
  final_jangin?: number;  // 성공 시점 장인의 기운 (%)
}

// 재련 결과 저장 함수
export async function saveRefiningResult(result: RefiningResult): Promise<boolean> {
  try {
    console.log('Saving refining result:', JSON.stringify(result, null, 2));

    const { data, error } = await supabase
      .from('refining_results')
      .insert([result])
      .select();

    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error saving refining result:', err?.message || err);
    return false;
  }
}

// 통계 조회 함수
export async function getRefiningStats(
  equipmentName: string,
  isSuccession: boolean,
  fromLevel: number,
  toLevel: number
): Promise<{ avgAttempts: number; totalSamples: number } | null> {
  try {
    const { data, error } = await supabase
      .from('refining_results')
      .select('attempts')
      .eq('equipment_name', equipmentName)
      .eq('is_succession', isSuccession)
      .eq('from_level', fromLevel)
      .eq('to_level', toLevel);

    if (error || !data || data.length === 0) {
      return null;
    }

    const totalAttempts = data.reduce((sum, row) => sum + row.attempts, 0);
    return {
      avgAttempts: Math.round((totalAttempts / data.length) * 10) / 10,
      totalSamples: data.length
    };
  } catch (err) {
    console.error('Error fetching refining stats:', err);
    return null;
  }
}

// 레벨별 통계 타입
export interface LevelStats {
  fromLevel: number;
  toLevel: number;
  avgAttempts: number;
  totalSamples: number;
}

// 전체 레벨 통계 조회 함수 (테이블용) - pagination으로 전체 데이터 조회
export async function getAllLevelStats(
  isSuccession: boolean,
  equipmentType: 'weapon' | 'armor'
): Promise<LevelStats[]> {
  try {
    const equipmentName = isSuccession
      ? (equipmentType === 'weapon' ? '전율 무기' : '전율 방어구')
      : (equipmentType === 'weapon' ? '업화 무기' : '업화 방어구');

    // 레벨별로 그룹화
    const grouped: Record<string, { attempts: number[]; fromLevel: number; toLevel: number }> = {};
    const pageSize = 10000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('refining_results')
        .select('from_level, to_level, attempts')
        .eq('equipment_name', equipmentName)
        .eq('is_succession', isSuccession)
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of data) {
        const key = `${row.from_level}-${row.to_level}`;
        if (!grouped[key]) {
          grouped[key] = { attempts: [], fromLevel: row.from_level, toLevel: row.to_level };
        }
        grouped[key].attempts.push(row.attempts);
      }

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }

    if (Object.keys(grouped).length === 0) {
      return [];
    }

    // 통계 계산
    const stats: LevelStats[] = [];
    for (const key in grouped) {
      const group = grouped[key];
      const totalAttempts = group.attempts.reduce((sum, a) => sum + a, 0);
      stats.push({
        fromLevel: group.fromLevel,
        toLevel: group.toLevel,
        avgAttempts: Math.round((totalAttempts / group.attempts.length) * 10) / 10,
        totalSamples: group.attempts.length
      });
    }

    // fromLevel 기준 정렬
    stats.sort((a, b) => a.fromLevel - b.fromLevel);

    return stats;
  } catch (err) {
    console.error('Error fetching all level stats:', err);
    return [];
  }
}

// 개별 시뮬레이션 결과 타입
export interface SimulationRecord {
  id: number;
  attempts: number;
  use_breath: boolean;
  breath_count: number | null;
  created_at: string;
  // 재료들
  fate_fragment: number | null;
  gold: number | null;
  // 계승 전
  destruction_stone: number | null;
  guardian_stone: number | null;
  breakthrough_stone: number | null;
  abidos: number | null;
  // 계승 후
  destruction_crystal: number | null;
  guardian_crystal: number | null;
  great_breakthrough: number | null;
  advanced_abidos: number | null;
  shilling: number | null;
  // 숨결
  lava_breath: number | null;
  glacier_breath: number | null;
  // 장인의 기운
  final_jangin: number | null;
}

// 캐시 관련 상수 및 유틸
const CACHE_TTL = 60 * 60 * 1000; // 1시간 (밀리초)
const CACHE_PREFIX = 'refining_stats_';

interface CacheData {
  data: SimulationRecord[];
  timestamp: number;
}

// 캐시에서 데이터 가져오기
function getFromCache(key: string): SimulationRecord[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const { data, timestamp }: CacheData = JSON.parse(cached);
    const now = Date.now();

    // 1시간 이내면 캐시 사용
    if (now - timestamp < CACHE_TTL) {
      console.log(`[Cache Hit] ${key}`);
      return data;
    }

    // 만료된 캐시 삭제
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
  } catch {
    return null;
  }
}

// 캐시에 데이터 저장
function saveToCache(key: string, data: SimulationRecord[]): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
  } catch (e) {
    // localStorage 용량 초과 시 오래된 캐시 정리
    console.warn('Cache save failed, clearing old caches');
    clearOldCaches();
  }
}

// 오래된 캐시 정리
function clearOldCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // 무시
  }
}

// 조건별 시뮬레이션 결과 조회 (캐싱 적용)
export async function getSimulationRecords(
  isSuccession: boolean,
  equipmentType: 'weapon' | 'armor',
  useBreath: boolean,
  fromLevel: number
): Promise<SimulationRecord[]> {
  // 캐시 키 생성
  const cacheKey = `${isSuccession ? 'succ' : 'pre'}_${equipmentType}_${useBreath ? 'breath' : 'nobreath'}_${fromLevel}`;

  // 캐시 확인
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const equipmentName = isSuccession
      ? (equipmentType === 'weapon' ? '전율 무기' : '전율 방어구')
      : (equipmentType === 'weapon' ? '업화 무기' : '업화 방어구');

    // 필요한 컬럼만 선택 (데이터 전송량 절감)
    const { data, error } = await supabase
      .from('refining_results')
      .select(`
        id,
        attempts,
        final_jangin,
        destruction_crystal,
        guardian_crystal,
        great_breakthrough,
        advanced_abidos,
        fate_fragment,
        gold,
        lava_breath,
        glacier_breath
      `)
      .eq('equipment_name', equipmentName)
      .eq('is_succession', isSuccession)
      .eq('use_breath', useBreath)
      .eq('from_level', fromLevel)
      .order('attempts', { ascending: true })
      .limit(10000);

    if (error || !data) {
      console.error('Error fetching simulation records:', error);
      return [];
    }

    const records = data as SimulationRecord[];

    // 캐시에 저장
    saveToCache(cacheKey, records);

    return records;
  } catch (err) {
    console.error('Error fetching simulation records:', err);
    return [];
  }
}

// 전체 시뮬레이션 기록 수 조회
export async function getTotalSimulationCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('refining_results')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching total count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error fetching total simulation count:', err);
    return 0;
  }
}

// ============================================
// 집계 테이블 기반 통계 조회 (egress 최적화)
// ============================================

export interface RefiningStatsSummary {
  total_count: number;
  jangin_avg: number;
  jangin_min: number;
  jangin_max: number;
  jangin_stddev: number | null;
  jangin_p25: number;
  jangin_p50: number;
  jangin_p75: number;
  // 히스토그램
  hist_0_10: number;
  hist_10_20: number;
  hist_20_30: number;
  hist_30_40: number;
  hist_40_50: number;
  hist_50_60: number;
  hist_60_70: number;
  hist_70_80: number;
  hist_80_90: number;
  hist_90_100: number;
  // 중앙값 재료
  median_attempts: number;
  median_destruction_crystal: number;
  median_guardian_crystal: number;
  median_great_breakthrough: number;
  median_advanced_abidos: number;
  median_fate_fragment: number;
  median_gold: number;
  median_lava_breath: number;
  median_glacier_breath: number;
}

// 집계 테이블에서 통계 조회 (단일 breath_type)
export async function getRefiningStatsSummary(
  equipmentType: 'weapon' | 'armor',
  breathType: 'full' | 'partial' | 'none',
  fromLevel: number
): Promise<RefiningStatsSummary | null> {
  try {
    const equipmentName = equipmentType === 'weapon' ? '전율 무기' : '전율 방어구';

    const { data, error } = await supabase
      .from('refining_stats_summary')
      .select('*')
      .eq('equipment_name', equipmentName)
      .eq('is_succession', true)
      .eq('breath_type', breathType)
      .eq('from_level', fromLevel)
      .single();

    if (error || !data) {
      console.log('No stats found for:', { equipmentName, breathType, fromLevel });
      return null;
    }

    return data as RefiningStatsSummary;
  } catch (err) {
    console.error('Error fetching refining stats summary:', err);
    return null;
  }
}

// 집계 테이블에서 전체(all) 통계 조회 - full + partial + none 합산
export async function getRefiningStatsSummaryAll(
  equipmentType: 'weapon' | 'armor',
  fromLevel: number
): Promise<RefiningStatsSummary | null> {
  try {
    const equipmentName = equipmentType === 'weapon' ? '전율 무기' : '전율 방어구';

    const { data, error } = await supabase
      .from('refining_stats_summary')
      .select('*')
      .eq('equipment_name', equipmentName)
      .eq('is_succession', true)
      .eq('from_level', fromLevel);

    if (error || !data || data.length === 0) {
      return null;
    }

    // 여러 breath_type 합산
    const totalCount = data.reduce((sum, d) => sum + (d.total_count || 0), 0);
    if (totalCount === 0) return null;

    // 가중 평균 계산
    const weightedAvg = data.reduce((sum, d) => sum + (d.jangin_avg || 0) * (d.total_count || 0), 0) / totalCount;

    // min/max
    const allMins = data.map(d => d.jangin_min).filter(v => v != null);
    const allMaxs = data.map(d => d.jangin_max).filter(v => v != null);

    // 히스토그램 합산
    const histSum = {
      hist_0_10: data.reduce((sum, d) => sum + (d.hist_0_10 || 0), 0),
      hist_10_20: data.reduce((sum, d) => sum + (d.hist_10_20 || 0), 0),
      hist_20_30: data.reduce((sum, d) => sum + (d.hist_20_30 || 0), 0),
      hist_30_40: data.reduce((sum, d) => sum + (d.hist_30_40 || 0), 0),
      hist_40_50: data.reduce((sum, d) => sum + (d.hist_40_50 || 0), 0),
      hist_50_60: data.reduce((sum, d) => sum + (d.hist_50_60 || 0), 0),
      hist_60_70: data.reduce((sum, d) => sum + (d.hist_60_70 || 0), 0),
      hist_70_80: data.reduce((sum, d) => sum + (d.hist_70_80 || 0), 0),
      hist_80_90: data.reduce((sum, d) => sum + (d.hist_80_90 || 0), 0),
      hist_90_100: data.reduce((sum, d) => sum + (d.hist_90_100 || 0), 0),
    };

    // 가중 백분위수 (가장 많은 데이터를 가진 breath_type 기준)
    const maxCountData = data.reduce((max, d) => (d.total_count > max.total_count ? d : max), data[0]);

    // 가중 중앙값 재료 (count 기준 가중 평균)
    const medianMaterials = {
      median_attempts: Math.round(data.reduce((sum, d) => sum + (d.median_attempts || 0) * (d.total_count || 0), 0) / totalCount),
      median_destruction_crystal: Math.round(data.reduce((sum, d) => sum + (d.median_destruction_crystal || 0) * (d.total_count || 0), 0) / totalCount),
      median_guardian_crystal: Math.round(data.reduce((sum, d) => sum + (d.median_guardian_crystal || 0) * (d.total_count || 0), 0) / totalCount),
      median_great_breakthrough: Math.round(data.reduce((sum, d) => sum + (d.median_great_breakthrough || 0) * (d.total_count || 0), 0) / totalCount),
      median_advanced_abidos: Math.round(data.reduce((sum, d) => sum + (d.median_advanced_abidos || 0) * (d.total_count || 0), 0) / totalCount),
      median_fate_fragment: Math.round(data.reduce((sum, d) => sum + (d.median_fate_fragment || 0) * (d.total_count || 0), 0) / totalCount),
      median_gold: Math.round(data.reduce((sum, d) => sum + (d.median_gold || 0) * (d.total_count || 0), 0) / totalCount),
      median_lava_breath: Math.round(data.reduce((sum, d) => sum + (d.median_lava_breath || 0) * (d.total_count || 0), 0) / totalCount),
      median_glacier_breath: Math.round(data.reduce((sum, d) => sum + (d.median_glacier_breath || 0) * (d.total_count || 0), 0) / totalCount),
    };

    return {
      total_count: totalCount,
      jangin_avg: Math.round(weightedAvg * 100) / 100,
      jangin_min: Math.min(...allMins),
      jangin_max: Math.max(...allMaxs),
      jangin_stddev: maxCountData.jangin_stddev,
      jangin_p25: maxCountData.jangin_p25,
      jangin_p50: maxCountData.jangin_p50,
      jangin_p75: maxCountData.jangin_p75,
      ...histSum,
      ...medianMaterials,
    };
  } catch (err) {
    console.error('Error fetching all refining stats summary:', err);
    return null;
  }
}

// 레벨별 샘플 수 조회 (버튼에 표시용) - pagination으로 전체 데이터 조회
export async function getLevelSampleCounts(
  isSuccession: boolean,
  equipmentType: 'weapon' | 'armor',
  useBreath: boolean
): Promise<Record<number, number>> {
  try {
    const equipmentName = isSuccession
      ? (equipmentType === 'weapon' ? '전율 무기' : '전율 방어구')
      : (equipmentType === 'weapon' ? '업화 무기' : '업화 방어구');

    const counts: Record<number, number> = {};
    const pageSize = 10000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('refining_results')
        .select('from_level')
        .eq('equipment_name', equipmentName)
        .eq('is_succession', isSuccession)
        .eq('use_breath', useBreath)
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of data) {
        counts[row.from_level] = (counts[row.from_level] || 0) + 1;
      }

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }

    return counts;
  } catch (err) {
    console.error('Error fetching level sample counts:', err);
    return {};
  }
}

// ============================================
// 상급재련 통계 (Advanced Refining Statistics)
// ============================================

// 상급재련 결과 저장 타입
export interface AdvancedRefiningResult {
  equipment_type: 'weapon' | 'armor';
  equipment_name: string;
  from_level: number;  // 0, 10, 20, 30
  to_level: number;    // 10, 20, 30, 40
  total_turns: number;

  // 성공 등급별 횟수
  success_count: number;
  great_success_count: number;
  super_success_count: number;

  // 선조턴 관련
  bonus_turns: number;
  ancestor_cards: Record<string, number>;  // 카드별 등장 횟수 (JSON)

  // 재료 사용량
  destruction_stone?: number;
  guardian_stone?: number;
  breakthrough_stone?: number;
  abidos?: number;
  fate_fragment?: number;
  gold?: number;
  lava_breath?: number;
  glacier_breath?: number;
  book_1?: number;  // 1단계 책
  book_2?: number;  // 2단계 책
  book_3?: number;  // 3단계 책
  book_4?: number;  // 4단계 책

  // 보조재료 사용 패턴
  auxiliary_pattern: {
    none: number;    // 보조재료 미사용 횟수
    breath: number;  // 숨결만 사용 횟수
    book: number;    // 책만 사용 횟수
    both: number;    // 둘 다 사용 횟수
  };
}

// 상급재련 결과 저장 함수
export async function saveAdvancedRefiningResult(result: AdvancedRefiningResult): Promise<boolean> {
  try {
    console.log('Saving advanced refining result:', JSON.stringify(result, null, 2));

    const { data, error } = await supabase
      .from('advanced_refining_results')
      .insert([{
        ...result,
        ancestor_cards: JSON.stringify(result.ancestor_cards),
        auxiliary_pattern: JSON.stringify(result.auxiliary_pattern),
      }])
      .select();

    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error saving advanced refining result:', err?.message || err);
    return false;
  }
}

// 상급재련 통계 조회 함수
export async function getAdvancedRefiningStats(
  equipmentType: 'weapon' | 'armor',
  fromLevel: number,
  toLevel: number
): Promise<{
  avgTurns: number;
  avgSuccess: number;
  avgGreat: number;
  avgSuper: number;
  totalSamples: number;
} | null> {
  try {
    const equipmentName = equipmentType === 'weapon' ? '업화 무기' : '업화 방어구';

    const { data, error } = await supabase
      .from('advanced_refining_results')
      .select('total_turns, success_count, great_success_count, super_success_count')
      .eq('equipment_name', equipmentName)
      .eq('from_level', fromLevel)
      .eq('to_level', toLevel);

    if (error || !data || data.length === 0) {
      return null;
    }

    const totalTurns = data.reduce((sum, row) => sum + row.total_turns, 0);
    const totalSuccess = data.reduce((sum, row) => sum + row.success_count, 0);
    const totalGreat = data.reduce((sum, row) => sum + row.great_success_count, 0);
    const totalSuper = data.reduce((sum, row) => sum + row.super_success_count, 0);

    return {
      avgTurns: Math.round((totalTurns / data.length) * 10) / 10,
      avgSuccess: Math.round((totalSuccess / data.length) * 10) / 10,
      avgGreat: Math.round((totalGreat / data.length) * 10) / 10,
      avgSuper: Math.round((totalSuper / data.length) * 10) / 10,
      totalSamples: data.length
    };
  } catch (err) {
    console.error('Error fetching advanced refining stats:', err);
    return null;
  }
}

// 상급재련 전체 레벨별 통계 조회
export interface AdvancedLevelStats {
  fromLevel: number;
  toLevel: number;
  avgTurns: number;
  avgSuccess: number;
  avgGreat: number;
  avgSuper: number;
  totalSamples: number;
}

export async function getAllAdvancedLevelStats(
  equipmentType: 'weapon' | 'armor'
): Promise<AdvancedLevelStats[]> {
  try {
    const equipmentName = equipmentType === 'weapon' ? '업화 무기' : '업화 방어구';

    const grouped: Record<string, {
      turns: number[];
      success: number[];
      great: number[];
      super: number[];
      fromLevel: number;
      toLevel: number;
    }> = {};

    const pageSize = 10000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('advanced_refining_results')
        .select('from_level, to_level, total_turns, success_count, great_success_count, super_success_count')
        .eq('equipment_name', equipmentName)
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of data) {
        const key = `${row.from_level}-${row.to_level}`;
        if (!grouped[key]) {
          grouped[key] = {
            turns: [],
            success: [],
            great: [],
            super: [],
            fromLevel: row.from_level,
            toLevel: row.to_level
          };
        }
        grouped[key].turns.push(row.total_turns);
        grouped[key].success.push(row.success_count);
        grouped[key].great.push(row.great_success_count);
        grouped[key].super.push(row.super_success_count);
      }

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }

    if (Object.keys(grouped).length === 0) {
      return [];
    }

    const stats: AdvancedLevelStats[] = [];
    for (const key in grouped) {
      const group = grouped[key];
      const count = group.turns.length;
      stats.push({
        fromLevel: group.fromLevel,
        toLevel: group.toLevel,
        avgTurns: Math.round((group.turns.reduce((a, b) => a + b, 0) / count) * 10) / 10,
        avgSuccess: Math.round((group.success.reduce((a, b) => a + b, 0) / count) * 10) / 10,
        avgGreat: Math.round((group.great.reduce((a, b) => a + b, 0) / count) * 10) / 10,
        avgSuper: Math.round((group.super.reduce((a, b) => a + b, 0) / count) * 10) / 10,
        totalSamples: count
      });
    }

    stats.sort((a, b) => a.fromLevel - b.fromLevel);
    return stats;
  } catch (err) {
    console.error('Error fetching all advanced level stats:', err);
    return [];
  }
}

// 상급재련 전체 시뮬레이션 기록 수 조회
export async function getTotalAdvancedSimulationCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('advanced_refining_results')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching total advanced count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error fetching total advanced simulation count:', err);
    return 0;
  }
}

// ============================================
// 지옥 시뮬레이터 (Hell Simulator)
// ============================================

// 지옥/나락 시뮬 결과 저장 타입
export interface HellSimResult {
  game_mode: 'hell' | 'narak-odd' | 'narak-even';  // 게임 모드
  key_type: 'rare' | 'epic' | 'legendary';
  final_floor: number;
  hidden_rewards: string[];  // 획득한 히든 보상 목록
  box_rewards: string[];     // 최종 상자 보상 목록
  pungyo_count: number;      // 풍요 갯수
  // 나락 전용 필드
  result_type?: 'clear' | 'stop' | 'death';  // 결과 유형 (클리어/중단/완전사망)
  used_revive?: boolean;     // 부활 사용 여부
  death_floor?: number;      // 첫 사망 층 (나락에서 사망 시)
  remaining_chances?: number; // 중단 시 남은 기회 (나락 stop 전용)
}

// 지옥/나락 시뮬 결과 저장 함수
export async function saveHellSimResult(result: HellSimResult): Promise<boolean> {
  try {
    console.log('Saving hell sim result:', JSON.stringify(result, null, 2));

    const { data, error } = await supabase
      .from('hell_sim_results')
      .insert([{
        game_mode: result.game_mode,
        key_type: result.key_type,
        final_floor: result.final_floor,
        hidden_rewards: JSON.stringify(result.hidden_rewards),
        box_rewards: JSON.stringify(result.box_rewards),
        pungyo_count: result.pungyo_count,
        result_type: result.result_type || null,
        used_revive: result.used_revive || false,
        death_floor: result.death_floor || null,
        remaining_chances: result.remaining_chances ?? null,
      }])
      .select();

    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Error saving hell sim result:', err?.message || err);
    return false;
  }
}

// 지옥 시뮬 통계 조회
export interface HellSimStats {
  key_type: string;
  total_count: number;
  avg_floor: number;
  clear_count: number;
  clear_rate: number;
}

export async function getHellSimStats(): Promise<HellSimStats[]> {
  try {
    const { data, error } = await supabase
      .from('hell_sim_results')
      .select('key_type, final_floor');

    if (error || !data || data.length === 0) {
      return [];
    }

    // 열쇠별 그룹화
    const grouped: Record<string, { floors: number[]; clears: number }> = {};

    for (const row of data) {
      if (!grouped[row.key_type]) {
        grouped[row.key_type] = { floors: [], clears: 0 };
      }
      grouped[row.key_type].floors.push(row.final_floor);
      if (row.final_floor >= 100) {
        grouped[row.key_type].clears++;
      }
    }

    const stats: HellSimStats[] = [];
    for (const keyType in grouped) {
      const group = grouped[keyType];
      const total = group.floors.length;
      const avgFloor = group.floors.reduce((a, b) => a + b, 0) / total;

      stats.push({
        key_type: keyType,
        total_count: total,
        avg_floor: Math.round(avgFloor * 10) / 10,
        clear_count: group.clears,
        clear_rate: Math.round((group.clears / total) * 1000) / 10,
      });
    }

    return stats;
  } catch (err) {
    console.error('Error fetching hell sim stats:', err);
    return [];
  }
}

// 지옥 시뮬 전체 데이터 수 조회
export async function getHellSimTotalCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('hell_sim_results')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching hell sim count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error fetching hell sim total count:', err);
    return 0;
  }
}
