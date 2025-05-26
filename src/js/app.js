/**
 * RBS陸上教室 - メインアプリケーション
 * UIの動作とインタラクションを管理
 */

class RBSApp {
  constructor() {
    this.articleManager = null;
    this.statusUpdater = null;
    this.isInitialized = false;
  }

  /**
   * アプリケーション初期化
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // 記事管理システムを初期化
      this.articleManager = new ArticleManager();
      
      // レッスン状況更新システムを初期化
      this.statusUpdater = new LessonStatusUpdater();
      
      // DOM読み込み完了後の処理
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
      } else {
        await this.onDOMReady();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('アプリケーション初期化エラー:', error);
    }
  }

  /**
   * DOM読み込み完了後の処理
   */
  async onDOMReady() {
    // 記事を読み込み
    await this.articleManager.loadArticles();
    
    // レッスン状況を初期化
    this.statusUpdater.init();
    
    // UI初期化
    this.initializeUI();
    
    // イベントリスナー設定
    this.setupEventListeners();
    
    // ページ固有の初期化
    this.initializePageSpecific();
  }

  /**
   * UI初期化
   */
  initializeUI() {
    // ヒーローセクションのアニメーション
    this.initializeHeroAnimation();
    
    // スクロールアニメーション
    this.initializeScrollAnimations();
    
    // ヘッダーの動的調整
    this.initializeHeader();
    
    // ステータスバナーの位置調整
    this.initializeStatusBanner();
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // ナビゲーション
    this.setupNavigation();
    
    // モバイルメニュー
    this.setupMobileMenu();
    
    // スムーススクロール
    this.setupSmoothScroll();
    
    // FAQ
    this.setupFAQ();
    
    // ステータスバナー
    this.setupStatusBanner();
    
    // ボタンエフェクト
    this.setupButtonEffects();
    
    // ウィンドウイベント
    this.setupWindowEvents();
  }

  /**
   * ヒーローアニメーション初期化
   */
  initializeHeroAnimation() {
    const heroContent = document.querySelector('.hero-content');
    const heroVideo = document.querySelector('#hero-video');
    
    if (!heroContent) return;

    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(50px)';
    
    const startAnimation = () => {
      setTimeout(() => {
        heroContent.style.transition = 'opacity 1.2s ease-out, transform 1.2s ease-out';
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translateY(0)';
      }, 200);
    };

    if (heroVideo) {
      // 動画の読み込み完了後にアニメーション開始
      heroVideo.addEventListener('loadeddata', startAnimation);
      
      // 動画エラー時のフォールバック
      heroVideo.addEventListener('error', () => {
        console.log('動画の読み込みでエラーが発生しました。');
        heroVideo.style.display = 'none';
        startAnimation();
      });
      
      // 動画読み込みタイムアウト
      setTimeout(() => {
        if (heroVideo.readyState === 0) {
          console.log('動画の読み込みがタイムアウトしました。');
          heroVideo.style.display = 'none';
          startAnimation();
        }
      }, 1000);

      // 動画の最適化
      this.optimizeVideo(heroVideo);
    } else {
      startAnimation();
    }
  }

  /**
   * 動画最適化
   */
  optimizeVideo(video) {
    // 画面外では動画を停止
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    });
    observer.observe(video);
    
    // ページ非表示時には動画を停止
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        video.pause();
      } else if (video.getBoundingClientRect().top < window.innerHeight) {
        video.play().catch(() => {});
      }
    });
  }

  /**
   * スクロールアニメーション初期化
   */
  initializeScrollAnimations() {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-on-scroll');
          
          if (entry.target.classList.contains('feature-number')) {
            entry.target.classList.add('animate-bounce');
          }
          
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // アニメーション対象要素を監視
    document.querySelectorAll('.feature-card, .reason-item, .price-card, .faq-item, .news-item, .bottom-message, .feature-number').forEach(el => {
      observer.observe(el);
    });
  }

  /**
   * ヘッダー初期化
   */
  initializeHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    // スクロール時の背景変化
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.backdropFilter = 'blur(10px)';
      } else {
        header.style.background = '#ffffff';
        header.style.backdropFilter = 'none';
      }
    });
  }

  /**
   * ステータスバナー初期化
   */
  initializeStatusBanner() {
    // ステータスバナーはCSSのstickyで固定表示されるため、
    // JavaScript側での位置調整は不要
  }

  /**
   * ナビゲーション設定
   */
  setupNavigation() {
    // ナビゲーションリンクのクリック処理
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && navLinks.classList.contains('active')) {
          navLinks.classList.remove('active');
        }
      });
    });
  }

  /**
   * モバイルメニュー設定
   */
  setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
      mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
      });
    }

    // グローバル関数として公開（HTMLから呼び出し用）
    window.toggleMobileMenu = () => {
      if (navLinks) {
        navLinks.classList.toggle('active');
      }
    };
  }

  /**
   * スムーススクロール設定
   */
  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        
        // モバイルメニューを閉じる
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && navLinks.classList.contains('active')) {
          navLinks.classList.remove('active');
        }
        
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          const header = document.querySelector('header');
          const statusBanner = document.querySelector('.status-banner');
          const headerHeight = header ? header.offsetHeight : 90;
          const bannerHeight = statusBanner ? statusBanner.offsetHeight : 70;
          const totalOffset = headerHeight + bannerHeight + 20;
          
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - totalOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });

    // ページトップへのスクロール
    window.scrollToTop = (event) => {
      event.preventDefault();
      
      const navLinks = document.querySelector('.nav-links');
      if (navLinks && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
      }
      
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };
  }

  /**
   * FAQ設定
   */
  setupFAQ() {
    window.toggleFaq = (element) => {
      const faqItem = element.parentElement;
      const isActive = faqItem.classList.contains('active');
      
      // 全てのFAQを閉じる
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // クリックされたFAQを開く
      if (!isActive) {
        faqItem.classList.add('active');
      }
    };
  }

  /**
   * ステータスバナー設定
   */
  setupStatusBanner() {
    window.toggleStatus = () => {
      const statusBanner = document.querySelector('.status-banner');
      if (statusBanner) {
        statusBanner.classList.toggle('active');
      }
    };
  }

  /**
   * ボタンエフェクト設定
   */
  setupButtonEffects() {
    document.querySelectorAll('.btn-primary, .login-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 0.6s linear;
          pointer-events: none;
        `;
        
        this.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  /**
   * ウィンドウイベント設定
   */
  setupWindowEvents() {
    // 動的な背景効果
    this.createFloatingShapes();
  }

  /**
   * 浮遊する装飾要素作成
   */
  createFloatingShapes() {
    const shapes = ['🏃‍♂️', '⚡', '🎯', '🏆', '💪', '🌟'];
    const hero = document.querySelector('#hero');
    
    if (!hero) return;

    setInterval(() => {
      if (Math.random() > 0.7) {
        const shape = document.createElement('div');
        shape.innerHTML = shapes[Math.floor(Math.random() * shapes.length)];
        shape.style.cssText = `
          position: absolute;
          font-size: 24px;
          opacity: 0.3;
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          pointer-events: none;
          z-index: 0;
          animation: fadeInOut 3s ease-out forwards;
        `;
        
        hero.appendChild(shape);
        
        setTimeout(() => {
          if (shape.parentNode) {
            shape.parentNode.removeChild(shape);
          }
        }, 3000);
      }
    }, 2000);
  }

  /**
   * ページ固有の初期化
   */
  initializePageSpecific() {
    const currentPage = this.getCurrentPage();
    
    switch (currentPage) {
      case 'index':
        this.initializeHomePage();
        break;
      case 'news':
        this.initializeNewsPage();
        break;
      case 'news-detail':
        this.initializeNewsDetailPage();
        break;
    }
  }

  /**
   * 現在のページを判定
   */
  getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('news-detail.html')) return 'news-detail';
    if (path.includes('news.html')) return 'news';
    return 'index';
  }

  /**
   * ホームページ初期化
   */
  initializeHomePage() {
    // ニュース一覧を表示
    this.displayNews();
  }

  /**
   * ニュースページ初期化
   */
  initializeNewsPage() {
    // ニュースページ固有の処理
    if (window.displayAllNews) {
      window.displayAllNews();
    }
  }

  /**
   * ニュース詳細ページ初期化
   */
  initializeNewsDetailPage() {
    // ニュース詳細ページ固有の処理
    if (window.loadArticleContent) {
      window.loadArticleContent();
    }
  }

  /**
   * ニュース一覧表示（ホームページ用）
   */
  displayNews() {
    const newsList = document.getElementById('news-list');
    if (!newsList || !this.articleManager) return;

    try {
      const latestArticles = this.articleManager.articles
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      if (latestArticles.length === 0) {
        newsList.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--gray-medium);">
            <p style="font-size: 16px; font-weight: 600;">まだニュースがありません</p>
            <p style="font-size: 14px; margin-top: 10px;">管理画面から記事を作成してください</p>
          </div>
        `;
        return;
      }

      const newsHtml = latestArticles.map(article => {
        const categoryColor = this.articleManager.getCategoryColor(article.category);
        return `
          <div class="news-item">
            <div class="news-date">${this.articleManager.formatDate(article.date)}</div>
            <div class="news-content">
              <span class="news-category" style="background: ${categoryColor};">${article.categoryName}</span>
              <a href="news-detail.html?id=${article.id}" style="color: var(--navy-dark); text-decoration: none; font-weight: 600;">${article.title}</a>
            </div>
          </div>
        `;
      }).join('');

      newsList.innerHTML = newsHtml;
    } catch (error) {
      console.error('ニュース表示エラー:', error);
      newsList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--primary-red);">
          <p style="font-size: 16px; font-weight: 600;">ニュースの読み込みに失敗しました</p>
        </div>
      `;
    }
  }
}

// アプリケーション初期化
const app = new RBSApp();

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// グローバルアクセス用
window.RBSApp = app; 