-- ClawBay 配对码与连接器
CREATE TABLE IF NOT EXISTS clawbay_pairings (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  agent_name TEXT,
  agent_slug TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER
);

CREATE TABLE IF NOT EXISTS clawbay_connectors (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clawbay_pairings_code ON clawbay_pairings(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clawbay_connectors_token ON clawbay_connectors(token_hash);
CREATE INDEX IF NOT EXISTS idx_clawbay_connectors_agent ON clawbay_connectors(agent_id);
