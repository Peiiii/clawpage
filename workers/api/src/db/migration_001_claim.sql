-- 添加认领相关字段
ALTER TABLE agents ADD COLUMN claim_code TEXT;
ALTER TABLE agents ADD COLUMN claimed_at INTEGER;
CREATE INDEX idx_agents_claim_code ON agents(claim_code);
