/**
 * 統一ダッシュボード統計サービス - 全統計情報の一元管理
 * @version 1.0.0 - 統合版
 * @description CONFIG.jsと完全統合し、全データソースから統計を取得・統一
 */

import { CONFIG } from '../../../shared/constants/config.js';
import { getAdminNotificationService } from '../../../shared/services/AdminNotificationService.js';

export class UnifiedDashboardStatsService {
  constructor() {
    this.serviceName = 'UnifiedDashboardStatsService';
    this.initialized = false;
    
    // CONFIG統合ストレージキー（統一設定）
    this.storageKeys = {
      articles: CONFIG.helpers.getStorageKey('articles'),
      instagram: CONFIG.helpers.getStorageKey('instagram'), 
      lessons: CONFIG.helpers.getStorageKey('lessons'),
      settings: CONFIG.helpers.getStorageKey('settings')
    };
    
    // 統計データキャッシュ
    this.statsCache = {
      articles: null,
      instagram: null,
      lessons: null,
      lastUpdated: null,
      cacheTimeout: 30000 // 30秒
    };
    
    // 通知サービス
    this.notificationService = getAdminNotificationService();
    
    // ログ関数（CONFIG統合）
    this.log = CONFIG.helpers.log;
    
    this.log('info', 'UnifiedDashboardStatsService初期化', {
      storageKeys: this.storageKeys
    });
  }

  /**
   * サービス初期化
   */
  async init() {
    if (this.initialized) return;
    
    try {
      this.log('info', '統一ダッシュボード統計サービス初期化開始');
      
      // ストレージキーの検証
      this.validateStorageKeys();
      
      // 初回統計取得
      await this.refreshAllStats();
      
      // ストレージ変更監視の設定
      this.setupStorageListeners();
      
      this.initialized = true;
      this.log('info', '統一ダッシュボード統計サービス初期化完了');
      
    } catch (error) {
      this.log('error', '統一ダッシュボード統計サービス初期化エラー:', error);
      throw error;
    }
  }

  /**
   * ストレージキーの検証
   */
  validateStorageKeys() {
    const requiredKeys = ['articles', 'instagram', 'lessons'];
    const missingKeys = requiredKeys.filter(key => !this.storageKeys[key]);
    
    if (missingKeys.length > 0) {
      throw new Error(`必須ストレージキーが設定されていません: ${missingKeys.join(', ')}`);
    }
    
    this.log('debug', 'ストレージキー検証完了', this.storageKeys);
  }

  /**
   * ストレージ変更監視の設定
   */
  setupStorageListeners() {
    const monitoredKeys = Object.values(this.storageKeys);
    
    this.storageListener = (e) => {
      if (monitoredKeys.includes(e.key)) {
        this.log('debug', `ストレージ変更検出: ${e.key}`);
        // キャッシュクリア
        this.clearStatsCache();
        // 統計更新（100ms遅延で重複防止）
        setTimeout(() => this.refreshAllStats(), 100);
      }
    };
    
    window.addEventListener('storage', this.storageListener);
    this.log('debug', 'ストレージ変更監視設定完了');
  }

  /**
   * 全統計情報の更新（通知機能付き）
   */
  async refreshAllStats(forceRefresh = false) {
    try {
      this.log('debug', '全統計情報更新開始', { forceRefresh });
      
      // 強制更新でない場合はキャッシュをチェック
      if (!forceRefresh && this.isCacheValid()) {
        this.log('debug', 'キャッシュが有効のため、更新をスキップ');
        return this.getCachedStats();
      }
      
      // 各データソースから統計を並列取得
      const [articleStats, instagramStats, lessonStats] = await Promise.all([
        this.getArticleStats(),
        this.getInstagramStats(),
        this.getLessonStats()
      ]);
      
      // 統合統計データの作成
      const unifiedStats = {
        // 記事統計
        articles: articleStats,
        // Instagram統計  
        instagram: instagramStats,
        // レッスン統計
        lessons: lessonStats,
        // メタ情報
        meta: {
          lastUpdated: new Date().toISOString(),
          totalDataPoints: articleStats.total + instagramStats.total + lessonStats.total,
          environment: CONFIG.app.environment,
          version: CONFIG.app.version,
          forcedRefresh: forceRefresh
        }
      };
      
      // キャッシュ更新
      this.updateStatsCache(unifiedStats);
      
      // 統計更新通知を送信
      this.notifyStatsUpdate(unifiedStats);
      
      this.log('debug', '全統計情報更新完了', unifiedStats);
      
      return unifiedStats;
      
    } catch (error) {
      this.log('error', '全統計情報更新エラー:', error);
      throw error;
    }
  }

  /**
   * 統計更新の通知送信
   */
  notifyStatsUpdate(stats) {
    try {
      // カスタムイベントで他のコンポーネントに通知
      const event = new CustomEvent('statsUpdated', {
        detail: {
          source: 'UnifiedDashboardStatsService',
          timestamp: new Date().toISOString(),
          stats: stats,
          summary: {
            totalArticles: stats.articles.total,
            totalInstagram: stats.instagram.total,
            totalLessons: stats.lessons.total
          }
        }
      });
      
      document.dispatchEvent(event);
      this.log('debug', '統計更新通知を送信しました');
      
    } catch (error) {
      this.log('warn', '統計更新通知の送信エラー:', error);
    }
  }

  /**
   * 強制的な統計更新
   */
  async forceRefresh() {
    this.log('info', '統計の強制更新を実行');
    
    // キャッシュクリア
    this.clearStatsCache();
    
    // 強制的に統計を更新
    return await this.refreshAllStats(true);
  }

  /**
   * 記事統計の取得（CONFIG完全統合）
   */
  async getArticleStats() {
    try {
      const data = localStorage.getItem(this.storageKeys.articles);
      if (!data) {
        return this.getEmptyArticleStats();
      }
      
      const articles = JSON.parse(data);
      if (!Array.isArray(articles)) {
        return this.getEmptyArticleStats();
      }
      
      // CONFIG.jsのスキーマ定義を使用
      const defaultStatus = CONFIG.articles.schema.defaults.status;
      const defaultCategory = CONFIG.articles.schema.defaults.category;
      
      const stats = {
        total: articles.length,
        published: articles.filter(a => (a.status || defaultStatus) === 'published').length,
        draft: articles.filter(a => (a.status || defaultStatus) === 'draft').length,
        featured: articles.filter(a => a.featured === true).length,
        // カテゴリ別統計（CONFIG.articles.categoriesを使用）
        byCategory: this.getArticlesByCategory(articles),
        // 最新記事情報
        latest: this.getLatestArticles(articles, 3)
      };
      
      this.log('debug', '記事統計取得完了', stats);
      return stats;
      
    } catch (error) {
      this.log('warn', '記事統計取得エラー:', error);
      return this.getEmptyArticleStats();
    }
  }

  /**
   * Instagram統計の取得（実データ対応・フォールバック強化版）
   */
  async getInstagramStats() {
    try {
      let instagramData = null;
      let foundKey = null;
      
      // 📊 多重フォールバック: 可能性のあるすべてのキーをチェック
      const possibleKeys = [
        this.storageKeys.instagram,     // CONFIG統一キー
        'rbs_instagram_posts',          // 一般的なキー
        'rbs_instagram',               // 代替キー
        CONFIG.storage.keys.instagram,  // CONFIG直接参照
        CONFIG.storage.keys.instagramPosts, // CONFIG詳細キー
      ].filter(Boolean); // undefinedを除外
      
      this.log('debug', 'Instagram投稿データ検索開始', { possibleKeys });
      
      for (const key of possibleKeys) {
        instagramData = localStorage.getItem(key);
        if (instagramData) {
          foundKey = key;
          this.log('debug', `Instagram投稿データ発見: ${key}`);
          break;
        }
      }
      
      // デバッグ: 全LocalStorageキーを確認
      const allKeys = Object.keys(localStorage);
      const instagramRelatedKeys = allKeys.filter(key => 
        key.toLowerCase().includes('instagram')
      );
      this.log('debug', 'LocalStorage内のInstagram関連キー:', instagramRelatedKeys);
      
      if (!instagramData && instagramRelatedKeys.length > 0) {
        // Instagram関連キーが存在する場合は、最初のものを試す
        const firstInstagramKey = instagramRelatedKeys[0];
        instagramData = localStorage.getItem(firstInstagramKey);
        if (instagramData) {
          foundKey = firstInstagramKey;
          this.log('warn', `自動検出されたInstagramキーを使用: ${firstInstagramKey}`);
        }
      }
      
      if (!instagramData) {
        this.log('warn', 'Instagram投稿データが見つかりません - 空の統計を返します');
        return this.getEmptyInstagramStats();
      }
      
      this.log('debug', `Instagram投稿データ解析開始 (キー: ${foundKey})`, {
        dataLength: instagramData.length,
        dataPreview: instagramData.substring(0, 100) + '...'
      });
      
      const posts = JSON.parse(instagramData);
      if (!Array.isArray(posts)) {
        this.log('warn', 'Instagram投稿データが配列ではありません:', typeof posts);
        return this.getEmptyInstagramStats();
      }
      
      // CONFIG.jsのスキーマ定義を使用
      const defaultStatus = CONFIG.instagram.schema.defaults.status;
      
      const stats = {
        total: posts.length,
        active: posts.filter(p => (p.status || defaultStatus) === 'active').length,
        inactive: posts.filter(p => (p.status || defaultStatus) === 'inactive').length,
        featured: posts.filter(p => p.featured === true).length,
        // パフォーマンス指標
        engagement: this.calculateInstagramEngagement(posts),
        // 最新投稿情報
        latest: this.getLatestInstagramPosts(posts, 3),
        // デバッグ情報
        foundKey: foundKey,
        rawPostsCount: posts.length
      };
      
      this.log('info', '📸 Instagram統計取得完了', {
        foundKey,
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        featured: stats.featured
      });
      
      return stats;
      
    } catch (error) {
      this.log('warn', 'Instagram統計取得エラー:', error);
      return this.getEmptyInstagramStats();
    }
  }

  /**
   * レッスン統計の取得（CONFIG完全統合）
   */
  async getLessonStats() {
    try {
      const data = localStorage.getItem(this.storageKeys.lessons);
      if (!data) {
        return this.getEmptyLessonStats();
      }
      
      const lessons = JSON.parse(data);
      
      // レッスンデータの形式を判定（配列 or オブジェクト）
      let lessonArray = [];
      if (Array.isArray(lessons)) {
        lessonArray = lessons;
      } else if (typeof lessons === 'object') {
        // オブジェクト形式の場合は値を配列化
        lessonArray = Object.values(lessons);
      }
      
      // CONFIG.jsのスキーマ定義を使用
      const defaultStatus = CONFIG.lessons.schema.defaults.status;
      
      const stats = {
        total: lessonArray.length,
        scheduled: lessonArray.filter(l => (l.status || defaultStatus) === 'scheduled').length,
        completed: lessonArray.filter(l => (l.status || defaultStatus) === 'completed').length,
        cancelled: lessonArray.filter(l => (l.status || defaultStatus) === 'cancelled').length,
        postponed: lessonArray.filter(l => (l.status || defaultStatus) === 'postponed').length,
        // 完了率計算
        completionRate: this.calculateLessonCompletionRate(lessonArray),
        // 最新レッスン情報
        latest: this.getLatestLessons(lessonArray, 3)
      };
      
      this.log('debug', 'レッスン統計取得完了', stats);
      return stats;
      
    } catch (error) {
      this.log('warn', 'レッスン統計取得エラー:', error);
      return this.getEmptyLessonStats();
    }
  }

  /**
   * カテゴリ別記事統計の取得
   */
  getArticlesByCategory(articles) {
    const categoryStats = {};
    
    // CONFIG.jsで定義されたカテゴリを初期化
    Object.keys(CONFIG.articles.categories).forEach(categoryId => {
      categoryStats[categoryId] = {
        name: CONFIG.articles.categories[categoryId].name,
        color: CONFIG.articles.categories[categoryId].color,
        count: 0
      };
    });
    
    // 記事をカテゴリ別に集計
    const defaultCategory = CONFIG.articles.schema.defaults.category;
    articles.forEach(article => {
      const category = article.category || defaultCategory;
      if (categoryStats[category]) {
        categoryStats[category].count++;
      }
    });
    
    return categoryStats;
  }

  /**
   * Instagram エンゲージメント計算
   */
  calculateInstagramEngagement(posts) {
    if (posts.length === 0) return { rate: 0, total: 0 };
    
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalEngagement = totalLikes + totalComments;
    const averageEngagement = Math.round(totalEngagement / posts.length);
    
    return {
      rate: averageEngagement,
      total: totalEngagement,
      likes: totalLikes,
      comments: totalComments
    };
  }

  /**
   * レッスン完了率計算
   */
  calculateLessonCompletionRate(lessons) {
    if (lessons.length === 0) return 0;
    
    const completedCount = lessons.filter(l => l.status === 'completed').length;
    return Math.round((completedCount / lessons.length) * 100);
  }

  /**
   * 最新記事の取得
   */
  getLatestArticles(articles, limit = 3) {
    return articles
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, limit)
      .map(article => ({
        id: article.id,
        title: article.title,
        status: article.status,
        category: article.category,
        updatedAt: article.updatedAt || article.createdAt
      }));
  }

  /**
   * 最新Instagram投稿の取得
   */
  getLatestInstagramPosts(posts, limit = 3) {
    return posts
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, limit)
      .map(post => ({
        id: post.id,
        status: post.status,
        featured: post.featured,
        updatedAt: post.updatedAt || post.createdAt
      }));
  }

  /**
   * 最新レッスンの取得
   */
  getLatestLessons(lessons, limit = 3) {
    return lessons
      .sort((a, b) => new Date(b.date || b.updatedAt || 0) - new Date(a.date || a.updatedAt || 0))
      .slice(0, limit)
      .map(lesson => ({
        date: lesson.date,
        status: lesson.status,
        content: lesson.content
      }));
  }

  /**
   * 空の記事統計
   */
  getEmptyArticleStats() {
    return {
      total: 0,
      published: 0,
      draft: 0,
      featured: 0,
      byCategory: {},
      latest: []
    };
  }

  /**
   * 空のInstagram統計
   */
  getEmptyInstagramStats() {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      featured: 0,
      engagement: { rate: 0, total: 0 },
      latest: []
    };
  }

  /**
   * 空のレッスン統計
   */
  getEmptyLessonStats() {
    return {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      postponed: 0,
      completionRate: 0,
      latest: []
    };
  }

  /**
   * キャッシュの有効性チェック
   */
  isCacheValid() {
    if (!this.statsCache.lastUpdated) return false;
    
    const now = Date.now();
    const lastUpdated = new Date(this.statsCache.lastUpdated).getTime();
    
    return (now - lastUpdated) < this.statsCache.cacheTimeout;
  }

  /**
   * キャッシュされた統計の取得
   */
  getCachedStats() {
    return {
      articles: this.statsCache.articles,
      instagram: this.statsCache.instagram,
      lessons: this.statsCache.lessons,
      meta: {
        lastUpdated: this.statsCache.lastUpdated,
        fromCache: true
      }
    };
  }

  /**
   * 統計キャッシュの更新
   */
  updateStatsCache(stats) {
    this.statsCache = {
      articles: stats.articles,
      instagram: stats.instagram,
      lessons: stats.lessons,
      lastUpdated: stats.meta.lastUpdated,
      cacheTimeout: this.statsCache.cacheTimeout
    };
  }

  /**
   * 統計キャッシュのクリア
   */
  clearStatsCache() {
    this.statsCache.articles = null;
    this.statsCache.instagram = null;
    this.statsCache.lessons = null;
    this.statsCache.lastUpdated = null;
    
    this.log('debug', '統計キャッシュをクリアしました');
  }

  /**
   * ダッシュボード表示用の統計取得
   */
  async getDashboardStats() {
    const stats = await this.refreshAllStats();
    
    // ダッシュボードで必要な主要指標のみを抽出
    return {
      // 基本カウント
      publishedCount: stats.articles.published,
      draftCount: stats.articles.draft,
      totalArticles: stats.articles.total,
      
      instagramActiveCount: stats.instagram.active,
      instagramInactiveCount: stats.instagram.inactive,
      totalInstagram: stats.instagram.total,
      
      lessonsScheduledCount: stats.lessons.scheduled,
      lessonsCompletedCount: stats.lessons.completed,
      lessonsCancelledCount: stats.lessons.cancelled,
      totalLessons: stats.lessons.total,
      
      // 追加メトリクス
      featuredArticlesCount: stats.articles.featured,
      featuredInstagramCount: stats.instagram.featured,
      lessonCompletionRate: stats.lessons.completionRate,
      
      // メタ情報
      lastUpdated: stats.meta.lastUpdated,
      fromCache: stats.meta.fromCache || false
    };
  }

  /**
   * 詳細統計の取得（分析用）
   */
  async getDetailedStats() {
    return await this.refreshAllStats();
  }

  /**
   * ストレージ使用量の取得（強化版・デバッグ対応）
   */
  getStorageUsage() {
    try {
      let totalSize = 0;
      const breakdown = {};
      const allKeys = Object.keys(localStorage);
      const instagramKeys = allKeys.filter(key => key.toLowerCase().includes('instagram'));
      
      // 設定されたストレージキーの分析
      Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
        const data = localStorage.getItem(storageKey);
        const size = data ? new Blob([data]).size : 0;
        breakdown[key] = {
          key: storageKey,
          size: size,
          sizeKB: (size / 1024).toFixed(2),
          exists: !!data,
          dataPreview: data ? data.substring(0, 50) + '...' : null
        };
        totalSize += size;
      });
      
      // Instagram関連キーの詳細分析
      const instagramAnalysis = {};
      instagramKeys.forEach(key => {
        const data = localStorage.getItem(key);
        const size = data ? new Blob([data]).size : 0;
        instagramAnalysis[key] = {
          size: size,
          sizeKB: (size / 1024).toFixed(2),
          exists: !!data,
          dataType: this.analyzeDataType(data),
          recordCount: this.getRecordCount(data)
        };
      });
      
      this.log('debug', '📊 ストレージ使用量分析', {
        totalKB: (totalSize / 1024).toFixed(2),
        configuredKeys: Object.keys(this.storageKeys),
        instagramKeys: instagramKeys,
        breakdown: breakdown
      });
      
      return {
        total: totalSize,
        totalKB: (totalSize / 1024).toFixed(2),
        totalMB: (totalSize / (1024 * 1024)).toFixed(2),
        breakdown,
        instagramAnalysis,
        debug: {
          allStorageKeys: allKeys,
          instagramRelatedKeys: instagramKeys,
          configuredKeys: Object.keys(this.storageKeys)
        }
      };
      
    } catch (error) {
      this.log('error', 'ストレージ使用量取得エラー:', error);
      return {
        total: 0,
        totalKB: '0.00',
        totalMB: '0.00',
        breakdown: {},
        instagramAnalysis: {},
        debug: { error: error.message }
      };
    }
  }

  /**
   * データタイプの分析
   */
  analyzeDataType(data) {
    if (!data) return 'empty';
    
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return 'array';
      if (typeof parsed === 'object') return 'object';
      return 'json';
    } catch {
      return 'string';
    }
  }

  /**
   * レコード数の取得
   */
  getRecordCount(data) {
    if (!data) return 0;
    
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed.length;
      if (typeof parsed === 'object') return Object.keys(parsed).length;
      return 1;
    } catch {
      return data.length;
    }
  }

  /**
   * サービスの破棄
   */
  destroy() {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
    
    this.clearStatsCache();
    this.initialized = false;
    
    this.log('info', 'UnifiedDashboardStatsService破棄完了');
  }
}

// シングルトンインスタンス
let unifiedStatsServiceInstance = null;

/**
 * 統一ダッシュボード統計サービスのシングルトンインスタンス取得
 */
export function getUnifiedDashboardStatsService() {
  if (!unifiedStatsServiceInstance) {
    unifiedStatsServiceInstance = new UnifiedDashboardStatsService();
  }
  return unifiedStatsServiceInstance;
}

/**
 * 簡易統計取得（グローバルアクセス用）
 */
export async function getDashboardStats() {
  const service = getUnifiedDashboardStatsService();
  await service.init();
  return await service.getDashboardStats();
}

/**
 * 詳細統計取得（分析用）
 */
export async function getDetailedStats() {
  const service = getUnifiedDashboardStatsService();
  await service.init();
  return await service.getDetailedStats();
} 