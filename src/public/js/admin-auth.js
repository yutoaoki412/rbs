/**
 * RBS陸上教室 管理画面認証システム
 * シンプルで安全な認証機能を提供
 */

class AdminAuth {
  constructor() {
    this.storageKeys = {
      auth: 'rbs_admin_auth',
      attempts: 'rbs_admin_attempts',
      lastAttempt: 'rbs_admin_last_attempt'
    };
    
    // セキュリティ設定
    this.maxAttempts = 5; // 最大試行回数
    this.lockoutDuration = 15 * 60 * 1000; // ロックアウト時間（15分）
    this.sessionDuration = 8 * 60 * 60 * 1000; // セッション持続時間（8時間）
    
    // パスワード（実際の運用では環境変数や外部設定から取得）
    this.adminPassword = 'rbs2024admin';
    
    console.log('AdminAuth initialized');
  }

  /**
   * 認証状態をチェック
   */
  isAuthenticated() {
    try {
      const authData = this.getAuthData();
      
      if (!authData || !authData.token || !authData.expires) {
        return false;
      }
      
      // セッション期限をチェック
      const now = Date.now();
      if (now > authData.expires) {
        console.log('セッションが期限切れです');
        this.logout();
        return false;
      }
      
      // セッションを延長（アクティブな場合）
      this.extendSession();
      
      return true;
    } catch (error) {
      console.error('認証状態チェックエラー:', error);
      return false;
    }
  }

  /**
   * ログイン処理
   */
  async login(password) {
    try {
      // ログイン試行制限をチェック
      const attemptCheck = this.checkLoginAttempts();
      if (!attemptCheck.allowed) {
        return {
          success: false,
          message: attemptCheck.message
        };
      }

      // パスワード検証
      if (!this.validatePassword(password)) {
        this.recordFailedAttempt();
        return {
          success: false,
          message: 'パスワードが正しくありません'
        };
      }

      // 認証成功
      this.createSession();
      this.clearFailedAttempts();
      
      console.log('ログイン成功');
      return {
        success: true,
        message: 'ログインしました'
      };
    } catch (error) {
      console.error('ログインエラー:', error);
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
      localStorage.removeItem(this.storageKeys.auth);
      console.log('ログアウトしました');
      return { success: true };
    } catch (error) {
      console.error('ログアウトエラー:', error);
      return { success: false };
    }
  }

  /**
   * パスワード検証
   */
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return false;
    }
    
    return password === this.adminPassword;
  }

  /**
   * セッション作成
   */
  createSession() {
    const now = Date.now();
    const authData = {
      token: 'authenticated',
      created: now,
      expires: now + this.sessionDuration,
      lastActivity: now
    };
    
    localStorage.setItem(this.storageKeys.auth, JSON.stringify(authData));
  }

  /**
   * セッション延長
   */
  extendSession() {
    const authData = this.getAuthData();
    if (authData) {
      authData.lastActivity = Date.now();
      authData.expires = Date.now() + this.sessionDuration;
      localStorage.setItem(this.storageKeys.auth, JSON.stringify(authData));
    }
  }

  /**
   * 認証データ取得
   */
  getAuthData() {
    try {
      const data = localStorage.getItem(this.storageKeys.auth);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('認証データ取得エラー:', error);
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
      if (lastAttempt && (now - lastAttempt > this.lockoutDuration)) {
        this.clearFailedAttempts();
        return { allowed: true };
      }
      
      // 試行回数制限をチェック
      if (attempts >= this.maxAttempts) {
        const remainingTime = Math.ceil((this.lockoutDuration - (now - lastAttempt)) / 60000);
        return {
          allowed: false,
          message: `ログイン試行回数が上限に達しました。${remainingTime}分後に再試行してください。`
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('ログイン試行制限チェックエラー:', error);
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
      
      console.log(`ログイン失敗 (${attempts}/${this.maxAttempts})`);
    } catch (error) {
      console.error('失敗試行記録エラー:', error);
    }
  }

  /**
   * 失敗した試行をクリア
   */
  clearFailedAttempts() {
    try {
      localStorage.removeItem(this.storageKeys.attempts);
      localStorage.removeItem(this.storageKeys.lastAttempt);
    } catch (error) {
      console.error('失敗試行クリアエラー:', error);
    }
  }

  /**
   * 失敗した試行回数を取得
   */
  getFailedAttempts() {
    try {
      const attempts = localStorage.getItem(this.storageKeys.attempts);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      console.error('失敗試行回数取得エラー:', error);
      return 0;
    }
  }

  /**
   * 最後の試行時間を取得
   */
  getLastAttemptTime() {
    try {
      const time = localStorage.getItem(this.storageKeys.lastAttempt);
      return time ? parseInt(time, 10) : null;
    } catch (error) {
      console.error('最後の試行時間取得エラー:', error);
      return null;
    }
  }

  /**
   * セッション情報を取得（デバッグ用）
   */
  getSessionInfo() {
    const authData = this.getAuthData();
    if (!authData) {
      return { authenticated: false };
    }
    
    const now = Date.now();
    const remainingTime = Math.max(0, authData.expires - now);
    
    return {
      authenticated: true,
      created: new Date(authData.created).toLocaleString('ja-JP'),
      expires: new Date(authData.expires).toLocaleString('ja-JP'),
      lastActivity: new Date(authData.lastActivity).toLocaleString('ja-JP'),
      remainingMinutes: Math.ceil(remainingTime / 60000)
    };
  }

  /**
   * セキュリティ情報を取得（デバッグ用）
   */
  getSecurityInfo() {
    const attempts = this.getFailedAttempts();
    const lastAttempt = this.getLastAttemptTime();
    
    return {
      failedAttempts: attempts,
      maxAttempts: this.maxAttempts,
      lastAttempt: lastAttempt ? new Date(lastAttempt).toLocaleString('ja-JP') : null,
      lockoutDuration: this.lockoutDuration / 60000 + '分'
    };
  }

  /**
   * デバッグ情報を出力
   */
  debugInfo() {
    console.group('AdminAuth Debug Info');
    console.log('Session Info:', this.getSessionInfo());
    console.log('Security Info:', this.getSecurityInfo());
    console.log('Is Authenticated:', this.isAuthenticated());
    console.groupEnd();
  }
}

// グローバルに公開
window.AdminAuth = AdminAuth; 