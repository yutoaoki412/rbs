# RBS陸上教室 LP - Supabase移行計画書

## 📋 移行概要

### 目的
LocalStorageベースのデータ管理からSupabaseを使用したクラウドベースのデータ管理に移行し、管理画面で作成したコンテンツが全ての訪問者に表示されるようにする。

### 移行期間
予定期間: 3-4日間

### 責任者
- 開発者: [開発者名]
- 確認者: [確認者名]

---

## 🔍 現状分析

### LocalStorageを使用している主要コンポーネント

#### 1. 記事管理システム
- **ファイル**: `js/shared/services/ArticleStorageService.js`
- **ストレージキー**: `CONFIG.storage.keys.articles` (`rbs_articles`)
- **機能**: 記事の作成、編集、削除、公開/非公開管理

#### 2. Instagram投稿管理
- **ファイル**: `js/features/admin/services/InstagramDataService.js`
- **ストレージキー**: `CONFIG.storage.keys.instagram` (`rbs_instagram`)
- **機能**: Instagram投稿の追加、編集、削除、表示/非表示管理

#### 3. レッスン状況管理
- **ファイル**: `js/shared/services/LessonStatusStorageService.js`
- **ストレージキー**: `CONFIG.storage.keys.lessons` (`rbs_lessons`)
- **機能**: レッスンの開催状況、メッセージ管理

#### 4. 管理画面認証
- **ファイル**: `js/features/auth/AuthManager.js`
- **ストレージキー**: `CONFIG.storage.keys.adminSession`
- **機能**: 管理者ログイン状態管理

#### 5. 管理画面設定
- **ファイル**: `js/features/admin/services/AdminSettingsService.js`
- **ストレージキー**: 各種設定キー
- **機能**: 管理画面の各種設定保存

---

## 🏗️ Supabaseテーブル設計

### テーブル一覧

#### 1. articles (記事テーブル)
```sql
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);
```

#### 2. instagram_posts (Instagram投稿テーブル)
```sql
CREATE TABLE instagram_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  embed_code TEXT NOT NULL,
  caption TEXT,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. lesson_status (レッスン状況テーブル)
```sql
CREATE TABLE lesson_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  basic_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (basic_status IN ('scheduled', 'cancelled', 'indoor', 'postponed')),
  basic_message TEXT DEFAULT '',
  advance_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (advance_status IN ('scheduled', 'cancelled', 'indoor', 'postponed')),
  advance_message TEXT DEFAULT '',
  global_message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. admin_settings (管理画面設定テーブル)
```sql
CREATE TABLE admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📋 移行チェックリスト

### Phase 1: 環境準備
- [ ] **1.1** Supabaseプロジェクト作成
- [ ] **1.2** データベーステーブル作成
- [ ] **1.3** Row Level Security (RLS) 設定
- [ ] **1.4** Supabase JavaScript クライアント追加
- [ ] **1.5** 環境変数設定

### Phase 2: 基盤サービス作成
- [ ] **2.1** SupabaseClient設定ファイル作成
- [ ] **2.2** SupabaseService基底クラス作成
- [ ] **2.3** エラーハンドリング統一
- [ ] **2.4** 接続確認機能実装

### Phase 3: データサービス移行
- [ ] **3.1** ArticleStorageService → ArticleSupabaseService
- [ ] **3.2** InstagramDataService → InstagramSupabaseService  
- [ ] **3.3** LessonStatusStorageService → LessonStatusSupabaseService
- [ ] **3.4** AdminSettingsService → AdminSettingsSupabaseService

### Phase 4: 認証システム移行
- [ ] **4.1** Supabase Auth設定
- [ ] **4.2** AuthManager移行
- [ ] **4.3** 管理画面ログイン機能更新

### Phase 5: フロントエンド更新
- [ ] **5.1** LP側データ取得ロジック更新
- [ ] **5.2** 管理画面データ操作ロジック更新
- [ ] **5.3** リアルタイム更新機能追加

### Phase 6: データ移行とテスト
- [ ] **6.1** 既存LocalStorageデータのエクスポート機能
- [ ] **6.2** Supabaseへのデータインポート機能
- [ ] **6.3** 機能テスト完了
- [ ] **6.4** 統合テスト完了

### Phase 7: 本番切り替え
- [ ] **7.1** 本番環境設定
- [ ] **7.2** LocalStorageフォールバック削除
- [ ] **7.3** 動作確認完了

---

## 🚀 実装進捗

### 進捗記録

#### [日付: 2025-01-17]
- **Status**: Phase 5まで約80%完了
- **Next**: 実際のテスト・動作確認を実施

#### Phase 1: 環境準備
- **1.1 Supabaseプロジェクト作成**: ✅ 完了 (ppmlieqwarnfdlsqqxoc)
- **1.2 データベーステーブル作成**: ✅ 完了 (schema.sql実行済み)
- **1.3 RLS設定**: ✅ 完了 (schema.sqlに含まれる)
- **1.4 JSクライアント追加**: ✅ 完了 (HTML追加済み)
- **1.5 環境変数設定**: ✅ 完了 (APIキー設定済み)

#### Phase 2: 基盤サービス作成
- **2.1 SupabaseClient設定**: ✅ 完了 (supabase.js作成済み)
- **2.2 SupabaseService基底クラス**: ✅ 完了 (SupabaseService.js作成済み)
- **2.3 エラーハンドリング**: ✅ 完了 (基底クラスに含まれる)
- **2.4 接続確認機能**: ✅ 完了 (supabase.jsに含まれる)

#### Phase 3: データサービス移行
- **3.1 ArticleSupabaseService**: ✅ 完了 (ArticleSupabaseService.js作成済み)
- **3.2 InstagramSupabaseService**: ✅ 完了 (InstagramSupabaseService.js作成済み)
- **3.3 LessonStatusSupabaseService**: ✅ 完了 (LessonStatusSupabaseService.js作成済み)
- **3.4 AdminSettingsSupabaseService**: ❌ 未実施

#### Phase 4: 認証システム移行
- **4.1 Supabase Auth設定**: ❌ 未実施
- **4.2 AuthManager移行**: ❌ 未実施
- **4.3 管理画面ログイン更新**: ❌ 未実施

#### Phase 5: フロントエンド更新
- **5.1 LP側更新**: ✅ 完了 (LPNewsController → LPNewsSupabaseService)
- **5.2 管理画面更新**: ✅ 完了 (AdminActionService → AdminNewsSupabaseService)
- **5.3 リアルタイム更新**: ❌ 未実施

#### Phase 6: データ移行とテスト
- **6.1 データエクスポート**: ❌ 未実施
- **6.2 データインポート**: ❌ 未実施
- **6.3 機能テスト**: ❌ 未実施
- **6.4 統合テスト**: ❌ 未実施

#### Phase 7: 本番切り替え
- **7.1 本番環境設定**: ❌ 未実施
- **7.2 フォールバック削除**: ❌ 未実施
- **7.3 最終確認**: ❌ 未実施

---

## ⚠️ 注意事項

### 移行中の考慮事項
1. **データ整合性**: 移行中のデータ損失防止
2. **ダウンタイム最小化**: 段階的移行によるサービス継続
3. **ロールバック計画**: 問題発生時の復旧手順
4. **セキュリティ**: Supabaseの適切な権限設定

### テスト項目
1. **データCRUD操作**: 作成、読み取り、更新、削除
2. **認証機能**: ログイン、ログアウト、セッション管理
3. **リアルタイム同期**: 管理画面更新のLP側反映
4. **エラーハンドリング**: ネットワークエラー、認証エラー等

---

## 📞 緊急時連絡先

### 開発関連
- **Supabaseサポート**: [サポートURL]
- **技術責任者**: [連絡先]

### ビジネス関連  
- **サービス責任者**: [連絡先]
- **顧客対応**: [連絡先]

---

*最終更新: [現在日時]*
*バージョン: 1.0* 