'use client';

import { useEffect } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container fluid className="mt-3 mt-md-4">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Alert variant="danger" className="text-center">
            <Alert.Heading>앗! 문제가 발생했습니다</Alert.Heading>
            <p className="mb-3">
              예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Button variant="primary" onClick={() => reset()}>
                다시 시도
              </Button>
              <Button variant="outline-secondary" onClick={() => window.location.href = '/'}>
                홈으로 돌아가기
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-3 text-start">
                <summary>개발자 정보 (개발 모드에서만 표시)</summary>
                <pre className="mt-2 p-2 bg-light border rounded" style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </Alert>
        </Col>
      </Row>
    </Container>
  );
}