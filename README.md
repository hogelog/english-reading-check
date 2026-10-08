# Daily English Reading Check

毎日5分で回す、英語リーディング力の定点観測アプリ。

1. 英文（300〜500 words）を読む
2. 内容理解の4択問題を5問解く
3. 正答率・読了時間を確認する
4. 過去の結果と比較する

厳密なCEFR判定ではなく、「以前より速く読めるか」「同程度の英文をより正確に理解できるか」の日々の変化を見ることが目的。

🌐 公開URL: https://hogelog.github.io/english-reading-check/

## 特徴

- 依存ゼロ・ビルド不要の静的サイト（HTML + CSS + JS、外部CDNなし、外部フォントなし）
- 合計 ~200KB、スマホ最優先、ダークモード対応、日本語UI（英文・問題は英語）
- バックエンド・ログイン・外部APIなし。学習履歴はブラウザの **LocalStorage** にのみ保存
- PWA対応（manifest + service worker、オフライン可、ホーム画面追加可）
- 30セットの問題を内蔵（A2×7 / B1×8 / B2×8 / C1×7）
- 未出題優先・直近回避の出題ロジック（同じ問題の連続出題なし）

## 必要条件

- Node.js 18+（`dev` / `build` / `test` 用。配布物自体はただの静的ファイル）

## ローカルでの起動方法

```bash
npm install   # 依存ゼロのため実質何も入らない
npm run dev   # http://localhost:8080/ で起動
```

ビルド版の確認:

```bash
npm run preview  # dist/ を配信
```

## テスト・ビルド

```bash
npm test       # node --test（依存なし）
npm run build  # データ検証 + dist/ に静的ファイルをコピー
```

`npm run build` は問題データのバリデーションも兼ねる（30セット以上、4レベル網羅、各5問・4択・解説あり、本文250〜600 words）。

## GitHub Pagesへのデプロイ方法

`main` への push で自動デプロイ（`.github/workflows/deploy.yml`）。

初回のみ必要な設定:

1. GitHubで空リポジトリ `english-reading-check` を作成して push
2. リポジトリの **Settings → Pages → Build and deployment** で Source を **GitHub Actions** に変更
3. `main` に push すると `dist/` が `https://<user>.github.io/english-reading-check/` に公開される

base path 依存を避けるため、全アセット参照は相対パス（`./`）で書かれている。

## データ保存について

- 履歴は `localStorage` の `derc:history:v1`（最大365件）に保存。サーバー送信・トラッキングなし
- 難易度選択は `derc:difficulty:v1`、テーマは `derc:theme:v1` に保存
- 履歴画面の「JSON出力」でクリップボードにエクスポート、「履歴を消去」で削除できる

保存形式:

```json
{
  "date": "2026-10-08",
  "score": 4,
  "total": 5,
  "durationSeconds": 272,
  "difficulty": "B1",
  "articleId": "article-001"
}
```

## 問題データの追加方法

1. `articles-a2.js` / `articles-b1.js` / `articles-b2.js` / `articles-c1.js` のいずれかに1件追加:

```js
{
  "id": "b1-009",          // 全体で一意
  "difficulty": "B1",      // ファイルと一致させる
  "title": "Article Title",
  "text": "para1\n\npara2\n\npara3",  // 300〜500 words目安
  "questions": [           // ちょうど5問
    {
      "question": "...",
      "choices": ["...", "...", "...", "..."],  // 4択
      "answer": 1,         // 正解のindex（0-3）
      "explanation": "日本語の解説"
    }
  ]
}
```

2. `npm test && npm run build` で検証（語数・設問数・選択肢数がチェックされる）
3. `main` に push すれば自動で公開される

出題タイプは「明示的事実・推測・語彙（文脈）・指示語・因果・要旨・筆者の意図/態度」をバランスよく混ぜること。単語暗記テストにしない。
