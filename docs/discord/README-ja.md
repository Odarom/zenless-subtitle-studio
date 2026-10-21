# ZZZ Discord翻訳ツール

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

言語別チャンネルの新規メッセージを翻訳します。自分のPCまたは個人サーバーで接続プログラムを実行し、自分のAPIキーを使います。

**[① Discordにボットを導入](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [② PC接続プログラムをダウンロード・Windows x64](https://github.com/Odarom/zenless-discord-translator/releases/download/v0.3.3/zenless-discord-runner-0.3.3-win-x64.zip)**

## Windows PC

1. 上のリンクからボットを導入します。Discordの**サーバー管理権限**が必要です。
2. ZIPを**すべて展開**し、**Start.cmd**を実行します。Node.jsは同梱済みです。リリースページでは**Assetsの実行用ZIP**を選んでください。
3. ブラウザーに開く設定画面でサービス・モデル・自分のAPIキーを入力し、**APIキー・設定を保存**を押します。
4. Discordで**/zzz connect**を実行します。表示されたコードを設定画面に入力し、**ボットと接続 → 翻訳接続を開始**を押します。コードは10分間・1回限り有効で、APIキーとは別です。
5. 言語別チャンネルを**同じグループ**に接続し、新しいメッセージを送ります。2チャンネルから使えます。

~~~text
/zzz link group:friends channel:#japanese language:日本語
/zzz link group:friends channel:#english language:English
~~~

翻訳中はPC接続プログラムを起動したままにしてください。過去の投稿はさかのぼって翻訳しません。

## 誤訳を報告して翻訳品質を改善する

ゲーム用語・略語・翻訳の誤りをお知らせください。報告を確認し、ゼンレスのゲーム用語DBと翻訳品質の改善に役立てます。

1. 訳文に **!report** と返信して**報告を開始**を押すか、メッセージメニューの**アプリ → 誤訳を報告**を使います。
2. 原文を確認し、**報告を作成**で誤訳箇所と説明を記入して送信します。正しい訳が分からなくても構いません。
3. 送信内容を確認し、**同意して送信**を押すと**プロジェクト管理者へ直接届きます**。ボット運営者への別途受付・共有は不要です。キャンセル時は送信せず、プロジェクトの**受付番号**で送信完了を確認できます。

プログラムを使わなくても、[正式名称・略語を直接報告](https://github.com/Odarom/zenless-translation-database/issues/new/choose)できます。このGitHub経由の報告にはアカウントが必要で、内容は公開されます。

## 設定画面を開き直す・キー変更

- **設定を開く：** 展開先の**Start.cmd**をもう一度実行します。
- **キー変更：** サーバープロファイル選択 → **設定変更のため停止** → 新しいキー入力 → **APIキー・設定を保存 → 翻訳接続を開始**。
- **複数サーバー：** **サーバープロファイル → サーバーを追加**で個別に接続します。キー・モデル・上限は別々に管理でき、他のプロファイルは動き続けます。

キーは自分のPC・サーバーに保存され、共有ボットには渡しません。その端末の管理者はキーにアクセスできるため、自分で管理する端末で自分のキーを使用してください。

## 個人サーバー

PCの代わりにOracle・VPS・自宅サーバーへ導入できます。**[導入と自動起動](HOSTING.md#日本語)**を参照してください。導入後のキー変更には、PC版の追加起動ではなく**[サーバーの非公開管理画面](HOSTING.md#複数サーバーと非公開の管理画面)**を使います。サーバーが稼働していればPCを終了できます。

## APIを選ぶ

**2026-10-19韓国時間に記載した無料APIの推奨：** [Google AI Studio](https://aistudio.google.com/apikey)でキーを発行し、**Gemini 3.1 Flash-Lite**（<code>gemini-3.1-flash-lite</code>）を利用できます。アカウント・プロジェクトの[無料枠の条件と上限](https://ai.google.dev/gemini-api/docs/pricing)を確認してください。OpenAI APIと別途導入したOllamaのローカルモデルにも対応します。

## DB更新と誤訳報告

- **DB：** 起動時と6時間ごとに自動更新します。設定画面から手動確認もできます。[用語集を見る](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/BROWSE.md)。
- **報告：** 訳文に**!report**と返信して**報告を開始**、またはメニューの**アプリ → 誤訳を報告**を選びます。非公開で受け付け、GitHubログインは不要です。
- **接続確認：** **/zzz api-status**。自分の報告は**/zzz-report mine**で確認します。

## 詳しい説明

[機能・対応言語・運用](https://github.com/Odarom/zenless-discord-translator/blob/main/FEATURES.md#日本語) · [サーバー導入](HOSTING.md#日本語) · [通信の流れ](ARCHITECTURE.md#日本語) · [更新履歴](https://github.com/Odarom/zenless-discord-translator/releases) · [利用規約](TERMS.md#日本語) · [プライバシー](PRIVACY.md#日本語)

翻訳は13言語、画面と説明書は4言語に対応します。[動画翻訳ツール](https://github.com/Odarom/zenless-subtitle-studio)は別のアプリです。ファン制作のツールであり、ゲーム公式サービスではありません。

<!-- Existing documentation links -->
<a id="zzz-discord翻訳"></a>
<a id="初めて使う方へ接続プログラムのダウンロード"></a>
<a id="現時点の無料apiの推奨"></a>
<a id="用語dbと誤訳報告"></a>
<a id="対応言語"></a>
