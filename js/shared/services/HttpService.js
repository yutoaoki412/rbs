/**
 * HTTP通信サービス
 * 統一されたHTTP通信機能を提供
 * @version 2.0.0
 */

import { BaseService } from '../../lib/base/BaseService.js';

export class HttpService extends BaseService {
  constructor() {
    super('HttpService');
    
    // デフォルト設定
    this.defaultConfig = {
      baseURL: '',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      },
      retries: 3,
      retryDelay: 1000
    };
    
    // インターセプター
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // アクティブなリクエスト
    this.activeRequests = new Map();
    
    // キャッシュ
    this.cache = new Map();
    this.cacheConfig = {
      enabled: false,
      maxAge: 5 * 60 * 1000, // 5分
      maxSize: 100
    };
  }

  /**
   * サービス初期化
   * @protected
   * @returns {Promise<void>}
   */
  async doInit() {
    // デフォルトのリクエストインターセプターを追加
    this.addRequestInterceptor(this.addRequestId.bind(this));
    this.addRequestInterceptor(this.addTimestamp.bind(this));
    
    // デフォルトのレスポンスインターセプターを追加
    this.addResponseInterceptor(this.logResponse.bind(this));
    this.addResponseInterceptor(this.removeRequestId.bind(this));
    
    this.log('HTTP通信サービス初期化完了');
  }

  /**
   * リクエストインターセプターの追加
   * @param {Function} interceptor - インターセプター関数
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * レスポンスインターセプターの追加
   * @param {Function} interceptor - インターセプター関数
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * GETリクエスト
   * @param {string} url - URL
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  /**
   * POSTリクエスト
   * @param {string} url - URL
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async post(url, data = null, options = {}) {
    return this.request('POST', url, data, options);
  }

  /**
   * PUTリクエスト
   * @param {string} url - URL
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async put(url, data = null, options = {}) {
    return this.request('PUT', url, data, options);
  }

  /**
   * PATCHリクエスト
   * @param {string} url - URL
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async patch(url, data = null, options = {}) {
    return this.request('PATCH', url, data, options);
  }

  /**
   * DELETEリクエスト
   * @param {string} url - URL
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }

  /**
   * 基本リクエスト処理
   * @param {string} method - HTTPメソッド
   * @param {string} url - URL
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async request(method, url, data = null, options = {}) {
    // 設定のマージ
    const config = { ...this.defaultConfig, ...options };
    const fullUrl = this.buildUrl(url, config.baseURL);
    
    // キャッシュチェック
    if (method === 'GET' && this.cacheConfig.enabled) {
      const cached = this.getFromCache(fullUrl);
      if (cached) {
        this.debug(`キャッシュヒット: ${fullUrl}`);
        return cached;
      }
    }

    try {
      // リクエスト設定の構築
      const requestConfig = await this.buildRequestConfig(method, fullUrl, data, config);
      
      // リクエストの実行（リトライ付き）
      const response = await this.executeWithRetry(requestConfig, config);
      
      // キャッシュに保存
      if (method === 'GET' && this.cacheConfig.enabled) {
        this.saveToCache(fullUrl, response);
      }
      
      return response;
      
    } catch (error) {
      this.handleRequestError(error, method, fullUrl);
      throw error;
    }
  }

  /**
   * リクエスト設定の構築
   * @private
   * @param {string} method - HTTPメソッド
   * @param {string} url - URL
   * @param {*} data - データ
   * @param {Object} config - 設定
   * @returns {Promise<Object>}
   */
  async buildRequestConfig(method, url, data, config) {
    let requestConfig = {
      method,
      url,
      headers: { ...config.headers },
      timeout: config.timeout,
      signal: config.signal
    };

    // データの設定
    if (data) {
      if (config.headers['Content-Type'] === 'application/json') {
        requestConfig.body = JSON.stringify(data);
      } else if (data instanceof FormData) {
        requestConfig.body = data;
        // FormDataの場合はContent-Typeヘッダーを削除（ブラウザが自動設定）
        delete requestConfig.headers['Content-Type'];
      } else {
        requestConfig.body = data;
      }
    }

    // リクエストインターセプターの実行
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor(requestConfig) || requestConfig;
    }

    return requestConfig;
  }

  /**
   * リトライ付きリクエスト実行
   * @private
   * @param {Object} requestConfig - リクエスト設定
   * @param {Object} config - 設定
   * @returns {Promise<*>}
   */
  async executeWithRetry(requestConfig, config) {
    let lastError;
    
    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        if (attempt > 0) {
          this.debug(`リトライ ${attempt}/${config.retries}: ${requestConfig.url}`);
          await this.delay(config.retryDelay * attempt);
        }
        
        const response = await this.executeRequest(requestConfig);
        return response;
        
      } catch (error) {
        lastError = error;
        
        // リトライしない条件
        if (!this.shouldRetry(error, attempt, config.retries)) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * リクエストの実行
   * @private
   * @param {Object} requestConfig - リクエスト設定
   * @returns {Promise<*>}
   */
  async executeRequest(requestConfig) {
    const requestId = requestConfig.headers['X-Request-ID'];
    this.activeRequests.set(requestId, new Date());
    
    try {
      this.debug(`リクエスト開始: ${requestConfig.method} ${requestConfig.url}`);
      
      const response = await fetch(requestConfig.url, {
        method: requestConfig.method,
        headers: requestConfig.headers,
        body: requestConfig.body,
        signal: requestConfig.signal
      });

      // レスポンスの処理
      let processedResponse = await this.processResponse(response, requestConfig);
      
      // レスポンスインターセプターの実行
      for (const interceptor of this.responseInterceptors) {
        processedResponse = await interceptor(processedResponse, requestConfig) || processedResponse;
      }
      
      this.emit('requestCompleted', {
        requestId,
        method: requestConfig.method,
        url: requestConfig.url,
        status: response.status
      });
      
      return processedResponse;
      
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * レスポンスの処理
   * @private
   * @param {Response} response - fetchレスポンス
   * @param {Object} requestConfig - リクエスト設定
   * @returns {Promise<*>}
   */
  async processResponse(response, requestConfig) {
    if (!response.ok) {
      const error = new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.response = response;
      throw error;
    }

    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType.includes('text/')) {
      return await response.text();
    } else if (contentType.includes('application/octet-stream')) {
      return await response.blob();
    } else {
      return response;
    }
  }

  /**
   * リトライ判定
   * @private
   * @param {Error} error - エラー
   * @param {number} attempt - 試行回数
   * @param {number} maxRetries - 最大リトライ回数
   * @returns {boolean}
   */
  shouldRetry(error, attempt, maxRetries) {
    if (attempt >= maxRetries) {
      return false;
    }
    
    // ネットワークエラーまたは5xxエラーの場合のみリトライ
    if (error.name === 'TypeError' || error.name === 'NetworkError') {
      return true;
    }
    
    if (error.status >= 500) {
      return true;
    }
    
    return false;
  }

  /**
   * URLの構築
   * @private
   * @param {string} url - URL
   * @param {string} baseURL - ベースURL
   * @returns {string}
   */
  buildUrl(url, baseURL) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (baseURL) {
      return `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }
    
    return url;
  }

  /**
   * ディレイ
   * @private
   * @param {number} ms - ミリ秒
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * キャッシュから取得
   * @private
   * @param {string} key - キー
   * @returns {*}
   */
  getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.cacheConfig.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * キャッシュに保存
   * @private
   * @param {string} key - キー
   * @param {*} data - データ
   */
  saveToCache(key, data) {
    // キャッシュサイズ制限
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * キャッシュクリア
   * @param {string} pattern - パターン（省略時は全削除）
   */
  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      this.log('全キャッシュをクリアしました');
      return;
    }
    
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    
    this.log(`パターン '${pattern}' に一致するキャッシュをクリアしました`);
  }

  /**
   * リクエストのキャンセル
   * @param {string} requestId - リクエストID
   */
  cancelRequest(requestId) {
    // AbortControllerを使用したキャンセル処理
    this.emit('requestCancelled', { requestId });
  }

  /**
   * アクティブなリクエストの取得
   * @returns {Array}
   */
  getActiveRequests() {
    return Array.from(this.activeRequests.entries()).map(([id, startTime]) => ({
      id,
      startTime,
      duration: Date.now() - startTime
    }));
  }

  /**
   * 設定の更新
   * @param {Object} newConfig - 新しい設定
   */
  updateConfig(newConfig) {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
    this.emit('configUpdated', this.defaultConfig);
  }

  /**
   * キャッシュ設定の更新
   * @param {Object} newCacheConfig - 新しいキャッシュ設定
   */
  updateCacheConfig(newCacheConfig) {
    this.cacheConfig = { ...this.cacheConfig, ...newCacheConfig };
    this.emit('cacheConfigUpdated', this.cacheConfig);
  }

  // デフォルトインターセプター群

  /**
   * リクエストIDの追加
   * @private
   * @param {Object} config - リクエスト設定
   * @returns {Object}
   */
  addRequestId(config) {
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return config;
  }

  /**
   * タイムスタンプの追加
   * @private
   * @param {Object} config - リクエスト設定
   * @returns {Object}
   */
  addTimestamp(config) {
    config.headers['X-Timestamp'] = new Date().toISOString();
    return config;
  }

  /**
   * レスポンスのログ出力
   * @private
   * @param {*} response - レスポンス
   * @param {Object} requestConfig - リクエスト設定
   * @returns {*}
   */
  logResponse(response, requestConfig) {
    this.debug(`レスポンス受信: ${requestConfig.method} ${requestConfig.url}`);
    return response;
  }

  /**
   * リクエストIDの削除
   * @private
   * @param {*} response - レスポンス
   * @param {Object} requestConfig - リクエスト設定
   * @returns {*}
   */
  removeRequestId(response, requestConfig) {
    // レスポンス処理完了の通知
    this.emit('responseProcessed', {
      requestId: requestConfig.headers['X-Request-ID']
    });
    return response;
  }

  /**
   * リクエストエラーの処理
   * @private
   * @param {Error} error - エラー
   * @param {string} method - HTTPメソッド
   * @param {string} url - URL
   */
  handleRequestError(error, method, url) {
    this.error(`リクエストエラー: ${method} ${url}`, error);
    this.emit('requestError', { method, url, error });
  }

  /**
   * サービスの破棄
   * @protected
   * @returns {Promise<void>}
   */
  async doDestroy() {
    // アクティブなリクエストのクリア
    this.activeRequests.clear();
    
    // キャッシュのクリア
    this.cache.clear();
    
    // インターセプターのクリア
    this.requestInterceptors.length = 0;
    this.responseInterceptors.length = 0;
    
    this.log('HTTP通信サービス破棄完了');
  }

  /**
   * サービス状態の取得
   * @returns {Object}
   */
  getStatus() {
    return {
      ...super.getStatus(),
      activeRequests: this.activeRequests.size,
      cacheSize: this.cache.size,
      requestInterceptors: this.requestInterceptors.length,
      responseInterceptors: this.responseInterceptors.length,
      config: this.defaultConfig,
      cacheConfig: this.cacheConfig
    };
  }
}

// シングルトンインスタンス
export const httpService = new HttpService(); 