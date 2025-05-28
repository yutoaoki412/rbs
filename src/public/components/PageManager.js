/**
 * ページ管理システム
 * 各HTMLページの共通機能と初期化を統一管理
 */
class PageManager {
  constructor(pageType = 'index') {
    this.pageType = pageType;
    this.commonHeader = new CommonHeader();
    this.commonFooter = new CommonFooter();
    this.isInitialized = false;
    
    // ページ固有の設定
    this.pageConfigs = {
      index: {
        title: 'RBS陸上教室 - 走力×非認知能力を育てる',
        description: '年長〜小6向け陸上教室。走力だけでなく集中力・判断力・挑戦心も育てる独自プログラム。Running & Brain Schoolで運動も勉強も前向きに！無料体験実施中',
        keywords: '大泉学園 陸上教室, 練馬区 かけっこ教室, 子ども 運動教室, RBS陸上教室',
        structuredDataType: 'SportsActivityLocation'
      },
      news: {
        title: 'NEWS - RBS陸上教室',
        description: 'RBS陸上教室の最新ニュース・お知らせ一覧。体験会情報、メディア掲載、教室の最新情報をお届けします。',
        keywords: 'RBS陸上教室 ニュース, 大泉学園 陸上教室 お知らせ, 体験会情報',
        structuredDataType: 'CollectionPage'
      },
      'news-detail': {
        title: 'ニュース詳細 - RBS陸上教室',
        description: 'RBS陸上教室のニュース詳細ページ',
        keywords: 'RBS陸上教室 ニュース, お知らせ詳細',
        structuredDataType: 'Article'
      }
    };
  }

  /**
   * ページ初期化
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // DOM読み込み完了を待つ
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // 基本設定を適用
      await this.setupBasicConfiguration();
      
      // 共通コンポーネントを初期化
      this.initializeCommonComponents();
      
      // ページ固有の初期化
      await this.initializePageSpecific();
      
      // 共通イベントリスナーを設定
      this.setupCommonEventListeners();
      
      this.isInitialized = true;
      
      // 初期化完了イベントを発火
      this.dispatchInitEvent();
      
    } catch (error) {
      console.error('ページ初期化エラー:', error);
    }
  }

  /**
   * 基本設定を適用
   */
  async setupBasicConfiguration() {
    const config = this.pageConfigs[this.pageType];
    if (!config) return;

    // メタデータを設定
    this.commonHeader.setMetadata({
      title: config.title,
      description: config.description,
      keywords: config.keywords
    });

    // 構造化データを設定
    this.commonFooter.insertStructuredData({
      "@type": config.structuredDataType
    });
  }

  /**
   * 共通コンポーネントを初期化
   */
  initializeCommonComponents() {
    // ヘッダーとフッターは既にHTMLに存在するため、
    // 必要に応じて動的に更新する場合のみ使用
    
    // モバイルメニューの初期化
    this.initializeMobileMenu();
    
    // スムーススクロールの初期化
    this.initializeSmoothScroll();
    
    // アニメーションの初期化
    this.initializeAnimations();
  }

  /**
   * ページ固有の初期化
   */
  async initializePageSpecific() {
    switch (this.pageType) {
      case 'index':
        await this.initializeIndexPage();
        break;
      case 'news':
        await this.initializeNewsPage();
        break;
      case 'news-detail':
        await this.initializeNewsDetailPage();
        break;
    }
  }

  /**
   * インデックスページの初期化
   */
  async initializeIndexPage() {
    // RBSMainAppが存在する場合は初期化
    if (typeof RBSMainApp !== 'undefined') {
      const rbsApp = new RBSMainApp();
      await rbsApp.init();
    }
    
    // FAQ機能は統一されたFAQManager.jsで管理されます
    
    // ステータスバナーの初期化
    this.initializeStatusBanner();
  }

  /**
   * ニュースページの初期化
   */
  async initializeNewsPage() {
    // 記事管理システムの初期化
    if (typeof ArticleManager !== 'undefined') {
      const articleManager = new ArticleManager();
      await articleManager.loadArticles();
      
      // ニュース一覧の表示
      this.displayNewsGrid(articleManager);
      
      // フィルタリング機能の初期化
      this.initializeNewsFiltering(articleManager);
    }
  }

  /**
   * ニュース詳細ページの初期化
   */
  async initializeNewsDetailPage() {
    // 記事管理システムの初期化
    if (typeof ArticleManager !== 'undefined') {
      const articleManager = new ArticleManager();
      await articleManager.loadArticles();
      
      // 記事詳細の表示
      await this.displayNewsDetail(articleManager);
      
      // SNSシェア機能の初期化
      this.initializeSocialShare();
    }
  }

  /**
   * モバイルメニューの初期化
   */
  initializeMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (!mobileMenuBtn || !navLinks) return;

    // グローバル関数として定義（HTMLから呼び出されるため）
    window.toggleMobileMenu = () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
      navLinks.classList.toggle('active');
    };

    // ナビゲーションリンククリック時にメニューを閉じる
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (navLinks.classList.contains('active')) {
          navLinks.classList.remove('active');
          mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  /**
   * スムーススクロールの初期化
   */
  initializeSmoothScroll() {
    // グローバル関数として定義
    window.scrollToTop = (event) => {
      if (event) event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // アンカーリンクのスムーススクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = anchor.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
          const headerHeight = document.querySelector('header')?.offsetHeight || 120;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  /**
   * アニメーションの初期化
   */
  initializeAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animatedElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(element => {
      observer.observe(element);
    });
  }

  // FAQ機能は統一されたFAQManager.jsで管理されます

  /**
   * ステータスバナーの初期化
   */
  initializeStatusBanner() {
    // グローバル関数として定義
    window.toggleStatus = () => {
      const statusBanner = document.querySelector('.status-banner');
      if (statusBanner) {
        statusBanner.classList.toggle('active');
      }
    };
  }

  /**
   * 共通イベントリスナーの設定
   */
  setupCommonEventListeners() {
    // ページ離脱時の処理
    window.addEventListener('beforeunload', () => {
      // 必要に応じてクリーンアップ処理
    });

    // リサイズ時の処理
    window.addEventListener('resize', () => {
      // モバイルメニューが開いている場合は閉じる
      const navLinks = document.querySelector('.nav-links');
      const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
      
      if (navLinks?.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileMenuBtn?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /**
   * 初期化完了イベントを発火
   */
  dispatchInitEvent() {
    const event = new CustomEvent('pageInitialized', {
      detail: { pageType: this.pageType }
    });
    document.dispatchEvent(event);
  }

  /**
   * ニュース一覧の表示（ニュースページ用）
   */
  displayNewsGrid(articleManager) {
    // 実装は既存のnews.htmlのロジックを使用
    // ここでは基本的な構造のみ定義
  }

  /**
   * ニュース詳細の表示（ニュース詳細ページ用）
   */
  async displayNewsDetail(articleManager) {
    // 実装は既存のnews-detail.htmlのロジックを使用
    // ここでは基本的な構造のみ定義
  }

  /**
   * ニュースフィルタリングの初期化
   */
  initializeNewsFiltering(articleManager) {
    // 実装は既存のnews.htmlのロジックを使用
  }

  /**
   * SNSシェア機能の初期化
   */
  initializeSocialShare() {
    // グローバル関数として定義
    window.shareTwitter = () => {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(document.title);
      window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    };

    window.shareFacebook = () => {
      const url = encodeURIComponent(window.location.href);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    };

    window.shareLine = () => {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(document.title);
      window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${text}`, '_blank');
    };

    window.copyUrl = () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('URLをコピーしました！');
      }).catch(() => {
        // フォールバック
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('URLをコピーしました！');
      });
    };
  }
}

// グローバルインスタンス
window.PageManager = PageManager; 