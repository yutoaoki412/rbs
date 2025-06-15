/**
 * 認証Supabaseサービス
 * LocalStorageベースの認証をSupabase Authに完全移行
 * @version 1.0.0 - Supabase Auth統合版
 */

import { getSupabaseClient } from '../../lib/supabase.js';
import { EventBus } from './EventBus.js';

export class AuthSupabaseService {
  constructor() {
    this.serviceName = 'AuthSupabaseService';
    this.initialized = false;
    this.supabase = null;
    this.currentUser = null;
    this.currentSession = null;
    this.eventBus = EventBus;
    
    // 認証状態の変更を監視
    this.authStateChangeListener = null;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[AuthSupabaseService] 初期化開始');
      
      // Supabaseクライアント取得
      this.supabase = getSupabaseClient();
      
      // 現在のセッションを取得
      await this.getCurrentSession();
      
      // 認証状態の変更を監視
      this.setupAuthStateListener();
      
      this.initialized = true;
      console.log('[AuthSupabaseService] 初期化完了');
      
    } catch (error) {
      console.error('[AuthSupabaseService] 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 認証状態変更リスナーを設定
   */
  setupAuthStateListener() {
    this.authStateChangeListener = this.supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthSupabaseService] 認証状態変更:', event, session?.user?.email);
        
        this.currentSession = session;
        this.currentUser = session?.user || null;
        
        // イベントを発火
        this.eventBus.emit('auth:stateChange', {
          event,
          session,
          user: this.currentUser,
          isAuthenticated: !!this.currentUser
        });
        
        switch (event) {
          case 'SIGNED_IN':
            this.eventBus.emit('auth:signedIn', { user: this.currentUser, session });
            break;
          case 'SIGNED_OUT':
            this.eventBus.emit('auth:signedOut');
            break;
          case 'TOKEN_REFRESHED':
            this.eventBus.emit('auth:tokenRefreshed', { session });
            break;
        }
      }
    );
  }

  /**
   * 現在のセッションを取得
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthSupabaseService] セッション取得エラー:', error);
        return null;
      }
      
      this.currentSession = session;
      this.currentUser = session?.user || null;
      
      console.log('[AuthSupabaseService] 現在のセッション:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        expiresAt: session?.expires_at
      });
      
      return session;
      
    } catch (error) {
      console.error('[AuthSupabaseService] セッション取得エラー:', error);
      return null;
    }
  }

  /**
   * 現在のユーザーを取得
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        console.error('[AuthSupabaseService] ユーザー取得エラー:', error);
        return null;
      }
      
      this.currentUser = user;
      return user;
      
    } catch (error) {
      console.error('[AuthSupabaseService] ユーザー取得エラー:', error);
      return null;
    }
  }

  /**
   * 管理者としてサインイン
   * @param {Object} credentials - 認証情報
   * @param {string} credentials.email - メールアドレス
   * @param {string} credentials.password - パスワード
   */
  async signIn(credentials) {
    try {
      console.log('[AuthSupabaseService] サインイン開始:', credentials.email);
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });
      
      if (error) {
        console.error('[AuthSupabaseService] サインインエラー:', error);
        throw new Error(`認証に失敗しました: ${error.message}`);
      }
      
      this.currentSession = data.session;
      this.currentUser = data.user;
      
      console.log('[AuthSupabaseService] サインイン成功:', {
        userEmail: data.user.email,
        userId: data.user.id
      });
      
      return {
        success: true,
        user: data.user,
        session: data.session
      };
      
    } catch (error) {
      console.error('[AuthSupabaseService] サインインエラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * サインアウト
   */
  async signOut() {
    try {
      console.log('[AuthSupabaseService] サインアウト開始');
      
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthSupabaseService] サインアウトエラー:', error);
        throw error;
      }
      
      this.currentSession = null;
      this.currentUser = null;
      
      console.log('[AuthSupabaseService] サインアウト完了');
      
      return { success: true };
      
    } catch (error) {
      console.error('[AuthSupabaseService] サインアウトエラー:', error);
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
      console.log('[AuthSupabaseService] セッション更新開始');
      
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error) {
        console.error('[AuthSupabaseService] セッション更新エラー:', error);
        throw error;
      }
      
      this.currentSession = data.session;
      this.currentUser = data.user;
      
      console.log('[AuthSupabaseService] セッション更新完了');
      
      return {
        success: true,
        session: data.session,
        user: data.user
      };
      
    } catch (error) {
      console.error('[AuthSupabaseService] セッション更新エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 認証状態を確認
   */
  isAuthenticated() {
    return !!(this.currentUser && this.currentSession);
  }

  /**
   * 管理者権限を確認（セキュアアーキテクチャ対応）
   */
  isAdmin() {
    if (!this.currentUser) return false;
    
    // 1. メタデータのroleをチェック（優先）
    if (this.currentUser.user_metadata && this.currentUser.user_metadata.role === 'admin') {
      console.log('[AuthSupabaseService] 管理者権限確認: メタデータ権限 ✅');
      return true;
    }
    
    // 2. フォールバック: 管理者メールアドレスの確認
    const adminEmails = ['yaoki412rad@gmail.com'];
    const hasAdminEmail = adminEmails.includes(this.currentUser.email);
    
    if (hasAdminEmail) {
      console.log('[AuthSupabaseService] 管理者権限確認: メールアドレス権限 ✅');
    } else {
      console.log('[AuthSupabaseService] 管理者権限確認: 権限なし ❌');
    }
    
    return hasAdminEmail;
  }

  /**
   * セッションの有効期限を確認
   */
  isSessionValid() {
    if (!this.currentSession) return false;
    
    const expiresAt = new Date(this.currentSession.expires_at * 1000);
    const now = new Date();
    
    return expiresAt > now;
  }

  /**
   * 認証情報を取得（デバッグ用）
   */
  getAuthInfo() {
    return {
      isAuthenticated: this.isAuthenticated(),
      isAdmin: this.isAdmin(),
      isSessionValid: this.isSessionValid(),
      user: this.currentUser ? {
        id: this.currentUser.id,
        email: this.currentUser.email,
        created_at: this.currentUser.created_at
      } : null,
      session: this.currentSession ? {
        access_token: this.currentSession.access_token ? '***' : null,
        expires_at: this.currentSession.expires_at,
        token_type: this.currentSession.token_type
      } : null
    };
  }

  /**
   * サービス破棄
   */
  destroy() {
    console.log('[AuthSupabaseService] サービス破棄');
    
    // 認証状態リスナーを削除
    if (this.authStateChangeListener) {
      this.authStateChangeListener.data.subscription.unsubscribe();
      this.authStateChangeListener = null;
    }
    
    this.currentUser = null;
    this.currentSession = null;
    this.initialized = false;
  }
}

// シングルトンインスタンス
let authSupabaseServiceInstance = null;

/**
 * AuthSupabaseServiceのシングルトンインスタンスを取得
 * @returns {AuthSupabaseService}
 */
export function getAuthSupabaseService() {
  if (!authSupabaseServiceInstance) {
    authSupabaseServiceInstance = new AuthSupabaseService();
  }
  return authSupabaseServiceInstance;
} 