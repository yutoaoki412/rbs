/**
 * RBS陸上教室 メインエントリーポイント
 * アプリケーション全体の初期化とコーディネート
 * @version 2.2.0 - インラインCSS削除・重複統合版
 */

import Application from './Application.js';
import { debugPaths } from '../shared/constants/paths.js';
import { CONFIG } from '../shared/constants/config.js';
import { log } from '../shared/utils/logUtils.js';
import { showApplicationError, showCriticalError, setupGlobalErrorHandlers } from '../shared/utils/errorUtils.js';

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

// === デバッグ・開発支援ツール ===

/**
 * 認証状態をコンソールに表示（開発用）
 */
window.showAuthStatus = function() {
  try {
    const authData = localStorage.getItem(CONFIG.storage.keys.adminSession);
    if (!authData) {
      log.info('DevTools', '認証状態: 未ログイン');
      return;
    }
    
    const parsed = JSON.parse(authData);
    const now = Date.now();
    const isValid = now < parsed.expires;
    
    log.info('DevTools', '認証状態詳細', {
      status: isValid ? '✅ 有効' : '❌ 期限切れ',
      token: parsed.token ? parsed.token.substring(0, 20) + '...' : 'なし',
      created: parsed.created ? new Date(parsed.created) : 'N/A',
      expires: parsed.expires ? new Date(parsed.expires) : 'N/A',
      lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : 'N/A',
      remaining: isValid ? Math.round((parsed.expires - now) / 60000) + '分' : '期限切れ',
      version: parsed.version || '不明'
    });
  } catch (error) {
    log.error('DevTools', '認証データ取得エラー', error);
  }
};

/**
 * 認証データをクリア（開発用）
 */
window.clearAuthData = function() {
  try {
    localStorage.removeItem(CONFIG.storage.keys.adminSession);
    localStorage.removeItem(CONFIG.storage.keys.authAttempts);
    localStorage.removeItem(CONFIG.storage.keys.authLastAttempt);
    log.info('DevTools', '認証データをクリアしました');
    
    // 現在のページがadmin系の場合は警告
    if (window.location.pathname.includes('admin')) {
      log.warn('DevTools', '管理画面から認証データをクリアしました。ページをリロードしてください。');
    }
  } catch (error) {
    log.error('DevTools', '認証データクリアエラー', error);
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
    
    localStorage.setItem(CONFIG.storage.keys.adminSession, JSON.stringify(testAuthData));
    log.info('DevTools', 'テストセッションを作成しました', {
      duration: durationHours + '時間',
      expires: new Date(testAuthData.expires)
    });
  } catch (error) {
    log.error('DevTools', 'テストセッション作成エラー', error);
  }
};

// エラーハンドリング機能は shared/utils/errorUtils.js に統合されました

// アプリケーション開始
app.init().catch(error => {
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

// 開発用ヘルパーのエクスポート
if (CONFIG.debug?.enabled) {
  window.rbsDevTools = {
    showAuthStatus,
    clearAuthData,
    createTestSession,
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
} 