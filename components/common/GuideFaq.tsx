'use client';

import { useState } from 'react';
import { Accordion, Collapse } from 'react-bootstrap';

export interface GuideSection {
  /** 소제목 (h3) */
  heading: string;
  /** 문단 목록. 각 문자열이 하나의 <p> 로 렌더링됩니다 */
  paragraphs: string[];
  /** 선택: 불릿 리스트 */
  bullets?: string[];
}

export interface FaqItem {
  q: string;
  a: string;
}

interface GuideFaqProps {
  /** 상단 소개 문단 (선택) */
  intro?: string[];
  /** 본문 가이드 섹션들 */
  sections?: GuideSection[];
  /** FAQ 문항 - layout.tsx의 FAQPage JSON-LD와 동일한 배열을 넘겨 중복 없이 재사용하세요 */
  faqs?: FaqItem[];
  /** 가이드 영역 상단 제목. 기본값 "이용 가이드" */
  guideTitle?: string;
  /** FAQ 영역 상단 제목. 기본값 "자주 묻는 질문" */
  faqTitle?: string;
}

export default function GuideFaq({
  intro,
  sections,
  faqs,
  guideTitle = '이용 가이드',
  faqTitle = '자주 묻는 질문',
}: GuideFaqProps) {
  const [open, setOpen] = useState(false);

  const hasGuide = !!(intro?.length || sections?.length);
  const hasFaq = !!faqs?.length;

  if (!hasGuide && !hasFaq) return null;

  return (
    <div className="mt-5">
      <button
        type="button"
        className="btn btn-link p-0 h5 text-primary text-decoration-none"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {guideTitle} · {faqTitle} 보기 {open ? '▴' : '▾'}
      </button>
      <Collapse in={open}>
        <div className="mt-3">
          {hasGuide && (
            <section className="mb-4">
              <h2 className="h5 text-primary mb-3">{guideTitle}</h2>
              {intro?.map((p, i) => (
                <p key={i} className="mb-3">{p}</p>
              ))}
              {sections?.map((sec, i) => (
                <div
                  key={i}
                  className="p-3 rounded mb-3"
                  style={{ backgroundColor: 'var(--card-body-bg-blue)' }}
                >
                  <h3 className="h6 fw-semibold" style={{ color: 'var(--text-primary)' }}>{sec.heading}</h3>
                  {sec.paragraphs.map((p, j) => (
                    <p key={j} className="small mb-2">{p}</p>
                  ))}
                  {sec.bullets && (
                    <ul className="small mb-0">
                      {sec.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {hasFaq && (
            <section>
              <h2 className="h5 text-primary mb-3">{faqTitle}</h2>
              <Accordion alwaysOpen={false}>
                {faqs!.map((item, i) => (
                  <Accordion.Item eventKey={String(i)} key={i}>
                    <Accordion.Header>{item.q}</Accordion.Header>
                    <Accordion.Body className="small">{item.a}</Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </section>
          )}
        </div>
      </Collapse>
    </div>
  );
}
