/**
 * アプリケーション全体のパス設定
 * リダイレクトやリンクのパス不一致を防ぐための統一設定
 * @version 1.1.0 - リダイレクトループ防止機能追加
 */

/**
 * リダイレクト履歴管理（ループ防止用）
 */
const redirectHistory = {
  history: [],
  maxHistory: 10,
  loopThreshold: 3,
  
  /**
   * リダイレクトを記録
   * @param {string} from - リダイレクト元
   * @param {string} to - リダイレクト先
   * @returns {boolean} リダイレクト実行可能かどうか
   */
  recordRedirect(from, to) {
    const now = Date.now();
    const entry = { from, to, timestamp: now };
    
    // 履歴に追加
    this.history.push(entry);
    
    // 履歴サイズ制限
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // ループチェック（過去5秒以内の同じパターンをチェック）
    const recentRedirects = this.history.filter(h => 
      now - h.timestamp < 5000 && 
      ((h.from === from && h.to === to) || (h.from === to && h.to === from))
    );
    
    if (recentRedirects.length >= this.loopThreshold) {
      console.error('🚨 リダイレクトループを検出:', { from, to, count: recentRedirects.length });
      return false;
    }
    
    return true;
  },
  
  /**
   * 履歴をクリア
   */
  clear() {
    this.history = [];
  },
  
  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    return {
      history: this.history,
      isLoopDetected: this.history.length >= this.loopThreshold
    };
  }
};

/**
 * 現在の実行環境を検出
 */
const detectEnvironment = () => {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // 開発環境の判定
  const isDevelopment = hostname === 'localhost' || 
                       hostname === '127.0.0.1' || 
                       hostname.includes('local');
  
  // ファイル構造の判定（src/public/構造かどうか）
  const isSourceStructure = pathname.includes('/src/public/');
  
  return {
    isDevelopment,
    isSourceStructure,
    hostname,
    pathname
  };
};

const environment = detectEnvironment();

/**
 * 基準パスの設定
 * 環境に応じて適切なベースパスを設定
 */
const getBasePath = () => {
  if (environment.isSourceStructure) {
    // src/public/構造の場合
    return '/src/public';
  } else {
    // 本番環境やビルド後の構造
    return '';
  }
};

/**
 * 統一パス設定
 */
export const PATHS = {
  // 基準パス
  BASE: getBasePath(),
  
  // ページパス
  PAGES: {
    // 管理画面関連
    ADMIN_LOGIN: `${getBasePath()}/pages/admin-login.html`,
    ADMIN: `${getBasePath()}/pages/admin.html`,
    
    // 一般ページ
    HOME: `${getBasePath()}/pages/index.html`,
    NEWS: `${getBasePath()}/pages/news.html`,
    NEWS_DETAIL: `${getBasePath()}/pages/news-detail.html`,
    
    // 相対パス（同じディレクトリ内）
    RELATIVE: {
      ADMIN_LOGIN: 'admin-login.html',
      ADMIN: 'admin.html',
      HOME: 'index.html',
      NEWS: 'news.html',
      NEWS_DETAIL: 'news-detail.html'
    }
  },
  
  // アセットパス
  ASSETS: {
    CSS: `${getBasePath()}/css`,
    JS: `${getBasePath()}/js`,
    IMAGES: `${getBasePath()}/assets/images`,
    VIDEOS: `${getBasePath()}/assets/videos`
  },
  
  // APIパス（将来的な拡張用）
  API: {
    BASE: '/api',
    AUTH: '/api/auth',
    NEWS: '/api/news'
  }
};

/**
 * パス取得ヘルパー関数
 */
export const PathHelper = {
  /**
   * 管理画面ログインページのパスを取得
   * @param {boolean} absolute - 絶対パスで取得するか
   * @returns {string} パス
   */
  getAdminLoginPath(absolute = false) {
    if (absolute) {
      return PATHS.PAGES.ADMIN_LOGIN;
    } else {
      // 現在のページディレクトリから相対的に取得
      const currentPath = window.location.pathname;
      if (currentPath.includes('/pages/')) {
        return PATHS.PAGES.RELATIVE.ADMIN_LOGIN;
      } else {
        return `pages/${PATHS.PAGES.RELATIVE.ADMIN_LOGIN}`;
      }
    }
  },
  
  /**
   * 管理画面のパスを取得
   * @param {boolean} absolute - 絶対パスで取得するか
   * @returns {string} パス
   */
  getAdminPath(absolute = false) {
    if (absolute) {
      return PATHS.PAGES.ADMIN;
    } else {
      const currentPath = window.location.pathname;
      if (currentPath.includes('/pages/')) {
        return PATHS.PAGES.RELATIVE.ADMIN;
      } else {
        return `pages/${PATHS.PAGES.RELATIVE.ADMIN}`;
      }
    }
  },
  
  /**
   * ホームページのパスを取得
   * @param {boolean} absolute - 絶対パスで取得するか
   * @returns {string} パス
   */
  getHomePath(absolute = false) {
    if (absolute) {
      return PATHS.PAGES.HOME;
    } else {
      const currentPath = window.location.pathname;
      if (currentPath.includes('/pages/')) {
        return PATHS.PAGES.RELATIVE.HOME;
      } else {
        return `pages/${PATHS.PAGES.RELATIVE.HOME}`;
      }
    }
  },
  
  /**
   * リダイレクト用の安全なパス取得
   * 現在のページ構造を考慮して適切なパスを返す
   * @param {string} targetPage - 対象ページ ('admin', 'admin-login', 'home', etc.)
   * @returns {string} 安全なリダイレクトパス
   */
  getSafeRedirectPath(targetPage) {
    const currentPath = window.location.pathname;
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
    
    switch (targetPage) {
      case 'admin-login':
        if (currentDir.endsWith('/pages')) {
          return 'admin-login.html';
        } else if (currentDir.includes('/src/public')) {
          return 'pages/admin-login.html';
        } else {
          return PATHS.PAGES.ADMIN_LOGIN;
        }
        
      case 'admin':
        if (currentDir.endsWith('/pages')) {
          return 'admin.html';
        } else if (currentDir.includes('/src/public')) {
          return 'pages/admin.html';
        } else {
          return PATHS.PAGES.ADMIN;
        }
        
      case 'home':
        if (currentDir.endsWith('/pages')) {
          return 'index.html';
        } else if (currentDir.includes('/src/public')) {
          return 'pages/index.html';
        } else {
          return PATHS.PAGES.HOME;
        }
        
      default:
        console.warn(`Unknown target page: ${targetPage}`);
        return '/';
    }
  }
};

/**
 * リダイレクト関数
 */
export const redirect = {
  /**
   * 管理画面ログインページにリダイレクト
   * @param {string} returnUrl - 戻り先URL（オプショナル）
   */
  toAdminLogin(returnUrl = null) {
    const currentPath = window.location.pathname;
    const path = PathHelper.getSafeRedirectPath('admin-login');
    const url = returnUrl ? `${path}?redirect=${encodeURIComponent(returnUrl)}` : path;
    
    // ループ防止チェック
    if (!redirectHistory.recordRedirect(currentPath, path)) {
      console.error('🚨 リダイレクトループ防止: admin-loginへのリダイレクトをブロック');
      // ループが検出された場合は、強制的にホームページにリダイレクト
      setTimeout(() => {
        window.location.href = PathHelper.getSafeRedirectPath('home');
      }, 2000);
      return;
    }
    
    console.log(`🔄 管理画面ログインページにリダイレクト: ${url}`);
    window.location.href = url;
  },
  
  /**
   * 管理画面にリダイレクト
   */
  toAdmin() {
    const currentPath = window.location.pathname;
    const path = PathHelper.getSafeRedirectPath('admin');
    
    // ループ防止チェック
    if (!redirectHistory.recordRedirect(currentPath, path)) {
      console.error('🚨 リダイレクトループ防止: adminへのリダイレクトをブロック');
      // ループが検出された場合は、エラーメッセージを表示
      this.showRedirectLoopError();
      return;
    }
    
    console.log(`🔄 管理画面にリダイレクト: ${path}`);
    window.location.href = path;
  },
  
  /**
   * ホームページにリダイレクト
   */
  toHome() {
    const currentPath = window.location.pathname;
    const path = PathHelper.getSafeRedirectPath('home');
    
    // ループ防止チェック
    if (!redirectHistory.recordRedirect(currentPath, path)) {
      console.error('🚨 リダイレクトループ防止: homeへのリダイレクトをブロック');
      return;
    }
    
    console.log(`🔄 ホームページにリダイレクト: ${path}`);
    window.location.href = path;
  },
  
  /**
   * リダイレクトループエラーを表示
   * @private
   */
  showRedirectLoopError() {
    const errorHtml = `
      <div id="redirect-loop-error" style="
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        z-index: 10000;
        background: #fee2e2;
        border: 2px solid #dc2626;
        border-radius: 8px;
        padding: 1rem;
        font-family: sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        <h3 style="margin: 0 0 0.5rem 0; color: #dc2626;">
          🚨 認証エラー - リダイレクトループを検出
        </h3>
        <p style="margin: 0 0 1rem 0; line-height: 1.4;">
          認証システムでリダイレクトループが発生しました。<br>
          セッションデータをクリアして再試行してください。
        </p>
        <div style="display: flex; gap: 0.5rem;">
          <button onclick="clearSessionAndRetry()" style="
            background: #dc2626;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
          ">
            セッションクリア & 再試行
          </button>
          <button onclick="goToHome()" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
          ">
            ホームページに戻る
          </button>
        </div>
      </div>
    `;
    
    // エラーメッセージを挿入
    if (!document.getElementById('redirect-loop-error')) {
      document.body.insertAdjacentHTML('beforeend', errorHtml);
      
      // グローバル関数を追加
      window.clearSessionAndRetry = () => {
        // 認証関連のストレージをクリア
        localStorage.removeItem('rbs_admin_auth');
        localStorage.removeItem('rbs_auth_attempts');
        localStorage.removeItem('rbs_auth_last_attempt');
        sessionStorage.clear();
        
        // リダイレクト履歴をクリア
        redirectHistory.clear();
        
        // ログインページに移動
        window.location.href = PathHelper.getSafeRedirectPath('admin-login');
      };
      
      window.goToHome = () => {
        redirectHistory.clear();
        window.location.href = PathHelper.getSafeRedirectPath('home');
      };
      
      // 10秒後に自動で閉じる
      setTimeout(() => {
        const errorElement = document.getElementById('redirect-loop-error');
        if (errorElement) {
          errorElement.remove();
        }
      }, 10000);
    }
  }
};

/**
 * デバッグ情報
 */
export const debugPaths = () => {
  console.group('🛣️ Path Configuration Debug');
  console.log('Environment:', environment);
  console.log('Base Path:', PATHS.BASE);
  console.log('Admin Login Path:', PathHelper.getSafeRedirectPath('admin-login'));
  console.log('Admin Path:', PathHelper.getSafeRedirectPath('admin'));
  console.log('Current Location:', window.location);
  console.log('Redirect History:', redirectHistory.getDebugInfo());
  console.groupEnd();
};

// リダイレクト履歴をエクスポート（デバッグ用）
export { redirectHistory };

// 開発環境でのデバッグ用グローバル公開
if (environment.isDevelopment) {
  window.PATHS = PATHS;
  window.PathHelper = PathHelper;
  window.debugPaths = debugPaths;
}

export default {
  PATHS,
  PathHelper,
  redirect,
  environment,
  debugPaths
}; 