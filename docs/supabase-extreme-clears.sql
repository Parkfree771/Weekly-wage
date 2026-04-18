-- ============================================================
-- [STEP 1] 원시 수집 테이블 (extreme_clears)
--
-- 사이트에서 "통계에 등록하기" 버튼 클릭 시 INSERT.
-- 사이트는 이 테이블을 직접 읽지 않음 (통계 테이블만 읽음).
-- ============================================================

DROP TABLE IF EXISTS extreme_clears CASCADE;

CREATE TABLE extreme_clears (
  id             BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  character_name TEXT        NOT NULL,
  character_class TEXT       NOT NULL,
  role           TEXT        NOT NULL CHECK (role IN ('dealer', 'supporter')),
  item_level     NUMERIC     NOT NULL,
  combat_power   NUMERIC     NOT NULL,
  title          TEXT        NOT NULL CHECK (title IN ('홍염의 군주', '혹한의 군주')),
  cleared_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 같은 캐릭터 + 같은 칭호 중복 차단 (홍염/혹한은 별개라 둘 다 등록 가능)
  CONSTRAINT uq_char_title UNIQUE (character_name, title)
);

-- 집계용 인덱스 (title + 날짜)
CREATE INDEX idx_extreme_clears_title_date
  ON extreme_clears (title, cleared_at);

-- RLS: anon read + insert 허용 (update/delete 차단)
ALTER TABLE extreme_clears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON extreme_clears
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON extreme_clears
  FOR INSERT WITH CHECK (true);
