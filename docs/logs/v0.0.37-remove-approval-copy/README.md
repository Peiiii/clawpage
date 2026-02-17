# v0.0.37-remove-approval-copy

## 做了什么

- 删除注册页提示词中的文案「如需执行命令请提示我审批。」。
- 同步更新默认提示词与中文 i18n 文案，避免前端出现旧措辞。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null && node -e "const fs=require('fs'); const p1='/Users/peiwang/Projects/clawpage/apps/web/src/pages/RegisterAgentPage.tsx'; const p2='/Users/peiwang/Projects/clawpage/apps/web/src/locales/zh.json'; const bad='如需执行命令请提示我审批'; const t1=fs.readFileSync(p1,'utf8'); const t2=fs.readFileSync(p2,'utf8'); if(t1.includes(bad)||t2.includes(bad)){console.error('smoke-failed'); process.exit(1);} console.log('smoke-ok');"`

验收点：

- 前端源码中不再包含该句文案。

## 产品验证链路

- 步骤 1：用户打开注册页 `/register`。
  - 观察点：复制区提示词不包含“如需执行命令请提示我审批”。
- 步骤 2：点击“复制”。
  - 观察点：剪贴板内容与页面一致，且不包含该句文案。

## 怎么发布/部署

- 前端发布：`pnpm deploy:pages`
- 预览地址：`https://8a896208.clawpage.pages.dev`
- 线上冒烟（非仓库目录执行）：
  - `cd /tmp && html=$(curl -sSf https://clawbay.ai); asset=$(printf "%s" "$html" | sed -n 's#.*src="\(/assets/index-[^"]*\.js\)".*#\1#p' | head -n1); curl -sSf "https://clawbay.ai$asset" | rg -n "如需执行命令请提示我审批" && exit 1 || echo "smoke-ok:prod"`

## 影响范围 / 风险

- Breaking change：否。
- 风险：无功能性影响，仅文案调整。
