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
}

// デフォルトエクスポート
export default LessonStatusDisplayComponent; 