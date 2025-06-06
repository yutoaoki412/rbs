/**
 * 認証機能メインエントリーポイント
 * @version 6.0.0 - 統一AuthManager対応
 */

import { authManager } from './AuthManager.js';
import { getCurrentPageType } from '../../shared/utils/urlUtils.js';
import { CONFIG } from '../../shared/constants/config.js';

/**
 * 認証機能を初期化
 * @returns {Promise<AuthManager>}
 */
export async function initAuthFeature() {
  console.log('🔐 認証機能初期化開始 (統一AuthManager版)');
  
  try {
    const pageType = getCurrentPageType();
    console.log('📄 ページタイプ:', pageType);
    
    // AuthManager初期化
    authManager.init();
    
    console.log('✅ 認証機能初期化完了');
    return authManager;
    
  } catch (error) {
    console.error('❌ 認証機能初期化エラー:', error);
    throw error;
  }
}

/**
 * 認証状態取得
 * @returns {Object} 認証状態情報
 */
export function getAuthStatus() {
  return {
    isAuthenticated: authManager.isAuthenticated(),
    sessionInfo: authManager.getSessionInfo(),
    environment: CONFIG.app.environment,
    storageKey: CONFIG.storage.keys.adminAuth
  };
}

// グローバルアクセス（デバッグ用）
if (CONFIG.debug.enabled || window.location.hostname === 'localhost') {
  window.authManager = authManager;
  window.getAuthStatus = getAuthStatus;
}

export { authManager }; 