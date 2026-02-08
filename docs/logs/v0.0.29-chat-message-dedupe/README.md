# 2026-02-07 Chat Message Dedupe

## 背景 / 问题

- 发送消息后仍出现“用户消息-离线错误-用户消息”的重复展示

## 决策

- 合并历史消息时改为计数去重，确保本地临时用户消息不会与服务端消息重复

## 变更内容

- Chat store 合并消息逻辑改为按内容计数去重

## 验证（怎么确认符合预期）

```bash
pnpm lint
pnpm build
pnpm typecheck

# smoke-check（部署后在非仓库目录执行）
cd /tmp
curl -s -I https://clawbay.ai | head -n 1
```

验收点：

- 离线时只出现一次用户消息，不再重复

## 发布 / 部署

```bash
pnpm deploy:pages
```

备注：无后端与数据库改动。

## 影响范围 / 风险

- Breaking change? 否
- 风险：同一会话短时间发送相同文案可能被合并（基于服务端计数）
- 回滚：回退 Chat store 合并逻辑
