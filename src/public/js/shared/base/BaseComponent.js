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
    
    // DOM要素
    this.element = typeof elementOrSelector === 'string' 
      ? querySelector(elementOrSelector) 
      : elementOrSelector;
    
    if (!this.element) {
      throw new Error(`${componentName}: 要素が見つかりません: ${elementOrSelector}`);
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
   * DOMイベントリスナーの追加
   * @protected
   * @param {string} event - イベント名
   * @param {string} selector - セレクター
   * @param {Function} handler - ハンドラー
   */
  addEventListener(event, selector, handler) {
    const wrappedHandler = (e) => {
      if (e.target.matches(selector)) {
        handler.call(this, e);
      }
    };
    
    this.element.addEventListener(event, wrappedHandler);
    
    // クリーンアップ用に記録
    const key = `${event}:${selector}`;
    if (!this.domEventListeners.has(key)) {
      this.domEventListeners.set(key, []);
    }
    this.domEventListeners.get(key).push(wrappedHandler);
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
    for (const [key, handlers] of this.domEventListeners) {
      handlers.forEach(handler => {
        this.element.removeEventListener(key.split(':')[0], handler);
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
} 