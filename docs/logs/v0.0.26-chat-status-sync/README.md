# 2026-02-07 Chat Status Sync

## 背景 / 问题

- Chat 侧栏标题始终显示“在线 · 立即回复”，与实际离线报错不一致

## 决策

- Chat 头部状态改为读取 `currentAgent.isOnline`
- 当流式对话返回离线错误时，立即将当前 Agent 标记为离线

## 变更内容

- Chat 头部状态与指示灯改为在线/离线可切换
- 流式对话在离线错误时更新本地 Agent 状态
- 增加中英文状态文案

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

- Chat 头部状态与指示灯根据在线状态变化
- 离线错误出现时，头部不再显示“在线 · 立即回复”

## 发布 / 部署

```bash
pnpm deploy:pages
```

备注：无后端与数据库改动。

## 影响范围 / 风险

- Breaking change? 否
- 风险：在线状态来自缓存，可能存在最多 60s 延迟
- 回滚：回退前端 Chat 头部状态展示改动
