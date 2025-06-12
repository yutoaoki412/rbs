/**
 * LP側ニュースコントローラー
 * index.html、news.html、news-detail.htmlでのニュース表示を統合管理
 * @version 1.0.0 - 統合版
 */

import { getLPNewsService } from '../services/LPNewsService.js';

export class LPNewsController {
  constructor() {
    this.newsService = getLPNewsService();
    this.initialized = false;
    this.pageType = this.detectPageType();
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[LPNewsController] 初期化開始:', this.pageType);
      
      // ニュースサービス初期化
      await this.newsService.init();
      
      // ページタイプに応じた表示処理
      await this.initializePageContent();
      
      this.initialized = true;
      console.log('[LPNewsController] 初期化完了');
      
    } catch (error) {
      console.error('[LPNewsController] 初期化エラー:', error);
    }
  }

  /**
   * ページタイプを検出
   */
  detectPageType() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'index.html';
    
    if (fileName.includes('news-detail')) return 'news-detail';
    if (fileName.includes('news.html')) return 'news-list';
    return 'home'; // index.html またはルート
  }

  /**
   * ページタイプに応じたコンテンツ初期化
   */
  async initializePageContent() {
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
    }
  }

  /**
   * ホームページのニュースセクション初期化
   */
  async initializeHomePage() {
    const newsContainer = document.getElementById('news-grid');
    const statusContainer = document.getElementById('news-loading-status');
    
    if (!newsContainer) {
      console.warn('[LPNewsController] ニュースコンテナが見つかりません (home)');
      return;
    }

    try {
      // ローディング状態を表示
      this.showLoadingStatus(statusContainer, 'ニュースを読み込み中...');
      
      // ニュース一覧生成（シンプル表示、件数制限あり）
      const newsHtml = this.newsService.generateNewsPageList({ 
        limit: 6,
        isHomeVersion: true 
      });
      newsContainer.innerHTML = newsHtml;
      
      // ローディング状態を非表示
      this.hideLoadingStatus(statusContainer);
      
      console.log('[LPNewsController] ホームページのニュース表示完了');
      
    } catch (error) {
      console.error('[LPNewsController] ホームページニュース表示エラー:', error);
      this.showErrorStatus(statusContainer, 'ニュースの読み込みに失敗しました');
    }
  }



  /**
   * ニュース一覧ページ初期化
   */
  async initializeNewsListPage() {
    const newsGrid = document.getElementById('news-grid');
    const searchResults = document.getElementById('search-results');
    
    if (!newsGrid) {
      console.warn('[LPNewsController] ニュースグリッドが見つかりません (news-list)');
      return;
    }

    try {
      // URLパラメータからカテゴリー取得
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category') || 'all';
      
      // フィルターボタンの状態更新
      this.updateFilterButtons(category);
      
      // ニュース一覧生成（統一フォーマット）
      const options = { 
        ...(category !== 'all' ? { category } : {}),
        isHomeVersion: false 
      };
      const newsHtml = this.newsService.generateNewsPageList(options);
      newsGrid.innerHTML = newsHtml;
      
      // 検索結果表示の更新
      this.updateSearchResults(searchResults, category);
      
      // フィルターイベントリスナー設定
      this.setupFilterListeners();
      
      console.log('[LPNewsController] ニュース一覧ページ表示完了');
      
    } catch (error) {
      console.error('[LPNewsController] ニュース一覧ページエラー:', error);
      newsGrid.innerHTML = '<div class="news-error">ニュースの読み込みに失敗しました</div>';
    }
  }

  /**
   * ニュース詳細ページ初期化
   */
  async initializeNewsDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
      this.showArticleNotFound();
      return;
    }

    try {
      // 記事詳細取得
      const { article, html, relatedHtml } = this.newsService.generateNewsDetail(articleId);
      
      if (!article) {
        this.showArticleNotFound();
        return;
      }
      
      // ページタイトル更新
      document.title = `${article.title} - RBS陸上教室`;
      
      // メタタグ更新
      this.updateMetaTags(article);
      
      // 記事内容表示
      const articleContainer = document.querySelector('.article-container') || document.querySelector('main');
      if (articleContainer) {
        articleContainer.innerHTML = html;
        
        // 関連記事がある場合は表示
        if (relatedHtml) {
          articleContainer.insertAdjacentHTML('beforeend', relatedHtml);
        }
      }
      
      console.log('[LPNewsController] ニュース詳細ページ表示完了');
      
    } catch (error) {
      console.error('[LPNewsController] ニュース詳細ページエラー:', error);
      this.showArticleNotFound();
    }
  }

  /**
   * ローディング状態表示
   */
  showLoadingStatus(container, message) {
    if (!container) return;
    
    container.style.display = 'block';
    const statusText = container.querySelector('#news-status-text');
    if (statusText) {
      statusText.textContent = message;
    }
  }

  /**
   * ローディング状態非表示
   */
  hideLoadingStatus(container) {
    if (!container) return;
    container.style.display = 'none';
  }

  /**
   * エラー状態表示
   */
  showErrorStatus(container, message) {
    if (!container) return;
    
    container.style.display = 'block';
    container.innerHTML = `
      <div class="status-message error">
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * フィルターボタンの状態更新
   */
  updateFilterButtons(activeCategory) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
      const category = button.dataset.category;
      if (category === activeCategory) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * 検索結果表示の更新
   */
  updateSearchResults(container, category) {
    if (!container) return;
    
    const articles = this.newsService.getPublishedArticles(
      category !== 'all' ? { category } : {}
    );
    
    const countElement = container.querySelector('#search-count');
    if (countElement) {
      countElement.textContent = articles.length;
    }
    
    if (category !== 'all') {
      container.classList.remove('hidden-section');
    } else {
      container.classList.add('hidden-section');
    }
  }

  /**
   * フィルターイベントリスナー設定
   */
  setupFilterListeners() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const category = button.dataset.category;
        
        // URLを更新（ページをリロードせずに）
        const newUrl = category === 'all' 
          ? 'news.html' 
          : `news.html?category=${category}`;
        
        window.history.pushState({ category }, '', newUrl);
        
        // ニュース一覧を更新
        this.updateNewsList(category);
      });
    });
    
    // ブラウザの戻る/進むボタン対応
    window.addEventListener('popstate', (e) => {
      const category = e.state?.category || 'all';
      this.updateNewsList(category);
    });
  }

  /**
   * ニュース一覧更新
   */
  updateNewsList(category) {
    const newsGrid = document.getElementById('news-grid');
    const searchResults = document.getElementById('search-results');
    
    if (!newsGrid) return;
    
    // フィルターボタン状態更新
    this.updateFilterButtons(category);
    
    // ニュース一覧更新（統一フォーマット）
    const options = { 
      ...(category !== 'all' ? { category } : {}),
      isHomeVersion: false 
    };
    const newsHtml = this.newsService.generateNewsPageList(options);
    newsGrid.innerHTML = newsHtml;
    
    // 検索結果表示更新
    this.updateSearchResults(searchResults, category);
  }

  /**
   * 記事が見つからない場合の表示
   */
  showArticleNotFound() {
    document.title = '記事が見つかりません - RBS陸上教室';
    
    const main = document.querySelector('main');
    if (main) {
      main.innerHTML = `
        <div class="container">
          <div class="article-not-found">
            <h1>記事が見つかりません</h1>
            <p>指定された記事は存在しないか、削除された可能性があります。</p>
            <a href="news.html" class="btn btn-primary">ニュース一覧に戻る</a>
          </div>
        </div>
      `;
    }
  }

  /**
   * メタタグ更新
   */
  updateMetaTags(article) {
    // ディスクリプション更新
    const description = document.querySelector('meta[name="description"]');
    if (description && article.summary) {
      description.setAttribute('content', article.summary);
    }
    
    // OGタグ更新（ある場合）
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', article.title);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && article.summary) {
      ogDescription.setAttribute('content', article.summary);
    }
  }

  /**
   * データ更新
   */
  refresh() {
    this.newsService.refresh();
    this.initializePageContent();
  }

  /**
   * コントローラー破棄
   */
  destroy() {
    this.initialized = false;
    console.log('[LPNewsController] コントローラーを破棄しました');
  }
}

// シングルトンインスタンス
let lpNewsControllerInstance = null;

/**
 * LPNewsControllerのシングルトンインスタンスを取得
 * @returns {LPNewsController}
 */
export function getLPNewsController() {
  if (!lpNewsControllerInstance) {
    lpNewsControllerInstance = new LPNewsController();
  }
  return lpNewsControllerInstance;
}

/**
 * ページ読み込み時に自動初期化
 */
document.addEventListener('DOMContentLoaded', async () => {
  const controller = getLPNewsController();
  await controller.init();
}); 