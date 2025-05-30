/**
 * アプリケーションメインクラス
 * 全体的な初期化とコンポーネント管理を担当
 * @version 3.0.0 - 統合記事管理システム対応
 */

import { EventBus } from './shared/services/EventBus.js';
import { CONFIG } from './shared/constants/config.js';

export class Application {
  constructor() {
    this.initialized = false;
    this.componentName = 'Application';
    
    // サービス
    this.articleStorageService = null;
    this.layoutInitializer = null;
    
    // コンポーネント
    this.newsDisplayComponent = null;
    
    // 状態管理
    this.currentPageType = null;
    this.appConfig = {};
    
    // 初期化開始時刻
    this.initStartTime = performance.now();
  }

  /**
   * アプリケーション初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      this.log('既に初期化済みです');
      return;
    }

    try {
      this.log('アプリケーション初期化開始');
      
      // ページタイプの検出
      this.detectPageType();
      
      // レイアウト機能の初期化
      await this.initializeLayout();
      
      // ニュース機能の初期化
      await this.initializeNewsFeatures();
      
      // ページ固有機能の初期化
      await this.initializePageFeatures();
      
      // 初期化完了
      this.initialized = true;
      const initTime = Math.round(performance.now() - this.initStartTime);
      
      this.log(`アプリケーション初期化完了 (${initTime}ms) - ページ: ${this.currentPageType}`);
      
      // 初期化完了イベント
      EventBus.emit('application:initialized', {
        pageType: this.currentPageType,
        initTime,
        services: {
          articleStorage: !!this.articleStorageService,
          layout: !!this.layoutInitializer,
          newsDisplay: !!this.newsDisplayComponent
        }
      });
      
    } catch (error) {
      this.error('アプリケーション初期化エラー:', error);
      throw error;
    }
  }

  /**
   * ページタイプの検出
   * @private
   */
  detectPageType() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'index.html';
    
    // URLパスベースの判定
    if (path.includes('/admin') || fileName.includes('admin')) {
      this.currentPageType = 'admin';
    } else if (path.includes('/news-detail') || fileName.includes('news-detail')) {
      this.currentPageType = 'news-detail';
    } else if (path.includes('/news') || fileName.includes('news')) {
      this.currentPageType = 'news';
    } else if (fileName === 'index.html' || fileName === '' || path === '/') {
      this.currentPageType = 'home';
    } else {
      this.currentPageType = 'other';
    }
    
    this.debug(`ページタイプ検出: ${this.currentPageType} (${fileName})`);
  }

  /**
   * レイアウト機能の初期化
   * @private
   */
  async initializeLayout() {
    try {
      this.log('レイアウト機能初期化開始');
      
      const { initializeLayout } = await import('./shared/components/layout/index.js');
      
      const layoutOptions = {
        pageType: this.currentPageType,
        headerContainerId: 'header-container',
        footerContainerId: 'footer-container',
        templateOptions: {}
      };
      
      const { initializer, result } = await initializeLayout(layoutOptions);
      
      this.layoutInitializer = initializer;
      
      if (result.success) {
        this.log('レイアウト機能初期化完了');
      } else {
        this.warn('レイアウト機能初期化で問題が発生:', result.error);
      }
      
    } catch (error) {
      this.error('レイアウト機能初期化エラー:', error);
    }
  }

  /**
   * ニュース機能の初期化
   * @private
   */
  async initializeNewsFeatures() {
    try {
      this.log('ニュース機能初期化開始');
      
      // 統合記事ストレージサービスの初期化
      const { getArticleStorageService } = await import('./shared/services/ArticleStorageService.js');
      this.articleStorageService = getArticleStorageService();
      await this.articleStorageService.init();
      
      // ニュース表示コンポーネントの初期化（ホームページのみ）
      if (this.currentPageType === 'home') {
        const newsSection = document.getElementById('news');
        if (newsSection) {
          const { default: NewsDisplayComponent } = await import('./shared/components/news/NewsDisplayComponent.js');
          this.newsDisplayComponent = new NewsDisplayComponent(newsSection);
          await this.newsDisplayComponent.init();
          
          // グローバルアクセス用
          window.newsDisplayComponent = this.newsDisplayComponent;
        }
      }
      
      // ニュース詳細ページの初期化
      if (this.currentPageType === 'news-detail') {
        const { initNewsFeature } = await import('./features/news/index.js');
        await initNewsFeature();
      }
      
      // 管理画面の記事管理機能初期化
      if (this.currentPageType === 'admin') {
        await this.initializeAdminFeatures();
      }
      
      this.log('ニュース機能初期化完了');
      
    } catch (error) {
      this.error('ニュース機能初期化エラー:', error);
    }
  }

  /**
   * 管理画面機能の初期化
   * @private
   */
  async initializeAdminFeatures() {
    try {
      this.log('管理画面機能初期化開始');
      
      // 管理画面の記事データサービス初期化
      const { getArticleDataService } = await import('./features/admin/services/ArticleDataService.js');
      const articleDataService = getArticleDataService();
      await articleDataService.init();
      
      // 管理画面のコンポーネント初期化
      const { initAdminFeatures } = await import('./features/admin/index.js');
      await initAdminFeatures();
      
      this.log('管理画面機能初期化完了');
      
    } catch (error) {
      this.error('管理画面機能初期化エラー:', error);
    }
  }

  /**
   * ページ固有機能の初期化
   * @private
   */
  async initializePageFeatures() {
    try {
      switch (this.currentPageType) {
        case 'home':
          await this.initializeHomePageFeatures();
          break;
        
        case 'news':
          await this.initializeNewsPageFeatures();
          break;
          
        case 'admin':
          // 管理画面機能は既に初期化済み
          break;
          
        default:
          this.debug('ページ固有機能の初期化はスキップします');
      }
    } catch (error) {
      this.error('ページ固有機能初期化エラー:', error);
    }
  }

  /**
   * ホームページ機能の初期化
   * @private
   */
  async initializeHomePageFeatures() {
    try {
      // 現在は追加の機能なし（将来の拡張用）
      this.debug('ホームページ機能初期化完了');
      
    } catch (error) {
      this.error('ホームページ機能初期化エラー:', error);
    }
  }

  /**
   * ニュース一覧ページ機能の初期化
   * @private
   */
  async initializeNewsPageFeatures() {
    try {
      // 現在は追加の機能なし（将来の拡張用）
      this.debug('ニュース一覧ページ機能初期化完了');
      
    } catch (error) {
      this.error('ニュース一覧ページ機能初期化エラー:', error);
    }
  }

  /**
   * アプリケーション状態の取得
   * @returns {Object} 状態情報
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      pageType: this.currentPageType,
      services: {
        articleStorage: this.articleStorageService?.getStatus() || null,
        layout: this.layoutInitializer?.getPerformanceInfo() || null
      },
      components: {
        newsDisplay: this.newsDisplayComponent?.getStatus() || null
      },
      performance: {
        initTime: this.initialized ? Math.round(performance.now() - this.initStartTime) : null
      }
    };
    
    return status;
  }

  /**
   * デバッグ情報の表示
   */
  showDebugInfo() {
    const status = this.getStatus();
    
    console.group('🚀 Application Debug Info');
    console.log('Application Status:', status);
    console.log('EventBus Status:', EventBus.getStatus?.() || 'No status method');
    console.groupEnd();
    
    return status;
  }

  /**
   * アプリケーション破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.log('アプリケーション破棄開始');
      
      // コンポーネントの破棄
      if (this.newsDisplayComponent) {
        await this.newsDisplayComponent.destroy();
        this.newsDisplayComponent = null;
      }
      
      if (this.layoutInitializer) {
        this.layoutInitializer.destroy();
        this.layoutInitializer = null;
      }
      
      // サービスの破棄
      if (this.articleStorageService) {
        await this.articleStorageService.destroy();
        this.articleStorageService = null;
      }
      
      this.initialized = false;
      
      this.log('アプリケーション破棄完了');
      
      // 破棄完了イベント
      EventBus.emit('application:destroyed');
      
    } catch (error) {
      this.error('アプリケーション破棄エラー:', error);
    }
  }

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log(`🚀 ${this.componentName}:`, ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug.enabled) {
      console.debug(`🔍 ${this.componentName}:`, ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn(`⚠️ ${this.componentName}:`, ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error(`❌ ${this.componentName}:`, ...args);
  }
}

// シングルトンインスタンス
let applicationInstance = null;

/**
 * Applicationのシングルトンインスタンスを取得
 * @returns {Application}
 */
export function getApplication() {
  if (!applicationInstance) {
    applicationInstance = new Application();
  }
  return applicationInstance;
}

/**
 * アプリケーション初期化関数
 * @returns {Promise<Application>}
 */
export async function initializeApplication() {
  const app = getApplication();
  await app.init();
  return app;
}

// グローバルアクセス用
window.getApplication = getApplication;
window.initializeApplication = initializeApplication;

// デフォルトエクスポート
export default Application;