/**
 * RBS陸上教室 基底コンポーネントクラス
 * すべてのUIコンポーネントの共通機能を提供
 * @version 3.0.0 - リファクタリング対応版
 */

import { EventBus } from '../services/EventBus.js';
import { querySelector, querySelectorAll, createElement, addClass, removeClass, toggleClass } from '../utils/domUtils.js';
import { escapeHtml, randomString } from '../utils/stringUtils.js';

/**
 * 基底コンポーネントクラス
 */
export class BaseComponent {
  /**
   * コンストラクタ
   * @param {HTMLElement|string} element - 対象要素またはセレクタ
   * @param {string} componentName - コンポーネント名
   */
  constructor(element, componentName = 'BaseComponent') {
    this.componentName = componentName;
    this.element = typeof element === 'string' ? querySelector(element) : element;
    this.initialized = false;
    this.destroyed = false;
    this.eventListeners = [];
    this.childComponents = new Map();
    this.id = this.generateId();
    
    // パフォーマンス監視
    this.performanceMetrics = {
      initStartTime: null,
      initEndTime: null,
      eventCount: 0
    };
    
    // デバッグモード（オーバーライド可能）
    this.debugMode = false;
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized || this.destroyed) {
      return;
    }

    if (!this.element) {
      this.warn(`コンポーネント要素が見つかりません`);
      return;
    }

    try {
      this.performanceMetrics.initStartTime = performance.now();
      
      // 要素にコンポーネントIDを設定
      this.element.dataset.componentId = this.id;
      this.element.dataset.componentName = this.componentName;
      
      // 子クラスの初期化処理
      if (this.doInit) {
        await this.doInit();
      }
      
      // イベントリスナーを設定
      if (this.setupEventListeners) {
        this.setupEventListeners();
      }
      
      this.initialized = true;
      this.performanceMetrics.initEndTime = performance.now();
      
      this.debug(`コンポーネント初期化完了 (${this.getInitTime()}ms)`);
      
      // 初期化完了イベント
      EventBus.emit('component:initialized', { 
        component: this.componentName,
        id: this.id,
        initTime: this.getInitTime()
      });
      
    } catch (error) {
      this.error(`コンポーネント初期化エラー:`, error);
      throw error;
    }
  }

  /**
   * 実際の初期化処理（サブクラスでオーバーライド）
   * @returns {Promise<void>}
   */
  async doInit() {
    // サブクラスで実装
  }

  /**
   * イベントリスナーを設定（サブクラスでオーバーライド）
   */
  setupEventListeners() {
    // サブクラスで実装
  }

  /**
   * イベントリスナーを追加
   * @param {EventTarget} target - イベントターゲット
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - オプション
   */
  addEventListener(target, event, handler, options = {}) {
    if (!target || !event || !handler) {
      this.warn('addEventListener: 必要なパラメータが不足しています');
      return;
    }

    try {
      target.addEventListener(event, handler, options);
      
      // リスナーを記録（自動削除用）
      this.eventListeners.push({
        target,
        event,
        handler,
        options
      });
      
      this.performanceMetrics.eventCount++;
      this.debug(`イベントリスナー追加: ${event}`);
      
    } catch (error) {
      this.error('イベントリスナー追加エラー:', error);
    }
  }

  /**
   * 子要素にイベントリスナーを追加
   * @param {HTMLElement} element - 要素
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - オプション
   */
  addEventListenerToChild(element, event, handler, options = {}) {
    if (!element) {
      this.warn('addEventListenerToChild: 要素が存在しません');
      return;
    }
    
    this.addEventListener(element, event, handler, options);
  }

  /**
   * 安全な要素検索
   * @param {string} selector - セレクター
   * @param {HTMLElement} context - 検索コンテキスト
   * @returns {HTMLElement|null}
   */
  safeQuerySelector(selector, context = this.element) {
    try {
      return querySelector(selector, context);
    } catch (error) {
      this.debug(`要素検索エラー: ${selector}`, error);
      return null;
    }
  }

  /**
   * 安全な複数要素検索
   * @param {string} selector - セレクター
   * @param {HTMLElement} context - 検索コンテキスト
   * @returns {NodeList}
   */
  safeQuerySelectorAll(selector, context = this.element) {
    try {
      return querySelectorAll(selector, context);
    } catch (error) {
      this.debug(`複数要素検索エラー: ${selector}`, error);
      return [];
    }
  }

  /**
   * 安全なforEach（NodeListに対する）
   * @param {NodeList|Array} list - リスト
   * @param {Function} callback - コールバック関数
   * @param {string} context - エラーログ用コンテキスト
   */
  safeForEach(list, callback, context = '') {
    if (!list || !list.length) {
      this.debug(`safeForEach: リストが存在しないかemptyです ${context}`);
      return;
    }
    
    try {
      Array.from(list).forEach(callback);
    } catch (error) {
      this.error(`safeForEach エラー ${context}:`, error);
    }
  }

  /**
   * クラス操作メソッド
   */
  addClass(element, className) {
    if (element && className) {
      addClass(element, className);
    }
  }

  removeClass(element, className) {
    if (element && className) {
      removeClass(element, className);
    }
  }

  toggleClass(element, className) {
    if (element && className) {
      toggleClass(element, className);
    }
  }

  /**
   * ID生成
   * @returns {string}
   */
  generateId() {
    return `component_${Date.now()}_${randomString(8)}`;
  }

  /**
   * 初期化時間の取得
   * @returns {number}
   */
  getInitTime() {
    if (this.performanceMetrics.initStartTime && this.performanceMetrics.initEndTime) {
      return Math.round(this.performanceMetrics.initEndTime - this.performanceMetrics.initStartTime);
    }
    return 0;
  }

  /**
   * パフォーマンス情報の取得
   * @returns {Object}
   */
  getPerformanceInfo() {
    return {
      componentName: this.componentName,
      id: this.id,
      initialized: this.initialized,
      initTime: this.getInitTime(),
      eventListeners: this.eventListeners.length,
      childComponents: this.childComponents.size
    };
  }

  /**
   * ステータス情報の取得
   * @returns {Object}
   */
  getStatus() {
    return {
      componentName: this.componentName,
      id: this.id,
      initialized: this.initialized,
      destroyed: this.destroyed,
      hasElement: !!this.element,
      performance: this.getPerformanceInfo()
    };
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    if (this.destroyed) {
      return;
    }

    try {
      // イベントリスナーを削除
      this.eventListeners.forEach(({ target, event, handler, options }) => {
        try {
          target.removeEventListener(event, handler, options);
        } catch (error) {
          this.debug('イベントリスナー削除エラー:', error);
        }
      });
      this.eventListeners = [];
      
      // 子コンポーネントを破棄
      this.childComponents.forEach(component => {
        if (component.destroy) {
          component.destroy();
        }
      });
      this.childComponents.clear();
      
      // 要素からデータ属性を削除
      if (this.element) {
        delete this.element.dataset.componentId;
        delete this.element.dataset.componentName;
      }
      
      this.destroyed = true;
      this.initialized = false;
      
      this.debug('コンポーネント破棄完了');
      
      // 破棄完了イベント
      EventBus.emit('component:destroyed', { 
        component: this.componentName,
        id: this.id
      });
      
    } catch (error) {
      this.error('コンポーネント破棄エラー:', error);
    }
  }

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log(`📦 ${this.componentName}:`, ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (this.debugMode) {
      console.debug(`🔍 ${this.componentName}:`, ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn(`⚠️ ${this.componentName}:`, ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error(`❌ ${this.componentName}:`, ...args);
  }
}

// デフォルトエクスポート（後方互換性）
export default BaseComponent;