/**
 * 統一通知サービス - 全アプリケーション共通の通知システム
 * 重複を排除し、一元化された通知機能を提供
 * @version 1.0.0
 */

import { FunctionUtils } from '../utils/FunctionUtils.js';

export class UnifiedNotificationService {
  constructor() {
    this.notifications = new Map();
    this.recentNotifications = new Map();
    this.container = null;
    this.settings = {
      defaultDuration: 3000,
      maxNotifications: 5,
      position: 'top-right',
      enableSound: false,
      enableAnimation: true
    };
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.createContainer();
    this.setupStyles();
  }

  /**
   * 通知コンテナを作成
   */
  createContainer() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'unified-notifications-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.container);
  }

  /**
   * スタイルを設定
   */
  setupStyles() {
    if (document.querySelector('#unified-notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'unified-notification-styles';
    style.textContent = `
      .unified-notification {
        background: var(--admin-white, #ffffff);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        margin-bottom: 12px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        overflow: hidden;
        position: relative;
        border: 1px solid rgba(0, 0, 0, 0.1);
        max-width: 100%;
      }

      .unified-notification.show {
        opacity: 1;
        transform: translateX(0);
      }

      .unified-notification.removing {
        opacity: 0;
        transform: translateX(100%) scale(0.9);
        margin-bottom: 0;
        max-height: 0;
        padding: 0;
      }

      .unified-notification-content {
        padding: 16px 20px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        position: relative;
      }

      .unified-notification-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        margin-top: 2px;
      }

      .unified-notification-text {
        flex: 1;
        min-width: 0;
      }

      .unified-notification-title {
        font-weight: 600;
        font-size: 14px;
        line-height: 1.4;
        margin: 0 0 4px 0;
        color: var(--admin-gray-900, #0f172a);
      }

      .unified-notification-message {
        font-size: 13px;
        line-height: 1.4;
        margin: 0;
        color: var(--admin-gray-600, #64748b);
        word-wrap: break-word;
      }

      .unified-notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: var(--admin-gray-400, #94a3b8);
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .unified-notification-close:hover {
        background: var(--admin-gray-100, #f1f5f9);
        color: var(--admin-gray-600, #64748b);
      }

      .unified-notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, currentColor);
        border-radius: 0 0 12px 12px;
        animation: notificationProgress var(--duration, 3000ms) linear forwards;
      }

      /* タイプ別スタイル */
      .unified-notification.success {
        border-left: 4px solid var(--admin-success, #28a745);
      }
      .unified-notification.success .unified-notification-icon {
        background: var(--admin-success, #28a745);
      }
      .unified-notification.success .unified-notification-progress {
        color: var(--admin-success, #28a745);
      }

      .unified-notification.error {
        border-left: 4px solid var(--admin-error, #dc3545);
      }
      .unified-notification.error .unified-notification-icon {
        background: var(--admin-error, #dc3545);
      }
      .unified-notification.error .unified-notification-progress {
        color: var(--admin-error, #dc3545);
      }

      .unified-notification.warning {
        border-left: 4px solid var(--admin-warning, #ffc107);
      }
      .unified-notification.warning .unified-notification-icon {
        background: var(--admin-warning, #ffc107);
        color: var(--admin-gray-900, #0f172a);
      }
      .unified-notification.warning .unified-notification-progress {
        color: var(--admin-warning, #ffc107);
      }

      .unified-notification.info {
        border-left: 4px solid var(--admin-primary, #4a90e2);
      }
      .unified-notification.info .unified-notification-icon {
        background: var(--admin-primary, #4a90e2);
      }
      .unified-notification.info .unified-notification-progress {
        color: var(--admin-primary, #4a90e2);
      }

      @keyframes notificationProgress {
        from { width: 100%; }
        to { width: 0%; }
      }

      /* レスポンシブ対応 */
      @media (max-width: 640px) {
        .unified-notifications-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
        
        .unified-notification {
          margin-bottom: 8px;
        }
        
        .unified-notification-content {
          padding: 14px 16px;
        }
      }

      /* アクセシビリティ対応 */
      @media (prefers-reduced-motion: reduce) {
        .unified-notification {
          transition: opacity 0.2s ease;
        }
        
        .unified-notification-progress {
          animation: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 通知を表示
   * @param {Object} options - 通知オプション
   * @returns {string} 通知ID
   */
  show(options = {}) {
    const id = this.generateId();
    const notification = {
      id,
      type: options.type || 'info',
      title: options.title || this.getDefaultTitle(options.type || 'info'),
      message: options.message || '',
      duration: options.duration !== undefined ? options.duration : this.settings.defaultDuration,
      actions: options.actions || [],
      persistent: options.persistent || false,
      timestamp: new Date()
    };

    // 重複通知の防止
    if (this.isDuplicate(notification)) {
      console.debug('重複通知をスキップ:', notification.message);
      return id;
    }

    // 通知制限チェック
    this.enforceLimit();

    // 通知要素の作成
    const element = this.createElement(notification);
    this.notifications.set(id, { ...notification, element });

    // コンテナに追加
    this.container.appendChild(element);

    // アニメーション
    requestAnimationFrame(() => {
      element.classList.add('show');
    });

    // 自動削除タイマー
    if (!notification.persistent && notification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, notification.duration);
    }

    // 重複チェック用の履歴記録
    this.recordForDuplicateCheck(notification);

    return id;
  }

  /**
   * 簡易通知メソッド
   */
  success(message, title = '成功', duration) {
    return this.show({ type: 'success', message, title, duration });
  }

  error(message, title = 'エラー', duration) {
    return this.show({ type: 'error', message, title, duration });
  }

  warning(message, title = '警告', duration) {
    return this.show({ type: 'warning', message, title, duration });
  }

  info(message, title = '情報', duration) {
    return this.show({ type: 'info', message, title, duration });
  }

  /**
   * 通知を削除
   * @param {string} id - 通知ID
   */
  remove(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    const { element } = notification;
    element.classList.add('removing');

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * 全通知をクリア
   */
  clear() {
    this.notifications.forEach((_, id) => this.remove(id));
  }

  /**
   * 通知要素を作成
   * @param {Object} notification - 通知データ
   * @returns {HTMLElement} 通知要素
   */
  createElement(notification) {
    const element = document.createElement('div');
    element.className = `unified-notification ${notification.type}`;
    
    if (notification.duration > 0) {
      element.style.setProperty('--duration', `${notification.duration}ms`);
    }

    element.innerHTML = `
      <div class="unified-notification-content">
        <div class="unified-notification-icon">
          <i class="${this.getIcon(notification.type)}"></i>
        </div>
        <div class="unified-notification-text">
          <div class="unified-notification-title">${this.escapeHtml(notification.title)}</div>
          <div class="unified-notification-message">${this.escapeHtml(notification.message)}</div>
        </div>
        <button class="unified-notification-close" aria-label="閉じる">
          <i class="fas fa-times"></i>
        </button>
      </div>
      ${notification.duration > 0 && !notification.persistent ? 
        '<div class="unified-notification-progress"></div>' : ''}
    `;

    // 閉じるボタンのイベント
    const closeBtn = element.querySelector('.unified-notification-close');
    closeBtn.addEventListener('click', () => {
      this.remove(notification.id);
    });

    return element;
  }

  /**
   * 重複通知チェック
   */
  isDuplicate(notification) {
    const key = `${notification.type}:${notification.message}`;
    const now = Date.now();
    const lastTime = this.recentNotifications.get(key);
    
    return lastTime && (now - lastTime) < 3000;
  }

  /**
   * 重複チェック用の履歴記録
   */
  recordForDuplicateCheck(notification) {
    const key = `${notification.type}:${notification.message}`;
    this.recentNotifications.set(key, Date.now());
    
    // 5分後にクリーンアップ
    setTimeout(() => {
      this.recentNotifications.delete(key);
    }, 300000);
  }

  /**
   * 通知制限チェック
   */
  enforceLimit() {
    const current = this.notifications.size;
    if (current >= this.settings.maxNotifications) {
      const oldest = Array.from(this.notifications.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest) {
        this.remove(oldest.id);
      }
    }
  }

  /**
   * ユーティリティメソッド
   */
  generateId() {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getIcon(type) {
    const icons = {
      success: 'fas fa-check',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  getDefaultTitle(type) {
    const titles = {
      success: '成功',
      error: 'エラー',
      warning: '警告',
      info: '情報'
    };
    return titles[type] || '通知';
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 設定の更新
   * @param {Object} newSettings - 新しい設定
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * 破棄
   */
  destroy() {
    this.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.notifications.clear();
    this.recentNotifications.clear();
  }
}

// シングルトンインスタンス
let unifiedNotificationInstance = null;

/**
 * 統一通知サービスのインスタンスを取得
 * @returns {UnifiedNotificationService}
 */
export function getUnifiedNotificationService() {
  if (!unifiedNotificationInstance) {
    unifiedNotificationInstance = new UnifiedNotificationService();
  }
  return unifiedNotificationInstance;
}

/**
 * 簡易通知関数
 */
export function notify(message, type = 'info', options = {}) {
  const service = getUnifiedNotificationService();
  return service.show({ message, type, ...options });
}

export function notifySuccess(message, options = {}) {
  return notify(message, 'success', options);
}

export function notifyError(message, options = {}) {
  return notify(message, 'error', options);
}

export function notifyWarning(message, options = {}) {
  return notify(message, 'warning', options);
}

export function notifyInfo(message, options = {}) {
  return notify(message, 'info', options);
} 