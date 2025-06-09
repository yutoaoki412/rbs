/**
 * ダッシュボード統計ウィジェット - admin.html内のインライン統計更新機能を外部化
 * @version 1.0.0 - リファクタリング版
 */

import { Component } from '../../../lib/base/Component.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { getAdminNotificationService } from '../../../shared/services/AdminNotificationService.js';

export class DashboardStatsWidget extends Component {
  constructor() {
    super({ autoInit: false });
    this.componentName = 'DashboardStatsWidget';
    
    // 設定
    this.config = {
      updateInterval: 5000, // 5秒間隔
      animationDuration: 200, // アニメーション時間
      articlesKey: CONFIG.storage?.keys?.articles || 'rbs_articles',
      instagramKey: CONFIG.storage?.keys?.instagram || 'rbs_instagram_posts'
    };
    
    // 状態管理
    this.currentStats = {
      publishedCount: 0,
      draftCount: 0,
      instagramVisibleCount: 0,
      instagramHiddenCount: 0
    };
    
    this.updateIntervalId = null;
    this.notificationService = getAdminNotificationService();
    this.initialized = false;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;
    
    try {
      this.log('DashboardStatsWidget初期化開始', 'info');
      
      // DOM要素の確認
      this.validateStatElements();
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      // 初回統計更新
      await this.updateStats();
      
      // 定期更新の開始
      this.startAutoUpdate();
      
      // グローバル関数の公開
      this.setupGlobalHelpers();
      
      this.initialized = true;
      this.log('DashboardStatsWidget初期化完了', 'info');
      
    } catch (error) {
      this.error('DashboardStatsWidget初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 統計カード要素の検証
   */
  validateStatElements() {
    const requiredElements = [
      'stat-published',
      'stat-drafts', 
      'stat-instagram-visible',
      'stat-instagram-hidden'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      throw new Error(`必要な統計要素が見つかりません: ${missingElements.join(', ')}`);
    }
    
    this.log('統計カード要素の検証完了', 'debug');
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // LocalStorage変更の監視
    window.addEventListener('storage', (e) => {
      if (e.key === this.config.articlesKey || e.key === this.config.instagramKey) {
        // 100ms遅延して更新（重複防止）
        setTimeout(() => this.updateStats(), 100);
      }
    });
    
    // ページ可視性変更の監視
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopAutoUpdate();
      } else {
        this.startAutoUpdate();
        this.updateStats(); // 即座に更新
      }
    });
    
    this.log('イベントリスナー設定完了', 'debug');
  }

  /**
   * グローバルヘルパー関数の設定
   */
  setupGlobalHelpers() {
    // admin.html内の実装を統合
    window.updateDashboardStats = () => this.updateStats();
    window.refreshStats = () => this.updateStats();
    
    this.log('グローバルヘルパー関数設定完了', 'debug');
  }

  /**
   * 統計情報の更新
   */
  async updateStats() {
    try {
      const newStats = await this.calculateStats();
      
      // 変更があった場合のみアニメーション付きで更新
      if (this.hasStatsChanged(newStats)) {
        await this.updateStatCards(newStats);
        this.currentStats = { ...newStats };
        
        this.log('📊 統計情報更新完了:', newStats, 'debug');
      }
      
    } catch (error) {
      this.error('統計情報更新エラー:', error);
      
      // エラー時は視覚的にエラー状態を表示
      this.showStatsError();
    }
  }

  /**
   * 統計データの計算
   */
  async calculateStats() {
    const stats = {
      publishedCount: 0,
      draftCount: 0,
      instagramVisibleCount: 0,
      instagramHiddenCount: 0
    };

    // 記事データの取得と計算
    try {
      const articlesData = localStorage.getItem(this.config.articlesKey);
      if (articlesData) {
        const articles = JSON.parse(articlesData);
        if (Array.isArray(articles)) {
          stats.publishedCount = articles.filter(article => article.status === 'published').length;
          stats.draftCount = articles.filter(article => article.status === 'draft').length;
        }
      }
    } catch (error) {
      this.warn('記事データの読み込みエラー:', error);
    }

    // Instagram投稿データの取得と計算
    try {
      const instagramData = localStorage.getItem(this.config.instagramKey);
      if (instagramData) {
        const instagramPosts = JSON.parse(instagramData);
        if (Array.isArray(instagramPosts)) {
          stats.instagramVisibleCount = instagramPosts.filter(post => post.status === 'active').length;
          stats.instagramHiddenCount = instagramPosts.filter(post => post.status === 'inactive').length;
        }
      }
    } catch (error) {
      this.warn('Instagram投稿データの読み込みエラー:', error);
    }

    return stats;
  }

  /**
   * 統計の変更チェック
   */
  hasStatsChanged(newStats) {
    return Object.keys(newStats).some(key => 
      this.currentStats[key] !== newStats[key]
    );
  }

  /**
   * 統計カードの更新（アニメーション付き）
   */
  async updateStatCards(stats) {
    const updates = [
      { id: 'stat-published', value: stats.publishedCount },
      { id: 'stat-drafts', value: stats.draftCount },
      { id: 'stat-instagram-visible', value: stats.instagramVisibleCount },
      { id: 'stat-instagram-hidden', value: stats.instagramHiddenCount }
    ];

    // 全ての更新を並列実行
    await Promise.all(updates.map(update => this.updateStatCard(update.id, update.value)));
  }

  /**
   * 個別統計カードの更新
   */
  async updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (!element) {
      this.warn(`統計カード要素が見つかりません: ${id}`);
      return;
    }

    const currentValue = parseInt(element.textContent) || 0;
    
    if (currentValue !== value) {
      // アニメーション付きで更新
      element.style.transform = 'scale(1.1)';
      element.style.transition = `transform ${this.config.animationDuration}ms ease`;
      
      // 値の更新
      setTimeout(() => {
        element.textContent = value;
        element.style.transform = 'scale(1)';
        
        // 変更があったことを視覚的に示す
        element.style.color = '#4a90e2';
        setTimeout(() => {
          element.style.color = '';
        }, 500);
        
      }, this.config.animationDuration / 2);
    } else {
      element.textContent = value;
    }
  }

  /**
   * エラー状態の表示
   */
  showStatsError() {
    const statElements = ['stat-published', 'stat-drafts', 'stat-instagram-visible', 'stat-instagram-hidden'];
    
    statElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.color = '#dc3545';
        element.textContent = '---';
        
        // 5秒後に元に戻す
        setTimeout(() => {
          element.style.color = '';
        }, 5000);
      }
    });
  }

  /**
   * 自動更新の開始
   */
  startAutoUpdate() {
    if (this.updateIntervalId) {
      this.stopAutoUpdate();
    }
    
    this.updateIntervalId = setInterval(() => {
      this.updateStats();
    }, this.config.updateInterval);
    
    this.log(`自動更新開始 (${this.config.updateInterval}ms間隔)`, 'debug');
  }

  /**
   * 自動更新の停止
   */
  stopAutoUpdate() {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
      this.log('自動更新停止', 'debug');
    }
  }

  /**
   * 手動更新の実行
   */
  async refresh() {
    this.log('手動統計更新実行', 'info');
    await this.updateStats();
    
    // 成功通知
    this.notificationService.toast('統計を更新しました', 'success');
  }

  /**
   * 設定の更新
   */
  updateConfig(newConfig) {
    const oldInterval = this.config.updateInterval;
    this.config = { ...this.config, ...newConfig };
    
    // 更新間隔が変更された場合は自動更新を再起動
    if (oldInterval !== this.config.updateInterval) {
      this.stopAutoUpdate();
      this.startAutoUpdate();
    }
    
    this.log('設定が更新されました', 'info');
  }

  /**
   * 統計データの取得（外部アクセス用）
   */
  getCurrentStats() {
    return { ...this.currentStats };
  }

  /**
   * メトリクスの取得（リファクタリング効果測定用）
   */
  getMetrics() {
    return {
      updateInterval: this.config.updateInterval,
      lastUpdate: new Date().toISOString(),
      isAutoUpdating: !!this.updateIntervalId,
      currentStats: this.getCurrentStats(),
      componentStatus: 'active'
    };
  }

  /**
   * デバッグ情報の表示
   */
  showDebugInfo() {
    console.log('=== Dashboard Stats Widget Debug Info ===');
    console.log('Current Stats:', this.getCurrentStats());
    console.log('Config:', this.config);
    console.log('Metrics:', this.getMetrics());
    console.log('=========================================');
  }

  /**
   * コンポーネントの破棄
   */
  destroy() {
    this.stopAutoUpdate();
    
    // グローバル関数の削除
    delete window.updateDashboardStats;
    delete window.refreshStats;
    
    // イベントリスナーの削除
    window.removeEventListener('storage', this.updateStats);
    document.removeEventListener('visibilitychange', this.updateStats);
    
    this.initialized = false;
    this.log('DashboardStatsWidget destroyed', 'info');
  }
}

// シングルトンインスタンス
let dashboardStatsWidgetInstance = null;

/**
 * ダッシュボード統計ウィジェットのシングルトンインスタンスを取得
 */
export function getDashboardStatsWidget() {
  if (!dashboardStatsWidgetInstance) {
    dashboardStatsWidgetInstance = new DashboardStatsWidget();
  }
  return dashboardStatsWidgetInstance;
}

/**
 * 統計の手動更新
 */
export function refreshDashboardStats() {
  return getDashboardStatsWidget().refresh();
} 