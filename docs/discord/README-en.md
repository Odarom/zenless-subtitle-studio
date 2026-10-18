# Zenless Discord Translator

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[Install bot](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [Download PC runner](https://github.com/Odarom/zenless-discord-translator/releases/latest) · [Terms](TERMS.md) · [Privacy](PRIVACY.md)

Translate linked channels using the shared Zenless database. The bot relays source text, context and results. **Your own PC or personal server calls the translation API**, keeping your API key on that device. Keep one runner online per Discord server.

## Windows PC

1. Install the bot in your Discord server with Manage Server permission.
2. Extract the entire Windows x64 ZIP and run **Start.cmd**. Node.js is included. A local settings page opens in your browser.
3. Select your provider, model and daily request limit, enter your own API key, and **Save on this device**. UI languages: Korean, English, Japanese and Simplified Chinese.
4. Run **/zzz connect** in Discord. Enter the one-use, 10-minute code in the PC app, choose **Pair with bot**, then **Start translation**. Never send the API key to Discord.
5. Link two or more language channels to the same group using **/zzz link**. Use one channel per language. New messages are translated; old history is not backfilled. Edits/deletions update tracked copies. Image/GIF/emoji-only posts are shared without AI. This bot does not perform OCR or voice translation.

For multiple Discord servers, use **Server profiles → Add server**, name each profile and pair its own /zzz connect code. Keys, models, daily limits and usage are managed separately; the same or different keys are supported. Stop/save/start only the profile being changed; other servers keep running. Gemini keys from the same project still share provider quotas. For private server management use the [SSH UI guide](HOSTING.md#several-servers-and-private-management-ui). See [communication diagrams](ARCHITECTURE.md) for text, results, database and report flows.

## Current free API recommendation

**As of 2026-10-19 KST**, get a [Google AI Studio API key](https://aistudio.google.com/apikey) and use **Gemini 3.1 Flash-Lite (gemini-3.1-flash-lite)**. The [official pricing page](https://ai.google.dev/gemini-api/docs/pricing) lists a free tier. Use can be free within your account/project eligibility and RPM, TPM and daily quotas. Check billing, model access and [data-use terms](https://ai.google.dev/gemini-api/terms); free does not mean unlimited or permanent. OpenAI API and locally installed Ollama models are alternatives.

## Personal server

The same runner works on your own Oracle/VPS/home server without a UI. Your PC may be off while that server stays online. Its administrator can access saved keys: use your own server and your own key for personal use, rather than collecting other people's credentials.

Download the source and install Node.js 24.17+. The runner needs no Discord dependency installation.

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
# Set your provider/model/key/limit in .env.runner, then:
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

Enter the code from /zzz connect when pairing. [HOSTING.md](HOSTING.md) includes a systemd example for startup after reboot. The runner makes outbound HTTPS connections; no inbound web port is needed on your device. Do not run one pairing on two devices simultaneously.

## Database and feedback

- Both PC and server check the [shared database](https://github.com/Odarom/zenless-translation-database) at startup and every **6 hours**, verifying hash/size/format before replacing the cache. Failures retain the last working version. Database updates are separate from program-code updates.
- Chat uses deterministic name/alias matching on the message, reply and recent context, with up to 30 relevant candidates in the same translation call. No separate LLM call selects terms.
- Reply to a translated message with **!report**, then **Start report**, or use its **Apps → Report translation** menu. Read the notice before submitting. The project maintainer privately reviews submitted source, translation and explanation. No GitHub login is needed.
- View local reports with **/zzz-report mine** and **/zzz-report status**. Independently self-hosted bots offer a separate **Share with project maintainer** preview and confirmation before forwarding.
- Exclude credentials, personal information and unrelated conversation. Reports are kept up to 90 days. Only reviewed corrections reach the shared DB; reporting does not call AI or change translations automatically.

Use /zzz api-status to check pairing, /zzz disconnect to revoke it, and /zzz pause or resume for channel groups. Usage is shown in the PC app or with node --env-file=.env.runner scripts/discord-runner.mjs usage. Failed API calls count. A lost broker connection never automatically repeats an already-started translation.

PC UI keys are encrypted locally; the device administrator can decrypt them. Headless installations use a private .env.runner file. Never publish .env files, data/ or .secrets/. Stop before changing settings or replacing program files; preserve private data when updating. To operate your own Discord bot, see [HOSTING.md](HOSTING.md). Legacy API_MODE=server lets the operator decrypt submitted keys: restrict it to personal installations using only your own key. Public brokers use API_MODE=runner.

[Subtitle Studio](https://github.com/Odarom/zenless-subtitle-studio) is separate. This is a fan tool, not an official game service.
