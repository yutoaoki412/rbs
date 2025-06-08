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
      instagramPosts: 'rbs_instagram_posts',  // 投稿データ
      instagramSettings: 'rbs_instagram_settings', // 設定データ
      instagramBackup: 'rbs_instagram_backup', // バックアップデータ
      
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

  // Instagram管理設定
  instagram: {
    // 投稿管理
    posts: {
      maxPosts: 100,           // 最大保存投稿数
      maxDisplayPosts: 12,     // LP側最大表示数
      defaultDisplayPosts: 6,  // LP側デフォルト表示数
      displayOptions: [3, 6, 9, 12], // 表示数選択肢
      autoSaveInterval: 5000,  // 自動保存間隔（5秒）
      defaultStatus: 'active', // デフォルトステータス
      defaultFeatured: false,  // デフォルト注目投稿設定
      
      // データ構造定義（埋め込みコード対応）
      schema: {
        required: ['id', 'embedCode', 'status', 'createdAt'], // 必須フィールド（urlからembedCodeに変更）
        defaults: {
          status: 'active',        // デフォルトステータス
          featured: false,         // 注目投稿フラグ
          order: 0                 // 表示順序（将来用）
        }
      },
      
      // データバリデーション（埋め込みコード対応）
      validation: {
        id: {
          type: 'string',
          minLength: 1,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9_-]+$/
        },
        embedCode: {
          type: 'string',
          required: true,
          minLength: 50,           // 埋め込みコードは最低50文字
          maxLength: 10000         // 最大10KB
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          default: 'active'
        },
        featured: {
          type: 'boolean',
          default: false
        },
        order: {
          type: 'number',
          min: 0,
          max: 9999,
          default: 0
        }
      }
    },
    
    // 埋め込みコード検証（シンプル版）
    validation: {
      // 埋め込みコードの基本チェック
      embedPattern: /<blockquote[^>]*class="instagram-media"[^>]*>/,
      
      // 埋め込みコードの例
      embedExample: `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/ABC123/">...</blockquote>
<script async src="//www.instagram.com/embed.js"></script>`,
      
      // 最大埋め込みコード長
      maxEmbedLength: 15000,
      
      // 必須要素チェック（最小限）
      requiredElements: [
        'blockquote',
        'instagram-media'
      ]
    },
    
    // LP側表示設定
    display: {
      openNewTab: true,        // 新しいタブで開くかのデフォルト
      showCaptions: false,     // キャプション表示（将来用）
      showDates: false,        // 日付表示（将来用）
      layout: 'grid',          // レイアウト（将来用）
      responsive: {
        mobile: { columns: 1 },
        tablet: { columns: 2 },
        desktop: { columns: 3 }
      }
    },
    
    // 統計・分析
    analytics: {
      trackClicks: true,       // クリック追跡
      trackViews: true,        // 表示追跡
      retentionDays: 30        // データ保持期間
    },
    
    // UI設定（埋め込みコード対応）
    ui: {
      emptyStateMessage: 'Instagram投稿がまだ登録されていません',
      loadingMessage: 'Instagram投稿を読み込み中...',
      successMessages: {
        saved: 'Instagram投稿を保存しました',
        updated: 'Instagram投稿を更新しました',
        deleted: 'Instagram投稿を削除しました',
        statusChanged: 'ステータスを変更しました',
        settingsSaved: 'Instagram設定を保存しました'
      },
      errorMessages: {
        saveError: 'Instagram投稿の保存に失敗しました',
        loadError: 'Instagram投稿の読み込みに失敗しました',
        deleteError: 'Instagram投稿の削除に失敗しました',
        invalidEmbed: '正しいInstagram埋め込みコードを入力してください',
        embedRequired: 'Instagram埋め込みコードを入力してください',
        embedTooLong: '埋め込みコードが長すぎます',
        missingElements: '必須要素が不足している埋め込みコードです',
        noPermalink: 'Instagram投稿のpermalinkが見つかりません',
        networkError: 'ネットワークエラーが発生しました'
      },
      placeholders: {
        embedCode: 'Instagramの埋め込みコードをここに貼り付けてください...',
        embedExample: `例：
<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/ABC123/">
  <!-- Instagram埋め込み内容 -->
</blockquote>
<script async src="//www.instagram.com/embed.js"></script>`
      },
      notifications: {
        duration: 3000,          // 通知表示時間
        position: 'top-right'    // 通知位置
      }
    },
    
    // データ管理（新バージョン最適化）
    data: {
      // ストレージ設定
      storage: {
        type: 'localStorage',         // ストレージタイプ
        key: 'rbs_instagram_posts'    // メインストレージキー
      },
      
      // バックアップ設定
      backup: {
        enabled: true,               // バックアップ有効
        maxBackups: 7,               // 最大バックアップ数
        autoBackup: true             // 自動バックアップ
      },
      
      // データ整合性
      integrity: {
        validateOnLoad: true,        // 読み込み時バリデーション
        autoRepair: true,            // 自動修復
        logErrors: true              // エラーログ出力
      },
      
      // バージョン管理
      version: {
        current: '2.0.0'             // 埋め込みコード対応バージョン
      }
    },
    
    // パフォーマンス設定（2024年最適化）
    performance: {
      lazyLoad: true,          // 遅延読み込み
      cacheTimeout: 3 * 60 * 1000, // キャッシュタイムアウト（3分に短縮）
      debounceTime: 200,       // 検索デバウンス時間（短縮）
      maxConcurrentRequests: 5, // 最大同時リクエスト数（増加）
      embedRetryInterval: 300, // 埋め込みリトライ間隔
      embedMaxRetries: 15,     // 埋め込み最大リトライ回数
      scriptLoadTimeout: 10000 // スクリプト読み込みタイムアウト
    },
    
    // セキュリティ設定（埋め込みコード対応）
    security: {
      sanitizeEmbeds: true,    // 埋め込みコード サニタイズ
      validateOrigin: true,    // オリジン検証
      allowedDomains: [        // 許可されたドメイン
        'instagram.com',
        'www.instagram.com'
      ],
      rateLimitPerMinute: 60,  // 分あたりのリクエスト制限
      maxRetries: 3            // 最大リトライ回数
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

  // スクロール設定
  scroll: {
    headerOffset: 120,
    statusBannerOffset: -75,
    additionalOffset: -75,
    mobileAdditionalOffset: -45,
    smallMobileAdditionalOffset: -50,
    smoothScrollDuration: 800
  },

  // デバッグ設定
  debug: {
    enabled: true,  // デバッグを有効化
    verbose: true,  // 詳細ログを有効化
    logLevel: 'debug' // 'debug', 'info', 'warn', 'error'
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