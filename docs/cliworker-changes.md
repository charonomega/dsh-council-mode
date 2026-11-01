# 随议会发布的 CLI Worker

议会 0.3.0 内含 `dsh-cliworker-now 0.8.2-council.1`，基于 SuperWheel 的 MIT 版本 0.8.2。这是本仓库维护的分发版本，不是上游发布的新版本。完整运行代码、浏览器客户端、类型接口、原生界面组件和许可证位于 `vendor/dsh-cliworker-now/`，无需用户手工打补丁。

## 本机审计结果

与 npm 官方 0.8.2 的 845 个文件逐字节比较，本机版本改动了 4 个代码文件和 `package.json`，新增 1 个模块，没有缺失文件。

| 修复 | 文件 | 行为 |
| --- | --- | --- |
| Codex 输出放大 | `lib/native-codex.mjs`、新增 `lib/codex-progress-preview.mjs` | 运行中展示保留最多 4096 字节 UTF-8 预览，250 ms 窗口合并、去重；原生增量与最终结果保留。避免每个增量反复发送累计全文。 |
| 首行权限指令 | `lib/native-codex.mjs` | 不再给任务加“任务：”前缀；`change` / `review` 等首行指令原样到达 CLI 的钩子。不会安装或绕过 Guard。 |
| Codex 终态 | `lib/native-codex.mjs` | 单个工具失败保留其错误记录；整轮按原生完成状态判断，允许模型处理错误后正常完成。真正的轮次失败、取消和桥接错误仍返回失败。 |
| Windows PATH / Hermes | `lib/index.js`、`lib/types/host/accounts.js`、`lib/types/host/windows-cli-path.js` | 系统 PATH 探测清理异常返回可重试的路径探测错误，不误认未安装 CLI 已安装并永久隔离。真正 CLI 进程的清理失败仍保留隔离保护。 |

发布时仅另行修改包版本、描述和问题反馈地址。本机修复代码保持一致。差异见 [完整补丁](../patches/cliworker-0.8.2-council.patch)，固定上游包 URL、SHA-256 和全部发布文件校验值见 [分发清单](../patches/cliworker-distribution.json)。上游源映射未重新生成，定位这些修改时应以补丁和运行代码为准。

## 打包与安装

主安装包包含整个 CLI Worker，保留 `cliworker-now` 等稳定配置 ID。DSH 会从内嵌包的清单发现 CLI 客户端；议会的类型注册模块为它注册原始 Typert 接口，因此不依赖用户事先安装独立 CLI Worker。原生界面的完整性守卫保持启用。

若已有独立 CLI Worker，请等待任务结束，记录自定义配置，在插件页卸载旧议会和独立 CLI Worker，重启 DSH 后再安装整合包。不要同时启用两套 CLI Worker。卸载插件与删除会话是不同操作：不要删除日志、账号目录或历史会话。CLI 账号由用户自己登录，整合包不提供账号或模型额度。

如果手工配置的 patch 带有旧模块来源断言（例如 CLI 行的 name 指定独立包名，或原生 UI 行指定旧绝对路径），这些断言需要迁移到整合包来源后重新保存；按稳定 ID 保存的常规配置可继续使用。遇到原生界面守卫错误应核对来源断言，不能删除守卫来绕过。

Codex 用户应安装完整官方 CLI（例如 npm install -g @openai/codex），先用 codex --version 和 codex login status 核对可执行程序与自己的登录。已有多套 CLI 时在 CLI Worker 高级设置选择对应程序，不复制作者的专用启动器或账号目录。

为便于单独维护，同一 Release 还提供 CLI Worker 独立 `.tgz`；已经安装议会 0.3.0 整合包的用户不需要安装它。

## 哪些本机设置没有随包分发

- 作者的独立 Codex home、账号凭据、API 密钥、模型配置和 Windows 启动器路径。
- 作者设置的 64 MiB 输出上限：发布包沿用上游默认值，不覆盖用户配置。预览修复不等于取消原生帧和输出总量限制。
- Stop That Shit 插件及其本机信任设置；仅保留首行指令兼容修复。
- 旧 Hermes 隔离标记的手工清理：发布包不删除安全状态文件。已有旧标记的用户需先退出相关进程、核实已退出，再按 CLI Worker 的恢复流程处理；新安装没有作者的旧标记。

路线 A 的 EPIPE / Codex home 修复属于作者的启动环境，不是 CLI Worker 包内差异。其他用户安装自己的官方 CLI，使用自己的 CLI Worker 设置，无需照抄作者路径。

## 可复核验证

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm test
npm run check
```

CLI 回归使用合成原生事件，覆盖 10,000 段增量、完整最终输出、UTF-8 截断、首行指令、续接、失败与取消，以及 PATH 失败后重试和真正清理失败仍受保护。它们不启动模型、不读取私人会话或账号。`verify-cliworker.mjs` 校验 846 个文件与全部原生界面资源。

维护补丁时，从分发清单指定的上游包解压，在 `package/` 目录运行 `git apply <cliworker-0.8.2-council.patch>` 即可重建文本改动。清单校验使用发布字节；上游 CRLF 文件需保留行尾。不要在未知新版上游上盲目套用补丁。
