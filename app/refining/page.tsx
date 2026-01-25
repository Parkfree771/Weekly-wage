'use client';

import { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import RefiningCalculator from '@/components/refining/RefiningCalculator';
import RefiningSimulator from '@/components/refining/RefiningSimulator';
import styles from './refining.module.css';

type RefiningMode = 'normal' | 'succession';
type CalcMode = 'average' | 'simulation';

export default function RefiningPage() {
  const [activeMode, setActiveMode] = useState<RefiningMode>('succession');
  const [calcMode, setCalcMode] = useState<CalcMode>('simulation');

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <ThemeToggleButton />
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            {/* 헤더 */}
            <div className="text-center mb-3 mb-md-4">
              <Link href="/" className="text-decoration-none">
                <div className="d-flex justify-content-center align-items-center gap-3 mb-2" style={{ cursor: 'pointer' }}>
                  <Image
                    src="/banner_share.webp"
                    alt="로스트아크 T4 재련 비용 계산기"
                    width={48}
                    height={48}
                    priority
                    style={{ borderRadius: '8px', width: 'clamp(2.5rem, 5vw, 3rem)', height: 'auto', aspectRatio: '1/1', objectFit: 'cover' }}
                  />
                  <h1
                    className="title mb-0"
                    style={{
                      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                      fontWeight: 700,
                      background: 'var(--gradient-text-stone)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    T4 재련 비용 계산
                  </h1>
                </div>
              </Link>
              <p className="mb-3" style={{fontSize: 'clamp(0.85rem, 1.8vw, 1rem)', fontWeight: '400', color: 'var(--text-muted)'}}>
                목표 레벨까지 필요한 재련 재료와 골드를 계산해보세요
              </p>

              {/* SEO를 위한 정적 콘텐츠 */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                  <h2>로스트아크 T4 재련 비용 계산기</h2>
                  <p>T4 장비 재련에 필요한 재료와 골드를 정확하게 계산합니다. 현재 레벨에서 목표 레벨까지 필요한 모든 재료를 실시간 거래소 가격으로 계산합니다.</p>
                  <h3>계산 가능한 재료</h3>
                  <ul>
                    <li>명예의 파편 (T4)</li>
                    <li>파괴강석 (찬란한 명예의 파괴강석)</li>
                    <li>수호강석 (찬란한 명예의 수호강석)</li>
                    <li>명예의 돌파석</li>
                    <li>운명의 파편</li>
                    <li>재련 골드 비용</li>
                  </ul>
                  <h3>주요 기능</h3>
                  <ul>
                    <li>현재 레벨에서 목표 레벨까지 필요한 재료 자동 계산</li>
                    <li>실시간 거래소 가격 반영</li>
                    <li>총 골드 비용 계산</li>
                    <li>재료별 상세 수량 표시</li>
                  </ul>
                  <p>이 페이지는 JavaScript가 필요합니다. 브라우저에서 JavaScript를 활성화해주세요.</p>
                </div>
              </noscript>
            </div>

            {/* 모드 선택 탭 */}
            <div className={styles.tabContainer}>
              <div className={styles.tabNav}>
                <button
                  className={`${styles.tabLink} ${styles.tabLinkAegir} ${activeMode === 'normal' ? styles.tabLinkActive : ''}`}
                  onClick={() => setActiveMode('normal')}
                >
                  <Image src="/aegir.webp" alt="계승 전" fill className={styles.tabBgImage} />
                  <span className={styles.tabText}>계승 전</span>
                </button>
                <button
                  className={`${styles.tabLink} ${styles.tabLinkCerka} ${activeMode === 'succession' ? styles.tabLinkActive : ''}`}
                  onClick={() => setActiveMode('succession')}
                >
                  <Image src="/cerka.webp" alt="계승 후" fill className={styles.tabBgImage} />
                  <span className={styles.tabText}>계승 후</span>
                </button>
              </div>

              {/* 계산 모드 선택 버튼 */}
              <div className={styles.calcModeContainer}>
                <button
                  className={`${styles.calcModeBtn} ${calcMode === 'average' ? styles.calcModeBtnActive : ''}`}
                  onClick={() => setCalcMode('average')}
                >
                  평균 시뮬
                </button>
                <button
                  className={`${styles.calcModeBtn} ${calcMode === 'simulation' ? styles.calcModeBtnActive : ''}`}
                  onClick={() => setCalcMode('simulation')}
                >
                  실제 시뮬
                </button>
              </div>
            </div>

            {/* 재련 계산기 또는 시뮬레이터 */}
            {calcMode === 'average' ? (
              <RefiningCalculator mode={activeMode} />
            ) : (
              <RefiningSimulator mode={activeMode} />
            )}
          </Col>
        </Row>

        {/* SEO 정보성 콘텐츠 */}
        <Row className="justify-content-center mt-5 mb-4">
          <Col xl={10} lg={11} md={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px', backgroundColor: 'var(--card-body-bg-stone)' }}>
              <Card.Body className="p-4">
                <h2 className="h5 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  T4 재련 비용 계산기 가이드
                </h2>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>계산 모드 안내</h3>
                  <ul className="mb-0 small" style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    <li className="mb-1"><strong>평균 시뮬:</strong> 확률 기반으로 평균적인 재련 비용을 계산합니다. 장기적인 재료 수급 계획에 적합합니다.</li>
                    <li className="mb-1"><strong>실제 시뮬:</strong> 실제 재련처럼 성공/실패를 시뮬레이션합니다. 운에 따른 편차를 확인할 수 있습니다.</li>
                    <li className="mb-1"><strong>계승 전/후:</strong> 1710 계승 전후로 재련 재료가 다르므로 해당하는 모드를 선택하세요.</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>필요 재료 종류</h3>
                  <ul className="mb-0 small" style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    <li><strong>파괴강석/수호강석:</strong> 무기/방어구 재련의 기본 재료</li>
                    <li><strong>명예의 돌파석:</strong> 재련 단계별 필수 소모 재료</li>
                    <li><strong>명예의 파편:</strong> 대량으로 필요한 재련 재료</li>
                    <li><strong>골드:</strong> 재련 시도마다 소모되는 비용</li>
                    <li><strong>융화 재료:</strong> 1540 이상 구간에서 추가로 필요</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>자주 묻는 질문</h3>
                  <div className="small" style={{ color: 'var(--text-muted)' }}>
                    <p className="mb-2"><strong>Q. 재련 확률은 어떻게 적용되나요?</strong><br />
                    A. 로스트아크 공식 재련 확률을 기반으로 계산하며, 장인의 기운(아템) 누적도 반영됩니다.</p>
                    <p className="mb-2"><strong>Q. 골드 비용은 정확한가요?</strong><br />
                    A. 재료 가격은 실시간 거래소 시세를 반영하며, 재련 골드는 인게임 고정 비용을 적용합니다.</p>
                    <p className="mb-0"><strong>Q. 귀속 재료는 어떻게 계산하나요?</strong><br />
                    A. 귀속 재료가 있다면 해당 수량만큼 거래소 구매 비용에서 차감됩니다.</p>
                  </div>
                </div>

                <div className="small" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <strong>TIP:</strong> 재련 이벤트나 파괴/수호강석 가격 변동 시 재계산하여 최적의 재련 타이밍을 찾아보세요.
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
