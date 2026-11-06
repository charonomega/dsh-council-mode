# 议会模式 · Council Mode

让多个智能体在 DeepSeek Harness（DSH）中持续讨论：成员保留自己的会话，通过收件箱读取同伴的新消息，直接广播、定向交流和引用回复，无需主控模型逐条转述。

**当前发布 0.3.1，提供完整整合包和仅议会包。完整包内含 CLI Worker 0.8.7-council.1。** · [安装包与版本记录](https://github.com/charonomega/dsh-council-mode/releases) · [CLI Worker 修改审计](docs/cliworker-changes.md) · [问题反馈](https://github.com/charonomega/dsh-council-mode/issues)

## 从 DSH 插件页面安装

1. 准备好 **DeepSeek Harness 0.2.2-rc.1**。两个安装包都声明这一已验证宿主版本。DSH 更新后会在加载前检查版本范围，维护者验证新宿主后再发布适配版本。
2. 在 DSH 左侧打开 **插件**，粘贴以下完整安装包地址，安装后点击 **立即启用**：

   https://github.com/charonomega/dsh-council-mode/releases/download/v0.3.1/local-dsh-council-mode-0.3.1.tgz

   该完整包同时提供议会、修复版 CLI Worker、原生成员界面和技能。已有独立 CLI Worker 的用户请使用下面的仅议会包。
3. 展开 **议会模式 / Council Mode** 的配置，可调整成员数、消息条数、唤醒次数、讨论时限和发言长度；默认配置即可开始。保存后刷新页面加载新客户端。
4. 在 CLI Worker 设置中配置并登录自己要使用的 CLI。Codex 等成员仍需安装对应官方 CLI；原生 DeepSeek 成员需要可用的 API 余额。插件不附带模型账号、密钥或额度。

### 已有独立 CLI Worker

选择 **仅议会包**，继续独立维护当前 CLI Worker。安装地址为

```text
https://github.com/charonomega/dsh-council-mode/releases/download/v0.3.1/local-dsh-council-mode-0.3.1-council-only.tgz
```

先等待现有任务结束，记录自定义设置，通过插件页卸载旧议会，再安装仅议会包。它只加载议会组件，要求已启用兼容的 CLI Worker。议会的模式、成员与历史继续从原 Session 日志读取。

完整包适合希望一次安装议会与 CLI Worker 的用户。从独立方案切换到完整包时，通过插件页卸载旧议会和独立 CLI Worker，重启后安装完整包。两种包使用同一个议会包名，每次选择其中一种。CLI Worker 服务也只保留一个活动来源。

升级机制、版本边界与检查方法见 [兼容性维护](docs/compatibility.md)。

### 仓库链接与本地安装

插件页也可填仓库链接 https://github.com/charonomega/dsh-council-mode ，固定版本使用 https://github.com/charonomega/dsh-council-mode#v0.3.1 。DSH 的 GitHub 连接预检较短，出现超时请使用上面的 Release 安装包地址。

也可从 [Release](https://github.com/charonomega/dsh-council-mode/releases/tag/v0.3.1) 下载整合包后在插件页本地安装。不要用 GitHub 自动生成的 Source code 压缩包。同一 Release 同时提供仅议会包与独立 CLI Worker 维护包，请按已有安装方式选择。包名仍为 @local/dsh-council-mode，保持已有用户的议会身份。

## 快速开始

1. 在普通主会话点击输入框旁的 **议会**，或输入 `/council on`。
2. 打开 **议会** 标签，加入至少两位成员。也可让主控完成邀请，例如：

   > 请邀请两位 DeepSeek 原生子智能体加入议会，分别担任方案提出者和质疑者，讨论“如何降低一个小项目的维护成本”。先发布完整讨论要求，等成员就绪后开始讨论。

   没有 DeepSeek 余额时，可改用已登录的 CLI 成员，请明确成员类型。主控邀请本身使用当前主会话模型。
3. 已有成员后，直接在议会输入框提交议题并点击 **开始新议题**，后续使用 **发送补充**。此路径直接写入房间，不调用主控模型转述。
4. 用 **暂停派发 / 继续讨论 / 结束议题** 控制讨论。需要主控总结时，再回普通对话明确提出请求。

新成员邀请时只回复就绪；结构化要求写入房间、主控结束准备且全体成员就绪后才开场。会话持续复用，后续通知只触发读取新增消息，不重复附加完整讨论历史。

## 配置与不限次数

| 配置 | 默认 | 范围 |
| --- | --- | --- |
| 最大成员数 `maxMembers` | 6 | 2–8 |
| 每议题消息条数 `maxRoomMessages` | 24（含用户输入） | 4–100 |
| 每成员唤醒次数 `maxMemberTurns` | 6 | 1–20 |
| 讨论时限 `roomTimeoutMs` | 600000 毫秒（10 分钟） | 30000–3600000 |
| 单条发言字符数 `statementLimit` | 1200 | 200–4000 |

“结束议题”旁的 **不限次数** 开关同时取消当前议题的消息条数与唤醒次数上限。关闭后按累计次数恢复限制，不清零历史。状态随当前议题保存，新议题默认关闭；已经暂停的议题需要点击“继续讨论”。讨论时限、单条长度及单轮一次发言仍有效。

配置页另有旧议题轮次、单轮超时、任务超时、摘要长度等兼容参数，含义见字段说明。房间预算在新议题创建时确定；已有房间的次数开关可即时切换。

## 恢复、升级与边界

- 重启或热更新后旧议题默认暂停。出现“未确认投递”时先核对成员记录，再选择已收到或重新投递，最后继续。
- 升级前等待成员完成当前轮并记下自定义插件配置；当前 DSH 对社区插件要求先在插件页卸载旧包，再安装新版本链接，随后恢复配置。保留会话日志，不通过删除会话解决插件问题。回退包可从 Releases 获取。
- 消息通过 DSH 的确定性存储和路由服务传递，不是网络点对点聊天；主控模型不负责成员之间的转述。
- 讨论只开放议会消息和技能工具，但 CLI 的内建工具与文件权限仍由 CLI 自身控制。角色名称不等于文件权限。计划模式、只读主沙箱、子会话不能发起派发。
- 内容会发送给参与成员各自的模型服务商，正常消耗账号额度。模型仍会使用自己的会话历史与缓存，不承诺 token 消耗为零。
- 原生 DeepSeek 与 Codex 的持续讨论、重启恢复已在此前版本实测；所需 CLI Worker 修复已完整随包分发，未经逐一验证的 CLI / 上游版本不宣称兼容。本次发布的具体离线、Host、客户端与真实讨论验收见版本记录。

常见问题：没有入口时检查插件启用并刷新；CLI Worker 缺失时检查整合包是否完整安装并启用；没有成员时先完成邀请；达到次数预算时开启“不限次数”再继续；超过时限需要手动继续。

## 开发

Node.js 22.19+（推荐 24）。DSH 宿主包由运行环境提供，开发时跳过自动 peer 安装：

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm test
npm run build
npm run check
npm run pack:release
```

`client.js` 已提交，安装不需要自定义构建脚本。修改 `client-src` 后必须重建。[架构与历史修复](docs/architecture.md) · [贡献说明](CONTRIBUTING.md)。

代码采用 [MIT](LICENSE)。CLI 品牌图标来源及许可见 [NOTICE](NOTICE) 和 [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES)。社区插件与各模型或 CLI 厂商无隶属关系。
