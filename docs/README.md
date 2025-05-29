# RBS陸上教室 システム v3.0

RBS陸上教室（Running & Brain School）の公式Webサイトとコンテンツ管理システムです。

## 🚀 新機能 v3.0

### 🎯 大規模リファクタリング完了
- **ActionHandler統合**: 統一されたイベント処理システム
- **@pages機能**: 動的ページ生成機能 **⭐ 新実装**
- **管理画面刷新**: 完全に機能する管理インターフェース
- **TypeScript対応**: 型安全性の向上

## 📚 ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [管理画面完全ガイド](ADMIN_COMPLETE_GUIDE.md) | 📖 **メインドキュメント** - 管理画面の使用方法と機能解説 |
| [PAGES機能レポート](PAGES_FEATURE_REPORT.md) | @pages機能の実装詳細と使用方法 |
| [TypeScript移行ガイド](TYPESCRIPT_MIGRATION.md) | TypeScript移行の計画と実装詳細 |
| [リファクタリングレポート](REFACTORING_REPORT.md) | v3.0リファクタリングの詳細記録 |

## 🎯 プロジェクト概要

### 📋 主要機能
- **レスポンシブWebサイト**: モバイル対応の美しいUI
- **管理画面システム**: コンテンツ管理とレッスン状況更新
- **動的ページ生成**: @pages機能による柔軟なページ作成
- **ニュース管理**: 記事の作成・編集・公開機能

### 🏗️ アーキテクチャ
```
RBS陸上教室システム v3.0
├── 📁 src/public/
│   ├── 🏠 index.html ──────── メインランディングページ
│   ├── 📰 news.html ───────── ニュース一覧ページ
│   ├── 🔧 admin.html ─────── 管理画面
│   ├── 🔐 admin-login.html ── ログイン画面
│   └── 📁 js/
│       ├── 🧠 app/ ──────── アプリケーションコア
│       ├── 🔗 shared/ ────── 共通サービス・ユーティリティ
│       ├── 🧩 components/ ── UIコンポーネント
│       └── 📦 modules/ ──── 機能別モジュール
└── 📁 docs/ ─────────────── プロジェクトドキュメント
```

## 🚀 クイックスタート

### 1. 開発環境セットアップ
```bash
# リポジトリをクローン
git clone https://github.com/your-org/rbs.git
cd rbs

# ローカル開発サーバーを起動
python -m http.server 8000
# または
npx http-server
```

### 2. サイトアクセス
```
メインサイト: http://localhost:8000/src/public/
管理画面: http://localhost:8000/src/public/admin.html
```

### 3. 管理画面ログイン
- **パスワード**: `rbs2024admin`
- **セッション**: 8時間（自動延長あり）

## 🔧 主要技術

### フロントエンド
- **バニラJavaScript**: ES6+ Modules
- **CSS3**: カスタムプロパティ、Flexbox、Grid
- **HTML5**: セマンティック構造

### システム
- **ActionHandler**: 統一イベント処理
- **PagesManager**: 動的ページ生成
- **LocalStorage**: データ永続化

### 開発ツール
- **TypeScript型定義**: 型安全性向上
- **モジュラー設計**: 保守性向上
- **デバッグツール**: 開発効率向上

## 📖 使用方法

### 👥 一般ユーザー向け
1. メインサイトでRBS陸上教室の情報を閲覧
2. ニュースページで最新情報をチェック
3. お問い合わせフォームで体験レッスンを申込

### 🔧 管理者向け
1. **管理画面にログイン**
2. **ダッシュボード**で全体状況を確認
3. **記事管理**でニュース記事を作成・編集
4. **ページ管理**で新しいページを作成（@pages機能）
5. **レッスン状況**で開催状況を更新
6. **設定**でシステム管理

詳細は [管理画面完全ガイド](ADMIN_COMPLETE_GUIDE.md) を参照してください。

## 🆕 @pages機能（v3.0新実装）

### 概要
管理画面から統一されたテンプレートで新しいページを動的に生成できる機能です。

### 特徴
- **統一デザイン**: 一貫したルック&フィール
- **SEO最適化**: 自動メタデータ設定
- **カスタマイズ可能**: CSS/JavaScript追加対応

### 使用例
```javascript
// 新しいページを作成
await window.pagesManager.createPage({
  id: 'about-coach',
  title: 'コーチ紹介',
  description: 'RBS陸上教室のコーチを紹介します',
  content: '<h1>コーチ紹介</h1><p>...</p>'
});
```

## 🔍 デバッグ・トラブルシューティング

### 開発者ツール
```javascript
// システム状態確認
console.log(window.RBS.debug());

// ActionHandler状態
console.log(window.actionHandler?.isInitialized);

// @pages機能テスト
await window.testPagesFunction();
```

### よくある問題
- **タブが切り替わらない**: ActionHandlerの初期化を確認
- **ボタンが動作しない**: コンソールエラーをチェック
- **ページが生成されない**: PagesManagerの状態を確認

詳細は [管理画面完全ガイド](ADMIN_COMPLETE_GUIDE.md#トラブルシューティング) を参照してください。

## 🔄 アップデート履歴

### v3.0 (2024年12月) - 大規模リファクタリング
- ✅ ActionHandler統合による統一イベント処理
- ✅ @pages機能実装（動的ページ生成）
- ✅ 管理画面の完全修復
- ✅ TypeScript型定義対応
- ✅ モジュラー設計への移行

### v2.x - 以前のバージョン
- 基本的な管理画面機能
- 記事管理システム
- レッスン状況管理

## 📞 サポート

### 技術サポート
- 🐛 **バグレポート**: GitHub Issues
- 💡 **機能要望**: GitHub Discussions
- 📧 **技術相談**: 開発チームまで

### ドキュメント
- 📖 [管理画面完全ガイド](ADMIN_COMPLETE_GUIDE.md) - メイン利用ガイド
- 🔧 [開発者向けドキュメント](ADMIN_COMPLETE_GUIDE.md#開発者向け情報)

## 📄 ライセンス

このプロジェクトは RBS陸上教室の専用システムです。

---

**RBS陸上教室 - Running & Brain School**  
*「走ることで脳を鍛え、心を育てる」*

📧 お問い合わせ: contact@rbs-athletics.com  
🌐 公式サイト: https://rbs-athletics.com

---

*最終更新: 2024年12月 | Version 3.0* 