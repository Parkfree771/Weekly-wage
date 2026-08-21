'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Accordion, Collapse } from 'react-bootstrap';
import { guides, relatedPages } from '@/data/guides';
import styles from './GuideFaq.module.css';

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
  /**
   * 관련 페이지 경로. data/guides.ts 의 `guides`(가이드 글) 에서 먼저 찾고,
   * 없으면 `relatedPages`(도구 페이지) 에서 찾는다. 접기 영역 *밖에* 항상 노출된다.
   * /guide 인덱스에서만 연결되면 크롤링 우선순위가 밀리므로, 도구 페이지에서
   * 해당 문서로 내려가는 링크를 하나씩 만들어 준다.
   */
  relatedGuides?: string[];
  /**
   * 통합된 가이드 본문 (components/guide/*GuideBody).
   * 2026-08-21 에 /guide 하위 글 6편을 각 도구 페이지로 합치면서 생긴 자리다.
   * 접기 영역 *안*이지만 기본 펼침이라 SSR HTML 에 그대로 들어간다.
   */
  article?: ReactNode;
}

export default function GuideFaq({
  intro,
  sections,
  faqs,
  guideTitle = '이용 가이드',
  faqTitle = '자주 묻는 질문',
  relatedGuides,
  article,
}: GuideFaqProps) {
  // 기본 펼침 — 애드센스 심사·크롤러가 보는 첫 화면에 본문이 그대로 노출되어야 한다.
  // (기본 접힘이던 시절 "가치가 별로 없는 콘텐츠"로 반복 반려됨 — 접기는 사용자가 원할 때만)
  const [open, setOpen] = useState(true);

  const hasGuide = !!(intro?.length || sections?.length || article);
  const hasFaq = !!faqs?.length;
  const related = (relatedGuides ?? [])
    .map((href) => guides.find((g) => g.href === href) ?? relatedPages.find((g) => g.href === href))
    .filter((g): g is (typeof guides)[number] => !!g);

  if (!hasGuide && !hasFaq && related.length === 0) return null;

  return (
    <div className="mt-5">
      {related.length > 0 && (
        <div className={styles.related}>
          <div className={styles.relatedHead}>함께 보면 좋은 페이지</div>
          <div className={styles.relatedGrid}>
            {related.map((g) => (
              <Link key={g.href} href={g.href} className={styles.card}>
                <span className={styles.cardCategory}>{g.category}</span>
                <div className={styles.cardTitle}>{g.title}</div>
                <p className={styles.cardSummary}>{g.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
      {(hasGuide || hasFaq) && (
      <button
        type="button"
        className="btn btn-link p-0 small text-decoration-none"
        style={{ color: 'var(--text-muted)' }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {hasGuide && hasFaq ? `${guideTitle} · ${faqTitle}` : hasGuide ? guideTitle : faqTitle} 보기 {open ? '▴' : '▾'}
      </button>
      )}
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

          {article && <div className={styles.article}>{article}</div>}

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
