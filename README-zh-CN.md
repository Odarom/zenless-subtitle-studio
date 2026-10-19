# ZZZ字幕工作室 0.6.2

保留术语表的全部条目、含义和规则，通过共享重复说明减少发送量。名称、角色名及相关技能名仅发送所选原文和目标语言。原文自动检测时使用目标语言名称及实际匹配原文的别名。Gemini的429响应若提供配额详情，将区分每分钟输入token、每分钟请求、每日请求及配额为0；无详情则提示原因未确认。仍默认整段视频单次请求，不自动重试。0.6.1中未生成翻译的失败任务可直接继续，无需重新识别。实际是否满足免费配额及翻译质量仍需单独验证。

术语表卡片根据当前安装的数据库计算语言数量。菜单显示有4种语言，视频原文和目标语言有13种。从YouTube音频重新转写默认开启；关闭后优先使用既有原文字幕（含自动生成字幕），没有时再识别音频。“仅保存原文字幕，不翻译”默认关闭。开启后保存原文，不调用翻译API也不产生翻译API费用；语音和屏幕识别仍按所选设置进行。

翻译支持韩语、英语、日语、简体/繁体中文、德语、法语、西班牙语、葡萄牙语、俄语、泰语、越南语和印尼语，共13种语言。界面及说明保留原有4种语言。为1,868个既有概念关联额外9种语言的16,802个名称，排除10个测试占位值，不编造缺失名称。新增及未发布术语须确认正式实装后再审核。安装本次程序更新后，同一13种语言内的名称补充和修正可通过DB更新接收；增加新语言代码仍需程序更新。

语音识别及翻译选项扩展至13种语言。屏幕OCR支持韩语、英语、日语、简体/繁体中文及俄语6种语言，与翻译目标分开选择。保留全部术语概念，仅发送所需语言名称及实际匹配的别名。继续默认单次请求，遇到速率限制后不自动重试。

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md)

这是适用于 Windows x64 的桌面程序。选择视频，等待识别与翻译完成后再播放字幕，并非实时翻译。每位用户使用自己的电脑与翻译服务密钥。

1. 完整解压 ZIP 后运行 `Start.cmd`。已附带 Node.js。首次运行会下载语音、视频工具及模型，需要等待。下载、YouTube 和云端翻译需要联网。
2. 在界面语言中选择韩语、英语、日语或简体中文。扩展程序也有独立语言设置。
3. 在设置中选择 Gemini、OpenAI、DeepL API Free/Pro 或 Ollama 并保存。费用、免费额度及可用地区请向服务商确认。DeepL 网页翻译订阅与 API 方案不同。免费本地翻译需另外安装 Ollama、下载并运行本地模型，无需 API 密钥。仅生成原文字幕不会调用翻译 API。
4. 选择 YouTube 地址，或本地视频、音频、SRT/VTT 文件。语音字幕与画面文字识别（OCR）可分别选择。OCR 默认关闭，首次使用会下载免费 CPU 工具。OCR 支持英语、日语、韩语与简体中文。
5. 开始生成字幕并等待完成。语音使用 whisper.cpp，画面文字使用 RapidOCR，不调用 LLM。只有文字翻译使用所选服务。OCR 保存文字、采样时间与位置，不把画面图像发送到翻译 API。

## 播放与保存

推荐先申请[Google AI Studio 免费 API 密钥](https://aistudio.google.com/apikey)，并选择 **Gemini 3.1 Flash-Lite**（`gemini-3.1-flash-lite`）。[免费额度](https://ai.google.dev/gemini-api/docs/pricing)受账号、地区、RPM 与每日配额限制，并非无限使用。

默认整段视频翻译会先将语音片段合并为句子，再把全部语音、画面文字和完整术语表放入一次请求。包含所有术语的名称、别名、含义及翻译规则，不包含管理用来源和修改历史。较小模型可手动选择仅相关术语。DeepL在本地使用完整数据库保护术语。AI 仅返回字幕编号和译文，程序按原有时间与位置重新组合，生成 SRT/VTT。本地估算令牌数量，预计超过输出上限时会在发送前停止。长视频分批翻译需要手动选择，报错后不会自动重试。默认每分钟一次的请求间隔也适用于下个视频与继续任务。同一密钥被其他程序使用的请求及每日额度仍会另外计入。

在 Chrome/Edge 扩展管理中开启开发者模式，加载附带的 `video-extension` 文件夹。在工作室设置中复制电脑连接码，打开 YouTube 上的扩展、登记连接码并应用已完成字幕。使用时保持电脑程序运行。`Start.cmd` 会启动本机处理服务，无需另外搭建视频处理服务器。

语音字幕与画面翻译可单独开关。程序会按照视频尺寸、黑边和全屏状态重新计算位置。本地视频可以在工作室预览。浏览器不支持的编码请用外部播放器。

- SRT / 普通 VTT：保存文字与时间，不包含画面位置。
- 含位置 VTT：保存画面位置，可交给视频作者上传为 YouTube CC。观众的字体、字号与背景设置会影响显示效果。
- 项目 JSON：保留原文、译文、时间与移动位置，可在扩展中直接导入，无需电脑连接。指定了其他视频 ID 的文件会被拒绝。

视频、音频输入以及 YouTube OCR 视频下载上限为64GiB（界面约显示64GB），SRT/VTT 为8MiB，扩展项目 JSON 为32MiB。支持一小时视频，以1秒间隔检测约3,600帧。可选0.5、1、2秒及检测起止范围，上限30,000帧。可能遗漏短暂出现的文字，时间精度取决于采样间隔。速度取决于电脑性能。请为原文件、中间音频、下载视频与模型预留磁盘空间。中断后继续可复用已完成识别和翻译批次。

支持 Intel/AMD CPU。语音 GPU 加速需要兼容 Vulkan 的 NVIDIA/AMD 设备及驱动。自动模式在 GPU 失败后切换到 CPU。OCR 在 CPU 上运行。无法保证所有 GPU 型号均可加速。

## 词库、举报与隐私

程序自带词库，可在设置中通过检查更新、更新词库从[GitHub](https://github.com/Odarom/zenless-translation-database)获取审核后的资料。运行期间每天检查一次为可选设置，安装仍需点击按钮。新词库用于新翻译，任务进行中禁止更新，失败保留原有词库。

完成页面可切换语音字幕、画面文字与全部内容，并按原文、译文、字幕编号或时间查找。每段上方的误译举报按钮会打开对应原文和译文。点击本地预览中正在显示的语音字幕或画面文字也能举报。

填写说明并发送举报，内容将私密提交至维护者服务器，无需 GitHub 登录。发送原文、译文、说明与可选的视频地址，不包含 API 密钥或本地路径。举报、随机安装标识和防滥用 IP 哈希最多保存90天。显示接收编号才表示提交成功。失败的举报会保留在本机，可重发或导出文件。维护者将视频和 Discord 举报统一审核，仅发布经确认的修正。

## 程序更新

首次从[GitHub Releases](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)安装。0.4.0起可在设置中检查程序版本，安装并重启。程序验证文件大小和 SHA-256，任务处理期间禁止安装，保留密钥、模型和记录，安装失败时恢复原文件。备份保存在本机。需要新版运行环境时会提示完整安装。

0.3.0及更早版本需手动安装一次最新版，并重新登记新版 `video-extension` 文件夹。以后在原位置更新时也会替换扩展文件。请在 Chrome/Edge 扩展管理中重新加载，并刷新已打开的 YouTube 页面。

密钥在本机加密保存。请勿分享 `app/data`、`app/.secrets`、连接码或个人设置，应分享原始发行 ZIP。云端翻译会接收选定文本、相关词条与上下文。这是同人制作工具，并非游戏官方产品。

0.2.0 中方括号路径导致的安装问题已从0.2.1起修复。支持方括号、韩文及空格路径。如有问题，请重新完整解压新版。重新准备工具可运行 `Setup.cmd`。

云翻译默认发送完整术语表，可能超出免费账户的每分钟Token（TPM）配额。

## 使用的开源组件与许可证

| 组件 | 用途 | 许可证与声明 |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 程序运行环境 | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 语音转写 | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | 语音识别模型 | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube视频与字幕处理 | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | 音频转换与视频帧提取 | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | 可选屏幕文字识别 | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |

ZIP包含Node.js，许可证原文位于`runtime/LICENSE-Node.txt`。其他工具和模型在首次使用时直接从发布方下载。yt-dlp源码的Unlicense与其Windows可执行文件的GPLv3+不同；下载的FFmpeg为GPL构建。额外库和OCR模型分别适用各自许可证。来源及分发说明见[第三方组件声明](THIRD-PARTY-NOTICES.md)。重新分发组件时，还需确认声明、许可证原文及相应源码提供要求。
