/**
 * ページ設定定義
 * 各ページの初期化に必要な設定を定義
 */
const PAGE_CONFIGS = {
  // インデックスページ（LP）
  index: {
    pageType: 'index',
    currentPage: 'index',
    metadata: {
      title: 'RBS陸上教室 - 走力×非認知能力を育てる',
      description: '年長〜小6向け陸上教室。走力だけでなく集中力・判断力・挑戦心も育てる独自プログラム。Running & Brain Schoolで運動も勉強も前向きに！無料体験実施中',
      keywords: '大泉学園 陸上教室, 練馬区 かけっこ教室, 子ども 運動教室, RBS陸上教室',
      ogp: {
        title: 'RBS陸上教室 - 走力×非認知能力を育てる',
        description: '年長〜小6向け陸上教室。走力だけでなく集中力・判断力・挑戦心も育てる独自プログラム。',
        type: 'website',
        image: '../images/lp-logo.png'
      }
    },
    structuredData: {
      "@type": "LocalBusiness",
      "name": "RBS陸上教室",
      "description": "走力と非認知能力を同時に育てる次世代型陸上教室",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "練馬区",
        "addressRegion": "東京都",
        "addressCountry": "JP"
      },
      "telephone": "03-XXXX-XXXX",
      "email": "info@rbs-athletics.com",
      "url": window.location.origin,
      "openingHours": "Mo 17:00-18:50"
    },
    customCSS: [],
    customJS: []
  },

  // ニュースページ
  news: {
    pageType: 'news',
    currentPage: 'news',
    metadata: {
      title: 'NEWS - RBS陸上教室',
      description: 'RBS陸上教室の最新ニュース・お知らせ一覧。体験会情報、メディア掲載、教室の最新情報をお届けします。',
      keywords: 'RBS陸上教室 ニュース, 大泉学園 陸上教室 お知らせ, 体験会情報',
      ogp: {
        title: 'NEWS - RBS陸上教室',
        description: 'RBS陸上教室の最新ニュース・お知らせ一覧',
        type: 'website',
        image: '../images/lp-logo.png'
      }
    },
    customCSS: ['../styles/news.css'],
    customJS: [
      '../js/markdown-parser.js',
      '../components/NewsCard.js'
    ]
  },

  // ニュース詳細ページ
  'news-detail': {
    pageType: 'news-detail',
    currentPage: 'news',
    metadata: {
      title: 'RBS陸上教室 - NEWS詳細',
      description: 'RBS陸上教室のニュース詳細ページ',
      keywords: 'RBS陸上教室, ニュース, お知らせ',
      ogp: {
        title: 'RBS陸上教室 - NEWS詳細',
        description: 'RBS陸上教室のニュース詳細ページ',
        type: 'article',
        image: '../images/lp-logo.png'
      }
    },
    customCSS: ['../styles/news-detail.css'],
    customJS: [
      '../js/markdown-parser.js',
      '../components/NewsCard.js'
    ]
  },

  // 管理ページ
  admin: {
    pageType: 'admin',
    currentPage: 'admin',
    metadata: {
      title: '管理画面 - RBS陸上教室',
      description: 'RBS陸上教室の管理画面',
      keywords: 'RBS陸上教室, 管理画面',
      ogp: {
        title: '管理画面 - RBS陸上教室',
        description: 'RBS陸上教室の管理画面',
        type: 'website',
        image: '../images/lp-logo.png'
      }
    },
    customCSS: ['../styles/admin.css'],
    customJS: [
      '../js/admin.js',
      '../components/AdminComponents.js'
    ]
  },

  // 管理ログインページ
  'admin-login': {
    pageType: 'admin-login',
    currentPage: 'admin',
    metadata: {
      title: 'ログイン - RBS陸上教室 管理画面',
      description: 'RBS陸上教室の管理画面ログイン',
      keywords: 'RBS陸上教室, 管理画面, ログイン'
    },
    customCSS: ['../styles/admin-login.css'],
    customJS: ['../js/admin-login.js']
  }
};

/**
 * ページ設定を取得
 * @param {string} pageType - ページタイプ
 * @returns {Object} ページ設定
 */
function getPageConfig(pageType) {
  const config = PAGE_CONFIGS[pageType];
  if (!config) {
    console.warn(`ページ設定が見つかりません: ${pageType}`);
    return PAGE_CONFIGS.index; // デフォルトとしてindexページの設定を返す
  }
  return { ...config };
}

/**
 * 現在のページタイプを自動判定
 * @returns {string} ページタイプ
 */
function detectPageType() {
  const path = window.location.pathname;
  const filename = path.split('/').pop().replace('.html', '');
  
  // ファイル名からページタイプを判定
  if (filename === 'index' || filename === '' || path.endsWith('/')) {
    return 'index';
  }
  
  if (Object.keys(PAGE_CONFIGS).includes(filename)) {
    return filename;
  }
  
  // デフォルト
  return 'index';
}

/**
 * ページを自動初期化
 * HTMLの読み込み完了後に自動実行される
 */
async function autoInitializePage() {
  const pageType = detectPageType();
  const config = getPageConfig(pageType);
  
  const initializer = new PageInitializer();
  await initializer.init(config);
}

// DOMContentLoaded時に自動初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInitializePage);
} else {
  autoInitializePage();
}

// グローバルに公開
window.PAGE_CONFIGS = PAGE_CONFIGS;
window.getPageConfig = getPageConfig;
window.detectPageType = detectPageType;
window.autoInitializePage = autoInitializePage; 