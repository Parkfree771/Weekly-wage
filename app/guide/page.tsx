import Link from 'next/link';
import { guides } from '@/data/guides';
import styles from './guide.module.css';

export default function GuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <div className={styles.guideIndexHeader}>
          <h1 className={styles.guideIndexTitle}>로스트아크 가이드</h1>
          <p className={styles.guideIndexDesc}>
            로골로골이 제공하는 로스트아크 실전 가이드 모음입니다. 골드 수익 극대화부터 재련 비용 절약까지, 효율적인 플레이에 필요한 정보를 정리했습니다.
          </p>
        </div>

        <div className={styles.guideGrid}>
          {guides.map((guide) => (
            <Link key={guide.slug} href={guide.href} className={styles.guideCard}>
              <span className={styles.guideCardCategory}>{guide.category}</span>
              <h2 className={styles.guideCardTitle}>{guide.title}</h2>
              <p className={styles.guideCardSummary}>{guide.summary}</p>
              <span className={styles.guideCardDate}>{guide.date}</span>
            </Link>
          ))}
        </div>

        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            로골로골 가이드 소개
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            로골로골은 로스트아크 플레이어를 위한 무료 도구와 가이드를 제공하는 팬 사이트입니다.
            주간 골드 계산기, T4 재련 비용 계산기, 생활 콘텐츠 수익 계산기 등의 도구와 함께,
            각 시스템에 대한 상세한 가이드를 제공하여 누구나 쉽게 로스트아크의 경제 시스템을 이해하고
            효율적으로 플레이할 수 있도록 돕고 있습니다.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            모든 가이드는 실제 게임 데이터와 로스트아크 공식 API를 기반으로 작성되었으며,
            시세 변동에 따라 지속적으로 업데이트됩니다. 주간 골드 수익을 극대화하고 싶은 숙련자부터
            골드 수급이 막막한 초보자까지, 모든 플레이어에게 유용한 정보를 담았습니다.
          </p>
        </section>
      </div>
    </div>
  );
}
