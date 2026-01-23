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
      <Container fluid className="mt-3 mt-md-4">
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
      </Container>
    </div>
  );
}
