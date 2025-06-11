/**
 * 統一認証システム デバッグユーティリティ
 * @version 2.0.0 - AuthManager対応
 */

import { CONFIG } from '../constants/config.js';
import { authManager } from '../../features/auth/AuthManager.js';

/**
 * 認証状態のフル診断
 */
export function diagnosisAuth() {
  console.group('🩺 認証システム診断 (CONFIG統一版)');
  
  try {
    const authData = localStorage.getItem(CONFIG.storage.keys.adminSession);
    const now = Date.now();
    
    console.log('📋 基本情報');
    console.log('  環境:', CONFIG.app.environment);
    console.log('  ストレージキー:', CONFIG.storage.keys.adminSession);
      console.log('  パスワード:', CONFIG.admin.auth.password);
  console.log('  セッション時間:', CONFIG.admin.auth.sessionDuration / (60*60*1000) + '時間');
    
    console.log('\n💾 ストレージ状態');
    console.log('  認証データ存在:', !!authData);
    
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        
        console.log('  データ構造:');
        console.log('    token:', parsed.token ? parsed.token.substring(0, 30) + '...' : 'なし');
        console.log('    created:', parsed.created ? new Date(parsed.created) : 'なし');
        console.log('    expires:', parsed.expires ? new Date(parsed.expires) : 'なし');
        console.log('    lastActivity:', parsed.lastActivity ? new Date(parsed.lastActivity) : 'なし');
        console.log('    version:', parsed.version || 'なし');
        
        console.log('  有効性チェック:');
        console.log('    hasToken:', !!parsed.token);
        console.log('    hasCreated:', !!parsed.created);
        console.log('    hasExpires:', !!parsed.expires);
        console.log('    hasLastActivity:', !!parsed.lastActivity);
        
        if (parsed.expires) {
          const isExpired = now >= parsed.expires;
          const remainingMs = parsed.expires - now;
          const remainingMinutes = Math.round(remainingMs / 60000);
          
          console.log('    期限切れ:', isExpired);
          console.log('    残り時間:', remainingMinutes + '分');
          
          if (isExpired) {
            console.log('    期限切れ時刻:', new Date(parsed.expires));
            console.log('    経過時間:', Math.round((now - parsed.expires) / 60000) + '分');
          }
        }
        
        // 統一判定ロジック
        const isValid = parsed.token && 
                       parsed.created && 
                       parsed.expires && 
                       (now < parsed.expires);
        
        console.log('\n✅ 最終判定');
        console.log('  認証状態:', isValid ? '有効' : '無効');
        
        if (!isValid) {
          console.log('  無効理由:');
          if (!parsed.token) console.log('    - トークンなし');
          if (!parsed.created) console.log('    - 作成日時なし');
          if (!parsed.expires) console.log('    - 有効期限なし');
          if (parsed.expires && now >= parsed.expires) console.log('    - 期限切れ');
        }
        
      } catch (parseError) {
        console.error('❌ データ解析エラー:', parseError);
        console.log('  生データ:', authData);
      }
    } else {
      console.log('  → 認証データが存在しません');
    }
    
    console.log('\n🌐 ページ状態');
    console.log('  URL:', window.location.href);
    console.log('  pathname:', window.location.pathname);
    console.log('  search:', window.location.search);
    
    console.log('\n🔧 その他のストレージ');
    Object.entries(CONFIG.storage.keys).forEach(([key, value]) => {
      if (key !== 'adminSession') {
        const data = localStorage.getItem(value);
        console.log(`  ${key} (${value}):`, data ? '存在' : 'なし');
      }
    });
    
  } catch (error) {
    console.error('❌ 診断中にエラー:', error);
  }
  
  console.groupEnd();
}

/**
 * 認証データクリア（完全）
 */
export function clearAllAuth() {
  console.log('🧹 認証データ完全クリア開始');
  
  try {
    // AuthManagerを使用してクリア
    authManager.logout();
    
    // 関連データもクリア
    localStorage.removeItem(CONFIG.storage.keys.authAttempts);
    localStorage.removeItem(CONFIG.storage.keys.authLastAttempt);
    
    console.log('✅ 認証データクリア完了');
    
    // 現在の状態確認
    setTimeout(() => {
      authManager.debug();
    }, 100);
    
  } catch (error) {
    console.error('❌ クリア中にエラー:', error);
  }
}

/**
 * テスト用認証セッション作成
 */
export function createTestSession(hoursFromNow = 24) {
  console.log('🧪 テスト用セッション作成開始');
  
  try {
    // テスト用パスワードでログイン
    const success = authManager.login('dev');
    
    if (success) {
      console.log('✅ テストセッション作成完了:', {
        duration: hoursFromNow + '時間'
      });
      
      // 作成結果確認
      setTimeout(() => {
        authManager.debug();
      }, 100);
    } else {
      console.error('❌ テストセッション作成失敗');
    }
    
  } catch (error) {
    console.error('❌ テストセッション作成エラー:', error);
  }
}

/**
 * 認証システムリセット
 */
export function resetAuthSystem() {
  console.log('🔄 認証システムリセット開始');
  
  try {
    // 全認証データクリア
    clearAllAuth();
    
    // ページリロード
    setTimeout(() => {
      console.log('🔄 ページリロード実行');
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ リセットエラー:', error);
  }
}

/**
 * リダイレクト状態確認
 */
export function checkRedirectState() {
  console.group('🔀 リダイレクト状態確認');
  
  try {
    // パスの確認
    console.log('現在のパス:', window.location.pathname);
    console.log('クエリパラメータ:', window.location.search);
    console.log('ハッシュ:', window.location.hash);
    
    // セッション判定
    const authData = localStorage.getItem(CONFIG.storage.keys.adminSession);
    const hasValidSession = authData && (() => {
      try {
        const parsed = JSON.parse(authData);
        const now = Date.now();
        return parsed.token && parsed.created && parsed.expires && (now < parsed.expires);
      } catch {
        return false;
      }
    })();
    
    console.log('認証セッション有効:', hasValidSession);
    
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

// デバッグ環境でのグローバル登録
if (CONFIG.debug.enabled) {
  window.diagnosisAuth = diagnosisAuth;
  window.clearAllAuth = clearAllAuth;
  window.createTestSession = createTestSession;
  window.resetAuthSystem = resetAuthSystem;
  window.checkRedirectState = checkRedirectState;
  
  console.log('🔧 デバッグ機能が利用可能です:');
  console.log('  diagnosisAuth() - 認証システム診断');
  console.log('  clearAllAuth() - 認証データクリア');
  console.log('  createTestSession() - テストセッション作成');
  console.log('  resetAuthSystem() - システムリセット');
  console.log('  checkRedirectState() - リダイレクト状態確認');
} 