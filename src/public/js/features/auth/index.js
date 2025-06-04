/**
 * 認証機能メインエントリーポイント
 * 認証関連のサービスとコンポーネントを統合管理
 * @version 2.2.0 - リダイレクトループ防止機能追加
 */

import { authService } from './services/AuthService.js';
import { authActionService } from './services/AuthActionService.js';
import { getCurrentPageType } from '../../shared/utils/urlUtils.js';
import { redirect, PathHelper } from '../../shared/constants/paths.js';

// 認証チェック実行状態管理
let authCheckInProgress = false;
let lastAuthCheck = 0;
const AUTH_CHECK_COOLDOWN = 2000; // 2秒のクールダウン

/**
 * 認証機能を初期化
 * @returns {Promise<AuthService>}
 */
export async function initAuthFeature() {
  console.log('🔐 認証機能初期化開始');
  
  try {
    const pageType = getCurrentPageType();
    
    // 認証サービスを初期化（全ページ共通）
    await authService.init();
    
    // ページ固有の初期化
    switch (pageType) {
      case 'admin-login':
        // ログインページでは認証アクションサービスを初期化
        authActionService.init();
        
        // 認証済みチェック（ログインページでのみ実行）
        await performSafeAuthCheck();
        console.log('🔐 ログインページ機能を初期化');
        break;
        
      case 'admin':
        // 管理画面では認証状態チェックのみ
        await performSafeAuthCheck();
        console.log('🔐 管理画面認証チェック完了');
        break;
        
      default:
        // その他のページでは基本的な認証チェック
        console.log('🔐 基本認証チェック完了');
        break;
    }
    
    console.log('✅ 認証機能初期化完了');
    
    // AuthServiceインスタンスを返す
    return authService;
    
  } catch (error) {
    console.error('❌ 認証機能初期化エラー:', error);
    throw error;
  }
}

/**
 * 安全な認証チェック（重複実行防止機能付き）
 * @private
 */
async function performSafeAuthCheck() {
  const now = Date.now();
  
  // クールダウン期間中は実行しない
  if (authCheckInProgress || (now - lastAuthCheck < AUTH_CHECK_COOLDOWN)) {
    console.log('🔐 認証チェック: クールダウン期間中のためスキップ');
    return;
  }
  
  authCheckInProgress = true;
  lastAuthCheck = now;
  
  try {
    await checkAuthenticationStatus();
  } catch (error) {
    console.error('❌ 認証チェック中にエラーが発生:', error);
  } finally {
    authCheckInProgress = false;
  }
}

/**
 * 認証状態をチェックして適切な処理を実行
 * @private
 */
async function checkAuthenticationStatus() {
  const isAuthenticated = authService.isAuthenticated();
  const currentPage = getCurrentPageType();
  
  console.log('🔐 認証状態チェック:', { isAuthenticated, currentPage });
  
  // 管理画面で未認証の場合はログインページにリダイレクト
  if (currentPage === 'admin' && !isAuthenticated) {
    console.log('🚪 未認証のため、ログインページにリダイレクト');
    
    // 少し待機してからリダイレクト（他の初期化処理との競合を防ぐ）
    setTimeout(() => {
      const currentUrl = encodeURIComponent(window.location.href);
      redirect.toAdminLogin(currentUrl);
    }, 100);
    return;
  }
  
  // ログインページで認証済みの場合は管理画面にリダイレクト
  if (currentPage === 'admin-login' && isAuthenticated) {
    console.log('✅ 認証済みのため、管理画面にリダイレクト');
    
    // 少し待機してからリダイレクト
    setTimeout(() => {
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || PathHelper.getSafeRedirectPath('admin');
      window.location.href = redirectUrl;
    }, 100);
    return;
  }
  
  console.log('🔐 認証状態は適切です。リダイレクトは不要。');
}

/**
 * 認証機能の状態を取得
 * @returns {Object}
 */
export function getAuthStatus() {
  return {
    isAuthenticated: authService.isAuthenticated(),
    sessionInfo: authService.getSessionInfo(),
    securityInfo: authService.getSecurityInfo(),
    authCheckInProgress,
    lastAuthCheck: new Date(lastAuthCheck)
  };
}

/**
 * 認証機能を破棄
 */
export function destroyAuthFeature() {
  console.log('🗑️ 認証機能破棄開始');
  
  try {
    authService.destroy();
    
    // 状態リセット
    authCheckInProgress = false;
    lastAuthCheck = 0;
    
    console.log('✅ 認証機能破棄完了');
  } catch (error) {
    console.error('❌ 認証機能破棄エラー:', error);
  }
}

// 後方互換性のためのグローバル関数エクスポート
export { authService, authActionService }; 