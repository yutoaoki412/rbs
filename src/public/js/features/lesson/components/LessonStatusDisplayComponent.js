/**
 * レッスン状況表示コンポーネント - レイアウト・アニメーション修正版
 * LP側でレッスン開催状況を表示
 * @version 2.1.0 - アニメーション・レイアウト修正
 */

import { Component } from '../../../shared/base/Component.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class LessonStatusDisplayComponent extends Component {
  constructor(element = '#today-status') {
    super({ autoInit: false });
    
    this.componentName = 'LessonStatusDisplayComponent';
    
    // DOM要素の設定
    this.element = this.resolveElement(element);
    
    // サービス参照
    this.lessonStatusService = null;
    
    // DOM要素
    this.statusContainer = null;
    this.statusHeader = null;
    this.statusContent = null;
    this.statusDetails = null;
    this.globalStatusIndicator = null;
    this.toggleIcon = null;
    
    // 状態管理
    this.currentStatus = null;
    this.isVisible = false;
    this.isExpanded = false;
    this.autoRefreshInterval = null;
    
    // 設定
    this.config = {
      autoRefreshInterval: 60 * 1000, // 1分間隔
      maxRetries: 3,
      retryDelay: 2000,
      animationDuration: 400
    };
  }

  /**
   * 要素を解決
   * @param {string|Element} element - 要素またはセレクタ
   * @returns {Element|null}
   */
  resolveElement(element) {
    if (typeof element === 'string') {
      return document.querySelector(element);
    }
    return element;
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized) {
      this.log('既に初期化済みです');
      return;
    }
    
    try {
      this.log('レッスン状況表示コンポーネント初期化開始');
      
      // 要素の確認と準備
      await this.prepareElement();
      
      // DOM要素の取得
      this.findDOMElements();
      
      // 基本表示の確保
      this.ensureVisibility();
      
      // サービス初期化
      await this.initializeService();
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      // 初期データ読み込み
      await this.loadAndDisplayStatus();
      
      this.isInitialized = true;
      this.log('レッスン状況表示コンポーネント初期化完了');
      
    } catch (error) {
      this.error('レッスン状況表示コンポーネント初期化エラー:', error);
      this.showFallbackStatus();
    }
  }

  /**
   * 要素の準備
   * @private
   */
  async prepareElement() {
    if (!this.element) {
      this.warn('ステータスバナー要素が見つかりません');
      this.element = this.createDefaultElement();
    }
    
    // 必要なクラスを追加
    this.element.classList.add('status-banner');
    this.element.classList.remove('status-banner-hidden');
    this.element.classList.add('status-banner-visible');
    
    // 基本構造の確保
    this.ensureBasicStructure();
  }

  /**
   * デフォルト要素の作成
   * @private
   * @returns {Element}
   */
  createDefaultElement() {
    const section = document.createElement('section');
    section.id = 'today-status';
    section.className = 'status-banner';
    
    // ヒーローセクションの直後に挿入
    const heroSection = document.querySelector('#hero');
    if (heroSection && heroSection.parentNode) {
      heroSection.parentNode.insertBefore(section, heroSection.nextSibling);
      this.log('デフォルトステータスバナー要素をヒーローセクション直後に作成しました');
    } else {
      // フォールバック: bodyに追加
      document.body.appendChild(section);
      this.log('デフォルトステータスバナー要素をbodyに作成しました（フォールバック）');
    }
    
    return section;
  }

  /**
   * 基本構造の確保
   * @private
   */
  ensureBasicStructure() {
    if (!this.element.querySelector('.container')) {
      this.element.innerHTML = this.getDefaultHTML();
    }
  }

  /**
   * デフォルトHTMLの取得
   * @private
   * @returns {string}
   */
  getDefaultHTML() {
    return `
      <div class="container">
        <div class="status-header" data-action="toggle-status" style="cursor: pointer;" aria-expanded="false">
          <div class="status-info">
            <span class="status-dot"></span>
            <span class="status-text">本日のレッスン開催状況</span>
            <span class="status-indicator" id="global-status-indicator">準備中...</span>
          </div>
          <div class="status-meta">
            <span class="status-update-time" id="status-update-time"></span>
            <span class="toggle-icon">
              <i class="fas fa-chevron-down"></i>
            </span>
          </div>
        </div>
        <div class="status-content">
          <div class="status-details" id="status-details">
            <div class="loading-status">
              <i class="fas fa-spinner fa-spin"></i>
              <p>レッスン状況を読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * DOM要素を検索
   * @private
   */
  findDOMElements() {
    this.statusContainer = this.element;
    this.statusHeader = this.element.querySelector('.status-header');
    this.statusContent = this.element.querySelector('.status-content');
    this.statusDetails = this.element.querySelector('.status-details');
    this.globalStatusIndicator = this.element.querySelector('#global-status-indicator');
    this.toggleIcon = this.element.querySelector('.toggle-icon');
    
    this.debug('DOM要素検索完了:', {
      container: !!this.statusContainer,
      header: !!this.statusHeader,
      content: !!this.statusContent,
      details: !!this.statusDetails,
      indicator: !!this.globalStatusIndicator,
      toggle: !!this.toggleIcon
    });
  }

  /**
   * 表示を確保
   * @private
   */
  ensureVisibility() {
    if (this.statusContainer) {
      this.statusContainer.style.display = 'block';
      this.statusContainer.style.visibility = 'visible';
      this.statusContainer.style.opacity = '1';
      this.statusContainer.style.transform = 'translateY(0)';
      this.isVisible = true;
      this.log('ステータスバナーの表示を確保しました');
      
      // 初期状態設定（折りたたみ状態）
      this.resetToCollapsedState();
    }
  }

  /**
   * 折りたたみ状態にリセット
   * @private
   */
  resetToCollapsedState() {
    if (this.statusContent) {
      this.statusContent.style.maxHeight = '0';
      this.statusContent.style.overflow = 'hidden';
    }
    
    if (this.statusHeader) {
      this.statusHeader.setAttribute('aria-expanded', 'false');
    }
    
    if (this.toggleIcon) {
      const iconElement = this.toggleIcon.querySelector('i');
      if (iconElement) {
        iconElement.className = 'fas fa-chevron-down';
      }
    }
    
    this.statusContainer.classList.remove('expanded');
    this.isExpanded = false;
  }

  /**
   * サービス初期化
   * @private
   */
  async initializeService() {
    try {
      this.lessonStatusService = getLessonStatusStorageService();
      if (!this.lessonStatusService.initialized) {
        await this.lessonStatusService.init();
      }
      this.debug('レッスン状況サービス初期化完了');
    } catch (error) {
      this.warn('レッスン状況サービス初期化失敗:', error);
      this.lessonStatusService = null;
    }
  }

  /**
   * イベントリスナーの設定
   * @private
   */
  setupEventListeners() {
    if (this.statusHeader) {
      // 既存のイベントリスナーを削除（重複防止）
      this.statusHeader.removeEventListener('click', this.handleToggleClick);
      this.statusHeader.removeEventListener('keydown', this.handleToggleKeydown);
      
      // イベントハンドラーをバインド
      this.handleToggleClick = this.handleToggleClick.bind(this);
      this.handleToggleKeydown = this.handleToggleKeydown.bind(this);
      
      // イベントリスナーを設定
      this.statusHeader.addEventListener('click', this.handleToggleClick);
      this.statusHeader.addEventListener('keydown', this.handleToggleKeydown);
      
      this.debug('イベントリスナー設定完了');
    }
    
    // リサイズイベント
    this.handleResize = this.debounce(() => {
      this.adjustLayout();
    }, 250);
    
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * クリックイベントハンドラー
   * @private
   * @param {Event} e 
   */
  handleToggleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.toggleContent();
  }

  /**
   * キーダウンイベントハンドラー
   * @private
   * @param {Event} e 
   */
  handleToggleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      this.toggleContent();
    }
  }

  /**
   * レッスン状況を読み込んで表示
   * @param {string} [date] - 表示する日付
   * @returns {Promise<void>}
   */
  async loadAndDisplayStatus(date = null) {
    let retries = 0;
    
    while (retries < this.config.maxRetries) {
      try {
        this.showLoadingState();
        
        const status = await this.fetchStatus(date);
        this.currentStatus = status;
        
        this.updateDisplay(status);
        this.log('レッスン状況表示更新完了');
        return;
        
      } catch (error) {
        retries++;
        this.warn(`レッスン状況取得失敗 (試行 ${retries}/${this.config.maxRetries}):`, error);
        
        if (retries < this.config.maxRetries) {
          await this.sleep(this.config.retryDelay);
        } else {
          this.showFallbackStatus();
        }
      }
    }
  }

  /**
   * レッスン状況を強制的に再読み込み
   * 管理画面からの更新時に使用
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      this.debug('レッスン状況を強制再読み込み');
      await this.loadAndDisplayStatus();
    } catch (error) {
      this.error('レッスン状況再読み込みエラー:', error);
    }
  }

  /**
   * ステータスデータの取得
   * @private
   * @param {string} [date] - 日付
   * @returns {Promise<Object>}
   */
  async fetchStatus(date) {
    if (this.lessonStatusService) {
      return date ? 
        this.lessonStatusService.getStatusByDate(date) : 
        this.lessonStatusService.getTodayStatus();
    } else {
      return this.createFallbackStatus();
    }
  }

  /**
   * フォールバック用のデフォルトステータス
   * @private
   * @returns {Object}
   */
  createFallbackStatus() {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      date: today,
      globalStatus: 'scheduled',
      globalMessage: '本日のレッスンは通常通り開催予定です。',
      courses: {
        basic: {
          name: 'ベーシックコース（年長〜小3）',
          time: '17:00-17:50',
          status: 'scheduled',
          message: ''
        },
        advance: {
          name: 'アドバンスコース（小4〜小6）',
          time: '18:00-18:50',
          status: 'scheduled',
          message: ''
        }
      },
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * フォールバック状態の表示
   * @private
   */
  showFallbackStatus() {
    this.error('フォールバック状態を表示します');
    const fallbackStatus = this.createFallbackStatus();
    this.updateDisplay(fallbackStatus);
  }

  /**
   * 表示の更新
   * @private
   * @param {Object} status - ステータスデータ
   */
  updateDisplay(status) {
    try {
      // グローバルステータス更新
      this.updateGlobalStatus(status.globalStatus);
      
      // 詳細内容更新
      this.updateStatusDetails(status);
      
      // 更新日時を表示
      if (status.lastUpdated) {
        const updateTime = new Date(status.lastUpdated);
        const timeString = updateTime.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
        this.updateTimestamp(`更新: ${timeString}`);
      } else {
        this.updateTimestamp();
      }
      
      this.isVisible = true;
      this.debug('表示更新完了');
      
    } catch (error) {
      this.error('表示更新エラー:', error);
    }
  }

  /**
   * グローバルステータスの更新
   * @private
   * @param {string} status - ステータス
   */
  updateGlobalStatus(status) {
    if (this.globalStatusIndicator) {
      const statusDef = this.getStatusDefinition(status);
      this.globalStatusIndicator.textContent = statusDef.displayText;
      this.globalStatusIndicator.className = `status-indicator ${statusDef.cssClass}`;
    }
  }

  /**
   * ステータス詳細の更新
   * @private
   * @param {Object} status - ステータスデータ
   */
  updateStatusDetails(status) {
    if (!this.statusDetails) return;
    
    const html = this.generateStatusHTML(status);
    this.statusDetails.innerHTML = html;
  }

  /**
   * ステータスHTMLの生成
   * @private
   * @param {Object} status - ステータスデータ
   * @returns {string}
   */
  generateStatusHTML(status) {
    const { globalMessage, courses } = status;
    
    let html = '';

    // グローバルメッセージ（必要な場合のみ）
    if (globalMessage) {
      html += `
        <div class="global-message">
          <p>${this.escapeHtml(globalMessage)}</p>
        </div>
      `;
    }

    // コース状況（メインコンテンツ）
    if (courses && Object.keys(courses).length > 0) {
      html += '<div class="courses-status">';
      
      Object.entries(courses).forEach(([courseKey, courseData]) => {
        const courseDef = this.getStatusDefinition(courseData.status);
        html += `
          <div class="course-item">
            <div class="course-header">
              <div class="course-info">
                <h5>${this.escapeHtml(courseData.name)}</h5>
                <div class="course-time">${this.escapeHtml(courseData.time)}</div>
              </div>
              <div class="status-badge ${courseDef.cssClass}">
                ${courseDef.displayText}
              </div>
            </div>
            ${courseData.message ? `
              <div class="course-message">
                <p>${this.escapeHtml(courseData.message)}</p>
              </div>
            ` : ''}
          </div>
        `;
      });
      
      html += '</div>';
    } else {
      // コース情報がない場合のフォールバック
      html += `
        <div class="loading-status">
          <p>コース情報を読み込み中...</p>
        </div>
      `;
    }

    return html;
  }

  /**
   * ステータス定義の取得
   * @private
   * @param {string} status - ステータス
   * @returns {Object}
   */
  getStatusDefinition(status) {
    const definitions = {
      'scheduled': {
        key: 'scheduled',
        displayText: '通常開催',
        icon: '✅',
        cssClass: 'scheduled',
        color: '#27ae60'
      },
      'cancelled': {
        key: 'cancelled',
        displayText: '中止',
        icon: '❌',
        cssClass: 'cancelled',
        color: '#e74c3c'
      },
      'indoor': {
        key: 'indoor',
        displayText: '室内開催',
        icon: '🏠',
        cssClass: 'indoor',
        color: '#f39c12'
      },
      'postponed': {
        key: 'postponed',
        displayText: '延期',
        icon: '⏰',
        cssClass: 'postponed',
        color: '#3498db'
      }
    };
    
    return definitions[status] || {
      key: status,
      displayText: status,
      icon: '📅',
      cssClass: status,
      color: '#6c757d'
    };
  }

  /**
   * ローディング状態の表示
   * @private
   */
  showLoadingState() {
    if (this.statusDetails) {
      this.statusDetails.innerHTML = `
        <div class="loading-status">
          <i class="fas fa-spinner fa-spin"></i>
          <p>レッスン状況を読み込み中...</p>
        </div>
      `;
    }
    
    if (this.globalStatusIndicator) {
      this.globalStatusIndicator.textContent = '読み込み中...';
      this.globalStatusIndicator.className = 'status-indicator';
    }
    
    this.updateTimestamp('読み込み中...');
  }

  /**
   * コンテンツの表示・非表示切り替え - 改善版
   * @private
   */
  toggleContent() {
    if (!this.statusContent || !this.statusHeader) {
      this.warn('必要な要素が見つかりません');
      return;
    }
    
    this.isExpanded = !this.isExpanded;
    
    this.debug(`コンテンツトグル開始: ${this.isExpanded ? '展開' : '折りたたみ'}`);
    
    // アリア属性更新
    this.statusHeader.setAttribute('aria-expanded', this.isExpanded.toString());
    
    // コンテナにexpandedクラス切り替え
    this.statusContainer.classList.toggle('expanded', this.isExpanded);
    
    // アイコン更新 - Font Awesomeアイコンを使用
    const iconElement = this.toggleIcon?.querySelector('i');
    if (iconElement) {
      iconElement.className = this.isExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }
    
    // 高さアニメーション - 改善版
    if (this.isExpanded) {
      // 展開処理
      this.expandContent();
    } else {
      // 折りたたみ処理
      this.collapseContent();
    }
    
    this.debug(`コンテンツトグル完了: ${this.isExpanded ? '展開' : '折りたたみ'}`);
  }

  /**
   * コンテンツ展開
   * @private
   */
  expandContent() {
    // まず現在の高さを0に設定
    this.statusContent.style.maxHeight = '0';
    this.statusContent.style.overflow = 'hidden';
    
    // 次のフレームで実際の高さを測定して設定
    requestAnimationFrame(() => {
      // 一時的にautoにして高さを測定
      this.statusContent.style.maxHeight = 'auto';
      const fullHeight = this.statusContent.scrollHeight;
      
      // 再度0に戻してアニメーション準備
      this.statusContent.style.maxHeight = '0';
      
      // さらに次のフレームで実際の高さを設定（アニメーション開始）
      requestAnimationFrame(() => {
        this.statusContent.style.maxHeight = `${fullHeight + 20}px`;
      });
    });
  }

  /**
   * コンテンツ折りたたみ
   * @private
   */
  collapseContent() {
    // 現在の高さから0へアニメーション
    this.statusContent.style.maxHeight = '0';
    this.statusContent.style.overflow = 'hidden';
  }

  /**
   * レイアウト調整 - 改善版
   * @private
   */
  adjustLayout() {
    if (this.isExpanded && this.statusContent) {
      // 現在の高さを再計算
      this.statusContent.style.maxHeight = 'auto';
      const fullHeight = this.statusContent.scrollHeight;
      this.statusContent.style.maxHeight = `${fullHeight + 20}px`;
      
      this.debug('レイアウト調整完了:', { fullHeight });
    }
  }

  /**
   * 更新日時の表示を更新
   * @private
   * @param {string} [customText] - カスタムテキスト
   */
  updateTimestamp(customText = null) {
    const timestampElement = this.element?.querySelector('#status-update-time');
    if (timestampElement) {
      if (customText) {
        timestampElement.textContent = customText;
      } else {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
        timestampElement.textContent = `更新: ${timeString}`;
      }
    }
  }

  /**
   * HTMLエスケープ
   * @private
   * @param {string} text - エスケープするテキスト
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * デバウンス
   * @private
   * @param {Function} func - 関数
   * @param {number} delay - 遅延
   * @returns {Function}
   */
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * スリープ
   * @private
   * @param {number} ms - ミリ秒
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * コンポーネント表示
   */
  show() {
    this.ensureVisibility();
    this.loadAndDisplayStatus();
  }

  /**
   * コンポーネント非表示
   */
  hide() {
    if (this.statusContainer) {
      this.statusContainer.classList.add('status-banner-hidden');
      this.statusContainer.classList.remove('status-banner-visible');
      this.isVisible = false;
    }
  }

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log(`[${this.componentName}]`, ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    console.debug(`[${this.componentName}:DEBUG]`, ...args);
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn(`[${this.componentName}]`, ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error(`[${this.componentName}]`, ...args);
  }

  /**
   * 破棄処理 - 改善版
   */
  destroy() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    
    // イベントリスナーの削除
    if (this.statusHeader) {
      this.statusHeader.removeEventListener('click', this.handleToggleClick);
      this.statusHeader.removeEventListener('keydown', this.handleToggleKeydown);
    }
    
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
    
    this.currentStatus = null;
    this.isVisible = false;
    this.isExpanded = false;
    
    this.debug('コンポーネント破棄完了');
    
    super.destroy();
  }
}

// デフォルトエクスポート
export default LessonStatusDisplayComponent;