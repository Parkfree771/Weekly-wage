-- ============================================================
-- 칭호 통계 · KST 타임존 패치 (v2 이미 배포된 환경용)
--
-- 문제:
--   CURRENT_DATE 가 Supabase 기본 TZ(UTC) 기준으로 계산되어,
--   한국 시간 00:00~08:59(= UTC 전날 15:00~23:59) 사이 등록분이
--   하루 이른 날짜로 집계되던 문제 수정.
--
-- 동작:
--   1) extreme_clears.cleared_at 기본값을 KST 기준으로 변경
--   2) register_extreme_party / register_extreme_individual RPC 재정의
--   3) 기존 mis-dated 행을 created_at(KST) 기준으로 백필
--   4) extreme_daily_stats / extreme_class_stats 전체 재집계
--
-- 적용:
--   Supabase → SQL Editor → 전체 복사 붙여넣기 → Run
-- ============================================================

-- 1) 컬럼 기본값 교체
ALTER TABLE extreme_clears
  ALTER COLUMN cleared_at
  SET DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;

-- 2) 공대 등록 RPC 재정의 (CURRENT_DATE → KST DATE)
CREATE OR REPLACE FUNCTION register_extreme_party(
  p_title      TEXT,
  p_party_name TEXT,
  p_members    JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_party_id  UUID;
  v_member    JSONB;
  v_count     INT;
  v_name      TEXT;
  v_trimmed   TEXT;
  v_source_id BIGINT;
  v_today     DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
BEGIN
  v_trimmed := TRIM(p_party_name);

  IF v_trimmed IS NULL OR v_trimmed = '' THEN
    RAISE EXCEPTION 'EXT_EMPTY_PARTY_NAME';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('extreme_parties:' || p_title));

  SELECT COUNT(*) INTO v_count FROM extreme_parties WHERE title = p_title;
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'EXT_HOF_FULL';
  END IF;

  IF jsonb_array_length(p_members) <> 8 THEN
    RAISE EXCEPTION 'EXT_MUST_BE_8';
  END IF;

  INSERT INTO extreme_parties (title, party_name)
  VALUES (p_title, v_trimmed)
  RETURNING id INTO v_party_id;

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
      v_today
    )
    RETURNING id INTO v_source_id;

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
      v_today
    );
  END LOOP;

  RETURN v_party_id;
END;
$$;

-- 3) 개인 등록 RPC 재정의 (CURRENT_DATE → KST DATE)
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
  v_today       DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
BEGIN
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
    v_today
  )
  RETURNING id INTO v_new_id;

  IF p_sibling_names IS NOT NULL AND array_length(p_sibling_names, 1) > 0 THEN
    INSERT INTO extreme_roster_locks (title, character_name, source_id, party_id)
    SELECT p_title, TRIM(s), v_new_id, NULL
    FROM unnest(p_sibling_names) AS s
    WHERE TRIM(s) <> '';
  END IF;

  PERFORM _increment_extreme_stats(p_title, p_character_class, p_role, p_item_level, p_combat_power, v_today);

  RETURN v_new_id;
END;
$$;

-- 4) [드라이런] 변경 대상 먼저 확인 — 실행 전 결과 눈으로 확인 권장
-- (공대 행은 4/22 10:00 KST 오픈 직후부터 등록되어 UTC/KST 날짜가 동일하므로 영향 없음.
--  그래도 안전하게 개인 등록만 대상 — party_id IS NULL.)
-- SELECT id, character_name, title, cleared_at AS old_date,
--        (created_at AT TIME ZONE 'Asia/Seoul')::DATE AS new_date,
--        created_at
-- FROM extreme_clears
-- WHERE party_id IS NULL
--   AND cleared_at IS DISTINCT FROM (created_at AT TIME ZONE 'Asia/Seoul')::DATE
-- ORDER BY created_at;

-- 5) 개인 등록 행만 백필 — 공대 행은 절대 건드리지 않음
UPDATE extreme_clears
SET cleared_at = (created_at AT TIME ZONE 'Asia/Seoul')::DATE
WHERE party_id IS NULL
  AND cleared_at IS DISTINCT FROM (created_at AT TIME ZONE 'Asia/Seoul')::DATE;

-- 6) 통계 캐시 전체 재집계 — extreme_clears 원본에서 다시 계산
--    공대 행은 안 바뀌었으므로 집계값도 그대로, 개인 행만 올바른 날짜로 반영됨
SELECT rebuild_extreme_stats();

-- 7) 확인용 (선택) — 홍염의 군주 일별 집계 현황
-- SELECT clear_date, role, clear_count, avg_power, avg_level
-- FROM extreme_daily_stats
-- WHERE title = '홍염의 군주'
-- ORDER BY clear_date, role;
