/**
 * RBS陸上教室 アクションハンドラーサービス
 * data-action属性を使用したイベント処理を統一管理
 * 
 * @typedef {Object} ActionParams
 * @property {string} [tab] - タブ名
 * @property {string} [url] - URL
 * @property {string} [target] - ターゲット要素ID
 * @property {string} [text] - テキスト
 * 
 * @typedef {Object} ActionContext
 * @property {HTMLElement} element - アクション要素
 * @property {ActionParams} params - パラメータ
 * @property {Event} event - イベント
 * 
 * @typedef {function(HTMLElement, ActionParams, Event): Promise<void>|void} ActionHandler
 * 
 * @typedef {Object} EventListener
 * @property {string} type - イベントタイプ
 * @property {EventListenerOrEventListenerObject} listener - リスナー関数
 * 
 * @typedef {'success'|'error'|'info'|'warning'} FeedbackType
 * 
 * @typedef {'dashboard'|'news-management'|'lesson-status'|'settings'} TabName
 * 
 * @typedef {Object} DashboardStats
 * @property {number} total - 総記事数
 * @property {number} published - 公開済み記事数
 * @property {number} draft - 下書き記事数
 * @property {number} currentMonth - 今月の記事数
 */

import { EventBus } from './EventBus.js';

/**
 * アクションハンドラーサービスクラス
 * TypeScript移行対応版
 */
export class ActionHandler {
  /**
   * @type {Map<string, ActionHandler>}
   */
  #actions;

  /**
   * @type {EventListener[]}
   */
  #listeners;

  /**
   * @type {boolean}
   */
  #initialized;

  /**
   * コンストラクタ
   */
  constructor() {
    this.#actions = new Map();
    this.#listeners = [];
    this.#initialized = false;
  }

  /**
   * アクションハンドラーを初期化
   * @returns {void}
   */
  init() {
    if (this.#initialized) return;
    
    this.#setupEventListeners();
    this.#registerDefaultActions();
    this.#initialized = true;
    
    console.log('✅ ActionHandler initialized');
  }

  /**
   * 初期化状態を取得
   * @returns {boolean}
   */
  get isInitialized() {
    return this.#initialized;
  }

  /**
   * グローバルイベントリスナーを設定
   * @private
   * @returns {void}
   */
  #setupEventListeners() {
    /** @type {EventListener} */
    const clickListener = (event) => {
      const element = event.target?.closest('[data-action]');
      if (element instanceof HTMLElement) {
        event.preventDefault();
        this.handleAction(element, event);
      }
    };

    /** @type {EventListener} */
    const changeListener = (event) => {
      const element = event.target;
      if (element instanceof HTMLElement && element.hasAttribute('data-action')) {
        this.handleAction(element, event);
      }
    };

    document.addEventListener('click', clickListener);
    document.addEventListener('change', changeListener);
    
    this.#listeners.push(
      { type: 'click', listener: clickListener },
      { type: 'change', listener: changeListener }
    );
  }

  /**
   * アクションを処理
   * @param {HTMLElement} element - アクション要素
   * @param {Event} event - イベント
   * @returns {Promise<void>}
   */
  async handleAction(element, event) {
    const actionName = element.getAttribute('data-action');
    
    if (!actionName) return;

    const params = this.#extractParams(element);
    
    try {
      if (this.#actions.has(actionName)) {
        const handler = this.#actions.get(actionName);
        if (handler) {
          await handler(element, params, event);
        }
      } else {
        // 未登録のアクションはEventBusで配信
        EventBus.emit(`action:${actionName}`, {
          element,
          params,
          event
        });
      }
    } catch (error) {
      console.error(`Action handler error for "${actionName}":`, error);
      this.showFeedback(`アクション "${actionName}" でエラーが発生しました`, 'error');
    }
  }

  /**
   * 要素からパラメータを抽出
   * @private
   * @param {HTMLElement} element - 対象要素
   * @returns {ActionParams}
   */
  #extractParams(element) {
    /** @type {ActionParams} */
    const params = {};
    
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
        const key = attr.name.substring(5); // 'data-'を除去
        params[key] = attr.value;
      }
    });

    return params;
  }

  /**
   * アクションハンドラーを登録
   * @param {string} actionName - アクション名
   * @param {ActionHandler} handler - ハンドラー関数
   * @returns {void}
   */
  register(actionName, handler) {
    if (typeof actionName !== 'string' || typeof handler !== 'function') {
      throw new Error('Invalid action registration: actionName must be string, handler must be function');
    }
    this.#actions.set(actionName, handler);
  }

  /**
   * 複数のアクションハンドラーを一括登録
   * @param {Record<string, ActionHandler>} handlers - ハンドラーオブジェクト
   * @returns {void}
   */
  registerMultiple(handlers) {
    Object.entries(handlers).forEach(([actionName, handler]) => {
      this.register(actionName, handler);
    });
  }

  /**
   * デフォルトアクションを登録
   * @private
   * @returns {void}
   */
  #registerDefaultActions() {
    /** @type {Record<string, ActionHandler>} */
    const defaultActions = {
      // 外部リンクを開く
      'open-external': (element, params) => {
        const url = params.url || (element instanceof HTMLAnchorElement ? element.href : '');
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      },

      // ページ内スクロール
      'scroll-to': (element, params) => {
        const target = params.target || 
          (element instanceof HTMLAnchorElement ? element.getAttribute('href')?.substring(1) : '');
        
        if (target) {
          const targetElement = document.getElementById(target);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      },

      // 管理画面 - タブ切り替え
      'switch-tab': (element, params) => {
        const tabName = params.tab;
        if (this.#isValidTabName(tabName)) {
          this.switchAdminTab(tabName);
        }
      },

      // FAQトグル機能
      'toggle-faq': (element, params) => {
        this.#handleFaqToggle(element, params);
      },

      // モバイルメニュー切り替え
      'toggle-mobile-menu': (element) => {
        this.#handleMobileMenuToggle(element);
      },

      // URL をコピー
      'copy-url': async (element, params) => {
        await this.#handleUrlCopy(element, params);
      },

      // ソーシャルシェア
      'share-twitter': (element, params) => {
        this.#handleSocialShare('twitter', element, params);
      },

      'share-facebook': (element, params) => {
        this.#handleSocialShare('facebook', element, params);
      },

      'share-line': (element, params) => {
        this.#handleSocialShare('line', element, params);
      },

      // 管理画面 - 記事管理
      'clear-news-editor': () => {
        if (confirm('記事エディターの内容をクリアしますか？')) {
          this.clearNewsEditor();
        }
      },

      'preview-news': () => this.previewNews(),
      'save-news': () => this.saveNews(),
      'publish-news': () => this.publishNews(),
      'test-article-service': () => this.testArticleService(),

      // 管理画面 - レッスン状況
      'load-lesson-status': () => this.loadLessonStatus(),
      'preview-lesson-status': () => this.previewLessonStatus(),
      'update-lesson-status': () => this.updateLessonStatus(),

      // 管理画面 - データ管理
      'export-data': () => {
        if (confirm('データをエクスポートしますか？')) {
          this.exportData();
        }
      },

      'clear-all-data': () => {
        if (confirm('本当にすべてのデータを削除しますか？この操作は取り消せません。')) {
          this.clearAllData();
        }
      },

      // 管理画面 - サイト連携
      'test-site-connection': () => this.testSiteConnection(),

      // 管理画面 - デバッグ
      'reset-local-storage': () => {
        if (confirm('LocalStorageをリセットしますか？')) {
          this.resetLocalStorage();
        }
      },

      // 管理画面 - モーダル・UI
      'close-modal': () => this.closeModal(),
      'logout': () => {
        if (confirm('ログアウトしますか？')) {
          this.logout();
        }
      },

      // デバッグ情報表示
      'show-debug-info': () => {
        EventBus.emit('debug:show-info');
      }
    };

    this.registerMultiple(defaultActions);
  }

  /**
   * 管理画面タブ切り替え
   */
  switchAdminTab(tabName) {
    try {
      console.log(`🔄 タブ切り替え: ${tabName}`);
      
      // ナビゲーションアイテムの更新
      document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.classList.remove('active');
        if (navItem.dataset.tab === tabName) {
          navItem.classList.add('active');
        }
      });

      // セクションの表示切り替え
      document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
        if (section.id === tabName) {
          section.classList.add('active');
        }
      });

      // タブ固有の初期化処理
      this.initializeTabContent(tabName);
      
      this.showFeedback(`${this.getTabDisplayName(tabName)}に切り替えました`);
      
    } catch (error) {
      console.error('タブ切り替えエラー:', error);
      this.showFeedback('タブ切り替えに失敗しました', 'error');
    }
  }

  /**
   * タブ表示名を取得
   */
  getTabDisplayName(tabName) {
    const tabNames = {
      'dashboard': 'ダッシュボード',
      'news-management': '記事管理',
      'lesson-status': 'レッスン状況',
      'settings': '設定'
    };
    return tabNames[tabName] || tabName;
  }

  /**
   * タブ固有の初期化処理
   */
  initializeTabContent(tabName) {
    switch (tabName) {
      case 'dashboard':
        this.initializeDashboard();
        break;
      case 'news-management':
        this.initializeNewsManagement();
        break;
      case 'lesson-status':
        this.initializeLessonStatus();
        break;
      case 'settings':
        this.initializeSettings();
        break;
    }
  }

  /**
   * ダッシュボード初期化
   */
  initializeDashboard() {
    console.log('📊 ダッシュボードを初期化中...');
    // 統計情報の更新など
    this.updateDashboardStats();
  }

  /**
   * 記事管理初期化
   */
  initializeNewsManagement() {
    console.log('📝 記事管理を初期化中...');
    // 記事リストの更新など
    this.loadNewsList();
  }

  /**
   * レッスン状況初期化
   */
  initializeLessonStatus() {
    console.log('📅 レッスン状況を初期化中...');
    // 現在の日付をセット
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('lesson-date');
    if (dateInput) {
      dateInput.value = today;
    }
    
    // 現在のレッスン状況を読み込み
    this.loadLessonStatus();
  }

  /**
   * 設定初期化
   */
  initializeSettings() {
    console.log('⚙️ 設定を初期化中...');
  }

  // 管理画面の各アクションの実装
  clearNewsEditor() {
    const fields = ['news-title', 'news-category', 'news-content', 'news-summary'];
    fields.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = '';
    });
    document.getElementById('news-id').value = '';
    document.getElementById('editor-title').textContent = '新規記事作成';
    this.showFeedback('記事エディターをクリアしました');
  }

  previewNews() {
    const title = document.getElementById('news-title')?.value || 'タイトル未設定';
    const content = document.getElementById('news-content')?.value || 'コンテンツが設定されていません';
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (modal && modalTitle && modalBody) {
      modalTitle.textContent = 'プレビュー';
      modalBody.innerHTML = `
        <div class="preview-content">
          <h2>${this.escapeHtml(title)}</h2>
          <div class="preview-body">${this.formatContent(content)}</div>
        </div>
      `;
      modal.style.display = 'block';
    }
  }

  saveNews() {
    this.showFeedback('記事を保存しました');
  }

  publishNews() {
    this.showFeedback('記事を公開しました');
  }

  testArticleService() {
    this.showFeedback('記事サービステストを実行しました');
  }

  loadLessonStatus() {
    this.showFeedback('レッスン状況を読み込みました');
  }

  previewLessonStatus() {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (modal && modalTitle && modalBody) {
      modalTitle.textContent = 'レッスン状況プレビュー';
      modalBody.innerHTML = '<div class="preview-content">レッスン状況のプレビューが表示されます</div>';
      modal.style.display = 'block';
    }
  }

  updateLessonStatus() {
    this.showFeedback('レッスン状況を更新しました');
  }

  exportData() {
    this.showFeedback('データをエクスポートしました');
  }

  clearAllData() {
    localStorage.clear();
    this.showFeedback('すべてのデータをクリアしました');
  }

  testSiteConnection() {
    this.showFeedback('サイト連携テストを実行しました');
  }

  resetLocalStorage() {
    localStorage.clear();
    this.showFeedback('LocalStorageをリセットしました');
  }

  closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  logout() {
    window.location.href = 'admin-login.html';
  }

  updateDashboardStats() {
    // 簡易的な統計更新
    const stats = {
      total: 5,
      published: 3,
      draft: 2,
      currentMonth: 1
    };
    
    const updateStat = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };
    
    updateStat('total-articles', stats.total);
    updateStat('published-articles', stats.published);
    updateStat('draft-articles', stats.draft);
    updateStat('current-month-articles', stats.currentMonth);
  }

  loadNewsList() {
    // 記事リストの読み込み処理
    console.log('記事リストを読み込み中...');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatContent(content) {
    return content.replace(/\n/g, '<br>');
  }

  /**
   * フィードバックメッセージを表示
   */
  showFeedback(message, type = 'success') {
    // 簡易的な通知表示
    const notification = document.createElement('div');
    notification.className = `action-feedback ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : '#10b981'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#listeners.forEach(({ type, listener }) => {
      document.removeEventListener(type, listener);
    });
    
    this.#listeners = [];
    this.#actions.clear();
    this.#initialized = false;
  }

  /**
   * タブ名の妥当性をチェック
   * @private
   * @param {string} tabName - チェック対象のタブ名
   * @returns {tabName is TabName}
   */
  #isValidTabName(tabName) {
    const validTabs = ['dashboard', 'news-management', 'lesson-status', 'settings'];
    return typeof tabName === 'string' && validTabs.includes(tabName);
  }

  /**
   * FAQトグル処理
   * @private
   * @param {HTMLElement} element - クリックされた要素
   * @param {ActionParams} params - パラメータ
   * @returns {void}
   */
  #handleFaqToggle(element, params) {
    const faqItem = element.closest('.faq-item');
    if (faqItem) {
      const isActive = faqItem.classList.contains('active');
      
      // 他の開いているFAQを閉じる（アコーディオン動作）
      document.querySelectorAll('.faq-item.active').forEach(item => {
        if (item !== faqItem) {
          item.classList.remove('active');
        }
      });
      
      // 現在のFAQをトグル
      faqItem.classList.toggle('active');
      
      // アクセシビリティ対応
      const isNowActive = faqItem.classList.contains('active');
      element.setAttribute('aria-expanded', isNowActive.toString());
      
      console.log(`FAQ ${isNowActive ? 'opened' : 'closed'}: ${params.target || 'unknown'}`);
    }
  }

  /**
   * モバイルメニュートグル処理
   * @private
   * @param {HTMLElement} element - クリックされた要素
   * @returns {void}
   */
  #handleMobileMenuToggle(element) {
    const nav = document.querySelector('.nav-links');
    const isExpanded = element.getAttribute('aria-expanded') === 'true';
    
    element.setAttribute('aria-expanded', (!isExpanded).toString());
    
    if (nav) {
      nav.classList.toggle('mobile-open');
    }
  }

  /**
   * URL コピー処理
   * @private
   * @param {HTMLElement} element - クリックされた要素
   * @param {ActionParams} params - パラメータ
   * @returns {Promise<void>}
   */
  async #handleUrlCopy(element, params) {
    const url = params.url || window.location.href;
    
    try {
      await navigator.clipboard.writeText(url);
      this.showFeedback('URLをコピーしました');
    } catch (error) {
      console.error('URLコピーに失敗:', error);
      this.showFeedback('URLコピーに失敗しました', 'error');
    }
  }

  /**
   * ソーシャルシェア処理
   * @private
   * @param {'twitter'|'facebook'|'line'} platform - シェアプラットフォーム
   * @param {HTMLElement} element - クリックされた要素
   * @param {ActionParams} params - パラメータ
   * @returns {void}
   */
  #handleSocialShare(platform, element, params) {
    const url = params.url || window.location.href;
    const text = params.text || document.title;
    
    /** @type {Record<string, string>} */
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      line: `https://line.me/R/msg/text/?${encodeURIComponent(text + ' ' + url)}`
    };
    
    const shareUrl = shareUrls[platform];
    if (shareUrl) {
      const windowFeatures = platform === 'line' ? undefined : 'width=600,height=400,scrollbars=yes,resizable=yes';
      window.open(shareUrl, '_blank', windowFeatures);
    }
  }
}

// アニメーション用CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// シングルトンインスタンスを作成
export const actionHandler = new ActionHandler(); 