import GrowthSimulator from '@/components/growth/GrowthSimulator';
import GrowthSummary from '@/components/growth/GrowthSummary';

export default function GrowthPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '1rem 0 3rem' }}>
      <h1
        style={{
          textAlign: 'center',
          fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 0.85rem',
        }}
      >
        연마 · 재련 · 마력 주입
      </h1>
      <div style={{ padding: '0 1rem' }}>
        <GrowthSimulator />
        <GrowthSummary />
      </div>
    </div>
  );
}
