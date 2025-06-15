/**
 * ニュース機能メインエントリーポイント
 * @version 3.0.0 - Supabase完全統合版
 */

import { EventBus } from '../../shared/services/EventBus.js';
import { getLPNewsSupabaseService } from './services/LPNewsSupabaseService.js';
import { getArticleSupabaseService } from '../../shared/services/ArticleSupabaseService.js';
import { LPNewsController } from './controllers/LPNewsController.js';
import { NewsDetailController } from './controllers/NewsDetailController.js';

/**
 * ニュース機能アプリケーションクラス
 */
class NewsApp {
  constructor() {
    this.componentName = 'NewsApp';
    this.initialized = false;
    this.controllers = new Map();
    this.services = new Map();
    
    // パフォーマンス追跡
    this.performanceMetrics = {
      initStartTime: null,
      initEndTime: null,
      serviceLoadTimes: new Map()
    };
  }

  /**
   * アプリケーション初期化
   */
  async init() {
    if (this.initialized) {
      console.log('⚠️ NewsApp: 既に初期化済み');
      return;
    }

    this.performanceMetrics.initStartTime = performance.now();
    console.log('📰 ニュース機能初期化開始');

    try {
      // Supabaseサービス初期化
      await this.initializeSupabaseServices();
      
      // コントローラー初期化
      await this.initializeControllers();
      
      // イベント設定
      this.setupEventHandlers();
      
      // 初期データ読み込み
      await this.loadInitialData();
      
      this.performanceMetrics.initEndTime = performance.now();
      this.initialized = true;
      
      console.log(`✅ ニュース機能初期化完了 (${Math.round(this.performanceMetrics.initEndTime - this.performanceMetrics.initStartTime)}ms)`);
      
      // 初期化完了イベント
      EventBus.emit('newsApp:initialized', {
        performance: this.getPerformanceInfo()
      });
      
    } catch (error) {
      console.error('❌ ニュース機能初期化エラー:', error);
      this.handleInitializationError(error);
      throw error;
    }
  }

  /**
   * Supabaseサービス初期化
   */
  async initializeSupabaseServices() {
    console.log('🗄️ Supabaseサービス初期化中...');
    
    const supabaseServices = [
      { name: 'lpNewsService', service: getLPNewsSupabaseService() },
      { name: 'articleService', service: getArticleSupabaseService() }
    ];

    for (const { name, service } of supabaseServices) {
      try {
        const startTime = performance.now();
        
        if (!service.initialized) {
          await service.init();
        }
        
        this.services.set(name, service);
        this.performanceMetrics.serviceLoadTimes.set(name, performance.now() - startTime);
        
        console.log(`✅ ${name} 初期化完了`);
      } catch (error) {
        console.error(`❌ ${name} 初期化エラー:`, error);
        // 個別のサービス初期化失敗は警告レベルで継続
      }
    }
    
    console.log('✅ Supabaseサービス初期化完了');
  }

  /**
   * コントローラー初期化（ページタイプ判定）
   */
  async initializeControllers() {
    console.log('🎮 コントローラー初期化中...');
    
    try {
      // ページタイプを判定
      const pageType = this.detectPageType();
      console.log('📄 ページタイプ:', pageType);
      
      // LPニュースコントローラー（全ページで初期化）
      const lpNewsController = new LPNewsController();
      await lpNewsController.init();
      this.controllers.set('lpNewsController', lpNewsController);
      
      // ニュース詳細コントローラー（詳細ページのみ）
      if (pageType === 'news-detail') {
        const newsDetailController = new NewsDetailController();
        await newsDetailController.init();
        this.controllers.set('newsDetailController', newsDetailController);
        console.log('✅ NewsDetailController初期化完了');
      } else {
        console.log('ℹ️ NewsDetailController初期化スキップ（詳細ページ以外）');
      }
      
      console.log('✅ コントローラー初期化完了');
    } catch (error) {
      console.error('❌ コントローラー初期化エラー:', error);
    }
  }

  /**
   * ページタイプ検出
   */
  detectPageType() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'index.html';
    const search = window.location.search;
    
    if (fileName.includes('news-detail') || (fileName.includes('news.html') && search.includes('id='))) {
      return 'news-detail';
    }
    if (fileName.includes('news.html')) {
      return 'news-list';
    }
    return 'home'; // index.html またはルート
  }

  /**
   * イベントハンドラー設定
   */
  setupEventHandlers() {
    console.log('📡 イベントハンドラー設定中...');
    
    // 記事データ変更イベント
    EventBus.on('article:saved', () => {
      this.refreshNews();
    });
    
    EventBus.on('article:deleted', () => {
      this.refreshNews();
    });
    
    EventBus.on('article:published', () => {
      this.refreshNews();
    });
    
    // エラーハンドリング
    EventBus.on('error:critical', (data) => {
      this.handleCriticalError(data.error);
    });
    
    console.log('✅ イベントハンドラー設定完了');
  }

  /**
   * 初期データ読み込み
   */
  async loadInitialData() {
    console.log('📊 初期データ読み込み中...');
    
    try {
      // LPニュースの初期読み込み
      const lpNewsController = this.controllers.get('lpNewsController');
      if (lpNewsController) {
        await lpNewsController.loadNews();
      }
      
      console.log('✅ 初期データ読み込み完了');
    } catch (error) {
      console.error('❌ 初期データ読み込みエラー:', error);
    }
  }

  /**
   * ニュース更新
   */
  async refreshNews() {
    try {
      const lpNewsController = this.controllers.get('lpNewsController');
      if (lpNewsController) {
        await lpNewsController.refresh();
      }
    } catch (error) {
      console.error('❌ ニュース更新エラー:', error);
    }
  }

  /**
   * 重大エラー処理
   */
  handleCriticalError(error) {
    console.error('🚨 重大エラー:', error);
    
    // エラー表示
    const errorMessage = `
      <div class="news-error-overlay">
        <div class="news-error-dialog">
          <h2>⚠️ ニュース読み込みエラー</h2>
          <p>ニュースの読み込みでエラーが発生しました。</p>
          <div class="error-detail">${error.message}</div>
          <button onclick="window.location.reload()" class="news-error-btn">
            🔄 再読み込み
          </button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorMessage);
  }

  /**
   * 初期化エラー処理
   */
  handleInitializationError(error) {
    console.error('🚨 初期化エラー:', error);
    
    // フォールバック表示
    const newsContainer = document.querySelector('.news-container, #news-container, .news-section');
    if (newsContainer) {
      newsContainer.innerHTML = `
        <div class="news-init-error">
          <h2>⚠️ ニュース初期化エラー</h2>
          <p>ニュース機能の初期化に失敗しました。</p>
          <div class="error-detail">${error.message}</div>
          <button onclick="window.location.reload()">🔄 再読み込み</button>
        </div>
      `;
    }
  }

  /**
   * パフォーマンス情報取得
   */
  getPerformanceInfo() {
    return {
      totalInitTime: this.performanceMetrics.initEndTime - this.performanceMetrics.initStartTime,
      serviceLoadTimes: Object.fromEntries(this.performanceMetrics.serviceLoadTimes),
      servicesCount: this.services.size,
      controllersCount: this.controllers.size
    };
  }

  /**
   * サービス取得
   */
  getService(name) {
    return this.services.get(name);
  }

  /**
   * コントローラー取得
   */
  getController(name) {
    return this.controllers.get(name);
  }

  /**
   * アプリケーション破棄
   */
  destroy() {
    console.log('🧹 ニュース機能クリーンアップ中...');
    
    // コントローラーの破棄
    this.controllers.forEach((controller, name) => {
      try {
        if (typeof controller.destroy === 'function') {
          controller.destroy();
        }
      } catch (error) {
        console.warn(`⚠️ ${name} 破棄エラー:`, error);
      }
    });
    
    // サービスの破棄
    this.services.forEach((service, name) => {
      try {
        if (typeof service.destroy === 'function') {
          service.destroy();
        }
      } catch (error) {
        console.warn(`⚠️ ${name} 破棄エラー:`, error);
      }
    });
    
    // イベントリスナーのクリーンアップ
    EventBus.off('article:saved');
    EventBus.off('article:deleted');
    EventBus.off('article:published');
    EventBus.off('error:critical');
    
    // 状態リセット
    this.initialized = false;
    this.controllers.clear();
    this.services.clear();
    
    console.log('✅ ニュース機能クリーンアップ完了');
  }
}

// アプリケーションインスタンス作成
const newsApp = new NewsApp();

/**
 * ニュース機能を初期化（Application.js用のエントリーポイント）
 * @returns {Promise<NewsApp>}
 */
export async function initNewsFeature() {
  console.log('📰 ニュース機能初期化開始 (統一版)');
  
  try {
    await newsApp.init();
    console.log('✅ ニュース機能初期化完了');
    return newsApp;
  } catch (error) {
    console.error('❌ ニュース機能初期化エラー:', error);
    throw error;
  }
}

// DOMContentLoaded時に初期化（スタンドアローン用）
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Application.jsから呼ばれる場合は重複初期化を避ける
    if (!newsApp.initialized) {
      await newsApp.init();
    }
    
    // グローバルアクセス用
    window.newsApp = newsApp;
    
  } catch (error) {
    console.error('❌ ニュース機能起動エラー:', error);
  }
});

// エクスポート
export { newsApp };
export default NewsApp;