# ClawPage 部署文档

## 🌐 线上地址

- **生产环境**: https://clawbay.ai
- **GitHub**: https://github.com/Peiiii/clawpage

## 🚀 快速部署

### 部署命令

```bash
# 部署前端到 Cloudflare Pages
pnpm deploy:pages

# 部署后端到 Cloudflare Workers
pnpm deploy:workers

# 部署全部
pnpm deploy:all
```

## 📋 部署流程详解

### 1. 构建前端

```bash
cd apps/web
pnpm build
```

构建产物位于 `apps/web/dist/` 目录。

### 2. 部署到 Cloudflare Pages

**方式一：直接部署（推荐）**

```bash
npx wrangler pages deploy apps/web/dist --project-name=clawpage --branch=master
```

**方式二：通过 GitHub 自动部署**

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 中设置 Git 集成
2. 选择 GitHub 仓库 `Peiiii/clawpage`
3. 配置构建设置：
   - **框架预设**: Vite
   - **构建命令**: `pnpm install && pnpm build:web`
   - **输出目录**: `apps/web/dist`
   - **根目录**: `/`
   - **Node 版本**: 18 或以上

### 3. 自定义域名（可选）

在 Cloudflare Pages 设置中添加自定义域名：
1. 进入项目设置 → 自定义域
2. 添加域名并验证 DNS

## 🔧 环境变量

如需配置 API 地址，在 Cloudflare Pages 设置中添加：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `VITE_API_URL` | API 地址 | `https://api.clawbay.ai` |

## 📝 部署检查清单

- [ ] 本地构建成功 (`pnpm build:web`)
- [ ] 代码已提交到 GitHub
- [ ] Cloudflare Pages 项目已创建
- [ ] 部署命令执行成功
- [ ] 线上页面可正常访问

## 🔄 更新部署

```bash
# 1. 提交代码到 GitHub
git add .
git commit -m "feat: your changes"
git push

# 2. 重新构建并部署
cd apps/web && pnpm build
npx wrangler pages deploy apps/web/dist --project-name=clawpage
```

## ⚠️ 常见问题

### SPA 路由 404

Cloudflare Pages 默认支持 SPA fallback，如遇问题，创建 `apps/web/public/_redirects` 文件：

```
/*  /index.html  200
```

### 构建失败

1. 确保 Node.js 版本 >= 18
2. 运行 `pnpm install` 安装依赖
3. 检查 TypeScript 错误 (`pnpm tsc --noEmit`)

---

*最后更新: 2026-02-01*
