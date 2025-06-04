/**
 * 関数ユーティリティ - 共通の関数操作
 * コード重複を防ぐための統一ユーティリティ
 * @version 1.0.0
 */

export class FunctionUtils {
  /**
   * デバウンス - 連続呼び出しを制限
   * @param {Function} func - 実行する関数
   * @param {number} wait - 待機時間（ミリ秒）
   * @param {boolean} immediate - 即座実行フラグ
   * @returns {Function} デバウンスされた関数
   */
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  }

  /**
   * スロットリング - 実行頻度を制限
   * @param {Function} func - 実行する関数
   * @param {number} limit - 実行間隔（ミリ秒）
   * @returns {Function} スロットリングされた関数
   */
  static throttle(func, limit) {
    let inThrottle;
    return function throttledFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 一度だけ実行される関数を作成
   * @param {Function} func - 実行する関数
   * @returns {Function} 一度だけ実行される関数
   */
  static once(func) {
    let called = false;
    let result;
    return function onceFunction(...args) {
      if (!called) {
        called = true;
        result = func.apply(this, args);
      }
      return result;
    };
  }

  /**
   * 遅延実行
   * @param {number} ms - 遅延時間（ミリ秒）
   * @returns {Promise} Promise
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * リトライ機能付き関数実行
   * @param {Function} func - 実行する関数
   * @param {Object} options - オプション
   * @returns {Promise} Promise
   */
  static async retry(func, options = {}) {
    const {
      maxRetries = 3,
      delay = 1000,
      exponentialBackoff = true,
      shouldRetry = (error) => true
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await func();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        const waitTime = exponentialBackoff ? delay * Math.pow(2, attempt) : delay;
        await this.delay(waitTime);
      }
    }

    throw lastError;
  }

  /**
   * 条件が満たされるまで待機
   * @param {Function} condition - 条件関数
   * @param {Object} options - オプション
   * @returns {Promise} Promise
   */
  static async waitFor(condition, options = {}) {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await this.delay(interval);
    }

    throw new Error('Timeout waiting for condition');
  }

  /**
   * 関数の実行時間を測定
   * @param {Function} func - 実行する関数
   * @param {string} label - ラベル
   * @returns {*} 関数の戻り値
   */
  static async measure(func, label = 'Function') {
    const startTime = performance.now();
    try {
      const result = await func();
      const endTime = performance.now();
      console.log(`${label} execution time: ${(endTime - startTime).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.error(`${label} failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * 関数の結果をメモ化
   * @param {Function} func - メモ化する関数
   * @param {Function} keyGenerator - キー生成関数
   * @returns {Function} メモ化された関数
   */
  static memoize(func, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();
    
    return function memoizedFunction(...args) {
      const key = keyGenerator(...args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func.apply(this, args);
      cache.set(key, result);
      
      // メモリリーク防止のためのサイズ制限
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      return result;
    };
  }

  /**
   * 非同期関数の並列実行（制限あり）
   * @param {Array} tasks - タスク配列
   * @param {number} concurrency - 並列数
   * @returns {Promise<Array>} 結果配列
   */
  static async parallelLimit(tasks, concurrency = 3) {
    const results = [];
    const executing = [];

    for (const [index, task] of tasks.entries()) {
      const promise = Promise.resolve().then(() => task()).then(result => {
        results[index] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 関数を安全に実行（エラーハンドリング付き）
   * @param {Function} func - 実行する関数
   * @param {*} defaultValue - デフォルト値
   * @param {Function} errorHandler - エラーハンドラー
   * @returns {*} 実行結果またはデフォルト値
   */
  static safeTry(func, defaultValue = null, errorHandler = null) {
    try {
      const result = func();
      return result instanceof Promise ? 
        result.catch(error => {
          if (errorHandler) errorHandler(error);
          return defaultValue;
        }) : result;
    } catch (error) {
      if (errorHandler) errorHandler(error);
      return defaultValue;
    }
  }
}

// 個別関数のエクスポート（後方互換性のため）
export const debounce = FunctionUtils.debounce;
export const throttle = FunctionUtils.throttle;
export const once = FunctionUtils.once;
export const delay = FunctionUtils.delay;
export const retry = FunctionUtils.retry;
export const waitFor = FunctionUtils.waitFor;
export const measure = FunctionUtils.measure;
export const memoize = FunctionUtils.memoize;
export const parallelLimit = FunctionUtils.parallelLimit;
export const safeTry = FunctionUtils.safeTry; 