/**
 * 統一ストレージユーティリティ
 * CONFIG.storage.keysを使用した安全なローカルストレージアクセス
 * LP側と管理画面側で共通使用
 * @version 1.0.0 - 統合版
 */

import { CONFIG } from '../constants/config.js';

/**
 * 統一ストレージアクセサー
 */
export class UnifiedStorageUtils {
  /**
   * 安全にローカルストレージから値を取得
   * @param {string} key - CONFIGで定義されたキー名
   * @param {*} defaultValue - デフォルト値
   * @returns {*} 取得した値
   */
  static get(key, defaultValue = null) {
    try {
      const storageKey = CONFIG.storage.keys[key];
      if (!storageKey) {
        console.warn(`⚠️ 未定義のストレージキー: ${key}`);
        return defaultValue;
      }
      
      const value = localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`❌ ストレージ取得エラー (${key}):`, error);
      return defaultValue;
    }
  }

  /**
   * 安全にローカルストレージに値を保存
   * @param {string} key - CONFIGで定義されたキー名
   * @param {*} value - 保存する値
   * @returns {boolean} 成功したかどうか
   */
  static set(key, value) {
    try {
      const storageKey = CONFIG.storage.keys[key];
      if (!storageKey) {
        console.warn(`⚠️ 未定義のストレージキー: ${key}`);
        return false;
      }
      
      localStorage.setItem(storageKey, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`❌ ストレージ保存エラー (${key}):`, error);
      return false;
    }
  }

  /**
   * ストレージから値を削除
   * @param {string} key - CONFIGで定義されたキー名
   * @returns {boolean} 成功したかどうか
   */
  static remove(key) {
    try {
      const storageKey = CONFIG.storage.keys[key];
      if (!storageKey) {
        console.warn(`⚠️ 未定義のストレージキー: ${key}`);
        return false;
      }
      
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error(`❌ ストレージ削除エラー (${key}):`, error);
      return false;
    }
  }

  /**
   * 文字列値を直接取得（JSON.parseしない）
   * @param {string} key - CONFIGで定義されたキー名
   * @param {string} defaultValue - デフォルト値
   * @returns {string} 取得した文字列値
   */
  static getString(key, defaultValue = '') {
    try {
      const storageKey = CONFIG.storage.keys[key];
      if (!storageKey) {
        console.warn(`⚠️ 未定義のストレージキー: ${key}`);
        return defaultValue;
      }
      
      return localStorage.getItem(storageKey) || defaultValue;
    } catch (error) {
      console.error(`❌ ストレージ文字列取得エラー (${key}):`, error);
      return defaultValue;
    }
  }

  /**
   * 文字列値を直接保存（JSON.stringifyしない）
   * @param {string} key - CONFIGで定義されたキー名
   * @param {string} value - 保存する文字列値
   * @returns {boolean} 成功したかどうか
   */
  static setString(key, value) {
    try {
      const storageKey = CONFIG.storage.keys[key];
      if (!storageKey) {
        console.warn(`⚠️ 未定義のストレージキー: ${key}`);
        return false;
      }
      
      localStorage.setItem(storageKey, value);
      return true;
    } catch (error) {
      console.error(`❌ ストレージ文字列保存エラー (${key}):`, error);
      return false;
    }
  }

  /**
   * RBS関連の全ストレージキーを取得
   * @returns {Array<string>} RBS関連のストレージキー一覧
   */
  static getAllRbsKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CONFIG.storage.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * RBS関連の全データをクリア
   * @returns {number} 削除されたキー数
   */
  static clearAllRbsData() {
    const keys = this.getAllRbsKeys();
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 RBSデータクリア完了: ${keys.length}件`);
    return keys.length;
  }

  /**
   * ストレージサイズを取得
   * @returns {Object} ストレージサイズ情報
   */
  static getStorageInfo() {
    try {
      const rbsKeys = this.getAllRbsKeys();
      let totalSize = 0;
      const keyInfo = {};

      rbsKeys.forEach(key => {
        const value = localStorage.getItem(key);
        const size = value ? value.length : 0;
        totalSize += size;
        keyInfo[key] = {
          size,
          sizeKB: Math.round(size / 1024 * 100) / 100
        };
      });

      return {
        totalKeys: rbsKeys.length,
        totalSize,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        keyInfo,
        isNearLimit: totalSize > 5 * 1024 * 1024 * 0.8 // 80% of 5MB limit
      };
    } catch (error) {
      console.error('❌ ストレージ情報取得エラー:', error);
      return null;
    }
  }

  /**
   * デバッグ情報を表示
   */
  static debug() {
    if (!CONFIG.debug?.enabled) {
      console.log('デバッグモードが無効です');
      return;
    }

    const info = this.getStorageInfo();
    const definedKeys = Object.keys(CONFIG.storage.keys);

    console.group('🗄️ 統一ストレージデバッグ情報');
    console.log('定義済みキー数:', definedKeys.length);
    console.log('実際のRBSキー数:', info?.totalKeys || 0);
    console.log('総サイズ:', info?.totalSizeKB || 0, 'KB');
    console.log('容量警告:', info?.isNearLimit ? '⚠️ 制限に近づいています' : '✅ 正常');
    
    console.log('定義済みキー一覧:');
    definedKeys.forEach(key => {
      const storageKey = CONFIG.storage.keys[key];
      const hasData = localStorage.getItem(storageKey) !== null;
      console.log(`  ${key}: ${storageKey} ${hasData ? '✅' : '❌'}`);
    });

    if (info?.keyInfo) {
      console.log('サイズ上位5キー:');
      Object.entries(info.keyInfo)
        .sort(([,a], [,b]) => b.size - a.size)
        .slice(0, 5)
        .forEach(([key, data]) => {
          console.log(`  ${key}: ${data.sizeKB}KB`);
        });
    }

    console.groupEnd();
    return info;
  }
}

/**
 * 便利な短縮関数
 */
export const storage = {
  get: UnifiedStorageUtils.get,
  set: UnifiedStorageUtils.set,
  remove: UnifiedStorageUtils.remove,
  getString: UnifiedStorageUtils.getString,
  setString: UnifiedStorageUtils.setString,
  clearAll: UnifiedStorageUtils.clearAllRbsData,
  info: UnifiedStorageUtils.getStorageInfo,
  debug: UnifiedStorageUtils.debug
};

// グローバルアクセス（デバッグ用）
if (typeof window !== 'undefined' && CONFIG.debug?.enabled) {
  window.rbsStorage = storage;
}

export default UnifiedStorageUtils; 