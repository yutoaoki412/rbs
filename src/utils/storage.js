/**
 * ストレージ管理ユーティリティ
 * LocalStorage、SessionStorage、Cookieの統一インターフェース
 */
class StorageManager {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rbs_';
    this.defaultExpiry = options.defaultExpiry || 24 * 60 * 60 * 1000; // 24時間
    this.enableEncryption = options.enableEncryption || false;
    this.encryptionKey = options.encryptionKey || 'default-key';
  }

  /**
   * LocalStorageにデータを保存
   * @param {string} key - キー
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {boolean} 成功したかどうか
   */
  setLocal(key, data, options = {}) {
    try {
      const item = this.createStorageItem(data, options);
      const serialized = JSON.stringify(item);
      const encrypted = this.enableEncryption ? this.encrypt(serialized) : serialized;
      
      localStorage.setItem(this.prefix + key, encrypted);
      return true;
    } catch (error) {
      console.error('LocalStorage set error:', error);
      return false;
    }
  }

  /**
   * LocalStorageからデータを取得
   * @param {string} key - キー
   * @param {*} defaultValue - デフォルト値
   * @returns {*} データ
   */
  getLocal(key, defaultValue = null) {
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) return defaultValue;

      const serialized = this.enableEncryption ? this.decrypt(encrypted) : encrypted;
      const item = JSON.parse(serialized);
      
      return this.extractStorageItem(item, defaultValue);
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * SessionStorageにデータを保存
   * @param {string} key - キー
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {boolean} 成功したかどうか
   */
  setSession(key, data, options = {}) {
    try {
      const item = this.createStorageItem(data, options);
      const serialized = JSON.stringify(item);
      const encrypted = this.enableEncryption ? this.encrypt(serialized) : serialized;
      
      sessionStorage.setItem(this.prefix + key, encrypted);
      return true;
    } catch (error) {
      console.error('SessionStorage set error:', error);
      return false;
    }
  }

  /**
   * SessionStorageからデータを取得
   * @param {string} key - キー
   * @param {*} defaultValue - デフォルト値
   * @returns {*} データ
   */
  getSession(key, defaultValue = null) {
    try {
      const encrypted = sessionStorage.getItem(this.prefix + key);
      if (!encrypted) return defaultValue;

      const serialized = this.enableEncryption ? this.decrypt(encrypted) : encrypted;
      const item = JSON.parse(serialized);
      
      return this.extractStorageItem(item, defaultValue);
    } catch (error) {
      console.error('SessionStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Cookieにデータを保存
   * @param {string} key - キー
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {boolean} 成功したかどうか
   */
  setCookie(key, data, options = {}) {
    try {
      const item = this.createStorageItem(data, options);
      const serialized = JSON.stringify(item);
      const encrypted = this.enableEncryption ? this.encrypt(serialized) : serialized;
      const encoded = encodeURIComponent(encrypted);
      
      const cookieOptions = {
        expires: options.expires || new Date(Date.now() + this.defaultExpiry),
        path: options.path || '/',
        domain: options.domain || '',
        secure: options.secure || false,
        sameSite: options.sameSite || 'Lax'
      };

      let cookieString = `${this.prefix + key}=${encoded}`;
      
      if (cookieOptions.expires) {
        cookieString += `; expires=${cookieOptions.expires.toUTCString()}`;
      }
      
      if (cookieOptions.path) {
        cookieString += `; path=${cookieOptions.path}`;
      }
      
      if (cookieOptions.domain) {
        cookieString += `; domain=${cookieOptions.domain}`;
      }
      
      if (cookieOptions.secure) {
        cookieString += `; secure`;
      }
      
      if (cookieOptions.sameSite) {
        cookieString += `; samesite=${cookieOptions.sameSite}`;
      }

      document.cookie = cookieString;
      return true;
    } catch (error) {
      console.error('Cookie set error:', error);
      return false;
    }
  }

  /**
   * Cookieからデータを取得
   * @param {string} key - キー
   * @param {*} defaultValue - デフォルト値
   * @returns {*} データ
   */
  getCookie(key, defaultValue = null) {
    try {
      const name = this.prefix + key + '=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookies = decodedCookie.split(';');
      
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(name) === 0) {
          const encrypted = cookie.substring(name.length);
          const serialized = this.enableEncryption ? this.decrypt(encrypted) : encrypted;
          const item = JSON.parse(serialized);
          
          return this.extractStorageItem(item, defaultValue);
        }
      }
      
      return defaultValue;
    } catch (error) {
      console.error('Cookie get error:', error);
      return defaultValue;
    }
  }

  /**
   * データを削除
   * @param {string} key - キー
   * @param {string} type - ストレージタイプ ('local', 'session', 'cookie', 'all')
   * @returns {boolean} 成功したかどうか
   */
  remove(key, type = 'all') {
    let success = true;

    try {
      if (type === 'local' || type === 'all') {
        localStorage.removeItem(this.prefix + key);
      }
      
      if (type === 'session' || type === 'all') {
        sessionStorage.removeItem(this.prefix + key);
      }
      
      if (type === 'cookie' || type === 'all') {
        document.cookie = `${this.prefix + key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    } catch (error) {
      console.error('Storage remove error:', error);
      success = false;
    }

    return success;
  }

  /**
   * すべてのデータをクリア
   * @param {string} type - ストレージタイプ ('local', 'session', 'cookie', 'all')
   * @returns {boolean} 成功したかどうか
   */
  clear(type = 'all') {
    let success = true;

    try {
      if (type === 'local' || type === 'all') {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
        keys.forEach(key => localStorage.removeItem(key));
      }
      
      if (type === 'session' || type === 'all') {
        const keys = Object.keys(sessionStorage).filter(key => key.startsWith(this.prefix));
        keys.forEach(key => sessionStorage.removeItem(key));
      }
      
      if (type === 'cookie' || type === 'all') {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const [name] = cookie.split('=');
          if (name.trim().startsWith(this.prefix)) {
            document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      success = false;
    }

    return success;
  }

  /**
   * ストレージアイテムを作成
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {Object} ストレージアイテム
   */
  createStorageItem(data, options = {}) {
    return {
      data,
      timestamp: Date.now(),
      expires: options.expires ? options.expires.getTime() : null,
      version: options.version || '1.0'
    };
  }

  /**
   * ストレージアイテムからデータを抽出
   * @param {Object} item - ストレージアイテム
   * @param {*} defaultValue - デフォルト値
   * @returns {*} データ
   */
  extractStorageItem(item, defaultValue = null) {
    if (!item || typeof item !== 'object') {
      return defaultValue;
    }

    // 有効期限チェック
    if (item.expires && Date.now() > item.expires) {
      return defaultValue;
    }

    return item.data !== undefined ? item.data : defaultValue;
  }

  /**
   * データを暗号化（簡易実装）
   * @param {string} text - 暗号化するテキスト
   * @returns {string} 暗号化されたテキスト
   */
  encrypt(text) {
    // 実際のプロダクションでは、より強力な暗号化ライブラリを使用してください
    return btoa(text);
  }

  /**
   * データを復号化（簡易実装）
   * @param {string} encryptedText - 暗号化されたテキスト
   * @returns {string} 復号化されたテキスト
   */
  decrypt(encryptedText) {
    // 実際のプロダクションでは、より強力な暗号化ライブラリを使用してください
    return atob(encryptedText);
  }

  /**
   * ストレージの使用量を取得
   * @param {string} type - ストレージタイプ ('local', 'session')
   * @returns {Object} 使用量情報
   */
  getStorageUsage(type = 'local') {
    try {
      const storage = type === 'local' ? localStorage : sessionStorage;
      let totalSize = 0;
      let itemCount = 0;
      const items = {};

      for (let key in storage) {
        if (key.startsWith(this.prefix)) {
          const value = storage[key];
          const size = new Blob([value]).size;
          totalSize += size;
          itemCount++;
          items[key.substring(this.prefix.length)] = {
            size,
            value: value.substring(0, 100) + (value.length > 100 ? '...' : '')
          };
        }
      }

      return {
        totalSize,
        itemCount,
        items,
        formattedSize: this.formatBytes(totalSize)
      };
    } catch (error) {
      console.error('Storage usage error:', error);
      return { totalSize: 0, itemCount: 0, items: {}, formattedSize: '0 B' };
    }
  }

  /**
   * バイト数を人間が読みやすい形式にフォーマット
   * @param {number} bytes - バイト数
   * @returns {string} フォーマットされた文字列
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * ストレージが利用可能かチェック
   * @param {string} type - ストレージタイプ ('local', 'session', 'cookie')
   * @returns {boolean} 利用可能かどうか
   */
  isStorageAvailable(type) {
    try {
      if (type === 'cookie') {
        return navigator.cookieEnabled;
      }
      
      const storage = type === 'local' ? localStorage : sessionStorage;
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 期限切れのアイテムをクリーンアップ
   * @param {string} type - ストレージタイプ ('local', 'session', 'all')
   * @returns {number} クリーンアップされたアイテム数
   */
  cleanup(type = 'all') {
    let cleanedCount = 0;

    try {
      const storageTypes = type === 'all' ? ['local', 'session'] : [type];
      
      storageTypes.forEach(storageType => {
        const storage = storageType === 'local' ? localStorage : sessionStorage;
        const keysToRemove = [];
        
        for (let key in storage) {
          if (key.startsWith(this.prefix)) {
            try {
              const item = JSON.parse(storage[key]);
              if (item.expires && Date.now() > item.expires) {
                keysToRemove.push(key);
              }
            } catch (error) {
              // パースできないアイテムも削除対象とする
              keysToRemove.push(key);
            }
          }
        }
        
        keysToRemove.forEach(key => {
          storage.removeItem(key);
          cleanedCount++;
        });
      });
    } catch (error) {
      console.error('Storage cleanup error:', error);
    }

    return cleanedCount;
  }
}

/**
 * キャッシュ管理クラス
 * メモリキャッシュとストレージキャッシュの統合管理
 */
class CacheManager {
  constructor(options = {}) {
    this.memoryCache = new Map();
    this.storageManager = new StorageManager(options);
    this.maxMemoryItems = options.maxMemoryItems || 100;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5分
  }

  /**
   * キャッシュにデータを保存
   * @param {string} key - キー
   * @param {*} data - データ
   * @param {Object} options - オプション
   * @returns {boolean} 成功したかどうか
   */
  set(key, data, options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const expires = new Date(Date.now() + ttl);
    
    // メモリキャッシュに保存
    this.memoryCache.set(key, {
      data,
      expires: expires.getTime()
    });
    
    // メモリキャッシュのサイズ制限
    if (this.memoryCache.size > this.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    // ストレージにも保存（永続化が必要な場合）
    if (options.persistent) {
      return this.storageManager.setLocal(key, data, { expires });
    }
    
    return true;
  }

  /**
   * キャッシュからデータを取得
   * @param {string} key - キー
   * @param {*} defaultValue - デフォルト値
   * @returns {*} データ
   */
  get(key, defaultValue = null) {
    // メモリキャッシュから取得
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      if (Date.now() < item.expires) {
        return item.data;
      } else {
        this.memoryCache.delete(key);
      }
    }
    
    // ストレージから取得
    const data = this.storageManager.getLocal(key, defaultValue);
    if (data !== defaultValue) {
      // メモリキャッシュにも保存
      this.memoryCache.set(key, {
        data,
        expires: Date.now() + this.defaultTTL
      });
    }
    
    return data;
  }

  /**
   * キャッシュからデータを削除
   * @param {string} key - キー
   * @returns {boolean} 成功したかどうか
   */
  delete(key) {
    this.memoryCache.delete(key);
    return this.storageManager.remove(key, 'local');
  }

  /**
   * すべてのキャッシュをクリア
   * @returns {boolean} 成功したかどうか
   */
  clear() {
    this.memoryCache.clear();
    return this.storageManager.clear('local');
  }

  /**
   * 期限切れのキャッシュをクリーンアップ
   * @returns {number} クリーンアップされたアイテム数
   */
  cleanup() {
    let cleanedCount = 0;
    
    // メモリキャッシュのクリーンアップ
    for (let [key, item] of this.memoryCache) {
      if (Date.now() >= item.expires) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }
    
    // ストレージキャッシュのクリーンアップ
    cleanedCount += this.storageManager.cleanup('local');
    
    return cleanedCount;
  }
}

/**
 * デフォルトのストレージマネージャーインスタンス
 */
const storageManager = new StorageManager({
  prefix: 'rbs_',
  defaultExpiry: 24 * 60 * 60 * 1000, // 24時間
  enableEncryption: false
});

/**
 * デフォルトのキャッシュマネージャーインスタンス
 */
const cacheManager = new CacheManager({
  prefix: 'rbs_cache_',
  maxMemoryItems: 100,
  defaultTTL: 5 * 60 * 1000 // 5分
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, CacheManager, storageManager, cacheManager };
} else if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
  window.CacheManager = CacheManager;
  window.storageManager = storageManager;
  window.cacheManager = cacheManager;
} 