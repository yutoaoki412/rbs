/**
 * RBS陸上教室 メインエントリーポイント v3.0
 * 新しいアーキテクチャでのアプリケーション起動
 * TypeScript移行対応版
 * 
 * @typedef {Object} ErrorInfo
 * @property {string} message - エラーメッセージ
 * @property {string} stack - スタックトレース
 * @property {string} timestamp - タイムスタンプ
 * @property {string} userAgent - ユーザーエージェント
 * @property {string} url - エラー発生URL
 * 
 * @typedef {Object} DashboardStats
 * @property {number} total - 総記事数
 * @property {number} published - 公開済み記事数
 * @property {number} draft - 下書き記事数
 * @property {number} currentMonth - 今月の記事数
 */

import Application from './app/Application.js';

/**
 * アプリケーションインスタンス
 * @type {Application|null}
 */
let app = null;

/**
 * アプリケーションを初期化
 * @returns {Promise<void>}
 */
async function initializeApp() {
  try {
    console.log('🚀 RBS陸上教室システム v3.0 起動中...');
    
    // 既存のインスタンスがある場合は破棄
    if (app) {
      app.destroy();
    }
    
    // 新しいアプリケーションインスタンスを作成
    app = new Application();
    
    // アプリケーションを初期化
    await app.init();
    
    // グローバルに公開（開発用）
    if (app.config?.debug?.enabled) {
      /** @type {any} */
      const globalScope = window;
      globalScope.RBS = {
        app,
        version: '3.0',
        debug: () => app?.getInfo(),
        modules: () => Array.from(app?.modules.keys() ?? [])
      };
    }
    
    console.log('✅ RBS陸上教室システム v3.0 起動完了');
    
  } catch (error) {
    console.error('❌ アプリケーション起動失敗:', error);
    
    // フォールバック処理
    handleInitializationError(error);
  }
}

/**
 * 初期化エラーを処理
 * @param {Error} error - エラーオブジェクト
 * @returns {void}
 */
function handleInitializationError(error) {
  // エラー情報をローカルストレージに保存
  try {
    /** @type {ErrorInfo} */
    const errorInfo = {
      message: error.message,
      stack: error.stack || '',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    localStorage.setItem('rbs_init_error', JSON.stringify(errorInfo));
  } catch (e) {
    console.warn('エラー情報の保存に失敗:', e);
  }

  // 最小限のフォールバック処理のみ実行
  initMinimalFallbacks();
}

/**
 * 最小限のフォールバック処理
 * @returns {void}
 */
function initMinimalFallbacks() {
  console.log('🔄 最小限のフォールバック処理を実行中...');
  
  // エラーメッセージを表示
  const errorDialog = document.createElement('div');
  errorDialog.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="
        background: white; padding: 2rem; border-radius: 8px;
        max-width: 500px; margin: 1rem; text-align: center;
      ">
        <h2 style="color: #e53e3e; margin-bottom: 1rem;">
          システムエラー
        </h2>
        <p style="margin-bottom: 1rem;">
          アプリケーションの初期化に失敗しました。<br>
          ページを再読み込みしてください。
        </p>
        <div style="display: flex; gap: 0.5rem; justify-content: center;">
          <button onclick="window.location.reload()" style="
            background: #4299e1; color: white; border: none;
            padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;
          ">
            再読み込み
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            background: #718096; color: white; border: none;
            padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;
          ">
            閉じる
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorDialog);
  
  console.log('✅ 最小限のフォールバック処理完了');
}

/**
 * ページ離脱時の処理
 */
window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});

/**
 * DOMContentLoaded イベントで初期化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOMが既に読み込まれている場合
  setTimeout(initializeApp, 0);
}

// エクスポート
export { app, initializeApp }; 