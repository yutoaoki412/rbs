/**
 * RBS陸上教室 アプリケーション設定
 */
const config = {
  // アプリケーション基本情報
  app: {
    name: 'RBS陸上教室',
    version: '3.0',
    environment: location.hostname === 'localhost' ? 'development' : 'production'
  },

  // ルーティング設定
  routing: {
    routes: {
      '/': 'index',
      '/index.html': 'index',
      '/news.html': 'news',
      '/news-detail.html': 'news-detail',
      '/admin.html': 'admin',
      '/admin-login.html': 'admin-login'
    },
    defaultRoute: 'index'
  },

  // モジュール設定
  modules: {
    // 管理画面モジュール
    admin: {
      enabled: true,
      requireAuth: true,
      modules: ['AdminCore', 'UIManager', 'DataManager', 'AdminAuth']
    },
    
    // ニュースモジュール
    news: {
      enabled: true,
      modules: ['NewsService', 'MarkdownParser', 'NewsCard']
    },
    
    // コンテンツモジュール
    content: {
      enabled: true,
      modules: ['ContentService', 'StorageService']
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

  // API設定
  api: {
    timeout: 30000,
    retries: 3,
    endpoints: {
      articles: '/api/articles',
      auth: '/api/auth'
    }
  },

  // ストレージ設定
  storage: {
    prefix: 'rbs_',
    version: '3.0',
    keys: {
      articles: 'articles',
      auth: 'auth_token',
      settings: 'user_settings',
      cache: 'cache_data'
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
    csrfToken: true,
    sessionTimeout: 30 * 60 * 1000, // 30分
    maxLoginAttempts: 5
  },

  // パフォーマンス設定
  performance: {
    lazyLoad: true,
    moduleCache: true,
    prefetch: ['shared/components/BaseComponent']
  }
};

export default config; 