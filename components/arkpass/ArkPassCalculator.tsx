'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import styles from '@/app/arkpass/arkpass.module.css';
import { fetchPriceData } from '@/lib/price-history-client';
import { ARKPASS_LEVELS, ARKPASS_PRICE, type Reward } from '@/data/arkpass';
import {
  rewardGold,
  calcTotals,
  selectedAchievement,
  tierValue,
  type PassTier,
  type PriceCtx,
} from '@/lib/arkpass-calc';

const CATEGORY_LABEL: Record<string, string> = {
  avatar: '아바타',
  wallpaper: '벽지',
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
  // 환율: 100골드 = N원 (패키지 효율 계산과 동일)
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(15);

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

  const ctx = useMemo(() => ({ exchangeRate }), [exchangeRate]);

  const totals = useMemo(
    () => calcTotals(ARKPASS_LEVELS, choices, prices, ctx),
    [choices, prices, ctx]
  );

  const freeValue = tierValue(totals, 'free');
  const premiumValue = tierValue(totals, 'premium');
  const superValue = tierValue(totals, 'super');

  // 패키지 효율과 동일한 이득률(%) 계산
  // goldPerWon = 1원당 골드, 가격(원)을 골드로 환산해 보상 골드와 비교
  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;

  function benefitPct(value: number, won: number): number | null {
    if (won <= 0 || goldPerWon <= 0) return null;
    const cashGold = won * goldPerWon; // 그 가격으로 살 수 있는 골드
    if (cashGold <= 0) return null;
    return ((value - cashGold) / cashGold) * 100;
  }

  // 티어 비교 행 데이터
  const tierRows: {
    key: PassTier;
    label: string;
    value: number;
    price: number;
    benefit: number | null;
  }[] = [
    { key: 'free', label: '무료', value: freeValue, price: 0, benefit: null },
    { key: 'premium', label: '프리미엄', value: premiumValue, price: premiumPrice, benefit: benefitPct(premiumValue, premiumPrice) },
    { key: 'super', label: '슈퍼 프리미엄', value: superValue, price: superPrice, benefit: benefitPct(superValue, superPrice) },
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
  // 패스 가격(원)을 환율로 골드 환산 → 보상 골드와 직접 비교
  const selPriceGold = selectedRow.price > 0 && goldPerWon > 0 ? Math.round(selectedRow.price * goldPerWon) : 0;
  const selDiff = selectedRow.value - selPriceGold;

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
              </div>
            );
          })}
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
              <span className={styles.effBig}>{selectedRow.value.toLocaleString()}</span>
              <span className={styles.effBigUnit}>G</span>
            </div>
            <div className={styles.effSubLabel}>총 보상 골드 가치</div>
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
                  {row.value.toLocaleString()}
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

          {/* 임시 데이터 안내 (하단) */}
          <div className={styles.tempNotice}>
            <strong>※ 이 데이터는 임시입니다</strong>
            <span>지난 시즌 표 기반으로, 정식 데이터로 교체 예정입니다. 실제 보상·가격과 다릅니다.</span>
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

  // 선택 상자: 옵션 이미지들을 나란히 + 택1 배지
  if (reward.choices && reward.choices.length > 0) {
    return (
      <span className={styles.tile}>
        <span className={styles.tileChoiceRow}>
          {reward.choices.map((opt, i) => (
            <Fragment key={i}>
              {i > 0 && <span className={styles.tileChoiceSep}>/</span>}
              <span className={styles.tileImg}>
                {opt.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opt.image} alt="" />
                ) : (
                  <span className={styles.tilePlaceholder} />
                )}
                {opt.qty > 1 && <span className={styles.tileQty}>×{opt.qty.toLocaleString()}</span>}
              </span>
            </Fragment>
          ))}
        </span>
        <span className={styles.tileName}>
          {reward.name}
          {reward.qty > 1 ? ` ×${reward.qty}` : ''}
          <span className={styles.choiceBadge}>택1</span>
        </span>
        {gold != null ? (
          <span className={styles.tileGold}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gold.webp" alt="" />
            {gold.toLocaleString()}
          </span>
        ) : (
          <span className={styles.tileCat}>{catLabel || '가치 미산정'}</span>
        )}
      </span>
    );
  }

  return (
    <span className={`${styles.tile} ${isAvatar ? styles.tileAvatar : ''}`}>
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
      </span>
      <span className={styles.tileName}>{reward.name}</span>
      {gold != null ? (
        <span className={styles.tileGold}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gold.webp" alt="" />
          {gold.toLocaleString()}
        </span>
      ) : (
        <span className={styles.tileCat}>{catLabel || '가치 미산정'}</span>
      )}
    </span>
  );
}
