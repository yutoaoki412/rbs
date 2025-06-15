/**
 * 管理システム統合サービス
 * AdminCore.jsの後継として、管理画面の統合管理とシステム連携を担当
 * @version 3.0.0 - Supabase完全統合版
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { getArticleSupabaseService } from '../../../shared/services/ArticleSupabaseService.js';
import { getLessonStatusSupabaseService } from '../../../shared/services/LessonStatusSupabaseService.js';
import { getInstagramSupabaseService } from '../../../shared/services/InstagramSupabaseService.js';
import { uiManagerService } from './UIManagerService.js';
import { newsFormManager } from '../components/NewsFormManager.js';
import { authManager } from '../../auth/AuthManager.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { redirect } from '../../../shared/constants/paths.js';

export class AdminSystemService {
  constructor() {
    this.componentName = 'AdminSystemService';
    
    // システム状態
    this.systemStatus = {
      articleService: false,
      instagramService: false,
      lessonService: false,
      uiManagerService: false,
      newsFormManager: false,
      authManager: false
    };
    
    // パフォーマンス追跡
    this.performanceMetrics = {
      initTime: null,
      lastActivity: null,
      errorCount: 0
    };
    
    this.initialized = false;
    this.isAuthenticated = false;
  }

  /**
   * 管理システム全体の初期化
   */
  async init() {
    if (this.initialized) {
      console.log('⚠️ AdminSystemService: 既に初期化済み');
      return;
    }

    const startTime = performance.now();
    console.log('🏢 管理システム統合サービス初期化開始');

    try {
      // AuthManagerの状態確認
      if (!authManager.initialized) {
        await authManager.init();
      }
      
      if (authManager.initialized) {
        this.systemStatus.authManager = true;
        this.isAuthenticated = authManager.isAuthenticatedMethod();
        console.log('✅ AuthManagerが利用可能');
      } else {
        console.warn('⚠️ AuthManagerが初期化されていません');
        this.systemStatus.authManager = false;
      }

      // 各サービスの初期化
      await this.initializeServices();
      
      // システム統合とイベント設定
      this.setupSystemIntegration();
      
      // パフォーマンス記録
      this.performanceMetrics.initTime = performance.now() - startTime;
      this.performanceMetrics.lastActivity = new Date();
      
      this.initialized = true;
      
      EventBus.emit('adminSystem:initialized', this.getSystemStatus());
      console.log(`✅ 管理システム初期化完了 (${Math.round(this.performanceMetrics.initTime)}ms)`);
      
    } catch (error) {
      this.performanceMetrics.errorCount++;
      console.error('❌ 管理システム初期化エラー:', error);
      this.handleCriticalError(error);
      throw error;
    }
  }

  /**
   * 各サービスの初期化
   * @private
   */
  async initializeServices() {
    console.log('🔧 管理サービス群を初期化中...');
    
    // Supabaseサービスのインスタンスを取得
    const articleService = getArticleSupabaseService();
    const lessonStatusService = getLessonStatusSupabaseService();
    const instagramService = getInstagramSupabaseService();
    
    const services = [
      { name: 'articleService', service: articleService },
      { name: 'instagramService', service: instagramService },
      { name: 'lessonService', service: lessonStatusService },
      { name: 'uiManagerService', service: uiManagerService },
      { name: 'newsFormManager', service: newsFormManager }
    ];

    for (const { name, service } of services) {
      try {
        if (!service.initialized) {
          await service.init();
        }
        this.systemStatus[name] = service.initialized;
        console.log(`✅ ${name} 初期化完了`);
      } catch (error) {
        console.error(`❌ ${name} 初期化エラー:`, error);
        this.systemStatus[name] = false;
        // 個別のサービス初期化失敗は警告レベルで継続
      }
    }
  }

  /**
   * システム統合とイベント設定
   * @private
   */
  setupSystemIntegration() {
    console.log('🔗 システム統合設定中...');

    // 認証状態変更の監視
    EventBus.on('auth:stateChanged', (data) => {
      this.isAuthenticated = data.authenticated;
      if (!this.isAuthenticated) {
        this.handleLogout();
      }
    });

    // データ保存成功時のUI更新
    EventBus.on('article:saved', (data) => {
      this.handleDataChange('article', data);
    });
    
    EventBus.on('instagram:saved', (data) => {
      this.handleDataChange('instagram', data);
    });
    
    EventBus.on('lessonStatus:updated', (data) => {
      this.handleDataChange('lessonStatus', data);
    });

    // エラーハンドリング
    EventBus.on('error:critical', (data) => {
      this.handleCriticalError(data.error);
    });

    // システム活動追跡
    EventBus.on('*', () => {
      this.performanceMetrics.lastActivity = new Date();
    });

    // レッスン状況管理の統合（AdminCore.jsから移行）
    this.setupLessonStatusIntegration();
    
    // フォーム管理の統合
    this.setupFormIntegration();

    console.log('✅ システム統合設定完了');
  }

  /**
   * レッスン状況管理の統合
   * @private
   */
  setupLessonStatusIntegration() {
    // EventBusイベントの監視（AdminCore.jsから移行）
    EventBus.on('admin:load-lesson-status', () => {
      this.loadLessonStatusToForm();
    });

    EventBus.on('admin:update-lesson-status', () => {
      this.updateLessonStatus();
    });
  }

  /**
   * フォーム管理の統合
   * @private
   */
  setupFormIntegration() {
    // フォーム変更の監視
    EventBus.on('newsForm:changed', (data) => {
      uiManagerService.handleFormChange('news-form', data);
    });

    // 自動保存の通知
    EventBus.on('newsForm:autoSaved', (data) => {
      uiManagerService.showNotification('success', '自動保存されました');
    });
  }

  /**
   * データ変更の処理
   * @private
   * @param {string} type - データタイプ
   * @param {Object} data - データ
   */
  handleDataChange(type, data) {
    console.log(`📊 ${type}データが変更されました:`, data);
    
    // 統計情報の更新
    this.updateSystemStats();
    
    // UI更新通知
    EventBus.emit('adminSystem:dataChanged', { type, data });
  }

  /**
   * システム統計情報の更新
   */
  async updateSystemStats() {
    try {
      // Supabaseサービスから統計情報を取得
      const articleService = getArticleSupabaseService();
      const instagramService = getInstagramSupabaseService();
      const lessonStatusService = getLessonStatusSupabaseService();
      
      const stats = {
        articles: await articleService.getStats(),
        instagram: await instagramService.getStats(),
        lessons: await lessonStatusService.getStatus()
      };
      
      uiManagerService.updateStats(stats);
      EventBus.emit('adminSystem:statsUpdated', stats);
    } catch (error) {
      console.error('❌ 統計情報更新エラー:', error);
    }
  }

  /**
   * レッスン状況をフォームに読み込み（統一モジュールにデリゲート）
   */
  async loadLessonStatusToForm() {
    try {
      console.log('📅 レッスン状況読み込み（Supabaseベース）');
      
      // 統一レッスン状況管理モジュールが利用可能な場合はそれを使用
      if (window.adminCore) {
        const lessonStatusManager = window.adminCore.getModule('lessonStatusManagerModule');
        if (lessonStatusManager && lessonStatusManager.isInitialized) {
          const today = new Date().toISOString().slice(0, 10);
          await lessonStatusManager.loadStatusByDate(today);
          return;
        }
      }
      
      // Supabaseベースの処理
      const today = new Date().toISOString().slice(0, 10);
      const lessonService = getLessonStatusSupabaseService();
      const status = await lessonService.getStatusByDate(today);
      
      if (status) {
        console.log('📅 本日のレッスン状況を読み込み:', status);
        EventBus.emit('lessonStatus:formLoaded', status);
      } else {
        console.log('📅 本日のレッスン状況は設定されていません');
      }
    } catch (error) {
      console.error('❌ レッスン状況読み込みエラー:', error);
      if (typeof uiManagerService !== 'undefined') {
        uiManagerService.showNotification('error', 'レッスン状況の読み込みに失敗しました');
      }
    }
  }

  /**
   * レッスン状況の更新
   */
  async updateLessonStatus() {
    try {
      // この実装は具体的なフォームデータ取得方法に依存
      console.log('📝 レッスン状況更新処理 - 実装が必要');
      EventBus.emit('lessonStatus:updateRequested');
    } catch (error) {
      console.error('❌ レッスン状況更新エラー:', error);
      uiManagerService.showNotification('error', 'レッスン状況の更新に失敗しました');
    }
  }

  /**
   * ログアウト処理
   */
  async logout() {
    try {
      console.log('👋 管理システムからログアウト中...');
      
      // 未保存の変更確認
      if (uiManagerService.hasUnsavedChanges()) {
        const confirmed = await uiManagerService.showConfirmDialog(
          '未保存の変更があります。ログアウトしますか？',
          { title: 'ログアウト確認' }
        );
        
        if (!confirmed) {
          return;
        }
      }
      
      // AuthManagerからのログアウト
      try {
        if (authManager.initialized) {
          const result = await authManager.logout();
          if (result.success) {
            console.log('✅ AuthManagerからのログアウト成功');
            
            // システムクリーンアップ
            this.destroy();
            
            // ログインページへリダイレクト
            this.redirectToLogin();
          } else {
            console.error('❌ AuthManagerログアウトエラー:', result.error);
            await this.performFallbackLogout();
          }
        } else {
          console.warn('⚠️ AuthManagerが利用できません。フォールバック処理を実行');
          await this.performFallbackLogout();
        }
      } catch (error) {
        console.error('❌ AuthManagerログアウトエラー:', error);
        // フォールバック処理
        await this.performFallbackLogout();
      }
      
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
      // フォールバック処理
      await this.performFallbackLogout();
    }
  }

  /**
   * フォールバック ログアウト処理
   * @private
   */
  async performFallbackLogout() {
    try {
      console.log('🔄 フォールバック ログアウト処理開始');
      
      // AuthManager認証をクリア
      try {
        if (authManager.initialized) {
          await authManager.logout();
          console.log('✅ AuthManager認証クリア完了');
        }
      } catch (authError) {
        console.error('❌ AuthManager認証クリアエラー:', authError);
      }
      
      // システムクリーンアップ
      this.destroy();
      
      // ログインページにリダイレクト
      this.redirectToLogin();
      
      console.log('✅ フォールバック ログアウト完了');
    } catch (error) {
      console.error('❌ フォールバック ログアウトエラー:', error);
      // 強制的にページ移動
      this.redirectToLogin();
    }
  }

  /**
   * ログアウト処理（認証状態変更時）
   * @private
   */
  handleLogout() {
    console.log('🔒 認証状態が無効になりました');
    this.destroy();
    this.redirectToLogin();
  }

  /**
   * ログインページへのリダイレクト
   * @private
   */
  redirectToLogin() {
    // 統一されたリダイレクト処理を使用
    redirect.toAdminLogin();
  }

  /**
   * 重大なエラーの処理
   * @private
   * @param {Error} error - エラー
   */
  handleCriticalError(error) {
    this.performanceMetrics.errorCount++;
    console.error('🚨 管理システム重大エラー:', error);
    
    // フォールバックUI表示
    this.showFallbackError(error);
    
    // エラー報告
    EventBus.emit('adminSystem:criticalError', { error, timestamp: new Date() });
  }

  /**
   * フォールバックエラー表示
   * @private
   * @param {Error} error - エラー
   */
  showFallbackError(error) {
    const errorHtml = `
      <div class="admin-error-dialog">
        <h2>⚠️ システムエラー</h2>
        <p>
          管理システムでエラーが発生しました。<br>
          ページを再読み込みしてください。
        </p>
        <div class="error-detail">
          ${error.message}
        </div>
        <div class="error-actions">
          <button onclick="window.location.reload()" class="admin-error-btn admin-error-btn-primary">
            🔄 再読み込み
          </button>
          <button onclick="window.location.href='admin-login.html'" class="admin-error-btn admin-error-btn-secondary">
            🔑 ログイン画面へ
          </button>
        </div>
      </div>
    `;
    
    // 既存のコンテンツを置き換え
    document.body.innerHTML = errorHtml;
  }

  /**
   * システム状態の取得
   * @returns {Object} システム状態
   */
  getSystemStatus() {
    return {
      initialized: this.initialized,
      authenticated: this.isAuthenticated,
      services: { ...this.systemStatus },
      performance: { ...this.performanceMetrics }
    };
  }

  /**
   * パフォーマンス情報の取得
   * @returns {Object} パフォーマンス情報
   */
  getPerformanceInfo() {
    return {
      ...this.performanceMetrics,
      uptime: this.performanceMetrics.initTime ? 
        Date.now() - this.performanceMetrics.initTime : 0
    };
  }

  /**
   * システムの破棄
   */
  destroy() {
    console.log('🧹 管理システムクリーンアップ中...');
    
    // Supabaseサービスのクリーンアップ
    const services = [
      getLessonStatusSupabaseService(),
      getInstagramSupabaseService(),
      getArticleSupabaseService()
    ];
    
    services.forEach(service => {
      if (service && typeof service.destroy === 'function') {
        try {
          service.destroy();
        } catch (error) {
          console.warn('⚠️ サービス破棄エラー:', error);
        }
      }
    });
    
    // イベントリスナーのクリーンアップ
    EventBus.off('auth:stateChanged');
    EventBus.off('article:saved');
    EventBus.off('instagram:saved');
    EventBus.off('lessonStatus:updated');
    EventBus.off('error:critical');
    EventBus.off('admin:load-lesson-status');
    EventBus.off('admin:update-lesson-status');
    EventBus.off('newsForm:changed');
    EventBus.off('newsForm:autoSaved');
    
    // 状態リセット
    this.initialized = false;
    this.isAuthenticated = false;
    this.systemStatus = {
      articleService: false,
      instagramService: false,
      lessonService: false,
      uiManagerService: false,
      newsFormManager: false,
      authManager: false
    };
    
    console.log('✅ 管理システムクリーンアップ完了');
  }
}

// シングルトンインスタンス
let adminSystemServiceInstance = null;

/**
 * AdminSystemServiceのシングルトンインスタンスを取得
 * @returns {AdminSystemService}
 */
export function getAdminSystemService() {
  if (!adminSystemServiceInstance) {
    adminSystemServiceInstance = new AdminSystemService();
  }
  return adminSystemServiceInstance;
}

export const adminSystemService = getAdminSystemService();
export default AdminSystemService; 