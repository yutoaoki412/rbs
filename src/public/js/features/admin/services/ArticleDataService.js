/**
 * 記事データサービス
 * 記事データの保存・読み込み・バリデーションを管理
 * @version 2.0.0
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { randomString } from '../../../shared/utils/stringUtils.js';
import { isValidDate, formatDate } from '../../../shared/utils/dateUtils.js';

export class ArticleDataService {
  constructor() {
    this.initialized = false;
    
    // ストレージキー
    this.storageKeys = {
      articles: 'rbs_articles_data',
      content: 'rbs_articles_content'
    };
    
    // データ格納
    this.articles = [];
    this.unsavedChanges = new Set();
    this.lastSaved = null;
    
    // 自動保存間隔（5分）
    this.autoSaveInterval = null;
    this.autoSaveDelay = 5 * 60 * 1000;
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ ArticleDataService: 既に初期化済み');
      return;
    }

    console.log('📰 ArticleDataService: 初期化開始');
    
    this.loadArticles();
    this.setupAutoSave();
    
    this.initialized = true;
    console.log('✅ ArticleDataService: 初期化完了');
  }

  /**
   * 記事データの読み込み
   */
  loadArticles() {
    try {
      const data = localStorage.getItem(this.storageKeys.articles);
      this.articles = data ? JSON.parse(data) : [];
      
      // データの整合性チェック
      this.articles = this.articles.filter(article => 
        article && 
        typeof article === 'object' && 
        article.id &&
        article.createdAt &&
        article.status
      );
      
      EventBus.emit('articles:loaded', { count: this.articles.length });
      console.log(`📰 記事データを読み込み: ${this.articles.length}件`);
      
      return this.articles;
    } catch (error) {
      console.error('❌ 記事データの読み込みに失敗:', error);
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
      console.log('📝 記事保存開始:', { title: articleData.title, publish });
      
      // バリデーション
      const validation = this.validateArticle(articleData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `入力エラー: ${validation.errors.join(', ')}`
        };
      }

      const now = new Date();
      let article;
      
      if (articleData.id) {
        // 既存記事の更新
        const index = this.articles.findIndex(a => a.id === articleData.id);
        if (index === -1) {
          return {
            success: false,
            message: '記事が見つかりませんでした'
          };
        }
        
        article = {
          ...this.articles[index],
          ...articleData,
          updatedAt: now.toISOString(),
          status: publish ? 'published' : articleData.status || 'draft'
        };
        
        if (publish && article.status !== 'published') {
          article.publishedAt = now.toISOString();
        }
        
        this.articles[index] = article;
      } else {
        // 新規記事の作成
        article = {
          ...articleData,
          id: this.generateId(),
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

      // ローカルストレージに保存
      await this.saveToStorage();
      
      this.markAsSaved();
      
      EventBus.emit('article:saved', { 
        article, 
        isNew: !articleData.id,
        published: publish 
      });
      
      console.log('✅ 記事保存完了:', { id: article.id, status: article.status });
      
      return {
        success: true,
        id: article.id,
        message: publish ? '記事を公開しました' : '記事を保存しました'
      };
      
    } catch (error) {
      console.error('❌ 記事保存エラー:', error);
      return {
        success: false,
        message: '記事の保存に失敗しました'
      };
    }
  }

  /**
   * 記事を削除
   * @param {string} id - 記事ID
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async deleteArticle(id) {
    try {
      const index = this.articles.findIndex(a => a.id === id);
      
      if (index === -1) {
        return {
          success: false,
          message: '記事が見つかりませんでした'
        };
      }
      
      const article = this.articles[index];
      this.articles.splice(index, 1);
      
      // コンテンツも削除
      this.deleteArticleContent(id);
      
      await this.saveToStorage();
      
      EventBus.emit('article:deleted', { article });
      
      console.log('🗑️ 記事削除完了:', { id, title: article.title });
      
      return {
        success: true,
        message: '記事を削除しました'
      };
      
    } catch (error) {
      console.error('❌ 記事削除エラー:', error);
      return {
        success: false,
        message: '記事の削除に失敗しました'
      };
    }
  }

  /**
   * 記事を取得
   * @param {Object} filter - フィルター条件
   * @returns {Array}
   */
  getArticles(filter = {}) {
    let result = [...this.articles];
    
    // フィルタリング
    if (filter.status) {
      result = result.filter(article => article.status === filter.status);
    }
    
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      result = result.filter(article => 
        article.title?.toLowerCase().includes(searchTerm) ||
        article.excerpt?.toLowerCase().includes(searchTerm) ||
        article.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    if (filter.category) {
      result = result.filter(article => article.category === filter.category);
    }
    
    // ソート
    if (filter.sortBy) {
      const sortBy = filter.sortBy;
      const order = filter.order === 'asc' ? 1 : -1;
      
      result.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (sortBy.includes('At')) {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (aValue < bValue) return -1 * order;
        if (aValue > bValue) return 1 * order;
        return 0;
      });
    } else {
      // デフォルトは更新日時の降順
      result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    
    // ページネーション
    if (filter.limit) {
      const start = (filter.page || 0) * filter.limit;
      result = result.slice(start, start + filter.limit);
    }
    
    return result;
  }

  /**
   * 記事を取得（ID指定）
   * @param {string} id - 記事ID
   * @returns {Object|null}
   */
  getArticleById(id) {
    return this.articles.find(article => article.id === id) || null;
  }

  /**
   * 記事のコンテンツを保存
   * @param {string} id - 記事ID
   * @param {string} content - コンテンツ
   */
  saveArticleContent(id, content) {
    try {
      const contentData = this.getContentData();
      contentData[id] = content;
      localStorage.setItem(this.storageKeys.content, JSON.stringify(contentData));
      
      this.markAsUnsaved();
    } catch (error) {
      console.error('❌ コンテンツ保存エラー:', error);
    }
  }

  /**
   * 記事のコンテンツを取得
   * @param {string} id - 記事ID
   * @returns {string}
   */
  getArticleContent(id) {
    try {
      const contentData = this.getContentData();
      return contentData[id] || '';
    } catch (error) {
      console.error('❌ コンテンツ取得エラー:', error);
      return '';
    }
  }

  /**
   * 記事のコンテンツを削除
   * @param {string} id - 記事ID
   */
  deleteArticleContent(id) {
    try {
      const contentData = this.getContentData();
      delete contentData[id];
      localStorage.setItem(this.storageKeys.content, JSON.stringify(contentData));
    } catch (error) {
      console.error('❌ コンテンツ削除エラー:', error);
    }
  }

  /**
   * コンテンツデータを取得
   * @private
   * @returns {Object}
   */
  getContentData() {
    try {
      const data = localStorage.getItem(this.storageKeys.content);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('❌ コンテンツデータ取得エラー:', error);
      return {};
    }
  }

  /**
   * 記事のバリデーション
   * @param {Object} data - 記事データ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validateArticle(data) {
    const errors = [];
    
    if (!data.title || data.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    } else if (data.title.length > 100) {
      errors.push('タイトルは100文字以内で入力してください');
    }
    
    if (!data.excerpt || data.excerpt.trim().length === 0) {
      errors.push('概要は必須です');
    } else if (data.excerpt.length > 200) {
      errors.push('概要は200文字以内で入力してください');
    }
    
    if (data.category && !['event', 'lesson', 'news', 'other'].includes(data.category)) {
      errors.push('カテゴリが無効です');
    }
    
    if (data.tags && Array.isArray(data.tags)) {
      if (data.tags.length > 5) {
        errors.push('タグは5個以内で設定してください');
      }
    }
    
    if (data.publishedAt && !isValidDate(data.publishedAt)) {
      errors.push('公開日時の形式が正しくありません');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ストレージに保存
   * @private
   */
  async saveToStorage() {
    try {
      localStorage.setItem(this.storageKeys.articles, JSON.stringify(this.articles));
      this.lastSaved = new Date();
    } catch (error) {
      console.error('❌ ストレージ保存エラー:', error);
      throw error;
    }
  }

  /**
   * 自動保存の設定
   * @private
   */
  setupAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      this.autoSave();
    }, this.autoSaveDelay);
  }

  /**
   * 自動保存実行
   * @private
   */
  async autoSave() {
    if (this.unsavedChanges.size > 0) {
      try {
        await this.saveToStorage();
        this.markAsSaved();
        console.log('💾 記事データ自動保存完了');
      } catch (error) {
        console.error('❌ 自動保存エラー:', error);
      }
    }
  }

  /**
   * 未保存状態としてマーク
   * @private
   */
  markAsUnsaved() {
    this.unsavedChanges.add('articles');
  }

  /**
   * 保存済み状態としてマーク
   * @private
   */
  markAsSaved() {
    this.unsavedChanges.clear();
  }

  /**
   * 未保存の変更があるかチェック
   * @returns {boolean}
   */
  hasUnsavedChanges() {
    return this.unsavedChanges.size > 0;
  }

  /**
   * 統計情報を取得
   * @returns {Object}
   */
  getStats() {
    const total = this.articles.length;
    const published = this.articles.filter(a => a.status === 'published').length;
    const drafts = this.articles.filter(a => a.status === 'draft').length;
    const totalViews = this.articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalLikes = this.articles.reduce((sum, a) => sum + (a.likes || 0), 0);
    
    return {
      total,
      published,
      drafts,
      totalViews,
      totalLikes
    };
  }

  /**
   * データをエクスポート
   * @returns {Object}
   */
  exportData() {
    const contentData = this.getContentData();
    
    return {
      articles: this.articles,
      content: contentData,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };
  }

  /**
   * ID生成
   * @private
   * @returns {string}
   */
  generateId() {
    const timestamp = Date.now().toString(36);
    const random = randomString(6);
    return `article_${timestamp}_${random}`;
  }

  /**
   * 破棄処理
   */
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    this.articles = [];
    this.unsavedChanges.clear();
    this.initialized = false;
    
    console.log('🗑️ ArticleDataService: 破棄完了');
  }
}

// シングルトンインスタンス
export const articleDataService = new ArticleDataService();