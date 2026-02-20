'use client';

import { useState } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { createInquiryPost } from '@/lib/inquiry-service';

type Props = {
  show: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function InquiryWriteModal({ show, onClose, onCreated }: Props) {
  const { user, userProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await createInquiryPost({
        authorUid: user.uid,
        authorNickname: userProfile?.nickname || user.displayName || '익명',
        authorEmail: user.email || '',
        title: title.trim(),
        content: content.trim(),
        isPrivate,
      });
      setTitle('');
      setContent('');
      setIsPrivate(false);
      onCreated();
      onClose();
    } catch (err) {
      console.error('글 작성 실패:', err);
    }
    setSubmitting(false);
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1rem', fontWeight: 600 }}>문의 작성</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontSize: '0.85rem' }}>제목</Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={50}
            disabled={submitting}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontSize: '0.85rem' }}>내용</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            maxLength={1000}
            disabled={submitting}
          />
          <Form.Text className="text-muted">{content.length}/1000</Form.Text>
        </Form.Group>
        <Form.Check
          type="switch"
          id="private-toggle"
          label="비공개"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          disabled={submitting}
          style={{ fontSize: '0.85rem' }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
          취소
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
        >
          {submitting ? <Spinner animation="border" size="sm" /> : '등록'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
