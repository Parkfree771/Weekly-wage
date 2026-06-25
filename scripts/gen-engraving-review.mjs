// 각인 빌드 검수용 마크다운 생성기 (사람이 읽고 수정 판단하는 용도).
// 출력: 각인-검수.md  — 직업별 현재 빌드 + 원본 빈도 + 상태(보정완료/저표본/의심) 정리.
// 실행: node scripts/gen-engraving-review.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const sql = neon(env.match(/DATABASE_URL=("?)(.*?)\1\s*$/m)[2]);

const EXCLUDE_ENGRAVINGS = new Set(['선수필승', '승부사']);
const EXCLUDED_SPEC_IDS = new Set(['도화가 회귀', '바드 진용']);

const SPEC_RULES = {
  '디스트로이어': { sig: '분노의 망치', w: '디트 분망', e: '디트 중수' },
  '슬레이어': { sig: '포식자', w: '슬레 포식', e: '슬레 처단' },
  '워로드': { sig: '고독한 기사', w: '워로드 고기', e: '워로드 전태' },
  '가디언나이트': { sig: '업화의 계승자', w: '가나 업화', e: '가나 드드' },
  '홀리나이트': { sig: '축복의 오라', w: '홀나 축오', e: '홀나 심판자' },
  '발키리': { sig: '해방자', w: '발키리 해방자', e: '발키리 빛의기사' },
  '버서커': { sig: '광기', w: '버서커 광기', e: '버서커 비기' },
  '배틀마스터': { sig: '초심', w: '배마 초심', e: '배마 오의' },
  '인파이터': { sig: '극의 : 체술', w: '인파 체술', e: '인파 충단' },
  '기공사': { sig: '역천지체', w: '기공 역천', e: '기공 세맥' },
  '창술사': { sig: '절정', w: '창술 절정', e: '창술 절제' },
  '스트라이커': { sig: '일격필살', w: '스커 일격', e: '스커 난무' },
  '브레이커': { sig: '권왕', w: '브커 권왕', e: '브커 수라' },
  '데빌헌터': { sig: '전술 탄환', w: '데헌 전탄', e: '데헌 핸건' },
  '호크아이': { sig: '죽음의 습격', w: '호크 죽습', e: '호크 두동' },
  '블래스터': { sig: '포격 강화', w: '블래 포강', e: '블래 화강' },
  '스카우터': { sig: '진화의 유산', w: '스카 유산', e: '스카 기술' },
  '건슬링어': { sig: '피스메이커', w: '건슬 피메', e: '건슬 사시' },
  '바드': { sig: '절실한 구원', w: '바드 절구', e: '바드 진용' },
  '서머너': { sig: '상급 소환사', w: '서머너 상소', e: '서머너 교감' },
  '아르카나': { sig: '황제의 칙령', w: '알카 황제', e: '알카 황후' },
  '소서리스': { sig: '점화', w: '소서 점화', e: '소서 환류' },
  '데모닉': { sig: '멈출 수 없는 충동', w: '데모닉 충동', e: '데모닉 억제' },
  '블레이드': { sig: '잔재된 기운', w: '블레 잔재', e: '블레 버스트' },
  '리퍼': { sig: '갈증', w: '리퍼 갈증', e: '리퍼 달소' },
  '소울이터': { sig: '만월의 집행자', w: '소울 만월', e: '소울 그믐' },
  '도화가': { sig: '만개', w: '도화가 만개', e: '도화가 회귀' },
  '기상술사': { sig: '질풍노도', w: '기상 질풍', e: '기상 이슬비' },
  '환수사': { sig: '야성', w: '환수 야성', e: '환수 각성' },
};

// 축약 표시명 (page.tsx와 동일하게 유지)
const SHORT = {
  '타격의 대가': '타대', '결투의 대가': '결대', '기습의 대가': '기대', '아드레날린': '아드',
  '슈퍼 차지': '슈차', '속전속결': '속속', '돌격대장': '돌대', '예리한 둔기': '예둔',
  '저주받은 인형': '저받', '질량 증가': '질증', '마나 효율 증가': '마효증', '마나의 흐름': '마흐',
  '안정된 상태': '안상', '급소 타격': '급타', '달인의 저력': '달저', '바리케이드': '바리',
  '분쇄의 주먹': '분쇄', '에테르 포식자': '에테르', '정밀 단도': '정단', '정기 흡수': '정흡',
  '중갑 착용': '중갑', '폭발물 전문가': '폭전', '구슬동자': '구슬',
};
const sn = (n) => SHORT[n] || n;

function resolveSpecId(cls, enl) {
  const r = SPEC_RULES[cls];
  if (!r || !enl || enl.length === 0) return null;
  return enl.some((n) => n && n.includes(r.sig)) ? r.w : r.e;
}

// 생성 빌드 파싱 (slots/stat/sample)
const buildsTxt = fs.readFileSync(path.join(ROOT, 'lib', 'engraving-builds.generated.ts'), 'utf8');
const GEN = {};
{
  const re = /"([^"]+)":\s*\{ slots:\s*(\[.*?\]\]|\[\]),\s*stat:\s*"([^"]*)",\s*sample:\s*(\d+)/g;
  let m;
  while ((m = re.exec(buildsTxt))) {
    const slots = [...m[2].matchAll(/\[([^\]]*)\]/g)].map((g) =>
      [...g[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
    );
    GEN[m[1]] = { slots, stat: m[3], sample: Number(m[4]) };
  }
}

// 수동 보정 파싱 (id + slots)
const ovTxt = fs.readFileSync(path.join(ROOT, 'lib', 'engraving-overrides.ts'), 'utf8');
const OV = {};
{
  const re = /'([^']+)':\s*\{\s*slots:\s*(\[\[.*?\]\]),/gs;
  let m;
  while ((m = re.exec(ovTxt))) {
    const slots = [...m[2].matchAll(/\[([^\]]*)\]/g)].map((g) =>
      [...g[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
    );
    OV[m[1]] = slots;
  }
}

// DB 빈도 집계
const rows = await sql`
  SELECT class_name, data->'engravings' AS eng,
    (SELECT array_agg(e->>'name') FROM jsonb_array_elements(
       CASE WHEN jsonb_typeof(data->'arkPassive'->'effects')='array'
            THEN data->'arkPassive'->'effects' ELSE '[]'::jsonb END) AS e
      WHERE e->>'category'='깨달음') AS enl
  FROM characters`;
const freqBy = new Map();
for (const r of rows) {
  const id = resolveSpecId(r.class_name, Array.isArray(r.enl) ? r.enl.filter(Boolean) : []);
  if (!id) continue;
  if (!freqBy.has(id)) freqBy.set(id, { n: 0, f: new Map() });
  const s = freqBy.get(id);
  s.n++;
  for (const e of Array.isArray(r.eng) ? r.eng : []) {
    if (e?.name && !EXCLUDE_ENGRAVINGS.has(e.name)) s.f.set(e.name, (s.f.get(e.name) || 0) + 1);
  }
}

const renderSlots = (slots) =>
  slots.map((sl) => (sl.length > 1 ? `(${sl.map(sn).join(' or ')})` : sn(sl[0]))).join(' · ');

const ids = Object.keys(GEN)
  .filter((id) => !EXCLUDED_SPEC_IDS.has(id))
  .sort((a, b) => a.localeCompare(b, 'ko'));

const needReview = [];
const details = [];
for (const id of ids) {
  const g = GEN[id];
  const fr = freqBy.get(id) || { n: g.sample, f: new Map() };
  const overridden = !!OV[id];
  const slots = overridden ? OV[id] : g.slots;

  // 상태 판정
  const flags = [];
  if (overridden) flags.push('🔧보정완료');
  if (g.sample <= 5) flags.push('⚠️저표본');
  if (!overridden) {
    // or슬롯에 20~35% 애매 멤버 / 바리 소수
    const ambiguous = [...fr.f.entries()].filter(([, c]) => c / fr.n >= 0.2 && c / fr.n < 0.35);
    const bari = fr.f.get('바리케이드');
    if (bari && bari / fr.n < 0.5) flags.push('❓바리(소수)');
    if (ambiguous.length) flags.push('❓애매슬롯');
  }
  const status = flags.length ? flags.join(' ') : '✅';
  if (!overridden && (g.sample <= 5 || flags.some((f) => f.startsWith('❓')))) {
    needReview.push(`- **${id}** [표본 ${g.sample}] ${status} — 현재: ${renderSlots(slots)}`);
  }

  // 원본 빈도(상위, %)
  const freqStr = [...fr.f.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([n, c]) => `${sn(n)} ${Math.round((c / fr.n) * 100)}%`)
    .join(' · ');

  details.push(
    `### ${id}  ·  표본 ${g.sample}  ·  ${g.stat || '-'}  ${status}\n` +
      `- 현재 빌드: ${renderSlots(slots)}\n` +
      (overridden ? `- (수동 보정됨 — 자동값: ${renderSlots(g.slots)})\n` : '') +
      `- 원본 빈도: ${freqStr}`
  );
}

const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
const md =
  `# 각인 빌드 검수 메모\n\n` +
  `생성: ${now} · 자동집계(Neon ${rows.length}캐릭) 기준. 🔧=수동보정됨, ⚠️=표본5이하, ❓=의심슬롯.\n` +
  `정확한 빌드는 \`lib/engraving-overrides.ts\`에 넣으면 페이지에 바로 반영됨.\n\n` +
  `## 검수 필요 (미보정 + 저표본/의심)\n\n${needReview.join('\n') || '- 없음'}\n\n` +
  `---\n\n## 전체 직업 상세 (가나다순)\n\n${details.join('\n\n')}\n`;

fs.writeFileSync(path.join(ROOT, '각인-검수.md'), md, 'utf8');
console.log(`각인-검수.md 생성 (직업 ${ids.length} / 검수필요 ${needReview.length} / 보정 ${Object.keys(OV).length})`);
