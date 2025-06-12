/**
 * 統合ニュースデータサービス
 * LP側（index.html、news.html、news-detail.html）と管理画面で共通のデータストレージを提供
 * ArticleStorageServiceと連携して統一されたニュース記事管理を実現
 * @version 3.0.0 - 統合記事管理システム対応
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { getArticleStorageService } from '../../../shared/services/ArticleStorageService.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class NewsDataService {
  constructor() {
    this.initialized = false;
    this.componentName = 'NewsDataService';
    
    /** @type {ArticleStorageService} 統合ストレージサービス */
    this.storageService = null;
    
    // キャッシュ
    this.articles = [];
    this.featuredArticles = [];
    this.recentArticles = [];
    
    // カテゴリー設定
    this.categories = CONFIG.articles.categories;
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      this.log('既に初期化済み');
      return;
    }

    try {
      this.log('統合ニュースデータサービス初期化開始');
      
      // 統合ストレージサービスの取得と初期化
      this.storageService = getArticleStorageService();
      
      if (!this.storageService.initialized) {
        await this.storageService.init();
      }
      
      // データ同期
      await this.syncData();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      this.initialized = true;
      this.log('統合ニュースデータサービス初期化完了');
      
    } catch (error) {
      this.error('初期化エラー:', error);
      throw error;
    }
  }

  /**
   * データ同期
   * @private
   */
  async syncData() {
    try {
      // 公開記事のみを取得
      this.articles = this.storageService.getPublishedArticles({
        sortBy: 'date',
        order: 'desc'
      });
      
      // 注目記事の抽出
      this.featuredArticles = this.articles.filter(article => article.featured);
      
      // 最新記事の抽出（最大10件）
      this.recentArticles = this.articles.slice(0, 10);
      
      this.debug(`データ同期完了: ${this.articles.length}件（注目: ${this.featuredArticles.length}件）`);
      
    } catch (error) {
      this.error('データ同期エラー:', error);
      this.articles = [];
      this.featuredArticles = [];
      this.recentArticles = [];
    }
  }

  /**
   * イベントリスナー設定
   * @private
   */
  setupEventListeners() {
    // 統合ストレージサービスのイベントリスニング
    EventBus.on('articleStorage:articleSaved', this.handleArticleSaved.bind(this));
    EventBus.on('articleStorage:articleDeleted', this.handleArticleDeleted.bind(this));
    EventBus.on('articleStorage:refreshed', this.handleStorageRefreshed.bind(this));
  }

  /**
   * 全公開記事を取得
   * @param {Object} options - オプション
   * @returns {Array} 記事配列
   */
  getAllArticles(options = {}) {
    const { category, limit, featured } = options;
    
    let filteredArticles = [...this.articles];
    
    // カテゴリーフィルター
    if (category && category !== 'all') {
      filteredArticles = filteredArticles.filter(article => article.category === category);
    }
    
    // 注目記事フィルター
    if (featured) {
      filteredArticles = filteredArticles.filter(article => article.featured);
    }
    
    // 件数制限
    if (limit && limit > 0) {
      filteredArticles = filteredArticles.slice(0, limit);
    }
    
    return filteredArticles;
  }

  /**
   * 記事詳細を取得
   * @param {string} articleId - 記事ID
   * @returns {Object|null} 記事データ
   */
  getArticleById(articleId) {
    if (!this.storageService) {
      this.warn('ストレージサービスが初期化されていません');
      return null;
    }
    
    return this.storageService.getArticleById(articleId);
  }

  /**
   * 記事の本文を取得
   * @param {string} articleId - 記事ID
   * @returns {string} 記事本文
   */
  getArticleContent(articleId) {
    if (!this.storageService) {
      this.warn('ストレージサービスが初期化されていません');
      return '';
    }
    
    return this.storageService.getArticleContent(articleId);
  }

  /**
   * カテゴリー別記事数を取得
   * @returns {Object} カテゴリー別記事数
   */
  getCategoryCount() {
    const counts = {
      all: this.articles.length
    };
    
    Object.keys(this.categories).forEach(categoryKey => {
      counts[categoryKey] = this.articles.filter(article => article.category === categoryKey).length;
    });
    
    return counts;
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
    
    // 同じカテゴリーの記事を優先して取得
    const sameCategory = this.articles.filter(article => 
      article.id !== currentArticleId && 
      article.category === currentArticle.category
    );
    
    // 同じカテゴリーが不足の場合は他のカテゴリーから補完
    const otherArticles = this.articles.filter(article => 
      article.id !== currentArticleId && 
      article.category !== currentArticle.category
    );
    
    const relatedArticles = [...sameCategory, ...otherArticles].slice(0, limit);
    
    return relatedArticles;
  }

  /**
   * 記事検索
   * @param {string} query - 検索クエリ
   * @param {Object} options - オプション
   * @returns {Array} 検索結果
   */
  searchArticles(query, options = {}) {
    if (!query.trim()) return this.getAllArticles(options);
    
    const searchTerm = query.toLowerCase();
    
    return this.articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm) ||
      (article.summary && article.summary.toLowerCase().includes(searchTerm)) ||
      (article.content && article.content.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * 最新記事を取得
   * @param {number} limit - 取得件数
   * @returns {Array} 最新記事配列
   */
  getRecentArticles(limit = 5) {
    return this.recentArticles.slice(0, limit);
  }

  /**
   * 注目記事を取得
   * @param {number} limit - 取得件数
   * @returns {Array} 注目記事配列
   */
  getFeaturedArticles(limit = 3) {
    return this.featuredArticles.slice(0, limit);
  }

  /**
   * カテゴリー情報を取得
   * @param {string} categoryKey - カテゴリーキー
   * @returns {Object} カテゴリー情報
   */
  getCategoryInfo(categoryKey) {
    return this.categories[categoryKey] || null;
  }

  /**
   * データをリフレッシュ
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      if (this.storageService) {
        await this.storageService.refresh();
        await this.syncData();
        
        EventBus.emit('news:dataRefreshed', {
          totalArticles: this.articles.length,
          featuredCount: this.featuredArticles.length
        });
      }
    } catch (error) {
      this.error('データリフレッシュエラー:', error);
    }
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    return {
      totalArticles: this.articles.length,
      featuredArticles: this.featuredArticles.length,
      recentArticles: this.recentArticles.length,
      categories: this.getCategoryCount(),
      lastSync: this.storageService?.lastSyncTime
    };
  }

  /**
   * 記事保存イベントハンドラー
   * @private
   */
  async handleArticleSaved(event) {
    this.debug('記事保存イベント受信:', event.detail);
    await this.syncData();
    
    EventBus.emit('news:articleUpdated', {
      articleId: event.detail.articleId,
      published: event.detail.published
    });
  }

  /**
   * 記事削除イベントハンドラー
   * @private
   */
  async handleArticleDeleted(event) {
    this.debug('記事削除イベント受信:', event.detail);
    await this.syncData();
    
    EventBus.emit('news:articleDeleted', {
      articleId: event.detail.articleId
    });
  }

  /**
   * ストレージリフレッシュイベントハンドラー
   * @private
   */
  async handleStorageRefreshed(event) {
    this.debug('ストレージリフレッシュイベント受信');
    await this.syncData();
    
    EventBus.emit('news:dataRefreshed', this.getStats());
  }

  /**
   * サービス破棄
   */
  async destroy() {
    if (!this.initialized) return;
    
    // イベントリスナー解除
    EventBus.off('articleStorage:articleSaved', this.handleArticleSaved);
    EventBus.off('articleStorage:articleDeleted', this.handleArticleDeleted);
    EventBus.off('articleStorage:refreshed', this.handleStorageRefreshed);
    
    // データクリア
    this.articles = [];
    this.featuredArticles = [];
    this.recentArticles = [];
    
    this.initialized = false;
    this.log('統合ニュースデータサービス破棄完了');
  }

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    if (CONFIG.debug.enabled) {
      console.log(`[${this.componentName}]`, ...args);
    }
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug.enabled && CONFIG.debug.verbose) {
      console.log(`[${this.componentName}:DEBUG]`, ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn(`[${this.componentName}:WARN]`, ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error(`[${this.componentName}:ERROR]`, ...args);
  }
}

// シングルトンインスタンス
let newsDataServiceInstance = null;

/**
 * NewsDataServiceのシングルトンインスタンスを取得
 * @returns {NewsDataService}
 */
export function getNewsDataService() {
  if (!newsDataServiceInstance) {
    newsDataServiceInstance = new NewsDataService();
  }
  return newsDataServiceInstance;
}

export default NewsDataService; 