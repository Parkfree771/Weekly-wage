'use client';

import { Container, Row, Col, Card } from 'react-bootstrap';
import LifeMasterCalculator from '@/components/life-master/LifeMasterCalculator';

export default function LifeMasterPage() {
  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(180deg, rgb(var(--background-start-rgb)) 0%, rgb(var(--background-end-rgb)) 100%)' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            {/* SEO를 위한 정적 콘텐츠 */}
            <noscript>
              <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                <h1>생활 계산기</h1>
                <p>로스트아크 생활 콘텐츠 효율을 계산하고 아비도스 융화재료 제작 손익을 분석합니다.</p>
                <h2>주요 기능</h2>
                <ul>
                  <li>상급 아비도스 융화재료 제작 효율 계산</li>
                  <li>생활의 가루 수익 분석</li>
                  <li>벌목, 채광, 낚시, 수렵, 고고학 효율 비교</li>
                  <li>실시간 거래소 시세 반영</li>
                </ul>
                <h2>지원하는 생활 콘텐츠</h2>
                <ul>
                  <li>벌목: 부드러운 목재, 아비도스 목재</li>
                  <li>채광: 철 광석, 아비도스 광석</li>
                  <li>낚시: 생선류</li>
                  <li>수렵: 고기류</li>
                  <li>고고학: 유물류</li>
                </ul>
                <p>이 페이지는 JavaScript가 필요합니다. 브라우저에서 JavaScript를 활성화해주세요.</p>
              </div>
            </noscript>
            <LifeMasterCalculator />
          </Col>
        </Row>

        {/* SEO 정보성 콘텐츠 */}
        <Row className="justify-content-center mt-5 mb-4">
          <Col xl={10} lg={11} md={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px', backgroundColor: 'var(--card-body-bg-stone)' }}>
              <Card.Body className="p-4">
                <h2 className="h5 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  생활의 달인 가이드
                </h2>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>아비도스 융화 재료란?</h3>
                  <p className="mb-0 small" style={{ color: 'var(--text-muted)' }}>
                    아비도스 융화 재료는 T4 고레벨 재련(1540+)에 필요한 특수 재료입니다.
                    생활 콘텐츠를 통해 획득한 재료를 융화 재료로 제작하여 거래소에 판매하거나
                    직접 재련에 사용할 수 있습니다.
                  </p>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>손익 계산 방법</h3>
                  <ul className="mb-0 small" style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    <li className="mb-1"><strong>제작 비용:</strong> 기본 재료 시세 + 제작 골드 비용</li>
                    <li className="mb-1"><strong>판매 수익:</strong> 거래소 판매가 - 수수료(5%)</li>
                    <li className="mb-1"><strong>순이익:</strong> 판매 수익 - 제작 비용</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>생활 콘텐츠별 재료</h3>
                  <ul className="mb-0 small" style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    <li><strong>낚시:</strong> 생선류 → 오레하 융화 재료</li>
                    <li><strong>수렵:</strong> 고기류 → 오레하 융화 재료</li>
                    <li><strong>벌목:</strong> 목재류 → 상급/최상급 융화 재료</li>
                    <li><strong>채광:</strong> 광석류 → 상급/최상급 융화 재료</li>
                    <li><strong>고고학:</strong> 유물류 → 아비도스 융화 재료</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>자주 묻는 질문</h3>
                  <div className="small" style={{ color: 'var(--text-muted)' }}>
                    <p className="mb-2"><strong>Q. 극한 합성이 뭔가요?</strong><br />
                    A. 일반 합성보다 높은 비용으로 더 많은 융화 재료를 얻는 제작 방식입니다.</p>
                    <p className="mb-2"><strong>Q. 직접 사용 vs 판매 중 뭐가 나을까요?</strong><br />
                    A. 재련이 필요하다면 직접 사용이 수수료를 아낄 수 있고, 급하지 않다면 시세를 보고 판매하세요.</p>
                    <p className="mb-0"><strong>Q. 시세는 실시간인가요?</strong><br />
                    A. 매시 정각 로스트아크 공식 API에서 최신 거래소 시세를 가져옵니다.</p>
                  </div>
                </div>

                <div className="small" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <strong>TIP:</strong> 융화 재료 시세는 레이드 패치나 이벤트에 따라 크게 변동됩니다. 제작 전 항상 현재 시세를 확인하세요.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* 푸터 */}
      <footer style={{ padding: '1.5rem 0', marginTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
        <Container>
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <p className="small mb-2" style={{ color: 'var(--text-muted)' }}>
                &copy; {new Date().getFullYear()} <strong style={{ color: 'var(--text-primary)' }}>로스트아크 골드 계산기</strong>
              </p>
              <div className="d-flex justify-content-center gap-3">
                <a href="/about" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  사이트 소개
                </a>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <a href="/privacy" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  개인정보처리방침
                </a>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <a href="/terms" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  이용약관
                </a>
              </div>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
}
