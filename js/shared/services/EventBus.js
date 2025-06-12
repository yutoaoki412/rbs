/**
 * RBS陸上教室 イベントバス v3.0
 * アプリケーション全体のイベント管理システム
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.debugMode = false;
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.eventStats = new Map();
  }

  /**
   * イベントを監視
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    this.listeners.get(eventName).push(callback);
    
    if (this.debugMode) {
      console.log(`📋 EventBus: リスナー追加 [${eventName}]`);
    }
    
    // アンサブスクライブ関数を返す
    return () => this.off(eventName, callback);
  }

  /**
   * 一度だけイベントを監視
   */
  once(eventName, callback) {
    if (!this.onceListeners.has(eventName)) {
      this.onceListeners.set(eventName, []);
    }
    
    this.onceListeners.get(eventName).push(callback);
    
    if (this.debugMode) {
      console.log(`📋 EventBus: ワンタイムリスナー追加 [${eventName}]`);
    }
  }

  /**
   * イベントを発火
   */
  emit(eventName, data = null) {
    const timestamp = Date.now();
    
    // 統計情報を更新
    this.updateStats(eventName);
    
    // イベント履歴に追加
    this.addToHistory({ eventName, data, timestamp });
    
    if (this.debugMode) {
      console.log(`🔥 EventBus: イベント発火 [${eventName}]`, data);
    }

    // 通常のリスナーを実行
    if (this.listeners.has(eventName)) {
      const listeners = [...this.listeners.get(eventName)];
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`EventBusエラー [${eventName}]:`, error);
        }
      });
    }

    // ワンタイムリスナーを実行して削除
    if (this.onceListeners.has(eventName)) {
      const onceListeners = [...this.onceListeners.get(eventName)];
      this.onceListeners.delete(eventName);
      
      onceListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`EventBusエラー [${eventName}]:`, error);
        }
      });
    }

    // DOMイベントとしても発火
    const customEvent = new CustomEvent(`eventbus:${eventName}`, { 
      detail: data 
    });
    document.dispatchEvent(customEvent);
  }

  /**
   * イベント監視を解除
   */
  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      const listeners = this.listeners.get(eventName);
      const index = listeners.indexOf(callback);
      
      if (index > -1) {
        listeners.splice(index, 1);
        
        if (listeners.length === 0) {
          this.listeners.delete(eventName);
        }
        
        if (this.debugMode) {
          console.log(`📋 EventBus: リスナー削除 [${eventName}]`);
        }
      }
    }
  }

  /**
   * 指定イベントのすべてのリスナーを削除
   */
  removeAllListeners(eventName) {
    this.listeners.delete(eventName);
    this.onceListeners.delete(eventName);
    
    if (this.debugMode) {
      console.log(`📋 EventBus: 全リスナー削除 [${eventName}]`);
    }
  }

  /**
   * すべてのリスナーを削除
   */
  clear() {
    this.listeners.clear();
    this.onceListeners.clear();
    this.eventHistory = [];
    this.eventStats.clear();
    
    if (this.debugMode) {
      console.log('📋 EventBus: 全データクリア');
    }
  }

  /**
   * イベント待機（Promise）
   */
  waitFor(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`イベント待機タイムアウト: ${eventName}`));
      }, timeout);

      this.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * イベント履歴に追加
   */
  addToHistory(eventData) {
    this.eventHistory.push(eventData);
    
    // 最大サイズを超えた場合、古いものを削除
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * 統計情報を更新
   */
  updateStats(eventName) {
    if (!this.eventStats.has(eventName)) {
      this.eventStats.set(eventName, 0);
    }
    this.eventStats.set(eventName, this.eventStats.get(eventName) + 1);
  }

  /**
   * デバッグモードを設定
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 EventBus: デバッグモード ${enabled ? 'ON' : 'OFF'}`);
  }

  /**
   * デバッグ情報を出力
   */
  debug() {
    console.group('🔧 EventBus デバッグ情報');
    console.log('アクティブリスナー:', this.listeners.size);
    console.log('ワンタイムリスナー:', this.onceListeners.size);
    console.log('イベント履歴:', this.eventHistory.length);
    
    if (this.listeners.size > 0) {
      console.log('リスナー一覧:');
      for (const [eventName, listeners] of this.listeners) {
        console.log(`  ${eventName}: ${listeners.length}個`);
      }
    }
    
    if (this.eventHistory.length > 0) {
      console.log('最近のイベント:');
      this.eventHistory.slice(-10).forEach((event, index) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        console.log(`  ${index + 1}. [${time}] ${event.eventName}`);
      });
    }
    
    console.groupEnd();
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      totalListeners: this.listeners.size,
      totalOnceListeners: this.onceListeners.size,
      eventHistory: this.eventHistory.length,
      eventCounts: Object.fromEntries(this.eventStats),
      isDebugMode: this.debugMode
    };
  }

  /**
   * イベント履歴をフィルタリング
   */
  getEventHistory(eventName = null, limit = 10) {
    let history = this.eventHistory;
    
    if (eventName) {
      history = history.filter(event => event.eventName === eventName);
    }
    
    return history.slice(-limit);
  }

  /**
   * リスナー数を取得
   */
  getListenerCount(eventName) {
    const regular = this.listeners.has(eventName) ? this.listeners.get(eventName).length : 0;
    const once = this.onceListeners.has(eventName) ? this.onceListeners.get(eventName).length : 0;
    return regular + once;
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.clear();
    if (this.debugMode) {
      console.log('🔧 EventBus: 破棄完了');
    }
  }
}

// シングルトンインスタンス
const eventBus = new EventBus();

// 開発環境でデバッグモードを自動有効化
if (location.hostname === 'localhost' || 
    new URLSearchParams(location.search).has('debug')) {
  eventBus.setDebugMode(true);
}

// デフォルトエクスポート（シングルトンインスタンス）
export default eventBus;

// 名前付きエクスポート（後方互換性）
export { EventBus as EventBusClass };

// シングルトンインスタンスを名前付きでもエクスポート
export { eventBus as EventBus }; 