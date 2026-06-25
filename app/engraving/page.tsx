'use client';

import { useMemo, useState } from 'react';
import { TIER_CLASSES, GROUP_ORDER, roleOf } from '@/lib/tier-data';
import { ENGRAVING_BUILDS, type EngravingBuild } from '@/lib/engraving-builds.generated';
import { ENGRAVING_OVERRIDES } from '@/lib/engraving-overrides';
import { ENGRAVING_ICONS } from '@/lib/engraving-icons.generated';
import ClassIcon from '@/components/tier/ClassIcon';
import styles from './page.module.css';

// 딜러 스펙이지만 표본 대부분이 서포터 각인이라 의미 없음 → 페이지에서 숨김
const EXCLUDED_SPEC_IDS = new Set(['도화가 회귀', '바드 진용']);

// 표시 대상 스펙 (제외 + 빌드 없는 스펙 빼고) — 이름 가나다순 평면 정렬이 기본
const SPECS = TIER_CLASSES.filter(
  (c) => !EXCLUDED_SPEC_IDS.has(c.id) && ENGRAVING_BUILDS[c.id]
).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

// 생성 데이터 + 수동 보정 병합 (보정은 slots 등 일부만 덮어씀)
const BUILDS: Record<string, EngravingBuild> = {};
for (const s of SPECS) {
  const ov = ENGRAVING_OVERRIDES[s.id];
  BUILDS[s.id] = ov ? { ...ENGRAVING_BUILDS[s.id], ...ov } : ENGRAVING_BUILDS[s.id];
}

// 직업군 버튼 목록 (실제 존재하는 그룹만)
const GROUPS = GROUP_ORDER.filter((g) => SPECS.some((s) => s.group === g));

// 각인 필터 풀: 모든 표시 스펙의 각인(슬롯 전체) 합집합 (가나다순)
const ALL_ENGRAVINGS = Array.from(
  new Set(SPECS.flatMap((s) => BUILDS[s.id].slots.flat()))
).sort((a, b) => a.localeCompare(b, 'ko'));

// 전역 각인 순서 규칙: 전체 직업에서 많이 쓰일수록 위. 동률은 가나다.
// → 모든 카드에서 같은 각인은 항상 같은 상대 위치에 온다(아드가 어디선 1번 어디선 3번 X).
const ENG_FREQ = new Map<string, number>();
for (const s of SPECS) {
  for (const n of BUILDS[s.id].slots.flat()) {
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
const SORTED_SLOTS: Record<string, string[][]> = {};
const SPEC_ENG_SET: Record<string, Set<string>> = {};
for (const s of SPECS) {
  const slots = BUILDS[s.id].slots;
  const fixed = slots.filter((sl) => sl.length === 1).sort((a, b) => byEngOrder(a[0], b[0]));
  const ors = slots.filter((sl) => sl.length > 1).map((sl) => [...sl].sort(byEngOrder));
  SORTED_SLOTS[s.id] = [...fixed, ...ors];
  SPEC_ENG_SET[s.id] = new Set(slots.flat());
}

// 표시용 축약명 (데이터/필터는 원래 이름 유지, UI 라벨만 짧게)
const SHORT_NAME: Record<string, string> = {
  '타격의 대가': '타대',
  '결투의 대가': '결대',
  '기습의 대가': '기대',
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
  '구슬동자': '구슬',
};
const label = (n: string) => SHORT_NAME[n] ?? n;

type FilterState = 'include' | 'exclude';

export default function EngravingPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'전체' | 'dealer' | 'support'>('전체');
  const [group, setGroup] = useState<string>('전체');
  // 각인명 → 'include'(이 각인 쓰는 직업) | 'exclude'(안 쓰는 직업)
  const [filters, setFilters] = useState<Record<string, FilterState>>({});

  const term = search.trim();

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

  const includeList = Object.keys(filters).filter((k) => filters[k] === 'include');
  const excludeList = Object.keys(filters).filter((k) => filters[k] === 'exclude');
  const hasFilter = includeList.length > 0 || excludeList.length > 0;

  const shown = useMemo(() => {
    return SPECS.filter((spec) => {
      if (role !== '전체' && roleOf(spec.id) !== role) return false;
      if (group !== '전체' && spec.group !== group) return false;
      if (term && !spec.name.includes(term)) return false;
      const engSet = SPEC_ENG_SET[spec.id];
      if (includeList.some((e) => !engSet.has(e))) return false; // 포함: 다 써야 통과
      if (excludeList.some((e) => engSet.has(e))) return false; // 제외: 하나라도 쓰면 탈락
      return true;
    });
  }, [role, group, term, includeList, excludeList]);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>직업별 각인 정리</h1>
        <span className={styles.countBadge}>{shown.length}직업</span>
      </header>

      {/* 직업 검색 */}
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

      {/* 역할 선택 (딜러 / 서포터) */}
      <div className={`${styles.groupBtns} ${styles.roleRow}`}>
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

      {/* 결과 — 가나다순 평면 그리드 */}
      {shown.length === 0 ? (
        <p className={styles.empty}>조건에 맞는 직업이 없습니다.</p>
      ) : (
        <div className={styles.cardGrid}>
          {shown.map((spec) => {
            const slots = SORTED_SLOTS[spec.id];
            const stat = BUILDS[spec.id].stat;
            return (
              <div key={spec.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <ClassIcon name={spec.name} src={spec.icon} size={38} />
                  <span className={styles.cardName}>{spec.name}</span>
                  {stat && <span className={styles.statBadge}>{stat}</span>}
                </div>
                <div className={styles.badgeRow}>
                  {slots.map((slot, i) => {
                    const isOr = slot.length > 1;
                    const hit = slot.some((n) => filters[n] === 'include');
                    return (
                      <span
                        key={i}
                        className={`${isOr ? styles.orBadge : styles.badge} ${
                          hit ? styles.badgeHit : ''
                        }`}
                      >
                        {slot.map((n, j) => (
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
  );
}
