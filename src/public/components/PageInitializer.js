/**
 * ページ初期化管理クラス
 * 全ページで共通の初期化処理を統一管理
 */
class PageInitializer {
  constructor() {
    this.templateLoader = new TemplateLoader();
    this.isInitialized = false;
    this.pageConfig = {};
  }

  /**
   * ページを初期化
   * @param {Object} config - ページ設定
   */
  async init(config = {}) {
    if (this.isInitialized) return;

    this.pageConfig = {
      pageType: 'default',
      currentPage: null,
      activeSection: null,
      metadata: {},
      structuredData: null,
      customCSS: [],
      customJS: [],
      ...config
    };

    try {
      // 1. メタデータを設定
      this.setMetadata();

      // 2. カスタムCSSを読み込み
      await this.loadCustomCSS();

      // 3. ヘッダー・フッターを読み込み
      await this.loadTemplates();

      // 4. カスタムJSを読み込み
      await this.loadCustomJS();

      // 5. ページ固有の初期化
      await this.initializePageSpecific();

      // 6. 構造化データを設定
      this.setStructuredData();

      this.isInitialized = true;
      console.log(`ページ初期化完了: ${this.pageConfig.pageType}`);

    } catch (error) {
      console.error('ページ初期化エラー:', error);
    }
  }

  /**
   * メタデータを設定
   */
  setMetadata() {
    const { metadata } = this.pageConfig;
    
    if (metadata.title) {
      document.title = metadata.title;
    }

    // メタタグを更新
    Object.entries(metadata).forEach(([name, content]) => {
      if (name === 'title') return;
      this.updateMetaTag(name, content);
    });

    // OGPタグを更新
    if (metadata.ogp) {
      Object.entries(metadata.ogp).forEach(([property, content]) => {
        this.updateOGPTag(property, content);
      });
    }
  }

  /**
   * メタタグを更新
   */
  updateMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  /**
   * OGPタグを更新
   */
  updateOGPTag(property, content) {
    let meta = document.querySelector(`meta[property="og:${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', `og:${property}`);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  /**
   * カスタムCSSを読み込み
   */
  async loadCustomCSS() {
    const { customCSS } = this.pageConfig;
    
    for (const cssPath of customCSS) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssPath;
      document.head.appendChild(link);
    }
  }

  /**
   * テンプレートを読み込み
   */
  async loadTemplates() {
    const { currentPage, activeSection } = this.pageConfig;
    
    await this.templateLoader.loadAll({
      currentPage,
      activeSection,
      logoPath: this.getLogoPath()
    });
  }

  /**
   * ロゴのパスを取得
   */
  getLogoPath() {
    const { pageType } = this.pageConfig;
    
    switch (pageType) {
      case 'index':
        return '#hero';
      case 'news':
      case 'news-detail':
      case 'admin':
        return 'index.html';
      default:
        return 'index.html';
    }
  }

  /**
   * カスタムJSを読み込み
   */
  async loadCustomJS() {
    const { customJS } = this.pageConfig;
    
    for (const jsPath of customJS) {
      await this.loadScript(jsPath);
    }
  }

  /**
   * スクリプトを動的に読み込み
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * ページ固有の初期化
   */
  async initializePageSpecific() {
    const { pageType } = this.pageConfig;

    switch (pageType) {
      case 'index':
        await this.initIndexPage();
        break;
      case 'news':
        await this.initNewsPage();
        break;
      case 'news-detail':
        await this.initNewsDetailPage();
        break;
      case 'admin':
        await this.initAdminPage();
        break;
      default:
        console.log('デフォルトページ初期化');
    }
  }

  /**
   * インデックスページの初期化
   */
  async initIndexPage() {
    // ヒーロービデオの初期化
    this.initHeroVideo();
    
    // スクロールアニメーションの初期化
    this.initScrollAnimations();
    
    // ステータスバナーの初期化
    if (window.StatusBanner) {
      const statusBanner = new window.StatusBanner();
      statusBanner.init();
    }
  }

  /**
   * ニュースページの初期化
   */
  async initNewsPage() {
    // 記事管理システムの初期化
    if (window.ArticleManager) {
      const articleManager = new window.ArticleManager();
      await articleManager.loadArticles();
    }
  }

  /**
   * ニュース詳細ページの初期化
   */
  async initNewsDetailPage() {
    // 記事詳細の読み込み
    const articleId = this.getUrlParameter('id');
    if (articleId && window.ArticleManager) {
      const articleManager = new window.ArticleManager();
      await articleManager.loadArticleDetail(articleId);
    }
  }

  /**
   * 管理ページの初期化
   */
  async initAdminPage() {
    // 管理機能の初期化
    console.log('管理ページ初期化');
  }

  /**
   * ヒーロービデオの初期化
   */
  initHeroVideo() {
    const heroVideo = document.getElementById('hero-video');
    if (heroVideo) {
      heroVideo.addEventListener('loadeddata', () => {
        console.log('ヒーロービデオ読み込み完了');
      });
    }
  }

  /**
   * スクロールアニメーションの初期化
   */
  initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // アニメーション対象要素を監視
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  }

  /**
   * 構造化データを設定
   */
  setStructuredData() {
    const { structuredData } = this.pageConfig;
    
    if (structuredData && window.CommonFooter) {
      const footer = new window.CommonFooter();
      footer.insertStructuredData(structuredData);
    }
  }

  /**
   * URLパラメータを取得
   */
  getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  /**
   * ページ設定を更新
   */
  updateConfig(newConfig) {
    this.pageConfig = { ...this.pageConfig, ...newConfig };
  }

  /**
   * 初期化状態をリセット
   */
  reset() {
    this.isInitialized = false;
    this.pageConfig = {};
    this.templateLoader.clearCache();
  }
}

// グローバルに公開
window.PageInitializer = PageInitializer; 