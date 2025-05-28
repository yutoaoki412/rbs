/**
 * アプリケーションメインクラス
 * 全体の初期化と管理を行う
 */
class Application {
  constructor(config = {}) {
    this.config = {
      debug: false,
      autoInit: true,
      modules: [],
      ...config
    };
    
    this.modules = new Map();
    this.isInitialized = false;
    this.startTime = Date.now();
    
    // イベントバスの設定
    if (this.config.debug) {
      eventBus.setDebugMode(true);
    }
    
    // 自動初期化
    if (this.config.autoInit) {
      this.init();
    }
  }

  /**
   * アプリケーションを初期化
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      console.log('[Application] 初期化開始...');
      
      // DOM準備完了を待機
      await this.waitForDOM();
      
      // コアモジュールを初期化
      await this.initializeCoreModules();
      
      // ページ固有モジュールを初期化
      await this.initializePageModules();
      
      // 初期化完了
      this.isInitialized = true;
      const initTime = Date.now() - this.startTime;
      
      console.log(`[Application] 初期化完了 (${initTime}ms)`);
      
      // 初期化完了イベントを発火
      eventBus.emit('app:initialized', {
        initTime,
        modules: Array.from(this.modules.keys())
      });
      
      eventBus.emit('page:initialized');
      
    } catch (error) {
      console.error('[Application] 初期化エラー:', error);
      eventBus.emit('app:error', { error, phase: 'initialization' });
    }
  }

  /**
   * DOM準備完了を待機
   */
  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * コアモジュールを初期化
   */
  async initializeCoreModules() {
    console.log('[Application] コアモジュール初期化中...');
    
    // UIインタラクションマネージャーは既に初期化されている
    if (window.uiManager) {
      this.modules.set('uiManager', window.uiManager);
    }
    
    // その他のコアモジュールがあれば追加
  }

  /**
   * ページ固有モジュールを初期化
   */
  async initializePageModules() {
    console.log('[Application] ページモジュール初期化中...');
    
    // 現在のページを判定
    const currentPage = this.detectCurrentPage();
    console.log(`[Application] 現在のページ: ${currentPage}`);
    
    // ページ固有の初期化
    switch (currentPage) {
      case 'index':
        await this.initializeIndexPage();
        break;
      case 'news':
        await this.initializeNewsPage();
        break;
      case 'admin':
        await this.initializeAdminPage();
        break;
      default:
        console.log('[Application] 汎用ページとして初期化');
    }
  }

  /**
   * 現在のページを判定
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    if (filename === 'index.html' || filename === '' || filename === '/') {
      return 'index';
    } else if (filename.includes('news')) {
      return 'news';
    } else if (filename.includes('admin')) {
      return 'admin';
    }
    
    return 'generic';
  }

  /**
   * インデックスページを初期化
   */
  async initializeIndexPage() {
    console.log('[Application] インデックスページ初期化中...');
    
    // レッスンステータス管理を初期化
    if (typeof LessonStatusManager !== 'undefined') {
      const lessonStatusManager = new LessonStatusManager();
      this.modules.set('lessonStatusManager', lessonStatusManager);
      
      // ステータスバナーを初期化
      if (typeof StatusBanner !== 'undefined') {
        const statusBanner = new StatusBanner({ lessonStatusManager });
        this.modules.set('statusBanner', statusBanner);
        
        // グローバルに公開（後方互換性のため）
        window.statusBanner = statusBanner;
      }
    }
    
    eventBus.emit('page:index:initialized');
  }

  /**
   * ニュースページを初期化
   */
  async initializeNewsPage() {
    console.log('[Application] ニュースページ初期化中...');
    
    // ニュース関連のモジュールを初期化
    eventBus.emit('page:news:initialized');
  }

  /**
   * 管理画面を初期化
   */
  async initializeAdminPage() {
    console.log('[Application] 管理画面初期化中...');
    
    // 管理画面関連のモジュールを初期化
    eventBus.emit('page:admin:initialized');
  }

  /**
   * モジュールを登録
   */
  registerModule(name, module) {
    this.modules.set(name, module);
    eventBus.emit('app:moduleRegistered', { name, module });
  }

  /**
   * モジュールを取得
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * モジュールを削除
   */
  unregisterModule(name) {
    const module = this.modules.get(name);
    if (module && typeof module.destroy === 'function') {
      module.destroy();
    }
    this.modules.delete(name);
    eventBus.emit('app:moduleUnregistered', { name });
  }

  /**
   * アプリケーション情報を取得
   */
  getInfo() {
    return {
      isInitialized: this.isInitialized,
      modules: Array.from(this.modules.keys()),
      config: this.config,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * デバッグ情報を出力
   */
  debug() {
    console.group('[Application] デバッグ情報');
    console.log('初期化状態:', this.isInitialized);
    console.log('登録モジュール:', Array.from(this.modules.keys()));
    console.log('設定:', this.config);
    console.log('稼働時間:', Date.now() - this.startTime, 'ms');
    console.log('イベントバス:', eventBus.getEventNames());
    console.groupEnd();
  }

  /**
   * アプリケーションを破棄
   */
  destroy() {
    console.log('[Application] 破棄中...');
    
    // 全モジュールを破棄
    this.modules.forEach((module, name) => {
      this.unregisterModule(name);
    });
    
    // イベントバスをクリア
    eventBus.clear();
    
    this.isInitialized = false;
    
    eventBus.emit('app:destroyed');
  }
}

// グローバルに公開
window.Application = Application;

// アプリケーションインスタンスを作成
const app = new Application({
  debug: window.location.hostname === 'localhost' || window.location.search.includes('debug=true')
});

// グローバルに公開
window.app = app; 