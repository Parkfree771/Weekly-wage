'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
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
   * 없으면 `relatedPages`(도구 페이지) 에서 찾는다.
   * /guide 인덱스에서만 연결되면 크롤링 우선순위가 밀리므로, 도구 페이지에서
   * 해당 문서로 내려가는 링크를 하나씩 만들어 준다.
   */
  relatedGuides?: string[];
  /**
   * 통합된 가이드 본문 (components/guide/*GuideBody).
   * 2026-08-21 에 /guide 하위 글 6편을 각 도구 페이지로 합치면서 생긴 자리다.
   */
  article?: ReactNode;
}

/**
 * 도구 페이지 하단 설명·FAQ 영역.
 *
 * 2026-09-04: 접기 버튼(Collapse)과 FAQ 아코디언을 제거했다.
 * 애드센스 "가치가 별로 없는 콘텐츠" 반려가 반복된 원인 중 하나가
 * 전 페이지가 똑같은 "이용 가이드 · 자주 묻는 질문 보기 ▾" 토글 프레임이었고,
 * FAQ 답변은 아코디언에 숨어 심사자에게 질문 제목만 보였기 때문이다.
 * 이제 본문·FAQ 답변이 항상 펼쳐진 일반 문서 형태로 렌더된다.
 * 접기·아코디언 재도입 금지.
 */
export default function GuideFaq({
  intro,
  sections,
  faqs,
  guideTitle = '이용 가이드',
  faqTitle = '자주 묻는 질문',
  relatedGuides,
  article,
}: GuideFaqProps) {
  const hasGuide = !!(intro?.length || sections?.length || article);
  const hasFaq = !!faqs?.length;
  const related = (relatedGuides ?? [])
    .map((href) => guides.find((g) => g.href === href) ?? relatedPages.find((g) => g.href === href))
    .filter((g): g is (typeof guides)[number] => !!g);

  if (!hasGuide && !hasFaq && related.length === 0) return null;

  return (
    <div className="mt-5">
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
        <section className="mb-4">
          <h2 className="h5 text-primary mb-3">{faqTitle}</h2>
          <dl className={styles.faqList}>
            {faqs!.map((item, i) => (
              <div key={i} className={styles.faqItem}>
                <dt className={styles.faqQ}>{item.q}</dt>
                <dd className={styles.faqA}>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

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
    </div>
  );
}
