/**
 * レッスン状況管理サービス
 * レッスン状況データの保存・読み込み・管理を担当
 * @version 2.0.0
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { isValidDate, formatDate } from '../../../shared/utils/dateUtils.js';

export class LessonStatusService {
  constructor() {
    this.initialized = false;
    
    // ストレージキー
    this.storageKeys = {
      lessonStatus: 'rbs_lesson_status'
    };
    
    // データ格納
    this.statusData = {};
    this.unsavedChanges = new Set();
    this.lastSaved = null;
    
    // 自動保存間隔（3分）
    this.autoSaveInterval = null;
    this.autoSaveDelay = 3 * 60 * 1000;
    
    // レッスン状況の選択肢
    this.statusOptions = [
      { value: 'normal', label: '通常開催', color: '#4CAF50' },
      { value: 'cancelled', label: '中止', color: '#f44336' },
      { value: 'indoor', label: '室内開催', color: '#FF9800' },
      { value: 'delayed', label: '開始時刻変更', color: '#2196F3' },
      { value: 'special', label: '特別プログラム', color: '#9C27B0' }
    ];
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ LessonStatusService: 既に初期化済み');
      return;
    }

    console.log('🏃 LessonStatusService: 初期化開始');
    
    this.loadStatusData();
    this.setupAutoSave();
    
    this.initialized = true;
    console.log('✅ LessonStatusService: 初期化完了');
  }

  /**
   * レッスン状況データの読み込み
   */
  loadStatusData() {
    try {
      const data = localStorage.getItem(this.storageKeys.lessonStatus);
      this.statusData = data ? JSON.parse(data) : {};
      
      // データの整合性チェック
      this.cleanupOldData();
      
      EventBus.emit('lessonStatus:loaded', { count: Object.keys(this.statusData).length });
      console.log(`🏃 レッスン状況データを読み込み: ${Object.keys(this.statusData).length}件`);
      
      return this.statusData;
    } catch (error) {
      console.error('❌ レッスン状況データの読み込みに失敗:', error);
      this.statusData = {};
      return {};
    }
  }

  /**
   * 古いデータをクリーンアップ
   * @private
   */
  cleanupOldData() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let cleanedCount = 0;
    
    Object.keys(this.statusData).forEach(dateKey => {
      const statusDate = new Date(dateKey);
      if (statusDate < thirtyDaysAgo) {
        delete this.statusData[dateKey];
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 古いレッスン状況データを削除: ${cleanedCount}件`);
      this.markAsUnsaved();
    }
  }

  /**
   * レッスン状況を更新
   * @param {Object} statusData - 状況データ
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async updateStatus(statusData) {
    try {
      console.log('🏃 レッスン状況更新開始:', statusData);
      
      // バリデーション
      const validation = this.validateStatus(statusData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `入力エラー: ${validation.errors.join(', ')}`
        };
      }

      const { date, status, message, time } = statusData;
      const dateKey = formatDate(new Date(date), 'YYYY-MM-DD');
      
      // 状況データを保存
      this.statusData[dateKey] = {
        status,
        message: message || '',
        time: time || null,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin' // 将来的にユーザー管理に対応
      };

      // ローカルストレージに保存
      await this.saveToStorage();
      
      this.markAsSaved();
      
      EventBus.emit('lessonStatus:updated', { 
        date: dateKey,
        status: this.statusData[dateKey] 
      });
      
      console.log('✅ レッスン状況更新完了:', { date: dateKey, status });
      
      return {
        success: true,
        message: 'レッスン状況を更新しました'
      };
      
    } catch (error) {
      console.error('❌ レッスン状況更新エラー:', error);
      return {
        success: false,
        message: 'レッスン状況の更新に失敗しました'
      };
    }
  }

  /**
   * レッスン状況を削除
   * @param {string} date - 削除する日付 (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async deleteStatus(date) {
    try {
      const dateKey = formatDate(new Date(date), 'YYYY-MM-DD');
      
      if (!this.statusData[dateKey]) {
        return {
          success: false,
          message: '指定された日付のレッスン状況が見つかりません'
        };
      }
      
      const deletedStatus = this.statusData[dateKey];
      delete this.statusData[dateKey];
      
      await this.saveToStorage();
      
      EventBus.emit('lessonStatus:deleted', { 
        date: dateKey,
        status: deletedStatus 
      });
      
      console.log('🗑️ レッスン状況削除完了:', { date: dateKey });
      
      return {
        success: true,
        message: 'レッスン状況を削除しました'
      };
      
    } catch (error) {
      console.error('❌ レッスン状況削除エラー:', error);
      return {
        success: false,
        message: 'レッスン状況の削除に失敗しました'
      };
    }
  }

  /**
   * 指定日のレッスン状況を取得
   * @param {string} date - 日付 (YYYY-MM-DD)
   * @returns {Object|null}
   */
  getStatusByDate(date) {
    const dateKey = formatDate(new Date(date), 'YYYY-MM-DD');
    return this.statusData[dateKey] || null;
  }

  /**
   * 期間内のレッスン状況を取得
   * @param {string} startDate - 開始日 (YYYY-MM-DD)
   * @param {string} endDate - 終了日 (YYYY-MM-DD)
   * @returns {Object}
   */
  getStatusByRange(startDate, endDate) {
    const result = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    Object.keys(this.statusData).forEach(dateKey => {
      const statusDate = new Date(dateKey);
      if (statusDate >= start && statusDate <= end) {
        result[dateKey] = this.statusData[dateKey];
      }
    });
    
    return result;
  }

  /**
   * 今後のレッスン状況を取得
   * @param {number} days - 取得する日数（デフォルト: 7日）
   * @returns {Object}
   */
  getUpcomingStatus(days = 7) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return this.getStatusByRange(
      formatDate(now, 'YYYY-MM-DD'),
      formatDate(futureDate, 'YYYY-MM-DD')
    );
  }

  /**
   * 全てのレッスン状況を取得
   * @returns {Object}
   */
  getAllStatus() {
    return { ...this.statusData };
  }

  /**
   * レッスン状況のバリデーション
   * @param {Object} data - 状況データ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validateStatus(data) {
    const errors = [];
    
    if (!data.date) {
      errors.push('日付は必須です');
    } else if (!isValidDate(data.date)) {
      errors.push('有効な日付を入力してください');
    }
    
    if (!data.status) {
      errors.push('レッスン状況は必須です');
    } else if (!this.statusOptions.find(option => option.value === data.status)) {
      errors.push('有効なレッスン状況を選択してください');
    }
    
    if (data.message && data.message.length > 200) {
      errors.push('メッセージは200文字以内で入力してください');
    }
    
    if (data.time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.time)) {
      errors.push('時刻の形式が正しくありません（HH:MM形式で入力してください）');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * レッスン状況選択肢を取得
   * @returns {Array}
   */
  getStatusOptions() {
    return [...this.statusOptions];
  }

  /**
   * ストレージに保存
   * @private
   */
  async saveToStorage() {
    try {
      localStorage.setItem(this.storageKeys.lessonStatus, JSON.stringify(this.statusData));
      this.lastSaved = new Date();
    } catch (error) {
      console.error('❌ ストレージ保存エラー:', error);
      throw error;
    }
  }

  /**
   * 自動保存の設定
   * @private
   */
  setupAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      this.autoSave();
    }, this.autoSaveDelay);
  }

  /**
   * 自動保存実行
   * @private
   */
  async autoSave() {
    if (this.unsavedChanges.size > 0) {
      try {
        await this.saveToStorage();
        this.markAsSaved();
        console.log('💾 レッスン状況データ自動保存完了');
      } catch (error) {
        console.error('❌ 自動保存エラー:', error);
      }
    }
  }

  /**
   * 未保存状態としてマーク
   * @private
   */
  markAsUnsaved() {
    this.unsavedChanges.add('lessonStatus');
  }

  /**
   * 保存済み状態としてマーク
   * @private
   */
  markAsSaved() {
    this.unsavedChanges.clear();
  }

  /**
   * 未保存の変更があるかチェック
   * @returns {boolean}
   */
  hasUnsavedChanges() {
    return this.unsavedChanges.size > 0;
  }

  /**
   * 統計情報を取得
   * @returns {Object}
   */
  getStats() {
    const total = Object.keys(this.statusData).length;
    const statusCounts = {};
    
    // 状況別の集計
    this.statusOptions.forEach(option => {
      statusCounts[option.value] = 0;
    });
    
    Object.values(this.statusData).forEach(status => {
      if (statusCounts.hasOwnProperty(status.status)) {
        statusCounts[status.status]++;
      }
    });
    
    return {
      total,
      statusCounts
    };
  }

  /**
   * データをエクスポート
   * @returns {Object}
   */
  exportData() {
    return {
      statusData: this.statusData,
      statusOptions: this.statusOptions,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    this.statusData = {};
    this.unsavedChanges.clear();
    this.initialized = false;
    
    console.log('🗑️ LessonStatusService: 破棄完了');
  }
}

// シングルトンインスタンス
export const lessonStatusService = new LessonStatusService(); 