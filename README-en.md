# ZZZ Subtitle Studio

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

A Windows app that recognizes and translates a YouTube video or local file, then lets you watch with the finished subtitles.

**[Download for Windows x64 · 0.6.9](https://github.com/Odarom/zenless-subtitle-studio/releases/download/v0.6.9/zenless-subtitle-studio-0.6.9-win-x64.zip)** · [Latest release](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)

## Install and create subtitles

1. **Extract all** files from the ZIP and run **Start.cmd**. Node.js is included. The first start downloads speech/video tools and a model, so allow time and an internet connection.
2. On the **ZZZ Subtitle Studio** page opened in your browser, select **API & connection** in the left menu. Enter your provider, model and API key, then save.
3. Open **Translate video**, enter a YouTube URL or choose a video, audio, SRT or VTT file, and select the source and target languages.
4. Choose recognition options. **Create new subtitles from audio instead of YouTube captions** is on by default; screen OCR is off by default. **Save source subtitles without translating** makes no translation API calls.
5. Click **Create subtitles** and wait. Review the finished translation, then save it or apply it to the video.

**Studio** means the program page opened by Start.cmd. Keep its execution window open while using it. Processing runs on your PC; no separate video-processing server is needed.

## Translate and preview your own video

You can translate **your own video file without a YouTube URL**, then review, edit and report subtitles while watching the preview. We recommend previewing to check translations against the actual scene.

1. Under **Translate video → Open a file**, choose your video and finish translating it.
2. In the completed job, click **Preview subtitles with a local video** and select **the same original video used for translation**.
3. Click a speech or screen subtitle to pause playback and open **Delete subtitle / Report a translation**. **Edit wording in the translation fields under “Review and edit subtitles” below the preview**. Edits appear immediately in the preview.
4. After reviewing, use **Save VTT ↓** or **Project JSON ↓** to save edits and the adjusted speech subtitle position. **Save SRT ↓** stores text and timing only. Any remaining text edits are saved before download.

The YouTube extension is not needed to preview your own file. If the browser cannot play its format, view the video with its subtitles in an external player and edit or report entries in Studio's subtitle list.

## Watch on YouTube

1. In Chrome/Edge extension management, enable **Developer mode → Load unpacked** and select the included **video-extension** folder.
2. In **Studio's left menu → API & connection → Connect the YouTube extension**, click **Copy PC connection code**.
3. Open the YouTube video and click the **ZZZ Subtitle Studio extension icon** at the top right of the browser. Paste into **PC connection code**, then click **Connect**. This is not your translation API key.
4. Under **Finished subtitles**, choose the video's job and click **Apply selected subtitles**.

## Save and edit

Switch speech and screen subtitle backgrounds on or off separately in extension settings and preview. These viewing preferences do not change the style of downloaded files.

- Hover over speech subtitles and drag the **↕ Move** handle up or down to move all speech cues together. Clicking the subtitle still opens report/delete. **Speech subtitle height / Reset position** is also available in extension settings and the preview. Height is automatically saved to the connected job. VTT and project JSON preserve the adjusted position; SRT stores text and timing only. Text edits are also saved before downloading. When player controls are visible, only the overlapping portion of screen captions lets clicks pass through to the controls. The rest of each caption remains clickable.

- The default selection is **Speech + screen subtitles**; you can also choose **Speech only / Screen only**. SRT/VTT are ordinary subtitle files; project JSON preserves screen positions for importing into the extension.
- Click a review entry or an on-video subtitle to **delete it or report a translation**. Restore removed entries in **Deleted subtitles**. Reports are private and need no GitHub login.
- A completed YouTube job offers **Save YouTube video ↓**. Save the subtitle file separately.
- **Deleting a job record** also clears its app-owned video/audio copies and generated/intermediate files. Original PC files and separate video/subtitle downloads stay.

## API settings and updates

Gemini, OpenAI, DeepL API Free/Pro and Ollama are supported. **Free API recommendation recorded on 2026-10-19, Korea time:** [Google AI Studio](https://aistudio.google.com/apikey)'s **Gemini 3.1 Flash-Lite** (<code>gemini-3.1-flash-lite</code>), subject to your account/project's [free-tier terms and quotas](https://ai.google.dev/gemini-api/docs/pricing). Ollama requires a separate installation and local model.

Change and save your key under **Left menu → API & connection**. Keys stay on your PC. Check both program and glossary updates in the same settings page.

**The extension needs a manual reload.** After an in-app program update, open `chrome://extensions` in Chrome or `edge://extensions` in Edge. Click **Reload ↻** on the ZZZ extension card, then refresh the YouTube page with **F5** and click **Apply selected subtitles** again in the extension. If you extract a new ZIP into **a different folder**, disable the extension using the old folder, **Load unpacked** from the new **video-extension** folder, and register the **PC connection code** again.

If you updated the same folder, fully quitting and reopening the browser or restarting your PC also reloads the extension files. Then refresh YouTube and reapply subtitles.
## More help

[Features, hardware, limits and subtitle formats](https://github.com/Odarom/zenless-subtitle-studio/blob/main/FEATURES.md#english) · [Release history](https://github.com/Odarom/zenless-subtitle-studio/blob/main/CHANGELOG.md#english) · [Browse the glossary](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/BROWSE.md) · [Open source and licenses](THIRD-PARTY-NOTICES.md#english)

Translation supports 13 languages; the interface and guides support four. whisper.cpp handles speech and RapidOCR handles optional OCR without an LLM. This fan-made app is not an official game service.

<!-- Existing documentation links -->
<a id="zzz-subtitle-studio-067"></a>
<a id="playback-and-export"></a>
<a id="glossary-reports-and-privacy"></a>
<a id="program-updates"></a>
<a id="open-source-components-and-licenses"></a>
