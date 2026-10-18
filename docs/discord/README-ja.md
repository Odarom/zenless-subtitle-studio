# ゼンレスDiscord翻訳ボット

[한국어](README-ko.md) · [English](README-en.md) · [简体中文](README-zh-CN.md)

[利用規約](TERMS.md) · [プライバシーポリシー](PRIVACY.md)

韓国語・英語・日本語・簡体字中国語のテキストチャンネルをつなぎ、ゼンレスゾーンゼロの用語集で新しいメッセージを翻訳します。2チャンネルから利用でき、1件のメッセージの翻訳先言語を1回のAIリクエストで処理します。投稿者の名前・画像と翻訳表示を使います。

自分で運営するボットのソースです。自分のDiscordアプリとトークン、**Node.js 24.17以上**、起動したままのPCまたはサーバーが必要です。公開によって運営中のボットは変更されません。

## 導入

1. **Code → Download ZIP**から取得して全体を展開し、[Node.js](https://nodejs.org/en/download)をインストールします。
2. [Discord Developer Portal](https://discord.com/developers/applications)でアプリを作り、**Application ID**と**Bot Token**を用意します。
3. Bot設定の**Message Content Intent**を有効にします。
4. **Guild Install**、`bot`、`applications.commands`でサーバーに招待します。必要な権限は**チャンネルを見る・メッセージを送信・メッセージ履歴を読む・ウェブフックの管理**です。管理者全権は不要です。
5. `.env.example`を`.env`へコピーし、`DISCORD_TOKEN`と`DISCORD_APPLICATION_ID`を入力します。サーバー別API登録なら翻訳キーと`DISCORD_GUILD_ID`は空欄で構いません。既存設定は上書きしません。

展開したフォルダーで実行します。

```sh
npm ci --ignore-scripts
npm run check
npm run register
npm start
```

登録は初回とコマンド変更時に実行し、招待リンクも表示します。以降は`npm start`で起動します。Windowsの`run.cmd`は1番が登録、2番が起動です。終了は`Ctrl+C`。同じボットを複数の場所で同時起動しないでください。停止中の投稿は後から自動翻訳しません。

## APIとチャンネル

サーバー管理者が`/zzz api-set`でGemini/OpenAI・モデル・キー・1日あたりのリクエスト上限を保存します。[Google AI Studio無料キー](https://aistudio.google.com/apikey)と**Gemini 3.1 Flash-Lite**（`gemini-3.1-flash-lite`）をおすすめします。[料金・無料枠](https://ai.google.dev/gemini-api/docs/pricing)はAPIアカウントで確認してください。保存だけではキーや無料利用を検証しません。

設定フォームは実行者にだけ表示されますが入力文字はマスクされません。キーは暗号化保存され、運営者はAPI呼び出しのため復号できます。信頼できる運営者にだけ登録してください。同じサービスでモデルを変える場合はキーを空欄にすると保持します。

同じグループ名で2つのテキストチャンネルを接続します。

```text
/zzz link group:friends channel:#korean language:한국어
/zzz link group:friends channel:#english language:English
```

同一グループは1言語につき1チャンネルです。2つ目の接続以降の新規投稿から翻訳します。`/zzz status`で確認し、`/zzz pause group:friends`・`/zzz resume group:friends`で停止・再開、`/zzz unlink`で解除します。設定にはサーバー管理権限が必要です。

## 利用と誤訳報告

- 記録内の投稿の編集・削除は翻訳にも反映します。編集は追加リクエストを使います。転送された文章にも対応します。
- 画像・GIF・絵文字だけならAIを呼び出さず共有します。添えられた文章は翻訳しますが、画像内文字の認識はありません。
- `/zzz usage`・`/zzz api-status`・`/zzz api-delete`で使用量・設定・キーを管理します。日次上限は料金上限ではなく失敗も含みます。利用上限エラーは自動再送しません。Geminiの一時的なサーバーエラーは1回再試行でき、その分も数えます。
- 翻訳メッセージに返信で**`!report`**を送り、報告開始ボタンを押します。メッセージの**アプリ → 誤訳を報告**、`/zzz-report submit message:メッセージリンク`も使えます。
- `/zzz-report mine`・`/zzz-report status id:受付番号`は自分の報告だけを表示します。報告画面はDiscordの言語に合わせて韓・英・日・中で表示します。報告でAI呼び出しや用語集の自動変更は行いません。

## ローカル翻訳と保管

Ollamaを別途導入し、`ollama pull qwen3:8b`で取得して起動します。`.env`に`TRANSLATION_PROVIDER=ollama`、`DISCORD_GUILD_ID=自分のサーバーID`、`OLLAMA_MODEL=qwen3:8b`を設定します。この既定値は指定サーバーだけに適用し、Discordで保存した設定が優先です。API削除後は自動的にローカルへ戻りません。品質はモデルによって異なります。

用語集は`glossary/zzz.json`に同梱します。[共通データベース](https://github.com/Odarom/zenless-translation-database)・[更新手順](https://github.com/Odarom/zenless-discord-translator/blob/main/glossary/LIFECYCLE.md)を参照してください。公開された用語集が独立したボットへ自動反映されるわけではありません。

更新前に停止し、`.env`・`data/`・`.secrets/`をまとめて非公開バックアップします。ソースを交換して依存ライブラリを準備し、再起動します。秘密資料はGitHubへ公開しません。運営者は`node scripts/reports-cli.mjs export --status pending`で自分の環境の報告を出力できます。プロジェクト運営者は動画報告と一緒に確認しますが、他人の独立したボットからプロジェクトサーバーへの自動送信はありません。

接続した文章と設定された文脈は別言語のチャンネルに転送し、Gemini/OpenAIでは外部APIが処理します。最近の文脈はメモリで制限して使用し、提出した報告の原文・翻訳・説明は最大90日保存します。通常のテキストチャンネルが対象でDM・スレッド・フォーラム・音声翻訳はありません。

コマンドが出ない場合はアプリコマンドの使用権限とサーバーへのインストールを確認します。翻訳できない場合は起動状態、Message Content Intent、チャンネル権限、`/zzz api-status`・`/zzz status`を確認してください。[公式導入](https://docs.discord.com/developers/quick-start/getting-started)・[Intents](https://docs.discord.com/developers/events/gateway#privileged-intents)・[権限](https://docs.discord.com/developers/topics/permissions)も参照できます。検査は`npm test`です。

[動画字幕スタジオ](https://github.com/Odarom/zenless-subtitle-studio)は別アプリです。ゲーム公式ではないファン制作ボットです。
