/**
 * 記事表示コンポーネント
 * @version 1.0.0
 */

import BaseComponent from '../../../shared/base/BaseComponent.js';
import { setText, setHTML, querySelector } from '../../../shared/utils/domUtils.js';
import { CATEGORY_COLORS } from '../../../shared/constants/newsConstants.js';
import MetadataService from '../services/MetadataService.js';

export default class ArticleDisplay extends BaseComponent {
  /**
   * @param {Element|string} element - 要素またはセレクタ
   * @param {Object} options - オプション
   */
  constructor(element, options = {}) {
    super(element, 'ArticleDisplay');
    this.options = options;
    this.metadataService = new MetadataService();
  }

  /**
   * デフォルトオプション
   * @returns {Object}
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      article: null
    };
  }

  /**
   * 初期化処理
   */
  async afterInit() {
    if (!this.options.article) {
      throw new Error('記事データが指定されていません');
    }

    await this.displayArticle(this.options.article);
  }

  /**
   * 記事を表示
   * @param {Object} article - 記事データ
   */
  async displayArticle(article) {
    try {
      console.log('📰 記事表示開始:', article.title);
      
      // 記事ヘッダーを更新
      this.updateArticleHeader(article);
      
      // 記事本文を表示
      await this.displayArticleContent(article);
      
      // メタデータを更新
      this.metadataService.updateMetadata(article);
      
      console.log('✅ 記事表示完了');
      
    } catch (error) {
      console.error('❌ 記事表示エラー:', error);
      throw error;
    }
  }

  /**
   * 記事ヘッダーを更新
   * @param {Object} article - 記事データ
   */
  updateArticleHeader(article) {
    const articleDate = querySelector('#article-date');
    const articleTitle = querySelector('#article-title');
    const categoryElement = querySelector('#article-category');
    
    if (articleDate) {
      setText(articleDate, article.formattedDate || article.date);
    }
    
    if (articleTitle) {
      setText(articleTitle, article.title);
    }
    
    if (categoryElement) {
      setText(categoryElement, article.categoryName || article.category);
      categoryElement.className = `article-category ${article.category}`;
      
      // カテゴリー色を設定
      const categoryColor = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.announcement;
      categoryElement.style.backgroundColor = categoryColor;
    }
  }

  /**
   * 記事本文を表示
   * @param {Object} article - 記事データ
   */
  async displayArticleContent(article) {
    try {
      // ArticleService v2.0のgetArticleContentメソッドを使用
      const htmlContent = await window.articleService.getArticleContent(article.id);
      
      if (!htmlContent || htmlContent.trim() === '') {
        throw new Error('記事コンテンツが空です');
      }
      
      setHTML(this.element, htmlContent);
      console.log('✅ 記事コンテンツを表示しました');
      
    } catch (contentError) {
      console.error('❌ 記事コンテンツの取得に失敗:', contentError);
      throw contentError;
    }
  }

  /**
   * 記事データを更新
   * @param {Object} article - 新しい記事データ
   */
  async updateArticle(article) {
    this.options.article = article;
    await this.displayArticle(article);
    this.emit('articleUpdated', { article });
  }

  /**
   * リフレッシュ
   */
  async refresh() {
    if (this.options.article) {
      await this.displayArticle(this.options.article);
    }
    super.refresh();
  }

  /**
   * 現在の記事を取得
   * @returns {Object|null}
   */
  getCurrentArticle() {
    return this.options.article;
  }
} 