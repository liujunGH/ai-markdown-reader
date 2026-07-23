/**
 * SQLite schema（内联为 TS 常量，随编译产物发布，无运行时文件依赖）
 *
 * 设计要点：
 * 1. 文件全文索引用 FTS5 trigram tokenizer（支持中文 ≥3 字符查询；
 *    2 字符查询由应用层 LIKE 兜底）
 * 2. 阅读数据按领域分表，每表关联 file_path
 * 3. 外键 ON DELETE CASCADE：文件记录删除时联动清理关联阅读数据，
 *    根治旧 IndexedDB 不清理的膨胀
 * 4. 所有时间戳存毫秒整数（与现有 Date.now() 一致）
 */
export const SCHEMA_SQL = `
-- 文件元信息（每个文档一行）
CREATE TABLE IF NOT EXISTS files (
  path        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  folder      TEXT,
  size        INTEGER NOT NULL DEFAULT 0,
  modified    INTEGER NOT NULL DEFAULT 0,
  indexed_at  INTEGER NOT NULL DEFAULT 0,
  deleted     INTEGER NOT NULL DEFAULT 0
);

-- 全文索引（trigram：支持中文子串匹配）。
-- 用标准 FTS5（自带 content 表）而非 contentless：虽然多存一份全文，
-- 但 DELETE 语句直接生效，无需 contentless 的 'delete' 命令和原内容，
-- 配合下方触发器实现可靠的级联清理，避免孤儿索引。
CREATE VIRTUAL TABLE IF NOT EXISTS file_index USING fts5(
  content,
  tokenize='trigram'
);

-- files -> file_index 桥接表：记录每个文件在 FTS5 中的 rowid，
-- 用于 files 删除时通过触发器联动清理 FTS5（FTS5 虚拟表不参与外键）。
CREATE TABLE IF NOT EXISTS file_index_map (
  file_path   TEXT PRIMARY KEY,
  rowid       INTEGER NOT NULL,
  FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
);

-- 级联清理触发器：删除 files 行时，联动删除 FTS5 索引行与桥接记录。
-- 桥接表的外键 CASCADE 只删它自己，FTS5 必须靠触发器显式删。
CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  DELETE FROM file_index WHERE rowid = (SELECT rowid FROM file_index_map WHERE file_path = OLD.path);
  DELETE FROM file_index_map WHERE file_path = OLD.path;
END;

-- 高亮 / 摘录（reader-marks，合并一张表用 kind 区分）
CREATE TABLE IF NOT EXISTS reading_marks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK(kind IN ('highlight','excerpt')),
  text        TEXT NOT NULL,
  color       TEXT,
  tag         TEXT,
  position    INTEGER,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reading_marks_file ON reading_marks(file_path);

-- 阅读会话（reader-sessions）
CREATE TABLE IF NOT EXISTS reading_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path     TEXT NOT NULL,
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER NOT NULL,
  progress_from REAL,
  progress_to   REAL,
  words_read    INTEGER DEFAULT 0,
  minutes       INTEGER DEFAULT 0,
  FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_started ON reading_sessions(started_at DESC);

-- 章节完成（reader-chapters）
CREATE TABLE IF NOT EXISTS chapter_completion (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path    TEXT NOT NULL,
  heading_id   TEXT NOT NULL,
  heading_text TEXT,
  completed    INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_unique ON chapter_completion(file_path, heading_id);

-- 阅读快照（reader-snapshots）
CREATE TABLE IF NOT EXISTS reading_snapshots (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path  TEXT NOT NULL,
  name       TEXT,
  font_size  INTEGER,
  theme      TEXT,
  layout     TEXT,
  scroll_top INTEGER,
  progress   REAL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_snapshots_file ON reading_snapshots(file_path, created_at DESC);

-- 书签（bookmarks，改用 file_path 关联）
CREATE TABLE IF NOT EXISTS bookmarks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path    TEXT NOT NULL,
  heading_id   TEXT NOT NULL,
  heading_text TEXT,
  created_at   INTEGER NOT NULL,
  FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_file ON bookmarks(file_path);

-- 稍后读（reader-queue）
CREATE TABLE IF NOT EXISTS read_later (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path  TEXT NOT NULL,
  name       TEXT,
  note       TEXT,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_read_later_created ON read_later(created_at DESC);

-- 键值设置（结构化配置；UI 偏好仍走 localStorage）
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`
