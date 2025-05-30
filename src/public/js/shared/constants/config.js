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
      articles: 'articles',
      content: 'articles_content',
      config: 'articles_config',
      auth: 'auth_token',
      settings: 'user_settings'
    }
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
    enabled: location.hostname === 'localhost' || 
             new URLSearchParams(location.search).has('debug'),
    logLevel: 'info', // error, warn, info, debug
    performance: true
  },

  // セキュリティ設定
  security: {
    sessionTimeout: 30 * 60 * 1000, // 30分
    maxLoginAttempts: 5,
    admin: {
      password: 'rbs2024admin',
      sessionDuration: 8 * 60 * 60 * 1000, // 8時間
      lockoutDuration: 15 * 60 * 1000 // 15分
    }
  },

  // パフォーマンス設定
  performance: {
    moduleLoadTimeout: 10000, // 10秒
    initRetries: 3,
    cacheMaxAge: 5 * 60 * 1000 // 5分
  }
};

// 環境別設定の上書き
if (config.app.environment === 'development') {
  config.debug.enabled = true;
  config.debug.logLevel = 'debug';
  config.performance.moduleLoadTimeout = 30000; // 開発環境では長めに設定
}

// ES6モジュール対応
export { config as CONFIG };
export default config;

// 後方互換性のためのグローバル変数
window.CONFIG = config;
window.DEBUG = config.debug.enabled; 