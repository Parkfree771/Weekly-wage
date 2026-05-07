# 콘테스트 좋아요 Supabase 셋업 가이드

이 문서는 Supabase 콘솔에서 직접 해야 할 작업입니다. 순서대로 따라하세요.

---

## 1. Firebase Auth → Supabase Third-Party Auth 연결 (한 번만)

### 1-1. Supabase 콘솔에서 Firebase 등록

1. Supabase 대시보드 접속 → 프로젝트 선택
2. 좌측 메뉴: **Authentication → Sign In / Providers**
3. 하단 **Third-Party Auth** 섹션에서 **Add provider** → **Firebase** 선택
4. 입력 항목:
   - **Firebase Project ID**: Firebase 콘솔의 프로젝트 ID (예: `loalogol-xxxxx`)
5. **Save** 클릭

> 이걸 한 번 해두면 Firebase ID Token을 그대로 Supabase 인증으로 쓸 수 있습니다. uid가 일치합니다.

### 1-2. 검증

연결되면 Supabase RLS 정책에서 `auth.jwt() ->> 'sub'`가 Firebase uid와 같은 값으로 들어옵니다.

---

## 2. SQL 스크립트 실행

Supabase 대시보드 → 좌측 **SQL Editor** → **New query** → 아래 전체 복붙 → **Run**.

```sql
-- ============================================
-- 콘테스트 좋아요 테이블 + 트리거 + RLS
-- ============================================

-- ── 1. 일러스트 좋아요 (slug + uid 한 쌍 = 1 좋아요) ──
create table if not exists contest_illust_likes (
  slug text not null,
  uid text not null,
  created_at timestamptz not null default now(),
  primary key (slug, uid)
);
create index if not exists idx_illust_likes_slug on contest_illust_likes (slug);
create index if not exists idx_illust_likes_uid on contest_illust_likes (uid);

-- 일러스트 좋아요 카운트 집계 테이블 (페이지 진입 시 1회 read 용)
create table if not exists contest_illust_like_counts (
  slug text primary key,
  like_count bigint not null default 0
);

-- ── 2. 무기 좋아요 ──
create table if not exists contest_weapon_likes (
  weapon_id text not null,
  uid text not null,
  illust_slug text not null,
  created_at timestamptz not null default now(),
  primary key (weapon_id, uid)
);
create index if not exists idx_weapon_likes_weapon on contest_weapon_likes (weapon_id);
create index if not exists idx_weapon_likes_uid on contest_weapon_likes (uid);
create index if not exists idx_weapon_likes_slug on contest_weapon_likes (illust_slug);

create table if not exists contest_weapon_like_counts (
  weapon_id text primary key,
  like_count bigint not null default 0
);

-- ============================================
-- 트리거: 좋아요 INSERT/DELETE 시 카운트 자동 갱신
-- ============================================

-- 일러스트 좋아요 카운트
create or replace function _update_illust_like_count() returns trigger
language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    insert into contest_illust_like_counts (slug, like_count)
    values (new.slug, 1)
    on conflict (slug) do update set like_count = contest_illust_like_counts.like_count + 1;
  elsif (TG_OP = 'DELETE') then
    update contest_illust_like_counts
    set like_count = greatest(0, like_count - 1)
    where slug = old.slug;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_illust_like_count on contest_illust_likes;
create trigger trg_illust_like_count
  after insert or delete on contest_illust_likes
  for each row execute function _update_illust_like_count();

-- 무기 좋아요 카운트
create or replace function _update_weapon_like_count() returns trigger
language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    insert into contest_weapon_like_counts (weapon_id, like_count)
    values (new.weapon_id, 1)
    on conflict (weapon_id) do update set like_count = contest_weapon_like_counts.like_count + 1;
  elsif (TG_OP = 'DELETE') then
    update contest_weapon_like_counts
    set like_count = greatest(0, like_count - 1)
    where weapon_id = old.weapon_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_weapon_like_count on contest_weapon_likes;
create trigger trg_weapon_like_count
  after insert or delete on contest_weapon_likes
  for each row execute function _update_weapon_like_count();

-- ============================================
-- RLS (Row Level Security) — 비로그인 차단 + 본인 데이터만 쓰기
-- ============================================

alter table contest_illust_likes enable row level security;
alter table contest_illust_like_counts enable row level security;
alter table contest_weapon_likes enable row level security;
alter table contest_weapon_like_counts enable row level security;

-- 정책 재실행 안전화 (이미 있는 정책 삭제 후 재생성)
drop policy if exists "anyone read" on contest_illust_like_counts;
drop policy if exists "anyone read" on contest_weapon_like_counts;
drop policy if exists "self select" on contest_illust_likes;
drop policy if exists "self insert" on contest_illust_likes;
drop policy if exists "self delete" on contest_illust_likes;
drop policy if exists "self select" on contest_weapon_likes;
drop policy if exists "self insert" on contest_weapon_likes;
drop policy if exists "self delete" on contest_weapon_likes;

-- 카운트 테이블: 누구나 read
create policy "anyone read" on contest_illust_like_counts for select using (true);
create policy "anyone read" on contest_weapon_like_counts for select using (true);

-- 일러스트 좋아요: 로그인 + 본인 uid 만
create policy "self select" on contest_illust_likes for select
  using (uid = (select auth.jwt() ->> 'sub'));
create policy "self insert" on contest_illust_likes for insert
  with check (uid = (select auth.jwt() ->> 'sub'));
create policy "self delete" on contest_illust_likes for delete
  using (uid = (select auth.jwt() ->> 'sub'));

-- 무기 좋아요: 동일 패턴
create policy "self select" on contest_weapon_likes for select
  using (uid = (select auth.jwt() ->> 'sub'));
create policy "self insert" on contest_weapon_likes for insert
  with check (uid = (select auth.jwt() ->> 'sub'));
create policy "self delete" on contest_weapon_likes for delete
  using (uid = (select auth.jwt() ->> 'sub'));
```

### 검증
SQL 실행 후 좌측 **Table Editor** 들어가면 4개 테이블 보여야 합니다:
- `contest_illust_likes` / `contest_illust_like_counts`
- `contest_weapon_likes` / `contest_weapon_like_counts`

각 테이블 우측 `RLS enabled` 체크 표시 확인.

---

## 3. 작업 끝 — 알려주세요

위 두 단계 다 끝나면 알려주세요. 그러면 클라이언트가 Supabase 좋아요 호출을 정상 동작시킵니다.

---

## 참고 — 데이터 모델

```
일러스트 좋아요 카운트 → contest_illust_like_counts.like_count
일러스트 본인 좋아요 → contest_illust_likes WHERE uid = 본인
무기 좋아요 카운트   → contest_weapon_like_counts.like_count
무기 본인 좋아요    → contest_weapon_likes WHERE uid = 본인
```

진입 시 호출:
1. `select * from contest_illust_like_counts` — 12행 (1 query)
2. `select slug from contest_illust_likes where uid = 본인` — 1 query
3. (캐시 hit이면 둘 다 skip)

좋아요 토글:
- INSERT 또는 DELETE 1번 → 트리거가 카운트 자동 갱신
