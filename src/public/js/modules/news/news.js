/**
 * ニュース一覧ページ専用JavaScript v2.0
 * 新しいArticleService v2.0に対応
 */

// グローバル変数
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
  
  // 記事データから直接値を取得（ArticleService v2.0で正規化済み）
  const categoryColor = article.categoryColor || '#4299e1';
  const formattedDate = article.formattedDate || article.date;
  const categoryName = article.categoryName || article.category;
  const excerpt = article.excerpt || article.summary || '';
  
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
      <p class="news-excerpt">${escapeHtml(excerpt)}</p>
      <a href="news-detail.html?id=${article.id}" class="news-read-more">続きを読む</a>
    </div>
  `;
  
  return card;
}

// 記事を表示
async function displayArticles() {
  const newsGrid = document.getElementById('news-grid');
  
  try {
    // ArticleServiceが初期化されていない場合は初期化
    if (!window.articleService) {
      throw new Error('ArticleServiceが利用できません');
    }
    
    if (!window.articleService.isInitialized) {
      console.log('🔄 ArticleServiceを初期化中...');
      showLoadingMessage('ArticleServiceを初期化中...');
      await window.articleService.init();
    }
    
    // ArticleServiceから記事を取得してカテゴリーでフィルタリング
    const filteredArticles = filterArticlesByCategory(currentCategory);
    
    console.log('📰 記事表示開始:', filteredArticles.length, '件（カテゴリー:', currentCategory, '）');
    
    // 既存の記事をクリア
    newsGrid.innerHTML = '';
    
    // 記事がない場合
    if (filteredArticles.length === 0) {
      const message = currentCategory === 'all' 
        ? '公開済みの記事がまだありません。管理画面から記事を作成・公開してください。'
        : '該当するカテゴリーの公開済み記事が見つかりませんでした。';
      
      newsGrid.innerHTML = `
        <div class="empty-message" style="text-align: center; padding: 60px 20px; color: var(--gray-medium);">
          <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
          <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 15px; color: var(--navy-dark);">記事がありません</h3>
          <p style="font-size: 16px; margin-bottom: 25px; line-height: 1.6;">${message}</p>
          <a href="admin.html" class="btn btn-secondary" style="display: inline-block; padding: 12px 24px; background: var(--primary-blue); color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">管理画面へ</a>
        </div>
      `;
      
      // 検索結果表示を更新
      updateSearchResults(0, currentCategory);
      return;
    }
    
    // 記事を日付順（新しい順）でソート（ArticleService v2.0で既にソート済みだが念のため）
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
    
    console.log('✅ 記事表示完了');
    
  } catch (error) {
    console.error('❌ 記事表示エラー:', error);
    showLoadingError(error);
  }
}

// カテゴリーでフィルタリング
function filterArticlesByCategory(category) {
  if (!window.articleService || !window.articleService.isInitialized) {
    console.warn('⚠️ ArticleServiceが初期化されていません');
    return [];
  }
  
  if (category === 'all') {
    return window.articleService.getPublishedArticles();
  }
  
  return window.articleService.getArticlesByCategory(category);
}

// 検索結果表示を更新
function updateSearchResults(count, category) {
  const searchResults = document.getElementById('search-results');
  const searchCount = document.getElementById('search-count');
  
  if (searchResults && searchCount) {
    if (category !== 'all') {
      searchCount.textContent = count;
      searchResults.style.display = 'block';
    } else {
      searchResults.style.display = 'none';
    }
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
  console.log('🔄 アクティブボタン更新 - 現在のカテゴリー:', currentCategory);
  buttons.forEach(btn => {
    btn.classList.remove('active');
    const btnCategory = btn.getAttribute('data-category');
    if (btnCategory === currentCategory) {
      btn.classList.add('active');
      console.log('✅ アクティブクラス追加:', btnCategory);
    }
  });
}

// フィルタークリックハンドラー
function handleFilterClick(e) {
  e.preventDefault();
  
  const clickedCategory = this.getAttribute('data-category');
  console.log('🔄 フィルタークリック:', clickedCategory, '現在:', currentCategory);
  
  // カテゴリーが変更された場合のみ処理
  if (clickedCategory !== currentCategory) {
    // カテゴリーを更新
    currentCategory = clickedCategory;
    console.log('✅ カテゴリー更新:', currentCategory);
    
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

// ローディングメッセージを表示
function showLoadingMessage(message) {
  const newsGrid = document.getElementById('news-grid');
  if (newsGrid) {
    newsGrid.innerHTML = `
      <div class="loading-message" style="text-align: center; padding: 60px 20px; color: var(--primary-blue);">
        <div class="loading-spinner" style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top: 3px solid var(--primary-blue); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
        <p style="font-size: 16px; font-weight: 600;">${message}</p>
      </div>
    `;
  }
}

// エラー表示
function showLoadingError(error) {
  const newsGrid = document.getElementById('news-grid');
  if (newsGrid) {
    newsGrid.innerHTML = `
      <div class="error-message" style="text-align: center; padding: 60px 20px; color: var(--primary-red);">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 15px;">記事の読み込みに失敗しました</h3>
        <p style="font-size: 16px; margin-bottom: 10px; color: var(--gray-medium);">システムエラーが発生しました。ページを再読み込みしてください。</p>
        <p class="error-details" style="font-size: 14px; margin-bottom: 25px; color: var(--gray-medium); font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; display: inline-block;">エラー詳細: ${error.message}</p>
        <div class="error-actions" style="display: flex; gap: 10px; justify-content: center;">
          <button onclick="location.reload()" class="btn btn-primary" style="padding: 12px 24px; background: var(--primary-blue); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">再読み込み</button>
          <button onclick="showDebugInfo()" class="btn btn-secondary" style="padding: 12px 24px; background: var(--gray-light); color: var(--gray-dark); border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">デバッグ情報</button>
        </div>
      </div>
    `;
  }
}

// デバッグ情報を表示（改善版）
function showDebugInfo() {
  try {
    const debugInfo = window.articleService ? window.articleService.getDebugInfo() : null;
    const storageStatus = window.articleService ? window.articleService.checkStorageStatus() : null;
    
    console.log('🔍 ニュースページデバッグ情報:', { debugInfo, storageStatus, currentCategory });
    
    let statusMessage = '';
    let recommendations = [];
    
    if (!window.articleService) {
      statusMessage = '❌ ArticleServiceが存在しません';
      recommendations.push('ページを再読み込みしてください');
    } else if (!debugInfo.isInitialized) {
      statusMessage = '⚠️ ArticleServiceが初期化されていません';
      recommendations.push('手動初期化を試してください');
    } else if (!storageStatus.hasData) {
      statusMessage = '📝 記事データがありません';
      recommendations.push('管理画面から記事を作成・公開してください');
    } else if (storageStatus.publishedArticles === 0) {
      statusMessage = '📋 公開済み記事がありません';
      recommendations.push('管理画面で記事を公開してください');
    } else {
      statusMessage = '✅ 正常に動作しています';
    }
    
    const debugContent = `
📊 ニュースページ診断結果

📁 記事データ統計:
・総記事数: ${storageStatus ? storageStatus.totalArticles : 0}件
・公開済み: ${storageStatus ? storageStatus.publishedArticles : 0}件
・下書き: ${storageStatus ? storageStatus.draftArticles : 0}件

🔧 システム状況:
・ArticleService存在: ${!!window.articleService ? 'はい' : 'いいえ'}
・ArticleService初期化: ${debugInfo ? debugInfo.isInitialized : false ? 'はい' : 'いいえ'}
・読み込み済み記事数: ${debugInfo ? debugInfo.articlesCount : 0}件
・現在のカテゴリー: ${currentCategory}

📋 診断結果: ${statusMessage}

${recommendations.length > 0 ? `
🔧 推奨アクション:
${recommendations.map(r => `・${r}`).join('\n')}
` : ''}

詳細はコンソールを確認してください。
    `;
    
    alert(debugContent);
    
    // 初期化されていない場合は手動初期化を提案
    if (window.articleService && !debugInfo.isInitialized) {
      if (confirm('ArticleServiceを手動で初期化しますか？')) {
        initializeArticleServiceManually();
      }
    }
    
  } catch (error) {
    console.error('デバッグ情報の取得に失敗:', error);
    alert(`デバッグ情報の取得に失敗しました: ${error.message}`);
  }
}

// ArticleServiceの手動初期化
async function initializeArticleServiceManually() {
  try {
    console.log('🔄 ArticleServiceの手動初期化を開始...');
    showLoadingMessage('ArticleServiceを手動初期化中...');
    
    if (!window.articleService) {
      throw new Error('ArticleServiceが存在しません');
    }
    
    await window.articleService.init();
    
    console.log('✅ ArticleServiceの手動初期化完了');
    
    // 記事を再表示
    await displayArticles();
    
    alert('✅ ArticleServiceの初期化が完了しました。記事を再読み込みしました。');
  } catch (error) {
    console.error('❌ ArticleServiceの手動初期化に失敗:', error);
    showLoadingError(error);
    alert(`❌ ArticleServiceの初期化に失敗しました: ${error.message}`);
  }
}

// ページ初期化（改善版）
async function initNewsPage() {
  console.log('🚀 ニュースページ v2.0 初期化開始');
  
  // 初期カテゴリーを設定
  currentCategory = getCurrentCategory();
  console.log('📂 初期カテゴリー:', currentCategory);
  
  try {
    // ヘッダーとフッターを読み込み
    const templateLoader = new TemplateLoader();
    await templateLoader.loadAll({
      currentPage: 'news',
      logoPath: 'index.html',
      activeSection: 'news'
    });
    console.log('✅ ヘッダー・フッター読み込み完了');
    
    // ヘッダーが確実に読み込まれるまで少し待機
    setTimeout(() => {
      if (window.CommonHeader) {
        const header = new window.CommonHeader();
        header.init({ currentPage: 'news' });
        console.log('✅ CommonHeader初期化完了');
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ ヘッダー・フッター読み込みエラー:', error);
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
    console.log('🔄 popstate - カテゴリー変更:', currentCategory);
    setupFiltering();
    if (window.articleService && window.articleService.isInitialized) {
      displayArticles();
    }
  });
  
  // ArticleServiceを初期化して記事を読み込み
  try {
    console.log('🔄 ArticleService初期化開始');
    
    // ArticleServiceが存在するかチェック
    if (!window.articleService) {
      // ArticleServiceが読み込まれるまで少し待機
      let attempts = 0;
      const maxAttempts = 50; // 5秒間待機
      
      while (!window.articleService && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.articleService) {
        throw new Error('ArticleServiceが読み込まれませんでした');
      }
    }
    
    await window.articleService.init();
    console.log('✅ ArticleService初期化完了');
    
    // 記事を表示
    await displayArticles();
    
  } catch (error) {
    console.error('❌ ArticleService初期化失敗:', error);
    showLoadingError(error);
  }
  
  console.log('🎉 ニュースページ初期化完了');
}

// DOMContentLoadedイベントでページを初期化
document.addEventListener('DOMContentLoaded', initNewsPage);

// グローバルに公開（他のスクリプトからアクセス可能にする）
window.NewsPage = {
  initNewsPage,
  displayArticles,
  filterArticlesByCategory,
  getCurrentCategory,
  showDebugInfo,
  initializeArticleServiceManually
};

// スタイルを追加
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .news-card {
    transition: all 0.3s ease;
  }
  
  .news-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .fade-in {
    animation: fadeIn 0.5s ease-in;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .btn {
    transition: all 0.3s ease;
  }
  
  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;
document.head.appendChild(style); 