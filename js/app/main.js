/**
 * RBS陸上教室 メインエントリーポイント
 * アプリケーション全体の初期化とコーディネート
 * @version 3.0.0 - Supabase完全統合版（LocalStorage削除）
 */

import Application from './Application.js';
import { debugPaths } from '../shared/constants/paths.js';
import { CONFIG } from '../shared/constants/config.js';
import { log } from '../shared/utils/logUtils.js';
import { showApplicationError, showCriticalError, setupGlobalErrorHandlers } from '../shared/utils/errorUtils.js';
import { getAuthSupabaseService } from '../shared/services/AuthSupabaseService.js';

log.info('Main', 'RBS陸上教室 アプリケーション起動中...');

// パス設定のデバッグ（開発環境のみ）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  debugPaths();
}

// 注意: autoFixLinksはApplication.js内で適切なタイミングで実行されます

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

// === デバッグ・開発支援ツール（Supabase版） ===

/**
 * 認証状態をコンソールに表示（開発用・Supabase版）
 */
window.showAuthStatus = async function() {
  try {
    const authService = getAuthSupabaseService();
    await authService.init();
    
    const authInfo = authService.getAuthInfo();
    
    log.info('DevTools', '認証状態詳細 (Supabase)', {
      status: authInfo.isAuthenticated ? '✅ 認証済み' : '❌ 未認証',
      isAdmin: authInfo.isAdmin ? '✅ 管理者' : '❌ 一般ユーザー',
      isSessionValid: authInfo.isSessionValid ? '✅ 有効' : '❌ 無効',
      user: authInfo.user ? {
        id: authInfo.user.id,
        email: authInfo.user.email,
        created_at: authInfo.user.created_at
      } : null,
      session: authInfo.session ? {
        expires_at: authInfo.session.expires_at,
        token_type: authInfo.session.token_type
      } : null
    });
  } catch (error) {
    log.error('DevTools', '認証状態取得エラー', error);
  }
};

/**
 * サインアウト（開発用・Supabase版）
 */
window.signOut = async function() {
  try {
    const authService = getAuthSupabaseService();
    await authService.init();
    
    const result = await authService.signOut();
    
    if (result.success) {
      log.info('DevTools', 'サインアウトしました');
      
      // 現在のページがadmin系の場合は警告
      if (window.location.pathname.includes('admin')) {
        log.warn('DevTools', '管理画面からサインアウトしました。ページをリロードしてください。');
      }
    } else {
      log.error('DevTools', 'サインアウトエラー:', result.error);
    }
  } catch (error) {
    log.error('DevTools', 'サインアウトエラー', error);
  }
};

/**
 * テスト用サインイン（開発用・Supabase版）
 */
window.testSignIn = async function(email = 'admin@rbs.com', password = 'rbs2025admin') {
  try {
    const authService = getAuthSupabaseService();
    await authService.init();
    
    const result = await authService.signIn({ email, password });
    
    if (result.success) {
      log.info('DevTools', 'テストサインインしました', {
        email: result.user.email,
        userId: result.user.id
      });
    } else {
      log.error('DevTools', 'テストサインインエラー:', result.error);
    }
  } catch (error) {
    log.error('DevTools', 'テストサインインエラー', error);
  }
};

/**
 * セッション更新（開発用・Supabase版）
 */
window.refreshSession = async function() {
  try {
    const authService = getAuthSupabaseService();
    await authService.init();
    
    const result = await authService.refreshSession();
    
    if (result.success) {
      log.info('DevTools', 'セッションを更新しました');
    } else {
      log.error('DevTools', 'セッション更新エラー:', result.error);
    }
  } catch (error) {
    log.error('DevTools', 'セッション更新エラー', error);
  }
};

// エラーハンドリング機能は shared/utils/errorUtils.js に統合されました

// アプリケーション開始
app.init().then(() => {
  // 初期化完了をマーク
  if (window.RBSApp) {
    window.RBSApp.initialized = true;
  }
  
  // 初期化完了イベントを発火
  window.dispatchEvent(new CustomEvent('RBSAppLoaded', {
    detail: { timestamp: new Date().toISOString() }
  }));
  
  log.info('Main', 'アプリケーション初期化完了');
}).catch(error => {
  // フォールバック: logが利用できない場合
  if (typeof log !== 'undefined' && log.critical) {
    log.critical('Main', 'アプリケーション初期化失敗', error);
  } else {
    console.error('❌ アプリケーション初期化失敗:', error);
  }
  showApplicationError('アプリケーションの初期化に失敗しました。', false);
});

// DOMContentLoaded後の安全な初期化
document.addEventListener('DOMContentLoaded', function() {
  // バナー制御の初期化
  setupBannerControl();
  
  // エラーハンドラーの設定（遅延実行）
  setTimeout(() => {
    setupGlobalErrorHandlers();
  }, 100);
});

// 開発用ヘルパーのエクスポート（Supabase版）
if (CONFIG.debug?.enabled) {
  window.rbsDevTools = {
    // Supabase認証ツール
    showAuthStatus,
    signOut,
    testSignIn,
    refreshSession,
    // エラー表示ツール
    showApplicationError,
    showCriticalError,
    // ログ管理ツール
    logStatus: () => log.status(),
    logHistory: () => log.history(),
    logStats: () => log.stats(),
    clearLogs: () => log.clear(),
    // ストレージツール（既存）
    storage: window.rbsStorage
  };
  
  log.info('Main', '開発者ツールが利用可能です: window.rbsDevTools');
  log.info('Main', 'Supabase認証ツール: showAuthStatus(), signOut(), testSignIn(), refreshSession()');
} 