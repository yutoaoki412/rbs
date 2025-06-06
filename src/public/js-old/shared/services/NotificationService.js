/**
 * 通知サービス
 * トーストやアラート等の通知機能を提供
 * @version 1.0.0
 */

import { createElement, addClass } from '../utils/domUtils.js';

export default class NotificationService {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.createContainer();
  }

  /**
   * 通知コンテナを作成
   */
  createContainer() {
    this.container = createElement('div', {
      className: 'notification-container',
      style: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '10000',
        maxWidth: '400px'
      }
    });
    document.body.appendChild(this.container);
  }

  /**
   * 成功通知を表示
   * @param {string} message - メッセージ
   * @param {Object} options - オプション
   */
  showSuccess(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  /**
   * エラー通知を表示
   * @param {string} message - メッセージ
   * @param {Object} options - オプション
   */
  showError(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  /**
   * 警告通知を表示
   * @param {string} message - メッセージ
   * @param {Object} options - オプション
   */
  showWarning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  /**
   * 情報通知を表示
   * @param {string} message - メッセージ
   * @param {Object} options - オプション
   */
  showInfo(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  /**
   * 通知を表示
   * @param {string} message - メッセージ
   * @param {Object} options - オプション
   * @returns {string} 通知ID
   */
  show(message, options = {}) {
    const {
      type = 'info',
      duration = 5000,
      closable = true,
      icon = null
    } = options;

    const id = this.generateId();
    const notification = this.createNotification(id, message, type, icon, closable);
    
    this.notifications.set(id, notification);
    this.container.appendChild(notification.element);

    // アニメーション
    setTimeout(() => {
      addClass(notification.element, 'notification-show');
    }, 10);

    // 自動削除
    if (duration > 0) {
      setTimeout(() => {
        this.hide(id);
      }, duration);
    }

    return id;
  }

  /**
   * 通知を非表示
   * @param {string} id - 通知ID
   */
  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    addClass(notification.element, 'notification-hide');
    
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * 全通知を非表示
   */
  hideAll() {
    for (const id of this.notifications.keys()) {
      this.hide(id);
    }
  }

  /**
   * 通知要素を作成
   * @param {string} id - 通知ID
   * @param {string} message - メッセージ
   * @param {string} type - タイプ
   * @param {string} icon - アイコン
   * @param {boolean} closable - 閉じるボタン表示フラグ
   * @returns {Object}
   */
  createNotification(id, message, type, icon, closable) {
    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const displayIcon = icon || iconMap[type] || iconMap.info;

    const element = createElement('div', {
      className: `notification notification-${type}`,
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        marginBottom: '8px',
        borderRadius: '4px',
        backgroundColor: this.getBackgroundColor(type),
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease',
        opacity: '0'
      }
    });

    const iconElement = createElement('span', {
      className: 'notification-icon',
      text: displayIcon,
      style: {
        marginRight: '8px',
        fontSize: '16px'
      }
    });

    const messageElement = createElement('span', {
      className: 'notification-message',
      text: message,
      style: {
        flex: '1',
        fontSize: '14px'
      }
    });

    element.appendChild(iconElement);
    element.appendChild(messageElement);

    if (closable) {
      const closeButton = createElement('button', {
        className: 'notification-close',
        text: '×',
        style: {
          marginLeft: '8px',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      });

      closeButton.addEventListener('click', () => {
        this.hide(id);
      });

      element.appendChild(closeButton);
    }

    // CSSクラス追加のためのスタイル定義
    const style = document.createElement('style');
    style.textContent = `
      .notification-show {
        transform: translateX(0) !important;
        opacity: 1 !important;
      }
      .notification-hide {
        transform: translateX(100%) !important;
        opacity: 0 !important;
      }
    `;
    if (!document.querySelector('style[data-notification-styles]')) {
      style.setAttribute('data-notification-styles', 'true');
      document.head.appendChild(style);
    }

    return { element, type, message };
  }

  /**
   * タイプに応じた背景色を取得
   * @param {string} type - タイプ
   * @returns {string}
   */
  getBackgroundColor(type) {
    const colors = {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3'
    };
    return colors[type] || colors.info;
  }

  /**
   * ユニークIDを生成
   * @returns {string}
   */
  generateId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 破棄
   */
  destroy() {
    this.hideAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.notifications.clear();
  }
} 