'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  LEVEL_BREAKPOINTS,
  REFINING_MATERIALS,
  addMaterials,
  charClearGold,
  charContentRewards,
  contentTotal,
  expeditionClearGold,
  materialsValue,
  pickedMaterials,
  subGold,
  type GoldSplit,
  type MaterialCounts,
  type MaterialPrices,
  type SortBasis,
} from '@/lib/gold-projection';
import { FIXED_PRICES, MATERIAL_IDS } from '@/data/rewardTable';
import { usePriceData } from '@/contexts/PriceContext';
import styles from './GoldProjection.module.css';

// 귀속 골드 아이콘 (사이트 공통 — gold.webp 에 색만 돌려 쓴다)
const BOUND_GOLD_FILTER = 'hue-rotate(280deg) saturate(1.0)';

// 원정대에서 주간 골드가 인정되는 캐릭터 수
const GOLD_CHAR_LIMIT = 6;

// 계산 범위 탭 — 골드만 / 골드+재련 재료
type SimMode = 'gold' | 'material';

// 재료 아이콘·표시명 (아이콘은 public 루트, 더보기 계산기와 동일 파일)
const MATERIAL_ICONS: Record<string, string> = {
  '운명의 파괴석 결정': '/top-destiny-destruction-stone5.webp',
  '운명의 수호석 결정': '/top-destiny-guardian-stone5.webp',
  '위대한 운명의 돌파석': '/top-destiny-breakthrough-stone5.webp',
  '운명의 파괴석': '/destiny-destruction-stone5.webp',
  '운명의 수호석': '/destiny-guardian-stone5.webp',
  '운명의 돌파석': '/destiny-breakthrough-stone5.webp',
  '운명의 파편': '/destiny-shard-bag-large5.webp',
  '은총의 파편': '/dmschddmlvkvus.webp',
  '고통의 가시': '/pulsating-thorn.webp',
  '용암의 숨결': '/breath-lava5.webp',
  '빙하의 숨결': '/breath-glacier5.webp',
  '1레벨 보석': '/1fpqrjqghk.webp',
  '천상 입장권': '/cjstkd.webp',
};

// 표 라벨은 좁은 열에 맞춰 줄인다 (아이콘이 계열을 구분해 준다)
const MATERIAL_SHORT: Record<string, string> = {
  '운명의 파괴석 결정': '파괴석 결정',
  '운명의 수호석 결정': '수호석 결정',
  '위대한 운명의 돌파석': '위대한 돌파석',
  '운명의 파괴석': '파괴석',
  '운명의 수호석': '수호석',
  '운명의 돌파석': '돌파석',
  '운명의 파편': '파편',
  '은총의 파편': '은총의 파편',
  '고통의 가시': '고통의 가시',
  '용암의 숨결': '용암의 숨결',
  '빙하의 숨결': '빙하의 숨결',
  '1레벨 보석': '1레벨 보석',
  '천상 입장권': '천상 입장권',
};

// 거래소 시세를 직접 쓰는 재화 (묶음 단위 1)
const LAVA_BREATH_ID = '66111131';
const GLACIER_BREATH_ID = '66111132';

// 보석은 3개 → 상위 1개로 합성된다(무손실). 원정대 전체 1레벨 수급량을 실제 합성 결과로 환산.
const MAX_GEM_LEVEL = 10;

type Character = {
  characterName: string;
  itemLevel: number;
};

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
const signed = (n: number) => (Math.round(n) === 0 ? '0' : `${n > 0 ? '+' : '-'}${fmt(Math.abs(n))}`);
const deltaClass = (n: number) => (n > 0 ? styles.up : n < 0 ? styles.down : styles.flat);

// 유통 / 귀속 / 합계를 같은 열 위치에 맞춰 찍는 표.
// 캐릭터 카드와 원정대 합계가 완전히 같은 구조라 한 번 읽으면 그 다음은 안 읽어도 된다.
function GoldTable({
  before,
  after,
  changed,
  size = 'row',
  beforeLevel,
  afterLevel,
  onlyFree = false,
}: {
  before: GoldSplit;
  after: GoldSplit;
  changed: boolean;
  size?: 'row' | 'total';
  beforeLevel?: number;
  afterLevel?: number;
  /** 원정대 합계처럼 공유 자산(유통 골드)만 볼 때 — 귀속·합계 줄을 숨긴다 */
  onlyFree?: boolean;
}) {
  const px = size === 'total' ? 20 : 17;
  const rows = onlyFree
    ? [{ label: '유통', bound: false, b: before.free, a: after.free }]
    : [
        { label: '유통', bound: false, b: before.free, a: after.free },
        { label: '귀속', bound: true, b: before.bound, a: after.bound },
      ];

  return (
    <div
      className={[styles.table, size === 'total' ? styles.tableTotal : '', changed ? styles.tableChanged : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.thead}>
        <span />
        <span className={styles.th}>
          현재
          {beforeLevel != null && <b className={styles.thLvNow}>{beforeLevel}</b>}
        </span>
        <span />
        <span className={styles.th}>
          {changed && (
            <>
              목표
              {afterLevel != null && <b className={styles.thLvNext}>{afterLevel}</b>}
            </>
          )}
        </span>
        <span className={styles.th}>{changed ? '변화' : ''}</span>
      </div>

      {rows.map((r) => (
        <div key={r.label} className={`${styles.tr} ${r.bound ? styles.trBound : ''}`}>
          <span className={styles.tdLabel}>
            <Image
              src="/gold.webp"
              alt=""
              width={px}
              height={px}
              unoptimized
              className={styles.goldIcon}
              style={r.bound ? { filter: BOUND_GOLD_FILTER } : undefined}
            />
            <span className={r.bound ? styles.boundText : undefined}>{r.label}</span>
          </span>
          <span className={styles.tdNow}>{fmt(r.b)}</span>
          <span className={styles.tdArrow}>{changed ? '→' : ''}</span>
          <span className={styles.tdNext}>{changed ? fmt(r.a) : ''}</span>
          <span className={`${styles.tdDelta} ${deltaClass(r.a - r.b)}`}>
            {changed ? signed(r.a - r.b) : ''}
          </span>
        </div>
      ))}

      {!onlyFree && (
        <div className={`${styles.tr} ${styles.trSum}`}>
          <span className={styles.tdLabel}>합계</span>
          <span className={styles.tdNow}>{fmt(before.total)}</span>
          <span className={styles.tdArrow}>{changed ? '→' : ''}</span>
          <span className={styles.tdNext}>{changed ? fmt(after.total) : ''}</span>
          <span className={`${styles.tdDelta} ${deltaClass(after.total - before.total)}`}>
            {changed ? signed(after.total - before.total) : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// 재련 재료 표 — 골드 표와 같은 열 구조(현재 → 목표 변화)로 수량을 찍는다.
// 골드 표 바로 아래에 붙으므로 헤더는 반복하지 않는다.
function MaterialTable({
  before,
  after,
  changed,
  size = 'row',
}: {
  before: MaterialCounts;
  after: MaterialCounts;
  changed: boolean;
  size?: 'row' | 'total';
}) {
  const px = size === 'total' ? 20 : 17;
  const names = REFINING_MATERIALS.filter((n) => (before[n] ?? 0) > 0 || (after[n] ?? 0) > 0);
  if (names.length === 0) return null;

  return (
    <div
      className={[styles.table, size === 'total' ? styles.tableTotal : '', changed ? styles.tableChanged : '']
        .filter(Boolean)
        .join(' ')}
    >
      {names.map((n) => {
        const b = before[n] ?? 0;
        const a = after[n] ?? 0;
        return (
          <div key={n} className={styles.tr}>
            <span className={styles.tdLabel}>
              <Image
                src={MATERIAL_ICONS[n]}
                alt=""
                width={px}
                height={px}
                unoptimized
                className={styles.goldIcon}
              />
              {MATERIAL_SHORT[n]}
            </span>
            <span className={styles.tdNow}>{fmt(b)}</span>
            <span className={styles.tdArrow}>{changed ? '→' : ''}</span>
            <span className={styles.tdNext}>{changed ? fmt(a) : ''}</span>
            <span className={`${styles.tdDelta} ${deltaClass(a - b)}`}>
              {changed ? signed(a - b) : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 콘텐츠별 골드 환산 — 레벨을 올렸을 때 어느 콘텐츠에서 얼마가 늘었는지 보여준다.
// 티어가 바뀌는 콘텐츠(균열/전선·가토·모래시계)는 티어 이름도 같이 찍는다.
function SourceTable({
  sources,
  changed,
}: {
  sources: { key: string; label: string; tierB: string; tierA: string; b: number; a: number }[];
  changed: boolean;
}) {
  if (sources.length === 0) return null;

  return (
    <div className={`${styles.table} ${styles.tableSource} ${changed ? styles.tableChanged : ''}`}>
      {sources.map((s) => {
        const tierMoved = changed && s.tierA !== s.tierB;
        return (
          <div key={s.key} className={styles.tr}>
            <span className={styles.tdLabel}>
              {s.label}
              {s.tierB && !tierMoved && <span className={styles.srcTier}>{s.tierB}</span>}
              {tierMoved && (
                <span className={styles.srcTier}>
                  {s.tierB || '없음'} → <b>{s.tierA || '없음'}</b>
                </span>
              )}
            </span>
            <span className={styles.tdNow}>{fmt(s.b)}</span>
            <span className={styles.tdArrow}>{changed ? '→' : ''}</span>
            <span className={styles.tdNext}>{changed ? fmt(s.a) : ''}</span>
            <span className={`${styles.tdDelta} ${deltaClass(s.a - s.b)}`}>
              {changed ? signed(s.a - s.b) : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 골드 환산 요약 — 카오스 게이트 귀속 골드·총합을 골드 표와 같은 열 구조로 찍는다.
function ValueTable({
  rows,
  changed,
  size = 'row',
}: {
  rows: { label: string; b: number; a: number; sum?: boolean; bound?: boolean }[];
  changed: boolean;
  size?: 'row' | 'total';
}) {
  const px = size === 'total' ? 20 : 17;
  return (
    <div
      className={[styles.table, size === 'total' ? styles.tableTotal : '', changed ? styles.tableChanged : '']
        .filter(Boolean)
        .join(' ')}
    >
      {rows.map((r) => (
        <div
          key={r.label}
          className={[styles.tr, r.sum ? styles.trSum : '', r.bound ? styles.trBound : ''].filter(Boolean).join(' ')}
        >
          <span className={styles.tdLabel}>
            {r.bound && (
              <Image
                src="/gold.webp"
                alt=""
                width={px}
                height={px}
                unoptimized
                className={styles.goldIcon}
                style={{ filter: BOUND_GOLD_FILTER }}
              />
            )}
            <span className={r.bound ? styles.boundText : undefined}>{r.label}</span>
          </span>
          <span className={styles.tdNow}>{fmt(r.b)}</span>
          <span className={styles.tdArrow}>{changed ? '→' : ''}</span>
          <span className={styles.tdNext}>{changed ? fmt(r.a) : ''}</span>
          <span className={`${styles.tdDelta} ${deltaClass(r.a - r.b)}`}>
            {changed ? signed(r.a - r.b) : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function decomposeGems(count: number): { level: number; count: number }[] {
  let rest = Math.floor(count);
  const out: { level: number; count: number }[] = [];
  for (let level = MAX_GEM_LEVEL; level >= 1; level--) {
    const unit = 3 ** (level - 1);
    const q = Math.floor(rest / unit);
    if (q > 0) {
      out.push({ level, count: q });
      rest -= q * unit;
    }
  }
  return out;
}

// 원정대 보석 합계 — 보석은 캐릭터 귀속이 아니라 원정대에서 합쳐 쓸 수 있다.
function GemSummary({ before, after, changed }: { before: number; after: number; changed: boolean }) {
  if (before <= 0 && after <= 0) return null;
  const lines = changed
    ? [
        { key: 'now', label: '현재', count: before, next: false },
        { key: 'next', label: '목표', count: after, next: true },
      ]
    : [{ key: 'now', label: '', count: before, next: false }];

  return (
    <div className={styles.gemBox}>
      {lines.map((l) => (
        <div key={l.key} className={styles.gemLine}>
          <span className={styles.gemLabel}>
            <Image src="/1fpqrjqghk.webp" alt="" width={18} height={18} unoptimized className={styles.goldIcon} />
            {l.label}
          </span>
          <span className={styles.gemCount}>{fmt(l.count)}개</span>
          <span className={styles.gemEq}>=</span>
          <span className={styles.gemChips}>
            {decomposeGems(l.count).map((g) => (
              <span key={g.level} className={`${styles.gemChip} ${l.next ? styles.gemChipNext : ''}`}>
                {g.level}레벨 ×{g.count}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GoldProjection({
  selectedCharacters,
  allCharacters,
}: {
  selectedCharacters: Character[];
  allCharacters?: Character[];
}) {
  const [mode, setMode] = useState<SimMode>('gold');
  const [basis, setBasis] = useState<SortBasis>('total');
  const [targets, setTargets] = useState<Record<string, number>>({});
  // 골드 인정 캐릭터 — 기본은 레벨 상위 6, 사용자가 직접 바꿀 수 있다
  const [included, setIncluded] = useState<string[] | null>(null);

  const { unitPrices, graceUnitPrice, thornUnitPrice, gemUnitPrice, latestPrices } = usePriceData();

  // 재료명 → 개당 골드. 거래소에 없는 재화는 PriceContext 의 환산 단가를 쓴다.
  const prices = useMemo<MaterialPrices>(
    () => ({
      '운명의 파괴석 결정': unitPrices[MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL] ?? 0,
      '운명의 수호석 결정': unitPrices[MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL] ?? 0,
      '위대한 운명의 돌파석': unitPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] ?? 0,
      '운명의 파괴석': unitPrices[MATERIAL_IDS.FATE_DESTRUCTION_STONE] ?? 0,
      '운명의 수호석': unitPrices[MATERIAL_IDS.FATE_GUARDIAN_STONE] ?? 0,
      '운명의 돌파석': unitPrices[MATERIAL_IDS.FATE_BREAKTHROUGH_STONE] ?? 0,
      '운명의 파편': unitPrices[MATERIAL_IDS.FATE_FRAGMENT] ?? 0,
      '은총의 파편': graceUnitPrice,
      '고통의 가시': thornUnitPrice,
      '용암의 숨결': latestPrices[LAVA_BREATH_ID] ?? 0,
      '빙하의 숨결': latestPrices[GLACIER_BREATH_ID] ?? 0,
      '1레벨 보석': gemUnitPrice,
      // 거래소에 없는 재화는 테이블의 고정가를 쓴다
      ...FIXED_PRICES,
    }),
    [unitPrices, graceUnitPrice, thornUnitPrice, gemUnitPrice, latestPrices],
  );

  // 원정대 전체 (레벨 내림차순). 전체 목록이 없으면 검색에서 체크한 캐릭터로 대체.
  const pool = useMemo(() => {
    const src = allCharacters && allCharacters.length > 0 ? allCharacters : selectedCharacters;
    return [...src].sort((a, b) => b.itemLevel - a.itemLevel);
  }, [allCharacters, selectedCharacters]);

  const poolKey = pool.map((c) => c.characterName).join('|');

  // 원정대가 바뀌면 상위 6으로 초기화
  useEffect(() => {
    setIncluded(null);
    setTargets({});
  }, [poolKey]);

  const activeNames = useMemo(
    () => included ?? pool.slice(0, GOLD_CHAR_LIMIT).map((c) => c.characterName),
    [included, pool],
  );
  const activeSet = useMemo(() => new Set(activeNames), [activeNames]);
  const active = useMemo(() => pool.filter((c) => activeSet.has(c.characterName)), [pool, activeSet]);

  const levelOf = (c: Character) => targets[c.characterName] ?? c.itemLevel;

  const before = useMemo(
    () =>
      expeditionClearGold(
        active.map((c) => ({ name: c.characterName, itemLevel: c.itemLevel })),
        basis,
      ),
    [active, basis],
  );

  const after = useMemo(
    () =>
      expeditionClearGold(
        active.map((c) => ({
          name: c.characterName,
          itemLevel: targets[c.characterName] ?? c.itemLevel,
        })),
        basis,
      ),
    [active, targets, basis],
  );

  const changed = active.some((c) => levelOf(c) !== c.itemLevel);

  const rowMaps = useMemo(
    () => ({
      b: new Map(before.rows.map((r) => [r.name, r])),
      a: new Map(after.rows.map((r) => [r.name, r])),
    }),
    [before, after],
  );

  // 대표 캐릭터 — 원정대 공통 콘텐츠(카오스 게이트·필드보스)를 계산할 캐릭터.
  // 항상 골드 인정 캐릭터 중 최고 레벨 (active 는 레벨 내림차순).
  const repName = active[0]?.characterName ?? '';

  // 캐릭터별 재료 — 상위 3레이드 클리어 보상 + 균열/전선·가토·모래시계,
  // 대표 캐릭터는 원정대 공통 콘텐츠(카오스 게이트·필드보스)까지 더한다.
  const matRows = useMemo(() => {
    const map = new Map<
      string,
      {
        countsB: MaterialCounts;
        countsA: MaterialCounts;
        valueB: number;
        valueA: number;
        eventGoldB: number;
        eventGoldA: number;
        sources: { key: string; label: string; tierB: string; tierA: string; b: number; a: number }[];
      }
    >();
    for (const c of active) {
      const isRep = c.characterName === repName;
      const contentB = charContentRewards(c.itemLevel, isRep);
      const contentA = charContentRewards(targets[c.characterName] ?? c.itemLevel, isRep);
      const raidB = pickedMaterials(rowMaps.b.get(c.characterName)?.picked ?? []);
      const raidA = pickedMaterials(rowMaps.a.get(c.characterName)?.picked ?? []);
      const countsB = addMaterials(raidB, contentTotal(contentB));
      const countsA = addMaterials(raidA, contentTotal(contentA));

      // 어느 콘텐츠에서 얼마가 나오는지 — 레벨을 올렸을 때 무엇이 바뀌었는지 바로 보이게 한다
      const sources = [
        {
          key: 'raid', label: '레이드 클리어', tierB: '', tierA: '',
          b: materialsValue(raidB, prices), a: materialsValue(raidA, prices),
        },
        {
          key: 'rift', label: '균열·전선', tierB: contentB.labels.rift, tierA: contentA.labels.rift,
          b: materialsValue(contentB.rift, prices), a: materialsValue(contentA.rift, prices),
        },
        {
          key: 'guardian', label: '가디언 토벌', tierB: contentB.labels.guardian, tierA: contentA.labels.guardian,
          b: materialsValue(contentB.guardian, prices), a: materialsValue(contentA.guardian, prices),
        },
        {
          key: 'sand', label: '할의 모래시계', tierB: contentB.labels.sand, tierA: contentA.labels.sand,
          b: materialsValue(contentB.sand, prices), a: materialsValue(contentA.sand, prices),
        },
        {
          key: 'event', label: '카게·필보', tierB: contentB.labels.event, tierA: contentA.labels.event,
          b: materialsValue(contentB.event, prices), a: materialsValue(contentA.event, prices),
        },
      ].filter((s) => s.b > 0 || s.a > 0);

      map.set(c.characterName, {
        countsB,
        countsA,
        valueB: materialsValue(countsB, prices),
        valueA: materialsValue(countsA, prices),
        eventGoldB: contentB.eventBoundGold,
        eventGoldA: contentA.eventBoundGold,
        sources,
      });
    }
    return map;
  }, [active, targets, repName, rowMaps, prices]);

  // 원정대에서 합쳐 쓸 수 있는 건 유통 골드와 보석뿐이라, 합계는 보석 수량만 모은다
  // (귀속 골드·재련 재료는 캐릭터 귀속이라 캐릭터 카드에서만 본다).
  const totalGems = useMemo(() => {
    let b = 0;
    let a = 0;
    for (const c of active) {
      const m = matRows.get(c.characterName);
      if (!m) continue;
      b += m.countsB['1레벨 보석'] ?? 0;
      a += m.countsA['1레벨 보석'] ?? 0;
    }
    return { b, a };
  }, [active, matRows]);

  // 레벨 버튼마다 "누르면 얼마 오르는지"를 미리 계산해 둔다 (그 캐릭터 자신의 클리어 골드 기준).
  // dead = 상위 3 구성이 그대로라 올려도 골드가 안 변하는 구간.
  const previews = useMemo(() => {
    const map = new Map<string, { level: number; delta: number; dead: boolean }[]>();
    const key = (g: GoldSplit) => (basis === 'free' ? g.free : g.total);
    for (const c of active) {
      const base = charClearGold(c.itemLevel, basis).gold;
      map.set(
        c.characterName,
        LEVEL_BREAKPOINTS.filter((l) => l > c.itemLevel).map((level) => {
          const g = charClearGold(level, basis).gold;
          return {
            level,
            delta: key(g) - key(base),
            dead: g.free === base.free && g.bound === base.bound,
          };
        }),
      );
    }
    return map;
  }, [active, basis]);

  const setTarget = (name: string, level: number | null) =>
    setTargets((prev) => {
      const next = { ...prev };
      if (level === null) delete next[name];
      else next[name] = level;
      return next;
    });

  const toggleInclude = (name: string) => {
    const cur = activeNames;
    if (cur.includes(name)) {
      setIncluded(cur.filter((n) => n !== name));
      setTarget(name, null);
    } else if (cur.length < GOLD_CHAR_LIMIT) {
      setIncluded([...cur, name]);
    }
  };

  if (pool.length === 0) return null;

  const full = activeNames.length >= GOLD_CHAR_LIMIT;

  return (
    <div className={styles.wrap}>
      {/* 상단 컨트롤 — 계산 범위 / 상위 3레이드 기준 / 초기화 */}
      <div className={styles.toolbar}>
        <div className={styles.segmented} role="tablist" aria-label="계산 범위">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'gold'}
            className={`${styles.seg} ${styles.segMain} ${mode === 'gold' ? styles.segOn : ''}`}
            onClick={() => setMode('gold')}
          >
            <Image src="/gold.webp" alt="" width={18} height={18} unoptimized className={styles.segIcon} />
            골드만
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'material'}
            className={`${styles.seg} ${styles.segMain} ${mode === 'material' ? styles.segOn : ''}`}
            onClick={() => setMode('material')}
          >
            <Image src="/gold.webp" alt="" width={18} height={18} unoptimized className={styles.segIcon} />
            골드
            <span className={styles.segPlus}>+</span>
            {/* 재련 재료 상자 — 지평의 성당 은총 계산에서 쓰는 것과 같은 아이콘 */}
            <Image src="/wofuswofy.webp" alt="" width={18} height={18} unoptimized className={styles.segIcon} />
            재련 재료
          </button>
        </div>

        <div className={styles.toolbarRight}>
          <span className={styles.segLabel}>상위 3레이드 기준</span>
          <div className={styles.segmented} role="group" aria-label="상위 3레이드 선정 기준">
            <button
              type="button"
              className={`${styles.seg} ${basis === 'total' ? styles.segOn : ''}`}
              onClick={() => setBasis('total')}
            >
              {/* 유통 + 귀속 합산이라 아이콘도 원본/귀속색 반반, 글자도 색을 나눈다 */}
              <span className={styles.splitIcon} aria-hidden="true">
                <Image src="/gold.webp" alt="" width={18} height={18} unoptimized className={styles.splitFree} />
                <Image src="/gold.webp" alt="" width={18} height={18} unoptimized className={styles.splitBound} />
              </span>
              <span className={styles.freeWord}>순수</span>
              <span className={styles.boundWord}>골드량</span>
            </button>
            <button
              type="button"
              className={`${styles.seg} ${basis === 'free' ? styles.segOn : ''}`}
              onClick={() => setBasis('free')}
            >
              <Image src="/gold.webp" alt="" width={18} height={18} unoptimized className={styles.segIcon} />
              유통 골드 우선
            </button>
          </div>
          {changed && (
            <button type="button" className={styles.resetBtn} onClick={() => setTargets({})}>
              레벨 초기화
            </button>
          )}
        </div>
      </div>

      {/* 골드 인정 6캐릭 — 라벨 + 칩 한 줄 */}
      <div className={styles.charPick}>
        <span className={styles.charPickLabel}>
          골드 인정 <span className={styles.charPickCount}>{activeNames.length}</span>/{GOLD_CHAR_LIMIT}
        </span>
        <div className={styles.chips}>
          {pool.map((c) => {
            const on = activeSet.has(c.characterName);
            return (
              <button
                key={c.characterName}
                type="button"
                disabled={!on && full}
                className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                onClick={() => toggleInclude(c.characterName)}
              >
                {c.characterName}
                <span className={styles.chipLv}>{c.itemLevel.toFixed(0)}</span>
              </button>
            );
          })}
        </div>
        {included !== null && (
          <button type="button" className={styles.miniBtn} onClick={() => setIncluded(null)}>
            상위 6으로
          </button>
        )}
      </div>

      <div className={styles.charList}>
        {active.map((c) => {
          const target = levelOf(c);
          const rowChanged = target !== c.itemLevel;
          const opts = previews.get(c.characterName) ?? [];
          const b = rowMaps.b.get(c.characterName);
          const a = rowMaps.a.get(c.characterName);
          const mat = matRows.get(c.characterName);

          const beforeNames = new Set(b?.picked.map((p) => p.name) ?? []);
          const afterNames = new Set(a?.picked.map((p) => p.name) ?? []);
          const enter = (a?.picked ?? []).filter((p) => !beforeNames.has(p.name));
          const leave = (b?.picked ?? []).filter((p) => !afterNames.has(p.name));
          // 레벨을 바꿔도 그대로 남는 레이드 (안 바꿨으면 지금 도는 3개 그대로)
          const stay = (a?.picked ?? []).filter((p) => beforeNames.has(p.name));

          return (
            <div
              key={c.characterName}
              className={`${styles.charRow} ${rowChanged ? styles.charRowActive : ''}`}
            >
              <div className={styles.charHead}>
                <span className={styles.charName}>{c.characterName}</span>
                <span className={styles.charLevel}>Lv.{c.itemLevel.toFixed(0)}</span>
                {rowChanged && <span className={styles.charLevelNext}>→ {target}</span>}
              </div>

              <div className={styles.levelBtns}>
                <button
                  type="button"
                  className={`${styles.lvBtn} ${!rowChanged ? styles.lvActive : ''}`}
                  onClick={() => setTarget(c.characterName, null)}
                >
                  <span className={styles.lvNum}>현재</span>
                  <span className={`${styles.lvHint} ${styles.lvHintPlain}`}>
                    {c.itemLevel.toFixed(0)}
                  </span>
                </button>
                {opts.map((o) => (
                  <button
                    key={o.level}
                    type="button"
                    title={o.dead ? '이 레벨까지 올려도 클리어 골드는 그대로입니다' : undefined}
                    className={[
                      styles.lvBtn,
                      target === o.level ? styles.lvActive : '',
                      o.dead ? styles.lvDead : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setTarget(c.characterName, target === o.level ? null : o.level)}
                  >
                    <span className={styles.lvNum}>{o.level}</span>
                    <span className={styles.lvHint}>{signed(o.delta)}</span>
                  </button>
                ))}
                {opts.length === 0 && <span className={styles.maxNote}>최고 레벨</span>}
              </div>

              <GoldTable
                before={b?.gold ?? { free: 0, bound: 0, total: 0 }}
                after={a?.gold ?? { free: 0, bound: 0, total: 0 }}
                changed={rowChanged}
                beforeLevel={Math.round(c.itemLevel)}
                afterLevel={target}
              />

              {mode === 'material' && mat && (
                <>
                  <MaterialTable before={mat.countsB} after={mat.countsA} changed={rowChanged} />
                  <SourceTable sources={mat.sources} changed={rowChanged} />
                  <ValueTable
                    changed={rowChanged}
                    rows={[
                      // 카오스 게이트 골드는 전액 귀속이라 귀속 색으로 따로 세운다
                      ...(mat.eventGoldB > 0 || mat.eventGoldA > 0
                        ? [{ label: '카게 골드', b: mat.eventGoldB, a: mat.eventGoldA, bound: true }]
                        : []),
                      {
                        label: '골드 + 재료',
                        b: (b?.gold.total ?? 0) + mat.valueB + mat.eventGoldB,
                        a: (a?.gold.total ?? 0) + mat.valueA + mat.eventGoldA,
                        sum: true,
                      },
                    ]}
                  />
                </>
              )}

              {/* 지금 돌고 있는 상위 3레이드. 레벨을 바꾸면 유지·추가·제거를 함께 보여준다. */}
              <div className={styles.raidSwap}>
                {stay.map((p) => (
                  <span key={p.name} className={`${styles.swapChip} ${styles.swapKeep}`}>
                    {p.name}
                  </span>
                ))}
                {enter.map((p) => (
                  <span key={p.name} className={`${styles.swapChip} ${styles.swapIn}`}>
                    + {p.name}
                  </span>
                ))}
                {leave.map((p) => (
                  <span key={p.name} className={`${styles.swapChip} ${styles.swapOut}`}>
                    - {p.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${styles.totalCard} ${changed ? styles.totalCardActive : ''}`}>
        <div className={styles.totalHead}>
          <span className={styles.totalTitle}>
            {mode === 'material' ? '원정대 공유 자산 (유통 골드 · 보석)' : '원정대 공유 자산 (유통 골드)'}
          </span>
          {changed && (() => {
            // 합계 증감도 공유 자산만 — 유통 골드(+재료 탭이면 보석 가치).
            const gemDelta = (totalGems.a - totalGems.b) * (prices['1레벨 보석'] ?? 0);
            const freeDelta = subGold(after.total, before.total).free;
            const delta = mode === 'material' ? freeDelta + gemDelta : freeDelta;
            return (
              <span className={`${styles.totalDeltaValue} ${deltaClass(delta)}`}>
                {signed(delta)}
                <span className={styles.totalUnit}>G</span>
              </span>
            );
          })()}
        </div>
        {/* 원정대에서 합쳐 쓸 수 있는 건 유통 골드와 보석뿐 — 귀속 골드·재련 재료는 캐릭터별로만 본다 */}
        <GoldTable before={before.total} after={after.total} changed={changed} size="total" onlyFree />
        {mode === 'material' && (
          <GemSummary before={totalGems.b} after={totalGems.a} changed={changed} />
        )}
      </div>
    </div>
  );
}
