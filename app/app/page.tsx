'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/app-download-config';
import { AppleStoreBadge, GooglePlayBadge } from '@/components/StoreBadges';
import { SITE_URL } from '@/lib/site-config';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';
import styles from './app.module.css';

// 스크린샷만 있는 페이지가 되지 않도록, 각 기능이 실제로 무엇을 해주는지 본문으로 설명한다.
const FEATURES = [
  {
    title: '재련 강화 시뮬레이션',
    body: '목표 단계까지 재련을 돌렸을 때 기대되는 재료 소모량과 골드 비용을 확률 기반으로 계산합니다. 장인의 기운 누적과 선재련 여부에 따라 결과가 어떻게 달라지는지 비교할 수 있어, 실제로 재련을 시작하기 전에 예산을 가늠하는 데 씁니다.',
  },
  {
    title: '패키지 효율 계산',
    body: '유료 패키지에 들어 있는 재료와 아이템을 그날의 거래소 시세로 환산해, 결제 금액 대비 실제 가치가 얼마인지 계산합니다. 골드 100당 원화 단가를 기준으로 비교하므로 서로 다른 가격대의 패키지도 같은 잣대로 볼 수 있습니다.',
  },
  {
    title: '주간 레이드 체크리스트 · 숙제 달력',
    body: '캐릭터별로 이번 주 클리어한 레이드와 관문을 체크하면 원정대 주간 골드가 자동으로 합산됩니다. 귀속 골드와 유통 골드를 구분해 보여주고, 숙제 완료 상황은 달력으로 쌓여서 어느 주에 무엇을 빠뜨렸는지 되짚어볼 수 있습니다.',
  },
  {
    title: '골드 수익 기록',
    body: '주차별로 실제 수급한 골드를 기록해 추이를 그래프로 봅니다. 레이드 보상뿐 아니라 직접 입력한 추가 수익까지 합산되므로, 원정대를 늘리거나 레벨을 올린 뒤 주급이 실제로 얼마나 달라졌는지 확인할 수 있습니다.',
  },
  {
    title: '캐릭터 · 장비 · 각인 조회',
    body: '캐릭터명을 검색해 아이템 레벨, 착용 장비, 각인, 아크패시브 구성을 확인합니다. 원정대 전체 목록을 한 번에 불러오므로 어떤 캐릭터를 다음 목표로 잡을지 비교할 때 편합니다.',
  },
  {
    title: '아이템 시세 차트',
    body: '재련 재료와 주요 거래 아이템의 가격 변동을 기간별 차트로 봅니다. 지금 사야 할지 기다려야 할지 판단할 때, 최근 흐름을 한눈에 확인할 수 있습니다.',
  },
];

const SCREENSHOTS = [
  { file: 'shot-01-refining.webp', alt: '재련 강화 시뮬레이션 화면' },
  { file: 'shot-02-package.webp', alt: '패키지 효율 계산 화면' },
  { file: 'shot-03-weekly.webp', alt: '주간 레이드 체크리스트 화면' },
  { file: 'shot-04-income.webp', alt: '골드 수익 기록 화면' },
  { file: 'shot-05-calendar.webp', alt: '숙제 완료 달력 화면' },
  { file: 'shot-06-equipment.webp', alt: '장비·악세·각인 조회 화면' },
  { file: 'shot-07-character.webp', alt: '캐릭터 검색 화면' },
  { file: 'shot-08-price.webp', alt: '아이템 시세 차트 화면' },
];


export default function AppDownloadPage() {
  const shotStripRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // 공유 — 모바일은 시스템 공유 시트, 그 외는 링크 복사
  const shareApp = async () => {
    const url = `${SITE_URL}/app`;
    if (navigator.share) {
      try {
        await navigator.share({ title: '로아로골 앱', url });
        return;
      } catch {
        return; // 공유 시트 취소
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 클립보드 접근 불가 환경은 무시
    }
  };

  // 마우스 휠(세로 스크롤)을 스크린샷 스트립의 가로 스크롤로 변환 — 데스크톱 마우스는 기본적으로 가로 스크롤 입력이 없음
  useEffect(() => {
    const el = shotStripRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className={styles.page}>
      {/* 히어로 */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroIconRow}>
            <Image src="/icon.png" alt="로아로골 앱 아이콘" width={56} height={56} className={styles.heroIcon} />
            <div>
              <div className={styles.heroName}>로아로골</div>
              <div className={styles.heroTagline}>로스트아크 시세 · 재련 시뮬 · 숙제 관리</div>
            </div>
          </div>
          <h1 className={styles.heroTitle}>
            <strong>J들은</strong><br />이런 거 좋아함
          </h1>
          <p className={styles.heroDesc}>
            숙제 체크 · 골드 기록 · 실시간 시세 · 패키지 효율 · 재련 시뮬까지, 한 앱에서.
          </p>
          <div className={styles.storeRow}>
            <AppleStoreBadge href={APP_STORE_URL} />
            <GooglePlayBadge href={PLAY_STORE_URL} />
          </div>
          <button type="button" className={styles.shareBtn} onClick={shareApp}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
            {copied ? '링크 복사 완료' : '공유하기'}
          </button>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.qrBox}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 27" shapeRendering="crispEdges">
              <path fill="#ffffff" d="M0 0h27v27H0z" />
              <path stroke="#1a1f36" d="M1 1.5h7m2 0h2m1 0h4m2 0h7M1 2.5h1m5 0h1m1 0h1m1 0h2m3 0h1m2 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m3 0h3m2 0h1m2 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m2 0h2m1 0h1m1 0h1m3 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h1m6 0h2m1 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m2 0h4m2 0h1m2 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 8.5h3m1 0h2M1 9.5h1m1 0h1m1 0h1m1 0h1m2 0h3m1 0h4m3 0h1m2 0h1M1 10.5h1m1 0h2m5 0h1m6 0h3m5 0h1M4 11.5h1m1 0h2m1 0h1m1 0h4m3 0h1m2 0h1m1 0h3M1 12.5h1m3 0h1m6 0h4m1 0h1m1 0h1m1 0h1m2 0h1M1 13.5h1m5 0h5m2 0h1m1 0h4m2 0h1m1 0h2M2 14.5h1m2 0h1m3 0h1m2 0h1m1 0h1m2 0h3m2 0h1m2 0h1M1 15.5h1m2 0h1m1 0h2m2 0h2m7 0h2m2 0h3M2 16.5h1m1 0h2m4 0h3m1 0h1m2 0h1m3 0h1m2 0h1M1 17.5h1m1 0h2m2 0h2m4 0h2m2 0h6M9 18.5h2m1 0h2m2 0h2m3 0h2m1 0h2M1 19.5h7m3 0h3m2 0h2m1 0h1m1 0h2m1 0h2M1 20.5h1m5 0h1m2 0h2m1 0h2m2 0h1m3 0h2m1 0h2M1 21.5h1m1 0h3m1 0h1m1 0h1m1 0h2m2 0h1m1 0h6m1 0h2M1 22.5h1m1 0h3m1 0h1m3 0h2m4 0h1m2 0h4M1 23.5h1m1 0h3m1 0h1m1 0h3m2 0h1m1 0h1m4 0h1m3 0h1M1 24.5h1m5 0h1m2 0h3m3 0h2m1 0h1m1 0h2m1 0h1M1 25.5h7m1 0h1m1 0h1m1 0h1m2 0h2m1 0h2m3 0h2" />
            </svg>
          </div>
          <span className={styles.qrLabel}>QR 스캔으로 바로 열기</span>
        </div>
      </section>

      {/* 스크린샷 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>앱 미리보기</h2>
        <div className={styles.shotStrip} ref={shotStripRef}>
          {SCREENSHOTS.map((s) => (
            <div key={s.file} className={styles.shotCard}>
              <Image src={`/app-preview/${s.file}`} alt={s.alt} width={480} height={1040} sizes="190px" />
            </div>
          ))}
        </div>
      </section>

      {/* 기능 소개 — 스크린샷만으로는 전달되지 않는 내용을 본문으로 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>앱에서 할 수 있는 것</h2>
        <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
          로아로골 앱은 웹사이트에서 자주 쓰이는 계산기들을 모바일 화면에 맞춰 다시 만든 것입니다. 계산 로직과 시세
          데이터는 웹과 같은 기준을 쓰며, 같은 계정으로 로그인하면 캐릭터 목록과 숙제 체크 상태가 공유됩니다.
          내려받아 쓰는 데 비용은 들지 않습니다.
        </p>
        <div className="row g-3">
          {FEATURES.map((f) => (
            <div className="col-12 col-md-6" key={f.title}>
              <div
                className="h-100 p-3 rounded"
                style={{ backgroundColor: 'var(--card-body-bg-blue)' }}
              >
                <h3 className="h6 fw-semibold" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="small mb-0">{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        <GuideFaq
          guideTitle="앱 이용 가이드"
          intro={[
            'iOS는 App Store, 안드로이드는 Google Play에서 "로아로골"로 검색하거나 위 배지를 눌러 설치할 수 있습니다. 설치와 이용에 비용은 들지 않고, 로그인 없이도 계산기 기능은 그대로 쓸 수 있습니다.',
            '다만 캐릭터 목록과 주간 숙제 체크 기록을 웹과 함께 쓰려면 같은 계정으로 로그인해야 합니다. 로그인하지 않으면 기록이 설치된 기기에만 남습니다. 패키지 등록·좋아요·댓글은 웹 전용 기능이라 앱에서는 조회만 가능합니다.',
          ]}
          faqs={faqData}
          faqTitle="앱 관련 자주 묻는 질문"
        />
      </section>

    </div>
  );
}
