/**
 * 記事表示コンポーネント
 * @version 3.0.0 - Supabase完全統合版
 */

import { EventBus } from '../../../shared/services/EventBus.js';
import { getArticleSupabaseService } from '../../../shared/services/ArticleSupabaseService.js';
import { CONFIG } from '../../../shared/constants/config.js';

export class ArticleDisplay {
  constructor(containerId, options = {}) {
    this.componentName = 'ArticleDisplay';
    this.containerId = containerId;
    this.container = null;
    
    // オプション設定
    this.options = {
      showMeta: options.showMeta !== false,
      showCategory: options.showCategory !== false,
      showDate: options.showDate !== false,
      showAuthor: options.showAuthor || false,
      enableSharing: options.enableSharing || false,
      ...options
    };
    
    // 状態管理
    this.initialized = false;
    this.article = null;
    this.articleId = options.articleId || null;
    
    // Supabaseサービス
    this.articleService = null;
  }

  /**
   * コンポーネント初期化
   */
  async init() {
    if (this.initialized) {
      this.debug('既に初期化済み');
      return;
    }

    try {
      this.debug('記事表示コンポーネント初期化開始');
      
      // コンテナ要素の取得
      this.container = document.getElementById(this.containerId) || 
                     document.querySelector(this.containerId);
      
      if (!this.container) {
        throw new Error(`コンテナ要素が見つかりません: ${this.containerId}`);
      }
      
      // Supabaseサービスの初期化
      await this.initializeSupabaseService();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // 記事IDが指定されている場合は記事を読み込み
      if (this.articleId) {
        await this.loadArticle(this.articleId);
      }
      
      this.initialized = true;
      this.debug('初期化完了');
      
    } catch (error) {
      this.error('初期化エラー:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Supabaseサービスの初期化
   */
  async initializeSupabaseService() {
    this.debug('Supabaseサービスを初期化中...');
    
    this.articleService = getArticleSupabaseService();
    
    if (!this.articleService.initialized) {
      await this.articleService.init();
    }
    
    this.debug('Supabaseサービス初期化完了');
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // 記事更新イベント
    EventBus.on('article:saved', (data) => {
      if (data.articleId === this.articleId) {
        this.debug('記事更新イベントを受信');
        this.refresh();
      }
    });
    
    // 記事削除イベント
    EventBus.on('article:deleted', (data) => {
      if (data.articleId === this.articleId) {
        this.debug('記事削除イベントを受信');
        this.handleArticleDeleted();
      }
    });
  }

  /**
   * 記事の読み込み
   */
  async loadArticle(articleId) {
    try {
      this.debug(`記事読み込み開始: ${articleId}`);
      this.showLoading();
      
      // Supabaseから記事を取得
      this.article = await this.articleService.getArticleById(articleId);
      
      if (!this.article) {
        throw new Error('記事が見つかりません');
      }
      
      this.articleId = articleId;
      this.debug(`記事読み込み完了: ${this.article.title}`);
      
      // 記事の表示
      this.renderArticle();
      
      // 読み込み完了イベント
      EventBus.emit('articleDisplay:loaded', {
        componentId: this.containerId,
        articleId: this.articleId,
        article: this.article
      });
      
    } catch (error) {
      this.error('記事読み込みエラー:', error);
      this.handleError(error);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 記事データの設定
   */
  setArticle(article) {
    this.article = article;
    this.articleId = article.id;
    this.renderArticle();
  }

  /**
   * 記事の表示
   */
  renderArticle() {
    if (!this.article || !this.container) {
      this.error('記事データまたはコンテナが見つかりません');
      return;
    }

    try {
      this.debug('記事表示開始');
      
      const articleHtml = this.generateArticleHtml();
      this.container.innerHTML = articleHtml;
      
      // 追加機能の初期化
      this.initializeFeatures();
      
      this.debug('記事表示完了');
      
    } catch (error) {
      this.error('記事表示エラー:', error);
      this.handleError(error);
    }
  }

  /**
   * 記事HTMLの生成
   */
  generateArticleHtml() {
    const article = this.article;
    
    // メタ情報の生成
    const metaHtml = this.options.showMeta ? this.generateMetaHtml() : '';
    
    // コンテンツの生成
    const contentHtml = this.sanitizeContent(article.content);
    
    // シェアボタンの生成
    const shareHtml = this.options.enableSharing ? this.generateShareHtml() : '';
    
    return `
      <article class="article-display" data-article-id="${article.id}">
        ${metaHtml}
        <div class="article-content">
          ${contentHtml}
        </div>
        ${shareHtml}
      </article>
    `;
  }

  /**
   * メタ情報HTMLの生成
   */
  generateMetaHtml() {
    const article = this.article;
    
    const categoryHtml = this.options.showCategory && article.category ? 
      `<span class="article-category category-${article.category}">${this.getCategoryLabel(article.category)}</span>` : '';
    
    const dateHtml = this.options.showDate ? 
      `<time class="article-date" datetime="${article.publishedAt || article.createdAt}">
        ${this.formatDate(article.publishedAt || article.createdAt)}
      </time>` : '';
    
    const authorHtml = this.options.showAuthor && article.author ? 
      `<span class="article-author">投稿者: ${this.escapeHtml(article.author)}</span>` : '';
    
    return `
      <header class="article-header">
        <h1 class="article-title">${this.escapeHtml(article.title)}</h1>
        <div class="article-meta">
          ${categoryHtml}
          ${dateHtml}
          ${authorHtml}
        </div>
      </header>
    `;
  }

  /**
   * シェアボタンHTMLの生成
   */
  generateShareHtml() {
    const article = this.article;
    const currentUrl = window.location.href;
    const title = encodeURIComponent(article.title);
    const url = encodeURIComponent(currentUrl);
    
    return `
      <div class="article-share">
        <h3 class="share-title">この記事をシェア</h3>
        <div class="share-buttons">
          <a href="https://twitter.com/intent/tweet?text=${title}&url=${url}" 
             target="_blank" rel="noopener" class="share-btn share-twitter">
            Twitter
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" 
             target="_blank" rel="noopener" class="share-btn share-facebook">
            Facebook
          </a>
          <button class="share-btn share-copy" onclick="navigator.clipboard.writeText('${currentUrl}')">
            URLをコピー
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 追加機能の初期化
   */
  initializeFeatures() {
    // 画像の遅延読み込み
    this.initializeLazyLoading();
    
    // 外部リンクの処理
    this.initializeExternalLinks();
    
    // コードブロックのハイライト
    this.initializeCodeHighlight();
  }

  /**
   * 画像の遅延読み込み初期化
   */
  initializeLazyLoading() {
    const images = this.container.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });
      
      images.forEach(img => imageObserver.observe(img));
    } else {
      // フォールバック: すべての画像を即座に読み込み
      images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  }

  /**
   * 外部リンクの処理
   */
  initializeExternalLinks() {
    const links = this.container.querySelectorAll('a[href^="http"]');
    links.forEach(link => {
      if (!link.hostname.includes(window.location.hostname)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  /**
   * コードブロックのハイライト
   */
  initializeCodeHighlight() {
    const codeBlocks = this.container.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      block.classList.add('language-javascript'); // デフォルト言語
    });
  }

  /**
   * カテゴリーラベルの取得
   */
  getCategoryLabel(category) {
    const categoryLabels = {
      general: '一般',
      event: 'イベント',
      notice: 'お知らせ',
      lesson: 'レッスン',
      other: 'その他'
    };
    return categoryLabels[category] || category;
  }

  /**
   * 日付のフォーマット
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * コンテンツのサニタイズ
   */
  sanitizeContent(content) {
    // 基本的なHTMLタグのみ許可
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'pre', 'code'];
    
    // 簡易的なサニタイズ（実際のプロダクションではDOMPurifyなどを使用推奨）
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // 危険なスクリプトタグを削除
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // 危険な属性を削除
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
      const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
      dangerousAttrs.forEach(attr => {
        if (element.hasAttribute(attr)) {
          element.removeAttribute(attr);
        }
      });
    });
    
    return tempDiv.innerHTML;
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * ローディング表示
   */
  showLoading() {
    if (this.container) {
      this.container.innerHTML = `
        <div class="article-loading">
          <div class="loading-spinner"></div>
          <p class="loading-text">記事を読み込み中...</p>
        </div>
      `;
    }
  }

  /**
   * ローディング非表示
   */
  hideLoading() {
    const loadingElement = this.container?.querySelector('.article-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  /**
   * エラーハンドリング
   */
  handleError(error) {
    this.error('エラー処理:', error);
    
    if (this.container) {
      this.container.innerHTML = `
        <div class="article-error">
          <div class="error-icon">⚠️</div>
          <h2 class="error-title">記事の読み込みに失敗しました</h2>
          <p class="error-message">${this.escapeHtml(error.message)}</p>
          <div class="error-actions">
            <button onclick="this.closest('.article-display, [id]').dispatchEvent(new CustomEvent('retry'))" 
                    class="error-btn error-btn-primary">
              🔄 再試行
            </button>
          </div>
        </div>
      `;
      
      // 再試行イベントリスナー
      this.container.addEventListener('retry', () => {
        if (this.articleId) {
          this.loadArticle(this.articleId);
        }
      });
    }
    
    // エラーイベント
    EventBus.emit('articleDisplay:error', {
      componentId: this.containerId,
      articleId: this.articleId,
      error: error.message
    });
  }

  /**
   * 記事削除時の処理
   */
  handleArticleDeleted() {
    this.debug('記事が削除されました');
    
    if (this.container) {
      this.container.innerHTML = `
        <div class="article-deleted">
          <div class="deleted-icon">🗑️</div>
          <h2 class="deleted-title">記事が削除されました</h2>
          <p class="deleted-message">この記事は削除されたため、表示できません。</p>
        </div>
      `;
    }
  }

  /**
   * 手動更新
   */
  async refresh() {
    if (this.articleId) {
      this.debug('手動更新実行');
      await this.loadArticle(this.articleId);
    }
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    this.debug('コンポーネント破棄中...');
    
    // イベントリスナーのクリーンアップ
    EventBus.off('article:saved');
    EventBus.off('article:deleted');
    
    // 状態リセット
    this.initialized = false;
    this.article = null;
    this.articleId = null;
    this.articleService = null;
    
    // コンテナクリア
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.debug('コンポーネント破棄完了');
  }

  /**
   * デバッグログ
   */
  debug(message, ...args) {
    if (CONFIG.debug?.enabled) {
      console.log(`[${this.componentName}:${this.containerId}] ${message}`, ...args);
    }
  }

  /**
   * エラーログ
   */
  error(message, ...args) {
    console.error(`[${this.componentName}:${this.containerId}] ${message}`, ...args);
  }
}

export default ArticleDisplay; 