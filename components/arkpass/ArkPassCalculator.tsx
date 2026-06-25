'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/app/arkpass/arkpass.module.css';
import { fetchPriceData } from '@/lib/price-history-client';
import { ARKPASS_LEVELS, ARKPASS_PRICE, type Reward, type BoxContents } from '@/data/arkpass';
import {
  rewardGold,
  sumGold,
  calcTotals,
  selectedAchievement,
  tierValue,
  tierPaidValue,
  type PassTier,
  type PriceCtx,
} from '@/lib/arkpass-calc';

const CATEGORY_LABEL: Record<string, string> = {
  avatar: '아바타',
  wallpaper: '벽지',
};

const BOX_MODE_LABEL: Record<string, string> = {
  select: '아래 중 1종 선택',
  include: '포함 구성품',
  random: '랜덤 구성품',
};

const TIER_META: { key: PassTier; label: string; sub: string }[] = [
  { key: 'free', label: '무료', sub: '달성 보상' },
  { key: 'premium', label: '프리미엄', sub: '달성 + 프리미엄' },
  { key: 'super', label: '슈퍼 프리미엄', sub: '전체 보상' },
];

export default function ArkPassCalculator() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [tier, setTier] = useState<PassTier>('premium');
  const [choices, setChoices] = useState<Record<number, number>>({});
  // 환율: 100골드 = N원 (패키지 등록 페이지 "엄거래 100골드:N원"과 동일) — 기본 100:16
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(16);

  // 100블루크리스탈 = 2750원(왕실) 기준 → 블루크리스탈 골드 환산율(100블크 = N골드)
  const exchangeRate = wonPer100Gold > 0 ? Math.round((2750 / wonPer100Gold) * 100) : 0;

  // 패스 가격(원) — data/arkpass.ts 에 직접 입력
  const premiumPrice = ARKPASS_PRICE.premium;
  const superPrice = ARKPASS_PRICE.superPremium;

  useEffect(() => {
    fetchPriceData()
      .then(({ latest }) => setPrices(latest))
      .catch(() => {});
  }, []);

  const ctx = useMemo(
    () => ({ exchangeRate, goldPerWon: wonPer100Gold > 0 ? 100 / wonPer100Gold : 0 }),
    [exchangeRate, wonPer100Gold]
  );

  const totals = useMemo(
    () => calcTotals(ARKPASS_LEVELS, choices, prices, ctx),
    [choices, prices, ctx]
  );

  // 표시용 총 획득 가치 (택1 포함)
  const freeValue = tierValue(totals, 'free');
  const premiumValue = tierValue(totals, 'premium');
  const superValue = tierValue(totals, 'super');
  // 이득률 계산용 유료 보상 가치 (무료 택1 제외)
  const premiumPaid = tierPaidValue(totals, 'premium');
  const superPaid = tierPaidValue(totals, 'super');

  // 패키지 효율과 동일한 이득률(%) 계산
  // goldPerWon = 1원당 골드, 가격(원)을 골드로 환산해 보상 골드와 비교
  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;

  function benefitPct(value: number, won: number): number | null {
    if (won <= 0 || goldPerWon <= 0) return null;
    const cashGold = won * goldPerWon; // 그 가격으로 살 수 있는 골드
    if (cashGold <= 0) return null;
    return ((value - cashGold) / cashGold) * 100;
  }

  // 티어 비교 행 데이터 — value=총 가치(표시), paid=유료 가치(이득률)
  const tierRows: {
    key: PassTier;
    label: string;
    value: number;
    paid: number;
    price: number;
    benefit: number | null;
  }[] = [
    { key: 'free', label: '무료', value: freeValue, paid: 0, price: 0, benefit: null },
    { key: 'premium', label: '프리미엄', value: premiumValue, paid: premiumPaid, price: premiumPrice, benefit: benefitPct(premiumPaid, premiumPrice) },
    { key: 'super', label: '슈퍼 프리미엄', value: superValue, paid: superPaid, price: superPrice, benefit: benefitPct(superPaid, superPrice) },
  ];

  function pickAchievement(level: number, idx: number) {
    setChoices((prev) => {
      // 이미 선택된 항목을 다시 누르면 선택 해제 (→ 자동: 더 비싼 쪽)
      if (prev[level] === idx) {
        const next = { ...prev };
        delete next[level];
        return next;
      }
      return { ...prev, [level]: idx };
    });
  }

  const selectedRow = tierRows.find((r) => r.key === tier)!;
  // 패스 가격(원)을 환율로 골드 환산 → 유료 보상 골드(택1 제외)와 비교
  const selPriceGold = selectedRow.price > 0 && goldPerWon > 0 ? Math.round(selectedRow.price * goldPerWon) : 0;
  const selDiff = selectedRow.paid - selPriceGold;

  return (
    <div className={styles.layout}>
      {/* ===== 메인: 보상표 ===== */}
      <div className={styles.main}>
        {/* 티어 토글 */}
        <div className={styles.tierToggle}>
          {TIER_META.map((t) => (
            <button
              key={t.key}
              className={`${styles.tierBtn} ${styles[`tier_${t.key}`]} ${tier === t.key ? styles.tierBtnActive : ''}`}
              onClick={() => setTier(t.key)}
            >
              <span className={styles.tierBtnLabel}>{t.label}</span>
              <span className={styles.tierBtnSub}>{t.sub}</span>
            </button>
          ))}
        </div>

        {/* 레벨 행 */}
        <div className={styles.rows}>
          {ARKPASS_LEVELS.map((lv) => {
            const picked = selectedAchievement(lv, choices, prices, ctx);
            const pickedIdx = picked ? lv.achievement.indexOf(picked) : -1;
            const single = lv.achievement.length === 1;
            // 레벨별 가치(표시) — 택1 포함: 무료=택1, 프리미엄=택1+프리미엄, 슈퍼=전부
            const achGold = picked ? rewardGold(picked, prices, ctx) ?? 0 : 0;
            const premGold = sumGold(lv.premium, prices, ctx);
            const superGold = lv.superPremium ? sumGold(lv.superPremium, prices, ctx) : 0;
            const levelGold =
              tier === 'free'
                ? achGold
                : tier === 'premium'
                ? achGold + premGold
                : achGold + premGold + superGold;
            return (
              <div key={lv.level} className={`${styles.row} ${lv.special ? styles.rowSpecial : ''}`}>
                {/* 레벨 */}
                <div className={styles.colLevel}>
                  <div className={`${styles.levelBadge} ${lv.special ? styles.levelSpecial : ''}`}>
                    <span className={styles.levelLv}>{lv.special ? 'SPECIAL' : 'LV'}</span>
                    <span className={styles.levelNum}>{lv.level}</span>
                  </div>
                </div>

                {/* 달성 보상 (택1, 좌우 배치) */}
                <div className={`${styles.colAchieve} ${styles.section}`}>
                  <div className={styles.secLabel} data-k="achieve">
                    아크 패스 {!single && <span className={styles.secPick}>택 1</span>}
                  </div>
                  <div className={`${styles.optRow} ${single ? styles.optRowSingle : ''}`}>
                    {lv.achievement.map((r, i) => {
                      const selected = single || i === pickedIdx;
                      return (
                        <Fragment key={i}>
                          {!single && i > 0 && <span className={styles.vs}>VS</span>}
                          <button
                            className={`${styles.optTile} ${selected ? styles.optSelected : ''} ${single ? styles.optSingle : ''}`}
                            onClick={() => !single && pickAchievement(lv.level, i)}
                            type="button"
                          >
                            {!single && <span className={`${styles.check} ${selected ? styles.checkOn : ''}`} />}
                            <RewardTile reward={r} prices={prices} ctx={ctx} />
                          </button>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* 프리미엄 보상 */}
                <div className={`${styles.colPremium} ${styles.section} ${tier === 'free' ? styles.dimmed : ''}`}>
                  <div className={styles.secLabel} data-k="premium">프리미엄 보상</div>
                  <div className={styles.tileWrap}>
                    {lv.premium.length > 0 ? (
                      lv.premium.map((r, i) => <RewardTile key={i} reward={r} prices={prices} ctx={ctx} />)
                    ) : (
                      <span className={styles.empty}>—</span>
                    )}
                  </div>
                </div>

                {/* 슈퍼 프리미엄 */}
                <div className={`${styles.colSuper} ${styles.section} ${tier !== 'super' ? styles.dimmed : ''}`}>
                  <div className={styles.secLabel} data-k="super">슈퍼 프리미엄 추가</div>
                  <div className={styles.tileWrap}>
                    {lv.superPremium && lv.superPremium.length > 0 ? (
                      lv.superPremium.map((r, i) => <RewardTile key={i} reward={r} prices={prices} ctx={ctx} />)
                    ) : (
                      <span className={styles.empty}>—</span>
                    )}
                  </div>
                </div>

                {/* 레벨 가치 (선택 티어 기준 누적) */}
                <div className={`${styles.colResult} ${styles.section}`}>
                  <div className={styles.secLabel} data-k="result">레벨 가치</div>
                  <div className={styles.resultBox}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/gold.webp" alt="" className={styles.resultIcon} />
                    <span className={styles.resultVal}>{levelGold.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 합계 행 — 열별 총합 + 선택 티어 총합 */}
          <div className={`${styles.row} ${styles.rowTotal}`}>
            <div className={styles.colLevel}>
              <div className={styles.totalBadge}>합계</div>
            </div>
            <div className={`${styles.colAchieve} ${styles.section} ${styles.totalCell}`}>
              <span className={styles.totalLabel}>택1(무료) 선택 합</span>
              <span className={styles.totalVal}>{totals.achievement.toLocaleString()} G</span>
            </div>
            <div className={`${styles.colPremium} ${styles.section} ${styles.totalCell}`}>
              <span className={styles.totalLabel}>프리미엄 합</span>
              <span className={styles.totalVal}>{totals.premium.toLocaleString()} G</span>
            </div>
            <div className={`${styles.colSuper} ${styles.section} ${styles.totalCell}`}>
              <span className={styles.totalLabel}>슈퍼 합</span>
              <span className={styles.totalVal}>{totals.superPremium.toLocaleString()} G</span>
            </div>
            <div className={`${styles.colResult} ${styles.section} ${styles.totalCell}`}>
              <span className={styles.totalLabel}>
                {tier === 'free' ? '무료' : tier === 'premium' ? '프리미엄' : '슈퍼'} 총합
              </span>
              <span className={`${styles.totalVal} ${styles.totalGrand}`}>
                {selectedRow.value.toLocaleString()} G
              </span>
            </div>
          </div>
        </div>

        <p className={styles.fillNote}>
          ※ 보상 목록과 골드 가치는 <code>data/arkpass.ts</code> 에서 채워 넣으면 효율이 자동 계산됩니다.
        </p>
      </div>

      {/* ===== 사이드바: 효율 요약 (스크롤 따라옴) ===== */}
      <aside className={styles.sidebar}>
        <div className={styles.sideInner}>
          {/* 선택 티어 효율 — 티어 탭 + 결과 */}
          <div className={`${styles.effCard} ${styles[`effCard_${tier}`]}`}>
            <div className={styles.effTabs}>
              {TIER_META.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`${styles.effTab} ${styles[`tier_${t.key}`]} ${tier === t.key ? styles.effTabActive : ''}`}
                  onClick={() => setTier(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className={styles.effMain}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gold.webp" alt="" className={styles.effGoldIcon} />
              <span className={styles.effBig}>{(tier === 'free' ? selectedRow.value : selectedRow.paid).toLocaleString()}</span>
              <span className={styles.effBigUnit}>G</span>
            </div>
            <div className={styles.effSubLabel}>{tier === 'free' ? '보상 골드 가치' : '유료 보상 가치 (무료 제외)'}</div>
            <div className={styles.effCompare}>
              <div className={styles.effCmpRow}>
                <span className={styles.effCmpKey}>패스 가격</span>
                <span className={styles.effCmpVal}>{selectedRow.price > 0 ? `${selectedRow.price.toLocaleString()}원` : '무료'}</span>
              </div>
              {selectedRow.price > 0 && (
                <div className={styles.effCmpRow}>
                  <span className={styles.effCmpKey}>골드로 환산</span>
                  <span className={styles.effCmpVal}>≈ {selPriceGold.toLocaleString()} G</span>
                </div>
              )}
              <div className={`${styles.effCmpRow} ${styles.effCmpResult}`}>
                <span className={styles.effCmpKey}>이득률</span>
                <span className={selectedRow.benefit != null ? (selectedRow.benefit >= 0 ? styles.pos : styles.neg) : styles.effCmpVal}>
                  {selectedRow.benefit != null
                    ? `${selectedRow.benefit >= 0 ? '+' : ''}${selectedRow.benefit.toFixed(1)}%`
                    : '—'}
                  {selectedRow.price > 0 && selectedRow.benefit != null && (
                    <small>{' '}({selDiff >= 0 ? '+' : ''}{selDiff.toLocaleString()}G)</small>
                  )}
                </span>
              </div>
            </div>
            {/* 환율 입력칸 — 효율 카드에 합침 (라벨 없이 입력칸만) */}
            <div className={styles.effRate}>
              <div className={styles.rateBox}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gold.webp" alt="" className={styles.rateIcon} />
                <span className={styles.rateFixed}>100</span>
                <span className={styles.rateSep}>:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/royal.webp" alt="" className={styles.rateIcon} />
                <input
                  type="number"
                  className={styles.rateInput}
                  value={wonPer100Gold || ''}
                  onChange={(e) => setWonPer100Gold(Number(e.target.value) || 0)}
                  placeholder="15"
                  min={0}
                />
                <span className={styles.rateUnit}>원</span>
              </div>
            </div>
          </div>

          {/* 티어별 효율 비교 (클릭으로 선택) */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>티어별 효율 비교</div>
            <div className={styles.cmpHead}>
              <span>티어</span>
              <span>보상 가치</span>
              <span>가격</span>
              <span>이득률</span>
            </div>
            {tierRows.map((row) => (
              <button
                key={row.key}
                type="button"
                className={`${styles.cmpRow} ${tier === row.key ? styles.cmpRowActive : ''}`}
                onClick={() => setTier(row.key)}
              >
                <span className={styles.cmpName}>
                  <i className={styles.cmpDot} data-k={row.key} />
                  {row.key === 'super' ? '슈퍼' : row.label}
                </span>
                <span className={styles.cmpVal}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/gold.webp" alt="" className={styles.cmpGoldIcon} />
                  {(row.key === 'free' ? row.value : row.paid).toLocaleString()}
                </span>
                <span className={styles.cmpPrice}>{row.price > 0 ? `${row.price.toLocaleString()}원` : '무료'}</span>
                <span className={`${styles.cmpEff} ${row.benefit != null ? (row.benefit >= 0 ? styles.pos : styles.neg) : ''}`}>
                  {row.benefit != null ? `${row.benefit >= 0 ? '+' : ''}${row.benefit.toFixed(0)}%` : '—'}
                </span>
              </button>
            ))}
            <div className={styles.cmpFoot}>
              이득률 = (보상 골드 − 가격의 골드 환산) ÷ 가격의 골드 환산 · 패키지 효율과 동일
            </div>
          </div>

          {/* 보상 가치 분해 */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>보상 가치 분해</div>
            <div className={styles.breakRow}>
              <span className={styles.breakDot} data-k="free" />
              <span className={styles.breakName}>아크패스(달성)</span>
              <span className={styles.breakVal}>{totals.achievement.toLocaleString()} G</span>
            </div>
            <div className={styles.breakRow}>
              <span className={styles.breakDot} data-k="premium" />
              <span className={styles.breakName}>프리미엄 추가</span>
              <span className={styles.breakVal}>+{totals.premium.toLocaleString()} G</span>
            </div>
            <div className={styles.breakRow}>
              <span className={styles.breakDot} data-k="super" />
              <span className={styles.breakName}>슈퍼 프리미엄 추가</span>
              <span className={styles.breakVal}>+{totals.superPremium.toLocaleString()} G</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── 보상 타일 ─────────────────────────────────────
function RewardTile({
  reward,
  prices,
  ctx,
}: {
  reward: Reward;
  prices: Record<string, number>;
  ctx?: PriceCtx;
}) {
  const gold = rewardGold(reward, prices, ctx);
  const catLabel = reward.category ? CATEGORY_LABEL[reward.category] : undefined;
  const isAvatar = reward.category === 'avatar';

  // 호버 구성품:
  //  - contents 가 있으면 정보형(확률/수량/귀속/안내문) 표시
  //  - 없고 choices 가 있으면 시세형(옵션별 골드 + 자동 최고가) 표시
  const infoBox: BoxContents | undefined = reward.contents;
  const pricedChoices =
    !infoBox && reward.choices && reward.choices.length > 0 ? reward.choices : null;
  const choiceGolds = pricedChoices ? pricedChoices.map((c) => rewardGold(c, prices, ctx)) : null;
  let maxIdx = -1;
  if (choiceGolds) {
    let best = -Infinity;
    choiceGolds.forEach((v, i) => {
      const g = v ?? -1;
      if (g > best) {
        best = g;
        maxIdx = i;
      }
    });
  }
  const singleChoice = !!pricedChoices && pricedChoices.length === 1;
  const showHead = !!pricedChoices || (!!infoBox && infoBox.items.length > 0);
  const hasTip = !!(infoBox || pricedChoices);

  const ref = useRef<HTMLSpanElement>(null);
  // 호버 툴팁 위치 — overflow:hidden 컨테이너를 벗어나도록 position:fixed
  const [tip, setTip] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  function showTip() {
    const el = ref.current;
    if (!el) return;
    const rc = el.getBoundingClientRect();
    const W = 360;
    const left = Math.max(8, Math.min(rc.left + rc.width / 2 - W / 2, window.innerWidth - W - 8));
    const enoughAbove = rc.top > 280;
    setTip(
      enoughAbove
        ? { left, bottom: window.innerHeight - rc.top + 8 }
        : { left, top: rc.bottom + 8 }
    );
  }
  function hideTip() {
    setTip(null);
  }

  return (
    <span
      ref={ref}
      className={`${styles.tile} ${isAvatar ? styles.tileAvatar : ''} ${hasTip ? styles.tileBox : ''}`}
      onMouseEnter={hasTip ? showTip : undefined}
      onMouseLeave={hasTip ? hideTip : undefined}
    >
      <span
        className={`${styles.tileImg} ${isAvatar ? styles.tileImgWide : ''} ${(reward.category && styles[`cat_${reward.category}`]) || ''}`}
      >
        {reward.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reward.image}
            alt=""
            style={reward.cropY ? { objectFit: 'cover', objectPosition: `center ${reward.cropY}` } : undefined}
          />
        ) : (
          <span className={styles.tilePlaceholder} />
        )}
        {reward.qty > 1 && <span className={styles.tileQty}>×{reward.qty.toLocaleString()}</span>}
        {hasTip && <span className={styles.boxFlag}>구성품</span>}
      </span>
      <span className={styles.tileName}>{reward.name}</span>
      {gold != null ? (
        <span className={styles.tileGold}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gold.webp" alt="" />
          {gold.toLocaleString()}
          {reward.bonusGold ? (
            <span className={styles.bonusChip}>가공 +{reward.bonusGold.toLocaleString()}</span>
          ) : null}
        </span>
      ) : (
        <span className={styles.tileCat}>{catLabel || '가치 미산정'}</span>
      )}

      {hasTip && tip && (
        <span
          className={styles.boxTip}
          style={{ left: tip.left, top: tip.top, bottom: tip.bottom }}
          role="tooltip"
        >
          {showHead && (
            <span className={styles.boxTipHead}>
              {pricedChoices
                ? singleChoice
                  ? '포함 구성품'
                  : `${pricedChoices.length}종 중 자동 최고가 선택`
                : BOX_MODE_LABEL[infoBox!.mode]}
            </span>
          )}
          {infoBox?.note && <span className={styles.boxTipNote}>{infoBox.note}</span>}

          {/* 시세형 (옵션별 수량 × 시세 + 최고가 강조) */}
          {pricedChoices && (
            <span className={styles.boxTipList}>
              {pricedChoices.map((c, i) => {
                const g = choiceGolds![i];
                const isTop = !singleChoice && i === maxIdx;
                return (
                  <span
                    key={i}
                    className={`${styles.boxTipItem} ${isTop ? styles.boxTipItemTop : ''}`}
                  >
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" className={styles.boxTipImg} />
                    ) : (
                      <span className={styles.boxTipDot} />
                    )}
                    <span className={styles.boxTipName}>
                      {c.name}
                      {c.bound && <em className={styles.boxTipBound}>귀속</em>}
                      {isTop && <em className={styles.boxTipPick}>최고가</em>}
                    </span>
                    {c.qty > 1 && <span className={styles.boxTipQty}>×{c.qty.toLocaleString()}</span>}
                    <span className={styles.boxTipPrice}>
                      {g != null ? `${g.toLocaleString()} G` : '-'}
                    </span>
                  </span>
                );
              })}
            </span>
          )}

          {/* 정보형 (확률/수량/귀속) */}
          {infoBox && infoBox.items.length > 0 && (
            <span className={styles.boxTipList}>
              {infoBox.items.map((it, i) => (
                <span key={i} className={styles.boxTipItem}>
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" className={styles.boxTipImg} />
                  ) : (
                    <span className={styles.boxTipDot} />
                  )}
                  <span className={styles.boxTipName}>
                    {it.name}
                    {it.bound && <em className={styles.boxTipBound}>귀속</em>}
                  </span>
                  {it.prob != null && <span className={styles.boxTipProb}>{it.prob}%</span>}
                  {it.qty && it.qty > 1 && (
                    <span className={styles.boxTipQty}>×{it.qty.toLocaleString()}</span>
                  )}
                </span>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
