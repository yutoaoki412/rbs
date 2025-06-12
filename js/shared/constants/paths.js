/**
 * アプリケーション全体のパス設定
 * リダイレクトやリンクのパス不一致を防ぐための統一設定
 * @version 1.1.0 - リダイレクトループ防止機能追加
 */

import { CONFIG } from './config.js';

/**
 * リダイレクト履歴管理（ループ防止用）
 */
const redirectHistory = {
  history: [],
  maxHistory: 10,
  loopThreshold: 2, // より厳格に（2回で検出）
  
  /**
   * リダイレクトを記録
   * @param {string} from - リダイレクト元
   * @param {string} to - リダイレクト先
   * @returns {boolean} リダイレクト実行可能かどうか
   */
  recordRedirect(from, to) {
    const now = Date.now();
    const entry = { from, to, timestamp: now };
    
    console.log('🔄 リダイレクト記録:', { from, to, timestamp: new Date(now) });
    
    // 履歴に追加
    this.history.push(entry);
    
    // 履歴サイズ制限
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // より厳格なループチェック（過去3秒以内）
    const recentRedirects = this.history.filter(h => 
      now - h.timestamp < 3000 && 
      ((h.from === from && h.to === to) || (h.from === to && h.to === from))
    );
    
    // 同じパターンのリダイレクトを検出
    const samePatternCount = recentRedirects.length;
    
    if (samePatternCount >= this.loopThreshold) {
      console.error('🚨 リダイレクトループを検出:', { 
        from, 
        to, 
        count: samePatternCount,
        recentHistory: recentRedirects 
      });
      
      // 緊急回避: 全履歴をクリアしてホームページへ
      this.clear();
      this.showEmergencyRedirect();
      return false;
    }
    
    return true;
  },
  
  /**
   * 履歴をクリア
   */
  clear() {
    this.history = [];
    console.log('🧹 リダイレクト履歴をクリア');
  },
  
  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    return {
      history: this.history,
      isLoopDetected: this.history.length >= this.loopThreshold,
      lastRedirect: this.history.length > 0 ? this.history[this.history.length - 1] : null
    };
  },
  
  /**
   * 緊急リダイレクト表示
   */
  showEmergencyRedirect() {
    console.log('🚨 緊急回避: 認証ループを検出したため安全な場所にリダイレクトします');
    
    // 3秒後にホームページに移動
    setTimeout(() => {
      console.log('🏠 ホームページに移動します');
      window.location.href = window.location.origin + '/index.html';
    }, 3000);
    
    // 警告メッセージ表示
    const warningHtml = `
      <div id="emergency-redirect" style="
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #fee2e2; border: 2px solid #fecaca; border-radius: 8px;
        padding: 2rem; max-width: 500px; width: 90%; z-index: 10000;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); text-align: center;
        font-family: sans-serif;
      ">
        <h3 style="margin: 0 0 1rem 0; color: #dc2626; font-size: 1.25rem;">
          🚨 認証ループ検出
        </h3>
        <p style="margin: 0 0 1.5rem 0; color: #991b1b;">
          認証システムでリダイレクトループが発生しました。<br>
          3秒後にホームページに移動します。
        </p>
        <div style="color: #7c2d12; font-size: 0.875rem;">
          問題が継続する場合は、ブラウザのキャッシュをクリアしてください。
        </div>
      </div>
    `;
    
    if (!document.getElementById('emergency-redirect')) {
      document.body.insertAdjacentHTML('beforeend', warningHtml);
    }
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
  
  // ファイル構造の判定（現在は全てルートディレクトリ構造）
  const isSourceStructure = false;
  
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
    // ルートディレクトリ構造
    return '';
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
    ADMIN_LOGIN: `${getBasePath()}/admin-login.html`,
    ADMIN: `${getBasePath()}/admin.html`,
    
    // 一般ページ
    HOME: `${getBasePath()}/index.html`,
    NEWS: `${getBasePath()}/news.html`,
    NEWS_DETAIL: `${getBasePath()}/news-detail.html`,
    
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
      // 全てルートディレクトリに配置
      return PATHS.PAGES.RELATIVE.ADMIN_LOGIN;
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
      // 全てルートディレクトリに配置
      return PATHS.PAGES.RELATIVE.ADMIN;
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
      // 全てルートディレクトリに配置
      return PATHS.PAGES.RELATIVE.HOME;
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
        return 'admin-login.html';
        
      case 'admin':
        return 'admin.html';
        
      case 'home':
        return 'index.html';
        
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
      <div id="redirect-loop-error" class="redirect-loop-error">
        <h3>🚨 リダイレクトループ検出</h3>
        <p>
          認証システムでリダイレクトループが発生しました。<br>
          セッションデータに問題があるか、ページ設定に不具合がある可能性があります。
        </p>
        <div class="error-actions">
          <button onclick="clearSessionAndRetry()" class="btn-error-primary">
            🗑️ セッションクリア & 再試行
          </button>
          <button onclick="goToHome()" class="btn-error-secondary">
            🏠 トップページへ
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
                  localStorage.removeItem(CONFIG.storage.keys.adminSession);
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