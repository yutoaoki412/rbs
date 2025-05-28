/**
 * シンプルなEventEmitterクラス
 * モジュール間のイベント通信を提供
 */

export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  /**
   * イベントリスナーを登録
   */
  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
    return this;
  }

  /**
   * 一度だけ実行されるイベントリスナーを登録
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * イベントリスナーを削除
   */
  off(event, listenerToRemove) {
    if (!this.events.has(event)) return this;

    const listeners = this.events.get(event);
    const index = listeners.indexOf(listenerToRemove);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }

    return this;
  }

  /**
   * イベントを発火
   */
  emit(event, ...args) {
    if (!this.events.has(event)) return false;

    const listeners = this.events.get(event).slice();
    
    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error(`イベント "${event}" のリスナーでエラー:`, error);
      }
    }

    return true;
  }

  /**
   * 指定イベントのすべてのリスナーを削除
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * イベントのリスナー数を取得
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }

  /**
   * 登録されているイベント一覧を取得
   */
  eventNames() {
    return Array.from(this.events.keys());
  }
} 