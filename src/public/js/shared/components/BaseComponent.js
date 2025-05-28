/**
 * RBS陸上教室 基底コンポーネントクラス
 * すべてのUIコンポーネントの共通機能を提供
 */

import eventBus from '../services/EventBus.js';
import helpers from '../utils/helpers.js';

const { DOM, Utils } = helpers;

/**
 * 基底コンポーネントクラス
 */
class BaseComponent {
  /**
   * コンストラクタ
   * @param {HTMLElement|string} element - 対象要素またはセレクタ
   * @param {Object} options - オプション
   */
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? DOM.$(element) : element;
    this.options = { ...this.defaultOptions, ...options };
    this.initialized = false;
    this.destroyed = false;
    this.eventListeners = [];
    this.childComponents = new Map();
    this.id = Utils.generateId();
    
    // 初期化
    if (this.element) {
      this.init();
    } else {
      console.warn(`コンポーネント要素が見つかりません: ${element}`);
    }
  }

  /**
   * デフォルトオプション
   */
  get defaultOptions() {
    return {
      autoInit: true,
      debug: false
    };
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized || this.destroyed) {
      return;
    }

    try {
      // 要素にコンポーネントIDを設定
      this.element.dataset.componentId = this.id;
      
      // 初期化処理
      this.doInit();
      
      // イベントリスナーを設定
      this.setupEventListeners();
      
      this.initialized = true;
      
      if (this.options.debug) {
        console.log(`✅ コンポーネント初期化完了: ${this.constructor.name}`, this.id);
      }
      
      // 初期化完了イベントを発火
      this.emit('component:init', { component: this });
      
    } catch (error) {
      console.error(`コンポーネント初期化エラー: ${this.constructor.name}`, error);
      throw error;
    }
  }

  /**
   * 実際の初期化処理（サブクラスでオーバーライド）
   */
  doInit() {
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
   */
  addEventListener(target, event, handler, options = {}) {
    if (!target || !event || !handler) {
      console.warn('addEventListener: 必要なパラメータが不足しています');
      return;
    }

    const wrappedHandler = (e) => {
      try {
        return handler.call(this, e);
      } catch (error) {
        console.error(`イベントハンドラーエラー [${event}]:`, error);
      }
    };

    target.addEventListener(event, wrappedHandler, options);
    
    // 後でクリーンアップするために記録
    this.eventListeners.push({
      target,
      event,
      handler: wrappedHandler,
      options
    });

    if (this.options.debug) {
      console.log(`📋 イベントリスナー追加: ${event}`, target);
    }
  }

  /**
   * カスタムイベントを発火
   */
  emit(eventName, detail = null) {
    const event = new CustomEvent(eventName, { 
      detail: { ...detail, component: this },
      bubbles: true
    });
    
    this.element.dispatchEvent(event);
    
    // EventBusにも送信
    eventBus.emit(`component:${eventName}`, {
      componentId: this.id,
      componentName: this.constructor.name,
      ...detail
    });

    if (this.options.debug) {
      console.log(`🔥 カスタムイベント発火: ${eventName}`, detail);
    }
  }

  /**
   * 要素を検索
   */
  $(selector) {
    return this.element.querySelector(selector);
  }

  /**
   * 複数要素を検索
   */
  $$(selector) {
    return this.element.querySelectorAll(selector);
  }

  /**
   * クラスを切り替え
   */
  toggleClass(className, force = null) {
    DOM.toggleClass(this.element, className, force);
  }

  /**
   * 表示/非表示を切り替え
   */
  toggle(force = null) {
    DOM.toggle(this.element, force);
  }

  /**
   * 表示
   */
  show() {
    this.toggle(true);
    this.emit('component:show');
  }

  /**
   * 非表示
   */
  hide() {
    this.toggle(false);
    this.emit('component:hide');
  }

  /**
   * 子コンポーネントを追加
   */
  addChildComponent(name, component) {
    this.childComponents.set(name, component);
    
    if (this.options.debug) {
      console.log(`👶 子コンポーネント追加: ${name}`, component);
    }
  }

  /**
   * 子コンポーネントを取得
   */
  getChildComponent(name) {
    return this.childComponents.get(name);
  }

  /**
   * 子コンポーネントを削除
   */
  removeChildComponent(name) {
    const component = this.childComponents.get(name);
    if (component && typeof component.destroy === 'function') {
      component.destroy();
    }
    this.childComponents.delete(name);
  }

  /**
   * データ属性を取得
   */
  getData(key) {
    return this.element.dataset[key];
  }

  /**
   * データ属性を設定
   */
  setData(key, value) {
    this.element.dataset[key] = value;
  }

  /**
   * 要素が表示されているかチェック
   */
  isVisible() {
    return DOM.isVisible(this.element);
  }

  /**
   * 要素が初期化されているかチェック
   */
  isInitialized() {
    return this.initialized && !this.destroyed;
  }

  /**
   * アニメーション付きでクラスを追加
   */
  animateClass(className, duration = 300) {
    return new Promise((resolve) => {
      this.element.classList.add(className);
      setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  /**
   * 要素の寸法を取得
   */
  getDimensions() {
    const rect = this.element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    };
  }

  /**
   * コンポーネント情報を取得
   */
  getInfo() {
    return {
      id: this.id,
      name: this.constructor.name,
      initialized: this.initialized,
      destroyed: this.destroyed,
      element: this.element?.tagName?.toLowerCase(),
      childComponents: Array.from(this.childComponents.keys()),
      eventListeners: this.eventListeners.length
    };
  }

  /**
   * デバッグ情報を出力
   */
  debug() {
    console.group(`🔧 ${this.constructor.name} デバッグ情報`);
    console.log('基本情報:', this.getInfo());
    console.log('オプション:', this.options);
    console.log('要素:', this.element);
    console.log('イベントリスナー:', this.eventListeners);
    console.log('子コンポーネント:', this.childComponents);
    console.groupEnd();
  }

  /**
   * コンポーネントを破棄
   */
  destroy() {
    if (this.destroyed) {
      return;
    }

    try {
      // 破棄前イベントを発火
      this.emit('component:beforeDestroy');
      
      // 子コンポーネントを破棄
      this.childComponents.forEach((component, name) => {
        this.removeChildComponent(name);
      });
      
      // イベントリスナーを削除
      this.eventListeners.forEach(({ target, event, handler, options }) => {
        try {
          target.removeEventListener(event, handler, options);
        } catch (error) {
          console.warn('イベントリスナー削除エラー:', error);
        }
      });
      
      // データ属性を削除
      if (this.element && this.element.dataset) {
        delete this.element.dataset.componentId;
      }
      
      // プロパティをクリア
      this.eventListeners = [];
      this.childComponents.clear();
      this.initialized = false;
      this.destroyed = true;
      
      if (this.options.debug) {
        console.log(`🗑️ コンポーネント破棄完了: ${this.constructor.name}`, this.id);
      }
      
      // 破棄完了イベントを発火
      this.emit('component:destroy');
      
    } catch (error) {
      console.error(`コンポーネント破棄エラー: ${this.constructor.name}`, error);
    }
  }
}

export default BaseComponent;