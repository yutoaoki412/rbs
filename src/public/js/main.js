/**
 * RBS陸上教室 メインエントリーポイント v3.0
 * 新しいアーキテクチャでのアプリケーション起動
 */

import Application from './app/Application.js';

// グローバル変数
let app = null;

/**
 * アプリケーションを初期化
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
      window.RBS = {
        app,
        version: '3.0',
        debug: () => app.getInfo(),
        modules: () => Array.from(app.modules.keys())
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
 */
function handleInitializationError(error) {
  // エラー情報をローカルストレージに保存
  try {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
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
 */
function initBasicFallbacks() {
  console.log('🔄 基本機能のフォールバック実行中...');
  
  // スムーススクロール
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
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

  // FAQ機能
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        item.classList.toggle('open');
      });
    }
  });

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