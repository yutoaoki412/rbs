/**
 * 管理画面アクションサービス
 * ボタンクリックやフォーム送信などのユーザーアクションを処理
 * @version 3.0.0 - 統合アクション管理システム
 */

import { actionManager } from '../../../core/ActionManager.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { getArticleDataService } from './ArticleDataService.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { dataExportService } from '../../../shared/services/DataExportService.js';
import { uiManagerService } from './UIManagerService.js';

export class AdminActionService {
  constructor() {
    this.componentName = 'AdminActionService';
    this.actionEventPrefix = 'admin-action';
    
    // サービス参照
    this.articleDataService = null;
    this.articleStorageService = null;
    this.lessonStatusService = null;
    this.instagramDataService = null;
    this.authService = null;
    this.uiManagerService = null;
    this.dataExportService = null;
    
    // 統一ストレージキー（CONFIG.storage.keysから完全統一）
    this.storageKeys = {
      // LP側と共有
      articles: CONFIG.storage.keys.articles,
      content: CONFIG.storage.keys.content,
      config: CONFIG.storage.keys.config,
      auth: CONFIG.storage.keys.auth,
      lessonStatus: CONFIG.storage.keys.lessonStatus,
      settings: CONFIG.storage.keys.settings,
      
      // 管理画面専用（修正済み）
      adminAuth: CONFIG.storage.keys.adminAuth,
      adminTab: CONFIG.storage.keys.adminTab,
      adminLogs: CONFIG.storage.keys.adminLogs,
      debugMode: CONFIG.storage.keys.debugMode,
      sessionStart: CONFIG.storage.keys.sessionStart,
      
      // 機能別
      newsDraft: CONFIG.storage.keys.newsDraft,
      
      // データ管理
      exportHistory: CONFIG.storage.keys.exportHistory,
      
      // Instagram連携
      instagram: CONFIG.storage.keys.instagram,
      
      // 認証関連
      authAttempts: CONFIG.storage.keys.authAttempts,
      authLastAttempt: CONFIG.storage.keys.authLastAttempt
    };
    
    // アクション定義（プロパティ用・デバッグ用）
    this.actionsList = [
      'switch-admin-tab', 'switch-news-tab', 'clear-news-editor', 'new-news-article',
      'preview-news', 'save-news', 'publish-news', 'test-article-service',
      'filter-news-list', 'refresh-news-list', 'refresh-recent-articles',
      'insert-markdown', 'show-writing-guide', 'edit-article', 'delete-article',
      'preview-article', 'duplicate-article', 'load-lesson-status', 'update-lesson-status',
      'toggle-notification-mode', 'export-data', 'clear-all-data', 'test-site-connection',
      'reset-local-storage', 'show-debug-info', 'show-news-debug', 'close-modal',
      'open-external', 'toggle-mobile-menu', 'logout'
    ];
  }

  /**
   * 初期化
   */
  async init() {
    try {
      console.log('👨‍💼 AdminActionService 初期化開始');
      
      // ActionManagerの確実な初期化を待機
      if (!actionManager.initialized) {
        actionManager.init();
        console.log('🔧 ActionManager を初期化しました');
      }
      
      // 認証サービスの初期化
      if (!this.authService) {
        const { authService } = await import('../../auth/services/AuthService.js');
        this.authService = authService;
      }

      // 認証サービスが初期化されていない場合は初期化
      if (!this.authService.initialized) {
        await this.authService.init();
      }

      // サービス依存関係を初期化
      await this.initializeServices();
      
      // UI設定
      await this.setupAdminUI();
      
      // セッション情報更新のコールバックを登録
      this.authService.onSessionInfoUpdate((sessionInfo) => {
        this.updateSessionInfoDisplay(sessionInfo);
      });

      // ログアウトコールバックを登録
      this.authService.onLogout(() => {
        this.handleAuthLogout();
      });
      
      this.initialized = true;
      console.log('✅ AdminActionService 初期化完了');
      
    } catch (error) {
      this.error('AdminActionService 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 通知システムのテスト
   * @private
   */
  testNotificationSystem() {
    if (!this.uiManagerService) {
      console.warn('通知システムが利用できません');
      return;
    }
    
    // 3秒後にテスト通知を表示
    setTimeout(() => {
      this.info('通知システムが正常に動作しています');
    }, 3000);
    
    console.log('📢 通知システムのテストを開始しました');
  }

  /**
   * サービス初期化
   * @private
   */
  async initializeServices() {
    // アクションマネージャーを設定（既にファイル冒頭でインポート済み）
    this.actionManager = actionManager;
    
    // サービス依存関係の取得
    const { getArticleDataService } = await import('./ArticleDataService.js');
    const { getLessonStatusStorageService } = await import('../../../shared/services/LessonStatusStorageService.js');
    
    this.articleDataService = getArticleDataService();
    this.lessonStatusService = getLessonStatusStorageService();
     
    // InstagramDataServiceのインポートと初期化
    const { instagramDataService } = await import('./InstagramDataService.js');
    this.instagramDataService = instagramDataService;
    
    // UIManagerServiceのインポートと初期化
    const { uiManagerService } = await import('./UIManagerService.js');
    this.uiManagerService = uiManagerService;
    
    // NewsFormManagerのインポートと初期化
    const { newsFormManager } = await import('../components/NewsFormManager.js');
    this.newsFormManager = newsFormManager;
    
    // サービスの初期化確認
    if (!this.articleDataService.initialized) {
      await this.articleDataService.init();
    }
     
    if (!this.lessonStatusService.initialized) {
      await this.lessonStatusService.init();
    }
    
    if (!this.instagramDataService.initialized) {
      this.instagramDataService.init();
    }
    
    if (!this.uiManagerService.initialized) {
      this.uiManagerService.init();
    }
    
    if (!this.newsFormManager.initialized) {
      this.newsFormManager.init();
    }
    
    this.log('全サービス初期化完了');
  }

  /**
   * データエクスポートサービスのセットアップ
   * @private
   */
  async setupDataExportService() {
    try {
      const { DataExportService } = await import('../../../shared/services/DataExportService.js');
      
      this.dataExportService = new DataExportService();
      await this.dataExportService.init();
      
      this.debug('DataExportService設定完了');
    } catch (error) {
      this.error('DataExportServiceの設定に失敗しました:', error);
    }
  }

  /**
   * 管理画面アクションを登録
   * @private
   */
  #registerAdminActions() {
    console.log('🔧 管理画面アクション登録開始');
    
    if (!this.actionManager) {
      this.error('ActionManagerが初期化されていません');
      return;
    }

    // ActionManagerの状態確認
    console.log('🔍 ActionManager状態:', {
      initialized: this.actionManager.initialized,
      actionsCount: this.actionManager._actions?.size || 0
    });

    const adminActions = {
      // 認証関連はAuthServiceで処理（責任の分離）
      
      // タブ切り替え（優先度高） - HTMLのdata-action="switch-admin-tab"に対応
      'switch-admin-tab': async (element, params) => {
        console.log('🎯 switch-admin-tabアクション実行:', { element, params });
        
        const tabName = params?.tab || element?.dataset?.tab;
        console.log('🔍 取得したタブ名:', tabName);
        
        if (!tabName) {
          console.error('❌ タブ名が取得できません:', { params, dataset: element?.dataset });
          this.#showFeedback('タブ名が指定されていません', 'error');
          return;
        }
        
        if (this.#isValidTabName(tabName)) {
          console.log(`🚀 タブ切り替え実行: ${tabName}`);
          await this.switchAdminTab(tabName);
        } else {
          console.error(`❌ 無効なタブ名: ${tabName}`);
          this.#showFeedback(`無効なタブ名: ${tabName}`, 'error');
        }
      },

      // 記事管理
      'clear-news-editor': () => {
        if (confirm('記事エディターの内容をクリアしますか？')) {
          this.clearNewsEditor();
        }
      },
      'new-news-article': () => this.startNewArticle(),
      'preview-news': () => this.previewNews(),
      'save-news': () => this.saveNews(),
      'publish-news': () => this.publishNews(),
      'test-article-service': () => this.testArticleService(),
      'filter-news-list': (element, params) => this.filterNewsList(element, params),
      'refresh-news-list': () => this.refreshNewsList(),
      'refresh-recent-articles': () => this.refreshRecentArticles(),
      'insert-markdown': (element, params) => this.insertMarkdown(element, params),
      'switch-news-tab': (element, params) => this.switchNewsTab(params.tab),
      'show-writing-guide': () => this.#showWritingGuide(),
      
      // 記事編集関連（新しく追加）
      'edit-article': (element, params) => {
        const articleId = params.articleId || element.dataset.articleId;
        if (articleId) {
          this.editArticle(articleId);
        } else {
          this.#showFeedback('記事IDが見つかりません', 'error');
        }
      },
      'delete-article': async (element, params) => {
        const articleId = params.articleId || element.dataset.articleId;
        if (articleId) {
          await this.deleteArticle(articleId);
        } else {
          this.#showFeedback('記事IDが見つかりません', 'error');
        }
      },
      'preview-article': (element, params) => {
        const articleId = params.articleId || element.dataset.articleId;
        if (articleId) {
          this.previewArticleById(articleId);
        } else {
          this.#showFeedback('記事IDが見つかりません', 'error');
        }
      },
      'duplicate-article': async (element, params) => {
        const articleId = params.articleId || element.dataset.articleId;
        if (articleId) {
          await this.duplicateArticle(articleId);
        } else {
          this.#showFeedback('記事IDが見つかりません', 'error');
        }
      },

      // レッスン状況
      'load-lesson-status': () => this.loadLessonStatus(),
      'update-lesson-status': () => this.updateLessonStatus(),

      // 通知設定
      'toggle-notification-mode': () => this.toggleNotificationMode(),

      // データ管理
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

      // システム管理
      'test-site-connection': () => this.testSiteConnection(),
      'reset-local-storage': () => {
        if (confirm('LocalStorageをリセットしますか？')) {
          this.resetLocalStorage();
        }
      },
      'show-debug-info': () => this.showDebugInfo(),
      'show-news-debug': () => this.showNewsDebug(),
      'close-modal': () => this.closeModal(),
      'open-external': (element, params) => this.openExternalUrl(params.url),

      // 認証関連
      'logout': () => this.handleAuthLogout(),

      // UIイベント
      'toggle-mobile-menu': (element) => this.toggleMobileMenu(element)
    };

    // アクションを登録
    try {
      this.actionManager.registerMultiple(adminActions);
      console.log('✅ 管理画面アクション登録完了');
      console.log('🔍 登録されたアクション数:', Object.keys(adminActions).length);
      
      // 登録確認
      const registeredActions = Array.from(this.actionManager._actions?.keys() || []);
      console.log('🔍 ActionManagerに登録済みのアクション:', registeredActions);
      
    } catch (error) {
      console.error('❌ 管理画面アクション登録エラー:', error);
      this.error('管理画面アクション登録に失敗しました:', error);
    }
  }

  /**
   * UIイベントの設定
   * @private
   */
  setupUIEvents() {
    // レガシーEventBusイベントのマッピング（必要に応じて）
    EventBus.on('admin:needsRefresh', () => {
      this.refreshNewsList();
      this.refreshRecentArticles();
    });
    
    EventBus.on('admin:dataChanged', () => {
      this.refreshNewsList();
    });
    
    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
    
    // モーダル背景クリックで閉じる
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
        this.closeModal();
      }
    });
    
    this.log('UIイベント設定完了');
  }

  /**
   * 管理画面固有の初期化
   * @private
   */
  async setupAdminUI() {
    try {
      // アクション登録
      this.#registerAdminActions();
      
      // UIイベント設定
      this.setupUIEvents();
      
      // タブナビゲーション設定
      this.setupTabNavigation();

      // 管理画面固有のUI初期化
      await this.initializeTabContent('dashboard');

      // 最新統計の更新
      this.updateDashboardStats();
      this.updateAdminStats();
      
      this.log('管理画面UI設定完了');
    } catch (error) {
      this.error('管理画面UI設定エラー:', error);
      throw error;
    }
  }

  /**
   * サービスの初期化完了を待機
   * @private
   */
  async #waitForServicesReady() {
    const maxRetries = 10;
    const retryDelay = 100;
    
    for (let i = 0; i < maxRetries; i++) {
      if (this.articleDataService?.initialized && 
          this.lessonStatusService?.initialized &&
          this.uiManagerService?.initialized) {
        return true;
      }
      
      this.debug(`サービス初期化待機中... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    this.warn('一部のサービスの初期化が完了していません');
    return false;
  }

  /**
   * 管理画面タブ切り替え
   * @param {string} tabName - タブ名
   */
  async switchAdminTab(tabName) {
    console.log(`🔄 管理画面タブ切り替え開始: ${tabName}`);
    
    // バリデーション
    if (!this.#isValidTabName(tabName)) {
      console.error(`❌ 無効なタブ名: ${tabName}`);
      this.#showFeedback(`無効なタブ名: ${tabName}`, 'error');
      return;
    }

    try {
      // 現在のアクティブタブを取得
      const currentActiveTab = document.querySelector('.admin-section.active');
      const currentActiveNavItem = document.querySelector('.nav-item.active');
      
      console.log('🔍 現在のアクティブ要素:', {
        tab: currentActiveTab?.id,
        nav: currentActiveNavItem?.dataset?.tab
      });
      
      // アクティブ状態をクリア
      if (currentActiveTab) {
        currentActiveTab.classList.remove('active');
        console.log(`📤 旧タブ非アクティブ: ${currentActiveTab.id}`);
      }
      if (currentActiveNavItem) {
        currentActiveNavItem.classList.remove('active');
        console.log(`📤 旧ナビ非アクティブ: ${currentActiveNavItem.dataset.tab}`);
      }
      
      // 新しいタブとナビアイテムを取得
      const newActiveTab = document.getElementById(tabName);
      const newActiveNavItem = document.querySelector(`[data-tab="${tabName}"]`);
      
      console.log('🔍 新しいアクティブ要素:', {
        tab: newActiveTab?.id,
        nav: newActiveNavItem?.dataset?.tab,
        tabExists: !!newActiveTab,
        navExists: !!newActiveNavItem
      });
      
      // 要素の存在確認
      if (!newActiveTab) {
        console.error(`❌ タブセクションが見つかりません: #${tabName}`);
        this.#showFeedback(`タブセクション "${tabName}" が見つかりません`, 'error');
        return;
      }
      
      if (!newActiveNavItem) {
        console.error(`❌ ナビゲーションアイテムが見つかりません: [data-tab="${tabName}"]`);
        this.#showFeedback(`ナビゲーションアイテム "${tabName}" が見つかりません`, 'error');
        return;
      }
      
      // アクティブ状態を設定
      newActiveTab.classList.add('active');
      newActiveNavItem.classList.add('active');
      
      console.log(`📥 新タブアクティブ: ${newActiveTab.id}`);
      console.log(`📥 新ナビアクティブ: ${newActiveNavItem.dataset.tab}`);
      
      // 記事管理タブの場合は全体スクロール用のクラスを追加
      const adminMain = document.querySelector('.admin-main');
      if (adminMain) {
        if (tabName === 'news-management') {
          adminMain.classList.add('news-management-active');
          console.log('📄 記事管理タブ: 全体スクロールモード有効');
        } else {
          adminMain.classList.remove('news-management-active');
          console.log('📱 他のタブ: 固定高さモード');
        }
      }
      
      // タブ状態を統一ストレージキーで保存
      localStorage.setItem(this.storageKeys.adminTab, tabName);
      console.log(`💾 タブ状態保存: ${tabName}`);
      
      // タブ固有の初期化処理（非同期）
      await this.initializeTabContent(tabName);
      this.currentTab = tabName;
      
      // 成功通知
      const tabDisplayName = this.#getTabDisplayName(tabName);
      console.log(`✅ ${tabDisplayName}に切り替え完了`);
      this.#showFeedback(`${tabDisplayName}に切り替えました`, 'info', 2000);
      
    } catch (error) {
      console.error(`❌ タブ切り替えエラー (${tabName}):`, error);
      this.#showFeedback(`タブの切り替えに失敗しました: ${error.message}`, 'error');
    }
  }

  /**
   * タブ固有の初期化処理
   * @param {string} tabName - タブ名
   */
  async initializeTabContent(tabName) {
    console.log(`🔧 タブコンテンツ初期化: ${tabName}`);
    
    try {
      switch (tabName) {
        case 'dashboard':
          await this.#initializeDashboard();
          break;
        case 'news-management':
          await this.#initializeNewsManagement();
          break;
        case 'lesson-status':
          await this.#initializeLessonStatus();
          break;
        case 'settings':
          await this.#initializeSettings();
          break;
      }
    } catch (error) {
      this.error(`タブ初期化エラー (${tabName}):`, error);
    }
  }

  /**
   * 有効なタブ名かチェック
   * @private
   * @param {string} tabName - タブ名
   * @returns {boolean}
   */
  #isValidTabName(tabName) {
    return ['dashboard', 'news-management', 'lesson-status', 'settings'].includes(tabName);
  }

  /**
   * タブ表示名を取得
   * @private
   * @param {string} tabName - タブ名
   * @returns {string}
   */
  #getTabDisplayName(tabName) {
    const tabNames = {
      'dashboard': 'ダッシュボード',
      'news-management': '記事管理',
      'lesson-status': 'レッスン状況',
      'settings': '設定'
    };
    return tabNames[tabName] || tabName;
  }

  /**
   * ダッシュボードの初期化
   * @private
   */
  async #initializeDashboard() {
    try {
      this.debug('🏠 ダッシュボード初期化開始');
      
      // 記事データサービスの初期化を確認
      await this.#ensureArticleDataReady();
      
      // 最近の記事と統計情報の読み込み
      await Promise.all([
        this.#loadRecentArticlesWithRetry(),
        this.#updateStats()
      ]);
      
      this.debug('✅ ダッシュボード初期化完了');
      
    } catch (error) {
      this.error('❌ ダッシュボード初期化エラー:', error);
      // エラーが発生してもアプリケーション全体は停止させない
    }
  }

  /**
   * 記事データの準備状態を確保
   * @private
   */
  async #ensureArticleDataReady() {
    const maxRetries = 5;
    const retryDelay = 200;
    
    for (let i = 0; i < maxRetries; i++) {
      if (this.articleDataService?.initialized) {
        return true;
      }
      
      this.debug(`記事データサービス準備待機中... (${i + 1}/${maxRetries})`);
      
      // 初期化されていない場合は再初期化を試行
      if (this.articleDataService && !this.articleDataService.initialized) {
        try {
          await this.articleDataService.init();
        } catch (error) {
          this.warn('記事データサービス再初期化失敗:', error);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    throw new Error('記事データサービスの初期化がタイムアウトしました');
  }

  /**
   * 最近の記事をリトライ付きで読み込み
   * @private
   */
  async #loadRecentArticlesWithRetry() {
    const maxRetries = 3;
    const retryDelay = 500;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.refreshRecentArticles();
        this.debug('最近の記事読み込み成功');
        return;
      } catch (error) {
        this.warn(`最近の記事読み込み試行 ${i + 1}/${maxRetries} 失敗:`, error);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // 最終的に失敗した場合はエラー状態を表示
    this.#showRecentArticlesError();
  }

  /**
   * 最近の記事のエラー状態を表示
   * @private
   */
  #showRecentArticlesError() {
    const recentContainer = document.getElementById('recent-articles');
    if (recentContainer) {
      recentContainer.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>記事の読み込みでエラーが発生しました</p>
          <button class="btn btn-sm btn-outline" data-action="refresh-recent-articles">
            <i class="fas fa-sync-alt"></i> 再試行
          </button>
        </div>
      `;
    }
  }

  /**
   * ニュース管理初期化
   * @private
   */
  async #initializeNewsManagement() {
    try {
      this.debug('📝 ニュース管理初期化開始');
      
      // 記事データサービスの準備を確認
      await this.#ensureArticleDataReady();
      
      // フォームをクリアして新規記事作成状態にする
      this.clearNewsEditor();
      
      // 記事一覧を更新
      this.refreshNewsList();
      
      this.debug('📝 ニュース管理初期化完了');
    } catch (error) {
      this.error('ニュース管理初期化エラー:', error);
    }
  }

  /**
   * レッスン状況初期化
   * @private
   */
  async #initializeLessonStatus() {
    try {
      this.debug('📅 レッスン状況初期化開始');
      
      // 今日の日付を自動設定
      const today = new Date().toISOString().slice(0, 10);
      const dateField = document.getElementById('lesson-date');
      if (dateField && !dateField.value) {
        dateField.value = today;
      }
      
      // 自動的に今日のレッスン状況を読み込み
      await this.loadLessonStatus();
      
      this.debug('📅 レッスン状況初期化完了');
    } catch (error) {
      this.error('レッスン状況初期化エラー:', error);
    }
  }

  /**
   * 設定初期化
   * @private
   */
  async #initializeSettings() {
    try {
      this.debug('⚙️ 設定タブ初期化開始');
      
      // データエクスポートサービスのセットアップ（まだでなければ）
      if (!this.dataExportService) {
        await this.setupDataExportService();
      }
      
      this.debug('⚙️ 設定タブ初期化完了');
    } catch (error) {
      this.error('設定初期化エラー:', error);
    }
  }

  // === 記事管理関連メソッド ===

  /**
   * 記事エディターをクリア
   */
  clearNewsEditor() {
    try {
      // フォームフィールドをクリア
      const titleField = document.getElementById('news-title');
      const categoryField = document.getElementById('news-category');
      const dateField = document.getElementById('news-date');
      const statusField = document.getElementById('news-status');
      const summaryField = document.getElementById('news-summary');
      const contentField = document.getElementById('news-content');
      const featuredField = document.getElementById('news-featured');
      const idField = document.getElementById('news-id');

      if (titleField) titleField.value = '';
      if (categoryField) categoryField.value = 'announcement';
      if (dateField) dateField.value = '';
      if (statusField) statusField.value = 'draft';
      if (summaryField) summaryField.value = '';
      if (contentField) contentField.value = '';
      if (featuredField) featuredField.checked = false;
      if (idField) idField.value = '';

      // エディタータイトルを更新
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) {
        editorTitle.textContent = '新規記事作成';
      }

      // ユーザーアクションなので通知を表示
      this.#showFeedback('記事エディターをクリアしました');
      console.log('📝 記事エディターをクリア');

    } catch (error) {
      console.error('❌ 記事エディタークリアエラー:', error);
      this.#showFeedback('エディターのクリアに失敗しました', 'error');
    }
  }

  /**
   * 記事プレビュー
   */
  async previewNews() {
    try {
      console.log('👁️ 記事プレビュー開始');
      
      // フォームデータを取得
      const formData = this.#getNewsFormData();
      
      if (!formData.title.trim()) {
        this.#showFeedback('タイトルが入力されていません', 'error');
        return;
      }
      
      if (!formData.content.trim()) {
        this.#showFeedback('本文が入力されていません', 'error');
        return;
      }
      
      // プレビューモーダルを作成・表示
      this.#showNewsPreviewModal(formData);
      
      // ユーザーアクションなので通知を表示
      this.#showFeedback('プレビューを表示しました');
      
    } catch (error) {
      console.error('❌ 記事プレビューエラー:', error);
      this.#showFeedback('プレビューの表示に失敗しました', 'error');
    }
  }

  /**
   * 記事保存
   */
  async saveNews() {
    try {
      const articleData = this.#getArticleDataFromForm();
      
      if (!this.#validateArticleData(articleData)) {
        return;
      }

      const result = await this.articleDataService.saveArticle(articleData, false);
      
      if (result.success) {
        // フォームに記事IDを設定
        const idField = document.getElementById('news-id');
        if (idField && result.id) {
          idField.value = result.id;
        }

        // ボタンアクション用のイベントを発行（通知表示用）
        EventBus.emit('button:article:saved', { 
          title: articleData.title,
          id: result.id 
        });
        
        console.log('💾 記事を保存:', result);
      } else {
        this.#showFeedback(result.message || '保存に失敗しました', 'error');
      }

    } catch (error) {
      console.error('❌ 記事保存エラー:', error);
      this.#showFeedback('記事の保存中にエラーが発生しました', 'error');
    }
  }

  /**
   * 記事公開
   */
  async publishNews() {
    try {
      const articleData = this.#getArticleDataFromForm();
      
      if (!this.#validateArticleData(articleData)) {
        return;
      }

      const result = await this.articleDataService.saveArticle(articleData, true);
      
      if (result.success) {
        // フォームに記事IDを設定
        const idField = document.getElementById('news-id');
        if (idField && result.id) {
          idField.value = result.id;
        }

        // ステータスフィールドを更新
        const statusField = document.getElementById('news-status');
        if (statusField) {
          statusField.value = 'published';
        }

        // ボタンアクション用のイベントを発行（通知表示用）
        EventBus.emit('button:article:published', { 
          title: articleData.title,
          id: result.id 
        });
        
        console.log('📤 記事を公開:', result);
      } else {
        this.#showFeedback(result.message || '公開に失敗しました', 'error');
      }

    } catch (error) {
      console.error('❌ 記事公開エラー:', error);
      this.#showFeedback('記事の公開中にエラーが発生しました', 'error');
    }
  }

  /**
   * ArticleService テスト
   */
  async testArticleService() {
    try {
      console.log('🧪 ArticleService 連携テスト開始');
      
      // サービス状態確認
      const status = this.articleDataService.getStatus();
      console.log('📊 ArticleService ステータス:', status);
      
      // 記事数取得
      const articles = this.articleDataService.loadArticles();
      console.log('📰 記事数:', articles.length);
      
      // 統計情報取得
      const stats = this.articleDataService.getStats();
      console.log('📈 統計情報:', stats);
      
      this.#showFeedback(`連携テスト完了 - 記事数: ${articles.length}件`);
      
    } catch (error) {
      console.error('❌ ArticleService テストエラー:', error);
      this.#showFeedback('連携テストに失敗しました', 'error');
    }
  }

  /**
   * Markdownテキスト挿入
   */
  insertMarkdown(element, params) {
    try {
      const contentField = document.getElementById('news-content');
      if (!contentField) return;

      const start = contentField.selectionStart;
      const end = contentField.selectionEnd;
      const selectedText = contentField.value.substring(start, end);
      
      const beforeText = params.start || '';
      const afterText = params.end || '';
      
      let newText;
      if (selectedText) {
        newText = beforeText + selectedText + afterText;
      } else {
        newText = beforeText + afterText;
      }
      
      const beforeSelection = contentField.value.substring(0, start);
      const afterSelection = contentField.value.substring(end);
      
      contentField.value = beforeSelection + newText + afterSelection;
      
      // カーソル位置を調整
      const newCursorPos = start + beforeText.length + selectedText.length;
      contentField.setSelectionRange(newCursorPos, newCursorPos);
      contentField.focus();
      
      console.log('📝 Markdownテキストを挿入:', { start: beforeText, end: afterText });
      
    } catch (error) {
      console.error('❌ Markdownテキスト挿入エラー:', error);
    }
  }

  // === ニュース一覧管理メソッド ===

  /**
   * ニュース一覧フィルタリング
   */
  filterNewsList(element, params) {
    try {
      const filterValue = element?.value || 'all';
      console.log('🔍 ニュース一覧フィルタリング:', filterValue);
      
      this.#renderNewsList(filterValue);
      
    } catch (error) {
      console.error('❌ ニュース一覧フィルタリングエラー:', error);
    }
  }

  /**
   * ニュース一覧更新
   */
  refreshNewsList() {
    try {
      console.log('🔄 ニュース一覧更新');
      this.#renderNewsList();
      // 内部処理なので通知は表示しない（コンソールログのみ）
      console.log('✅ ニュース一覧更新完了');
      
    } catch (error) {
      console.error('❌ ニュース一覧更新エラー:', error);
      this.#showFeedback('一覧の更新に失敗しました', 'error');
    }
  }

  /**
   * 最近の記事更新
   */
  async refreshRecentArticles() {
    try {
      console.log('🔄 最近の記事更新開始');
      
      // ローディング状態を表示
      this.#showRecentArticlesLoading();
      
      // 記事データサービスの準備を確認
      await this.#ensureArticleDataReady();
      
      // 記事をレンダリング
      await this.#renderRecentArticles();
      
      // 内部処理なので通知は表示しない（コンソールログのみ）
      console.log('✅ 最近の記事更新完了');
      
    } catch (error) {
      console.error('❌ 最近の記事更新エラー:', error);
      this.#showRecentArticlesError();
    }
  }

  /**
   * 最近の記事のローディング状態を表示
   * @private
   */
  #showRecentArticlesLoading() {
    const recentContainer = document.getElementById('recent-articles');
    if (recentContainer) {
      recentContainer.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          記事を読み込み中...
        </div>
      `;
    }
  }

  // === レッスン状況管理メソッド ===

  /**
   * レッスン状況読み込み
   */
  async loadLessonStatus() {
    try {
      console.log('📚 レッスン状況読み込み');
      
      // 今日の日付を取得
      const today = new Date().toISOString().slice(0, 10);
      const dateField = document.getElementById('lesson-date');
      
      // 日付フィールドが空の場合は今日の日付を設定
      if (dateField && !dateField.value) {
        dateField.value = today;
      }
      
      const targetDate = dateField?.value || today;
      const status = await this.lessonStatusService.getCurrentStatus(targetDate);
      
      if (status.success) {
        this.#loadLessonStatusToForm(status);
        this.#showFeedback(`${targetDate} のレッスン状況を読み込みました`);
      } else {
        // データが存在しない場合はデフォルト状態にリセット
        this.#setDefaultLessonStatusForm(targetDate);
        this.#showFeedback(`${targetDate} の新しいレッスン状況を作成中です`, 'info');
      }
      
    } catch (error) {
      console.error('❌ レッスン状況読み込みエラー:', error);
      this.#showFeedback('レッスン状況の読み込みに失敗しました', 'error');
      
      // エラー時もデフォルト状態にリセット
      const today = new Date().toISOString().slice(0, 10);
      this.#setDefaultLessonStatusForm(today);
    }
  }

  /**
   * デフォルトのレッスン状況フォーム設定
   * @private
   * @param {string} date - 対象日付
   */
  #setDefaultLessonStatusForm(date) {
    // 日付設定
    const dateField = document.getElementById('lesson-date');
    if (dateField) dateField.value = date;
    
    // グローバルメッセージクリア
    const messageField = document.getElementById('global-message');
    if (messageField) messageField.value = '';
    
    // 全ステータスを「通常開催」にリセット
    const scheduledRadios = [
      'input[name="global-status"][value="scheduled"]',
      'input[name="basic-lesson"][value="通常開催"]',
      'input[name="advance-lesson"][value="通常開催"]'
    ];
    
    scheduledRadios.forEach(selector => {
      const radio = document.querySelector(selector);
      if (radio) radio.checked = true;
    });
  }

  /**
   * レッスン状況更新
   */
  async updateLessonStatus() {
    try {
      // フォームデータの取得とバリデーション
      const statusData = this.#getLessonStatusFromForm();
      
      if (!this.#validateLessonStatusData(statusData)) {
        return; // バリデーションエラーのメッセージは#validateLessonStatusData内で表示
      }
      
      console.log('📝 レッスン状況更新:', statusData);
      
      // 保存前の確認
      const confirmMessage = `${statusData.date} のレッスン状況を更新しますか？\n\n` +
        `全体ステータス: ${this.#mapStatusKeyToJapanese(statusData.globalStatus)}\n` +
        `ベーシックコース: ${this.#mapStatusKeyToJapanese(statusData.courses.basic.status)}\n` +
        `アドバンスコース: ${this.#mapStatusKeyToJapanese(statusData.courses.advance.status)}`;
      
      if (!confirm(confirmMessage)) {
        this.#showFeedback('更新をキャンセルしました', 'info');
        return;
      }
      
      // 保存処理実行
      const result = await this.lessonStatusService.updateStatus(statusData);
      
      if (result.success) {
        // ボタンアクション用のイベントを発行（通知表示用）
        EventBus.emit('button:lessonStatus:updated', { 
          date: statusData.date 
        });
        
        // LP側のレッスン状況表示も更新
        if (window.lessonStatusDisplay && typeof window.lessonStatusDisplay.refresh === 'function') {
          window.lessonStatusDisplay.refresh();
        }
        
      } else {
        this.#showFeedback(result.error || '更新に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('❌ レッスン状況更新エラー:', error);
      this.#showFeedback('レッスン状況の更新中にエラーが発生しました', 'error');
    }
  }

  /**
   * レッスン状況データのバリデーション
   * @private
   * @param {Object} statusData - レッスン状況データ
   * @returns {boolean} バリデーション成功時true
   */
  #validateLessonStatusData(statusData) {
    // 日付チェック
    if (!statusData.date) {
      this.#showFeedback('対象日を選択してください', 'error');
      return false;
    }
    
    // 日付形式チェック
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(statusData.date)) {
      this.#showFeedback('正しい日付形式で入力してください (YYYY-MM-DD)', 'error');
      return false;
    }
    
    // グローバルメッセージ長チェック
    if (statusData.globalMessage && statusData.globalMessage.length > 500) {
      this.#showFeedback('全体メッセージは500文字以内で入力してください', 'error');
      return false;
    }
    
    // ステータス値チェック
    const validStatuses = ['scheduled', 'cancelled', 'indoor', 'postponed'];
    if (!validStatuses.includes(statusData.globalStatus)) {
      this.#showFeedback('無効な全体ステータスが選択されています', 'error');
      return false;
    }
    
    // コースステータスチェック
    for (const [courseKey, courseData] of Object.entries(statusData.courses)) {
      if (!validStatuses.includes(courseData.status)) {
        this.#showFeedback(`無効な${courseKey}コースステータスが選択されています`, 'error');
        return false;
      }
    }
    
    return true;
  }

  // === データ管理メソッド ===

  /**
   * データエクスポート
   */
  async exportData() {
    try {
      this.info('データエクスポートを開始しています...');
      
      if (!this.dataExportService) {
        throw new Error('DataExportServiceが初期化されていません');
      }
      
      const result = await this.dataExportService.exportAllData();
      if (result.success) {
        this.success(`データエクスポートが完了しました: ${result.filename}`);
      } else {
        this.error(`データエクスポートに失敗しました: ${result.message}`);
      }
      
    } catch (error) {
      this.error('データエクスポート処理中にエラーが発生しました:', error);
    }
  }

  /**
   * 全データクリア
   */
  async clearAllData() {
    try {
      console.log('🗑️ 全データクリア実行');
      
      // 各サービスのデータクリア
      await this.articleDataService.clearAllData();
      await this.instagramDataService.clearAllData();
      await this.lessonStatusService.clearAllData();
      
      // UI更新
      this.refreshNewsList();
      this.refreshRecentArticles();
      this.clearNewsEditor();
      
      this.#showFeedback('全データを削除しました');
      
    } catch (error) {
      console.error('❌ 全データクリアエラー:', error);
      this.#showFeedback('データの削除中にエラーが発生しました', 'error');
    }
  }

  // === システム管理メソッド ===

  /**
   * サイト接続テスト
   */
  async testSiteConnection() {
    try {
      console.log('🌐 サイト接続テスト開始');
      
      const testResults = {
        indexPage: false,
        newsPage: false,
        adminPage: true // 現在開いているので確実にtrue
      };
      
      // index.htmlの確認
      try {
        const indexResponse = await fetch('index.html', { method: 'HEAD' });
        testResults.indexPage = indexResponse.ok;
      } catch (e) {
        console.log('Index page test failed:', e.message);
      }
      
      // news.htmlの確認
      try {
        const newsResponse = await fetch('news.html', { method: 'HEAD' });
        testResults.newsPage = newsResponse.ok;
      } catch (e) {
        console.log('News page test failed:', e.message);
      }
      
      // 結果表示
      const resultContainer = document.getElementById('site-connection-test-results');
      if (resultContainer) {
        resultContainer.innerHTML = this.#generateConnectionTestResults(testResults);
      }
      
      const successCount = Object.values(testResults).filter(Boolean).length;
      this.#showFeedback(`接続テスト完了: ${successCount}/3 ページが正常`);
      
    } catch (error) {
      console.error('❌ サイト接続テストエラー:', error);
      this.#showFeedback('接続テストに失敗しました', 'error');
    }
  }

  /**
   * LocalStorage リセット
   */
  resetLocalStorage() {
    try {
      console.log('🔄 LocalStorage リセット');
      
      // RBS関連のキーのみを削除
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rbs_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // UI更新
      this.refreshNewsList();
      this.refreshRecentArticles();
      this.clearNewsEditor();
      
      this.#showFeedback(`LocalStorageをリセットしました (${keysToRemove.length}件削除)`);
      
    } catch (error) {
      console.error('❌ LocalStorageリセットエラー:', error);
      this.#showFeedback('LocalStorageのリセットに失敗しました', 'error');
    }
  }

  /**
   * 外部URLを開く
   */
  openExternalUrl(url) {
    try {
      if (url) {
        // 相対パスの場合は適切なベースURLを設定
        if (url.startsWith('../') || url.startsWith('./') || !url.includes('://')) {
          const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
          const fullUrl = new URL(url, baseUrl).href;
          window.open(fullUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error) {
      this.error('外部URL開くエラー:', error);
    }
  }

  // === 認証・デバッグメソッド ===

  /**
   * 認証ログアウト時の処理
   * AuthServiceからのコールバックとして実行される
   * @private
   */
  handleAuthLogout() {
    try {
      this.info('認証サービスからログアウトされました');
      
      // セッション監視を停止（既にAuthServiceで停止されているが念のため）
      this.stopSessionMonitoring();
      
      // UIをクリア
      this.clearAdminUI();
      
    } catch (error) {
      this.error('認証ログアウト処理エラー:', error);
    }
  }

  /**
   * セッション情報表示の更新
   * @param {Object} sessionInfo - セッション情報
   * @private
   */
  updateSessionInfoDisplay(sessionInfo) {
    try {
      const sessionInfoElement = document.getElementById('session-remaining');
      if (!sessionInfoElement) return;

      if (sessionInfo && sessionInfo.isAuthenticated) {
        const remainingTime = this.authService.getSessionRemainingTimeFormatted();
        const remainingMs = this.authService.getSessionRemainingTime();
        
        sessionInfoElement.textContent = remainingTime;
        
        // 残り時間に応じてスタイルを変更
        const sessionInfoContainer = document.getElementById('session-info');
        if (sessionInfoContainer) {
          // 2時間未満の場合は警告表示
          if (remainingMs < 2 * 60 * 60 * 1000) {
            sessionInfoContainer.classList.add('warning');
          } else {
            sessionInfoContainer.classList.remove('warning');
          }
        }
        
        this.debug(`セッション残り時間: ${remainingTime}`);
      } else {
        sessionInfoElement.textContent = '未認証';
      }
    } catch (error) {
      this.error('セッション情報表示更新エラー:', error);
      const sessionInfoElement = document.getElementById('session-remaining');
      if (sessionInfoElement) {
        sessionInfoElement.textContent = 'エラー';
      }
    }
  }

  /**
   * 管理画面UIをクリア
   * @private
   */
  clearAdminUI() {
    try {
      // フォームをクリア
      const forms = document.querySelectorAll('form');
      forms.forEach(form => form.reset());
      
      // 編集中のデータをクリア
      this.hasUnsavedChanges = false;
      
      this.debug('管理画面UIクリア完了');
    } catch (error) {
      this.error('管理画面UIクリアエラー:', error);
    }
  }

  /**
   * セッション情報の更新 - DEPRECATED
   * 
   * @deprecated AuthServiceのコールバック機能を使用してください
   */
  updateSessionInfo() {
    this.warn('updateSessionInfo() は非推奨です。AuthServiceのコールバック機能を使用してください。');
    // AuthServiceのコールバック機能によって自動的に更新されるため、何もしない
  }

  /**
   * セッション監視を開始 - DEPRECATED
   * 
   * @deprecated AuthServiceのセッション監視を使用してください
   */
  startSessionMonitoring() {
    this.warn('startSessionMonitoring() は非推奨です。AuthServiceで自動的に開始されます。');
    // AuthServiceで自動的に開始されるため、何もしない
  }

  /**
   * セッション監視を停止
   */
  stopSessionMonitoring() {
    if (this.sessionUpdateInterval) {
      clearInterval(this.sessionUpdateInterval);
      this.sessionUpdateInterval = null;
      this.log('レガシーセッション情報の定期更新を停止しました');
    }
  }

  /**
   * デバッグ情報表示
   */
  showDebugInfo() {
    try {
      console.log('🐛 デバッグ情報表示');
      
      const debugInfo = {
        currentTab: this.currentTab,
        initialized: this.initialized,
        articleService: this.articleDataService?.getStatus(),
        instagramService: this.instagramDataService.getStatus(),
        lessonService: this.lessonStatusService.getStatus(),
        uiManager: this.uiManagerService.getStatus(),
        browser: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled
        },
        storage: {
          localStorageAvailable: !!window.localStorage,
          sessionStorageAvailable: !!window.sessionStorage
        }
      };
      
      console.table(debugInfo);
      
      // デバッグコンテンツHTML生成
      const debugContent = `
        <div class="debug-info">
          <h4>システム情報</h4>
          <table class="debug-table">
            <tr><td>現在のタブ</td><td>${debugInfo.currentTab}</td></tr>
            <tr><td>初期化状態</td><td>${debugInfo.initialized ? '✅' : '❌'}</td></tr>
          </table>
          
          <h4>サービス状態</h4>
          <table class="debug-table">
            <tr><td>記事サービス</td><td>${debugInfo.articleService?.initialized ? '✅' : '❌'}</td></tr>
            <tr><td>レッスンサービス</td><td>${debugInfo.lessonService?.initialized ? '✅' : '❌'}</td></tr>
            <tr><td>UIマネージャー</td><td>${debugInfo.uiManager?.initialized ? '✅' : '❌'}</td></tr>
          </table>
          
          <h4>ブラウザ情報</h4>
          <table class="debug-table">
            <tr><td>言語</td><td>${debugInfo.browser.language}</td></tr>
            <tr><td>Cookie有効</td><td>${debugInfo.browser.cookieEnabled ? '✅' : '❌'}</td></tr>
            <tr><td>LocalStorage</td><td>${debugInfo.storage.localStorageAvailable ? '✅' : '❌'}</td></tr>
          </table>
          
          <style>
            .debug-table { width: 100%; margin-bottom: 1rem; border-collapse: collapse; }
            .debug-table td { padding: 0.5rem; border: 1px solid #ddd; }
            .debug-table td:first-child { font-weight: bold; background: #f5f5f5; }
          </style>
        </div>
      `;
      
      this.#createDebugModal('システムデバッグ情報', debugContent);
      
    } catch (error) {
      console.error('❌ デバッグ情報表示エラー:', error);
      this.#showFeedback('デバッグ情報の表示に失敗しました', 'error');
    }
  }

  /**
   * デバッグモーダルを作成
   * @private
   * @param {string} title - モーダルのタイトル
   * @param {string} content - モーダルの内容
   */
  #createDebugModal(title, content) {
    const modalHTML = `
      <div id="debug-modal" class="modal" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.classList.remove('modal-open');">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.classList.add('modal-open');
  }

  /**
   * 接続テスト結果の生成
   * @private
   * @param {Object} testResults - テスト結果
   * @returns {string}
   */
  #generateConnectionTestResults(testResults) {
    return Object.entries(testResults).map(([page, result]) => 
      `<div class="test-result ${result ? 'success' : 'error'}">
        ${page}: ${result ? '✅ 正常' : '❌ エラー'}
      </div>`
    ).join('');
  }

  /**
   * LP ニュースデバッグ
   */
  showNewsDebug() {
    try {
      console.log('🐛 LP ニュースデバッグ');
      
      // ArticleStorageServiceの状態確認
      const articles = this.articleDataService.getPublishedArticles({ limit: 10 });
      
      const debugData = {
        publishedArticles: articles.length,
        articles: articles.map(article => ({
          id: article.id,
          title: article.title,
          status: article.status,
          publishedAt: article.publishedAt,
          category: article.category
        }))
      };
      
      console.log('📰 LP表示用記事データ:', debugData);
      this.#showFeedback(`LP表示用記事: ${articles.length}件`);
      
    } catch (error) {
      console.error('❌ LP ニュースデバッグエラー:', error);
      this.#showFeedback('ニュースデバッグに失敗しました', 'error');
    }
  }

  // === モーダル管理メソッド ===

  /**
   * モーダルを閉じる
   */
  closeModal() {
    try {
      // 標準のモーダルを閉じる
      const modal = document.getElementById('modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active', 'show');
        
        // モーダル内容をクリア
        const modalBody = modal.querySelector('#modal-body, .modal-body');
        if (modalBody) {
          modalBody.innerHTML = '';
        }
        
        this.debug('標準モーダルを閉じました');
      }
      
      // 動的に作成されたモーダルを閉じる
      const dynamicModals = document.querySelectorAll('.modal[id*="preview-modal"], .modal[id*="lesson-preview-modal"]');
      dynamicModals.forEach(dynamicModal => {
        dynamicModal.remove();
        this.debug('動的モーダルを削除しました');
      });
      
      // bodyのmodal-openクラスを削除してスクロールを復旧
      document.body.classList.remove('modal-open');
      
      // bodyのスタイルを確実にリセット
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      this.debug('モーダルを閉じてスクロールを復旧しました');
      
    } catch (error) {
      this.error('モーダル閉じる処理エラー:', error);
      
      // エラー時でもスクロールを復旧
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }

  /**
   * モバイルメニュートグル
   */
  toggleMobileMenu(element) {
    try {
      const isExpanded = element.getAttribute('aria-expanded') === 'true';
      const navLinks = document.querySelector('.nav-links');
      
      if (navLinks) {
        element.setAttribute('aria-expanded', (!isExpanded).toString());
        element.textContent = isExpanded ? '☰' : '✕';
        
        if (isExpanded) {
          navLinks.classList.remove('active');
          document.body.classList.remove('menu-open');
        } else {
          navLinks.classList.add('active');
          document.body.classList.add('menu-open');
        }
      }
    } catch (error) {
      this.error('モバイルメニュートグルエラー:', error);
    }
  }

  // === プライベートヘルパーメソッド ===

  /**
   * 日本語のステータス値を英語キーにマッピング
   * @private
   * @param {string} japaneseStatus - 日本語のステータス値
   * @returns {string} 英語のステータスキー
   */
  #mapJapaneseStatusToKey(japaneseStatus) {
    const statusMapping = {
      '通常開催': 'scheduled',
      '中止': 'cancelled',
      '室内開催': 'indoor',
      '延期': 'postponed'
    };
    return statusMapping[japaneseStatus] || 'scheduled';
  }

  /**
   * 英語のステータスキーを日本語の値にマッピング
   * @private
   * @param {string} statusKey - 英語のステータスキー
   * @returns {string} 日本語のステータス値
   */
  #mapStatusKeyToJapanese(statusKey) {
    const statusMapping = {
      'scheduled': '通常開催',
      'cancelled': '中止',
      'indoor': '室内開催',
      'postponed': '延期'
    };
    return statusMapping[statusKey] || '通常開催';
  }

  /**
   * フォームから記事データを取得
   * @private
   * @returns {Object}
   */
  #getArticleDataFromForm() {
    return {
      id: document.getElementById('news-id')?.value || '',
      title: document.getElementById('news-title')?.value || '',
      category: document.getElementById('news-category')?.value || 'announcement',
      date: document.getElementById('news-date')?.value || '',
      status: document.getElementById('news-status')?.value || 'draft',
      summary: document.getElementById('news-summary')?.value || '',
      content: document.getElementById('news-content')?.value || '',
      featured: document.getElementById('news-featured')?.checked || false
    };
  }

  /**
   * 記事データのバリデーション
   * @private
   * @param {Object} articleData - 記事データ
   * @returns {boolean}
   */
  #validateArticleData(articleData) {
    if (!articleData.title) {
      this.#showFeedback('タイトルを入力してください', 'error');
      return false;
    }
    
    if (!articleData.content) {
      this.#showFeedback('本文を入力してください', 'error');
      return false;
    }
    
    return true;
  }

  /**
   * 統合された記事一覧HTMLの生成
   * @private
   * @param {Array} articles - 記事配列
   * @param {Object} options - 表示オプション
   * @returns {string}
   */
  #generateArticleListHTML(articles, options = {}) {
    const {
      mode = 'list', // 'recent' | 'list'
      showActions = true,
      showStats = false,
      showMeta = true,
      limit = null,
      emptyMessage = '記事がありません',
      emptyAction = null
    } = options;

    if (articles.length === 0) {
      let emptyHTML = `
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <p>${emptyMessage}</p>
      `;
      
      if (emptyAction) {
        emptyHTML += `
          <button class="btn btn-sm btn-primary" data-action="${emptyAction.action}">
            <i class="fas ${emptyAction.icon}"></i> ${emptyAction.text}
          </button>
        `;
      }
      
      emptyHTML += '</div>';
      return emptyHTML;
    }

    const displayArticles = limit ? articles.slice(0, limit) : articles;
    
    return displayArticles.map((article, index) => {
      const createdDate = new Date(article.createdAt);
      const updatedDate = new Date(article.updatedAt || article.createdAt);
      const isRecent = (Date.now() - updatedDate.getTime()) < (24 * 60 * 60 * 1000); // 24時間以内
      const categoryName = this.#getCategoryName(article.category);
      const summary = article.summary ? 
        (article.summary.length > 80 ? article.summary.substring(0, 80) + '...' : article.summary) : 
        '概要なし';

      // スタイル調整用のクラス
      const containerClass = mode === 'recent' ? 'recent-article-item' : 'recent-article-item list-mode';
      const animationDelay = mode === 'recent' ? `style="animation-delay: ${index * 0.1}s"` : '';

      return `
        <div class="${containerClass}" data-id="${article.id}" ${animationDelay}>
          <div class="recent-article-header">
            <div class="recent-article-main">
              <h3 class="recent-article-title" title="${this.escapeHtml(article.title)}">
                ${this.escapeHtml(article.title)}
                ${isRecent ? '<span class="new-badge">NEW</span>' : ''}
              </h3>
              <div class="recent-article-summary">${this.escapeHtml(summary)}</div>
            </div>
            ${showActions ? `
            <div class="recent-article-actions">
              <button class="btn-icon" data-action="edit-article" data-article-id="${article.id}" title="編集">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-icon" data-action="preview-article" data-article-id="${article.id}" title="プレビュー">
                <i class="fas fa-eye"></i>
              </button>
              <div class="dropdown">
                <button class="btn-icon dropdown-toggle" title="その他">
                  <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu">
                  <button class="dropdown-item" data-action="duplicate-article" data-article-id="${article.id}">
                    <i class="fas fa-copy"></i> 複製
                  </button>
                  <button class="dropdown-item danger" data-action="delete-article" data-article-id="${article.id}">
                    <i class="fas fa-trash"></i> 削除
                  </button>
                </div>
              </div>
            </div>
            ` : ''}
          </div>
          
          ${showMeta ? `
          <div class="recent-article-meta">
            <div class="meta-item">
              <i class="fas fa-tag"></i>
              <span class="category-badge ${article.category}">${categoryName}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-circle ${article.status === 'published' ? 'published' : 'draft'}"></i>
              <span class="status-text">${article.status === 'published' ? '公開中' : '下書き'}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-clock"></i>
              <span class="date-text" title="更新: ${updatedDate.toLocaleString('ja-JP')}">
                ${this.#formatRelativeTime(updatedDate)}
              </span>
            </div>
            ${article.featured ? '<div class="meta-item"><i class="fas fa-star featured"></i><span>注目記事</span></div>' : ''}
          </div>
          ` : ''}
          
          ${showStats ? `
          <div class="recent-article-stats">
            <div class="stat-item">
              <i class="fas fa-calendar-plus"></i>
              <span>作成: ${createdDate.toLocaleDateString('ja-JP')}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-align-left"></i>
              <span>${this.#getWordCount(article)} 文字</span>
            </div>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * ニュース一覧のレンダリング
   * @private
   * @param {string} filter - フィルター
   */
  #renderNewsList(filter = 'all') {
    try {
      if (!this.articleDataService?.initialized) {
        console.warn('ArticleDataServiceが初期化されていません');
        return;
      }

      const articles = this.articleDataService.loadArticles();
      const filteredArticles = this.#filterArticles(articles, filter);
      
      const listContainer = document.getElementById('news-list');
      if (listContainer) {
        // 統合されたメソッドを使用
        const html = this.#generateArticleListHTML(filteredArticles, {
          mode: 'list',
          showActions: true,
          showStats: true,
          showMeta: true,
          emptyMessage: '記事がありません',
          emptyAction: {
            action: 'new-news-article',
            icon: 'fa-plus',
            text: '新規記事を作成'
          }
        });
        
        listContainer.innerHTML = html;
        
        // ドロップダウンメニューの初期化
        this.#initializeDropdownMenus(listContainer);
      } else {
        console.warn('news-list要素が見つかりません');
      }
      
      console.log(`📋 記事一覧を表示: ${filteredArticles.length}件 (フィルター: ${filter})`);
      
    } catch (error) {
      console.error('❌ ニュース一覧レンダリングエラー:', error);
      
      // エラー時の安全なフォールバック
      const listContainer = document.getElementById('news-list');
      if (listContainer) {
        listContainer.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>記事一覧の読み込みに失敗しました</p>
            <button class="btn btn-sm btn-outline" data-action="refresh-news-list">
              <i class="fas fa-sync-alt"></i> 再試行
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * 最近の記事のレンダリング
   * @private
   */
  async #renderRecentArticles() {
    try {
      // ArticleDataServiceの初期化状態を再確認
      if (!this.articleDataService?.initialized) {
        throw new Error('ArticleDataServiceが初期化されていません');
      }
      
      const articles = this.articleDataService.loadArticles();
      const recentArticles = articles
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 10); // より多くの記事を取得（スクロール用）
      
      const recentContainer = document.getElementById('recent-articles');
      if (recentContainer) {
        // 統合されたメソッドを使用
        const html = this.#generateArticleListHTML(recentArticles, {
          mode: 'recent',
          showActions: true,
          showStats: true,
          showMeta: true,
          emptyMessage: '最近の記事がありません',
          emptyAction: {
            action: 'new-news-article',
            icon: 'fa-plus',
            text: '新規記事を作成'
          }
        });
        
        recentContainer.innerHTML = html;
        
        // ドロップダウンメニューの初期化
        this.#initializeDropdownMenus(recentContainer);
      }
      
      this.debug(`最近の記事を${recentArticles.length}件表示（最初の3件がメイン表示）`);
      
    } catch (error) {
      console.error('❌ 最近の記事レンダリングエラー:', error);
      throw error;
    }
  }

  /**
   * ドロップダウンメニューの初期化
   * @private
   */
  #initializeDropdownMenus(container) {
    const dropdowns = container.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
      const toggle = dropdown.querySelector('.dropdown-toggle');
      const menu = dropdown.querySelector('.dropdown-menu');
      
      if (toggle && menu) {
        // ドロップダウントグルクリック
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // 他のドロップダウンを閉じる
          dropdowns.forEach(otherDropdown => {
            if (otherDropdown !== dropdown) {
              otherDropdown.classList.remove('open');
            }
          });
          
          // 現在のドロップダウンをトグル
          dropdown.classList.toggle('open');
        });
        
        // ドキュメントクリックで閉じる
        document.addEventListener('click', () => {
          dropdown.classList.remove('open');
        });
        
        // メニュー項目クリック時に閉じる
        menu.addEventListener('click', () => {
          dropdown.classList.remove('open');
        });
      }
    });
  }

  /**
   * 記事フィルタリング
   * @private
   * @param {Array} articles - 記事配列
   * @param {string} filter - フィルター
   * @returns {Array}
   */
  #filterArticles(articles, filter) {
    switch (filter) {
      case 'published':
        return articles.filter(article => article.status === 'published');
      case 'draft':
        return articles.filter(article => article.status === 'draft');
      default:
        return articles;
    }
  }

  /**
   * ニュース一覧HTMLの生成
   * @private
   * @param {Array} articles - 記事配列
   * @returns {string}
   */
  #generateNewsListHTML(articles) {
    if (articles.length === 0) {
      return '<div class="empty-state">記事がありません</div>';
    }
    
    return articles.map(article => `
      <div class="news-item" data-id="${article.id}">
        <div class="news-item-header">
          <h3>${article.title}</h3>
          <span class="status-badge ${article.status}">${article.status === 'published' ? '公開' : '下書き'}</span>
        </div>
        <div class="news-item-meta">
          <span class="category">${this.#getCategoryName(article.category)}</span>
          <span class="date">${new Date(article.createdAt).toLocaleDateString('ja-JP')}</span>
        </div>
        <div class="news-item-actions">
          <button class="btn btn-sm btn-outline" data-action="edit-article" data-article-id="${article.id}">編集</button>
          <button class="btn btn-sm btn-danger" data-action="delete-article" data-article-id="${article.id}">削除</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * 最近の記事HTMLの生成
   * @private
   * @param {Array} articles - 記事配列
   * @returns {string}
   */
  #generateRecentArticlesHTML(articles) {
    if (articles.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <p>最近の記事がありません</p>
          <button class="btn btn-sm btn-primary" data-action="new-news-article">
            <i class="fas fa-plus"></i> 新規記事を作成
          </button>
        </div>
      `;
    }
    
    return articles.map((article, index) => {
      const createdDate = new Date(article.createdAt);
      const updatedDate = new Date(article.updatedAt || article.createdAt);
      const isRecent = (Date.now() - updatedDate.getTime()) < (24 * 60 * 60 * 1000); // 24時間以内
      const categoryName = this.#getCategoryName(article.category);
      const summary = article.summary ? 
        (article.summary.length > 80 ? article.summary.substring(0, 80) + '...' : article.summary) : 
        '概要なし';

      return `
        <div class="recent-article-item" data-id="${article.id}" style="animation-delay: ${index * 0.1}s">
          <div class="recent-article-header">
            <div class="recent-article-main">
              <h3 class="recent-article-title" title="${this.escapeHtml(article.title)}">
                ${this.escapeHtml(article.title)}
                ${isRecent ? '<span class="new-badge">NEW</span>' : ''}
              </h3>
              <div class="recent-article-summary">${this.escapeHtml(summary)}</div>
            </div>
            <div class="recent-article-actions">
              <button class="btn-icon" data-action="edit-article" data-article-id="${article.id}" title="編集">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-icon" data-action="preview-article" data-article-id="${article.id}" title="プレビュー">
                <i class="fas fa-eye"></i>
              </button>
              <div class="dropdown">
                <button class="btn-icon dropdown-toggle" title="その他">
                  <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu">
                  <button class="dropdown-item" data-action="duplicate-article" data-article-id="${article.id}">
                    <i class="fas fa-copy"></i> 複製
                  </button>
                  <button class="dropdown-item danger" data-action="delete-article" data-article-id="${article.id}">
                    <i class="fas fa-trash"></i> 削除
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="recent-article-meta">
            <div class="meta-item">
              <i class="fas fa-tag"></i>
              <span class="category-badge ${article.category}">${categoryName}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-circle ${article.status === 'published' ? 'published' : 'draft'}"></i>
              <span class="status-text">${article.status === 'published' ? '公開中' : '下書き'}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-clock"></i>
              <span class="date-text" title="更新: ${updatedDate.toLocaleString('ja-JP')}">
                ${this.#formatRelativeTime(updatedDate)}
              </span>
            </div>
            ${article.featured ? '<div class="meta-item"><i class="fas fa-star featured"></i><span>注目記事</span></div>' : ''}
          </div>
          
          <div class="recent-article-stats">
            <div class="stat-item">
              <i class="fas fa-calendar-plus"></i>
              <span>作成: ${createdDate.toLocaleDateString('ja-JP')}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-align-left"></i>
              <span>${this.#getWordCount(article)} 文字</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * カテゴリー名の取得
   * @private
   * @param {string} category - カテゴリーキー
   * @returns {string}
   */
  #getCategoryName(category) {
    const categoryNames = {
      'announcement': 'お知らせ',
      'event': '体験会',
      'media': 'メディア',
      'important': '重要'
    };
    return categoryNames[category] || category;
  }

  /**
   * 記事編集
   * @param {string} articleId - 記事ID
   */
  editArticle(articleId) {
    try {
      console.log('🖊️ 記事編集開始:', articleId);
      
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        this.#showFeedback('記事が見つかりません', 'error');
        return;
      }
      
      console.log('📄 編集対象記事:', article);
      
      // 記事管理タブに切り替え
      this.switchAdminTab('news-management');
      
      // エディタータブに切り替え（少し遅延させて確実にタブが切り替わるようにする）
      setTimeout(() => {
        this.switchNewsTab('editor');
        
        // さらに少し遅延させてフォームにデータを読み込み
        setTimeout(() => {
          this.#loadArticleToEditor(article, articleId);
        }, 100);
      }, 100);
      
    } catch (error) {
      console.error('❌ 記事編集エラー:', error);
      this.#showFeedback('記事の編集に失敗しました', 'error');
    }
  }

  /**
   * 記事データをエディターに読み込み
   * @private
   * @param {Object} article - 記事データ
   * @param {string} articleId - 記事ID
   */
  #loadArticleToEditor(article, articleId) {
    try {
      console.log('📝 記事データをエディターに読み込み中...');
      
      // フォーム要素を取得
      const elements = {
        id: document.getElementById('news-id'),
        title: document.getElementById('news-title'),
        category: document.getElementById('news-category'),
        date: document.getElementById('news-date'),
        status: document.getElementById('news-status'),
        summary: document.getElementById('news-summary'),
        content: document.getElementById('news-content'),
        featured: document.getElementById('news-featured')
      };
      
      // 各要素が存在するかチェック
      const missingElements = Object.keys(elements).filter(key => !elements[key]);
      if (missingElements.length > 0) {
        console.warn('⚠️ 一部のフォーム要素が見つかりません:', missingElements);
      }
      
      // フォームに記事データを設定
      if (elements.id) elements.id.value = article.id || '';
      if (elements.title) elements.title.value = article.title || '';
      if (elements.category) elements.category.value = article.category || 'announcement';
      if (elements.date) {
        const dateValue = article.date || article.createdAt || '';
        // 日付形式を正規化（YYYY-MM-DD形式にする）
        if (dateValue) {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            elements.date.value = date.toISOString().split('T')[0];
          }
        }
      }
      if (elements.status) elements.status.value = article.status || 'draft';
      if (elements.summary) elements.summary.value = article.summary || article.excerpt || '';
      if (elements.featured) elements.featured.checked = article.featured || false;
      
      // 記事本文を取得して設定
      if (elements.content) {
        const content = this.articleDataService.getArticleContent(articleId);
        elements.content.value = content || '';
        console.log('📄 記事本文を読み込み:', content ? `${content.length}文字` : '本文なし');
      }
      
      // エディタータイトルを更新
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) {
        editorTitle.textContent = `記事編集: ${article.title}`;
      }
      
      // タイトルフィールドにフォーカス
      if (elements.title) {
        elements.title.focus();
      }
      
      this.#showFeedback(`記事「${article.title}」をエディターに読み込みました`);
      console.log('✅ 記事データの読み込み完了');
      
    } catch (error) {
      console.error('❌ 記事データ読み込みエラー:', error);
      this.#showFeedback('記事データの読み込みに失敗しました', 'error');
    }
  }

  /**
   * 記事削除
   * @param {string} articleId - 記事ID
   */
  async deleteArticle(articleId) {
    try {
      if (!confirm('この記事を削除しますか？この操作は取り消せません。')) {
        return;
      }
      
      const result = await this.articleDataService.deleteArticle(articleId);
      
      if (result.success) {
        // 記事一覧とダッシュボードを更新
        this.refreshRecentArticles();
        this.refreshNewsList();
        this.updateDashboardStats();
        
        this.#showFeedback('記事を削除しました');
      } else {
        this.#showFeedback(result.message || '削除に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('❌ 記事削除エラー:', error);
      this.#showFeedback('記事の削除中にエラーが発生しました', 'error');
    }
  }

  /**
   * プレビューモーダルの表示
   * @private
   * @param {Object} articleData - 記事データ
   */
  #showNewsPreviewModal(articleData) {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('news-preview-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // カテゴリー名を取得
    const categoryNames = {
      'announcement': 'お知らせ',
      'event': '体験会',
      'media': 'メディア',
      'important': '重要'
    };
    
    const categoryName = categoryNames[articleData.category] || articleData.category;
    const formattedDate = articleData.date ? 
      new Date(articleData.date).toLocaleDateString('ja-JP') : 
      new Date().toLocaleDateString('ja-JP');
    
    // モーダルHTMLを作成
    const modalHTML = `
      <div id="news-preview-modal" class="modal">
        <div class="modal-content article-preview">
          <div class="modal-header">
            <h2><i class="fas fa-eye"></i> 記事プレビュー</h2>
            <button class="modal-close" onclick="this.closest('.modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="preview-article">
              <div class="article-header">
                <div class="article-meta">
                  <span class="article-date">${formattedDate}</span>
                  <span class="article-category ${articleData.category}">${categoryName}</span>
                </div>
                <h1 class="article-title">${this.escapeHtml(articleData.title)}</h1>
                ${articleData.summary ? `<div class="article-summary">${this.escapeHtml(articleData.summary)}</div>` : ''}
              </div>
              <div class="article-content">
                ${this.#convertMarkdownToHtml(articleData.content)}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;
    
    // モーダルをDOMに追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // モーダルを表示
    const modal = document.getElementById('news-preview-modal');
    modal.style.display = 'flex';
    
    // ESCキーでモーダルを閉じる
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // モーダル背景クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    });
  }

  /**
   * 簡易Markdown→HTML変換
   * @private
   * @param {string} markdown - Markdownテキスト
   * @returns {string} HTMLテキスト
   */
  #convertMarkdownToHtml(markdown) {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^- (.*)$/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gim, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
      .replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');
  }

  /**
   * HTMLエスケープ
   * @private
   * @param {string} text - エスケープするテキスト
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 記事管理のサブタブを切り替え
   * @param {string} tabName - タブ名 (editor|list)
   */
  switchNewsTab(tabName) {
    try {
      console.log(`🔄 記事管理サブタブ切り替え: ${tabName}`);
      
      // 現在のアクティブタブを非アクティブに
      const currentActiveNavItem = document.querySelector('.sub-nav-item.active');
      const currentActiveTabContent = document.querySelector('.news-tab-content.active');
      
      if (currentActiveNavItem) {
        currentActiveNavItem.classList.remove('active');
      }
      if (currentActiveTabContent) {
        currentActiveTabContent.classList.remove('active');
      }
      
      // 新しいタブをアクティブに
      const newActiveNavItem = document.querySelector(`[data-tab="${tabName}"]`);
      let newActiveTabContent;
      
      if (tabName === 'editor') {
        newActiveTabContent = document.getElementById('news-editor-tab');
      } else if (tabName === 'list') {
        newActiveTabContent = document.getElementById('news-list-tab');
        // 記事一覧タブに切り替えたときは記事一覧を更新
        this.refreshNewsList();
      }
      
      if (newActiveNavItem) {
        newActiveNavItem.classList.add('active');
      }
      if (newActiveTabContent) {
        newActiveTabContent.classList.add('active');
      }
      
      const tabDisplayName = tabName === 'editor' ? '記事作成' : '記事一覧';
      this.#showFeedback(`${tabDisplayName}タブに切り替えました`);
      
    } catch (error) {
      console.error('❌ 記事管理サブタブ切り替えエラー:', error);
      this.#showFeedback('タブの切り替えに失敗しました', 'error');
    }
  }

  /**
   * フォームからニュースフォームデータを取得
   * @private
   * @returns {Object}
   */
  #getNewsFormData() {
    return {
      title: document.getElementById('news-title')?.value || '',
      category: document.getElementById('news-category')?.value || 'announcement',
      date: document.getElementById('news-date')?.value || '',
      status: document.getElementById('news-status')?.value || 'draft',
      summary: document.getElementById('news-summary')?.value || '',
      content: document.getElementById('news-content')?.value || '',
      featured: document.getElementById('news-featured')?.checked || false
    };
  }

  /**
   * レッスン状況のプレビュー表示
   * @private
   * @param {Object} statusData - レッスン状況データ
   */

  /**

  /**
   * フォームからレッスン状況データを取得
   * @private
   * @returns {Object}
   */
  #getLessonStatusFromForm() {
    // 今日の日付をデフォルトとして取得
    const today = new Date().toISOString().slice(0, 10);
    
    // フォームからの生の値を取得
    const globalStatusRaw = document.querySelector('input[name="global-status"]:checked')?.value || '通常開催';
    const basicLessonRaw = document.querySelector('input[name="basic-lesson"]:checked')?.value || '通常開催';
    const advanceLessonRaw = document.querySelector('input[name="advance-lesson"]:checked')?.value || '通常開催';
    
    // 日本語の値を英語キーにマッピング
    const globalStatus = this.#mapJapaneseStatusToKey(globalStatusRaw);
    const basicLessonStatus = this.#mapJapaneseStatusToKey(basicLessonRaw);
    const advanceLessonStatus = this.#mapJapaneseStatusToKey(advanceLessonRaw);
    
    return {
      date: document.getElementById('lesson-date')?.value || today,
      globalStatus: globalStatus,
      globalMessage: document.getElementById('global-message')?.value || '',
      courses: {
        basic: {
          name: 'ベーシックコース（年長〜小3）',
          time: '17:00-17:50',
          status: basicLessonStatus
        },
        advance: {
          name: 'アドバンスコース（小4〜小6）',
          time: '18:00-18:50',
          status: advanceLessonStatus
        }
      }
    };
  }

  /**
   * レッスン状況をフォームに読み込み
   * @private
   * @param {Object} status - レッスン状況
   */
  #loadLessonStatusToForm(status) {
    if (status.date) {
      const dateField = document.getElementById('lesson-date');
      if (dateField) dateField.value = status.date;
    }
    
    if (status.globalMessage) {
      const messageField = document.getElementById('global-message');
      if (messageField) messageField.value = status.globalMessage;
    }
    
    // ラジオボタンの設定（英語キーから日本語値にマッピング）
    if (status.globalStatus) {
      const globalJapanese = this.#mapStatusKeyToJapanese(status.globalStatus);
      const globalRadio = document.querySelector(`input[name="global-status"][value="${globalJapanese}"]`);
      if (globalRadio) globalRadio.checked = true;
    }
    
    // コースデータの処理
    if (status.courses?.basic?.status) {
      const basicJapanese = this.#mapStatusKeyToJapanese(status.courses.basic.status);
      const basicRadio = document.querySelector(`input[name="basic-lesson"][value="${basicJapanese}"]`);
      if (basicRadio) basicRadio.checked = true;
    }
    
    if (status.courses?.advance?.status) {
      const advanceJapanese = this.#mapStatusKeyToJapanese(status.courses.advance.status);
      const advanceRadio = document.querySelector(`input[name="advance-lesson"][value="${advanceJapanese}"]`);
      if (advanceRadio) advanceRadio.checked = true;
    }
  }

  /**
   * フィードバックメッセージを表示
   * @private
   * @param {string} message - メッセージ
   * @param {string} type - メッセージタイプ
   */
  #showFeedback(message, type = 'success') {
    console.log(`${type === 'error' ? '❌' : '✅'} ${message}`);
    
    if (this.uiManagerService?.showNotification) {
      this.uiManagerService.showNotification(type, message);
    } else if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, type);
    }
  }

  /**
   * ダッシュボード統計更新
   */
  updateDashboardStats() {
    try {
      // ArticleDataServiceのgetStatsメソッドを使用
      let stats;
      if (this.articleDataService && typeof this.articleDataService.getStats === 'function') {
        stats = this.articleDataService.getStats();
      } else {
        // フォールバック: 手動で統計を計算
        const articles = this.articleDataService?.articles || [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        stats = {
          total: articles.length,
          published: articles.filter(a => a.status === 'published').length,
          drafts: articles.filter(a => a.status === 'draft').length,
          currentMonth: articles.filter(a => {
            const articleDate = new Date(a.createdAt || a.date);
            return articleDate.getMonth() === currentMonth && articleDate.getFullYear() === currentYear;
          }).length
        };
      }
      
      // 統計要素の更新
      this.#updateStatsElement('total-articles', stats.total);
      this.#updateStatsElement('published-articles', stats.published);
      this.#updateStatsElement('draft-articles', stats.drafts);
      this.#updateStatsElement('current-month-articles', stats.currentMonth);
      
      console.log('📊 ダッシュボード統計を更新:', stats);
      
    } catch (error) {
      console.error('❌ ダッシュボード統計更新エラー:', error);
      
      // フォールバック: ゼロ値で初期化
      this.#updateStatsElement('total-articles', 0);
      this.#updateStatsElement('published-articles', 0);
      this.#updateStatsElement('draft-articles', 0);
      this.#updateStatsElement('current-month-articles', 0);
    }
  }

  /**
   * 統計要素の更新
   * @private
   * @param {string} elementId - 統計要素のID
   * @param {number} value - 更新する値
   */
  #updateStatsElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  /**
   * 管理画面統計情報の更新
   * @private
   */
  updateAdminStats() {
    try {
      const articleStats = this.articleDataService.getStats();
      
      // レッスンステータスの取得 - 適切なメソッドを使用
      let lessonCount = 0;
      try {
        if (this.lessonStatusService && typeof this.lessonStatusService.getStatus === 'function') {
          const lessonStatus = this.lessonStatusService.getStatus();
          lessonCount = lessonStatus.statusCount || 0; // statusData.sizeの値を使用
        } else if (this.lessonStatusService && typeof this.lessonStatusService.getCurrentStatus === 'function') {
          const lessonStatus = this.lessonStatusService.getCurrentStatus();
          lessonCount = lessonStatus ? 1 : 0;
        }
      } catch (lessonError) {
        this.warn('レッスン統計取得エラー:', lessonError);
        lessonCount = 0;
      }
      
      // Instagram統計の取得
      let instagramCount = 0;
      try {
        if (this.instagramDataService && Array.isArray(this.instagramDataService.posts)) {
          instagramCount = this.instagramDataService.posts.length;
        }
      } catch (instagramError) {
        this.warn('Instagram統計取得エラー:', instagramError);
        instagramCount = 0;
      }
      
      // UIManagerServiceを使って統計を更新
      if (this.uiManagerService && typeof this.uiManagerService.updateStats === 'function') {
        this.uiManagerService.updateStats({
          articles: articleStats,
          lessons: { total: lessonCount },
          instagram: { total: instagramCount }
        });
      }
      
    } catch (error) {
      this.warn('統計情報更新エラー:', error);
    }
  }

  /**
   * タブナビゲーションの設定
   * @private
   */
  setupTabNavigation() {
    console.log('🧭 タブナビゲーション設定開始');
    
    try {
      // 保存されたタブ状態を復元（統一ストレージキーを使用）
      const savedTab = localStorage.getItem(this.storageKeys.adminTab);
      const defaultTab = 'dashboard';
      const activeTab = (savedTab && this.#isValidTabName(savedTab)) ? savedTab : defaultTab;
      
      console.log('🔍 タブ状態:', {
        saved: savedTab,
        default: defaultTab,
        active: activeTab,
        isValid: this.#isValidTabName(activeTab)
      });
      
      // DOM要素の存在確認
      const navItems = document.querySelectorAll('.nav-item[data-tab]');
      const sections = document.querySelectorAll('.admin-section');
      
      console.log('🔍 DOM要素数:', {
        navItems: navItems.length,
        sections: sections.length
      });
      
      if (navItems.length === 0) {
        console.warn('⚠️ ナビゲーションアイテムが見つかりません');
      }
      
      if (sections.length === 0) {
        console.warn('⚠️ 管理画面セクションが見つかりません');
      }
      
      // 初期タブを設定
      this.switchAdminTab(activeTab);
      console.log(`✅ 初期タブ設定完了: ${activeTab}`);
      
      // ページロード時の記事管理タブのクラス状態を確認・修正
      const adminMain = document.querySelector('.admin-main');
      if (adminMain) {
        if (activeTab === 'news-management') {
          adminMain.classList.add('news-management-active');
          console.log('📄 初期化: 記事管理タブのため全体スクロールモード有効');
        } else {
          adminMain.classList.remove('news-management-active');
          console.log('📱 初期化: 他のタブのため固定高さモード');
        }
      }
      
      // デバッグ情報
      if (CONFIG.debug?.enabled || window.DEBUG) {
        console.log('🔍 利用可能なタブ:', Array.from(navItems).map(item => item.dataset.tab));
        console.log('🔍 利用可能なセクション:', Array.from(sections).map(section => section.id));
      }
      
    } catch (error) {
      console.error('❌ タブナビゲーション設定エラー:', error);
      
      // フォールバック: デフォルトタブを強制設定
      try {
        console.log('🔄 フォールバック: デフォルトタブを設定');
        this.switchAdminTab('dashboard');
      } catch (fallbackError) {
        console.error('❌ フォールバック失敗:', fallbackError);
        this.#showFeedback('タブナビゲーションの初期化に失敗しました', 'error');
      }
    }
  }

  // === ログメソッド ===

  /**
   * ログ出力（新通知システム統合版）
   * @private
   */
  log(...args) {
    const message = args.join(' ');
    
    // 新通知システムにログ記録
    if (window.adminLog) {
      window.adminLog(message, 'info', 'admin-action');
    } else {
      // フォールバック: コンソール出力
      console.log('🔧 AdminActionService:', ...args);
    }
  }

  /**
   * デバッグログ出力（新通知システム統合版）
   * @private
   */
  debug(...args) {
    const message = args.join(' ');
    
    // 新通知システムにデバッグログ記録
    if (window.adminLog) {
      window.adminLog(message, 'debug', 'admin-action');
    } else if (CONFIG.debug?.enabled || window.DEBUG) {
      console.debug('🔍 AdminActionService:', ...args);
    }
  }

  /**
   * 警告ログ出力（新通知システム統合版）
   * @private
   */
  warn(...args) {
    const message = args.join(' ');
    
    // 新通知システムに警告ログ記録
    if (window.adminLog) {
      window.adminLog(message, 'warning', 'admin-action');
    } else {
      console.warn('⚠️ AdminActionService:', ...args);
    }
    
    // 重要な警告は通知も表示
    if (window.adminNotify && message.includes('エラー') || message.includes('失敗')) {
      window.adminNotify({
        type: 'warning',
        title: '警告',
        message: message,
        duration: 5000
      });
    }
  }

  /**
   * エラーログ出力（新通知システム統合版）
   * @private
   */
  error(...args) {
    const message = args.join(' ');
    
    // 新通知システムにエラーログ記録
    if (window.adminLog) {
      window.adminLog(message, 'error', 'admin-action');
    } else {
      console.error('❌ AdminActionService:', ...args);
    }
    
    // エラー通知を表示
    if (window.adminNotify) {
      window.adminNotify({
        type: 'error',
        title: 'エラー',
        message: message,
        duration: 7000
      });
    }
  }

  /**
   * 成功メッセージの表示（新通知システム統合版）
   * @private
   */
  success(...args) {
    const message = args.join(' ');
    
    // 新通知システムにログ記録
    if (window.adminLog) {
      window.adminLog(message, 'info', 'admin-action');
    } else if (CONFIG.debug?.enabled || window.DEBUG) {
      console.log('✅ AdminActionService:', ...args);
    }
    
    // 成功通知を表示
    if (window.adminNotify) {
      window.adminNotify({
        type: 'success',
        title: '成功',
        message: message,
        duration: 4000
      });
    }
  }

  /**
   * 情報メッセージの表示（新通知システム統合版）
   * @private
   */
  info(...args) {
    const message = args.join(' ');
    
    // 新通知システムにログ記録
    if (window.adminLog) {
      window.adminLog(message, 'info', 'admin-action');
    } else if (CONFIG.debug?.enabled || window.DEBUG) {
      console.log('ℹ️ AdminActionService:', ...args);
    }
    
    // 情報通知を表示（控えめに）
    if (window.adminToast) {
      window.adminToast(message, 'info');
    }
  }

  /**
   * 新規記事作成を開始
   */
  startNewArticle() {
    try {
      // フォームをクリア
      this.clearNewsEditor();
      
      // 記事管理タブに切り替え
      this.switchAdminTab('news-management');
      
      // タイトルフィールドにフォーカス
      const titleField = document.getElementById('news-title');
      if (titleField) {
        titleField.focus();
      }
      
      this.#showFeedback('新規記事作成を開始しました');
      console.log('📝 新規記事作成開始');
      
    } catch (error) {
      console.error('❌ 新規記事作成開始エラー:', error);
      this.#showFeedback('新規記事作成の開始に失敗しました', 'error');
    }
  }

  /**
   * 記事作成ガイドを表示
   * @private
   */
  #showWritingGuide() {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('writing-guide-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // ガイド内容を作成
    const guideContent = `
      <div class="guide-section">
        <h3><i class="fas fa-heading"></i> 見出しの使い方</h3>
        <div class="guide-example">
          <div class="code-block">
# 大見出し（H1） - 記事のメインテーマ
## 中見出し（H2） - セクションの区切り
### 小見出し（H3） - サブセクション
#### 詳細見出し（H4） - 詳細項目
##### サブ見出し（H5） - 補足項目
###### 最小見出し（H6） - 最小項目
          </div>
        </div>
      </div>
      
      <div class="guide-section">
        <h3><i class="fas fa-bold"></i> テキスト装飾</h3>
        <div class="guide-example">
          <div class="code-block">
**太字テキスト**
*イタリック（斜体）テキスト*
          </div>
          <div class="preview-result">
            <strong>太字テキスト</strong><br>
            <em>イタリック（斜体）テキスト</em>
          </div>
        </div>
      </div>
      
      <div class="guide-section">
        <h3><i class="fas fa-list"></i> リスト</h3>
        <div class="guide-example">
          <div class="code-block">
- 箇条書き項目1
- 箇条書き項目2
  - サブ項目1
  - サブ項目2

1. 番号付き項目1
2. 番号付き項目2
3. 番号付き項目3
          </div>
        </div>
      </div>
      
      <div class="guide-section">
        <h3><i class="fas fa-link"></i> リンク</h3>
        <div class="guide-example">
          <div class="code-block">
[リンクテキスト](https://example.com)
          </div>
          <div class="preview-result">
            <a href="https://example.com" target="_blank">リンクテキスト</a>
          </div>
        </div>
      </div>
      
      <div class="guide-section">
        <h3><i class="fas fa-code"></i> コード</h3>
        <div class="guide-example">
          <div class="code-block">
\`インラインコード\`

\`\`\`
複数行のコードブロック
コマンド例など
\`\`\`
          </div>
        </div>
      </div>
      
      <div class="guide-section">
        <h3><i class="fas fa-quote-right"></i> 引用</h3>
        <div class="guide-example">
          <div class="code-block">
> 重要な引用文や
> 誰かの発言を記載する際に使用
          </div>
        </div>
      </div>
      
      <div class="guide-section">
        <h3><i class="fas fa-minus"></i> 水平線</h3>
        <div class="guide-example">
          <div class="code-block">
---
          </div>
          <div class="preview-result">
            <hr style="border: none; height: 2px; background: #ccc; margin: 10px 0;">
          </div>
        </div>
      </div>
      
      <div class="guide-section tips">
        <h3><i class="fas fa-lightbulb"></i> 記事作成のコツ</h3>
        <ul>
          <li><strong>見出しを活用</strong>: H2 → H3 → H4の順で構造化</li>
          <li><strong>箇条書きで整理</strong>: 複数の項目は箇条書きで読みやすく</li>
          <li><strong>重要な情報を強調</strong>: **太字**で重要な部分をハイライト</li>
          <li><strong>適度な改行</strong>: 長い文章は適度に改行して読みやすく</li>
        </ul>
      </div>
    `;
    
    // モーダルHTMLを作成
    const modalHTML = `
      <div id="writing-guide-modal" class="modal" style="display: flex; background: rgba(0, 0, 0, 0.6);">
        <div class="modal-content writing-guide">
          <div class="modal-header">
            <h2><i class="fas fa-book-open"></i> 記事作成ガイド</h2>
            <button class="modal-close" onclick="this.closest('.modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="guide-intro">
              <p>記事を美しく、読みやすく作成するためのMarkdown記法ガイドです。</p>
            </div>
            ${guideContent}
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
              <i class="fas fa-check"></i> 理解しました
            </button>
          </div>
        </div>
      </div>
    `;
    
    // モーダルを追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // モーダルを表示
    const modal = document.getElementById('writing-guide-modal');
    
    // ESCキーで閉じる
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // 背景クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    });
  }

  /**
   * 相対時間フォーマット
   * @private
   * @param {Date} date - 日付
   * @returns {string}
   */
  #formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return diffMinutes <= 0 ? '今' : `${diffMinutes}分前`;
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  }

  /**
   * 記事の文字数カウント
   * @private
   * @param {Object} article - 記事オブジェクト
   * @returns {number}
   */
  #getWordCount(article) {
    if (!article.content) return 0;
    // HTMLタグを除去して文字数をカウント
    const textContent = article.content.replace(/<[^>]*>/g, '');
    return textContent.length;
  }

  /**
   * 記事のプレビュー（ID指定）
   * @param {string} articleId - 記事ID
   */
  previewArticleById(articleId) {
    try {
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        this.#showFeedback('記事が見つかりません', 'error');
        return;
      }

      const articleContent = this.articleDataService.getArticleContent(articleId);
      const articleData = {
        title: article.title,
        category: article.category,
        date: article.date,
        status: article.status,
        summary: article.summary,
        content: articleContent
      };

      this.#showNewsPreviewModal(articleData);
      
    } catch (error) {
      console.error('❌ 記事プレビューエラー:', error);
      this.#showFeedback('プレビューの表示に失敗しました', 'error');
    }
  }

  /**
   * 記事の複製
   * @param {string} articleId - 記事ID
   */
  async duplicateArticle(articleId) {
    try {
      const originalArticle = this.articleDataService.getArticleById(articleId);
      if (!originalArticle) {
        this.#showFeedback('元記事が見つかりません', 'error');
        return;
      }

      const originalContent = this.articleDataService.getArticleContent(articleId);
      
      // 複製記事データを作成
      const duplicatedData = {
        title: `${originalArticle.title} のコピー`,
        category: originalArticle.category,
        summary: originalArticle.summary,
        content: originalContent,
        status: 'draft', // 複製は必ず下書きとして作成
        featured: false // 注目記事フラグはリセット
      };

      const result = await this.articleDataService.saveArticle(duplicatedData, false);
      
      if (result.success) {
        // 記事一覧とダッシュボードを更新
        this.refreshRecentArticles();
        this.refreshNewsList();
        this.updateDashboardStats();
        
        this.#showFeedback(`「${duplicatedData.title}」として複製しました`);
      } else {
        this.#showFeedback(result.message || '複製に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('❌ 記事複製エラー:', error);
      this.#showFeedback('記事の複製中にエラーが発生しました', 'error');
    }
  }

  /**
   * 通知モードを切り替え
   */
  toggleNotificationMode() {
    try {
      if (!this.uiManagerService) {
        console.error('❌ UIManagerServiceが利用できません');
        return;
      }
      
      const currentMode = this.uiManagerService.getNotificationMode();
      const newMode = !currentMode;
      
      this.uiManagerService.setNotificationMode(newMode);
      
      // UIの更新
      this.#updateNotificationToggleUI(newMode);
      
      // フィードバック表示
      const message = newMode ? 
        '自動通知を有効にしました' : 
        '通知をボタンアクション時のみに制限しました';
      
      // 設定変更の通知は常に表示
      this.uiManagerService.showNotification('info', message, 3000, {
        title: '通知設定',
        icon: newMode ? '🔔' : '🔕'
      });
      
      console.log(`🔔 通知モード変更: ${newMode ? '自動通知有効' : 'ボタンアクションのみ'}`);
      
    } catch (error) {
      console.error('❌ 通知モード切り替えエラー:', error);
    }
  }

  /**
   * 通知トグルUIを更新
   * @private
   * @param {boolean} isEnabled - 自動通知が有効かどうか
   */
  #updateNotificationToggleUI(isEnabled) {
    const toggleBtn = document.getElementById('notification-toggle');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('i');
      const text = toggleBtn.querySelector('.toggle-text');
      
      if (isEnabled) {
        toggleBtn.classList.add('active');
        if (icon) icon.className = 'fas fa-bell';
        if (text) text.textContent = '通知ON';
      } else {
        toggleBtn.classList.remove('active');
        if (icon) icon.className = 'fas fa-bell-slash';
        if (text) text.textContent = '通知OFF';
      }
    }
  }

  /**
   * デバッグ用：タブナビゲーション状態を確認
   * @public
   */
  debugTabNavigation() {
    console.group('🐛 タブナビゲーション デバッグ情報');
    
    // ActionManagerの状態
    console.log('ActionManager:', {
      initialized: this.actionManager?.initialized,
      actionsCount: this.actionManager?._actions?.size || 0,
      hasSwitchTab: this.actionManager?._actions?.has('switch-tab') || false
    });
    
    // DOM要素の状態
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const sections = document.querySelectorAll('.admin-section');
    const activeNavItem = document.querySelector('.nav-item.active');
    const activeSection = document.querySelector('.admin-section.active');
    
    console.log('DOM要素:', {
      navItems: navItems.length,
      sections: sections.length,
      activeNavItem: activeNavItem?.dataset?.tab,
      activeSection: activeSection?.id
    });
    
    // 利用可能なタブ
    const availableNavTabs = Array.from(navItems).map(item => ({
      tab: item.dataset.tab,
      active: item.classList.contains('active'),
      hasAction: item.hasAttribute('data-action')
    }));
    
    const availableSections = Array.from(sections).map(section => ({
      id: section.id,
      active: section.classList.contains('active')
    }));
    
    console.log('利用可能なナビタブ:', availableNavTabs);
    console.log('利用可能なセクション:', availableSections);
    
    // LocalStorage状態
    console.log('LocalStorage:', {
      adminTab: localStorage.getItem(this.storageKeys.adminTab),
      allRbsKeys: Object.keys(localStorage).filter(key => key.startsWith('rbs_'))
    });
    
    // サービス状態
    console.log('サービス状態:', {
      initialized: this.initialized,
      currentTab: this.currentTab,
      uiManagerService: !!this.uiManagerService,
      authService: !!this.authService
    });
    
    console.groupEnd();
  }

  /**
   * デバッグ用：タブを強制切り替え
   * @public
   * @param {string} tabName - タブ名
   */
  forceTabSwitch(tabName) {
    console.log(`🔧 タブ強制切り替え: ${tabName}`);
    
    if (!this.#isValidTabName(tabName)) {
      console.error(`❌ 無効なタブ名: ${tabName}`);
      return;
    }
    
    this.switchAdminTab(tabName);
  }
  
  /**
   * デバッグ用：アクション手動実行
   * @public
   * @param {string} actionName - アクション名
   * @param {Object} params - パラメータ
   */
  executeAction(actionName, params = {}) {
    console.log(`🎯 アクション手動実行: ${actionName}`, params);
    
    if (!this.actionManager || !this.actionManager._actions) {
      console.error('❌ ActionManagerが利用できません');
      return;
    }
    
    const action = this.actionManager._actions.get(actionName);
    if (!action) {
      console.error(`❌ アクション "${actionName}" が見つかりません`);
      return;
    }
    
    try {
      action(null, params);
      console.log(`✅ アクション "${actionName}" 実行完了`);
    } catch (error) {
      console.error(`❌ アクション "${actionName}" 実行エラー:`, error);
    }
  }

  /**
   * デバッグ用：Local Storage統合状況確認
   * @public
   */
  debugStorageIntegration() {
    console.group('🔍 Local Storage統合状況確認');
    
    console.log('📋 CONFIG.storage.keys設定:');
    Object.entries(CONFIG.storage.keys).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n🗄️ 実際のLocal Storage使用状況:');
    
    // AdminActionServiceのキー
    console.log('AdminActionService:');
    Object.entries(this.storageKeys).forEach(([key, value]) => {
      const hasData = !!localStorage.getItem(value);
      console.log(`  ${key}: ${value} ${hasData ? '✅ データあり' : '❌ データなし'}`);
    });
    
    // 全LocalStorageのRBS関連キーを表示
    console.log('\n📦 全RBS関連Local Storageキー:');
    const allKeys = Object.keys(localStorage);
    const rbsKeys = allKeys.filter(key => key.startsWith('rbs_') || key.includes('article') || key.includes('auth'));
    
    rbsKeys.forEach(key => {
      const value = localStorage.getItem(key);
      const size = value ? value.length : 0;
      const type = (() => {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return `Array(${parsed.length})`;
          if (typeof parsed === 'object') return 'Object';
          return typeof parsed;
        } catch {
          return 'String';
        }
      })();
      
      console.log(`  ${key}: ${size}bytes (${type})`);
    });
    
    // 統合前後の比較
    console.log('\n🔄 統合状況サマリー:');
    const expectedKeys = Object.values(CONFIG.storage.keys);
    const actualKeys = allKeys.filter(key => key.startsWith('rbs_'));
    const unmatchedKeys = actualKeys.filter(key => !expectedKeys.includes(key));
    
    console.log(`  CONFIGで定義済みキー数: ${expectedKeys.length}`);
    console.log(`  実際のRBSキー数: ${actualKeys.length}`);
    console.log(`  未統合キー数: ${unmatchedKeys.length}`);
    
    if (unmatchedKeys.length > 0) {
      console.warn('  未統合キー:', unmatchedKeys);
    } else {
      console.log('  ✅ 全キーが統合されています');
    }
    
    console.groupEnd();
    
    return {
      configKeys: CONFIG.storage.keys,
      serviceKeys: this.storageKeys,
      actualKeys: rbsKeys,
      unmatchedKeys,
      isFullyIntegrated: unmatchedKeys.length === 0
    };
  }

  /**
   * デバッグ用：LP側との互換性確認
   * @public
   */
  debugLPCompatibility() {
    console.group('🌐 LP側との互換性確認');
    
    // 記事データの確認
    const articlesKey = CONFIG.storage.keys.articles;
    const articlesData = localStorage.getItem(articlesKey);
    
    console.log('📰 記事データ互換性:');
    console.log(`  キー: ${articlesKey}`);
    
    if (articlesData) {
      try {
        const articles = JSON.parse(articlesData);
        console.log(`  データ型: ${Array.isArray(articles) ? 'Array' : typeof articles}`);
        console.log(`  記事数: ${Array.isArray(articles) ? articles.length : 'N/A'}`);
        
        if (Array.isArray(articles) && articles.length > 0) {
          const sampleArticle = articles[0];
          console.log('  サンプル記事構造:', {
            id: !!sampleArticle.id,
            title: !!sampleArticle.title,
            status: sampleArticle.status,
            category: sampleArticle.category,
            createdAt: !!sampleArticle.createdAt
          });
        }
        
        console.log('  ✅ LP側で読み込み可能');
      } catch (error) {
        console.error('  ❌ JSON解析エラー:', error);
      }
    } else {
      console.log('  ⚠️ 記事データなし');
    }
    
    // レッスン状況データの確認
    const lessonKey = CONFIG.storage.keys.lessonStatus;
    const lessonData = localStorage.getItem(lessonKey);
    
    console.log('\n📅 レッスン状況データ互換性:');
    console.log(`  キー: ${lessonKey}`);
    
    if (lessonData) {
      try {
        const lessons = JSON.parse(lessonData);
        console.log(`  データ型: ${typeof lessons}`);
        console.log(`  今日のデータ: ${!!lessons[new Date().toISOString().split('T')[0]]}`);
        console.log('  ✅ LP側で読み込み可能');
      } catch (error) {
        console.error('  ❌ JSON解析エラー:', error);
      }
    } else {
      console.log('  ⚠️ レッスンデータなし');
    }
    
    // 設定データの確認
    const settingsKey = CONFIG.storage.keys.settings;
    const settingsData = localStorage.getItem(settingsKey);
    
    console.log('\n⚙️ 設定データ互換性:');
    console.log(`  キー: ${settingsKey}`);
    console.log(`  データ: ${settingsData ? '✅ あり' : '⚠️ なし'}`);
    
    console.groupEnd();
    
    return {
      articles: !!articlesData,
      lessons: !!lessonData,
      settings: !!settingsData,
      compatible: !!articlesData && !!lessonData
    };
  }

  /**
   * 統計情報の更新
   * @private
   */
  async #updateStats() {
    try {
      if (!this.articleDataService?.initialized) {
        this.warn('ArticleDataServiceが初期化されていません - 統計情報をスキップ');
        return;
      }
      
      const stats = this.articleDataService.getStats();
      
      // 新しいID名に合わせて更新
      const elements = {
        published: document.getElementById('stat-published'),
        drafts: document.getElementById('stat-drafts'),
        currentMonth: document.getElementById('stat-current-month')
      };
      
      if (elements.published) elements.published.textContent = stats.published || 0;
      if (elements.drafts) elements.drafts.textContent = stats.drafts || 0;
      if (elements.currentMonth) elements.currentMonth.textContent = stats.currentMonth || 0;
      
      this.debug('統計情報更新完了:', stats);
      
    } catch (error) {
      this.error('統計情報更新エラー:', error);
    }
  }
}

// シングルトンインスタンス
export const adminActionService = new AdminActionService();