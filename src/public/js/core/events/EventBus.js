/**
 * イベントバス - アプリケーション全体のイベント管理
 * シングルトンパターンで実装
 */
class EventBus {
  constructor() {
    if (EventBus.instance) {
      return EventBus.instance;
    }
    
    this.eventTarget = new EventTarget();
    this.listeners = new Map();
    this.onceListeners = new Set();
    this.debugMode = false;
    
    EventBus.instance = this;
  }

  /**
   * デバッグモードを設定
   * @param {boolean} enabled - デバッグモード有効化
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * イベントを発火
   * @param {string} eventName - イベント名
   * @param {Object} data - イベントデータ
   */
  emit(eventName, data = {}) {
    try {
      if (this.debugMode) {
        console.log(`[EventBus] Emitting: ${eventName}`, data);
      }
      
      const event = new CustomEvent(eventName, {
        detail: {
          ...data,
          timestamp: Date.now(),
          eventName
        }
      });
      
      this.eventTarget.dispatchEvent(event);
      
      // グローバルイベントとしても発火
      document.dispatchEvent(event);
    } catch (error) {
      console.error(`[EventBus] イベント発火エラー (${eventName}):`, error);
    }
  }

  /**
   * イベントを監視
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー
   * @param {Object} options - オプション
   */
  on(eventName, handler, options = {}) {
    try {
      const wrappedHandler = (event) => {
        if (this.debugMode) {
          console.log(`[EventBus] Handling: ${eventName}`, event.detail);
        }
        handler(event.detail, event);
      };
      
      this.eventTarget.addEventListener(eventName, wrappedHandler, options);
      
      // リスナー管理
      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, []);
      }
      this.listeners.get(eventName).push({
        original: handler,
        wrapped: wrappedHandler,
        options
      });
      
      return () => this.off(eventName, handler);
    } catch (error) {
      console.error(`[EventBus] イベント監視エラー (${eventName}):`, error);
      return () => {};
    }
  }

  /**
   * 一度だけイベントを監視
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー
   */
  once(eventName, handler) {
    const onceHandler = (data, event) => {
      handler(data, event);
      this.off(eventName, onceHandler);
    };
    
    this.onceListeners.add(onceHandler);
    return this.on(eventName, onceHandler, { once: true });
  }

  /**
   * イベント監視を解除
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー
   */
  off(eventName, handler) {
    try {
      const listeners = this.listeners.get(eventName);
      if (!listeners) return;
      
      const listenerIndex = listeners.findIndex(l => l.original === handler);
      if (listenerIndex === -1) return;
      
      const listener = listeners[listenerIndex];
      this.eventTarget.removeEventListener(eventName, listener.wrapped, listener.options);
      
      listeners.splice(listenerIndex, 1);
      if (listeners.length === 0) {
        this.listeners.delete(eventName);
      }
      
      this.onceListeners.delete(handler);
    } catch (error) {
      console.error(`[EventBus] イベント監視解除エラー (${eventName}):`, error);
    }
  }

  /**
   * 特定のイベントのすべてのリスナーを削除
   * @param {string} eventName - イベント名
   */
  removeAllListeners(eventName) {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        this.eventTarget.removeEventListener(eventName, listener.wrapped, listener.options);
      });
      this.listeners.delete(eventName);
    }
  }

  /**
   * すべてのリスナーを削除
   */
  clear() {
    this.listeners.forEach((listeners, eventName) => {
      this.removeAllListeners(eventName);
    });
    this.onceListeners.clear();
  }

  /**
   * 登録されているリスナー数を取得
   * @param {string} eventName - イベント名（省略時は全体）
   * @returns {number} リスナー数
   */
  getListenerCount(eventName) {
    if (eventName) {
      const listeners = this.listeners.get(eventName);
      return listeners ? listeners.length : 0;
    }
    
    let total = 0;
    this.listeners.forEach(listeners => {
      total += listeners.length;
    });
    return total;
  }

  /**
   * 登録されているイベント名一覧を取得
   * @returns {string[]} イベント名配列
   */
  getEventNames() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Promiseベースのイベント待機
   * @param {string} eventName - イベント名
   * @param {number} timeout - タイムアウト（ミリ秒）
   * @returns {Promise} イベントデータのPromise
   */
  waitFor(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(eventName, handler);
        reject(new Error(`イベント待機タイムアウト: ${eventName}`));
      }, timeout);
      
      const handler = (data) => {
        clearTimeout(timeoutId);
        resolve(data);
      };
      
      this.once(eventName, handler);
    });
  }

  /**
   * 条件付きイベント監視
   * @param {string} eventName - イベント名
   * @param {Function} condition - 条件関数
   * @param {Function} handler - ハンドラー
   */
  onWhen(eventName, condition, handler) {
    return this.on(eventName, (data, event) => {
      if (condition(data, event)) {
        handler(data, event);
      }
    });
  }

  /**
   * 複数イベントの同時監視
   * @param {string[]} eventNames - イベント名配列
   * @param {Function} handler - ハンドラー
   * @returns {Function} 解除関数
   */
  onMultiple(eventNames, handler) {
    const unsubscribers = eventNames.map(eventName => 
      this.on(eventName, (data, event) => handler(data, event, eventName))
    );
    
    return () => unsubscribers.forEach(unsub => unsub());
  }
}

// シングルトンインスタンスを作成
const eventBus = new EventBus();

// グローバルに公開
window.EventBus = EventBus;
window.eventBus = eventBus;

// エクスポート
export default eventBus; 