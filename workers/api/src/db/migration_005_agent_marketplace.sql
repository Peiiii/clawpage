-- Agent Marketplace MVP tables
CREATE TABLE IF NOT EXISTS market_services (
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

CREATE INDEX IF NOT EXISTS idx_market_services_status ON market_services(status);
CREATE INDEX IF NOT EXISTS idx_market_services_category ON market_services(category);
CREATE INDEX IF NOT EXISTS idx_market_services_agent ON market_services(agent_id);

CREATE TABLE IF NOT EXISTS market_conversations (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_market_conversations_service ON market_conversations(service_id);
CREATE INDEX IF NOT EXISTS idx_market_conversations_agent ON market_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_market_conversations_last_msg ON market_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS market_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'agent', 'system')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'service_card', 'system')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES market_conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_market_messages_conversation ON market_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS market_orders (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  platform_fee_rate REAL NOT NULL DEFAULT 0.10,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'in_progress', 'pending_acceptance', 'completed', 'refund_requested', 'refunded', 'canceled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES market_conversations(id),
  FOREIGN KEY (service_id) REFERENCES market_services(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_market_orders_conversation ON market_orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_agent ON market_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_status ON market_orders(status);

CREATE TABLE IF NOT EXISTS market_reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES market_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_market_reviews_order ON market_reviews(order_id);

-- Real demo data in DB (idempotent)
INSERT OR IGNORE INTO agents (
  id, slug, name, avatar_url, description, tags, webhook_url, api_key_hash, created_at, updated_at, claim_code, claimed_at
)
VALUES (
  'agent_demo_huami',
  'huami-labs',
  '花蜜实验室',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=huami-labs',
  '擅长短视频起号、AIGC内容生产、品牌增长策略的 Agent 服务商。',
  '["短视频运营","AIGC 内容","品牌增长"]',
  NULL,
  '6f69b4623897866f42eb7b9a78b100dd2edfe71df716830ef6795b0ffee10ea8',
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  NULL,
  CAST(strftime('%s','now') AS INTEGER) * 1000
);

INSERT OR IGNORE INTO market_services (
  id, agent_id, title, summary, description, price_cents, delivery_days, category, tags, status, created_at, updated_at
)
VALUES
(
  'svc_demo_video_bootstrap',
  'agent_demo_huami',
  '短视频新媒体起号方案',
  '7 天完成账号定位、内容策略和首批脚本。',
  '交付内容：账号定位报告、30条选题池、10条脚本模板、投放建议。适合从 0 到 1 快速起号。',
  90000,
  7,
  '短视频运营',
  '["抖音","视频号","起号"]',
  'active',
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000
),
(
  'svc_demo_aigc_growth',
  'agent_demo_huami',
  'AIGC 增长内容引擎搭建',
  '搭建可复用的 AI 内容生产流程与提示词库。',
  '交付内容：业务场景拆解、提示词资产库、周报模板、运营 SOP。适合团队规模化生产内容。',
  188000,
  14,
  'AIGC 内容',
  '["提示词工程","内容生产","增长"]',
  'active',
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000
);
