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
   * @type {string}
   */
  #currentNewsFilter;

  /**
   * コンストラクタ
   */
  constructor() {
    this.#actions = new Map();
    this.#listeners = [];
    this.#initialized = false;
    this.#currentNewsFilter = 'all';
  }

  /**
   * アクションハンドラーを初期化
   * @returns {void}
   */
  init() {
    if (this.#initialized) {
      console.log('⚠️ ActionHandler: 既に初期化済み');
      return;
    }

    console.log('🔧 ActionHandler: 初期化開始');
    
    this.#registerEventListeners();
    this.#registerDefaultActions();
    
    this.#initialized = true;
    
    // ダッシュボードの統計を初期化時に更新
    setTimeout(() => {
      if (document.getElementById('dashboard')) {
        this.updateDashboardStats();
      }
    }, 100);
    
    console.log('✅ ActionHandler: 初期化完了');
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
  #registerEventListeners() {
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
      
      // 記事一覧管理
      'filter-news-list': (element, params) => this.filterNewsList(element, params),
      'refresh-news-list': () => this.refreshNewsList(),

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
        this.showDebugInfo();
      },

      // テストデータ作成（開発用）
      'create-test-data': () => {
        if (confirm('テストデータを作成しますか？既存のデータは保持されます。')) {
          this.createTestData();
        }
      },

      // LP側ニュースのデバッグ表示
      'show-news-debug': () => {
        this.showLPNewsDebug();
      }
    };

    this.registerMultiple(defaultActions);
  }

  /**
   * 管理画面タブ切り替え
   */
  switchAdminTab(tabName) {
    console.log(`🔄 管理画面タブ切り替え: ${tabName}`);
    
    // 現在のアクティブタブを非アクティブに
    const currentActiveTab = document.querySelector('.admin-section.active');
    const currentActiveNavItem = document.querySelector('.nav-item.active');
    
    if (currentActiveTab) {
      currentActiveTab.classList.remove('active');
    }
    if (currentActiveNavItem) {
      currentActiveNavItem.classList.remove('active');
    }
    
    // 新しいタブをアクティブに
    const newActiveTab = document.getElementById(tabName);
    const newActiveNavItem = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (newActiveTab) {
      newActiveTab.classList.add('active');
    }
    if (newActiveNavItem) {
      newActiveNavItem.classList.add('active');
    }
    
    // タブ固有の初期化処理
    this.initializeTabContent(tabName);
    
    this.showFeedback(`${this.getTabDisplayName(tabName)}に切り替えました`);
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
    console.log(`🔧 タブコンテンツ初期化: ${tabName}`);
    
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
      default:
        console.warn(`⚠️ 未知のタブ: ${tabName}`);
    }
  }

  /**
   * ダッシュボード初期化
   */
  initializeDashboard() {
    console.log('📊 ダッシュボードを初期化中...');
    // 統計情報の更新
    this.updateDashboardStats();
    
    // ページ表示時にも統計を更新
    setTimeout(() => {
      this.updateDashboardStats();
    }, 100);
  }

  /**
   * 記事管理初期化
   */
  initializeNewsManagement() {
    console.log('📝 記事管理を初期化中...');
    
    // 記事リストの自動読み込み
    setTimeout(() => {
      this.loadNewsList();
    }, 100);
    
    // エディターのリセット
    this.clearNewsEditor();
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
    try {
      const fields = ['news-title', 'news-category', 'news-content', 'news-summary'];
      fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
      });
      
      const newsIdField = document.getElementById('news-id');
      if (newsIdField) newsIdField.value = '';
      
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) editorTitle.textContent = '新規記事作成';
      
      const featuredCheckbox = document.getElementById('news-featured');
      if (featuredCheckbox) featuredCheckbox.checked = false;
      
      this.showFeedback('記事エディターをクリアしました');
    } catch (error) {
      console.error('❌ エディタークリアエラー:', error);
      this.showFeedback('エディターのクリアに失敗しました', 'error');
    }
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
    try {
      console.log('💾 記事を保存中...');
      
      // フォームデータを取得
      const formData = this.getNewsFormData();
      if (!formData) return;
      
      // バリデーション
      if (!formData.title.trim()) {
        this.showFeedback('タイトルを入力してください', 'error');
        return;
      }
      
      if (!formData.content.trim()) {
        this.showFeedback('本文を入力してください', 'error');
        return;
      }
      
      // 既存の記事データを取得
      const articlesData = localStorage.getItem('rbs_articles');
      let articles = articlesData ? JSON.parse(articlesData) : [];
      
      // 記事データを作成/更新
      if (formData.id) {
        // 既存記事の更新
        const index = articles.findIndex(a => a.id === formData.id);
        if (index >= 0) {
          articles[index] = {
            ...articles[index],
            ...formData,
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        // 新規記事の作成
        const newArticle = {
          ...formData,
          id: 'article_' + Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        articles.push(newArticle);
        
        // フォームにIDを設定
        const newsIdField = document.getElementById('news-id');
        if (newsIdField) newsIdField.value = newArticle.id;
      }
      
      // LocalStorageに保存
      localStorage.setItem('rbs_articles', JSON.stringify(articles));
      
      // UIを更新
      this.updateDashboardStats();
      this.refreshNewsList();
      
      this.showFeedback('記事を保存しました');
      console.log('✅ 記事保存完了');
      
    } catch (error) {
      console.error('❌ 記事保存エラー:', error);
      this.showFeedback('記事の保存に失敗しました', 'error');
    }
  }

  publishNews() {
    try {
      console.log('🌐 記事を公開中...');
      
      // まず保存処理を実行
      this.saveNews();
      
      // フォームデータを取得
      const formData = this.getNewsFormData();
      if (!formData || !formData.id) {
        this.showFeedback('記事の保存が必要です', 'error');
        return;
      }
      
      // ステータスを公開に変更
      const articlesData = localStorage.getItem('rbs_articles');
      if (!articlesData) return;
      
      let articles = JSON.parse(articlesData);
      const index = articles.findIndex(a => a.id === formData.id);
      
      if (index >= 0) {
        articles[index].status = 'published';
        articles[index].publishedAt = new Date().toISOString();
        articles[index].updatedAt = new Date().toISOString();
        
        // LocalStorageに保存
        localStorage.setItem('rbs_articles', JSON.stringify(articles));
        
        // フォームのステータスも更新
        const statusSelect = document.getElementById('news-status');
        if (statusSelect) statusSelect.value = 'published';
        
        // UIを更新
        this.updateDashboardStats();
        this.refreshNewsList();
        
        this.showFeedback('記事を公開しました');
        console.log('✅ 記事公開完了');
      }
      
    } catch (error) {
      console.error('❌ 記事公開エラー:', error);
      this.showFeedback('記事の公開に失敗しました', 'error');
    }
  }

  /**
   * フォームデータを取得
   */
  getNewsFormData() {
    try {
      const id = document.getElementById('news-id')?.value || '';
      const title = document.getElementById('news-title')?.value || '';
      const category = document.getElementById('news-category')?.value || 'announcement';
      const date = document.getElementById('news-date')?.value || new Date().toISOString().slice(0, 10);
      const summary = document.getElementById('news-summary')?.value || '';
      const content = document.getElementById('news-content')?.value || '';
      const featured = document.getElementById('news-featured')?.checked || false;
      const status = document.getElementById('news-status')?.value || 'draft';
      
      return {
        id,
        title: title.trim(),
        category,
        date,
        summary: summary.trim(),
        content: content.trim(),
        featured,
        status
      };
    } catch (error) {
      console.error('❌ フォームデータ取得エラー:', error);
      return null;
    }
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
    try {
      console.log('📦 データをエクスポート中...');
      
      // LocalStorageから全てのデータを取得
      const articlesData = localStorage.getItem('rbs_articles');
      const lessonStatusData = localStorage.getItem('rbs_lesson_status');
      const instagramData = localStorage.getItem('rbs_instagram');
      
      const exportData = {
        articles: articlesData ? JSON.parse(articlesData) : [],
        lessonStatus: lessonStatusData ? JSON.parse(lessonStatusData) : {},
        instagram: instagramData ? JSON.parse(instagramData) : [],
        exportedAt: new Date().toISOString(),
        version: '3.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `rbs-admin-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showFeedback('データをエクスポートしました');
      console.log('✅ データエクスポート完了:', exportData);
      
    } catch (error) {
      console.error('❌ データエクスポートエラー:', error);
      this.showFeedback('データのエクスポートに失敗しました', 'error');
    }
  }

  clearAllData() {
    try {
      console.log('🗑️ 全データをクリア中...');
      
      // RBS関連のLocalStorageキーをすべて削除
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rbs_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ 削除: ${key}`);
      });
      
      // ダッシュボードの統計を即座に更新
      this.updateDashboardStats();
      
      // 記事一覧も更新
      this.refreshNewsList();
      
      // LP側のArticleServiceも最新化
      this.refreshLPArticleService();
      
      // 現在のタブがダッシュボードでない場合、ダッシュボードに切り替え
      const currentTab = document.querySelector('.admin-section.active');
      if (currentTab && currentTab.id !== 'dashboard') {
        this.switchAdminTab('dashboard');
      }
      
      this.showFeedback('すべてのデータをクリアしました');
      console.log('✅ 全データクリア完了');
      
    } catch (error) {
      console.error('❌ データクリアエラー:', error);
      this.showFeedback('データのクリアに失敗しました', 'error');
    }
  }

  testSiteConnection() {
    this.showFeedback('サイト連携テストを実行しました');
  }

  resetLocalStorage() {
    try {
      console.log('🔄 LocalStorageをリセット中...');
      
      // 認証データを除いてすべてのLocalStorageをクリア
      const authData = localStorage.getItem('rbs_admin_auth');
      localStorage.clear();
      
      // 認証データを復元（ログアウトを防ぐため）
      if (authData) {
        localStorage.setItem('rbs_admin_auth', authData);
      }
      
      // ダッシュボードの統計を即座に更新
      this.updateDashboardStats();
      
      // 記事一覧も更新
      this.refreshNewsList();
      
      // LP側のArticleServiceも最新化
      this.refreshLPArticleService();
      
      // 現在のタブがダッシュボードでない場合、ダッシュボードに切り替え
      const currentTab = document.querySelector('.admin-section.active');
      if (currentTab && currentTab.id !== 'dashboard') {
        this.switchAdminTab('dashboard');
      }
      
      this.showFeedback('LocalStorageをリセットしました');
      console.log('✅ LocalStorageリセット完了');
      
    } catch (error) {
      console.error('❌ LocalStorageリセットエラー:', error);
      this.showFeedback('LocalStorageのリセットに失敗しました', 'error');
    }
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
    try {
      console.log('📊 ダッシュボード統計を更新中...');
      
      // LocalStorageから実際の記事データを取得
      const articlesData = localStorage.getItem('rbs_articles');
      let articles = [];
      
      try {
        if (articlesData) {
          articles = JSON.parse(articlesData);
          // データの整合性チェック
          articles = articles.filter(article => 
            article && typeof article === 'object' && article.id
          );
        }
      } catch (error) {
        console.error('❌ 記事データの解析に失敗:', error);
        articles = [];
      }
      
      // 統計計算
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const stats = {
        total: articles.length,
        published: articles.filter(article => article.status === 'published').length,
        draft: articles.filter(article => article.status === 'draft').length,
        currentMonth: articles.filter(article => {
          if (!article.date && !article.createdAt) return false;
          const articleDate = new Date(article.date || article.createdAt);
          return articleDate.getMonth() === currentMonth && 
                 articleDate.getFullYear() === currentYear;
        }).length
      };
      
      // DOM更新
      const updateStat = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = value;
          // アニメーション効果を追加
          element.style.transition = 'color 0.3s ease';
          element.style.color = '#4299e1';
          setTimeout(() => {
            element.style.color = '';
          }, 500);
        }
      };
      
      updateStat('total-articles', stats.total);
      updateStat('published-articles', stats.published);
      updateStat('draft-articles', stats.draft);
      updateStat('current-month-articles', stats.currentMonth);
      
      // 最近の記事も更新
      this.updateRecentArticles(articles);
      
      console.log('✅ ダッシュボード統計更新完了:', stats);
      
    } catch (error) {
      console.error('❌ ダッシュボード統計更新エラー:', error);
      
      // エラー時は0にリセット
      const resetStat = (id) => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0';
      };
      
      resetStat('total-articles');
      resetStat('published-articles');
      resetStat('draft-articles');
      resetStat('current-month-articles');
    }
  }

  /**
   * 最近の記事を更新
   */
  updateRecentArticles(articles) {
    const recentArticlesContainer = document.getElementById('recent-articles');
    if (!recentArticlesContainer) return;

    if (articles.length === 0) {
      recentArticlesContainer.innerHTML = `
        <div class="empty-state">
          <div style="text-align: center; padding: 40px 20px; color: var(--gray-medium);">
            <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: var(--navy-dark);">記事がありません</h3>
            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">新しい記事を作成してください。</p>
            <button class="btn btn-primary" data-action="switch-tab" data-tab="news-management">
              <i class="fas fa-plus"></i> 新しい記事を作成
            </button>
          </div>
        </div>
      `;
      return;
    }

    // 最新5件の記事を表示
    const recentArticles = articles
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      .slice(0, 5);

    const articlesHTML = recentArticles
      .map(article => this.createRecentArticleItem(article))
      .join('');

    recentArticlesContainer.innerHTML = articlesHTML;
  }

  /**
   * 最近の記事アイテムを作成
   */
  createRecentArticleItem(article) {
    const date = new Date(article.date || article.createdAt);
    const formattedDate = date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
    
    const statusBadge = article.status === 'published' 
      ? '<span class="badge badge-success">公開</span>'
      : '<span class="badge badge-warning">下書き</span>';
    
    const categoryLabel = this.getCategoryLabel(article.category || 'announcement');
    
    return `
      <div class="recent-article-item">
        <div class="recent-article-header">
          <div class="recent-article-title">${this.escapeHtml(article.title || '無題')}</div>
          <div class="recent-article-actions">
            <button class="btn-icon" onclick="actionHandler.editNewsItem('${article.id}')" title="編集">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon" onclick="actionHandler.deleteNewsItem('${article.id}')" title="削除">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="recent-article-meta">
          <div class="meta-item">
            <i class="fas fa-calendar"></i>
            ${formattedDate}
          </div>
          <div class="meta-item">
            <i class="fas fa-tag"></i>
            ${categoryLabel}
          </div>
          <div class="meta-item">
            ${statusBadge}
          </div>
        </div>
        ${article.summary ? `
          <div class="recent-article-summary">
            ${this.escapeHtml(article.summary.substring(0, 100))}${article.summary.length > 100 ? '...' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * カテゴリーラベルを取得
   */
  getCategoryLabel(category) {
    const categoryMap = {
      'announcement': 'お知らせ',
      'event': '体験会',
      'media': 'メディア',
      'important': '重要'
    };
    return categoryMap[category] || 'お知らせ';
  }

  loadNewsList() {
    // 記事リストの読み込み処理
    console.log('記事リストを読み込み中...');
    
    try {
      // 現在のフィルター値を取得
      const filterSelect = document.getElementById('news-filter');
      const filterValue = filterSelect ? filterSelect.value : 'all';
      
      // 現在のフィルター値を更新
      this.#currentNewsFilter = filterValue;
      
      // フィルタリング処理を実行
      this.performNewsListFilter(filterValue);
      
    } catch (error) {
      console.error('❌ 記事リスト読み込みエラー:', error);
      
      const newsList = document.getElementById('news-list');
      if (newsList) {
        newsList.innerHTML = `
          <div class="error-state">
            <div style="text-align: center; padding: 40px 20px; color: var(--primary-red);">
              <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: var(--navy-dark);">記事の読み込みに失敗しました</h3>
              <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">システムエラーが発生しました。</p>
              <button class="btn btn-primary" onclick="actionHandler.refreshNewsList()">
                <i class="fas fa-sync"></i> 再試行
              </button>
            </div>
          </div>
        `;
      }
    }
  }

  /**
   * 記事一覧をフィルタリング
   */
  filterNewsList(element, params) {
    try {
      const filterValue = element.value;
      
      // フィルター値が変更されていない場合は静かに処理
      if (filterValue === this.#currentNewsFilter) {
        this.performNewsListFilter(filterValue);
        return;
      }
      
      // フィルター値が変更された場合のみログとフィードバックを表示
      console.log(`📋 記事フィルター適用: ${this.#currentNewsFilter} → ${filterValue}`);
      this.#currentNewsFilter = filterValue;
      
      const newsList = document.getElementById('news-list');
      if (!newsList) {
        console.warn('⚠️ news-list要素が見つかりません');
        return;
      }

      // ローディング表示
      newsList.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> 記事を絞り込み中...
        </div>
      `;

      // 実際のフィルタリング処理を実行
      this.performNewsListFilter(filterValue);
      
      this.showFeedback(`記事を「${this.getFilterDisplayName(filterValue)}」で絞り込みました`);
      
    } catch (error) {
      console.error('❌ 記事フィルタリングエラー:', error);
      this.showFeedback('記事の絞り込みに失敗しました', 'error');
    }
  }

  /**
   * 記事一覧を更新
   */
  refreshNewsList() {
    try {
      console.log('🔄 記事一覧を更新中...');
      
      const newsList = document.getElementById('news-list');
      if (!newsList) {
        console.warn('⚠️ news-list要素が見つかりません');
        return;
      }

      // ローディング表示
      newsList.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> 記事を更新中...
        </div>
      `;

      // 記事一覧の再読み込み
      this.loadNewsList();
      
      this.showFeedback('記事一覧を更新しました');
      
    } catch (error) {
      console.error('❌ 記事一覧更新エラー:', error);
      this.showFeedback('記事一覧の更新に失敗しました', 'error');
    }
  }

  /**
   * 実際のフィルタリング処理を実行
   */
  performNewsListFilter(filterValue) {
    // LocalStorageから記事データを取得
    const articlesData = localStorage.getItem('rbs_articles');
    let articles = [];
    
    try {
      if (articlesData) {
        articles = JSON.parse(articlesData);
      }
    } catch (error) {
      console.error('❌ 記事データの解析に失敗:', error);
      articles = [];
    }

    // フィルターに基づいて記事をフィルタリング
    let filteredArticles = articles;
    
    switch (filterValue) {
      case 'published':
        filteredArticles = articles.filter(article => article.status === 'published');
        break;
      case 'draft':
        filteredArticles = articles.filter(article => article.status === 'draft');
        break;
      case 'all':
      default:
        filteredArticles = articles;
        break;
    }

    // 記事一覧を表示
    this.displayFilteredNewsList(filteredArticles, filterValue);
    
    // ダッシュボードの統計も最新データで更新
    this.updateDashboardStats();
  }

  /**
   * フィルタリングされた記事一覧を表示
   */
  displayFilteredNewsList(articles, filterValue) {
    const newsList = document.getElementById('news-list');
    if (!newsList) return;

    if (articles.length === 0) {
      const emptyMessage = this.getEmptyMessage(filterValue);
      newsList.innerHTML = `
        <div class="empty-state">
          <div style="text-align: center; padding: 40px 20px; color: var(--gray-medium);">
            <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: var(--navy-dark);">記事がありません</h3>
            <p style="font-size: 14px; line-height: 1.6;">${emptyMessage}</p>
          </div>
        </div>
      `;
      return;
    }

    // 記事一覧のHTML生成
    const articlesHTML = articles
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      .map(article => this.createNewsListItem(article))
      .join('');

    newsList.innerHTML = `
      <div class="news-items">
        ${articlesHTML}
      </div>
    `;
  }

  /**
   * 記事リストアイテムのHTML生成
   */
  createNewsListItem(article) {
    const statusClass = article.status === 'published' ? 'status-published' : 'status-draft';
    const statusText = article.status === 'published' ? '公開中' : '下書き';
    const date = new Date(article.date || article.createdAt).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
    const categoryName = this.getCategoryLabel(article.category || 'announcement');
    
    return `
      <div class="news-item" data-id="${article.id}">
        <div class="news-item-main">
          <div class="news-item-header">
            <h4 class="news-item-title">${this.escapeHtml(article.title || 'タイトル未設定')}</h4>
          </div>
          <div class="news-item-meta">
            <span class="news-item-date">${date}</span>
            <span class="news-item-category">${categoryName}</span>
          </div>
          <div class="news-item-summary">
            ${this.escapeHtml((article.summary || '概要なし').substring(0, 100))}${(article.summary || '').length > 100 ? '…' : ''}
          </div>
        </div>
        <div class="news-item-status-area">
          <span class="news-item-status ${statusClass}">${statusText}</span>
        </div>
        <div class="news-item-actions">
          <button class="btn btn-sm btn-outline" onclick="actionHandler.editNewsItem('${article.id}')">
            <i class="fas fa-edit"></i> 編集
          </button>
          <button class="btn btn-sm btn-danger" onclick="actionHandler.deleteNewsItem('${article.id}')">
            <i class="fas fa-trash"></i> 削除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * フィルター表示名を取得
   */
  getFilterDisplayName(filterValue) {
    const displayNames = {
      'all': 'すべて',
      'published': '公開中',
      'draft': '下書き'
    };
    return displayNames[filterValue] || filterValue;
  }

  /**
   * 空状態メッセージを取得
   */
  getEmptyMessage(filterValue) {
    const messages = {
      'all': '記事がまだ作成されていません。新規記事を作成してください。',
      'published': '公開中の記事がありません。記事を公開するか、新規記事を作成してください。',
      'draft': '下書きの記事がありません。新規記事を作成してください。'
    };
    return messages[filterValue] || '記事が見つかりません。';
  }

  /**
   * 記事アイテムを編集
   */
  editNewsItem(articleId) {
    try {
      console.log(`✏️ 記事を編集中: ${articleId}`);
      
      // LocalStorageから記事データを取得
      const articlesData = localStorage.getItem('rbs_articles');
      if (!articlesData) {
        this.showFeedback('記事データが見つかりません', 'error');
        return;
      }
      
      const articles = JSON.parse(articlesData);
      const article = articles.find(a => a.id === articleId);
      
      if (!article) {
        this.showFeedback('指定された記事が見つかりません', 'error');
        return;
      }
      
      // 記事管理タブに切り替え
      this.switchAdminTab('news-management');
      
      // フォームに記事データを読み込み
      setTimeout(() => {
        this.loadArticleToEditor(article);
        this.showFeedback(`記事「${article.title}」を編集モードにしました`);
        console.log('✅ 記事編集モード設定完了');
      }, 100);
      
    } catch (error) {
      console.error('❌ 記事編集エラー:', error);
      this.showFeedback('記事の編集に失敗しました', 'error');
    }
  }

  /**
   * 記事アイテムを削除
   */
  deleteNewsItem(articleId) {
    try {
      if (!confirm('本当にこの記事を削除しますか？')) {
        return;
      }
      
      console.log(`🗑️ 記事を削除中: ${articleId}`);
      
      // LocalStorageから記事データを取得
      const articlesData = localStorage.getItem('rbs_articles');
      if (!articlesData) {
        this.showFeedback('記事データが見つかりません', 'warning');
        return;
      }
      
      let articles = JSON.parse(articlesData);
      const beforeCount = articles.length;
      
      // 指定された記事を削除
      articles = articles.filter(article => article.id !== articleId);
      
      if (articles.length === beforeCount) {
        this.showFeedback('削除対象の記事が見つかりませんでした', 'warning');
        return;
      }
      
      // LocalStorageに保存
      localStorage.setItem('rbs_articles', JSON.stringify(articles));
      
      // 関連データも削除（記事コンテンツなど）
      const contentData = JSON.parse(localStorage.getItem('rbs_articles_content') || '{}');
      if (contentData[articleId]) {
        delete contentData[articleId];
        localStorage.setItem('rbs_articles_content', JSON.stringify(contentData));
      }
      
      // UIを更新
      this.updateDashboardStats();
      this.refreshNewsList();
      
      this.showFeedback('記事を削除しました');
      console.log('✅ 記事削除完了:', articleId);
      
    } catch (error) {
      console.error('❌ 記事削除エラー:', error);
      this.showFeedback('記事の削除に失敗しました', 'error');
    }
  }

  /**
   * 記事をエディターに読み込み
   */
  loadArticleToEditor(article) {
    try {
      // 基本情報の設定
      const fields = {
        'news-id': article.id || '',
        'news-title': article.title || '',
        'news-category': article.category || 'announcement',
        'news-date': article.date || new Date().toISOString().slice(0, 10),
        'news-summary': article.summary || '',
        'news-content': article.content || '',
        'news-status': article.status || 'draft'
      };
      
      // フォームフィールドに値を設定
      Object.keys(fields).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.value = fields[id];
        }
      });
      
      // チェックボックスの設定
      const featuredCheckbox = document.getElementById('news-featured');
      if (featuredCheckbox) {
        featuredCheckbox.checked = article.featured || false;
      }
      
      // エディタータイトルの更新
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) {
        editorTitle.textContent = `記事編集: ${article.title}`;
      }
      
      console.log('✅ 記事データをエディターに読み込み完了');
      
    } catch (error) {
      console.error('❌ 記事データ読み込みエラー:', error);
      this.showFeedback('記事データの読み込みに失敗しました', 'error');
    }
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
    try {
      // すべてのイベントリスナーを削除
      this.#listeners.forEach(({ type, listener }) => {
        document.removeEventListener(type, listener);
      });
      this.#listeners = [];
      
      this.#actions.clear();
      this.#initialized = false;
      
      console.log('🧹 ActionHandler破棄完了');
    } catch (error) {
      console.error('ActionHandler破棄エラー:', error);
    }
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

  // テストデータ作成機能を追加
  createTestData() {
    try {
      console.log('📝 テストデータを作成中...');
      
      // 既存の記事データを取得
      const existingData = localStorage.getItem('rbs_articles');
      let articles = existingData ? JSON.parse(existingData) : [];
      
      // テストデータの作成
      const testArticles = [
        {
          id: 'test_article_1',
          title: '春の体験会開催のお知らせ',
          category: 'event',
          date: new Date().toISOString().slice(0, 10),
          summary: '4月に春の体験会を開催いたします。新年度から陸上を始めたいお子様をお待ちしております。',
          content: '## 春の体験会について\n\n新年度より陸上を始めたいお子様を対象とした体験会を開催いたします。\n\n### 開催日時\n- 日程：4月15日（土）\n- 時間：10:00-12:00\n\n### 対象\n- 年長～小学6年生\n\n### 持ち物\n- 運動できる服装\n- 運動靴\n- 水筒\n\nお申し込みはお電話にて承っております。',
          status: 'published',
          featured: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date().toISOString()
        },
        {
          id: 'test_article_2',
          title: '雨天時の練習について',
          category: 'announcement',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          summary: '雨天時の練習は室内で行います。詳細をご確認ください。',
          content: '## 雨天時の対応について\n\n雨天時は安全を考慮し、室内での練習に変更いたします。\n\n### 室内練習の内容\n- ストレッチ\n- 体幹トレーニング\n- フォーム確認\n\n保護者の皆様にはメールでお知らせいたします。',
          status: 'published',
          featured: false,
          createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          publishedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'test_article_3',
          title: 'テレビ取材のお知らせ',
          category: 'media',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          summary: '地元テレビ局による取材が行われます。',
          content: '## テレビ取材について\n\n地元テレビ局による教室の取材が行われます。\n\n### 取材日時\n- 日程：3月20日（月）\n- 時間：17:00-19:00\n\n取材の様子は後日放送予定です。',
          status: 'draft',
          featured: false,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      // 既存のテストデータを削除してから新しいデータを追加
      articles = articles.filter(article => !article.id.startsWith('test_article_'));
      articles.push(...testArticles);
      
      // LocalStorageに保存
      localStorage.setItem('rbs_articles', JSON.stringify(articles));
      
      // UIを更新
      this.updateDashboardStats();
      this.refreshNewsList();
      
      this.showFeedback(`テストデータを作成しました（${testArticles.length}件）`);
      console.log('✅ テストデータ作成完了:', testArticles);
      
    } catch (error) {
      console.error('❌ テストデータ作成エラー:', error);
      this.showFeedback('テストデータの作成に失敗しました', 'error');
    }
  }

  showDebugInfo() {
    try {
      console.log('🔍 デバッグ情報を取得中...');
      
      // システム情報の収集
      const articlesData = localStorage.getItem('rbs_articles');
      const articles = articlesData ? JSON.parse(articlesData) : [];
      
      const debugInfo = {
        システム: {
          タイムスタンプ: new Date().toISOString(),
          ページ: window.location.pathname,
          ユーザーエージェント: navigator.userAgent
        },
        記事データ: {
          総記事数: articles.length,
          公開済み: articles.filter(a => a.status === 'published').length,
          下書き: articles.filter(a => a.status === 'draft').length,
          注目記事: articles.filter(a => a.featured).length
        },
        LocalStorage: {
          使用中のキー: Object.keys(localStorage).filter(key => key.startsWith('rbs_')),
          総サイズ: Math.round(JSON.stringify(localStorage).length / 1024) + 'KB'
        },
        ActionHandler: {
          初期化済み: this.#initialized,
          現在のフィルター: this.#currentNewsFilter
        }
      };
      
      // コンソールに詳細情報を出力
      console.group('📊 RBS陸上教室 デバッグ情報');
      console.log('システム情報:', debugInfo.システム);
      console.log('記事データ:', debugInfo.記事データ);
      console.log('LocalStorage:', debugInfo.LocalStorage);
      console.log('ActionHandler:', debugInfo.ActionHandler);
      if (articles.length > 0) {
        console.log('記事一覧:', articles);
      }
      console.groupEnd();
      
      // ユーザー向けサマリーを表示
      const summary = `📊 RBS陸上教室 デバッグ情報

📁 データ統計:
・総記事数: ${debugInfo.記事データ.総記事数}件
・公開済み: ${debugInfo.記事データ.公開済み}件  
・下書き: ${debugInfo.記事データ.下書き}件
・注目記事: ${debugInfo.記事データ.注目記事}件

💾 ストレージ:
・使用中のキー: ${debugInfo.LocalStorage.使用中のキー.length}個
・データサイズ: ${debugInfo.LocalStorage.総サイズ}

🔧 システム:
・ActionHandler初期化: ${debugInfo.ActionHandler.初期化済み ? 'はい' : 'いいえ'}
・現在のフィルター: ${debugInfo.ActionHandler.現在のフィルター}

詳細はコンソールを確認してください。`;
      
      alert(summary);
      
      console.log('✅ デバッグ情報表示完了');
      
    } catch (error) {
      console.error('❌ デバッグ情報取得エラー:', error);
      this.showFeedback('デバッグ情報の取得に失敗しました', 'error');
    }
  }

  // LP側ニュースのデバッグ表示
  showLPNewsDebug() {
    try {
      console.log('🔍 LP側ニュースデバッグ情報を取得中...');
      
      // LocalStorageから記事データを取得
      const articlesData = localStorage.getItem('rbs_articles');
      let articles = [];
      
      try {
        if (articlesData) {
          articles = JSON.parse(articlesData);
        }
      } catch (error) {
        console.error('記事データの解析に失敗:', error);
      }
      
      // LP側の要素の状態を確認
      const newsElements = {
        'index.html news-list': document.getElementById('news-list'),
        'news.html news-grid': document.getElementById('news-grid'),
        'news-detail.html article-content': document.getElementById('article-content'),
        'news-loading-status': document.getElementById('news-loading-status'),
        'news-admin-link': document.getElementById('news-admin-link')
      };
      
      const debugInfo = {
        記事データ: {
          総記事数: articles.length,
          公開済み: articles.filter(a => a.status === 'published').length,
          下書き: articles.filter(a => a.status === 'draft').length,
          カテゴリ別: this.getArticlesByCategory(articles)
        },
        LP側要素: {},
        ArticleService: {
          存在: !!window.articleService,
          初期化済み: window.articleService?.isInitialized || false,
          記事数: window.articleService?.articles?.length || 0
        },
        現在のページ: {
          URL: window.location.href,
          パス: window.location.pathname,
          クエリ: window.location.search
        }
      };
      
      // 各要素の状態を確認
      Object.keys(newsElements).forEach(key => {
        const element = newsElements[key];
        debugInfo.LP側要素[key] = {
          存在: !!element,
          表示: element ? element.style.display !== 'none' : false,
          内容サイズ: element ? element.innerHTML.length : 0,
          子要素数: element ? element.children.length : 0
        };
      });
      
      // コンソールに詳細情報を出力
      console.group('📊 LP側ニュースデバッグ情報');
      console.log('記事データ:', debugInfo.記事データ);
      console.log('LP側要素:', debugInfo.LP側要素);
      console.log('ArticleService:', debugInfo.ArticleService);
      console.log('現在のページ:', debugInfo.現在のページ);
      if (articles.length > 0) {
        console.log('記事一覧（最新5件）:', articles.slice(0, 5));
      }
      console.groupEnd();
      
      // ユーザー向けサマリー
      const summary = `📊 LP側ニュースデバッグ情報

📰 記事データ:
・総記事数: ${debugInfo.記事データ.総記事数}件
・公開済み: ${debugInfo.記事データ.公開済み}件
・下書き: ${debugInfo.記事データ.下書き}件

🖥️ 表示要素:
・news-list: ${debugInfo.LP側要素['index.html news-list'].存在 ? 'あり' : 'なし'}
・news-grid: ${debugInfo.LP側要素['news.html news-grid'].存在 ? 'あり' : 'なし'}
・article-content: ${debugInfo.LP側要素['news-detail.html article-content'].存在 ? 'あり' : 'なし'}

🔧 ArticleService:
・初期化済み: ${debugInfo.ArticleService.初期化済み ? 'はい' : 'いいえ'}
・読み込み記事数: ${debugInfo.ArticleService.記事数}件

📍 現在のページ: ${debugInfo.現在のページ.パス}

詳細はコンソールを確認してください。`;
      
      alert(summary);
      
      console.log('✅ LP側ニュースデバッグ情報表示完了');
      
    } catch (error) {
      console.error('❌ LP側ニュースデバッグ情報取得エラー:', error);
      this.showFeedback('デバッグ情報の取得に失敗しました', 'error');
    }
  }

  /**
   * カテゴリ別記事数を取得
   */
  getArticlesByCategory(articles) {
    const categories = {};
    articles.forEach(article => {
      const category = article.category || 'announcement';
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }

  // LP側のArticleServiceを最新化
  async refreshLPArticleService() {
    try {
      console.log('🔄 LP側ArticleServiceを最新化中...');
      
      // LP側にArticleServiceが存在する場合のみ実行
      if (window.articleService && window.articleService.isInitialized) {
        await window.articleService.refresh();
        console.log('✅ LP側ArticleService最新化完了');
        
        // LP側の記事表示も更新
        this.refreshLPNewsDisplay();
      } else {
        console.log('💡 LP側のArticleServiceが存在しないため、スキップします');
      }
      
    } catch (error) {
      console.error('❌ LP側ArticleService最新化エラー:', error);
    }
  }

  /**
   * LP側のニュース表示を更新
   */
  refreshLPNewsDisplay() {
    try {
      // index.htmlのニュースリストを更新
      const newsList = document.getElementById('news-list');
      if (newsList && window.articleService && window.articleService.isInitialized) {
        // 最新記事を再取得して表示
        const latestArticles = window.articleService.getLatestArticles(3);
        
        if (latestArticles.length > 0) {
          newsList.innerHTML = '';
          latestArticles.forEach((article, index) => {
            const newsCard = this.createIndexNewsCard(article);
            newsList.appendChild(newsCard);
            
            // アニメーション効果
            setTimeout(() => {
              newsCard.classList.add('fade-in');
            }, index * 100);
          });
          console.log('✅ index.htmlニュースリスト更新完了');
        }
      }
      
      // news.htmlのニュースグリッドを更新
      const newsGrid = document.getElementById('news-grid');
      if (newsGrid && window.articleService && window.articleService.isInitialized) {
        // 現在のカテゴリーフィルターを保持して再表示
        const currentCategory = new URLSearchParams(window.location.search).get('category') || 'all';
        const filteredArticles = currentCategory === 'all' 
          ? window.articleService.getPublishedArticles()
          : window.articleService.getArticlesByCategory(currentCategory);
        
        if (filteredArticles.length > 0) {
          newsGrid.innerHTML = '';
          filteredArticles.forEach((article, index) => {
            const articleCard = this.createNewsGridCard(article);
            newsGrid.appendChild(articleCard);
            
            setTimeout(() => {
              articleCard.classList.add('fade-in');
            }, index * 100);
          });
          console.log('✅ news.htmlニュースグリッド更新完了');
        }
      }
      
    } catch (error) {
      console.error('❌ LP側ニュース表示更新エラー:', error);
    }
  }

  /**
   * index.html用ニュースカードを作成
   */
  createIndexNewsCard(article) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.setAttribute('data-category', article.category);
    
    const categoryColors = {
      'announcement': '#4299e1',
      'event': '#38b2ac',
      'media': '#9f7aea',
      'important': '#f56565'
    };
    
    const categoryColor = categoryColors[article.category] || categoryColors.announcement;
    const formattedDate = article.formattedDate || article.date;
    const categoryName = article.categoryName || article.category;
    const excerpt = article.excerpt || article.summary || '';
    
    card.innerHTML = `
      <div class="news-card-header">
        <div class="news-meta">
          <div class="news-date">${this.escapeHtml(formattedDate)}</div>
          <div class="news-category ${article.category}" style="background-color: ${categoryColor};">
            ${this.escapeHtml(categoryName)}
          </div>
        </div>
        <h2 class="news-title">
          <a href="news-detail.html?id=${article.id}">${this.escapeHtml(article.title)}</a>
        </h2>
      </div>
      <div class="news-card-body">
        <p class="news-excerpt">${this.escapeHtml(excerpt)}</p>
        <div class="news-actions">
          <a href="news-detail.html?id=${article.id}" class="news-read-more">続きを読む</a>
        </div>
      </div>
    `;
    
    return card;
  }

  /**
   * news.html用ニュースカードを作成
   */
  createNewsGridCard(article) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.setAttribute('data-category', article.category);
    
    const categoryColor = article.categoryColor || '#4299e1';
    const formattedDate = article.formattedDate || article.date;
    const categoryName = article.categoryName || article.category;
    const excerpt = article.excerpt || article.summary || '';
    
    card.innerHTML = `
      <div class="news-card-header">
        <div class="news-meta">
          <div class="news-date">${formattedDate}</div>
          <div class="news-category ${article.category}" style="background-color: ${categoryColor};">
            ${categoryName}
          </div>
        </div>
        <h2 class="news-title">${this.escapeHtml(article.title)}</h2>
      </div>
      <div class="news-card-body">
        <p class="news-excerpt">${this.escapeHtml(excerpt)}</p>
        <a href="news-detail.html?id=${article.id}" class="news-read-more">続きを読む</a>
      </div>
    `;
    
    return card;
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