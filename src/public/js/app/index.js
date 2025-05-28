/**
 * RBS陸上教室 インデックスページ
 * トップページ（LP）の初期化処理
 */

import eventBus from '../shared/services/EventBus.js';
import storage from '../shared/services/StorageService.js';
import helpers from '../shared/utils/helpers.js';

const { DOM, Utils } = helpers;

/**
 * インデックスページクラス
 */
class IndexPage {
  constructor(app) {
    this.app = app;
    this.initialized = false;
    this.components = new Map();
  }

  /**
   * ページを初期化
   */
  async init() {
    try {
      console.log('🏠 インデックスページ初期化開始');

      // 基本機能の初期化
      await this.initBasicFeatures();
      
      // UI コンポーネントの初期化
      await this.initComponents();
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('✅ インデックスページ初期化完了');
      
      eventBus.emit('page:index:ready');
      
    } catch (error) {
      console.error('❌ インデックスページ初期化失敗:', error);
      throw error;
    }
  }

  /**
   * 基本機能を初期化
   */
  async initBasicFeatures() {
    // スムーススクロール
    this.initSmoothScroll();
    
    // モバイルメニュー
    this.initMobileMenu();
    
    // FAQ機能
    this.initFAQ();
    
    // スクロールトップボタン
    this.initScrollToTop();
    
    // アニメーション
    this.initAnimations();
  }

  /**
   * スムーススクロールを初期化
   */
  initSmoothScroll() {
    const anchors = DOM.$$('a[href^="#"]');
    
    anchors.forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href').substring(1);
        const target = DOM.$(`#${targetId}`);
        
        if (target) {
          e.preventDefault();
          Utils.smoothScrollTo(target);
        }
      });
    });
  }

  /**
   * モバイルメニューを初期化
   */
  initMobileMenu() {
    const menuToggle = DOM.$('.mobile-menu-toggle');
    const mobileMenu = DOM.$('.mobile-menu');
    
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.contains('open');
        DOM.toggleClass(mobileMenu, 'open', !isOpen);
        DOM.toggleClass(menuToggle, 'active', !isOpen);
        
        // ボディのスクロールを制御
        document.body.style.overflow = isOpen ? '' : 'hidden';
      });

      // メニューリンククリック時に閉じる
      const menuLinks = DOM.$$('.mobile-menu a');
      menuLinks.forEach(link => {
        link.addEventListener('click', () => {
          DOM.toggleClass(mobileMenu, 'open', false);
          DOM.toggleClass(menuToggle, 'active', false);
          document.body.style.overflow = '';
        });
      });
    }
  }

  /**
   * FAQ機能を初期化
   */
  initFAQ() {
    const faqItems = DOM.$$('.faq-item');
    
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      
      if (question && answer) {
        question.addEventListener('click', () => {
          const isOpen = item.classList.contains('open');
          
          // 他のFAQを閉じる
          faqItems.forEach(otherItem => {
            if (otherItem !== item) {
              DOM.toggleClass(otherItem, 'open', false);
            }
          });
          
          // 現在のFAQを切り替え
          DOM.toggleClass(item, 'open', !isOpen);
        });
      }
    });
  }

  /**
   * スクロールトップボタンを初期化
   */
  initScrollToTop() {
    const scrollTopBtn = DOM.$('.scroll-to-top');
    
    if (scrollTopBtn) {
      // スクロール位置による表示制御
      window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset > 300;
        DOM.toggleClass(scrollTopBtn, 'visible', scrolled);
      });

      // クリックイベント
      scrollTopBtn.addEventListener('click', () => {
        Utils.scrollToTop();
      });
    }
  }

  /**
   * アニメーションを初期化
   */
  initAnimations() {
    // Intersection Observer でのスクロールアニメーション
    const animatedElements = DOM.$$('[data-animate]');
    
    if (animatedElements.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const animationType = entry.target.dataset.animate;
              entry.target.classList.add('animated', animationType);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      animatedElements.forEach(element => {
        observer.observe(element);
      });
    }
  }

  /**
   * UIコンポーネントを初期化
   */
  async initComponents() {
    // ニュースカードコンポーネント
    await this.initNewsComponent();
    
    // 体験申込フォーム
    await this.initContactForm();
  }

  /**
   * ニュースコンポーネントを初期化
   */
  async initNewsComponent() {
    const newsContainer = DOM.$('.news-section .news-container');
    
    if (newsContainer) {
      try {
        // 記事データを取得
        const articles = this.getLatestArticles(3);
        
        if (articles.length > 0) {
          newsContainer.innerHTML = articles.map(article => 
            this.createNewsCardHTML(article)
          ).join('');
        } else {
          newsContainer.innerHTML = '<p class="no-news">現在、お知らせはありません。</p>';
        }
      } catch (error) {
        console.error('ニュース表示エラー:', error);
        newsContainer.innerHTML = '<p class="error">ニュースの読み込みに失敗しました。</p>';
      }
    }
  }

  /**
   * 最新記事を取得
   */
  getLatestArticles(limit = 3) {
    const articles = storage.get('articles', []);
    
    return articles
      .filter(article => article.status === 'published')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }

  /**
   * ニュースカードのHTMLを作成
   */
  createNewsCardHTML(article) {
    const categoryMap = {
      announcement: { label: 'お知らせ', class: 'announcement' },
      event: { label: 'イベント', class: 'event' },
      media: { label: 'メディア', class: 'media' },
      important: { label: '重要', class: 'important' }
    };

    const category = categoryMap[article.category] || { label: 'その他', class: 'other' };
    const date = helpers.Date.format(article.date, 'YYYY.MM.DD');
    
    return `
      <article class="news-card" data-id="${article.id}">
        <div class="news-meta">
          <span class="news-category ${category.class}">${category.label}</span>
          <time class="news-date">${date}</time>
        </div>
        <h3 class="news-title">
          <a href="news-detail.html?id=${article.id}">${helpers.Str.escapeHtml(article.title)}</a>
        </h3>
        <p class="news-excerpt">${helpers.Str.truncate(article.excerpt || '', 80)}</p>
      </article>
    `;
  }

  /**
   * お問い合わせフォームを初期化
   */
  async initContactForm() {
    const form = DOM.$('.contact-form');
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleContactSubmit(form);
      });
    }
  }

  /**
   * お問い合わせフォーム送信処理
   */
  handleContactSubmit(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // バリデーション
    const errors = this.validateContactForm(data);
    
    if (errors.length > 0) {
      this.showFormErrors(errors);
      return;
    }

    // 送信処理（実際の実装では外部APIへ送信）
    this.submitContactForm(data);
  }

  /**
   * フォームバリデーション
   */
  validateContactForm(data) {
    const errors = [];
    
    if (!helpers.Validation.required(data.name)) {
      errors.push('お名前を入力してください');
    }
    
    if (!helpers.Validation.required(data.email)) {
      errors.push('メールアドレスを入力してください');
    } else if (!helpers.Validation.email(data.email)) {
      errors.push('正しいメールアドレスを入力してください');
    }
    
    if (!helpers.Validation.required(data.message)) {
      errors.push('お問い合わせ内容を入力してください');
    }
    
    return errors;
  }

  /**
   * フォームエラーを表示
   */
  showFormErrors(errors) {
    // エラー表示の実装
    alert('入力エラー:\n' + errors.join('\n'));
  }

  /**
   * フォーム送信
   */
  async submitContactForm(data) {
    try {
      Utils.showLoading('送信中...');
      
      // 実際の送信処理をここに実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Utils.hideLoading();
      alert('お問い合わせを受け付けました。ありがとうございます。');
      
      // フォームをリセット
      DOM.$('.contact-form').reset();
      
    } catch (error) {
      Utils.hideLoading();
      console.error('送信エラー:', error);
      alert('送信に失敗しました。しばらく時間をおいて再度お試しください。');
    }
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // ページ表示完了イベント
    eventBus.on('app:ready', () => {
      console.log('📱 アプリケーション準備完了');
    });

    // ウィンドウリサイズ
    window.addEventListener('resize', helpers.Performance.debounce(() => {
      this.handleResize();
    }, 250));
  }

  /**
   * ウィンドウリサイズ処理
   */
  handleResize() {
    // モバイルメニューが開いている場合は閉じる
    const mobileMenu = DOM.$('.mobile-menu');
    if (mobileMenu && mobileMenu.classList.contains('open')) {
      DOM.toggleClass(mobileMenu, 'open', false);
      DOM.toggleClass(DOM.$('.mobile-menu-toggle'), 'active', false);
      document.body.style.overflow = '';
    }
  }

  /**
   * ページ情報を取得
   */
  getInfo() {
    return {
      name: 'index',
      initialized: this.initialized,
      components: Array.from(this.components.keys())
    };
  }

  /**
   * ページを破棄
   */
  destroy() {
    this.components.clear();
    this.initialized = false;
    console.log('🏠 インデックスページ破棄完了');
  }
}

/**
 * ページ初期化関数
 */
export async function init(app) {
  const indexPage = new IndexPage(app);
  await indexPage.init();
  return indexPage;
}

export default IndexPage; 