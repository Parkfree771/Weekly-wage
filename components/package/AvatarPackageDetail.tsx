'use client';

// 아바타 패키지 상세 — 대표 캡쳐 · 가격 · 직업별 유저 착장 갤러리.
//
// 착장 목록은 서버(ISR)가 글과 같이 읽어 넘긴다 — 방문자마다 Firestore 를 읽지 않는다.
// 착장을 올리거나 지우면 화면은 바로 고치고, 상세 ISR 사본만 다시 만든다(revalidate detailOnly).
// 조회수·따봉은 일반 상세와 같은 경로(/api/package/view · ReactionBar)를 쓴다.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from 'react-bootstrap';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import { revalidatePackage } from '@/lib/revalidate-client';
import { isSaleEnded, formatSalePeriodDateOnly, toSaleDate } from '@/lib/package-sale';
import { publishStats, fetchStats, seedStatsFromPosts, subscribeStats, wasViewedRecently, markViewed } from '@/lib/package-stats-client';
import { CLASS_GROUPS, classGroupOf, hexForGame } from '@/lib/avatar-dye';
import type { AvatarLook, PackagePost } from '@/types/package';
import ReactionBar from '@/components/package/ReactionBar';
import styles from '@/app/package/package.module.css';
import av from './Avatar.module.css';

// 등록 폼은 로그인한 사람이 버튼을 눌렀을 때만 쓴다
const AvatarLookForm = dynamic(() => import('./AvatarLookForm'), { ssr: false });

// 착용샷 썸네일을 한 번에 그리는 수 — 필터는 전체 목록(글자 데이터)에서 걸고, 사진은 이만큼씩만 받는다.
// 상세 한 번 열 때 받는 이미지 양을 묶어 두려는 것(Storage 다운로드 요금).
const LOOKS_PAGE = 12;

/** 착장 사진 전부 — 여러 장 기능 이전 착장은 대표 한 장뿐 */
function lookImages(l: AvatarLook) {
  return l.images && l.images.length > 0 ? l.images : [l.image];
}


type Props = {
  initialPost: PackagePost;
  /** 서버가 읽은 착장. null 이면 서버 조회 실패 — 브라우저가 직접 읽는다 */
  initialLooks: AvatarLook[] | null;
};

/** 색 칸 + 코드. 누르면 게임에 붙여넣는 형태(# 없이)로 복사 */
function DyeChip({ hex, label }: { hex: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!hex) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hexForGame(hex));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // 클립보드 권한이 없으면 조용히 넘어간다 — 코드는 화면에 보인다
    }
  };
  return (
    <button type="button" className={av.dyeChip} onClick={copy} title={`${label} ${hex} 복사`}>
      <span className={av.hexSwatch} style={{ background: hex }} aria-hidden="true" />
      <span className={av.dyeChipLabel}>{label}</span>
      <span className={av.dyeChipHex}>{copied ? '복사됨' : hex}</span>
    </button>
  );
}

function LookPieces({ look }: { look: AvatarLook }) {
  if (!look.pieces || look.pieces.length === 0) {
    return <p className={av.formNote}>아바타 정보 없이 올린 착장입니다.</p>;
  }
  return (
    <ul className={av.pieceCards}>
      {look.pieces.map((p, i) => (
        <li key={i} className={av.pieceCard}>
          <div className={av.pieceCardHead}>
            {p.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.icon} alt="" className={av.pieceIcon} loading="lazy" />
            ) : (
              <span className={av.pieceIconEmpty} aria-hidden="true" />
            )}
            <span className={av.pieceCardText}>
              <span className={av.piecePart}>{p.part.replace(/ 아바타$/, '')}</span>
              <span className={av.pieceName}>{p.name}</span>
            </span>
          </div>
          {p.dyes.length > 0 && (
            <div className={av.pieceDyes}>
              {p.dyes.map((d, j) => (
                <div key={j} className={av.dyeLine}>
                  <span className={av.dyeArea}>{d.area}</span>
                  <DyeChip hex={d.base} label="기본" />
                  <DyeChip hex={d.pattern} label="무늬" />
                  {d.gloss && <span className={av.dyeGloss}>광택 {d.gloss}</span>}
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function AvatarPackageDetail({ initialPost, initialLooks }: Props) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [post, setPost] = useState<PackagePost>(initialPost);
  const postId = post.id;
  const [looks, setLooks] = useState<AvatarLook[]>(initialLooks ?? []);
  // 2단 필터 — 분류(전사(여) 등) → 그 안의 직업. 둘 다 null 이면 전체
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [openLook, setOpenLook] = useState<AvatarLook | null>(null);
  // 팝업에서 보고 있는 사진 번호
  const [shotIdx, setShotIdx] = useState(0);
  const openLookAt = (l: AvatarLook) => { setShotIdx(0); setOpenLook(l); };
  const [liked, setLiked] = useState<boolean | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const openLookId = openLook?.id ?? null;
  useEffect(() => {
    setLiked(null);
    if (!openLookId || !user) return;
    let cancelled = false;
    import('@/lib/avatar-look-service')
      .then(({ hasLikedLook }) => hasLikedLook(postId, openLookId, user.uid))
      .then((v) => { if (!cancelled) setLiked(v); })
      .catch(() => { if (!cancelled) setLiked(false); });
    return () => { cancelled = true; };
  }, [openLookId, user, postId]);
  const toggleLike = async () => {
    if (!openLook || !user || liked === null || likeBusy) return;
    const next = !liked;
    const delta = next ? 1 : -1;
    const bump = (l: AvatarLook) => (l.id === openLook.id ? { ...l, likeCount: Math.max(0, (l.likeCount || 0) + delta) } : l);
    setLikeBusy(true);
    setLiked(next);
    setLooks((prev) => prev.map(bump));
    setOpenLook((prev) => (prev ? bump(prev) : prev));
    try {
      const { setLookLike } = await import('@/lib/avatar-look-service');
      await setLookLike(postId, openLook.id, user.uid, next);
    } catch (err) {
      console.error('착장 좋아요 실패:', err);
      // 되돌린다
      const undo = (l: AvatarLook) => (l.id === openLook.id ? { ...l, likeCount: Math.max(0, (l.likeCount || 0) - delta) } : l);
      setLiked(!next);
      setLooks((prev) => prev.map(undo));
      setOpenLook((prev) => (prev ? undo(prev) : prev));
    } finally {
      setLikeBusy(false);
    }
  };

  // 갤러리 인기 착용샷에서 눌러 들어오면(?look=ID) 그 착장 팝업을 바로 연다
  const lookParamHandled = useRef(false);
  useEffect(() => {
    if (lookParamHandled.current || looks.length === 0) return;
    lookParamHandled.current = true;
    const id = new URLSearchParams(window.location.search).get('look');
    const target = id ? looks.find((l) => l.id === id) : null;
    if (target) openLookAt(target);
  }, [looks]);
  const shotCount = openLook ? lookImages(openLook).length : 0;
  const stepShot = useCallback((d: number) => {
    setShotIdx((i) => (shotCount > 0 ? (i + d + shotCount) % shotCount : 0));
  }, [shotCount]);
  const [imageOpen, setImageOpen] = useState(false);

  const isOwner = !!user && (user.uid === post.authorUid || isAdmin(user.email));
  const admin = !!user && isAdmin(user.email);

  // 클라이언트 내비게이션으로 다른 글에 들어오면 상태를 갈아 끼운다
  useEffect(() => {
    setPost(initialPost);
    setLooks(initialLooks ?? []);
    setGroupFilter(null);
    setClassFilter(null);
  }, [initialPost, initialLooks]);

  // 서버가 착장을 못 읽었을 때만 브라우저가 직접 읽는다
  useEffect(() => {
    if (initialLooks) return;
    let cancelled = false;
    import('@/lib/avatar-look-service')
      .then(({ getAvatarLooks }) => getAvatarLooks(postId))
      .then((list) => { if (!cancelled) setLooks(list); })
      .catch((err) => console.error('착장 로딩 실패:', err));
    return () => { cancelled = true; };
  }, [initialLooks, postId]);

  // 조회수 — 일반 상세와 같은 규칙(24시간 안 재방문은 POST 생략, 집계만 받는다)
  const viewCountedFor = useRef<string | null>(null);
  useEffect(() => {
    seedStatsFromPosts([initialPost]);
    if (viewCountedFor.current === postId) return;
    viewCountedFor.current = postId;
    if (wasViewedRecently(postId)) {
      fetchStats([postId]);
      return;
    }
    fetch('/api/package/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.ok) return;
        markViewed(postId);
        if (json.stats) publishStats(postId, json.stats);
      })
      .catch(() => {});
  }, [postId, initialPost]);

  useEffect(() =>
    subscribeStats((id, st) => {
      setPost((prev) => (prev.id === id
        ? { ...prev, viewCount: st.viewCount, likeCount: st.likeCount, sosoCount: st.sosoCount }
        : prev));
    }), []);

  // 직업별·분류별 개수 — 버튼에 같이 보여 준다. 순서는 고정(찾기 쉽게)
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of looks) {
      m.set(l.className, (m.get(l.className) || 0) + 1);
      const g = classGroupOf(l.className);
      if (g) m.set(`g:${g}`, (m.get(`g:${g}`) || 0) + 1);
    }
    return m;
  }, [looks]);
  const activeGroup = CLASS_GROUPS.find((g) => g.label === groupFilter) ?? null;
  const [sortBy, setSortBy] = useState<'like' | 'new'>('like');
  const visibleLooks = useMemo(() => {
    let list = looks;
    if (classFilter) list = looks.filter((l) => l.className === classFilter);
    else if (activeGroup) list = looks.filter((l) => activeGroup.classes.includes(l.className));
    // looks 는 서버가 최신순으로 준다 — 최신순은 그대로, 좋아요순은 안정 정렬이라 동점이면 최신이 앞
    if (sortBy === 'like') list = [...list].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    return list;
  }, [looks, classFilter, activeGroup, sortBy]);
  const filterLabel = classFilter ?? groupFilter;
  // 더보기 — 필터를 바꾸면 처음 12장부터 다시
  const [shownCount, setShownCount] = useState(LOOKS_PAGE);
  useEffect(() => { setShownCount(LOOKS_PAGE); }, [groupFilter, classFilter, sortBy, postId]);
  const shownLooks = visibleLooks.slice(0, shownCount);
  const restCount = visibleLooks.length - shownLooks.length;
  const pickGroup = (label: string | null) => {
    setGroupFilter(label);
    // 직업이 하나뿐인 분류(건슬링어·가디언나이트 등)는 2단을 건너뛰고 바로 그 직업
    const g = CLASS_GROUPS.find((x) => x.label === label);
    setClassFilter(g && g.classes.length === 1 ? g.classes[0] : null);
  };

  // 팝업 — ESC 로 닫고 열린 동안 뒤 스크롤을 잠근다
  const anyModal = !!openLook || imageOpen;
  useEffect(() => {
    if (!anyModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenLook(null); setImageOpen(false); }
      if (e.key === 'ArrowLeft') stepShot(-1);
      if (e.key === 'ArrowRight') stepShot(1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [anyModal, stepShot]);

  const handleCreated = useCallback((look: AvatarLook) => {
    setLooks((prev) => [look, ...prev]);
    setFormOpen(false);
    setGroupFilter(classGroupOf(look.className));
    setClassFilter(look.className);
    revalidatePackage(postId);
  }, [postId]);

  const handleDeleteLook = async (look: AvatarLook) => {
    if (!confirm('이 착장을 삭제할까요?')) return;
    try {
      const { deleteAvatarLook } = await import('@/lib/avatar-look-service');
      await deleteAvatarLook(postId, look.id);
      const { deleteAvatarImage } = await import('@/lib/avatar-image');
      await Promise.all(lookImages(look).map((img) => deleteAvatarImage(img)));
      setLooks((prev) => prev.filter((l) => l.id !== look.id));
      setOpenLook(null);
      revalidatePackage(postId);
    } catch (err) {
      console.error('착장 삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const { deletePackagePost } = await import('@/lib/package-service');
      await deletePackagePost(postId);
      const { deleteAvatarImage } = await import('@/lib/avatar-image');
      await deleteAvatarImage(post.avatarImage);
      await revalidatePackage(postId);
      router.push('/package');
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  const saleEnded = isSaleEnded(post);
  const salePeriod = formatSalePeriodDateOnly(post);
  // 남은 날짜 — 지금 시각에 따라 달라 서버 HTML 과 어긋나지 않게 마운트 뒤에만 계산
  const saleEndMs = toSaleDate(post.saleEndAt)?.getTime() ?? null;
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  useEffect(() => {
    if (saleEndMs === null || saleEnded) { setDaysLeft(null); return; }
    setDaysLeft(Math.max(0, Math.ceil((saleEndMs - Date.now()) / 86_400_000)));
  }, [saleEndMs, saleEnded]);
  const img = post.avatarImage;

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <div className={styles.detailWrapper}>
        <Link href="/package" className={styles.backLink}>
          &#8592; 목록으로 돌아가기
        </Link>

        <div className={styles.detailHeader}>
          <div className={styles.detailBadgeRow}>
            <span className={`${styles.typeBadge} ${styles.typeBadgeNormal}`}>아바타</span>
            {saleEnded ? (
              <span className={styles.saleEndedBadge}>판매 종료</span>
            ) : salePeriod ? (
              <span className={styles.salePeriodBadge}>판매중</span>
            ) : null}
          </div>
          <h1 className={styles.detailTitle}>{post.title}</h1>
        </div>

        {/* 대표 캡쳐 + 정보 */}
        <section className={`${styles.detailCard} ${av.hero}`}>
          <button type="button" className={av.heroImageBtn} onClick={() => img && setImageOpen(true)} disabled={!img}
            aria-label="캡쳐 크게 보기">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt={post.title} className={av.heroImage} width={img.w} height={img.h} decoding="async" />
            ) : (
              <span className={av.cardImageEmpty}>이미지 없음</span>
            )}
          </button>
          <div className={av.heroInfo}>
            <div className={av.heroRow}>
              <span className={av.heroLabel}>가격</span>
              <span className={av.heroPriceWrap}>
                {saleEnded ? (
                  <span className={`${av.featureStatus} ${av.featureStatusEnded}`}>판매 종료</span>
                ) : daysLeft !== null ? (
                  <span className={`${av.featureStatus} ${daysLeft <= 3 ? av.featureStatusSoon : ''}`}>
                    {daysLeft === 0 ? '오늘 마감' : `D-${daysLeft}`}
                  </span>
                ) : null}
                <span className={av.heroPrice}>{(post.royalCrystalPrice || 0).toLocaleString()}원</span>
              </span>
            </div>
            {salePeriod && (
              <div className={av.heroRow}>
                <span className={av.heroLabel}>판매 기간</span>
                <span className={av.heroValue}>{salePeriod}</span>
              </div>
            )}
            <div className={av.heroRow}>
              <span className={av.heroLabel}>착용샷</span>
              <span className={av.heroValue}>{looks.length.toLocaleString()}개</span>
            </div>
            <div className={av.heroFoot}>
              <ReactionBar postId={postId} likeCount={post.likeCount || 0} sosoCount={post.sosoCount || 0} likeOnly showLabels />
              <span className={av.heroMeta}>조회 {(post.viewCount || 0).toLocaleString()} · {post.authorName || '익명'}</span>
            </div>
            {isOwner && (
              <div className={av.ownerActions}>
                <Link href={`/package/edit/${postId}`} className={styles.editBtn}>수정</Link>
                <button className={styles.deleteBtn} onClick={handleDeletePost}>삭제</button>
              </div>
            )}
          </div>
        </section>

        {/* 직업별 착용샷 */}
        <section className={styles.detailCard}>
          <div className={av.looksHead}>
            <h2 className={styles.detailCardHeader}>직업별 착용샷</h2>
            {user ? (
              !formOpen && (
                <button type="button" className={av.primaryBtnSmall} onClick={() => setFormOpen(true)}>
                  + 내 착장 등록
                </button>
              )
            ) : (
              <span className={av.loginHint}>로그인하면 내 착장을 올릴 수 있어요</span>
            )}
          </div>

          {formOpen && user && (
            <AvatarLookForm
              postId={postId}
              uid={user.uid}
              authorName={userProfile?.nickname || '익명'}
              defaultClass={classFilter}
              onCreated={handleCreated}
              onCancel={() => setFormOpen(false)}
            />
          )}

          {/* 1단: 분류 */}
          <div className={av.classBar} role="tablist" aria-label="직업 분류">
            <button type="button" role="tab" aria-selected={!groupFilter}
              className={`${av.classBtn} ${!groupFilter ? av.classBtnActive : ''}`}
              onClick={() => pickGroup(null)}>
              전체 <span className={av.classCount}>{looks.length}</span>
            </button>
            {CLASS_GROUPS.map((g) => {
              const n = counts.get(`g:${g.label}`) || 0;
              const on = groupFilter === g.label;
              return (
                <button key={g.label} type="button" role="tab" aria-selected={on}
                  className={`${av.classBtn} ${on ? av.classBtnActive : ''} ${n === 0 ? av.classBtnEmpty : ''}`}
                  onClick={() => pickGroup(g.label)}>
                  {g.label}{n > 0 && <span className={av.classCount}>{n}</span>}
                </button>
              );
            })}
          </div>

          {/* 2단: 고른 분류 안의 직업 (직업이 둘 이상일 때만) */}
          {activeGroup && activeGroup.classes.length > 1 && (
            <div className={`${av.classBar} ${av.classBarSub}`} role="tablist" aria-label={`${activeGroup.label} 직업`}>
              <button type="button" role="tab" aria-selected={!classFilter}
                className={`${av.classBtn} ${av.classBtnSub} ${!classFilter ? av.classBtnSubActive : ''}`}
                onClick={() => setClassFilter(null)}>
                {activeGroup.label} 전체
              </button>
              {activeGroup.classes.map((c) => {
                const n = counts.get(c) || 0;
                const on = classFilter === c;
                return (
                  <button key={c} type="button" role="tab" aria-selected={on}
                    className={`${av.classBtn} ${av.classBtnSub} ${on ? av.classBtnSubActive : ''} ${n === 0 ? av.classBtnEmpty : ''}`}
                    onClick={() => setClassFilter(c)}>
                    {c}{n > 0 && <span className={av.classCount}>{n}</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className={av.sortRow}>
            <span className={av.sortCount}>착용샷 {visibleLooks.length}개</span>
            <span className={av.sortSeg} role="tablist" aria-label="정렬">
              <button type="button" role="tab" aria-selected={sortBy === 'like'}
                className={sortBy === 'like' ? av.sortOn : ''} onClick={() => setSortBy('like')}>좋아요순</button>
              <button type="button" role="tab" aria-selected={sortBy === 'new'}
                className={sortBy === 'new' ? av.sortOn : ''} onClick={() => setSortBy('new')}>최신순</button>
            </span>
          </div>

          {visibleLooks.length === 0 ? (
            <div className={av.looksEmpty}>
              {filterLabel ? `${filterLabel} 착용샷이 아직 없습니다.` : '아직 올라온 착용샷이 없습니다.'}
            </div>
          ) : (
            <div className={av.looksGrid}>
              {shownLooks.map((l, i) => (
                <button key={l.id} type="button" className={av.lookTile} onClick={() => openLookAt(l)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.image.thumbUrl || l.image.url} alt={`${l.className} 착용샷`} className={av.lookTileImg}
                    loading="lazy" decoding="async" />
                  {sortBy === 'like' && (l.likeCount || 0) > 0 && (
                    <span className={`${av.featureRank} ${i === 0 ? av.featureRankTop : ''}`}>{i + 1}</span>
                  )}
                  <span className={av.lookTileMeta}>
                    <span className={av.lookTileMetaText}>
                      <span className={av.lookTileClass}>{l.className}</span>
                      <span className={av.lookTileAuthor}>{l.authorName}</span>
                    </span>
                    <span className={av.lookTileLikes}>좋아요 {l.likeCount || 0}</span>
                  </span>
                  <span className={av.lookTileBadges}>
                    {lookImages(l).length > 1 && <span className={av.lookTileBadge}>사진 {lookImages(l).length}</span>}
                    {l.pieces?.some((p) => p.dyes.length > 0) && <span className={av.lookTileBadge}>염색</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
          {restCount > 0 && (
            <button type="button" className={av.moreBtn} onClick={() => setShownCount((n) => n + LOOKS_PAGE)}>
              더보기 <span className={av.classCount}>{restCount}</span>
            </button>
          )}
        </section>
      </div>

      {/* 대표 캡쳐 크게 보기 */}
      {imageOpen && img && (
        <div className={av.overlay} role="dialog" aria-modal="true" aria-label="캡쳐 크게 보기"
          onClick={(e) => { if (e.target === e.currentTarget) setImageOpen(false); }}>
          <div className={av.modal}>
            <button type="button" className={av.modalClose} onClick={() => setImageOpen(false)} aria-label="닫기">×</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={post.title} className={av.modalImage} />
          </div>
        </div>
      )}

      {/* 착장 크게 보기 + 아바타·염색 */}
      {openLook && (
        <div className={av.overlay} role="dialog" aria-modal="true" aria-label={`${openLook.className} 착용샷`}
          onClick={(e) => { if (e.target === e.currentTarget) setOpenLook(null); }}>
          <div className={`${av.modal} ${av.modalLook}`}>
            <button type="button" className={av.modalClose} onClick={() => setOpenLook(null)} aria-label="닫기">×</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className={av.viewer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lookImages(openLook)[shotIdx]?.url ?? openLook.image.url} alt={`${openLook.className} 착용샷 ${shotIdx + 1}`}
                className={av.modalLookImage} />
              {shotCount > 1 && (
                <>
                  <button type="button" className={`${av.viewerNav} ${av.viewerPrev}`} onClick={() => stepShot(-1)} aria-label="이전 사진">&#8249;</button>
                  <button type="button" className={`${av.viewerNav} ${av.viewerNext}`} onClick={() => stepShot(1)} aria-label="다음 사진">&#8250;</button>
                  <span className={av.viewerCount}>{shotIdx + 1} / {shotCount}</span>
                </>
              )}
            </div>
            {shotCount > 1 && (
              <div className={av.viewerThumbs}>
                {lookImages(openLook).map((img, i) => (
                  <button key={img.path} type="button" className={`${av.viewerThumb} ${i === shotIdx ? av.viewerThumbOn : ''}`}
                    onClick={() => setShotIdx(i)} aria-label={`${i + 1}번째 사진`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.thumbUrl || img.url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <div className={av.modalSide}>
              <div className={av.modalSideHead}>
                <span className={av.modalClass}>{openLook.className}</span>
                <span className={av.modalAuthor}>{openLook.authorName}</span>
                {user ? (
                  <button type="button" className={`${av.lookLikeBtn} ${liked ? av.lookLikeBtnOn : ''}`}
                    onClick={toggleLike} disabled={liked === null || likeBusy} aria-pressed={!!liked}>
                    좋아요 {openLook.likeCount || 0}
                  </button>
                ) : (
                  <span className={av.lookLikeStatic} title="로그인하면 좋아요를 누를 수 있어요">좋아요 {openLook.likeCount || 0}</span>
                )}
                {user && (user.uid === openLook.authorUid || admin) && (
                  <button type="button" className={`${styles.deleteBtn} ${av.modalDelete}`} onClick={() => handleDeleteLook(openLook)}>
                    착장 삭제
                  </button>
                )}
              </div>
              <LookPieces look={openLook} />
              {openLook.pieces?.some((p) => p.dyes.length > 0) && (
                <p className={av.formNote}>색 코드를 누르면 게임 염색 창에 붙여넣는 형태(# 없이)로 복사됩니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
