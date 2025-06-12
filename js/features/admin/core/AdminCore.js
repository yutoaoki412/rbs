/**
 * 管理画面コアシステム - admin.html内のインライン初期化機能を統合
 * @version 2.0.0 - リファクタリング統合版
 */

import { initAdminFeature } from '../index.js';
import { getAdminNotificationService } from '../../../shared/services/AdminNotificationService.js';
import { getDashboardStatsWidget } from '../components/DashboardStatsWidget.js';
import { getInstagramEmbedModule } from '../modules/InstagramEmbedModule.js';
import { getLessonStatusManagerModule } from '../modules/LessonStatusManagerModule.js';

export class AdminCore {
  constructor() {
    this.componentName = 'AdminCore';
    this.initialized = false;
    this.services = new Map();
    this.modules = new Map();
    
    // 初期化状態の追跡
    this.initializationState = {
      notificationService: false,
      dashboardStatsWidget: false,
      instagramEmbedModule: false,
      lessonStatusManagerModule: false,
      adminFeatures: false
    };
    
    // パフォーマンス測定
    this.performanceMetrics = {
      startTime: null,
      endTime: null,
      initDuration: null,
      componentLoadTimes: new Map()
    };
  }

  /**
   * 管理画面の初期化（admin.html内のDOMContentLoadedイベントを統合）
   */
  async init() {
    if (this.initialized) {
      console.warn('AdminCore は既に初期化済みです');
      return;
    }

    this.performanceMetrics.startTime = performance.now();
    
    try {
      console.log('🚀 RBS管理画面初期化開始 (統合版)');
      
      // 1. ダッシュボードタブを初期表示に設定
      this.initializeDashboard();
      
      // 2. 通知サービスの初期化
      await this.initNotificationService();
      
      // 3. 統一された管理機能初期化
      await this.initAdminFeatures();
      
      // 4. ダッシュボード統計ウィジェットの初期化
      await this.initDashboardStatsWidget();
      
      // 5. Instagram埋め込みモジュールの初期化
      await this.initInstagramEmbedModule();
      
      // 6. レッスン状況管理モジュールの初期化
      await this.initLessonStatusManagerModule();
      
      // 7. グローバル関数の設定
      this.setupGlobalFunctions();
      
      // 8. 初期化完了
      this.finalizationInitialization();
      
    } catch (error) {
      console.error('❌ 管理画面初期化エラー:', error);
      await this.handleInitializationError(error);
    }
  }

  /**
   * ダッシュボードタブの初期表示設定（admin.html内の実装を統合）
   */
  initializeDashboard() {
    const startTime = performance.now();
    
    try {
      // 全てのセクションとナビゲーションアイテムを非アクティブ化
      document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
      });
      document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.classList.remove('active');
      });
      
      // ダッシュボードセクションとナビゲーションをアクティブ化
      const dashboardSection = document.getElementById('dashboard');
      const dashboardNav = document.querySelector('[data-tab="dashboard"]');
      
      if (dashboardSection) {
        dashboardSection.classList.add('active');
      } else {
        throw new Error('ダッシュボードセクションが見つかりません');
      }
      
      if (dashboardNav) {
        dashboardNav.classList.add('active');
      } else {
        console.warn('ダッシュボードナビゲーションが見つかりません');
      }
      
      // ローカルストレージに状態を保存
      localStorage.setItem('rbs_admin_tab', 'dashboard');
      
      const loadTime = performance.now() - startTime;
      this.performanceMetrics.componentLoadTimes.set('dashboard', loadTime);
      console.log('✅ ダッシュボード初期化完了');
      
    } catch (error) {
      console.error('❌ ダッシュボード初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 通知サービスの初期化
   */
  async initNotificationService() {
    const startTime = performance.now();
    
    try {
      console.log('🔔 通知サービス初期化開始');
      
      const notificationService = getAdminNotificationService();
      this.services.set('notification', notificationService);
      
      this.initializationState.notificationService = true;
      
      const loadTime = performance.now() - startTime;
      this.performanceMetrics.componentLoadTimes.set('notificationService', loadTime);
      console.log('✅ 通知サービス初期化完了');
      
    } catch (error) {
      console.error('❌ 通知サービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 管理機能の初期化（admin.html内のinitAdminFeature呼び出しを統合）
   */
  async initAdminFeatures() {
    const startTime = performance.now();
    
    try {
      console.log('🏗️ 管理機能初期化開始');
      
      // 統一された管理機能初期化（エラー回避）
      try {
        await initAdminFeature();
      } catch (featureError) {
        console.warn('管理機能初期化で一部エラーが発生しましたが継続します:', featureError.message);
      }
      
      this.initializationState.adminFeatures = true;
      
      const loadTime = performance.now() - startTime;
      this.performanceMetrics.componentLoadTimes.set('adminFeatures', loadTime);
      console.log('✅ 管理機能初期化完了');
      
    } catch (error) {
      console.error('❌ 管理機能初期化エラー:', error);
      // 致命的でないエラーとして処理
      this.initializationState.adminFeatures = false;
    }
  }

  /**
   * ダッシュボード統計ウィジェットの初期化
   */
  async initDashboardStatsWidget() {
    const startTime = performance.now();
    
    try {
      console.log('📊 ダッシュボード統計ウィジェット初期化開始');
      
      const statsWidget = getDashboardStatsWidget();
      await statsWidget.init();
      this.modules.set('dashboardStatsWidget', statsWidget);
      
      this.initializationState.dashboardStatsWidget = true;
      
      const loadTime = performance.now() - startTime;
      this.performanceMetrics.componentLoadTimes.set('dashboardStatsWidget', loadTime);
      console.log('✅ ダッシュボード統計ウィジェット初期化完了');
      
    } catch (error) {
      console.error('❌ ダッシュボード統計ウィジェット初期化エラー:', error);
      // 統計ウィジェットのエラーは致命的ではないため、警告として処理
      console.warn('ダッシュボード統計ウィジェットの初期化に失敗しましたが、他の機能は継続します');
    }
  }

  /**
   * Instagram埋め込みモジュールの初期化
   */
  async initInstagramEmbedModule() {
    const startTime = performance.now();
    
    try {
      console.log('📸 Instagram埋め込みモジュール初期化開始');
      
      const instagramModule = getInstagramEmbedModule();
      await instagramModule.init();
      this.modules.set('instagramEmbedModule', instagramModule);
      
      this.initializationState.instagramEmbedModule = true;
      
      const loadTime = performance.now() - startTime;
      this.performanceMetrics.componentLoadTimes.set('instagramEmbedModule', loadTime);
      console.log('✅ Instagram埋め込みモジュール初期化完了');
      
    } catch (error) {
      console.error('❌ Instagram埋め込みモジュール初期化エラー:', error);
      // Instagram機能のエラーは致命的ではないため、警告として処理
      console.warn('Instagram埋め込みモジュールの初期化に失敗しましたが、他の機能は継続します');
    }
  }

  /**
   * レッスン状況管理モジュールの初期化
   */
  async initLessonStatusManagerModule() {
    const startTime = performance.now();
    
    try {
      console.log('📅 レッスン状況管理モジュール初期化開始');
      
      const lessonStatusManager = getLessonStatusManagerModule();
      await lessonStatusManager.initialize();
      this.modules.set('lessonStatusManagerModule', lessonStatusManager);
      
      this.initializationState.lessonStatusManagerModule = true;
      
      const loadTime = performance.now() - startTime;
      this.performanceMetrics.componentLoadTimes.set('lessonStatusManagerModule', loadTime);
      console.log('✅ レッスン状況管理モジュール初期化完了');
      
    } catch (error) {
      console.error('❌ レッスン状況管理モジュール初期化エラー:', error);
      // レッスン状況機能のエラーは致命的ではないため、警告として処理
      console.warn('レッスン状況管理モジュールの初期化に失敗しましたが、他の機能は継続します');
    }
  }

  /**
   * グローバル関数の設定
   */
  setupGlobalFunctions() {
    try {
      console.log('🌐 グローバル関数設定開始');
      
      // AdminCoreへのアクセス
      window.adminCore = this;
      
      // デバッグ用関数
      window.showAdminDebugInfo = () => this.showDebugInfo();
      window.getAdminMetrics = () => this.getMetrics();
      window.reloadAdminCore = () => this.reload();
      
      console.log('✅ グローバル関数設定完了');
      
    } catch (error) {
      console.error('❌ グローバル関数設定エラー:', error);
      throw error;
    }
  }

  /**
   * 初期化の完了処理
   */
  finalizationInitialization() {
    this.performanceMetrics.endTime = performance.now();
    this.performanceMetrics.initDuration = this.performanceMetrics.endTime - this.performanceMetrics.startTime;
    
    this.initialized = true;
    
    // 成功通知
    const notificationService = this.services.get('notification');
    if (notificationService) {
      notificationService.toast('管理画面の初期化が完了しました', 'success');
    }
    
    console.log(`✅ RBS管理画面初期化完了 (所要時間: ${this.performanceMetrics.initDuration.toFixed(2)}ms)`);
    console.log('📊 初期化詳細:', this.getInitializationSummary());
  }

  /**
   * 初期化エラーの処理
   */
  async handleInitializationError(error) {
    console.error('💥 管理画面初期化で致命的エラーが発生:', error);
    
    // エラー処理は initAdminFeature 内で実行済み
    // ここでは追加のフォールバック処理のみ
    if (!window.location.pathname.includes('admin-login.html')) {
      const shouldRedirect = confirm(
        `管理画面の初期化に失敗しました。\n\nエラー: ${error.message}\n\nログイン画面に戻りますか？`
      );
      if (shouldRedirect) {
        localStorage.removeItem('rbs_admin_auth');
        window.location.replace('admin-login.html?from=admin');
      }
    }
  }

  /**
   * 管理画面の再読み込み
   */
  async reload() {
    console.log('🔄 管理画面再読み込み開始');
    
    try {
      // 現在のサービスとモジュールを破棄
      await this.destroy();
      
      // 再初期化
      await this.init();
      
      console.log('✅ 管理画面再読み込み完了');
      
    } catch (error) {
      console.error('❌ 管理画面再読み込みエラー:', error);
      
      // 通知サービスが利用可能なら通知
      const notificationService = this.services.get('notification');
      if (notificationService) {
        notificationService.toast('管理画面の再読み込みに失敗しました', 'error');
      }
    }
  }

  /**
   * 初期化概要の取得
   */
  getInitializationSummary() {
    return {
      totalDuration: this.performanceMetrics.initDuration,
      componentLoadTimes: Object.fromEntries(this.performanceMetrics.componentLoadTimes),
      initializationState: this.initializationState,
      servicesCount: this.services.size,
      modulesCount: this.modules.size
    };
  }

  /**
   * メトリクスの取得（リファクタリング効果測定用）
   */
  getMetrics() {
    const summary = this.getInitializationSummary();
    
    return {
      ...summary,
      initialized: this.initialized,
      services: Array.from(this.services.keys()),
      modules: Array.from(this.modules.keys()),
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * デバッグ情報の表示
   */
  showDebugInfo() {
    console.log('=== Admin Core Debug Info ===');
    console.log('Initialization State:', this.initializationState);
    console.log('Performance Metrics:', this.performanceMetrics);
    console.log('Services:', Array.from(this.services.keys()));
    console.log('Modules:', Array.from(this.modules.keys()));
    console.log('Full Metrics:', this.getMetrics());
    console.log('=============================');
  }

  /**
   * 特定のサービスの取得
   */
  getService(serviceName) {
    return this.services.get(serviceName);
  }

  /**
   * 特定のモジュールの取得
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * サービスの追加
   */
  addService(name, service) {
    this.services.set(name, service);
    console.log(`✅ サービス追加: ${name}`);
  }

  /**
   * モジュールの追加
   */
  addModule(name, module) {
    this.modules.set(name, module);
    console.log(`✅ モジュール追加: ${name}`);
  }

  /**
   * 管理画面の破棄
   */
  async destroy() {
    console.log('🗑️ 管理画面破棄開始');
    
    try {
      // モジュールの破棄
      for (const [name, module] of this.modules) {
        if (module && typeof module.destroy === 'function') {
          await module.destroy();
          console.log(`✅ モジュール破棄: ${name}`);
        }
      }
      this.modules.clear();
      
      // サービスの破棄
      for (const [name, service] of this.services) {
        if (service && typeof service.destroy === 'function') {
          await service.destroy();
          console.log(`✅ サービス破棄: ${name}`);
        }
      }
      this.services.clear();
      
      // グローバル関数の削除
      delete window.adminCore;
      delete window.showAdminDebugInfo;
      delete window.getAdminMetrics;
      delete window.reloadAdminCore;
      
      // 状態のリセット
      this.initialized = false;
      this.initializationState = {
        notificationService: false,
        dashboardStatsWidget: false,
        instagramEmbedModule: false,
        adminFeatures: false
      };
      
      console.log('✅ 管理画面破棄完了');
      
    } catch (error) {
      console.error('❌ 管理画面破棄エラー:', error);
    }
  }
}

// シングルトンインスタンス
let adminCoreInstance = null;

/**
 * 管理画面コアのシングルトンインスタンスを取得
 */
export function getAdminCore() {
  if (!adminCoreInstance) {
    adminCoreInstance = new AdminCore();
  }
  return adminCoreInstance;
}

/**
 * 管理画面の初期化（DOMContentLoadedイベント用）
 */
export async function initializeAdmin() {
  const adminCore = getAdminCore();
  await adminCore.init();
  return adminCore;
} 