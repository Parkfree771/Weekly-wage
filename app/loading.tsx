import { Container, Row, Col, Spinner } from 'react-bootstrap';

export default function Loading() {
  return (
    <Container fluid className="mt-3 mt-md-4 d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <Row>
        <Col className="text-center">
          {/* 안내 문구를 텍스트로 두지 않는다 — 스트리밍 HTML 에 그대로 실려 봇이 모든 페이지 첫머리에서 같은 문장을 읽는다 */}
          <Spinner animation="border" role="status" aria-label="로딩 중" />
        </Col>
      </Row>
    </Container>
  );
}