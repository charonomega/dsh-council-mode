# 贡献与发布

使用 Node.js 24。执行 `npm ci --ignore-scripts --legacy-peer-deps`；DSH 宿主接口由实际宿主提供。测试使用离线 fixture，不需要模型账号。

修改后运行 `npm test`、`npm run build`、`npm run check`。浏览器产物 `client.js` 与源码一起提交。保持固定成员、增量收件箱、开场屏障、真实工具发言与无损 JSON 的回归。

不要提交会话、密钥、账号配置、安装目录或机器专属 AGENTS.md。头像脚本可用 `CLIWORKER_ASSETS` 指定上游资源目录；普通构建不需要运行它或安装 Pillow。

发布时更新 package.json 与 README 的版本链接，重建并测试，运行 `npm run pack:release`，将完整议会包、仅议会包、独立 CLI Worker 维护包及 SHA256SUMS 上传到同版本 Release。在 DSH 原生插件页使用 GitHub tag 链接验收安装、启用和配置表单；界面加载不能代替真实讨论测试。

不要把未验证的宿主或 CLI Worker 版本写为已支持，CLI Worker 已作为明确列出的第三方组件随包分发；保持其许可、修改清单和文件校验。不要打包账号或机器配置。
