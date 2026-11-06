'use client';

// 갤러리 "아바타" 탭 카드 — 왼쪽 큰 대표 이미지, 오른쪽 가격·판매 기간·좋아요 순 인기 착용샷.
// 인기 착용샷은 갤러리 서버(ISR)가 글과 같이 읽어 넘긴다(post.avatarTopLooks) — 브라우저는 DB 를 읽지 않는다.

import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import type { PackagePost } from '@/types/package';
import { isNewReleasePost } from '@/lib/package-shared';
import { isSaleEnded, toSaleDate } from '@/lib/package-sale';
import av from './Avatar.module.css';

const DAY = 24 * 60 * 60 * 1000;

/** "11.05" — 한국 시간 기준(서버·브라우저가 같은 날짜를 그리도록) */
function md(d: Date): string {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${String(k.getUTCMonth() + 1).padStart(2, '0')}.${String(k.getUTCDate()).padStart(2, '0')}`;
}

function AvatarFeatureCard({ post }: { post: PackagePost }) {
  const href = `/package/${post.id}`;
  const img = post.avatarImage;
  const ended = isSaleEnded(post);
  const start = toSaleDate(post.saleStartAt);
  const end = toSaleDate(post.saleEndAt);
  const period = start && end ? `${md(start)} ~ ${md(end)}` : end ? `~ ${md(end)}` : start ? `${md(start)} ~` : '';
  const top = post.avatarTopLooks ?? [];
  const lookCount = post.avatarLookCount ?? top.length;

  // 남은 날짜는 지금 시각에 따라 달라 서버 HTML 과 어긋날 수 있다 — 마운트 뒤에만 계산
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const endMs = end ? end.getTime() : null;
  useEffect(() => {
    if (endMs === null || ended) return;
    setDaysLeft(Math.max(0, Math.ceil((endMs - Date.now()) / DAY)));
  }, [endMs, ended]);

  return (
    <article className={`${av.feature} ${ended ? av.featureEnded : ''}`}>
      <Link href={href} className={av.featureImageLink} prefetch={false} aria-label={`${post.title} 상세`}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt={post.title} className={av.featureImage} loading="lazy" decoding="async" />
        ) : (
          <span className={av.cardImageEmpty}>이미지 없음</span>
        )}
        {ended && <span className={av.wideEndedTag}>판매 종료</span>}
      </Link>

      <div className={av.featureSide}>
        <div className={av.featureHead}>
          {isNewReleasePost(post) && <span className={av.featureNew}>NEW</span>}
          <Link href={href} className={av.featureTitle} prefetch={false}>{post.title}</Link>
        </div>

        <div className={av.featurePriceRow}>
          <span className={av.featurePrice}>{(post.royalCrystalPrice || 0).toLocaleString()}<small>원</small></span>
          {ended ? (
            <span className={`${av.featureStatus} ${av.featureStatusEnded}`}>판매 종료</span>
          ) : daysLeft !== null ? (
            <span className={`${av.featureStatus} ${daysLeft <= 3 ? av.featureStatusSoon : ''}`}>
              {daysLeft === 0 ? '오늘 마감' : `D-${daysLeft}`}
            </span>
          ) : (
            <span className={av.featureStatus}>판매 중</span>
          )}
        </div>
        {period && (
          <div className={av.featurePeriod}>
            <span className={av.featurePeriodKey}>판매 기간</span>
            <span>{period}</span>
          </div>
        )}

        <div className={av.featureLooksHead}>
          <span className={av.featureLooksTitle}>인기 착용샷</span>
          <Link href={href} className={av.featureLooksCount} prefetch={false}>
            {lookCount.toLocaleString()}개<span className={av.featureLooksCountMore}> 전체 보기 &#8250;</span>
          </Link>
        </div>
        {top.length > 0 ? (
          <ol className={av.featureLooks}>
            {top.map((l, i) => (
              <li key={l.id}>
                <Link href={`${href}?look=${l.id}`} className={av.featureLook} prefetch={false}
                  aria-label={`${i + 1}위 ${l.className} 착용샷`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.image.thumbUrl || l.image.url} alt="" loading="lazy" decoding="async" />
                  <span className={`${av.featureRank} ${i === 0 ? av.featureRankTop : ''}`}>{i + 1}</span>
                  <span className={av.featureLookMeta}>
                    <span>{l.className}</span>
                    <span className={av.featureLookLikes} aria-label={`좋아요 ${l.likeCount ?? 0}`}>❤️ {l.likeCount ?? 0}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <Link href={href} className={av.featureLooksEmpty} prefetch={false}>
            아직 착용샷이 없어요 · 첫 착장을 올려 보세요
          </Link>
        )}

        <div className={av.featureFoot}>
          <span className={av.featureViews}>조회수 {(post.viewCount || 0).toLocaleString()}</span>
          <Link href={href} className={av.featureMore} prefetch={false}>착용샷 전체 보기 &#8250;</Link>
        </div>
      </div>
    </article>
  );
}

export default memo(AvatarFeatureCard);
