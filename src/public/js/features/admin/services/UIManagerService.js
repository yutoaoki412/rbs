/**
 * UI管理サービス
 * 管理画面のUI操作、通知、フォーム状態管理を担当
 * @version 2.0.0
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { querySelector, show, hide, setText, getValue } from '../../../shared/utils/domUtils.js';
import { createSuccessMessage, createErrorMessage } from '../../../shared/utils/htmlUtils.js';

export class UIManagerService {
  constructor() {
    this.initialized = false;
    
    // UI状態管理
    this.formStates = new Map();
    this.notifications = new Map();
    this.activeModals = new Set();
    
    // 通知設定
    this.notificationContainer = null;
    this.defaultNotificationDuration = 5000;
    
    // フォーム変更追跡
    this.unsavedChanges = new Set();
    this.formChangeTimers = new Map();
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ UIManagerService: 既に初期化済み');
      return;
    }

    console.log('🖥️ UIManagerService: 初期化開始');
    
    this.setupNotificationContainer();
    this.setupEventListeners();
    this.setupFormChangeTracking();
    
    this.initialized = true;
    console.log('✅ UIManagerService: 初期化完了');
  }

  /**
   * 通知コンテナの設定
   * @private
   */
  setupNotificationContainer() {
    // 既存の通知コンテナを検索
    this.notificationContainer = querySelector('#notification-container, .notification-container');
    
    // 見つからない場合は作成
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
      this.notificationContainer.id = 'notification-container';
      this.notificationContainer.className = 'notification-container';
      this.notificationContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      `;
      document.body.appendChild(this.notificationContainer);
    }
  }

  /**
   * イベントリスナーの設定
   * @private
   */
  setupEventListeners() {
    // 管理機能のイベントを監視
    EventBus.on('article:saved', (data) => {
      this.showNotification('success', '記事を保存しました');
    });
    
    EventBus.on('article:published', (data) => {
      this.showNotification('success', '記事を公開しました');
    });
    
    EventBus.on('instagram:saved', (data) => {
      this.showNotification('success', 'Instagram投稿を保存しました');
    });
    
    EventBus.on('lessonStatus:updated', (data) => {
      this.showNotification('success', 'レッスン状況を更新しました');
    });
    
    console.log('🖥️ UIイベントリスナーを設定');
  }

  /**
   * フォーム変更追跡の設定
   * @private
   */
  setupFormChangeTracking() {
    // ページ離脱前の確認
    window.addEventListener('beforeunload', (event) => {
      if (this.hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '保存されていない変更があります。ページを離れますか？';
        return event.returnValue;
      }
    });
  }

  /**
   * 通知を表示
   * @param {string} type - 通知タイプ ('success', 'error', 'warning', 'info')
   * @param {string} message - メッセージ
   * @param {number} duration - 表示時間（ミリ秒、0で手動消去）
   * @returns {string} 通知ID
   */
  showNotification(type, message, duration = this.defaultNotificationDuration) {
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let notificationHtml = '';
    switch (type) {
      case 'success':
        notificationHtml = createSuccessMessage(message);
        break;
      case 'error':
        notificationHtml = createErrorMessage({ 
          title: 'エラー', 
          message: message 
        });
        break;
      case 'warning':
        notificationHtml = `
          <div class="notification notification-warning" id="${notificationId}">
            <div class="notification-content">
              <strong>⚠️ 警告</strong>
              <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
          </div>
        `;
        break;
      case 'info':
        notificationHtml = `
          <div class="notification notification-info" id="${notificationId}">
            <div class="notification-content">
              <strong>ℹ️ 情報</strong>
              <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
          </div>
        `;
        break;
      default:
        notificationHtml = `
          <div class="notification" id="${notificationId}">
            <div class="notification-content">
              <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
          </div>
        `;
    }
    
    // 通知を表示
    this.notificationContainer.insertAdjacentHTML('beforeend', notificationHtml);
    
    // 自動消去のタイマーを設定
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notificationId);
      }, duration);
    }
    
    this.notifications.set(notificationId, {
      type,
      message,
      timestamp: new Date(),
      duration
    });
    
    EventBus.emit('ui:notificationShown', { id: notificationId, type, message });
    
    return notificationId;
  }

  /**
   * 通知を削除
   * @param {string} notificationId - 通知ID
   */
  removeNotification(notificationId) {
    const notification = querySelector(`#${notificationId}`);
    if (notification) {
      notification.remove();
      this.notifications.delete(notificationId);
      EventBus.emit('ui:notificationRemoved', { id: notificationId });
    }
  }

  /**
   * 全ての通知をクリア
   */
  clearAllNotifications() {
    if (this.notificationContainer) {
      this.notificationContainer.innerHTML = '';
      this.notifications.clear();
      EventBus.emit('ui:allNotificationsCleared');
    }
  }

  /**
   * フォーム変更を処理
   * @param {string} formId - フォームID
   * @param {Object} changeData - 変更データ
   */
  handleFormChange(formId = 'default', changeData = {}) {
    // 未保存変更としてマーク
    this.unsavedChanges.add(formId);
    
    // 変更状態を記録
    this.formStates.set(formId, {
      hasChanges: true,
      lastChanged: new Date(),
      data: changeData
    });
    
    // 既存のタイマーをクリア
    if (this.formChangeTimers.has(formId)) {
      clearTimeout(this.formChangeTimers.get(formId));
    }
    
    // 変更インジケーターの表示
    this.updateFormChangeIndicator(formId, true);
    
    EventBus.emit('ui:formChanged', { formId, data: changeData });
  }

  /**
   * フォーム変更をクリア
   * @param {string} formId - フォームID
   */
  clearFormChanges(formId) {
    this.unsavedChanges.delete(formId);
    this.formStates.set(formId, {
      hasChanges: false,
      lastSaved: new Date()
    });
    
    // 変更インジケーターを非表示
    this.updateFormChangeIndicator(formId, false);
    
    EventBus.emit('ui:formChangeCleared', { formId });
  }

  /**
   * フォーム変更インジケーターの更新
   * @private
   * @param {string} formId - フォームID
   * @param {boolean} hasChanges - 変更があるか
   */
  updateFormChangeIndicator(formId, hasChanges) {
    const indicator = querySelector(`#${formId}-changes-indicator, .form-changes-indicator[data-form="${formId}"]`);
    if (indicator) {
      if (hasChanges) {
        show(indicator);
        setText(indicator, '● 未保存の変更があります');
      } else {
        hide(indicator);
      }
    }
  }

  /**
   * 未保存の変更があるかチェック
   * @param {string} formId - 特定のフォームID（省略可）
   * @returns {boolean}
   */
  hasUnsavedChanges(formId = null) {
    if (formId) {
      return this.unsavedChanges.has(formId);
    }
    return this.unsavedChanges.size > 0;
  }

  /**
   * モーダルを表示
   * @param {string} modalId - モーダルID
   * @param {Object} options - オプション
   */
  showModal(modalId, options = {}) {
    const modal = querySelector(`#${modalId}`);
    if (modal) {
      show(modal);
      this.activeModals.add(modalId);
      
      // ESCキーでの閉鎖
      if (options.closeOnEscape !== false) {
        const escHandler = (event) => {
          if (event.key === 'Escape') {
            this.hideModal(modalId);
            document.removeEventListener('keydown', escHandler);
          }
        };
        document.addEventListener('keydown', escHandler);
      }
      
      EventBus.emit('ui:modalShown', { modalId, options });
    }
  }

  /**
   * モーダルを非表示
   * @param {string} modalId - モーダルID
   */
  hideModal(modalId) {
    const modal = querySelector(`#${modalId}`);
    if (modal) {
      hide(modal);
      this.activeModals.delete(modalId);
      EventBus.emit('ui:modalHidden', { modalId });
    }
  }

  /**
   * 全てのモーダルを非表示
   */
  hideAllModals() {
    this.activeModals.forEach(modalId => {
      this.hideModal(modalId);
    });
  }

  /**
   * 確認ダイアログを表示
   * @param {string} message - メッセージ
   * @param {Object} options - オプション
   * @returns {Promise<boolean>}
   */
  async showConfirmDialog(message, options = {}) {
    const title = options.title || '確認';
    const confirmText = options.confirmText || 'OK';
    const cancelText = options.cancelText || 'キャンセル';
    
    return new Promise((resolve) => {
      const dialogId = `confirm_dialog_${Date.now()}`;
      const dialogHtml = `
        <div class="modal-overlay" id="${dialogId}">
          <div class="modal-dialog">
            <div class="modal-header">
              <h3>${title}</h3>
            </div>
            <div class="modal-body">
              <p>${message}</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" data-action="confirm">${confirmText}</button>
              <button class="btn btn-secondary" data-action="cancel">${cancelText}</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', dialogHtml);
      
      const dialog = querySelector(`#${dialogId}`);
      const handleClick = (event) => {
        const action = event.target.dataset.action;
        if (action) {
          dialog.remove();
          resolve(action === 'confirm');
        }
      };
      
      dialog.addEventListener('click', handleClick);
      
      // ESCキーでキャンセル
      const escHandler = (event) => {
        if (event.key === 'Escape') {
          dialog.remove();
          document.removeEventListener('keydown', escHandler);
          resolve(false);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  /**
   * 統計情報を更新
   * @param {Object} stats - 統計データ
   */
  updateStats(stats) {
    // 記事統計の更新
    if (stats.articles) {
      this.updateStatsElement('articles-total', stats.articles.total);
      this.updateStatsElement('articles-published', stats.articles.published);
      this.updateStatsElement('articles-drafts', stats.articles.drafts);
      this.updateStatsElement('articles-views', stats.articles.totalViews);
    }
    
    // Instagram統計の更新
    if (stats.instagram) {
      this.updateStatsElement('instagram-total', stats.instagram.total);
      this.updateStatsElement('instagram-likes', stats.instagram.totalLikes);
      this.updateStatsElement('instagram-avg-likes', stats.instagram.avgLikes);
    }
    
    // レッスン統計の更新
    if (stats.lessons) {
      this.updateStatsElement('lessons-total', stats.lessons.total);
    }
    
    EventBus.emit('ui:statsUpdated', stats);
  }

  /**
   * 統計要素を更新
   * @private
   * @param {string} elementId - 要素ID
   * @param {*} value - 値
   */
  updateStatsElement(elementId, value) {
    const element = querySelector(`#stats-${elementId}, .stats-${elementId}, [data-stat="${elementId}"]`);
    if (element) {
      setText(element, value?.toLocaleString() || '0');
    }
  }

  /**
   * データマネージャーイベントの設定
   * @param {Object} dataManager - データマネージャー（後方互換性）
   */
  setupDataManagerEvents(dataManager) {
    console.log('🖥️ DataManagerイベント設定（後方互換性）');
    // 新しいアーキテクチャではEventBusを使用するため、この実装は最小限
  }

  /**
   * UI状態の取得
   * @returns {Object}
   */
  getUIState() {
    return {
      unsavedChanges: Array.from(this.unsavedChanges),
      activeModals: Array.from(this.activeModals),
      notificationCount: this.notifications.size,
      formStates: Object.fromEntries(this.formStates)
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    // 通知をクリア
    this.clearAllNotifications();
    
    // モーダルを閉じる
    this.hideAllModals();
    
    // タイマーをクリア
    this.formChangeTimers.forEach(timer => clearTimeout(timer));
    this.formChangeTimers.clear();
    
    // 状態をリセット
    this.formStates.clear();
    this.notifications.clear();
    this.activeModals.clear();
    this.unsavedChanges.clear();
    
    this.initialized = false;
    
    console.log('🗑️ UIManagerService: 破棄完了');
  }
}

// シングルトンインスタンス
export const uiManagerService = new UIManagerService(); 