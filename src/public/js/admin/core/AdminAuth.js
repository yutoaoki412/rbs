/**
 * RBS陸上教室 管理画面認証システム (改善版)
 * EventEmitter を継承し、より堅牢な認証機能を提供
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';

export class AdminAuth extends EventEmitter {
  constructor() {
    super();
    
    this.logger = new Logger('AdminAuth');
    
    // ストレージキー
    this.storageKeys = {
      auth: 'rbs_admin_auth',
      attempts: 'rbs_admin_attempts',
      lastAttempt: 'rbs_admin_last_attempt'
    };
    
    // セキュリティ設定
    this.config = {
      maxAttempts: 5, // 最大試行回数
      lockoutDuration: 15 * 60 * 1000, // ロックアウト時間（15分）
      sessionDuration: 8 * 60 * 60 * 1000, // セッション持続時間（8時間）
      sessionExtensionThreshold: 30 * 60 * 1000, // セッション延長の閾値（30分）
      adminPassword: 'rbs2024admin' // パスワード（ハードコーディング）
    };

    // 状態管理
    this.isAuthenticatedCache = null;
    this.sessionCheckInterval = null;
    
    this.init();
  }

  /**
   * 認証システムの初期化
   */
  init() {
    this.logger.info('認証システムを初期化中...');
    
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
    
    this.logger.info('認証システムの初期化完了');
  }

  /**
   * 認証状態をチェック
   */
  isAuthenticated() {
    try {
      // キャッシュがある場合はそれを使用（パフォーマンス向上）
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
        this.logger.info('セッションが期限切れです');
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
      this.logger.error('認証状態チェックエラー:', error);
      this.isAuthenticatedCache = false;
      return false;
    }
  }

  /**
   * ログイン処理
   */
  async login(password) {
    try {
      this.logger.info('ログイン試行開始');
      
      // 入力検証
      if (!this.validateInput(password)) {
        return {
          success: false,
          message: 'パスワードを入力してください'
        };
      }

      // ログイン試行制限をチェック
      const attemptCheck = this.checkLoginAttempts();
      if (!attemptCheck.allowed) {
        this.logger.warn('ログイン試行制限によりブロック', { remainingTime: attemptCheck.remainingTime });
        return {
          success: false,
          message: attemptCheck.message
        };
      }

      // パスワード検証
      if (!this.validatePassword(password)) {
        this.recordFailedAttempt();
        this.logger.warn('パスワード不正', { attempts: this.getFailedAttempts() });
        return {
          success: false,
          message: 'パスワードが正しくありません'
        };
      }

      // 認証成功
      this.createSession();
      this.clearFailedAttempts();
      this.isAuthenticatedCache = true;
      
      this.logger.info('ログイン成功');
      this.emit('login', { timestamp: Date.now() });
      this.emit('authChanged', true);
      
      return {
        success: true,
        message: 'ログインしました'
      };
    } catch (error) {
      this.logger.error('ログインエラー:', error);
      return {
        success: false,
        message: 'ログインに失敗しました'
      };
    }
  }

  /**
   * ログアウト処理
   */
  logout() {
    try {
      const wasAuthenticated = this.isAuthenticatedCache;
      
      localStorage.removeItem(this.storageKeys.auth);
      this.isAuthenticatedCache = false;
      
      if (wasAuthenticated) {
        this.logger.info('ログアウトしました');
        this.emit('logout', { timestamp: Date.now() });
        this.emit('authChanged', false);
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error('ログアウトエラー:', error);
      return { success: false };
    }
  }

  /**
   * 入力検証
   */
  validateInput(password) {
    return password && typeof password === 'string' && password.trim().length > 0;
  }

  /**
   * パスワード検証
   */
  validatePassword(password) {
    if (!this.validateInput(password)) {
      return false;
    }
    
    return password === this.config.adminPassword;
  }

  /**
   * セッション作成
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
    this.logger.debug('セッション作成完了', { expires: new Date(authData.expires) });
  }

  /**
   * セッション延長
   */
  extendSession() {
    const authData = this.getAuthData();
    if (authData) {
      authData.lastActivity = Date.now();
      authData.expires = Date.now() + this.config.sessionDuration;
      localStorage.setItem(this.storageKeys.auth, JSON.stringify(authData));
      this.logger.debug('セッション延長完了', { newExpires: new Date(authData.expires) });
    }
  }

  /**
   * セッション有効性チェック
   */
  checkSessionValidity() {
    const previousState = this.isAuthenticatedCache;
    this.isAuthenticatedCache = null; // キャッシュをクリア
    const currentState = this.isAuthenticated();
    
    // 認証状態が変更された場合はイベント発火
    if (previousState !== currentState) {
      this.emit('authChanged', currentState);
    }
  }

  /**
   * セッショントークン生成
   */
  generateSessionToken() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const userAgent = navigator.userAgent;
    
    // 簡易的なトークン生成（本格的な実装では暗号化を使用）
    return btoa(`${timestamp}_${random}_${userAgent.slice(0, 20)}`);
  }

  /**
   * 認証データ取得
   */
  getAuthData() {
    try {
      const data = localStorage.getItem(this.storageKeys.auth);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('認証データ取得エラー:', error);
      return null;
    }
  }

  /**
   * ログイン試行制限チェック
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
      this.logger.error('ログイン試行制限チェックエラー:', error);
      return { allowed: true }; // エラー時は許可
    }
  }

  /**
   * 失敗した試行を記録
   */
  recordFailedAttempt() {
    try {
      const attempts = this.getFailedAttempts() + 1;
      const now = Date.now();
      
      localStorage.setItem(this.storageKeys.attempts, attempts.toString());
      localStorage.setItem(this.storageKeys.lastAttempt, now.toString());
      
      this.emit('failedAttempt', { attempts, timestamp: now });
      this.logger.debug('失敗試行を記録', { attempts });
    } catch (error) {
      this.logger.error('失敗試行記録エラー:', error);
    }
  }

  /**
   * 失敗試行のクリア
   */
  clearFailedAttempts() {
    try {
      localStorage.removeItem(this.storageKeys.attempts);
      localStorage.removeItem(this.storageKeys.lastAttempt);
      this.logger.debug('失敗試行をクリア');
    } catch (error) {
      this.logger.error('失敗試行クリアエラー:', error);
    }
  }

  /**
   * 失敗試行回数を取得
   */
  getFailedAttempts() {
    try {
      const attempts = localStorage.getItem(this.storageKeys.attempts);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      this.logger.error('失敗試行回数取得エラー:', error);
      return 0;
    }
  }

  /**
   * 最後の試行時刻を取得
   */
  getLastAttemptTime() {
    try {
      const time = localStorage.getItem(this.storageKeys.lastAttempt);
      return time ? parseInt(time, 10) : null;
    } catch (error) {
      this.logger.error('最後の試行時刻取得エラー:', error);
      return null;
    }
  }

  /**
   * セッション情報取得
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
    
    this.removeAllListeners();
    this.logger.info('認証システムを破棄しました');
  }
} 