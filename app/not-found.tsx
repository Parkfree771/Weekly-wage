'use client'

import Link from 'next/link'
import { Container } from 'react-bootstrap'

export default function NotFound() {
  return (
    <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
      <div className="text-center">
        <h1 className="display-1 fw-bold text-primary">404</h1>
        <h2 className="mb-4">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted mb-4">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <div className="d-flex gap-2 justify-content-center">
          <Link href="/" className="btn btn-primary">
            홈으로 돌아가기
          </Link>
          <Link href="/weekly-gold" className="btn btn-outline-primary">
            골드 계산기
          </Link>
        </div>
      </div>
    </Container>
  )
}
