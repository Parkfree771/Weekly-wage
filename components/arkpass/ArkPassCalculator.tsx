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

// 분류별 대체 아이콘(이미지 없을 때)
const CATEGORY_ICON: Record<string, string> = {
  gold: '🪙',
  material: '📦',
  card: '🃏',
  gem: '💎',
  crystal: '🔷',
  peon: '🪶',
  avatar: '👕',
  wallpaper: '🖼️',
  pet: '🐾',
  etc: '🎁',
};

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
  const [exchangeRate, setExchangeRate] = useState<number>(18000); // 100블크 = N골드

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

  // 효율 = 보상 골드 가치 ÷ 가격(원) → 원당 골드 (G/원). 높을수록 이득
  function goldPerWon(value: number, won: number): number | null {
    if (won <= 0) return null;
    return value / won;
  }

  // 티어 비교 행 데이터
  const tierRows: {
    key: PassTier;
    label: string;
    value: number;
    price: number;
    eff: number | null;
  }[] = [
    { key: 'free', label: '무료', value: freeValue, price: 0, eff: null },
    { key: 'premium', label: '프리미엄', value: premiumValue, price: premiumPrice, eff: goldPerWon(premiumValue, premiumPrice) },
    { key: 'super', label: '슈퍼 프리미엄', value: superValue, price: superPrice, eff: goldPerWon(superValue, superPrice) },
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

  return (
    <div className={styles.layout}>
      {/* ===== 메인: 보상표 ===== */}
      <div className={styles.main}>
        <p className={styles.intro}>패스 레벨을 달성하면 다양한 보상을 획득할 수 있습니다.</p>

        {/* 티어 토글 */}
        <div className={styles.tierToggle}>
          {TIER_META.map((t) => (
            <button
              key={t.key}
              className={`${styles.tierBtn} ${styles[`tier_${t.key}`]} ${tier === t.key ? styles.tierBtnActive : ''}`}
              onClick={() => setTier(t.key)}
            >
              <span className={styles.tierBtnDot} />
              <span className={styles.tierBtnText}>
                <span className={styles.tierBtnLabel}>{t.label}</span>
                <span className={styles.tierBtnSub}>{t.sub}</span>
              </span>
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
          {/* 임시 데이터 — 확실하게 명시 */}
          <div className={styles.tempNotice}>
            <strong>※ 이 데이터는 임시입니다</strong>
            <span>지난 시즌 표 기반으로, 정식 데이터로 교체 예정입니다. 실제 보상·가격과 다릅니다.</span>
          </div>

          {/* 선택 티어 — 큰 효율 (G/원) */}
          <div className={`${styles.effCard} ${styles[`effCard_${tier}`]}`}>
            <div className={styles.effTierName}>{selectedRow.label}</div>
            <div className={styles.effMain}>
              <span className={styles.effBig}>
                {selectedRow.eff != null ? selectedRow.eff.toFixed(1) : '—'}
              </span>
              <span className={styles.effBigUnit}>G / 원</span>
            </div>
            <div className={styles.effMeta}>
              <span>보상 가치 <b>{selectedRow.value.toLocaleString()} G</b></span>
              <span>가격 <b>{selectedRow.price > 0 ? `${selectedRow.price.toLocaleString()}원` : '무료'}</b></span>
            </div>
          </div>

          {/* 티어별 효율 비교 (클릭으로 선택) */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>티어별 효율 비교</div>
            <div className={styles.cmpHead}>
              <span>티어</span>
              <span>보상 가치</span>
              <span>가격</span>
              <span>효율</span>
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
                  {row.label}
                </span>
                <span className={styles.cmpVal}>{row.value.toLocaleString()}</span>
                <span className={styles.cmpPrice}>{row.price > 0 ? row.price.toLocaleString() : '무료'}</span>
                <span className={styles.cmpEff}>{row.eff != null ? row.eff.toFixed(1) : '—'}</span>
              </button>
            ))}
            <div className={styles.cmpFoot}>효율 = 보상 골드 가치 ÷ 가격(원) · 높을수록 이득</div>
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

          {/* 환율 입력 (패키지 효율과 동일한 방식) */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>블루 크리스탈 시세</div>
            <div className={styles.rateBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/blue.webp" alt="" className={styles.rateIcon} />
              <span className={styles.rateFixed}>100</span>
              <span className={styles.rateSep}>=</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gold.webp" alt="" className={styles.rateIcon} />
              <input
                type="number"
                className={styles.rateInput}
                value={exchangeRate || ''}
                onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                placeholder="18000"
                min={0}
              />
              <span className={styles.rateUnit}>G</span>
            </div>
            <div className={styles.exchangeNote}>페온·도약·물약 등 크리스탈 보상 환산에 사용</div>
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
          <span className={styles.tileEmoji}>{CATEGORY_ICON[reward.category || 'etc']}</span>
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
