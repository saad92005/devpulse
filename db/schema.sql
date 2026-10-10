-- DevPulse schema. Idempotent: `npm run db:migrate` applies it.

CREATE TABLE IF NOT EXISTS users (
  id          BIGINT PRIMARY KEY,           -- GitHub user id
  login       TEXT NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS installations (
  id            BIGINT PRIMARY KEY,         -- GitHub App installation id
  account_login TEXT NOT NULL,
  account_type  TEXT NOT NULL,
  avatar_url    TEXT,
  suspended     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_installations (
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installation_id BIGINT NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, installation_id)
);

CREATE TABLE IF NOT EXISTS repos (
  id              BIGINT PRIMARY KEY,       -- GitHub repo id
  installation_id BIGINT NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  private         BOOLEAN NOT NULL DEFAULT false,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repos_installation_idx ON repos(installation_id);

CREATE TABLE IF NOT EXISTS reviews (
  id              SERIAL PRIMARY KEY,
  repo_id         BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  repo_full_name  TEXT NOT NULL,
  pr_number       INT NOT NULL,
  pr_title        TEXT NOT NULL,
  pr_author       TEXT,
  pr_url          TEXT NOT NULL,
  head_sha        TEXT NOT NULL,
  trigger         TEXT NOT NULL DEFAULT 'opened', -- opened | synchronize | command | manual
  status          TEXT NOT NULL DEFAULT 'queued', -- queued | running | completed | failed | skipped
  stage           TEXT,
  summary         TEXT,
  score           INT,
  files_reviewed  INT,
  findings_raw    INT,
  findings_kept   INT,
  duration_ms     INT,
  model           TEXT,
  error           TEXT,
  github_review_id BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS reviews_repo_idx ON reviews(repo_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_dedupe_idx ON reviews(repo_id, pr_number, head_sha, trigger);

CREATE TABLE IF NOT EXISTS findings (
  id              SERIAL PRIMARY KEY,
  review_id       INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  path            TEXT NOT NULL,
  line            INT NOT NULL,
  severity        TEXT NOT NULL,
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  suggestion      TEXT,
  confidence      REAL NOT NULL,
  kept            BOOLEAN NOT NULL,
  rejected_by     TEXT,
  rejected_reason TEXT
);
CREATE INDEX IF NOT EXISTS findings_review_idx ON findings(review_id);

-- Simple fixed-window rate limiting for the public playground.
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT PRIMARY KEY,
  count       INT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL
);
