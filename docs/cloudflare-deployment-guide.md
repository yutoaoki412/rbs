# RBS陸上教室サイト - Cloudflareデプロイメントガイド

## 🏗️ プロジェクト概要

このプロジェクトは静的なHTMLサイトで、RBS陸上教室のウェブサイトです。動的なコンテンツはJavaScriptによってクライアントサイドで管理されています。

### 技術スタック
- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **ホスティング**: Cloudflare Pages（推奨）
- **CDN**: Cloudflare CDN
- **外部サービス**: Font Awesome（CDN）、Google Fonts

## 📁 プロジェクト構造

```
rbs/
├── src/
│   └── public/
│       ├── pages/           # HTMLページファイル
│       │   ├── index.html
│       │   ├── admin.html
│       │   ├── admin-login.html
│       │   ├── news.html
│       │   └── news-detail.html
│       ├── css/             # スタイルシート
│       ├── js/              # JavaScriptファイル
│       ├── assets/          # 画像・動画・その他アセット
│       └── _redirects       # Cloudflare Pages用リダイレクト設定
├── _redirects              # ルートレベルのリダイレクト設定
└── docs/                   # ドキュメント
```

## ✅ コードレビュー結果

### 現在のコード状態

#### 🟢 良好な点
1. **静的サイト構成**: CloudflarePages に最適化されたシンプルな構成
2. **SEO対応**: メタタグ、構造化されたHTML
3. **レスポンシブデザイン**: モバイルファーストアプローチ
4. **パフォーマンス**: 軽量なJavaScript、最適化されたCSS
5. **リダイレクト設定**: `_redirects`ファイルが既に設定済み

#### 🟡 注意点・改善推奨事項

1. **アセットファイルのパス**
   - 相対パス使用により、サブディレクトリ配置時にリンク切れの可能性
   - **推奨**: 絶対パスまたは環境変数での管理

2. **外部CDN依存**
   ```html
   <!-- 現在: -->
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
   ```
   - **評価**: 問題なし、Cloudflare CDNなので高速

3. **動画ファイル**
   - 大容量動画の配信最適化が必要な可能性
   - Cloudflare R2での配信も検討可能

#### 🔴 修正必要事項

1. **HTMLファイル内のエラー**
   ```html
   <!-- index.html line 15 で発見 -->
   <link rel="preconnect" href="https://fonts.gstatic.com" croessorigin>
   <!-- 正しくは: crossorigin -->
   ```

## 🚀 Cloudflareデプロイメント手順

### 前提条件
- Cloudflareアカウント
- GitHubアカウント（推奨）
- ブラウザ環境

### 手順1: コード修正

デプロイ前に以下の修正を実施してください：

```html
<!-- src/public/pages/index.html の15行目を修正 -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### 手順2: Cloudflare Pagesでのデプロイ

#### A. GitHubリポジトリ経由（推奨）

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Fix crossorigin attribute and prepare for deployment"
   git push origin main
   ```

2. **Cloudflare Dashboard**
   - [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
   - "Pages" セクションに移動
   - "Create a project" をクリック

3. **リポジトリ接続**
   - "Connect to Git" を選択
   - GitHubリポジトリを選択
   - ブランチ: `main` を指定

4. **ビルド設定**
   ```
   Framework preset: None
   Build command: (空白)
   Build output directory: src/public
   Root directory: (デフォルト)
   ```

#### B. 直接アップロード

1. **ファイル準備**
   - `src/public` フォルダの内容をzip化
   - または直接ドラッグ&ドロップ

2. **Cloudflare Pages**
   - "Upload assets" を選択
   - zipファイルをアップロードまたはフォルダをドラッグ&ドロップ

### 手順3: ドメイン設定

1. **カスタムドメイン**（オプション）
   - Pages設定で "Custom domains" を選択
   - 独自ドメインを追加
   - DNS設定をCloudflareに変更

2. **SSL/TLS設定**
   - 自動的にHTTPS有効化
   - 追加設定不要

## 🔧 Cloudflare最適化設定

### Pages設定
```toml
# wrangler.toml（オプション: より細かい制御が必要な場合）
name = "rbs-track-school"
compatibility_date = "2024-01-01"

[env.production]
route = "yourdomain.com/*"

[[env.production.rules]]
action = "rewrite"
path = "/*"
destination = "/pages/index.html"
```

### パフォーマンス最適化
1. **Auto Minify有効化**
   - CSS, JavaScript, HTML の自動最小化

2. **Brotli圧縮**
   - 自動的に有効化される

3. **画像最適化**
   - Cloudflare Polish（有料プラン）
   - または事前にWebP形式での準備を推奨

### セキュリティ設定
1. **HTTPS Redirect**
   - 自動的に有効
   
2. **Security Headers**
   ```javascript
   // _headers ファイル（オプション）
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: camera=(), microphone=(), geolocation=()
   ```

## 📊 デプロイ後の確認項目

### 機能テスト
- [ ] 全ページのロード確認
- [ ] リダイレクト動作確認
- [ ] 管理者ページアクセス確認
- [ ] モバイル表示確認
- [ ] 動画再生確認

### パフォーマンステスト
- [ ] PageSpeed Insights での測定
- [ ] GTmetrix での測定
- [ ] モバイルフレンドリーテスト

### SEOチェック
- [ ] メタタグ確認
- [ ] 構造化データ確認
- [ ] サイトマップ送信（必要に応じて）

## 🔄 継続的デプロイメント

### GitHub Actions（オプション）
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: rbs-track-school
          directory: src/public
```

## 🚨 注意事項とトラブルシューティング

### よくある問題
1. **404エラー**
   - `_redirects` ファイルの配置確認
   - パスの大文字小文字確認

2. **CSS/JSが読み込まれない**
   - 相対パスの確認
   - ファイルの実在確認

3. **動画が再生されない**
   - ファイル形式確認（MP4推奨）
   - ファイルサイズ確認（100MB未満推奨）

### 緊急時の対応
1. **ロールバック**
   - Cloudflare Pages管理画面で以前のデプロイメントに戻る
   
2. **キャッシュクリア**
   - Cloudflare Dashboard > Caching > Purge Everything

## 📈 今後の改善提案

### 短期改善
1. HTML構文エラーの修正
2. 画像ファイルのWebP形式への変換
3. JavaScriptの最小化

### 中期改善
1. Progressive Web App（PWA）対応
2. Service Worker実装
3. オフライン対応

### 長期改善
1. Cloudflare Workers活用
2. データベース連携（D1）
3. 問い合わせフォームのサーバーレス化

## 📞 サポート情報

### Cloudflare関連
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Community](https://community.cloudflare.com/)

### プロジェクト固有
- 技術的問題: GitHub Issues
- 運用問題: 管理者に連絡

---

**最終更新**: 2024年12月
**ドキュメント責任者**: 開発チーム 