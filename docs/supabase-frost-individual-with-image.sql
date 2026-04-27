-- ============================================================
-- 혹한의 군주 — 개인 등록 RPC 신규 추가 (character_image 저장)
--
-- 목적:
--   혹한의 군주 페이지(/title-stats/frost)는 개인 등록자도
--   캐릭터 이미지·닉네임·직업·전투력을 카드 형태로 노출한다.
--   기존 register_extreme_individual 은 character_image 를 NULL 로 강제
--   (홍염은 명전 80명에만 이미지 노출) 이므로 이미지를 받는 신규 함수를 추가.
--
-- 영향 범위:
--   - 5개 기존 테이블 (extreme_parties, extreme_clears, extreme_roster_locks,
--     extreme_daily_stats, extreme_class_stats) — schema 변경 0
--   - 기존 register_extreme_party / register_extreme_individual / rebuild_extreme_stats
--     — 변경 0 (DROP/REPLACE 없음)
--   - 홍염의 군주 운영 데이터 — 영향 0
--
-- 사용처:
--   lib/extreme-service.ts 의 registerFrostIndividual() 가 호출.
--   홍염 코드는 기존 register_extreme_individual 을 그대로 사용.
--
-- 롤백:
--   DROP FUNCTION IF EXISTS register_extreme_individual_with_image(
--     TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[], TEXT
--   );
-- ============================================================

CREATE OR REPLACE FUNCTION register_extreme_individual_with_image(
  p_character_name  TEXT,
  p_character_class TEXT,
  p_role            TEXT,
  p_item_level      NUMERIC,
  p_combat_power    NUMERIC,
  p_title           TEXT,
  p_sibling_names   TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_character_image TEXT   DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_party_count INT;
  v_new_id      BIGINT;
  v_today       DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
BEGIN
  -- 페이즈 검증 — 5공대 40명 채워진 후에만 개인 등록 허용 (홍염 함수와 동일)
  SELECT COUNT(*) INTO v_party_count FROM extreme_parties WHERE title = p_title;
  IF v_party_count < 5 THEN
    RAISE EXCEPTION 'EXT_PARTY_PHASE_ONLY';
  END IF;

  -- INSERT — character_image 컬럼에 파라미터 값 저장 (홍염과의 유일한 차이)
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
    p_character_image,
    NULL,
    v_today
  )
  RETURNING id INTO v_new_id;

  -- 원정대 lock — 홍염과 동일 (PK 가 (title, character_name) 이라 자동 분리)
  IF p_sibling_names IS NOT NULL AND array_length(p_sibling_names, 1) > 0 THEN
    INSERT INTO extreme_roster_locks (title, character_name, source_id, party_id)
    SELECT p_title, TRIM(s), v_new_id, NULL
    FROM unnest(p_sibling_names) AS s
    WHERE TRIM(s) <> '';
  END IF;

  -- 통계 증분 — 홍염과 동일 헬퍼 사용
  PERFORM _increment_extreme_stats(
    p_title, p_character_class, p_role, p_item_level, p_combat_power, v_today
  );

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_extreme_individual_with_image(
  TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT[], TEXT
) TO anon, authenticated;
