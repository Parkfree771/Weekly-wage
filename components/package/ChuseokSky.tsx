'use client';

import { useMemo } from 'react';
import styles from './PackageGalleryCard.module.css';

/**
 * 추석 테마 갤러리 카드의 밤하늘 — 별밭 SVG 한 장과 보름달.
 *
 * 별은 흐림 필터 없이 그라데이션만 쓴다. 어떤 화면 배율에서도 핵이 점처럼 또렷하고
 * 광채는 가우스 곡선처럼 사라진다(필터를 쓰면 흐리고 무겁다).
 * 다섯 단계: 잔별(점) · 작은별(핵+광채) · 중간별 · 밝은별(빛줄기) · 주역별(긴 빛줄기+대각선).
 * 색온도는 흰색·푸른빛·따뜻한 빛·주황빛 넷을 섞고, 3분의 1을 성단에 몰아 밀한 곳과 성긴 곳을 만든다.
 * 먼 층(잔별·작은별)과 가까운 층(그 위)은 다른 속도로 흐른다. 반짝임·흐름·별똥별은 CSS 애니메이션.
 *
 * 크기는 viewBox 로 카드에 맞춰 늘리지 않는다 — 카드가 700~1000px 로 넓어지면 별과 광채가 같이
 * 확대돼 흐릿해 보였다. 별밭은 고정 픽셀(1080×680)로 그려 카드 가운데에 두고, 카드보다 큰 부분은
 * 카드가 잘라낸다. 그래서 어떤 폭의 카드에서도 별 하나의 크기·밀도가 같다.
 *
 * 별 자리는 seed 로 결정되므로 같은 글은 늘 같은 하늘이다(서버·클라이언트 렌더가 일치한다).
 * 달은 NASA LRO 보름달 사진(퍼블릭 도메인)을 원형으로 잘라 크림 톤으로 보정한 webp.
 */

const SKY_W = 1080;
const SKY_H = 680;

// 필터 없는 SVG 만 만든다 — 아래 문자열은 전부 우리가 쓴 상수·숫자로만 조립되며 사용자 입력은 섞이지 않는다.

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const gauss = (r: () => number) => (r() + r() + r() + r() - 2) / 2; // 대략 정규분포, -1..1

type Tint = { k: string; c: string; h: string; w: number };
const TINTS: Tint[] = [
  { k: 'w', c: '#ffffff', h: '#ffffff', w: 0.42 },
  { k: 'b', c: '#dbe8ff', h: '#b7cdff', w: 0.26 },
  { k: 'y', c: '#fff3d6', h: '#ffe1a6', w: 0.22 },
  { k: 'o', c: '#ffdcb8', h: '#ffbf85', w: 0.10 },
];
const pickTint = (r: () => number): Tint => {
  const u = r(); let a = 0;
  for (const t of TINTS) { a += t.w; if (u <= a) return t; }
  return TINTS[0];
};

function skyDefs(id: string) {
  const glow = (k: string, h: string) =>
    `<radialGradient id="g${k}-${id}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.1" stop-color="${h}" stop-opacity="0.75"/><stop offset="0.25" stop-color="${h}" stop-opacity="0.3"/><stop offset="0.45" stop-color="${h}" stop-opacity="0.1"/><stop offset="0.7" stop-color="${h}" stop-opacity="0.03"/><stop offset="1" stop-color="${h}" stop-opacity="0"/></radialGradient>`;
  return `${TINTS.map((t) => glow(t.k, t.h)).join('')}
  <linearGradient id="sp-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="met-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.7" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
  <radialGradient id="haze-${id}"><stop offset="0" stop-color="#7d8fe0" stop-opacity="0.09"/><stop offset="0.6" stop-color="#5b6cc4" stop-opacity="0.03"/><stop offset="1" stop-color="#3d4a9a" stop-opacity="0"/></radialGradient>`;
}

/** 별 개수 — 560×346 시안의 밀도를 1080×680 면적에 맞춰 늘린 값 */
const COUNTS = { dust: 850, small: 330, mid: 104, big: 24, hero: 5 };

function starField(seed: number, id: string) {
  const w = SKY_W, h = SKY_H;
  const r = rng(seed);
  const far: string[] = [], near: string[] = [];
  const clusters = Array.from({ length: 8 }, () => ({ x: w * (0.05 + r() * 0.9), y: h * (0.05 + r() * 0.9), s: 60 + r() * 70 }));
  const pos = (): [number, number] => {
    const u = r();
    if (u < 0.34) { const c = clusters[Math.floor(r() * clusters.length)]; return [c.x + gauss(r) * c.s, c.y + gauss(r) * c.s]; }
    return [r() * w, r() * h];
  };
  const place = (n: number, out: string[], fn: (x: number, y: number) => string) => {
    let c = 0, t = 0;
    while (c < n && t++ < n * 40) {
      const [x, y] = pos();
      if (x < 0 || y < 0 || x > w || y > h) continue;
      out.push(fn(+x.toFixed(2), +y.toFixed(2))); c++;
    }
  };
  const anim = (dmin: number, dspan: number, dl: number) =>
    `animation-duration:${(dmin + r() * dspan).toFixed(2)}s;animation-delay:${(-r() * dl).toFixed(2)}s`;

  // 1) 잔별 — 점. 아주 흐린 것이 대부분. 1배 화면에서 뭉개지지 않게 최소 0.4px
  place(COUNTS.dust, far, (x, y) => {
    const t = pickTint(r); const rr = 0.4 + r() * r() * 0.6;
    return `<circle cx="${x}" cy="${y}" r="${rr.toFixed(2)}" fill="${t.c}" opacity="${(0.2 + r() * r() * 0.6).toFixed(2)}"/>`;
  });
  // 2) 작은별 — 또렷한 핵 + 작은 광채, 저마다 다른 주기로 숨쉰다
  place(COUNTS.small, far, (x, y) => {
    const t = pickTint(r); const rc = 0.7 + r() * 0.45; const o = (0.6 + r() * 0.4).toFixed(2);
    return `<g class="${styles.skyStar}" transform="translate(${x} ${y})" style="--o:${o};${anim(3, 5, 8)}"><circle r="${(rc * 4).toFixed(2)}" fill="url(#g${t.k}-${id})" opacity="0.55"/><circle r="${rc.toFixed(2)}" fill="${t.c}"/></g>`;
  });
  // 3) 중간별 — 광채 넓게, 핵 흰색
  place(COUNTS.mid, near, (x, y) => {
    const t = pickTint(r); const rc = 1.05 + r() * 0.5; const o = (0.75 + r() * 0.25).toFixed(2);
    return `<g class="${styles.skyStar}" transform="translate(${x} ${y})" style="--o:${o};${anim(2.6, 4, 7)}"><circle r="${(rc * 7).toFixed(2)}" fill="url(#g${t.k}-${id})" opacity="0.75"/><circle r="${rc.toFixed(2)}" fill="${t.c}"/><circle r="${(rc * 0.55).toFixed(2)}" fill="#fff"/></g>`;
  });
  // 빛줄기 — 세로 길게, 가로 짧게. 끝으로 갈수록 사라진다
  const spikes = (L: number, Ls: number, wd: number, op: number) =>
    `<rect x="${(-wd / 2).toFixed(2)}" y="${-L}" width="${wd}" height="${(L * 2).toFixed(1)}" fill="url(#sp-${id})" opacity="${op}"/><rect x="${(-wd / 2).toFixed(2)}" y="${-Ls}" width="${wd}" height="${(Ls * 2).toFixed(1)}" fill="url(#sp-${id})" opacity="${(op * 0.8).toFixed(2)}" transform="rotate(90)"/>`;
  // 4) 밝은별 — 넓은 광채 + 빛줄기 + 흰 핵
  place(COUNTS.big, near, (x, y) => {
    const t = pickTint(r); const s = 1.5 + r() * 0.6;
    return `<g class="${styles.skyBright}" transform="translate(${x} ${y})" style="${anim(5, 5, 9)}"><circle r="${(s * 8.5).toFixed(1)}" fill="url(#g${t.k}-${id})" opacity="0.75"/>${spikes(+(s * 9).toFixed(1), +(s * 5.5).toFixed(1), +(s * 0.5).toFixed(2), 0.7)}<circle r="${s.toFixed(2)}" fill="${t.c}"/><circle r="${(s * 0.55).toFixed(2)}" fill="#fff"/></g>`;
  });
  // 5) 주역별 — 더 긴 빛줄기 + 대각선 희미한 줄
  place(COUNTS.hero, near, (x, y) => {
    const t = pickTint(r); const s = 2.2 + r() * 0.5;
    return `<g class="${styles.skyBright}" transform="translate(${x} ${y})" style="${anim(7, 5, 9)}"><circle r="${(s * 11).toFixed(1)}" fill="url(#g${t.k}-${id})" opacity="0.75"/>${spikes(+(s * 15).toFixed(1), +(s * 8).toFixed(1), +(s * 0.5).toFixed(2), 0.85)}<g transform="rotate(45)">${spikes(+(s * 5).toFixed(1), +(s * 5).toFixed(1), +(s * 0.34).toFixed(2), 0.28)}</g><circle r="${s.toFixed(2)}" fill="${t.c}"/><circle r="${(s * 0.55).toFixed(2)}" fill="#fff"/></g>`;
  });
  return { far: far.join(''), near: near.join('') };
}

const meteor = (id: string, x: number, y: number, delay: number) =>
  `<g class="${styles.skyMeteor}" style="--mx:${x}px;--my:${y}px;animation-delay:${delay}s"><line x1="-110" y1="38" x2="0" y2="0" stroke="url(#met-${id})" stroke-width="1.3" stroke-linecap="round"/><circle r="3.2" fill="url(#gw-${id})"/><circle r="1" fill="#fff"/></g>`;

function buildSky(seed: number, id: string): string {
  const r = rng(seed + 99);
  const haze = [0, 1, 2, 3, 4].map(() =>
    `<ellipse cx="${(SKY_W * r()).toFixed(0)}" cy="${(SKY_H * r()).toFixed(0)}" rx="${(140 + r() * 120).toFixed(0)}" ry="${(80 + r() * 70).toFixed(0)}" fill="url(#haze-${id})"/>`).join('');
  const { far, near } = starField(seed, id);
  // 별똥별 둘 — 카드가 별밭 가운데를 보므로 가운데 근처 위쪽에서 떨어진다
  const meteors = meteor(id, SKY_W * 0.68, SKY_H * 0.3, 4) + meteor(id, SKY_W * 0.42, SKY_H * 0.22, 11);
  return `<defs>${skyDefs(id)}</defs><g>${haze}</g><g class="${styles.skyFar}">${far}</g><g class="${styles.skyNear}">${near}${meteors}</g>`;
}

/** 글 id → 하늘 씨앗. 같은 글은 늘 같은 하늘 */
function skySeedFromId(postId: string): number {
  let h = 7;
  for (let i = 0; i < postId.length; i++) h = (h * 31 + postId.charCodeAt(i)) % 233280;
  return h || 1;
}

type Props = { postId: string };

/** 카드 맨 앞에 두면 카드 뒤 전체에 깔린다(.themeChuseok 의 position: relative 기준). 고정 픽셀, 카드 가운데 정렬 */
export function ChuseokSky({ postId }: Props) {
  // SVG 안의 gradient id 는 문서 전체에서 유일해야 한다 — 글 id 에서 안전한 글자만 뽑아 붙인다
  const safeId = useMemo(() => 'ck' + postId.replace(/[^A-Za-z0-9]/g, '').slice(0, 12), [postId]);
  const inner = useMemo(() => buildSky(skySeedFromId(postId), safeId), [postId, safeId]);
  return (
    <svg
      className={styles.skyAll}
      width={SKY_W}
      height={SKY_H}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

/** 보름달 — 아이템 목록 오른쪽 아래. 후광은 svg, 원반은 사진 */
export function ChuseokMoon() {
  return (
    <span className={styles.moonWrap} aria-hidden="true">
      <svg className={styles.moonHalo} viewBox="-200 -200 400 400">
        <defs>
          <radialGradient id="ck-moon-halo">
            <stop offset="0.5" stopColor="#ffe6a3" stopOpacity="0.22" />
            <stop offset="0.72" stopColor="#ffe6a3" stopOpacity="0.07" />
            <stop offset="1" stopColor="#ffe6a3" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="200" fill="url(#ck-moon-halo)" />
        <circle r="106" fill="#fff0c4" fillOpacity="0.28" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/chuseok-moon.webp" alt="" className={styles.moonImg} width={50} height={50} loading="lazy" decoding="async" />
    </span>
  );
}
