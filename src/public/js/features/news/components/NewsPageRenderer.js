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
      console.log('🏠 ホームページニュース初期化開始');
      console.log('🎯 コンテナ要素:', container ? '✅ 発見' : '❌ 未発見');
      
      // ローディング状態表示
      this.updateLoadingStatus('記事を読み込み中...', loadingStatus, statusText);
      
      if (!container) {
        console.warn('⚠️ ホームページ: #news-list要素が見つかりません');
        this.updateLoadingStatus('ニュース表示エリアが見つかりません', loadingStatus, statusText, 'error');
        return;
      }

      // サービスの状態を確認
      console.log('📊 ニュースサービス状態:', {
        initialized: this.newsService?.initialized,
        totalArticles: this.newsService?.articles?.length || 0,
        serviceType: this.newsService?.constructor?.name
      });

      const articles = this.newsService.getArticles({ limit: 5 });
      console.log('📰 取得した記事数:', articles.length);
      
      if (articles.length > 0) {
        console.log('📝 記事サンプル:', articles.slice(0, 2).map(a => ({
          id: a.id,
          title: a.title?.substring(0, 30) + '...',
          category: a.category,
          status: a.status
        })));
      }
      
      // ローディング状態を非表示
      this.hideLoadingStatus(loadingStatus);
      
      if (articles.length === 0) {
        console.log('⚠️ 表示可能な記事がありません');
        container.innerHTML = NewsUtils.createEmptyState();
        return;
      }

      // HTMLを生成
      const htmlContent = articles.map(article => 
        NewsUtils.createArticleCard(article, 'home')
      ).join('');
      
      console.log('🔧 生成されたHTML長:', htmlContent.length);
      console.log('🎨 HTMLサンプル:', htmlContent.substring(0, 200) + '...');
      
      container.innerHTML = htmlContent;
      
      // アニメーション効果を適用
      this.applyAnimationEffects(container);
      
      // 最終確認
      const renderedCards = container.querySelectorAll('.news-card');
      console.log('✅ レンダリング完了:', {
        htmlLength: htmlContent.length,
        renderedCards: renderedCards.length,
        containerVisible: container.offsetHeight > 0
      });
      
      console.log(`🏠 ホームページニュース表示: ${articles.length}件`);
      
    } catch (error) {
      console.error('❌ ホームページニュース初期化エラー:', error);
      console.error('🔍 エラー詳細:', error.stack);
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
      console.log('📰 ニュース一覧ページ初期化開始');
      console.log('🎯 グリッドコンテナ:', container ? '✅ 発見' : '❌ 未発見');
      
      if (!container) {
        console.warn('⚠️ ニュース一覧ページ: #news-grid要素が見つかりません');
        this.showError('ニュース表示エリアが見つかりません');
        return;
      }

      // URLパラメータからカテゴリーを取得
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category') || 'all';
      console.log('📂 カテゴリーフィルター:', category);
      
      // サービスの状態を確認
      console.log('📊 ニュースサービス状態:', {
        initialized: this.newsService?.initialized,
        totalArticles: this.newsService?.articles?.length || 0,
        serviceType: this.newsService?.constructor?.name
      });
      
      // カテゴリーフィルター適用
      const articles = this.newsService.getArticles({ category });
      console.log('📰 フィルター後の記事数:', articles.length);
      
      if (articles.length > 0) {
        console.log('📝 記事サンプル:', articles.slice(0, 2).map(a => ({
          id: a.id,
          title: a.title?.substring(0, 30) + '...',
          category: a.category,
          status: a.status
        })));
      }
      
      if (articles.length === 0) {
        console.log('⚠️ 表示可能な記事がありません');
        container.innerHTML = NewsUtils.createEmptyState();
        console.log(`📰 ニュース一覧: ${category}カテゴリーに記事がありません`);
      } else {
        // HTMLを生成
        const htmlContent = articles.map(article => 
          NewsUtils.createArticleCard(article, 'list')
        ).join('');
        
        console.log('🔧 生成されたHTML長:', htmlContent.length);
        console.log('🎨 HTMLサンプル:', htmlContent.substring(0, 200) + '...');
        
        container.innerHTML = htmlContent;
        
        // アニメーション効果を適用
        this.applyAnimationEffects(container);
        
        // 最終確認
        const renderedCards = container.querySelectorAll('.news-card');
        console.log('✅ レンダリング完了:', {
          htmlLength: htmlContent.length,
          renderedCards: renderedCards.length,
          containerVisible: container.offsetHeight > 0
        });
        
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
      console.error('🔍 エラー詳細:', error.stack);
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

  /**
   * アニメーション効果を適用
   */
  applyAnimationEffects(container) {
    if (!container) {
      console.warn('⚠️ アニメーション: コンテナが見つかりません');
      return;
    }
    
    console.log('🎭 アニメーション効果を適用開始');
    
    // news-card要素を取得
    const newsCards = container.querySelectorAll('.news-card');
    console.log('🎯 対象カード数:', newsCards.length);
    
    if (newsCards.length === 0) {
      console.warn('⚠️ アニメーション対象のニュースカードが見つかりません');
      return;
    }
    
    // 各カードにアニメーション効果を適用
    newsCards.forEach((card, index) => {
      console.log(`🎨 カード${index + 1}アニメーション準備中...`);
      
      // 初期状態を設定（CSS初期値をオーバーライド）
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = '';
      
      // 順次アニメーション実行
      setTimeout(() => {
        console.log(`✨ カード${index + 1}アニメーション実行`);
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        
        // fade-inクラスも追加
        card.classList.add('fade-in');
        
        // アニメーション完了をチェック
        setTimeout(() => {
          const computedStyle = window.getComputedStyle(card);
          console.log(`🔍 カード${index + 1}最終状態:`, {
            opacity: computedStyle.opacity,
            transform: computedStyle.transform,
            visible: card.offsetHeight > 0 && card.offsetWidth > 0
          });
        }, 650); // アニメーション時間 + 少し余裕
        
      }, index * 100); // 100msずつ遅延
    });
    
    console.log('🎭 アニメーション効果適用完了');
  }
}

export default NewsPageRenderer; 