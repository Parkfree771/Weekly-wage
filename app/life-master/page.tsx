'use client';

import { Container, Row, Col } from 'react-bootstrap';
import LifeCraftCalculator from '@/components/life-master/LifeCraftCalculator';
import AdBanner from '@/components/ads/AdBanner';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import { ADFIT_UNITS } from '@/components/ads/adConfig';

export default function LifeMasterPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '2100px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 헤더 - 재련 페이지와 동일한 구조 */}
            <div className="text-center mb-3" style={{ marginTop: 0 }}>
              <h1
                style={{
                  fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: 0,
                  marginBottom: '0.5rem'
                }}
              >
                생활 제작
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                아비도스 융화재료 제작 손익 계산
              </p>

            </div>


            {/* 컨텐츠 */}
            <LifeCraftCalculator />

            {/* 계산기 ↔ 가이드 경계 광고 — 손익을 다 본 뒤 읽을거리로 넘어가는 자리.
                LifeCraftCalculator 안쪽 자리가 index 없는 단일 단위를 쓰므로 여기는 index 0 이어야 한다
                (같은 단위를 한 페이지에 두 번 넣으면 애드핏이 첫 자리만 채운다). */}
            <div className="d-block d-lg-none my-3">
              <AdBanner index={0} />
            </div>
            <DesktopBannerAd adfit={ADFIT_UNITS.galleryBottomDesktop} />
          </Col>
        </Row>

      </Container>
    </div>
  );
}
