# RBS陸上教室 認証システム セットアップガイド

## 🚨 現在の問題

- **メールアドレス確認エラー**: "メールアドレスが確認されていません"
- **Supabaseエラー**: "Email not confirmed" (400 Bad Request)
- **Chrome拡張機能エラー**: ERR_FILE_NOT_FOUNDエラー（これは無視してOK）

## 📋 解決手順（順序厳守）

### **Step 1: データベースセットアップ**

1. **Supabaseダッシュボードにアクセス**
   - URL: https://supabase.com/dashboard
   - プロジェクト: `ppmlieqwarnfdlsqqxoc`

2. **SQL Editorでスキーマ実行**
   - 左メニュー > SQL Editor
   - `scripts/setup-database.sql` の内容をコピー&ペースト
   - 「RUN」ボタンをクリック
   - ✅ 成功メッセージを確認

### **Step 2: 管理者ユーザー作成**

#### **方法A: ログイン画面から作成（推奨）**

1. **admin-login.html にアクセス**
   ```
   http://127.0.0.1:5502/admin-login.html
   ```

2. **「管理者ユーザーを作成」ボタンをクリック**
   - 緑色のボタンをクリック
   - 作成処理を実行
   - 結果メッセージを確認

#### **方法B: Supabaseダッシュボードで手動作成**

1. **Authentication > Users**
   - 左メニュー > Authentication > Users
   - 「Add user」ボタンをクリック

2. **ユーザー情報入力**
   ```
   Email: yaoki412rad@gmail.com
   Password: rbs2025admin
   ✅ Confirm email: チェックを入れる
   ```

3. **「Create user」をクリック**

### **Step 3: メール確認の完了**

1. **Authentication > Users でユーザー確認**
   - `yaoki412rad@gmail.com` が表示されることを確認

2. **メール確認状態をチェック**
   - ユーザーをクリック
   - `email_confirmed_at` が空の場合は未確認

3. **手動でメール確認を完了**
   - 「Confirm email」ボタンをクリック
   - または、ユーザー詳細で `email_confirmed_at` を現在時刻に設定

### **Step 4: ログインテスト**

1. **admin-login.html でログイン**
   ```
   メールアドレス: yaoki412rad@gmail.com
   パスワード: rbs2025admin
   ```

2. **ログインボタンをクリック**
   - 成功時: admin.html にリダイレクト
   - 失敗時: エラーメッセージを確認

### **Step 5: 管理画面動作確認**

1. **admin.html が正常に表示されることを確認**
2. **各タブが動作することを確認**
3. **データベース接続が正常であることを確認**

## 🔧 トラブルシューティング

### **問題: "Email not confirmed"**

**解決方法:**
1. Supabaseダッシュボード > Authentication > Users
2. yaoki412rad@gmail.com を選択
3. 「Confirm email」をクリック
4. 再度ログインを試行

### **問題: "Invalid login credentials"**

**解決方法:**
1. メールアドレス・パスワードを再確認
2. ユーザーが正しく作成されているかSupabaseで確認
3. 必要に応じてユーザーを再作成

### **問題: Chrome拡張機能エラー**

**対処法:**
- これらのエラーは無視してOK
- 拡張機能が不要なファイルを探しているだけ
- アプリケーションの動作には影響なし

### **問題: データベース接続エラー**

**解決方法:**
1. `js/config/supabase-config.js` の設定を確認
2. Supabase URL・ANON KEYが正しいか確認
3. `scripts/setup-database.sql` を再実行

## 📊 設定情報

### **Supabase設定**
```javascript
URL: https://ppmlieqwarnfdlsqqxoc.supabase.co
ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **管理者アカウント**
```
Email: yaoki412rad@gmail.com
Password: rbs2025admin
```

### **データベーステーブル**
- `articles` - 記事管理
- `instagram_posts` - Instagram投稿管理
- `lesson_status` - レッスン状況管理
- `admin_settings` - 管理画面設定

## ✅ 完了チェックリスト

- [ ] データベーススキーマ実行完了
- [ ] 管理者ユーザー作成完了
- [ ] メール確認完了
- [ ] ログイン成功
- [ ] 管理画面表示成功
- [ ] 各機能動作確認完了

## 🆘 サポート

問題が解決しない場合は、以下の情報を含めてお知らせください：

1. **実行したステップ**
2. **エラーメッセージの詳細**
3. **ブラウザのコンソールログ**
4. **Supabaseダッシュボードのスクリーンショット**

---

**重要**: 順序を守って実行することで、確実に問題を解決できます。 