/**
 * 管理者認証システム
 * シンプルなパスワード認証とセッション管理
 */
class AdminAuth {
  constructor() {
    this.sessionKey = 'rbs_admin_session';
    this.sessionDuration = 24 * 60 * 60 * 1000; // 24時間
    // 環境変数またはデフォルトパスワード
    this.adminPassword = this.getAdminPassword();
  }

  /**
   * 管理者パスワードを取得
   */
  getAdminPassword() {
    // Cloudflare環境変数から取得を試行
    if (typeof ADMIN_PASSWORD !== 'undefined') {
      return ADMIN_PASSWORD;
    }
    
    // ローカル環境での設定確認
    if (typeof process !== 'undefined' && process.env && process.env.ADMIN_PASSWORD) {
      return process.env.ADMIN_PASSWORD;
    }
    
    // デフォルトパスワード
    return 'rbs2025admin';
  }

  /**
   * ログイン処理
   */
  async login(password) {
    try {
      if (password === this.adminPassword) {
        const session = {
          loginTime: Date.now(),
          expires: Date.now() + this.sessionDuration
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
        return { success: true, message: 'ログインしました' };
      } else {
        return { success: false, message: 'パスワードが正しくありません' };
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      return { success: false, message: 'ログインに失敗しました' };
    }
  }

  /**
   * ログアウト処理
   */
  logout() {
    localStorage.removeItem(this.sessionKey);
    // 現在のページがadminフォルダ内かどうかを判定
    if (window.location.pathname.includes('/admin/')) {
      window.location.href = 'login.html';
    } else {
      window.location.href = 'admin/login.html';
    }
  }

  /**
   * 認証状態をチェック
   */
  isAuthenticated() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) {
        return false;
      }

      const session = JSON.parse(sessionData);
      const now = Date.now();

      // セッションの有効期限をチェック
      if (now > session.expires) {
        this.logout();
        return false;
      }

      // セッションを延長
      session.expires = now + this.sessionDuration;
      localStorage.setItem(this.sessionKey, JSON.stringify(session));

      return true;
    } catch (error) {
      console.error('認証チェックエラー:', error);
      return false;
    }
  }

  /**
   * 認証が必要なページでの初期化
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      // 現在のページがadminフォルダ内かどうかを判定
      if (window.location.pathname.includes('/admin/')) {
        window.location.href = 'login.html';
      } else {
        window.location.href = 'admin/login.html';
      }
      return false;
    }
    return true;
  }

  /**
   * セッション情報を取得
   */
  getSessionInfo() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);
      return {
        loginTime: new Date(session.loginTime),
        expires: new Date(session.expires),
        remainingTime: session.expires - Date.now()
      };
    } catch (error) {
      console.error('セッション情報取得エラー:', error);
      return null;
    }
  }

  /**
   * パスワード変更
   */
  changePassword(currentPassword, newPassword) {
    try {
      if (currentPassword !== this.adminPassword) {
        return { success: false, message: '現在のパスワードが正しくありません' };
      }

      if (newPassword.length < 8) {
        return { success: false, message: 'パスワードは8文字以上で設定してください' };
      }

      // 実際の運用では、より安全な方法でパスワードを保存してください
      this.adminPassword = newPassword;
      
      // セッションをリセット
      this.logout();
      
      return { success: true, message: 'パスワードを変更しました。再度ログインしてください。' };
    } catch (error) {
      console.error('パスワード変更エラー:', error);
      return { success: false, message: 'パスワード変更に失敗しました' };
    }
  }

  /**
   * セッション延長
   */
  extendSession() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) {
        return false;
      }

      const session = JSON.parse(sessionData);
      session.expires = Date.now() + this.sessionDuration;
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
      
      return true;
    } catch (error) {
      console.error('セッション延長エラー:', error);
      return false;
    }
  }

  /**
   * 自動ログアウトタイマーを設定
   */
  setupAutoLogout() {
    // 5分ごとにセッションをチェック
    setInterval(() => {
      if (!this.isAuthenticated()) {
        this.logout();
      }
    }, 5 * 60 * 1000);

    // ページの非アクティブ時間を監視
    let lastActivity = Date.now();
    const inactivityLimit = 30 * 60 * 1000; // 30分

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    // ユーザーアクティビティを監視
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // 非アクティブ時間をチェック
    setInterval(() => {
      if (Date.now() - lastActivity > inactivityLimit) {
        alert('長時間操作がありませんでした。セキュリティのため自動ログアウトします。');
        this.logout();
      }
    }, 60 * 1000); // 1分ごとにチェック
  }

  /**
   * ログイン試行回数制限
   */
  checkLoginAttempts() {
    const attemptsKey = 'rbs_login_attempts';
    const attempts = JSON.parse(localStorage.getItem(attemptsKey) || '[]');
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // 1時間以内の試行回数をカウント
    const recentAttempts = attempts.filter(time => now - time < oneHour);

    if (recentAttempts.length >= 5) {
      return {
        allowed: false,
        message: 'ログイン試行回数が上限に達しました。1時間後に再試行してください。'
      };
    }

    return { allowed: true };
  }

  /**
   * ログイン試行を記録
   */
  recordLoginAttempt() {
    const attemptsKey = 'rbs_login_attempts';
    const attempts = JSON.parse(localStorage.getItem(attemptsKey) || '[]');
    attempts.push(Date.now());
    
    // 古い記録を削除（24時間以上前）
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const filteredAttempts = attempts.filter(time => time > oneDayAgo);
    
    localStorage.setItem(attemptsKey, JSON.stringify(filteredAttempts));
  }

  /**
   * セキュリティログを記録
   */
  logSecurityEvent(event, details = {}) {
    const logKey = 'rbs_security_log';
    const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event,
      details: details,
      userAgent: navigator.userAgent,
      ip: 'unknown' // 実際の運用では適切に取得
    };
    
    logs.push(logEntry);
    
    // ログは最新100件まで保持
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem(logKey, JSON.stringify(logs));
  }

  /**
   * セキュリティログを取得
   */
  getSecurityLogs() {
    return JSON.parse(localStorage.getItem('rbs_security_log') || '[]');
  }
} 