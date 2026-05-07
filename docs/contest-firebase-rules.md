# 콘테스트 페이지 — Firebase 보안 규칙

`/contest` 페이지가 사용하는 Firestore 컬렉션과 Storage 버킷을 보호하기 위한 규칙. 미설정 시 **누구나** 좋아요/댓글/업로드/삭제가 가능해질 수 있습니다.

## 1. Firestore 규칙

Firebase Console → Firestore Database → 규칙 탭에 **추가**합니다 (기존 다른 컬렉션 규칙은 그대로 두고 콘테스트 관련 블록만 삽입).

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    // ───────────────────────────────────────
    // 콘테스트 무기 아바타 (메타·이미지·댓글만 Firestore)
    // 좋아요/조회수는 Supabase 로 이전됨
    // ───────────────────────────────────────
    match /contestWeapons/{slug} {
      allow read: if true;
      allow create: if isSignedIn();
      // count(무기 총수) 필드만 increment 허용
      allow update: if isSignedIn()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['count']);

      match /items/{weaponId} {
        allow read: if true;
        // 작성: 본인 uid 로만
        allow create: if isSignedIn()
          && request.resource.data.uid == request.auth.uid;
        // 수정 권한:
        //   - 본인 글이면 모든 필드 수정
        //   - 그 외에는 commentCount 단일 필드만 increment 허용
        allow update: if isSignedIn() && (
          resource.data.uid == request.auth.uid
          || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['commentCount'])
        );
        // 삭제는 본인 글만
        allow delete: if isSignedIn()
          && resource.data.uid == request.auth.uid;

        // 무기 아바타에 달린 댓글 / 대댓글
        match /comments/{commentId} {
          allow read: if true;
          allow create: if isSignedIn()
            && request.resource.data.uid == request.auth.uid
            && request.resource.data.content.size() > 0
            && request.resource.data.content.size() <= 300;
          allow update: if isSignedIn()
            && resource.data.uid == request.auth.uid;
          allow delete: if isSignedIn()
            && resource.data.uid == request.auth.uid;
        }
      }
    }
  }
}
```

> **주의**: 위 블록만 따로 두지 말고, 사이트 전체 `rules_version`/`service cloud.firestore`/`match /databases/{database}/documents` 블록 안에 다른 기존 컬렉션 규칙들과 **함께** 두어야 합니다.

## 2. Storage 규칙

Firebase Console → Storage → 규칙 탭에 추가합니다.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // 무기 아바타 업로드 경로: contest-weapons/{slug}/{uid}_{timestamp}.webp
    // 클라이언트가 업로드 직전에 WebP 1MB 이하로 압축하므로 같은 한도로 강제
    match /contest-weapons/{slug}/{file} {
      allow read: if true;

      allow create: if request.auth != null
        && request.resource.size < 1 * 1024 * 1024
        && request.resource.contentType.matches('image/.*')
        && file.matches(request.auth.uid + '_.*');

      allow delete: if request.auth != null
        && file.matches(request.auth.uid + '_.*');
    }
  }
}
```

## 3. 인덱스

별도 복합 인덱스는 필요 없음. 모두 단일 필드 `orderBy('createdAt', 'desc')`라 자동 생성됩니다.

## 4. 검증 체크리스트

설정 후 콘솔에서 다음을 직접 시도해 막히는지 확인하세요:

| 시나리오 | 기대 결과 |
|---|---|
| 비로그인 상태로 좋아요 토글 | 거부 (Firestore 규칙) |
| 비로그인 상태로 댓글 작성 | 거부 |
| 비로그인 상태로 무기 업로드 | 거부 (Storage + Firestore) |
| 다른 사람 댓글 수정/삭제 | 거부 |
| 다른 사람 무기 삭제 | 거부 |
| 6MB 초과 파일 업로드 | 거부 (Storage) |
| 본인 글 수정/삭제 | 허용 |
| 좋아요/조회수 카운트 증감 | 허용 |
