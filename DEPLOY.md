# RBS陸上教室 デプロイ手順書

## 概要
本ドキュメントは、RBS陸上教室ウェブサイト（管理画面含む）をCloudflare Pagesにデプロイする手順を説明します。

## 前提条件
- GitHubアカウントが作成済み
- Cloudflareアカウントが作成済み
- プロジェクトがGitHubリポジトリにプッシュ済み

## プロジェクト構成
```
rbs/
├── src/
│   └── public/
│       ├── pages/
│       │   ├── index.html          # メインページ
│       │   ├── admin-login.html    # 管理者ログインページ
│       │   └── admin.html          # 管理画面
│       ├── css/                    # スタイルシート
│       ├── js/                     # JavaScript
│       ├── assets/                 # 画像・動画
│       └── _redirects              # Cloudflare Pages用リダイレクト設定
├── _redirects                      # ルートレベルリダイレクト設定
└── DEPLOY.md                       # 本ドキュメント
```

## デプロイ手順

### 1. GitHubリポジトリの準備

#### 1.1 現在の状態確認
```bash
git status
git log --oneline -5
```

#### 1.2 最新の変更をプッシュ（必要に応じて）
```bash
git add .
git commit -m "デプロイ準備完了"
git push origin main
```

### 2. Cloudflare Pagesプロジェクトの作成

#### 2.1 Cloudflareダッシュボードにアクセス
1. [https://dash.cloudflare.com/](https://dash.cloudflare.com/) にアクセス
2. Cloudflareアカウントでログイン

#### 2.2 新しいPagesプロジェクトの作成
1. 左サイドバーから **「Pages」** を選択
2. **「Create a project」** ボタンをクリック
3. **「Connect to Git」** を選択

#### 2.3 GitHub連携の設定
1. **「Connect GitHub」** をクリック
2. GitHubでの認証を完了
3. リポジトリ一覧から **「yutoaoki412/rbs」** を選択
4. **「Begin setup」** をクリック

### 3. ビルド設定の構成

#### 3.1 基本設定
| 項目 | 設定値 |
|------|--------|
| Project name | `rbs-rikujou-kyoushitsu` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | (空白) |
| Build output directory | `src/public` |
| Root directory | `/` (デフォルト) |

#### 3.2 詳細設定（必要に応じて）
- **Environment variables**: 環境変数が必要な場合のみ設定
- **Functions**: サーバーサイド機能が必要な場合のみ

### 4. デプロイの実行

#### 4.1 初回デプロイ
1. **「Save and Deploy」** をクリック
2. デプロイ進行状況を確認
3. 完了まで待機（通常1-3分）

#### 4.2 デプロイ結果の確認
- デプロイ完了後、自動生成されたURLが表示されます
- 例: `https://rbs-rikujou-kyoushitsu.pages.dev`

### 5. サイトの動作確認

#### 5.1 メインサイトの確認
- **URL**: `https://your-domain.pages.dev/`
- 各ページの表示を確認
- 動画の再生確認
- レスポンシブデザインの確認

#### 5.2 管理画面の確認
- **ログインページ**: `https://your-domain.pages.dev/admin-login`
- **管理画面**: `https://your-domain.pages.dev/admin`
- ログイン機能の動作確認
- 管理機能の動作確認

#### 5.3 リダイレクト動作の確認
以下のURLでリダイレクトが正常に動作することを確認：
- `/` → `/pages/index.html`
- `/index` → `/pages/index.html`
- `/admin-login` → `/pages/admin-login.html`
- `/admin` → `/pages/admin.html`

## 自動デプロイの設定

### GitHub連携による自動デプロイ
- `main` ブランチへのプッシュで自動デプロイが実行されます
- プルリクエストのプレビューURLも自動生成されます

### デプロイ状況の確認
1. Cloudflare Pages ダッシュボード
2. プロジェクトページで「Deployments」タブを確認
3. ビルドログとエラーの確認が可能

## カスタムドメインの設定（オプション）

### 1. ドメインの追加
1. プロジェクトページで **「Custom domains」** タブ
2. **「Set up a custom domain」** をクリック
3. 独自ドメイン名を入力（例: `rbs-track.com`）

### 2. DNS設定
指示に従ってDNS設定を更新：
```
Type: CNAME
Name: your-domain.com
Value: rbs-rikujou-kyoushitsu.pages.dev
```

### 3. SSL証明書
- 自動的にSSL証明書が設定されます
- Let's Encryptによる無料SSL証明書

## セキュリティ設定

### 管理画面の保護
- 管理画面は `noindex, nofollow` メタタグで検索エンジンから除外
- パスワード認証による保護
- セッション管理機能

### アクセス制御（オプション）
Cloudflare Access を使用した IP制限やアクセス制御も設定可能

## トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイが失敗する
- **原因**: ビルド設定の誤り
- **解決**: Build output directory が `src/public` に設定されているか確認

#### 2. 管理画面にアクセスできない
- **原因**: リダイレクト設定の問題
- **解決**: `_redirects` ファイルの設定を確認

#### 3. 静的ファイルが読み込まれない
- **原因**: パスの設定ミス
- **解決**: 相対パスの設定を確認

#### 4. 動画が再生されない
- **原因**: ファイルサイズまたは形式の問題
- **解決**: 動画ファイルの最適化を検討

### ログの確認方法
1. Cloudflare Pages ダッシュボード
2. 該当プロジェクト > Deployments
3. 失敗したデプロイをクリックしてログを確認

## パフォーマンス最適化

### Cloudflare の機能活用
- **CDN**: 世界中のエッジサーバーでコンテンツ配信
- **圧縮**: 自動的な Gzip/Brotli 圧縮
- **キャッシュ**: 静的ファイルの効率的なキャッシュ

### 推奨設定
- 画像の WebP 形式への変換
- CSS/JS の最小化
- 動画ファイルの最適化

## 継続的なメンテナンス

### 定期的な確認事項
- サイトの動作確認（月1回）
- セキュリティアップデートの確認
- パフォーマンスの監視

### バックアップ
- GitHubリポジトリが自動バックアップとして機能
- 定期的なコードのローカルバックアップを推奨

## 連絡先・サポート

### 開発者情報
- GitHub リポジトリ: [yutoaoki412/rbs](https://github.com/yutoaoki412/rbs)
- 技術的な問題は Issues で報告

### Cloudflare サポート
- [Cloudflare Pages ドキュメント](https://developers.cloudflare.com/pages/)
- [コミュニティフォーラム](https://community.cloudflare.com/)

---

**最終更新**: 2024年12月
**バージョン**: 1.0.0 