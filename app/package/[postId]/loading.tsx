import { Container, Row, Col, Spinner } from 'react-bootstrap';

// 상세는 ISR 이라 캐시 미스면 서버 렌더(Firestore+Neon)를 기다린다.
// 이 경계가 없으면 그동안 갤러리 화면이 그대로 멈춰 있어 "눌렀는데 반응 없음" 으로 보인다.
// 라우트 세그먼트에 loading 을 두면 클릭 즉시 이 화면으로 전환된다.
export default function Loading() {
  return (
    <Container fluid className="mt-3 mt-md-4 d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <Row>
        <Col className="text-center">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">로딩 중...</span>
          </Spinner>
          <p className="text-muted">패키지 상세를 불러오는 중입니다...</p>
        </Col>
      </Row>
    </Container>
  );
}
