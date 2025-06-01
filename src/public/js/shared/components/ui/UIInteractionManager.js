/**
 * UI相互作用管理システム
 * ユーザーインターフェースの相互作用を統一管理
 * @version 2.1.0 - 新アーキテクチャ対応
 */

import { Component } from '../../base/Component.js';
import { EventBus } from '../../services/EventBus.js';

class UIInteractionManager extends Component {
  constructor(config = {}) {
    super({ autoInit: false, ...config });
    
    this.componentName = 'UIInteractionManager';
    this.observers = new Map();
    
    // 設定
    this.config = {
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
      },
      ...config
    };
  }

  /**
   * 初期化処理の実行
   */
  async init() {
    if (this.isInitialized) {
      this.log('既に初期化済みです');
      return;
    }
    
    try {
      this.log('UIInteractionManager v2.0 初期化開始');
      
      this.setupMobileMenu();
      this.setupSmoothScroll();
      this.setupScrollAnimations();
      this.setupHeaderEffects();
      this.setupHeroAnimations();
      this.setupVideoHandling();
      this.setupFloatingShapes();
      
      this.isInitialized = true;
      this.log('UIInteractionManager v2.0 初期化完了');
      
    } catch (error) {
      this.error('UIInteractionManager初期化エラー:', error);
      throw error;
    }
  }

  /**
   * モバイルメニューのセットアップ
   */
  setupMobileMenu() {
    const mobileMenuBtn = this.safeQuerySelector('.mobile-menu-btn');
    const navLinks = this.safeQuerySelector('.nav-links');
    
    if (!mobileMenuBtn || !navLinks) return;

    // メニュー切り替え関数をグローバルに公開（HTMLから呼び出されるため）
    window.toggleMobileMenu = () => {
      try {
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
        navLinks.classList.toggle('active');
        
        EventBus.emit('ui:mobileMenuToggled', { isOpen: !isExpanded });
      } catch (error) {
        this.error('モバイルメニュー切り替えエラー:', error);
      }
    };

    // ナビゲーションリンククリック時の処理
    const navLinksElements = navLinks.querySelectorAll('a');
    navLinksElements.forEach(link => {
      this.addEventListenerToChild(link, 'click', () => {
        this.closeMobileMenu();
      });
    });

    // リサイズ時の処理
    this.addEventListener(window, 'resize', this.debounce(() => {
      this.closeMobileMenu();
    }, 250));
  }

  /**
   * モバイルメニューを閉じる
   */
  closeMobileMenu() {
    const mobileMenuBtn = this.safeQuerySelector('.mobile-menu-btn');
    const navLinks = this.safeQuerySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('active');
    }
  }

  /**
   * デバウンス関数
   * @param {Function} func - 実行する関数
   * @param {number} wait - 待機時間
   * @returns {Function} デバウンスされた関数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * スロットル関数
   * @private
   */
  throttle(func, delay) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }

  /**
   * 要素がビューポート内にあるかチェック
   * @private
   */
  isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
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
        
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        
        EventBus.emit('ui:scrolledToTop');
      } catch (error) {
        this.error('トップスクロールエラー:', error);
      }
    };

    // アンカーリンクのスムーススクロール
    const anchorLinks = this.safeQuerySelectorAll('a[href^="#"]');
    this.safeForEach(anchorLinks, (anchor) => {
      this.addEventListenerToChild(anchor, 'click', (e) => {
        e.preventDefault();
        this.closeMobileMenu();
        
        const targetId = anchor.getAttribute('href');
        const targetElement = this.safeQuerySelector(targetId);
        
        if (targetElement) {
          const totalOffset = this.calculateScrollOffset();
          
          window.scrollTo({
            top: targetElement.offsetTop - totalOffset,
            behavior: 'smooth'
          });
          
          EventBus.emit('ui:scrolledToAnchor', { target: targetId });
        }
      });
    });
  }

  /**
   * スクロールオフセットを計算
   */
  calculateScrollOffset() {
    const header = this.safeQuerySelector('header');
    const statusBanner = this.safeQuerySelector('.status-banner');
    
    const headerHeight = header?.offsetHeight || this.config.scroll.headerOffset;
    const bannerHeight = statusBanner?.offsetHeight || this.config.scroll.bannerOffset;
    
    return headerHeight + bannerHeight + this.config.scroll.additionalOffset;
  }

  /**
   * スクロールアニメーションのセットアップ
   */
  setupScrollAnimations() {
    const animatedElements = this.safeQuerySelectorAll('.feature-card, .reason-item, .price-card, .faq-item, .news-item, .bottom-message, .feature-number');
    
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
          EventBus.emit('ui:elementAnimated', { element: entry.target });
        }
      });
    }, this.config.animation);

    this.safeForEach(animatedElements, (element) => {
      observer.observe(element);
    });
    this.observers.set('scrollAnimation', observer);
  }

  /**
   * ヘッダー効果のセットアップ
   */
  setupHeaderEffects() {
    const header = this.safeQuerySelector('header');
    if (!header) return;

    const scrollHandler = this.throttle(() => {
      this.updateHeaderBackground();
      this.updateStatusBannerPosition();
    }, 16); // 60fps

    this.addEventListener(window, 'scroll', scrollHandler);
  }

  /**
   * ヘッダー背景を更新
   */
  updateHeaderBackground() {
    const header = this.safeQuerySelector('header');
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
    const hero = this.safeQuerySelector('#hero');
    const statusBanner = this.safeQuerySelector('.status-banner');
    
    if (statusBanner && hero) {
      // ステータスバナーのレイアウト確認のみ実行（動的margin調整は削除）
      const heroRect = hero.getBoundingClientRect();
      const statusRect = statusBanner.getBoundingClientRect();
      
      // デバッグ情報のみ出力（実際の位置調整は行わない）
      if (this.debug) {
        console.log('ヒーローセクション位置:', {
          bottom: heroRect.bottom,
          height: heroRect.height
        });
        console.log('ステータスバナー位置:', {
          top: statusRect.top,
          height: statusRect.height
        });
      }
      
      // CSSで定義された間隔を尊重し、動的な調整は行わない
      statusBanner.style.position = '';
      statusBanner.style.top = '';
      statusBanner.style.marginTop = '';
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
    const heroContent = this.safeQuerySelector('.hero-content');
    if (!heroContent) return;

    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(50px)';

    setTimeout(() => {
      heroContent.style.transition = 'opacity 1.2s ease-out, transform 1.2s ease-out';
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
      
      EventBus.emit('ui:heroAnimated');
    }, this.config.video.animationDelay);
  }

  /**
   * 動画処理のセットアップ
   */
  setupVideoHandling() {
    const heroVideo = this.safeQuerySelector('#hero-video');
    if (!heroVideo) return;

    // 動画読み込み完了時
    this.addEventListener(heroVideo, 'loadeddata', () => {
      EventBus.emit('ui:videoLoaded');
    });

    // 動画エラー時
    this.addEventListener(heroVideo, 'error', () => {
      console.log('動画の読み込みでエラーが発生しました。グラデーション背景を使用します。');
      heroVideo.style.display = 'none';
      EventBus.emit('ui:videoError');
    });

    // タイムアウト処理
    setTimeout(() => {
      if (heroVideo.readyState === 0) {
        console.log('動画の読み込みがタイムアウトしました。');
        heroVideo.style.display = 'none';
        EventBus.emit('ui:videoTimeout');
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
      } else if (this.isElementInViewport(heroVideo)) {
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
    const hero = this.safeQuerySelector('#hero');
    
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
  
  /**
   * ログ出力
   * @param {...any} args - ログ引数
   */
  log(...args) {
    console.log(`[${this.componentName}]`, ...args);
  }
  
  /**
   * エラーログ出力
   * @param {...any} args - エラーログ引数
   */
  error(...args) {
    console.error(`[${this.componentName}]`, ...args);
  }
  
  /**
   * 安全なクエリセレクター
   * @param {string} selector - セレクター
   * @param {Element} context - コンテキスト要素
   * @returns {Element|null} 見つかった要素
   */
  safeQuerySelector(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      this.error('セレクター実行エラー:', selector, error);
      return null;
    }
  }
  
  /**
   * 安全なクエリセレクター（複数）
   * @param {string} selector - セレクター
   * @param {Element} context - コンテキスト要素
   * @returns {NodeList} 見つかった要素のリスト
   */
  safeQuerySelectorAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      this.error('セレクター実行エラー:', selector, error);
      return [];
    }
  }
  
  /**
   * 安全なforEach処理
   * @param {NodeList|Array} elements - 要素のリスト
   * @param {Function} callback - コールバック関数
   */
  safeForEach(elements, callback) {
    try {
      if (elements && elements.length > 0) {
        Array.from(elements).forEach(callback);
      }
    } catch (error) {
      this.error('forEach実行エラー:', error);
    }
  }
  
  /**
   * 子要素にイベントリスナーを追加
   * @param {Element} element - 要素
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー
   * @param {Object} options - オプション
   */
  addEventListenerToChild(element, event, handler, options = {}) {
    this.addEventListener(element, event, handler, options);
  }
}

// デフォルトエクスポート
export default UIInteractionManager; 