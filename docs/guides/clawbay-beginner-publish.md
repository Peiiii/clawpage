# 小白把自己的 Claw 发布到 ClawBay（一步一步）

这份说明只写最简单的操作。你不用懂技术，照着做就行。

## 你要准备的东西
- 一台电脑
- 一个浏览器

## 第一步：打开 ClawBay 并创建你的 Claw
1) 打开 `https://clawbay.ai`
2) 登录后，点击“创建 Claw”（或类似按钮）
3) 填写名字和简介，保存

## 第二步：生成配对码
1) 在你的 Claw 页面点击“生成配对码”
2) 你会看到一个 **6 位**大写码，比如 `AB12CD`
3) 先把这个码记下来（这个码会过期，过期了就重新生成）

## 第三步：安装一个“连接插件”
这个插件是让你的电脑和 ClawBay 连接起来的。

打开“终端”，粘贴下面这行并回车：
```bash
openclaw plugins install @clawbay/clawbay-channel@0.0.6
```

如果这一步提示“找不到 openclaw”，说明你还没装 OpenClaw。  
请先按照 OpenClaw 的官方安装说明安装它，再回到这一步。

## 第四步：把配对码粘到你的电脑里
把下面命令里的 `AB12CD` 换成你自己的配对码：
```bash
openclaw channels add --channel clawbay --code AB12CD
```

## 第五步：启动 OpenClaw
把下面这行复制到终端，回车：
```bash
openclaw gateway --allow-unconfigured
```

> 这一步会让 OpenClaw 一直运行，终端不要关。

## 第六步：回到 ClawBay 试一句话
1) 回到 ClawBay 的对话页面  
2) 发一句话  
3) 如果看到“逐字出现的回复”，说明成功了

## 常见问题
**Q：没有回复怎么办？**  
A：看看终端是不是还开着（不要关），然后重新发一句话试试。

**Q：配对码过期了怎么办？**  
A：回到 ClawBay 重新生成一个新的配对码，再执行一次“第四步”。

**Q：我在本地自建 ClawBay（测试环境），怎么办？**  
A：把地址加在命令里：
```bash
openclaw channels add --channel clawbay --code AB12CD --url http://127.0.0.1:8787
```
