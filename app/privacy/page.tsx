'use client';

import { Container, Row, Col, Card } from 'react-bootstrap';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="border-0 shadow-lg">
            <Card.Header className="bg-primary text-white">
              <h1 className="h3 mb-0">개인정보처리방침</h1>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="mb-4">
                <p className="text-muted">최종 수정일: {new Date().toLocaleDateString('ko-KR')}</p>
              </div>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">1. 개인정보의 처리목적</h2>
                <p>로스트아크 골드 계산기는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
                <ul>
                  <li>서비스 제공 및 운영</li>
                  <li>사용자 식별 및 본인확인</li>
                  <li>서비스 개선 및 통계 분석</li>
                  <li>고객 문의 처리</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">2. 처리하는 개인정보의 항목</h2>
                <div className="mb-3">
                  <h6>필수정보 (비로그인 이용 시)</h6>
                  <ul>
                    <li>로스트아크 캐릭터 닉네임 (검색 시 입력)</li>
                    <li>접속 로그, IP 주소</li>
                    <li>쿠키, 접속기록</li>
                  </ul>
                </div>
                <div className="mb-3">
                  <h6>선택정보 (Google 로그인 시)</h6>
                  <ul>
                    <li>Google 계정 이메일 주소</li>
                    <li>Google 계정 프로필 이름 및 프로필 사진 URL</li>
                    <li>Google 계정 고유 식별자(UID)</li>
                    <li>등록한 로스트아크 캐릭터 정보 (닉네임, 직업, 아이템 레벨, 서버)</li>
                    <li>주간 레이드 체크리스트 데이터</li>
                    <li>주간 골드 기록 데이터</li>
                  </ul>
                </div>
                <div>
                  <h6>자동 수집 정보</h6>
                  <ul>
                    <li>Google Analytics를 통한 방문 통계 (페이지 조회수, 방문 시간 등)</li>
                    <li>사용자가 입력한 기타 게임 관련 정보</li>
                  </ul>
                </div>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">3. 개인정보의 처리 및 보유기간</h2>
                <p>
                  개인정보는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터
                  개인정보를 수집시에 동의받은 개인정보 보유·이용기간 내에서 처리·보유합니다.
                </p>
                <ul>
                  <li>웹사이트 방문기록: 3개월</li>
                  <li>비로그인 사용자 입력 정보: 서버에 저장하지 않음 (브라우저 세션 내에서만 사용)</li>
                  <li>Google 로그인 사용자 정보: 회원 탈퇴 시까지 보유 (Google Firebase Firestore에 저장)</li>
                  <li>주간 골드 기록: 회원 탈퇴 시까지 보유</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">4. 개인정보의 제3자 제공</h2>
                <p>
                  원칙적으로 정보주체의 개인정보를 수집·이용 목적으로 명시한 범위 내에서 
                  처리하며, 정보주체의 사전 동의 없이는 본래의 목적 범위를 초과하여 
                  처리하거나 제3자에게 제공하지 않습니다.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">5. 정보주체의 권리·의무 및 행사방법</h2>
                <p>정보주체는 다음과 같은 권리를 행사할 수 있습니다:</p>
                <ul>
                  <li>개인정보 처리현황 통지 요구</li>
                  <li>개인정보 처리정지 요구</li>
                  <li>개인정보 정정·삭제 요구</li>
                  <li>손해배상 청구</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">6. 개인정보보호 책임자</h2>
                <p>개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
                   정보주체의 불만처리 및 피해구제를 위하여 개인정보보호 책임자를 지정하고 있습니다.</p>
                <div className="bg-light p-3 rounded mt-3">
                  <h6 className="fw-semibold">개인정보보호 책임자</h6>
                  <ul className="mb-0">
                    <li>사이트명: 로스트아크 골드 계산기</li>
                    <li>웹사이트: https://lostarkweeklygold.kr</li>
                    <li>운영목적: 로스트아크 게임 정보 제공 및 계산 도구 서비스</li>
                  </ul>
                </div>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">7. 쿠키의 사용</h2>
                <p>
                  본 웹사이트는 사용자에게 개인화된 서비스를 제공하기 위해 쿠키를 사용할 수 있습니다.
                  사용자는 웹브라우저의 설정을 통해 쿠키 사용을 거부할 수 있습니다.
                </p>
                <div className="mt-3">
                  <h6>쿠키 사용 목적</h6>
                  <ul>
                    <li>사용자 설정 저장 (다크모드/라이트모드 등)</li>
                    <li>웹사이트 방문 통계 분석</li>
                    <li>광고 게재 및 효과 측정</li>
                  </ul>
                </div>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">8. 개인정보의 안전성 확보조치</h2>
                <p>본 사이트는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
                <ul>
                  <li>개인정보 취급 직원의 최소화 및 교육</li>
                  <li>해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위한 보안프로그램 설치</li>
                  <li>개인정보에 대한 접근 제한 및 접근 통제</li>
                  <li>개인정보의 안전한 저장 및 전송을 위한 암호화</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">9. Google 로그인 및 회원 서비스</h2>
                <div className="bg-light p-3 rounded mb-3">
                  <h6 className="fw-semibold mb-3">Google OAuth 2.0 로그인</h6>
                  <p className="mb-2">
                    본 웹사이트는 마이페이지 기능 이용을 위해 Google OAuth 2.0 로그인을 제공합니다.
                    Google 로그인 시 다음 정보가 수집됩니다:
                  </p>
                  <ul className="mb-3">
                    <li>Google 계정 이메일 주소</li>
                    <li>Google 계정 표시 이름</li>
                    <li>Google 프로필 사진 URL</li>
                    <li>Google 계정 고유 식별자(UID)</li>
                  </ul>
                  <p className="mb-2">
                    수집된 정보는 사용자 식별, 마이페이지 데이터 관리, 로그인 상태 유지 목적으로만 사용되며,
                    제3자에게 제공하지 않습니다. Google 로그인은 선택 사항이며,
                    로그인하지 않아도 주간 골드 계산, 재련 계산, 생활 계산, 시세 확인 등
                    대부분의 기능을 이용할 수 있습니다.
                  </p>
                  <p className="small text-muted mb-0">
                    ※ Google 로그인 과정에서 비밀번호는 본 사이트에 전달되지 않습니다.
                    인증은 Google 서버에서 처리되며, 본 사이트는 인증 토큰만 수신합니다.
                  </p>
                </div>
                <div className="bg-light p-3 rounded">
                  <h6 className="fw-semibold mb-3">데이터 저장</h6>
                  <p className="mb-2">
                    로그인 사용자의 데이터는 Google Firebase Firestore에 저장됩니다.
                    저장되는 데이터는 다음과 같습니다:
                  </p>
                  <ul className="mb-3">
                    <li>등록한 로스트아크 캐릭터 정보 (닉네임, 직업, 아이템 레벨, 서버, 캐릭터 이미지 URL)</li>
                    <li>주간 레이드 체크리스트 (레이드 클리어 여부, 더보기 구매 여부, 추가 골드)</li>
                    <li>주간 골드 기록 (주별 골드 수입 이력)</li>
                    <li>마지막 주간 초기화 시각</li>
                  </ul>
                  <p className="small text-muted mb-0">
                    ※ Firebase Firestore의 보안 규칙에 따라 각 사용자는 자신의 데이터에만 접근할 수 있으며,
                    다른 사용자의 데이터에는 접근할 수 없습니다.
                  </p>
                </div>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-primary mb-3">10. 데이터 수집 및 사용에 관한 상세 정보</h2>
                <div className="bg-light p-3 rounded">
                  <h6 className="fw-semibold mb-3">본 웹사이트가 수집하는 데이터</h6>
                  <p className="mb-2"><strong>1. 로스트아크 API를 통한 공개 데이터:</strong></p>
                  <ul className="mb-3">
                    <li>캐릭터 닉네임 (사용자가 검색창에 입력한 정보)</li>
                    <li>캐릭터 레벨 및 장비 정보</li>
                    <li>거래소 및 경매장 아이템 가격 정보</li>
                  </ul>
                  <p className="mb-2"><strong>2. 웹사이트 이용 데이터:</strong></p>
                  <ul className="mb-3">
                    <li>Google Analytics를 통한 방문자 통계 (페이지 조회수, 방문 시간 등)</li>
                    <li>Google AdSense를 통한 광고 표시 및 클릭 데이터</li>
                  </ul>
                  <p className="small text-muted mb-0">
                    ※ 비로그인 사용자의 경우, 캐릭터 검색 정보는 서버에 저장되지 않으며
                    브라우저 세션 내에서만 사용됩니다. Google 로그인 사용자의 데이터는
                    위 9항에 명시된 바와 같이 Firebase에 저장됩니다.
                  </p>
                </div>
              </section>

              <div className="alert alert-info">
                <strong>문의사항:</strong> 개인정보 처리방침에 대한 문의사항이 있으시면,
                웹사이트 하단의 연락처를 통해 문의해 주시기 바랍니다.
              </div>

              <div className="text-center mt-5">
                <Link href="/" className="btn btn-primary me-2">
                  메인페이지로 돌아가기
                </Link>
                <Link href="/about" className="btn btn-outline-secondary me-2">
                  사이트 소개
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