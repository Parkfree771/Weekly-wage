'use client';

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import { formatNumber } from '@/lib/package-shared';
import {
  AZENA_TITLE,
  AZENA_PRICE_WON,
  AZENA_ROYAL_CRYSTAL,
  AZENA_DAYS,
  AZENA_WEEKS,
  AZENA_INTRO,
  AZENA_FAQ,
  AZENA_MAX_WEEKLY_RAID_CLEARS,
  AZENA_DEFAULT_OPTIONS,
  AZENA_DEFAULT_WON_PER_100_GOLD,
  AZENA_RAID_BOX_TABLE,
  AZENA_RAID_BOX_GOLD,
  AZENA_BUFF_STEAK_GOLD,
  AZENA_BUFF_STEAK_PER_WEEK,
  FRAGMENT_DROP_RATE,
  FRAGMENT_GOLD_TABLE,
  FRAGMENT_ENGRAVING_RANDOM_P,
  FRAGMENT_ENGRAVING_SELECT_P,
  FRAGMENT_LEGENDARY_PACK_P,
  FRAGMENT_SELECT_PACK_P,
  LEGENDARY_PACK_GOLD,
  LEGENDARY_SELECT_PACK_GOLD,
  calcAzenaBreakdown,
  getAzenaDailyBoxOptions,
  getAzenaDailyBoxOptionGold,
  getAzenaRefineBoxContents,
  type AzenaOptions,
} from '@/lib/azena-blessing';
import styles from '@/app/package/package.module.css';
import az from './AzenaBlessingDetail.module.css';

/** 골드 값 — 상세 계산 결과 카드와 같은 형식 */
function GoldValue({ v }: { v: number }) {
  return (
    <span className={styles.resultRowValueGold}>
      ={' '}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIconInline} />
      {formatNumber(v)}
    </span>
  );
}

function BenefitBadge({ v }: { v: number }) {
  return (
    <span className={`${styles.resultBenefitBadge} ${v >= 0 ? styles.resultBenefitUp : styles.resultBenefitDown}`}>
      {v >= 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

/** 포털이 붙는 body 까지의 누적 zoom.
    사이트 보기 배율(html zoom)·body zoom(0.85)이 걸려 있으면 fixed 요소의 left/top 도
    그 배율로 다시 스케일되므로, 시각 좌표(rect)를 이 값으로 나눠야 자리가 맞는다. */
function getBodyZoom(): number {
  let zoom = 1;
  let node: Element | null = document.body;
  while (node) {
    const z = parseFloat(getComputedStyle(node).zoom || '1');
    if (!isNaN(z) && z > 0) zoom *= z;
    node = node.parentElement;
  }
  return zoom;
}

type PopPos = { left: number; top?: number; bottom?: number; width: number };

/**
 * 아이템 카드 안에 다 못 넣는 정보(확률표·상자 내용물·선택지)를 담는 드롭다운 팝업.
 * 카드가 overflow:hidden 이라 body 포털로 띄우고, 좌표는 누적 zoom 으로 보정한다.
 */
function InfoPopover({
  label,
  title,
  active,
  children,
}: {
  label: string;
  title: string;
  active?: boolean;
  /** 선택형 팝업은 함수로 받아, 고르면 바로 닫을 수 있게 close 를 넘겨준다 */
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const openPop = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const zoom = getBodyZoom();
    // 화면 폭(시각 px)을 배율로 되돌린 값이 팝업이 쓸 수 있는 CSS px 폭이다
    const viewW = document.documentElement.clientWidth;
    const width = Math.min(300, Math.max(200, (viewW - 16) / zoom));
    // 오른쪽으로 넘치면 화면 안으로 당긴다 (시각 좌표 기준으로 계산 후 배율 환산)
    const maxLeft = (viewW - 8) / zoom - width;
    const left = Math.max(8 / zoom, Math.min(r.left / zoom, maxLeft));
    const spaceBelow = window.innerHeight - r.bottom;
    // 아래 공간이 부족하면 위로 펼친다 (팝업 최대 높이 320px + 여유 — 시각 크기는 배율만큼 스케일)
    if (spaceBelow < 340 * zoom && r.top > spaceBelow) {
      setPos({ left, bottom: (window.innerHeight - r.top) / zoom + 6, width });
    } else {
      setPos({ left, top: r.bottom / zoom + 6, width });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // 바깥 클릭으로 닫는다 — 다른 카드의 버튼을 눌렀을 때 그 클릭이 그대로 먹히도록
    // 가림막(backdrop) 대신 document 리스너를 쓴다
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    // 스크롤로 닫는 건 페이지가 움직여 팝업이 버튼에서 떨어질 때가 목적이다.
    // 팝업 안(확률표는 길어서 스크롤된다)에서 굴린 스크롤까지 잡으면 손대는 순간 닫혀버린다
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && popRef.current && (t === popRef.current || popRef.current.contains(t))) return;
      setOpen(false);
    };
    // 모바일은 스크롤 중 주소창이 접히며 resize 가 뜬다(높이만 바뀜) — 그때는 닫지 않는다
    const startW = window.innerWidth;
    const onResize = () => { if (window.innerWidth !== startW) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <div className={`${styles.itemCardChoices} ${az.popWrap}`}>
      <button
        type="button"
        ref={btnRef}
        className={`${az.popBtn} ${active ? az.popBtnActive : ''} ${open ? az.popBtnOpen : ''}`}
        onClick={() => (open ? setOpen(false) : openPop())}
        aria-expanded={open}
      >
        <span className={az.popBtnLabel}>{label}</span>
        <span className={az.popCaret}>▾</span>
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          className={az.pop}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width }}
          role="dialog"
          aria-label={title}
        >
          <div className={az.popTitle}>{title}</div>
          <div className={az.popBody}>
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** 수량 입력 (− 입력 +) — 공명·휴게·PC방 공용 */
function CountControl({
  value,
  onChange,
  max = 999,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(max, v));
  return (
    <span className={az.stepper}>
      <button type="button" className={az.countBtn} onClick={() => onChange(clamp(value - 1))} aria-label="1 줄이기">
        −
      </button>
      <input
        type="number"
        className={az.countInput}
        value={value}
        min={0}
        max={max}
        onChange={(e) => onChange(clamp(parseInt(e.target.value) || 0))}
      />
      <button type="button" className={az.countBtn} onClick={() => onChange(clamp(value + 1))} aria-label="1 늘리기">
        +
      </button>
    </span>
  );
}

export default function AzenaBlessingDetail() {
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(AZENA_DEFAULT_WON_PER_100_GOLD);
  const [options, setOptions] = useState<AzenaOptions>(AZENA_DEFAULT_OPTIONS);

  useEffect(() => {
    fetch('/api/price-data/latest')
      .then((res) => res.json())
      .then((data) => setLatestPrices(data))
      .catch((err) => console.error('가격 데이터 로딩 실패:', err));
  }, []);

  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;

  const breakdown = useMemo(
    () => calcAzenaBreakdown(latestPrices, goldPerWon, options),
    [latestPrices, goldPerWon, options],
  );

  const cashGold = AZENA_PRICE_WON * goldPerWon;
  const benefit = cashGold > 0 ? ((breakdown.totalGold - cashGold) / cashGold) * 100 : 0;

  const setOption = <K extends keyof AzenaOptions>(key: K, value: AzenaOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  // 일일 선택 상자 구성은 티어에 따라 다르다 (1730↑ 상비도스×10 / 1730↓ 아비도스×20)
  const dailyOptions = getAzenaDailyBoxOptions(options.tier);
  const selectedDaily = dailyOptions.find((o) => o.key === breakdown.daily.boxChoice);

  const fr = breakdown.fragments;
  const rb = breakdown.raidBoxes;

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <div className={styles.detailWrapper}>
        <Link href="/package" className={styles.backLink}>
          &#8592; 목록으로 돌아가기
        </Link>

        {/* 헤더 — 제목 + 메타 */}
        <div className={styles.detailHeader}>
          <h1 className={styles.detailTitle}>{AZENA_TITLE}</h1>
          {/* 판매 기간은 두지 않는다 — 상시 판매라 기간 표기가 오히려 낡은 정보가 된다 */}
          <div className={styles.detailMetaRow}>
            <span>{formatNumber(AZENA_ROYAL_CRYSTAL)} 로열 크리스탈 = {formatNumber(AZENA_PRICE_WON)}원</span>
            <span>캐릭터당 적용</span>
          </div>
          <p className={az.intro}>{AZENA_INTRO}</p>
        </div>

        <div className={styles.detailSplitRow}>
          {/* 왼쪽: 계산 결과 */}
          <div className={styles.resultPanel}>
            <div className={styles.detailCard}>
              <h2 className={styles.detailCardHeader}>계산 결과</h2>
              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>패키지 가격</span>
                <span className={styles.resultRowValue}>{formatNumber(AZENA_PRICE_WON)}원</span>
              </div>

              {goldPerWon > 0 && (
                <div className={styles.resultRow}>
                  <span className={styles.resultCashNum}>{formatNumber(AZENA_PRICE_WON)}원</span>
                  <GoldValue v={cashGold} />
                </div>
              )}

              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>{AZENA_DAYS}일 기대값</span>
                <GoldValue v={breakdown.totalGold} />
              </div>

              {goldPerWon > 0 && (
                <div className={styles.resultRow}>
                  <span className={styles.resultRowLabel}>기대 효율</span>
                  <BenefitBadge v={benefit} />
                </div>
              )}

              {/* 환율 — 일반 상세와 동일한 상자 */}
              <div className={styles.resultRateBox}>
                <span className={styles.resultRateBoxLabel}>환율</span>
                <div className={styles.resultRateInput}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.resultRateIcon} />
                  <span className={styles.resultRateFixed}>100</span>
                  <span className={styles.resultRateSep}>:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/royal.webp" alt="로얄 크리스탈" className={styles.resultRateIcon} />
                  <input
                    type="number"
                    className={styles.resultRateNumber}
                    value={wonPer100Gold || ''}
                    onChange={(e) => setWonPer100Gold(parseInt(e.target.value) || 0)}
                    placeholder="15"
                    min={1}
                    aria-label="100골드당 원화 환율"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 내 플레이 설정 + 아이템 구성 (한 카드) */}
          <section className={`${styles.itemCardsSection} ${styles.detailCard}`}>
            <h2 className={styles.detailCardHeader}>
              내 플레이 설정
              <span className={styles.detailCardHeaderNote}>설정에 따라 아래 아이템 가치가 바뀝니다</span>
            </h2>

            {/* 설정 — 1행: 아이템 레벨 토글 / 2행: 균열 추가 입장 3종
                (제목 없이 토글·아이콘만으로 읽히는 항목이라 행 라벨은 두지 않는다) */}
            <div className={az.setBar}>
              <div className={az.setRow}>
                <span className={az.seg}>
                  <button
                    type="button"
                    className={`${az.segBtn} ${options.tier === 'high' ? az.segBtnActive : ''}`}
                    onClick={() => setOption('tier', 'high')}
                  >
                    1730 이상 <span className={az.segArrow}>↑</span>
                  </button>
                  <button
                    type="button"
                    className={`${az.segBtn} ${options.tier === 'low' ? az.segBtnActive : ''}`}
                    onClick={() => setOption('tier', 'low')}
                  >
                    1730 이하 <span className={az.segArrow}>↓</span>
                  </button>
                </span>
              </div>

              <div className={az.setRow}>
                <span className={az.setField} title="공명의 기운 1개당 균열 +1판">
                  <span className={az.setLabel}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src="/resonance-energy.webp" alt="" className={az.setIcon} />
                    공명
                  </span>
                  <CountControl value={options.resonanceCount} onChange={(v) => setOption('resonanceCount', v)} />
                </span>

                <span className={az.setField} title="휴게 물약 1개당 균열 +1판">
                  <span className={az.setLabel}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src="/rest-potion.webp" alt="" className={az.setIcon} />
                    휴게
                  </span>
                  <CountControl value={options.restPotionCount} onChange={(v) => setOption('restPotionCount', v)} />
                </span>

                <span className={az.setField} title="PC방 방문일마다 균열 +2판">
                  <span className={`${az.setLabel} ${az.setLabelPc}`}>
                    <span className={az.setEmoji} aria-hidden="true">🖥️</span>
                    PC방
                  </span>
                  <CountControl
                    value={options.pcRoomVisits}
                    onChange={(v) => setOption('pcRoomVisits', v)}
                    max={AZENA_DAYS}
                  />
                </span>
              </div>
            </div>
            <p className={az.setNote}>
              {AZENA_DAYS}일 총 사용량 기준 · 공명·휴게 1개 = 균열 +1판, PC방 1일 = +2판 → 편린 기회 증가
            </p>

            <h3 className={az.itemsHead}>
              아이템 구성
              <span className={az.itemsHeadNote}>6종 · {AZENA_DAYS}일 기대값</span>
            </h3>

            <div className={`${styles.itemCardsGrid} ${az.itemsGrid}`}>
              {/* 1. 일일 선택 상자 — 내용물 선택을 팝업에서 한다 */}
              <div className={`${styles.itemCard} ${styles.itemCardChoice}`}>
                <div className={styles.itemCardIconWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/azena-box-art.webp" alt="아제나의 축복이 깃든 선택 상자" className={`${styles.itemCardIcon} ${az.boxIcon}`} />
                </div>
                <div className={styles.itemCardName}>축복이 깃든 선택 상자 ×{AZENA_DAYS}</div>
                <InfoPopover
                  active
                  label={`${selectedDaily?.shortName ?? '선택'} ×${selectedDaily?.quantity ?? 0}${options.dailyChoice === 'auto' ? ' (자동)' : ''}`}
                  title={`선택 상자 내용물 (1개당 ${formatNumber(breakdown.daily.boxUnitGold)}G)`}
                >
                  {(close) => (
                    <>
                      <button
                        type="button"
                        className={`${az.optRow} ${options.dailyChoice === 'auto' ? az.optRowActive : ''}`}
                        onClick={() => { setOption('dailyChoice', 'auto'); close(); }}
                      >
                        <span>자동 — 시세 최고가</span>
                        <span className={az.popGold}>현재 {selectedDaily?.shortName}</span>
                      </button>
                      {dailyOptions.map((opt) => {
                        const unit = getAzenaDailyBoxOptionGold(opt.key, latestPrices, options.tier);
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            className={`${az.optRow} ${options.dailyChoice === opt.key ? az.optRowActive : ''}`}
                            onClick={() => { setOption('dailyChoice', opt.key); close(); }}
                            title={`${opt.name} ×${opt.quantity} — 상자 1개 ${formatNumber(unit)}G`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img loading="lazy" decoding="async" src={opt.icon} alt="" className={az.optIcon} />
                            <span>{opt.name} ×{opt.quantity}</span>
                            <span className={az.popGold}>{formatNumber(unit * AZENA_DAYS)}G</span>
                          </button>
                        );
                      })}
                      <div className={az.popNote}>카드 팩 선택지는 계산에서 제외 (융화·재련 보조가 항상 이득)</div>
                    </>
                  )}
                </InfoPopover>
                <div className={styles.itemCardBottom}>
                  <div className={styles.itemCardPriceLine}>
                    {formatNumber(breakdown.daily.boxUnitGold)}G x {AZENA_DAYS}개
                  </div>
                  <div className={styles.itemCardSubtotal}>{formatNumber(breakdown.daily.boxGold)}G</div>
                </div>
              </div>

              {/* 2. 레이드 보너스 상자 — 소/중/대 내용물은 팝업 */}
              <div className={styles.itemCard}>
                <div className={styles.itemCardIconWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/azena-box-art.webp" alt="아제나의 축복이 깃든 상자" className={`${styles.itemCardIcon} ${az.boxIcon}`} />
                </div>
                <div className={styles.itemCardName}>축복이 깃든 상자 ×{rb.count} (랜덤)</div>
                <InfoPopover
                  label="상자 내용물 · 확률"
                  title={`축복이 깃든 상자 — 1개 기댓값 ${formatNumber(rb.perBoxEV)}G`}
                >
                  <div className={az.popNote}>
                    레이드 1관문 클리어 — 주 {AZENA_MAX_WEEKLY_RAID_CLEARS}회 × {AZENA_WEEKS}주 = {rb.count}개
                    {' '}· 내용물은 {options.tier === 'high' ? '1730 이상(계승 재료)' : '1730 이하(일반 재료)'} 기준
                  </div>
                  {/* 소/중/대 — 티어(1730↑/↓)에 따라 결정/일반 재료 이미지가 바뀐다 */}
                  {AZENA_RAID_BOX_TABLE.map((row) => (
                    <div key={row.key} className={az.boxBlock} title={row.label}>
                      <div className={az.boxBlockHead}>
                        <span>재련 재료 상자 ({row.key === 'small' ? '소' : row.key === 'medium' ? '중' : '대'})</span>
                        <span className={az.popPct}>{row.p}%</span>
                        <span className={az.popGold}>{formatNumber(rb.boxValues[row.key])}G</span>
                      </div>
                      <div className={az.matRow}>
                        {getAzenaRefineBoxContents(row.key, options.tier).map((mat) => (
                          <span key={mat.itemId} className={az.matChip} title={`${mat.label} ×${formatNumber(mat.amount)}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img loading="lazy" decoding="async" src={mat.icon} alt={mat.label} className={az.matIcon} />
                            <span className={az.matQty}>{formatNumber(mat.amount)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {AZENA_RAID_BOX_GOLD.map((row) => (
                    <div key={row.gold} className={az.popRow}>
                      <span>{formatNumber(row.gold)} 골드 금괴</span>
                      <span className={az.popPct}>{row.p}%</span>
                      <span className={az.popGold}>{formatNumber(row.gold)}G</span>
                    </div>
                  ))}
                  <div className={az.popFoot}>
                    <span>1개 {formatNumber(rb.perBoxEV)}G</span>
                    <span>×{rb.count} = {formatNumber(rb.total)}G</span>
                  </div>
                </InfoPopover>
                <div className={styles.itemCardBottom}>
                  <div className={styles.itemCardPriceLine}>
                    {formatNumber(rb.perBoxEV)}G x {rb.count}개
                  </div>
                  <div className={styles.itemCardSubtotal}>{formatNumber(rb.total)}G</div>
                </div>
              </div>

              {/* 3. 축복의 편린 — 확률표는 팝업 */}
              <div className={styles.itemCard}>
                <div className={styles.itemCardIconWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/azena-fragment.png" alt="축복의 편린" className={`${styles.itemCardIcon} ${az.artIcon}`} />
                </div>
                <div className={styles.itemCardName}>축복의 편린 ×{fr.expectedCount.toFixed(1)} (기대)</div>
                <InfoPopover
                  label="획득 확률 · 구성"
                  title={`축복의 편린 — 1개 기댓값 ${formatNumber(fr.perFragment.total)}G`}
                >
                  <div className={az.popNote}>
                    균열 {fr.baseRuns / 2}판 + 가디언 토벌 {fr.baseRuns / 2}판
                    {fr.extraRuns > 0 && (
                      <> + 추가 {fr.extraRuns}판 (공명 {options.resonanceCount} · 휴게 {options.restPotionCount} · PC방 {options.pcRoomVisits}×2)</>
                    )}
                    {' '}= 총 {fr.totalRuns}판 × {(FRAGMENT_DROP_RATE * 100).toFixed(1)}% ≈ {fr.expectedCount.toFixed(1)}개
                  </div>
                  {FRAGMENT_GOLD_TABLE.map((row) => (
                    <div key={row.gold} className={az.popRow}>
                      <span>{formatNumber(row.gold)} 골드</span>
                      <span className={az.popPct}>{row.p}%</span>
                      <span className={az.popGold}>{formatNumber(row.gold)}G</span>
                    </div>
                  ))}
                  <div className={az.popRow}>
                    <span>유물 각인서 (랜덤)</span>
                    <span className={az.popPct}>{FRAGMENT_ENGRAVING_RANDOM_P}%</span>
                    <span className={az.popGold}>{formatNumber(fr.perFragment.engravingAvg)}G</span>
                  </div>
                  <div className={az.popRow}>
                    <span>유물 각인서 (선택)</span>
                    <span className={az.popPct}>{FRAGMENT_ENGRAVING_SELECT_P}%</span>
                    <span className={az.popGold}>{formatNumber(fr.perFragment.engravingMax)}G</span>
                  </div>
                  <div className={az.popRow}>
                    <span>전설 카드 팩</span>
                    <span className={az.popPct}>{FRAGMENT_LEGENDARY_PACK_P}%</span>
                    <span className={az.popGold}>{formatNumber(LEGENDARY_PACK_GOLD)}G</span>
                  </div>
                  <div className={az.popRow}>
                    <span>전설 카드 선택 팩 II</span>
                    <span className={az.popPct}>{FRAGMENT_SELECT_PACK_P}%</span>
                    <span className={az.popGold}>{formatNumber(LEGENDARY_SELECT_PACK_GOLD)}G</span>
                  </div>
                  <div className={az.popFoot}>
                    <span>1개 {formatNumber(fr.perFragment.total)}G</span>
                    <span>×{fr.expectedCount.toFixed(1)} = {formatNumber(fr.total)}G</span>
                  </div>
                </InfoPopover>
                <div className={styles.itemCardBottom}>
                  <div className={styles.itemCardPriceLine}>
                    {formatNumber(fr.perFragment.total)}G x {fr.expectedCount.toFixed(1)}개
                  </div>
                  <div className={styles.itemCardSubtotal}>{formatNumber(fr.total)}G</div>
                </div>
              </div>

              {/* 4. 도약의 정수 — 매일 1개, 블크 환산이라 풀어 쓸 게 없어 드롭다운 없이 둔다 */}
              <div className={styles.itemCard} title="매일 1개 — 1개 = 10 블루 크리스탈, 환율 입력값으로 골드 환산">
                <div className={styles.itemCardIconWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/leap-essence.webp" alt="도약의 정수" className={styles.itemCardIcon} />
                </div>
                <div className={styles.itemCardName}>도약의 정수 ×{AZENA_DAYS}</div>
                <div className={styles.itemCardBottom}>
                  <div className={styles.itemCardPriceLine}>
                    {formatNumber(breakdown.daily.essenceUnitGold)}G x {AZENA_DAYS}개
                  </div>
                  <div className={styles.itemCardSubtotal}>{formatNumber(breakdown.daily.essenceGold)}G</div>
                </div>
              </div>

              {/* 5. 천상 도전권 — 매주 1개 고정가라 드롭다운 없이 둔다 */}
              <div className={styles.itemCard} title="매주 1개 지급 — 낙원 시즌 진행 중 기준">
                <div className={styles.itemCardIconWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/cjstkd.webp" alt="천상 도전 횟수 +1" className={styles.itemCardIcon} />
                </div>
                <div className={styles.itemCardName}>천상 도전 횟수 +1 ×{AZENA_WEEKS}</div>
                <div className={styles.itemCardBottom}>
                  <div className={styles.itemCardPriceLine}>
                    {formatNumber(breakdown.weekly.ticketUnitGold)}G x {AZENA_WEEKS}개
                  </div>
                  <div className={styles.itemCardSubtotal}>{formatNumber(breakdown.weekly.total)}G</div>
                </div>
              </div>

              {/* 6. 전용 버프 — 허브 스테이크 대체 가치, 드롭다운 없이 둔다 */}
              <div
                className={styles.itemCard}
                title={`힘·민·지 6,000 · 생명력 12,000 · 자원 회복 24% — 요리와 중복 불가라 명인의 허브 스테이크 주 ${AZENA_BUFF_STEAK_PER_WEEK}개 × ${AZENA_WEEKS}주를 아끼는 가치로 환산`}
              >
                <div className={styles.itemCardIconWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/herb-steak.png" alt="전용 버프" className={styles.itemCardIcon} />
                </div>
                <div className={styles.itemCardName}>전용 버프 ×{breakdown.buff.count}</div>
                <div className={styles.itemCardBottom}>
                  <div className={styles.itemCardPriceLine}>
                    {formatNumber(AZENA_BUFF_STEAK_GOLD)}G x {breakdown.buff.count}개
                  </div>
                  <div className={styles.itemCardSubtotal}>{formatNumber(breakdown.buff.total)}G</div>
                </div>
              </div>
            </div>

            <div className={az.grandTotalRow}>
              <span className={az.grandTotalLabel}>{AZENA_DAYS}일 총 기대값</span>
              <span className={az.grandTotalValue}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={az.goldIcon} />
                {formatNumber(breakdown.totalGold)}
              </span>
            </div>
          </section>
        </div>

        {/* 자주 묻는 질문 — 검색으로 들어온 사람이 바로 답을 얻는 자리.
            같은 글이 페이지의 FAQPage 구조화 데이터로도 나가므로 한쪽만 고치면 안 된다 */}
        <section className={styles.detailCard}>
          <h2 className={styles.detailCardHeader}>아제나의 축복 자주 묻는 질문</h2>
          <div className={az.faqList}>
            {AZENA_FAQ.map((item) => (
              <div key={item.q} className={az.faqItem}>
                <h3 className={az.faqQ}>{item.q}</h3>
                <p className={az.faqA}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Container>
  );
}
