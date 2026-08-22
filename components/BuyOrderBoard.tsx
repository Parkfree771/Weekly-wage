'use client';

// 매수가 보드 — 왼쪽 카드에 시세 목록, 오른쪽 카드에 내가 담은 종목의 수익률.
//
// 비용 설계:
//  · users/{uid}.buyOrders 에 저장. AuthContext 가 로그인 시 프로필을 1회 읽으므로 read 추가 0,
//    쓰기는 저장 버튼을 누를 때만 1회. 브라우저↔Firebase 직결이라 Netlify 함수 호출 0회 추가.
//  · 현재가는 fetchPriceData() 재사용 — 10분 슬롯 캐시 + CDN durable(price-latest 태그).
//
// 단위 규칙: latest_prices.json 의 값은 "묶음 가격" 이다(파괴석·수호석 결정 100개, 파편 3000개).
// 화면에는 거래소에서 보이는 그대로 묶음 가격을 쓰고, 금액 계산만 개당(price / bundle)으로 환산한다.
// 환산을 빠뜨리면 손익이 100배·3000배로 튄다.
import { useEffect, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';
import { Offcanvas } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from './ThemeProvider';
import { PRICE_ITEMS, bundleOf } from '@/data/priceItems';
import PriceItemName from './PriceItemName';
import { fetchPriceData } from '@/lib/price-history-client';
import type { BuyOrder } from '@/types/user';
import styles from './BuyOrderBoard.module.css';


// 예시는 현재가에서 파생시킨다. 고정 숫자를 박아 두면 시세가 움직인 뒤
// 말이 안 되는 수익률(수백 %)이 찍혀서 오히려 기능을 오해하게 만든다.
const DEMO_SEEDS: Array<{ id: string; factor: number; qty: number }> = [
  { id: '66102007', factor: 0.945, qty: 2000 },  // 파결   — 크게 오름
  { id: '66102107', factor: 1.038, qty: 2000 },  // 수결   — 내림
  { id: '66110226', factor: 0.972, qty: 600 },   // 위운돌 — 살짝 오름(수수료 떼면 마이너스)
  { id: '6861013',  factor: 0.92,  qty: 400 },   // 상비도스
  { id: '66130143', factor: 1.015, qty: 9000 },  // 운파(3000개 단위)
  { id: '66111131', factor: 0.965, qty: 120 },   // 용숨
  { id: '65200505', factor: 1.06,  qty: 3 },     // 원한 각인서 — 크게 내림
  { id: 'auction_gem_fear_10', factor: 0.88, qty: 1 },  // 10겁화 — 고가 단일
];

// 거래소 판매 수수료 — 판매가의 5% 를 떼고 정산된다
const FEE = 0.05;

const itemById = new Map(PRICE_ITEMS.map(i => [i.id, i]));

// 골드 아이콘 — 숫자 옆에 붙이는 작은 표식
function Gold({ size = 13 }: { size?: number }) {
  return <NextImage src="/gold.webp" alt="" width={size} height={size} className={styles.goldIcon} unoptimized />;
}
// 금액(총액·손익·수수료) — 소수점 없이. 62,623.5 처럼 끝자리가 붙으면 표가 지저분해진다.
const gold = (n: number) => Math.round(n).toLocaleString();

// 단가(매수가·현재가) — 자릿수에 맞춰 소수 자리를 줄인다.
//   1,000 이상: 정수 / 100 이상: 소수 1자리 / 그 미만: 소수 2자리
const unit = (n: number) => {
  const a = Math.abs(n);
  const d = a >= 1000 ? 0 : a >= 100 ? 1 : 2;
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};
const totalQty = (o: BuyOrder) => Math.max(1, o.qty || 1);
const sameOrders = (a: Record<string, BuyOrder>, b: Record<string, BuyOrder>) =>
  JSON.stringify(a) === JSON.stringify(b);

export default function BuyOrderBoard() {
  const { user, userProfile, refreshUserProfile, signInWithGoogle, signInWithApple } = useAuth();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [latest, setLatest] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, BuyOrder>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // 입력칸은 "등록·수정하는 그 줄"에만 띄운다. 평소에는 값만 읽는 화면이어야 한다.
  const [editingId, setEditingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetSearchRef = useRef<HTMLInputElement>(null);

  // 모바일은 카드를 하나(내 종목)만 두고, 시세 목록은 바텀시트로 올린다.
  // CSS 브레이크포인트(.wrap 860px)와 같은 값을 써야 두 카드 레이아웃과 어긋나지 않는다.
  const [isMobile, setIsMobile] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // 소프트 키보드가 올라오면 visualViewport 가 줄어든다. 그 차이만큼 시트를 띄워
  // 검색창과 목록이 키보드에 가리지 않게 한다. (지원 안 하는 브라우저는 0 → 기존 동작)
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !sheetOpen) { setKbHeight(0); return; }
    const sync = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setKbHeight(gap > 80 ? Math.round(gap) : 0);   // 80px 미만은 주소창 변화로 보고 무시
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [sheetOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const saved = useMemo(() => userProfile?.buyOrders ?? {}, [userProfile]);

  // 현재가 + 전일 종가. fetchPriceData 는 차트가 이미 받아 둔 모듈 캐시를 그대로 돌려주므로
  // 이 컴포넌트 때문에 네트워크 요청이 더 생기지 않는다.
  const [prevClose, setPrevClose] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    fetchPriceData().then(({ history, latest: cur }) => {
      if (!alive) return;
      setLatest(cur);
      // 전일 종가 = 오늘(KST) 이전 날짜 중 가장 최근 기록
      const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
      const prev: Record<string, number> = {};
      for (const [id, arr] of Object.entries(history)) {
        for (let k = arr.length - 1; k >= 0; k--) {
          if (arr[k].date < today) { prev[id] = arr[k].price; break; }
        }
      }
      setPrevClose(prev);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // 로그인/프로필이 바뀌면 편집중인 값을 저장본으로 되돌린다
  useEffect(() => { setDraft(saved); }, [saved]);

  const dirty = !sameOrders(draft, saved);

  // 내가 담은 게 없으면 예시를 흐리게 깔아 빈 카드가 생기지 않게 한다
  const demo = useMemo(() => {
    const out: Record<string, BuyOrder> = {};
    for (const d of DEMO_SEEDS) {
      const cur = latest[d.id];
      if (typeof cur !== 'number' || cur <= 0) continue;
      out[d.id] = { price: Math.round(cur * d.factor * 100) / 100, qty: d.qty };
    }
    return out;
  }, [latest]);

  const isGhost = Object.keys(draft).length === 0;
  const shown = isGhost ? demo : draft;

  const rows = useMemo(() =>
    Object.entries(shown).map(([id, o]) => {
      const item = itemById.get(id);
      const qty = totalQty(o);
      const current = latest[id];
      const has = typeof current === 'number' && current > 0;
      // 금액은 전부 개당 가격 × 개수로 낸다 (화면에 보이는 매입가·현재가는 묶음 가격)
      const bundle = bundleOf(id);
      const buyEach = o.price / bundle;
      const curEach = has ? current / bundle : 0;
      const diff = has ? current - o.price : 0;              // 묶음 기준 등락(표시용)
      const netEach = has ? curEach * (1 - FEE) - buyEach : 0;
      return {
        id, item, order: o, qty, current, has, diff, bundle,
        pct: has && o.price > 0 ? (diff / o.price) * 100 : 0,
        gain: has ? (curEach - buyEach) * qty : 0,
        fee: has ? curEach * FEE * qty : 0,
        net: has ? netEach * qty : 0,
        cost: buyEach * qty,
        sale: has ? curEach * qty : 0,
      };
    }).filter(r => r.item),
  [shown, latest]);

  const summary = useMemo(() => {
    const v = rows.filter(r => r.has);
    const cost = v.reduce((s, r) => s + r.cost, 0);
    const gain = v.reduce((s, r) => s + r.gain, 0);
    const fee = v.reduce((s, r) => s + r.fee, 0);
    const sale = v.reduce((s, r) => s + r.sale, 0);
    const net = v.reduce((s, r) => s + r.net, 0);
    return { cost, gain, fee, sale, net, pct: cost > 0 ? (gain / cost) * 100 : 0, count: v.length };
  }, [rows]);

  const patch = (id: string, next: Partial<BuyOrder>) =>
    setDraft(d => ({ ...d, [id]: { ...(d[id] ?? { price: 0 }), ...next } }));

  const remove = (id: string) =>
    setDraft(d => { const n = { ...d }; delete n[id]; return n; });

  // 목록에서 담을 때 평단은 현재가로 채워 둔다 — 거래 평균가라 시작값일 뿐, 바로 고쳐 쓴다
  const add = (id: string) => {
    if (!user || draft[id]) return;
    const seed = latest[id];
    // 기본 수량은 1묶음 — 100개 단위 종목에서 1개로 시작하면 매번 고쳐야 한다
    setDraft(d => ({ ...d, [id]: { price: typeof seed === 'number' && seed > 0 ? seed : 0, qty: bundleOf(id) } }));
    setEditingId(id);
    listRef.current?.scrollTo({ top: 0 });
    if (isMobile) { setSheetOpen(false); setQuery(''); }   // 담으면 시트를 닫아 결과를 바로 보여준다
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      const clean: Record<string, BuyOrder> = {};
      for (const [id, o] of Object.entries(draft)) {
        if (!o || !(o.price > 0)) continue;   // 값이 없는 줄은 저장하지 않는다
        clean[id] = {
          price: o.price,
          ...(o.qty && o.qty > 1 ? { qty: o.qty } : {}),
          at: new Date().toISOString(),
        };
      }
      const { db } = await import('@/lib/firebase-firestore');
      const { doc, setDoc } = await import('firebase/firestore');
      // updateDoc 은 문서가 없으면 실패한다. 동의·닉네임 절차를 아직 안 끝낸 계정은
      // users/{uid} 가 없을 수 있어 merge 로 쓴다 (있으면 이 필드만 갱신).
      await setDoc(doc(db, 'users', user.uid), { buyOrders: clean }, { merge: true });
      await refreshUserProfile();
      setEditingId(null);
    } catch (e) {
      // 조용히 실패하면 사용자는 저장된 줄 안다. 보안 규칙 거부도 여기로 온다.
      setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 왼쪽 목록 — 검색은 정식명칭·축약명 양쪽, 띄어쓰기 무시
  const listed = useMemo(() => {
    const q = query.trim().replace(/\s+/g, '').toLowerCase();
    return PRICE_ITEMS.filter(i => !q ||
      i.name.replace(/\s+/g, '').toLowerCase().includes(q) ||
      i.shortName.replace(/\s+/g, '').toLowerCase().includes(q));
  }, [query]);

  const tone = (v: number) => (v > 0 ? styles.up : v < 0 ? styles.down : '');
  const sign = (v: number) => (v > 0 ? '+' : '');

  // 보유 줄의 값 — 관련 있는 둘을 한 열에 위아래로 묶는다.
  // 열을 9개로 펼치면 1,061,000 같은 값이 눌려서 잘린다. 4쌍으로 묶으면 열이 절반이라 여유가 생긴다.
  // 데스크톱 헤더·본문, 모바일 라벨이 모두 이 정의 하나를 쓴다(narrow = 모바일에도 노출).
  const holdGroups = (r: (typeof rows)[number]) => [
    {
      key: 'qty',
      rows: [
        { label: '수량', node: r.qty.toLocaleString(), tone: '', narrow: true, big: false },
      ],
    },
    {
      key: 'price',
      rows: [
        { label: '매입가', node: unit(r.order.price), tone: '', narrow: true, big: false },
        { label: '현재가', node: r.has ? unit(r.current!) : '—', tone: tone(r.diff), narrow: true, big: false },
      ],
    },
    {
      key: 'amount',
      rows: [
        { label: '매입금액', node: gold(r.cost), tone: '', narrow: false, big: false },
        { label: '평가금액', node: r.has ? gold(r.sale) : '—', tone: '', narrow: false, big: false },
      ],
    },
    {
      key: 'fee',
      rows: [
        { label: `수수료 ${FEE * 100}%`, node: r.has ? `−${gold(r.fee)}` : '—', tone: '', narrow: false, big: false },
        { label: '총 이득', node: r.has ? `${sign(r.net)}${gold(r.net)}` : '—', tone: tone(r.net), narrow: true, big: false },
      ],
    },
    {
      key: 'gain',
      rows: [
        { label: '평가손익', node: r.has ? `${sign(r.gain)}${gold(r.gain)}` : '—', tone: tone(r.diff), narrow: false, big: false },
        { label: '수익률', node: r.has ? `${sign(r.diff)}${r.pct.toFixed(1)}%` : '—', tone: tone(r.diff), narrow: false, big: true },
      ],
    },
  ];

  // 시세판 — 이름 없이 아이콘으로 화면을 채우고, 칸마다 현재가와 전일 대비 등락률.
  // (데스크톱 왼쪽 카드 전용. 모바일은 바텀시트가 대신한다)
  const priceList = () => (
    <div className={styles.tiles} ref={listRef}>
      {listed.map(i => {
        const price = latest[i.id];
        const prev = prevClose[i.id];
        const has = typeof price === 'number' && price > 0;
        const canDiff = has && typeof prev === 'number' && prev > 0;
        const chg = canDiff ? ((price - prev) / prev) * 100 : 0;
        const held = !!draft[i.id];
        return (
          <button
            key={i.id}
            type="button"
            className={`${styles.tile} ${held ? styles.tileHeld : ''}`}
            onClick={() => add(i.id)}
            disabled={!user || held}
            title={`${i.name}${canDiff ? ` · 전일 ${unit(prev)}` : ''}`}
          >
            <NextImage src={i.icon} alt={i.name} width={28} height={28} className={styles.tileIcon} unoptimized />
            {/* 각인서·악세·팔찌는 아이콘이 같아 그림만으로 구분이 안 된다 */}
            <span className={styles.tileName}><PriceItemName item={i} /></span>
            <span className={styles.tilePrice}>{has ? unit(price) : '—'}</span>
            <span className={`${styles.tileChg} ${tone(chg)}`}>
              {canDiff ? `${sign(chg)}${chg.toFixed(1)}%` : '—'}
            </span>
            {held && <span className={styles.tileHeldMark}>✓</span>}
          </button>
        );
      })}
      {listed.length === 0 && <div className={styles.none}>결과 없음</div>}
    </div>
  );

  return (
    <section className={styles.wrap}>
      {/* ── 왼쪽: 시세 목록 (데스크톱 전용 — 모바일은 아래 바텀시트) ── */}
      {!isMobile && (
        <div className={`${styles.card} shadow-hard`}>
          <div className={styles.head}>
            <h2 className={styles.title}>시세</h2>
            <input
              type="text"
              className={styles.search}
              value={query}
              placeholder="검색"
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {priceList()}
        </div>
      )}

      {/* ── 오른쪽: 내 종목 수익률 ── */}
      <div className={`${styles.card} shadow-hard`}>
        <div className={styles.head}>
          <h2 className={styles.title}>내 종목</h2>
          {user && dirty && (
            <button type="button" className={styles.saveBtn} onClick={save} disabled={saving}>
              {saving ? '…' : '저장'}
            </button>
          )}
        </div>

        {/* 요약 — 큰 줄에 결론(수익률·실수령), 아래 작은 줄에 근거(평가 − 수수료).
            수수료는 "판매 대금 전체"의 5% 라 평가손익보다 클 수 있어 각 항에 이름을 붙인다. */}
        {summary.count > 0 && (
          <div className={styles.sum}>
            {/* 열 하나에 위아래로 한 쌍 — 매수↔평가금액, 수수료↔총이득, 평가손익↔수익률 */}
            <div className={styles.cell}>
              <span className={styles.cellLabel}>매수금액</span>
              <span className={styles.cellVal}>{gold(summary.cost)}</span>
            </div>
            <div className={styles.cell}>
              <span className={styles.cellLabel}>평가금액</span>
              <span className={styles.cellVal}>{gold(summary.sale)}</span>
            </div>

            <div className={styles.cell}>
              <span className={styles.cellLabel}>수수료 {FEE * 100}%</span>
              <span className={styles.cellVal}>−{gold(summary.fee)}</span>
            </div>
            <div className={styles.cell}>
              <span className={styles.cellLabel}>총 이득</span>
              <span className={`${styles.cellStrong} ${tone(summary.net)}`}>
                <Gold size={14} />{sign(summary.net)}{gold(summary.net)}
              </span>
            </div>

            <div className={styles.cell}>
              <span className={styles.cellLabel}>평가손익</span>
              <span className={`${styles.cellVal} ${tone(summary.gain)}`}>
                {sign(summary.gain)}{gold(summary.gain)}
              </span>
            </div>
            <div className={styles.cell}>
              <span className={styles.cellLabel}>수익률</span>
              <span className={`${styles.cellStrong} ${tone(summary.gain)}`}>
                {sign(summary.gain)}{summary.pct.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* 로그인 유도 — 데스크톱·모바일 모두 이 카드 하나만 있으므로 여기 두면 레이아웃이 갈라지지 않는다 */}
        {!user && (
          <div className={styles.loginCta}>
            <span className={styles.loginCtaText}>로그인하면 내 매수가로 바뀝니다</span>
            <span className={styles.loginCtaBtns}>
              <button type="button" className={styles.loginBtn} onClick={signInWithGoogle}>
                <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google
              </button>
              <button type="button" className={`${styles.loginBtn} ${styles.loginBtnApple}`} onClick={signInWithApple}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M16.365 1.43c0 1.14-.462 2.033-1.11 2.72-.7.744-1.85 1.32-2.79 1.24-.13-1.09.45-2.24 1.09-2.95.71-.8 1.96-1.4 2.81-1.01Zm4.14 16.53c-.55 1.26-.81 1.83-1.52 2.94-.99 1.55-2.39 3.48-4.12 3.5-1.53.02-1.93-.99-4.01-.98-2.08.01-2.52.99-4.05.97-1.73-.02-3.06-1.75-4.05-3.3C-.4 16.86-.66 12 1.05 9.4c1.16-1.78 2.99-2.82 4.71-2.82 1.75 0 2.85 1 4.3 1 1.4 0 2.26-1 4.3-1 1.53 0 3.15.83 4.3 2.27-3.78 2.07-3.17 7.46 1.6 8.68-.24.65-.5 1.3-.71 1.4Z"/>
                </svg>
                Apple
              </button>
            </span>
          </div>
        )}

        {saveError && <div className={styles.saveError}>저장 실패 · {saveError}</div>}

        <div className={styles.listWrap}>
          <div className={styles.list}>
            {/* 데스크톱 — 라벨을 맨 위 헤더 한 줄로 빼고, 종목은 한 줄씩. 줄마다 라벨을 반복하면
                같은 글자가 종목 수만큼 찍혀 공백만 늘어난다. */}
            {!isMobile && rows.length > 0 && (
              <div className={styles.headRow}>
                <span />
                {holdGroups(rows[0]).map(g => (
                  <span key={g.key} className={styles.headCell}>
                    {g.rows.map(x => <em key={x.label} className={styles.headLabel}>{x.label}</em>)}
                  </span>
                ))}
                <span />
              </div>
            )}

            {rows.map(r => {
              const edit = editingId === r.id;
              const gainNode = r.has && (
                <span className={`${styles.gainLine} ${tone(r.diff)}`}>
                  {sign(r.gain)}{gold(r.gain)}
                  <em className={styles.gainPct}>{sign(r.diff)}{r.pct.toFixed(1)}%</em>
                </span>
              );
              const actionNode = user && !isGhost && (
                edit
                  ? <button type="button" className={styles.removeBtn} onClick={() => remove(r.id)} aria-label="빼기">×</button>
                  : <button type="button" className={styles.editBtn} onClick={() => setEditingId(r.id)} aria-label="수정">✎</button>
              );
              const nameNode = (
                <span className={styles.nameCell}>
                  <NextImage src={r.item!.icon} alt="" width={22} height={22} className={styles.icon} unoptimized />
                  <span className={styles.name}><PriceItemName item={r.item!} /></span>
                </span>
              );

              // ── 데스크톱: 한 줄 ──
              if (!isMobile) {
                return (
                  <div key={r.id} className={styles.holdRow}>
                    {nameNode}
                    {edit ? (
                      <div className={styles.editSpan}>
                      <div className={styles.inputs}>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>
                            매입가{r.bundle > 1 && <em className={styles.fieldHint}>{r.bundle}개</em>}
                          </span>
                          <input
                            type="number" className={styles.input} min={0} step="any" autoFocus
                            value={r.order.price || ''}
                            onChange={e => patch(r.id, { price: parseFloat(e.target.value) || 0 })}
                          />
                        </label>
                        <span className={styles.op}>×</span>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>수량</span>
                          <input
                            type="number" className={styles.input} min={1} step={1}
                            value={r.order.qty ?? 1}
                            onChange={e => patch(r.id, { qty: parseInt(e.target.value, 10) || 1 })}
                          />
                        </label>
                        <span className={styles.op}>=</span>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>매입금액</span>
                          {/* 금액을 치면 수량을 역산한다 — 총 얼마 썼는지만 기억날 때가 더 많다 */}
                          <input
                            type="number" className={styles.input} min={0} step="any"
                            value={Math.round(r.cost) || ''}
                            onChange={e => {
                              const amount = parseFloat(e.target.value) || 0;
                              const each = r.order.price / r.bundle;
                              if (each > 0) patch(r.id, { qty: Math.max(1, Math.round(amount / each)) });
                            }}
                          />
                        </label>
                        <button type="button" className={styles.doneBtn} onClick={() => setEditingId(null)}>완료</button>
                      </div>
                      </div>
                    ) : (
                      <>
                        {holdGroups(r).map(g => (
                          <span key={g.key} className={styles.groupCell}>
                            {g.rows.map(x => (
                              <b key={x.label} className={`${styles.miniVal} ${x.big ? styles.miniValBig : ''} ${x.tone}`}>
                                {x.node}
                              </b>
                            ))}
                          </span>
                        ))}
                      </>
                    )}
                    {actionNode}
                  </div>
                );
              }

              // ── 모바일: 종목명·손익 줄 + 라벨 붙은 칸 줄 (2줄) ──
              return (
                <div key={r.id} className={styles.holdRowM}>
                  <div className={styles.rowTop}>
                    {nameNode}
                    {!edit && gainNode}
                    {actionNode}
                  </div>
                  {edit ? (
                    <div className={styles.inputs}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>
                          매입가{r.bundle > 1 && <em className={styles.fieldHint}>{r.bundle}개</em>}
                        </span>
                        <input
                          type="number" className={styles.input} min={0} step="any" autoFocus
                          value={r.order.price || ''}
                          onChange={e => patch(r.id, { price: parseFloat(e.target.value) || 0 })}
                        />
                      </label>
                      <span className={styles.op}>×</span>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>수량</span>
                        <input
                          type="number" className={styles.input} min={1} step={1}
                          value={r.order.qty ?? 1}
                          onChange={e => patch(r.id, { qty: parseInt(e.target.value, 10) || 1 })}
                        />
                      </label>
                      <span className={styles.op}>=</span>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>매입금액</span>
                        {/* 금액을 치면 수량을 역산한다 — 총 얼마 썼는지만 기억날 때가 더 많다 */}
                        <input
                          type="number" className={styles.input} min={0} step="any"
                          value={Math.round(r.cost) || ''}
                          onChange={e => {
                            const amount = parseFloat(e.target.value) || 0;
                            const each = r.order.price / r.bundle;
                            if (each > 0) patch(r.id, { qty: Math.max(1, Math.round(amount / each)) });
                          }}
                        />
                      </label>
                      <button type="button" className={styles.doneBtn} onClick={() => setEditingId(null)}>완료</button>
                    </div>
                  ) : (
                    <div className={styles.cells}>
                      {holdGroups(r).flatMap(g => g.rows).filter(x => x.narrow).map(x => (
                        <span key={x.label} className={styles.miniCell}>
                          <em className={styles.miniLabel}>{x.label}</em>
                          <b className={`${styles.miniVal} ${x.tone}`}>{x.node}</b>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* 모바일 — 시세 목록은 카드로 두지 않고 바텀시트로 올린다 */}
        {isMobile && user && (
          <button
            type="button"
            className={styles.sheetBtn}
            onClick={() => { setSheetOpen(true); setTimeout(() => sheetSearchRef.current?.focus(), 250); }}
          >
            + 종목 추가
          </button>
        )}
      </div>

      {/* 바텀시트 — 시세 차트 카테고리 시트(ItemSelector)와 같은 형식.
          헤더에 검색창만 얹었고, 본문은 그 시트와 동일한 2행 가로 스크롤 그리드다. */}
      <Offcanvas
        show={isMobile && sheetOpen}
        onHide={() => setSheetOpen(false)}
        placement="bottom"
        backdrop={false}
        scroll={true}
        style={{
          height: 'auto',
          maxHeight: '58vh',
          // 하단 앵커 광고가 떠 있으면 그만큼 위로 올림 (AdLayout 이 이 변수를 설정)
          bottom: `calc(var(--mobile-anchor-h, 0px) + ${kbHeight}px)`,
          backgroundColor: 'var(--card-bg)',
          color: 'var(--text-primary)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
        }}
      >
        <Offcanvas.Header
          closeButton={false}
          style={{
            backgroundColor: dark ? '#1a1f3d' : '#eef1fb',
            borderBottom: '2px solid var(--color-primary)',
            padding: '8px 12px',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            minHeight: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <input
            ref={sheetSearchRef}
            type="text"
            className={styles.sheetSearch}
            value={query}
            placeholder="종목 검색"
            onChange={e => setQuery(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            aria-label="닫기"
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: '1.1rem', cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </Offcanvas.Header>

        <Offcanvas.Body style={{ padding: '10px 12px 12px' }}>
          <div className={styles.tiles}>
            {listed.map(i => {
              const price = latest[i.id];
              const prev = prevClose[i.id];
              const has = typeof price === 'number' && price > 0;
              const canDiff = has && typeof prev === 'number' && prev > 0;
              const chg = canDiff ? ((price - prev) / prev) * 100 : 0;
              const held = !!draft[i.id];
              return (
                <button
                  key={i.id}
                  type="button"
                  className={`${styles.tile} ${held ? styles.tileHeld : ''}`}
                  onClick={() => add(i.id)}
                  disabled={held}
                >
                  <NextImage src={i.icon} alt={i.name} width={28} height={28} className={styles.tileIcon} unoptimized />
                  <span className={styles.tileName}><PriceItemName item={i} /></span>
                  <span className={styles.tilePrice}>{has ? unit(price) : '—'}</span>
                  <span className={`${styles.tileChg} ${tone(chg)}`}>
                    {canDiff ? `${sign(chg)}${chg.toFixed(1)}%` : '—'}
                  </span>
                  {held && <span className={styles.tileHeldMark}>✓</span>}
                </button>
              );
            })}
            {listed.length === 0 && <div className={styles.none}>결과 없음</div>}
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </section>
  );
}
