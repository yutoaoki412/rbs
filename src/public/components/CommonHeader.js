/**
 * 共通ヘッダーコンポーネント
 * ページ間で共通のヘッダー機能を提供
 */
class CommonHeader {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * ヘッダーを初期化
   */
  init() {
    if (this.isInitialized) return;
    
    this.setupMobileMenu();
    this.setupSmoothScroll();
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
}

// グローバルに公開
window.CommonHeader = CommonHeader; 