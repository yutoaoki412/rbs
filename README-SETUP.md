# RBS陸上教室 統合認証システム セットアップガイド

## 概要

RBS陸上教室の管理画面は、Supabase Authと完全統合された認証システムを使用しています。
このガイドでは、管理者ユーザーの作成とRLSポリシーの設定手順を説明します。

## 前提条件

- Supabaseプロジェクトが作成済み
- Supabase Service Role Keyが取得済み
- Node.js環境（セットアップスクリプト実行用）

## セットアップ手順

### 1. 環境変数の設定

以下の環境変数を設定してください：

```bash
# .env ファイルまたはシステム環境変数
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. 管理者ユーザーの作成

セットアップスクリプトを実行して管理者ユーザーを作成します：

```bash
node scripts/setup-admin-user.js
```

このスクリプトは以下を実行します：
- 管理者ユーザー（yaoki412rad@gmail.com）の作成
- RLSポリシー設定用SQLの生成

### 3. RLSポリシーの設定

スクリプト実行後に出力されるSQL（schema.sql準拠）を、Supabase SQLエディタで実行してください。

または、`database/schema.sql`の「5. Row Level Security (RLS) 設定」セクションを直接実行することも可能です。

**推奨**: `database/schema.sql`全体を実行して、テーブル構造とRLSポリシーを一括設定

### 4. 認証テスト

1. 管理画面（admin.html）にアクセス
2. 自動的にSupabase Auth認証が実行されます
3. 認証成功後、管理画面が表示されます

## 認証情報

### デフォルト管理者アカウント

- **メールアドレス**: yaoki412rad@gmail.com
- **パスワード**: rbs2025admin
- **権限**: 管理者（authenticated）

### 認証設定（config.js）

認証設定は `js/shared/constants/config.js` で一元管理されています：

```javascript
admin: {
  auth: {
    adminCredentials: {
      email: 'yaoki412rad@gmail.com',
      password: 'rbs2025admin',
      role: 'admin'
    },
    // その他の設定...
  }
}
```

## トラブルシューティング

### 認証エラーが発生する場合

1. **Supabase接続確認**
   - SUPABASE_URLとSUPABASE_ANON_KEYが正しく設定されているか確認
   - Supabaseプロジェクトが有効か確認

2. **管理者ユーザー確認**
   - Supabase Auth > Usersで管理者ユーザーが作成されているか確認
   - メールアドレスが確認済み（email_confirm: true）になっているか確認

3. **RLSポリシー確認**
   - Supabase Database > Policiesで各テーブルのポリシーが設定されているか確認
   - ポリシーが有効になっているか確認

### RLSポリシーエラーが発生する場合

```
new row violates row-level security policy
```

このエラーが発生する場合：

1. RLSポリシーが正しく設定されているか確認
2. 管理者ユーザーでログインしているか確認
3. 必要に応じて一時的にRLSを無効化（開発環境のみ）：

```sql
-- 一時的な無効化（開発環境のみ）
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_status DISABLE ROW LEVEL SECURITY;
```

## セキュリティ考慮事項

### 本番環境での設定

1. **パスワード変更**
   - デフォルトパスワードを強力なものに変更
   - 定期的なパスワード更新

2. **RLSポリシー強化**
   - より細かい権限制御の実装
   - ユーザーロールベースのアクセス制御

3. **環境変数管理**
   - Service Role Keyの安全な管理
   - 環境別設定の分離

## アーキテクチャ

### 統合認証サービス

- **AdminAuthService**: Supabase Auth統合認証サービス
- **config.js**: 認証設定の一元管理
- **EventBus**: 認証状態変更の通知

### 認証フロー

1. 管理画面アクセス
2. AdminAuthService初期化
3. セッション確認
4. 必要に応じて自動認証
5. RLSポリシー適用
6. 管理画面表示

## サポート

問題が発生した場合は、以下を確認してください：

1. ブラウザのコンソールログ
2. Supabaseダッシュボードのログ
3. 認証状態の確認（AdminAuthService.getAuthInfo()）

---

**🚀 統合認証システムにより、セキュアで保守性の高い管理画面を実現しています。** 