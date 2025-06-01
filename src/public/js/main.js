/**
 * メインアプリケーション起動スクリプト
 * 統合記事管理システム対応版
 * @version 3.0.0
 */

import { initializeApplication } from './Application.js';
import { CONFIG } from './shared/constants/config.js';

/**
 * DOM読み込み完了時の初期化
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 アプリケーション起動開始');
    
    // ステータスバナーの事前初期化（CSSクラス調整）
    preInitializeStatusBanner();
    
    // グローバルエラーハンドラーの設定
    setupGlobalErrorHandlers();
    
    // デバッグ環境の設定
    setupDebugEnvironment();
    
    // アプリケーション初期化（リトライ機能付き）
    const app = await initializeApplicationWithRetry();
    
    // グローバルアクセス用
    window.app = app;
    
    console.log('✅ アプリケーション起動完了');
    
    // 開発環境での便利機能
    if (CONFIG.debug.enabled) {
      setupDevelopmentTools(app);
    }
    
  } catch (error) {
    console.error('❌ アプリケーション起動エラー:', error);
    showInitializationError(error);
  }
});

/**
 * ステータスバナーの事前初期化
 * DOM読み込み直後にステータスバナーの基本的な表示を確保
 */
function preInitializeStatusBanner() {
  try {
    console.log('🎯 ステータスバナー事前初期化開始');
    
    // ステータスバナー要素を検索
    const statusBanners = document.querySelectorAll('.status-banner, #today-status');
    
    if (statusBanners.length > 0) {
      statusBanners.forEach(banner => {
        // 必要なクラスを追加（CSSで定義されたスタイルを適用）
        banner.classList.add('status-banner');
        banner.classList.remove('status-banner-hidden');
        banner.classList.add('status-banner-visible');
        
        // ヒーローセクションとの隙間を完全に削除
        banner.style.marginTop = '0';
        banner.style.marginBottom = '0';
        
        console.log('✅ ステータスバナー表示確保:', banner.id || banner.className);
      });
      
      // 基本構造の確保
      ensureStatusBannerStructure();
      
      // デバッグ用：ステータスバナーの現在の状態をチェック
      if (CONFIG.debug.enabled) {
        setTimeout(() => {
          checkStatusBannerVisibility();
        }, 1000);
      }
    } else {
      console.log('⚠️ ステータスバナー要素が見つかりません。動的作成を準備します。');
    }
    
  } catch (error) {
    console.warn('⚠️ ステータスバナー事前初期化エラー:', error);
  }
}

/**
 * ステータスバナーの基本構造を確保
 */
function ensureStatusBannerStructure() {
  const statusBanner = document.querySelector('#today-status');
  if (statusBanner && !statusBanner.querySelector('.container')) {
    // ヒーローセクションとの隙間を完全に削除
    statusBanner.style.marginTop = '0';
    statusBanner.style.marginBottom = '0';
    
    statusBanner.innerHTML = `
      <div class="container">
        <div class="status-header" data-action="toggle-status" style="cursor: pointer;" aria-expanded="false">
          <div class="status-info">
            <span class="status-dot"></span>
            <span class="status-text">本日のレッスン開催状況</span>
            <span class="status-indicator" id="global-status-indicator">準備中...</span>
          </div>
          <span class="toggle-icon">▼</span>
        </div>
        <div class="status-content">
          <div class="status-details" id="status-details">
            <div class="loading-status">
              <i class="fas fa-spinner fa-spin"></i>
              <p>レッスン状況を読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    console.log('✅ ステータスバナー基本構造を設定しました（隙間削除済み）');
  }
}

/**
 * ステータスバナーの表示状態をデバッグ確認
 */
function checkStatusBannerVisibility() {
  try {
    console.group('🔍 ステータスバナー表示状態チェック');
    
    const statusBanner = document.querySelector('#today-status');
    if (statusBanner) {
      const computedStyle = window.getComputedStyle(statusBanner);
      const rect = statusBanner.getBoundingClientRect();
      
      console.log('要素情報:', {
        id: statusBanner.id,
        classes: Array.from(statusBanner.classList),
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        transform: computedStyle.transform,
        height: rect.height,
        width: rect.width,
        top: rect.top,
        visible: rect.height > 0 && rect.width > 0 && computedStyle.visibility === 'visible'
      });
      
      // 表示されていない場合は警告
      if (rect.height === 0 || computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        console.warn('⚠️ ステータスバナーが非表示になっています');
      } else {
        console.log('✅ ステータスバナーは正常に表示されています');
      }
    } else {
      console.warn('⚠️ ステータスバナー要素が見つかりません');
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('デバッグチェックエラー:', error);
  }
}

/**
 * リトライ機能付きアプリケーション初期化
 * @returns {Promise<Application>}
 */
async function initializeApplicationWithRetry() {
  let lastError = null;
  
  for (let attempt = 1; attempt <= CONFIG.performance.initRetries; attempt++) {
    try {
      console.log(`📱 初期化試行 ${attempt}/${CONFIG.performance.initRetries}`);
      return await initializeApplication();
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ 初期化試行 ${attempt} 失敗:`, error.message);
      
      if (attempt < CONFIG.performance.initRetries) {
        const delay = 1000 * attempt; // 段階的に遅延を増加
        console.log(`🔄 ${delay}ms後に再試行します...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * グローバルエラーハンドラーの設定
 */
function setupGlobalErrorHandlers() {
  // 未処理のエラー
  window.addEventListener('error', (event) => {
    console.error('🚨 グローバルエラー:', event.error);
    
    // 重要なモジュール読み込みエラーの場合は詳細ログ
    if (event.error?.message?.includes('import') || event.error?.message?.includes('module')) {
      console.error('📦 モジュール読み込みエラー詳細:', {
        message: event.error.message,
        filename: event.filename,
        stack: event.error.stack
      });
    }
  });
  
  // 未処理のPromise拒否
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 未処理のPromise拒否:', event.reason);
    
    // モジュール読み込み関連のエラーの場合は詳細情報を表示
    if (event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
        event.reason?.message?.includes('404')) {
      console.error('📦 動的インポートエラー:', {
        reason: event.reason,
        stack: event.reason.stack
      });
    }
  });
}

/**
 * デバッグ環境の設定
 */
function setupDebugEnvironment() {
  // パフォーマンス測定の開始
  if (CONFIG.debug.performance) {
    console.time('🕐 アプリケーション起動時間');
  }
  
  // デバッグ情報の表示
  if (CONFIG.debug.enabled) {
    console.log('🔧 デバッグモード有効');
    console.log('⚙️ 設定情報:', CONFIG);
  }
}

/**
 * 開発ツールの設定
 * @param {Application} app - アプリケーションインスタンス
 */
function setupDevelopmentTools(app) {
  // デバッグコマンドの登録
  window.showAppStatus = () => app.showDebugInfo();
  window.refreshNews = () => {
    if (window.newsDisplayComponent) {
      return window.newsDisplayComponent.refresh();
    }
    console.warn('NewsDisplayComponentが見つかりません');
  };
  
  // 記事ストレージサービスのデバッグ
  window.showArticleStatus = () => {
    if (app.articleStorageService) {
      const status = app.articleStorageService.getStatus();
      console.log('📰 記事ストレージ状況:', status);
      return status;
    }
    console.warn('ArticleStorageServiceが見つかりません');
  };
  
  // 設定情報の表示
  window.showConfig = () => {
    console.log('⚙️ アプリケーション設定:', CONFIG);
    return CONFIG;
  };
  
  // パフォーマンス測定終了
  if (CONFIG.debug.performance) {
    console.timeEnd('🕐 アプリケーション起動時間');
  }
  
  console.log('🛠️ 開発ツールが利用可能です:');
  console.log('  - showAppStatus(): アプリケーション状況表示');
  console.log('  - refreshNews(): ニュース更新');
  console.log('  - showArticleStatus(): 記事ストレージ状況表示');
  console.log('  - showConfig(): 設定情報表示');
}

/**
 * 初期化エラーの表示
 * @param {Error} error - エラーオブジェクト
 */
function showInitializationError(error) {
  // エラーメッセージを画面に表示
  const errorContainer = document.createElement('div');
  errorContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    right: 20px;
    background: #f8d7da;
    color: #721c24;
    padding: 20px;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  
  const isModuleError = error.message?.includes('import') || 
                       error.message?.includes('module') || 
                       error.message?.includes('404');
  
  errorContainer.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #721c24;">⚠️ アプリケーション初期化エラー</h3>
    <p style="margin: 0 0 10px 0;">
      ${isModuleError ? 
        'モジュールの読み込みでエラーが発生しました。ファイルパスを確認してください。' : 
        'アプリケーションの初期化中にエラーが発生しました。'}
    </p>
    ${CONFIG.debug.enabled ? `
    <details style="margin: 10px 0 0 0;">
      <summary style="cursor: pointer; font-weight: bold;">詳細情報</summary>
      <pre style="margin: 10px 0 0 0; padding: 10px; background: #f8f9fa; border-radius: 3px; overflow-x: auto; font-size: 12px; max-height: 200px; overflow-y: auto;">${error.message}\n\n${error.stack || 'スタックトレースなし'}</pre>
    </details>
    ` : ''}
    <div style="margin-top: 15px;">
      <button onclick="location.reload()" style="margin-right: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">ページを再読み込み</button>
      ${CONFIG.debug.enabled ? `
      <button onclick="console.error('アプリケーション初期化エラー:', '${error.message}'); console.error('${error.stack}')" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">コンソールに詳細出力</button>
      ` : ''}
    </div>
  `;
  
  document.body.appendChild(errorContainer);
  
  // 自動で閉じる（開発環境では長めに表示）
  const autoCloseDelay = CONFIG.debug.enabled ? 60000 : 30000;
  setTimeout(() => {
    if (errorContainer.parentNode) {
      errorContainer.parentNode.removeChild(errorContainer);
    }
  }, autoCloseDelay);
} 