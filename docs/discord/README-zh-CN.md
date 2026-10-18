# 绝区零 Discord 翻译机器人

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## [➕ 添加翻译机器人到 Discord 服务器](https://discord.com/oauth2/authorize?client_id=1557261995215028254&scope=bot%20applications.commands&permissions=536939520&integration_type=0)

邀请 Odarom 运营的 **zzz translator** 即可使用，无需安装程序或自行运行服务器。连接韩语、英语、日语、简体中文文字频道，参考绝区零词库翻译新消息。

[服务条款](TERMS.md) · [隐私政策](PRIVACY.md)

## 开始使用

1. 点击添加链接，选择自己管理的服务器，允许查看频道、发送消息、读取消息历史、管理 Webhook。
2. 服务器管理员运行 `/zzz api-set`，登记**本服务器自己的 Gemini 或 OpenAI API 密钥**、模型和每日请求上限。
3. 将至少两个语言频道加入同一分组。

```text
/zzz link group:friends channel:#한국어 language:한국어
/zzz link group:friends channel:#中文 language:简体中文
```

连接第二个频道后开始翻译新消息。同一分组每种语言限一个频道。API 和频道设置需要管理服务器权限。

## 免费 API 推荐 — 截至2026年10月19日（韩国标准时间）

**推荐 Gemini 3.1 Flash-Lite，作为现阶段可免费使用的 API。** [在 Google AI Studio 申请免费 API 密钥](https://aistudio.google.com/apikey)，将模型设为 `gemini-3.1-flash-lite`。**在模型的免费额度内使用，即可免费使用翻译机器人。** 免费层也有请求次数和 token 用量限制，提供政策今后可能变化，请查看 [Google 官方最新免费额度与价格](https://ai.google.dev/gemini-api/docs/pricing)。选择付费服务时，费用由登记密钥所属账号承担。

**密钥在运营服务器加密保存，可为调用 API 解密。有服务器访问权限的运营者可访问密钥。**设置表单仅执行者可见，输入字符不隐藏。登记前请阅读隐私政策。

## 命令与功能

| 命令 | 功能 |
|---|---|
| `/zzz status` | 查看频道连接 |
| `/zzz pause group:friends` · `/zzz resume group:friends` | 暂停、继续 |
| `/zzz unlink` | 解除频道连接 |
| `/zzz usage` · `/zzz api-status` | 查看用量与 API 设置 |
| `/zzz api-delete` | 删除并停用本服务器保存的 API 设置 |

每条消息的所有目标语言合并为一次 AI 请求。仍在记录中的原文编辑、删除会同步到译文，编辑会产生额外请求。只有图片、GIF、表情时无需 AI，直接分享。不翻译图片内文字、私信、讨论串、论坛或语音。额度错误不自动重试；Gemini 临时服务器错误可重试一次。失败和重试计入用量，每日次数上限不是费用上限。

## 举报误译

回复译文发送 **`!report`**，点击举报按钮。也可使用消息菜单 **应用 → 举报误译** 或 `/zzz-report submit message:消息链接`。通过 `/zzz-report mine`、`/zzz-report status id:接收编号`查看自己的举报。

无需在 GitHub 发帖。举报私密发送给运营者，与视频程序举报统一审核。**只有审核后的修改才会进入[共享词库](https://github.com/Odarom/zenless-translation-database)。**不会将整个聊天自动收集到数据库。举报最多保存90天。

## 更新与帮助

运营者负责更新机器人和词库，用户无需下载更新或维护服务器。连接前请告知参与者消息将转发到其他频道并由外部 AI 处理。免费 Gemini 的数据使用、成人资格等条件请查阅提供者条款。

找不到命令时检查使用应用命令权限与服务器安装；不翻译时检查频道权限、`/zzz api-status`、`/zzz status`。解除连接或移除机器人即可停用，提供者侧密钥需另行撤销。

[联系运营者](https://github.com/Odarom/zenless-discord-translator/issues/new)时勿公开密钥、私人对话或个人资料。[字幕工作室](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)是独立 PC 程序。本项目并非游戏官方服务。
