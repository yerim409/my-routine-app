-- Supabase SQL Editor에서 실행

-- routines
CREATE TABLE routines (
  id         BIGINT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '✨',
  sort_order INT NOT NULL DEFAULT 0,
  weekly_target SMALLINT,  -- NULL = 매일, 1~6 = 주 N회
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own routines" ON routines
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- routine_checks (checked=true인 row만 저장; unchecked는 row 삭제)
CREATE TABLE routine_checks (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id BIGINT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  PRIMARY KEY (user_id, routine_id, date)
);
ALTER TABLE routine_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own checks" ON routine_checks
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- todos
CREATE TABLE todos (
  id         BIGINT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '📌',
  done       BOOLEAN NOT NULL DEFAULT false,
  done_at    TEXT,
  "when"     TEXT,
  deadline   TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own todos" ON todos
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- todo_tags
CREATE TABLE todo_tags (
  id          BIGINT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color_index INT NOT NULL DEFAULT 0
);
ALTER TABLE todo_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own tags" ON todo_tags
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- todo_tag_links
CREATE TABLE todo_tag_links (
  todo_id  BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id   BIGINT NOT NULL REFERENCES todo_tags(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, tag_id)
);
ALTER TABLE todo_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own tag links" ON todo_tag_links
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2026-07-10: 주 N회 반복 규칙. 이미 생성된 DB에는 아래만 실행
-- ALTER TABLE routines ADD COLUMN weekly_target SMALLINT;
