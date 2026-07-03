import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { classRuleFor } from '@/lib/class-spec-icon';
import { coreNumberFor, orderCoreCode } from '@/lib/arkgrid-cores';

// 직업의 두 스펙(예: 창술사 절정/절제) 비교 통계.
// 스펙별 인원·평균 전투력·평균 아이템레벨 + 주력 코어 사용 순위(장착 비율)를 반환.
// + 질서 해/달/별 조합 코드(예: "121") 사용 순위.
// class-spec-icon과 동일하게 깨달음 시그니처 노드 유무로 스펙을 판별한다.

const TOP_CORES = 10;
const TOP_COMBOS = 8;

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

    // 3) 캐릭터별 질서 해/달/별 코어명 (조합 코드 집계용). 스펙별로 JS에서 번호 매핑.
    const pick = (cel: string) =>
      `(SELECT e->>'name' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(cores)='array' THEN cores ELSE '[]'::jsonb END) AS e
          WHERE e->>'name' LIKE '질서%' AND e->>'name' LIKE '%${cel} 코어%' LIMIT 1)`;
    const comboRows = (await sql.query(
      `${base}
       SELECT has_sig, ${pick('해')} AS h, ${pick('달')} AS d, ${pick('별')} AS s
       FROM cls WHERE has_enl`,
      params
    )) as any[];

    const buildCombos = (specId: string, hasSig: boolean) => {
      const counts = new Map<string, number>();
      for (const r of comboRows) {
        if (r.has_sig !== hasSig) continue;
        const code = orderCoreCode(className, specId, [
          { name: r.h || '' }, { name: r.d || '' }, { name: r.s || '' },
        ]);
        if (!code) continue;
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
      const totalCoded = [...counts.values()].reduce((a, b) => a + b, 0);
      return [...counts.entries()]
        .map(([code, count]) => ({
          code,
          count,
          pct: totalCoded > 0 ? Math.round((count / totalCoded) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_COMBOS);
    };

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
          // 질서 코어면 번호(1·2·3), 아니면 null
          num: coreNumberFor(className, specId, r.name as string),
        }));
      // 질서 해/달/별 대표 아이콘(포지션 고정 — 옵션 무관 동일). 조합 표시용.
      const orderIconFor = (cel: '해' | '달' | '별') =>
        coreRows.find(
          r => r.has_sig === hasSig && typeof r.name === 'string'
            && r.name.includes('질서') && r.name.includes(`${cel} 코어`)
        )?.icon || null;
      return {
        specId,
        count,
        avgCombatPower: agg ? Number(agg.avg_cp) : 0,
        avgItemLevel: agg ? Number(agg.avg_il) : 0,
        cores,
        combos: buildCombos(specId, hasSig),
        orderIcons: { 해: orderIconFor('해'), 달: orderIconFor('달'), 별: orderIconFor('별') },
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
