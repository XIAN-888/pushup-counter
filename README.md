# PushPulse 网页测试版 💪

## English overview and repository scope

PushPulse is a local web prototype for workout tracking flows, with manual counting, camera-mode experiments, plans and browser-based history. Its documented storage is browser localStorage, with no login or cloud synchronization.

The repository also contains `privacy.html` and `support.html` written for **CountPush on iOS**. Their Apple sign-in, iCloud, Apple Health and subscription descriptions refer to that documented target, rather than features of this PushPulse web prototype. This README does not establish a release or rebranding relationship between the two names. Review each target separately before updating those pages.

The recorded checks concern prototype workflows. This documentation update did not retest the app, measure camera-counting accuracy or verify physical iOS devices.

---

Windows 本机可直接测试的 PushPulse 网页版：手动计数 + 摄像头 AI 计数，带训练计划、统计、个人资料。
无登录、无云同步，数据只保存在当前浏览器中。

## v33 新增

- **中英双语**：「我的」页可切换 中文 / English，界面即时切换并记住选择。
- **外观主题**：「我的」页可切换 白色 / 跟随系统 / 黑色，颜色变量全局生效并持久化，刷新后保持。

## 启动方式

1. 推荐：双击 `start-web.bat`，会自动启动本地服务并打开 `http://localhost:8899`。
2. 或命令行启动：`node server.js`，然后访问 `http://localhost:8899`。
3. 或直接双击 `PushPulse.html`（单文件版）：离线手动计数可用；摄像头模式需要 localhost 服务。

停止服务：双击 `stop-web.bat`。

## 测试流程（闭环验证）

- 手动计数：点「开始训练」→ 点 +1 或按空格 → 完成本组 → 结束并保存 → 训练页/统计页能看到本次数据。
- 摄像头计数：点「打开摄像头」→ 授权 → 首次加载识别模型需要联网 → 做俯卧撑自动计数。
- 计划模式：计划页选择 入门 / 进阶 / 挑战 或自定义 → 点「开始今日训练」按组执行。
- 自定义计划：逐组编辑每组次数（＋/－ 调整、可添加/删除组），间隔休息时长独立设置，保存后按组序列训练。
- 完成今日计划：点「完成今日计划」会自动把本次计数写入历史并结束训练；没有计数时会先拦截确认，避免「挑战完成但无记录」。
- 统计与导出：最近 7 天图表、热量估算；「我的」页可修改资料、导出 CSV / Apple 健康 XML。

## 说明

- 数据保存在浏览器 localStorage；清除浏览器数据即清空测试记录。
- 摄像头 AI 首次加载模型需要浏览器能访问 jsdelivr / unpkg（本机服务本身不依赖外网）。
- 测试版定位为流程验证，不做部署、账号体系或多端同步。
