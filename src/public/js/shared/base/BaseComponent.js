/**
 * 基底コンポーネントクラス
 * 全てのUIコンポーネントが継承すべき共通機能を提供
 * @version 2.0.0
 */

import { EventBus } from '../services/EventBus.js';
import { querySelector, show, hide } from '../utils/domUtils.js';

export class BaseComponent {
  constructor(elementOrSelector, componentName = 'BaseComponent') {
    this.componentName = componentName;
    this.initialized = false;
    this.destroyed = false;
    this.debugMode = false; // デバッグモードフラグ
    
    // DOM要素
    this.element = typeof elementOrSelector === 'string' 
      ? querySelector(elementOrSelector) 
      : elementOrSelector;
    
    // HTMLElementの検証
    if (!this.element || !(this.element instanceof Node)) {
      const errorMsg = typeof elementOrSelector === 'string' 
        ? `${componentName}: 要素が見つかりません: ${elementOrSelector}`
        : `${componentName}: 不正な要素が渡されました`;
      throw new Error(errorMsg);
    }
    
    // イベント管理
    this.eventListeners = new Map();
    this.domEventListeners = new Map();
    
    // 子コンポーネント
    this.childComponents = new Map();
    
    // 状態管理
    this.state = {};
    this.props = {};
    
    // タイムスタンプ
    this.createdAt = new Date();
    this.mountedAt = null;
  }

  /**
   * コンポーネントの初期化
   * @param {Object} props - プロパティ
   * @returns {Promise<void>}
   */
  async init(props = {}) {
    if (this.initialized) {
      this.warn('既に初期化済みです');
      return;
    }

    if (this.destroyed) {
      throw new Error(`${this.componentName}: 破棄済みのコンポーネントは初期化できません`);
    }

    try {
      this.log('初期化開始');
      
      this.props = { ...props };
      
      // DOMの準備
      await this.setupDOM();
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      // 子コンポーネントの初期化
      await this.initChildComponents();
      
      // カスタム初期化処理
      await this.doInit();
      
      this.initialized = true;
      this.mountedAt = new Date();
      
      this.log('初期化完了');
      this.emit('initialized');
      
    } catch (error) {
      this.handleError('初期化エラー', error);
      throw error;
    }
  }

  /**
   * DOM設定
   * @protected
   * @returns {Promise<void>}
   */
  async setupDOM() {
    // コンポーネント識別用の属性を設定
    this.element.setAttribute('data-component', this.componentName);
    
    // 継承クラスでオーバーライド
  }

  /**
   * イベントリスナーの設定
   * @protected
   */
  setupEventListeners() {
    // 継承クラスでオーバーライド
  }

  /**
   * 子コンポーネントの初期化
   * @protected
   * @returns {Promise<void>}
   */
  async initChildComponents() {
    // 継承クラスでオーバーライド
  }

  /**
   * カスタム初期化処理
   * @protected
   * @returns {Promise<void>}
   */
  async doInit() {
    // 継承クラスでオーバーライド
  }

  /**
   * 状態更新
   * @param {Object} newState - 新しい状態
   * @param {boolean} rerender - 再レンダリングするか
   */
  setState(newState, rerender = true) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    this.emit('stateChanged', { oldState, newState: this.state });
    
    if (rerender) {
      this.render();
    }
  }

  /**
   * プロパティ更新
   * @param {Object} newProps - 新しいプロパティ
   * @param {boolean} rerender - 再レンダリングするか
   */
  setProps(newProps, rerender = true) {
    const oldProps = { ...this.props };
    this.props = { ...this.props, ...newProps };
    
    this.emit('propsChanged', { oldProps, newProps: this.props });
    
    if (rerender) {
      this.render();
    }
  }

  /**
   * レンダリング
   * @returns {Promise<void>}
   */
  async render() {
    try {
      await this.doRender();
      this.emit('rendered');
    } catch (error) {
      this.handleError('レンダリングエラー', error);
    }
  }

  /**
   * カスタムレンダリング処理
   * @protected
   * @returns {Promise<void>}
   */
  async doRender() {
    // 継承クラスでオーバーライド
  }

  /**
   * 表示
   */
  show() {
    show(this.element);
    this.emit('shown');
  }

  /**
   * 非表示
   */
  hide() {
    hide(this.element);
    this.emit('hidden');
  }

  /**
   * 表示/非表示の切り替え
   */
  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 表示状態の確認
   * @returns {boolean}
   */
  isVisible() {
    return this.element.style.display !== 'none' && 
           !this.element.hidden &&
           this.element.offsetParent !== null;
  }

  /**
   * 子コンポーネントの追加
   * @param {string} name - コンポーネント名
   * @param {BaseComponent} component - コンポーネント
   */
  addChild(name, component) {
    this.childComponents.set(name, component);
    this.emit('childAdded', { name, component });
  }

  /**
   * 子コンポーネントの取得
   * @param {string} name - コンポーネント名
   * @returns {BaseComponent|null}
   */
  getChild(name) {
    return this.childComponents.get(name) || null;
  }

  /**
   * 子コンポーネントの削除
   * @param {string} name - コンポーネント名
   */
  removeChild(name) {
    const component = this.childComponents.get(name);
    if (component) {
      component.destroy();
      this.childComponents.delete(name);
      this.emit('childRemoved', { name, component });
    }
  }

  /**
   * 子要素にイベントリスナーを追加
   * @protected
   * @param {Element} element - 対象要素
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー
   * @param {Object} options - イベントオプション
   */
  addEventListenerToChild(element, event, handler, options = {}) {
    if (!element) {
      this.warn(`addEventListenerToChild: 要素が存在しません (event: ${event})`);
      return;
    }
    
    if (typeof handler !== 'function') {
      this.warn(`addEventListenerToChild: ハンドラーが関数ではありません (event: ${event})`);
      return;
    }

    try {
      const wrappedHandler = (e) => {
        try {
          return handler.call(this, e);
        } catch (error) {
          this.error(`イベントハンドラーエラー [${event}]:`, error);
        }
      };

      element.addEventListener(event, wrappedHandler, options);
      
      // クリーンアップ用に記録
      if (!this.domEventListeners.has(element)) {
        this.domEventListeners.set(element, []);
      }
      this.domEventListeners.get(element).push({ event, handler: wrappedHandler, options });
      
      this.debug(`子要素イベントリスナー追加: ${event}`, element);
    } catch (error) {
      this.error(`addEventListenerToChild エラー [${event}]:`, error);
    }
  }

  /**
   * NodeListに対してforEachを安全に実行
   * @protected
   * @param {NodeList|Array|null|undefined} nodeList - ノードリスト
   * @param {Function} callback - コールバック関数
   * @param {string} context - エラー時のコンテキスト
   */
  safeForEach(nodeList, callback, context = '') {
    if (!nodeList) {
      this.warn(`safeForEach: NodeListが存在しません ${context}`);
      return;
    }
    
    if (nodeList.length === 0) {
      this.debug(`safeForEach: NodeListが空です ${context}`);
      return;
    }
    
    try {
      Array.from(nodeList).forEach((item, index) => {
        try {
          callback.call(this, item, index);
        } catch (error) {
          this.error(`safeForEach コールバックエラー [${index}] ${context}:`, error);
        }
      });
    } catch (error) {
      this.error(`safeForEach エラー ${context}:`, error);
    }
  }

  /**
   * 要素の存在を安全にチェック
   * @protected
   * @param {string} selector - セレクター
   * @param {Element} container - コンテナ要素（デフォルト: this.element または this.container）
   * @returns {Element|null} 見つかった要素またはnull
   */
  safeQuerySelector(selector, container = null) {
    const searchContainer = container || this.container || this.element;
    
    if (!searchContainer) {
      this.warn(`safeQuerySelector: コンテナが存在しません (selector: ${selector})`);
      return null;
    }
    
    try {
      return searchContainer.querySelector(selector);
    } catch (error) {
      this.error(`safeQuerySelector エラー (selector: ${selector}):`, error);
      return null;
    }
  }

  /**
   * 複数要素の存在を安全にチェック
   * @protected
   * @param {string} selector - セレクター
   * @param {Element} container - コンテナ要素（デフォルト: this.element または this.container）
   * @returns {NodeList|Array} 見つかった要素のリスト
   */
  safeQuerySelectorAll(selector, container = null) {
    const searchContainer = container || this.container || this.element;
    
    if (!searchContainer) {
      this.warn(`safeQuerySelectorAll: コンテナが存在しません (selector: ${selector})`);
      return [];
    }
    
    try {
      return searchContainer.querySelectorAll(selector);
    } catch (error) {
      this.error(`safeQuerySelectorAll エラー (selector: ${selector}):`, error);
      return [];
    }
  }

  /**
   * EventBusイベントの監視
   * @protected
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   */
  on(event, handler) {
    EventBus.on(event, handler);
    
    // クリーンアップ用に記録
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  /**
   * EventBusイベントの発火
   * @protected
   * @param {string} event - イベント名
   * @param {*} data - データ
   */
  emit(event, data = {}) {
    const fullEvent = `${this.componentName.toLowerCase()}:${event}`;
    EventBus.emit(fullEvent, data);
  }

  /**
   * エラーハンドリング
   * @protected
   * @param {string} message - エラーメッセージ
   * @param {Error} error - エラーオブジェクト
   */
  handleError(message, error) {
    this.error(`${message}:`, error);
    this.emit('error', { message, error });
  }

  /**
   * コンポーネントの破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.destroyed) {
      this.warn('既に破棄済みです');
      return;
    }

    try {
      this.log('破棄開始');
      
      // 子コンポーネントの破棄
      for (const [name, component] of this.childComponents) {
        await component.destroy();
      }
      this.childComponents.clear();
      
      // イベントリスナーのクリア
      this.clearEventListeners();
      this.clearDOMEventListeners();
      
      // カスタム破棄処理
      await this.doDestroy();
      
      this.destroyed = true;
      this.initialized = false;
      
      this.log('破棄完了');
      this.emit('destroyed');
      
    } catch (error) {
      this.handleError('破棄エラー', error);
    }
  }

  /**
   * カスタム破棄処理
   * @protected
   * @returns {Promise<void>}
   */
  async doDestroy() {
    // 継承クラスでオーバーライド
  }

  /**
   * EventBusイベントリスナーのクリア
   * @private
   */
  clearEventListeners() {
    for (const [event, handlers] of this.eventListeners) {
      handlers.forEach(handler => {
        EventBus.off(event, handler);
      });
    }
    this.eventListeners.clear();
  }

  /**
   * DOMイベントリスナーのクリア
   * @private
   */
  clearDOMEventListeners() {
    for (const [element, listeners] of this.domEventListeners) {
      listeners.forEach(({ event, handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
        } catch (error) {
          this.warn(`イベントリスナー削除エラー [${event}]:`, error);
        }
      });
    }
    this.domEventListeners.clear();
  }

  /**
   * ログ出力
   * @protected
   * @param {...*} args - ログ引数
   */
  log(...args) {
    console.log(`🧩 ${this.componentName}:`, ...args);
  }

  /**
   * 警告ログ出力
   * @protected
   * @param {...*} args - ログ引数
   */
  warn(...args) {
    console.warn(`⚠️ ${this.componentName}:`, ...args);
  }

  /**
   * エラーログ出力
   * @protected
   * @param {...*} args - ログ引数
   */
  error(...args) {
    console.error(`❌ ${this.componentName}:`, ...args);
  }

  /**
   * デバッグログ出力
   * @protected
   * @param {...*} args - ログ引数
   */
  debug(...args) {
    if (window.DEBUG || this.debugMode) {
      console.debug(`🔍 ${this.componentName}:`, ...args);
    }
  }

  /**
   * パフォーマンス情報の取得
   * @returns {Object} パフォーマンス情報
   */
  getPerformanceInfo() {
    return {
      componentName: this.componentName,
      initialized: this.initialized,
      destroyed: this.destroyed,
      createdAt: this.createdAt,
      mountedAt: this.mountedAt,
      childCount: this.childComponents.size,
      eventListenerCount: this.eventListeners.size,
      domEventListenerCount: this.domEventListeners.size
    };
  }

  /**
   * コンポーネント状態の取得
   * @returns {Object}
   */
  getStatus() {
    return {
      componentName: this.componentName,
      initialized: this.initialized,
      destroyed: this.destroyed,
      visible: this.isVisible(),
      createdAt: this.createdAt,
      mountedAt: this.mountedAt,
      state: { ...this.state },
      props: { ...this.props },
      childCount: this.childComponents.size
    };
  }

  /**
   * 汎用イベントリスナーの追加（window、documentなど）
   * @protected
   * @param {EventTarget} target - イベント対象
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー
   * @param {Object} options - イベントオプション
   */
  addEventListener(target, event, handler, options = {}) {
    if (!target) {
      this.warn(`addEventListener: 対象が存在しません (event: ${event})`);
      return;
    }
    
    if (typeof handler !== 'function') {
      this.warn(`addEventListener: ハンドラーが関数ではありません (event: ${event})`);
      return;
    }

    try {
      const wrappedHandler = (e) => {
        try {
          return handler.call(this, e);
        } catch (error) {
          this.error(`イベントハンドラーエラー [${event}]:`, error);
        }
      };

      target.addEventListener(event, wrappedHandler, options);
      
      // クリーンアップ用に記録
      if (!this.domEventListeners.has(target)) {
        this.domEventListeners.set(target, []);
      }
      this.domEventListeners.get(target).push({ event, handler: wrappedHandler, options });
      
      this.debug(`イベントリスナー追加: ${event}`, target);
    } catch (error) {
      this.error(`addEventListener エラー [${event}]:`, error);
    }
  }
}

// defaultエクスポートを追加してdefaultインポートをサポート
export default BaseComponent; 