/**
 * ベースモジュール - すべてのAdminモジュールの共通基盤
 * @version 1.0.0 - シンプル設計
 */

import { EventBus } from '../../../shared/services/EventBus.js';

/**
 * 全管理画面モジュールの基底クラス
 */
export class BaseModule {
  constructor(name) {
    this.name = name;
    this.initialized = false;
    this.eventBus = EventBus;
    this.state = {};
    this.config = {};
  }

  /**
   * 初期化（サブクラスでオーバーライド）
   */
  async init() {
    if (this.initialized) return this;
    
    try {
      await this.setup();
      this.initialized = true;
      this.emit('module:initialized', { module: this.name });
      console.log(`✅ ${this.name}モジュール初期化完了`);
      return this;
    } catch (error) {
      console.error(`❌ ${this.name}モジュール初期化エラー:`, error);
      throw error;
    }
  }

  /**
   * セットアップ（サブクラスで実装）
   */
  async setup() {
    // サブクラスで実装
  }

  /**
   * イベント発行
   */
  emit(event, data) {
    this.eventBus.emit(event, { ...data, module: this.name });
  }

  /**
   * イベント購読
   */
  on(event, handler) {
    this.eventBus.on(event, handler);
  }

  /**
   * 状態更新
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.emit('module:state-changed', { state: this.state });
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('module:config-updated', { config: this.config });
  }

  /**
   * エラーハンドリング
   */
  handleError(error, context = '') {
    const errorInfo = {
      module: this.name,
      context,
      error: error.message,
      stack: error.stack
    };
    
    console.error(`❌ ${this.name}モジュールエラー [${context}]:`, error);
    this.emit('module:error', errorInfo);
    
    return errorInfo;
  }

  /**
   * 通知表示
   */
  notify(message, type = 'info') {
    this.emit('module:notification', { message, type });
  }

  /**
   * デバッグ情報
   */
  getDebugInfo() {
    return {
      name: this.name,
      initialized: this.initialized,
      state: this.state,
      config: this.config
    };
  }

  /**
   * 破棄
   */
  destroy() {
    this.initialized = false;
    this.state = {};
    this.emit('module:destroyed', { module: this.name });
  }
} 