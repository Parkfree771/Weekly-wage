'use client';

import WangapSimulator from '@/components/wangap/WangapSimulator';

export default function WangapPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '2000px', margin: '0 auto', padding: '1rem clamp(0.75rem, 4vw, 2rem) 0' }}>
        <div className="text-center mb-3">
          <h1
            style={{
              fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginTop: 0,
              marginBottom: '0.5rem',
            }}
          >
            완갑 재련 시뮬레이터
          </h1>

          <noscript>
            <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0' }}>
              <h2>로스트아크 완갑 재련 시뮬레이터</h2>
              <p>파괴석 결정과 수호석 결정을 동시에 사용하는 벨가르딘 완갑 재련을 시뮬레이션합니다.</p>
            </div>
          </noscript>
        </div>

        <WangapSimulator />
      </div>
    </div>
  );
}
