# 随议会发布的 CLI Worker

议会 0.3.1 完整包内含 `dsh-cliworker-now 0.8.7-council.1`，基于 SuperWheel 的 MIT 版本 0.8.7。完整运行代码、浏览器客户端、协议接口、原生界面组件与许可证位于 `vendor/dsh-cliworker-now/`。仅议会包连接独立安装的 CLI Worker。

## 上游与本地差异

固定上游发布包为 0.8.7，SHA256 为 `bf26e7f02511f4f64298641a073633a64c866a4205d53137b2043a2b5c21686a`。发布包共 973 个文件，四个代码文件和包元数据有本地修改，其余 968 文件使用上游字节。

| 项目 | 当前处理 |
| --- | --- |
| STS 首行指令 | `native-codex.mjs` 将原始 prompt 传入 turn/start，首行 change/review 指令可到达原生钩子 |
| Windows PATH 探测 | `index.js` 与对应源码将系统路径查询的清理异常分类为可重试探测失败，实际 CLI 进程的清理失败继续使用隔离保护 |
| 输出增量 | 使用 0.8.7 上游的增量传输、bytes 摘要和完整最终结果 |
| 工具与整轮状态 | 使用上游工具结果分类，允许错误恢复后的 SUCCESS，并保留无法确认完成的 UNCERTAIN |
| 分发元数据 | 维护包版本、来源与反馈信息，以及精确的 DSH 宿主版本要求 |

补丁和分发清单分别记录文本差异、上游来源和全部文件校验值。源映射沿用上游，检查本地修改时以补丁与运行代码为准。[完整补丁](https://github.com/charonomega/dsh-council-mode/blob/v0.3.1/patches/cliworker-0.8.7-council.patch) · [分发清单](https://github.com/charonomega/dsh-council-mode/blob/v0.3.1/patches/cliworker-distribution.json)

## 宿主界面与协议

0.8.7 的四个内嵌 UI 模块对应 DSH 0.2.2-rc.1。完整包挂载 `cliworker-ui-*` 私有条目并关闭原 `ui-*` 条目，由上游 guard 将 `ui-chat`、`ui-conversation` 的原设置投影给实际组件。议会以原始 CLI Worker wire 身份注册 Typert，并通过 ready 服务约束启动顺序。

完整包与独立 CLI Worker 每次选择一个活动来源。已有独立 CLI Worker 的用户可选择 `council-only` 包，避免切换已有 CLI 来源。完整安装与迁移步骤见 [README](../README.md)。

本机账号、密钥、Codex home、可执行路径、代理、输出限额与 Hook 信任配置由用户环境管理。发布包只包含可重建的运行文件与上述补丁。安装后应使用自己的 CLI Worker 设置及官方登录完成验证。

## 可复核验证

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm test
npm run build
npm run check
npm run pack:release
```

回归覆盖 10,000 段流式增量、完整最终输出、首行指令、续接、工具失败恢复、UNCERTAIN 与取消，以及 PATH 探测重试和实际进程清理失败。`verify-cliworker.mjs` 校验全部 973 文件和四个原生界面包。

从分发清单指定的上游包解压，在 `package/` 目录应用 `cliworker-0.8.7-council.patch`，可重建文本改动。校验使用发布字节，上游 CRLF 文件应保留原行尾。每次更新先重新检查上游实现，再决定所需补丁。
