/**
 * 共通ヘッダーコンポーネント
 * ページ間で共通のヘッダー機能を提供
 */
class CommonHeader {
  constructor() {
    this.isInitialized = false;
    this.currentPage = null;
  }

  /**
   * ヘッダーを初期化
   * @param {Object} options - 初期化オプション
   */
  init(options = {}) {
    if (this.isInitialized) return;
    
    this.currentPage = options.currentPage || this.detectCurrentPage();
    
    this.setupMobileMenu();
    this.setupSmoothScroll();
    this.setupActiveNavigation();
    this.setupScrollBehavior();
    this.isInitialized = true;
  }

  /**
   * メタデータを設定
   */
  setMetadata(metadata) {
    if (metadata.title) {
      document.title = metadata.title;
    }
    
    if (metadata.description) {
      this.updateMetaTag('description', metadata.description);
    }
    
    if (metadata.keywords) {
      this.updateMetaTag('keywords', metadata.keywords);
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
   * モバイルメニューをセットアップ
   */
  setupMobileMenu() {
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
   * スムーススクロールをセットアップ
   */
  setupSmoothScroll() {
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
   * アクティブナビゲーションをセットアップ
   */
  setupActiveNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const linkPage = link.getAttribute('data-page');
      const linkSection = link.getAttribute('data-section');
      
      // 現在のページまたはセクションをハイライト
      if (linkPage === this.currentPage) {
        link.classList.add('active');
      }
    });
  }

  /**
   * スクロール時のヘッダー動作をセットアップ
   */
  setupScrollBehavior() {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeader = () => {
      const header = document.querySelector('.header');
      const statusBanner = document.querySelector('.status-banner');
      if (!header) return;

      const currentScrollY = window.scrollY;
      const isMobile = window.innerWidth <= 768;
      const headerHeight = isMobile ? 104 : 124;
      
      // スクロール方向に応じてヘッダーの表示/非表示を制御
      if (currentScrollY > 100) {
        if (currentScrollY > lastScrollY) {
          // 下スクロール時は隠す
          header.classList.add('header-hidden');
          if (statusBanner) {
            // ヘッダーが隠れたときはstatus-bannerを上端に固定（隠さない）
            statusBanner.style.top = '0px';
          }
        } else {
          // 上スクロール時は表示
          header.classList.remove('header-hidden');
          if (statusBanner) {
            // ヘッダーが表示されたときは元の位置に戻す
            statusBanner.style.top = `${headerHeight}px`;
          }
        }
      } else {
        // トップ付近では常に表示
        header.classList.remove('header-hidden');
        if (statusBanner) {
          statusBanner.style.top = `${headerHeight}px`;
        }
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
    
    // ウィンドウリサイズ時にも位置を調整
    window.addEventListener('resize', () => {
      const statusBanner = document.querySelector('.status-banner');
      const header = document.querySelector('.header');
      if (statusBanner && header && !header.classList.contains('header-hidden')) {
        const isMobile = window.innerWidth <= 768;
        const headerHeight = isMobile ? 104 : 124;
        statusBanner.style.top = `${headerHeight}px`;
      }
    });
  }

  /**
   * 現在のページを検出
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().replace('.html', '');
    
    if (filename === 'index' || filename === '' || path.endsWith('/')) {
      return 'index';
    }
    
    return filename;
  }

  /**
   * ナビゲーションの状態を更新
   */
  updateNavigation(currentPage, activeSection) {
    this.currentPage = currentPage;
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
      
      const linkPage = link.getAttribute('data-page');
      const linkSection = link.getAttribute('data-section');
      
      if (linkPage === currentPage || linkSection === activeSection) {
        link.classList.add('active');
      }
    });
  }
}

// グローバルに公開
window.CommonHeader = CommonHeader;

// ES6モジュールとしてもエクスポート
export default CommonHeader; 