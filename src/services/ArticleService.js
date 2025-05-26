/**
 * 記事管理サービス
 * 記事の作成、編集、削除、取得を管理
 */
class ArticleService {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'articles';
    this.contentKey = options.contentKey || 'article_content';
    this.nextIdKey = options.nextIdKey || 'next_article_id';
    this.storageManager = options.storageManager || window.storageManager;
    this.cacheManager = options.cacheManager || window.cacheManager;
    
    // 記事データのキャッシュ
    this.articles = [];
    this.content = {};
    this.nextId = 1;
    this.isLoaded = false;
    
    // カテゴリ設定
    this.categories = {
      'news': { name: 'ニュース', color: '#4a90e2' },
      'event': { name: 'イベント', color: '#50c8a3' },
      'notice': { name: 'お知らせ', color: '#f5a623' },
      'update': { name: '更新情報', color: '#9b59b6' }
    };
    
    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    try {
      await this.loadArticles();
      this.isLoaded = true;
    } catch (error) {
      console.error('ArticleService initialization failed:', error);
    }
  }

  /**
   * 記事データを読み込み
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async loadArticles() {
    try {
      // キャッシュから取得を試行
      let cachedArticles = this.cacheManager.get(this.storageKey);
      let cachedContent = this.cacheManager.get(this.contentKey);
      let cachedNextId = this.cacheManager.get(this.nextIdKey);

      if (cachedArticles && cachedContent && cachedNextId) {
        this.articles = cachedArticles;
        this.content = cachedContent;
        this.nextId = cachedNextId;
        return true;
      }

      // ストレージから取得
      this.articles = this.storageManager.getLocal(this.storageKey, []);
      this.content = this.storageManager.getLocal(this.contentKey, {});
      this.nextId = this.storageManager.getLocal(this.nextIdKey, 1);

      // キャッシュに保存
      this.cacheManager.set(this.storageKey, this.articles, { ttl: 10 * 60 * 1000 }); // 10分
      this.cacheManager.set(this.contentKey, this.content, { ttl: 10 * 60 * 1000 });
      this.cacheManager.set(this.nextIdKey, this.nextId, { ttl: 10 * 60 * 1000 });

      return true;
    } catch (error) {
      console.error('Failed to load articles:', error);
      return false;
    }
  }

  /**
   * 記事データを保存
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async saveArticles() {
    try {
      // ストレージに保存
      const savePromises = [
        this.storageManager.setLocal(this.storageKey, this.articles),
        this.storageManager.setLocal(this.contentKey, this.content),
        this.storageManager.setLocal(this.nextIdKey, this.nextId)
      ];

      const results = await Promise.all(savePromises);
      const success = results.every(result => result === true);

      if (success) {
        // キャッシュも更新
        this.cacheManager.set(this.storageKey, this.articles, { ttl: 10 * 60 * 1000 });
        this.cacheManager.set(this.contentKey, this.content, { ttl: 10 * 60 * 1000 });
        this.cacheManager.set(this.nextIdKey, this.nextId, { ttl: 10 * 60 * 1000 });
      }

      return success;
    } catch (error) {
      console.error('Failed to save articles:', error);
      return false;
    }
  }

  /**
   * 新しい記事を作成
   * @param {Object} articleData - 記事データ
   * @returns {Promise<Object|null>} 作成された記事
   */
  async createArticle(articleData) {
    try {
      const validation = this.validateArticleData(articleData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const article = {
        id: this.nextId++,
        title: articleData.title.trim(),
        category: articleData.category,
        categoryName: this.getCategoryName(articleData.category),
        date: articleData.date || new Date().toISOString().split('T')[0],
        summary: articleData.summary ? articleData.summary.trim() : '',
        author: articleData.author || 'RBS陸上教室',
        status: articleData.status || 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        tags: articleData.tags || []
      };

      // 記事リストに追加
      this.articles.unshift(article);

      // コンテンツを保存
      if (articleData.content) {
        this.content[article.id] = articleData.content.trim();
      }

      // データを保存
      const saved = await this.saveArticles();
      if (!saved) {
        throw new Error('Failed to save article');
      }

      this.dispatchEvent('article:created', { article });
      return article;
    } catch (error) {
      console.error('Failed to create article:', error);
      return null;
    }
  }

  /**
   * 記事を更新
   * @param {number} id - 記事ID
   * @param {Object} updateData - 更新データ
   * @returns {Promise<Object|null>} 更新された記事
   */
  async updateArticle(id, updateData) {
    try {
      const articleIndex = this.articles.findIndex(article => article.id === id);
      if (articleIndex === -1) {
        throw new Error(`Article with id ${id} not found`);
      }

      const validation = this.validateArticleData(updateData, true);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const article = this.articles[articleIndex];
      
      // 記事データを更新
      if (updateData.title !== undefined) article.title = updateData.title.trim();
      if (updateData.category !== undefined) {
        article.category = updateData.category;
        article.categoryName = this.getCategoryName(updateData.category);
      }
      if (updateData.date !== undefined) article.date = updateData.date;
      if (updateData.summary !== undefined) article.summary = updateData.summary.trim();
      if (updateData.author !== undefined) article.author = updateData.author;
      if (updateData.status !== undefined) article.status = updateData.status;
      if (updateData.tags !== undefined) article.tags = updateData.tags;
      
      article.updatedAt = new Date().toISOString();

      // コンテンツを更新
      if (updateData.content !== undefined) {
        this.content[id] = updateData.content.trim();
      }

      // データを保存
      const saved = await this.saveArticles();
      if (!saved) {
        throw new Error('Failed to save updated article');
      }

      this.dispatchEvent('article:updated', { article });
      return article;
    } catch (error) {
      console.error('Failed to update article:', error);
      return null;
    }
  }

  /**
   * 記事を削除
   * @param {number} id - 記事ID
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async deleteArticle(id) {
    try {
      const articleIndex = this.articles.findIndex(article => article.id === id);
      if (articleIndex === -1) {
        throw new Error(`Article with id ${id} not found`);
      }

      const article = this.articles[articleIndex];
      
      // 記事を削除
      this.articles.splice(articleIndex, 1);
      
      // コンテンツも削除
      delete this.content[id];

      // データを保存
      const saved = await this.saveArticles();
      if (!saved) {
        throw new Error('Failed to save after deletion');
      }

      this.dispatchEvent('article:deleted', { article });
      return true;
    } catch (error) {
      console.error('Failed to delete article:', error);
      return false;
    }
  }

  /**
   * 記事を取得
   * @param {number} id - 記事ID
   * @returns {Object|null} 記事データ
   */
  getArticle(id) {
    const article = this.articles.find(article => article.id === id);
    if (!article) return null;

    return {
      ...article,
      content: this.content[id] || ''
    };
  }

  /**
   * すべての記事を取得
   * @param {Object} options - オプション
   * @returns {Array} 記事配列
   */
  getArticles(options = {}) {
    let filteredArticles = [...this.articles];

    // カテゴリフィルター
    if (options.category) {
      filteredArticles = filteredArticles.filter(article => article.category === options.category);
    }

    // ステータスフィルター
    if (options.status) {
      filteredArticles = filteredArticles.filter(article => article.status === options.status);
    }

    // 検索フィルター
    if (options.search) {
      const searchTerm = options.search.toLowerCase();
      filteredArticles = filteredArticles.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.summary.toLowerCase().includes(searchTerm) ||
        (this.content[article.id] && this.content[article.id].toLowerCase().includes(searchTerm))
      );
    }

    // ソート
    const sortBy = options.sortBy || 'date';
    const sortOrder = options.sortOrder || 'desc';
    
    filteredArticles.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // ページネーション
    if (options.page && options.limit) {
      const start = (options.page - 1) * options.limit;
      const end = start + options.limit;
      filteredArticles = filteredArticles.slice(start, end);
    }

    return filteredArticles;
  }

  /**
   * 記事の閲覧数を増加
   * @param {number} id - 記事ID
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async incrementViews(id) {
    try {
      const article = this.articles.find(article => article.id === id);
      if (!article) return false;

      article.views = (article.views || 0) + 1;
      article.updatedAt = new Date().toISOString();

      return await this.saveArticles();
    } catch (error) {
      console.error('Failed to increment views:', error);
      return false;
    }
  }

  /**
   * 記事データの検証
   * @param {Object} data - 記事データ
   * @param {boolean} isUpdate - 更新かどうか
   * @returns {Object} 検証結果
   */
  validateArticleData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.title !== undefined) {
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push('タイトルは必須です');
      } else if (data.title.trim().length > 200) {
        errors.push('タイトルは200文字以内で入力してください');
      }
    }

    if (!isUpdate || data.category !== undefined) {
      if (!data.category || !this.categories[data.category]) {
        errors.push('有効なカテゴリを選択してください');
      }
    }

    if (data.summary !== undefined && data.summary.length > 500) {
      errors.push('概要は500文字以内で入力してください');
    }

    if (data.content !== undefined && data.content.length > 50000) {
      errors.push('本文は50000文字以内で入力してください');
    }

    if (data.date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.date)) {
        errors.push('日付の形式が正しくありません（YYYY-MM-DD）');
      }
    }

    if (data.status !== undefined) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(data.status)) {
        errors.push('有効なステータスを選択してください');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * カテゴリ名を取得
   * @param {string} categoryKey - カテゴリキー
   * @returns {string} カテゴリ名
   */
  getCategoryName(categoryKey) {
    return this.categories[categoryKey]?.name || categoryKey;
  }

  /**
   * カテゴリ色を取得
   * @param {string} categoryKey - カテゴリキー
   * @returns {string} カテゴリ色
   */
  getCategoryColor(categoryKey) {
    return this.categories[categoryKey]?.color || '#6c757d';
  }

  /**
   * 利用可能なカテゴリを取得
   * @returns {Object} カテゴリ一覧
   */
  getCategories() {
    return { ...this.categories };
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
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * 記事の統計情報を取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    const stats = {
      total: this.articles.length,
      published: 0,
      draft: 0,
      archived: 0,
      totalViews: 0,
      categories: {},
      recentArticles: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    this.articles.forEach(article => {
      // ステータス別カウント
      stats[article.status] = (stats[article.status] || 0) + 1;
      
      // 総閲覧数
      stats.totalViews += article.views || 0;
      
      // カテゴリ別カウント
      stats.categories[article.category] = (stats.categories[article.category] || 0) + 1;
      
      // 最近の記事
      if (new Date(article.createdAt) > oneWeekAgo) {
        stats.recentArticles++;
      }
    });

    return stats;
  }

  /**
   * データをエクスポート
   * @returns {Object} エクスポートデータ
   */
  exportData() {
    return {
      articles: this.articles,
      content: this.content,
      nextId: this.nextId,
      categories: this.categories,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * データをインポート
   * @param {Object} data - インポートデータ
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async importData(data) {
    try {
      if (!data || !Array.isArray(data.articles)) {
        throw new Error('Invalid import data format');
      }

      this.articles = data.articles;
      this.content = data.content || {};
      this.nextId = data.nextId || (Math.max(...this.articles.map(a => a.id), 0) + 1);

      const saved = await this.saveArticles();
      if (saved) {
        this.dispatchEvent('articles:imported', { count: this.articles.length });
      }

      return saved;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  /**
   * カスタムイベントを発火
   * @param {string} eventName - イベント名
   * @param {Object} detail - イベント詳細
   */
  dispatchEvent(eventName, detail = {}) {
    if (typeof window !== 'undefined' && window.document) {
      const event = new CustomEvent(eventName, { detail });
      document.dispatchEvent(event);
    }
  }

  /**
   * サービスの状態をリセット
   */
  reset() {
    this.articles = [];
    this.content = {};
    this.nextId = 1;
    this.isLoaded = false;
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArticleService;
} else if (typeof window !== 'undefined') {
  window.ArticleService = ArticleService;
} 