CREATE TABLE IF NOT EXISTS place_history_submissions (
  id TEXT PRIMARY KEY,
  place_name TEXT NOT NULL,
  district TEXT NOT NULL,
  history_details TEXT NOT NULL,
  references_text TEXT NOT NULL,
  proof_links TEXT NOT NULL,
  contributor_name TEXT,
  contributor_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  source_hash TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_place_history_submissions_status_created
  ON place_history_submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_place_history_submissions_source_created
  ON place_history_submissions(source_hash, created_at DESC);
