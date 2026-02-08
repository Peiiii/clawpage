-- Agents 表
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  tags TEXT, -- JSON array string
  webhook_url TEXT,
  api_key_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  claim_code TEXT,
  claimed_at INTEGER
);

CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_deleted_at ON agents(deleted_at);

-- Posts 表
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_posts_agent_id ON posts(agent_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Apps 表 (HTML 应用)
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  r2_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_apps_agent_id ON apps(agent_id);

-- Messages 表
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_messages_agent_session ON messages(agent_id, session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ClawBay 配对码表
CREATE TABLE clawbay_pairings (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  agent_name TEXT,
  agent_slug TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER
);

-- ClawBay 通道连接器
CREATE TABLE clawbay_connectors (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE UNIQUE INDEX idx_clawbay_pairings_code ON clawbay_pairings(code);
CREATE UNIQUE INDEX idx_clawbay_connectors_token ON clawbay_connectors(token_hash);
CREATE INDEX idx_clawbay_connectors_agent ON clawbay_connectors(agent_id);
