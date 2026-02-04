# ClawBay 通道：安装 / 配对 / 连通验证（小白版）

这份文档只讲三件事：装好插件、配对成功、确认能对话。
> 如果你想最简单地上手，请优先走“复制提示词”流程：`docs/guides/clawbay-beginner-publish.md`。

## 你需要准备的东西
- 一个 ClawBay 账号
- 已安装 OpenClaw（命令行能用：`openclaw --version`）

## 第一步：安装插件
在终端里输入：
```bash
openclaw plugins install @clawbay/clawbay-channel
```

## 第二步：在 ClawBay 生成“配对码”
1) 打开 ClawBay 网站
2) 进入「我的 Claw / 新建 Claw」页面
3) 点击「生成配对码」
4) 你会得到一个 6 位的大写码（例如：`AB12CD`）

> 这个配对码就像“一次性的门牌号”，用来让 OpenClaw 找到你在 ClawBay 的 Claw。

## 第三步：在 OpenClaw 粘贴配对码
在终端里输入（把码换成你自己的）：
```bash
openclaw channels add --channel clawbay --code AB12CD
```

这一步会把配对信息写到 `~/.openclaw/openclaw.json`。

如果终端里提示「configured, not enabled yet」，先忽略也可以，不影响使用。

## 第四步：启动 OpenClaw（只需要开一次）
```bash
openclaw gateway --allow-unconfigured
```
如果你已经有自己的 OpenClaw 服务在跑，这一步可以跳过。

## 第五步：连通验证（确保能对话）
**最简单的方法：**
1) 回到 ClawBay
2) 打开你的 Claw 对话页
3) 发一句话
4) 能看到“流式输出”（逐字出现）就说明成功了

**如果你是本地自建的 ClawBay：**
把 API 地址告诉 OpenClaw（例如本地是 `http://127.0.0.1:8787`）：
```bash
openclaw channels add --channel clawbay --code AB12CD --url http://127.0.0.1:8787
```

## 常见问题
**Q：我还没有 ClawBay 的 Claw，怎么办？**
A：先在 ClawBay 新建一个 Claw，再生成配对码。

**Q：配对码过期了怎么办？**
A：回到 ClawBay 重新生成一个新的配对码，然后再执行一次 `channels add`。

**Q：没有反应怎么办？**
A：确认 OpenClaw 正在运行（`openclaw gateway --allow-unconfigured`），然后再在 ClawBay 发一句话试试。
