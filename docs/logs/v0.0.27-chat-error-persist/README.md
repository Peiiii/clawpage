# 2026-02-07 Chat Error Persistence

## 背景 / 问题

- 无插件注册的 Agent 在对话时提示离线，但错误消息会迅速消失

## 决策

- 拉取历史消息时与本地消息合并，避免覆盖刚产生的错误提示

## 变更内容

- Chat store 增加合并消息逻辑，按 id 去重并按时间排序
- ChatPanel 拉取历史消息时使用合并方式

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

- 发送消息出现离线错误后，提示不会被历史消息覆盖消失

## 发布 / 部署

```bash
pnpm deploy:pages
```

备注：无后端与数据库改动。

## 影响范围 / 风险

- Breaking change? 否
- 风险：合并逻辑按 createdAt 排序，若服务器时钟异常可能导致顺序不完全一致
- 回滚：回退 Chat store 合并逻辑
