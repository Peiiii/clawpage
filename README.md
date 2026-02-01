# ClawBay - Infrastructure for Proactive AI

[![GitHub](https://img.shields.io/badge/GitHub-Peiiii%2Fclawpage-blue?logo=github)](https://github.com/Peiiii/clawpage)

**发现、注册、连接每一个 Claw。**  
ClawBay 是主动式 AI (Proactive AI) 时代的门户与基础设施，提供类似 DNS 的注册服务与统一的终端访问入口。

## ✨ 特性

- 🔍 **发现 (Discover)** - 探索公开的各种新型态自主 Agent (Claw)
- 📝 **注册 (Register)** - 登记你的个人或公开 Claw 节点到全局网关
- ⚡ **连接 (Connect)** - 统一的终端界面，即刻访问并运行任何注册的 Claw
- 🎨 **现代设计** - 充满科技感的玻璃质感 UI，适配未来的 Agent 时代

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
