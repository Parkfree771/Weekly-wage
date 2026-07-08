'use client';

import dynamic from 'next/dynamic';
import { Container } from 'react-bootstrap';
import Link from 'next/link';
import FeedbackBox from '@/components/FeedbackBox';
import GuideFaq from '@/components/common/GuideFaq';
import styles from './page.module.css';

const HOME_FAQS = [
  {
    q: '로골로골은 무료로 이용할 수 있나요?',
    a: '네, 로골로골의 모든 계산기와 시세 정보는 회원가입이나 로그인 없이 무료로 이용할 수 있습니다. 마이페이지처럼 개인화된 숙제 체크나 즐겨찾기 기능만 로그인이 필요하며, 그 외 주간 골드 계산, 재련 시뮬레이터, 지옥의 나락 보상, 시세 조회 등 핵심 기능은 누구나 바로 사용할 수 있습니다.',
  },
  {
    q: '거래소 시세는 얼마나 자주 갱신되나요?',
    a: '로스트아크 공식 오픈 API를 통해 매시 정각마다 자동으로 거래소·경매장 시세를 갱신합니다. 수동으로 가격을 입력하는 방식이 아니라 서버가 정기적으로 공식 API를 조회해 최신 가격을 반영하므로, 실시간에 가까운 시세로 골드 손익을 계산할 수 있습니다.',
  },
  {
    q: '캐릭터 정보는 어떻게 불러오나요?',
    a: '캐릭터명을 입력하면 로스트아크 공식 Open API(developer-lostark.game.onstove.com)를 통해 아이템 레벨, 직업, 원정대 캐릭터 목록 등을 조회합니다. 비공식적으로 수집한 데이터가 아니라 공식 API 응답을 그대로 사용하기 때문에 인게임 정보와 항상 동일합니다.',
  },
  {
    q: '더보기(모험의 서약) 선택 기준을 어떻게 판단하나요?',
    a: '더보기 효율은 "추가로 받는 재화의 거래소 환산 골드"와 "더보기 소모 재화의 골드 가치"를 비교해 계산합니다. 계산 결과가 초록색으로 표시되면 더보기를 선택하는 쪽이 이득이고, 빨간색이면 기본 보상을 받는 쪽이 유리하다는 뜻입니다. 시세는 매시 갱신되므로 같은 레이드라도 시점에 따라 유불리가 바뀔 수 있습니다.',
  },
  {
    q: '이 사이트는 스마일게이트와 관련이 있나요?',
    a: '아닙니다. 로골로골은 스마일게이트 RPG의 공식 서비스가 아닌 개인이 운영하는 비영리 팬사이트입니다. 로스트아크 관련 상표권과 게임 데이터의 저작권은 스마일게이트 RPG에 있으며, 자세한 내용은 사이트 소개 페이지에서 확인할 수 있습니다.',
  },
];

const PriceDashboard = dynamic(() => import('@/components/PriceDashboard'), {
  loading: () => <div style={{ minHeight: '320px' }} />,
  ssr: false
});

const PriceComparisonStats = dynamic(() => import('@/components/PriceComparisonStats'), {
  loading: () => (
    <div className="text-center py-5" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner-border text-secondary" role="status">
        <span className="visually-hidden">차트 로딩중...</span>
      </div>
    </div>
  ),
  ssr: false
});

const PriceChartProvider = dynamic(
  () => import('@/components/PriceChartContainer').then(mod => ({ default: mod.PriceChartProvider })),
  {
    loading: () => <div style={{ minHeight: '650px' }} />,
    ssr: false
  }
);


export default function Home() {
  return (
    <div className={styles.mainContainer}>
      <Container fluid className="mt-2 mt-md-3" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 오늘의 시세 + 가격 추이 차트 */}
        <PriceChartProvider dashboard={<div className="mb-3"><PriceDashboard /></div>}>
          {/* 가격 분석 통계 */}
          <PriceComparisonStats />
        </PriceChartProvider>

        {/* 익명 의견 박스 (차트·통계 아래 빈 공간) */}
        <FeedbackBox />

        {/* 애드센스 콘텐츠 보강용 소개 텍스트 — 항상 하단 배치 */}
        <div className="mt-4 mt-md-5">
          <h1 className="h4 mb-2">로골로골 - 로스트아크 주간 골드 계산기 &amp; 시세 정보</h1>
          <div className="d-flex flex-wrap gap-2">
            <Link href="/weekly-gold" className="btn btn-sm btn-outline-primary">주간 골드 계산기</Link>
            <Link href="/refining" className="btn btn-sm btn-outline-primary">재련 계산기</Link>
            <Link href="/hell-reward" className="btn btn-sm btn-outline-primary">지옥의 나락 보상</Link>
            <Link href="/life-master" className="btn btn-sm btn-outline-primary">생활의 달인</Link>
            <Link href="/tier" className="btn btn-sm btn-outline-primary">직업 티어표</Link>
            <Link href="/character" className="btn btn-sm btn-outline-primary">캐릭터 검색</Link>
          </div>
        </div>

        <GuideFaq
          guideTitle="로골로골 이용 가이드"
          intro={[
            '로골로골은 로스트아크 원정대의 주간 레이드 골드 수익을 자동으로 계산하고, 거래소·경매장 실시간 시세를 한눈에 보여주는 무료 계산기 모음 사이트입니다. 벨가르딘, 지평의 성당, 세르카, 카제로스 등 최신 레이드의 클리어 골드와 더보기(모험의 서약) 손익을 캐릭터별로 자동 계산하며, T4 재련 비용 시뮬레이터, 지옥의 나락 보상 계산기, 생활의 달인 손익 계산, 직업 티어표, 아크그리드 팔찌·각인 조합 조회 등 원정대 운영에 필요한 도구를 한 곳에서 제공합니다.',
            '모든 시세 데이터는 로스트아크 공식 Open API를 매시 정각 자동 조회해 갱신하며, 캐릭터 정보 역시 수동 입력이 아닌 공식 API 응답을 그대로 사용합니다. 회원가입 없이 캐릭터명만 입력하면 바로 결과를 확인할 수 있습니다.',
          ]}
          sections={[
            {
              heading: '주간 골드 · 더보기 계산',
              paragraphs: [
                '원정대 캐릭터들이 클리어한 레이드를 선택하면 벨가르딘, 지평의 성당, 세르카, 카제로스 등 레이드별 클리어 골드와 더보기 보상의 손익을 실시간 거래소 시세로 자동 계산합니다.',
              ],
              bullets: [
                '캐릭터별·레이드별 주간 골드 수익 합산',
                '더보기 선택 시 이득/손해 여부를 색상으로 즉시 표시',
                '신규 레이드 추가 시 빠르게 반영',
              ],
            },
            {
              heading: '재련 비용 계산 · 강화 시뮬레이터',
              paragraphs: [
                '목표 아이템 레벨까지 필요한 재료 수량과 예상 골드 비용을 계산하고, 실제 확률 기반 강화 시뮬레이션으로 재화 소모량 분포를 미리 확인할 수 있습니다.',
              ],
            },
            {
              heading: '지옥의 나락 · 생활의 달인 · 티어 · 아크그리드',
              paragraphs: [
                '지옥의 나락 보상 계산기로 층별 기대 수익을 확인하고, 생활의 달인에서는 아비도스 융화재료 등 생활 콘텐츠 손익을 분석합니다. 직업 티어표는 이용자 투표를 집계해 매치업 상대 우위를 보여주며, 팔찌·각인·아크그리드 페이지에서는 조합별 옵션과 효율을 조회할 수 있습니다.',
              ],
            },
          ]}
          faqs={HOME_FAQS}
        />

      </Container>
    </div>
  );
}
