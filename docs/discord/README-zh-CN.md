# 绝区零 Discord 翻译机器人

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md)

[使用条款](TERMS.md) · [隐私政策](PRIVACY.md)

连接韩语、英语、日语与简体中文文字频道，用绝区零术语表翻译新消息。两个频道即可使用，每条消息的所有目标语言合并为一次 AI 请求，并显示投稿者昵称、头像与翻译标记。

这是可自行部署的机器人源码。需要自己的 Discord 应用和令牌、**Node.js 24.17以上**以及保持运行的电脑或服务器。公开源码不会改变维护者正在运行的机器人。

## 安装

1. 点击 **Code → Download ZIP**，完整解压并安装[Node.js](https://nodejs.org/en/download)。
2. 在[Discord Developer Portal](https://discord.com/developers/applications)创建应用，准备 **Application ID** 与 **Bot Token**。
3. 在 Bot 设置启用 **Message Content Intent**。
4. 选择 **Guild Install**，使用 `bot`、`applications.commands` 范围邀请至服务器。需要**查看频道、发送消息、阅读消息历史、管理 Webhook**权限，不需要完整管理员权限。
5. 复制`.env.example`为`.env`，填写`DISCORD_TOKEN`与`DISCORD_APPLICATION_ID`。使用服务器单独设置 API 时，翻译密钥和`DISCORD_GUILD_ID`可留空。不要覆盖已有设置。

在解压目录运行：

```sh
npm ci --ignore-scripts
npm run check
npm run register
npm start
```

首次及命令变更时注册，程序也会输出邀请链接。之后用`npm start`启动。Windows 的`run.cmd`中1为注册、2为运行。`Ctrl+C`退出。同一个机器人不要同时在两处运行，离线期间的消息不会补翻译。

## API 与频道

服务器管理者使用`/zzz api-set`保存 Gemini/OpenAI、模型、密钥与每日请求上限。推荐[Google AI Studio 免费密钥](https://aistudio.google.com/apikey)与 **Gemini 3.1 Flash-Lite**（`gemini-3.1-flash-lite`）。请在账号查看[价格与免费额度](https://ai.google.dev/gemini-api/docs/pricing)，保存设置并不验证密钥或免费可用性。

设置表单仅向调用者显示，但输入的密钥字符不会遮挡。密钥在机器人电脑中加密保存，运营者可为调用而解密。仅向信任的运营者提交密钥。同一服务仅更换模型时，留空密钥即可保留原密钥。

将两个不同文字频道连接到相同分组：

```text
/zzz link group:friends channel:#korean language:한국어
/zzz link group:friends channel:#english language:English
```

同一分组每种语言仅可连接一个频道，第二个频道连接后开始处理新消息。`/zzz status`检查，`/zzz pause group:friends`与`/zzz resume group:friends`暂停、继续，`/zzz unlink`解除连接。设置需要管理服务器权限。

## 使用与举报

- 编辑、删除仍在记录中的原文会同步到译文，编辑需额外翻译请求。支持转发消息文字。
- 仅图片、GIF 或表情时不调用 AI，直接分享。附带文字则只翻译文字，不识别图片内文字。
- `/zzz usage`、`/zzz api-status`、`/zzz api-delete`管理用量、设置与密钥。每日上限不是金额上限，失败请求也计数。配额错误不会自动重试；Gemini 临时服务器错误可重试一次，也计入请求数。
- 回复译文发送 **`!report`**，点击开始举报；也可使用消息菜单**应用 → 举报误译**或`/zzz-report submit message:消息链接`。
- `/zzz-report mine`与`/zzz-report status id:接收编号`仅查看自己的举报。举报界面随 Discord 语言显示韩、英、日、中文。举报不调用 AI，也不会自动更改词库。

## 本地翻译、更新与数据

另行安装 Ollama，执行`ollama pull qwen3:8b`并保持运行。在`.env`指定`TRANSLATION_PROVIDER=ollama`、`DISCORD_GUILD_ID=自己的服务器ID`、`OLLAMA_MODEL=qwen3:8b`。默认配置仅适用于指定服务器，已保存的服务器 API 设置优先。删除 API 后不会自动恢复本地配置。质量取决于所选模型。

词库自带于`glossary/zzz.json`。参考[共享数据库](https://github.com/Odarom/zenless-translation-database)与[更新流程](https://github.com/Odarom/zenless-discord-translator/blob/main/glossary/LIFECYCLE.md)。公开词库更新不会自动替换其他人正在运行的机器人资料。

更新前停止机器人，将`.env`、`data/`、`.secrets/`一起私密备份。替换源码、安装依赖并重启，切勿将私密资料上传 GitHub。运营者可用`node scripts/reports-cli.mjs export --status pending`导出本安装环境的举报。项目维护者统一检查自己的机器人与视频举报，其他人独立部署的机器人不会自动向项目服务器发送举报。

已连接消息及设置的上下文会发送到其他语言频道；Gemini/OpenAI 模式还会由外部 API 处理。近期上下文在内存中限制使用，提交举报的原文、译文与说明最多保存90天。仅面向普通文字频道，不支持私信、讨论串、论坛或语音翻译。

看不到命令时请检查使用应用命令权限和服务器安装。无法翻译时依次检查运行状态、Message Content Intent、频道权限、`/zzz api-status`与`/zzz status`。参考[官方设置](https://docs.discord.com/developers/quick-start/getting-started)、[Intents](https://docs.discord.com/developers/events/gateway#privileged-intents)与[权限](https://docs.discord.com/developers/topics/permissions)。检查命令为`npm test`。

[视频字幕工作室](https://github.com/Odarom/zenless-subtitle-studio)是另一个程序。本机器人为同人制作，并非游戏官方产品。
