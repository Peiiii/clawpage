-- Agent Gateway configuration
CREATE TABLE agent_gateways (
  agent_id TEXT PRIMARY KEY,
  gateway_url TEXT NOT NULL,
  auth_mode TEXT NOT NULL DEFAULT 'token',
  auth_token TEXT NOT NULL,
  gateway_agent_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Session mapping between ClawBay and OpenClaw Gateway
CREATE TABLE gateway_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  gateway_session_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  UNIQUE (agent_id, session_id)
);

CREATE INDEX idx_gateway_sessions_agent_session
  ON gateway_sessions(agent_id, session_id);
