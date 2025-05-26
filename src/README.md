# RBS陸上教室 ウェブサイト

年長〜小6向け陸上教室のウェブサイトです。走力だけでなく集中力・判断力・挑戦心も育てる独自プログラムを提供しています。

## プロジェクト構造

```
src/
├── index.html              # メインページ
├── news.html              # ニュース一覧ページ
├── news-detail.html       # ニュース詳細ページ
├── status-updater.js      # レッスン状況更新システム
├── styles/                # スタイルシート
│   ├── base.css          # 基本スタイル・変数定義
│   ├── common.css        # 全ページ共通スタイル
│   ├── components.css    # コンポーネントスタイル
│   ├── layout.css        # レイアウトスタイル
│   └── responsive.css    # レスポンシブ対応
├── js/                   # JavaScript
│   ├── config.js         # アプリケーション設定
│   ├── main.js           # メインアプリケーション
│   ├── markdown-parser.js # Markdown解析・記事管理
│   └── PageManager.js    # ページ管理システム
├── components/           # 再利用可能コンポーネント
│   ├── CommonHeader.js   # 共通ヘッダー
│   ├── CommonFooter.js   # 共通フッター
│   ├── Header.js         # ヘッダーコンポーネント
│   ├── Modal.js          # モーダルコンポーネント
│   ├── Navigation.js     # ナビゲーション
│   ├── NewsCard.js       # ニュースカード
│   └── StatusBanner.js   # ステータスバナー
├── utils/                # ユーティリティ
│   └── helpers.js        # ヘルパー関数
├── services/             # サービス層
├── images/               # 画像ファイル
└── articles/             # 記事データ
```

## 主要機能

### 1. ページ管理システム (PageManager)
- 全ページの共通機能を統一管理
- ページ固有の初期化処理
- メタデータの動的設定
- 共通イベントリスナーの管理

### 2. 共通コンポーネント
- **CommonHeader**: 全ページ共通のヘッダー
- **CommonFooter**: 全ページ共通のフッター
- **NewsCard**: ニュース記事カード
- **StatusBanner**: レッスン状況バナー

### 3. 記事管理システム (ArticleManager)
- Markdown記事の解析・表示
- カテゴリー別フィルタリング
- 記事データの検証
- LocalStorage連携

### 4. 設定管理 (RBSConfig)
- アプリケーション全体の設定を一元管理
- UI設定、ニュース設定、レッスン設定
- ブレークポイント、デバッグ設定

## ファイル構成の特徴

### CSS設計
- **base.css**: CSS変数、リセット、基本スタイル
- **common.css**: 全ページ共通のスタイル
- **components.css**: 再利用可能なコンポーネント
- **layout.css**: ページレイアウト
- **responsive.css**: レスポンシブ対応

### JavaScript設計
- **モジュラー設計**: 機能ごとにファイルを分離
- **クラスベース**: ES6クラスを活用した構造化
- **設定の一元管理**: config.jsで全設定を管理
- **後方互換性**: 既存のグローバル関数を維持

## 使用方法

### 新しいページの追加

1. HTMLファイルを作成
2. 必要なCSSファイルを読み込み
3. PageManagerを初期化

```html
<!-- CSS -->
<link rel="stylesheet" href="styles/base.css">
<link rel="stylesheet" href="styles/common.css">
<link rel="stylesheet" href="styles/components.css">
<link rel="stylesheet" href="styles/layout.css">
<link rel="stylesheet" href="styles/responsive.css">

<!-- JavaScript -->
<script src="js/config.js"></script>
<script src="utils/helpers.js"></script>
<script src="components/CommonHeader.js"></script>
<script src="components/CommonFooter.js"></script>
<script src="js/PageManager.js"></script>

<script>
  const pageManager = new PageManager('new-page');
  pageManager.init();
</script>
```

### 新しいコンポーネントの作成

```javascript
class NewComponent {
  constructor() {
    this.config = {
      // 設定
    };
  }

  generateHTML() {
    // HTML生成
  }

  insertIntoPage() {
    // ページに挿入
  }
}

window.NewComponent = NewComponent;
```

## 開発ガイドライン

### CSS
- CSS変数を活用してデザインシステムを統一
- BEMに近い命名規則を使用
- レスポンシブファーストで設計

### JavaScript
- ES6+の機能を積極的に活用
- エラーハンドリングを適切に実装
- デバッグ情報を適切に出力

### ファイル命名
- PascalCase: クラスファイル (PageManager.js)
- camelCase: 機能ファイル (markdown-parser.js)
- kebab-case: HTMLファイル (news-detail.html)

## 今後の拡張予定

1. **多言語対応**: i18n機能の追加
2. **PWA対応**: Service Workerの実装
3. **パフォーマンス最適化**: 遅延読み込み、画像最適化
4. **アクセシビリティ向上**: ARIA属性、キーボード操作対応
5. **テスト環境**: Jest、Cypressの導入

## ブラウザサポート

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## ライセンス

© 2024 合同会社VITA. All rights reserved. 