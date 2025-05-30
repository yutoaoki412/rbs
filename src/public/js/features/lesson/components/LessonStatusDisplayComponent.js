/**
 * レッスン状況表示コンポーネント
 * LP側でレッスン開催状況を表示
 * @version 1.1.0 - 新アーキテクチャ対応
 */

import { Component } from '../../../shared/base/Component.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class LessonStatusDisplayComponent extends Component {
  constructor(element = '#today-status, .status-banner, .lesson-status, [data-action="toggle-status"]') {
    super({ autoInit: false });
    
    this.componentName = 'LessonStatusDisplayComponent';
    
    // DOM要素の設定
    if (typeof element === 'string') {
      this.element = document.querySelector(element);
    } else {
      this.element = element;
    }
    
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
  async init() {
    if (this.isInitialized) {
      this.log('既に初期化済みです');
      return;
    }
    
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
      
      this.isInitialized = true;
      this.log('レッスン状況表示コンポーネント初期化完了');
      
    } catch (error) {
      this.error('レッスン状況表示コンポーネント初期化エラー:', error);
      throw error;
    }
  }
  
  /**
   * DOM要素を検索
   */
  findDOMElements() {
    if (!this.element) {
      this.warn('要素が見つかりません');
      return;
    }
    
    this.statusContainer = this.element.closest('.status-banner') || this.element;
    this.statusContent = this.element.querySelector('.status-content') || this.element;
    this.refreshBtn = this.element.querySelector('.refresh-btn');
  }
  
  /**
   * エラーメッセージ表示
   * @param {string} message - エラーメッセージ
   */
  showErrorMessage(message) {
    this.error(message);
    
    if (this.statusContent) {
      this.statusContent.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <span>${message}</span>
        </div>
      `;
    }
  }
  
  /**
   * ログ出力
   * @param {...any} args - ログ引数
   */
  log(...args) {
    console.log(`[${this.componentName}]`, ...args);
  }
  
  /**
   * エラーログ出力
   * @param {...any} args - エラーログ引数
   */
  error(...args) {
    console.error(`[${this.componentName}]`, ...args);
  }
  
  /**
   * デバッグログ出力
   * @param {...any} args - デバッグログ引数
   */
  debug(...args) {
    console.log(`[${this.componentName}:DEBUG]`, ...args);
  }
  
  /**
   * 警告ログ出力
   * @param {...any} args - 警告ログ引数
   */
  warn(...args) {
    console.warn(`[${this.componentName}]`, ...args);
  }

  /**
   * レッスン状況を読み込んで表示
   * @param {string} [date] - 表示する日付（省略時は今日）
   * @returns {Promise<void>}
   */
  async loadAndDisplayStatus(date = null) {
    try {
      if (!this.lessonStatusService) {
        throw new Error('レッスン状況サービスが初期化されていません');
      }

      // ローディング表示
      this.showLoadingState();

      // レッスン状況を取得
      const status = date ? 
        this.lessonStatusService.getStatusByDate(date) : 
        this.lessonStatusService.getTodayStatus();

      this.currentStatus = status;
      
      // 表示を更新
      this.updateDisplay(status);
      
      this.log('レッスン状況表示更新完了:', status);
      
    } catch (error) {
      this.error('レッスン状況表示エラー:', error);
      this.showErrorMessage('レッスン状況を読み込めませんでした');
    }
  }

  /**
   * レッスン状況表示を更新
   * @param {Object} status - レッスン状況データ
   */
  updateDisplay(status) {
    if (!this.statusContent || !status) {
      return;
    }

    const html = this.generateStatusHTML(status);
    this.statusContent.innerHTML = html;
    
    // 表示状態を更新
    this.isVisible = true;
    if (this.statusContainer) {
      this.statusContainer.classList.add('status-visible');
      this.statusContainer.classList.remove('status-hidden');
    }
  }

  /**
   * レッスン状況HTMLを生成
   * @param {Object} status - レッスン状況データ
   * @returns {string}
   */
  generateStatusHTML(status) {
    const { globalStatus, globalMessage, courses } = status;
    
    // グローバルステータスの定義を取得
    const statusDef = this.lessonStatusService.getStatusDefinition(globalStatus);
    
    let html = `
      <div class="status-display">
        <div class="global-status ${statusDef?.cssClass || globalStatus}">
          <span class="status-icon">${statusDef?.icon || '📅'}</span>
          <span class="status-text">${statusDef?.displayText || globalStatus}</span>
        </div>
    `;

    // グローバルメッセージがある場合
    if (globalMessage && globalMessage.trim()) {
      html += `
        <div class="global-message">
          <i class="fas fa-info-circle"></i>
          <span>${this.escapeHtml(globalMessage)}</span>
        </div>
      `;
    }

    // 各コースの状況
    if (courses && Object.keys(courses).length > 0) {
      html += '<div class="courses-status">';
      
      Object.entries(courses).forEach(([courseKey, courseData]) => {
        const courseDef = this.lessonStatusService.getStatusDefinition(courseData.status);
        html += `
          <div class="course-item ${courseDef?.cssClass || courseData.status}">
            <div class="course-name">${courseData.name}</div>
            <div class="course-time">${courseData.time}</div>
            <div class="course-status">
              <span class="status-icon">${courseDef?.icon || '📅'}</span>
              <span class="status-text">${courseDef?.displayText || courseData.status}</span>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * ローディング状態表示
   */
  showLoadingState() {
    if (this.statusContent) {
      this.statusContent.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <span>レッスン状況を読み込み中...</span>
        </div>
      `;
    }
  }

  /**
   * HTMLエスケープ
   * @param {string} text - エスケープするテキスト
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 自動更新を開始
   */
  startAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }

    this.autoRefreshInterval = setInterval(() => {
      this.loadAndDisplayStatus();
    }, this.autoRefreshIntervalTime);

    this.log('自動更新を開始しました');
  }

  /**
   * 自動更新を停止
   */
  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      this.log('自動更新を停止しました');
    }
  }

  /**
   * コンポーネントを表示
   */
  show() {
    this.loadAndDisplayStatus();
    this.startAutoRefresh();
  }

  /**
   * コンポーネントを非表示
   */
  hide() {
    this.stopAutoRefresh();
    this.isVisible = false;
    
    if (this.statusContainer) {
      this.statusContainer.classList.remove('status-visible');
      this.statusContainer.classList.add('status-hidden');
    }
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.stopAutoRefresh();
    this.currentStatus = null;
    this.isVisible = false;
    super.destroy();
  }
}

// デフォルトエクスポート
export default LessonStatusDisplayComponent; 