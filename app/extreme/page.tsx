'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Card } from 'react-bootstrap';
import styles from '../cathedral/cathedral.module.css';
import GuideFaq from '@/components/common/GuideFaq';
import AdBanner from '@/components/ads/AdBanner';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import { ADFIT_UNITS } from '@/components/ads/adConfig';
import NewLottie from '@/components/NewLottie';
import { fetchPriceData } from '@/lib/price-history-client';
import { getItemUnitPrice, getFixedGemSelectUnitPrice, TEMPLATES_MAP } from '@/lib/package-shared';
import { HERO_GEMS, FATE_STONE_PRICE, calcEngravingExpectedValue, calcTicketAverage, TICKET_TIER_LABELS } from '@/lib/hell-reward-calc';
import { ENGRAVING_ICONS } from '@/lib/engraving-icons.generated';
import { faqData } from './faq-data';

// ─────────────────────────────────────────────────────────────────────────
// 카제로스 레이드 3막·종막 익스트림 — 출처: 공식 GM노트 1226 (2026-09-18)
// https://lostark.game.onstove.com/News/GMNote/Views/1226
// 클리어 보상·일정 수치는 전부 그 글의 본문·첨부 이미지에서 그대로 옮겼다.
// 제작소(CRAFT_ITEMS)는 2026-09-25 인게임 제작 화면 캡쳐에서 옮겼다 — GM노트보다 이쪽이 정확하다.
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

// ─── 카제로스 익스트림 제작소 ───
// 출처: 인게임 제작 화면 캡쳐 (2026-09-25).
// 제작소는 인게임과 같이 [분류 × 막] 6칸으로 접힌다 — 특수/젬/성장 재료 × 3막/종막.
// 항목 구성은 3막·종막이 같지만 교환에 쓰는 주화가 다르다 (3막 뇌전 / 종막 빛과 어둠).
// 그래서 목록 데이터(CRAFT_ITEMS)는 한 벌만 두고 막별로 주화를 갈아 끼워 그린다.
// 고대 코어 선택 상자만 종막 목록에 하나 더 있다 (finalOnly).
// 같은 이름이 레벨별로 여러 번 나오는 건 제작 조건(1730/1770/1780)이 다른 별개 항목이라
// 그런 것이고, 원정대 제한 횟수도 항목마다 따로 붙는다.
//
// 아이콘은 전부 사이트가 이미 쓰는 그림을 그대로 가져다 쓴다 (패키지 등록 아이템 목록·성당·벨가르딘).
// 새 파일을 만들지 말 것 — 같은 아이템이 페이지마다 다른 그림으로 보이면 안 된다.
//   고대 코어 상자 /rheozhdj.webp(성당) · 각인서 /engraving2.webp(패키지 유각 선택 상자)
//   비상의 돌 키트 /djqlfflxltmxhs.webp(벨가르딘) · 파수 주머니 /crystal-choice-pouch.webp(패키지 파결·수결 묶음)
//   정련된 운명의 돌 /dnsauddmlehf.webp · 영롱한 혼돈의 돌(확정권) /quality-confirm.webp
// 전용 그림이 없는 상자는 안에 든 것으로 대신한다 — 상급 아비도스 상자는 상급 아비도스 융화 재료 그림,
// 야금술·재봉술 선택 상자 VI 는 구성이 8종이라 공용 상자 그림(/magic-reagent-select.webp)을 쓰고
// 이름과 아래 '제작 결과' 표의 구성품 아이콘으로 구분한다.
// 희귀 지옥 열쇠 교환권 /hell-rare-ticket.webp 는 인게임 아이콘(검정 테두리 제거)이다.
type CraftGroup = 'special' | 'gem' | 'growth';

const CRAFT_GROUPS: { key: CraftGroup; label: string }[] = [
  { key: 'special', label: '특수 제작' },
  { key: 'gem', label: '젬 제작' },
  { key: 'growth', label: '성장 재료 제작' },
];

/**
 * 제작 결과물 한 줄.
 * itemId 가 있으면 latest.json 시세(개당)로, gold 가 있으면 고정가로 값을 매긴다.
 * 둘 다 없으면 그 항목은 효율 산정에서 빠진다(= 아직 구성이 확인 안 된 상자).
 */
type CraftContent = { name: string; icon: string; itemId?: string; gold?: number;
  /** 시세에서 매번 다시 구하는 값 (각인서 기댓값처럼 고정가가 아닌 것) */
  goldOf?: (prices: Record<string, number>, bcRate: number) => number;
  /** 개수. 아직 확인 안 됐으면 비워 둔다 — 표엔 x? 로 뜨고 효율 산정에서 빠진다 */
  amount?: number };

type CraftItem = {
  id: string;
  /** 정식 이름 — 상세 카드에 그대로 쓴다 */
  name: string;
  /** 목록용 축약 이름. '익스트림' 같은 접두사는 떼고 통용 줄임말로 (고코랜·파결·수결…) */
  short: string;
  group: CraftGroup;
  image: string;
  /** 제작 가능 아이템 레벨 */
  level: number;
  /** 원정대 제한 — 막 기간 중 이 항목을 만들 수 있는 총 횟수 */
  limit: number;
  /** 그 막의 전용 주화 수량 (3막 뇌전 / 종막 빛과 어둠) */
  coin: number;
  /** 혼돈의 주화 — 고대 코어 선택 상자만 쓴다 */
  chaosCoin?: number;
  /** 제작 비용. 0 = 제작 비용 없음, null = 캡쳐에 안 잡혀 미확인 */
  gold: number | null;
  /** 종막 목록에만 있는 항목 */
  finalOnly?: boolean;
  /** 제작 결과물 */
  contents?: CraftContent[];
  /** 구성품이 "이 중 하나"인 선택 상자 — 값은 최고가 하나로 잡는다 */
  pickOne?: boolean;
  /** 확정 조합 프리미엄 등 결과값에 곱하는 배수 (고정형 젬 상자) */
  valueMultiplier?: number;
  note?: string;
};

// 야금술·재봉술 선택 상자 VI 구성품 — 두 상자가 같은 구성이고 무기/방어구 계열만 다르다.
// itemId 는 거래소 추적 아이템(lib/items-to-track)과 같은 ID — latest.json 키다.
const LIFE_SELECT_CONTENTS = (kind: '야금술' | '재봉술'): CraftContent[] => {
  const weapon = kind === '야금술';
  const f = weapon ? 'metallurgy' : 'tailoring';
  const id = weapon
    ? { k11: '66112543', k15: '66112551', k19: '66112553', t12: '66112561', m1: '66112711', m2: '66112713', m3: '66112715', m4: '66112717' }
    : { k11: '66112546', k15: '66112552', k19: '66112554', t12: '66112564', m1: '66112712', m2: '66112714', m3: '66112716', m4: '66112718' };
  return [
    { name: `${kind} : 업화 [11-14]`, icon: `/${f}-karma.webp`, amount: 10, itemId: id.k11 },
    { name: `${kind} : 업화 [15-18]`, icon: `/${f}-karma.webp`, amount: 4, itemId: id.k15 },
    { name: `${kind} : 업화 [19-20]`, icon: `/${f}-karma.webp`, amount: 2, itemId: id.k19 },
    { name: `${kind} : 전율 [12-15]`, icon: `/${f}-thrill.webp`, amount: 1, itemId: id.t12 },
    { name: `장인의 ${kind} : 1단계`, icon: `/master-${f}-1.webp`, amount: 20, itemId: id.m1 },
    { name: `장인의 ${kind} : 2단계`, icon: `/master-${f}-2.webp`, amount: 10, itemId: id.m2 },
    { name: `장인의 ${kind} : 3단계`, icon: `/master-${f}-3.webp`, amount: 4, itemId: id.m3 },
    { name: `장인의 ${kind} : 4단계`, icon: `/master-${f}-4.webp`, amount: 2, itemId: id.m4 },
  ];
};

const STONE_POUCH_CONTENTS: CraftContent[] = [
  { name: '운명의 파괴석 결정', icon: '/destruction-stone-crystal.webp', amount: 1500, itemId: '66102007' },
  { name: '운명의 수호석 결정', icon: '/guardian-stone-crystal.webp', amount: 3000, itemId: '66102107' },
];

// 익스트림 상급 아비도스 융화 재료 상자 — 1730·1770·1780 세 항목 모두 100개로 같다.
const ABIDOS_BOX_CONTENTS: CraftContent[] = [
  { name: '상급 아비도스 융화 재료', icon: '/top-abidos-fusion5.webp', amount: 100, itemId: '6861013' },
];

// 고대 코어 상자 — 코어(질서·혼돈의 해/달/별)는 거래 불가라 시세가 없다.
// 대신 지평의 성당에서 같은 상자를 얻는 데 드는 골드 환산 비용을 그 상자의 값으로 쓴다(대체원가).
//   성당: 은총의 파편 400 + 코어 정수 400 + 골드(선택 200,000 / 랜덤 100,000)
//   은총의 파편 1개 값 = 지평의 재련 재료 상자 총 가치 ÷ 60 — 성당 화면의 그 숫자와 같은 식이다.
//   코어 정수도 거래 불가라 성당과 똑같이 값에서 뺀다.
const CATHEDRAL_REFINE_BOX = [
  { itemId: '66102007', amount: 2000 },   // 운명의 파괴석 결정
  { itemId: '66102107', amount: 4000 },   // 운명의 수호석 결정
  { itemId: '66110226', amount: 60 },     // 위대한 운명의 돌파석
  { itemId: '66130143', amount: 22500 },  // 운명의 파편
];
const CATHEDRAL_BOX_GRACE = 60;
const CATHEDRAL_CORE_GRACE = 400;

/** 은총의 파편 1개 골드 — 성당과 같은 식 */
function graceUnitGold(prices: Record<string, number>): number {
  const total = CATHEDRAL_REFINE_BOX.reduce(
    (sum, c) => sum + getItemUnitPrice(c.itemId, prices) * c.amount, 0,
  );
  return total / CATHEDRAL_BOX_GRACE;
}

const ancientCoreContents = (cathedralGold: number, label: string): CraftContent[] => [
  {
    name: label,
    icon: '/rheozhdj.webp',
    amount: 1,
    goldOf: (prices) => graceUnitGold(prices) * CATHEDRAL_CORE_GRACE + cathedralGold,
  },
];

// 비상의 돌 각인 지정 키트 — 값이 통째로 페온인 아이템이라 시세가 아니라 환율로 정해진다.
// 패키지 등록 목록의 '어빌리티스톤 키트' 와 같은 값: 9페온 = 76.5 블루크리스탈.
const ABILITY_STONE_KIT_CRYSTAL = 76.5;
const STONE_KIT_CONTENTS: CraftContent[] = [
  {
    name: '어빌리티스톤 키트 (9페온)',
    icon: '/djqlfflxltmxhs.webp',
    amount: 1,
    goldOf: (_prices, bcRate) => (ABILITY_STONE_KIT_CRYSTAL * bcRate) / 100,
  },
];

// 희귀 지옥 열쇠 — 패키지가 영웅·전설 티켓을 매기는 그 함수(calcTicketAverage)를 그대로 쓴다.
// 패키지는 영웅 6단계(60~69층)·전설 7단계(70~79층)를 기본으로 잡는데, 희귀는 그보다 낮은
// 4단계(40~49층) 1750 지옥 평균으로 본다. 상자 3개 중 택 1 기댓값이라 목록 평균이 아니다.
// 안에 든 젬·팔찌의 페온 몫까지 패키지와 같은 기준으로 넣는다 (아래 환율 입력값).
const HELL_RARE_TIER = 4;
const HELL_RARE_KEY_CONTENTS: CraftContent[] = [
  {
    name: `희귀 지옥 열쇠 (1750 · ${TICKET_TIER_LABELS[HELL_RARE_TIER]}층 기댓값)`,
    icon: '/hell-rare-ticket.webp',
    amount: 1,
    goldOf: (prices, bcRate) => calcTicketAverage('hell', HELL_RARE_TIER, prices, bcRate, true, false),
  },
];

// 고정형 영웅 젬 선택 상자 — 젬 6종 중 택 1. 한 종의 값은 패키지 효율 페이지가 쓰는
// getFixedGemSelectUnitPrice 그대로다 (확정 조합 프리미엄 ×6 · 추가 초기화 1회 − 초기화권 + 젬 페온).
// 환율(goldPerWon)은 아래 블크 입력값에서 역산해 넘긴다 — 100블크 = 2,750원.
const FIXED_GEM_CONTENTS: CraftContent[] = HERO_GEMS.map((g) => ({
  name: g.name,
  icon: g.icon,
  amount: 1,
  goldOf: (prices, bcRate) => getFixedGemSelectUnitPrice(g.id, prices, bcRate / 2750, false),
}));

// 유물 각인서 — 값은 전부 /package · 지옥 보상 계산기가 쓰는 것과 같은 규칙이다.
//   유각랜: 43종 랜덤이라 낱개 기댓값(calcEngravingExpectedValue) — 추적 12종 시세 + 비추적 31종 합 ÷ 43
//   유각선: 택 1 이라 패키지 '유각 선택 상자' 템플릿의 선택지 중 latest.json 최고가
//           (선택지 목록을 여기 베끼지 않고 TEMPLATES_MAP 을 그대로 읽는다 — 원본이 한 곳)
const ENGRAVING_RANDOM_CONTENTS: CraftContent[] = [
  { name: '유물 각인서 평균 기댓값', icon: '/engraving2.webp', amount: 1, goldOf: calcEngravingExpectedValue },
];

const ENGRAVING_SELECT_CONTENTS: CraftContent[] = (TEMPLATES_MAP['engraving-choice']?.choices ?? []).map((c) => ({
  name: c.name,
  icon: ENGRAVING_ICONS[c.name] ?? '/engraving2.webp',
  amount: 1,
  itemId: c.itemId,
}));
// 영웅 젬 선택 상자 — 6종 중 택 1. 지옥 보상 계산기와 같은 기준(최고가 젬)으로 값을 잡는다.
const HERO_GEM_CONTENTS: CraftContent[] = HERO_GEMS.map((g) => ({
  name: g.name, icon: g.icon, amount: 1, itemId: g.id,
}));

const CRAFT_ITEMS: CraftItem[] = [
  // ── 특수 제작 ──
  {
    id: 'core-random', name: '고대 코어 랜덤 상자', short: '고대 코어 랜덤 상자', group: 'special',
    image: '/rheozhdj.webp', level: 1770, limit: 2, coin: 50, gold: 50000,
    contents: ancientCoreContents(100000, '고대 코어 랜덤 상자 (성당 교환 비용 환산)'),
    note: '코어는 거래 불가라 시세가 없다. 지평의 성당에서 같은 상자를 얻는 골드 환산 비용(은총의 파편 400 + 골드 100,000)을 값으로 쓴다.',
  },
  {
    id: 'core-select', name: '고대 코어 선택 상자', short: '고대 코어 선택 상자', group: 'special',
    image: '/rheozhdj.webp', level: 1780, limit: 1, coin: 100, chaosCoin: 2, gold: 200000,
    contents: ancientCoreContents(200000, '고대 코어 선택 상자 (성당 교환 비용 환산)'),
    finalOnly: true,
  },
  {
    id: 'engraving-random', name: '유물 각인서 랜덤 주머니', short: '유물 각인서 랜덤 주머니', group: 'special',
    image: '/engraving2.webp', level: 1780, limit: 2, coin: 20, gold: 5000,
    contents: ENGRAVING_RANDOM_CONTENTS,
  },
  {
    id: 'engraving-select', name: '유물 전투 각인서 선택 주머니', short: '유물 전투 각인서 선택 주머니', group: 'special',
    image: '/engraving2.webp', level: 1730, limit: 1, coin: 100, gold: 30000,
    contents: ENGRAVING_SELECT_CONTENTS, pickOne: true,
  },
  {
    id: 'stone-kit', name: '비상의 돌 각인 지정 키트 상자', short: '각인 키트', group: 'special',
    image: '/djqlfflxltmxhs.webp', level: 1730, limit: 40, coin: 3, gold: 0,
    contents: STONE_KIT_CONTENTS,
    note: '값은 패키지의 어빌리티스톤 키트와 같은 9페온 기준. 제작 골드는 캡쳐에 안 잡혀 0으로 본다 — 실제 비용이 있으면 효율은 그만큼 내려간다.',
  },
  {
    id: 'hell-key', name: '희귀 지옥 열쇠 교환권 (이벤트)', short: '희귀 지옥 열쇠', group: 'special',
    image: '/hell-rare-ticket.webp', level: 1730, limit: 4, coin: 10, gold: 15000,
    contents: HELL_RARE_KEY_CONTENTS,
  },

  // ── 젬 제작 ──
  {
    id: 'gem-1730', name: '영웅 젬 선택 상자', short: '영웅 젬', group: 'gem',
    image: '/gem-hero.webp', level: 1730, limit: 2, coin: 20, gold: 10000,
    contents: HERO_GEM_CONTENTS, pickOne: true,
  },
  {
    id: 'gem-1770', name: '영웅 젬 선택 상자', short: '영웅 젬', group: 'gem',
    image: '/gem-hero.webp', level: 1770, limit: 2, coin: 20, gold: 10000,
    contents: HERO_GEM_CONTENTS, pickOne: true,
  },
  {
    id: 'gem-fixed', name: '고정형 영웅 젬 선택 상자', short: '고정형 젬', group: 'gem',
    image: '/fixed-hero-gem-select.webp', level: 1780, limit: 1, coin: 100, gold: 10000,
    contents: FIXED_GEM_CONTENTS, pickOne: true,
    note: '가공 옵션 2종이 확정이라 붙는 프리미엄까지, 패키지 효율 페이지와 같은 계산기로 값을 잡는다.',
  },

  // ── 성장 재료 제작 ──
  {
    id: 'stone-pouch-1770', name: '익스트림 운명의 파괴/수호석 결정 주머니', short: '파결·수결', group: 'growth',
    image: '/crystal-choice-pouch.webp', level: 1770, limit: 4, coin: 15, gold: 3000,
    contents: STONE_POUCH_CONTENTS,
  },
  {
    id: 'stone-pouch-1780', name: '익스트림 운명의 파괴/수호석 결정 주머니', short: '파결·수결', group: 'growth',
    image: '/crystal-choice-pouch.webp', level: 1780, limit: 4, coin: 15, gold: 3000,
    contents: STONE_POUCH_CONTENTS,
  },
  {
    id: 'abidos-1730', name: '익스트림 상급 아비도스 융화 재료 상자', short: '상비도스', group: 'growth',
    image: '/top-abidos-fusion5.webp', level: 1730, limit: 2, coin: 10, gold: 5000,
    contents: ABIDOS_BOX_CONTENTS,
  },
  {
    id: 'abidos-1770', name: '익스트림 상급 아비도스 융화 재료 상자', short: '상비도스', group: 'growth',
    image: '/top-abidos-fusion5.webp', level: 1770, limit: 2, coin: 10, gold: 5000,
    contents: ABIDOS_BOX_CONTENTS,
  },
  {
    id: 'abidos-1780', name: '익스트림 상급 아비도스 융화 재료 상자', short: '상비도스', group: 'growth',
    image: '/top-abidos-fusion5.webp', level: 1780, limit: 2, coin: 10, gold: 5000,
    contents: ABIDOS_BOX_CONTENTS,
  },
  {
    id: 'metallurgy-6', name: '야금술 선택 상자 VI', short: '야금술', group: 'growth',
    image: '/magic-reagent-select.webp', level: 1730, limit: 2, coin: 5, gold: 0,
    contents: LIFE_SELECT_CONTENTS('야금술'), pickOne: true,
  },
  {
    id: 'tailoring-6', name: '재봉술 선택 상자 VI', short: '재봉술', group: 'growth',
    image: '/magic-reagent-select.webp', level: 1730, limit: 5, coin: 5, gold: 0,
    contents: LIFE_SELECT_CONTENTS('재봉술'), pickOne: true,
  },
  {
    id: 'fate-stone', name: '정련된 운명의 돌', short: '운명의 돌', group: 'growth',
    image: '/dnsauddmlehf.webp', level: 1730, limit: 100, coin: 1, gold: 0,
    contents: [{ name: '정련된 운명의 돌', icon: '/dnsauddmlehf.webp', amount: 1, gold: FATE_STONE_PRICE }],
    note: '값은 지옥·나락 보상 계산기와 같은 고정가(1개 900골드). 제작 골드는 캡쳐에 안 잡혀 0으로 본다 — 실제 비용이 있으면 효율은 그만큼 내려간다.',
  },
  {
    id: 'chaos-stone-weapon', name: '영롱한 혼돈의 돌 (무기)', short: '혼돈의 돌 (무기)', group: 'growth',
    image: '/quality-confirm.webp', level: 1730, limit: 1, coin: 50, gold: null,
  },
  {
    id: 'chaos-stone-armor', name: '영롱한 혼돈의 돌 (방어구)', short: '혼돈의 돌 (방어구)', group: 'growth',
    image: '/quality-confirm.webp', level: 1730, limit: 2, coin: 50, gold: null,
  },
];

// ─── 주화 가치 · 제작 효율 ───
// 주화는 거래가 안 되니 "골드로 얼마짜리냐"를 시세에서 거꾸로 잡는다.
//   1) 각 항목의 제작 결과를 latest.json 시세로 환산한다 (선택 상자는 최고가 하나)
//   2) 주화 1개당 순이득 = (결과 가치 − 제작 골드) ÷ 주화 수
//   3) 파결·수결 주머니의 주화당 순이득을 '주화 기준가'로 고정한다 (COIN_BASIS_ID)
//      — 파괴석·수호석 결정은 거래량이 가장 두꺼운 재련 재료라 시세가 안 흔들린다.
//        "가장 비싼 제작처"를 자동으로 고르면 야금술·재봉술처럼 물량 얇은 생활 재료가
//        기준을 잡아 버려서, 그쪽 시세가 튈 때마다 전 항목 효율이 같이 출렁인다.
//   4) 항목 효율 = 결과 가치 ÷ (주화 수 × 기준가 + 제작 골드)
//      기준인 파결·수결이 정확히 100% 이고, 그보다 나으면 100% 를 넘는다.
// 구성이 아직 확인 안 된 상자(고대 코어·각인서·아비도스 등)는 계산에서 빠진다.

/** 막 색 — 그 막의 주화에서 딴다. 3막 뇌전(번개)은 청색, 종막 빛과 어둠은 자주.
    막 구분 헤더는 이 색으로 채우고, 아래 분류 머리글·항목 줄은 같은 색 세로선만 잇는다. */
const ACT_ACCENT: Record<Act['key'], string> = { act3: '#2b6ca8', final: '#6b3fa0' };

/**
 * 환율 고정 — 100골드 = 10원.
 * 블루크리스탈 100개 = 2,750원이므로 블크 100개당 골드 = 275,000 / 10 = 27,500.
 * 페온으로 값이 정해지는 항목(각인 키트)과 고정형 젬의 초기화권·페온, 지옥 열쇠 속
 * 젬·팔찌 페온이 이 값을 쓴다. 지옥 보상 계산기의 환율 칸과 같은 단위다.
 */
const BC_RATE = 27500;

/** 주화 기준가를 잡는 항목 — 파결·수결 주머니 (1770·1780 이 값이 같아 어느 쪽이든 같다) */
const COIN_BASIS_ID = 'stone-pouch-1770';
type CraftEval = { value: number; net: number | null; perCoin: number | null };

/** 구성 요소 1개당 골드 — 고정가 > 시세 함수 > 거래소 단가 순 */
function contentUnitGold(c: CraftContent, prices: Record<string, number> | null, bcRate: number): number {
  if (c.gold !== undefined) return c.gold;
  if (!prices) return 0;
  if (c.goldOf) return c.goldOf(prices, bcRate);
  return c.itemId ? getItemUnitPrice(c.itemId, prices) : 0;
}

/**
 * 표에 그릴 구성 요소 — 전부 보여 준다. 택 1 상자만 값이 큰 순으로 세워
 * 실제로 잡히는 선택지가 맨 위에 오게 한다. 줄이 많으면 표가 세로로 스크롤된다.
 */
function sortedContents(item: CraftItem, prices: Record<string, number> | null, bcRate: number): CraftContent[] {
  const list = item.contents ?? [];
  if (!item.pickOne) return list;
  return [...list].sort(
    (a, b) => contentUnitGold(b, prices, bcRate) * (b.amount ?? 0) - contentUnitGold(a, prices, bcRate) * (a.amount ?? 0),
  );
}

function calcCraftValue(item: CraftItem, prices: Record<string, number>, bcRate: number): number | null {
  if (!item.contents || item.contents.length === 0) return null;
  // 시세가 안 잡히는 구성품은 0골로 친다 — 택 1 상자에선 어차피 안 뽑히고,
  // 묶음에선 "없는 값"이 아니라 "보탤 게 없는 값"이라 합계에서 그냥 빠지면 된다.
  // 값을 못 매기는 건 개수 자체가 미확인일 때뿐이다.
  const unit = (c: CraftContent): number | null => {
    if (c.amount === undefined) return null;
    if (c.goldOf) return c.goldOf(prices, bcRate) * c.amount;
    if (c.gold !== undefined) return c.gold * c.amount;
    if (!c.itemId) return 0;
    return getItemUnitPrice(c.itemId, prices) * c.amount;
  };
  const values = item.contents.map(unit);
  if (item.pickOne) {
    const usable = values.filter((v): v is number => v !== null);
    if (usable.length === 0) return null;
    return Math.max(...usable) * (item.valueMultiplier ?? 1);
  }
  if (values.some((v) => v === null)) return null;
  return (values as number[]).reduce((s, v) => s + v, 0) * (item.valueMultiplier ?? 1);
}

function evalCraft(item: CraftItem, prices: Record<string, number> | null, bcRate: number): CraftEval | null {
  if (!prices) return null;
  const value = calcCraftValue(item, prices, bcRate);
  if (value === null) return null;
  const net = item.gold === null ? null : value - item.gold;
  // 혼돈의 주화는 값을 0으로 본다 — 최초 클리어로 2개만 나오고 다른 데 쓸 곳이 없어
  // 기회비용이 잡히지 않는다. 그래서 전용 주화만으로 나눈다.
  const perCoin = net === null || item.coin <= 0 ? null : net / item.coin;
  return { value, net, perCoin };
}


export default function ExtremePage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  // 제작소는 인게임처럼 [분류 × 막] 6칸이 각각 접힌다. 키는 `${막}:${분류}`
  const [openCraftKeys, setOpenCraftKeys] = useState<string[]>([]);   // 처음엔 6칸 모두 접힌 채로
  // 선택한 제작 항목 — 막마다 주화가 다르므로 `${막}:${항목}` 으로 잡는다
  const [selectedCraftKey, setSelectedCraftKey] = useState<string | null>('act3:core-random');
  // latest.json 시세 — 제작 효율 계산용 (차트·패키지와 같은 모듈 캐시라 추가 요청이 거의 없다)
  const [prices, setPrices] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPriceData()
      .then(({ latest }) => { if (!cancelled) setPrices(latest); })
      .catch(() => { /* 시세를 못 받으면 효율만 빠지고 목록은 그대로 보인다 */ });
    return () => { cancelled = true; };
  }, []);

  const bcRate = BC_RATE;

  const selectedStageData = STAGES.find((s) => s.name === selectedStage);

  // 항목별 결과 가치·주화당 순이득
  const craftEvals = useMemo(() => {
    const m = new Map<string, CraftEval>();
    for (const it of CRAFT_ITEMS) {
      const e = evalCraft(it, prices, bcRate);
      if (e) m.set(it.id, e);
    }
    return m;
  }, [prices, bcRate]);

  // 주화 기준가 — 파결·수결 주머니의 "주화 1개당 순이득" (COIN_BASIS_ID)
  const coinBasis = useMemo(() => {
    const item = CRAFT_ITEMS.find((it) => it.id === COIN_BASIS_ID);
    const e = item ? craftEvals.get(item.id) : null;
    if (!item || !e || e.perCoin === null || e.perCoin <= 0) return null;
    return { perCoin: e.perCoin, item };
  }, [craftEvals]);

  const evalOf = (item: CraftItem) => craftEvals.get(item.id) ?? null;

  /** 골드로 환산한 교환 비용 — 주화 × 기준가 + 제작 골드 */
  const craftPaid = (item: CraftItem): number | null => {
    if (!coinBasis || item.gold === null) return null;
    return item.coin * coinBasis.perCoin + item.gold;
  };

  /** 골드로 그냥 사는 값 대비 효율 — 결과 가치 ÷ (주화 × 기준가 + 제작 골드) */
  const craftRatio = (item: CraftItem): number | null => {
    const e = craftEvals.get(item.id);
    if (!e || !coinBasis || item.gold === null) return null;
    const paid = item.coin * coinBasis.perCoin + item.gold;
    return paid > 0 ? e.value / paid : null;
  };

  const toggleCraftGroup = (key: string) =>
    setOpenCraftKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const selectedAct = ACTS.find((a) => a.key === selectedCraftKey?.split(':')[0]) ?? null;
  const selectedCraftData = CRAFT_ITEMS.find((it) => it.id === selectedCraftKey?.split(':')[1]) ?? null;

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
                          {coinBasis && (
                            <span className={styles.exCardCoinGold}>
                              = <Image src="/gold.webp" alt="" width={14} height={14} />
                              {Math.round(stage.coins * coinBasis.perCoin).toLocaleString()}
                            </span>
                          )}
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
            {/* 카제로스 익스트림 제작소 — 인게임과 같이 [분류 × 막] 6칸 아코디언.
                항목 구성은 3막·종막이 같지만 교환 주화가 달라서 칸을 합치지 않는다. */}
            <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
              <Card className={styles.shopCard}>
                <Card.Header className={styles.shopCardHeader}>
                  <h3 className={styles.shopCardTitle}>
                    카제로스 익스트림 제작소
                  </h3>
                </Card.Header>
                <Card.Body className="p-0">
                  {/* 주화 기준가 — 시세로 거꾸로 매긴 주화 1개의 골드 값 */}
                  <div className={styles.exCoinBasis}>
                    {coinBasis ? (
                      <>
                        <div className={styles.exCoinBasisMain}>
                          <span className={styles.exCoinBasisCoins}>
                            <Image src={ACTS[0].coin.icon} alt={ACTS[0].coin.name} width={22} height={22} />
                            <Image src={ACTS[1].coin.icon} alt={ACTS[1].coin.name} width={22} height={22} />
                          </span>
                          <span className={styles.exCoinBasisLabel}>주화 1개 =</span>
                          <span className={styles.exCoinBasisValue}>
                            <Image src="/gold.webp" alt="골드" width={18} height={18} />
                            {Math.round(coinBasis.perCoin).toLocaleString()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className={styles.exCoinBasisNote}>
                        {prices ? '효율을 매길 수 있는 항목의 시세를 불러오지 못했습니다.' : '시세를 불러오는 중입니다…'}
                      </div>
                    )}
                  </div>

                  <div className={styles.shopContainer}>
                    <div className={styles.shopList}>
                      <div className={styles.shopListHeader}>
                        제작 목록 — 분류를 눌러 펼치기
                      </div>
                      {ACTS.map((act) => (
                        <div key={act.key} className={styles.exActBlock} style={{ '--ex-act': ACT_ACCENT[act.key] } as React.CSSProperties}>
                          {/* 막 구분 바 — 3막 묶음과 종막 묶음이 한 덩어리로 안 읽히게 끊어 준다.
                              바 색과 아래 분류 머리글의 왼쪽 선이 같은 색이라 어디까지가 한 막인지 보인다 */}
                          <div className={styles.exActBar}>
                            <Image src={act.coin.icon} alt={act.coin.name} width={20} height={20} className={styles.exActBarCoin} />
                            <span className={styles.exActBarName}>{act.label}</span>
                            <span className={styles.exActBarCoinName}>{act.coin.name}</span>
                          </div>
                          {CRAFT_GROUPS.map((group) => {
                        const groupKey = `${act.key}:${group.key}`;
                        const groupItems = CRAFT_ITEMS.filter(
                          (it) => it.group === group.key && (!it.finalOnly || act.key === 'final'),
                        );
                        const open = openCraftKeys.includes(groupKey);
                        return (
                          <div key={groupKey}>
                            <button
                              type="button"
                              className={styles.exCraftGroup}
                              onClick={() => toggleCraftGroup(groupKey)}
                              aria-expanded={open}
                            >
                              <Image src={act.coin.icon} alt={act.coin.name} width={18} height={18} className={styles.exCraftGroupCoin} />
                              <span className={styles.exCraftGroupName}>
                                {group.label} <span className={styles.exCraftGroupAct}>– {act.label.split(' · ')[0]}</span>
                              </span>
                              <span className={styles.exCraftGroupCount}>{groupItems.length}종</span>
                              <span className={styles.exCraftGroupArrow}>{open ? '⌃' : '⌄'}</span>
                            </button>
                            {open && groupItems.map((item) => {
                              const itemKey = `${act.key}:${item.id}`;
                              const isActive = selectedCraftKey === itemKey;
                              const ratio = craftRatio(item);
                              return (
                                <div
                                  key={itemKey}
                                  className={`${styles.shopItem} ${isActive ? styles.active : ''}`}
                                  onClick={() => setSelectedCraftKey(isActive ? null : itemKey)}
                                >
                                  <div className={styles.shopItemIconFill}>
                                    <Image src={item.image} alt="" width={52} height={52} style={{ borderRadius: '6px', objectFit: 'cover', width: '100%', height: '100%' }} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span className={styles.shopItemName} style={{ display: 'block' }}>
                                      {item.short}
                                    </span>
                                    <div className={styles.exCraftBadges}>
                                      <span className={`${styles.limitBadge} ${styles.exLvBadge}`}>Lv.{item.level}</span>
                                      <span className={`${styles.limitBadge} ${styles.exLimitBadge}`}>원정대 {item.limit}회</span>
                                    </div>
                                  </div>
                                  {/* 오른쪽 칸은 효율 — 교환 비용은 눌러서 상세에서 본다 */}
                                  <div className={styles.exShopRatio}>
                                    {ratio !== null ? (
                                      <>
                                        <span className={`${styles.exRatioNum} ${styles.exShopRatioValue} ${ratio >= 1 ? styles.exRatioUp : styles.exRatioFlat}`}>
                                          {Math.round(ratio * 100)}%
                                        </span>
                                        {evalOf(item)?.perCoin != null && (
                                          <span className={styles.exShopRatioSub}>
                                            주화당 {Math.round(evalOf(item)!.perCoin!).toLocaleString()}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className={styles.exShopRatioNone}>미산정</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className={styles.shopDetail}>
                      {selectedCraftData && selectedAct ? (() => {
                        const sd = selectedCraftData;
                        const act = selectedAct;
                        const ev = craftEvals.get(sd.id) ?? null;
                        const ratio = craftRatio(sd);
                        const paid = craftPaid(sd);
                        return (
                          <div className={styles.shopDetailContent}>
                            {/* 1. 아이콘 + 이름 */}
                            <div className={styles.shopDetailTop}>
                              <div className={styles.shopDetailIconFill}>
                                <Image src={sd.image} alt="" width={130} height={130} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                              </div>
                              <div className={styles.shopDetailName}>{sd.name}</div>
                            </div>

                            {/* 2. 레벨 + 한도 + 막 + 분류 */}
                            <div className={styles.shopCompactInfo}>
                              <span className={styles.shopCompactItem} style={{ color: 'var(--rd-line)' }}>
                                Lv.{sd.level}
                              </span>
                              <span className={styles.shopCompactDivider}>·</span>
                              <span className={`${styles.limitBadge} ${styles.exLimitBadge}`}>원정대 {sd.limit}회</span>
                            </div>

                            {/* 3. 교환 비용 — 성당·세르카와 같은 자리·같은 꼴. 주화는 기준가로 골드 환산해 합계를 낸다 */}
                            <div className={styles.shopDetailSection}>
                              <div className={styles.shopDetailSectionTitle}>교환 비용</div>
                              <div className={styles.shopDetailCostList}>
                                {sd.chaosCoin ? (
                                  <div className={styles.shopDetailCostItem}>
                                    <Image src={CHAOS_COIN.icon} alt={CHAOS_COIN.name} width={24} height={24} style={{ borderRadius: '50%' }} />
                                    <span className={styles.costName}>{CHAOS_COIN.name} </span>
                                    <span className={styles.costShortName}>{CHAOS_COIN.short} </span>
                                    <span>{sd.chaosCoin}</span>
                                  </div>
                                ) : null}
                                <div className={styles.shopDetailCostItem}>
                                  <Image src={act.coin.icon} alt={act.coin.name} width={24} height={24} style={{ borderRadius: '50%' }} />
                                  <span className={styles.costName}>{act.coin.name} </span>
                                  <span className={styles.costShortName}>{act.coin.short} </span>
                                  <span>{sd.coin.toLocaleString()}</span>
                                </div>
                                <div className={styles.shopDetailCostItem}>
                                  <Image src="/gold.webp" alt="골드" width={24} height={24} />
                                  <span>{sd.gold === null ? '미확인' : sd.gold === 0 ? '없음' : sd.gold.toLocaleString()}</span>
                                </div>
                                {paid !== null && (
                                  <div className={styles.costTotalRow}>
                                    <span className={styles.costTotalEquals}>=</span>
                                    <Image src="/gold.webp" alt="" width={18} height={18} />
                                    <span className={styles.costTotalValue}>{Math.round(paid).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                              {sd.gold === null && (
                                <div className={styles.exCostNote}>제작 비용(골드)이 아직 확인되지 않아 골드 환산 합계를 낼 수 없다.</div>
                              )}
                            </div>

                            {/* 4. 구성 요소 — 지평의 성당 재련 재료 상자 표와 같은 5칸 구성:
                                [아이콘][아이템][수량][단가][가치] + 마지막 줄에 총 가치.
                                줄이 많은 항목만 표 안쪽이 세로로 스크롤된다. */}
                            {sd.contents && (() => {
                              const rows = sortedContents(sd, prices, bcRate);
                              return (
                                <div className={styles.shopDetailSection}>
                                  {/* 제목과 종 수를 한 줄로 — 따로 두면 좁아질 때 두 줄로 갈라진다 */}
                                  <div className={styles.shopDetailSectionTitle}>
                                    구성 요소
                                    <span className={styles.exFoldMeta}>
                                      {sd.pickOne ? ` · ${sd.contents.length}종 중 택 1 (최고가)` : ` · ${sd.contents.length}종`}
                                    </span>
                                  </div>
                                  <div className={styles.exTableWrap}>
                                    <table className={styles.materialTable}>
                                      <thead>
                                        <tr>
                                          {/* 1열은 materialTable 이 고정해 둔 아이콘 칸 — 이름은 반드시 2열(좌측 정렬) */}
                                          <th></th>
                                          <th>아이템</th>
                                          <th>수량</th>
                                          <th>단가</th>
                                          <th>가치</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.map((c, idx) => {
                                          const unit = contentUnitGold(c, prices, bcRate);
                                          const total = c.amount === undefined ? null : unit * c.amount;
                                          return (
                                            <tr key={`${c.name}-${c.amount ?? '?'}`}>
                                              <td>
                                                <Image src={c.icon} alt="" width={28} height={28} style={{ borderRadius: '4px', display: 'block', margin: '0 auto' }} />
                                              </td>
                                              <td className={styles.exContentName}>
                                                {c.name}
                                                {sd.pickOne && idx === 0 && <span className={styles.exPickMark}>선택</span>}
                                              </td>
                                              <td>{c.amount === undefined ? '?' : c.amount.toLocaleString()}</td>
                                              <td>{unit > 0 ? (unit >= 1 ? unit.toFixed(1) : unit.toFixed(3)) : '—'}</td>
                                              <td>
                                                <span className={styles.exGoldCell}>
                                                  <Image src="/gold.webp" alt="" width={14} height={14} />
                                                  {total === null || total <= 0 ? '—' : Math.round(total).toLocaleString()}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      {ev !== null && (
                                        <tfoot>
                                          <tr className={styles.subtotalRow}>
                                            <td colSpan={4}>{sd.pickOne ? '최고가 선택지' : '상자 총 가치'}</td>
                                            <td>
                                              <span className={styles.exGoldCell}>
                                                <Image src="/gold.webp" alt="" width={14} height={14} />
                                                {Math.round(ev.value).toLocaleString()}
                                              </span>
                                            </td>
                                          </tr>
                                        </tfoot>
                                      )}
                                    </table>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 5. 주화 1개 가치 — 기준이 되는 파결·수결 상세에만. 성당의 '은총의 파편 1개 가치'와
                                같은 자리·같은 카드다. 이 값이 나머지 항목 효율의 분모가 된다. */}
                            {sd.id === COIN_BASIS_ID && ev !== null && ev.perCoin !== null && (
                              <div className={styles.graceValueCard}>
                                <div className={styles.graceValueRow}>
                                  <div className={styles.graceValueLabel}>
                                    <Image src={act.coin.icon} alt={act.coin.name} width={28} height={28} style={{ borderRadius: '50%' }} />
                                    <span>{act.coin.name} 1개 가치</span>
                                  </div>
                                  <div className={styles.graceValueAmount}>
                                    <Image src="/gold.webp" alt="골드" width={20} height={20} />
                                    <span>{Math.round(ev.perCoin).toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className={styles.exCostNote}>
                                  구성 요소 {Math.round(ev.value).toLocaleString()}골드 − 제작 {(sd.gold ?? 0).toLocaleString()}골드
                                  ÷ 주화 {sd.coin}개. 제작소 전체 효율이 이 값을 기준(100%)으로 매겨진다.
                                </div>
                              </div>
                            )}


                            {/* 6. 교환 효율 — 성당의 '은총의 파편 1개 가치' 카드와 같은 꼴.
                                왼쪽에 라벨, 오른쪽에 큰 숫자, 그 아래 계산식 한 줄. */}
                            {paid !== null && ev !== null && ratio !== null && (
                              <div className={styles.graceValueCard}>
                                <div className={styles.graceValueRow}>
                                  <div className={styles.graceValueLabel}>
                                    <Image src={act.coin.icon} alt={act.coin.name} width={28} height={28} style={{ borderRadius: '50%' }} />
                                    <span>교환 효율</span>
                                  </div>
                                  <div className={`${styles.exRatioNum} ${styles.exEffRatioValue} ${ratio >= 1 ? styles.exRatioUp : styles.exRatioFlat}`}>
                                    {Math.round(ratio * 100)}%
                                  </div>
                                </div>
                                <div className={styles.graceValueFormula}>
                                  구성 요소 {Math.round(ev.value).toLocaleString()}G ÷ 교환 비용 {Math.round(paid).toLocaleString()}G
                                </div>
                              </div>
                            )}

                            {sd.note && (
                              <div className={`${styles.infoRow} ${styles.coreRow}`} style={{ marginTop: '0.6rem', display: 'block', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--ct-text-secondary)' }}>
                                {sd.note}
                              </div>
                            )}
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
                    '뇌전의 주화와 빛과 어둠의 주화는 거래 불가·원정대 보관이며 2026년 11월 25일 06:00에 만료됩니다. 카제로스 익스트림 제작소는 특수 제작·젬 제작·성장 재료 제작 세 갈래이고, 제작 목록은 3막과 종막이 똑같습니다. 필요한 주화만 3막은 뇌전의 주화, 종막은 빛과 어둠의 주화로 바뀌고, 고대 코어 선택 상자만 종막 목록에 하나 더 있습니다.',
                    '특수 제작에는 고대 코어 랜덤 상자(주화 50개 + 50,000골드, 원정대 2회, 1770 이상), 유물 각인서 랜덤 주머니(주화 20개 + 5,000골드, 2회, 1780 이상), 유물 전투 각인서 선택 주머니(주화 100개 + 30,000골드, 1회, 1730 이상), 비상의 돌 각인 지정 키트 상자(주화 3개, 40회, 1730 이상), 희귀 지옥 열쇠 교환권(주화 10개 + 15,000골드, 4회, 1730 이상)이 있습니다. 종막의 고대 코어 선택 상자는 혼돈의 주화 2개와 빛과 어둠의 주화 100개, 200,000골드로 원정대 1회(1780 이상) 제작하는데, 혼돈의 주화는 3막과 종막 최초 클리어 때 1개씩만 나오므로 두 막을 모두 클리어해야 만들 수 있습니다.',
                    '주화는 거래가 되지 않으므로 "골드로 얼마짜리냐"를 시세에서 거꾸로 잡습니다. 각 제작 항목의 결과물을 거래소 전일 평균가로 환산한 뒤 제작 골드를 빼면 주화 1개당 순이득이 나오고, 그중 가장 높은 값이 곧 주화 한 개를 다른 곳에 쓸 때 포기하는 값(기회비용)이므로 이를 주화 기준가로 씁니다. 각 항목의 효율은 "결과물을 거래소에서 골드로 살 때의 값 ÷ (주화 수 × 기준가 + 제작 골드)"이며, 기준가를 만든 항목이 100%가 되고 나머지는 그보다 낮게 표시됩니다. 상자 구성이 아직 확인되지 않은 항목은 효율 미산정으로 남겨 둡니다.',
                    '젬 제작은 영웅 젬 선택 상자(주화 20개 + 10,000골드, 2회)가 1730·1770 두 항목으로 따로 있고, 1780 이상에서는 고정형 영웅 젬 선택 상자(주화 100개 + 10,000골드, 1회)를 만들 수 있습니다. 성장 재료 제작에는 익스트림 운명의 파괴/수호석 결정 주머니(주화 15개 + 3,000골드, 4회 · 1770·1780), 익스트림 상급 아비도스 융화 재료 상자(주화 10개 + 5,000골드, 2회 · 1730·1770·1780), 야금술·재봉술 선택 상자 VI(주화 5개, 제작 비용 없음), 정련된 운명의 돌(주화 1개, 100회), 영롱한 혼돈의 돌 무기·방어구(주화 50개)가 들어 있습니다. 같은 이름이 레벨별로 여러 번 보이는 것은 제작 조건이 다른 별개 항목이라 원정대 제한도 각각 따로 붙기 때문입니다.',
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
