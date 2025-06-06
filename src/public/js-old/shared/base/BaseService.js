/**
 * 基底サービスクラス
 * 全てのサービスが継承すべき共通機能を提供
 * @version 2.0.0
 */

import { EventBus } from '../services/EventBus.js';

export class BaseService {
  constructor(serviceName = 'BaseService') {
    this.serviceName = serviceName;
    this.initialized = false;
    this.destroyed = false;
    
    // 初期化タイムスタンプ
    this.createdAt = new Date();
    this.initializedAt = null;
    
    // エラー追跡
    this.errorCount = 0;
    this.lastError = null;
    
    // イベント管理
    this.eventListeners = new Map();
  }

  /**
   * サービスの初期化
   * 継承クラスで必要に応じてオーバーライド
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      this.warn('既に初期化済みです');
      return;
    }

    if (this.destroyed) {
      throw new Error(`${this.serviceName}: 破棄済みのサービスは初期化できません`);
    }

    try {
      this.log('初期化開始');
      
      // 継承クラスでの初期化処理
      await this.doInit();
      
      this.initialized = true;
      this.initializedAt = new Date();
      
      this.log('初期化完了');
      this.emit('initialized');
      
    } catch (error) {
      this.handleError('初期化エラー', error);
      throw error;
    }
  }

  /**
   * 継承クラスでの初期化処理
   * @protected
   * @returns {Promise<void>}
   */
  async doInit() {
    // 継承クラスでオーバーライド
  }

  /**
   * サービスの破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.destroyed) {
      this.warn('既に破棄済みです');
      return;
    }

    try {
      this.log('破棄開始');
      
      // イベントリスナーをクリア
      this.clearEventListeners();
      
      // 継承クラスでの破棄処理
      await this.doDestroy();
      
      this.destroyed = true;
      this.initialized = false;
      
      this.log('破棄完了');
      this.emit('destroyed');
      
    } catch (error) {
      this.handleError('破棄エラー', error);
      throw error;
    }
  }

  /**
   * 継承クラスでの破棄処理
   * @protected
   * @returns {Promise<void>}
   */
  async doDestroy() {
    // 継承クラスでオーバーライド
  }

  /**
   * サービスの状態確認
   * @returns {boolean}
   */
  isReady() {
    return this.initialized && !this.destroyed;
  }

  /**
   * エラーハンドリング
   * @protected
   * @param {string} message - エラーメッセージ
   * @param {Error} error - エラーオブジェクト
   */
  handleError(message, error) {
    this.errorCount++;
    this.lastError = {
      message,
      error,
      timestamp: new Date()
    };
    
    this.error(`${message}:`, error);
    this.emit('error', { message, error });
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
    const fullEvent = `${this.serviceName.toLowerCase()}:${event}`;
    EventBus.emit(fullEvent, data);
  }

  /**
   * イベントリスナーのクリア
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
   * ログ出力
   * @protected
   * @param {...*} args - ログ引数
   */
  log(...args) {
    console.log(`📋 ${this.serviceName}:`, ...args);
  }

  /**
   * 警告ログ出力
   * @protected
   * @param {...*} args - ログ引数
   */
  warn(...args) {
    console.warn(`⚠️ ${this.serviceName}:`, ...args);
  }

  /**
   * エラーログ出力
   * @protected
   * @param {...*} args - ログ引数
   */
  error(...args) {
    console.error(`❌ ${this.serviceName}:`, ...args);
  }

  /**
   * デバッグログ出力
   * @protected
   * @param {...*} args - ログ引数
   */
  debug(...args) {
    // ブラウザ環境での開発環境判定
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.search.includes('debug=true');
    
    if (isDevelopment) {
      console.debug(`🐛 ${this.serviceName}:`, ...args);
    }
  }

  /**
   * サービス状態の取得
   * @returns {Object}
   */
  getStatus() {
    return {
      serviceName: this.serviceName,
      initialized: this.initialized,
      destroyed: this.destroyed,
      createdAt: this.createdAt,
      initializedAt: this.initializedAt,
      errorCount: this.errorCount,
      lastError: this.lastError
    };
  }

  /**
   * パフォーマンス情報の取得
   * @returns {Object}
   */
  getPerformanceInfo() {
    const now = new Date();
    const initTime = this.initializedAt ? this.initializedAt - this.createdAt : null;
    const uptime = this.initializedAt ? now - this.initializedAt : null;
    
    return {
      initTime,
      uptime,
      errorCount: this.errorCount,
      errorRate: this.errorCount > 0 && initTime ? this.errorCount / (uptime / 1000) : 0
    };
  }

  /**
   * ヘルスチェック
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      if (!this.isReady()) {
        return false;
      }
      
      // 継承クラスでのヘルスチェック
      return await this.doHealthCheck();
      
    } catch (error) {
      this.handleError('ヘルスチェックエラー', error);
      return false;
    }
  }

  /**
   * 継承クラスでのヘルスチェック処理
   * @protected
   * @returns {Promise<boolean>}
   */
  async doHealthCheck() {
    return true; // デフォルトでは常に健全
  }
}

// デフォルトエクスポートのみ追加（export classは既に存在するため）
export default BaseService; 