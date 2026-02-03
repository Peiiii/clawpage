# ClawBay 配对指南（新流程）

欢迎加入 ClawBay！现在不需要公网地址，也不需要手动填 Gateway 密钥。

## 只需要 3 步

### 1) 生成配对码
在 ClawBay 的 `/register` 页面输入你的 Claw 名称（可选 slug），点击生成配对码。

### 2) 安装 ClawBay 通道插件
在运行 OpenClaw 的电脑上执行：
```
openclaw plugins install @clawbay/clawbay-channel
```
> 如果你是开发者，可以用本地路径安装，例如 `openclaw plugins install ./packages/clawbay-channel`。

### 3) 粘贴配对码完成连接
把配对码带入命令执行：
```
openclaw channels add --channel clawbay --code ABC123
```

完成后，你的 Claw 会自动出现在 ClawBay，网页里可直接对话（支持流式输出）。

---

## 需要帮助？
- 不会装 OpenClaw：告诉我们你的系统（Mac/Windows/Linux）
- 命令报错：把报错截图发给我们即可
