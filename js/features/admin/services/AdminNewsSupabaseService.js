/**
 * 管理画面 記事管理 Supabaseサービス
 * AdminActionServiceの記事管理機能をSupabaseベースに移行
 * @version 1.0.0
 */

import { getArticleSupabaseService } from '../../../shared/services/ArticleSupabaseService.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { requireAdminUser, isAdminUser } from '../../../shared/utils/adminAuth.js';
import { getSupabaseClient } from '../../../lib/supabase.js';

export class AdminNewsSupabaseService {
  constructor() {
    this.serviceName = 'AdminNewsSupabaseService';
    this.initialized = false;
    this.articleService = null;
    this.supabase = null;
    
    // キャッシュ管理
    this.articlesCache = new Map();
    this.cacheExpiry = 30 * 1000; // 30秒
    this.lastCacheUpdate = null;
    
    // エディター状態
    this.currentArticle = null;
    this.isEditing = false;
    
    // カテゴリー定義（schema.sql準拠）
    this.categoryDefinitions = CONFIG.articles.categories;
  }

  /**
   * 管理者権限チェック（統一）
   * @returns {Promise<Object>} 現在のユーザー情報
   * @throws {Error} 管理者権限がない場合
   */
  async requireAdminAuth() {
    try {
      if (!this.supabase) {
        this.supabase = getSupabaseClient();
      }
      
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        throw new Error(`認証エラー: ${error.message}`);
      }
      
      // 統一的な管理者権限チェック
      requireAdminUser(user);
      
      console.log(`[${this.serviceName}] 管理者権限確認完了: ${user.email}`);
      return user;
      
    } catch (error) {
      console.error(`[${this.serviceName}] 管理者権限チェック失敗:`, error.message);
      throw error;
    }
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[AdminNewsSupabaseService] 初期化開始');
      
      // ArticleSupabaseServiceを取得
      this.articleService = getArticleSupabaseService();
      await this.articleService.init();
      
      this.initialized = true;
      console.log('[AdminNewsSupabaseService] Supabase対応で初期化完了');
      
    } catch (error) {
      console.error('[AdminNewsSupabaseService] 初期化エラー:', error);
      this.initialized = true; // エラーでもアプリ停止を防ぐ
    }
  }

  /**
   * 全記事を取得（管理画面用）
   * @param {Object} options - 取得オプション
   * @returns {Promise<Array>} 記事配列
   */
  async getAllArticles(options = {}) {
    try {
      await this.init();
      
      if (!this.articleService) {
        console.warn('[AdminNewsSupabaseService] ArticleService not available');
        return [];
      }

      const articles = await this.articleService.getAllArticles(options);
      
      // キャッシュ更新
      this.updateCache(articles);
      
      console.log(`[AdminNewsSupabaseService] 全記事を取得: ${articles.length}件`);
      return articles;

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 記事取得エラー:', error);
      return [];
    }
  }

  /**
   * 記事を作成
   * @param {Object} articleData - 記事データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createArticle(articleData) {
    try {
      // 管理者権限チェック
      await this.requireAdminAuth();
      
      await this.init();
      
      if (!this.articleService) {
        return {
          success: false,
          error: 'ArticleServiceが利用できません'
        };
      }

      // データ正規化
      const normalizedData = this.normalizeArticleData(articleData, true);

      const result = await this.articleService.createArticle(normalizedData);
      
      if (result.success) {
        this.clearCache();
        console.log(`[AdminNewsSupabaseService] 記事作成成功: ${result.data.id}`);
      }
      
      return result;

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 記事作成エラー:', error);
      return {
        success: false,
        error: `記事の作成中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事を更新
   * @param {string} articleId - 記事ID
   * @param {Object} updateData - 更新データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async updateArticle(articleId, updateData) {
    try {
      // 管理者権限チェック
      await this.requireAdminAuth();
      
      await this.init();
      
      if (!this.articleService) {
        return {
          success: false,
          error: 'ArticleServiceが利用できません'
        };
      }

      // データ正規化
      const normalizedData = this.normalizeArticleData(updateData, false);

      const result = await this.articleService.updateArticle(articleId, normalizedData);
      
      if (result.success) {
        this.clearCache();
        console.log(`[AdminNewsSupabaseService] 記事更新成功: ${articleId}`);
      }
      
      return result;

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 記事更新エラー:', error);
      return {
        success: false,
        error: `記事の更新中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事を削除
   * @param {string} articleId - 記事ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteArticle(articleId) {
    try {
      // 管理者権限チェック
      await this.requireAdminAuth();
      
      await this.init();
      
      if (!this.articleService) {
        return {
          success: false,
          error: 'ArticleServiceが利用できません'
        };
      }

      const result = await this.articleService.deleteArticle(articleId);
      
      if (result.success) {
        this.clearCache();
        console.log(`[AdminNewsSupabaseService] 記事削除成功: ${articleId}`);
      }
      
      return result;

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 記事削除エラー:', error);
      return {
        success: false,
        error: `記事の削除中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事を公開
   * @param {string} articleId - 記事ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async publishArticle(articleId) {
    try {
      const result = await this.updateArticle(articleId, {
        status: 'published',
        published_at: new Date().toISOString()
      });
      
      if (result.success) {
        console.log(`[AdminNewsSupabaseService] 記事公開成功: ${articleId}`);
      }
      
      return result;

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 記事公開エラー:', error);
      return {
        success: false,
        error: `記事の公開中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事の公開を取り消し
   * @param {string} articleId - 記事ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async unpublishArticle(articleId) {
    try {
      const result = await this.updateArticle(articleId, {
        status: 'draft',
        published_at: null
      });
      
      if (result.success) {
        console.log(`[AdminNewsSupabaseService] 記事非公開成功: ${articleId}`);
      }
      
      return result;

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 記事非公開エラー:', error);
      return {
        success: false,
        error: `記事の非公開化中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事を保存（作成または更新）
   * AdminActionServiceとの互換性のため
   * @param {Object} articleData - 記事データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async saveArticle(articleData) {
    try {
      if (articleData.id) {
        // 既存記事の更新
        return await this.updateArticle(articleData.id, articleData);
      } else {
        // 新規記事の作成
        return await this.createArticle(articleData);
      }
    } catch (error) {
      console.error('[AdminNewsSupabaseService] 記事保存エラー:', error);
      return {
        success: false,
        error: `記事の保存中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 記事IDで取得
   * @param {string} articleId - 記事ID
   * @returns {Promise<Object|null>} 記事データ
   */
  async getArticleById(articleId) {
    try {
      await this.init();
      
      if (!this.articleService) {
        return null;
      }

      const result = await this.articleService.getArticleById(articleId);
      
      if (result.success && result.data) {
        console.log(`[AdminNewsSupabaseService] 記事詳細取得: ${articleId}`);
        return result.data;
      }
      
      return null;

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 記事詳細取得エラー:', error);
      return null;
    }
  }

  /**
   * 最近の記事を取得（管理画面ダッシュボード用）
   * @param {number} limit - 取得件数
   * @returns {Promise<Array>} 記事配列
   */
  async getRecentArticles(limit = 5) {
    try {
      await this.init();
      
      if (!this.articleService) {
        console.warn('[AdminNewsSupabaseService] ArticleService not available');
        return [];
      }

      const result = await this.articleService.getPublishedArticles({
        limit: limit,
        orderBy: [
          { column: 'published_at', ascending: false },
          { column: 'created_at', ascending: false }
        ]
      });
      
      if (result.success && result.data) {
        console.log(`[AdminNewsSupabaseService] 最近の記事を取得: ${result.data.length}件`);
        return result.data;
      }
      
      return [];

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 最近の記事取得エラー:', error);
      return [];
    }
  }

  /**
   * 記事統計を取得
   * @returns {Promise<Object>} 統計情報
   */
  async getArticleStats() {
    try {
      await this.init();
      
      if (!this.articleService) {
        return {
          total: 0,
          published: 0,
          draft: 0,
          featured: 0
        };
      }

      const stats = await this.articleService.getArticleStats();
      return stats;

    } catch (error) {
      console.error('[AdminNewsSupabaseService] 統計取得エラー:', error);
      return {
        total: 0,
        published: 0,
        draft: 0,
        featured: 0
      };
    }
  }

  /**
   * 記事データを正規化
   * @param {Object} data - 生データ
   * @param {boolean} isNew - 新規作成かどうか
   * @returns {Object} 正規化されたデータ
   */
  normalizeArticleData(data, isNew = false) {
    const normalized = {
      title: data.title?.trim() || '',
      content: data.content?.trim() || '',
      summary: data.summary?.trim() || data.excerpt?.trim() || '',
      category: data.category || 'general',
      featured: Boolean(data.featured || false)
    };

    // 新規作成時のステータス設定
    if (isNew) {
      normalized.status = data.status || 'draft';
      if (normalized.status === 'published') {
        normalized.published_at = new Date().toISOString();
      }
    } else {
      // 更新時は変更がある場合のみ設定
      if (data.status !== undefined) {
        normalized.status = data.status;
        if (data.status === 'published' && !data.published_at) {
          normalized.published_at = new Date().toISOString();
        } else if (data.status === 'draft') {
          normalized.published_at = null;
        }
      }
    }

    return normalized;
  }

  /**
   * フォームからエディターデータを取得
   * @returns {Object} エディターデータ
   */
  getEditorData() {
    try {
      const currentDate = new Date().toISOString();
      const id = document.getElementById('news-id')?.value || null;
      
      return {
        id: id,
        title: document.getElementById('news-title')?.value || '',
        content: document.getElementById('news-content')?.value || '',
        category: this.mapOldCategoryToNew(document.getElementById('news-category')?.value || 'general'),
        summary: document.getElementById('news-summary')?.value || '',
        featured: document.getElementById('news-featured')?.checked || false,
        status: 'draft'
      };
    } catch (error) {
      console.error('[AdminNewsSupabaseService] エディターデータ取得エラー:', error);
      return {};
    }
  }

  /**
   * 記事をエディターに読み込み
   * @param {Object} article - 記事データ
   */
  loadArticleToEditor(article) {
    try {
      // フォーム要素に記事データを設定
      const titleInput = document.getElementById('news-title');
      const categorySelect = document.getElementById('news-category');
      const dateInput = document.getElementById('news-date');
      const summaryTextarea = document.getElementById('news-summary');
      const contentTextarea = document.getElementById('news-content');
      const featuredCheckbox = document.getElementById('news-featured');
      const hiddenIdInput = document.getElementById('news-id');

      if (titleInput) titleInput.value = article.title || '';
      if (categorySelect) categorySelect.value = this.mapNewCategoryToOld(article.category) || 'announcement';
      if (dateInput) {
        const dateValue = article.published_at || article.created_at;
        if (dateValue) {
          dateInput.value = new Date(dateValue).toISOString().split('T')[0];
        }
      }
      if (summaryTextarea) summaryTextarea.value = article.summary || '';
      if (contentTextarea) contentTextarea.value = article.content || '';
      if (featuredCheckbox) featuredCheckbox.checked = article.featured || false;
      if (hiddenIdInput) hiddenIdInput.value = article.id;

      // エディターのタイトルを更新
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) {
        editorTitle.textContent = '記事編集';
      }

      // 編集モード設定
      this.currentArticle = article;
      this.isEditing = true;

      console.log(`[AdminNewsSupabaseService] 記事をエディターに読み込み: ${article.title}`);

    } catch (error) {
      console.error('[AdminNewsSupabaseService] エディター読み込みエラー:', error);
    }
  }

  /**
   * エディターをクリア
   */
  clearEditor() {
    try {
      ['news-title', 'news-content', 'news-summary', 'news-id'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      
      const categoryEl = document.getElementById('news-category');
      const dateEl = document.getElementById('news-date');
      const featuredEl = document.getElementById('news-featured');
      
      if (categoryEl) categoryEl.selectedIndex = 0;
      if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
      if (featuredEl) featuredEl.checked = false;

      // エディターのタイトルを更新
      const editorTitle = document.getElementById('editor-title');
      if (editorTitle) {
        editorTitle.textContent = '新規記事作成';
      }

      // 編集モード解除
      this.currentArticle = null;
      this.isEditing = false;
      
      console.log('[AdminNewsSupabaseService] エディターをクリア');

    } catch (error) {
      console.error('[AdminNewsSupabaseService] エディタークリアエラー:', error);
    }
  }

  /**
   * カテゴリー情報を取得
   * @param {string} categoryId - カテゴリーID
   * @returns {Object} カテゴリー情報
   */
  getCategoryInfo(categoryId) {
    return this.categoryDefinitions[categoryId] || this.categoryDefinitions.general;
  }

  /**
   * 旧UI形式からスキーマ準拠カテゴリーにマッピング
   * @param {string} oldCategory - 旧UI形式カテゴリー
   * @returns {string} スキーマ準拠カテゴリー
   */
  mapOldCategoryToNew(oldCategory) {
    const mapping = {
      'announcement': 'notice',
      'event': 'event',
      'media': 'other',
      'important': 'notice'
    };
    
    return mapping[oldCategory] || 'general';
  }

  /**
   * スキーマ準拠カテゴリーから旧UI形式にマッピング
   * @param {string} newCategory - スキーマ準拠カテゴリー
   * @returns {string} 旧UI形式カテゴリー
   */
  mapNewCategoryToOld(newCategory) {
    const mapping = {
      'notice': 'announcement',
      'event': 'event',
      'other': 'media',
      'general': 'announcement',
      'lesson': 'event'
    };
    
    return mapping[newCategory] || 'announcement';
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
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('[AdminNewsSupabaseService] 日付フォーマットエラー:', error);
      return dateString || '';
    }
  }

  /**
   * HTMLエスケープ
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.articlesCache.clear();
    this.lastCacheUpdate = null;
    console.log('[AdminNewsSupabaseService] キャッシュをクリア');
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.clearCache();
    this.currentArticle = null;
    this.isEditing = false;
    this.initialized = false;
    console.log('[AdminNewsSupabaseService] サービスを破棄');
  }
}

// シングルトンインスタンス
let adminNewsSupabaseServiceInstance = null;

/**
 * AdminNewsSupabaseServiceのシングルトンインスタンスを取得
 * @returns {AdminNewsSupabaseService}
 */
export function getAdminNewsSupabaseService() {
  if (!adminNewsSupabaseServiceInstance) {
    adminNewsSupabaseServiceInstance = new AdminNewsSupabaseService();
  }
  return adminNewsSupabaseServiceInstance;
} 