/**
 * 管理画面 レッスン状況管理 Supabaseサービス
 * schema.sql完全準拠版
 * @version 1.0.0
 */

import { SupabaseService } from '../../../shared/services/SupabaseService.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class AdminLessonSupabaseService extends SupabaseService {
  constructor() {
    super('lesson_status', 'AdminLessonSupabaseService');
    
    // キャッシュ管理
    this.statusCache = new Map();
    this.cacheExpiry = CONFIG.database.cache.lesson;
    this.lastCacheUpdate = null;
    
    // 設定
    this.config = CONFIG.lesson;
    
    // ステータス定義（schema.sql準拠）
    this.statusTypes = {
      'scheduled': { label: '通常開催', color: '#27ae60', icon: '✓' },
      'cancelled': { label: '中止', color: '#e74c3c', icon: '✗' },
      'indoor': { label: '室内開催', color: '#f39c12', icon: '🏠' },
      'postponed': { label: '延期', color: '#9b59b6', icon: '⏰' }
    };
  }

  /**
   * レッスン状況を取得（日付範囲指定）
   * @param {Object} options - 取得オプション
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getLessonStatus(options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        limit = null,
        useCache = true
      } = options;

      this.debug('レッスン状況取得開始', { startDate, endDate, limit });

      // キャッシュチェック（基本取得の場合のみ）
      if (useCache && !startDate && !endDate && this.isCacheValid()) {
        const cached = this.filterStatusFromCache(options);
        this.debug(`キャッシュからレッスン状況取得: ${cached.length}件`);
        return { success: true, data: cached };
      }

      // フィルター構築
      const filters = {};
      if (startDate) {
        filters.date = { gte: startDate };
      }
      if (endDate) {
        if (filters.date) {
          filters.date.lte = endDate;
        } else {
          filters.date = { lte: endDate };
        }
      }

      // ソート設定（schema.sql準拠: date DESC）
      const orderBy = [
        { column: 'date', ascending: false }
      ];

      const { data, error } = await this.select({
        filters,
        orderBy,
        limit
      });

      if (error) {
        this.error('レッスン状況取得エラー:', error);
        return {
          success: false,
          error: `レッスン状況の取得に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュ更新（基本取得の場合のみ）
      if (!startDate && !endDate) {
        this.updateCache(data);
      }

      this.debug(`レッスン状況取得完了: ${data?.length || 0}件`);
      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      this.error('レッスン状況取得処理エラー:', error);
      return {
        success: false,
        error: `レッスン状況の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 今日のレッスン状況を取得
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getTodayStatus() {
    try {
      const today = new Date().toISOString().split('T')[0];
      this.debug('今日のレッスン状況取得開始:', today);

      const { data, error } = await this.select({
        filters: { date: today },
        limit: 1
      });

      if (error) {
        this.error('今日のレッスン状況取得エラー:', error);
        return {
          success: false,
          error: `今日のレッスン状況の取得に失敗しました: ${error.message || error}`
        };
      }

      const todayStatus = data && data.length > 0 ? data[0] : null;

      this.debug('今日のレッスン状況取得完了:', todayStatus?.date);
      return {
        success: true,
        data: todayStatus
      };

    } catch (error) {
      this.error('今日のレッスン状況取得処理エラー:', error);
      return {
        success: false,
        error: `今日のレッスン状況の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 最新のレッスン状況を取得（過去7日間）
   * @returns {Promise<{success: boolean data?: Array, error?: string}>}
   */
  async getRecentStatus() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];

      this.debug('最新レッスン状況取得開始:', startDate);

      return await this.getLessonStatus({
        startDate,
        useCache: false
      });

    } catch (error) {
      this.error('最新レッスン状況取得処理エラー:', error);
      return {
        success: false,
        error: `最新レッスン状況の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * レッスン状況を作成・更新（UPSERT）
   * @param {Object} statusData - レッスン状況データ
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async upsertLessonStatus(statusData) {
    try {
      this.debug('レッスン状況UPSERT開始:', statusData.date);

      // バリデーション
      const validation = this.validateStatus(statusData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `バリデーションエラー: ${validation.errors.join(', ')}`
        };
      }

      // データ正規化（schema.sql準拠）
      const normalizedData = this.normalizeStatusData(statusData);

      // 既存データ確認
      const { data: existing } = await this.select({
        filters: { date: normalizedData.date },
        limit: 1
      });

      let result;
      if (existing && existing.length > 0) {
        // 更新
        result = await this.update(existing[0].id, normalizedData);
      } else {
        // 新規作成
        result = await this.insert(normalizedData);
      }

      if (result.error) {
        this.error('レッスン状況UPSERT エラー:', result.error);
        return {
          success: false,
          error: `レッスン状況の保存に失敗しました: ${result.error.message || result.error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発火
      EventBus.emit('lesson:statusUpdated', { 
        status: result.data[0],
        isNew: !existing || existing.length === 0
      });

      this.debug('レッスン状況UPSERT完了:', result.data[0].id);
      return {
        success: true,
        data: result.data[0]
      };

    } catch (error) {
      this.error('レッスン状況UPSERT処理エラー:', error);
      return {
        success: false,
        error: `レッスン状況の保存中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * レッスン状況を削除
   * @param {string} statusId - レッスン状況ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteStatus(statusId) {
    try {
      this.debug('レッスン状況削除開始:', statusId);

      if (!statusId) {
        return {
          success: false,
          error: 'レッスン状況IDが指定されていません'
        };
      }

      const { error } = await this.delete(statusId);

      if (error) {
        this.error('レッスン状況削除エラー:', error);
        return {
          success: false,
          error: `レッスン状況の削除に失敗しました: ${error.message || error}`
        };
      }

      // キャッシュクリア
      this.clearCache();

      // イベント発火
      EventBus.emit('lesson:statusDeleted', { statusId });

      this.debug('レッスン状況削除完了:', statusId);
      return {
        success: true
      };

    } catch (error) {
      this.error('レッスン状況削除処理エラー:', error);
      return {
        success: false,
        error: `レッスン状況の削除中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * 日付でレッスン状況を削除
   * @param {string} date - 日付（YYYY-MM-DD）
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteStatusByDate(date) {
    try {
      this.debug('日付指定レッスン状況削除開始:', date);

      if (!date) {
        return {
          success: false,
          error: '日付が指定されていません'
        };
      }

      // 該当データを取得
      const { data: existing } = await this.select({
        filters: { date },
        limit: 1
      });

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: '指定された日付のレッスン状況が見つかりません'
        };
      }

      return await this.deleteStatus(existing[0].id);

    } catch (error) {
      this.error('日付指定レッスン状況削除処理エラー:', error);
      return {
        success: false,
        error: `レッスン状況の削除中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * レッスン状況統計を取得
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getStatusStats() {
    try {
      this.debug('レッスン状況統計取得開始');

      // 過去30日間のデータを取得
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: recentData, error } = await this.select({
        filters: { date: { gte: startDate } }
      });

      if (error) throw error;

      // 統計計算
      const stats = {
        total: recentData?.length || 0,
        scheduled: 0,
        cancelled: 0,
        indoor: 0,
        postponed: 0
      };

      if (recentData) {
        recentData.forEach(status => {
          if (status.basic_status === 'scheduled' && status.advance_status === 'scheduled') {
            stats.scheduled++;
          } else if (status.basic_status === 'cancelled' || status.advance_status === 'cancelled') {
            stats.cancelled++;
          } else if (status.basic_status === 'indoor' || status.advance_status === 'indoor') {
            stats.indoor++;
          } else if (status.basic_status === 'postponed' || status.advance_status === 'postponed') {
            stats.postponed++;
          }
        });
      }

      this.debug('レッスン状況統計取得完了:', stats);
      return {
        success: true,
        data: stats
      };

    } catch (error) {
      this.error('レッスン状況統計取得エラー:', error);
      return {
        success: false,
        error: `レッスン状況統計の取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  /**
   * レッスン状況データを正規化（schema.sql準拠）
   * @param {Object} data - レッスン状況データ
   * @returns {Object} 正規化されたデータ
   */
  normalizeStatusData(data) {
    return {
      date: data.date,
      basic_status: data.basic_status || data.basicStatus || 'scheduled',
      basic_message: data.basic_message || data.basicMessage || '',
      advance_status: data.advance_status || data.advanceStatus || 'scheduled',
      advance_message: data.advance_message || data.advanceMessage || '',
      global_message: data.global_message || data.globalMessage || ''
    };
  }

  /**
   * レッスン状況データをバリデーション
   * @param {Object} data - レッスン状況データ
   * @returns {Object} バリデーション結果
   */
  validateStatus(data) {
    const errors = [];

    // 必須フィールドチェック
    if (!data.date) {
      errors.push('日付は必須です');
    }

    // 日付形式チェック
    if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push('日付はYYYY-MM-DD形式で入力してください');
    }

    // ステータス値チェック
    const validStatuses = ['scheduled', 'cancelled', 'indoor', 'postponed'];
    
    const basicStatus = data.basic_status || data.basicStatus;
    if (basicStatus && !validStatuses.includes(basicStatus)) {
      errors.push('基礎クラスのステータスが無効です');
    }

    const advanceStatus = data.advance_status || data.advanceStatus;
    if (advanceStatus && !validStatuses.includes(advanceStatus)) {
      errors.push('上級クラスのステータスが無効です');
    }

    // メッセージ長さチェック
    const basicMessage = data.basic_message || data.basicMessage || '';
    if (basicMessage.length > this.config.limits.messageMaxLength) {
      errors.push(`基礎クラスメッセージは${this.config.limits.messageMaxLength}文字以内で入力してください`);
    }

    const advanceMessage = data.advance_message || data.advanceMessage || '';
    if (advanceMessage.length > this.config.limits.messageMaxLength) {
      errors.push(`上級クラスメッセージは${this.config.limits.messageMaxLength}文字以内で入力してください`);
    }

    const globalMessage = data.global_message || data.globalMessage || '';
    if (globalMessage.length > this.config.limits.messageMaxLength) {
      errors.push(`全体メッセージは${this.config.limits.messageMaxLength}文字以内で入力してください`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ステータス情報を取得
   * @param {string} statusType - ステータスタイプ
   * @returns {Object} ステータス情報
   */
  getStatusInfo(statusType) {
    return this.statusTypes[statusType] || this.statusTypes.scheduled;
  }

  /**
   * 全ステータスタイプを取得
   * @returns {Object} 全ステータスタイプ
   */
  getAllStatusTypes() {
    return this.statusTypes;
  }

  /**
   * キャッシュ有効性確認
   * @returns {boolean}
   */
  isCacheValid() {
    return this.lastCacheUpdate && 
           (Date.now() - this.lastCacheUpdate) < this.cacheExpiry;
  }

  /**
   * キャッシュ更新
   * @param {Array} statuses - レッスン状況配列
   */
  updateCache(statuses) {
    this.statusCache.clear();
    statuses.forEach(status => {
      this.statusCache.set(status.date, status);
    });
    this.lastCacheUpdate = Date.now();
    this.debug(`キャッシュ更新: ${statuses.length}件`);
  }

  /**
   * キャッシュからレッスン状況をフィルタリング
   * @param {Object} options - フィルターオプション
   * @returns {Array} フィルタリングされたレッスン状況配列
   */
  filterStatusFromCache(options) {
    const { limit } = options;
    let statuses = Array.from(this.statusCache.values());

    // ソート（日付降順）
    statuses.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 制限
    if (limit) {
      statuses = statuses.slice(0, limit);
    }

    return statuses;
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.statusCache.clear();
    this.lastCacheUpdate = null;
    this.debug('キャッシュクリア完了');
  }

  /**
   * サービス破棄
   */
  destroy() {
    this.clearCache();
    super.destroy();
    this.debug('AdminLessonSupabaseService破棄完了');
  }
}

// シングルトンインスタンス
let adminLessonSupabaseServiceInstance = null;

/**
 * AdminLessonSupabaseServiceのシングルトンインスタンスを取得
 * @returns {AdminLessonSupabaseService}
 */
export function getAdminLessonSupabaseService() {
  if (!adminLessonSupabaseServiceInstance) {
    adminLessonSupabaseServiceInstance = new AdminLessonSupabaseService();
  }
  return adminLessonSupabaseServiceInstance;
} 