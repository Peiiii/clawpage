-- Allow consult-only agents to create conversations without service binding.
-- D1 may contain historical FK-inconsistent data, so we rebuild the whole dependency chain.

CREATE TABLE IF NOT EXISTS market_conversations_new (
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

INSERT INTO market_conversations_new (
  id, service_id, agent_id, customer_name, customer_contact, status, last_message_at, created_at, updated_at
)
SELECT
  mc.id,
  CASE
    WHEN mc.service_id IS NULL THEN NULL
    WHEN EXISTS (SELECT 1 FROM market_services ms WHERE ms.id = mc.service_id) THEN mc.service_id
    ELSE NULL
  END AS service_id,
  mc.agent_id,
  mc.customer_name,
  mc.customer_contact,
  mc.status,
  mc.last_message_at,
  mc.created_at,
  mc.updated_at
FROM market_conversations mc
WHERE EXISTS (SELECT 1 FROM agents a WHERE a.id = mc.agent_id);

CREATE TABLE IF NOT EXISTS market_messages_new (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'agent', 'system')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'service_card', 'system')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES market_conversations_new(id)
);

INSERT INTO market_messages_new (id, conversation_id, sender_role, message_type, content, created_at)
SELECT mm.id, mm.conversation_id, mm.sender_role, mm.message_type, mm.content, mm.created_at
FROM market_messages mm
WHERE EXISTS (SELECT 1 FROM market_conversations_new mc WHERE mc.id = mm.conversation_id);

CREATE TABLE IF NOT EXISTS market_orders_new (
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
  FOREIGN KEY (conversation_id) REFERENCES market_conversations_new(id),
  FOREIGN KEY (service_id) REFERENCES market_services(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

INSERT INTO market_orders_new (
  id, conversation_id, service_id, agent_id, amount_cents, platform_fee_rate, status, created_at, updated_at, completed_at
)
SELECT
  mo.id,
  mo.conversation_id,
  mo.service_id,
  mo.agent_id,
  mo.amount_cents,
  mo.platform_fee_rate,
  mo.status,
  mo.created_at,
  mo.updated_at,
  mo.completed_at
FROM market_orders mo
WHERE EXISTS (SELECT 1 FROM market_conversations_new mc WHERE mc.id = mo.conversation_id)
  AND EXISTS (SELECT 1 FROM market_services ms WHERE ms.id = mo.service_id)
  AND EXISTS (SELECT 1 FROM agents a WHERE a.id = mo.agent_id);

CREATE TABLE IF NOT EXISTS market_reviews_new (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES market_orders_new(id)
);

INSERT INTO market_reviews_new (id, order_id, rating, comment, created_at, updated_at)
SELECT mr.id, mr.order_id, mr.rating, mr.comment, mr.created_at, mr.updated_at
FROM market_reviews mr
WHERE EXISTS (SELECT 1 FROM market_orders_new mo WHERE mo.id = mr.order_id);

DROP TABLE market_reviews;
DROP TABLE market_orders;
DROP TABLE market_messages;
DROP TABLE market_conversations;

ALTER TABLE market_conversations_new RENAME TO market_conversations;
ALTER TABLE market_messages_new RENAME TO market_messages;
ALTER TABLE market_orders_new RENAME TO market_orders;
ALTER TABLE market_reviews_new RENAME TO market_reviews;

CREATE INDEX IF NOT EXISTS idx_market_conversations_service ON market_conversations(service_id);
CREATE INDEX IF NOT EXISTS idx_market_conversations_agent ON market_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_market_conversations_last_msg ON market_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_messages_conversation ON market_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_market_orders_conversation ON market_orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_agent ON market_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_status ON market_orders(status);
CREATE INDEX IF NOT EXISTS idx_market_reviews_order ON market_reviews(order_id);
