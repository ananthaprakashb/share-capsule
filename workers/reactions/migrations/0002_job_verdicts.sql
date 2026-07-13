CREATE TABLE IF NOT EXISTS job_verdicts (
  job_key TEXT PRIMARY KEY,
  company TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  confirm_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  first_reported_at TEXT,
  last_reported_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_verdict_events (
  job_key TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('confirm','invalid')),
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job_key, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_job_verdicts_status ON job_verdicts(status);
CREATE INDEX IF NOT EXISTS idx_job_events_job_key ON job_verdict_events(job_key);
