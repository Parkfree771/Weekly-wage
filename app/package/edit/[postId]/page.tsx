'use client';

// 패키지 수정 — 폼 본체는 등록 페이지와 공용인 PackageForm 에 있다.
// 이 페이지는 게시물 로드(권한 확인 포함)와 "수정 저장 + ISR 재생성"만 담당한다.

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import { getPackagePost, updatePackagePost } from '@/lib/package-service';
import PackageForm, {
  postToFormInitial,
  type PackageFormInitial,
  type PackageFormSubmitData,
} from '@/components/package/PackageForm';
import styles from '../../package.module.css';

export default function PackageEditPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { user } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // 폼 초기값 — 로드가 끝난 뒤에 폼을 마운트한다 (폼 상태 초기화는 마운트 1회라서)
  const [initial, setInitial] = useState<PackageFormInitial | null>(null);

  useEffect(() => {
    if (!postId || !user) return;
    (async () => {
      try {
        const post = await getPackagePost(postId);
        if (!post || (post.authorUid !== user.uid && !isAdmin(user.email))) {
          setNotFound(true);
          return;
        }
        setInitial(postToFormInitial(post));
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
        setNotFound(true);
      } finally {
        setPageLoading(false);
      }
    })();
  }, [postId, user]);

  const handleSubmit = async (data: PackageFormSubmitData) => {
    await updatePackagePost(postId, {
      title: data.title,
      packageType: data.packageType,
      royalCrystalPrice: data.royalCrystalPrice,
      priceCurrency: data.priceCurrency,
      ...(data.priceCurrency === 'blueCrystal' ? { blueCrystalPrice: data.blueCrystalPrice } : {}),
      items: data.items,
      ...(data.goldPerWon > 0 ? { goldPerWon: data.goldPerWon } : { goldPerWon: 0 }),
      selectableCount: data.selectableCount > 0 ? data.selectableCount : 0,
      isNewRelease: data.isNewRelease,
      // 비우면 null 로 저장해 기간을 지운다 (상시 판매로 되돌리기)
      saleStartAt: data.saleStartAt,
      saleEndAt: data.saleEndAt,
      saleClosed: data.saleClosed,
      bonusItems: data.bonusItems,
    });

    // ISR 캐시된 상세 페이지를 즉시 재생성 (완료를 기다려야 이동 후 최신이 보인다)
    await fetch('/api/package/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    }).catch(() => {});

    router.push(`/package/${postId}`);
  };

  if (!user) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.registerWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>패키지 수정</h1>
          </div>
          <div className={styles.loginNotice}>
            <p className={styles.loginNoticeText}>로그인이 필요합니다.</p>
          </div>
        </div>
      </Container>
    );
  }

  if (pageLoading) {
    return (
      <Container fluid style={{ maxWidth: '1100px' }}>
        <div className={styles.registerWrapper} style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <Spinner animation="border" style={{ color: 'var(--color-primary)' }} />
        </div>
      </Container>
    );
  }

  if (notFound || !initial) {
    return (
      <Container fluid style={{ maxWidth: '1100px' }}>
        <div className={styles.registerWrapper}>
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>게시물을 찾을 수 없거나 수정 권한이 없습니다.</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <PackageForm mode="edit" initial={initial} onSubmit={handleSubmit} />
    </Container>
  );
}
