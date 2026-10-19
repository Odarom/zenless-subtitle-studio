# ZZZ Subtitle Studio 0.6.2

Reduced glossary payload size by sharing repeated descriptions without removing entries, meanings or rules. Names, character names and related skills use only the chosen source and target languages. Auto-detected sources use target-language names and aliases actually matching the input. When Gemini provides HTTP 429 quota details, the app distinguishes input tokens/minute, requests/minute, requests/day and zero allocation; missing details stay unidentified. Whole-video single-request defaults and no automatic retries remain. Failed 0.6.1 jobs with no translated results can Resume without repeating transcription. Actual free-tier acceptance and translation quality still require separate verification.

The glossary card counts languages from the currently installed DB. Menu text has four languages; video source and translation choices have 13. Fresh YouTube audio transcription is on by default. Turn it off to prefer existing source-language captions, including auto-generated ones, with speech recognition as fallback. “Save source subtitles without translating” is off by default. Enabling it saves the original text without translation API calls or charges; selected speech/screen recognition still runs.

Translation supports 13 languages: Korean, English, Japanese, Simplified/Traditional Chinese, German, French, Spanish, Portuguese, Russian, Thai, Vietnamese and Indonesian. Interface text and guides remain in four languages. Another 16,802 localized names extend 1,868 existing concepts across nine additional languages. Ten placeholder values are excluded; missing names are not invented. New/unreleased terms require confirmed live availability before review. After installing this program update, additions and corrections within these 13 languages can arrive through DB updates. Adding a new language code still requires a program update.

Speech recognition and translation language choices now cover 13 languages. Screen OCR supports six: Korean, English, Japanese, Simplified/Traditional Chinese and Russian. Select OCR language independently, including when translating into another language. Video retains every glossary concept while sending needed localized spellings and actually matching aliases. Single-request defaults and no automatic retry after rate limits remain.

[한국어](README-ko.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

A Windows x64 desktop app that recognizes and translates a selected video before playback. Each user runs the app on their PC with their own translation credentials.

1. Extract the entire ZIP and run `Start.cmd`. Node.js is included. The first start downloads speech/video tools and a model. Internet access is needed for these downloads, YouTube and cloud translation.
2. Choose Korean, English, Japanese or Simplified Chinese in **Interface language**. The extension has its own language selector.
3. Open settings and select Gemini, OpenAI, DeepL API Free/Pro or Ollama. Save your API key and model/plan. Check current prices, quotas and availability with the service. A DeepL website subscription differs from a DeepL API plan. For free local translation, install Ollama separately, download a local model and run it; no API key is required. Source-only subtitle mode makes no translation API calls.
4. Select a YouTube URL or a local video, audio, SRT or VTT file. Enable speech, screen text recognition (OCR), or both. OCR defaults to off; its free CPU tool downloads on first use. Choose English, Japanese, Korean or Simplified Chinese for OCR.
5. Start and wait for processing. whisper.cpp handles speech and RapidOCR handles screen text without an LLM. Only text translation uses your chosen service. OCR records text, sampled times and positions; frame images are not sent to translation APIs.

## Playback and export

Recommended starting point: get a [free Google AI Studio API key](https://aistudio.google.com/apikey) and choose **Gemini 3.1 Flash-Lite** (`gemini-3.1-flash-lite`). A [free tier](https://ai.google.dev/gemini-api/docs/pricing) is available subject to account/region availability, RPM and daily quotas; it is not unlimited.

The default whole-video mode joins speech fragments into sentences and sends all speech, screen text and the entire glossary in one request. All names, aliases, meanings and translation rules are included; administrative provenance/history is omitted. Select related terms only explicitly for smaller models. DeepL uses the full DB locally for term protection. The AI returns cue IDs and translated text; local code restores timing and positions and creates SRT/VTT. Local token estimates stop oversized requests before sending. Long-video batches require explicit selection. Errors are not retried automatically. The default one-request-per-minute spacing applies across videos and resumed jobs. Other apps using the same key and daily service quotas still count separately.

Enable developer mode in Chrome/Edge extension management and load the included `video-extension` folder as an unpacked extension. Copy the PC connection code from app settings, register it in the extension on YouTube, and apply a completed job. Keep the PC app running. `Start.cmd` starts the local processing service; you do not need to set up or host a video-processing server.

Toggle speech and screen translations independently. Screen placement follows video dimensions, letterboxing and fullscreen changes. Preview local videos in the app; use an external player for codecs the browser cannot play.

- SRT / ordinary VTT: text and timing without screen positions.
- Positioned VTT: includes screen positions for creator uploads to YouTube CC. Viewer font, size and background settings can change the appearance.
- Project JSON: preserves source, translation, timing and moving positions. Import it directly into the extension without a PC connection. Projects assigned to another video ID are rejected.

Media uploads and YouTube OCR video downloads allow up to 64GiB (shown as approximately 64GB). SRT/VTT imports allow 8MiB; extension project JSON allows 32MiB. One-hour videos are supported: OCR at one-second intervals processes about 3,600 frames. Choose 0.5, 1 or 2 seconds and a scan range, up to 30,000 frames. Brief text may be missed; timing precision follows the sampling interval. Processing speed depends on hardware. Allow disk space for originals, downloaded video, intermediate audio and models. Resume interrupted jobs to reuse completed recognition and translation batches.

Intel/AMD CPUs are supported. Speech GPU acceleration requires a compatible NVIDIA/AMD Vulkan device and driver. Automatic mode falls back to CPU after a GPU failure. OCR runs on CPU. Acceleration is not guaranteed on every GPU.

## Glossary, reports and privacy

The bundled glossary can be updated from [GitHub](https://github.com/Odarom/zenless-translation-database) using **Check for updates → Update glossary**. Optional daily checks run while the app is open; installation is manual. Updates apply to new translations, are blocked during active jobs, and retain the old glossary on failure.

Choose **Speech subtitles / Screen text / Show all** and search by original text, translation, cue ID or time. The report button above each cue opens the matching source and translation. Clicking a displayed subtitle or screen item in local preview opens the same report form.

Enter an explanation and press **Send report** to submit privately to the maintainer; no GitHub login is needed. The source, translation, explanation and optional video URL are sent, excluding API keys and local paths. Reports, random installation IDs and abuse-prevention IP hashes are retained for up to 90 days. A receipt confirms delivery. Failed reports remain on this PC for retry or file export. The maintainer reviews video and Discord reports together and publishes verified fixes.

## Program updates

Install initially from [GitHub Releases](https://github.com/Odarom/zenless-subtitle-studio/releases/latest). From 0.4.0, use **Check program version → Install and restart** in settings. The app verifies size and SHA-256, blocks installation during active jobs, preserves API keys/models/history and restores previous files on installation failure. Backups stay on your PC. Releases requiring a newer runtime prompt for a full installation.

Users of 0.3.0 or earlier must install the latest version once manually and register the new `video-extension` folder. Future in-place updates also replace the extension files. Reload the extension in Chrome/Edge management and refresh open YouTube pages afterwards.

Keys are encrypted locally. Do not share `app/data`, `app/.secrets`, your connection code or personal app settings. Share the original release ZIP. Cloud translation receives selected text, context and the entire glossary by default. Input size may exceed a free account’s TPM quota. This is a fan project, not an official game product.

The bracket-path installation problem in 0.2.0 was fixed in 0.2.1. Brackets, Korean characters and spaces are supported. Extract a fresh complete release if needed. Run `Setup.cmd` to prepare tools again.

## Open-source components and licenses

| Component | Purpose | License and notices |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | Application runtime | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Speech transcription | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | Speech recognition model | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube media and captions | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | Audio conversion and frame extraction | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | Optional screen OCR | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |

Node.js is bundled in the ZIP with original notices in `runtime/LICENSE-Node.txt`. Other tools/models download directly from their distributors on first use. Distinguish the yt-dlp source Unlicense from its GPLv3+ Windows executable; the downloaded FFmpeg is a GPL build. Additional build libraries and OCR models retain their respective licenses. See [third-party notices](THIRD-PARTY-NOTICES.md) for sources and distribution details. Redistributing components also requires checking their notices, original licenses and any corresponding-source obligations.
