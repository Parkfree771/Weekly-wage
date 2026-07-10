'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import { raids, upcomingRaids } from '@/data/raids';
import { raidRewards, type MaterialReward } from '@/data/raidRewards';
import { raidClearRewards } from '@/data/raidClearRewards';
import { PriceProvider, usePriceData } from '@/contexts/PriceContext';
import GuideFaq from '@/components/common/GuideFaq';
import AdBanner from '@/components/ads/AdBanner';
import { faqData } from './faq-data';
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
};

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

export default function MoreRewardPage() {
  return (
    <PriceProvider>
      <MoreRewardInner />
    </PriceProvider>
  );
}

function MoreRewardInner() {
  const { unitPrices, loading } = usePriceData();
  // 열려 있는 레이드 상세 (null = 닫힘). 같은 카드 재클릭·백드롭 클릭으로 닫는다.
  const [openName, setOpenName] = useState<string | null>(null);

  // 시세 기준일 — SSR/클라이언트 불일치 방지 위해 마운트 후 표시
  const [priceDate, setPriceDate] = useState('');
  useEffect(() => {
    const d = new Date();
    setPriceDate(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`);
  }, []);

  // 거래 가능 재료만 시세 합산 (itemId 0 = 거래불가 → 가치 계산 제외)
  const valueOf = (materials: MaterialReward[]): number =>
    materials.reduce((sum, m) => sum + (m.itemId !== 0 ? (unitPrices[m.itemId] || 0) * m.amount : 0), 0);

  // 카드별 요약: 레이드(난이도) 전체 관문 합산 더보기 손익 + 손익률
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
  }, [unitPrices]);

  const selectedRaid = openName ? raids.find((r) => r.name === openName) : null;

  const handleSelect = (name: string) => {
    setOpenName((prev) => (prev === name ? null : name));
  };

  const renderMaterials = (materials: MaterialReward[]) => (
    <div className={styles.matList}>
      {materials.map((m) => {
        const untradable = m.itemId === 0;
        const icon = MATERIAL_ICONS[m.itemName];
        return (
          <span
            key={m.itemName}
            className={`${styles.matItem} ${untradable ? styles.matUntradable : ''}`}
            title={untradable ? `${m.itemName} (거래불가 — 손익 계산 제외)` : m.itemName}
          >
            {icon && (
              <Image src={icon} alt={m.itemName} width={20} height={20} className={styles.matIcon} unoptimized />
            )}
            <span className={styles.matAmount}>{fmt(m.amount)}</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <div className={styles.pageWrapper}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>로아 더보기 효율</h1>
          <p className={styles.pageSubtitle}>
            레이드별 더보기 비용과 보상 재료를 실시간 거래소 시세로 환산한 더보기 손익입니다.
            카드를 누르면 관문별 더보기 효율과 클리어 보상 상세를 확인할 수 있습니다.
          </p>
        </header>

        <div className={styles.sectionBar}>더보기 손익 계산</div>

        {/* 레이드 카드 그리드 */}
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
            const rate = s && s.cost > 0 ? (profit / s.cost) * 100 : 0;
            const cls = profit >= 0 ? styles.profitText : styles.lossText;
            return (
              <button
                key={raid.name}
                type="button"
                className={`${styles.raidCard} ${openName === raid.name ? styles.raidCardSelected : ''}`}
                onClick={() => handleSelect(raid.name)}
              >
                <Image src={raid.image} alt={raid.name} fill sizes="220px" className={styles.raidImg} quality={90} unoptimized />
                <div className={styles.raidOverlay} />
                <div className={styles.raidInfo}>
                  <span className={styles.raidName}>{raid.name}</span>
                  <span className={styles.raidLevel}>Lv. {raid.level}</span>
                  <span className={`${styles.raidProfit} ${cls}`}>
                    {loading ? '…' : `${profit >= 0 ? '+' : ''}${fmt(profit)}`}
                  </span>
                  <span className={`${styles.raidProfitRate} ${cls}`}>
                    {loading ? '' : `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className={styles.priceNote}>
          {priceDate && `${priceDate} 평균 거래가 | `}실시간 시세와 차이가 있을 수 있습니다
        </p>

        {/* 선택 레이드 상세 모달 — 1) 더보기 효율  2) 클리어 보상
            백드롭(빈 공간) 클릭 시 닫힘, 카드 재클릭도 토글로 닫힘 */}
        {selectedRaid && (
        <div className={styles.modalBackdrop} onClick={() => setOpenName(null)}>
          <section className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setOpenName(null)}
              aria-label="닫기"
            >
              닫기
            </button>
            <h2 className={styles.detailTitle}>{selectedRaid.name}</h2>
            <p className={styles.detailLevel}>입장 레벨 {selectedRaid.level} 이상</p>

            {/* 1. 더보기 효율: 더보기 골드 vs 재료 가치 */}
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>더보기 효율</h3>
              <div className={styles.tableWrap}>
                <table className={styles.detailTable}>
                  <thead>
                    <tr>
                      <th>관문</th>
                      <th className={styles.num}>더보기 비용</th>
                      <th>더보기 보상 재료</th>
                      <th className={styles.num}>재료 가치</th>
                      <th className={styles.num}>손익</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRaid.gates.map((g) => {
                      const more = raidRewards.find(
                        (r) => r.raidName === selectedRaid.name && r.gate === g.gate,
                      );
                      const value = more ? valueOf(more.materials) : 0;
                      const profit = value - g.moreGold;
                      return (
                        <tr key={g.gate}>
                          <td className={styles.gateCell}>{g.gate}관문</td>
                          <td className={styles.num}>-{fmt(g.moreGold)}G</td>
                          <td>{more ? renderMaterials(more.materials) : <span className={styles.tbdNote}>출시 후 공개</span>}</td>
                          <td className={styles.num}>{more ? (loading ? '…' : `${fmt(value)}G`) : '-'}</td>
                          <td className={`${styles.num} ${more ? (profit >= 0 ? styles.profit : styles.loss) : ''}`}>
                            {more ? (loading ? '…' : `${profit >= 0 ? '+' : ''}${fmt(profit)}G`) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {(() => {
                      const s = summaries.get(selectedRaid.name);
                      if (!s?.hasData) return null;
                      const rate = s.cost > 0 ? (s.profit / s.cost) * 100 : 0;
                      return (
                        <tr className={styles.totalRow}>
                          <td>합계</td>
                          <td className={styles.num}>-{fmt(s.cost)}G</td>
                          <td></td>
                          <td className={styles.num}>{loading ? '…' : `${fmt(s.cost + s.profit)}G`}</td>
                          <td className={`${styles.num} ${s.profit >= 0 ? styles.profit : styles.loss}`}>
                            {loading ? '…' : `${s.profit >= 0 ? '+' : ''}${fmt(s.profit)}G (${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%)`}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. 클리어 보상: 클리어 보상 + 더보기 보상 전체 */}
            <div className={styles.detailSection}>
              <h3 className={styles.detailSectionTitle}>클리어 보상</h3>
              <div className={styles.tableWrap}>
                <table className={styles.detailTable}>
                  <thead>
                    <tr>
                      <th>관문</th>
                      <th>구분</th>
                      <th className={styles.num}>골드</th>
                      <th>보상 재료</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRaid.gates.map((g) => {
                      const clear = raidClearRewards.find(
                        (r) => r.raidName === selectedRaid.name && r.gate === g.gate,
                      );
                      const more = raidRewards.find(
                        (r) => r.raidName === selectedRaid.name && r.gate === g.gate,
                      );
                      const freeGold = g.gold - g.boundGold;
                      return (
                        <MoreRewardClearRows
                          key={g.gate}
                          gate={g.gate}
                          gold={g.gold}
                          freeGold={freeGold}
                          boundGold={g.boundGold}
                          moreGold={g.moreGold}
                          clearMaterials={clear?.materials}
                          moreMaterials={more?.materials}
                          renderMaterials={renderMaterials}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
        )}

        <AdBanner slot="8616653628" />

        {/* 관련 도구 */}
        <div className={styles.relatedLinks}>
          <Link href="/weekly-gold" className={styles.relatedLink}>주간 골드 계산기</Link>
          <Link href="/cathedral" className={styles.relatedLink}>지평의 성당 보상·교환</Link>
          <Link href="/cerka" className={styles.relatedLink}>세르카 보상·교환</Link>
          <Link href="/belgardin" className={styles.relatedLink}>벨가르딘 보상</Link>
          <Link href="/package" className={styles.relatedLink}>패키지 효율</Link>
        </div>

        <GuideFaq
          guideTitle="더보기 효율 이용 가이드"
          sections={[
            {
              heading: '더보기 손익은 이렇게 계산됩니다',
              paragraphs: [
                '레이드 관문을 클리어하면 골드를 추가로 지불하고 재련 재료를 더 받는 더보기 선택지가 열립니다. 이 페이지는 관문별 더보기로 받는 파괴석·수호석, 돌파석, 운명의 파편 같은 재료 전체를 현재 거래소 평균 시세로 환산한 총 가치에서 더보기 비용을 뺀 손익을 보여줍니다. 카드의 숫자가 양수(초록)면 더보기를 사는 것이 재료를 거래소에서 직접 사는 것보다 이득이고, 음수(빨강)면 골드를 아끼고 필요한 재료만 따로 사는 편이 낫다는 뜻입니다.',
                '시세는 매시간 자동으로 갱신되므로 레이드를 돌기 전에 확인하면 그 시점 기준으로 가장 정확한 판단을 할 수 있습니다. 은총의 파편, 코어, 고통의 가시처럼 거래소에서 거래할 수 없는 재료는 시세가 없어 손익 계산에서 제외되며, 반투명하게 표시됩니다. 이런 귀속 재료가 필요한 캐릭터라면 표시된 손익보다 실질 가치는 더 높게 봐야 합니다.',
              ],
            },
            {
              heading: '더보기 효율과 클리어 보상, 두 단락으로 나눈 이유',
              paragraphs: [
                '카드를 누르면 두 가지 정보가 나옵니다. 더보기 효율 단락은 관문별 더보기 비용과 재료 가치를 비교해 지금 더보기를 사는 게 이득인지 알려주고, 클리어 보상 단락은 관문을 깨면 무조건 받는 클리어 골드·재료와 더보기로 받는 재료를 모두 정리해 레이드 한 번에 나오는 보상 전체를 보여줍니다. 클리어 골드에는 자유롭게 거래할 수 있는 일반 골드와 캐릭터에 묶이는 귀속 골드가 섞여 있어서, 표에서는 귀속 비중을 함께 표기합니다.',
              ],
            },
            {
              heading: '지원 레이드',
              paragraphs: [
                '지평의 성당 1~3단계, 세르카(노말·하드·나메), 카제로스 레이드 종막·4막·3막·2막·1막·서막, 베히모스까지 현재 서비스 중인 레이드 전체를 지원합니다. 2026년 8월 5일 출시 예정인 벨가르딘(노말 1750 · 하드 1770 · 나메 1780)은 공개된 관문별 클리어 골드와 더보기 비용을 먼저 반영했고, 더보기 보상 재료 구성은 출시 직후 확인되는 대로 업데이트합니다.',
                '내 원정대 기준으로 캐릭터별 레이드 조합과 주간 수익을 계산하고 싶다면 주간 골드 계산기를, 은총의 파편 교환 효율은 지평의 성당 페이지를 함께 이용해보세요.',
              ],
            },
          ]}
          faqs={faqData}
        />
      </div>
    </Container>
  );
}

// 클리어 보상 표: 관문 하나 = 클리어 행 + 더보기 행 (두 보상 모두 표시)
function MoreRewardClearRows({
  gate,
  gold,
  freeGold,
  boundGold,
  moreGold,
  clearMaterials,
  moreMaterials,
  renderMaterials,
}: {
  gate: number;
  gold: number;
  freeGold: number;
  boundGold: number;
  moreGold: number;
  clearMaterials?: MaterialReward[];
  moreMaterials?: MaterialReward[];
  renderMaterials: (m: MaterialReward[]) => React.ReactNode;
}) {
  return (
    <>
      <tr>
        <td className={styles.gateCell} rowSpan={2}>{gate}관문</td>
        <td className={styles.kindCell}>클리어</td>
        <td className={styles.num}>
          +{fmt(gold)}G
          {boundGold > 0 && (
            <>
              {' '}
              <span className={styles.boundNote}>
                (귀속 {fmt(boundGold)}{freeGold > 0 ? ` · 일반 ${fmt(freeGold)}` : ''})
              </span>
            </>
          )}
        </td>
        <td>{clearMaterials ? renderMaterials(clearMaterials) : <span className={styles.tbdNote}>출시 후 공개</span>}</td>
      </tr>
      <tr>
        <td className={styles.kindCell}>더보기</td>
        <td className={styles.num}>-{fmt(moreGold)}G</td>
        <td>{moreMaterials ? renderMaterials(moreMaterials) : <span className={styles.tbdNote}>보상 구성 출시 후 공개</span>}</td>
      </tr>
    </>
  );
}
