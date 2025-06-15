/**
 * 管理画面設定サービス（統合版）
 * メモリベース＋Supabaseハイブリッド - LocalStorage依存を完全削除
 * @version 3.0.0 - AdminSettingsSupabaseService統合版
 */

import { BaseService } from '../../../lib/base/BaseService.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { getSupabaseClient } from '../../../lib/supabase.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class AdminSettingsService extends BaseService {
  constructor() {
    super('AdminSettingsService');
    
    // Supabase統合
    this.supabase = null;
    this.settingsCache = new Map();
    this.currentUserId = null;
    this.fallbackMode = false;
    
    // 現在のセッション設定（メモリのみ）
    this.sessionSettings = {
      // UI状態
      currentTab: 'dashboard',
      currentNewsTab: 'editor',
      currentInstagramTab: 'posts',
      currentSettingsTab: 'basic',
      
      // 表示設定
      notificationsEnabled: true,
      compactMode: false,
      
      // システム設定
      version: CONFIG.app.version,
      initialized: false
    };
    
    // タブ定義
    this.availableTabs = ['dashboard', 'news-management', 'lesson-status', 'instagram-management', 'settings'];
    this.availableNewsTabs = ['editor', 'list'];
    this.availableInstagramTabs = ['posts', 'settings'];
    this.availableSettingsTabs = ['basic', 'data'];
  }

  /**
   * 初期化（Supabase統合版）
   */
  async init() {
    if (this.initialized) {
      this.debug('既に初期化済み');
      return;
    }

    this.debug('🔧 管理画面設定サービス初期化開始（統合版）');
    
    try {
      // Supabaseクライアント取得を試行
      try {
        this.supabase = getSupabaseClient();
        await this.getCurrentUserId();
        this.debug('Supabase接続成功');
      } catch (supabaseError) {
        this.debug('Supabase接続失敗、フォールバックモードに切り替え:', supabaseError.message);
        this.fallbackMode = true;
        this.currentUserId = 'local_user';
      }
      
      // セッション設定の初期化
      this.sessionSettings.initialized = true;
      
      this.initialized = true;
      const mode = this.fallbackMode ? 'フォールバックモード（メモリ）' : 'Supabaseモード';
      this.debug(`✅ 管理画面設定サービス初期化完了（${mode}）`);
      
      // 初期化完了イベント
      EventBus.emit('adminSettings:initialized', this.sessionSettings);
      
    } catch (error) {
      this.error('❌ 初期化エラー:', error);
      this.fallbackMode = true;
      this.currentUserId = 'fallback_user';
      this.initialized = true; // エラーでも継続
    }
  }

  /**
   * 現在のユーザーIDを取得（開発モード対応）
   */
  async getCurrentUserId() {
    try {
      this.currentUserId = 'dev_user';
      this.debug('開発モードでユーザーID設定:', this.currentUserId);
      return this.currentUserId;
    } catch (error) {
      this.debug('開発モードでユーザーID設定:', error.message);
      this.currentUserId = 'dev_user';
      return this.currentUserId;
    }
  }

  /**
   * 設定を保存（Supabase統合版）
   * @param {string} key - 設定キー
   * @param {any} value - 設定値
   */
  async saveSetting(key, value) {
    try {
      this.debug('設定保存:', { key, value, mode: this.fallbackMode ? 'fallback' : 'supabase' });
      
      // フォールバックモードの場合はメモリとキャッシュのみ
      if (this.fallbackMode) {
        return await this.saveSettingToMemory(key, value);
      }
      
      // Supabaseに保存を試行
      try {
        const settingData = {
          key: key,
          value: value,
          description: `管理画面設定: ${key}`
        };
        
        const { data, error } = await this.supabase
          .from('admin_settings')
          .upsert(settingData, {
            onConflict: 'key'
          })
          .select()
          .single();
        
        if (!error) {
          // Supabase保存成功
          this.settingsCache.set(key, value);
          EventBus.emit('adminSettings:saved', { key, value, data, source: 'supabase' });
          this.debug('Supabase設定保存完了:', data);
          return data;
        }
        
        // エラーの場合、フォールバックモードに切り替え
        this.debug('Supabaseエラー、フォールバックモードに切り替え');
        this.fallbackMode = true;
        return await this.saveSettingToMemory(key, value);
        
      } catch (supabaseError) {
        this.debug('Supabaseエラー、フォールバックモードに切り替え:', supabaseError.message);
        this.fallbackMode = true;
        return await this.saveSettingToMemory(key, value);
      }
      
    } catch (error) {
      this.debug('設定保存エラー、メモリにフォールバック:', error.message);
      this.fallbackMode = true;
      return await this.saveSettingToMemory(key, value);
    }
  }

  /**
   * メモリに設定を保存（フォールバック）
   */
  async saveSettingToMemory(key, value) {
    try {
      // キャッシュに保存
      this.settingsCache.set(key, value);
      
      // イベントを発火
      EventBus.emit('adminSettings:saved', { 
        key, 
        value, 
        data: { key, value }, 
        source: 'memory' 
      });
      
      this.debug('メモリ設定保存完了:', { key, value });
      return { key, value, source: 'memory' };
      
    } catch (error) {
      this.error('メモリ保存エラー:', error);
      return { key, value, source: 'error' };
    }
  }

  /**
   * 設定を取得（Supabase統合版）
   * @param {string} key - 設定キー
   * @param {any} defaultValue - デフォルト値
   */
  async getSetting(key, defaultValue = null) {
    try {
      // キャッシュから取得を試行
      if (this.settingsCache.has(key)) {
        const cachedValue = this.settingsCache.get(key);
        this.debug('キャッシュから設定取得:', { key, value: cachedValue });
        return cachedValue;
      }
      
      // フォールバックモードの場合はデフォルト値
      if (this.fallbackMode) {
        this.debug('フォールバックモード、デフォルト値を使用:', { key, defaultValue });
        this.settingsCache.set(key, defaultValue);
        return defaultValue;
      }
      
      // Supabaseから取得を試行
      try {
        const { data, error } = await this.supabase
          .from('admin_settings')
          .select('value')
          .eq('key', key)
          .single();
        
        if (!error && data) {
          const value = data.value;
          this.settingsCache.set(key, value);
          this.debug('Supabase設定取得完了:', { key, value });
          return value;
        }
        
        // エラーの場合、フォールバックモードに切り替え
        this.debug('Supabaseエラー、フォールバックモードに切り替え');
        this.fallbackMode = true;
        this.settingsCache.set(key, defaultValue);
        return defaultValue;
        
      } catch (supabaseError) {
        this.debug('Supabaseエラー、フォールバックモードに切り替え:', supabaseError.message);
        this.fallbackMode = true;
        this.settingsCache.set(key, defaultValue);
        return defaultValue;
      }
      
    } catch (error) {
      this.debug('設定取得エラー、デフォルト値を使用:', error.message);
      this.fallbackMode = true;
      this.settingsCache.set(key, defaultValue);
      return defaultValue;
    }
  }

  /**
   * 現在のタブを取得
   * @returns {string} 現在のタブ名
   */
  getCurrentTab() {
    return this.sessionSettings.currentTab;
  }

  /**
   * タブを設定
   * @param {string} tab - タブ名
   */
  setCurrentTab(tab) {
    if (!this.availableTabs.includes(tab)) {
      this.warn(`無効なタブ: ${tab}`);
      return;
    }
    
    const oldTab = this.sessionSettings.currentTab;
    this.sessionSettings.currentTab = tab;
    
    this.debug(`タブ変更: ${oldTab} → ${tab}`);
    EventBus.emit('adminSettings:tabChanged', { oldTab, newTab: tab });
  }

  /**
   * ニュースタブを取得
   * @returns {string} 現在のニュースタブ名
   */
  getCurrentNewsTab() {
    return this.sessionSettings.currentNewsTab;
  }

  /**
   * ニュースタブを設定
   * @param {string} tab - ニュースタブ名
   */
  setCurrentNewsTab(tab) {
    if (!this.availableNewsTabs.includes(tab)) {
      this.warn(`無効なニュースタブ: ${tab}`);
      return;
    }
    
    this.sessionSettings.currentNewsTab = tab;
    this.debug(`ニュースタブ変更: ${tab}`);
  }

  /**
   * Instagramタブを取得
   * @returns {string} 現在のInstagramタブ名
   */
  getCurrentInstagramTab() {
    return this.sessionSettings.currentInstagramTab;
  }

  /**
   * Instagramタブを設定
   * @param {string} tab - Instagramタブ名
   */
  setCurrentInstagramTab(tab) {
    if (!this.availableInstagramTabs.includes(tab)) {
      this.warn(`無効なInstagramタブ: ${tab}`);
      return;
    }
    
    this.sessionSettings.currentInstagramTab = tab;
    this.debug(`Instagramタブ変更: ${tab}`);
  }

  /**
   * 設定タブを取得
   * @returns {string} 現在の設定タブ名
   */
  getCurrentSettingsTab() {
    return this.sessionSettings.currentSettingsTab;
  }

  /**
   * 設定タブを設定
   * @param {string} tab - 設定タブ名
   */
  setCurrentSettingsTab(tab) {
    if (!this.availableSettingsTabs.includes(tab)) {
      this.warn(`無効な設定タブ: ${tab}`);
      return;
    }
    
    this.sessionSettings.currentSettingsTab = tab;
    this.debug(`設定タブ変更: ${tab}`);
  }

  /**
   * 通知設定を取得
   * @returns {boolean} 通知有効フラグ
   */
  getNotificationMode() {
    return this.sessionSettings.notificationsEnabled;
  }

  /**
   * 通知設定を変更
   * @param {boolean} enabled - 通知有効フラグ
   */
  setNotificationMode(enabled) {
    this.sessionSettings.notificationsEnabled = Boolean(enabled);
    this.debug(`通知設定変更: ${enabled}`);
    EventBus.emit('adminSettings:notificationChanged', enabled);
  }

  /**
   * コンパクトモードの取得
   * @returns {boolean} コンパクトモード
   */
  getCompactMode() {
    return this.sessionSettings.compactMode;
  }

  /**
   * コンパクトモードの設定
   * @param {boolean} enabled - コンパクトモード
   */
  setCompactMode(enabled) {
    this.sessionSettings.compactMode = Boolean(enabled);
    this.debug(`コンパクトモード変更: ${enabled}`);
    EventBus.emit('adminSettings:compactModeChanged', enabled);
  }

  /**
   * 全設定の取得
   * @returns {Object} 現在の設定
   */
  getAllSettings() {
    return { ...this.sessionSettings };
  }

  /**
   * 設定のリセット
   */
  resetSettings() {
    this.debug('設定をリセット');
    
    this.sessionSettings = {
      currentTab: 'dashboard',
      currentNewsTab: 'editor',
      currentInstagramTab: 'posts',
      currentSettingsTab: 'basic',
      notificationsEnabled: true,
      compactMode: false,
      version: CONFIG.app.version,
      initialized: true
    };
    
    EventBus.emit('adminSettings:reset', this.sessionSettings);
  }

  /**
   * 設定情報のエクスポート（デバッグ用）
   * @returns {Object} エクスポートデータ
   */
  exportForDebug() {
    return {
      serviceName: this.serviceName,
      version: CONFIG.app.version,
      initialized: this.initialized,
      sessionSettings: { ...this.sessionSettings },
      availableTabs: [...this.availableTabs],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * サービス状態の確認
   * @returns {Object} サービス状態
   */
  getServiceStatus() {
    return {
      initialized: this.initialized,
      currentTab: this.sessionSettings.currentTab,
      settingsCount: Object.keys(this.sessionSettings).length,
      version: CONFIG.app.version
    };
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.debug('管理画面設定サービスを破棄（Supabase版）');
    
    // イベントリスナーのクリーンアップ
    EventBus.off('adminSettings:initialized');
    EventBus.off('adminSettings:tabChanged');
    EventBus.off('adminSettings:notificationChanged');
    EventBus.off('adminSettings:compactModeChanged');
    EventBus.off('adminSettings:reset');
    
    // 設定をリセット
    this.sessionSettings = {};
    this.initialized = false;
  }
}

// シングルトンインスタンス
let adminSettingsServiceInstance = null;

/**
 * AdminSettingsServiceのシングルトンインスタンスを取得
 * @returns {AdminSettingsService}
 */
export function getAdminSettingsService() {
  if (!adminSettingsServiceInstance) {
    adminSettingsServiceInstance = new AdminSettingsService();
  }
  return adminSettingsServiceInstance;
}

// デフォルトエクスポート（後方互換性）
export const adminSettingsService = getAdminSettingsService(); 