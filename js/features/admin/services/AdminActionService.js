/**
 * 管理画面アクションサービス
 * @version 8.0.0 - Supabase完全統合版
 */

import { CONFIG } from '../../../shared/constants/config.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { getAdminSettingsService } from './AdminSettingsService.js';
import { getAdminNewsSupabaseService } from './AdminNewsSupabaseService.js';
import { getInstagramSupabaseService } from '../../../shared/services/InstagramSupabaseService.js';
import { getLessonStatusSupabaseService } from '../../../shared/services/LessonStatusSupabaseService.js';

export class AdminActionService {
  constructor() {
    this.componentName = 'AdminActionService';
    this.initialized = false;
    this.currentTab = 'dashboard';
    this.currentNewsTab = 'editor';
    this.currentInstagramTab = 'posts';
    this.currentSettingsTab = 'basic';
    
    // フラグ
    this.listenersAdded = false;
    
    // Supabaseサービス
    this.adminNewsService = null;
    this.adminSettingsService = null;
    this.instagramService = null;
    this.lessonStatusService = null;

    // 設定項目マッピング定数
    this.SETTING_MAPPINGS = [
      { id: 'notifications-enabled', key: 'notifications', type: 'checkbox', default: true },
      { id: 'auto-save-enabled', key: 'autoSave', type: 'checkbox', default: true },
      { id: 'auto-save-interval', key: 'autoSaveInterval', type: 'number', default: 60 },
      { id: 'admin-theme', key: 'theme', type: 'value', default: 'light' },
      { id: 'confirm-before-delete', key: 'confirmBeforeDelete', type: 'checkbox', default: true },
      { id: 'preview-before-publish', key: 'showPreviewBeforePublish', type: 'checkbox', default: true },
      { id: 'auto-backup-enabled', key: 'autoBackup', type: 'checkbox', default: true }
    ];
  }

  log(message, ...args) {
    console.log(`[${this.componentName}] ${message}`, ...args);
  }

  debug(message, ...args) {
    if (CONFIG.debug?.enabled) {
      console.debug(`[${this.componentName}] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`[${this.componentName}] ${message}`, ...args);
  }

  /**
   * 初期化
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

      // Supabaseサービス初期化
      await this.initializeSupabaseServices();

      // 設定サービス初期化
      this.adminSettingsService = getAdminSettingsService();
      await this.adminSettingsService.init();

      // 統一イベントリスナー設定
      this.setupUnifiedEventListeners();

      // 初期タブ設定
      const savedTab = this.adminSettingsService.getCurrentTab() || 'dashboard';
      this.switchAdminTab(savedTab);
      
      // 設定タブの場合、基本設定タブをデフォルトで表示
      if (savedTab === 'settings') {
        this.switchSettingsTab('basic');
      }

      // 設定フォームの自動読み込み
      this.loadAutoLoadForms();

      this.initialized = true;
      this.log('初期化完了');

      // 初期化完了イベント
      EventBus.emit('adminAction:initialized');

    } catch (error) {
      this.error('初期化エラー:', error);
      this.initialized = true; // エラーでもアプリ停止を防ぐ
    }
  }

  /**
   * Supabaseサービス初期化
   */
  async initializeSupabaseServices() {
    try {
      this.log('Supabaseサービス初期化中...');

      // 各Supabaseサービスの初期化
      this.adminNewsService = getAdminNewsSupabaseService();
      this.instagramService = getInstagramSupabaseService();
      this.lessonStatusService = getLessonStatusSupabaseService();

      // 並列初期化
      await Promise.all([
        this.adminNewsService.init(),
        this.instagramService.init(),
        this.lessonStatusService.init()
      ]);

      this.log('Supabaseサービス初期化完了');
    } catch (error) {
      this.error('Supabaseサービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 統一イベントリスナー設定
   */
  setupUnifiedEventListeners() {
    if (this.listenersAdded) return;

    // クリックイベント
    document.addEventListener('click', this.handleClick.bind(this));
    
    // キーボードイベント
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    this.listenersAdded = true;
    this.debug('統一イベントリスナー設定完了');
  }

  /**
   * クリックイベントハンドラー
   */
  handleClick(e) {
    const element = e.target.closest('[data-action]');
    if (!element) return;

    e.preventDefault();
    const action = element.dataset.action;
    const params = this.getElementParams(element);
    
    this.executeAction(action, params, element);
  }

  /**
   * キーボードイベントハンドラー
   */
  handleKeydown(e) {
    // Ctrl+S で保存
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      this.executeAction('save-news');
    }
  }

  /**
   * 要素からパラメータを取得
   */
  getElementParams(element) {
    const params = {};
    
    // data-* 属性からパラメータを取得
    Object.keys(element.dataset).forEach(key => {
      if (key !== 'action') {
        params[key] = element.dataset[key];
      }
    });
    
    return params;
  }

  /**
   * アクション実行
   */
  executeAction(action, params = {}, element = null) {
    try {
      const methodName = this.getMethodName(action);
      
      if (typeof this[methodName] === 'function') {
        this.debug(`アクション実行: ${action}`, params);
        this[methodName](params, element);
      } else {
        this.error(`未定義のアクション: ${action}`);
      }
    } catch (error) {
      this.error(`アクション実行エラー [${action}]:`, error);
    }
  }

  /**
   * アクション名からメソッド名を生成
   */
  getMethodName(action) {
    return action.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  // ===========================================
  // ニュース管理アクション
  // ===========================================

  /**
   * 新規記事作成
   */
  newNewsArticle() {
    this.clearNewsEditor();
    this.switchNewsTab('editor');
  }

  /**
   * ニュースエディターをクリア
   */
  clearNewsEditor() {
    const form = document.getElementById('news-form');
    if (form) {
      form.reset();
      
      // 隠しフィールドもクリア
      const articleIdField = document.getElementById('article-id');
      if (articleIdField) {
        articleIdField.value = '';
      }
    }
    
    this.debug('ニュースエディターをクリア');
  }

  /**
   * ニュースプレビュー
   */
  previewNews(params) {
    try {
      const formData = this.getNewsFormData();
      
      if (!formData.title.trim()) {
        this.showNotification('タイトルを入力してください', 'warning');
        return;
      }
      
      if (!formData.content.trim()) {
        this.showNotification('本文を入力してください', 'warning');
        return;
      }
      
      const article = {
        ...formData,
        id: formData.id || 'preview',
        status: 'preview',
        createdAt: new Date().toISOString(),
        publishedAt: formData.status === 'published' ? new Date().toISOString() : null
      };
      
      this.showArticlePreview(article, !!formData.id);
      
    } catch (error) {
      this.error('プレビュー生成エラー:', error);
      this.showNotification('プレビューの生成に失敗しました', 'error');
    }
  }

  /**
   * ニュース保存（統合版）
   */
  async saveNews() {
    try {
      const formData = this.getNewsFormData();
      
      // バリデーション（スキーマ準拠）
      if (!formData.title?.trim()) {
        this.showNotification('タイトルを入力してください', 'warning');
        return;
      }
      
      if (!formData.content?.trim()) {
        this.showNotification('本文を入力してください', 'warning');
      }
      
      if (formData.title.length > 200) {
        this.showNotification('タイトルは200文字以内で入力してください', 'warning');
        return;
      }
      
      if (formData.summary && formData.summary.length > 500) {
        this.showNotification('要約は500文字以内で入力してください', 'warning');
        return;
      }
      
      // カテゴリーをスキーマ準拠形式にマッピング
      formData.category = this.mapCategoryToSchema(formData.category);
      
      // Supabaseに保存
      const result = await this.adminNewsService.saveArticle(formData);
      
      if (result.success) {
        this.showNotification('記事を保存しました', 'success');
        
        // フォームの記事IDを更新
        const articleIdField = document.getElementById('article-id') || document.getElementById('news-id');
        if (articleIdField && result.data) {
          articleIdField.value = result.data.id;
        }
        
        // リスト更新
        await this.refreshNewsList();
        await this.refreshRecentArticles();
        
        // 保存完了イベント
        EventBus.emit('article:saved', {
          articleId: result.data?.id,
          article: result.data
        });
        
      } else {
        this.showNotification(result.error || '保存に失敗しました', 'error');
      }
      
    } catch (error) {
      this.error('記事保存エラー:', error);
      this.showNotification('保存中にエラーが発生しました', 'error');
    }
  }

  /**
   * カテゴリーをスキーマ準拠形式にマッピング
   */
  mapCategoryToSchema(oldCategory) {
    const categoryMap = {
      'announcement': 'notice',
      'event': 'event',
      'media': 'general',
      'important': 'notice'
    };
    return categoryMap[oldCategory] || 'general';
  }

  /**
   * 新規記事の公開（統合版）
   */
  async publishNewArticle() {
    try {
      const formData = this.getNewsFormData();
      
      // バリデーション（スキーマ準拠）
      if (!formData.title?.trim() || !formData.content?.trim()) {
        this.showNotification('タイトルと本文を入力してください', 'warning');
        return;
      }
      
      if (formData.title.length > 200) {
        this.showNotification('タイトルは200文字以内で入力してください', 'warning');
        return;
      }
      
      // カテゴリーをスキーマ準拠形式にマッピング
      formData.category = this.mapCategoryToSchema(formData.category);
      
      // 公開状態で保存
      formData.status = 'published';
      formData.publishedAt = new Date().toISOString();
      
      const result = await this.adminNewsService.saveArticle(formData);
      
      if (result.success) {
        this.showNotification('記事を公開しました', 'success');
        
        // フォームの記事IDを更新
        const articleIdField = document.getElementById('article-id') || document.getElementById('news-id');
        if (articleIdField && result.data) {
          articleIdField.value = result.data.id;
        }
        
        // リスト更新
        await this.refreshNewsList();
        await this.refreshRecentArticles();
        
        // 公開完了イベント
        EventBus.emit('article:published', {
          articleId: result.data?.id,
          article: result.data
        });
        
      } else {
        this.showNotification(result.error || '公開に失敗しました', 'error');
      }
      
    } catch (error) {
      this.error('記事公開エラー:', error);
      this.showNotification('公開中にエラーが発生しました', 'error');
    }
  }

  /**
   * ニュース公開
   */
  async publishNews(params) {
    try {
      const articleId = params?.id;
      
      if (articleId) {
        await this.publishExistingArticle(articleId);
      } else {
        await this.publishNewArticle();
      }
      
    } catch (error) {
      this.error('記事公開エラー:', error);
      this.showNotification('公開中にエラーが発生しました', 'error');
    }
  }

  /**
   * 既存記事の公開
   */
  async publishExistingArticle(articleId) {
    const result = await this.adminNewsService.publishArticle(articleId);
    
    if (result.success) {
      this.showNotification('記事を公開しました', 'success');
      await this.refreshNewsList();
      await this.refreshRecentArticles();
      
      // 公開完了イベント
      EventBus.emit('article:published', {
        articleId: articleId,
        article: result.data
      });
      
    } else {
      this.showNotification(result.message || '公開に失敗しました', 'error');
    }
  }

  /**
   * 記事編集
   */
  async editNews(params) {
    try {
      const articleId = params?.id;
      if (!articleId) {
        this.error('記事IDが指定されていません');
        return;
      }
      
      const article = await this.adminNewsService.getArticleById(articleId);
      
      if (article) {
        this.loadArticleToEditor(article);
        this.switchNewsTab('editor');
        this.debug(`記事編集開始: ${article.title}`);
      } else {
        this.showNotification('記事が見つかりません', 'error');
      }
      
    } catch (error) {
      this.error('記事編集エラー:', error);
      this.showNotification('記事の読み込みに失敗しました', 'error');
    }
  }

  /**
   * 記事をエディターに読み込み
   */
  loadArticleToEditor(article) {
    const form = document.getElementById('news-form');
    if (!form) return;
    
    // フォームフィールドに値を設定
    const fields = {
      'article-id': article.id,
      'news-title': article.title,
      'news-content': article.content,
      'news-category': article.category,
      'news-summary': article.excerpt || '',
      'news-featured': article.featured || false
    };
    
    Object.entries(fields).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = value;
        } else {
          field.value = value;
        }
      }
    });
    
    this.debug('記事をエディターに読み込み完了');
  }

  /**
   * 記事削除
   */
  async deleteNews(params) {
    try {
      const articleId = params?.id;
      if (!articleId) {
        this.error('記事IDが指定されていません');
        return;
      }
      
      if (!confirm('この記事を削除しますか？この操作は取り消せません。')) {
        return;
      }
      
      const result = await this.adminNewsService.deleteArticle(articleId);
      
      if (result.success) {
        this.showNotification('記事を削除しました', 'success');
        await this.refreshNewsList();
        await this.refreshRecentArticles();
        
        // 削除完了イベント
        EventBus.emit('article:deleted', {
          articleId: articleId
        });
        
      } else {
        this.showNotification(result.message || '削除に失敗しました', 'error');
      }
      
    } catch (error) {
      this.error('記事削除エラー:', error);
      this.showNotification('削除中にエラーが発生しました', 'error');
    }
  }

  /**
   * ニュースリスト更新
   */
  async refreshNewsList() {
    try {
      this.debug('ニュースリスト更新開始');
      
      const articles = await this.adminNewsService.getAllArticles();
      const newsListContainer = document.getElementById('news-list');
      
      if (!newsListContainer) {
        this.debug('ニュースリストコンテナが見つかりません');
        return;
      }
      
      if (articles.length === 0) {
        newsListContainer.innerHTML = `
          <div class="no-articles">
            <p>記事がありません</p>
            <button class="btn btn-primary" data-action="new-news-article">
              新規記事作成
            </button>
          </div>
        `;
        return;
      }
      
      const articlesHtml = articles.map(article => 
        this.createArticleCard(article, 'list')
      ).join('');
      
      newsListContainer.innerHTML = articlesHtml;
      
      this.debug(`ニュースリスト更新完了: ${articles.length}件`);
      
    } catch (error) {
      this.error('ニュースリスト更新エラー:', error);
      
      const newsListContainer = document.getElementById('news-list');
      if (newsListContainer) {
        newsListContainer.innerHTML = `
          <div class="error-message">
            <p>記事の読み込みに失敗しました</p>
            <button class="btn btn-secondary" data-action="refresh-news-list">
              再試行
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * 記事カード作成
   */
  createArticleCard(article, type = 'recent') {
    const categoryInfo = this.getCategoryInfo(article.category);
    const statusInfo = this.getStatusInfo(article.status);
    const formattedDate = this.formatDate(article.publishedAt || article.createdAt);
    
    if (type === 'list') {
      return `
        <div class="article-card" data-article-id="${article.id}">
          <div class="article-header">
            <h3 class="article-title">${this.escapeHtml(article.title)}</h3>
            <div class="article-meta">
              <span class="category-badge ${categoryInfo.class}">${categoryInfo.label}</span>
              <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
              <time class="article-date">${formattedDate}</time>
            </div>
          </div>
          <div class="article-actions">
            <button class="btn btn-sm btn-primary" data-action="edit-news" data-id="${article.id}">
              編集
            </button>
            ${article.status === 'draft' ? 
              `<button class="btn btn-sm btn-success" data-action="publish-news" data-id="${article.id}">公開</button>` : 
              `<button class="btn btn-sm btn-warning" data-action="unpublish-news" data-id="${article.id}">非公開</button>`
            }
            <button class="btn btn-sm btn-danger" data-action="delete-news" data-id="${article.id}">
              削除
            </button>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="recent-article-item" data-article-id="${article.id}">
          <div class="article-info">
            <h4 class="article-title">${this.escapeHtml(article.title)}</h4>
            <div class="article-meta">
              <span class="category-badge ${categoryInfo.class}">${categoryInfo.label}</span>
              <time class="article-date">${formattedDate}</time>
            </div>
          </div>
          <div class="article-actions">
            <button class="btn btn-sm btn-primary" data-action="edit-news" data-id="${article.id}">
              編集
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * 最近の記事更新
   */
  async refreshRecentArticles() {
    try {
      this.debug('最近の記事更新開始');
      
      const articles = await this.adminNewsService.getRecentArticles(5);
      const recentArticlesContainer = document.getElementById('recent-articles');
      
      if (!recentArticlesContainer) {
        this.debug('最近の記事コンテナが見つかりません');
        return;
      }
      
      if (articles.length === 0) {
        recentArticlesContainer.innerHTML = `
          <div class="no-recent-articles">
            <p>最近の記事がありません</p>
          </div>
        `;
        return;
      }
      
      const articlesHtml = articles.map(article => 
        this.createRecentArticleItem(article)
      ).join('');
      
      recentArticlesContainer.innerHTML = articlesHtml;
      
      this.debug(`最近の記事更新完了: ${articles.length}件`);
      
    } catch (error) {
      this.error('最近の記事更新エラー:', error);
    }
  }

  /**
   * 最近の記事アイテム作成
   */
  createRecentArticleItem(article) {
    const categoryInfo = this.getCategoryInfo(article.category);
    const formattedDate = this.formatDate(article.publishedAt || article.createdAt);
    
    return `
      <div class="recent-article-item" data-article-id="${article.id}">
        <div class="article-info">
          <h4 class="article-title">${this.escapeHtml(article.title)}</h4>
          <div class="article-meta">
            <span class="category-badge ${categoryInfo.class}">${categoryInfo.label}</span>
            <time class="article-date">${formattedDate}</time>
          </div>
        </div>
        <div class="article-actions">
          <button class="btn btn-sm btn-primary" data-action="edit-news" data-id="${article.id}">
            編集
          </button>
        </div>
      </div>
    `;
  }

  // ===========================================
  // タブ管理アクション
  // ===========================================

  /**
   * 管理画面タブ切り替え
   */
  switchAdminTab(params) {
    const tabName = typeof params === 'string' ? params : params?.tab;
    if (!tabName) return;

    // 現在のタブを保存
    this.currentTab = tabName;
    this.adminSettingsService.setCurrentTab(tabName);

    // タブボタンの状態更新
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeTabButton = document.querySelector(`[data-action="switch-admin-tab"][data-tab="${tabName}"]`);
    if (activeTabButton) {
      activeTabButton.classList.add('active');
    }

    // タブコンテンツの表示切り替え
    document.querySelectorAll('.admin-tab-content').forEach(content => {
      content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
      activeContent.style.display = 'block';
    }

    // タブ固有の初期化
    this.initializeTab(tabName);
    
    this.debug(`管理画面タブ切り替え: ${tabName}`);
  }

  /**
   * ニュースタブ切り替え
   */
  switchNewsTab(params) {
    const tabName = typeof params === 'string' ? params : params?.tab;
    if (!tabName) return;

    this.currentNewsTab = tabName;

    // タブボタンの状態更新
    document.querySelectorAll('.news-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeTabButton = document.querySelector(`[data-action="switch-news-tab"][data-tab="${tabName}"]`);
    if (activeTabButton) {
      activeTabButton.classList.add('active');
    }

    // タブコンテンツの表示切り替え
    document.querySelectorAll('.news-tab-content').forEach(content => {
      content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(`news-${tabName}`);
    if (activeContent) {
      activeContent.style.display = 'block';
    }

    this.debug(`ニュースタブ切り替え: ${tabName}`);
  }

  /**
   * 設定タブ切り替え
   */
  switchSettingsTab(params) {
    const tabName = typeof params === 'string' ? params : params?.tab;
    if (!tabName) return;

    this.currentSettingsTab = tabName;

    // タブボタンの状態更新
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeTabButton = document.querySelector(`[data-action="switch-settings-tab"][data-tab="${tabName}"]`);
    if (activeTabButton) {
      activeTabButton.classList.add('active');
    }

    // タブコンテンツの表示切り替え
    document.querySelectorAll('.settings-tab-content').forEach(content => {
      content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(`settings-${tabName}`);
    if (activeContent) {
      activeContent.style.display = 'block';
    }

    // 設定タブ固有の初期化
    if (tabName === 'basic') {
      this.loadAdminSettingsToForm();
    }

    this.debug(`設定タブ切り替え: ${tabName}`);
  }

  // ===========================================
  // ユーティリティメソッド
  // ===========================================

  /**
   * タブ初期化
   */
  initializeTab(tabName) {
    switch (tabName) {
      case 'dashboard':
        this.refreshRecentArticles();
        break;
      case 'news':
        if (this.currentNewsTab === 'list') {
          this.refreshNewsList();
        }
        break;
      case 'instagram':
        this.refreshInstagramPosts();
        break;
      case 'settings':
        this.loadAdminSettingsToForm();
        break;
    }
  }

  /**
   * ニュースフォームデータ取得
   */
  getNewsFormData() {
    const form = document.getElementById('news-form');
    if (!form) return {};

    return {
      id: document.getElementById('article-id')?.value || '',
      title: document.getElementById('news-title')?.value || '',
      content: document.getElementById('news-content')?.value || '',
      category: document.getElementById('news-category')?.value || 'general',
      excerpt: document.getElementById('news-summary')?.value || '',
      featured: document.getElementById('news-featured')?.checked || false,
      status: 'draft'
    };
  }

  /**
   * カテゴリー情報取得
   */
  getCategoryInfo(category) {
    const categories = {
      general: { label: '一般', class: 'category-general' },
      event: { label: 'イベント', class: 'category-event' },
      notice: { label: 'お知らせ', class: 'category-notice' },
      lesson: { label: 'レッスン', class: 'category-lesson' },
      other: { label: 'その他', class: 'category-other' }
    };
    return categories[category] || categories.general;
  }

  /**
   * ステータス情報取得
   */
  getStatusInfo(status) {
    const statuses = {
      published: { label: '公開', class: 'status-published' },
      draft: { label: '下書き', class: 'status-draft' }
    };
    return statuses[status] || statuses.draft;
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 日付フォーマット
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 記事プレビュー表示
   */
  showArticlePreview(article, isExisting) {
    const previewHtml = this.generateArticlePreviewHTML(article, isExisting);
    this.showModal('記事プレビュー', previewHtml);
  }

  /**
   * 記事プレビューHTML生成
   */
  generateArticlePreviewHTML(article, isExisting) {
    const categoryInfo = this.getCategoryInfo(article.category);
    const formattedDate = this.formatDate(article.createdAt);
    
    return `
      <div class="article-preview">
        <header class="preview-header">
          <div class="preview-meta">
            <span class="category-badge ${categoryInfo.class}">${categoryInfo.label}</span>
            <time class="preview-date">${formattedDate}</time>
          </div>
          <h1 class="preview-title">${this.escapeHtml(article.title)}</h1>
          ${article.excerpt ? `<p class="preview-excerpt">${this.escapeHtml(article.excerpt)}</p>` : ''}
        </header>
        <div class="preview-content">
          ${article.content}
        </div>
      </div>
    `;
  }

  /**
   * 設定フォーム読み込み
   */
  loadAdminSettingsToForm() {
    try {
      const settings = this.adminSettingsService.getAllSettings();
      
      this.SETTING_MAPPINGS.forEach(mapping => {
        const element = document.getElementById(mapping.id);
        if (element) {
          const value = settings[mapping.key] ?? mapping.default;
          
          if (mapping.type === 'checkbox') {
            element.checked = value;
          } else {
            element.value = value;
          }
        }
      });
      
      this.debug('設定フォーム読み込み完了');
    } catch (error) {
      this.error('設定フォーム読み込みエラー:', error);
    }
  }

  /**
   * 自動読み込みフォーム
   */
  loadAutoLoadForms() {
    // 設定フォームの自動読み込み
    if (this.currentTab === 'settings') {
      this.loadAdminSettingsToForm();
    }
  }

  /**
   * 設定保存
   */
  async saveAdminSettings() {
    try {
      const settings = this.getSettingsFromForm();
      
      Object.entries(settings).forEach(([key, value]) => {
        this.adminSettingsService.setSetting(key, value);
      });
      
      this.showNotification('設定を保存しました', 'success');
      this.debug('設定保存完了');
      
    } catch (error) {
      this.error('設定保存エラー:', error);
      this.showNotification('設定の保存に失敗しました', 'error');
    }
  }

  /**
   * フォームから設定取得
   */
  getSettingsFromForm() {
    const settings = {};
    
    this.SETTING_MAPPINGS.forEach(mapping => {
      const element = document.getElementById(mapping.id);
      if (element) {
        if (mapping.type === 'checkbox') {
          settings[mapping.key] = element.checked;
        } else if (mapping.type === 'number') {
          settings[mapping.key] = parseInt(element.value) || mapping.default;
        } else {
          settings[mapping.key] = element.value || mapping.default;
        }
      }
    });
    
    return settings;
  }

  /**
   * Instagram投稿更新
   */
  async refreshInstagramPosts() {
    try {
      this.debug('Instagram投稿更新開始');
      
      const posts = await this.instagramService.getAllPosts();
      const container = document.getElementById('instagram-posts-list');
      
      if (!container) {
        this.debug('Instagram投稿コンテナが見つかりません');
        return;
      }
      
      if (posts.length === 0) {
        container.innerHTML = `
          <div class="no-posts">
            <p>投稿がありません</p>
            <button class="btn btn-primary" data-action="add-instagram-post">
              新規投稿追加
            </button>
          </div>
        `;
        return;
      }
      
      const postsHtml = posts.map(post => this.renderInstagramPostItem(post)).join('');
      container.innerHTML = postsHtml;
      
      this.debug(`Instagram投稿更新完了: ${posts.length}件`);
      
    } catch (error) {
      this.error('Instagram投稿更新エラー:', error);
    }
  }

  /**
   * Instagram投稿アイテム表示
   */
  renderInstagramPostItem(post) {
    const formattedDate = this.formatDate(post.createdAt);
    const statusClass = post.status === 'active' ? 'status-active' : 'status-inactive';
    
    return `
      <div class="instagram-post-card" data-post-id="${post.id}">
        <div class="post-header">
          <h4 class="post-title">${this.escapeHtml(post.title || 'Instagram投稿')}</h4>
          <div class="post-meta">
            <span class="status-badge ${statusClass}">${post.status === 'active' ? 'アクティブ' : '非アクティブ'}</span>
            ${post.featured ? '<span class="featured-badge">注目</span>' : ''}
            <time class="post-date">${formattedDate}</time>
          </div>
        </div>
        <div class="post-actions">
          <button class="btn btn-sm btn-primary" data-action="edit-instagram-post" data-id="${post.id}">
            編集
          </button>
          <button class="btn btn-sm btn-secondary" data-action="toggle-instagram-post-status" data-id="${post.id}">
            ${post.status === 'active' ? '非アクティブ化' : 'アクティブ化'}
          </button>
          <button class="btn btn-sm btn-warning" data-action="toggle-instagram-featured" data-id="${post.id}">
            ${post.featured ? '注目解除' : '注目設定'}
          </button>
          <button class="btn btn-sm btn-danger" data-action="delete-instagram-post" data-id="${post.id}">
            削除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * モーダル表示
   */
  showModal(title, content) {
    const modal = document.getElementById('admin-modal');
    if (!modal) return;

    const titleElement = modal.querySelector('.modal-title');
    const contentElement = modal.querySelector('.modal-body');
    
    if (titleElement) titleElement.textContent = title;
    if (contentElement) contentElement.innerHTML = content;
    
    modal.style.display = 'block';
  }

  /**
   * モーダル閉じる
   */
  closeModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * 通知表示
   */
  showNotification(message, type = 'success') {
    // 既存の通知を削除
    const existingNotification = document.querySelector('.admin-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 新しい通知を作成
    const notification = document.createElement('div');
    notification.className = `admin-notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${this.escapeHtml(message)}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // 通知を表示
    document.body.appendChild(notification);

    // 自動で削除
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * ログアウト処理
   */
  handleLogout() {
    if (confirm('ログアウトしますか？')) {
      // セッションクリア
      this.adminSettingsService.clearAllSettings();
      
      // ログインページにリダイレクト
      window.location.href = 'admin-login.html';
    }
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    this.debug('コンポーネント破棄中...');
    
    // イベントリスナーの削除
    if (this.listenersAdded) {
      document.removeEventListener('click', this.handleClick.bind(this));
      document.removeEventListener('keydown', this.handleKeydown.bind(this));
      this.listenersAdded = false;
    }
    
    // 状態リセット
    this.initialized = false;
    this.adminNewsService = null;
    this.adminSettingsService = null;
    this.instagramService = null;
    this.lessonStatusService = null;
    
    this.debug('コンポーネント破棄完了');
  }
}

// シングルトンインスタンス
let adminActionServiceInstance = null;

/**
 * AdminActionServiceのシングルトンインスタンスを取得
 * @returns {AdminActionService}
 */
export function getAdminActionService() {
  if (!adminActionServiceInstance) {
    adminActionServiceInstance = new AdminActionService();
  }
  return adminActionServiceInstance;
}

// 名前付きエクスポート（後方互換性）
export const adminActionService = getAdminActionService();

// デフォルトエクスポート
export default AdminActionService;