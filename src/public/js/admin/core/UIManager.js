/**
 * RBS陸上教室 管理画面UI管理システム
 * タブ切り替え、フォーム管理、通知表示などのUI機能を統合管理
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';

export class UIManager extends EventEmitter {
  constructor() {
    super();
    
    this.logger = new Logger('UIManager');
    
    // 現在の状態
    this.currentTab = 'dashboard';
    this.currentModal = null;
    this.notifications = [];
    
    // DOM要素のキャッシュ
    this.elements = {};
    
    // フォームの状態管理
    this.forms = new Map();
    
    // UI設定
    this.config = {
      animationDuration: 300,
      notificationDuration: 5000,
      autoSaveIndicator: true
    };
  }

  /**
   * UI管理システムの初期化
   */
  async init() {
    try {
      this.logger.info('UI管理システムを初期化中...');
      
      this.cacheElements();
      this.setupEventListeners();
      this.setupInitialDisplay();
      this.setupKeyboardShortcuts();
      
      this.logger.info('UI管理システムの初期化完了');
    } catch (error) {
      this.logger.error('UI管理システムの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * DOM要素のキャッシュ
   */
  cacheElements() {
    this.elements = {
      // タブ関連
      navItems: document.querySelectorAll('.nav-item'),
      sections: document.querySelectorAll('.admin-section'),
      
      // フォーム関連
      newsForm: document.getElementById('news-form'),
      instagramForm: document.getElementById('instagram-form'),
      lessonForm: document.getElementById('lesson-form'),
      
      // ボタン関連
      logoutBtn: document.querySelector('.logout-btn'),
      saveBtn: document.querySelector('[onclick="saveNews()"]'),
      publishBtn: document.querySelector('[onclick="publishNews()"]'),
      
      // 表示関連
      statsElements: {
        totalArticles: document.getElementById('total-articles'),
        publishedArticles: document.getElementById('published-articles'),
        draftArticles: document.getElementById('draft-articles'),
        currentMonthArticles: document.getElementById('current-month-articles')
      },
      
      // リスト関連
      newsList: document.getElementById('news-list'),
      instagramList: document.getElementById('instagram-list'),
      recentArticles: document.getElementById('recent-articles'),
      
      // モーダル関連
      modal: document.getElementById('modal'),
      modalContent: document.querySelector('.modal-content'),
      modalClose: document.querySelector('.modal-close')
    };
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // タブ切り替え
    this.elements.navItems.forEach(navItem => {
      navItem.addEventListener('click', (e) => {
        const tabName = navItem.dataset.tab;
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });

    // モーダル関連
    if (this.elements.modalClose) {
      this.elements.modalClose.addEventListener('click', () => {
        this.closeModal();
      });
    }

    if (this.elements.modal) {
      this.elements.modal.addEventListener('click', (e) => {
        if (e.target === this.elements.modal) {
          this.closeModal();
        }
      });
    }

    // フォームの自動保存
    this.setupFormAutoSave();

    // リサイズ対応
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // ページ離脱時の確認
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '未保存の変更があります。本当に離脱しますか？';
      }
    });
  }

  /**
   * 初期表示の設定
   */
  setupInitialDisplay() {
    // 初期タブを表示
    this.switchTab(this.currentTab);
    
    // レスポンシブ対応
    this.handleResize();
  }

  /**
   * キーボードショートカットの設定
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S で保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.handleSaveShortcut();
      }
      
      // Escキーでモーダルを閉じる
      if (e.key === 'Escape' && this.currentModal) {
        this.closeModal();
      }
      
      // Alt + 数字でタブ切り替え
      if (e.altKey && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const tabNames = ['dashboard', 'news-management', 'lesson-status', 'settings'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabNames[tabIndex]) {
          this.switchTab(tabNames[tabIndex]);
        }
      }
    });
  }

  /**
   * タブ切り替え
   */
  switchTab(tabName) {
    try {
      // 既に同じタブの場合は何もしない
      if (this.currentTab === tabName) return;

      this.logger.debug(`タブを切り替え: ${this.currentTab} → ${tabName}`);

      // ナビゲーションの更新
      this.elements.navItems.forEach(navItem => {
        navItem.classList.remove('active');
        if (navItem.dataset.tab === tabName) {
          navItem.classList.add('active');
        }
      });

      // セクションの表示切り替え
      this.elements.sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === tabName) {
          section.classList.add('active');
        }
      });

      const previousTab = this.currentTab;
      this.currentTab = tabName;

      // タブ切り替えイベントを発火
      this.emit('tabChanged', { 
        current: tabName, 
        previous: previousTab 
      });

      // タブ固有の初期化処理
      this.initializeTabContent(tabName);

    } catch (error) {
      this.logger.error('タブ切り替えエラー:', error);
    }
  }

  /**
   * ダッシュボードの初期化
   */
  initializeDashboard() {
    this.logger.debug('ダッシュボード初期化を開始');
    this.logger.debug('DataManager存在:', !!this.dataManager);
    this.logger.debug('現在のタブ:', this.currentTab);
    
    if (this.dataManager) {
      this.logger.debug('ダッシュボードを初期化中...');
      
      // 統計情報の更新
      const stats = this.dataManager.getStats();
      this.logger.debug('取得した統計情報:', stats);
      this.updateStats(stats);
      
      // 最近の記事の表示
      const recentArticles = this.dataManager.getArticles({ limit: 5 });
      this.logger.debug('取得した最近の記事:', recentArticles.length, '件');
      this.displayRecentArticles(recentArticles);
      
      // テストデータの通知表示
      this.checkAndNotifyTestData();
      
      this.logger.debug('ダッシュボードの初期化完了');
    } else {
      this.logger.warn('DataManagerが設定されていないため、ダッシュボードを初期化できません');
    }
  }

  /**
   * テストデータの存在をチェックして通知
   */
  checkAndNotifyTestData() {
    if (typeof window.hasTestData === 'function' && typeof window.hasRealArticles === 'function') {
      const hasTest = window.hasTestData();
      const hasReal = window.hasRealArticles();
      
      if (hasTest && hasReal) {
        // 実記事とテストデータの両方がある場合
        this.showNotification('warning', 
          'テストデータが残っています。設定タブから削除することをお勧めします。', 
          8000);
      } else if (hasTest && !hasReal) {
        // テストデータのみの場合
        this.showNotification('info', 
          'テストデータが表示されています。実際の記事を作成すると自動的に判別されます。', 
          6000);
      }
    }
  }

  /**
   * タブ固有の初期化処理
   */
  initializeTabContent(tabName) {
    switch (tabName) {
      case 'dashboard':
        // DataManagerが設定されている場合は即座に初期化、そうでなければ後で初期化
        this.logger.debug('ダッシュボードタブが選択されました');
        if (this.dataManager) {
          // DOM要素を確実にキャッシュしてから初期化
          this.cacheElements();
          this.initializeDashboard();
        } else {
          this.logger.warn('DataManagerが未設定のため、ダッシュボード初期化を延期');
        }
        break;
      case 'news-management':
        this.emit('requestNewsList');
        break;
      case 'lesson-status':
        this.emit('requestLessonStatus');
        break;
      case 'settings':
        // 設定タブの初期化
        break;
    }
  }

  /**
   * DataManagerからのイベントハンドリングを設定
   */
  setupDataManagerEvents(dataManager) {
    // DataManagerの参照を保存
    this.dataManager = dataManager;
    
    // 統計情報の更新
    dataManager.on('dataChanged', (type, data) => {
      if (type === 'articles') {
        this.displayNewsList(data);
        const stats = dataManager.getStats();
        this.updateStats(stats);
      }
    });

    // データ読み込み完了時にダッシュボードを初期化
    dataManager.on('allDataLoaded', () => {
      this.logger.debug('DataManager: 全データ読み込み完了イベントを受信');
      // DOM要素を再キャッシュしてからダッシュボードを初期化
      this.cacheElements();
      this.initializeDashboard();
    });

    // ダッシュボード関連のイベント
    this.on('requestStatsUpdate', () => {
      const stats = dataManager.getStats();
      this.updateStats(stats);
    });

    this.on('requestRecentArticles', () => {
      const articles = dataManager.getArticles({ limit: 5 });
      this.displayRecentArticles(articles);
    });

    this.on('requestNewsList', () => {
      const articles = dataManager.getArticles();
      this.displayNewsList(articles);
    });
  }

  /**
   * 統計情報の更新
   */
  updateStats(stats) {
    this.logger.debug('統計情報を更新中:', stats);
    
    // DOM要素が見つからない場合は再キャッシュを試行
    if (!this.elements.statsElements || !this.elements.statsElements.totalArticles) {
      this.logger.debug('統計要素が見つからないため、要素を再キャッシュします');
      this.cacheElements();
    }
    
    const { statsElements } = this.elements;
    
    if (statsElements && statsElements.totalArticles) {
      this.animateNumber(statsElements.totalArticles, stats.totalArticles);
    } else {
      this.logger.warn('totalArticles要素が見つかりません（ID: total-articles）');
    }
    
    if (statsElements && statsElements.publishedArticles) {
      this.animateNumber(statsElements.publishedArticles, stats.publishedArticles);
    } else {
      this.logger.warn('publishedArticles要素が見つかりません（ID: published-articles）');
    }
    
    if (statsElements && statsElements.draftArticles) {
      this.animateNumber(statsElements.draftArticles, stats.draftArticles);
    } else {
      this.logger.warn('draftArticles要素が見つかりません（ID: draft-articles）');
    }
    
    if (statsElements && statsElements.currentMonthArticles) {
      this.animateNumber(statsElements.currentMonthArticles, stats.currentMonthArticles);
    } else {
      this.logger.warn('currentMonthArticles要素が見つかりません（ID: current-month-articles）');
    }
  }

  /**
   * 数字のアニメーション表示
   */
  animateNumber(element, targetValue) {
    if (!element) {
      this.logger.warn('数値アニメーション対象の要素が見つかりません');
      return;
    }

    const currentValue = parseInt(element.textContent) || 0;
    
    // 値が同じ場合や無効な値の場合は即座に設定
    if (currentValue === targetValue || isNaN(targetValue)) {
      element.textContent = targetValue;
      return;
    }

    const difference = Math.abs(targetValue - currentValue);
    const increment = targetValue > currentValue ? 1 : -1;
    const duration = Math.min(500, difference * 50); // 最大500ms
    const stepTime = Math.max(10, Math.floor(duration / difference)); // 最小10ms
    
    let current = currentValue;
    const timer = setInterval(() => {
      current += increment;
      element.textContent = current;
      
      if (current === targetValue) {
        clearInterval(timer);
      }
    }, stepTime);
  }

  /**
   * 記事リストの表示
   */
  displayNewsList(articles) {
    if (!this.elements.newsList) return;

    if (articles.length === 0) {
      this.elements.newsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <p>記事がありません</p>
        </div>
      `;
      return;
    }

    this.elements.newsList.innerHTML = articles.map(article => `
      <div class="list-item" data-id="${article.id}">
        <div class="list-item-header">
          <h3 class="list-item-title">${this.escapeHtml(article.title)}</h3>
          <div class="list-item-actions">
            <span class="status-badge status-${article.status}">
              ${article.status === 'published' ? '公開済み' : '下書き'}
            </span>
            <span class="category-badge">${this.getCategoryLabel(article.category)}</span>
            <button class="btn btn-outline btn-sm" onclick="editNews('${article.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline btn-sm" onclick="deleteNews('${article.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="list-item-meta">
          <span><i class="fas fa-calendar"></i> ${this.formatDate(article.createdAt)}</span>
          ${article.updatedAt && article.updatedAt !== article.createdAt ? 
            `<span><i class="fas fa-edit"></i> ${this.formatDate(article.updatedAt)}</span>` : 
            ''}
        </div>
        ${article.summary ? `
          <div class="list-item-summary">
            ${this.escapeHtml(article.summary)}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  /**
   * 最近の記事の表示
   */
  displayRecentArticles(articles) {
    if (!this.elements.recentArticles) return;

    if (articles.length === 0) {
      this.elements.recentArticles.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <p>記事がありません</p>
          <button class="btn btn-primary btn-sm" onclick="switchToTab('news-management')">
            <i class="fas fa-plus"></i> 新しい記事を作成
          </button>
        </div>
      `;
      return;
    }

    this.elements.recentArticles.innerHTML = articles.slice(0, 5).map(article => `
      <div class="recent-article-card" onclick="editNews('${article.id}')">
        <div class="recent-article-header">
          <div class="recent-article-title">${this.escapeHtml(article.title)}</div>
          <div class="recent-article-actions">
            <span class="status-badge status-${article.status}">
              ${article.status === 'published' ? '公開済み' : '下書き'}
            </span>
            <span class="category-badge">${this.getCategoryLabel(article.category)}</span>
          </div>
        </div>
        <div class="recent-article-meta">
          <div class="meta-item">
            <i class="fas fa-calendar-alt"></i>
            <span>${this.formatDate(article.createdAt)}</span>
          </div>
          ${article.updatedAt && article.updatedAt !== article.createdAt ? `
            <div class="meta-item">
              <i class="fas fa-edit"></i>
              <span>更新: ${this.formatDate(article.updatedAt)}</span>
            </div>
          ` : ''}
        </div>
        ${article.summary ? `
          <div class="recent-article-summary">
            ${this.escapeHtml(article.summary).substring(0, 80)}${article.summary.length > 80 ? '...' : ''}
          </div>
        ` : ''}
        <div class="recent-article-footer">
          <div class="article-stats">
            <span class="stat-item">
              <i class="fas fa-eye"></i>
              プレビュー可能
            </span>
          </div>
          <div class="article-actions">
            <button class="btn-icon" onclick="event.stopPropagation(); editNews('${article.id}')" title="編集">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon" onclick="event.stopPropagation(); previewNews('${article.id}')" title="プレビュー">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * 通知表示
   */
  showNotification(type, message, duration = this.config.notificationDuration) {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    };

    this.notifications.push(notification);
    this.renderNotification(notification);

    // 自動削除
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, duration);

    this.emit('notificationShown', notification);
  }

  /**
   * 通知をレンダリング
   */
  renderNotification(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.className = `admin-notification ${notification.type}`;
    notificationElement.id = `notification-${notification.id}`;
    
    notificationElement.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
        <span>${this.escapeHtml(notification.message)}</span>
        <button class="notification-close" onclick="this.closest('.admin-notification').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    document.body.appendChild(notificationElement);

    // アニメーション
    requestAnimationFrame(() => {
      notificationElement.style.transform = 'translateX(0)';
    });
  }

  /**
   * 通知アイコンの取得
   */
  getNotificationIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  /**
   * 通知の削除
   */
  removeNotification(id) {
    const notification = document.getElementById(`notification-${id}`);
    if (notification) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        notification.remove();
      }, this.config.animationDuration);
    }

    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  /**
   * モーダル表示
   */
  showModal(title, content, options = {}) {
    if (!this.elements.modal) return;

    const modalHeader = this.elements.modal.querySelector('.modal-header h3');
    const modalBody = this.elements.modal.querySelector('.modal-body');

    if (modalHeader) modalHeader.textContent = title;
    if (modalBody) modalBody.innerHTML = content;

    this.elements.modal.classList.add('active');
    this.currentModal = { title, content, options };

    // フォーカストラップの設定
    this.setupModalFocusTrap();

    this.emit('modalShown', { title, content, options });
  }

  /**
   * モーダル閉じる
   */
  closeModal() {
    if (!this.elements.modal || !this.currentModal) return;

    this.elements.modal.classList.remove('active');
    this.currentModal = null;

    this.emit('modalClosed');
  }

  /**
   * モーダルのフォーカストラップ設定
   */
  setupModalFocusTrap() {
    const modal = this.elements.modal;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable.focus();

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    });
  }

  /**
   * フォームの自動保存設定
   */
  setupFormAutoSave() {
    // 主要なフォーム要素に変更監視を設定
    const formElements = document.querySelectorAll('input, textarea, select');
    
    formElements.forEach(element => {
      element.addEventListener('input', () => {
        this.handleFormChange(element);
      });
    });
  }

  /**
   * フォーム変更の処理
   */
  handleFormChange(element) {
    const form = element.closest('form');
    if (!form) return;

    const formId = form.id || 'default';
    
    if (!this.forms.has(formId)) {
      this.forms.set(formId, {
        hasChanges: false,
        lastChange: null
      });
    }

    const formState = this.forms.get(formId);
    formState.hasChanges = true;
    formState.lastChange = Date.now();

    this.emit('formChanged', { formId, element });
  }

  /**
   * 保存ショートカットの処理
   */
  handleSaveShortcut() {
    switch (this.currentTab) {
      case 'news-management':
        this.emit('saveRequested', 'news');
        break;
      case 'lesson-status':
        this.emit('saveRequested', 'lesson');
        break;
    }
  }

  /**
   * 未保存の変更があるかチェック
   */
  hasUnsavedChanges() {
    for (const [formId, formState] of this.forms) {
      if (formState.hasChanges) {
        return true;
      }
    }
    return false;
  }

  /**
   * フォームの変更状態をクリア
   */
  clearFormChanges(formId) {
    if (this.forms.has(formId)) {
      this.forms.get(formId).hasChanges = false;
    }
  }

  /**
   * リサイズ処理
   */
  handleResize() {
    const width = window.innerWidth;
    
    // モバイル対応
    if (width <= 768) {
      document.body.classList.add('mobile');
    } else {
      document.body.classList.remove('mobile');
    }
  }

  /**
   * ユーティリティメソッド
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCategoryLabel(category) {
    const labels = {
      announcement: 'お知らせ',
      event: '体験会',
      media: 'メディア',
      important: '重要'
    };
    return labels[category] || category;
  }

  /**
   * 破棄処理
   */
  destroy() {
    // 全ての通知を削除
    this.notifications.forEach(notification => {
      this.removeNotification(notification.id);
    });

    this.removeAllListeners();
    this.logger.info('UI管理システムを破棄しました');
  }
} 