/**
 * ニュース表示コンポーネント
 * Supabaseと統合してデータを取得・表示
 * @version 3.0.0 - Supabase完全統合版
 */

import { EventBus } from '../../services/EventBus.js';
import { getArticleSupabaseService } from '../../services/ArticleSupabaseService.js';
import { CONFIG } from '../../constants/config.js';

export class NewsDisplayComponent {
  constructor(containerId, options = {}) {
    this.componentName = 'NewsDisplayComponent';
    this.containerId = containerId;
    this.container = null;
    
    // オプション設定
    this.options = {
      maxArticles: options.maxArticles || 5,
      showCategory: options.showCategory !== false,
      showDate: options.showDate !== false,
      showExcerpt: options.showExcerpt !== false,
      autoRefresh: options.autoRefresh || false,
      refreshInterval: options.refreshInterval || 300000, // 5分
      categories: options.categories || [], // 空の場合は全カテゴリー
      sortBy: options.sortBy || 'publishedAt', // publishedAt, createdAt, title
      sortOrder: options.sortOrder || 'desc', // desc, asc
      ...options
    };
    
    // 状態管理
    this.initialized = false;
    this.loading = false;
    this.articles = [];
    this.error = null;
    
    // Supabaseサービス
    this.articleService = null;
    
    // 自動更新タイマー
    this.refreshTimer = null;
    
    // パフォーマンス追跡
    this.performanceMetrics = {
      lastLoadTime: null,
      loadCount: 0,
      errorCount: 0
    };
  }

  /**
   * コンポーネント初期化
   */
  async init() {
    if (this.initialized) {
      this.debug('既に初期化済み');
      return;
    }

    try {
      this.debug('ニュース表示コンポーネント初期化開始');
      
      // コンテナ要素の取得
      this.container = document.getElementById(this.containerId);
      if (!this.container) {
        throw new Error(`コンテナ要素が見つかりません: ${this.containerId}`);
      }
      
      // Supabaseサービスの初期化
      await this.initializeSupabaseService();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // 初期データ読み込み
      await this.loadArticles();
      
      // 自動更新設定
      if (this.options.autoRefresh) {
        this.startAutoRefresh();
      }
      
      this.initialized = true;
      this.debug('初期化完了');
      
      // 初期化完了イベント
      EventBus.emit('newsDisplay:initialized', {
        componentId: this.containerId,
        articlesCount: this.articles.length
      });
      
    } catch (error) {
      this.error('初期化エラー:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Supabaseサービスの初期化
   */
  async initializeSupabaseService() {
    this.debug('Supabaseサービスを初期化中...');
    
    this.articleService = getArticleSupabaseService();
    
    if (!this.articleService.initialized) {
      await this.articleService.init();
    }
    
    this.debug('Supabaseサービス初期化完了');
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // Supabaseサービスのイベント監視
    EventBus.on('article:saved', () => {
      this.debug('記事保存イベントを受信');
      this.refresh();
    });
    
    EventBus.on('article:deleted', () => {
      this.debug('記事削除イベントを受信');
      this.refresh();
    });
    
    EventBus.on('article:published', () => {
      this.debug('記事公開イベントを受信');
      this.refresh();
    });
    
    // Supabaseサービスの初期化完了イベント
    EventBus.on('articleSupabase:initialized', (event) => {
      this.debug('Supabaseサービス初期化完了:', event);
      if (!this.initialized) {
        this.refresh();
      }
    });
    
    // エラーイベント
    EventBus.on('articleSupabase:error', (event) => {
      this.error('Supabaseサービスエラー:', event);
      this.handleError(new Error(event.message || 'Supabaseサービスエラー'));
    });
  }

  /**
   * 記事データの読み込み
   */
  async loadArticles() {
    if (this.loading) {
      this.debug('既に読み込み中です');
      return;
    }

    this.loading = true;
    const startTime = performance.now();
    
    try {
      this.debug('記事データ読み込み開始');
      this.showLoading();
      
      // Supabaseサービスの初期化確認
      if (!this.articleService) {
        await this.initializeSupabaseService();
      }
      
      // Supabaseから公開記事を取得
      const options = {
        limit: this.options.maxArticles,
        categories: this.options.categories.length > 0 ? this.options.categories : undefined,
        sortBy: this.options.sortBy,
        sortOrder: this.options.sortOrder
      };
      
      this.articles = await this.articleService.getPublishedArticles(options);
      
      this.debug(`${this.articles.length}件の記事を読み込み完了`);
      
      // 表示更新
      this.renderArticles();
      
      // パフォーマンス記録
      this.performanceMetrics.lastLoadTime = performance.now() - startTime;
      this.performanceMetrics.loadCount++;
      
      // 読み込み完了イベント
      EventBus.emit('newsDisplay:loaded', {
        componentId: this.containerId,
        articlesCount: this.articles.length,
        loadTime: this.performanceMetrics.lastLoadTime
      });
      
    } catch (error) {
      this.error('記事読み込みエラー:', error);
      this.performanceMetrics.errorCount++;
      this.handleError(error);
    } finally {
      this.loading = false;
      this.hideLoading();
    }
  }

  /**
   * 記事の表示
   */
  renderArticles() {
    if (!this.container) {
      this.error('コンテナ要素が見つかりません');
      return;
    }

    try {
      this.debug('記事表示開始');
      
      if (this.articles.length === 0) {
        this.renderEmptyState();
        return;
      }
      
      const articlesHtml = this.articles.map(article => this.renderArticleCard(article)).join('');
      
      this.container.innerHTML = `
        <div class="news-display-container">
          <div class="news-articles">
            ${articlesHtml}
          </div>
        </div>
      `;
      
      // アニメーション効果
      this.applyAnimations();
      
      this.debug('記事表示完了');
      
    } catch (error) {
      this.error('記事表示エラー:', error);
      this.handleError(error);
    }
  }

  /**
   * 記事カードのレンダリング
   */
  renderArticleCard(article) {
    const publishedDate = new Date(article.publishedAt || article.createdAt);
    const formattedDate = publishedDate.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const categoryDisplay = this.options.showCategory && article.category ? 
      `<span class="news-category news-category-${article.category}">${this.getCategoryLabel(article.category)}</span>` : '';
    
    const dateDisplay = this.options.showDate ? 
      `<time class="news-date" datetime="${article.publishedAt || article.createdAt}">${formattedDate}</time>` : '';
    
    const excerptDisplay = this.options.showExcerpt && article.excerpt ? 
      `<p class="news-excerpt">${this.escapeHtml(article.excerpt)}</p>` : '';
    
    return `
      <article class="news-card" data-article-id="${article.id}">
        <div class="news-card-content">
          <header class="news-card-header">
            ${categoryDisplay}
            <h3 class="news-title">
              <a href="news-detail.html?id=${article.id}" class="news-link">
                ${this.escapeHtml(article.title)}
              </a>
            </h3>
            ${dateDisplay}
          </header>
          ${excerptDisplay}
        </div>
      </article>
    `;
  }

  /**
   * 空の状態の表示
   */
  renderEmptyState() {
    this.container.innerHTML = `
      <div class="news-empty-state">
        <div class="news-empty-icon">📰</div>
        <h3 class="news-empty-title">記事がありません</h3>
        <p class="news-empty-message">現在表示できる記事がありません。</p>
      </div>
    `;
  }

  /**
   * ローディング表示
   */
  showLoading() {
    if (this.container) {
      this.container.innerHTML = `
        <div class="news-loading">
          <div class="news-loading-spinner"></div>
          <p class="news-loading-text">記事を読み込み中...</p>
        </div>
      `;
    }
  }

  /**
   * ローディング非表示
   */
  hideLoading() {
    const loadingElement = this.container?.querySelector('.news-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  /**
   * アニメーション効果の適用
   */
  applyAnimations() {
    const cards = this.container.querySelectorAll('.news-card');
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
      card.classList.add('news-card-animate');
    });
  }

  /**
   * カテゴリーラベルの取得
   */
  getCategoryLabel(category) {
    const categoryLabels = {
      general: '一般',
      event: 'イベント',
      notice: 'お知らせ',
      lesson: 'レッスン',
      other: 'その他'
    };
    return categoryLabels[category] || category;
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
   * エラーハンドリング
   */
  handleError(error) {
    this.error = error;
    
    if (this.container) {
      this.container.innerHTML = `
        <div class="news-error">
          <div class="news-error-icon">⚠️</div>
          <h3 class="news-error-title">読み込みエラー</h3>
          <p class="news-error-message">記事の読み込み中にエラーが発生しました。</p>
          <button class="news-error-retry" onclick="this.closest('.news-display-container, [id]').dispatchEvent(new CustomEvent('retry'))">
            再試行
          </button>
        </div>
      `;
      
      // 再試行イベントリスナー
      this.container.addEventListener('retry', () => {
        this.refresh();
      });
    }
    
    // エラーイベント
    EventBus.emit('newsDisplay:error', {
      componentId: this.containerId,
      error: error.message
    });
  }

  /**
   * 自動更新開始
   */
  startAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = setInterval(() => {
      this.debug('自動更新実行');
      this.refresh();
    }, this.options.refreshInterval);
    
    this.debug(`自動更新開始 (${this.options.refreshInterval}ms間隔)`);
  }

  /**
   * 自動更新停止
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      this.debug('自動更新停止');
    }
  }

  /**
   * 手動更新
   */
  async refresh() {
    this.debug('手動更新実行');
    await this.loadArticles();
  }

  /**
   * パフォーマンス情報取得
   */
  getPerformanceInfo() {
    return {
      ...this.performanceMetrics,
      articlesCount: this.articles.length,
      initialized: this.initialized,
      loading: this.loading
    };
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    this.debug('コンポーネント破棄中...');
    
    // 自動更新停止
    this.stopAutoRefresh();
    
    // イベントリスナーのクリーンアップ
    EventBus.off('article:saved');
    EventBus.off('article:deleted');
    EventBus.off('article:published');
    EventBus.off('articleSupabase:initialized');
    EventBus.off('articleSupabase:error');
    
    // 状態リセット
    this.initialized = false;
    this.articles = [];
    this.error = null;
    this.articleService = null;
    
    // コンテナクリア
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.debug('コンポーネント破棄完了');
  }

  /**
   * デバッグログ
   */
  debug(message, ...args) {
    if (CONFIG.debug?.enabled) {
      console.log(`[${this.componentName}:${this.containerId}] ${message}`, ...args);
    }
  }

  /**
   * エラーログ
   */
  error(message, ...args) {
    console.error(`[${this.componentName}:${this.containerId}] ${message}`, ...args);
  }
}

export default NewsDisplayComponent; 