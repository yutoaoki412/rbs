/**
 * シンプルで高速なテンプレートシステム
 * GitHub Pages / Cloudflare最適化
 * @version 3.0.0
 */

/**
 * テンプレート定数定義
 */
export const TEMPLATES = {
  /**
   * ヘッダーテンプレート
   */
  header: `<header class="header" data-template="header">
  <nav class="nav">
    <div class="logo">
      <a href="{{logoLink}}" id="logo-link" data-action="navigate-home">
        <img src="./assets/images/rds-logo.png" alt="RBS陸上教室 Running & Brain School" class="logo-image">
      </a>
    </div>
    <ul class="nav-links" id="nav-links">
      {{#isHomePage}}
      <li><a href="#news" data-section="news">NEWS</a></li>
      <li><a href="#about" data-section="about">RBS陸上教室とは</a></li>
      <li><a href="#program" data-section="program">プログラム</a></li>
      <li><a href="#location" data-section="location">教室情報</a></li>
      <li><a href="#price" data-section="price">料金</a></li>
      <li><a href="#faq" data-section="faq">よくある質問</a></li>
      {{/isHomePage}}
      {{#isNotHomePage}}
      <li><a href="./index.html" data-navigate="home">ホーム</a></li>
      <li><a href="{{newsLink}}" class="nav-link" data-page="news" data-section="news">NEWS</a></li>
      <li><a href="./index.html#about" data-navigate="home" data-section="about">RBS陸上教室とは</a></li>
      <li><a href="./index.html#program" data-navigate="home" data-section="program">プログラム</a></li>
      <li><a href="./index.html#location" data-navigate="home" data-section="location">教室情報</a></li>
      <li><a href="./index.html#price" data-navigate="home" data-section="price">料金</a></li>
      <li><a href="./index.html#faq" data-navigate="home" data-section="faq">よくある質問</a></li>
      {{/isNotHomePage}}
      <li><a href="https://vita-health.hacomono.jp/home" class="login-btn" target="_blank" rel="noopener noreferrer">会員ログイン</a></li>
    </ul>
    <button class="mobile-menu-btn" aria-expanded="false" aria-controls="nav-links" data-action="toggle-mobile-menu" aria-label="メニューを開く">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>
  </nav>
</header>`,

  /**
   * フッターテンプレート
   */
  footer: `<footer class="footer" data-template="footer">
  <div class="container">
    <div class="footer-content">
      <div class="footer-links">
        {{#isHomePage}}
        <a href="#news" data-section="news">ニュース</a>
        <a href="#about" data-section="about">RBS陸上教室とは</a>
        <a href="#program" data-section="program">プログラム</a>
        <a href="#location" data-section="location">教室情報</a>
        <a href="#price" data-section="price">料金</a>
        {{/isHomePage}}
        {{#isNotHomePage}}
        <a href="./index.html" data-navigate="home">ホーム</a>
        <a href="{{newsLink}}" data-page="news">ニュース</a>
        <a href="./index.html#about" data-navigate="home" data-section="about">RBS陸上教室とは</a>
        <a href="./index.html#program" data-navigate="home" data-section="program">プログラム</a>
        <a href="./index.html#location" data-navigate="home" data-section="location">教室情報</a>
        <a href="./index.html#price" data-navigate="home" data-section="price">料金</a>
        {{/isNotHomePage}}
      </div>
      <div class="footer-info">
        <p class="company-info">
          <strong>合同会社VITA</strong>
          〒356-0051 埼玉県ふじみ野市駒西1-9-18
        </p>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="copyright">&copy; <span class="copyright-year">{{currentYear}}</span> RBS陸上教室. All rights reserved.</p>
    </div>
  </div>
</footer>`
};

/**
 * ページ設定定数
 */
export const PAGE_CONFIGS = {
  home: {
    title: 'RBS陸上教室 - すべての走ることを愛する子どもたちのための陸上教室',
    description: 'RBS陸上教室は、すべての走ることを愛する子どもたちのための陸上教室です。楽しく走りながら、心と体を育てます。',
    keywords: '陸上,教室,RBS,スポーツ,子ども,ランニング,埼玉,ふじみ野',
    bodyClass: 'page-home',
    mainClass: 'home-content',
    isHomePage: true,
    isNotHomePage: false,
    logoLink: '#top',
    newsLink: './news.html'
  },
  
  news: {
    title: 'ニュース - RBS陸上教室',
    description: 'RBS陸上教室の最新ニュースやお知らせをご覧いただけます。',
    keywords: 'ニュース,お知らせ,RBS陸上教室,最新情報',
    bodyClass: 'page-news',
    mainClass: 'news-content',
    isHomePage: false,
    isNotHomePage: true,
    logoLink: './index.html',
    newsLink: './news.html'
  },
  
  'news-detail': {
    title: 'ニュース詳細 - RBS陸上教室',
    description: 'RBS陸上教室のニュース詳細ページです。',
    keywords: 'ニュース,詳細,RBS陸上教室',
    bodyClass: 'page-news-detail',
    mainClass: 'news-detail-content',
    isHomePage: false,
    isNotHomePage: true,
    logoLink: './index.html',
    newsLink: './news.html'
  },
  
  admin: {
    title: '管理画面 - RBS陸上教室',
    description: 'RBS陸上教室の管理画面です。',
    keywords: '管理画面,RBS陸上教室,admin',
    bodyClass: 'page-admin',
    mainClass: 'admin-content',
    isHomePage: false,
    isNotHomePage: true,
    logoLink: './index.html',
    newsLink: './news.html',
    robots: 'noindex,nofollow'
  },
  
  'admin-login': {
    title: 'ログイン - RBS陸上教室',
    description: 'RBS陸上教室の管理画面ログインページです。',
    keywords: 'ログイン,管理画面,RBS陸上教室',
    bodyClass: 'page-admin-login',
    mainClass: 'admin-login-content',
    isHomePage: false,
    isNotHomePage: true,
    logoLink: './index.html',
    newsLink: './news.html',
    robots: 'noindex,nofollow'
  }
};

/**
 * シンプルなテンプレート変数置換
 * @param {string} template - テンプレート文字列
 * @param {Object} variables - 変数オブジェクト
 * @returns {string} 処理済みテンプレート
 */
export function renderTemplate(template, variables = {}) {
  let result = template;
  
  // 現在年を自動設定
  const currentYear = new Date().getFullYear();
  const allVariables = { currentYear, ...variables };
  
  // 単純な変数置換 {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return allVariables[key] !== undefined ? String(allVariables[key]) : match;
  });
  
  // 条件分岐処理 {{#condition}} ... {{/condition}}
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, condition, content) => {
    return allVariables[condition] ? content : '';
  });
  
  return result;
}

/**
 * ページタイプを自動検出
 * @returns {string} ページタイプ
 */
export function detectPageType() {
  const pathname = window.location.pathname;
  const filename = pathname.split('/').pop() || 'index.html';
  
  if (filename === 'index.html' || filename === '') return 'home';
  if (filename === 'news.html') return 'news';
  if (filename === 'news-detail.html') return 'news-detail';
  if (filename === 'admin.html') return 'admin';
  if (filename === 'admin-login.html') return 'admin-login';
  
  return 'home'; // デフォルト
} 