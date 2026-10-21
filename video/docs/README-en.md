# ZZZ Subtitle Studio

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

A Windows app that recognizes and translates a YouTube video or local file, then lets you watch with the finished subtitles.

**[Download for Windows x64 · 0.6.7](https://github.com/Odarom/zenless-subtitle-studio/releases/download/v0.6.7/zenless-subtitle-studio-0.6.7-win-x64.zip)** · [Latest release](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)

## Install and create subtitles

1. **Extract all** files from the ZIP and run **Start.cmd**. Node.js is included. The first start downloads speech/video tools and a model, so allow time and an internet connection.
2. On the **ZZZ Subtitle Studio** page opened in your browser, select **API & connection** in the left menu. Enter your provider, model and API key, then save.
3. Open **Translate video**, enter a YouTube URL or choose a video, audio, SRT or VTT file, and select the source and target languages.
4. Choose recognition options. **Create new subtitles from audio instead of YouTube captions** is on by default; screen OCR is off by default. **Save source subtitles without translating** makes no translation API calls.
5. Click **Create subtitles** and wait. Review the finished translation, then save it or apply it to the video.

**Studio** means the program page opened by Start.cmd. Keep its execution window open while using it. Processing runs on your PC; no separate video-processing server is needed.

## Watch on YouTube

1. In Chrome/Edge extension management, enable **Developer mode → Load unpacked** and select the included **video-extension** folder.
2. In **Studio's left menu → API & connection → Connect the YouTube extension**, click **Copy PC connection code**.
3. Open the YouTube video and click the **ZZZ Subtitle Studio extension icon** at the top right of the browser. Paste into **PC connection code**, then click **Connect**. This is not your translation API key.
4. Under **Finished subtitles**, choose the video's job and click **Apply selected subtitles**.

Preview local videos in Studio. If your browser cannot play a codec, open the video and subtitle file in an external player.

## Save and edit

- The default selection is **Speech + screen subtitles**; you can also choose **Speech only / Screen only**. SRT/VTT are ordinary subtitle files; project JSON preserves screen positions for importing into the extension.
- Click a review entry or an on-video subtitle to **delete it or report a translation**. Restore removed entries in **Deleted subtitles**. Reports are private and need no GitHub login.
- A completed YouTube job offers **Save YouTube video ↓**. Save the subtitle file separately.
- **Deleting a job record** also clears its app-owned video/audio copies and generated/intermediate files. Original PC files and separate video/subtitle downloads stay.

## API settings and updates

Gemini, OpenAI, DeepL API Free/Pro and Ollama are supported. **Free API recommendation recorded on 2026-10-19, Korea time:** [Google AI Studio](https://aistudio.google.com/apikey)'s **Gemini 3.1 Flash-Lite** (<code>gemini-3.1-flash-lite</code>), subject to your account/project's [free-tier terms and quotas](https://ai.google.dev/gemini-api/docs/pricing). Ollama requires a separate installation and local model.

Change and save your key under **Left menu → API & connection**. Keys stay on your PC. Check both program and glossary updates in the same settings page. After an app update, reload the extension and refresh YouTube.

## More help

[Features, hardware, limits and subtitle formats](https://github.com/Odarom/zenless-subtitle-studio/blob/main/FEATURES.md#english) · [Release history](https://github.com/Odarom/zenless-subtitle-studio/blob/main/CHANGELOG.md#english) · [Browse the glossary](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/BROWSE.md) · [Open source and licenses](THIRD-PARTY-NOTICES.md#english)

Translation supports 13 languages; the interface and guides support four. whisper.cpp handles speech and RapidOCR handles optional OCR without an LLM. This fan-made app is not an official game service.

<!-- Existing documentation links -->
<a id="zzz-subtitle-studio-067"></a>
<a id="playback-and-export"></a>
<a id="glossary-reports-and-privacy"></a>
<a id="program-updates"></a>
<a id="open-source-components-and-licenses"></a>
