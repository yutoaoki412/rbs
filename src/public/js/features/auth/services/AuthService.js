/**
 * 認証サービス
 * RBS陸上教室の管理画面認証システム
 * @version 2.0.0
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import config from '../../../shared/constants/config.js';

export class AuthService {
  constructor() {
    // ストレージキー
    this.storageKeys = {
      auth: 'rbs_admin_auth',
      attempts: 'rbs_admin_attempts',
      lastAttempt: 'rbs_admin_last_attempt'
    };
    
    // セキュリティ設定
    this.config = {
      maxAttempts: config.security?.maxLoginAttempts || 3,
      lockoutDuration: config.security?.admin?.lockoutDuration || 15 * 60 * 1000,
      sessionDuration: config.security?.admin?.sessionDuration || 60 * 60 * 1000,
      sessionExtensionThreshold: 30 * 60 * 1000,
      adminPassword: config.security?.admin?.password || 'admin123'
    };

    // 状態管理
    this.isAuthenticatedCache = null;
    this.sessionCheckInterval = null;
    this.initialized = false;
  }

  /**
   * 認証システムの初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ AuthService: 既に初期化済み');
      return;
    }

    console.log('🔐 AuthService: 初期化開始');
    
    // 定期的なセッションチェック（5分毎）
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionValidity();
    }, 5 * 60 * 1000);
    
    // ページ可視性の変更時にセッションをチェック
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkSessionValidity();
      }
    });
    
    this.initialized = true;
    console.log('✅ AuthService: 初期化完了');
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
      
      // 認証データを削除
      localStorage.removeItem(this.storageKeys.auth);
      
      // ログイン画面にリダイレクト
      this.redirectToLogin();
      
      this.log('ログアウト完了');
    } catch (error) {
      this.error('ログアウトエラー:', error);
      // エラーが発生してもログイン画面にリダイレクト
      this.redirectToLogin();
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
    // ログアウトボタンの処理
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
    
    // 認証状態が変更された場合はイベント発火
    if (previousState !== currentState) {
      EventBus.emit('auth:changed', currentState);
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
   * 破棄処理
   */
  destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    this.initialized = false;
    console.log('🗑️ AuthService: 破棄完了');
  }
}

// シングルトンインスタンス
export const authService = new AuthService(); 