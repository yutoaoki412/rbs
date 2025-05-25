/**
 * 管理者ログイン画面の機能
 */
class AdminLogin {
  constructor() {
    this.auth = new AdminAuth();
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    // 既にログイン済みの場合は管理画面にリダイレクト
    if (this.auth.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }

    this.setupEventListeners();
    this.checkLoginAttempts();
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    const passwordInput = document.getElementById('password');
    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleLogin();
        }
      });
    }

    const showPasswordBtn = document.getElementById('showPassword');
    if (showPasswordBtn) {
      showPasswordBtn.addEventListener('click', () => {
        this.togglePasswordVisibility();
      });
    }

    // パスワード入力時のリアルタイムバリデーション
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        this.validatePassword();
      });
    }
  }

  /**
   * ログイン処理
   */
  async handleLogin() {
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');

    // ログイン試行制限チェック
    const attemptCheck = this.auth.checkLoginAttempts();
    if (!attemptCheck.allowed) {
      this.showError(attemptCheck.message);
      return;
    }

    // バリデーション
    if (!password) {
      this.showError('パスワードを入力してください');
      return;
    }

    // ボタンを無効化
    loginBtn.disabled = true;
    loginBtn.textContent = 'ログイン中...';

    try {
      const result = await this.auth.login(password);
      
      if (result.success) {
        // ログイン成功
        this.auth.logSecurityEvent('login_success');
        this.showSuccess('ログインしました');
        
        // 少し待ってからリダイレクト
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        // ログイン失敗
        this.auth.recordLoginAttempt();
        this.auth.logSecurityEvent('login_failed', { reason: 'invalid_password' });
        this.showError(result.message);
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      this.showError('ログインに失敗しました');
    } finally {
      // ボタンを有効化
      loginBtn.disabled = false;
      loginBtn.textContent = 'ログイン';
    }
  }

  /**
   * パスワード表示/非表示を切り替え
   */
  togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const showPasswordBtn = document.getElementById('showPassword');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      showPasswordBtn.textContent = '非表示';
    } else {
      passwordInput.type = 'password';
      showPasswordBtn.textContent = '表示';
    }
  }

  /**
   * パスワードバリデーション
   */
  validatePassword() {
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    if (password.length > 0) {
      loginBtn.disabled = false;
    } else {
      loginBtn.disabled = true;
    }
  }

  /**
   * ログイン試行制限をチェック
   */
  checkLoginAttempts() {
    const attemptCheck = this.auth.checkLoginAttempts();
    if (!attemptCheck.allowed) {
      const loginBtn = document.getElementById('loginBtn');
      const passwordInput = document.getElementById('password');
      
      if (loginBtn) loginBtn.disabled = true;
      if (passwordInput) passwordInput.disabled = true;
      
      this.showError(attemptCheck.message);
    }
  }

  /**
   * 成功メッセージを表示
   */
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  /**
   * エラーメッセージを表示
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * メッセージを表示
   */
  showMessage(message, type) {
    const errorMessage = document.getElementById('errorMessage');
    if (!errorMessage) return;

    errorMessage.textContent = message;
    errorMessage.className = `message ${type}`;
    errorMessage.style.display = 'block';

    // 成功メッセージは自動で消す
    if (type === 'success') {
      setTimeout(() => {
        errorMessage.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * セキュリティ情報を表示
   */
  showSecurityInfo() {
    const securityInfo = document.getElementById('securityInfo');
    if (!securityInfo) return;

    const logs = this.auth.getSecurityLogs();
    const recentLogs = logs.slice(-5); // 最新5件

    if (recentLogs.length > 0) {
      const html = `
        <h4>最近のログイン履歴</h4>
        <ul>
          ${recentLogs.map(log => `
            <li>
              ${new Date(log.timestamp).toLocaleString('ja-JP')} - ${log.event}
            </li>
          `).join('')}
        </ul>
      `;
      securityInfo.innerHTML = html;
    }
  }

  /**
   * デモ用の情報を表示
   */
  showDemoInfo() {
    const demoInfo = document.getElementById('demoInfo');
    if (demoInfo) {
      demoInfo.innerHTML = `
        <div class="demo-info">
          <h4>デモ用ログイン情報</h4>
          <p>パスワード: <code>rbs2025admin</code></p>
          <p><small>※ 実際の運用では安全なパスワードを設定してください</small></p>
        </div>
      `;
    }
  }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  const adminLogin = new AdminLogin();
  
  // デモ情報を表示（開発環境のみ）
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    adminLogin.showDemoInfo();
  }
}); 