'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Form } from 'react-bootstrap';
import { raids, upcomingRaids, getRaidNewLabel } from '@/data/raids';
import { raidRewards, type MaterialReward } from '@/data/raidRewards';
import { raidClearRewards } from '@/data/raidClearRewards';
import { PriceProvider, usePriceData } from '@/contexts/PriceContext';
import AdBanner from '@/components/ads/AdBanner';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import { ADFIT_UNITS } from '@/components/ads/adConfig';
import styles from './more-reward.module.css';

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

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

type Raid = (typeof raids)[number];

export default function MoreRewardPage() {
  return (
    <PriceProvider>
      <MoreRewardInner />
    </PriceProvider>
  );
}

type CheckType = 'basic' | 'more';

function MoreRewardInner() {
  const { unitPrices, graceUnitPrice, thornUnitPrice, wraithEchoUnitPrice, handOfDeathUnitPrice, loading } = usePriceData();
  // 두 섹션(더보기 손익 계산 / 레이드 클리어 보상)은 각자 독립적으로 펼침 상태를 가진다.
  const [openEff, setOpenEff] = useState<string | null>(null);
  const [openClear, setOpenClear] = useState<string | null>(null);

  // 시세 기준일 — SSR/클라이언트 불일치 방지 위해 마운트 후 표시
  const [priceDate, setPriceDate] = useState('');
  useEffect(() => {
    const d = new Date();
    setPriceDate(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`);
  }, []);

  // 은총의 파편·고통의 가시·사령의 잔영·죽음의 손은 거래소 미상장이지만 교환 상자
  // 구성품 시세로 환산한 값이 있다 (성당·세르카·벨가르딘 페이지와 동일).
  // 코어는 환산 기준이 없어 0으로 둔다.
  const convertedUnitPrices: Record<string, number> = {
    '은총의 파편': graceUnitPrice,
    '고통의 가시': thornUnitPrice,
    '사령의 잔영': wraithEchoUnitPrice,
    '죽음의 손': handOfDeathUnitPrice,
  };
  const unitPriceOf = (m: MaterialReward): number => {
    const converted = convertedUnitPrices[m.itemName];
    if (converted !== undefined) return converted;
    return m.itemId !== 0 ? unitPrices[m.itemId] || 0 : 0;
  };
  const isPriced = (m: MaterialReward) =>
    m.itemId !== 0 || convertedUnitPrices[m.itemName] !== undefined;

  const valueOf = (materials: MaterialReward[]): number =>
    materials.reduce((sum, m) => sum + unitPriceOf(m) * m.amount, 0);

  // 상단 카드: 레이드(난이도) 전체 관문 합산 더보기 손익 + 손익률
  const summaries = useMemo(() => {
    const map = new Map<string, { profit: number; cost: number; hasData: boolean }>();
    for (const raid of raids) {
      let profit = 0;
      let cost = 0;
      let hasData = false;
      for (const g of raid.gates) {
        const reward = raidRewards.find((r) => r.raidName === raid.name && r.gate === g.gate);
        if (!reward) continue;
        hasData = true;
        cost += g.moreGold;
        profit += valueOf(reward.materials) - g.moreGold;
      }
      map.set(raid.name, { profit, cost, hasData });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitPrices, graceUnitPrice, thornUnitPrice, wraithEchoUnitPrice, handOfDeathUnitPrice]);

  // 하단 카드: 클리어 골드 + 기본 재료 가치 + 더보기 재료 가치 - 더보기 비용 (더보기 포함 총 가치)
  const clearSummaries = useMemo(() => {
    const map = new Map<string, number>();
    for (const raid of raids) {
      let total = 0;
      for (const g of raid.gates) {
        const clear = raidClearRewards.find((r) => r.raidName === raid.name && r.gate === g.gate);
        const more = raidRewards.find((r) => r.raidName === raid.name && r.gate === g.gate);
        total += g.gold + (clear ? valueOf(clear.materials) : 0) + (more ? valueOf(more.materials) : 0) - g.moreGold;
      }
      map.set(raid.name, total);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitPrices, graceUnitPrice, thornUnitPrice, wraithEchoUnitPrice, handOfDeathUnitPrice]);

  // 재료 체크 상태: raid × 구분(기본/더보기) × 관문 × 재료명 단위 (itemId 0인 재료가 여럿이라 itemName으로 구분)
  const [materialChecks, setMaterialChecks] = useState<Record<string, boolean>>({});
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

  // 재료 표 (지평의 성당·세르카 페이지와 동일한 체크박스 + 단가/총가치 표 디자인)
  const renderMaterialTable = (materials: MaterialReward[], raidName: string, type: CheckType, gate: number) => (
    <table className={styles.materialTable}>
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
          const totalPrice = untradable ? 0 : unitPrice * m.amount;
          const icon = MATERIAL_ICONS[m.itemName];
          return (
            <tr key={m.itemName} style={!checked ? { opacity: 0.4 } : undefined}>
              <td>
                <Form.Check
                  type="checkbox"
                  checked={checked}
                  disabled={untradable}
                  onChange={() => toggleMatCheck(raidName, type, gate, m.itemName)}
                  className={styles.materialCheckbox}
                />
              </td>
              <td>
                <div className={styles.materialCell}>
                  {icon && <Image src={icon} alt={m.itemName} width={22} height={22} unoptimized />}
                  <span>{m.itemName}</span>
                </div>
              </td>
              <td>{fmt(m.amount)}</td>
              <td>{untradable ? '-' : loading ? '—' : unitPrice >= 1 ? unitPrice.toFixed(2) : unitPrice.toFixed(4)}</td>
              <td>{untradable ? '-' : loading ? '—' : fmt(totalPrice)}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className={styles.subtotalRow}>
          <td colSpan={4}>재료 가치</td>
          <td>{loading ? '—' : fmt(getCheckedValue(materials, raidName, type, gate))}</td>
        </tr>
      </tfoot>
    </table>
  );

  // 레이드 상세 — 각 섹션 레이아웃 안, 카드 그리드 바로 아래에 펼쳐진다.
  // mode 'more': 더보기 보상·비용·손익만 표시 (상단 더보기 손익 계산 섹션용)
  // mode 'all': 기본 클리어 보상 + 더보기 보상 + 더보기 포함 총 가치 전체 표시 (하단 클리어 보상 섹션용)
  const renderRaidDetail = (raid: Raid, onClose: () => void, mode: 'more' | 'all') => {
    const totalClearGold = raid.gates.reduce((s, g) => s + g.gold, 0);
    const totalMoreGold = raid.gates.reduce((s, g) => s + g.moreGold, 0);
    const totalBasicValue = raid.gates.reduce((s, g) => {
      const clear = raidClearRewards.find((r) => r.raidName === raid.name && r.gate === g.gate);
      return s + (clear ? getCheckedValue(clear.materials, raid.name, 'basic', g.gate) : 0);
    }, 0);
    const totalMoreValue = raid.gates.reduce((s, g) => {
      const more = raidRewards.find((r) => r.raidName === raid.name && r.gate === g.gate);
      return s + (more ? getCheckedValue(more.materials, raid.name, 'more', g.gate) : 0);
    }, 0);
    const finalValue = totalClearGold + totalBasicValue + totalMoreValue - totalMoreGold;

    return (
      <section className={styles.detailPanel}>
        <div className={styles.detailPanelHeader}>
          <div>
            <h2 className={styles.detailTitle}>{raid.name} {mode === 'more' ? '더보기 보상' : '클리어 보상'}</h2>
            <p className={styles.detailLevel}>입장 레벨 {raid.level} 이상</p>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="접기">
            접기
          </button>
        </div>

        {/* 기본 클리어 보상 — 클리어 보상 섹션에서만 표시 */}
        {mode === 'all' && (
        <div className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>기본 클리어 보상</h3>
          <div className={styles.gatesGrid}>
            {raid.gates.map((g) => {
              const clear = raidClearRewards.find((r) => r.raidName === raid.name && r.gate === g.gate);
              const freeGold = g.gold - g.boundGold;
              return (
                <div key={`basic-${g.gate}`} className={styles.gateSection}>
                  <div className={styles.gateHeader}>
                    <span className={styles.gateName}>{g.gate}관문</span>
                  </div>
                  <div className={`${styles.infoRow} ${styles.goldRow}`}>
                    <span className={styles.infoLabel}>클리어 골드</span>
                    <span className={styles.goldValue}>
                      {fmt(g.gold)}
                      {g.boundGold > 0 && (
                        <>
                          {' '}
                          <span className={styles.boundNote}>
                            (귀속 {fmt(g.boundGold)}{freeGold > 0 ? ` · 일반 ${fmt(freeGold)}` : ''})
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  {clear
                    ? renderMaterialTable(clear.materials, raid.name, 'basic', g.gate)
                    : <p className={styles.tbdNote}>출시 후 공개</p>}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* 더보기 보상 */}
        <div className={styles.detailSection}>
          <h3 className={styles.detailSectionTitle}>더보기 보상</h3>
          <div className={styles.gatesGrid}>
            {raid.gates.map((g) => {
              const more = raidRewards.find((r) => r.raidName === raid.name && r.gate === g.gate);
              const moreValue = more ? getCheckedValue(more.materials, raid.name, 'more', g.gate) : 0;
              const profit = moreValue - g.moreGold;
              return (
                <div key={`more-${g.gate}`} className={styles.gateSection}>
                  <div className={styles.gateHeader}>
                    <span className={styles.gateName}>{g.gate}관문 더보기</span>
                  </div>
                  <div className={`${styles.infoRow} ${styles.costRow}`}>
                    <span className={styles.infoLabel}>더보기 비용</span>
                    <span className={styles.costValue}>-{fmt(g.moreGold)}</span>
                  </div>
                  {more
                    ? renderMaterialTable(more.materials, raid.name, 'more', g.gate)
                    : <p className={styles.tbdNote}>보상 구성 출시 후 공개</p>}
                  {more && (
                    <div className={styles.gateTotalRow}>
                      <span>더보기 손익</span>
                      <span style={{ color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {loading ? '…' : `${profit >= 0 ? '+' : ''}${fmt(profit)}`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 더보기 손익 계산 섹션: 더보기 재료 가치 - 비용 = 손익만 요약 */}
        {mode === 'more' && (
        <div className={styles.finalSection}>
          <div className={styles.finalTitle}>더보기 총손익</div>
          <div className={styles.finalGrid}>
            <div className={styles.finalGridItem}>
              <div className={styles.finalLabel}>더보기 재료 가치</div>
              <div className={styles.finalItemValue}>{loading ? '—' : `+${fmt(totalMoreValue)}`}</div>
            </div>
            <div className={styles.finalGridItem}>
              <div className={styles.finalLabel}>더보기 비용</div>
              <div className={styles.finalItemValue} style={{ color: 'var(--color-danger)' }}>-{fmt(totalMoreGold)}</div>
            </div>
            <div className={`${styles.finalGridItem} ${styles.finalTotalRow}`}>
              <div className={styles.finalLabel}>더보기 손익</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <Image src="/gold.webp" alt="골드" width={22} height={22} />
                <span
                  className={styles.finalItemValue}
                  style={{
                    color: totalMoreValue - totalMoreGold >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    fontSize: '1.1rem',
                  }}
                >
                  {loading ? '—' : `${totalMoreValue - totalMoreGold >= 0 ? '+' : ''}${fmt(totalMoreValue - totalMoreGold)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 더보기 포함 총 가치 — 클리어 보상 섹션에서만 표시 */}
        {mode === 'all' && (
        <div className={styles.finalSection}>
          <div className={styles.finalTitle}>더보기 포함 총 가치</div>
          <div className={styles.finalGrid}>
            <div className={styles.finalGridItem}>
              <div className={styles.finalLabel}>클리어 골드</div>
              <div className={styles.finalItemValue} style={{ color: 'var(--color-gold)' }}>{fmt(totalClearGold)}</div>
            </div>
            <div className={styles.finalGridItem}>
              <div className={styles.finalLabel}>기본 재료 가치</div>
              <div className={styles.finalItemValue}>{loading ? '—' : `+${fmt(totalBasicValue)}`}</div>
            </div>
            <div className={styles.finalGridItem}>
              <div className={styles.finalLabel}>더보기 재료 가치</div>
              <div className={styles.finalItemValue}>{loading ? '—' : `+${fmt(totalMoreValue)}`}</div>
            </div>
            <div className={styles.finalGridItem}>
              <div className={styles.finalLabel}>더보기 비용</div>
              <div className={styles.finalItemValue} style={{ color: 'var(--color-danger)' }}>-{fmt(totalMoreGold)}</div>
            </div>
            <div className={`${styles.finalGridItem} ${styles.finalTotalRow}`}>
              <div className={styles.finalLabel}>총 가치</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <Image src="/gold.webp" alt="골드" width={22} height={22} />
                <span className={styles.finalItemValue} style={{ color: 'var(--color-gold)', fontSize: '1.1rem' }}>
                  {loading ? '—' : fmt(finalValue)}
                </span>
              </div>
            </div>
          </div>
        </div>
        )}
      </section>
    );
  };

  const selectedEffRaid = openEff ? raids.find((r) => r.name === openEff) : null;
  const selectedClearRaid = openClear ? raids.find((r) => r.name === openClear) : null;

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <div className={styles.pageWrapper}>
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginTop: 0,
            marginBottom: 0,
          }}>
            더보기 효율 & 레이드 보상 정리
          </h1>
        </div>

        {/* 더보기 손익 계산 섹션 */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>더보기 손익 계산</div>
          <div className={styles.sectionCardBody}>
            <div className={styles.raidGrid}>
              {upcomingRaids.map((raid) => (
                <div key={raid.name} className={`${styles.raidCard} ${styles.upcomingCard}`}>
                  <Image src={raid.image} alt={raid.name} fill sizes="220px" className={styles.raidImg} unoptimized />
                  <div className={styles.raidOverlay} />
                  <div className={styles.raidInfo}>
                    <span className={styles.raidName}>{raid.name}</span>
                    <span className={styles.raidLevel}>Lv. {raid.level}</span>
                    <span className={styles.upcomingLabel}>{raid.releaseLabel}</span>
                  </div>
                </div>
              ))}
              {raids.map((raid) => {
                const s = summaries.get(raid.name);
                const profit = s?.profit ?? 0;
                const cls = profit >= 0 ? styles.profitText : styles.lossText;
                const newLabel = getRaidNewLabel(raid.name);
                return (
                  <button
                    key={raid.name}
                    type="button"
                    className={`${styles.raidCard} ${openEff === raid.name ? styles.raidCardSelected : ''}`}
                    onClick={() => setOpenEff((prev) => (prev === raid.name ? null : raid.name))}
                  >
                    <Image src={raid.image} alt={raid.name} fill sizes="220px" className={styles.raidImg} quality={90} unoptimized />
                    <div className={styles.raidOverlay} />
                    <div className={styles.raidInfo}>
                      {newLabel && <span className={styles.newTag}>{newLabel}</span>}
                      <span className={styles.raidName}>{raid.name}</span>
                      <span className={styles.raidLevel}>Lv. {raid.level}</span>
                      {s?.hasData ? (
                        <span className={`${styles.raidProfit} ${cls}`}>
                          {loading ? '…' : `${profit >= 0 ? '+' : ''}${fmt(profit)}`}
                        </span>
                      ) : (
                        <span className={`${styles.raidProfit} ${styles.tbdText}`}>보상 미정</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className={styles.priceNote}>
              {priceDate && `${priceDate} 평균 거래가 | `}실시간 시세와 차이가 있을 수 있습니다
            </p>

            {selectedEffRaid && renderRaidDetail(selectedEffRaid, () => setOpenEff(null), 'more')}
          </div>
        </div>

        {/* 모바일 띠배너 — 두 섹션 카드 사이. 아래 기존 광고(320×100)와 단위가 겹치면
            애드핏이 첫 자리만 채우므로 인-콘텐츠 단위 순번을 따로 쓴다. */}
        <div className="d-block d-lg-none my-2">
          <AdBanner index={0} />
        </div>

        {/* 데스크톱 728×90 — 두 섹션 카드 사이. 이 페이지의 유일한 데스크톱 애드핏 자리라
            공용 단위(galleryBottomDesktop)를 재사용한다 (리포트는 다른 페이지와 합산). */}
        <DesktopBannerAd adfit={ADFIT_UNITS.galleryBottomDesktop} />

        {/* 레이드 클리어 보상 섹션 */}
        <div className={styles.sectionCard}>
          <div className={`${styles.sectionCardHeader} ${styles.sectionCardHeaderAccent}`}>레이드 클리어 보상</div>
          <div className={styles.sectionCardBody}>
            <div className={styles.raidGrid}>
              {upcomingRaids.map((raid) => (
                <div key={`clear-${raid.name}`} className={`${styles.raidCard} ${styles.upcomingCard}`}>
                  <Image src={raid.image} alt={raid.name} fill sizes="220px" className={styles.raidImg} unoptimized />
                  <div className={styles.raidOverlay} />
                  <div className={styles.raidInfo}>
                    <span className={styles.raidName}>{raid.name}</span>
                    <span className={styles.raidLevel}>Lv. {raid.level}</span>
                    <span className={styles.upcomingLabel}>{raid.releaseLabel}</span>
                  </div>
                </div>
              ))}
              {raids.map((raid) => {
                const total = clearSummaries.get(raid.name) ?? 0;
                const newLabel = getRaidNewLabel(raid.name);
                return (
                  <button
                    key={`clear-${raid.name}`}
                    type="button"
                    className={`${styles.raidCard} ${openClear === raid.name ? styles.raidCardSelected : ''}`}
                    onClick={() => setOpenClear((prev) => (prev === raid.name ? null : raid.name))}
                  >
                    <Image src={raid.image} alt={raid.name} fill sizes="220px" className={styles.raidImg} quality={90} unoptimized />
                    <div className={styles.raidOverlay} />
                    <div className={styles.raidInfo}>
                      {newLabel && <span className={styles.newTag}>{newLabel}</span>}
                      <span className={styles.raidName}>{raid.name}</span>
                      <span className={styles.raidLevel}>Lv. {raid.level}</span>
                      <span className={styles.totalBadge}>
                        {loading ? '…' : `${fmt(total)}G`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className={styles.priceNote}>
              {priceDate && `${priceDate} 평균 거래가 | `}실시간 시세와 차이가 있을 수 있습니다
            </p>

            {selectedClearRaid && renderRaidDetail(selectedClearRaid, () => setOpenClear(null), 'all')}
          </div>
        </div>

        {/* 레이드 클리어 보상 섹션 아래 — 위 경계 자리(index 0)와 다른 단위(단일 단위) */}
        <div className="d-block d-lg-none my-3">
          <AdBanner />
        </div>

        {/* 관련 도구 */}
        <div className={styles.relatedLinks}>
          <Link href="/weekly-gold" className={styles.relatedLink}>주간 골드 계산기</Link>
          <Link href="/cathedral" className={styles.relatedLink}>지평의 성당 보상·교환</Link>
          <Link href="/cerka" className={styles.relatedLink}>세르카 보상·교환</Link>
          <Link href="/belgardin" className={styles.relatedLink}>벨가르딘 보상</Link>
          <Link href="/package" className={styles.relatedLink}>패키지 효율</Link>
        </div>

        {/* 페이지 최하단 — 가이드·FAQ 를 다 읽고 내려온 자리(세 번째 모바일 단위) +
            이 페이지의 두 번째 데스크톱 자리. 둘 다 위 자리들과 다른 단위여야 한다 */}
        <div className="d-block d-lg-none mt-3">
          <AdBanner index={1} />
        </div>
        <DesktopBannerAd adfit={ADFIT_UNITS.refiningResultDesktop} />
      </div>
    </Container>
  );
}
