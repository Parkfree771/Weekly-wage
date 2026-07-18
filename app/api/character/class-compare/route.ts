import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { classRuleFor } from '@/lib/class-spec-icon';
import { coreNumberFor, orderCoreCode } from '@/lib/arkgrid-cores';
import { ORDER_CORE_OPTIONS } from '@/data/arkgrid-core-order';

// 직업의 두 스펙(예: 창술사 절정/절제) 비교 통계.
// 스펙별 인원·평균 전투력·평균 아이템레벨 + 주력 코어 사용 순위(장착 비율)를 반환.
// + 질서 해/달/별 조합 코드(예: "121") 사용 순위.
// class-spec-icon과 동일하게 깨달음 시그니처 노드 유무로 스펙을 판별한다.

const TOP_CORES = 10;
const TOP_COMBOS = 8;
const TOP_ENGRAVING_COMBOS = 8;

// 각인 축약 표기 (커뮤니티 관용 표기). 목록에 없는 각인은 전체 이름 그대로 표시.
// 배열 순서 = 조합 문자열 안에서의 표기 순서 (원한 아드 예둔 질증 돌대 …)
const ENGRAVING_ABBR_ORDER: Array<[name: string, abbr: string]> = [
  ['원한', '원한'],
  ['아드레날린', '아드'],
  ['예리한 둔기', '예둔'],
  ['질량 증가', '질증'],
  ['돌격대장', '돌대'],
  ['타격의 대가', '타대'],
  ['결투의 대가', '결대'],
  ['기습의 대가', '기습'],
  ['저주받은 인형', '저받'],
  ['슈퍼 차지', '슈차'],
  ['바리케이드', '바리'],
  ['안정된 상태', '안정'],
  ['정밀 단도', '정단'],
  ['정기 흡수', '정흡'],
  ['급소 타격', '급타'],
  ['마나 효율 증가', '마효'],
  ['각성', '각성'],
  ['구슬동자', '구동'],
  ['속전속결', '속결'],
  ['달인의 저력', '달저'],
  ['전문의', '전문의'],
  ['중갑 착용', '중갑'],
  ['최대 마나 증가', '최마증'],
  ['위기 모면', '위모'],
  ['여신의 가호', '가호'],
  ['번개의 분노', '번분'],
];
const ENGRAVING_ABBR = new Map(ENGRAVING_ABBR_ORDER);
const ENGRAVING_PRIORITY = new Map(ENGRAVING_ABBR_ORDER.map(([name], i) => [name, i]));

// 각인 이름 배열을 관용 순서(원한→아드→예둔→…)로 정렬
function sortEngravingNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const pa = ENGRAVING_PRIORITY.get(a) ?? 999;
    const pb = ENGRAVING_PRIORITY.get(b) ?? 999;
    return pa - pb || a.localeCompare(b, 'ko');
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class') || '';
  // 화이트리스트 검증: SPEC_RULES에 있는 직업명만 통과 (sig도 규칙 상수에서만 나옴)
  const rule = classRuleFor(className);
  if (!rule) {
    return NextResponse.json({ message: '알 수 없는 직업입니다.' }, { status: 400 });
  }

  try {
    // 사전계산 컬럼 기반: spec_id로 시그니처 유무 판별, engraving_names로 각인 집계
    // (data JSONB를 아예 읽지 않음 — 행 수가 늘어도 밀리초 단위 유지)
    // spec_id IS NOT NULL = 깨달음 데이터 있는 캐릭터만 (기존 has_enl 조건과 동일)
    const base = `
      WITH cls AS (
        SELECT cores,
               engraving_names,
               GREATEST(combat_power, COALESCE(max_combat_power, 0)) AS cp,
               GREATEST(item_level, COALESCE(max_item_level, 0)) AS il,
               (spec_id = $2) AS has_sig
        FROM characters
        WHERE class_name = $1 AND spec_id IS NOT NULL
      )
    `;
    const params = [className, rule.withId];

    // 1) 스펙별 인원·평균 (최대 기록 기준 — 랭킹·통계와 동일)
    const aggRows = (await sql.query(
      `${base}
       SELECT has_sig, count(*) AS cnt,
              round(avg(cp), 2) AS avg_cp, round(avg(il), 2) AS avg_il
       FROM cls
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
       WHERE e->>'name' IS NOT NULL AND e->>'name' <> ''
       GROUP BY has_sig, e->>'name'
       ORDER BY cnt DESC`,
      params
    )) as any[];

    // 3) 캐릭터별 질서 해/달/별 코어명 (조합 코드 집계용) + 아크패시브 각인 이름 배열 (각인 조합 집계용).
    //    스펙별 매핑·조합 문자열 생성은 JS에서. 같은 per-캐릭터 조회라 한 쿼리로 합쳐 왕복 1회.
    const pick = (cel: string) =>
      `(SELECT e->>'name' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(cores)='array' THEN cores ELSE '[]'::jsonb END) AS e
          WHERE e->>'name' LIKE '질서%' AND e->>'name' LIKE '%${cel} 코어%' LIMIT 1)`;
    const comboRows = (await sql.query(
      `${base}
       SELECT has_sig, ${pick('해')} AS h, ${pick('달')} AS d, ${pick('별')} AS s,
              engraving_names AS engr_names
       FROM cls`,
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

    // 각인 조합 사용 순위 — 아크패시브 각인 세트가 같은 캐릭터끼리 묶음.
    // 각인은 항상 5개 풀세트이므로 정확히 5개인 캐릭터만 집계 (미만/초과 = 불완전 데이터 제외).
    // 아이콘은 클라이언트가 ENGRAVING_ICONS(이름→로컬 에셋)로 매핑하므로 names만 내려준다.
    const buildEngravingCombos = (hasSig: boolean) => {
      const counts = new Map<string, { names: string[]; count: number }>();
      let totalWithEngr = 0;
      for (const r of comboRows) {
        if (r.has_sig !== hasSig) continue;
        // 어빌스톤 감소 각인(공격력 감소 등)이 아크패시브 목록에 섞여 오는 행이 있어 제외
        const names: string[] = (Array.isArray(r.engr_names) ? r.engr_names.filter(Boolean) : [])
          .filter((n: string) => !n.endsWith('감소'));
        if (names.length !== 5) continue;
        totalWithEngr++;
        const sorted = sortEngravingNames(names);
        const key = sorted.join('|');
        const cur = counts.get(key);
        if (cur) cur.count++;
        else counts.set(key, { names: sorted, count: 1 });
      }
      return [...counts.values()]
        .map(({ names, count }) => ({
          label: names.map(n => ENGRAVING_ABBR.get(n) ?? n).join(' '),
          names,
          count,
          pct: totalWithEngr > 0 ? Math.round((count / totalWithEngr) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_ENGRAVING_COMBOS);
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
        engravingCombos: buildEngravingCombos(hasSig),
        orderIcons: { 해: orderIconFor('해'), 달: orderIconFor('달'), 별: orderIconFor('별') },
        // 코어 번호(1·2·3) → 옵션명 테이블. 조합 코드의 각 자리가 실제 어떤 코어인지 툴팁용
        orderNames: ORDER_CORE_OPTIONS[className]?.[specId] ?? null,
      };
    };

    const res = NextResponse.json({
      className,
      specs: [buildSpec(rule.withId, true), buildSpec(rule.elseId, false)],
    });
    // 직업별 캐시 키 분리. 집계 통계라 실시간성이 덜 중요 — 30분 엣지 캐시 + 만료 후 하루까지
    // 옛 응답 즉시 반환·백그라운드 갱신(SWR). durable: 엣지 노드 공유 캐시로 콜드 미스 최소화
    res.headers.set('Netlify-Vary', 'query');
    res.headers.set('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=1800, stale-while-revalidate=86400');
    res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400');
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[class-compare-api] error:', err);
    return NextResponse.json({ message: '스펙 비교 통계를 불러올 수 없습니다.' }, { status: 500 });
  }
}
