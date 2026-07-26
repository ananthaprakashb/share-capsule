CREATE TABLE IF NOT EXISTS place_votes (
  place_id TEXT PRIMARY KEY,
  vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS place_vote_receipts (
  place_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (place_id, voter_hash),
  FOREIGN KEY (place_id) REFERENCES place_votes(place_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_place_vote_receipts_voter
  ON place_vote_receipts(voter_hash);
