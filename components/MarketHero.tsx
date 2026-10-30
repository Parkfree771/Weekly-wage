import type { PackagePost } from '@/types/package';
import HeroPackageCard from './HeroPackageCard';
import styles from './MarketHero.module.css';

// 1×1 투명 GIF — 모바일에서 배경 그림 대신 고르게 해 내려받지 않는다
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * 홈 맨 위 띠 — 알데바란의 바다(2026 겨울) 배경.
 *
 * 배경은 스마일게이트 공식 배경화면(카다룸 제도)을 잘라 줄인 것(public/hero/). 배경 그림에서는 로고·저작권 문구를
 * 잘라냈고, 오른쪽 아래에 같은 배경화면(3840×2160)의 "SEASON3 LOSTARK" 글자만 따로 오려 낸 투명 PNG
 * (public/hero/lostark-season3-wordmark.png)를 왼쪽 위에 얹고, 출처는 오른쪽 아래에 단다.
 * 시즌이 바뀌면 배경 두 장과 글자 PNG 를 같은 방식으로 갈아끼운다.
 * 그림이 주인공이라 막(scrim)·제목 글자 없이 밝게 두고, 왼쪽 아래에 판매 중 패키지 카드만 얹는다
 * (서버가 lib/home-packages.ts 로 넘긴다. 판매 중인 게 없으면 그림만).
 * 공식 이벤트 카드를 얹었다가 관심이 없어 뺐다 — 2026-10-30.
 * 모바일(<768)에서는 띠 전체를 숨긴다 — 그 자리는 차트 위 즐겨찾기 시세 줄(FavoriteTicker)이 맡는다.
 */
export default function MarketHero({ packages = [] }: { packages?: PackagePost[] }) {
  return (
    <section className={styles.hero} aria-label="알데바란의 바다">
      {/* 배경 — 데스크톱은 첫 화면 맨 위라 바로 받는다(LCP). 폭에 따라 1200/2400 중 하나.
          모바일(<768)은 띠를 통째로 숨기므로(즐겨찾기 시세 줄이 그 자리를 맡는다) 그림도 받지 않는다 —
          display:none 이어도 <img> 는 내려받으니, 모바일 조건에 1×1 투명 그림을 고르게 한다 */}
      <picture>
        <source media="(max-width: 767.98px)" srcSet={BLANK} />
        <img
          className={styles.bg}
          src="/hero/aldebaran-sea-1200.webp"
          srcSet="/hero/aldebaran-sea-1200.webp 1200w, /hero/aldebaran-sea-2400.webp 2400w"
          sizes="(max-width: 991px) 100vw, 1400px"
          alt=""
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <picture>
        <source media="(max-width: 767.98px)" srcSet={BLANK} />
        <img className={styles.wordmark} src="/hero/lostark-season3-wordmark.png" alt="LOST ARK SEASON 3" width={252} height={77} decoding="async" />
      </picture>
      <span className={styles.credit}>배경 © Smilegate RPG</span>

      {packages.length > 0 && (
        <div className={styles.pkgRow}>
          {packages.map((p) => <HeroPackageCard key={p.id} post={p} />)}
        </div>
      )}
    </section>
  );
}
