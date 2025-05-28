/**
 * UI相互作用管理システム
 * ユーザーインターフェースの相互作用を統一管理
 */
class UIInteractionManager extends Component {
  constructor(config = {}) {
    super({
      autoInit: false,
      enableEvents: true,
      ...config
    });
    
    this.observers = new Map();
    
    // 設定
    this.config = {
      ...this.config,
      animation: {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px'
      },
      scroll: {
        headerOffset: 120,
        bannerOffset: 70,
        additionalOffset: 20
      },
      video: {
        loadTimeout: 1000,
        animationDelay: 200
      }
    };
    
    // 初期化
    this.init();
  }

  /**
   * 初期化処理の実行
   */
  doInit() {
    console.log('📱 UIInteractionManager v2.0 初期化開始');
    
    this.setupMobileMenu();
    this.setupSmoothScroll();
    this.setupScrollAnimations();
    this.setupHeaderEffects();
    this.setupHeroAnimations();
    this.setupVideoHandling();
    this.setupFloatingShapes();
    
    // ステータスバナーの初期化
    StatusManager.init();
    
    console.log('✅ UIInteractionManager v2.0 初期化完了');
  }

  /**
   * モバイルメニューのセットアップ
   */
  setupMobileMenu() {
    const mobileMenuBtn = RBSHelpers.getElement('.mobile-menu-btn');
    const navLinks = RBSHelpers.getElement('.nav-links');
    
    if (!mobileMenuBtn || !navLinks) return;

    // メニュー切り替え関数をグローバルに公開（HTMLから呼び出されるため）
    window.toggleMobileMenu = () => {
      try {
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
        navLinks.classList.toggle('active');
        
        this.emit('ui:mobileMenuToggled', { isOpen: !isExpanded });
        eventBus.emit('ui:mobileMenuToggled', { isOpen: !isExpanded });
      } catch (error) {
        console.error('モバイルメニュー切り替えエラー:', error);
      }
    };

    // ナビゲーションリンククリック時の処理
    const navLinksElements = navLinks.querySelectorAll('a');
    navLinksElements.forEach(link => {
      this.addEventListener(link, 'click', () => {
        this.closeMobileMenu();
      });
    });

    // リサイズ時の処理
    this.addEventListener(window, 'resize', RBSHelpers.debounce(() => {
      this.closeMobileMenu();
    }, 250));
  }

  /**
   * モバイルメニューを閉じる
   */
  closeMobileMenu() {
    const navLinks = RBSHelpers.getElement('.nav-links');
    const mobileMenuBtn = RBSHelpers.getElement('.mobile-menu-btn');
    
    if (navLinks?.classList.contains('active')) {
      navLinks.classList.remove('active');
      mobileMenuBtn?.setAttribute('aria-expanded', 'false');
      this.emit('ui:mobileMenuClosed');
      eventBus.emit('ui:mobileMenuClosed');
    }
  }

  /**
   * スムーススクロールのセットアップ
   */
  setupSmoothScroll() {
    // ページトップへスクロール関数をグローバルに公開
    window.scrollToTop = (event) => {
      try {
        if (event) event.preventDefault();
        this.closeMobileMenu();
        
        RBSHelpers.smoothScrollTo(document.body, 0)
          .then(() => {
            this.emit('ui:scrolledToTop');
            eventBus.emit('ui:scrolledToTop');
          })
          .catch(error => console.error('スクロールエラー:', error));
      } catch (error) {
        console.error('トップスクロールエラー:', error);
      }
    };

    // アンカーリンクのスムーススクロール
    const anchorLinks = RBSHelpers.getElements('a[href^="#"]');
    anchorLinks.forEach(anchor => {
      this.addEventListener(anchor, 'click', (e) => {
        e.preventDefault();
        this.closeMobileMenu();
        
        const targetId = anchor.getAttribute('href');
        const targetElement = RBSHelpers.getElement(targetId);
        
        if (targetElement) {
          const totalOffset = this.calculateScrollOffset();
          
          RBSHelpers.smoothScrollTo(targetElement, totalOffset)
            .then(() => {
              this.emit('ui:scrolledToAnchor', { target: targetId });
              eventBus.emit('ui:scrolledToAnchor', { target: targetId });
            })
            .catch(error => console.error('アンカースクロールエラー:', error));
        }
      });
    });
  }

  /**
   * スクロールオフセットを計算
   */
  calculateScrollOffset() {
    const header = RBSHelpers.getElement('header');
    const statusBanner = RBSHelpers.getElement('.status-banner');
    
    const headerHeight = header?.offsetHeight || this.config.scroll.headerOffset;
    const bannerHeight = statusBanner?.offsetHeight || this.config.scroll.bannerOffset;
    
    return headerHeight + bannerHeight + this.config.scroll.additionalOffset;
  }

  /**
   * スクロールアニメーションのセットアップ
   */
  setupScrollAnimations() {
    const animatedElements = RBSHelpers.getElements('.feature-card, .reason-item, .price-card, .faq-item, .news-item, .bottom-message, .feature-number');
    
    if (animatedElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-on-scroll');
          
          // 特別なアニメーション
          if (entry.target.classList.contains('feature-number')) {
            entry.target.classList.add('animate-bounce');
          }
          
          observer.unobserve(entry.target);
          this.emit('ui:elementAnimated', { element: entry.target });
          eventBus.emit('ui:elementAnimated', { element: entry.target });
        }
      });
    }, this.config.animation);

    animatedElements.forEach(element => observer.observe(element));
    this.observers.set('scrollAnimation', observer);
  }

  /**
   * ヘッダー効果のセットアップ
   */
  setupHeaderEffects() {
    const header = RBSHelpers.getElement('header');
    if (!header) return;

    const scrollHandler = RBSHelpers.throttle(() => {
      this.updateHeaderBackground();
      this.updateStatusBannerPosition();
    }, 16); // 60fps

    this.addEventListener(window, 'scroll', scrollHandler);
  }

  /**
   * ヘッダー背景を更新
   */
  updateHeaderBackground() {
    const header = RBSHelpers.getElement('header');
    if (!header) return;

    if (window.scrollY > 100) {
      header.style.background = 'rgba(255, 255, 255, 0.95)';
      header.style.backdropFilter = 'blur(10px)';
    } else {
      header.style.background = '#ffffff';
      header.style.backdropFilter = 'none';
    }
  }

  /**
   * ステータスバナー位置を更新
   */
  updateStatusBannerPosition() {
    const header = RBSHelpers.getElement('header');
    const statusBanner = RBSHelpers.getElement('.status-banner');
    
    if (statusBanner && header) {
      const headerHeight = header.offsetHeight;
      statusBanner.style.top = `${headerHeight + 8}px`;
    }
  }

  /**
   * ヒーローアニメーションのセットアップ
   */
  setupHeroAnimations() {
    this.addEventListener(window, 'load', () => {
      this.initializeHeroContent();
      this.setupVideoHandling();
      this.updateStatusBannerPosition();
    });
  }

  /**
   * ヒーローコンテンツを初期化
   */
  initializeHeroContent() {
    const heroContent = RBSHelpers.getElement('.hero-content');
    if (!heroContent) return;

    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(50px)';

    setTimeout(() => {
      heroContent.style.transition = 'opacity 1.2s ease-out, transform 1.2s ease-out';
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
      
      this.emit('ui:heroAnimated');
      eventBus.emit('ui:heroAnimated');
    }, this.config.video.animationDelay);
  }

  /**
   * 動画処理のセットアップ
   */
  setupVideoHandling() {
    const heroVideo = RBSHelpers.getElement('#hero-video');
    if (!heroVideo) return;

    // 動画読み込み完了時
    this.addEventListener(heroVideo, 'loadeddata', () => {
      this.emit('ui:videoLoaded');
      eventBus.emit('ui:videoLoaded');
    });

    // 動画エラー時
    this.addEventListener(heroVideo, 'error', () => {
      console.log('動画の読み込みでエラーが発生しました。グラデーション背景を使用します。');
      heroVideo.style.display = 'none';
      this.emit('ui:videoError');
      eventBus.emit('ui:videoError');
    });

    // タイムアウト処理
    setTimeout(() => {
      if (heroVideo.readyState === 0) {
        console.log('動画の読み込みがタイムアウトしました。');
        heroVideo.style.display = 'none';
        this.emit('ui:videoTimeout');
        eventBus.emit('ui:videoTimeout');
      }
    }, this.config.video.loadTimeout);

    // 動画の表示制御
    this.setupVideoVisibilityControl(heroVideo);
  }

  /**
   * 動画の表示制御
   */
  setupVideoVisibilityControl(heroVideo) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          heroVideo.play().catch(() => {});
        } else {
          heroVideo.pause();
        }
      });
    });

    videoObserver.observe(heroVideo);
    this.observers.set('video', videoObserver);

    // ページ非表示時の処理
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden) {
        heroVideo.pause();
      } else if (RBSHelpers.isElementInViewport(heroVideo)) {
        heroVideo.play().catch(() => {});
      }
    });
  }

  /**
   * フローティングシェイプのセットアップ
   */
  setupFloatingShapes() {
    this.addEventListener(document, 'DOMContentLoaded', () => {
      this.createFloatingShapes();
    });
  }

  /**
   * フローティングシェイプを作成
   */
  createFloatingShapes() {
    const shapes = ['🏃‍♂️', '⚡', '🎯', '🏆', '💪', '🌟'];
    const hero = RBSHelpers.getElement('#hero');
    
    if (!hero) return;

    // CSSアニメーションを追加
    this.addFloatingShapeStyles();

    const createShape = () => {
      if (Math.random() > 0.7) {
        const shape = document.createElement('div');
        shape.innerHTML = shapes[Math.floor(Math.random() * shapes.length)];
        shape.className = 'floating-shape';
        shape.style.left = Math.random() * 100 + '%';
        shape.style.top = Math.random() * 100 + '%';
        
        hero.appendChild(shape);
        
        setTimeout(() => {
          if (shape.parentNode) {
            shape.parentNode.removeChild(shape);
          }
        }, 3000);
      }
    };

    setInterval(createShape, 2000);
  }

  /**
   * フローティングシェイプのスタイルを追加
   */
  addFloatingShapeStyles() {
    if (document.querySelector('#floating-shapes-styles')) return;

    const style = document.createElement('style');
    style.id = 'floating-shapes-styles';
    style.textContent = `
      .floating-shape {
        position: absolute;
        font-size: 24px;
        opacity: 0.3;
        pointer-events: none;
        z-index: 0;
        animation: fadeInOut 3s ease-out forwards;
      }
      
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px) scale(0.8); }
        20% { opacity: 0.3; transform: translateY(0) scale(1); }
        80% { opacity: 0.3; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-20px) scale(0.8); }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * クリーンアップ処理
   */
  cleanup() {
    // 親クラスのクリーンアップを実行
    super.cleanup();
    
    // オブザーバーを削除
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

/**
 * ステータス管理クラス
 */
class StatusManager {
  /**
   * ステータス切り替え（グローバル関数として公開）
   */
  static toggle() {
    try {
      console.log('📊 ステータストグル開始');
      
      const statusBanner = RBSHelpers.getElement('.status-banner');
      if (!statusBanner) {
        console.warn('⚠️ ステータスバナーが見つかりません');
        return;
      }

      const statusContent = statusBanner.querySelector('.status-content');
      const toggleIcon = statusBanner.querySelector('.toggle-icon');
      
      // activeクラスの切り替え
      const isCurrentlyActive = statusBanner.classList.contains('active');
      statusBanner.classList.toggle('active');
      const isActive = statusBanner.classList.contains('active');
      
      console.log('📊 ステータス状態変更:', 
        `${isCurrentlyActive ? '展開' : '折りたたみ'} → ${isActive ? '展開' : '折りたたみ'}`);
      
      // コンテンツの表示制御
      if (statusContent) {
        if (isActive) {
          // 展開
          statusContent.style.display = 'block';
          statusContent.style.maxHeight = '0';
          statusContent.style.opacity = '0';
          
          // 次のフレームで展開アニメーション開始
          requestAnimationFrame(() => {
            statusContent.style.maxHeight = '500px';
            statusContent.style.opacity = '1';
          });
        } else {
          // 折りたたみ
          statusContent.style.maxHeight = '0';
          statusContent.style.opacity = '0';
          
          // アニメーション完了後にdisplay: noneを設定
          setTimeout(() => {
            if (!statusBanner.classList.contains('active')) {
              statusContent.style.display = 'none';
            }
          }, 300);
        }
      }
      
      // アイコンの回転
      if (toggleIcon) {
        toggleIcon.style.transform = isActive ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      
      // statusBannerにdata属性を追加して状態を明示
      statusBanner.setAttribute('data-status', isActive ? 'open' : 'closed');
      
      // カスタムイベントの発行
      const event = new CustomEvent('statusToggled', {
        detail: { isActive, element: statusBanner }
      });
      document.dispatchEvent(event);
      
      // eventBusが利用可能な場合は従来のイベントも発行
      if (typeof eventBus !== 'undefined') {
        eventBus.emit('ui:statusToggled', { isActive });
      }
      
      console.log('✅ ステータストグル完了 - 状態:', isActive ? '展開' : '折りたたみ');
      
    } catch (error) {
      console.error('❌ ステータス切り替えエラー:', error);
    }
  }
  
  /**
   * ステータスバナーを初期化
   */
  static init() {
    try {
      console.log('📊 ステータスバナー初期化開始');
      
      const statusBanner = RBSHelpers.getElement('.status-banner');
      if (!statusBanner) {
        console.warn('⚠️ ステータスバナーが見つかりません');
        return false;
      }
      
      const statusContent = statusBanner.querySelector('.status-content');
      if (statusContent) {
        // 初期状態を設定
        statusContent.style.display = 'none';
        statusContent.style.maxHeight = '0';
        statusContent.style.opacity = '0';
        statusContent.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
        statusContent.style.overflow = 'hidden';
      }
      
      const toggleIcon = statusBanner.querySelector('.toggle-icon');
      if (toggleIcon) {
        toggleIcon.style.transition = 'transform 0.3s ease';
        toggleIcon.style.transform = 'rotate(0deg)';
      }
      
      // 初期状態の設定
      statusBanner.classList.remove('active');
      statusBanner.setAttribute('data-status', 'closed');
      
      console.log('✅ ステータスバナー初期化完了');
      return true;
      
    } catch (error) {
      console.error('❌ ステータスバナー初期化エラー:', error);
      return false;
    }
  }
}

// グローバル関数として公開（HTMLから呼び出されるため）
// window.toggleFaq は統一されたFAQManager.jsで管理されます
window.toggleStatus = StatusManager.toggle;

// UIインタラクションマネージャーのインスタンスを作成
const uiManager = new UIInteractionManager();

// DOMContentLoaded後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => uiManager.init());
} else {
  uiManager.init();
}

// グローバルに公開
window.UIInteractionManager = UIInteractionManager;
window.uiManager = uiManager; 