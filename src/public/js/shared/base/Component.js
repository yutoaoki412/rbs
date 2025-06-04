/**
 * コンポーネント基底クラス
 * すべてのUIコンポーネントの共通機能を提供
 */
class Component {
  /**
   * @param {Object} config - 設定オプション
   */
  constructor(config = {}) {
    this.config = {
      autoInit: true,
      enableEvents: true,
      enableCleanup: true,
      ...config
    };
    
    this.element = null;
    this.eventListeners = [];
    this.childComponents = new Map();
    this.isInitialized = false;
    this.isDestroyed = false;
    
    // 一意のIDを生成
    this.id = this.generateId();
    
    // イベントシステムの初期化
    if (this.config.enableEvents) {
      this.initEventSystem();
    }
    
    // 自動初期化
    if (this.config.autoInit) {
      this.init();
    }
  }

  /**
   * 一意のIDを生成
   * @returns {string} 生成されたID
   */
  generateId() {
    const prefix = this.constructor.name.toLowerCase();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * イベントシステムを初期化
   */
  initEventSystem() {
    this.events = new Map();
    this.eventTarget = new EventTarget();
  }

  /**
   * 初期化（サブクラスでオーバーライド）
   */
  init() {
    if (this.isInitialized) return;
    
    try {
      this.beforeInit();
      this.doInit();
      this.afterInit();
      
      this.isInitialized = true;
      this.emit('component:initialized', { component: this });
    } catch (error) {
      console.error(`${this.constructor.name}: 初期化エラー:`, error);
      this.emit('component:error', { error, phase: 'init' });
    }
  }

  /**
   * 初期化前処理（サブクラスでオーバーライド）
   */
  beforeInit() {
    // サブクラスで実装
  }

  /**
   * 初期化処理（サブクラスでオーバーライド）
   */
  doInit() {
    // サブクラスで実装
  }

  /**
   * 初期化後処理（サブクラスでオーバーライド）
   */
  afterInit() {
    // サブクラスで実装
  }

  /**
   * 要素を作成（サブクラスでオーバーライド）
   * @returns {Element} 作成された要素
   */
  createElement() {
    throw new Error(`${this.constructor.name}: createElement()メソッドを実装してください`);
  }

  /**
   * 要素を取得
   * @returns {Element|null} 要素
   */
  getElement() {
    return this.element;
  }

  /**
   * 要素を設定
   * @param {Element} element - 設定する要素
   */
  setElement(element) {
    if (this.element && this.element !== element) {
      this.cleanup();
    }
    this.element = element;
    this.emit('component:elementSet', { element });
  }

  /**
   * イベントリスナーを追加（管理付き）
   * @param {Element|Window|Document} target - イベント対象
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー
   * @param {Object} options - オプション
   */
  addEventListener(target, event, handler, options = {}) {
    try {
      target.addEventListener(event, handler, options);
      this.eventListeners.push({ target, event, handler, options });
    } catch (error) {
      console.error(`${this.constructor.name}: イベントリスナー追加エラー:`, error);
    }
  }

  /**
   * カスタムイベントを発火
   * @param {string} eventName - イベント名
   * @param {Object} detail - イベント詳細
   */
  emit(eventName, detail = {}) {
    try {
      if (!this.config.enableEvents) return;
      
      const event = new CustomEvent(eventName, {
        detail: { ...detail, component: this, componentId: this.id }
      });
      
      // コンポーネント内部のイベント
      if (this.eventTarget) {
        this.eventTarget.dispatchEvent(event);
      }
      
      // グローバルイベント
      document.dispatchEvent(event);
    } catch (error) {
      console.error(`${this.constructor.name}: イベント発火エラー:`, error);
    }
  }

  /**
   * カスタムイベントを監視
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー
   */
  on(eventName, handler) {
    if (!this.config.enableEvents || !this.eventTarget) return;
    
    this.eventTarget.addEventListener(eventName, handler);
    this.eventListeners.push({
      target: this.eventTarget,
      event: eventName,
      handler
    });
  }

  /**
   * 子コンポーネントを追加
   * @param {string} key - キー
   * @param {Component} component - コンポーネント
   */
  addChild(key, component) {
    if (!(component instanceof Component)) {
      throw new Error('子コンポーネントはComponentクラスのインスタンスである必要があります');
    }
    
    this.childComponents.set(key, component);
    this.emit('component:childAdded', { key, child: component });
  }

  /**
   * 子コンポーネントを取得
   * @param {string} key - キー
   * @returns {Component|null} コンポーネント
   */
  getChild(key) {
    return this.childComponents.get(key) || null;
  }

  /**
   * 子コンポーネントを削除
   * @param {string} key - キー
   */
  removeChild(key) {
    const child = this.childComponents.get(key);
    if (child) {
      child.destroy();
      this.childComponents.delete(key);
      this.emit('component:childRemoved', { key, child });
    }
  }

  /**
   * 表示状態を取得
   * @returns {boolean} 表示中かどうか
   */
  isVisible() {
    return this.element && document.contains(this.element);
  }

  /**
   * 初期化状態を取得
   * @returns {boolean} 初期化済みかどうか
   */
  isReady() {
    return this.isInitialized && !this.isDestroyed;
  }

  /**
   * 設定を更新
   * @param {Object} newConfig - 新しい設定
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    this.emit('component:configUpdated', { oldConfig, newConfig: this.config });
  }

  /**
   * ステータス情報を取得
   * @returns {Object} ステータス情報
   */
  getStatus() {
    return {
      id: this.id,
      initialized: this.isInitialized,
      destroyed: this.isDestroyed,
      visible: this.isVisible(),
      ready: this.isReady(),
      childCount: this.childComponents.size,
      eventCount: this.eventListeners.length
    };
  }

  /**
   * クリーンアップ処理
   */
  cleanup() {
    try {
      // イベントリスナーを削除
      this.eventListeners.forEach(({ target, event, handler, options }) => {
        target.removeEventListener(event, handler, options);
      });
      this.eventListeners = [];
      
      this.emit('component:cleanedUp');
    } catch (error) {
      console.error(`${this.constructor.name}: クリーンアップエラー:`, error);
    }
  }

  /**
   * コンポーネントを破棄
   */
  destroy() {
    if (this.isDestroyed) return;
    
    try {
      this.emit('component:beforeDestroy');
      
      // 子コンポーネントを破棄
      this.childComponents.forEach(child => child.destroy());
      this.childComponents.clear();
      
      // クリーンアップ
      if (this.config.enableCleanup) {
        this.cleanup();
      }
      
      // DOM要素を削除
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      this.element = null;
      this.isDestroyed = true;
      
      this.emit('component:destroyed');
    } catch (error) {
      console.error(`${this.constructor.name}: 破棄エラー:`, error);
    }
  }

  // ===== ログ関連メソッド =====

  /**
   * ログ出力
   * @param {...any} args - ログ引数
   */
  log(...args) {
    console.log(`[${this.constructor.name}]`, ...args);
  }

  /**
   * デバッグログ出力
   * @param {...any} args - ログ引数
   */
  debug(...args) {
    console.log(`[${this.constructor.name}] 🔍`, ...args);
  }

  /**
   * 警告ログ出力
   * @param {...any} args - ログ引数
   */
  warn(...args) {
    console.warn(`[${this.constructor.name}] ⚠️`, ...args);
  }

  /**
   * エラーログ出力
   * @param {...any} args - ログ引数
   */
  error(...args) {
    console.error(`[${this.constructor.name}] ❌`, ...args);
  }

  /**
   * 情報ログ出力
   * @param {...any} args - ログ引数
   */
  info(...args) {
    console.info(`[${this.constructor.name}] ℹ️`, ...args);
  }

  /**
   * 成功ログ出力
   * @param {...any} args - ログ引数
   */
  success(...args) {
    console.log(`[${this.constructor.name}] ✅`, ...args);
  }
}

// エクスポート
export { Component };
export default Component; 