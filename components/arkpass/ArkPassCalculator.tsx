'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import styles from '@/app/arkpass/arkpass.module.css';
import { fetchPriceData } from '@/lib/price-history-client';
import { ARKPASS_LEVELS, ARKPASS_PRICE, type Reward } from '@/data/arkpass';
import {
  rewardGold,
  calcTotals,
  selectedAchievement,
  tierValue,
  wonToGold,
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

const PEON_FIXED_WON_PER_100BLUE = 2750; // 100블루크리스탈 = 2750원(왕실)

export default function ArkPassCalculator() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [tier, setTier] = useState<PassTier>('premium');
  const [choices, setChoices] = useState<Record<number, number>>({});
  const [exchangeRate, setExchangeRate] = useState<number>(18000); // 100블크 = N골드
  const [premiumPrice, setPremiumPrice] = useState<number>(ARKPASS_PRICE.premium);
  const [superPrice, setSuperPrice] = useState<number>(ARKPASS_PRICE.superPremium);

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

  const premiumCostGold = wonToGold(premiumPrice, exchangeRate, PEON_FIXED_WON_PER_100BLUE);
  const superCostGold = wonToGold(superPrice, exchangeRate, PEON_FIXED_WON_PER_100BLUE);
  const upgradeCostGold = wonToGold(
    Math.max(0, superPrice - premiumPrice),
    exchangeRate,
    PEON_FIXED_WON_PER_100BLUE
  );

  const premiumExtra = totals.premium;
  const superExtra = totals.superPremium;

  function efficiency(value: number, cost: number): number | null {
    if (cost <= 0) return null;
    return Math.round((value / cost) * 100);
  }

  const hasAnyValue = freeValue + premiumValue + superValue > 0;

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

  const tierTotalValue = tier === 'free' ? freeValue : tier === 'premium' ? premiumValue : superValue;
  const tierCostGold = tier === 'free' ? 0 : tier === 'premium' ? premiumCostGold : superCostGold;
  const tierEff = efficiency(tierTotalValue, tierCostGold);
  const tierNet = tierTotalValue - tierCostGold;

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
          {/* 임시 데이터 안내 — 항상 표시 */}
          <div className={styles.tempNotice}>
            <strong>임시 데이터</strong> · 지난 시즌 표 기준이라 실제와 다를 수 있습니다. 일부 상자류는 가치 미산정 상태입니다.
          </div>

          {/* 선택 티어 효율 */}
          <div className={`${styles.effCard} ${styles[`effCard_${tier}`]}`}>
            <div className={styles.effTierName}>
              {TIER_META.find((t) => t.key === tier)?.label} 효율
            </div>
            <div className={styles.effValueRow}>
              <NextImage src="/gold.webp" alt="" width={26} height={26} />
              <span className={styles.effValue}>{tierTotalValue.toLocaleString()}</span>
              <span className={styles.effUnit}>G</span>
            </div>
            <div className={styles.effSubLabel}>총 획득 골드 가치</div>

            {tier !== 'free' && (
              <>
                <div className={styles.effDivider} />
                <div className={styles.effLine}>
                  <span>현금 환산 비용</span>
                  <span className={styles.effLineVal}>{tierCostGold.toLocaleString()} G</span>
                </div>
                <div className={styles.effLine}>
                  <span>순이득</span>
                  <span className={`${styles.effLineVal} ${tierNet >= 0 ? styles.pos : styles.neg}`}>
                    {tierNet >= 0 ? '+' : ''}{tierNet.toLocaleString()} G
                  </span>
                </div>
                <div className={styles.effPctBox}>
                  <span>효율</span>
                  <span className={`${styles.effPct} ${tierEff != null && tierEff >= 100 ? styles.pos : styles.neg}`}>
                    {tierEff != null ? `${tierEff}%` : '—'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 가치 분해 */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>보상 가치 분해</div>
            <div className={styles.breakRow}>
              <span className={styles.breakDot} data-k="free" />
              <span className={styles.breakName}>달성 보상</span>
              <span className={styles.breakVal}>{totals.achievement.toLocaleString()} G</span>
            </div>
            <div className={styles.breakRow}>
              <span className={styles.breakDot} data-k="premium" />
              <span className={styles.breakName}>프리미엄 추가</span>
              <span className={styles.breakVal}>+{premiumExtra.toLocaleString()} G</span>
            </div>
            <div className={styles.breakRow}>
              <span className={styles.breakDot} data-k="super" />
              <span className={styles.breakName}>슈퍼 프리미엄 추가</span>
              <span className={styles.breakVal}>+{superExtra.toLocaleString()} G</span>
            </div>
          </div>

          {/* 티어 비교 */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>구매 효율 비교</div>
            <CompareRow
              name="프리미엄"
              value={premiumExtra}
              cost={premiumCostGold}
              eff={efficiency(premiumExtra, premiumCostGold)}
            />
            <CompareRow
              name="슈퍼 업그레이드"
              value={superExtra}
              cost={upgradeCostGold}
              eff={efficiency(superExtra, upgradeCostGold)}
            />
            <div className={styles.compareHint}>
              구매로 추가로 얻는 가치 ÷ 환산 비용 기준
            </div>
          </div>

          {/* 입력: 가격 / 환율 */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>설정</div>

            <label className={styles.inputRow}>
              <span>프리미엄 가격</span>
              <span className={styles.inputWrap}>
                <input
                  type="number"
                  value={premiumPrice || ''}
                  onChange={(e) => setPremiumPrice(Number(e.target.value) || 0)}
                  min={0}
                />
                <i>원</i>
              </span>
            </label>

            <label className={styles.inputRow}>
              <span>슈퍼 가격</span>
              <span className={styles.inputWrap}>
                <input
                  type="number"
                  value={superPrice || ''}
                  onChange={(e) => setSuperPrice(Number(e.target.value) || 0)}
                  min={0}
                />
                <i>원</i>
              </span>
            </label>

            <label className={styles.inputRow}>
              <span>100블크 =</span>
              <span className={styles.inputWrap}>
                <input
                  type="number"
                  value={exchangeRate || ''}
                  onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                  min={0}
                />
                <i>G</i>
              </span>
            </label>
            <div className={styles.exchangeNote}>왕실 2,750원 = 100블루크리스탈 기준 환산</div>
          </div>

          {!hasAnyValue && (
            <div className={styles.warnNote}>
              아직 보상 골드 가치가 입력되지 않았습니다. <code>data/arkpass.ts</code> 의
              <code> gold</code> / <code>priceKey</code> 값을 채우면 효율이 계산됩니다.
            </div>
          )}
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

// ── 사이드바 비교 행 ─────────────────────────────
function CompareRow({
  name,
  value,
  cost,
  eff,
}: {
  name: string;
  value: number;
  cost: number;
  eff: number | null;
}) {
  return (
    <div className={styles.compareRow}>
      <span className={styles.compareName}>{name}</span>
      <span className={styles.compareNums}>
        <span className={styles.compareGain}>+{value.toLocaleString()}</span>
        <span className={styles.compareSlash}>/</span>
        <span className={styles.compareCost}>{cost.toLocaleString()}G</span>
      </span>
      <span className={`${styles.compareEff} ${eff != null && eff >= 100 ? styles.pos : styles.neg}`}>
        {eff != null ? `${eff}%` : '—'}
      </span>
    </div>
  );
}
