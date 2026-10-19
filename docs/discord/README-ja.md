# ZZZ Discord翻訳

翻訳は韓国語・英語・日本語・簡体字/繁体字中国語・ドイツ語・フランス語・スペイン語・ポルトガル語・ロシア語・タイ語・ベトナム語・インドネシア語の13言語に対応します。画面表示と説明書は従来の4言語です。既存1,868概念に追加9言語の名称16,802件を対応付け、テスト用の値10件を除外しました。不明な名称は補作しません。新規・未公開用語は正式実装を確認してから検討します。このプログラム更新後、同じ13言語内の名称追加・修正はDB更新で受け取れます。新しい言語コード自体の追加にはプログラム更新も必要です。

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[ボットを導入](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [PCプログラム](https://github.com/Odarom/zenless-discord-translator/releases/latest) · [利用規約](TERMS.md) · [プライバシー](PRIVACY.md)

共通のゼンレス用語DBを使って言語別チャンネルを翻訳します。ボットは原文・文脈・翻訳結果を中継し、**自分のPCまたは個人サーバーが翻訳APIを直接呼び出します**。APIキーは自分の端末に保存し、共有ボットには渡しません。Discordサーバーごとに接続プログラム1台を実行してください。

## Windows PC

1. サーバー管理権限で上記リンクからボットを導入します。
2. Windows x64 ZIPをすべて展開し、**Start.cmd**を実行します。Node.jsは同梱されています。ブラウザーに自分のPCの設定画面が開きます。
3. サービス・モデル・自分のAPIキー・1日のリクエスト上限を設定し、**この端末に保存**を押します。UIは韓国語・英語・日本語・簡体字中国語に対応します。
4. Discordで**/zzz connect**を実行し、1回限り・10分間有効のコードをPCに入力します。**ボットと接続 → 翻訳接続を開始**を押します。APIキーをDiscordに送らないでください。
5. **/zzz link**で異なる言語のチャンネルを同じグループに接続します。2チャンネルから使えます。過去ログは翻訳せず、新規投稿を処理します。記録のある投稿の編集・削除は翻訳にも反映します。画像・GIF・絵文字のみの投稿はAIなしで共有します。このボットにはOCR・音声翻訳はありません。

複数のDiscordサーバーでは、**サーバープロファイル → サーバーを追加**で名前を付け、各サーバーの/zzz connectコードを接続してください。キー・モデル・上限・使用量を個別管理し、同じキーも別のキーも使えます。変更するプロファイルのみ停止・保存・開始し、他のサーバーは動き続けます。Geminiでは別キーでも同じプロジェクトならAPI上限を共有します。個人サーバーの管理は[SSHによるUI接続](HOSTING.md#several-servers-and-private-management-ui)を参照してください。[通信図](ARCHITECTURE.md)で原文・結果・DB・報告の流れを確認できます。

## 現時点の無料APIの推奨

**2026-10-19韓国時間時点**では、[Google AI Studioでキーを発行](https://aistudio.google.com/apikey)し、**Gemini 3.1 Flash-Lite (gemini-3.1-flash-lite)**を推奨します。[公式料金表](https://ai.google.dev/gemini-api/docs/pricing)に無料枠があります。アカウント・プロジェクトの条件とRPM・TPM・日次上限内なら無料利用できます。[データ処理条件](https://ai.google.dev/gemini-api/terms)・課金設定・モデルの利用権限を確認してください。無制限・永続的な無料提供ではありません。OpenAI APIや自分の端末のOllamaも選べます。

## 個人サーバー

自分で管理するOracle・VPS・自宅サーバーで、同じ接続プログラムを画面なしで実行できます。サーバーが動いていればPCを終了しても翻訳できます。サーバー管理者はキーにアクセスできるため、自分のサーバーで自分のキーを使う個人用途とし、他人のキーを収集しないでください。

ソースを取得しNode.js 24.17以上を用意します。接続プログラムだけならDiscordライブラリの導入は不要です。

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
# .env.runnerに自分のサービス・モデル・キー・上限を設定してから:
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

pairでは/zzz connectのコードを入力します。再起動後の自動実行は[HOSTING.md](HOSTING.md)のsystemd例を参照してください。外向きHTTPS接続のみで、自分の端末の受信Webポートを開く必要はありません。同じ接続を2台で同時実行しないでください。

## 用語DBと誤訳報告

- PC・サーバーとも、起動時と**6時間ごと**に[共通DB](https://github.com/Odarom/zenless-translation-database)を更新します。サイズ・ハッシュ・形式を確認してから置換し、失敗時は最後の正常なDBを維持します。プログラム本体の更新とは別です。
- チャットでは本文・返信・直近の文脈から名称・別名を検索し、最大30候補を同じ翻訳リクエストに含めます。検索用の追加LLMリクエストはありません。
- 訳文に**!report**と返信し**報告を開始**、または**アプリ → 誤訳を報告**を選択します。案内を確認して送信すると、原文・訳文・説明をプロジェクト管理者が非公開で確認します。GitHubログインは不要です。
- 自分の報告は**/zzz-report mine**と**/zzz-report status**で確認します。独立した自己ホスト版では、ローカル受付後に**プロジェクト管理者にも共有**を選択し、プレビューに同意した場合のみ転送します。
- キー・個人情報・無関係な会話を含めないでください。報告は最大90日保存し、管理者確認後にDBへ反映します。報告だけで自動修正・AI呼び出しはしません。

接続確認は/zzz api-status、解除は/zzz disconnect、グループ停止・再開は/zzz pause・resumeです。使用量はPC画面かnode --env-file=.env.runner scripts/discord-runner.mjs usageで確認します。失敗したAPI呼び出しも含みます。中継接続が切れても開始済みの翻訳を自動で繰り返しません。

PC UIはキーを端末内で暗号化しますが、その端末の管理者は復号できます。画面なしの導入は非公開の.env.runnerを使います。.envファイル・data/・.secrets/を公開しないでください。設定変更・ファイル更新前には停止し、個人設定を保存してください。自分のDiscordボットを運営する場合は[HOSTING.md](HOSTING.md)を参照してください。従来のAPI_MODE=serverは運営者がキーを復号できるため、自分のキーだけを使う個人用途に限ってください。公開中継ボットはAPI_MODE=runnerを使います。

[動画字幕スタジオ](https://github.com/Odarom/zenless-subtitle-studio)は別のプログラムです。ゲーム公式サービスではないファンツールです。
