# ゼンレスDiscord翻訳ボット

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## [➕ Discordサーバーに翻訳ボットを追加](https://discord.com/oauth2/authorize?client_id=1557261995215028254&scope=bot%20applications.commands&permissions=536939520&integration_type=0)

Odaromが運営する **zzz translator** を招待して使います。インストールやサーバー運営は不要です。韓国語・英語・日本語・簡体字中国語のテキストチャンネルをつなぎ、ゼンレスゾーンゼロの用語集を参照して新しい投稿を翻訳します。

[利用規約](TERMS.md) · [プライバシーポリシー](PRIVACY.md)

## 始め方

1. 上の追加リンクから管理するサーバーを選び、チャンネルを見る・メッセージを送信・メッセージ履歴を読む・ウェブフックの管理を許可します。
2. サーバー管理者が `/zzz api-set` で **自分のサーバー用のGeminiまたはOpenAIのAPIキー**、モデル、1日のリクエスト上限を登録します。
3. 2つ以上の言語別チャンネルを同じグループにつなぎます。

```text
/zzz link group:friends channel:#한국어 language:한국어
/zzz link group:friends channel:#日本語 language:日本語
```

2つ目のチャンネルをつないだ後の新規投稿から翻訳します。同じグループでは各言語1チャンネルまでです。API・チャンネル設定にはサーバー管理権限が必要です。

## 無料APIのおすすめ — 2026年10月19日（韓国標準時）時点

**現時点で無料利用できるAPIとしてGemini 3.1 Flash-Liteをおすすめします。** [Google AI Studioで無料APIキーを取得](https://aistudio.google.com/apikey)し、モデルを `gemini-3.1-flash-lite` に設定します。**無料枠の上限内で使えば、翻訳ボットを無料で利用できます。** 無料枠にもリクエスト数・トークンの上限があり、提供条件は今後変わる場合があります。[Google公式の最新の無料枠・料金](https://ai.google.dev/gemini-api/docs/pricing)をご確認ください。有料サービスを選ぶ場合は、登録したキーのアカウントに料金が発生します。

**キーは運営サーバーで暗号化保存し、API呼び出しのために復号する場合があります。サーバーへのアクセス権を持つ運営者はキーにアクセスできます。**設定フォームは実行者にのみ表示されますが、入力文字は隠れません。プライバシーポリシーを確認してください。

## コマンドと動作

| コマンド | 機能 |
|---|---|
| `/zzz status` | 接続状況 |
| `/zzz pause group:friends` · `/zzz resume group:friends` | 停止・再開 |
| `/zzz unlink` | チャンネルの接続解除 |
| `/zzz usage` · `/zzz api-status` | 使用量・API設定 |
| `/zzz api-delete` | 保存したAPI設定の削除・利用停止 |

1件のメッセージの翻訳先言語を1回のAIリクエストで処理します。記録が残る原文の編集・削除は訳文にも反映し、編集には追加リクエストが必要です。画像・GIF・絵文字だけの投稿はAIなしで共有します。画像内の文字、DM・スレッド・フォーラム・音声は翻訳しません。上限エラーは自動再送せず、Geminiの一時的なサーバーエラーのみ1回再試行する場合があります。失敗・再試行も使用量に含み、回数上限は金額上限ではありません。

## 誤訳の報告

訳文へ **`!report` と返信**して報告ボタンを押します。メッセージの **アプリ → 誤訳を報告**、`/zzz-report submit message:メッセージリンク`も利用できます。`/zzz-report mine`・`/zzz-report status id:受付番号`で自分の報告を確認できます。

GitHubへの投稿は不要です。運営者へ非公開で届き、動画アプリの報告と一緒に確認します。**確認した修正だけを[共通用語集](https://github.com/Odarom/zenless-translation-database)へ反映します。**会話全体をデータベースへ自動収集する機能ではありません。報告の保存期間は最大90日です。

## 更新・問い合わせ

運営者がボットと用語集を更新するため、利用者によるファイル更新やサーバー運営は不要です。接続前に参加者へ他チャンネルへの転送と外部AI処理を説明してください。無料Geminiのデータ利用や成人向け条件など、提供者の規約も確認してください。

コマンドが出ない場合はアプリコマンドの使用権限とサーバーへのインストール、翻訳されない場合はチャンネル権限・`/zzz api-status`・`/zzz status`を確認します。終了は接続解除またはボット退出で行えます。提供者側のキー失効は別途必要です。

[問い合わせ](https://github.com/Odarom/zenless-discord-translator/issues/new)にキー・非公開会話・個人情報を投稿しないでください。[字幕スタジオ](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)は別のPCアプリです。ゲーム制作会社の公式サービスではありません。
