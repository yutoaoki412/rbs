/**
 * 管理画面デバッグ用スクリプト
 * 認証状態とエラーの詳細確認用
 */

window.debugAdmin = function() {
  console.log('=== 管理画面デバッグ情報 ===');
  
  // LocalStorageの認証データ確認
  const authData = localStorage.getItem('rbs_admin_auth');
  console.log('認証データ:', authData ? JSON.parse(authData) : 'なし');
  
  // AdminAuthクラスの確認
  if (typeof AdminAuth !== 'undefined') {
    console.log('AdminAuthクラス: 利用可能');
    const auth = new AdminAuth();
    console.log('認証状態:', auth.isAuthenticated());
    console.log('セッション情報:', auth.getSessionInfo());
  } else {
    console.error('AdminAuthクラス: 利用不可');
  }
  
  // 現在のURL確認
  console.log('現在のURL:', window.location.href);
  
  // AdminManagerの確認
  if (typeof window.adminManager !== 'undefined') {
    console.log('AdminManager: 初期化済み');
  } else {
    console.log('AdminManager: 未初期化');
  }
  
  console.log('=========================');
};

// ページ読み込み後に自動実行
document.addEventListener('DOMContentLoaded', function() {
  console.log('管理画面デバッグスクリプト読み込み完了');
  
  // 3秒後にデバッグ情報を表示
  setTimeout(() => {
    window.debugAdmin();
  }, 3000);
});

// 認証状態を強制的にセット（テスト用）
window.forceLogin = function() {
  const authData = {
    token: 'authenticated',
    created: Date.now(),
    expires: Date.now() + (8 * 60 * 60 * 1000), // 8時間後
    lastActivity: Date.now()
  };
  
  localStorage.setItem('rbs_admin_auth', JSON.stringify(authData));
  console.log('認証状態を強制的にセットしました');
  window.location.reload();
};

// 認証状態をクリア（テスト用）
window.clearAuth = function() {
  localStorage.removeItem('rbs_admin_auth');
  console.log('認証状態をクリアしました');
  window.location.reload();
}; 