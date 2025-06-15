/**
 * シンプル統一Admin機能 - メインエントリーポイント
 * @version 2.0.0 - Supabase完全移行 + ファイルプロトコル対応版
 */

// 直接クラスをインポートせず、内部で定義して依存関係を排除
/**
 * Admin機能の統一初期化
 * 全ての機能をシンプルに統合（Supabase完全移行版）
 */
export async function initSimpleAdminFeatures() {
  try {
    console.log('🚀 シンプルAdmin機能初期化開始（Supabase完全移行版）');
    
    // SimpleAdminCoreを直接使用（importエラーを回避）
    const { initializeSimpleAdmin } = await getAdminCoreModule();
    const adminCore = await initializeSimpleAdmin();
    
    // グローバルアクセス設定
    window.adminCore = adminCore;
    
    // 開発ツール設定
    if (isLocalhost()) {
      setupDevTools(adminCore);
    }
    
    console.log('✅ シンプルAdmin機能初期化完了');
    return adminCore;
    
  } catch (error) {
    console.error('❌ Admin機能初期化エラー:', error);
    
    // エラー時でも基本機能は提供
    return setupFallbackAdmin();
  }
}

/**
 * AdminCoreモジュールの取得（動的ロード対応）
 */
async function getAdminCoreModule() {
  try {
    // ES Modulesでのインポート
    const module = await import('./core/SimpleAdminCore.js');
    return module;
  } catch (error) {
    console.warn('動的インポートに失敗、フォールバックを使用:', error.message);
    
    // フォールバック：内蔵のシンプル実装
    return {
      initializeSimpleAdmin: async () => {
        const simpleCore = new InlineSimpleAdminCore();
        return await simpleCore.init();
      }
    };
  }
}

/**
 * 内蔵のシンプルAdminCore（フォールバック用）
 */
class InlineSimpleAdminCore {
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
    
    this.supabase = null;
  }

  async init() {
    if (this.state.initialized) return this;
    
    try {
      console.log('🚀 内蔵SimpleAdminCore初期化開始');
      
      await this.initializeSupabase();
      this.initializeBasicServices();
      this.setupEventHandlers();
      this.activateInitialTab();
      
      this.state.initialized = true;
      this.showNotification('管理画面が初期化されました', 'success');
      
      return this;
    } catch (error) {
      console.error('内蔵SimpleAdminCore初期化エラー:', error);
      this.state.initialized = true; // エラーでも基本機能は提供
      return this;
    }
  }

  async initializeSupabase() {
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

  initializeBasicServices() {
    // 通知サービス
    this.state.services.set('notification', {
      show: (message, type) => this.showNotification(message, type)
    });

    // 設定サービス
    this.state.services.set('settings', {
      saveAdminTab: async (tabName) => {
        try {
          if (this.supabase) {
            await this.supabase.from('admin_settings').upsert({ 
              key: 'current_tab', 
              value: tabName 
            });
          } else {
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
            return sessionStorage.getItem('rbs_admin_current_tab') || 'dashboard';
          }
        } catch (error) {
          return 'dashboard';
        }
      }
    });

    console.log('✅ 基本サービス初期化完了');
  }

  setupEventHandlers() {
    // タブ切り替え
    document.addEventListener('click', (e) => {
      const tabButton = e.target.closest('[data-tab]');
      if (tabButton) {
        e.preventDefault();
        this.switchTab(tabButton.dataset.tab);
      }
    });

    console.log('✅ イベントハンドラ設定完了');
  }

  switchTab(tabName) {
    if (this.state.currentTab === tabName) return;
    
    try {
      // すべてのタブを非アクティブ化
      document.querySelectorAll('.admin-section, .nav-item').forEach(el => {
        el.classList.remove('active');
      });

      // 選択されたタブをアクティブ化
      const section = document.getElementById(tabName);
      const navItem = document.querySelector(`[data-tab="${tabName}"]`);
      
      if (section) section.classList.add('active');
      if (navItem) navItem.classList.add('active');
      
      this.state.currentTab = tabName;
      this.showNotification(`${this.getTabLabel(tabName)}に切り替えました`, 'info');
      
      // タブ状態を保存
      const settingsService = this.state.services.get('settings');
      if (settingsService) {
        settingsService.saveAdminTab(tabName);
      }
      
    } catch (error) {
      console.error('タブ切り替えエラー:', error);
      this.showNotification('タブの切り替えに失敗しました', 'error');
    }
  }

  activateInitialTab() {
    // デフォルトでダッシュボードをアクティブ化
    this.switchTab('dashboard');
  }

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
            const tableName = this.getTableName(name);
            await this.supabase.from(tableName).insert(data);
            this.showNotification(`${name}データを保存しました`, 'success');
          } else {
            sessionStorage.setItem(`rbs_${name}_data`, JSON.stringify(data));
            this.showNotification(`${name}データを一時保存しました`, 'info');
          }
        } catch (error) {
          console.error(`${name}保存エラー:`, error);
          this.showNotification(`${name}の保存に失敗しました`, 'error');
        }
      }
    };

    this.state.modules.set(name, simpleModule);
    return simpleModule;
  }

  getService(name) {
    return this.state.services.get(name);
  }

  showNotification(message, type = 'info') {
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

  getTabLabel(tabName) {
    const labels = {
      'dashboard': 'ダッシュボード',
      'news-management': '記事管理', 
      'lesson-status': 'レッスン状況',
      'instagram-management': 'Instagram管理',
      'settings': '設定'
    };
    return labels[tabName] || tabName;
  }

  getTableName(moduleName) {
    const tables = {
      'news': 'articles',
      'lesson': 'lesson_status',
      'instagram': 'instagram_posts'
    };
    return tables[moduleName] || moduleName;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('設定を更新しました:', newConfig);
  }

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

/**
 * 開発ツール設定
 */
function setupDevTools(adminCore) {
  window.adminDevTools = {
    // コア情報
    getCore: () => adminCore,
    getDebugInfo: () => adminCore.getDebugInfo(),
    
    // モジュール・サービス操作
    getModule: async (name) => await adminCore.getModule(name),
    getService: (name) => adminCore.getService(name),
    
    // 設定操作
    updateConfig: (config) => adminCore.updateConfig(config),
    switchTab: (tab) => adminCore.switchTab(tab),
    
    // ログ
    log: (message) => console.log(`[AdminDevTools] ${message}`),
    
    // テスト機能
    testNotification: () => {
      const notification = adminCore.getService('notification');
      if (notification) {
        notification.show('テスト通知', 'info');
      }
    },
    
    testSupabase: async () => {
      if (adminCore.supabase) {
        try {
          const { data, error } = await adminCore.supabase.from('admin_settings').select('*').limit(1);
          console.log('Supabase接続テスト成功:', data);
          adminCore.showNotification('Supabase接続成功', 'success');
        } catch (error) {
          console.error('Supabase接続テスト失敗:', error);
          adminCore.showNotification('Supabase接続失敗', 'error');
        }
      } else {
        console.warn('Supabaseクライアントが初期化されていません');
        adminCore.showNotification('Supabase未接続', 'warning');
      }
    }
  };
  
  console.log('🔧 Admin開発ツールが利用可能です: window.adminDevTools');
}

/**
 * フォールバック管理画面（エラー時）
 */
function setupFallbackAdmin() {
  const fallbackCore = {
    state: { initialized: true, fallback: true },
    switchTab: (tabName) => {
      document.querySelectorAll('.admin-section, .nav-item').forEach(el => {
        el.classList.remove('active');
      });
      
      const section = document.getElementById(tabName);
      const navItem = document.querySelector(`[data-tab="${tabName}"]`);
      
      if (section) section.classList.add('active');
      if (navItem) navItem.classList.add('active');
    },
    getService: () => null,
    getModule: () => null,
    getDebugInfo: () => ({ fallback: true, error: 'メイン機能の初期化に失敗' })
  };
  
  window.adminCore = fallbackCore;
  console.warn('⚠️ フォールバック管理画面で動作しています');
  
  return fallbackCore;
}

/**
 * localhost判定
 */
function isLocalhost() {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.protocol === 'file:';
}

/**
 * デフォルトエクスポート
 */
export default initSimpleAdminFeatures; 