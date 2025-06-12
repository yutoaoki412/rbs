/**
 * 管理画面設定サービス
 * 管理画面の設定項目を専門的に管理
 * @version 1.0.0
 */

import { BaseService } from '../../../lib/base/BaseService.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class AdminSettingsService extends BaseService {
  constructor() {
    super('AdminSettingsService');
    
    // ストレージキー
    this.storageKeys = {
      adminSettings: CONFIG.storage.keys.adminSettings || 'rbs_admin_settings',
      adminTab: CONFIG.storage.keys.adminTab || 'rbs_admin_tab',
      notificationMode: CONFIG.storage.keys.notificationMode || 'rbs_notification_mode'
    };
    
    // デフォルト設定
    this.defaultSettings = {
      // 基本設定
      notifications: true,
      autoSave: true,
      autoSaveInterval: 60, // 秒
      theme: 'light',
      
      // 表示設定
      showDeveloperMode: false,
      compactMode: false,
      
      // 動作設定
      confirmBeforeDelete: true,
      showPreviewBeforePublish: true,
      autoBackup: true,
      
      // システム情報
      version: '1.0.0',
      lastUpdated: null,
      createdAt: null
    };
    
    // 現在の設定
    this.currentSettings = {};
    
    // 設定スキーマ（検証用）
    this.settingsSchema = {
      notifications: { type: 'boolean', default: true },
      autoSave: { type: 'boolean', default: true },
      autoSaveInterval: { type: 'number', min: 30, max: 600, default: 60 },
      theme: { type: 'string', options: ['light', 'dark', 'auto'], default: 'light' },
      showDeveloperMode: { type: 'boolean', default: false },
      compactMode: { type: 'boolean', default: false },
      confirmBeforeDelete: { type: 'boolean', default: true },
      showPreviewBeforePublish: { type: 'boolean', default: true },
      autoBackup: { type: 'boolean', default: true }
    };
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) {
      this.warn('既に初期化済みです');
      return;
    }

    this.debug('🔧 管理画面設定サービス初期化開始');
    
    try {
      // 設定読み込み
      await this.loadSettings();
      
      // 設定の妥当性チェック
      this.validateSettings();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      this.initialized = true;
      this.debug('✅ 管理画面設定サービス初期化完了');
      
      // 初期化完了イベント
      EventBus.emit('adminSettings:initialized', this.currentSettings);
      
    } catch (error) {
      this.error('❌ 初期化エラー:', error);
      // エラーでもデフォルト設定で動作を継続
      this.currentSettings = { ...this.defaultSettings };
      this.initialized = true;
    }
  }

  /**
   * 設定を読み込み
   */
  async loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKeys.adminSettings);
      
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        this.currentSettings = { ...this.defaultSettings, ...parsedSettings };
        this.debug('📥 設定読み込み完了:', this.currentSettings);
      } else {
        // 初回起動時はデフォルト設定を保存
        this.currentSettings = { ...this.defaultSettings };
        this.currentSettings.createdAt = new Date().toISOString();
        await this.saveSettings();
        this.debug('🆕 デフォルト設定で初期化');
      }
      
    } catch (error) {
      this.error('設定読み込みエラー:', error);
      this.currentSettings = { ...this.defaultSettings };
    }
  }

  /**
   * 設定を保存
   */
  async saveSettings() {
    try {
      // 更新日時を設定
      this.currentSettings.lastUpdated = new Date().toISOString();
      
      // ローカルストレージに保存
      localStorage.setItem(
        this.storageKeys.adminSettings, 
        JSON.stringify(this.currentSettings)
      );
      
      this.debug('💾 設定保存完了:', this.currentSettings);
      
      // 保存完了イベント
      EventBus.emit('adminSettings:saved', this.currentSettings);
      
      return { success: true };
      
    } catch (error) {
      this.error('設定保存エラー:', error);
      EventBus.emit('adminSettings:saveError', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 設定値を取得
   * @param {string} key - 設定キー
   * @returns {*} 設定値
   */
  get(key) {
    if (key in this.currentSettings) {
      return this.currentSettings[key];
    }
    
    // デフォルト値を返す
    if (key in this.defaultSettings) {
      return this.defaultSettings[key];
    }
    
    this.warn(`未知の設定キー: ${key}`);
    return null;
  }

  /**
   * 設定値を更新
   * @param {string} key - 設定キー
   * @param {*} value - 設定値
   * @returns {boolean} 成功フラグ
   */
  set(key, value) {
    try {
      // 設定値の検証
      if (!this.validateSetting(key, value)) {
        this.warn(`無効な設定値: ${key} = ${value}`);
        return false;
      }
      
      const oldValue = this.currentSettings[key];
      this.currentSettings[key] = value;
      
      this.debug(`⚙️ 設定更新: ${key} = ${value} (旧値: ${oldValue})`);
      
      // 変更イベント
      EventBus.emit('adminSettings:changed', { key, value, oldValue });
      
      return true;
      
    } catch (error) {
      this.error(`設定更新エラー (${key}):`, error);
      return false;
    }
  }

  /**
   * 複数の設定を一括更新
   * @param {Object} settings - 設定オブジェクト
   * @returns {boolean} 成功フラグ
   */
  setMultiple(settings) {
    try {
      const changes = {};
      let hasError = false;
      
      for (const [key, value] of Object.entries(settings)) {
        if (this.validateSetting(key, value)) {
          const oldValue = this.currentSettings[key];
          this.currentSettings[key] = value;
          changes[key] = { value, oldValue };
        } else {
          this.warn(`無効な設定をスキップ: ${key} = ${value}`);
          hasError = true;
        }
      }
      
      if (Object.keys(changes).length > 0) {
        this.debug('⚙️ 一括設定更新:', changes);
        EventBus.emit('adminSettings:multipleChanged', changes);
      }
      
      return !hasError;
      
    } catch (error) {
      this.error('一括設定更新エラー:', error);
      return false;
    }
  }

  /**
   * 設定を検証
   * @param {string} key - 設定キー
   * @param {*} value - 設定値
   * @returns {boolean} 有効フラグ
   */
  validateSetting(key, value) {
    const schema = this.settingsSchema[key];
    if (!schema) {
      this.warn(`未知の設定キー: ${key}`);
      return false;
    }
    
    // 型チェック
    if (typeof value !== schema.type) {
      this.warn(`型不正: ${key} expects ${schema.type}, got ${typeof value}`);
      return false;
    }
    
    // 追加の検証
    switch (schema.type) {
      case 'number':
        if (schema.min !== undefined && value < schema.min) return false;
        if (schema.max !== undefined && value > schema.max) return false;
        break;
        
      case 'string':
        if (schema.options && !schema.options.includes(value)) return false;
        break;
    }
    
    return true;
  }

  /**
   * 全設定の妥当性チェック
   */
  validateSettings() {
    let hasErrors = false;
    
    for (const [key, value] of Object.entries(this.currentSettings)) {
      if (key in this.settingsSchema && !this.validateSetting(key, value)) {
        this.warn(`無効な設定を修正: ${key}`);
        this.currentSettings[key] = this.settingsSchema[key].default;
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      this.saveSettings();
    }
  }

  /**
   * 設定をリセット
   * @param {Array} keys - リセットするキー（省略時は全設定）
   */
  async resetSettings(keys = null) {
    try {
      if (keys) {
        // 指定されたキーのみリセット
        const changes = {};
        for (const key of keys) {
          if (key in this.defaultSettings) {
            const oldValue = this.currentSettings[key];
            this.currentSettings[key] = this.defaultSettings[key];
            changes[key] = { value: this.defaultSettings[key], oldValue };
          }
        }
        
        if (Object.keys(changes).length > 0) {
          EventBus.emit('adminSettings:reset', { keys, changes });
        }
        
      } else {
        // 全設定をリセット
        const oldSettings = { ...this.currentSettings };
        this.currentSettings = { ...this.defaultSettings };
        this.currentSettings.createdAt = oldSettings.createdAt || new Date().toISOString();
        
        EventBus.emit('adminSettings:fullReset', { oldSettings });
      }
      
      await this.saveSettings();
      this.debug('🔄 設定リセット完了');
      
      return { success: true };
      
    } catch (error) {
      this.error('設定リセットエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 現在の設定を全て取得
   * @returns {Object} 設定オブジェクト
   */
  getAllSettings() {
    return { ...this.currentSettings };
  }

  /**
   * 設定のエクスポートデータを取得
   * @returns {Object} エクスポート用データ
   */
  getExportData() {
    return {
      settings: this.currentSettings,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: this.currentSettings.version || '1.0.0',
        type: 'adminSettings'
      }
    };
  }

  /**
   * 設定をインポート
   * @param {Object} data - インポートデータ
   * @returns {Object} 結果
   */
  async importSettings(data) {
    try {
      if (!data.settings) {
        throw new Error('無効なインポートデータです');
      }
      
      const oldSettings = { ...this.currentSettings };
      const newSettings = { ...this.defaultSettings, ...data.settings };
      
      // 設定の検証
      const validSettings = {};
      for (const [key, value] of Object.entries(newSettings)) {
        if (this.validateSetting(key, value)) {
          validSettings[key] = value;
        } else {
          this.warn(`無効な設定をスキップ: ${key}`);
        }
      }
      
      this.currentSettings = validSettings;
      await this.saveSettings();
      
      EventBus.emit('adminSettings:imported', { oldSettings, newSettings: validSettings });
      
      this.debug('📥 設定インポート完了');
      return { success: true, imported: Object.keys(validSettings).length };
      
    } catch (error) {
      this.error('設定インポートエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 通知モードの取得・設定
   */
  getNotificationMode() {
    try {
      const mode = localStorage.getItem(this.storageKeys.notificationMode);
      return mode === 'off' ? false : true;
    } catch (error) {
      this.warn('通知モード取得エラー:', error);
      return true; // デフォルトは有効
    }
  }

  setNotificationMode(enabled) {
    try {
      const mode = enabled ? 'on' : 'off';
      localStorage.setItem(this.storageKeys.notificationMode, mode);
      
      EventBus.emit('adminSettings:notificationModeChanged', enabled);
      this.debug(`🔔 通知モード変更: ${mode}`);
      
      return true;
    } catch (error) {
      this.error('通知モード設定エラー:', error);
      return false;
    }
  }

  /**
   * 管理画面タブの取得・設定
   */
  getCurrentTab() {
    try {
      return localStorage.getItem(this.storageKeys.adminTab) || 'dashboard';
    } catch (error) {
      this.warn('現在タブ取得エラー:', error);
      return 'dashboard';
    }
  }

  setCurrentTab(tab) {
    try {
      localStorage.setItem(this.storageKeys.adminTab, tab);
      EventBus.emit('adminSettings:tabChanged', tab);
      return true;
    } catch (error) {
      this.error('タブ設定エラー:', error);
      return false;
    }
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // ストレージ変更の監視
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKeys.adminSettings) {
        this.debug('外部からの設定変更を検出');
        this.loadSettings();
      }
    });
  }

  /**
   * サービス破棄
   */
  destroy() {
    // イベントリスナーのクリーンアップは自動的に行われる
    this.currentSettings = {};
    this.initialized = false;
    
    this.debug('🗑️ 管理画面設定サービス破棄完了');
  }
}

// シングルトンインスタンス
export const adminSettingsService = new AdminSettingsService(); 