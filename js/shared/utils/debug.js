/**
 * 統一認証システム デバッグユーティリティ
 * @version 3.0.0 - Supabase完全統合版（LocalStorage削除）
 */

import { CONFIG } from '../constants/config.js';
import { getAuthSupabaseService } from '../../features/auth/AuthManager.js';

/**
 * 認証状態のフル診断
 */
export async function diagnosisAuth() {
  console.group('🩺 認証システム診断 (Supabase統合版)');
  
  try {
    const authService = await getAuthSupabaseService();
    const authState = await authService.getCurrentSession();
    const user = await authService.getCurrentUser();
    
    console.log('📋 基本情報');
    console.log('  環境:', CONFIG.app.environment);
    console.log('  認証方式: Supabase Auth');
    console.log('  パスワード:', CONFIG.admin.auth.password);
    console.log('  セッション時間:', CONFIG.admin.auth.sessionDuration / (60*60*1000) + '時間');
    
    console.log('\n🔐 Supabase認証状態');
    console.log('  認証サービス初期化:', !!authService);
    console.log('  現在のユーザー:', user ? user.email : 'なし');
    console.log('  セッション有効:', authService.isSessionValid());
    console.log('  管理者権限:', authService.isAdmin());
    
    if (authState) {
      console.log('\n📊 セッション詳細');
      console.log('  アクセストークン:', authState.access_token ? '存在' : 'なし');
      console.log('  リフレッシュトークン:', authState.refresh_token ? '存在' : 'なし');
      console.log('  有効期限:', new Date(authState.expires_at * 1000).toLocaleString());
      console.log('  トークンタイプ:', authState.token_type);
      
      const now = Date.now();
      const expiresAt = authState.expires_at * 1000;
      const isValid = now < expiresAt;
      
      console.log('\n✅ セッション検証');
      console.log('  現在時刻:', new Date(now).toLocaleString());
      console.log('  有効期限:', new Date(expiresAt).toLocaleString());
      console.log('  セッション有効:', isValid);
      console.log('  残り時間:', Math.max(0, Math.floor((expiresAt - now) / 1000 / 60)) + '分');
      
      if (!isValid) {
        console.log('  ⚠️ セッションが期限切れです');
      }
    } else {
      console.log('  → 認証セッションが存在しません');
    }
    
    console.log('\n🌐 ページ状態');
    console.log('  URL:', window.location.href);
    console.log('  pathname:', window.location.pathname);
    console.log('  search:', window.location.search);
    
  } catch (error) {
    console.error('❌ 診断中にエラー:', error);
  }
  
  console.groupEnd();
}

/**
 * 認証状態の簡易確認
 */
export async function checkAuth() {
  console.group('🔍 認証状態確認 (Supabase版)');
  
  try {
    const authService = await getAuthSupabaseService();
    const user = await authService.getCurrentUser();
    const isValid = authService.isSessionValid();
    const isAdmin = authService.isAdmin();
    
    console.log('認証状態:', {
      user: user ? user.email : null,
      isAuthenticated: !!user,
      isSessionValid: isValid,
      isAdmin: isAdmin,
      timestamp: new Date().toISOString()
    });
    
    return {
      isAuthenticated: !!user,
      isSessionValid: isValid,
      isAdmin: isAdmin,
      user: user
    };
    
  } catch (error) {
    console.error('❌ 認証確認エラー:', error);
    return {
      isAuthenticated: false,
      isSessionValid: false,
      isAdmin: false,
      user: null,
      error: error.message
    };
  } finally {
    console.groupEnd();
  }
}

/**
 * 認証トークンの詳細表示
 */
export async function showTokenDetails() {
  console.group('🎫 認証トークン詳細');
  
  try {
    const authService = await getAuthSupabaseService();
    const session = await authService.getCurrentSession();
    
    if (session) {
      console.log('アクセストークン (最初の50文字):', session.access_token.substring(0, 50) + '...');
      console.log('リフレッシュトークン (最初の50文字):', session.refresh_token.substring(0, 50) + '...');
      console.log('トークンタイプ:', session.token_type);
      console.log('発行時刻:', new Date(session.expires_at * 1000 - session.expires_in * 1000).toLocaleString());
      console.log('有効期限:', new Date(session.expires_at * 1000).toLocaleString());
      console.log('有効期間:', session.expires_in + '秒');
    } else {
      console.log('認証トークンが存在しません');
    }
    
  } catch (error) {
    console.error('❌ トークン詳細取得エラー:', error);
  }
  
  console.groupEnd();
}

/**
 * 強制ログアウト（デバッグ用）
 */
export async function forceLogout() {
  console.group('🚪 強制ログアウト');
  
  try {
    const authService = await getAuthSupabaseService();
    const result = await authService.signOut();
    
    if (result.success) {
      console.log('✅ ログアウト成功');
      console.log('ログインページにリダイレクトします...');
      
      setTimeout(() => {
        window.location.href = 'admin-login.html';
      }, 1000);
    } else {
      console.error('❌ ログアウト失敗:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 強制ログアウトエラー:', error);
  }
  
  console.groupEnd();
}

/**
 * セッション更新テスト
 */
export async function testSessionRefresh() {
  console.group('🔄 セッション更新テスト');
  
  try {
    const authService = await getAuthSupabaseService();
    const result = await authService.refreshSession();
    
    if (result.success) {
      console.log('✅ セッション更新成功');
      console.log('新しいセッション:', result.session);
    } else {
      console.error('❌ セッション更新失敗:', result.error);
    }
    
  } catch (error) {
    console.error('❌ セッション更新テストエラー:', error);
  }
  
  console.groupEnd();
}

/**
 * リダイレクト状態確認
 */
export async function checkRedirectState() {
  console.group('🔀 リダイレクト状態確認');
  
  try {
    // パスの確認
    console.log('現在のパス:', window.location.pathname);
    console.log('クエリパラメータ:', window.location.search);
    console.log('ハッシュ:', window.location.hash);
    
    // Supabase認証状態確認
    const authService = await getAuthSupabaseService();
    const hasValidSession = authService.isSessionValid();
    const user = await authService.getCurrentUser();
    
    console.log('認証セッション有効:', hasValidSession);
    console.log('認証ユーザー:', user ? user.email : 'なし');
    
    // 推奨アクション
    const isLoginPage = window.location.pathname.includes('admin-login');
    const isAdminPage = window.location.pathname.includes('admin') && !isLoginPage;
    
    console.log('\n📋 状態分析:');
    console.log('  ログインページ:', isLoginPage);
    console.log('  管理画面:', isAdminPage);
    console.log('  有効セッション:', hasValidSession);
    
    if (isLoginPage && hasValidSession) {
      console.log('  → 状況: ログインページに有効セッションで滞在');
      console.log('  → 推奨: 管理画面にリダイレクトされるべき');
    } else if (isAdminPage && !hasValidSession) {
      console.log('  → 状況: 管理画面に無効セッションで滞在');
      console.log('  → 推奨: ログインページにリダイレクトされるべき');
    } else {
      console.log('  → 状況: 正常');
    }
    
  } catch (error) {
    console.error('❌ リダイレクト状態確認エラー:', error);
  }
  
  console.groupEnd();
}

// グローバル関数として登録（開発環境のみ）
if (CONFIG.app.environment === 'development') {
  window.diagnosisAuth = diagnosisAuth;
  window.checkAuth = checkAuth;
  window.showTokenDetails = showTokenDetails;
  window.forceLogout = forceLogout;
  window.testSessionRefresh = testSessionRefresh;
  window.checkRedirectState = checkRedirectState;
} 