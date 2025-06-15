/**
 * 下書きSupabaseサービス
 * LocalStorageベースの下書き機能をSupabaseに移行
 * @version 1.0.0 - Supabase統合版
 */

import { getSupabaseClient } from '../../lib/supabase.js';
import { EventBus } from './EventBus.js';

export class DraftSupabaseService {
  constructor() {
    this.serviceName = 'DraftSupabaseService';
    this.initialized = false;
    this.supabase = null;
    this.eventBus = EventBus;
    this.draftsCache = new Map();
    this.currentUserId = null;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[DraftSupabaseService] 初期化開始');
      
      // Supabaseクライアント取得
      this.supabase = getSupabaseClient();
      
      // 現在のユーザーIDを取得
      await this.getCurrentUserId();
      
      this.initialized = true;
      console.log('[DraftSupabaseService] 初期化完了');
      
    } catch (error) {
      console.error('[DraftSupabaseService] 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 現在のユーザーIDを取得（開発モード対応）
   */
  async getCurrentUserId() {
    try {
      // 開発環境では固定IDを使用
      this.currentUserId = 'dev_user';
      console.log('[DraftSupabaseService] 開発モードでユーザーID設定:', this.currentUserId);
      return this.currentUserId;
      
    } catch (error) {
      console.log('[DraftSupabaseService] 開発モードでユーザーID設定:', error.message);
      this.currentUserId = 'dev_user';
      return this.currentUserId;
    }
  }

  /**
   * 下書きを保存（ローカルストレージ統合版）
   * @param {string} type - 下書きタイプ ('news', 'lesson')
   * @param {Object} data - 下書きデータ
   */
  async saveDraft(type, data) {
    try {
      console.log('[DraftSupabaseService] 下書き保存（ローカルストレージ）:', { type, dataKeys: Object.keys(data) });
      
      if (!this.currentUserId) {
        await this.getCurrentUserId();
      }
      
      // ローカルストレージに保存
      const storageKey = `rbs_draft_${this.currentUserId}_${type}`;
      const draftData = {
        type,
        data,
        userId: this.currentUserId,
        savedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      localStorage.setItem(storageKey, JSON.stringify(draftData));
      
      // キャッシュも更新
      this.draftsCache.set(type, data);
      
      // イベントを発火
      this.eventBus.emit('draft:saved', { 
        type, 
        data, 
        savedData: draftData,
        source: 'localStorage' 
      });
      
      console.log('[DraftSupabaseService] 下書きローカルストレージ保存完了');
      return draftData;
      
    } catch (error) {
      console.error('[DraftSupabaseService] 下書き保存エラー:', error);
      // フォールバック：キャッシュのみ
      this.draftsCache.set(type, data);
      return { type, data, source: 'cache_only' };
    }
  }

  /**
   * 下書きを取得（ローカルストレージ統合版）
   * @param {string} type - 下書きタイプ ('news', 'lesson')
   */
  async getDraft(type) {
    try {
      // キャッシュから取得を試行
      if (this.draftsCache.has(type)) {
        const cachedData = this.draftsCache.get(type);
        console.log('[DraftSupabaseService] キャッシュから下書き取得:', { type, dataKeys: Object.keys(cachedData) });
        return cachedData;
      }
      
      if (!this.currentUserId) {
        await this.getCurrentUserId();
      }
      
      // ローカルストレージから取得
      const storageKey = `rbs_draft_${this.currentUserId}_${type}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        try {
          const draftData = JSON.parse(storedData);
          const data = draftData.data;
          
          // キャッシュに保存
          this.draftsCache.set(type, data);
          
          console.log('[DraftSupabaseService] ローカルストレージから下書き取得:', { 
            type, 
            dataKeys: Object.keys(data),
            savedAt: draftData.savedAt
          });
          
          return data;
          
        } catch (parseError) {
          console.error('[DraftSupabaseService] 下書きデータ解析エラー:', parseError);
          return null;
        }
      }
      
      console.log('[DraftSupabaseService] 下書きが見つかりません:', type);
      return null;
      
    } catch (error) {
      console.error('[DraftSupabaseService] 下書き取得エラー:', error);
      return null;
    }
  }

  /**
   * 下書きを削除
   * @param {string} type - 下書きタイプ ('news', 'lesson')
   */
  async deleteDraft(type) {
    try {
      if (!this.currentUserId) {
        await this.getCurrentUserId();
      }
      
      console.log('[DraftSupabaseService] 下書き削除:', type);
      
      const { error } = await this.supabase
        .from('drafts')
        .delete()
        .eq('user_id', this.currentUserId)
        .eq('draft_type', type);
      
      if (error) {
        console.error('[DraftSupabaseService] 下書き削除エラー:', error);
        throw error;
      }
      
      // キャッシュからも削除
      this.draftsCache.delete(type);
      
      // イベントを発火
      this.eventBus.emit('draft:deleted', { type });
      
      console.log('[DraftSupabaseService] 下書き削除完了:', type);
      return true;
      
    } catch (error) {
      console.error('[DraftSupabaseService] 下書き削除エラー:', error);
      throw error;
    }
  }

  /**
   * 全下書きを取得
   */
  async getAllDrafts() {
    try {
      if (!this.currentUserId) {
        await this.getCurrentUserId();
      }
      
      console.log('[DraftSupabaseService] 全下書き取得開始');
      
      const { data, error } = await this.supabase
        .from('drafts')
        .select('draft_type, draft_data, updated_at')
        .eq('user_id', this.currentUserId);
      
      if (error) {
        console.error('[DraftSupabaseService] 全下書き取得エラー:', error);
        throw error;
      }
      
      // 下書きをオブジェクト形式に変換
      const drafts = {};
      data.forEach(item => {
        drafts[item.draft_type] = {
          data: item.draft_data,
          updatedAt: item.updated_at
        };
        // キャッシュも更新
        this.draftsCache.set(item.draft_type, item.draft_data);
      });
      
      console.log('[DraftSupabaseService] 全下書き取得完了:', Object.keys(drafts));
      return drafts;
      
    } catch (error) {
      console.error('[DraftSupabaseService] 全下書き取得エラー:', error);
      return {};
    }
  }

  /**
   * ニュース下書きを保存
   * @param {Object} newsData - ニュースデータ
   */
  async saveNewsDraft(newsData) {
    return await this.saveDraft('news', newsData);
  }

  /**
   * ニュース下書きを取得
   */
  async getNewsDraft() {
    return await this.getDraft('news');
  }

  /**
   * ニュース下書きを削除
   */
  async deleteNewsDraft() {
    return await this.deleteDraft('news');
  }

  /**
   * レッスン下書きを保存
   * @param {Object} lessonData - レッスンデータ
   */
  async saveLessonDraft(lessonData) {
    return await this.saveDraft('lesson', lessonData);
  }

  /**
   * レッスン下書きを取得
   */
  async getLessonDraft() {
    return await this.getDraft('lesson');
  }

  /**
   * レッスン下書きを削除
   */
  async deleteLessonDraft() {
    return await this.deleteDraft('lesson');
  }

  /**
   * 下書きの存在確認
   * @param {string} type - 下書きタイプ
   */
  async hasDraft(type) {
    try {
      const draft = await this.getDraft(type);
      return draft !== null;
    } catch (error) {
      console.error('[DraftSupabaseService] 下書き存在確認エラー:', error);
      return false;
    }
  }

  /**
   * 下書きの最終更新時刻を取得
   * @param {string} type - 下書きタイプ
   */
  async getDraftUpdatedAt(type) {
    try {
      if (!this.currentUserId) {
        await this.getCurrentUserId();
      }
      
      const { data, error } = await this.supabase
        .from('drafts')
        .select('updated_at')
        .eq('user_id', this.currentUserId)
        .eq('draft_type', type)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 下書きが存在しない
        }
        throw error;
      }
      
      return data.updated_at;
      
    } catch (error) {
      console.error('[DraftSupabaseService] 下書き更新時刻取得エラー:', error);
      return null;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    console.log('[DraftSupabaseService] キャッシュクリア');
    this.draftsCache.clear();
  }

  /**
   * 下書きをリロード
   */
  async reloadDrafts() {
    console.log('[DraftSupabaseService] 下書きリロード');
    this.clearCache();
    return await this.getAllDrafts();
  }

  /**
   * サービス破棄
   */
  destroy() {
    console.log('[DraftSupabaseService] サービス破棄');
    this.clearCache();
    this.currentUserId = null;
    this.initialized = false;
  }
}

// シングルトンインスタンス
let draftSupabaseServiceInstance = null;

/**
 * DraftSupabaseServiceのシングルトンインスタンスを取得
 * @returns {DraftSupabaseService}
 */
export function getDraftSupabaseService() {
  if (!draftSupabaseServiceInstance) {
    draftSupabaseServiceInstance = new DraftSupabaseService();
  }
  return draftSupabaseServiceInstance;
} 