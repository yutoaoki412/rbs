/**
 * 管理画面アクションサービス
 * 管理画面固有のアクションを管理
 * @version 2.0.0
 */

import { actionManager } from '../../../core/ActionManager.js';

export class AdminActionService {
  constructor() {
    this.currentTab = 'dashboard';
    this.initialized = false;
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ AdminActionService: 既に初期化済み');
      return;
    }

    console.log('🔧 AdminActionService: 初期化開始');
    this.#registerAdminActions();
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

      // 認証
      'logout': () => {
        if (confirm('ログアウトしますか？')) {
          this.logout();
        }
      },

      // デバッグ
      'show-news-debug': () => {
        this.showLPNewsDebug();
      }
    };

    actionManager.registerMultiple(adminActions);
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
    // ダッシュボード統計の更新
    this.updateDashboardStats();
  }

  /**
   * ニュース管理初期化
   * @private
   */
  #initializeNewsManagement() {
    // ニュース一覧の読み込み
    this.loadNewsList();
  }

  /**
   * レッスン状況初期化
   * @private
   */
  #initializeLessonStatus() {
    // レッスン状況フォームの読み込み
    this.loadLessonStatusToForm();
  }

  /**
   * 設定初期化
   * @private
   */
  #initializeSettings() {
    console.log('⚙️ 設定タブを初期化しました');
  }

  // 以下のメソッドは既存のActionHandlerから移行予定
  // 実装は段階的に行います

  clearNewsEditor() {
    console.log('📝 記事エディターをクリア（実装予定）');
  }

  previewNews() {
    console.log('👁️ 記事プレビュー（実装予定）');
  }

  saveNews() {
    console.log('💾 記事保存（実装予定）');
  }

  publishNews() {
    console.log('📤 記事公開（実装予定）');
  }

  testArticleService() {
    console.log('🧪 ArticleService テスト（実装予定）');
  }

  filterNewsList(element, params) {
    console.log('🔍 ニュース一覧フィルタリング（実装予定）', params);
  }

  refreshNewsList() {
    console.log('🔄 ニュース一覧更新（実装予定）');
  }

  refreshRecentArticles() {
    console.log('🔄 最近の記事更新（実装予定）');
  }

  loadLessonStatus() {
    console.log('📚 レッスン状況読み込み（実装予定）');
  }

  previewLessonStatus() {
    console.log('👁️ レッスン状況プレビュー（実装予定）');
  }

  updateLessonStatus() {
    console.log('📝 レッスン状況更新（実装予定）');
  }

  exportData() {
    console.log('📥 データエクスポート（実装予定）');
  }

  clearAllData() {
    console.log('🗑️ 全データクリア（実装予定）');
  }

  testSiteConnection() {
    console.log('🌐 サイト接続テスト（実装予定）');
  }

  resetLocalStorage() {
    console.log('🔄 LocalStorage リセット（実装予定）');
  }

  logout() {
    console.log('🚪 ログアウト（実装予定）');
  }

  showLPNewsDebug() {
    console.log('🐛 LP ニュースデバッグ（実装予定）');
  }

  updateDashboardStats() {
    console.log('📊 ダッシュボード統計更新（実装予定）');
  }

  loadNewsList() {
    console.log('📰 ニュース一覧読み込み（実装予定）');
  }

  loadLessonStatusToForm() {
    console.log('📚 レッスン状況フォーム読み込み（実装予定）');
  }

  /**
   * フィードバックメッセージを表示
   * @private
   * @param {string} message - メッセージ
   * @param {string} type - メッセージタイプ
   */
  #showFeedback(message, type = 'success') {
    // 暫定実装（後でNotificationServiceに置き換え）
    console.log(`${type === 'error' ? '❌' : '✅'} ${message}`);
    if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, type);
    }
  }
}

// シングルトンインスタンス
export const adminActionService = new AdminActionService(); 