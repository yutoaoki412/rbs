/**
 * レッスン状況管理 Supabaseサービス
 * LocalStorageベースのLessonStatusStorageServiceをSupabaseに移行
 * @version 1.0.0
 */

import { SupabaseService } from './SupabaseService.js';
import { EventBus } from './EventBus.js';
import { CONFIG } from '../constants/config.js';

export class LessonStatusSupabaseService extends SupabaseService {
  constructor() {
    super('lesson_status', 'LessonStatusSupabaseService');
    
    // キャッシュ管理
    this.statusCache = new Map();
    this.cacheExpiry = 1 * 60 * 1000; // 1分（リアルタイム性重視）
    this.lastCacheUpdate = null;
    
    // ステータス定義
    this.statusDefinitions = {
      'scheduled': {
        key: 'scheduled',
        displayText: '通常開催',
        adminText: '通常開催',
        color: '#27ae60',
        backgroundColor: 'var(--status-scheduled)',
        icon: 'fas fa-check-circle',
        cssClass: 'scheduled'
      },
      'cancelled': {
        key: 'cancelled',
        displayText: '中止',
        adminText: '中止',
        color: '#e74c3c',
        backgroundColor: 'var(--status-cancelled)',
        icon: 'fas fa-times-circle',
        cssClass: 'cancelled'
      },
      'indoor': {
        key: 'indoor',
        displayText: '室内開催',
        adminText: '室内開催',
        color: '#f39c12',
        backgroundColor: 'var(--status-indoor)',
        icon: 'fas fa-home',
        cssClass: 'indoor'
      },
      'postponed': {
        key: 'postponed',
        displayText: '延期',
        adminText: '延期',
        color: '#3498db',
        backgroundColor: 'var(--status-postponed)',
        icon: 'fas fa-clock',
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
  }

  /**
   * 今日のレッスン状況を取得
   * @param {Object} options - 取得オプション
   * @returns {Promise<Object>} レッスン状況データ
   */
  async getTodayStatus(options = {}) {
    try {
      const today = this.getTodayDate();
      return await this.getStatusByDate(today, options);

    } catch (error) {
      this.error('Error in getTodayStatus:', error);
      return this.createDefaultStatus(this.getTodayDate());
    }
  }

  /**
   * 指定日のレッスン状況を取得
   * @param {string} date - 日付 (YYYY-MM-DD)
   * @param {Object} options - 取得オプション
   * @returns {Promise<Object>} レッスン状況データ
   */
  async getStatusByDate(date, options = {}) {
    try {
      const {
        useCache = true
      } = options;

      const dateKey = this.formatDateKey(date);

      // キャッシュチェック
      if (useCache && this.isCacheValid() && this.statusCache.has(dateKey)) {
        return this.statusCache.get(dateKey);
      }

      const { data, error } = await this.select({
        filters: { date: dateKey },
        limit: 1
      });

      if (error) {
        this.error('Failed to fetch lesson status:', error);
        return this.createDefaultStatus(dateKey);
      }

      let status;
      if (data && data.length > 0) {
        status = this.normalizeStatusData(data[0]);
      } else {
        // データが存在しない場合はデフォルト状況を作成
        status = this.createDefaultStatus(dateKey);
      }

      // キャッシュ更新
      this.updateCache(dateKey, status);

      this.log(`Fetched lesson status for ${dateKey}`);
      return status;

    } catch (error) {
      this.error('Error in getStatusByDate:', error);
      return this.createDefaultStatus(date);
    }
  }

  /**
   * レッスン状況を保存
   * @param {Object} statusData - レッスン状況データ
   * @param {string} date - 日付 (省略時は今日)
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async saveStatus(statusData, date = null) {
    try {
      const targetDate = date || this.getTodayDate();
      const dateKey = this.formatDateKey(targetDate);

      // バリデーション
      const validation = this.validateStatusData(statusData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `バリデーションエラー: ${validation.errors.join(', ')}`
        };
      }

      // データ正規化
      const normalizedData = this.normalizeStatusForSave(statusData, dateKey);

      // 既存データの確認
      const existingStatus = await this.getStatusByDate(dateKey, { useCache: false });
      
      let result;
      if (existingStatus && existingStatus.id) {
        // 更新
        result = await this.update(normalizedData, { date: dateKey });
      } else {
        // 新規作成
        result = await this.insert({ ...normalizedData, date: dateKey });
      }

      const { data, error } = result;

      if (error) {
        return {
          success: false,
          error: `レッスン状況の保存に失敗しました: ${error.message || error}`
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'レッスン状況の保存に失敗しました（データが返されませんでした）'
        };
      }

      const savedStatus = this.normalizeStatusData(data[0]);

      // キャッシュクリア
      this.clearCache();

      // イベント発行
      EventBus.emit('lessonStatus:updated', {
        date: dateKey,
        status: savedStatus,
        timestamp: new Date().toISOString()
      });

      this.log('Lesson status saved successfully:', dateKey);

      return {
        success: true,
        data: savedStatus
      };

    } catch (error) {
      this.error('Error in saveStatus:', error);
      return {
        success: false,
        error: `レッスン状況の保存中にエラーが発生しました: ${error.message}`
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

      const { data, error } = await this.delete({ date: dateKey });

      if (error) {
        return {
          success: false,
          error: `レッスン状況の削除に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発行
      EventBus.emit('lessonStatus:deleted', {
        date: dateKey,
        timestamp: new Date().toISOString()
      });

      this.log('Lesson status deleted successfully:', dateKey);

      return { success: true };

    } catch (error) {
      this.error('Error in deleteStatus:', error);
      return {
        success: false,
        error: `レッスン状況の削除中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 最近のレッスン状況を取得
   * @param {number} days - 取得日数
   * @returns {Promise<Array>} レッスン状況配列
   */
  async getRecentStatuses(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await this.select({
        filters: {
          date: {
            operator: 'gte',
            value: startDate.toISOString().split('T')[0]
          }
        },
        orderBy: { column: 'date', ascending: false }
      });

      if (error) {
        this.error('Failed to fetch recent lesson statuses:', error);
        return [];
      }

      return data.map(status => this.normalizeStatusData(status));

    } catch (error) {
      this.error('Error in getRecentStatuses:', error);
      return [];
    }
  }

  /**
   * レッスン状況統計を取得
   * @param {number} days - 集計期間（日数）
   * @returns {Promise<Object>} 統計情報
   */
  async getStatusStats(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await this.select({
        filters: {
          date: {
            operator: 'gte',
            value: startDate.toISOString().split('T')[0]
          }
        }
      });

      if (error) {
        this.error('Failed to fetch lesson status stats:', error);
        return {
          total: 0,
          basic: {},
          advance: {},
          period: days,
          timestamp: new Date().toISOString()
        };
      }

      // 統計計算
      const basicStats = {};
      const advanceStats = {};
      
      Object.keys(this.statusDefinitions).forEach(status => {
        basicStats[status] = data.filter(d => d.basic_status === status).length;
        advanceStats[status] = data.filter(d => d.advance_status === status).length;
      });

      return {
        total: data.length,
        basic: basicStats,
        advance: advanceStats,
        period: days,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.error('Error in getStatusStats:', error);
      return {
        total: 0,
        basic: {},
        advance: {},
        period: days,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * レッスン状況データを正規化（保存用）
   * @param {Object} data - 生データ
   * @param {string} date - 日付
   * @returns {Object} 正規化されたデータ
   */
  normalizeStatusForSave(data, date) {
    return {
      basic_status: data.basic?.status || data.basicStatus || 'scheduled',
      basic_message: data.basic?.message || data.basicMessage || '',
      advance_status: data.advance?.status || data.advanceStatus || 'scheduled',
      advance_message: data.advance?.message || data.advanceMessage || '',
      global_message: data.globalMessage || data.global_message || ''
    };
  }

  /**
   * レッスン状況データを正規化（表示用）
   * @param {Object} data - DBからのデータ
   * @returns {Object} 正規化されたデータ
   */
  normalizeStatusData(data) {
    return {
      id: data.id,
      date: data.date,
      basic: {
        status: data.basic_status,
        message: data.basic_message || '',
        ...this.getStatusDefinition(data.basic_status)
      },
      advance: {
        status: data.advance_status,
        message: data.advance_message || '',
        ...this.getStatusDefinition(data.advance_status)
      },
      globalMessage: data.global_message || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * デフォルトのレッスン状況を作成
   * @param {string} date - 日付
   * @returns {Object} デフォルト状況
   */
  createDefaultStatus(date) {
    return {
      id: null,
      date: this.formatDateKey(date),
      basic: {
        status: 'scheduled',
        message: '',
        ...this.getStatusDefinition('scheduled')
      },
      advance: {
        status: 'scheduled',
        message: '',
        ...this.getStatusDefinition('scheduled')
      },
      globalMessage: '',
      createdAt: null,
      updatedAt: null
    };
  }

  /**
   * レッスン状況データのバリデーション
   * @param {Object} data - バリデーション対象データ
   * @returns {Object} バリデーション結果
   */
  validateStatusData(data) {
    const errors = [];

    const basicStatus = data.basic?.status || data.basicStatus;
    const advanceStatus = data.advance?.status || data.advanceStatus;

    if (basicStatus && !Object.keys(this.statusDefinitions).includes(basicStatus)) {
      errors.push('ベーシックコースの無効なステータスです');
    }

    if (advanceStatus && !Object.keys(this.statusDefinitions).includes(advanceStatus)) {
      errors.push('アドバンスコースの無効なステータスです');
    }

    const basicMessage = data.basic?.message || data.basicMessage || '';
    const advanceMessage = data.advance?.message || data.advanceMessage || '';
    const globalMessage = data.globalMessage || data.global_message || '';

    if (basicMessage.length > 500) {
      errors.push('ベーシックコースのメッセージは500文字以内で入力してください');
    }

    if (advanceMessage.length > 500) {
      errors.push('アドバンスコースのメッセージは500文字以内で入力してください');
    }

    if (globalMessage.length > 1000) {
      errors.push('全体メッセージは1000文字以内で入力してください');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ステータス定義を取得
   * @param {string} statusKey - ステータスキー
   * @returns {Object} ステータス定義
   */
  getStatusDefinition(statusKey = null) {
    if (statusKey && this.statusDefinitions[statusKey]) {
      return this.statusDefinitions[statusKey];
    }
    return this.statusDefinitions.scheduled;
  }

  /**
   * 全ステータス定義を取得
   * @returns {Object} ステータス定義一覧
   */
  getAllStatusDefinitions() {
    return this.statusDefinitions;
  }

  /**
   * デフォルトコース設定を取得
   * @returns {Object} コース設定
   */
  getDefaultCourses() {
    return this.defaultCourses;
  }

  /**
   * 今日の日付を取得
   * @returns {string} 今日の日付 (YYYY-MM-DD)
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 日付キーをフォーマット
   * @param {string} date - 日付
   * @returns {string} フォーマットされた日付
   */
  formatDateKey(date) {
    if (!date) return this.getTodayDate();
    
    // 既にYYYY-MM-DD形式の場合はそのまま
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Date オブジェクトから変換
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch (error) {
      this.error('Invalid date format:', date);
      return this.getTodayDate();
    }
  }

  /**
   * キャッシュの有効性チェック
   * @returns {boolean} キャッシュが有効かどうか
   */
  isCacheValid() {
    return this.lastCacheUpdate && 
           (Date.now() - this.lastCacheUpdate) < this.cacheExpiry;
  }

  /**
   * キャッシュを更新
   * @param {string} dateKey - 日付キー
   * @param {Object} status - ステータスデータ
   */
  updateCache(dateKey, status) {
    this.statusCache.set(dateKey, status);
    this.lastCacheUpdate = Date.now();
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.statusCache.clear();
    this.lastCacheUpdate = null;
    this.log('Lesson status cache cleared');
  }

  /**
   * サービス破棄時の処理
   */
  destroy() {
    this.clearCache();
    super.destroy();
  }
}

// シングルトンインスタンス
let lessonStatusSupabaseServiceInstance = null;

/**
 * LessonStatusSupabaseServiceのシングルトンインスタンスを取得
 * @returns {LessonStatusSupabaseService}
 */
export function getLessonStatusSupabaseService() {
  if (!lessonStatusSupabaseServiceInstance) {
    lessonStatusSupabaseServiceInstance = new LessonStatusSupabaseService();
  }
  return lessonStatusSupabaseServiceInstance;
} 