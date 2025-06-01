/**
 * 管理機能統合モジュール
 * @version 3.0.0 - 完全実装版対応
 */

import { adminActionService } from './services/AdminActionService.js';
import { getArticleDataService } from './services/ArticleDataService.js';
import { getLessonStatusStorageService } from '../../shared/services/LessonStatusStorageService.js';
import { getAdminNotificationService, adminNotify, adminLog, adminToast, adminModal } from './services/AdminNotificationService.js';

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
    
    // AdminActionServiceの初期化（他のサービスの依存関係も含む）
    await adminActionService.init();
    
    // ArticleDataServiceの初期化確認
    const articleDataService = getArticleDataService();
    if (!articleDataService.initialized) {
      await articleDataService.init();
    }
    
    // LessonStatusStorageServiceの初期化確認
    const lessonStatusService = getLessonStatusStorageService();
    if (!lessonStatusService.initialized) {
      await lessonStatusService.init();
    }
    
    // グローバルアクセス用にサービスを公開
    if (typeof window !== 'undefined') {
      window.adminActionService = adminActionService;
      window.uiManagerService = adminActionService.uiManagerService;
      window.adminNotificationService = notificationService;
      
      // 簡単アクセス用のグローバル関数
      window.adminNotify = adminNotify;
      window.adminLog = adminLog;
      window.adminToast = adminToast;
      window.adminModal = adminModal;
      
      console.log('🌐 全ての管理サービスをグローバルに公開');
    }
    
    // 初期化完了の通知
    adminLog('管理機能の初期化が完了しました', 'info', 'system');
    
    console.log('✅ 管理機能初期化完了');
    
    return {
      adminActionService,
      articleDataService,
      lessonStatusService,
      notificationService,
      // その他のサービスはadminActionService内で管理される
      uiManagerService: adminActionService.uiManagerService,
      instagramDataService: adminActionService.instagramDataService,
      newsFormManager: adminActionService.newsFormManager,
      authService: adminActionService.authService
    };
    
  } catch (error) {
    console.error('❌ 管理機能初期化エラー:', error);
    
    // エラーを通知システムにも記録（可能であれば）
    if (window.adminLog) {
      window.adminLog(`初期化エラー: ${error.message}`, 'error', 'system');
    }
    
    throw error;
  }
}

// エクスポート
export {
  adminActionService,
  getArticleDataService as articleDataService,
  getLessonStatusStorageService as lessonStatusService,
  getAdminNotificationService as notificationService,
  adminNotify,
  adminLog,
  adminToast,
  adminModal
};