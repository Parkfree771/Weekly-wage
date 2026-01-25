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

    console.log('Saved successfully:', data);
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
    const pageSize = 1000;
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

// 조건별 시뮬레이션 결과 조회
export async function getSimulationRecords(
  isSuccession: boolean,
  equipmentType: 'weapon' | 'armor',
  useBreath: boolean,
  fromLevel: number
): Promise<SimulationRecord[]> {
  try {
    const equipmentName = isSuccession
      ? (equipmentType === 'weapon' ? '전율 무기' : '전율 방어구')
      : (equipmentType === 'weapon' ? '업화 무기' : '업화 방어구');

    const { data, error } = await supabase
      .from('refining_results')
      .select('*')
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

    return data as SimulationRecord[];
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
    const pageSize = 1000;
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
