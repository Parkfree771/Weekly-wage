'use client';

import { useState } from 'react';
import { Button, Spinner, Dropdown, Modal } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './LoginButton.module.css';

export default function LoginButton() {
  const router = useRouter();
  const { user, userProfile, loading, signInWithGoogle, signOut, deleteAccount } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
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

  // 로그인되지 않은 상태
  if (!user) {
    return (
      <button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className={styles.googleButton}
      >
        {isLoggingIn ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 48 48"
              className={styles.googleIcon}
            >
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Google 로그인</span>
          </>
        )}
      </button>
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
        {userProfile?.nickname && (
          <>
            <div className={styles.userInfo}>
              <strong>{userProfile.nickname}</strong>
              <small>{user.email}</small>
            </div>
            <Dropdown.Divider />
          </>
        )}
        <Dropdown.Item onClick={() => setShowDeleteModal(true)} className={styles.deleteItem}>
          계정 탈퇴
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={handleLogout} className={styles.logoutItem}>
          로그아웃
        </Dropdown.Item>
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
            본인 확인을 위해 Google 로그인 팝업이 나타납니다.
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
