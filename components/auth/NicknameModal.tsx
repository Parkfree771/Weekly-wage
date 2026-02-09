'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { validateNickname, checkNicknameAvailable } from '@/lib/nickname-service';
import styles from './NicknameModal.module.css';

export default function NicknameModal() {
  const { user, userProfile, setNickname } = useAuth();
  const [nickname, setNicknameInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 입력 변경 시 실시간 검증
  useEffect(() => {
    if (!nickname) {
      setStatus('idle');
      setMessage('');
      return;
    }

    const validation = validateNickname(nickname);
    if (!validation.valid) {
      setStatus('invalid');
      setMessage(validation.message);
      return;
    }

    // 형식 통과 → debounce로 중복 확인
    setStatus('checking');
    setMessage('확인 중...');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await checkNicknameAvailable(nickname);
        if (available) {
          setStatus('available');
          setMessage('사용 가능한 닉네임입니다.');
        } else {
          setStatus('taken');
          setMessage('이미 사용 중인 닉네임입니다.');
        }
      } catch {
        setStatus('invalid');
        setMessage('중복 확인에 실패했습니다.');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nickname]);

  const handleSubmit = async () => {
    if (status !== 'available') return;

    setIsSubmitting(true);
    try {
      await setNickname(nickname);
    } catch (err: any) {
      setStatus('invalid');
      setMessage(err.message || '닉네임 설정에 실패했습니다.');
    }
    setIsSubmitting(false);
  };

  if (!user || !userProfile) return null;

  return (
    <Modal show={true} centered backdrop="static" keyboard={false} className={styles.modal}>
      <Modal.Header className={styles.header}>
        <Modal.Title className={styles.title}>닉네임 설정</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.body}>
        <p className={styles.description}>
          서비스 이용을 위해 닉네임을 설정해주세요.
        </p>

        <div className={styles.inputGroup}>
          <input
            type="text"
            className={styles.nicknameInput}
            value={nickname}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder="닉네임 입력 (한글/영어/숫자, 최대 12자)"
            maxLength={12}
            disabled={isSubmitting}
          />
          <div className={`${styles.feedback} ${
            status === 'available' ? styles.feedbackSuccess :
            status === 'taken' || status === 'invalid' ? styles.feedbackError :
            status === 'checking' ? styles.feedbackChecking : ''
          }`}>
            {message}
          </div>
        </div>

        <ul className={styles.rules}>
          <li>한글, 영어, 숫자만 사용 가능</li>
          <li>최대 12자</li>
          <li>대소문자 구분 없이 중복 불가</li>
        </ul>
      </Modal.Body>
      <Modal.Footer className={styles.footer}>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={status !== 'available' || isSubmitting}
        >
          {isSubmitting ? <Spinner animation="border" size="sm" /> : '설정 완료'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
