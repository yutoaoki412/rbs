/**
 * 認証管理クラス
 * @version 3.0.0 - Supabase完全統合版（LocalStorage削除）
 */

import { getAuthSupabaseService } from '../../shared/services/AuthSupabaseService.js';
import { EventBus } from '../../shared/services/EventBus.js';

export class AuthManager {
  constructor() {
    this.componentName = 'AuthManager';
    this.initialized = false;
    this.authService = null;
    this.eventBus = EventBus;
    
    // 認証状態
    this.isAuthenticated = false;
    this.currentUser = null;
    this.currentSession = null;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[AuthManager] 初期化開始');
      
      // Supabase認証サービス初期化
      this.authService = getAuthSupabaseService();
      await this.authService.init();
      
      // 認証状態の変更を監視
      this.setupAuthStateListener();
      
      // 現在の認証状態を確認
      await this.checkAuthState();
      
      this.initialized = true;
      console.log('[AuthManager] 初期化完了');
      
    } catch (error) {
      console.error('[AuthManager] 初期化エラー:', error);
      this.initialized = true; // エラーでもアプリ停止を防ぐ
    }
  }

  /**
   * 認証状態変更リスナーを設定
   */
  setupAuthStateListener() {
    // Supabase認証状態の変更を監視
    this.eventBus.on('auth:stateChange', (data) => {
      console.log('[AuthManager] 認証状態変更:', data.event);
      
      this.isAuthenticated = data.isAuthenticated;
      this.currentUser = data.user;
      this.currentSession = data.session;
      
      // 認証状態変更イベントを発火
      this.eventBus.emit('authManager:stateChange', {
        isAuthenticated: this.isAuthenticated,
        user: this.currentUser,
        session: this.currentSession
      });
    });
    
    this.eventBus.on('auth:signedIn', (data) => {
      console.log('[AuthManager] サインイン完了:', data.user.email);
      this.eventBus.emit('authManager:signedIn', data);
    });
    
    this.eventBus.on('auth:signedOut', () => {
      console.log('[AuthManager] サインアウト完了');
      this.eventBus.emit('authManager:signedOut');
    });
  }

  /**
   * 現在の認証状態を確認（開発モード対応）
   */
  async checkAuthState() {
    try {
      // 開発モードでの認証チェック
      if (this.isDevelopmentMode()) {
        console.log('[AuthManager] 開発モードで認証状態を設定');
        this.isAuthenticated = false; // 開発時は認証なしで動作
        this.currentUser = { 
          id: 'dev-user', 
          email: 'dev@rbs.local',
          role: 'admin' 
        };
        this.currentSession = { 
          access_token: 'dev-token',
          refresh_token: 'dev-refresh'
        };
        
        return {
          isAuthenticated: this.isAuthenticated,
          user: this.currentUser,
          session: this.currentSession,
          mode: 'development'
        };
      }
      
      // 本番モードでの認証チェック
      const session = await this.authService.getCurrentSession();
      const user = await this.authService.getCurrentUser();
      
      this.isAuthenticated = this.authService.isAuthenticated();
      this.currentUser = user;
      this.currentSession = session;
      
      console.log('[AuthManager] 認証状態確認:', {
        isAuthenticated: this.isAuthenticated,
        userEmail: user?.email,
        hasSession: !!session,
        mode: 'production'
      });
      
      return {
        isAuthenticated: this.isAuthenticated,
        user: this.currentUser,
        session: this.currentSession,
        mode: 'production'
      };
      
    } catch (error) {
      console.log('[AuthManager] 認証エラー、開発モードで継続:', error.message);
      
      // エラー時は開発モードとして継続
      this.isAuthenticated = false;
      this.currentUser = { 
        id: 'dev-user-fallback', 
        email: 'dev@rbs.local',
        role: 'admin' 
      };
      this.currentSession = null;
      
      return {
        isAuthenticated: this.isAuthenticated,
        user: this.currentUser,
        session: this.currentSession,
        mode: 'development_fallback'
      };
    }
  }

  /**
   * 開発モードかどうかを判定
   */
  isDevelopmentMode() {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '3000' ||
      window.location.port === '8080' ||
      process?.env?.NODE_ENV === 'development'
    );
  }

  /**
   * ログイン
   * @param {Object} credentials - 認証情報
   * @param {string} credentials.email - メールアドレス
   * @param {string} credentials.password - パスワード
   */
  async login(credentials) {
    try {
      console.log('[AuthManager] ログイン開始:', credentials.email);
      
      const result = await this.authService.signIn(credentials);
      
      if (result.success) {
        this.isAuthenticated = true;
        this.currentUser = result.user;
        this.currentSession = result.session;
        
        console.log('[AuthManager] ログイン成功:', result.user.email);
        
        return {
          success: true,
          user: result.user,
          session: result.session
        };
      } else {
        console.error('[AuthManager] ログイン失敗:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
      
    } catch (error) {
      console.error('[AuthManager] ログインエラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ログアウト
   */
  async logout() {
    try {
      console.log('[AuthManager] ログアウト開始');
      
      const result = await this.authService.signOut();
      
      if (result.success) {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.currentSession = null;
        
        console.log('[AuthManager] ログアウト成功');
        
        return { success: true };
      } else {
        console.error('[AuthManager] ログアウト失敗:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
      
    } catch (error) {
      console.error('[AuthManager] ログアウトエラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * セッションを更新
   */
  async refreshSession() {
    try {
      console.log('[AuthManager] セッション更新開始');
      
      const result = await this.authService.refreshSession();
      
      if (result.success) {
        this.currentUser = result.user;
        this.currentSession = result.session;
        
        console.log('[AuthManager] セッション更新成功');
        return result;
      } else {
        console.error('[AuthManager] セッション更新失敗:', result.error);
        return result;
      }
      
    } catch (error) {
      console.error('[AuthManager] セッション更新エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 認証状態を確認
   */
  isAuthenticatedMethod() {
    return this.isAuthenticated;
  }

  /**
   * セッション情報を取得
   */
  getSessionInfo() {
    return {
      user: this.currentUser,
      session: this.currentSession,
      isValid: this.isSessionValid()
    };
  }

  /**
   * 認証状態を取得
   */
  getAuthState() {
    return {
      isAuthenticated: this.isAuthenticated,
      user: this.currentUser,
      session: this.currentSession,
      isAdmin: this.authService?.isAdmin() || false,
      isSessionValid: this.authService?.isSessionValid() || false
    };
  }

  /**
   * 管理者権限を確認
   */
  isAdmin() {
    return this.authService?.isAdmin() || false;
  }

  /**
   * セッションの有効性を確認
   */
  isSessionValid() {
    return this.authService?.isSessionValid() || false;
  }

  /**
   * 認証情報を取得（デバッグ用）
   */
  getAuthInfo() {
    return this.authService?.getAuthInfo() || {
      isAuthenticated: false,
      isAdmin: false,
      isSessionValid: false,
      user: null,
      session: null
    };
  }

  /**
   * 認証が必要な処理を実行
   * @param {Function} callback - 実行する処理
   */
  async requireAuth(callback) {
    if (!this.isAuthenticated) {
      console.warn('[AuthManager] 認証が必要です');
      throw new Error('認証が必要です');
    }
    
    if (!this.isSessionValid()) {
      console.warn('[AuthManager] セッションが無効です');
      
      // セッション更新を試行
      const refreshResult = await this.refreshSession();
      if (!refreshResult.success) {
        throw new Error('セッションの更新に失敗しました');
      }
    }
    
    return await callback();
  }

  /**
   * サービス破棄
   */
  destroy() {
    console.log('[AuthManager] サービス破棄');
    
    // イベントリスナーを削除
    this.eventBus.off('auth:stateChange');
    this.eventBus.off('auth:signedIn');
    this.eventBus.off('auth:signedOut');
    
    // 認証サービスを破棄
    if (this.authService) {
      this.authService.destroy();
      this.authService = null;
    }
    
    this.isAuthenticated = false;
    this.currentUser = null;
    this.currentSession = null;
    this.initialized = false;
  }
}

// シングルトンインスタンス
let authManagerInstance = null;

/**
 * AuthManagerのシングルトンインスタンスを取得
 * @returns {AuthManager}
 */
export function getAuthManager() {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager();
  }
  return authManagerInstance;
}

// デフォルトエクスポート用のインスタンス
export const authManager = getAuthManager(); 