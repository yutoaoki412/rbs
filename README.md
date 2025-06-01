# RBS陸上教室 ウェブサイト

## 概要
RBS陸上教室（Running Brain School）の公式ウェブサイトです。年長〜小6を対象とした陸上教室で、運動と脳トレを組み合わせた独自メソッドによる指導を行っています。

## 特徴
- 📱 レスポンシブデザイン（PC・タブレット・スマートフォン対応）
- 🎬 動画を活用したインタラクティブなUI
- 🔐 管理者画面でのコンテンツ管理機能
- ⚡ 高速配信対応（Cloudflare Pages）

## サイト構成
- **メインサイト**: 教室の紹介・特徴・料金・アクセス情報
- **管理画面**: 記事管理・レッスン状況管理・設定

## 技術スタック
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Hosting**: Cloudflare Pages
- **Version Control**: Git / GitHub
- **CDN**: Cloudflare

## 🚀 デプロイ手順

### クイックデプロイ
緊急時や簡単なデプロイは [DEPLOY-QUICK.md](./DEPLOY-QUICK.md) を参照

### 詳細なデプロイ手順
完全な手順書は [DEPLOY.md](./DEPLOY.md) を参照

## 📁 プロジェクト構造
```
rbs/
├── src/
│   └── public/              # 公開ファイル
│       ├── pages/           # HTMLページ
│       ├── css/             # スタイルシート
│       ├── js/              # JavaScript
│       └── assets/          # 画像・動画
├── docs/                    # 開発ドキュメント
├── _redirects               # Cloudflare Pages設定
├── DEPLOY.md               # デプロイ手順書
└── README.md               # 本ファイル
```

## 🔧 ローカル開発

### 必要な環境
- モダンブラウザ（Chrome, Firefox, Safari, Edge）
- Live Server拡張機能 または ローカルサーバー

### 開発手順
1. リポジトリのクローン
```bash
git clone https://github.com/yutoaoki412/rbs.git
cd rbs
```

2. ローカルサーバーの起動
```bash
# VS Code Live Server拡張機能を使用
# または
python -m http.server 8000
# または
npx live-server src/public
```

3. ブラウザでアクセス
```
http://localhost:8000/pages/index.html
```

## 🔐 管理画面

### アクセス
- **ログインページ**: `/admin-login`
- **管理画面**: `/admin`

### 機能
- 📝 記事の作成・編集・削除
- 📅 レッスン状況の管理
- ⚙️ サイト設定
- 📊 統計情報の確認

## 📖 ドキュメント

### 開発関連
- [DEPLOY.md](./DEPLOY.md) - デプロイ手順書
- [DEPLOY-QUICK.md](./DEPLOY-QUICK.md) - クイックデプロイガイド
- [docs/README.md](./docs/README.md) - 開発者向けドキュメント

### アーキテクチャ
- [README-MODERN-ARCHITECTURE.md](./README-MODERN-ARCHITECTURE.md) - モダンアーキテクチャ
- [LAYOUT_ARCHITECTURE.md](./LAYOUT_ARCHITECTURE.md) - レイアウト設計

### 管理機能
- [README-ADMIN-LOGIN.md](./README-ADMIN-LOGIN.md) - 管理者ログイン
- [README-AUTH-REFACTORING.md](./README-AUTH-REFACTORING.md) - 認証システム

## 🔄 継続的デプロイ
- `main` ブランチへのプッシュで自動デプロイ
- プルリクエストでプレビュー環境を自動生成
- Cloudflare Pages による高速配信

## 🛠️ メンテナンス
定期的な確認事項：
- サイトの動作確認
- セキュリティアップデート
- パフォーマンス監視

## 📞 サポート・問い合わせ
- **GitHub Issues**: 技術的な問題報告
- **Repository**: [yutoaoki412/rbs](https://github.com/yutoaoki412/rbs)

## 📝 ライセンス
プライベートプロジェクト - 無断転載禁止

---

**最終更新**: 2024年12月  
**バージョン**: 3.0.0 