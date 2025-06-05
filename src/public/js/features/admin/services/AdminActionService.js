/**
 * 管理画面アクションサービス
 * ボタンクリックやフォーム送信などのユーザーアクションを処理
 * @version 3.0.0 - 統合アクション管理システム
 */

import { actionManager } from '../../../core/ActionManager.js';
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
      'reset-local-storage', 'show-debug-info', 'show-news-debug', 'close-modal',
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
    console.error(`[${this.componentName}] ❌`, message, ...args);
  }

  warn(message, ...args) {
    console.warn(`[${this.componentName}] ⚠️`, message, ...args);
  }

  info(message, ...args) {
    console.info(`[${this.componentName}] ℹ️`, message, ...args);
  }

  debug(message, ...args) {
    console.debug(`[${this.componentName}] 🐛`, message, ...args);
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
      
      // AuthManagerの初期化
      if (!this.authManager) {
        const { authManager } = await import('../../auth/AuthManager.js');
        this.authManager = authManager;
      }

      // AuthManagerが初期化されていない場合は初期化
      if (!this.authManager.initialized) {
        this.authManager.init();
      }

      // サービス依存関係を初期化
      await this.initializeServices();
      
      // UI設定
      await this.setupAdminUI();
      
      // AuthManagerはコールバック機能なし（シンプルな同期API）
      // セッション情報の定期更新を開始
      this.startSessionInfoUpdates();
      this.log('AuthManager初期化完了 - セッション監視は定期更新モード');
      
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
    
    try {
      // サービス依存関係の取得
      const articleModule = await import('./ArticleDataService.js');
      this.articleDataService = articleModule.getArticleDataService ? 
        articleModule.getArticleDataService() : 
        articleModule.articleDataService;
      
      const lessonModule = await import('../../../shared/services/LessonStatusStorageService.js');
      this.lessonStatusService = lessonModule.getLessonStatusStorageService ? 
        lessonModule.getLessonStatusStorageService() : 
        lessonModule.lessonStatusStorageService;
       
      // InstagramDataServiceのインポートと初期化
      const instagramModule = await import('./InstagramDataService.js');
      this.instagramDataService = instagramModule.instagramDataService;
      
      // UIManagerServiceのインポートと初期化
      this.uiManagerService = uiManagerService;
      
      // NewsFormManagerのインポートと初期化
      const newsFormModule = await import('../components/NewsFormManager.js');
      this.newsFormManager = newsFormModule.newsFormManager;
      
      // サービスの初期化確認
      if (this.articleDataService && !this.articleDataService.initialized) {
        await this.articleDataService.init();
      }
       
      if (this.lessonStatusService && !this.lessonStatusService.initialized) {
        await this.lessonStatusService.init();
      }
      
      if (this.instagramDataService && !this.instagramDataService.initialized) {
        this.instagramDataService.init();
      }
      
      if (this.uiManagerService && !this.uiManagerService.initialized) {
        this.uiManagerService.init();
      }
      
      if (this.newsFormManager && !this.newsFormManager.initialized) {
        this.newsFormManager.init();
      }
      
      this.log('全サービス初期化完了');
      
    } catch (error) {
      console.error('❌ サービス初期化エラー:', error);
      // エラーがあっても継続する
    }
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
    console.log(`${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'} ${message}`);
    
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
      // 認証関連はAuthManagerで処理（責任の分離）
      
      // タブ切り替え（優先度高） - HTMLのdata-action="switch-admin-tab"に対応
      'switch-admin-tab': async (element, params) => {
        console.log('🎯 switch-admin-tabアクション実行:', { element, params });
        
        const tabName = params?.tab || element?.dataset?.tab;
        console.log('🔍 取得したタブ名:', tabName);
        
        if (!tabName) {
          console.error('❌ タブ名が取得できません:', { params, dataset: element?.dataset });
          this._showFeedback('タブ名が指定されていません', 'error');
          return;
        }
        
        if (this._isValidTabName(tabName)) {
          console.log(`🚀 タブ切り替え実行: ${tabName}`);
          await this.switchAdminTab(tabName);
        } else {
          console.error(`❌ 無効なタブ名: ${tabName}`);
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
      
      // レッスン状況（モダンシステム）
      'loadLessonStatusModern': () => {
        if (this.lessonStatusModernService) {
          this.lessonStatusModernService.loadLessonStatusModern();
        } else {
          this.warn('LessonStatusModernService が初期化されていません');
        }
      },
      'updateLessonStatusModern': () => {
        if (this.lessonStatusModernService) {
          this.lessonStatusModernService.updateLessonStatusModern();
        } else {
          this.warn('LessonStatusModernService が初期化されていません');
        }
      },
      'copyPreviousDay': () => {
        if (this.lessonStatusModernService) {
          this.lessonStatusModernService.copyPreviousDay();
        } else {
          this.warn('LessonStatusModernService が初期化されていません');
        }
      },
      'previewLessonStatus': () => {
        if (this.lessonStatusModernService) {
          this.lessonStatusModernService.previewLessonStatus();
        } else {
          this.warn('LessonStatusModernService が初期化されていません');
        }
      },
      'saveDraftLessonStatus': () => {
        if (this.lessonStatusModernService) {
          this.lessonStatusModernService.saveDraftLessonStatus();
        } else {
          this.warn('LessonStatusModernService が初期化されていません');
        }
      },
      'resetLessonStatus': () => {
        if (this.lessonStatusModernService) {
          this.lessonStatusModernService.resetLessonStatus();
        } else {
          this.warn('LessonStatusModernService が初期化されていません');
        }
      },
      'copyToTemplate': () => {
        if (this.lessonStatusModernService) {
          this.lessonStatusModernService.copyToTemplate();
        } else {
          this.warn('LessonStatusModernService が初期化されていません');
        }
      },
      
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
      'show-debug-info': () => this.showDebugInfo(),
      'show-news-debug': () => this.showNewsDebug(),
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
      this.debug('🎯 管理画面UI設定開始');
      
      // アクション登録（コア機能）
      this._registerAdminActions();
      
      // UIイベント設定（コア機能）
      this.setupUIEvents();
      
      // 初期タブをダッシュボードに設定
      await this.forceTabSwitch('dashboard');

      // 基本機能の初期化を並行実行（パフォーマンス向上）
      await Promise.allSettled([
        this.initializeNewsManagement(),
        this.initializeLessonStatusModern(),
        this.loadInitialData()
      ]);

      // 統計の更新
      this.updateDashboardStats();
      
      this.debug('🎯 管理画面UI設定完了');
    } catch (error) {
      this.error('管理画面UI設定エラー:', error);
      throw error; // 重要なエラーは上位に伝播
    }
  }

  /**
   * レッスン状況モダンサービス初期化
   * @private
   */
  async initializeLessonStatusModern() {
    try {
      this.debug('📅 レッスン状況サービス初期化開始');
      
      // シンプルな初期化処理 - モダンサービスは後で追加する場合に備えて準備
      this.debug('📅 レッスン状況サービス初期化完了（基本機能）');
      
    } catch (error) {
      this.warn('レッスン状況サービス初期化で軽微なエラー:', error.message);
      // 管理画面の基本機能に影響しないよう、エラーを無視して続行
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
      this.debug('💾 初期データ読み込み開始');
      
      // レッスン状況の初期読み込み（エラーが起きても続行）
      this.loadLessonStatus().catch(error => {
        this.warn('レッスン状況読み込みエラー:', error.message);
      });
      
      this.debug('💾 初期データ読み込み完了');
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
      console.error(`❌ 無効なタブ名: ${tabName}`);
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
        this._showFeedback(`タブセクション "${tabName}" が見つかりません`, 'error');
        return;
      }
      
      if (!newActiveNavItem) {
        console.error(`❌ ナビゲーションアイテムが見つかりません: [data-tab="${tabName}"]`);
        this._showFeedback(`ナビゲーションアイテム "${tabName}" が見つかりません`, 'error');
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
      const tabDisplayName = this._getTabDisplayName(tabName);
      console.log(`✅ ${tabDisplayName}に切り替え完了`);
      this._showFeedback(`${tabDisplayName}に切り替えました`, 'info', 2000);
      
    } catch (error) {
      console.error(`❌ タブ切り替えエラー (${tabName}):`, error);
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
          this.initializeWizard();
          await this.loadLessonStatus();
          break;
          
        case 'settings':
          // 設定タブの初期化（必要に応じて）
          break;
          
        default:
          console.warn(`未知のタブ: ${tabName}`);
      }
      
      console.log(`✅ タブコンテンツ初期化完了: ${tabName}`);
      
    } catch (error) {
      console.error(`❌ タブコンテンツ初期化エラー [${tabName}]:`, error);
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

      this.debug(`✅ ニュースタブ切り替え完了: ${tabName}`);
      
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
      this.debug('📖 記事作成ガイドを表示');
      
      const guideContent = `
        <div class="writing-guide">
          <h3><i class="fas fa-edit"></i> 記事作成ガイド</h3>
          
          <div class="guide-section">
            <h4>📝 基本的な書き方</h4>
            <ul>
              <li><strong>タイトル:</strong> 簡潔で分かりやすく（30文字以内推奨）</li>
              <li><strong>概要:</strong> 記事の要点を1-2文で（100文字以内推奨）</li>
              <li><strong>本文:</strong> 読みやすい長さの段落に分けて記述</li>
            </ul>
          </div>
          
          <div class="guide-section">
            <h4>🎨 Markdown記法</h4>
            <div class="markdown-examples">
              <div class="example-item">
                <code>## 見出し</code> → <strong>大見出し</strong>
              </div>
              <div class="example-item">
                <code>**太字**</code> → <strong>太字</strong>
              </div>
              <div class="example-item">
                <code>- リスト項目</code> → <ul><li>リスト項目</li></ul>
              </div>
              <div class="example-item">
                <code>[リンクテキスト](URL)</code> → <a href="#">リンクテキスト</a>
              </div>
            </div>
          </div>
          
          <div class="guide-section">
            <h4>📊 カテゴリー選択</h4>
            <ul>
              <li><strong>お知らせ:</strong> 一般的な告知・連絡事項</li>
              <li><strong>体験会:</strong> 体験レッスンの案内</li>
              <li><strong>メディア:</strong> メディア掲載、取材記事</li>
              <li><strong>重要:</strong> 緊急性の高い重要な連絡</li>
            </ul>
          </div>
          
          <div class="guide-section">
            <h4>✅ 公開前チェックリスト</h4>
            <ul>
              <li>タイトルと内容が一致しているか</li>
              <li>誤字脱字がないか</li>
              <li>日付とカテゴリーが適切か</li>
              <li>プレビューで表示を確認したか</li>
            </ul>
          </div>
        </div>
      `;

      this._createModal('記事作成ガイド', guideContent, 'writing-guide-modal');
      
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
      const currentMode = localStorage.getItem('rbs_notification_mode') || 'off';
      const newMode = currentMode === 'on' ? 'off' : 'on';
      
      // 状態を保存
      localStorage.setItem('rbs_notification_mode', newMode);
      
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
      
      this.debug(`✅ 通知モード変更: ${newMode}`);
      
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
        notificationMode: localStorage.getItem('rbs_notification_mode') || 'off',
        lastSaved: new Date().toISOString()
      };
      
      // 設定を保存
      localStorage.setItem('rbs_admin_settings', JSON.stringify(settings));
      
      this._showFeedback('設定を保存しました', 'success');
      this.debug('✅ 設定保存完了:', settings);
      
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
    
    console.log('✅ レッスン状況ウィザードを初期化しました');
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
      
      console.log(`✅ ウィザードステップ ${step} に設定完了`);
      
    } catch (error) {
      console.error('❌ ウィザードステップ設定エラー:', error);
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
      
      console.log(`✅ ウィザードボタン状態更新: ステップ${currentStep}`, {
        'prevBtn-display': prevBtn.style.display,
        'nextBtn-display': nextBtn.style.display,
        'prevBtn-disabled': prevBtn.disabled,
        'nextBtn-disabled': nextBtn.disabled
      });
      
    } catch (error) {
      console.error('❌ ウィザードボタン状態更新エラー:', error);
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
        console.warn('⚠️ Instagram管理セクションが見つかりません');
        return;
      }
      
      // Instagram管理セクションがアクティブかどうか確認
      if (!instagramSection.classList.contains('active')) {
        console.warn('⚠️ Instagram管理セクションがアクティブではありません');
        return;
      }
      
      console.log('✅ Instagram管理セクションを確認しました');
      
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
    console.log('🔧 Instagramタブ設定開始');
    
    try {
      // タブボタンが存在することを確認
      const tabButtons = document.querySelectorAll('.sub-nav-item[data-action="switch-instagram-tab"]');
      console.log('📋 検出されたタブボタン数:', tabButtons.length);
      
      if (tabButtons.length === 0) {
        console.warn('⚠️ Instagramタブボタンが見つかりません');
        return;
      }
      
      // タブコンテンツが存在することを確認
      const tabContents = document.querySelectorAll('.instagram-tab-content');
      console.log('📄 検出されたタブコンテンツ数:', tabContents.length);
      
      if (tabContents.length === 0) {
        console.warn('⚠️ Instagramタブコンテンツが見つかりません');
        return;
      }
      
      // 各タブボタンの状態をチェック
      tabButtons.forEach((button, index) => {
        const tabName = button.dataset.tab;
        console.log(`🏷️ タブ${index + 1}: ${tabName}`);
        
        // data-tab属性が正しく設定されているかチェック
        if (!tabName) {
          console.warn(`⚠️ タブボタン${index + 1}にdata-tab属性がありません`, button);
        }
      });
      
      // 各タブコンテンツの状態をチェック
      tabContents.forEach((content, index) => {
        const contentId = content.id;
        console.log(`📖 コンテンツ${index + 1}: ${contentId}`);
        
        // IDが正しく設定されているかチェック
        if (!contentId || !contentId.includes('instagram-') || !contentId.includes('-tab')) {
          console.warn(`⚠️ タブコンテンツ${index + 1}のIDが不正です:`, contentId);
        }
      });
      
      // 必要なタブが揃っているかチェック
      const expectedTabs = ['posts', 'settings'];
      const availableTabs = Array.from(tabButtons).map(btn => btn.dataset.tab).filter(Boolean);
      
      expectedTabs.forEach(expectedTab => {
        if (!availableTabs.includes(expectedTab)) {
          console.warn(`⚠️ 必要なタブが見つかりません: ${expectedTab}`);
        }
      });
      
      console.log('✅ Instagramタブ設定完了');
      
    } catch (error) {
      console.error('❌ Instagramタブ設定エラー:', error);
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
      this._showFeedback('記事エディターをクリアしました');
      console.log('📝 記事エディターをクリア');

    } catch (error) {
      console.error('❌ 記事エディタークリアエラー:', error);
      this._showFeedback('エディターのクリアに失敗しました', 'error');
    }
  }

  /**
   * 記事プレビュー
   */
  async previewNews() {
    try {
      console.log('👁️ 記事プレビュー開始');
      
      // フォームデータを取得
      const formData = this._getNewsFormData();
      
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
      console.error('❌ 記事プレビューエラー:', error);
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
        
        console.log('💾 記事を保存:', result);
      } else {
        this._showFeedback(result.message || '保存に失敗しました', 'error');
      }

    } catch (error) {
      console.error('❌ 記事保存エラー:', error);
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
        this._showFeedback(result.message || '公開に失敗しました', 'error');
      }

    } catch (error) {
      console.error('❌ 記事公開エラー:', error);
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
      console.error('❌ ArticleService テストエラー:', error);
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
      
      this._renderNewsList(filterValue);
      
      // フィルター状態をビジュアルに反映
      const filterSelect = document.getElementById('news-filter');
      if (filterSelect && filterSelect.value !== filterValue) {
        filterSelect.value = filterValue;
      }
      
    } catch (error) {
      console.error('❌ ニュース一覧フィルタリングエラー:', error);
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
      console.log('✅ ニュース一覧更新完了');
      
    } catch (error) {
      console.error('❌ ニュース一覧更新エラー:', error);
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
        console.warn('⚠️ recent-articles コンテナが見つかりません');
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
      console.log(`✅ 最近の記事更新完了 - ${recentArticles.length}件表示`);
      
    } catch (error) {
      console.error('❌ 最近の記事更新エラー:', error);
      
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
      // モダンサービス優先で実行
      if (this.lessonStatusModernService && typeof this.lessonStatusModernService.loadLessonStatusModern === 'function') {
        await this.lessonStatusModernService.loadLessonStatusModern();
        this.log('✅ モダンサービスでレッスン状況を読み込みました');
        return;
      }
      
      // フォールバック: レガシーシステム
      const targetDate = document.getElementById('lesson-date')?.value || this._getTodayDateString();
      
      // レガシーシステムによる読み込み（モダンサービス未利用時のフォールバック）
      const lessonStatusService = getLessonStatusStorageService();
      const data = lessonStatusService.getStatusByDate(targetDate);
      
      if (data) {
        // UIに反映（適切なメソッドが存在する場合）
        // UIに反映
        this._populateLessonStatusForm(data);
        
        // フォールバック通知（モダンサービスが無い場合のみ）
        console.log(`✅ ${targetDate} のレッスン状況を読み込みました（レガシーモード）`);
      } else {
        this.warn(`${targetDate} のレッスン状況が見つかりません`);
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
    const globalStatus = globalStatusRadio ? this._mapJapaneseToStatusKey(globalStatusRadio.value) : 'scheduled';
    
    // ベーシックコース
    const basicStatusRadio = document.querySelector('input[name="basic-lesson"]:checked');
    const basicStatus = basicStatusRadio ? this._mapJapaneseToStatusKey(basicStatusRadio.value) : 'scheduled';
    const basicMessageField = document.getElementById('basic-lesson-note');
    
    // アドバンスコース
    const advanceStatusRadio = document.querySelector('input[name="advance-lesson"]:checked');
    const advanceStatus = advanceStatusRadio ? this._mapJapaneseToStatusKey(advanceStatusRadio.value) : 'scheduled';
    const advanceMessageField = document.getElementById('advance-lesson-note');
    
    return {
      date: dateField?.value || this._getTodayDateString(),
      globalStatus: globalStatus,
      globalMessage: globalMessageField?.value || '',
      courses: {
        basic: {
          name: 'ベーシックコース（年長〜小3）',
          time: '17:00-17:50',
          status: basicStatus,
          message: basicMessageField?.value || ''
        },
        advance: {
          name: 'アドバンスコース（小4〜小6）',
          time: '18:00-18:50',
          status: advanceStatus,
          message: advanceMessageField?.value || ''
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
      console.error('❌ レッスン状況更新エラー:', error);
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
      console.log('❌ ユーザーによってキャンセルされました');
      return;
    }
    
    try {
      // 統合ストレージサービスのクリア
      if (this.articleDataService?.storageService) {
        await this.articleDataService.storageService.clearAllData();
        console.log('✅ 記事データクリア完了');
      }
      
      // レッスン状況データのクリア
      if (this.lessonStatusService) {
        this.lessonStatusService.clearAllData();
        console.log('✅ レッスン状況データクリア完了');
      }
      
      // Instagram関連データのクリア
      const instagramKeys = [
        `${CONFIG.storage.prefix}instagram_posts`,
        `${CONFIG.storage.prefix}instagram_settings`,
        'rbs_instagram_posts',  // 旧形式
        'rbs_instagram_settings'  // 旧形式
      ];
      
      instagramKeys.forEach(key => {
        const had = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
        if (had) {
          console.log(`✅ Instagram データクリア: ${key}`);
        }
      });
      
      // 管理画面設定のクリア
      Object.values(this.storageKeys).forEach(key => {
        const had = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
        if (had) {
          console.log(`✅ 管理画面設定クリア: ${key}`);
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
          console.log(`✅ 認証データクリア: ${key}`);
        }
      });
      
      console.log('✅ 全データクリア完了');
      this.success('全てのデータを削除しました');
      
      // データ更新を全体に通知
      this.refreshRecentArticles();
      this.updateDashboardStats();
      
      // ダッシュボードタブに強制切り替え
      await this.forceTabSwitch('dashboard');
      
    } catch (error) {
      console.error('❌ 全データクリアエラー:', error);
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
      console.error('❌ サイト接続テストエラー:', error);
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
      console.error('❌ LocalStorageリセットエラー:', error);
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
      
      this._createDebugModal('システムデバッグ情報', debugContent);
      
    } catch (error) {
      console.error('❌ デバッグ情報表示エラー:', error);
      this._showFeedback('デバッグ情報の表示に失敗しました', 'error');
    }
  }

  /**
   * デバッグモーダルを作成
   * @private
   * @param {string} title - モーダルのタイトル
   * @param {string} content - モーダルの内容
   */
  _createDebugModal(title, content) {
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
  _generateConnectionTestResults(testResults) {
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
      this._showFeedback(`LP表示用記事: ${articles.length}件`);
      
    } catch (error) {
      console.error('❌ LP ニュースデバッグエラー:', error);
      this._showFeedback('ニュースデバッグに失敗しました', 'error');
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
      console.error('❌ 最近の記事レンダリングエラー:', error);
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
        console.error('❌ ArticleDataServiceが初期化されていません');
        this._showFeedback('記事サービスが初期化されていません。ページを再読み込みしてください。', 'error');
        return;
      }
      
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        this._showFeedback('記事が見つかりません', 'error');
        console.error('❌ 記事が見つかりません:', articleId);
        
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
        console.log('✅ タブ切り替え完了、エディタータブに切り替え中...');
        
        // エディタータブに切り替え（タブ切り替え完了後に実行）
        setTimeout(() => {
          this.switchNewsTab('editor');
          
          // フォームにデータを読み込み（DOM要素が確実に存在するよう少し遅延）
          setTimeout(() => {
            this._loadArticleToEditor(article, articleId);
          }, 150);
        }, 100);
        
      }).catch(error => {
        console.error('❌ タブ切り替えエラー:', error);
        this._showFeedback('記事管理タブへの切り替えに失敗しました', 'error');
      });
      
    } catch (error) {
      console.error('❌ 記事編集エラー:', error);
      this._showFeedback('記事の編集に失敗しました: ' + error.message, 'error');
    }
  }

  /**
   * 記事データをエディターに読み込み
   * @private
   * @param {Object} article - 記事データ
   * @param {string} articleId - 記事ID
   */
  _loadArticleToEditor(article, articleId) {
    try {
      console.log('📝 記事データをエディターに読み込み中:', article.title);
      
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
        elements.content.value = content || article.content || '';
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
        elements.title.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      this._showFeedback(`記事「${article.title}」をエディターに読み込みました`);
      console.log('✅ 記事データの読み込み完了');
      
    } catch (error) {
      console.error('❌ 記事データ読み込みエラー:', error);
      this._showFeedback('記事データの読み込みに失敗しました', 'error');
    }
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
        console.error('❌ ArticleDataServiceが初期化されていません');
        this._showFeedback('記事サービスが初期化されていません。ページを再読み込みしてください。', 'error');
        return;
      }
      
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        this._showFeedback('記事が見つかりません', 'error');
        console.error('❌ 記事が見つかりません:', articleId);
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
      console.error('❌ 記事プレビューエラー:', error);
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
        console.error('❌ ArticleDataServiceが初期化されていません');
        this._showFeedback('記事サービスが初期化されていません。ページを再読み込みしてください。', 'error');
        return;
      }
      
      const originalArticle = this.articleDataService.getArticleById(articleId);
      if (!originalArticle) {
        this._showFeedback('元の記事が見つかりません', 'error');
        console.error('❌ 記事が見つかりません:', articleId);
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
        console.log('✅ 記事複製完了:', result.id);
      } else {
        this._showFeedback(result.message || '複製に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('❌ 記事複製エラー:', error);
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
      console.error('❌ ダッシュボード統計更新エラー:', error);
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
      console.error('❌ 記事削除エラー:', error);
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
                  <p class="preview-note">※ プレビューでは固定のサンプル記事を表示しています</p>
                </section>

                <!-- ナビゲーション -->
                <nav class="article-nav">
                  <button class="nav-btn back-btn" onclick="return false;">
                    <i class="fas fa-arrow-left"></i>
                    <span>ニュース一覧に戻る</span>
                  </button>
                  <button class="nav-btn top-btn" onclick="document.getElementById('preview-viewport').scrollTo({top: 0, behavior: 'smooth'})">
                    <i class="fas fa-arrow-up"></i>
                    <span>記事の先頭へ</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>
          
          <!-- 改善されたフッター -->
          <div class="modal-footer news-detail-modal-footer">
            <div class="footer-left">
              <div class="view-controls">
                <button class="view-btn active" data-view="desktop" title="デスクトップ表示">
                  <i class="fas fa-desktop"></i>
                  <span>デスクトップ</span>
                </button>
                <button class="view-btn" data-view="tablet" title="タブレット表示">
                  <i class="fas fa-tablet-alt"></i>
                  <span>タブレット</span>
                </button>
                <button class="view-btn" data-view="mobile" title="モバイル表示">
                  <i class="fas fa-mobile-alt"></i>
                  <span>モバイル</span>
                </button>
              </div>
            </div>
            <div class="footer-center">
              <div class="zoom-controls">
                <button class="zoom-btn" data-zoom="0.8" title="縮小表示">
                  <i class="fas fa-search-minus"></i>
                  <span>80%</span>
                </button>
                <button class="zoom-btn active" data-zoom="1" title="通常表示">
                  <i class="fas fa-search"></i>
                  <span>100%</span>
                </button>
                <button class="zoom-btn" data-zoom="1.2" title="拡大表示">
                  <i class="fas fa-search-plus"></i>
                  <span>120%</span>
                </button>
              </div>
            </div>
            <div class="footer-right">
              <button class="action-btn secondary" onclick="this.closest('.modal').remove()">
                <i class="fas fa-times"></i>
                <span>閉じる</span>
              </button>
              <button class="action-btn primary" onclick="window.open('news-detail.html?preview=true', '_blank')">
                <i class="fas fa-external-link-alt"></i>
                <span>新しいタブで開く</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // モーダルをDOMに追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // モーダルを表示
    const modal = document.getElementById('news-preview-modal');
    modal.style.display = 'flex';
    
    // 改善されたスタイルを適用
    this._injectEnhancedPreviewStyles();
    
    // モーダル機能を初期化
    this._initializeEnhancedPreviewModal(modal);
    
    // ESCキーでモーダルを閉じる
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    console.log('✨ 改善された記事プレビューを表示');
  }

  /**
   * 改善されたプレビュースタイルを動的に注入
   * @private
   */
  _injectEnhancedPreviewStyles() {
    // 既存のプレビュースタイルがあれば削除
    const existingStyle = document.getElementById('news-detail-preview-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // 美しいプレビューモーダル用のスタイルを注入
    const styleElement = document.createElement('style');
    styleElement.id = 'news-detail-preview-styles';
    styleElement.textContent = `
      /* ==========================================================================
         ✨ 改善された記事プレビューモーダルスタイル
         ========================================================================== */

      /* モーダル基本構造 */
      .news-detail-preview-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        animation: modalFadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6));
        cursor: pointer;
      }

      .news-detail-preview-content {
        position: relative;
        background: white;
        border-radius: 20px;
        box-shadow: 
          0 25px 50px rgba(0, 0, 0, 0.25),
          0 10px 30px rgba(0, 0, 0, 0.15);
        width: 95%;
        max-width: 1400px;
        height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: modalSlideUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* ヘッダースタイル */
      .news-detail-modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
      }

      .news-detail-modal-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 200%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        animation: headerShine 3s infinite;
      }

      .modal-title-section {
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 1;
      }

      .title-icon {
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        backdrop-filter: blur(10px);
      }

      .title-content h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .preview-note {
        font-size: 0.875rem;
        opacity: 0.9;
        margin: 4px 0 0 0;
        font-weight: 400;
        line-height: 1.4;
      }

      .modal-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1;
      }

      .modal-action-btn {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 10px 14px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 8px;
        backdrop-filter: blur(10px);
      }

      .modal-action-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      .modal-close {
        background: rgba(239, 68, 68, 0.2) !important;
        border-color: rgba(239, 68, 68, 0.4) !important;
      }

      .modal-close:hover {
        background: rgba(239, 68, 68, 0.3) !important;
      }

      /* プレビューボディ */
      .news-detail-preview-body {
        flex: 1;
        overflow: hidden;
        background: #f8fafc;
        position: relative;
      }

      .preview-viewport {
        height: 100%;
        overflow: auto;
        background: white;
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        scroll-behavior: smooth;
      }

      .preview-viewport::-webkit-scrollbar {
        width: 8px;
      }

      .preview-viewport::-webkit-scrollbar-track {
        background: #f1f5f9;
      }

      .preview-viewport::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 4px;
      }

      .preview-viewport::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #5a67d8, #6b46c1);
      }

      .preview-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 40px;
        min-height: 100%;
        line-height: 1.7;
      }

      /* パンくずナビ */
      .breadcrumb-nav {
        background: linear-gradient(135deg, #f8fafc, #e2e8f0);
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 30px;
        border: 1px solid #e2e8f0;
      }

      .breadcrumb-items {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .breadcrumb-item {
        color: #667eea;
        text-decoration: none;
        transition: color 0.3s ease;
        padding: 4px 8px;
        border-radius: 6px;
      }

      .breadcrumb-item:hover {
        color: #5a67d8;
        background: rgba(102, 126, 234, 0.1);
      }

      .breadcrumb-separator {
        color: #94a3b8;
        font-size: 0.75rem;
      }

      .breadcrumb-current {
        color: #475569;
        font-weight: 600;
      }

      /* 記事ヘッダー */
      .article-header {
        background: linear-gradient(135deg, #ffffff, #f8fafc);
        border-radius: 20px;
        padding: 40px;
        margin-bottom: 40px;
        box-shadow: 
          0 10px 40px rgba(0, 0, 0, 0.08),
          0 4px 20px rgba(0, 0, 0, 0.04);
        border: 1px solid #e2e8f0;
        position: relative;
        overflow: hidden;
      }

      .article-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c);
        background-size: 200% 100%;
        animation: gradientShift 4s ease-in-out infinite;
      }

      .article-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 16px;
      }

      .meta-left, .meta-right {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }

      .article-date, .article-category, .reading-time {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 600;
        color: white;
      }

      .article-date {
        background: linear-gradient(135deg, #667eea, #764ba2);
      }

      .article-category {
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 0.8rem;
      }

      .article-category.announcement {
        background: linear-gradient(135deg, #4a90e2, #357abd);
      }

      .article-category.event {
        background: linear-gradient(135deg, #50c8a3, #3da58a);
      }

      .article-category.media {
        background: linear-gradient(135deg, #9b59b6, #8e44ad);
      }

      .article-category.important {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
      }

      .reading-time {
        background: linear-gradient(135deg, #94a3b8, #64748b);
      }

      .article-title {
        font-size: clamp(1.75rem, 4vw, 2.5rem);
        font-weight: 800;
        color: #1e293b;
        line-height: 1.2;
        margin: 0 0 20px 0;
        letter-spacing: -0.025em;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .article-summary {
        background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 20px;
        border-left: 4px solid #667eea;
      }

      .summary-content {
        color: #475569;
        font-size: 1.125rem;
        line-height: 1.6;
        font-weight: 500;
        margin: 0;
      }

      .article-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: 1px solid #e2e8f0;
        background: white;
        color: #64748b;
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .action-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .action-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .share-btn {
        border-color: #f59e0b;
        color: #f59e0b;
      }

      .bookmark-btn {
        border-color: #8b5cf6;
        color: #8b5cf6;
      }

      .print-btn {
        border-color: #10b981;
        color: #10b981;
      }

      /* 記事コンテンツ */
      .article-content {
        background: white;
        border-radius: 16px;
        padding: 40px;
        margin-bottom: 40px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        border: 1px solid #f1f5f9;
        color: #374151;
        font-size: 1.1rem;
        line-height: 1.8;
      }

      .article-content h1, .article-content h2, .article-content h3,
      .article-content h4, .article-content h5, .article-content h6 {
        color: #1e293b;
        font-weight: 700;
        margin: 2em 0 1em 0;
        line-height: 1.3;
      }

      .article-content h2 {
        font-size: 1.5rem;
        padding-bottom: 0.5em;
        border-bottom: 2px solid #e2e8f0;
      }

      .article-content h3 {
        font-size: 1.25rem;
        color: #475569;
      }

      .article-content p {
        margin: 1.5em 0;
      }

      .article-content ul, .article-content ol {
        margin: 1.5em 0;
        padding-left: 1.5em;
      }

      .article-content li {
        margin: 0.5em 0;
      }

      .article-content blockquote {
        border-left: 4px solid #667eea;
        background: #f8fafc;
        padding: 1em 1.5em;
        margin: 2em 0;
        border-radius: 0 8px 8px 0;
        font-style: italic;
      }

      .article-content code {
        background: #f1f5f9;
        color: #e53e3e;
        padding: 0.2em 0.4em;
        border-radius: 4px;
        font-size: 0.9em;
      }

      .article-content pre {
        background: #1e293b;
        color: #f1f5f9;
        padding: 1.5em;
        border-radius: 8px;
        overflow-x: auto;
        margin: 2em 0;
      }

      /* シェアセクション */
      .share-section {
        background: white;
        border-radius: 16px;
        padding: 30px;
        margin-bottom: 40px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        border: 1px solid #f1f5f9;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.25rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 20px 0;
      }

      .share-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }

      .share-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.875rem;
      }

      .share-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .share-btn.twitter {
        background: linear-gradient(135deg, #1da1f2, #0d8bd9);
        color: white;
      }

      .share-btn.facebook {
        background: linear-gradient(135deg, #4267b2, #365899);
        color: white;
      }

      .share-btn.line {
        background: linear-gradient(135deg, #00c300, #00a000);
        color: white;
      }

      .share-btn.linkedin {
        background: linear-gradient(135deg, #0077b5, #005885);
        color: white;
      }

      /* 関連記事セクション */
      .related-articles {
        background: white;
        border-radius: 16px;
        padding: 30px;
        margin-bottom: 40px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        border: 1px solid #f1f5f9;
      }

      .related-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }

      .related-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .related-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      }

      .card-image {
        height: 150px;
        overflow: hidden;
        position: relative;
      }

      .placeholder-image {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        font-size: 2rem;
      }

      .card-content {
        padding: 20px;
      }

      .card-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .card-meta .date {
        color: #64748b;
        font-size: 0.875rem;
      }

      .card-meta .category {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        color: white;
        text-transform: uppercase;
      }

      .card-meta .category.announcement {
        background: #4a90e2;
      }

      .card-meta .category.event {
        background: #50c8a3;
      }

      .card-meta .category.media {
        background: #9b59b6;
      }

      .card-title {
        font-size: 1rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 12px 0;
        line-height: 1.4;
      }

      .card-excerpt {
        color: #64748b;
        font-size: 0.875rem;
        line-height: 1.5;
        margin: 0;
      }

      /* ナビゲーション */
      .article-nav {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .nav-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        color: #475569;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
      }

      .nav-btn:hover {
        border-color: #667eea;
        color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      /* フッタースタイル */
      .news-detail-modal-footer {
        background: linear-gradient(135deg, #f8fafc, #e2e8f0);
        padding: 20px 30px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }

      .footer-left, .footer-center, .footer-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .view-controls, .zoom-controls {
        display: flex;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
      }

      .view-btn, .zoom-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: none;
        background: transparent;
        color: #64748b;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        border-right: 1px solid #e2e8f0;
      }

      .view-btn:last-child, .zoom-btn:last-child {
        border-right: none;
      }

      .view-btn.active, .zoom-btn.active {
        background: #667eea;
        color: white;
      }

      .view-btn:hover:not(.active), .zoom-btn:hover:not(.active) {
        background: #f1f5f9;
        color: #475569;
      }

      .action-btn.primary {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .action-btn.secondary {
        background: white;
        color: #64748b;
        border: 1px solid #e2e8f0;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      /* レスポンシブ表示モード */
      .preview-viewport.mobile-view {
        max-width: 375px;
        margin: 0 auto;
        border-left: 3px solid #667eea;
        border-right: 3px solid #667eea;
        border-radius: 0 0 12px 12px;
      }

      .preview-viewport.tablet-view {
        max-width: 768px;
        margin: 0 auto;
        border-left: 3px solid #764ba2;
        border-right: 3px solid #764ba2;
        border-radius: 0 0 12px 12px;
      }

      /* プレビューノート */
      .preview-note {
        color: #94a3b8;
        font-size: 0.875rem;
        font-style: italic;
        text-align: center;
        margin: 0;
      }

      /* アニメーション */
      @keyframes modalFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes modalSlideUp {
        from {
          opacity: 0;
          transform: translateY(50px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes headerShine {
        0%, 100% {
          transform: translateX(-100%);
        }
        50% {
          transform: translateX(100%);
        }
      }

      @keyframes gradientShift {
        0%, 100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }

      /* レスポンシブデザイン */
      @media (max-width: 768px) {
        .news-detail-preview-content {
          width: 98%;
          height: 95vh;
          border-radius: 12px;
        }

        .preview-container {
          padding: 20px;
        }

        .article-header {
          padding: 24px;
        }

        .article-content {
          padding: 24px;
        }

        .article-meta {
          flex-direction: column;
          align-items: flex-start;
        }

        .news-detail-modal-footer {
          flex-direction: column;
          gap: 12px;
        }

        .footer-left, .footer-center, .footer-right {
          width: 100%;
          justify-content: center;
        }

        .related-grid {
          grid-template-columns: 1fr;
        }

        .article-nav {
          flex-direction: column;
        }

        .nav-btn {
          justify-content: center;
        }
      }

      @media (max-width: 480px) {
        .modal-controls {
          gap: 8px;
        }

        .modal-action-btn {
          padding: 8px;
        }

        .btn-label {
          display: none;
        }

        .article-title {
          font-size: 1.5rem;
        }

        .share-buttons {
          justify-content: center;
        }

        .share-btn span {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }

  /**
   * news-detail.cssのスタイルを動的に注入（旧メソッド）
   * @private
   */
  _injectNewsDetailStyles() {
    // 既存のプレビュースタイルがあれば削除
    const existingStyle = document.getElementById('news-detail-preview-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // news-detail.cssのスタイルをプレビュー用に調整して注入
    const styleElement = document.createElement('style');
    styleElement.id = 'news-detail-preview-styles';
    styleElement.textContent = `
      /* プレビューモーダル基本スタイル */
      .news-detail-preview-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      }
      
      .news-detail-preview-content {
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        width: 95%;
        max-width: 1200px;
        height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideInUp 0.4s ease;
      }
      
      .news-detail-modal-header {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 20px 30px;
        border-bottom: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      
      .modal-title-section h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .preview-note {
        font-size: 0.9rem;
        opacity: 0.9;
        margin: 4px 0 0 0;
        font-weight: 400;
      }
      
      .modal-controls {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .modal-action-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
      }
      
      .modal-action-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
      
      .news-detail-preview-body {
        flex: 1;
        overflow: hidden;
        padding: 0;
        background: #f8f9fa;
      }
      
      .preview-viewport {
        height: 100%;
        overflow: auto;
        background: white;
        transition: all 0.3s ease;
      }
      
      .preview-viewport.mobile-view {
        max-width: 375px;
        margin: 0 auto;
        border-left: 2px solid #ddd;
        border-right: 2px solid #ddd;
      }
      
      .preview-viewport.tablet-view {
        max-width: 768px;
        margin: 0 auto;
        border-left: 2px solid #ddd;
        border-right: 2px solid #ddd;
      }
      
      .preview-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px 40px;
        min-height: 100%;
        background: white;
      }
      
      /* news-detail.cssのスタイルを再現 */
      .preview-breadcrumb {
        background: white;
        padding: 15px 16px;
        border-radius: 10px;
        margin-bottom: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        border: 2px solid #e9ecef;
      }
      
      .preview-breadcrumb .breadcrumb-list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
        list-style: none;
        font-size: 12px;
        font-weight: 600;
        margin: 0;
        padding: 0;
      }
      
      .preview-breadcrumb .breadcrumb-list li {
        display: flex;
        align-items: center;
      }
      
      .preview-breadcrumb .breadcrumb-list a {
        color: #4a90e2;
        text-decoration: none;
        transition: color 0.3s ease;
        font-weight: 600;
        padding: 4px 2px;
      }
      
      .preview-breadcrumb .breadcrumb-list a:hover {
        color: #357abd;
        text-decoration: underline;
      }
      
      .preview-breadcrumb .breadcrumb-separator {
        color: #6c757d;
        margin: 0 8px;
        font-weight: 400;
      }
      
      .preview-article-header {
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        padding: 40px 30px;
        border-radius: 16px;
        margin-bottom: 30px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      }
      
      .preview-article-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #4a90e2, #50c8a3, #9b59b6, #e74c3c);
      }
      
      .preview-article-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      
      .preview-article-date {
        background: #4a90e2;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .preview-article-date::before {
        content: '📅';
        font-size: 12px;
      }
      
      .preview-article-category {
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 700;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .preview-article-category.announcement {
        background: #4a90e2;
      }
      
      .preview-article-category.event {
        background: #50c8a3;
      }
      
      .preview-article-category.media {
        background: #9b59b6;
      }
      
      .preview-article-category.important {
        background: #e74c3c;
      }
      
      .preview-article-title {
        font-size: 2rem;
        font-weight: 800;
        color: #2c3e50;
        line-height: 1.2;
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .preview-article-summary {
        font-size: 1.1rem;
        color: #5a6c7d;
        line-height: 1.6;
        margin: 20px 0 0 0;
        padding: 20px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 12px;
        border-left: 4px solid #4a90e2;
      }
      
      .preview-article-content {
        background: white;
        padding: 40px;
        border-radius: 16px;
        margin-bottom: 30px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        line-height: 1.8;
        font-size: 16px;
      }
      
      .preview-article-content h2 {
        font-size: 1.8rem;
        font-weight: 700;
        color: #2c3e50;
        margin: 40px 0 20px 0;
        padding-bottom: 16px;
        border-bottom: 3px solid #4a90e2;
        position: relative;
        text-align: center;
      }
      
      .preview-article-content h2::before {
        content: '◆';
        color: #4a90e2;
        margin-right: 12px;
      }
      
      .preview-article-content h2::after {
        content: '◆';
        color: #4a90e2;
        margin-left: 12px;
      }
      
      .preview-article-content h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #34495e;
        margin: 30px 0 16px 0;
        padding-left: 16px;
        border-left: 4px solid #4a90e2;
        position: relative;
      }
      
      .preview-article-content h3::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 0;
        width: 60px;
        height: 2px;
        background: #4a90e2;
      }
      
      .preview-article-content h4 {
        font-size: 1.3rem;
        font-weight: 600;
        color: #34495e;
        margin: 24px 0 12px 0;
        position: relative;
        padding-left: 24px;
      }
      
      .preview-article-content h4::before {
        content: '■';
        position: absolute;
        left: 0;
        color: #4a90e2;
        font-size: 14px;
      }
      
      .preview-article-content h5 {
        font-size: 1.1rem;
        font-weight: 600;
        color: #34495e;
        margin: 20px 0 10px 0;
        position: relative;
        padding-left: 20px;
      }
      
      .preview-article-content h5::before {
        content: '▶';
        position: absolute;
        left: 0;
        color: #4a90e2;
        font-size: 12px;
      }
      
      .preview-article-content p {
        margin: 16px 0;
        line-height: 1.8;
      }
      
      .preview-article-content ul,
      .preview-article-content ol {
        margin: 16px 0;
        padding-left: 24px;
      }
      
      .preview-article-content li {
        margin: 8px 0;
        line-height: 1.7;
      }
      
      .preview-article-content strong {
        color: #2c3e50;
        font-weight: 700;
      }
      
      .preview-article-content em {
        color: #5a6c7d;
        font-style: italic;
      }
      
      .preview-article-content code {
        background: #f8f9fa;
        color: #e83e8c;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Fira Code', monospace;
        font-size: 0.9em;
      }
      
      .preview-article-content blockquote {
        background: #f8f9fa;
        border-left: 4px solid #4a90e2;
        padding: 20px 24px;
        margin: 24px 0;
        border-radius: 8px;
        font-style: italic;
        color: #5a6c7d;
      }
      
      .preview-article-content hr {
        border: none;
        height: 2px;
        background: linear-gradient(90deg, transparent, #4a90e2, transparent);
        margin: 32px 0;
      }
      
      .preview-share-section {
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        padding: 30px;
        border-radius: 16px;
        margin-bottom: 30px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }
      
      .share-title {
        font-size: 1.3rem;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 20px;
        position: relative;
      }
      
      .share-title::before {
        content: '📤';
        margin-right: 8px;
      }
      
      .preview-share-buttons {
        display: flex;
        justify-content: center;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      
      .share-btn {
        background: white;
        border: 2px solid #ddd;
        padding: 12px 20px;
        border-radius: 25px;
        cursor: not-allowed;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        opacity: 0.7;
      }
      
      .share-btn.twitter {
        border-color: #1da1f2;
        color: #1da1f2;
      }
      
      .share-btn.facebook {
        border-color: #4267b2;
        color: #4267b2;
      }
      
      .share-btn.line {
        border-color: #00c300;
        color: #00c300;
      }
      
      .share-btn.copy {
        border-color: #6c757d;
        color: #6c757d;
      }
      
      .preview-related-articles {
        background: white;
        padding: 40px;
        border-radius: 16px;
        margin-bottom: 30px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }
      
      .related-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 30px;
        text-align: center;
        position: relative;
      }
      
      .related-title::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 80px;
        height: 3px;
        background: linear-gradient(90deg, #4a90e2, #50c8a3);
        border-radius: 2px;
      }
      
      .related-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        margin-bottom: 20px;
      }
      
      .preview-related-card {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 20px;
        border: 2px solid #e9ecef;
        transition: all 0.3s ease;
      }
      
      .preview-related-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }
      
      .related-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .related-date {
        background: #6c757d;
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }
      
      .related-category {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        color: white;
      }
      
      .related-category.announcement {
        background: #4a90e2;
      }
      
      .related-category.event {
        background: #50c8a3;
      }
      
      .related-category.media {
        background: #9b59b6;
      }
      
      .related-category.important {
        background: #e74c3c;
      }
      
      .related-title-link {
        font-size: 1.1rem;
        font-weight: 600;
        color: #2c3e50;
        margin: 12px 0;
        line-height: 1.4;
      }
      
      .related-excerpt {
        color: #6c757d;
        font-size: 0.9rem;
        line-height: 1.6;
        margin: 0;
      }
      
      .preview-article-nav {
        text-align: center;
        margin-bottom: 20px;
      }
      
      .nav-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #4a90e2;
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s ease;
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .preview-note-small {
        font-size: 0.8rem;
        color: #6c757d;
        text-align: center;
        margin: 12px 0 0 0;
        font-style: italic;
      }
      
      .news-detail-modal-footer {
        background: #f8f9fa;
        padding: 20px 30px;
        border-top: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }
      
      .modal-footer-left,
      .modal-footer-right {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      
      /* レスポンシブ対応 */
      @media (max-width: 768px) {
        .news-detail-preview-content {
          width: 98%;
          height: 95vh;
          margin: 10px;
        }
        
        .news-detail-modal-header {
          padding: 16px 20px;
        }
        
        .modal-title-section h2 {
          font-size: 1.3rem;
        }
        
        .preview-container {
          padding: 16px 20px;
        }
        
        .preview-article-header {
          padding: 24px 20px;
        }
        
        .preview-article-title {
          font-size: 1.5rem;
        }
        
        .preview-article-content {
          padding: 24px 20px;
        }
        
        .related-grid {
          grid-template-columns: 1fr;
        }
        
        .news-detail-modal-footer {
          flex-direction: column;
          gap: 12px;
        }
        
        .modal-footer-left,
        .modal-footer-right {
          width: 100%;
          justify-content: center;
        }
        
        .preview-share-buttons {
          flex-direction: column;
          align-items: center;
        }
      }
      
      @media (max-width: 480px) {
        .preview-article-meta {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        
        .preview-article-title {
          font-size: 1.3rem;
        }
        
        .preview-article-content h2 {
          font-size: 1.4rem;
        }
        
        .preview-article-content h3 {
          font-size: 1.2rem;
        }
        
        .modal-controls {
          flex-direction: column;
          gap: 6px;
        }
      }
      
      /* アニメーション */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }

  /**
   * 改善されたプレビューモーダルの機能を初期化
   * @private
   */
  _initializeEnhancedPreviewModal(modal) {
    const viewport = modal.querySelector('.preview-viewport');
    
    // 表示モード切替機能
    const viewButtons = modal.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // アクティブ状態を更新
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 表示モードを適用
        const view = btn.dataset.view;
        viewport.className = 'preview-viewport';
        if (view === 'mobile') {
          viewport.classList.add('mobile-view');
        } else if (view === 'tablet') {
          viewport.classList.add('tablet-view');
        }
      });
    });
    
    // ズーム機能
    const zoomButtons = modal.querySelectorAll('.zoom-btn');
    zoomButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // アクティブ状態を更新
        zoomButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // ズームレベルを適用
        const zoom = btn.dataset.zoom;
        viewport.style.zoom = zoom;
      });
    });
    
    // フルスクリーン機能
    const fullscreenBtn = modal.querySelector('.fullscreen-toggle');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          modal.requestFullscreen().catch(err => {
            console.log('フルスクリーン表示に失敗しました:', err);
          });
        } else {
          document.exitFullscreen();
        }
      });
    }
    
    // フルスクリーン状態の変更を監視
    document.addEventListener('fullscreenchange', () => {
      const icon = fullscreenBtn?.querySelector('i');
      if (icon) {
        if (document.fullscreenElement) {
          icon.className = 'fas fa-compress';
        } else {
          icon.className = 'fas fa-expand';
        }
      }
    });
    
    // キーボードショートカット
    const handleKeydown = (e) => {
      if (e.target.closest('.modal') === modal) {
        switch (e.key) {
          case 'Escape':
            modal.remove();
            document.removeEventListener('keydown', handleKeydown);
            break;
          case 'F11':
            e.preventDefault();
            fullscreenBtn?.click();
            break;
          case '1':
            if (e.ctrlKey) {
              e.preventDefault();
              viewButtons[0]?.click(); // デスクトップ
            }
            break;
          case '2':
            if (e.ctrlKey) {
              e.preventDefault();
              viewButtons[1]?.click(); // タブレット
            }
            break;
          case '3':
            if (e.ctrlKey) {
              e.preventDefault();
              viewButtons[2]?.click(); // モバイル
            }
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // スムーズアニメーション用のタイマー
    setTimeout(() => {
      modal.classList.add('loaded');
    }, 100);
    
    console.log('✨ 改善されたプレビューモーダルの機能を初期化完了');
  }

  /**
   * プレビューモーダルの機能を初期化（旧メソッド）
   * @private
   */
  _initializePreviewModal(modal) {
    const viewport = modal.querySelector('.preview-viewport');
    
    // フルスクリーン切替
    const fullscreenBtn = modal.querySelector('.fullscreen-toggle');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        const content = modal.querySelector('.news-detail-preview-content');
        content.classList.toggle('fullscreen-mode');
        
        if (content.classList.contains('fullscreen-mode')) {
          content.style.width = '100%';
          content.style.height = '100vh';
          content.style.maxWidth = 'none';
          fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
          content.style.width = '95%';
          content.style.height = '90vh';
          content.style.maxWidth = '1200px';
          fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
      });
    }
    
    // レスポンシブ切替
    const responsiveBtn = modal.querySelector('.responsive-toggle');
    if (responsiveBtn) {
      let currentView = 'desktop';
      responsiveBtn.addEventListener('click', () => {
        viewport.classList.remove('mobile-view', 'tablet-view');
        
        switch (currentView) {
          case 'desktop':
            viewport.classList.add('mobile-view');
            currentView = 'mobile';
            responsiveBtn.innerHTML = '<i class="fas fa-tablet-alt"></i>';
            break;
          case 'mobile':
            viewport.classList.add('tablet-view');
            currentView = 'tablet';
            responsiveBtn.innerHTML = '<i class="fas fa-desktop"></i>';
            break;
          case 'tablet':
            currentView = 'desktop';
            responsiveBtn.innerHTML = '<i class="fas fa-mobile-alt"></i>';
            break;
        }
      });
    }
    
    // スムーズスクロール
    const links = modal.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = modal.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
    
    console.log('⚙️ プレビューモーダル機能初期化完了');
  }

  /**
   * ニュースフォームデータを取得
   * @private
   */
  _getNewsFormData() {
    return {
      title: document.getElementById('news-title')?.value?.trim() || '',
      content: document.getElementById('news-content')?.value?.trim() || '',
      category: document.getElementById('news-category')?.value || 'announcement',
      priority: document.getElementById('news-priority')?.value || 'normal'
    };
  }

  /**
   * ニュースプレビューモーダルを表示
   * @private
   */
  _showNewsPreviewModal(formData) {
    const previewContent = `
      <div class="news-preview">
        <div class="news-preview-header">
          <div class="news-meta">
            <span class="news-category">${this._getCategoryName(formData.category)}</span>
            <span class="news-date">${new Date().toLocaleDateString('ja-JP')}</span>
          </div>
          <h1 class="news-title">${formData.title}</h1>
        </div>
        <div class="news-preview-content">
          ${this._formatMarkdown(formData.content)}
        </div>
      </div>
    `;
    
    this._createModal('記事プレビュー', previewContent, 'large');
  }



  // 削除済み: 重複した_renderNewsListメソッド - 統合された版を使用

  /**
   * カテゴリ名を取得
   * @private
   */
  _getCategoryName(category) {
    const categories = {
      announcement: 'お知らせ',
      lesson: 'レッスン情報',
      event: 'イベント',
      general: '一般'
    };
    return categories[category] || 'その他';
  }

  /**
   * 接続テスト結果HTML生成
   * @private
   */
  _generateConnectionTestResults(results) {
    return results.map(result => `
      <div class="connection-test-item ${result.success ? 'success' : 'error'}">
        <div class="test-icon">
          <i class="fas fa-${result.success ? 'check-circle' : 'times-circle'}"></i>
        </div>
        <div class="test-details">
          <h4>${result.name}</h4>
          <p class="test-url">${result.url}</p>
          <p class="test-status">${result.message}</p>
        </div>
      </div>
    `).join('');
  }

  /**
   * デバッグモーダルを作成
   * @private
   */
  _createDebugModal(title, content) {
    this._createModal(title, content, 'large debug-modal');
  }

  /**
   * 汎用モーダル作成
   * @private
   */
  _createModal(title, content, className = '') {
    const modalId = `modal-${Date.now()}`;
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = `modal ${className}`;
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.closest('.modal').remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // ESCキーでモーダルを閉じる
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * 統計情報を更新
   * @private
   */
  _updateStats() {
    try {
      const articles = this.articleDataService?.getAllArticles() || [];
      const publishedCount = articles.filter(a => a.status === 'published').length;
      const draftCount = articles.filter(a => a.status === 'draft').length;
      
      // 統計表示を更新
      const statsElements = {
        totalArticles: document.querySelector('.stat-total-articles'),
        publishedArticles: document.querySelector('.stat-published-articles'),
        draftArticles: document.querySelector('.stat-draft-articles')
      };
      
      if (statsElements.totalArticles) {
        statsElements.totalArticles.textContent = articles.length;
      }
      if (statsElements.publishedArticles) {
        statsElements.publishedArticles.textContent = publishedCount;
      }
      if (statsElements.draftArticles) {
        statsElements.draftArticles.textContent = draftCount;
      }
      
    } catch (error) {
      console.error('統計情報更新エラー:', error);
    }
  }

  /**
   * マークダウンフォーマット
   * @private
   */
  _formatMarkdown(text) {
    if (!text) return '';
    
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>');
  }

  // === Instagram 関連のプライベートメソッド ===

  /**
   * Instagram投稿データを取得
   * @private
   */
  _getInstagramPosts() {
    try {
      const stored = localStorage.getItem(this.storageKeys.instagram);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Instagram投稿データ取得エラー:', error);
      return [];
    }
  }

  /**
   * Instagram投稿データを保存
   * @private
   */
  _saveInstagramPosts(posts) {
    try {
      localStorage.setItem(this.storageKeys.instagram, JSON.stringify(posts));
      return true;
    } catch (error) {
      console.error('Instagram投稿データ保存エラー:', error);
      return false;
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
      authManager: !!this.authManager
    });
    
    console.groupEnd();
  }

  /**
   * デバッグ用：タブを強制切り替え
   * @public
   * @param {string} tabName - タブ名
   */
  async forceTabSwitch(tabName) {
    console.log(`🔧 タブ強制切り替え: ${tabName}`);
    
    if (!this._isValidTabName(tabName)) {
      console.error(`❌ 無効なタブ名: ${tabName}`);
      return;
    }
    
    try {
      // LocalStorageを即座に更新
      localStorage.setItem(this.storageKeys.adminTab, tabName);
      
      // 全ての.admin-sectionからactiveクラスを削除
      document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
      });
      
      // 全ての.nav-itemからactiveクラスを削除
      document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.classList.remove('active');
      });
      
      // 指定されたタブをアクティブにする
      const targetSection = document.getElementById(tabName);
      const targetNav = document.querySelector(`[data-tab="${tabName}"]`);
      
      if (targetSection) {
        targetSection.classList.add('active');
        console.log(`✅ セクション "${tabName}" をアクティブに設定`);
      } else {
        console.error(`❌ セクション "${tabName}" が見つかりません`);
      }
      
      if (targetNav) {
        targetNav.classList.add('active');
        console.log(`✅ ナビゲーション "${tabName}" をアクティブに設定`);
      } else {
        console.error(`❌ ナビゲーション "${tabName}" が見つかりません`);
      }
      
      // タブ固有の初期化処理
      await this.initializeTabContent(tabName);
      this.currentTab = tabName;
      
      console.log(`✅ タブ強制切り替え完了: ${tabName}`);
      
    } catch (error) {
      console.error(`❌ タブ強制切り替えエラー:`, error);
      // フォールバックとして通常の切り替えを試す
      this.switchAdminTab(tabName);
    }
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

  // =============================================================================
  // ウィザード制御メソッド
  // =============================================================================

  /**
   * 前のステップに戻る
   */
  wizardPrevStep() {
    const currentStep = document.querySelector('.wizard-content.active');
    const prevStep = currentStep?.previousElementSibling;
    
    if (!prevStep || !prevStep.classList.contains('wizard-content')) {
      console.log('前のステップがありません');
      return;
    }
    
    // ステップ切り替え
    this.switchWizardStep(prevStep);
    this.updateWizardButtons();
  }

  /**
   * 次のステップに進む
   */
  wizardNextStep() {
    const currentStep = document.querySelector('.wizard-content.active');
    const nextStep = currentStep?.nextElementSibling;
    
    if (!nextStep || !nextStep.classList.contains('wizard-content')) {
      console.log('次のステップがありません');
      return;
    }
    
    // 現在のステップのバリデーション
    if (!this.validateCurrentWizardStep()) {
      return;
    }
    
    // ステップ切り替え
    this._switchWizardStep(nextStep);
    this._updateWizardButtons();
  }

  /**
   * ウィザードステップ切り替え
   * @param {Element} targetStep - 切り替え先のステップ
   */
  _switchWizardStep(targetStep) {
    // 全てのステップを非アクティブに
    document.querySelectorAll('.wizard-content').forEach(step => {
      step.classList.remove('active');
    });
    
    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('active');
    });
    
    // 対象ステップをアクティブに
    targetStep.classList.add('active');
    
    // ステップインジケーターを更新
    const stepNumber = targetStep.classList.contains('step-1') ? 1 : 2;
    const stepIndicator = document.querySelector(`[data-step="${stepNumber}"]`);
    if (stepIndicator) {
      stepIndicator.classList.add('active');
    }
    
    console.log(`ウィザードステップ ${stepNumber} に切り替えました`);
  }

  /**
   * ウィザードボタンの状態更新
   */
  _updateWizardButtons() {
    const currentStep = document.querySelector('.wizard-content.active');
    const prevBtn = document.querySelector('.wizard-prev');
    const nextBtn = document.querySelector('.wizard-next');
    
    if (!currentStep || !prevBtn || !nextBtn) return;
    
    // 前へボタンの状態
    if (currentStep.classList.contains('step-1')) {
      prevBtn.disabled = true;
      prevBtn.style.opacity = '0.6';
    } else {
      prevBtn.disabled = false;
      prevBtn.style.opacity = '1';
    }
    
    // 次へボタンの状態
    if (currentStep.classList.contains('step-2')) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = 'flex';
    }
  }

  /**
   * 現在のウィザードステップのバリデーション
   * @returns {boolean}
   */
  validateCurrentWizardStep() {
    const currentStep = document.querySelector('.wizard-content.active');
    
    if (currentStep?.classList.contains('step-1')) {
      // ステップ1: グローバルステータスの選択確認
      const selectedStatus = document.querySelector('input[name="global-status"]:checked');
      if (!selectedStatus) {
        this._showFeedback('全体ステータスを選択してください', 'error');
        return false;
      }
      
      // 日付の確認
      const dateInput = document.getElementById('lesson-date');
      if (!dateInput?.value) {
        this._showFeedback('対象日を選択してください', 'error');
        return false;
      }
      
      return true;
    }
    
    return true;
  }

  /**
   * フィードバックメッセージを表示
   * @param {string} message - メッセージ
   * @param {string} type - メッセージタイプ
   */
  showFeedbackMessage(message, type = 'success') {
    console.log(`${type === 'error' ? '❌' : '✅'} ${message}`);
    
    if (this.uiManagerService?.showNotification) {
      this.uiManagerService.showNotification(type, message);
    } else if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, type);
    }
  }

  // === Instagram管理機能 ===

  /**
   * Instagram管理: タブ切り替え
   * @param {string} tabName - 切り替え先のタブ名 ('posts' または 'settings')
   */
  switchInstagramTab(tabName = null) {
    console.log('🔄 Instagram タブ切り替え開始:', tabName);
    
    try {
      // パラメータの検証
      const targetTab = tabName || 'posts';
      const validTabs = ['posts', 'settings'];
      if (!validTabs.includes(targetTab)) {
        console.warn('⚠️ 無効なタブ名:', targetTab);
        return;
      }
      
      console.log('✅ タブ切り替え対象:', targetTab);
      
      // タブボタンの状態更新
      const tabButtons = document.querySelectorAll('.sub-nav-item[data-action="switch-instagram-tab"]');
      console.log('📋 タブボタン検索結果:', tabButtons.length, '個');
      
      if (tabButtons.length === 0) {
        console.warn('⚠️ タブボタンが見つかりません');
        return;
      }
      
      let targetButtonFound = false;
      tabButtons.forEach((btn, index) => {
        const isTarget = btn.dataset.tab === targetTab;
        btn.classList.toggle('active', isTarget);
        
        if (isTarget) {
          targetButtonFound = true;
          console.log(`🎯 ターゲットボタン発見 (インデックス: ${index}):`, btn.dataset.tab);
        }
        
        console.log(`📝 ボタン${index + 1}(${btn.dataset.tab}): ${isTarget ? 'アクティブ' : '非アクティブ'}`);
      });
      
      if (!targetButtonFound) {
        console.warn('⚠️ ターゲットボタンが見つかりませんでした:', targetTab);
      }
      
      // タブコンテンツの表示切り替え
      const tabContents = document.querySelectorAll('.instagram-tab-content');
      console.log('📄 タブコンテンツ検索結果:', tabContents.length, '個');
      
      if (tabContents.length === 0) {
        console.warn('⚠️ タブコンテンツが見つかりません');
        return;
      }
      
      let targetContentFound = false;
      tabContents.forEach((content, index) => {
        const expectedId = `instagram-${targetTab}-tab`;
        const isTarget = content.id === expectedId;
        
        // クラスの更新
        content.classList.toggle('active', isTarget);
        
        // 表示状態の直接制御も追加
        content.style.display = isTarget ? 'flex' : 'none';
        
        if (isTarget) {
          targetContentFound = true;
          console.log(`🎯 ターゲットコンテンツ発見 (インデックス: ${index}):`, content.id);
        }
        
        console.log(`📄 コンテンツ${index + 1}(${content.id}): ${isTarget ? '表示' : '非表示'}`);
      });
      
      if (!targetContentFound) {
        console.warn('⚠️ ターゲットコンテンツが見つかりませんでした:', `instagram-${targetTab}-tab`);
      }
      
      // タブ固有の初期化
      if (targetTab === 'posts') {
        console.log('📸 投稿管理タブの初期化');
        this.refreshInstagramPosts();
      } else if (targetTab === 'settings') {
        console.log('⚙️ 連携設定タブの初期化');
        this._loadInstagramSettings();
      }
      
      const tabDisplayName = targetTab === 'posts' ? '投稿管理' : '連携設定';
      this.success(`${tabDisplayName}タブに切り替えました`);
      
      console.log('✅ Instagram タブ切り替え完了:', targetTab);
      
    } catch (error) {
      console.error('❌ Instagram タブ切り替えエラー:', error);
      this.error('タブの切り替えに失敗しました');
    }
  }

  /**
   * Instagram管理: 投稿一覧更新
   */
  refreshInstagramPosts() {
    console.log('🔄 Instagram投稿一覧を更新中...');
    
    try {
      const container = document.getElementById('instagram-posts-list');
      if (!container) {
        console.warn('⚠️ Instagram投稿リストコンテナが見つかりません');
        return;
      }
      
      // ローディング状態表示
      container.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          Instagram投稿を読み込み中...
        </div>
      `;
      
      // LocalStorageからInstagram投稿データを取得
      const instagramPosts = this._getInstagramPosts();
      
      // 投稿グリッドの生成
      const postsHTML = this._generateInstagramPostsHTML(instagramPosts);
      
      // 少し遅延してローディング感を演出
      setTimeout(() => {
        container.innerHTML = postsHTML;
        this.success(`${instagramPosts.length}件のInstagram投稿を読み込みました`);
      }, 500);
      
    } catch (error) {
      console.error('❌ Instagram投稿読み込みエラー:', error);
      const container = document.getElementById('instagram-posts-list');
      if (container) {
        container.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Instagram投稿の読み込みに失敗しました</p>
          </div>
        `;
      }
      this.error('Instagram投稿の読み込みに失敗しました');
    }
  }

  /**
   * Instagram管理: 新規投稿追加
   */
  addInstagramPost() {
    console.log('➕ Instagram投稿追加モーダルを開く');
    
    try {
      // フォームをリセット
      const form = document.querySelector('.instagram-form');
      if (form) {
        form.reset();
        document.getElementById('instagram-post-id').value = '';
        document.getElementById('instagram-modal-title').innerHTML = 
          '<i class="fab fa-instagram"></i> Instagram投稿追加';
      }
      
      // 今日の日付をデフォルトに設定
      const dateInput = document.getElementById('instagram-post-date');
      if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
      
      // モーダルを表示
      const modal = document.getElementById('instagram-modal');
      if (modal) {
        modal.classList.add('modal-visible');
        modal.classList.remove('modal-hidden');
        modal.style.display = 'flex';
        
        // フォーカスをURLフィールドに移動
        const urlInput = document.getElementById('instagram-post-url');
        if (urlInput) {
          setTimeout(() => urlInput.focus(), 100);
        }
      }
      
    } catch (error) {
      console.error('❌ Instagram投稿追加モーダルエラー:', error);
      this.error('モーダルの表示に失敗しました');
    }
  }

  /**
   * Instagram管理: 投稿保存
   */
  saveInstagramPost() {
    console.log('💾 Instagram投稿を保存中...');
    
    try {
      // フォームデータの取得
      const postData = {
        id: document.getElementById('instagram-post-id').value || this._generateId(),
        url: document.getElementById('instagram-post-url').value.trim(),
        caption: document.getElementById('instagram-post-caption').value.trim(),
        date: document.getElementById('instagram-post-date').value,
        type: document.getElementById('instagram-post-type').value,
        featured: document.getElementById('instagram-post-featured').checked,
        createdAt: new Date().toISOString(),
        status: 'active'
      };
      
      // バリデーション
      if (!postData.url) {
        this.error('Instagram投稿URLは必須です');
        return;
      }
      
      if (!this._isValidInstagramURL(postData.url)) {
        this.error('有効なInstagram投稿URLを入力してください');
        return;
      }
      
      // LocalStorageに保存
      const posts = this._getInstagramPosts();
      const existingIndex = posts.findIndex(post => post.id === postData.id);
      
      if (existingIndex >= 0) {
        posts[existingIndex] = { ...posts[existingIndex], ...postData, updatedAt: new Date().toISOString() };
      } else {
        posts.unshift(postData);
      }
      
      localStorage.setItem(this.storageKeys.instagram, JSON.stringify(posts));
      
      // モーダルを閉じる
      this.closeInstagramModal();
      
      // 投稿一覧を更新
      this.refreshInstagramPosts();
      
      this.success(existingIndex >= 0 ? 'Instagram投稿を更新しました' : 'Instagram投稿を追加しました');
      
    } catch (error) {
      console.error('❌ Instagram投稿保存エラー:', error);
      this.error('Instagram投稿の保存に失敗しました');
    }
  }

  /**
   * Instagram管理: モーダルを閉じる
   */
  closeInstagramModal() {
    console.log('✖️ Instagram投稿モーダルを閉じる');
    
    const modal = document.getElementById('instagram-modal');
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
  }

  /**
   * Instagram管理: 設定保存
   */
  saveInstagramSettings() {
    console.log('⚙️ Instagram設定を保存中...');
    
    try {
      const settings = {
        username: document.getElementById('instagram-username').value.trim(),
        displayCount: parseInt(document.getElementById('instagram-display-count').value),
        autoSync: document.getElementById('instagram-auto-sync').checked,
        syncInterval: parseInt(document.getElementById('instagram-sync-interval').value),
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`${this.storageKeys.instagram}_settings`, JSON.stringify(settings));
      
      this.success('Instagram設定を保存しました');
      
    } catch (error) {
      console.error('❌ Instagram設定保存エラー:', error);
      this.error('Instagram設定の保存に失敗しました');
    }
  }

  /**
   * Instagram管理: 投稿編集
   */
  editInstagramPost(postId) {
    console.log('✏️ Instagram投稿編集:', postId);
    
    try {
      const posts = this._getInstagramPosts();
      const post = posts.find(p => p.id === postId);
      
      if (!post) {
        this.error('投稿が見つかりません');
        return;
      }
      
      // フォームに投稿データを設定
      document.getElementById('instagram-post-id').value = post.id;
      document.getElementById('instagram-post-url').value = post.url || '';
      document.getElementById('instagram-post-caption').value = post.caption || '';
      document.getElementById('instagram-post-date').value = post.date || '';
      document.getElementById('instagram-post-type').value = post.type || 'photo';
      document.getElementById('instagram-post-featured').checked = post.featured || false;
      
      // モーダルタイトルを更新
      document.getElementById('instagram-modal-title').innerHTML = 
        '<i class="fab fa-instagram"></i> Instagram投稿編集';
      
      // モーダルを表示
      const modal = document.getElementById('instagram-modal');
      if (modal) {
        modal.classList.add('modal-visible');
        modal.classList.remove('modal-hidden');
        modal.style.display = 'flex';
      }
      
    } catch (error) {
      console.error('❌ Instagram投稿編集エラー:', error);
      this.error('投稿の編集に失敗しました');
    }
  }

  /**
   * Instagram管理: 投稿ステータス切り替え
   */
  toggleInstagramPostStatus(postId) {
    console.log('👁️ Instagram投稿ステータス切り替え:', postId);
    
    try {
      const posts = this._getInstagramPosts();
      const postIndex = posts.findIndex(p => p.id === postId);
      
      if (postIndex === -1) {
        this.error('投稿が見つかりません');
        return;
      }
      
      const post = posts[postIndex];
      post.status = post.status === 'hidden' ? 'active' : 'hidden';
      post.updatedAt = new Date().toISOString();
      
      localStorage.setItem(this.storageKeys.instagram, JSON.stringify(posts));
      
      // 投稿一覧を更新
      this.refreshInstagramPosts();
      
      this.success(`投稿を${post.status === 'hidden' ? '非表示' : '表示'}に変更しました`);
      
    } catch (error) {
      console.error('❌ Instagram投稿ステータス切り替えエラー:', error);
      this.error('投稿ステータスの変更に失敗しました');
    }
  }

  /**
   * Instagram管理: 投稿削除
   */
  async deleteInstagramPost(postId) {
    console.log('🗑️ Instagram投稿削除:', postId);
    
    try {
      const posts = this._getInstagramPosts();
      const filteredPosts = posts.filter(post => post.id !== postId);
      
      if (posts.length === filteredPosts.length) {
        this.error('投稿が見つかりません');
        return;
      }
      
      localStorage.setItem(this.storageKeys.instagram, JSON.stringify(filteredPosts));
      
      // 投稿一覧を更新
      this.refreshInstagramPosts();
      
      this.success('Instagram投稿を削除しました');
      
    } catch (error) {
      console.error('❌ Instagram投稿削除エラー:', error);
      this.error('投稿の削除に失敗しました');
    }
  }

  // プライベートメソッド - Instagram管理

  /**
   * LocalStorageからInstagram投稿を取得（移行機能付き）
   * @private
   */
  _getInstagramPosts() {
    try {
      // 現在のキーでデータを確認
      const currentKey = this.storageKeys.instagram;
      console.log('🔍 Instagram投稿データ確認:', currentKey);
      
      let stored = localStorage.getItem(currentKey);
      let posts = stored ? JSON.parse(stored) : [];
      
      console.log(`📊 現在のキー (${currentKey}) で見つかった投稿数:`, posts.length);
      
      // データが見つからない場合、古い可能性のあるキーを確認
      if (posts.length === 0) {
        const oldPossibleKeys = [
          'rbs_instagram',
          'instagram_posts', 
          'instagram_data',
          'admin_instagram',
          'rbs_instagram_posts'
        ];
        
        console.log('🔄 古いキーでInstagram投稿を検索中...');
        
        for (const oldKey of oldPossibleKeys) {
          try {
            const oldStored = localStorage.getItem(oldKey);
            if (oldStored) {
              const oldPosts = JSON.parse(oldStored);
              if (oldPosts && oldPosts.length > 0) {
                console.log(`✅ 古いキー (${oldKey}) で${oldPosts.length}件の投稿を発見`);
                
                // 新しいキーに移行
                localStorage.setItem(currentKey, oldStored);
                posts = oldPosts;
                
                // 古いキーを削除
                localStorage.removeItem(oldKey);
                
                this.success(`Instagram投稿データを移行しました (${oldPosts.length}件)`);
                console.log('🚀 データ移行完了:', oldKey, '->', currentKey);
                break;
              }
            }
          } catch (error) {
            console.warn(`⚠️ 古いキー ${oldKey} の読み込みエラー:`, error);
          }
        }
      }
      
      // デバッグ情報を追加
      if (posts.length > 0) {
        console.log('📝 Instagram投稿サンプル:', posts[0]);
        console.log('📅 投稿日時範囲:', {
          oldest: posts.length > 0 ? Math.min(...posts.map(p => new Date(p.date || p.createdAt).getTime())) : null,
          newest: posts.length > 0 ? Math.max(...posts.map(p => new Date(p.date || p.createdAt).getTime())) : null
        });
      } else {
        console.log('📭 Instagram投稿データが見つかりません');
      }
      
      return posts;
      
    } catch (error) {
      console.error('❌ Instagram投稿データ読み込みエラー:', error);
      this.error('Instagram投稿の読み込みでエラーが発生しました');
      return [];
    }
  }

  /**
   * Instagram投稿HTMLの生成
   * @private
   */
  _generateInstagramPostsHTML(posts) {
    if (!posts || posts.length === 0) {
      return `
        <div class="instagram-post-card add-new" data-action="add-instagram-post">
          <div class="add-new-content">
            <i class="fab fa-instagram"></i>
            <h4>最初の投稿を追加</h4>
            <p>Instagram投稿のリンクを追加して管理を始めましょう</p>
          </div>
        </div>
      `;
    }
    
    let html = `
      <div class="instagram-post-card add-new" data-action="add-instagram-post">
        <div class="add-new-content">
          <i class="fas fa-plus"></i>
          <h4>新規投稿追加</h4>
          <p>新しいInstagram投稿を追加</p>
        </div>
      </div>
    `;
    
    posts.forEach(post => {
      const postDate = new Date(post.date || post.createdAt);
      const thumbnailUrl = this._getInstagramThumbnail(post.url);
      
      html += `
        <div class="instagram-post-card" data-post-id="${post.id}">
          <div class="instagram-post-image">
            <div class="instagram-gradient-bg flex-center">
              <i class="fab fa-instagram"></i>
            </div>
            <div class="instagram-post-overlay">
              <div class="instagram-post-stats">
                <span><i class="fas fa-heart"></i> --</span>
                <span><i class="fas fa-comment"></i> --</span>
              </div>
            </div>
          </div>
          <div class="instagram-post-content">
            <div class="instagram-post-header">
              <div class="instagram-post-info">
                <div class="instagram-post-date">
                  <i class="fas fa-calendar-alt"></i>
                  ${this._formatDate(postDate)}
                </div>
                <a href="${post.url}" target="_blank" class="instagram-post-url">
                  <i class="fab fa-instagram"></i>
                  投稿を開く
                </a>
              </div>
              <div class="instagram-post-actions">
                <button class="btn-icon" data-action="edit-instagram-post" data-post-id="${post.id}" title="編集">
                  <i class="fas fa-edit"></i>
                </button>
                <div class="dropdown">
                  <button class="btn-icon dropdown-toggle" title="メニュー">
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                  <div class="dropdown-menu">
                    <button class="dropdown-item" data-action="toggle-instagram-post" data-post-id="${post.id}">
                      <i class="fas fa-eye${post.status === 'hidden' ? '' : '-slash'}"></i>
                      ${post.status === 'hidden' ? '表示' : '非表示'}
                    </button>
                    <button class="dropdown-item danger" data-action="delete-instagram-post" data-post-id="${post.id}">
                      <i class="fas fa-trash"></i>
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </div>
            ${post.caption ? `<div class="instagram-post-caption">${post.caption}</div>` : ''}
            <div class="instagram-post-meta">
              <div class="instagram-post-type">
                <i class="fas fa-${this._getPostTypeIcon(post.type)}"></i>
                ${this._getPostTypeLabel(post.type)}
              </div>
              <div class="instagram-post-status ${post.status || 'active'}">
                ${post.status === 'hidden' ? '非表示' : '表示中'}
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    return html;
  }

  /**
   * Instagram設定を読み込み
   * @private
   */
  _loadInstagramSettings() {
    try {
      const stored = localStorage.getItem(`${this.storageKeys.instagram}_settings`);
      const settings = stored ? JSON.parse(stored) : {
        username: '',
        displayCount: 9,
        autoSync: false,
        syncInterval: 30
      };
      
      document.getElementById('instagram-username').value = settings.username || '';
      document.getElementById('instagram-display-count').value = settings.displayCount || 9;
      document.getElementById('instagram-auto-sync').checked = settings.autoSync || false;
      document.getElementById('instagram-sync-interval').value = settings.syncInterval || 30;
      
    } catch (error) {
      console.error('❌ Instagram設定読み込みエラー:', error);
    }
  }

  /**
   * Instagram URL バリデーション
   * @private
   */
  _isValidInstagramURL(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'www.instagram.com' && urlObj.pathname.includes('/p/');
    } catch {
      return false;
    }
  }

  /**
   * Instagram サムネイル取得（プレースホルダー）
   * @private
   */
  _getInstagramThumbnail(url) {
    // 実際の実装では Instagram Graph API などを使用
    return 'https://via.placeholder.com/400x400/833ab4/ffffff?text=Instagram';
  }

  /**
   * 投稿タイプのアイコン取得
   * @private
   */
  _getPostTypeIcon(type) {
    const icons = {
      photo: 'image',
      video: 'video',
      carousel: 'images'
    };
    return icons[type] || 'image';
  }

  /**
   * 投稿タイプのラベル取得
   * @private
   */
  _getPostTypeLabel(type) {
    const labels = {
      photo: '写真',
      video: '動画',
      carousel: '複数投稿'
    };
    return labels[type] || '写真';
  }

  /**
   * ユニークIDの生成
   * @private
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 日付フォーマット
   * @private
   */
  _formatDate(date) {
    try {
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Tokyo'
      };
      return new Intl.DateTimeFormat('ja-JP', options).format(date);
    } catch (error) {
      console.error('日付フォーマットエラー:', error);
      return new Date(date).toLocaleDateString('ja-JP');
    }
  }

  /**
   * 相対時間のフォーマット
   * @private
   */
  _formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60 * 1000) {
      return 'たった今';
    } else if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}分前`;
    } else if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}時間前`;
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}日前`;
    } else if (diff < 30 * 24 * 60 * 60 * 1000) {
      const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
      return `${weeks}週間前`;
    } else if (diff < 365 * 24 * 60 * 60 * 1000) {
      const months = Math.floor(diff / (30 * 24 * 60 * 60 * 1000));
      return `${months}ヶ月前`;
    } else {
      const years = Math.floor(diff / (365 * 24 * 60 * 60 * 1000));
      return `${years}年前`;
    }
  }

  /**
   * 文字数のカウント
   * @private
   */
  _getWordCount(article) {
    return article.content.trim().split(/\s+/).length;
  }

  /**
   * 記事をフィルタリング
   * @private
   */
  _filterArticles(articles, filter) {
    if (!filter || !filter.query) {
      return articles;
    }
    
    const query = filter.query.toLowerCase();
    return articles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  }

  // 削除済み: 末尾の重複メソッド群 - 統合済みメソッドを使用

  /**
   * デバッグモーダル表示
   * @private
   */
  _createDebugModal(title, content) {
    const debugModalHtml = `
      <div id="debug-modal" class="modal debug-modal-show">
        <div class="modal-content">
          <div class="modal-header">
            <h2><i class="fas fa-bug"></i> システムデバッグ</h2>
            <button class="close-btn" data-action="close-debug-modal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', debugModalHtml);
  }
}

// シングルトンインスタンス
export const adminActionService = new AdminActionService();
