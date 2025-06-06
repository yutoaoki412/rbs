/**
 * ニュース詳細ページコントローラー
 * @version 2.0.0
 */

import { getUrlParameter } from '../../../shared/utils/urlUtils.js';
import { querySelector, setText, createElement, show, hide } from '../../../shared/utils/domUtils.js';
import { scrollToTop, addClass, removeClass, toggleClass } from '../../../shared/utils/domUtils.js';
import { formatDate, escapeHtml, isEmpty } from '../../../shared/utils/stringUtils.js';
import { debounce } from '../../../shared/utils/FunctionUtils.js';
import { isValidDate } from '../../../shared/utils/dateUtils.js';
import { StyleUtils } from '../../../shared/utils/StyleUtils.js';
import { createErrorHtml } from '../../../shared/utils/htmlUtils.js';
import { ERROR_MESSAGES } from '../../../shared/constants/newsConstants.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { actionManager } from '../../../core/ActionManager.js';
import { CONFIG } from '../../../shared/constants/config.js';
import ArticleDisplay from '../components/ArticleDisplay.js';
import RelatedArticles from '../components/RelatedArticles.js';
import ShareButtons from '../components/ShareButtons.js';

export default class NewsDetailController {
  constructor() {
    this.currentArticle = null;
    this.components = new Map();
    this.isInitialized = false;
  }

  /**
   * 初期化
   */
  async init() {
    try {
      console.log('📰 ニュース詳細コントローラー初期化開始');
      
      await this.loadArticle();
      this.initializeComponents();
      
      this.isInitialized = true;
      console.log('✅ ニュース詳細コントローラー初期化完了');
      
    } catch (error) {
      console.error('❌ ニュース詳細コントローラー初期化失敗:', error);
      this.handleError(error);
    }
  }

  /**
   * 記事を読み込み
   */
  async loadArticle() {
    // 記事IDを取得
    const articleId = this.getArticleId();
    if (!articleId) {
      throw new Error('INVALID_ID');
    }

    console.log('🔍 記事ID:', articleId);

    // ArticleServiceの確認・初期化
    await this.ensureArticleService();

    // 記事データを取得
    const article = window.articleService.getArticleById(articleId);
    if (!article) {
      console.error('❌ 記事が見つかりません:', articleId);
      
      // デバッグ情報を出力
      const allArticles = window.articleService.getPublishedArticles();
      console.log('📊 利用可能な記事:', allArticles.map(a => ({
        id: a.id,
        title: a.title,
        status: a.status
      })));
      
      throw new Error('ARTICLE_NOT_FOUND');
    }

    console.log('📄 記事データ取得成功:', article.title);
    this.currentArticle = article;

    // パンくずナビを更新
    this.updateBreadcrumb(article.title);
  }

  /**
   * コンポーネントを初期化
   */
  initializeComponents() {
    if (!this.currentArticle) {
      throw new Error('記事データが読み込まれていません');
    }

    try {
      // 記事表示コンポーネント
      const articleDisplay = new ArticleDisplay('#article-content', {
        article: this.currentArticle
      });
      this.components.set('articleDisplay', articleDisplay);

      // シェアボタンコンポーネント
      const shareButtons = new ShareButtons('#share-section', {
        article: this.currentArticle
      });
      this.components.set('shareButtons', shareButtons);

      // 関連記事コンポーネント
      const relatedArticles = new RelatedArticles('#related-articles', {
        currentArticle: this.currentArticle
      });
      this.components.set('relatedArticles', relatedArticles);

      console.log('✅ 全コンポーネント初期化完了');

    } catch (error) {
      console.error('❌ コンポーネント初期化エラー:', error);
      throw error;
    }
  }

  /**
   * 記事IDを取得
   * @returns {string|null}
   */
  getArticleId() {
    return getUrlParameter('id');
  }

  /**
   * ArticleServiceの確実な初期化
   */
  async ensureArticleService() {
    if (!window.articleService || !window.articleService.isInitialized) {
      console.log('🔄 ArticleServiceを初期化中...');
      
      try {
        const { default: ArticleService } = await import('../services/ArticleService.js');
        window.articleService = new ArticleService();
        await window.articleService.init();
        
        console.log('✅ ArticleService初期化完了');
      } catch (initError) {
        console.error('❌ ArticleService初期化失敗:', initError);
        throw new Error('SERVICE_INIT_FAILED');
      }
    } else {
      // 既に初期化済みの場合はデータを最新化
      console.log('🔄 ArticleServiceデータを最新化中...');
      await window.articleService.refresh();
    }
  }

  /**
   * パンくずナビを更新
   * @param {string} title - 記事タイトル
   */
  updateBreadcrumb(title) {
    const breadcrumbTitle = querySelector('#breadcrumb-title');
    if (breadcrumbTitle) {
      setText(breadcrumbTitle, title);
    }
  }

  /**
   * エラーハンドリング
   * @param {Error} error - エラーオブジェクト
   */
  handleError(error) {
    const errorType = error.message;
    let errorConfig;

    switch (errorType) {
      case 'INVALID_ID':
        errorConfig = {
          icon: '🔗',
          title: '無効なリンクです',
          message: ERROR_MESSAGES.INVALID_ID,
          actions: [
            { text: 'ニュース一覧へ', href: 'news.html', class: 'btn-primary' },
            { text: 'ホームへ', href: '../pages/index.html', class: 'btn-secondary' }
          ]
        };
        break;

      case 'ARTICLE_NOT_FOUND':
        errorConfig = {
          icon: '🔍',
          title: '記事が見つかりません',
          message: ERROR_MESSAGES.ARTICLE_NOT_FOUND,
          actions: [
            { text: 'ニュース一覧へ', href: 'news.html', class: 'btn-primary' },
            { text: 'ホームへ', href: '../pages/index.html', class: 'btn-secondary' }
          ]
        };
        break;

      case 'SERVICE_INIT_FAILED':
        errorConfig = {
          icon: '⚠️',
          title: '記事の読み込みに失敗しました',
          message: ERROR_MESSAGES.SERVICE_INIT_FAILED,
          actions: [
            { text: '再読み込み', onclick: 'location.reload()', class: 'btn-primary' },
            { text: 'ニュース一覧へ', href: 'news.html', class: 'btn-secondary' }
          ]
        };
        break;

      default:
        errorConfig = {
          icon: '❌',
          title: 'エラーが発生しました',
          message: error.message || ERROR_MESSAGES.LOAD_FAILED,
          actions: [
            { text: '再読み込み', onclick: 'location.reload()', class: 'btn-primary' },
            { text: 'ニュース一覧へ', href: 'news.html', class: 'btn-secondary' }
          ]
        };
    }

    this.showError(errorConfig);
  }

  /**
   * エラー表示
   * @param {Object} errorConfig - エラー設定
   */
  showError(errorConfig) {
    const articleContent = querySelector('#article-content');
    if (articleContent) {
      articleContent.innerHTML = createErrorHtml(
        errorConfig.title, 
        errorConfig.message, 
        errorConfig.icon, 
        errorConfig.actions
      );
    }
  }

  /**
   * デバッグ情報を表示
   */
  showDebugInfo() {
    const debugInfo = {
      currentUrl: window.location.href,
      articleId: this.getArticleId(),
      currentArticle: this.currentArticle,
      articleServiceStatus: window.articleService ? 'loaded' : 'not loaded',
      articleServiceInitialized: window.articleService ? window.articleService.isInitialized : false,
      availableArticles: window.articleService ? window.articleService.getAllArticles().length : 0,
      components: Array.from(this.components.keys()),
      timestamp: new Date().toISOString()
    };
    
    console.log('🐛 デバッグ情報:', debugInfo);
    
    const debugText = Object.entries(debugInfo)
      .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
      .join('\n');
    
    alert(`デバッグ情報:\n\n${debugText}\n\n詳細はコンソールを確認してください。`);
  }

  /**
   * ArticleServiceの手動初期化
   */
  async initializeArticleServiceManually() {
    try {
      console.log('🔄 ArticleServiceの手動初期化を開始');
      
      if (!window.articleService) {
        throw new Error('ArticleServiceが読み込まれていません');
      }
      
      await window.articleService.init();
      console.log('✅ ArticleService手動初期化完了');
      
      // 記事を再読み込み
      await this.loadArticle();
      this.initializeComponents();
      
    } catch (error) {
      console.error('❌ ArticleService手動初期化エラー:', error);
      this.handleError(new Error('SERVICE_INIT_FAILED'));
    }
  }

  /**
   * 現在の記事を取得
   * @returns {Object|null}
   */
  getCurrentArticle() {
    return this.currentArticle;
  }

  /**
   * コンポーネントを取得
   * @param {string} name - コンポーネント名
   * @returns {Object|null}
   */
  getComponent(name) {
    return this.components.get(name);
  }

  /**
   * リフレッシュ
   */
  async refresh() {
    try {
      await this.loadArticle();
      
      // コンポーネントをリフレッシュ
      for (const component of this.components.values()) {
        if (component.refresh) {
          component.refresh();
        }
      }
      
      console.log('✅ ニュース詳細ページリフレッシュ完了');
    } catch (error) {
      console.error('❌ リフレッシュエラー:', error);
      this.handleError(error);
    }
  }

  /**
   * 破棄
   */
  destroy() {
    // コンポーネントを破棄
    for (const component of this.components.values()) {
      if (component.destroy) {
        component.destroy();
      }
    }
    this.components.clear();

    this.currentArticle = null;
    this.isInitialized = false;
    
    console.log('✅ ニュース詳細コントローラー破棄完了');
  }
}

// グローバルアクセス用のインスタンス
let newsDetailController = null;

/**
 * ニュース詳細ページを初期化
 */
export async function initNewsDetailPage() {
  try {
    if (newsDetailController) {
      newsDetailController.destroy();
    }
    
    newsDetailController = new NewsDetailController();
    await newsDetailController.init();
    
    // グローバルアクセス用
    window.NewsDetailController = newsDetailController;
    
  } catch (error) {
    console.error('❌ ニュース詳細ページ初期化失敗:', error);
  }
}

// グローバル関数（後方互換性のため）
window.showDebugInfo = () => newsDetailController?.showDebugInfo();
window.initializeArticleServiceManually = () => newsDetailController?.initializeArticleServiceManually(); 