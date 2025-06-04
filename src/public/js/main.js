/**
 * RBS陸上教室 メインエントリーポイント
 * アプリケーション全体の初期化とコーディネート
 * @version 2.1.0 - パス修正機能統合版
 */

import Application from './core/Application.js';
import { autoFixLinks } from './shared/utils/linkUtils.js';
import { debugPaths } from './shared/constants/paths.js';
import { CONFIG } from './shared/constants/config.js';

console.log('🏃‍♂️ RBS陸上教室 アプリケーション起動中...');

// パス設定のデバッグ（開発環境のみ）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  debugPaths();
}

// リンクパスの自動修正
autoFixLinks();

// メインアプリケーションの初期化
const app = new Application();

// アプリケーション初期化
async function initializeApp() {
  try {
    await app.init();
    console.log('✅ RBS陸上教室 アプリケーション起動完了');
  } catch (error) {
    console.error('❌ アプリケーション初期化エラー:', error);
  }
}

// DOM準備完了時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 開発環境用グローバル公開
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.RBSApp = app;
  window.debugPaths = debugPaths;
}

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
  // HTMLUtilsの初期化エラー専用関数を使用
  import('./shared/utils/htmlUtils.js').then(({ createAppInitErrorHtml }) => {
    const errorContainer = document.createElement('div');
    errorContainer.innerHTML = createAppInitErrorHtml(error);
    
    // 固定位置に表示
    errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(errorContainer);
    
    // 自動で閉じる（開発環境では長めに表示）
    const autoCloseDelay = CONFIG.debug.enabled ? 60000 : 30000;
    setTimeout(() => {
      if (errorContainer.parentNode) {
        errorContainer.parentNode.removeChild(errorContainer);
      }
    }, autoCloseDelay);
    
  }).catch(() => {
    // HTMLUtilsのインポートに失敗した場合はフォールバック
    const errorContainer = document.createElement('div');
    errorContainer.className = 'app-init-error-container';
    errorContainer.innerHTML = `
      <h3 class="app-init-error-title">⚠️ アプリケーション初期化エラー</h3>
      <p class="app-init-error-text">
        アプリケーションの初期化中にエラーが発生しました。<br>
        ページの再読み込みまたは管理者にお問い合わせください。
      </p>
      <div class="app-init-error-actions">
        <button onclick="location.reload()" class="app-init-error-btn app-init-error-btn-primary">ページを再読み込み</button>
      </div>
    `;
    
    // 固定位置に表示
    errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(errorContainer);
  });
} 