/**
 * 管理機能統合モジュール
 * @version 3.0.0 - 完全実装版対応
 */

import { AdminActionService } from './services/AdminActionService.js';
import { AdminSystemService } from './services/AdminSystemService.js';
import { getArticleDataService } from './services/ArticleDataService.js';
import { getLessonStatusStorageService } from '../../shared/services/LessonStatusStorageService.js';
import { getAdminNotificationService, adminNotify, adminLog, adminToast, adminModal } from './services/AdminNotificationService.js';
import { CONFIG } from '../../shared/constants/config.js';

// グローバル管理サービス
let adminActionService = null;
let adminSystemService = null;

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
    if (!adminActionService) {
      adminActionService = new AdminActionService();
    }
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

/**
 * 管理画面アクションを登録
 * @private
 */
function registerAdminActions() {
  try {
    console.log('🔧 管理画面アクション登録開始');
    
    if (adminActionService) {
      // AdminActionServiceで既にアクションが登録されているため、
      // 追加のアクション登録があればここで実行
      console.log('✅ 管理画面アクション登録完了');
    } else {
      console.warn('⚠️ AdminActionServiceが初期化されていません');
    }
  } catch (error) {
    console.error('❌ 管理画面アクション登録エラー:', error);
  }
}

/**
 * UIイベントを設定
 * @private
 */
function setupUIEvents() {
  try {
    console.log('🎮 UIイベント設定開始');
    
    if (adminActionService) {
      // AdminActionServiceで既にUIイベントが設定されているため、
      // 追加のイベント設定があればここで実行
      console.log('✅ UIイベント設定完了');
    } else {
      console.warn('⚠️ AdminActionServiceが初期化されていません');
    }
  } catch (error) {
    console.error('❌ UIイベント設定エラー:', error);
  }
}

/**
 * 管理画面機能を初期化
 * @returns {Promise<void>}
 */
export async function initAdminFeature() {
  try {
    console.log('🏗️ 管理画面機能初期化開始');
    
    // 1. 認証サービスを最初に初期化
    console.log('🔐 認証サービスを初期化中...');
    const { authService } = await import('../auth/services/AuthService.js');
    
    if (!authService.initialized) {
      await authService.init();
    }

    // 管理画面での認証チェック（checkAdminPageAuth()を使用）
    if (!authService.checkAdminPageAuth()) {
      console.warn('⚠️ 認証チェック失敗 - リダイレクト処理済み');
      return; // checkAdminPageAuth()内でリダイレクト済み
    }

    // ログアウトハンドラーを設定（認証チェック成功後）
    console.log('🔐 ログアウトハンドラーを設定中...');
    authService.setupLogoutHandlers();

    // 2. 管理アクションサービスを初期化
    console.log('👨‍💼 管理アクションサービスを初期化中...');
    if (!adminActionService) {
      adminActionService = new AdminActionService();
    }
    await adminActionService.init();

    // 3. 管理システムサービスを初期化
    console.log('🖥️ 管理システムサービスを初期化中...');
    if (!adminSystemService) {
      adminSystemService = new AdminSystemService();
    }
    await adminSystemService.init();

    // 4. アクション登録
    console.log('🔧 管理画面アクションを登録中...');
    registerAdminActions();

    // 5. UIイベント設定
    console.log('🎮 UIイベントを設定中...');
    setupUIEvents();

    // 6. グローバルサービス公開
    console.log('🌐 グローバルサービス公開中...');
    if (typeof window !== 'undefined') {
      window.adminActionService = adminActionService;
      window.adminSystemService = adminSystemService;
      window.authService = authService;
      window.actionManager = adminActionService.actionManager;
      
      if (adminActionService?.uiManagerService) {
        window.uiManagerService = adminActionService.uiManagerService;
      }
    }

    // 7. 通知システムのテスト（デバッグモード時のみ）
    if (CONFIG.debug?.enabled || window.DEBUG) {
      adminActionService?.testNotificationSystem();
    }

    console.log('✅ 管理画面機能初期化完了');

  } catch (error) {
    console.error('❌ 管理画面機能初期化エラー:', error);
    
    // フォールバック: ログイン画面にリダイレクト
    try {
      const { authService } = await import('../auth/services/AuthService.js');
      authService.redirectToLogin();
    } catch (redirectError) {
      console.error('❌ リダイレクトエラー:', redirectError);
      window.location.href = 'admin-login.html';
    }
    
    throw error;
  }
}

/**
 * 管理画面機能を破棄
 * @returns {Promise<void>}
 */
export async function destroyAdminFeature() {
  try {
    console.log('🗑️ 管理画面機能破棄開始');

    // 管理システムサービスを破棄
    if (adminSystemService) {
      adminSystemService.destroy();
      adminSystemService = null;
    }

    // 管理アクションサービスを破棄
    if (adminActionService) {
      adminActionService.stopSessionMonitoring();
      adminActionService = null;
    }

    // グローバル変数をクリア
    if (typeof window !== 'undefined') {
      delete window.adminActionService;
      delete window.adminSystemService;
      delete window.uiManagerService;
    }

    console.log('✅ 管理画面機能破棄完了');
  } catch (error) {
    console.error('❌ 管理画面機能破棄エラー:', error);
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