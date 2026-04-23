-- ============================================================
-- 홍염/혹한의 군주 · 칭호 통계 + 명예의 전당 (v2 · 전체 교체)
--
-- 적용 순서:
--   1) Supabase 대시보드 → SQL Editor
--   2) 이 파일 전체 복사 → Run
--   3) 기존 extreme_* 테이블/함수는 모두 drop 후 재생성됨
--
-- 클라이언트는 RPC 두 개만 호출:
--   - register_extreme_party(title, party_name, members JSONB)    -- 공대 단위 8인 일괄
--   - register_extreme_individual(name, class, role, lvl, pw, title)  -- 40명 채워진 이후
-- 테이블 직접 INSERT/UPDATE/DELETE 는 RLS 로 차단.
-- ============================================================

-- 0) 기존 구조 제거
DROP FUNCTION IF EXISTS register_extreme_party(TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS register_extreme_individual(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS register_extreme_individual(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS _increment_extreme_stats(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, DATE) CASCADE;
DROP FUNCTION IF EXISTS rebuild_extreme_stats() CASCADE;
DROP TABLE IF EXISTS extreme_roster_locks CASCADE;
DROP TABLE IF EXISTS extreme_daily_stats CASCADE;
DROP TABLE IF EXISTS extreme_class_stats CASCADE;
DROP TABLE IF EXISTS extreme_clears CASCADE;
DROP TABLE IF EXISTS extreme_parties CASCADE;

-- ============================================================
-- 1) 공대 테이블 (HOF 최대 10공대)
-- ============================================================
CREATE TABLE extreme_parties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL CHECK (title IN ('홍염의 군주', '혹한의 군주')),
  party_name  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_parties_title_name UNIQUE (title, party_name)
);

CREATE INDEX idx_parties_title_created ON extreme_parties (title, created_at);

-- ============================================================
-- 2) 수집 테이블 (모든 등록 건 · 공대 멤버 + 개인)
-- ============================================================
CREATE TABLE extreme_clears (
  id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  character_name  TEXT        NOT NULL,
  character_class TEXT        NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('dealer', 'supporter')),
  item_level      NUMERIC     NOT NULL,
  combat_power    NUMERIC     NOT NULL,
  title           TEXT        NOT NULL CHECK (title IN ('홍염의 군주', '혹한의 군주')),
  character_image TEXT,                    -- HOF 공대원만 저장 (개인 등록은 NULL)
  party_id        UUID        REFERENCES extreme_parties(id) ON DELETE CASCADE,
  -- Supabase 서버 TZ 가 UTC 이므로 CURRENT_DATE 는 한국 기준 하루 어긋날 수 있음 → KST 로 고정
  cleared_at      DATE        NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul')::DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 같은 캐릭터가 같은 칭호로 중복 등록 불가 (공대 2번 가입/ 개인 재등록 방지)
  CONSTRAINT uq_clears_char_title UNIQUE (character_name, title)
);

CREATE INDEX idx_clears_title_created ON extreme_clears (title, created_at);
CREATE INDEX idx_clears_party         ON extreme_clears (party_id);
CREATE INDEX idx_clears_title_date    ON extreme_clears (title, cleared_at);

-- ============================================================
-- 2-b) 원정대 잠금 — 같은 원정대(같은 유저) 중복 등록 방지
-- 한 캐릭터가 등록되면 그 원정대의 모든 닉네임이 이 테이블에 들어감.
-- 나중에 다른 캐릭터(alt)가 같은 원정대에서 등록 시도하면 PK 충돌로 거절.
-- ============================================================
CREATE TABLE extreme_roster_locks (
  title          TEXT        NOT NULL CHECK (title IN ('홍염의 군주', '혹한의 군주')),
  character_name TEXT        NOT NULL,
  source_id      BIGINT      REFERENCES extreme_clears(id) ON DELETE CASCADE,
  party_id       UUID        REFERENCES extreme_parties(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (title, character_name)
);

CREATE INDEX idx_roster_locks_party ON extreme_roster_locks (party_id);

-- ============================================================
-- 3) 통계 캐시 — 일별 × 역할
-- ============================================================
CREATE TABLE extreme_daily_stats (
  title       TEXT        NOT NULL,
  clear_date  DATE        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('dealer', 'supporter')),
  clear_count INT         NOT NULL,
  avg_power   NUMERIC     NOT NULL,
  avg_level   NUMERIC     NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (title, clear_date, role)
);

CREATE INDEX idx_daily_stats_title_date ON extreme_daily_stats (title, clear_date);

-- ============================================================
-- 4) 통계 캐시 — 직업별 × 역할 (role PK 포함: 발키리 딜/서폿 분리)
-- ============================================================
CREATE TABLE extreme_class_stats (
  title           TEXT        NOT NULL,
  character_class TEXT        NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('dealer', 'supporter')),
  clear_count     INT         NOT NULL,
  avg_power       NUMERIC     NOT NULL,
  avg_level       NUMERIC     NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (title, character_class, role)
);

CREATE INDEX idx_class_stats_title_count ON extreme_class_stats (title, clear_count DESC);

-- ============================================================
-- 5) 증분 집계 헬퍼 — 한 건 INSERT 할 때 통계 테이블 즉시 UPSERT
-- ============================================================
CREATE OR REPLACE FUNCTION _increment_extreme_stats(
  p_title           TEXT,
  p_character_class TEXT,
  p_role            TEXT,
  p_item_level      NUMERIC,
  p_combat_power    NUMERIC,
  p_cleared_at      DATE
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- daily_stats: 새 행이면 INSERT, 기존이면 누적 평균으로 UPDATE
  INSERT INTO extreme_daily_stats AS d
    (title, clear_date, role, clear_count, avg_power, avg_level, updated_at)
  VALUES
    (p_title, p_cleared_at, p_role, 1, ROUND(p_combat_power), ROUND(p_item_level::numeric, 2), NOW())
  ON CONFLICT (title, clear_date, role) DO UPDATE
  SET clear_count = d.clear_count + 1,
      avg_power   = ROUND((d.avg_power * d.clear_count + p_combat_power) / (d.clear_count + 1)),
      avg_level   = ROUND((d.avg_level * d.clear_count + p_item_level) / (d.clear_count + 1), 2),
      updated_at  = NOW();

  -- class_stats: 동일한 증분 평균
  INSERT INTO extreme_class_stats AS c
    (title, character_class, role, clear_count, avg_power, avg_level, updated_at)
  VALUES
    (p_title, p_character_class, p_role, 1, ROUND(p_combat_power), ROUND(p_item_level::numeric, 2), NOW())
  ON CONFLICT (title, character_class, role) DO UPDATE
  SET clear_count = c.clear_count + 1,
      avg_power   = ROUND((c.avg_power * c.clear_count + p_combat_power) / (c.clear_count + 1)),
      avg_level   = ROUND((c.avg_level * c.clear_count + p_item_level) / (c.clear_count + 1), 2),
      updated_at  = NOW();
END;
$$;

-- ============================================================
-- 6) RPC — 공대 등록 (원자적 1 + 8 INSERT)
--
-- 검증 순서:
--   (a) advisory lock 으로 해당 title 의 공대 등록을 직렬화
--   (b) 이미 10공대면 거부
--   (c) 멤버 수 == 8 확인
--   (d) 파티 INSERT (공대명 UNIQUE 제약으로 중복 차단)
--   (e) 멤버 8명 INSERT (캐릭터명 UNIQUE 제약으로 중복 차단)
--   (f) 각 멤버마다 통계 증분
--
-- 어느 단계든 실패하면 전체 롤백.
-- ============================================================
CREATE OR REPLACE FUNCTION register_extreme_party(
  p_title      TEXT,
  p_party_name TEXT,
  p_members    JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_party_id UUID;
  v_member   JSONB;
  v_count    INT;
  v_name     TEXT;
  v_trimmed  TEXT;
  v_source_id BIGINT;
BEGIN
  v_trimmed := TRIM(p_party_name);

  IF v_trimmed IS NULL OR v_trimmed = '' THEN
    RAISE EXCEPTION 'EXT_EMPTY_PARTY_NAME';
  END IF;

  -- (a) 같은 칭호의 동시 공대 등록을 직렬화 (다른 칭호끼리는 동시 진행 OK)
  PERFORM pg_advisory_xact_lock(hashtext('extreme_parties:' || p_title));

  -- (b) 이미 10공대 이상이면 거부
  SELECT COUNT(*) INTO v_count FROM extreme_parties WHERE title = p_title;
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'EXT_HOF_FULL';
  END IF;

  -- (c) 멤버 8명 고정
  IF jsonb_array_length(p_members) <> 8 THEN
    RAISE EXCEPTION 'EXT_MUST_BE_8';
  END IF;

  -- (d) 공대 INSERT
  INSERT INTO extreme_parties (title, party_name)
  VALUES (p_title, v_trimmed)
  RETURNING id INTO v_party_id;

  -- (e) 멤버 8명 INSERT + 통계 증분 + 원정대 잠금
  FOR v_member IN SELECT * FROM jsonb_array_elements(p_members)
  LOOP
    v_name := TRIM(v_member->>'character_name');

    INSERT INTO extreme_clears (
      character_name, character_class, role,
      item_level, combat_power, title,
      character_image, party_id, cleared_at
    ) VALUES (
      v_name,
      v_member->>'character_class',
      v_member->>'role',
      (v_member->>'item_level')::NUMERIC,
      (v_member->>'combat_power')::NUMERIC,
      p_title,
      NULLIF(v_member->>'character_image', ''),
      v_party_id,
      (NOW() AT TIME ZONE 'Asia/Seoul')::DATE
    )
    RETURNING id INTO v_source_id;

    -- 원정대 잠금: sibling_names 에 있는 모든 닉네임을 락 테이블에 INSERT
    -- (PK (title, character_name) 충돌 시 트랜잭션 전체 롤백 → "이미 원정대가 등록됨")
    INSERT INTO extreme_roster_locks (title, character_name, source_id, party_id)
    SELECT p_title, TRIM(sibling::TEXT, '"'), v_source_id, v_party_id
    FROM jsonb_array_elements(COALESCE(v_member->'sibling_names', '[]'::jsonb)) AS sibling
    WHERE TRIM(sibling::TEXT, '"') <> '';

    PERFORM _increment_extreme_stats(
      p_title,
      v_member->>'character_class',
      v_member->>'role',
      (v_member->>'item_level')::NUMERIC,
      (v_member->>'combat_power')::NUMERIC,
      (NOW() AT TIME ZONE 'Asia/Seoul')::DATE
    );
  END LOOP;

  RETURN v_party_id;
END;
$$;

-- ============================================================
-- 7) RPC — 개인 등록 (5공대 모두 찬 후에만)
--   - character_image 저장 안 함
--   - party_id = NULL
-- ============================================================
CREATE OR REPLACE FUNCTION register_extreme_individual(
  p_character_name  TEXT,
  p_character_class TEXT,
  p_role            TEXT,
  p_item_level      NUMERIC,
  p_combat_power    NUMERIC,
  p_title           TEXT,
  p_sibling_names   TEXT[]  DEFAULT ARRAY[]::TEXT[]
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_party_count INT;
  v_new_id      BIGINT;
BEGIN
  -- 5공대 완성 전에는 거부 (시상대 40석)
  SELECT COUNT(*) INTO v_party_count FROM extreme_parties WHERE title = p_title;
  IF v_party_count < 5 THEN
    RAISE EXCEPTION 'EXT_PARTY_PHASE_ONLY';
  END IF;

  INSERT INTO extreme_clears (
    character_name, character_class, role,
    item_level, combat_power, title,
    character_image, party_id, cleared_at
  ) VALUES (
    TRIM(p_character_name),
    p_character_class,
    p_role,
    p_item_level,
    p_combat_power,
    p_title,
    NULL,
    NULL,
    (NOW() AT TIME ZONE 'Asia/Seoul')::DATE
  )
  RETURNING id INTO v_new_id;

  -- 원정대 잠금: 전달된 siblings + 본인을 모두 락
  IF p_sibling_names IS NOT NULL AND array_length(p_sibling_names, 1) > 0 THEN
    INSERT INTO extreme_roster_locks (title, character_name, source_id, party_id)
    SELECT p_title, TRIM(s), v_new_id, NULL
    FROM unnest(p_sibling_names) AS s
    WHERE TRIM(s) <> '';
  END IF;

  PERFORM _increment_extreme_stats(p_title, p_character_class, p_role, p_item_level, p_combat_power, (NOW() AT TIME ZONE 'Asia/Seoul')::DATE);

  RETURN v_new_id;
END;
$$;

-- ============================================================
-- 8) 비상용 전체 재집계 — 수동 실행 (SELECT rebuild_extreme_stats();)
--    증분 UPSERT 로직 버그/불일치 의심 시 사용
-- ============================================================
CREATE OR REPLACE FUNCTION rebuild_extreme_stats()
RETURNS TABLE (daily_rows INT, class_rows INT)
LANGUAGE plpgsql
AS $$
DECLARE
  daily_n INT;
  class_n INT;
BEGIN
  TRUNCATE extreme_daily_stats;
  INSERT INTO extreme_daily_stats (title, clear_date, role, clear_count, avg_power, avg_level, updated_at)
  SELECT title, cleared_at, role,
         COUNT(*)::int,
         ROUND(AVG(combat_power))::numeric,
         ROUND(AVG(item_level)::numeric, 2),
         NOW()
  FROM extreme_clears
  GROUP BY title, cleared_at, role;
  GET DIAGNOSTICS daily_n = ROW_COUNT;

  TRUNCATE extreme_class_stats;
  INSERT INTO extreme_class_stats (title, character_class, role, clear_count, avg_power, avg_level, updated_at)
  SELECT title, character_class, role,
         COUNT(*)::int,
         ROUND(AVG(combat_power))::numeric,
         ROUND(AVG(item_level)::numeric, 2),
         NOW()
  FROM extreme_clears
  GROUP BY title, character_class, role;
  GET DIAGNOSTICS class_n = ROW_COUNT;

  RETURN QUERY SELECT daily_n, class_n;
END;
$$;

-- ============================================================
-- 9) RLS — 읽기는 모두 허용, 쓰기는 RPC(SECURITY DEFINER) 로만
-- ============================================================
ALTER TABLE extreme_parties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE extreme_clears         ENABLE ROW LEVEL SECURITY;
ALTER TABLE extreme_roster_locks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE extreme_daily_stats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE extreme_class_stats    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_parties"       ON extreme_parties       FOR SELECT USING (true);
CREATE POLICY "anon_read_clears"        ON extreme_clears        FOR SELECT USING (true);
CREATE POLICY "anon_read_roster_locks"  ON extreme_roster_locks  FOR SELECT USING (true);
CREATE POLICY "anon_read_daily_stats"   ON extreme_daily_stats   FOR SELECT USING (true);
CREATE POLICY "anon_read_class_stats"   ON extreme_class_stats   FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE 정책을 만들지 않음 → anon/authenticated 는 직접 수정 불가
-- SECURITY DEFINER 함수만 데이터 변경 가능

-- ============================================================
-- 10) RPC 실행 권한
-- ============================================================
GRANT EXECUTE ON FUNCTION register_extreme_party(TEXT, TEXT, JSONB)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION register_extreme_individual(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[])
  TO anon, authenticated;

-- rebuild_extreme_stats 는 서비스 롤에서만 실행하도록 별도 GRANT 안 함
