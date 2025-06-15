/**
 * 管理画面統合認証サービス
 * Supabase Auth完全統合版 - RLSポリシー対応
 * @version 1.0.0
 */

import { CONFIG } from '../../../shared/constants/config.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { getSupabaseClient } from '../../../lib/supabase.js';

export class AdminAuthService {
  constructor() {
    this.serviceName = 'AdminAuthService';
    this.initialized = false;
    this.supabase = null;
    
    // 認証状態
    this.currentUser = null;
    this.currentSession = null;
    this.isAuthenticated = false;
    
    // 設定
    this.config = CONFIG.admin.auth;
    
    // イベントバス
    this.eventBus = EventBus;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[AdminAuthService] 初期化開始');
      
      // Supabaseクライアント取得
      this.supabase = getSupabaseClient();
      
      if (!this.supabase) {
        throw new Error('Supabaseクライアントが利用できません');
      }
      
      // 認証状態リスナー設定
      this.setupAuthStateListener();
      
      // 現在のセッション確認
      await this.checkCurrentSession();
      
      this.initialized = true;
      console.log('[AdminAuthService] 初期化完了');
      
    } catch (error) {
      console.error('[AdminAuthService] 初期化エラー:', error);
      this.initialized = true; // エラーでも基本機能は提供
    }
  }

  /**
   * 認証状態リスナー設定
   */
  setupAuthStateListener() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AdminAuthService] 認証状態変更:', event);
      
      this.currentSession = session;
      this.currentUser = session?.user || null;
      this.isAuthenticated = !!session;
      
      // イベント発火
      this.eventBus.emit('adminAuth:stateChange', {
        event,
        session,
        user: this.currentUser,
        isAuthenticated: this.isAuthenticated
      });
      
      switch (event) {
        case 'SIGNED_IN':
          console.log('[AdminAuthService] サインイン完了:', this.currentUser.email);
          this.eventBus.emit('adminAuth:signedIn', { user: this.currentUser, session });
          break;
          
        case 'SIGNED_OUT':
          console.log('[AdminAuthService] サインアウト完了');
          this.eventBus.emit('adminAuth:signedOut');
          break;
          
        case 'TOKEN_REFRESHED':
          console.log('[AdminAuthService] トークン更新完了');
          this.eventBus.emit('adminAuth:tokenRefreshed', { session });
          break;
      }
    });
  }

  /**
   * 現在のセッション確認
   */
  async checkCurrentSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('[AdminAuthService] セッション取得エラー:', error);
        return false;
      }
      
      if (session) {
        this.currentSession = session;
        this.currentUser = session.user;
        this.isAuthenticated = true;
        
        // 管理者権限確認
        if (this.isAdminUser()) {
          console.log('[AdminAuthService] 有効な管理者セッションを確認');
          return true;
        } else {
          console.warn('[AdminAuthService] 管理者権限がありません');
          await this.signOut();
          return false;
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('[AdminAuthService] セッション確認エラー:', error);
      return false;
    }
  }

  /**
   * 管理者サインイン
   * @param {Object} credentials - 認証情報
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async signIn(credentials = null) {
    try {
      // デフォルト認証情報を使用
      const authCredentials = credentials || this.config.adminCredentials;
      
      console.log('[AdminAuthService] サインイン開始:', authCredentials.email);
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: authCredentials.email,
        password: authCredentials.password
      });
      
      if (error) {
        console.error('[AdminAuthService] サインインエラー:', error);
        return {
          success: false,
          error: `認証に失敗しました: ${error.message}`
        };
      }
      
      // 管理者権限確認
      if (!this.isAdminUser(data.user)) {
        await this.signOut();
        return {
          success: false,
          error: '管理者権限がありません'
        };
      }
      
      this.currentSession = data.session;
      this.currentUser = data.user;
      this.isAuthenticated = true;
      
      console.log('[AdminAuthService] サインイン成功:', data.user.email);
      
      return {
        success: true,
        user: data.user,
        session: data.session
      };
      
    } catch (error) {
      console.error('[AdminAuthService] サインインエラー:', error);
      return {
        success: false,
        error: `認証処理中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * サインアウト
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async signOut() {
    try {
      console.log('[AdminAuthService] サインアウト開始');
      
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('[AdminAuthService] サインアウトエラー:', error);
        return {
          success: false,
          error: `サインアウトに失敗しました: ${error.message}`
        };
      }
      
      // 状態クリア
      this.currentSession = null;
      this.currentUser = null;
      this.isAuthenticated = false;
      
      console.log('[AdminAuthService] サインアウト完了');
      
      return {
        success: true
      };
      
    } catch (error) {
      console.error('[AdminAuthService] サインアウトエラー:', error);
      return {
        success: false,
        error: `サインアウト処理中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 管理者ユーザー確認
   * @param {Object} user - ユーザーオブジェクト
   * @returns {boolean}
   */
  isAdminUser(user = null) {
    const targetUser = user || this.currentUser;
    
    if (!targetUser) return false;
    
    // 管理者メールアドレス確認
    return targetUser.email === this.config.adminCredentials.email;
  }

  /**
   * 認証状態確認
   * @returns {boolean}
   */
  isAuthenticatedUser() {
    return this.isAuthenticated && !!this.currentSession && this.isAdminUser();
  }

  /**
   * セッション有効性確認
   * @returns {boolean}
   */
  isSessionValid() {
    if (!this.currentSession) return false;
    
    const expiresAt = new Date(this.currentSession.expires_at * 1000);
    const now = new Date();
    
    return now < expiresAt;
  }

  /**
   * 認証必須チェック
   * @returns {Promise<boolean>}
   */
  async requireAuthentication() {
    if (!this.isAuthenticatedUser() || !this.isSessionValid()) {
      console.warn('[AdminAuthService] 認証が必要です');
      
      // 認証ページにリダイレクト
      const redirectUrl = this.config.flow.unauthorizedRedirect;
      window.location.href = redirectUrl;
      
      return false;
    }
    
    return true;
  }

  /**
   * 現在のユーザー取得
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * 現在のセッション取得
   * @returns {Object|null}
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * 認証情報取得（デバッグ用）
   * @returns {Object}
   */
  getAuthInfo() {
    return {
      isAuthenticated: this.isAuthenticated,
      isAdmin: this.isAdminUser(),
      isSessionValid: this.isSessionValid(),
      user: this.currentUser ? {
        id: this.currentUser.id,
        email: this.currentUser.email,
        created_at: this.currentUser.created_at
      } : null,
      session: this.currentSession ? {
        expires_at: this.currentSession.expires_at,
        token_type: this.currentSession.token_type
      } : null
    };
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.currentUser = null;
    this.currentSession = null;
    this.isAuthenticated = false;
    this.initialized = false;
    console.log('[AdminAuthService] サービスを破棄');
  }
}

// シングルトンインスタンス
let adminAuthServiceInstance = null;

/**
 * AdminAuthServiceのシングルトンインスタンスを取得
 * @returns {AdminAuthService}
 */
export function getAdminAuthService() {
  if (!adminAuthServiceInstance) {
    adminAuthServiceInstance = new AdminAuthService();
  }
  return adminAuthServiceInstance;
} 