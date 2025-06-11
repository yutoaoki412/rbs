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
    
    // 統一ストレージキー（CONFIG使用）
    this.storageKeys = CONFIG.storage.keys;
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

      // サービスの初期化
      this.initializeServices();

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
   * 各種サービスの初期化
   */
  initializeServices() {
    try {
      // InstagramDataServiceの初期化
      this.initializeInstagramDataService();
      
      this.log('サービス初期化完了');
    } catch (error) {
      this.error('サービス初期化エラー:', error);
    }
  }

  /**
   * InstagramDataServiceの初期化
   */
  initializeInstagramDataService() {
    // シンプルなInstagramDataServiceの実装
    this.instagramDataService = {
      storageKey: CONFIG.storage.keys.instagram,
      
      getAllPosts() {
        try {
          const data = localStorage.getItem(this.storageKey);
          return data ? JSON.parse(data) : [];
    } catch (error) {
          console.error('Instagram投稿読み込みエラー:', error);
          return [];
        }
      },

      savePost(postData) {
        try {
          const posts = this.getAllPosts();
          
          if (postData.id) {
            // 既存投稿の更新
            const index = posts.findIndex(p => p.id === postData.id);
            if (index !== -1) {
              posts[index] = { ...posts[index], ...postData, updatedAt: new Date().toISOString() };
            }
          } else {
            // 新規投稿の追加
            postData.id = Date.now().toString();
            postData.createdAt = new Date().toISOString();
            postData.updatedAt = new Date().toISOString();
            posts.unshift(postData);
          }
          
          localStorage.setItem(this.storageKey, JSON.stringify(posts));
          return { success: true, data: postData };
    } catch (error) {
          console.error('Instagram投稿保存エラー:', error);
          return { success: false, message: error.message };
        }
      },

      getPostById(id) {
        const posts = this.getAllPosts();
        return posts.find(p => p.id === id);
      },

      deletePost(id) {
        try {
          let posts = this.getAllPosts();
          posts = posts.filter(p => p.id !== id);
          localStorage.setItem(this.storageKey, JSON.stringify(posts));
          return { success: true };
    } catch (error) {
          console.error('Instagram投稿削除エラー:', error);
          return { success: false, message: error.message };
        }
      },

      togglePostStatus(id) {
        try {
          const posts = this.getAllPosts();
          const post = posts.find(p => p.id === id);
          if (post) {
            post.status = post.status === 'active' ? 'inactive' : 'active';
            post.updatedAt = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(posts));
            return { success: true, data: post };
          }
          return { success: false, message: '投稿が見つかりません' };
    } catch (error) {
          console.error('Instagram投稿ステータス更新エラー:', error);
          return { success: false, message: error.message };
        }
      },

      togglePostFeatured(id) {
        try {
          const posts = this.getAllPosts();
          const post = posts.find(p => p.id === id);
          if (post) {
            post.featured = !post.featured;
            post.updatedAt = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(posts));
            return { success: true, data: post };
          }
          return { success: false, message: '投稿が見つかりません' };
      } catch (error) {
          console.error('Instagram投稿注目設定エラー:', error);
          return { success: false, message: error.message };
        }
      }
    };

    this.log('InstagramDataService初期化完了');
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

  /**
   * 新規記事の公開
   */
  publishNewArticle() {
    const article = this.getEditorData();
    if (!article.title.trim() || !article.content.trim()) {
      this.showNotification('タイトルと本文を入力してください', 'warning');
      return;
    }

    article.status = 'published';
    article.publishedAt = new Date().toISOString();
    article.updatedAt = new Date().toISOString();
    
    this.saveArticle(article);
    this.showNotification('記事を公開しました');
    
    // フォームをクリアしてダッシュボードに戻る
    setTimeout(() => {
      this.clearNewsEditor();
      this.switchAdminTab('dashboard');
    }, 1000);
  }

  /**
   * 既存記事の公開
   */
  publishExistingArticle(articleId) {
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
    this.showNotification('記事を公開しました');
    this.refreshAllViews();
  }

  /**
   * 記事を保存（新規・更新共通）
   */
  saveArticle(articleData) {
    try {
      const articles = this.getArticles();
      const existingIndex = articles.findIndex(article => article.id === articleData.id);
      
      if (existingIndex >= 0) {
        articles[existingIndex] = articleData;
      } else {
        articles.unshift(articleData);
      }
      
      this.saveArticles(articles);
      this.refreshAllViews();
      
    } catch (error) {
      this.error('記事保存エラー:', error);
      throw error;
    }
  }

  /**
   * 全ビューを更新
   */
  refreshAllViews() {
    this.updateDashboardStats();
    this.refreshRecentArticles();
    this.refreshNewsList();
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

  /**
   * 記事をエディターに読み込む
   */
  loadArticleToEditor(article) {
    try {
      // フォーム要素に記事データを設定
      const titleInput = document.getElementById('news-title');
      const categorySelect = document.getElementById('news-category');
      const dateInput = document.getElementById('news-date');
      const summaryTextarea = document.getElementById('news-summary');
      const contentTextarea = document.getElementById('news-content');
      const featuredCheckbox = document.getElementById('news-featured');
      const hiddenIdInput = document.getElementById('news-id');

      if (titleInput) titleInput.value = article.title || '';
      if (categorySelect) categorySelect.value = article.category || 'announcement';
      if (dateInput) {
        const dateValue = article.publishedAt || article.createdAt;
        if (dateValue) {
          dateInput.value = new Date(dateValue).toISOString().split('T')[0];
        }
      }
      if (summaryTextarea) summaryTextarea.value = article.summary || '';
      if (contentTextarea) contentTextarea.value = article.content || '';
      if (featuredCheckbox) featuredCheckbox.checked = article.featured || false;
      if (hiddenIdInput) hiddenIdInput.value = article.id;

      // エディターのタイトルを更新
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) {
        editorTitle.textContent = '記事編集';
      }

      this.debug('記事をエディターに読み込み完了:', article.title);
    } catch (error) {
      this.error('記事のエディター読み込みエラー:', error);
      this.showNotification('記事の読み込みに失敗しました', 'error');
    }
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

  /**
   * 記事カードを生成
   */
  createArticleCard(article, type = 'recent') {
    const categoryInfo = this.getCategoryInfo(article.category);
    const statusInfo = this.getStatusInfo(article.status);
    const publishDate = article.publishedAt || article.createdAt;
    
    return `
      <div class="news-card admin-card unified-view" data-status="${article.status}" data-id="${article.id}">
        <div class="news-card-header">
          <div class="news-meta">
            <span class="news-date">
              ${this.formatDate(publishDate)}
            </span>
            <span class="news-category ${categoryInfo.class}">${categoryInfo.name}</span>
            <span class="news-status ${statusInfo.class}">${statusInfo.name}</span>
            ${article.featured ? '<span class="featured-badge"><i class="fas fa-star"></i> 注目</span>' : ''}
          </div>
        </div>
        
        <div class="news-card-body">
          <h3 class="news-title">
            <span class="admin-title-text">${this.escapeHtml(article.title)}</span>
          </h3>
          ${article.summary ? `<p class="news-excerpt">${this.escapeHtml(article.summary)}</p>` : ''}
          
          <div class="news-actions">
            <button class="news-action-btn preview-btn" 
                    data-action="preview-news" 
                    data-id="${article.id}"
                    title="プレビュー">
              <i class="fas fa-eye"></i>
              <span class="action-text">プレビュー</span>
            </button>
            
            <button class="news-action-btn edit-btn" 
                    data-action="edit-news" 
                    data-id="${article.id}"
                    title="編集">
              <i class="fas fa-edit"></i>
              <span class="action-text">編集</span>
            </button>
            
            ${article.status === 'published' ? 
              `<button class="news-action-btn unpublish-btn" 
                       data-action="unpublish-news" 
                       data-id="${article.id}"
                       title="非公開にする">
                 <i class="fas fa-eye-slash"></i>
                 <span class="action-text">非公開</span>
               </button>` : 
              `<button class="news-action-btn publish-btn" 
                       data-action="publish-news" 
                       data-id="${article.id}"
                       title="公開する">
                 <i class="fas fa-globe"></i>
                 <span class="action-text">公開</span>
               </button>`
            }
            
            <button class="news-action-btn delete-btn" 
                    data-action="delete-news" 
                    data-id="${article.id}"
                    title="削除">
              <i class="fas fa-trash"></i>
              <span class="action-text">削除</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 一意のIDを生成
   */
  generateId() {
    return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * デフォルト記事データを作成（CONFIG使用）
   */
  createDefaultArticle() {
    return CONFIG.helpers.createDefaultArticle();
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
      ? articles.map(article => this.createRecentArticleItem(article)).join('')
      : '<div class="empty-state"><i class="fas fa-newspaper"></i><p>公開済みの記事がありません</p></div>';
  }

  /**
   * 最近の記事用のシンプルなアイテムを生成（既存CSSに対応）
   */
  createRecentArticleItem(article) {
    const categoryInfo = this.getCategoryInfo(article.category);
    const statusInfo = this.getStatusInfo(article.status);
    const publishDate = article.publishedAt || article.createdAt;
    
    return `
      <div class="news-card admin-card recent-view" data-id="${article.id}" data-status="${article.status}">
        <div class="news-card-header">
          <div class="news-meta">
            <span class="news-date">
              ${this.formatDate(publishDate)}
            </span>
            <span class="news-category ${categoryInfo.class}">${categoryInfo.name}</span>
          </div>
        </div>
        <div class="news-card-body">
          <h3 class="news-title">
            <span class="admin-title-text">${this.escapeHtml(article.title)}</span>
          </h3>
          <div class="news-actions">
            <button class="news-action-btn preview-btn" 
                    data-action="preview-news" 
                    data-id="${article.id}"
                    title="プレビュー">
              <i class="fas fa-eye"></i>
              <span class="action-text">プレビュー</span>
            </button>
            <button class="news-action-btn edit-btn" 
                    data-action="edit-news" 
                    data-id="${article.id}"
                    title="編集">
              <i class="fas fa-edit"></i>
              <span class="action-text">編集</span>
          </button>
          </div>
        </div>
        </div>
      `;
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

  /**
   * 設定タブ切り替え
   */
  switchSettingsTab(params) {
    const tab = typeof params === 'string' ? params : params?.tab;
    if (!tab) return;

    document.querySelectorAll('.settings-tab-nav .sub-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`.settings-tab-nav [data-tab="${tab}"]`)?.classList.add('active');
    
    document.querySelectorAll('.settings-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`settings-${tab}-tab`)?.classList.add('active');
    
    this.currentSettingsTab = tab;
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

  /**
   * 記事作成ガイドを表示（admin-preview.css対応）
   */
  showWritingGuide() {
    // 既存のモーダルを削除
    const existingModal = document.querySelector('.news-detail-preview-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div class="news-detail-preview-modal">
        <div class="news-detail-preview-content">
          <div class="news-detail-modal-header">
            <div class="modal-title-section">
              <i class="fas fa-book-open title-icon"></i>
              <div class="title-content">
                <h2>記事作成ガイド</h2>
                <p class="preview-note">記事を効果的に作成するためのガイド</p>
              </div>
            </div>
            <div class="modal-controls">
              <button class="modal-close" onclick="this.closest('.news-detail-preview-modal').remove()">
                <i class="fas fa-times"></i>
                閉じる
              </button>
            </div>
          </div>
          
          <div class="news-detail-preview-body">
            <div class="preview-viewport">
              <div class="preview-container">
                
                <!-- 基本的な書き方 -->
                <div class="article-header">
                  <h2 class="section-title">
                    <i class="fas fa-edit"></i>
                    基本的な書き方
                  </h2>
                  <div class="article-content">
                    <ul>
                      <li><strong>タイトル:</strong> 読者の興味を引く簡潔で分かりやすいタイトルを付けましょう</li>
                      <li><strong>概要:</strong> 記事の内容を簡潔にまとめて、読者が内容を把握できるようにしましょう</li>
                      <li><strong>本文:</strong> 段落を適切に分けて、読みやすい文章を心がけましょう</li>
                    </ul>
                  </div>
                </div>

                <!-- Markdown記法 -->
                <div class="share-section">
                  <h2 class="section-title">
                    <i class="fas fa-markdown"></i>
                    Markdown記法
                  </h2>
                  <div class="related-grid">
                    <div class="related-card">
                      <div class="card-content">
                        <h3 class="card-title">見出し</h3>
                        <div class="card-excerpt">
                          <code>## 大見出し</code><br>
                          <code>### 中見出し</code><br>
                          <code>#### 小見出し</code>
                        </div>
                      </div>
                    </div>
                    <div class="related-card">
                      <div class="card-content">
                        <h3 class="card-title">文字装飾</h3>
                        <div class="card-excerpt">
                          <code>**太字**</code> → <strong>太字</strong><br>
                          <code>*イタリック*</code> → <em>イタリック</em>
                        </div>
                      </div>
                    </div>
                    <div class="related-card">
                      <div class="card-content">
                        <h3 class="card-title">リスト</h3>
                        <div class="card-excerpt">
                          <code>- 項目1</code><br>
                          <code>- 項目2</code><br>
                          <code>- 項目3</code>
                        </div>
                      </div>
                    </div>
                    <div class="related-card">
                      <div class="card-content">
                        <h3 class="card-title">引用・リンク</h3>
                        <div class="card-excerpt">
                          <code>> 引用文</code><br>
                          <code>[表示テキスト](URL)</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 記事作成のコツ -->
                <div class="article-header">
                  <h2 class="section-title">
                    <i class="fas fa-lightbulb"></i>
                    記事作成のコツ
                  </h2>
                  <div class="article-content">
                    <ul>
                      <li><strong>読者を意識:</strong> 保護者や子どもたちにとって有益な情報を提供しましょう</li>
                      <li><strong>具体的な内容:</strong> 日時、場所、参加方法など、具体的な情報を含めましょう</li>
                      <li><strong>写真や画像:</strong> 文章だけでなく、視覚的な要素も活用しましょう</li>
                      <li><strong>適切なカテゴリ:</strong> 内容に応じて適切なカテゴリを選択しましょう</li>
                    </ul>
                  </div>
                </div>

                <!-- カテゴリについて -->
                <div class="share-section">
                  <h2 class="section-title">
                    <i class="fas fa-tags"></i>
                    カテゴリについて
                  </h2>
                  <div class="related-grid">
                    <div class="related-card">
                      <div class="card-content">
                        <div class="card-meta">
                          <span class="category announcement">お知らせ</span>
                        </div>
                        <div class="card-excerpt">一般的なお知らせや連絡事項</div>
                      </div>
                    </div>
                    <div class="related-card">
                      <div class="card-content">
                        <div class="card-meta">
                          <span class="category event">体験会</span>
                        </div>
                        <div class="card-excerpt">体験会や特別イベントの案内</div>
                      </div>
                    </div>
                    <div class="related-card">
                      <div class="card-content">
                        <div class="card-meta">
                          <span class="category media">メディア</span>
                        </div>
                        <div class="card-excerpt">メディア掲載や外部イベント情報</div>
                      </div>
                    </div>
                    <div class="related-card">
                      <div class="card-content">
                        <div class="card-meta">
                          <span class="category">重要</span>
                        </div>
                        <div class="card-excerpt">緊急性の高い重要なお知らせ</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 公開前のチェックポイント -->
                <div class="article-header">
                  <h2 class="section-title">
                    <i class="fas fa-check-circle"></i>
                    公開前のチェックポイント
                  </h2>
                  <div class="article-content">
                    <ul>
                      <li>誤字脱字がないか確認</li>
                      <li>日時や場所の情報が正確か確認</li>
                      <li>連絡先やリンクが正しく動作するか確認</li>
                      <li>プレビューで表示を確認</li>
                      <li>適切なカテゴリが選択されているか確認</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // モーダルをbodyに追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // モーダル外クリックで閉じる
    const modal = document.querySelector('.news-detail-preview-modal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    this.debug('記事作成ガイド表示完了');
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
          ...this.createDefaultArticle(),
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
          ...this.createDefaultArticle(),
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
          ...this.createDefaultArticle(),
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
    const configCategory = CONFIG.helpers.getCategoryInfo(category);
    return {
      name: configCategory.name,
      class: category // CSS用のクラス名
    };
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
    return CONFIG.helpers.formatDate(dateString) || '不明';
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
      modal.classList.remove('writing-guide-modal'); // ガイド専用クラスも削除
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
    if (!markdown) return '';
    
    // 行ごとに分割して処理
    const lines = markdown.split('\n');
    const processedLines = [];
    let inQuote = false;
    let quoteLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 引用行の処理
      if (line.startsWith('> ')) {
        if (!inQuote) {
          inQuote = true;
          quoteLines = [];
        }
        quoteLines.push(line.substring(2)); // '> 'を除去
      } else {
        // 引用ブロックが終わった場合
        if (inQuote) {
          processedLines.push(`<blockquote>${quoteLines.join('<br>')}</blockquote>`);
          inQuote = false;
          quoteLines = [];
        }
        
        // 通常の行処理
        let processedLine = line
          // 見出し処理（長いパターンから先に処理）
          .replace(/^#### (.*$)/, '<h5>$1</h5>')
          .replace(/^### (.*$)/, '<h4>$1</h4>')
          .replace(/^## (.*$)/, '<h3>$1</h3>')
          // リスト
          .replace(/^- (.*)/, '<li>$1</li>')
          // 太字
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // イタリック
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          // リンク
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        processedLines.push(processedLine);
      }
    }
    
    // 最後に引用ブロックが残っている場合
    if (inQuote) {
      processedLines.push(`<blockquote>${quoteLines.join('<br>')}</blockquote>`);
    }
    
    return processedLines.join('<br>');
  }

  // === Instagram関連メソッド ===
  
  /**
   * Instagramタブ切り替え
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
   * Instagram投稿保存
   */
  async saveInstagramPost() {
    this.debug('Instagram投稿保存');
    
    try {
    const formData = this.getInstagramFormData();
    
    if (!formData.embedCode) {
      throw new Error('埋め込みコードが入力されていません');
    }
    
    if (!this.validateInstagramEmbed(formData.embedCode)) {
      throw new Error('無効な埋め込みコードです');
    }
    
    if (!this.instagramDataService) {
      throw new Error('InstagramDataServiceが初期化されていません');
    }
    
    const result = await this.instagramDataService.savePost(formData);
    
    if (result.success) {
      this.clearInstagramForm();
      this.refreshInstagramPosts();
      this.updateInstagramStats();
        this._showFeedback('Instagram投稿が保存されました', 'success');
      return result;
    } else {
      throw new Error(result.message || 'Instagram投稿の保存に失敗しました');
      }
    } catch (error) {
      this.error('Instagram投稿保存エラー:', error);
      this._showFeedback(error.message || 'Instagram投稿の保存に失敗しました', 'error');
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
      this.restoreInstagramFilter();
    } catch (error) {
      this.error('Instagram投稿更新エラー:', error);
      this._showFeedback('Instagram投稿の読み込みに失敗しました', 'error');
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
    
    try {
    const settings = this.getInstagramSettingsData();
      localStorage.setItem('rbs_instagram_settings', JSON.stringify(settings));
      this._showFeedback('Instagram設定が保存されました', 'success');
    } catch (error) {
      this.error('Instagram設定保存エラー:', error);
      this._showFeedback('Instagram設定の保存に失敗しました', 'error');
    }
  }

  /**
   * Instagram投稿編集
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
      this.switchInstagramTab('posts');
    } catch (error) {
      this.error('Instagram投稿編集エラー:', error);
      this._showFeedback(error.message || 'Instagram投稿の読み込みに失敗しました', 'error');
    }
  }

  /**
   * Instagram投稿のステータス切り替え
   */
  async toggleInstagramPostStatus(postId) {
    this.debug(`Instagram投稿ステータス切り替え: ${postId}`);
    
    try {
      if (!this.instagramDataService) {
        throw new Error('InstagramDataServiceが初期化されていません');
      }
      
      const result = await this.instagramDataService.togglePostStatus(postId);
      
      if (result.success) {
        this.refreshInstagramPosts();
        this.updateInstagramStats();
        this._showFeedback('投稿ステータスを更新しました', 'success');
      } else {
        throw new Error(result.message || 'ステータス更新に失敗しました');
      }
    } catch (error) {
      this.error('Instagram投稿ステータス切り替えエラー:', error);
      this._showFeedback(error.message || 'ステータス更新に失敗しました', 'error');
    }
  }

  /**
   * Instagram投稿削除
   */
  async deleteInstagramPost(postId) {
    this.debug(`Instagram投稿削除: ${postId}`);
    
    if (!confirm('この投稿を削除してもよろしいですか？')) {
      return;
    }
    
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
        throw new Error(result.message || '投稿削除に失敗しました');
      }
    } catch (error) {
      this.error('Instagram投稿削除エラー:', error);
      this._showFeedback(error.message || '投稿削除に失敗しました', 'error');
    }
  }

  /**
   * Instagram投稿の注目設定切り替え
   */
  async toggleInstagramFeatured(postId) {
    this.debug(`Instagram投稿注目設定切り替え: ${postId}`);
    
    try {
      if (!this.instagramDataService) {
        throw new Error('InstagramDataServiceが初期化されていません');
      }
      
      const result = await this.instagramDataService.togglePostFeatured(postId);
      
      if (result.success) {
        this.refreshInstagramPosts();
        this.updateInstagramStats();
        this._showFeedback('注目設定を更新しました', 'success');
      } else {
        throw new Error(result.message || '注目設定更新に失敗しました');
      }
    } catch (error) {
      this.error('Instagram投稿注目設定切り替えエラー:', error);
      this._showFeedback(error.message || '注目設定更新に失敗しました', 'error');
    }
  }

  /**
   * フォームからInstagram投稿データを取得
   */
  getInstagramFormData() {
    return {
      id: document.getElementById('instagram-post-id')?.value || undefined,
      embedCode: document.getElementById('instagram-embed-code')?.value?.trim() || '',
      status: document.getElementById('instagram-status')?.checked ? 'active' : 'inactive',
      featured: document.getElementById('instagram-featured')?.checked || false
    };
  }

  /**
   * Instagram設定データを取得
   */
  getInstagramSettingsData() {
    return {
      maxPostsDisplay: parseInt(document.getElementById('max-posts-display')?.value) || 10,
      openNewTab: document.getElementById('open-new-tab')?.checked !== false
    };
  }

  /**
   * Instagram投稿をフォームに読み込み
   */
  loadInstagramPostToForm(post) {
    const idField = document.getElementById('instagram-post-id');
    const embedField = document.getElementById('instagram-embed-code');
    const statusField = document.getElementById('instagram-status');
    const featuredField = document.getElementById('instagram-featured');
    
    if (idField) idField.value = post.id;
    if (embedField) embedField.value = post.embedCode || '';
    if (statusField) statusField.checked = post.status === 'active';
    if (featuredField) featuredField.checked = post.featured || false;
  }

  /**
   * Instagramフォームをクリア
   */
  clearInstagramForm() {
    const form = document.getElementById('instagram-post-form');
    if (form) {
      form.reset();
    }
    
    const idField = document.getElementById('instagram-post-id');
    if (idField) idField.value = '';
    
    const statusField = document.getElementById('instagram-status');
    if (statusField) statusField.checked = true;
    
    const featuredField = document.getElementById('instagram-featured');
    if (featuredField) featuredField.checked = false;
  }

  /**
   * Instagram投稿一覧をレンダリング
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
          <h3 class="empty-title">${CONFIG.instagram.ui.messages.empty}</h3>
          <p class="empty-description">上のフォームから最初の投稿を追加してください</p>
          <button class="btn btn-primary" onclick="document.getElementById('instagram-embed-code').focus()" title="埋め込みコード入力欄にフォーカス">
            <i class="fas fa-plus"></i>
            投稿を追加
          </button>
        </div>
      `;
      return;
    }
    
    const html = posts.map(post => this.renderInstagramPostItem(post)).join('');
    container.innerHTML = html;
    this.processInstagramEmbeds();
  }

  /**
   * Instagram投稿アイテムをレンダリング
   */
  renderInstagramPostItem(post) {
    const createdDate = new Date(post.createdAt).toLocaleDateString('ja-JP');
    const embedHtml = this.generateInstagramEmbedFromCode(post.embedCode);
    
    return `
      <div class="instagram-post-card" data-post-id="${post.id}">
        <div class="instagram-embed-container">
          ${embedHtml}
        </div>
        
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
   * 埋め込みコードからInstagram埋め込みを生成
   */
  generateInstagramEmbedFromCode(embedCode) {
    if (!embedCode) {
      return this.generateInstagramFallback();
    }
    
    return `
      <div class="instagram-embed-wrapper">
        ${embedCode}
      </div>
    `;
  }

  /**
   * Instagramフォールバック表示を生成
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
   * Instagram埋め込みスクリプトを処理
   */
  processInstagramEmbeds() {
    try {
      this.debug('📸 Instagram埋め込み処理開始');
      
      const existingScript = document.querySelector('script[src*="embed.js"]');
      
      if (!existingScript) {
        this.debug('📸 Instagram埋め込みスクリプトを動的追加');
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.src = 'https://www.instagram.com/embed.js';
        
        script.addEventListener('load', () => {
          this.debug('✅ Instagram埋め込みスクリプト読み込み完了');
          setTimeout(() => this.retryInstagramProcess(), 100);
        }, { passive: true });
        
        script.addEventListener('error', (e) => {
          this.warn('⚠️ Instagram埋め込みスクリプト読み込み失敗:', e);
        }, { passive: true });
        
        if (document.head) {
          document.head.appendChild(script);
        }
      } else {
        setTimeout(() => this.retryInstagramProcess(), 200);
      }
    } catch (error) {
      this.error('❌ Instagram埋め込み処理エラー:', error);
    }
  }

  /**
   * Instagram埋め込み処理をリトライ
   */
  retryInstagramProcess() {
    let retries = 0;
    const maxRetries = 15;
    const retryInterval = 300;
    
    const processEmbeds = () => {
      if (typeof window.instgrm !== 'undefined' && window.instgrm.Embeds) {
        try {
          window.instgrm.Embeds.process();
          this.debug('✅ Instagram埋め込み処理完了');
          
          setTimeout(() => {
            if (window.instgrm && window.instgrm.Embeds) {
              window.instgrm.Embeds.process();
              this.debug('✅ Instagram埋め込み再処理完了');
            }
          }, 1000);
          
        } catch (embedError) {
          this.warn('⚠️ Instagram埋め込み処理中エラー:', embedError);
        }
      } else if (retries < maxRetries) {
        retries++;
        this.debug(`🔄 Instagram埋め込みスクリプト待機中... (${retries}/${maxRetries})`);
        setTimeout(processEmbeds, retryInterval);
      } else {
        this.warn('⚠️ Instagram埋め込みスクリプト読み込みタイムアウト');
      }
    };
    
    setTimeout(processEmbeds, 100);
  }

  /**
   * Instagram設定を読み込み
   */
  loadInstagramSettings() {
    try {
      this.populateDisplayOptions();
      
      const settingsData = localStorage.getItem('rbs_instagram_settings');
      const settings = settingsData ? JSON.parse(settingsData) : {};
      
      const maxPostsDisplayElement = document.getElementById('max-posts-display');
      const openNewTabElement = document.getElementById('open-new-tab');
      
      if (maxPostsDisplayElement) {
        maxPostsDisplayElement.value = settings.maxPostsDisplay || 10;
      }
      
      if (openNewTabElement) {
        openNewTabElement.checked = settings.openNewTab !== false;
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
      if (!selectElement) return;
      
      selectElement.innerHTML = '';
      
      const options = CONFIG.instagram.displayOptions;
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = `${option}件`;
        
        if (option === CONFIG.instagram.defaultDisplay) {
          optionElement.selected = true;
        }
        
        selectElement.appendChild(optionElement);
      });
    } catch (error) {
      this.warn('表示件数選択肢生成エラー:', error);
    }
  }

  /**
   * Instagram統計を更新
   */
  updateInstagramStats() {
    try {
      if (!this.instagramDataService) return;
      
      const posts = this.instagramDataService.getAllPosts();
      const activePosts = posts.filter(post => post.status === 'active');
      const featuredPosts = posts.filter(post => post.featured);
      
      // 統計表示を更新
      const totalElement = document.getElementById('instagram-total-count');
      const activeElement = document.getElementById('instagram-active-count');
      const featuredElement = document.getElementById('instagram-featured-count');
      
      if (totalElement) totalElement.textContent = posts.length;
      if (activeElement) activeElement.textContent = activePosts.length;
      if (featuredElement) featuredElement.textContent = featuredPosts.length;
    } catch (error) {
      this.warn('Instagram統計更新エラー:', error);
    }
  }

  /**
   * Instagram埋め込みコードを検証
   */
  validateInstagramEmbed(embedCode) {
    if (!embedCode || embedCode.trim() === '') {
      return false;
    }
    
    // CONFIGの検証パターンを使用
    const validation = CONFIG.instagram.validation;
    return validation.embedPattern.test(embedCode) && 
           embedCode.length >= validation.minEmbedLength && 
           embedCode.length <= validation.maxEmbedLength;
  }

  /**
   * Instagram投稿リストをフィルタ
   */
  filterInstagramList() {
    try {
      const filterSelect = document.getElementById('instagram-filter');
      if (!filterSelect) return;
      
      const filterValue = filterSelect.value;
      const posts = document.querySelectorAll('.instagram-post-card');
      
      // フィルタ状態を保存
      localStorage.setItem('rbs_instagram_filter', filterValue);
      
      posts.forEach(post => {
        const statusBadge = post.querySelector('.status-badge');
        const featuredBadge = post.querySelector('.featured-badge');
        
        let shouldShow = true;
        
        if (filterValue === 'active') {
          shouldShow = statusBadge && statusBadge.classList.contains('active');
        } else if (filterValue === 'inactive') {
          shouldShow = statusBadge && statusBadge.classList.contains('inactive');
        } else if (filterValue === 'featured') {
          shouldShow = featuredBadge !== null;
        }
        
        post.style.display = shouldShow ? 'block' : 'none';
      });
      
      // フィルタ結果の表示
      const visiblePosts = Array.from(posts).filter(post => post.style.display !== 'none');
      this.debug(`Instagram投稿フィルタ適用: ${visiblePosts.length}/${posts.length}件表示`);
    } catch (error) {
      this.error('Instagram投稿フィルタエラー:', error);
    }
  }

  logout() { this.handleLogout(); }
  openExternal(params) { 
    const url = params?.url;
    if (url) window.open(url, '_blank');
  }

  // ===========================================
  // LP側データ統合メソッド（CONFIG統一）
  // ===========================================

  /**
   * LP側で使用する公開記事を取得
   */
  getPublishedArticlesForLP() {
    return this.getArticles()
      .filter(article => article.status === 'published')
      .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
      .map(article => ({
        ...article,
        categoryInfo: CONFIG.helpers.getCategoryInfo(article.category),
        formattedDate: CONFIG.helpers.formatDate(article.publishedAt || article.createdAt),
        excerpt: article.summary || article.content.substring(0, CONFIG.articles.excerptLength) + '...'
      }));
  }

  /**
   * LP側で使用するカテゴリ別記事を取得
   */
  getArticlesByCategory(category) {
    return this.getPublishedArticlesForLP()
      .filter(article => article.category === category);
  }

  /**
   * LP側で使用する注目記事を取得
   */
  getFeaturedArticlesForLP() {
    return this.getPublishedArticlesForLP()
      .filter(article => article.featured)
      .slice(0, 3); // 最大3件
  }

  /**
   * LP側で使用するInstagram投稿を取得
   */
  getActiveInstagramPostsForLP() {
      if (!this.instagramDataService) {
      return [];
    }
    
    return this.instagramDataService.getAllPosts()
      .filter(post => post.status === 'active')
      .sort((a, b) => {
        // 注目投稿を優先、その後作成日時順
        if (post.featured && !b.featured) return -1;
        if (!post.featured && b.featured) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
      .slice(0, CONFIG.instagram.defaultDisplay);
  }

  /**
   * 統一されたアプリケーション設定を取得
   */
  getAppConfig() {
    return {
      app: CONFIG.app,
      ui: CONFIG.ui,
      articles: CONFIG.articles,
      instagram: CONFIG.instagram
    };
  }
}

// デフォルトエクスポート
export default AdminActionService;

// ===========================================
// LP側データ統合API（CONFIG統一版）
// ===========================================

/**
 * LP側からアクセス可能な統一データAPI
 * CONFIG設定を使用してデータを統合
 */
export const RBSDataAPI = {
  /**
   * 公開記事を取得
   */
  getPublishedArticles() {
    try {
      const articles = JSON.parse(localStorage.getItem(CONFIG.storage.keys.articles) || '[]');
      return articles
        .filter(article => article.status === 'published')
        .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
        .map(article => ({
          ...article,
          categoryInfo: CONFIG.helpers.getCategoryInfo(article.category),
          formattedDate: CONFIG.helpers.formatDate(article.publishedAt || article.createdAt),
          excerpt: article.summary || article.content.substring(0, CONFIG.articles.excerptLength) + '...'
        }));
    } catch (error) {
      console.error('記事取得エラー:', error);
      return [];
    }
  },

  /**
   * カテゴリ別記事を取得
   */
  getArticlesByCategory(category) {
    return this.getPublishedArticles().filter(article => article.category === category);
  },

  /**
   * 注目記事を取得
   */
  getFeaturedArticles() {
    return this.getPublishedArticles()
      .filter(article => article.featured)
      .slice(0, 3);
  },

  /**
   * 最新記事を取得
   */
  getLatestArticles(limit = 5) {
    return this.getPublishedArticles().slice(0, limit);
  },

  /**
   * アクティブなInstagram投稿を取得
   */
  getActiveInstagramPosts() {
    try {
      const posts = JSON.parse(localStorage.getItem(CONFIG.storage.keys.instagram) || '[]');
      return posts
        .filter(post => post.status === 'active')
        .sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .slice(0, CONFIG.instagram.defaultDisplay);
    } catch (error) {
      console.error('Instagram投稿取得エラー:', error);
      return [];
    }
  },

  /**
   * アプリケーション設定を取得
   */
  getConfig() {
    return {
      app: CONFIG.app,
      ui: CONFIG.ui,
      articles: CONFIG.articles,
      instagram: CONFIG.instagram
    };
  }
};

// グローバルアクセス用
if (typeof window !== 'undefined') {
  window.RBSDataAPI = RBSDataAPI;
}