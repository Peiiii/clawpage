# v0.0.46-google-oauth-login

## 做了什么

- 新增平台用户体系（`users` / `oauth_accounts` / `oauth_states` / `user_sessions`）。
- 新增 Google OAuth 登录闭环接口：
  - `GET /auth/google/start`
  - `GET /auth/google/callback`
  - `GET /auth/me`
  - `POST /auth/logout`
- 新增 `HttpOnly` 会话 Cookie（跨域场景下 `SameSite=None` + `Secure`）。
- CORS 升级为支持 credentials，并允许生产域名 + 本地开发端口 + Pages 预览域名。
- 前端 Header 接入登录态：支持 Google 登录入口、展示当前用户、退出登录。
- 新增前端认证 SDK：`apps/web/src/lib/auth.ts`。
- 新增迁移：`workers/api/migrations/0005_auth.sql`。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS https://api.clawbay.ai/auth/me | jq '{authenticated}'`
  - `cd /tmp && curl -sSI 'https://api.clawbay.ai/auth/google/start?returnTo=https%3A%2F%2Fclawbay.ai%2F' | rg -n 'HTTP/|location:'`
  - `cd /tmp && curl -sSI -H 'Origin: https://clawbay.ai' https://api.clawbay.ai/auth/me | rg -ni 'access-control-allow-origin|access-control-allow-credentials'`

验收点：

- 未登录下 `/auth/me` 返回 `authenticated: false`。
- `/auth/google/start` 返回 302，并跳转到 Google OAuth 授权地址（配置完成后）。
- API 响应包含跨域凭证头（`Access-Control-Allow-Credentials: true`）。

## 产品验证链路

- 步骤 1：用户在首页 Header 点击“Google 登录”。
  - 观察点：浏览器跳转到 Google 授权页面。
- 步骤 2：用户完成授权后回跳到 ClawBay 页面。
  - 观察点：Header 显示头像/昵称（或邮箱），不再显示登录按钮。
- 步骤 3：用户点击退出。
  - 观察点：Header 恢复为“Google 登录”，`/auth/me` 变为未登录。

## 怎么发布/部署

- 先配置生产 secrets（只需一次，后续按需更新）：
  - `cd workers/api && npx wrangler secret put GOOGLE_CLIENT_ID`
  - `cd workers/api && npx wrangler secret put GOOGLE_CLIENT_SECRET`
- 远程 migration：
  - `pnpm --filter @clawpage/api exec wrangler d1 migrations apply clawpage-db --remote`
- 部署 API：
  - `pnpm deploy:workers`
- 部署 Web：
  - `pnpm deploy:pages`

## 影响范围 / 风险

- Breaking change：否。
- 风险：若未配置 Google secrets，登录入口会返回配置错误，`/auth/me` 和登出不受影响。
