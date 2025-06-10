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
import { NewsUtils } from '../../news/utils/NewsUtils.js';

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
        'duplicate-article', 'load-lesson-status', 'update-lesson-status',
      'wizard-prev', 'wizard-next',
      'toggle-notification-mode', 'export-data', 'clear-all-data', 'test-site-connection',
      'reset-local-storage', 'close-modal',
      'open-external', 'toggle-mobile-menu', 'logout',
      'switch-instagram-tab', 'add-instagram-post', 'save-instagram-post', 'refresh-instagram-posts', 'save-instagram-settings', 'close-instagram-modal', 'edit-instagram-post', 'toggle-instagram-post', 'delete-instagram-post', 'filter-instagram-list'
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
    if (this.initialized) {
      this.warn('AdminActionService は既に初期化済みです');
      return true;
    }

    try {
      this.log('🚀 AdminActionService初期化開始');

      // 基本設定
      this.currentTab = 'dashboard';

      // UIManagerServiceの初期化
      await this.initializeServices();

      // 管理画面のUI設定
      await this.setupAdminUI();

      this.initialized = true;
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
        try {
          this.actionManager.init();
          this.debug('✅ ActionManager初期化完了');
        } catch (error) {
          this.warn('ActionManager初期化で警告:', error.message);
          // ActionManagerのエラーは管理画面機能を停止しない
        }
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

  /**
   * アクション専用通知表示（右上ポップアップ）
   * @private
   */
  _showActionNotification(message, type = 'success', actionType = 'action') {
    // AdminNotificationServiceを使用
    if (window.showNotification) {
      const iconMap = {
        preview: type === 'error' ? 'fas fa-exclamation-triangle' : 'fas fa-eye',
        save: type === 'error' ? 'fas fa-exclamation-triangle' : 'fas fa-save', 
        publish: type === 'error' ? 'fas fa-exclamation-triangle' : 'fas fa-globe',
        action: type === 'error' ? 'fas fa-exclamation-triangle' : 'fas fa-check'
      };
      
      const options = {
        title: this._getActionTitle(actionType, type),
        icon: iconMap[actionType] || iconMap.action,
        duration: type === 'error' ? 6000 : 4000, // エラーは長めに表示
        className: `action-notification ${actionType}-notification ${type === 'error' ? 'error' : ''}`
      };
      
      window.showNotification(type, message, options.duration, options);
    } else {
      // フォールバック
      this._showFeedback(message, type);
    }
  }

  /**
   * アクション種別に応じたタイトル取得
   * @private
   */
  _getActionTitle(actionType, type = 'success') {
    if (type === 'error') {
      const errorTitleMap = {
        preview: 'プレビューエラー',
        save: '保存エラー',
        publish: '公開エラー',
        action: '操作エラー'
      };
      return errorTitleMap[actionType] || errorTitleMap.action;
    }
    
    const titleMap = {
      preview: 'プレビュー',
      save: '保存完了',
      publish: '公開完了',
      action: '操作完了'
    };
    
    return titleMap[actionType] || titleMap.action;
  }

  /**
   * 管理画面のアクションを登録
   * @private
   */
  _registerAdminActions() {
    try {
      if (!this.actionManager || !this.actionManager.register) {
        this.warn('ActionManagerが利用できません');
        return;
      }

      const actions = {
        // タブ切り替え
        'switch-admin-tab': async (element, params) => {
          const tabName = params.tab || element.getAttribute('data-tab');
          if (tabName) {
            await this.switchAdminTab(tabName);
          }
        },

        // ニュース関連
        'switch-news-tab': (element, params) => {
          const tabName = params.tab || element.getAttribute('data-tab');
          if (tabName) {
            this.switchNewsTab(tabName);
          }
        },
        'start-new-article': () => this.startNewArticle(),
        'preview-news': () => this.previewNews(),
        'save-news': () => this.saveNews(),
        'publish-news': () => this.publishNews(),
        'clear-news-editor': () => this.clearNewsEditor(),
        'refresh-news-list': () => this.refreshNewsList().catch(error => {
          this.warn('記事一覧更新エラー:', error.message);
        }),
        'filter-news-list': (element, params) => this.filterNewsList(element, params),
        'edit-article': (element, params) => {
          console.log('🖊️ 編集アクション呼び出し:', { element, params });
          const articleId = params?.id || element?.getAttribute('data-id') || element?.dataset?.id;
          console.log('🔍 取得した記事ID:', articleId);
          if (articleId) {
            this.editArticle(articleId);
          } else {
            console.error('ERROR 記事IDが取得できませんでした:', { params, dataId: element?.getAttribute('data-id'), dataset: element?.dataset });
            this._showFeedback('記事IDが取得できませんでした', 'error');
          }
        },
        'duplicate-article': async (element, params) => {
          const articleId = params?.id || element?.getAttribute('data-id') || element?.dataset?.id;
          if (articleId) {
            await this.duplicateArticle(articleId);
          } else {
            this._showFeedback('記事IDが取得できませんでした', 'error');
          }
        },
        'delete-article': async (element, params) => {
          console.log('🗑️ 削除アクション呼び出し:', { element, params });
          const articleId = params?.id || element?.getAttribute('data-id') || element?.dataset?.id;
          console.log('🔍 取得した記事ID:', articleId);
          if (articleId) {
            await this.deleteArticle(articleId);
          } else {
            console.error('ERROR 記事IDが取得できませんでした:', { params, dataId: element?.getAttribute('data-id'), dataset: element?.dataset });
            this._showFeedback('記事IDが取得できませんでした', 'error');
          }
        },

         // Instagram関連
        'switch-instagram-tab': (element, params) => {
          const tabName = params.tab || element.getAttribute('data-tab');
          if (tabName) {
            this.switchInstagramTab(tabName);
          }
        },
        'save-instagram-post': () => this.saveInstagramPost(),
        'save-instagram-settings': () => this.saveInstagramSettings(),
        'edit-instagram-post': (element, params) => {
          const postId = params.id || element.getAttribute('data-id');
          if (postId) {
            this.editInstagramPost(postId);
          }
        },
        'delete-instagram-post': async (element, params) => {
          const postId = params.id || element.getAttribute('data-id');
          if (postId) {
            await this.deleteInstagramPost(postId);
          }
        },
        'toggle-instagram-status': async (element, params) => {
          const postId = params.id || element.getAttribute('data-id');
          if (postId) {
            await this.toggleInstagramPostStatus(postId);
          }
        },
        'toggle-instagram-featured': async (element, params) => {
          const postId = params.id || element.getAttribute('data-id');
          if (postId) {
            await this.toggleInstagramFeatured(postId);
          }
        },
        'filter-instagram-list': () => this.filterInstagramList(),
        'reset-instagram-settings': () => this.resetInstagramSettings(),
        'test-instagram-settings': () => this.testInstagramSettings(),
        'focus-embed-input': () => {
          const embedInput = document.getElementById('instagram-embed-code');
          if (embedInput) {
            embedInput.focus();
            embedInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },

        // MarkDown挿入
        'insert-markdown': (element, params) => this.insertMarkdown(element, params),

        // 設定関連
        'save-settings': () => this.saveSettings(),
        'toggle-notification-mode': () => this.toggleNotificationMode(),

        // システム関連
        'export-data': () => this.exportData(),
        'clear-all-data': () => this.clearAllData(),
        'test-site-connection': () => this.testSiteConnection(),
        'reset-local-storage': () => this.resetLocalStorage(),

        // 認証関連
        'logout': () => this.handleAuthLogout(),

        // 外部URL
        'open-external': (element, params) => {
          const url = params.url || element.getAttribute('href');
          if (url) {
            this.openExternalUrl(url);
          }
        },

        // モバイルメニュー
        'toggle-mobile-menu': (element) => this.toggleMobileMenu(element),

        // ウィザード
        'wizard-prev': () => this.wizardPrevStep(),
        'wizard-next': () => this.wizardNextStep()
      };

      // アクションを一括登録
      this.actionManager.registerMultiple(actions);
      
      this.debug(`✅ 管理画面アクション登録完了 (${Object.keys(actions).length}個)`);
      
    } catch (error) {
      this.error('管理画面アクション登録エラー:', error);
    }
  }

  /**
   * UIイベントの設定
   * @private
   */
  setupUIEvents() {
    // レガシーEventBusイベントのマッピング（必要に応じて）
    EventBus.on('admin:needsRefresh', () => {
      this.refreshNewsList().catch(error => this.warn('記事一覧更新エラー:', error.message));
      this.refreshRecentArticles().catch(error => this.warn('最近の記事更新エラー:', error.message));
    });
    
    EventBus.on('admin:dataChanged', () => {
      this.refreshNewsList().catch(error => this.warn('記事一覧更新エラー:', error.message));
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
   * Instagram管理初期化
   * @private
   */
  async initializeInstagramManagement() {
    try {
      this.debug('📸 Instagram管理初期化開始');
      
      // Instagram管理セクションが存在することを確認
      const instagramSection = document.getElementById('instagram-management');
      if (!instagramSection) {
        this.warn('Instagram管理セクションが見つかりません');
        return;
      }
      
      // 必要なDOM要素の存在確認
      const embedInput = document.getElementById('instagram-embed-code');
      const postsContainer = document.getElementById('instagram-posts-list');
      const statsElements = {
        totalPosts: document.getElementById('total-posts'),
        activePosts: document.getElementById('active-posts'),
        featuredPosts: document.getElementById('featured-posts')
      };
      
      // UIの初期化（埋め込みコード対応）
      if (embedInput) {
        embedInput.placeholder = CONFIG.instagram.ui.placeholders.embedCode;
      }
      
      // ローディング状態の初期化
      if (postsContainer) {
        postsContainer.innerHTML = `
          <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            ${CONFIG.instagram.ui.loadingMessage}
          </div>
        `;
      }
      
      // 統計要素の初期化（null チェック）
      Object.keys(statsElements).forEach(key => {
        const element = statsElements[key];
        if (element) {
          element.textContent = '0';
        } else {
          this.warn(`統計要素が見つかりません: ${key}`);
        }
      });
      
      // Instagram設定を読み込み
      this.loadInstagramSettings();
      
      // Instagram投稿一覧を読み込み
      this.refreshInstagramPosts();
      
      // 統計を更新
      this.updateInstagramStats();
      
      this.debug('📸 Instagram管理初期化完了');
    } catch (error) {
      this.error('Instagram管理初期化エラー:', error);
    }
  }

  /**
   * 初期データ読み込み
   * @private
   */
  async loadInitialData() {
    try {
      this.debug('SAVE 初期データ読み込み開始');
      
      // 初期データ読み込み処理（将来の拡張用）
      this.debug('基本データ読み込み完了');
      
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
          await this.refreshNewsList();
          break;
          
        case 'lesson-status':
          // レッスン状況の初期化（実装準備中）
          this.debug('レッスン状況タブを表示');
          break;
          
        case 'instagram-management':
          // Instagram管理の初期化
          await this.initializeInstagramManagement();
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
    return ['dashboard', 'news-management', 'lesson-status', 'instagram-management', 'settings'].includes(tabName);
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
        this.refreshNewsList().catch(error => {
          this.warn('記事一覧更新エラー:', error.message);
        });
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
      
      // 基本設定のみで完了（レッスン状況読み込みは実装準備中）
      this.debug('レッスン状況基本設定完了');
      
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
      throw new Error('タイトルが入力されていません');
    }
    
    if (!formData.content.trim()) {
      throw new Error('本文が入力されていません');
    }
    
    // プレビューモーダルを作成・表示
    this._showNewsPreviewModal(formData);
    
    console.log('✅ 記事プレビュー成功');
  }

  /**
   * 記事保存
   */
  async saveNews() {
    const articleData = this._getArticleDataFromForm();
    
    if (!this._validateArticleData(articleData)) {
      throw new Error('記事データの検証に失敗しました');
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
      return result;
    } else {
      throw new Error(result.message || '保存に失敗しました');
    }
  }

  /**
   * 記事公開
   */
  async publishNews() {
    const articleData = this._getArticleDataFromForm();
    
    if (!this._validateArticleData(articleData)) {
      throw new Error('記事データの検証に失敗しました');
    }

    const result = await this.articleDataService.saveArticle(articleData, true);
    
    if (result.success) {
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
      return result;
    } else {
      throw new Error(result.message || '公開に失敗しました');
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
   * ニュース一覧更新（記事管理タブ用）
   */
  async refreshNewsList() {
    try {
      console.log('🔄 記事管理タブのニュース一覧更新開始');
      
      const newsListContainer = document.getElementById('news-list');
      if (!newsListContainer) {
        console.warn('WARN news-list コンテナが見つかりません');
        return;
      }
      
      // ローディング表示
      newsListContainer.innerHTML = `
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
      
      // 記事を更新日時でソート
      const sortedArticles = articles
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0);
          const dateB = new Date(b.updatedAt || b.createdAt || 0);
          return dateB - dateA;
        });
      
      // 統一されたメソッドを使用してHTML生成（記事管理モード）
      console.log('🎨 記事管理用統一メソッドでHTML生成開始:', sortedArticles.length, '件');
      
      const html = this._generateUnifiedArticleListHTML(sortedArticles, {
        mode: 'management',
        showActions: true,
        showMeta: true,
        emptyMessage: '記事がまだありません',
        emptyAction: {
          action: 'start-new-article',
          icon: 'fa-plus',
          text: '新規記事を作成'
        }
      });
      
      newsListContainer.innerHTML = html;
      console.log(`SUCCESS 記事管理ニュース一覧更新完了 - ${sortedArticles.length}件表示`);
      
    } catch (error) {
      console.error('ERROR 記事管理ニュース一覧更新エラー:', error);
      console.error('ERROR スタックトレース:', error.stack);
      
      const newsListContainer = document.getElementById('news-list');
      if (newsListContainer) {
        newsListContainer.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>記事の読み込みに失敗しました</p>
            <button class="btn btn-outline" data-action="refresh-news-list">
              <i class="fas fa-refresh"></i> 再試行
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * 最近の記事更新表示
   */
  async refreshRecentArticles() {
    try {
      console.log('🔄 ダッシュボード最近の記事更新開始');
      
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
      
      // 統一されたメソッドを使用してHTML生成
      console.log('🎨 ダッシュボード用統一メソッドでHTML生成開始:', recentArticles.length, '件');
      
      const html = this._generateUnifiedArticleListHTML(recentArticles, {
        mode: 'recent',
        showActions: true,
        showMeta: true,
        emptyMessage: '記事がまだありません',
        emptyAction: {
          action: 'start-new-article',
          icon: 'fa-plus',
          text: '新規記事を作成'
        }
      });
      
      recentContainer.innerHTML = html;
      console.log(`SUCCESS ダッシュボード最近の記事更新完了 - ${recentArticles.length}件表示`);
      
    } catch (error) {
      console.error('ERROR ダッシュボード最近の記事更新エラー:', error);
      console.error('ERROR スタックトレース:', error.stack);
      
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
   * 統合された記事一覧HTMLの生成
   * ダッシュボードの最近の記事と記事管理で共通利用
   * NewsUtilsを使用して統一されたUIを生成
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

    // NewsUtilsを使用してカードを生成（統一UIでadmin-unifiedを使用）
    const context = 'admin-unified';
    
    console.log(`🎯 _generateUnifiedArticleListHTML開始 - モード: ${mode}, コンテキスト: ${context}, 記事数: ${displayArticles.length}`);
    
    return displayArticles.map((article, index) => {
      // 記事データにステータス情報を追加
      const enrichedArticle = {
        ...article,
        status: article.status || 'draft',
        publishedAt: article.publishedAt || article.createdAt,
        date: article.date || article.publishedAt || article.createdAt
      };
      
      console.log(`🎭 記事 ${index + 1} (${mode}モード) コンテキスト: ${context}`, {
        id: enrichedArticle.id,
        title: enrichedArticle.title,
        status: enrichedArticle.status,
        date: enrichedArticle.date
      });
      
      const cardHTML = NewsUtils.createArticleCard(enrichedArticle, context);
      console.log(`🎨 記事 ${index + 1} 生成されたHTML (最初の500文字):`, cardHTML.substring(0, 500));
      
      // アクションボタンが含まれているかチェック
      const hasEditBtn = cardHTML.includes('edit-btn');
      const hasPreviewBtn = cardHTML.includes('preview-btn');
      const hasDeleteBtn = cardHTML.includes('delete-btn');
      console.log(`🔍 記事 ${index + 1} ボタンチェック - 編集: ${hasEditBtn}, プレビュー: ${hasPreviewBtn}, 削除: ${hasDeleteBtn}`);
      
      return cardHTML;
    }).join('');
  }

  // 削除済み: #renderRecentArticles - refreshRecentArticles()に統合

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
   * 記事IDによるプレビュー（UX改善・シンプル版）
   * @param {string} articleId - 記事ID
   */
  async previewArticleById(articleId) {
    console.log('👁️ [DEBUG] プレビューボタンクリック:', articleId);
    
    try {
      // 記事IDの検証
      if (!articleId) {
        console.error('❌ [ERROR] 記事IDが空です');
        this._showFeedback('記事IDが指定されていません', 'error');
        return;
      }
      
      // ArticleDataServiceの初期化確認
      if (!this.articleDataService || !this.articleDataService.initialized) {
        console.error('❌ [ERROR] ArticleDataServiceが未初期化');
        this._showFeedback('記事サービスが初期化されていません。ページを再読み込みしてください。', 'error');
        return;
      }
      
      // 記事データを取得
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        console.error('❌ [ERROR] 記事が見つかりません:', articleId);
        
        // デバッグ: 利用可能な記事をログ出力
        const allArticles = this.articleDataService.loadArticles();
        console.log('📊 [DEBUG] 利用可能な記事一覧:', allArticles.map(a => ({ id: a.id, title: a.title })));
        
        this._showFeedback('プレビューする記事が見つかりません', 'error');
        return;
      }
      
      console.log('✅ [SUCCESS] 記事データ取得:', article.title);
      
      // 簡単な確認ダイアログでテスト
      const confirmed = confirm(`記事「${article.title}」をプレビューしますか？\n\n※デバッグ：この確認が表示されればボタンは正常に動作しています。`);
      
      if (!confirmed) {
        console.log('💡 [INFO] プレビューがキャンセルされました');
        return;
      }
      
      // シンプルなプレビューモーダルを表示
      this._showSimplePreviewModal(article, articleId);
      
      console.log('✅ [SUCCESS] プレビュー表示完了');
      
    } catch (error) {
      console.error('❌ [ERROR] プレビューエラー:', error);
      this._showFeedback(`プレビューエラー: ${error.message}`, 'error');
    }
  }

  /**
   * 記事複製
   * @param {string} articleId - 記事ID
   */
  async duplicateArticle(articleId) {
    console.log('📋 記事複製開始:', articleId);
    
    // 記事IDの検証
    if (!articleId) {
      throw new Error('記事IDが指定されていません');
    }
    
    // ArticleDataServiceの初期化確認
    if (!this.articleDataService || !this.articleDataService.initialized) {
      console.error('ERROR ArticleDataServiceが初期化されていません');
      throw new Error('記事サービスが初期化されていません。ページを再読み込みしてください。');
    }
    
    const originalArticle = this.articleDataService.getArticleById(articleId);
    if (!originalArticle) {
      console.error('ERROR 記事が見つかりません:', articleId);
      throw new Error('元の記事が見つかりません');
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
      
      console.log('SUCCESS 記事複製完了:', result.id);
      return result;
    } else {
      throw new Error(result.message || '複製に失敗しました');
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
      console.log('🗑️ 記事削除開始:', articleId);
      
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
      
      // 記事の存在確認
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        this._showFeedback('削除対象の記事が見つかりません', 'error');
        return;
      }
      
      if (!confirm(`記事「${article.title}」を削除しますか？この操作は取り消せません。`)) {
        console.log('記事削除がキャンセルされました');
        return;
      }
      
      const result = await this.articleDataService.deleteArticle(articleId);
      
      if (result.success) {
        this._showFeedback(`記事「${article.title}」を削除しました`, 'success');
        
        // 記事一覧とダッシュボードを更新
        await Promise.all([
          this.refreshRecentArticles().catch(e => console.warn('最近の記事更新エラー:', e)),
          this.refreshNewsList().catch(e => console.warn('記事一覧更新エラー:', e))
        ]);
        this.updateDashboardStats();
        
        console.log('SUCCESS 記事削除完了:', articleId);
        return result;
      } else {
        throw new Error(result.message || '削除に失敗しました');
      }
    } catch (error) {
      console.error('ERROR 記事削除エラー:', error);
      this._showFeedback('記事の削除に失敗しました: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * シンプルなプレビューモーダルを表示（UX改善版）
   * @private
   * @param {Object} article - 記事データ
   * @param {string} articleId - 記事ID
   */
  _showSimplePreviewModal(article, articleId) {
    console.log('🖼️ [DEBUG] プレビューモーダル表示開始');
    
    try {
      // 既存のモーダルを削除
      const existingModal = document.getElementById('simple-preview-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // 記事本文を取得
      const content = this.articleDataService.getArticleContent?.(articleId) || article.content || '記事の内容がありません。';
      
      // カテゴリー名を取得
      const categoryNames = {
        'announcement': 'お知らせ',
        'event': '体験会',
        'media': 'メディア',
        'important': '重要'
      };
      const categoryName = categoryNames[article.category] || article.category || 'その他';
      
      // 日付フォーマット
      const formattedDate = article.date ? 
        new Date(article.date).toLocaleDateString('ja-JP', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : '日付未設定';
      
      // シンプルなモーダルHTML
      const modalHTML = `
        <div id="simple-preview-modal" class="modal preview-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        ">
          <div class="modal-content" style="
            background: white;
            border-radius: 12px;
            max-width: 800px;
            max-height: 90vh;
            width: 90%;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
          ">
            <!-- モーダルヘッダー -->
            <div class="modal-header" style="
              padding: 20px 24px;
              border-bottom: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #f8fafc;
            ">
              <div>
                <h2 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                  📰 記事プレビュー
                </h2>
                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                  実際のページと同様の表示です
                </p>
              </div>
              <button onclick="this.closest('.modal').remove()" style="
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                transition: all 0.2s;
              " onmouseover="this.style.background='#f3f4f6'; this.style.color='#374151'" 
                 onmouseout="this.style.background='none'; this.style.color='#6b7280'"
                 title="閉じる">
                ×
              </button>
            </div>
            
            <!-- モーダルボディ -->
            <div class="modal-body" style="
              padding: 0;
              max-height: calc(90vh - 80px);
              overflow-y: auto;
            ">
              <div class="preview-content" style="padding: 32px 40px;">
                <!-- 記事メタ情報 -->
                <div class="article-meta" style="
                  display: flex;
                  gap: 16px;
                  margin-bottom: 16px;
                  flex-wrap: wrap;
                ">
                  <span style="
                    background: #dbeafe;
                    color: #1e40af;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 500;
                  ">
                    📅 ${formattedDate}
                  </span>
                  <span style="
                    background: #dcfce7;
                    color: #166534;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 500;
                  ">
                    🏷️ ${categoryName}
                  </span>
                  <span style="
                    background: #fef3c7;
                    color: #d97706;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 500;
                  ">
                    ${article.status === 'published' ? '✅ 公開中' : '📝 下書き'}
                  </span>
                </div>
                
                <!-- 記事タイトル -->
                <h1 style="
                  margin: 0 0 24px 0;
                  color: #1f2937;
                  font-size: 28px;
                  font-weight: 700;
                  line-height: 1.3;
                ">${this.escapeHtml(article.title || '無題')}</h1>
                
                <!-- 記事要約 -->
                ${article.summary ? `
                  <div class="article-summary" style="
                    background: #f8fafc;
                    border-left: 4px solid #3b82f6;
                    padding: 16px 20px;
                    margin-bottom: 32px;
                    border-radius: 0 8px 8px 0;
                  ">
                    <p style="
                      margin: 0;
                      color: #374151;
                      font-size: 16px;
                      line-height: 1.6;
                      font-style: italic;
                    ">${this.escapeHtml(article.summary)}</p>
                  </div>
                ` : ''}
                
                <!-- 記事本文 -->
                <div class="article-content" style="
                  color: #374151;
                  font-size: 16px;
                  line-height: 1.8;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                ">${this.escapeHtml(content)}</div>
                
                <!-- フッター -->
                <div style="
                  margin-top: 40px;
                  padding-top: 24px;
                  border-top: 1px solid #e5e7eb;
                  text-align: center;
                  color: #6b7280;
                  font-size: 14px;
                ">
                  <p style="margin: 0;">
                    📱 プレビューモード | 記事ID: ${articleId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideIn {
            from { transform: scale(0.9) translateY(-20px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
          
          .modal-body::-webkit-scrollbar {
            width: 8px;
          }
          
          .modal-body::-webkit-scrollbar-track {
            background: #f1f5f9;
          }
          
          .modal-body::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          
          .modal-body::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        </style>
      `;
      
      // モーダルをDOMに追加
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // ESCキーで閉じる
      const modal = document.getElementById('simple-preview-modal');
      const closeHandler = (e) => {
        if (e.key === 'Escape' || e.target === modal) {
          modal.remove();
          document.removeEventListener('keydown', closeHandler);
        }
      };
      
      document.addEventListener('keydown', closeHandler);
      modal.addEventListener('click', closeHandler);
      
      console.log('✅ [SUCCESS] プレビューモーダル表示完了');
      
    } catch (error) {
      console.error('❌ [ERROR] プレビューモーダル表示エラー:', error);
      // フォールバック: アラートで内容を表示
      alert(`記事プレビュー\n\nタイトル: ${article.title}\n\n内容:\n${content.substring(0, 200)}...`);
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
                    <button class="preview-action-btn share-btn" disabled>
                      <i class="fas fa-share"></i>
                      シェア
                    </button>
                    <button class="preview-action-btn bookmark-btn" disabled>
                      <i class="fas fa-bookmark"></i>
                      ブックマーク
                    </button>
                    <button class="preview-action-btn print-btn" onclick="window.print()">
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
      // プレビュー用のスタイルは admin-preview.css で管理
    } catch (error) {
      this.error('記事プレビューモーダル表示エラー:', error);
      this._showFeedback('プレビューの表示に失敗しました', 'error');
    }
  }

  // _addPreviewStyles メソッドは admin-preview.css に移行済み

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

  // === Instagram関連メソッド ===
  
  /**
   * Instagramタブ切り替え
   * @param {string} tabName - タブ名
   */
  switchInstagramTab(tabName) {
    this.debug(`Instagram タブ切り替え: ${tabName}`);
    
    try {
      // タブボタンの更新
      document.querySelectorAll('.sub-nav-item[data-action="switch-instagram-tab"]').forEach(btn => {
        btn.classList.remove('active');
      });
      
      const activeTabBtn = document.querySelector(`[data-action="switch-instagram-tab"][data-tab="${tabName}"]`);
      if (activeTabBtn) {
        activeTabBtn.classList.add('active');
      }
      
      // タブコンテンツの更新
      document.querySelectorAll('.instagram-tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      const activeTabContent = document.getElementById(`instagram-${tabName}-tab`);
      if (activeTabContent) {
        activeTabContent.classList.add('active');
      }
      
      // タブに応じた初期化処理
      if (tabName === 'posts') {
        this.refreshInstagramPosts();
      } else if (tabName === 'settings') {
        this.loadInstagramSettings();
      }
      
      this.debug(`✅ Instagram ${tabName}タブに切り替え完了`);
    } catch (error) {
      this.error('Instagramタブ切り替えエラー:', error);
      this._showFeedback('タブの切り替えに失敗しました', 'error');
    }
  }

  /**
   * Instagram投稿追加フォームをクリア
   */
  addInstagramPost() {
    this.debug('Instagram投稿追加');
    this.clearInstagramForm();
  }

  /**
   * Instagram投稿保存（埋め込みコード対応）
   */
  async saveInstagramPost() {
    this.debug('Instagram投稿保存（埋め込みコード）');
    
    const formData = this.getInstagramFormData();
    
    if (!formData.embedCode) {
      throw new Error('埋め込みコードが入力されていません');
    }
    
    if (!this.validateInstagramEmbed(formData.embedCode)) {
      throw new Error('無効な埋め込みコードです');
    }
    
    // InstagramDataServiceを使用して保存
    if (!this.instagramDataService) {
      throw new Error('InstagramDataServiceが初期化されていません');
    }
    
    const result = await this.instagramDataService.savePost(formData);
    
    if (result.success) {
      this.clearInstagramForm();
      this.refreshInstagramPosts();
      
      // 統計を更新
      this.updateInstagramStats();
      return result;
    } else {
      throw new Error(result.message || 'Instagram投稿の保存に失敗しました');
    }
  }

  /**
   * Instagram投稿一覧を更新
   */
  async refreshInstagramPosts() {
    this.debug('Instagram投稿更新');
    
    try {
      if (!this.instagramDataService) {
        throw new Error('InstagramDataServiceが初期化されていません');
      }
      
      const posts = this.instagramDataService.getAllPosts();
      this.renderInstagramPosts(posts);
      
      // 保存されたフィルタ状態を復元
      this.restoreInstagramFilter();
      
      // 成功メッセージは表示しない（頻繁な更新のため）
    } catch (error) {
      this.error('Instagram投稿更新エラー:', error);
      this._showFeedback(CONFIG.instagram.ui.errorMessages.loadError, 'error');
    }
  }

  /**
   * Instagram投稿フィルタ状態を復元
   */
  restoreInstagramFilter() {
    try {
      const savedFilter = localStorage.getItem('rbs_instagram_filter');
      if (savedFilter) {
        const filterSelect = document.getElementById('instagram-filter');
        if (filterSelect) {
          filterSelect.value = savedFilter;
          // フィルタを適用
          this.filterInstagramList();
        }
      }
    } catch (error) {
      this.warn('Instagram投稿フィルタ状態復元エラー:', error);
    }
  }

  /**
   * Instagram設定保存
   */
  async saveInstagramSettings() {
    this.debug('Instagram設定保存');
    
    const settings = this.getInstagramSettingsData();
    
    // 設定をローカルストレージに保存
    localStorage.setItem(CONFIG.storage.keys.instagramSettings, JSON.stringify(settings));
  }

  closeInstagramModal() {
    this.debug('Instagram モーダル閉じる');
    this.closeModal();
  }

  /**
   * Instagram投稿編集
   * @param {string} postId - 投稿ID
   */
  editInstagramPost(postId) {
    this.debug(`Instagram投稿編集: ${postId}`);
    
    try {
      if (!this.instagramDataService) {
        throw new Error('InstagramDataServiceが初期化されていません');
      }
      
      const post = this.instagramDataService.getPostById(postId);
      if (!post) {
        throw new Error('投稿が見つかりませんでした');
      }
      
      this.loadInstagramPostToForm(post);
      
      // 投稿管理タブに切り替え
      this.switchInstagramTab('posts');
    } catch (error) {
      this.error('Instagram投稿編集エラー:', error);
      throw error;
    }
  }

  /**
   * Instagram投稿のステータス切り替え
   * @param {string} postId - 投稿ID
   */
  async toggleInstagramPostStatus(postId) {
    this.debug(`Instagram投稿ステータス切り替え: ${postId}`);
    
    try {
      if (!this.instagramDataService) {
        throw new Error('InstagramDataServiceが初期化されていません');
      }
      
      const post = this.instagramDataService.getPostById(postId);
      if (!post) {
        throw new Error('投稿が見つかりませんでした');
      }
      
      const result = await this.instagramDataService.togglePostStatus(postId);
      
      if (result.success) {
        this.refreshInstagramPosts();
        this.updateInstagramStats();
        const newStatus = post.status === 'active' ? '非表示' : '表示';
        this._showFeedback(`Instagram投稿を${newStatus}に設定しました`, 'success');
      } else {
        throw new Error(result.message || 'ステータスの変更に失敗しました');
      }
    } catch (error) {
      this.error('Instagram投稿ステータス切り替えエラー:', error);
      this._showFeedback('ステータスの変更に失敗しました', 'error');
      throw error;
    }
  }

  /**
   * Instagram投稿削除
   * @param {string} postId - 投稿ID
   */
  async deleteInstagramPost(postId) {
    this.debug(`Instagram投稿削除: ${postId}`);
    
    try {
      if (!this.instagramDataService) {
        throw new Error('InstagramDataServiceが初期化されていません');
      }
      
      const result = await this.instagramDataService.deletePost(postId);
      
      if (result.success) {
        this.refreshInstagramPosts();
        this.updateInstagramStats();
        this._showFeedback('Instagram投稿を削除しました', 'success');
      } else {
        throw new Error(result.message || '削除に失敗しました');
      }
    } catch (error) {
      this.error('Instagram投稿削除エラー:', error);
      this._showFeedback('Instagram投稿の削除に失敗しました', 'error');
      throw error;
    }
  }

  /**
   * Instagram投稿の注目投稿ステータス切り替え
   * @param {string} postId - 投稿ID
   */
  async toggleInstagramFeatured(postId) {
    this.debug(`Instagram投稿注目ステータス切り替え: ${postId}`);
    
    try {
      if (!this.instagramDataService) {
        throw new Error('InstagramDataServiceが初期化されていません');
      }
      
      const post = this.instagramDataService.getPostById(postId);
      if (!post) {
        throw new Error('投稿が見つかりませんでした');
      }
      
      const updatedPostData = {
        ...post,
        featured: !post.featured,
        updatedAt: new Date().toISOString()
      };
      
      const result = await this.instagramDataService.savePost(updatedPostData);
      
      if (result.success) {
        this.refreshInstagramPosts();
        this.updateInstagramStats();
        const statusText = updatedPostData.featured ? '注目投稿に設定' : '注目投稿を解除';
        this._showFeedback(`Instagram投稿を${statusText}しました`, 'success');
      } else {
        throw new Error(result.message || '注目投稿ステータスの変更に失敗しました');
      }
    } catch (error) {
      this.error('Instagram投稿注目ステータス切り替えエラー:', error);
      this._showFeedback('注目投稿ステータスの変更に失敗しました', 'error');
      throw error;
    }
  }

  /**
   * フォームからInstagram投稿データを取得（埋め込みコード対応）
   * @returns {Object} フォームデータ
   */
  getInstagramFormData() {
    return {
      id: document.getElementById('instagram-post-id').value || undefined,
      embedCode: document.getElementById('instagram-embed-code').value.trim(),
      status: document.getElementById('instagram-status').checked ? 'active' : 'inactive',
      featured: document.getElementById('instagram-featured').checked || CONFIG.instagram.posts.defaultFeatured
    };
  }

  /**
   * Instagram設定データを取得
   * @returns {Object} 設定データ
   */
  getInstagramSettingsData() {
    return {
      maxPostsDisplay: parseInt(document.getElementById('max-posts-display').value) || CONFIG.instagram.posts.defaultDisplayPosts,
      openNewTab: document.getElementById('open-new-tab').checked !== false // デフォルトはtrue
    };
  }

  /**
   * Instagram投稿をフォームに読み込み（埋め込みコード対応）
   * @param {Object} post - 投稿データ
   */
  loadInstagramPostToForm(post) {
    document.getElementById('instagram-post-id').value = post.id;
    document.getElementById('instagram-embed-code').value = post.embedCode || '';
    document.getElementById('instagram-status').checked = post.status === 'active';
    document.getElementById('instagram-featured').checked = post.featured || false;
  }

  /**
   * Instagramフォームをクリア（埋め込みコード対応）
   */
  clearInstagramForm() {
    document.getElementById('instagram-post-form').reset();
    document.getElementById('instagram-post-id').value = '';
    document.getElementById('instagram-embed-code').value = '';
    document.getElementById('instagram-status').checked = CONFIG.instagram.posts.defaultStatus === 'active';
    document.getElementById('instagram-featured').checked = CONFIG.instagram.posts.defaultFeatured;
  }

  /**
   * Instagram投稿一覧をレンダリング（管理画面統一デザイン対応）
   * @param {Array} posts - 投稿データ配列
   */
  renderInstagramPosts(posts) {
    const container = document.getElementById('instagram-posts-list');
    if (!container) return;
    
    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fab fa-instagram"></i>
          </div>
          <h3 class="empty-title">${CONFIG.instagram.ui.emptyStateMessage}</h3>
          <p class="empty-description">上のフォームから最初の投稿を追加してください</p>
          <button class="btn btn-primary" data-action="focus-embed-input" title="埋め込みコード入力欄にフォーカス">
            <i class="fas fa-plus"></i>
            投稿を追加
          </button>
        </div>
      `;
      return;
    }
    
    const html = posts.map(post => this.renderInstagramPostItem(post)).join('');
    container.innerHTML = html;
    
    // Instagram埋め込みスクリプトを再実行
    this.processInstagramEmbeds();
  }

  /**
   * Instagram埋め込みスクリプトを処理（2024年最適化版）
   * @private
   */
  processInstagramEmbeds() {
    try {
      this.debug('📸 Instagram埋め込み処理開始');
      
      // 既存のスクリプトを確認
      const existingScript = document.querySelector('script[src*="embed.js"]');
      
      if (!existingScript) {
        this.debug('📸 Instagram埋め込みスクリプトを動的追加');
        const script = document.createElement('script');
        script.async = true;
        script.defer = true; // defer属性を追加
        script.src = 'https://www.instagram.com/embed.js'; // httpsに変更
        
        // エラーハンドリング強化
        script.addEventListener('load', () => {
          this.debug('✅ Instagram埋め込みスクリプト読み込み完了');
          setTimeout(() => this.retryInstagramProcess(), 100);
        }, { passive: true });
        
        script.addEventListener('error', (e) => {
          this.warn('⚠️ Instagram埋め込みスクリプト読み込み失敗:', e);
          this.loadOEmbedFallback();
        }, { passive: true });
        
        // DOM要素の安全な追加
        if (document.head) {
          document.head.appendChild(script);
        } else {
          // documentが完全に読み込まれていない場合の対応
          document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(script);
          }, { passive: true });
        }
      } else {
        // 既存のスクリプトがある場合は少し待ってから処理
        setTimeout(() => this.retryInstagramProcess(), 200);
      }
    } catch (error) {
      this.error('❌ Instagram埋め込み処理エラー:', error);
      this.loadOEmbedFallback();
    }
  }

  /**
   * Instagram埋め込み処理をリトライ（2024年対応）
   * @private
   */
  retryInstagramProcess() {
    let retries = 0;
    const maxRetries = 15; // より多くのリトライ
    const retryInterval = 300; // 短いインターバル
    
    const processEmbeds = () => {
      if (typeof window.instgrm !== 'undefined' && window.instgrm.Embeds) {
        try {
          // 2024年対応: 複数回の処理を試行
          window.instgrm.Embeds.process();
          this.debug('✅ Instagram埋め込み処理完了');
          
          // 追加の初期化（公式推奨）
          setTimeout(() => {
            if (window.instgrm && window.instgrm.Embeds) {
              window.instgrm.Embeds.process();
              this.debug('✅ Instagram埋め込み再処理完了');
            }
          }, 1000);
          
        } catch (embedError) {
          this.warn('⚠️ Instagram埋め込み処理中エラー:', embedError);
          this.loadOEmbedFallback();
        }
      } else if (retries < maxRetries) {
        retries++;
        this.debug(`🔄 Instagram埋め込みスクリプト待機中... (${retries}/${maxRetries})`);
        setTimeout(processEmbeds, retryInterval);
      } else {
        this.warn('⚠️ Instagram埋め込みスクリプト読み込みタイムアウト');
        this.loadOEmbedFallback();
      }
    };
    
    setTimeout(processEmbeds, 100);
  }

  /**
   * oEmbed APIを使用したフォールバック読み込み（2024年対応）
   * @private
   */
  async loadOEmbedFallback() {
    this.debug('📸 oEmbed APIフォールバック開始');
    const embedContainers = document.querySelectorAll('.instagram-embed-container blockquote[data-instgrm-permalink]');
    
    for (const container of embedContainers) {
      try {
        const permalink = container.getAttribute('data-instgrm-permalink');
        if (permalink) {
          await this.processOEmbedUrl(permalink, container);
        }
      } catch (error) {
        this.warn('oEmbed処理エラー:', error);
      }
    }
  }

  /**
   * oEmbed APIで個別URL処理
   * @param {string} url - Instagram投稿URL
   * @param {HTMLElement} container - 埋め込みコンテナ
   */
  async processOEmbedUrl(url, container) {
    try {
      this.debug('🔗 oEmbed API処理:', url);
      
      // Instagram oEmbed API（2024年対応）
      const oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}&maxwidth=400&omitscript=true`;
      
      const response = await fetch(oembedUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.html) {
          container.outerHTML = data.html;
          this.debug('✅ oEmbed埋め込み成功:', url);
          return;
        }
      }
      
      // oEmbed失敗時のフォールバック
      this.showInstagramPreview(container, url);
      
    } catch (error) {
      this.warn('oEmbed API エラー:', error);
      this.showInstagramPreview(container, url);
    }
  }

  /**
   * コンパクトInstagram埋め込みを読み込み
   * @private
   */
  async loadCompactInstagramEmbeds() {
    const embedContainers = document.querySelectorAll('.instagram-compact-embed');
    
    for (const container of embedContainers) {
      const postUrl = container.dataset.postUrl;
      if (postUrl) {
        try {
          await this.loadSingleCompactEmbed(container, postUrl);
        } catch (error) {
          console.error('個別Instagram埋め込み読み込みエラー:', error);
          this.showEmbedError(container, postUrl);
        }
      }
    }
  }

  /**
   * 単一のコンパクト埋め込みを読み込み
   * @param {HTMLElement} container - 埋め込みコンテナ
   * @param {string} url - Instagram投稿URL
   */
  async loadSingleCompactEmbed(container, url) {
    try {
      // Instagram oEmbed APIを使用
      const oembedUrl = `https://graph.facebook.com/v16.0/instagram_oembed?url=${encodeURIComponent(url)}&maxwidth=400&omitscript=true&access_token=`;
      
      // シンプルな表示用HTML（oEmbedなしバージョン）
      const compactHtml = this.generateSimpleInstagramPreview(url);
      container.innerHTML = compactHtml;
      
      console.log('📸 コンパクトInstagram埋め込み完了:', url);
    } catch (error) {
      console.error('Instagram埋め込み読み込みエラー:', error);
      this.showEmbedError(container, url);
    }
  }

  /**
   * Instagram公式埋め込みコードを生成（2024年最適化版）
   * @param {string} url - Instagram投稿URL
   * @returns {string} 公式埋め込みHTML
   */
  generateSimpleInstagramPreview(url) {
    const postId = this.extractInstagramPostId(url);
    
    // 2024年対応: より互換性の高い埋め込みコードを生成
    const embedHtml = `
      <div class="instagram-embed-wrapper" data-post-id="${postId}">
        <blockquote class="instagram-media" 
                    data-instgrm-captioned 
                    data-instgrm-permalink="${url}" 
                    data-instgrm-version="14" 
                    style="background:#FFF; border:0; border-radius:12px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:400px; min-width:300px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
          <div style="padding:16px;">
            <a href="${url}" 
               style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" 
               target="_blank" 
               rel="noopener noreferrer">
              
              <!-- ヘッダー部分 -->
              <div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 12px;">
                <div style="background: linear-gradient(45deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px; display: flex; align-items: center; justify-content: center;">
                  <div style="background:#FFF; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="url(#grad1)">
                      <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style="stop-color:#833ab4"/>
                          <stop offset="50%" style="stop-color:#fd1d1d"/>
                          <stop offset="100%" style="stop-color:#fcb045"/>
                        </linearGradient>
                      </defs>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                </div>
                <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;">
                  <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px; animation: pulse 1.5s ease-in-out infinite alternate;"></div>
                  <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px; animation: pulse 1.5s ease-in-out infinite alternate;"></div>
                </div>
              </div>
              
              <!-- 画像プレースホルダー -->
              <div style="padding: 19% 0; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; position: relative; overflow: hidden;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 12px;">
                  <div style="width: 60px; height: 60px; background: linear-gradient(45deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: instagramPulse 2s ease-in-out infinite;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              <!-- フッター -->
              <div style="padding-top: 12px;">
                <div style="color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px; text-align: center;">
                  📸 この投稿をInstagramで見る
                </div>
              </div>
            </a>
            
            <p style="color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;">
              <a href="${url}" 
                 style="color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" 
                 target="_blank" 
                 rel="noopener noreferrer">
                ✨ Instagram投稿 ${postId}
              </a>
            </p>
          </div>
        </blockquote>
      </div>
      
      <style>
        @keyframes pulse {
          0% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        @keyframes instagramPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      </style>
    `;

    // 遅延実行で埋め込みスクリプトを処理
    setTimeout(() => {
      this.processInstagramEmbeds();
    }, 200);

    return embedHtml;
  }

  /**
   * Instagram投稿プレビュー表示（最終フォールバック）
   * @param {HTMLElement} container - コンテナ要素
   * @param {string} url - Instagram投稿URL
   */
  showInstagramPreview(container, url) {
    const postId = this.extractInstagramPostId(url);
    
    const previewHtml = `
      <div class="instagram-preview-fallback">
        <div class="preview-header">
          <div class="instagram-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="url(#instagramGrad)">
              <defs>
                <linearGradient id="instagramGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#833ab4"/>
                  <stop offset="50%" style="stop-color:#fd1d1d"/>
                  <stop offset="100%" style="stop-color:#fcb045"/>
                </linearGradient>
                             </defs>
               <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
             </svg>
           </div>
           <div class="preview-title">Instagram投稿</div>
         </div>
         <div class="preview-content">
           <div class="preview-image-area">
             <div class="image-icon">📸</div>
             <p>投稿ID: <code>${postId}</code></p>
           </div>
           <a href="${url}" target="_blank" rel="noopener noreferrer" class="view-original">
             <i class="fab fa-instagram"></i>
             Instagramで見る
           </a>
         </div>
       </div>
     `;
     
     container.innerHTML = previewHtml;
   }

  /**
   * Instagram投稿の画像プレビューを読み込む
   * @param {string} postId - 投稿ID  
   * @param {string} url - Instagram投稿URL
   */
  async loadInstagramPreviewImage(postId, url) {
    try {
      this.debug('画像プレビュー読み込み開始:', postId);
      const placeholder = document.getElementById(`img-preview-${postId}`);
      if (!placeholder) {
        this.warn('プレースホルダー要素が見つかりません:', `img-preview-${postId}`);
        return;
      }

      // Instagram投稿から画像を取得を試行
      const imageUrl = await this.fetchInstagramImage(url, postId);
      
      this.debug('画像URL取得結果:', imageUrl);
      
      if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `Instagram投稿 ${postId}`;
        img.className = 'instagram-preview-image';
        
        img.onload = () => {
          this.debug('画像読み込み成功:', postId);
          placeholder.innerHTML = '';
          placeholder.appendChild(img);
          placeholder.classList.add('loaded');
        };
        
        img.onerror = () => {
          this.debug('画像読み込み失敗、フォールバック表示:', postId);
          this.showImageFallback(placeholder, postId);
        };
      } else {
        this.debug('画像URL取得失敗、フォールバック表示:', postId);
        this.showImageFallback(placeholder, postId);
      }
      
    } catch (error) {
      this.error('Instagram画像読み込みエラー:', error);
      const placeholder = document.getElementById(`img-preview-${postId}`);
      if (placeholder) {
        this.showImageFallback(placeholder, postId);
      }
    }
  }

  /**
   * Instagram画像を取得する（フォールバック表示）
   * @param {string} url - Instagram投稿URL
   * @param {string} postId - 投稿ID
   * @returns {Promise<string|null>} 画像URL
   */
  async fetchInstagramImage(url, postId) {
    try {
      // CORS制限により、直接的な画像取得は困難なため
      // 美しいフォールバック表示を提供
      this.debug('Instagram画像取得を試行:', postId);
      
      // 一定時間後にフォールバック表示を確実に行う
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return null; // フォールバック表示を行う
      
    } catch (error) {
      this.warn('Instagram画像取得失敗:', error);
      return null;
    }
  }

  /**
   * 画像読み込み失敗時のフォールバック表示
   * @param {HTMLElement} placeholder - プレースホルダー要素
   * @param {string} postId - 投稿ID
   */
  showImageFallback(placeholder, postId) {
    placeholder.innerHTML = `
      <div class="image-fallback">
        <div class="instagram-icon">
          <i class="fab fa-instagram"></i>
        </div>
        <div class="fallback-text">
          <p>投稿プレビュー</p>
          <span class="post-id">${postId}</span>
        </div>
      </div>
    `;
    placeholder.classList.add('loaded', 'fallback');
  }

  /**
   * 埋め込みエラー表示
   * @param {HTMLElement} container - コンテナ要素
   * @param {string} url - Instagram投稿URL
   */
  showEmbedError(container, url) {
    container.innerHTML = `
      <div class="instagram-embed-error">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="error-content">
          <p>Instagram投稿の読み込みに失敗しました</p>
          <a href="${url}" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-instagram"></i>
            Instagram で見る
          </a>
        </div>
      </div>
    `;
  }

  /**
   * 個別Instagram投稿アイテムをレンダリング（埋め込み対応）
   * @param {Object} post - 投稿データ
   * @returns {string} HTML文字列
   */
  renderInstagramPostItem(post) {
    const createdDate = new Date(post.createdAt).toLocaleDateString('ja-JP');
    
    // Instagram埋め込みコードをそのまま表示
    const embedHtml = this.generateInstagramEmbedFromCode(post.embedCode);
    
    return `
      <div class="instagram-post-card" data-post-id="${post.id}">
        <!-- Instagram投稿埋め込み -->
        <div class="instagram-embed-container">
          ${embedHtml}
        </div>
        
        <!-- 投稿情報 -->
        <div class="post-info">
          <div class="post-meta">
            <span class="post-date">
              <i class="fas fa-calendar-alt"></i>
              ${createdDate}
            </span>
            <span class="status-badge ${post.status === 'active' ? 'active' : 'inactive'}">
              <i class="fas fa-${post.status === 'active' ? 'eye' : 'eye-slash'}"></i>
              ${post.status === 'active' ? '表示中' : '非表示'}
            </span>
            ${post.featured ? '<span class="featured-badge"><i class="fas fa-star"></i> 注目投稿</span>' : ''}
          </div>
          
          <!-- アクションボタン -->
          <div class="post-actions">
            <button class="btn btn-sm btn-outline-primary" 
                    data-action="edit-instagram-post" 
                    data-id="${post.id}"
                    title="投稿を編集">
              <i class="fas fa-edit"></i>
              編集
            </button>
            
            <button class="btn btn-sm ${post.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'}" 
                    data-action="toggle-instagram-status" 
                    data-id="${post.id}"
                    title="${post.status === 'active' ? '非表示にする' : '表示する'}">
              <i class="fas fa-${post.status === 'active' ? 'eye-slash' : 'eye'}"></i>
              ${post.status === 'active' ? '非表示' : '表示'}
            </button>
            
            <button class="btn btn-sm ${post.featured ? 'btn-warning' : 'btn-outline-warning'}" 
                    data-action="toggle-instagram-featured" 
                    data-id="${post.id}"
                    title="${post.featured ? '注目投稿を解除' : '注目投稿に設定'}">
              <i class="fas fa-star"></i>
              ${post.featured ? '注目解除' : '注目設定'}
            </button>
            
            <button class="btn btn-sm btn-outline-danger" 
                    data-action="delete-instagram-post" 
                    data-id="${post.id}"
                    title="投稿を削除">
              <i class="fas fa-trash"></i>
              削除
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 埋め込みコードから直接Instagram埋め込みを生成（シンプル版）
   * @param {string} embedCode - Instagram埋め込みコード
   * @returns {string} 埋め込みHTML
   */
  generateInstagramEmbedFromCode(embedCode) {
    if (!embedCode) {
      return this.generateInstagramFallback();
    }
    
    // 埋め込みコードをそのまま使用
    return `
      <div class="instagram-embed-wrapper">
        ${embedCode}
      </div>
    `;
  }



  /**
   * Instagramフォールバック表示を生成（シンプル版）
   * @returns {string} フォールバックHTML
   */
  generateInstagramFallback() {
    return `
      <div class="instagram-fallback">
        <div class="fallback-icon">
          <i class="fab fa-instagram"></i>
        </div>
        <div class="fallback-content">
          <p>Instagram投稿</p>
          <span>埋め込みコードが無効です</span>
        </div>
      </div>
    `;
  }

  /**
   * コンパクトなInstagram埋め込みを生成
   * @param {string} url - Instagram投稿URL
   * @returns {string} コンパクト埋め込みHTML
   */
  generateCompactInstagramEmbed(url) {
    // Instagram投稿IDを抽出
    const postId = this.extractInstagramPostId(url);
    
    return `
      <div class="instagram-compact-embed" data-post-url="${url}">
        <div class="instagram-loading">
          <div class="loading-spinner">
            <i class="fab fa-instagram"></i>
          </div>
          <p>Instagram投稿を読み込み中...</p>
        </div>
      </div>
    `;
  }



  /**
   * Instagram投稿IDを抽出（URL直接）
   * @param {string} url - Instagram投稿URL
   * @returns {string|null} 投稿ID
   */
  extractInstagramPostId(url) {
    try {
      const match = url.match(/\/p\/([^\/]+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Instagram投稿ID抽出エラー:', error);
      return null;
    }
  }

  /**
   * Instagram設定を読み込み
   */
  loadInstagramSettings() {
    try {
      // 表示件数選択肢を動的に生成
      this.populateDisplayOptions();
      
      const settingsData = localStorage.getItem(CONFIG.storage.keys.instagramSettings);
      const settings = settingsData ? JSON.parse(settingsData) : {};
      
      // DOM要素の存在確認
      const maxPostsDisplayElement = document.getElementById('max-posts-display');
      const openNewTabElement = document.getElementById('open-new-tab');
      
      if (maxPostsDisplayElement) {
        maxPostsDisplayElement.value = settings.maxPostsDisplay || CONFIG.instagram.posts.defaultDisplayPosts;
      } else {
        this.warn('max-posts-display要素が見つかりません');
      }
      
      if (openNewTabElement) {
        openNewTabElement.checked = settings.openNewTab !== false;
      } else {
        this.warn('open-new-tab要素が見つかりません');
      }
      
      this.updateInstagramStats();
    } catch (error) {
      this.error('Instagram設定読み込みエラー:', error);
    }
  }

  /**
   * 表示件数選択肢を動的に生成
   */
  populateDisplayOptions() {
    try {
      const selectElement = document.getElementById('max-posts-display');
      if (!selectElement) {
        this.warn('max-posts-display セレクト要素が見つかりません');
        return;
      }
      
      selectElement.innerHTML = '';
      
      CONFIG.instagram.posts.displayOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = `${option}件`;
        
        if (option === CONFIG.instagram.posts.defaultDisplayPosts) {
          optionElement.selected = true;
        }
        
        selectElement.appendChild(optionElement);
      });
      
      this.debug('✅ 表示件数選択肢を生成');
    } catch (error) {
      this.error('表示件数選択肢生成エラー:', error);
    }
  }

  /**
   * Instagram統計を更新
   */
  updateInstagramStats() {
    try {
      if (!this.instagramDataService) {
        this.warn('InstagramDataServiceが初期化されていません');
        return;
      }
      
      const stats = this.instagramDataService.getStats();
      const posts = this.instagramDataService.getAllPosts();
      
      const activePosts = posts.filter(p => p.status === 'active').length;
      const inactivePosts = posts.filter(p => p.status === 'inactive').length;
      const featuredPosts = posts.filter(p => p.featured).length;
      
      // DOM要素の存在確認してから更新
      const totalPostsElement = document.getElementById('total-posts');
      const activePostsElement = document.getElementById('active-posts');
      const inactivePostsElement = document.getElementById('inactive-posts');
      const featuredPostsElement = document.getElementById('featured-posts');
      const lastUpdatedElement = document.getElementById('last-updated');
      
      // Instagram統計タブでのみ該当要素が存在するため、現在のタブを確認
      const isInstagramSettingsTab = document.querySelector('#instagram-settings-tab.active');
      
      if (totalPostsElement) {
        totalPostsElement.textContent = stats.total;
      } else if (isInstagramSettingsTab) {
        this.warn('total-posts要素が見つかりません（Instagram設定タブ）');
      }
      
      if (activePostsElement) {
        activePostsElement.textContent = activePosts;
      } else if (isInstagramSettingsTab) {
        this.warn('active-posts要素が見つかりません（Instagram設定タブ）');
      }
      
      if (inactivePostsElement) {
        inactivePostsElement.textContent = inactivePosts;
      } else if (isInstagramSettingsTab) {
        this.warn('inactive-posts要素が見つかりません（Instagram設定タブ）');
      }
      
      if (featuredPostsElement) {
        featuredPostsElement.textContent = featuredPosts;
      } else if (isInstagramSettingsTab) {
        this.warn('featured-posts要素が見つかりません（Instagram設定タブ）');
      }
      
      // last-updated要素はレッスン状況タブのものなので、Instagram管理では更新しない
      if (lastUpdatedElement) {
        const lastUpdated = posts.length > 0 
          ? new Date(Math.max(...posts.map(p => new Date(p.updatedAt || p.createdAt)))).toLocaleDateString('ja-JP')
          : '-';
        lastUpdatedElement.textContent = lastUpdated;
      }
      
      this.debug('✅ Instagram統計更新完了');
    } catch (error) {
      this.error('Instagram統計更新エラー:', error);
    }
  }

  /**
   * Instagram埋め込みコードの妥当性チェック
   * @param {string} embedCode - チェックする埋め込みコード
   * @returns {boolean} 妥当かどうか
   */
  validateInstagramEmbed(embedCode) {
    if (!embedCode || embedCode.length > CONFIG.instagram.validation.maxEmbedLength) {
      return false;
    }
    
    // 基本パターンチェック
    if (!CONFIG.instagram.validation.embedPattern.test(embedCode)) {
      return false;
    }
    
    // 必須要素チェック
    const requiredElements = CONFIG.instagram.validation.requiredElements;
    for (const element of requiredElements) {
      if (!embedCode.includes(element)) {
        return false;
      }
    }
    
    return true;
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

  /**
   * Instagram設定をデフォルトに戻す
   */
  resetInstagramSettings() {
    try {
      const maxPostsSelect = document.getElementById('max-posts-display');
      const openNewTabCheckbox = document.getElementById('open-new-tab');
      
      if (maxPostsSelect) {
        maxPostsSelect.value = '6'; // デフォルト値
      }
      
      if (openNewTabCheckbox) {
        openNewTabCheckbox.checked = true; // デフォルト値
      }
      
      this._showFeedback('Instagram設定をデフォルトに戻しました', 'info');
      this.debug('Instagram設定をデフォルトに戻しました');
      
    } catch (error) {
      this.error('Instagram設定リセットエラー:', error);
      this._showFeedback('設定のリセットに失敗しました', 'error');
    }
  }

  /**
   * Instagram設定のプレビュー表示
   */
  testInstagramSettings() {
    try {
      const maxPosts = document.getElementById('max-posts-display')?.value || '6';
      const openNewTab = document.getElementById('open-new-tab')?.checked || false;
      
      const previewMessage = `
        <div class="settings-preview">
          <h4><i class="fas fa-eye"></i> 設定プレビュー</h4>
          <div class="preview-items">
            <div class="preview-item">
              <strong>最大表示件数:</strong> ${maxPosts}件
            </div>
            <div class="preview-item">
              <strong>リンク動作:</strong> ${openNewTab ? '新しいタブで開く' : '同じタブで開く'}
            </div>
          </div>
          <small class="preview-note">
            <i class="fas fa-info-circle"></i>
            これらの設定は保存後にフロントページに反映されます
          </small>
        </div>
      `;
      
      this._showModal('Instagram設定プレビュー', previewMessage);
      this.debug('Instagram設定プレビューを表示');
      
    } catch (error) {
      this.error('Instagram設定プレビューエラー:', error);
      this._showFeedback('プレビューの表示に失敗しました', 'error');
    }
  }

  /**
   * Instagram投稿リストのフィルタリング
   */
  filterInstagramList() {
    try {
      const filterSelect = document.getElementById('instagram-filter');
      if (!filterSelect) {
        this.warn('フィルタセレクトボックスが見つかりません');
        return;
      }

      if (!this.instagramDataService) {
        this.warn('InstagramDataServiceが初期化されていません');
        return;
      }

      const filterValue = filterSelect.value;
      const posts = this.instagramDataService.getAllPosts() || [];
      
      let filteredPosts = [];

      switch (filterValue) {
        case 'all':
          filteredPosts = posts;
          break;
        case 'active':
          filteredPosts = posts.filter(post => post.status === 'active');
          break;
        case 'inactive':
          filteredPosts = posts.filter(post => post.status === 'inactive');
          break;
        case 'featured':
          filteredPosts = posts.filter(post => post.featured);
          break;
        default:
          filteredPosts = posts;
      }

      this.debug(`Instagram投稿フィルタリング: ${filterValue} (${filteredPosts.length}件)`);
      
      // フィルタリング結果を表示
      this.renderInstagramPosts(filteredPosts);
      
      // フィルタ状態をローカルストレージに保存
      try {
        localStorage.setItem('rbs_instagram_filter', filterValue);
      } catch (storageError) {
        this.warn('フィルタ状態の保存に失敗:', storageError);
      }

    } catch (error) {
      this.error('Instagram投稿フィルタリングエラー:', error);
      this.uiManagerService?.showNotification('error', 'フィルタリングに失敗しました');
    }
  }

  /**
   * アクション処理のデバッグ機能（UX改善版）
   * コンソールでボタンイベントの処理状況を確認
   */
  debugActionHandling() {
    console.log('🔍 [DEBUG] 記事一覧アクションボタンのデバッグ情報:');
    
    // 現在のページのアクションボタンを確認
    const actionButtons = document.querySelectorAll('.news-action-btn');
    console.log(`📊 見つかったアクションボタン数: ${actionButtons.length}`);
    
    if (actionButtons.length === 0) {
      console.warn('⚠️ アクションボタンが見つかりません。記事一覧を表示してからお試しください。');
      return;
    }
    
    actionButtons.forEach((button, index) => {
      console.log(`🔘 ボタン ${index + 1}:`, {
        className: button.className,
        dataAction: button.getAttribute('data-action'),
        dataId: button.getAttribute('data-id'),
        innerHTML: button.innerHTML.replace(/\s+/g, ' ').trim()
      });
    });
    
    // ActionManagerの初期化状態を確認
    if (this.actionManager) {
      console.log('✅ ActionManager初期化済み:', this.actionManager.initialized);
      console.log('📝 登録済みアクション数:', Object.keys(this.actionManager.actions || {}).length);
      
      const articleActions = ['edit-article', 'delete-article'];
      articleActions.forEach(action => {
        const isRegistered = this.actionManager.actions && this.actionManager.actions[action];
        console.log(`${isRegistered ? '✅' : '❌'} ${action}: ${isRegistered ? '登録済み' : '未登録'}`);
      });
    } else {
      console.error('❌ ActionManagerが見つかりません');
      return;
    }
    
    // 記事データの確認
    if (this.articleDataService && this.articleDataService.initialized) {
      const articles = this.articleDataService.loadArticles();
      console.log(`📚 利用可能な記事数: ${articles.length}`);
      if (articles.length > 0) {
        console.log('📝 記事サンプル:', articles.slice(0, 3).map(a => ({ id: a.id, title: a.title })));
      }
    } else {
      console.error('❌ ArticleDataServiceが初期化されていません');
    }
    
    console.log('✅ [INFO] プレビューボタンは削除されました。編集・削除ボタンのみが表示されます。');
  }
  
  /**
   * プレビュー機能のクイックテスト
   */
  testPreview() {
    if (!this.articleDataService || !this.articleDataService.initialized) {
      console.error('❌ ArticleDataServiceが初期化されていません');
      return;
    }
    
    const articles = this.articleDataService.loadArticles();
    if (articles.length === 0) {
      console.warn('⚠️ テスト用の記事がありません');
      return;
    }
    
    const testArticle = articles[0];
    console.log('🧪 プレビューテスト開始:', testArticle.title);
    this.previewArticleById(testArticle.id);
  }
}

// サービスインスタンスのエクスポート
export const adminActionService = new AdminActionService();