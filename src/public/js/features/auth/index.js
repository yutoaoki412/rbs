/**
 * 認証機能メインエントリーポイント
 * 認証関連のサービスとコンポーネントを統合管理
 * @version 2.0.0
 */

import { authService } from './services/AuthService.js';
import { authActionService } from './services/AuthActionService.js';
import { getCurrentPageType } from '../../shared/utils/urlUtils.js';

/**
 * 認証機能を初期化
 * @returns {Promise<void>}
 */
export async function initAuthFeature() {
  console.log('🔐 認証機能初期化開始');
  
  try {
    const pageType = getCurrentPageType();
    
    // 認証サービスを初期化（全ページ共通）
    authService.init();
    
    // ページ固有の初期化
    switch (pageType) {
      case 'admin-login':
        // ログインページでは認証アクションサービスを初期化
        authActionService.init();
        console.log('🔐 ログインページ機能を初期化');
        break;
        
      case 'admin':
        // 管理画面では認証状態チェックのみ
        checkAuthenticationStatus();
        console.log('🔐 管理画面認証チェック完了');
        break;
        
      default:
        // その他のページでは基本的な認証チェック
        console.log('🔐 基本認証チェック完了');
        break;
    }
    
    console.log('✅ 認証機能初期化完了');
    
  } catch (error) {
    console.error('❌ 認証機能初期化エラー:', error);
    throw error;
  }
}

/**
 * 認証状態をチェックして適切な処理を実行
 */
function checkAuthenticationStatus() {
  const isAuthenticated = authService.isAuthenticated();
  const currentPage = getCurrentPageType();
  
  console.log('🔐 認証状態チェック:', { isAuthenticated, currentPage });
  
  // 管理画面で未認証の場合はログインページにリダイレクト
  if (currentPage === 'admin' && !isAuthenticated) {
    console.log('🚪 未認証のため、ログインページにリダイレクト');
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `admin-login.html?redirect=${currentUrl}`;
    return;
  }
  
  // ログインページで認証済みの場合は管理画面にリダイレクト
  if (currentPage === 'admin-login' && isAuthenticated) {
    console.log('✅ 認証済みのため、管理画面にリダイレクト');
    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || 'admin.html';
    window.location.href = redirectUrl;
    return;
  }
}

/**
 * 認証機能の状態を取得
 * @returns {Object}
 */
export function getAuthStatus() {
  return {
    isAuthenticated: authService.isAuthenticated(),
    sessionInfo: authService.getSessionInfo(),
    securityInfo: authService.getSecurityInfo()
  };
}

/**
 * 認証機能を破棄
 */
export function destroyAuthFeature() {
  console.log('🗑️ 認証機能破棄開始');
  
  try {
    authService.destroy();
    
    console.log('✅ 認証機能破棄完了');
  } catch (error) {
    console.error('❌ 認証機能破棄エラー:', error);
  }
}

// 後方互換性のためのグローバル関数エクスポート
export { authService, authActionService }; 