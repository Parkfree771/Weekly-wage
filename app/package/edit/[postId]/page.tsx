'use client';

// 패키지 수정 — 폼 본체는 등록 페이지와 공용인 PackageForm 에 있다.
// 이 페이지는 게시물 로드(권한 확인 포함)와 "수정 저장 + ISR 재생성"만 담당한다.

import { revalidatePackage } from '@/lib/revalidate-client';
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
import AvatarPackageForm, {
  postToAvatarFormInitial,
  type AvatarFormInitial,
  type AvatarFormSubmitData,
} from '@/components/package/AvatarPackageForm';
import type { PackagePost } from '@/types/package';
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
  // 아바타 글은 구성품 폼이 아니라 아바타 폼으로 고친다
  const [avatarPost, setAvatarPost] = useState<PackagePost | null>(null);
  const [avatarInitial, setAvatarInitial] = useState<AvatarFormInitial | null>(null);

  useEffect(() => {
    if (!postId || !user) return;
    (async () => {
      try {
        const post = await getPackagePost(postId);
        if (!post || (post.authorUid !== user.uid && !isAdmin(user.email))) {
          setNotFound(true);
          return;
        }
        if (post.packageType === '아바타') {
          setAvatarPost(post);
          setAvatarInitial(postToAvatarFormInitial(post));
        } else {
          setInitial(postToFormInitial(post));
        }
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
      // 체크를 풀면 null 로 저장해 테마를 벗긴다
      eventTheme: data.eventTheme ?? null,
      // 비우면 null 로 저장해 기간을 지운다 (상시 판매로 되돌리기)
      saleStartAt: data.saleStartAt,
      saleEndAt: data.saleEndAt,
      saleClosed: data.saleClosed,
      bonusItems: data.bonusItems,
      bonusSelectableCount: data.bonusSelectableCount > 0 ? data.bonusSelectableCount : 0,
    });

    // ISR 캐시된 상세 페이지를 즉시 재생성 (완료를 기다려야 이동 후 최신이 보인다)
    await revalidatePackage(postId);

    router.push(`/package/${postId}`);
  };

  const handleAvatarSubmit = async (data: AvatarFormSubmitData) => {
    if (!user || !avatarPost) throw new Error('로그인이 필요합니다.');
    const oldImage = avatarPost.avatarImage;
    let avatarImage = oldImage;
    if (data.newImageFile) {
      const { uploadAvatarImage } = await import('@/lib/avatar-image');
      // 지금 로그인한 사람 폴더에 올린다 — storage.rules 가 "자기 uid 폴더에만 쓰기" 라서
      avatarImage = await uploadAvatarImage(data.newImageFile, `avatarPackages/${user.uid}`);
    }
    await updatePackagePost(postId, {
      title: data.title,
      royalCrystalPrice: data.price,
      priceCurrency: 'cash',
      avatarImage,
      isNewRelease: data.isNewRelease,
      eventTheme: data.eventTheme ?? null,
      saleStartAt: data.saleStartAt,
      saleEndAt: data.saleEndAt,
      saleClosed: data.saleClosed,
    });
    // 새 이미지가 글에 저장된 뒤에 옛 이미지를 지운다
    if (data.newImageFile && oldImage) {
      const { deleteAvatarImage } = await import('@/lib/avatar-image');
      await deleteAvatarImage(oldImage);
    }
    await revalidatePackage(postId);
    router.push(`/package/${postId}`);
  };

  if (!user) {
    return (
      <Container fluid style={{ maxWidth: '1680px' /* 등록 화면과 같은 넓은 폭 */ }}>
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

  if (!notFound && avatarInitial) {
    return (
      <Container fluid style={{ maxWidth: '1100px' }}>
        <div className={styles.registerWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>아바타 패키지 수정</h1>
          </div>
          <AvatarPackageForm mode="edit" initial={avatarInitial} onSubmit={handleAvatarSubmit} />
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
