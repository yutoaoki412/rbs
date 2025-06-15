/**
 * ニュース詳細ページコントローラー
 * @version 4.0.0 - Supabase完全統合版（schema.sql対応）
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { getArticleSupabaseService } from '../../../shared/services/ArticleSupabaseService.js';
import { getLPNewsSupabaseService } from '../services/LPNewsSupabaseService.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class NewsDetailController {
  constructor() {
    this.componentName = 'NewsDetailController';
    this.initialized = false;
    this.currentArticle = null;
    this.articleId = null;
    
    // DOM要素
    this.elements = {
      container: null,
      title: null,
      content: null,
      date: null,
      category: null,
      relatedArticles: null
    };
    
    // Supabaseサービス（統合ID管理）
    this.articleService = null;
    this.lpNewsService = null;
    
    // データキャッシュ
    this.cache = {
      article: null,
      relatedArticles: [],
      lastUpdated: null
    };
    
    // パフォーマンス追跡
    this.performanceMetrics = {
      loadTime: null,
      renderTime: null
    };
  }

  /**
   * コントローラー初期化
   */
  async init() {
    if (this.initialized) {
      this.debug('既に初期化済み');
      return;
    }

    try {
      this.debug('ニュース詳細コントローラー初期化開始');
      
      // URLパラメータから記事IDを取得
      this.articleId = this.getArticleIdFromUrl();
      if (!this.articleId) {
        const currentPage = window.location.pathname.split('/').pop() || 'unknown';
        console.warn(`[NewsDetailController] 記事ID未指定 (ページ: ${currentPage})`);
        throw new Error('記事IDが指定されていません');
      }
      
      // DOM要素の取得
      this.findElements();
      
      // Supabaseサービスの初期化（統合ID管理）
      await this.initializeSupabaseServices();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // 記事データの読み込み
      await this.loadArticle();
      
      this.initialized = true;
      this.debug('初期化完了');
      
      // 初期化完了イベント
      EventBus.emit('newsDetail:initialized', {
        articleId: this.articleId,
        controller: this.componentName
      });
      
    } catch (error) {
      this.error('初期化エラー:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * URLから記事IDを取得
   */
  getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    this.debug('URLから記事ID取得:', id);
    return id;
  }

  /**
   * DOM要素の取得
   */
  findElements() {
    this.elements = {
      container: document.querySelector('#article-content, .article-content, .news-detail'),
      title: document.querySelector('#article-title, .article-title, h1'),
      content: document.querySelector('#article-body, .article-body, .article-content'),
      date: document.querySelector('#article-date, .article-date'),
      category: document.querySelector('#article-category, .article-category'),
      relatedArticles: document.querySelector('#related-articles-container, .related-articles')
    };
    
    this.debug('DOM要素検索結果:', Object.fromEntries(
      Object.entries(this.elements).map(([key, element]) => [key, !!element])
    ));
  }

  /**
   * Supabaseサービスの初期化（統合ID管理）
   */
  async initializeSupabaseServices() {
    try {
      this.debug('Supabaseサービスを初期化中...');
      
      // 記事管理サービス（管理画面と共通）
      this.articleService = getArticleSupabaseService();
      if (!this.articleService.initialized) {
        await this.articleService.init();
      }
      
      // LPニュースサービス
      this.lpNewsService = getLPNewsSupabaseService();
      if (!this.lpNewsService.initialized) {
        await this.lpNewsService.init();
      }
      
      this.debug('Supabaseサービス初期化完了');
    } catch (error) {
      this.error('Supabaseサービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // 記事更新イベント（管理画面からの通知）
    EventBus.on('article:saved', (data) => {
      if (data.articleId === this.articleId) {
        this.debug('記事更新イベントを受信');
        this.refresh();
      }
    });
    
    // 記事削除イベント
    EventBus.on('article:deleted', (data) => {
      if (data.articleId === this.articleId) {
        this.debug('記事削除イベントを受信');
        this.handleArticleDeleted();
      }
    });
    
    // 記事公開状態変更イベント
    EventBus.on('article:published', (data) => {
      if (data.articleId === this.articleId) {
        this.debug('記事公開イベントを受信');
        this.refresh();
      }
    });
  }

  /**
   * 記事データの読み込み（統合ID管理）
   */
  async loadArticle() {
    const startTime = performance.now();
    
    try {
      this.debug(`記事読み込み開始: ${this.articleId}`);
      this.showLoading();
      
      // Supabaseから記事を取得（schema.sql準拠）
      const result = await this.articleService.getArticleById(this.articleId);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || '記事が見つかりません');
      }
      
      this.currentArticle = result.data;
      
      // 公開状態チェック
      if (this.currentArticle.status !== 'published') {
        throw new Error('この記事は公開されていません');
      }
      
      // キャッシュ更新
      this.cache.article = this.currentArticle;
      this.cache.lastUpdated = new Date();
      
      this.performanceMetrics.loadTime = performance.now() - startTime;
      this.debug(`記事読み込み完了: ${this.currentArticle.title} (${this.performanceMetrics.loadTime.toFixed(2)}ms)`);
      
      // 記事の表示
      await this.renderArticle();
      
      // 関連記事の読み込み
      await this.loadRelatedArticles();
      
      // 読み込み完了イベント
      EventBus.emit('newsDetail:loaded', {
        articleId: this.articleId,
        article: this.currentArticle,
        loadTime: this.performanceMetrics.loadTime
      });
      
    } catch (error) {
      this.error('記事読み込みエラー:', error);
      this.handleError(error);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 記事の表示
   */
  async renderArticle() {
    const startTime = performance.now();
    
    try {
      this.debug('記事表示開始');
      
      if (!this.currentArticle) {
        throw new Error('表示する記事がありません');
      }
      
      // ページタイトル更新
      document.title = `${this.currentArticle.title} - RBS陸上教室`;
      
      // メタタグ更新
      this.updateMetaTags();
      
      // タイトル表示
      if (this.elements.title) {
        this.elements.title.textContent = this.currentArticle.title;
      }
      
      // 日付表示
      if (this.elements.date) {
        const publishedDate = this.currentArticle.published_at || this.currentArticle.created_at;
        this.elements.date.innerHTML = `<i class="fas fa-calendar"></i> ${this.formatDate(publishedDate)}`;
      }
      
      // カテゴリ表示
      if (this.elements.category) {
        const categoryInfo = this.getCategoryInfo(this.currentArticle.category);
        this.elements.category.className = `news-category ${this.currentArticle.category}`;
        this.elements.category.textContent = categoryInfo.label;
      }
      
      // コンテンツ表示
      if (this.elements.content) {
        this.elements.content.innerHTML = this.sanitizeContent(this.currentArticle.content);
      }
      
      // パンくずリストタイトル更新
      const breadcrumbTitle = document.querySelector('#breadcrumb-title, .breadcrumb-title');
      if (breadcrumbTitle) {
        breadcrumbTitle.textContent = this.currentArticle.title;
      }
      
      this.performanceMetrics.renderTime = performance.now() - startTime;
      this.debug(`記事表示完了 (${this.performanceMetrics.renderTime.toFixed(2)}ms)`);
      
    } catch (error) {
      this.error('記事表示エラー:', error);
      throw error;
    }
  }

  /**
   * 関連記事の読み込み（統合ID管理）
   */
  async loadRelatedArticles() {
    try {
      this.debug('関連記事読み込み開始');
      
      if (!this.currentArticle) {
        this.debug('現在の記事が未設定のため関連記事読み込みをスキップ');
        return;
      }
      
      // 同じカテゴリの公開記事を取得
      const result = await this.articleService.getPublishedArticles({
        category: this.currentArticle.category,
        limit: 4
      });
      
      if (result.success && result.data) {
        // 現在の記事を除外
        const relatedArticles = result.data.filter(article => article.id !== this.articleId);
        
        if (relatedArticles.length > 0) {
          this.cache.relatedArticles = relatedArticles.slice(0, 3);
          this.renderRelatedArticles(this.cache.relatedArticles);
          this.debug(`関連記事表示完了: ${this.cache.relatedArticles.length}件`);
        } else {
          this.debug('関連記事が見つかりませんでした');
        }
      }
      
    } catch (error) {
      this.error('関連記事読み込みエラー:', error);
      // 関連記事の読み込みエラーは致命的ではないため、続行
    }
  }

  /**
   * 関連記事の表示
   */
  renderRelatedArticles(articles) {
    if (!this.elements.relatedArticles || !articles.length) {
      this.debug('関連記事表示をスキップ（要素なしまたは記事なし）');
      return;
    }
    
    try {
      const relatedHtml = articles.map(article => {
        const categoryInfo = this.getCategoryInfo(article.category);
        const formattedDate = this.formatDate(article.published_at || article.created_at);
        
        return `
          <article class="related-article" data-article-id="${article.id}">
            <div class="related-article-meta">
              <div class="related-article-date">${formattedDate}</div>
              <div class="news-category ${article.category}">${categoryInfo.label}</div>
            </div>
            <h4 class="related-article-title">
              <a href="news-detail.html?id=${article.id}">${this.escapeHtml(article.title)}</a>
            </h4>
            <p class="related-article-excerpt">${this.escapeHtml(article.summary || this.createExcerpt(article.content))}</p>
          </article>
        `;
      }).join('');
      
      this.elements.relatedArticles.innerHTML = relatedHtml;
      
      // 関連記事セクションを表示
      const relatedSection = document.querySelector('#related-articles, .related-articles-section');
      if (relatedSection) {
        relatedSection.classList.remove('hidden');
        relatedSection.style.display = 'block';
      }
      
    } catch (error) {
      this.error('関連記事表示エラー:', error);
    }
  }

  /**
   * カテゴリ情報取得（schema.sql準拠）
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
    // 基本的なHTMLタグのみ許可、スクリプトタグは除去
    return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  /**
   * メタタグ更新
   */
  updateMetaTags() {
    if (!this.currentArticle) return;
    
    // description
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      const description = this.currentArticle.summary || this.createExcerpt(this.currentArticle.content, 160);
      descMeta.setAttribute('content', description);
    }
    
    // keywords
    const keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (keywordsMeta) {
      const categoryLabel = this.getCategoryInfo(this.currentArticle.category).label;
      const keywords = `RBS,陸上教室,${categoryLabel},${this.currentArticle.title}`;
      keywordsMeta.setAttribute('content', keywords);
    }
    
    // OGタグ
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', this.currentArticle.title);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      const description = this.currentArticle.summary || this.createExcerpt(this.currentArticle.content, 160);
      ogDescription.setAttribute('content', description);
    }
  }

  /**
   * ローディング表示
   */
  showLoading() {
    const loadingElement = document.querySelector('#article-loading, .article-loading');
    if (loadingElement) {
      loadingElement.style.display = 'block';
    }
    
    // コンテナに読み込み中クラスを追加
    if (this.elements.container) {
      this.elements.container.classList.add('loading');
    }
  }

  /**
   * ローディング非表示
   */
  hideLoading() {
    const loadingElement = document.querySelector('#article-loading, .article-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    // コンテナから読み込み中クラスを削除
    if (this.elements.container) {
      this.elements.container.classList.remove('loading');
    }
  }

  /**
   * エラーハンドリング
   */
  handleError(error) {
    this.error('エラーが発生しました:', error);
    
    // エラーページ表示
    this.showErrorPage(error.message);
    
    // エラーイベント発行
    EventBus.emit('newsDetail:error', {
      articleId: this.articleId,
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * エラーページ表示
   */
  showErrorPage(message) {
    const container = this.elements.container || document.querySelector('main');
    if (!container) return;
    
    const errorHtml = `
      <div class="article-error">
        <h1>記事の読み込みに失敗しました</h1>
        <p class="error-message">${this.escapeHtml(message)}</p>
        <div class="error-actions">
          <button onclick="window.location.reload()" class="btn btn-primary">再読み込み</button>
          <a href="news.html" class="btn btn-secondary">ニュース一覧に戻る</a>
        </div>
      </div>
    `;
    
    container.innerHTML = errorHtml;
  }

  /**
   * 記事削除時の処理
   */
  handleArticleDeleted() {
    this.debug('記事が削除されました');
    
    const container = this.elements.container || document.querySelector('main');
    if (!container) return;
    
    const deletedHtml = `
      <div class="article-deleted">
        <h1>記事が削除されました</h1>
        <p>この記事は削除されたため、表示できません。</p>
        <a href="news.html" class="btn btn-primary">ニュース一覧に戻る</a>
      </div>
    `;
    
    container.innerHTML = deletedHtml;
    
    // ページタイトル更新
    document.title = '記事が削除されました - RBS陸上教室';
  }

  /**
   * リフレッシュ
   */
  async refresh() {
    try {
      this.debug('リフレッシュ開始');
      
      // キャッシュクリア
      this.cache = {
        article: null,
        relatedArticles: [],
        lastUpdated: null
      };
      
      // 記事再読み込み
      await this.loadArticle();
      
      this.debug('リフレッシュ完了');
      
    } catch (error) {
      this.error('リフレッシュエラー:', error);
      this.handleError(error);
    }
  }

  /**
   * パフォーマンス情報取得
   */
  getPerformanceInfo() {
    return {
      loadTime: this.performanceMetrics.loadTime,
      renderTime: this.performanceMetrics.renderTime,
      cacheStatus: {
        hasArticle: !!this.cache.article,
        relatedCount: this.cache.relatedArticles.length,
        lastUpdated: this.cache.lastUpdated
      },
      initialized: this.initialized,
      articleId: this.articleId
    };
  }

  /**
   * 破棄
   */
  destroy() {
    try {
      // イベントリスナー削除
      EventBus.off('article:saved');
      EventBus.off('article:deleted');
      EventBus.off('article:published');
      
      // データクリア
      this.currentArticle = null;
      this.articleId = null;
      this.cache = { article: null, relatedArticles: [], lastUpdated: null };
      
      // DOM参照クリア
      this.elements = {};
      
      this.initialized = false;
      
      this.debug('NewsDetailController破棄完了');
      
    } catch (error) {
      this.error('破棄処理エラー:', error);
    }
  }

  /**
   * デバッグログ
   */
  debug(message, ...args) {
    if (CONFIG.debug.enabled && CONFIG.debug.components.newsDetail) {
      console.log(`[${this.componentName}]`, message, ...args);
    }
  }

  /**
   * エラーログ
   */
  error(message, ...args) {
    console.error(`[${this.componentName}]`, message, ...args);
  }
}

/**
 * NewsDetailControllerシングルトンインスタンス取得
 */
let newsDetailControllerInstance = null;

export function getNewsDetailController() {
  if (!newsDetailControllerInstance) {
    newsDetailControllerInstance = new NewsDetailController();
  }
  return newsDetailControllerInstance;
}

// デフォルトエクスポート
export default NewsDetailController; 