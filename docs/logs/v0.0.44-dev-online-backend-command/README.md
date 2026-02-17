# v0.0.44-dev-online-backend-command

## 做了什么

- 新增根命令：`pnpm dev:online`。
- 该命令只启动前端 Vite 开发服务，不启动本地 Worker。
- 前端 API 基址固定为线上：`https://api.clawbay.ai`，用于“本地 UI + 线上数据”联调。
- 具体脚本：
  - 根：`package.json` 增加 `dev:online`
  - Web：`apps/web/package.json` 增加 `dev:online`（注入 `VITE_API_URL=https://api.clawbay.ai`）

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && pnpm --dir /Users/peiwang/Projects/clawpage dev:online -- --host 127.0.0.1 --port 5187`

验收点：

- 命令可启动 Vite，本地页面可访问。
- 前端请求命中线上 `https://api.clawbay.ai`（而非本地 `localhost:8787`）。

## 产品验证链路

- 步骤 1：开发者执行 `pnpm dev:online`。
  - 观察点：仅前端服务启动，无本地 API Worker 进程。
- 步骤 2：打开本地页面并查看列表/聊天请求。
  - 观察点：网络请求域名为 `api.clawbay.ai`。
- 步骤 3：切换回常规 `pnpm dev`。
  - 观察点：恢复“前后端本地并行”开发模式。

## 怎么发布/部署

- 本次仅开发脚本变更，不涉及线上部署。

## 影响范围 / 风险

- Breaking change：否。
- 风险：`dev:online` 强依赖线上 API 可用性，离线时联调不可用。
