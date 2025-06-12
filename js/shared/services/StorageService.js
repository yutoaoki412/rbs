/**
 * RBS陸上教室 ストレージサービス v3.0
 * ローカルストレージの安全な管理とデータの永続化
 */
class StorageService {
  constructor() {
    this.prefix = 'rbs_';
    this.version = '3.0';
    this.isAvailable = this.checkAvailability();
    this.cache = new Map();
    this.listeners = new Map();
    this.maxSize = 5 * 1024 * 1024; // 5MB制限
    
    // 初期化時にバージョンチェック
    this.checkVersion();
  }

  /**
   * ローカルストレージが利用可能かチェック
   */
  checkAvailability() {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('⚠️ StorageService: ローカルストレージが利用できません', error);
      return false;
    }
  }

  /**
   * バージョンチェックと必要に応じてマイグレーション
   */
  checkVersion() {
    if (!this.isAvailable) return;
    
    const storedVersion = this.get('_version', '1.0');
    if (storedVersion !== this.version) {
      console.log(`🔄 StorageService: バージョン更新 ${storedVersion} → ${this.version}`);
      this.migrate(storedVersion, this.version);
      this.set('_version', this.version);
    }
  }

  /**
   * データマイグレーション
   */
  migrate(fromVersion, toVersion) {
    console.log(`📦 StorageService: マイグレーション実行 ${fromVersion} → ${toVersion}`);
    
    // 旧データのクリーンアップなどを実行
    if (fromVersion < '3.0') {
      this.cleanupOldData();
    }
  }

  /**
   * 旧データのクリーンアップ
   */
  cleanupOldData() {
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // 古い形式のキーを特定して削除対象にする
      if (key && key.startsWith('old_') || key.includes('deprecated')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ StorageService: 旧データ削除 ${key}`);
    });
  }

  /**
   * データを保存
   */
  set(key, value, options = {}) {
    if (!this.isAvailable) {
      console.warn('⚠️ StorageService: ストレージが利用できません');
      return false;
    }

    try {
      const fullKey = this.prefix + key;
      const data = {
        value,
        timestamp: Date.now(),
        version: this.version,
        ...options
      };

      // 期限付きデータの場合
      if (options.expiry) {
        data.expiry = Date.now() + options.expiry;
      }

      const serialized = JSON.stringify(data);
      
      // サイズチェック
      if (this.checkSize(serialized)) {
        localStorage.setItem(fullKey, serialized);
        this.cache.set(key, data);
        this.notifyListeners(key, value, 'set');
        return true;
      } else {
        console.warn('⚠️ StorageService: データサイズが上限を超えています');
        return false;
      }
    } catch (error) {
      console.error('❌ StorageService: 保存失敗', error);
      return false;
    }
  }

  /**
   * データを取得
   */
  get(key, defaultValue = null) {
    if (!this.isAvailable) {
      return defaultValue;
    }

    try {
      // キャッシュから取得を試行
      if (this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (!this.isExpired(cached)) {
          return cached.value;
        } else {
          this.cache.delete(key);
          this.remove(key);
          return defaultValue;
        }
      }

      const fullKey = this.prefix + key;
      const stored = localStorage.getItem(fullKey);
      
      if (!stored) {
        return defaultValue;
      }

      const data = JSON.parse(stored);
      
      // 期限チェック
      if (this.isExpired(data)) {
        this.remove(key);
        return defaultValue;
      }

      // キャッシュに保存
      this.cache.set(key, data);
      
      return data.value;
    } catch (error) {
      console.error('❌ StorageService: 取得失敗', error);
      return defaultValue;
    }
  }

  /**
   * データが期限切れかチェック
   */
  isExpired(data) {
    return data.expiry && Date.now() > data.expiry;
  }

  /**
   * データを削除
   */
  remove(key) {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const fullKey = this.prefix + key;
      localStorage.removeItem(fullKey);
      this.cache.delete(key);
      this.notifyListeners(key, null, 'remove');
      return true;
    } catch (error) {
      console.error('❌ StorageService: 削除失敗', error);
      return false;
    }
  }

  /**
   * キーの存在チェック
   */
  has(key) {
    if (!this.isAvailable) {
      return false;
    }

    return this.get(key) !== null;
  }

  /**
   * すべてのアプリデータをクリア
   */
  clear() {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      this.cache.clear();
      console.log('🗑️ StorageService: 全データクリア完了');
      return true;
    } catch (error) {
      console.error('❌ StorageService: クリア失敗', error);
      return false;
    }
  }

  /**
   * 使用容量をチェック
   */
  checkSize(newData = '') {
    try {
      const used = new Blob(Object.values(localStorage)).size;
      const newSize = new Blob([newData]).size;
      return (used + newSize) < this.maxSize;
    } catch (error) {
      console.warn('⚠️ StorageService: サイズチェック失敗', error);
      return true; // エラーの場合は許可
    }
  }

  /**
   * ストレージ使用量の統計を取得
   */
  getUsageStats() {
    if (!this.isAvailable) {
      return null;
    }

    try {
      let totalSize = 0;
      let appSize = 0;
      let itemCount = 0;
      let appItemCount = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = new Blob([value]).size;
        
        totalSize += size;
        itemCount++;
        
        if (key && key.startsWith(this.prefix)) {
          appSize += size;
          appItemCount++;
        }
      }

      return {
        totalSize,
        appSize,
        itemCount,
        appItemCount,
        maxSize: this.maxSize,
        usagePercent: Math.round((totalSize / this.maxSize) * 100),
        appUsagePercent: Math.round((appSize / this.maxSize) * 100)
      };
    } catch (error) {
      console.error('❌ StorageService: 統計取得失敗', error);
      return null;
    }
  }

  /**
   * 変更を監視
   */
  watch(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key).push(callback);
    
    // アンサブスクライブ関数を返す
    return () => this.unwatch(key, callback);
  }

  /**
   * 監視を解除
   */
  unwatch(key, callback) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      
      if (index > -1) {
        callbacks.splice(index, 1);
        
        if (callbacks.length === 0) {
          this.listeners.delete(key);
        }
      }
    }
  }

  /**
   * リスナーに通知
   */
  notifyListeners(key, value, action) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        try {
          callback(value, action);
        } catch (error) {
          console.error('❌ StorageService: リスナーエラー', error);
        }
      });
    }
  }

  /**
   * すべてのアプリキーを取得
   */
  getKeys() {
    if (!this.isAvailable) {
      return [];
    }

    const keys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    
    return keys;
  }

  /**
   * 期限切れデータのクリーンアップ
   */
  cleanup() {
    if (!this.isAvailable) {
      return;
    }

    const keys = this.getKeys();
    let cleanedCount = 0;
    
    keys.forEach(key => {
      const data = this.getRawData(key);
      if (data && this.isExpired(data)) {
        this.remove(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 StorageService: ${cleanedCount}件の期限切れデータを削除`);
    }
  }

  /**
   * 生データを取得（内部用）
   */
  getRawData(key) {
    try {
      const fullKey = this.prefix + key;
      const stored = localStorage.getItem(fullKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * バックアップデータを作成
   */
  backup() {
    if (!this.isAvailable) {
      return null;
    }

    const backup = {};
    const keys = this.getKeys();
    
    keys.forEach(key => {
      backup[key] = this.get(key);
    });
    
    return {
      version: this.version,
      timestamp: Date.now(),
      data: backup
    };
  }

  /**
   * バックアップデータから復元
   */
  restore(backupData) {
    if (!this.isAvailable || !backupData || !backupData.data) {
      return false;
    }

    try {
      Object.keys(backupData.data).forEach(key => {
        this.set(key, backupData.data[key]);
      });
      
      console.log('📦 StorageService: データ復元完了');
      return true;
    } catch (error) {
      console.error('❌ StorageService: 復元失敗', error);
      return false;
    }
  }

  /**
   * デバッグ情報を出力
   */
  debug() {
    console.group('🔧 StorageService デバッグ情報');
    console.log('利用可能:', this.isAvailable);
    console.log('バージョン:', this.version);
    console.log('キャッシュサイズ:', this.cache.size);
    console.log('リスナー数:', this.listeners.size);
    
    const stats = this.getUsageStats();
    if (stats) {
      console.log('使用量:', `${stats.appUsagePercent}% (${Math.round(stats.appSize / 1024)}KB / ${Math.round(stats.maxSize / 1024)}KB)`);
      console.log('アイテム数:', stats.appItemCount);
    }
    
    console.log('キー一覧:', this.getKeys());
    console.groupEnd();
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.cache.clear();
    this.listeners.clear();
    console.log('🔧 StorageService: 破棄完了');
  }
}

// シングルトンインスタンス
const storageService = new StorageService();

export default storageService; 