/**
 * RBS陸上教室 - アプリケーション設定
 * 全体の設定値を一元管理
 */

const RBSConfig = {
  // UI設定
  ui: {
    headerOffset: 120,
    animationThreshold: 0.1,
    scrollBehavior: 'smooth',
    transitionDuration: {
      fast: 200,
      normal: 300,
      slow: 400
    }
  },

  // ページ設定
  pages: {
    types: ['index', 'news', 'news-detail'],
    defaultMetadata: {
      siteName: 'RBS陸上教室',
      baseUrl: 'https://rbs-sportas.jp',
      ogImage: '../images/lp-logo.png'
    }
  },

  // ニュース設定
  news: {
    maxItemsOnHome: 3,
    categoriesColors: {
      'announcement': '#4a90e2',
      'event': '#50c8a3',
      'media': '#9b59b6',
      'important': '#e74c3c'
    },
    categories: {
      'all': 'すべて',
      'announcement': 'お知らせ',
      'event': '体験会',
      'media': 'メディア',
      'important': '重要'
    }
  },

  // レッスン設定
  lesson: {
    statusUpdateInterval: 30000, // 30秒
    defaultCourses: [
      {
        name: 'ベーシックコース',
        target: '年長〜小3',
        time: '17:00-17:50'
      },
      {
        name: 'アドバンスコース',
        target: '小4〜小6',
        time: '18:00-18:50'
      }
    ]
  },

  // API設定
  api: {
    baseUrl: '/api',
    timeout: 10000,
    retryAttempts: 3
  },

  // ローカルストレージキー
  storage: {
    articles: 'rbs_articles',
    lessonStatus: 'rbs_lesson_status',
    userPreferences: 'rbs_user_preferences'
  },

  // ブレークポイント
  breakpoints: {
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
  },

  // デバッグ設定
  debug: {
    enabled: true, // 一時的にデバッグを有効化
    logLevel: 'debug' // 'debug', 'info', 'warn', 'error'
  },

  // パフォーマンス設定
  performance: {
    enableLazyLoading: true,
    imageOptimization: true,
    prefetchLinks: true,
    cacheTimeout: 300000 // 5分
  },

  // アクセシビリティ設定
  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReader: true,
    highContrastMode: false,
    reducedMotion: false
  },

  // 移行設定
  migration: {
    useNewArchitecture: true,
    fallbackToOld: true,
    debugMode: true,
    enableCompatibilityMode: true
  }
};

// 設定の凍結（変更を防ぐ）
Object.freeze(RBSConfig);

// グローバルに公開
window.RBSConfig = RBSConfig; 