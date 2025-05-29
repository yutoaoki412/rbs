/**
 * ページジェネレーター v2.0
 * 新しいページを簡単に作成するためのユーティリティ
 * @pages機能対応版
 */
class PageGenerator {
  constructor() {
    this.templatePath = '../components/templates/page-template.html';
    this.outputPath = '../pages/';
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
      pageKeywords = '',
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
        .replace(/\{\{PAGE_DESCRIPTION\}\}/g, pageDescription)
        .replace(/\{\{PAGE_KEYWORDS\}\}/g, pageKeywords);

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
   * ページ設定を生成
   * @param {string} pageType - ページタイプ
   * @param {Object} config - ページ設定
   */
  generatePageConfig(pageType, config) {
    const {
      pageTitle,
      pageDescription,
      pageKeywords = '',
      customCSS = [],
      customJS = []
    } = config;

    return {
      pageType,
      currentPage: pageType,
      metadata: {
        title: pageTitle,
        description: pageDescription,
        keywords: pageKeywords,
        ogp: {
          title: pageTitle,
          description: pageDescription,
          type: 'website',
          image: '../assets/images/lp-logo.png'
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
      pageKeywords = '',
      customCSS = [],
      customJS = [],
      content = ''
    } = config;

    // HTMLファイルを生成
    const html = await this.generatePage({
      pageType,
      pageTitle,
      pageDescription,
      pageKeywords,
      customCSS,
      customJS,
      content
    });

    // ページ設定を生成
    const pageConfig = this.generatePageConfig(pageType, {
      pageTitle,
      pageDescription,
      pageKeywords,
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
   * 現在のシステムに必要なページタイプを取得
   * 既存のページを基に、実際に使用されているページのみ定義
   */
  getAvailablePageTypes() {
    return {
      'news-detail': {
        pageTitle: 'ニュース詳細',
        pageDescription: 'RBS陸上教室のニュースの詳細をご覧ください',
        pageKeywords: 'RBS陸上教室, ニュース, お知らせ, 詳細',
        customCSS: ['../css/news.css'],
        customJS: ['../js/modules/news/news-detail.js']
      }
    };
  }

  /**
   * ページ生成のためのヘルパー関数
   * @param {string} pageType - ページタイプ
   * @param {Object} customConfig - カスタム設定
   * @returns {Object} ファイル情報
   */
  async createPage(pageType, customConfig = {}) {
    const availableTypes = this.getAvailablePageTypes();
    const baseConfig = availableTypes[pageType];
    
    if (!baseConfig && !customConfig.pageTitle) {
      throw new Error(`ページタイプ '${pageType}' は定義されていません。カスタム設定を提供してください。`);
    }

    const finalConfig = {
      pageType,
      ...baseConfig,
      ...customConfig
    };

    return await this.createPageFiles(finalConfig);
  }

  /**
   * 既存ページのバックアップ
   * @param {string} filename - ファイル名
   */
  async backupExistingPage(filename) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${filename}.backup.${timestamp}`;
      console.log(`ページ ${filename} をバックアップ: ${backupName}`);
      // 実際のファイル操作はブラウザでは制限されるため、ログのみ
    } catch (error) {
      console.warn('バックアップ作成失敗:', error);
    }
  }

  /**
   * ページ生成のデバッグ情報
   */
  getDebugInfo() {
    return {
      templatePath: this.templatePath,
      outputPath: this.outputPath,
      availablePageTypes: Object.keys(this.getAvailablePageTypes()),
      version: '2.0'
    };
  }
}

// 使用例とデモ関数
function createPageExample() {
  const generator = new PageGenerator();
  
  // カスタムページの例
  const customPageExample = {
    pageType: 'example',
    pageTitle: 'サンプルページ',
    pageDescription: 'これはPageGeneratorで作成されたサンプルページです',
    pageKeywords: 'RBS陸上教室, サンプル, ページ生成',
    content: `
      <div class="example-content">
        <h2>ページ生成機能のデモ</h2>
        <p>このページはPageGeneratorを使用して自動生成されました。</p>
        <ul>
          <li>動的なタイトルとメタデータ</li>
          <li>カスタムコンテンツの挿入</li>
          <li>統一されたレイアウト</li>
        </ul>
      </div>
    `
  };

  console.log('カスタムページ生成例:', customPageExample);
  console.log('利用可能なページタイプ:', generator.getAvailablePageTypes());
  console.log('デバッグ情報:', generator.getDebugInfo());
}

// @pages機能の実際のテスト関数
async function testPagesFunction() {
  try {
    console.log('🧪 @pages機能テスト開始');
    
    // PageGeneratorのテスト
    const generator = new PageGenerator();
    
    // サンプルページを生成
    const samplePage = await generator.createPage('example', {
      pageTitle: '@pages機能テスト',
      pageDescription: '@pages機能が正常に動作することを確認するためのテストページです',
      pageKeywords: 'RBS陸上教室, @pages, テスト',
      content: `
        <div class="test-content">
          <h2>@pages機能テスト成功！</h2>
          <p>このページは@pages機能を使用して正常に生成されました。</p>
          <div class="test-results">
            <h3>テスト結果:</h3>
            <ul>
              <li>✅ ページテンプレート読み込み成功</li>
              <li>✅ プレースホルダー置換成功</li>
              <li>✅ コンテンツ挿入成功</li>
              <li>✅ HTML生成成功</li>
            </ul>
          </div>
          <p>生成時刻: ${new Date().toLocaleString('ja-JP')}</p>
        </div>
      `
    });
    
    console.log('✅ @pages機能テスト成功:', samplePage);
    
    // PagesManagerのテスト（利用可能な場合）
    if (window.pagesManager) {
      console.log('🧪 PagesManagerテスト開始');
      
      const testPageConfig = {
        id: 'test-page',
        title: 'PagesManagerテストページ',
        description: 'PagesManagerの動作をテストするためのページです',
        type: 'test',
        keywords: 'RBS陸上教室, PagesManager, テスト',
        content: `
          <div class="pages-manager-test">
            <h2>PagesManagerテスト成功！</h2>
            <p>PagesManagerを通じてページが正常に生成・管理されています。</p>
            <div class="manager-info">
              <h3>管理情報:</h3>
              <ul>
                <li>ページID: test-page</li>
                <li>ページタイプ: test</li>
                <li>生成時刻: ${new Date().toLocaleString('ja-JP')}</li>
              </ul>
            </div>
          </div>
        `
      };
      
      const managedPage = await window.pagesManager.createPage(testPageConfig);
      console.log('✅ PagesManagerテスト成功:', managedPage);
      
      // デバッグ情報を表示
      console.log('📊 PagesManagerデバッグ情報:', window.pagesManager.getDebugInfo());
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ @pages機能テスト失敗:', error);
    return false;
  }
}

// グローバルに公開
window.PageGenerator = PageGenerator;
window.createPageExample = createPageExample;
window.testPagesFunction = testPagesFunction; 