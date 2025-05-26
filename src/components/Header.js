/**
 * Header Component
 * ヘッダーナビゲーションとモバイルメニューを管理するコンポーネント
 * 統一されたクラス設計とエラーハンドリングを実装
 */
class Header {
  constructor(options = {}) {
    this.options = {
      logoSrc: 'images/lp-logo.png',
      logoAlt: 'RBS陸上教室 Running & Brain School',
      loginUrl: 'https://hacomono.jp/',
      scrollThreshold: 100,
      animationDuration: 300,
      breakpoint: 768,
      ...options
    };
    
    // 状態管理
    this.state = {
      isScrolled: false,
      isMobileMenuOpen: false,
      isInitialized: false,
      activeSection: null
    };
    
    // DOM要素の参照
    this.elements = {
      header: null,
      nav: null,
      logo: null,
      navLinks: null,
      mobileMenuBtn: null,
      mobileMenu: null,
      hamburgerLines: null
    };
    
    // イベントハンドラーのバインド
    this.boundHandlers = {
      handleScroll: this.handleScroll.bind(this),
      handleResize: this.handleResize.bind(this),
      toggleMobileMenu: this.toggleMobileMenu.bind(this),
      handleSmoothScroll: this.handleSmoothScroll.bind(this),
      handleMobileNavClick: this.handleMobileNavClick.bind(this),
      scrollToTop: this.scrollToTop.bind(this)
    };
    
    this.init();
  }

  /**
   * ヘッダーを初期化
   */
  async init() {
    try {
      await this.render();
      this.cacheElements();
      this.bindEvents();
      this.updateScrollState();
      this.state.isInitialized = true;
      
      // 初期化完了イベントを発火
      this.dispatchEvent('header:initialized', { header: this });
    } catch (error) {
      this.handleError('初期化に失敗しました', error);
    }
  }

  /**
   * ヘッダーHTMLを生成・挿入
   */
  async render() {
    try {
      const headerHTML = this.generateHeaderHTML();
      
      // ヘッダーを挿入（bodyの最初に）
      document.body.insertAdjacentHTML('afterbegin', headerHTML);
      
      // CSSクラスの適用を確認
      await this.waitForElement('.header');
      
    } catch (error) {
      throw new Error(`ヘッダーのレンダリングに失敗: ${error.message}`);
    }
  }

  /**
   * ヘッダーHTMLを生成
   */
  generateHeaderHTML() {
    const navigationItems = [
      { href: '#about', text: 'RBSとは' },
      { href: '#program', text: 'プログラム' },
      { href: '#coach', text: 'コーチ' },
      { href: '#location', text: '教室情報' },
      { href: '#price', text: '料金' },
      { href: '#faq', text: 'よくある質問' },
      { href: 'news.html', text: 'NEWS' }
    ];

    const navItemsHTML = navigationItems.map(item => 
      `<li><a href="${item.href}" class="header-nav-link">${item.text}</a></li>`
    ).join('');

    const mobileNavItemsHTML = navigationItems.map(item => 
      `<a href="${item.href}" class="mobile-nav-link">${item.text}</a>`
    ).join('');

    return `
      <header class="header" role="banner">
        <nav class="header-nav" role="navigation" aria-label="メインナビゲーション">
          <div class="header-logo">
            <a href="#hero" class="header-logo-link" aria-label="ホームに戻る">
              <img src="${this.options.logoSrc}" 
                   alt="${this.options.logoAlt}" 
                   class="header-logo-image"
                   loading="eager">
            </a>
          </div>
          
          <ul class="header-nav-links" role="menubar">
            ${navItemsHTML}
            <li>
              <a href="${this.options.loginUrl}" 
                 class="header-login-btn" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 aria-label="会員ログイン（新しいタブで開く）">
                会員ログイン
              </a>
            </li>
          </ul>
          
          <button class="mobile-menu-btn" 
                  type="button"
                  aria-label="メニューを開く"
                  aria-expanded="false"
                  aria-controls="mobile-menu">
            <span class="hamburger-line" aria-hidden="true"></span>
            <span class="hamburger-line" aria-hidden="true"></span>
            <span class="hamburger-line" aria-hidden="true"></span>
          </button>
        </nav>
        
        <div class="mobile-menu" 
             id="mobile-menu" 
             role="menu" 
             aria-hidden="true">
          <div class="mobile-menu-content">
            ${mobileNavItemsHTML}
            <a href="${this.options.loginUrl}" 
               class="mobile-login-btn" 
               target="_blank" 
               rel="noopener noreferrer"
               role="menuitem">
              会員ログイン
            </a>
          </div>
        </div>
      </header>
    `;
  }

  /**
   * DOM要素をキャッシュ
   */
  cacheElements() {
    try {
      this.elements.header = document.querySelector('.header');
      this.elements.nav = document.querySelector('.header-nav');
      this.elements.logo = document.querySelector('.header-logo-link');
      this.elements.navLinks = document.querySelectorAll('.header-nav-link, .mobile-nav-link');
      this.elements.mobileMenuBtn = document.querySelector('.mobile-menu-btn');
      this.elements.mobileMenu = document.querySelector('.mobile-menu');
      this.elements.hamburgerLines = document.querySelectorAll('.hamburger-line');

      // 必須要素の存在確認
      if (!this.elements.header || !this.elements.mobileMenuBtn) {
        throw new Error('必須のDOM要素が見つかりません');
      }
    } catch (error) {
      this.handleError('DOM要素のキャッシュに失敗', error);
    }
  }

  /**
   * イベントリスナーを設定
   */
  bindEvents() {
    try {
      // スクロールイベント（パフォーマンス最適化）
      this.addThrottledEventListener(window, 'scroll', this.boundHandlers.handleScroll, 16);
      
      // リサイズイベント
      this.addThrottledEventListener(window, 'resize', this.boundHandlers.handleResize, 250);
      
      // モバイルメニューボタン
      this.elements.mobileMenuBtn?.addEventListener('click', this.boundHandlers.toggleMobileMenu);
      
      // ロゴクリック
      this.elements.logo?.addEventListener('click', this.boundHandlers.scrollToTop);
      
      // ナビゲーションリンク
      this.bindNavigationLinks();
      
      // キーボードイベント
      this.bindKeyboardEvents();
      
    } catch (error) {
      this.handleError('イベントリスナーの設定に失敗', error);
    }
  }

  /**
   * ナビゲーションリンクのイベントを設定
   */
  bindNavigationLinks() {
    this.elements.navLinks.forEach(link => {
      const href = link.getAttribute('href');
      
      if (href?.startsWith('#')) {
        link.addEventListener('click', this.boundHandlers.handleSmoothScroll);
      }
      
      if (link.classList.contains('mobile-nav-link')) {
        link.addEventListener('click', this.boundHandlers.handleMobileNavClick);
      }
    });
  }

  /**
   * キーボードイベントを設定
   */
  bindKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.state.isMobileMenuOpen) {
        this.closeMobileMenu();
      }
    });
  }

  /**
   * スロットル付きイベントリスナーを追加
   */
  addThrottledEventListener(element, event, handler, delay) {
    let timeoutId = null;
    const throttledHandler = (...args) => {
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          handler(...args);
          timeoutId = null;
        }, delay);
      }
    };
    
    element.addEventListener(event, throttledHandler);
    return () => element.removeEventListener(event, throttledHandler);
  }

  /**
   * スクロール時の処理
   */
  handleScroll() {
    try {
      const scrollY = window.scrollY;
      const shouldBeScrolled = scrollY > this.options.scrollThreshold;
      
      if (shouldBeScrolled !== this.state.isScrolled) {
        this.state.isScrolled = shouldBeScrolled;
        this.updateScrollState();
      }
      
      // アクティブセクションの更新
      this.updateActiveSection();
      
    } catch (error) {
      this.handleError('スクロール処理でエラー', error);
    }
  }

  /**
   * リサイズ時の処理
   */
  handleResize() {
    try {
      if (window.innerWidth > this.options.breakpoint && this.state.isMobileMenuOpen) {
        this.closeMobileMenu();
      }
    } catch (error) {
      this.handleError('リサイズ処理でエラー', error);
    }
  }

  /**
   * スクロール状態に応じてヘッダーのスタイルを更新
   */
  updateScrollState() {
    if (!this.elements.header) return;
    
    this.elements.header.classList.toggle('scrolled', this.state.isScrolled);
    
    // スクロール状態変更イベントを発火
    this.dispatchEvent('header:scroll-state-changed', { 
      isScrolled: this.state.isScrolled 
    });
  }

  /**
   * アクティブセクションを更新
   */
  updateActiveSection() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + this.getHeight() + 50;
    
    let activeSection = null;
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        activeSection = section.id;
      }
    });
    
    if (activeSection !== this.state.activeSection) {
      this.state.activeSection = activeSection;
      this.setActiveLink(activeSection);
    }
  }

  /**
   * アクティブリンクを設定
   */
  setActiveLink(sectionId) {
    this.elements.navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isActive = href === `#${sectionId}`;
      
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  /**
   * モバイルメニューの開閉
   */
  toggleMobileMenu() {
    try {
      if (this.state.isMobileMenuOpen) {
        this.closeMobileMenu();
      } else {
        this.openMobileMenu();
      }
    } catch (error) {
      this.handleError('モバイルメニューの切り替えに失敗', error);
    }
  }

  /**
   * モバイルメニューを開く
   */
  openMobileMenu() {
    this.state.isMobileMenuOpen = true;
    
    this.elements.mobileMenuBtn.classList.add('active');
    this.elements.mobileMenu.classList.add('active');
    this.elements.header.classList.add('mobile-menu-open');
    document.body.classList.add('mobile-menu-open');
    
    // アクセシビリティ
    this.elements.mobileMenuBtn.setAttribute('aria-label', 'メニューを閉じる');
    this.elements.mobileMenuBtn.setAttribute('aria-expanded', 'true');
    this.elements.mobileMenu.setAttribute('aria-hidden', 'false');
    
    // フォーカス管理
    this.elements.mobileMenu.querySelector('.mobile-nav-link')?.focus();
    
    this.dispatchEvent('header:mobile-menu-opened');
  }

  /**
   * モバイルメニューを閉じる
   */
  closeMobileMenu() {
    this.state.isMobileMenuOpen = false;
    
    this.elements.mobileMenuBtn.classList.remove('active');
    this.elements.mobileMenu.classList.remove('active');
    this.elements.header.classList.remove('mobile-menu-open');
    document.body.classList.remove('mobile-menu-open');
    
    // アクセシビリティ
    this.elements.mobileMenuBtn.setAttribute('aria-label', 'メニューを開く');
    this.elements.mobileMenuBtn.setAttribute('aria-expanded', 'false');
    this.elements.mobileMenu.setAttribute('aria-hidden', 'true');
    
    this.dispatchEvent('header:mobile-menu-closed');
  }

  /**
   * スムーススクロール処理
   */
  handleSmoothScroll(event) {
    try {
      event.preventDefault();
      const targetId = event.target.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        const headerHeight = this.getHeight();
        const targetPosition = targetElement.offsetTop - headerHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        this.dispatchEvent('header:smooth-scroll', { 
          targetId, 
          targetPosition 
        });
      }
    } catch (error) {
      this.handleError('スムーススクロールに失敗', error);
    }
  }

  /**
   * モバイルナビリンククリック処理
   */
  handleMobileNavClick() {
    this.closeMobileMenu();
  }

  /**
   * トップへスクロール
   */
  scrollToTop(event) {
    try {
      event.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      
      this.dispatchEvent('header:scroll-to-top');
    } catch (error) {
      this.handleError('トップスクロールに失敗', error);
    }
  }

  /**
   * ヘッダーの高さを取得
   */
  getHeight() {
    return this.elements.header?.offsetHeight || 0;
  }

  /**
   * 要素が存在するまで待機
   */
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`要素 ${selector} が見つかりませんでした`));
      }, timeout);
    });
  }

  /**
   * カスタムイベントを発火
   */
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  /**
   * エラーハンドリング
   */
  handleError(message, error) {
    console.error(`[Header] ${message}:`, error);
    
    // エラーイベントを発火
    this.dispatchEvent('header:error', { 
      message, 
      error: error.message 
    });
  }

  /**
   * コンポーネントを破棄
   */
  destroy() {
    try {
      // イベントリスナーを削除
      window.removeEventListener('scroll', this.boundHandlers.handleScroll);
      window.removeEventListener('resize', this.boundHandlers.handleResize);
      
      this.elements.mobileMenuBtn?.removeEventListener('click', this.boundHandlers.toggleMobileMenu);
      this.elements.logo?.removeEventListener('click', this.boundHandlers.scrollToTop);
      
      this.elements.navLinks.forEach(link => {
        link.removeEventListener('click', this.boundHandlers.handleSmoothScroll);
        link.removeEventListener('click', this.boundHandlers.handleMobileNavClick);
      });
      
      // DOM要素を削除
      this.elements.header?.remove();
      
      // 状態をリセット
      this.state.isInitialized = false;
      
      // bodyクラスをクリーンアップ
      document.body.classList.remove('mobile-menu-open');
      
      this.dispatchEvent('header:destroyed');
      
    } catch (error) {
      this.handleError('コンポーネントの破棄に失敗', error);
    }
  }

  /**
   * 現在の状態を取得
   */
  getState() {
    return { ...this.state };
  }

  /**
   * オプションを更新
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.dispatchEvent('header:options-updated', { options: this.options });
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Header;
} else if (typeof window !== 'undefined') {
  window.Header = Header;
} 