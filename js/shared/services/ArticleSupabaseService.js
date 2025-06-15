/**
 * 記事管理 Supabaseサービス
 * LocalStorageベースのArticleStorageServiceをSupabaseに移行
 * schema.sql完全準拠版（統合ID管理）
 * @version 2.0.0
 */

import { SupabaseService } from './SupabaseService.js';
import { EventBus } from './EventBus.js';
import { CONFIG } from '../constants/config.js';

export class ArticleSupabaseService extends SupabaseService {
  constructor() {
    super('articles', 'ArticleSupabaseService');
    
    // キャッシュ管理
    this.articlesCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分
    this.lastCacheUpdate = null;
    
    // カテゴリー・ステータス定義（CONFIG統一）
    this.categories = CONFIG.articles.categories;
    this.statuses = CONFIG.articles.statuses;
  }

  /**
   * 公開記事を取得（schema.sql準拠）
   * @param {Object} options - 取得オプション
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getPublishedArticles(options = {}) {
    try {
      const {
        category = null,
        limit = null,
        offset = 0,
        featured = null,
        useCache = true
      } = options;

      this.debug('公開記事取得開始', { category, limit, offset, featured });

      // キャッシュチェック（オプションが基本設定の場合のみ）
      if (useCache && !category && !featured && this.isCacheValid()) {
        const cached = this.filterArticlesFromCache(options);
        this.debug(`キャッシュから記事取得: ${cached.length}件`);
        return { success: true, data: cached };
      }

      // フィルター構築（schema.sql準拠）
      const filters = { status: 'published' };
      if (category && category !== 'all') {
        filters.category = category;
      }
      if (featured !== null) {
        filters.featured = featured;
      }

      // ソート設定（schema.sql準拠: published_at -> created_at）
      const orderBy = [
        { column: 'featured', ascending: false },
        { column: 'published_at', ascending: false },
        { column: 'created_at', ascending: false }
      ];

      const { data, error } = await this.select({
        filters,
        orderBy,
        limit,
        offset
      });

      if (error) {
        this.error('公開記事取得エラー:', error);
        return {
          success: false,
          error: `公開記事の取得に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュ更新（基本設定の場合のみ）
      if (!category && !featured) {
        this.updateCache(data);
      }

      // 日本時間のdateプロパティを追加
      const articlesWithDate = this.addDateProperties(data || []);

      this.debug(`公開記事取得完了: ${articlesWithDate.length}件`);
      return {
        success: true,
        data: articlesWithDate
      };

    } catch (error) {
      this.error('公開記事取得処理エラー:', error);
      return {
        success: false,
        error: `記事の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事をIDで取得（統合ID管理）
   * @param {string} articleId - 記事ID（UUID）
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getArticleById(articleId) {
    try {
      this.debug('記事個別取得開始:', articleId);

      if (!articleId) {
        return {
          success: false,
          error: '記事IDが指定されていません'
        };
      }

      // UUID形式バリデーション
      if (!this.isValidUUID(articleId)) {
        return {
          success: false,
          error: '無効な記事IDです'
        };
      }

      const { data, error } = await this.select({
        filters: { id: articleId },
        limit: 1
      });

      if (error) {
        this.error('記事個別取得エラー:', error);
        return {
          success: false,
          error: `記事の取得に失敗しました: ${error.message || error}`
        };
      }

      if (!data || data.length === 0) {
        this.debug('記事が見つかりません:', articleId);
        return {
          success: false,
          error: '記事が見つかりません'
        };
      }

      // 日本時間のdateプロパティを追加
      const articleWithDate = this.addDateProperty(data[0]);

      this.debug('記事個別取得完了:', articleWithDate.title);
      return {
        success: true,
        data: articleWithDate
      };

    } catch (error) {
      this.error('記事個別取得処理エラー:', error);
      return {
        success: false,
        error: `記事の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事を作成（schema.sql準拠）
   * @param {Object} articleData - 記事データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createArticle(articleData) {
    try {
      this.debug('記事作成開始:', articleData.title);

      // バリデーション
      const validation = this.validateArticle(articleData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `バリデーションエラー: ${validation.errors.join(', ')}`
        };
      }

      // データ正規化（schema.sql準拠）
      const normalizedData = this.normalizeArticleData(articleData, true);

      const { data, error } = await this.insert(normalizedData);

      if (error) {
        this.error('記事作成エラー:', error);
        return {
          success: false,
          error: `記事の作成に失敗しました: ${error.message || error}`
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: '記事の作成に失敗しました（データが返されませんでした）'
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発行（統合ID管理対応）
      EventBus.emit('article:created', {
        articleId: data[0].id,
        article: data[0],
        timestamp: new Date().toISOString()
      });

      this.debug('記事作成完了:', data[0].id);

      return {
        success: true,
        data: data[0]
      };

    } catch (error) {
      this.error('記事作成処理エラー:', error);
      return {
        success: false,
        error: `記事の作成中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事を更新（統合ID管理）
   * @param {string} articleId - 記事ID
   * @param {Object} updateData - 更新データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async updateArticle(articleId, updateData) {
    try {
      this.debug('記事更新開始:', articleId);

      // 既存記事の確認
      const existingResult = await this.getArticleById(articleId);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: existingResult.error || '更新対象の記事が見つかりません'
        };
      }

      const existingArticle = existingResult.data;

      // バリデーション
      const mergedData = { ...existingArticle, ...updateData };
      const validation = this.validateArticle(mergedData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `バリデーションエラー: ${validation.errors.join(', ')}`
        };
      }

      // データ正規化（schema.sql準拠）
      const normalizedData = this.normalizeArticleData(updateData, false);

      const { data, error } = await this.update(normalizedData, { id: articleId });

      if (error) {
        this.error('記事更新エラー:', error);
        return {
          success: false,
          error: `記事の更新に失敗しました: ${error.message || error}`
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: '記事の更新に失敗しました（データが返されませんでした）'
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発行（統合ID管理対応）
      EventBus.emit('article:updated', {
        articleId: data[0].id,
        article: data[0],
        previousData: existingArticle,
        timestamp: new Date().toISOString()
      });

      // 公開状態変更の場合は専用イベントも発行
      if (existingArticle.status !== data[0].status && data[0].status === 'published') {
        EventBus.emit('article:published', {
          articleId: data[0].id,
          article: data[0],
          timestamp: new Date().toISOString()
        });
      }

      this.debug('記事更新完了:', data[0].id);

      return {
        success: true,
        data: data[0]
      };

    } catch (error) {
      this.error('記事更新処理エラー:', error);
      return {
        success: false,
        error: `記事の更新中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事を削除（統合ID管理）
   * @param {string} articleId - 記事ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteArticle(articleId) {
    try {
      this.debug('記事削除開始:', articleId);

      // 既存記事の確認
      const existingResult = await this.getArticleById(articleId);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: existingResult.error || '削除対象の記事が見つかりません'
        };
      }

      const { error } = await this.delete({ id: articleId });

      if (error) {
        this.error('記事削除エラー:', error);
        return {
          success: false,
          error: `記事の削除に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発行（統合ID管理対応）
      EventBus.emit('article:deleted', {
        articleId: articleId,
        article: existingResult.data,
        timestamp: new Date().toISOString()
      });

      this.debug('記事削除完了:', articleId);

      return {
        success: true
      };

    } catch (error) {
      this.error('記事削除処理エラー:', error);
      return {
        success: false,
        error: `記事の削除中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 関連記事を取得（統合ID管理）
   * @param {string} currentArticleId - 現在の記事ID
   * @param {number} limit - 取得件数
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getRelatedArticles(currentArticleId, limit = 3) {
    try {
      this.debug('関連記事取得開始:', currentArticleId);

      const currentResult = await this.getArticleById(currentArticleId);
      if (!currentResult.success || !currentResult.data) {
        return {
          success: false,
          error: '現在の記事が見つかりません'
        };
      }

      const currentArticle = currentResult.data;

      // 同カテゴリーの記事を優先取得
      const sameCategoryResult = await this.getPublishedArticles({
        category: currentArticle.category,
        limit: limit * 2 // 多めに取得して後でフィルター
      });

      if (!sameCategoryResult.success) {
        return sameCategoryResult;
      }

      // 現在の記事を除外
      const filteredSameCategory = sameCategoryResult.data
        .filter(article => article.id !== currentArticleId)
        .slice(0, limit);

      // 足りない場合は他カテゴリーから補完
      if (filteredSameCategory.length < limit) {
        const remainingCount = limit - filteredSameCategory.length;
        const otherResult = await this.getPublishedArticles({
          limit: remainingCount * 2
        });

        if (otherResult.success) {
          const filteredOthers = otherResult.data
            .filter(article => 
              article.id !== currentArticleId && 
              article.category !== currentArticle.category &&
              !filteredSameCategory.some(a => a.id === article.id)
            )
            .slice(0, remainingCount);

          const finalResult = [...filteredSameCategory, ...filteredOthers];
          this.debug(`関連記事取得完了: ${finalResult.length}件`);
          
          return {
            success: true,
            data: finalResult
          };
        }
      }

      this.debug(`関連記事取得完了: ${filteredSameCategory.length}件`);
      return {
        success: true,
        data: filteredSameCategory
      };

    } catch (error) {
      this.error('関連記事取得処理エラー:', error);
      return {
        success: false,
        error: `関連記事の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事統計を取得（schema.sql統計関数使用）
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getArticleStats() {
    try {
      this.debug('記事統計取得開始');

      // schema.sqlの統計関数を使用
      const { data: statsData, error } = await this.supabase
        .rpc('get_article_stats');

      if (error) {
        this.error('記事統計取得エラー:', error);
        // フォールバック: 個別カウント
        return await this.getArticleStatsFallback();
      }

      this.debug('記事統計取得完了:', statsData);
      return {
        success: true,
        data: {
          ...statsData,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.error('記事統計取得処理エラー:', error);
      // フォールバック
      return await this.getArticleStatsFallback();
    }
  }

  /**
   * 記事統計フォールバック（個別カウント）
   */
  async getArticleStatsFallback() {
    try {
      const [total, published, draft, featured] = await Promise.all([
        this.count(),
        this.count({ status: 'published' }),
        this.count({ status: 'draft' }),
        this.count({ featured: true })
      ]);

      return {
        success: true,
        data: {
          total: total.count || 0,
          published: published.count || 0,
          draft: draft.count || 0,
          featured: featured.count || 0,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.error('記事統計フォールバック処理エラー:', error);
      return {
        success: false,
        error: `記事統計の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事データを正規化（schema.sql準拠）
   * @param {Object} data - 生データ
   * @param {boolean} isNew - 新規作成かどうか
   * @returns {Object} 正規化されたデータ
   */
  normalizeArticleData(data, isNew = false) {
    const normalized = {
      title: data.title?.trim() || '',
      content: data.content || '',
      summary: data.summary?.trim() || '',
      category: data.category || 'general',
      status: data.status || 'draft',
      featured: Boolean(data.featured)
    };

    // 公開時の日時設定（schema.sql準拠）
    if (normalized.status === 'published') {
      if (!data.published_at) {
        normalized.published_at = new Date().toISOString();
      } else if (data.published_at) {
        normalized.published_at = data.published_at;
      }
    } else {
      // 下書きの場合はpublished_atをクリア
      normalized.published_at = null;
    }

    return normalized;
  }

  /**
   * 記事データのバリデーション（schema.sql制約準拠）
   * @param {Object} data - バリデーション対象データ
   * @returns {Object} バリデーション結果
   */
  validateArticle(data) {
    const errors = [];

    // title: NOT NULL
    if (!data.title || data.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    }

    if (data.title && data.title.length > 200) {
      errors.push('タイトルは200文字以内で入力してください');
    }

    // summary: 制限なしだが実用的な制限
    if (data.summary && data.summary.length > 500) {
      errors.push('要約は500文字以内で入力してください');
    }

    // category: CHECK制約準拠（スキーマ定義値）
    const validCategories = ['general', 'event', 'notice', 'lesson', 'other'];
    if (data.category && !validCategories.includes(data.category)) {
      errors.push(`無効なカテゴリーです。有効な値: ${validCategories.join(', ')}`);
    }

    // status: CHECK制約準拠（スキーマ定義値）
    const validStatuses = ['draft', 'published'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push(`無効なステータスです。有効な値: ${validStatuses.join(', ')}`);
    }



    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * UUID形式バリデーション
   * @param {string} uuid - UUID文字列
   * @returns {boolean} 有効なUUIDかどうか
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * キャッシュの有効性チェック
   * @returns {boolean} キャッシュが有効かどうか
   */
  isCacheValid() {
    return this.lastCacheUpdate && 
           (Date.now() - this.lastCacheUpdate) < this.cacheExpiry;
  }

  /**
   * キャッシュを更新
   * @param {Array} articles - 記事配列
   */
  updateCache(articles) {
    this.articlesCache.clear();
    articles.forEach(article => {
      this.articlesCache.set(article.id, article);
    });
    this.lastCacheUpdate = Date.now();
    this.debug(`キャッシュ更新: ${articles.length}件`);
  }

  /**
   * キャッシュから記事をフィルタリング
   * @param {Object} options - フィルターオプション
   * @returns {Array} フィルター済み記事配列
   */
  filterArticlesFromCache(options) {
    let articles = Array.from(this.articlesCache.values());

    if (options.category && options.category !== 'all') {
      articles = articles.filter(article => article.category === options.category);
    }

    if (options.featured !== null) {
      articles = articles.filter(article => article.featured === options.featured);
    }

    // ソート適用
    articles.sort((a, b) => {
      // featured優先
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }
      
      // date -> published_at -> created_atでソート
      const aDate = new Date(a.date || a.published_at || a.created_at);
      const bDate = new Date(b.date || b.published_at || b.created_at);
      return bDate - aDate;
    });

    // limit適用
    if (options.limit) {
      articles = articles.slice(options.offset || 0, (options.offset || 0) + options.limit);
    }

    return articles;
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.articlesCache.clear();
    this.lastCacheUpdate = null;
    this.debug('キャッシュクリア完了');
  }

  /**
   * created_atから日本時間の日付を計算
   * @param {string} utcTimestamp - UTC形式のタイムスタンプ
   * @returns {string} YYYY-MM-DD形式の日本時間日付
   */
  getJapanDate(utcTimestamp) {
    if (!utcTimestamp) return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
    
    const date = new Date(utcTimestamp);
    return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  }

  /**
   * 記事データに日本時間のdateプロパティを追加
   * @param {Object} article - 記事データ
   * @returns {Object} dateプロパティ付きの記事データ
   */
  addDateProperty(article) {
    return {
      ...article,
      date: this.getJapanDate(article.created_at)
    };
  }

  /**
   * 記事配列に日本時間のdateプロパティを追加
   * @param {Array} articles - 記事配列
   * @returns {Array} dateプロパティ付きの記事配列
   */
  addDateProperties(articles) {
    return articles.map(article => this.addDateProperty(article));
  }

  /**
   * カテゴリ情報取得（schema.sql準拠）
   * @param {string} categoryId - カテゴリID
   * @returns {Object} カテゴリ情報
   */
  getCategoryInfo(categoryId) {
    return this.categories[categoryId] || this.categories['other'];
  }

  /**
   * 全カテゴリ取得
   * @returns {Object} 全カテゴリ情報
   */
  getAllCategories() {
    return this.categories;
  }

  /**
   * 全ステータス取得
   * @returns {Object} 全ステータス情報
   */
  getAllStatuses() {
    return this.statuses;
  }

  /**
   * サービス破棄
   */
  destroy() {
    // キャッシュクリア
    this.clearCache();
    
    // 親クラスの破棄処理
    super.destroy();
    
    this.debug('ArticleSupabaseService破棄完了');
  }
}

/**
 * ArticleSupabaseServiceのシングルトンインスタンス取得
 */
let articleSupabaseServiceInstance = null;

export function getArticleSupabaseService() {
  if (!articleSupabaseServiceInstance) {
    articleSupabaseServiceInstance = new ArticleSupabaseService();
  }
  return articleSupabaseServiceInstance;
} 