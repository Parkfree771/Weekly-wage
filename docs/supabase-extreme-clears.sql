-- 익스트림 레이드 클리어 기록 테이블
CREATE TABLE extreme_clears (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  character_name TEXT NOT NULL,
  character_class TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('dealer', 'supporter')),
  item_level NUMERIC NOT NULL,
  combat_power NUMERIC NOT NULL,
  title TEXT NOT NULL CHECK (title IN ('홍염의 군주', '혹한의 군주')),
  cleared_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스: 차트 조회 최적화 (칭호별 + 날짜 정렬)
CREATE INDEX idx_extreme_clears_title_date ON extreme_clears (title, cleared_at);

-- 인덱스: 중복 방지 조회 (캐릭터 + 칭호)
CREATE INDEX idx_extreme_clears_char_title ON extreme_clears (character_name, title);

-- RLS 정책 (anon key로 insert + select 허용)
ALTER TABLE extreme_clears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON extreme_clears
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON extreme_clears
  FOR INSERT WITH CHECK (true);
