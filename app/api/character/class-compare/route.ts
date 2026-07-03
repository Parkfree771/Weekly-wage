import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { classRuleFor } from '@/lib/class-spec-icon';

// 직업의 두 스펙(예: 창술사 절정/절제) 비교 통계.
// 스펙별 인원·평균 전투력·평균 아이템레벨 + 주력 코어 사용 순위(장착 비율)를 반환.
// class-spec-icon과 동일하게 깨달음 시그니처 노드 유무로 스펙을 판별한다.

const TOP_CORES = 10;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class') || '';
  // 화이트리스트 검증: SPEC_RULES에 있는 직업명만 통과 (sig도 규칙 상수에서만 나옴)
  const rule = classRuleFor(className);
  if (!rule) {
    return NextResponse.json({ message: '알 수 없는 직업입니다.' }, { status: 400 });
  }

  try {
    // 깨달음 배열 + 시그니처 유무를 한 번 계산해 두 집계가 공유
    const base = `
      WITH cls AS (
        SELECT cores,
               GREATEST(combat_power, COALESCE(max_combat_power, 0)) AS cp,
               GREATEST(item_level, COALESCE(max_item_level, 0)) AS il,
               EXISTS (SELECT 1 FROM jsonb_array_elements(
                   CASE WHEN jsonb_typeof(data->'arkPassive'->'effects') = 'array'
                        THEN data->'arkPassive'->'effects' ELSE '[]'::jsonb END) AS ee
                 WHERE ee->>'category' = '깨달음' AND ee->>'name' LIKE $2) AS has_sig,
               EXISTS (SELECT 1 FROM jsonb_array_elements(
                   CASE WHEN jsonb_typeof(data->'arkPassive'->'effects') = 'array'
                        THEN data->'arkPassive'->'effects' ELSE '[]'::jsonb END) AS ee
                 WHERE ee->>'category' = '깨달음') AS has_enl
        FROM characters
        WHERE class_name = $1
      )
    `;
    const params = [className, `%${rule.sig}%`];

    // 1) 스펙별 인원·평균 (최대 기록 기준 — 랭킹·통계와 동일)
    const aggRows = (await sql.query(
      `${base}
       SELECT has_sig, count(*) AS cnt,
              round(avg(cp), 2) AS avg_cp, round(avg(il), 2) AS avg_il
       FROM cls WHERE has_enl
       GROUP BY has_sig`,
      params
    )) as any[];

    // 2) 스펙별 코어 사용 순위 (mode(): 가장 흔한 등급을 대표 등급으로)
    const coreRows = (await sql.query(
      `${base}
       SELECT has_sig, e->>'name' AS name,
              max(e->>'icon') AS icon,
              mode() WITHIN GROUP (ORDER BY e->>'grade') AS grade,
              count(*) AS cnt
       FROM cls,
            jsonb_array_elements(CASE WHEN jsonb_typeof(cores) = 'array' THEN cores ELSE '[]'::jsonb END) AS e
       WHERE has_enl AND e->>'name' IS NOT NULL AND e->>'name' <> ''
       GROUP BY has_sig, e->>'name'
       ORDER BY cnt DESC`,
      params
    )) as any[];

    const buildSpec = (specId: string, hasSig: boolean) => {
      const agg = aggRows.find(r => r.has_sig === hasSig);
      const count = agg ? Number(agg.cnt) : 0;
      const cores = coreRows
        .filter(r => r.has_sig === hasSig)
        .slice(0, TOP_CORES)
        .map(r => ({
          name: r.name as string,
          icon: (r.icon as string) || null,
          grade: (r.grade as string) || null,
          count: Number(r.cnt),
          pct: count > 0 ? Math.round((Number(r.cnt) / count) * 100) : 0,
        }));
      return {
        specId,
        count,
        avgCombatPower: agg ? Number(agg.avg_cp) : 0,
        avgItemLevel: agg ? Number(agg.avg_il) : 0,
        cores,
      };
    };

    const res = NextResponse.json({
      className,
      specs: [buildSpec(rule.withId, true), buildSpec(rule.elseId, false)],
    });
    // 직업별 캐시 키 분리 + 5분 엣지 캐시 (랭킹·통계 API와 동일 정책)
    res.headers.set('Netlify-Vary', 'query');
    res.headers.set('Netlify-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[class-compare-api] error:', err);
    return NextResponse.json({ message: '스펙 비교 통계를 불러올 수 없습니다.' }, { status: 500 });
  }
}
