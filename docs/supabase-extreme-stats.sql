-- ============================================================
-- [STEP 2] 통계 테이블 + 수동 갱신 함수
--
-- 사이트는 이 두 테이블만 SELECT.
-- 관리자가 원할 때 다음을 실행해 원시 테이블로부터 재집계:
--
--   SELECT rebuild_extreme_stats();
-- ============================================================

DROP TABLE IF EXISTS extreme_daily_stats CASCADE;
DROP TABLE IF EXISTS extreme_class_stats CASCADE;
DROP FUNCTION IF EXISTS rebuild_extreme_stats();

-- ============================================================
-- 일별 × 역할별 (차트용)
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

CREATE INDEX idx_daily_stats_title_date
  ON extreme_daily_stats (title, clear_date);

-- ============================================================
-- 직업별 (리스트용)
-- ============================================================
CREATE TABLE extreme_class_stats (
  title           TEXT        NOT NULL,
  character_class TEXT        NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('dealer', 'supporter')),
  clear_count     INT         NOT NULL,
  avg_power       NUMERIC     NOT NULL,
  avg_level       NUMERIC     NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (title, character_class)
);

CREATE INDEX idx_class_stats_title_count
  ON extreme_class_stats (title, clear_count DESC);

-- ============================================================
-- 수동 갱신 함수
-- 두 통계 테이블을 TRUNCATE 후 extreme_clears에서 싹 다시 집계
-- ============================================================
CREATE OR REPLACE FUNCTION rebuild_extreme_stats()
RETURNS TABLE (daily_rows INT, class_rows INT) AS $$
DECLARE
  daily_n INT;
  class_n INT;
BEGIN
  TRUNCATE extreme_daily_stats;
  INSERT INTO extreme_daily_stats (title, clear_date, role, clear_count, avg_power, avg_level, updated_at)
  SELECT title,
         cleared_at,
         role,
         COUNT(*)::int,
         ROUND(AVG(combat_power))::numeric,
         ROUND(AVG(item_level)::numeric, 2),
         NOW()
  FROM extreme_clears
  GROUP BY title, cleared_at, role;

  GET DIAGNOSTICS daily_n = ROW_COUNT;

  TRUNCATE extreme_class_stats;
  INSERT INTO extreme_class_stats (title, character_class, role, clear_count, avg_power, avg_level, updated_at)
  SELECT title,
         character_class,
         role,
         COUNT(*)::int,
         ROUND(AVG(combat_power))::numeric,
         ROUND(AVG(item_level)::numeric, 2),
         NOW()
  FROM extreme_clears
  GROUP BY title, character_class, role;

  GET DIAGNOSTICS class_n = ROW_COUNT;

  RETURN QUERY SELECT daily_n, class_n;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS: anon 읽기만 허용 (쓰기는 함수 실행 시점에만)
-- ============================================================
ALTER TABLE extreme_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE extreme_class_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON extreme_daily_stats
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON extreme_class_stats
  FOR SELECT USING (true);
