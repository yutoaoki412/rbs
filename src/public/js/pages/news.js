/**
 * ニュース一覧ページ専用JavaScript
 */

// グローバル変数
let articleManager = null;
let currentCategory = 'all';

// URLパラメータからカテゴリーを取得
function getCurrentCategory() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('category') || 'all';
}

// 記事カードを作成
function createArticleCard(article) {
  const card = document.createElement('article');
  card.className = 'news-card';
  card.setAttribute('data-category', article.category);
  
  // ArticleManagerのメソッドを使用（フォールバック付き）
  const categoryColor = articleManager ? 
    articleManager.getCategoryColor(article.category) : 
    'var(--gray-medium)';
  
  const formattedDate = articleManager ? 
    articleManager.formatDate(article.date) : 
    new Date(article.date).toLocaleDateString('ja-JP').replace(/\//g, '.');
  
  const categoryName = articleManager ? 
    articleManager.getCategoryName(article.category) : 
    article.category;
  
  card.innerHTML = `
    <div class="news-card-header">
      <div class="news-meta">
        <div class="news-date">${formattedDate}</div>
        <div class="news-category ${article.category}" style="background-color: ${categoryColor};">
          ${categoryName}
        </div>
      </div>
      <h2 class="news-title">${escapeHtml(article.title)}</h2>
    </div>
    <div class="news-card-body">
      <p class="news-excerpt">${escapeHtml(article.summary || article.excerpt || '')}</p>
      <a href="news-detail.html?id=${article.id}" class="news-read-more">続きを読む</a>
    </div>
  `;
  
  return card;
}

// 記事を表示
function displayArticles() {
  const newsGrid = document.getElementById('news-grid');
  
  // ArticleManagerが初期化されていない場合
  if (!articleManager || !articleManager.articles) {
    console.log('ArticleManagerまたは記事データが存在しません');
    newsGrid.innerHTML = `
      <div class="loading-message">
        <div class="loading-spinner"></div>
        <p>記事を読み込み中...</p>
      </div>
    `;
    return;
  }
  
  // ArticleManagerから取得した記事（既に公開済みのみ）をカテゴリーでフィルタリング
  const filteredArticles = filterArticlesByCategory(currentCategory);
  
  console.log('記事表示開始:', filteredArticles.length, '件（全記事:', articleManager.articles.length, '件）');
  
  // 既存の記事をクリア
  newsGrid.innerHTML = '';
  
  // 記事がない場合
  if (filteredArticles.length === 0) {
    const message = currentCategory === 'all' 
      ? '公開済みの記事がまだありません。管理画面から記事を作成・公開してください。'
      : '該当するカテゴリーの公開済み記事が見つかりませんでした。';
    
    newsGrid.innerHTML = `
      <div class="empty-message">
        <h3>記事がありません</h3>
        <p>${message}</p>
        <a href="admin.html" class="btn btn-secondary">管理画面へ</a>
      </div>
    `;
    
    // 検索結果表示を更新
    updateSearchResults(0, currentCategory);
    return;
  }
  
  // 記事を日付順（新しい順）でソート
  const sortedArticles = filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // 記事カードを生成して表示
  sortedArticles.forEach((article, index) => {
    const articleCard = createArticleCard(article);
    newsGrid.appendChild(articleCard);
    
    // アニメーション効果
    setTimeout(() => {
      articleCard.classList.add('fade-in');
    }, index * 100);
  });
  
  // 検索結果表示を更新
  updateSearchResults(filteredArticles.length, currentCategory);
  
  console.log('記事表示完了');
}

// カテゴリーでフィルタリング
function filterArticlesByCategory(category) {
  if (!articleManager?.articles) {
    console.log('ArticleManagerまたは記事データが存在しません');
    return [];
  }
  
  // ArticleManagerから取得した記事（既に公開済みのみ）をそのまま使用
  if (category === 'all') {
    return articleManager.articles;
  }
  
  return articleManager.articles.filter(article => article.category === category);
}

// 検索結果表示を更新
function updateSearchResults(count, category) {
  const searchResults = document.getElementById('search-results');
  const searchCount = document.getElementById('search-count');
  
  if (category !== 'all') {
    searchCount.textContent = count;
    searchResults.style.display = 'block';
  } else {
    searchResults.style.display = 'none';
  }
}

// フィルタリング機能をセットアップ
function setupFiltering() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // 現在のカテゴリーに基づいてアクティブ状態を設定
  updateActiveButton(filterButtons);
  
  // 各ボタンにクリックイベントを追加
  filterButtons.forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });
}

// アクティブボタンを更新
function updateActiveButton(buttons) {
  console.log('アクティブボタン更新 - 現在のカテゴリー:', currentCategory);
  buttons.forEach(btn => {
    btn.classList.remove('active');
    const btnCategory = btn.getAttribute('data-category');
    if (btnCategory === currentCategory) {
      btn.classList.add('active');
      console.log('アクティブクラス追加:', btnCategory);
    }
  });
}

// フィルタークリックハンドラー
function handleFilterClick(e) {
  e.preventDefault();
  
  const clickedCategory = this.getAttribute('data-category');
  console.log('フィルタークリック:', clickedCategory, '現在:', currentCategory);
  
  // カテゴリーが変更された場合のみ処理
  if (clickedCategory !== currentCategory) {
    // カテゴリーを更新
    currentCategory = clickedCategory;
    console.log('カテゴリー更新:', currentCategory);
    
    // アクティブ状態を更新
    const filterButtons = document.querySelectorAll('.filter-btn');
    updateActiveButton(filterButtons);
    
    // URLを更新
    updateURL(currentCategory);
    
    // 記事を再表示
    displayArticles();
  }
}

// URL更新
function updateURL(category) {
  const newUrl = category === 'all' 
    ? 'news.html' 
    : `news.html?category=${category}`;
  window.history.pushState({category: category}, '', newUrl);
}

// ユーティリティ関数
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ArticleManagerを初期化
async function initializeArticleManager() {
  try {
    console.log('ArticleManagerを初期化中...');
    
    // ArticleManagerクラスが利用可能になるまで待機
    let attempts = 0;
    const maxAttempts = 100; // 10秒間待機
    
    while (typeof ArticleManager === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof ArticleManager === 'undefined') {
      throw new Error('ArticleManagerクラスが読み込まれませんでした');
    }
    
    console.log('ArticleManagerクラスが利用可能になりました');
    
    // ArticleManagerのインスタンスを作成
    articleManager = new ArticleManager();
    
    // グローバルに設定（他のスクリプトからアクセス可能にする）
    window.articleManager = articleManager;
    
    // 記事データを読み込み
    await articleManager.loadArticles();
    
    console.log('記事データ読み込み完了:', articleManager.articles.length, '件');
    console.log('記事データ詳細:', articleManager.articles);
    
    // 各記事の状態を詳細表示
    if (articleManager.articles.length > 0) {
      console.log('=== 記事データ詳細 ===');
      articleManager.articles.forEach((article, index) => {
        console.log(`記事${index + 1}:`, {
          id: article.id,
          title: article.title,
          status: article.status,
          category: article.category,
          date: article.date,
          summary: article.summary ? article.summary.substring(0, 50) + '...' : 'なし'
        });
      });
      console.log('===================');
    } else {
      console.warn('⚠️ 記事データが空です。LocalStorageを確認してください。');
      
      // LocalStorageの状態を確認
      const rawData = localStorage.getItem('rbs_articles_data');
      if (rawData) {
        try {
          const allArticles = JSON.parse(rawData);
          console.log('LocalStorage内の全記事数:', allArticles.length);
          console.log('LocalStorage内の記事:', allArticles.map(a => ({
            id: a.id,
            title: a.title,
            status: a.status
          })));
        } catch (e) {
          console.error('LocalStorageデータの解析エラー:', e);
        }
      } else {
        console.warn('LocalStorageに記事データが存在しません');
      }
    }
    
    // 記事を表示
    displayArticles();
    
    return true;
  } catch (error) {
    console.error('ArticleManagerの初期化に失敗:', error);
    
    // エラー表示
    const newsGrid = document.getElementById('news-grid');
    newsGrid.innerHTML = `
      <div class="error-message">
        <h3>記事の読み込みに失敗しました</h3>
        <p>システムエラーが発生しました。ページを再読み込みしてください。</p>
        <p>エラー詳細: ${error.message}</p>
        <button onclick="location.reload()" class="btn btn-primary">再読み込み</button>
      </div>
    `;
    
    return false;
  }
}

// ページ初期化
async function initNewsPage() {
  console.log('ニュースページ初期化開始');
  
  // 初期カテゴリーを設定
  currentCategory = getCurrentCategory();
  console.log('初期カテゴリー:', currentCategory);
  
  // ヘッダーとフッターを直接読み込み
  try {
    const templateLoader = new TemplateLoader();
    await templateLoader.loadAll({
      currentPage: 'news',
      logoPath: 'index.html',
      activeSection: 'news'
    });
    console.log('ヘッダー・フッター読み込み完了');
    
    // ヘッダーが確実に読み込まれるまで少し待機
    setTimeout(() => {
      if (window.CommonHeader) {
        const header = new window.CommonHeader();
        header.init({ currentPage: 'news' });
        console.log('CommonHeader初期化完了');
      }
    }, 100);
    
  } catch (error) {
    console.error('ヘッダー・フッター読み込みエラー:', error);
  }
  
  // PageInitializerの初期化
  if (typeof PageInitializer !== 'undefined') {
    PageInitializer.init({
      currentPage: 'news',
      pageTitle: 'ニュース - RBS陸上教室',
      hasStatusBanner: false
    });
  }
  
  // フィルタリング機能を初期化
  setupFiltering();
  
  // ブラウザの戻る/進むボタンに対応
  window.addEventListener('popstate', function(event) {
    currentCategory = getCurrentCategory();
    console.log('popstate - カテゴリー変更:', currentCategory);
    setupFiltering();
    if (articleManager) {
      displayArticles();
    }
  });
  
  // ArticleManagerを初期化して記事を読み込み
  await initializeArticleManager();
  
  console.log('ニュースページ初期化完了');
}

// DOMContentLoadedイベントでページを初期化
document.addEventListener('DOMContentLoaded', initNewsPage);

// グローバルに公開（他のスクリプトからアクセス可能にする）
window.NewsPage = {
  initNewsPage,
  displayArticles,
  filterArticlesByCategory,
  getCurrentCategory
}; 