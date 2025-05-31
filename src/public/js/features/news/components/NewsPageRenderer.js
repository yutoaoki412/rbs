/**
 * ニュースページレンダラー
 * ページ別のニュース表示ロジックを管理
 * @version 4.0.0
 */

import { CONFIG } from '../../../shared/constants/config.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { NewsUtils } from '../utils/NewsUtils.js';

export class NewsPageRenderer {
  constructor(newsService) {
    this.newsService = newsService;
    this.pageType = newsService.pageType;
  }

  /**
   * ページタイプに応じた初期化
   */
  async initializePage() {
    switch (this.pageType) {
      case 'home':
        await this.initializeHomePage();
        break;
      case 'news-list':
        await this.initializeNewsListPage();
        break;
      case 'news-detail':
        await this.initializeNewsDetailPage();
        break;
      case 'admin':
        console.log('📋 管理画面は別途初期化されます');
        break;
    }
  }

  /**
   * ホームページニュース初期化
   */
  async initializeHomePage() {
    const container = document.getElementById('news-list');
    const loadingStatus = document.getElementById('news-loading-status');
    const statusText = document.getElementById('news-status-text');
    
    try {
      // ローディング状態表示
      this.updateLoadingStatus('記事を読み込み中...', loadingStatus, statusText);
      
      if (!container) {
        console.warn('⚠️ ホームページ: #news-list要素が見つかりません');
        this.updateLoadingStatus('ニュース表示エリアが見つかりません', loadingStatus, statusText, 'error');
        return;
      }

      const articles = this.newsService.getArticles({ limit: 5 });
      
      // ローディング状態を非表示
      this.hideLoadingStatus(loadingStatus);
      
      if (articles.length === 0) {
        container.innerHTML = NewsUtils.createEmptyState();
        console.log('🏠 ホームページ: 表示可能な記事がありません');
        return;
      }

      container.innerHTML = articles.map(article => 
        NewsUtils.createArticleCard(article, 'home')
      ).join('');
      
      console.log(`🏠 ホームページニュース表示: ${articles.length}件`);
      
    } catch (error) {
      console.error('❌ ホームページニュース初期化エラー:', error);
      this.updateLoadingStatus('記事の読み込みに失敗しました', loadingStatus, statusText, 'error');
      if (container) {
        container.innerHTML = this.createErrorMessage('記事の読み込みに失敗しました');
      }
    }
  }

  /**
   * ニュース一覧ページ初期化
   */
  async initializeNewsListPage() {
    const container = document.getElementById('news-grid');
    
    try {
      if (!container) {
        console.warn('⚠️ ニュース一覧ページ: #news-grid要素が見つかりません');
        this.showError('ニュース表示エリアが見つかりません');
        return;
      }

      // URLパラメータからカテゴリーを取得
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category') || 'all';
      
      // カテゴリーフィルター適用
      const articles = this.newsService.getArticles({ category });
      
      if (articles.length === 0) {
        container.innerHTML = NewsUtils.createEmptyState();
        console.log(`📰 ニュース一覧: ${category}カテゴリーに記事がありません`);
      } else {
        container.innerHTML = articles.map(article => 
          NewsUtils.createArticleCard(article, 'list')
        ).join('');
        console.log(`📰 ニュース一覧表示: ${articles.length}件 (${category})`);
      }
      
      // カテゴリーフィルター更新
      this.updateCategoryFilter(category);
      
      // 件数表示
      const searchCount = document.getElementById('search-count');
      if (searchCount) {
        searchCount.textContent = articles.length;
        document.getElementById('search-results')?.style.setProperty('display', 'block');
      }
      
      // カテゴリーフィルターイベント設定
      this.setupCategoryFilters();
      
    } catch (error) {
      console.error('❌ ニュース一覧ページ初期化エラー:', error);
      if (container) {
        container.innerHTML = this.createErrorMessage('記事の読み込みに失敗しました');
      }
    }
  }

  /**
   * ニュース詳細ページ初期化
   */
  async initializeNewsDetailPage() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const articleId = urlParams.get('id');
      
      if (!articleId) {
        console.warn('⚠️ ニュース詳細ページ: 記事IDが指定されていません');
        this.showError('記事IDが指定されていません');
        return;
      }

      const article = this.newsService.getArticleById(articleId);
      if (!article) {
        console.warn(`⚠️ ニュース詳細ページ: 記事が見つかりません (ID: ${articleId})`);
        this.showError('記事が見つかりません');
        return;
      }

      // 記事詳細表示
      this.displayArticleDetail(article);
      
      // 関連記事表示
      this.displayRelatedArticles(articleId);
      
      // シェアボタン有効化
      this.enableShareButtons(article);
      
      console.log(`📄 記事詳細表示: ${article.title}`);
      
    } catch (error) {
      console.error('❌ ニュース詳細ページ初期化エラー:', error);
      this.showError('記事の読み込みに失敗しました');
    }
  }

  /**
   * 記事詳細を表示
   */
  displayArticleDetail(article) {
    // タイトル
    const title = document.getElementById('article-title');
    if (title) title.textContent = article.title;
    
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = article.title;
    
    // 日付
    const date = document.getElementById('article-date');
    if (date) date.textContent = NewsUtils.formatDate(article.date || article.publishedAt);
    
    // カテゴリー
    const category = document.getElementById('article-category');
    if (category) {
      const categoryInfo = CONFIG.articles.categories[article.category];
      category.textContent = categoryInfo?.name || article.category;
      category.style.color = categoryInfo?.color || '#666';
    }
    
    // 本文
    const content = document.getElementById('article-content');
    if (content) {
      const articleContent = this.newsService.getArticleContent(article.id);
      content.innerHTML = NewsUtils.formatContent(articleContent);
    }
    
    // メタデータ更新
    this.updatePageMetadata(article);
  }

  /**
   * 関連記事を表示
   */
  displayRelatedArticles(currentArticleId) {
    const container = document.getElementById('related-articles-container');
    const section = document.getElementById('related-articles');
    if (!container || !section) return;

    const relatedArticles = this.newsService.getRelatedArticles(currentArticleId, 3);
    
    if (relatedArticles.length === 0) return;

    container.innerHTML = relatedArticles.map(article => 
      NewsUtils.createArticleCard(article, 'related')
    ).join('');
    
    section.style.display = 'block';
  }

  /**
   * カテゴリーフィルターを更新
   */
  updateCategoryFilter(activeCategory) {
    const buttons = document.querySelectorAll('.filter-btn[data-category]');
    buttons.forEach(button => {
      const category = button.getAttribute('data-category');
      button.classList.toggle('active', category === activeCategory);
    });
  }

  /**
   * カテゴリーフィルターイベントを設定
   */
  setupCategoryFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn[data-category]');
    filterButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const category = button.getAttribute('data-category');
        const url = new URL(window.location);
        if (category === 'all') {
          url.searchParams.delete('category');
        } else {
          url.searchParams.set('category', category);
        }
        window.history.pushState({}, '', url);
        this.initializeNewsListPage();
      });
    });
  }

  /**
   * シェアボタンを有効化
   */
  enableShareButtons(article) {
    const shareSection = document.getElementById('share-section');
    if (!shareSection) return;
    
    shareSection.style.display = 'block';
    
    // シェアボタンのイベントリスナー
    shareSection.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      
      const action = button.getAttribute('data-action');
      const url = window.location.href;
      const text = `${article.title} - RBS陸上教室`;
      
      switch (action) {
        case 'share-twitter':
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
            '_blank',
            'width=600,height=400'
          );
          break;
        case 'share-facebook':
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            '_blank',
            'width=600,height=400'
          );
          break;
        case 'share-line':
          window.open(
            `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
            '_blank',
            'width=600,height=400'
          );
          break;
        case 'copy-url':
          NewsUtils.copyToClipboard(url);
          break;
      }
    });
  }

  /**
   * ページメタデータを更新
   */
  updatePageMetadata(article) {
    document.title = `${article.title} - RBS陸上教室`;
    
    if (article.summary) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = article.summary;
    }
  }

  /**
   * エラーを表示
   */
  showError(message) {
    const containers = [
      document.getElementById('article-content'),
      document.getElementById('news-grid'),
      document.getElementById('news-list')
    ].filter(Boolean);
    
    const errorHTML = `
      <div class="news-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${NewsUtils.escapeHtml(message)}</p>
        <button class="btn btn-outline" onclick="location.reload()">再読み込み</button>
      </div>
    `;
    
    containers.forEach(container => {
      container.innerHTML = errorHTML;
    });
  }

  /**
   * ページをリフレッシュ
   */
  async refreshPage() {
    await this.initializePage();
  }

  /**
   * ローディング状態を更新
   * @private
   */
  updateLoadingStatus(message, loadingElement, textElement, type = 'loading') {
    if (textElement) {
      textElement.textContent = message;
    }
    
    if (loadingElement) {
      loadingElement.style.display = 'block';
      loadingElement.className = `news-loading-status ${type}`;
    }
    
    console.log(`📡 ローディング状態更新: ${message} (${type})`);
  }

  /**
   * ローディング状態を非表示
   * @private
   */
  hideLoadingStatus(loadingElement) {
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }

  /**
   * エラーメッセージを作成
   * @private
   */
  createErrorMessage(message) {
    return `
      <div class="news-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${NewsUtils.escapeHtml(message)}</p>
        <button class="btn btn-outline" onclick="location.reload()">再読み込み</button>
      </div>
    `;
  }
}

export default NewsPageRenderer; 