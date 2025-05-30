/**
 * 管理画面アクションサービス
 * 管理画面固有のアクションを管理
 * @version 3.0.0 - 完全実装版
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
    this.currentTab = 'dashboard';
    this.initialized = false;
    this.articleDataService = null;
    this.lessonStatusService = null;
    this.instagramDataService = null;
    this.uiManagerService = null;
    this.newsFormManager = null;
    this.authService = null;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) {
      console.log('⚠️ AdminActionService: 既に初期化済み');
      return;
    }

    console.log('🔧 AdminActionService: 初期化開始');
    
    try {
      // サービス初期化
      await this.initializeServices();
      
      // データエクスポートサービスの設定
      await this.setupDataExportService();
      
      // アクション登録
      this.#registerAdminActions();
      
      // UIイベントの設定
      this.setupUIEvents();
      
      // 管理画面固有の初期化
      this.setupAdminUI();
      
      this.initialized = true;
      console.log('✅ AdminActionService: 初期化完了');
      
    } catch (error) {
      console.error('❌ AdminActionService初期化エラー:', error);
      throw error;
    }
  }

  /**
   * サービス初期化
   * @private
   */
  async initializeServices() {
    // サービス依存関係の取得
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
    
    // AuthServiceのインポートと初期化
    const { authService } = await import('../../auth/services/AuthService.js');
    this.authService = authService;
    
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
    
    if (!this.authService.initialized) {
      await this.authService.init();
    }
    
    this.log('全サービス初期化完了');
  }

  /**
   * データエクスポートサービスの設定
   * @private
   */
  async setupDataExportService() {
    try {
      // DataExportServiceの初期化
      if (!dataExportService.initialized) {
        await dataExportService.init();
      }
      
      // データサービスの登録
      dataExportService.registerDataService('articles', this.articleDataService);
      dataExportService.registerDataService('instagram', this.instagramDataService);
      dataExportService.registerDataService('lessonStatus', this.lessonStatusService);
      
      // エクスポートイベントのリスナー設定
      EventBus.on('dataExport:completed', (data) => {
        uiManagerService.showSuccessNotification('data-export', {
          filename: data.filename,
          recordCount: data.recordCount
        });
      });
      
      EventBus.on('dataExport:failed', (data) => {
        uiManagerService.showErrorNotification('data-export', {
          message: data.error
        });
      });
      
      this.log('DataExportService設定完了');
      
    } catch (error) {
      this.error('DataExportService設定エラー:', error);
      throw error;
    }
  }

  /**
   * 管理画面アクションを登録
   * @private
   */
  #registerAdminActions() {
    const adminActions = {
      // 認証関連
      'logout': () => this.logout(),
      
      // タブ切り替え
      'switch-tab': (element, params) => {
        const tabName = params.tab;
        if (this.#isValidTabName(tabName)) {
          this.switchAdminTab(tabName);
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

      // レッスン状況
      'load-lesson-status': () => this.loadLessonStatus(),
      'preview-lesson-status': () => this.previewLessonStatus(),
      'update-lesson-status': () => this.updateLessonStatus(),

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

      // UIイベント
      'toggle-mobile-menu': (element) => this.toggleMobileMenu(element)
    };

    actionManager.registerMultiple(adminActions);
    this.log('管理画面アクション登録完了');
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
    
    this.log('UIイベント設定完了');
  }

  /**
   * 管理画面固有の初期化
   * @private
   */
  setupAdminUI() {
    // 管理画面特有の初期化処理
    this.updateAdminStats();
    this.setupTabNavigation();
    
    this.log('管理画面UI初期化完了');
  }

  /**
   * 管理画面タブ切り替え
   * @param {string} tabName - タブ名
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
    this.currentTab = tabName;
    
    this.#showFeedback(`${this.#getTabDisplayName(tabName)}に切り替えました`);
  }

  /**
   * タブ固有の初期化処理
   * @param {string} tabName - タブ名
   */
  initializeTabContent(tabName) {
    console.log(`🔧 タブコンテンツ初期化: ${tabName}`);
    
    switch (tabName) {
      case 'dashboard':
        this.#initializeDashboard();
        break;
      case 'news-management':
        this.#initializeNewsManagement();
        break;
      case 'lesson-status':
        this.#initializeLessonStatus();
        break;
      case 'settings':
        this.#initializeSettings();
        break;
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
   * ダッシュボード初期化
   * @private
   */
  #initializeDashboard() {
    this.updateDashboardStats();
    this.refreshRecentArticles();
  }

  /**
   * ニュース管理初期化
   * @private
   */
  #initializeNewsManagement() {
    // フォームをクリアして新規記事作成状態にする
    this.clearNewsEditor();
    this.refreshNewsList();
  }

  /**
   * レッスン状況初期化
   * @private
   */
  #initializeLessonStatus() {
    this.loadLessonStatus();
  }

  /**
   * 設定初期化
   * @private
   */
  #initializeSettings() {
    console.log('⚙️ 設定タブを初期化しました');
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
  previewNews() {
    try {
      const articleData = this.#getArticleDataFromForm();
      
      if (!articleData.title) {
        this.#showFeedback('タイトルを入力してください', 'error');
        return;
      }

      this.#showPreviewModal(articleData);
      console.log('👁️ 記事プレビューを表示');

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

        this.#showFeedback('記事を下書きとして保存しました');
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

        this.#showFeedback('記事を公開しました');
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
      const filterValue = element.value;
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
      this.#showFeedback('ニュース一覧を更新しました');
      
    } catch (error) {
      console.error('❌ ニュース一覧更新エラー:', error);
      this.#showFeedback('一覧の更新に失敗しました', 'error');
    }
  }

  /**
   * 最近の記事更新
   */
  refreshRecentArticles() {
    try {
      console.log('🔄 最近の記事更新');
      this.#renderRecentArticles();
      
    } catch (error) {
      console.error('❌ 最近の記事更新エラー:', error);
      
      // エラー時の表示
      const recentContainer = document.getElementById('recent-articles');
      if (recentContainer) {
        recentContainer.innerHTML = `
          <div class="error-state">
            <p>記事の読み込みでエラーが発生しました</p>
            <button class="btn btn-sm btn-outline" onclick="adminActionService.refreshRecentArticles()">再試行</button>
          </div>
        `;
      }
    }
  }

  // === レッスン状況管理メソッド ===

  /**
   * レッスン状況読み込み
   */
  async loadLessonStatus() {
    try {
      console.log('📚 レッスン状況読み込み');
      
      const status = await this.lessonStatusService.getCurrentStatus();
      this.#loadLessonStatusToForm(status);
      
      this.#showFeedback('レッスン状況を読み込みました');
      
    } catch (error) {
      console.error('❌ レッスン状況読み込みエラー:', error);
      this.#showFeedback('レッスン状況の読み込みに失敗しました', 'error');
    }
  }

  /**
   * レッスン状況プレビュー
   */
  previewLessonStatus() {
    try {
      const statusData = this.#getLessonStatusFromForm();
      this.#showLessonStatusPreview(statusData);
      console.log('👁️ レッスン状況プレビューを表示');
      
    } catch (error) {
      console.error('❌ レッスン状況プレビューエラー:', error);
      this.#showFeedback('プレビューの表示に失敗しました', 'error');
    }
  }

  /**
   * レッスン状況更新
   */
  async updateLessonStatus() {
    try {
      const statusData = this.#getLessonStatusFromForm();
      console.log('📝 レッスン状況更新:', statusData);
      
      const result = await this.lessonStatusService.updateStatus(statusData);
      
      if (result.success) {
        this.#showFeedback('レッスン状況を更新しました');
      } else {
        this.#showFeedback(result.message || '更新に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('❌ レッスン状況更新エラー:', error);
      this.#showFeedback('レッスン状況の更新中にエラーが発生しました', 'error');
    }
  }

  // === データ管理メソッド ===

  /**
   * データエクスポート
   */
  async exportData() {
    try {
      console.log('📥 データエクスポート開始');
      
      const result = await dataExportService.exportAllData();
      
      if (result.success) {
        this.log(`データエクスポート成功: ${result.filename}`);
      } else {
        this.error('データエクスポート失敗:', result.message);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ データエクスポートエラー:', error);
      
      const errorResult = {
        success: false,
        message: `データのエクスポートに失敗しました: ${error.message}`
      };
      
      // UIManagerServiceを使って通知
      uiManagerService.showErrorNotification('data-export', {
        message: error.message
      });
      
      return errorResult;
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
   * ログアウト処理
   */
  logout() {
    try {
      this.log('ログアウト処理開始');
      
      // 認証状態をクリア
      if (this.authService) {
        this.authService.logout();
      } else {
        // フォールバック: 手動で認証データをクリア
        localStorage.removeItem(CONFIG.storage.keys.auth);
        sessionStorage.clear();
      }
      
      // 管理画面から離脱
      window.location.href = '../index.html';
      
    } catch (error) {
      this.error('ログアウト処理エラー:', error);
      // フォールバック
      window.location.href = '../index.html';
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
      this.#showDebugModal(debugInfo);
      
    } catch (error) {
      console.error('❌ デバッグ情報表示エラー:', error);
      this.#showFeedback('デバッグ情報の表示に失敗しました', 'error');
    }
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
      const modal = document.getElementById('modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        
        // モーダル内容をクリア
        const modalBody = modal.querySelector('#modal-body, .modal-body');
        if (modalBody) {
          modalBody.innerHTML = '';
        }
        
        this.debug('モーダルを閉じました');
      }
    } catch (error) {
      this.error('モーダル閉じる処理エラー:', error);
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
   * ニュース一覧のレンダリング
   * @private
   * @param {string} filter - フィルター
   */
  #renderNewsList(filter = 'all') {
    try {
      const articles = this.articleDataService.loadArticles();
      const filteredArticles = this.#filterArticles(articles, filter);
      
      const listContainer = document.getElementById('news-list');
      if (listContainer) {
        listContainer.innerHTML = this.#generateNewsListHTML(filteredArticles);
      }
      
    } catch (error) {
      console.error('❌ ニュース一覧レンダリングエラー:', error);
    }
  }

  /**
   * 最近の記事のレンダリング
   * @private
   */
  #renderRecentArticles() {
    try {
      // ArticleDataServiceが初期化されているかチェック
      if (!this.articleDataService || !this.articleDataService.initialized) {
        const recentContainer = document.getElementById('recent-articles');
        if (recentContainer) {
          recentContainer.innerHTML = '<div class="loading-state">記事サービスを初期化中...</div>';
        }
        return;
      }
      
      const articles = this.articleDataService.loadArticles();
      const recentArticles = articles
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 5);
      
      const recentContainer = document.getElementById('recent-articles');
      if (recentContainer) {
        recentContainer.innerHTML = this.#generateRecentArticlesHTML(recentArticles);
      }
      
    } catch (error) {
      console.error('❌ 最近の記事レンダリングエラー:', error);
      
      const recentContainer = document.getElementById('recent-articles');
      if (recentContainer) {
        recentContainer.innerHTML = '<div class="error-state">記事の表示でエラーが発生しました</div>';
      }
    }
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
          <button class="btn btn-sm btn-outline" onclick="adminActionService.editArticle('${article.id}')">編集</button>
          <button class="btn btn-sm btn-danger" onclick="adminActionService.deleteArticle('${article.id}')">削除</button>
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
      return '<div class="empty-state">最近の記事がありません</div>';
    }
    
    return articles.map(article => `
      <div class="recent-article-item">
        <div class="article-title">${article.title}</div>
        <div class="article-meta">
          <span class="status ${article.status}">${article.status === 'published' ? '公開' : '下書き'}</span>
          <span class="date">${new Date(article.updatedAt || article.createdAt).toLocaleDateString('ja-JP')}</span>
        </div>
      </div>
    `).join('');
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
      const article = this.articleDataService.getArticleById(articleId);
      if (!article) {
        this.#showFeedback('記事が見つかりません', 'error');
        return;
      }
      
      // フォームに記事データを読み込み
      document.getElementById('news-id').value = article.id;
      document.getElementById('news-title').value = article.title;
      document.getElementById('news-category').value = article.category;
      document.getElementById('news-date').value = article.date || '';
      document.getElementById('news-status').value = article.status;
      document.getElementById('news-summary').value = article.summary || '';
      document.getElementById('news-content').value = this.articleDataService.getArticleContent(article.id);
      document.getElementById('news-featured').checked = article.featured || false;
      
      // エディタータイトルを更新
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) {
        editorTitle.textContent = '記事編集';
      }
      
      // 記事管理タブに切り替え
      this.switchAdminTab('news-management');
      
      this.#showFeedback('記事をエディターに読み込みました');
      
    } catch (error) {
      console.error('❌ 記事編集エラー:', error);
      this.#showFeedback('記事の編集に失敗しました', 'error');
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
  #showPreviewModal(articleData) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (modal && modalTitle && modalBody) {
      modalTitle.textContent = '記事プレビュー';
      modalBody.innerHTML = `
        <div class="article-preview">
          <h2>${articleData.title}</h2>
          <div class="article-meta">
            <span class="category">${this.#getCategoryName(articleData.category)}</span>
            <span class="date">${articleData.date || '日付未設定'}</span>
            <span class="status">${articleData.status === 'published' ? '公開' : '下書き'}</span>
          </div>
          ${articleData.summary ? `<div class="article-summary">${articleData.summary}</div>` : ''}
          <div class="article-content">${this.#markdownToHtml(articleData.content)}</div>
        </div>
      `;
      modal.classList.add('active');
    }
  }

  /**
   * デバッグモーダルの表示
   * @private
   * @param {Object} debugInfo - デバッグ情報
   */
  #showDebugModal(debugInfo) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    if (modal && modalTitle && modalBody) {
      modalTitle.textContent = 'デバッグ情報';
      modalBody.innerHTML = `
        <div class="debug-info">
          <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      `;
      modal.classList.add('active');
    }
  }

  /**
   * レッスン状況のプレビュー表示
   * @private
   * @param {Object} statusData - レッスン状況データ
   */
  #showLessonStatusPreview(statusData) {
    console.log('👁️ レッスン状況プレビュー:', statusData);
    this.#showFeedback('レッスン状況プレビューを表示');
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
   * フォームからレッスン状況データを取得
   * @private
   * @returns {Object}
   */
  #getLessonStatusFromForm() {
    // 今日の日付をデフォルトとして取得
    const today = new Date().toISOString().slice(0, 10);
    
    // フォームからの生の値を取得
    const globalStatusRaw = document.querySelector('input[name="global-status"]:checked')?.value || 'scheduled';
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
          status: basicLessonStatus,
          message: ''
        },
        advance: {
          name: 'アドバンスコース（小4〜小6）',
          time: '18:00-18:50',
          status: advanceLessonStatus,
          message: ''
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
   * 簡易Markdown to HTML変換
   * @private
   * @param {string} markdown - Markdownテキスト
   * @returns {string}
   */
  #markdownToHtml(markdown) {
    return markdown
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, '<br>');
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
    // 現在のタブ状態を保存・復元
    const activeTab = localStorage.getItem('admin-active-tab') || 'dashboard';
    this.switchAdminTab(activeTab);
  }

  // === ログメソッド ===

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log('🔧 AdminActionService:', ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug.enabled) {
      console.debug('🔍 AdminActionService:', ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn('⚠️ AdminActionService:', ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error('❌ AdminActionService:', ...args);
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
}

// シングルトンインスタンス
export const adminActionService = new AdminActionService();