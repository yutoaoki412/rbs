/**
 * RBS陸上教室 メインエントリーポイント
 * アプリケーション全体の初期化とコーディネート
 * @version 2.2.0 - インラインCSS削除・重複統合版
 */

import Application from './core/Application.js';
import { debugPaths } from './shared/constants/paths.js';
import { CONFIG } from './shared/constants/config.js';

console.log('🏃‍♂️ RBS陸上教室 アプリケーション起動中...');

// パス設定のデバッグ（開発環境のみ）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  debugPaths();
}

// 注意: autoFixLinksは各ページで個別に実行するため、ここでは削除
// これにより初期化処理の競合とリダイレクトループを防ぐ

// メインアプリケーションの初期化
const app = new Application();

// バナーメッセージ制御用のユーティリティ（統合版）
function setupBannerControl() {
  const banner = document.querySelector('.important-message-banner');
  const statusBanner = document.querySelector('.lesson-status-banner');
  
  if (banner) {
    // CSSクラスでマージンをリセット
    banner.classList.add('banner-reset-margin');
  }
  
  if (statusBanner) {
    // CSSクラスでマージンをリセット  
    statusBanner.classList.add('banner-reset-margin');
  }
}

// === デバッグ・開発支援ツール ===

/**
 * 認証状態をコンソールに表示（開発用）
 */
window.showAuthStatus = function() {
  try {
    const authData = localStorage.getItem(CONFIG.storage.keys.adminAuth);
    if (!authData) {
      console.log('🔐 認証状態: 未ログイン');
      return;
    }
    
    const parsed = JSON.parse(authData);
    const now = Date.now();
    const isValid = now < parsed.expires;
    
    console.log('🔐 認証状態詳細:', {
      status: isValid ? '✅ 有効' : '❌ 期限切れ',
      token: parsed.token ? parsed.token.substring(0, 20) + '...' : 'なし',
      created: parsed.created ? new Date(parsed.created) : 'N/A',
      expires: parsed.expires ? new Date(parsed.expires) : 'N/A',
      lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : 'N/A',
      remaining: isValid ? Math.round((parsed.expires - now) / 60000) + '分' : '期限切れ',
      version: parsed.version || '不明'
    });
  } catch (error) {
    console.error('❌ 認証データ取得エラー:', error);
  }
};

/**
 * 認証データをクリア（開発用）
 */
window.clearAuthData = function() {
  try {
    localStorage.removeItem(CONFIG.storage.keys.adminAuth);
    localStorage.removeItem(CONFIG.storage.keys.authAttempts);
    localStorage.removeItem(CONFIG.storage.keys.authLastAttempt);
    console.log('🧹 認証データをクリアしました');
    
    // 現在のページがadmin系の場合は警告
    if (window.location.pathname.includes('admin')) {
      console.warn('⚠️ 管理画面から認証データをクリアしました。ページをリロードしてください。');
    }
  } catch (error) {
    console.error('❌ 認証データクリアエラー:', error);
  }
};

/**
 * テスト用セッションを作成（開発用）
 */
window.createTestSession = function(durationHours = 24) {
  try {
    const now = Date.now();
    const testAuthData = {
      token: 'test_' + now + '_' + Math.random().toString(36).substr(2, 9),
      created: now,
      expires: now + (durationHours * 60 * 60 * 1000),
      lastActivity: now,
      version: '2.0'
    };
    
    localStorage.setItem(CONFIG.storage.keys.adminAuth, JSON.stringify(testAuthData));
    console.log('🧪 テストセッションを作成しました:', {
      duration: durationHours + '時間',
      expires: new Date(testAuthData.expires)
    });
  } catch (error) {
    console.error('❌ テストセッション作成エラー:', error);
  }
};

/**
 * アプリケーションエラー表示（統合版）
 */
function showApplicationError(message, isRecoverable = true) {
  // 既存のエラー要素を削除
  const existingError = document.querySelector('.app-error-container');
  if (existingError) {
    existingError.remove();
  }
  
  const errorContainer = document.createElement('div');
  errorContainer.className = 'app-error-container';
  
  errorContainer.innerHTML = `
    <div class="app-error-content">
      <h3 class="app-error-title">⚠️ アプリケーションエラー</h3>
      <p class="app-error-message">${message}</p>
      <div class="app-error-actions">
        ${isRecoverable ? `
          <button onclick="window.location.reload()" class="app-error-btn app-error-btn-primary">
            🔄 ページを再読み込み
          </button>
          <button onclick="this.closest('.app-error-container').remove()" class="app-error-btn app-error-btn-secondary">
            ✕ 閉じる
          </button>
        ` : `
          <button onclick="window.location.reload()" class="app-error-btn app-error-btn-primary">
            🔄 ページを再読み込み
          </button>
        `}
      </div>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
  
  // 自動削除（復旧可能なエラーのみ）
  if (isRecoverable) {
    setTimeout(() => {
      if (errorContainer.parentNode) {
        errorContainer.remove();
      }
    }, 10000);
  }
}

/**
 * 重要情報エラー表示（統合版）
 */
function showCriticalError(message) {
  // 既存のエラー要素を削除
  const existingError = document.querySelector('.critical-error-container');
  if (existingError) {
    existingError.remove();
  }
  
  const errorContainer = document.createElement('div');
  errorContainer.className = 'critical-error-container';
  
  errorContainer.innerHTML = `
    <div class="critical-error-content">
      <h3 class="critical-error-title">🚨 重要なエラー</h3>
      <p class="critical-error-message">${message}</p>
      <div class="critical-error-actions">
        <button onclick="window.location.reload()" class="critical-error-btn critical-error-btn-primary">
          🔄 ページを再読み込み
        </button>
        <button onclick="window.location.href='/'" class="critical-error-btn critical-error-btn-secondary">
          🏠 トップページに戻る
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
}

// アプリケーション開始
app.init().catch(error => {
  console.error('❌ アプリケーション初期化失敗:', error);
  showApplicationError('アプリケーションの初期化に失敗しました。', false);
});

// バナー制御の初期化
document.addEventListener('DOMContentLoaded', setupBannerControl);

// 改善されたグローバルエラーハンドラー
window.addEventListener('error', function(event) {
  // 外部スクリプト（Google関連など）のエラーを無視
  if (event.filename && (
    event.filename.includes('google') || 
    event.filename.includes('search_impl') ||
    event.filename.includes('common.js') ||
    event.filename.includes('gstatic') ||
    event.filename === '' // 外部スクリプトは空になることがある
  )) {
    console.debug('🔇 外部スクリプトエラーを無視:', event.filename);
    return true; // エラーを処理済みとしてマーク
  }
  
  // RBSアプリケーション内のエラーのみログ出力
  if (event.filename && event.filename.includes('/js/')) {
    console.error('🚨 RBSアプリケーションエラー:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    if (event.error && event.error.message.includes('critical')) {
      showCriticalError('重要なエラーが発生しました: ' + event.error.message);
    }
  }
});

// 改善された未捕捉Promise拒否ハンドラー
window.addEventListener('unhandledrejection', function(event) {
  // RBSアプリケーション関連のPromise拒否のみ処理
  if (event.reason && typeof event.reason === 'object' && event.reason.stack) {
    // スタックトレースでRBSコードかどうか判定
    if (event.reason.stack.includes('/js/')) {
      console.error('🚨 RBS未捕捉Promise拒否:', {
        reason: event.reason,
        stack: event.reason.stack
      });
      
      if (typeof event.reason === 'string' && event.reason.includes('critical')) {
        showCriticalError('重要なPromiseエラーが発生しました: ' + event.reason);
      }
    }
  } else if (typeof event.reason === 'string' && event.reason.includes('rbs')) {
    console.error('🚨 RBS未捕捉Promise拒否:', event.reason);
  } else {
    // 外部ライブラリのPromise拒否は無視
    console.debug('🔇 外部Promise拒否を無視:', event.reason);
  }
});

// 開発用ヘルパーのエクスポート
if (CONFIG.debug?.enabled) {
  window.rbsDevTools = {
    showAuthStatus,
    clearAuthData,
    createTestSession,
    showApplicationError,
    showCriticalError
  };
} 