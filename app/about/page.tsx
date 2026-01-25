'use client';

import { Container, Row, Col, Card } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <Container className="mt-4 mb-5">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="border-0 shadow-lg">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex align-items-center gap-2">
                <Image src="/icon.png" alt="로고" width={32} height={32} style={{ borderRadius: '6px' }} />
                <h1 className="h3 mb-0">사이트 소개</h1>
              </div>
            </Card.Header>
            <Card.Body className="p-4">

              <section className="mb-5">
                <h2 className="h5 text-primary mb-3">로스트아크 골드 계산기란?</h2>
                <p>
                  <strong>로스트아크 골드 계산기</strong>는 로스트아크 플레이어들이 효율적으로 골드를 관리하고
                  수익을 극대화할 수 있도록 도와주는 무료 웹 서비스입니다.
                </p>
                <p>
                  복잡한 레이드 보상 계산, 더보기 효율 분석, 재련 비용 예측 등을
                  실시간 거래소 시세를 반영하여 정확하게 계산해 드립니다.
                </p>
                <p>
                  매주 수십만 골드를 벌어들이는 원정대 운영에서 가장 중요한 것은 <strong>정확한 수익 계산</strong>입니다.
                  어떤 레이드의 더보기가 이득인지, 재련에 얼마나 투자해야 하는지, 생활 콘텐츠는 효율적인지 등
                  플레이어가 매일 고민하는 문제들을 데이터 기반으로 해결해 드립니다.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h5 text-primary mb-3">개발자 소개</h2>
                <div className="bg-light p-4 rounded">
                  <p className="mb-3">
                    안녕하세요. 로스트아크 골드 계산기를 개발하고 운영하고 있는 개발자입니다.
                  </p>
                  <ul className="mb-3">
                    <li><strong>로스트아크 플레이 경력:</strong> 2019년 오픈베타부터 현재까지 활발히 플레이 중</li>
                    <li><strong>주요 콘텐츠:</strong> 레이드, 재련, 생활 콘텐츠 전반에 걸친 경험 보유</li>
                    <li><strong>개발 배경:</strong> 직접 엑셀로 골드 계산을 하다가 불편함을 느껴 웹 서비스로 제작</li>
                  </ul>
                  <p className="mb-0 small text-muted">
                    플레이어로서 직접 느낀 불편함을 해결하고자 이 서비스를 만들었습니다.
                    로스트아크 커뮤니티에 조금이나마 기여하고 싶은 마음으로 무료로 운영하고 있습니다.
                  </p>
                </div>
              </section>

              <section className="mb-5">
                <h2 className="h5 text-primary mb-3">서비스 특징</h2>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="bg-light p-3 rounded h-100">
                      <h6 className="fw-semibold text-dark">정확한 데이터</h6>
                      <p className="small mb-0">
                        로스트아크 공식 Open API를 통해 실시간 거래소 시세를 가져옵니다.
                        매시 정각마다 자동 갱신되어 항상 최신 데이터를 제공합니다.
                        수동 입력이 아닌 API 기반이므로 오류 가능성이 최소화됩니다.
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="bg-light p-3 rounded h-100">
                      <h6 className="fw-semibold text-dark">검증된 계산 로직</h6>
                      <p className="small mb-0">
                        재련 확률, 장인의 기운 누적, 레이드 보상 등 모든 계산은
                        인게임 데이터를 기반으로 검증되었습니다.
                        커뮤니티 피드백을 통해 지속적으로 정확도를 개선하고 있습니다.
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="bg-light p-3 rounded h-100">
                      <h6 className="fw-semibold text-dark">빠른 업데이트</h6>
                      <p className="small mb-0">
                        새로운 레이드나 시스템이 추가되면 빠르게 반영합니다.
                        세르카 레이드 추가, 재련 시스템 변경 등
                        게임 업데이트에 맞춰 서비스를 갱신합니다.
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="bg-light p-3 rounded h-100">
                      <h6 className="fw-semibold text-dark">사용자 친화적</h6>
                      <p className="small mb-0">
                        복잡한 설정 없이 캐릭터명만 입력하면 됩니다.
                        PC와 모바일 모두에서 편리하게 이용할 수 있습니다.
                        직관적인 UI로 누구나 쉽게 사용 가능합니다.
                      </p>
                    </div>
                  </Col>
                </Row>
              </section>

              <section className="mb-5">
                <h2 className="h5 text-primary mb-3">제공 기능</h2>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="bg-light p-3 rounded h-100">
                      <h6 className="fw-semibold text-dark">주간 골드 계산</h6>
                      <ul className="mb-0 small">
                        <li>원정대 전체 주간 골드 수익 계산</li>
                        <li>레이드별 더보기 보상 손익 분석</li>
                        <li>캐릭터 아이템 레벨 자동 조회</li>
                        <li>세르카, 카제로스, 에키드나 등 최신 레이드 지원</li>
                      </ul>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="bg-light p-3 rounded h-100">
                      <h6 className="fw-semibold text-dark">T4 재련 비용 계산</h6>
                      <ul className="mb-0 small">
                        <li>목표 아이템 레벨까지 필요한 재료 계산</li>
                        <li>예상 골드 비용 산출</li>
                        <li>실시간 재료 시세 반영</li>
                        <li>강화 시뮬레이션 기능</li>
                      </ul>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="bg-light p-3 rounded h-100">
                      <h6 className="fw-semibold text-dark">생활의 달인</h6>
                      <ul className="mb-0 small">
                        <li>아비도스 융화재료 제작 손익 분석</li>
                        <li>생활 콘텐츠 효율 계산</li>
                        <li>극한 합성 효율 분석</li>
                      </ul>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="bg-light p-3 rounded h-100">
                      <h6 className="fw-semibold text-dark">시세 정보</h6>
                      <ul className="mb-0 small">
                        <li>거래소 및 경매장 가격 추이 그래프</li>
                        <li>주요 재료 아이템 실시간 시세</li>
                        <li>매시 정각 자동 갱신</li>
                      </ul>
                    </div>
                  </Col>
                </Row>
              </section>

              <section className="mb-5">
                <h2 className="h5 text-primary mb-3">데이터 출처 및 신뢰성</h2>
                <div className="bg-light p-3 rounded">
                  <p className="mb-2">
                    본 사이트의 모든 게임 데이터는 <strong>로스트아크 공식 Open API</strong>를 통해 수집됩니다.
                    비공식 소스나 추측 데이터를 사용하지 않습니다.
                  </p>
                  <ul className="mb-3">
                    <li><strong>캐릭터 정보:</strong> 로스트아크 공식 API (developer-lostark.game.onstove.com)</li>
                    <li><strong>거래소/경매장 시세:</strong> 로스트아크 공식 API 실시간 데이터</li>
                    <li><strong>레이드 보상 정보:</strong> 게임 내 공식 보상 데이터 기반</li>
                    <li><strong>재련 확률:</strong> 인게임 공식 확률표 기반</li>
                    <li><strong>갱신 주기:</strong> 매시 정각 자동 업데이트</li>
                  </ul>
                  <p className="mb-0 small text-muted">
                    데이터의 정확성을 위해 지속적으로 모니터링하고 있으며,
                    오류 발견 시 문의하기를 통해 제보해 주시면 빠르게 수정합니다.
                  </p>
                </div>
              </section>

              <section className="mb-5">
                <h2 className="h5 text-primary mb-3">업데이트 이력</h2>
                <div className="bg-light p-3 rounded">
                  <ul className="mb-0 small">
                    <li><strong>2026.01:</strong> 세르카(1710) 레이드 보상 정보 추가, 더보기 효율 체크 기능 추가</li>
                    <li><strong>2026.01:</strong> 강화 실제 시뮬레이션 기능 추가</li>
                    <li><strong>2025.12:</strong> 생활의 달인 페이지 추가, 아비도스 융화재료 손익 계산</li>
                    <li><strong>2025.11:</strong> T4 재련 비용 계산기 런칭</li>
                    <li><strong>2025.10:</strong> 주간 골드 계산기 서비스 오픈</li>
                  </ul>
                </div>
              </section>

              <section className="mb-5">
                <h2 className="h5 text-primary mb-3">운영 목적</h2>
                <p>
                  본 사이트는 로스트아크 커뮤니티에 기여하고자 하는 목적으로 운영되는
                  <strong> 비영리 팬사이트</strong>입니다.
                </p>
                <ul>
                  <li>플레이어들의 효율적인 골드 관리 지원</li>
                  <li>복잡한 계산을 자동화하여 편의성 제공</li>
                  <li>정확한 데이터 기반의 의사결정 도움</li>
                  <li>로스트아크 커뮤니티 활성화에 기여</li>
                </ul>
                <p className="small text-muted">
                  서비스 운영 비용 충당을 위해 Google AdSense 광고를 게재하고 있습니다.
                  광고 수익은 서버 비용 및 서비스 개선에 사용됩니다.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h5 text-primary mb-3">문의하기</h2>
                <div className="bg-light p-3 rounded">
                  <p className="mb-2">
                    기능 제안, 버그 신고, 데이터 오류 제보, 기타 문의사항이 있으시면
                    <strong> 메인 페이지 하단의 문의하기 폼</strong>을 이용해 주세요.
                  </p>
                  <ul className="mb-2 small">
                    <li><strong>기능 제안:</strong> 새로운 기능이나 개선 아이디어 환영합니다</li>
                    <li><strong>버그 신고:</strong> 오류 발견 시 상세히 알려주시면 빠르게 수정합니다</li>
                    <li><strong>데이터 오류:</strong> 계산 결과가 실제와 다르면 제보해 주세요</li>
                  </ul>
                  <p className="mb-0 small text-muted">
                    소중한 피드백은 서비스 개선에 적극 반영하고 있습니다.
                    모든 문의는 확인 후 최대한 빠르게 답변드리겠습니다.
                  </p>
                </div>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">저작권 및 고지사항</h2>
                <div className="alert alert-secondary mb-0">
                  <p className="mb-2">
                    <strong>본 사이트는 Smilegate RPG 및 Smilegate의 공식 서비스가 아닙니다.</strong>
                  </p>
                  <p className="mb-2">
                    로스트아크(LOST ARK)의 모든 저작권과 상표권은 Smilegate RPG에 있습니다.
                    본 사이트에서 사용된 게임 이미지 및 데이터의 저작권은 Smilegate RPG에 있으며,
                    이 사이트는 게임 정보 제공 목적의 팬사이트입니다.
                  </p>
                  <p className="mb-0 small text-muted">
                    This site is not affiliated with or endorsed by Smilegate RPG or Smilegate.
                    LOST ARK is a trademark of Smilegate RPG. All game images and data are property of Smilegate RPG.
                  </p>
                </div>
              </section>

              <div className="text-center mt-5">
                <Link href="/" className="btn btn-primary me-2">
                  메인페이지로 돌아가기
                </Link>
                <Link href="/privacy" className="btn btn-outline-secondary me-2">
                  개인정보처리방침
                </Link>
                <Link href="/terms" className="btn btn-outline-secondary">
                  이용약관
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
