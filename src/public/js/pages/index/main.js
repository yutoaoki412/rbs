/**
 * RBS陸上教室 - メインエントリーポイント
 * 基本的なページ機能とイベントリスナーの設定
 */

/**
 * アプリケーション初期化
 */
function initializeApp() {
  console.log('🔧 RBS陸上教室アプリケーション初期化開始');
  
  // 設定の確認
  if (!window.RBSConfig) {
    console.error('RBSConfig が見つかりません。config.js を先に読み込んでください。');
    return;
  }
  
  // 基本機能の初期化
  initializeNavigation();
  initializeStatusBanner();
  initializeFAQ();
  initializeAnimations();
  initializeNewsSection();
  
  console.log('✅ RBS陸上教室アプリケーション初期化完了');
}

/**
 * ナビゲーション機能の初期化
 */
function initializeNavigation() {
  // スムーススクロール
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        const headerHeight = 120;
        const targetPosition = targetElement.offsetTop - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // モバイルメニュー
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinksContainer = document.querySelector('.nav-links');
  
  if (mobileMenuBtn && navLinksContainer) {
    mobileMenuBtn.addEventListener('click', function() {
      navLinksContainer.classList.toggle('active');
      this.setAttribute('aria-expanded', navLinksContainer.classList.contains('active'));
    });
  }
}

/**
 * ステータスバナー機能の初期化
 */
function initializeStatusBanner() {
  // フォールバックJavaScriptで既に定義されているため、ここでは何もしない
  // HTMLの onclick="toggleStatusContent()" が動作する
  console.log('ステータスバナー機能: フォールバックJavaScriptを使用');
}

/**
 * FAQ機能の初期化
 */
function initializeFAQ() {
  // FAQ機能は既にHTMLで初期化されているため、ここでは何もしない
  console.log('FAQ機能: HTMLで初期化済み');
}

/**
 * アニメーション機能の初期化
 */
function initializeAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animatedElements.length === 0) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          entry.target.classList.add('animated');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  animatedElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
  });
}

/**
 * ニュースセクションの初期化
 */
function initializeNewsSection() {
  const newsContainer = document.getElementById('news-list');
  
  if (!newsContainer) return;
  
  // 既に記事が表示されているかチェック
  setTimeout(() => {
    const loadingElement = newsContainer.querySelector('.loading-news');
    const existingNewsCards = newsContainer.querySelectorAll('.news-card');
    
    // 既に記事が表示されている場合はフォールバック表示をしない
    if (existingNewsCards.length > 0) {
      console.log('記事が既に表示されています。フォールバック表示をスキップします。');
      return;
    }
    
    // ローディング要素が残っている場合のみフォールバック表示
    if (loadingElement) {
      // 管理画面のデータが存在するかチェック
      const adminData = localStorage.getItem('rbs_articles_data');
      let hasPublishedArticles = false;
      
      if (adminData) {
        try {
          const articles = JSON.parse(adminData);
          hasPublishedArticles = articles.some(article => article.status === 'published');
        } catch (error) {
          console.warn('記事データの解析に失敗:', error);
        }
      }
      
      if (hasPublishedArticles) {
        // 管理画面で公開記事があるのに表示されていない場合はエラー表示
        loadingElement.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--primary-red);">
            <p style="font-size: 16px; font-weight: 600;">記事の読み込みでエラーが発生しました</p>
            <p style="font-size: 14px; margin-top: 10px;">
              管理画面で記事が作成されていますが、表示に失敗しています。<br>
              開発者ツールのコンソールをご確認ください。
            </p>
          </div>
        `;
      } else {
        // 記事が存在しない場合の通常表示
        loadingElement.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--gray-medium);">
            <p style="font-size: 16px; font-weight: 600;">お知らせはまだありません</p>
            <p style="font-size: 14px; margin-top: 10px;">管理画面から記事を作成・公開してください</p>
          </div>
        `;
      }
    }
  }, 3000); // 他の処理が完了するまで少し時間を置く
}

/**
 * ページロード時の初期化
 */
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
}); 