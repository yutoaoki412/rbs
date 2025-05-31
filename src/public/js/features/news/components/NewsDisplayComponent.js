/**
 * 統合ニュース表示コンポーネント
 * すべてのページで統一されたニュース表示機能を提供
 * @version 3.0.0 - 統合記事管理システム対応
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { getNewsDataService } from '../services/NewsDataService.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class NewsDisplayComponent {
  constructor() {
    this.initialized = false;
    this.componentName = 'NewsDisplayComponent';
    
    /** @type {NewsDataService} */
    this.newsDataService = null;
    
    // 現在のページタイプ
    this.pageType = this.determinePageType();
    
    // 表示設定
    this.displaySettings = {
      'home': { limit: 5, showCategory: true, showDate: true, showSummary: true },
      'news-list': { limit: 0, showCategory: true, showDate: true, showSummary: true },
      'news-detail': { showRelated: true, relatedLimit: 3 }
    };
    
    // DOM要素参照
    this.elements = {};
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      this.log('既に初期化済み');
      return;
    }

    try {
      this.log(`統合ニュース表示コンポーネント初期化開始 (${this.pageType})`);
      
      // ニュースデータサービス初期化
      this.newsDataService = getNewsDataService();
      await this.newsDataService.init();
      
      // DOM要素の取得
      this.findDOMElements();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // 初期表示
      await this.render();
      
      this.initialized = true;
      this.log('統合ニュース表示コンポーネント初期化完了');
      
    } catch (error) {
      this.error('初期化エラー:', error);
      this.showErrorState();
    }
  }

  /**
   * ページタイプを判定
   * @returns {string}
   */
  determinePageType() {
    const pathname = window.location.pathname;
    
    if (pathname.includes('news-detail')) {
      return 'news-detail';
    } else if (pathname.includes('news.html')) {
      return 'news-list';
    } else if (pathname.includes('index.html') || pathname === '/' || pathname.endsWith('/')) {
      return 'home';
    }
    
    return 'unknown';
  }

  /**
   * DOM要素を取得
   * @private
   */
  findDOMElements() {
    this.elements = {
      // 共通要素
      newsContainer: document.getElementById('news-list'),
      loadingStatus: document.getElementById('news-loading-status'),
      statusText: document.getElementById('news-status-text'),
      
      // ホームページ用
      newsSection: document.getElementById('news'),
      adminLink: document.getElementById('news-admin-link'),
      
      // ニュース一覧ページ用
      newsGrid: document.getElementById('news-grid'),
      searchResults: document.getElementById('search-results'),
      searchCount: document.getElementById('search-count'),
      adminLinkNews: document.getElementById('admin-link'),
      
      // ニュース詳細ページ用
      articleHeader: document.getElementById('article-header'),
      articleTitle: document.getElementById('article-title'),
      articleDate: document.getElementById('article-date'),
      articleCategory: document.getElementById('article-category'),
      articleContent: document.getElementById('article-content'),
      shareSection: document.getElementById('share-section'),
      relatedArticles: document.getElementById('related-articles'),
      relatedContainer: document.getElementById('related-articles-container'),
      breadcrumbTitle: document.getElementById('breadcrumb-title'),
      adminControls: document.getElementById('admin-controls')
    };
    
    this.debug('DOM要素取得完了:', Object.keys(this.elements).filter(key => this.elements[key]));
  }

  /**
   * イベントリスナー設定
   * @private
   */
  setupEventListeners() {
    // ニュースデータの更新イベント
    EventBus.on('news:dataRefreshed', this.handleDataRefreshed.bind(this));
    EventBus.on('news:articleUpdated', this.handleArticleUpdated.bind(this));
    EventBus.on('news:articleDeleted', this.handleArticleDeleted.bind(this));
    
    // カテゴリーフィルター（ニュース一覧ページ）
    if (this.pageType === 'news-list') {
      this.setupCategoryFilters();
    }
    
    // 開発環境での管理画面リンク表示
    if (CONFIG.debug.enabled) {
      this.showAdminLinks();
    }
  }

  /**
   * メイン描画処理
   * @returns {Promise<void>}
   */
  async render() {
    try {
      this.showLoadingState();
      
      switch (this.pageType) {
        case 'home':
          await this.renderHomeNews();
          break;
        case 'news-list':
          await this.renderNewsList();
          break;
        case 'news-detail':
          await this.renderNewsDetail();
          break;
        default:
          this.warn('未対応のページタイプ:', this.pageType);
          break;
      }
      
      this.hideLoadingState();
      
    } catch (error) {
      this.error('描画エラー:', error);
      this.showErrorState();
    }
  }

  /**
   * ホームページのニュース表示
   * @private
   */
  async renderHomeNews() {
    const articles = this.newsDataService.getRecentArticles(this.displaySettings.home.limit);
    
    if (!this.elements.newsContainer) {
      this.warn('ニュースコンテナが見つかりません');
      return;
    }
    
    if (articles.length === 0) {
      this.elements.newsContainer.innerHTML = `
        <div class="no-news">
          <i class="fas fa-newspaper"></i>
          <p>まだニュースがありません</p>
        </div>
      `;
      return;
    }
    
    // ニュース記事を生成
    const newsHTML = articles.map(article => this.createArticleCard(article, 'home')).join('');
    this.elements.newsContainer.innerHTML = newsHTML;
    
    // 管理画面デバッグ情報
    this.updateStatusText(`${articles.length}件のニュースを表示中`);
    
    this.log(`ホームページニュース表示完了: ${articles.length}件`);
  }

  /**
   * ニュース一覧ページの表示
   * @private
   */
  async renderNewsList() {
    // URLパラメータからカテゴリーを取得
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category') || 'all';
    
    // カテゴリーフィルターのアクティブ状態を更新
    this.updateCategoryFilter(category);
    
    // 記事を取得
    const articles = this.newsDataService.getAllArticles({ category });
    
    if (!this.elements.newsGrid) {
      this.warn('ニュースグリッドが見つかりません');
      return;
    }
    
    if (articles.length === 0) {
      this.elements.newsGrid.innerHTML = `
        <div class="no-news">
          <i class="fas fa-newspaper"></i>
          <p>該当するニュースがありません</p>
        </div>
      `;
      return;
    }
    
    // ニュース記事を生成
    const newsHTML = articles.map(article => this.createArticleCard(article, 'list')).join('');
    this.elements.newsGrid.innerHTML = newsHTML;
    
    // 検索結果表示
    if (this.elements.searchResults && this.elements.searchCount) {
      this.elements.searchCount.textContent = articles.length;
      this.elements.searchResults.style.display = 'block';
    }
    
    this.log(`ニュース一覧表示完了: ${articles.length}件 (${category})`);
  }

  /**
   * ニュース詳細ページの表示
   * @private
   */
  async renderNewsDetail() {
    // URLパラメータから記事IDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
      this.showErrorState('記事IDが指定されていません');
      return;
    }
    
    // 記事データを取得
    const article = this.newsDataService.getArticleById(articleId);
    if (!article) {
      this.showErrorState('記事が見つかりません');
      return;
    }
    
    // 記事内容を表示
    this.displayArticleDetail(article);
    
    // 関連記事を表示
    await this.displayRelatedArticles(articleId);
    
    // シェアボタンを表示
    this.showShareSection();
    
    this.log(`ニュース詳細表示完了: ${article.title}`);
  }

  /**
   * 記事詳細を表示
   * @private
   * @param {Object} article - 記事データ
   */
  displayArticleDetail(article) {
    // タイトル
    if (this.elements.articleTitle) {
      this.elements.articleTitle.textContent = article.title;
    }
    if (this.elements.breadcrumbTitle) {
      this.elements.breadcrumbTitle.textContent = article.title;
    }
    
    // 日付
    if (this.elements.articleDate) {
      this.elements.articleDate.textContent = this.formatDate(article.date || article.publishedAt);
    }
    
    // カテゴリー
    if (this.elements.articleCategory) {
      const categoryInfo = this.newsDataService.getCategoryInfo(article.category);
      this.elements.articleCategory.textContent = categoryInfo?.name || article.category;
      this.elements.articleCategory.style.color = categoryInfo?.color || '#666';
    }
    
    // 本文
    if (this.elements.articleContent) {
      const content = this.newsDataService.getArticleContent(article.id);
      this.elements.articleContent.innerHTML = this.formatArticleContent(content);
    }
    
    // メタデータの設定
    this.updatePageMetadata(article);
  }

  /**
   * 関連記事を表示
   * @private
   * @param {string} currentArticleId - 現在の記事ID
   */
  async displayRelatedArticles(currentArticleId) {
    const relatedArticles = this.newsDataService.getRelatedArticles(
      currentArticleId, 
      this.displaySettings['news-detail'].relatedLimit
    );
    
    if (relatedArticles.length === 0 || !this.elements.relatedContainer) {
      return;
    }
    
    const relatedHTML = relatedArticles.map(article => 
      this.createArticleCard(article, 'related')
    ).join('');
    
    this.elements.relatedContainer.innerHTML = relatedHTML;
    
    if (this.elements.relatedArticles) {
      this.elements.relatedArticles.style.display = 'block';
    }
  }

  /**
   * 記事カードを生成
   * @private
   * @param {Object} article - 記事データ
   * @param {string} context - 表示コンテキスト
   * @returns {string} HTMLステリング
   */
  createArticleCard(article, context = 'default') {
    const settings = this.displaySettings[this.pageType] || {};
    const categoryInfo = this.newsDataService.getCategoryInfo(article.category);
    const date = this.formatDate(article.date || article.publishedAt);
    
    const cardClass = context === 'related' ? 'news-card-small' : 'news-card';
    const linkUrl = `news-detail.html?id=${article.id}`;
    
    return `
      <article class="${cardClass}">
        <a href="${linkUrl}" class="news-link">
          ${settings.showCategory || context === 'list' ? `
            <div class="news-category" style="background-color: ${categoryInfo?.color || '#666'}">
              ${categoryInfo?.name || article.category}
            </div>
          ` : ''}
          
          <div class="news-content">
            <h3 class="news-title">${this.escapeHtml(article.title)}</h3>
            
            ${settings.showDate ? `
              <time class="news-date">${date}</time>
            ` : ''}
            
            ${settings.showSummary && article.summary ? `
              <p class="news-summary">${this.escapeHtml(article.summary)}</p>
            ` : ''}
            
            ${article.featured ? '<span class="news-featured">注目</span>' : ''}
          </div>
        </a>
      </article>
    `;
  }

  /**
   * カテゴリーフィルターを設定
   * @private
   */
  setupCategoryFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn[data-category]');
    
    filterButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const category = button.getAttribute('data-category');
        this.filterByCategory(category);
      });
    });
  }

  /**
   * カテゴリーでフィルター
   * @private
   * @param {string} category - カテゴリー
   */
  async filterByCategory(category) {
    // URLを更新
    const url = new URL(window.location);
    if (category === 'all') {
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('category', category);
    }
    window.history.pushState({}, '', url);
    
    // 表示を更新
    await this.renderNewsList();
  }

  /**
   * カテゴリーフィルターのアクティブ状態を更新
   * @private
   * @param {string} activeCategory - アクティブカテゴリー
   */
  updateCategoryFilter(activeCategory) {
    const filterButtons = document.querySelectorAll('.filter-btn[data-category]');
    
    filterButtons.forEach(button => {
      const category = button.getAttribute('data-category');
      if (category === activeCategory) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * 管理画面リンクを表示
   * @private
   */
  showAdminLinks() {
    const adminLinks = [this.elements.adminLink, this.elements.adminLinkNews, this.elements.adminControls];
    
    adminLinks.forEach(link => {
      if (link) {
        link.style.display = 'block';
      }
    });
  }

  /**
   * シェアセクションを表示
   * @private
   */
  showShareSection() {
    if (this.elements.shareSection) {
      this.elements.shareSection.style.display = 'block';
    }
  }

  /**
   * ローディング状態を表示
   * @private
   */
  showLoadingState() {
    if (this.elements.loadingStatus) {
      this.elements.loadingStatus.style.display = 'block';
    }
    this.updateStatusText('ニュースを読み込み中...');
  }

  /**
   * ローディング状態を非表示
   * @private
   */
  hideLoadingState() {
    if (this.elements.loadingStatus) {
      this.elements.loadingStatus.style.display = 'none';
    }
  }

  /**
   * エラー状態を表示
   * @private
   * @param {string} message - エラーメッセージ
   */
  showErrorState(message = 'ニュースの読み込みに失敗しました') {
    this.hideLoadingState();
    
    const errorHTML = `
      <div class="news-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${this.escapeHtml(message)}</p>
        <button class="btn btn-outline" onclick="location.reload()">
          再読み込み
        </button>
      </div>
    `;
    
    const container = this.elements.newsContainer || this.elements.newsGrid || this.elements.articleContent;
    if (container) {
      container.innerHTML = errorHTML;
    }
  }

  /**
   * ステータステキストを更新
   * @private
   * @param {string} text - ステータステキスト
   */
  updateStatusText(text) {
    if (this.elements.statusText) {
      this.elements.statusText.textContent = text;
    }
  }

  /**
   * ページメタデータを更新
   * @private
   * @param {Object} article - 記事データ
   */
  updatePageMetadata(article) {
    // タイトル
    document.title = `${article.title} - RBS陸上教室`;
    
    // メタ説明
    if (article.summary) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = article.summary;
    }
  }

  /**
   * 記事本文をフォーマット
   * @private
   * @param {string} content - 記事本文
   * @returns {string} フォーマット済み本文
   */
  formatArticleContent(content) {
    if (!content) return '<p>記事の内容がありません。</p>';
    
    // 簡単なMarkdown風フォーマット
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('');
  }

  /**
   * 日付をフォーマット
   * @private
   * @param {string} dateString - 日付文字列
   * @returns {string} フォーマット済み日付
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * HTMLエスケープ
   * @private
   * @param {string} text - テキスト
   * @returns {string} エスケープ済みテキスト
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * データリフレッシュイベントハンドラー
   * @private
   */
  async handleDataRefreshed() {
    this.debug('データリフレッシュイベント受信');
    await this.render();
  }

  /**
   * 記事更新イベントハンドラー
   * @private
   */
  async handleArticleUpdated(event) {
    this.debug('記事更新イベント受信:', event.detail);
    await this.render();
  }

  /**
   * 記事削除イベントハンドラー
   * @private
   */
  async handleArticleDeleted(event) {
    this.debug('記事削除イベント受信:', event.detail);
    await this.render();
  }

  /**
   * データをリフレッシュ
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      if (this.newsDataService) {
        await this.newsDataService.refresh();
        await this.render();
      }
    } catch (error) {
      this.error('リフレッシュエラー:', error);
    }
  }

  /**
   * コンポーネント破棄
   */
  async destroy() {
    if (!this.initialized) return;
    
    // イベントリスナー解除
    EventBus.off('news:dataRefreshed', this.handleDataRefreshed);
    EventBus.off('news:articleUpdated', this.handleArticleUpdated);
    EventBus.off('news:articleDeleted', this.handleArticleDeleted);
    
    // データクリア
    this.elements = {};
    
    this.initialized = false;
    this.log('統合ニュース表示コンポーネント破棄完了');
  }

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    if (CONFIG.debug.enabled) {
      console.log(`[${this.componentName}]`, ...args);
    }
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug.enabled && CONFIG.debug.verbose) {
      console.log(`[${this.componentName}:DEBUG]`, ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn(`[${this.componentName}:WARN]`, ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error(`[${this.componentName}:ERROR]`, ...args);
  }
}

// シングルトンインスタンス
let newsDisplayComponentInstance = null;

/**
 * NewsDisplayComponentのシングルトンインスタンスを取得
 * @returns {NewsDisplayComponent}
 */
export function getNewsDisplayComponent() {
  if (!newsDisplayComponentInstance) {
    newsDisplayComponentInstance = new NewsDisplayComponent();
  }
  return newsDisplayComponentInstance;
}

export default NewsDisplayComponent; 