/**
 * Supabaseダッシュボード統計サービス
 * 全データソースをSupabaseから取得する完全統合版
 * @version 1.0.0 - Supabase専用版
 */

import { getArticleSupabaseService } from '../../../shared/services/ArticleSupabaseService.js';
import { getInstagramSupabaseService } from '../../../shared/services/InstagramSupabaseService.js';
import { getLessonStatusSupabaseService } from '../../../shared/services/LessonStatusSupabaseService.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class SupabaseDashboardStatsService {
  constructor() {
    this.serviceName = 'SupabaseDashboardStatsService';
    this.initialized = false;
    
    // Supabaseサービス
    this.articleService = null;
    this.instagramService = null;
    this.lessonService = null;
    
    // 統計キャッシュ
    this.statsCache = new Map();
    this.cacheExpiry = 30 * 1000; // 30秒
    this.lastUpdateTime = null;
    
    // パフォーマンス測定
    this.performanceMetrics = {
      lastQueryTimes: {},
      totalQueries: 0,
      averageQueryTime: 0
    };
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[SupabaseDashboardStatsService] 初期化開始');
      
      // Supabaseサービス初期化
      this.articleService = getArticleSupabaseService();
      this.instagramService = getInstagramSupabaseService();
      this.lessonService = getLessonStatusSupabaseService();
      
      await Promise.all([
        this.articleService.init(),
        this.instagramService.init(),
        this.lessonService.init()
      ]);
      
      this.initialized = true;
      console.log('[SupabaseDashboardStatsService] Supabase統合で初期化完了');
      
    } catch (error) {
      console.error('[SupabaseDashboardStatsService] 初期化エラー:', error);
      this.initialized = true; // エラーでもアプリ停止を防ぐ
    }
  }

  /**
   * 全統計情報の取得（Supabaseベース）
   * @param {boolean} forceRefresh - 強制更新フラグ
   * @returns {Promise<Object>} 統一統計データ
   */
  async getAllStats(forceRefresh = false) {
    try {
      await this.init();
      
      // キャッシュチェック
      if (!forceRefresh && this.isCacheValid()) {
        console.log('[SupabaseDashboardStatsService] キャッシュから統計を返します');
        return this.getCachedStats();
      }
      
      console.log('[SupabaseDashboardStatsService] Supabaseから統計を取得開始');
      const startTime = performance.now();
      
      // 並列でSupabaseから統計を取得
      const [articleStats, instagramStats, lessonStats] = await Promise.all([
        this.getArticleStatsFromSupabase(),
        this.getInstagramStatsFromSupabase(),
        this.getLessonStatsFromSupabase()
      ]);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      // 統合統計データ作成
      const unifiedStats = {
        articles: articleStats,
        instagram: instagramStats,
        lessons: lessonStats,
        meta: {
          lastUpdated: new Date().toISOString(),
          source: 'Supabase',
          queryTime: Math.round(queryTime),
          forceRefresh,
          cached: false
        }
      };
      
      // キャッシュ更新
      this.updateCache(unifiedStats);
      
      // パフォーマンス記録
      this.updatePerformanceMetrics(queryTime);
      
      console.log(`[SupabaseDashboardStatsService] 統計取得完了 (${queryTime.toFixed(2)}ms)`);
      return unifiedStats;
      
    } catch (error) {
      console.error('[SupabaseDashboardStatsService] 統計取得エラー:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * 記事統計をSupabaseから取得
   */
  async getArticleStatsFromSupabase() {
    try {
      if (!this.articleService) {
        return this.getEmptyArticleStats();
      }

      const articlesResult = await this.articleService.getPublishedArticles();
      const articles = articlesResult.success ? articlesResult.data : [];
      
      if (!Array.isArray(articles)) {
        return this.getEmptyArticleStats();
      }

      // 統計計算
      const total = articles.length;
      const published = articles.filter(a => a.status === 'published').length;
      const draft = articles.filter(a => a.status === 'draft').length;
      const featured = articles.filter(a => a.featured === true).length;
      
      // カテゴリー別統計
      const byCategory = {};
      Object.keys(CONFIG.articles.categories).forEach(categoryId => {
        byCategory[categoryId] = articles.filter(a => a.category === categoryId).length;
      });
      
      // 最新記事
      const latest = articles
        .filter(a => a.status === 'published')
        .sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at))
        .slice(0, 3)
        .map(article => ({
          id: article.id,
          title: article.title,
          category: article.category,
          published_at: article.published_at || article.created_at
        }));

      return {
        total,
        published,
        draft,
        featured,
        byCategory,
        latest,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('[SupabaseDashboardStatsService] 記事統計取得エラー:', error);
      return this.getEmptyArticleStats();
    }
  }

  /**
   * Instagram統計をSupabaseから取得
   */
  async getInstagramStatsFromSupabase() {
    try {
      if (!this.instagramService) {
        return this.getEmptyInstagramStats();
      }

      const posts = await this.instagramService.getVisiblePosts();
      
      if (!Array.isArray(posts)) {
        return this.getEmptyInstagramStats();
      }

      // 統計計算
      const total = posts.length;
      const visible = posts.filter(p => p.visible === true).length;
      const hidden = posts.filter(p => p.visible === false).length;
      const featured = posts.filter(p => p.featured === true).length;
      
      // 最新投稿
      const latest = posts
        .filter(p => p.visible === true)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .map(post => ({
          id: post.id,
          caption: post.caption || 'Instagram投稿',
          created_at: post.created_at
        }));

      return {
        total,
        visible,
        hidden,
        active: visible,      // DashboardStatsWidgetとの互換性
        inactive: hidden,     // DashboardStatsWidgetとの互換性
        featured,
        latest,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('[SupabaseDashboardStatsService] Instagram統計取得エラー:', error);
      return this.getEmptyInstagramStats();
    }
  }

  /**
   * レッスン統計をSupabaseから取得
   */
  async getLessonStatsFromSupabase() {
    try {
      if (!this.lessonService) {
        return this.getEmptyLessonStats();
      }

      const lessonsResult = await this.lessonService.getRecentStatuses(30);
      const lessons = Array.isArray(lessonsResult) ? lessonsResult : [];
      
      if (!Array.isArray(lessons)) {
        return this.getEmptyLessonStats();
      }

      // 統計計算
      const total = lessons.length;
      const scheduled = lessons.filter(l => l.basic_status === 'scheduled' || l.advance_status === 'scheduled').length;
      const cancelled = lessons.filter(l => l.basic_status === 'cancelled' || l.advance_status === 'cancelled').length;
      const indoor = lessons.filter(l => l.basic_status === 'indoor' || l.advance_status === 'indoor').length;
      const postponed = lessons.filter(l => l.basic_status === 'postponed' || l.advance_status === 'postponed').length;
      
      // 完了率計算（今日より過去のレッスンを基準）
      const today = new Date().toISOString().split('T')[0];
      const pastLessons = lessons.filter(l => l.date < today);
      const completedLessons = pastLessons.filter(l => 
        l.basic_status === 'scheduled' || l.advance_status === 'scheduled'
      );
      const completionRate = pastLessons.length > 0 
        ? Math.round((completedLessons.length / pastLessons.length) * 100)
        : 100;
      
      // 最新レッスン
      const latest = lessons
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3)
        .map(lesson => ({
          id: lesson.id,
          date: lesson.date,
          basic_status: lesson.basic_status,
          advance_status: lesson.advance_status,
          global_message: lesson.global_message
        }));

      return {
        total,
        scheduled,
        cancelled,
        indoor,
        postponed,
        completed: completedLessons.length,  // DashboardStatsWidgetとの互換性
        completionRate,
        latest,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('[SupabaseDashboardStatsService] レッスン統計取得エラー:', error);
      return this.getEmptyLessonStats();
    }
  }

  /**
   * ダッシュボード表示用統計データ取得
   * DashboardStatsWidgetとの互換性を保つ
   */
  async getDashboardStats(forceRefresh = false) {
    const stats = await this.getAllStats(forceRefresh);
    
    return {
      // 記事統計
      publishedCount: stats.articles.published,
      draftCount: stats.articles.draft,
      totalArticles: stats.articles.total,
      featuredArticlesCount: stats.articles.featured,
      
      // Instagram統計
      instagramActiveCount: stats.instagram.active,
      instagramInactiveCount: stats.instagram.inactive,
      totalInstagram: stats.instagram.total,
      featuredInstagramCount: stats.instagram.featured,
      
      // レッスン統計
      lessonsScheduledCount: stats.lessons.scheduled,
      lessonsCompletedCount: stats.lessons.completed,
      lessonsCancelledCount: stats.lessons.cancelled,
      totalLessons: stats.lessons.total,
      lessonCompletionRate: stats.lessons.completionRate,
      
      // メタ情報
      lastUpdated: stats.meta.lastUpdated,
      source: stats.meta.source,
      queryTime: stats.meta.queryTime,
      fromCache: stats.meta.cached || false
    };
  }

  /**
   * キャッシュの有効性チェック
   */
  isCacheValid() {
    return this.lastUpdateTime && 
           (Date.now() - this.lastUpdateTime) < this.cacheExpiry &&
           this.statsCache.has('unified');
  }

  /**
   * キャッシュされた統計を取得
   */
  getCachedStats() {
    const cached = this.statsCache.get('unified');
    if (cached) {
      cached.meta.cached = true;
      return cached;
    }
    return this.getEmptyStats();
  }

  /**
   * キャッシュを更新
   */
  updateCache(stats) {
    this.statsCache.set('unified', { ...stats });
    this.lastUpdateTime = Date.now();
  }

  /**
   * パフォーマンスメトリクス更新
   */
  updatePerformanceMetrics(queryTime) {
    this.performanceMetrics.totalQueries++;
    this.performanceMetrics.lastQueryTimes.latest = queryTime;
    
    // 平均クエリ時間の計算
    const totalTime = (this.performanceMetrics.averageQueryTime * (this.performanceMetrics.totalQueries - 1)) + queryTime;
    this.performanceMetrics.averageQueryTime = totalTime / this.performanceMetrics.totalQueries;
  }

  /**
   * 強制更新
   */
  async forceRefresh() {
    console.log('[SupabaseDashboardStatsService] 強制更新実行');
    this.clearCache();
    return await this.getAllStats(true);
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.statsCache.clear();
    this.lastUpdateTime = null;
    console.log('[SupabaseDashboardStatsService] キャッシュをクリア');
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
      latest: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 空のInstagram統計
   */
  getEmptyInstagramStats() {
    return {
      total: 0,
      visible: 0,
      hidden: 0,
      active: 0,
      inactive: 0,
      featured: 0,
      latest: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 空のレッスン統計
   */
  getEmptyLessonStats() {
    return {
      total: 0,
      scheduled: 0,
      cancelled: 0,
      indoor: 0,
      postponed: 0,
      completed: 0,
      completionRate: 0,
      latest: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 空の統計データ
   */
  getEmptyStats() {
    return {
      articles: this.getEmptyArticleStats(),
      instagram: this.getEmptyInstagramStats(),
      lessons: this.getEmptyLessonStats(),
      meta: {
        lastUpdated: new Date().toISOString(),
        source: 'Empty',
        queryTime: 0,
        cached: false,
        error: true
      }
    };
  }

  /**
   * パフォーマンス情報取得
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalQueries > 0 
        ? Math.round((this.statsCache.size / this.performanceMetrics.totalQueries) * 100)
        : 0,
      initialized: this.initialized
    };
  }

  /**
   * デバッグ情報表示
   */
  showDebugInfo() {
    console.log('=== SupabaseDashboardStatsService Debug Info ===');
    console.log('Initialized:', this.initialized);
    console.log('Cache Valid:', this.isCacheValid());
    console.log('Cache Size:', this.statsCache.size);
    console.log('Performance:', this.getPerformanceMetrics());
    console.log('Services Status:', {
      article: !!this.articleService,
      instagram: !!this.instagramService,
      lesson: !!this.lessonService
    });
    console.log('==============================================');
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.clearCache();
    this.articleService = null;
    this.instagramService = null;
    this.lessonService = null;
    this.initialized = false;
    console.log('[SupabaseDashboardStatsService] サービスを破棄');
  }
}

// シングルトンインスタンス
let supabaseDashboardStatsServiceInstance = null;

/**
 * SupabaseDashboardStatsServiceのシングルトンインスタンス取得
 * @returns {SupabaseDashboardStatsService}
 */
export function getSupabaseDashboardStatsService() {
  if (!supabaseDashboardStatsServiceInstance) {
    supabaseDashboardStatsServiceInstance = new SupabaseDashboardStatsService();
  }
  return supabaseDashboardStatsServiceInstance;
} 