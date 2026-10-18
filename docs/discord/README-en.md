# Zenless Discord Translator

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## [➕ Add the translator to your Discord server](https://discord.com/oauth2/authorize?client_id=1557261995215028254&scope=bot%20applications.commands&permissions=536939520&integration_type=0)

Invite **zzz translator**, operated by Odarom. Set it up inside Discord; no download or hosting is needed. It translates new messages between Korean, English, Japanese and Simplified Chinese text channels using a Zenless Zone Zero glossary.

[Terms of Service](TERMS.md) · [Privacy Policy](PRIVACY.md)

## Get started

1. Open **Add the translator**, choose a server you manage, and allow View Channels, Send Messages, Read Message History and Manage Webhooks.
2. A server manager runs `/zzz api-set` and registers **that server’s own Gemini or OpenAI API key**, model and daily request limit.
3. Link at least two language channels to the same group:

```text
/zzz link group:friends channel:#korean language:한국어
/zzz link group:friends channel:#english language:English
```

New messages start translating after the second channel is linked. Each group allows one channel per language. API and channel settings require Manage Server permission.

## Free API recommendation — as of October 19, 2026 (Korea Standard Time)

**We recommend Gemini 3.1 Flash-Lite as an API currently available for free.** Get a [free Google AI Studio API key](https://aistudio.google.com/apikey) and select `gemini-3.1-flash-lite`. **You can use the translator for free within the model’s free-tier limits.** The free tier has request and token quotas, and availability policies may change. Check [Google’s current free-tier limits and pricing](https://ai.google.dev/gemini-api/docs/pricing). If you choose a paid service, charges apply to the registered key’s account.

**Keys are encrypted on the operator’s server and can be decrypted for API requests. An operator with server access can access the keys.** The setup form is visible only to its invoker; typed characters are not masked. Read the Privacy Policy before registering a key.

## Commands and behavior

| Command | Purpose |
|---|---|
| `/zzz status` | View linked channels |
| `/zzz pause group:friends` · `/zzz resume group:friends` | Pause or resume |
| `/zzz unlink` | Unlink a channel |
| `/zzz usage` · `/zzz api-status` | Check usage and settings |
| `/zzz api-delete` | Remove and disable the server’s stored API settings |

One message requests all target languages in one AI call. Tracked edits and deletions synchronize with translations; edits cost another request. Images, GIFs and emoji without text are shared without AI. Image text, DMs, threads, forums and voice are unsupported. Quota errors are not retried automatically; temporary Gemini server errors may retry once. Failed requests and retries count toward usage, and request limits are not spending caps.

## Report a translation

Reply to a translated message with **`!report`** and press the report button. You can also use **Apps → Report translation** or `/zzz-report submit message:MESSAGE_LINK`. Check your own reports with `/zzz-report mine` or `/zzz-report status id:RECEIPT_ID`.

No GitHub issue is needed. Reports go privately to the maintainer and join video-app reports for review. **Only reviewed corrections enter the [shared glossary](https://github.com/Odarom/zenless-translation-database).** Conversations are not automatically collected into the database. Reports are retained for up to 90 days.

## Updates and help

The operator maintains the bot and glossary; users do not download updates or run servers. Tell channel participants about relaying and external AI processing before linking channels. Check the provider’s terms, including adult eligibility and data use for free Gemini.

For missing commands, check Use Application Commands and server installation. For missing translations, check channel permissions, `/zzz api-status` and `/zzz status`. Unlink channels or remove the bot to stop using it. Revoke provider-side keys separately.

[Contact](https://github.com/Odarom/zenless-discord-translator/issues/new): do not post API keys, private conversations or personal data. [Subtitle Studio](https://github.com/Odarom/zenless-subtitle-studio/releases/latest) is a separate PC app. Fan-made; not an official game service.
