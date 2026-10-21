# ZZZ Discord翻译器

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

翻译不同语言频道中的新消息。在自己的电脑或个人服务器运行连接程序，并使用自己的API密钥。

**[① 将机器人安装到Discord](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [② 下载PC连接程序 · Windows x64](https://github.com/Odarom/zenless-discord-translator/releases/download/v0.3.2/zenless-discord-runner-0.3.2-win-x64.zip)**

## Windows电脑

1. 通过上方链接安装机器人，需要Discord的**管理服务器权限**。
2. **完整解压**ZIP，再运行**Start.cmd**。已包含Node.js。在发布页面选择时，请下载**Assets中的运行用ZIP**。
3. 在浏览器打开的设置页面选择服务、模型，输入自己的API密钥，点击**保存API密钥及设置**。
4. 在Discord运行**/zzz connect**。把收到的连接码输入设置页面，点击**连接机器人 → 启动翻译连接**。连接码仅可使用一次，有效期10分钟，与API密钥不同。
5. 将语言频道连接到**同一组**，然后发送新消息即可。两个频道就能使用。

~~~text
/zzz link group:friends channel:#中文 language:简体中文
/zzz link group:friends channel:#english language:English
~~~

翻译时需保持PC连接程序运行，不会补译历史消息。

## 重新打开设置及更换密钥

- **打开设置：** 从解压目录再次运行**Start.cmd**。
- **更换密钥：** 选择服务器配置 → **停止以修改设置** → 输入新密钥 → **保存API密钥及设置 → 启动翻译连接**。
- **多个服务器：** 通过**服务器配置 → 添加服务器**分别连接。每个配置的密钥、模型和上限独立管理，停止一个不会影响其他配置。

密钥保存在自己的电脑或服务器，不提交给共享机器人。该设备管理员能够访问密钥，请在自己管理的设备中使用自己的密钥。

## 个人服务器

也可安装在自己的Oracle、VPS或家用服务器。请参照**[安装与自动启动](HOSTING.md#简体中文)**。安装后通过**[服务器私有管理界面](HOSTING.md#多个服务器与私有管理界面)**更换密钥，不要再额外启动PC连接程序。服务器运行时，个人电脑可以关闭。

## 选择API

**韩国时间2026-10-19记录的免费API推荐：** 在[Google AI Studio](https://aistudio.google.com/apikey)申请密钥，使用**Gemini 3.1 Flash-Lite**（<code>gemini-3.1-flash-lite</code>）。请确认账户、项目的[免费提供条件和配额](https://ai.google.dev/gemini-api/docs/pricing)。也支持OpenAI API及另行安装的Ollama本地模型。

## 数据库更新与误译举报

- **数据库：** 启动时及每6小时自动更新，也可在设置页面手动检查。[浏览术语库](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/BROWSE.md)。
- **举报：** 回复译文发送**!report → 开始举报**，或在消息菜单选择**应用 → 举报误译**。私下接收，无需GitHub登录。
- **连接状态：** **/zzz api-status**；自己的举报可用**/zzz-report mine**查看。

## 详细说明

[功能、语言与运行说明](https://github.com/Odarom/zenless-discord-translator/blob/main/FEATURES.md#简体中文) · [服务器安装](HOSTING.md#简体中文) · [通信结构](ARCHITECTURE.md#简体中文) · [更新记录](https://github.com/Odarom/zenless-discord-translator/releases) · [使用条款](TERMS.md#简体中文) · [隐私政策](PRIVACY.md#简体中文)

翻译支持13种语言，界面和说明支持4种语言。[视频翻译器](https://github.com/Odarom/zenless-subtitle-studio)是独立程序。本工具由爱好者制作，并非游戏官方服务。

<!-- Existing documentation links -->
<a id="首次使用--下载个人连接程序"></a>
<a id="当前可免费使用的api推荐"></a>
<a id="共享数据库与误译举报"></a>
<a id="支持的语言"></a>
