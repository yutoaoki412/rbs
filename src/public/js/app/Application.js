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
      'shared/services/ActionHandler',
      'shared/utils/helpers'
    ];

    for (const modulePath of sharedModules) {
      try {
        console.log(`📦 モジュール読み込み中: ${modulePath}`);
        const module = await import(`../${modulePath}.js`);
        const name = modulePath.split('/').pop();
        this.modules.set(name, module);
        
        // ActionHandlerは確実に初期化
        if (name === 'ActionHandler') {
          console.log('🔧 ActionHandler初期化開始');
          if (module.actionHandler) {
            module.actionHandler.init();
            console.log('✅ ActionHandler初期化完了');
          } else {
            console.warn('⚠️ actionHandlerインスタンスが見つかりません');
          }
        }
      } catch (error) {
        console.warn(`共通モジュール読み込み失敗: ${modulePath}`, error);
      }
    }
    
    // CommonHeaderとCommonFooterを事前に読み込み
    await this.preloadCommonComponents();
    
    // ヘッダーとフッターを読み込み
    await this.loadTemplates();
  }

  /**
   * CommonHeaderとCommonFooterを事前読み込み
   */
  async preloadCommonComponents() {
    try {
      console.log('📦 CommonHeader/CommonFooter事前読み込み開始');
      
      await Promise.all([
        import('../components/CommonHeader.js'),
        import('../components/CommonFooter.js')
      ]);
      
      console.log('✅ CommonHeader/CommonFooter事前読み込み完了');
    } catch (error) {
      console.warn('⚠️ CommonHeader/CommonFooter事前読み込み失敗:', error);
    }
  }

  /**
   * ヘッダーとフッターのテンプレートを読み込み
   */
  async loadTemplates() {
    const currentPage = this.getCurrentPage();
    console.log(`🔄 テンプレート読み込み開始 - ページ: ${currentPage}`);
    
    // まずフォールバック版を確実に表示
    this.createFallbackHeaderFooter();
    console.log('✅ フォールバック ヘッダー・フッター表示完了');
    
    try {
      // 新しいTemplateLoaderを使用してヘッダーとフッターを置き換え
      const TemplateLoader = await import('../shared/components/template/TemplateLoader.js');
      const templateLoader = new TemplateLoader.default();
      
      console.log('📦 TemplateLoader初期化完了');
      
      // 既存のヘッダー・フッターを一時的に削除
      const existingHeader = document.querySelector('header');
      const existingFooter = document.querySelector('footer');
      
      const success = await templateLoader.loadAll({
        currentPage,
        logoPath: currentPage === 'index' ? '#hero' : 'index.html',
        activeSection: currentPage === 'news' ? 'news' : null
      });
      
      if (success) {
        // 成功した場合は古いヘッダー・フッターを削除
        if (existingHeader) existingHeader.remove();
        if (existingFooter) existingFooter.remove();
        console.log('✅ TemplateLoader版ヘッダー・フッター表示完了');
      } else {
        console.warn('⚠️ TemplateLoader読み込み失敗、フォールバック版を継続使用');
      }
      
    } catch (error) {
      console.error('❌ TemplateLoader処理失敗:', error.message);
      console.log('🔧 フォールバック版を継続使用します');
    }
  }

  /**
   * フォールバック用の基本ヘッダー・フッターを作成
   */
  createFallbackHeaderFooter() {
    console.log('🔧 フォールバック ヘッダー・フッター作成中...');
    
    const currentPage = this.getCurrentPage();
    
    // 基本的なヘッダーの作成（元のheader.htmlと完全に同じ）
    if (!document.querySelector('header')) {
      const logoHref = currentPage === 'index' ? '#hero' : 'index.html';
      const baseHref = currentPage === 'index' ? '' : 'index.html';
      
      const headerHTML = `
        <header class="header">
          <nav class="nav container">
            <div class="logo">
              <a href="${logoHref}" id="logo-link">
                <img src="../assets/images/lp-logo.png" alt="RBS陸上教室 Running & Brain School" class="logo-image">
              </a>
            </div>
            <ul class="nav-links">
              <li><a href="${baseHref}#about">RBSとは</a></li>
              <li><a href="${baseHref}#program">プログラム</a></li>
              <li><a href="${baseHref}#coach">コーチ</a></li>
              <li><a href="${baseHref}#location">教室情報</a></li>
              <li><a href="${baseHref}#price">料金</a></li>
              <li><a href="${baseHref}#faq">よくある質問</a></li>
              <li><a href="news.html" class="nav-link" data-page="news" data-section="news">NEWS</a></li>
              <li><a href="https://hacomono.jp/" class="login-btn" target="_blank">会員ログイン</a></li>
            </ul>
            <button class="mobile-menu-btn" aria-expanded="false" aria-controls="nav-links" data-action="toggle-mobile-menu">☰</button>
          </nav>
        </header>
      `;
      document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }

    // 基本的なフッターの作成（元のfooter.htmlと完全に同じ）
    if (!document.querySelector('footer')) {
      const baseHref = currentPage === 'index' ? '' : 'index.html';
      
      const footerHTML = `
        <footer>
          <div class="footer-links">
            <a href="${baseHref}#about">RBSとは</a>
            <a href="${baseHref}#program">プログラム</a>
            <a href="${baseHref}#location">教室情報</a>
            <a href="${baseHref}#price">料金</a>
            <a href="news.html">ニュース</a>
          </div>
          <p>&copy; <span class="copyright-year">${new Date().getFullYear()}</span> RBS陸上教室. All rights reserved.</p>
        </footer>
      `;
      document.body.insertAdjacentHTML('beforeend', footerHTML);
    }
    
    // CommonHeaderとCommonFooterの機能を初期化
    this.initializeFallbackComponents();
    
    console.log('✅ フォールバック ヘッダー・フッター作成完了');
  }

  /**
   * フォールバック版のコンポーネントを初期化
   */
  async initializeFallbackComponents() {
    try {
      console.log('🔧 フォールバック版コンポーネント初期化開始');
      
      // グローバルに存在する場合はそれを使用
      if (window.CommonHeader) {
        const header = new window.CommonHeader();
        header.init({ currentPage: this.getCurrentPage() });
        console.log('✅ CommonHeader (グローバル版) 初期化完了');
      }

      if (window.CommonFooter) {
        const footer = new window.CommonFooter();
        footer.init();
        footer.updateCopyright();
        console.log('✅ CommonFooter (グローバル版) 初期化完了');
      }
      
      // グローバル版がない場合は動的にインポート
      if (!window.CommonHeader || !window.CommonFooter) {
        const [CommonHeader, CommonFooter] = await Promise.all([
          import('../components/CommonHeader.js'),
          import('../components/CommonFooter.js')
        ]);

        if (!window.CommonHeader && CommonHeader.default) {
          const header = new CommonHeader.default();
          header.init({ currentPage: this.getCurrentPage() });
          console.log('✅ CommonHeader (インポート版) 初期化完了');
        }

        if (!window.CommonFooter && CommonFooter.default) {
          const footer = new CommonFooter.default();
          footer.init();
          footer.updateCopyright();
          console.log('✅ CommonFooter (インポート版) 初期化完了');
        }
      }
      
    } catch (error) {
      console.error('❌ フォールバック版コンポーネント初期化エラー:', error);
      console.log('🔧 基本機能のみで継続します');
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