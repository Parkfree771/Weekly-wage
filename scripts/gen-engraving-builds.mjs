// 직업별(스펙별) 대표 각인 빌드 데이터 생성기.
// 소스: Neon characters 테이블에 저장된 실제 유저 캐릭터들의 장착 각인.
// 방식: 스펙(직업+깨달음)별로 각인 등장 빈도를 집계해
//   - main: 빈도 상위 5개 (장착 각인)
//   - sub : 그 다음 순위 중 표본 2 이상 & 비율 15% 이상 (조건부 교체용 서브) 최대 3개
// 결과를 lib/engraving-builds.generated.ts 로 출력. (추측 아님 — 실데이터 집계)
//
// 실행: node scripts/gen-engraving-builds.mjs

import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// DATABASE_URL 로드 (.env.local)
const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const m = env.match(/DATABASE_URL=("?)(.*?)\1\s*$/m);
const sql = neon(m ? m[2] : '');

// className → 스펙 판별 규칙 (lib/class-spec-icon.ts 와 동일하게 유지)
const SPEC_RULES = {
  '디스트로이어': { sig: '분노의 망치', withId: '디트 분망', elseId: '디트 중수' },
  '슬레이어': { sig: '포식자', withId: '슬레 포식', elseId: '슬레 처단' },
  '워로드': { sig: '고독한 기사', withId: '워로드 고기', elseId: '워로드 전태' },
  '가디언나이트': { sig: '업화의 계승자', withId: '가나 업화', elseId: '가나 드드' },
  '홀리나이트': { sig: '축복의 오라', withId: '홀나 축오', elseId: '홀나 심판자' },
  '발키리': { sig: '해방자', withId: '발키리 해방자', elseId: '발키리 빛의기사' },
  '버서커': { sig: '광기', withId: '버서커 광기', elseId: '버서커 비기' },
  '배틀마스터': { sig: '초심', withId: '배마 초심', elseId: '배마 오의' },
  '인파이터': { sig: '극의 : 체술', withId: '인파 체술', elseId: '인파 충단' },
  '기공사': { sig: '역천지체', withId: '기공 역천', elseId: '기공 세맥' },
  '창술사': { sig: '절정', withId: '창술 절정', elseId: '창술 절제' },
  '스트라이커': { sig: '일격필살', withId: '스커 일격', elseId: '스커 난무' },
  '브레이커': { sig: '권왕', withId: '브커 권왕', elseId: '브커 수라' },
  '데빌헌터': { sig: '전술 탄환', withId: '데헌 전탄', elseId: '데헌 핸건' },
  '호크아이': { sig: '죽음의 습격', withId: '호크 죽습', elseId: '호크 두동' },
  '블래스터': { sig: '포격 강화', withId: '블래 포강', elseId: '블래 화강' },
  '스카우터': { sig: '진화의 유산', withId: '스카 유산', elseId: '스카 기술' },
  '건슬링어': { sig: '피스메이커', withId: '건슬 피메', elseId: '건슬 사시' },
  '바드': { sig: '절실한 구원', withId: '바드 절구', elseId: '바드 진용' },
  '서머너': { sig: '상급 소환사', withId: '서머너 상소', elseId: '서머너 교감' },
  '아르카나': { sig: '황제의 칙령', withId: '알카 황제', elseId: '알카 황후' }, // '황제'는 황후 트리 "황제의 자비"에 오매칭 → 전용 노드로 한정
  '소서리스': { sig: '점화', withId: '소서 점화', elseId: '소서 환류' },
  '데모닉': { sig: '멈출 수 없는 충동', withId: '데모닉 충동', elseId: '데모닉 억제' },
  '블레이드': { sig: '잔재된 기운', withId: '블레 잔재', elseId: '블레 버스트' },
  '리퍼': { sig: '갈증', withId: '리퍼 갈증', elseId: '리퍼 달소' },
  '소울이터': { sig: '만월의 집행자', withId: '소울 만월', elseId: '소울 그믐' },
  '도화가': { sig: '만개', withId: '도화가 만개', elseId: '도화가 회귀' },
  '기상술사': { sig: '질풍노도', withId: '기상 질풍', elseId: '기상 이슬비' },
  '환수사': { sig: '야성', withId: '환수 야성', elseId: '환수 각성' },
};

// 카던(파밍) 세팅 각인 — 레이드 대표 빌드 집계에서 제외.
const EXCLUDE_ENGRAVINGS = new Set([
  '선수필승',
  '승부사',
]);

function resolveSpecId(className, enl) {
  const r = SPEC_RULES[className];
  if (!r) return null;
  if (!enl || enl.length === 0) return null; // 깨달음 데이터 없으면 스펙 추정 안 함
  return enl.some((n) => n && n.includes(r.sig)) ? r.withId : r.elseId;
}

const rows = await sql`
  SELECT class_name,
         data->'engravings' AS eng,
         data->'combatStats' AS cs,
         (SELECT array_agg(e->>'name') FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(data->'arkPassive'->'effects')='array'
                 THEN data->'arkPassive'->'effects' ELSE '[]'::jsonb END) AS e
           WHERE e->>'category'='깨달음') AS enl
  FROM characters`;

// 캐릭터의 상위 2전투특성 조합 → '특치'/'치신'/'특신' (없으면 null)
//   우선순위 특>치>신 순으로 정렬해 표기.
function statPair(cs) {
  if (!cs) return null;
  const arr = [
    ['특', Number(cs.specialization) || 0],
    ['치', Number(cs.crit) || 0],
    ['신', Number(cs.swiftness) || 0],
  ];
  arr.sort((a, b) => b[1] - a[1]);
  if (arr[1][1] <= 0) return null; // 저레벨 등 특성 미투자
  const order = { 특: 0, 치: 1, 신: 2 };
  const top2 = [arr[0][0], arr[1][0]].sort((a, b) => order[a] - order[b]);
  return top2.join('');
}

// 스펙별 집계: 각인 빈도·캐릭터별 각인세트·전투특성 조합
const bySpec = new Map(); // specId -> { sample, eng: Map, sets: [][], stat: Map }
for (const r of rows) {
  const enl = Array.isArray(r.enl) ? r.enl.filter(Boolean) : [];
  const id = resolveSpecId(r.class_name, enl);
  if (!id) continue;
  if (!bySpec.has(id)) bySpec.set(id, { sample: 0, eng: new Map(), sets: [], stat: new Map() });
  const s = bySpec.get(id);
  s.sample++;
  const set = [];
  for (const e of Array.isArray(r.eng) ? r.eng : []) {
    if (!e?.name || EXCLUDE_ENGRAVINGS.has(e.name)) continue;
    if (!set.includes(e.name)) set.push(e.name);
    s.eng.set(e.name, (s.eng.get(e.name) || 0) + 1);
  }
  s.sets.push(set);
  const sp = statPair(r.cs);
  if (sp) s.stat.set(sp, (s.stat.get(sp) || 0) + 1);
}

// 슬롯 도출: 동시출현(co-occurrence)으로 '같은 칸(서로 택1)'을 판별.
//  핵심: 각 캐릭은 슬롯당 1개만 장착 → 같은 칸 후보끼리는 거의 동시장착 안 함(상호 배타),
//        다른 칸 각인끼리는 자주 같이 장착됨.
//  - 노이즈 제거(표본 2+·15%+) 후 빈도순으로 각인을 슬롯에 배치
//  - 기존 슬롯의 모든 멤버와 상호 배타(동시출현 <= noise)면 그 슬롯에 합류('A or B'), 아니면 새 슬롯
//  - 슬롯 최대 5개(대표 빈도 낮은 칸부터 버림)
// or 후보 최소 비율: 너무 낮으면 소수의 비주류 픽(예: 기상 질풍 바리케이드 17%)이 끼어듦.
const ALT_RATIO = 0.2;
const builds = {};
for (const [id, s] of bySpec.entries()) {
  const sample = s.sample;
  const freq = s.eng;
  const minCount = sample >= 4 ? 2 : 1;
  const noise = Math.floor(sample * 0.1); // 동시출현 허용 노이즈
  const cooc = (a, b) =>
    s.sets.reduce((k, set) => k + (set.includes(a) && set.includes(b) ? 1 : 0), 0);

  let relevant = [...freq.entries()]
    .filter(([, c]) => c >= minCount && c / sample >= ALT_RATIO)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .map(([n]) => n);
  if (relevant.length === 0) {
    relevant = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .slice(0, 5)
      .map(([n]) => n);
  }

  const slots = [];
  for (const e of relevant) {
    let placed = false;
    for (const slot of slots) {
      if (slot.every((m) => cooc(e, m) <= noise)) {
        slot.push(e); // 슬롯 멤버 전원과 상호 배타 → 같은 칸 'or'
        placed = true;
        break;
      }
    }
    if (!placed) slots.push([e]);
  }
  // 슬롯 내부는 빈도순, 슬롯 자체는 대표(최다빈도 멤버) 내림차순
  for (const slot of slots)
    slot.sort((a, b) => freq.get(b) - freq.get(a) || a.localeCompare(b, 'ko'));
  slots.sort((A, B) => freq.get(B[0]) - freq.get(A[0]) || A[0].localeCompare(B[0], 'ko'));

  // 전투특성 조합: 최다 + (30% 이상이면) 차순위까지 표기 (예: '특치' 또는 '특치·치신')
  const statSorted = [...s.stat.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')
  );
  let stat = '';
  if (statSorted.length) {
    const total = statSorted.reduce((k, [, c]) => k + c, 0);
    const picks = [statSorted[0][0]];
    if (statSorted[1] && statSorted[1][1] / total >= 0.3) picks.push(statSorted[1][0]);
    stat = picks.join('·');
  }

  builds[id] = { slots: slots.slice(0, 5), stat, sample };
}

// 결정적 출력: specId 가나다순
const ordered = Object.keys(builds).sort((a, b) => a.localeCompare(b, 'ko'));
const body = ordered
  .map((id) => {
    const b = builds[id];
    const slots =
      '[' +
      b.slots
        .map((sl) => '[' + sl.map((n) => JSON.stringify(n)).join(', ') + ']')
        .join(', ') +
      ']';
    return `  ${JSON.stringify(id)}: { slots: ${slots}, stat: ${JSON.stringify(b.stat)}, sample: ${b.sample} },`;
  })
  .join('\n');

const out = `// AUTO-GENERATED by scripts/gen-engraving-builds.mjs — 직접 수정 금지
// 소스: Neon characters 테이블의 실제 유저 캐릭터 장착 각인 빈도 집계.
// slots: 각 슬롯이 길이1=고정 각인, 길이>1=유저마다 갈리는 슬롯(서로 'or' 택1).
// stat: 주력 전투특성 2종 조합(특치/치신/특신), '·'면 두 빌드 공존.
export type EngravingBuild = { slots: string[][]; stat: string; sample: number };

export const ENGRAVING_BUILDS: Record<string, EngravingBuild> = {
${body}
};
`;

fs.writeFileSync(path.join(ROOT, 'lib', 'engraving-builds.generated.ts'), out, 'utf8');
console.log(`생성 완료: lib/engraving-builds.generated.ts (스펙 ${ordered.length}개)`);
