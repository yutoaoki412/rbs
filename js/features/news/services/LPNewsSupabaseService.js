/**
 * LP側ニュースサービス (Supabase対応版)
 * ArticleSupabaseServiceを使用してLP側のニュース表示を管理
 * @version 2.0.0 - Supabase統合版
 */

import { getArticleSupabaseService } from '../../../shared/services/ArticleSupabaseService.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class LPNewsSupabaseService {
  constructor() {
    this.serviceName = 'LPNewsSupabaseService';
    this.initialized = false;
    this.articleService = null;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[LPNewsSupabaseService] 初期化開始');
      
      // ArticleSupabaseServiceを取得
      this.articleService = getArticleSupabaseService();
      await this.articleService.init();
      
      this.initialized = true;
      console.log('[LPNewsSupabaseService] Supabase対応で初期化完了');
      
    } catch (error) {
      console.error('[LPNewsSupabaseService] 初期化エラー:', error);
      this.initialized = true; // エラーでもアプリ停止を防ぐ
    }
  }

  /**
   * 公開済み記事を取得
   * @param {Object} options - オプション
   * @returns {Promise<Array>} 公開済み記事配列
   */
  async getPublishedArticles(options = {}) {
    try {
      await this.init();
      
      if (!this.articleService) {
        console.warn('[LPNewsSupabaseService] ArticleService not available');
        return [];
      }

      const articles = await this.articleService.getPublishedArticles(options);
      
      console.log(`[LPNewsSupabaseService] 公開記事を取得: ${articles.length}件`);
      return articles;

    } catch (error) {
      console.error('[LPNewsSupabaseService] 記事取得エラー:', error);
      return [];
    }
  }

  /**
   * 記事詳細を取得
   * @param {string} articleId - 記事ID
   * @returns {Promise<Object|null>} 記事データ
   */
  async getArticleById(articleId) {
    try {
      await this.init();
      
      if (!this.articleService) {
        console.warn('[LPNewsSupabaseService] ArticleService not available');
        return null;
      }

      const article = await this.articleService.getArticleById(articleId);
      
      if (article) {
        console.log(`[LPNewsSupabaseService] 記事詳細を取得: ${articleId}`);
      }
      
      return article;

    } catch (error) {
      console.error('[LPNewsSupabaseService] 記事詳細取得エラー:', error);
      return null;
    }
  }

  /**
   * 関連記事を取得
   * @param {string} currentArticleId - 現在の記事ID
   * @param {number} limit - 取得件数
   * @returns {Promise<Array>} 関連記事配列
   */
  async getRelatedArticles(currentArticleId, limit = 3) {
    try {
      await this.init();
      
      if (!this.articleService) {
        console.warn('[LPNewsSupabaseService] ArticleService not available');
        return [];
      }

      const articles = await this.articleService.getRelatedArticles(currentArticleId, limit);
      
      console.log(`[LPNewsSupabaseService] 関連記事を取得: ${articles.length}件`);
      return articles;

    } catch (error) {
      console.error('[LPNewsSupabaseService] 関連記事取得エラー:', error);
      return [];
    }
  }

  /**
   * カテゴリー情報を取得
   * @param {string} categoryId - カテゴリーID
   * @returns {Object} カテゴリー情報
   */
  getCategoryInfo(categoryId) {
    if (this.articleService) {
      return this.articleService.getCategoryInfo(categoryId);
    }
    
    // フォールバック
    const categories = {
      'general': { name: '一般', color: '#3498db' },
      'event': { name: 'イベント', color: '#e74c3c' },
      'notice': { name: 'お知らせ', color: '#f39c12' },
      'lesson': { name: 'レッスン', color: '#27ae60' },
      'other': { name: 'その他', color: '#95a5a6' }
    };
    
    return categories[categoryId] || categories.general;
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
    const formattedDate = this.formatDate(article.published_at || article.created_at);
    
    return `
      <article class="news-card ${isHomeVersion ? 'home-news-card' : ''}" data-article-id="${article.id}">
        <div class="news-card-header">
          <div class="news-meta">
            <div class="news-date">${formattedDate}</div>
            ${showCategory ? `<div class="news-category ${article.category}" style="background-color: ${categoryInfo.color}">${categoryInfo.name}</div>` : ''}
            ${article.featured ? '<span class="news-featured">注目</span>' : ''}
          </div>
          <h3 class="news-title">
            <a href="news-detail.html?id=${article.id}" class="news-link">${this.escapeHtml(article.title)}</a>
          </h3>
        </div>
        <div class="news-card-body">
          ${showSummary && article.summary ? `<p class="news-excerpt">${this.escapeHtml(article.summary)}</p>` : ''}
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
   * @returns {Promise<string>} HTML文字列
   */
  async generateNewsPageList(options = {}) {
    try {
      const articles = await this.getPublishedArticles(options);
      
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

    } catch (error) {
      console.error('[LPNewsSupabaseService] ニュース一覧生成エラー:', error);
      return '<div class="news-empty">記事の読み込みに失敗しました</div>';
    }
  }

  /**
   * ニュース詳細ページ用HTMLを生成
   * @param {string} articleId - 記事ID
   * @returns {Promise<string>} HTML文字列
   */
  async generateNewsDetail(articleId) {
    try {
      const article = await this.getArticleById(articleId);
      
      if (!article) {
        return `
          <div class="news-detail-error">
            <h2>記事が見つかりません</h2>
            <p>指定された記事は存在しないか、削除された可能性があります。</p>
            <a href="news.html" class="btn-primary">ニュース一覧に戻る</a>
          </div>
        `;
      }

      const categoryInfo = this.getCategoryInfo(article.category);
      const formattedDate = this.formatDate(article.published_at || article.created_at);
      
      // 関連記事を取得
      const relatedArticles = await this.getRelatedArticles(articleId, 3);
      const relatedArticlesHtml = relatedArticles.length > 0 
        ? relatedArticles.map(related => this.generateArticleCard(related, { showSummary: false })).join('')
        : '<p class="no-related">関連記事はありません</p>';

      return `
        <div class="news-detail">
          <header class="news-detail-header">
            <div class="news-meta">
              <div class="news-date">${formattedDate}</div>
              <div class="news-category ${article.category}" style="background-color: ${categoryInfo.color}">
                ${categoryInfo.name}
              </div>
              ${article.featured ? '<span class="news-featured">注目</span>' : ''}
            </div>
            <h1 class="news-detail-title">${this.escapeHtml(article.title)}</h1>
            ${article.summary ? `<p class="news-detail-summary">${this.escapeHtml(article.summary)}</p>` : ''}
          </header>
          
          <div class="news-detail-content">
            ${this.markdownToHtml(article.content || '')}
          </div>
          
          <footer class="news-detail-footer">
            <div class="news-detail-actions">
              <a href="news.html" class="btn-outline">ニュース一覧に戻る</a>
            </div>
          </footer>
          
          ${relatedArticles.length > 0 ? `
            <section class="related-articles">
              <h2>関連記事</h2>
              <div class="news-grid">
                ${relatedArticlesHtml}
              </div>
            </section>
          ` : ''}
        </div>
      `;

    } catch (error) {
      console.error('[LPNewsSupabaseService] ニュース詳細生成エラー:', error);
      return `
        <div class="news-detail-error">
          <h2>記事の読み込みに失敗しました</h2>
          <p>しばらくしてから再度お試しください。</p>
          <a href="news.html" class="btn-primary">ニュース一覧に戻る</a>
        </div>
      `;
    }
  }

  /**
   * 日付をフォーマット
   * @param {string} dateString - 日付文字列
   * @returns {string} フォーマットされた日付
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('[LPNewsSupabaseService] 日付フォーマットエラー:', error);
      return dateString || '';
    }
  }

  /**
   * HTMLエスケープ
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * MarkdownをHTMLに変換（簡易版）
   * @param {string} markdown - Markdownテキスト
   * @returns {string} HTML文字列
   */
  markdownToHtml(markdown) {
    if (!markdown) return '';
    
    try {
      let html = markdown
        // 改行をHTMLの改行に変換
        .replace(/\n/g, '<br>')
        // 簡易的なMarkdown変換
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // URLを自動リンク化
        .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>');
      
      return html;
    } catch (error) {
      console.error('[LPNewsSupabaseService] Markdown変換エラー:', error);
      return this.escapeHtml(markdown);
    }
  }

  /**
   * データ更新（キャッシュクリア）
   */
  async refresh() {
    if (this.articleService) {
      this.articleService.clearCache();
    }
    console.log('[LPNewsSupabaseService] データを更新しました');
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.initialized = false;
    this.articleService = null;
    console.log('[LPNewsSupabaseService] サービスを破棄しました');
  }
}

// シングルトンインスタンス
let lpNewsSupabaseServiceInstance = null;

/**
 * LPNewsSupabaseServiceのシングルトンインスタンスを取得
 * @returns {LPNewsSupabaseService}
 */
export function getLPNewsSupabaseService() {
  if (!lpNewsSupabaseServiceInstance) {
    lpNewsSupabaseServiceInstance = new LPNewsSupabaseService();
  }
  return lpNewsSupabaseServiceInstance;
}

// 後方互換性のための関数
export function getLPNewsService() {
  return getLPNewsSupabaseService();
} 