# ZZZ Discord Translator

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

Translate new messages between language channels. Run the personal runner on your PC or your own server using your own API key.

**[① Install the Discord bot](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [② Download the PC runner · Windows x64](https://github.com/Odarom/zenless-discord-translator/releases/download/v0.3.2/zenless-discord-runner-0.3.2-win-x64.zip)**

## Windows PC

1. Install the bot using the link above. You need **Manage Server** permission in Discord.
2. **Extract all** files from the ZIP and run **Start.cmd**. Node.js is included. On the release page, choose the executable ZIP under **Assets**.
3. In the browser settings page, choose your provider and model, enter your API key, and click **Save API key and settings**.
4. Run **/zzz connect** in Discord. Enter its code in the settings page, then click **Pair with bot → Start translation**. The code is single-use, valid for 10 minutes, and separate from your API key.
5. Connect your language channels to the **same group**, then send a new message. Two channels are enough.

~~~text
/zzz link group:friends channel:#korean language:한국어
/zzz link group:friends channel:#english language:English
~~~

Keep the PC runner running while translating. Existing channel history is not translated retroactively.

## Reopen settings and change a key

- **Reopen settings:** run **Start.cmd** again from the extracted folder.
- **Change a key:** select the server profile → **Stop to change settings** → enter the new key → **Save API key and settings → Start translation**.
- **Several servers:** use **Server profiles → Add server** and pair each server separately. Keys, models and limits are independent; stopping one profile leaves the others running.

Keys stay on your own PC/server and are not submitted to the shared bot. That device's administrator can access them, so use your own keys on a device you control.

## Run on a personal server

Install on your Oracle/VPS/home server instead of your PC. Follow **[server installation and automatic startup](HOSTING.md#english)**. Once installed, change keys in the **[private server management UI](HOSTING.md#several-servers-and-private-management-ui)** rather than starting a second PC runner. Your PC can be off while the server runs.

## Choose an API

**Free API recommendation recorded on 2026-10-19, Korea time:** get a key from [Google AI Studio](https://aistudio.google.com/apikey) and use **Gemini 3.1 Flash-Lite** (<code>gemini-3.1-flash-lite</code>). Check your account/project's [free-tier conditions and quotas](https://ai.google.dev/gemini-api/docs/pricing). OpenAI API and separately installed local Ollama models are also supported.

## DB updates and translation reports

- **DB:** updates at startup and every six hours. You can also use **Check for updates** in settings. [Browse the glossary](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/BROWSE.md).
- **Report:** reply to a translated message with **!report → Start report**, or use its **Apps → Report translation** menu. Reports are private and need no GitHub login.
- **Connection:** use **/zzz api-status**. View your reports with **/zzz-report mine**.

## More help

[Features, languages and operation](https://github.com/Odarom/zenless-discord-translator/blob/main/FEATURES.md#english) · [Server setup](HOSTING.md#english) · [Data flow](ARCHITECTURE.md#english) · [Release history](https://github.com/Odarom/zenless-discord-translator/releases) · [Terms](TERMS.md#english) · [Privacy](PRIVACY.md#english)

Translation supports 13 languages; the interface and guides support four. The [video translator](https://github.com/Odarom/zenless-subtitle-studio) is a separate app. This fan-made tool is not an official game service.

<!-- Existing documentation links -->
<a id="get-started--download-the-personal-runner"></a>
<a id="current-free-api-recommendation"></a>
<a id="personal-server"></a>
<a id="database-and-feedback"></a>
<a id="reopen-settings-and-change-your-key"></a>
<a id="supported-languages"></a>
