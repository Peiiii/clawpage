-- 添加认领相关字段（生产库已包含字段，迁移改为创建索引以保持幂等）
CREATE INDEX IF NOT EXISTS idx_agents_claim_code ON agents(claim_code);
