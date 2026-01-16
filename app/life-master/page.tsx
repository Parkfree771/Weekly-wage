'use client';

import { Container, Row, Col } from 'react-bootstrap';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import LifeMasterCalculator from '@/components/life-master/LifeMasterCalculator';

export default function LifeMasterPage() {
  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(180deg, rgb(var(--background-start-rgb)) 0%, rgb(var(--background-end-rgb)) 100%)' }}>
      <ThemeToggleButton />
      <Container fluid className="py-3 py-md-4">
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            <LifeMasterCalculator />
          </Col>
        </Row>
      </Container>
    </div>
  );
}
