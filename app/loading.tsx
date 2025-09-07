import { Container, Row, Col, Spinner } from 'react-bootstrap';

export default function Loading() {
  return (
    <Container fluid className="mt-3 mt-md-4 d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <Row>
        <Col className="text-center">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">로딩 중...</span>
          </Spinner>
          <p className="text-muted">페이지를 불러오는 중입니다...</p>
        </Col>
      </Row>
    </Container>
  );
}