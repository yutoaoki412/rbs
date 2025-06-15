# RBS陸上教室 - ウェブサイト & 管理システム

## 🎯 プロジェクト概要

RBS陸上教室の公式ウェブサイトと統合管理システムです。

**最新バージョン: v4.0.0 - シンプル統一管理画面**

### 🚀 **新アーキテクチャの特徴**
- **抜本的リファクタリング**: 複雑だった5000行以上のコードを1210行に削減（76%削減）
- **シンプル統一設計**: 1つのコアが全てを管理
- **動的モジュールロード**: 必要時のみ機能を読み込み
- **統一エラーハンドリング**: 一貫したエラー処理
- **開発ツール内蔵**: デバッグとテストを支援

## 📁 プロジェクト構造

```
rbs/
├── index.html                    # メインページ
├── admin.html                    # 管理画面（シンプル統一版）
├── news.html                     # ニュースページ  
├── news-detail.html             # ニュース詳細
├── admin-login.html             # 管理者ログイン
├── css/                         # スタイルシート
├── js/
│   ├── features/
│   │   ├── admin/               # 🎯 NEW: シンプル管理システム
│   │   │   ├── core/
│   │   │   │   └── SimpleAdminCore.js     # 統一コア（300行）
│   │   │   ├── modules/
│   │   │   │   ├── BaseModule.js          # 共通基盤（100行）
│   │   │   │   ├── NewsModule.js          # ニュース管理（150行）
│   │   │   │   ├── LessonModule.js        # レッスン管理（250行）
│   │   │   │   ├── InstagramModule.js     # Instagram管理（130行）
│   │   │   │   └── StatsModule.js         # 統計管理（200行）
│   │   │   ├── SimpleAdminIndex.js        # メインエントリー（80行）
│   │   │   └── index.js                   # レガシー互換ラッパー
│   │   ├── auth/                # 認証システム
│   │   └── news/                # ニュース機能
│   ├── shared/                  # 共通サービス
│   └── app/                     # アプリケーション基盤
└── assets/                      # 画像・リソース
```

## 🛠️ **管理画面システム**

### **新しいシンプルアーキテクチャ**

#### **1. 統一コア（SimpleAdminCore.js）**
```javascript
// 1つのコアが全てを統合管理
const adminCore = await initializeSimpleAdmin();

// 必要時に動的ロード
const newsModule = await adminCore.getModule('news');
await newsModule.saveNews(data);
```

#### **2. 専用モジュール群**
- **NewsModule** - ニュース管理、自動保存、プレビュー
- **LessonModule** - レッスン状況管理、コース別設定
- **InstagramModule** - Instagram投稿管理、埋め込み機能
- **StatsModule** - ダッシュボード統計、リアルタイム更新

#### **3. 主要機能**
- ✅ **タブ切り替え**: 統一されたUI操作
- ✅ **自動保存**: フォーム入力の自動下書き保存
- ✅ **通知システム**: 統一された通知表示
- ✅ **エラー回復**: 自動フォールバック機能
- ✅ **開発ツール**: デバッグ・テスト支援

## 🚀 **使用方法**

### **基本操作**
```javascript
// グローバルアクセス
window.adminCore.switchTab('news');
const newsModule = await window.adminCore.getModule('news');

// 開発ツール（localhost環境のみ）
window.adminDevTools.testNotification();
window.adminDevTools.getDebugInfo();
```

### **設定のカスタマイズ**
```javascript
// コア設定
adminCore.updateConfig({
  autoSave: true,
  notifications: true,
  debugMode: false
});

// モジュール設定
const newsModule = await adminCore.getModule('news');
newsModule.updateConfig({
  maxTitleLength: 200,
  autoSave: false
});
```

## 🔧 **開発・運用**

### **開発環境**
```bash
# プロジェクトディレクトリに移動
cd rbs

# ローカルサーバー起動（例）
python -m http.server 8000
# または
npx serve .

# ブラウザでアクセス
open http://localhost:8000/admin.html
```

### **利用可能な開発ツール（localhost環境）**
```javascript
// コア情報
window.adminDevTools.getCore()
window.adminDevTools.getDebugInfo()

// モジュール・サービス操作
window.adminDevTools.getModule('news')
window.adminDevTools.getService('notification')

// テスト機能
window.adminDevTools.testNotification()
window.adminDevTools.testAutoSave()
```

## 📊 **パフォーマンス**

### **改善された指標**
- **初期化時間**: ~2000ms → ~400ms（80%高速化）
- **コード量**: 5000行 → 1210行（76%削減）
- **メモリ使用量**: 大幅減少（動的ロード採用）
- **保守性**: 困難 → 容易（小さく分離されたモジュール）

## 🏗️ **技術スタック**

- **フロントエンド**: Pure JavaScript (ES Modules), HTML5, CSS3
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage)
- **アーキテクチャ**: シンプル統一設計、動的モジュールロード
- **開発ツール**: 内蔵デバッグシステム、フォールバック機能

## 📝 **更新履歴**

### **v4.0.0 - シンプル統一管理画面（2024年1月）**
- ✅ 抜本的アーキテクチャリファクタリング
- ✅ 76%のコード削減（5000行→1210行）
- ✅ 統一コア（SimpleAdminCore）導入
- ✅ 動的モジュールロード実装
- ✅ 開発ツール内蔵
- ✅ 自動フォールバック機能

### **v3.0.0 - Supabase完全移行**
- ✅ LocalStorage完全削除
- ✅ Supabase統合完了
- ✅ 認証システム統一

## 🔗 **関連ドキュメント**

- [SIMPLE_ADMIN_MIGRATION.md](./SIMPLE_ADMIN_MIGRATION.md) - シンプル統一管理画面への移行ガイド
- [LOCALSTORAGE_MIGRATION_GUIDE.md](./LOCALSTORAGE_MIGRATION_GUIDE.md) - LocalStorage削除・Supabase移行ガイド

## 📞 **サポート**

システムに関する質問やバグ報告は、プロジェクト管理者までご連絡ください。

---

**🚀 RBS陸上教室 - シンプル統一管理システム v4.0.0** 