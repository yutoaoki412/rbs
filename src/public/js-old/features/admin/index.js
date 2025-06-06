/**
 * 管理機能統合モジュール
 * @version 4.0.0 - 統一認証システム対応
 */

import { AdminActionService } from './services/AdminActionService.js';
import { AdminSystemService } from './services/AdminSystemService.js';
import { getArticleDataService } from './services/ArticleDataService.js';
import { getLessonStatusStorageService } from '../../shared/services/LessonStatusStorageService.js';
import { getAdminNotificationService, adminNotify, adminLog, adminToast, adminModal } from './services/AdminNotificationService.js';
import { authManager } from '../auth/AuthManager.js';
import { CONFIG } from '../../shared/constants/config.js';

// グローバル管理サービス
let adminActionService = null;
let adminSystemService = null;

/**
 * 管理画面機能を初期化
 * @returns {Promise<void>}
 */
export async function initAdminFeature() {
  try {
    console.log('🏗️ 管理画面機能初期化開始');
    
    // 1. 認証確認
    authManager.init();
    if (!authManager.isAuthenticated()) {
      console.warn('❌ 認証チェック失敗 - ログインページにリダイレクト');
      
      if (!window.location.pathname.includes('admin-login.html')) {
        authManager.logout();
        window.location.replace('admin-login.html?from=admin');
      }
      return;
    }

    // 2. 管理機能の初期化
    const services = await initializeAdminFeatures();

    // 3. グローバルアクセス設定
    if (typeof window !== 'undefined') {
      window.authManager = authManager;
      window.adminActionService = services.adminActionService;
      window.adminSystemService = services.adminSystemService;
      window.uiManagerService = services.uiManagerService;
      window.adminNotificationService = services.notificationService;
      
      // 便利なヘルパー関数
      window.adminNotify = adminNotify;
      window.adminLog = adminLog;
      window.adminToast = adminToast;
      window.adminModal = adminModal;
    }

    console.log('✅ 管理画面機能初期化完了');

  } catch (error) {
    console.error('❌ 管理画面機能初期化エラー:', error);
    
    // エラー時のフォールバック
    if (!window.location.pathname.includes('admin-login.html')) {
      authManager.logout();
      window.location.replace('admin-login.html?from=admin');
    }
    
    throw error;
  }
}

/**
 * 管理機能の初期化
 * @returns {Promise<Object>}
 */
export async function initializeAdminFeatures() {
  console.log('🔧 管理機能初期化開始');
  
  try {
    // 通知システムの初期化（最優先）
    const notificationService = getAdminNotificationService();
    await notificationService.init();
    
    // メインサービスの初期化
    if (!adminActionService) {
      adminActionService = new AdminActionService();
    }
    await adminActionService.init();
    
    if (!adminSystemService) {
      adminSystemService = new AdminSystemService();
    }
    await adminSystemService.init();
    
    // データサービスの初期化（エラーがあっても続行）
    const dataServicePromises = [
      initDataService(getArticleDataService()),
      initDataService(getLessonStatusStorageService())
    ];
    
    await Promise.allSettled(dataServicePromises);
    
    // 初期化完了の通知
    adminLog('管理機能の初期化が完了しました', 'info', 'system');
    console.log('✅ 管理機能初期化完了');
    
    return {
      adminActionService,
      adminSystemService,
      articleDataService: getArticleDataService(),
      lessonStatusService: getLessonStatusStorageService(),
      notificationService,
      uiManagerService: adminActionService.uiManagerService,
      instagramDataService: adminActionService.instagramDataService,
      newsFormManager: adminActionService.newsFormManager
    };
    
  } catch (error) {
    console.error('❌ 管理機能初期化エラー:', error);
    
    // エラーを通知システムにも記録
    if (window.adminLog) {
      window.adminLog(`初期化エラー: ${error.message}`, 'error', 'system');
    }
    
    throw error;
  }
}

/**
 * データサービスの安全な初期化
 * @private
 */
async function initDataService(service) {
  try {
    if (service && !service.initialized) {
      await service.init();
    }
  } catch (error) {
    console.warn('データサービス初期化失敗:', error.message);
  }
}

/**
 * 管理機能の破棄
 * @returns {Promise<void>}
 */
export async function destroyAdminFeature() {
  try {
    console.log('🗑️ 管理機能破棄開始');
    
    if (adminActionService) {
      adminActionService.destroy();
      adminActionService = null;
    }
    
    if (adminSystemService) {
      adminSystemService.destroy();
      adminSystemService = null;
    }
    
    console.log('✅ 管理機能破棄完了');
  } catch (error) {
    console.error('❌ 管理機能破棄エラー:', error);
  }
}

// エクスポート
export {
  adminActionService,
  adminSystemService,
  getArticleDataService as articleDataService,
  getLessonStatusStorageService as lessonStatusService,
  getAdminNotificationService as notificationService,
  adminNotify,
  adminLog,
  adminToast,
  adminModal
};