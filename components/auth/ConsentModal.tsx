'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { validateNickname, checkNicknameAvailable } from '@/lib/nickname-service';
import Link from 'next/link';
import styles from './ConsentModal.module.css';

export default function ConsentModal() {
  const { user, needsConsent, completeRegistration, cancelRegistration } = useAuth();
  const [consents, setConsents] = useState({
    privacyPolicy: false,
    emailCollection: false,
    profileCollection: false,
    characterData: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 닉네임 관련 상태
  const [nickname, setNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [nicknameMessage, setNicknameMessage] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allChecked = Object.values(consents).every(v => v);
  const canSubmit = allChecked && nicknameStatus === 'available';

  // 닉네임 실시간 검증
  useEffect(() => {
    if (!nickname) {
      setNicknameStatus('idle');
      setNicknameMessage('');
      return;
    }

    const validation = validateNickname(nickname);
    if (!validation.valid) {
      setNicknameStatus('invalid');
      setNicknameMessage(validation.message);
      return;
    }

    setNicknameStatus('checking');
    setNicknameMessage('확인 중...');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await checkNicknameAvailable(nickname);
        if (available) {
          setNicknameStatus('available');
          setNicknameMessage('사용 가능한 닉네임입니다.');
        } else {
          setNicknameStatus('taken');
          setNicknameMessage('이미 사용 중인 닉네임입니다.');
        }
      } catch {
        setNicknameStatus('invalid');
        setNicknameMessage('중복 확인에 실패했습니다.');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nickname]);

  const handleCheckAll = (checked: boolean) => {
    setConsents({
      privacyPolicy: checked,
      emailCollection: checked,
      profileCollection: checked,
      characterData: checked,
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await completeRegistration(nickname);
    } catch (error) {
      console.error('가입 실패:', error);
    }
    setIsSubmitting(false);
  };

  const handleCancel = async () => {
    await cancelRegistration();
  };

  if (!needsConsent || !user) return null;

  return (
    <Modal show={true} centered backdrop="static" keyboard={false} className={styles.modal}>
      <Modal.Header className={styles.header}>
        <Modal.Title className={styles.title}>회원가입 동의</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.body}>
        <p className={styles.description}>
          로골로골 서비스 이용을 위해 아래 항목에 동의해주세요.
        </p>

        <div className={styles.userInfo}>
          <span className={styles.userEmail}>{user.email}</span>
          <span className={styles.userLabel}>계정으로 가입합니다</span>
        </div>

        {/* 닉네임 입력 */}
        <div className={styles.nicknameSection}>
          <label className={styles.nicknameLabel}>닉네임 설정</label>
          <input
            type="text"
            className={styles.nicknameInput}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임 입력 (한글/영어/숫자, 최대 12자)"
            maxLength={12}
            disabled={isSubmitting}
          />
          <div className={`${styles.nicknameFeedback} ${
            nicknameStatus === 'available' ? styles.feedbackSuccess :
            nicknameStatus === 'taken' || nicknameStatus === 'invalid' ? styles.feedbackError :
            nicknameStatus === 'checking' ? styles.feedbackChecking : ''
          }`}>
            {nicknameMessage}
          </div>
        </div>

        <div className={styles.consentList}>
          {/* 전체 동의 */}
          <div className={styles.consentAll}>
            <Form.Check
              type="checkbox"
              id="consent-all"
              checked={allChecked}
              onChange={(e) => handleCheckAll(e.target.checked)}
              label="전체 동의"
              className={styles.checkAll}
            />
          </div>

          <hr className={styles.divider} />

          {/* 개인정보 처리방침 */}
          <div className={styles.consentItem}>
            <Form.Check
              type="checkbox"
              id="consent-privacy"
              checked={consents.privacyPolicy}
              onChange={(e) => setConsents(prev => ({ ...prev, privacyPolicy: e.target.checked }))}
              label={
                <span className={styles.consentLabel}>
                  <span className={styles.required}>[필수]</span>
                  <Link href="/privacy" target="_blank" className={styles.link}>
                    개인정보 처리방침
                  </Link>
                  에 동의합니다
                </span>
              }
            />
          </div>

          {/* 이메일 수집 */}
          <div className={styles.consentItem}>
            <Form.Check
              type="checkbox"
              id="consent-email"
              checked={consents.emailCollection}
              onChange={(e) => setConsents(prev => ({ ...prev, emailCollection: e.target.checked }))}
              label={
                <span className={styles.consentLabel}>
                  <span className={styles.required}>[필수]</span>
                  계정 식별을 위한 이메일 수집에 동의합니다
                </span>
              }
            />
            <p className={styles.consentDesc}>
              Google 로그인 시 제공되는 이메일 주소가 저장됩니다.
            </p>
          </div>

          {/* 프로필 수집 */}
          <div className={styles.consentItem}>
            <Form.Check
              type="checkbox"
              id="consent-profile"
              checked={consents.profileCollection}
              onChange={(e) => setConsents(prev => ({ ...prev, profileCollection: e.target.checked }))}
              label={
                <span className={styles.consentLabel}>
                  <span className={styles.required}>[필수]</span>
                  프로필 정보(이름, 사진) 수집에 동의합니다
                </span>
              }
            />
            <p className={styles.consentDesc}>
              Google 계정의 표시 이름과 프로필 사진이 저장됩니다.
            </p>
          </div>

          {/* 캐릭터 데이터 */}
          <div className={styles.consentItem}>
            <Form.Check
              type="checkbox"
              id="consent-character"
              checked={consents.characterData}
              onChange={(e) => setConsents(prev => ({ ...prev, characterData: e.target.checked }))}
              label={
                <span className={styles.consentLabel}>
                  <span className={styles.required}>[필수]</span>
                  게임 캐릭터 정보 수집에 동의합니다
                </span>
              }
            />
            <p className={styles.consentDesc}>
              서비스 이용 시 등록하는 캐릭터명, 서버, 직업, 레벨 정보가 저장됩니다.
            </p>
          </div>
        </div>

        <p className={styles.notice}>
          동의하지 않으시면 서비스 이용이 제한됩니다.
        </p>
      </Modal.Body>
      <Modal.Footer className={styles.footer}>
        <Button variant="outline-secondary" onClick={handleCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? <Spinner animation="border" size="sm" /> : '동의하고 가입하기'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
