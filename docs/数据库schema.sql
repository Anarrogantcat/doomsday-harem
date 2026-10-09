-- 末日生存·后宫·扶她主角 — SQLite Schema v1.0
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS save (
  id           INTEGER PRIMARY KEY,
  slot         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  game_day     INTEGER NOT NULL,
  game_minute  INTEGER NOT NULL,
  cheat_badge  TEXT,
  checksum     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS world (
  save_id      INTEGER PRIMARY KEY REFERENCES save(id) ON DELETE CASCADE,
  weather      TEXT,
  season       TEXT,
  flags        TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS entity (
  id           TEXT NOT NULL,
  save_id      INTEGER NOT NULL REFERENCES save(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('hero','companion','ai','robot','offspring')),
  identity     TEXT NOT NULL,
  physiology   TEXT NOT NULL,
  survival     TEXT NOT NULL,
  PRIMARY KEY (save_id, id)
);

CREATE TABLE IF NOT EXISTS relationship (
  save_id      INTEGER NOT NULL REFERENCES save(id) ON DELETE CASCADE,
  from_id      TEXT NOT NULL,
  to_id        TEXT NOT NULL,
  affection    REAL NOT NULL DEFAULT 0 CHECK (affection BETWEEN 0 AND 100),
  loyalty      REAL NOT NULL DEFAULT 0 CHECK (loyalty BETWEEN 0 AND 100),
  bond         INTEGER NOT NULL DEFAULT 1 CHECK (bond BETWEEN 1 AND 5),
  intimacy     REAL NOT NULL DEFAULT 0 CHECK (intimacy BETWEEN 0 AND 100),
  lust         REAL NOT NULL DEFAULT 0 CHECK (lust BETWEEN 0 AND 100),
  days_since   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (save_id, from_id, to_id)
);

CREATE TABLE IF NOT EXISTS job (
  save_id      INTEGER NOT NULL REFERENCES save(id) ON DELETE CASCADE,
  entity_id    TEXT NOT NULL,
  job_id       TEXT CHECK (job_id IN (
                 'lab','medical','kitchen','greenhouse','craft','patrol',
                 'drive','logistics','morale','archive','training')),
  bonus        REAL NOT NULL DEFAULT 0,
  days_on_job  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (save_id, entity_id)
);

CREATE TABLE IF NOT EXISTS tech (
  save_id      INTEGER NOT NULL REFERENCES save(id) ON DELETE CASCADE,
  branch       TEXT NOT NULL CHECK (branch IN (
                 'shelter','expedition','self','defense','robot','energy','pharma','longevity')),
  node_id      TEXT NOT NULL,
  tier         INTEGER NOT NULL,
  unlocked     INTEGER NOT NULL DEFAULT 0,
  progress     REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (save_id, branch, node_id)
);

CREATE TABLE IF NOT EXISTS event_log (
  id           INTEGER PRIMARY KEY,
  save_id      INTEGER NOT NULL REFERENCES save(id) ON DELETE CASCADE,
  day          INTEGER NOT NULL,
  minute       INTEGER NOT NULL,
  event_type   TEXT NOT NULL,
  scene_id     TEXT,
  payload      TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS pregnancy (
  save_id       INTEGER NOT NULL REFERENCES save(id) ON DELETE CASCADE,
  mother_id     TEXT NOT NULL,
  father_id     TEXT NOT NULL,
  conceived_day INTEGER NOT NULL,
  due_day       INTEGER NOT NULL,
  offspring_id  TEXT,
  PRIMARY KEY (save_id, mother_id, conceived_day)
);

-- 后宫互交记录（用于亲密度成长与日志）
CREATE TABLE IF NOT EXISTS intimacy_log (
  id           INTEGER PRIMARY KEY,
  save_id      INTEGER NOT NULL REFERENCES save(id) ON DELETE CASCADE,
  day          INTEGER NOT NULL,
  minute       INTEGER NOT NULL,
  a_id         TEXT NOT NULL,
  b_id         TEXT NOT NULL,
  props        TEXT NOT NULL DEFAULT '[]',
  used_pregnancy_med INTEGER NOT NULL DEFAULT 0  -- 必须恒为 0
);

CREATE INDEX IF NOT EXISTS idx_rel_from    ON relationship(save_id, from_id);
CREATE INDEX IF NOT EXISTS idx_entity_kind ON entity(save_id, kind);
CREATE INDEX IF NOT EXISTS idx_event_day   ON event_log(save_id, day);
