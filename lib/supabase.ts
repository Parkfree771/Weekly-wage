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
