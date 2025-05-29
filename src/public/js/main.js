/**
 * RBS陸上教室 メインエントリーポイント v3.0
 * 新しいアーキテクチャでのアプリケーション起動
 * TypeScript移行対応版
 * 
 * @typedef {Object} ErrorInfo
 * @property {string} message - エラーメッセージ
 * @property {string} stack - スタックトレース
 * @property {string} timestamp - タイムスタンプ
 * @property {string} userAgent - ユーザーエージェント
 * @property {string} url - エラー発生URL
 * 
 * @typedef {Object} DashboardStats
 * @property {number} total - 総記事数
 * @property {number} published - 公開済み記事数
 * @property {number} draft - 下書き記事数
 * @property {number} currentMonth - 今月の記事数
 */

import Application from './app/Application.js';

/**
 * アプリケーションインスタンス
 * @type {Application|null}
 */
let app = null;

/**
 * アプリケーションを初期化
 * @returns {Promise<void>}
 */
async function initializeApp() {
  try {
    console.log('🚀 RBS陸上教室システム v3.0 起動中...');
    
    // 既存のインスタンスがある場合は破棄
    if (app) {
      app.destroy();
    }
    
    // 新しいアプリケーションインスタンスを作成
    app = new Application();
    
    // アプリケーションを初期化
    await app.init();
    
    // グローバルに公開（開発用）
    if (app.config?.debug?.enabled) {
      /** @type {any} */
      const globalScope = window;
      globalScope.RBS = {
        app,
        version: '3.0',
        debug: () => app?.getInfo(),
        modules: () => Array.from(app?.modules.keys() ?? [])
      };
    }
    
    console.log('✅ RBS陸上教室システム v3.0 起動完了');
    
  } catch (error) {
    console.error('❌ アプリケーション起動失敗:', error);
    
    // フォールバック処理
    handleInitializationError(error);
  }
}

/**
 * 初期化エラーを処理
 * @param {Error} error - エラーオブジェクト
 * @returns {void}
 */
function handleInitializationError(error) {
  // エラー情報をローカルストレージに保存
  try {
    /** @type {ErrorInfo} */
    const errorInfo = {
      message: error.message,
      stack: error.stack || '',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    localStorage.setItem('rbs_init_error', JSON.stringify(errorInfo));
  } catch (e) {
    console.warn('エラー情報の保存に失敗:', e);
  }

  // 基本的な機能のフォールバック
  initBasicFallbacks();
}

/**
 * 基本機能のフォールバック
 * @returns {void}
 */
function initBasicFallbacks() {
  console.log('🔄 基本機能のフォールバック実行中...');
  
  // 管理画面の場合の特別な処理
  const currentPage = getCurrentPageFallback();
  if (currentPage === 'admin') {
    console.log('🔧 管理画面用フォールバック処理を開始');
    initAdminFallbacks();
  }
  
  // スムーススクロール
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href')?.substring(1);
      if (targetId) {
        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // モバイルメニュー
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      menuToggle.classList.toggle('active');
    });
  }

  // レッスン状況トグル（フォールバック版）
  const statusToggleElement = document.querySelector('[data-action="toggle-status"]');
  if (statusToggleElement) {
    statusToggleElement.addEventListener('click', () => {
      const statusBanner = document.getElementById('today-status');
      
      if (statusBanner) {
        const isActive = statusBanner.classList.contains('active');
        
        if (isActive) {
          statusBanner.classList.remove('active');
          statusToggleElement.setAttribute('aria-expanded', 'false');
        } else {
          statusBanner.classList.add('active');
          statusToggleElement.setAttribute('aria-expanded', 'true');
        }
        
        console.log('📱 フォールバック版レッスン状況トグル実行');
      }
    });
  }

  // 基本的なFAQフォールバック（ActionHandlerが利用できない場合のみ）
  if (!window.RBS?.app?.modules?.has('ActionHandler')) {
    document.querySelectorAll('[data-action="toggle-faq"]').forEach(question => {
      question.addEventListener('click', () => {
        const faqItem = question.closest('.faq-item');
        if (faqItem) {
          // アコーディオン動作: 他のFAQを閉じる
          document.querySelectorAll('.faq-item.active').forEach(item => {
            if (item !== faqItem) {
              item.classList.remove('active');
            }
          });
          
          // 現在のFAQをトグル
          faqItem.classList.toggle('active');
          const isActive = faqItem.classList.contains('active');
          question.setAttribute('aria-expanded', isActive.toString());
          
          console.log('📱 フォールバック版FAQトグル実行');
        }
      });
    });
  }

  // スクロールトップボタン
  const scrollTopBtn = document.querySelector('.scroll-to-top');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.pageYOffset > 300);
    });
    
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  console.log('✅ 基本機能のフォールバック完了');
}

/**
 * 管理画面用のフォールバック処理
 * @returns {void}
 */
function initAdminFallbacks() {
  console.log('🔧 管理画面用フォールバック処理開始');
  
  // タブ切り替えのフォールバック
  document.querySelectorAll('.nav-item[data-tab]').forEach(navItem => {
    navItem.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = navItem.dataset.tab;
      if (tabName) {
        switchTabFallback(tabName);
      }
    });
  });

  // クイックアクションのフォールバック
  document.querySelectorAll('[data-action="switch-tab"]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = button.dataset.tab;
      if (tabName) {
        switchTabFallback(tabName);
      }
    });
  });

  // 外部リンクのフォールバック
  document.querySelectorAll('[data-action="open-external"]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const url = button.dataset.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  });

  // モーダル閉じるボタンのフォールバック
  document.querySelectorAll('[data-action="close-modal"]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      closeModalFallback();
    });
  });

  // ログアウトボタンのフォールバック
  document.querySelectorAll('[data-action="logout"]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('ログアウトしますか？')) {
        window.location.href = 'admin-login.html';
      }
    });
  });

  // 初期タブを表示
  switchTabFallback('dashboard');

  console.log('✅ 管理画面用フォールバック処理完了');
}

/**
 * フォールバック版タブ切り替え
 * @param {string} tabName - タブ名
 * @returns {void}
 */
function switchTabFallback(tabName) {
  console.log(`🔄 フォールバック版タブ切り替え: ${tabName}`);
  
  // ナビゲーションアイテムの更新
  document.querySelectorAll('.nav-item').forEach(navItem => {
    navItem.classList.remove('active');
    if (navItem.dataset.tab === tabName) {
      navItem.classList.add('active');
    }
  });

  // セクションの表示切り替え
  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.remove('active');
    if (section.id === tabName) {
      section.classList.add('active');
    }
  });

  // タブ固有の初期化
  initTabContentFallback(tabName);
}

/**
 * フォールバック版タブ初期化
 * @param {string} tabName - タブ名
 * @returns {void}
 */
function initTabContentFallback(tabName) {
  switch (tabName) {
    case 'dashboard':
      // 統計情報の更新
      updateStatsFallback();
      break;
    case 'lesson-status':
      // 現在の日付をセット
      const today = new Date().toISOString().split('T')[0];
      const dateInput = document.getElementById('lesson-date');
      if (dateInput instanceof HTMLInputElement) {
        dateInput.value = today;
      }
      break;
  }
}

/**
 * フォールバック版統計更新
 * @returns {void}
 */
function updateStatsFallback() {
  /** @type {DashboardStats} */
  const stats = {
    total: 5,
    published: 3,
    draft: 2,
    currentMonth: 1
  };
  
  /**
   * 統計値を更新
   * @param {string} id - 要素ID
   * @param {number} value - 値
   */
  const updateStat = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value.toString();
    }
  };
  
  updateStat('total-articles', stats.total);
  updateStat('published-articles', stats.published);
  updateStat('draft-articles', stats.draft);
  updateStat('current-month-articles', stats.currentMonth);
}

/**
 * フォールバック版モーダル閉じる
 * @returns {void}
 */
function closeModalFallback() {
  const modal = document.getElementById('modal');
  if (modal instanceof HTMLElement) {
    modal.style.display = 'none';
  }
}

/**
 * 現在のページを判定（フォールバック版）
 * @returns {PageType}
 */
function getCurrentPageFallback() {
  const path = window.location.pathname;
  const filename = path.split('/').pop()?.replace('.html', '') ?? '';
  
  // 明確なマッピング
  switch (filename) {
    case 'index':
    case '':
      return 'index';
    case 'admin':
      return 'admin';
    case 'admin-login':
      return 'admin-login';
    case 'news':
      return 'news';
    case 'news-detail':
      return 'news-detail';
    default:
      // フォールバック: プレフィックスで判定
      if (filename.startsWith('admin')) {
        return 'admin';
      }
      if (filename.startsWith('news')) {
        return 'news';
      }
      return 'index';
  }
}

/**
 * ページ離脱時の処理
 */
window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});

/**
 * DOMContentLoaded イベントで初期化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOMが既に読み込まれている場合
  setTimeout(initializeApp, 0);
}

// エクスポート
export { app, initializeApp }; 