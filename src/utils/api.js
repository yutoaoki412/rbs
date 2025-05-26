/**
 * API通信ユーティリティ
 * 統一されたAPI通信とエラーハンドリングを提供
 */
class ApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 10000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders
    };
  }

  /**
   * HTTP GETリクエスト
   * @param {string} url - リクエストURL
   * @param {Object} options - リクエストオプション
   * @returns {Promise} レスポンスデータ
   */
  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  /**
   * HTTP POSTリクエスト
   * @param {string} url - リクエストURL
   * @param {Object} data - リクエストボディ
   * @param {Object} options - リクエストオプション
   * @returns {Promise} レスポンスデータ
   */
  async post(url, data = null, options = {}) {
    return this.request('POST', url, data, options);
  }

  /**
   * HTTP PUTリクエスト
   * @param {string} url - リクエストURL
   * @param {Object} data - リクエストボディ
   * @param {Object} options - リクエストオプション
   * @returns {Promise} レスポンスデータ
   */
  async put(url, data = null, options = {}) {
    return this.request('PUT', url, data, options);
  }

  /**
   * HTTP DELETEリクエスト
   * @param {string} url - リクエストURL
   * @param {Object} options - リクエストオプション
   * @returns {Promise} レスポンスデータ
   */
  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }

  /**
   * 基本的なHTTPリクエスト
   * @param {string} method - HTTPメソッド
   * @param {string} url - リクエストURL
   * @param {Object} data - リクエストボディ
   * @param {Object} options - リクエストオプション
   * @returns {Promise} レスポンスデータ
   */
  async request(method, url, data = null, options = {}) {
    const fullUrl = this.buildUrl(url);
    const config = this.buildRequestConfig(method, data, options);

    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await this.executeRequest(fullUrl, config);
        return await this.handleResponse(response);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts && this.shouldRetry(error)) {
          console.warn(`API request failed (attempt ${attempt}/${this.retryAttempts}):`, error.message);
          await this.delay(this.retryDelay * attempt);
          continue;
        }
        
        break;
      }
    }

    throw this.createApiError(lastError, fullUrl, method);
  }

  /**
   * URLを構築
   * @param {string} url - 相対URL
   * @returns {string} 完全なURL
   */
  buildUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.baseURL}${url.startsWith('/') ? url : '/' + url}`;
  }

  /**
   * リクエスト設定を構築
   * @param {string} method - HTTPメソッド
   * @param {Object} data - リクエストボディ
   * @param {Object} options - 追加オプション
   * @returns {Object} fetch設定オブジェクト
   */
  buildRequestConfig(method, data, options) {
    const config = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      },
      signal: this.createAbortSignal(options.timeout || this.timeout)
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      if (data instanceof FormData) {
        // FormDataの場合はContent-Typeを削除（ブラウザが自動設定）
        delete config.headers['Content-Type'];
        config.body = data;
      } else {
        config.body = JSON.stringify(data);
      }
    }

    return config;
  }

  /**
   * AbortSignalを作成（タイムアウト用）
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   * @returns {AbortSignal} AbortSignal
   */
  createAbortSignal(timeout) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /**
   * HTTPリクエストを実行
   * @param {string} url - リクエストURL
   * @param {Object} config - fetch設定
   * @returns {Promise<Response>} Responseオブジェクト
   */
  async executeRequest(url, config) {
    try {
      return await fetch(url, config);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: ${url}`);
      }
      throw error;
    }
  }

  /**
   * レスポンスを処理
   * @param {Response} response - Responseオブジェクト
   * @returns {Promise} パースされたレスポンスデータ
   */
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response);
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType && contentType.includes('text/')) {
      return await response.text();
    } else {
      return await response.blob();
    }
  }

  /**
   * エラーレスポンスをパース
   * @param {Response} response - Responseオブジェクト
   * @returns {Promise<Object>} エラーデータ
   */
  async parseErrorResponse(response) {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return { message: await response.text() };
      }
    } catch (error) {
      return { message: response.statusText };
    }
  }

  /**
   * リトライすべきエラーかどうかを判定
   * @param {Error} error - エラーオブジェクト
   * @returns {boolean} リトライすべきかどうか
   */
  shouldRetry(error) {
    // ネットワークエラーやサーバーエラー（5xx）の場合はリトライ
    if (error.message.includes('fetch') || error.message.includes('timeout')) {
      return true;
    }
    
    if (error.message.includes('HTTP 5')) {
      return true;
    }
    
    return false;
  }

  /**
   * 指定時間待機
   * @param {number} ms - 待機時間（ミリ秒）
   * @returns {Promise} 待機Promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * APIエラーオブジェクトを作成
   * @param {Error} originalError - 元のエラー
   * @param {string} url - リクエストURL
   * @param {string} method - HTTPメソッド
   * @returns {Error} APIエラー
   */
  createApiError(originalError, url, method) {
    const error = new Error(`API request failed: ${method} ${url} - ${originalError.message}`);
    error.originalError = originalError;
    error.url = url;
    error.method = method;
    return error;
  }

  /**
   * リクエストインターセプターを設定
   * @param {Function} interceptor - インターセプター関数
   */
  setRequestInterceptor(interceptor) {
    this.requestInterceptor = interceptor;
  }

  /**
   * レスポンスインターセプターを設定
   * @param {Function} interceptor - インターセプター関数
   */
  setResponseInterceptor(interceptor) {
    this.responseInterceptor = interceptor;
  }
}

/**
 * LocalStorage APIクライアント
 * LocalStorageを使用したデータ管理
 */
class LocalStorageApi {
  constructor(prefix = 'rbs_') {
    this.prefix = prefix;
  }

  /**
   * データを取得
   * @param {string} key - キー
   * @returns {*} データ
   */
  get(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  }

  /**
   * データを保存
   * @param {string} key - キー
   * @param {*} data - データ
   * @returns {boolean} 成功したかどうか
   */
  set(key, data) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('LocalStorage set error:', error);
      return false;
    }
  }

  /**
   * データを削除
   * @param {string} key - キー
   * @returns {boolean} 成功したかどうか
   */
  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('LocalStorage remove error:', error);
      return false;
    }
  }

  /**
   * すべてのデータをクリア
   * @returns {boolean} 成功したかどうか
   */
  clear() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('LocalStorage clear error:', error);
      return false;
    }
  }

  /**
   * すべてのキーを取得
   * @returns {Array<string>} キーの配列
   */
  keys() {
    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.substring(this.prefix.length));
    } catch (error) {
      console.error('LocalStorage keys error:', error);
      return [];
    }
  }
}

/**
 * デフォルトAPIクライアントインスタンス
 */
const apiClient = new ApiClient({
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
});

/**
 * デフォルトLocalStorage APIインスタンス
 */
const localStorageApi = new LocalStorageApi('rbs_');

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiClient, LocalStorageApi, apiClient, localStorageApi };
} else if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
  window.LocalStorageApi = LocalStorageApi;
  window.apiClient = apiClient;
  window.localStorageApi = localStorageApi;
}