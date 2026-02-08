# 2026-02-07 Chat Simple Queue

## 背景 / 问题

- 用户消息与 AI 回复顺序错乱、重复展示
- 需要一个更简单、更稳的消息模型

## 决策

- 采用“双轨极简模型”：
  - `confirmedMessages` 只保存服务端确认消息
  - `pendingMessage` 只保存本地未确认用户消息
- UI 只渲染 `confirmedMessages`，若存在 `pendingMessage` 则固定追加在末尾

## 变更内容

- Chat store 重构为 confirmed/pending 模型
- Stream ack 将 pending 转为 confirmed
- 错误场景下 pending 直接转为 failed confirmed

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

- 发送消息时不再出现重复用户消息
- AI 回复不会跑到用户消息前面

## 发布 / 部署

```bash
pnpm deploy:pages
```

备注：无后端与数据库改动。

## 影响范围 / 风险

- Breaking change? 否
- 风险：若服务端 ack 丢失，pending 会以 failed 状态落到消息列表
- 回滚：回退 Chat store/stream 重构
