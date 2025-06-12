/**
 * 統合ニュースサービス
 * 全ページ共通のニュース管理機能を提供
 * @version 4.0.0 - 洗練されたアーキテクチャ版
 */

import { CONFIG } from '../../../shared/constants/config.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { getArticleStorageService } from '../../../shared/services/ArticleStorageService.js';

export class UnifiedNewsService {
  constructor() {
    this.initialized = false;
    this.storageService = null;
    this.articles = [];
    this.pageType = this.detectPageType();
    
    // 各ページ用の表示設定
    this.displayConfig = {
      home: { limit: 5, showSummary: true },
      'news-list': { limit: 0, pagination: true },
      'news-detail': { showRelated: true, relatedLimit: 3 },
      admin: { showAll: true, editMode: true }
    };
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('🚀 統合ニュースサービス初期化開始');
      
      // ストレージサービス初期化
      this.storageService = getArticleStorageService();
      if (!this.storageService.initialized) {
        await this.storageService.init();
      }
      
      // データ同期
      await this.syncArticles();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('✅ 統合ニュースサービス初期化完了');
      
    } catch (error) {
      console.error('❌ 統合ニュースサービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * ページタイプを検出
   */
  detectPageType() {
    const path = window.location.pathname;
    if (path.includes('admin')) return 'admin';
    if (path.includes('news-detail')) return 'news-detail';
    if (path.includes('news.html')) return 'news-list';
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) return 'home';
    return 'unknown';
  }

  /**
   * 記事データを同期
   */
  async syncArticles() {
    this.articles = this.storageService.getPublishedArticles({
      sortBy: 'date',
      order: 'desc'
    });
    console.log(`📰 記事同期完了: ${this.articles.length}件`);
    
    // データ更新イベントを発火
    EventBus.emit('unifiedNews:dataUpdated', {
      articles: this.articles,
      pageType: this.pageType
    });
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    EventBus.on('articleStorage:articleSaved', () => this.syncArticles());
    EventBus.on('articleStorage:articleDeleted', () => this.syncArticles());
    EventBus.on('articleStorage:refreshed', () => this.syncArticles());
  }

  /**
   * 全記事を取得
   * @param {Object} options - フィルタリングオプション
   */
  getArticles(options = {}) {
    const { category, limit, featured } = options;
    
    let articles = [...this.articles];
    
    // カテゴリーフィルター
    if (category && category !== 'all') {
      articles = articles.filter(article => article.category === category);
    }
    
    // 注目記事フィルター
    if (featured) {
      articles = articles.filter(article => article.featured);
    }
    
    // 件数制限
    if (limit && limit > 0) {
      articles = articles.slice(0, limit);
    }
    
    return articles;
  }

  /**
   * 記事詳細を取得
   * @param {string} articleId - 記事ID
   */
  getArticleById(articleId) {
    return this.storageService.getArticleById(articleId);
  }

  /**
   * 記事本文を取得
   * @param {string} articleId - 記事ID
   */
  getArticleContent(articleId) {
    return this.storageService.getArticleContent(articleId);
  }

  /**
   * 関連記事を取得
   * @param {string} currentArticleId - 現在の記事ID
   * @param {number} limit - 取得件数
   */
  getRelatedArticles(currentArticleId, limit = 3) {
    const currentArticle = this.getArticleById(currentArticleId);
    if (!currentArticle) return [];

    // 同カテゴリーの記事を優先
    const sameCategory = this.articles.filter(article => 
      article.id !== currentArticleId && 
      article.category === currentArticle.category
    );
    
    const otherArticles = this.articles.filter(article => 
      article.id !== currentArticleId && 
      article.category !== currentArticle.category
    );
    
    return [...sameCategory, ...otherArticles].slice(0, limit);
  }

  /**
   * カテゴリー別統計を取得
   */
  getCategoryStats() {
    const stats = {
      total: this.articles.length,
      featured: this.articles.filter(a => a.featured).length,
      byCategory: {}
    };
    
    Object.keys(CONFIG.articles.categories).forEach(category => {
      stats.byCategory[category] = this.articles.filter(a => a.category === category).length;
    });
    
    return stats;
  }

  /**
   * データをリフレッシュ
   */
  async refresh() {
    await this.syncArticles();
  }

  /**
   * サービス破棄
   */
  destroy() {
    // イベントリスナー解除
    EventBus.off('articleStorage:articleSaved');
    EventBus.off('articleStorage:articleDeleted'); 
    EventBus.off('articleStorage:refreshed');
    
    this.articles = [];
    this.initialized = false;
    console.log('🧹 統合ニュースサービス破棄完了');
  }
}

// シングルトンインスタンス
let unifiedNewsServiceInstance = null;

/**
 * 統合ニュースサービスのシングルトンインスタンスを取得
 */
export function getUnifiedNewsService() {
  if (!unifiedNewsServiceInstance) {
    unifiedNewsServiceInstance = new UnifiedNewsService();
  }
  return unifiedNewsServiceInstance;
}

export default UnifiedNewsService; 