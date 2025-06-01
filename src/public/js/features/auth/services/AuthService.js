/**
 * 認証サービス
 * RBS陸上教室の管理画面認証システム
 * @version 3.0.0
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class AuthService {
  constructor() {
    this.initialized = false;
    this.isAuthenticatedCache = null;
    this.config = null;
    this.sessionCheckInterval = null;
    this.sessionMonitorInterval = null;
    this.sessionInfoUpdateInterval = null;
    this.storageKeys = {
      auth: 'rbs_admin_auth',
      attempts: 'rbs_login_attempts',
      lastAttempt: 'rbs_last_attempt'
    };

    // セッション情報更新コールバック
    this.sessionInfoCallbacks = new Set();
    
    // ログアウトコールバック
    this.logoutCallbacks = new Set();
  }

  /**
   * サービス初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      this.log('既に初期化済み');
      return;
    }

    this.log('認証サービス初期化開始');
    
    try {
      // 設定の読み込み
      this.config = await this.loadConfig();
      
      // 現在の認証状態をチェック
      this.isAuthenticatedCache = this.isAuthenticated();
      
      // 管理画面でのセッション監視を開始
      if (this.isAuthenticatedCache) {
        this.startSessionMonitoring();
        this.startSessionInfoUpdates();
      }
      
      this.initialized = true;
      this.log(`認証サービス初期化完了 (セッション時間: ${this.config.sessionDuration / (60 * 60 * 1000)}時間)`);
      
    } catch (error) {
      this.error('認証サービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 認証状態をチェック
   * @returns {boolean}
   */
  isAuthenticated() {
    try {
      // キャッシュがある場合はそれを使用
      if (this.isAuthenticatedCache !== null) {
        return this.isAuthenticatedCache;
      }

      const authData = this.getAuthData();
      
      if (!authData || !authData.token || !authData.expires) {
        this.isAuthenticatedCache = false;
        return false;
      }
      
      // セッション期限をチェック
      const now = Date.now();
      if (now > authData.expires) {
        console.log('🔐 セッションが期限切れです');
        this.logout();
        this.isAuthenticatedCache = false;
        return false;
      }
      
      // セッションを延長（最後の活動から一定時間経過している場合）
      if (now - authData.lastActivity > this.config.sessionExtensionThreshold) {
        this.extendSession();
      }
      
      this.isAuthenticatedCache = true;
      return true;
    } catch (error) {
      console.error('❌ 認証状態チェックエラー:', error);
      this.isAuthenticatedCache = false;
      return false;
    }
  }

  /**
   * ログイン処理
   * @param {string} password - パスワード
   * @returns {Promise<{success: boolean, message: string, token?: string}>}
   */
  async login(password) {
    try {
      this.log('ログイン処理開始');
      
      // バリデーション
      if (!password) {
        return {
          success: false,
          message: 'パスワードを入力してください'
        };
      }

      // 開発環境での認証スキップ機能
      if (this.isDevelopment() && password === 'dev') {
        const devToken = this.generateDevToken();
        this.saveAuthSession(devToken, true);
        
        this.log('開発環境認証スキップ');
        return {
          success: true,
          message: '開発環境でログインしました',
          token: devToken
        };
      }

      // 通常認証処理
      if (password === this.config.adminPassword) {
        const token = this.generateToken();
        this.saveAuthSession(token, false);
        
        this.log('認証成功');
        return {
          success: true,
          message: 'ログインしました',
          token: token
        };
      } else {
        this.log('認証失敗: パスワード不一致');
        return {
          success: false,
          message: 'パスワードが正しくありません'
        };
      }
    } catch (error) {
      this.error('ログイン処理エラー:', error);
      return {
        success: false,
        message: 'ログイン処理中にエラーが発生しました'
      };
    }
  }

  /**
   * 管理画面の認証チェック（ページアクセス時）
   * @returns {boolean} 認証状態
   */
  checkAdminPageAuth() {
    try {
      this.log('管理画面の認証チェック開始');
      
      const authData = localStorage.getItem(this.storageKeys.auth);
      if (!authData) {
        this.log('認証データがありません。ログインページにリダイレクト');
        this.redirectToLogin();
        return false;
      }
      
      const parsed = JSON.parse(authData);
      const now = Date.now();
      
      // セッションが有効か確認
      if (!parsed.expires || now >= parsed.expires) {
        this.log('セッションが期限切れです。ログインページにリダイレクト');
        this.logout();
        return false;
      }
      
      this.log('認証チェック成功');
      return true;
    } catch (error) {
      this.error('認証チェックエラー:', error);
      this.logout();
      return false;
    }
  }

  /**
   * ログアウト処理
   */
  logout() {
    try {
      this.log('ログアウト処理開始');
      
      // セッション監視を停止
      this.stopSessionMonitoring();
      this.stopSessionInfoUpdates();
      
      // 認証データを削除
      localStorage.removeItem(this.storageKeys.auth);
      this.isAuthenticatedCache = false;
      
      // ログアウトコールバックを実行
      this.#notifyLogout();
      
      // ログイン画面にリダイレクト
      this.redirectToLogin();
      
      this.log('ログアウト完了');
      
      return { success: true, message: 'ログアウトしました' };
    } catch (error) {
      this.error('ログアウトエラー:', error);
      // エラーが発生してもログイン画面にリダイレクト
      this.redirectToLogin();
      return { success: false, message: 'ログアウト処理中にエラーが発生しました' };
    }
  }

  /**
   * ログインページにリダイレクト
   * @private
   */
  redirectToLogin() {
    window.location.href = 'admin-login.html';
  }

  /**
   * ログアウトイベントのセットアップ
   */
  setupLogoutHandlers() {
    // 認証関連の処理はAuthServiceで一元管理
    // data-action="logout"の処理
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action="logout"]');
      if (target) {
        e.preventDefault();
        this.logout();
      }
    });
    
    // Ctrl+Shift+L でもログアウト可能
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.logout();
      }
    });
    
    this.log('ログアウトハンドラーを設定しました');
  }

  /**
   * セッション作成
   * @private
   */
  createSession() {
    const now = Date.now();
    const authData = {
      token: this.generateSessionToken(),
      created: now,
      expires: now + this.config.sessionDuration,
      lastActivity: now,
      version: '2.0'
    };
    
    localStorage.setItem(this.storageKeys.auth, JSON.stringify(authData));
    console.log('🔐 セッション作成完了', { expires: new Date(authData.expires) });
  }

  /**
   * セッション延長
   * @private
   */
  extendSession() {
    const authData = this.getAuthData();
    if (authData) {
      authData.lastActivity = Date.now();
      authData.expires = Date.now() + this.config.sessionDuration;
      localStorage.setItem(this.storageKeys.auth, JSON.stringify(authData));
      console.log('🔐 セッション延長完了', { newExpires: new Date(authData.expires) });
    }
  }

  /**
   * セッション有効性チェック
   * @private
   */
  checkSessionValidity() {
    const previousState = this.isAuthenticatedCache;
    this.isAuthenticatedCache = null; // キャッシュをクリア
    const currentState = this.isAuthenticated();
    
    // 認証状態が変更された場合
    if (previousState !== currentState) {
      this.log(`認証状態変更: ${previousState} -> ${currentState}`);
      
      if (!currentState) {
        // セッションが無効になった場合はログアウト処理
        this.#notifyLogout();
      } else {
        // セッション情報を更新
        this.#notifySessionInfoUpdate();
      }
    }
  }

  /**
   * セッショントークン生成
   * @private
   * @returns {string}
   */
  generateSessionToken() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const userAgent = navigator.userAgent;
    
    // 簡易的なトークン生成
    return btoa(`${timestamp}_${random}_${userAgent.slice(0, 20)}`);
  }

  /**
   * 認証データ取得
   * @private
   * @returns {Object|null}
   */
  getAuthData() {
    try {
      const data = localStorage.getItem(this.storageKeys.auth);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ 認証データ取得エラー:', error);
      return null;
    }
  }

  /**
   * ログイン試行制限チェック
   * @private
   * @returns {{allowed: boolean, remainingTime?: number, message?: string}}
   */
  checkLoginAttempts() {
    try {
      const attempts = this.getFailedAttempts();
      const lastAttempt = this.getLastAttemptTime();
      const now = Date.now();
      
      // ロックアウト時間が経過している場合はリセット
      if (lastAttempt && (now - lastAttempt > this.config.lockoutDuration)) {
        this.clearFailedAttempts();
        return { allowed: true };
      }
      
      // 試行回数制限をチェック
      if (attempts >= this.config.maxAttempts) {
        const remainingTime = Math.ceil((this.config.lockoutDuration - (now - lastAttempt)) / 60000);
        return {
          allowed: false,
          remainingTime,
          message: `ログイン試行回数が上限に達しました。${remainingTime}分後に再試行してください。`
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('❌ ログイン試行制限チェックエラー:', error);
      return { allowed: true }; // エラー時は許可
    }
  }

  /**
   * 失敗した試行を記録
   * @private
   */
  recordFailedAttempt() {
    try {
      const attempts = this.getFailedAttempts() + 1;
      const now = Date.now();
      
      localStorage.setItem(this.storageKeys.attempts, attempts.toString());
      localStorage.setItem(this.storageKeys.lastAttempt, now.toString());
      
      EventBus.emit('auth:failedAttempt', { attempts, timestamp: now });
      console.log('📝 失敗試行を記録', { attempts });
    } catch (error) {
      console.error('❌ 失敗試行記録エラー:', error);
    }
  }

  /**
   * 失敗試行のクリア
   * @private
   */
  clearFailedAttempts() {
    try {
      localStorage.removeItem(this.storageKeys.attempts);
      localStorage.removeItem(this.storageKeys.lastAttempt);
      console.log('🧹 失敗試行をクリア');
    } catch (error) {
      console.error('❌ 失敗試行クリアエラー:', error);
    }
  }

  /**
   * 失敗試行回数を取得
   * @private
   * @returns {number}
   */
  getFailedAttempts() {
    try {
      const attempts = localStorage.getItem(this.storageKeys.attempts);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      console.error('❌ 失敗試行回数取得エラー:', error);
      return 0;
    }
  }

  /**
   * 最後の試行時刻を取得
   * @private
   * @returns {number|null}
   */
  getLastAttemptTime() {
    try {
      const time = localStorage.getItem(this.storageKeys.lastAttempt);
      return time ? parseInt(time, 10) : null;
    } catch (error) {
      console.error('❌ 最後の試行時刻取得エラー:', error);
      return null;
    }
  }

  /**
   * セッション情報取得
   * @returns {Object|null}
   */
  getSessionInfo() {
    const authData = this.getAuthData();
    if (!authData) return null;

    const now = Date.now();
    const remainingTime = authData.expires - now;
    const timeUntilExpiry = Math.max(0, Math.floor(remainingTime / 60000)); // 分単位

    return {
      isAuthenticated: this.isAuthenticated(),
      created: new Date(authData.created),
      expires: new Date(authData.expires),
      lastActivity: new Date(authData.lastActivity),
      remainingMinutes: timeUntilExpiry,
      version: authData.version || '1.0'
    };
  }

  /**
   * セキュリティ情報取得
   * @returns {Object}
   */
  getSecurityInfo() {
    const attempts = this.getFailedAttempts();
    const lastAttempt = this.getLastAttemptTime();
    
    return {
      failedAttempts: attempts,
      maxAttempts: this.config.maxAttempts,
      lastAttempt: lastAttempt ? new Date(lastAttempt) : null,
      isLocked: attempts >= this.config.maxAttempts,
      lockoutDuration: this.config.lockoutDuration / 60000 // 分単位
    };
  }

  /**
   * セッション情報更新コールバックを登録
   * @param {Function} callback - セッション情報更新時に呼び出される関数
   */
  onSessionInfoUpdate(callback) {
    this.sessionInfoCallbacks.add(callback);
  }

  /**
   * セッション情報更新コールバックを削除
   * @param {Function} callback - 削除するコールバック関数
   */
  offSessionInfoUpdate(callback) {
    this.sessionInfoCallbacks.delete(callback);
  }

  /**
   * ログアウトコールバックを登録
   * @param {Function} callback - ログアウト時に呼び出される関数
   */
  onLogout(callback) {
    this.logoutCallbacks.add(callback);
  }

  /**
   * ログアウトコールバックを削除
   * @param {Function} callback - 削除するコールバック関数
   */
  offLogout(callback) {
    this.logoutCallbacks.delete(callback);
  }

  /**
   * セッション情報更新コールバックを実行
   * @private
   */
  #notifySessionInfoUpdate() {
    const sessionInfo = this.getSessionInfo();
    this.sessionInfoCallbacks.forEach(callback => {
      try {
        callback(sessionInfo);
      } catch (error) {
        this.error('セッション情報更新コールバックエラー:', error);
      }
    });
  }

  /**
   * ログアウトコールバックを実行
   * @private
   */
  #notifyLogout() {
    this.logoutCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        this.error('ログアウトコールバックエラー:', error);
      }
    });
  }

  /**
   * セッション情報更新を開始
   * @private
   */
  startSessionInfoUpdates() {
    // 既存の更新を停止
    this.stopSessionInfoUpdates();
    
    // 即座に一度更新
    this.#notifySessionInfoUpdate();
    
    // 定期的にセッション情報を更新（1分間隔）
    this.sessionInfoUpdateInterval = setInterval(() => {
      this.#notifySessionInfoUpdate();
    }, 60000);
    
    this.log('セッション情報更新開始 (1分間隔)');
  }

  /**
   * セッション情報更新を停止
   * @private
   */
  stopSessionInfoUpdates() {
    if (this.sessionInfoUpdateInterval) {
      clearInterval(this.sessionInfoUpdateInterval);
      this.sessionInfoUpdateInterval = null;
      this.log('セッション情報更新停止');
    }
  }

  /**
   * セッションアクティビティを更新
   * @private
   */
  updateSessionActivity() {
    const authData = this.getAuthData();
    if (authData) {
      authData.lastActivity = Date.now();
      localStorage.setItem(this.storageKeys.auth, JSON.stringify(authData));
    }
  }

  /**
   * セッション残り時間を取得
   * @returns {number} 残り時間（ミリ秒）
   */
  getSessionRemainingTime() {
    const authData = this.getAuthData();
    if (!authData || !authData.expires) {
      return 0;
    }
    
    const remaining = authData.expires - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * セッション残り時間を人間が読める形式で取得
   * @returns {string}
   */
  getSessionRemainingTimeFormatted() {
    const remaining = this.getSessionRemainingTime();
    
    if (remaining <= 0) {
      return '期限切れ';
    }
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  }

  // === ログメソッド ===

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log('🔐 AuthService:', ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug?.enabled) {
      console.debug('🔍 AuthService:', ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn('⚠️ AuthService:', ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error('❌ AuthService:', ...args);
  }

  /**
   * 設定読み込み
   * @private
   * @returns {Promise<Object>}
   */
  async loadConfig() {
    try {
      // 設定ファイルから読み込み（将来的に外部設定対応）
      return {
        adminPassword: CONFIG.security?.admin?.password || 'rbs2024admin',
        sessionDuration: CONFIG.security?.admin?.sessionDuration || 24 * 60 * 60 * 1000, // 24時間
        maxLoginAttempts: CONFIG.security?.maxLoginAttempts || 5,
        lockoutDuration: CONFIG.security?.admin?.lockoutDuration || 15 * 60 * 1000, // 15分
        sessionExtensionThreshold: CONFIG.security?.admin?.sessionExtensionThreshold || 2 * 60 * 60 * 1000,
        sessionCheckInterval: CONFIG.security?.admin?.sessionCheckInterval || 5 * 60 * 1000
      };
    } catch (error) {
      this.warn('設定ファイル読み込み失敗、デフォルト設定を使用:', error);
      return {
        adminPassword: 'rbs2024admin',
        sessionDuration: 24 * 60 * 60 * 1000,
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000,
        sessionExtensionThreshold: 2 * 60 * 60 * 1000,
        sessionCheckInterval: 5 * 60 * 1000
      };
    }
  }

  /**
   * 開発環境かどうかの判定
   * @private
   * @returns {boolean}
   */
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('debug=true');
  }

  /**
   * 開発用トークンの生成
   * @private
   * @returns {string}
   */
  generateDevToken() {
    return 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 通常トークンの生成
   * @private
   * @returns {string}
   */
  generateToken() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 認証セッションを保存
   * @param {string} token - トークン
   * @param {boolean} isDev - 開発モードフラグ
   */
  saveAuthSession(token, isDev = false) {
    const sessionData = {
      token: token,
      expires: Date.now() + this.config.sessionDuration,
      isDev: isDev,
      created: Date.now()
    };
    
    localStorage.setItem(this.storageKeys.auth, JSON.stringify(sessionData));
    this.isAuthenticatedCache = true;
    
    this.log(`認証セッションを保存: ${isDev ? '開発モード' : '通常モード'}`);
  }

  /**
   * セッション監視を開始
   * @private
   */
  startSessionMonitoring() {
    // 既存の監視を停止
    this.stopSessionMonitoring();
    
    // 定期的にセッションをチェック
    this.sessionMonitorInterval = setInterval(() => {
      this.checkSessionValidity();
      this.updateSessionActivity();
    }, this.config.sessionCheckInterval);
    
    this.log(`セッション監視開始 (${this.config.sessionCheckInterval / 60000}分間隔)`);
  }

  /**
   * セッション監視を停止
   * @private
   */
  stopSessionMonitoring() {
    if (this.sessionMonitorInterval) {
      clearInterval(this.sessionMonitorInterval);
      this.sessionMonitorInterval = null;
      this.log('セッション監視停止');
    }
  }

  /**
   * 破棄処理
   */
  destroy() {
    // 全ての監視を停止
    this.stopSessionMonitoring();
    this.stopSessionInfoUpdates();
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    // コールバックをクリア
    this.sessionInfoCallbacks.clear();
    this.logoutCallbacks.clear();
    
    // キャッシュをクリア
    this.isAuthenticatedCache = null;
    
    this.initialized = false;
    console.log('🗑️ AuthService: 破棄完了');
  }
}

// シングルトンインスタンス
export const authService = new AuthService(); 