/**
 * 管理機能統合モジュール
 * @version 3.0.0 - 完全実装版対応
 */

import { adminSystemService } from './services/AdminSystemService.js';
import { uiManagerService } from './services/UIManagerService.js';
import { adminActionService } from './services/AdminActionService.js';
import { getArticleDataService } from './services/ArticleDataService.js';
import { instagramDataService } from './services/InstagramDataService.js';
import { lessonStatusService } from './services/LessonStatusService.js';
import { newsFormManager } from './components/NewsFormManager.js';

/**
 * 管理機能の初期化
 * @returns {Promise<Object>}
 */
export async function initializeAdminFeatures() {
  console.log('🔧 管理機能初期化開始');
  
  try {
    // サービス初期化
    await adminSystemService.init();
    await uiManagerService.init();
    await adminActionService.init();
    
    // データサービス初期化
    const articleDataService = getArticleDataService();
    if (!articleDataService.initialized) {
      await articleDataService.init();
    }
    
    if (!instagramDataService.initialized) {
      await instagramDataService.init();
    }
    
    if (!lessonStatusService.initialized) {
      await lessonStatusService.init();
    }
    
    // フォームマネージャー初期化
    if (!newsFormManager.initialized) {
      await newsFormManager.init();
    }
    
    // グローバルアクセス用にadminActionServiceを公開
    // HTMLのonclickイベントからアクセスするため
    if (typeof window !== 'undefined') {
      window.adminActionService = adminActionService;
      console.log('🌐 adminActionServiceをグローバルに公開');
    }
    
    console.log('✅ 管理機能初期化完了');
    
    return {
      adminSystemService,
      uiManagerService,
      adminActionService,
      articleDataService,
      instagramDataService,
      lessonStatusService,
      newsFormManager
    };
    
  } catch (error) {
    console.error('❌ 管理機能初期化エラー:', error);
    throw error;
  }
}

// エクスポート
export {
  adminSystemService,
  uiManagerService,
  adminActionService,
  getArticleDataService as articleDataService,
  instagramDataService,
  lessonStatusService,
  newsFormManager
};