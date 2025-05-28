/**
 * RBS陸上教室 管理画面システム v2.1
 * メインエントリーポイント（スリム化版）
 */

import { AdminCore } from './admin/core/AdminCore.js';

// グローバル変数として管理画面インスタンスを保持
let adminInstance = null;

/**
 * 管理画面の初期化
 */
async function initializeAdmin() {
  try {
    console.log('RBS陸上教室 管理画面システム v2.1 を起動中...');
    
    // 既存のインスタンスがある場合は破棄
    if (adminInstance) {
      adminInstance.destroy();
    }
    
    // 新しいインスタンスを作成
    adminInstance = new AdminCore();
    
    // 初期化
    await adminInstance.init();
    
    console.log('管理画面システムの起動が完了しました');
    
  } catch (error) {
    console.error('管理画面システムの起動に失敗:', error);
    
    // エラー発生時のフォールバック
    showFallbackError(error);
  }
}

/**
 * フォールバックエラー表示
 */
function showFallbackError(error) {
  const errorHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      text-align: center;
      z-index: 9999;
      max-width: 500px;
    ">
      <h2 style="color: #e53e3e; margin-bottom: 1rem;">
        管理画面の起動に失敗しました
      </h2>
      <p style="margin-bottom: 1rem;">
        システムエラーが発生しました。<br>
        ページを再読み込みするか、管理者にお問い合わせください。
      </p>
      <div style="margin-bottom: 1rem; padding: 1rem; background: #f7fafc; border-radius: 4px; font-size: 0.8em; color: #4a5568; text-align: left;">
        <strong>エラー詳細:</strong><br>
        ${error.message}<br>
        <small>タイムスタンプ: ${new Date().toLocaleString('ja-JP')}</small>
      </div>
      <div>
        <button onclick="window.location.reload()" style="
          background: #4299e1;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 0.5rem;
        ">
          再読み込み
        </button>
        <button onclick="window.location.href='admin-login.html'" style="
          background: #718096;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 0.5rem;
        ">
          ログイン画面へ
        </button>
        <button onclick="console.error('管理画面エラー:', ${JSON.stringify(error.message)})" style="
          background: #e53e3e;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        ">
          コンソールに出力
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', errorHTML);
}

/**
 * ページ離脱時の確認処理
 */
window.addEventListener('beforeunload', (e) => {
  if (adminInstance && adminInstance.uiManager && adminInstance.uiManager.hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = '未保存の変更があります。本当に離脱しますか？';
  }
});

/**
 * DOMContentLoaded イベントで初期化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
  initializeAdmin();
}

// デバッグ用: 開発環境でのみグローバルに公開
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.adminInstance = adminInstance;
  window.getSystemStatus = () => adminInstance?.getSystemStatus();
  window.getPerformanceInfo = () => adminInstance?.getPerformanceInfo();
}

// モジュールとして公開
export { adminInstance, initializeAdmin }; 