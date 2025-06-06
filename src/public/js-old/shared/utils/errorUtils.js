/**
 * エラーハンドリングユーティリティ
 * アプリケーション全体で使用する統一されたエラー表示・処理機能
 * @version 1.0.0
 */

import { log } from './logUtils.js';

/**
 * アプリケーションエラー表示
 * @param {string} message - エラーメッセージ
 * @param {boolean} isRecoverable - 復旧可能かどうか
 * @returns {HTMLElement} 作成されたエラー要素
 */
export function showApplicationError(message, isRecoverable = true) {
  // 既存のエラー要素を削除
  const existingError = document.querySelector('.app-error-container');
  if (existingError) {
    existingError.remove();
  }
  
  const errorContainer = document.createElement('div');
  errorContainer.className = 'app-error-container';
  
  errorContainer.innerHTML = `
    <div class="app-error-content">
      <h3 class="app-error-title">⚠️ アプリケーションエラー</h3>
      <p class="app-error-message">${message}</p>
      <div class="app-error-actions">
        ${isRecoverable ? `
          <button onclick="window.location.reload()" class="app-error-btn app-error-btn-primary">
            🔄 ページを再読み込み
          </button>
          <button onclick="this.closest('.app-error-container').remove()" class="app-error-btn app-error-btn-secondary">
            ✕ 閉じる
          </button>
        ` : `
          <button onclick="window.location.reload()" class="app-error-btn app-error-btn-primary">
            🔄 ページを再読み込み
          </button>
        `}
      </div>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
  
  // 自動削除（復旧可能なエラーのみ）
  if (isRecoverable) {
    setTimeout(() => {
      if (errorContainer.parentNode) {
        errorContainer.remove();
      }
    }, 10000);
  }
  
  return errorContainer;
}

/**
 * 重要エラー表示
 * @param {string} message - エラーメッセージ
 * @returns {HTMLElement} 作成されたエラー要素
 */
export function showCriticalError(message) {
  // 既存のエラー要素を削除
  const existingError = document.querySelector('.critical-error-container');
  if (existingError) {
    existingError.remove();
  }
  
  const errorContainer = document.createElement('div');
  errorContainer.className = 'critical-error-container';
  
  errorContainer.innerHTML = `
    <div class="critical-error-content">
      <h3 class="critical-error-title">🚨 重要なエラー</h3>
      <p class="critical-error-message">${message}</p>
      <div class="critical-error-actions">
        <button onclick="window.location.reload()" class="critical-error-btn critical-error-btn-primary">
          🔄 ページを再読み込み
        </button>
        <button onclick="window.location.href='/'" class="critical-error-btn critical-error-btn-secondary">
          🏠 トップページに戻る
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
  
  return errorContainer;
}

/**
 * 初期化エラー表示
 * @param {string} message - エラーメッセージ
 * @returns {HTMLElement} 作成されたエラー要素
 */
export function showInitializationError(message) {
  // 既存のエラー要素を削除
  const existingError = document.querySelector('.app-init-error-container');
  if (existingError) {
    existingError.remove();
  }
  
  const errorContainer = document.createElement('div');
  errorContainer.className = 'app-init-error-container';
  
  errorContainer.innerHTML = `
    <div class="app-init-error-content">
      <h3 class="app-init-error-title">⚠️ 初期化エラー</h3>
      <p class="app-init-error-text">${message}</p>
      <div class="app-init-error-actions">
        <button onclick="window.location.reload()" class="app-init-error-btn app-init-error-btn-primary">
          🔄 ページを再読み込み
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
  
  // 10秒後に自動で閉じる
  setTimeout(() => {
    if (errorContainer.parentNode) {
      errorContainer.remove();
    }
  }, 10000);
  
  return errorContainer;
}

/**
 * グローバルエラーハンドラーを設定
 */
export function setupGlobalErrorHandlers() {
  try {
    // 改善されたグローバルエラーハンドラー
    window.addEventListener('error', function(event) {
      try {
        // 外部スクリプト（Google関連など）のエラーを無視
        if (event.filename && (
          event.filename.includes('google') || 
          event.filename.includes('search_impl') ||
          event.filename.includes('common.js') ||
          event.filename.includes('gstatic') ||
          event.filename.includes('googleapi') ||
          event.filename.includes('maps.googleapis') ||
          event.filename.includes('chart') ||
          event.filename.includes('analytics') ||
          event.filename === '' // 外部スクリプトは空になることがある
        )) {
          // フォールバック: logが利用できない場合はconsole.debugを使用
          if (typeof log !== 'undefined' && log.debug) {
            log.debug('GlobalHandler', '外部スクリプトエラーを無視', event.filename || 'unknown');
          } else {
            console.debug('🔇 外部スクリプトエラーを無視:', event.filename || 'unknown');
          }
          return true; // エラーを処理済みとしてマーク
        }
        
        // RBSアプリケーション内のエラーのみログ出力
        if (event.filename && event.filename.includes('/js/')) {
          const errorInfo = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
          };
          
          if (typeof log !== 'undefined' && log.error) {
            log.error('GlobalHandler', 'RBSアプリケーションエラー', errorInfo);
          } else {
            console.error('❌ RBSアプリケーションエラー:', errorInfo);
          }
          
          if (event.error && event.error.message && event.error.message.includes('critical')) {
            showCriticalError('重要なエラーが発生しました: ' + event.error.message);
          }
        }
      } catch (handlerError) {
        // エラーハンドラー自体でのエラーをフォールバック処理
        console.error('🚨 エラーハンドラー内でエラー:', handlerError);
      }
    });

    // 改善された未捕捉Promise拒否ハンドラー
    window.addEventListener('unhandledrejection', function(event) {
      try {
        // RBSアプリケーション関連のPromise拒否のみ処理
        if (event.reason && typeof event.reason === 'object' && event.reason.stack) {
          // スタックトレースでRBSコードかどうか判定
          if (event.reason.stack.includes('/js/')) {
            const rejectInfo = {
              reason: event.reason,
              stack: event.reason.stack
            };
            
            if (typeof log !== 'undefined' && log.error) {
              log.error('GlobalHandler', 'RBS未捕捉Promise拒否', rejectInfo);
            } else {
              console.error('❌ RBS未捕捉Promise拒否:', rejectInfo);
            }
            
            if (typeof event.reason === 'string' && event.reason.includes('critical')) {
              showCriticalError('重要なPromiseエラーが発生しました: ' + event.reason);
            }
          }
        } else if (typeof event.reason === 'string' && event.reason.includes('rbs')) {
          if (typeof log !== 'undefined' && log.error) {
            log.error('GlobalHandler', 'RBS未捕捉Promise拒否', event.reason);
          } else {
            console.error('❌ RBS未捕捉Promise拒否:', event.reason);
          }
        } else {
          // 外部ライブラリのPromise拒否は無視
          if (typeof log !== 'undefined' && log.debug) {
            log.debug('GlobalHandler', '外部Promise拒否を無視', event.reason);
          } else {
            console.debug('🔇 外部Promise拒否を無視:', event.reason);
          }
        }
      } catch (handlerError) {
        // Promise拒否ハンドラー自体でのエラーをフォールバック処理
        console.error('🚨 Promise拒否ハンドラー内でエラー:', handlerError);
      }
    });
    
    log.info('ErrorUtils', 'グローバルエラーハンドラーを設定しました');
    
  } catch (setupError) {
    console.error('🚨 エラーハンドラー設定失敗:', setupError);
  }
}

/**
 * エラーを安全にレポート
 * @param {Error} error - エラーオブジェクト
 * @param {string} context - エラーコンテキスト
 */
export function reportError(error, context = 'Unknown') {
  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    if (typeof log !== 'undefined' && log.error) {
      log.error('ErrorReport', `${context}でエラー発生`, errorData);
    } else {
      console.error(`❌ ${context}でエラー発生:`, errorData);
    }
  } catch (reportError) {
    console.error('🚨 エラーレポート失敗:', reportError);
  }
}

export default {
  showApplicationError,
  showCriticalError,
  showInitializationError,
  setupGlobalErrorHandlers,
  reportError
}; 