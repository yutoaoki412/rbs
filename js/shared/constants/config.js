/**
 * RBS陸上教室 アプリケーション設定
 * Supabase完全対応版 - モダン・クリーン・シンプル
 * @version 5.0.0 - Supabase統合版
 */

const config = {
  // ===================================
  // アプリケーション基本情報
  // ===================================
  app: {
    name: 'RBS陸上教室',
    version: '5.0.0',
    environment: (typeof location !== 'undefined' && location.hostname === 'localhost') ? 'development' : 'production',
    description: 'RBS陸上教室 公式サイト・管理システム'
  },

  // ===================================
  // Supabaseデータベース設定
  // ===================================
  database: {
    // テーブル定義
    tables: {
      articles: 'articles',
      instagram_posts: 'instagram_posts', 
      lesson_status: 'lesson_status',
      admin_settings: 'admin_settings'
    },
    
    // リアルタイム設定
    realtime: {
      enabled: true,
      channels: ['articles', 'instagram_posts', 'lesson_status']
    },
    
    // キャッシュ設定
    cache: {
      articles: 3 * 60 * 1000,      // 3分
      instagram: 5 * 60 * 1000,     // 5分
      lessons: 1 * 60 * 1000,       // 1分（リアルタイム性重視）
      settings: 10 * 60 * 1000      // 10分
    }
  },

  // ===================================
  // 記事管理設定（Supabase対応）
  // ===================================
  articles: {
    // データ制限
    limits: {
      maxCount: 1000,
      titleMaxLength: 200,
      contentMaxLength: 50000,
      summaryMaxLength: 500
    },
    
    // カテゴリー定義（schema.sql準拠）
    categories: {
      'general': {
        id: 'general',
        name: '一般',
        description: '一般的なお知らせ',
        color: '#3498db',
        class: 'general'
      },
      'event': {
        id: 'event', 
        name: 'イベント',
        description: '体験会・イベント情報',
        color: '#e74c3c',
        class: 'event'
      },
      'notice': {
        id: 'notice',
        name: 'お知らせ',
        description: '重要なお知らせ',
        color: '#f39c12', 
        class: 'notice'
      },
      'lesson': {
        id: 'lesson',
        name: 'レッスン',
        description: 'レッスン関連情報',
        color: '#27ae60',
        class: 'lesson'
      },
      'other': {
        id: 'other',
        name: 'その他',
        description: 'その他の情報',
        color: '#95a5a6',
        class: 'other'
      }
    },
    
    // ステータス定義
    statuses: {
      'draft': {
        id: 'draft',
        name: '下書き',
        description: '編集中の記事',
        color: '#f39c12',
        class: 'draft'
      },
      'published': {
        id: 'published', 
        name: '公開',
        description: '公開済みの記事',
        color: '#27ae60',
        class: 'published'
      }
    },

    // 表示設定
    display: {
      homePageLimit: 6,        // ホームページ表示件数
      listPageLimit: 12,       // 一覧ページ表示件数
      excerptLength: 150,      // 抜粋文字数
      dateFormat: 'ja-JP'      // 日付フォーマット
    },

    // 自動保存設定
    autoSave: {
      enabled: true,
      interval: 30 * 1000,     // 30秒
      maxDrafts: 10
    }
  },

  // ===================================
  // Instagram投稿管理（Supabase対応）
  // ===================================
  instagram: {
    // データ制限
    limits: {
      maxPosts: 100,
      embedCodeMaxLength: 15000,
      captionMaxLength: 2000
    },
    
    // 表示設定
    display: {
      defaultCount: 6,
      options: [3, 6, 9, 12, 15],
      aspectRatio: '1:1'
    },
    
    // バリデーション
    validation: {
      embedPattern: /<blockquote[^>]*class="instagram-media"/i,
      urlPattern: /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/([a-zA-Z0-9_-]+)\/?/
    },
    
    // UI設定
    ui: {
      loadingText: 'Instagram投稿を読み込み中...',
      emptyText: 'Instagram投稿がまだ登録されていません',
      errorText: '投稿の読み込みに失敗しました',
      placeholder: 'Instagramの埋め込みコードをここに貼り付けてください...'
    }
  },

  // ===================================
  // レッスン状況管理（Supabase対応）
  // ===================================
  lessons: {
    // ステータス定義
    statuses: {
      'scheduled': {
        id: 'scheduled',
        name: '通常開催',
        adminText: '通常開催',
        color: '#27ae60',
        backgroundColor: 'var(--status-scheduled)',
        icon: '✓'
      },
      'cancelled': {
        id: 'cancelled', 
        name: '中止',
        adminText: '中止',
        color: '#e74c3c',
        backgroundColor: 'var(--status-cancelled)', 
        icon: '✗'
      },
      'indoor': {
        id: 'indoor',
        name: '屋内開催',
        adminText: '屋内開催',
        color: '#f39c12',
        backgroundColor: 'var(--status-indoor)',
        icon: '🏠'
      },
      'postponed': {
        id: 'postponed',
        name: '延期',
        adminText: '延期',
        color: '#9b59b6',
        backgroundColor: 'var(--status-postponed)',
        icon: '📅'
      }
    },
    
    // クラス定義  
    classes: {
      'basic': {
        id: 'basic',
        name: 'ベーシッククラス',
        description: '年長〜小3対象',
        color: '#3498db'
      },
      'advance': {
        id: 'advance', 
        name: 'アドバンスクラス',
        description: '小4〜小6対象',
        color: '#e67e22'
      }
    },

    // 表示設定
    display: {
      daysToShow: 7,           // 表示日数
      defaultMessage: 'レッスンは予定通り開催いたします。',
      timeFormat: 'HH:mm',
      dateFormat: 'ja-JP'
    }
  },

  // ===================================
  // 管理画面設定（Supabase完全統合）
  // ===================================
  admin: {
    // Supabase Auth統合認証
    auth: {
      // 管理者アカウント設定
      adminCredentials: {
        email: 'yaoki412rad@gmail.com',
        password: 'rbs2025admin',
        role: 'admin'
      },
      
      // セッション設定
      session: {
        duration: 24 * 60 * 60 * 1000,  // 24時間
        autoRefresh: true,
        persistSession: true
      },
      
      // RLSポリシー設定（セキュアアーキテクチャ）
      rls: {
        enabled: true,
        requireAuthentication: true,
        requireAdminRole: true,
        metadataRoleCheck: true,
        adminRole: 'authenticated'
      },
      
      // 認証フロー設定
      flow: {
        loginRedirect: 'admin.html',
        logoutRedirect: 'admin-login.html',
        unauthorizedRedirect: 'admin-login.html'
      }
    },
    
    // ダッシュボード設定
    dashboard: {
      refreshInterval: 5 * 60 * 1000,  // 5分
      statsWidgets: ['articles', 'instagram', 'lessons', 'storage'],
      recentItemsLimit: 5
    },
    
    // タブ設定
    navigation: {
      defaultTab: 'dashboard',
      tabs: [
        { id: 'dashboard', name: 'ダッシュボード', icon: 'fas fa-chart-line' },
        { id: 'news-management', name: '記事管理', icon: 'fas fa-newspaper' },
        { id: 'lesson-status', name: 'レッスン状況', icon: 'fas fa-calendar-check' },
        { id: 'instagram-management', name: 'Instagram管理', icon: 'fab fa-instagram' },
        { id: 'settings', name: '設定', icon: 'fas fa-cog' }
      ]
    },
    
    // 機能設定
    features: {
      autoSave: true,
      notifications: true,
      realTimeUpdates: true,
      dataExport: true,
      dataImport: true,
      backupReminders: true
    }
  },

  // ===================================
  // UI・UX設定
  // ===================================
  ui: {
    // テーマ設定
    theme: {
      primary: '#3498db',
      secondary: '#2c3e50', 
      success: '#27ae60',
      warning: '#f39c12',
      danger: '#e74c3c',
      info: '#3498db'
    },
    
    // レスポンシブ設定
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1200,
      large: 1400
    },
    
    // アニメーション設定
    animations: {
      enabled: true,
      duration: 300,
      easing: 'ease-in-out'
    },
    
    // 通知設定
    notifications: {
      duration: 4000,
      position: 'top-right',
      maxVisible: 3
    },
    
    // ローディング設定
    loading: {
      spinnerType: 'dots',
      minDuration: 500,
      timeout: 10000
    }
  },

  // ===================================
  // パフォーマンス設定
  // ===================================
  performance: {
    // API設定
    api: {
      timeout: 10000,           // 10秒
      retryAttempts: 3,
      retryDelay: 1000
    },
    
    // キャッシュ設定
    cache: {
      enabled: true,
      defaultTTL: 5 * 60 * 1000,  // 5分
      maxSize: 100                 // 最大100件
    },
    
    // 画像最適化
    images: {
      lazyLoading: true,
      webpSupport: true,
      maxWidth: 1200
    }
  },

  // ===================================
  // 開発・デバッグ設定
  // ===================================
  debug: {
    enabled: false,
    verbose: false,
    logLevel: 'info',
    showPerformanceMetrics: false
  },

  // ===================================
  // Supabase設定
  // ===================================
  supabase: {
    enabled: true,
    realTimeEnabled: true,
    cacheEnabled: true,
    fallbackToLocalStorage: false, // 完全Supabase移行
    
    // データ同期設定
    syncSettings: {
      autoSync: true,
      syncInterval: 30000, // 30秒
      conflictResolution: 'server-wins'
    }
  }
};

// ===================================
// 環境別設定適用
// ===================================
if (config.app.environment === 'development') {
  config.debug.enabled = true;
  config.debug.verbose = true;
  config.debug.logLevel = 'debug';
  config.debug.showPerformanceMetrics = true;
  config.performance.api.timeout = 30000;
  config.admin.features.realTimeUpdates = true;
}

// ===================================
// ヘルパー関数（Supabase対応版）
// ===================================
config.helpers = {
  // カテゴリー情報取得
  getCategoryInfo: (categoryId) => {
    return config.articles.categories[categoryId] || config.articles.categories.general;
  },
  
  // ステータス情報取得  
  getStatusInfo: (statusId) => {
    return config.articles.statuses[statusId] || config.articles.statuses.draft;
  },
  
  // レッスンステータス情報取得
  getLessonStatusInfo: (statusId) => {
    return config.lessons.statuses[statusId] || config.lessons.statuses.scheduled;
  },
  
  // 日付フォーマット
  formatDate: (dateString, options = {}) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('ja-JP', defaultOptions);
  },
  
  // 時間フォーマット
  formatDateTime: (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit', 
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  // HTMLエスケープ
  escapeHtml: (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  // テキスト抜粋
  excerpt: (text, length = 150) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + '...';
  },
  
  // ログ出力（開発用）
  log: (level, message, ...args) => {
    if (!config.debug.enabled) return;
    
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[config.debug.logLevel] || 1;
    const messageLevel = levels[level] || 1;
    
    if (messageLevel >= currentLevel) {
      const timestamp = new Date().toISOString();
      console[level](`[RBS ${timestamp}] ${message}`, ...args);
    }
  },
  
  // パフォーマンス測定
  measurePerformance: (name, fn) => {
    if (!config.debug.showPerformanceMetrics) {
      return fn();
    }
    
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
};

// ===================================
// エクスポート
// ===================================
export { config as CONFIG };
export default config;

// グローバル参照（Supabase統合版）
if (typeof window !== 'undefined') {
  window.CONFIG = config;
} 