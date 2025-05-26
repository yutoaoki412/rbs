/**
 * ナビゲーションコンポーネント
 * ページ間の移動とアクティブ状態の管理
 */
class Navigation {
  constructor() {
    this.currentPage = this.getCurrentPage();
    this.navigationItems = [
      { href: 'index.html', text: 'ホーム', icon: '🏠' },
      { href: 'news.html', text: 'ニュース', icon: '📰' },
      { href: '#about', text: '教室について', icon: '📚' },
      { href: '#schedule', text: 'スケジュール', icon: '📅' },
      { href: '#contact', text: 'お問い合わせ', icon: '📞' }
    ];
    this.init();
  }

  init() {
    this.setupNavigation();
    this.highlightCurrentPage();
    this.setupSmoothScrolling();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
  }

  setupNavigation() {
    // 既存のナビゲーションがある場合は設定を適用
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
      // データ属性を追加してページ識別を容易にする
      const href = link.getAttribute('href');
      if (href) {
        link.setAttribute('data-page', href);
      }

      // クリックイベントの設定
      link.addEventListener('click', (e) => this.handleNavClick(e, link));
    });
  }

  highlightCurrentPage() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      
      const href = link.getAttribute('href');
      if (href === this.currentPage || 
          (this.currentPage === 'index.html' && href === '/') ||
          (href.startsWith('#') && this.currentPage === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  handleNavClick(event, link) {
    const href = link.getAttribute('href');
    
    // ハッシュリンクの場合はスムーススクロール
    if (href.startsWith('#')) {
      event.preventDefault();
      this.scrollToSection(href);
    }
    
    // 外部リンクでない場合はページ遷移の処理
    if (!href.startsWith('http') && !href.startsWith('#')) {
      this.trackPageNavigation(href);
    }
  }

  scrollToSection(hash) {
    const targetElement = document.querySelector(hash);
    
    if (targetElement) {
      const headerHeight = document.querySelector('header')?.offsetHeight || 0;
      const targetPosition = targetElement.offsetTop - headerHeight - 20;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
      
      // URLハッシュを更新
      history.pushState(null, null, hash);
    }
  }

  setupSmoothScrolling() {
    // ページ内リンクのスムーススクロール設定
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = link.getAttribute('href');
        this.scrollToSection(hash);
      });
    });
  }

  trackPageNavigation(page) {
    // ページ遷移の追跡（アナリティクス等で使用）
    console.log(`Navigating to: ${page}`);
    
    // Google Analytics等のトラッキングコードをここに追加可能
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href
      });
    }
  }

  // 動的にナビゲーション項目を追加
  addNavigationItem(item) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const listItem = document.createElement('li');
    const link = document.createElement('a');
    
    link.href = item.href;
    link.textContent = item.text;
    link.setAttribute('data-page', item.href);
    
    if (item.icon) {
      link.innerHTML = `${item.icon} ${item.text}`;
    }
    
    listItem.appendChild(link);
    
    // ログインボタンの前に挿入
    const loginBtn = navLinks.querySelector('.login-btn')?.parentElement;
    if (loginBtn) {
      navLinks.insertBefore(listItem, loginBtn);
    } else {
      navLinks.appendChild(listItem);
    }
    
    // イベントリスナーを追加
    link.addEventListener('click', (e) => this.handleNavClick(e, link));
  }

  // ナビゲーション項目を削除
  removeNavigationItem(href) {
    const link = document.querySelector(`a[data-page="${href}"]`);
    if (link && link.parentElement) {
      link.parentElement.remove();
    }
  }

  // ブレッドクラム生成
  generateBreadcrumb() {
    const breadcrumbContainer = document.querySelector('.breadcrumb');
    if (!breadcrumbContainer) return;

    const pathSegments = window.location.pathname.split('/').filter(segment => segment);
    const breadcrumbItems = ['ホーム'];
    
    // パスに基づいてブレッドクラムを生成
    pathSegments.forEach(segment => {
      switch(segment) {
        case 'news.html':
          breadcrumbItems.push('ニュース');
          break;
        case 'news-detail.html':
          breadcrumbItems.push('ニュース詳細');
          break;
        default:
          breadcrumbItems.push(segment);
      }
    });

    const breadcrumbHtml = breadcrumbItems.map((item, index) => {
      if (index === breadcrumbItems.length - 1) {
        return `<span class="breadcrumb-current">${item}</span>`;
      } else {
        const href = index === 0 ? 'index.html' : '#';
        return `<a href="${href}" class="breadcrumb-link">${item}</a>`;
      }
    }).join(' <span class="breadcrumb-separator">></span> ');

    breadcrumbContainer.innerHTML = breadcrumbHtml;
  }
}

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Navigation;
} 