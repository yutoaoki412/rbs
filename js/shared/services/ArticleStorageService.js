/**
 * 統合記事ストレージサービス
 * LP側と管理画面側の記事データを統一管理
 * LocalStorageベースのデータ永続化と同期機能を提供
 * @version 3.0.0 - リファクタリング統合版
 */

import { EventBus } from './EventBus.js';
import { randomString } from '../utils/stringUtils.js';
import { isValidDate, formatDate } from '../utils/dateUtils.js';
import { CONFIG } from '../constants/config.js';

export class ArticleStorageService {
  constructor() {
    this.initialized = false;
    this.componentName = 'ArticleStorageService';
    
    // 統一ストレージキー（最適化版CONFIG対応）
    this.storageKeys = {
      articles: CONFIG.storage.keys.articles,    // 'rbs_articles' - 統一記事データ
      settings: CONFIG.storage.keys.settings,    // 'rbs_settings' - 設定データ
      cache: CONFIG.storage.keys.cache           // 'rbs_cache' - キャッシュデータ
    };
    
    // データキャッシュ
    this.articles = [];
    this.publishedArticles = [];
    this.draftArticles = [];
    this.contentCache = new Map();
    
    // 同期管理
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.unsavedChanges = new Set();
    
    // カテゴリー設定（設定ファイルから読み込み）
    this.categories = CONFIG.articles.categories;
    
    // 設定（最適化版設定ファイルから読み込み）
    this.config = {
      maxArticles: CONFIG.articles.maxCount,
      excerptLength: CONFIG.articles.excerptLength,
      autoSaveInterval: CONFIG.storage.autoSave,
      syncTimeout: CONFIG.performance.cacheTimeout
    };
    
    // 自動保存タイマー
    this.autoSaveTimer = null;
    
    // イベントハンドラーのバインド
    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  /**
   * サービス初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      this.log('既に初期化済みです');
      return;
    }

    try {
      this.log('初期化開始');
      
      // データ読み込み
      await this.loadData();
      
      // 既存データのマイグレーション
      await this.migrateExistingData();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // 自動保存開始
      this.startAutoSave();
      
      this.initialized = true;
      this.lastSyncTime = new Date();
      
      this.log(`初期化完了 - 記事数: ${this.articles.length}件（公開: ${this.publishedArticles.length}件、下書き: ${this.draftArticles.length}件）`);
      
      // 初期化完了イベント
      EventBus.emit('articleStorage:initialized', {
        totalArticles: this.articles.length,
        publishedCount: this.publishedArticles.length,
        draftCount: this.draftArticles.length
      });
      
    } catch (error) {
      this.error('初期化エラー:', error);
      throw error;
    }
  }

  /**
   * データ読み込み
   * @private
   */
  async loadData() {
    try {
      // 記事データ読み込み
      const articlesData = localStorage.getItem(this.storageKeys.articles);
      this.articles = articlesData ? JSON.parse(articlesData) : [];
      
      // データ整合性チェック
      this.articles = this.articles.filter(this.validateArticleStructure.bind(this));
      
      // 記事の分類
      this.categorizeArticles();
      
      // 本文キャッシュ読み込み（最適化版）
      const contentData = localStorage.getItem(this.storageKeys.cache);
      if (contentData) {
        try {
          const contentMap = JSON.parse(contentData);
          this.contentCache = new Map(Object.entries(contentMap));
        } catch (error) {
          this.warn('キャッシュデータの読み込みに失敗:', error);
          this.contentCache = new Map();
        }
      }
      
      // 設定読み込み（最適化版）
      const configData = localStorage.getItem(this.storageKeys.settings);
      if (configData) {
        try {
          const settings = JSON.parse(configData);
          this.config = { ...this.config, ...settings };
        } catch (error) {
          this.warn('設定データの読み込みに失敗:', error);
        }
      }
      
      this.debug(`データ読み込み完了 - 記事: ${this.articles.length}件, 本文キャッシュ: ${this.contentCache.size}件`);
      
    } catch (error) {
      this.error('データ読み込みエラー:', error);
      this.articles = [];
      this.contentCache = new Map();
    }
  }

  /**
   * 既存データのマイグレーション
   * @private
   */
  async migrateExistingData() {
    try {
      // 統一されたマイグレーション対象キー
      const legacyKeys = [
        `${CONFIG.storage.prefix}articles_data`, // 旧ArticleDataService
        'articles_data', // プレフィックスなし
        'rbs_news_data', // 別の可能性のあるキー
      ];
      
      let totalMigrated = 0;
      
      for (const legacyKey of legacyKeys) {
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
          this.debug(`旧データを発見: ${legacyKey}`);
          
          try {
            const articles = JSON.parse(legacyData);
            if (Array.isArray(articles) && articles.length > 0) {
              // 既存記事とマージ（重複除去）
              const existingIds = new Set(this.articles.map(a => a.id));
              const newArticles = articles.filter(a => a.id && !existingIds.has(a.id));
              
              if (newArticles.length > 0) {
                this.articles.push(...newArticles);
                totalMigrated += newArticles.length;
                this.debug(`${legacyKey}から${newArticles.length}件の記事をマイグレーション`);
              }
            }
          } catch (parseError) {
            this.warn(`${legacyKey}のパースに失敗:`, parseError.message);
          }
        }
      }
      
      if (totalMigrated > 0) {
        // マイグレーション後のデータを保存
        await this.saveData();
        this.categorizeArticles();
        
        this.log(`合計${totalMigrated}件の記事をマイグレーションしました`);
        
        // EventBus通知
        EventBus.emit('articleStorage:migrationCompleted', {
          totalMigrated,
          totalArticles: this.articles.length
        });
        
        // 開発環境では旧データを保持（安全性のため）
        if (CONFIG.app.environment === 'development') {
          this.log('開発環境のため旧データは保持されています');
        }
      } else {
        this.debug('マイグレーション対象のデータはありませんでした');
      }
      
    } catch (error) {
      this.error('マイグレーションエラー:', error);
    }
  }

  /**
   * 記事の分類
   * @private
   */
  categorizeArticles() {
    this.publishedArticles = this.articles.filter(a => a.status === 'published');
    this.draftArticles = this.articles.filter(a => a.status === 'draft');
    
    // 日付順でソート
    this.publishedArticles.sort((a, b) => new Date(b.date || b.publishedAt || b.createdAt) - new Date(a.date || a.publishedAt || a.createdAt));
    this.draftArticles.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  /**
   * 記事構造の検証
   * @private
   * @param {Object} article - 記事データ
   * @returns {boolean}
   */
  validateArticleStructure(article) {
    if (!article || typeof article !== 'object') return false;
    if (!article.id || !article.title || !article.status) return false;
    if (!article.createdAt) return false;
    
    return true;
  }

  /**
   * 公開記事の取得
   * @param {Object} options - 取得オプション
   * @returns {Array} 公開記事一覧
   */
  getPublishedArticles(options = {}) {
    const {
      category = null,
      limit = null,
      offset = 0,
      featured = null
    } = options;
    
    let articles = [...this.publishedArticles];
    
    // カテゴリーフィルター
    if (category && category !== 'all') {
      articles = articles.filter(a => a.category === category);
    }
    
    // 注目記事フィルター
    if (featured !== null) {
      articles = articles.filter(a => !!a.featured === featured);
    }
    
    // 正規化処理
    articles = articles.map(article => this.normalizeArticle(article));
    
    // ページネーション
    if (limit) {
      articles = articles.slice(offset, offset + limit);
    }
    
    return articles;
  }

  /**
   * 全記事の取得（管理画面用）
   * @param {Object} options - 取得オプション
   * @returns {Array} 全記事一覧
   */
  getAllArticles(options = {}) {
    const {
      status = null,
      category = null,
      limit = null,
      offset = 0
    } = options;
    
    let articles = [...this.articles];
    
    // ステータスフィルター
    if (status && status !== 'all') {
      articles = articles.filter(a => a.status === status);
    }
    
    // カテゴリーフィルター
    if (category && category !== 'all') {
      articles = articles.filter(a => a.category === category);
    }
    
    // 正規化処理
    articles = articles.map(article => this.normalizeArticle(article));
    
    // ページネーション
    if (limit) {
      articles = articles.slice(offset, offset + limit);
    }
    
    return articles;
  }

  /**
   * 記事の正規化
   * @private
   * @param {Object} article - 元記事データ
   * @returns {Object} 正規化された記事データ
   */
  normalizeArticle(article) {
    const category = this.categories[article.category] || this.categories.announcement;
    
    return {
      id: article.id,
      title: article.title || '',
      category: article.category || 'announcement',
      categoryName: category.name,
      categoryColor: category.color,
      date: article.date || article.publishedAt?.split('T')[0] || article.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      formattedDate: this.formatDate(article.date || article.publishedAt || article.createdAt),
      summary: article.summary || article.excerpt || '',
      excerpt: this.generateExcerpt(article),
      content: this.getArticleContent(article.id),
      featured: !!article.featured,
      status: article.status,
      views: article.views || 0,
      likes: article.likes || 0,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      publishedAt: article.publishedAt
    };
  }

  /**
   * 記事の保存
   * @param {Object} articleData - 記事データ
   * @param {boolean} publish - 公開フラグ
   * @returns {Promise<{success: boolean, id?: string, message?: string, article?: Object}>}
   */
  async saveArticle(articleData, publish = false) {
    try {
      this.debug('記事保存開始:', { title: articleData.title, publish });
      
      // バリデーション
      const validation = this.validateArticleForSave(articleData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `入力エラー: ${validation.errors.join(', ')}`
        };
      }
      
      const now = new Date();
      let article;
      let isNew = false;
      
      if (articleData.id) {
        // 既存記事の更新
        const index = this.articles.findIndex(a => a.id === articleData.id);
        if (index === -1) {
          return {
            success: false,
            message: '記事が見つかりませんでした'
          };
        }
        
        const oldStatus = this.articles[index].status;
        
        article = {
          ...this.articles[index],
          ...articleData,
          updatedAt: now.toISOString(),
          status: publish ? 'published' : (articleData.status || oldStatus)
        };
        
        // 公開時の処理
        if (publish && oldStatus !== 'published') {
          article.publishedAt = now.toISOString();
        }
        
        this.articles[index] = article;
        
      } else {
        // 新規記事の作成
        isNew = true;
        article = {
          ...articleData,
          id: this.generateArticleId(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          status: publish ? 'published' : 'draft',
          views: 0,
          likes: 0
        };
        
        if (publish) {
          article.publishedAt = now.toISOString();
        }
        
        this.articles.unshift(article); // 新しい記事を先頭に追加
      }
      
      // 本文の保存
      if (articleData.content) {
        this.contentCache.set(article.id, articleData.content);
      }
      
      // データ保存
      await this.saveData();
      
      // 記事の分類更新
      this.categorizeArticles();
      
      const message = isNew 
        ? (publish ? '記事を公開しました' : '記事を下書き保存しました')
        : (publish ? '記事を公開しました' : '記事を更新しました');
      
      // イベント発火
      EventBus.emit('articleStorage:articleSaved', { 
        article: this.normalizeArticle(article), 
        isNew,
        published: publish 
      });
      
      this.log(`記事保存完了: ${article.title} (${article.status})`);
      
      return {
        success: true,
        id: article.id,
        message,
        article: this.normalizeArticle(article)
      };
      
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
      const index = this.articles.findIndex(a => a.id === articleId);
      if (index === -1) {
        return {
          success: false,
          message: '記事が見つかりませんでした'
        };
      }
      
      const article = this.articles[index];
      this.articles.splice(index, 1);
      
      // 本文キャッシュからも削除
      this.contentCache.delete(articleId);
      
      // データ保存
      await this.saveData();
      
      // 記事の分類更新
      this.categorizeArticles();
      
      // イベント発火
      EventBus.emit('articleStorage:articleDeleted', { 
        articleId,
        title: article.title 
      });
      
      this.log(`記事削除完了: ${article.title}`);
      
      return {
        success: true,
        message: '記事を削除しました'
      };
      
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
    const article = this.articles.find(a => a.id === articleId);
    return article ? this.normalizeArticle(article) : null;
  }

  /**
   * 記事本文の取得
   * @param {string} articleId - 記事ID
   * @returns {string} 記事本文
   */
  getArticleContent(articleId) {
    return this.contentCache.get(articleId) || '';
  }

  /**
   * 要約の生成
   * @private
   * @param {Object} article - 記事データ
   * @returns {string} 要約文
   */
  generateExcerpt(article) {
    // 既存の要約を優先
    if (article.summary || article.excerpt) {
      return article.summary || article.excerpt;
    }
    
    // 本文から生成
    const content = this.getArticleContent(article.id);
    if (content) {
      const text = content.replace(/<[^>]*>/g, '').trim();
      return text.length > this.config.excerptLength 
        ? text.substring(0, this.config.excerptLength) + '...'
        : text;
    }
    
    return '';
  }

  /**
   * 日付のフォーマット
   * @private
   * @param {string} dateString - 日付文字列
   * @returns {string} フォーマット済み日付
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * 記事IDの生成
   * @private
   * @returns {string} 新しい記事ID
   */
  generateArticleId() {
    let id;
    do {
      id = `article_${Date.now()}_${randomString(8)}`;
    } while (this.articles.some(a => a.id === id));
    
    return id;
  }

  /**
   * 保存用バリデーション
   * @private
   * @param {Object} articleData - 記事データ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validateArticleForSave(articleData) {
    const errors = [];
    
    if (!articleData.title || articleData.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    }
    
    if (articleData.title && articleData.title.length > 200) {
      errors.push('タイトルは200文字以内で入力してください');
    }
    
    if (!articleData.category || !this.categories[articleData.category]) {
      errors.push('有効なカテゴリーを選択してください');
    }
    
    if (articleData.date && !isValidDate(articleData.date)) {
      errors.push('有効な日付を入力してください');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * データ保存
   * @private
   * @returns {Promise<void>}
   */
  async saveData() {
    try {
      // 記事データ保存
      localStorage.setItem(this.storageKeys.articles, JSON.stringify(this.articles));
      
      // 本文データ保存
      const contentObj = Object.fromEntries(this.contentCache);
      localStorage.setItem(this.storageKeys.content, JSON.stringify(contentObj));
      
      // 設定保存
      localStorage.setItem(this.storageKeys.config, JSON.stringify(this.config));
      
      this.unsavedChanges.clear();
      
    } catch (error) {
      this.error('データ保存エラー:', error);
      throw error;
    }
  }

  /**
   * イベントリスナー設定
   * @private
   */
  setupEventListeners() {
    // 他のタブでのStorageの変更を監視
    window.addEventListener('storage', this.handleStorageChange);
    
    // ページ離脱前の保存確認
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * 自動保存開始
   * @private
   */
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(async () => {
      if (this.unsavedChanges.size > 0) {
        try {
          await this.saveData();
          this.debug('自動保存完了');
        } catch (error) {
          this.error('自動保存エラー:', error);
        }
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * Storage変更ハンドラー
   * @private
   * @param {StorageEvent} event - Storageイベント
   */
  handleStorageChange(event) {
    if (Object.values(this.storageKeys).includes(event.key)) {
      this.debug('他のタブでデータが変更されました。再読み込みを実行します。');
      this.loadData().then(() => {
        EventBus.emit('articleStorage:dataChanged', {
          key: event.key,
          source: 'external'
        });
      });
    }
  }

  /**
   * ページ離脱前ハンドラー
   * @private
   * @param {BeforeUnloadEvent} event - 離脱イベント
   */
  handleBeforeUnload(event) {
    if (this.unsavedChanges.size > 0) {
      event.preventDefault();
      event.returnValue = '未保存の変更があります。本当にページを離れますか？';
      return event.returnValue;
    }
  }

  /**
   * データ同期
   * @returns {Promise<void>}
   */
  async refresh() {
    if (this.syncInProgress) {
      this.debug('同期処理が既に実行中です');
      return;
    }
    
    try {
      this.syncInProgress = true;
      this.debug('データ同期開始');
      
      await this.loadData();
      this.lastSyncTime = new Date();
      
      EventBus.emit('articleStorage:refreshed', {
        totalArticles: this.articles.length,
        publishedCount: this.publishedArticles.length,
        draftCount: this.draftArticles.length
      });
      
      this.debug('データ同期完了');
      
    } catch (error) {
      this.error('データ同期エラー:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * ステータス情報の取得
   * @returns {Object} ステータス情報
   */
  getStatus() {
    return {
      initialized: this.initialized,
      totalArticles: this.articles.length,
      publishedArticles: this.publishedArticles.length,
      draftArticles: this.draftArticles.length,
      contentCacheSize: this.contentCache.size,
      unsavedChanges: this.unsavedChanges.size,
      lastSyncTime: this.lastSyncTime,
      categories: Object.keys(this.categories)
    };
  }

  /**
   * サービス破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.log('サービス破棄開始');
      
      // 未保存データの保存
      if (this.unsavedChanges.size > 0) {
        await this.saveData();
      }
      
      // タイマー停止
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }
      
      // イベントリスナー削除
      window.removeEventListener('storage', this.handleStorageChange);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      
      // データクリア
      this.articles = [];
      this.publishedArticles = [];
      this.draftArticles = [];
      this.contentCache.clear();
      this.unsavedChanges.clear();
      
      this.initialized = false;
      
      this.log('サービス破棄完了');
      
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
    if (CONFIG.debug.enabled) {
      console.debug(`🔍 ${this.componentName}:`, ...args);
    }
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error(`❌ ${this.componentName}:`, ...args);
  }
}

// シングルトンインスタンス
let articleStorageServiceInstance = null;

/**
 * ArticleStorageServiceのシングルトンインスタンスを取得
 * @returns {ArticleStorageService}
 */
export function getArticleStorageService() {
  if (!articleStorageServiceInstance) {
    articleStorageServiceInstance = new ArticleStorageService();
  }
  return articleStorageServiceInstance;
}

// デフォルトエクスポート
export default ArticleStorageService; 