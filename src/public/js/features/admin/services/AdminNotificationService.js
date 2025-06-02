import { CONFIG } from '../../../shared/constants/config.js';

/**
 * RBS管理画面 - 通知・ログ・モーダルサービス
 * 管理画面専用のモダン通知システム
 * @version 3.0.0
 */

class AdminNotificationService {
  constructor() {
    this.componentName = 'AdminNotificationService';
    
    // 統一ストレージキー（CONFIG.storage.keysから取得）
    this.storageKeys = {
      adminLogs: CONFIG.storage.keys.adminLogs,
      debugMode: CONFIG.storage.keys.debugMode,
      sessionStart: CONFIG.storage.keys.sessionStart
    };
    
    this.notifications = new Map();
    this.logs = [];
    this.modals = new Map();
    this.settings = {
      maxNotifications: 5,
      maxLogs: 100,
      defaultDuration: 5000,
      logRetentionDays: 7
    };
    
    this.initialized = false;
    this.containers = {
      notifications: null,
      modals: null,
      logViewer: null,
      debugPanel: null
    };
  }

  /**
   * サービスの初期化
   */
  async init() {
    if (this.initialized) return;
    
    try {
      this.createContainers();
      this.loadPersistedLogs();
      this.setupEventListeners();
      this.startPerformanceMonitor();
      
      this.initialized = true;
      
      // 初期化ログ
      this.log({
        level: 'info',
        message: '通知システムが初期化されました',
        category: 'system'
      });
      
      console.log('✅ AdminNotificationService 初期化完了');
      
    } catch (error) {
      console.error('❌ AdminNotificationService 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * UIコンテナの作成
   */
  createContainers() {
    // 通知マネージャー
    this.containers.notifications = this.createElement('div', {
      className: 'notification-manager',
      id: 'admin-notification-manager'
    });

    // ログビューアー
    this.containers.logViewer = this.createElement('div', {
      className: 'log-viewer',
      id: 'admin-log-viewer',
      innerHTML: this.getLogViewerHTML()
    });

    // モーダルマネージャー
    this.containers.modals = this.createElement('div', {
      className: 'modal-manager',
      id: 'admin-modal-manager'
    });

    // トーストコンテナ
    this.containers.toasts = this.createElement('div', {
      className: 'toast-container',
      id: 'admin-toast-container'
    });

    // デバッグパネル
    this.containers.debugPanel = this.createElement('div', {
      className: 'debug-panel',
      id: 'admin-debug-panel',
      innerHTML: this.getDebugPanelHTML()
    });

    // DOMに追加
    document.body.append(
      this.containers.notifications,
      this.containers.logViewer,
      this.containers.modals,
      this.containers.toasts,
      this.containers.debugPanel
    );

    this.setupContainerEventListeners();
  }

  /**
   * 通知の表示
   */
  notify(options = {}) {
    const id = this.generateId();
    const notification = {
      id,
      type: options.type || 'info',
      title: options.title || 'お知らせ',
      message: options.message || '',
      duration: options.duration || this.settings.defaultDuration,
      actions: options.actions || [],
      persistent: options.persistent || false,
      timestamp: new Date(),
      metadata: options.metadata || {}
    };

    // ログに記録
    this.log({
      level: this.getLogLevel(notification.type),
      message: `通知表示: ${notification.title}`,
      details: { notification },
      category: 'notification'
    });

    // 通知制限チェック
    this.enforceNotificationLimit();

    // 通知要素の作成
    const element = this.createNotificationElement(notification);
    this.notifications.set(id, { ...notification, element });

    // アニメーション付きで追加
    this.containers.notifications.appendChild(element);
    requestAnimationFrame(() => {
      element.classList.add('entering');
    });

    // 自動削除タイマー
    if (!notification.persistent && notification.duration > 0) {
      this.setNotificationTimer(id, notification.duration);
    }

    // カスタムイベント発火
    this.dispatchEvent('notification:show', { notification });

    return id;
  }

  /**
   * 通知の削除
   */
  removeNotification(id, reason = 'manual') {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // アニメーション付きで削除
    notification.element.classList.add('exiting');
    
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications.delete(id);
      
      // カスタムイベント発火
      this.dispatchEvent('notification:remove', { id, reason });
    }, 300);
  }

  /**
   * ログの記録
   */
  log(options = {}) {
    const logEntry = {
      id: this.generateId(),
      level: options.level || 'info',
      message: options.message || '',
      details: options.details || null,
      category: options.category || 'general',
      timestamp: new Date(),
      source: options.source || this.getCallerInfo(),
      metadata: options.metadata || {}
    };

    this.logs.unshift(logEntry);
    this.trimLogs();
    this.persistLogs();
    this.updateLogViewer();

    // コンソールにも出力（開発環境）
    if (this.isDebugMode()) {
      this.outputToConsole(logEntry);
    }

    // カスタムイベント発火
    this.dispatchEvent('log:add', { logEntry });

    return logEntry.id;
  }

  /**
   * モーダルの表示
   */
  showModal(options = {}) {
    const id = this.generateId();
    const modal = {
      id,
      title: options.title || 'モーダル',
      content: options.content || '',
      size: options.size || 'medium',
      closable: options.closable !== false,
      backdrop: options.backdrop !== false,
      persistent: options.persistent || false,
      onShow: options.onShow || null,
      onHide: options.onHide || null,
      actions: options.actions || []
    };

    // ログに記録
    this.log({
      level: 'debug',
      message: `モーダル表示: ${modal.title}`,
      category: 'modal'
    });

    // モーダル要素の作成
    const element = this.createModalElement(modal);
    this.modals.set(id, { ...modal, element });

    // DOMに追加してアニメーション
    this.containers.modals.innerHTML = '';
    this.containers.modals.appendChild(element);
    
    requestAnimationFrame(() => {
      this.containers.modals.classList.add('active');
      
      // onShowコールバック実行
      if (modal.onShow) {
        try {
          modal.onShow(modal);
        } catch (error) {
          this.log({
            level: 'error',
            message: 'モーダルonShowコールバックエラー',
            details: { error: error.message },
            category: 'modal'
          });
        }
      }
    });

    // カスタムイベント発火
    this.dispatchEvent('modal:show', { modal });

    return id;
  }

  /**
   * モーダルの非表示
   */
  hideModal(id, reason = 'manual') {
    const modal = this.modals.get(id);
    if (!modal) return;

    // アニメーション付きで非表示
    this.containers.modals.classList.remove('active');
    
    setTimeout(() => {
      this.containers.modals.innerHTML = '';
      this.modals.delete(id);
      
      // onHideコールバック実行
      if (modal.onHide) {
        try {
          modal.onHide(modal, reason);
        } catch (error) {
          this.log({
            level: 'error',
            message: 'モーダルonHideコールバックエラー',
            details: { error: error.message },
            category: 'modal'
          });
        }
      }
      
      // カスタムイベント発火
      this.dispatchEvent('modal:hide', { id, reason });
    }, 300);
  }

  /**
   * トーストメッセージの表示
   */
  toast(message, type = 'info', duration = 3000) {
    const toast = this.createElement('div', {
      className: `toast ${type}`,
      innerHTML: `
        <i class="icon ${this.getIconForType(type)}"></i>
        <span>${this.escapeHtml(message)}</span>
      `
    });

    this.containers.toasts.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);

    // ログに記録
    this.log({
      level: this.getLogLevel(type),
      message: `トースト表示: ${message}`,
      category: 'toast'
    });
  }

  /**
   * ログビューアーの切り替え
   */
  toggleLogViewer() {
    this.containers.logViewer.classList.toggle('active');
    
    if (this.containers.logViewer.classList.contains('active')) {
      this.updateLogViewer();
    }
  }

  /**
   * デバッグパネルの切り替え
   */
  toggleDebugPanel() {
    this.containers.debugPanel.classList.toggle('active');
    
    if (this.containers.debugPanel.classList.contains('active')) {
      this.updateDebugPanel();
    }
  }

  // =============================================================================
  // プライベートメソッド
  // =============================================================================

  createElement(tag, options = {}) {
    const element = document.createElement(tag);
    Object.keys(options).forEach(key => {
      if (key === 'innerHTML') {
        element.innerHTML = options[key];
      } else {
        element[key] = options[key];
      }
    });
    return element;
  }

  generateId() {
    return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(date) {
    return date.toLocaleTimeString('ja-JP', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  getIconForType(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  getLogLevel(type) {
    const levels = {
      success: 'info',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return levels[type] || 'info';
  }

  isDebugMode() {
    return localStorage.getItem(this.storageKeys.debugMode) === 'true' || 
           window.location.search.includes('debug=true');
  }

  getCallerInfo() {
    try {
      const stack = new Error().stack;
      const lines = stack.split('\n');
      const caller = lines[3] || lines[2] || 'unknown';
      return caller.trim();
    } catch {
      return 'unknown';
    }
  }

  dispatchEvent(type, detail = {}) {
    window.dispatchEvent(new CustomEvent(`admin:${type}`, { detail }));
  }

  enforceNotificationLimit() {
    while (this.notifications.size >= this.settings.maxNotifications) {
      const oldestId = this.notifications.keys().next().value;
      this.removeNotification(oldestId, 'limit_exceeded');
    }
  }

  setNotificationTimer(id, duration) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    const progressBar = notification.element.querySelector('.notification-progress');
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.transition = `width ${duration}ms linear`;
      
      requestAnimationFrame(() => {
        progressBar.style.width = '0%';
      });
    }

    setTimeout(() => {
      this.removeNotification(id, 'timeout');
    }, duration);
  }

  trimLogs() {
    if (this.logs.length > this.settings.maxLogs) {
      this.logs = this.logs.slice(0, this.settings.maxLogs);
    }

    // 古いログの削除
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.logRetentionDays);
    
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
  }

  persistLogs() {
    try {
      const recentLogs = this.logs.slice(0, 50);
      localStorage.setItem(this.storageKeys.adminLogs, JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('ログの保存に失敗しました:', error);
    }
  }

  loadPersistedLogs() {
    try {
      const stored = localStorage.getItem(this.storageKeys.adminLogs);
      if (stored) {
        const logs = JSON.parse(stored);
        this.logs = logs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.warn('ログの読み込みに失敗しました:', error);
    }
  }

  updateLogViewer() {
    const content = this.containers.logViewer.querySelector('#log-content');
    if (!content) return;

    const currentFilter = this.containers.logViewer.querySelector('.log-filter-btn.active')?.dataset.level || 'all';
    const filteredLogs = this.getFilteredLogs(currentFilter);

    content.innerHTML = filteredLogs.map(log => this.createLogEntryHTML(log)).join('');
  }

  getFilteredLogs(level) {
    if (level === 'all') return this.logs;
    return this.logs.filter(log => log.level === level);
  }

  createLogEntryHTML(log) {
    const details = log.details ? `
      <div class="log-details">
        ${this.escapeHtml(JSON.stringify(log.details, null, 2))}
      </div>
    ` : '';

    return `
      <div class="log-entry ${log.level}" data-id="${log.id}">
        <div class="log-icon">
          <i class="${this.getIconForType(log.level)}"></i>
        </div>
        <div class="log-message">
          <div class="log-time">${this.formatTime(log.timestamp)}</div>
          <div class="log-text">${this.escapeHtml(log.message)}</div>
          ${details}
        </div>
      </div>
    `;
  }

  outputToConsole(logEntry) {
    const method = logEntry.level === 'error' ? 'error' : 
                  logEntry.level === 'warning' ? 'warn' : 'log';
    
    console[method](`[${this.formatTime(logEntry.timestamp)}] ${logEntry.message}`, 
                    logEntry.details || '');
  }

  setupEventListeners() {
    // アプリケーション開始時間を記録
    if (!sessionStorage.getItem(this.storageKeys.sessionStart)) {
      sessionStorage.setItem(this.storageKeys.sessionStart, Date.now().toString());
    }

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+L: ログビューアー切り替え
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.toggleLogViewer();
      }
      
      // Ctrl+Shift+D: デバッグパネル切り替え
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDebugPanel();
      }
      
      // ESC: モーダルを閉じる
      if (e.key === 'Escape') {
        this.closeTopModal();
      }
    });

    // ネットワーク状態の監視
    window.addEventListener('online', () => {
      this.notify({
        type: 'success',
        title: 'ネットワーク復旧',
        message: 'インターネット接続が復旧しました',
        duration: 3000
      });
    });

    window.addEventListener('offline', () => {
      this.notify({
        type: 'warning',
        title: 'ネットワーク切断',
        message: 'インターネット接続が切断されました',
        persistent: true
      });
    });
  }

  setupContainerEventListeners() {
    // 通知クリックイベント
    this.containers.notifications.addEventListener('click', (e) => {
      const notificationId = e.target.closest('[data-id]')?.dataset.id;
      const actionId = e.target.closest('[data-action]')?.dataset.action;
      
      if (notificationId) {
        if (e.target.closest('.notification-close')) {
          this.removeNotification(notificationId, 'user_close');
        } else if (actionId) {
          this.handleNotificationAction(notificationId, actionId);
        }
      }
    });

    // ログビューアーイベント
    this.containers.logViewer.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      const level = e.target.closest('[data-level]')?.dataset.level;
      
      if (action) {
        this.handleLogAction(action);
      } else if (level) {
        this.setLogFilter(level);
      }
    });

    // モーダルイベント
    this.containers.modals.addEventListener('click', (e) => {
      const close = e.target.closest('[data-close]');
      const actionId = e.target.closest('[data-action]')?.dataset.action;
      
      if (close) {
        this.closeTopModal();
      } else if (actionId) {
        this.handleModalAction(actionId);
      }
    });

    // デバッグパネルイベント
    this.containers.debugPanel.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      const tab = e.target.closest('[data-tab]')?.dataset.tab;
      
      if (action === 'close-debug') {
        this.toggleDebugPanel();
      } else if (tab) {
        this.switchDebugTab(tab);
      }
    });
  }

  startPerformanceMonitor() {
    // 定期的なメモリ使用量チェック
    setInterval(() => {
      const memory = this.getMemoryUsage();
      if (memory && memory.used > memory.limit * 0.8) {
        this.log({
          level: 'warning',
          message: 'メモリ使用量が高くなっています',
          details: { memory },
          category: 'performance'
        });
      }
    }, 30000); // 30秒間隔
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  updateDebugPanel() {
    const content = this.containers.debugPanel.querySelector('#debug-content');
    const activeTab = this.containers.debugPanel.querySelector('.debug-tab.active')?.dataset.tab || 'stats';
    
    if (!content) return;

    switch (activeTab) {
      case 'stats':
        content.innerHTML = this.generateStatsHTML();
        break;
      case 'performance':
        content.innerHTML = this.generatePerformanceHTML();
        break;
      case 'settings':
        content.innerHTML = this.generateSettingsHTML();
        break;
    }
  }

  generateStatsHTML() {
    return `
      <div style="padding: 16px; color: white; font-family: monospace; font-size: 12px;">
        <h4 style="margin: 0 0 12px 0; color: #60a5fa;">システム統計</h4>
        <div>通知: ${this.notifications.size} アクティブ</div>
        <div>ログ: ${this.logs.length} 件</div>
        <div>モーダル: ${this.modals.size} アクティブ</div>
      </div>
    `;
  }

  generatePerformanceHTML() {
    return `
      <div style="padding: 16px; color: white; font-family: monospace; font-size: 12px;">
        <h4 style="margin: 0 0 12px 0; color: #60a5fa;">パフォーマンス</h4>
        <div>メモリ監視中...</div>
      </div>
    `;
  }

  generateSettingsHTML() {
    return `
      <div style="padding: 16px; color: white; font-family: monospace; font-size: 12px;">
        <h4 style="margin: 0 0 12px 0; color: #60a5fa;">設定</h4>
        <div>最大通知数: ${this.settings.maxNotifications}</div>
        <div>最大ログ数: ${this.settings.maxLogs}</div>
      </div>
    `;
  }

  // HTML テンプレート
  createNotificationElement(notification) {
    const actions = notification.actions.map(action => 
      `<button class="notification-action ${action.type || ''}" data-action="${action.id}">
        ${action.label}
      </button>`
    ).join('');

    const actionsHTML = actions ? `<div class="notification-actions">${actions}</div>` : '';

    return this.createElement('div', {
      className: `notification-item ${notification.type}`,
      innerHTML: `
        <div class="notification-content">
          <div class="notification-avatar">
            <i class="${this.getIconForType(notification.type)}"></i>
          </div>
          <div class="notification-body">
            <div class="notification-title">${this.escapeHtml(notification.title)}</div>
            <div class="notification-message">${this.escapeHtml(notification.message)}</div>
            <div class="notification-meta">
              <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
            </div>
            ${actionsHTML}
          </div>
        </div>
        <button class="notification-close" data-id="${notification.id}">
          <i class="fas fa-times"></i>
        </button>
        ${!notification.persistent ? '<div class="notification-progress"></div>' : ''}
      `
    });
  }

  createModalElement(modal) {
    const actions = modal.actions.map(action => 
      `<button class="btn ${action.type || 'btn-outline'}" data-action="${action.id}">
        ${action.label}
      </button>`
    ).join('');

    return this.createElement('div', {
      innerHTML: `
        <div class="modal-backdrop" ${modal.backdrop ? 'data-close="true"' : ''}></div>
        <div class="modal-container ${modal.size}">
          <div class="modal-header">
            <h3 class="modal-title">
              <span class="icon"><i class="fas fa-window-maximize"></i></span>
              ${this.escapeHtml(modal.title)}
            </h3>
            ${modal.closable ? '<button class="modal-close" data-close="true"><i class="fas fa-times"></i></button>' : ''}
          </div>
          <div class="modal-body">
            ${modal.content}
          </div>
          ${actions ? `<div class="modal-footer">${actions}</div>` : ''}
        </div>
      `
    });
  }

  getLogViewerHTML() {
    return `
      <div class="log-header">
        <div class="log-title">
          <i class="fas fa-terminal"></i>
          システムログ
        </div>
        <div class="log-controls">
          <button class="log-btn" data-action="clear" title="クリア">
            <i class="fas fa-trash"></i>
          </button>
          <button class="log-btn" data-action="export" title="エクスポート">
            <i class="fas fa-download"></i>
          </button>
          <button class="log-btn" data-action="close" title="閉じる">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="log-filters">
        <button class="log-filter-btn active" data-level="all">すべて</button>
        <button class="log-filter-btn error" data-level="error">エラー</button>
        <button class="log-filter-btn warning" data-level="warning">警告</button>
        <button class="log-filter-btn success" data-level="info">情報</button>
        <button class="log-filter-btn" data-level="debug">デバッグ</button>
      </div>
      <div class="log-content" id="log-content"></div>
    `;
  }

  getDebugPanelHTML() {
    return `
      <div class="debug-header">
        <div class="debug-title">
          <i class="fas fa-bug"></i>
          デバッグパネル
        </div>
        <button class="log-btn" data-action="close-debug">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="debug-tabs">
        <div class="debug-tab active" data-tab="stats">統計</div>
        <div class="debug-tab" data-tab="performance">パフォーマンス</div>
        <div class="debug-tab" data-tab="settings">設定</div>
      </div>
      <div class="debug-content" id="debug-content"></div>
    `;
  }

  // イベントハンドラー
  handleLogAction(action) {
    switch (action) {
      case 'clear':
        this.clearLogs();
        break;
      case 'export':
        this.exportLogs();
        break;
      case 'close':
        this.toggleLogViewer();
        break;
    }
  }

  clearLogs() {
    this.logs = [];
    this.updateLogViewer();
    localStorage.removeItem(this.storageKeys.adminLogs);
    
    this.log({
      level: 'info',
      message: 'ログをクリアしました',
      category: 'system'
    });
  }

  exportLogs() {
    try {
      const data = {
        exported: new Date().toISOString(),
        version: '1.0',
        logs: this.logs
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      this.toast('ログをエクスポートしました', 'success');
    } catch (error) {
      this.toast('エクスポートに失敗しました', 'error');
    }
  }

  setLogFilter(level) {
    this.containers.logViewer.querySelectorAll('.log-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });
    
    this.updateLogViewer();
  }

  handleNotificationAction(notificationId, actionId) {
    this.dispatchEvent('notification:action', { notificationId, actionId });
  }

  closeTopModal() {
    if (this.modals.size > 0) {
      const topModalId = Array.from(this.modals.keys()).pop();
      this.hideModal(topModalId, 'escape');
    }
  }

  handleModalAction(actionId) {
    this.dispatchEvent('modal:action', { actionId });
  }

  switchDebugTab(tab) {
    this.containers.debugPanel.querySelectorAll('.debug-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    this.updateDebugPanel();
  }
}

// グローバルエラーハンドリングセットアップ
function setupGlobalErrorHandling(notificationService) {
  // JavaScript エラー
  window.addEventListener('error', (event) => {
    notificationService.log({
      level: 'error',
      message: `JavaScript エラー: ${event.message}`,
      details: {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error?.stack
      },
      category: 'javascript'
    });
  });

  // 未処理のPromise拒否
  window.addEventListener('unhandledrejection', (event) => {
    notificationService.log({
      level: 'error',
      message: `未処理のPromise拒否: ${event.reason}`,
      details: { reason: event.reason },
      category: 'promise'
    });
  });
}

// サービスインスタンスの作成とエクスポート
let adminNotificationService = null;

export function getAdminNotificationService() {
  if (!adminNotificationService) {
    adminNotificationService = new AdminNotificationService();
  }
  return adminNotificationService;
}

// 簡単アクセス用のヘルパー関数
export function adminNotify(options) {
  return getAdminNotificationService().notify(options);
}

export function adminLog(message, level = 'info', category = 'user') {
  return getAdminNotificationService().log({ message, level, category });
}

export function adminToast(message, type = 'info') {
  return getAdminNotificationService().toast(message, type);
}

export function adminModal(options) {
  return getAdminNotificationService().showModal(options);
}

// 初期化時にエラーハンドリングを設定
document.addEventListener('DOMContentLoaded', () => {
  const service = getAdminNotificationService();
  setupGlobalErrorHandling(service);
});

export { AdminNotificationService };

// =============================================================================
// 開発用デモ機能（軽量版）
// =============================================================================

if (typeof window !== 'undefined') {
  window.AdminNotificationDemos = {
    // 基本通知のテスト
    testBasicNotifications() {
      const service = getAdminNotificationService();
      if (!service.initialized) {
        console.warn('通知システムが初期化されていません');
        return;
      }
      
      service.notify({
        type: 'success',
        title: 'テスト成功',
        message: '基本通知システムが動作しています',
        duration: 3000
      });
      
      setTimeout(() => {
        service.notify({
          type: 'info',
          title: 'テスト情報',
          message: 'これは情報通知のテストです',
          duration: 4000
        });
      }, 1000);
    },
    
    // エラー通知のテスト
    testErrorNotification() {
      adminNotify({
        type: 'error',
        title: 'テストエラー',
        message: 'これはエラー通知のテストです',
        duration: 5000
      });
    },
    
    // モーダルのテスト
    testModal() {
      adminModal({
        title: 'テストモーダル',
        content: '<p>これはモーダルのテストです。</p><p>正常に動作していますか？</p>',
        size: 'medium',
        actions: [
          { id: 'ok', label: 'OK', type: 'btn-primary' },
          { id: 'cancel', label: 'キャンセル', type: 'btn-outline' }
        ]
      });
    },
    
    // ログのテスト
    testLogging() {
      adminLog('これはテストログです', 'info', 'test');
      adminLog('これは警告ログです', 'warning', 'test');
      adminLog('これはエラーログです', 'error', 'test');
      adminLog('これはデバッグログです', 'debug', 'test');
      
      adminToast('ログが記録されました', 'success');
    },
    
    // 全機能の簡単テスト
    testAll() {
      this.testBasicNotifications();
      setTimeout(() => this.testErrorNotification(), 2000);
      setTimeout(() => this.testLogging(), 4000);
      setTimeout(() => this.testModal(), 6000);
    }
  };
  
  // 開発環境でのコンソールヘルパー
  if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
    console.log(`
🎉 RBS管理画面 通知システム v3.0

使用可能なテスト機能:
- AdminNotificationDemos.testBasicNotifications() - 基本通知テスト
- AdminNotificationDemos.testErrorNotification() - エラー通知テスト
- AdminNotificationDemos.testModal() - モーダルテスト
- AdminNotificationDemos.testLogging() - ログテスト
- AdminNotificationDemos.testAll() - 全機能テスト

グローバル関数:
- adminNotify(options) - 通知表示
- adminToast(message, type) - トーストメッセージ
- adminLog(message, level, category) - ログ記録
- adminModal(options) - モーダル表示

キーボードショートカット:
- Ctrl+Shift+L: ログビューアー切り替え
- Ctrl+Shift+D: デバッグパネル切り替え
- ESC: モーダルを閉じる
    `);
  }
} 