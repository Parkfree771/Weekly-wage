'use client';

import { useMemo, useState } from 'react';
import { TIER_CLASSES, GROUP_ORDER, roleOf } from '@/lib/tier-data';
import { ENGRAVING_BUILDS } from '@/lib/engraving-builds.generated';
import { ENGRAVING_OVERRIDES, type EngSlot } from '@/lib/engraving-overrides';
import { ENGRAVING_ICONS } from '@/lib/engraving-icons.generated';
import ClassIcon from '@/components/tier/ClassIcon';
import { useNewbieRec } from '@/components/newbie/useNewbieRec';
import NewbieRecSidebar from '@/components/newbie/NewbieRecSidebar';
import styles from './page.module.css';

// 표본 부족 등으로 페이지에서 숨길 스펙 (현재 없음 — 보정 빌드로 노출)
const EXCLUDED_SPEC_IDS = new Set<string>([]);

// 성별 필터: 직업 prefix(이름 첫 토큰) 기준. 여캐만 등록, 나머지는 남캐.
const FEMALE_PREFIXES = new Set([
  '가나', '건슬', '기공', '기상', '데모닉', '도화가', '리퍼', '바드', '발키리',
  '배마', '블레', '서머너', '소서', '소울', '슬레', '알카', '인파', '창술', '환수',
]);
const genderOf = (id: string): 'female' | 'male' =>
  FEMALE_PREFIXES.has(id.split(' ')[0]) ? 'female' : 'male';

// 표시 대상 스펙 (제외 + 빌드 없는 스펙 빼고) — 이름 가나다순 평면 정렬이 기본
const SPECS = TIER_CLASSES.filter(
  (c) => !EXCLUDED_SPEC_IDS.has(c.id) && ENGRAVING_BUILDS[c.id]
).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

// 슬롯 정규화: string[](고정/택1) 와 {pick,pool}(택N)을 한 번에 다룬다.
const poolOf = (s: EngSlot): string[] => (Array.isArray(s) ? s : s.pool);
const pickOf = (s: EngSlot): number => (Array.isArray(s) ? 1 : s.pick);
const isFixed = (s: EngSlot): boolean => Array.isArray(s) && s.length === 1;

type MergedBuild = { slots: EngSlot[]; stat: string; sample: number };

// 생성 데이터 + 수동 보정 병합 (보정은 slots 등 일부만 덮어씀)
const BUILDS: Record<string, MergedBuild> = {};
for (const s of SPECS) {
  const ov = ENGRAVING_OVERRIDES[s.id];
  BUILDS[s.id] = ov ? { ...ENGRAVING_BUILDS[s.id], ...ov } : ENGRAVING_BUILDS[s.id];
}

// 직업군 버튼 목록 (실제 존재하는 그룹만)
const GROUPS = GROUP_ORDER.filter((g) => SPECS.some((s) => s.group === g));

// 각인 필터 풀: 모든 표시 스펙의 각인(슬롯 전체) 합집합 (가나다순)
const ALL_ENGRAVINGS = Array.from(
  new Set(SPECS.flatMap((s) => BUILDS[s.id].slots.flatMap(poolOf)))
).sort((a, b) => a.localeCompare(b, 'ko'));

// 전역 각인 순서 규칙: 전체 직업에서 많이 쓰일수록 위. 동률은 가나다.
// → 모든 카드에서 같은 각인은 항상 같은 상대 위치에 온다(아드가 어디선 1번 어디선 3번 X).
const ENG_FREQ = new Map<string, number>();
for (const s of SPECS) {
  for (const n of BUILDS[s.id].slots.flatMap(poolOf)) {
    ENG_FREQ.set(n, (ENG_FREQ.get(n) ?? 0) + 1);
  }
}
const ENG_ORDER = new Map(
  Array.from(ENG_FREQ.keys())
    .sort((a, b) => (ENG_FREQ.get(b) ?? 0) - (ENG_FREQ.get(a) ?? 0) || a.localeCompare(b, 'ko'))
    .map((n, i) => [n, i] as const)
);
const byEngOrder = (a: string, b: string) =>
  (ENG_ORDER.get(a) ?? 9999) - (ENG_ORDER.get(b) ?? 9999);

// 스펙별 정렬 슬롯: 고정(길이1) 먼저 전역순 → 그다음 or묶음(내부도 전역순).
// SPEC_ENG_SET: 필터(포함/제외)용 스펙별 각인 집합.
const SORTED_SLOTS: Record<string, EngSlot[]> = {};
const SPEC_ENG_SET: Record<string, Set<string>> = {};
for (const s of SPECS) {
  const slots = BUILDS[s.id].slots;
  const fixed = slots
    .filter(isFixed)
    .sort((a, b) => byEngOrder(poolOf(a)[0], poolOf(b)[0]));
  // 택1·택N 모두 내부 후보를 전역순으로 정렬 (pick 수는 유지)
  const ors = slots
    .filter((sl) => !isFixed(sl))
    .map((sl): EngSlot =>
      Array.isArray(sl)
        ? [...sl].sort(byEngOrder)
        : { pick: sl.pick, pool: [...sl.pool].sort(byEngOrder) }
    );
  SORTED_SLOTS[s.id] = [...fixed, ...ors];
  SPEC_ENG_SET[s.id] = new Set(slots.flatMap(poolOf));
}

// 플레이스타일 분류: 기습의 대가→백사멸, 결투의 대가→헤드사멸, 둘 다 없으면 타대(정면).
// 기습/결투는 상호배타. 서포터(roleOf===support)는 포지셔널 무관 → 'support'(해당 없음).
type PlayStyle = 'back' | 'head' | 'normal' | 'support';
// 자동 분류 보정: 기습/결투가 빌드에 있어도 실제 플레이가 다른 직업은 여기서 고정.
// 버서커 광기는 기습이 '택1 옵션'일 뿐 실제론 타대 → 타대로 본다.
// (같은 택1 옵션이라도 홀나 심판자는 백이 맞으므로 일괄 규칙이 아닌 개별 보정으로 처리)
const STYLE_OVERRIDE: Record<string, PlayStyle> = {
  '버서커 광기': 'normal',
};
const styleOf = (id: string): PlayStyle => {
  if (roleOf(id) === 'support') return 'support';
  if (STYLE_OVERRIDE[id]) return STYLE_OVERRIDE[id];
  const set = SPEC_ENG_SET[id];
  if (set?.has('기습의 대가')) return 'back';
  if (set?.has('결투의 대가')) return 'head';
  return 'normal';
};
// 사멸 배지 라벨 (서포터는 배지 없음)
const STYLE_LABEL: Record<PlayStyle, string | null> = {
  back: '백사멸',
  head: '헤드사멸',
  normal: '타대',
  support: null,
};

// 표시용 축약명 (데이터/필터는 원래 이름 유지, UI 라벨만 짧게)
const SHORT_NAME: Record<string, string> = {
  '타격의 대가': '타대',
  '결투의 대가': '결대',
  '기습의 대가': '기습',
  '아드레날린': '아드',
  '슈퍼 차지': '슈차',
  '속전속결': '속속',
  '돌격대장': '돌대',
  '예리한 둔기': '예둔',
  '저주받은 인형': '저받',
  '질량 증가': '질증',
  '마나 효율 증가': '마효증',
  '마나의 흐름': '마흐',
  '안정된 상태': '안상',
  '급소 타격': '급타',
  '달인의 저력': '달저',
  '바리케이드': '바리',
  '분쇄의 주먹': '분쇄',
  '에테르 포식자': '에테르',
  '정밀 단도': '정단',
  '정기 흡수': '정흡',
  '중갑 착용': '중갑',
  '폭발물 전문가': '폭전',
  '구슬동자': '구동',
};
const label = (n: string) => SHORT_NAME[n] ?? n;

// 검색용 정식 명칭 별칭: 축약 직업명(이름 첫 토큰) → 풀네임.
// "브레이커" 검색 시 "브커 권왕"도 잡히게 한다. 이미 풀네임인 직업(버서커, 바드 등)은 등록 불필요.
const CLASS_FULL_NAME: Record<string, string> = {
  '가나': '가디언나이트',
  '건슬': '건슬링어',
  '기공': '기공사',
  '기상': '기상술사',
  '데헌': '데빌헌터',
  '디트': '디스트로이어',
  '배마': '배틀마스터',
  '브커': '브레이커',
  '블래': '블래스터',
  '블레': '블레이드',
  '소서': '소서리스',
  '소울': '소울이터',
  '스카': '스카우터',
  '스커': '스트라이커',
  '슬레': '슬레이어',
  '알카': '아르카나',
  '인파': '인파이터',
  '창술': '창술사',
  '호크': '호크아이',
  '홀나': '홀리나이트',
  '환수': '환수사',
};
// 검색용 스펙(직업 각인) 정식 명칭: 축약 스펙명 → 풀네임.
// "핸드거너" 검색 시 "데헌 핸건"도 잡히게 한다. 스펙명이 이미 풀네임이면(광기, 절정 등) 등록 불필요.
const SPEC_FULL_NAME: Record<string, string> = {
  '가나 드드': '드레드로어',
  '가나 업화': '업화의 계승자',
  '건슬 사시': '사냥의 시간',
  '건슬 피메': '피스메이커',
  '기공 세맥': '세맥타통',
  '기공 역천': '역천지체',
  '기상 질풍': '질풍노도',
  '데모닉 억제': '완벽한 억제',
  '데모닉 충동': '멈출 수 없는 충동',
  '데헌 전탄': '전술 탄환',
  '데헌 핸건': '핸드거너',
  '디트 분망': '분노의 망치',
  '디트 중수': '중력 수련',
  '리퍼 달소': '달의 소리',
  '바드 절구': '절실한 구원',
  '바드 진용': '진실된 용맹',
  '발키리 빛의기사': '빛의 기사',
  '배마 오의': '오의 강화',
  '버서커 비기': '광전사의 비기',
  '브커 권왕': '권왕파천무',
  '브커 수라': '수라의 길',
  '블래 포강': '포격 강화',
  '블래 화강': '화력 강화',
  '블레 잔재': '잔재된 기운',
  '서머너 상소': '상급 소환사',
  '소울 그믐': '그믐의 경계',
  '소울 만월': '만월의 집행자',
  '스카 기술': '아르데타인의 기술',
  '스카 유산': '진화의 유산',
  '스커 난무': '오의난무',
  '스커 일격': '일격필살',
  '슬레 처단': '처단자',
  '슬레 포식': '포식자',
  '알카 황제': '황제의 칙령',
  '알카 황후': '황후의 은총',
  '워로드 고기': '고독한 기사',
  '워로드 전태': '전투 태세',
  '인파 체술': '극의 : 체술',
  '인파 충단': '충격 단련',
  '호크 두동': '두 번째 동료',
  '호크 죽습': '죽음의 습격',
  '홀나 축오': '축복의 오라',
};
// 스펙별 검색 대상 문자열: "축약명 스펙" + 직업 풀네임 + 스펙 풀네임 (예: "브커 권왕 브레이커 권왕파천무")
const SEARCH_TEXT: Record<string, string> = {};
for (const s of SPECS) {
  SEARCH_TEXT[s.id] = [
    s.name,
    CLASS_FULL_NAME[s.name.split(' ')[0]],
    SPEC_FULL_NAME[s.id],
  ]
    .filter(Boolean)
    .join(' ');
}

type FilterState = 'include' | 'exclude';

export default function EngravingPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'전체' | 'dealer' | 'support'>('전체');
  const [gender, setGender] = useState<'전체' | 'female' | 'male'>('전체');
  // 백사멸 / 헤드사멸 / 타대(정면) 필터. 서포터는 어느 쪽에도 안 잡힘(전체에서만 노출).
  const [playStyle, setPlayStyle] = useState<'전체' | 'back' | 'head' | 'normal'>('전체');
  const [group, setGroup] = useState<string>('전체');
  // 각인명 → 'include'(이 각인 쓰는 직업) | 'exclude'(안 쓰는 직업)
  const [filters, setFilters] = useState<Record<string, FilterState>>({});
  // 겹침 순위에서 선택한 각인들 — 카드의 해당 각인 칸에 테두리만 표시 (필터링은 안 함, 중복 선택 가능)
  const [highlights, setHighlights] = useState<Set<string>>(new Set());

  // 뉴비 추천 직업 투표 (사이드바 + 카드 선택 연동)
  const nr = useNewbieRec();


  // 칩 클릭: 해제 → 포함 → 제외 → 해제 순환
  const cycleFilter = (name: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      const cur = next[name];
      if (!cur) next[name] = 'include';
      else if (cur === 'include') next[name] = 'exclude';
      else delete next[name];
      return next;
    });
  };

  const toggleHighlight = (name: string) => {
    setHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const includeList = Object.keys(filters).filter((k) => filters[k] === 'include');
  const excludeList = Object.keys(filters).filter((k) => filters[k] === 'exclude');
  const hasFilter = includeList.length > 0 || excludeList.length > 0;

  const shown = useMemo(() => {
    // 쉼표로 여러 직업 동시 검색 가능 (예: "드드,권왕" → 둘 다 표시)
    const terms = search
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return SPECS.filter((spec) => {
      if (role !== '전체' && roleOf(spec.id) !== role) return false;
      if (gender !== '전체' && genderOf(spec.id) !== gender) return false;
      if (playStyle !== '전체' && styleOf(spec.id) !== playStyle) return false;
      if (group !== '전체' && spec.group !== group) return false;
      if (terms.length > 0 && !terms.some((t) => SEARCH_TEXT[spec.id].includes(t))) return false;
      const engSet = SPEC_ENG_SET[spec.id];
      if (includeList.some((e) => !engSet.has(e))) return false; // 포함: 다 써야 통과
      if (excludeList.some((e) => engSet.has(e))) return false; // 제외: 하나라도 쓰면 탈락
      return true;
    });
  }, [role, gender, playStyle, group, search, includeList, excludeList]);

  // 왼쪽 사이드바: 현재 표시 중인 직업들이 가장 많이 공유하는 각인 순위 (동률은 가나다순)
  const engRanking = useMemo(() => {
    const cnt = new Map<string, number>();
    for (const spec of shown) {
      for (const n of SPEC_ENG_SET[spec.id]) cnt.set(n, (cnt.get(n) ?? 0) + 1);
    }
    return [...cnt.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .slice(0, 10);
  }, [shown]);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>직업별 각인 정리</h1>
        <span className={styles.countBadge}>{shown.length}직업</span>
      </header>

      {/* 신규 직업 안내 — 각인 데이터 집계 전이라 목록에는 아직 포함하지 않음 */}
      <div className={styles.newClassBanner}>
        <span className={styles.newClassBadge}>NEW</span>
        <div className={styles.newClassIcons}>
          <img
            className={styles.newClassIcon}
            src="/class-icons/차원 공간검사.webp"
            alt="차원술사 공간 검사"
            width={36}
            height={36}
          />
          <img
            className={styles.newClassIcon}
            src="/class-icons/차원 시간관리자.webp"
            alt="차원술사 시간 관리자"
            width={36}
            height={36}
          />
        </div>
        <div className={styles.newClassText}>
          <span className={styles.newClassName}>차원술사</span>
          <span className={styles.newClassDesc}>각인 정보는 아직 모름 (데이터 쌓이면 업데이트 예정)</span>
        </div>
      </div>

      {/* 직업 검색 */}
      <div className={styles.searchLine}>
      <div className={styles.searchRow}>
        <svg className={styles.searchIcon} viewBox="0 0 20 20" width="16" height="16" aria-hidden>
          <path
            d="M9 3a6 6 0 104.47 10.03l3.25 3.25 1.06-1.06-3.25-3.25A6 6 0 009 3zm0 1.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z"
            fill="currentColor"
          />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="직업 검색 (예: 버서커, 소서, 바드)"
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="검색 지우기">
            ×
          </button>
        )}
      </div>
      <span className={styles.searchHint}>
        쉼표(<span className={styles.hintComma}>,</span>)로 구분하면 여러 직업 동시 검색 (예: 드드
        <span className={styles.hintComma}>,</span> 권왕
        <span className={styles.hintComma}>,</span> 알카)
      </span>
      </div>

      {/* 필터: 역할 / 성별 / 사멸 — 한 줄에 묶고 그룹 사이 구분선 */}
      <div className={styles.filterBar}>
        {/* 역할 (전체/딜러/서포터) */}
        <div className={styles.filterGroup}>
          {([
            ['전체', '전체'],
            ['딜러', 'dealer'],
            ['서포터', 'support'],
          ] as const).map(([label, val]) => (
            <button
              key={val}
              className={`${styles.groupBtn} ${role === val ? styles.groupBtnActive : ''}`}
              onClick={() => setRole(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 성별 (전체/여캐/남캐) */}
        <div className={styles.filterGroup}>
          {([
            ['전체', '전체'],
            ['여캐', 'female'],
            ['남캐', 'male'],
          ] as const).map(([label, val]) => (
            <button
              key={val}
              className={`${styles.groupBtn} ${gender === val ? styles.groupBtnActive : ''}`}
              onClick={() => setGender(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 사멸 (전체/백사멸/헤드사멸/타대) — 기습=백, 결대=헤드, 둘 다 없으면 타대. 서포터 제외 */}
        <div className={styles.filterGroup}>
          {([
            ['전체', '전체'],
            ['백사멸', 'back'],
            ['헤드사멸', 'head'],
            ['타대', 'normal'],
          ] as const).map(([label, val]) => (
            <button
              key={val}
              className={`${styles.groupBtn} ${playStyle === val ? styles.groupBtnActive : ''}`}
              onClick={() => setPlayStyle(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 직업군 선택 */}
      <div className={styles.groupBtns}>
        {['전체', ...GROUPS].map((g) => (
          <button
            key={g}
            className={`${styles.groupBtn} ${group === g ? styles.groupBtnActive : ''}`}
            onClick={() => setGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {/* 각인 필터 */}
      <div className={styles.filterBlock}>
        <div className={styles.filterHead}>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotInc}`} />포함
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotExc}`} />제외
            </span>
          </div>
          {hasFilter && (
            <button className={styles.resetBtn} onClick={() => setFilters({})}>
              필터 초기화
            </button>
          )}
        </div>
        <div className={styles.chipPool}>
          {ALL_ENGRAVINGS.map((name) => {
            const state = filters[name];
            return (
              <button
                key={name}
                className={`${styles.chip} ${
                  state === 'include'
                    ? styles.chipInc
                    : state === 'exclude'
                    ? styles.chipExc
                    : ''
                }`}
                onClick={() => cycleFilter(name)}
              >
                {ENGRAVING_ICONS[name] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.chipIcon} src={ENGRAVING_ICONS[name]} alt="" loading="lazy" />
                )}
                {label(name)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 결과 — 가나다순 평면 그리드 (+ 뉴비 추천 사이드바를 그리드 시작점에 정렬) */}
      <div className={styles.results}>
        <NewbieRecSidebar nr={nr} />

        {/* 왼쪽: 표시 중인 직업들의 각인 겹침 순위 (절대배치 — 레이아웃 안 밈) */}
        <aside className={styles.engSidebar} aria-label="유각 겹침 순위">
          <div className={styles.engSideBox}>
            <div className={styles.engSideHead}>
              <span className={styles.engSideTitle}>유각 겹침 순위</span>
              <span className={styles.engSideBadge}>TOP 10</span>
            </div>
            <div className={styles.engSideSub}>표시 중인 {shown.length}개 직업 기준</div>
            {engRanking.length === 0 ? (
              <div className={styles.engSideEmpty}>표시 중인 직업이 없습니다</div>
            ) : (
              <ol className={styles.engSideList}>
                {engRanking.map(([name, count], i) => (
                  <li key={name}>
                    <button
                      className={`${styles.engSideItem} ${
                        highlights.has(name) ? styles.engSideItemActive : ''
                      }`}
                      onClick={() => toggleHighlight(name)}
                      aria-pressed={highlights.has(name)}
                    >
                      <span
                        className={`${styles.engSideRank} ${i < 3 ? styles.engSideRankTop : ''}`}
                      >
                        {i + 1}
                      </span>
                      {ENGRAVING_ICONS[name] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className={styles.engSideIcon}
                          src={ENGRAVING_ICONS[name]}
                          alt=""
                          loading="lazy"
                        />
                      )}
                      <span className={styles.engSideName}>{label(name)}</span>
                      <span className={styles.engSideCount}>{count}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
        {shown.length === 0 ? (
        <p className={styles.empty}>조건에 맞는 직업이 없습니다.</p>
      ) : (
        <div className={styles.cardGrid}>
          {shown.map((spec) => {
            const slots = SORTED_SLOTS[spec.id];
            const stat = BUILDS[spec.id].stat;
            const styleLabel = STYLE_LABEL[styleOf(spec.id)];
            const picked = nr.selected.has(spec.id);
            return (
              <div
                key={spec.id}
                className={`${styles.card} ${
                  nr.votingMode ? styles.cardSelectable : ''
                } ${picked ? styles.cardSelected : ''}`}
                onClick={nr.votingMode ? () => nr.toggle(spec.id) : undefined}
                role={nr.votingMode ? 'button' : undefined}
                aria-pressed={nr.votingMode ? picked : undefined}
              >
                {nr.votingMode && (
                  <span className={styles.cardCheck} aria-hidden>
                    {picked && (
                      <svg viewBox="0 0 20 20" width="13" height="13">
                        <path
                          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.79a1 1 0 011.4 0z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </span>
                )}
                <div className={styles.cardHead}>
                  <ClassIcon name={spec.name} src={spec.icon} size={42} />
                  <span className={styles.cardName}>{spec.name}</span>
                  {stat && <span className={styles.statBadge}>{stat}</span>}
                  {styleLabel && <span className={styles.styleBadge}>{styleLabel}</span>}
                </div>
                <div className={styles.badgeRow}>
                  {slots.map((slot, i) => {
                    const pool = poolOf(slot);
                    const pick = pickOf(slot);
                    const isOr = pool.length > 1;
                    const hit = pool.some(
                      (n) => filters[n] === 'include' || highlights.has(n)
                    );
                    return (
                      <span
                        key={i}
                        className={`${isOr ? styles.orBadge : styles.badge} ${
                          hit ? styles.badgeHit : ''
                        }`}
                      >
                        {pool.map((n, j) => (
                          <span key={n} className={styles.engItem}>
                            {j > 0 && <span className={styles.orSep}>or</span>}
                            {ENGRAVING_ICONS[n] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                className={styles.badgeIcon}
                                src={ENGRAVING_ICONS[n]}
                                alt=""
                                loading="lazy"
                              />
                            )}
                            <span className={styles.engName}>{label(n)}</span>
                          </span>
                        ))}
                        {pick > 1 && <span className={styles.pickTag}>택{pick}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
