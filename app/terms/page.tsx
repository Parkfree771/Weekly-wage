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
                  <li>서비스는 무료로 제공되며, 별도의 회원가입 없이 이용 가능합니다.</li>
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

              <div className="alert alert-info mt-4">
                <strong>알림:</strong> 본 서비스는 로스트아크 공식 서비스가 아니며, 
                스마일게이트와 무관한 개인이 운영하는 팬사이트입니다.
              </div>

              <div className="text-center mt-5">
                <Link href="/" className="btn btn-success">
                  메인페이지로 돌아가기
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}