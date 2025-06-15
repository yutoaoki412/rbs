/**
 * 管理画面 Instagram投稿管理 Supabaseサービス
 * schema.sql完全準拠版
 * @version 1.0.0
 */

import { SupabaseService } from '../../../shared/services/SupabaseService.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { requireAdminUser } from '../../../shared/utils/adminAuth.js';

export class AdminInstagramSupabaseService extends SupabaseService {
  constructor() {
    super('instagram_posts', 'AdminInstagramSupabaseService');
    
    // キャッシュ管理
    this.postsCache = new Map();
    this.cacheExpiry = CONFIG.database.cache.instagram;
    this.lastCacheUpdate = null;
    
    // 設定
    this.config = CONFIG.instagram;
  }

  /**
   * 全Instagram投稿を取得（管理画面用）
   * @param {Object} options - 取得オプション
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getAllPosts(options = {}) {
    try {
      const {
        visible = null,
        limit = null,
        offset = 0,
        useCache = true
      } = options;

      this.debug('Instagram投稿取得開始', { visible, limit, offset });

      // キャッシュチェック
      if (useCache && !visible && this.isCacheValid()) {
        const cached = this.filterPostsFromCache(options);
        this.debug(`キャッシュからInstagram投稿取得: ${cached.length}件`);
        return { success: true, data: cached };
      }

      // フィルター構築（schema.sql準拠）
      const filters = {};
      if (visible !== null) {
        filters.visible = visible;
      }

      // ソート設定（schema.sql準拠: display_order -> created_at）
      const orderBy = [
        { column: 'display_order', ascending: true },
        { column: 'created_at', ascending: false }
      ];

      const { data, error } = await this.select({
        filters,
        orderBy,
        limit,
        offset
      });

      if (error) {
        this.error('Instagram投稿取得エラー:', error);
        return {
          success: false,
          error: `Instagram投稿の取得に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュ更新
      if (!visible) {
        this.updateCache(data);
      }

      this.debug(`Instagram投稿取得完了: ${data?.length || 0}件`);
      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      this.error('Instagram投稿取得処理エラー:', error);
      return {
        success: false,
        error: `Instagram投稿の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 表示中のInstagram投稿を取得（公開用）
   * @param {number} limit - 取得件数
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getVisiblePosts(limit = this.config.display.defaultCount) {
    try {
      this.debug('表示中Instagram投稿取得開始', { limit });

      const { data, error } = await this.select({
        filters: { visible: true },
        orderBy: [
          { column: 'display_order', ascending: true },
          { column: 'created_at', ascending: false }
        ],
        limit
      });

      if (error) {
        this.error('表示中Instagram投稿取得エラー:', error);
        return {
          success: false,
          error: `表示中Instagram投稿の取得に失敗しました: ${error.message || error}`
        };
      }

      this.debug(`表示中Instagram投稿取得完了: ${data?.length || 0}件`);
      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      this.error('表示中Instagram投稿取得処理エラー:', error);
      return {
        success: false,
        error: `表示中Instagram投稿の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * Instagram投稿を作成
   * @param {Object} postData - 投稿データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createPost(postData) {
    try {
      this.debug('Instagram投稿作成開始:', postData.url);

      // バリデーション
      const validation = this.validatePost(postData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `バリデーションエラー: ${validation.errors.join(', ')}`
        };
      }

      // データ正規化（schema.sql準拠）
      const normalizedData = this.normalizePostData(postData, true);

      const { data, error } = await this.insert(normalizedData);

      if (error) {
        this.error('Instagram投稿作成エラー:', error);
        return {
          success: false,
          error: `Instagram投稿の作成に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発火
      EventBus.emit('instagram:postCreated', { post: data[0] });

      this.debug('Instagram投稿作成完了:', data[0].id);
      return {
        success: true,
        data: data[0]
      };

    } catch (error) {
      this.error('Instagram投稿作成処理エラー:', error);
      return {
        success: false,
        error: `Instagram投稿の作成中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * Instagram投稿を更新
   * @param {string} postId - 投稿ID
   * @param {Object} updateData - 更新データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async updatePost(postId, updateData) {
    try {
      this.debug('Instagram投稿更新開始:', postId);

      if (!postId) {
        return {
          success: false,
          error: '投稿IDが指定されていません'
        };
      }

      // バリデーション
      const validation = this.validatePost(updateData, false);
      if (!validation.isValid) {
        return {
          success: false,
          error: `バリデーションエラー: ${validation.errors.join(', ')}`
        };
      }

      // データ正規化（schema.sql準拠）
      const normalizedData = this.normalizePostData(updateData, false);

      const { data, error } = await this.update(postId, normalizedData);

      if (error) {
        this.error('Instagram投稿更新エラー:', error);
        return {
          success: false,
          error: `Instagram投稿の更新に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発火
      EventBus.emit('instagram:postUpdated', { post: data[0] });

      this.debug('Instagram投稿更新完了:', postId);
      return {
        success: true,
        data: data[0]
      };

    } catch (error) {
      this.error('Instagram投稿更新処理エラー:', error);
      return {
        success: false,
        error: `Instagram投稿の更新中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * Instagram投稿を削除
   * @param {string} postId - 投稿ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deletePost(postId) {
    try {
      this.debug('Instagram投稿削除開始:', postId);

      if (!postId) {
        return {
          success: false,
          error: '投稿IDが指定されていません'
        };
      }

      const { error } = await this.delete(postId);

      if (error) {
        this.error('Instagram投稿削除エラー:', error);
        return {
          success: false,
          error: `Instagram投稿の削除に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発火
      EventBus.emit('instagram:postDeleted', { postId });

      this.debug('Instagram投稿削除完了:', postId);
      return {
        success: true
      };

    } catch (error) {
      this.error('Instagram投稿削除処理エラー:', error);
      return {
        success: false,
        error: `Instagram投稿の削除中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 表示順序を更新
   * @param {Array} orderUpdates - 順序更新データ [{id, display_order}, ...]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateDisplayOrder(orderUpdates) {
    try {
      this.debug('表示順序更新開始:', orderUpdates.length);

      if (!Array.isArray(orderUpdates) || orderUpdates.length === 0) {
        return {
          success: false,
          error: '更新データが無効です'
        };
      }

      // 一括更新処理
      const updatePromises = orderUpdates.map(({ id, display_order }) => 
        this.update(id, { display_order })
      );

      const results = await Promise.all(updatePromises);

      // エラーチェック
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        this.error('表示順序更新エラー:', errors);
        return {
          success: false,
          error: `表示順序の更新に失敗しました: ${errors[0].error.message || errors[0].error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発火
      EventBus.emit('instagram:orderUpdated', { updates: orderUpdates });

      this.debug('表示順序更新完了');
      return {
        success: true
      };

    } catch (error) {
      this.error('表示順序更新処理エラー:', error);
      return {
        success: false,
        error: `表示順序の更新中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * Instagram投稿統計を取得
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getPostStats() {
    try {
      this.debug('Instagram投稿統計取得開始');

      // 全投稿数
      const { data: allPosts, error: allError } = await this.select({});
      if (allError) throw allError;

      // 表示中投稿数
      const { data: visiblePosts, error: visibleError } = await this.select({
        filters: { visible: true }
      });
      if (visibleError) throw visibleError;

      const stats = {
        total: allPosts?.length || 0,
        visible: visiblePosts?.length || 0,
        hidden: (allPosts?.length || 0) - (visiblePosts?.length || 0)
      };

      this.debug('Instagram投稿統計取得完了:', stats);
      return {
        success: true,
        data: stats
      };

    } catch (error) {
      this.error('Instagram投稿統計取得エラー:', error);
      return {
        success: false,
        error: `Instagram投稿統計の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 投稿データを正規化（schema.sql準拠）
   * @param {Object} data - 投稿データ
   * @param {boolean} isNew - 新規作成かどうか
   * @returns {Object} 正規化されたデータ
   */
  normalizePostData(data, isNew = false) {
    const normalized = {
      url: data.url?.trim() || '',
      embed_code: data.embed_code?.trim() || data.embedCode?.trim() || '',
      caption: data.caption?.trim() || '',
      visible: data.visible !== undefined ? Boolean(data.visible) : true,
      display_order: data.display_order !== undefined ? Number(data.display_order) : 0
    };

    // 新規作成時のデフォルト値
    if (isNew) {
      normalized.visible = normalized.visible !== false;
      normalized.display_order = normalized.display_order || 0;
    }

    return normalized;
  }

  /**
   * 投稿データをバリデーション
   * @param {Object} data - 投稿データ
   * @param {boolean} isRequired - 必須チェックするかどうか
   * @returns {Object} バリデーション結果
   */
  validatePost(data, isRequired = true) {
    const errors = [];

    if (isRequired) {
      if (!data.url?.trim()) {
        errors.push('URLは必須です');
      }
      if (!data.embed_code?.trim() && !data.embedCode?.trim()) {
        errors.push('埋め込みコードは必須です');
      }
    }

    // URL形式チェック
    if (data.url && !this.config.validation.urlPattern.test(data.url)) {
      errors.push('有効なInstagram URLを入力してください');
    }

    // 埋め込みコード形式チェック
    const embedCode = data.embed_code || data.embedCode;
    if (embedCode && !this.config.validation.embedPattern.test(embedCode)) {
      errors.push('有効なInstagram埋め込みコードを入力してください');
    }

    // 文字数制限チェック
    if (embedCode && embedCode.length > this.config.limits.embedCodeMaxLength) {
      errors.push(`埋め込みコードは${this.config.limits.embedCodeMaxLength}文字以内で入力してください`);
    }

    if (data.caption && data.caption.length > this.config.limits.captionMaxLength) {
      errors.push(`キャプションは${this.config.limits.captionMaxLength}文字以内で入力してください`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * キャッシュ有効性確認
   * @returns {boolean}
   */
  isCacheValid() {
    return this.lastCacheUpdate && 
           (Date.now() - this.lastCacheUpdate) < this.cacheExpiry;
  }

  /**
   * キャッシュ更新
   * @param {Array} posts - 投稿配列
   */
  updateCache(posts) {
    this.postsCache.clear();
    posts.forEach(post => {
      this.postsCache.set(post.id, post);
    });
    this.lastCacheUpdate = Date.now();
    this.debug(`キャッシュ更新: ${posts.length}件`);
  }

  /**
   * キャッシュから投稿をフィルタリング
   * @param {Object} options - フィルターオプション
   * @returns {Array} フィルタリングされた投稿配列
   */
  filterPostsFromCache(options) {
    const { visible, limit, offset = 0 } = options;
    let posts = Array.from(this.postsCache.values());

    // フィルタリング
    if (visible !== null) {
      posts = posts.filter(post => post.visible === visible);
    }

    // ソート
    posts.sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // ページネーション
    if (limit) {
      posts = posts.slice(offset, offset + limit);
    }

    return posts;
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.postsCache.clear();
    this.lastCacheUpdate = null;
    this.debug('キャッシュクリア完了');
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.clearCache();
    super.destroy();
    this.debug('AdminInstagramSupabaseService破棄完了');
  }
}

// シングルトンインスタンス
let adminInstagramSupabaseServiceInstance = null;

/**
 * AdminInstagramSupabaseServiceのシングルトンインスタンスを取得
 * @returns {AdminInstagramSupabaseService}
 */
export function getAdminInstagramSupabaseService() {
  if (!adminInstagramSupabaseServiceInstance) {
    adminInstagramSupabaseServiceInstance = new AdminInstagramSupabaseService();
  }
  return adminInstagramSupabaseServiceInstance;
} 