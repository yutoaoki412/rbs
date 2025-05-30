/**
 * ニュース表示コンポーネント
 * LP側での記事表示を担当
 * ArticleStorageServiceと統合してデータを取得・表示
 * @version 3.1.0 - 新アーキテクチャ対応
 */

import { Component } from '../../base/Component.js';
import { EventBus } from '../../services/EventBus.js';
import { getArticleStorageService } from '../../services/ArticleStorageService.js';
import { escapeHtml } from '../../utils/stringUtils.js';
import { CONFIG } from '../../constants/config.js';

export class NewsDisplayComponent extends Component {
  constructor(container) {
    super({ autoInit: false });
    
    this.componentName = 'NewsDisplayComponent';
    
    // コンテナ要素を設定
    this.container = container;
    this.element = container;
    
    // デバッグモードを設定から取得
    this.debugMode = CONFIG.debug.enabled;
    
    /** @type {ArticleStorageService} 記事ストレージサービス */
    this.articleStorage = null;
    
    /** @type {Array} 表示記事一覧 */
    this.displayedArticles = [];
    
    /** @type {string} 現在のカテゴリーフィルター */
    this.currentCategory = 'all';
    
    /** @type {number} 最大表示記事数 */
    this.maxDisplayArticles = 6;
    
    /** @type {boolean} ローディング状態 */
    this.isLoading = false;
    
    /** @type {HTMLElement} 記事リストコンテナ */
    this.newsListContainer = null;
    
    /** @type {HTMLElement} ローディング表示 */
    this.loadingElement = null;
    
    /** @type {HTMLElement} ステータス表示 */
    this.statusElement = null;
    
    // 設定
    this.config = {
      animationDelay: 100, // 記事表示のアニメーション間隔
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  /**
   * コンポーネント初期化
   * @returns {Promise<void>}
   */
  async init() {
    try {
      await super.init();
      
      this.log('ニュース表示コンポーネント初期化開始');
      
      // ArticleStorageServiceの取得と初期化
      await this.initializeArticleStorage();
      
      // DOM要素の取得
      this.findElements();
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      // 開発環境での管理画面リンク表示
      this.setupAdminLinks();
      
      // 初期記事の表示
      await this.displayArticles();
      
      this.log('ニュース表示コンポーネント初期化完了');
      
    } catch (error) {
      this.error('ニュース表示コンポーネント初期化エラー:', error);
      this.showErrorMessage('記事の読み込みに失敗しました');
      throw error;
    }
  }

  /**
   * ArticleStorageServiceの初期化
   * @private
   */
  async initializeArticleStorage() {
    try {
      this.debug('ArticleStorageServiceを初期化中...');
      
      this.articleStorage = getArticleStorageService();
      
      if (!this.articleStorage.initialized) {
        await this.articleStorage.init();
      }
      
      this.debug('ArticleStorageService初期化完了');
      
    } catch (error) {
      this.error('ArticleStorageService初期化エラー:', error);
      throw new Error('記事データサービスの初期化に失敗しました');
    }
  }

  /**
   * DOM要素の検索
   */
  findElements() {
    // 記事リストコンテナ
    this.newsListContainer = this.container.querySelector('.news-list') || 
                            this.container.querySelector('#news-list') || 
                            this.container;
    
    // ローディング要素（正しいセレクターを使用）
    this.loadingElement = this.container.querySelector('.news-loading-status') ||
                         this.container.querySelector('#news-loading-status') ||
                         this.container.querySelector('.loading');
    
    // ステータステキスト要素
    this.statusElement = this.container.querySelector('#news-status-text') ||
                        this.container.querySelector('.status-text') ||
                        this.container.querySelector('.status');
    
    this.debug('DOM要素検索結果:', {
      newsListContainer: !!this.newsListContainer,
      loadingElement: !!this.loadingElement,
      statusElement: !!this.statusElement
    });
  }

  /**
   * 安全なクエリセレクター
   * @param {string} selector - セレクター
   * @param {Element} context - コンテキスト要素
   * @returns {Element|null} 見つかった要素
   */
  safeQuerySelector(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      this.error('セレクター実行エラー:', selector, error);
      return null;
    }
  }
  
  /**
   * 子要素にイベントリスナーを追加
   * @param {Element} element - 要素
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー
   * @param {Object} options - オプション
   */
  addEventListenerToChild(element, event, handler, options = {}) {
    this.addEventListener(element, event, handler, options);
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    try {
      // ArticleStorageServiceのイベント監視
      EventBus.on('articleStorage:initialized', this.handleStorageInitialized.bind(this));
      EventBus.on('articleStorage:articleSaved', this.handleArticleSaved.bind(this));
      EventBus.on('articleStorage:articleDeleted', this.handleArticleDeleted.bind(this));
      EventBus.on('articleStorage:dataChanged', this.handleDataChanged.bind(this));
      EventBus.on('articleStorage:refreshed', this.handleDataRefreshed.bind(this));
      
      // デバッグボタンのイベント
      const debugButton = this.safeQuerySelector('[data-action="show-news-debug"]');
      if (debugButton) {
        this.addEventListenerToChild(debugButton, 'click', this.showDebugInfo.bind(this));
      }
      
      this.debug('イベントリスナー設定完了');
      
    } catch (error) {
      this.error('イベントリスナー設定エラー:', error);
    }
  }

  /**
   * 記事の表示
   * @param {Object} options - 表示オプション
   * @returns {Promise<void>}
   */
  async displayArticles(options = {}) {
    if (this.isLoading) {
      this.debug('記事表示処理が既に実行中です');
      return;
    }
    
    try {
      this.isLoading = true;
      this.debug('記事表示処理開始', options);
      this.showLoadingMessage('記事を読み込み中...');
      
      // ArticleStorageServiceの初期化確認
      if (!this.articleStorage || !this.articleStorage.initialized) {
        this.debug('ArticleStorageServiceが初期化されていません');
        this.showErrorMessage('記事データサービスが初期化されていません');
        return;
      }
      
      // ArticleStorageServiceから公開記事を取得
      const articles = this.articleStorage.getPublishedArticles({
        category: this.currentCategory,
        limit: this.maxDisplayArticles,
        ...options
      });
      
      this.debug(`記事取得完了: ${articles.length}件`, articles);
      
      // 記事が存在しない場合
      if (articles.length === 0) {
        this.debug('表示する記事がありません');
        this.showEmptyMessage();
        return;
      }
      
      // 記事リストの生成と表示
      this.debug('記事リストのレンダリング開始');
      await this.renderArticleList(articles);
      
      this.displayedArticles = articles;
      this.hideLoadingMessage();
      
      // 表示完了イベント
      EventBus.emit('newsDisplay:articlesDisplayed', {
        count: articles.length,
        category: this.currentCategory
      });
      
      this.log(`記事表示完了: ${articles.length}件`);
      
    } catch (error) {
      this.error('記事表示エラー:', error);
      this.showErrorMessage('記事の表示に失敗しました');
    } finally {
      this.isLoading = false;
      this.debug('記事表示処理終了');
    }
  }

  /**
   * 記事リストのレンダリング
   * @private
   * @param {Array} articles - 記事一覧
   * @returns {Promise<void>}
   */
  async renderArticleList(articles) {
    if (!this.newsListContainer) {
      this.warn('記事リストコンテナが見つかりません');
      return;
    }
    
    this.debug(`記事リストをレンダリング: ${articles.length}件`);
    
    // 既存の記事をクリア
    this.newsListContainer.innerHTML = '';
    
    // 記事カードを生成
    articles.forEach((article, index) => {
      const articleCard = this.createArticleCard(article);
      this.newsListContainer.appendChild(articleCard);
      
      // アニメーション効果
      setTimeout(() => {
        articleCard.classList.add('fade-in');
      }, index * this.config.animationDelay);
    });
    
    this.debug('記事リストのレンダリング完了');
    
    // 記事リストが確実に表示されるようにする
    if (this.newsListContainer.style.display === 'none') {
      this.newsListContainer.style.display = '';
    }
  }

  /**
   * 記事カードの作成
   * @private
   * @param {Object} article - 記事データ
   * @returns {HTMLElement} 記事カード要素
   */
  createArticleCard(article) {
    const card = document.createElement('article');
    card.className = 'news-item';
    card.setAttribute('data-category', article.category);
    card.setAttribute('data-article-id', article.id);
    
    card.innerHTML = `
      <div class="news-date">${escapeHtml(article.formattedDate)}</div>
      <div class="news-category ${article.category}">${escapeHtml(article.categoryName)}</div>
      <h3 class="news-title">
        <a href="news-detail.html?id=${article.id}">${escapeHtml(article.title)}</a>
      </h3>
      ${article.excerpt ? `<p class="news-excerpt">${escapeHtml(article.excerpt)}</p>` : ''}
    `;
    
    // ホバー効果のためのCSSクラス追加
    card.addEventListener('mouseenter', () => {
      card.classList.add('hover');
    });
    
    card.addEventListener('mouseleave', () => {
      card.classList.remove('hover');
    });
    
    return card;
  }

  /**
   * ローディングメッセージの表示
   * @private
   * @param {string} message - メッセージ
   */
  showLoadingMessage(message = '読み込み中...') {
    this.debug('ローディングメッセージ表示:', message);
    
    // ローディング要素の表示
    if (this.loadingElement) {
      this.loadingElement.style.display = 'block';
      this.debug('ローディング要素を表示');
    }
    
    // ステータステキストの更新
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.debug('ステータステキストを更新:', message);
    }
    
    // 記事リストの非表示
    if (this.newsListContainer && this.newsListContainer !== this.container) {
      this.newsListContainer.style.display = 'none';
      this.debug('記事リストを非表示');
    }
  }

  /**
   * ローディングメッセージの非表示
   * @private
   */
  hideLoadingMessage() {
    this.debug('ローディングメッセージ非表示');
    
    // ローディング要素の非表示
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
      this.debug('ローディング要素を非表示');
    }
    
    // 記事リストの表示
    if (this.newsListContainer && this.newsListContainer !== this.container) {
      this.newsListContainer.style.display = '';
      this.debug('記事リストを表示');
    }
  }

  /**
   * 空メッセージの表示
   * @private
   */
  showEmptyMessage() {
    this.debug('空メッセージを表示');
    this.hideLoadingMessage();
    
    if (!this.newsListContainer) {
      this.warn('記事リストコンテナが見つかりません');
      return;
    }
    
    const message = this.currentCategory === 'all' 
      ? '記事がまだありません。管理画面で記事を作成してください。'
      : '該当するカテゴリーの記事が見つかりませんでした。';
    
    this.newsListContainer.innerHTML = `
      <div class="empty-message" style="text-align: center; padding: 60px 20px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
        <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 15px; color: #333;">記事がありません</h3>
        <p style="font-size: 16px; margin-bottom: 25px; line-height: 1.6;">${message}</p>
        <a href="admin.html" class="btn btn-primary" style="display: inline-block; padding: 12px 24px; background: var(--primary-blue); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease;">管理画面で記事を作成</a>
      </div>
    `;
    
    // 記事リストコンテナを確実に表示状態にする
    this.newsListContainer.style.display = '';
  }

  /**
   * エラーメッセージの表示
   * @private
   * @param {string} message - エラーメッセージ
   */
  showErrorMessage(message = 'エラーが発生しました') {
    this.debug('エラーメッセージを表示:', message);
    this.hideLoadingMessage();
    
    if (!this.newsListContainer) {
      this.warn('記事リストコンテナが見つかりません');
      return;
    }
    
    this.newsListContainer.innerHTML = `
      <div class="error-message" style="text-align: center; padding: 60px 20px; color: #e53e3e;">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 15px;">エラー</h3>
        <p style="font-size: 16px; margin-bottom: 25px; line-height: 1.6;">${escapeHtml(message)}</p>
        <button class="btn btn-primary" onclick="location.reload()" style="display: inline-block; padding: 12px 24px; background: #4299e1; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">ページを再読み込み</button>
      </div>
    `;
    
    // 記事リストコンテナを確実に表示状態にする
    this.newsListContainer.style.display = '';
  }

  /**
   * カテゴリーフィルターの設定
   * @param {string} category - カテゴリー
   * @returns {Promise<void>}
   */
  async setCategory(category = 'all') {
    if (this.currentCategory === category) {
      this.debug(`カテゴリーは既に ${category} に設定されています`);
      return;
    }
    
    this.currentCategory = category;
    this.debug(`カテゴリーを ${category} に変更`);
    
    await this.displayArticles();
  }

  /**
   * 記事データの更新
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      this.debug('記事データを更新中...');
      
      if (this.articleStorage) {
        await this.articleStorage.refresh();
      }
      
      await this.displayArticles();
      
      this.debug('記事データ更新完了');
      
    } catch (error) {
      this.error('記事データ更新エラー:', error);
      this.showErrorMessage('記事の更新に失敗しました');
    }
  }

  /**
   * デバッグ情報の表示
   * @private
   */
  showDebugInfo() {
    if (!this.debugMode) return;
    
    const status = this.articleStorage.getStatus();
    const debugInfo = {
      component: this.getStatus(),
      storage: status,
      displayed: this.displayedArticles.length,
      category: this.currentCategory
    };
    
    console.group('📰 NewsDisplayComponent Debug Info');
    console.log('Component Status:', debugInfo.component);
    console.log('Storage Status:', debugInfo.storage);
    console.log('Displayed Articles:', this.displayedArticles);
    console.log('Current Category:', this.currentCategory);
    console.groupEnd();
    
    // アラートでも表示
    alert(`記事表示コンポーネント デバッグ情報
    
    総記事数: ${status.totalArticles}件
    公開記事数: ${status.publishedArticles}件
    下書き記事数: ${status.draftArticles}件
    表示中記事数: ${this.displayedArticles.length}件
    現在のカテゴリー: ${this.currentCategory}
    
    詳細はコンソールをご確認ください。`);
  }

  // イベントハンドラー

  /**
   * ストレージ初期化完了ハンドラー
   * @private
   * @param {Object} event - イベントデータ
   */
  handleStorageInitialized(event) {
    this.debug('ArticleStorageService初期化完了:', event);
    this.displayArticles();
  }

  /**
   * 記事保存ハンドラー
   * @private
   * @param {Object} event - イベントデータ
   */
  handleArticleSaved(event) {
    this.debug('記事保存イベント受信:', event);
    if (event.published) {
      // 公開された記事のみリフレッシュ
      this.displayArticles();
    }
  }

  /**
   * 記事削除ハンドラー
   * @private
   * @param {Object} event - イベントデータ
   */
  handleArticleDeleted(event) {
    this.debug('記事削除イベント受信:', event);
    this.displayArticles();
  }

  /**
   * データ変更ハンドラー
   * @private
   * @param {Object} event - イベントデータ
   */
  handleDataChanged(event) {
    this.debug('データ変更イベント受信:', event);
    this.displayArticles();
  }

  /**
   * データ更新完了ハンドラー
   * @private
   * @param {Object} event - イベントデータ
   */
  handleDataRefreshed(event) {
    this.debug('データ更新完了イベント受信:', event);
    this.displayArticles();
  }

  /**
   * コンポーネント状態の取得
   * @returns {Object}
   */
  getStatus() {
    return {
      ...super.getStatus(),
      displayedArticles: this.displayedArticles.length,
      currentCategory: this.currentCategory,
      maxDisplayArticles: this.maxDisplayArticles,
      isLoading: this.isLoading,
      articleStorageInitialized: this.articleStorage?.initialized || false
    };
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    // イベントリスナーの削除はBaseComponentが行う
    
    // プロパティのクリア
    this.articleStorage = null;
    this.displayedArticles = [];
    this.newsListContainer = null;
    this.loadingElement = null;
    this.statusElement = null;
    
    super.destroy();
  }

  /**
   * ログ出力
   * @param {...any} args - ログ引数
   */
  log(...args) {
    console.log(`[${this.componentName}]`, ...args);
  }
  
  /**
   * エラーログ出力
   * @param {...any} args - エラーログ引数
   */
  error(...args) {
    console.error(`[${this.componentName}]`, ...args);
  }
  
  /**
   * デバッグログ出力
   * @param {...any} args - デバッグログ引数
   */
  debug(...args) {
    if (this.debugMode) {
      console.log(`[${this.componentName}:DEBUG]`, ...args);
    }
  }
  
  /**
   * 開発環境での管理画面リンク表示
   * @private
   */
  setupAdminLinks() {
    if (!this.debugMode) return;
    
    try {
      // 管理画面リンクの表示
      const adminLink = this.safeQuerySelector('#news-admin-link', this.container);
      if (adminLink) {
        adminLink.style.display = 'block';
        this.debug('管理画面リンクを表示しました');
      }
      
      // デバッグボタンがある場合は表示
      const debugButton = this.safeQuerySelector('[data-action="show-news-debug"]', this.container);
      if (debugButton) {
        debugButton.style.display = 'inline-block';
      }
      
    } catch (error) {
      this.error('管理画面リンク設定エラー:', error);
    }
  }
}

// デフォルトエクスポート
export default NewsDisplayComponent; 