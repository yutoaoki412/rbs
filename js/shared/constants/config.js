/**
 * RBS陸上教室 アプリケーション設定（最適化版）
 * @version 4.0.0 - シンプル&クリーン統一版
 */

const config = {
  // ===================================
  // アプリケーション基本情報
  // ===================================
  app: {
    name: 'RBS陸上教室',
    version: '4.0.0',
    environment: location.hostname === 'localhost' ? 'development' : 'production'
  },

  // ===================================
  // ストレージ設定（統一・簡素化）
  // ===================================
  storage: {
    prefix: 'rbs_',
    version: '4.0.0',
    
    // 統一ストレージキー（Instagram統合版）
    keys: {
      // コアデータ
      articles: 'rbs_articles',           // 記事データ（統一）
      settings: 'rbs_settings',           // アプリ設定
      
      // 管理画面
      adminTab: 'rbs_admin_tab',          // 現在のタブ
      adminSession: 'rbs_admin_session',  // セッション情報
      
      // 機能別データ
      instagram: 'rbs_instagram_posts',   // Instagram投稿（統一キー）
      lessons: 'rbs_lessons',             // レッスン状況（統一）
      lessonStatus: 'rbs_lessons',        // レッスン状況（旧キー互換性）
      
      // Instagram関連（詳細）
      instagramPosts: 'rbs_instagram_posts',    // Instagram投稿メイン
      instagramSettings: 'rbs_instagram_settings', // Instagram設定
      instagramBackup: 'rbs_instagram_backup',     // Instagramバックアップ
      
      // 一時データ
      draft: 'rbs_draft',                 // 下書きデータ
      cache: 'rbs_cache',                 // キャッシュデータ
      
      // エクスポート・インポート
      exportHistory: 'rbs_export_history', // エクスポート履歴
      newsDraft: 'rbs_news_draft',         // ニュース下書き
      
      // 追加設定
      adminSettings: 'rbs_admin_settings', // 管理設定
      adminAuth: 'rbs_admin_auth',         // 管理認証
      notificationMode: 'rbs_notification_mode' // 通知モード
    },
    
    // 自動保存・クリーンアップ
    autoSave: 30000,        // 30秒
    cleanup: 1800000,       // 30分
    retention: 30           // 30日
  },

  // ===================================
  // 記事管理設定（統一・簡素化）
  // ===================================
  articles: {
    // 制限
    maxCount: 1000,
    excerptLength: 150,
    
    // カテゴリ（シンプル版）
    categories: {
      'announcement': { name: 'お知らせ', color: '#4299e1' },
      'event': { name: '体験会', color: '#38b2ac' },
      'media': { name: 'メディア', color: '#805ad5' },
      'important': { name: '重要', color: '#e53e3e' }
    },
    
    // データ構造
    schema: {
      required: ['id', 'title', 'content', 'category', 'status'],
      defaults: {
        status: 'draft',
        category: 'announcement',
        featured: false,
        publishedAt: null,
        updatedAt: null
      }
    }
  },

  // ===================================
  // Instagram管理設定（大幅簡素化）
  // ===================================
  instagram: {
    // 基本設定
    maxPosts: 100,
    defaultDisplay: 6,
    displayOptions: [3, 6, 9, 12],
    
    // データ構造（シンプル版）
    schema: {
      required: ['id', 'embedCode', 'status'],
      defaults: {
        status: 'active',
        featured: false,
        order: 0
      }
    },
    
    // バリデーション（最小限）
    validation: {
      embedPattern: /<blockquote[^>]*class="instagram-media"/,
      maxEmbedLength: 15000,
      minEmbedLength: 50
    },
    
    // UI設定
    ui: {
      messages: {
        empty: 'Instagram投稿がまだ登録されていません',
        loading: '読み込み中...',
        saved: '保存しました',
        error: '保存に失敗しました',
        invalidEmbed: '正しい埋め込みコードを入力してください'
      },
      placeholder: 'Instagramの埋め込みコードをここに貼り付けてください...'
    }
  },

  // ===================================
  // レッスン管理設定
  // ===================================
  lessons: {
    schema: {
      required: ['date', 'status', 'content'],
      defaults: {
        status: 'scheduled',
        weather: 'unknown',
        participants: 0
      }
    },
    
    statuses: {
      'scheduled': { name: '予定', color: '#4299e1' },
      'completed': { name: '実施', color: '#38b2ac' },
      'cancelled': { name: '中止', color: '#e53e3e' },
      'postponed': { name: '延期', color: '#f59e0b' }
    }
  },

  // ===================================
  // UI設定（統一）
  // ===================================
  ui: {
    theme: 'default',
    animations: true,
    
    // レスポンシブ設定
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1200
    },
    
    // 通知設定
    notifications: {
      duration: 3000,
      position: 'top-right'
    },
    
    // スクロール設定
    scroll: {
      headerOffset: 120,
      smoothDuration: 800
    }
  },

  // ===================================
  // 管理画面設定
  // ===================================
  admin: {
    // 認証
    auth: {
      password: 'rbs2025admin',
      sessionDuration: 86400000     // 24時間
    },
    
    // タブ設定
    tabs: {
      default: 'dashboard',
      available: ['dashboard', 'news-management', 'lesson-status', 'instagram-management', 'settings']
    },
    
    // 機能設定
    features: {
      autoSave: true,
      notifications: true,
      debug: false
    }
  },

  // ===================================
  // パフォーマンス設定
  // ===================================
  performance: {
    // タイムアウト
    moduleLoad: 10000,      // 10秒
    apiRequest: 5000,       // 5秒
    
    // キャッシュ
    cacheTimeout: 300000,   // 5分
    
    // リトライ
    maxRetries: 3,
    retryDelay: 1000
  },

  // ===================================
  // デバッグ設定
  // ===================================
  debug: {
    enabled: false,
    verbose: false,
    logLevel: 'info'        // 'debug', 'info', 'warn', 'error'
  }
};

// ===================================
// 環境別設定
// ===================================
if (config.app.environment === 'development') {
  config.debug.enabled = true;
  config.debug.verbose = true;
  config.debug.logLevel = 'debug';
  config.performance.moduleLoad = 30000;
  config.admin.features.debug = true;
}

// ===================================
// ヘルパー関数
// ===================================
config.helpers = {
  // ストレージキー生成
  getStorageKey: (key) => config.storage.keys[key] || `${config.storage.prefix}${key}`,
  
  // カテゴリ情報取得
  getCategoryInfo: (categoryId) => config.articles.categories[categoryId] || config.articles.categories.announcement,
  
  // デフォルト記事データ生成
  createDefaultArticle: () => ({
    id: Date.now().toString(),
    ...config.articles.schema.defaults,
    createdAt: new Date().toISOString()
  }),
  
  // デフォルトInstagram投稿データ生成
  createDefaultInstagramPost: () => ({
    id: Date.now().toString(),
    ...config.instagram.schema.defaults,
    createdAt: new Date().toISOString()
  }),
  
  // 日付フォーマット
  formatDate: (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
  },
  
  // ログ出力
  log: (level, message, ...args) => {
    if (!config.debug.enabled) return;
    
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[config.debug.logLevel] || 1;
    const messageLevel = levels[level] || 1;
    
    if (messageLevel >= currentLevel) {
      console[level](`[RBS] ${message}`, ...args);
    }
  }
};

// ===================================
// エクスポート
// ===================================
export { config as CONFIG };
export default config;

// 後方互換性
window.CONFIG = config;
window.DEBUG = config.debug.enabled; 