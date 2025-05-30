/**
 * 関連記事表示コンポーネント
 * @version 1.0.0
 */

import { Component } from '../../../shared/base/Component.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { setVisible, setHTML } from '../../../shared/utils/domUtils.js';
import { createCard } from '../../../shared/utils/htmlUtils.js';
import { NEWS_CONFIG } from '../../../shared/constants/newsConstants.js';

export class RelatedArticles extends Component {
  /**
   * @param {Element|string} container - 要素またはセレクタ
   */
  constructor(container) {
    super({ autoInit: false });
    
    this.componentName = 'RelatedArticles';
    this.container = container;
    this.element = container;
  }

  /**
   * デフォルトオプション
   * @returns {Object}
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      currentArticle: null,
      limit: NEWS_CONFIG.RELATED_ARTICLES_LIMIT,
      autoShow: true
    };
  }

  /**
   * 初期化処理
   */
  async afterInit() {
    if (!this.options.currentArticle) {
      throw new Error('現在の記事データが指定されていません');
    }

    await this.loadRelatedArticles();
    
    if (this.options.autoShow) {
      this.show();
    }
  }

  /**
   * 関連記事を読み込み
   */
  async loadRelatedArticles() {
    try {
      const relatedArticles = this.findRelatedArticles(this.options.currentArticle);
      
      if (relatedArticles.length > 0) {
        this.displayRelatedArticles(relatedArticles);
        console.log(`✅ 関連記事 ${relatedArticles.length}件を表示`);
      } else {
        this.hide();
        console.log('📝 関連記事はありません');
      }
      
    } catch (error) {
      console.error('❌ 関連記事の読み込みに失敗:', error);
      this.hide();
    }
  }

  /**
   * 関連記事を検索
   * @param {Object} currentArticle - 現在の記事
   * @returns {Array} 関連記事リスト
   */
  findRelatedArticles(currentArticle) {
    if (!window.articleService) {
      console.warn('ArticleServiceが利用できません');
      return [];
    }

    const allArticles = window.articleService.getPublishedArticles();
    const related = [];

    for (const article of allArticles) {
      // 現在の記事は除外
      if (article.id === currentArticle.id) continue;
      
      let score = 0;

      // 同じカテゴリーの記事は優先度高
      if (article.category === currentArticle.category) {
        score += 10;
      }

      // タイトルに共通キーワードがある場合
      const currentKeywords = this.extractKeywords(currentArticle.title);
      const articleKeywords = this.extractKeywords(article.title);
      const commonKeywords = currentKeywords.filter(k => articleKeywords.includes(k));
      score += commonKeywords.length * 5;

      // 日付が近い記事を優先
      const dateDiff = Math.abs(new Date(article.date) - new Date(currentArticle.date));
      const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
      if (daysDiff <= 30) score += 3;
      if (daysDiff <= 7) score += 2;

      if (score > 0) {
        related.push({ ...article, score });
      }
    }

    // スコア順でソートして上位を取得
    return related
      .sort((a, b) => b.score - a.score)
      .slice(0, this.options.limit);
  }

  /**
   * タイトルからキーワードを抽出
   * @param {string} title - タイトル
   * @returns {Array} キーワードリスト
   */
  extractKeywords(title) {
    // 簡単なキーワード抽出（実際のプロジェクトではより高度な処理が必要）
    return title
      .replace(/[「」『』【】（）()]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2)
      .map(word => word.toLowerCase());
  }

  /**
   * 関連記事を表示
   * @param {Array} articles - 関連記事リスト
   */
  displayRelatedArticles(articles) {
    const container = this.find('#related-articles-container') || this.element;
    
    const articlesHtml = articles.map(article => {
      return this.createArticleCard(article);
    }).join('');

    setHTML(container, articlesHtml);
  }

  /**
   * 記事カードHTMLを作成
   * @param {Object} article - 記事データ
   * @returns {string}
   */
  createArticleCard(article) {
    const excerpt = this.createExcerpt(article);
    const categoryClass = `category-${article.category}`;
    
    return `
      <div class="related-article-card">
        <a href="news-detail.html?id=${article.id}" class="article-link">
          <div class="article-meta">
            <span class="article-date">${article.formattedDate || article.date}</span>
            <span class="article-category ${categoryClass}">${article.categoryName || article.category}</span>
          </div>
          <h4 class="article-title">${article.title}</h4>
          ${excerpt ? `<p class="article-excerpt">${excerpt}</p>` : ''}
        </a>
      </div>
    `;
  }

  /**
   * 記事の抜粋を作成
   * @param {Object} article - 記事データ
   * @returns {string}
   */
  createExcerpt(article) {
    const content = article.excerpt || article.summary || article.content || '';
    if (!content) return '';
    
    // HTMLタグを除去
    const textContent = content.replace(/<[^>]*>/g, '');
    
    // 指定文字数で切り詰め
    const maxLength = NEWS_CONFIG.EXCERPT_LENGTH || 80;
    if (textContent.length <= maxLength) {
      return textContent;
    }
    
    return textContent.substring(0, maxLength).trim() + '...';
  }

  /**
   * 表示
   */
  show() {
    setVisible(this.element, true);
    super.show();
  }

  /**
   * 現在の記事を更新
   * @param {Object} article - 新しい記事データ
   */
  async updateCurrentArticle(article) {
    this.options.currentArticle = article;
    await this.loadRelatedArticles();
    this.emit('articleUpdated', { article });
  }

  /**
   * リフレッシュ
   */
  async refresh() {
    if (this.options.currentArticle) {
      await this.loadRelatedArticles();
    }
    super.refresh();
  }

  /**
   * 現在の記事を取得
   * @returns {Object|null}
   */
  getCurrentArticle() {
    return this.options.currentArticle;
  }

  /**
   * ログ出力
   * @param {...any} args - ログ引数
   */
  log(...args) {
    console.log(`[${this.componentName}]`, ...args);
  }
  
  /**
   * エラーログ出力
   * @param {...any} args - エラーログ引数
   */
  error(...args) {
    console.error(`[${this.componentName}]`, ...args);
  }
  
  /**
   * デバッグログ出力
   * @param {...any} args - デバッグログ引数
   */
  debug(...args) {
    console.log(`[${this.componentName}:DEBUG]`, ...args);
  }
  
  /**
   * 警告ログ出力
   * @param {...any} args - 警告ログ引数
   */
  warn(...args) {
    console.warn(`[${this.componentName}]`, ...args);
  }
}

// デフォルトエクスポート
export default RelatedArticles; 