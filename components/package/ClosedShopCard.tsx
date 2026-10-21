// 패키지 가뭄 카드 — 신규 패키지가 몇 주째 안 나올 때 갤러리 1페이지 맨 앞에 끼우는 웃픈 카드.
// "다 무너진 건물에 '우리식당 정상영업 합니다' 현수막" 사진을 옮겼다: 무너진 건물 + "로아로골 정상영업 합니다" 현수막 + 안전제일 바리케이드.
// 누를 곳이 없는 장식 카드라 클릭·상세 이동이 없다. 패키지가 다시 나오면 갤러리의 SHOW_CLOSED_SHOP_CARD 만 끈다.
import Link from 'next/link';
import styles from './ClosedShopCard.module.css';

// 마지막 신규 상품 공지일(상점 "신규 상품 및 확률 안내") — 새 패키지가 나오면 카드 자체를 끄므로 고칠 일은 없다
const LAST_RELEASE_KST = Date.parse('2026-09-23T00:00:00+09:00');
const LAST_RELEASE_LABEL = '9월 23일';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 마지막 출시 뒤로 지나간 수요일 업데이트 수 */
const weeksSinceLastRelease = () => Math.max(0, Math.floor((Date.now() - LAST_RELEASE_KST) / WEEK_MS));

export default function ClosedShopCard() {
  return (
    <article className={styles.card} aria-label="로아로골 정상영업 안내">
      {/* 머리 줄 — 갤러리 카드의 좌우 분할 대신 가운데 한 줄 + 바닥에 공사장 띠 */}
      <header className={styles.head}>
        {/* 주 수는 렌더 시각 기준이라 서버·브라우저가 주 경계에서 갈릴 수 있다 — 경고만 끈다 */}
        <p className={styles.headLine} suppressHydrationWarning>
          마지막 신규 패키지 {LAST_RELEASE_LABEL} · <strong className={styles.headWeeks}>{weeksSinceLastRelease()}주째</strong> 소식 없음
        </p>
      </header>

      <div className={styles.scene}>
        {/* 하늘 빈자리에 띄운 바로가기 — 패키지 대신 볼 거리로 익스트림 제작소를 건넨다 */}
        <Link href="/extreme" className={styles.extremeLink} prefetch={false}>
          익스 제작소 효율 바로가기
          <svg viewBox="0 0 12 12" className={styles.extremeLinkIcon} aria-hidden="true">
            <path d="M4 2 L8 6 L4 10" />
          </svg>
        </Link>
        <svg
          className={styles.svg}
          viewBox="0 0 520 260"
          preserveAspectRatio="xMidYMax slice"
          role="img"
          aria-label="무너진 건물에 로아로골 정상영업 현수막이 걸려 있다"
        >
          <defs>
            <linearGradient id="csSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className={styles.skyTop} />
              <stop offset="1" className={styles.skyBottom} />
            </linearGradient>
          </defs>

          {/* 하늘 */}
          <rect x="0" y="0" width="520" height="260" fill="url(#csSky)" />

          {/* 먼 건물 */}
          <g className={styles.farBldg}>
            <rect x="0" y="150" width="70" height="70" />
            <rect x="445" y="140" width="75" height="80" />
            <rect x="420" y="168" width="40" height="52" />
          </g>

          {/* 왼쪽 위 기와 탑 — 사진의 지붕만 멀쩡한 옥탑 */}
          <rect className={styles.wall} x="118" y="58" width="58" height="40" />
          <path className={styles.roof} d="M108 60 L120 46 L174 46 L186 60 Z" />

          {/* 본 건물 벽 — 윗선이 뜯겨 나간 모양 */}
          <path
            className={styles.wall}
            d="M86 222 L86 104 L104 92 L132 98 L158 86 L196 96 L228 84 L262 94 L300 82 L338 92 L372 80 L398 96 L404 222 Z"
          />
          {/* 벽 그늘 — 오른쪽 면 */}
          <path className={styles.wallShade} d="M398 96 L404 222 L384 222 L380 102 Z" />

          {/* 2층 슬래브 — 가운데가 내려앉았다 */}
          <path className={styles.slab} d="M80 148 L190 140 L260 160 L332 146 L410 150 L410 158 L332 155 L260 170 L190 149 L80 156 Z" />
          {/* 지붕 슬래브 잔해 — 기울어진 판 */}
          <path className={styles.slab} d="M92 94 L236 78 L240 86 L96 102 Z" />
          <path className={styles.slab} d="M268 90 L404 92 L400 100 L270 98 Z" />

          {/* 창 구멍 */}
          <g className={styles.hole}>
            <rect x="108" y="108" width="34" height="30" />
            <rect x="214" y="106" width="30" height="28" />
            <rect x="304" y="104" width="36" height="34" />
            <rect x="110" y="166" width="32" height="40" />
            <rect x="350" y="168" width="28" height="38" />
          </g>

          {/* 녹색 천 — 사진의 걸려 있는 천막 조각 */}
          <path className={styles.cloth} d="M150 98 L162 98 L166 126 L158 140 L152 124 Z" />
          <path className={styles.cloth} d="M176 100 L186 100 L184 132 L178 120 Z" />

          {/* 철근 — 슬래브에서 늘어진 선 */}
          <g className={styles.rebar}>
            <path d="M118 96 Q124 112 116 126" />
            <path d="M196 92 Q204 110 198 128" />
            <path d="M244 82 Q252 100 246 118" />
            <path d="M282 90 Q292 104 286 124" />
            <path d="M362 84 Q372 100 366 116" />
            <path d="M206 152 Q214 168 208 182" />
            <path d="M318 154 Q326 168 320 184" />
            <path d="M262 168 Q270 182 264 196" />
          </g>

          {/* 잔해 더미 */}
          <g className={styles.rubble}>
            <path d="M40 232 L70 204 L110 196 L150 210 L196 192 L240 206 L284 190 L330 204 L372 194 L420 210 L470 202 L500 232 Z" />
          </g>
          <g className={styles.rubbleLight}>
            <path d="M74 214 L90 206 L102 214 L88 220 Z" />
            <path d="M132 210 L150 202 L160 212 L144 218 Z" />
            <path d="M186 204 L204 196 L214 206 L196 212 Z" />
            <path d="M246 208 L262 198 L276 208 L258 214 Z" />
            <path d="M300 204 L316 196 L326 206 L308 212 Z" />
            <path d="M352 208 L372 200 L382 210 L362 216 Z" />
            <path d="M412 212 L428 206 L438 214 L422 220 Z" />
          </g>

          {/* 땅 */}
          <rect className={styles.ground} x="0" y="230" width="520" height="30" />

          {/* 현수막 — 무너진 건물 앞에서 혼자 멀쩡하다 */}
          <g transform="rotate(-1.5 300 128)">
            <line className={styles.bannerRope} x1="176" y1="114" x2="186" y2="118" />
            <line className={styles.bannerRope} x1="424" y1="114" x2="414" y2="118" />
            <rect className={styles.banner} x="186" y="114" width="228" height="30" rx="1" />
            <text className={styles.bannerText} x="300" y="135" textAnchor="middle">
              로아로골 <tspan className={styles.bannerHighlight}>정상영업</tspan> 합니다
            </text>
          </g>

          {/* 안전제일 바리케이드 */}
          {[30, 330].map((x) => (
            <g key={x} className={styles.barricade} transform={`translate(${x} 0)`}>
              <rect x="0" y="218" width="150" height="16" rx="2" />
              <rect x="8" y="234" width="8" height="22" />
              <rect x="134" y="234" width="8" height="22" />
              <rect x="0" y="252" width="24" height="6" />
              <rect x="126" y="252" width="24" height="6" />
              <text className={styles.barricadeText} x="75" y="230" textAnchor="middle">
                안전제일 · 안전제일
              </text>
            </g>
          ))}
        </svg>
      </div>
    </article>
  );
}
