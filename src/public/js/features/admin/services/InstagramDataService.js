/**
 * Instagram データ管理サービス
 * Instagram投稿データの管理とLPサイトとの同期を担当
 * @version 2.0.0
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { randomString } from '../../../shared/utils/stringUtils.js';
import { isValidDate } from '../../../shared/utils/dateUtils.js';

export class InstagramDataService {
  constructor() {
    this.initialized = false;
    
    // ストレージキー
    this.storageKeys = {
      instagram: 'rbs_instagram_posts'
    };
    
    // データ格納
    this.posts = [];
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
      console.log('⚠️ InstagramDataService: 既に初期化済み');
      return;
    }

    console.log('📷 InstagramDataService: 初期化開始');
    
    this.loadPosts();
    this.setupAutoSave();
    
    this.initialized = true;
    console.log('✅ InstagramDataService: 初期化完了');
  }

  /**
   * Instagram投稿データの読み込み
   */
  loadPosts() {
    try {
      const data = localStorage.getItem(this.storageKeys.instagram);
      this.posts = data ? JSON.parse(data) : [];
      
      // データの整合性チェック
      this.posts = this.posts.filter(post => 
        post && 
        typeof post === 'object' && 
        post.id &&
        post.createdAt &&
        post.url
      );
      
      EventBus.emit('instagram:loaded', { count: this.posts.length });
      console.log(`📷 Instagram投稿データを読み込み: ${this.posts.length}件`);
      
      return this.posts;
    } catch (error) {
      console.error('❌ Instagram投稿データの読み込みに失敗:', error);
      this.posts = [];
      return [];
    }
  }

  /**
   * Instagram投稿を保存
   * @param {Object} postData - 投稿データ
   * @returns {Promise<{success: boolean, id?: string, message?: string}>}
   */
  async savePost(postData) {
    try {
      console.log('📷 Instagram投稿保存開始:', { url: postData.url });
      
      // バリデーション
      const validation = this.validatePost(postData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `入力エラー: ${validation.errors.join(', ')}`
        };
      }

      const now = new Date();
      let post;
      
      if (postData.id) {
        // 既存投稿の更新
        const index = this.posts.findIndex(p => p.id === postData.id);
        if (index === -1) {
          return {
            success: false,
            message: '投稿が見つかりませんでした'
          };
        }
        
        post = {
          ...this.posts[index],
          ...postData,
          updatedAt: now.toISOString()
        };
        
        this.posts[index] = post;
      } else {
        // 新規投稿の作成
        post = {
          ...postData,
          id: this.generateId(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          likes: 0,
          comments: 0
        };
        
        this.posts.unshift(post); // 新しい投稿を先頭に追加
      }

      // ローカルストレージに保存
      await this.saveToStorage();
      
      this.markAsSaved();
      
      EventBus.emit('instagram:saved', { 
        post, 
        isNew: !postData.id 
      });
      
      console.log('✅ Instagram投稿保存完了:', { id: post.id });
      
      return {
        success: true,
        id: post.id,
        message: 'Instagram投稿を保存しました'
      };
      
    } catch (error) {
      console.error('❌ Instagram投稿保存エラー:', error);
      return {
        success: false,
        message: 'Instagram投稿の保存に失敗しました'
      };
    }
  }

  /**
   * Instagram投稿を削除
   * @param {string} id - 投稿ID
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async deletePost(id) {
    try {
      const index = this.posts.findIndex(p => p.id === id);
      
      if (index === -1) {
        return {
          success: false,
          message: '投稿が見つかりませんでした'
        };
      }
      
      const post = this.posts[index];
      this.posts.splice(index, 1);
      
      await this.saveToStorage();
      
      EventBus.emit('instagram:deleted', { post });
      
      console.log('🗑️ Instagram投稿削除完了:', { id, url: post.url });
      
      return {
        success: true,
        message: 'Instagram投稿を削除しました'
      };
      
    } catch (error) {
      console.error('❌ Instagram投稿削除エラー:', error);
      return {
        success: false,
        message: 'Instagram投稿の削除に失敗しました'
      };
    }
  }

  /**
   * Instagram投稿を取得
   * @param {Object} filter - フィルター条件
   * @returns {Array}
   */
  getPosts(filter = {}) {
    let result = [...this.posts];
    
    // フィルタリング
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      result = result.filter(post => 
        post.caption?.toLowerCase().includes(searchTerm) ||
        post.hashtags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    if (filter.dateFrom) {
      result = result.filter(post => new Date(post.createdAt) >= new Date(filter.dateFrom));
    }
    
    if (filter.dateTo) {
      result = result.filter(post => new Date(post.createdAt) <= new Date(filter.dateTo));
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
      // デフォルトは作成日時の降順
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // ページネーション
    if (filter.limit) {
      const start = (filter.page || 0) * filter.limit;
      result = result.slice(start, start + filter.limit);
    }
    
    return result;
  }

  /**
   * Instagram投稿を取得（ID指定）
   * @param {string} id - 投稿ID
   * @returns {Object|null}
   */
  getPostById(id) {
    return this.posts.find(post => post.id === id) || null;
  }

  /**
   * Instagram投稿のバリデーション
   * @param {Object} data - 投稿データ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validatePost(data) {
    const errors = [];
    
    if (!data.url || data.url.trim().length === 0) {
      errors.push('Instagram URLは必須です');
    } else if (!this.isValidInstagramUrl(data.url)) {
      errors.push('有効なInstagram URLを入力してください');
    }
    
    if (data.caption && data.caption.length > 2200) {
      errors.push('キャプションは2200文字以内で入力してください');
    }
    
    if (data.hashtags && Array.isArray(data.hashtags)) {
      if (data.hashtags.length > 30) {
        errors.push('ハッシュタグは30個以内で設定してください');
      }
    }
    
    if (data.postedAt && !isValidDate(data.postedAt)) {
      errors.push('投稿日時の形式が正しくありません');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Instagram URLの有効性チェック
   * @param {string} url - チェックするURL
   * @returns {boolean}
   */
  isValidInstagramUrl(url) {
    const instagramPattern = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?(\?.*)?$/;
    return instagramPattern.test(url);
  }

  /**
   * ストレージに保存
   * @private
   */
  async saveToStorage() {
    try {
      localStorage.setItem(this.storageKeys.instagram, JSON.stringify(this.posts));
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
        console.log('💾 Instagram投稿データ自動保存完了');
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
    this.unsavedChanges.add('instagram');
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
    const total = this.posts.length;
    const totalLikes = this.posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = this.posts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const avgLikes = total > 0 ? Math.round(totalLikes / total) : 0;
    const avgComments = total > 0 ? Math.round(totalComments / total) : 0;
    
    return {
      total,
      totalLikes,
      totalComments,
      avgLikes,
      avgComments
    };
  }

  /**
   * データをエクスポート
   * @returns {Object}
   */
  exportData() {
    return {
      posts: this.posts,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };
  }

  /**
   * 全Instagramデータクリア
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async clearAllData() {
    try {
      this.log('全Instagramデータクリア開始');
      
      // メモリからデータクリア
      this.posts = [];
      
      // ストレージからデータクリア
      localStorage.removeItem(this.storageKeys.instagram);
      
      this.lastSaved = null;
      this.unsavedChanges.clear();
      
      EventBus.emit('instagram:allCleared');
      
      this.log('全Instagramデータクリア完了');
      
      return {
        success: true,
        message: '全てのInstagramデータを削除しました'
      };
      
    } catch (error) {
      this.error('全データクリアエラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ID生成
   * @private
   * @returns {string}
   */
  generateId() {
    const timestamp = Date.now().toString(36);
    const random = randomString(6);
    return `instagram_${timestamp}_${random}`;
  }

  /**
   * 破棄処理
   */
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    this.posts = [];
    this.unsavedChanges.clear();
    this.initialized = false;
    
    console.log('🗑️ InstagramDataService: 破棄完了');
  }

  // === ログメソッド ===

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log('📸 InstagramDataService:', ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug?.enabled) {
      console.debug('🔍 InstagramDataService:', ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn('⚠️ InstagramDataService:', ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error('❌ InstagramDataService:', ...args);
  }
}

// シングルトンインスタンス
export const instagramDataService = new InstagramDataService(); 