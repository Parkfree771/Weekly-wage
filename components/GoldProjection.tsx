'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  LEVEL_BREAKPOINTS,
  charClearGold,
  expeditionClearGold,
  subGold,
  type GoldSplit,
  type SortBasis,
} from '@/lib/gold-projection';
import styles from './GoldProjection.module.css';

// 귀속 골드 아이콘 (사이트 공통 — gold.webp 에 색만 돌려 쓴다)
const BOUND_GOLD_FILTER = 'hue-rotate(280deg) saturate(1.0)';

// 원정대에서 주간 골드가 인정되는 캐릭터 수
const GOLD_CHAR_LIMIT = 6;

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
}: {
  before: GoldSplit;
  after: GoldSplit;
  changed: boolean;
  size?: 'row' | 'total';
  beforeLevel?: number;
  afterLevel?: number;
}) {
  const px = size === 'total' ? 20 : 17;
  const rows = [
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
        <div key={r.label} className={styles.tr}>
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

      <div className={`${styles.tr} ${styles.trSum}`}>
        <span className={styles.tdLabel}>합계</span>
        <span className={styles.tdNow}>{fmt(before.total)}</span>
        <span className={styles.tdArrow}>{changed ? '→' : ''}</span>
        <span className={styles.tdNext}>{changed ? fmt(after.total) : ''}</span>
        <span className={`${styles.tdDelta} ${deltaClass(after.total - before.total)}`}>
          {changed ? signed(after.total - before.total) : ''}
        </span>
      </div>
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
  const [basis, setBasis] = useState<SortBasis>('total');
  const [targets, setTargets] = useState<Record<string, number>>({});
  // 골드 인정 캐릭터 — 기본은 레벨 상위 6, 사용자가 직접 바꿀 수 있다
  const [included, setIncluded] = useState<string[] | null>(null);

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
      {/* 골드 인정 6캐릭 편집 */}
      <div className={styles.picker}>
        <div className={styles.pickerHead}>
          <span className={styles.pickerTitle}>골드 인정 캐릭터</span>
          <span className={styles.pickerCount}>
            {activeNames.length} / {GOLD_CHAR_LIMIT}
          </span>
          {included !== null && (
            <button type="button" className={styles.miniBtn} onClick={() => setIncluded(null)}>
              상위 6으로
            </button>
          )}
        </div>
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
      </div>

      <div className={styles.topBar}>
        <div className={styles.basisGroup} role="group" aria-label="상위 3레이드 선정 기준">
          <button
            type="button"
            className={`${styles.basisBtn} ${basis === 'total' ? styles.basisActive : ''}`}
            onClick={() => setBasis('total')}
          >
            순수 골드량
          </button>
          <button
            type="button"
            className={`${styles.basisBtn} ${basis === 'free' ? styles.basisActive : ''}`}
            onClick={() => setBasis('free')}
          >
            유통 골드 우선
          </button>
        </div>
        {changed && (
          <button type="button" className={styles.resetBtn} onClick={() => setTargets({})}>
            레벨 초기화
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

          const beforeNames = new Set(b?.picked.map((p) => p.name) ?? []);
          const afterNames = new Set(a?.picked.map((p) => p.name) ?? []);
          const enter = (a?.picked ?? []).filter((p) => !beforeNames.has(p.name));
          const leave = (b?.picked ?? []).filter((p) => !afterNames.has(p.name));

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

              {rowChanged && (enter.length > 0 || leave.length > 0) && (
                <div className={styles.raidSwap}>
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
              )}
            </div>
          );
        })}
      </div>

      <div className={`${styles.totalCard} ${changed ? styles.totalCardActive : ''}`}>
        <div className={styles.totalHead}>
          <span className={styles.totalTitle}>원정대 주간 클리어 골드</span>
          {changed && (
            <span className={`${styles.totalDeltaValue} ${deltaClass(subGold(after.total, before.total).total)}`}>
              {signed(subGold(after.total, before.total).total)}
              <span className={styles.totalUnit}>G</span>
            </span>
          )}
        </div>
        <GoldTable before={before.total} after={after.total} changed={changed} size="total" />
      </div>
    </div>
  );
}
