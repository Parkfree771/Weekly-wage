'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import { Container, Form } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import type { MaterialReward, RaidTableEntry } from '@/data/rewardTable';
import { PriceProvider, usePriceData } from '@/contexts/PriceContext';
import { GOLD_RAID_LIMIT, LEVEL_BREAKPOINTS, ZERO_GOLD, addGold, expeditionClearGold, type ExpeditionRow, type GoldSplit, type SortBasis } from '@/lib/gold-projection';
import { RAID_ENTRIES, autoPick, raidGold, settleMoreCost, type RankedGroup } from '@/lib/raid-gold';
import styles from './raid-gold.module.css';
// 레이드 칸·보상 표 공용 스타일
import tableStyles from './reward-table.module.css';

// 재료 아이콘 (패키지 효율과 동일한 최신 아이콘 사용)
const MATERIAL_ICONS: Record<string, string> = {
  '운명의 파괴석': '/destruction-stone.webp',
  '운명의 수호석': '/guardian-stone.webp',
  '운명의 돌파석': '/breakthrough-stone.webp',
  '운명의 파편': '/fate-fragment.webp',
  '운명의 파괴석 결정': '/destruction-stone-crystal.webp',
  '운명의 수호석 결정': '/guardian-stone-crystal.webp',
  '위대한 운명의 돌파석': '/breakthrough-stone-crystal.webp',
  '은총의 파편': '/dmschddmlvkvus.webp',
  '코어': '/cerka-core.webp',
  '고통의 가시': '/pulsating-thorn.webp',
  '사령의 잔영': '/wangap-promo-wraith-echo.webp',
  '죽음의 손': '/wangap-promo-hand-of-death.webp',
};

const MIN_LEVEL = LEVEL_BREAKPOINTS[0];

// 레이드 이름으로 이미지·난이도를 찾는다
const RAID_BY_NAME = new Map(RAID_ENTRIES.map((item) => [item.entry.name, item]));

type Character = {
  characterName: string;
  itemLevel: number;
};

// 레이드 카드의 주인 — 레벨 선택 영역 또는 캐릭터 한 명
type RaidOwner = {
  key: string;
  level: number | null;
  onSwap: (raid: RankedGroup) => void; // 난이도 교체
};

const LEVEL_OWNER_KEY = 'level';
// 토글·펼침 상태는 주인 × 레이드 단위 (난이도를 바꿔도 유지된다)
const optionKey = (ownerKey: string, group: string) => `${ownerKey}::${group}`;
const isBelow = (itemLevel: number | null, entry: RaidTableEntry) => itemLevel !== null && itemLevel < entry.level;

type RaidSummary = {
  gold: GoldSplit;
  settled: GoldSplit; // 더보기 비용을 뺀 골드
  moreValue: number;
  clearValue: number;
  anyMore: boolean;
  anyClear: boolean;
};

type CharacterPlan = {
  row: ExpeditionRow;
  raids: RankedGroup[];
  summary: RaidSummary;
};

const BASIS_OPTIONS: { key: SortBasis; label: string }[] = [
  { key: 'total', label: '총 골드순' },
  { key: 'free', label: '유통 골드순' },
];

type CheckType = 'basic' | 'more';

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
const signed = (n: number) => `${n >= 0 ? '+' : ''}${fmt(n)}`;
// 난이도가 하나뿐인 베히모스는 테이블에 '-' 로 들어 있다
const diffLabel = (entry: RaidTableEntry) => (entry.difficulty === '-' ? '기본' : entry.difficulty);

// 목록 칸에 쓰는 축약 표기 ('벨가 나메 1780')
const SHORT_RAID_NAMES: Record<string, string> = { '벨가르딘': '벨가', '베히모스': '베히' };
const SHORT_DIFFICULTIES: Record<string, string> = { '나이트메어': '나메' };

// 난이도 색 — 사이트 공통(주간 레이드·익스트림: 노말 노랑 · 하드 주황 · 나메 보라). 성당 단계도 낮은 순으로 맞춘다
const DIFF_COLORS: Record<string, string> = {
  '나이트메어': '#7e22ce',
  '3단계': '#7e22ce',
  '하드': 'var(--color-accent)',
  '2단계': 'var(--color-accent)',
  '노말': '#eab308',
  '1단계': '#eab308',
};
// 사진 위 유리 띠에서는 진한 난이도 색이 어두워 묻히므로 같은 색 계열의 밝은 톤을 쓴다
const DIFF_GLASS_COLORS: Record<string, string> = {
  '나이트메어': '#d8b4fe',
  '3단계': '#d8b4fe',
  '하드': '#fdba74',
  '2단계': '#fdba74',
  '노말': '#fde047',
  '1단계': '#fde047',
};
// 밝은 카드 위 글자용 — 노랑은 흰 바탕에서 안 보여 진한 황토색을 쓴다
const diffTextColor = (entry: RaidTableEntry) =>
  (DIFF_COLORS[entry.difficulty] === '#eab308' ? '#a16207' : DIFF_COLORS[entry.difficulty] ?? 'var(--text-primary)');
const diffStyle = (entry: RaidTableEntry) => ({
  '--diff': DIFF_COLORS[entry.difficulty] ?? 'var(--color-primary)',
  '--diff-glass': DIFF_GLASS_COLORS[entry.difficulty] ?? '#fff',
  '--diff-text': diffTextColor(entry),
}) as CSSProperties;

// 골드 코인 — 귀속은 주간 레이드와 같이 코인 색을 돌려 구분한다
function Coin({ size = 18, bound = false, off = false }: { size?: number; bound?: boolean; off?: boolean }) {
  const filter = bound ? styles.boundCoin : off ? styles.offCoin : '';
  return <Image src="/gold.webp" alt="" width={size} height={Math.round((size * 183) / 200)} className={`${styles.coin} ${filter}`} unoptimized />;
}

function Gold({ children, size, bound, off, className = '' }: { children: ReactNode; size?: number; bound?: boolean; off?: boolean; className?: string }) {
  return (
    <span className={`${styles.gold} ${className}`}>
      <Coin size={size} bound={bound} off={off} />
      {children}
    </span>
  );
}

// 글자가 트랙 안에 들어간 토글 — 켜면 초록 트랙에 손잡이가 오른쪽으로 가고 체크가 붙는다
function Toggle({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`${styles.toggle} ${on ? styles.toggleOn : ''}`} onClick={onToggle}>
      <span className={styles.toggleKnob}>
        {on && (
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 8.5 6.5 12 13 4.5" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

export default function RaidGoldPage() {
  return (
    <PriceProvider>
      <RaidGoldInner />
    </PriceProvider>
  );
}

function RaidGoldInner() {
  const { unitPrices, graceUnitPrice, thornUnitPrice, wraithEchoUnitPrice, handOfDeathUnitPrice, loading } = usePriceData();

  // 기본은 레벨 미선택 — 고르면 그 레벨 기준으로 자동 선택한다
  const [level, setLevel] = useState<number | null>(null);
  const [levelInput, setLevelInput] = useState('');
  const [basis, setBasis] = useState<SortBasis>('total');
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [searched, setSearched] = useState(false);
  // 선택한 레이드 이름 ('세르카 나메' 등) — 같은 레이드는 난이도 하나만
  const [picked, setPicked] = useState<string[]>([]);
  // 캐릭터별로 난이도를 바꾼 레이드 목록 (없으면 자동 선택 그대로)
  const [charPicks, setCharPicks] = useState<Record<string, string[]>>({});
  // 원정대 전체를 유통 골드 기준으로 자동 선택
  const [freeFirst, setFreeFirst] = useState(false);
  // 원정대 전체 더보기 — 캐릭터 카드에서 직접 켜고 끈 값(moreOn)이 있으면 그쪽이 우선
  const [charMoreAll, setCharMoreAll] = useState(false);
  // 레이드 목록 전체 보기 (기본 3줄)
  const [showAllRaids, setShowAllRaids] = useState(false);
  // 펼친 레이드 — 기본은 전부 접어서 골드만 보여 준다
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // 레이드별 더보기 — 켜면 그 레이드 전 관문을 더보기한다고 치고 식에 반영
  const [moreOn, setMoreOn] = useState<Record<string, boolean>>({});
  // 레이드별 기본 클리어 재료 가치 — 켜면 그 레이드의 클리어 재료 가치를 식에 더한다
  const [clearValueOn, setClearValueOn] = useState<Record<string, boolean>>({});
  // 재료 체크 상태: raid × 구분(기본/더보기) × 관문 × 재료명 단위 (itemId 0인 재료가 여럿이라 itemName으로 구분)
  const [materialChecks, setMaterialChecks] = useState<Record<string, boolean>>({});

  // 시세 기준일 — SSR/클라이언트 불일치 방지 위해 마운트 후 표시
  const [priceDate, setPriceDate] = useState('');
  useEffect(() => {
    const d = new Date();
    setPriceDate(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`);
  }, []);

  // 레벨이나 정렬 기준을 바꾸면 그 기준으로 다시 자동 선택한다. 레벨을 해제하면 선택도 비운다
  // 캐릭터 영역은 건드리지 않는다
  const applyAuto = (nextLevel: number | null, nextBasis: SortBasis) => {
    const clearOptions = (prev: Record<string, boolean>) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${LEVEL_OWNER_KEY}::`)));
    setLevel(nextLevel);
    setBasis(nextBasis);
    setPicked(nextLevel === null ? [] : autoPick(nextLevel, nextBasis));
    setExpanded(clearOptions);
    setMoreOn(clearOptions);
    setClearValueOn(clearOptions);
  };

  const handleLevelInput = (value: string) => {
    setLevelInput(value);
    const n = Number(value);
    if (value === '') applyAuto(null, basis);
    else if (n >= MIN_LEVEL && n < 2000) applyAuto(n, basis);
  };

  // 레벨 버튼은 다시 누르면 해제
  const toggleLevelChip = (chip: number, active: boolean) => {
    setLevelInput(active ? '' : String(chip));
    applyAuto(active ? null : chip, basis);
  };

  // 레벨 미선택이면 수동 선택을 지우지 않고 정렬 기준만 바꾼다
  const changeBasis = (nextBasis: SortBasis) => {
    if (level === null) setBasis(nextBasis);
    else applyAuto(level, nextBasis);
  };

  const isMoreOn = (key: string) => moreOn[key] ?? (key.startsWith('char:') && charMoreAll);

  // 기준이 바뀌면 고르는 레이드가 달라지므로 캐릭터별 난이도 수정은 비운다
  const toggleFreeFirst = () => {
    setFreeFirst((prev) => !prev);
    setCharPicks({});
  };

  // 은총의 파편·고통의 가시·사령의 잔영·죽음의 손은 거래소 미상장이지만 교환 상자
  // 구성품 시세로 환산한 값이 있다. 코어는 환산 기준이 없어 0으로 둔다.
  const convertedUnitPrices: Record<string, number> = {
    '은총의 파편': graceUnitPrice,
    '고통의 가시': thornUnitPrice,
    '사령의 잔영': wraithEchoUnitPrice,
    '죽음의 손': handOfDeathUnitPrice,
  };
  const unitPriceOf = (m: MaterialReward): number =>
    convertedUnitPrices[m.itemName] ?? (m.itemId !== 0 ? unitPrices[m.itemId] || 0 : 0);
  const isPriced = (m: MaterialReward) =>
    m.itemId !== 0 || convertedUnitPrices[m.itemName] !== undefined;

  const checkKey = (raidName: string, type: CheckType, gate: number, itemName: string) =>
    `${raidName}::${type}::${gate}::${itemName}`;
  const isMatChecked = (raidName: string, type: CheckType, gate: number, itemName: string) =>
    materialChecks[checkKey(raidName, type, gate, itemName)] ?? true;
  const toggleMatCheck = (raidName: string, type: CheckType, gate: number, itemName: string) => {
    const key = checkKey(raidName, type, gate, itemName);
    setMaterialChecks((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };
  const getCheckedValue = (materials: MaterialReward[], raidName: string, type: CheckType, gate: number): number =>
    materials.reduce((sum, m) => {
      if (!isMatChecked(raidName, type, gate, m.itemName)) return sum;
      return sum + unitPriceOf(m) * m.amount;
    }, 0);

  // 다시 누르면 해제, 같은 레이드의 다른 난이도를 누르면 교체. 이미 3개면 먼저 해제해야 다른 레이드를 고를 수 있다
  const togglePick = ({ group, entry }: RankedGroup) =>
    setPicked((prev) => {
      if (prev.includes(entry.name)) return prev.filter((n) => n !== entry.name);
      const sameRaid = prev.find((n) => RAID_BY_NAME.get(n)?.group === group);
      if (sameRaid) return prev.map((n) => (n === sameRaid ? entry.name : n));
      return prev.length >= GOLD_RAID_LIMIT ? prev : [...prev, entry.name];
    });

  // 캐릭터당 상위 3개 레이드, 원정대 상위 6캐릭만 골드 인정 (주간 골드 규칙)
  const expedition = useMemo(
    () => expeditionClearGold(selectedCharacters.map((c) => ({ name: c.characterName, itemLevel: c.itemLevel })), freeFirst ? 'free' : 'total'),
    [selectedCharacters, freeFirst],
  );

  // 레벨이 모자라도 고를 수는 있다 (입장 가능한 난이도 먼저, 그다음 낮은 레벨부터)
  const orderedRaids = useMemo(() => (level === null
    ? RAID_ENTRIES
    : [
        ...RAID_ENTRIES.filter((r) => level >= r.entry.level),
        ...RAID_ENTRIES.filter((r) => level < r.entry.level).sort((a, b) => a.entry.level - b.entry.level),
      ]), [level]);
  const pickedRaids = orderedRaids.filter((r) => picked.includes(r.entry.name));
  const pickFull = pickedRaids.length >= GOLD_RAID_LIMIT;

  // 재료 가치는 은총·가시·잔영·손 환산값 포함, 표에서 체크 해제한 재료 제외
  const raidMoreCost = (entry: RaidTableEntry) => entry.gates.reduce((s, g) => s + g.moreGold, 0);
  const raidMoreValue = (entry: RaidTableEntry) =>
    entry.gates.reduce((s, g) => s + getCheckedValue(g.more, entry.name, 'more', g.gate), 0);
  const raidClearValue = (entry: RaidTableEntry) =>
    entry.gates.reduce((s, g) => s + getCheckedValue(g.clear, entry.name, 'basic', g.gate), 0);

  // 귀속은 캐릭터별 풀이라 더보기 비용 정산도 주인 단위로 한다
  const summarize = (raids: RankedGroup[], ownerKey: string): RaidSummary => {
    const gold = raids.reduce((sum, r) => addGold(sum, raidGold(r.entry)), ZERO_GOLD);
    const moreEntries = raids.filter((r) => isMoreOn(optionKey(ownerKey, r.group.group))).map((r) => r.entry);
    const clearEntries = raids.filter((r) => clearValueOn[optionKey(ownerKey, r.group.group)]).map((r) => r.entry);
    return {
      gold,
      settled: settleMoreCost(gold, moreEntries.reduce((s, e) => s + raidMoreCost(e), 0)),
      moreValue: moreEntries.reduce((s, e) => s + raidMoreValue(e), 0),
      clearValue: clearEntries.reduce((s, e) => s + raidClearValue(e), 0),
      anyMore: moreEntries.length > 0,
      anyClear: clearEntries.length > 0,
    };
  };

  const levelOwner: RaidOwner = { key: LEVEL_OWNER_KEY, level, onSwap: togglePick };
  const levelSummary = summarize(pickedRaids, LEVEL_OWNER_KEY);

  const namesOf = (row: ExpeditionRow) => charPicks[row.name] ?? row.picked.map((p) => p.name);

  const swapCharRaid = (row: ExpeditionRow, { group, entry }: RankedGroup) =>
    setCharPicks((prev) => ({
      ...prev,
      [row.name]: (prev[row.name] ?? namesOf(row)).map((n) => (RAID_BY_NAME.get(n)?.group === group ? entry.name : n)),
    }));

  const characterPlans: CharacterPlan[] = expedition.rows.map((row) => {
    const raids = namesOf(row).flatMap((name) => {
      const raid = RAID_BY_NAME.get(name);
      return raid ? [raid] : [];
    });
    return { row, raids, summary: summarize(raids, `char:${row.name}`) };
  });

  const allCharMoreOn = characterPlans.length > 0 && characterPlans.every(({ row, raids }) =>
    raids.every((r) => isMoreOn(optionKey(`char:${row.name}`, r.group.group))));

  // 전체 더보기 — 카드별로 켜고 끈 값을 비워서 원정대 레이드 전부에 적용한다
  const toggleAllCharMore = () => {
    setCharMoreAll(!allCharMoreOn);
    setMoreOn((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith('char:'))));
  };

  // 원정대 합계 — 골드가 인정되는 6캐릭만 더한다
  const expeditionSummary = characterPlans.filter((p) => p.row.counted).reduce<RaidSummary>((sum, { summary: s }) => ({
    gold: addGold(sum.gold, s.gold),
    settled: addGold(sum.settled, s.settled),
    moreValue: sum.moreValue + s.moreValue,
    clearValue: sum.clearValue + s.clearValue,
    anyMore: sum.anyMore || s.anyMore,
    anyClear: sum.anyClear || s.anyClear,
  }), { gold: ZERO_GOLD, settled: ZERO_GOLD, moreValue: 0, clearValue: 0, anyMore: false, anyClear: false });

  const renderRaidTile = (raid: RankedGroup) => {
    const { group, entry } = raid;
    const gold = raidGold(entry);
    const isPicked = picked.includes(entry.name);
    const locked = !isPicked && isBelow(level, entry);
    // 3개를 다 고르면 나머지는 비활성화
    const off = !isPicked && pickFull;
    const profit = raidMoreValue(entry) - raidMoreCost(entry);
    return (
      <button
        key={entry.name}
        type="button"
        className={`${tableStyles.raidCard} ${styles.tile} ${isPicked ? styles.tilePicked : ''} ${off ? styles.tileOff : ''} ${locked ? styles.tileLocked : ''}`}
        disabled={off}
        onClick={() => togglePick(raid)}
        aria-pressed={isPicked}
      >
        <Image src={group.image} alt={entry.name} fill sizes="220px" className={styles.raidImg} unoptimized />
        <span className={tableStyles.raidOverlay} />
        {isPicked && <span className={styles.tileCheck}>✓</span>}
        {locked && (
          <span className={styles.lockBadge}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" />
            </svg>
          </span>
        )}

        <span className={tableStyles.raidInfo}>
          {/* 마우스를 올리면 더보기 내역이 펼쳐진다 */}
          <span className={styles.tileTip}>
            <span>더보기 재료 가치 <b>{loading ? '…' : `+${fmt(raidMoreValue(entry))}`}</b></span>
            <span>더보기 비용 <b>-{fmt(raidMoreCost(entry))}</b></span>
            <span>더보기 손익 <b className={profit >= 0 ? styles.tileProfit : styles.tileLoss}>{loading ? '…' : signed(profit)}</b></span>
          </span>
          <span className={tableStyles.raidName}>{entry.name}</span>
          <span className={tableStyles.raidLevel}>Lv. {entry.level}</span>
          <span className={styles.tileGoldRow}>
            <Gold size={16} off={off || locked} className={styles.tileGold}>{fmt(gold.total)}</Gold>
            <span className={`${styles.tileMoreValue} ${profit >= 0 ? styles.tileProfit : styles.tileLoss}`}>
              <span className={styles.tileMoreLabel}>더보기</span>
              {loading ? '…' : signed(profit)}
            </span>
          </span>
        </span>
      </button>
    );
  };

  // 재료 표 (체크박스 + 단가/총가치 표)
  const renderMaterialTable = (materials: MaterialReward[], raidName: string, type: CheckType, gate: number) => (
    <table className={tableStyles.materialTable}>
      <thead>
        <tr>
          <th></th>
          <th>재료</th>
          <th>수량</th>
          <th>단가</th>
          <th>총가치</th>
        </tr>
      </thead>
      <tbody>
        {materials.map((m) => {
          const untradable = !isPriced(m);
          const checked = isMatChecked(raidName, type, gate, m.itemName);
          const unitPrice = untradable ? 0 : unitPriceOf(m);
          const icon = MATERIAL_ICONS[m.itemName];
          return (
            <tr key={m.itemName} style={!checked ? { opacity: 0.4 } : undefined}>
              <td>
                <Form.Check
                  type="checkbox"
                  checked={checked}
                  disabled={untradable}
                  onChange={() => toggleMatCheck(raidName, type, gate, m.itemName)}
                  className={tableStyles.materialCheckbox}
                />
              </td>
              <td>
                <div className={tableStyles.materialCell}>
                  {icon && <Image src={icon} alt={m.itemName} width={22} height={22} unoptimized />}
                  <span>{m.itemName}</span>
                </div>
              </td>
              <td>{fmt(m.amount)}</td>
              <td>{untradable ? '-' : loading ? '—' : unitPrice >= 1 ? unitPrice.toFixed(2) : unitPrice.toFixed(4)}</td>
              <td>{untradable ? '-' : loading ? '—' : fmt(unitPrice * m.amount)}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className={tableStyles.subtotalRow}>
          <td colSpan={4}>재료 가치</td>
          <td>{loading ? '—' : fmt(getCheckedValue(materials, raidName, type, gate))}</td>
        </tr>
      </tfoot>
    </table>
  );

  // 펼친 상세 — 기본 클리어 보상 → 더보기 보상 → 합계 순서
  const renderDetail = ({ group, entry }: RankedGroup, key: string) => {
    const totalGold = raidGold(entry).total;
    const totalMoreGold = entry.gates.reduce((s, g) => s + g.moreGold, 0);
    const totalBasicValue = entry.gates.reduce((s, g) => s + getCheckedValue(g.clear, entry.name, 'basic', g.gate), 0);
    const totalMoreValue = entry.gates.reduce((s, g) => s + getCheckedValue(g.more, entry.name, 'more', g.gate), 0);
    const moreProfit = totalMoreValue - totalMoreGold;

    return (
      <div className={styles.detail} style={diffStyle(entry)}>
        <div className={styles.detailHead}>
          <h3 className={styles.detailTitle}>{group.group}</h3>
          <span className={styles.diffBadge}>{diffLabel(entry)}</span>
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => setExpanded((prev) => ({ ...prev, [key]: false }))}
          >
            접기
          </button>
        </div>

        <div className={tableStyles.detailSection}>
          <h4 className={tableStyles.detailSectionTitle}>기본 클리어 보상</h4>
          <div className={tableStyles.gatesGrid}>
            {entry.gates.map((g) => (
              <div key={`basic-${g.gate}`} className={tableStyles.gateSection}>
                <div className={tableStyles.gateHeader}>
                  <span className={tableStyles.gateName}>{g.gate}관문</span>
                </div>
                <div className={styles.gateGoldRow}>
                  <Gold className={styles.freeText}>유통 {fmt(g.gold - g.boundGold)}</Gold>
                  <Gold bound className={styles.boundText}>귀속 {fmt(g.boundGold)}</Gold>
                </div>
                {renderMaterialTable(g.clear, entry.name, 'basic', g.gate)}
              </div>
            ))}
          </div>
        </div>

        <div className={tableStyles.detailSection}>
          <h4 className={tableStyles.detailSectionTitle}>더보기 보상</h4>
          <div className={tableStyles.gatesGrid}>
            {entry.gates.map((g) => {
              const profit = getCheckedValue(g.more, entry.name, 'more', g.gate) - g.moreGold;
              return (
                <div key={`more-${g.gate}`} className={tableStyles.gateSection}>
                  <div className={tableStyles.gateHeader}>
                    <span className={tableStyles.gateName}>{g.gate}관문 더보기</span>
                  </div>
                  <div className={styles.gateGoldRow}>
                    <span>더보기 비용</span>
                    <Gold className={styles.lossText}>-{fmt(g.moreGold)}</Gold>
                  </div>
                  {renderMaterialTable(g.more, entry.name, 'more', g.gate)}
                  <div className={tableStyles.gateTotalRow}>
                    <span>더보기 손익</span>
                    <Gold className={profit >= 0 ? styles.profitText : styles.lossText}>
                      {loading ? '…' : signed(profit)}
                    </Gold>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={tableStyles.finalSection}>
          <div className={tableStyles.finalTitle}>더보기 포함 총 가치</div>
          <div className={tableStyles.finalGrid}>
            <div className={tableStyles.finalGridItem}>
              <div className={tableStyles.finalLabel}>클리어 골드</div>
              <Gold className={`${tableStyles.finalItemValue} ${styles.freeText}`}>{fmt(totalGold)}</Gold>
            </div>
            <div className={tableStyles.finalGridItem}>
              <div className={tableStyles.finalLabel}>기본 재료 가치</div>
              <div className={tableStyles.finalItemValue}>{loading ? '—' : `+${fmt(totalBasicValue)}`}</div>
            </div>
            <div className={tableStyles.finalGridItem}>
              <div className={tableStyles.finalLabel}>더보기 재료 가치</div>
              <div className={tableStyles.finalItemValue}>{loading ? '—' : `+${fmt(totalMoreValue)}`}</div>
            </div>
            <div className={tableStyles.finalGridItem}>
              <div className={tableStyles.finalLabel}>더보기 비용</div>
              <div className={`${tableStyles.finalItemValue} ${styles.lossText}`}>-{fmt(totalMoreGold)}</div>
            </div>
            <div className={`${tableStyles.finalGridItem} ${tableStyles.finalTotalRow}`}>
              <div className={tableStyles.finalLabel}>더보기 손익</div>
              <Gold size={22} className={`${styles.finalValue} ${moreProfit >= 0 ? styles.profitText : styles.lossText}`}>
                {loading ? '—' : signed(moreProfit)}
              </Gold>
            </div>
            <div className={`${tableStyles.finalGridItem} ${tableStyles.finalTotalRow}`}>
              <div className={tableStyles.finalLabel}>총 가치</div>
              <Gold size={22} className={`${styles.finalValue} ${styles.freeText}`}>
                {loading ? '—' : fmt(totalGold + totalBasicValue + totalMoreValue - totalMoreGold)}
              </Gold>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 레벨 선택 영역과 캐릭터별 영역이 같은 카드를 쓴다 — owner 가 설정(토글·펼침)과 레벨을 구분한다
  const renderRaidRow = (raid: RankedGroup, owner: RaidOwner) => {
    const { group, entry } = raid;
    const key = optionKey(owner.key, group.group);
    const gold = raidGold(entry);
    const open = expanded[key] ?? false;
    const more = isMoreOn(key);
    const clear = clearValueOn[key] ?? false;
    const hasValue = more || clear;
    const rowTotal = gold.total
      - (more ? raidMoreCost(entry) : 0)
      + (more ? raidMoreValue(entry) : 0)
      + (clear ? raidClearValue(entry) : 0);
    const materialIcon = <Image src="/more-materials.webp" alt="" width={20} height={20} unoptimized />;
    return (
      <article key={key} className={styles.raidRow} style={diffStyle(entry)}>
        <div className={styles.raidRowImage}>
          <Image src={group.image} alt={group.group} fill sizes="200px" className={styles.raidImg} unoptimized />
          {isBelow(owner.level, entry) && <span className={styles.pickLevelTag}>Lv.{entry.level} 필요</span>}
        </div>

        <div className={styles.raidRowBody}>
          <h3 className={styles.pickTitle}>
            <span>{SHORT_RAID_NAMES[group.group] ?? group.group}</span>
            {entry.difficulty !== '-' && <span className={styles.tileDiff}>{SHORT_DIFFICULTIES[entry.difficulty] ?? entry.difficulty}</span>}
            <span className={`${styles.tileDiff} ${styles.pickLevel}`}>Lv.{entry.level}</span>
          </h3>
          <div className={styles.pickToggles}>
            <Toggle on={clear} label="기본 재료" onToggle={() => setClearValueOn((prev) => ({ ...prev, [key]: !clear }))} />
            <Toggle on={more} label="더보기" onToggle={() => setMoreOn((prev) => ({ ...prev, [key]: !more }))} />
          </div>
          <div className={styles.diffPills}>
            {group.entries.map((e) => {
              const active = e.name === entry.name;
              return (
                <button
                  key={e.name}
                  type="button"
                  className={`${styles.diffPill} ${active ? styles.diffPillActive : ''} ${isBelow(owner.level, e) ? styles.diffPillLocked : ''}`}
                  style={diffStyle(e)}
                  onClick={() => { if (!active) owner.onSwap({ group, entry: e }); }}
                  aria-pressed={active}
                >
                  {SHORT_DIFFICULTIES[e.difficulty] ?? diffLabel(e)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 골드 계산 — 항목은 왼쪽, 금액은 오른쪽 끝 */}
        <div className={styles.calc}>
          <dl className={styles.calcRows}>
            <div>
              <dt>유통</dt>
              <dd><Gold className={styles.calcFree}>{fmt(gold.free)}</Gold></dd>
            </div>
            <div>
              <dt>귀속</dt>
              <dd><Gold bound className={styles.calcBound}>{fmt(gold.bound)}</Gold></dd>
            </div>
            {more && (
              <>
                <div>
                  <dt>더보기 비용</dt>
                  <dd><Gold className={styles.calcLoss}>-{fmt(raidMoreCost(entry))}</Gold></dd>
                </div>
                <div>
                  <dt>더보기 재료 가치</dt>
                  <dd className={styles.gold}>{materialIcon}+{loading ? '—' : fmt(raidMoreValue(entry))}</dd>
                </div>
              </>
            )}
            {clear && (
              <div>
                <dt>기본 재료 가치</dt>
                <dd className={styles.gold}>{materialIcon}+{loading ? '—' : fmt(raidClearValue(entry))}</dd>
              </div>
            )}
            <div className={styles.calcResult}>
              <dt>{hasValue ? '총 가치' : '총 골드'}</dt>
              <dd><Gold size={22} className={styles.calcFree}>{hasValue && loading ? '—' : fmt(rowTotal)}</Gold></dd>
            </div>
          </dl>

          <button
            type="button"
            className={`${styles.expandBtn} ${open ? styles.expandBtnOn : ''}`}
            onClick={() => setExpanded((prev) => ({ ...prev, [key]: !open }))}
            aria-expanded={open}
          >
            {open ? '접기' : '자세히 보기'}
          </button>
        </div>
      </article>
    );
  };

  // 카드는 한 줄에 3장, 펼친 표는 그 아래 전체 폭으로
  const renderRaidList = (raids: RankedGroup[], owner: RaidOwner) => (
    <>
      <div className={styles.rowList}>{raids.map((raid) => renderRaidRow(raid, owner))}</div>
      {raids.map((raid) => {
        const key = optionKey(owner.key, raid.group.group);
        return expanded[key] ? <div key={key}>{renderDetail(raid, key)}</div> : null;
      })}
    </>
  );

  const renderEquation = (s: RaidSummary) => {
    const anyValue = s.anyMore || s.anyClear;
    return (
      <div className={styles.equation}>
        <div className={styles.term}>
          <span className={styles.termLabel}>{anyValue ? '총 가치' : '총 골드'}</span>
          <Gold size={44} className={styles.termTotal}>
            {anyValue && loading ? '—' : fmt(s.settled.total + s.moreValue + s.clearValue)}
          </Gold>
        </div>
        <span className={styles.operator}>=</span>
        <div className={styles.term}>
          <span className={styles.termLabel}>유통</span>
          <Gold size={32} className={`${styles.termValue} ${styles.freeText}`}>{fmt(s.settled.free)}</Gold>
          <span className={`${styles.termNote} ${s.gold.free > s.settled.free ? '' : styles.termHidden}`}>더보기 -{fmt(s.gold.free - s.settled.free)}</span>
        </div>
        <span className={styles.operator}>+</span>
        <div className={styles.term}>
          <span className={styles.termLabel}>귀속</span>
          <Gold size={32} bound className={`${styles.termValue} ${styles.boundText}`}>{fmt(s.settled.bound)}</Gold>
          <span className={`${styles.termNote} ${s.gold.bound > s.settled.bound ? '' : styles.termHidden}`}>더보기 -{fmt(s.gold.bound - s.settled.bound)}</span>
        </div>
        {/* 토글을 켜도 카드가 밀리지 않게 재료 항목은 꺼져 있어도 자리를 차지한다 */}
        <span className={`${styles.operator} ${s.anyMore ? '' : styles.termHidden}`}>+</span>
        <div className={`${styles.term} ${s.anyMore ? '' : styles.termHidden}`}>
          <span className={styles.termLabel}>더보기 재료 가치</span>
          <span className={`${styles.gold} ${styles.termValue}`}>
            <Image src="/more-materials.webp" alt="" width={40} height={40} unoptimized />
            {loading ? '—' : fmt(s.moreValue)}
          </span>
        </div>
        <span className={`${styles.operator} ${s.anyClear ? '' : styles.termHidden}`}>+</span>
        <div className={`${styles.term} ${s.anyClear ? '' : styles.termHidden}`}>
          <span className={styles.termLabel}>기본 재료 가치</span>
          <span className={`${styles.gold} ${styles.termValue}`}>
            <Image src="/more-materials.webp" alt="" width={40} height={40} unoptimized />
            {loading ? '—' : fmt(s.clearValue)}
          </span>
        </div>
      </div>
    );
  };

  const renderCharacter = ({ row, raids, summary }: CharacterPlan) => {
    const owner: RaidOwner = { key: `char:${row.name}`, level: row.itemLevel, onSwap: (raid) => swapCharRaid(row, raid) };
    return (
      <section key={row.name} className={styles.charBlock}>
        <header className={styles.charHead}>
          <span className={styles.charBadge}>{row.name}</span>
          <span className={styles.charLevelBadge}>Lv.{row.itemLevel.toLocaleString('ko-KR')}</span>
          {!row.counted && <span className={styles.charOutBadge}>골드 미인정 (원정대 6캐릭 초과)</span>}
        </header>
        <div className={styles.cardBody}>
          {row.counted && renderEquation(summary)}
          {raids.length > 0
            ? renderRaidList(raids, owner)
            : <p className={styles.charNone}>입장 가능한 레이드 없음</p>}
        </div>
      </section>
    );
  };

  return (
    <Container fluid style={{ maxWidth: '1240px' }}>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>레이드 클골 정리</h1>
          <p className={styles.pageSubtitle}>캐릭터를 검색하면 원정대 전체, 레벨을 고르면 그 레벨의 클리어 골드를 정리합니다</p>
        </div>

        {/* 원정대 검색 — 레벨 높은 6캐릭이 자동 선택된다 */}
        <CharacterSearch
          onSelectionChange={setSelectedCharacters}
          onSearch={() => setSearched(true)}
          searched={searched}
          buttonColor="var(--color-primary)"
        />

        {searched && characterPlans.length > 0 && (
          <section className={`${styles.sectionCard} ${styles.expeditionCard}`}>
            <div className={styles.sectionHeadRow}>
              <h2 className={styles.sectionHead}>원정대 전체 주간 클리어 골드</h2>
              <div className={styles.headToggles}>
                <Toggle on={freeFirst} label="유통 골드 우선" onToggle={toggleFreeFirst} />
                <Toggle on={allCharMoreOn} label="전체 더보기" onToggle={toggleAllCharMore} />
              </div>
            </div>
            <div className={styles.cardBody}>
              {renderEquation(expeditionSummary)}
              <div className={styles.charList}>{characterPlans.map(renderCharacter)}</div>
            </div>
          </section>
        )}

        {/* 레벨 선택 + 레이드 목록 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionHead}>레벨별 레이드 선택</h2>
          <div className={styles.cardBody}>
            <div className={styles.levelRail}>
              {LEVEL_BREAKPOINTS.map((l) => {
                const next = LEVEL_BREAKPOINTS.find((b) => b > l) ?? Infinity;
                const active = level !== null && level >= l && level < next;
                return (
                  <button
                    key={l}
                    type="button"
                    className={`${styles.levelChip} ${active ? styles.levelChipActive : ''}`}
                    onClick={() => toggleLevelChip(l, active)}
                    aria-pressed={active}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            <div className={styles.controlRow}>
              <label className={styles.levelInputWrap}>
                <span>아이템 레벨</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className={styles.levelInput}
                  placeholder="레벨 입력"
                  value={levelInput}
                  onChange={(e) => handleLevelInput(e.target.value)}
                />
              </label>
              <div className={styles.segment}>
                {BASIS_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className={`${styles.segmentBtn} ${basis === o.key ? styles.segmentBtnOn : ''}`}
                    onClick={() => changeBasis(o.key)}
                    aria-pressed={basis === o.key}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${styles.tileGrid} ${showAllRaids ? '' : styles.tileGridCollapsed}`}>
              {orderedRaids.map(renderRaidTile)}
            </div>
            <div className={styles.tileFooter}>
              <p className={styles.tileHint}>
                {pickedRaids.length} / {GOLD_RAID_LIMIT} 선택 · {pickFull ? '다른 레이드를 고르려면 선택한 레이드를 다시 눌러 해제하세요' : '선택한 레이드를 다시 누르면 해제됩니다'}
              </p>
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setShowAllRaids((prev) => !prev)}
                aria-expanded={showAllRaids}
              >
                {showAllRaids ? '접기' : '전체 레이드 보기'}
              </button>
            </div>
          </div>
        </section>

        {/* 선택한 레이드 + 합계 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionHead}>선택한 레이드 합계</h2>
          <div className={styles.cardBody}>
            {/* 결과 — 총 골드 = 유통 + 귀속, 카드에서 더보기를 켜면 비용이 귀속부터 빠지고 재료 가치가 붙는다 */}
            {renderEquation(levelSummary)}

            {pickedRaids.length > 0
              ? renderRaidList(pickedRaids, levelOwner)
              : <p className={styles.emptyNote}>위 목록에서 레이드를 눌러 선택하세요</p>}
          </div>
        </section>

        <p className={styles.priceNote}>
          {priceDate && `${priceDate} 평균 거래가 | `}코어는 환산 기준이 없어 재료 가치에서 뺍니다
        </p>
      </div>
    </Container>
  );
}
