/**
 * LP側統一ニュースサービス
 * 最適化されたconfig.jsのデータを使用してLP側のnews表示を統合
 * @version 1.0.0 - 最適化統合版
 */

import { CONFIG } from '../../../shared/constants/config.js';

export class LPNewsService {
  constructor() {
    this.serviceName = 'LPNewsService';
    this.initialized = false;
    this.storageKey = CONFIG.storage.keys.articles; // 'rbs_articles'
    this.articles = [];
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[LPNewsService] 初期化開始');
      
      // 記事データを読み込み
      this.loadArticles();
      
      this.initialized = true;
      console.log('[LPNewsService] 初期化完了');
      
    } catch (error) {
      console.error('[LPNewsService] 初期化エラー:', error);
      this.initialized = true; // エラーでもアプリ停止を防ぐ
    }
  }

  /**
   * 記事データを読み込み
   */
  loadArticles() {
    try {
      const data = localStorage.getItem(this.storageKey);
      this.articles = data ? JSON.parse(data) : [];
      
      console.log(`[LPNewsService] 記事データを読み込み: ${this.articles.length}件`);
      
      // データが空の場合は空配列のまま
      // テストデータの自動作成は削除
      
    } catch (error) {
      console.error('[LPNewsService] 記事データ読み込みエラー:', error);
      this.articles = [];
      // エラー時もテストデータは作成しない
    }
  }

  // テストデータ作成機能は削除されました
  // 記事は管理画面からのみ作成・管理されます

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
      const dateA = new Date(a.publishedAt || a.createdAt);
      const dateB = new Date(b.publishedAt || b.createdAt);
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
  getArticleById(articleId) {
    return this.articles.find(article => 
      article.id === articleId && article.status === 'published'
    ) || null;
  }

  /**
   * 関連記事を取得
   * @param {string} currentArticleId - 現在の記事ID
   * @param {number} limit - 取得件数
   * @returns {Array} 関連記事配列
   */
  getRelatedArticles(currentArticleId, limit = 3) {
    const currentArticle = this.getArticleById(currentArticleId);
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
    const formattedDate = CONFIG.helpers.formatDate(article.publishedAt || article.createdAt);
    
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
          ${showSummary && article.summary ? `<p class="news-excerpt">${article.summary}</p>` : ''}
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
   * @returns {Object} 記事データとHTML
   */
  generateNewsDetail(articleId) {
    const article = this.getArticleById(articleId);
    
    if (!article) {
      return {
        article: null,
        html: '<div class="article-not-found">記事が見つかりません</div>',
        relatedHtml: ''
      };
    }
    
    const categoryInfo = this.getCategoryInfo(article.category);
    const formattedDate = CONFIG.helpers.formatDate(article.publishedAt || article.createdAt);
    const content = this.markdownToHtml(article.content);
    
    const articleHtml = `
      <article class="article-detail">
        <header class="article-header">
          <div class="article-category" style="background-color: ${categoryInfo.color}">
            ${categoryInfo.name}
          </div>
          <h1 class="article-title">${article.title}</h1>
          <div class="article-meta">
            <time class="article-date">${formattedDate}</time>
            ${article.featured ? '<span class="article-featured">注目記事</span>' : ''}
          </div>
        </header>
        <div class="article-content">
          ${content}
        </div>
      </article>
    `;
    
    // 関連記事HTML生成
    const relatedArticles = this.getRelatedArticles(articleId, 3);
    const relatedHtml = relatedArticles.length > 0 
      ? `
        <section class="related-articles">
          <h3>関連記事</h3>
          <div class="related-articles-list">
            ${relatedArticles.map(article => 
              this.generateArticleCard(article, { 
                showSummary: false, 
                showCategory: true 
              })
            ).join('')}
          </div>
        </section>
      `
      : '';
    
    return {
      article,
      html: articleHtml,
      relatedHtml
    };
  }

  /**
   * マークダウンをHTMLに変換（シンプル版）
   * @param {string} markdown - マークダウンテキスト
   * @returns {string} HTML文字列
   */
  markdownToHtml(markdown) {
    return markdown
      .replace(/^### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^## (.*$)/gm, '<h3>$1</h3>')
      .replace(/^# (.*$)/gm, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hul])/gm, '<p>')
      .replace(/(?!>)$/gm, '</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<[hul])/g, '$1')
      .replace(/(<\/[hul]>)<\/p>/g, '$1');
  }

  /**
   * データ更新
   */
  refresh() {
    this.loadArticles();
    console.log('[LPNewsService] データを更新しました');
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.articles = [];
    this.initialized = false;
    console.log('[LPNewsService] サービスを破棄しました');
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