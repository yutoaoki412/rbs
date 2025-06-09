/**
 * 管理画面統一通知サービス - インライン実装とモジュール実装の統合版
 * @version 2.0.0 - リファクタリング統合版
 */

import { UnifiedNotificationService, getUnifiedNotificationService } from './UnifiedNotificationService.js';

export class AdminNotificationService {
  constructor() {
    this.unifiedService = getUnifiedNotificationService();
    this.notificationHistory = new Map();
    this.debugMode = false;
    
    // 管理画面専用設定
    this.adminSettings = {
      enableDuplicateCheck: true,
      enableDebugLogs: true,
      enableActionButtons: true,
      duplicateCheckDuration: 3000, // 3秒間は重複チェック
      historyCleanupDuration: 300000 // 5分でクリーンアップ
    };
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.setupGlobalHelpers();
    this.setupDebugMode();
    this.log('AdminNotificationService initialized', 'info');
  }

  /**
   * グローバルヘルパー関数の設定（admin.html内の実装を統合）
   */
  setupGlobalHelpers() {
    // 重複防止機能付きの通知表示
    window.showNotification = (type, message, duration = 4000, options = {}) => {
      return this.showWithDuplicateCheck(type, message, duration, options);
    };

    // 便利なヘルパー関数
    window.showSuccess = (message, duration, options) => 
      this.showWithDuplicateCheck('success', message, duration, options);
    
    window.showError = (message, duration, options) => 
      this.showWithDuplicateCheck('error', message, duration, options);
    
    window.showWarning = (message, duration, options) => 
      this.showWithDuplicateCheck('warning', message, duration, options);
    
    window.showInfo = (message, duration, options) => 
      this.showWithDuplicateCheck('info', message, duration, options);

    // 管理画面専用通知
    window.adminNotify = (options) => this.notifyAdmin(options);
    window.adminLog = (message, level = 'info', category = 'system') => 
      this.log(message, level, category);
    window.adminToast = (message, type = 'info') => this.toast(message, type);
    window.adminModal = (content, options = {}) => this.modal(content, options);
  }

  /**
   * デバッグモードの設定
   */
  setupDebugMode() {
    // デバッグ用ヘルパー関数（admin.html内の実装を統合）
    window.listActions = () => {
      if (window.app?.actionManager) {
        this.log('📋 登録済みアクション: ' + Array.from(window.app.actionManager._actions.keys()).join(', '), 'info');
      } else if (window.actionManager) {
        this.log('📋 登録済みアクション: ' + Array.from(window.actionManager._actions.keys()).join(', '), 'info');
      } else {
        this.log('⚠️ ActionManagerが利用できません', 'warning');
      }
    };

    window.testTabFunction = (tabName = 'dashboard') => {
      this.log(`🧪 タブ機能テスト開始: ${tabName}`, 'info');
      
      if (window.adminActionService) {
        this.log('✅ AdminActionServiceが利用可能', 'success');
        window.adminActionService.switchAdminTab(tabName);
      } else {
        this.log('❌ AdminActionServiceが利用できません', 'error');
      }
    };

    window.testAction = (actionName, params = {}) => {
      this.log(`🧪 アクション実行テスト: ${actionName}`, 'info', 'debug');
      
      if (window.actionManager) {
        const element = document.createElement('div');
        element.setAttribute('data-action', actionName);
        
        Object.keys(params).forEach(key => {
          element.setAttribute(`data-${key}`, params[key]);
        });
        
        window.actionManager.handleAction(element, new Event('click'));
      } else {
        this.log('❌ ActionManagerが利用できません', 'error');
      }
    };

    window.checkTabElements = () => {
      this.log('🔍 タブ関連DOM要素確認', 'info', 'debug');
      
      const navItems = document.querySelectorAll('.nav-item[data-tab]');
      const sections = document.querySelectorAll('.admin-section');
      
      this.log('📋 ナビゲーション要素: ' + navItems.length + '個', 'info');
      this.log('📋 セクション要素: ' + sections.length + '個', 'info');
    };
  }

  /**
   * 重複チェック機能付き通知表示
   */
  showWithDuplicateCheck(type, message, duration = 4000, options = {}) {
    if (!this.adminSettings.enableDuplicateCheck) {
      return this.unifiedService.show({ type, message, duration, ...options });
    }

    // 重複チェック
    const notificationKey = `${type}:${message}`;
    const now = Date.now();
    
    if (this.notificationHistory.has(notificationKey)) {
      const lastTime = this.notificationHistory.get(notificationKey);
      if (now - lastTime < this.adminSettings.duplicateCheckDuration) {
        if (this.debugMode) {
          console.debug('重複通知をスキップ:', message);
        }
        return null;
      }
    }

    // 通知履歴に記録
    this.notificationHistory.set(notificationKey, now);
    
    // 既存の同じ通知を削除
    this.removeDuplicateNotifications(message);
    
    // 統一サービスで通知を表示
    const id = this.unifiedService.show({
      type,
      message,
      duration,
      title: options.title || this.getDefaultTitle(type),
      ...options
    });

    // 履歴クリーンアップをスケジュール
    setTimeout(() => {
      this.notificationHistory.delete(notificationKey);
    }, this.adminSettings.historyCleanupDuration);

    return id;
  }

  /**
   * 重複通知の削除
   */
  removeDuplicateNotifications(message) {
    document.querySelectorAll('.unified-notification').forEach(notification => {
      const messageElement = notification.querySelector('.unified-notification-message');
      if (messageElement && messageElement.textContent.includes(message)) {
        const notificationId = notification.dataset.notificationId;
        if (notificationId) {
          this.unifiedService.remove(notificationId);
        }
      }
    });
  }

  /**
   * 管理画面専用通知
   */
  notifyAdmin(options = {}) {
    const adminOptions = {
      ...options,
      className: `admin-notification ${options.type || 'info'}`
    };
    
    return this.unifiedService.show(adminOptions);
  }

  /**
   * システムログ通知
   */
  log(message, level = 'info', category = 'system') {
    if (!this.adminSettings.enableDebugLogs && level === 'debug') return;
    
    // コンソールログ
    const logPrefix = category ? `[${category.toUpperCase()}]` : '[ADMIN]';
    console.log(`${logPrefix} ${message}`);
    
    // システム通知として表示（エラーと警告のみ）
    if (level === 'error' || level === 'warning') {
      this.notifyAdmin({
        type: level,
        title: 'システム通知',
        message,
        duration: level === 'error' ? 8000 : 5000,
        persistent: level === 'error'
      });
    }
  }

  /**
   * トースト通知（軽量版）
   */
  toast(message, type = 'info') {
    return this.unifiedService.show({
      type,
      message,
      duration: 2000,
      title: '',
      className: 'admin-toast'
    });
  }

  /**
   * モーダル通知
   */
  modal(content, options = {}) {
    // 既存のモーダルシステムと連携
    if (window.adminActionService?.uiManagerService) {
      return window.adminActionService.uiManagerService.showModal(content, options);
    }
    
    // フォールバック
    this.notifyAdmin({
      type: 'info',
      message: content,
      persistent: true,
      ...options
    });
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

  /**
   * 成功指標の取得（リファクタリング効果測定用）
   */
  getMetrics() {
    return {
      totalNotifications: this.notificationHistory.size,
      duplicatesPrevented: Array.from(this.notificationHistory.values()).filter(
        time => Date.now() - time < this.adminSettings.duplicateCheckDuration
      ).length,
      serviceStatus: 'active',
      unifiedServiceStatus: this.unifiedService ? 'connected' : 'disconnected'
    };
  }

  /**
   * 設定の更新
   */
  updateSettings(newSettings) {
    this.adminSettings = { ...this.adminSettings, ...newSettings };
    this.log('通知設定が更新されました', 'info');
  }

  /**
   * デバッグモードの切り替え
   */
  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    this.log(`デバッグモード: ${this.debugMode ? 'ON' : 'OFF'}`, 'info');
    return this.debugMode;
  }

  /**
   * サービスの破棄
   */
  destroy() {
    // グローバル関数の削除
    delete window.showNotification;
    delete window.showSuccess;
    delete window.showError;
    delete window.showWarning;
    delete window.showInfo;
    delete window.adminNotify;
    delete window.adminLog;
    delete window.adminToast;
    delete window.adminModal;
    
    // 履歴のクリア
    this.notificationHistory.clear();
    
    this.log('AdminNotificationService destroyed', 'info');
  }
}

// シングルトンインスタンス
let adminNotificationServiceInstance = null;

/**
 * 管理画面通知サービスのシングルトンインスタンスを取得
 */
export function getAdminNotificationService() {
  if (!adminNotificationServiceInstance) {
    adminNotificationServiceInstance = new AdminNotificationService();
  }
  return adminNotificationServiceInstance;
}

// 便利な関数をエクスポート
export function adminNotify(options) {
  return getAdminNotificationService().notifyAdmin(options);
}

export function adminLog(message, level = 'info', category = 'system') {
  return getAdminNotificationService().log(message, level, category);
}

export function adminToast(message, type = 'info') {
  return getAdminNotificationService().toast(message, type);
}

export function adminModal(content, options = {}) {
  return getAdminNotificationService().modal(content, options);
} 