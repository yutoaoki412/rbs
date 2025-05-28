# RBS陸上教室 ヘッダー・フッター リファクタリングガイド

## 概要

このリファクタリングにより、LPのヘッダーとフッターを他のページ（news、news-detail等）でも再利用できるようになり、新しいページの作成も簡単になりました。

## 主な改善点

### 1. コンポーネント化
- ヘッダーとフッターをHTMLテンプレートとして分離
- 動的読み込みシステムの実装
- 再利用可能なコンポーネント設計

### 2. 統一された初期化システム
- `PageInitializer`クラスによる統一管理
- ページタイプ別の自動初期化
- メタデータとOGPの動的設定

### 3. 設定ベースの管理
- `page-configs.js`による集中管理
- ページ固有の設定を簡単に追加可能
- 保守性の向上

## ファイル構成

```
src/public/
├── components/
│   ├── templates/
│   │   ├── header.html          # 共通ヘッダーテンプレート
│   │   ├── footer.html          # 共通フッターテンプレート
│   │   └── page-template.html   # 新規ページ用ベーステンプレート
│   ├── TemplateLoader.js        # テンプレート読み込み管理
│   ├── PageInitializer.js       # ページ初期化統一管理
│   ├── CommonHeader.js          # ヘッダー機能（改良版）
│   └── CommonFooter.js          # フッター機能（改良版）
├── js/
│   └── page-configs.js          # ページ設定定義
├── utils/
│   └── PageGenerator.js         # 新規ページ生成ツール
└── pages/
    ├── news-refactored.html     # リファクタリング済みnews
    └── news-detail-refactored.html # リファクタリング済みnews-detail
```

## 使用方法

### 既存ページのリファクタリング

1. **HTMLからヘッダー・フッターを削除**
```html
<!-- 削除: ヘッダーHTML -->
<!-- 削除: フッターHTML -->
```

2. **コンポーネントシステムを読み込み**
```html
<script src="../components/TemplateLoader.js"></script>
<script src="../components/CommonHeader.js"></script>
<script src="../components/CommonFooter.js"></script>
<script src="../components/PageInitializer.js"></script>
<script src="../js/page-configs.js"></script>
```

3. **ページ設定を追加**
```javascript
// page-configs.jsに追加
'your-page': {
  pageType: 'your-page',
  currentPage: 'your-page',
  metadata: {
    title: 'ページタイトル',
    description: 'ページ説明',
    keywords: 'キーワード'
  },
  customCSS: ['../styles/your-page.css'],
  customJS: ['../js/your-page.js']
}
```

### 新しいページの作成

#### 方法1: PageGeneratorを使用（推奨）

```javascript
const generator = new PageGenerator();

// プリセットページを作成
const contactPage = await generator.createPresetPage('contact');

// カスタムページを作成
const customPage = await generator.createPageFiles({
  pageType: 'my-page',
  pageTitle: 'マイページ',
  pageDescription: 'マイページの説明',
  keywords: 'マイページ, キーワード',
  customCSS: ['../styles/my-page.css'],
  content: '<section><h2>コンテンツ</h2></section>'
});
```

#### 方法2: テンプレートを手動コピー

1. `page-template.html`をコピー
2. プレースホルダーを置換
3. `page-configs.js`に設定を追加

## 新機能

### 1. 自動初期化
- ページ読み込み時に自動でヘッダー・フッターを挿入
- メタデータの自動設定
- ページ固有の初期化処理

### 2. 動的ナビゲーション
- 現在のページを自動ハイライト
- スクロール時のヘッダー表示制御
- モバイルメニューの統一管理

### 3. 構造化データ対応
- SEO最適化のための構造化データ自動挿入
- ページタイプ別の適切な設定

### 4. パフォーマンス最適化
- テンプレートキャッシュ機能
- 非同期読み込み
- 必要なリソースのみ動的読み込み

## 利用可能なプリセットページ

- `contact`: お問い合わせページ
- `about-coach`: コーチ紹介ページ
- `trial-lesson`: 無料体験レッスンページ
- `gallery`: ギャラリーページ

## カスタマイズ方法

### ヘッダーのカスタマイズ
`components/templates/header.html`を編集

### フッターのカスタマイズ
`components/templates/footer.html`を編集

### 新しいプリセットの追加
`utils/PageGenerator.js`の`getPresetPageTypes()`に追加

## 移行手順

### 1. 既存ページの移行

1. **バックアップ作成**
```bash
cp news.html news-backup.html
cp news-detail.html news-detail-backup.html
```

2. **リファクタリング版に置き換え**
```bash
cp news-refactored.html news.html
cp news-detail-refactored.html news-detail.html
```

3. **動作確認**
- ヘッダー・フッターの表示確認
- ナビゲーションの動作確認
- レスポンシブ対応の確認

### 2. 新規ページの作成例

```javascript
// お問い合わせページを作成
const generator = new PageGenerator();
const contactPage = await generator.createPresetPage('contact');

// HTMLファイルとして保存
// contactPage.html に contactPage.html の内容を保存
// page-configs.js に contactPage.config を追加
```

## トラブルシューティング

### よくある問題

1. **ヘッダー・フッターが表示されない**
   - ネットワークエラーでテンプレートが読み込めない
   - JavaScriptエラーで初期化が失敗している

2. **スタイルが適用されない**
   - CSSファイルのパスが間違っている
   - 読み込み順序の問題

3. **ナビゲーションが動作しない**
   - CommonHeaderの初期化が失敗している
   - イベントリスナーの重複登録

### デバッグ方法

```javascript
// 初期化状態の確認
console.log('PageInitializer:', window.PageInitializer);
console.log('TemplateLoader:', window.TemplateLoader);

// テンプレート読み込み状況の確認
const loader = new TemplateLoader();
loader.loadTemplate('header').then(html => console.log('Header loaded:', !!html));
```

## パフォーマンス考慮事項

- テンプレートはキャッシュされるため、2回目以降の読み込みは高速
- 必要なCSSとJSのみ動的読み込み
- 非同期処理によりページ表示をブロックしない

## 今後の拡張予定

- 多言語対応
- テーマ切り替え機能
- A/Bテスト対応
- アクセシビリティ向上

## サポート

質問や問題がある場合は、開発チームまでお問い合わせください。 