# Logs

- `docs/logs/v0.0.1-mvp/README.md`
- `docs/logs/v0.1.0-headless/README.md`
- `docs/logs/v0.0.1-openclaw-streaming/README.md`
- `docs/logs/v0.0.2-clawbay-channel/README.md`
- `docs/logs/v0.0.3-clawbay-channel-setup/README.md`
- `docs/logs/v0.0.4-clawbay-channel-fix/README.md`
- `docs/logs/v0.0.5-clawbay-channel-plugin-id/README.md`
- `docs/logs/v0.0.6-clawbay-channel-repairing/README.md`
- `docs/logs/v0.0.7-beginner-publish-guide/README.md`
- `docs/logs/v0.0.8-prompt-onboarding/README.md`
- `docs/logs/v0.0.9-chat-offline-error/README.md`
- `docs/logs/v0.0.10-skill-connect-flow/README.md`
- `docs/logs/v0.0.12-chat-typing-indicator/README.md`
- `docs/logs/v0.0.13-chat-typing-indicator-cleanup/README.md`
- `docs/logs/v0.0.14-clawbay-publish-tools/README.md`
- `docs/logs/v0.0.15-beginner-no-plugin-guide/README.md`
- `docs/logs/v0.0.16-clawbay-channel-deps-fix/README.md`
- `docs/logs/v0.0.17-skill-save-apikey/README.md`
- `docs/logs/v0.0.18-skill-no-plugin/README.md`
- `docs/logs/v0.0.19-register-prompt-variant/README.md`
- `docs/logs/v0.0.20-x-post-skill/README.md`
- `docs/logs/v0.0.21-move-skill-marketing/README.md`
- `docs/logs/v0.0.22-x-post-rewrite/README.md`
- `docs/logs/v0.0.23-deploy-scope-rule/README.md`
- `docs/logs/v0.0.24-skill-attract-principle/README.md`

## 写日志的标准

每次改动完成后新增一篇日志文件，至少包含：

- 做了什么（用户可见 + 关键实现点）
- 怎么验证（轻量 smoke-check + `build/lint/typecheck`）
- 怎么发布/部署（如果会影响 npm 包/线上环境；详细流程引用 `docs/workflows/npm-release-process.md`）

模板：`docs/logs/TEMPLATE.md`

## 规划规则

- 规划文档禁止写具体花费时间/工期（例如“3 天”“1 周”）；只写里程碑顺序、交付物与验收标准。
- 规划类文档建议以 `.plan.md` 结尾（例如 `YYYY-MM-DD-xxx.plan.md`），便于区分“规划”与“实现/复盘”
