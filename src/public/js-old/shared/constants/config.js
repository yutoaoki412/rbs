/**
 * RBS陸上教室 アプリケーション設定
 * @version 3.0.0 - 統合記事管理システム対応
 */

const config = {
  // アプリケーション基本情報
  app: {
    name: 'RBS陸上教室',
    version: '3.0.0',
    environment: location.hostname === 'localhost' ? 'development' : 'production'
  },

  // ページタイプ設定
  pageTypes: {
    home: 'home',
    news: 'news',
    newsDetail: 'news-detail',
    admin: 'admin'
  },

  // ストレージ設定
  storage: {
    prefix: 'rbs_',
    version: '3.0.0',
    keys: {
      // 共通データ（LP + 管理画面）- LP側の実際の使用に合わせて統一
      articles: 'rbs_articles',
      content: 'articles_content',
      config: 'articles_config',
      auth: 'rbs_auth_token',  // LP側で使用されている実際のキー
      lessonStatus: 'rbs_lesson_status',
      settings: 'rbs_settings',
      
      // 管理画面機能
      adminAuth: 'rbs_admin_auth',
      adminTab: 'rbs_admin_tab',  // 'active_tab'ではなく'tab'で統一
      adminLogs: 'rbs_admin_logs',
      debugMode: 'rbs_debug_mode',  // 'adminDebugMode'ではなく短縮形
      sessionStart: 'rbs_session_start',  // 'adminStartTime'ではなく明確な名前
      
      // 記事管理
      newsDraft: 'rbs_news_draft',
      
      // データ管理
      exportHistory: 'rbs_export_history',
      
      // Instagram連携
      instagram: 'rbs_instagram_data',
      instagramPosts: 'rbs_instagram_posts',
      instagramSettings: 'rbs_instagram_settings',
      
      // 認証関連
      authAttempts: 'rbs_auth_attempts',
      authLastAttempt: 'rbs_auth_last_attempt',
      
      // 管理画面設定
      adminSettings: 'rbs_admin_settings',
      notificationMode: 'rbs_notification_mode',
      
      // セッション関連
      targetSection: 'rbs_target_section'
    },
    autoSaveInterval: 3000,
    cleanupInterval: 30 * 60 * 1000,
    dataRetentionDays: 30
  },

  // 記事管理設定
  articles: {
    maxArticles: 1000,
    excerptLength: 150,
    autoSaveInterval: 30000, // 30秒
    categories: {
      'announcement': { name: 'お知らせ', color: '#4299e1', priority: 1 },
      'event': { name: '体験会', color: '#38b2ac', priority: 2 },
      'media': { name: 'メディア', color: '#805ad5', priority: 3 },
      'important': { name: '重要', color: '#e53e3e', priority: 0 }
    }
  },

  // UI設定
  ui: {
    theme: 'default',
    animations: true,
    responsiveBreakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1200
    }
  },

  // デバッグ設定
  debug: {
    enabled: false,
    verbose: false,
    logLevel: 'info' // 'debug', 'info', 'warn', 'error'
  },

  // パフォーマンス設定
  performance: {
    moduleLoadTimeout: 10000, // 10秒
    initRetries: 3,
    cacheMaxAge: 5 * 60 * 1000 // 5分
  },

  // セキュリティ設定
  security: {
    sessionTimeout: 30 * 60 * 1000, // 30分
    maxLoginAttempts: 5,
    admin: {
      password: 'rbs2024admin',
      sessionDuration: 24 * 60 * 60 * 1000, // 24時間
      lockoutDuration: 15 * 60 * 1000, // 15分
      sessionCheckInterval: 5 * 60 * 1000, // 5分ごとにセッションチェック
      sessionExtensionThreshold: 2 * 60 * 60 * 1000 // セッション延長の閾値（残り2時間以下で延長）
    }
  }
};

// 環境別設定の上書き
if (config.app.environment === 'development') {
  config.debug.enabled = true;
  config.debug.verbose = true;
  config.debug.logLevel = 'debug';
  config.performance.moduleLoadTimeout = 30000; // 開発環境では長めに設定
}

// ES6モジュール対応
export { config as CONFIG };
export default config;

// 後方互換性のためのグローバル変数
window.CONFIG = config;
window.DEBUG = config.debug.enabled; 