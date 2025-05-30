/**
 * 管理機能統合モジュール
 * @version 3.0.0 - 完全実装版対応
 */

import { adminActionService } from './services/AdminActionService.js';
import { getArticleDataService } from './services/ArticleDataService.js';
import { getLessonStatusStorageService } from '../../shared/services/LessonStatusStorageService.js';

/**
 * 管理機能の初期化
 * @returns {Promise<Object>}
 */
export async function initializeAdminFeatures() {
  console.log('🔧 管理機能初期化開始');
  
  try {
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
    
    // グローバルアクセス用にadminActionServiceを公開
    // HTMLのdata-actionイベントからアクセスするため
    if (typeof window !== 'undefined') {
      window.adminActionService = adminActionService;
      console.log('🌐 adminActionServiceをグローバルに公開');
    }
    
    console.log('✅ 管理機能初期化完了');
    
    return {
      adminActionService,
      articleDataService,
      lessonStatusService,
      // その他のサービスはadminActionService内で管理される
      uiManagerService: adminActionService.uiManagerService,
      instagramDataService: adminActionService.instagramDataService,
      newsFormManager: adminActionService.newsFormManager,
      authService: adminActionService.authService
    };
    
  } catch (error) {
    console.error('❌ 管理機能初期化エラー:', error);
    throw error;
  }
}

// エクスポート
export {
  adminActionService,
  getArticleDataService as articleDataService,
  getLessonStatusStorageService as lessonStatusService
};