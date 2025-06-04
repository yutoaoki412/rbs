/**
 * UI管理サービス
 * 管理画面のUI操作、フォーム状態管理を担当
 * @version 3.0.0 - 新通知システム統合版
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { querySelector, show, hide, setText, getValue } from '../../../shared/utils/domUtils.js';
import { createSuccessHtml, createErrorHtml, createWarningHtml, createInfoHtml } from '../../../shared/utils/htmlUtils.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class UIManagerService {
  constructor() {
    this.initialized = false;
    
    // UI状態管理
    this.formStates = new Map();
    this.activeModals = new Set();
    
    // フォーム変更追跡
    this.unsavedChanges = new Set();
    this.formChangeTimers = new Map();
    
    // 通知制御フラグ - ユーザーアクション時のみ通知を表示
    this.enableAutoNotifications = false; // 自動通知を無効化
    this.allowedNotificationActions = new Set([
      'article-save',
      'article-publish', 
      'lesson-status-save',
      'lesson-status-update',
      'lesson-status-publish',
      'instagram-save'
    ]); // 許可されるアクション
    
    // 新通知システムの参照
    this.notificationService = null;
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) return;
    
    try {
      // 新通知システムの参照を取得
      this.notificationService = window.adminNotificationService || null;
      
      this.setupEventListeners();
      this.setupFormChangeTracking();
      
      this.initialized = true;
      console.log('🖥️ UIManagerService初期化完了');
      
    } catch (error) {
      console.error('❌ UIManagerService初期化エラー:', error);
    }
  }

  /**
   * イベントリスナーの設定
   * @private
   */
  setupEventListeners() {
    // ボタンアクション時のみ通知を表示するイベントを監視
    EventBus.on('button:article:saved', (data) => {
      this.showSuccessNotification('article-save', { title: data?.title });
    });
    
    EventBus.on('button:article:published', (data) => {
      this.showSuccessNotification('article-publish', { title: data?.title });
    });
    
    EventBus.on('button:instagram:saved', (data) => {
      this.showSuccessNotification('instagram-save');
    });
    
    EventBus.on('button:lessonStatus:updated', (data) => {
      this.showSuccessNotification('lesson-status-update', { date: data?.date });
    });
    
    EventBus.on('button:lessonStatus:saved', (data) => {
      this.showSuccessNotification('lesson-status-save', { date: data?.date });
    });
    
    EventBus.on('button:lessonStatus:published', (data) => {
      this.showSuccessNotification('lesson-status-publish');
    });
    
    // 重要なエラーのみ表示（ネットワークエラーなど）
    EventBus.on('error:network', (data) => {
      this.showErrorNotification('network-error', data);
    });
    
    // 自動保存や同期の通知は無効化（ログのみ）
    EventBus.on('article:saved', (data) => {
      if (this.enableAutoNotifications) {
        this.showSuccessNotification('article-save', { title: data?.title });
      } else {
        this.log('記事が保存されました:', data?.title);
      }
    });
    
    EventBus.on('lessonStatus:updated', (data) => {
      if (this.enableAutoNotifications) {
        this.showSuccessNotification('lesson-status-update', { date: data?.date });
      } else {
        this.log('レッスン状況が更新されました:', data?.date);
      }
    });
    
    EventBus.on('info:autoSave', (data) => {
      // 自動保存の通知は無効化（ログのみ）
      this.log('自動保存が実行されました');
    });
    
    EventBus.on('info:dataSync', (data) => {
      // データ同期の通知は無効化（ログのみ）
      this.log('データが同期されました');
    });
    
    console.log('🖥️ UIイベントリスナーを設定（通知制限モード）');
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
   * 通知を表示（新システム統合版）
   * @param {string} type - 通知タイプ ('success', 'error', 'warning', 'info')
   * @param {string} message - メッセージ
   * @param {Object} options - 追加オプション
   * @returns {string} 通知ID
   */
  showNotification(type, message, options = {}) {
    // 新通知システムが利用可能な場合
    if (this.notificationService && window.adminNotify) {
      return window.adminNotify({
        type: type,
        title: options.title || this.getDefaultTitle(type),
        message: message,
        duration: options.duration || 5000,
        actions: options.actions || [],
        persistent: options.persistent || false
      });
    }
    
    // フォールバック: コンソールログ
    console.log(`[${type.toUpperCase()}] ${message}`);
    return null;
  }

  /**
   * 通知の削除
   * @param {string} notificationId - 通知ID
   */
  removeNotification(notificationId) {
    if (this.notificationService && notificationId) {
      this.notificationService.removeNotification(notificationId);
    }
  }

  /**
   * フォーム変更処理
   */
  handleFormChange(formId = 'default', changeData = {}) {
    this.unsavedChanges.add(formId);
    
    // 変更のタイマーをクリア
    if (this.formChangeTimers.has(formId)) {
      clearTimeout(this.formChangeTimers.get(formId));
    }
    
    // 変更インジケーターの更新
    this.updateFormChangeIndicator(formId, true);
    
    const timer = setTimeout(() => {
      this.log(`フォーム変更 [${formId}]:`, changeData);
    }, 500);
    
    this.formChangeTimers.set(formId, timer);
  }

  /**
   * フォーム変更のクリア
   */
  clearFormChanges(formId) {
    this.unsavedChanges.delete(formId);
    
    if (this.formChangeTimers.has(formId)) {
      clearTimeout(this.formChangeTimers.get(formId));
      this.formChangeTimers.delete(formId);
    }
    
    this.updateFormChangeIndicator(formId, false);
    this.log(`フォーム変更がクリアされました [${formId}]`);
  }

  /**
   * フォーム変更インジケーターの更新
   */
  updateFormChangeIndicator(formId, hasChanges) {
    const indicator = querySelector(`.form-change-indicator[data-form="${formId}"]`);
    if (indicator) {
      if (hasChanges) {
        indicator.style.display = 'inline';
        indicator.textContent = '●'; // 変更あり
      } else {
        indicator.style.display = 'none';
      }
    }
  }

  /**
   * 未保存の変更があるかチェック
   */
  hasUnsavedChanges(formId = null) {
    if (formId) {
      return this.unsavedChanges.has(formId);
    }
    return this.unsavedChanges.size > 0;
  }

  /**
   * モーダル表示（新システム統合版）
   */
  showModal(modalId, options = {}) {
    if (window.adminModal) {
      return window.adminModal({
        title: options.title || 'モーダル',
        content: options.content || '',
        size: options.size || 'medium',
        actions: options.actions || [],
        onShow: options.onShow,
        onHide: options.onHide
      });
    }
    
    // フォールバック: レガシーモーダル処理
    this.activeModals.add(modalId);
    show(modalId);
  }

  /**
   * モーダル非表示
   */
  hideModal(modalId) {
    if (this.notificationService) {
      this.notificationService.closeTopModal();
    } else {
      // フォールバック処理
      this.activeModals.delete(modalId);
      hide(modalId);
    }
  }

  /**
   * 確認ダイアログ表示
   */
  async showConfirmDialog(message, options = {}) {
    if (window.adminModal) {
      return new Promise((resolve) => {
        window.adminModal({
          title: options.title || '確認',
          content: `<p>${message}</p>`,
          size: 'small',
          actions: [
            { id: 'confirm', label: options.confirmText || 'OK', type: 'btn-primary' },
            { id: 'cancel', label: options.cancelText || 'キャンセル', type: 'btn-outline' }
          ]
        });
        
        // モーダルアクションを監視
        const handleAction = (event) => {
          const { actionId } = event.detail;
          if (actionId === 'confirm') {
            resolve(true);
          } else if (actionId === 'cancel') {
            resolve(false);
          }
          window.removeEventListener('admin:modal:action', handleAction);
        };
        
        window.addEventListener('admin:modal:action', handleAction);
      });
    }
    
    // フォールバック: ブラウザのconfirm
    return confirm(message);
  }

  /**
   * 統計更新
   */
  updateStats(stats) {
    if (typeof stats !== 'object' || stats === null) {
      console.warn('統計データが無効です:', stats);
      return;
    }

    Object.entries(stats).forEach(([key, value]) => {
      this.updateStatsElement(key, value);
    });

    this.log('統計が更新されました:', stats);
  }

  /**
   * 統計要素の更新
   */
  updateStatsElement(elementId, value) {
    const element = querySelector(`#${elementId}, [data-stat="${elementId}"]`);
    if (element) {
      setText(element, value);
    }
  }

  /**
   * UI状態の取得
   */
  getUIState() {
    return {
      unsavedChanges: Array.from(this.unsavedChanges),
      activeModals: Array.from(this.activeModals),
      notificationCount: this.notificationService?.notifications.size || 0,
      enableAutoNotifications: this.enableAutoNotifications
    };
  }

  /**
   * リソースのクリーンアップ
   */
  destroy() {
    // タイマーのクリア
    this.formChangeTimers.forEach(timer => clearTimeout(timer));
    this.formChangeTimers.clear();
    
    // 状態のクリア
    this.unsavedChanges.clear();
    this.activeModals.clear();
    
    this.initialized = false;
    console.log('🖥️ UIManagerService破棄完了');
  }

  // =============================================================================
  // ログ関連メソッド（新システム統合）
  // =============================================================================

  /**
   * ログ出力（新システム統合版）
   */
  log(...args) {
    if (window.adminLog) {
      window.adminLog(args.join(' '), 'info', 'ui');
    } else {
      console.log('🖥️ [UI]', ...args);
    }
  }

  /**
   * デバッグログ
   */
  debug(...args) {
    if (window.adminLog) {
      window.adminLog(args.join(' '), 'debug', 'ui');
    } else {
      console.debug('🖥️ [UI Debug]', ...args);
    }
  }

  /**
   * 警告ログ
   */
  warn(...args) {
    if (window.adminLog) {
      window.adminLog(args.join(' '), 'warning', 'ui');
    } else {
      console.warn('🖥️ [UI Warning]', ...args);
    }
  }

  /**
   * エラーログ
   */
  error(...args) {
    if (window.adminLog) {
      window.adminLog(args.join(' '), 'error', 'ui');
    } else {
      console.error('🖥️ [UI Error]', ...args);
    }
  }

  // =============================================================================
  // 通知メソッド（新システム統合版）
  // =============================================================================

  /**
   * 成功通知の表示
   */
  showSuccessNotification(action, details = {}) {
    const messages = {
      'article-save': `記事「${details.title || '無題'}」を保存しました`,
      'article-publish': `記事「${details.title || '無題'}」を公開しました`,
      'lesson-status-save': `${details.date || ''}のレッスン状況を保存しました`,
      'lesson-status-update': `${details.date || ''}のレッスン状況を更新しました`,
      'lesson-status-publish': 'レッスン状況を公開しました',
      'instagram-save': 'Instagram設定を保存しました'
    };

    const message = messages[action] || '操作が完了しました';
    
    this.showNotification('success', message, {
      title: '保存完了',
      duration: 3000
    });
  }

  /**
   * エラー通知の表示
   */
  showErrorNotification(action, details = {}) {
    const messages = {
      'network-error': 'ネットワークエラーが発生しました。接続を確認してください。',
      'validation-error': '入力内容に問題があります。確認してください。',
      'server-error': 'サーバーエラーが発生しました。しばらく後に再試行してください。',
      'permission-error': 'この操作を実行する権限がありません。',
      'timeout-error': 'リクエストがタイムアウトしました。再試行してください。'
    };

    const message = messages[action] || details.message || '操作中にエラーが発生しました';
    
    this.showNotification('error', message, {
      title: 'エラー',
      duration: 8000,
      persistent: action === 'network-error'
    });
  }

  /**
   * 情報通知の表示
   */
  showInfoNotification(action, details = {}) {
    const messages = {
      'auto-save': '自動保存されました',
      'data-sync': 'データを同期しました',
      'session-refresh': 'セッションを更新しました'
    };

    const message = messages[action] || details.message || '情報をお知らせします';
    
    // 情報通知は控えめに表示
    this.log(`[情報] ${message}`);
  }

  /**
   * 通知モードの設定
   */
  setNotificationMode(enableAuto = false) {
    this.enableAutoNotifications = enableAuto;
    this.log(`通知モードを変更しました: ${enableAuto ? '自動通知有効' : '手動通知のみ'}`);
  }

  /**
   * 通知モードの取得
   */
  getNotificationMode() {
    return {
      enableAutoNotifications: this.enableAutoNotifications,
      allowedActions: Array.from(this.allowedNotificationActions)
    };
  }

  /**
   * デフォルトタイトルの取得
   */
  getDefaultTitle(type) {
    const titles = {
      success: '成功',
      error: 'エラー',
      warning: '警告',
      info: '情報'
    };
    return titles[type] || '通知';
  }
}

// シングルトンインスタンス
export const uiManagerService = new UIManagerService(); 