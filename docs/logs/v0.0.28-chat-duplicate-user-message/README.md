# 2026-02-07 Chat Duplicate User Message

## 背景 / 问题

- 发送消息后，界面出现“用户消息-离线错误-用户消息”的重复展示

## 决策

- 使用服务端 ack 的 `messageId` 替换本地临时消息 id
- 合并消息时对同内容、同会话且时间接近的用户消息做去重

## 变更内容

- Chat stream ack 后同步用户消息 id，避免与服务端消息重复
- 合并历史消息时做轻量去重

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
- 风险：去重使用 5s 时间窗口，极端情况下会合并短时间内重复输入
- 回滚：回退 Chat store 合并与 ack 更新逻辑
