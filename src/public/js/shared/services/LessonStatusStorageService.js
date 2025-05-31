/**
 * 統合レッスン状況ストレージサービス
 * LP側と管理画面でレッスン状況データを統一管理
 * @version 1.0.0
 */

import { EventBus } from './EventBus.js';
import { CONFIG } from '../constants/config.js';

export class LessonStatusStorageService {
  constructor() {
    this.componentName = 'LessonStatusStorageService';
    this.initialized = false;
    
    // ストレージ設定
    this.storageKey = CONFIG.storage.keys.lessonStatus || 'rbs_lesson_status';
    this.fallbackStorageKey = 'rbs_lesson_status';
    
    // データ構造
    this.statusData = new Map();
    
    // ステータス定義
    this.statusDefinitions = {
      'scheduled': {
        key: 'scheduled',
        displayText: '通常開催',
        adminText: '通常開催',
        color: '#27ae60',
        backgroundColor: 'var(--status-scheduled)',
        icon: '✅',
        cssClass: 'scheduled'
      },
      'cancelled': {
        key: 'cancelled',
        displayText: '中止',
        adminText: '中止',
        color: '#e74c3c',
        backgroundColor: 'var(--status-cancelled)',
        icon: '❌',
        cssClass: 'cancelled'
      },
      'indoor': {
        key: 'indoor',
        displayText: '室内開催',
        adminText: '室内開催',
        color: '#f39c12',
        backgroundColor: 'var(--status-indoor)',
        icon: '🏠',
        cssClass: 'indoor'
      },
      'postponed': {
        key: 'postponed',
        displayText: '延期',
        adminText: '延期',
        color: '#3498db',
        backgroundColor: 'var(--status-postponed)',
        icon: '⏰',
        cssClass: 'postponed'
      }
    };
    
    // デフォルトコース設定
    this.defaultCourses = {
      basic: {
        name: 'ベーシックコース（年長〜小3）',
        time: '17:00-17:50',
        status: 'scheduled',
        message: ''
      },
      advance: {
        name: 'アドバンスコース（小4〜小6）',
        time: '18:00-18:50',
        status: 'scheduled',
        message: ''
      }
    };
    
    // 自動保存とタブ同期
    this.autoSaveEnabled = true;
    this.tabSyncEnabled = true;
    this.lastModified = null;
    
    // パフォーマンス監視
    this.performanceMetrics = {
      loadTime: 0,
      saveTime: 0,
      operationCount: 0
    };
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      this.debug('既に初期化済みです');
      return;
    }

    try {
      this.log('初期化開始');
      
      // データ読み込み
      await this.loadFromStorage();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // タブ間同期設定
      if (this.tabSyncEnabled) {
        this.setupTabSync();
      }
      
      this.initialized = true;
      this.log('初期化完了');
      
      // 初期化イベント発行
      EventBus.emit('lessonStatusStorage:initialized', {
        statusCount: this.statusData.size,
        storageKey: this.storageKey
      });
      
    } catch (error) {
      this.error('初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 今日のレッスン状況を取得
   * @returns {Object} レッスン状況データ
   */
  getTodayStatus() {
    const today = this.getTodayDate();
    return this.getStatusByDate(today);
  }

  /**
   * 指定日のレッスン状況を取得
   * @param {string} date - 日付 (YYYY-MM-DD)
   * @returns {Object} レッスン状況データ
   */
  getStatusByDate(date) {
    try {
      const dateKey = this.formatDateKey(date);
      const status = this.statusData.get(dateKey);
      
      if (status) {
        this.debug(`レッスン状況取得: ${dateKey}`, status);
        return status;
      }
      
      // デフォルト状況を作成
      const defaultStatus = this.createDefaultStatus(dateKey);
      this.debug(`デフォルトレッスン状況作成: ${dateKey}`);
      return defaultStatus;
      
    } catch (error) {
      this.warn('レッスン状況取得エラー:', error);
      return this.createDefaultStatus(date);
    }
  }

  /**
   * レッスン状況を保存
   * @param {Object} statusData - レッスン状況データ
   * @param {string} [date] - 日付 (省略時は今日)
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async saveStatus(statusData, date = null) {
    try {
      const targetDate = date || this.getTodayDate();
      const dateKey = this.formatDateKey(targetDate);
      
      this.log(`レッスン状況保存開始: ${dateKey}`);
      
      // データ正規化
      const normalizedData = this.normalizeStatusData(statusData, dateKey);
      
      // バリデーション
      const validation = this.validateStatusData(normalizedData);
      if (!validation.isValid) {
        throw new Error(`バリデーションエラー: ${validation.errors.join(', ')}`);
      }
      
      // メモリに保存
      this.statusData.set(dateKey, normalizedData);
      this.lastModified = new Date().toISOString();
      
      // ストレージに保存
      if (this.autoSaveEnabled) {
        await this.saveToStorage();
      }
      
      // イベント発行
      EventBus.emit('lessonStatus:updated', {
        date: dateKey,
        status: normalizedData,
        source: 'local'
      });
      
      this.log(`レッスン状況保存完了: ${dateKey}`);
      
      return {
        success: true,
        data: normalizedData
      };
      
    } catch (error) {
      this.error('レッスン状況保存エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * レッスン状況を削除
   * @param {string} date - 日付 (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteStatus(date) {
    try {
      const dateKey = this.formatDateKey(date);
      
      if (!this.statusData.has(dateKey)) {
        return {
          success: false,
          error: '指定された日付のレッスン状況が見つかりません'
        };
      }
      
      const deletedStatus = this.statusData.get(dateKey);
      this.statusData.delete(dateKey);
      this.lastModified = new Date().toISOString();
      
      // ストレージに保存
      if (this.autoSaveEnabled) {
        await this.saveToStorage();
      }
      
      // イベント発行
      EventBus.emit('lessonStatus:deleted', {
        date: dateKey,
        status: deletedStatus
      });
      
      this.log(`レッスン状況削除完了: ${dateKey}`);
      
      return { success: true };
      
    } catch (error) {
      this.error('レッスン状況削除エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 複数日のレッスン状況を取得
   * @param {number} [days=7] - 取得する日数
   * @returns {Array} レッスン状況配列
   */
  getRecentStatuses(days = 7) {
    try {
      const statuses = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateKey = this.formatDateKey(date.toISOString().split('T')[0]);
        
        const status = this.getStatusByDate(dateKey);
        statuses.push({
          date: dateKey,
          ...status
        });
      }
      
      return statuses;
      
    } catch (error) {
      this.warn('複数レッスン状況取得エラー:', error);
      return [];
    }
  }

  /**
   * ステータス定義を取得
   * @param {string} [statusKey] - 特定のステータスキー
   * @returns {Object} ステータス定義
   */
  getStatusDefinition(statusKey = null) {
    if (statusKey) {
      return this.statusDefinitions[statusKey] || null;
    }
    return this.statusDefinitions;
  }

  /**
   * データ正規化
   * @private
   * @param {Object} data - 生データ
   * @param {string} date - 日付キー
   * @returns {Object} 正規化されたデータ
   */
  normalizeStatusData(data, date) {
    const normalized = {
      date: date,
      globalStatus: data.globalStatus || 'scheduled',
      globalMessage: data.globalMessage || '',
      courses: {},
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
    
    // コースデータの正規化
    Object.keys(this.defaultCourses).forEach(courseKey => {
      const courseData = data.courses?.[courseKey] || {};
      normalized.courses[courseKey] = {
        name: this.defaultCourses[courseKey].name,
        time: this.defaultCourses[courseKey].time,
        status: courseData.status || data.globalStatus || 'scheduled',
        message: courseData.message || ''
      };
    });
    
    return normalized;
  }

  /**
   * デフォルトステータスを作成
   * @private
   * @param {string} date - 日付キー
   * @returns {Object} デフォルトステータス
   */
  createDefaultStatus(date) {
    return {
      date: date,
      globalStatus: 'scheduled',
      globalMessage: '',
      courses: { ...this.defaultCourses },
      lastUpdated: null,
      version: '1.0.0'
    };
  }

  /**
   * データバリデーション
   * @private
   * @param {Object} data - 検証するデータ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validateStatusData(data) {
    const errors = [];
    
    if (!data.date) {
      errors.push('日付は必須です');
    }
    
    if (!data.globalStatus || !this.statusDefinitions[data.globalStatus]) {
      errors.push('有効なグローバルステータスが必要です');
    }
    
    if (data.globalMessage && data.globalMessage.length > 500) {
      errors.push('グローバルメッセージは500文字以内で入力してください');
    }
    
    // コースデータの検証
    Object.keys(this.defaultCourses).forEach(courseKey => {
      const course = data.courses?.[courseKey];
      if (course) {
        if (!this.statusDefinitions[course.status]) {
          errors.push(`${courseKey}コースの状況が無効です`);
        }
        if (course.message && course.message.length > 200) {
          errors.push(`${courseKey}コースのメッセージは200文字以内で入力してください`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ストレージからデータを読み込み
   * @private
   */
  async loadFromStorage() {
    try {
      const startTime = performance.now();
      
      // メインストレージキーから読み込み
      let data = localStorage.getItem(this.storageKey);
      
      // フォールバック読み込み
      if (!data && this.storageKey !== this.fallbackStorageKey) {
        data = localStorage.getItem(this.fallbackStorageKey);
        if (data) {
          this.warn('フォールバックストレージからデータを読み込みました');
        }
      }
      
      if (data) {
        const parsedData = JSON.parse(data);
        
        // マイグレーション処理
        const migratedData = await this.migrateData(parsedData);
        
        // Mapに変換
        this.statusData.clear();
        Object.entries(migratedData).forEach(([date, status]) => {
          this.statusData.set(date, status);
        });
        
        this.performanceMetrics.loadTime = performance.now() - startTime;
        this.log(`データ読み込み完了: ${this.statusData.size}件 (${this.performanceMetrics.loadTime.toFixed(2)}ms)`);
      } else {
        this.debug('ストレージにデータが見つかりません');
      }
      
    } catch (error) {
      this.error('ストレージからの読み込みエラー:', error);
      this.statusData.clear();
    }
  }

  /**
   * ストレージにデータを保存
   * @private
   */
  async saveToStorage() {
    try {
      const startTime = performance.now();
      
      // Mapをオブジェクトに変換
      const dataToSave = {};
      this.statusData.forEach((status, date) => {
        dataToSave[date] = status;
      });
      
      // メタデータ追加
      const saveData = {
        ...dataToSave,
        _metadata: {
          lastModified: this.lastModified,
          version: '1.0.0',
          count: this.statusData.size
        }
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(saveData));
      
      this.performanceMetrics.saveTime = performance.now() - startTime;
      this.performanceMetrics.operationCount++;
      
      this.debug(`データ保存完了: ${this.statusData.size}件 (${this.performanceMetrics.saveTime.toFixed(2)}ms)`);
      
    } catch (error) {
      this.error('ストレージへの保存エラー:', error);
      throw error;
    }
  }

  /**
   * データマイグレーション
   * @private
   * @param {Object} data - 旧データ
   * @returns {Object} 新データ
   */
  async migrateData(data) {
    try {
      // メタデータを除去
      const { _metadata, ...statusData } = data;
      
      const migratedData = {};
      
      Object.entries(statusData).forEach(([date, status]) => {
        if (status && typeof status === 'object') {
          migratedData[date] = this.normalizeStatusData(status, date);
        }
      });
      
      if (Object.keys(migratedData).length > 0) {
        this.debug(`データマイグレーション完了: ${Object.keys(migratedData).length}件`);
      }
      
      return migratedData;
      
    } catch (error) {
      this.warn('データマイグレーションエラー:', error);
      return {};
    }
  }

  /**
   * イベントリスナー設定
   * @private
   */
  setupEventListeners() {
    // ページ終了時の自動保存
    window.addEventListener('beforeunload', () => {
      if (this.autoSaveEnabled && this.statusData.size > 0) {
        this.saveToStorage().catch(error => {
          this.error('終了時保存エラー:', error);
        });
      }
    });
    
    // 定期的なデータクリーンアップ
    setInterval(() => {
      this.cleanupOldData();
    }, 30 * 60 * 1000); // 30分間隔
  }

  /**
   * タブ間同期設定
   * @private
   */
  setupTabSync() {
    // StorageEventでタブ間同期
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey && event.newValue) {
        try {
          const newData = JSON.parse(event.newValue);
          const { _metadata, ...statusData } = newData;
          
          // データを更新
          this.statusData.clear();
          Object.entries(statusData).forEach(([date, status]) => {
            this.statusData.set(date, status);
          });
          
          this.lastModified = _metadata?.lastModified || new Date().toISOString();
          
          // 同期イベント発行
          EventBus.emit('lessonStatus:synced', {
            source: 'external',
            count: this.statusData.size
          });
          
          this.debug('タブ間同期完了');
          
        } catch (error) {
          this.warn('タブ間同期エラー:', error);
        }
      }
    });
  }

  /**
   * 古いデータのクリーンアップ
   * @private
   */
  cleanupOldData() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30日前
      const cutoffKey = this.formatDateKey(cutoffDate.toISOString().split('T')[0]);
      
      const keysToDelete = [];
      this.statusData.forEach((status, date) => {
        if (date < cutoffKey) {
          keysToDelete.push(date);
        }
      });
      
      keysToDelete.forEach(key => {
        this.statusData.delete(key);
      });
      
      if (keysToDelete.length > 0) {
        this.log(`古いデータをクリーンアップ: ${keysToDelete.length}件`);
        if (this.autoSaveEnabled) {
          this.saveToStorage().catch(error => {
            this.error('クリーンアップ保存エラー:', error);
          });
        }
      }
      
    } catch (error) {
      this.warn('データクリーンアップエラー:', error);
    }
  }

  /**
   * 今日の日付を取得
   * @private
   * @returns {string} YYYY-MM-DD形式の日付
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 日付キーをフォーマット
   * @private
   * @param {string} date - 日付文字列
   * @returns {string} フォーマットされた日付キー
   */
  formatDateKey(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  /**
   * 現在のレッスン状況を取得
   * @param {string} [date] - 日付 (省略時は今日)
   * @returns {Promise<Object>} レッスン状況データ
   */
  async getCurrentStatus(date = null) {
    try {
      const targetDate = date || this.getTodayDate();
      const dateKey = this.formatDateKey(targetDate);
      
      const status = this.getStatusByDate(dateKey);
      
      this.debug(`現在のレッスン状況取得: ${dateKey}`, status);
      
      return {
        success: true,
        date: dateKey,
        ...status
      };
      
    } catch (error) {
      this.error('現在のレッスン状況取得エラー:', error);
      return {
        success: false,
        error: error.message,
        date: date || this.getTodayDate(),
        // デフォルト値
        globalStatus: 'scheduled',
        globalMessage: '',
        basicLesson: '通常開催',
        advanceLesson: '通常開催'
      };
    }
  }

  /**
   * レッスン状況を更新
   * @param {Object} statusData - 更新するレッスン状況データ
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async updateStatus(statusData) {
    try {
      this.log('レッスン状況更新開始:', statusData);
      
      // バリデーション
      if (!statusData.date) {
        statusData.date = this.getTodayDate();
      }
      
      const dateKey = this.formatDateKey(statusData.date);
      
      // 正規化されたデータを作成
      const normalizedData = this.normalizeStatusData(statusData, dateKey);
      
      // 保存（引数順序を修正）
      const result = await this.saveStatus(normalizedData, dateKey);
      
      if (result.success) {
        EventBus.emit('lessonStatus:updated', {
          date: dateKey,
          status: normalizedData
        });
        
        return {
          success: true,
          message: 'レッスン状況を更新しました'
        };
      } else {
        return {
          success: false,
          error: result.error || '更新に失敗しました'
        };
      }
      
    } catch (error) {
      this.error('レッスン状況更新エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 全データクリア
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async clearAllData() {
    try {
      this.log('全レッスン状況データクリア開始');
      
      // メモリからデータクリア
      this.statusData.clear();
      
      // ストレージからデータクリア
      localStorage.removeItem(this.storageKey);
      if (this.storageKey !== this.fallbackStorageKey) {
        localStorage.removeItem(this.fallbackStorageKey);
      }
      
      this.lastModified = new Date().toISOString();
      
      EventBus.emit('lessonStatus:allCleared');
      
      this.log('全レッスン状況データクリア完了');
      
      return {
        success: true,
        message: '全てのレッスン状況データを削除しました'
      };
      
    } catch (error) {
      this.error('全データクリアエラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * エクスポート用データ取得
   * @returns {Object} エクスポートデータ
   */
  getExportData() {
    try {
      const exportData = {};
      this.statusData.forEach((status, date) => {
        exportData[date] = status;
      });
      
      return {
        lessonStatuses: exportData,
        metadata: {
          exportedAt: new Date().toISOString(),
          count: this.statusData.size,
          version: '1.0.0'
        }
      };
      
    } catch (error) {
      this.error('エクスポートデータ取得エラー:', error);
      return {
        lessonStatuses: {},
        metadata: {
          exportedAt: new Date().toISOString(),
          count: 0,
          version: '1.0.0',
          error: error.message
        }
      };
    }
  }

  /**
   * サービス状態の取得
   * @returns {Object} 状態情報
   */
  getStatus() {
    return {
      initialized: this.initialized,
      statusCount: this.statusData.size,
      storageKey: this.storageKey,
      lastModified: this.lastModified,
      performance: this.performanceMetrics,
      autoSaveEnabled: this.autoSaveEnabled,
      tabSyncEnabled: this.tabSyncEnabled
    };
  }

  /**
   * サービス破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      // 最終保存
      if (this.autoSaveEnabled && this.statusData.size > 0) {
        await this.saveToStorage();
      }
      
      // データクリア
      this.statusData.clear();
      this.initialized = false;
      
      this.log('サービス破棄完了');
      
    } catch (error) {
      this.error('サービス破棄エラー:', error);
    }
  }

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log(`🏃 ${this.componentName}:`, ...args);
  }

  debug(...args) {
    if (CONFIG.debug.enabled) {
      console.debug(`🔍 ${this.componentName}:`, ...args);
    }
  }

  warn(...args) {
    console.warn(`⚠️ ${this.componentName}:`, ...args);
  }

  error(...args) {
    console.error(`❌ ${this.componentName}:`, ...args);
  }
}

// シングルトンインスタンス
let lessonStatusStorageInstance = null;

/**
 * LessonStatusStorageServiceのシングルトンインスタンスを取得
 * @returns {LessonStatusStorageService}
 */
export function getLessonStatusStorageService() {
  if (!lessonStatusStorageInstance) {
    lessonStatusStorageInstance = new LessonStatusStorageService();
  }
  return lessonStatusStorageInstance;
}

export default LessonStatusStorageService; 