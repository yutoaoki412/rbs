/**
 * RBS陸上教室 ページビルダー
 * 新規ページ作成とテンプレート管理の統合コンポーネント
 * v2.0 - ES6モジュール化、設計パターン最適化
 */

import BaseComponent from '../BaseComponent.js';
import eventBus from '../../services/EventBus.js';

class PageBuilder extends BaseComponent {
  constructor(options = {}) {
    super(null, {
      defaultTitle: 'RBS陸上教室',
      defaultDescription: 'RBS陸上教室の公式サイト',
      defaultKeywords: 'RBS,陸上教室,Running,Brain,School,子ども,スポーツ',
      templateVersion: '3.0',
      ...options
    });
    
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * テンプレートを初期化
   */
  initializeTemplates() {
    // 基本テンプレート設定
    this.baseConfig = {
      title: this.options.defaultTitle,
      description: this.options.defaultDescription,
      keywords: this.options.defaultKeywords,
      bodyClass: 'page-default',
      includedCSS: [
        '../css/base.css',
        '../css/shared.css',
        '../css/responsive.css'
      ],
      hasHeader: true,
      hasFooter: true,
      hasStatusBanner: false,
      moduleType: 'es6'
    };
  }

  /**
   * ページHTMLテンプレートを生成
   * @param {Object} config - ページ設定
   * @returns {string} 完全なHTMLテンプレート
   */
  generatePageTemplate(config = {}) {
    const mergedConfig = { ...this.baseConfig, ...config };
    
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mergedConfig.title}</title>
  <meta name="description" content="${mergedConfig.description}">
  <meta name="keywords" content="${mergedConfig.keywords}">
  <meta name="robots" content="index, follow">
  
  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="../assets/images/favicon.ico">
  
  <!-- CSS -->
${mergedConfig.includedCSS.map(css => `  <link rel="stylesheet" href="${css}">`).join('\n')}
${mergedConfig.pageSpecificCSS ? `  <link rel="stylesheet" href="${mergedConfig.pageSpecificCSS}">` : ''}
</head>
<body class="${mergedConfig.bodyClass}">
${mergedConfig.hasHeader ? '  <!-- ヘッダーは動的に読み込まれます -->' : ''}

${mergedConfig.hasStatusBanner ? this.generateStatusBannerTemplate() : ''}

  <main class="main-content">
    <div class="container">
${mergedConfig.hasPageHeader !== false ? this.generatePageHeaderTemplate(mergedConfig) : ''}
      
      <!-- メインコンテンツエリア -->
      <div class="page-content">
        ${mergedConfig.content || '<!-- ここにページ固有のコンテンツを追加 -->'}
      </div>
    </div>
  </main>

${mergedConfig.hasFooter ? '  <!-- フッターは動的に読み込まれます -->' : ''}

  <!-- JavaScript - ES6モジュール -->
  <script type="module" src="../js/main.js"></script>
</body>
</html>`;
  }

  /**
   * ページヘッダーテンプレートを生成
   */
  generatePageHeaderTemplate(config) {
    return `      <!-- ページヘッダー -->
      <div class="page-header">
        <h1>${config.pageTitle || config.title}</h1>
        ${config.pageSubtitle ? `<p class="page-subtitle">${config.pageSubtitle}</p>` : ''}
        ${config.breadcrumb ? this.generateBreadcrumb(config.breadcrumb) : ''}
      </div>`;
  }

  /**
   * パンくずリストを生成
   */
  generateBreadcrumb(breadcrumb) {
    return `        <nav class="breadcrumb">
          <ol>
            ${breadcrumb.map(item => 
              `<li><a href="${item.href}">${item.text}</a></li>`
            ).join('')}
          </ol>
        </nav>`;
  }

  /**
   * ステータスバナーテンプレートを生成
   */
  generateStatusBannerTemplate() {
    return `  <!-- 本日の開催状況 -->
  <section id="today-status" class="status-banner">
    <div class="container">
      <div class="status-header" data-action="toggle-status">
        <div class="status-info">
          <span class="status-icon" id="status-icon"></span>
          <span class="status-text">本日のレッスン開催状況</span>
          <span class="status-indicator" id="global-status-indicator">読み込み中...</span>
        </div>
        <span class="toggle-icon">▼</span>
      </div>
      <div class="status-content" style="display: none;">
        <div class="status-details" id="status-details">
          <div class="loading-status">
            <p>レッスン状況を読み込み中...</p>
          </div>
        </div>
      </div>
    </div>
  </section>`;
  }

  /**
   * ニュース一覧コンポーネントを生成
   */
  generateNewsListTemplate(options = {}) {
    const {
      showFilters = true,
      itemsPerPage = 6,
      showPagination = true,
      showSearch = true
    } = options;

    return `      <!-- ニュース一覧 -->
      <div class="news-section">
${showSearch ? `        <!-- 検索 -->
        <div class="news-search">
          <input type="text" id="news-search" placeholder="記事を検索..." data-action="search-news">
          <button type="button" data-action="clear-search">クリア</button>
        </div>` : ''}

${showFilters ? `        <!-- フィルター -->
        <div class="news-filters">
          <div class="filter-title">カテゴリーで絞り込み</div>
          <div class="filter-buttons">
            <button class="filter-btn active" data-action="filter-news" data-category="all">すべて</button>
            <button class="filter-btn" data-action="filter-news" data-category="announcement">お知らせ</button>
            <button class="filter-btn" data-action="filter-news" data-category="event">体験会</button>
            <button class="filter-btn" data-action="filter-news" data-category="media">メディア</button>
            <button class="filter-btn" data-action="filter-news" data-category="important">重要</button>
          </div>
        </div>` : ''}

        <!-- 検索結果表示 -->
        <div class="search-results" id="search-results" style="display: none;">
          <div class="search-results-text">
            <span id="search-count">0</span>件の記事が見つかりました
          </div>
        </div>

        <!-- ニュース一覧 -->
        <div class="news-grid" id="news-grid">
          <!-- 初期表示：ローディング -->
          <div class="loading-message">
            <div class="loading-spinner"></div>
            <p>記事を読み込み中...</p>
          </div>
        </div>

${showPagination ? `        <!-- ページネーション -->
        <div class="pagination" id="pagination" style="display: none;">
          <!-- ページネーションボタンは動的に生成 -->
        </div>` : ''}
      </div>`;
  }

  /**
   * フォームテンプレートを生成
   */
  generateFormTemplate(formConfig) {
    const {
      formId,
      title,
      description,
      fields = [],
      submitText = '送信',
      submitClass = 'btn-primary'
    } = formConfig;

    const fieldHTML = fields.map(field => this.generateFieldHTML(field)).join('\n');

    return `      <!-- フォーム -->
      <div class="form-section">
        <div class="form-header">
          <h2>${title}</h2>
          ${description ? `<p class="form-description">${description}</p>` : ''}
        </div>
        
        <form id="${formId}" class="contact-form" data-action="submit-form">
          ${fieldHTML}
          
          <div class="form-group">
            <button type="submit" class="${submitClass}" data-action="submit-form">
              ${submitText}
            </button>
          </div>
        </form>
      </div>`;
  }

  /**
   * フィールドHTMLを生成
   */
  generateFieldHTML(field) {
    const { type, id, label, placeholder, required, options } = field;
    const requiredAttr = required ? 'required' : '';
    const requiredLabel = required ? '<span class="required">*</span>' : '';

    switch (type) {
      case 'text':
      case 'email':
      case 'tel':
        return `          <div class="form-group">
            <label for="${id}">${label}${requiredLabel}</label>
            <input type="${type}" id="${id}" name="${id}" placeholder="${placeholder}" ${requiredAttr}>
          </div>`;
      
      case 'textarea':
        return `          <div class="form-group">
            <label for="${id}">${label}${requiredLabel}</label>
            <textarea id="${id}" name="${id}" placeholder="${placeholder}" ${requiredAttr}></textarea>
          </div>`;
      
      case 'select':
        const optionsHTML = options.map(opt => 
          `<option value="${opt.value}">${opt.text}</option>`
        ).join('');
        return `          <div class="form-group">
            <label for="${id}">${label}${requiredLabel}</label>
            <select id="${id}" name="${id}" ${requiredAttr}>
              <option value="">選択してください</option>
              ${optionsHTML}
            </select>
          </div>`;
      
      case 'checkbox':
        return `          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="${id}" name="${id}" ${requiredAttr}>
              <span class="checkmark"></span>
              ${label}${requiredLabel}
            </label>
          </div>`;
      
      default:
        return '';
    }
  }

  /**
   * 事前定義されたページテンプレートを取得
   */
  getPresetTemplates() {
    return {
      contact: this.createContactPageTemplate(),
      trial: this.createTrialPageTemplate(),
      faq: this.createFAQPageTemplate(),
      gallery: this.createGalleryPageTemplate(),
      events: this.createEventsPageTemplate()
    };
  }

  /**
   * お問い合わせページテンプレート
   */
  createContactPageTemplate() {
    return this.generatePageTemplate({
      title: 'お問い合わせ - RBS陸上教室',
      description: 'RBS陸上教室へのお問い合わせフォーム',
      pageTitle: 'お問い合わせ',
      pageSubtitle: 'ご質問やご相談がございましたら、お気軽にお問い合わせください',
      bodyClass: 'page-contact',
      pageSpecificCSS: '../css/form-components.css',
      content: this.generateFormTemplate({
        formId: 'contact-form',
        title: 'お問い合わせフォーム',
        description: '下記のフォームに必要事項をご入力の上、送信してください。',
        fields: [
          { type: 'text', id: 'name', label: 'お名前', placeholder: '山田 太郎', required: true },
          { type: 'email', id: 'email', label: 'メールアドレス', placeholder: 'example@email.com', required: true },
          { type: 'select', id: 'subject', label: 'お問い合わせ内容', required: true, options: [
            { value: 'trial', text: '体験申し込み' },
            { value: 'question', text: 'ご質問' },
            { value: 'other', text: 'その他' }
          ]},
          { type: 'textarea', id: 'message', label: 'メッセージ', placeholder: 'お問い合わせ内容をご記入ください', required: true }
        ]
      })
    });
  }

  /**
   * 体験申し込みページテンプレート
   */
  createTrialPageTemplate() {
    return this.generatePageTemplate({
      title: '体験申し込み - RBS陸上教室',
      description: 'RBS陸上教室の無料体験レッスンお申し込み',
      pageTitle: '無料体験申し込み',
      pageSubtitle: 'まずは体験してみませんか？',
      bodyClass: 'page-trial',
      pageSpecificCSS: '../css/form-components.css',
      content: this.generateFormTemplate({
        formId: 'trial-form',
        title: '体験申し込みフォーム',
        description: '体験レッスンにお申し込みください。',
        fields: [
          { type: 'text', id: 'child-name', label: 'お子様のお名前', required: true },
          { type: 'text', id: 'parent-name', label: '保護者様のお名前', required: true },
          { type: 'email', id: 'email', label: 'メールアドレス', required: true },
          { type: 'select', id: 'age', label: 'お子様の年齢', required: true, options: [
            { value: '3', text: '3歳' },
            { value: '4', text: '4歳' },
            { value: '5', text: '5歳' },
            { value: '6', text: '6歳以上' }
          ]}
        ],
        submitText: '体験を申し込む'
      })
    });
  }

  /**
   * よくある質問ページテンプレート
   */
  createFAQPageTemplate() {
    return this.generatePageTemplate({
      title: 'よくある質問 - RBS陸上教室',
      pageTitle: 'よくある質問',
      bodyClass: 'page-faq',
      content: `      <!-- FAQ -->
      <div class="faq-section">
        <div class="faq-list" data-component="faq-accordion">
          <!-- FAQアイテムは動的に読み込まれます -->
        </div>
      </div>`
    });
  }

  /**
   * ギャラリーページテンプレート
   */
  createGalleryPageTemplate() {
    return this.generatePageTemplate({
      title: 'ギャラリー - RBS陸上教室',
      pageTitle: 'ギャラリー',
      bodyClass: 'page-gallery',
      content: `      <!-- ギャラリー -->
      <div class="gallery-section">
        <div class="gallery-filters">
          <button data-action="filter-gallery" data-category="all" class="active">すべて</button>
          <button data-action="filter-gallery" data-category="lesson">レッスン</button>
          <button data-action="filter-gallery" data-category="event">イベント</button>
        </div>
        <div class="gallery-grid" data-component="image-gallery">
          <!-- 画像は動的に読み込まれます -->
        </div>
      </div>`
    });
  }

  /**
   * イベントページテンプレート
   */
  createEventsPageTemplate() {
    return this.generatePageTemplate({
      title: 'イベント - RBS陸上教室',
      pageTitle: 'イベント',
      bodyClass: 'page-events',
      content: `      <!-- イベント -->
      <div class="events-section">
        <div class="events-list" data-component="event-list">
          <!-- イベントは動的に読み込まれます -->
        </div>
      </div>`
    });
  }

  /**
   * ページを実際に作成・保存
   */
  async createPage(filename, templateType, customConfig = {}) {
    try {
      const templates = this.getPresetTemplates();
      const template = templates[templateType];
      
      if (!template) {
        throw new Error(`未知のテンプレートタイプ: ${templateType}`);
      }

      // カスタム設定をマージ
      const finalTemplate = customConfig.content ? 
        this.generatePageTemplate(customConfig) : template;

      this.emit('pageBuilder:created', { filename, templateType, customConfig });
      return finalTemplate;
      
    } catch (error) {
      console.error('ページ作成エラー:', error);
      this.emit('pageBuilder:error', { filename, templateType, error });
      throw error;
    }
  }

  /**
   * 使用例を生成
   */
  static showUsageExample() {
    return `
// PageBuilderの使用例
import PageBuilder from './PageBuilder.js';

const pageBuilder = new PageBuilder();

// お問い合わせページを作成
const contactHTML = await pageBuilder.createPage('contact.html', 'contact');

// カスタム設定でページを作成
const customHTML = await pageBuilder.createPage('custom.html', 'contact', {
  title: 'カスタムお問い合わせ',
  pageSubtitle: 'カスタムサブタイトル',
  additionalCSS: ['../css/custom.css']
});
    `;
  }
}

export default PageBuilder; 