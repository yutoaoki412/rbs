/**
 * 記事データサービス - 管理画面専用アダプター
 * ArticleStorageServiceとの統合により、管理画面とLP側でデータを統一管理
 * 既存のAPIを維持しながら、内部実装を統合サービスに委譲
 * @version 3.0.0 - リファクタリング統合版
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { getArticleStorageService } from '../../../shared/services/ArticleStorageService.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class ArticleDataService {
  constructor() {
    this.initialized = false;
    this.componentName = 'ArticleDataService';
    
    /** @type {ArticleStorageService} 統合ストレージサービス */
    this.storageService = null;
    
    // 後方互換性のためのプロパティ
    this.articles = [];
    this.unsavedChanges = new Set();
    this.lastSaved = null;
    
    // 設定（統合サービスと統一）
    this.storageKeys = {
      articles: CONFIG.storage.keys.articles,
      content: CONFIG.storage.keys.content,
      config: CONFIG.storage.keys.config
    };
    
    // 自動保存間隔（統合サービスが管理）
    this.autoSaveInterval = null;
    this.autoSaveDelay = CONFIG.articles.autoSaveInterval;
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
      this.log('管理画面用記事データサービス初期化開始');
      
      // 統合ストレージサービスの取得と初期化
      this.storageService = getArticleStorageService();
      
      if (!this.storageService.initialized) {
        await this.storageService.init();
      }
      
      // データ同期
      await this.syncFromStorageService();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      this.initialized = true;
      this.log('管理画面用記事データサービス初期化完了');
      
    } catch (error) {
      this.error('初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 統合ストレージサービスからデータ同期
   * @private
   */
  async syncFromStorageService() {
    try {
      // 全記事データを取得（下書きも含む）
      this.articles = this.storageService.getAllArticles();
      
      // EventBusでの互換性イベント発火
      EventBus.emit('articles:loaded', { count: this.articles.length });
      
      this.debug(`データ同期完了: ${this.articles.length}件`);
      
    } catch (error) {
      this.error('データ同期エラー:', error);
      this.articles = [];
    }
  }

  /**
   * イベントリスナー設定
   * @private
   */
  setupEventListeners() {
    // 統合ストレージサービスのイベントを管理画面向けに変換
    EventBus.on('articleStorage:articleSaved', this.handleStorageArticleSaved.bind(this));
    EventBus.on('articleStorage:articleDeleted', this.handleStorageArticleDeleted.bind(this));
    EventBus.on('articleStorage:refreshed', this.handleStorageRefreshed.bind(this));
  }

  /**
   * 記事データの読み込み（後方互換性）
   * @returns {Array} 記事データ
   */
  loadArticles() {
    try {
      if (!this.storageService) {
        this.warn('ストレージサービスが初期化されていません');
        return [];
      }
      
      // 統合サービスから全記事取得
      this.articles = this.storageService.getAllArticles();
      
      EventBus.emit('articles:loaded', { count: this.articles.length });
      this.debug(`記事データを読み込み: ${this.articles.length}件`);
      
      return this.articles;
    } catch (error) {
      this.error('記事データの読み込みに失敗:', error);
      this.articles = [];
      return [];
    }
  }

  /**
   * 記事を保存
   * @param {Object} articleData - 記事データ
   * @param {boolean} publish - 公開フラグ
   * @returns {Promise<{success: boolean, id?: string, message?: string}>}
   */
  async saveArticle(articleData, publish = false) {
    try {
      this.debug('記事保存開始:', { title: articleData.title, publish });
      
      if (!this.storageService) {
        return {
          success: false,
          message: 'ストレージサービスが初期化されていません'
        };
      }
      
      // 統合ストレージサービスに委譲
      const result = await this.storageService.saveArticle(articleData, publish);
      
      if (result.success) {
        // データ同期
        await this.syncFromStorageService();
        this.markAsSaved();
        
        // 後方互換性イベント発火
        EventBus.emit('article:saved', { 
          article: result.article, 
          isNew: !articleData.id,
          published: publish 
        });
      }
      
      return result;
      
    } catch (error) {
      this.error('記事保存エラー:', error);
      return {
        success: false,
        message: `保存中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事の削除
   * @param {string} articleId - 記事ID
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async deleteArticle(articleId) {
    try {
      if (!this.storageService) {
        return {
          success: false,
          message: 'ストレージサービスが初期化されていません'
        };
      }
      
      // 削除前の記事情報を取得
      const article = this.getArticleById(articleId);
      
      // 統合ストレージサービスに委譲
      const result = await this.storageService.deleteArticle(articleId);
      
      if (result.success) {
        // データ同期
        await this.syncFromStorageService();
        
        // 後方互換性イベント発火
        EventBus.emit('article:deleted', { 
          articleId,
          title: article?.title || 'Unknown'
        });
      }
      
      return result;
      
    } catch (error) {
      this.error('記事削除エラー:', error);
      return {
        success: false,
        message: `削除中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事IDで記事を取得
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
   * 記事本文の取得
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
   * 公開記事の取得
   * @param {Object} options - 取得オプション
   * @returns {Array} 公開記事一覧
   */
  getPublishedArticles(options = {}) {
    if (!this.storageService) {
      this.warn('ストレージサービスが初期化されていません');
      return [];
    }
    
    return this.storageService.getPublishedArticles(options);
  }

  /**
   * 全記事の取得
   * @param {Object} options - 取得オプション
   * @returns {Array} 全記事一覧
   */
  getAllArticles(options = {}) {
    if (!this.storageService) {
      this.warn('ストレージサービスが初期化されていません');
      return [];
    }
    
    return this.storageService.getAllArticles(options);
  }

  /**
   * 下書き記事の取得
   * @returns {Array} 下書き記事一覧
   */
  getDraftArticles() {
    if (!this.storageService) {
      this.warn('ストレージサービスが初期化されていません');
      return [];
    }
    
    return this.storageService.getAllArticles({ status: 'draft' });
  }

  /**
   * 記事の検索
   * @param {string} query - 検索クエリ
   * @param {Object} options - 検索オプション
   * @returns {Array} 検索結果
   */
  searchArticles(query, options = {}) {
    if (!query || !this.articles) {
      return [];
    }
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return this.articles.filter(article => {
      const searchableText = [
        article.title,
        article.summary || article.excerpt || '',
        article.category,
        this.getArticleContent(article.id)
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  /**
   * カテゴリー別記事数の取得
   * @returns {Object} カテゴリー別記事数
   */
  getCategoryCount() {
    const counts = {
      all: this.articles.length,
      published: 0,
      draft: 0,
      announcement: 0,
      event: 0,
      media: 0,
      important: 0
    };
    
    this.articles.forEach(article => {
      counts[article.status]++;
      counts[article.category]++;
    });
    
    return counts;
  }

  /**
   * 記事バリデーション
   * @param {Object} articleData - 記事データ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validateArticle(articleData) {
    if (!this.storageService) {
      return {
        isValid: false,
        errors: ['ストレージサービスが初期化されていません']
      };
    }
    
    // 統合サービスのバリデーションを使用
    return this.storageService.validateArticleForSave(articleData);
  }

  /**
   * IDの生成（後方互換性）
   * @returns {string} 新しいID
   */
  generateId() {
    if (!this.storageService) {
      // フォールバック
      return `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return this.storageService.generateArticleId();
  }

  /**
   * データ更新
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      if (!this.storageService) {
        await this.init();
        return;
      }
      
      await this.storageService.refresh();
      await this.syncFromStorageService();
      
      this.debug('データ更新完了');
      
    } catch (error) {
      this.error('データ更新エラー:', error);
    }
  }

  /**
   * 自動保存設定（後方互換性）
   */
  setupAutoSave() {
    // 統合サービスが自動保存を管理するため、ここでは何もしない
    this.debug('自動保存は統合ストレージサービスが管理します');
  }

  /**
   * 保存済みマーク（後方互換性）
   */
  markAsSaved() {
    this.lastSaved = new Date();
    this.unsavedChanges.clear();
  }

  /**
   * ステータス情報の取得
   * @returns {Object} ステータス情報
   */
  getStatus() {
    const storageStatus = this.storageService?.getStatus() || {};
    
    return {
      initialized: this.initialized,
      articlesCount: this.articles.length,
      unsavedChanges: this.unsavedChanges.size,
      lastSaved: this.lastSaved,
      storageService: storageStatus
    };
  }

  /**
   * エクスポート用データ取得
   * @returns {Object} エクスポートデータ
   */
  getExportData() {
    try {
      return {
        articles: this.articles.map(article => ({
          ...article,
          content: this.getArticleContent(article.id)
        })),
        metadata: {
          exportedAt: new Date().toISOString(),
          count: this.articles.length,
          version: '3.0.0'
        }
      };
      
    } catch (error) {
      this.error('エクスポートデータ取得エラー:', error);
      return {
        articles: [],
        metadata: {
          exportedAt: new Date().toISOString(),
          count: 0,
          version: '3.0.0',
          error: error.message
        }
      };
    }
  }

  /**
   * データインポート
   * @param {Object} data - インポートデータ
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async importData(data) {
    try {
      if (!data.articles || !Array.isArray(data.articles)) {
        return {
          success: false,
          message: '無効なデータ形式です'
        };
      }
      
      // 各記事を個別に保存
      let importedCount = 0;
      const errors = [];
      
      for (const article of data.articles) {
        try {
          const result = await this.saveArticle(article, article.status === 'published');
          if (result.success) {
            importedCount++;
          } else {
            errors.push(`${article.title}: ${result.message}`);
          }
        } catch (error) {
          errors.push(`${article.title}: ${error.message}`);
        }
      }
      
      const message = `${importedCount}件の記事をインポートしました` + 
        (errors.length > 0 ? `（${errors.length}件のエラー）` : '');
      
      return {
        success: true,
        message,
        importedCount,
        errors
      };
      
    } catch (error) {
      this.error('データインポートエラー:', error);
      return {
        success: false,
        message: `インポート中にエラーが発生しました: ${error.message}`
      };
    }
  }

  // イベントハンドラー

  /**
   * ストレージ記事保存ハンドラー
   * @private
   * @param {Object} event - イベントデータ
   */
  handleStorageArticleSaved(event) {
    this.debug('ストレージ記事保存イベント受信:', event);
    this.syncFromStorageService();
  }

  /**
   * ストレージ記事削除ハンドラー
   * @private
   * @param {Object} event - イベントデータ
   */
  handleStorageArticleDeleted(event) {
    this.debug('ストレージ記事削除イベント受信:', event);
    this.syncFromStorageService();
  }

  /**
   * ストレージ更新ハンドラー
   * @private
   * @param {Object} event - イベントデータ
   */
  handleStorageRefreshed(event) {
    this.debug('ストレージ更新イベント受信:', event);
    this.syncFromStorageService();
  }

  /**
   * サービス破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.log('管理画面用記事データサービス破棄開始');
      
      // イベントリスナーの削除
      EventBus.off('articleStorage:articleSaved', this.handleStorageArticleSaved);
      EventBus.off('articleStorage:articleDeleted', this.handleStorageArticleDeleted);
      EventBus.off('articleStorage:refreshed', this.handleStorageRefreshed);
      
      // プロパティのクリア
      this.articles = [];
      this.unsavedChanges.clear();
      this.storageService = null;
      this.initialized = false;
      
      this.log('管理画面用記事データサービス破棄完了');
      
    } catch (error) {
      this.error('サービス破棄エラー:', error);
    }
  }

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log(`📰 ${this.componentName}:`, ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (window.DEBUG || window.location.hostname === 'localhost') {
      console.debug(`🔍 ${this.componentName}:`, ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn(`⚠️ ${this.componentName}:`, ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error(`❌ ${this.componentName}:`, ...args);
  }

  /**
   * 統計情報の取得
   * @returns {Object} 統計情報
   */
  getStats() {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const stats = {
        total: this.articles.length,
        published: 0,
        drafts: 0,
        currentMonth: 0
      };
      
      this.articles.forEach(article => {
        // ステータス別カウント
        if (article.status === 'published') {
          stats.published++;
        } else if (article.status === 'draft') {
          stats.drafts++;
        }
        
        // 今月の記事カウント
        const articleDate = new Date(article.createdAt || article.date);
        if (articleDate.getMonth() === currentMonth && articleDate.getFullYear() === currentYear) {
          stats.currentMonth++;
        }
      });
      
      return stats;
      
    } catch (error) {
      this.error('統計情報取得エラー:', error);
      return {
        total: 0,
        published: 0,
        drafts: 0,
        currentMonth: 0
      };
    }
  }

  /**
   * 全記事データクリア
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async clearAllData() {
    try {
      this.log('全記事データクリア開始');
      
      // メモリからデータクリア
      this.articles = [];
      
      // ストレージからデータクリア
      await this.storageService.clearAll();
      
      EventBus.emit('articles:allCleared');
      
      this.log('全記事データクリア完了');
      
      return {
        success: true,
        message: '全ての記事データを削除しました'
      };
      
    } catch (error) {
      this.error('全データクリアエラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// シングルトンインスタンス
let articleDataServiceInstance = null;

/**
 * ArticleDataServiceのシングルトンインスタンスを取得
 * @returns {ArticleDataService}
 */
export function getArticleDataService() {
  if (!articleDataServiceInstance) {
    articleDataServiceInstance = new ArticleDataService();
  }
  return articleDataServiceInstance;
}

// 後方互換性のためのデフォルトエクスポート
export const articleDataService = getArticleDataService();

// ES6モジュールのデフォルトエクスポート
export default ArticleDataService;