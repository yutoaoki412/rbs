/**
 * RBS陸上教室 メインアプリケーション
 * 新しいアーキテクチャでの統合管理クラス
 * @version 2.0.0
 */

import { actionManager } from './ActionManager.js';
import { adminActionService } from '../features/admin/services/AdminActionService.js';
import { newsActionService } from '../features/news/services/NewsActionService.js';
import { authActionService } from '../features/auth/services/AuthActionService.js';
import { initNewsFeature } from '../features/news/index.js';
import { initAuthFeature } from '../features/auth/index.js';
import { getCurrentPageType } from '../shared/utils/urlUtils.js';
import { initializeLayout, LayoutInitializer } from '../shared/components/layout/index.js';

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
  }

  /**
   * アプリケーション初期化
   */
  async init() {
    if (this.initialized) {
      console.log('⚠️ Application: 既に初期化済み');
      return;
    }

    console.log('🚀 RBS陸上教室 アプリケーション v2.0 初期化開始');

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
        templatesLoaded: this.templatesLoaded 
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
      headerContainer.innerHTML = `
        <header class="site-header fallback">
          <div class="container">
            <h1><a href="/">RBS陸上教室</a></h1>
            <nav><a href="#main-content">メインコンテンツ</a></nav>
          </div>
        </header>
      `;
      document.body.insertBefore(headerContainer, document.body.firstChild);
    }
    
    // フッターコンテナの確保
    let footerContainer = document.getElementById('footer-container');
    if (!footerContainer) {
      footerContainer = document.createElement('div');
      footerContainer.id = 'footer-container';
      footerContainer.innerHTML = `
        <footer class="site-footer fallback">
          <div class="container">
            <p>&copy; ${new Date().getFullYear()} RBS陸上教室</p>
          </div>
        </footer>
      `;
      document.body.appendChild(footerContainer);
    }
    
    // メインコンテンツの確保
    let mainContent = document.getElementById('main-content');
    if (!mainContent) {
      mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.id = 'main-content';
      }
    }
    
    console.log('✅ 最低限のレイアウト構造を確保完了');
  }

  /**
   * コアサービスの初期化
   * @private
   */
  async initializeCoreServices() {
    console.log('🔧 コアサービス初期化中...');

    // ActionManager の初期化
    actionManager.init();
    this.services.set('actionManager', actionManager);

    // ページ固有のアクションサービス初期化
    switch (this.currentPage) {
      case 'admin':
        adminActionService.init();
        this.services.set('adminActions', adminActionService);
        break;
      
      case 'news-detail':
      case 'news-list':
        newsActionService.init();
        this.services.set('newsActions', newsActionService);
        break;
        
      case 'admin-login':
        // 認証アクションサービスはinitAuthFeatureで初期化される
        break;
    }

    console.log('✅ コアサービス初期化完了');
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
      // エラーの場合はadmin/index.js内でリダイレクト処理済み
    }
  }

  /**
   * 認証機能の初期化
   * @private
   */
  async initializeAuthFeatures() {
    await initAuthFeature();
    
    // AuthActionServiceがauthActionServiceで初期化された場合はサービスに登録
    if (authActionService.initialized) {
      this.services.set('authActions', authActionService);
    }
    
    this.features.set('auth', true);
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
    // フォールバック処理
    console.error('💥 アプリケーション初期化失敗 - フォールバックモードで起動');
    
    try {
      // 最低限のレイアウト構造確保
      await this.ensureMinimalLayout();
      
      // 最低限のActionManager初期化
      actionManager.init();
      this.services.set('actionManager', actionManager);
      console.log('✅ フォールバックモードでActionManagerを初期化');
      
      // エラー状態フラグ設定
      this.initialized = true; // 最低限の初期化は完了
      this.templatesLoaded = false;
      
      // フォールバック完了イベント発火
      this.emit('app:fallback:initialized', { 
        error: error.message,
        page: this.currentPage 
      });
      
    } catch (fallbackError) {
      console.error('❌ フォールバックモードも失敗:', fallbackError);
      
      // 最終フォールバック：基本的なDOM要素だけ確保
      this.ensureBasicDomStructure();
    }
  }

  /**
   * 基本的なDOM構造確保（最終フォールバック）
   * @private
   */
  ensureBasicDomStructure() {
    console.log('🆘 基本的なDOM構造確保（最終フォールバック）');
    
    // 最低限のエラー表示
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      z-index: 9999;
    `;
    errorDiv.innerHTML = `
      <h2>🏃 RBS陸上教室</h2>
      <p>アプリケーションの初期化に問題が発生しました。</p>
      <p>ページを再読み込みしてください。</p>
      <button onclick="window.location.reload()" style="
        background: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
      ">再読み込み</button>
    `;
    
    document.body.appendChild(errorDiv);
  }

  /**
   * エラー報告
   * @private
   * @param {Error} error - エラー
   * @param {string} context - コンテキスト
   */
  reportError(error, context) {
    // エラー報告の実装（将来的にログサービスに送信など）
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      page: this.currentPage,
      templatesLoaded: this.templatesLoaded,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    console.warn('📊 エラー情報:', errorInfo);
  }

  /**
   * サービスを取得
   * @param {string} name - サービス名
   * @returns {*}
   */
  getService(name) {
    return this.services.get(name);
  }

  /**
   * 機能が有効かチェック
   * @param {string} name - 機能名
   * @returns {boolean}
   */
  hasFeature(name) {
    return this.features.has(name);
  }

  /**
   * Layout機能が有効かチェック
   * @returns {boolean}
   */
  hasLayoutFeature() {
    return this.templatesLoaded && this.layoutInitializer?.isInitialized;
  }

  /**
   * テンプレート再読み込み
   * @param {string} [pageType] - 新しいページタイプ（省略時は現在のページ）
   * @returns {Promise<boolean>} 成功フラグ
   */
  async reloadTemplates(pageType = null) {
    console.log('🔄 テンプレート再読み込み開始...');
    
    try {
      // 既存のLayout機能をリセット
      if (this.layoutInitializer) {
        this.layoutInitializer.reset();
      }
      
      // ページタイプ更新
      if (pageType) {
        this.currentPage = pageType;
      }
      
      // テンプレート・レイアウト再初期化
      await this.initializeTemplateAndLayout();
      
      console.log('✅ テンプレート再読み込み完了');
      return this.templatesLoaded;
      
    } catch (error) {
      console.error('❌ テンプレート再読み込みエラー:', error);
      return false;
    }
  }

  /**
   * レイアウトパフォーマンス情報取得
   * @returns {Object|null} パフォーマンス情報
   */
  getLayoutPerformanceInfo() {
    if (!this.layoutInitializer) {
      return null;
    }
    
    return this.layoutInitializer.getPerformanceInfo();
  }

  /**
   * イベントを発火（簡易実装）
   * @param {string} eventName - イベント名
   * @param {*} data - データ
   */
  emit(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
  }

  /**
   * イベントリスナーを追加（簡易実装）
   * @param {string} eventName - イベント名
   * @param {Function} listener - リスナー
   */
  on(eventName, listener) {
    window.addEventListener(eventName, listener);
  }

  /**
   * アプリケーション状態を取得
   * @returns {Object}
   */
  getStatus() {
    return {
      initialized: this.initialized,
      currentPage: this.currentPage,
      templatesLoaded: this.templatesLoaded,
      services: Array.from(this.services.keys()),
      features: Array.from(this.features.keys()),
      layoutPerformance: this.getLayoutPerformanceInfo()
    };
  }

  /**
   * 認証サービスを取得
   * @returns {Promise<AuthService>}
   */
  async getAuthService() {
    if (!this.services.has('auth')) {
      const { initAuthFeature } = await import('../features/auth/index.js');
      const authFeature = await initAuthFeature();
      this.services.set('auth', authFeature);
    }
    return this.services.get('auth');
  }

  /**
   * デバッグ情報を表示
   */
  debug() {
    console.log('🐛 Application Debug Info:', this.getStatus());
    
    // Layout詳細情報
    if (this.layoutInitializer) {
      console.log('🎨 Layout Debug Info:', this.layoutInitializer.getPerformanceInfo());
    }
  }

  /**
   * クリーンアップ処理
   */
  destroy() {
    console.log('🗑️ アプリケーションをクリーンアップ中...');
    
    // Layout機能のクリーンアップ
    if (this.layoutInitializer) {
      try {
        this.layoutInitializer.destroy();
        console.log('✅ Layout機能をクリーンアップ');
      } catch (error) {
        console.warn('⚠️ Layout機能のクリーンアップに失敗:', error);
      }
      this.layoutInitializer = null;
    }
    
    // サービスのクリーンアップ
    for (const [name, service] of this.services) {
      if (service && typeof service.destroy === 'function') {
        try {
          service.destroy();
          console.log(`✅ ${name} サービスをクリーンアップ`);
        } catch (error) {
          console.warn(`⚠️ ${name} サービスのクリーンアップに失敗:`, error);
        }
      }
    }
    
    this.services.clear();
    this.features.clear();
    this.initialized = false;
    this.templatesLoaded = false;
    
    console.log('✅ アプリケーションクリーンアップ完了');
  }
}

// シングルトンインスタンス
export const app = new Application();

// グローバルアクセス（後方互換性）
window.RBSApp = app; 