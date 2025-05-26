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
   */
  init() {
    if (this.isInitialized) return;
    
    this.setupScrollToTop();
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
}

// グローバルに公開
window.CommonFooter = CommonFooter; 