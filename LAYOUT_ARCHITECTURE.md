# RBS陸上教室 - レイアウトアーキテクチャ v2.0

## 概要

RBS陸上教室の新しいレイアウトアーキテクチャは、動的なテンプレート管理システムを採用し、ヘッダーとフッターの統一的な管理を実現します。

## 主な特徴

### 🎨 動的テンプレート管理
- **TemplateManager**: HTMLテンプレートの読み込み・キャッシュ・変数置換
- **条件分岐**: Handlebars風の`{{#condition}}`構文をサポート
- **ページ別設定**: メタテンプレートによる柔軟な設定管理

### 🧩 コンポーネント化
- **HeaderComponent**: ナビゲーション、モバイルメニュー、スクロール制御
- **FooterComponent**: フッター機能、ページトップスクロール
- **LayoutInitializer**: 統合初期化管理

### 📱 レスポンシブ対応
- モバイルメニューの自動制御
- ビューポート別の動作調整
- アクセシビリティ対応

## ファイル構造

```
src/public/js/shared/
├── components/layout/
│   ├── index.js              # 統合エクスポート
│   ├── TemplateManager.js    # テンプレート管理
│   ├── HeaderComponent.js    # ヘッダーコンポーネント
│   └── FooterComponent.js    # フッターコンポーネント
└── templates/
    ├── header.html           # ヘッダーテンプレート
    ├── footer.html           # フッターテンプレート
    └── meta-template.html    # ページ別設定
```

## 使用方法

### 1. HTMLページの設定

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ページタイトル</title>
  <!-- CSS読み込み -->
</head>
<body>
  <!-- ヘッダーコンテナ -->
  <div id="header-container"></div>
  
  <!-- メインコンテンツ -->
  <main id="main-content">
    <!-- ページ固有のコンテンツ -->
  </main>
  
  <!-- フッターコンテナ -->
  <div id="footer-container"></div>
  
  <!-- JavaScript -->
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

### 2. 自動初期化

アプリケーションは自動的にページタイプを検出し、適切なテンプレートを読み込みます：

```javascript
// main.js で自動実行
import { app } from './core/Application.js';
await app.init(); // レイアウトも自動初期化
```

### 3. 手動初期化（カスタム設定）

```javascript
import { initializeLayout } from './js/shared/components/layout/index.js';

const layoutResult = await initializeLayout({
  pageType: 'news',
  headerContainerId: 'custom-header',
  footerContainerId: 'custom-footer',
  templateOptions: {
    showBreadcrumb: true,
    enableSocialShare: true
  }
});
```

## テンプレート変数

### 基本変数
- `{{logoLink}}`: ロゴのリンク先
- `{{newsLink}}`: ニュースページのリンク
- `{{currentYear}}`: 現在の年
- `{{siteName}}`: サイト名
- `{{companyName}}`: 会社名

### 条件分岐
```html
{{#isHomePage}}
  <li><a href="#about">RBSとは</a></li>
{{/isHomePage}}

{{#isNotHomePage}}
  <li><a href="../pages/index.html">ホーム</a></li>
{{/isNotHomePage}}
```

### ページタイプ別変数
- `isHomePage`: ホームページかどうか
- `isNotHomePage`: ホームページ以外かどうか
- `isNewsPage`: ニュースページかどうか
- `isAdminPage`: 管理画面かどうか

## ページタイプ

システムは以下のページタイプを自動検出します：

| ページタイプ | 検出条件 | 説明 |
|------------|----------|------|
| `home` | `index.html` または `/` | ホームページ |
| `news` | `news.html` | ニュース一覧 |
| `news-detail` | `news-detail.html` | ニュース詳細 |
| `admin` | `admin.html` | 管理画面 |
| `default` | その他 | デフォルト |

## イベント

### アプリケーションイベント
```javascript
// アプリケーション初期化完了
window.addEventListener('app:initialized', (event) => {
  console.log('ページ:', event.detail.page);
});

// テンプレート読み込み完了
window.addEventListener('app:templates:loaded', (event) => {
  const { templateManager, headerComponent, footerComponent } = event.detail;
});
```

### ヘッダーイベント
```javascript
// ナビゲーションクリック
EventBus.on('header:nav:click', (data) => {
  console.log('リンク:', data.href, 'テキスト:', data.text);
});

// モバイルメニュートグル
EventBus.on('header:mobile:toggle', (data) => {
  console.log('メニュー状態:', data.isOpen);
});

// スクロール状態変更
EventBus.on('header:scroll', (data) => {
  console.log('スクロール位置:', data.scrollY, '固定状態:', data.isFixed);
});
```

## カスタマイズ

### 新しいページタイプの追加

1. **メタテンプレートに設定を追加**:
```html
<!-- meta-template.html -->
<div id="meta-custom-page">
  <meta name="page-title" content="カスタムページ">
  <meta name="body-class" content="page-custom">
  <!-- その他の設定 -->
</div>
```

2. **ページタイプ検出ロジックを更新**:
```javascript
// TemplateManager.js の getPageTypeFromUrl() を修正
getPageTypeFromUrl() {
  const path = window.location.pathname;
  
  if (path.includes('custom-page')) return 'custom-page';
  // 既存の条件...
  
  return 'default';
}
```

### テンプレートのカスタマイズ

```html
<!-- header.html -->
<header class="header" data-template="header">
  <!-- カスタムヘッダー内容 -->
  {{#isCustomPage}}
    <div class="custom-banner">カスタムバナー</div>
  {{/isCustomPage}}
</header>
```

## トラブルシューティング

### よくある問題

1. **テンプレートが読み込まれない**
   - ネットワークタブでHTTPエラーを確認
   - テンプレートファイルのパスを確認
   - HttpServiceの初期化状態を確認

2. **変数が置換されない**
   - 変数名のスペルを確認
   - 条件分岐の構文を確認
   - ページタイプの検出結果を確認

3. **モバイルメニューが動作しない**
   - CSSクラスの設定を確認
   - イベントリスナーの設定を確認
   - DOM要素の存在を確認

### デバッグ方法

```javascript
// デバッグ情報の表示
console.log('アプリケーション:', window.RBSApp);
console.log('レイアウト初期化:', window.RBSApp.services.get('layout'));

// テンプレート管理の状態確認
const templateManager = window.RBSApp.services.get('layout').templateManager;
console.log('テンプレートキャッシュ:', templateManager.templateCache);
console.log('ページ設定:', templateManager.currentPageConfig);
```

## テスト

テスト用ページ `test-layout.html` を使用して動作確認ができます：

```bash
# 開発サーバー起動
cd src/public
python3 -m http.server 8080

# ブラウザでアクセス
open http://localhost:8080/test-layout.html
```

## パフォーマンス

- **テンプレートキャッシュ**: 一度読み込んだテンプレートはメモリにキャッシュ
- **遅延読み込み**: 必要なテンプレートのみを読み込み
- **イベント最適化**: スロットリングによるスクロールイベント制御

## 今後の拡張予定

- [ ] テンプレートのプリコンパイル
- [ ] より高度な条件分岐構文
- [ ] テンプレートの部分更新
- [ ] SSR（サーバーサイドレンダリング）対応
- [ ] テンプレートのバージョン管理

---

**更新日**: 2025年1月
**バージョン**: 2.0.0