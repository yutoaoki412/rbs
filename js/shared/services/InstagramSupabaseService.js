/**
 * Instagram投稿管理 Supabaseサービス
 * LocalStorageベースのInstagramDataServiceをSupabaseに移行
 * @version 1.0.0
 */

import { SupabaseService } from './SupabaseService.js';
import { EventBus } from './EventBus.js';
import { CONFIG } from '../constants/config.js';

export class InstagramSupabaseService extends SupabaseService {
  constructor() {
    super('instagram_posts', 'InstagramSupabaseService');
    
    // キャッシュ管理
    this.postsCache = new Map();
    this.cacheExpiry = 3 * 60 * 1000; // 3分
    this.lastCacheUpdate = null;
    
    // Instagram URL パターン
    this.instagramUrlPattern = /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/([a-zA-Z0-9_-]+)\/?/;
  }

  /**
   * 表示中のInstagram投稿を取得
   * @param {Object} options - 取得オプション
   * @returns {Promise<Array>} 投稿配列
   */
  async getVisiblePosts(options = {}) {
    try {
      const {
        limit = null,
        useCache = true
      } = options;

      // キャッシュチェック
      if (useCache && this.isCacheValid()) {
        return this.filterPostsFromCache({ visible: true, limit });
      }

      // フィルター構築
      const filters = { visible: true };

      // ソート設定（表示順序、作成日時順）
      const orderBy = [
        { column: 'display_order', ascending: true },
        { column: 'created_at', ascending: false }
      ];

      const { data, error } = await this.select({
        filters,
        orderBy,
        limit
      });

      if (error) {
        this.error('Failed to fetch visible Instagram posts:', error);
        return [];
      }

      // キャッシュ更新
      this.updateCache(data);

      this.log(`Fetched ${data.length} visible Instagram posts`);
      return data;

    } catch (error) {
      this.error('Error in getVisiblePosts:', error);
      return [];
    }
  }

  /**
   * Instagram投稿を作成
   * @param {Object} postData - 投稿データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createPost(postData) {
    try {
      // バリデーション
      const validation = this.validatePost(postData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `バリデーションエラー: ${validation.errors.join(', ')}`
        };
      }

      // データ正規化
      const normalizedData = this.normalizePostData(postData, true);

      const { data, error } = await this.insert(normalizedData);

      if (error) {
        return {
          success: false,
          error: `Instagram投稿の作成に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発行
      EventBus.emit('instagram:created', {
        post: data[0],
        timestamp: new Date().toISOString()
      });

      this.log('Instagram post created successfully:', data[0].id);

      return {
        success: true,
        data: data[0]
      };

    } catch (error) {
      this.error('Error in createPost:', error);
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
      // 既存投稿の確認
      const existingPost = await this.getPostById(postId);
      if (!existingPost) {
        return {
          success: false,
          error: '更新対象の投稿が見つかりません'
        };
      }

      // バリデーション（URLが変更される場合のみ）
      if (updateData.url && updateData.url !== existingPost.url) {
        const validation = this.validatePost({ ...existingPost, ...updateData });
        if (!validation.isValid) {
          return {
            success: false,
            error: `バリデーションエラー: ${validation.errors.join(', ')}`
          };
        }
      }

      // データ正規化
      const normalizedData = this.normalizePostData(updateData, false);

      const { data, error } = await this.update(normalizedData, { id: postId });

      if (error) {
        return {
          success: false,
          error: `Instagram投稿の更新に失敗しました: ${error.message || error}`
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Instagram投稿の更新に失敗しました（データが返されませんでした）'
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発行
      EventBus.emit('instagram:updated', {
        post: data[0],
        previousData: existingPost,
        timestamp: new Date().toISOString()
      });

      this.log('Instagram post updated successfully:', data[0].id);

      return {
        success: true,
        data: data[0]
      };

    } catch (error) {
      this.error('Error in updatePost:', error);
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
      // 削除前に投稿を取得（イベント用）
      const existingPost = await this.getPostById(postId);
      if (!existingPost) {
        return {
          success: false,
          error: '削除対象の投稿が見つかりません'
        };
      }

      const { data, error } = await this.delete({ id: postId });

      if (error) {
        return {
          success: false,
          error: `Instagram投稿の削除に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発行
      EventBus.emit('instagram:deleted', {
        post: existingPost,
        timestamp: new Date().toISOString()
      });

      this.log('Instagram post deleted successfully:', postId);

      return { success: true };

    } catch (error) {
      this.error('Error in deletePost:', error);
      return {
        success: false,
        error: `Instagram投稿の削除中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * Instagram投稿をIDで取得
   * @param {string} postId - 投稿ID
   * @returns {Promise<Object|null>} 投稿データ
   */
  async getPostById(postId) {
    try {
      const { data, error } = await this.select({
        filters: { id: postId },
        limit: 1
      });

      if (error) {
        this.error('Failed to fetch Instagram post by ID:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;

    } catch (error) {
      this.error('Error in getPostById:', error);
      return null;
    }
  }

  /**
   * 投稿の表示/非表示を切り替え
   * @param {string} postId - 投稿ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async togglePostVisibility(postId) {
    try {
      const existingPost = await this.getPostById(postId);
      if (!existingPost) {
        return {
          success: false,
          error: '対象の投稿が見つかりません'
        };
      }

      const newVisibility = !existingPost.visible;
      
      return await this.updatePost(postId, { visible: newVisibility });

    } catch (error) {
      this.error('Error in togglePostVisibility:', error);
      return {
        success: false,
        error: `表示状態の切り替え中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 表示順序を更新
   * @param {Array} orderData - 順序データ [{ id, display_order }]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateDisplayOrder(orderData) {
    try {
      const updatePromises = orderData.map(({ id, display_order }) =>
        this.updatePost(id, { display_order })
      );

      const results = await Promise.all(updatePromises);
      
      const hasError = results.some(result => !result.success);
      if (hasError) {
        const errors = results
          .filter(result => !result.success)
          .map(result => result.error);
        
        return {
          success: false,
          error: `表示順序の更新に失敗しました: ${errors.join(', ')}`
        };
      }

      // イベント発行
      EventBus.emit('instagram:order-updated', {
        orderData,
        timestamp: new Date().toISOString()
      });

      this.log('Instagram posts display order updated successfully');

      return { success: true };

    } catch (error) {
      this.error('Error in updateDisplayOrder:', error);
      return {
        success: false,
        error: `表示順序の更新中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * Instagram投稿統計を取得
   * @returns {Promise<Object>} 統計情報
   */
  async getInstagramStats() {
    try {
      const [total, visible, hidden] = await Promise.all([
        this.count(),
        this.count({ visible: true }),
        this.count({ visible: false })
      ]);

      return {
        total: total.count,
        visible: visible.count,
        hidden: hidden.count,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.error('Error in getInstagramStats:', error);
      return {
        total: 0,
        visible: 0,
        hidden: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 投稿データを正規化
   * @param {Object} data - 生データ
   * @param {boolean} isNew - 新規作成かどうか
   * @returns {Object} 正規化されたデータ
   */
  normalizePostData(data, isNew = false) {
    const normalized = {
      url: data.url?.trim() || '',
      embed_code: data.embed_code || data.embedCode || '',
      caption: data.caption?.trim() || '',
      visible: Boolean(data.visible ?? true),
      display_order: parseInt(data.display_order || data.displayOrder || 0, 10)
    };

    // 新規作成時はembed_codeを自動生成
    if (isNew && normalized.url && !normalized.embed_code) {
      normalized.embed_code = this.generateEmbedCode(normalized.url);
    }

    return normalized;
  }

  /**
   * 投稿データのバリデーション
   * @param {Object} data - バリデーション対象データ
   * @returns {Object} バリデーション結果
   */
  validatePost(data) {
    const errors = [];

    if (!data.url || data.url.trim().length === 0) {
      errors.push('Instagram URLは必須です');
    } else if (!this.instagramUrlPattern.test(data.url)) {
      errors.push('有効なInstagram URLを入力してください');
    }

    if (data.caption && data.caption.length > 1000) {
      errors.push('キャプションは1000文字以内で入力してください');
    }

    if (data.display_order !== undefined && 
        (isNaN(data.display_order) || data.display_order < 0)) {
      errors.push('表示順序は0以上の数値を入力してください');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Instagram URLからEmbed Codeを生成
   * @param {string} url - Instagram URL
   * @returns {string} Embed Code
   */
  generateEmbedCode(url) {
    try {
      const match = url.match(this.instagramUrlPattern);
      if (!match) {
        throw new Error('Invalid Instagram URL');
      }

      const postId = match[3];
      const type = match[2]; // 'p' or 'reel'
      
      return `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"></blockquote>`;

    } catch (error) {
      this.error('Error generating embed code:', error);
      return '';
    }
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
   * @param {Array} posts - 投稿配列
   */
  updateCache(posts) {
    this.postsCache.clear();
    posts.forEach(post => {
      this.postsCache.set(post.id, post);
    });
    this.lastCacheUpdate = Date.now();
  }

  /**
   * キャッシュから投稿をフィルタリング
   * @param {Object} options - フィルターオプション
   * @returns {Array} フィルター済み投稿配列
   */
  filterPostsFromCache(options) {
    let posts = Array.from(this.postsCache.values());

    if (options.visible !== undefined) {
      posts = posts.filter(post => post.visible === options.visible);
    }

    // ソート（表示順序、作成日時順）
    posts.sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA;
    });

    if (options.limit) {
      posts = posts.slice(0, options.limit);
    }

    return posts;
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.postsCache.clear();
    this.lastCacheUpdate = null;
    this.log('Instagram posts cache cleared');
  }

  /**
   * 全投稿を取得（管理画面用）
   * @param {Object} options - 取得オプション
   * @returns {Promise<Array>} 投稿配列
   */
  async getAllPosts(options = {}) {
    try {
      const {
        visible = null,
        limit = null,
        useCache = false // 管理画面ではキャッシュを使わない
      } = options;

      const filters = {};
      if (visible !== null) {
        filters.visible = visible;
      }

      const orderBy = [
        { column: 'display_order', ascending: true },
        { column: 'created_at', ascending: false }
      ];

      const { data, error } = await this.select({
        filters,
        orderBy,
        limit
      });

      if (error) {
        this.error('Failed to fetch all Instagram posts:', error);
        return [];
      }

      this.log(`Fetched ${data.length} Instagram posts for admin`);
      return data;

    } catch (error) {
      this.error('Error in getAllPosts:', error);
      return [];
    }
  }

  /**
   * サービス破棄時の処理
   */
  destroy() {
    this.clearCache();
    super.destroy();
  }
}

// シングルトンインスタンス
let instagramSupabaseServiceInstance = null;

/**
 * InstagramSupabaseServiceのシングルトンインスタンスを取得
 * @returns {InstagramSupabaseService}
 */
export function getInstagramSupabaseService() {
  if (!instagramSupabaseServiceInstance) {
    instagramSupabaseServiceInstance = new InstagramSupabaseService();
  }
  return instagramSupabaseServiceInstance;
} 