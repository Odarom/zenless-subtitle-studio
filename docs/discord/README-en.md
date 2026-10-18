# Zenless Discord Translator

[한국어](README-ko.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[Terms of Service](TERMS.md) · [Privacy Policy](PRIVACY.md)

Connect Korean, English, Japanese and Simplified Chinese text channels and translate new messages using a Zenless Zone Zero glossary. Two channels are enough. Each message requests all destination languages in one AI call and displays the sender’s nickname/avatar with a translation label.

This repository contains a self-hosted bot. Use your own Discord application and token, Node.js **24.17+**, and a PC/server that stays online. Publishing this source does not change the maintainer’s running bot.

## Setup

1. Download **Code → Download ZIP**, extract everything and install [Node.js](https://nodejs.org/en/download).
2. Create an app in the [Discord Developer Portal](https://discord.com/developers/applications). Obtain its **Application ID** and **Bot Token**.
3. Enable **Message Content Intent** on the Bot page.
4. Select **Guild Install** with `bot` and `applications.commands`. Invite it with **View Channels, Send Messages, Read Message History and Manage Webhooks**. Administrator permission is unnecessary.
5. Copy `.env.example` to `.env`. Fill `DISCORD_TOKEN` and `DISCORD_APPLICATION_ID`. Translation keys and `DISCORD_GUILD_ID` may stay empty when using per-server API setup. Keep an existing `.env`.

Run inside the extracted directory:

```sh
npm ci --ignore-scripts
npm run check
npm run register
npm start
```

Register once initially and after command changes; it also prints an invite link. Subsequently use `npm start`. On Windows, `run.cmd` offers registration (1) and startup (2). Stop with `Ctrl+C`. Run only one instance per bot token. Messages sent while offline are not replayed.

## API and channels

A server manager uses `/zzz api-set` to save Gemini/OpenAI, a model, API key and daily request limit. Recommended starting point: a [Google AI Studio free key](https://aistudio.google.com/apikey) and **Gemini 3.1 Flash-Lite** (`gemini-3.1-flash-lite`). Check [availability, free quotas and pricing](https://ai.google.dev/gemini-api/docs/pricing) on your API account. Saving settings does not validate the key or free access.

The setup form is private to its invoker but typed keys are visible on screen. Keys are encrypted locally; the bot operator can decrypt them to make requests. Register keys only with an operator you trust. Leave the key blank to retain it when changing the model within the same provider.

Link two distinct text channels with the same group:

```text
/zzz link group:friends channel:#korean language:한국어
/zzz link group:friends channel:#english language:English
```

One channel per language per group is allowed. Translation begins with new messages after the second channel is linked. Use `/zzz status`, `/zzz pause group:friends`, `/zzz resume group:friends`, and `/zzz unlink`. These settings require Manage Server permission.

## Use and feedback

- Edits/deletions update tracked translations; editing costs another translation request. Forwarded message text is supported.
- Images, GIFs and emoji without text are shared without AI. Accompanying text is translated; text inside images is not recognized by this bot.
- `/zzz usage`, `/zzz api-status`, `/zzz api-delete` manage usage/settings/keys. Daily limits count failed requests and are not spending caps. Rate-limit failures are not retried; a temporary Gemini server error may retry once and counts as another request.
- Reply to a translated message with **`!report`** and press the report button, or use **Apps → Report translation** or `/zzz-report submit message:MESSAGE_LINK`.
- `/zzz-report mine` and `/zzz-report status id:RECEIPT_ID` show your own reports. Feedback UI follows your Discord language in Korean/English/Japanese/Chinese. Reports neither call AI nor change the glossary automatically.

## Local translation, updates and data

For Ollama, install it separately, run `ollama pull qwen3:8b`, and keep it running. Set `.env` to `TRANSLATION_PROVIDER=ollama`, `DISCORD_GUILD_ID=YOUR_SERVER_ID`, `OLLAMA_MODEL=qwen3:8b`. These defaults apply only to that server; saved per-server API settings take precedence. Deleting an API setting does not automatically revert to local defaults. Quality depends on the model.

The bundled glossary is `glossary/zzz.json`. See the [shared database](https://github.com/Odarom/zenless-translation-database) and [glossary lifecycle](https://github.com/Odarom/zenless-discord-translator/blob/main/glossary/LIFECYCLE.md). Publishing a glossary does not automatically update independent running bots.

Before code updates, stop the bot and privately back up `.env`, `data/` and `.secrets/` together. Replace source files, install dependencies and restart. Never publish these private folders. Operators can export this installation’s feedback using `node scripts/reports-cli.mjs export --status pending`. The project maintainer reviews its own bot/video reports together; independently hosted bots do not automatically send reports to the project server.

Connected messages and configured context are relayed to other language channels and sent to the chosen external API in Gemini/OpenAI mode. Recent context is limited in memory. Submitted feedback stores source/translation/explanation for up to 90 days. Only regular text channels are supported, not DMs, threads, forums or voice.

If commands are missing, check Use Application Commands permission and server installation. For missing translations, check the running bot, Message Content Intent, channel permissions, `/zzz api-status` and `/zzz status`. See [Discord setup](https://docs.discord.com/developers/quick-start/getting-started), [intents](https://docs.discord.com/developers/events/gateway#privileged-intents), and [permissions](https://docs.discord.com/developers/topics/permissions). Run checks with `npm test`.

[Video Subtitle Studio](https://github.com/Odarom/zenless-subtitle-studio) is a separate app. Fan-made; not an official game bot.
