/**
 * RBS陸上教室 メインユーティリティ
 * 統一された通知システムとエラー表示関数を提供
 * @version 3.0.0 - 統一通知システム・重複関数統合版
 */

import { notifySuccess, notifyError, notifyWarning, notifyInfo } from '../services/UnifiedNotificationService.js';
import { createErrorHtml, createSuccessHtml, createWarningHtml, createInfoHtml } from './htmlUtils.js';

// 通知履歴（重複防止用）
const notificationHistory = new Map();

/**
 * 統一通知表示関数（重複防止機能付き）
 * @param {string} message - メッセージ
 * @param {string} type - 通知タイプ ('success', 'error', 'warning', 'info')
 * @param {Object} options - オプション
 * @returns {string|null} 通知ID
 */
export function showNotification(message, type = 'info', options = {}) {
  // 重複チェック
  const notificationKey = `${type}:${message}`;
  const now = Date.now();
  
  if (notificationHistory.has(notificationKey)) {
    const lastTime = notificationHistory.get(notificationKey);
    if (now - lastTime < 3000) { // 3秒以内の重複を防止
      console.debug('重複通知をスキップ:', message);
      return null;
    }
  }
  
  // 通知履歴に記録
  notificationHistory.set(notificationKey, now);
  
  let notificationId = null;
  
  try {
    // 統一通知サービスを使用
    switch (type) {
      case 'success':
        notificationId = notifySuccess(message, options);
        break;
      case 'error':
        notificationId = notifyError(message, options);
        break;
      case 'warning':
        notificationId = notifyWarning(message, options);
        break;
      case 'info':
      default:
        notificationId = notifyInfo(message, options);
        break;
    }
  } catch (error) {
    // フォールバック: コンソールログ
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  
  // 履歴クリーンアップ（5分後）
  setTimeout(() => {
    notificationHistory.delete(notificationKey);
  }, 300000);
  
  return notificationId;
}

/**
 * 成功通知を表示
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @returns {string|null} 通知ID
 */
export function showSuccess(message, options = {}) {
  return showNotification(message, 'success', options);
}

/**
 * エラー通知を表示
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @returns {string|null} 通知ID
 */
export function showError(message, options = {}) {
  return showNotification(message, 'error', options);
}

/**
 * 警告通知を表示
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @returns {string|null} 通知ID
 */
export function showWarning(message, options = {}) {
  return showNotification(message, 'warning', options);
}

/**
 * 情報通知を表示
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @returns {string|null} 通知ID
 */
export function showInfo(message, options = {}) {
  return showNotification(message, 'info', options);
}

/**
 * フィードバック表示（後方互換性用）
 * @param {string} message - メッセージ
 * @param {string} type - タイプ
 * @param {number} duration - 表示時間
 * @returns {string|null} 通知ID
 */
export function showFeedback(message, type = 'info', duration = 5000) {
  return showNotification(message, type, { duration });
}

/**
 * メッセージ表示（HTML要素に挿入）
 * @param {string} message - メッセージ
 * @param {string} type - タイプ
 * @param {HTMLElement} container - コンテナ要素
 * @param {number} duration - 表示時間（0で自動削除なし）
 */
export function showMessage(message, type = 'info', container, duration = 5000) {
  if (!container) return;

  let html = '';
  switch (type) {
    case 'success':
      html = createSuccessHtml(message);
      break;
    case 'error':
      html = createErrorHtml('エラー', message, '❌');
      break;
    case 'warning':
      html = createWarningHtml(message);
      break;
    case 'info':
    default:
      html = createInfoHtml(message);
      break;
  }

  container.innerHTML = html;

  if (duration > 0) {
    setTimeout(() => {
      container.innerHTML = '';
    }, duration);
  }
}

/**
 * エラーメッセージをクリア
 * @param {HTMLElement} container - コンテナ要素
 */
export function clearMessage(container) {
  if (container) {
    container.innerHTML = '';
  }
}

/**
 * グローバル関数として登録
 */
export function registerGlobalNotificationFunctions() {
  if (typeof window !== 'undefined') {
    // 統一通知関数をグローバルに登録
    window.showNotification = showNotification;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showWarning = showWarning;
    window.showInfo = showInfo;
    window.showFeedback = showFeedback;
    window.showMessage = showMessage;
    window.clearMessage = clearMessage;
    
    console.log('✅ 統一通知システムをグローバルに登録しました');
  }
}

// 自動登録（ブラウザ環境の場合）
if (typeof window !== 'undefined') {
  registerGlobalNotificationFunctions();
}

export default {
  showNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showFeedback,
  showMessage,
  clearMessage,
  registerGlobalNotificationFunctions
}; 