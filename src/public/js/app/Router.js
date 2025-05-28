/**
 * RBS陸上教室 ルーター
 * ページ間のナビゲーションを管理
 */
class Router {
  constructor(config = {}) {
    this.routes = config.routes || {};
    this.defaultRoute = config.defaultRoute || 'index';
    this.currentRoute = null;
    this.listeners = [];
  }

  /**
   * ルーターを初期化
   */
  async init() {
    // 現在のルートを設定
    this.currentRoute = this.getCurrentRoute();
    
    // ポップステートイベントを監視
    window.addEventListener('popstate', (event) => {
      this.handleRouteChange();
    });

    // 初期ルートを処理
    await this.handleRouteChange();
  }

  /**
   * 現在のルートを取得
   */
  getCurrentRoute() {
    const path = window.location.pathname;
    return this.routes[path] || this.defaultRoute;
  }

  /**
   * ルート変更を処理
   */
  async handleRouteChange() {
    const newRoute = this.getCurrentRoute();
    
    if (newRoute !== this.currentRoute) {
      const oldRoute = this.currentRoute;
      this.currentRoute = newRoute;
      
      // ルート変更イベントを発火
      this.emit('route:change', {
        from: oldRoute,
        to: newRoute,
        path: window.location.pathname
      });
    }
  }

  /**
   * 指定のページに移動
   */
  navigate(path) {
    if (window.location.pathname !== path) {
      history.pushState(null, '', path);
      this.handleRouteChange();
    }
  }

  /**
   * イベントリスナーを追加
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * イベントを発火
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`ルーターイベントエラー [${event}]:`, error);
        }
      });
    }

    // グローバルイベントとしても発火
    const customEvent = new CustomEvent(`router:${event}`, { detail: data });
    document.dispatchEvent(customEvent);
  }

  /**
   * ルート情報を取得
   */
  getRouteInfo() {
    return {
      current: this.currentRoute,
      path: window.location.pathname,
      routes: Object.keys(this.routes)
    };
  }
}

export { Router }; 