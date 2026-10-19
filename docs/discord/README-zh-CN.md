# ZZZ Discord翻译器

翻译支持韩语、英语、日语、简体/繁体中文、德语、法语、西班牙语、葡萄牙语、俄语、泰语、越南语和印尼语，共13种语言。界面及说明保留原有4种语言。为1,868个既有概念关联额外9种语言的16,802个名称，排除10个测试占位值，不编造缺失名称。新增及未发布术语须确认正式实装后再审核。安装本次程序更新后，同一13种语言内的名称补充和修正可通过DB更新接收；增加新语言代码仍需程序更新。

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[安装机器人](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [下载PC程序](https://github.com/Odarom/zenless-discord-translator/releases/latest) · [使用条款](TERMS.md) · [隐私政策](PRIVACY.md)

使用共享的绝区零翻译数据库连接不同语言频道。机器人中转原文、上下文及翻译结果，**由您自己的电脑或个人服务器直接调用翻译API**。API密钥保存在您自己的设备中，不提交给共享机器人。每个Discord服务器连接一个运行中的翻译程序。

## Windows电脑

1. 使用服务器管理权限，通过上方链接安装机器人。
2. 完整解压Windows x64 ZIP并运行**Start.cmd**，已包含Node.js。浏览器将打开本机设置界面。
3. 设置服务、模型、自己的API密钥和每日请求次数上限，点击**保存在此设备**。UI支持韩语、英语、日语和简体中文。
4. 在Discord运行**/zzz connect**，将一次性、10分钟有效的连接码输入PC程序。点击**连接机器人 → 启动翻译连接**。请勿将API密钥发送到Discord。
5. 使用**/zzz link**把不同语言频道加入同一组，两个频道即可使用。仅翻译新消息，不补译历史记录。有记录的消息编辑或删除也会反映到对应译文。仅图片、GIF或表情的消息无需AI即可分享。本机器人不提供OCR或语音翻译。

多个Discord服务器可通过**服务器配置 → 添加服务器**分别命名并连接各自的/zzz connect代码。密钥、模型、每日上限和用量分别管理，可用相同或不同密钥。更改时仅停止、保存并启动对应配置，其他服务器继续运行。Gemini中来自同一项目的不同密钥仍共享API配额。个人服务器管理请参见[SSH管理界面指南](HOSTING.md#several-servers-and-private-management-ui)，[通信图](ARCHITECTURE.md)展示原文、译文、数据库和举报的流向。

## 当前可免费使用的API推荐

**截至韩国时间2026-10-19**，推荐在[Google AI Studio申请密钥](https://aistudio.google.com/apikey)并使用**Gemini 3.1 Flash-Lite (gemini-3.1-flash-lite)**。[官方价格表](https://ai.google.dev/gemini-api/docs/pricing)列有免费层。在账户、项目的适用条件及RPM、TPM、每日配额内可以免费使用。请确认模型权限、结算设置和[数据处理条款](https://ai.google.dev/gemini-api/terms)，免费不等于无限或永久。也可选择OpenAI API或自己设备上的Ollama本地模型。

## 个人服务器

同一连接程序也可在自己管理的Oracle、VPS或家用服务器上无界面运行。服务器保持运行时，个人电脑可以关闭。服务器管理员能够访问保存的密钥，因此请在自己的服务器上仅使用自己的密钥，不用于收集他人密钥。

下载源码并准备Node.js 24.17以上版本。仅运行连接程序时无需安装Discord依赖库。

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
# 在.env.runner中保存自己的服务、模型、密钥及上限后:
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

pair时输入/zzz connect的连接码。重启后自动运行请参见[HOSTING.md](HOSTING.md)的systemd示例。程序仅向外建立HTTPS连接，无需为个人电脑或服务器开放入站Web端口。请勿同时在两台设备上使用同一连接。

## 共享数据库与误译举报

- 电脑和服务器均在启动时及**每6小时**自动更新[共享数据库](https://github.com/Odarom/zenless-translation-database)。校验哈希、大小和格式后才替换缓存，失败时保留上次可用版本。数据库更新与程序代码更新不同。
- 聊天通过规则匹配正文、回复和近期上下文中的名称及别名，在同一次翻译请求中附带最多30个相关候选。检索术语不会额外调用LLM。
- 回复译文并发送**!report**，点击**开始举报**，或选择消息菜单的**应用 → 举报误译**。阅读提示后提交原文、译文及说明，由项目维护者私下审核，无需GitHub登录。
- 使用**/zzz-report mine**和**/zzz-report status**查看自己的举报。独立自托管版本会先本地保存，只有选择**也分享给项目维护者**并同意预览后才转发。
- 请勿提交密钥、个人信息或无关完整对话。最多保留90天，经维护者审核后更新共享数据库，不会因举报而自动修改译文或调用AI。

使用/zzz api-status确认连接、/zzz disconnect断开、/zzz pause及resume暂停或恢复分组。用量可在PC界面或运行node --env-file=.env.runner scripts/discord-runner.mjs usage查看，包含失败的API请求。中转连接中断后不会自动重复已启动的翻译。

PC UI会在本机加密保存密钥，但该设备管理员可以解密。无界面部署使用私有.env.runner文件，请限制权限。不要公开.env文件、data/或.secrets/。更改设置或程序文件前请停止运行，并保留个人设置。若想自行运营Discord机器人，请参见[HOSTING.md](HOSTING.md)。旧版API_MODE=server允许运营者解密提交的密钥，仅供自己运营且使用自己密钥的个人用途。公开中转机器人使用API_MODE=runner。

[视频字幕工作室](https://github.com/Odarom/zenless-subtitle-studio)是独立程序。本工具由爱好者制作，并非游戏官方服务。
