/**
 * ダッシュボード統計ウィジェット - UI専門版
 * @version 4.0.0 - UnifiedDashboardStatsService完全統合・軽量化版
 * @description データ取得はUnifiedDashboardStatsServiceに委譲、UI操作のみに専念
 */

import { Component } from '../../../lib/base/Component.js';
import { CONFIG } from '../../../shared/constants/config.js';
import { getAdminNotificationService } from '../../../shared/services/AdminNotificationService.js';
import { getUnifiedDashboardStatsService } from '../services/UnifiedDashboardStatsService.js';

export class DashboardStatsWidget extends Component {
  constructor() {
    super({ autoInit: false });
    this.componentName = 'DashboardStatsWidget';
    
    // 統一ダッシュボード統計サービス（データ専門）
    this.unifiedStatsService = getUnifiedDashboardStatsService();
    
    // UI設定のみ
    this.config = {
      updateInterval: 5000,        // 5秒間隔
      animationDuration: 200,      // アニメーション時間
      autoRefresh: true            // 自動更新
    };
    
    // UI状態管理
    this.currentDisplayStats = {};
    this.updateIntervalId = null;
    this.notificationService = getAdminNotificationService();
    this.initialized = false;
    
    // ログ（CONFIG統合）
    this.log = CONFIG.helpers.log;
  }

  /**
   * 初期化（軽量版）
   */
  async init() {
    if (this.initialized) return;
    
    try {
      this.log('info', 'DashboardStatsWidget初期化開始 - UI専門版');
      
      // 統一サービスの初期化
      await this.unifiedStatsService.init();
      
      // DOM要素の確認
      this.validateAndMapStatElements();
      
      // UI イベントの設定
      this.setupUIEventListeners();
      
      // 初回表示更新
      await this.refreshDisplay();
      
      // 自動更新の開始
      if (this.config.autoRefresh) {
        this.startAutoRefresh();
      }
      
      // グローバルUI関数の公開
      this.setupGlobalUIHelpers();
      
      this.initialized = true;
      this.log('info', 'DashboardStatsWidget初期化完了 - UI専門版');
      
    } catch (error) {
      this.log('error', 'DashboardStatsWidget初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 統計表示要素のマッピング（実HTML対応・完全版）
   */
  validateAndMapStatElements() {
    // 全タブの統計表示要素をマッピング
    this.statElementMap = {
      // ===== ダッシュボードタブ =====
      dashboard: {
        'stat-published': { 
          type: 'publishedCount', 
          label: '公開記事数',
          icon: 'fas fa-newspaper',
          color: '#28a745'
        },
        'stat-drafts': { 
          type: 'draftCount', 
          label: '下書き記事数',
          icon: 'fas fa-edit',
          color: '#ffc107'
        },
        'stat-instagram-visible': { 
          type: 'instagramActiveCount', 
          label: '表示中Instagram投稿数',
          icon: 'fab fa-instagram',
          color: '#e4405f'
        },
        'stat-instagram-hidden': { 
          type: 'instagramInactiveCount', 
          label: '非表示Instagram投稿数',
          icon: 'fas fa-eye-slash',
          color: '#6c757d'
        }
      },
      
      // ===== Instagram設定タブ =====
      instagram: {
        'total-posts': { 
          type: 'totalInstagram', 
          label: '総Instagram投稿数',
          icon: 'fab fa-instagram',
          color: '#e4405f'
        },
        'active-posts': { 
          type: 'instagramActiveCount', 
          label: '表示中Instagram投稿数',
          icon: 'fas fa-eye',
          color: '#28a745'
        },
        'featured-posts': { 
          type: 'featuredInstagramCount', 
          label: '注目Instagram投稿数',
          icon: 'fas fa-star',
          color: '#ffc107'
        },
        'inactive-posts': { 
          type: 'instagramInactiveCount', 
          label: '非表示Instagram投稿数',
          icon: 'fas fa-eye-slash',
          color: '#6c757d'
        }
      },
      
      // ===== 設定データタブ =====
      settings: {
        'total-articles': { 
          type: 'totalArticles', 
          label: '記事総数',
          icon: 'fas fa-newspaper',
          color: '#007bff'
        },
        'total-instagram': { 
          type: 'totalInstagram', 
          label: 'Instagram投稿総数',
          icon: 'fab fa-instagram',
          color: '#e4405f'
        },
        'total-lessons': { 
          type: 'totalLessons', 
          label: 'レッスン記録総数',
          icon: 'fas fa-calendar-check',
          color: '#6f42c1'
        },
        'storage-usage': { 
          type: 'storageUsage', 
          label: 'ストレージ使用量',
          icon: 'fas fa-hdd',
          color: '#17a2b8',
          isSpecial: true // 特別処理が必要
        }
      }
    };
    
    // 実際に存在する要素をチェック
    this.availableElements = [];
    Object.values(this.statElementMap).forEach(tabElements => {
      Object.keys(tabElements).forEach(elementId => {
        if (document.getElementById(elementId)) {
          this.availableElements.push(elementId);
        }
      });
    });
    
    this.log('debug', `統計表示要素マッピング完了: ${this.availableElements.length}個の要素が利用可能`);
    
    return this.availableElements.length > 0;
  }

  /**
   * UI イベントリスナーの設定（UI専門）
   */
  setupUIEventListeners() {
    // ページ可視性変更の監視
    this.visibilityListener = () => {
      if (document.hidden) {
        this.log('debug', 'ページ非表示 - 自動更新停止');
        this.stopAutoRefresh();
      } else {
        this.log('debug', 'ページ表示 - 自動更新再開');
        this.startAutoRefresh();
        this.refreshDisplay(); // 即座に表示更新
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityListener);
    
    // 統一サービスからの統計更新通知を監視
    this.statsUpdateListener = (event) => {
      if (event.detail && event.detail.source === 'UnifiedDashboardStatsService') {
        this.log('debug', '統一サービスからの統計更新通知を受信');
        this.refreshDisplay();
      }
    };
    
    document.addEventListener('statsUpdated', this.statsUpdateListener);
    
    this.log('debug', 'UIイベントリスナー設定完了');
  }

  /**
   * 表示の更新（UI専門・軽量版）
   */
  async refreshDisplay() {
    try {
      this.log('debug', '統計表示更新開始');
      
      // 統一サービスから統計データを取得（計算はすべて委譲）
      const newStats = await this.unifiedStatsService.getDashboardStats();
      
      // 表示の変更があった場合のみアニメーション付きで更新
      if (this.hasDisplayChanged(newStats)) {
        await this.updateAllDisplayElements(newStats);
        this.currentDisplayStats = { ...newStats };
        
        this.log('debug', '📊 統計表示更新完了:', newStats);
        
        // 成功通知（CONFIG設定に従って）
        if (CONFIG.admin.features.notifications) {
          this.showUpdateSuccess();
        }
      } else {
        this.log('debug', '統計表示に変更なし');
      }
      
    } catch (error) {
      this.log('error', '統計表示更新エラー:', error);
      this.showDisplayError();
    }
  }

  /**
   * 表示変更の確認
   */
  hasDisplayChanged(newStats) {
    return Object.keys(newStats).some(key => 
      this.currentDisplayStats[key] !== newStats[key]
    );
  }

  /**
   * 全表示要素の更新（アニメーション付き）
   */
  async updateAllDisplayElements(stats) {
    const updatePromises = [];
    
    // すべてのタブの要素を並列更新
    Object.values(this.statElementMap).forEach(tabElements => {
      Object.entries(tabElements).forEach(([elementId, config]) => {
        if (this.availableElements.includes(elementId)) {
          updatePromises.push(
            this.updateDisplayElement(elementId, stats, config)
          );
        }
      });
    });

    // 全更新を並列実行
    await Promise.all(updatePromises);
    
    this.log('debug', `統計表示要素更新完了: ${updatePromises.length}件`);
  }

  /**
   * 個別表示要素の更新（アニメーション付き）
   */
  async updateDisplayElement(elementId, stats, config) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      let newValue;
      
      // 特別処理が必要な要素
      if (config.isSpecial && config.type === 'storageUsage') {
        const usage = this.unifiedStatsService.getStorageUsage();
        newValue = `${usage.totalKB}KB`;
      } else {
        // 通常の統計値
        newValue = stats[config.type] || 0;
      }
      
      const currentValue = element.textContent;
      
      if (currentValue !== String(newValue)) {
        this.log('debug', `表示要素更新: ${config.label} ${currentValue} → ${newValue}`);
        
        // アニメーション付きで更新
        await this.animateValueChange(element, newValue, config);
        
        // データ属性で最終更新時刻を記録
        element.setAttribute('data-last-updated', new Date().toISOString());
        element.setAttribute('data-stat-type', config.type);
      }
      
    } catch (error) {
      this.log('warn', `表示要素更新エラー (${elementId}):`, error);
    }
  }

  /**
   * 値変更アニメーション
   */
  async animateValueChange(element, newValue, config) {
    return new Promise((resolve) => {
      // スケールアニメーション
      element.style.transform = 'scale(1.1)';
      element.style.transition = `transform ${this.config.animationDuration}ms ease`;
      element.style.color = config.color || '#007bff';
      
      setTimeout(() => {
        element.textContent = newValue;
        element.style.transform = 'scale(1)';
        
        // 色をリセット
        setTimeout(() => {
          element.style.color = '';
          resolve();
        }, this.config.animationDuration);
        
      }, this.config.animationDuration / 2);
    });
  }

  /**
   * エラー表示（UI専門）
   */
  showDisplayError() {
    this.availableElements.forEach(elementId => {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.color = '#dc3545';
        element.textContent = '---';
        element.setAttribute('data-error', 'true');
        
        // 5秒後に元に戻す
        setTimeout(() => {
          element.style.color = '';
          element.removeAttribute('data-error');
        }, 5000);
      }
    });
    
    if (this.notificationService) {
      this.notificationService.toast('統計表示の更新に失敗しました', 'error');
    }
  }

  /**
   * 更新成功表示
   */
  showUpdateSuccess() {
    if (this.notificationService) {
      this.notificationService.toast('統計データを更新しました', 'success', 1000);
    }
  }

  /**
   * 自動更新の開始
   */
  startAutoRefresh() {
    if (this.updateIntervalId) {
      this.stopAutoRefresh();
    }
    
    this.updateIntervalId = setInterval(() => {
      this.refreshDisplay();
    }, this.config.updateInterval);
    
    this.log('debug', `自動表示更新開始 (${this.config.updateInterval}ms間隔)`);
  }

  /**
   * 自動更新の停止
   */
  stopAutoRefresh() {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
      this.log('debug', '自動表示更新停止');
    }
  }

  /**
   * 手動更新の実行
   */
  async manualRefresh() {
    this.log('info', '手動統計表示更新実行');
    
    try {
      // 統一サービスに統計の強制更新を依頼
      await this.unifiedStatsService.forceRefresh();
      
      // 表示更新
      await this.refreshDisplay();
      
      this.log('info', '手動表示更新完了');
      
    } catch (error) {
      this.log('error', '手動表示更新エラー:', error);
      this.showDisplayError();
    }
  }

  /**
   * グローバルUIヘルパー関数の設定
   */
  setupGlobalUIHelpers() {
    // 表示更新関数のグローバル公開
    window.updateDashboardDisplay = () => this.refreshDisplay();
    window.refreshDashboardDisplay = () => this.manualRefresh();
    
    this.log('debug', 'グローバルUIヘルパー関数設定完了');
  }

  /**
   * UI設定の更新
   */
  updateUIConfig(newConfig) {
    const oldInterval = this.config.updateInterval;
    this.config = { ...this.config, ...newConfig };
    
    // 更新間隔が変更された場合は自動更新を再起動
    if (oldInterval !== this.config.updateInterval && this.config.autoRefresh) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
      this.log('info', `表示更新間隔変更: ${oldInterval}ms → ${this.config.updateInterval}ms`);
    }
  }

  /**
   * 現在の表示統計の取得
   */
  getCurrentDisplayStats() {
    return { ...this.currentDisplayStats };
  }

  /**
   * UIデバッグ情報の表示
   */
  showUIDebugInfo() {
    console.log('=== DashboardStatsWidget UI Debug Info ===');
    console.log('Available Elements:', this.availableElements);
    console.log('Current Display Stats:', this.currentDisplayStats);
    console.log('UI Config:', this.config);
    console.log('Element Mapping:', this.statElementMap);
    console.log('Auto Refresh Active:', !!this.updateIntervalId);
    console.log('==========================================');
  }

  /**
   * コンポーネントの破棄
   */
  destroy() {
    this.log('info', 'DashboardStatsWidget破棄開始');
    
    // 自動更新停止
    this.stopAutoRefresh();
    
    // グローバル関数の削除
    delete window.updateDashboardDisplay;
    delete window.refreshDashboardDisplay;
    
    // イベントリスナーの削除
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }
    if (this.statsUpdateListener) {
      document.removeEventListener('statsUpdated', this.statsUpdateListener);
    }
    
    // 状態リセット
    this.currentDisplayStats = {};
    this.availableElements = [];
    
    this.initialized = false;
    
    this.log('info', 'DashboardStatsWidget破棄完了 - UI専門版');
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
 * 統計表示の手動更新
 */
export function refreshDashboardDisplay() {
  return getDashboardStatsWidget().manualRefresh();
} 