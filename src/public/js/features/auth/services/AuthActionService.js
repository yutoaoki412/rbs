/**
 * 認証アクションサービス
 * ログインフォームや認証関連のアクションを管理
 * @version 2.1.0 - 統一パス設定対応
 */

import { actionManager } from '../../../core/ActionManager.js';
import { authService } from './AuthService.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { querySelector, show, hide, setValue, getValue } from '../../../shared/utils/domUtils.js';
import { createErrorHtml, createSuccessHtml } from '../../../shared/utils/htmlUtils.js';
import { redirect, PathHelper } from '../../../shared/constants/paths.js';

export class AuthActionService {
  constructor() {
    this.initialized = false;
    this.loginForm = null;
    this.passwordField = null;
    this.submitButton = null;
    this.messageContainer = null;
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ AuthActionService: 既に初期化済み');
      return;
    }

    console.log('🔐 AuthActionService: 初期化開始');
    
    this.#findElements();
    this.#registerAuthActions();
    this.#setupEventListeners();
    this.#updateAuthUI();
    
    this.initialized = true;
    console.log('✅ AuthActionService: 初期化完了');
  }

  /**
   * DOM要素を取得
   * @private
   */
  #findElements() {
    this.loginForm = querySelector('#loginForm, .login-form, form[data-auth="login"]');
    this.passwordField = querySelector('#password, [name="password"], [data-field="password"]');
    this.submitButton = querySelector('#loginButton, [type="submit"], [data-action="auth-login"]');
    this.messageContainer = querySelector('#authMessage, .auth-message, .message-container');

    // フィードバック用のメッセージコンテナがない場合は作成
    if (!this.messageContainer && this.loginForm) {
      this.messageContainer = document.createElement('div');
      this.messageContainer.className = 'auth-message';
      this.loginForm.insertBefore(this.messageContainer, this.loginForm.firstChild);
    }
  }

  /**
   * 認証関連アクションを登録
   * @private
   */
  #registerAuthActions() {
    const authActions = {
      // ログイン処理
      'auth-login': async (element, params, event) => {
        if (event) event.preventDefault();
        await this.#handleLogin();
      },

      // ログアウト処理
      'auth-logout': async (element, params, event) => {
        if (event) event.preventDefault();
        await this.#handleLogout();
      },

      // 認証状態チェック
      'auth-check': () => {
        this.#updateAuthUI();
      },

      // セッション情報表示
      'auth-show-session': () => {
        this.#showSessionInfo();
      },

      // パスワード表示切り替え
      'auth-toggle-password': (element) => {
        this.#togglePasswordVisibility(element);
      }
    };

    actionManager.registerMultiple(authActions);
  }

  /**
   * イベントリスナーを設定
   * @private
   */
  #setupEventListeners() {
    // 認証状態変更のリスナー
    EventBus.on('auth:changed', (data) => {
      console.log('🔐 認証状態変更:', data);
      this.#updateAuthUI();
    });

    EventBus.on('auth:login', (data) => {
      console.log('✅ ログイン成功:', data);
      this.#handleLoginSuccess();
    });

    EventBus.on('auth:logout', (data) => {
      console.log('🚪 ログアウト:', data);
      this.#handleLogoutSuccess();
    });

    EventBus.on('auth:failedAttempt', (data) => {
      console.log('❌ ログイン失敗:', data);
      this.#handleLoginFailure(data);
    });

    // フォーム送信のリスナー
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.#handleLogin();
      });
    }

    // Enterキーでのログイン
    if (this.passwordField) {
      this.passwordField.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          await this.#handleLogin();
        }
      });
    }
  }

  /**
   * ログイン処理
   * @private
   */
  async #handleLogin() {
    if (!this.passwordField) {
      this.#showMessage('パスワードフィールドが見つかりません', 'error');
      return;
    }

    const password = getValue(this.passwordField);
    
    // UI更新
    this.#setLoading(true);
    this.#clearMessage();

    try {
      const result = await authService.login(password);
      
      if (result.success) {
        this.#showMessage(result.message, 'success');
        // ログイン成功時はEventBusで処理されるため、ここでは何もしない
      } else {
        this.#showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('❌ ログイン処理エラー:', error);
      this.#showMessage('ログイン処理中にエラーが発生しました', 'error');
    } finally {
      this.#setLoading(false);
    }
  }

  /**
   * ログアウト処理
   * @private
   */
  async #handleLogout() {
    try {
      const result = authService.logout();
      
      if (result.success) {
        this.#showMessage('ログアウトしました', 'success');
        // ログアウト成功時はEventBusで処理されるため、ここでは何もしない
      }
    } catch (error) {
      console.error('❌ ログアウト処理エラー:', error);
      this.#showMessage('ログアウト処理中にエラーが発生しました', 'error');
    }
  }

  /**
   * ログイン成功時の処理
   * @private
   */
  #handleLoginSuccess() {
    // パスワードフィールドをクリア
    if (this.passwordField) {
      setValue(this.passwordField, '');
    }

    // 統一されたリダイレクト処理を使用
    setTimeout(() => {
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || PathHelper.getSafeRedirectPath('admin');
      window.location.href = redirectUrl;
    }, 1000);
  }

  /**
   * ログアウト成功時の処理
   * @private
   */
  #handleLogoutSuccess() {
    // 統一されたリダイレクト処理を使用
    setTimeout(() => {
      redirect.toAdminLogin();
    }, 1000);
  }

  /**
   * ログイン失敗時の処理
   * @private
   * @param {Object} data - 失敗データ
   */
  #handleLoginFailure(data) {
    const { attempts } = data;
    const maxAttempts = authService.config.maxAttempts;
    
    if (attempts >= maxAttempts) {
      this.#showMessage(
        `ログイン試行回数が上限に達しました。しばらくお待ちください。`,
        'error'
      );
    } else {
      const remaining = maxAttempts - attempts;
      this.#showMessage(
        `パスワードが正しくありません。あと${remaining}回試行できます。`,
        'error'
      );
    }
  }

  /**
   * パスワード表示切り替え
   * @private
   * @param {HTMLElement} toggleButton - 切り替えボタン
   */
  #togglePasswordVisibility(toggleButton) {
    if (!this.passwordField) return;

    const isPassword = this.passwordField.type === 'password';
    this.passwordField.type = isPassword ? 'text' : 'password';
    
    // ボタンテキストを更新
    if (toggleButton) {
      toggleButton.textContent = isPassword ? '非表示' : '表示';
      toggleButton.setAttribute('aria-label', 
        isPassword ? 'パスワードを非表示にする' : 'パスワードを表示する'
      );
    }
  }

  /**
   * 認証UI更新
   * @private
   */
  #updateAuthUI() {
    const isAuthenticated = authService.isAuthenticated();
    
    // 認証済みの場合
    if (isAuthenticated) {
      this.#showAuthenticatedState();
    } else {
      this.#showUnauthenticatedState();
    }
  }

  /**
   * 認証済み状態のUI表示
   * @private
   */
  #showAuthenticatedState() {
    // ログインフォームを非表示
    if (this.loginForm) {
      hide(this.loginForm);
    }

    // 認証済みメッセージを表示
    const sessionInfo = authService.getSessionInfo();
    if (sessionInfo && this.messageContainer) {
      const message = `ログイン中 (残り: ${sessionInfo.remainingMinutes}分)`;
      this.#showMessage(message, 'success');
    }
  }

  /**
   * 未認証状態のUI表示
   * @private
   */
  #showUnauthenticatedState() {
    // ログインフォームを表示
    if (this.loginForm) {
      show(this.loginForm);
    }
  }

  /**
   * セッション情報表示
   * @private
   */
  #showSessionInfo() {
    const sessionInfo = authService.getSessionInfo();
    const securityInfo = authService.getSecurityInfo();
    
    if (!sessionInfo) {
      this.#showMessage('セッション情報がありません', 'info');
      return;
    }

    const info = `
      セッション情報:
      - 作成日時: ${sessionInfo.created.toLocaleString()}
      - 有効期限: ${sessionInfo.expires.toLocaleString()}
      - 残り時間: ${sessionInfo.remainingMinutes}分
      - 失敗試行: ${securityInfo.failedAttempts}/${securityInfo.maxAttempts}回
    `;
    
    console.log('🔐 セッション情報:', info);
    alert(info); // 暫定実装
  }

  /**
   * メッセージ表示
   * @private
   * @param {string} message - メッセージ
   * @param {string} type - タイプ
   */
  #showMessage(message, type = 'info') {
    if (!this.messageContainer) return;

    let html = '';
    switch (type) {
      case 'success':
        html = createSuccessHtml(message);
        break;
      case 'error':
        html = createErrorHtml(
          'エラー',
          message,
          '❌'
        );
        break;
      default:
        html = `<div class="message ${type}">${message}</div>`;
    }

    this.messageContainer.innerHTML = html;
  }

  /**
   * メッセージクリア
   * @private
   */
  #clearMessage() {
    if (this.messageContainer) {
      this.messageContainer.innerHTML = '';
    }
  }

  /**
   * ローディング状態設定
   * @private
   * @param {boolean} loading - ローディング状態
   */
  #setLoading(loading) {
    if (this.submitButton) {
      this.submitButton.disabled = loading;
      this.submitButton.textContent = loading ? 'ログイン中...' : 'ログイン';
    }

    if (this.passwordField) {
      this.passwordField.disabled = loading;
    }
  }
}

// シングルトンインスタンス
export const authActionService = new AuthActionService(); 