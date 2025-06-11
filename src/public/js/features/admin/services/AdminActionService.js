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
   * 統一イベントリスナー設定 - シンプル＆クリーン
   */
  setupUnifiedEventListeners() {
    if (this.listenersAdded) return;

    // シンプルなイベントデリゲーション
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    this.listenersAdded = true;
    this.log('統一イベントリスナー設定完了');
  }

  /**
   * クリックイベント処理 - シンプル統一
   */
  handleClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    const action = target.dataset.action;
    const params = this.getElementParams(target);
    
    this.executeAction(action, params, target);
  }

  /**
   * キーボードイベント処理
   */
  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.closeModal();
    }
  }

  /**
   * 要素からパラメータ抽出 - シンプル版
   */
  getElementParams(element) {
    const params = {};
    
    // data-*属性を全て取得
    Object.entries(element.dataset).forEach(([key, value]) => {
      if (key !== 'action') params[key] = value;
    });
    
    return params;
  }

  /**
   * 統一アクション実行 - 動的メソッド呼び出し
   */
  executeAction(action, params = {}, element = null) {
    try {
      // アクション名を正規化してメソッド名に変換
      const methodName = this.getMethodName(action);
      
      if (typeof this[methodName] === 'function') {
        this[methodName](params, element);
      } else {
        this.log(`未対応のアクション: ${action} -> ${methodName}`);
      }
    } catch (error) {
      this.error(`アクション実行エラー [${action}]:`, error);
      this.showNotification(`エラーが発生しました: ${action}`, 'error');
    }
  }

  /**
   * アクション名をメソッド名に変換
   */
  getMethodName(action) {
    // kebab-case を camelCase に変換
    return action.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  // ===========================================
  // アクションメソッド群 - シンプル＆統一
  // ===========================================

  newNewsArticle() {
    this.switchAdminTab('news-management');
    setTimeout(() => {
      this.switchNewsTab('editor');
      this.clearNewsEditor();
      this.showNotification('新規記事エディタを開きました');
    }, 100);
  }

  clearNewsEditor() {
    ['news-title', 'news-content', 'news-summary'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    
    const categoryEl = document.getElementById('news-category');
    const dateEl = document.getElementById('news-date');
    
    if (categoryEl) categoryEl.selectedIndex = 0;
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    
    this.showNotification('エディタをクリアしました');
  }

  previewNews(params) {
    this.debug('プレビューボタンクリック:', params);
    
    const articleId = params?.id;
    let article = null;

    if (articleId) {
      // 既存記事のプレビュー
      const articles = this.getArticles();
      article = articles.find(a => a.id === articleId);
      
      if (!article) {
        this.showNotification('記事が見つかりません', 'error');
        return;
      }
      this.debug('既存記事をプレビュー:', article);
    } else {
      // エディタからのプレビュー
      article = this.getEditorData();
      this.debug('エディタデータ:', article);
      
      if (!article.title.trim() || !article.content.trim()) {
        this.showNotification('タイトルと本文を入力してください', 'warning');
        return;
      }
    }

    this.showArticlePreview(article, !!articleId);
  }

  saveNews() {
    const article = this.getEditorData();
    if (!article.title.trim() || !article.content.trim()) {
      this.showNotification('タイトルと本文を入力してください', 'warning');
      return;
    }

    article.status = 'draft';
    article.updatedAt = new Date().toISOString();
    
    this.saveArticle(article);
    this.showNotification('記事を下書き保存しました');
    
    // フォームをクリアしてダッシュボードに戻る
    setTimeout(() => {
      this.clearNewsEditor();
      this.switchAdminTab('dashboard');
    }, 1000);
  }

  publishNews(params) {
    const articleId = params?.id;

    if (articleId) {
      // 既存記事の公開
      this.publishExistingArticle(articleId);
    } else {
      // エディタからの公開
      this.publishNewArticle();
    }
  }

  editNews(params) {
    const articleId = params?.id;
    if (!articleId) {
      this.showNotification('記事IDが取得できませんでした', 'error');
      return;
    }

    const articles = this.getArticles();
    const article = articles.find(a => a.id === articleId);
    
    if (!article) {
      this.showNotification('記事が見つかりません', 'error');
      return;
    }

    this.loadArticleToEditor(article);
    this.switchAdminTab('news-management');
    this.switchNewsTab('editor');
    this.showNotification('記事を編集モードで読み込みました');
  }

  deleteNews(params) {
    const articleId = params?.id;
    if (!articleId || !confirm('この記事を削除しますか？この操作は取り消せません。')) {
      return;
    }

    let articles = this.getArticles();
    const initialCount = articles.length;
    
    articles = articles.filter(a => a.id !== articleId);
    
    if (articles.length === initialCount) {
      this.showNotification('削除対象の記事が見つかりません', 'error');
      return;
    }

    this.saveArticles(articles);
    this.refreshAllViews();
    this.showNotification('記事を削除しました');
  }

  unpublishNews(params) {
    const articleId = params?.id;
    if (!articleId || !confirm('この記事を非公開にしますか？')) {
      return;
    }

    const articles = this.getArticles();
    const article = articles.find(a => a.id === articleId);
    
    if (!article) {
      this.showNotification('記事が見つかりません', 'error');
      return;
    }

    article.status = 'draft';
    article.unpublishedAt = new Date().toISOString();
    
    this.saveArticles(articles);
    this.refreshAllViews();
    this.showNotification('記事を非公開にしました');
  }

  refreshNewsList() {
    this.initializeArticleData();
    const articles = this.getArticles();
    const container = document.querySelector('#news-list');
    
    if (!container) return;

    container.innerHTML = articles.length > 0 
      ? articles.map(article => this.createArticleCard(article, 'list')).join('')
      : '<div class="empty-state"><i class="fas fa-newspaper"></i><p>記事がありません</p></div>';
  }

  refreshRecentArticles() {
    this.initializeArticleData();
    const articles = this.getArticles()
      .filter(a => a.status === 'published')
      .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
      .slice(0, 5);
    
    const container = document.querySelector('#recent-articles');
    
    if (!container) return;

    container.innerHTML = articles.length > 0 
      ? articles.map(article => this.createArticleCard(article, 'recent')).join('')
      : '<div class="empty-state"><i class="fas fa-newspaper"></i><p>公開済みの記事がありません</p></div>';
  }

  // タブ切り替え系
  switchAdminTab(params) {
    const tabName = typeof params === 'string' ? params : params?.tab;
    if (!tabName) return;

    document.querySelectorAll('.admin-section').forEach(section => {
      section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(nav => {
      nav.classList.remove('active');
    });

    const targetSection = document.getElementById(tabName);
    const targetNav = document.querySelector(`[data-tab="${tabName}"]`);

    if (targetSection) targetSection.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    this.currentTab = tabName;
    this.initializeTab(tabName);
    localStorage.setItem(this.storageKeys.adminTab, tabName);
  }

  switchNewsTab(params) {
    const tab = typeof params === 'string' ? params : params?.tab;
    if (!tab) return;

    document.querySelectorAll('.sub-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    
    document.querySelectorAll('.news-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`news-${tab}-tab`)?.classList.add('active');
    
    this.currentNewsTab = tab;
    
    if (tab === 'list') {
      setTimeout(() => this.refreshNewsList(), 100);
    }
  }

  // その他のアクション
  filterNewsList(params, element) {
    const filterValue = element?.value || 'all';
    const newsItems = document.querySelectorAll('.news-card.admin-card.unified-view');
    
    newsItems.forEach(item => {
      const status = item.dataset.status;
      const shouldShow = filterValue === 'all' || status === filterValue;
      item.style.display = shouldShow ? 'block' : 'none';
    });
  }

  insertMarkdown(params) {
    const textarea = document.getElementById('news-content');
    if (!textarea || !params.start) return;
    
    const { start, end = '' } = params;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    const newText = start + selectedText + end;
    
    const beforeText = textarea.value.substring(0, textarea.selectionStart);
    const afterText = textarea.value.substring(textarea.selectionEnd);
    
    textarea.value = beforeText + newText + afterText;
    textarea.focus();
    
    const newCursorPos = textarea.selectionStart + start.length + selectedText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }

  // ===========================================
  // タブ切り替えメソッド群（シンプル版）
  // ===========================================

  initializeTab(tabName) {
    this.debug(`タブ初期化: ${tabName}`);
    
    // データ初期化を先に実行
    this.initializeArticleData();
    
    switch (tabName) {
      case 'dashboard':
        this.updateDashboardStats();
        this.refreshRecentArticles();
        break;
      case 'settings':
        this.switchSettingsTab('data');
        break;
      case 'news-management':
        this.switchNewsTab('editor');
        this.refreshNewsList();
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

  getNewsFormData() {
    const currentDate = new Date().toISOString();
    const id = document.getElementById('news-id')?.value || this.generateId();
    
    return {
      id: id,
      title: document.getElementById('news-title')?.value || '',
      content: document.getElementById('news-content')?.value || '',
      category: document.getElementById('news-category')?.value || 'announcement',
      date: document.getElementById('news-date')?.value || new Date().toISOString().split('T')[0],
      summary: document.getElementById('news-summary')?.value || '',
      featured: document.getElementById('news-featured')?.checked || false,
      status: 'draft',
      createdAt: currentDate,
      updatedAt: currentDate
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

  getArticles() {
    return JSON.parse(localStorage.getItem(this.storageKeys.articles) || '[]');
  }

  saveArticles(articles) {
    localStorage.setItem(this.storageKeys.articles, JSON.stringify(articles));
  }

  getEditorData() {
    return this.getNewsFormData();
  }

  showArticlePreview(article, isExisting) {
    this.debug('プレビュー表示:', { article, isExisting });
    const previewHTML = this.generateArticlePreviewHTML(article, isExisting);
    this.debug('プレビューHTML生成完了');
    this.showModal('記事プレビュー', previewHTML);
  }

  generateArticlePreviewHTML(article, isExisting) {
    const categoryInfo = this.getCategoryInfo(article.category);
    const previewDate = article.publishedAt || article.date || article.createdAt || new Date().toISOString();
    
    const previewHTML = `
      <div class="article-preview">
        <div class="article-header">
          <div class="article-meta">
            <span class="article-date">
              <i class="fas fa-calendar"></i>
              ${this.formatDate(previewDate)}
            </span>
            <span class="news-category ${categoryInfo.class}">${categoryInfo.name}</span>
          </div>
          <h1 class="article-title">${this.escapeHtml(article.title)}</h1>
          ${article.summary ? `<div class="article-summary">
            <div class="summary-content">${this.escapeHtml(article.summary)}</div>
          </div>` : ''}
        </div>
        <div class="article-content">${this.markdownToHtml(article.content)}</div>
      </div>
    `;
    return previewHTML;
  }

  // ===========================================
  // ヘルパーメソッド群
  // ===========================================

  getCategoryInfo(category) {
    const categories = {
      announcement: { name: 'お知らせ', class: 'announcement' },
      event: { name: '体験会', class: 'event' },
      media: { name: 'メディア', class: 'media' },
      important: { name: '重要', class: 'important' }
    };
    return categories[category] || { name: 'その他', class: 'other' };
  }

  getStatusInfo(status) {
    const statuses = {
      published: { name: '公開中', class: 'status-published' },
      draft: { name: '下書き', class: 'status-draft' },
      scheduled: { name: '予約投稿', class: 'status-scheduled' }
    };
    return statuses[status] || { name: '不明', class: 'status-unknown' };
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    if (!dateString) return '不明';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return '不明';
    }
  }

  // ===========================================
  // その他の機能メソッド群
  // ===========================================

  updateDashboardStats() {
    this.debug('ダッシュボード統計更新');
    try {
      // データの初期化確認
      this.initializeArticleData();
      
      const articles = this.getArticles();
      const publishedCount = articles.filter(a => a.status === 'published').length;
      const draftCount = articles.filter(a => a.status === 'draft').length;
      
      this.debug(`統計データ: 公開${publishedCount}件、下書き${draftCount}件`);
      
      // 統計カードの更新（IDベースでより確実に）
      const statElements = {
        published: document.querySelector('#stat-published'),
        drafts: document.querySelector('#stat-drafts'),
        instagramVisible: document.querySelector('#stat-instagram-visible'),
        instagramHidden: document.querySelector('#stat-instagram-hidden')
      };
      
      // 公開記事数
      if (statElements.published) {
        statElements.published.textContent = publishedCount;
        this.debug(`公開記事数を更新: ${publishedCount}`);
      }
      
      // 下書き記事数
      if (statElements.drafts) {
        statElements.drafts.textContent = draftCount;
        this.debug(`下書き記事数を更新: ${draftCount}`);
      }
      
      // Instagram統計（準備中）
      if (statElements.instagramVisible) {
        statElements.instagramVisible.textContent = '0';
      }
      if (statElements.instagramHidden) {
        statElements.instagramHidden.textContent = '0';
      }
      
      this.refreshRecentArticles();
      
    } catch (error) {
      this.error('ダッシュボード統計更新エラー:', error);
    }
  }

  refreshDataStats() {
    this.debug('データ統計更新');
    try {
      const articles = this.getArticles();
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
        articles: this.getArticles(),
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
            this.saveArticles(data.articles);
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
    this.debug('モーダル表示開始:', title);
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-body'); // HTMLと一致させる
    
    this.debug('モーダル要素:', { modal: !!modal, modalTitle: !!modalTitle, modalContent: !!modalContent });
    
    if (!modal || !modalTitle || !modalContent) {
      this.error('モーダル要素が見つかりません');
      return;
    }
    
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    
    // CSSと一致させるためにshowクラスを追加
    modal.classList.remove('modal-hidden');
    modal.classList.add('show');
    
    this.debug('モーダル表示完了');
  }

  closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
      modal.classList.remove('show');
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

  saveArticle(article) {
    let articles = this.getArticles();
    const existingIndex = articles.findIndex(a => a.id === article.id);
    
    if (existingIndex >= 0) {
      articles[existingIndex] = article;
    } else {
      article.id = article.id || this.generateId();
      article.createdAt = article.createdAt || new Date().toISOString();
      articles.push(article);
    }
    
    this.saveArticles(articles);
    this.refreshAllViews();
  }

  publishNewArticle() {
    const article = this.getEditorData();
    if (!article.title.trim() || !article.content.trim() || !article.summary.trim()) {
      this.showNotification('すべての必須項目を入力してください', 'warning');
      return;
    }

    article.status = 'published';
    article.publishedAt = new Date().toISOString();
    article.updatedAt = new Date().toISOString();
    
    this.saveArticle(article);
    this.showNotification('記事を公開しました', 'success');
    
    // フォームをクリアしてダッシュボードに戻る
    setTimeout(() => {
      this.clearNewsEditor();
      this.switchAdminTab('dashboard');
    }, 1000);
  }

  publishExistingArticle(articleId) {
    if (!confirm('この記事を公開しますか？')) return;

    const articles = this.getArticles();
    const article = articles.find(a => a.id === articleId);
    
    if (!article) {
      this.showNotification('記事が見つかりません', 'error');
      return;
    }

    article.status = 'published';
    article.publishedAt = new Date().toISOString();
    article.updatedAt = new Date().toISOString();
    
    this.saveArticles(articles);
    this.refreshAllViews();
    this.showNotification('記事を公開しました', 'success');
  }

  loadArticleToEditor(article) {
    document.getElementById('news-id').value = article.id;
    document.getElementById('news-title').value = article.title || '';
    document.getElementById('news-category').value = article.category || 'announcement';
    document.getElementById('news-date').value = article.date || new Date().toISOString().split('T')[0];
    document.getElementById('news-summary').value = article.summary || '';
    document.getElementById('news-content').value = article.content || '';
    document.getElementById('news-featured').checked = article.featured || false;
    
    const editorTitle = document.getElementById('editor-title');
    if (editorTitle) editorTitle.textContent = '記事を編集';
  }

  createArticleCard(article, type) {
    const date = article.publishedAt || article.date || article.createdAt;
    const categoryInfo = this.getCategoryInfo(article.category);
    const statusInfo = this.getStatusInfo(article.status);
    
    const baseClasses = `news-card admin-card ${type === 'recent' ? 'recent-view' : 'unified-view'}`;
    const actions = type === 'recent' 
      ? `<button class="news-action-btn edit-btn" data-action="edit-news" data-id="${article.id}">
           <i class="fas fa-edit"></i>
           <span class="action-text">編集</span>
         </button>`
      : `<button class="news-action-btn edit-btn" data-action="edit-news" data-id="${article.id}">
           <i class="fas fa-edit"></i>
           <span class="action-text">編集</span>
         </button>
         <button class="news-action-btn preview-btn" data-action="preview-news" data-id="${article.id}">
           <i class="fas fa-eye"></i>
           <span class="action-text">プレビュー</span>
         </button>
         ${article.status === 'draft' 
           ? `<button class="news-action-btn edit-btn" data-action="publish-news" data-id="${article.id}">
                <i class="fas fa-globe"></i>
                <span class="action-text">公開</span>
              </button>`
           : `<button class="news-action-btn edit-btn" data-action="unpublish-news" data-id="${article.id}">
                <i class="fas fa-archive"></i>
                <span class="action-text">非公開</span>
              </button>`
         }
         <button class="news-action-btn delete-btn" data-action="delete-news" data-id="${article.id}">
           <i class="fas fa-trash"></i>
           <span class="action-text">削除</span>
         </button>`;

    return `
      <div class="${baseClasses}" data-status="${article.status}" data-category="${article.category}">
        <div class="news-card-header">
          <div class="news-meta">
            <span class="news-date">${this.formatDate(date)}</span>
            <span class="news-category ${categoryInfo.class}">${categoryInfo.name}</span>
            ${type !== 'recent' ? `<span class="news-status ${statusInfo.class}">${statusInfo.name}</span>` : ''}
          </div>
        </div>
        <div class="news-card-body">
          <h3 class="news-title admin-title-text">${this.escapeHtml(article.title)}</h3>
          <p class="news-excerpt">${this.escapeHtml(article.summary || '概要なし')}</p>
          <div class="news-actions">${actions}</div>
        </div>
      </div>
    `;
  }

  refreshAllViews() {
    this.refreshRecentArticles();
    this.refreshNewsList();
    this.updateDashboardStats();
  }

  generateId() {
    return 'article-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // 他のアクションメソッド（Instagram、レッスン、設定など）
  exportData() { this.showNotification('データエクスポート機能は準備中です', 'info'); }
  importData() { this.showNotification('データインポート機能は準備中です', 'info'); }
  updateLessonStatus() { this.showNotification('レッスン状況更新機能は準備中です', 'info'); }
  showWritingGuide() { this.showNotification('記事作成ガイド機能は準備中です', 'info'); }
  logout() { this.handleLogout(); }
  openExternal(params) { 
    const url = params?.url;
    if (url) window.open(url, '_blank');
  }
}

// デフォルトエクスポート
export default AdminActionService;