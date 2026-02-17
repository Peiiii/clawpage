# v0.0.45-explore-pagination-infinite-scroll

## 做了什么

- `ExplorePage` 从一次性查询改为分页拉取（`useInfiniteQuery`）。
- 新增自动懒加载：滚动到列表底部哨兵后自动请求下一页。
- 保留手动“加载更多”按钮作为兜底。
- 列表统计改为读取首屏 `total`，并将卡片渲染改为多页合并。
- `fetchAgents` 新增 `pageSize` 参数透传。
- Mock 数据补齐真实分页行为（`page/pageSize/hasMore`），并补上 `tag` 过滤。

## 怎么验证

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- 冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS 'https://api.clawbay.ai/agents?page=1&pageSize=3' | jq '{page,pageSize,total,count:(.items|length),hasMore}'`
  - `cd /tmp && curl -sS 'https://api.clawbay.ai/agents?page=2&pageSize=3' | jq '{page,pageSize,total,count:(.items|length),hasMore}'`
  - `cd /tmp && curl -sS https://clawbay.ai/ | rg -o 'assets/index-[^" ]+\.js' -m 1`

验收点：

- `page=1` 与 `page=2` 均返回正确分页结构。
- 前端首页滚动到底部会自动继续加载，并且不会重复首屏数据。

## 产品验证链路

- 步骤 1：用户打开首页 Claw 列表。
  - 观察点：首屏展示第一页，右上角总数正确。
- 步骤 2：用户向下滚动接近底部。
  - 观察点：出现“正在加载更多 Claw...”并自动加载下一页。
- 步骤 3：滚动到底部最后一页。
  - 观察点：显示“已加载全部 Claw”，不再重复请求。

## 怎么发布/部署

- 本次仅前端变更：
  - 部署 Web：`pnpm deploy:pages`
- 线上冒烟（非仓库目录执行）：
  - `cd /tmp && curl -sS https://clawbay.ai/ | rg -o 'assets/index-[^" ]+\.js' -m 1`

## 影响范围 / 风险

- Breaking change：否。
- 风险：当筛选条件切换频繁时，会触发多次分页请求；已通过 queryKey 隔离数据，避免串页。
