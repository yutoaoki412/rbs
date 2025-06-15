/**
 * LP側ニュースコントローラー
 * index.html、news.html、news-detail.htmlでのニュース表示を統合管理
 * @version 2.0.0 - 統合版（schema.sql対応）
 */

import { getLPNewsSupabaseService } from '../services/LPNewsSupabaseService.js';
import { getArticleSupabaseService } from '../../../shared/services/ArticleSupabaseService.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class LPNewsController {
  constructor() {
    this.componentName = 'LPNewsController';
    this.newsService = null;
    this.articleService = null;
    this.initialized = false;
    this.pageType = this.detectPageType();
    this.currentData = {
      articles: [],
      categories: [],
      lastUpdated: null
    };
    
    // パフォーマンス追跡
    this.performanceMetrics = {
      loadTime: null,
      renderTime: null
    };
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) {
      console.log('[LPNewsController] 既に初期化済み');
      return;
    }

    try {
      console.log('[LPNewsController] 初期化開始:', this.pageType);
      
      // Supabaseサービス初期化（統合ID管理）
      await this.initializeServices();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // ページタイプに応じた表示処理
      await this.initializePageContent();
      
      this.initialized = true;
      console.log('[LPNewsController] 初期化完了');
      
      // 初期化完了イベント
      EventBus.emit('lpNews:initialized', {
        pageType: this.pageType,
        articleCount: this.currentData.articles.length
      });
      
    } catch (error) {
      console.error('[LPNewsController] 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * Supabaseサービス初期化（統合ID管理）
   */
  async initializeServices() {
    try {
      // LPニュースサービス
      this.newsService = getLPNewsSupabaseService();
      if (!this.newsService.initialized) {
        await this.newsService.init();
      }
      
      // 記事管理サービス（管理画面と共通）
      this.articleService = getArticleSupabaseService();
      if (!this.articleService.initialized) {
        await this.articleService.init();
      }
      
      console.log('[LPNewsController] Supabaseサービス初期化完了');
    } catch (error) {
      console.error('[LPNewsController] サービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // 記事更新イベント（管理画面からの通知）
    EventBus.on('article:saved', (data) => {
      console.log('[LPNewsController] 記事更新イベント受信:', data.articleId);
      this.refresh();
    });
    
    EventBus.on('article:published', (data) => {
      console.log('[LPNewsController] 記事公開イベント受信:', data.articleId);
      this.refresh();
    });
    
    EventBus.on('article:deleted', (data) => {
      console.log('[LPNewsController] 記事削除イベント受信:', data.articleId);
      this.refresh();
    });
  }

  /**
   * ニュースデータを読み込み（統合ID管理）
   */
  async loadNews(options = {}) {
    const startTime = performance.now();
    
    try {
      console.log('[LPNewsController] ニュース読み込み開始', options);
      
      // 公開済み記事を取得（schema.sql準拠）
      const result = await this.articleService.getPublishedArticles({
        limit: options.limit || 50,
        category: options.category,
        offset: options.offset || 0
      });
      
      if (result.success && result.data) {
        this.currentData.articles = result.data;
        this.currentData.lastUpdated = new Date();
        
        // カテゴリ一覧も更新
        this.updateCategories();
        
        this.performanceMetrics.loadTime = performance.now() - startTime;
        console.log(`[LPNewsController] ニュース読み込み完了: ${this.currentData.articles.length}件`);
        
        // 読み込み完了イベント
        EventBus.emit('lpNews:loaded', {
          articleCount: this.currentData.articles.length,
          loadTime: this.performanceMetrics.loadTime
        });
        
        return this.currentData.articles;
      } else {
        throw new Error(result.error || 'ニュース読み込みに失敗しました');
      }
      
    } catch (error) {
      console.error('[LPNewsController] ニュース読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * カテゴリ一覧を更新
   */
  updateCategories() {
    const categories = new Set();
    this.currentData.articles.forEach(article => {
      if (article.category) {
        categories.add(article.category);
      }
    });
    this.currentData.categories = Array.from(categories);
  }

  /**
   * 記事をIDで取得（統合ID管理）
   */
  async getArticleById(articleId) {
    try {
      console.log('[LPNewsController] 記事取得開始:', articleId);
      
      const result = await this.articleService.getArticleById(articleId);
      
      if (result.success && result.data) {
        // 公開状態チェック
        if (result.data.status !== 'published') {
          throw new Error('この記事は公開されていません');
        }
        
        console.log('[LPNewsController] 記事取得完了:', result.data.title);
        return result.data;
      } else {
        throw new Error(result.error || '記事が見つかりません');
      }
      
    } catch (error) {
      console.error('[LPNewsController] 記事取得エラー:', error);
      throw error;
    }
  }

  /**
   * ページタイプを検出
   */
  detectPageType() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'index.html';
    
    if (fileName.includes('news-detail')) return 'news-detail';
    if (fileName.includes('news.html')) return 'news-list';
    return 'home'; // index.html またはルート
  }

  /**
   * ページタイプに応じたコンテンツ初期化
   */
  async initializePageContent() {
    switch (this.pageType) {
      case 'home':
        await this.initializeHomePage();
        break;
      case 'news-list':
        await this.initializeNewsListPage();
        break;
      case 'news-detail':
        await this.initializeNewsDetailPage();
        break;
    }
  }

  /**
   * ホームページのニュースセクション初期化
   */
  async initializeHomePage() {
    const newsContainer = document.getElementById('news-grid');
    const statusContainer = document.getElementById('news-loading-status');
    
    if (!newsContainer) {
      console.warn('[LPNewsController] ニュースコンテナが見つかりません (home)');
      return;
    }

    try {
      // ローディング状態を表示
      this.showLoadingStatus(statusContainer, 'ニュースを読み込み中...');
      
      // ニュースを読み込み
      const articles = await this.loadNews({ limit: 6 });
      
      // ニュース一覧HTML生成
      const newsHtml = this.generateNewsGrid(articles, { isHomeVersion: true });
      newsContainer.innerHTML = newsHtml;
      
      // ローディング状態を非表示
      this.hideLoadingStatus(statusContainer);
      
      console.log('[LPNewsController] ホームページのニュース表示完了');
      
    } catch (error) {
      console.error('[LPNewsController] ホームページニュース表示エラー:', error);
      this.showErrorStatus(statusContainer, 'ニュースの読み込みに失敗しました');
    }
  }

  /**
   * ニュース一覧ページ初期化
   */
  async initializeNewsListPage() {
    const newsGrid = document.getElementById('news-grid');
    const searchResults = document.getElementById('search-results');
    
    if (!newsGrid) {
      console.warn('[LPNewsController] ニュースグリッドが見つかりません (news-list)');
      return;
    }

    try {
      // URLパラメータからカテゴリー取得
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category') || 'all';
      
      // フィルターボタンの状態更新
      this.updateFilterButtons(category);
      
      // ニュースを読み込み
      const options = { 
        ...(category !== 'all' ? { category } : {})
      };
      const articles = await this.loadNews(options);
      
      // ニュース一覧HTML生成
      const newsHtml = this.generateNewsGrid(articles, { isHomeVersion: false });
      newsGrid.innerHTML = newsHtml;
      
      // 検索結果表示の更新
      this.updateSearchResults(searchResults, category);
      
      // フィルターイベントリスナー設定
      this.setupFilterListeners();
      
      console.log('[LPNewsController] ニュース一覧ページ表示完了');
      
    } catch (error) {
      console.error('[LPNewsController] ニュース一覧ページエラー:', error);
      newsGrid.innerHTML = '<div class="news-error">ニュースの読み込みに失敗しました</div>';
    }
  }

  /**
   * ニュース詳細ページ初期化
   */
  async initializeNewsDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
      this.showArticleNotFound();
      return;
    }

    try {
      // 記事詳細取得
      const article = await this.getArticleById(articleId);
      
      if (!article) {
        this.showArticleNotFound();
        return;
      }
      
      // ページタイトル更新
      document.title = `${article.title} - RBS陸上教室`;
      
      // メタタグ更新
      this.updateMetaTags(article);
      
      // 記事内容表示
      this.renderArticleDetail(article);
      
      // 関連記事読み込み
      await this.loadRelatedArticles(article);
      
      console.log('[LPNewsController] ニュース詳細ページ表示完了');
      
    } catch (error) {
      console.error('[LPNewsController] ニュース詳細ページエラー:', error);
      this.showArticleNotFound();
    }
  }

  /**
   * ニュースグリッドHTML生成（統合ID管理）
   */
  generateNewsGrid(articles, options = {}) {
    if (!articles || articles.length === 0) {
      return '<div class="news-empty">ニュースがありません</div>';
    }
    
    return articles.map(article => {
      const categoryInfo = this.getCategoryInfo(article.category);
      const formattedDate = this.formatDate(article.published_at || article.created_at);
      const cardClass = options.isHomeVersion ? 'news-card home-news-card' : 'news-card';
      
      return `
        <article class="${cardClass}" data-article-id="${article.id}">
          <div class="news-card-header">
            <div class="news-meta">
              <div class="news-date">${formattedDate}</div>
              <div class="news-category ${article.category}">${categoryInfo.label}</div>
            </div>
            <h3 class="news-title">
              <a href="news-detail.html?id=${article.id}">${this.escapeHtml(article.title)}</a>
            </h3>
          </div>
          <div class="news-card-body">
            <p class="news-excerpt">${this.escapeHtml(article.summary || this.createExcerpt(article.content))}</p>
            <div class="news-actions">
              <a href="news-detail.html?id=${article.id}" class="news-read-more">続きを読む</a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  /**
   * 記事詳細表示
   */
  renderArticleDetail(article) {
    // タイトル
    const titleElement = document.querySelector('#article-title, .article-title');
    if (titleElement) {
      titleElement.textContent = article.title;
    }
    
    // 日付
    const dateElement = document.querySelector('#article-date, .article-date');
    if (dateElement) {
      dateElement.innerHTML = `<i class="fas fa-calendar"></i> ${this.formatDate(article.published_at || article.created_at)}`;
    }
    
    // カテゴリ
    const categoryElement = document.querySelector('#article-category, .article-category');
    if (categoryElement) {
      const categoryInfo = this.getCategoryInfo(article.category);
      categoryElement.className = `news-category ${article.category}`;
      categoryElement.textContent = categoryInfo.label;
    }
    
    // コンテンツ
    const contentElement = document.querySelector('#article-content, .article-content .article-body');
    if (contentElement) {
      contentElement.innerHTML = this.sanitizeContent(article.content);
    }
    
    // パンくず
    const breadcrumbTitle = document.querySelector('#breadcrumb-title');
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = article.title;
    }
  }

  /**
   * 関連記事読み込み
   */
  async loadRelatedArticles(currentArticle) {
    try {
      const relatedArticles = await this.loadNews({ 
        category: currentArticle.category,
        limit: 4 
      });
      
      // 現在の記事を除外
      const filteredArticles = relatedArticles.filter(article => article.id !== currentArticle.id);
      
      if (filteredArticles.length > 0) {
        this.renderRelatedArticles(filteredArticles.slice(0, 3));
      }
      
    } catch (error) {
      console.error('[LPNewsController] 関連記事読み込みエラー:', error);
    }
  }

  /**
   * 関連記事表示
   */
  renderRelatedArticles(articles) {
    const container = document.querySelector('#related-articles-container, .related-articles');
    const section = document.querySelector('#related-articles, .related-articles-section');
    
    if (!container || !articles.length) return;
    
    const relatedHtml = this.generateNewsGrid(articles, { isHomeVersion: false });
    container.innerHTML = relatedHtml;
    
    if (section) {
      section.classList.remove('hidden');
      section.style.display = 'block';
    }
  }

  /**
   * カテゴリ情報取得
   */
  getCategoryInfo(categoryId) {
    const categories = {
      'general': { label: 'お知らせ', color: '#4a90e2' },
      'event': { label: '体験会', color: '#50c8a3' },
      'notice': { label: 'お知らせ', color: '#f5a623' },
      'lesson': { label: 'レッスン', color: '#8e44ad' },
      'other': { label: 'その他', color: '#6c757d' }
    };
    return categories[categoryId] || categories['other'];
  }

  /**
   * 日付フォーマット
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * 抜粋作成
   */
  createExcerpt(content, length = 100) {
    if (!content) return '';
    const text = content.replace(/<[^>]*>/g, ''); // HTMLタグを除去
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * コンテンツサニタイズ
   */
  sanitizeContent(content) {
    if (!content) return '';
    // 基本的なHTMLタグのみ許可
    return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  /**
   * ローディング状態表示
   */
  showLoadingStatus(container, message) {
    if (!container) return;
    
    container.style.display = 'block';
    const statusText = container.querySelector('#news-status-text');
    if (statusText) {
      statusText.textContent = message;
    }
  }

  /**
   * ローディング状態非表示
   */
  hideLoadingStatus(container) {
    if (!container) return;
    container.style.display = 'none';
  }

  /**
   * エラー状態表示
   */
  showErrorStatus(container, message) {
    if (!container) return;
    
    container.style.display = 'block';
    container.className = 'news-loading-status error';
    const statusText = container.querySelector('#news-status-text');
    if (statusText) {
      statusText.textContent = message;
    }
  }

  /**
   * フィルターボタン更新
   */
  updateFilterButtons(activeCategory) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      const category = btn.getAttribute('data-category');
      if (category === activeCategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * 検索結果表示更新
   */
  updateSearchResults(container, category) {
    if (!container) return;
    
    const count = this.currentData.articles.length;
    const categoryLabel = category === 'all' ? '全て' : this.getCategoryInfo(category).label;
    
    container.classList.remove('hidden-section');
    const countElement = container.querySelector('#search-count');
    if (countElement) {
      countElement.textContent = count;
    }
    
    const resultsText = container.querySelector('.search-results-text');
    if (resultsText) {
      resultsText.innerHTML = `<span id="search-count">${count}</span>件の記事が見つかりました（${categoryLabel}）`;
    }
  }

  /**
   * フィルターイベントリスナー設定
   */
  setupFilterListeners() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const category = btn.getAttribute('data-category');
        this.updateNewsList(category);
      });
    });
  }

  /**
   * ニュース一覧更新
   */
  async updateNewsList(category) {
    const newsGrid = document.getElementById('news-grid');
    const searchResults = document.getElementById('search-results');
    
    if (!newsGrid) return;
    
    try {
      // ローディング表示
      newsGrid.innerHTML = '<div class="news-loading">読み込み中...</div>';
      
      // URL更新
      const url = new URL(window.location);
      if (category === 'all') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', category);
      }
      window.history.pushState({}, '', url);
      
      // ニュース再読み込み
      const options = category !== 'all' ? { category } : {};
      const articles = await this.loadNews(options);
      
      // 表示更新
      const newsHtml = this.generateNewsGrid(articles, { isHomeVersion: false });
      newsGrid.innerHTML = newsHtml;
      
      // フィルターボタンとサーチ結果更新
      this.updateFilterButtons(category);
      this.updateSearchResults(searchResults, category);
      
    } catch (error) {
      console.error('[LPNewsController] ニュース一覧更新エラー:', error);
      newsGrid.innerHTML = '<div class="news-error">ニュースの読み込みに失敗しました</div>';
    }
  }

  /**
   * 記事未発見表示
   */
  showArticleNotFound() {
    document.title = '記事が見つかりません - RBS陸上教室';
    
    const container = document.querySelector('main, .article-container');
    if (container) {
      container.innerHTML = `
        <div class="article-not-found">
          <h1>記事が見つかりません</h1>
          <p>お探しの記事は存在しないか、公開されていません。</p>
          <a href="news.html" class="btn btn-primary">ニュース一覧に戻る</a>
        </div>
      `;
    }
  }

  /**
   * メタタグ更新
   */
  updateMetaTags(article) {
    // description
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', article.summary || this.createExcerpt(article.content, 160));
    }
    
    // keywords  
    const keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (keywordsMeta) {
      const keywords = `RBS,陸上教室,${this.getCategoryInfo(article.category).label},${article.title}`;
      keywordsMeta.setAttribute('content', keywords);
    }
  }

  /**
   * リフレッシュ
   */
  async refresh() {
    try {
      console.log('[LPNewsController] リフレッシュ開始');
      await this.initializePageContent();
      console.log('[LPNewsController] リフレッシュ完了');
    } catch (error) {
      console.error('[LPNewsController] リフレッシュエラー:', error);
    }
  }

  /**
   * パフォーマンス情報取得
   */
  getPerformanceInfo() {
    return {
      loadTime: this.performanceMetrics.loadTime,
      renderTime: this.performanceMetrics.renderTime,
      articleCount: this.currentData.articles.length,
      lastUpdated: this.currentData.lastUpdated
    };
  }

  /**
   * 破棄
   */
  destroy() {
    // イベントリスナー削除
    EventBus.off('article:saved');
    EventBus.off('article:published');
    EventBus.off('article:deleted');
    
    // データクリア
    this.currentData = { articles: [], categories: [], lastUpdated: null };
    this.initialized = false;
    
    console.log('[LPNewsController] 破棄完了');
  }
}

/**
 * LPNewsControllerのシングルトンインスタンス取得
 */
let lpNewsControllerInstance = null;

export function getLPNewsController() {
  if (!lpNewsControllerInstance) {
    lpNewsControllerInstance = new LPNewsController();
  }
  return lpNewsControllerInstance;
}

// デフォルトエクスポート
export default LPNewsController; 