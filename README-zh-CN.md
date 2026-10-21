# ZZZ字幕工作室

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

选择YouTube视频或本地文件，完成识别和翻译后，再使用生成的字幕观看。适用于Windows电脑。

**[下载Windows x64版 · 0.6.7](https://github.com/Odarom/zenless-subtitle-studio/releases/download/v0.6.7/zenless-subtitle-studio-0.6.7-win-x64.zip)** · [最新发布页面](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)

## 安装并制作字幕

1. **完整解压**ZIP，运行**Start.cmd**。已包含Node.js。首次运行会下载语音、视频工具及模型，需要联网并等待准备完成。
2. 在浏览器打开的**ZZZ字幕工作室**左侧菜单选择**API 与连接设置**，填写服务、模型及自己的API密钥并保存。
3. 在**翻译视频**中输入YouTube地址，或选择视频、音频、SRT/VTT文件，再选择原文和目标语言。
4. 选择识别选项。**不使用YouTube字幕，从音频重新生成**默认开启，屏幕文字识别OCR默认关闭。选择**仅保存原文字幕，不翻译**时，不会调用翻译API。
5. 点击**生成字幕**并等待完成，检查译文后保存或应用到视频。

**工作室**指运行Start.cmd后在浏览器打开的程序页面。使用期间请保持程序运行窗口开启。处理在自己的电脑上进行，无需另外的视频处理服务器。

## 在YouTube观看字幕

1. 在Chrome/Edge扩展管理页开启**开发者模式 → 加载已解压的扩展程序**，选择随包提供的**video-extension**文件夹。
2. 在**工作室左侧菜单 → API 与连接设置 → 连接 YouTube 扩展程序**点击**复制本机连接码**。
3. 打开YouTube视频，点击浏览器右上方的**ZZZ字幕工作室扩展图标**，将代码粘贴到**本机连接码**并点击**连接**。这里不是填写翻译API密钥的地方。
4. 在**已完成字幕**选择对应视频任务，点击**应用所选字幕**。

本地视频可在工作室预览。浏览器不支持的编码，请使用外部播放器打开视频和字幕文件。

## 保存与编辑

- 默认保存**语音字幕 + 屏幕字幕**，也可选择**仅语音 / 仅屏幕**。SRT/VTT用于普通字幕；项目JSON保留屏幕位置，可在扩展中导入。
- 点击检查列表或视频上的字幕，可以**删除或举报误译**。删除内容可在**已删除字幕**中恢复。举报私下接收，无需GitHub登录。
- 完成的YouTube任务提供**保存YouTube视频 ↓**，字幕请另存为文件。
- **删除任务记录**也会清理程序内为该任务保存的视频、音频副本及生成、中间文件。电脑原文件和另行下载的视频、字幕保留。

## API设置与更新

支持Gemini、OpenAI、DeepL API Free/Pro及Ollama。**韩国时间2026-10-19记录的免费API推荐**为[Google AI Studio](https://aistudio.google.com/apikey)的**Gemini 3.1 Flash-Lite**（<code>gemini-3.1-flash-lite</code>），请确认账户、项目的[免费条件和配额](https://ai.google.dev/gemini-api/docs/pricing)。Ollama需另行安装并准备本地模型。

更换密钥请在**左侧菜单 → API 与连接设置**保存。密钥保存在自己的电脑。同一设置页面可检查程序和术语库更新。程序更新后，请重新加载扩展并刷新YouTube页面。

## 详细说明

[功能、设备要求、容量和字幕格式](https://github.com/Odarom/zenless-subtitle-studio/blob/main/FEATURES.md#简体中文) · [更新记录](https://github.com/Odarom/zenless-subtitle-studio/blob/main/CHANGELOG.md#简体中文) · [浏览术语库](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/BROWSE.md) · [开源组件与许可证](THIRD-PARTY-NOTICES.md#简体中文)

翻译支持13种语言，界面和说明支持4种语言。语音识别使用whisper.cpp，可选OCR使用RapidOCR，不调用LLM。本程序由爱好者制作，并非游戏官方程序。

<!-- Existing documentation links -->
<a id="zzz字幕工作室-067"></a>
<a id="播放与保存"></a>
<a id="词库举报与隐私"></a>
<a id="程序更新"></a>
<a id="使用的开源组件与许可证"></a>
