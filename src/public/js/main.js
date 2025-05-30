/**
 * RBS陸上教室 メインエントリーポイント
 * 新しいアーキテクチャでのアプリケーション起動
 * @version 2.0.0
 */

import { app } from './core/Application.js';

/**
 * アプリケーションの初期化と起動
 */
async function initializeApplication() {
  try {
    console.log('🚀 RBS陸上教室 v2.0 起動中...');
    
    // テンプレート読み込み完了イベントのリスナー設定
    setupTemplateEventListeners();
    
    // アプリケーションの初期化
    await app.init();
    
    console.log('✅ アプリケーション起動完了');
    
    // グローバルアクセス用（デバッグ・開発支援）
    if (typeof window !== 'undefined') {
      window.RBSApp = app;
      
      // デバッグ情報の表示（開発環境のみ）
      if (isDevMode()) {
        displayDevModeInfo();
      }
    }
    
  } catch (error) {
    console.error('❌ アプリケーション初期化エラー:', error);
    
    // フォールバック処理
    await initializeFallbackMode();
  }
}

/**
 * テンプレート関連イベントリスナーの設定
 */
function setupTemplateEventListeners() {
  // テンプレート読み込み完了イベント
  window.addEventListener('app:templates:loaded', (event) => {
    const { page, templateManager, headerComponent, footerComponent } = event.detail;
    console.log(`🎨 ページテンプレート読み込み完了: ${page}`);
    
    // 開発モードでの詳細情報表示
    if (isDevMode()) {
      console.log('📋 テンプレート詳細情報:', {
        page: page,
        templateManager: !!templateManager,
        headerComponent: !!headerComponent,
        footerComponent: !!footerComponent
      });
    }
    
    // テンプレート読み込み完了の視覚的フィードバック
    showTemplateLoadedFeedback(page);
  });
  
  // フォールバック初期化完了イベント
  window.addEventListener('app:fallback:initialized', (event) => {
    const { error, page } = event.detail;
    console.warn(`⚠️ フォールバック初期化完了: ${page} (原因: ${error})`);
    
    showFallbackNotification(error);
  });
  
  // アプリケーション初期化完了イベント
  window.addEventListener('app:initialized', (event) => {
    const { page, templatesLoaded } = event.detail;
    console.log(`✅ アプリケーション初期化完了: ${page} (テンプレート: ${templatesLoaded ? '正常' : 'フォールバック'})`);
    
    // ページ固有の初期化後処理
    handlePageSpecificInitialization(page, templatesLoaded);
  });
}

/**
 * 開発モードかどうかの判定
 * @returns {boolean}
 */
function isDevMode() {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.search.includes('debug=true');
}

/**
 * 開発モード情報の表示
 */
function displayDevModeInfo() {
  console.log('🐛 開発モード - デバッグ情報:');
  console.log('   - アプリケーション状態:', app.getStatus());
  console.log('   - Layout機能:', app.hasLayoutFeature());
  console.log('   - 利用可能な機能:', app.hasFeature.bind(app));
  console.log('   - サービスアクセス:', app.getService.bind(app));
  
  // Layout パフォーマンス情報
  const layoutPerf = app.getLayoutPerformanceInfo();
  if (layoutPerf) {
    console.log('   - Layout パフォーマンス:', layoutPerf);
  }
  
  // 開発者用グローバル関数の追加
  window.RBSDebug = {
    app: app,
    status: () => app.getStatus(),
    debug: () => app.debug(),
    reloadTemplates: (pageType) => app.reloadTemplates(pageType),
    layoutPerf: () => app.getLayoutPerformanceInfo()
  };
  
  console.log('🔧 デバッグ用ツール: window.RBSDebug で利用可能');
}

/**
 * テンプレート読み込み完了の視覚的フィードバック
 * @param {string} page - ページタイプ
 */
function showTemplateLoadedFeedback(page) {
  if (!isDevMode()) return;
  
  // 開発モードでのみ表示
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.8em;
    z-index: 9998;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  feedback.textContent = `✅ ${page} テンプレート読み込み完了`;
  
  document.body.appendChild(feedback);
  
  // フェードイン → フェードアウト
  setTimeout(() => feedback.style.opacity = '1', 100);
  setTimeout(() => {
    feedback.style.opacity = '0';
    setTimeout(() => feedback.remove(), 300);
  }, 2000);
}

/**
 * フォールバック通知の表示
 * @param {string} error - エラーメッセージ
 */
function showFallbackNotification(error) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
    padding: 1rem;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 9999;
    max-width: 300px;
    font-size: 0.9em;
  `;
  notification.innerHTML = `
    <strong>⚠️ フォールバックモード</strong><br>
    ${error}<br>
    一部機能が制限されています。
    <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2em; cursor: pointer;">×</button>
  `;
  
  document.body.appendChild(notification);
  
  // 8秒後に自動削除
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 8000);
}

/**
 * ページ固有の初期化後処理
 * @param {string} page - ページタイプ
 * @param {boolean} templatesLoaded - テンプレート読み込み成功フラグ
 */
function handlePageSpecificInitialization(page, templatesLoaded) {
  // ページ固有の追加処理
  switch (page) {
    case 'home':
      if (templatesLoaded) {
        // ホームページ固有の追加初期化
        initializeHomePageFeatures();
      }
      break;
      
    case 'news-detail':
    case 'news-list':
      if (templatesLoaded) {
        // ニュースページ固有の追加初期化
        initializeNewsPageFeatures();
      }
      break;
      
    case 'admin':
      if (templatesLoaded) {
        // 管理ページ固有の追加初期化
        initializeAdminPageFeatures();
      }
      break;
  }
}

/**
 * ホームページ固有機能の初期化
 */
function initializeHomePageFeatures() {
  console.log('🏠 ホームページ固有機能を初期化中...');
  
  // スムーススクロールの確認
  const headerComponent = app.getService('layout')?.headerComponent;
  if (headerComponent) {
    console.log('✅ ヘッダーナビゲーション機能有効');
  }
}

/**
 * ニュースページ固有機能の初期化
 */
function initializeNewsPageFeatures() {
  console.log('📰 ニュースページ固有機能を初期化中...');
  
  // ソーシャルシェア機能などの確認
  const templateManager = app.getService('layout')?.templateManager;
  if (templateManager) {
    console.log('✅ ニュース表示機能有効');
  }
}

/**
 * 管理ページ固有機能の初期化
 */
function initializeAdminPageFeatures() {
  console.log('👨‍💼 管理ページ固有機能を初期化中...');
  
  // 管理者認証確認などの処理
  if (app.hasFeature('admin')) {
    console.log('✅ 管理者機能有効');
  }
}

/**
 * フォールバック初期化（エラー時）
 */
async function initializeFallbackMode() {
  console.warn('🔄 フォールバックモードで起動中...');
  
  try {
    // 最低限の機能のみ初期化
    const { actionManager } = await import('./core/ActionManager.js');
    await actionManager.init();
    
    console.log('✅ フォールバックモード起動完了');
    
    // エラー通知の表示
    showFallbackNotification('アプリケーション初期化に失敗しました');
    
  } catch (fallbackError) {
    console.error('❌ フォールバック初期化も失敗:', fallbackError);
    
    // 最終的なエラー表示
    if (typeof window !== 'undefined') {
      const criticalErrorDiv = document.createElement('div');
      criticalErrorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        text-align: center;
        max-width: 400px;
      `;
      criticalErrorDiv.innerHTML = `
        <h3>🚨 重大なエラー</h3>
        <p>アプリケーションを起動できませんでした。</p>
        <button onclick="window.location.reload()" style="
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        ">ページを再読み込み</button>
      `;
      document.body.appendChild(criticalErrorDiv);
    }
  }
}

/**
 * レガシーサポート関数
 * 既存のHTMLページからの呼び出しに対応
 */
window.initializeRBSApp = initializeApplication;

// モジュールロード時の自動初期化（DOMContentLoaded時）
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
  } else {
    // 既にDOMが読み込まれている場合は即座に実行
    initializeApplication();
  }
}

// ES Module環境での直接実行サポート
export { initializeApplication, app };

// CommonJS環境での互換性（Node.js環境等）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeApplication,
    app
  };
} 