/**
 * RBS陸上教室 メインアプリケーション
 * 新しいアーキテクチャでの統合管理クラス
 * @version 2.1.0 - エラーハンドリング強化版
 */

import { actionManager } from './ActionManager.js';
import { initNewsFeature } from '../features/news/index.js';
import { initAuthFeature } from '../features/auth/index.js';
import { getCurrentPageType } from '../shared/utils/urlUtils.js';
import { initializeLayout, LayoutInitializer } from '../shared/components/layout/index.js';
import { EventBus } from '../shared/services/EventBus.js';

export default class Application {
  constructor() {
    this.initialized = false;
    this.currentPage = null;
    this.services = new Map();
    this.features = new Map();
    
    /** @type {LayoutInitializer} Layout初期化管理 */
    this.layoutInitializer = null;
    
    /** @type {boolean} テンプレート読み込み完了フラグ */
    this.templatesLoaded = false;
    
    /** @type {Object} 初期化エラーのログ */
    this.initializationErrors = {};
  }

  /**
   * アプリケーション初期化
   */
  async init() {
    if (this.initialized) {
      console.log('⚠️ Application: 既に初期化済み');
      return;
    }

    console.log('🚀 RBS陸上教室 アプリケーション v2.1 初期化開始');

    try {
      // 1. 現在のページタイプを取得
      this.currentPage = getCurrentPageType();
      console.log(`📄 現在のページ: ${this.currentPage}`);

      // 2. テンプレートとレイアウトの初期化（最優先）
      await this.initializeTemplateAndLayout();

      // 3. コアサービスの初期化
      await this.initializeCoreServices();

      // 4. ページ固有の機能初期化
      await this.initializePageFeatures();

      // 5. グローバルイベントハンドラーの設定
      this.setupGlobalEventHandlers();

      this.initialized = true;
      console.log('✅ アプリケーション初期化完了');

      // 初期化完了イベントを発火
      this.emit('app:initialized', { 
        page: this.currentPage,
        templatesLoaded: this.templatesLoaded,
        errors: this.initializationErrors
      });

    } catch (error) {
      console.error('❌ アプリケーション初期化エラー:', error);
      await this.handleInitializationError(error);
    }
  }

  /**
   * テンプレートとレイアウトの初期化
   * @private
   */
  async initializeTemplateAndLayout() {
    console.log('🎨 テンプレート・レイアウト初期化中...');
    
    try {
      // ページタイプ別の設定
      const layoutOptions = this.getLayoutOptionsForPage(this.currentPage);
      
      // Layout機能の一括初期化
      const layoutResult = await initializeLayout(layoutOptions);
      
      this.layoutInitializer = layoutResult.initializer;
      this.services.set('layout', this.layoutInitializer);
      
      if (layoutResult.result.success) {
        this.templatesLoaded = true;
        console.log('✅ テンプレート・レイアウト初期化完了');
        
        // テンプレート読み込み完了イベント
        this.emit('app:templates:loaded', {
          page: this.currentPage,
          templateManager: layoutResult.result.templateManager,
          headerComponent: layoutResult.result.headerComponent,
          footerComponent: layoutResult.result.footerComponent
        });
        
      } else {
        console.warn('⚠️ テンプレート初期化でフォールバック動作:', layoutResult.result.error);
        this.templatesLoaded = false;
      }
      
    } catch (error) {
      console.error('❌ テンプレート・レイアウト初期化エラー:', error);
      
      // フォールバック: 最低限のHTML構造を確保
      await this.ensureMinimalLayout();
    }
  }

  /**
   * ページタイプ別のレイアウトオプション取得
   * @private
   * @param {string} pageType - ページタイプ
   * @returns {Object} レイアウトオプション
   */
  getLayoutOptionsForPage(pageType) {
    const baseOptions = {
      pageType: pageType,
      headerContainerId: 'header-container',
      footerContainerId: 'footer-container'
    };

    // ページ固有のオプション設定
    switch (pageType) {
      case 'home':
        return {
          ...baseOptions,
          templateOptions: {
            showLessonStatus: true,
            enableSmoothScroll: true
          }
        };
        
      case 'news-detail':
        return {
          ...baseOptions,
          templateOptions: {
            showBreadcrumb: true,
            enableSocialShare: true,
            articleId: this.getArticleIdFromUrl()
          }
        };
        
      case 'news-list':
        return {
          ...baseOptions,
          templateOptions: {
            showSearchForm: true,
            enableInfiniteScroll: true
          }
        };
        
      case 'admin':
        return {
          ...baseOptions,
          templateOptions: {
            requireAuth: true,
            showAdminNav: true,
            enableAutoSave: true
          }
        };
        
      case 'admin-login':
        return {
          ...baseOptions,
          pageType: 'admin', // 管理者ページテンプレートを使用
          templateOptions: {
            loginMode: true,
            hideNavigation: true
          }
        };
        
      default:
        return baseOptions;
    }
  }

  /**
   * URLから記事IDを取得
   * @private
   * @returns {string|null} 記事ID
   */
  getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || urlParams.get('article_id') || null;
  }

  /**
   * 最低限のレイアウト構造確保（フォールバック）
   * @private
   */
  async ensureMinimalLayout() {
    console.log('🔧 最低限のレイアウト構造を確保中...');
    
    // ヘッダーコンテナの確保
    let headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
      headerContainer = document.createElement('div');
      headerContainer.id = 'header-container';
      headerContainer.innerHTML = '<header><h1>RBS陸上教室</h1></header>';
      document.body.insertBefore(headerContainer, document.body.firstChild);
    }
    
    // フッターコンテナの確保
    let footerContainer = document.getElementById('footer-container');
    if (!footerContainer) {
      footerContainer = document.createElement('div');
      footerContainer.id = 'footer-container';
      footerContainer.innerHTML = '<footer><p>&copy; 2024 RBS陸上教室</p></footer>';
      document.body.appendChild(footerContainer);
    }
    
    console.log('✅ 最低限のレイアウト構造を確保完了');
  }

  /**
   * コアサービスの初期化
   * @private
   */
  async initializeCoreServices() {
    console.log('🔧 コアサービス初期化中...');

    try {
      // ActionManager の初期化
      actionManager.init();
      this.services.set('actionManager', actionManager);
      console.log('✅ ActionManager初期化完了');
    } catch (error) {
      console.error('❌ ActionManager初期化エラー:', error);
      this.initializationErrors.actionManager = error;
    }

    // ページ固有のアクションサービス初期化（安全な動的インポート）
    try {
      switch (this.currentPage) {
        case 'admin':
          await this.initializeAdminActionService();
          break;
        
        case 'news-detail':
        case 'news-list':
          await this.initializeNewsActionService();
          break;
          
        case 'admin-login':
          // 認証アクションサービスはinitAuthFeatureで初期化される
          console.log('🔐 認証ページ: サービス初期化をinitAuthFeatureに委譲');
          break;
          
        default:
          console.log('📝 汎用ページ: 特別なアクションサービスは不要');
          break;
      }
    } catch (error) {
      console.error('❌ ページ固有サービス初期化エラー:', error);
      this.initializationErrors.pageServices = error;
    }

    console.log('✅ コアサービス初期化完了');
  }

  /**
   * AdminActionServiceの安全な初期化
   * @private
   */
  async initializeAdminActionService() {
    try {
      const { AdminActionService } = await import('../features/admin/services/AdminActionService.js');
      const adminActionService = new AdminActionService();
      
      await adminActionService.init();
      this.services.set('adminActions', adminActionService);
      
      console.log('✅ AdminActionService初期化完了');
      return adminActionService;
      
    } catch (error) {
      console.error('❌ AdminActionService初期化エラー:', error);
      this.initializationErrors.adminActionService = error;
      
      // 管理画面でエラーが発生した場合は、ログインページにリダイレクト
      if (this.currentPage === 'admin') {
        console.log('🔄 管理画面初期化失敗: ログインページにリダイレクト');
        window.location.href = '/admin-login.html';
      }
      return null;
    }
  }

  /**
   * NewsActionServiceの安全な初期化
   * @private
   */
  async initializeNewsActionService() {
    try {
      const { newsActionService } = await import('../features/news/services/NewsActionService.js');
      
      if (newsActionService && typeof newsActionService.init === 'function') {
        await newsActionService.init();
        this.services.set('newsActions', newsActionService);
        console.log('✅ NewsActionService初期化完了');
        return newsActionService;
      } else {
        console.warn('⚠️ NewsActionService: initメソッドが見つかりません');
        return null;
      }
      
    } catch (error) {
      console.error('❌ NewsActionService初期化エラー:', error);
      this.initializationErrors.newsActionService = error;
      return null;
    }
  }

  /**
   * ページ固有の機能初期化
   * @private
   */
  async initializePageFeatures() {
    console.log(`🎯 ${this.currentPage} ページの機能初期化中...`);

    switch (this.currentPage) {
      case 'home':
        await this.initializeHomeFeatures();
        break;
      
      case 'news-detail':
      case 'news-list':
        await this.initializeNewsFeatures();
        break;
      
      case 'admin':
        await this.initializeAdminFeatures();
        break;
      
      case 'admin-login':
        await this.initializeAuthFeatures();
        break;
      
      default:
        console.log('📝 汎用ページとして初期化');
        await this.initializeCommonFeatures();
        break;
    }

    console.log(`✅ ${this.currentPage} ページの機能初期化完了`);
  }

  /**
   * ホームページ機能の初期化
   * @private
   */
  async initializeHomeFeatures() {
    // レッスン状況表示などの基本機能
    console.log('🏠 ホームページ機能を初期化中...');
    
    // 必要に応じてレッスン状況管理などを初期化
    try {
      if (typeof window.initializeLessonStatus === 'function') {
        await window.initializeLessonStatus();
        console.log('✅ レッスン状況機能を初期化');
      }
    } catch (error) {
      console.warn('⚠️ レッスン状況機能の初期化をスキップ:', error.message);
    }
  }

  /**
   * ニュース機能の初期化
   * @private
   */
  async initializeNewsFeatures() {
    await initNewsFeature();
    this.features.set('news', true);
  }

  /**
   * 管理画面機能の初期化
   * @private
   */
  async initializeAdminFeatures() {
    console.log('👨‍💼 管理画面機能を初期化中...');
    
    try {
      // admin/index.jsのinitAdminFeature()を使用
      // 認証チェック、ログアウトハンドラー設定、全サービス初期化が含まれる
      const { initAdminFeature } = await import('../features/admin/index.js');
      await initAdminFeature();
      
      this.features.set('admin', true);
      console.log('✅ 管理画面機能の初期化完了');
      
    } catch (error) {
      console.error('❌ 管理画面機能初期化エラー:', error);
      this.initializationErrors.adminFeature = error;
      
      // エラーの場合は認証失敗として処理
      if (error.message?.includes('認証') || error.message?.includes('auth')) {
        console.log('🔄 認証エラー: ログインページにリダイレクト');
        window.location.href = '/admin-login.html';
      } else {
        // その他のエラーはコンソールにログ出力のみ
        this.showInitializationError('管理画面の初期化に失敗しました。ページを再読み込みしてください。');
      }
    }
  }

  /**
   * 認証機能の初期化
   * @private
   */
  async initializeAuthFeatures() {
    try {
      await initAuthFeature();
      
      // AuthActionServiceが初期化された場合はサービスに登録
      try {
        const { authActionService } = await import('../features/auth/services/AuthActionService.js');
        if (authActionService && authActionService.initialized) {
          this.services.set('authActions', authActionService);
          console.log('✅ AuthActionService登録完了');
        }
      } catch (authServiceError) {
        console.warn('⚠️ AuthActionService のインポートに失敗しましたが、続行します:', authServiceError.message);
        this.initializationErrors.authActionService = authServiceError;
      }
      
      this.features.set('auth', true);
      console.log('✅ 認証機能初期化完了');
      
    } catch (error) {
      console.error('❌ 認証機能初期化エラー:', error);
      this.initializationErrors.authFeature = error;
    }
  }

  /**
   * 共通機能の初期化
   * @private
   */
  async initializeCommonFeatures() {
    // 全ページ共通の機能のみ初期化
    console.log('🔧 共通機能を初期化中...');
  }

  /**
   * グローバルイベントハンドラーの設定
   * @private
   */
  setupGlobalEventHandlers() {
    // エラーハンドリング
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // ページ離脱前の処理
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    console.log('📡 グローバルイベントハンドラーを設定');
  }

  /**
   * グローバルエラーハンドリング
   * @private
   * @param {ErrorEvent} event - エラーイベント
   */
  handleGlobalError(event) {
    console.error('🚨 グローバルエラー:', event.error);
    
    // エラー報告などの処理
    this.reportError(event.error, 'global');
  }

  /**
   * 未処理のPromise拒否ハンドリング
   * @private
   * @param {PromiseRejectionEvent} event - Promise拒否イベント
   */
  handleUnhandledRejection(event) {
    console.error('🚨 未処理のPromise拒否:', event.reason);
    
    // エラー報告などの処理
    this.reportError(event.reason, 'promise');
  }

  /**
   * ページ離脱前の処理
   * @private
   * @param {BeforeUnloadEvent} event - 離脱前イベント
   */
  handleBeforeUnload(event) {
    // 必要に応じて保存処理などを実行
    console.log('👋 ページを離脱中...');
  }

  /**
   * 初期化エラーの処理
   * @private
   * @param {Error} error - エラー
   */
  async handleInitializationError(error) {
    console.error('🚨 アプリケーション初期化で重大なエラーが発生しました:', error);
    
    // 最低限のDOM構造を確保
    this.ensureBasicDomStructure();
    
    // エラー情報をユーザーに表示
    this.showInitializationError(error.message);
    
    // エラー報告
    this.reportError(error, 'initialization');
    
    // EventBusでエラーイベントを発火
    try {
      EventBus.emit('app:initialization:error', {
        error: error,
        page: this.currentPage,
        timestamp: new Date().toISOString()
      });
    } catch (eventBusError) {
      console.error('❌ EventBusでのエラー通知に失敗:', eventBusError);
    }
  }

  /**
   * 初期化エラーをユーザーに表示
   * @private
   * @param {string} message - エラーメッセージ
   */
  showInitializationError(message) {
    // エラーメッセージを表示するためのHTML構造を作成
    const errorContainer = document.createElement('div');
    errorContainer.className = 'initialization-error';
    errorContainer.innerHTML = `
      <div class="error-content">
        <h2>🚨 初期化エラー</h2>
        <p>${message}</p>
        <button onclick="window.location.reload()" class="retry-button">
          ページを再読み込み
        </button>
      </div>
    `;
    
    // エラー用のスタイルを追加
    const style = document.createElement('style');
    style.textContent = `
      .initialization-error {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .error-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      
      .error-content h2 {
        color: #dc3545;
        margin-bottom: 1rem;
      }
      
      .retry-button {
        background: #007bff;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
      }
      
      .retry-button:hover {
        background: #0056b3;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(errorContainer);
  }

  /**
   * 基本的なDOM構造を確保
   * @private
   */
  ensureBasicDomStructure() {
    // body要素が存在しない場合は作成
    if (!document.body) {
      document.documentElement.appendChild(document.createElement('body'));
    }
    
    // 基本的なメタ要素を確保
    if (!document.querySelector('meta[charset]')) {
      const charset = document.createElement('meta');
      charset.setAttribute('charset', 'UTF-8');
      document.head.appendChild(charset);
    }
    
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      document.head.appendChild(viewport);
    }
  }

  /**
   * エラー報告
   * @private
   * @param {Error} error - エラー
   * @param {string} context - コンテキスト
   */
  reportError(error, context) {
    // 開発環境ではコンソールにログ出力
    console.group(`🚨 エラー報告 [${context}]`);
    console.error('エラー:', error);
    console.error('スタック:', error.stack);
    console.error('コンテキスト:', context);
    console.error('ページ:', this.currentPage);
    console.error('初期化状態:', {
      initialized: this.initialized,
      templatesLoaded: this.templatesLoaded,
      servicesCount: this.services.size
    });
    console.groupEnd();
  }

  /**
   * サービス取得
   * @param {string} name - サービス名
   * @returns {*} サービスインスタンス
   */
  getService(name) {
    return this.services.get(name);
  }

  /**
   * 機能の有無確認
   * @param {string} name - 機能名
   * @returns {boolean} 機能が有効かどうか
   */
  hasFeature(name) {
    return this.features.has(name);
  }

  /**
   * レイアウト機能の有無確認
   * @returns {boolean} レイアウト機能が有効かどうか
   */
  hasLayoutFeature() {
    return this.services.has('layout') && this.templatesLoaded;
  }

  /**
   * テンプレートの再読み込み
   * @param {string|null} pageType - ページタイプ（nullの場合は現在のページ）
   */
  async reloadTemplates(pageType = null) {
    const targetPageType = pageType || this.currentPage;
    console.log(`🔄 テンプレート再読み込み: ${targetPageType}`);
    
    try {
      // レイアウト初期化を再実行
      const layoutOptions = this.getLayoutOptionsForPage(targetPageType);
      const layoutResult = await initializeLayout(layoutOptions);
      
      if (layoutResult.result.success) {
        this.templatesLoaded = true;
        console.log('✅ テンプレート再読み込み完了');
        return true;
      } else {
        console.warn('⚠️ テンプレート再読み込み失敗');
        return false;
      }
    } catch (error) {
      console.error('❌ テンプレート再読み込みエラー:', error);
      return false;
    }
  }

  /**
   * レイアウトパフォーマンス情報取得
   * @returns {Object} パフォーマンス情報
   */
  getLayoutPerformanceInfo() {
    return {
      templatesLoaded: this.templatesLoaded,
      hasLayoutService: this.services.has('layout'),
      layoutInitializer: this.layoutInitializer ? 'loaded' : 'not_loaded',
      currentPage: this.currentPage
    };
  }

  /**
   * EventBusを通じたイベント発火
   * @param {string} eventName - イベント名
   * @param {any} data - イベントデータ
   */
  emit(eventName, data) {
    try {
      EventBus.emit(eventName, data);
    } catch (error) {
      console.warn('⚠️ EventBusでのイベント発火に失敗:', eventName, error);
    }
  }

  /**
   * EventBusを通じたイベントリスニング
   * @param {string} eventName - イベント名
   * @param {Function} listener - リスナー関数
   */
  on(eventName, listener) {
    try {
      EventBus.on(eventName, listener);
    } catch (error) {
      console.warn('⚠️ EventBusでのイベント登録に失敗:', eventName, error);
    }
  }

  /**
   * アプリケーションの現在状態を取得
   * @returns {Object} 状態情報
   */
  getStatus() {
    return {
      initialized: this.initialized,
      currentPage: this.currentPage,
      templatesLoaded: this.templatesLoaded,
      servicesCount: this.services.size,
      featuresCount: this.features.size,
      errors: this.initializationErrors,
      services: Array.from(this.services.keys()),
      features: Array.from(this.features.keys())
    };
  }

  /**
   * 認証サービス取得（非同期）
   * @returns {Promise<*>} 認証サービス
   */
  async getAuthService() {
    let authService = this.services.get('authActions');
    
    if (!authService) {
      // 動的に読み込み
      try {
        const { authActionService } = await import('../features/auth/services/AuthActionService.js');
        authService = authActionService;
      } catch (error) {
        console.warn('認証サービスの動的読み込みに失敗:', error);
      }
    }
    
    return authService;
  }

  /**
   * デバッグ情報の表示
   */
  debug() {
    console.group('🔍 Application Debug Info');
    console.table(this.getStatus());
    console.log('Services:', this.services);
    console.log('Features:', this.features);
    console.log('Initialization Errors:', this.initializationErrors);
    console.groupEnd();
  }

  /**
   * アプリケーションの破棄
   */
  destroy() {
    console.log('🗑️ Application: 破棄開始');
    
    this.services.clear();
    this.features.clear();
    this.layoutInitializer = null;
    this.initialized = false;
    
    console.log('✅ Application: 破棄完了');
  }
}

// シングルトンインスタンス
export const app = new Application();

// グローバルアクセス（後方互換性）
window.RBSApp = app; 