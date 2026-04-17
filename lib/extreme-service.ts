import { supabase } from './supabase';

// ─── 서포터 직업 목록 ───
const SUPPORT_CLASSES = ['바드', '홀리나이트', '도화가'];

export function getRole(characterClass: string): 'dealer' | 'supporter' {
  return SUPPORT_CLASSES.includes(characterClass) ? 'supporter' : 'dealer';
}

// ���── 타입 ───
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

// ─── 저장 ───
export async function saveExtremeClear(data: ExtremeClear): Promise<{ success: boolean; error?: string }> {
  try {
    // 같은 ���릭터 + 같은 칭호로 이미 등록했는지 확인
    const { data: existing, error: checkError } = await supabase
      .from('extreme_clears')
      .select('id')
      .eq('character_name', data.character_name)
      .eq('title', data.title)
      .limit(1);

    if (checkError) {
      console.error('Supabase check error:', checkError);
      return { success: false, error: '중복 확인 중 오류가 발생했습니다.' };
    }

    if (existing && existing.length > 0) {
      return { success: false, error: '이미 등록된 캐릭터입니다.' };
    }

    const { error } = await supabase
      .from('extreme_clears')
      .insert([data]);

    if (error) {
      console.error('Supabase insert error:', error);
      return { success: false, error: '저장에 실패했습니다.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving extreme clear:', err);
    return { success: false, error: '저장 중 오류가 발생했습니다.' };
  }
}

// ─── 차트 데이터 조회 ───
export interface DailyChartData {
  date: string;
  dealerPower: number | null;
  supporterPower: number | null;
  dealerLevel: number | null;
  supporterLevel: number | null;
  dealerCount: number;
  supporterCount: number;
}

export async function getChartData(title: string): Promise<DailyChartData[]> {
  try {
    const { data, error } = await supabase
      .from('extreme_clears')
      .select('combat_power, item_level, role, cleared_at')
      .eq('title', title)
      .order('cleared_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    const grouped: Record<string, {
      dealerPower: number[]; supporterPower: number[];
      dealerLevel: number[]; supporterLevel: number[];
    }> = {};

    for (const row of data) {
      const date = row.cleared_at;
      if (!grouped[date]) grouped[date] = { dealerPower: [], supporterPower: [], dealerLevel: [], supporterLevel: [] };
      if (row.role === 'dealer') {
        grouped[date].dealerPower.push(row.combat_power);
        grouped[date].dealerLevel.push(row.item_level);
      } else {
        grouped[date].supporterPower.push(row.combat_power);
        grouped[date].supporterLevel.push(row.item_level);
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    return Object.entries(grouped).map(([date, g]) => ({
      date,
      dealerPower: avg(g.dealerPower),
      supporterPower: avg(g.supporterPower),
      dealerLevel: avg(g.dealerLevel),
      supporterLevel: avg(g.supporterLevel),
      dealerCount: g.dealerPower.length,
      supporterCount: g.supporterPower.length,
    }));
  } catch (err) {
    console.error('Error fetching chart data:', err);
    return [];
  }
}

// ─��─ 통계 요약 ───
export interface ExtremeSummary {
  totalClears: number;
  dealerCount: number;
  supporterCount: number;
  dealerAvgPower: number | null;
  supporterAvgPower: number | null;
}

export async function getSummary(title: string): Promise<ExtremeSummary> {
  try {
    const { data, error } = await supabase
      .from('extreme_clears')
      .select('combat_power, role')
      .eq('title', title);

    if (error || !data || data.length === 0) {
      return { totalClears: 0, dealerCount: 0, supporterCount: 0, dealerAvgPower: null, supporterAvgPower: null };
    }

    const dealers = data.filter(d => d.role === 'dealer');
    const supporters = data.filter(d => d.role === 'supporter');

    return {
      totalClears: data.length,
      dealerCount: dealers.length,
      supporterCount: supporters.length,
      dealerAvgPower: dealers.length > 0 ? Math.round(dealers.reduce((s, d) => s + d.combat_power, 0) / dealers.length) : null,
      supporterAvgPower: supporters.length > 0 ? Math.round(supporters.reduce((s, d) => s + d.combat_power, 0) / supporters.length) : null,
    };
  } catch (err) {
    console.error('Error fetching summary:', err);
    return { totalClears: 0, dealerCount: 0, supporterCount: 0, dealerAvgPower: null, supporterAvgPower: null };
  }
}
