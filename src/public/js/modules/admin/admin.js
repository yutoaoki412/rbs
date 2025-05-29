/**
 * RBS陸上教室 管理画面システム v3.0
 * ActionHandler統合版
 */

/**
 * 管理画面の初期化
 */
async function initializeAdmin(app) {
  try {
    console.log('🔧 管理画面システム v3.0 初期化開始');
    
    // ActionHandlerが初期化されるまで待機
    let retryCount = 0;
    const maxRetries = 10;
    
    while (!window.actionHandler?.isInitialized && retryCount < maxRetries) {
      console.log(`⏳ ActionHandlerの初期化を待機中... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 100));
      retryCount++;
    }
    
    if (!window.actionHandler?.isInitialized) {
      throw new Error('ActionHandlerが初期化されていません');
    }
    
    console.log('✅ ActionHandler確認完了');
    
    // 管理画面固有の初期化
    initializeAdminSpecific();
    
    // 初期ダッシュボードを表示
    setTimeout(() => {
      if (window.actionHandler) {
        window.actionHandler.switchAdminTab('dashboard');
      }
    }, 200);
    
    console.log('✅ 管理画面システム初期化完了');
    
  } catch (error) {
    console.error('❌ 管理画面システムの起動に失敗:', error);
    showFallbackError(error);
  }
}

/**
 * 管理画面固有の初期化処理
 */
function initializeAdminSpecific() {
  console.log('🔧 管理画面固有設定を開始');
  
  // 現在の日付を設定
  const today = new Date().toISOString().split('T')[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    if (!input.value) {
      input.value = today;
    }
  });
  
  // フォームの自動保存防止
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  });
  
  // モーダル外クリックで閉じる
  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && window.actionHandler) {
        window.actionHandler.closeModal();
      }
    });
  }
  
  // Escキーでモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal');
      if (modal && modal.style.display === 'block' && window.actionHandler) {
        window.actionHandler.closeModal();
      }
    }
  });
  
  console.log('✅ 管理画面固有設定完了');
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
        <button onclick="console.error('管理画面エラー:', '${error.message}')" style="
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

// エクスポート用の関数
export async function init(app) {
  await initializeAdmin(app);
}

/**
 * ページ離脱時の確認処理
 */
window.addEventListener('beforeunload', (e) => {
  if (window.actionHandler && window.actionHandler.uiManager && window.actionHandler.uiManager.hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = '未保存の変更があります。本当に離脱しますか？';
  }
});

/**
 * DOMContentLoaded イベントで初期化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeAdmin(window));
} else {
  initializeAdmin(window);
}

// デバッグ用: 開発環境でのみグローバルに公開
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.getSystemStatus = () => window.actionHandler?.getSystemStatus();
  window.getPerformanceInfo = () => window.actionHandler?.getPerformanceInfo();
} 