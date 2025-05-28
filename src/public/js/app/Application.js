/**
 * RBS陸上教室 メインアプリケーションクラス
 * アプリケーション全体のライフサイクルを管理
 */
class Application {
  constructor() {
    this.initialized = false;
    this.modules = new Map();
    this.config = null;
    this.router = null;
    this.startTime = Date.now();
  }

  /**
   * アプリケーションを初期化
   */
  async init() {
    try {
      console.log('🚀 RBS陸上教室システム v3.0 初期化開始');
      
      // 設定読み込み
      await this.loadConfig();
      
      // ルーター初期化
      await this.initRouter();
      
      // 共通モジュール読み込み
      await this.loadSharedModules();
      
      // ページ固有モジュール読み込み
      await this.loadPageModules();
      
      this.initialized = true;
      
      const loadTime = Date.now() - this.startTime;
      console.log(`✅ アプリケーション初期化完了 (${loadTime}ms)`);
      
      this.emit('app:ready', { loadTime });
      
    } catch (error) {
      console.error('❌ アプリケーション初期化失敗:', error);
      this.handleInitError(error);
      throw error;
    }
  }

  /**
   * 設定を読み込み
   */
  async loadConfig() {
    const { default: config } = await import('../shared/constants/config.js');
    this.config = config;
  }

  /**
   * ルーターを初期化
   */
  async initRouter() {
    const { Router } = await import('./Router.js');
    this.router = new Router(this.config.routing);
    await this.router.init();
  }

  /**
   * 共通モジュールを読み込み
   */
  async loadSharedModules() {
    const sharedModules = [
      'shared/services/EventBus',
      'shared/services/StorageService',
      'shared/utils/helpers'
    ];

    for (const modulePath of sharedModules) {
      try {
        const module = await import(`../${modulePath}.js`);
        const name = modulePath.split('/').pop();
        this.modules.set(name, module);
      } catch (error) {
        console.warn(`共通モジュール読み込み失敗: ${modulePath}`, error);
      }
    }
  }

  /**
   * ページ固有モジュールを読み込み
   */
  async loadPageModules() {
    const currentPage = this.getCurrentPage();
    
    try {
      let pageModule;
      
      if (currentPage === 'index') {
        pageModule = await import('./index.js');
      } else if (currentPage === 'news') {
        pageModule = await import('../modules/news/news.js');
      } else if (currentPage === 'admin') {
        pageModule = await import('../modules/admin/admin.js');
      } else {
        pageModule = await import('./index.js'); // デフォルト
      }
      
      this.modules.set(`page:${currentPage}`, pageModule);
      
      if (pageModule.init) {
        await pageModule.init(this);
      }
    } catch (error) {
      console.warn(`ページモジュール読み込み失敗: ${currentPage}`, error);
    }
  }

  /**
   * 現在のページを判定
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().replace('.html', '');
    
    if (filename === 'index' || filename === '' || path.endsWith('/')) {
      return 'index';
    }
    
    if (filename.startsWith('admin')) {
      return 'admin';
    }
    
    if (filename.startsWith('news')) {
      return 'news';
    }
    
    return 'index';
  }

  /**
   * モジュールを取得
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * 初期化エラーを処理
   */
  handleInitError(error) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // エラーを保存
    try {
      localStorage.setItem('rbs_last_error', JSON.stringify(errorInfo));
    } catch (e) {
      console.warn('エラー情報の保存に失敗');
    }

    // ユーザーにエラーを表示
    this.showErrorDialog(error);
  }

  /**
   * エラーダイアログを表示
   */
  showErrorDialog(error) {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="
          background: white; padding: 2rem; border-radius: 8px;
          max-width: 500px; margin: 1rem; text-align: center;
        ">
          <h2 style="color: #e53e3e; margin-bottom: 1rem;">
            システムエラー
          </h2>
          <p style="margin-bottom: 1rem;">
            アプリケーションの初期化に失敗しました。<br>
            ページを再読み込みしてください。
          </p>
          <div style="display: flex; gap: 0.5rem; justify-content: center;">
            <button onclick="window.location.reload()" style="
              background: #4299e1; color: white; border: none;
              padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;
            ">
              再読み込み
            </button>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
              background: #718096; color: white; border: none;
              padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;
            ">
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * イベントを発火
   */
  emit(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data });
    document.dispatchEvent(event);
  }

  /**
   * アプリケーション情報を取得
   */
  getInfo() {
    return {
      version: '3.0',
      initialized: this.initialized,
      loadTime: Date.now() - this.startTime,
      modules: Array.from(this.modules.keys()),
      currentPage: this.getCurrentPage()
    };
  }

  /**
   * アプリケーションを破棄
   */
  destroy() {
    this.modules.clear();
    this.initialized = false;
    console.log('🛑 アプリケーション破棄完了');
  }
}

export default Application; 