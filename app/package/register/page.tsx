'use client';

// 패키지 등록 — 폼 본체는 수정 페이지와 공용인 PackageForm 에 있다.
// 이 페이지는 로그인 게이트와 "생성 저장"만 담당한다.

import { useRouter } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import NicknameModal from '@/components/auth/NicknameModal';
import PackageForm, { type PackageFormSubmitData } from '@/components/package/PackageForm';
import type { PackagePostCreateData } from '@/types/package';
import styles from '../package.module.css';

export default function PackageRegisterPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const handleSubmit = async (data: PackageFormSubmitData) => {
    if (!user || !userProfile) throw new Error('로그인이 필요합니다.');

    const postData: PackagePostCreateData = {
      authorUid: user.uid,
      authorName: userProfile.nickname || '익명',
      authorPhotoURL: null,
      title: data.title,
      description: '',
      packageType: data.packageType,
      royalCrystalPrice: data.royalCrystalPrice,
      priceCurrency: data.priceCurrency,
      ...(data.priceCurrency === 'blueCrystal' ? { blueCrystalPrice: data.blueCrystalPrice } : {}),
      items: data.items,
      ...(data.goldPerWon > 0 ? { goldPerWon: data.goldPerWon } : {}),
      ...(data.selectableCount > 0 ? { selectableCount: data.selectableCount } : {}),
      ...(data.isNewRelease ? { isNewRelease: true } : {}),
      ...(data.saleStartAt ? { saleStartAt: data.saleStartAt } : {}),
      ...(data.saleEndAt ? { saleEndAt: data.saleEndAt } : {}),
      ...(data.bonusItems.length > 0 ? { bonusItems: data.bonusItems } : {}),
    };

    // package-service(firestore ~250KB)는 제출 시점에만 필요하다 — 정적 import 하면 첫 로드 청크에 실린다
    const { createPackagePost } = await import('@/lib/package-service');
    const postId = await createPackagePost(postData);
    router.push(`/package/${postId}`);
  };

  // 비로그인
  if (!user) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.registerWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>패키지 등록</h1>
          </div>
          <div className={styles.loginNotice}>
            <p className={styles.loginNoticeText}>
              패키지를 등록하려면 로그인이 필요합니다.
            </p>
            <p className={styles.loginNoticeText} style={{ fontSize: '0.85rem' }}>
              상단의 로그인 버튼을 눌러 Google 계정으로 로그인해주세요.
            </p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <PackageForm mode="register" onSubmit={handleSubmit} />
      {userProfile && !userProfile.nickname && <NicknameModal />}
    </Container>
  );
}
