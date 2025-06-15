/**
 * 統計・ダッシュボードモジュール - シンプル版
 * @version 1.0.0
 */

import { BaseModule } from './BaseModule.js';

/**
 * 統計・ダッシュボードモジュール
 */
export class StatsModule extends BaseModule {
  constructor() {
    super('Stats');
    
    this.config = {
      autoRefresh: true,
      refreshInterval: 60000, // 1分
      animationDuration: 500
    };
  }

  /**
   * セットアップ
   */
  async setup() {
    await this._initializeServices();
    this._bindEvents();
    this._setupAutoRefresh();
    await this.loadStats();
  }

  /**
   * サービス初期化
   */
  async _initializeServices() {
    try {
      const { getSupabaseDashboardStatsService } = await import('../services/SupabaseDashboardStatsService.js');
      
      this.statsService = getSupabaseDashboardStatsService();
      await this.statsService.init();
      
    } catch (error) {
      this.handleError(error, 'サービス初期化');
    }
  }

  /**
   * イベントバインド
   */
  _bindEvents() {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    // 更新ボタン
    const refreshBtn = dashboardSection.querySelector('[data-action="refresh"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadStats());
    }

    // 期間切り替え
    const periodSelect = dashboardSection.querySelector('#stats-period');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => this.loadStats());
    }
  }

  /**
   * 自動更新設定
   */
  _setupAutoRefresh() {
    if (!this.config.autoRefresh) return;

    setInterval(() => {
      this.loadStats(true); // サイレント更新
    }, this.config.refreshInterval);
  }

  /**
   * 統計データ読み込み
   */
  async loadStats(silent = false) {
    try {
      if (!silent) this.setState({ loading: true });
      
      const period = this._getSelectedPeriod();
      const stats = await this.statsService.getStats(period);
      
      this._displayStats(stats);
      
      if (!silent) this.notify('統計データを更新しました', 'success');
      
    } catch (error) {
      this.handleError(error, '統計データ読み込み');
      if (!silent) this.notify('データの取得に失敗しました', 'error');
    } finally {
      if (!silent) this.setState({ loading: false });
    }
  }

  /**
   * 統計データ表示
   */
  _displayStats(stats) {
    this._displayOverviewStats(stats.overview);
    this._displayCharts(stats.charts);
    this._displayRecentActivity(stats.recent);
  }

  /**
   * 概要統計表示
   */
  _displayOverviewStats(overview) {
    const container = document.querySelector('#stats-overview');
    if (!container || !overview) return;

    const statsHtml = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number" data-animate="${overview.totalNews || 0}">${overview.totalNews || 0}</div>
          <div class="stat-label">総ニュース数</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" data-animate="${overview.totalLessons || 0}">${overview.totalLessons || 0}</div>
          <div class="stat-label">総レッスン数</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" data-animate="${overview.totalInstagram || 0}">${overview.totalInstagram || 0}</div>
          <div class="stat-label">Instagram投稿</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" data-animate="${overview.activeUsers || 0}">${overview.activeUsers || 0}</div>
          <div class="stat-label">アクティブユーザー</div>
        </div>
      </div>
    `;

    container.innerHTML = statsHtml;
    this._animateNumbers();
  }

  /**
   * チャート表示
   */
  _displayCharts(charts) {
    const container = document.querySelector('#stats-charts');
    if (!container || !charts) return;

    // シンプルなテキストベースのチャート
    const chartsHtml = `
      <div class="charts-grid">
        <div class="chart-section">
          <h3>月別アクティビティ</h3>
          <div class="simple-chart">
            ${this._createSimpleBarChart(charts.monthly)}
          </div>
        </div>
        <div class="chart-section">
          <h3>カテゴリ別分布</h3>
          <div class="simple-chart">
            ${this._createSimplePieChart(charts.categories)}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = chartsHtml;
  }

  /**
   * 最近のアクティビティ表示
   */
  _displayRecentActivity(recent) {
    const container = document.querySelector('#recent-activity');
    if (!container || !recent) return;

    const activityHtml = recent.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${this._getActivityIcon(activity.type)}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-time">${this._formatTime(activity.timestamp)}</div>
        </div>
      </div>
    `).join('');

    container.innerHTML = activityHtml;
  }

  /**
   * 数字アニメーション
   */
  _animateNumbers() {
    const numbers = document.querySelectorAll('[data-animate]');
    numbers.forEach(element => {
      const target = parseInt(element.dataset.animate);
      const duration = this.config.animationDuration;
      const start = 0;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + (target - start) * progress);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * シンプルな棒グラフ作成
   */
  _createSimpleBarChart(data) {
    if (!data || !Array.isArray(data)) return '<p>データがありません</p>';

    const maxValue = Math.max(...data.map(item => item.value));
    
    return data.map(item => {
      const percentage = (item.value / maxValue) * 100;
      return `
        <div class="bar-item">
          <div class="bar-label">${item.label}</div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percentage}%"></div>
            <div class="bar-value">${item.value}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * シンプルな円グラフ作成
   */
  _createSimplePieChart(data) {
    if (!data || !Array.isArray(data)) return '<p>データがありません</p>';

    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return data.map(item => {
      const percentage = ((item.value / total) * 100).toFixed(1);
      return `
        <div class="pie-item">
          <div class="pie-color" style="background-color: ${item.color || '#ccc'}"></div>
          <div class="pie-label">${item.label}</div>
          <div class="pie-value">${item.value} (${percentage}%)</div>
        </div>
      `;
    }).join('');
  }

  /**
   * 選択された期間取得
   */
  _getSelectedPeriod() {
    const periodSelect = document.querySelector('#stats-period');
    return periodSelect ? periodSelect.value : '7d';
  }

  /**
   * アクティビティアイコン取得
   */
  _getActivityIcon(type) {
    const icons = {
      news: '📰',
      lesson: '📚',
      instagram: '📷',
      user: '👤',
      system: '⚙️'
    };
    return icons[type] || '📄';
  }

  /**
   * 時間フォーマット
   */
  _formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '1分未満前';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
    
    return date.toLocaleDateString('ja-JP');
  }
}

/**
 * StatsModuleインスタンス取得
 */
export function getStatsModule() {
  return new StatsModule();
} 