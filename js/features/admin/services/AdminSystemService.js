/**
 * 管理システム統合サービス
 * AdminCore.jsの後継として、管理画面の統合管理とシステム連携を担当
 * @version 2.1.0 - 統一パス設定対応
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { articleDataService } from './ArticleDataService.js';
import { instagramDataService } from './InstagramDataService.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { uiManagerService } from './UIManagerService.js';
import { newsFormManager } from '../components/NewsFormManager.js';
import { authManager } from '../../auth/AuthManager.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { redirect } from '../../../shared/constants/paths.js';

export class AdminSystemService {
  constructor() {
    this.componentName = 'AdminSystemService';
    
    // 統一ストレージキー（CONFIG.storage.keysから取得）
    this.storageKeys = {
      auth: CONFIG.storage.keys.adminSession // adminSessionキーに統一
    };
    
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
      if (authManager.initialized) {
        this.systemStatus.authManager = true;
        this.isAuthenticated = authManager.isAuthenticated();
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
    
    // LessonStatusStorageServiceのインスタンスを取得
    const lessonStatusService = getLessonStatusStorageService();
    
    const services = [
      { name: 'articleService', service: articleDataService },
      { name: 'instagramService', service: instagramDataService },
      { name: 'lessonService', service: lessonStatusService },
      { name: 'uiManagerService', service: uiManagerService },
      { name: 'newsFormManager', service: newsFormManager }
    ];

    for (const { name, service } of services) {
      try {
        if (!service.initialized) {
          service.init();
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
      console.log('💾 記事フォーム自動保存完了');
    });

    // フォームクリア時の処理
    EventBus.on('newsForm:cleared', () => {
      uiManagerService.clearFormChanges('news-form');
    });
  }

  /**
   * データ変更時の処理
   * @private
   * @param {string} type - データタイプ
   * @param {Object} data - データ
   */
  handleDataChange(type, data) {
    console.log(`📊 ${type} データが変更されました:`, data);
    
    // 統計情報の更新
    this.updateSystemStats();
    
    // UI更新の通知
    EventBus.emit('adminSystem:dataChanged', { type, data });
  }

  /**
   * システム統計情報の更新
   * @private
   */
  updateSystemStats() {
    try {
      const stats = {
        articles: articleDataService.getStats(),
        instagram: instagramDataService.getStats(),
        lessons: getLessonStatusStorageService().getStatus()
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
      console.log('📅 レッスン状況読み込み（統一モジュール使用）');
      
      // 統一レッスン状況管理モジュールが利用可能な場合はそれを使用
      if (window.adminCore) {
        const lessonStatusManager = window.adminCore.getModule('lessonStatusManagerModule');
        if (lessonStatusManager && lessonStatusManager.isInitialized) {
          const today = new Date().toISOString().slice(0, 10);
          await lessonStatusManager.loadStatusByDate(today);
          return;
        }
      }
      
      // フォールバック（従来の方法）
      const today = new Date().toISOString().slice(0, 10);
      const status = getLessonStatusStorageService().getStatusByDate(today);
      
      if (status) {
        console.log('📅 本日のレッスン状況を読み込み（フォールバック）:', status);
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
      if (authManager?.initialized) {
        try {
          authManager.logout();
          console.log('✅ AuthManagerからのログアウト成功');
          
          // システムクリーンアップ
          this.destroy();
          
          // ログインページへリダイレクト
          this.redirectToLogin();
        } catch (error) {
          console.error('❌ AuthManagerログアウトエラー:', error);
          // フォールバック処理
          await this.performFallbackLogout();
        }
      } else {
        console.warn('⚠️ AuthManagerが利用できません。フォールバック処理を実行');
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
      
      // 手動で認証データをクリア（統一ストレージキーを使用）
      localStorage.removeItem(this.storageKeys.auth);
      sessionStorage.clear();
      
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
    
    document.body.insertAdjacentHTML('beforeend', errorHtml);
  }

  /**
   * システム状態の取得
   * @returns {Object}
   */
  getSystemStatus() {
    return {
      initialized: this.initialized,
      authenticated: this.isAuthenticated,
      services: { ...this.systemStatus },
      performance: { ...this.performanceMetrics },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * パフォーマンス情報の取得
   * @returns {Object}
   */
  getPerformanceInfo() {
    const performance = window.performance;
    const navigation = performance.getEntriesByType('navigation')[0];
    
    return {
      ...this.performanceMetrics,
      pageLoad: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    };
  }

  /**
   * システム破棄処理
   */
  destroy() {
    try {
      console.log('🗑️ 管理システム破棄中...');
      
      // LessonStatusStorageServiceのインスタンスを取得
      const lessonStatusService = getLessonStatusStorageService();
      
      // 各サービスの破棄
      const services = [
        { name: 'newsFormManager', service: newsFormManager },
        { name: 'uiManagerService', service: uiManagerService },
        { name: 'articleService', service: articleDataService },
        { name: 'instagramService', service: instagramDataService },
        { name: 'lessonService', service: lessonStatusService }
      ];

      services.forEach(({ name, service }) => {
        try {
          if (service && typeof service.destroy === 'function') {
            service.destroy();
            this.systemStatus[name] = false;
          }
        } catch (error) {
          console.warn(`⚠️ ${name} 破棄エラー:`, error);
        }
      });
      
      // システム状態リセット
      this.initialized = false;
      this.isAuthenticated = false;
      
      EventBus.emit('adminSystem:destroyed');
      console.log('✅ 管理システム破棄完了');
      
    } catch (error) {
      console.error('❌ システム破棄エラー:', error);
    }
  }
}

// シングルトンインスタンス
export const adminSystemService = new AdminSystemService(); 