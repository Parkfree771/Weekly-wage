'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Container, Row, Col, Card } from 'react-bootstrap';
import ContactForm from '@/components/ContactForm';
import PriceDashboard from '@/components/PriceDashboard';
import { guides } from '@/data/guides';
import styles from './page.module.css';

// Recharts를 사용하는 컴포넌트를 Dynamic Import로 지연 로드
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
  { ssr: false }
);

export default function Home() {
  return (
    <div className={styles.mainContainer}>
      <Container fluid className="mt-2 mt-md-3" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* SEO를 위한 정적 콘텐츠 - 검색엔진만 읽음 */}
        <noscript>
          <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
            <h2>세르카 레이드 보상 및 주간 골드 계산</h2>
            <p>세르카(1710) 레이드 클리어 골드와 더보기 효율을 완벽 분석합니다.</p>
          </div>
        </noscript>

        {/* 오늘의 시세 + 가격 추이 차트 */}
        <PriceChartProvider dashboard={<div className="mb-3"><PriceDashboard /></div>}>
          {/* 가격 분석 통계 */}
          <PriceComparisonStats />
        </PriceChartProvider>

        {/* 문의하기 & 업데이트 내역 */}
        <Row className="g-3 mt-2">
          <Col md={6}>
            <Card className="h-100" style={{ overflow: 'hidden' }}>
              <Card.Header
                className="py-2"
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                  문의하기
                </h3>
              </Card.Header>
              <Card.Body className="p-0" style={{ overflow: 'hidden' }}>
                <ContactForm />
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="h-100" style={{ overflow: 'hidden' }}>
              <Card.Header
                className="py-2"
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                  업데이트 내역
                </h3>
              </Card.Header>
              <Card.Body className="p-3">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.05</span>
                    <span style={{ color: 'var(--text-primary)' }}>생활 계산 리뉴얼, 마이페이지 주간 골드 기록 차트 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.02</span>
                    <span style={{ color: 'var(--text-primary)' }}>지옥 시뮬 추가 (추후 보상, 패키지 정보 추가 예정)</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.01</span>
                    <span style={{ color: 'var(--text-primary)' }}>붕괴, 불변 이미지 오류 수정</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.31</span>
                    <span style={{ color: 'var(--text-primary)' }}>자동강화 속도 표시 수정, 차트 오늘의 시세 커스텀 기능 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.30</span>
                    <span style={{ color: 'var(--text-primary)' }}>로그인 기능 추가, 원정대 등록 (추후 차트 커스텀화 기능 추가 등 다양한 기능 추가 예정)</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.29</span>
                    <span style={{ color: 'var(--text-primary)' }}>자동강화 속도 선택버튼 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.29</span>
                    <span style={{ color: 'var(--text-primary)' }}>계승 후 16→17→18→19 숨결 개수 수정</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.27</span>
                    <span style={{ color: 'var(--text-primary)' }}>메인 페이지 리뉴얼</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.26</span>
                    <span style={{ color: 'var(--text-primary)' }}>상급 재련 실제 시뮬 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.26</span>
                    <span style={{ color: 'var(--text-primary)' }}>벌목 보유 재료 입력 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.24</span>
                    <span style={{ color: 'var(--text-primary)' }}>더보기 효율 체크 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.23</span>
                    <span style={{ color: 'var(--text-primary)' }}>홈 버튼 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.22</span>
                    <span style={{ color: 'var(--text-primary)' }}>강화 실제 시뮬 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.07</span>
                    <span style={{ color: 'var(--text-primary)' }}>종막 하드 더보기 정보 변경</span>
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* 가이드 섹션 */}
        <section style={{ marginTop: '1.5rem' }}>
          <Card>
            <Card.Header
              className="py-2"
              style={{
                backgroundColor: 'var(--card-header-bg)',
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                로스트아크 가이드
              </h3>
            </Card.Header>
            <Card.Body className="p-3">
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                로스트아크의 골드 수급, 레이드 보상, 재련 시스템, 거래소 시세 등을 정리한 가이드입니다.
              </p>
              <Row className="g-2">
                {guides.slice(0, 4).map((guide) => (
                  <Col key={guide.slug} sm={6}>
                    <Link
                      href={guide.href}
                      style={{
                        display: 'block',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{guide.title}</span>
                      <br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{guide.summary.slice(0, 50)}...</span>
                    </Link>
                  </Col>
                ))}
              </Row>
              <div className="text-center mt-2">
                <Link
                  href="/guide"
                  style={{ fontSize: '0.82rem', color: 'var(--brand-primary)', textDecoration: 'none' }}
                >
                  모든 가이드 보기 &rarr;
                </Link>
              </div>
            </Card.Body>
          </Card>
        </section>

        {/* 서비스 소개 섹션 */}
        <section className="service-intro" style={{ marginTop: '1.5rem' }}>
          <h2>로골로골 - 로스트아크 골드 계산기</h2>
          <p>
            로골로골은 로스트아크 플레이어를 위한 무료 골드 계산 서비스입니다.
            로스트아크 공식 API의 실시간 거래소 시세를 기반으로 주간 골드 수익, 재련 비용, 생활 콘텐츠 손익을 정확하게 계산해드립니다.
          </p>
          <div className="service-features">
            <div className="service-feature-item">
              <h3>주간 골드 계산</h3>
              <p>캐릭터명 입력만으로 원정대 전체 주간 골드 수익과 더보기 손익을 자동 계산합니다.</p>
            </div>
            <div className="service-feature-item">
              <h3>재련 비용 계산</h3>
              <p>T4 일반/상급 재련 비용을 실시간 시세로 계산하고, 재련 시뮬레이션을 체험할 수 있습니다.</p>
            </div>
            <div className="service-feature-item">
              <h3>생활 제작 손익</h3>
              <p>아비도스 융화재료 제작의 실시간 손익을 분석하여 최적의 생활 콘텐츠를 안내합니다.</p>
            </div>
            <div className="service-feature-item">
              <h3>실시간 시세 차트</h3>
              <p>로스트아크 거래소 아이템의 실시간 가격과 과거 시세 추이를 차트로 확인할 수 있습니다.</p>
            </div>
          </div>
        </section>

      </Container>
    </div>
  );
}
