'use client';

import { Container, Row, Col, Card } from 'react-bootstrap';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="border-0 shadow-lg">
            <Card.Header className="bg-success text-white">
              <h1 className="h3 mb-0">이용약관</h1>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="mb-4">
                <p className="text-muted">최종 수정일: {new Date().toLocaleDateString('ko-KR')}</p>
              </div>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제1조 (목적)</h2>
                <p>
                  본 약관은 로스트아크 골드 계산기(이하 "서비스")를 이용함에 있어 
                  서비스 제공자와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제2조 (정의)</h2>
                <ol>
                  <li>"서비스"란 로스트아크 게임의 골드 수익 계산 및 관련 정보 제공 서비스를 말합니다.</li>
                  <li>"이용자"란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
                  <li>"콘텐츠"란 서비스를 통해 제공되는 모든 정보와 자료를 말합니다.</li>
                </ol>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제3조 (서비스의 제공)</h2>
                <ol>
                  <li>서비스는 24시간 이용 가능함을 원칙으로 하나, 시스템 점검 등의 사유로 일시 중단될 수 있습니다.</li>
                  <li>서비스는 무료로 제공되며, 주간 골드 계산, 재련 계산, 생활 계산, 시세 차트 등 주요 기능은 로그인 없이 이용 가능합니다.</li>
                  <li>마이페이지(원정대 등록, 주간 체크리스트, 골드 기록) 기능은 Google 로그인이 필요합니다.</li>
                  <li>서비스에서 제공하는 정보는 참고용이며, 게임 내 실제 상황과 다를 수 있습니다.</li>
                </ol>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제4조 (이용자의 의무)</h2>
                <ol>
                  <li>이용자는 서비스를 선량한 목적으로만 이용해야 합니다.</li>
                  <li>서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.</li>
                  <li>타인의 개인정보를 무단으로 수집하거나 이용해서는 안 됩니다.</li>
                  <li>서비스를 상업적 목적으로 무단 이용해서는 안 됩니다.</li>
                </ol>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제5조 (서비스 제공자의 의무)</h2>
                <ol>
                  <li>서비스 제공자는 안정적인 서비스 제공을 위해 노력합니다.</li>
                  <li>이용자의 개인정보를 보호하기 위해 최선을 다합니다.</li>
                  <li>서비스 개선을 위해 지속적으로 노력합니다.</li>
                </ol>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제6조 (면책조항)</h2>
                <ol>
                  <li>서비스에서 제공하는 정보의 정확성에 대해서는 보장하지 않습니다.</li>
                  <li>서비스 이용으로 인한 직접적, 간접적 손해에 대해 책임지지 않습니다.</li>
                  <li>게임 정책 변경 등으로 인한 정보 오류에 대해서는 면책됩니다.</li>
                  <li>천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해서는 책임지지 않습니다.</li>
                </ol>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제7조 (저작권)</h2>
                <ol>
                  <li>서비스의 콘텐츠에 대한 저작권은 서비스 제공자에게 있습니다.</li>
                  <li>이용자는 서비스의 콘텐츠를 무단으로 복제, 배포할 수 없습니다.</li>
                  <li>로스트아크 관련 이미지, 명칭 등은 스마일게이트의 저작물입니다.</li>
                </ol>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제8조 (광고 및 제휴)</h2>
                <ol>
                  <li>서비스는 광고를 게재할 수 있습니다.</li>
                  <li>광고 내용에 대한 책임은 해당 광고주에게 있습니다.</li>
                  <li>제휴 링크를 통한 거래에 대해서는 책임지지 않습니다.</li>
                </ol>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제9조 (약관의 변경)</h2>
                <p>
                  본 약관은 필요에 따라 변경될 수 있으며, 변경된 약관은 서비스에
                  게시함으로써 효력을 발생합니다.
                </p>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제10조 (데이터 출처 및 정확성)</h2>
                <div className="bg-light p-3 rounded">
                  <h6 className="fw-semibold mb-3">데이터 제공원</h6>
                  <ul className="mb-3">
                    <li><strong>로스트아크 공식 API:</strong> 캐릭터 정보, 레이드 보상, 거래소 가격 등</li>
                    <li><strong>경매장 데이터:</strong> 게임 내 경매장에서 수집한 실시간 가격 정보</li>
                    <li><strong>계산 알고리즘:</strong> 자체 개발한 골드 수익 및 손익 계산 시스템</li>
                  </ul>
                  <p className="small text-muted mb-0">
                    ※ 모든 데이터는 참고용이며, 게임 업데이트나 API 변경에 따라 실제 게임 내 정보와
                    차이가 있을 수 있습니다. 중요한 결정은 게임 내에서 직접 확인 후 진행하시기 바랍니다.
                  </p>
                </div>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제11조 (서비스 이용료)</h2>
                <p>
                  본 서비스는 모든 사용자에게 무료로 제공됩니다. 단, 서비스 운영을 위해
                  Google AdSense 광고가 게재되며, 이는 서비스 유지 및 개선을 위한 수익원으로 사용됩니다.
                </p>
                <ul>
                  <li>모든 계산 기능은 무료로 제공됩니다</li>
                  <li>주요 도구(주간 골드, 재련, 생활, 시세)는 로그인 없이 이용 가능합니다</li>
                  <li>마이페이지 기능은 Google 로그인 후 무료로 이용할 수 있습니다</li>
                  <li>광고를 통해 서비스 운영비를 충당합니다</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제12조 (서비스 제공 시간)</h2>
                <ul>
                  <li>서비스는 연중무휴 24시간 제공을 원칙으로 합니다</li>
                  <li>시스템 점검, 서버 업그레이드 등으로 인해 일시 중단될 수 있습니다</li>
                  <li>로스트아크 공식 API 점검 시간에는 데이터 업데이트가 지연될 수 있습니다</li>
                  <li>예기치 않은 시스템 장애 발생 시 복구까지 시간이 소요될 수 있습니다</li>
                </ul>
              </section>

              <section className="mb-4">
                <h2 className="h5 text-success mb-3">제13조 (금지행위)</h2>
                <p>이용자는 다음 각 호의 행위를 해서는 안 됩니다:</p>
                <ol>
                  <li>서비스의 안정적 운영을 방해하는 행위 (과도한 API 호출, DDoS 공격 등)</li>
                  <li>타인의 정보를 도용하거나 허위 정보를 입력하는 행위</li>
                  <li>서비스를 통해 얻은 정보를 무단으로 상업적으로 이용하는 행위</li>
                  <li>서비스의 소스코드를 무단으로 복제, 배포하는 행위</li>
                  <li>법령 또는 본 약관을 위반하는 행위</li>
                </ol>
              </section>

              <div className="alert alert-warning mt-4">
                <h6 className="fw-semibold">중요 공지사항</h6>
                <ul className="mb-0 small">
                  <li>본 서비스는 로스트아크 공식 서비스가 아니며, 스마일게이트와 무관한 팬사이트입니다</li>
                  <li>로스트아크, Lost Ark 및 관련 이미지는 스마일게이트 RPG의 등록 상표입니다</li>
                  <li>본 사이트의 모든 계산 결과는 참고용이며, 실제 게임 플레이 시 차이가 있을 수 있습니다</li>
                </ul>
              </div>

              <div className="alert alert-info mt-3">
                <strong>약관 개정 안내:</strong> 약관이 변경되는 경우, 변경된 약관은 웹사이트에
                공지하며, 변경된 약관의 시행일 이후 서비스를 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주됩니다.
              </div>

              <div className="text-center mt-5">
                <Link href="/" className="btn btn-success me-2">
                  메인페이지로 돌아가기
                </Link>
                <Link href="/about" className="btn btn-outline-secondary me-2">
                  사이트 소개
                </Link>
                <Link href="/privacy" className="btn btn-outline-secondary">
                  개인정보처리방침
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}