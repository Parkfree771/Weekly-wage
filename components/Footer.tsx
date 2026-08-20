'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container, Row, Col, Collapse } from 'react-bootstrap';
import InquiryButton from './InquiryButton';

export default function Footer() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  /**
   * "서비스 소개 · 주요 기능" 소개문은 홈과 사이트 소개에서만 그린다.
   *
   * 이 문단은 주간 골드 계산 얘기라 패키지·각인·팔찌 페이지에서는 주제와 맞지도 않는데,
   * 모든 페이지 푸터에 똑같이 실려 짧은 페이지에서는 본문의 1/4 이 이 반복 텍스트였다.
   * 저작권 문구와 아이콘 출처 표기는 전 페이지에 그대로 남긴다 (법적·귀속 표기).
   */
  const showIntro = pathname === '/' || pathname === '/about';

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
              <Link href="/about">사이트 소개</Link>
              <span className="footer-divider">|</span>
              <Link href="/guide">가이드</Link>
              <span className="footer-divider">|</span>
              <Link href="/app">앱 다운로드</Link>
              <span className="footer-divider">|</span>
              <Link href="/privacy">개인정보처리방침</Link>
              <span className="footer-divider">|</span>
              <Link href="/terms">이용약관</Link>
              <span className="footer-divider">|</span>
              <InquiryButton className="footer-inquiry-link">문의하기</InquiryButton>
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
                {showIntro && (
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
                )}
                <div className="text-center mt-3">
                  <p className="footer-disclaimer">
                    본 사이트는 로스트아크 공식 서비스가 아닙니다.
                  </p>
                  <p className="footer-disclaimer" style={{ marginTop: '0.5rem' }}>
                    [미니게임 아이콘]{' '}
                    <a href="https://www.flaticon.com/free-icons/monster" title="monster icons">Monster icons by Freepik</a>{' · '}
                    <a href="https://www.flaticon.com/free-icons/clouds" title="clouds icons">Clouds icons by juicy_fish</a>{' · '}
                    <a href="https://www.flaticon.com/free-icons/joshua-tree" title="joshua tree icons">Joshua tree icons by Freepik</a>
                    {' - Flaticon'}
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
