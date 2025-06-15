/**
 * シンプル統一Admin Core - Supabase完全移行版
 * @version 4.1.0 - ファイルプロトコル対応 + エラー修正版
 */

/**
 * 管理画面の統一コア（シンプル設計 + Supabase完全移行）
 */
class SimpleAdminCore {
  constructor() {
    this.state = {
      initialized: false,
      services: new Map(),
      modules: new Map(),
      currentTab: 'dashboard'
    };
    
    this.config = {
      autoSave: true,
      notifications: true,
      debugMode: true
    };
    
    // Supabaseクライアント
    this.supabase = null;
  }

  /**
   * 初期化（メインエントリーポイント）
   */
  async init() {
    if (this.state.initialized) return this;
    
    try {
      console.log('🚀 SimpleAdminCore初期化開始');
      
      await this._initializeSupabase();
      await this._initializeBasicServices();
      this._setupEventHandlers();
      await this._activateInitialTab();
      
      this.state.initialized = true;
      this._notifyInitialized();
      
      return this;
    } catch (error) {
      console.error('SimpleAdminCore初期化エラー:', error);
      return this._createFallbackCore();
    }
  }

  /**
   * Supabase初期化
   */
  async _initializeSupabase() {
    try {
      if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        this.supabase = window.supabase.createClient(
          window.SUPABASE_URL,
          window.SUPABASE_ANON_KEY
        );
        console.log('✅ Supabaseクライアント初期化完了');
      } else {
        console.warn('⚠️ Supabase設定が見つかりません - 開発モードで継続');
      }
    } catch (error) {
      console.warn('⚠️ Supabase初期化エラー:', error.message);
    }
  }

  /**
   * 基本サービス初期化
   */
  async _initializeBasicServices() {
    // 通知サービス（内蔵シンプル版）
    const notificationService = {
      show: (message, type = 'info') => {
        this._showNotification(message, type);
      }
    };
    this.state.services.set('notification', notificationService);

    // 設定サービス（Supabase版）
    const settingsService = {
      saveAdminTab: async (tabName) => {
        try {
          if (this.supabase) {
            await this.supabase
              .from('admin_settings')
              .upsert({ key: 'current_tab', value: tabName });
          } else {
            // フォールバック：sessionStorage使用
            sessionStorage.setItem('rbs_admin_current_tab', tabName);
          }
        } catch (error) {
          console.warn('タブ保存エラー:', error.message);
        }
      },
      getAdminTab: async () => {
        try {
          if (this.supabase) {
            const { data } = await this.supabase
              .from('admin_settings')
              .select('value')
              .eq('key', 'current_tab')
              .single();
            return data?.value || 'dashboard';
          } else {
            // フォールバック：sessionStorage使用
            return sessionStorage.getItem('rbs_admin_current_tab') || 'dashboard';
          }
        } catch (error) {
          console.warn('タブ取得エラー:', error.message);
          return 'dashboard';
        }
      }
    };
    this.state.services.set('settings', settingsService);

    // 下書きサービス（統合版）
    const draftService = {
      saveDraft: async (type, data) => {
        try {
          // DraftSupabaseServiceを使用（統合版）
          const { getDraftSupabaseService } = await import('../../../shared/services/DraftSupabaseService.js');
          const service = getDraftSupabaseService();
          await service.init();
          return await service.saveDraft(type, data);
        } catch (importError) {
          // フォールバック：直接保存
          try {
            if (this.supabase) {
              await this.supabase
                .from('drafts')
                .upsert({ 
                  type, 
                  content: JSON.stringify(data),
                  updated_at: new Date().toISOString()
                });
            } else {
              sessionStorage.setItem(`rbs_draft_${type}`, JSON.stringify(data));
            }
            console.log(`下書き保存完了: ${type}`);
          } catch (error) {
            console.warn('下書き保存エラー:', error.message);
          }
        }
      }
    };
    this.state.services.set('draft', draftService);

    console.log('✅ 基本サービス初期化完了');
  }

  /**
   * イベントハンドラ設定
   */
  _setupEventHandlers() {
    // タブ切り替え
    document.addEventListener('click', (e) => {
      const tabButton = e.target.closest('[data-tab]');
      if (tabButton) {
        e.preventDefault();
        this.switchTab(tabButton.dataset.tab);
      }
    });

    // フォーム自動保存
    if (this.config.autoSave) {
      document.addEventListener('input', this._debounce((e) => {
        if (e.target.matches('.auto-save, input, textarea')) {
          this._autoSave(e.target);
        }
      }, 2000));
    }

    console.log('✅ イベントハンドラ設定完了');
  }

  /**
   * タブ切り替え
   */
  async switchTab(tabName) {
    if (this.state.currentTab === tabName) return;
    
    try {
      // UIの更新
      this._updateTabUI(tabName);
      
      // 状態の保存
      await this._saveCurrentTab(tabName);
      
      this.state.currentTab = tabName;
      this._showNotification(`${this._getTabLabel(tabName)}に切り替えました`, 'info');
      
    } catch (error) {
      console.error('タブ切り替えエラー:', error);
      this._showNotification('タブの切り替えに失敗しました', 'error');
    }
  }

  /**
   * モジュール取得（シンプル版）
   */
  async getModule(name) {
    if (this.state.modules.has(name)) {
      return this.state.modules.get(name);
    }

    // シンプルなモジュール実装
    const simpleModule = {
      name,
      initialized: true,
      saveData: async (data) => {
        try {
          if (this.supabase) {
            // Supabaseに保存
            const tableName = this._getTableName(name);
            await this.supabase.from(tableName).insert(data);
            this._showNotification(`${name}データを保存しました`, 'success');
          } else {
            // フォールバック保存
            sessionStorage.setItem(`rbs_${name}_data`, JSON.stringify(data));
            this._showNotification(`${name}データを一時保存しました`, 'info');
          }
        } catch (error) {
          console.error(`${name}保存エラー:`, error);
          this._showNotification(`${name}の保存に失敗しました`, 'error');
        }
      },
      loadData: async () => {
        try {
          if (this.supabase) {
            const tableName = this._getTableName(name);
            const { data } = await this.supabase.from(tableName).select('*');
            return data || [];
          } else {
            const stored = sessionStorage.getItem(`rbs_${name}_data`);
            return stored ? JSON.parse(stored) : [];
          }
        } catch (error) {
          console.error(`${name}読み込みエラー:`, error);
          return [];
        }
      }
    };

    this.state.modules.set(name, simpleModule);
    return simpleModule;
  }

  /**
   * サービス取得
   */
  getService(name) {
    return this.state.services.get(name);
  }

  /**
   * UI更新
   */
  _updateTabUI(tabName) {
    // すべてのタブを非アクティブ化
    document.querySelectorAll('.admin-section, .nav-item').forEach(el => {
      el.classList.remove('active');
    });

    // 選択されたタブをアクティブ化
    const section = document.getElementById(tabName);
    const navItem = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (section) section.classList.add('active');
    if (navItem) navItem.classList.add('active');
  }

  /**
   * 通知表示（内蔵シンプル版）
   */
  _showNotification(message, type = 'info') {
    // 既存の通知コンテナを確認
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 300px;
      `;
      document.body.appendChild(container);
    }

    // 通知要素作成
    const notification = document.createElement('div');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const colors = { 
      success: '#4caf50', 
      error: '#f44336', 
      warning: '#ff9800', 
      info: '#2196f3' 
    };
    
    notification.style.cssText = `
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `${icons[type] || icons.info} ${message}`;
    container.appendChild(notification);

    // 自動削除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);

    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * 現在のタブ状態保存
   */
  async _saveCurrentTab(tabName) {
    const settingsService = this.getService('settings');
    if (settingsService) {
      try {
        await settingsService.saveAdminTab(tabName);
      } catch (error) {
        console.warn('タブ状態の保存に失敗:', error.message);
      }
    }
  }

  /**
   * 初期タブのアクティブ化
   */
  async _activateInitialTab() {
    const settingsService = this.getService('settings');
    let initialTab = 'dashboard';
    
    if (settingsService) {
      try {
        initialTab = await settingsService.getAdminTab() || 'dashboard';
      } catch (error) {
        console.warn('前回のタブ復元に失敗:', error.message);
      }
    }
    
    await this.switchTab(initialTab);
  }

  /**
   * 自動保存
   */
  async _autoSave(element) {
    const draftService = this.getService('draft');
    if (!draftService) return;

    const form = element.closest('form');
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await draftService.saveDraft(form.dataset.type || 'general', data);
    } catch (error) {
      console.warn('自動保存エラー:', error);
    }
  }

  /**
   * フォールバックコア作成
   */
  _createFallbackCore() {
    console.warn('⚠️ フォールバックモードで動作します');
    
    this.state.initialized = true;
    this.state.fallback = true;
    
    // 最小限の機能を提供
    this.switchTab = (tabName) => {
      this._updateTabUI(tabName);
      this.state.currentTab = tabName;
    };
    
    return this;
  }

  /**
   * 初期化完了通知
   */
  _notifyInitialized() {
    console.log('✅ SimpleAdminCore初期化完了');
    this._showNotification('管理画面が初期化されました', 'success');
  }

  /**
   * ヘルパーメソッド
   */
  _getTabLabel(tabName) {
    const labels = {
      'dashboard': 'ダッシュボード',
      'news-management': '記事管理', 
      'lesson-status': 'レッスン状況',
      'instagram-management': 'Instagram管理',
      'settings': '設定'
    };
    return labels[tabName] || tabName;
  }

  _getTableName(moduleName) {
    const tables = {
      'news': 'articles',
      'lesson': 'lesson_status',
      'instagram': 'instagram_posts'
    };
    return tables[moduleName] || moduleName;
  }

  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('設定を更新しました:', newConfig);
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      state: this.state,
      config: this.config,
      services: Array.from(this.state.services.keys()),
      modules: Array.from(this.state.modules.keys()),
      supabaseConnected: !!this.supabase
    };
  }
}

// シングルトンインスタンス
let adminCoreInstance = null;

/**
 * SimpleAdminCoreインスタンス取得
 */
export function getSimpleAdminCore() {
  if (!adminCoreInstance) {
    adminCoreInstance = new SimpleAdminCore();
  }
  return adminCoreInstance;
}

/**
 * 管理画面初期化（メインエントリーポイント）
 */
export async function initializeSimpleAdmin() {
  const core = getSimpleAdminCore();
  return await core.init();
}

export default SimpleAdminCore; 