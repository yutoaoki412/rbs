/**
 * 管理画面アクションサービス
 * 管理画面固有のアクションを管理
 * @version 3.0.0 - 完全実装版
 */

import { actionManager } from '../../../core/ActionManager.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { getArticleDataService } from './ArticleDataService.js';
import { instagramDataService } from './InstagramDataService.js';
import { lessonStatusService } from './LessonStatusService.js';
import { uiManagerService } from './UIManagerService.js';
import { newsFormManager } from '../components/NewsFormManager.js';
import { authService } from '../../auth/services/AuthService.js';

export class AdminActionService {
  constructor() {
    this.currentTab = 'dashboard';
    this.initialized = false;
    this.articleDataService = null;
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
    
    // サービス依存関係の取得
    this.articleDataService = getArticleDataService();
    
    // サービスの初期化確認
    if (!this.articleDataService.initialized) {
      await this.articleDataService.init();
    }
    
    this.#registerAdminActions();
    this.#setupEventListeners();
    this.initialized = true;
    console.log('✅ AdminActionService: 初期化完了');
  }

  /**
   * 管理画面アクションを登録
   * @private
   */
  #registerAdminActions() {
    const adminActions = {
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
      'open-external': (element, params) => this.openExternalUrl(params.url),

      // 認証・デバッグ
      'logout': () => {
        if (confirm('ログアウトしますか？')) {
          this.logout();
        }
      },
      'show-debug-info': () => this.showDebugInfo(),
      'show-news-debug': () => this.showLPNewsDebug(),

      // モーダル管理
      'close-modal': () => this.closeModal()
    };

    actionManager.registerMultiple(adminActions);
  }

  /**
   * イベントリスナーの設定
   * @private
   */
  #setupEventListeners() {
    // 記事関連イベント
    EventBus.on('article:saved', (data) => {
      this.#showFeedback('記事を保存しました');
      this.refreshNewsList();
      this.refreshRecentArticles();
    });

    EventBus.on('article:published', (data) => {
      this.#showFeedback('記事を公開しました');
      this.refreshNewsList();
      this.refreshRecentArticles();
    });

    EventBus.on('article:deleted', (data) => {
      this.#showFeedback('記事を削除しました');
      this.refreshNewsList();
      this.refreshRecentArticles();
    });
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
    }
  }

  // === レッスン状況管理メソッド ===

  /**
   * レッスン状況読み込み
   */
  async loadLessonStatus() {
    try {
      console.log('📚 レッスン状況読み込み');
      
      const status = await lessonStatusService.getCurrentStatus();
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
      
      const result = await lessonStatusService.updateStatus(statusData);
      
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
      
      const exportData = {
        articles: this.articleDataService.getExportData(),
        instagram: instagramDataService.getExportData(),
        lessons: lessonStatusService.getExportData(),
        exportedAt: new Date().toISOString(),
        version: '3.0.0'
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `rbs-admin-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      this.#showFeedback('データをエクスポートしました');
      
    } catch (error) {
      console.error('❌ データエクスポートエラー:', error);
      this.#showFeedback('データのエクスポートに失敗しました', 'error');
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
      await instagramDataService.clearAllData();
      await lessonStatusService.clearAllData();
      
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
      console.log('🔗 外部URL開く:', url);
      window.open(url, '_blank');
      
    } catch (error) {
      console.error('❌ 外部URL開くエラー:', error);
      this.#showFeedback('ページを開けませんでした', 'error');
    }
  }

  // === 認証・デバッグメソッド ===

  /**
   * ログアウト
   */
  async logout() {
    try {
      console.log('🚪 ログアウト実行');
      
      await authService.logout();
      this.#showFeedback('ログアウトしました');
      
      // ページリロード
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
      this.#showFeedback('ログアウトに失敗しました', 'error');
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
        instagramService: instagramDataService.getStatus(),
        lessonService: lessonStatusService.getStatus(),
        uiManager: uiManagerService.getStatus(),
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
  showLPNewsDebug() {
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
        modal.classList.remove('active');
        console.log('📱 モーダルを閉じました');
      }
      
    } catch (error) {
      console.error('❌ モーダル閉じるエラー:', error);
    }
  }

  // === プライベートヘルパーメソッド ===

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
    // 実装は簡略化版
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
    return {
      date: document.getElementById('lesson-date')?.value || '',
      globalStatus: document.querySelector('input[name="global-status"]:checked')?.value || 'scheduled',
      globalMessage: document.getElementById('global-message')?.value || '',
      basicLesson: document.querySelector('input[name="basic-lesson"]:checked')?.value || '通常開催',
      advanceLesson: document.querySelector('input[name="advance-lesson"]:checked')?.value || '通常開催'
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
    
    // ラジオボタンの設定
    if (status.globalStatus) {
      const globalRadio = document.querySelector(`input[name="global-status"][value="${status.globalStatus}"]`);
      if (globalRadio) globalRadio.checked = true;
    }
    
    if (status.basicLesson) {
      const basicRadio = document.querySelector(`input[name="basic-lesson"][value="${status.basicLesson}"]`);
      if (basicRadio) basicRadio.checked = true;
    }
    
    if (status.advanceLesson) {
      const advanceRadio = document.querySelector(`input[name="advance-lesson"][value="${status.advanceLesson}"]`);
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
    
    if (uiManagerService?.showNotification) {
      uiManagerService.showNotification(type, message);
    } else if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, type);
    }
  }

  /**
   * ダッシュボード統計更新
   */
  updateDashboardStats() {
    try {
      const stats = this.articleDataService.getStats();
      
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
}

// シングルトンインスタンス
export const adminActionService = new AdminActionService(); 