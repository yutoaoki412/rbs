/**
 * @pages機能管理クラス
 * ページの動的生成・管理・ルーティング機能を提供
 */
class PagesManager {
  constructor() {
    this.pageGenerator = null;
    this.router = null;
    this.pages = new Map();
    this.initialized = false;
  }

  /**
   * 初期化
   */
  async init() {
    try {
      // PageGeneratorを初期化
      const { default: PageGenerator } = await import('../../../utils/PageGenerator.js');
      this.pageGenerator = new PageGenerator();

      // 既存ページを登録
      this.registerExistingPages();

      this.initialized = true;
      console.log('✅ PagesManager初期化完了');
    } catch (error) {
      console.error('❌ PagesManager初期化失敗:', error);
      throw error;
    }
  }

  /**
   * 既存ページを登録
   */
  registerExistingPages() {
    const existingPages = [
      {
        id: 'index',
        title: 'ホーム',
        path: '/index.html',
        type: 'index',
        description: 'RBS陸上教室のホームページ'
      },
      {
        id: 'news',
        title: 'ニュース',
        path: '/news.html',
        type: 'news',
        description: 'RBS陸上教室のニュース一覧'
      },
      {
        id: 'news-detail',
        title: 'ニュース詳細',
        path: '/news-detail.html',
        type: 'news-detail',
        description: 'ニュースの詳細ページ'
      },
      {
        id: 'admin',
        title: '管理画面',
        path: '/admin.html',
        type: 'admin',
        description: 'RBS陸上教室管理画面'
      },
      {
        id: 'admin-login',
        title: '管理者ログイン',
        path: '/admin-login.html',
        type: 'admin-login',
        description: '管理者ログインページ'
      }
    ];

    existingPages.forEach(page => {
      this.pages.set(page.id, page);
    });

    console.log(`📄 ${existingPages.length}個の既存ページを登録しました`);
  }

  /**
   * 新しいページを作成
   * @param {Object} config - ページ設定
   * @returns {Promise<Object>} 作成されたページ情報
   */
  async createPage(config) {
    if (!this.initialized) {
      throw new Error('PagesManagerが初期化されていません');
    }

    const {
      id,
      title,
      description,
      type,
      content = '',
      customCSS = [],
      customJS = [],
      keywords = ''
    } = config;

    try {
      // ページを生成
      const pageData = await this.pageGenerator.createPageFiles({
        pageType: type,
        pageTitle: title,
        pageDescription: description,
        pageKeywords: keywords,
        customCSS,
        customJS,
        content
      });

      // ページ情報を登録
      const pageInfo = {
        id,
        title,
        path: `/${pageData.filename}`,
        type,
        description,
        content,
        html: pageData.html,
        config: pageData.config,
        created: new Date().toISOString()
      };

      this.pages.set(id, pageInfo);

      console.log(`✅ ページ '${id}' を作成しました`);
      return pageInfo;

    } catch (error) {
      console.error(`❌ ページ '${id}' の作成に失敗:`, error);
      throw error;
    }
  }

  /**
   * ページを取得
   * @param {string} id - ページID
   * @returns {Object|null} ページ情報
   */
  getPage(id) {
    return this.pages.get(id) || null;
  }

  /**
   * 全ページ一覧を取得
   * @returns {Array} ページ一覧
   */
  getAllPages() {
    return Array.from(this.pages.values());
  }

  /**
   * ページタイプ別にページを取得
   * @param {string} type - ページタイプ
   * @returns {Array} ページ一覧
   */
  getPagesByType(type) {
    return this.getAllPages().filter(page => page.type === type);
  }

  /**
   * ページを削除
   * @param {string} id - ページID
   */
  deletePage(id) {
    if (this.pages.has(id)) {
      this.pages.delete(id);
      console.log(`🗑️ ページ '${id}' を削除しました`);
      return true;
    }
    return false;
  }

  /**
   * ページを更新
   * @param {string} id - ページID
   * @param {Object} updates - 更新データ
   */
  async updatePage(id, updates) {
    const existingPage = this.getPage(id);
    if (!existingPage) {
      throw new Error(`ページ '${id}' が見つかりません`);
    }

    const updatedConfig = {
      ...existingPage,
      ...updates,
      id // IDは変更不可
    };

    // ページを再生成
    const newPageInfo = await this.createPage(updatedConfig);
    console.log(`🔄 ページ '${id}' を更新しました`);
    return newPageInfo;
  }

  /**
   * ページナビゲーション
   * @param {string} id - ページID
   */
  navigateToPage(id) {
    const page = this.getPage(id);
    if (page) {
      window.location.href = page.path;
    } else {
      console.warn(`ページ '${id}' が見つかりません`);
    }
  }

  /**
   * @pages機能のデバッグ情報
   */
  getDebugInfo() {
    return {
      initialized: this.initialized,
      pageCount: this.pages.size,
      pages: this.getAllPages().map(p => ({
        id: p.id,
        title: p.title,
        type: p.type,
        path: p.path
      })),
      generator: this.pageGenerator?.getDebugInfo()
    };
  }

  /**
   * サンプルページ作成のデモ
   */
  async createSamplePage() {
    const sampleConfig = {
      id: 'sample',
      title: 'サンプルページ',
      description: '@pages機能で作成されたサンプルページです',
      type: 'example',
      keywords: 'RBS陸上教室, サンプル, @pages',
      content: `
        <div class="sample-content">
          <h2>@pages機能のデモ</h2>
          <p>このページは@pages機能を使用して動的に生成されました。</p>
          <div class="features-list">
            <h3>機能一覧:</h3>
            <ul>
              <li>動的ページ生成</li>
              <li>統一されたテンプレート</li>
              <li>カスタムコンテンツ挿入</li>
              <li>SEO最適化</li>
              <li>レスポンシブデザイン</li>
            </ul>
          </div>
          <p>詳細は <a href="/index.html">ホームページ</a> をご覧ください。</p>
        </div>
      `
    };

    return await this.createPage(sampleConfig);
  }
}

// グローバルに公開
window.PagesManager = PagesManager;

export default PagesManager; 