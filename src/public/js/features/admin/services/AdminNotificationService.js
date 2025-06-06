/**
 * 管理画面通知サービス - 統一通知システムの拡張版
 * UnifiedNotificationServiceを継承し、管理画面専用機能を追加
 * @version 2.0.0 - 重複削除・統一化リファクタリング版
 */

import { UnifiedNotificationService, getUnifiedNotificationService } from '../../../shared/services/UnifiedNotificationService.js';
import { Component } from '../../../lib/base/Component.js';

export class AdminNotificationService extends Component {
  constructor() {
    super({ autoInit: false });
    this.componentName = 'AdminNotificationService';
    
    // 統一通知サービスのインスタンスを使用
    this.unifiedNotificationService = getUnifiedNotificationService();
    
    // 管理画面専用設定
    this.adminSettings = {
      enableActionButtons: true,
      enableBulkDismiss: true,
      enableHistory: true,
      maxHistoryItems: 100,
      enableSystemNotifications: true
    };
    
    // 管理画面専用通知履歴
    this.notificationHistory = [];
    this.systemNotifications = new Map();
    
    this.initialized = false;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // 統一通知サービスが初期化されていることを確認
      if (!this.unifiedNotificationService.initialized) {
        await this.unifiedNotificationService.init();
      }
      
      // 管理画面専用の設定を適用
      this.setupAdminSpecificFeatures();
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      this.initialized = true;
      this.log('✅ AdminNotificationService 初期化完了');
      
    } catch (error) {
      this.error('❌ AdminNotificationService 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 管理画面専用機能のセットアップ
   */
  setupAdminSpecificFeatures() {
    // 管理画面専用の通知スタイルを追加
    this.addAdminStyles();
    
    // バルク操作ボタンの追加
    if (this.adminSettings.enableBulkDismiss) {
      this.addBulkDismissButton();
    }
  }

  /**
   * 管理画面専用スタイルの追加
   */
  addAdminStyles() {
    if (document.querySelector('#admin-notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'admin-notification-styles';
    style.textContent = `
      /* 管理画面専用通知スタイル */
      .admin-notification {
        background: linear-gradient(135deg, var(--admin-white) 0%, var(--admin-gray-50) 100%);
        border-left: 4px solid var(--admin-primary);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      }
      
      .admin-notification.system {
        border-left-color: var(--admin-warning);
        background: linear-gradient(135deg, #fff3cd 0%, #fef7e0 100%);
      }
      
      .admin-bulk-dismiss {
        position: absolute;
        top: 10px;
        right: 10px;
        background: var(--admin-gray-700);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.3s ease;
      }
      
      .unified-notifications-container:hover .admin-bulk-dismiss {
        opacity: 1;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * バルク削除ボタンの追加
   */
  addBulkDismissButton() {
    const container = this.unifiedNotificationService.container;
    if (!container || container.querySelector('.admin-bulk-dismiss')) return;
    
    const bulkButton = document.createElement('button');
    bulkButton.className = 'admin-bulk-dismiss';
    bulkButton.textContent = '全て削除';
    bulkButton.onclick = () => this.dismissAll();
    
    container.appendChild(bulkButton);
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // 必要に応じてキーボードショートカットなどを追加
  }

  /**
   * 管理画面専用通知表示
   */
  notifyAdmin(options = {}) {
    const adminOptions = {
      ...options,
      className: `admin-notification ${options.type || 'info'}`
    };
    
    return this.unifiedNotificationService.show(adminOptions);
  }

  /**
   * システム通知の表示
   */
  notifySystem(message, level = 'info', options = {}) {
    if (!this.adminSettings.enableSystemNotifications) return;
    
    const systemOptions = {
      type: level,
      title: 'システム通知',
      message,
      className: 'admin-notification system',
      persistent: level === 'error',
      duration: level === 'error' ? 0 : 5000,
      ...options
    };
    
    return this.notifyAdmin(systemOptions);
  }

  /**
   * 成功通知（管理画面用）
   */
  success(message, title = '完了', options = {}) {
    return this.notifyAdmin({
      type: 'success',
      title,
      message,
      duration: 3000,
      ...options
    });
  }

  /**
   * エラー通知（管理画面用）
   */
  error(message, title = 'エラー', options = {}) {
    return this.notifyAdmin({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    });
  }

  /**
   * 警告通知（管理画面用）
   */
  warning(message, title = '警告', options = {}) {
    return this.notifyAdmin({
        type: 'warning',
      title,
      message,
      duration: 4000,
      ...options
    });
  }

  /**
   * 情報通知（管理画面用）
   */
  info(message, title = '情報', options = {}) {
    return this.notifyAdmin({
      type: 'info',
      title,
      message,
      duration: 3000,
      ...options
    });
  }

  /**
   * 全通知の削除
   */
  dismissAll() {
    this.unifiedNotificationService.clear();
    this.log('全ての通知を削除しました');
  }

  /**
   * 統一通知サービスのメソッドをプロキシ
   */
  show(options) {
    return this.unifiedNotificationService.show(options);
  }

  remove(id) {
    return this.unifiedNotificationService.remove(id);
  }

  clear() {
    return this.unifiedNotificationService.clear();
  }

  /**
   * 設定の更新
   */
  updateSettings(newSettings) {
    this.adminSettings = { ...this.adminSettings, ...newSettings };
    this.unifiedNotificationService.updateSettings(newSettings);
  }

  /**
   * サービスの破棄
   */
  destroy() {
    // 管理画面専用要素の削除
    document.querySelectorAll('#admin-notification-styles').forEach(el => {
      el.remove();
    });
    
    this.initialized = false;
    this.log('AdminNotificationService を破棄しました');
  }
}

// シングルトンインスタンス
let adminNotificationServiceInstance = null;

/**
 * AdminNotificationServiceのシングルトンインスタンスを取得
 * @returns {AdminNotificationService}
 */
export function getAdminNotificationService() {
  if (!adminNotificationServiceInstance) {
    adminNotificationServiceInstance = new AdminNotificationService();
  }
  return adminNotificationServiceInstance;
}

// 便利関数のエクスポート
export function notifyAdminSuccess(message, options = {}) {
  return getAdminNotificationService().success(message, undefined, options);
}

export function notifyAdminError(message, options = {}) {
  return getAdminNotificationService().error(message, undefined, options);
}

export function notifyAdminWarning(message, options = {}) {
  return getAdminNotificationService().warning(message, undefined, options);
}

export function notifyAdminInfo(message, options = {}) {
  return getAdminNotificationService().info(message, '情報', options);
}

/**
 * 管理画面ログ関数
 * @param {string} message - ログメッセージ
 * @param {string} level - ログレベル (info, debug, warning, error)
 * @param {string} category - ログカテゴリ
 */
export function adminLog(message, level = 'info', category = 'general') {
  const service = getAdminNotificationService();
  
  // コンソールにログ出力
  console.log(`[ADMIN-${level.toUpperCase()}] [${category}] ${message}`);
  
  // 必要に応じて通知も表示
  if (level === 'error') {
    service.error(message, `エラー (${category})`);
  } else if (level === 'warning') {
    service.warning(message, `警告 (${category})`);
  }
}

/**
 * 管理画面通知関数
 * @param {string} message - 通知メッセージ
 * @param {string} type - 通知タイプ
 * @param {object} options - オプション
 */
export function adminNotify(message, type = 'info', options = {}) {
  const service = getAdminNotificationService();
  
  switch (type) {
    case 'success':
      return service.success(message, undefined, options);
    case 'error':
      return service.error(message, undefined, options);
    case 'warning':
      return service.warning(message, undefined, options);
    case 'info':
    default:
      return service.info(message, undefined, options);
  }
}

/**
 * 管理画面トースト通知
 * @param {string} message - メッセージ
 * @param {string} type - タイプ
 * @param {number} duration - 表示時間
 */
export function adminToast(message, type = 'info', duration = 3000) {
  return adminNotify(message, type, { duration });
}

/**
 * 管理画面モーダル
 * @param {string} title - タイトル
 * @param {string} content - 内容
 * @param {object} options - オプション
 */
export function adminModal(title, content, options = {}) {
  const service = getAdminNotificationService();
  return service.notifyAdmin({
    title,
    message: content,
    persistent: true,
    ...options
  });
} 