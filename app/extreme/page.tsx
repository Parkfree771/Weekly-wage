'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Card } from 'react-bootstrap';
import styles from '../cathedral/cathedral.module.css';
import GuideFaq from '@/components/common/GuideFaq';
import AdBanner from '@/components/ads/AdBanner';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import { ADFIT_UNITS } from '@/components/ads/adConfig';
import NewLottie from '@/components/NewLottie';
import { faqData } from './faq-data';

// ─────────────────────────────────────────────────────────────────────────
// 카제로스 레이드 3막·종막 익스트림 — 출처: 공식 GM노트 1226 (2026-09-18)
// https://lostark.game.onstove.com/News/GMNote/Views/1226
// 수치는 전부 그 글의 본문·첨부 이미지에서 그대로 옮겼다. 제작소는 첨부된 제작 화면 캡쳐에서
// 비용이 읽히는 두 항목만 싣고, 나머지는 공개되는 대로 채운다.
// 화면 구조는 세르카·벨가르딘과 같다 — 카드 3장(난이도) → 클릭하면 아래 상세 → 상점(제작소).
// ─────────────────────────────────────────────────────────────────────────

const RAID_IMAGE = '/extreme-mordum-kazeroth.webp';

// ─── 막 ───
type Act = {
  key: 'act3' | 'final';
  label: string;          // 3막 · 모르둠
  period: string;
  weeks: number;
  coin: { name: string; short: string; icon: string };
  /** 나이트메어 최초 클리어 전설 칭호 — 이름이 로고 그림 안에 있어 텍스트로 따로 내지 않는다 */
  title: { name: string; logo: string };
  /** 주간 골드 계산기·보상표(data/rewardTable)가 쓰는 그 레이드의 정사각 그림 — 칭호 옆에 붙여 막을 구분한다 */
  raidImage: string;
};

const ACTS: Act[] = [
  {
    key: 'act3',
    label: '3막 · 모르둠',
    period: '9/23 (수) 점검 후 ~ 10/21 (수) 점검 전',
    weeks: 4,
    coin: { name: '뇌전의 주화', short: '뇌전', icon: '/coin-lightning.webp?v=2' },
    title: { name: '뇌전의 군주', logo: '/extreme-title-lightning.webp?v=4' },
    raidImage: '/ivory-tower.webp',
  },
  {
    key: 'final',
    label: '종막 · 카제로스',
    period: '10/21 (수) 점검 후 ~ 11/18 (수) 점검 전',
    weeks: 4,
    coin: { name: '빛과 어둠의 주화', short: '빛과 어둠', icon: '/coin-light-dark.webp?v=2' },
    title: { name: '파멸의 군주', logo: '/extreme-title-ruin.webp?v=4' },
    raidImage: '/abrelshud.webp',
  },
];

const CHAOS_COIN = { name: '혼돈의 주화', short: '혼돈', icon: '/coin-chaos.webp?v=2' };
const TOTAL_WEEKS = ACTS.reduce((s, a) => s + a.weeks, 0);

// ─── 난이도 ───
type Stage = {
  name: string;
  /** 카드 배지에 쓰는 짧은 난이도명 */
  diff: string;
  /** 사이트 공통 난이도 색 — 주간 골드(weekly-gold.module.css 난이도 배지)와 같은 값. 채운 배경 + 흰 글씨 */
  diffColor: string;
  level: number;
  /** 매주 원정대 1회 */
  gold: number;
  coins: number;
  revive: string;
  nightmare: boolean;
};

const STAGES: Stage[] = [
  { name: '익스트림 나이트메어', diff: '나이트메어', diffColor: '#7e22ce',            level: 1780, gold: 50000, coins: 200, revive: '부활 불가',      nightmare: true },
  { name: '익스트림 하드',       diff: '하드',       diffColor: 'var(--color-accent)', level: 1770, gold: 50000, coins: 200, revive: '부활 제한 없음', nightmare: false },
  { name: '익스트림 노말',       diff: '노말',       diffColor: '#eab308',            level: 1730, gold: 20000, coins: 150, revive: '부활 제한 없음', nightmare: false },
];

// 최초 클리어 보상 — 난이도와 관계없이 3막·종막을 각각 처음 클리어할 때 1회.
// 전용 주화 100개는 막마다 다르므로(뇌전/빛과 어둠) 표에서 막별로 붙인다.
const FIRST_CLEAR_COMMON = [
  { name: '도약의 전설 카드 선택 팩 II', icon: '/legendary-cardpack.webp', amount: 1 },
  { name: '영웅 젬 선택 상자',           icon: '/gem-hero.webp',           amount: 1 },
  { name: '젬 가공 초기화권',            icon: '/gem-reset-ticket.webp',   amount: 1 },
  { name: CHAOS_COIN.name,              icon: CHAOS_COIN.icon,            amount: 1 },
];
const FIRST_CLEAR_ACT_COINS = 100;
const NIGHTMARE_TITLE_GOLD = 200000;

// ─── 카제로스 익스트림 제작소 — GM노트 첨부 캡쳐에서 비용이 확인된 항목 ───
type ShopItem = {
  id: number;
  name: string;
  act: Act;
  image: string;
  requiredLevel: number;
  limitLabel: string;
  costs: { name: string; icon: string; amount: number }[];
  gold: number;
  note?: string;
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 1,
    name: '고대 코어 랜덤 상자',
    act: ACTS[0],
    image: '/rheozhdj.webp',
    requiredLevel: 1770,
    limitLabel: '원정대 2회',
    costs: [{ name: '뇌전의 주화', icon: '/coin-lightning.webp?v=2', amount: 100 }],
    gold: 50000,
  },
  {
    id: 2,
    name: '고대 코어 선택 상자',
    act: ACTS[1],
    image: '/rheozhdj.webp',
    requiredLevel: 1780,
    limitLabel: '원정대 1회',
    costs: [
      { name: '혼돈의 주화', icon: '/coin-chaos.webp?v=2', amount: 2 },
      { name: '빛과 어둠의 주화', icon: '/coin-light-dark.webp?v=2', amount: 100 },
    ],
    gold: 200000,
    note: '혼돈의 주화는 3막·종막 최초 클리어 때 1개씩만 나온다 — 두 막을 모두 클리어해야 2개가 모여 이 상자를 만들 수 있다.',
  },
];

// 캡쳐의 제작 목록에 이름만 보이는 항목 (비용·제한 미공개)
const SHOP_PENDING = [
  { group: '특수 제작 · 3막', items: '유물 각인서 랜덤 주머니 · 유물 전투 각인서 선택 주머니' },
  { group: '젬 제작 · 3막', items: '젬 선택 상자 등' },
  { group: '성장 재료 제작 · 3막', items: '재련 재료 · 지옥 열쇠 등' },
  { group: '특수 제작 · 종막', items: '고대 코어 랜덤 상자 (비용 미확인)' },
];

const COIN_EXPIRE = '2026년 11월 25일 (수) 06:00';

export default function ExtremePage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedShopItem, setSelectedShopItem] = useState<number | null>(1);

  const selectedStageData = STAGES.find((s) => s.name === selectedStage);
  const selectedShopData = SHOP_ITEMS.find((s) => s.id === selectedShopItem);

  return (
    <div className={styles.pageThemeExtreme} style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 타이틀 */}
            <div className="text-center mb-2">
              <h1 style={{
                fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: 0,
                marginBottom: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}>
                익스트림
                <NewLottie size={30} />
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                3막 모르둠 · 종막 카제로스 난이도별 클리어 보상과 제작소 — {ACTS[0].period.split(' 점검')[0]} ~ {ACTS[1].period.split(' ~ ')[1].split(' 점검')[0]}
              </p>
            </div>

            {/* 3개 난이도 이미지 카드 */}
            <div className={styles.raidCardsGrid}>
              {STAGES.map((stage, index) => {
                const isSelected = selectedStage === stage.name;
                return (
                  <div
                    key={stage.name}
                    className={`${styles.raidCard} ${isSelected ? styles.selected : ''}`}
                    onClick={() => setSelectedStage(isSelected ? null : stage.name)}
                  >
                    <div className={styles.imageWrapper}>
                      <Image
                        src={RAID_IMAGE}
                        alt={stage.name}
                        fill
                        className={styles.raidImage}
                        sizes="(max-width: 576px) 100vw, (max-width: 768px) 33vw, 330px"
                        priority={index < 3}
                      />
                      <div className={styles.overlay} />
                    </div>
                    {/* 왼쪽 2줄: 난이도 배지 / 레벨 — 오른쪽 2줄: 골드 / 주화 (매주 원정대 1회) */}
                    <div className={styles.exCardBar} style={{ '--ex-diff': stage.diffColor } as React.CSSProperties}>
                      <div className={styles.exCardLeft}>
                        <h3 className={styles.exDiffBadge}>{stage.diff}</h3>
                        <p className={styles.exCardLevel}>Lv. {stage.level}</p>
                      </div>
                      <div className={styles.exCardRight}>
                        <div className={styles.exCardGold}>
                          <Image src="/gold.webp" alt="골드" width={16} height={16} />
                          <span>{stage.gold.toLocaleString()}</span>
                        </div>
                        <div className={styles.exCardCoins}>
                          <span className={styles.exCoinPair}>
                            <Image src={ACTS[0].coin.icon} alt={ACTS[0].coin.name} width={16} height={16} />
                            <Image src={ACTS[1].coin.icon} alt={ACTS[1].coin.name} width={16} height={16} />
                          </span>
                          <span>주화 {stage.coins}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 선택한 난이도 상세 — 표 반복 대신 아이콘 타일. 3막·종막은 내용이 같아 두 번 쓰지 않고
                주화만 막 태그(3막/종막)로 구분한다. 골드·주화·칭호가 한눈에 들어오게. */}
            {selectedStageData && (() => {
              const st = selectedStageData;
              const weeklyGoldTotal = st.gold * TOTAL_WEEKS;
              const titleGoldTotal = st.nightmare ? NIGHTMARE_TITLE_GOLD * ACTS.length : 0;
              const finalGold = weeklyGoldTotal + titleGoldTotal;
              const coinsPerAct = (act: Act) => st.coins * act.weeks + FIRST_CLEAR_ACT_COINS;
              const actTag = (act: Act) => act.label.split(' · ')[0];

              return (
              <div className={styles.rewardWide}>
              <Card className={styles.detailCard}>
                <Card.Header className={`${styles.detailHeader} ${styles.exHeadRow}`}>
                  <span className={styles.exHeadTitle}>
                    <span className={styles.exHeadBadge} style={{ '--ex-diff': st.diffColor } as React.CSSProperties}>{st.diff}</span>
                    클리어 보상
                  </span>
                  <span className={styles.exHeadMeta}>Lv. {st.level} · {st.revive}</span>
                </Card.Header>
                <Card.Body className={styles.detailBody}>
                  {/* 막 일정 — 한 줄 */}
                  <p className={styles.exActLine}>
                    {ACTS.map((act, i) => (
                      <span key={act.key}>{i > 0 && <span className={styles.exActSep}>|</span>}<b>{act.label}</b> {act.period}</span>
                    ))}
                  </p>

                  {/* 1. 매주 클리어 */}
                  <div className={styles.sectionTitle}>매주 클리어 <span className={styles.exSectionNote}>원정대 주 1회</span></div>
                  <div className={styles.exTileGrid}>
                    <div className={`${styles.exTile} ${styles.exTileGold}`}>
                      <Image src="/gold.webp" alt="" width={44} height={44} className={styles.exTileIcon} />
                      <span className={styles.exTileName}>골드</span>
                      <span className={styles.exTileAmount}>{st.gold.toLocaleString()}</span>
                    </div>
                    {ACTS.map((act) => (
                      <div key={`w-${act.key}`} className={styles.exTile}>
                        <span className={styles.exTileTag}>{actTag(act)}</span>
                        <Image src={act.coin.icon} alt="" width={44} height={44} className={`${styles.exTileIcon} ${styles.exTileIconRound}`} />
                        <span className={styles.exTileName}>{act.coin.name}</span>
                        <span className={styles.exTileAmount}>x{st.coins}</span>
                      </div>
                    ))}
                  </div>

                  {/* 2. 최초 클리어 */}
                  <div className={styles.sectionTitle} style={{ marginTop: '1.25rem' }}>최초 클리어 <span className={styles.exSectionNote}>막마다 1회 · 난이도 무관</span></div>
                  <div className={styles.exTileGrid}>
                    {FIRST_CLEAR_COMMON.map((it) => (
                      <div key={it.name} className={styles.exTile}>
                        <Image src={it.icon} alt="" width={44} height={44} className={`${styles.exTileIcon} ${it.icon === CHAOS_COIN.icon ? styles.exTileIconRound : ''}`} />
                        <span className={styles.exTileName}>{it.name}</span>
                        <span className={styles.exTileAmount}>x{it.amount}</span>
                      </div>
                    ))}
                    {ACTS.map((act) => (
                      <div key={`f-${act.key}`} className={styles.exTile}>
                        <span className={styles.exTileTag}>{actTag(act)}</span>
                        <Image src={act.coin.icon} alt="" width={44} height={44} className={`${styles.exTileIcon} ${styles.exTileIconRound}`} />
                        <span className={styles.exTileName}>{act.coin.name}</span>
                        <span className={styles.exTileAmount}>x{FIRST_CLEAR_ACT_COINS}</span>
                      </div>
                    ))}
                  </div>

                  {/* 3. 나이트메어 추가 */}
                  {st.nightmare && (
                    <>
                      <div className={styles.sectionTitle} style={{ marginTop: '1.25rem' }}>나이트메어 추가 <span className={styles.exSectionNote}>최초 클리어 · 막마다</span></div>
                      <div className={styles.exNmBox}>
                      <div className={styles.exTileGrid}>
                        {ACTS.map((act) => (
                          <div key={`t-${act.key}`} className={`${styles.exTile} ${styles.exTileWide} ${styles.exTileTitle}`}>
                            {/* 레이드 그림(주간 골드 계산기와 같은 파일)을 타일 가득 깔고, 아래쪽에 칭호 로고를 겹친다.
                                막 구분은 배지 대신 이 그림으로. 칭호는 로고와 이름이 한 그림 — 이름을 따로 쓰지 않는다 */}
                            <Image src={act.raidImage} alt={act.label} fill sizes="(max-width: 576px) 100vw, 320px" className={styles.exTileRaid} />
                            <div className={styles.exTitleOverlay}>
                              <Image src={act.title.logo} alt={`전설 칭호 ${act.title.name}`} width={744} height={153} className={styles.exTileLogo} />
                            </div>
                          </div>
                        ))}
                        <div className={`${styles.exTile} ${styles.exTileGold}`}>
                          <Image src="/gold.webp" alt="" width={44} height={44} className={styles.exTileIcon} />
                          <span className={styles.exTileName}>골드 (막마다)</span>
                          <span className={styles.exTileAmount}>{NIGHTMARE_TITLE_GOLD.toLocaleString()}</span>
                        </div>
                        <div className={styles.exTile}>
                          <span className={styles.exTileIconText}>EMO</span>
                          <span className={styles.exTileName}>특별 이모티콘</span>
                          <span className={styles.exTileAmount}>x1</span>
                        </div>
                      </div>
                      </div>
                    </>
                  )}

                  {/* 4. 합계 */}
                  <div className={styles.finalSection} style={{ marginTop: '1.25rem' }}>
                    <div className={styles.finalTitle}>{TOTAL_WEEKS}주 합계 (3막 {ACTS[0].weeks}주 + 종막 {ACTS[1].weeks}주 · 같은 난이도로 진행 시)</div>
                    <div className={styles.finalGrid}>
                      <div className={styles.finalGridItem}>
                        <div className={styles.finalLabel}>클리어 골드 {TOTAL_WEEKS}주</div>
                        <div className={`${styles.finalItemValue} ${styles.exFinalVal}`} style={{ color: '#c9a84c' }}>
                          <Image src="/gold.webp" alt="" width={16} height={16} />{weeklyGoldTotal.toLocaleString()}
                        </div>
                      </div>
                      <div className={styles.finalGridItem}>
                        <div className={styles.finalLabel}>나메 칭호 골드 x{ACTS.length}</div>
                        <div className={`${styles.finalItemValue} ${styles.exFinalVal}`} style={{ color: st.nightmare ? '#c9a84c' : undefined }}>
                          {st.nightmare ? <><Image src="/gold.webp" alt="" width={16} height={16} />+{titleGoldTotal.toLocaleString()}</> : '-'}
                        </div>
                      </div>
                      {ACTS.map((act) => (
                        <div key={`sum-${act.key}`} className={styles.finalGridItem}>
                          <div className={styles.finalLabel}>{act.coin.name}</div>
                          <div className={`${styles.finalItemValue} ${styles.exFinalVal}`}>
                            <Image src={act.coin.icon} alt="" width={16} height={16} style={{ borderRadius: '50%' }} />{coinsPerAct(act).toLocaleString()}개
                          </div>
                          <span className={styles.exFormula}>{st.coins} x {act.weeks}주 + 최초 {FIRST_CLEAR_ACT_COINS}</span>
                        </div>
                      ))}
                      <div className={styles.finalGridItem} style={{ gridColumn: '1 / -1', borderTop: '2px solid rgba(201, 168, 76, 0.3)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                        <div className={styles.finalLabel}>총 골드 {st.nightmare ? `(클리어 ${TOTAL_WEEKS}주 + 칭호 ${ACTS.length}막)` : `(클리어 ${TOTAL_WEEKS}주)`}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          <Image src="/gold.webp" alt="골드" width={24} height={24} />
                          <span className={styles.finalItemValue} style={{ color: '#c9a84c', fontSize: '1.15rem' }}>{finalGold.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
              </div>
              );
            })()}

            {/* 카제로스 익스트림 제작소 */}
            <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
              <Card className={styles.shopCard}>
                <Card.Header className={styles.shopCardHeader}>
                  <h3 className={styles.shopCardTitle}>
                    카제로스 익스트림 제작소
                  </h3>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className={styles.shopContainer}>
                    <div className={styles.shopList}>
                      <div className={styles.shopListHeader}>
                        제작 목록 (공식 캡쳐에서 확인된 항목)
                      </div>
                      {SHOP_ITEMS.map((item) => {
                        const isActive = selectedShopItem === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`${styles.shopItem} ${isActive ? styles.active : ''}`}
                            onClick={() => setSelectedShopItem(isActive ? null : item.id)}
                          >
                            <div className={styles.shopItemIconFill}>
                              <Image src={item.image} alt="" width={52} height={52} style={{ borderRadius: '6px', objectFit: 'cover', width: '100%', height: '100%' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span className={styles.shopItemName} style={{ display: 'block' }}>
                                {item.name}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', flexWrap: 'wrap' }}>
                                <span
                                  className={styles.limitBadge}
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.1rem 0.35rem',
                                    color: 'var(--rd-line)',
                                    background: 'var(--rd-head-soft)',
                                    border: '1px solid var(--rd-line)',
                                  }}
                                >
                                  {item.act.label.split(' · ')[0]}
                                </span>
                                <span
                                  className={styles.limitBadge}
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.1rem 0.35rem',
                                    color: '#3a7bb8',
                                    background: '#3a7bb818',
                                    border: '1px solid #3a7bb840',
                                  }}
                                >
                                  {item.limitLabel}
                                </span>
                              </div>
                            </div>
                            <div className={`${styles.shopItemCostBadge} ${styles.exShopCosts}`}>
                              {item.costs.map((cost) => (
                                <span key={cost.name} className={styles.shopItemCostValue} style={{ color: 'var(--ct-text)' }}>
                                  <Image src={cost.icon} alt={cost.name} width={14} height={14} style={{ borderRadius: '50%' }} />
                                  {cost.amount}
                                </span>
                              ))}
                              <span className={styles.shopItemCostValue}>
                                <Image src="/gold.webp" alt="" width={14} height={14} />
                                {item.gold.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {/* 이름만 공개된 항목 */}
                      <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.78rem', color: 'var(--ct-text-muted)', lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 700, color: 'var(--ct-text-secondary)', marginBottom: '0.2rem' }}>비용 미공개 (목록에만 보임)</div>
                        {SHOP_PENDING.map((p) => (
                          <div key={p.group}><strong style={{ fontWeight: 700 }}>{p.group}</strong> — {p.items}</div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.shopDetail}>
                      {selectedShopData ? (() => {
                        const sd = selectedShopData;
                        return (
                          <div className={styles.shopDetailContent}>
                            {/* 1. 아이콘 + 이름 */}
                            <div className={styles.shopDetailTop}>
                              <div className={styles.shopDetailIconFill}>
                                <Image src={sd.image} alt="" width={130} height={130} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                              </div>
                              <div className={styles.shopDetailName}>{sd.name}</div>
                            </div>

                            {/* 2. 레벨 + 한도 + 막 */}
                            <div className={styles.shopCompactInfo}>
                              <span className={styles.shopCompactItem} style={{ color: 'var(--rd-line)' }}>
                                Lv.{sd.requiredLevel}
                              </span>
                              <span className={styles.shopCompactDivider}>·</span>
                              <span
                                className={styles.limitBadge}
                                style={{ color: '#3a7bb8', background: '#3a7bb818', border: '1px solid #3a7bb840' }}
                              >
                                {sd.limitLabel}
                              </span>
                              <span className={styles.shopCompactDivider}>·</span>
                              <span
                                className={styles.limitBadge}
                                style={{ color: 'var(--rd-line)', background: 'var(--rd-head-soft)', border: '1px solid var(--rd-line)' }}
                              >
                                {sd.act.label}
                              </span>
                            </div>

                            {/* 3. 제작 비용 */}
                            <div className={styles.shopDetailSection}>
                              <div className={styles.shopDetailSectionTitle}>제작 비용</div>
                              <div className={styles.shopDetailCostList}>
                                {sd.costs.map((cost) => (
                                  <div key={cost.name} className={styles.shopDetailCostItem}>
                                    <Image src={cost.icon} alt={cost.name} width={24} height={24} style={{ borderRadius: '50%' }} />
                                    <span className={styles.costName}>{cost.name} </span>
                                    <span className={styles.costShortName}>{cost.name === CHAOS_COIN.name ? '혼돈 ' : cost.name === ACTS[0].coin.name ? '뇌전 ' : '빛과 어둠 '}</span>
                                    <span>{cost.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className={styles.shopDetailCostItem}>
                                  <Image src="/gold.webp" alt="골드" width={24} height={24} />
                                  <span>{sd.gold.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* 4. 주화 모으기 — 이 상자에 필요한 주화를 어디서 몇 개 받는지 */}
                            <div className={styles.shopDetailSection}>
                              <div className={styles.shopDetailSectionTitle}>주화 획득</div>
                              <table className={styles.materialTable} style={{ marginBottom: '0.5rem' }}>
                                <thead>
                                  <tr>
                                    <th></th>
                                    <th>획득 경로</th>
                                    <th>수량</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td><Image src={sd.act.coin.icon} alt="" width={22} height={22} style={{ borderRadius: '50%', display: 'block', margin: '0 auto' }} /></td>
                                    <td><div className={styles.materialCell}><span>{sd.act.coin.short} — 매주 클리어 (노말~나메)</span></div></td>
                                    <td>{STAGES[2].coins} ~ {STAGES[0].coins}</td>
                                  </tr>
                                  <tr>
                                    <td><Image src={sd.act.coin.icon} alt="" width={22} height={22} style={{ borderRadius: '50%', display: 'block', margin: '0 auto' }} /></td>
                                    <td><div className={styles.materialCell}><span>{sd.act.coin.short} — 최초 클리어</span></div></td>
                                    <td>{FIRST_CLEAR_ACT_COINS}</td>
                                  </tr>
                                  {sd.costs.some((c) => c.name === CHAOS_COIN.name) && (
                                    <tr>
                                      <td><Image src={CHAOS_COIN.icon} alt="" width={22} height={22} style={{ borderRadius: '50%', display: 'block', margin: '0 auto' }} /></td>
                                      <td><div className={styles.materialCell}><span>{CHAOS_COIN.short} — 3막 · 종막 최초 클리어 각 1</span></div></td>
                                      <td>2</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                              <div className={styles.shopDetailInfo}>
                                <div className={styles.shopDetailRow}>
                                  <span className={styles.shopDetailLabel}>{sd.act.coin.name} 만료</span>
                                  <span className={styles.shopDetailValue}>{COIN_EXPIRE}</span>
                                </div>
                                <div className={styles.shopDetailRow}>
                                  <span className={styles.shopDetailLabel}>거래 · 보관</span>
                                  <span className={styles.shopDetailValue}>거래 불가 · 원정대 보관</span>
                                </div>
                              </div>
                              {sd.note && (
                                <div className={`${styles.infoRow} ${styles.coreRow}`} style={{ marginTop: '0.6rem', display: 'block', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--ct-text-secondary)' }}>
                                  {sd.note}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })() : (
                        <div className={styles.shopDetailEmpty}>
                          아이템을 선택하면 상세 정보를 확인할 수 있습니다
                        </div>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>

            {/* 모바일 인-콘텐츠 광고 — 본문 아래·가이드 위 (앱 배치와 유사) */}
            <div className="d-block d-lg-none my-3">
              <AdBanner slot="8616653628" />
            </div>

            {/* 데스크톱 728×90 — 상점 아래·가이드 위. 이 페이지의 유일한 가로 배너 자리다.
                보상 상세 ↔ 상점 경계에도 한 자리 뒀었는데, 본문 한가운데를 끊어서 보기 안 좋다는
                이유로 2026-09-21 제거했다. 다시 넣지 말 것. */}
            <DesktopBannerAd adfit={ADFIT_UNITS.refiningResultDesktop} />

            <GuideFaq
              relatedGuides={['/guide/extreme-rewards', '/guide/extreme-coin-craft', '/guide/raid-rewards']}
              guideTitle="익스트림 3막 · 종막 이용 가이드"
              sections={[
                {
                  heading: '일정과 난이도 구성',
                  paragraphs: [
                    '카제로스 레이드 익스트림은 3막(심연의 징벌자, 모르둠)과 종막(대악마, 카제로스)이 각각 4주씩 순서대로 진행됩니다. 3막 익스트림은 9월 23일 정기 점검 이후부터 10월 21일 정기 점검 전까지, 종막 익스트림은 10월 21일 정기 점검 이후부터 11월 18일 정기 점검 전까지입니다. 두 막 모두 각 레이드의 최종 관문을 기반으로 만들어졌고, 노말·하드·나이트메어 세 난이도로 나뉩니다.',
                    '입장 아이템 레벨은 노말 1730, 하드 1770, 나이트메어 1780입니다. 노말과 하드는 부활 규칙이 조정되어 횟수 제한 없이 부활하며 도전할 수 있고, 나이트메어는 기존과 같이 부활이 불가능합니다. 익스트림에서는 일부 패턴이 새로 등장하거나 기존 패턴에 변화가 더해지며, 종막은 반복되는 구간을 덜어내 전투가 더 빠르게 이어집니다.',
                  ],
                },
                {
                  heading: '난이도별 보상 정리',
                  paragraphs: [
                    '보상은 매주 원정대 단위로 1회 받는 클리어 보상과, 3막·종막을 각각 처음 클리어할 때 1회 받는 최초 클리어 보상으로 나뉩니다. 매주 클리어 보상은 골드와 전용 주화이며, 3막에서는 뇌전의 주화를, 종막에서는 빛과 어둠의 주화를 받습니다. 위 카드에서 난이도를 누르면 3막·종막을 나란히 놓고 볼 수 있습니다.',
                    '최초 클리어 보상은 난이도와 관계없이 도약의 전설 카드 선택 팩 II 1개, 영웅 젬 선택 상자 1개, 혼돈의 주화 1개, 젬 가공 초기화권 1개, 그리고 그 막의 전용 주화 100개입니다. 여기에 나이트메어를 처음 클리어하면 전설 등급 칭호(3막 뇌전의 군주, 종막 파멸의 군주)와 특별 이모티콘, 20만 골드를 추가로 받고, 3막과 종막 나이트메어를 모두 클리어하면 심볼이 포함된 유물 등급 칭호까지 획득합니다.',
                  ],
                  bullets: [
                    '노말(1730): 매주 20,000골드 + 주화 150개 — 8주 합계 160,000골드',
                    '하드(1770): 매주 50,000골드 + 주화 200개 — 8주 합계 400,000골드',
                    '나이트메어(1780): 매주 50,000골드 + 주화 200개, 막마다 칭호 보상 200,000골드 — 8주 합계 800,000골드',
                  ],
                },
                {
                  heading: '주화와 제작소',
                  paragraphs: [
                    '뇌전의 주화와 빛과 어둠의 주화는 거래 불가·원정대 보관이며 2026년 11월 25일 06:00에 만료됩니다. 카제로스 익스트림 제작소에서 고대 코어 랜덤 상자, 유물 각인서 상자를 비롯해 각종 재련 재료와 젬 선택 상자, 지옥 열쇠 등을 제작하는 데 씁니다.',
                    '공식 캡쳐에서 확인된 항목은 두 가지입니다. 3막의 고대 코어 랜덤 상자는 뇌전의 주화 100개와 50,000골드로 원정대 2회까지(아이템 레벨 1770 이상), 종막의 고대 코어 선택 상자는 혼돈의 주화 2개와 빛과 어둠의 주화 100개, 200,000골드로 원정대 1회(아이템 레벨 1780 이상) 제작할 수 있습니다. 혼돈의 주화는 3막과 종막 최초 클리어 때 1개씩만 나오므로, 선택 상자를 만들려면 두 막을 모두 클리어해야 합니다.',
                  ],
                },
              ]}
              faqs={faqData}
            />

            {/* 페이지 최하단 — 가이드·FAQ 를 다 읽고 내려온 자리.
                모바일은 이 페이지에 2개 = 가이드 위(단일 단위) · 최하단(index 1).
                위 자리와 반드시 다른 단위여야 한다. */}
            <div className="d-block d-lg-none mt-3">
              <AdBanner slot="8616653628" index={1} />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
