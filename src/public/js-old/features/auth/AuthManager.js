/**
 * 統一認証マネージャー
 * ログイン、ログアウト、セッション管理を一元化
 * @version 1.0.0 - 完全統一実装
 */

import { CONFIG } from '../../shared/constants/config.js';

export class AuthManager {
  constructor() {
    this.storageKey = CONFIG.storage.keys.adminAuth;
    this.password = CONFIG.security.admin.password;
    this.sessionDuration = CONFIG.security.admin.sessionDuration;
    this.initialized = false;
    
    console.log('🔐 AuthManager初期化', {
      storageKey: this.storageKey,
      sessionDuration: this.sessionDuration / (60*60*1000) + '時間'
    });
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ AuthManager: 既に初期化済み');
      return;
    }
    
    this.cleanupOldSessions();
    this.initialized = true;
    console.log('✅ AuthManager初期化完了');
  }

  /**
   * ログイン処理
   * @param {string} password - パスワード
   * @returns {boolean} ログイン成功/失敗
   */
  login(password) {
    if (!password) {
      console.error('❌ パスワードが入力されていません');
      return false;
    }

    // パスワード検証
    const isValidPassword = (password === this.password) || 
                           (CONFIG.app.environment === 'development' && password === 'dev');

    if (!isValidPassword) {
      console.error('❌ パスワードが正しくありません');
      return false;
    }

    // セッション作成
    this.createSession();
    console.log('✅ ログイン成功');
    return true;
  }

  /**
   * ログアウト処理
   */
  logout() {
    this.clearSession();
    console.log('✅ ログアウト完了');
  }

  /**
   * 認証状態チェック
   * @returns {boolean} 認証済みかどうか
   */
  isAuthenticated() {
    try {
      const sessionData = this.getSessionData();
      
      if (!sessionData) {
        return false;
      }

      // 必須フィールドチェック
      if (!sessionData.token || !sessionData.expires || !sessionData.created) {
        console.log('🔐 セッションデータが不完全です');
        this.clearSession();
        return false;
      }

      // 期限チェック
      const now = Date.now();
      if (now >= sessionData.expires) {
        console.log('🔐 セッションが期限切れです');
        this.clearSession();
        return false;
      }

      // セッション延長
      this.updateLastActivity(sessionData);
      
      return true;
    } catch (error) {
      console.error('❌ 認証チェックエラー:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * セッション情報取得
   * @returns {Object|null} セッション情報
   */
  getSessionInfo() {
    const sessionData = this.getSessionData();
    if (!sessionData || !this.isAuthenticated()) {
      return null;
    }

    const now = Date.now();
    return {
      created: new Date(sessionData.created),
      expires: new Date(sessionData.expires),
      lastActivity: new Date(sessionData.lastActivity || sessionData.created),
      remainingMinutes: Math.round((sessionData.expires - now) / 60000),
      isValid: true
    };
  }

  /**
   * セッション作成
   * @private
   */
  createSession() {
    const now = Date.now();
    const sessionData = {
      token: this.generateToken(),
      created: now,
      expires: now + this.sessionDuration,
      lastActivity: now,
      version: CONFIG.storage.version
    };

    localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
    
    console.log('🔐 セッション作成完了:', {
      expires: new Date(sessionData.expires),
      duration: this.sessionDuration / (60*60*1000) + '時間'
    });
  }

  /**
   * セッションクリア
   * @private
   */
  clearSession() {
    localStorage.removeItem(this.storageKey);
    console.log('🧹 セッションクリア完了');
  }

  /**
   * セッションデータ取得
   * @private
   */
  getSessionData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ セッションデータ取得エラー:', error);
      return null;
    }
  }

  /**
   * 最終活動時刻更新
   * @private
   */
  updateLastActivity(sessionData) {
    const now = Date.now();
    if (!sessionData.lastActivity || (now - sessionData.lastActivity > 60000)) {
      sessionData.lastActivity = now;
      localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
    }
  }

  /**
   * トークン生成
   * @private
   */
  generateToken() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return btoa(`rbs_admin_${timestamp}_${random}`);
  }

  /**
   * 古いセッションのクリーンアップ
   * @private
   */
  cleanupOldSessions() {
    const sessionData = this.getSessionData();
    if (sessionData && Date.now() >= sessionData.expires) {
      console.log('🧹 期限切れセッションをクリーンアップ');
      this.clearSession();
    }
  }

  /**
   * デバッグ情報表示
   */
  debug() {
    const sessionData = this.getSessionData();
    const sessionInfo = this.getSessionInfo();
    
    console.group('🔍 AuthManager Debug Info');
    console.log('初期化済み:', this.initialized);
    console.log('ストレージキー:', this.storageKey);
    console.log('セッションデータ:', sessionData);
    console.log('セッション情報:', sessionInfo);
    console.log('認証状態:', this.isAuthenticated());
    console.groupEnd();
  }
}

// シングルトンインスタンス
export const authManager = new AuthManager(); 