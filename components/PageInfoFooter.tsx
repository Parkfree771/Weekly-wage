'use client';

import { usePathname } from 'next/navigation';
import { PAGE_INFO } from '@/lib/page-info';

// 페이지 하단 안내(접이식). 사용자에겐 작은 "안내 펼치기" 한 줄만 보이고,
// 내용은 HTML(DOM)에 포함되어 검색·심사 봇이 읽을 수 있음. (display:none 숨김이 아님)
export default function PageInfoFooter() {
  const pathname = usePathname();
  const info = pathname ? PAGE_INFO[pathname] : undefined;
  if (!info) return null;

  const muted = 'var(--text-secondary, #8a8f98)';

  return (
    <section
      aria-label="페이지 안내"
      style={{ maxWidth: '900px', margin: '0 auto', padding: '8px 16px 20px' }}
    >
      <details style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: muted,
            userSelect: 'none',
          }}
        >
          {info.heading} — 안내 및 자주 묻는 질문
        </summary>

        <div style={{ marginTop: '12px', color: muted }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 8px' }}>{info.heading}</h2>

          {info.paragraphs.map((p, i) => (
            <p key={i} style={{ fontSize: '0.8rem', lineHeight: 1.75, margin: '0 0 10px' }}>{p}</p>
          ))}

          {info.faqs && info.faqs.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600, margin: '14px 0 8px' }}>자주 묻는 질문</h3>
              <dl style={{ margin: 0 }}>
                {info.faqs.map((f, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <dt style={{ fontSize: '0.8rem', fontWeight: 600, margin: '0 0 2px' }}>Q. {f.q}</dt>
                    <dd style={{ fontSize: '0.8rem', lineHeight: 1.75, margin: 0 }}>{f.a}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      </details>
    </section>
  );
}
