# 🚀 RBS陸上教室 クイックデプロイガイド

## 緊急時・簡易デプロイ手順

### 1️⃣ GitHubにプッシュ
```bash
git add .
git commit -m "デプロイ"
git push origin main
```

### 2️⃣ Cloudflare Pages設定
1. [dash.cloudflare.com](https://dash.cloudflare.com/) → Pages
2. Create a project → Connect to Git
3. **yutoaoki412/rbs** を選択

### 3️⃣ ビルド設定
```
Framework preset: None
Build command: (空白)
Build output directory: src/public
```

### 4️⃣ デプロイ実行
**Save and Deploy** をクリック → 完了待ち

## 📝 アクセスURL
- **メインサイト**: `https://your-domain.pages.dev/`
- **管理ログイン**: `https://your-domain.pages.dev/admin-login`
- **管理画面**: `https://your-domain.pages.dev/admin`

## ⚠️ トラブル時
1. リダイレクト問題 → `_redirects` ファイル確認
2. ビルド失敗 → Build output directory が `src/public` か確認
3. 管理画面エラー → パスワード設定とJavaScript確認

## 📞 サポート
詳細手順: [DEPLOY.md](./DEPLOY.md) 