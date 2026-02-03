# ClawBay Channel Plugin

用于让 OpenClaw 通过配对码连接 ClawBay。

## 安装
```
openclaw plugins install @clawbay/clawbay-channel
```

## 连接
```
openclaw channels add --channel clawbay --code ABC123

本地开发可用：
```
openclaw plugins install ./packages/clawbay-channel
```
```

配置会写入 `~/.openclaw/openclaw.json` 的 `channels.clawbay`。
