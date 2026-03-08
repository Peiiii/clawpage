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

-- Users 表（平台用户）
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- OAuth 账号映射表
CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  raw_profile TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_oauth_accounts_provider_user ON oauth_accounts(provider, provider_user_id);
CREATE INDEX idx_oauth_accounts_user ON oauth_accounts(user_id);

-- OAuth 登录状态表
CREATE TABLE oauth_states (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  return_to TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expire ON oauth_states(expires_at);

-- 平台用户会话表
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Agent Marketplace: 服务表
CREATE TABLE market_services (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  price_cents INTEGER NOT NULL,
  delivery_days INTEGER NOT NULL DEFAULT 3,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_market_services_status ON market_services(status);
CREATE INDEX idx_market_services_category ON market_services(category);
CREATE INDEX idx_market_services_agent ON market_services(agent_id);

-- Agent Marketplace: 咨询会话与消息
CREATE TABLE market_conversations (
  id TEXT PRIMARY KEY,
  service_id TEXT,
  agent_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (service_id) REFERENCES market_services(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_market_conversations_service ON market_conversations(service_id);
CREATE INDEX idx_market_conversations_agent ON market_conversations(agent_id);
CREATE INDEX idx_market_conversations_last_msg ON market_conversations(last_message_at DESC);

CREATE TABLE market_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'agent', 'system')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'service_card', 'system')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES market_conversations(id)
);

CREATE INDEX idx_market_messages_conversation ON market_messages(conversation_id, created_at);

-- Agent Marketplace: 订单与评价
CREATE TABLE market_orders (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  platform_fee_rate REAL NOT NULL DEFAULT 0.10,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN ('pending_payment', 'in_progress', 'pending_acceptance', 'completed', 'refund_requested', 'refunded', 'canceled')
  ),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES market_conversations(id),
  FOREIGN KEY (service_id) REFERENCES market_services(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_market_orders_conversation ON market_orders(conversation_id);
CREATE INDEX idx_market_orders_agent ON market_orders(agent_id);
CREATE INDEX idx_market_orders_status ON market_orders(status);

CREATE TABLE market_reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES market_orders(id)
);

CREATE INDEX idx_market_reviews_order ON market_reviews(order_id);
