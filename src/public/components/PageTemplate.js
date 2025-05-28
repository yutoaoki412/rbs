/**
 * ページテンプレートシステム
 * 新規ページ作成時に共通構造を提供し、開発効率を向上
 */
class PageTemplate {
  constructor() {
    this.defaultConfig = {
      title: 'RBS陸上教室',
      description: 'RBS陸上教室の公式サイト',
      keywords: 'RBS,陸上教室,Running,Brain,School,子ども,スポーツ',
      bodyClass: 'page-default',
      includedCSS: [
        '../styles/base.css',
        '../styles/shared.css',
        '../styles/responsive.css'
      ],
      includedJS: [
        '../js/core/config/config.js',
        '../js/core/utils/helpers.js',
        '../components/TemplateLoader.js',
        '../components/CommonHeader.js',
        '../components/CommonFooter.js',
        '../components/PageInitializer.js'
      ],
      hasHeader: true,
      hasFooter: true,
      hasStatusBanner: false
    };
  }

  /**
   * ページHTMLテンプレートを生成
   * @param {Object} config - ページ設定
   * @returns {string} 完全なHTMLテンプレート
   */
  generatePageTemplate(config = {}) {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
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
  <link rel="icon" type="image/x-icon" href="../images/favicon.ico">
  
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

  <!-- JavaScript -->
${mergedConfig.includedJS.map(js => `  <script src="${js}"></script>`).join('\n')}
${mergedConfig.pageSpecificJS ? `  <script src="${mergedConfig.pageSpecificJS}"></script>` : ''}
  
  <!-- ページ初期化 -->
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof PageInitializer !== 'undefined') {
        PageInitializer.init({
          currentPage: '${mergedConfig.pageId || 'default'}',
          pageTitle: '${mergedConfig.title}',
          hasStatusBanner: ${mergedConfig.hasStatusBanner}
        });
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * ページヘッダーテンプレートを生成
   * @param {Object} config - ページ設定
   * @returns {string} ページヘッダーHTML
   */
  generatePageHeaderTemplate(config) {
    return `      <!-- ページヘッダー -->
      <div class="page-header">
        <h1>${config.pageTitle || config.title}</h1>
        ${config.pageSubtitle ? `<p>${config.pageSubtitle}</p>` : ''}
      </div>`;
  }

  /**
   * ステータスバナーテンプレートを生成
   * @returns {string} ステータスバナーHTML
   */
  generateStatusBannerTemplate() {
    return `  <!-- 本日の開催状況 -->
  <section id="today-status" class="status-banner">
    <div class="container">
      <div class="status-header" onclick="toggleStatusContent()" style="cursor: pointer;">
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
   * ニュース一覧コンポーネントテンプレートを生成
   * @param {Object} options - オプション設定
   * @returns {string} ニュース一覧HTML
   */
  generateNewsListTemplate(options = {}) {
    const {
      showFilters = true,
      itemsPerPage = 6,
      showPagination = true
    } = options;

    return `      <!-- ニュース一覧 -->
      <div class="news-section">
${showFilters ? `        <!-- フィルター -->
        <div class="news-filters">
          <div class="filter-title">カテゴリーで絞り込み</div>
          <div class="filter-buttons">
            <button class="filter-btn active" data-category="all">すべて</button>
            <button class="filter-btn" data-category="announcement">お知らせ</button>
            <button class="filter-btn" data-category="event">体験会</button>
            <button class="filter-btn" data-category="media">メディア</button>
            <button class="filter-btn" data-category="important">重要</button>
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
   * フォームコンポーネントテンプレートを生成
   * @param {Object} formConfig - フォーム設定
   * @returns {string} フォームHTML
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

    const fieldHTML = fields.map(field => {
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
          return `        <div class="form-group">
          <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
          <input type="${field.type}" id="${field.id}" name="${field.name || field.id}" 
                 class="form-input" placeholder="${field.placeholder || ''}"
                 ${field.required ? 'required' : ''}>
        </div>`;
        
        case 'textarea':
          return `        <div class="form-group">
          <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
          <textarea id="${field.id}" name="${field.name || field.id}" 
                    class="form-textarea" placeholder="${field.placeholder || ''}"
                    rows="${field.rows || 4}" ${field.required ? 'required' : ''}></textarea>
        </div>`;
        
        case 'select':
          const optionsHTML = field.options.map(option => 
            `<option value="${option.value}">${option.text}</option>`
          ).join('\n            ');
          return `        <div class="form-group">
          <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
          <select id="${field.id}" name="${field.name || field.id}" 
                  class="form-select" ${field.required ? 'required' : ''}>
            ${optionsHTML}
          </select>
        </div>`;
        
        default:
          return '';
      }
    }).join('\n');

    return `      <!-- フォーム -->
      <div class="form-section">
        ${title ? `<h2>${title}</h2>` : ''}
        ${description ? `<p class="form-description">${description}</p>` : ''}
        
        <form id="${formId}" class="contact-form">
${fieldHTML}
          
          <div class="form-actions">
            <button type="submit" class="btn ${submitClass}">${submitText}</button>
          </div>
        </form>
      </div>`;
  }

  /**
   * カード一覧コンポーネントテンプレートを生成
   * @param {Object} cardConfig - カード設定
   * @returns {string} カード一覧HTML
   */
  generateCardGridTemplate(cardConfig) {
    const {
      title,
      description,
      gridClass = 'card-grid',
      cards = []
    } = cardConfig;

    const cardsHTML = cards.map(card => `          <div class="card">
            ${card.image ? `<div class="card-image">
              <img src="${card.image}" alt="${card.title}">
            </div>` : ''}
            <div class="card-body">
              <h3>${card.title}</h3>
              ${card.description ? `<p>${card.description}</p>` : ''}
              ${card.link ? `<a href="${card.link}" class="btn btn-outline">詳しく見る</a>` : ''}
            </div>
          </div>`).join('\n');

    return `      <!-- カード一覧 -->
      <div class="cards-section">
        ${title ? `<h2>${title}</h2>` : ''}
        ${description ? `<p class="section-description">${description}</p>` : ''}
        
        <div class="${gridClass}">
${cardsHTML}
        </div>
      </div>`;
  }

  /**
   * 新しいページファイルを作成
   * @param {string} filename - ファイル名
   * @param {Object} config - ページ設定
   * @returns {Promise<boolean>} 作成成功可否
   */
  async createNewPage(filename, config = {}) {
    try {
      const htmlContent = this.generatePageTemplate(config);
      
      // ここでファイル作成の実装
      // 実際の実装では、サーバーサイドAPIやファイルシステムアクセスが必要
      console.log(`新しいページ '${filename}' のテンプレートを生成しました`);
      console.log('生成されたHTML:', htmlContent);
      
      return true;
    } catch (error) {
      console.error('ページ作成エラー:', error);
      return false;
    }
  }

  /**
   * ページテンプレートの例
   */
  static getExampleConfigs() {
    return {
      // 基本的なページ
      basicPage: {
        title: 'お問い合わせ - RBS陸上教室',
        description: 'RBS陸上教室へのお問い合わせフォーム',
        pageTitle: 'お問い合わせ',
        pageSubtitle: 'ご質問やご相談がございましたら、お気軽にお問い合わせください',
        bodyClass: 'page-contact',
        pageId: 'contact'
      },
      
      // ニュース一覧ページ（ステータスバナーなし）
      newsPage: {
        title: 'ニュース - RBS陸上教室',
        description: 'RBS陸上教室の最新情報をお届けします',
        pageTitle: 'NEWS',
        pageSubtitle: 'RBS陸上教室の最新情報をお届けします',
        bodyClass: 'page-news',
        pageId: 'news',
        pageSpecificCSS: '../styles/news.css',
        hasStatusBanner: false
      },
      
      // 管理画面風ページ
      adminPage: {
        title: '管理画面 - RBS陸上教室',
        description: 'RBS陸上教室の管理画面',
        bodyClass: 'admin-layout',
        pageId: 'admin',
        pageSpecificCSS: '../styles/admin.css',
        hasHeader: false,
        hasFooter: false,
        hasPageHeader: false
      }
    };
  }
}

// グローバルで利用可能にする
window.PageTemplate = PageTemplate; 