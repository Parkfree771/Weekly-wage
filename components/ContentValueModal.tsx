'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  RIFT_TIERS,
  GUARDIAN_TIERS,
  EVENT_CONTENTS,
  SAND_GEM_TO_LV1,
  findTier,
  eventTierOf,
  sandTierOf,
  getSandMaterials,
  type ContentMaterial,
} from '@/data/rewardTable';
import { CONTENT_LABEL_TO_NAME } from '@/lib/gold-projection';
import { PriceProvider, usePriceData, useMaterialPrices } from '@/contexts/PriceContext';
import styles from './ContentValueModal.module.css';

// 숙제체크 카드의 i 버튼 → 해당 콘텐츠 수급 재료 + 실시간 시세 환산 골드.
// 균열/전선·가토는 일반/휴게/PC방 배수, 모래시계는 보상강화 단계를 팝업 안에서 바꿔 볼 수 있다.
// 수치는 data/rewardTable.ts 단일 원본을 그대로 읽는다(테이블만 고치면 여기도 따라 바뀐다).
// 앱(loalogol-app src/components/ContentValueSheet.tsx)과 같은 구성이다.
export type ContentValueTarget =
  | { type: 'rift'; level: number }
  | { type: 'guardian'; level: number }
  | { type: 'event'; name: string; level: number }
  | { type: 'sand'; level: number; enhance: number };

// name: 표시 이름, amount: 표시 수량, priceKey·priceUnits: 시세 조회 이름과 곱할 개수
type Row = { image: string; name: string; amount: number; priceKey?: string; priceUnits: number };
type Resolved = { title: string; rows: Row[]; boundGold: number; approx: boolean };

const GEM_IMAGE = '/1fpqrjqghk.webp';

// 일일 체크값 = 배수 (달력 정산 valueActivityEntry 와 같은 기준 — 휴게 2배 등)
const DAILY_OPTIONS = [
  { n: 1, label: '일반', color: '#16a34a' },
  { n: 2, label: '휴게', color: '#2563eb' },
  { n: 3, label: 'PC방', color: '#ea580c' },
  { n: 4, label: 'PC방+휴게', color: '#9333ea' },
];
const SAND_COLOR = '#b08d57';

function fromMaterials(mats: ContentMaterial[], mult = 1): { rows: Row[]; boundGold: number } {
  const boundGold = (mats.find((m) => m.label === '귀속골드')?.amount ?? 0) * mult;
  const rows = mats
    .filter((m) => m.label !== '귀속골드')
    .map((m) => {
      const priceKey = CONTENT_LABEL_TO_NAME[m.label];
      return { image: m.image, name: priceKey ?? m.label, amount: m.amount * mult, priceKey, priceUnits: m.amount * mult };
    });
  return { rows, boundGold };
}

// option: 균열/가토는 배수(1~4), 모래시계는 보상강화 단계(0~5)
function resolve(target: ContentValueTarget, option: number): Resolved | null {
  if (target.type === 'event') {
    const content = EVENT_CONTENTS.find((c) => c.name === target.name);
    if (!content) return null;
    const tier = eventTierOf(target.level);
    return { title: `${tier} ${content.name}`, ...fromMaterials(content.byTier[tier]), approx: false };
  }
  if (target.type === 'sand') {
    const tier = sandTierOf(target.level);
    // 보석은 실제 지급 등급(1730=2레벨, 1750·1770=3레벨)으로 보여 주고, 시세는 1레벨 환산 개수로 곱한다
    const gemMult = SAND_GEM_TO_LV1[tier];
    const gemLv = Math.round(Math.log(gemMult) / Math.log(3)) + 1;
    const { rows, boundGold } = fromMaterials(getSandMaterials(tier, option));
    const out = rows.map((r) =>
      r.image === GEM_IMAGE ? { ...r, name: `${gemLv}레벨 보석`, amount: r.amount / gemMult } : r,
    );
    return { title: `${tier} 모래시계`, rows: out, boundGold, approx: false };
  }
  const tier = findTier(target.type === 'rift' ? RIFT_TIERS : GUARDIAN_TIERS, target.level);
  if (!tier) return null;
  // 균열·가토는 실측 표본 평균이라 실제 1회와 차이가 있어 '약'을 붙인다
  return { title: tier.label, ...fromMaterials(tier.materials, option), approx: true };
}

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
const fmtUnit = (n: number) => (n >= 100 ? fmt(n) : n.toLocaleString('ko-KR', { maximumFractionDigits: 2 }));
const fmtAmount = (n: number, approx: boolean) =>
  approx && n >= 1 ? `약 ${fmt(n)}개` : `${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}개`;

function Body({ target, onClose }: { target: ContentValueTarget; onClose: () => void }) {
  const { loading, error } = usePriceData();
  const prices = useMaterialPrices();
  const isDaily = target.type === 'rift' || target.type === 'guardian';
  // 시작값: 균열/가토는 일반(×1), 모래시계는 카드에 설정된 보상강화 단계
  const [option, setOption] = useState(target.type === 'sand' ? target.enhance : 1);
  const data = resolve(target, option);
  if (!data) return null;

  const rows = data.rows.map((r) => {
    const unit = r.priceKey ? prices[r.priceKey] : undefined;
    return { ...r, unit, value: unit != null ? unit * r.priceUnits : null };
  });
  const matTotal = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const total = matTotal + data.boundGold;

  const dailyOptions = isDaily ? DAILY_OPTIONS.slice(0, target.type === 'rift' ? 4 : 2) : [];
  const picked = DAILY_OPTIONS.find((d) => d.n === option);
  const totalCaption = isDaily
    ? `${picked?.label ?? ''} 기준${option > 1 ? ` (×${option})` : ''}`
    : target.type === 'sand'
      ? option > 0 ? `보상강화 ${option}단계 기준` : '보상강화 없음 기준'
      : '1회 기준';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={`${data.title} 보상 가치`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">×</button>
        <div className={styles.title}>{data.title} 보상 가치</div>

        {isDaily && (
          <div className={styles.options} role="radiogroup" aria-label="보상 배수">
            {dailyOptions.map((d) => (
              <button
                key={d.n}
                type="button"
                role="radio"
                aria-checked={option === d.n}
                className={`${styles.option} ${option === d.n ? styles.optionOn : ''}`}
                style={option === d.n ? { background: d.color, borderColor: d.color } : undefined}
                onClick={() => setOption(d.n)}
              >
                <span className={styles.optionDot} style={{ background: option === d.n ? 'rgba(255,255,255,0.25)' : d.color }}>{d.n}</span>
                {d.label}
              </button>
            ))}
          </div>
        )}
        {target.type === 'sand' && (
          <div className={styles.sandRow}>
            <span className={styles.sandLabel}>보상강화</span>
            <div className={styles.options} role="radiogroup" aria-label="보상강화 단계">
              {[0, 1, 2, 3, 4, 5].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  role="radio"
                  aria-checked={option === lv}
                  className={`${styles.option} ${styles.optionSquare} ${option === lv ? styles.optionOn : ''}`}
                  style={option === lv ? { background: SAND_COLOR, borderColor: SAND_COLOR } : undefined}
                  onClick={() => setOption(lv)}
                >
                  {lv === 0 ? '없음' : lv}
                </button>
              ))}
            </div>
          </div>
        )}

        {error ? (
          <div className={styles.state}>{error}</div>
        ) : loading ? (
          <div className={styles.state}>시세 불러오는 중</div>
        ) : (
          <>
            <ul className={styles.list}>
              {rows.map((r) => (
                <li key={r.name} className={styles.row}>
                  <Image src={r.image} alt="" width={32} height={32} unoptimized className={styles.icon} />
                  <div className={styles.nameCol}>
                    <span className={styles.name}>{r.name}</span>
                    {r.unit != null && (
                      <span className={styles.unit}>
                        개당 {fmtUnit(r.image === GEM_IMAGE ? (r.unit * r.priceUnits) / r.amount : r.unit)}G
                      </span>
                    )}
                  </div>
                  <span className={styles.amount}>{fmtAmount(r.amount, data.approx)}</span>
                  <span className={styles.value}>{r.value != null ? `${fmt(r.value)}G` : '-'}</span>
                </li>
              ))}
            </ul>

            <div className={styles.summary}>
              {data.boundGold > 0 && (
                <>
                  <div className={styles.summaryRow}>
                    <span>재료 가치</span>
                    <span>{fmt(matTotal)}G</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>귀속 골드</span>
                    <span>{fmt(data.boundGold)}G</span>
                  </div>
                </>
              )}
              <div className={styles.totalLine}>
                <div className={styles.totalLeft}>
                  <span className={styles.totalLabel}>총 가치</span>
                  <span className={styles.totalCaption}>{totalCaption}</span>
                </div>
                <span className={styles.totalValue}>
                  {data.approx ? '약 ' : ''}{fmt(total)}
                  <Image src="/gold.webp" alt="" width={18} height={18} unoptimized className={styles.totalGold} />
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ContentValueModal({ target, onClose }: { target: ContentValueTarget; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 시세는 팝업을 열 때만 불러온다 (숙제체크 첫 로딩에는 영향 없음)
  return (
    <PriceProvider>
      <Body target={target} onClose={onClose} />
    </PriceProvider>
  );
}
