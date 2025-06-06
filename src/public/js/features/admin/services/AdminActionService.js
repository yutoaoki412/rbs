/**
 * 管理画面アクションサービス
 * ボタンクリックやフォーム送信などのユーザーアクションを処理
 * @version 3.0.0 - 統合アクション管理システム
 */

import { actionManager } from '../../../app/ActionManager.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { dataExportService } from '../../../shared/services/DataExportService.js';
import { uiManagerService } from './UIManagerService.js';
import { escapeHtml } from '../../../shared/utils/stringUtils.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';

export class AdminActionService {
  // プライベートフィールド宣言
  #validTabNames = ['dashboard', 'news', 'news-management', 'lesson-status', 'instagram', 'settings'];
  
  constructor() {
    this.componentName = 'AdminActionService';
    this.actionEventPrefix = 'admin-action';
    
    // サービス参照
    this.articleDataService = null;
    this.articleStorageService = null;
    this.lessonStatusService = null;
    this.instagramDataService = null;
    this.authManager = null;
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
      'wizard-prev', 'wizard-next',
      'toggle-notification-mode', 'export-data', 'clear-all-data', 'test-site-connection',
      'reset-local-storage', 'close-modal',
      'open-external', 'toggle-mobile-menu', 'logout',
      'switch-instagram-tab', 'add-instagram-post', 'save-instagram-post', 'refresh-instagram-posts', 'save-instagram-settings', 'close-instagram-modal', 'edit-instagram-post', 'toggle-instagram-post', 'delete-instagram-post'
    ];
    
    // 初期化済みフラグ
    this.initialized = false;
  }

  /**
   * ログメソッド群
   */
  log(message, ...args) {
    console.log(`[${this.componentName}]`, message, ...args);
  }

  error(message, ...args) {
    console.error(`[${this.componentName}] ERROR`, message, ...args);
  }

  warn(message, ...args) {
    console.warn(`[${this.componentName}] WARN`, message, ...args);
  }

  info(message, ...args) {
    console.info(`[${this.componentName}] INFO`, message, ...args);
  }

  debug(message, ...args) {
    console.debug(`[${this.componentName}] DEBUG`, message, ...args);
  }

  /**
   * HTML文字列のエスケープ
   * @param {string} str - エスケープする文字列
   * @returns {string} エスケープ済み文字列
   */
  escapeHtml(str) {
    return escapeHtml(str);
  }

  /**
   * 管理画面サービス初期化
   */
  async init() {
    try {
      this.log('🚀 AdminActionService初期化開始');

      // 基本設定
      this.currentTab = 'dashboard';
      this.initialized = true;

      // UIManagerServiceの初期化
      await this.initializeServices();

      // 管理画面のUI設定
      await this.setupAdminUI();

      this.log('✅ AdminActionService初期化完了');
      return true;

    } catch (error) {
      this.error('❌ AdminActionService初期化エラー:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * 通知システムテスト（デバッグ用）
   */
  testNotificationSystem() {
    if (this.uiManagerService) {
      this.uiManagerService.showNotification('success', '通知システム動作確認');
      this.debug('通知システムテスト実行');
    } else {
      this.warn('UIManagerServiceが利用できません');
    }
  }

  /**
   * サービス初期化
   * @private
   */
  async initializeServices() {
    try {
      this.debug('🔧 依存サービス初期化開始');

      // アクションマネージャーを設定・初期化
      this.actionManager = actionManager;
      if (!this.actionManager.initialized) {
        this.actionManager.init();
        this.debug('✅ ActionManager初期化完了');
      }

      // 必須サービス: UIManagerService（最優先）
      await this._initUIManagerService();

      // その他のサービス（エラーがあっても続行）
      const servicePromises = [
        this._initArticleDataService(),
        this._initLessonStatusService(),
        this._initInstagramDataService(),
        this._initNewsFormManager()
      ];

      const results = await Promise.allSettled(servicePromises);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.warn(`サービス初期化失敗 [${index}]:`, result.reason);
        }
      });

      this.debug('🎯 依存サービス初期化完了');
      
    } catch (error) {
      this.error('サービス初期化エラー:', error);
      // 重要: 依存サービスのエラーでメイン機能を停止しない
    }
  }

  async _initUIManagerService() {
    try {
      this.uiManagerService = uiManagerService;
      
      if (this.uiManagerService && !this.uiManagerService.initialized) {
        await this.uiManagerService.init();
      }
      this.debug('✅ UIManagerService初期化完了');
    } catch (error) {
      this.warn('UIManagerService初期化失敗（フォールバック対応）:', error.message);
    }
  }

  async _initArticleDataService() {
    try {
      const articleModule = await import('./ArticleDataService.js');
      this.articleDataService = articleModule.getArticleDataService ? 
        articleModule.getArticleDataService() : 
        articleModule.articleDataService;
      
      if (this.articleDataService && !this.articleDataService.initialized) {
        await this.articleDataService.init();
      }
      this.debug('✅ ArticleDataService初期化完了');
    } catch (error) {
      this.warn('ArticleDataService初期化失敗:', error.message);
    }
  }

  async _initLessonStatusService() {
    try {
      const lessonModule = await import('../../../shared/services/LessonStatusStorageService.js');
      this.lessonStatusService = lessonModule.getLessonStatusStorageService ? 
        lessonModule.getLessonStatusStorageService() : 
        lessonModule.lessonStatusStorageService;
      
      if (this.lessonStatusService && !this.lessonStatusService.initialized) {
        await this.lessonStatusService.init();
      }
      this.debug('✅ LessonStatusService初期化完了');
    } catch (error) {
      this.warn('LessonStatusService初期化失敗:', error.message);
    }
  }

  async _initInstagramDataService() {
    try {
      const instagramModule = await import('./InstagramDataService.js');
      this.instagramDataService = instagramModule.instagramDataService;
      
      if (this.instagramDataService && !this.instagramDataService.initialized) {
        this.instagramDataService.init();
      }
      this.debug('✅ InstagramDataService初期化完了');
    } catch (error) {
      this.warn('InstagramDataService初期化失敗:', error.message);
    }
  }

  async _initNewsFormManager() {
    try {
      const newsFormModule = await import('../components/NewsFormManager.js');
      this.newsFormManager = newsFormModule.newsFormManager;
      
      if (this.newsFormManager && !this.newsFormManager.initialized) {
        this.newsFormManager.init();
        console.log('✅ NewsFormManager初期化完了');
      }
      
      // イベント連携を設定
      this._setupNewsFormIntegration();
      
      this.debug('✅ NewsFormManager初期化完了');
    } catch (error) {
      this.warn('NewsFormManager初期化失敗:', error.message);
    }
  }

  /**
   * NewsFormManagerとの連携設定
   * @private
   */
  _setupNewsFormIntegration() {
    if (!this.newsFormManager) return;

    // 記事保存要求の処理
    EventBus.on('article:save:request', async (data) => {
      try {
        const { articleData, isPublish } = data;
        
        if (isPublish) {
          await this.publishNews();
        } else {
          await this.saveNews();
        }
      } catch (error) {
        console.error('記事保存処理エラー:', error);
      }
    });

    console.log('🔗 NewsFormManagerとの連携を設定');
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
  _showFeedback(message, type = 'success', duration = 5000) {
    console.log(`${type === 'error' ? 'ERROR' : type === 'warning' ? 'WARN' : 'SUCCESS'} ${message}`);
    
    if (this.uiManagerService?.showNotification) {
      this.uiManagerService.showNotification(type, message);
    } else if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, type);
    } else {
      // fallback to console
      console.log(`Feedback: ${message} (${type})`);
    }
  }
  _registerAdminActions() {
    console.log('SETUP 管理画面アクション登録開始');
    
    if (!this.actionManager) {
      this.error('ActionManagerが初期化されていません。再初期化を試行します。');
      this.actionManager = actionManager;
      if (!this.actionManager.initialized) {
        this.actionManager.init();
      }
    }
    
    if (!this.actionManager.initialized) {
      this.error('ActionManagerの初期化に失敗しました');
      return;
    }

    // ActionManagerの状態確認
    try {
      console.log('🔍 ActionManager状態:', {
        initialized: this.actionManager.initialized,
        actionsCount: this.actionManager._actions?.size || 0
      });
    } catch (error) {
      this.error('ActionManager状態確認エラー:', error);
      // ActionManagerを再取得・再初期化
      this.actionManager = actionManager;
      if (!this.actionManager.initialized) {
        this.actionManager.init();
      }
    }

    const adminActions = {
      // 認証関連はAuthManagerで処理（責任の分離）
      
      // タブ切り替え（優先度高） - HTMLのdata-action="switch-admin-tab"に対応
      'switch-admin-tab': async (element, params) => {
        console.log('🎯 switch-admin-tabアクション実行:', { element, params });
        
        const tabName = params?.tab || element?.dataset?.tab;
        console.log('🔍 取得したタブ名:', tabName);
        
        if (!tabName) {
          console.error('ERROR タブ名が取得できません:', { params, dataset: element?.dataset });
          this._showFeedback('タブ名が指定されていません', 'error');
          return;
        }
        
        if (this._isValidTabName(tabName)) {
          console.log(`START タブ切り替え実行: ${tabName}`);
          await this.switchAdminTab(tabName);
        } else {
          console.error(`ERROR 無効なタブ名: ${tabName}`);
          this._showFeedback(`無効なタブ名: ${tabName}`, 'error');
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
      'show-writing-guide': () => this.showWritingGuide(),
      
      // 記事編集関連（新しく追加）
      'edit-article': (element, params) => {
        const articleId = params.articleId || element.dataset.articleId;
        if (articleId) {
          this.editArticle(articleId);
        } else {
          this._showFeedback('記事IDが見つかりません', 'error');
        }
      },
      'delete-article': async (element, params) => {
        const articleId = params.articleId || element.dataset.articleId;
        if (articleId) {
          await this.deleteArticle(articleId);
        } else {
          this._showFeedback('記事IDが見つかりません', 'error');
        }
      },
      'preview-article': (element, params) => {
        const articleId = params.articleId || element.dataset.articleId;
        if (articleId) {
          this.previewArticleById(articleId);
        } else {
          this._showFeedback('記事IDが見つかりません', 'error');
        }
      },
      'duplicate-article': async (element, params) => {
        const articleId = params.articleId || element.dataset.articleId;
        if (articleId) {
          await this.duplicateArticle(articleId);
        } else {
          this._showFeedback('記事IDが見つかりません', 'error');
        }
      },

      // レッスン状況
      'load-lesson-status': () => this.loadLessonStatus(),
      'update-lesson-status': () => this.updateLessonStatus(),
      'preview-lesson-status': () => this.previewLessonStatus(),
      'save-draft-lesson-status': () => this.saveDraftLessonStatus(),
      

      
      'wizard-prev': () => this.wizardPrevStep(),
      'wizard-next': () => this.wizardNextStep(),

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

      'close-modal': () => this.closeModal(),
      'open-external': (element, params) => this.openExternalUrl(params.url),

      // 認証関連
      'logout': () => this.handleAuthLogout(),

      // UIイベント
      'toggle-mobile-menu': (element) => this.toggleMobileMenu(element),

      // Instagram管理
      'switch-instagram-tab': (element, params) => this.switchInstagramTab(params.tab),
      'add-instagram-post': () => this.addInstagramPost(),
      'save-instagram-post': () => this.saveInstagramPost(),
      'refresh-instagram-posts': () => this.refreshInstagramPosts(),
      'save-instagram-settings': () => this.saveInstagramSettings(),
      'close-instagram-modal': () => this.closeInstagramModal(),
      'edit-instagram-post': (element, params) => {
        const postId = params.postId || element.dataset.postId;
        if (postId) {
          this.editInstagramPost(postId);
        } else {
          this._showFeedback('投稿IDが見つかりません', 'error');
        }
      },
      'toggle-instagram-post': (element, params) => {
        const postId = params.postId || element.dataset.postId;
        if (postId) {
          this.toggleInstagramPostStatus(postId);
        } else {
          this._showFeedback('投稿IDが見つかりません', 'error');
        }
      },
      'delete-instagram-post': async (element, params) => {
        const postId = params.postId || element.dataset.postId;
        if (postId && confirm('この投稿を削除しますか？')) {
          await this.deleteInstagramPost(postId);
        }
      }
    };

    // アクションを登録
    try {
      if (!this.actionManager || !this.actionManager.registerMultiple) {
        throw new Error('ActionManagerまたはregisterMultipleメソッドが利用できません');
      }
      
      this.actionManager.registerMultiple(adminActions);
      console.log('SUCCESS 管理画面アクション登録完了');
      console.log('🔍 登録されたアクション数:', Object.keys(adminActions).length);
      
      // 登録確認
      const registeredActions = Array.from(this.actionManager._actions?.keys() || []);
      console.log('🔍 ActionManagerに登録済みのアクション:', registeredActions);
      
      // 重要なアクションの登録確認
      const criticalActions = ['switch-admin-tab', 'new-news-article', 'preview-news'];
      const missingActions = criticalActions.filter(action => !registeredActions.includes(action));
      
      if (missingActions.length > 0) {
        this.warn('重要なアクションが登録されていません:', missingActions);
      } else {
        console.log('✅ 重要なアクションはすべて登録済み');
      }
      
    } catch (error) {
      this.error('管理画面アクション登録エラー:', error);
      
      // デバッグ情報を追加
      console.error('🔍 デバッグ情報:', {
        actionManager: !!this.actionManager,
        initialized: this.actionManager?.initialized,
        registerMultiple: typeof this.actionManager?.registerMultiple,
        actionsSize: this.actionManager?._actions?.size
      });
      
      throw error; // エラーを上位に伝播
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
      this.debug('🎯 管理画面UI設定開始');
      
      // ActionManagerの初期化確認・再初期化
      if (!this.actionManager || !this.actionManager.initialized) {
        this.error('ActionManagerが初期化されていません。再初期化を試行します。');
        
        // インポートから再取得
        const { actionManager: freshActionManager } = await import('../../../app/ActionManager.js');
        this.actionManager = freshActionManager;
        
        if (!this.actionManager.initialized) {
          this.actionManager.init();
          this.debug('✅ ActionManager再初期化完了');
        }
      }
      
      // 最終確認
      if (!this.actionManager.initialized) {
        throw new Error('ActionManagerの初期化に失敗しました');
      }
      
      // アクション登録（コア機能）
      this._registerAdminActions();
      
      // UIイベント設定（コア機能）
      this.setupUIEvents();
      
      // 初期タブをダッシュボードに設定
      await this.switchAdminTab('dashboard');

      // 基本機能の初期化を並行実行（パフォーマンス向上）
      const initPromises = [
        this.initializeNewsManagement().catch(e => this.warn('ニュース管理初期化失敗:', e.message)),
        this.initializeLessonStatusTab().catch(e => this.warn('レッスン状況初期化失敗:', e.message)),
        this.loadInitialData().catch(e => this.warn('初期データ読み込み失敗:', e.message))
      ];

      await Promise.allSettled(initPromises);

      // 統計の更新
      this.updateDashboardStats();
      
      this.debug('🎯 管理画面UI設定完了');
    } catch (error) {
      this.error('管理画面UI設定エラー:', error);
      throw error; // 重要なエラーは上位に伝播
    }
  }



  /**
   * ニュース管理初期化
   * @private
   */
  async initializeNewsManagement() {
    try {
      this.debug('📰 ニュース管理初期化開始');
      
      // 最近の記事を読み込み（エラーが起きても基本機能に影響しない）
      this.refreshRecentArticles().catch(error => {
        this.warn('最近の記事読み込みエラー:', error.message);
      });
      
      this.debug('📰 ニュース管理初期化完了');
    } catch (error) {
      this.warn('ニュース管理初期化で軽微なエラー:', error.message);
      // 続行
    }
  }

  /**
   * 初期データ読み込み
   * @private
   */
  async loadInitialData() {
    try {
      this.debug('SAVE 初期データ読み込み開始');
      
      // レッスン状況の初期読み込み（エラーが起きても続行）
      this.loadLessonStatus().catch(error => {
        this.warn('レッスン状況読み込みエラー:', error.message);
      });
      
      this.debug('SAVE 初期データ読み込み完了');
    } catch (error) {
      this.warn('初期データ読み込みで軽微なエラー:', error.message);
      // 続行
    }
  }



  /**
   * 管理画面タブ切り替え
   * @param {string} tabName - タブ名
   */
  async switchAdminTab(tabName) {
    console.log(`🔄 管理画面タブ切り替え開始: ${tabName}`);
    
    // バリデーション
    if (!this._isValidTabName(tabName)) {
      console.error(`ERROR 無効なタブ名: ${tabName}`);
      this._showFeedback(`無効なタブ名: ${tabName}`, 'error');
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
        console.log(`OUT 旧タブ非アクティブ: ${currentActiveTab.id}`);
      }
      if (currentActiveNavItem) {
        currentActiveNavItem.classList.remove('active');
        console.log(`OUT 旧ナビ非アクティブ: ${currentActiveNavItem.dataset.tab}`);
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
        console.error(`ERROR タブセクションが見つかりません: #${tabName}`);
        this._showFeedback(`タブセクション "${tabName}" が見つかりません`, 'error');
        return;
      }
      
      if (!newActiveNavItem) {
        console.error(`ERROR ナビゲーションアイテムが見つかりません: [data-tab="${tabName}"]`);
        this._showFeedback(`ナビゲーションアイテム "${tabName}" が見つかりません`, 'error');
        return;
      }
      
      // アクティブ状態を設定
      newActiveTab.classList.add('active');
      newActiveNavItem.classList.add('active');
      
      console.log(`IN 新タブアクティブ: ${newActiveTab.id}`);
      console.log(`IN 新ナビアクティブ: ${newActiveNavItem.dataset.tab}`);
      
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
      console.log(`SAVE タブ状態保存: ${tabName}`);
      
      // タブ固有の初期化処理（非同期）
      await this.initializeTabContent(tabName);
      this.currentTab = tabName;
      
      // 成功通知
      const tabDisplayName = this._getTabDisplayName(tabName);
      console.log(`SUCCESS ${tabDisplayName}に切り替え完了`);
      this._showFeedback(`${tabDisplayName}に切り替えました`, 'info', 2000);
      
    } catch (error) {
      console.error(`ERROR タブ切り替えエラー (${tabName}):`, error);
      this._showFeedback(`タブの切り替えに失敗しました: ${error.message}`, 'error');
    }
  }

  /**
   * タブ初期化（コンテンツ読み込み）
   * @private
   * @param {string} tabName - タブ名
   */
  async initializeTabContent(tabName) {
    console.log(`📋 タブコンテンツ初期化: ${tabName}`);
    
    try {
      switch (tabName) {
        case 'dashboard':
          // ダッシュボード統計の更新
          this.updateDashboardStats();
          
          // 最近の記事を読み込み
          await this.refreshRecentArticles();
          break;
          
        case 'news-management':
          // 記事管理の初期化
          await this.refreshRecentArticles();
          this.refreshNewsList();
          break;
          
        case 'lesson-status':
          // レッスン状況の初期化
          await this.initializeLessonStatusTab();
          break;
          
        case 'settings':
          // 設定タブの初期化（必要に応じて）
          break;
          
        default:
          console.warn(`未知のタブ: ${tabName}`);
      }
      
      console.log(`SUCCESS タブコンテンツ初期化完了: ${tabName}`);
      
    } catch (error) {
      console.error(`ERROR タブコンテンツ初期化エラー [${tabName}]:`, error);
      this._showFeedback(`${tabName}タブの初期化に失敗しました`, 'error');
    }
  }

  /**
   * 有効なタブ名かチェック
   * @private
   * @param {string} tabName - タブ名
   * @returns {boolean}
   */
  _isValidTabName(tabName) {
    return ['dashboard', 'news-management', 'lesson-status', 'instagram', 'settings'].includes(tabName);
  }

  /**
   * ニュースタブの切り替え
   * @param {string} tabName - 切り替え先タブ名 ('editor' または 'list')
   */
  switchNewsTab(tabName) {
    try {
      this.debug(`📰 ニュースタブ切り替え: ${tabName}`);
      
      // バリデーション
      const validNewsTabNames = ['editor', 'list'];
      if (!validNewsTabNames.includes(tabName)) {
        this.error(`無効なニュースタブ名: ${tabName}`);
        return;
      }

      // 現在のアクティブタブを非アクティブにする
      const currentActiveNewsTab = document.querySelector('.sub-nav-item.active');
      const currentActiveNewsContent = document.querySelector('.news-tab-content.active');
      
      if (currentActiveNewsTab) {
        currentActiveNewsTab.classList.remove('active');
      }
      if (currentActiveNewsContent) {
        currentActiveNewsContent.classList.remove('active');
      }

      // 新しいタブをアクティブにする
      const newActiveNavItem = document.querySelector(`[data-action="switch-news-tab"][data-tab="${tabName}"]`);
      const newActiveContent = document.getElementById(`news-${tabName}-tab`);
      
      if (newActiveNavItem) {
        newActiveNavItem.classList.add('active');
      } else {
        this.warn(`ニュースナビゲーション要素が見つかりません: ${tabName}`);
      }
      
      if (newActiveContent) {
        newActiveContent.classList.add('active');
      } else {
        this.warn(`ニュースコンテンツ要素が見つかりません: news-${tabName}-tab`);
      }

      // タブごとの初期化処理
      if (tabName === 'list') {
        // 記事一覧を更新
        this.refreshNewsList();
      } else if (tabName === 'editor') {
        // エディターの初期化（必要に応じて）
        this.debug('ニュースエディターを表示');
      }

      this.debug(`SUCCESS ニュースタブ切り替え完了: ${tabName}`);
      
    } catch (error) {
      this.error('ニュースタブ切り替えエラー:', error);
      this._showFeedback('タブの切り替えに失敗しました', 'error');
    }
  }

  /**
   * 記事作成ガイドを表示
   */
  showWritingGuide() {
    try {
      this.debug('GUIDE 記事作成ガイドを表示');
      
      const guideContent = `
        <div class="writing-guide-modern">
          <!-- ヘッダー -->
          <div class="guide-header">
            <div class="guide-icon">
              <i class="fas fa-book-open"></i>
            </div>
            <div class="guide-title">
              <h3>記事作成ガイド</h3>
              <p>効果的な記事を作成するためのガイドライン</p>
            </div>
          </div>

          <!-- ガイドコンテンツ -->
          <div class="guide-content">
            
            <!-- 基本的な書き方 -->
            <div class="guide-card">
              <div class="card-header">
                <i class="fas fa-pencil-alt"></i>
                <h4>基本的な書き方</h4>
              </div>
              <div class="card-content">
                <div class="tip-item">
                  <strong>タイトル:</strong> 簡潔で分かりやすく（30文字以内推奨）
                </div>
                <div class="tip-item">
                  <strong>概要:</strong> 記事の要点を1-2文で（100文字以内推奨）
                </div>
                <div class="tip-item">
                  <strong>本文:</strong> 読みやすい長さの段落に分けて記述
                </div>
              </div>
            </div>

            <!-- Markdown記法 -->
            <div class="guide-card">
              <div class="card-header">
                <i class="fab fa-markdown"></i>
                <h4>Markdown記法</h4>
              </div>
              <div class="card-content">
                <div class="markdown-grid">
                  <div class="markdown-item">
                    <code>## 見出し</code>
                    <span class="arrow">→</span>
                    <strong class="result">大見出し</strong>
                  </div>
                  <div class="markdown-item">
                    <code>**太字**</code>
                    <span class="arrow">→</span>
                    <strong class="result">太字</strong>
                  </div>
                  <div class="markdown-item">
                    <code>- リスト項目</code>
                    <span class="arrow">→</span>
                    <span class="result">• リスト項目</span>
                  </div>
                  <div class="markdown-item">
                    <code>[リンク](URL)</code>
                    <span class="arrow">→</span>
                    <a href="#" class="result">リンク</a>
                  </div>
                </div>
              </div>
            </div>

            <!-- カテゴリー選択 -->
            <div class="guide-card">
              <div class="card-header">
                <i class="fas fa-tags"></i>
                <h4>カテゴリー選択</h4>
              </div>
              <div class="card-content">
                <div class="category-grid">
                  <div class="category-item announcement">
                    <span class="category-name">お知らせ</span>
                    <span class="category-desc">一般的な告知・連絡事項</span>
                  </div>
                  <div class="category-item event">
                    <span class="category-name">体験会</span>
                    <span class="category-desc">体験レッスンの案内</span>
                  </div>
                  <div class="category-item media">
                    <span class="category-name">メディア</span>
                    <span class="category-desc">メディア掲載、取材記事</span>
                  </div>
                  <div class="category-item important">
                    <span class="category-name">重要</span>
                    <span class="category-desc">緊急性の高い重要な連絡</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 公開前チェック -->
            <div class="guide-card">
              <div class="card-header">
                <i class="fas fa-check-circle"></i>
                <h4>公開前チェックリスト</h4>
              </div>
              <div class="card-content">
                <div class="checklist">
                  <div class="check-item">
                    <i class="fas fa-check"></i>
                    <span>タイトルと内容が一致しているか</span>
                  </div>
                  <div class="check-item">
                    <i class="fas fa-check"></i>
                    <span>誤字脱字がないか</span>
                  </div>
                  <div class="check-item">
                    <i class="fas fa-check"></i>
                    <span>日付とカテゴリーが適切か</span>
                  </div>
                  <div class="check-item">
                    <i class="fas fa-check"></i>
                    <span>プレビューで表示を確認したか</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- フッター -->
          <div class="guide-footer">
            <div class="footer-tip">
              <i class="fas fa-lightbulb"></i>
              <span>プレビュー機能で記事の表示を事前に確認できます</span>
            </div>
          </div>
        </div>
      `;

      // モーダルを表示
      this._showModal('記事作成ガイド', guideContent);
      
    } catch (error) {
      this.error('記事作成ガイド表示エラー:', error);
      this._showFeedback('ガイドの表示に失敗しました', 'error');
    }
  }

  /**
   * 新規記事作成を開始
   */
  startNewArticle() {
    try {
      this.debug('🆕 新規記事作成開始');
      
      // エディターをクリア
      this.clearNewsEditor();
      
      // エディタータブに切り替え
      this.switchNewsTab('editor');
      
      // エディターのタイトル更新
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) {
        editorTitle.textContent = '新規記事作成';
      }
      
      this._showFeedback('新規記事の作成を開始しました', 'success');
      
    } catch (error) {
      this.error('新規記事作成開始エラー:', error);
      this._showFeedback('新規記事作成の開始に失敗しました', 'error');
    }
  }

  /**
   * 通知モードの切り替え
   */
  toggleNotificationMode() {
    try {
      this.debug('🔔 通知モード切り替え');
      
      const toggleBtn = document.getElementById('notification-toggle');
      const toggleText = toggleBtn?.querySelector('.toggle-text');
      const toggleIcon = toggleBtn?.querySelector('i');
      
      if (!toggleBtn) {
        this.warn('通知切り替えボタンが見つかりません');
        return;
      }
      
      // 現在の状態を取得
      const currentMode = localStorage.getItem(CONFIG.storage.keys.notificationMode) || 'off';
      const newMode = currentMode === 'on' ? 'off' : 'on';
      
      // 状態を保存
              localStorage.setItem(CONFIG.storage.keys.notificationMode, newMode);
      
      // UIを更新
      if (newMode === 'on') {
        toggleIcon?.classList.remove('fa-bell-slash');
        toggleIcon?.classList.add('fa-bell');
        if (toggleText) toggleText.textContent = '通知ON';
        toggleBtn.classList.add('active');
        this._showFeedback('通知を有効にしました', 'success');
      } else {
        toggleIcon?.classList.remove('fa-bell');
        toggleIcon?.classList.add('fa-bell-slash');
        if (toggleText) toggleText.textContent = '通知OFF';
        toggleBtn.classList.remove('active');
        this._showFeedback('通知を無効にしました', 'info');
      }
      
      this.debug(`SUCCESS 通知モード変更: ${newMode}`);
      
    } catch (error) {
      this.error('通知モード切り替えエラー:', error);
      this._showFeedback('通知設定の切り替えに失敗しました', 'error');
    }
  }

  /**
   * 設定を保存
   */
  saveSettings() {
    try {
      this.debug('⚙️ 設定保存開始');
      
      // 現在の設定を収集
      const settings = {
        notificationMode: localStorage.getItem(CONFIG.storage.keys.notificationMode) || 'off',
        lastSaved: new Date().toISOString()
      };
      
      // 設定を保存
      localStorage.setItem(CONFIG.storage.keys.adminSettings, JSON.stringify(settings));
      
      this._showFeedback('設定を保存しました', 'success');
      this.debug('SUCCESS 設定保存完了:', settings);
      
    } catch (error) {
      this.error('設定保存エラー:', error);
      this._showFeedback('設定の保存に失敗しました', 'error');
    }
  }

  /**
   * タブ表示名を取得
   * @private
   * @param {string} tabName - タブ名
   * @returns {string}
   */
  _getTabDisplayName(tabName) {
    const tabNames = {
      'dashboard': 'ダッシュボード',
      'news-management': '記事管理',
      'lesson-status': 'レッスン状況',
      'instagram': 'Instagram',
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
      await this._ensureArticleDataReady();
      
      // 最近の記事と統計情報の読み込み
      await Promise.all([
        this._loadRecentArticlesWithRetry(),
        this._updateStats()
      ]);
      
      this.debug('SUCCESS ダッシュボード初期化完了');
      
    } catch (error) {
      this.error('ERROR ダッシュボード初期化エラー:', error);
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
    this._showRecentArticlesError();
  }

  /**
   * 最近の記事のエラー状態を表示
   * @private
   */
  _showRecentArticlesError() {
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
   * レッスン状況初期化
   * @private
   */
  async #initializeLessonStatus() {
    try {
      this.debug('📅 レッスン状況初期化開始');
      
      // ウィザードステップを初期化
      this.initializeWizard();
      
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
   * ウィザードを初期化
   */
  initializeWizard() {
    // 今日の日付を設定
    const today = new Date().toISOString().slice(0, 10);
    const dateField = document.getElementById('lesson-date');
    if (dateField && !dateField.value) {
      dateField.value = today;
    }
    
    // ボタンの初期状態を設定
    this.updateWizardButtons();
    
    console.log('SUCCESS レッスン状況ウィザードを初期化しました');
  }

  /**
   * ウィザードステップを設定
   * @private
   * @param {number} step ステップ番号
   */
  _setWizardStep(step) {
    try {
      console.log(`🔮 ウィザードステップ設定: ${step}`);
      
      // 現在のステップを保存
      this.currentWizardStep = step;
      
      // すべてのステップからactiveクラスを削除
      document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active', 'completed');
      });
      
      // すべてのステップコンテンツを非表示
      document.querySelectorAll('.wizard-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // 現在のステップと以前のステップにクラスを設定
      for (let i = 1; i <= 2; i++) {
        const stepEl = document.querySelector(`.step[data-step="${i}"]`);
        const contentEl = document.querySelector(`.wizard-content.step-${i}`);
        
        if (i < step) {
          // 完了したステップ
          if (stepEl) stepEl.classList.add('completed');
        } else if (i === step) {
          // 現在のステップ
          if (stepEl) stepEl.classList.add('active');
          if (contentEl) contentEl.classList.add('active');
        }
      }
      
      console.log(`SUCCESS ウィザードステップ ${step} に設定完了`);
      
    } catch (error) {
      console.error('ERROR ウィザードステップ設定エラー:', error);
    }
  }

  /**
   * ウィザードボタンの状態を更新
   */
  updateWizardButtons() {
    try {
      const prevBtn = document.querySelector('.wizard-prev');
      const nextBtn = document.querySelector('.wizard-next');
      
      if (!prevBtn || !nextBtn) {
        // ウィザードボタンが存在しない場合は静かに返す（警告なし）
        return;
      }
      
      // 現在のステップに基づいてボタンの状態を設定
      const currentStep = this.currentWizardStep || 1;
      
      // 前へボタンの表示と状態設定
      prevBtn.style.display = 'flex';
      prevBtn.style.visibility = 'visible';
      prevBtn.style.opacity = '1';
      
      if (currentStep <= 1) {
        prevBtn.disabled = true;
        prevBtn.classList.add('disabled');
      } else {
        prevBtn.disabled = false;
        prevBtn.classList.remove('disabled');
      }
      
      // 次へボタンの表示と状態設定
      nextBtn.style.display = 'flex';
      nextBtn.style.visibility = 'visible';
      nextBtn.style.opacity = '1';
      
      if (currentStep >= 2) {
        nextBtn.disabled = true;
        nextBtn.classList.add('disabled');
        nextBtn.innerHTML = '<i class="fas fa-check"></i> 完了';
      } else {
        nextBtn.disabled = false;
        nextBtn.classList.remove('disabled');
        nextBtn.innerHTML = '次へ <i class="fas fa-chevron-right"></i>';
      }
      
      console.log(`SUCCESS ウィザードボタン状態更新: ステップ${currentStep}`, {
        'prevBtn-display': prevBtn.style.display,
        'nextBtn-display': nextBtn.style.display,
        'prevBtn-disabled': prevBtn.disabled,
        'nextBtn-disabled': nextBtn.disabled
      });
      
    } catch (error) {
      console.error('ERROR ウィザードボタン状態更新エラー:', error);
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

  /**
   * Instagram管理初期化
   * @private
   */
  async #initializeInstagramManagement() {
    try {
      this.debug('📸 Instagram管理初期化開始');
      
      // Instagram管理セクションが存在することを確認
      const instagramSection = document.getElementById('instagram-management');
      if (!instagramSection) {
        console.warn('WARN Instagram管理セクションが見つかりません');
        return;
      }
      
      // Instagram管理セクションがアクティブかどうか確認
      if (!instagramSection.classList.contains('active')) {
        console.warn('WARN Instagram管理セクションがアクティブではありません');
        return;
      }
      
      console.log('SUCCESS Instagram管理セクションを確認しました');
      
      // Instagram管理タブの設定と表示を確実に行う
      this._setupInstagramTabs();
      
      // DOM要素の存在確認後にタブ切り替えと投稿読み込みを実行
      setTimeout(() => {
        // デフォルトで投稿管理タブを表示
        this.switchInstagramTab('posts');
        
        // Instagram投稿一覧を読み込み
        this.refreshInstagramPosts();
      }, 100);
      
      this.debug('📸 Instagram管理初期化完了');
    } catch (error) {
      this.error('Instagram管理初期化エラー:', error);
    }
  }

  /**
   * Instagramタブの設定
   * @private
   */
  _setupInstagramTabs() {
    console.log('SETUP Instagramタブ設定開始');
    
    try {
      // タブボタンが存在することを確認
      const tabButtons = document.querySelectorAll('.sub-nav-item[data-action="switch-instagram-tab"]');
      console.log('📋 検出されたタブボタン数:', tabButtons.length);
      
      if (tabButtons.length === 0) {
        console.warn('WARN Instagramタブボタンが見つかりません');
        return;
      }
      
      // タブコンテンツが存在することを確認
      const tabContents = document.querySelectorAll('.instagram-tab-content');
      console.log('📄 検出されたタブコンテンツ数:', tabContents.length);
      
      if (tabContents.length === 0) {
        console.warn('WARN Instagramタブコンテンツが見つかりません');
        return;
      }
      
      // 各タブボタンの状態をチェック
      tabButtons.forEach((button, index) => {
        const tabName = button.dataset.tab;
        console.log(`🏷️ タブ${index + 1}: ${tabName}`);
        
        // data-tab属性が正しく設定されているかチェック
        if (!tabName) {
          console.warn(`WARN タブボタン${index + 1}にdata-tab属性がありません`, button);
        }
      });
      
      // 各タブコンテンツの状態をチェック
      tabContents.forEach((content, index) => {
        const contentId = content.id;
        console.log(`GUIDE コンテンツ${index + 1}: ${contentId}`);
        
        // IDが正しく設定されているかチェック
        if (!contentId || !contentId.includes('instagram-') || !contentId.includes('-tab')) {
          console.warn(`WARN タブコンテンツ${index + 1}のIDが不正です:`, contentId);
        }
      });
      
      // 必要なタブが揃っているかチェック
      const expectedTabs = ['posts', 'settings'];
      const availableTabs = Array.from(tabButtons).map(btn => btn.dataset.tab).filter(Boolean);
      
      expectedTabs.forEach(expectedTab => {
        if (!availableTabs.includes(expectedTab)) {
          console.warn(`WARN 必要なタブが見つかりません: ${expectedTab}`);
        }
      });
      
      console.log('SUCCESS Instagramタブ設定完了');
      
    } catch (error) {
      console.error('ERROR Instagramタブ設定エラー:', error);
    }
  }

  // === 記事管理関連メソッド ===

  /**
   * 記事エディターをクリア（NewsFormManagerとの統合版）
   * @param {boolean} showNotification - 通知を表示するかどうか（デフォルト: true）
   */
  clearNewsEditor(showNotification = true) {
    try {
      // NewsFormManagerが利用可能な場合はそちらを使用
      if (this.newsFormManager && this.newsFormManager.initialized) {
        this.newsFormManager.clearForm();
        if (showNotification) {
          this._showFeedback('記事エディターをクリアしました');
        }
        console.log('📝 記事エディターをクリア（NewsFormManager使用）');
        return;
      }

      // NewsFormManagerが利用できない場合は直接操作
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

      // 自動保存データを削除
      try {
        localStorage.removeItem('rbs-news-draft');
      } catch (error) {
        console.warn('自動保存データの削除に失敗:', error);
      }

      // 手動実行時のみ通知を表示
      if (showNotification) {
        this._showFeedback('記事エディターをクリアしました');
      }
      
      console.log('📝 記事エディターをクリア（直接操作）');

    } catch (error) {
      console.error('ERROR 記事エディタークリアエラー:', error);
      this._showFeedback('エディターのクリアに失敗しました', 'error');
    }
  }

  /**
   * 記事プレビュー（NewsFormManagerとの統合版）
   */
  async previewNews() {
    try {
      console.log('👁️ 記事プレビュー開始');
      
      // NewsFormManagerからフォームデータを取得
      let formData;
      if (this.newsFormManager && this.newsFormManager.initialized) {
        formData = this.newsFormManager.getFormData();
        console.log('📝 NewsFormManagerからデータを取得');
      } else {
        // フォールバック: 直接フォームからデータを取得
        formData = this._getArticleDataFromForm();
        console.log('📝 直接フォームからデータを取得');
      }
      
      if (!formData.title.trim()) {
        this._showFeedback('タイトルが入力されていません', 'error');
        return;
      }
      
      if (!formData.content.trim()) {
        this._showFeedback('本文が入力されていません', 'error');
        return;
      }
      
      // プレビューモーダルを作成・表示
      this._showNewsPreviewModal(formData);
      
      // ユーザーアクションなので通知を表示
      this._showFeedback('プレビューを表示しました');
      
    } catch (error) {
      console.error('ERROR 記事プレビューエラー:', error);
      this._showFeedback('プレビューの表示に失敗しました', 'error');
    }
  }

  /**
   * 記事保存
   */
  async saveNews() {
    try {
      const articleData = this._getArticleDataFromForm();
      
      if (!this._validateArticleData(articleData)) {
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
        
        console.log('SAVE 記事を保存:', result);
      } else {
        this._showFeedback(result.message || '保存に失敗しました', 'error');
      }

    } catch (error) {
      console.error('ERROR 記事保存エラー:', error);
      this._showFeedback('記事の保存中にエラーが発生しました', 'error');
    }
  }

  /**
   * 記事公開
   */
  async publishNews() {
    try {
      const articleData = this._getArticleDataFromForm();
      
      if (!this._validateArticleData(articleData)) {
        return;
      }

      const result = await this.articleDataService.saveArticle(articleData, true);
      
      if (result.success) {
        // 公開成功時の処理
        this._showFeedback(`記事「${articleData.title}」を公開しました`, 'success');
        
        // フォームをクリア（通知なし）
        this.clearNewsEditor(false);
        
        // ダッシュボードタブに移動
        await this.switchAdminTab('dashboard');
        
        // ダッシュボードの統計を更新
        this.updateDashboardStats();
        
        // ボタンアクション用のイベントを発行（通知表示用）
        EventBus.emit('button:article:published', { 
          title: articleData.title,
          id: result.id 
        });
        
        console.log('OUT 記事を公開:', result);
      } else {
        this._showFeedback(result.message || '公開に失敗しました', 'error');
      }

    } catch (error) {
      console.error('ERROR 記事公開エラー:', error);
      this._showFeedback('記事の公開中にエラーが発生しました', 'error');
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
      
      this._showFeedback(`連携テスト完了 - 記事数: ${articles.length}件`);
      
    } catch (error) {
      console.error('ERROR ArticleService テストエラー:', error);
      this._showFeedback('連携テストに失敗しました', 'error');
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
      console.error('ERROR Markdownテキスト挿入エラー:', error);
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
      
      this._renderNewsList(filterValue);
      
      // フィルター状態をビジュアルに反映
      const filterSelect = document.getElementById('news-filter');
      if (filterSelect && filterSelect.value !== filterValue) {
        filterSelect.value = filterValue;
      }
      
    } catch (error) {
      console.error('ERROR ニュース一覧フィルタリングエラー:', error);
      this._showFeedback('フィルタリングに失敗しました', 'error');
    }
  }

  /**
   * ニュース一覧更新
   */
  refreshNewsList() {
    try {
      console.log('🔄 ニュース一覧更新');
      this._renderNewsList();
      // 内部処理なので通知は表示しない（コンソールログのみ）
      console.log('SUCCESS ニュース一覧更新完了');
      
    } catch (error) {
      console.error('ERROR ニュース一覧更新エラー:', error);
      this._showFeedback('一覧の更新に失敗しました', 'error');
    }
  }

  /**
   * 最近の記事更新表示
   */
  async refreshRecentArticles() {
    try {
      console.log('🔄 最近の記事更新開始');
      
      const recentContainer = document.getElementById('recent-articles');
      if (!recentContainer) {
        console.warn('WARN recent-articles コンテナが見つかりません');
        return;
      }
      
      // ローディング表示
      recentContainer.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          記事を読み込み中...
        </div>
      `;
      
      // CONFIG.jsで定義されたキーを使用して記事データを取得
      const articlesKey = CONFIG.storage.keys.articles;
      const articlesData = localStorage.getItem(articlesKey);
      
      let articles = [];
      
      if (articlesData) {
        try {
          const parsedArticles = JSON.parse(articlesData);
          if (Array.isArray(parsedArticles)) {
            // 有効な記事のみフィルタリング（Instagram関連を完全除外）
            articles = parsedArticles.filter(article => {
              if (!article || !article.id || !article.title) {
                return false;
              }
              
              // Instagram関連のコンテンツを完全除外
              const title = article.title.toLowerCase();
              const summary = (article.summary || '').toLowerCase();
              const content = (article.content || '').toLowerCase();
              
              const hasInstagram = title.includes('instagram') || 
                                 title.includes('インスタグラム') ||
                                 title.includes('インスタ') ||
                                 summary.includes('instagram') ||
                                 summary.includes('インスタグラム') ||
                                 content.includes('instagram管理') ||
                                 content.includes('投稿リンク');
              
              return !hasInstagram;
            });
            
            console.log(`📄 有効な記事: ${articles.length}件（除外後）`);
          }
        } catch (parseError) {
          console.error('記事データの解析エラー:', parseError);
          articles = [];
        }
      }
      
      // 最近の記事をソートして最大5件表示
      const recentArticles = articles
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0);
          const dateB = new Date(b.updatedAt || b.createdAt || 0);
          return dateB - dateA;
        })
        .slice(0, 5);
      
      // HTML生成
      let html = '';
      
      // 統合されたメソッドを使用
      html = this._generateUnifiedArticleListHTML(recentArticles, {
        mode: 'recent',
        showActions: true,
        showMeta: true,
        emptyMessage: '記事がまだありません',
        emptyAction: {
          action: 'new-news-article',
          icon: 'fa-plus',
          text: '新規記事を作成'
        }
      });
      
      recentContainer.innerHTML = html;
      console.log(`SUCCESS 最近の記事更新完了 - ${recentArticles.length}件表示`);
      
    } catch (error) {
      console.error('ERROR 最近の記事更新エラー:', error);
      
      const recentContainer = document.getElementById('recent-articles');
      if (recentContainer) {
        recentContainer.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>記事の読み込みに失敗しました</p>
            <button class="btn btn-outline" data-action="refresh-recent-articles">
              <i class="fas fa-refresh"></i> 再試行
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * 最近の記事のローディング状態を表示
   * @private
   */
  // このメソッドは削除 - refreshRecentArticles内で直接処理

  // === レッスン状況管理メソッド ===

  /**
   * レッスン状況読み込み
   */
  async loadLessonStatus() {
    try {
      const targetDate = document.getElementById('lesson-date')?.value || this._getTodayDateString();
      
      // 現在の状況表示を更新
      this._updateCurrentStatusDisplay();
      
      // シンプルなレッスン状況読み込み
      if (this.lessonStatusService) {
        const data = this.lessonStatusService.getStatusByDate(targetDate);
        
        if (data) {
          this._populateLessonStatusForm(data);
          this._showFeedback(`${targetDate} のレッスン状況を読み込みました`, 'success');
        } else {
          // デフォルト値を設定
          this._setDefaultLessonStatus(targetDate);
          this._showFeedback(`${targetDate} の新規レッスン状況を設定しました`, 'info');
        }
      } else {
        // サービスが利用できない場合は、デフォルト値を設定
        this._setDefaultLessonStatus(targetDate);
        this._showFeedback('デフォルトのレッスン状況を設定しました', 'info');
      }
      
    } catch (error) {
      this.error('レッスン状況読み込みエラー:', error);
      this._showFeedback('レッスン状況の読み込みに失敗しました', 'error');
    }
  }

  /**
   * レッスン状況をフォームに反映（プライベートメソッド）
   * @private
   * @param {Object} data - レッスン状況データ
   */
  _populateLessonStatusForm(data) {
    try {
      // 日付設定
      if (data.date) {
        const dateField = document.getElementById('lesson-date');
        if (dateField) dateField.value = data.date;
      }
      
      // グローバルメッセージ設定
      if (data.globalMessage) {
        const messageField = document.getElementById('global-message');
        if (messageField) messageField.value = data.globalMessage;
      }
      
      // グローバルステータス設定（英語キーから日本語値にマッピング）
      if (data.globalStatus) {
        const globalJapanese = this._mapStatusKeyToJapanese(data.globalStatus);
        const globalRadio = document.querySelector(`input[name="global-status"][value="${globalJapanese}"]`);
        if (globalRadio) globalRadio.checked = true;
      }
      
      // ベーシックコース設定
      if (data.courses?.basic?.status) {
        const basicJapanese = this._mapStatusKeyToJapanese(data.courses.basic.status);
        const basicRadio = document.querySelector(`input[name="basic-lesson"][value="${basicJapanese}"]`);
        if (basicRadio) basicRadio.checked = true;
      }
      
      if (data.courses?.basic?.message) {
        const basicMessageField = document.getElementById('basic-lesson-note');
        if (basicMessageField) basicMessageField.value = data.courses.basic.message;
      }
      
      // アドバンスコース設定
      if (data.courses?.advance?.status) {
        const advanceJapanese = this._mapStatusKeyToJapanese(data.courses.advance.status);
        const advanceRadio = document.querySelector(`input[name="advance-lesson"][value="${advanceJapanese}"]`);
        if (advanceRadio) advanceRadio.checked = true;
      }
      
      if (data.courses?.advance?.message) {
        const advanceMessageField = document.getElementById('advance-lesson-note');
        if (advanceMessageField) advanceMessageField.value = data.courses.advance.message;
      }
      
      this.debug('レッスン状況フォーム設定完了');
      
    } catch (error) {
      this.error('レッスン状況フォーム設定エラー:', error);
      this._showFeedback('データの反映中にエラーが発生しました', 'error');
    }
  }

  /**
   * ステータスキーを日本語に変換（統合メソッド）
   * @private
   * @param {string} statusKey - ステータスキー
   * @returns {string} 日本語ステータス
   */
  _mapStatusKeyToJapanese(statusKey) {
    const mapping = {
      'scheduled': '通常開催',
      'cancelled': '中止',
      'indoor': '室内開催',
      'postponed': '延期'
    };
    return mapping[statusKey] || '通常開催';
  }

  /**
   * フォームからレッスン状況データを取得（プライベートメソッド）
   * @private
   * @returns {Object} レッスン状況データ
   */
  _getLessonStatusFromForm() {
    const dateField = document.getElementById('lesson-date');
    const globalMessageField = document.getElementById('global-message');
    
    // グローバルステータス取得
    const globalStatusRadio = document.querySelector('input[name="global-status"]:checked');
    const globalStatus = globalStatusRadio ? globalStatusRadio.value : 'scheduled';
    
    // ベーシックコース
    const basicStatusRadio = document.querySelector('input[name="basic-status"]:checked');
    const basicStatus = basicStatusRadio ? basicStatusRadio.value : 'scheduled';
    
    // アドバンスコース
    const advanceStatusRadio = document.querySelector('input[name="advance-status"]:checked');
    const advanceStatus = advanceStatusRadio ? advanceStatusRadio.value : 'scheduled';
    
    return {
      date: dateField?.value || this._getTodayDateString(),
      globalStatus: globalStatus,
      globalMessage: globalMessageField?.value || '',
      courses: {
        basic: {
          name: 'ベーシックコース（年長〜小3）',
          time: '17:00-17:50',
          status: basicStatus,
          message: '' // コース別メッセージは不要
        },
        advance: {
          name: 'アドバンスコース（小4〜小6）',
          time: '18:00-18:50',
          status: advanceStatus,
          message: '' // コース別メッセージは不要
        }
      }
    };
  }

  /**
   * 日本語ステータスをキーに変換（プライベートメソッド）
   * @private
   * @param {string} japanese - 日本語ステータス
   * @returns {string} ステータスキー
   */
  _mapJapaneseToStatusKey(japanese) {
    const mapping = {
      '通常開催': 'scheduled',
      '中止': 'cancelled',
      '室内開催': 'indoor',
      '延期': 'postponed'
    };
    return mapping[japanese] || 'scheduled';
  }

  /**
   * 今日の日付文字列を取得（プライベートメソッド）
   * @private
   * @returns {string} YYYY-MM-DD形式の日付
   */
  _getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * 現在の状況表示を更新
   * @private
   */
  _updateCurrentStatusDisplay() {
    const currentStatusDisplay = document.getElementById('current-status-display');
    const currentStatusDate = document.getElementById('current-status-date');
    
    if (currentStatusDisplay) {
      currentStatusDisplay.innerHTML = `
        <div class="status-indicator">
          <i class="fas fa-check-circle status-icon"></i>
          <span class="status-text">通常開催</span>
        </div>
        <div class="status-updated">
          最終更新: <span id="last-updated">${new Date().toLocaleString('ja-JP')}</span>
        </div>
      `;
    }
    
    if (currentStatusDate) {
      currentStatusDate.textContent = new Date().toLocaleDateString('ja-JP');
    }
  }

  /**
   * デフォルトのレッスン状況を設定
   * @private
   * @param {string} date - 対象日
   */
     _setDefaultLessonStatus(date) {
     // 日付設定
     const dateField = document.getElementById('lesson-date');
     if (dateField) dateField.value = date;
     
     // グローバルステータスをデフォルト（通常開催）に設定
     const globalRadio = document.querySelector('input[name="global-status"][value="scheduled"]');
     if (globalRadio) globalRadio.checked = true;
     
     // ベーシックコースをデフォルトに設定
     const basicRadio = document.querySelector('input[name="basic-status"][value="scheduled"]');
     if (basicRadio) basicRadio.checked = true;
     
     // アドバンスコースをデフォルトに設定
     const advanceRadio = document.querySelector('input[name="advance-status"][value="scheduled"]');
     if (advanceRadio) advanceRadio.checked = true;
     
     // グローバルメッセージフィールドをクリア
     const globalMessageField = document.getElementById('global-message');
     if (globalMessageField) globalMessageField.value = '';
   }

   /**
    * レッスン状況タブの初期化
    * @private
    */
   async initializeLessonStatusTab() {
     try {
       // 今日の日付を設定
       const today = this._getTodayDateString();
       const dateField = document.getElementById('lesson-date');
       if (dateField && !dateField.value) {
         dateField.value = today;
       }
       
       // 現在の状況表示を更新
       this._updateCurrentStatusDisplay();
       
       // レッスン状況を読み込み
       await this.loadLessonStatus();
       
       this.debug('レッスン状況タブの初期化完了');
       
     } catch (error) {
       this.error('レッスン状況タブ初期化エラー:', error);
       this._showFeedback('レッスン状況タブの初期化に失敗しました', 'error');
     }
   }

  /**
   * レッスン状況のプレビュー
   */
  previewLessonStatus() {
    try {
      const statusData = this._getLessonStatusFromForm();
      
      if (!this._validateLessonStatusData(statusData)) {
        this._showFeedback('入力内容を確認してください', 'error');
        return;
      }

      // プレビューコンテナを表示
      const previewContainer = document.getElementById('preview-container');
      const previewContent = document.getElementById('preview-content');
      
      if (previewContainer && previewContent) {
        previewContent.innerHTML = this._generateLessonStatusPreview(statusData);
        previewContainer.classList.remove('preview-hidden');
        previewContainer.classList.add('preview-visible');
        
        // プレビューエリアまでスクロール
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        this._showFeedback('プレビューを表示しました', 'info');
      }
    } catch (error) {
      this.error('レッスン状況プレビューエラー:', error);
      this._showFeedback('プレビューの表示に失敗しました', 'error');
    }
  }

  /**
   * レッスン状況の下書き保存
   */
  saveDraftLessonStatus() {
    try {
      const statusData = this._getLessonStatusFromForm();
      const dateKey = statusData.date || this._getTodayDateString();
      
      // 下書きとして保存
      const draftKey = `rbs_lesson_draft_${dateKey}`;
      localStorage.setItem(draftKey, JSON.stringify(statusData));
      
      this._showFeedback('下書きを保存しました', 'success');
      this.debug('レッスン状況下書き保存完了:', dateKey);
    } catch (error) {
      this.error('レッスン状況下書き保存エラー:', error);
      this._showFeedback('下書きの保存に失敗しました', 'error');
    }
  }

  /**
   * レッスン状況更新
   */
  async updateLessonStatus() {
    try {
      // フォームデータの取得とバリデーション
      const statusData = this._getLessonStatusFromForm();
      
      if (!this._validateLessonStatusData(statusData)) {
        return; // バリデーションエラーのメッセージは#validateLessonStatusData内で表示
      }
      
      console.log('📝 レッスン状況更新:', statusData);
      
      // 保存前の確認
      const confirmMessage = `${statusData.date} のレッスン状況を更新しますか？\n\n` +
        `全体ステータス: ${this._mapStatusKeyToJapanese(statusData.globalStatus)}\n` +
        `ベーシックコース: ${this._mapStatusKeyToJapanese(statusData.courses.basic.status)}\n` +
        `アドバンスコース: ${this._mapStatusKeyToJapanese(statusData.courses.advance.status)}`;
      
      if (!confirm(confirmMessage)) {
        this._showFeedback('更新をキャンセルしました', 'info');
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
        this._showFeedback(result.error || '更新に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('ERROR レッスン状況更新エラー:', error);
      this._showFeedback('レッスン状況の更新中にエラーが発生しました', 'error');
    }
  }

  /**
   * レッスン状況データのバリデーション
   * @private
   * @param {Object} statusData - レッスン状況データ
   * @returns {boolean} バリデーション成功時true
   */
  _validateLessonStatusData(statusData) {
    // 日付チェック
    if (!statusData.date) {
      this._showFeedback('対象日を選択してください', 'error');
      return false;
    }
    
    // 日付形式チェック
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(statusData.date)) {
      this._showFeedback('正しい日付形式で入力してください (YYYY-MM-DD)', 'error');
      return false;
    }
    
    // グローバルメッセージ長チェック
    if (statusData.globalMessage && statusData.globalMessage.length > 500) {
      this._showFeedback('全体メッセージは500文字以内で入力してください', 'error');
      return false;
    }
    
    // ステータス値チェック
    const validStatuses = ['scheduled', 'cancelled', 'indoor', 'postponed'];
    if (!validStatuses.includes(statusData.globalStatus)) {
      this._showFeedback('無効な全体ステータスが選択されています', 'error');
      return false;
    }
    
    // コースステータスチェック
    for (const [courseKey, courseData] of Object.entries(statusData.courses)) {
      if (!validStatuses.includes(courseData.status)) {
        this._showFeedback(`無効な${courseKey}コースステータスが選択されています`, 'error');
        return false;
      }
      
      // コースメッセージ長チェックを追加
      if (courseData.message && courseData.message.length > 500) {
        this._showFeedback(`${courseKey}コースのメッセージは500文字以内で入力してください`, 'error');
        return false;
      }
    }
    
    return true;
  }

  /**
   * レッスン状況プレビューHTMLを生成
   * @private
   */
  _generateLessonStatusPreview(statusData) {
    const globalStatusDef = this.lessonStatusService.getStatusDefinition(statusData.globalStatus);
    const basicStatusDef = this.lessonStatusService.getStatusDefinition(statusData.courses.basic.status);
    const advanceStatusDef = this.lessonStatusService.getStatusDefinition(statusData.courses.advance.status);
    
    let html = `
      <div class="lesson-status-preview">
        <h3><i class="fas fa-calendar-check"></i> ${statusData.date} のレッスン状況</h3>
        
        <div class="global-status">
          <h4>全体開催ステータス</h4>
          <div class="status-badge ${statusData.globalStatus}">
            <i class="${globalStatusDef.icon}"></i>
            ${globalStatusDef.displayText}
          </div>
          ${statusData.globalMessage ? `<p class="global-message">${this.escapeHtml(statusData.globalMessage)}</p>` : ''}
        </div>
        
        <div class="course-statuses">
          <h4>コース別状況</h4>
          <div class="course-status">
            <h5>ベーシックコース (17:00-17:50)</h5>
            <div class="status-badge ${statusData.courses.basic.status}">
              <i class="${basicStatusDef.icon}"></i>
              ${basicStatusDef.displayText}
            </div>
          </div>
          <div class="course-status">
            <h5>アドバンスコース (18:00-18:50)</h5>
            <div class="status-badge ${statusData.courses.advance.status}">
              <i class="${advanceStatusDef.icon}"></i>
              ${advanceStatusDef.displayText}
            </div>
          </div>
        </div>
      </div>
    `;
    
    return html;
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
    console.log('🗑️ 全データクリア開始');
    
    const confirmed = confirm(
      '全てのデータ（記事、レッスン状況、Instagram投稿、設定など）を削除します。\n\nこの操作は元に戻せません。実行しますか？'
    );
    
    if (!confirmed) {
      console.log('ERROR ユーザーによってキャンセルされました');
      return;
    }
    
    try {
      // 統合ストレージサービスのクリア
      if (this.articleDataService?.storageService) {
        await this.articleDataService.storageService.clearAllData();
        console.log('SUCCESS 記事データクリア完了');
      }
      
      // レッスン状況データのクリア
      if (this.lessonStatusService) {
        this.lessonStatusService.clearAllData();
        console.log('SUCCESS レッスン状況データクリア完了');
      }
      
      // Instagram関連データのクリア
      const instagramKeys = [
        CONFIG.storage.keys.instagram,
        CONFIG.storage.keys.instagramPosts,
        CONFIG.storage.keys.instagramSettings
      ];
      
      instagramKeys.forEach(key => {
        const had = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
        if (had) {
          console.log(`SUCCESS Instagram データクリア: ${key}`);
        }
      });
      
      // 管理画面設定のクリア
      Object.values(this.storageKeys).forEach(key => {
        const had = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
        if (had) {
          console.log(`SUCCESS 管理画面設定クリア: ${key}`);
        }
      });
      
      // 認証データのクリア
      const authKeys = [
        CONFIG.storage.keys.auth,
        CONFIG.storage.keys.session
      ];
      
      authKeys.forEach(key => {
        const had = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
        if (had) {
          console.log(`SUCCESS 認証データクリア: ${key}`);
        }
      });
      
      console.log('SUCCESS 全データクリア完了');
      this.success('全てのデータを削除しました');
      
      // データ更新を全体に通知
      this.refreshRecentArticles();
      this.updateDashboardStats();
      
      // ダッシュボードタブに切り替え
      await this.switchAdminTab('dashboard');
      
    } catch (error) {
      console.error('ERROR 全データクリアエラー:', error);
      this.error(`データ削除中にエラーが発生しました: ${error.message}`);
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
        resultContainer.innerHTML = this._generateConnectionTestResults(testResults);
      }
      
      const successCount = Object.values(testResults).filter(Boolean).length;
      this._showFeedback(`接続テスト完了: ${successCount}/3 ページが正常`);
      
    } catch (error) {
      console.error('ERROR サイト接続テストエラー:', error);
      this._showFeedback('接続テストに失敗しました', 'error');
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
      
      this._showFeedback(`LocalStorageをリセットしました (${keysToRemove.length}件削除)`);
      
    } catch (error) {
      console.error('ERROR LocalStorageリセットエラー:', error);
      this._showFeedback('LocalStorageのリセットに失敗しました', 'error');
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
   * AuthManagerからのコールバックとして実行される
   * @private
   */
  handleAuthLogout() {
    try {
      this.info('認証サービスからログアウトされました');
      
      // セッション監視を停止（既にAuthManagerで停止されているが念のため）
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
  updateSessionInfoDisplay(sessionInfo = null) {
    try {
      const sessionInfoElement = document.getElementById('session-remaining');
      if (!sessionInfoElement) return;

      // AuthManagerから直接セッション情報を取得
      const currentSessionInfo = this.authManager ? this.authManager.getSessionInfo() : null;
      
      if (currentSessionInfo && currentSessionInfo.isValid) {
        const remainingMinutes = currentSessionInfo.remainingMinutes;
        const remainingTime = this.formatRemainingTime(remainingMinutes);
        
        sessionInfoElement.textContent = remainingTime;
        
        // 残り時間に応じてスタイルを変更
        const sessionInfoContainer = document.getElementById('session-info');
        if (sessionInfoContainer) {
          // 30分未満の場合は警告表示
          if (remainingMinutes < 30) {
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
   * 残り時間をフォーマットする
   * @private
   * @param {number} minutes - 残り分数
   * @returns {string} フォーマット済み時間
   */
  formatRemainingTime(minutes) {
    if (minutes <= 0) return '期限切れ';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}時間${mins}分`;
    } else {
      return `${mins}分`;
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
   * @deprecated AuthManagerのコールバック機能を使用してください
   */
  updateSessionInfo() {
    this.warn('updateSessionInfo() は非推奨です。AuthManagerのコールバック機能を使用してください。');
    // AuthManagerのコールバック機能によって自動的に更新されるため、何もしない
  }

  /**
   * セッション監視を開始 - DEPRECATED
   * 
   * @deprecated AuthManagerのセッション監視を使用してください
   */
  startSessionMonitoring() {
    this.warn('startSessionMonitoring() は非推奨です。AuthManagerで自動的に開始されます。');
    // AuthManagerで自動的に開始されるため、何もしない
  }

  /**
   * セッション情報の定期更新を開始
   * @private
   */
  startSessionInfoUpdates() {
    // 既存の更新を停止
    this.stopSessionMonitoring();
    
    // 1分ごとにセッション情報を更新
    this.sessionUpdateInterval = setInterval(() => {
      if (this.authManager && this.authManager.isAuthenticated()) {
        this.updateSessionInfoDisplay();
      } else {
        // 認証されていない場合はログアウト処理
        this.handleAuthLogout();
      }
    }, 60000); // 1分
    
    // 初回実行
    this.updateSessionInfoDisplay();
    
    this.log('セッション情報の定期更新を開始しました（1分間隔）');
  }

  /**
   * セッション監視を停止
   */
  stopSessionMonitoring() {
    if (this.sessionUpdateInterval) {
      clearInterval(this.sessionUpdateInterval);
      this.sessionUpdateInterval = null;
      this.log('セッション情報の定期更新を停止しました');
    }
  }



  // === モーダル管理メソッド ===

  /**
   * モーダルを表示
   * @private
   */
  _showModal(title, content) {
    try {
      const modal = document.getElementById('modal');
      const modalTitle = document.getElementById('modal-title');
      const modalBody = document.getElementById('modal-body');
      
      if (modal && modalTitle && modalBody) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        
        modal.classList.remove('modal-hidden');
        modal.classList.add('show');
        
        // bodyのスクロールを無効化
        document.body.style.overflow = 'hidden';
        
        this.debug('モーダル表示完了:', title);
      } else {
        this.error('モーダル要素が見つかりません');
        this._showFeedback('モーダルの表示に失敗しました', 'error');
      }
    } catch (error) {
      this.error('モーダル表示エラー:', error);
      this._showFeedback('モーダルの表示に失敗しました', 'error');
    }
  }

  /**
   * モーダルを閉じる
   */
  closeModal() {
    try {
      // 標準のモーダルを閉じる
      const modal = document.getElementById('modal');
      if (modal) {
        modal.classList.remove('modal-visible');
        modal.classList.add('modal-hidden');
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
      
      this.debug('モーダルを閉じてスクロールを復旧しました');
      
    } catch (error) {
      this.error('モーダル閉じる処理エラー:', error);
      
      // エラー時でもスクロールを復旧
      document.body.classList.remove('modal-open');
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


  /**
   * フォームから記事データを取得
   * @private
   * @returns {Object}
   */
  _getArticleDataFromForm() {
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
  _validateArticleData(articleData) {
    if (!articleData.title) {
      this._showFeedback('タイトルを入力してください', 'error');
      return false;
    }
    
    if (!articleData.content) {
      this._showFeedback('本文を入力してください', 'error');
      return false;
    }
    
    return true;
  }

  // 削除済み: 古い_generateArticleListHTML - _generateUnifiedArticleListHTMLに統合

  /**
   * ニュース一覧のレンダリング
   * @private
   * @param {string} filter - フィルター
   */
  _renderNewsList(filter = 'all') {
    try {
      if (!this.articleDataService?.initialized) {
        console.warn('ArticleDataServiceが初期化されていません');
        return;
      }

      const articles = this.articleDataService.loadArticles();
      const filteredArticles = this._filterArticles(articles, filter);
      
      const listContainer = document.getElementById('news-list');
      if (listContainer) {
        // 統合されたメソッドを使用（管理画面スタイル）
        const html = this._generateUnifiedArticleListHTML(filteredArticles, {
          mode: 'management',
          showActions: true,
          showMeta: true,
          filter: filter,
          emptyMessage: '記事がありません',
          emptyAction: {
            action: 'new-news-article',
            icon: 'fa-plus',
            text: '新規記事を作成'
          }
        });
        
        listContainer.innerHTML = html;
        
        console.log(`📋 記事一覧を表示: ${filteredArticles.length}件 (フィルター: ${filter})`);
      } else {
        console.warn('news-list要素が見つかりません');
      }
      
    } catch (error) {
      console.error('ERROR ニュース一覧レンダリングエラー:', error);
      
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
   * 統合された記事一覧HTMLの生成
   * ダッシュボードの最近の記事と記事管理で共通利用
   * @private
   * @param {Array} articles - 記事配列
   * @param {Object} options - 表示オプション
   * @returns {string}
   */
  _generateUnifiedArticleListHTML(articles, options = {}) {
    const {
      mode = 'recent', // 'recent' | 'management'
      showActions = true,
      showMeta = true,
      filter = 'all',
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

    // 記事管理モードでは全記事表示、ダッシュボードでは最大5件
    const displayArticles = mode === 'management' ? articles : articles.slice(0, 5);

    return displayArticles.map((article, index) => {
      const title = this.escapeHtml(article.title || '無題の記事');
      const summary = article.summary ? 
        this.escapeHtml(article.summary.length > 60 ? article.summary.substring(0, 60) + '...' : article.summary) : 
        '概要なし';
      const createdDate = new Date(article.createdAt || Date.now());
      const formattedDate = createdDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const statusText = article.status === 'published' ? '公開中' : '下書き';
      const categoryName = this._getCategoryName(article.category || 'announcement');
      
      // 記事管理モードの場合は追加クラスを適用
      const itemClass = mode === 'management' ? 'recent-article-item list-mode' : 'recent-article-item';
      
      return `
        <div class="${itemClass}" data-id="${article.id}">
          <div class="recent-article-content">
            <div class="recent-article-header">
              <div class="recent-article-main">
                <h3 class="recent-article-title">${title}</h3>
                <div class="recent-article-summary">${summary}</div>
              </div>
              ${showActions ? `
                <div class="recent-article-actions">
                  <button class="action-btn-modern edit-btn" 
                          data-action="edit-article" 
                          data-article-id="${article.id}" 
                          title="記事を編集"
                          aria-label="記事「${title}」を編集">
                    <i class="fas fa-edit"></i>
                    <span class="action-text">編集</span>
                  </button>
                  <button class="action-btn-modern preview-btn" 
                          data-action="preview-article" 
                          data-article-id="${article.id}" 
                          title="記事をプレビュー"
                          aria-label="記事「${title}」をプレビュー">
                    <i class="fas fa-eye"></i>
                    <span class="action-text">プレビュー</span>
                  </button>
                  ${mode === 'management' ? `
                    <button class="action-btn-modern delete-btn" 
                            data-action="delete-article" 
                            data-article-id="${article.id}" 
                            title="記事を削除"
                            aria-label="記事「${title}」を削除">
                      <i class="fas fa-trash"></i>
                      <span class="action-text">削除</span>
                    </button>
                  ` : ''}
                </div>
              ` : ''}
            </div>
            ${showMeta ? `
              <div class="recent-article-meta">
                <span class="category-badge ${article.category || 'announcement'}">${categoryName}</span>
                <span class="status-badge ${article.status || 'draft'}">${statusText}</span>
                <span class="date-info">${formattedDate}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
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
        const html = this._generateArticleListHTML(recentArticles, {
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
        this._initializeDropdownMenus(recentContainer);
      }
      
      this.debug(`最近の記事を${recentArticles.length}件表示（最初の3件がメイン表示）`);
      
    } catch (error) {
      console.error('ERROR 最近の記事レンダリングエラー:', error);
      throw error;
    }
  }

  /**
   * ドロップダウンメニューの初期化
   * @private
   */
  _initializeDropdownMenus(container) {
    const dropdowns = container.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
      const toggle = dropdown.querySelector('.dropdown-toggle');
      const menu = dropdown.querySelector('.dropdown-menu');
      
      if (!toggle || !menu) return;
      
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // 他のドロップダウンを閉じる
        dropdowns.forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            otherDropdown.classList.remove('active');
          }
        });
        
        // このドロップダウンをトグル
        dropdown.classList.toggle('active');
      });
    });
    
    // 外部クリックで全てのドロップダウンを閉じる
    document.addEventListener('click', () => {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    });
  }

  /**
   * 記事フィルタリング
   * @private
   * @param {Array} articles - 記事配列
   * @param {string} filter - フィルター
   * @returns {Array}
   */
  _filterArticles(articles, filter) {
    switch (filter) {
      case 'published':
        return articles.filter(article => article.status === 'published');
      case 'draft':
        return articles.filter(article => article.status === 'draft');
      default:
        return articles;
    }
  }

  // 削除済み: _generateNewsListHTML - _generateUnifiedArticleListHTMLに統合

  // 削除済み: _generateRecentArticlesHTML - _generateUnifiedArticleListHTMLに統合

  /**
   * カテゴリー名の取得
   * @private
   * @param {string} category - カテゴリーキー
   * @returns {string}
   */
  _getCategoryName(category) {
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
      
      // 記事IDの検証
      if (!articleId) {
        this._showFeedback('記事IDが指定されていません', 'error');
        return;
      }
      
      // ArticleDataServiceの初期化確認
      if (!this.articleDataService || !this.articleDataService.initialized) {
        console.error('ERROR ArticleDataServiceが初期化されていません');
        this._showFeedback('記事サービスが初期化されていません。ページを再読み込みしてください。', 'error');
        return;
      }
      
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        this._showFeedback('記事が見つかりません', 'error');
        console.error('ERROR 記事が見つかりません:', articleId);
        
        // デバッグ情報を出力
        const allArticles = this.articleDataService.loadArticles();
        console.log('📊 利用可能な記事:', allArticles.map(a => ({
          id: a.id,
          title: a.title,
          status: a.status
        })));
        return;
      }
      
      console.log('📄 編集対象記事:', article.title);
      
      // 記事管理タブに切り替え
      console.log('🔄 記事管理タブに切り替え中...');
      this.switchAdminTab('news-management').then(() => {
        console.log('SUCCESS タブ切り替え完了、エディタータブに切り替え中...');
        
        // エディタータブに切り替え（タブ切り替え完了後に実行）
        setTimeout(() => {
          this.switchNewsTab('editor');
          
          // フォームにデータを読み込み（DOM要素が確実に存在するよう少し遅延）
          setTimeout(() => {
            this._loadArticleToEditor(article, articleId);
          }, 150);
        }, 100);
        
      }).catch(error => {
        console.error('ERROR タブ切り替えエラー:', error);
        this._showFeedback('記事管理タブへの切り替えに失敗しました', 'error');
      });
      
    } catch (error) {
      console.error('ERROR 記事編集エラー:', error);
      this._showFeedback('記事の編集に失敗しました: ' + error.message, 'error');
    }
  }

  /**
   * 記事データをエディターに読み込み（NewsFormManagerとの統合版）
   * @private
   * @param {Object} article - 記事データ
   * @param {string} articleId - 記事ID
   */
  _loadArticleToEditor(article, articleId) {
    try {
      console.log('📝 記事データをエディターに読み込み中:', article.title);
      
      // 記事本文を取得
      const content = this.articleDataService?.getArticleContent?.(articleId) || article.content || '';
      
      // NewsFormManagerが利用可能な場合はそちらを使用
      if (this.newsFormManager && this.newsFormManager.initialized) {
        // データをNewsFormManagerの形式に合わせる
        const formattedArticle = {
          id: articleId,
          title: article.title || '',
          category: article.category || 'announcement',
          date: this._formatDateForInput(article.date || article.createdAt),
          status: article.status || 'draft',
          excerpt: article.summary || article.excerpt || '',
          content: content,
          featured: article.featured || false
        };
        
        this.newsFormManager.populateForm(formattedArticle);
        console.log('📝 NewsFormManagerで記事を読み込み');
      } else {
        // フォールバック: 直接フォームに値を設定
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
          console.warn('WARN 一部のフォーム要素が見つかりません:', missingElements);
          
          // 重要な要素（title, content）が見つからない場合はエラー
          if (missingElements.includes('title') || missingElements.includes('content')) {
            throw new Error(`必須フォーム要素が見つかりません: ${missingElements.join(', ')}`);
          }
        }
        
        // フォームに記事データを設定
        if (elements.id) elements.id.value = articleId;
        if (elements.title) elements.title.value = article.title || '';
        if (elements.category) elements.category.value = article.category || 'announcement';
        if (elements.date) {
          elements.date.value = this._formatDateForInput(article.date || article.createdAt);
        }
        if (elements.status) elements.status.value = article.status || 'draft';
        if (elements.summary) elements.summary.value = article.summary || article.excerpt || '';
        if (elements.content) elements.content.value = content;
        if (elements.featured) elements.featured.checked = article.featured || false;
        
        // エディタータイトルを更新
        const editorTitle = document.getElementById('editor-title');
        if (editorTitle) {
          editorTitle.textContent = `記事編集: ${article.title}`;
        }
        
        // タイトルフィールドにフォーカス
        if (elements.title) {
          elements.title.focus();
          elements.title.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        console.log('📝 直接フォームに記事を読み込み');
      }
      
      console.log('📄 記事本文を読み込み:', content ? `${content.length}文字` : '本文なし');
      
      this._showFeedback(`記事「${article.title}」をエディターに読み込みました`);
      console.log('SUCCESS 記事データの読み込み完了');
      
    } catch (error) {
      console.error('ERROR 記事データ読み込みエラー:', error);
      this._showFeedback('記事データの読み込みに失敗しました', 'error');
    }
  }

  /**
   * 日付をフォーム入力用にフォーマット
   * @private
   * @param {string} dateValue - 日付文字列
   * @returns {string} YYYY-MM-DD形式の日付
   */
  _formatDateForInput(dateValue) {
    if (!dateValue) return '';
    
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('日付フォーマットエラー:', error);
    }
    
    return '';
  }

  /**
   * 記事IDによるプレビュー
   * @param {string} articleId - 記事ID
   */
  previewArticleById(articleId) {
    try {
      console.log('👁️ 記事プレビュー開始:', articleId);
      
      // 記事IDの検証
      if (!articleId) {
        this._showFeedback('記事IDが指定されていません', 'error');
        return;
      }
      
      // ArticleDataServiceの初期化確認
      if (!this.articleDataService || !this.articleDataService.initialized) {
        console.error('ERROR ArticleDataServiceが初期化されていません');
        this._showFeedback('記事サービスが初期化されていません。ページを再読み込みしてください。', 'error');
        return;
      }
      
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        this._showFeedback('記事が見つかりません', 'error');
        console.error('ERROR 記事が見つかりません:', articleId);
        return;
      }
      
      console.log('📄 プレビュー対象記事:', article.title);
      
      // 記事内容を取得
      const content = this.articleDataService.getArticleContent(articleId);
      const articleData = {
        ...article,
        content: content || ''
      };
      
      // プレビューモーダルを表示
      this._showNewsPreviewModal(articleData);
      
    } catch (error) {
      console.error('ERROR 記事プレビューエラー:', error);
      this._showFeedback('記事のプレビューに失敗しました: ' + error.message, 'error');
    }
  }

  /**
   * 記事複製
   * @param {string} articleId - 記事ID
   */
  async duplicateArticle(articleId) {
    try {
      console.log('📋 記事複製開始:', articleId);
      
      // 記事IDの検証
      if (!articleId) {
        this._showFeedback('記事IDが指定されていません', 'error');
        return;
      }
      
      // ArticleDataServiceの初期化確認
      if (!this.articleDataService || !this.articleDataService.initialized) {
        console.error('ERROR ArticleDataServiceが初期化されていません');
        this._showFeedback('記事サービスが初期化されていません。ページを再読み込みしてください。', 'error');
        return;
      }
      
      const originalArticle = this.articleDataService.getArticleById(articleId);
      if (!originalArticle) {
        this._showFeedback('元の記事が見つかりません', 'error');
        console.error('ERROR 記事が見つかりません:', articleId);
        return;
      }
      
      console.log('📄 複製対象記事:', originalArticle.title);
      
      // 記事内容を取得
      const content = this.articleDataService.getArticleContent(articleId);
      
      // 複製記事データを作成
      const duplicateData = {
        title: `${originalArticle.title} (コピー)`,
        category: originalArticle.category,
        summary: originalArticle.summary,
        content: content || '',
        featured: false, // 複製時は注目記事をOFFにする
        status: 'draft' // 複製時は必ず下書きにする
      };
      
      // 記事を保存
      const result = await this.articleDataService.saveArticle(duplicateData, false);
      
      if (result.success) {
        // 記事一覧とダッシュボードを更新
        this.refreshRecentArticles();
        this.refreshNewsList();
        this.updateDashboardStats();
        
        this._showFeedback(`記事「${originalArticle.title}」を複製しました`);
        console.log('SUCCESS 記事複製完了:', result.id);
      } else {
        this._showFeedback(result.message || '複製に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('ERROR 記事複製エラー:', error);
      this._showFeedback('記事の複製中にエラーが発生しました: ' + error.message, 'error');
    }
  }

  /**
   * ダッシュボード統計の更新
   */
  updateDashboardStats() {
    try {
      if (!this.articleDataService || !this.articleDataService.initialized) {
        console.warn('ArticleDataServiceが初期化されていません');
        return;
      }
      
      const stats = this.articleDataService.getStats();
      
      // 統計要素を更新
      const publishedElement = document.getElementById('stat-published');
      const draftsElement = document.getElementById('stat-drafts');
      const currentMonthElement = document.getElementById('stat-current-month');
      
      if (publishedElement) publishedElement.textContent = stats.published || 0;
      if (draftsElement) draftsElement.textContent = stats.drafts || 0;
      if (currentMonthElement) currentMonthElement.textContent = stats.currentMonth || 0;
      
      console.log('📊 ダッシュボード統計更新:', stats);
      
    } catch (error) {
      console.error('ERROR ダッシュボード統計更新エラー:', error);
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
        
        this._showFeedback('記事を削除しました');
      } else {
        this._showFeedback(result.message || '削除に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('ERROR 記事削除エラー:', error);
      this._showFeedback('記事の削除中にエラーが発生しました', 'error');
    }
  }

  /**
   * プレビューモーダルの表示（news-detail.html完全再現版）
   * @private
   * @param {Object} articleData - 記事データ
   */
  _showNewsPreviewModal(articleData) {
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
      new Date(articleData.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : 
      new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // 記事のコンテンツをマークダウンからHTMLに変換
    const htmlContent = this._formatMarkdown(articleData.content);
    
    // 美しい記事プレビューモーダルHTMLを作成
    const modalHTML = `
      <div id="news-preview-modal" class="modal news-detail-preview-modal">
        <div class="modal-backdrop" onclick="this.closest('.modal').remove()"></div>
        <div class="modal-content news-detail-preview-content">
          <!-- 洗練されたモーダルヘッダー -->
          <div class="modal-header news-detail-modal-header">
            <div class="modal-title-section">
              <div class="title-icon">
                <i class="fas fa-eye"></i>
              </div>
              <div class="title-content">
                <h2>記事プレビュー</h2>
                <p class="preview-note">実際の記事ページと同じレイアウトです</p>
              </div>
            </div>
            <div class="modal-controls">
              <button class="modal-action-btn view-toggle" title="表示モード切替" data-view="desktop">
                <i class="fas fa-desktop"></i>
                <span class="btn-label">デスクトップ</span>
              </button>
              <button class="modal-action-btn fullscreen-toggle" title="フルスクリーン表示">
                <i class="fas fa-expand"></i>
              </button>
              <button class="modal-close" onclick="this.closest('.modal').remove()" title="閉じる">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <!-- プレビューコンテンツ -->
          <div class="modal-body news-detail-preview-body">
            <div class="preview-viewport" id="preview-viewport">
              <div class="preview-container">
                <!-- パンくずナビ -->
                <nav class="breadcrumb-nav">
                  <div class="breadcrumb-items">
                    <a href="#" class="breadcrumb-item">ホーム</a>
                    <span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
                    <a href="#" class="breadcrumb-item">ニュース</a>
                    <span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
                    <span class="breadcrumb-current">記事詳細</span>
                  </div>
                </nav>

                <!-- 記事ヘッダー -->
                <header class="article-header">
                  <div class="article-meta">
                    <div class="meta-left">
                      <span class="article-date">
                        <i class="fas fa-calendar-alt"></i>
                        ${formattedDate}
                      </span>
                      <span class="article-category ${articleData.category}">
                        <i class="fas fa-tag"></i>
                        ${categoryName}
                      </span>
                    </div>
                    <div class="meta-right">
                      <span class="reading-time">
                        <i class="fas fa-clock"></i>
                        約${Math.max(1, Math.ceil(articleData.content.length / 400))}分で読めます
                      </span>
                    </div>
                  </div>
                  
                  <h1 class="article-title">${this.escapeHtml(articleData.title)}</h1>
                  
                  ${articleData.summary ? `
                    <div class="article-summary">
                      <div class="summary-content">
                        ${this.escapeHtml(articleData.summary)}
                      </div>
                    </div>
                  ` : ''}
                  
                  <div class="article-actions">
                    <button class="action-btn share-btn" disabled>
                      <i class="fas fa-share"></i>
                      シェア
                    </button>
                    <button class="action-btn bookmark-btn" disabled>
                      <i class="fas fa-bookmark"></i>
                      ブックマーク
                    </button>
                    <button class="action-btn print-btn" onclick="window.print()">
                      <i class="fas fa-print"></i>
                      印刷
                    </button>
                  </div>
                </header>

                <!-- 記事本文 -->
                <article class="article-content">
                  ${htmlContent}
                </article>

                <!-- ソーシャルシェア -->
                <section class="share-section">
                  <h3 class="section-title">
                    <i class="fas fa-share-alt"></i>
                    この記事をシェア
                  </h3>
                  <div class="share-buttons">
                    <button class="share-btn twitter" disabled>
                      <i class="fab fa-twitter"></i>
                      <span>X (Twitter)</span>
                    </button>
                    <button class="share-btn facebook" disabled>
                      <i class="fab fa-facebook-f"></i>
                      <span>Facebook</span>
                    </button>
                    <button class="share-btn line" disabled>
                      <i class="fab fa-line"></i>
                      <span>LINE</span>
                    </button>
                    <button class="share-btn linkedin" disabled>
                      <i class="fab fa-linkedin-in"></i>
                      <span>LinkedIn</span>
                    </button>
                  </div>
                  <p class="preview-note">※ プレビューではシェア機能は無効です</p>
                </section>

                <!-- 関連記事 -->
                <section class="related-articles">
                  <h3 class="section-title">
                    <i class="fas fa-newspaper"></i>
                    関連記事
                  </h3>
                  <div class="related-grid">
                    <div class="related-card">
                      <div class="card-image">
                        <div class="placeholder-image">
                          <i class="fas fa-image"></i>
                        </div>
                      </div>
                      <div class="card-content">
                        <div class="card-meta">
                          <span class="date">2024.03.20</span>
                          <span class="category event">体験会</span>
                        </div>
                        <h4 class="card-title">春の体験会のお知らせ（サンプル記事）</h4>
                        <p class="card-excerpt">関連記事のサンプル表示です。実際のページでは最新の関連記事が自動で表示されます。</p>
                      </div>
                    </div>
                    <div class="related-card">
                      <div class="card-image">
                        <div class="placeholder-image">
                          <i class="fas fa-image"></i>
                        </div>
                      </div>
                      <div class="card-content">
                        <div class="card-meta">
                          <span class="date">2024.03.15</span>
                          <span class="category announcement">お知らせ</span>
                        </div>
                        <h4 class="card-title">レッスンスケジュール更新のお知らせ（サンプル記事）</h4>
                        <p class="card-excerpt">関連記事のサンプル表示です。実際のページでは類似のカテゴリや内容の記事が表示されます。</p>
                      </div>
                    </div>
                    <div class="related-card">
                      <div class="card-image">
                        <div class="placeholder-image">
                          <i class="fas fa-image"></i>
                        </div>
                      </div>
                      <div class="card-content">
                        <div class="card-meta">
                          <span class="date">2024.03.10</span>
                          <span class="category media">メディア</span>
                        </div>
                        <h4 class="card-title">メディア掲載情報（サンプル記事）</h4>
                        <p class="card-excerpt">関連記事のサンプル表示です。プレビューでは固定のサンプル記事が表示されています。</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // モーダルをDOMに追加
    document.body.appendChild(document.createRange().createContextualFragment(modalHTML));
    
    try {
      this._addPreviewStyles();
    } catch (error) {
      this.error('記事プレビューモーダル表示エラー:', error);
      this._showFeedback('プレビューの表示に失敗しました', 'error');
    }
  }

  /**
   * プレビュー用のCSSスタイルを追加
   * @private
   */
  _addPreviewStyles() {
    const styleId = 'article-preview-styles';
    if (document.getElementById(styleId)) return;

    const styles = `
      .news-detail-preview-modal {
        z-index: 10000;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
      }
      
      .news-detail-preview-content {
        max-width: 90vw;
        max-height: 90vh;
        width: 1200px;
        height: 800px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .news-detail-modal-header {
        background: #2c3e50;
        color: white;
        padding: 1rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #34495e;
      }
      
      .modal-title-section {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      
      .title-icon {
        color: #3498db;
        font-size: 1.5rem;
      }
      
      .title-content h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      
      .preview-note {
        margin: 0;
        font-size: 0.875rem;
        opacity: 0.8;
      }
      
      .modal-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      
      .modal-action-btn, .modal-close {
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        transition: background-color 0.2s;
      }
      
      .modal-action-btn:hover, .modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .news-detail-preview-body {
        flex: 1;
        overflow-y: auto;
        background: #f8f9fa;
      }
      
      .preview-viewport {
        height: 100%;
        overflow-y: auto;
      }
      
      .preview-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        background: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
      }
      
      .breadcrumb-nav {
        margin-bottom: 2rem;
        font-size: 0.875rem;
      }
      
      .breadcrumb-items {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #666;
      }
      
      .breadcrumb-item {
        color: #007bff;
        text-decoration: none;
      }
      
      .breadcrumb-separator {
        color: #999;
        font-size: 0.75rem;
      }
      
      .breadcrumb-current {
        color: #333;
        font-weight: 500;
      }
      
      .article-header {
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 2px solid #e9ecef;
      }
      
      .article-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        color: #666;
        flex-wrap: wrap;
        gap: 1rem;
      }
      
      .meta-left, .meta-right {
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      
      .article-date, .article-category, .reading-time {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .article-category {
        background: #007bff;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.8rem;
      }
      
      .article-category.announcement { background: #6c757d; }
      .article-category.event { background: #28a745; }
      .article-category.media { background: #6f42c1; }
      .article-category.important { background: #dc3545; }
      
      .article-title {
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 1rem 0;
        color: #2c3e50;
        line-height: 1.3;
      }
      
      .article-summary {
        background: #f8f9fa;
        padding: 1rem 1.5rem;
        border-left: 4px solid #007bff;
        margin: 1rem 0;
        border-radius: 0 4px 4px 0;
      }
      
      .summary-content {
        font-size: 1.1rem;
        color: #555;
        font-style: italic;
      }
      
      .article-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }
      
      .action-btn {
        background: none;
        border: 1px solid #dee2e6;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #495057;
        transition: all 0.2s;
      }
      
      .action-btn:not(:disabled):hover {
        background: #f8f9fa;
        border-color: #adb5bd;
      }
      
      .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .article-content {
        font-size: 1.1rem;
        line-height: 1.8;
        margin: 2rem 0;
      }
      
      .article-content h1, 
      .article-content h2, 
      .article-content h3,
      .article-content h4,
      .article-content h5,
      .article-content h6 {
        margin: 2rem 0 1rem;
        color: #2c3e50;
        font-weight: 600;
      }
      
      .article-content h2 {
        font-size: 1.5rem;
        border-bottom: 2px solid #e9ecef;
        padding-bottom: 0.5rem;
      }
      
      .article-content h3 {
        font-size: 1.25rem;
      }
      
      .article-content p {
        margin: 1rem 0;
      }
      
      .article-content ul,
      .article-content ol {
        margin: 1rem 0;
        padding-left: 2rem;
      }
      
      .article-content li {
        margin: 0.5rem 0;
      }
      
      .article-content blockquote {
        margin: 1.5rem 0;
        padding: 1rem 1.5rem;
        background: #f8f9fa;
        border-left: 4px solid #007bff;
        font-style: italic;
        color: #555;
      }
      
      .article-content strong {
        font-weight: 600;
        color: #2c3e50;
      }
      
      .article-content a {
        color: #007bff;
        text-decoration: none;
      }
      
      .article-content a:hover {
        text-decoration: underline;
      }
      
      .share-section, .related-articles {
        margin: 3rem 0;
        padding: 2rem;
        background: #f8f9fa;
        border-radius: 8px;
      }
      
      .section-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0 0 1.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #2c3e50;
      }
      
      .share-buttons {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }
      
      .share-btn {
        background: white;
        border: 1px solid #dee2e6;
        padding: 0.75rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        transition: all 0.2s;
      }
      
      .share-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .share-btn.twitter { border-color: #1da1f2; color: #1da1f2; }
      .share-btn.facebook { border-color: #4267b2; color: #4267b2; }
      .share-btn.line { border-color: #00c300; color: #00c300; }
      .share-btn.linkedin { border-color: #0077b5; color: #0077b5; }
      
      .related-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }
      
      .related-card {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
      }
      
      .related-card:hover {
        transform: translateY(-2px);
      }
      
      .card-image {
        height: 120px;
        background: #e9ecef;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .placeholder-image {
        color: #adb5bd;
        font-size: 2rem;
      }
      
      .card-content {
        padding: 1rem;
      }
      
      .card-meta {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.8rem;
      }
      
      .card-meta .date {
        color: #666;
      }
      
      .card-meta .category {
        background: #007bff;
        color: white;
        padding: 0.2rem 0.5rem;
        border-radius: 10px;
      }
      
      .card-meta .category.event { background: #28a745; }
      .card-meta .category.announcement { background: #6c757d; }
      .card-meta .category.media { background: #6f42c1; }
      
      .card-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
        line-height: 1.4;
      }
      
      .card-excerpt {
        font-size: 0.875rem;
        color: #666;
        line-height: 1.5;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .preview-note {
        font-size: 0.875rem;
        color: #666;
        font-style: italic;
        margin-top: 1rem;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  /**
   * Markdownテキストを簡易的にHTMLに変換
   * @private
   * @param {string} markdown - Markdownテキスト
   * @returns {string} HTMLテキスト
   */
  _formatMarkdown(markdown) {
    if (!markdown) return '';
    
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      .replace(/<p><ul>/g, '<ul>')
      .replace(/<\/ul><\/p>/g, '</ul>');
  }

  // === Instagram関連メソッド（スタブ） ===
  
  switchInstagramTab(tabName) {
    this.debug(`Instagram タブ切り替え: ${tabName}`);
    this._showFeedback('Instagram機能は開発中です', 'info');
  }

  addInstagramPost() {
    this.debug('Instagram投稿追加');
    this._showFeedback('Instagram投稿機能は開発中です', 'info');
  }

  saveInstagramPost() {
    this.debug('Instagram投稿保存');
    this._showFeedback('Instagram投稿保存機能は開発中です', 'info');
  }

  refreshInstagramPosts() {
    this.debug('Instagram投稿更新');
    this._showFeedback('Instagram投稿更新機能は開発中です', 'info');
  }

  saveInstagramSettings() {
    this.debug('Instagram設定保存');
    this._showFeedback('Instagram設定保存機能は開発中です', 'info');
  }

  closeInstagramModal() {
    this.debug('Instagram モーダル閉じる');
    this.closeModal();
  }

  editInstagramPost(postId) {
    this.debug(`Instagram投稿編集: ${postId}`);
    this._showFeedback('Instagram投稿編集機能は開発中です', 'info');
  }

  toggleInstagramPostStatus(postId) {
    this.debug(`Instagram投稿ステータス切り替え: ${postId}`);
    this._showFeedback('Instagram投稿ステータス切り替え機能は開発中です', 'info');
  }

  async deleteInstagramPost(postId) {
    this.debug(`Instagram投稿削除: ${postId}`);
    this._showFeedback('Instagram投稿削除機能は開発中です', 'info');
  }

  // === ウィザード関連メソッド（スタブ） ===
  
  wizardPrevStep() {
    this.debug('ウィザード前のステップ');
    this._showFeedback('ウィザード機能は開発中です', 'info');
  }

  wizardNextStep() {
    this.debug('ウィザード次のステップ');
    this._showFeedback('ウィザード機能は開発中です', 'info');
  }
}

// サービスインスタンスのエクスポート
export const adminActionService = new AdminActionService();