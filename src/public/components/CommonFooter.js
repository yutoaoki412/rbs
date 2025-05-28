/**
 * 共通フッターコンポーネント
 * ページ間で共通のフッター機能を提供
 */
class CommonFooter {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * フッターを初期化
   * @param {Object} options - 初期化オプション
   */
  init(options = {}) {
    if (this.isInitialized) return;
    
    this.setupScrollToTop();
    this.setupScrollToTopVisibility();
    this.updateCopyright();
    this.isInitialized = true;
  }

  /**
   * 構造化データを挿入
   */
  insertStructuredData(data) {
    // 既存の構造化データを削除
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // 新しい構造化データを作成
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      ...data
    });
    
    document.head.appendChild(script);
  }

  /**
   * トップへスクロール機能をセットアップ
   */
  setupScrollToTop() {
    // グローバル関数として定義
    window.scrollToTop = (event) => {
      if (event) event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  /**
   * 現在の年を取得してフッターに設定
   */
  updateCopyright() {
    const currentYear = new Date().getFullYear();
    const copyrightElements = document.querySelectorAll('.copyright-year');
    
    copyrightElements.forEach(element => {
      element.textContent = currentYear;
    });
  }

  /**
   * スクロールトップボタンの表示/非表示を制御
   */
  setupScrollToTopVisibility() {
    const scrollToTopBtn = document.querySelector('.scroll-to-top');
    if (!scrollToTopBtn) return;

    let ticking = false;

    const updateVisibility = () => {
      const scrollY = window.scrollY;
      
      if (scrollY > 300) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
      
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
  }

  /**
   * フッターリンクの動的更新
   */
  updateFooterLinks(links) {
    const footerLinksContainer = document.querySelector('.footer-links');
    if (!footerLinksContainer || !links) return;

    footerLinksContainer.innerHTML = '';
    
    links.forEach(link => {
      const linkElement = document.createElement('a');
      linkElement.href = link.href;
      linkElement.textContent = link.text;
      if (link.target) linkElement.target = link.target;
      footerLinksContainer.appendChild(linkElement);
    });
  }

  /**
   * フッターの連絡先情報を更新
   */
  updateContactInfo(contactInfo) {
    const contactContainer = document.querySelector('.footer-contact');
    if (!contactContainer || !contactInfo) return;

    contactContainer.innerHTML = '';
    
    if (contactInfo.email) {
      const emailP = document.createElement('p');
      emailP.textContent = `📧 ${contactInfo.email}`;
      contactContainer.appendChild(emailP);
    }
    
    if (contactInfo.phone) {
      const phoneP = document.createElement('p');
      phoneP.textContent = `📞 ${contactInfo.phone}`;
      contactContainer.appendChild(phoneP);
    }
    
    if (contactInfo.address) {
      const addressP = document.createElement('p');
      addressP.textContent = `📍 ${contactInfo.address}`;
      contactContainer.appendChild(addressP);
    }
  }
}

// グローバルに公開
window.CommonFooter = CommonFooter; 