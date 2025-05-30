/**
 * UI管理サービス
 * 管理画面のUI操作、通知、フォーム状態管理を担当
 * @version 2.0.0
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { querySelector, show, hide, setText, getValue } from '../../../shared/utils/domUtils.js';
import { createSuccessMessage, createErrorMessage } from '../../../shared/utils/htmlUtils.js';
import { CONFIG } from '../../../shared/constants/config.js';

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
      this.showSuccessNotification('article-save', { title: data?.title });
    });
    
    EventBus.on('article:published', (data) => {
      this.showSuccessNotification('article-publish', { title: data?.title });
    });
    
    EventBus.on('instagram:saved', (data) => {
      this.showSuccessNotification('instagram-save');
    });
    
    EventBus.on('lessonStatus:updated', (data) => {
      this.showSuccessNotification('lesson-status-update', { date: data?.date });
    });
    
    EventBus.on('lessonStatus:saved', (data) => {
      this.showSuccessNotification('lesson-status-save', { date: data?.date });
    });
    
    EventBus.on('lessonStatus:preview', (data) => {
      this.showSuccessNotification('lesson-status-preview');
    });
    
    EventBus.on('lessonStatus:published', (data) => {
      this.showSuccessNotification('lesson-status-publish');
    });
    
    // エラーイベント
    EventBus.on('error:lessonStatus:save', (data) => {
      this.showErrorNotification('lesson-status-save', data);
    });
    
    EventBus.on('error:lessonStatus:load', (data) => {
      this.showErrorNotification('lesson-status-load', data);
    });
    
    EventBus.on('error:article:save', (data) => {
      this.showErrorNotification('article-save', data);
    });
    
    EventBus.on('error:network', (data) => {
      this.showErrorNotification('network-error', data);
    });
    
    // 情報イベント
    EventBus.on('info:autoSave', (data) => {
      this.showInfoNotification('auto-save', data);
    });
    
    EventBus.on('info:dataSync', (data) => {
      this.showInfoNotification('data-sync', data);
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
   * @param {Object} options - 追加オプション
   * @returns {string} 通知ID
   */
  showNotification(type, message, duration = this.defaultNotificationDuration, options = {}) {
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // デフォルトタイトルとアイコンの設定
    const defaults = {
      success: { title: '成功', icon: '✅' },
      error: { title: 'エラー', icon: '❌' },
      warning: { title: '警告', icon: '⚠️' },
      info: { title: '情報', icon: 'ℹ️' }
    };
    
    const config = defaults[type] || defaults.info;
    const title = options.title || config.title;
    const icon = options.icon || config.icon;
    
    // プログレスバーの幅を計算
    const progressDuration = duration > 0 ? duration : 0;
    
    const notificationHtml = `
      <div class="admin-notification ${type}" id="${notificationId}">
        <div class="notification-content">
          <div class="notification-icon">${icon}</div>
          <div class="notification-message-wrapper">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
          </div>
          <button class="notification-close" onclick="uiManagerService.removeNotification('${notificationId}')">×</button>
        </div>
        ${progressDuration > 0 ? `<div class="notification-progress" style="width: 100%; transition-duration: ${progressDuration}ms;"></div>` : ''}
      </div>
    `;
    
    // 通知を表示
    this.notificationContainer.insertAdjacentHTML('beforeend', notificationHtml);
    
    // アニメーション効果を適用
    const notificationElement = querySelector(`#${notificationId}`);
    if (notificationElement) {
      // 即座にshow効果を適用
      setTimeout(() => {
        notificationElement.classList.add('show', 'animating-in');
      }, 10);
      
      // プログレスバーのアニメーション開始
      if (progressDuration > 0) {
        const progressBar = notificationElement.querySelector('.notification-progress');
        if (progressBar) {
          setTimeout(() => {
            progressBar.style.width = '0%';
          }, 100);
        }
      }
      
      // 自動消去のタイマーを設定
      if (duration > 0) {
        setTimeout(() => {
          this.removeNotification(notificationId);
        }, duration);
      }
    }
    
    this.notifications.set(notificationId, {
      type,
      message,
      title,
      timestamp: new Date(),
      duration
    });
    
    EventBus.emit('ui:notificationShown', { id: notificationId, type, message, title });
    
    return notificationId;
  }

  /**
   * 通知を削除
   * @param {string} notificationId - 通知ID
   */
  removeNotification(notificationId) {
    const notification = querySelector(`#${notificationId}`);
    if (notification) {
      // 削除アニメーションを適用
      notification.classList.add('animating-out');
      notification.classList.remove('show', 'animating-in');
      
      // アニメーション完了後に要素を削除
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
        this.notifications.delete(notificationId);
        EventBus.emit('ui:notificationRemoved', { id: notificationId });
      }, 300);
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

  // === ログメソッド ===

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log('🎨 UIManagerService:', ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug?.enabled) {
      console.debug('🔍 UIManagerService:', ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn('⚠️ UIManagerService:', ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error('❌ UIManagerService:', ...args);
  }

  /**
   * 成功通知のヘルパーメソッド
   * @param {string} action - 実行されたアクション
   * @param {Object} details - 詳細情報
   */
  showSuccessNotification(action, details = {}) {
    let title = '成功';
    let message = '';
    let icon = '✅';
    
    switch (action) {
      case 'lesson-status-save':
        title = 'レッスン状況を保存';
        message = `${details.date}のレッスン状況を保存しました`;
        icon = '📅';
        break;
      case 'lesson-status-update':
        title = 'レッスン状況を更新';
        message = `${details.date}のレッスン状況を更新しました`;
        icon = '🔄';
        break;
      case 'lesson-status-preview':
        title = 'プレビューを表示';
        message = 'レッスン状況のプレビューを生成しました';
        icon = '👀';
        break;
      case 'lesson-status-publish':
        title = 'レッスン状況を公開';
        message = 'レッスン状況を公開しました';
        icon = '🚀';
        break;
      case 'article-save':
        title = '記事を保存';
        message = details.title ? `「${details.title}」を保存しました` : '記事を保存しました';
        icon = '📝';
        break;
      case 'article-publish':
        title = '記事を公開';
        message = details.title ? `「${details.title}」を公開しました` : '記事を公開しました';
        icon = '📢';
        break;
      case 'instagram-save':
        title = 'Instagram投稿を保存';
        message = 'Instagram投稿情報を保存しました';
        icon = '📸';
        break;
      case 'data-export':
        title = 'データエクスポート完了';
        if (details.filename && details.recordCount) {
          message = `${details.recordCount}件のデータを ${details.filename} としてエクスポートしました`;
        } else {
          message = details.filename ? `データを ${details.filename} としてエクスポートしました` : 'データをエクスポートしました';
        }
        icon = '📥';
        break;
      default:
        message = details.message || '操作が完了しました';
    }
    
    return this.showNotification('success', message, 4000, { title, icon });
  }

  /**
   * エラー通知のヘルパーメソッド
   * @param {string} action - 失敗したアクション
   * @param {Object} details - 詳細情報
   */
  showErrorNotification(action, details = {}) {
    let title = 'エラー';
    let message = '';
    let icon = '❌';
    
    switch (action) {
      case 'lesson-status-save':
        title = '保存に失敗';
        message = 'レッスン状況の保存に失敗しました';
        icon = '💾';
        break;
      case 'lesson-status-load':
        title = '読み込みに失敗';
        message = 'レッスン状況の読み込みに失敗しました';
        icon = '📂';
        break;
      case 'article-save':
        title = '記事保存に失敗';
        message = '記事の保存に失敗しました';
        icon = '📝';
        break;
      case 'network-error':
        title = 'ネットワークエラー';
        message = 'ネットワーク接続を確認してください';
        icon = '🌐';
        break;
      case 'data-export':
        title = 'エクスポートエラー';
        message = details.message || 'データのエクスポートに失敗しました';
        icon = '📥';
        break;
      default:
        message = details.message || '操作に失敗しました';
    }
    
    return this.showNotification('error', message, 6000, { title, icon });
  }

  /**
   * 情報通知のヘルパーメソッド
   * @param {string} action - アクション
   * @param {Object} details - 詳細情報
   */
  showInfoNotification(action, details = {}) {
    let title = '情報';
    let message = '';
    let icon = 'ℹ️';
    
    switch (action) {
      case 'auto-save':
        title = '自動保存';
        message = 'データを自動保存しました';
        icon = '💾';
        break;
      case 'data-sync':
        title = 'データ同期';
        message = 'データの同期が完了しました';
        icon = '🔄';
        break;
      default:
        message = details.message || '情報';
    }
    
    return this.showNotification('info', message, 3000, { title, icon });
  }
}

// シングルトンインスタンス
export const uiManagerService = new UIManagerService(); 