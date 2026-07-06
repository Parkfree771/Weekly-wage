'use client';

import { useState } from 'react';
import { Button, Spinner, Dropdown, Modal } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './LoginButton.module.css';

// Apple 공식 로고 (흰색) — Apple 로그인 버튼용
function AppleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 814 1000" fill="#fff" aria-hidden="true">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}

export default function LoginButton() {
  const router = useRouter();
  const { user, userProfile, loading, signInWithGoogle, signInWithApple, signOut, deleteAccount } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogin = async (provider: 'google' | 'apple') => {
    setIsLoggingIn(true);
    try {
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
      setShowLoginModal(false);
    } catch (err) {
      console.error('로그인 오류:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('로그아웃 오류:', err);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      router.push('/');
    } catch (err: any) {
      console.error('계정 삭제 오류:', err);
      // 사용자가 팝업을 취소한 경우
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // 조용히 무시
      } else {
        alert('계정 삭제에 실패했습니다. 다시 시도해주세요.');
      }
      setIsDeleting(false);
    }
  };

  // 로딩 중
  if (loading) {
    return (
      <Button variant="outline-secondary" size="sm" disabled>
        <Spinner animation="border" size="sm" />
      </Button>
    );
  }

  // 로그인되지 않은 상태 — 로그인 방식 선택 모달 (Google / Apple)
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLoginModal(true)}
          disabled={isLoggingIn}
          className={styles.googleButton}
        >
          {isLoggingIn ? <Spinner animation="border" size="sm" /> : <span>로그인</span>}
        </button>

        {/* backdrop 없이 — 화면을 어둡게 덮지 않는 깔끔한 로그인 카드 */}
        <Modal
          show={showLoginModal}
          onHide={() => !isLoggingIn && setShowLoginModal(false)}
          centered
          size="sm"
          backdrop={false}
          contentClassName={styles.loginModalContent}
        >
          <Modal.Header closeButton={!isLoggingIn}>
            <Modal.Title style={{ fontSize: '1rem' }}>로그인</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => handleLogin('google')}
                disabled={isLoggingIn}
                className={`${styles.providerButton} ${styles.providerGoogle}`}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" className={styles.googleIcon}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Google로 계속하기</span>
              </button>
              <button
                onClick={() => handleLogin('apple')}
                disabled={isLoggingIn}
                className={`${styles.providerButton} ${styles.providerApple}`}
              >
                <AppleLogo />
                <span>Apple로 계속하기</span>
              </button>
            </div>
            <p className={styles.consentNote}>
              로그인하면 <a href="/terms" target="_blank" rel="noopener noreferrer">이용약관</a> 및{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>에 동의하게 됩니다.
              <br />신규 가입 시 상세 동의 항목을 다시 확인합니다.
            </p>
          </Modal.Body>
        </Modal>
      </>
    );
  }

  // 로그인된 상태
  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="link"
        id="user-dropdown"
        className={styles.userDropdown}
      >
        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt="프로필"
            width={32}
            height={32}
            className={styles.profileImage}
          />
        ) : (
          <div className={styles.profilePlaceholder}>
            ?
          </div>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className={styles.dropdownMenu}>
        <div className={styles.userInfo}>
          <strong>{userProfile?.nickname || user.displayName || '사용자'}</strong>
          <small>{user.email}</small>
        </div>
        <Dropdown.Divider />
        <Dropdown.Item href="/mypage" className={styles.menuItem}>마이페이지</Dropdown.Item>
        <Dropdown.Item onClick={() => router.push('/mypage')} className={styles.menuItem}>닉네임 변경</Dropdown.Item>
        <Dropdown.Item href="https://forms.gle/n9XKQJmheLhZcSf69" target="_blank" rel="noopener noreferrer" className={styles.menuItem}>문의하기</Dropdown.Item>
        {isAdmin(user.email) && (
          <Dropdown.Item href="/admin/feedback" className={styles.menuItem}>관리자 의견함</Dropdown.Item>
        )}
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => setShowDeleteModal(true)} className={styles.deleteItem}>계정 탈퇴</Dropdown.Item>
        <Dropdown.Item onClick={handleLogout} className={styles.logoutItem}>로그아웃</Dropdown.Item>
      </Dropdown.Menu>

      {/* 계정 탈퇴 확인 모달 */}
      <Modal show={showDeleteModal} onHide={() => !isDeleting && setShowDeleteModal(false)} centered>
        <Modal.Header closeButton={!isDeleting}>
          <Modal.Title>계정 탈퇴</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ color: 'var(--text-primary)' }}>
            정말 탈퇴하시겠습니까?
          </p>
          <p className="text-muted small mb-2">
            탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
          </p>
          <p className="text-muted small mb-0">
            본인 확인을 위해 가입하신 방식(Google/Apple)의 로그인 팝업이 나타납니다.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
            취소
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner animation="border" size="sm" /> : '탈퇴하기'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Dropdown>
  );
}
