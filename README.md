# 议会模式 · Council Mode

让多个智能体在 DeepSeek Harness（DSH）中持续讨论：成员保留自己的会话，通过收件箱读取同伴的新消息，直接广播、定向交流和引用回复，无需主控模型逐条转述。

**当前发布：0.2.4** · [安装包与版本记录](https://github.com/charonomega/dsh-council-mode/releases) · [问题反馈](https://github.com/charonomega/dsh-council-mode/issues)

## 从 DSH 插件页面安装

1. 准备好 DeepSeek Harness。已验证的宿主基线是 **0.2.1-rc.2**；其它版本请先核对插件页面的兼容性提示。
2. 在 DSH 左侧打开 **插件**，安装并启用 [CLI Worker](https://github.com/SuperWheel/dsh-cliworker-now)。议会使用它的成员面板和服务，纯原生成员讨论也需要该插件启用。接口基线为 **0.8.2**；不要为安装议会覆盖已有 CLI Worker。首次安装可填 `dsh-cliworker-now@0.8.2`。更新版本应按其上游说明验证。
3. 在插件页安装输入框粘贴本仓库链接，安装并启用：

   ```text
   https://github.com/charonomega/dsh-council-mode
   ```

   推荐固定版本，便于复现：

   ```text
   https://github.com/charonomega/dsh-council-mode#v0.2.4
   ```

4. 展开 **议会模式 / Council Mode** 的配置，可直接调整成员数、消息条数、唤醒次数、讨论时限和发言长度；默认配置即可开始。保存后刷新页面加载新客户端。
5. 在 DSH 正常配置你自己的模型账号。原生 DeepSeek 成员需要可用的 DeepSeek API 余额；Codex 等 CLI 成员需要安装相应 CLI，并在 CLI Worker 中登录。**本仓库不包含作者的账号、密钥或订阅。**

包内包含浏览器构建产物、宿主插件、议会技能、图标及默认配置，无需用户编译或复制文件到 DSH 安装目录。GitHub 仓库安装需要 Git 可用且网络能连接 GitHub。DSH 的 GitHub 预检默认只有 5 秒；若提示“连接 GitHub 超时”，直接改用下方 Release 包地址，它不走 Git 预检。

### 无 Git 安装

插件安装框也支持 Release 的 `.tgz` 地址：

```text
https://github.com/charonomega/dsh-council-mode/releases/download/v0.2.4/local-dsh-council-mode-0.2.4.tgz
```

也可从 [Release](https://github.com/charonomega/dsh-council-mode/releases/tag/v0.2.4) 下载 `.tgz`，从插件页安装本地包。请使用此安装包，不要使用 GitHub 自动生成的 “Source code” 压缩包。包名保留 `@local/dsh-council-mode`，便于已有用户原位升级；`@local` 是命名空间，不代表只能本地安装。

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
- 原生 DeepSeek 与 Codex 的持续讨论、重启恢复已在此前版本实测；CLI Worker 基线含本机修复，未经逐一验证的 CLI / 上游版本不宣称兼容。本次公开发布验收不调用付费模型。

常见问题：没有入口时检查插件启用并刷新；CLI Worker 缺失时先安装启用依赖；没有成员时先完成邀请；达到次数预算时开启“不限次数”再继续；超过时限需要手动继续。

## 开发

Node.js 22.19+（推荐 24）。DSH 宿主包由运行环境提供，开发时跳过自动 peer 安装：

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm test
npm run build
npm run check
mkdir artifacts
npm pack --pack-destination artifacts
```

`client.js` 已提交，安装不需要自定义构建脚本。修改 `client-src` 后必须重建。[架构与历史修复](docs/architecture.md) · [贡献说明](CONTRIBUTING.md)。

代码采用 [MIT](LICENSE)。CLI 品牌图标来源及许可见 [NOTICE](NOTICE) 和 [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES)。社区插件与各模型或 CLI 厂商无隶属关系。
