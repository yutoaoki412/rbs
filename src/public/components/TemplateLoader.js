/**
 * テンプレートローダー
 * ヘッダー・フッターなどの共通テンプレートを動的に読み込む
 */
class TemplateLoader {
  constructor() {
    this.cache = new Map();
    this.basePath = '../components/templates/';
  }

  /**
   * テンプレートを読み込む
   * @param {string} templateName - テンプレート名（header, footer等）
   * @returns {Promise<string>} - テンプレートHTML
   */
  async loadTemplate(templateName) {
    // キャッシュから取得
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    try {
      const response = await fetch(`${this.basePath}${templateName}.html`);
      if (!response.ok) {
        throw new Error(`テンプレート ${templateName} の読み込みに失敗しました: ${response.status}`);
      }
      
      const html = await response.text();
      this.cache.set(templateName, html);
      return html;
    } catch (error) {
      console.error(`テンプレート読み込みエラー:`, error);
      return '';
    }
  }

  /**
   * ヘッダーを読み込んで挿入
   * @param {string} selector - 挿入先のセレクター
   * @param {Object} options - オプション設定
   */
  async loadHeader(selector = 'body', options = {}) {
    const headerHtml = await this.loadTemplate('header');
    if (!headerHtml) return;

    const targetElement = document.querySelector(selector);
    if (!targetElement) {
      console.error(`ヘッダー挿入先が見つかりません: ${selector}`);
      return;
    }

    // ヘッダーを先頭に挿入
    targetElement.insertAdjacentHTML('afterbegin', headerHtml);
    
    // ページ固有の設定を適用
    this.configureHeader(options);
  }

  /**
   * フッターを読み込んで挿入
   * @param {string} selector - 挿入先のセレクター
   * @param {Object} options - オプション設定
   */
  async loadFooter(selector = 'body', options = {}) {
    const footerHtml = await this.loadTemplate('footer');
    if (!footerHtml) return;

    const targetElement = document.querySelector(selector);
    if (!targetElement) {
      console.error(`フッター挿入先が見つかりません: ${selector}`);
      return;
    }

    // フッターを末尾に挿入
    targetElement.insertAdjacentHTML('beforeend', footerHtml);
    
    // ページ固有の設定を適用
    this.configureFooter(options);
  }

  /**
   * ヘッダーの設定を適用
   * @param {Object} options - 設定オプション
   */
  configureHeader(options = {}) {
    const { currentPage, logoPath, activeSection } = options;

    // ロゴのパスを調整
    if (logoPath) {
      const logoLink = document.querySelector('#logo-link');
      if (logoLink) logoLink.href = logoPath;
    }

    // ナビゲーションリンクを調整（indexページ以外の場合）
    if (currentPage !== 'index') {
      this.adjustNavigationLinks();
    }

    // 現在のページに応じてナビゲーションを調整
    if (currentPage) {
      this.updateNavigation(currentPage, activeSection);
    }
  }

  /**
   * ナビゲーションリンクを他ページ用に調整
   */
  adjustNavigationLinks() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith('#') && href !== '#hero') {
        link.href = `index.html${href}`;
      }
    });

    // NEWSリンクを適切に設定
    const newsLink = document.querySelector('a[href="#news"]');
    if (newsLink) {
      newsLink.href = 'news.html';
      if (window.location.pathname.includes('news')) {
        newsLink.classList.add('active');
      }
    }
  }

  /**
   * フッターの設定を適用
   * @param {Object} options - 設定オプション
   */
  configureFooter(options = {}) {
    const { currentYear, currentPage } = options;

    // 年を更新
    const yearElement = document.querySelector('.copyright-year');
    if (yearElement) {
      yearElement.textContent = currentYear || new Date().getFullYear();
    }

    // フッターリンクを調整（indexページ以外の場合）
    if (currentPage !== 'index') {
      this.adjustFooterLinks();
    }
  }

  /**
   * フッターリンクを他ページ用に調整
   */
  adjustFooterLinks() {
    const footerLinks = document.querySelectorAll('footer .footer-links a[href^="#"]');
    footerLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        link.href = `index.html${href}`;
      }
    });
  }

  /**
   * ナビゲーションを更新
   * @param {string} currentPage - 現在のページ
   * @param {string} activeSection - アクティブなセクション
   */
  updateNavigation(currentPage, activeSection) {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      
      // 現在のページまたはセクションをハイライト
      const linkPage = link.getAttribute('data-page');
      const linkSection = link.getAttribute('data-section');
      
      if (linkPage === currentPage || linkSection === activeSection) {
        link.classList.add('active');
      }
    });
  }

  /**
   * ヘッダーとフッターを一括読み込み
   * @param {Object} options - 設定オプション
   */
  async loadAll(options = {}) {
    const { 
      headerSelector = 'body',
      footerSelector = 'body',
      currentPage,
      logoPath = 'index.html',
      activeSection
    } = options;

    // 管理画面の場合はヘッダーのみ読み込み
    if (currentPage === 'admin' || currentPage === 'admin-login') {
      console.log('📝 管理画面のため、フッダーの読み込みをスキップします（古いTemplateLoader）');
      await this.loadHeader(headerSelector, { currentPage, logoPath, activeSection });
      return;
    }

    // 一般ページの場合はヘッダーとフッター両方を読み込み
    await Promise.all([
      this.loadHeader(headerSelector, { currentPage, logoPath, activeSection }),
      this.loadFooter(footerSelector, { currentPage })
    ]);

    // 読み込み完了後の初期化
    this.initializeComponents();
  }

  /**
   * コンポーネントを初期化
   */
  initializeComponents() {
    // 現在のページを取得
    const currentPage = this.getCurrentPage();
    
    // CommonHeaderとCommonFooterを初期化
    if (window.CommonHeader) {
      const header = new window.CommonHeader();
      header.init();
    }

    // 管理画面以外の場合のみCommonFooterを初期化
    if (window.CommonFooter && currentPage !== 'admin' && currentPage !== 'admin-login') {
      const footer = new window.CommonFooter();
      footer.init();
      footer.updateCopyright();
    }
  }

  /**
   * 現在のページを取得
   * @private
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().replace('.html', '');
    
    switch (filename) {
      case 'admin':
        return 'admin';
      case 'admin-login':
        return 'admin-login';
      case 'news':
        return 'news';
      case 'news-detail':
        return 'news-detail';
      case 'index':
      case '':
      default:
        return filename.startsWith('admin') ? 'admin' : 'index';
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
  }
}

// グローバルに公開
window.TemplateLoader = TemplateLoader;

// ES6モジュールとしてもエクスポート
export default TemplateLoader; 