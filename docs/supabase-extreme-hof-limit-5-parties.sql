-- ============================================================
-- 칭호 통계 · HOF 상한 5공대(40명) 정합화 패치
--
-- 배경:
--   초기 v2 설계에서 HOF 를 10공대(80명)까지 받도록 작성되었으나
--   실제 운영은 5공대(40명) → 이후 개인 등록 모드로 전환됨.
--   프론트엔드(`app/title-stats/frost/page.tsx`, `app/title-stats/page.tsx`)는
--   이미 5공대만 노출하지만, RPC 의 `v_count >= 10` 가드가 남아 있어
--   다른 클라이언트/직접 RPC 호출 시 6~10공대까지 들어올 수 있는 잠재 리스크 제거.
--
-- 변경 내용:
--   1) register_extreme_party — HOF 상한 10 → 5 로 축소
--   2) 그 외 동작·시그니처·KST 처리 모두 patch-kst.sql 과 동일
--
-- 적용 방법:
--   Supabase 대시보드 → SQL Editor → 전체 복사 붙여넣기 → Run
--
-- 영향 범위:
--   - 테이블/스키마 변경 없음
--   - 기존 등록 데이터 변경 없음
--   - register_extreme_individual / register_extreme_individual_with_image 변경 없음
--     (이미 < 5 검사로 페이즈 분기 정합)
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

  -- 같은 칭호의 공대 등록은 직렬화 (다른 칭호끼리는 동시 진행 OK)
  PERFORM pg_advisory_xact_lock(hashtext('extreme_parties:' || p_title));

  -- 5공대(=40명) 도달 후 공대 등록 차단 (이전 10에서 축소)
  SELECT COUNT(*) INTO v_count FROM extreme_parties WHERE title = p_title;
  IF v_count >= 5 THEN
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

-- 확인용 (선택) — 현재 공대 수
-- SELECT title, COUNT(*) FROM extreme_parties GROUP BY title;
