# 翻訳DB開発者ガイド

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[concepts.json](../catalog/concepts.json)は、概念ごとの名称、入力別名、選択済み出力、適用条件を一つにまとめています。他のファイルとの結合は不要です。既存アプリ向けの[zzz.json](../catalog/zzz.json)とルートの[latest.json](../latest.json)も維持します。

## すぐに実行する

公開DBリポジトリをダウンロードし、Node.js 24.17以上でリポジトリのルートから実行してください。パッケージのインストールやAPIキーは不要です。

```sh
node database/examples/query.mjs "Deadly Assault" ko en
```

引数は原文、出力言語、原文言語の順です。サンプルは翻訳リクエストに渡す候補データを出力します。翻訳リクエストは送信せず、原文も変更しません。本ガイドのパスは配布DBリポジトリが基準です。管理用ワークスペースでは、DBのビルド出力フォルダー内で実行してください。

アプリではJSONを一度読み込み、検索オブジェクトを再利用します。

```js
import { readFile } from 'node:fs/promises';
import { createDatabase, GLOSSARY_INSTRUCTIONS } from './database/index.mjs';

const catalog = JSON.parse(await readFile('./catalog/concepts.json', 'utf8'));
const db = createDatabase(catalog);
const text = 'Deadly Assault';
const candidates = db.search(text);
const instructions = GLOSSARY_INSTRUCTIONS;
const glossary = db.prompt(candidates, {
  text,
  languages: ['en', 'ko'],
  style: 'official',
});
```

自分の翻訳リクエストに`instructions`を用語集の使用指針として含め、`text`と`glossary`を資料として渡してください。このサンプル自体はAPIを呼び出しません。保持された規則文の旧フィールド`preferred`は新形式の`names`、`communityPreferred`は選択済みのコミュニティ出力を指します。この対応を指針で説明するため、元の規則を書き換える必要はありません。選択した表記も、文脈・例外・対象の条件を無視する根拠にはなりません。

## 検索方法

| 呼び出し | 結果と用途 |
|---|---|
| `db.get(id)` | 概念の全データ。IDがなければ`undefined`。無効・未公開項目も直接参照できます。 |
| `db.lookup(alias)` | 入力全体が別名に一致する全概念。大文字・小文字を区別しません。 |
| `db.search(text)` | 文中の別名に一致する全候補。ASCIIの単語境界と長い名称との重複を扱います。 |
| `db.prompt(candidates, { text, languages, style })` | 一致した別名、指定言語の名称・出力と、意味・規則・文脈条件を含む配列。 |

`lookup`と`search`は既定で`autoUse: false`と`prerelease`を除外します。確認作業で含める場合は`{ includeDisabled: true, includePrerelease: true }`を明示してください。項目自体は全データに残ります。空白や全角文字の正規化、誤字・音声の推測、OCR断片の結合は行いません。

同じ略語に複数の意味があれば、候補をすべて返します。最初の結果を正解と見なしたり、別名を無条件に置き換えたりしないでください。周囲の文、キャラクター、スキルと`usage`の条件を確認し、不明なら原文表現を維持します。検索に必要な前後の文脈は呼び出し側で渡してください。

`prompt`には、この検索オブジェクトが返した候補を渡します。`text`は必須で、検索に使用した原文と関連文脈を変更せずに渡します。結果の`matchedAliases`には、そのテキストに実際に一致した別名だけを含めます。`get`で追加した概念がテキストに一致しなければ空の配列です。`languages`は対応言語コードの空でない配列で、必須です。`style`は`official`または`community`です。後者は既存の`communityOutputs`だけを使い、なければ同言語の`names`を使います。未登録言語の名称は作りません。`official`もすべての名称が正式であることを保証するフィルターではなく、名称の性質は`classification`で確認します。

翻訳リクエスト用の結果では、`meaning`・`rule`・`communityRule`と文脈フィールドを各項目の直下に配置します。選択した出力が`names`と異なる場合のみ`outputPreferred`があり、表記は`outputPreferred?.[language] ?? names[language]`で取得します。`prompt`は渡された候補を再び除外しないため、`get`で直接追加した無効・未公開項目の使用可否は呼び出し側で判断してください。

## データ形式

最上位の`format`は`zzz-translation-concepts`、`schemaVersion`は`1`です。`languages`は対応言語コード、`source`は元となる既存DBのハッシュ・版・取得日です。概念は`concepts`配列にあります。詳細は[JSON Schema](catalog.schema.json)を参照してください。

言語コード：`ko`、`en`、`ja`、`zh-CN`、`zh-Hant`、`de`、`fr`、`es`、`pt`、`ru`、`th`、`vi`、`id`。

| フィールド | 意味 |
|---|---|
| `id`, `category` | 概念IDと分類。名称からIDを生成し直さないでください。 |
| `names` | 基本4言語と追加9言語の名称を統合した言語別マップ。言語により収録範囲が異なります。 |
| `aliases` | 入力認識用の表現。出力の優先順位ではありません。 |
| `communityOutputs` | 利用者が指定した言語別の代表出力。未承認候補は含みません。 |
| `usage` | `meaning`、`rule`、任意の`communityRule`。意味と適用条件を保持します。 |
| `context` | 任意の`characterId`、言語別`characterName`・`relatedSkills`。主体や関連スキルを区別する資料です。 |
| `availability` | `releaseStatus`、`autoUse`、任意の`releaseVersion`・`sourceVersion`。 |
| `classification` | 名称・別名・現在の代表出力を個別に`official`・`unofficial`・`needs-review`で分類します。 |
| `tags` | 概念内の表現分類の集合。個別表現は`classification`で確認します。 |

`live`は正式名称や制作会社の監修を意味しません。`prerelease`は既存の未公開資料、`unspecified`は公開状態の指定なしです。対象言語に名称がなければ新作せず原文を維持します。意味・規則はDBの編集言語（現在は主に韓国語）を保ちます。

## リクエストサイズと更新

`prompt`は名称・出力を指定言語に限定し、全別名・分類・管理情報を送信しません。意味、否定、例外、対象、スキル条件は保持します。`characterName`・`relatedSkills`に指定言語が一つもなければ英語の文脈を、英語もなければ`catalog.languages`の順で最初に存在する言語の文脈を残します。これは文脈上の手掛かりであり、新作の訳名ではありません。空の文脈マップは省略します。検索で欠落した文脈の復元や翻訳品質の保証は行わないため、動画を小さなリクエストに分割する場合は文脈維持も別途検証してください。

新形式は[database/latest.json](latest.json)を使用します。`file`は**リポジトリのルート基準**の不変リリースパスです。利用前にファイルのバイト列を`sha256`・`bytes`と照合してください。`sourceSha256`は既存DBのハッシュで、新しいファイルのハッシュとは異なります。SDKとJSONを同じGitコミットに固定し、`schemaVersion`を確認します。`catalog/concepts.json`は現在のデータを読みやすくするパスです。

このリポジトリには配布用ファイルを収録しています。`catalog`にある管理・再構築コマンドは別の管理用ワークスペースが必要で、ここで実行できるとは限りません。修正案は[報告フォーム](https://github.com/Odarom/zenless-translation-database/issues/new/choose)へ送ってください。代表出力は任意に選ばず、利用者の確認を経て反映します。
