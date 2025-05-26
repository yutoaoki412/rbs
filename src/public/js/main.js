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
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');
    
    if (question && answer && icon) {
      question.addEventListener('click', function() {
        const isOpen = answer.style.display === 'block';
        
        if (isOpen) {
          answer.style.display = 'none';
          icon.textContent = '+';
          item.classList.remove('active');
        } else {
          answer.style.display = 'block';
          icon.textContent = '−';
          item.classList.add('active');
        }
      });
    }
  });
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
  
  // 簡単なニュース表示（実際のデータがない場合のフォールバック）
  setTimeout(() => {
    const loadingElement = newsContainer.querySelector('.loading-news');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--gray-medium);">
          <p style="font-size: 16px; font-weight: 600;">最新のニュースは準備中です</p>
          <p style="font-size: 14px; margin-top: 10px;">詳細は<a href="news.html" style="color: var(--primary-blue);">ニュースページ</a>をご確認ください</p>
        </div>
      `;
    }
  }, 2000);
}

/**
 * ページロード時の初期化
 */
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
}); 