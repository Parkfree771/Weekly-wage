# 아바타 갤러리 Firestore 보안 규칙

아래 규칙을 Firebase Console > Firestore > Rules에 추가해주세요.

```javascript
// 기존 규칙에 추가

// ─── 아바타 갤러리 ───
match /avatarPosts/{postId} {
  // 누구나 읽기 가능
  allow read: if true;

  // 로그인한 사용자만 생성 가능, authorUid가 본인이어야 함
  allow create: if request.auth != null
                && request.resource.data.authorUid == request.auth.uid;

  // 본인만 수정/삭제 가능
  allow update, delete: if request.auth != null
                        && resource.data.authorUid == request.auth.uid;

  // 좋아요 서브컬렉션
  match /likes/{uid} {
    allow read: if true;
    allow create, delete: if request.auth != null
                          && request.auth.uid == uid;
  }
}
```

## 필요한 Firestore 인덱스

Firebase Console > Firestore > Indexes에서 생성:

| 컬렉션 | 필드 1 | 필드 2 | 쿼리 범위 |
|---------|--------|--------|----------|
| avatarPosts | characterClass (ASC) | createdAt (DESC) | Collection |
| avatarPosts | characterClass (ASC) | likeCount (DESC) | Collection |
| avatarPosts | authorUid (ASC) | createdAt (DESC) | Collection |

> 인덱스는 처음 쿼리 실행 시 Firestore가 자동으로 인덱스 생성 링크를 에러 메시지에 포함합니다.
> 해당 링크를 클릭하면 인덱스가 자동 생성됩니다.
