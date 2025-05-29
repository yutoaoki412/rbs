# @pages機能 技術仕様書

## 📋 技術概要

@pages機能は、RBS陸上教室システムの動的ページ生成機能です。統一されたテンプレートを使用して、SEOに最適化されたページを自動生成します。

## 🏗️ アーキテクチャ

### コンポーネント構成
```
@pages機能アーキテクチャ
├── PageGenerator.js ──────── コアページ生成エンジン
├── PagesManager.js ───────── 高レベル管理インターフェース
├── page-template.html ────── 統一HTMLテンプレート
└── ActionHandler.js ──────── UI操作処理（統合済み）
```

### データフロー
```
1. 管理画面入力 → ActionHandler
2. ActionHandler → PagesManager
3. PagesManager → PageGenerator
4. PageGenerator → HTMLファイル生成
5. 生成完了 → フィードバック表示
```

## 📄 ページテンプレート仕様

### プレースホルダー一覧
```html
{{PAGE_TITLE}}       - ページタイトル
{{PAGE_DESCRIPTION}} - SEO用説明文
{{PAGE_KEYWORDS}}    - SEO用キーワード
{{PAGE_TYPE}}        - ページタイプ（CSS class用）
{{PAGE_CONTENT}}     - メインコンテンツ
{{CUSTOM_CSS}}       - カスタムCSS
{{CUSTOM_JS}}        - カスタムJavaScript
{{CREATION_DATE}}    - 作成日時
{{CANONICAL_URL}}    - 正規URL
```

### SEO最適化機能
```html
<!-- 自動生成されるメタデータ -->
<title>{{PAGE_TITLE}} | RBS陸上教室</title>
<meta name="description" content="{{PAGE_DESCRIPTION}}">
<meta name="keywords" content="{{PAGE_KEYWORDS}}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{{CANONICAL_URL}}">

<!-- OGP対応 -->
<meta property="og:title" content="{{PAGE_TITLE}}">
<meta property="og:description" content="{{PAGE_DESCRIPTION}}">
<meta property="og:type" content="website">
<meta property="og:url" content="{{CANONICAL_URL}}">
```

## 💻 API仕様

### PageGenerator

#### createPage(type, config)
```javascript
/**
 * ページを生成
 * @param {string} type - ページタイプ（'custom', 'news-detail', 'contact', 'about'）
 * @param {Object} config - ページ設定
 * @returns {Promise<string>} 生成されたHTML
 */
```

#### testPagesFunction()
```javascript
/**
 * @pages機能のテスト実行
 * @returns {Promise<boolean>} テスト結果
 */
```

### PagesManager

#### createPage(pageConfig)
```javascript
/**
 * 高レベルページ作成API
 * @param {Object} pageConfig - ページ設定オブジェクト
 * @param {string} pageConfig.id - ページID
 * @param {string} pageConfig.title - ページタイトル
 * @param {string} pageConfig.description - ページ説明
 * @param {string} pageConfig.keywords - SEOキーワード
 * @param {string} pageConfig.type - ページタイプ
 * @param {string} pageConfig.content - HTMLコンテンツ
 * @param {string} [pageConfig.customCSS] - カスタムCSS
 * @param {string} [pageConfig.customJS] - カスタムJavaScript
 * @returns {Promise<Object>} 作成されたページ情報
 */
```

#### getAllPages()
```javascript
/**
 * 全ページ一覧を取得
 * @returns {Array<Object>} ページ一覧
 */
```

#### getPage(pageId)
```javascript
/**
 * 特定ページを取得
 * @param {string} pageId - ページID
 * @returns {Object|null} ページオブジェクト
 */
```

#### deletePage(pageId)
```javascript
/**
 * ページを削除
 * @param {string} pageId - ページID
 * @returns {boolean} 削除成功フラグ
 */
```

#### getDebugInfo()
```javascript
/**
 * デバッグ情報を取得
 * @returns {Object} デバッグ情報オブジェクト
 */
```

## 🔧 実装詳細

### ファイル生成プロセス
```javascript
// 1. テンプレート読み込み
const template = await fetch('/templates/page-template.html').then(r => r.text());

// 2. プレースホルダー置換
let html = template
  .replace(/\{\{PAGE_TITLE\}\}/g, config.pageTitle)
  .replace(/\{\{PAGE_DESCRIPTION\}\}/g, config.pageDescription)
  .replace(/\{\{PAGE_KEYWORDS\}\}/g, config.pageKeywords)
  .replace(/\{\{PAGE_TYPE\}\}/g, pageType)
  .replace(/\{\{PAGE_CONTENT\}\}/g, config.content);

// 3. カスタム要素の処理
if (config.customCSS) {
  html = html.replace('</head>', `<style>${config.customCSS}</style></head>`);
}

// 4. ファイル保存（ブラウザダウンロード）
const blob = new Blob([html], { type: 'text/html' });
const url = URL.createObjectURL(blob);
```

### エラーハンドリング
```javascript
// 必須フィールドチェック
if (!config.pageTitle || !config.content) {
  throw new Error('ページタイトルとコンテンツは必須です');
}

// テンプレート読み込みエラー
try {
  const template = await this.loadTemplate();
} catch (error) {
  console.error('テンプレート読み込み失敗:', error);
  throw new Error('ページテンプレートの読み込みに失敗しました');
}

// データ保存エラー
try {
  this.savePageData(pageInfo);
} catch (error) {
  console.warn('ページデータの保存に失敗:', error);
  // 保存失敗してもページ生成は継続
}
```

## 📊 パフォーマンス仕様

### 処理時間
- **テンプレート読み込み**: ~50ms
- **プレースホルダー置換**: ~10ms
- **HTMLファイル生成**: ~100ms
- **合計処理時間**: ~200ms以下

### メモリ使用量
- **テンプレートキャッシュ**: ~10KB
- **生成中一時データ**: ~50KB
- **最大メモリ使用量**: ~100KB

### ブラウザ対応
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🧪 テスト仕様

### 単体テスト
```javascript
// PageGenerator テスト
describe('PageGenerator', () => {
  test('基本ページ生成', async () => {
    const generator = new PageGenerator();
    const html = await generator.createPage('custom', {
      pageTitle: 'テストページ',
      pageDescription: 'テスト用ページです',
      content: '<h1>テストコンテンツ</h1>'
    });
    expect(html).toContain('<title>テストページ | RBS陸上教室</title>');
    expect(html).toContain('<h1>テストコンテンツ</h1>');
  });
});
```

### 統合テスト
```javascript
// PagesManager テスト
describe('PagesManager', () => {
  test('ページ作成から削除まで', async () => {
    const manager = new PagesManager();
    
    // 作成
    const page = await manager.createPage({
      id: 'test-page',
      title: 'テストページ',
      content: '<p>テスト</p>'
    });
    expect(page).toBeDefined();
    
    // 取得
    const retrieved = manager.getPage('test-page');
    expect(retrieved.title).toBe('テストページ');
    
    // 削除
    const deleted = manager.deletePage('test-page');
    expect(deleted).toBe(true);
  });
});
```

## 🔐 セキュリティ仕様

### XSS対策
```javascript
// HTMLエスケープ処理
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// カスタムJS実行制限
if (config.customJS) {
  // スクリプトタグの直接挿入を防止
  config.customJS = config.customJS.replace(/<script[^>]*>/gi, '');
}
```

### 入力値検証
```javascript
// ページタイトル検証
if (typeof config.pageTitle !== 'string' || config.pageTitle.length > 100) {
  throw new Error('ページタイトルは100文字以内の文字列である必要があります');
}

// HTML要素の検証
const parser = new DOMParser();
const doc = parser.parseFromString(config.content, 'text/html');
if (doc.querySelector('parsererror')) {
  throw new Error('無効なHTMLコンテンツです');
}
```

## 📈 拡張性

### カスタムページタイプ追加
```javascript
// 新しいページタイプの追加方法
const pageTypes = {
  'custom': { /* 既存設定 */ },
  'news-detail': { /* 既存設定 */ },
  'event': { // 新規追加
    defaultTitle: 'イベント',
    defaultDescription: 'RBS陸上教室のイベント情報',
    defaultKeywords: 'RBS陸上教室, イベント, 大会',
    cssClass: 'page-event'
  }
};
```

### テンプレートカスタマイズ
```javascript
// カスタムテンプレートの使用
const customTemplate = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>{{PAGE_TITLE}}</title>
  <!-- カスタムヘッダー -->
</head>
<body>
  {{PAGE_CONTENT}}
  <!-- カスタムフッター -->
</body>
</html>
`;

generator.setCustomTemplate(customTemplate);
```

## 📞 技術サポート

### ログ出力
```javascript
// デバッグ用ログ
console.log('🔧 PageGenerator Debug:', {
  templateLoaded: !!this.template,
  pageType: pageType,
  configKeys: Object.keys(config),
  timestamp: new Date().toISOString()
});
```

### エラー追跡
```javascript
// エラー情報の詳細出力
catch (error) {
  console.error('❌ @pages機能エラー:', {
    error: error.message,
    stack: error.stack,
    config: config,
    pageType: pageType,
    timestamp: new Date().toISOString()
  });
}
```

---

*技術仕様書最終更新: 2024年12月*
*対応バージョン: v3.0* 