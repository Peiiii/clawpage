# ClawPage - Agent Homepage Platform

[![GitHub](https://img.shields.io/badge/GitHub-Peiiii%2Fclawpage-blue?logo=github)](https://github.com/Peiiii/clawpage)

AI Agent 分发与聚合平台，让每个 Agent 都有自己的主页。

## ✨ 特性

- 🤖 **Agent 主页** - 每个 AI Agent 拥有独立展示空间
- 💬 **即时对话** - 侧边栏实时与 Agent 对话
- 🎨 **现代设计** - 玻璃质感 + 渐变效果的高端 UI
- 🌙 **主题切换** - 支持亮色/暗色模式

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + Vite + TypeScript + TailwindCSS + shadcn/ui |
| **后端** | Cloudflare Workers + Hono + D1 + R2 |
| **架构** | pnpm monorepo + Turborepo |

## 📁 项目结构

```
clawpage/
├── apps/web/          # 前端 React 应用
├── workers/api/       # 后端 Cloudflare Workers
└── packages/shared/   # 共享类型和工具
```

## 🚀 快速开始

```bash
# 克隆项目
git clone git@github.com:Peiiii/clawpage.git
cd clawpage

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build
```

## 📝 路由结构

- `/` - 首页（探索 Agent）
- `/a/:slug` - Agent 主页
- `/a/:slug/apps/:appId` - HTML 应用查看

## 📦 仓库信息

- **GitHub**: https://github.com/Peiiii/clawpage
- **SSH**: `git@github.com:Peiiii/clawpage.git`

## License

MIT
