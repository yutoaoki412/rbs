/**
 * 管理画面アクションサービス（完全統一版）
 * 全てのdata-actionを水平思考で統一処理
 * @version 5.0.0 - シンプル&クリーン統一版
 */

import { CONFIG } from '../../../shared/constants/config.js';

export class AdminActionService {
  constructor() {
    this.componentName = 'AdminActionService';
    this.initialized = false;
    this.currentTab = 'dashboard';
    this.currentNewsTab = 'editor';
    this.currentInstagramTab = 'posts';
    this.currentSettingsTab = 'data';
    
    // フラグ
    this.listenersAdded = false;
    
    // 統一ストレージキー（最適化版config.jsに対応）
    this.storageKeys = {
      articles: CONFIG.storage.keys.articles,    // 'rbs_articles' - 統一記事データ
      adminTab: CONFIG.storage.keys.adminTab,    // 'rbs_admin_tab'
      adminSession: CONFIG.storage.keys.adminSession, // 'rbs_admin_session'
      settings: CONFIG.storage.keys.settings,    // 'rbs_settings' - アプリ設定
      instagram: CONFIG.storage.keys.instagram,  // 'rbs_instagram' - Instagram投稿
      lessons: CONFIG.storage.keys.lessons,      // 'rbs_lessons' - レッスン状況（統一）
      lessonStatus: CONFIG.storage.keys.lessons, // 'rbs_lessons' - レッスン状況（統一）
      draft: CONFIG.storage.keys.draft,          // 'rbs_draft' - 下書きデータ
      cache: CONFIG.storage.keys.cache           // 'rbs_cache' - キャッシュデータ
    };
  }

  log(message, ...args) {
    console.log(`[${this.componentName}] ${message}`, ...args);
  }

  debug(message, ...args) {
    console.debug(`[${this.componentName}] ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[${this.componentName}] ${message}`, ...args);
  }

  /**
   * 初期化 - シンプル統一
   */
  async init() {
    if (this.initialized) return;

    try {
      // DOMが読み込まれるまで待機
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }

      // 統一イベントリスナー設定
      this.setupUnifiedEventListeners();

      // 初期タブ設定
      const savedTab = localStorage.getItem(this.storageKeys.adminTab) || 'dashboard';
      this.switchAdminTab(savedTab);

      this.initialized = true;
      this.log('初期化完了');

    } catch (error) {
      this.error('初期化エラー:', error);
      this.initialized = true; // エラーでもアプリ停止を防ぐ
    }
  }

  /**
   * 統一イベントリスナー設定 - 全data-actionを処理
   */
  setupUnifiedEventListeners() {
    if (this.listenersAdded) return;

    // 全クリックイベントを統一処理
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      const params = this.extractParams(target);
      
      this.executeAction(action, target, params);
    });

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('modal');
        if (modal && !modal.classList.contains('modal-hidden')) {
          this.closeModal();
        }
      }
    });

    this.listenersAdded = true;
    this.log('統一イベントリスナー設定完了');
  }

  /**
   * 要素からパラメータ抽出
   */
  extractParams(element) {
    const params = {};
    
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
        const key = attr.name.replace('data-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        params[key] = attr.value;
      }
    }
    
    return params;
  }

  /**
   * 統一アクション実行 - 全てのdata-actionを水平思考で処理
   */
  executeAction(action, element, params) {
    try {
      this.debug(`アクション実行: ${action}`, params);

      // タブ切り替え系
      if (action.includes('switch') && action.includes('tab')) {
        return this.handleTabSwitch(action, element, params);
      }

      // 記事管理系
      if (action.includes('news') || action.includes('article')) {
        return this.handleNewsAction(action, element, params);
      }

      // Instagram管理系
      if (action.includes('instagram')) {
        return this.handleInstagramAction(action, element, params);
      }

      // レッスン状況系
      if (action.includes('lesson')) {
        return this.handleLessonAction(action, element, params);
      }

      // 設定系
      if (action.includes('settings') || action.includes('admin')) {
        return this.handleSettingsAction(action, element, params);
      }

      // データ管理系
      if (action.includes('data') || action.includes('export') || action.includes('import')) {
        return this.handleDataAction(action, element, params);
      }

      // UI系
      if (action.includes('modal') || action.includes('show') || action.includes('close')) {
        return this.handleUIAction(action, element, params);
      }

      // その他の一般的なアクション
      this.handleGeneralAction(action, element, params);

    } catch (error) {
      this.error(`アクション実行エラー [${action}]:`, error);
      this.showNotification(`エラーが発生しました: ${action}`, 'error');
    }
  }

  /**
   * タブ切り替え処理
   */
  handleTabSwitch(action, element, params) {
    const tab = params.tab || element.dataset.tab;
    if (!tab) return;

    switch (action) {
      case 'switch-admin-tab':
        this.switchAdminTab(tab);
        break;
      case 'switch-news-tab':
        this.switchNewsTab(tab);
        break;
      case 'switch-instagram-tab':
        this.switchInstagramTab(tab);
        break;
      case 'switch-settings-tab':
        this.switchSettingsTab(tab);
        break;
    }
  }

  /**
   * 記事管理アクション処理
   */
  handleNewsAction(action, element, params) {
    switch (action) {
      case 'new-news-article':
        this.newNewsArticle();
        break;
      case 'clear-news-editor':
        this.clearNewsEditor();
        break;
      case 'preview-news':
        this.previewNews();
        break;
      case 'save-news':
        this.saveNews();
        break;
      case 'publish-news':
        this.publishNews();
        break;
      case 'refresh-news-list':
        this.refreshNewsList();
        break;
      case 'filter-news-list':
        this.filterNewsList(element.value);
        break;
      case 'insert-markdown':
        this.insertMarkdown(params.start, params.end);
        break;
      case 'show-writing-guide':
        this.showWritingGuide();
        break;
      case 'refresh-recent-articles':
        this.refreshRecentArticles();
        break;
    }
  }

  /**
   * Instagram管理アクション処理
   */
  handleInstagramAction(action, element, params) {
    switch (action) {
      case 'save-instagram-post':
        this.saveInstagramPost();
        break;
      case 'refresh-instagram-posts':
        this.refreshInstagramPosts();
        break;
      case 'filter-instagram-list':
        this.filterInstagramList(element.value);
        break;
      case 'save-instagram-settings':
        this.saveInstagramSettings();
        break;
      case 'test-instagram-settings':
        this.testInstagramSettings();
        break;
      case 'reset-instagram-settings':
        this.resetInstagramSettings();
        break;
    }
  }

  /**
   * レッスン状況アクション処理
   */
  handleLessonAction(action, element, params) {
    switch (action) {
      case 'load-lesson-status':
        this.loadLessonStatus();
        break;
      case 'update-lesson-status':
        this.updateLessonStatus();
        break;
      case 'preview-lesson-status':
        this.previewLessonStatus();
        break;
      case 'save-draft-lesson-status':
        this.saveDraftLessonStatus();
        break;
    }
  }

  /**
   * 設定アクション処理
   */
  handleSettingsAction(action, element, params) {
    switch (action) {
      case 'save-admin-settings':
        this.saveAdminSettings();
        break;
      case 'reset-admin-settings':
        this.resetAdminSettings();
        break;
      case 'test-site-connection':
        this.testSiteConnection();
        break;
    }
  }

  /**
   * データ管理アクション処理
   */
  handleDataAction(action, element, params) {
    switch (action) {
      case 'export-data':
        this.exportData();
        break;
      case 'import-data':
        this.importData();
        break;
      case 'backup-data':
        this.backupData();
        break;
      case 'clear-all-data':
        this.clearAllData();
        break;
      case 'refresh-data-stats':
        this.refreshDataStats();
        break;
      case 'clear-performance-data':
        this.clearPerformanceData();
        break;
      case 'reset-local-storage':
        this.resetLocalStorage();
        break;
    }
  }

  /**
   * UI関連アクション処理
   */
  handleUIAction(action, element, params) {
    switch (action) {
      case 'close-modal':
        this.closeModal();
        break;
      case 'show-debug-info':
        this.showDebugInfo();
        break;
      case 'show-news-debug':
        this.showNewsDebug();
        break;
      case 'show-instagram-debug':
        this.showInstagramDebug();
        break;
      case 'show-storage-info':
        this.showStorageInfo();
        break;
      case 'show-writing-guide':
        this.showWritingGuide();
        break;
    }
  }

  /**
   * 一般的なアクション処理
   */
  handleGeneralAction(action, element, params) {
    switch (action) {
      case 'logout':
        this.handleLogout();
        break;
      case 'toggle-notification-mode':
        this.toggleNotificationMode();
        break;
      case 'open-external':
        const url = params.url || element.dataset.url;
        if (url) window.open(url, '_blank');
        break;
      case 'preview-site':
        this.previewSite();
        break;
      case 'download-logs':
        this.downloadLogs();
        break;
      default:
        this.debug(`未対応のアクション: ${action}`);
    }
  }

  // ===========================================
  // タブ切り替えメソッド群（シンプル版）
  // ===========================================

  switchAdminTab(tabName) {
    this.debug(`管理タブ切り替え: ${tabName}`);
    
    // 全タブを非表示
    document.querySelectorAll('.admin-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // 全ナビを非アクティブ
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // 指定タブを表示
    const targetSection = document.getElementById(tabName);
    const targetNav = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetSection) targetSection.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    
    this.currentTab = tabName;
    localStorage.setItem(this.storageKeys.adminTab, tabName);
    
    // タブ固有の初期化
    this.initializeTab(tabName);
  }

  switchNewsTab(tab) {
    this.debug(`記事タブ切り替え: ${tab}`);
    
    document.querySelectorAll('.news-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    document.querySelectorAll('[data-action="switch-news-tab"]').forEach(item => {
      item.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`news-${tab}-tab`);
    const targetNav = document.querySelector(`[data-action="switch-news-tab"][data-tab="${tab}"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    
    this.currentNewsTab = tab;
  }

  switchInstagramTab(tab) {
    this.debug(`Instagramタブ切り替え: ${tab}`);
    
    document.querySelectorAll('.instagram-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    document.querySelectorAll('[data-action="switch-instagram-tab"]').forEach(item => {
      item.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`instagram-${tab}-tab`);
    const targetNav = document.querySelector(`[data-action="switch-instagram-tab"][data-tab="${tab}"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    
    this.currentInstagramTab = tab;
  }

  switchSettingsTab(tab) {
    this.debug(`設定タブ切り替え: ${tab}`);
    
    document.querySelectorAll('.settings-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    document.querySelectorAll('[data-action="switch-settings-tab"]').forEach(item => {
      item.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`settings-${tab}-tab`);
    const targetNav = document.querySelector(`[data-action="switch-settings-tab"][data-tab="${tab}"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    
    this.currentSettingsTab = tab;
    
    // 設定タブ固有の初期化
    if (tab === 'data') {
      this.refreshDataStats();
    }
  }

  initializeTab(tabName) {
    switch (tabName) {
      case 'dashboard':
        this.updateDashboardStats();
        break;
      case 'settings':
        this.switchSettingsTab('data');
        break;
      case 'news-management':
        this.switchNewsTab('editor');
        break;
      case 'instagram-management':
        this.switchInstagramTab('posts');
        break;
    }
  }

  // ===========================================
  // 記事管理メソッド群
  // ===========================================

  /**
   * 記事データの初期化（テストデータ作成）
   */
  initializeArticleData() {
    const existingArticles = localStorage.getItem(this.storageKeys.articles);
    
    // データが存在しない場合、テストデータを作成
    if (!existingArticles || existingArticles === '[]') {
      this.debug('記事データが存在しないため、テストデータを作成します');
      
      const testArticles = [
        {
          ...CONFIG.helpers.createDefaultArticle(),
          id: 'test-1',
          title: 'RBS陸上教室へようこそ',
          content: '## RBS陸上教室について\n\nRBS陸上教室は、子どもたちの健全な成長を支援する陸上競技教室です。\n\n### 特徴\n- 経験豊富なコーチ陣\n- 個人のレベルに合わせた指導\n- 楽しく学べる環境',
          category: 'announcement',
          status: 'published',
          summary: 'RBS陸上教室の紹介記事です。教室の特徴や理念について説明しています。',
          publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1日前
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          ...CONFIG.helpers.createDefaultArticle(),
          id: 'test-2',
          title: '体験会のお知らせ',
          content: '## 無料体験会開催！\n\n来週土曜日に無料体験会を開催します。\n\n### 詳細\n- 日時: 来週土曜日 10:00-12:00\n- 場所: 地域スポーツセンター\n- 対象: 小学生～中学生',
          category: 'event',
          status: 'published',
          summary: '無料体験会のお知らせです。ぜひお気軽にご参加ください。',
          publishedAt: new Date(Date.now() - 43200000).toISOString(), // 12時間前
          createdAt: new Date(Date.now() - 43200000).toISOString()
        },
        {
          ...CONFIG.helpers.createDefaultArticle(),
          id: 'test-3',
          title: '下書き記事のテスト',
          content: 'これは下書きの記事です。まだ公開されていません。',
          category: 'announcement',
          status: 'draft',
          summary: 'テスト用の下書き記事です。',
          createdAt: new Date().toISOString()
        }
      ];
      
      localStorage.setItem(this.storageKeys.articles, JSON.stringify(testArticles));
      this.debug(`テストデータを作成しました: ${testArticles.length}件`);
    }
  }

  newNewsArticle() {
    this.debug('新規記事作成');
    this.switchAdminTab('news-management');
    this.switchNewsTab('editor');
    this.clearNewsEditor();
    this.showNotification('新規記事エディタを開きました');
  }

  clearNewsEditor() {
    this.debug('記事エディタクリア');
    const titleInput = document.getElementById('news-title');
    const contentTextarea = document.getElementById('news-content');
    const categorySelect = document.getElementById('news-category');
    const dateInput = document.getElementById('news-date');
    const summaryTextarea = document.getElementById('news-summary');
    
    if (titleInput) titleInput.value = '';
    if (contentTextarea) contentTextarea.value = '';
    if (categorySelect) categorySelect.selectedIndex = 0;
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (summaryTextarea) summaryTextarea.value = '';
    
    this.showNotification('エディタをクリアしました');
  }

  previewNews() {
    this.debug('記事プレビュー');
    const title = document.getElementById('news-title')?.value || '';
    const content = document.getElementById('news-content')?.value || '';
    const summary = document.getElementById('news-summary')?.value || '';
    
    if (!title.trim() || !content.trim()) {
      this.showNotification('タイトルと本文を入力してください', 'warning');
      return;
    }
    
    const previewContent = `
      <div class="news-preview">
        <h2>${title}</h2>
        <div class="news-summary">${summary}</div>
        <div class="news-content">${this.markdownToHtml(content)}</div>
      </div>
    `;
    
    this.showModal('記事プレビュー', previewContent);
  }

  saveNews() {
    this.debug('記事保存（下書き）');
    const newsData = this.getNewsFormData();
    
    if (!newsData.title.trim() || !newsData.content.trim()) {
      this.showNotification('タイトルと本文を入力してください', 'warning');
      return;
    }
    
    newsData.status = 'draft';
    newsData.updatedAt = new Date().toISOString();
    
    this.saveArticleToStorage(newsData);
    this.showNotification('記事を下書き保存しました');
  }

  publishNews() {
    this.debug('記事公開');
    const newsData = this.getNewsFormData();
    
    if (!newsData.title.trim() || !newsData.content.trim() || !newsData.summary.trim()) {
      this.showNotification('すべての必須項目を入力してください', 'warning');
      return;
    }
    
    newsData.status = 'published';
    newsData.publishedAt = new Date().toISOString();
    newsData.updatedAt = new Date().toISOString();
    
    this.saveArticleToStorage(newsData);
    this.showNotification('記事を公開しました', 'success');
    this.refreshRecentArticles();
  }

  getNewsFormData() {
    const defaultArticle = CONFIG.helpers.createDefaultArticle();
    
    return {
      ...defaultArticle,
      title: document.getElementById('news-title')?.value || '',
      content: document.getElementById('news-content')?.value || '',
      category: document.getElementById('news-category')?.value || 'announcement',
      date: document.getElementById('news-date')?.value || new Date().toISOString().split('T')[0],
      summary: document.getElementById('news-summary')?.value || ''
    };
  }

  saveArticleToStorage(articleData) {
    try {
      const articles = JSON.parse(localStorage.getItem(this.storageKeys.articles) || '[]');
      const existingIndex = articles.findIndex(article => article.id === articleData.id);
      
      if (existingIndex >= 0) {
        articles[existingIndex] = articleData;
      } else {
        articles.unshift(articleData);
      }
      
      localStorage.setItem(this.storageKeys.articles, JSON.stringify(articles));
      
    } catch (error) {
      this.error('記事保存エラー:', error);
      throw error;
    }
  }

  refreshRecentArticles() {
    this.debug('最近の記事更新');
    try {
      // データの初期化確認
      this.initializeArticleData();
      
      const articles = JSON.parse(localStorage.getItem(this.storageKeys.articles) || '[]');
      const recentContainer = document.querySelector('.recent-articles-list');
      
      this.debug(`記事データ: ${articles.length}件の記事を取得`);
      
      if (!recentContainer) {
        this.debug('最近の記事コンテナが見つかりません');
        return;
      }
      
      const recentArticles = articles
        .filter(article => article.status === 'published')
        .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
        .slice(0, 5);
      
      this.debug(`公開記事: ${recentArticles.length}件`);
      
      recentContainer.innerHTML = recentArticles.length > 0 
        ? recentArticles.map(article => `
            <div class="article-item">
              <div class="article-title">${article.title}</div>
              <div class="article-date">${CONFIG.helpers.formatDate(article.publishedAt || article.date || article.createdAt)}</div>
              <div class="article-category">${CONFIG.helpers.getCategoryInfo(article.category).name}</div>
            </div>
          `).join('')
        : '<div class="no-articles">公開済みの記事がありません</div>';
        
    } catch (error) {
      this.error('最近の記事更新エラー:', error);
      const recentContainer = document.querySelector('.recent-articles-list');
      if (recentContainer) {
        recentContainer.innerHTML = '<div class="no-articles error">記事の読み込みに失敗しました</div>';
      }
    }
  }

  refreshNewsList() {
    this.debug('記事一覧更新');
    // 記事一覧の更新処理を実装
    this.showNotification('記事一覧を更新しました');
  }

  filterNewsList(filterValue) {
    this.debug(`記事一覧フィルタ: ${filterValue}`);
    // フィルタ処理を実装
  }

  insertMarkdown(start, end) {
    const textarea = document.getElementById('news-content');
    if (!textarea) return;
    
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    const newText = start + selectedText + end;
    
    const beforeText = textarea.value.substring(0, textarea.selectionStart);
    const afterText = textarea.value.substring(textarea.selectionEnd);
    
    textarea.value = beforeText + newText + afterText;
    textarea.focus();
    
    const newCursorPos = textarea.selectionStart + start.length + selectedText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }

  showWritingGuide() {
    const guideContent = `
      <div class="writing-guide">
        <h3>記事作成ガイド</h3>
        <div class="guide-section">
          <h4>マークダウン記法</h4>
          <ul>
            <li><strong>**太字**</strong> - 重要な内容の強調</li>
            <li><strong>## 見出し</strong> - セクションの区切り</li>
            <li><strong>- リスト</strong> - 箇条書き</li>
            <li><strong>[リンク](URL)</strong> - 外部リンク</li>
          </ul>
        </div>
        <div class="guide-section">
          <h4>記事作成のコツ</h4>
          <ul>
            <li>タイトルは具体的で分かりやすく</li>
            <li>概要で記事の要点を簡潔に</li>
            <li>本文は読みやすい段落に分割</li>
          </ul>
        </div>
      </div>
    `;
    
    this.showModal('記事作成ガイド', guideContent);
  }

  // ===========================================
  // その他の機能メソッド群
  // ===========================================

  updateDashboardStats() {
    this.debug('ダッシュボード統計更新');
    try {
      // データの初期化確認
      this.initializeArticleData();
      
      const articles = JSON.parse(localStorage.getItem(this.storageKeys.articles) || '[]');
      const publishedCount = articles.filter(a => a.status === 'published').length;
      const draftCount = articles.filter(a => a.status === 'draft').length;
      
      this.debug(`統計データ: 公開${publishedCount}件、下書き${draftCount}件`);
      
      // 統計カードの更新（より確実な方法）
      const statCards = document.querySelectorAll('.stat-card');
      statCards.forEach((card, index) => {
        const statNumber = card.querySelector('.stat-number');
        if (statNumber) {
          switch (index) {
            case 0: // 公開記事数
              statNumber.textContent = publishedCount;
              break;
            case 1: // 下書き記事数
              statNumber.textContent = draftCount;
              break;
            case 2: // 総記事数
              statNumber.textContent = articles.length;
              break;
            case 3: // 今月の記事数
              const thisMonth = new Date().getMonth();
              const thisMonthCount = articles.filter(a => {
                const articleDate = new Date(a.createdAt);
                return articleDate.getMonth() === thisMonth;
              }).length;
              statNumber.textContent = thisMonthCount;
              break;
          }
        }
      });
      
      this.refreshRecentArticles();
      
    } catch (error) {
      this.error('ダッシュボード統計更新エラー:', error);
    }
  }

  refreshDataStats() {
    this.debug('データ統計更新');
    try {
      const articles = JSON.parse(localStorage.getItem(this.storageKeys.articles) || '[]');
      const settings = JSON.parse(localStorage.getItem(this.storageKeys.adminSettings) || '{}');
      
      const statsContainer = document.querySelector('.data-stats');
      if (!statsContainer) return;
      
      const totalSize = new Blob([JSON.stringify({ articles, settings })]).size;
      const sizeInKB = (totalSize / 1024).toFixed(1);
      
      statsContainer.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">記事数:</span>
          <span class="stat-value">${articles.length}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">データサイズ:</span>
          <span class="stat-value">${sizeInKB} KB</span>
        </div>
      `;
      
    } catch (error) {
      this.error('データ統計更新エラー:', error);
    }
  }

  exportData() {
    this.debug('データエクスポート');
    try {
      const data = {
        articles: JSON.parse(localStorage.getItem(this.storageKeys.articles) || '[]'),
        settings: JSON.parse(localStorage.getItem(this.storageKeys.adminSettings) || '{}'),
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rbs-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification('データをエクスポートしました');
      
    } catch (error) {
      this.error('データエクスポートエラー:', error);
      this.showNotification('エクスポートに失敗しました', 'error');
    }
  }

  importData() {
    this.debug('データインポート');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.articles) {
            localStorage.setItem(this.storageKeys.articles, JSON.stringify(data.articles));
          }
          if (data.settings) {
            localStorage.setItem(this.storageKeys.adminSettings, JSON.stringify(data.settings));
          }
          
          this.showNotification('データをインポートしました');
          this.refreshDataStats();
          this.updateDashboardStats();
          
        } catch (error) {
          this.error('データインポートエラー:', error);
          this.showNotification('インポートに失敗しました', 'error');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }

  clearAllData() {
    if (!confirm('全データを削除しますか？この操作は取り消せません。')) return;
    
    this.debug('全データクリア');
    
    Object.values(this.storageKeys).forEach(key => {
      localStorage.removeItem(key);
    });
    
    this.showNotification('全データを削除しました', 'warning');
    this.refreshDataStats();
    this.updateDashboardStats();
  }

  handleLogout() {
    if (confirm('ログアウトしますか？')) {
      this.debug('ログアウト');
      // ログアウト処理
      window.location.href = '../index.html';
    }
  }

  toggleNotificationMode() {
    const current = localStorage.getItem(this.storageKeys.notificationMode) || 'on';
    const newMode = current === 'on' ? 'off' : 'on';
    localStorage.setItem(this.storageKeys.notificationMode, newMode);
    
    const toggle = document.querySelector('[data-action="toggle-notification-mode"]');
    if (toggle) {
      toggle.textContent = newMode === 'on' ? '通知OFF' : '通知ON';
    }
    
    this.showNotification(`通知を${newMode === 'on' ? '有効' : '無効'}にしました`);
  }

  saveAdminSettings() {
    this.debug('管理設定保存');
    
    const settings = {
      autoSaveInterval: document.getElementById('auto-save-interval')?.value || '5',
      themePreference: document.getElementById('theme-preference')?.value || 'system',
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(this.storageKeys.adminSettings, JSON.stringify(settings));
    this.showNotification('設定を保存しました');
  }

  resetAdminSettings() {
    if (!confirm('設定をリセットしますか？')) return;
    
    localStorage.removeItem(this.storageKeys.adminSettings);
    this.showNotification('設定をリセットしました');
    
    // フォームのリセット
    const form = document.querySelector('#settings-system-tab form');
    if (form) form.reset();
  }

  testSiteConnection() {
    this.debug('サイト接続テスト');
    this.showNotification('接続テスト中...', 'info');
    
    // 簡単な接続テスト
    fetch('../index.html')
      .then(() => this.showNotification('接続テスト成功'))
      .catch(() => this.showNotification('接続テスト失敗', 'error'));
  }

  showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    if (!modal || !modalTitle || !modalContent) return;
    
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    modal.classList.remove('modal-hidden');
  }

  closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
      modal.classList.add('modal-hidden');
    }
  }

  showNotification(message, type = 'success') {
    // 既存の通知を削除
    const existing = document.querySelector('.admin-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `admin-notification admin-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'info' ? '#3b82f6' : '#10b981'};
      color: white;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }

  // ユーティリティメソッド
  markdownToHtml(markdown) {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^## (.*$)/gm, '<h3>$1</h3>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/g, '<br>');
  }



  // プレースホルダーメソッド（必要に応じて実装）
  backupData() { this.showNotification('バックアップ機能は準備中です', 'info'); }
  previewSite() { this.showNotification('サイトプレビュー機能は準備中です', 'info'); }
  downloadLogs() { this.showNotification('ログダウンロード機能は準備中です', 'info'); }
  clearPerformanceData() { this.showNotification('パフォーマンスデータをクリアしました'); }
  resetLocalStorage() { this.clearAllData(); }
  showDebugInfo() { this.showNotification('デバッグ情報機能は準備中です', 'info'); }
  showNewsDebug() { this.showNotification('記事デバッグ機能は準備中です', 'info'); }
  showInstagramDebug() { this.showNotification('Instagramデバッグ機能は準備中です', 'info'); }
  showStorageInfo() { this.showNotification('ストレージ情報機能は準備中です', 'info'); }
  
  // Instagram関連プレースホルダー
  saveInstagramPost() { this.showNotification('Instagram投稿保存機能は準備中です', 'info'); }
  refreshInstagramPosts() { this.showNotification('Instagram投稿更新機能は準備中です', 'info'); }
  filterInstagramList() { this.showNotification('Instagramフィルタ機能は準備中です', 'info'); }
  saveInstagramSettings() { this.showNotification('Instagram設定保存機能は準備中です', 'info'); }
  testInstagramSettings() { this.showNotification('Instagram設定テスト機能は準備中です', 'info'); }
  resetInstagramSettings() { this.showNotification('Instagram設定リセット機能は準備中です', 'info'); }
  
  // レッスン関連プレースホルダー
  // ===========================================
  // レッスン状況管理機能（統合版）
  // ===========================================

  /**
   * レッスン状況読み込み
   */
  async loadLessonStatus() {
    try {
      const { getLessonStatusStorageService } = await import('../../../shared/services/LessonStatusStorageService.js');
      const lessonService = getLessonStatusStorageService();
      
      if (!lessonService.initialized) {
        await lessonService.init();
      }
      
      const todayStatus = lessonService.getTodayStatus();
      this.displayLessonStatusInForm(todayStatus);
      this.showNotification('レッスン状況を読み込みました', 'success');
      
    } catch (error) {
      this.error('レッスン状況読み込みエラー:', error);
      this.showNotification('レッスン状況の読み込みに失敗しました', 'error');
    }
  }

  /**
   * レッスン状況更新（公開）
   */
  async updateLessonStatus() {
    try {
      const formData = this.getLessonStatusFormData();
      if (!formData) return;

      const { getLessonStatusStorageService } = await import('../../../shared/services/LessonStatusStorageService.js');
      const lessonService = getLessonStatusStorageService();
      
      if (!lessonService.initialized) {
        await lessonService.init();
      }

      const result = await lessonService.saveStatus(formData);
      if (result.success) {
        this.showNotification('レッスン状況を公開しました', 'success');
        this.updateDashboardStats(); // ダッシュボード更新
      } else {
        this.showNotification(`保存に失敗しました: ${result.message}`, 'error');
      }
      
    } catch (error) {
      this.error('レッスン状況更新エラー:', error);
      this.showNotification('レッスン状況の更新に失敗しました', 'error');
    }
  }

  /**
   * レッスン状況プレビュー
   */
  async previewLessonStatus() {
    try {
      const formData = this.getLessonStatusFormData();
      if (!formData) return;

      const previewHTML = this.generateLessonStatusPreviewHTML(formData);
      this.showModal('レッスン状況プレビュー', previewHTML);
      
    } catch (error) {
      this.error('レッスン状況プレビューエラー:', error);
      this.showNotification('プレビューの生成に失敗しました', 'error');
    }
  }

  /**
   * レッスン状況下書き保存
   */
  async saveDraftLessonStatus() {
    try {
      const formData = this.getLessonStatusFormData();
      if (!formData) return;

      // 下書きとして一時保存
      const draftKey = `${this.storageKeys.lessons}_draft`;
      localStorage.setItem(draftKey, JSON.stringify(formData));
      
      this.showNotification('レッスン状況を下書き保存しました', 'success');
      
    } catch (error) {
      this.error('レッスン状況下書き保存エラー:', error);
      this.showNotification('下書きの保存に失敗しました', 'error');
    }
  }

  /**
   * フォームからレッスン状況データを取得
   * @returns {Object|null} レッスン状況データ
   */
  getLessonStatusFormData() {
    try {
      // 基本的なフォーム要素を取得（実際の管理画面HTMLに合わせて調整が必要）
      const globalStatus = document.querySelector('#lesson-global-status')?.value || 'scheduled';
      const globalMessage = document.querySelector('#lesson-global-message')?.value || '';
      
      const basicStatus = document.querySelector('#lesson-basic-status')?.value || 'scheduled';
      const basicMessage = document.querySelector('#lesson-basic-message')?.value || '';
      
      const advanceStatus = document.querySelector('#lesson-advance-status')?.value || 'scheduled';
      const advanceMessage = document.querySelector('#lesson-advance-message')?.value || '';

      return {
        globalStatus,
        message: globalMessage,
        courses: {
          basic: {
            name: 'ベーシックコース（年長〜小3）',
            time: '17:00-17:50',
            status: basicStatus,
            message: basicMessage
          },
          advance: {
            name: 'アドバンスコース（小4〜小6）',
            time: '18:00-18:50',
            status: advanceStatus,
            message: advanceMessage
          }
        },
        updatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      this.error('フォームデータ取得エラー:', error);
      this.showNotification('フォームデータの取得に失敗しました', 'error');
      return null;
    }
  }

  /**
   * レッスン状況をフォームに表示
   * @param {Object} statusData - レッスン状況データ
   */
  displayLessonStatusInForm(statusData) {
    try {
      if (!statusData) return;

      // グローバル状況
      const globalStatusSelect = document.querySelector('#lesson-global-status');
      const globalMessageTextarea = document.querySelector('#lesson-global-message');
      
      if (globalStatusSelect) globalStatusSelect.value = statusData.globalStatus || 'scheduled';
      if (globalMessageTextarea) globalMessageTextarea.value = statusData.message || '';

      // コース別状況
      if (statusData.courses?.basic) {
        const basicStatusSelect = document.querySelector('#lesson-basic-status');
        const basicMessageTextarea = document.querySelector('#lesson-basic-message');
        if (basicStatusSelect) basicStatusSelect.value = statusData.courses.basic.status || 'scheduled';
        if (basicMessageTextarea) basicMessageTextarea.value = statusData.courses.basic.message || '';
      }

      if (statusData.courses?.advance) {
        const advanceStatusSelect = document.querySelector('#lesson-advance-status');
        const advanceMessageTextarea = document.querySelector('#lesson-advance-message');
        if (advanceStatusSelect) advanceStatusSelect.value = statusData.courses.advance.status || 'scheduled';
        if (advanceMessageTextarea) advanceMessageTextarea.value = statusData.courses.advance.message || '';
      }

    } catch (error) {
      this.error('フォーム表示エラー:', error);
    }
  }

  /**
   * レッスン状況プレビューHTML生成
   * @param {Object} statusData - レッスン状況データ
   * @returns {string} プレビューHTML
   */
  generateLessonStatusPreviewHTML(statusData) {
    const statusDef = this.getLessonStatusDefinition(statusData.globalStatus);
    
    return `
      <div class="lesson-status-preview">
        <div class="preview-header">
          <h3>レッスン開催状況プレビュー</h3>
          <p class="preview-date">${new Date().toLocaleDateString('ja-JP')}</p>
        </div>
        
        <div class="global-status-display">
          <div class="status-indicator ${statusData.globalStatus}">
            <i class="${statusDef.icon}"></i>
            <span class="status-text">${statusDef.displayText}</span>
          </div>
          ${statusData.message ? `<div class="global-message">${statusData.message}</div>` : ''}
        </div>
        
        <div class="courses-grid">
          ${Object.entries(statusData.courses).map(([key, course]) => {
            const courseDef = this.getLessonStatusDefinition(course.status);
            return `
              <div class="course-preview-item">
                <div class="course-header">
                  <h4>${course.name}</h4>
                  <span class="course-time">${course.time}</span>
                </div>
                <div class="course-status">
                  <span class="status-badge ${course.status}">${courseDef.displayText}</span>
                  ${course.message ? `<p class="course-message">${course.message}</p>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="preview-footer">
          <p class="preview-note">
            <i class="fas fa-info-circle"></i>
            この内容でLP側に表示されます
          </p>
        </div>
      </div>
    `;
  }

  /**
   * レッスン状況定義を取得
   * @param {string} statusKey - ステータスキー
   * @returns {Object} ステータス定義
   */
  getLessonStatusDefinition(statusKey) {
    const definitions = {
      'scheduled': {
        displayText: '通常開催',
        icon: 'fas fa-check-circle',
        color: '#27ae60'
      },
      'cancelled': {
        displayText: '中止',
        icon: 'fas fa-times-circle',
        color: '#e74c3c'
      },
      'indoor': {
        displayText: '室内開催',
        icon: 'fas fa-home',
        color: '#f39c12'
      },
      'postponed': {
        displayText: '延期',
        icon: 'fas fa-clock',
        color: '#3498db'
      }
    };
    
    return definitions[statusKey] || definitions['scheduled'];
  }
}

// デフォルトエクスポート
export default AdminActionService;
export const adminActionService = new AdminActionService();