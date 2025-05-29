# RBS陸上教室 管理画面 完全ガイド v3.0

## 📋 目次
1. [概要](#概要)
2. [アクセス方法](#アクセス方法)
3. [システム構成](#システム構成)
4. [機能詳細](#機能詳細)
5. [@pages機能](#pages機能)
6. [開発者向け情報](#開発者向け情報)
7. [トラブルシューティング](#トラブルシューティング)
8. [更新履歴](#更新履歴)

## 概要

RBS陸上教室管理画面v3.0は、ActionHandler統合により完全に刷新された管理システムです。

### 🎯 主要機能
- **ダッシュボード**: システム統計と概要表示
- **記事管理**: ニュース記事の作成・編集・管理
- **ページ管理**: @pages機能による動的ページ生成 **⭐ 新機能**
- **レッスン状況**: 開催状況の管理・通知
- **設定**: システム設定とデータ管理

### 🔧 技術特徴
- **ActionHandler統合**: 統一されたイベント処理
- **TypeScript対応**: 型安全性の向上
- **モジュラー設計**: 保守性の高いアーキテクチャ
- **リアクティブUI**: スムーズなユーザー体験

## アクセス方法

### 基本アクセス
```
https://yourdomain.com/admin.html
```

### 認証
- **ログイン画面**: `admin-login.html`
- **デフォルトパスワード**: `rbs2024admin`
- **セッション時間**: 8時間（自動延長あり）

### セキュリティ機能
- ログイン試行制限（5回で15分ロック）
- セッション管理とタイムアウト
- 検索エンジンインデックス防止

## システム構成

### アーキテクチャ概要
```
RBS陸上教室管理画面 v3.0
├── Application.js ────────── アプリケーションコア
├── ActionHandler.js ──────── 統一イベント処理
├── PagesManager.js ───────── ページ管理エンジン
├── Admin Module ──────────── 管理画面固有機能
└── Common Components ─────── 共通コンポーネント
```

### 主要コンポーネント

#### 1. ActionHandler（統一イベント処理）
```javascript
// data-action属性による統一イベント処理
<button data-action="switch-tab" data-tab="dashboard">
  ダッシュボード
</button>
```

#### 2. PagesManager（ページ管理）
```javascript
// 動的ページ生成
await window.pagesManager.createPage({
  id: 'new-page',
  title: '新しいページ',
  type: 'custom',
  content: '<h1>ページコンテンツ</h1>'
});
```

## 機能詳細

### 📊 ダッシュボード

#### 表示項目
- **統計カード**: 総記事数、公開済み、下書き、今月の記事
- **最近の記事**: 最新記事の一覧
- **クイックアクション**: 主要機能への素早いアクセス

#### 操作方法
1. 管理画面にログイン
2. 自動的にダッシュボードが表示
3. 統計情報とクイックアクションを確認

### 📝 記事管理

#### 基本機能
- **記事作成**: リッチエディターによる記事作成
- **記事編集**: 既存記事の修正
- **記事削除**: 不要記事の削除
- **プレビュー**: 公開前の表示確認
- **カテゴリー管理**: お知らせ、体験会、メディア、重要

#### 使用方法

##### 新規記事作成
1. 「記事管理」タブを選択
2. 記事情報を入力：
   ```
   タイトル*: 記事のタイトル
   カテゴリー: お知らせ/体験会/メディア/重要
   公開日: 記事の公開日
   ステータス: 下書き/公開
   概要: 一覧ページで表示される概要
   本文*: Markdown形式で記事本文
   ```
3. アクションボタン：
   - **クリア**: エディターをクリア
   - **プレビュー**: モーダルでプレビュー表示
   - **保存**: 下書きとして保存
   - **公開**: 記事を公開

##### Markdownエディター
```markdown
## 見出し2
### 見出し3
**太字テキスト**
- リスト項目1
- リスト項目2
[リンクテキスト](URL)
```

#### ツールバー機能
- **太字**: `**テキスト**`
- **見出し**: `## 見出し`
- **リスト**: `- 項目`
- **リンク**: `[テキスト](URL)`

### 📄 ページ管理 ⭐ **新機能**

#### @pages機能概要
動的ページ生成システムにより、統一されたテンプレートで新しいページを作成できます。

#### 機能特徴
- **統一テンプレート**: 一貫したデザインとレイアウト
- **SEO最適化**: 自動メタデータ設定
- **レスポンシブ**: モバイル対応デザイン
- **カスタム対応**: CSS/JS追加可能

#### 使用方法

##### 新規ページ作成
1. 「ページ管理」タブを選択
2. ページ情報を入力：
   ```
   ページタイトル*: ページのタイトル
   ページタイプ: custom/news-detail/contact/about
   ページ説明: SEO用説明文
   キーワード: SEO用キーワード（カンマ区切り）
   ページコンテンツ*: HTMLコンテンツ
   カスタムCSS: 追加CSS（オプション）
   カスタムJS: 追加JavaScript（オプション）
   ```
3. アクションボタン：
   - **クリア**: エディターをクリア
   - **プレビュー**: モーダルでプレビュー
   - **保存**: ページを保存
   - **ページ作成**: ページを生成

##### ページ一覧管理
- **既存ページ一覧**: システム内の全ページ表示
- **編集**: ページ内容の修正
- **削除**: ページの削除
- **デバッグ情報**: 開発者向け詳細情報

#### テスト機能
```javascript
// @pages機能テスト
window.testPagesFunction()

// サンプルページ作成
window.pagesManager.createSamplePage()

// デバッグ情報表示
window.pagesManager.getDebugInfo()
```

### 📅 レッスン状況管理

#### 機能概要
レッスンの開催状況を管理し、保護者に情報を提供します。

#### 設定項目
- **対象日**: レッスン日（デフォルト：今日）
- **全体状況**: 通常開催/中止/室内開催/延期
- **コース別設定**:
  - ベーシックコース（年長〜小3）
  - アドバンスコース（小4〜小6）
- **補足メッセージ**: 追加情報

#### 操作手順
1. 「レッスン状況」タブを選択
2. 対象日を設定
3. 全体状況を選択
4. 各コースの詳細を設定
5. 必要に応じてメッセージを入力
6. 「保存して公開」をクリック

#### プレビュー機能
「プレビュー」ボタンでメインサイトでの表示を事前確認できます。

### ⚙️ 設定

#### データ管理
- **データエクスポート**: システムデータの書き出し
- **全データクリア**: システムリセット（要確認）

#### サイト連携
- **連携テスト**: フロントエンドとの接続確認
- **ニュースページ確認**: 新しいタブで確認

#### デバッグ機能
- **デバッグ情報表示**: システム状態の確認
- **LocalStorageリセット**: ブラウザデータのクリア

## @pages機能

### 概要
@pages機能は、RBS陸上教室システムの動的ページ生成機能です。統一されたテンプレートを使用して、SEOに最適化されたページを簡単に作成できます。

### アーキテクチャ

#### PageGenerator
```javascript
// ページ生成の基本的な使用方法
const generator = new PageGenerator();
const page = await generator.createPage('custom', {
  pageTitle: 'カスタムページ',
  pageDescription: 'ページの説明',
  pageKeywords: 'キーワード1, キーワード2',
  content: '<div>ページコンテンツ</div>'
});
```

#### PagesManager
```javascript
// 高レベルなページ管理
const pageInfo = await window.pagesManager.createPage({
  id: 'new-page',
  title: '新しいページ',
  description: 'ページの説明',
  type: 'custom',
  content: '<h1>ページコンテンツ</h1>'
});
```

### テンプレート構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>{{PAGE_TITLE}} | RBS陸上教室</title>
  <meta name="description" content="{{PAGE_DESCRIPTION}}">
  <meta name="keywords" content="{{PAGE_KEYWORDS}}">
  <!-- OGPメタデータ自動設定 -->
</head>
<body class="page-{{PAGE_TYPE}}">
  <!-- 統一ヘッダー -->
  <main id="main-content">
    <!-- 動的コンテンツ -->
  </main>
  <!-- 統一フッター -->
</body>
</html>
```

### 利用可能なページタイプ
- **custom**: カスタムページ
- **news-detail**: ニュース詳細ページ
- **contact**: お問い合わせページ
- **about**: 会社情報ページ

### API参考

#### 基本操作
```javascript
// ページ作成
const page = await window.pagesManager.createPage(config);

// ページ取得
const page = window.pagesManager.getPage('page-id');

// 全ページ取得
const pages = window.pagesManager.getAllPages();

// ページ削除
window.pagesManager.deletePage('page-id');

// ページ更新
await window.pagesManager.updatePage('page-id', updates);
```

## 開発者向け情報

### システム要件
- **ブラウザ**: ES6+対応の現代的ブラウザ
- **JavaScript**: ES6 Modules
- **ストレージ**: LocalStorage（5MB以上推奨）

### 開発環境
```bash
# ローカル開発サーバー
python -m http.server 8000
# または
npx http-server
```

### ActionHandler拡張
```javascript
// カスタムアクションの追加
window.actionHandler.register('custom-action', (element, params, event) => {
  console.log('カスタムアクション実行', params);
});

// 複数アクションの一括登録
window.actionHandler.registerMultiple({
  'action1': handler1,
  'action2': handler2
});
```

### デバッグ機能
```javascript
// システム状態確認
console.log(window.RBS.debug());

// ActionHandler状態
console.log(window.actionHandler.isInitialized);

// PagesManager状態
console.log(window.pagesManager.getDebugInfo());
```

### ログ確認
ブラウザの開発者ツール（F12）のコンソールタブで詳細なログを確認できます：

```
🚀 RBS陸上教室システム v3.0 起動中...
📦 モジュール読み込み中: ActionHandler
🔧 ActionHandler初期化開始
✅ ActionHandler初期化完了
✅ RBS陸上教室システム v3.0 起動完了
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. タブが切り替わらない
**症状**: サイドバーのタブをクリックしても画面が切り替わらない

**解決方法**:
```javascript
// コンソールで確認
console.log(window.actionHandler?.isInitialized);

// 手動でタブ切り替え
window.actionHandler.switchAdminTab('dashboard');
```

#### 2. ボタンが動作しない
**症状**: 各種ボタンをクリックしても何も起こらない

**解決方法**:
1. コンソールでエラーを確認
2. ActionHandlerの状態確認
3. ページリロード

#### 3. @pages機能が動作しない
**症状**: ページ作成ボタンを押してもページが生成されない

**解決方法**:
```javascript
// PagesManagerの状態確認
console.log(window.pagesManager);

// テスト実行
await window.testPagesFunction();
```

#### 4. データが保存されない
**症状**: フォームに入力してもデータが保存されない

**解決方法**:
1. LocalStorageの容量確認
2. ブラウザの設定確認
3. プライベートブラウズモードでないか確認

### エラーレポート
問題が発生した場合、以下の情報を含めてご報告ください：

```javascript
// デバッグ情報
{
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href,
  actionHandler: window.actionHandler?.isInitialized,
  pagesManager: !!window.pagesManager,
  localStorage: Object.keys(localStorage),
  console: '最新のコンソールエラー'
}
```

### パフォーマンス最適化

#### 推奨設定
- **キャッシュ**: ブラウザキャッシュを有効化
- **圧縮**: gzip圧縮の適用
- **CDN**: 静的ファイルのCDN配信

#### モニタリング
```javascript
// パフォーマンス情報
console.log(window.RBS.app.getInfo());
```

## 更新履歴

### v3.0 (最新) - 2024年12月
**🎯 大規模リファクタリング完了**

#### ✅ 主要な改善
- **ActionHandler統合**: 統一されたイベント処理システム
- **@pages機能**: 動的ページ生成機能の実装
- **管理画面修復**: タブ切り替えとボタン操作の完全修復
- **型安全性向上**: TypeScript型定義の完全対応
- **アーキテクチャ改善**: モジュラー設計への移行

#### 🆕 新機能
- **ページ管理**: 5番目のタブとして追加
- **統一テンプレート**: SEO最適化されたページテンプレート
- **デバッグツール**: 開発者向けデバッグ機能
- **エラーハンドリング**: 改善されたエラー処理

#### 🔧 技術的改善
- **重複コード削除**: AdminCoreシステムの統合
- **パフォーマンス向上**: 効率的な初期化処理
- **保守性向上**: より良いコード構造

#### 🐛 修正された問題
- タブ切り替え機能の不動作
- ボタンクリック時の応答不良
- PagesManagerの未統合
- 型定義の不整合
- 重複したフォールバック処理

### v2.x - 以前のバージョン
- 基本的な管理画面機能
- AdminCoreシステム
- 記事管理機能
- レッスン状況管理

---

## 📞 サポート

### 技術サポート
- **開発チーム**: システム技術的な問題
- **運用サポート**: 日常的な操作に関する質問

### コミュニティ
- **GitHub**: バグレポートと機能要望
- **ドキュメント**: 最新の技術情報

---

*このガイドは RBS陸上教室管理画面 v3.0 に対応しています。*
*最終更新: 2024年12月* 