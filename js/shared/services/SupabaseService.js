/**
 * Supabase基底サービスクラス
 * 全てのSupabaseサービスの基底となるクラス
 * @version 1.0.0
 */

import { getSupabaseClient } from '../../lib/supabase.js';
import { EventBus } from './EventBus.js';
import { isAdminUser, requireAdminUser } from '../utils/adminAuth.js';

export class SupabaseService {
  constructor(tableName, serviceName) {
    this.tableName = tableName;
    this.serviceName = serviceName || 'SupabaseService';
    this.client = null;
    this.initialized = false;
    
    // パフォーマンス監視
    this.metrics = {
      operations: 0,
      errors: 0,
      lastOperation: null,
      startTime: Date.now()
    };
  }

  /**
   * サービス初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      return;
    }

    try {
      this.client = getSupabaseClient();
      this.initialized = true;
      
      this.log(`${this.serviceName} initialized for table: ${this.tableName}`);
      
      // 初期化イベント発行
      EventBus.emit('supabase:service:initialized', {
        service: this.serviceName,
        table: this.tableName,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.error('Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * 管理者権限チェック（統一）
   * @returns {Promise<Object>} 現在のユーザー情報
   * @throws {Error} 管理者権限がない場合
   */
  async requireAdminAuth() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      
      if (error) {
        throw new Error(`認証エラー: ${error.message}`);
      }
      
      // 統一的な管理者権限チェック
      requireAdminUser(user);
      
      this.log(`管理者権限確認完了: ${user.email}`);
      return user;
      
    } catch (error) {
      this.error('管理者権限チェック失敗:', error.message);
      throw error;
    }
  }

  /**
   * 管理者権限チェック（boolean版）
   * @returns {Promise<boolean>} 管理者権限の有無
   */
  async checkAdminAuth() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      
      if (error || !user) {
        return false;
      }
      
      return isAdminUser(user);
      
    } catch (error) {
      this.error('管理者権限チェックエラー:', error);
      return false;
    }
  }

  /**
   * レコードを取得
   * @param {Object} options - クエリオプション
   * @returns {Promise<{data: Array, error: Object|null}>}
   */
  async select(options = {}) {
    await this.init();
    
    try {
      this.incrementMetrics('select');
      
      const {
        columns = '*',
        filters = {},
        orderBy = null,
        limit = null,
        offset = null
      } = options;

      let query = this.client.from(this.tableName).select(columns);

      // フィルター適用
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && value.operator) {
            // 高度なフィルター（例: { operator: 'gte', value: '2024-01-01' }）
            query = query[value.operator](key, value.value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // ソート
      if (orderBy) {
        if (Array.isArray(orderBy)) {
          orderBy.forEach(order => {
            query = query.order(order.column, { ascending: order.ascending ?? true });
          });
        } else {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
      }

      // ページネーション
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.handleError('select', error);
        return { data: null, error };
      }

      this.log(`Selected ${data?.length || 0} records from ${this.tableName}`);
      return { data, error: null };

    } catch (error) {
      this.handleError('select', error);
      return { data: null, error };
    }
  }

  /**
   * レコードを作成
   * @param {Object|Array} data - 作成するデータ
   * @returns {Promise<{data: Object|Array, error: Object|null}>}
   */
  async insert(data) {
    await this.init();
    
    try {
      this.incrementMetrics('insert');
      
      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert(data)
        .select();

      if (error) {
        this.handleError('insert', error);
        return { data: null, error };
      }

      this.log(`Inserted ${Array.isArray(result) ? result.length : 1} record(s) to ${this.tableName}`);
      
      // 作成イベント発行
      EventBus.emit('supabase:record:created', {
        table: this.tableName,
        data: result,
        timestamp: new Date().toISOString()
      });

      return { data: result, error: null };

    } catch (error) {
      this.handleError('insert', error);
      return { data: null, error };
    }
  }

  /**
   * レコードを更新
   * @param {Object} data - 更新するデータ
   * @param {Object} filters - 更新条件
   * @returns {Promise<{data: Object|Array, error: Object|null}>}
   */
  async update(data, filters = {}) {
    await this.init();
    
    try {
      this.incrementMetrics('update');
      
      let query = this.client.from(this.tableName).update(data);

      // フィルター適用
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data: result, error } = await query.select();

      if (error) {
        this.handleError('update', error);
        return { data: null, error };
      }

      this.log(`Updated ${result?.length || 0} record(s) in ${this.tableName}`);
      
      // 更新イベント発行
      EventBus.emit('supabase:record:updated', {
        table: this.tableName,
        data: result,
        filters,
        timestamp: new Date().toISOString()
      });

      return { data: result, error: null };

    } catch (error) {
      this.handleError('update', error);
      return { data: null, error };
    }
  }

  /**
   * レコードを削除
   * @param {Object} filters - 削除条件
   * @returns {Promise<{data: Object|Array, error: Object|null}>}
   */
  async delete(filters = {}) {
    await this.init();
    
    try {
      this.incrementMetrics('delete');
      
      let query = this.client.from(this.tableName).delete();

      // フィルター適用
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data: result, error } = await query.select();

      if (error) {
        this.handleError('delete', error);
        return { data: null, error };
      }

      this.log(`Deleted ${result?.length || 0} record(s) from ${this.tableName}`);
      
      // 削除イベント発行
      EventBus.emit('supabase:record:deleted', {
        table: this.tableName,
        data: result,
        filters,
        timestamp: new Date().toISOString()
      });

      return { data: result, error: null };

    } catch (error) {
      this.handleError('delete', error);
      return { data: null, error };
    }
  }

  /**
   * レコードを upsert（存在しない場合は作成、存在する場合は更新）
   * @param {Object|Array} data - upsertするデータ
   * @param {Object} options - upsertオプション
   * @returns {Promise<{data: Object|Array, error: Object|null}>}
   */
  async upsert(data, options = {}) {
    await this.init();
    
    try {
      this.incrementMetrics('upsert');
      
      const { onConflict = 'id', ignoreDuplicates = false } = options;
      
      const { data: result, error } = await this.client
        .from(this.tableName)
        .upsert(data, { onConflict, ignoreDuplicates })
        .select();

      if (error) {
        this.handleError('upsert', error);
        return { data: null, error };
      }

      this.log(`Upserted ${Array.isArray(result) ? result.length : 1} record(s) to ${this.tableName}`);
      
      // upsertイベント発行
      EventBus.emit('supabase:record:upserted', {
        table: this.tableName,
        data: result,
        timestamp: new Date().toISOString()
      });

      return { data: result, error: null };

    } catch (error) {
      this.handleError('upsert', error);
      return { data: null, error };
    }
  }

  /**
   * レコード数を取得
   * @param {Object} filters - 集計条件
   * @returns {Promise<{count: number, error: Object|null}>}
   */
  async count(filters = {}) {
    await this.init();
    
    try {
      this.incrementMetrics('count');
      
      let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });

      // フィルター適用
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) {
        this.handleError('count', error);
        return { count: 0, error };
      }

      this.log(`Counted ${count} records in ${this.tableName}`);
      return { count, error: null };

    } catch (error) {
      this.handleError('count', error);
      return { count: 0, error };
    }
  }

  /**
   * リアルタイム購読を開始
   * @param {Function} callback - データ変更時のコールバック
   * @param {Object} options - 購読オプション
   * @returns {Object} 購読オブジェクト
   */
  subscribe(callback, options = {}) {
    if (!this.client) {
      this.error('Client not initialized for subscription');
      return null;
    }

    try {
      const { events = '*', filters = {} } = options;
      
      let subscription = this.client
        .channel(`${this.tableName}_changes`)
        .on('postgres_changes', 
          { 
            event: events, 
            schema: 'public', 
            table: this.tableName,
            ...filters
          }, 
          callback
        )
        .subscribe();

      this.log(`Subscribed to ${this.tableName} changes`);
      return subscription;

    } catch (error) {
      this.handleError('subscribe', error);
      return null;
    }
  }

  /**
   * エラーハンドリング
   * @param {string} operation - 操作名
   * @param {Object} error - エラーオブジェクト
   */
  handleError(operation, error) {
    this.metrics.errors++;
    
    const errorInfo = {
      service: this.serviceName,
      table: this.tableName,
      operation,
      error: error.message || error,
      timestamp: new Date().toISOString()
    };

    this.error(`${operation} failed:`, errorInfo);
    
    // エラーイベント発行
    EventBus.emit('supabase:error', errorInfo);
  }

  /**
   * メトリクス更新
   * @param {string} operation - 操作名
   */
  incrementMetrics(operation) {
    this.metrics.operations++;
    this.metrics.lastOperation = {
      type: operation,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * サービス統計を取得
   * @returns {Object} 統計情報
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      successRate: this.metrics.operations > 0 
        ? ((this.metrics.operations - this.metrics.errors) / this.metrics.operations * 100).toFixed(2)
        : 100
    };
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.initialized = false;
    this.client = null;
    
    EventBus.emit('supabase:service:destroyed', {
      service: this.serviceName,
      table: this.tableName,
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    });
    
    this.log(`${this.serviceName} destroyed`);
  }

  /**
   * ログ出力
   * @param {...any} args - ログ引数
   */
  log(...args) {
    console.log(`[${this.serviceName}]`, ...args);
  }

  /**
   * エラーログ出力
   * @param {...any} args - エラーログ引数
   */
  error(...args) {
    console.error(`[${this.serviceName}]`, ...args);
  }

  /**
   * デバッグログ出力（ブラウザ対応）
   * @param {...any} args - デバッグログ引数
   */
  debug(...args) {
    // ブラウザ環境での安全な環境判定
    const isDevelopment = (() => {
      try {
        return (
          (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
          (typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.port === '5502' ||
            window.location.port === '5503'
          ))
        );
      } catch (e) {
        // フォールバック: 本番環境では false
        return false;
      }
    })();

    if (isDevelopment) {
      console.debug(`[${this.serviceName}]`, ...args);
    }
  }
} 