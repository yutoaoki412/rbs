/**
 * LP側統一ニュースサービス
 * @version 2.0.0 - Supabase完全統合版
 */

import { CONFIG } from '../../../shared/constants/config.js';
import { getArticleSupabaseService } from '../../../shared/services/ArticleSupabaseService.js';

export class LPNewsService {
  constructor() {
    this.serviceName = 'LPNewsService';
    this.initialized = false;
    this.articleService = null;
    this.articles = [];
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[LPNewsService] 初期化開始');
      
      // Supabaseサービス初期化
      this.articleService = getArticleSupabaseService();
      await this.articleService.init();
      
      // 記事データを読み込み
      await this.loadArticles();
      
      this.initialized = true;
      console.log('[LPNewsService] 初期化完了');
      
    } catch (error) {
      console.error('[LPNewsService] 初期化エラー:', error);
      this.initialized = true; // エラーでもアプリ停止を防ぐ
    }
  }

  /**
   * 記事データを読み込み（Supabaseから）
   */
  async loadArticles() {
    try {
      console.log('[LPNewsService] Supabaseから記事データを読み込み中...');
      
      const result = await this.articleService.getAllArticles();
      this.articles = result || [];
      
      console.log(`[LPNewsService] 記事データを読み込み: ${this.articles.length}件`);
      
    } catch (error) {
      console.error('[LPNewsService] 記事データ読み込みエラー:', error);
      this.articles = [];
    }
  }

  /**
   * 公開済み記事を取得
   * @param {Object} options - オプション
   * @returns {Array} 公開済み記事配列
   */
  getPublishedArticles(options = {}) {
    const { category, limit, featured } = options;
    
    let articles = this.articles.filter(article => article.status === 'published');
    
    // カテゴリーフィルター
    if (category && category !== 'all') {
      articles = articles.filter(article => article.category === category);
    }
    
    // 注目記事フィルター
    if (featured) {
      articles = articles.filter(article => article.featured);
    }
    
    // 日付順にソート（新しい順）
    articles.sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at);
      const dateB = new Date(b.published_at || b.created_at);
      return dateB - dateA;
    });
    
    // 件数制限
    if (limit && limit > 0) {
      articles = articles.slice(0, limit);
    }
    
    return articles;
  }

  /**
   * 記事詳細を取得
   * @param {string} articleId - 記事ID
   * @returns {Object|null} 記事データ
   */
  async getArticleById(articleId) {
    try {
      const article = await this.articleService.getArticleById(articleId);
      return (article && article.status === 'published') ? article : null;
    } catch (error) {
      console.error('[LPNewsService] 記事取得エラー:', error);
      return null;
    }
  }

  /**
   * 関連記事を取得
   * @param {string} currentArticleId - 現在の記事ID
   * @param {number} limit - 取得件数
   * @returns {Array} 関連記事配列
   */
  async getRelatedArticles(currentArticleId, limit = 3) {
    const currentArticle = await this.getArticleById(currentArticleId);
    if (!currentArticle) return [];

    // 同カテゴリーの記事を優先
    const sameCategory = this.getPublishedArticles({ category: currentArticle.category })
      .filter(article => article.id !== currentArticleId);
    
    const otherArticles = this.getPublishedArticles()
      .filter(article => 
        article.id !== currentArticleId && 
        article.category !== currentArticle.category
      );
    
    return [...sameCategory, ...otherArticles].slice(0, limit);
  }

  /**
   * カテゴリー情報を取得
   * @param {string} categoryId - カテゴリーID
   * @returns {Object} カテゴリー情報
   */
  getCategoryInfo(categoryId) {
    return CONFIG.helpers.getCategoryInfo(categoryId);
  }

  /**
   * HTML記事カードを生成
   * @param {Object} article - 記事データ
   * @param {Object} options - 表示オプション
   * @returns {string} HTML文字列
   */
  generateArticleCard(article, options = {}) {
    const { showSummary = true, showCategory = true, isHomeVersion = false } = options;
    const categoryInfo = this.getCategoryInfo(article.category);
    const formattedDate = CONFIG.helpers.formatDate(article.published_at || article.created_at);
    
    return `
      <article class="news-card ${isHomeVersion ? 'home-news-card' : ''}" data-article-id="${article.id}">
        <div class="news-card-header">
          <div class="news-meta">
            <div class="news-date">${formattedDate}</div>
            ${showCategory ? `<div class="news-category ${article.category}" style="background-color: ${categoryInfo.color}">${categoryInfo.name}</div>` : ''}
            ${article.featured ? '<span class="news-featured">注目</span>' : ''}
          </div>
          <h3 class="news-title">
            <a href="news-detail.html?id=${article.id}" class="news-link">${article.title}</a>
          </h3>
        </div>
        <div class="news-card-body">
          ${showSummary && article.excerpt ? `<p class="news-excerpt">${article.excerpt}</p>` : ''}
          <div class="news-actions">
            <a href="news-detail.html?id=${article.id}" class="news-read-more">続きを読む</a>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * ニュース一覧を生成（index.html、news.html共通）
   * @param {Object} options - フィルターオプション
   * @returns {string} HTML文字列
   */
  generateNewsPageList(options = {}) {
    const articles = this.getPublishedArticles(options);
    
    if (articles.length === 0) {
      const category = options.category;
      const categoryName = category && category !== 'all' ? this.getCategoryInfo(category).name : '';
      const message = category && category !== 'all' 
        ? `「${categoryName}」カテゴリーの記事がありません` 
        : '記事がまだありません';
      
      return `<div class="news-empty">${message}</div>`;
    }
    
    return articles.map(article => 
      this.generateArticleCard(article, { 
        showSummary: true, 
        showCategory: true, 
        isHomeVersion: options.isHomeVersion || false 
      })
    ).join('');
  }

  /**
   * ニュース詳細ページ用HTMLを生成
   * @param {string} articleId - 記事ID
   * @returns {Promise<string>} HTML文字列
   */
  async generateNewsDetail(articleId) {
    const article = await this.getArticleById(articleId);
    
    if (!article) {
      return `
        <div class="news-detail-error">
          <h2>記事が見つかりません</h2>
          <p>指定された記事は存在しないか、現在公開されていません。</p>
          <a href="news.html" class="btn btn-primary">ニュース一覧に戻る</a>
        </div>
      `;
    }

    const categoryInfo = this.getCategoryInfo(article.category);
    const formattedDate = CONFIG.helpers.formatDateTime(article.published_at || article.created_at);
    const relatedArticles = await this.getRelatedArticles(articleId, 3);

    return `
      <article class="news-detail">
        <header class="news-detail-header">
          <div class="news-detail-meta">
            <div class="news-detail-date">${formattedDate}</div>
            <div class="news-detail-category ${article.category}" style="background-color: ${categoryInfo.color}">
              ${categoryInfo.name}
            </div>
            ${article.featured ? '<span class="news-detail-featured">注目記事</span>' : ''}
          </div>
          <h1 class="news-detail-title">${CONFIG.helpers.escapeHtml(article.title)}</h1>
          ${article.excerpt ? `<div class="news-detail-excerpt">${CONFIG.helpers.escapeHtml(article.excerpt)}</div>` : ''}
        </header>
        
        <div class="news-detail-content">
          ${this.markdownToHtml(article.content)}
        </div>
        
        <footer class="news-detail-footer">
          <div class="news-detail-actions">
            <a href="news.html" class="btn btn-outline">ニュース一覧に戻る</a>
            <button onclick="window.print()" class="btn btn-outline">印刷</button>
            <button onclick="navigator.share && navigator.share({title: '${CONFIG.helpers.escapeHtml(article.title)}', url: location.href})" class="btn btn-outline">共有</button>
          </div>
        </footer>
        
        ${relatedArticles.length > 0 ? `
          <section class="related-articles">
            <h3>関連記事</h3>
            <div class="related-articles-grid">
              ${relatedArticles.map(related => this.generateArticleCard(related, { showSummary: false })).join('')}
            </div>
          </section>
        ` : ''}
      </article>
    `;
  }

  /**
   * Markdownを簡易HTMLに変換
   * @param {string} markdown - Markdown文字列
   * @returns {string} HTML文字列
   */
  markdownToHtml(markdown) {
    if (!markdown) return '';
    
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }

  /**
   * データを再読み込み
   */
  async refresh() {
    console.log('[LPNewsService] データ再読み込み');
    await this.loadArticles();
  }

  /**
   * サービス破棄
   */
  destroy() {
    console.log('[LPNewsService] サービス破棄');
    this.initialized = false;
    this.articles = [];
    this.articleService = null;
  }
}

// シングルトンインスタンス
let lpNewsServiceInstance = null;

/**
 * LPNewsServiceのシングルトンインスタンスを取得
 * @returns {LPNewsService}
 */
export function getLPNewsService() {
  if (!lpNewsServiceInstance) {
    lpNewsServiceInstance = new LPNewsService();
  }
  return lpNewsServiceInstance;
} 