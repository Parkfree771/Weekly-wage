'use client';

import { useState } from 'react';
import { Container, Row, Col, Collapse } from 'react-bootstrap';

export default function Footer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <footer className="site-footer">
      <Container>
        <Row className="justify-content-center text-center">
          <Col md={8}>
            {/* 첫째 줄: 로아로골 저작권 */}
            <p className="footer-copyright">
              &copy; {new Date().getFullYear()} <strong>로아로골</strong>
            </p>
            {/* 둘째 줄: 스마일게이트 저작권 */}
            <p className="footer-game-copyright">
              [데이터, 이미지 저작권] Smilegate RPG · 공식 서비스가 아닌 팬사이트입니다
            </p>
            {/* 셋째 줄: 링크들 */}
            <div className="footer-links">
              <a href="/about">사이트 소개</a>
              <span className="footer-divider">|</span>
              <a href="/privacy">개인정보처리방침</a>
              <span className="footer-divider">|</span>
              <a href="/terms">이용약관</a>
              <span className="footer-divider">|</span>
              <button
                className="footer-toggle"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? '▲ 접기' : '▼ 더보기'}
              </button>
            </div>
          </Col>
        </Row>

        <Collapse in={isOpen}>
          <div>
            <hr className="footer-hr" />
            <Row className="justify-content-center">
              <Col lg={8} md={10}>
                <Row className="gy-3 text-center text-md-start">
                  <Col md={6}>
                    <h6 className="footer-section-title">서비스 소개</h6>
                    <p className="footer-text">
                      원정대 주간 골드 수익을 계산하고 더보기 보상의 손익을 분석하여
                      효율적인 로스트아크 플레이를 도와드립니다.
                    </p>
                    <div className="footer-text">
                      <div>갱신: 매시 정각</div>
                      <div>데이터: 로스트아크 공식 API</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h6 className="footer-section-title">주요 기능</h6>
                    <ul className="footer-list">
                      <li>캐릭터별 주간 골드 수익 계산</li>
                      <li>레이드 더보기 보상 손익 분석</li>
                      <li>실시간 거래소 가격 반영</li>
                    </ul>
                  </Col>
                </Row>
                <div className="text-center mt-3">
                  <p className="footer-disclaimer">
                    본 사이트는 로스트아크 공식 서비스가 아닙니다.
                  </p>
                </div>
              </Col>
            </Row>
          </div>
        </Collapse>
      </Container>
    </footer>
  );
}
