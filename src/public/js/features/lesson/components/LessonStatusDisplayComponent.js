/**
 * レッスン状況表示コンポーネント
 * LP側でレッスン開催状況を表示
 * @version 1.1.0 - 新アーキテクチャ対応
 */

import { BaseComponent } from '../../../shared/base/BaseComponent.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class LessonStatusDisplayComponent extends BaseComponent {
  constructor(element = '#today-status, .status-banner, .lesson-status, [data-action="toggle-status"]') {
    super(element, 'LessonStatusDisplayComponent');
    
    // サービス参照
    this.lessonStatusService = null;
    
    // DOM要素
    this.statusContainer = null;
    this.statusContent = null;
    this.refreshBtn = null;
    
    // 状態管理
    this.currentStatus = null;
    this.isVisible = false;
    this.autoRefreshInterval = null;
    
    // 設定
    this.autoRefreshIntervalTime = 60 * 1000; // 1分間隔で自動更新
    this.showEmptyStatus = true; // デフォルトで表示するように変更
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async doInit() {
    try {
      this.log('レッスン状況表示コンポーネント初期化開始');
      
      // サービス取得
      this.lessonStatusService = getLessonStatusStorageService();
      
      // サービスが初期化されていない場合は初期化
      if (!this.lessonStatusService.initialized) {
        await this.lessonStatusService.init();
      }
      
      // DOM要素の設定
      this.findDOMElements();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // 初期表示
      await this.loadAndDisplayStatus();
      
      // 自動更新開始
      this.startAutoRefresh();
      
      this.log('レッスン状況表示コンポーネント初期化完了');
      
    } catch (error) {
      this.error('初期化エラー:', error);
      // エラー時もコンテナを表示
      await this.renderErrorStatus(error);
    }
  }

  /**
   * DOM要素を取得
   * @private
   */
  findDOMElements() {
    // BaseComponentのelementを活用
    if (this.element) {
      // BaseComponentで見つかった要素をコンテナとして使用
      this.statusContainer = this.element;
      this.debug('BaseComponentの要素をステータスコンテナとして使用:', this.statusContainer.id || this.statusContainer.className);
    } else {
      // フォールバック: 既存のコンテナ検索
      this.statusContainer = this.safeQuerySelector('#today-status, .status-banner, .lesson-status-container, #lesson-status-display', document);
      
      if (!this.statusContainer) {
        // 動的にコンテナを作成
        this.createStatusContainer();
      }
    }
    
    // 内部要素の検索または作成
    if (this.statusContainer) {
      // 既存のHTML構造に合わせて要素を検索
      this.statusContent = this.safeQuerySelector('.status-content, .status-details', this.statusContainer);
      this.refreshBtn = this.safeQuerySelector('.refresh-btn', this.statusContainer);
      
      // 既存のステータス表示要素も確認
      this.statusHeader = this.safeQuerySelector('.status-header', this.statusContainer);
      this.statusIndicator = this.safeQuerySelector('#global-status-indicator, .status-indicator', this.statusContainer);
      this.statusMessage = this.safeQuerySelector('#global-status-message, .status-message', this.statusContainer);
      
      // 必要な内部要素が見つからない場合は作成
      if (!this.statusContent) {
        this.createStatusContent();
      }
    }
    
    this.debug('DOM要素取得完了', {
      container: !!this.statusContainer,
      content: !!this.statusContent,
      refreshBtn: !!this.refreshBtn,
      header: !!this.statusHeader,
      indicator: !!this.statusIndicator,
      message: !!this.statusMessage
    });
  }

  /**
   * ステータスコンテナを動的作成
   * @private
   */
  createStatusContainer() {
    // レッスン状況挿入位置を特定
    let insertTarget = document.querySelector('.status-header');
    
    if (!insertTarget) {
      // フォールバック: メインセクションの最初
      insertTarget = document.querySelector('main section:first-child, .hero-section');
    }
    
    if (insertTarget) {
      // コンテナHTML作成
      const containerHTML = `
        <div class="lesson-status-container" id="lesson-status-display">
          <div class="status-content">
            <div class="status-loading">
              <i class="fas fa-spinner fa-spin"></i>
              <span>レッスン状況を確認中...</span>
            </div>
          </div>
        </div>
      `;
      
      // 挿入
      insertTarget.insertAdjacentHTML('afterend', containerHTML);
      this.statusContainer = document.getElementById('lesson-status-display');
      this.statusContent = this.statusContainer.querySelector('.status-content');
      
      this.debug('ステータスコンテナを動的作成');
    } else {
      this.warn('ステータスコンテナの挿入位置が見つかりません');
    }
  }

  /**
   * ステータスコンテンツを作成
   * @private
   */
  createStatusContent() {
    if (!this.statusContainer) return;
    
    const contentHTML = `
      <div class="status-content">
        <div class="status-loading">
          <span>レッスン状況を確認中...</span>
        </div>
      </div>
    `;
    
    this.statusContainer.insertAdjacentHTML('beforeend', contentHTML);
    this.statusContent = this.safeQuerySelector('.status-content', this.statusContainer);
    
    this.debug('ステータスコンテンツを作成');
  }

  /**
   * イベントリスナー設定
   * @private
   */
  setupEventListeners() {
    // レッスン状況更新イベント
    EventBus.on('lessonStatus:updated', (data) => {
      this.handleStatusUpdate(data);
    });
    
    // レッスン状況同期イベント
    EventBus.on('lessonStatus:synced', (data) => {
      this.handleStatusSync(data);
    });
    
    // 手動更新ボタン
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => {
        this.refreshStatus();
      });
    }
    
    // ページ可視性変更時の更新
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.refreshStatus();
      }
    });
    
    this.debug('イベントリスナー設定完了');
  }

  /**
   * 今日のレッスン状況を読み込み
   * @returns {Promise<void>}
   */
  async loadAndDisplayStatus() {
    try {
      this.log('レッスン状況読み込み開始');
      
      const todayStatus = this.lessonStatusService.getTodayStatus();
      this.currentStatus = todayStatus;
      
      if (todayStatus && (todayStatus.globalStatus !== 'scheduled' || todayStatus.globalMessage || this.hasNonDefaultCourseStatus(todayStatus))) {
        // 通常開催以外、またはメッセージがある場合は表示
        await this.renderStatus(todayStatus);
      } else {
        // 通常開催でデフォルト表示設定の場合
        if (this.showEmptyStatus) {
          await this.renderDefaultStatus();
        } else {
          this.hideStatusContainer();
        }
      }
      
    } catch (error) {
      this.error('レッスン状況読み込みエラー:', error);
      await this.renderErrorStatus(error);
    }
  }

  /**
   * デフォルト以外のコースステータスがあるかチェック
   * @private
   * @param {Object} statusData - ステータスデータ
   * @returns {boolean}
   */
  hasNonDefaultCourseStatus(statusData) {
    if (!statusData.courses) return false;
    
    return Object.values(statusData.courses).some(course => 
      course.status !== 'scheduled' || course.message
    );
  }

  /**
   * レッスン状況を表示
   * @param {Object} statusData - レッスン状況データ
   * @returns {Promise<void>}
   */
  async renderStatus(statusData) {
    try {
      if (!this.statusContainer) {
        this.warn('ステータスコンテナが見つかりません');
        return;
      }
      
      // 通常開催で表示しない設定の場合
      if (!this.showEmptyStatus && this.isNormalStatus(statusData)) {
        this.hideStatusContainer();
        return;
      }
      
      // ステータス定義を取得
      const statusDef = this.lessonStatusService.getStatusDefinition(statusData.globalStatus);
      
      // 既存のHTML構造を活用して更新
      await this.updateExistingStructure(statusData, statusDef);
      
      // コンテナ表示
      this.showStatusContainer();
      
      // アニメーション適用
      this.applyStatusAnimation(statusData.globalStatus);
      
      this.debug('レッスン状況表示完了:', statusData.globalStatus);
      
    } catch (error) {
      this.error('レッスン状況表示エラー:', error);
      await this.renderErrorStatus(error);
    }
  }

  /**
   * 既存のHTML構造を更新
   * @private
   * @param {Object} statusData - レッスン状況データ
   * @param {Object} statusDef - ステータス定義
   */
  async updateExistingStructure(statusData, statusDef) {
    // ステータスインジケーターを更新
    if (this.statusIndicator) {
      this.statusIndicator.textContent = statusDef.displayText;
      this.statusIndicator.className = `status-indicator ${statusDef.cssClass}`;
    }
    
    // グローバルメッセージを更新
    if (this.statusMessage && statusData.globalMessage) {
      const messageText = this.statusMessage.querySelector('#global-message-text, .message-text');
      if (messageText) {
        messageText.textContent = statusData.globalMessage;
      }
      this.statusMessage.style.display = 'block';
    } else if (this.statusMessage) {
      this.statusMessage.style.display = 'none';
    }
    
    // ステータス詳細を更新
    if (this.statusContent) {
      const statusHTML = this.generateDetailedStatusHTML(statusData, statusDef);
      
      // 既存の詳細エリアを更新
      const detailsContainer = this.statusContent.querySelector('#status-details, .status-details');
      if (detailsContainer) {
        detailsContainer.innerHTML = statusHTML;
      } else {
        // 詳細エリアが存在しない場合は作成
        this.statusContent.innerHTML = `
          <div class="status-details" id="status-details">
            ${statusHTML}
          </div>
        `;
      }
    }
  }

  /**
   * 詳細なステータスHTMLを生成
   * @private
   * @param {Object} statusData - レッスン状況データ
   * @param {Object} statusDef - ステータス定義
   * @returns {string} HTML文字列
   */
  generateDetailedStatusHTML(statusData, statusDef) {
    const { globalStatus, courses } = statusData;
    
    // コース別詳細
    let coursesHTML = '';
    if (courses && Object.keys(courses).length > 0) {
      const courseItems = Object.entries(courses).map(([courseKey, courseData]) => {
        const courseDef = this.lessonStatusService.getStatusDefinition(courseData.status);
        const defaultCourse = this.lessonStatusService.defaultCourses?.[courseKey] || { name: courseKey, time: '時間未設定' };
        
        return `
          <div class="course-item ${courseDef.cssClass}">
            <div class="course-header">
              <h4>${defaultCourse.name}</h4>
              <span class="course-time">${defaultCourse.time}</span>
            </div>
            <div class="course-status">
              <span class="status-badge ${courseDef.cssClass}">
                ${courseDef.icon} ${courseDef.displayText}
              </span>
              ${courseData.message ? `<p class="course-message">${this.escapeHtml(courseData.message)}</p>` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      coursesHTML = `
        <div class="courses-detail">
          <h4>コース別詳細</h4>
          <div class="courses-grid">
            ${courseItems}
          </div>
        </div>
      `;
    }
    
    // 更新時刻
    const updateTimeHTML = statusData.lastUpdated ? `
      <div class="status-footer">
        <small class="update-time">
          最終更新: ${this.formatDateTime(statusData.lastUpdated)}
        </small>
        <button class="refresh-btn" title="状況を更新">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
    ` : '';
    
    return `
      <div class="main-status-info ${statusDef.cssClass}">
        <div class="status-icon">${statusDef.icon}</div>
        <div class="status-description">
          <h3>${statusDef.displayText}</h3>
          ${statusData.globalMessage ? `<p class="global-message">${this.escapeHtml(statusData.globalMessage)}</p>` : ''}
        </div>
      </div>
      ${coursesHTML}
      ${updateTimeHTML}
    `;
  }

  /**
   * デフォルトステータスを表示
   * @returns {Promise<void>}
   */
  async renderDefaultStatus() {
    if (!this.showEmptyStatus) {
      this.hideStatusContainer();
      return;
    }
    
    // デフォルトの通常開催ステータス
    const defaultStatus = {
      globalStatus: 'scheduled',
      globalMessage: '',
      courses: {}
    };
    
    // ステータス定義を取得
    const statusDef = this.lessonStatusService.getStatusDefinition('scheduled');
    
    // 既存のHTML構造を活用して更新
    await this.updateExistingStructure(defaultStatus, statusDef);
    
    // ステータスインジケーターのデフォルト表示
    if (this.statusIndicator) {
      this.statusIndicator.textContent = '通常開催';
      this.statusIndicator.className = 'status-indicator scheduled';
    }
    
    // ステータス詳細にデフォルトメッセージを表示
    if (this.statusContent) {
      const detailsContainer = this.statusContent.querySelector('#status-details, .status-details');
      if (detailsContainer) {
        detailsContainer.innerHTML = `
          <div class="main-status-info scheduled">
            <div class="status-icon">✅</div>
            <div class="status-description">
              <h3>通常開催</h3>
              <p>予定通りレッスンを開催いたします</p>
            </div>
          </div>
        `;
      }
    }
    
    this.showStatusContainer();
  }

  /**
   * エラーステータスを表示
   * @param {Error} error - エラーオブジェクト
   * @returns {Promise<void>}
   */
  async renderErrorStatus(error) {
    const errorHTML = `
      <div class="lesson-status-display error">
        <div class="main-status error">
          <div class="status-icon">⚠️</div>
          <div class="status-text">
            <h3>レッスン状況の取得に失敗しました</h3>
            <p class="error-message">しばらく時間をおいて再度お試しください</p>
          </div>
        </div>
        <div class="status-footer">
          <button class="refresh-btn retry" title="再試行">
            <i class="fas fa-redo"></i> 再試行
          </button>
        </div>
      </div>
    `;
    
    if (this.statusContent) {
      this.statusContent.innerHTML = errorHTML;
      this.showStatusContainer();
      
      // 再試行ボタンのイベントリスナー
      const retryBtn = this.statusContent.querySelector('.retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.refreshStatus();
        });
      }
    }
    
    this.error('エラーステータス表示:', error.message);
  }

  /**
   * ステータス更新イベントハンドラ
   * @private
   * @param {Object} data - 更新データ
   */
  async handleStatusUpdate(data) {
    if (data.date === this.lessonStatusService.getTodayDate()) {
      this.log('今日のレッスン状況が更新されました');
      this.currentStatus = data.status;
      await this.renderStatus(data.status);
    }
  }

  /**
   * ステータス同期イベントハンドラ
   * @private
   * @param {Object} data - 同期データ
   */
  async handleStatusSync(data) {
    this.debug('レッスン状況同期イベント受信:', data.source);
    if (data.source === 'external') {
      await this.refreshStatus();
    }
  }

  /**
   * ステータスを手動更新
   * @returns {Promise<void>}
   */
  async refreshStatus() {
    try {
      this.debug('ステータス手動更新開始');
      await this.loadAndDisplayStatus();
    } catch (error) {
      this.error('ステータス更新エラー:', error);
    }
  }

  /**
   * 通常開催かどうかを判定
   * @private
   * @param {Object} statusData - レッスン状況データ
   * @returns {boolean} 通常開催の場合true
   */
  isNormalStatus(statusData) {
    // グローバルステータスが通常開催で、メッセージがない
    const isGlobalNormal = statusData.globalStatus === 'scheduled' && !statusData.globalMessage;
    
    // 全コースが通常開催で、メッセージがない
    const isAllCoursesNormal = Object.values(statusData.courses || {}).every(course => 
      course.status === 'scheduled' && !course.message
    );
    
    return isGlobalNormal && isAllCoursesNormal;
  }

  /**
   * ステータスコンテナを表示
   * @private
   */
  showStatusContainer() {
    if (this.statusContainer) {
      this.statusContainer.style.display = 'block';
      this.statusContainer.classList.add('visible');
      this.isVisible = true;
      this.debug('ステータスコンテナを表示');
    }
  }

  /**
   * ステータスコンテナを非表示
   * @private
   */
  hideStatusContainer() {
    if (this.statusContainer) {
      this.statusContainer.style.display = 'none';
      this.statusContainer.classList.remove('visible');
      this.isVisible = false;
      this.debug('ステータスコンテナを非表示');
    }
  }

  /**
   * ローディング表示
   * @private
   */
  showLoading() {
    if (this.statusContent) {
      this.statusContent.innerHTML = `
        <div class="status-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <span>レッスン状況を確認中...</span>
        </div>
      `;
      this.showStatusContainer();
    }
  }

  /**
   * ステータスアニメーション適用
   * @private
   * @param {string} status - ステータスキー
   */
  applyStatusAnimation(status) {
    if (this.statusContainer) {
      // 既存のアニメーションクラスを削除
      this.statusContainer.classList.remove('fade-in', 'slide-in', 'bounce-in');
      
      // ステータスに応じたアニメーション
      switch (status) {
        case 'cancelled':
          this.statusContainer.classList.add('bounce-in');
          break;
        case 'indoor':
        case 'postponed':
          this.statusContainer.classList.add('slide-in');
          break;
        default:
          this.statusContainer.classList.add('fade-in');
      }
    }
  }

  /**
   * 自動更新を開始
   * @private
   */
  startAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    
    this.autoRefreshInterval = setInterval(() => {
      this.refreshStatus();
    }, this.autoRefreshIntervalTime);
    
    this.debug('自動更新開始 - 間隔:', this.autoRefreshIntervalTime);
  }

  /**
   * 自動更新停止
   * @private
   */
  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      this.debug('自動更新停止');
    }
  }

  /**
   * 日時フォーマット
   * @private
   * @param {string} dateString - ISO日時文字列
   * @returns {string} フォーマットされた日時
   */
  formatDateTime(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '不明';
    }
  }

  /**
   * HTMLエスケープ
   * @private
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 表示設定更新
   * @param {Object} options - 表示オプション
   */
  updateDisplayOptions(options = {}) {
    if (typeof options.showEmptyStatus === 'boolean') {
      this.showEmptyStatus = options.showEmptyStatus;
    }
    
    if (typeof options.autoRefreshInterval === 'number') {
      this.stopAutoRefresh();
      this.autoRefreshInterval = options.autoRefreshInterval;
      this.startAutoRefresh();
    }
    
    this.debug('表示設定更新:', options);
  }

  /**
   * 現在の状況を取得
   * @returns {Object|null} 現在のレッスン状況
   */
  getCurrentStatus() {
    return this.currentStatus;
  }

  /**
   * 表示状態を取得
   * @returns {boolean} 表示中の場合true
   */
  isDisplayVisible() {
    return this.isVisible;
  }

  /**
   * コンポーネント破棄
   * @returns {Promise<void>}
   */
  async doDestroy() {
    try {
      this.log('レッスン状況表示コンポーネント破棄開始');
      
      // 自動更新停止
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = null;
      }
      
      // イベントリスナー削除
      EventBus.off('lessonStatus:updated');
      EventBus.off('lessonStatus:synced');
      
      // DOM参照クリア
      this.statusContainer = null;
      this.statusContent = null;
      this.refreshBtn = null;
      this.statusHeader = null;
      this.statusIndicator = null;
      this.statusMessage = null;
      
      // 状態クリア
      this.currentStatus = null;
      this.isVisible = false;
      
      this.log('レッスン状況表示コンポーネント破棄完了');
      
    } catch (error) {
      this.error('破棄エラー:', error);
    }
  }
}

export default LessonStatusDisplayComponent; 