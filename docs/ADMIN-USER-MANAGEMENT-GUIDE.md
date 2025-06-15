# 👥 RBS陸上教室 管理者ユーザー追加ガイド

## **📋 概要**

RBS陸上教室の管理システムに新しい管理者ユーザーを追加する完全なガイドです。

**現在のアーキテクチャ**: セキュアなメタデータベース権限管理システム
- ✅ **3層防御**: メタデータ権限 + RLSポリシー + フォールバック認証
- ✅ **完全手動管理**: Supabaseダッシュボードでの確実な管理者追加
- ✅ **操作ログ**: 全ての管理者操作を自動記録

---

## **🔧 管理者追加方法（推奨）**

### **Step 1: Supabaseダッシュボードにアクセス**

1. ブラウザで以下のURLを開く：
   ```
   https://supabase.com/dashboard/project/ppmlieqwarnfdlsqqxoc/auth/users
   ```

2. Supabaseにログインしていない場合はログイン

### **Step 2: 新しいユーザーを作成**

1. **"Add user"** ボタンをクリック
2. 以下の情報を入力：
   - **Email**: 新しい管理者のメールアドレス
   - **Password**: 安全なパスワード（8文字以上）
   - **Email Confirm**: ✅ チェックを入れる（重要！）
3. **"Create user"** ボタンをクリック

### **Step 3: 管理者権限を設定**

1. 作成されたユーザーをクリックして詳細を開く
2. **"Raw JSON"** タブをクリック
3. `user_metadata` セクションを探す
4. 以下のJSONを追加または編集：
   ```json
   {
     "role": "admin",
     "name": "管理者名",
     "created_by": "manual-setup"
   }
   ```
5. **"Save"** ボタンをクリック

### **Step 4: 権限確認**

1. 管理画面のログインページにアクセス：
   ```
   http://127.0.0.1:5502/admin-login.html
   ```
2. 新しい管理者の認証情報でログインテスト
3. 成功すれば完了！

---

## **🔧 SQLクエリによる一括設定（上級者向け）**

### **Step 1: Supabaseダッシュボードでユーザー作成**

上記のStep 1-2を実行してユーザーを作成

### **Step 2: SQLエディターで権限設定**

1. **Supabaseダッシュボード** > **SQL Editor**
2. 以下のSQLを実行：

```sql
-- ユーザーのメタデータを更新
UPDATE auth.users 
SET user_metadata = jsonb_set(
  COALESCE(user_metadata, '{}'),
  '{role}',
  '"admin"'
)
WHERE email = 'new-admin@example.com';

-- メール確認を完了
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'new-admin@example.com' 
AND email_confirmed_at IS NULL;

-- 管理者名も設定する場合
UPDATE auth.users 
SET user_metadata = jsonb_set(
  user_metadata,
  '{name}',
  '"管理者名"'
)
WHERE email = 'new-admin@example.com';
```

**注意**: `new-admin@example.com` を実際のメールアドレスに変更

---

## **✅ 管理者追加後の確認手順**

### **1. ユーザー情報確認**

Supabaseダッシュボードで以下を確認：
- ✅ **Email Confirmed**: `true`
- ✅ **User Metadata**: `{"role": "admin"}` が設定済み
- ✅ **Status**: `Active`

### **2. ログインテスト**

1. 管理画面ログインページにアクセス
2. 新しい管理者の認証情報でログイン
3. 管理画面にアクセスできることを確認

### **3. 権限テスト**

管理画面で以下の機能をテスト：
- ✅ 記事管理（作成・編集・削除）
- ✅ Instagram管理
- ✅ レッスン状況管理
- ✅ 設定変更

---

## **🚨 トラブルシューティング**

### **問題1: "Email not confirmed" エラー**

**解決方法:**
1. Supabaseダッシュボード > Authentication > Users
2. 該当ユーザーをクリック
3. **"Confirm email"** ボタンをクリック

### **問題2: "管理者権限がありません" エラー**

**解決方法:**
1. Supabaseダッシュボード > Authentication > Users
2. 該当ユーザーをクリック > **"Raw JSON"** タブ
3. `user_metadata` に以下を追加：
   ```json
   {"role": "admin"}
   ```

### **問題3: ログインできない**

**確認事項:**
- ✅ メールアドレスが正確か
- ✅ パスワードが正確か
- ✅ メール確認が完了しているか
- ✅ ユーザーが `Active` 状態か

### **問題4: 権限チェックが機能しない**

**確認事項:**
- ✅ `user_metadata.role = 'admin'` が正確に設定されているか
- ✅ RLSポリシーが有効になっているか
- ✅ セキュアアーキテクチャが正しく実装されているか

---

## **🛡️ セキュリティのベストプラクティス**

### **パスワード要件**
- ✅ 8文字以上
- ✅ 大文字・小文字・数字・記号を含む
- ✅ 辞書にない単語
- ✅ 個人情報を含まない

### **管理者管理**
- ✅ 必要最小限の管理者のみ追加
- ✅ 定期的な権限確認
- ✅ 退職者の権限即座削除
- ✅ 管理者リストの文書化

### **アクセス管理**
- ✅ 強力なパスワードの使用
- ✅ 定期的なパスワード変更
- ✅ 不審なアクセスの監視
- ✅ セッション管理の適切な設定

---

## **📝 管理者リスト管理**

### **現在の管理者**

| メールアドレス | 名前 | 役割 | 追加日 | 状態 |
|---|---|---|---|---|
| yaoki412rad@gmail.com | メイン管理者 | 主管理者 | 初期設定 | ✅ Active |

### **新しい管理者を追加した場合**

上記のテーブルに以下の情報を追加：
- メールアドレス
- 名前
- 役割
- 追加日
- 状態

---

## **🔄 定期メンテナンス**

### **月次確認**
- ✅ 管理者リストの確認
- ✅ 不要なユーザーの削除
- ✅ パスワード強度の確認
- ✅ 管理者操作ログの確認

### **四半期確認**
- ✅ 権限の見直し
- ✅ セキュリティ設定の確認
- ✅ バックアップの確認
- ✅ RLSポリシーの動作確認

---

## **🔍 管理者操作ログの確認**

### **ログ確認方法**

1. **Supabaseダッシュボード** > **SQL Editor**
2. 以下のクエリを実行：

```sql
-- 最近の管理者操作を確認
SELECT 
  admin_email,
  action,
  table_name,
  created_at,
  new_data
FROM admin_action_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- 特定の管理者の操作履歴
SELECT 
  action,
  table_name,
  record_id,
  created_at
FROM admin_action_logs 
WHERE admin_email = 'yaoki412rad@gmail.com'
ORDER BY created_at DESC;
```

### **ログの内容**
- ✅ **操作者**: どの管理者が操作したか
- ✅ **操作内容**: INSERT/UPDATE/DELETE
- ✅ **対象テーブル**: articles, instagram_posts等
- ✅ **操作時刻**: 正確なタイムスタンプ
- ✅ **変更内容**: 変更前後のデータ

---

## **📞 サポート**

問題が解決しない場合：

1. **エラーメッセージ**をスクリーンショット
2. **実行した手順**を記録
3. **ブラウザコンソール**のエラーログを確認
4. **管理者操作ログ**を確認
5. 上記の情報と共にサポートに連絡

---

## **🎯 システム概要**

### **現在のアーキテクチャ**
- **認証**: Supabase Auth完全統合
- **権限管理**: メタデータベース（`user_metadata.role = 'admin'`）
- **データ保護**: RLSポリシーによる完全防御
- **操作監査**: 全管理者操作の自動ログ記録
- **フォールバック**: メールアドレスベース予備認証

### **セキュリティレベル**
- 🔒 **レベル1**: Supabase Auth認証
- 🔒 **レベル2**: メタデータ権限チェック
- 🔒 **レベル3**: RLSポリシー防御
- 📊 **監査**: 全操作ログ記録

**このガイドに従って、安全に新しい管理者を追加してください。** 