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
    this.serviceName = 'InstagramDataService';
    this.initialized = false;
    
    // ストレージキー（最適化版CONFIG対応）
    this.storageKeys = {
      posts: CONFIG.storage.keys.instagram,  // 統一されたキー
      settings: CONFIG.storage.keys.settings,
      backup: CONFIG.storage.keys.cache
    };
    
    // データ格納
    this.posts = [];
    this.unsavedChanges = new Set();
    this.lastSaved = null;
    
    // 自動保存間隔（最適化版設定から取得）
    this.autoSaveInterval = null;
    this.autoSaveDelay = CONFIG.storage.autoSave || 30000;
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
      const data = localStorage.getItem(this.storageKeys.posts);
      this.posts = data ? JSON.parse(data) : [];
      
      // データの整合性チェック（最適化版）
      this.posts = this.validateAndRepairPosts(this.posts);
      
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
   * 投稿データの検証と修復（新バージョン最適化）
   * @param {Array} posts - 投稿データ配列
   * @returns {Array} 修復された投稿データ
   */
  validateAndRepairPosts(posts) {
    if (!Array.isArray(posts)) {
      console.warn('🔧 Instagram投稿データが配列ではありません。空配列で初期化します。');
      return [];
    }

    const requiredFields = CONFIG.instagram.schema.required;
    const defaults = CONFIG.instagram.schema.defaults;
    
    return posts.filter(post => {
      if (!post || typeof post !== 'object') {
        if (CONFIG.instagram.data.integrity.logErrors) {
          console.warn('🔧 無効な投稿データを除外:', post);
        }
        return false;
      }

      // 必須フィールドチェック（最適化版）
      const missingFields = requiredFields.filter(field => !post[field]);
      if (missingFields.length > 0) {
        if (missingFields.includes('createdAt') && post.id && post.embedCode) {
          // 基本情報があればcreatedAtを自動補完
          post.createdAt = new Date().toISOString();
          console.warn('🔧 createdAtを自動補完:', post.id);
        } else {
          console.warn('🔧 必須フィールドが不足している投稿を除外:', { id: post.id, missing: missingFields });
          return false;
        }
      }

      // デフォルト値の補完（最適化版）
      Object.keys(defaults).forEach(key => {
        if (post[key] === undefined || post[key] === null) {
          post[key] = defaults[key];
        }
      });

      return true;
    });
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
        // 新規投稿の作成（最適化版デフォルト値適用）
        post = {
          ...CONFIG.instagram.schema.defaults,
          ...postData,
          id: this.generateId(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
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
        message: postData.id ? CONFIG.instagram.ui.messages.saved : CONFIG.instagram.ui.messages.saved
      };
      
    } catch (error) {
      console.error('❌ Instagram投稿保存エラー:', error);
      return {
        success: false,
        message: CONFIG.instagram.ui.messages.error
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
        message: CONFIG.instagram.ui.successMessages.deleted
      };
      
    } catch (error) {
      console.error('❌ Instagram投稿削除エラー:', error);
      return {
        success: false,
        message: CONFIG.instagram.ui.errorMessages.deleteError
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
   * Instagram投稿のバリデーション（埋め込みコード対応）
   * @param {Object} data - 投稿データ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validatePost(data) {
    const errors = [];
    const validation = CONFIG.instagram.posts.validation;
    
    // 各フィールドの検証
    Object.keys(validation).forEach(fieldName => {
      const fieldConfig = validation[fieldName];
      const value = data[fieldName];
      
      // 必須チェック
      if (fieldConfig.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldName}は必須です`);
        return;
      }
      
      // 値が存在する場合のみ以下の検証を実行
      if (value !== undefined && value !== null && value !== '') {
        
        // 型チェック
        if (fieldConfig.type) {
          const actualType = typeof value;
          if (actualType !== fieldConfig.type) {
            errors.push(`${fieldName}は${fieldConfig.type}型である必要があります（現在: ${actualType}）`);
            return;
          }
        }
        
        // 文字列長チェック
        if (fieldConfig.type === 'string') {
          if (fieldConfig.minLength && value.length < fieldConfig.minLength) {
            errors.push(`${fieldName}は${fieldConfig.minLength}文字以上である必要があります`);
          }
          if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
            errors.push(`${fieldName}は${fieldConfig.maxLength}文字以下である必要があります`);
          }
          
          // パターンチェック
          if (fieldConfig.pattern && !fieldConfig.pattern.test(value)) {
            errors.push(`${fieldName}の形式が正しくありません`);
          }
        }
        
        // 数値範囲チェック
        if (fieldConfig.type === 'number') {
          if (fieldConfig.min !== undefined && value < fieldConfig.min) {
            errors.push(`${fieldName}は${fieldConfig.min}以上である必要があります`);
          }
          if (fieldConfig.max !== undefined && value > fieldConfig.max) {
            errors.push(`${fieldName}は${fieldConfig.max}以下である必要があります`);
          }
        }
        
        // 列挙値チェック
        if (fieldConfig.enum && !fieldConfig.enum.includes(value)) {
          errors.push(`${fieldName}は次のいずれかである必要があります: ${fieldConfig.enum.join(', ')}`);
        }
      }
    });
    
    // Instagram埋め込みコード特別チェック
    if (data.embedCode && !this.isValidInstagramEmbed(data.embedCode)) {
      errors.push('有効なInstagram埋め込みコードを入力してください');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Instagram埋め込みコードの有効性チェック（シンプル版）
   * @param {string} embedCode - チェックする埋め込みコード
   * @returns {boolean}
   */
  isValidInstagramEmbed(embedCode) {
    if (!embedCode || embedCode.length > CONFIG.instagram.validation.maxEmbedLength) {
      return false;
    }
    
    // 基本パターンチェック
    if (!CONFIG.instagram.validation.embedPattern.test(embedCode)) {
      return false;
    }
    
    // 必須要素チェック（最小限）
    const requiredElements = CONFIG.instagram.validation.requiredElements;
    for (const element of requiredElements) {
      if (!embedCode.includes(element)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * ストレージに保存
   * @private
   */
  async saveToStorage() {
    try {
      // メインデータ保存
      localStorage.setItem(this.storageKeys.posts, JSON.stringify(this.posts));
      
      // バックアップ作成（設定で有効な場合）
      if (CONFIG.instagram.data.backup.enabled && CONFIG.instagram.data.backup.autoBackup) {
        this.createBackup();
      }
      
      this.lastSaved = new Date();
    } catch (error) {
      console.error('❌ ストレージ保存エラー:', error);
      throw error;
    }
  }

  /**
   * バックアップ作成
   * @private
   */
  createBackup() {
    try {
      const backupData = {
        posts: this.posts,
        timestamp: new Date().toISOString(),
        version: CONFIG.instagram.data.version.current
      };
      
      const existingBackups = this.getBackups();
      existingBackups.unshift(backupData);
      
      // 最大バックアップ数を超えた場合は古いものを削除
      const maxBackups = CONFIG.instagram.data.backup.maxBackups;
      if (existingBackups.length > maxBackups) {
        existingBackups.splice(maxBackups);
      }
      
      localStorage.setItem(this.storageKeys.backup, JSON.stringify(existingBackups));
      console.log('💾 Instagram投稿バックアップ作成完了');
    } catch (error) {
      console.warn('⚠️ バックアップ作成失敗:', error);
    }
  }

  /**
   * バックアップ一覧取得
   * @returns {Array}
   */
  getBackups() {
    try {
      const data = localStorage.getItem(this.storageKeys.backup);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('⚠️ バックアップ読み込み失敗:', error);
      return [];
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
   * すべての投稿を取得
   * @returns {Array} 投稿配列
   */
  getAllPosts() {
    return [...this.posts].sort((a, b) => {
      // まず order でソート、次に updatedAt でソート
      const orderDiff = (a.order || 0) - (b.order || 0);
      if (orderDiff !== 0) return orderDiff;
      
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA;
    });
  }

  /**
   * 投稿のステータスを切り替え
   * @param {string} id - 投稿ID
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async togglePostStatus(id) {
    try {
      const index = this.posts.findIndex(p => p.id === id);
      
      if (index === -1) {
        return {
          success: false,
          message: '投稿が見つかりませんでした'
        };
      }
      
      const post = this.posts[index];
      const newStatus = post.status === 'active' ? 'inactive' : 'active';
      
      this.posts[index] = {
        ...post,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      
      await this.saveToStorage();
      
      const message = CONFIG.instagram.ui.successMessages.statusChanged;
      
      EventBus.emit('instagram:statusToggled', { 
        post: this.posts[index], 
        newStatus 
      });
      
      console.log(`🔄 Instagram投稿ステータス切り替え: ${id} -> ${newStatus}`);
      
      return {
        success: true,
        message
      };
      
    } catch (error) {
      console.error('❌ Instagram投稿ステータス切り替えエラー:', error);
      return {
        success: false,
        message: 'ステータスの切り替えに失敗しました'
      };
    }
  }

  /**
   * エクスポート用データ取得
   * @returns {Object}
   */
  getExportData() {
    return {
      posts: this.posts,
      metadata: {
        exportedAt: new Date().toISOString(),
        count: this.posts.length,
        version: '2.0.0'
      }
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

  /**
   * LP側表示用の投稿データを取得（統一ストレージ使用）
   * @param {Object} options - 取得オプション
   * @param {number} options.limit - 最大取得数
   * @param {boolean} options.includeInactive - 非アクティブも含めるか
   * @param {boolean} options.featuredFirst - 注目投稿を先頭に
   * @returns {Array} LP表示用投稿データ
   */
  getPostsForLP(options = {}) {
    const {
      limit = CONFIG.instagram.posts.defaultDisplayPosts,
      includeInactive = false,
      featuredFirst = true
    } = options;

    let posts = [...this.posts];

    // アクティブな投稿のみフィルタリング（LP用）
    if (!includeInactive) {
      posts = posts.filter(post => post.status === 'active');
    }

    // ソート: 注目投稿を先頭に、その後は更新日順
    posts.sort((a, b) => {
      if (featuredFirst) {
        // 注目投稿を先頭に
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
      }

      // 表示順序でソート（数値が小さいほど先頭）
      const orderDiff = (a.order || 999) - (b.order || 999);
      if (orderDiff !== 0) return orderDiff;

      // 最終的に更新日時でソート（新しいものが先頭）
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA;
    });

    // 指定された数まで制限
    return posts.slice(0, limit);
  }

  /**
   * LP側でInstagramデータを簡単に取得するための静的メソッド
   * （ページ初期化時にInstagramDataServiceのインスタンスを作らずに使用可能）
   * @param {Object} options - 取得オプション
   * @returns {Array} LP表示用投稿データ
   */
  static getInstagramPostsForLP(options = {}) {
    try {
      // CONFIG統一キーを使用してデータを直接取得
      const storageKey = CONFIG.storage.keys.instagramPosts;
      const data = localStorage.getItem(storageKey);
      
      if (!data) {
        console.log('📷 Instagram投稿データが見つかりません');
        return [];
      }

      const posts = JSON.parse(data);
      
      if (!Array.isArray(posts)) {
        console.warn('📷 Instagram投稿データの形式が正しくありません');
        return [];
      }

      const {
        limit = CONFIG.instagram.posts.defaultDisplayPosts,
        includeInactive = false,
        featuredFirst = true
      } = options;

      let filteredPosts = [...posts];

      // アクティブな投稿のみ（LP用）
      if (!includeInactive) {
        filteredPosts = filteredPosts.filter(post => post.status === 'active');
      }

      // ソート処理
      filteredPosts.sort((a, b) => {
        if (featuredFirst) {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
        }

        const orderDiff = (a.order || 999) - (b.order || 999);
        if (orderDiff !== 0) return orderDiff;

        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      });

      console.log(`📷 LP用Instagram投稿データ取得: ${filteredPosts.length}件 (全${posts.length}件中)`);
      return filteredPosts.slice(0, limit);

    } catch (error) {
      console.error('❌ LP用Instagram投稿データ取得エラー:', error);
      return [];
    }
  }
}

// シングルトンインスタンス
export const instagramDataService = new InstagramDataService(); 