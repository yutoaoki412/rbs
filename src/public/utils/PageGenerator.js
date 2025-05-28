/**
 * ページジェネレーター
 * 新しいページを簡単に作成するためのユーティリティ
 */
class PageGenerator {
  constructor() {
    this.templatePath = '../components/templates/page-template.html';
  }

  /**
   * 新しいページを生成
   * @param {Object} config - ページ設定
   * @returns {string} 生成されたHTMLコンテンツ
   */
  async generatePage(config) {
    const {
      pageType,
      pageTitle,
      pageDescription,
      customCSS = [],
      customJS = [],
      content = '',
      metadata = {}
    } = config;

    try {
      // テンプレートを読み込み
      const template = await this.loadTemplate();
      
      // プレースホルダーを置換
      let html = template
        .replace(/\{\{PAGE_TYPE\}\}/g, pageType)
        .replace(/\{\{PAGE_TITLE\}\}/g, pageTitle)
        .replace(/\{\{PAGE_DESCRIPTION\}\}/g, pageDescription);

      // カスタムCSSを追加
      if (customCSS.length > 0) {
        const cssLinks = customCSS.map(css => 
          `  <link rel="stylesheet" href="${css}">`
        ).join('\n');
        html = html.replace(
          '  <!-- ページ固有のCSSは動的に読み込まれます -->',
          cssLinks
        );
      }

      // カスタムJSを追加
      if (customJS.length > 0) {
        const jsScripts = customJS.map(js => 
          `  <script src="${js}"></script>`
        ).join('\n');
        html = html.replace(
          '  <!-- 必要に応じてここに追加 -->',
          jsScripts
        );
      }

      // コンテンツを追加
      if (content) {
        html = html.replace(
          '        <!-- コンテンツをここに追加 -->',
          content
        );
      }

      return html;

    } catch (error) {
      console.error('ページ生成エラー:', error);
      throw error;
    }
  }

  /**
   * テンプレートを読み込み
   */
  async loadTemplate() {
    const response = await fetch(this.templatePath);
    if (!response.ok) {
      throw new Error(`テンプレートの読み込みに失敗しました: ${response.status}`);
    }
    return await response.text();
  }

  /**
   * ページ設定をpage-configs.jsに追加
   * @param {string} pageType - ページタイプ
   * @param {Object} config - ページ設定
   */
  generatePageConfig(pageType, config) {
    const {
      pageTitle,
      pageDescription,
      keywords = '',
      customCSS = [],
      customJS = []
    } = config;

    return {
      pageType,
      currentPage: pageType,
      metadata: {
        title: pageTitle,
        description: pageDescription,
        keywords,
        ogp: {
          title: pageTitle,
          description: pageDescription,
          type: 'website',
          image: '../images/lp-logo.png'
        }
      },
      customCSS,
      customJS
    };
  }

  /**
   * 完全なページファイルを生成
   * @param {Object} config - ページ設定
   * @returns {Object} ファイル情報
   */
  async createPageFiles(config) {
    const {
      pageType,
      pageTitle,
      pageDescription,
      keywords = '',
      customCSS = [],
      customJS = [],
      content = ''
    } = config;

    // HTMLファイルを生成
    const html = await this.generatePage({
      pageType,
      pageTitle,
      pageDescription,
      customCSS,
      customJS,
      content
    });

    // ページ設定を生成
    const pageConfig = this.generatePageConfig(pageType, {
      pageTitle,
      pageDescription,
      keywords,
      customCSS,
      customJS
    });

    return {
      filename: `${pageType}.html`,
      html,
      config: pageConfig
    };
  }

  /**
   * 事前定義されたページタイプを取得
   */
  getPresetPageTypes() {
    return {
      'contact': {
        pageTitle: 'お問い合わせ',
        pageDescription: 'RBS陸上教室へのお問い合わせはこちらから',
        keywords: 'RBS陸上教室, お問い合わせ, 連絡先',
        customCSS: ['../styles/contact.css'],
        customJS: ['../js/contact-form.js']
      },
      'about-coach': {
        pageTitle: 'コーチ紹介',
        pageDescription: 'RBS陸上教室のコーチ陣をご紹介します',
        keywords: 'RBS陸上教室, コーチ, 指導者, プロフィール',
        customCSS: ['../styles/coach.css'],
        customJS: []
      },
      'trial-lesson': {
        pageTitle: '無料体験レッスン',
        pageDescription: 'RBS陸上教室の無料体験レッスンのお申し込み',
        keywords: 'RBS陸上教室, 無料体験, 体験レッスン, 申し込み',
        customCSS: ['../styles/trial.css'],
        customJS: ['../js/trial-form.js']
      },
      'gallery': {
        pageTitle: 'ギャラリー',
        pageDescription: 'RBS陸上教室の活動風景をご覧ください',
        keywords: 'RBS陸上教室, ギャラリー, 写真, 活動風景',
        customCSS: ['../styles/gallery.css'],
        customJS: ['../js/gallery.js']
      }
    };
  }

  /**
   * プリセットページを生成
   * @param {string} presetType - プリセットタイプ
   * @returns {Object} ファイル情報
   */
  async createPresetPage(presetType) {
    const presets = this.getPresetPageTypes();
    const preset = presets[presetType];
    
    if (!preset) {
      throw new Error(`プリセットタイプが見つかりません: ${presetType}`);
    }

    return await this.createPageFiles({
      pageType: presetType,
      ...preset
    });
  }
}

// 使用例を提供する関数
function generatePageExample() {
  const generator = new PageGenerator();
  
  // カスタムページの例
  const customPageExample = {
    pageType: 'custom-page',
    pageTitle: 'カスタムページ',
    pageDescription: 'これはカスタムページの例です',
    keywords: 'カスタム, ページ, 例',
    customCSS: ['../styles/custom.css'],
    customJS: ['../js/custom.js'],
    content: `
      <section class="custom-section">
        <h2>カスタムコンテンツ</h2>
        <p>ここにカスタムコンテンツを記述します。</p>
      </section>
    `
  };

  console.log('カスタムページ生成例:', customPageExample);
  
  // プリセットページの例
  console.log('利用可能なプリセット:', generator.getPresetPageTypes());
}

// グローバルに公開
window.PageGenerator = PageGenerator;
window.generatePageExample = generatePageExample; 